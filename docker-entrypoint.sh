#!/bin/sh

set -e

# Check if DATABASE_URL is set, if not, start embedded PostgreSQL
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Starting embedded PostgreSQL..."

  # Auto-generate DATABASE_URL for embedded PostgreSQL
  export DATABASE_URL="postgresql://feedflow:feedflow@localhost:5432/feedflow?schema=public"
  echo "Auto-generated DATABASE_URL: ${DATABASE_URL}"

  # Create necessary directories for PostgreSQL
  mkdir -p /run/postgresql
  chown postgres:postgres /run/postgresql

  # Initialize PostgreSQL if not already done
  if [ ! -d "/var/lib/postgresql/data/base" ]; then
    echo "Initializing PostgreSQL database..."
    su-exec postgres initdb -D /var/lib/postgresql/data

    # Configure PostgreSQL
    echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
    echo "listen_addresses='*'" >> /var/lib/postgresql/data/postgresql.conf

    # Start PostgreSQL temporarily to create database and user
    su-exec postgres pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile -w start

    # Create database and user
    su-exec postgres psql -v ON_ERROR_STOP=1 <<-EOSQL
      CREATE USER feedflow WITH PASSWORD 'feedflow';
      CREATE DATABASE feedflow OWNER feedflow;
      GRANT ALL PRIVILEGES ON DATABASE feedflow TO feedflow;
EOSQL

    su-exec postgres pg_ctl -D /var/lib/postgresql/data -w stop
  fi

  echo "Starting PostgreSQL..."
  su-exec postgres pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile -w start

  echo "Waiting for PostgreSQL to be ready..."
  # Try different methods to check if PostgreSQL is ready
  while ! nc -z localhost 5432; do
    sleep 1
  done

  echo "PostgreSQL is ready."
else
  echo "Using external DATABASE_URL: ${DATABASE_URL}"

  # Wait for external database if DATABASE_URL contains host
  # Extract host from DATABASE_URL
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')

  if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    echo "Waiting for external database at ${DB_HOST}..."
    while ! nc -z "$DB_HOST" 5432; do
      sleep 1
    done
    echo "External database is ready."
  fi
fi

echo "Running migrations..."
su-exec nextjs npx prisma@6 migrate deploy --schema=/app/prisma/schema.prisma
echo "Migrations completed. Starting application..."

# Switch to nextjs user and run the application
exec su-exec nextjs "$@"