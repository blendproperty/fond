FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 fond && adduser -S -u 1001 -G fond fond
COPY --from=build --chown=fond:fond /app/.next/standalone ./
COPY --from=build --chown=fond:fond /app/.next/static ./.next/static
COPY --from=build --chown=fond:fond /app/public ./public
RUN mkdir -p /app/data && chown fond:fond /app/data
ENV FOND_DB_PATH=/app/data/fond.sqlite
USER fond
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server.js"]
