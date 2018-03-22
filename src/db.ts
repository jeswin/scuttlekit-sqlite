import Database = require("better-sqlite3");
import * as ddl from "./ddl";
import * as instances from "./instances";
import { DatabaseSchema, Host } from "./types";

function objectToParameterNames(obj: object, tableSchema: object) {}

export class SqliteDb {
  appName: string;
  settings: DatabaseSchema;
  underlying: Database;

  constructor(appName: string, settings: DatabaseSchema, underlying: Database) {
    this.appName = appName;
    this.settings = settings;
    this.underlying = underlying;
  }
}

/*
    Create all the tables in db settings. And finally write the settings into the system table.
    The system table is a special table named "scuttlekit_system" which holds key-value pairs.
    The settings are stored with the key "settings".
  */
export async function createDatabase(
  appName: string,
  settings: DatabaseSchema,
  host: Host
) {
  const underlying = new Database(appName);

  for (const tableName of Object.keys(settings.tables)) {
    const table = settings.tables[tableName];
    await ddl.createTable(table, underlying);
  }

  await ddl.createSystemTable({ settings }, underlying);
  return new SqliteDb(appName, settings, underlying);
}

/*
  Load an existing Database. Throw an error if the database wasn't initialized previously.
*/
export async function load(appName: string, host: Host) {
  const underlying = new Database(appName);
  const loadSettingsQuery = underlying.prepare(
    "SELECT value FROM scuttlekit_settings WHERE key = 'settings'"
  );
  const settings = underlying.run(loadSettingsQuery);
  return new SqliteDb(appName, settings, underlying);
}


async function insert(table: string, row: object, db: string, host: Host) {
  const sqlite = await instances.getDbByName(db);
  const statement = sqlite.prepare(`INSERT INTO ${table} VALUES `);
  statement.run(row);
}

/*  

*/
async function update(host: Host) {}

async function del(host: Host) {}

async function query(host: Host) {}

/*
  ScuttleKit transactions are a little different from a regular database transaction.
  It simply means that the writes cannot be read until a completeTransaction() call is written to the log.
  If completeTransaction() was never called, or if discardTransaction() is called, those writes will never be seen.
*/
async function createTransaction(transactionId: string, host: Host) {}

async function completeTransaction(transactionId: string, host: Host) {}

async function discardTransaction(transactionId: string, host: Host) {}

/*
  This creates a database.
*/
export async function create(
  appName: string,
  token: string,
  schema: DatabaseSchema,
  host: Host
) {
  const db = await instances.getDbByName(appName);
  if (!db) {
    await instances.createDb(appName, token);
  } else {
    throw new Error(`The sqlite database ${appName} already exists.`);
  }
  return new SqliteDb(appName, token);
}

/*
  Recreate the database from the scuttlebutt logs.
  This wipes out the current views/cache.
*/
export async function recreate(
  appName: string,
  token: string,
  schema: DatabaseSchema,
  host: Host
) {}
