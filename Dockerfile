# ---- Build stage ----
FROM node:20-slim AS builder
WORKDIR /app

# Copy only what npm needs to resolve the workspace graph before
# bringing in source, so Docker's layer cache can skip reinstalling
# dependencies when only application code changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages

RUN npm ci
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The orchestrator resolves @gemstones-ai/shared, @gemstones-ai/ephemeris-mcp,
# etc. via the npm-workspaces symlinks under node_modules, so the runtime
# image needs the same directory shape as the build — not just the
# orchestrator's own dist/ output. This is a straightforward, correct
# copy rather than a minimal one; trimming devDependencies out of
# node_modules (typescript, ts-node, @types/*) is a reasonable later
# optimization but isn't required for Phase 1 to run correctly.
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Cloud Run sets PORT itself and expects the container to listen on it;
# packages/orchestrator/src/index.ts already reads process.env.PORT.
EXPOSE 8080

CMD ["node", "packages/orchestrator/dist/index.js"]
