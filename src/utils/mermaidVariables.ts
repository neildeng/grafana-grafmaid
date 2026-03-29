import { InterpolateFunction } from '@grafana/data';

/**
 * 使用 Mermaid 的 #code; 語法跳脫特殊字元，
 * 避免變數值中的 [ ] { } ( ) | > < 等符號破壞圖表語法。
 *
 * Mermaid 支援 #<charCode>; 格式的字元實體，
 * 例如 #91; 代表 [，#93; 代表 ]。
 */
export function escapeMermaidChars(value: string): string {
    return value
        .replace(/#/g, '#35;')
        .replace(/\[/g, '#91;')
        .replace(/\]/g, '#93;')
        .replace(/\{/g, '#123;')
        .replace(/\}/g, '#125;')
        .replace(/\(/g, '#40;')
        .replace(/\)/g, '#41;')
        .replace(/\|/g, '#124;')
        .replace(/>/g, '#62;')
        .replace(/</g, '#60;')
        .replace(/"/g, '#34;');
}

/**
 * 作為 replaceVariables 的 format function 使用，
 * 自動對變數值進行 Mermaid 特殊字元跳脫。
 *
 * 多選變數 (string[]) 會先個別跳脫後以逗號串接。
 */
export function mermaidSafeFormat(value: string | string[]): string {
    if (Array.isArray(value)) {
        return value.map((v) => escapeMermaidChars(String(v))).join(', ');
    }
    return escapeMermaidChars(String(value));
}

/**
 * 展開 {{#each varName}}...{{/each}} 區塊，
 * 將多選變數的每個值分別套用模板，產生多行 Mermaid 定義。
 *
 * 區塊內可使用：
 * - {{value}} — 當前迭代的值
 * - {{index}} — 當前迭代的索引 (從 0 開始)
 *
 * 範例：
 * ```
 * {{#each targets}}
 *     Service --> {{value}}
 * {{/each}}
 * ```
 * 若 targets = [DB, Cache, Queue]，展開為：
 * ```
 *     Service --> DB
 *     Service --> Cache
 *     Service --> Queue
 * ```
 */
export function expandEachBlocks(
    content: string,
    replaceVariables: InterpolateFunction,
    escapeValues: boolean
): string {
    const pattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return content.replace(pattern, (fullMatch, varName, template) => {
        // 使用 pipe format 取得多選變數的個別值
        const rawValues = replaceVariables(`\${${varName}}`, {}, 'pipe');

        // 如果變數未被置換 (不存在)，保留原文
        if (rawValues === `\${${varName}}`) {
            return fullMatch;
        }

        const values = rawValues
            .split('|')
            .map((v) => v.trim())
            .filter(Boolean);

        return values
            .map((value, index) => {
                const processedValue = escapeValues ? escapeMermaidChars(value) : value;
                return template.replace(/\{\{value\}\}/g, processedValue).replace(/\{\{index\}\}/g, String(index));
            })
            .join('\n');
    });
}

// Mermaid 內部使用的 $ 變數名稱 (C4 diagram UpdateRelStyle 等)
const MERMAID_BUILTIN_VARS = new Set([
    'offsetX',
    'offsetY',
    'color',
    'textColor',
    'lineColor',
    'stroke',
    'fill',
    'bgColor',
    'TICKET',
    'style',
    'classDef',
]);

/**
 * 偵測內容中尚未被 Grafana 置換的變數引用。
 *
 * 會自動排除 Mermaid 內部使用的 $ 變數 (如 $offsetX, $offsetY)。
 * 透過實際呼叫 replaceVariables 來確認變數是否存在於 Dashboard 中。
 */
export function detectUnresolvedVariables(content: string, replaceVariables: InterpolateFunction): string[] {
    const varPattern = /\$\{(\w+)(?::\w+)?\}|\$([a-zA-Z_]\w*)/g;
    const candidates = new Set<string>();
    let match;

    while ((match = varPattern.exec(content)) !== null) {
        const name = match[1] || match[2];
        if (!MERMAID_BUILTIN_VARS.has(name)) {
            candidates.add(name);
        }
    }

    const unresolved: string[] = [];
    for (const name of candidates) {
        const testResult = replaceVariables(`\${${name}}`);
        if (testResult === `\${${name}}`) {
            unresolved.push(name);
        }
    }

    return unresolved;
}
