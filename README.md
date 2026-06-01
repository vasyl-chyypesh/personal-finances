# personal-finances

A personal finance manager that runs locally and stores data in a SQLite database. The backend is a TypeScript REST API built with Express 5; a React UI is planned but not yet scaffolded.

## Tech stack

- **Runtime**: Node.js ≥ 25 (ESM only)
- **API**: Express 5 + TypeScript
- **Database**: SQLite via `better-sqlite3`
- **Validation**: Zod
- **Security**: Helmet, `express-rate-limit`
- **Tests**: native `node:test` + `supertest`

## Prerequisites

- Node.js ≥ 25
- npm
- Docker (optional — only for the Bearer security scan)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.example .env

# 3. Start the API in watch mode
npm run dev:api
```

The API listens on `http://localhost:3001` by default. The SQLite file is created automatically on first run and seeded with a set of predefined categories.

The API follows a strict layered architecture: **Routes → Services → Repositories**. See [CLAUDE.md](./CLAUDE.md) for the full architecture and contribution conventions.

## License

See [LICENSE](./LICENSE).
