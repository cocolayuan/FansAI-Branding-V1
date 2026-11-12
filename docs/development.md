# 开发与检查

图表页：根目录 `index.html`；独立竖屏页：`mobile/index.html`；Rive：`rive/`。

图表测试需要 Node.js 20+：

```sh
npm test
npm install
npx playwright install chromium
npm run test:browser
```

Rive 预览通过本地 HTTP 打开：

```sh
python3 -m http.server 8787
```

访问 `/rive/preview.html`。运行图表与竖屏成品不需要 Node.js。

[数据说明](../data-notes.md) · [图片来源](image-provenance.md)
