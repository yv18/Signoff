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

# sharp rasterises SVG <text> through librsvg -> pango -> fontconfig, which
# needs a config file AND real font files. node:20-slim ships neither, hence
# "Fontconfig error: Cannot load default config file" and blank text in the
# GIF. Liberation is metric-compatible with the Arial/Helvetica the templates
# ask for, so the layout maths still line up.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-liberation fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f
ENV FONTCONFIG_PATH=/etc/fonts

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
