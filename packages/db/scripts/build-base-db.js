/**
 * Build base.db by applying 001_initial.sql and 002_seed.sql.
 * Output: apps/desktop/src-tauri/resources/base.db
 * Run from repo root: node packages/db/scripts/build-base-db.js
 * Or from packages/db: node scripts/build-base-db.js
 */
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'migrations');
const outPath = path.join(__dirname, '..', '..', '..', 'apps', 'desktop', 'src-tauri', 'resources', 'base.db');

async function main() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const sql001 = fs.readFileSync(path.join(migrationsDir, '001_initial.sql'), 'utf8');
  const sql002 = fs.readFileSync(path.join(migrationsDir, '002_seed.sql'), 'utf8');

  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA foreign_keys=ON;');
  db.exec(sql001);
  db.exec(sql002);

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(outPath, buffer);
  db.close();
  console.log('Written:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
