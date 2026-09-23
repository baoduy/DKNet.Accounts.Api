# Build context is the repository root — globals.css resolves Design/tokens/* by relative
# path, and that only exists one level above ui/ (see ui/app/globals.css).

FROM node:22-alpine AS deps
WORKDIR /repo/ui
COPY ui/package.json ui/pnpm-lock.yaml ui/pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@10 --activate \
    && pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /repo
COPY Design ./Design
COPY ui ./ui
COPY --from=deps /repo/ui/node_modules ./ui/node_modules
WORKDIR /repo/ui
RUN corepack enable && corepack prepare pnpm@10 --activate \
    && pnpm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/ui/.next/standalone ./
COPY --from=build /repo/ui/.next/static ./.next/static
USER node
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
