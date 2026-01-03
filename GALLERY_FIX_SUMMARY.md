# 图片画廊抖动问题修复说明

## 问题描述

在纯图片文章（如 `2025ChatGPT年度回顾`）中，点击图片查看详情后，再点击取消关闭图片浏览器时，页面会出现上下抖动的现象。

## 问题原因

1. **PhotoSwipe 的动画机制**：PhotoSwipe 在关闭时会执行 `getThumbBoundsFn` 函数，计算原始图片的位置来创建平滑的关闭动画
2. **纯图片文章结构**：当文章中只有图片时，Gallery.ts 会自动将图片用 `<figure>` 标签包裹
3. **位置计算错误**：由于页面结构变化、滚动位置或图片尺寸属性缺失，导致位置计算不准确
4. **PJAX 导航影响**：在 SPA 导航模式下，页面状态可能与初始状态不一致

## 解决方案

### 1. 创建专门的修复脚本 (`static/js/gallery-fix.js`)

这个脚本包含以下核心功能：

- **安全的 getThumbBoundsFn**：添加边界检查，防止无效值导致的动画错误
- **图片尺寸修复**：确保所有图片都有正确的 width/height 属性
- **纯图片布局优化**：处理只包含图片的段落，避免行高问题
- **PJAX 支持**：在页面切换后自动重新应用修复

### 2. 更新自定义样式 (`layouts/partials/footer/custom.html`)

添加了专门的 CSS 规则：
```css
/* 修复纯图片文章的抖动问题 */
.article-content p:has(> img:only-child) {
    line-height: 0 !important;
    margin-bottom: 20px !important;
}

/* 确保画廊图片正确显示 */
.article-content figure.gallery-image {
    margin: 0;
    padding: 0;
    display: block;
}

/* PhotoSwipe 关闭时的过渡保护 */
.pswp {
    transition: none !important;
}
```

### 3. 简化初始化逻辑

移除了 footer 中的重复修复代码，统一通过外部脚本处理。

## 文件变更

### 新增文件
- `static/js/gallery-fix.js` - 核心修复脚本

### 修改文件
- `layouts/partials/footer/custom.html` - 添加脚本引用和CSS修复

## 技术细节

### getThumbBoundsFn 修复
```javascript
getThumbBoundsFn: (idx) => {
    try {
        const item = this.items[idx];
        if (!item || !item.el) return { x: 0, y: window.pageYOffset, w: 0 };

        const img = item.el.getElementsByTagName('img')[0];
        if (!img) return { x: 0, y: window.pageYOffset, w: 0 };

        const pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
        const rect = img.getBoundingClientRect();

        // 边界检查
        if (!rect || isNaN(rect.left) || isNaN(rect.top)) {
            return { x: 0, y: pageYScroll, w: 0 };
        }

        return {
            x: Math.max(0, rect.left),
            y: Math.max(0, rect.top + pageYScroll),
            w: Math.max(0, rect.width)
        };
    } catch (e) {
        return { x: 0, y: window.pageYOffset, w: 0 };
    }
}
```

### 关闭时的额外保护
```javascript
ps.listen('close', () => {
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        // 强制重绘
        document.body.style.display = 'none';
        document.body.offsetHeight; // 触发重排
        document.body.style.display = '';
    }, 50);
});
```

## 测试方法

1. 启动本地服务器：
   ```powershell
   hugo server --buildDrafts
   ```

2. 访问文章：`http://localhost:1313/p/2025ChatGPT年度回顾/`

3. 测试步骤：
   - 点击任意图片打开查看器
   - 点击关闭按钮或按 ESC
   - 观察页面是否有抖动

## 预期效果

修复后，点击图片查看器的关闭按钮时：
- 页面保持稳定，无上下抖动
- 关闭动画平滑
- 滚动位置保持不变
- PJAX 导航后依然有效

## 兼容性

- 支持所有现代浏览器
- 兼容 PJAX 导航
- 不影响其他功能（代码复制、目录折叠等）
- 自动处理图片加载延迟的情况
