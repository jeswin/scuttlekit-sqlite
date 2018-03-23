import { Host, DatabaseSchema } from "./types";
import * as db from "./db";

/*
  Called when Scuttlekit is initialized. This creates the database.
  If the database already exists when init() is called, an error is thrown.
*/
export async function register(appName: string, settings: DatabaseSchema, host: Host) : Promise<db.SqliteDb> {
  return await db.createDatabase(appName, settings, host);
}

/*
  getService is made by ssb-scuttlekit when getService("sqlite") is called.
  This may be called by the client app multiple times; so we initialize the database connection and cache it.
  There may also be multiple client apps speaking to us; so the db connection cache will hold multiple databases.
*/
export async function init(appName: string, host: Host) : Promise<db.SqliteDb> {
  return await db.load(appName, host);
}