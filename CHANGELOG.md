# Changelog

## 1.0.0 (2026-03-29)

### Features

- Mermaid.js diagram rendering: supports Flowchart, Sequence, Class, State, ER, Gantt, Pie, and all Mermaid diagram types
- Dashboard Variables integration: supports `$variable` / `${variable}` substitution and `{{#each var}}` multi-value expansion
- Data Queries integration: inject query results into diagrams via `${__data.fields.X}` syntax
  - Shorthand syntax `${__data.CPU_A:display}` auto-selects the value field
  - Label access `${__data.CPU_A.labels.http_status}`
  - Series selector supports refId / name / index
  - `{{#each data}}` iteration mode for expanding multiple rows
- Field Config (Standard Options): supports Units, Thresholds, Value Mappings, Color scheme, Decimals
- Automatic special character escaping: prevents `[ ] { } | > <` in variable values from breaking diagram syntax
- Unresolved variable detection: warns about variables not defined in the dashboard
- Syntax pre-validation: validates with `mermaid.parse()` before rendering for precise error messages
- Theme-aware: auto-switches Mermaid theme based on Grafana dark/light mode
- Responsive scaling: SVG diagrams auto-resize with panel dimensions

### Security

- Mermaid `securityLevel: 'strict'` prevents XSS (uses DOMPurify internally)
- `{{#each data}}` default max row limit prevents browser freezing
- Label access guarded with `hasOwnProperty` to prevent prototype pollution
