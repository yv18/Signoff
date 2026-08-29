# syntax=docker/dockerfile:1

# --- deps: production node_modules only -------------------------------------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime --------------------------------------------------------------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p uploads \
  && chown -R node:node /app

USER node
EXPOSE 5000

# Renders the social-icon PNGs on first boot if the uploads volume is empty,
# then starts the API.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
