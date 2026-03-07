FROM node:20.19-slim AS base

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN groupadd -r scanner && useradd -r -g scanner -s /bin/false scanner

WORKDIR /app

# ── Build stage ──
FROM base AS builder

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/scanners/screenreader/package.json packages/scanners/screenreader/

RUN npm ci --workspace=packages/shared --workspace=packages/scanners/screenreader --ignore-scripts

COPY packages/shared/ packages/shared/
COPY packages/scanners/screenreader/ packages/scanners/screenreader/
COPY tsconfig.json ./

RUN npm run build --workspace=packages/shared && \
    npm run build --workspace=packages/scanners/screenreader

# ── Production stage ──
FROM base AS production

COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/
COPY --from=builder /app/packages/scanners/screenreader/dist /app/packages/scanners/screenreader/dist
COPY --from=builder /app/packages/scanners/screenreader/package.json /app/packages/scanners/screenreader/
COPY --from=builder /app/package.json /app/package-lock.json /app/

RUN npm ci --workspace=packages/scanners/screenreader --omit=dev --ignore-scripts

RUN mkdir -p /tmp/scanner && chown scanner:scanner /tmp/scanner

USER scanner

ENV NODE_ENV=production
ENV TMPDIR=/tmp/scanner

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "packages/scanners/screenreader/dist/worker.js"]
