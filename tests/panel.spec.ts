import { test, expect } from '@grafana/plugin-e2e';

// Mermaid 渲染的 SVG 帶有 role="graphics-document document"，
// 以此區分面板 header 的 icon SVG
const MERMAID_SVG_SELECTOR = 'svg[role^="graphics-document"]';

test.describe('Grafmaid Panel', () => {
    test('should render Mermaid diagram as SVG', async ({
        gotoPanelEditPage,
        readProvisionedDashboard,
    }) => {
        const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
        // id 4: flowchart TD\n    Start --> Stop
        const panelEditPage = await gotoPanelEditPage({ dashboard, id: '4' });
        const svg = panelEditPage.panel.locator.locator(MERMAID_SVG_SELECTOR);
        await expect(svg).toBeVisible({ timeout: 10000 });
    });

    test('should display error alert when Mermaid syntax is invalid', async ({
        panelEditPage,
        page,
    }) => {
        await panelEditPage.setVisualization('Grafmaid');
        const options = panelEditPage.getCustomOptions('Grafmaid');
        const contentInput = options.getTextInput('Mermaid Content');
        await contentInput.fill('this is not valid mermaid %%%');
        // Alert 可能渲染在 panel locator scope 之外，使用 page scope
        await expect(page.getByText('Mermaid render error')).toBeVisible({ timeout: 15000 });
    });

    test('should update diagram when Mermaid Content option changes', async ({
        panelEditPage,
    }) => {
        await panelEditPage.setVisualization('Grafmaid');
        const options = panelEditPage.getCustomOptions('Grafmaid');
        const contentInput = options.getTextInput('Mermaid Content');
        await contentInput.fill('graph TD\n    X --> Y');
        const svg = panelEditPage.panel.locator.locator(MERMAID_SVG_SELECTOR);
        await expect(svg).toBeVisible({ timeout: 15000 });
    });

    test('should render diagram with dashboard variables replaced', async ({
        gotoPanelEditPage,
        readProvisionedDashboard,
    }) => {
        const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
        // id 26: 使用 $gift, $gifts, $choose 變數的面板
        const panelEditPage = await gotoPanelEditPage({ dashboard, id: '26' });
        const svg = panelEditPage.panel.locator.locator(MERMAID_SVG_SELECTOR);
        await expect(svg).toBeVisible({ timeout: 10000 });
        // 確認沒有出現錯誤
        await expect(panelEditPage.panel.locator.getByText('Mermaid render error')).not.toBeVisible();
    });
});
