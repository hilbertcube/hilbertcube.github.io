#!/usr/bin/env python3
"""
generate-toc.py — Generate a Table of Contents for .astro (or .html) files.

Scans for <section id="..."> elements and their first heading child,
builds a nested TOC, and either prints it to stdout or inserts it into
the file's sidebar slot.

Usage:
    python3 scripts/generate-toc.py <file>            # Preview
    python3 scripts/generate-toc.py <file> --insert    # Insert / replace
"""

import sys
import re
from pathlib import Path
from html.parser import HTMLParser


# ============================================================================
# Parser
# ============================================================================

class TOCGenerator(HTMLParser):
    """Walk the HTML portion of a file and collect (id, heading-text, tag)."""

    def __init__(self):
        super().__init__()
        self.sections: list[dict] = []
        self._stack: list[dict | None] = []  # stack of section contexts
        self._capture = False
        self._text_buf: list[str] = []
        self._depth = 0  # nesting depth of <section> tags

    @property
    def _current_section(self) -> dict | None:
        for item in reversed(self._stack):
            if item is not None:
                return item
        return None

    # --- callbacks ----------------------------------------------------------

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        attrs_d = dict(attrs)

        if tag == "section":
            self._depth += 1
            if "id" in attrs_d:
                self._stack.append({
                    "id": attrs_d["id"],
                    "title": None,
                    "tag": None,
                    "depth": self._depth,
                })
            else:
                self._stack.append(None)

        elif (
            tag in ("h1", "h2", "h3", "h4", "h5", "h6")
            and self._current_section
            and self._current_section["title"] is None
        ):
            self._capture = True
            self._text_buf = []

    def handle_endtag(self, tag: str):
        if tag == "section":
            if self._stack:
                self._stack.pop()
            self._depth -= 1

        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6") and self._capture:
            cur = self._current_section
            if cur and cur["title"] is None:
                cur["title"] = "".join(self._text_buf).strip()
                cur["tag"] = tag
                # Append at heading-capture time so order matches the document
                self.sections.append(cur)
            self._capture = False

    def handle_data(self, data: str):
        if self._capture:
            self._text_buf.append(data)


# ============================================================================
# Hierarchy builder
# ============================================================================

def build_hierarchy(sections: list[dict]) -> list[dict]:
    """
    Turn a flat list of sections into a tree using their nesting depth.
    """
    root: list[dict] = []
    stack: list[dict] = []  # (section, depth)

    for sec in sections:
        depth = sec["depth"]
        # Pop back to find the parent
        while stack and stack[-1]["depth"] >= depth:
            stack.pop()

        if stack:
            stack[-1].setdefault("children", []).append(sec)
        else:
            root.append(sec)

        stack.append(sec)

    return root


# ============================================================================
# HTML generation
# ============================================================================

def toc_html(sections: list[dict], indent: int = 3) -> str:
    """Recursively render <ul>…</ul> from a hierarchy."""
    pad = "  " * indent
    lines = [f"{pad}<ul>"]
    for sec in sections:
        lines.append(f'{pad}  <li><a href="#{sec["id"]}">{sec["title"]}</a>')
        kids = sec.get("children")
        if kids:
            lines.append(toc_html(kids, indent + 2))
        lines.append(f"{pad}  </li>")
    lines.append(f"{pad}</ul>")
    return "\n".join(lines)


def toc_block(sections: list[dict]) -> str:
    hierarchy = build_hierarchy(sections)
    inner = toc_html(hierarchy, indent=3)
    return (
        '    <div class="toc">\n'
        '      <header class="major">\n'
        "        <h2>Table of Contents</h2>\n"
        "      </header>\n"
        f"{inner}\n"
        "    </div>"
    )


# ============================================================================
# Astro-aware file reader
# ============================================================================

def read_template_body(path: Path) -> tuple[str, str]:
    """
    Return (full_text, html_body).
    For .astro files the frontmatter (between the two ``---`` fences) is
    stripped so the HTML parser only sees markup.
    """
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".astro":
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return text, parts[2]
    return text, text


# ============================================================================
# Insertion / replacement
# ============================================================================

_TOC_PAT = re.compile(
    r'(?P<before>)'                         # (captured below via a wider pattern)
    r'<div\s+class="toc">\s*.*?</div>',     # existing TOC div
    re.DOTALL,
)

def insert_toc(file_text: str, new_toc: str) -> str | None:
    """Replace the existing <div class="toc">…</div> block, or insert one
    before <div class="highlights-and-attribute"> inside the sidebar slot."""

    # 1) Try to replace an existing TOC div
    existing = re.search(
        r'<div\s+class="toc">.*?</div>\s*(?=\n\s*<div\s+class="highlights-and-attribute">)',
        file_text,
        re.DOTALL,
    )
    if existing:
        return file_text[: existing.start()] + new_toc + "\n" + file_text[existing.end():]

    # 2) No existing TOC — insert before highlights-and-attribute
    marker = re.search(
        r'(\s*)<div\s+class="highlights-and-attribute">',
        file_text,
    )
    if marker:
        return (
            file_text[: marker.start()]
            + "\n"
            + new_toc
            + "\n"
            + file_text[marker.start():]
        )

    return None  # couldn't find insertion point


# ============================================================================
# Main
# ============================================================================

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate-toc.py <file> [--insert]")
        print()
        print("  --insert   Replace/insert the TOC inside the file (creates .bak backup)")
        print("  Without --insert the TOC is printed to stdout.")
        sys.exit(1)

    path = Path(sys.argv[1])
    do_insert = "--insert" in sys.argv

    if not path.exists():
        print(f"Error: {path} not found", file=sys.stderr)
        sys.exit(1)

    full_text, body = read_template_body(path)

    parser = TOCGenerator()
    parser.feed(body)

    if not parser.sections:
        print("No <section id=\"...\"> elements found.")
        sys.exit(0)

    block = toc_block(parser.sections)

    if do_insert:
        result = insert_toc(full_text, block)
        if result is None:
            print("Error: could not locate sidebar insertion point.", file=sys.stderr)
            sys.exit(1)
        # Backup
        bak = path.with_suffix(path.suffix + ".bak")
        bak.write_text(full_text, encoding="utf-8")
        print(f"Backup: {bak}")
        # Write
        path.write_text(result, encoding="utf-8")
        print(f"TOC inserted into {path}")
    else:
        print("Generated TOC:")
        print("=" * 60)
        print(block)
        print("=" * 60)
        print()
        print("Sections found:")
        for s in parser.sections:
            print(f"  [{s['tag']}] #{s['id']}  {s['title']}")


if __name__ == "__main__":
    main()
