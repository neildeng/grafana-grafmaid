# Grafmaid

> **Gra**fana + Mer**maid**.js = **Grafmaid**

A Grafana panel plugin that renders [Mermaid.js](https://mermaid.js.org/) diagrams with live metric values injected from queries — turning static architecture diagrams into dynamic, data-driven visuals.

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
