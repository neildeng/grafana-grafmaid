<p>
  <img src="src/img/logo.svg" alt="Grafmaid Logo" width="120" />
</p>

<h1>Grafmaid</h1>

<p>
  <strong>Gra</strong>fana + Mer<strong>maid</strong>.js = <strong>Grafmaid</strong>
</p>

<p>
  A Grafana panel plugin that renders <a href="https://mermaid.js.org/">Mermaid.js</a> diagrams with live data from queries, dashboard variables, and threshold-based styling — turning static architecture diagrams into dynamic, data-driven visuals.
</p>

<p>
  🌐 <a href="README.zh-TW.md">繁體中文</a>
</p>

[![License](https://img.shields.io/github/license/neildeng/grafana-grafmaid)](https://github.com/neildeng/grafana-grafmaid/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/neildeng/grafana-grafmaid)](https://github.com/neildeng/grafana-grafmaid/releases)

## Screenshots

| Basic diagrams | Variables | Data Queries |
|---|---|---|
| ![Basic](src/img/basic-graph-1.png) | ![Variables](src/img/variables.png) | ![Queries](src/img/queries.png) |

## Features

- **All Mermaid diagram types** — Flowchart, Sequence, Class, State, ER, Gantt, Pie, Mindmap, Timeline, Git Graph, C4, and more
- **Dashboard Variables** — `$variable` substitution and `{{#each var}}` multi-value expansion
- **Data Queries** — Inject live metric values via `${__data.CPU_A:display}` or `${__data.fields.X}` syntax
- **Labels** — Access metric labels with `${__data.CPU_A.labels.http_status}`
- **Field Config** — Units, Thresholds, Value Mappings, Color scheme, Decimals
- **Threshold coloring** — Color nodes dynamically with `${__data.CPU_A:color}`
- **Special character escaping** — Auto-escape `[ ] { } | > <` in variable values
- **Theme-aware** — Auto-switches Mermaid theme with Grafana dark/light mode
- **Responsive** — SVG auto-scales with panel dimensions

## Quick Start

```
graph LR
    A["${__data.CPU_A.labels.server}"] --> B["CPU: ${__data.CPU_A:display}"]
    style B fill:${__data.CPU_A:color},color:#fff
```

## Documentation

- **User guide**: [docs/README.md](docs/README.md) ([繁體中文](docs/README.zh-TW.md))
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## Getting Started (Development)

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

## Contributing

- **Report bugs**: [GitHub Issues](https://github.com/neildeng/grafana-grafmaid/issues)
- **Feature requests**: [GitHub Issues](https://github.com/neildeng/grafana-grafmaid/issues)

## License

[Apache License 2.0](LICENSE)
