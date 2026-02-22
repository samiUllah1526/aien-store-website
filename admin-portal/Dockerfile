# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

ARG PUBLIC_API_URL=http://localhost:3000
ARG PUBLIC_ADMIN_APP_NAME=E-Commerce Admin
ARG PUBLIC_MAIN_WEBSITE_URL=

ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_ADMIN_APP_NAME=$PUBLIC_ADMIN_APP_NAME
ENV PUBLIC_MAIN_WEBSITE_URL=$PUBLIC_MAIN_WEBSITE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
