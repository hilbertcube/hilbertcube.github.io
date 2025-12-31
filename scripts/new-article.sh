#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Parse command line arguments
TYPE=""
SLUG=""
TITLE=""
TOPICS=""
DESCRIPTION=""
INTERACTIVE=true

show_help() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 [OPTIONS]"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --type, -t          Type of content (article or post)"
    echo "  --slug, -s          URL-friendly slug (e.g., 'my-new-article')"
    echo "  --title             Article/post title"
    echo "  --topics            Comma-separated topics"
    echo "  --description       Short description"
    echo "  --help, -h          Show this help message"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0                                                    # Interactive mode"
    echo "  $0 --type article --slug my-new-article              # Quick creation"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type|-t)
            TYPE="$2"
            INTERACTIVE=false
            shift 2
            ;;
        --slug|-s)
            SLUG="$2"
            shift 2
            ;;
        --title)
            TITLE="$2"
            shift 2
            ;;
        --topics)
            TOPICS="$2"
            shift 2
            ;;
        --description)
            DESCRIPTION="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Interactive prompts if needed
if [ "$INTERACTIVE" = true ] || [ -z "$TYPE" ]; then
    echo -e "${BLUE}Creating a new article or post${NC}"
    echo ""
    
    # Prompt for type
    while [[ "$TYPE" != "article" && "$TYPE" != "post" ]]; do
        read -p "Type (article/post): " TYPE
        TYPE=$(echo "$TYPE" | tr '[:upper:]' '[:lower:]')
        if [[ "$TYPE" != "article" && "$TYPE" != "post" ]]; then
            echo -e "${RED}Please enter 'article' or 'post'${NC}"
        fi
    done
fi

# Prompt for slug if not provided
if [ -z "$SLUG" ]; then
    while [ -z "$SLUG" ]; do
        read -p "Slug (URL-friendly name, e.g., 'my-new-article'): " SLUG
        if [ -z "$SLUG" ]; then
            echo -e "${RED}Slug cannot be empty${NC}"
        fi
    done
fi

# Validate slug format (lowercase, hyphens only)
if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${YELLOW}Warning: Slug should only contain lowercase letters, numbers, and hyphens${NC}"
    read -p "Continue anyway? (y/n): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        exit 1
    fi
fi

# Set directory based on type
if [ "$TYPE" = "article" ]; then
    BASE_DIR="articles"
    TEMPLATE_FILE="template/articles.html"
else
    BASE_DIR="posts"
    TEMPLATE_FILE="template/posts.html"
fi

TARGET_DIR="$BASE_DIR/$SLUG"

# Check if directory already exists
if [ -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Directory '$TARGET_DIR' already exists${NC}"
    exit 1
fi

# Prompt for optional fields in interactive mode
if [ "$INTERACTIVE" = true ]; then
    read -p "Title (press Enter to use slug): " TITLE
    read -p "Topics (comma-separated, optional): " TOPICS
    read -p "Description (optional): " DESCRIPTION
fi

# Use slug as default title if not provided
if [ -z "$TITLE" ]; then
    # Convert slug to title case
    TITLE=$(echo "$SLUG" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
fi

# Create directory
echo ""
echo -e "${YELLOW}Creating directory: $TARGET_DIR${NC}"
mkdir -p "$TARGET_DIR"

# Copy template
echo -e "${YELLOW}Copying template from $TEMPLATE_FILE${NC}"
cp "$TEMPLATE_FILE" "$TARGET_DIR/index.html"

# Update title in the HTML file
sed -i "s|<title>.*</title>|<title>$TITLE</title>|" "$TARGET_DIR/index.html"

# Update h1 title
if [ "$TYPE" = "article" ]; then
    sed -i "s|<h1 class=\"title\">.*</h1>|<h1 class=\"title\">$TITLE</h1>|" "$TARGET_DIR/index.html"
else
    sed -i "s|<h1 class=\"post-title\">.*</h1>|<h1 class=\"post-title\">$TITLE</h1>|" "$TARGET_DIR/index.html"
fi

# Update meta description
if [ -n "$DESCRIPTION" ]; then
    sed -i "s|<meta name=\"description\" content=\".*\" />|<meta name=\"description\" content=\"$DESCRIPTION\" />|" "$TARGET_DIR/index.html"
fi

# Update topics in HTML
if [ -n "$TOPICS" ]; then
    if [ "$TYPE" = "article" ]; then
        sed -i "s|Topics: Template|Topics: $TOPICS|" "$TARGET_DIR/index.html"
    else
        sed -i "s|Topic Tags|$TOPICS|" "$TARGET_DIR/index.html"
    fi
fi

echo -e "${GREEN}✓ Successfully created $TYPE at: $TARGET_DIR${NC}"

# Add to articles.json
CURRENT_DATE=$(date "+%B %-d, %Y")
JSON_FILE="assets/json/articles.json"

echo ""
echo -e "${YELLOW}Adding entry to $JSON_FILE...${NC}"

# Convert comma-separated topics to JSON array
if [ -n "$TOPICS" ]; then
    TOPICS_JSON=$(echo "$TOPICS" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip().split(',')))")
else
    TOPICS_JSON="[]"
fi

# Create Python script to update JSON
python3 << PYTHON_SCRIPT
import json
import sys

try:
    # Read existing JSON
    with open('$JSON_FILE', 'r') as f:
        data = json.load(f)
    
    # Create new entry
    new_entry = {
        "title": "$TITLE",
        "$( [ "$TYPE" = "article" ] && echo "id" || echo "pid" )": "$SLUG",
        $( [ "$TYPE" = "article" ] && echo '"image": "image.webp",' || echo "" )
        "link": "$( [ "$TYPE" = "article" ] && echo "/articles/$SLUG" || echo "/posts/$SLUG/" )",
        "topics": $TOPICS_JSON,
        "description": "$DESCRIPTION",
        "date": "$CURRENT_DATE"
    }
    
    # Add to beginning of appropriate array
    if "$TYPE" == "article":
        data["articles"].insert(0, new_entry)
    else:
        data["posts"].insert(0, new_entry)
    
    # Write back with proper formatting
    with open('$JSON_FILE', 'w') as f:
        json.dump(data, f, indent=2)
    
    print("success")
except Exception as e:
    print(f"error: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully added entry to $JSON_FILE${NC}"
else
    echo -e "${RED}✗ Failed to update $JSON_FILE${NC}"
    echo -e "${YELLOW}Please add manually:${NC}"
    
    # Show JSON entry for manual addition
    if [ "$TYPE" = "article" ]; then
        cat << EOF
{
  "title": "$TITLE",
  "id": "$SLUG",
  "image": "image.webp",
  "link": "/articles/$SLUG",
  "topics": $TOPICS_JSON,
  "description": "$DESCRIPTION",
  "date": "$CURRENT_DATE"
}
EOF
    else
        cat << EOF
{
  "title": "$TITLE",
  "pid": "$SLUG",
  "link": "/posts/$SLUG/",
  "topics": $TOPICS_JSON,
  "description": "$DESCRIPTION",
  "date": "$CURRENT_DATE"
}
EOF
    fi
fi

echo ""
echo -e "${GRAY}Next steps:${NC}"
echo -e "${GRAY}1. Edit the content in: $TARGET_DIR/index.html${NC}"
echo -e "${GRAY}2. Add any images to: $TARGET_DIR/${NC}"
echo -e "${GRAY}3. Update the 'image' field in $JSON_FILE if needed${NC}"
echo ""
