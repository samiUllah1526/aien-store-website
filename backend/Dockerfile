# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy prisma schema BEFORE npm ci so postinstall (prisma generate) works
COPY --from=builder /app/prisma ./prisma
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --omit=dev && \
    npm install --no-save ts-node tsconfig-paths dotenv

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
