import { escapeMermaidChars, mermaidSafeFormat, expandEachBlocks, detectUnresolvedVariables } from '../../../src/utils/mermaidVariables';

describe('escapeMermaidChars', () => {
    it('應跳脫中括號', () => {
        expect(escapeMermaidChars('Web [v2]')).toBe('Web #91;v2#93;');
    });

    it('應跳脫大括號', () => {
        expect(escapeMermaidChars('config {key}')).toBe('config #123;key#125;');
    });

    it('應跳脫小括號', () => {
        expect(escapeMermaidChars('func(x)')).toBe('func#40;x#41;');
    });

    it('應跳脫 pipe 字元', () => {
        expect(escapeMermaidChars('A | B')).toBe('A #124; B');
    });

    it('應跳脫角括號', () => {
        expect(escapeMermaidChars('A > B < C')).toBe('A #62; B #60; C');
    });

    it('應跳脫雙引號', () => {
        expect(escapeMermaidChars('say "hello"')).toBe('say #34;hello#34;');
    });

    it('應優先跳脫 # 避免雙重跳脫', () => {
        expect(escapeMermaidChars('#tag')).toBe('#35;tag');
    });

    it('不含特殊字元的字串應保持不變', () => {
        expect(escapeMermaidChars('hello world')).toBe('hello world');
    });

    it('應能處理多種特殊字元混合', () => {
        const input = 'fn(a) -> [b] | {c}';
        const result = escapeMermaidChars(input);
        expect(result).toBe('fn#40;a#41; -#62; #91;b#93; #124; #123;c#125;');
    });
});

describe('mermaidSafeFormat', () => {
    it('應跳脫單一字串值', () => {
        expect(mermaidSafeFormat('Web [v2]')).toBe('Web #91;v2#93;');
    });

    it('應跳脫陣列中的每個值並以逗號串接', () => {
        const result = mermaidSafeFormat(['A[1]', 'B(2)']);
        expect(result).toBe('A#91;1#93;, B#40;2#41;');
    });

    it('空陣列應回傳空字串', () => {
        expect(mermaidSafeFormat([])).toBe('');
    });
});

describe('expandEachBlocks', () => {
    const createReplaceVariables = (variables: Record<string, string[]>) => {
        return jest.fn((text: string, _scopedVars?: any, format?: string | Function) => {
            for (const [name, values] of Object.entries(variables)) {
                if (text === `\${${name}}` && format === 'pipe') {
                    return values.join('|');
                }
            }
            return text;
        });
    };

    it('應展開多選變數為多行', () => {
        const content = '{{#each targets}}    Service --> {{value}}{{/each}}';
        const replaceVariables = createReplaceVariables({ targets: ['DB', 'Cache', 'Queue'] });

        const result = expandEachBlocks(content, replaceVariables, false);
        expect(result).toContain('Service --> DB');
        expect(result).toContain('Service --> Cache');
        expect(result).toContain('Service --> Queue');
    });

    it('應支援 {{index}} 佔位符', () => {
        const content = '{{#each items}}    node_{{index}}[{{value}}]{{/each}}';
        const replaceVariables = createReplaceVariables({ items: ['Alpha', 'Beta'] });

        const result = expandEachBlocks(content, replaceVariables, false);
        expect(result).toContain('node_0[Alpha]');
        expect(result).toContain('node_1[Beta]');
    });

    it('escapeValues 為 true 時應跳脫值中的特殊字元', () => {
        const content = '{{#each items}}    A[{{value}}]{{/each}}';
        const replaceVariables = createReplaceVariables({ items: ['Web [v2]', 'API (v3)'] });

        const result = expandEachBlocks(content, replaceVariables, true);
        expect(result).toContain('A[Web #91;v2#93;]');
        expect(result).toContain('A[API #40;v3#41;]');
    });

    it('變數不存在時應保留原文', () => {
        const content = '{{#each unknown}}    X --> {{value}}{{/each}}';
        const replaceVariables = createReplaceVariables({});

        const result = expandEachBlocks(content, replaceVariables, false);
        expect(result).toBe(content);
    });

    it('應能處理多個 each 區塊', () => {
        const content = [
            '{{#each sources}}    {{value}} --> Router{{/each}}',
            '{{#each targets}}    Router --> {{value}}{{/each}}',
        ].join('\n');
        const replaceVariables = createReplaceVariables({
            sources: ['A', 'B'],
            targets: ['X', 'Y'],
        });

        const result = expandEachBlocks(content, replaceVariables, false);
        expect(result).toContain('A --> Router');
        expect(result).toContain('B --> Router');
        expect(result).toContain('Router --> X');
        expect(result).toContain('Router --> Y');
    });

    it('不含 each 區塊時應回傳原文', () => {
        const content = 'graph TD\n    A --> B';
        const replaceVariables = jest.fn((text: string) => text);

        const result = expandEachBlocks(content, replaceVariables, false);
        expect(result).toBe(content);
        expect(replaceVariables).not.toHaveBeenCalled();
    });
});

describe('detectUnresolvedVariables', () => {
    const createReplaceVariables = (knownVars: Record<string, string>) => {
        return jest.fn((text: string) => {
            let result = text;
            for (const [name, value] of Object.entries(knownVars)) {
                result = result.replace(new RegExp(`\\$\\{${name}\\}`, 'g'), value);
            }
            return result;
        });
    };

    it('應偵測出未定義的變數', () => {
        const content = 'graph TD\n    A[$service] --> B[$unknown]';
        const replaceVariables = createReplaceVariables({ service: 'web-api' });

        const result = detectUnresolvedVariables(content, replaceVariables);
        expect(result).toContain('unknown');
        expect(result).not.toContain('service');
    });

    it('應忽略 Mermaid 內建的 $ 變數', () => {
        const content = 'UpdateRelStyle(a, b, $offsetX="10", $offsetY="20")';
        const replaceVariables = createReplaceVariables({});

        const result = detectUnresolvedVariables(content, replaceVariables);
        expect(result).toEqual([]);
    });

    it('所有變數都已定義時應回傳空陣列', () => {
        const content = 'graph TD\n    A[$service] --> B[$env]';
        const replaceVariables = createReplaceVariables({ service: 'web', env: 'prod' });

        const result = detectUnresolvedVariables(content, replaceVariables);
        expect(result).toEqual([]);
    });

    it('應支援 ${var} 語法', () => {
        const content = 'graph TD\n    A[${resolved}] --> B[${missing}]';
        const replaceVariables = createReplaceVariables({ resolved: 'ok' });

        const result = detectUnresolvedVariables(content, replaceVariables);
        expect(result).toContain('missing');
        expect(result).not.toContain('resolved');
    });

    it('不含變數引用時應回傳空陣列', () => {
        const content = 'graph TD\n    A --> B';
        const replaceVariables = jest.fn((text: string) => text);

        const result = detectUnresolvedVariables(content, replaceVariables);
        expect(result).toEqual([]);
    });

    it('同一個未定義變數出現多次應只回報一次', () => {
        const content = 'graph TD\n    A[$foo] --> B[$foo] --> C[$foo]';
        const replaceVariables = createReplaceVariables({});

        const result = detectUnresolvedVariables(content, replaceVariables);
        expect(result).toEqual(['foo']);
    });
});
