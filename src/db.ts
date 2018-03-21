import Database = require("better-sqlite3");
import * as instances from "./instances";
import { DatabaseSchema, Host } from "./types";

function objectToParameterNames(obj: object, tableSchema: object) {

}

export default class SqliteDb {
  appName: string;

  constructor(appName: string) {
    this.appName = appName;
  }

<<<<<<< HEAD
  async insert(table: string, row: object, db: string, host: Host) {
    const sqlite = await instances.getDbByName(db);
    const statement = sqlite.prepare(`INSERT INTO ${table} VALUES `)
    statement.run(row);
  }

  async update(host: Host) {

  }

  async del(host: Host) {

  }

  async query(host: Host) {

=======
  async insert(table: string, row: object, host: Host) {
    return host.write({
      type: table,
      ...row
    });
  }

  async update(table: string, fields: object, host: Host) {
    return host.write({
      type: table,
      ...fields
    });
  }

  async del(table: string, id: string, host: Host) {
    return host.write({
      type: table,
    })
  }

  async query(host: Host) {
    
>>>>>>> 0e28bbbb7f44bf81f9335f7c57d0cea8e14d6418
  }

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
