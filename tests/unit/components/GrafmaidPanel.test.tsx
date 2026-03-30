import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { FieldConfigSource, FieldType, LoadingState, PanelProps } from '@grafana/data';
import { GrafmaidOptions } from 'types';
import { GrafmaidPanel } from '../../../src/components/GrafmaidPanel';
import mermaid from 'mermaid';
import { mermaidSafeFormat } from '../../../src/utils/mermaidVariables';

// Mock mermaid 模組
jest.mock('mermaid', () => ({
    __esModule: true,
    default: {
        initialize: jest.fn(),
        parse: jest.fn(),
        render: jest.fn(),
    },
}));

const mockedMermaid = jest.mocked(mermaid);

// 建立預設的 PanelProps mock
function createDefaultProps(overrides?: Partial<PanelProps<GrafmaidOptions>>): PanelProps<GrafmaidOptions> {
    return {
        id: 1,
        data: {
            state: LoadingState.Done,
            series: [],
            timeRange: {
                from: new Date('2024-01-01T00:00:00Z') as unknown as any,
                to: new Date('2024-01-02T00:00:00Z') as unknown as any,
                raw: { from: 'now-1h', to: 'now' },
            },
        },
        timeRange: {
            from: new Date('2024-01-01T00:00:00Z') as unknown as any,
            to: new Date('2024-01-02T00:00:00Z') as unknown as any,
            raw: { from: 'now-1h', to: 'now' },
        },
        timeZone: 'utc',
        options: {
            content: 'graph TD\n    A --> B',
            escapeSpecialChars: true,
        },
        fieldConfig: {} as FieldConfigSource,
        width: 800,
        height: 600,
        transparent: false,
        renderCounter: 0,
        title: 'Test Panel',
        eventBus: {
            subscribe: jest.fn(),
            getStream: jest.fn(),
            publish: jest.fn(),
            removeAllListeners: jest.fn(),
            newScopedBus: jest.fn(),
        } as any,
        replaceVariables: jest.fn((text: string) => text),
        onOptionsChange: jest.fn(),
        onFieldConfigChange: jest.fn(),
        onChangeTimeRange: jest.fn(),
        ...overrides,
    };
}

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

describe('GrafmaidPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedMermaid.parse.mockResolvedValue({ diagramType: 'flowchart' } as any);
    });

    it('應正常渲染 Mermaid 圖表', async () => {
        const svgOutput = '<svg><text>rendered</text></svg>';
        mockedMermaid.render.mockResolvedValue({ svg: svgOutput, bindFunctions: jest.fn() });

        const props = createDefaultProps();
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(mockedMermaid.parse).toHaveBeenCalledWith('graph TD\n    A --> B');
            expect(mockedMermaid.render).toHaveBeenCalledWith(
                expect.stringContaining('mermaid-'),
                'graph TD\n    A --> B'
            );
        });
    });

    it('content 為空時不應呼叫 mermaid.render', async () => {
        const props = createDefaultProps({
            options: { content: '', escapeSpecialChars: true },
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(mockedMermaid.initialize).toHaveBeenCalled();
        });

        expect(mockedMermaid.parse).not.toHaveBeenCalled();
        expect(mockedMermaid.render).not.toHaveBeenCalled();
    });

    it('應呼叫 replaceVariables 進行變數置換', async () => {
        const replaceVariables = jest.fn((text: string) => text.replace(/\$service/g, 'web-api'));
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const props = createDefaultProps({
            options: { content: 'graph TD\n    A[$service] --> B', escapeSpecialChars: true },
            replaceVariables,
        });
        render(<GrafmaidPanel {...props} />);

        // escapeSpecialChars 為 true 時應使用 mermaidSafeFormat
        await waitFor(() => {
            expect(replaceVariables).toHaveBeenCalledWith(expect.any(String), {}, mermaidSafeFormat);
        });
    });

    it('escapeSpecialChars 關閉時應使用 text format', async () => {
        const replaceVariables = jest.fn((text: string) => text);
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const props = createDefaultProps({
            options: { content: 'graph TD\n    A --> B', escapeSpecialChars: false },
            replaceVariables,
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(replaceVariables).toHaveBeenCalledWith(expect.any(String), {}, 'text');
        });
    });

    it('Mermaid parse 失敗時應顯示 Alert 錯誤元件', async () => {
        mockedMermaid.parse.mockRejectedValue(new Error('Syntax error on line 2'));

        const props = createDefaultProps({
            options: { content: 'invalid mermaid syntax %%%', escapeSpecialChars: true },
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(screen.getByText('Mermaid render error')).toBeInTheDocument();
        });

        expect(screen.getByText('Syntax error on line 2')).toBeInTheDocument();
        // parse 失敗時不應呼叫 render
        expect(mockedMermaid.render).not.toHaveBeenCalled();
    });

    it('渲染失敗後成功渲染時應清除錯誤', async () => {
        mockedMermaid.parse.mockRejectedValueOnce(new Error('Syntax error'));

        const props = createDefaultProps({
            options: { content: 'bad syntax', escapeSpecialChars: true },
        });
        const { rerender } = render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(screen.getByText('Mermaid render error')).toBeInTheDocument();
        });

        // 更新為正確的語法
        mockedMermaid.parse.mockResolvedValue({ diagramType: 'flowchart' } as any);
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const fixedProps = createDefaultProps({
            options: { content: 'graph TD\n    A --> B', escapeSpecialChars: true },
        });
        rerender(<GrafmaidPanel {...fixedProps} />);

        await waitFor(() => {
            expect(screen.queryByText('Mermaid render error')).not.toBeInTheDocument();
        });
    });

    it('過期的 render 結果不應覆蓋較新的圖表', async () => {
        const firstRender = createDeferred<{ svg: string; bindFunctions: jest.Mock }>();
        const secondRender = createDeferred<{ svg: string; bindFunctions: jest.Mock }>();

        mockedMermaid.render
            .mockImplementationOnce(() => firstRender.promise)
            .mockImplementationOnce(() => secondRender.promise);

        const initialProps = createDefaultProps({
            options: { content: 'graph TD\n    A --> B', escapeSpecialChars: true },
        });
        const { container, rerender } = render(<GrafmaidPanel {...initialProps} />);

        const updatedProps = createDefaultProps({
            options: { content: 'graph TD\n    X --> Y', escapeSpecialChars: true },
        });
        rerender(<GrafmaidPanel {...updatedProps} />);

        await act(async () => {
            secondRender.resolve({ svg: '<svg><text>new</text></svg>', bindFunctions: jest.fn() });
            await secondRender.promise;
        });

        await waitFor(() => {
            expect(container).toHaveTextContent('new');
        });

        await act(async () => {
            firstRender.resolve({ svg: '<svg><text>old</text></svg>', bindFunctions: jest.fn() });
            await firstRender.promise;
        });

        await waitFor(() => {
            expect(container).toHaveTextContent('new');
            expect(container).not.toHaveTextContent('old');
        });
    });

    it('應根據 Grafana 主題初始化 Mermaid', () => {
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const props = createDefaultProps();
        render(<GrafmaidPanel {...props} />);

        expect(mockedMermaid.initialize).toHaveBeenCalledWith(
            expect.objectContaining({
                startOnLoad: false,
                securityLevel: 'strict',
            })
        );
    });

    it('渲染失敗時應顯示可展開的 resolved content 區塊', async () => {
        mockedMermaid.parse.mockRejectedValue(new Error('Unexpected token'));

        const props = createDefaultProps({
            options: { content: 'broken content', escapeSpecialChars: true },
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(screen.getByText('Resolved content')).toBeInTheDocument();
            expect(screen.getByText('broken content')).toBeInTheDocument();
        });
    });

    it('應偵測並警告未定義的變數', async () => {
        // replaceVariables 不認識 $undefined_var，保留原文
        const replaceVariables = jest.fn((text: string) => text);
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const props = createDefaultProps({
            options: { content: 'graph TD\n    A[$undefined_var] --> B', escapeSpecialChars: true },
            replaceVariables,
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(screen.getByText('Unresolved variables')).toBeInTheDocument();
            expect(screen.getByText(/\$undefined_var/)).toBeInTheDocument();
        });
    });

    it('所有變數都已定義時不應顯示警告', async () => {
        const replaceVariables = jest.fn((text: string) => {
            return text.replace(/\$\{service\}/g, 'web').replace(/\$service/g, 'web');
        });
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const props = createDefaultProps({
            options: { content: 'graph TD\n    A[$service] --> B', escapeSpecialChars: true },
            replaceVariables,
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(mockedMermaid.render).toHaveBeenCalled();
        });

        expect(screen.queryByText('Unresolved variables')).not.toBeInTheDocument();
    });

    it('含 data.series 時應以查詢結果展開 {{#each data}} 區塊', async () => {
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const props = createDefaultProps({
            data: {
                state: LoadingState.Done,
                series: [
                    {
                        fields: [
                            { name: 'Name', type: FieldType.string, values: ['DB', 'Cache'], config: {} },
                            { name: 'CPU', type: FieldType.number, values: [75, 90], config: {} },
                        ],
                        length: 2,
                    } as any,
                ],
                timeRange: {
                    from: new Date('2024-01-01T00:00:00Z') as unknown as any,
                    to: new Date('2024-01-02T00:00:00Z') as unknown as any,
                    raw: { from: 'now-1h', to: 'now' },
                },
            },
            options: {
                content: 'graph TD\n{{#each data}}\n    node_${__index}["${__data.fields.Name}: ${__data.fields.CPU}"]\n{{/each}}',
                escapeSpecialChars: false,
            },
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(mockedMermaid.render).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('node_0["DB: 75"]')
            );
            expect(mockedMermaid.render).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('node_1["Cache: 90"]')
            );
        });
    });

    it('空 data.series 搭配 {{#each data}} 區塊不應出錯', async () => {
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const props = createDefaultProps({
            options: {
                content: 'graph TD\n    A --> B\n{{#each data}}\n    A --> ${__data.fields.Name}\n{{/each}}',
                escapeSpecialChars: true,
            },
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            // data block 被移除，僅渲染靜態部分
            expect(mockedMermaid.render).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('A --> B')
            );
        });
    });

    it('{{#each}} 區塊應展開多選變數為多行', async () => {
        const replaceVariables = jest.fn((text: string, _scopedVars?: any, format?: string | Function) => {
            // expandEachBlocks 內部會用 pipe format 查詢
            if (text === '${targets}' && format === 'pipe') {
                return 'DB|Cache';
            }
            return text;
        });
        mockedMermaid.render.mockResolvedValue({ svg: '<svg></svg>', bindFunctions: jest.fn() });

        const content = 'graph TD\n{{#each targets}}    Service --> {{value}}\n{{/each}}';
        const props = createDefaultProps({
            options: { content, escapeSpecialChars: false },
            replaceVariables,
        });
        render(<GrafmaidPanel {...props} />);

        await waitFor(() => {
            expect(mockedMermaid.render).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('Service --> DB')
            );
            expect(mockedMermaid.render).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('Service --> Cache')
            );
        });
    });
});
