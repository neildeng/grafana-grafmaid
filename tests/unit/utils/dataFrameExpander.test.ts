import { DataFrame, Field, FieldType } from '@grafana/data';
import { expandDataBlocks } from '../../../src/utils/dataFrameExpander';

/**
 * 建立 mock Field 物件，可選擇性掛載 display 處理器。
 */
function createField(
    name: string,
    type: FieldType,
    values: any[],
    options?: {
        display?: (value: any) => { text: string; prefix?: string; suffix?: string; color?: string };
        noValue?: string;
    }
): Field {
    return {
        name,
        type,
        values,
        config: {
            ...(options?.noValue !== undefined && { noValue: options.noValue }),
        },
        ...(options?.display && { display: options.display }),
    } as Field;
}

/**
 * 建立 mock DataFrame。
 */
function createMockDataFrame(fields: Field[]): DataFrame {
    return {
        fields,
        length: fields.length > 0 ? fields[0].values.length : 0,
    };
}

describe('expandDataBlocks', () => {
    describe('基本欄位替換 (dot notation)', () => {
        it('應以原始值替換 ${__data.fields.FieldName}', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['Service-A', 'Service-B']),
                createField('Value', FieldType.number, [100, 200]),
            ]);

            const content = '{{#each data}}\nnode_${__index}["${__data.fields.Name}: ${__data.fields.Value}"]\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('node_0["Service-A: 100"]');
            expect(result).toContain('node_1["Service-B: 200"]');
        });

        it('應正確替換 ${__index} 和 ${__rowCount}', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['A', 'B', 'C']),
            ]);

            const content = '{{#each data}}\n${__index}/${__rowCount}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('0/3');
            expect(result).toContain('1/3');
            expect(result).toContain('2/3');
        });
    });

    describe('bracket notation 欄位存取', () => {
        it('${__data.fields["Field Name"]} 應支援含空格的欄位名', () => {
            const frame = createMockDataFrame([
                createField('Host Name', FieldType.string, ['server-01']),
            ]);

            const content = '{{#each data}}\n${__data.fields["Host Name"]}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('server-01');
        });

        it('${__data.fields[0]} 應支援以索引存取欄位', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['Alpha']),
                createField('Value', FieldType.number, [42]),
            ]);

            const content = '{{#each data}}\n${__data.fields[0]} = ${__data.fields[1]}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('Alpha = 42');
        });

        it('索引超出 fields 範圍應保留原樣', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['A']),
            ]);

            const content = '{{#each data}}\n${__data.fields[99]}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('${__data.fields[99]}');
        });
    });

    describe(':display 修飾符', () => {
        it('應使用 field.display 處理器格式化值', () => {
            const frame = createMockDataFrame([
                createField('CPU', FieldType.number, [85.678], {
                    display: (v: number) => ({ text: v.toFixed(1), suffix: ' %' }),
                }),
            ]);

            const content = '{{#each data}}\n${__data.fields.CPU:display}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('85.7 %');
        });

        it('無 display 處理器時 fallback 為原始值', () => {
            const frame = createMockDataFrame([
                createField('CPU', FieldType.number, [85.678]),
            ]);

            const content = '{{#each data}}\n${__data.fields.CPU:display}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('85.678');
        });

        it('bracket notation 也應支援 :display', () => {
            const frame = createMockDataFrame([
                createField('CPU Usage', FieldType.number, [85.678], {
                    display: (v: number) => ({ text: v.toFixed(1), suffix: '%' }),
                }),
            ]);

            const content = '{{#each data}}\n${__data.fields["CPU Usage"]:display}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('85.7%');
        });

        it('index notation 也應支援 :display', () => {
            const frame = createMockDataFrame([
                createField('CPU', FieldType.number, [85.678], {
                    display: (v: number) => ({ text: v.toFixed(1), suffix: '%' }),
                }),
            ]);

            const content = '{{#each data}}\n${__data.fields[0]:display}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('85.7%');
        });
    });

    describe(':color 修飾符', () => {
        it('應使用 field.display 回傳的顏色 (遵循 Grafana Color scheme)', () => {
            const frame = createMockDataFrame([
                createField('Value', FieldType.number, [90], {
                    display: () => ({ text: '90', color: '#FF0000' }),
                }),
            ]);

            const content = '{{#each data}}\nstyle node fill:${__data.fields.Value:color}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('fill:#FF0000');
        });

        it('無 display 處理器時回傳空字串', () => {
            const frame = createMockDataFrame([
                createField('Value', FieldType.number, [90]),
            ]);

            const content = '{{#each data}}\nfill:${__data.fields.Value:color}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('fill:');
            expect(result).not.toContain('#');
        });

        it('color 值不應被 escape (即使 escapeValues 啟用)', () => {
            const frame = createMockDataFrame([
                createField('Value', FieldType.number, [90], {
                    display: () => ({ text: '90', color: '#FF0000' }),
                }),
            ]);

            const content = '{{#each data}}\nfill:${__data.fields.Value:color}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], true);

            expect(result).toContain('#FF0000');
            expect(result).not.toContain('#35;');
        });
    });

    describe('null / undefined 值處理', () => {
        it('null 值應使用 field config 的 noValue 設定', () => {
            const frame = createMockDataFrame([
                createField('Status', FieldType.string, [null], { noValue: 'N/A' }),
            ]);

            const content = '{{#each data}}\n${__data.fields.Status}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('N/A');
        });

        it('null 值無 noValue 設定時預設為 "-"', () => {
            const frame = createMockDataFrame([
                createField('Status', FieldType.string, [null]),
            ]);

            const content = '{{#each data}}\n${__data.fields.Status}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('-');
        });

        it('null 值搭配 :display 應使用 display 處理器', () => {
            const frame = createMockDataFrame([
                createField('Value', FieldType.number, [null], {
                    display: () => ({ text: 'No data' }),
                }),
            ]);

            const content = '{{#each data}}\n${__data.fields.Value:display}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('No data');
        });
    });

    describe('空 series 與邊界情況', () => {
        it('空 series 陣列應回傳空字串', () => {
            const content = '{{#each data}}\n${__data.fields.Name}\n{{/each}}';
            const result = expandDataBlocks(content, [], false);

            expect(result).toBe('');
        });

        it('series index 超出範圍應回傳空字串', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['A']),
            ]);

            const content = '{{#each data.5}}\n${__data.fields.Name}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toBe('');
        });

        it('DataFrame 無資料列時應回傳空字串', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, []),
            ]);

            const content = '{{#each data}}\n${__data.fields.Name}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toBe('');
        });
    });

    describe('series 選擇', () => {
        it('{{#each data.1}} 應依 index 指向 series[1]', () => {
            const frame0 = createMockDataFrame([
                createField('Name', FieldType.string, ['Frame0']),
            ]);
            const frame1 = createMockDataFrame([
                createField('Name', FieldType.string, ['Frame1']),
            ]);

            const content = '{{#each data.1}}\n${__data.fields.Name}\n{{/each}}';
            const result = expandDataBlocks(content, [frame0, frame1], false);

            expect(result).toContain('Frame1');
            expect(result).not.toContain('Frame0');
        });

        it('{{#each data}} 預設指向 series[0]', () => {
            const frame0 = createMockDataFrame([
                createField('Name', FieldType.string, ['Frame0']),
            ]);

            const content = '{{#each data}}\n${__data.fields.Name}\n{{/each}}';
            const result = expandDataBlocks(content, [frame0], false);

            expect(result).toContain('Frame0');
        });

        it('{{#each data.CPU_A}} 應依 refId 指向對應 series', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [42]),
            ]), refId: 'CPU_A' };
            const frameB = { ...createMockDataFrame([
                createField('Value', FieldType.number, [99]),
            ]), refId: 'CPU_B' };

            const content = '{{#each data.CPU_A}}\n${__data.fields.Value}\n{{/each}}';
            const result = expandDataBlocks(content, [frameA, frameB], false);

            expect(result).toContain('42');
            expect(result).not.toContain('99');
        });

        it('{{#each data.myName}} 應依 series name 指向對應 series', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [10]),
            ]), name: 'myName' };
            const frameB = createMockDataFrame([
                createField('Value', FieldType.number, [20]),
            ]);

            const content = '{{#each data.myName}}\n${__data.fields.Value}\n{{/each}}';
            const result = expandDataBlocks(content, [frameB, frameA], false);

            expect(result).toContain('10');
            expect(result).not.toContain('20');
        });

        it('{{#each data.cpu-prod}} 應支援含連字號的 selector', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [10]),
            ]), name: 'cpu-prod' };
            const frameB = createMockDataFrame([
                createField('Value', FieldType.number, [20]),
            ]);

            const content = '{{#each data.cpu-prod}}\n${__data.fields.Value}\n{{/each}}';
            const result = expandDataBlocks(content, [frameB, frameA], false);

            expect(result).toContain('10');
            expect(result).not.toContain('20');
        });

        it('{{#each data["My Series"]}} 應支援含空格的 series name', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [10]),
            ]), name: 'My Series' };
            const frameB = createMockDataFrame([
                createField('Value', FieldType.number, [20]),
            ]);

            const content = '{{#each data["My Series"]}}\n${__data.fields.Value}\n{{/each}}';
            const result = expandDataBlocks(content, [frameB, frameA], false);

            expect(result).toContain('10');
            expect(result).not.toContain('20');
        });

        it('單值模式：${__data.CPU_A.fields.Value} 應依 refId 取最後一列', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [10, 42]),
            ]), refId: 'CPU_A' };
            const frameB = { ...createMockDataFrame([
                createField('Value', FieldType.number, [99]),
            ]), refId: 'CPU_B' };

            const content = 'graph TD\n    A["${__data.CPU_A.fields.Value}"]';
            const result = expandDataBlocks(content, [frameA, frameB], false);

            expect(result).toContain('42');
            expect(result).not.toContain('99');
        });

        it('單值模式：${__data.CPU_A.fields.Value:display} 應支援格式修飾符', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [85.6], {
                    display: (v: number) => ({ text: v.toFixed(1), suffix: '%' }),
                }),
            ]), refId: 'CPU_A' };

            const content = 'graph TD\n    A["CPU: ${__data.CPU_A.fields.Value:display}"]';
            const result = expandDataBlocks(content, [frameA], false);

            expect(result).toContain('CPU: 85.6%');
        });

        it('不存在的 refId/name 應保留原樣', () => {
            const frame = createMockDataFrame([
                createField('Value', FieldType.number, [42]),
            ]);

            const content = 'graph TD\n    A["${__data.UNKNOWN.fields.Value}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('${__data.UNKNOWN.fields.Value}');
        });

        it('多個 series selector 可在同一模板中混用', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [45]),
            ]), refId: 'CPU_A' };
            const frameB = { ...createMockDataFrame([
                createField('Value', FieldType.number, [92]),
            ]), refId: 'CPU_B' };

            const content = [
                'graph LR',
                '    A["CPU_A: ${__data.CPU_A.fields.Value}"]',
                '    B["CPU_B: ${__data.CPU_B.fields.Value}"]',
            ].join('\n');
            const result = expandDataBlocks(content, [frameA, frameB], false);

            expect(result).toContain('CPU_A: 45');
            expect(result).toContain('CPU_B: 92');
        });

        it('單值模式：${__data["CPU Prod"].fields.Value} 應支援含空格的 series name', () => {
            const frameA = { ...createMockDataFrame([
                createField('Value', FieldType.number, [10, 42]),
            ]), name: 'CPU Prod' };

            const content = 'graph TD\n    A["${__data["CPU Prod"].fields.Value}"]';
            const result = expandDataBlocks(content, [frameA], false);

            expect(result).toContain('42');
        });
    });

    describe('不存在的欄位', () => {
        it('dot notation 不存在的欄位名應保留原樣', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['A']),
            ]);

            const content = '{{#each data}}\n${__data.fields.Name} - ${__data.fields.NonExistent}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('A - ${__data.fields.NonExistent}');
        });
    });

    describe('跳脫處理', () => {
        it('escapeValues 啟用時應跳脫特殊字元', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['[Service A]']),
            ]);

            const content = '{{#each data}}\n${__data.fields.Name}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], true);

            expect(result).toContain('#91;Service A#93;');
            expect(result).not.toContain('[Service A]');
        });

        it('escapeValues 關閉時不應跳脫', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['[Service A]']),
            ]);

            const content = '{{#each data}}\n${__data.fields.Name}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('[Service A]');
        });
    });

    describe('無 data block 的內容', () => {
        it('不含 {{#each data}} 的內容應原樣通過', () => {
            const content = 'graph TD\n    A --> B';
            const result = expandDataBlocks(content, [], false);

            expect(result).toBe(content);
        });

        it('含 {{#each varName}} (非 data) 的內容不應被處理', () => {
            const content = '{{#each targets}}\n    Service --> {{value}}\n{{/each}}';
            const result = expandDataBlocks(content, [], false);

            expect(result).toBe(content);
        });
    });

    describe('單值模式 (standalone references)', () => {
        it('區塊外的 ${__data.fields.*} 應取最後一列的值', () => {
            const frame = createMockDataFrame([
                createField('CPU', FieldType.number, [50, 75, 92]),
            ]);

            const content = 'graph TD\n    A["CPU: ${__data.fields.CPU}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('CPU: 92');
        });

        it('應支援 :display 修飾符', () => {
            const frame = createMockDataFrame([
                createField('CPU', FieldType.number, [50, 92], {
                    display: (v: number) => ({ text: String(v), suffix: '%' }),
                }),
            ]);

            const content = 'graph TD\n    A["CPU: ${__data.fields.CPU:display}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('CPU: 92%');
        });

        it('應支援 :color 修飾符', () => {
            const frame = createMockDataFrame([
                createField('CPU', FieldType.number, [50, 92], {
                    display: (v: number) => ({
                        text: String(v),
                        color: v > 80 ? '#FF0000' : '#00FF00',
                    }),
                }),
            ]);

            const content = 'graph TD\n    style A fill:${__data.fields.CPU:color}';
            const result = expandDataBlocks(content, [frame], false);

            // 最後一列 92 > 80 → #FF0000
            expect(result).toContain('fill:#FF0000');
        });

        it('應支援 bracket notation', () => {
            const frame = createMockDataFrame([
                createField('Host Name', FieldType.string, ['web-01', 'web-02']),
            ]);

            const content = 'graph TD\n    A["${__data.fields["Host Name"]}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('web-02');
        });

        it('應支援 index notation', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['A', 'B']),
            ]);

            const content = 'graph TD\n    A["${__data.fields[0]}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('B');
        });

        it('series 為空時應保留原樣', () => {
            const content = 'graph TD\n    A["${__data.fields.CPU}"]';
            const result = expandDataBlocks(content, [], false);

            expect(result).toBe(content);
        });

        it('迭代模式與單值模式可混用', () => {
            const frame = createMockDataFrame([
                createField('Name', FieldType.string, ['DB', 'Cache']),
                createField('Total', FieldType.number, [10, 20]),
            ]);

            const content = [
                'graph TD',
                '    title["Total: ${__data.fields.Total}"]',
                '{{#each data}}',
                '    node_${__index}["${__data.fields.Name}"]',
                '{{/each}}',
            ].join('\n');

            const result = expandDataBlocks(content, [frame], false);

            // 單值模式：取最後一列 (Total = 20)
            expect(result).toContain('Total: 20');
            // 迭代模式：展開所有列
            expect(result).toContain('node_0["DB"]');
            expect(result).toContain('node_1["Cache"]');
        });
    });

    describe('label 存取', () => {
        it('${__data.CPU_A.labels.http_status} 應取得 label 值', () => {
            const valueField = createField('Value', FieldType.number, [90]);
            (valueField as any).labels = { http_status: '200', server: 'Apache HTTP Server' };
            const frame = {
                ...createMockDataFrame([
                    createField('Time', FieldType.time, [1000]),
                    valueField,
                ]),
                refId: 'CPU_A',
            };

            const content = 'graph TD\n    A["status: ${__data.CPU_A.labels.http_status}, server: ${__data.CPU_A.labels.server}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('status: 200');
            expect(result).toContain('server: Apache HTTP Server');
        });

        it('${__data.labels.http_status} 不指定 series 應取 series[0]', () => {
            const valueField = createField('Value', FieldType.number, [42]);
            (valueField as any).labels = { env: 'prod' };
            const frame = createMockDataFrame([
                createField('Time', FieldType.time, [1000]),
                valueField,
            ]);

            const content = 'graph TD\n    A["${__data.labels.env}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('prod');
        });

        it('不存在的 label 應保留原樣', () => {
            const valueField = createField('Value', FieldType.number, [42]);
            (valueField as any).labels = { env: 'prod' };
            const frame = {
                ...createMockDataFrame([valueField]),
                refId: 'CPU_A',
            };

            const content = 'graph TD\n    A["${__data.CPU_A.labels.nonexistent}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('${__data.CPU_A.labels.nonexistent}');
        });

        it('label 值含特殊字元時 escapeValues 應跳脫', () => {
            const valueField = createField('Value', FieldType.number, [42]);
            (valueField as any).labels = { path: '/api[v1]' };
            const frame = {
                ...createMockDataFrame([valueField]),
                refId: 'A',
            };

            const content = '{{#each data}}\n${__data.A.labels.path}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], true);

            expect(result).toContain('#91;v1#93;');
        });
    });

    describe('簡寫語法 (省略 .fields.X)', () => {
        it('${__data.CPU_A} 應自動取第一個非 Time 欄位', () => {
            const frame = {
                ...createMockDataFrame([
                    createField('Time', FieldType.time, [1000, 2000]),
                    createField('CPU_A-series', FieldType.number, [50, 92]),
                ]),
                refId: 'CPU_A',
            };

            const content = 'graph TD\n    A["CPU: ${__data.CPU_A}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('CPU: 92');
        });

        it('${__data.CPU_A:display} 應自動取值欄位並格式化', () => {
            const frame = {
                ...createMockDataFrame([
                    createField('Time', FieldType.time, [1000]),
                    createField('CPU_A-series', FieldType.number, [85.6], {
                        display: (v: number) => ({ text: v.toFixed(1), suffix: '%' }),
                    }),
                ]),
                refId: 'CPU_A',
            };

            const content = 'graph TD\n    A["CPU: ${__data.CPU_A:display}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('CPU: 85.6%');
        });

        it('${__data.CPU_A:color} 應自動取值欄位的顏色', () => {
            const frame = {
                ...createMockDataFrame([
                    createField('Time', FieldType.time, [1000]),
                    createField('Value', FieldType.number, [90], {
                        display: () => ({ text: '90', color: '#FF0000' }),
                    }),
                ]),
                refId: 'CPU_A',
            };

            const content = 'graph TD\n    style A fill:${__data.CPU_A:color}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('fill:#FF0000');
        });

        it('多個簡寫引用可混用', () => {
            const frameA = {
                ...createMockDataFrame([
                    createField('Time', FieldType.time, [1000]),
                    createField('A-series', FieldType.number, [45]),
                ]),
                refId: 'CPU_A',
            };
            const frameB = {
                ...createMockDataFrame([
                    createField('Time', FieldType.time, [1000]),
                    createField('B-series', FieldType.number, [92]),
                ]),
                refId: 'CPU_B',
            };

            const content = [
                'graph LR',
                '    A["CPU_A: ${__data.CPU_A}"] --> B["CPU_B: ${__data.CPU_B}"]',
            ].join('\n');
            const result = expandDataBlocks(content, [frameA, frameB], false);

            expect(result).toContain('CPU_A: 45');
            expect(result).toContain('CPU_B: 92');
        });

        it('簡寫與完整語法可混用', () => {
            const frame = {
                ...createMockDataFrame([
                    createField('Time', FieldType.time, [1000]),
                    createField('Value', FieldType.number, [85]),
                ]),
                refId: 'CPU_A',
            };

            const content = 'graph TD\n    A["${__data.CPU_A:display}"] --> B["${__data.CPU_A.fields.Value}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('85');
        });

        it('${__data} 無 series selector 也無 field accessor 應保留原樣', () => {
            const frame = createMockDataFrame([
                createField('Value', FieldType.number, [42]),
            ]);

            const content = 'graph TD\n    A["${__data}"]';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('${__data}');
        });
    });

    describe('跨 series 迭代 ({{#each series}})', () => {
        it('應迭代所有 series 並存取各自的 labels', () => {
            const makeFrame = (namespace: string) => {
                const valueField = createField('Value', FieldType.number, [1]);
                (valueField as any).labels = { namespace };
                return createMockDataFrame([
                    createField('Time', FieldType.time, [1000]),
                    valueField,
                ]);
            };

            const series = [makeFrame('airflow'), makeFrame('az-devops'), makeFrame('cert-manager')];

            const content = [
                'graph TD',
                '    K8s[cluster]',
                '    {{#each series}}',
                '    ns_${__index}["${__data.labels.namespace}"]',
                '    K8s --> ns_${__index}',
                '    {{/each}}',
            ].join('\n');

            const result = expandDataBlocks(content, series, false);

            expect(result).toContain('ns_0["airflow"]');
            expect(result).toContain('ns_1["az-devops"]');
            expect(result).toContain('ns_2["cert-manager"]');
            expect(result).toContain('K8s --> ns_0');
            expect(result).toContain('K8s --> ns_1');
            expect(result).toContain('K8s --> ns_2');
        });

        it('應支援 ${__seriesCount}', () => {
            const makeFrame = (name: string) =>
                createMockDataFrame([createField('Name', FieldType.string, [name])]);

            const series = [makeFrame('A'), makeFrame('B'), makeFrame('C')];

            const content = '{{#each series}}\n${__index}/${__seriesCount}\n{{/each}}';
            const result = expandDataBlocks(content, series, false);

            expect(result).toContain('0/3');
            expect(result).toContain('1/3');
            expect(result).toContain('2/3');
        });

        it('應支援存取各 series 的欄位值 (取最後一列)', () => {
            const frame0 = createMockDataFrame([
                createField('Value', FieldType.number, [10, 20]),
            ]);
            const frame1 = createMockDataFrame([
                createField('Value', FieldType.number, [30, 40]),
            ]);

            const content = '{{#each series}}\nval_${__data.fields.Value}\n{{/each}}';
            const result = expandDataBlocks(content, [frame0, frame1], false);

            expect(result).toContain('val_20');
            expect(result).toContain('val_40');
        });

        it('應支援 :display 和 :color 修飾符', () => {
            const frame = createMockDataFrame([
                createField('Value', FieldType.number, [85], {
                    display: (v: number) => ({ text: v.toFixed(1), suffix: '%', color: '#FF0000' }),
                }),
            ]);

            const content = '{{#each series}}\n${__data.fields.Value:display} fill:${__data.fields.Value:color}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], false);

            expect(result).toContain('85.0%');
            expect(result).toContain('fill:#FF0000');
        });

        it('空 series 陣列應回傳空字串', () => {
            const content = '{{#each series}}\n${__data.labels.namespace}\n{{/each}}';
            const result = expandDataBlocks(content, [], false);

            expect(result).toBe('');
        });

        it('無資料列的 series 應被跳過', () => {
            const emptyFrame = createMockDataFrame([
                createField('Value', FieldType.number, []),
            ]);
            const validFrame = createMockDataFrame([
                createField('Value', FieldType.number, [42]),
            ]);

            const content = '{{#each series}}\nval_${__data.fields.Value}\n{{/each}}';
            const result = expandDataBlocks(content, [emptyFrame, validFrame], false);

            expect(result).toContain('val_42');
            expect(result).not.toContain('val_undefined');
        });

        it('maxRows 應限制迭代的 series 數量', () => {
            const makeFrame = (val: number) =>
                createMockDataFrame([createField('Value', FieldType.number, [val])]);

            const series = [makeFrame(1), makeFrame(2), makeFrame(3), makeFrame(4)];

            const content = '{{#each series}}\n${__data.fields.Value}\n{{/each}}';
            const result = expandDataBlocks(content, series, false, 2);

            expect(result).toContain('1');
            expect(result).toContain('2');
            expect(result).not.toContain('\n3');
            expect(result).not.toContain('\n4');
        });

        it('escapeValues 應跳脫 label 中的特殊字元', () => {
            const valueField = createField('Value', FieldType.number, [1]);
            (valueField as any).labels = { path: '/api[v1]' };
            const frame = createMockDataFrame([valueField]);

            const content = '{{#each series}}\n${__data.labels.path}\n{{/each}}';
            const result = expandDataBlocks(content, [frame], true);

            expect(result).toContain('#91;v1#93;');
        });

        it('{{#each series}} 與 {{#each data}} 可混用', () => {
            const valueField = createField('Value', FieldType.number, [10]);
            (valueField as any).labels = { env: 'prod' };
            const frame0 = createMockDataFrame([
                createField('Time', FieldType.time, [1000]),
                valueField,
            ]);
            const frame1 = createMockDataFrame([
                createField('Name', FieldType.string, ['DB', 'Cache']),
            ]);

            const content = [
                '{{#each series}}',
                '    env_${__index}["${__data.labels.env}"]',
                '{{/each}}',
                '{{#each data.1}}',
                '    node_${__index}["${__data.fields.Name}"]',
                '{{/each}}',
            ].join('\n');

            const result = expandDataBlocks(content, [frame0, frame1], false);

            expect(result).toContain('env_0["prod"]');
            expect(result).toContain('node_0["DB"]');
            expect(result).toContain('node_1["Cache"]');
        });
    });

    describe('多個 data block', () => {
        it('應能處理同一內容中的多個 data block', () => {
            const frame0 = createMockDataFrame([
                createField('Name', FieldType.string, ['A']),
            ]);
            const frame1 = createMockDataFrame([
                createField('Name', FieldType.string, ['B']),
            ]);

            const content = [
                '{{#each data.0}}',
                '    src_${__data.fields.Name}',
                '{{/each}}',
                '{{#each data.1}}',
                '    dst_${__data.fields.Name}',
                '{{/each}}',
            ].join('\n');

            const result = expandDataBlocks(content, [frame0, frame1], false);

            expect(result).toContain('src_A');
            expect(result).toContain('dst_B');
        });
    });
});
