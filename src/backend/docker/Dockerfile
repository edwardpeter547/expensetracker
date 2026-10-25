# ExpenseTracker backend — multi-stage Docker image.
#
# Location: src/backend/docker/Dockerfile
# Build context: src/backend
#
# Build with:
#   docker build -f src/backend/docker/Dockerfile --target <target> \
#     -t expensetracker-backend:<target> src/backend
#
# Usable targets:
#   development  — full source, dev dependencies, nodemon hot reload
#   test         — full source, test dependencies, deterministic test suite
#   migrate      — Prisma CLI + schema/migrations for `prisma migrate deploy`
#   production   — minimal non-root runtime (no dev/test tooling)
#
# Stage graph:
#   base -> dependencies -> prisma-build -> development | test | migrate
#   base -> production-dependencies
#   dependencies -> source
#   base + production-dependencies + prisma-build + source -> production

FROM node:24-alpine AS base

WORKDIR /app

# A dedicated non-root user plus the runtime log directory that the Winston
# file transports write to (src/logs). The directory is excluded from the
# build context, so it is created here and owned by the application user.
RUN addgroup -S app \
    && adduser -S -G app app \
    && mkdir -p /app/src/logs \
    && chown -R app:app /app

USER app


FROM base AS dependencies

USER root
COPY --chown=app:app package.json package-lock.json ./
RUN npm ci
USER app


FROM base AS production-dependencies

USER root
COPY --chown=app:app package.json package-lock.json ./
# `--omit=dev` drops Jest/supertest/nodemon, and `--legacy-peer-deps` stops npm
# from auto-installing `@prisma/client`'s optional `prisma`/`typescript` peers,
# which would otherwise pull the full Prisma CLI and schema engine into the
# runtime image. The CLI and engine remain available in the `migrate` target.
RUN npm ci --omit=dev --legacy-peer-deps
USER app


FROM dependencies AS prisma-build

USER root
COPY --chown=app:app prisma.config.js ./
COPY --chown=app:app src/prisma ./src/prisma
COPY --chown=app:app src/configurations/env.config.js ./src/configurations/env.config.js

# Generate the gitignored Prisma client. The placeholder datasource URL is
# build-time only; `prisma generate` never connects to it and no secret is
# baked into the image.
RUN MIGRATION_DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder' \
    npx prisma generate

USER app


FROM dependencies AS source

COPY --chown=app:app src ./src

# Remove test directories from the source copy used by the production image.
# The `test` and `development` targets copy the full source separately.
RUN find src -type d -name __tests__ -prune -exec rm -rf {} +


FROM prisma-build AS development

ENV NODE_ENV=development
COPY --chown=app:app . .
EXPOSE 7001
CMD ["npm", "run", "start:dev"]


FROM prisma-build AS test

ENV NODE_ENV=testing
COPY --chown=app:app . .
# Test-only, non-secret defaults are supplied at run time rather than baked as
# ENV. Real values may be overridden with `-e JWT_SECRET=...`.
CMD ["sh", "-c", "JWT_SECRET=\"${JWT_SECRET:-test-only-secret}\" DATABASE_URL=\"${DATABASE_URL:-postgresql://test:test@127.0.0.1:5432/test}\" exec npm test"]


FROM prisma-build AS migrate

ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]


FROM base AS production

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=7001

COPY --chown=app:app --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=app:app --from=prisma-build /app/src/generated ./src/generated
COPY --chown=app:app --from=source /app/src ./src
COPY --chown=app:app public ./public
COPY --chown=app:app package.json ./

EXPOSE 7001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT:-7001}/api/v1/health || exit 1

USER app

CMD ["node", "src/server.js"]
