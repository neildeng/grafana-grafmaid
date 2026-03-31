import { DataFrame, Field, FieldType, formattedValueToString } from '@grafana/data';
import { escapeMermaidChars } from 'utils/mermaidVariables';

/**
 * 從 DataFrame 的 fields 建立 name → Field 的 Map，
 * 用於在模板展開時快速查詢欄位。
 */
function buildFieldMap(frame: DataFrame): Map<string, Field> {
    const map = new Map<string, Field>();
    for (const field of frame.fields) {
        map.set(field.name, field);
    }
    return map;
}

/**
 * 依 selector 從 series 中解析對應的 DataFrame。
 *
 * 支援三種 selector：
 * - undefined     → series[0]
 * - 純數字 "0"    → series[index]
 * - 其他字串      → 依 refId 或 DataFrame.name 匹配
 */
function resolveSeries(series: DataFrame[], selector?: string): DataFrame | undefined {
    if (selector === undefined) {
        return series[0];
    }

    // 純數字 → 依 index
    const index = parseInt(selector, 10);
    if (!isNaN(index) && String(index) === selector) {
        return index >= 0 && index < series.length ? series[index] : undefined;
    }

    // 依 refId 優先，再依 name
    return series.find((s) => s.refId === selector) ?? series.find((s) => s.name === selector);
}

/**
 * 解析 data block / placeholder 中的 series selector。
 *
 * 支援：
 * - data                → undefined (series[0])
 * - data.CPU_A          → "CPU_A"
 * - data.cpu-prod       → "cpu-prod"
 * - data["CPU Prod"]    → "CPU Prod"
 */
function parseSeriesSelector(selectorRef: string): string | undefined {
    if (selectorRef === 'data') {
        return undefined;
    }

    const dotMatch = selectorRef.match(/^data\.(.+)$/);
    if (dotMatch) {
        return dotMatch[1];
    }

    const bracketMatch = selectorRef.match(/^data\["([^"]+)"\]$/);
    if (bracketMatch) {
        return bracketMatch[1];
    }

    return undefined;
}

/**
 * 自動取得 DataFrame 中第一個非 Time 欄位 (值欄位)。
 * 用於簡寫語法 ${__data.CPU_A:display}，省略 .fields.X 時自動選擇。
 */
function getValueField(frame: DataFrame): Field | undefined {
    return frame.fields.find((f) => f.type !== FieldType.time);
}

/**
 * 依名稱或索引從 fieldMap / frame 中取得 Field。
 * 支援 dot notation (Name)、bracket string ("Name")、bracket index (0)。
 */
function resolveField(
    fieldMap: Map<string, Field>,
    frame: DataFrame,
    dotName?: string,
    bracketName?: string,
    bracketIndex?: string
): Field | undefined {
    if (dotName !== undefined) {
        return fieldMap.get(dotName.trim());
    }
    if (bracketName !== undefined) {
        return fieldMap.get(bracketName);
    }
    if (bracketIndex !== undefined) {
        const idx = parseInt(bracketIndex, 10);
        return idx >= 0 && idx < frame.fields.length ? frame.fields[idx] : undefined;
    }
    return undefined;
}

/**
 * 取得欄位在指定列的原始值，
 * null/undefined 時使用 field config 的 noValue 設定或預設 '-'。
 */
function getRawValue(field: Field, rowIndex: number): string {
    const value = field.values[rowIndex];
    if (value === null || value === undefined) {
        return field.config?.noValue ?? '-';
    }
    return String(value);
}

/**
 * 取得欄位在指定列的格式化顯示值 (套用 unit、decimals、value mapping)。
 * 若 field.display 處理器不存在，fallback 為原始值。
 */
function getDisplayValue(field: Field, rowIndex: number): string {
    const value = field.values[rowIndex];
    if (value === null || value === undefined) {
        if (field.display) {
            return formattedValueToString(field.display(value));
        }
        return field.config?.noValue ?? '-';
    }
    if (field.display) {
        return formattedValueToString(field.display(value));
    }
    return String(value);
}

/**
 * 取得欄位在指定列的顏色 (hex 字串)。
 *
 * 遵循 Grafana 標準 display pipeline：顏色來源由使用者在
 * Standard Options > Color scheme 控制 (預設為 "From thresholds")。
 * 若 field.display 處理器不存在，回傳空字串。
 */
function getColorValue(field: Field, rowIndex: number): string {
    if (!field.display) {
        return '';
    }
    const value = field.values[rowIndex];
    return field.display(value).color ?? '';
}

// Grafana 風格佔位符 regex，支援 series selector、欄位存取、label 存取：
//
//   完整語法 (指定欄位)：
//   ${__data.fields.Name}              — series[0], dot notation (group 2)
//   ${__data.CPU_A.fields.Name}        — 依 refId/name 指定 series (group 1), dot (group 2)
//   ${__data["CPU Prod"].fields.Name}  — 依 refId/name 指定 series, bracket notation (group 2)
//   ${__data.fields["Name"]}           — bracket string notation (group 3)
//   ${__data.fields[0]}                — bracket index notation (group 4)
//   :display / :color                  — 欄位格式修飾符 (group 5)
//
//   Label 存取：
//   ${__data.CPU_A.labels.http_status}  — 自動取值欄位的 label (group 6)
//   ${__data.labels.http_status}        — series[0] 值欄位的 label (group 6)
//
//   簡寫語法 (自動取值欄位，省略 .fields.X)：
//   ${__data.CPU_A}                    — 自動取第一個非 Time 欄位
//   ${__data.CPU_A:display}            — 同上 + 格式化 (group 7)
//   ${__data.CPU_A:color}              — 同上 + 顏色 (group 7)
//
//   ${__index} / ${__rowCount}         — 內建變數 (group 8)
//
// (?!fields\b)(?!labels\b) negative lookahead 確保 dot selector 不會誤匹配關鍵字
const FIELD_PLACEHOLDER_PATTERN =
    /\$\{(?:__data(?:\.(?!fields\b)(?!labels\b)([\w-]+)|\["([^"]+)"\])?(?:\.fields(?:\.([^:}"[\]]+?)|(?:\["([^"]+)"\])|(?:\[(\d+)\]))(?::(display|color))?|\.labels\.([\w]+)|(?::(display|color)))?|(__index|__rowCount))\}/g;

/**
 * 替換單一列的佔位符。
 * 共用於迭代模式與單值模式。
 *
 * 含 series selector 的佔位符 (如 ${__data.CPU_A.fields.Value})
 * 會從整個 series 陣列中解析目標 DataFrame；
 * 不含 selector 的佔位符則使用傳入的 frame。
 */
function replaceFieldPlaceholders(
    template: string,
    defaultFieldMap: Map<string, Field>,
    defaultFrame: DataFrame,
    rowIndex: number,
    rowCount: number,
    escapeValues: boolean,
    series: DataFrame[]
): string {
    return template.replace(
        FIELD_PLACEHOLDER_PATTERN,
        (
            _match,
            seriesSelectorDot?: string,
            seriesSelectorBracket?: string,
            dotName?: string,
            bracketName?: string,
            bracketIdx?: string,
            fieldModifier?: string,
            labelName?: string,
            shorthandModifier?: string,
            builtin?: string
        ) => {
            const seriesSelector = seriesSelectorDot ?? seriesSelectorBracket;

            if (builtin === '__index') {
                return String(rowIndex);
            }
            if (builtin === '__rowCount') {
                return String(rowCount);
            }

            // 決定使用哪個 frame 和 fieldMap
            let frame = defaultFrame;
            let fieldMap = defaultFieldMap;
            let currentRowIndex = rowIndex;
            if (seriesSelector !== undefined) {
                const resolved = resolveSeries(series, seriesSelector);
                if (!resolved || resolved.length === 0) {
                    return _match;
                }
                frame = resolved;
                fieldMap = buildFieldMap(resolved);
                currentRowIndex = frame.length - 1;
            }

            // Label 存取：${__data.CPU_A.labels.http_status}
            if (labelName !== undefined) {
                const valueField = getValueField(frame);
                const labels = valueField?.labels;
                // hasOwnProperty 防護：避免 __proto__ / constructor 等 prototype 屬性被意外存取
                if (!labels || !Object.prototype.hasOwnProperty.call(labels, labelName)) {
                    return _match;
                }
                const labelValue = labels[labelName];
                return escapeValues ? escapeMermaidChars(labelValue) : labelValue;
            }

            // 解析欄位：有 .fields.X 時用指定欄位，否則自動取第一個值欄位
            const hasFieldAccessor = dotName !== undefined || bracketName !== undefined || bracketIdx !== undefined;
            let field: Field | undefined;
            if (hasFieldAccessor) {
                field = resolveField(fieldMap, frame, dotName, bracketName, bracketIdx);
            } else if (seriesSelector !== undefined) {
                field = getValueField(frame);
            } else {
                return _match;
            }

            if (!field) {
                return _match;
            }

            // 合併 modifier：完整語法用 fieldModifier，簡寫用 shorthandModifier
            const modifier = fieldModifier ?? shorthandModifier;

            if (modifier === 'color') {
                return getColorValue(field, currentRowIndex);
            }

            let value: string;
            if (modifier === 'display') {
                value = getDisplayValue(field, currentRowIndex);
            } else {
                value = getRawValue(field, currentRowIndex);
            }

            return escapeValues ? escapeMermaidChars(value) : value;
        }
    );
}

/**
 * 處理 Mermaid 內容中的 Data Frame 資料引用，包含兩種模式：
 *
 * ### 1. 迭代模式 — {{#each data}} 區塊
 *
 * 將 Data Frame 的每一列套用模板，產生多行 Mermaid 定義。
 * 支援依 index、refId 或 series name 指定目標 series。
 *
 * ```
 * {{#each data}}           ← series[0]
 * {{#each data.1}}         ← series[1]
 * {{#each data.CPU_A}}     ← 依 refId 或 name
 * ```
 *
 * ### 2. 單值模式 — 直接引用 (不需區塊)
 *
 * 自動取最後一列的值。
 *
 * ```
 * graph TD
 *     A["CPU: ${__data.fields.Value:display}"]
 *     A --> B["${__data.CPU_A.fields.Value:display}"]
 *     style A fill:${__data.CPU_A.fields.Value:color}
 * ```
 *
 * ### 欄位存取語法 (兩種模式通用)
 *
 * Series 指定 (可選)：
 * - ${__data.fields.X}               — 預設 series[0]
 * - ${__data.0.fields.X}             — 依 index
 * - ${__data.CPU_A.fields.X}         — 依 refId 或 series name
 *
 * 欄位表示法：
 * - ${__data.fields.FieldName}       — dot notation
 * - ${__data.fields["Field Name"]}   — bracket notation (含空格)
 * - ${__data.fields[0]}              — index notation
 *
 * 格式修飾符：
 * - ${__data.fields.X:display}       — 格式化值 (unit、decimals、value mapping)
 * - ${__data.fields.X:color}         — 顏色 (由 Color scheme 控制)
 *
 * 迭代模式專用：
 * - ${__index}                       — 當前列索引 (從 0 開始)
 * - ${__rowCount}                    — 總列數
 */
export function expandDataBlocks(
    content: string,
    series: DataFrame[],
    escapeValues: boolean,
    maxRows = 0
): string {
    // Phase 1：展開 {{#each data}} / {{#each data.refId}} / {{#each data["Series Name"]}} 區塊
    const blockPattern = /\{\{#each\s+(data(?:\.(?:[\w-]+)|\["[^"]+"\])?)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;

    let result = content.replace(blockPattern, (_fullMatch, dataRef: string, template: string) => {
        const selector = parseSeriesSelector(dataRef);
        const frame = resolveSeries(series, selector);

        if (!frame || frame.length === 0) {
            return '';
        }

        const fieldMap = buildFieldMap(frame);
        // maxRows > 0 時限制展開列數，防止大量資料凍結瀏覽器
        const rowCount = maxRows > 0 ? Math.min(frame.length, maxRows) : frame.length;
        const rows: string[] = [];

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            rows.push(replaceFieldPlaceholders(template, fieldMap, frame, rowIndex, frame.length, escapeValues, series));
        }

        return rows.join('\n');
    });

    // Phase 2：解析區塊外的 standalone ${__data...fields.*} 引用
    if (series.length > 0 && FIELD_PLACEHOLDER_PATTERN.test(result)) {
        const defaultFrame = series[0];
        FIELD_PLACEHOLDER_PATTERN.lastIndex = 0;

        if (defaultFrame && defaultFrame.length > 0) {
            const fieldMap = buildFieldMap(defaultFrame);
            const lastRow = defaultFrame.length - 1;
            result = replaceFieldPlaceholders(result, fieldMap, defaultFrame, lastRow, defaultFrame.length, escapeValues, series);
        }
    }

    return result;
}
