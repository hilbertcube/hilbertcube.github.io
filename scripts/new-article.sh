#!/bin/bash

# =============================================================================
# new-article.sh — Create a new article or post for the Astro site
# =============================================================================
# Creates an .astro page under src/pages/articles/ or src/pages/posts/,
# adds an entry to assets/json/articles.json, and (for articles) creates
# a symlink in astro-public/ so static images are served correctly.
#
# Usage:
#   ./scripts/new-article.sh                              # Interactive mode
#   ./scripts/new-article.sh -t article -s my-new-article # Quick creation
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

# Defaults
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
    echo "  $0 -t post -s my-new-post --title \"My New Post\"      # With title"
    echo ""
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case $1 in
        --type|-t)  TYPE="$2";        INTERACTIVE=false; shift 2 ;;
        --slug|-s)  SLUG="$2";        shift 2 ;;
        --title)    TITLE="$2";       shift 2 ;;
        --topics)   TOPICS="$2";      shift 2 ;;
        --description) DESCRIPTION="$2"; shift 2 ;;
        --help|-h)  show_help; exit 0 ;;
        *)          echo -e "${RED}Unknown option: $1${NC}"; show_help; exit 1 ;;
    esac
done

# ---------------------------------------------------------------------------
# Interactive prompts
# ---------------------------------------------------------------------------
if [ "$INTERACTIVE" = true ] || [ -z "$TYPE" ]; then
    echo -e "${BLUE}Creating a new article or post (Astro)${NC}"
    echo ""
    while [[ "$TYPE" != "article" && "$TYPE" != "post" ]]; do
        read -p "Type (article/post): " TYPE
        TYPE=$(echo "$TYPE" | tr '[:upper:]' '[:lower:]')
        if [[ "$TYPE" != "article" && "$TYPE" != "post" ]]; then
            echo -e "${RED}Please enter 'article' or 'post'${NC}"
        fi
    done
fi

if [ -z "$SLUG" ]; then
    while [ -z "$SLUG" ]; do
        read -p "Slug (URL-friendly name, e.g., 'my-new-article'): " SLUG
        if [ -z "$SLUG" ]; then
            echo -e "${RED}Slug cannot be empty${NC}"
        fi
    done
fi

# Validate slug
if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${YELLOW}Warning: Slug should only contain lowercase letters, numbers, and hyphens${NC}"
    read -p "Continue anyway? (y/n): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        exit 1
    fi
fi

# Optional fields (interactive)
if [ "$INTERACTIVE" = true ]; then
    [ -z "$TITLE" ]       && read -p "Title (press Enter to use slug): " TITLE
    [ -z "$TOPICS" ]      && read -p "Topics (comma-separated, optional): " TOPICS
    [ -z "$DESCRIPTION" ] && read -p "Description (optional): " DESCRIPTION
fi

# Fallback title from slug
if [ -z "$TITLE" ]; then
    TITLE=$(echo "$SLUG" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
fi

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
if [ "$TYPE" = "article" ]; then
    BASE_DIR="src/pages/articles"
    JSON_ID_KEY="id"
    LINK_PREFIX="/articles"
else
    BASE_DIR="src/pages/posts"
    JSON_ID_KEY="pid"
    LINK_PREFIX="/posts"
fi

TARGET_DIR="$BASE_DIR/$SLUG"

if [ -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Directory '$TARGET_DIR' already exists${NC}"
    exit 1
fi

# ---------------------------------------------------------------------------
# Create directory
# ---------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Creating directory: $TARGET_DIR${NC}"
mkdir -p "$TARGET_DIR"

# ---------------------------------------------------------------------------
# Generate .astro page
# ---------------------------------------------------------------------------
ASTRO_FILE="$TARGET_DIR/index.astro"
echo -e "${YELLOW}Generating Astro page: $ASTRO_FILE${NC}"

# Build the topics line for the HTML
if [ -n "$TOPICS" ]; then
    TOPIC_LINE="$TOPICS"
else
    TOPIC_LINE="Topic"
fi

if [ "$TYPE" = "article" ]; then
    # --- Article template ---------------------------------------------------
    cat > "$ASTRO_FILE" << 'ASTRO_HEADER'
---
/**
ASTRO_HEADER

    cat >> "$ASTRO_FILE" << ASTRO_EOF
 * $TARGET_DIR/index.astro
ASTRO_EOF

    DIVIDER_LEN=$(( ${#TARGET_DIR} + 16 ))
    printf ' * %s\n' "$(printf '=%.0s' $(seq 1 $DIVIDER_LEN))" >> "$ASTRO_FILE"

    cat >> "$ASTRO_FILE" << ASTRO_EOF
 * Article: $TITLE
 */
import BaseLayout from "../../../layouts/BaseLayout.astro";
import HighlightsAndAttribute from "../../../components/HighlightsAndAttribute.astro";
---

<BaseLayout
  title="$TITLE"
  description="$DESCRIPTION"
  keywords=""
>
  <Fragment slot="head">
    <style>
      /* page-specific styles */
    </style>
  </Fragment>

  <!-- Sidebar: TOC + highlights -->
  <Fragment slot="sidebar">
    <div class="toc">
      <header class="major">
        <h2>Table of Contents</h2>
      </header>
      <ul>
        <li><a href="#section-1">Section 1</a></li>
      </ul>
    </div>
    <div class="highlights-and-attribute">
      <HighlightsAndAttribute />
    </div>
  </Fragment>

  <div class="content-grid">
    <header>
      <div class="topic">
        Topics: $TOPIC_LINE
      </div>
      <h1 class="title">$TITLE</h1>
      <div class="date"></div>
    </header>

    <section id="section-1">
      <h2 class="h3-visual">Section 1</h2>
      <p>Write your content here.</p>
    </section>

    <section>
      <h2>More Articles</h2>
      <div id="rec-article-container"></div>
    </section>
  </div>

  <Fragment slot="scripts">
    <script is:inline src="/assets/js/blogpage-setting.js"><\/script>
    <script is:inline>
      loadDate("$SLUG");
    <\/script>
    <script is:inline src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" async><\/script>
  </Fragment>
</BaseLayout>
ASTRO_EOF

    # Fix escaped closing script tags back to real ones
    sed -i 's|<\\/script>|</script>|g' "$ASTRO_FILE"

else
    # --- Post template -------------------------------------------------------
    cat > "$ASTRO_FILE" << 'ASTRO_HEADER'
---
/**
ASTRO_HEADER

    cat >> "$ASTRO_FILE" << ASTRO_EOF
 * $TARGET_DIR/index.astro
ASTRO_EOF

    DIVIDER_LEN=$(( ${#TARGET_DIR} + 16 ))
    printf ' * %s\n' "$(printf '=%.0s' $(seq 1 $DIVIDER_LEN))" >> "$ASTRO_FILE"

    cat >> "$ASTRO_FILE" << ASTRO_EOF
 * Post: $TITLE
 */
import BaseLayout from "../../../layouts/BaseLayout.astro";
import HighlightsAndAttribute from "../../../components/HighlightsAndAttribute.astro";
---

<BaseLayout
  title="Post - $TITLE"
  description="$DESCRIPTION"
  keywords=""
>
  <Fragment slot="head">
    <style>
      /* page-specific styles */
    </style>
  </Fragment>

  <!-- Sidebar: TOC + highlights -->
  <Fragment slot="sidebar">
    <div class="toc">
      <header class="major">
        <h2>Table of Contents</h2>
      </header>
      <ul>
        <li><a href="#section-1">Section 1</a></li>
      </ul>
    </div>
    <div class="highlights-and-attribute">
      <HighlightsAndAttribute />
    </div>
  </Fragment>

  <Fragment slot="scripts">
    <script is:inline src="/assets/js/blogpage-setting.js"><\/script>
  </Fragment>

  <div class="content-grid" id="home">
    <header>
      <div class="topic">$TOPIC_LINE</div>
      <h1 class="post-title">$TITLE</h1>
      <div class="date"></div>
    </header>

    <section>
      <section id="section-1">
        <h2 class="h3-visual">Section 1</h2>
        <p>Write your content here.</p>
      </section>
    </section>
  </div>
</BaseLayout>
ASTRO_EOF

    # Fix escaped closing script tags back to real ones
    sed -i 's|<\\/script>|</script>|g' "$ASTRO_FILE"
fi

echo -e "${GREEN}✓ Created Astro page: $ASTRO_FILE${NC}"

# ---------------------------------------------------------------------------
# Create symlink in astro-public/ for article images (articles only)
# ---------------------------------------------------------------------------
if [ "$TYPE" = "article" ]; then
    SYMLINK_DIR="astro-public/articles/$SLUG"
    if [ ! -d "astro-public/articles" ]; then
        mkdir -p "astro-public/articles"
    fi
    # Symlink points to the src page directory so images placed next to the
    # .astro file are served at /articles/<slug>/<filename>
    RELATIVE_TARGET="../../$TARGET_DIR"
    if [ ! -e "$SYMLINK_DIR" ]; then
        ln -s "$RELATIVE_TARGET" "$SYMLINK_DIR"
        echo -e "${GREEN}✓ Created symlink: $SYMLINK_DIR -> $RELATIVE_TARGET${NC}"
    fi
fi

# ---------------------------------------------------------------------------
# Update assets/json/articles.json
# ---------------------------------------------------------------------------
CURRENT_DATE=$(date "+%B %-d, %Y")
JSON_FILE="assets/json/articles.json"

echo ""
echo -e "${YELLOW}Adding entry to $JSON_FILE...${NC}"

# Convert comma-separated topics to JSON array
if [ -n "$TOPICS" ]; then
    TOPICS_JSON=$(echo "$TOPICS" | python3 -c "
import sys, json
raw = sys.stdin.read().strip()
print(json.dumps([t.strip() for t in raw.split(',')]))
")
else
    TOPICS_JSON="[]"
fi

# Determine the link value
if [ "$TYPE" = "article" ]; then
    LINK_VALUE="$LINK_PREFIX/$SLUG"
else
    LINK_VALUE="$LINK_PREFIX/$SLUG/"
fi

python3 << PYTHON_SCRIPT
import json, sys

try:
    with open('$JSON_FILE', 'r') as f:
        data = json.load(f)

    entry = {
        "title": "$TITLE",
        "$JSON_ID_KEY": "$SLUG",
        "link": "$LINK_VALUE",
        "topics": $TOPICS_JSON,
        "description": "$DESCRIPTION",
        "date": "$CURRENT_DATE"
    }

    # Articles also carry an "image" field
    if "$TYPE" == "article":
        entry["image"] = "image.webp"

    if "$TYPE" == "article":
        data["articles"].insert(0, entry)
    else:
        data["posts"].insert(0, entry)

    with open('$JSON_FILE', 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')

    print("success")
except Exception as e:
    print(f"error: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Added entry to $JSON_FILE${NC}"
else
    echo -e "${RED}✗ Failed to update $JSON_FILE — add manually${NC}"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}Done!${NC} Next steps:"
echo -e "${GRAY}  1. Edit content in: ${NC}$ASTRO_FILE"
echo -e "${GRAY}  2. Place images in: ${NC}$TARGET_DIR/"
if [ "$TYPE" = "article" ]; then
    echo -e "${GRAY}  3. Images are served at: ${NC}/articles/$SLUG/<filename>"
    echo -e "${GRAY}  4. Update the TOC in the sidebar slot${NC}"
    echo -e "${GRAY}  5. Update 'image' field in $JSON_FILE if needed${NC}"
else
    echo -e "${GRAY}  3. Update the TOC in the sidebar slot${NC}"
fi
echo -e "${GRAY}  Run the dev server:  ${NC}npm run dev"
echo ""
