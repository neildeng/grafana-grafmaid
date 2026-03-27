# Grafmaid

> **Gra**fana + Mer**maid**.js = **Grafmaid**

A Grafana panel plugin that renders [Mermaid.js](https://mermaid.js.org/) diagrams with live metric values injected from queries — turning static architecture diagrams into dynamic, data-driven visuals.

🌐 [繁體中文](README.zh-TW.md)

## Features

- Render Mermaid.js diagrams (flowcharts, sequence diagrams, etc.) directly in Grafana panels
- Inject live metric values from data source queries into diagram nodes and labels
- Automatically update diagrams as data refreshes

## Getting Started

### Prerequisites

- Grafana >= 12.3.0
- Node.js >= 22

### Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Build plugin in development mode and run in watch mode

   ```bash
   npm run dev
   ```

3. Spin up a Grafana instance and run the plugin inside it (using Docker)

   ```bash
   npm run server
   ```

4. Build plugin in production mode

   ```bash
   npm run build
   ```

### Testing

```bash
# Run unit tests in watch mode
npm run test

# Run unit tests in CI mode
npm run test:ci

# Run E2E tests (requires Grafana instance running via `npm run server`)
npm run e2e
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## License

Apache-2.0
