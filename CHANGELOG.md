# Changelog

## 1.0.0 (Unreleased)

### Features

- Mermaid.js 圖表渲染：支援 Flowchart、Sequence、Class、State、ER、Gantt、Pie 等所有 Mermaid 圖表類型
- Dashboard Variables 整合：支援 `$variable` / `${variable}` 置換，以及 `{{#each var}}` 多選變數展開
- Data Queries 整合：透過 `${__data.fields.X}` 語法將查詢結果注入圖表
  - 簡寫語法 `${__data.CPU_A:display}` 自動取值欄位
  - Label 存取 `${__data.CPU_A.labels.http_status}`
  - Series selector 支援 refId / name / index
  - `{{#each data}}` 迭代模式展開多列資料
- Field Config (Standard Options)：支援 Units、Thresholds、Value Mappings、Color scheme、Decimals
- 特殊字元自動跳脫：避免變數值中的 `[ ] { } | > <` 等符號破壞圖表語法
- 未定義變數偵測：自動警告未在 Dashboard 中定義的變數引用
- 語法預驗證：渲染前以 `mermaid.parse()` 驗證，提供精確錯誤訊息
- 主題感知：依 Grafana 暗色/亮色主題自動切換 Mermaid 主題
- 響應式縮放：SVG 圖表隨面板大小自動調整

### Security

- Mermaid `securityLevel: 'strict'` 防止 XSS
- DOMPurify defense-in-depth 消毒 SVG 輸出
- `{{#each data}}` 預設最大列數限制防止瀏覽器凍結
- Label 存取以 `hasOwnProperty` 防護 prototype pollution
