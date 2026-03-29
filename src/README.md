<p>
  <img src="https://raw.githubusercontent.com/neildeng/grafana-grafmaid/main/src/img/logo.svg" alt="Grafmaid Logo" width="120" />
</p>

# Grafmaid

**Gra**fana + Mer**maid**.js = **Grafmaid**

A Grafana panel plugin that renders [Mermaid.js](https://mermaid.js.org/) diagrams with live data from queries, dashboard variables, and threshold-based styling — turning static architecture diagrams into dynamic, data-driven visuals.

[![License](https://img.shields.io/github/license/neildeng/grafana-grafmaid)](https://github.com/neildeng/grafana-grafmaid/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/neildeng/grafana-grafmaid)](https://github.com/neildeng/grafana-grafmaid/releases)

## Screenshots

![Flowchart, Sequence, State diagrams](https://raw.githubusercontent.com/neildeng/grafana-grafmaid/main/src/img/basic-graph-1.png)

![Dashboard Variables integration](https://raw.githubusercontent.com/neildeng/grafana-grafmaid/main/src/img/variables.png)

![Data Queries with threshold coloring](https://raw.githubusercontent.com/neildeng/grafana-grafmaid/main/src/img/queries.png)

## Features

- **All Mermaid diagram types** — Flowchart, Sequence, Class, State, ER, Gantt, Pie, Mindmap, Timeline, Git Graph, C4, and more
- **Dashboard Variables** — Use `$variable` / `${variable}` syntax and `{{#each var}}` multi-value expansion
- **Data Queries** — Inject live metric values via `${__data.CPU_A:display}` shorthand or `${__data.fields.X}` full syntax
- **Labels** — Access metric labels with `${__data.CPU_A.labels.http_status}`
- **Field Config** — Standard Options support: Units, Thresholds, Value Mappings, Color scheme, Decimals
- **Threshold coloring** — Color diagram nodes dynamically based on threshold values using `${__data.CPU_A:color}`
- **Special character escaping** — Auto-escape `[ ] { } | > <` in variable values to prevent syntax errors
- **Theme-aware** — Auto-switches Mermaid theme based on Grafana dark/light mode
- **Responsive** — SVG diagrams auto-scale with panel dimensions

## Requirements

- Grafana >= 12.3.0

## Getting Started

1. Install the plugin from the Grafana plugin catalog
2. Add a new panel and select **Grafmaid** as the visualization
3. Write your Mermaid diagram in the **Mermaid Content** option
4. (Optional) Configure data source queries to inject live values

## Configuration

### Panel Options

| Option | Default | Description |
|--------|---------|-------------|
| Mermaid Content | Example flowchart | Mermaid diagram definition with variable/data syntax |
| Escape special characters | `true` | Auto-escape Mermaid special characters in values |
| Max data rows | `100` | Max rows for `{{#each data}}` expansion (0 = unlimited) |

### Standard Options

The panel supports Grafana Standard Options via Field Config:

- **Unit** — Format numeric values (percent, bytes, etc.)
- **Thresholds** — Define color breakpoints (default: green base, red at 80)
- **Value Mappings** — Map values to custom text
- **Color scheme** — Defaults to "From thresholds (by value)"
- **Decimals** — Control decimal precision

### Data Syntax Quick Reference

| Syntax | Description |
|--------|-------------|
| `$variable` | Dashboard variable substitution |
| `{{#each var}}...{{value}}...{{/each}}` | Multi-value variable expansion |
| `${__data.CPU_A:display}` | Formatted value from query (auto value field) |
| `${__data.CPU_A:color}` | Threshold color from query |
| `${__data.CPU_A.labels.server}` | Metric label value |
| `${__data.fields.Value}` | Explicit field access from series[0] |
| `{{#each data.CPU_A}}...{{/each}}` | Iterate over query rows |

### Example: Threshold-colored Diagram

```
graph LR
    A["${__data.CPU_A.labels.server}"] --> B["CPU: ${__data.CPU_A:display}"]
    style B fill:${__data.CPU_A:color},color:#fff
```

## Documentation

For detailed documentation, see [docs/README.md](https://github.com/neildeng/grafana-grafmaid/blob/main/docs/README.md).

## Contributing

- **Report bugs**: [GitHub Issues](https://github.com/neildeng/grafana-grafmaid/issues)
- **Feature requests**: [GitHub Issues](https://github.com/neildeng/grafana-grafmaid/issues)
- **Source code**: [GitHub Repository](https://github.com/neildeng/grafana-grafmaid)

## License

Apache License 2.0 — see [LICENSE](https://github.com/neildeng/grafana-grafmaid/blob/main/LICENSE).

## Third-Party Notices

This plugin bundles the following open-source software:

| Package | License | Copyright |
|---------|---------|-----------|
| [mermaid](https://github.com/mermaid-js/mermaid) | MIT | © 2014-2022 Knut Sveidqvist |
| [dagre-d3-es](https://github.com/tbo47/dagre-d3-es) | MIT | © 2013 Chris Pettitt |
| [dayjs](https://github.com/iamkun/dayjs) | MIT | © 2018-present iamkun |
| [lodash-es](https://github.com/lodash/lodash) | MIT | © OpenJS Foundation |
| [marked](https://github.com/markedjs/marked) | MIT | © 2018+ MarkedJS |
| [roughjs](https://github.com/rough-stuff/rough) | MIT | © 2019 Preet Shihn |
| [KaTeX](https://github.com/KaTeX/KaTeX) | MIT | © 2013-2020 Khan Academy |
| [stylis](https://github.com/thysultan/stylis) | MIT | © 2016-present Sultan Tarimo |
| [uuid](https://github.com/uuidjs/uuid) | MIT | © 2010-2020 Robert Kieffer |
| [DOMPurify](https://github.com/cure53/DOMPurify) | MPL-2.0 OR Apache-2.0 | © 2024 Cure53 |

Full license texts are available in the [NOTICES](https://github.com/neildeng/grafana-grafmaid/blob/main/NOTICES) file.

## Version

%VERSION% (built on %TODAY%)
