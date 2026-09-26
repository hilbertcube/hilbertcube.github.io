#!/usr/bin/env python3
"""
reindent-pages.py
=================
Re-indent the template part of .astro pages by tag nesting (2 spaces).

Only leading whitespace changes. Multi-line opening tags, {expressions},
comments, <style>/<script> and is:raw code listings move as a block by the same
amount as the line that opened them. Code listings without is:raw (whitespace-
significant, written at column 0) are left byte-for-byte alone, as is the
frontmatter.

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


apply = "--apply" in sys.argv
paths = [a for a in sys.argv[1:] if a != "--apply"] or sorted(
    p for p in glob.glob("src/pages/**/*.astro", recursive=True)
    if "BaseLayout" in open(p).read()
)

changed = 0
for path in paths:
    src = open(path).read()
    try:
        res = reindent(src)
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
