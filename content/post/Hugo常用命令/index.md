+++
date = '2025-12-07T16:52:54+08:00'
draft = false
title = 'Hugo常用命令'
+++

```bash
hugo new content/post/"titile"/index.md

# 让 Hugo 渲染草稿（draft）内容
hugo server -D 

# 关闭 Hugo 的“快速渲染”模式 Hugo 在本地预览时有一个优化机制：Fast Render（快速渲染）
# 它只重新渲染你修改过的部分，而不是重新构建整个站点。
hugo server --disableFastRender

# 自动部署到github
git add .
git commit -m "commit messages"
git push origin master

# 等待自动部署
```


