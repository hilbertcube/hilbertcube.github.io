#!/bin/bash

# Default parameters
INPUT_PATH="assets/json/articles.json"
OUTPUT_PATH="rss/feed.xml"
BASE_URL="https://neumanncondition.com"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --input)
            INPUT_PATH="$2"
            shift 2
            ;;
        --output)
            OUTPUT_PATH="$2"
            shift 2
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Function to convert date string to RFC 2822 format for RSS
convert_to_rfc2822_date() {
    local date_string="$1"
    
    if [ -z "$date_string" ]; then
        echo ""
        return
    fi
    
    # Try to parse the date and convert to RFC 2822 format
    if date -d "$date_string" "+%a, %d %b %Y %H:%M:%S %z" 2>/dev/null; then
        return
    else
        echo "" >&2
        return
    fi
}

# Function to escape XML content
escape_xml_content() {
    local content="$1"
    echo "$content" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'\''/\&apos;/g'
}

# Main script execution
echo -e "\033[0;33mGenerating RSS feed from articles.json...\033[0m"

if [ ! -f "$INPUT_PATH" ]; then
    echo -e "\033[0;31mError: $INPUT_PATH not found\033[0m"
    exit 1
fi

# Use Python to parse JSON and generate RSS (since bash doesn't have native JSON parsing)
python3 << 'EOF'
import json
import sys
from datetime import datetime
from html import escape

def convert_to_rfc2822_date(date_string):
    """Convert date string to RFC 2822 format for RSS"""
    if not date_string:
        return ""
    
    try:
        # Try "Month Day, Year" format
        date_formats = [
            "%B %d, %Y",
            "%B, %Y",
            "%Y-%m-%d"
        ]
        
        parsed_date = None
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_string.replace(",", "").strip(), fmt.replace(",", ""))
                break
            except ValueError:
                continue
        
        if parsed_date:
            return parsed_date.strftime("%a, %d %b %Y %H:%M:%S %z")
    except Exception as e:
        print(f"Warning: Could not parse date: {date_string}", file=sys.stderr)
    
    return ""

# Read input parameters from environment
input_path = sys.argv[1] if len(sys.argv) > 1 else "assets/json/articles.json"
output_path = sys.argv[2] if len(sys.argv) > 2 else "rss/feed.xml"
base_url = sys.argv[3] if len(sys.argv) > 3 else "https://neumanncondition.com"

try:
    # Read the articles.json file
    with open(input_path, 'r', encoding='utf-8') as f:
        articles_data = json.load(f)
    
    print(f"Successfully loaded articles.json")
    print(f"Found:")
    print(f"   - {len(articles_data.get('articles', []))} articles")
    print(f"   - {len(articles_data.get('posts', []))} posts")
    print(f"   - {len(articles_data.get('others', []))} other items")
    
    # Generate RSS 2.0 feed
    current_date = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")
    
    rss_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>neumanncondition</title>
    <link>{base_url}/</link>
    <description>Recent articles and posts from neumanncondition.com</description>
    <language>en-us</language>
    <pubDate>{current_date}</pubDate>
    <lastBuildDate>{current_date}</lastBuildDate>
    <generator>Python RSS Generator</generator>
"""

    # Add articles as RSS items (only those with dates)
    for article in articles_data.get('articles', []):
        if article.get('date'):
            escaped_title = escape(article.get('title', ''))
            escaped_description = escape(article.get('description', ''))
            article_link = article.get('link', '')
            if not article_link.startswith('http'):
                article_link = f"{base_url}{article_link}"
            item_date = convert_to_rfc2822_date(article.get('date', ''))
            
            categories = '\n      '.join([f"<category>{escape(topic)}</category>" 
                                         for topic in article.get('topics', [])])
            
            rss_content += f"""
    <item>
      <title>{escaped_title}</title>
      <link>{article_link}</link>
      <description>{escaped_description}</description>
      <guid>{article_link}</guid>
      {categories}
      <pubDate>{item_date}</pubDate>
    </item>
"""
    
    # Add posts as RSS items (only those with dates)
    for post in articles_data.get('posts', []):
        if post.get('date'):
            escaped_title = escape(post.get('title', ''))
            escaped_description = escape(post.get('description', ''))
            post_link = post.get('link', '')
            if not post_link.startswith('http'):
                post_link = f"{base_url}{post_link}"
            item_date = convert_to_rfc2822_date(post.get('date', ''))
            
            categories = '\n      '.join([f"<category>{escape(topic)}</category>" 
                                         for topic in post.get('topics', [])])
            
            rss_content += f"""
    <item>
      <title>{escaped_title}</title>
      <link>{post_link}</link>
      <description>{escaped_description}</description>
      <guid>{post_link}</guid>
      {categories}
      <pubDate>{item_date}</pubDate>
    </item>
"""
    
    rss_content += """
  </channel>
</rss>
"""

    # Write the RSS content to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(rss_content)
    
    print(f"\033[0;32mRSS feed generated successfully!\033[0m")
    print(f"Output saved to: {output_path}")
    print(f"Feed URL: {base_url}/rss/feed.xml")
    
except Exception as e:
    print(f"\033[0;31mError generating RSS feed: {e}\033[0m", file=sys.stderr)
    sys.exit(1)

print("\033[0;32mRSS generation completed!\033[0m")
EOF

python3 -c "import sys; sys.exit(0)" "$INPUT_PATH" "$OUTPUT_PATH" "$BASE_URL" << 'PYSCRIPT'
import json
import sys
from datetime import datetime
from html import escape

def convert_to_rfc2822_date(date_string):
    """Convert date string to RFC 2822 format for RSS"""
    if not date_string:
        return ""
    
    try:
        # Try "Month Day, Year" format
        date_formats = [
            "%B %d, %Y",
            "%B, %Y",
            "%Y-%m-%d"
        ]
        
        parsed_date = None
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_string.replace(",", "").strip(), fmt.replace(",", ""))
                break
            except ValueError:
                continue
        
        if parsed_date:
            return parsed_date.strftime("%a, %d %b %Y %H:%M:%S %z")
    except Exception as e:
        print(f"Warning: Could not parse date: {date_string}", file=sys.stderr)
    
    return ""

# Read input parameters from environment
input_path = sys.argv[1] if len(sys.argv) > 1 else "assets/json/articles.json"
output_path = sys.argv[2] if len(sys.argv) > 2 else "rss/feed.xml"
base_url = sys.argv[3] if len(sys.argv) > 3 else "https://neumanncondition.com"

try:
    # Read the articles.json file
    with open(input_path, 'r', encoding='utf-8') as f:
        articles_data = json.load(f)
    
    print(f"Successfully loaded articles.json")
    print(f"Found:")
    print(f"   - {len(articles_data.get('articles', []))} articles")
    print(f"   - {len(articles_data.get('posts', []))} posts")
    print(f"   - {len(articles_data.get('others', []))} other items")
    
    # Generate RSS 2.0 feed
    current_date = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")
    
    rss_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>neumanncondition</title>
    <link>{base_url}/</link>
    <description>Recent articles and posts from neumanncondition.com</description>
    <language>en-us</language>
    <pubDate>{current_date}</pubDate>
    <lastBuildDate>{current_date}</lastBuildDate>
    <generator>Python RSS Generator</generator>
"""

    # Add articles as RSS items (only those with dates)
    for article in articles_data.get('articles', []):
        if article.get('date'):
            escaped_title = escape(article.get('title', ''))
            escaped_description = escape(article.get('description', ''))
            article_link = article.get('link', '')
            if not article_link.startswith('http'):
                article_link = f"{base_url}{article_link}"
            item_date = convert_to_rfc2822_date(article.get('date', ''))
            
            categories = '\n      '.join([f"<category>{escape(topic)}</category>" 
                                         for topic in article.get('topics', [])])
            
            rss_content += f"""
    <item>
      <title>{escaped_title}</title>
      <link>{article_link}</link>
      <description>{escaped_description}</description>
      <guid>{article_link}</guid>
      {categories}
      <pubDate>{item_date}</pubDate>
    </item>
"""
    
    # Add posts as RSS items (only those with dates)
    for post in articles_data.get('posts', []):
        if post.get('date'):
            escaped_title = escape(post.get('title', ''))
            escaped_description = escape(post.get('description', ''))
            post_link = post.get('link', '')
            if not post_link.startswith('http'):
                post_link = f"{base_url}{post_link}"
            item_date = convert_to_rfc2822_date(post.get('date', ''))
            
            categories = '\n      '.join([f"<category>{escape(topic)}</category>" 
                                         for topic in post.get('topics', [])])
            
            rss_content += f"""
    <item>
      <title>{escaped_title}</title>
      <link>{post_link}</link>
      <description>{escaped_description}</description>
      <guid>{post_link}</guid>
      {categories}
      <pubDate>{item_date}</pubDate>
    </item>
"""
    
    rss_content += """
  </channel>
</rss>
"""

    # Write the RSS content to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(rss_content)
    
    print(f"\033[0;32mRSS feed generated successfully!\033[0m")
    print(f"Output saved to: {output_path}")
    print(f"Feed URL: {base_url}/rss/feed.xml")
    
except Exception as e:
    print(f"\033[0;31mError generating RSS feed: {e}\033[0m", file=sys.stderr)
    sys.exit(1)

print("\033[0;32mRSS generation completed!\033[0m")
PYSCRIPT
