# ExpenseTracker mobile — Docker test runner.
#
# Location: src/mobile/docker/Dockerfile
# Build context: src/mobile
#
# Build with:
#   docker build -f src/mobile/docker/Dockerfile --target test \
#     -t expensetracker-mobile:test src/mobile
#
# The mobile automated tests use Node's built-in test runner (`node --test`)
# against pure TypeScript modules and do not require Expo, React Native native
# modules, or any platform build tooling. This image is for test execution
# only, not mobile application deployment or native compilation.

FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

# Deterministic, lockfile-based install. Lifecycle scripts are disabled because
# the tested modules are pure TypeScript and need no postinstall artifacts;
# this also avoids running dependency install scripts as root.
RUN npm ci --ignore-scripts


FROM node:24-alpine AS test

ENV CI=true
WORKDIR /app

RUN addgroup -S app \
    && adduser -S -G app app

COPY --chown=app:app --from=dependencies /app/node_modules ./node_modules
COPY --chown=app:app . .

USER app

CMD ["npm", "test"]
