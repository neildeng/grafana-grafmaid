import React, { useEffect, useRef, useId, useState, useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { GrafmaidOptions } from 'types';
import { css, cx } from '@emotion/css';
import { Alert, useStyles2, useTheme2 } from '@grafana/ui';
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
        let cancelled = false;

        const renderDiagram = async () => {
            if (!containerRef.current || !resolvedContent) {
                setError(null);
                return;
            }

            try {
                // 先用 parse() 驗證語法，提供更精確的錯誤訊息
                await mermaid.parse(resolvedContent);
                if (cancelled || !containerRef.current) {
                    return;
                }

                const { svg } = await mermaid.render(mermaidId, resolvedContent);
                if (cancelled || !containerRef.current) {
                    return;
                }
                // 安全性由 mermaid.initialize({ securityLevel: 'strict' }) 保證：
                // Mermaid strict mode 內部使用 DOMPurify 消毒 SVG 輸出，
                // 移除 script / event handler / javascript: URL 等 XSS 向量。
                // 不另加外部 DOMPurify 層，避免重複消毒破壞 SVG 結構
                // (foreignObject 內嵌 HTML、style 元素等會被誤刪)。
                containerRef.current.innerHTML = svg;
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
                if (cancelled) {
                    return;
                }
                console.error('Mermaid render error:', err);
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
                setError(err instanceof Error ? err.message : 'Failed to render Mermaid diagram');
            }
        };

        renderDiagram();

        return () => {
            cancelled = true;
        };
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
                    The following variables are not defined in the dashboard: {unresolvedVars.map((v: string) => `$${v}`).join(', ')}
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
