# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy prisma schema + package files first so postinstall (prisma generate) works
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy prisma + package files, then install — postinstall needs schema.prisma
COPY package.json package-lock.json tsconfig.json ./
COPY --from=builder /app/prisma ./prisma
RUN npm ci --omit=dev && \
    npm install --no-save ts-node tsconfig-paths dotenv

# Overwrite prisma client with the one generated in builder (has the full client)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
