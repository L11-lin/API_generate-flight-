# Cargo Flight Scheduler

This small app generates synthetic cargo flight records and saves them to PostgreSQL.

If you see an error like `database "cargo_flights" does not exist` it means you need to create the database and table before the app can insert rows.

## Quick setup

1. Copy `.env.example` to `.env` and edit with your Postgres credentials:

   - Windows (cmd):
     copy .env.example .env

2. Create the database and table. Connect to Postgres (psql or any client) and run:

```sql
-- create a database (change name to match PGDATABASE in your .env)
CREATE DATABASE cargo_flights_db;

-- connect to that database and create table
\c cargo_flights_db

CREATE TABLE IF NOT EXISTS cargo_flights (
  id SERIAL PRIMARY KEY,
  flight_number TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo_type TEXT,
  cargo_weight NUMERIC,
  timestamp BIGINT,
  readable_date TEXT,
  readable_time TEXT,
  day_of_week TEXT,
  day_of_month INTEGER,
  month TEXT,
  year INTEGER,
  timezone TEXT
);
```

3. Install dependencies and start the app

```cmd
npm install
node index.js
```

4. Test endpoints

- Generate flight (GET for easy testing in browser):
  http://localhost:3000/api/generate-flight

- View last flights:
  http://localhost:3000/api/cargo-flights


## Notes
- If you prefer the database name `cargo_flights` update `PGDATABASE` in `.env` or change the SQL above accordingly.
- If you want to use ESM imports, ensure `package.json` has `"type": "module"` or rename files to `.mjs`.
