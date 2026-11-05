#!/bin/sh
set -e

# Wait for PostgreSQL
echo "Waiting for PostgreSQL to be ready..."
python << 'EOF'
import os
import sys
import time
import psycopg

host = os.environ.get('POSTGRES_HOST', 'localhost')
port = os.environ.get('POSTGRES_PORT', '5432')
dbname = os.environ.get('POSTGRES_DB', 'txg-event')
user = os.environ.get('POSTGRES_USER', 'postgres')
password = os.environ.get('POSTGRES_PASSWORD', 'postgres')

max_retries = 30
for attempt in range(max_retries):
    try:
        conn = psycopg.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password,
            connect_timeout=3,
        )
        conn.close()
        print("PostgreSQL is ready!")
        sys.exit(0)
    except Exception as exc:
        print(f"Waiting for database... (attempt {attempt + 1}/{max_retries}): {exc}")
        time.sleep(1)

print("Could not connect to PostgreSQL within timeout.")
sys.exit(1)
EOF

# Execute database migrations (only for web backend, skip if worker/beat)
if [ "$1" = "python" ] && [ "$2" = "manage.py" ] && [ "$3" = "runserver" ]; then
    echo "Running database migrations..."
    python manage.py migrate --noinput
elif [ "$1" = "gunicorn" ]; then
    echo "Running database migrations..."
    python manage.py migrate --noinput
    echo "Collecting static files..."
    python manage.py collectstatic --noinput || true
fi

echo "Starting service: $@"
exec "$@"

