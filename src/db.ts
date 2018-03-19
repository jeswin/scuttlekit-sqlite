import Database = require("better-sqlite3");
import * as instances from "./instances";
import { DatabaseSchema, Host } from "./types";

export class SqliteDb {
  appName: string;
  token: string;

  constructor(appName: string, token: string) {
    this.appName = appName;
    this.token = token;
  }

  async insert(row: object, db: string, host: Host) {}

  async update(host: Host) {}

  async del(host: Host) {}

  async query(host: Host) {}

  /*
    ScuttleKit transactions are a little different from a regular database transaction.
    It simply means that the writes cannot be read until a completeTransaction() call is written to the log.
    If completeTransaction() was never called, or if discardTransaction() is called, those writes will never be seen.
  */
  async createTransaction(transactionId: string, host: Host) {}

  async completeTransaction(transactionId: string, host: Host) {}

  async discardTransaction(transactionId: string, host: Host) {}
}

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
