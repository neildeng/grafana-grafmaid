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
                'Enter Mermaid diagram definition. Supports $variable substitution, {{#each var}}...{{value}}...{{/each}} multi-value expansion, {{#each data}}...${__data.fields.Name}...{{/each}} query result expansion, and {{#each series}}...${__data.labels.X}...{{/each}} cross-series iteration.',
            defaultValue: DEFAULT_CONTENT,
            settings: {
                useTextarea: true,
                rows: 10,
            },
        })
        .addBooleanSwitch({
            path: 'escapeSpecialChars',
            name: 'Escape special characters',
            description: 'Automatically escape Mermaid special characters ([ ] { } | > < etc.) in variable values to prevent breaking diagram syntax.',
            defaultValue: true,
        })
        .addNumberInput({
            path: 'maxDataRows',
            name: 'Max data rows',
            description: 'Maximum number of rows to expand in {{#each data}} blocks. Set to 0 for unlimited. Large values may impact rendering performance.',
            defaultValue: 100,
            settings: {
                min: 0,
                integer: true,
            },
        });
});
