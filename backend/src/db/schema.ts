/**
 * Database migrations.
 *
 * Each entry is applied in order and the SQLite `user_version` pragma records
 * how many have run, so opening an existing database only applies what is
 * missing. Keeping the schema in code (rather than a loose .sql file) means the
 * compiled `dist/` build carries its own migrations with no extra copy step.
 */
export const MIGRATIONS: readonly string[] = [
  // 1 - users and vehicles
  `
  CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'CUSTOMER')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE vehicles (
    id          TEXT PRIMARY KEY,
    make        TEXT NOT NULL,
    model       TEXT NOT NULL,
    category    TEXT NOT NULL,
    year        INTEGER NOT NULL CHECK (year >= 1900),
    price       REAL NOT NULL CHECK (price >= 0),
    quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Search filters on make/model/category are the hot path for the dashboard.
  CREATE INDEX idx_vehicles_make ON vehicles (make);
  CREATE INDEX idx_vehicles_model ON vehicles (model);
  CREATE INDEX idx_vehicles_category ON vehicles (category);
  CREATE INDEX idx_vehicles_price ON vehicles (price);
  `,

  // 2 - purchase ledger, so stock movements are auditable
  `
  CREATE TABLE purchases (
    id            TEXT PRIMARY KEY,
    vehicle_id    TEXT NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    unit_price    REAL NOT NULL CHECK (unit_price >= 0),
    total_price   REAL NOT NULL CHECK (total_price >= 0),
    purchased_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_purchases_user ON purchases (user_id);
  CREATE INDEX idx_purchases_vehicle ON purchases (vehicle_id);
  `,
];
