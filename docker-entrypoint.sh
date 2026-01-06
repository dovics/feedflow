#!/bin/sh

set -e

echo "Waiting for postgres..."
while ! pg_isready -h postgres -U feedflow; do
  sleep 1
done

echo "PostgreSQL is ready. Running migrations..."

npx prisma migrate deploy

echo "Migrations completed. Starting application..."