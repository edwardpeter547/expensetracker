# ExpenseTracker

ExpenseTracker is a personal finance application for tracking income and expenses, managing categories, and setting budgets. It consists of an Expo/React Native mobile client and a Node.js/Express API backed by PostgreSQL.

## Structure

| Directory | Purpose |
| --- | --- |
| `backend/` | Express 5 API in ES modules, Prisma 7 + PostgreSQL, JWT auth |
| `mobile/` | Expo SDK 57 app with TypeScript and `expo-router` |
| `docs/` | Architecture and engineering guidance |
| `Makefile` | Convenience commands for both packages |

The two packages are independent (separate `package.json` files); the `Makefile` orchestrates them. There is no root npm workspace.

## Getting started

```bash
make install            # install backend + mobile dependencies
make start-backend-dev  # run the API in watch mode
make start-mobile       # start the Expo app
```

Backend configuration lives in environment files under `backend/src/environment/` (gitignored); see `mobile/.env.example` for the mobile environment variables.

## Testing

```bash
make test-backend       # Jest + Supertest with coverage
make test-mobile        # not yet implemented (no mobile test script)
```

## Documentation

- [System overview](docs/architecture/system-overview.md)
- [Coding standards](docs/engineering/coding-standards.md)
- [Design principles](docs/engineering/design-principles.md)
- [Testing strategy](docs/engineering/testing-strategy.md)
- [Architecture decisions](docs/decisions/README.md)
- [GitHub ticket automation](tickets/README.md)
- [Product domain design](docs/architecture/product-domain-design.md)

### Product strategy

- [Product vision](docs/product/product-vision.md)
- [Current feature inventory](docs/product/current-feature-inventory.md)
- [Market research](docs/product/market-research.md)
- [Competitive analysis](docs/product/competitive-analysis.md)
- [Feature opportunities](docs/product/feature-opportunities.md)
- [Target users](docs/product/target-users.md)
- [Subscription strategy](docs/product/subscription-strategy.md)
- [Product roadmap](docs/product/product-roadmap.md)
- [Product requirements](docs/product/product-requirements.md)
- [Success metrics](docs/product/success-metrics.md)

Traceability: vision -> target users -> feature opportunities -> subscription strategy -> roadmap -> product requirements -> conceptual domain design, with engineering standards and testing strategy governing implementation.
