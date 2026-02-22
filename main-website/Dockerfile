# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

ARG PUBLIC_API_URL=http://localhost:3000
ARG PUBLIC_SITE_URL=
ARG PUBLIC_BRAND_NAME=Aien
ARG PUBLIC_HERO_VIDEO_URL=
ARG PUBLIC_HERO_VIDEO_POSTER=
ARG PUBLIC_META_DESCRIPTION=

ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
ENV PUBLIC_BRAND_NAME=$PUBLIC_BRAND_NAME
ENV PUBLIC_HERO_VIDEO_URL=$PUBLIC_HERO_VIDEO_URL
ENV PUBLIC_HERO_VIDEO_POSTER=$PUBLIC_HERO_VIDEO_POSTER
ENV PUBLIC_META_DESCRIPTION=$PUBLIC_META_DESCRIPTION

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
