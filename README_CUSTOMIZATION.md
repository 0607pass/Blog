# 博客美化功能说明

根据 [Stack 主题自定义教程](https://letere-gzj.github.io/hugo-stack/p/hugo/custom-stack-theme/) 已完成以下美化功能：

## ✅ 已实现功能

### 1. 文章更新时间显示
- 已配置 Git 时间读取
- 在文章开头显示更新时间（如果与发布时间不同）
- 已更新 GitHub Actions 工作流以支持 Git 时间

### 2. 友链、归档多列显示
- 在大屏幕（≥1024px）下，友链和归档页面以两列网格布局显示
- 如需三列，修改 `assets/scss/custom.scss` 中的 `grid-template-columns: 1fr 1fr 1fr;`

### 3. 文章目录折叠&展开
- 文章目录默认隐藏子目录
- 滚动到对应章节时自动展开相关子目录

### 4. 返回顶部按钮
- 页面滚动超过 20px 时，右下角显示返回顶部按钮
- 点击后平滑滚动到顶部
- **需要准备图标**：`assets/icons/backTop.svg`（可选，未提供时使用文字"↑"）

### 5. macOS 风格代码块
- 代码块添加圆角和阴影
- **需要准备图标**：`static/icons/macOS-code-header.svg`（macOS 红绿灯装饰）
  - 可参考：https://github.com/lwouis/macos-traffic-light-buttons-as-SVG

### 6. 自定义 MD 引用块颜色模板
- 支持 4 种引用块样式：`[!NOTE]`、`[!TIP]`、`[!WARN]`、`[!ERROR]`
- 每种样式在亮色/暗色模式下都有对应的配色方案
- 使用方法：
  ```markdown
  > [!NOTE]
  > 这是提示信息
  ```

### 7. 代码块过长折叠&展开
- 超过 400px 高度的代码块自动折叠
- 底部显示"展开"按钮，点击后展开完整代码
- **需要准备图标**：`assets/icons/codeMore.png`（可选，未提供时使用文字"展开"）

### 8. 背景图 & 动态背景
- 静态背景：在 `assets/background/` 放置图片（默认 `bg.jpg`），配置项 `params.background.enableImage`/`image`
- 樱花效果：将 `sakura.js` 放入 `assets/background/`，通过 `params.background.enableSakura` 控制
- particles.js：将 `particles.min.js` 与 `particlesjs-config.json` 放入 `assets/background/`，通过 `params.background.enableParticles` 控制

### 9. 自定义字体（可选）
- 配置项 `params.font.enable`/`name`/`file`
- 将自定义字体放到 `assets/font/`（默认 `custom.ttf`），自动生成 `@font-face` 并替换基础/代码字体

### 10. 自定义鼠标样式（可选）
- 配置项 `params.mouse.enable` 与 `default`/`pointer`/`text` 文件名
- 将光标文件放到 `static/mouse/`，默认使用 `default.cur` / `pointer.cur` / `text.cur`，未提供则回退为系统光标

## 📝 需要准备的资源文件

以下文件为可选，未提供时会使用备用方案：

1. **返回顶部图标**：`assets/icons/backTop.svg`
   - 建议尺寸：30x30px
   - 未提供时使用文字"↑"替代

2. **代码展开图标**：`assets/icons/codeMore.png`
   - 建议尺寸：22x16px
   - 未提供时使用文字"展开"替代

3. **macOS 代码块装饰**：`static/icons/macOS-code-header.svg`
   - macOS 风格的红绿灯按钮 SVG
   - 可参考：https://github.com/lwouis/macos-traffic-light-buttons-as-SVG
   - 未提供时装饰不显示，但不影响代码块功能

4. **静态背景图片**：`assets/background/bg.jpg`（建议大图，cover 填充）
5. **樱花脚本**：`assets/background/sakura.js`
6. **粒子背景**：`assets/background/particles.min.js`、`assets/background/particlesjs-config.json`
7. **自定义字体**：`assets/font/custom.ttf`（可改名并同步 `params.font.file`）
8. **鼠标样式**：`static/mouse/default.cur`、`static/mouse/pointer.cur`、`static/mouse/text.cur`

## 🎨 字体设置

当前使用 JetBrains Mono 字体，字号为 13pt（1.73rem）。

如需修改字体，请编辑 `assets/scss/custom.scss` 文件。

## 🔧 配置文件说明

- `hugo.toml`：已添加 Git 时间配置
- `.github/workflows/deploy.yml`：已添加 Git 配置步骤
- `assets/scss/custom.scss`：自定义样式文件
- `layouts/partials/footer/custom.html`：自定义脚本和样式
- `layouts/partials/article/components/details.html`：文章详情模板（显示更新时间）
- `layouts/_default/_markup/render-blockquote-alert.html`：引用块渲染模板

## 📚 参考链接

- [Stack 主题自定义教程](https://letere-gzj.github.io/hugo-stack/p/hugo/custom-stack-theme/)
- [macOS 红绿灯按钮 SVG](https://github.com/lwouis/macos-traffic-light-buttons-as-SVG)
