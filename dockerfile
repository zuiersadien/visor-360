# Etapa 1: Dependencies
FROM node:18 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Etapa 2: Build
FROM node:18 AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Etapa 3: Runtime
FROM node:18 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]

