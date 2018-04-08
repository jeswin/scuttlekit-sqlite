import * as hostEvents from "./host/events";
import { getDb } from "./sqlite/native-db";
import SqliteDb from "./sqlite/SqliteDb";
import { IAppSettings, IDatabaseSchema, IHost } from "./types/basic";

/*
    Create all the tables in db settings. And finally write the settings into the system table.
    The system table is a special table named "scuttlekit_system" which holds key-value pairs.
    The settings are stored with the key "settings".
*/
async function createDatabase(
  appSettings: IAppSettings,
  schema: IDatabaseSchema,
  host: IHost
) {
  const sqlite = await getDb(appSettings.name);

  for (const tableName of Object.keys(schema.tables)) {
    const table = schema.tables[tableName];
    await ddl.createTable(table, sqlite);
  }

  await ddl.createSystemTable({ schema }, sqlite);

  const db = new SqliteDb(appSettings.name, settings);

  // Register to listen to writes on the host.
  host.onWrite((record: object) => hostEvents.onWrite(record, db, host));

  return db;
}

/*
  Load an existing Database. Throw an error if the database wasn't initialized previously.
*/
async function load(appSettings: IAppSettings, host: IHost) {
  const sqlite = await getDb(appSettings.name);

  const loadSettingsQuery = sqlite.prepare(
    "SELECT value FROM scuttlekit_settings WHERE key = 'settings'"
  );

  const result = loadSettingsQuery.run(loadSettingsQuery);
  const db = new SqliteDb(appSettings.name, settings);

  // Register to listen to writes on the host.
  host.onWrite((record: object) => hostEvents.onWrite(record, db, host));

  return db;
}

/*
  Called when Scuttlekit is initialized. This creates the database.
  If the database already exists when init() is called, an error is thrown.
*/
export async function register(
  appSettings: IAppSettings,
  schema: IDatabaseSchema,
  host: IHost
): Promise<SqliteDb> {
  return await createDatabase(appSettings, schema, host);
}

/*
  Called by ssb-scuttlekit when getService("sqlite") is called.
  This may be called by the client app multiple times; so we initialize the database connection and cache it.
  There may also be multiple client apps speaking to us; so the db connection cache will hold multiple databases.
*/
export async function init(
  appSettings: IAppSettings,
  host: IHost
): Promise<SqliteDb> {
  return await load(appSettings, host);
}
