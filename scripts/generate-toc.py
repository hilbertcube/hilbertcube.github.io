#!/usr/bin/env python3
"""
Automatically generate a Table of Contents (TOC) for HTML files
based on sections with IDs and their heading elements.
"""

import sys
import re
from pathlib import Path
from html.parser import HTMLParser


class TOCGenerator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sections = []
        self.current_section = None
        self.current_tag = None
        self.capture_text = False
        self.text_buffer = []
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        # Check if it's a section with an ID
        if tag == 'section' and 'id' in attrs_dict:
            self.current_section = {
                'id': attrs_dict['id'],
                'title': None,
                'level': len(self.sections),
                'tag': None
            }
            
        # Check if it's a heading tag inside a section
        elif tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] and self.current_section and self.current_section['title'] is None:
            self.current_tag = tag
            self.capture_text = True
            self.text_buffer = []
    
    def handle_endtag(self, tag):
        if tag == 'section' and self.current_section:
            if self.current_section['title']:
                self.sections.append(self.current_section)
            self.current_section = None
            
        elif tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] and self.capture_text:
            if self.current_section:
                self.current_section['title'] = ''.join(self.text_buffer).strip()
                self.current_section['tag'] = self.current_tag
            self.capture_text = False
            self.current_tag = None
    
    def handle_data(self, data):
        if self.capture_text:
            self.text_buffer.append(data)


def detect_hierarchy(sections):
    """Detect the hierarchical structure based on heading tags and nesting."""
    hierarchy = []
    stack = []
    
    for section in sections:
        # Determine level based on heading tag
        if section['tag']:
            level = int(section['tag'][1])  # Extract number from h1, h2, etc.
        else:
            level = 2  # Default level
        
        section['level'] = level
        
        # Build hierarchy
        while stack and stack[-1]['level'] >= level:
            stack.pop()
        
        if stack:
            if 'children' not in stack[-1]:
                stack[-1]['children'] = []
            stack[-1]['children'].append(section)
        else:
            hierarchy.append(section)
        
        stack.append(section)
    
    return hierarchy


def generate_toc_html(sections, indent_level=2):
    """Generate TOC HTML from hierarchical sections."""
    if not sections:
        return ""
    
    indent = "  " * indent_level
    html_lines = [f"{indent}<ul>"]
    
    for section in sections:
        title = section['title']
        section_id = section['id']
        
        html_lines.append(f"{indent}  <li><a href=\"#{section_id}\">{title}</a>")
        
        # Add children if they exist
        if 'children' in section and section['children']:
            children_html = generate_toc_html(section['children'], indent_level + 2)
            html_lines.append(children_html)
        
        html_lines.append(f"{indent}  </li>")
    
    html_lines.append(f"{indent}</ul>")
    return "\n".join(html_lines)


def create_toc_block(sections):
    """Create the complete TOC block with header."""
    if not sections:
        return None
    
    hierarchy = detect_hierarchy(sections)
    toc_list = generate_toc_html(hierarchy, indent_level=3)
    
    toc_html = f"""    <div class="toc">
      <header class="major">
        <h2>Table of Contents</h2>
      </header>
{toc_list}
    </div>"""
    
    return toc_html


def insert_toc_into_navbar(html_content, toc_html):
    """Insert TOC into the navbar element."""
    # Pattern to find navbar with logo-and-side-nav and highlights-and-attribute
    pattern = r'(<nav[^>]*class="navbar[^"]*"[^>]*>\s*<div class="logo-and-side-nav"></div>)\s*(<div class="highlights-and-attribute"></div>)'
    
    replacement = r'\1\n' + toc_html + r'\n    \2'
    
    new_content = re.sub(pattern, replacement, html_content, count=1)
    
    if new_content == html_content:
        print("Warning: Could not find navbar pattern to insert TOC")
        return None
    
    return new_content


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-toc.py <html-file> [--insert]")
        print("\nOptions:")
        print("  --insert    Insert the TOC into the HTML file (updates the file)")
        print("\nWithout --insert, the script will only print the TOC HTML to stdout")
        sys.exit(1)
    
    html_file = Path(sys.argv[1])
    insert_mode = '--insert' in sys.argv
    
    if not html_file.exists():
        print(f"Error: File not found: {html_file}")
        sys.exit(1)
    
    # Read the HTML file
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Parse and extract sections
    parser = TOCGenerator()
    parser.feed(html_content)
    
    if not parser.sections:
        print("No sections with IDs found in the HTML file")
        sys.exit(0)
    
    # Generate TOC
    toc_html = create_toc_block(parser.sections)
    
    if not toc_html:
        print("Could not generate TOC")
        sys.exit(1)
    
    if insert_mode:
        # Insert TOC into the file
        new_content = insert_toc_into_navbar(html_content, toc_html)
        
        if new_content:
            # Create backup
            backup_file = html_file.with_suffix('.html.bak')
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"Backup created: {backup_file}")
            
            # Write new content
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"TOC inserted into: {html_file}")
        else:
            print("Failed to insert TOC into file")
            sys.exit(1)
    else:
        # Just print the TOC
        print("Generated TOC:")
        print("=" * 60)
        print(toc_html)
        print("=" * 60)
        print("\nFound sections:")
        for section in parser.sections:
            print(f"  - {section['title']} (#{section['id']}, {section['tag']})")


if __name__ == "__main__":
    main()
