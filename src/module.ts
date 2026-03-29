import { FieldColorModeId, FieldConfigProperty, PanelPlugin, ThresholdsMode } from '@grafana/data';
import { GrafmaidOptions } from './types';
import { GrafmaidPanel } from './components/GrafmaidPanel';

const DEFAULT_CONTENT = `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]`;

export const plugin = new PanelPlugin<GrafmaidOptions>(GrafmaidPanel)
    .useFieldConfig({
        standardOptions: {
            [FieldConfigProperty.Color]: {
                defaultValue: {
                    mode: FieldColorModeId.Thresholds,
                },
            },
            [FieldConfigProperty.Thresholds]: {
                defaultValue: {
                    mode: ThresholdsMode.Absolute,
                    steps: [
                        { value: -Infinity, color: 'green' },
                        { value: 80, color: 'red' },
                    ],
                },
            },
        },
    })
    .setPanelOptions((builder) => {
    return builder
        .addTextInput({
            path: 'content',
            name: 'Mermaid Content',
            description:
                '輸入 Mermaid 圖表定義語法。支援 $variable 變數置換、{{#each var}}...{{value}}...{{/each}} 多選變數展開，以及 {{#each data}}...${__data.fields.Name}...{{/each}} 查詢結果展開。',
            defaultValue: DEFAULT_CONTENT,
            settings: {
                useTextarea: true,
                rows: 10,
            },
        })
        .addBooleanSwitch({
            path: 'escapeSpecialChars',
            name: 'Escape special characters',
            description: '自動跳脫變數值中的 Mermaid 特殊字元 ([ ] { } | > < 等)，避免變數內容破壞圖表語法。',
            defaultValue: true,
        });
});
