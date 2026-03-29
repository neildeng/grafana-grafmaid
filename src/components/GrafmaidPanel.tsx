import React, { useEffect, useRef, useId, useState, useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { GrafmaidOptions } from 'types';
import { css, cx } from '@emotion/css';
import { Alert, useStyles2, useTheme2 } from '@grafana/ui';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { expandEachBlocks, mermaidSafeFormat, detectUnresolvedVariables } from 'utils/mermaidVariables';
import { expandDataBlocks } from 'utils/dataFrameExpander';

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

export const GrafmaidPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id, replaceVariables }) => {
    const theme = useTheme2();
    const styles = useStyles2(getStyles);
    const containerRef = useRef<HTMLDivElement>(null);
    const uniqueId = useId().replace(/:/g, '-');
    const mermaidId = `mermaid-${uniqueId}`;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 根據 Grafana 主題設定 Mermaid 的主題
        const isDark = theme.isDark;
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'strict',
        });
    }, [theme.isDark]);

    // 0. 展開 {{#each data}} 區塊 (Data Frame 查詢結果展開)
    const dataExpandedContent = expandDataBlocks(
        options.content ?? '',
        data.series,
        options.escapeSpecialChars,
        options.maxDataRows
    );

    // 1. 展開 {{#each}} 區塊 (多選變數展開)
    const expandedContent = expandEachBlocks(
        dataExpandedContent,
        replaceVariables,
        options.escapeSpecialChars
    );

    // 2. 置換 Dashboard Variables
    //    escapeSpecialChars 啟用時使用自訂 format function 跳脫特殊字元
    //    關閉時使用 'text' format 讓多選變數以可讀文字呈現
    const format = options.escapeSpecialChars ? mermaidSafeFormat : 'text';
    const resolvedContent = replaceVariables(expandedContent, {}, format);

    // 3. 偵測未定義的 Dashboard Variables
    const unresolvedVars = useMemo(
        () => detectUnresolvedVariables(expandedContent, replaceVariables),
        [expandedContent, replaceVariables]
    );

    // 4. 語法預驗證 + 渲染 Mermaid 圖表
    useEffect(() => {
        const renderDiagram = async () => {
            if (!containerRef.current || !resolvedContent) {
                setError(null);
                return;
            }

            try {
                // 先用 parse() 驗證語法，提供更精確的錯誤訊息
                await mermaid.parse(resolvedContent);

                const { svg } = await mermaid.render(mermaidId, resolvedContent);
                // Defense-in-depth：即使 Mermaid strict mode 已消毒，
                // 仍以 DOMPurify 二次過濾 SVG，防止 Mermaid 函式庫未來的迴歸漏洞
                containerRef.current.innerHTML = DOMPurify.sanitize(svg, {
                    USE_PROFILES: { svg: true, svgFilters: true },
                });
                setError(null);

                // 將 SVG 改為響應式，讓圖表隨面板大小自動縮放
                const svgEl = containerRef.current.querySelector('svg');
                if (svgEl) {
                    svgEl.style.maxWidth = '100%';
                    svgEl.style.maxHeight = '100%';
                    svgEl.style.width = 'auto';
                    svgEl.style.height = 'auto';
                }
            } catch (err) {
                console.error('Mermaid render error:', err);
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
                setError(err instanceof Error ? err.message : 'Failed to render Mermaid diagram');
            }
        };

        renderDiagram();
    }, [resolvedContent, theme.isDark, mermaidId, width, height]);

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
            {unresolvedVars.length > 0 && (
                <Alert title="Unresolved variables" severity="warning">
                    以下變數未在 Dashboard 中定義：{unresolvedVars.map((v: string) => `$${v}`).join(', ')}
                </Alert>
            )}
            {error && (
                <Alert title="Mermaid render error" severity="error">
                    <p>{error}</p>
                    <details>
                        <summary>Resolved content</summary>
                        <pre>{resolvedContent}</pre>
                    </details>
                </Alert>
            )}
            <div ref={containerRef} className={styles.container} />
        </div>
    );
};
