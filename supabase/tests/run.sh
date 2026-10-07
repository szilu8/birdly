#!/usr/bin/env bash
# Helyi teszt: friss adatbázis + Supabase-csonkok + migráció + játékszabály tesztek
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${DB:-birdly_test}
dropdb --if-exists "$DB" && createdb "$DB"
cat tests/supabase_stubs.sql migrations/*.sql | psql -v ON_ERROR_STOP=1 -q -d "$DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" < tests/game_rules_test.sql
