# pasha CLI — v2

A project generator: pick a language, pick a framework, pick an architecture — pasha builds the rest.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/pasha1383/pasha-cli/main/install.sh | bash
```

Linux and macOS only (for now).

## Commands

```bash
pasha create     # interactive wizard to scaffold a new project
pasha doctor     # check and install prerequisites (node, git, python3, go, java)
pasha info
pasha --help
```

## Supported combos (Phase 1)

| Language | Framework | Architecture |
|---|---|---|
| Node.js | NestJS | Hexagonal / DDD |

## Local development

```bash
git clone https://github.com/pasha1383/pasha-cli.git
cd pasha-cli
npm install
npm link
pasha create
```
