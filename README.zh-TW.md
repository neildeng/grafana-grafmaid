# Grafmaid

> **Gra**fana + Mer**maid**.js = **Grafmaid**

一個 Grafana 面板外掛程式，透過 [Mermaid.js](https://mermaid.js.org/) 渲染圖表，並將查詢結果的即時指標數值注入圖表中，讓靜態架構圖轉變為動態的資料驅動視覺化呈現。

🌐 [English](README.md)

## 功能特色

- 在 Grafana 面板中直接渲染 Mermaid.js 圖表 (流程圖、序列圖等)
- 將資料來源查詢的即時指標數值注入圖表節點與標籤中
- 隨資料刷新自動更新圖表

## 開始使用

### 前置需求

- Grafana >= 12.3.0
- Node.js >= 22

### 開發

1. 安裝相依元件

   ```bash
   npm install
   ```

2. 以開發模式建置外掛程式並啟用監看模式

   ```bash
   npm run dev
   ```

3. 啟動 Grafana 實例並在其中執行外掛程式 (使用 Docker)

   ```bash
   npm run server
   ```

4. 以正式模式建置外掛程式

   ```bash
   npm run build
   ```

### 測試

```bash
# 以監看模式執行單元測試
npm run test

# 以 CI 模式執行單元測試
npm run test:ci

# 執行 E2E 測試 (需先透過 `npm run server` 啟動 Grafana 實例)
npm run e2e
```

### 程式碼檢查

```bash
npm run lint
npm run lint:fix
```

## 授權條款

Apache-2.0
