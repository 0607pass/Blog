## 项目简介

这是一个基于 Hugo v0.152+ 与 Stack 主题的个人博客，目标是快速沉淀独立开发、AI 实验与生活方式内容。站点默认输出中文界面，可通过 GitHub Pages 自动部署。

## 快速开始

1. 安装依赖  
   - [Hugo Extended](https://gohugo.io/getting-started/installing/) ≥ 0.152  
   - Git（用于主题子模块）
2. 克隆仓库后拉取主题：
   ```powershell
   git submodule update --init --recursive
   ```
3. 本地预览：
   ```powershell
   hugo server --buildDrafts --disableFastRender
   ```
   访问 `http://localhost:1313` 查看实时效果。

## 目录结构

- `content/`：博客文章与页面（`post/`、`page/` 等）
- `assets/img/`：头像等共享资源
- `static/`：会被直接复制到输出目录（如文章配图）
- `themes/hugo-theme-stack/`：Stack 主题子模块
- `.github/workflows/deploy.yml`：GitHub Pages 自动部署流程

## 常用命令

```powershell
# 新建文章（会在 content/post/ 下生成目录）
hugo new content post/my-first-post/index.md

# 生成静态文件
hugo --minify
```

## 配置说明

- 站点基础信息位于 `hugo.toml`，请修改：
  - `baseURL`：替换为 `https://<你的 GitHub 用户名>.github.io/<仓库名>/`（例如：`https://0607pass.github.io/Blog/`）
  - `title`、`copyright`
  - `menu.social` 中的 GitHub 链接
- 需要自定义头像时，替换 `assets/img/avatar.png`
- 文章封面图片存放在 `static/images/`

## GitHub Pages 部署

1. 将仓库 push 到 GitHub，分支命名为 `master`
2. 启用 Pages：在仓库 `Settings -> Pages` 中选择 `Deploy from a branch`，并设定 `gh-pages`
3. Workflow 文件 `.github/workflows/deploy.yml` 会在每次 push `master` 时自动：
   - 检出代码（包含主题子模块）
   - 安装指定版本 Hugo
   - 执行 `hugo --minify`
   - 将 `public/` 发布到 `gh-pages` 分支

> 若使用自定义域名，可在仓库 `Settings -> Pages` 中设置 CNAME，并在 workflow 部署步骤追加 `cname` 字段。

## 下一步建议

- 通过 `params.sidebar`、`params.widgets` 自定义侧边栏与首页模块
- 在 `content/post/` 下持续添加文章，或引入多语言支持（见 `i18n/`）
- 若需要评论系统，可在 `hugo.toml` 中启用 `params.comments` 并填写像 Giscus、Utterances 的配置

## 参考

- https://gohugo.io/
- https://letere-gzj.github.io/hugo-stack/p/hugo/custom-blog/

