#!/usr/bin/env python3
"""
convert-code-blocks.py
======================
Replace raw HTML code-container divs with <ShellScript> and <CodeBlock>
Astro components.

The components must already exist at:
  - src/components/ShellScript.astro   (command-line terminal blocks)
  - src/components/CodeBlock.astro     (generic code / config blocks)

Usage
-----
  # Preview (dry-run) — prints a diff without touching the file
  python3 scripts/convert-code-blocks.py src/pages/posts/linux-setup/index.astro

  # Apply changes in-place
  python3 scripts/convert-code-blocks.py src/pages/posts/linux-setup/index.astro --apply
"""

import argparse
import difflib
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Regex that matches one raw code-container block.
#
#   <div class="code-container" style="...">
#     <button class="copy-btn">Copy</button>     ← optional
#     <pre ...><code class="language-xxx">CODE</code></pre>
#   </div>
# ---------------------------------------------------------------------------
CODE_CONTAINER_RE = re.compile(
    r"<div\s+class=\"code-container\""
    r"\s+style=\"text-align: center; margin: 25px auto; max-width: 40em;\"\s*>"
    r"\s*(?:<button class=\"copy-btn\">Copy</button>\s*)?"
    r"<pre([^>]*)><code class=\"language-(\w+)\">(.*?)</code></pre>"
    r"\s*</div>",
    re.DOTALL,
)


def _build_replacement(pre_attrs: str, language: str, code: str) -> str:
    """Return the component tag that replaces one code-container div."""

    has_cmdline = "command-line" in pre_attrs

    if has_cmdline:
        # ── ShellScript ──────────────────────────────────────────────
        attrs: list[str] = []

        m = re.search(r'data-output="([^"]*)"', pre_attrs)
        if m:
            attrs.append(f'output="{m.group(1)}"')

        m = re.search(r'data-continuation-str="([^"]*)"', pre_attrs)
        if m:
            # Backslash must be expressed as a JSX expression
            attrs.append('continuationStr={"\\\\"}')

        attr_str = (" " + " ".join(attrs)) if attrs else ""
        return f"<ShellScript{attr_str}>{code}</ShellScript>"

    else:
        # ── CodeBlock ────────────────────────────────────────────────
        lang_attr = f' language="{language}"' if language != "bash" else ""
        return f"<CodeBlock{lang_attr}>{code}</CodeBlock>"


def _compute_import_depth(filepath: Path) -> str:
    """Return the relative prefix to reach src/components/ from *filepath*."""
    # Count how many directories deep the file is under src/pages/
    try:
        rel = filepath.resolve().relative_to(
            filepath.resolve().parent  # just need depth
        )
    except ValueError:
        pass

    # Simple heuristic: count "pages" nesting levels
    parts = filepath.parts
    try:
        idx = parts.index("pages")
    except ValueError:
        return "../components/code"

    # Number of dirs between "pages" and the file (exclusive of filename)
    depth = len(parts) - idx - 2  # -1 for filename, -1 for pages itself
    return "/".join([".."] * (depth + 1)) + "/components/code"


def convert(filepath: Path) -> tuple[str, str, int]:
    """Return (original, converted, replacement_count)."""
    original = filepath.read_text()
    content = original

    # ── 1.  Replace code-container blocks ────────────────────────────
    content, count = CODE_CONTAINER_RE.subn(
        lambda m: _build_replacement(m.group(1), m.group(2), m.group(3)),
        content,
    )

    if count == 0:
        return original, original, 0

    # ── 2.  Determine which components are needed ────────────────────
    needs_shell = "<ShellScript" in content
    needs_code = "<CodeBlock" in content

    # ── 3.  Add import lines (idempotent) ────────────────────────────
    prefix = _compute_import_depth(filepath)

    imports_to_add: list[str] = []
    if needs_shell and "import ShellScript" not in content:
        imports_to_add.append(
            f'import ShellScript from "{prefix}/ShellScript.astro";'
        )
    if needs_code and "import CodeBlock" not in content:
        imports_to_add.append(
            f'import CodeBlock from "{prefix}/CodeBlock.astro";'
        )

    if imports_to_add:
        # Insert right before the closing --- of the frontmatter
        first = content.index("---")
        second = content.index("---", first + 3)
        import_block = "\n".join(imports_to_add) + "\n"
        content = content[:second] + import_block + content[second:]

    return original, content, count


# ── CLI ──────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert code-container divs to ShellScript / CodeBlock components.",
    )
    parser.add_argument(
        "file",
        type=Path,
        help="Path to the .astro file to convert.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes in-place (default is dry-run / diff preview).",
    )
    args = parser.parse_args()

    filepath: Path = args.file
    if not filepath.exists():
        print(f"Error: {filepath} does not exist.", file=sys.stderr)
        sys.exit(1)

    original, converted, count = convert(filepath)

    if count == 0:
        print("No code-container blocks found — nothing to do.")
        sys.exit(0)

    if args.apply:
        filepath.write_text(converted)
        shell_n = len(re.findall(r"<ShellScript", converted))
        code_n = len(re.findall(r"<CodeBlock", converted))
        print(
            f"✓ Replaced {count} blocks in {filepath}  "
            f"({shell_n} ShellScript, {code_n} CodeBlock)"
        )
    else:
        # Dry-run: show unified diff
        diff = difflib.unified_diff(
            original.splitlines(keepends=True),
            converted.splitlines(keepends=True),
            fromfile=f"a/{filepath}",
            tofile=f"b/{filepath}",
            n=2,
        )
        sys.stdout.writelines(diff)
        print(
            f"\n({count} blocks would be replaced. "
            f"Re-run with --apply to write changes.)"
        )


if __name__ == "__main__":
    main()
