#!/bin/bash
set -e

echo "📦 Running Prisma migrate..."
npm run blitz prisma migrate deploy || true

echo "📦 Prisma generate..."
npm run blitz prisma generate || true

echo "✔️ Prisma ready."
