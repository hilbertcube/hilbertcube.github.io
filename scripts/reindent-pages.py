#!/usr/bin/env python3
r"""
reindent-pages.py
=================
Re-indent the template part of .astro pages by tag nesting (2 spaces).

Only leading whitespace changes. Multi-line opening tags, {expressions},
comments, <style>/<script> and is:raw code listings move as a block by the same
amount as the line that opened them. Code listings without is:raw (whitespace-
significant, written at column 0) are left byte-for-byte alone, as is the
frontmatter.

Display equations (`<E>{tex`…`}</E>`) are then laid out one row per line:
`\begin{…}` / `\end{…}` on their own lines, a break after each row-ending
`\\`, and nested environments (cases, matrices) indented a level further.
Only whitespace moves, and only where math mode ignores it, so KaTeX renders
the same thing. Inline `<M>` math is left on one line.

Usage
-----
  # Preview (dry-run): list the pages that would change
  python3 scripts/reindent-pages.py [page.astro ...]

  # Apply changes in-place
  python3 scripts/reindent-pages.py [page.astro ...] --apply

With no pages given, it covers every page under src/pages that uses BaseLayout.
"""
import difflib, glob, re, sys

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
RAW = {"script", "style", "pre", "Sample", "CodeBlock", "CodeBox", "ShellScript"}
IND = "  "


def shift(line, delta):
    if not line.strip():
        return ""
    if delta >= 0:
        return " " * delta + line
    lead = len(line) - len(line.lstrip(" "))
    return line[min(-delta, lead):]


def reindent(src):
    lines = src.split("\n")
    out = []
    i = 0
    # Frontmatter is TypeScript: leave it alone.
    if lines and lines[0].strip() == "---":
        j = next(k for k in range(1, len(lines)) if lines[k].strip() == "---")
        out, i = lines[: j + 1], j + 1

    depth = 0
    state = "text"          # text | tag | expr | comment | block
    delta = 0               # shift applied to the line that opened a multi-line construct
    block = None            # (closing name, verbatim?)
    tag = None              # name of the tag being opened
    tag_raw = False
    brace = 0
    quote = None

    for line in lines[i:]:
        stripped = line.strip()
        old = len(line) - len(line.lstrip(" \t"))

        if state == "block":
            name, verbatim = block
            if stripped.startswith("</" + name) and not verbatim:
                new = IND * (depth - 1) + stripped
                line_delta = len(IND * (depth - 1)) - old
            elif verbatim:
                out.append(line)
                if stripped.startswith("</" + name) or ("</" + name) in line:
                    state = "text"
                    depth -= 1
                continue
            else:
                out.append(shift(line, delta))
                continue
        elif state in ("tag", "expr", "comment", "close"):
            new = shift(line, delta).rstrip()
            line_delta = delta
        else:
            closes = 0
            rest = stripped
            while (m := re.match(r"</[\w.:-]*\s*>", rest)):
                closes += 1
                rest = rest[m.end():]
            level = max(depth - closes, 0)
            new = (IND * level + stripped) if stripped else ""
            line_delta = len(IND * level) - old

        # Scan the (re-indented) line to update nesting state.
        s = new
        k = 0
        n = len(s)
        while k < n:
            c = s[k]
            if state == "block":
                name, _ = block
                if s.startswith("</" + name, k):
                    state = "text"
                    depth -= 1
                    k = s.index(">", k) + 1
                    continue
                k += 1
            elif state == "close":
                if c == ">":
                    state = "text"
                k += 1
            elif state == "comment":
                if s.startswith("-->", k):
                    state = "text"
                    k += 3
                    continue
                k += 1
            elif state == "expr" or (state == "tag" and brace):
                if quote:
                    if c == "\\":
                        k += 2
                        continue
                    if c == quote:
                        quote = None
                elif c in "\"'`":
                    quote = c
                elif c == "{":
                    brace += 1
                elif c == "}":
                    brace -= 1
                    if brace == 0 and state == "expr":
                        state = "text"
                k += 1
            elif state == "tag":
                if quote:
                    if c == quote:
                        quote = None
                    k += 1
                elif c in "\"'":
                    quote = c
                    k += 1
                elif c == "{":
                    brace = 1
                    k += 1
                elif s.startswith("/>", k):
                    state = "text"
                    k += 2
                elif c == ">":
                    k += 1
                    if tag.lower() in VOID:
                        state = "text"
                    elif tag in RAW or tag_raw:
                        depth += 1
                        verbatim = not tag_raw and tag not in ("script", "style")
                        block = (tag, verbatim)
                        state = "block"
                        # A listing sharing the tag's line is never shifted.
                    else:
                        depth += 1
                        state = "text"
                else:
                    if s.startswith("is:raw", k):
                        tag_raw = True
                    k += 1
            else:  # text
                if s.startswith("<!--", k):
                    state, delta = "comment", line_delta
                    k += 4
                elif s.startswith("</", k):
                    depth = max(depth - 1, 0)
                    end = s.find(">", k)
                    if end < 0:
                        state, delta = "close", line_delta
                        break
                    k = end + 1
                elif c == "<" and k + 1 < n and (s[k + 1].isalpha()):
                    m = re.match(r"<([\w.:-]+)", s[k:])
                    tag, tag_raw, brace, quote = m.group(1), False, 0, None
                    state, delta = "tag", line_delta
                    k += m.end()
                elif c == "{":
                    state, delta, brace, quote = "expr", line_delta, 1, None
                    k += 1
                else:
                    k += 1
        out.append(new)
        if state == "block":
            delta = line_delta

    if depth != 0 or state != "text":
        raise SystemExit(f"unbalanced: depth={depth} state={state}")
    return "\n".join(out)


# --- Display equations -------------------------------------------------------

# Environments whose \begin takes a mandatory argument (column spec, count).
ENV_ARGS = {"array", "darray", "subarray", "alignat", "alignat*", "alignedat"}
TEX_TOKEN = re.compile(
    r"\\begin\s*\{(?P<begin>[^}]*)\}"
    r"|\\end\s*\{(?P<end>[^}]*)\}"
    r"|(?P<row>\\\\(?:\[[^\]]*\])?)"   # row break, with an attached [skip]
    r"|\\[A-Za-z]+|\\.|(?P<ws>\s+)|(?P<pct>%)|."
    , re.S)
E_TEX = re.compile(r"(<E>\{tex`|<E\s+code=\{tex`)(?P<body>[^`]*)`\}")


def format_tex(body, indent):
    """Lay out a display equation one row per line, nested by environment.

    Only whitespace moves, and only where math mode ignores it: line breaks go
    after `\\begin{…}` and row-ending `\\\\`, and before `\\end{…}`; runs of
    whitespace become one space (KaTeX lexes a run as one token either way).
    Returns None for LaTeX it won't touch (a `%` comment, unbalanced envs).
    """
    lines = []
    cur = ""
    level = 0          # environments open
    line_level = 0     # level at the start of the current line
    brace = 0
    envs = []          # brace depth at each open environment

    def emit():
        nonlocal cur, line_level
        if cur.strip():
            lines.append(indent + IND * line_level + cur.strip())
        cur, line_level = "", level

    pos = 0
    while pos < len(body):
        m = TEX_TOKEN.match(body, pos)
        tok, pos = m.group(0), m.end()
        if m.group("pct"):
            return None
        if m.group("ws"):
            cur += " "
        elif m.group("begin") is not None:
            name = m.group("begin").strip()
            cur += f"\\begin{{{name}}}"
            if name in ENV_ARGS:
                arg = re.match(r"\s*(\{[^{}]*\})", body[pos:])
                if arg:
                    cur += arg.group(1)
                    pos += arg.end()
            envs.append(brace)
            level += 1
            emit()
        elif m.group("end") is not None:
            if not envs:
                return None
            emit()
            envs.pop()
            level -= 1
            line_level = level
            cur = f"\\end{{{m.group('end').strip()}}}"
        elif m.group("row") and envs and brace == envs[-1]:
            cur += tok
            emit()
        else:
            brace += tok == "{"
            brace -= tok == "}"
            cur += tok
    emit()
    if envs or brace:
        return None
    return lines


def format_equations(src, path="?"):
    """Expand every `<E>{tex`…`}` equation onto its own indented lines."""
    def repl(m):
        line_start = src.rfind("\n", 0, m.start()) + 1
        indent = re.match(r"[ \t]*", src[line_start:]).group(0)
        lines = format_tex(m.group("body"), indent + IND)
        if lines is None:
            print(f"  left as is (comment or unbalanced) in {path}: "
                  f"{m.group('body').strip()[:60]}")
            return m.group(0)
        return m.group(1) + "\n" + "\n".join(lines) + "\n" + indent + "`}"
    return E_TEX.sub(repl, src)


apply = "--apply" in sys.argv
paths = [a for a in sys.argv[1:] if a != "--apply"] or sorted(
    p for p in glob.glob("src/pages/**/*.astro", recursive=True)
    if "BaseLayout" in open(p).read()
)

changed = 0
for path in paths:
    src = open(path).read()
    try:
        res = format_equations(reindent(src), path)
    except SystemExit as e:
        print(f"SKIP {path}: {e}")
        continue
    if res == src:
        continue
    changed += 1
    if apply:
        open(path, "w").write(res)
        print(f"reindented {path}")
    else:
        n = sum(1 for l in difflib.unified_diff(src.split("\n"), res.split("\n"), n=0)
                if l[:1] in "+-" and l[:3] not in ("+++", "---"))
        print(f"would reindent {path} ({n // 2} lines)")

if changed and not apply:
    print("\nRe-run with --apply to write the changes.")
elif not changed:
    print("All pages already indented.")
