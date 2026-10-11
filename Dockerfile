# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Variables de build (Railway las pasa como build args porque están declaradas con ARG)
ARG VITE_API_PROXY_TARGET
ENV VITE_API_PROXY_TARGET=$VITE_API_PROXY_TARGET
ENV VITE_API_BASE_URL=/api
RUN pnpm build

# ---- runtime ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
