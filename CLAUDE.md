# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Hugo-based personal blog using the **hugo-theme-stack** theme, deployed on GitHub Pages. The blog is in Chinese and focuses on independent development, AI experimentation, and lifestyle content.

## Architecture

### Core Technology Stack
- **Hugo v0.152.2+** (Extended version required)
- **hugo-theme-stack** (incorporated as a git submodule)
- **GitHub Pages** for deployment
- **APlayer** for embedded music player
- **PJAX** for page transitions without full reloads

### Layout & Customization

**Custom Layouts** (`layouts/`):
- `layouts/_default/_markup/render-blockquote-alert.html` - Custom blockquote alerts with `[!NOTE]`, `[!TIP]`, `[!WARN]`, `[!ERROR]` syntax
- `layouts/partials/sidebar/left.html` - Modified sidebar showing only homepage link (main menu items removed)
- `layouts/partials/footer/custom.html` - Extended footer containing:
  - Custom font loading
  - Mouse cursor customization
  - TOC folding/expanding logic
  - Back-to-top button
  - Code block "expand" functionality for long code snippets
  - Background effects (Sakura, particles.js)
  - Music player (APlayer) with state persistence
  - PJAX initialization for SPA-like navigation

**Custom SCSS** (`assets/scss/custom.scss`):
- JetBrains Mono font as primary typeface (13pt / 1.73rem)
- macOS-style code blocks
- Alert blockquote color schemes (light/dark mode)
- Responsive layout optimizations:
  - Wider content area with adjusted margins to preserve background visibility
  - Grid layout for archive/category pages
  - APlayer theme adaptation for both light/dark modes

### Directory Structure

```
content/
├── _index.md              # Homepage
├── post/                  # Blog posts (URLs: /p/:slug/)
│   ├── post-name/
│   │   └── index.md
│   └── ...
└── page/                  # Static pages
    ├── about/
    ├── archives/
    ├── links/
    └── search/
static/
├── images/                # Article cover images
├── mp3/                   # Music files for APlayer
├── background/            # Sakura JS, particles.js + configs
└── font/                  # Custom fonts
assets/
├── scss/
│   └── custom.scss       # Custom styles
└── img/
    └── avatar.png        # Sidebar avatar
layouts/                   # Custom templates
themes/                    # Stack theme (git submodule)
```

## Configuration

**Primary config**: `hugo.toml`

Key settings already configured:
- Permalinks: Posts at `/p/:slug/`, pages at `/:slug/`
- GitHub metadata: `enableGitInfo = true`, frontmatter uses git mod time
- Syntax highlighting: xcode style with line numbers
- Menu structure (main + social)
- Background effects (Sakura, particles, static image)
- Custom fonts & mouse cursor (disabled by default in config)

**Required updates for deployment** (from README):
- `baseURL` - Update to match your GitHub Pages URL
- `title`, `copyright` - Set your branding
- `menu.social.github` - Update to your GitHub profile

## Development Commands

### Local Development
```powershell
# Install git submodules (first time only)
git submodule update --init --recursive

# Start dev server with hot reload
hugo server --buildDrafts --disableFastRender

# Build for production (minified)
hugo --minify
```

### Creating Content
```powershell
# New blog post (draft by default)
hugo new content post/my-topic/my-post/index.md

# New page
hugo new content page/about/index.md
```

### Git Operations
```powershell
# After writing content, commit and push
git add .
git commit -m "Add new post: my-post"
git push origin master
```

## Deployment

**Automated via GitHub Actions** (`.github/workflows/deploy.yml`):
- Triggers on `master` branch push
- Checks out with submodules recursively
- Installs Hugo Extended v0.152.2
- Builds with `hugo --minify`
- Publishes to `gh-pages` branch
- GitHub Pages serves from `gh-pages` branch

## Custom Features

### Alert Blockquotes
Use in Markdown:
```markdown
> [!NOTE] This is a note
> [!TIP] This is a tip
> [!WARN] This is a warning
> [!ERROR] This is an error
```

### Code Block Expansion
Code blocks over 400px height auto-collapse with "展开" button.

### Music Player (APlayer)
- Local MP3 files in `static/mp3/`
- Configured in `layouts/partials/footer/custom.html` (lines 410-525)
- State persistence via localStorage (track index, position, play/pause)
- Survives PJAX navigation

### Background Effects
Configured in `hugo.toml` under `[params.background]`:
- `enableImage`: Static background image
- `enableSakura`: Falling cherry blossoms (requires `background/sakura.js`)
- `enableParticles`: Animated particles (requires `background/particles.min.js` + `background/particlesjs-config.json`)

### Custom Font
Font files should be placed in `static/font/custom.ttf`. Configured in:
- `hugo.toml`: `[params.font]`
- `layouts/partials/footer/custom.html`: Dynamic `@font-face` injection

## Common Workflows

### Adding New Post
1. `hugo new content post/topic/title/index.md`
2. Edit `index.md` (add frontmatter `tags`, `categories`, `featuredImage`)
3. Add cover image to `static/images/`
4. Preview: `hugo server --buildDrafts`
5. Change `draft: true` → `false`
6. Commit & push

### Updating Theme
```powershell
cd themes/hugo-theme-stack
git pull origin master
cd ../..
git add themes/hugo-theme-stack
git commit -m "Update theme"
```

### Adding Music
1. Add MP3 to `static/mp3/`
2. Update `audioList` array in `layouts/partials/footer/custom.html` (lines 424-448)

## Notes

- **Language**: Content and UI are in Chinese (`languageCode = 'zh-cn'`)
- **URL Structure**: Blog posts use `/p/:slug/` (custom permalinks)
- **Font**: Uses JetBrains Mono for a monospaced, IDE-like feel
- **DJAX**: Enabled for smooth page transitions without disrupting the music player
- **Git Info**: Displays last modified time pulled from git history
- **No Comments**: Comments are disabled by default (can be enabled via Giscus/Utterances in config)
