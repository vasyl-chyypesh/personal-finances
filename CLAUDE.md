# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This project is for managing personal finances in a local environment, using a SQLite database for local data storage.

## Architecture
- `src/`: Contains the application source code.
- **Layered Architecture**: API packages must strictly follow a layered architecture: `Routes` $\rightarrow$ `Services` $\rightarrow$ `DB Models/Repositories`.
  - **Routes**: Handle HTTP requests, input validation (using **Zod**), and response orchestration.
  - **Services**: Contain core business logic and orchestration.
  - **Models/Repositories**: Handle direct data access and persistence (SQLite).

### API Feature Structure
Every new API feature must be implemented in its own directory under `src/api/<feature-name>/` using the following pattern:
- `<feature>.routes.ts`: HTTP handlers and Zod validation.
- `<feature>.service.ts`: Business logic and orchestration.
- `<feature>.repository.ts`: Direct SQLite queries and data mapping.
- `<feature>.types.ts`: Domain models and TypeScript interfaces.
- `<feature>.test.ts`: Integration and unit tests.


## Development Guidelines

### Naming Conventions
- **Files**: Use `camelCase` for general `.js` and `.ts` files. Use `PascalCase` for classes, components, and type definitions.
- **Tests**: Test files must have the `.test.ts` suffix.

### Testing Strategy
- **Framework**: Use native Node.js modules: `node:test` and `node:assert`.
- **Execution**: Run tests via `tsx` using the command: `node --import tsx --test 'src/**/*.test.ts'`.
- **Scope**: Both unit and integration tests are required to ensure stability.

### Tooling & Quality Assurance
- **File Naming**: Linted via `ls-lint`.
- **Commit Quality**: Enforced via `husky` (commit message linter and ESLint).
- **CI/CD**: All linters and tests are executed via GitHub Actions.

## Common Commands
- `npm run dev:ui`: Start UI development server.
- `npm run dev:api`: Start API development server.
- `npm run build`: Build all packages.
- `npm run lint`: Run ESLint.
- `npm run format`: Run Prettier.
