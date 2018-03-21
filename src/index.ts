import SqliteDb from "./db";
import { Host } from "./types";

/*
  getService is made by ssb-scuttlekit when getService("sqlite") is called.
  This may be called by the client app multiple times; so we initialize the database connection and cache it.
  There may also be multiple client apps speaking to us; so the db connection cache will hold multiple databases.
*/
export async function getService(appName: string, host: Host) {
  return new SqliteDb(appName)
}
