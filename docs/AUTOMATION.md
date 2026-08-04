### Tools

#### Content Creation (Astro)
```bash
# Create new article or post (interactive mode)
./scripts/new-article.sh

# Create new article with options
./scripts/new-article.sh --type article --slug "my-new-article"
./scripts/new-article.sh -t article -s "my-new-article" --title "My New Article"

# Create new post
./scripts/new-article.sh --type post --slug "my-new-post" --title "My New Post"
```

`new-article.sh` creates:
- An `.astro` page under `src/pages/articles/<slug>/` or `src/pages/posts/<slug>/`
- An entry in `public/assets/json/articles.json`

#### Table of Contents
```bash
# Preview TOC (prints to stdout) — works with .astro and .html files
python3 scripts/generate-toc.py src/pages/articles/my-article/index.astro

# Insert/replace TOC in the sidebar slot (creates .bak backup)
python3 scripts/generate-toc.py src/pages/articles/my-article/index.astro --insert
```

#### Git & Deployment
```bash
# Commit with RSS generation
./scripts/commit-with-rss.sh "Your commit message"

# Commit without RSS generation
./scripts/commit-with-rss.sh "Your commit message" --skip-rss

# Simple commit (pull → add → commit → push)
./scripts/commit.sh "Your commit message"

# Generate RSS feed only
./scripts/generate-rss.sh
```

#### Development
```bash
# Start local dev server
npm run dev

# Build for production
npm run build
```

#### Code Block Components
```bash
# Preview replacements (dry-run, prints diff)
python3 scripts/convert-code-blocks.py src/pages/posts/linux-setup/index.astro

# Apply replacements in-place
python3 scripts/convert-code-blocks.py src/pages/posts/linux-setup/index.astro --apply
```

`convert-code-blocks.py` converts raw `<div class="code-container">` blocks
into `<ShellScript>` (command-line prompts) or `<CodeBlock>` (generic code /
config) Astro components. Imports are added automatically.