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

## Supported combos

| Language | Framework | Architecture |
|---|---|---|
| Node.js | NestJS | Layered (N-Tier) |
| Node.js | NestJS | Clean Architecture |
| Node.js | NestJS | Hexagonal / DDD |

## Stack options

On top of the architecture, `pasha create` asks about:

| Choice | Options |
|---|---|
| Data layer | Prisma, TypeORM, Mongoose, none (in-memory) |
| Database | PostgreSQL, MySQL, MongoDB, SQLite — filtered to what the ORM supports |
| Validation | class-validator + class-transformer, Zod, none |
| Cache | Redis (optional) |
| Message broker | Kafka, RabbitMQ, none |
| AI docs | per-directory `AGENT.md` files (optional) |

Anything requiring a server gets a matching `docker-compose.yml` service and
`.env.example` entries. Files you didn't ask for are never generated.

## Local development

```bash
git clone https://github.com/pasha1383/pasha-cli.git
cd pasha-cli
npm install
npm link
pasha create
```
