# Recommended Quality Tools

Recommend missing tools based on the detected tech stack.
Only list tools the project does **not** already have.

---

## JS/TS Ecosystem

| Tool | Purpose | Install |
|------|---------|---------|
| ESLint | Rule-based linting | `npm i -D eslint` |
| eslint-plugin-sonarjs | Cognitive complexity, code smells | `npm i -D eslint-plugin-sonarjs` |
| Biome v2 | High-performance linter + formatter (ESLint alternative) | `npm i -D --save-exact @biomejs/biome` |
| Prettier | Opinionated formatter | `npm i -D prettier` |
| madge | Circular dependency detection | `npx madge --circular src/` |
| Knip | Unused deps, exports, files, types | `npx knip` |
| dependency-cruiser | Architecture boundary enforcement | `npm i -D dependency-cruiser` |
| jscpd | Copy-paste detection (150+ languages) | `npx jscpd src/` |
| eslintcc | Complexity scoring per file | `npx eslintcc src/` |
| react-doctor | React/Next.js health score (47+ rules) | `npx react-doctor@latest .` |
| eslint-plugin-security | Detect security anti-patterns | `npm i -D eslint-plugin-security` |
| cloc | Count lines of code by language | `npx cloc src/` |
| vitest / jest | Unit/integration testing | `npm i -D vitest` |
| skott | Interactive dependency graph visualization | `npx skott --displayMode=webapp` |

---

## Python Ecosystem

| Tool | Purpose | Install |
|------|---------|---------|
| ruff | Ultra-fast linter + formatter | `pip install ruff` |
| mypy | Static type checking | `pip install mypy` |
| bandit | Security linter | `pip install bandit` |
| pip-audit | Dependency vulnerability scan | `pip install pip-audit` |
| vulture | Dead code detection | `pip install vulture` |
| pytest | Testing framework | `pip install pytest` |
| pytest-cov | Coverage reporting | `pip install pytest-cov` |

---

## Go Ecosystem

| Tool | Purpose | Install |
|------|---------|---------|
| golangci-lint | Meta-linter (50+ linters) | `go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest` |
| govulncheck | Vulnerability scanning | `go install golang.org/x/vuln/cmd/govulncheck@latest` |
