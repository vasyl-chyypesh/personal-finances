import 'dotenv/config';
import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH || 'finance.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
