# syntax=docker/dockerfile:1

# ---- Builder: build static site ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools if native modules appear
RUN apk add --no-cache git python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Build static export (Next.js output: 'export' will emit into out/)
RUN npm run build

# ---- Runtime: serve static with nginx ----
FROM nginx:alpine

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
