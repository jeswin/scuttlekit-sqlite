import * as fs from "fs";
import * as path from "path";
import exception from "./exception";
import * as hostEvents from "./host/events";
import { getDb } from "./sqlite/db-cache";
import * as setup from "./sqlite/setup";
import SqliteDb from "./sqlite/SqliteDb";
import {
  IAppSettings,
  IDatabaseSchema,
  IHost,
  ILogEntry,
  IRowMeta
} from "./types/basic";
import { Msg } from "./types/ssb-types";

const rootDir = "";

export interface ISystemSettings {
  [key: string]: string;
}

/*
  Get information from existing database, if it exists. 
  This gets called prior to register, to notify the user whether the database already exists.
*/
export async function getSystemSettings(
  appName: string,
  host: IHost
): Promise<ISystemSettings | void> {
  if (fs.existsSync(path.join(host.getDataDirectory(), appName))) {
    const sqlite = await getDb(appName);
    const statement = sqlite.prepare(
      "SELECT key, value FROM scuttlekit_settings"
    );
    const rows: { key: string; value: string }[] = statement.all();
    return rows.reduce(
      (acc, { key, value }) => {
        return (acc[key] = value), acc;
      },
      {} as ISystemSettings
    );
  } else {
    return undefined;
  }
}

/*
  Called when a new app registers with ScuttleKit. 
  This creates the database. If the database already exists, it is overwritten.
*/
export async function register(
  appSettings: IAppSettings,
  schema: IDatabaseSchema,
  host: IHost
): Promise<SqliteDb> {
  const db = await createDatabase(appSettings, schema, host);
  return db;
}

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
  const db = new SqliteDb(appSettings.name, sqlite, schema);

  for (const tableName of Object.keys(schema.tables)) {
    const table = schema.tables[tableName];
    await setup.createTable(table, db);
  }

  await setup.createSystemTable(db);
  return db;
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

/*
  Load an existing Database. Throw an error if the database wasn't initialized previously.
*/
async function load(appSettings: IAppSettings, host: IHost) {
  const sqlite = await getDb(appSettings.name);

  const loadSettingsQuery = sqlite.prepare(
    "SELECT value FROM scuttlekit_settings WHERE key = 'settings'"
  );

  const result = loadSettingsQuery.run(loadSettingsQuery);
  const db = new SqliteDb(appSettings.name, sqlite, settings);

  // Register to listen to writes on the host.
  host.onWrite((record: object) => hostEvents.onWrite(record, db, host));

  return db;
}
