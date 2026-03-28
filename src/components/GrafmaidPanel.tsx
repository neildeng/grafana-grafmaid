import React, { useEffect, useRef, useId } from 'react';
import { PanelProps } from '@grafana/data';
import { GrafmaidOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import mermaid from 'mermaid';

interface Props extends PanelProps<GrafmaidOptions> {}

const getStyles = () => {
    return {
        wrapper: css`
            position: relative;
            overflow: auto;
        `,
        container: css`
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
        `,
    };
};
export const GrafmaidPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id }) => {
    const theme = useTheme2();
    const styles = useStyles2(getStyles);
    const containerRef = useRef<HTMLDivElement>(null);
    const uniqueId = useId().replace(/:/g, '-');
    const mermaidId = `mermaid-${uniqueId}`;

    useEffect(() => {
        // 根據 Grafana 主題設定 Mermaid 的主題
        const isDark = theme.isDark;
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'strict',
        });
    }, [theme.isDark]);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!containerRef.current || !options.content) {
                return;
            }

            try {
                const { svg } = await mermaid.render(mermaidId, options.content);
                containerRef.current.innerHTML = svg;

                // 將 SVG 改為響應式，讓圖表隨面板大小自動縮放
                const svgEl = containerRef.current.querySelector('svg');
                if (svgEl) {
                    svgEl.style.maxWidth = '100%';
                    svgEl.style.maxHeight = '100%';
                    svgEl.style.width = 'auto';
                    svgEl.style.height = 'auto';
                }
            } catch (error) {
                if (containerRef.current) {
                    containerRef.current.innerHTML = `<pre style="color: ${theme.colors.error.text};">${error instanceof Error ? error.message : 'Failed to render diagram'}</pre>`;
                }
            }
        };

        renderDiagram();
    }, [options.content, theme.isDark, mermaidId, theme.colors.error.text, width, height]);

    return (
        <div
            className={cx(
                styles.wrapper,
                css`
                    width: ${width}px;
                    height: ${height}px;
                `
            )}
        >
            <div ref={containerRef} className={styles.container} />
        </div>
    );
};
