# public/

Vite 静态资源根目录。**所有放这里的文件都按原样复制到 `dist/` 根**（不被 hash 化、不进 JS bundle）。

## 内容

- 当前为空（按需添加）
- 适合放：`favicon.ico` / `robots.txt` / 不需要哈希的字体/图片

## 用法对比

| 资源类型 | 放哪 | 引用方式 |
|---------|------|---------|
| 会被 import 的图片/字体 | `src/assets/` | `import logoUrl from "./assets/logo.svg"` （会哈希化） |
| 必须保持原文件名（如 favicon、robots） | `public/` | `<link rel="icon" href="/favicon.ico">` （**不会哈希化**） |

## 注意

- 浏览器引用 `public/` 文件用绝对路径 `/xxx`，不要 `./public/xxx`
- 不要放敏感信息（直接 serve 给公网）
