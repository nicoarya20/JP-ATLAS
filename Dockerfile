# Simple PM production image (single port).
# Keep in sync with .bun-version (single source of truth; tests/bun-version-sync.test.ts guards it).
ARG BUN_VERSION=1.4.2
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Non-root: the local Postgres mode refuses root. Default is still an external DATABASE_URL;
# local mode inside the container needs the runtime first (`bun run server/binary-entry.ts init`).
RUN mkdir -p /app/data && chown bun:bun /app /app/data
COPY --chown=bun:bun --from=build /app/node_modules ./node_modules
COPY --chown=bun:bun --from=build /app/build ./build
COPY --chown=bun:bun --from=build /app/server ./server
COPY --chown=bun:bun --from=build /app/package.json ./package.json
COPY --chown=bun:bun --from=build /app/CHANGELOG.md ./CHANGELOG.md
USER bun
VOLUME /app/data
EXPOSE 3005
# External Postgres is migrated explicitly, never inside `start` (instances booting together would race).
# With several replicas, run `migrate` once as a one-off job and override CMD with `start` for the rest.
# An empty DATABASE_URL means local mode, where `start` migrates its own cluster, so `migrate` is skipped.
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then bun run server/binary-entry.ts migrate || exit 1; fi; exec bun run server/binary-entry.ts start"]
