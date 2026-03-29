export interface GrafmaidOptions {
    // Mermaid 圖表定義
    content: string;
    // 是否自動跳脫變數值中的 Mermaid 特殊字元
    escapeSpecialChars: boolean;
    // {{#each data}} 迭代展開的最大列數 (防止大量資料凍結瀏覽器)
    maxDataRows: number;
}
