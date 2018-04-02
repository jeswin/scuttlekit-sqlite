import { IHost, IDatabaseSchema } from "./types";
import SqliteDb from "./sqlitedb";
import { getDb } from "./native-db";
import * as ddl from "./ddl";
import * as hostEvents from "./host-events";

/*
    Create all the tables in db settings. And finally write the settings into the system table.
    The system table is a special table named "scuttlekit_system" which holds key-value pairs.
    The settings are stored with the key "settings".
*/
async function createDatabase(
  appName: string,
  settings: IDatabaseSchema,
  host: IHost
) {
  const sqlite = await getDb(appName);

  for (const tableName of Object.keys(settings.tables)) {
    const table = settings.tables[tableName];
    await ddl.createTable(table, sqlite);
  }

  await ddl.createSystemTable({ settings }, sqlite);

  const db = new SqliteDb(appName, settings);

  // Register to listen to writes on the host.
  host.onWrite((record: object) => hostEvents.onWrite(record, db, host));

  return db;
}

/*
  Load an existing Database. Throw an error if the database wasn't initialized previously.
*/
async function load(appName: string, host: IHost) {
  const sqlite = await getDb(appName);

  const loadSettingsQuery = sqlite.prepare(
    "SELECT value FROM scuttlekit_settings WHERE key = 'settings'"
  );

  const result = loadSettingsQuery.run(loadSettingsQuery);
  const db = new SqliteDb(appName, settings);

  // Register to listen to writes on the host.
  host.onWrite((record: object) => hostEvents.onWrite(record, db, host));

  return db;
}

/*
  Called when Scuttlekit is initialized. This creates the database.
  If the database already exists when init() is called, an error is thrown.
*/
export async function register(
  appName: string,
  settings: IDatabaseSchema,
  host: IHost
): Promise<SqliteDb> {
  return await createDatabase(appName, settings, host);
}

/*
  Called by ssb-scuttlekit when getService("sqlite") is called.
  This may be called by the client app multiple times; so we initialize the database connection and cache it.
  There may also be multiple client apps speaking to us; so the db connection cache will hold multiple databases.
*/
export async function init(appName: string, host: IHost): Promise<SqliteDb> {
  return await load(appName, host);
}
