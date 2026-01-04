### Tools

#### Content Creation
```bash
# Create new article or post (interactive mode)
./scripts/new-article.sh

# Create new article with options
./scripts/new-article.sh --type article --slug "my-new-article"
./scripts/new-article.sh -t article -s "my-new-article" --title "My New Article"

# Create new post
./scripts/new-article.sh --type post --slug "my-new-post" --title "My New Post"

# Generate Table of Contents (TOC) from sections with IDs
# Preview only (prints to stdout)
python3 scripts/generate-toc.py path/to/file.html

# Insert TOC into the file (creates backup)
python3 scripts/generate-toc.py path/to/file.html --insert
```

#### Git & Deployment
```bash
# Commit with RSS generation
./scripts/commit-with-rss.sh "Your commit message"

# Commit without RSS generation
./scripts/commit-with-rss.sh "Your commit message" --skip-rss

# Simple commit
./scripts/commit.sh "Your commit message"

# Generate RSS feed
./scripts/generate-rss.sh
```