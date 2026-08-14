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

Nothing to run: pass `toc` to `BaseLayout` and the sidebar TOC is built at build
time from the page's own `<section>` / `<h2>` / `<h3>` markup. See
"Table of Contents" in [DEVELOPMENT.md](DEVELOPMENT.md). (This replaces
`scripts/generate-toc.py`, which pasted a hand-maintained list into the sidebar
slot.)

#### RSS Feed

Nothing to run: `src/pages/rss/feed.xml.ts` builds the feed at build time from
the `articles` and `posts` collections (same source as the JSON catalog), so
it can't drift out of sync. `new-article.sh` sets the `pubDate` field
automatically; see "RSS feed" in [DEVELOPMENT.md](DEVELOPMENT.md). (This
replaces `scripts/generate-rss.sh` and `scripts/commit-with-rss.sh`.)

#### Git & Deployment

```bash
# Commit (pull → add → commit → push)
./scripts/commit.sh "Your commit message"
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