const pool = require('./pool')

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agencies (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type_code   TEXT DEFAULT '',
      subtype_code TEXT DEFAULT '',
      region      TEXT DEFAULT '',
      province    TEXT DEFAULT '',
      district    TEXT DEFAULT '',
      subdistrict TEXT DEFAULT '',
      cases       INTEGER DEFAULT 0,
      logo        TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      email    TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'user',
      status   TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS cases (
      id                  TEXT PRIMARY KEY,
      agency_id           TEXT,
      title               TEXT DEFAULT '',
      agency              TEXT DEFAULT '',
      category            TEXT DEFAULT '',
      sub_category        TEXT DEFAULT '',
      procurement_method  TEXT DEFAULT '',
      status              TEXT DEFAULT '',
      date                TEXT DEFAULT '',
      budget              TEXT DEFAULT '',
      source              TEXT DEFAULT '',
      last_updated        TEXT DEFAULT '',
      visibility          TEXT DEFAULT 'Internal',
      restricted_notes    TEXT DEFAULT '',
      description         TEXT DEFAULT '',
      agency_type         TEXT DEFAULT '',
      agency_role         TEXT DEFAULT '',
      region              TEXT DEFAULT '',
      province            TEXT DEFAULT '',
      district            TEXT DEFAULT '',
      sub_district        TEXT DEFAULT '',
      related_person1     TEXT DEFAULT '',
      related_person2     TEXT DEFAULT '',
      pending_delete      JSONB,
      related_agencies    JSONB DEFAULT '[]',
      documents           JSONB DEFAULT '[]',
      activity_log        JSONB DEFAULT '[]',
      timeline            JSONB DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS logs (
      id          SERIAL PRIMARY KEY,
      date        TEXT DEFAULT '',
      name        TEXT DEFAULT '',
      role        TEXT DEFAULT '',
      action      TEXT DEFAULT '',
      entity_type TEXT DEFAULT '',
      entity_id   TEXT DEFAULT '',
      entity_name TEXT DEFAULT ''
    );
  `)
  console.log('[DB] Migration complete')
}

module.exports = migrate
