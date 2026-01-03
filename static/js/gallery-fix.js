/**
 * 修复纯图片文章在PhotoSwipe关闭时的抖动问题
 *
 * 问题原因：
 * 1. 纯图片文章中，图片被Gallery.ts自动包裹在figure标签中
 * 2. PhotoSwipe的getThumbBoundsFn在关闭时计算原始图片位置
 * 3. 由于页面结构变化或滚动位置，计算可能出现错误
 * 4. 导致关闭动画时页面跳动
 *
 * 解决方案：
 * 1. 修复getThumbBoundsFn，添加边界检查
 * 2. 确保图片有正确的尺寸属性
 * 3. 优化纯图片文章的布局
 */

(function() {
    'use strict';

    // 等待DOM和PhotoSwipe库加载
    function waitForPhotoSwipe(callback) {
        if (window.PhotoSwipe && window.StackGallery) {
            callback();
        } else {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (window.PhotoSwipe && window.StackGallery) {
                    clearInterval(interval);
                    callback();
                } else if (attempts > 50) { // 5秒后停止尝试
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    // 修复图片尺寸属性
    function fixImageDimensions() {
        const images = document.querySelectorAll('.article-content img.gallery-image');
        images.forEach(img => {
            if (!img.getAttribute('width') || !img.getAttribute('height')) {
                if (img.complete && img.naturalWidth > 0) {
                    img.setAttribute('width', img.naturalWidth);
                    img.setAttribute('height', img.naturalHeight);
                } else {
                    // 监听图片加载完成
                    img.addEventListener('load', function() {
                        this.setAttribute('width', this.naturalWidth);
                        this.setAttribute('height', this.naturalHeight);
                    }, { once: true });
                }
            }
        });
    }

    // 优化纯图片文章布局
    function fixPureImageLayout() {
        const articleContent = document.querySelector('.article-content');
        if (!articleContent) return;

        // 处理只包含图片的段落
        const paragraphs = articleContent.querySelectorAll('p');
        paragraphs.forEach(p => {
            const hasOnlyImages = Array.from(p.childNodes).every(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return !node.textContent.trim();
                }
                return node.nodeName === 'IMG' || node.nodeName === 'BR';
            });

            if (hasOnlyImages && p.querySelector('img')) {
                p.style.lineHeight = '0';
                p.style.marginBottom = '20px';
            }
        });

        // 确保figure元素正确显示
        const figures = articleContent.querySelectorAll('figure.gallery-image');
        figures.forEach(fig => {
            fig.style.margin = '0';
            fig.style.padding = '0';
            fig.style.display = 'block';
        });
    }

    // 修复PhotoSwipe的getThumbBoundsFn
    function patchPhotoSwipeBounds() {
        if (!window.StackGallery || window.StackGallery._boundsPatched) return;

        const originalOpen = window.StackGallery.prototype.open;

        window.StackGallery.prototype.open = function(index) {
            const pswp = document.querySelector('.pswp');
            if (!pswp) return;

            const ps = new window.PhotoSwipe(pswp, window.PhotoSwipeUI_Default, this.items, {
                index: index,
                galleryUID: this.galleryUID,
                getThumbBoundsFn: (idx) => {
                    try {
                        const item = this.items[idx];
                        if (!item || !item.el) {
                            return { x: 0, y: window.pageYOffset, w: 0 };
                        }

                        const img = item.el.getElementsByTagName('img')[0];
                        if (!img) {
                            return { x: 0, y: window.pageYOffset, w: 0 };
                        }

                        const pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
                        const rect = img.getBoundingClientRect();

                        // 边界检查
                        if (!rect || isNaN(rect.left) || isNaN(rect.top) || isNaN(rect.width)) {
                            return { x: 0, y: pageYScroll, w: 0 };
                        }

                        // 确保值在合理范围内
                        return {
                            x: Math.max(0, Math.min(rect.left, window.innerWidth)),
                            y: Math.max(0, rect.top + pageYScroll),
                            w: Math.max(0, Math.min(rect.width, window.innerWidth))
                        };
                    } catch (e) {
                        console.warn('PhotoSwipe bounds calculation failed:', e);
                        return { x: 0, y: window.pageYOffset, w: 0 };
                    }
                },
                history: false,
                bgOpacity: 0.9
            });

            // 关闭时强制刷新布局，防止抖动
            ps.listen('close', () => {
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                    // 强制重绘
                    document.body.style.display = 'none';
                    document.body.offsetHeight; // 触发重排
                    document.body.style.display = '';
                }, 50);
            });

            // 防止背景滚动
            ps.listen('beforeChange', () => {
                document.body.style.overflow = 'hidden';
            });

            ps.listen('afterChange', () => {
                document.body.style.overflow = '';
            });

            ps.init();
        };

        window.StackGallery._boundsPatched = true;
    }

    // 主修复函数
    function applyGalleryFix() {
        fixImageDimensions();
        fixPureImageLayout();
        waitForPhotoSwipe(patchPhotoSwipeBounds);
    }

    // 页面加载时应用修复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyGalleryFix);
    } else {
        applyGalleryFix();
    }

    // PJAX页面切换后重新应用修复
    document.addEventListener('pjax:complete', () => {
        setTimeout(applyGalleryFix, 100);
    });

    // 导出全局函数供其他脚本调用
    window.applyGalleryFix = applyGalleryFix;

})();
