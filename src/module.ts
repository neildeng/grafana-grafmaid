import { PanelPlugin } from '@grafana/data';
import { GrafmaidOptions } from './types';
import { GrafmaidPanel } from './components/GrafmaidPanel';

const DEFAULT_CONTENT = `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]`;

export const plugin = new PanelPlugin<GrafmaidOptions>(GrafmaidPanel).setPanelOptions((builder) => {
    return builder
        .addTextInput({
            path: 'content',
            name: 'Mermaid Content',
            description: '輸入 Mermaid 圖表定義語法',
            defaultValue: DEFAULT_CONTENT,
            settings: {
                useTextarea: true,
                rows: 10,
            },
        });
});
