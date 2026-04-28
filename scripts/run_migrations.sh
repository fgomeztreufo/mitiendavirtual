#!/usr/bin/env bash
set -euo pipefail

# Ejecuta migraciones SQL contra la base de datos indicada en $DATABASE_URL o $SUPABASE_DB_URL
SQL_FILE="$(dirname "$0")/../db/001_create_plans_table.sql"

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "Error: debes exportar SUPABASE_DB_URL o DATABASE_URL con la conexión a tu DB (Postgres)."
  echo "Ej: export SUPABASE_DB_URL=\"postgres://user:pass@host:5432/dbname\""
  exit 1
fi

echo "Ejecutando migración: $SQL_FILE"
psql "$DB_URL" -f "$SQL_FILE"
echo "Migración ejecutada correctamente."
