<p align="center">
  <img src="src/img/logo.svg" alt="Grafmaid Logo" width="120" />
</p>

<h1 align="center">Grafmaid</h1>

<p align="center">
  <strong>Gra</strong>fana + Mer<strong>maid</strong>.js = <strong>Grafmaid</strong>
</p>

<p align="center">
  A Grafana panel plugin that renders <a href="https://mermaid.js.org/">Mermaid.js</a> diagrams with live metric values injected from queries — turning static architecture diagrams into dynamic, data-driven visuals.
</p>

<p align="center">
  🌐 <a href="README.zh-TW.md">繁體中文</a>
</p>

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
