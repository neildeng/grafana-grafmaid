<p align="center">
  <img src="https://raw.githubusercontent.com/neildeng/neildengg-grafmaid-panel/main/src/img/logo.svg" alt="Grafmaid Logo" width="120" />
</p>

<h1 align="center">Grafmaid</h1>

<p align="center">
  <strong>Gra</strong>fana + Mer<strong>maid</strong>.js = <strong>Grafmaid</strong>
</p>

<p align="center">
  A Grafana panel plugin that renders <a href="https://mermaid.js.org/">Mermaid.js</a> diagrams with live metric values injected from queries — turning static architecture diagrams into dynamic, data-driven visuals.
</p>

## Features

- Render Mermaid.js diagrams (flowcharts, sequence diagrams, etc.) directly in Grafana panels
- Inject live metric values from data source queries into diagram nodes and labels
- Automatically update diagrams as data refreshes

## Requirements

- Grafana >= 12.3.0

## Getting Started

1. Install the plugin from the Grafana plugin catalog
2. Add a new panel to your dashboard and select **Grafmaid** as the visualization
3. Write your Mermaid.js diagram definition in the panel options
4. Configure data source queries and use template variables to inject metric values into your diagram

## Version

%VERSION% (built on %TODAY%)
