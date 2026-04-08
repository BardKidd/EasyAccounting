FROM node:24.14.1-slim AS deps

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/ ./packages/typescript-config/

RUN pnpm install --frozen-lockfile --filter backend...

FROM node:24.14.1-slim AS runner

ENV TZ=Asia/Taipei
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY apps/backend/ ./apps/backend/
COPY packages/shared/ ./packages/shared/
COPY packages/typescript-config/ ./packages/typescript-config/

COPY pnpm-workspace.yaml package.json ./

WORKDIR /app/apps/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/deploy-health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["npx", "tsx", "./src/app.ts"]