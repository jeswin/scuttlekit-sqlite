import Database = require("better-sqlite3");
import * as fs from "fs";
import * as path from "path";
import * as R from "ramda";
import ClientAPI from "./ClientAPI";
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

const rootDir = __dirname;

export interface ISystemSettings {
  [key: string]: string;
}

export interface IOptions {
  schema: IDatabaseSchema;
}

/*
    Create all the tables in db settings. And finally write the settings into the system table.
    The system table is a special table named "scuttlekit_system" which holds key-value pairs.
    The settings are stored with the key "settings".
*/
export async function create(
  appSettings: IAppSettings,
  options: IOptions,
  host: IHost
) {
  const schema = options.schema;
  const allTables = Object.keys(schema.tables);

  // Validate the identifier. alphabets, numbers, hashes, underscores only
  const regexp = /^[a-zA-Z0-9-_]+$/;

  if (regexp.test(appSettings.identifier)) {
    // This is the list of all message types which belong to our app
    const allTypes = getTypesForSchema(appSettings.identifier, allTables);

    // Gotta make sure there are types in appsettings corresponding to all tables.
    const typesInAppSettings = Object.keys(appSettings.types).filter(
      k => appSettings.types[k] === "write"
    );

    const missing = R.difference(allTypes, typesInAppSettings);

    if (!missing.length) {
      const sqlite = await getDb(path.join(rootDir, appSettings.identifier));
      const db = new SqliteDb(appSettings.name, sqlite, schema);

      for (const tableName of allTables) {
        const table = schema.tables[tableName];
        await setup.createTable(table, db);
      }
      await setup.createSystemTable(db);
      return db;
    } else {
      return exception(
        `MISSING_TYPES: App needs write permissions to message types ${missing.join(
          ", "
        )}.`
      );
    }
  } else {
    return exception(
      `INVALID_APP_IDENTIFIER: App identifier should be alphanumeric with optional hyphens or underscores.`
    );
  }
}

function getTypesForSchema(appIdentifier: string, tables: string[]) {
  // This is the list of all message types which belong to our app
  return [appIdentifier].concat(tables.map(t => `${appIdentifier}-${t}`));
}

/*
  This deletes the database.
*/
export async function remove(appName: string, host: IHost) {
  return;
}

/*
  Get information from existing database, if it exists. 
  This gets called prior to register, to notify the user whether the database already exists.
*/
export async function getSystemSettings(
  sqlite: Database,
  host: IHost
): Promise<ISystemSettings> {
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
}

/*
  Called by ssb-scuttlekit when getService("sqlite") is called.
  This may be called by the client app multiple times; so we initialize the database connection and cache it.
  There may also be multiple client apps speaking to us; so the db connection cache will hold multiple databases.
*/
async function load(appSettings: IAppSettings, host: IHost) {
  const sqlite = await getDb(appSettings.name);
  const settings = await getSystemSettings(sqlite, host);

  const schema = JSON.parse(settings.schema) as IDatabaseSchema;

  const allTables = Object.keys(schema.tables);
  // This is the list of all message types which belong to our app
  const allTypes = getTypesForSchema(appSettings.identifier, allTables);

  const db = new SqliteDb(appSettings.name, sqlite, schema);

  if (!settings.initialized) {
    await host.replayMessages(hostEvents.replayMessages(db, host));
  }

  // Register to listen to writes on the host.s
  host.onWrite(hostEvents.onWrite(db, host));

  return new ClientAPI(db, host);
}
