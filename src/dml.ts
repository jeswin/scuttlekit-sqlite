import Database = require("better-sqlite3");
import * as ddl from "./ddl";
import { getDb } from "./native-db";
import { DatabaseSchema, Host, LogEntry } from "./types";
import SqliteDb from "./sqlitedb";

function randomId() {
  const length = 31;
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return "n" + result;
}

function getTableName(appName: string, table: string) {
  return `${appName}-${table}`;
}

async function insert(table: string, row: object, db: SqliteDb, host: Host) {
  const nativeDb = await getDb(db.appName);
  await host.write({
    type: getTableName(db.appName, table),
    value: {
      content: {
        ...row,
        id: randomId()
      }
    }
  });
  const statement = nativeDb.prepare(`INSERT INTO ${table} VALUES `);
  const result = statement.run(row);
  return result as any;
}

/*  

*/
async function update(host: Host) {}

async function del(host: Host) {}

async function query(host: Host) {}

async function onWrite(record: LogEntry, db: SqliteDb, host: Host) {
  if (record.type.startsWith(`${db.appName}-`)) {
  }
}

/*
  ScuttleKit transactions are a little different from a regular database transaction.
  It simply means that the writes cannot be read until a completeTransaction() call is written to the log.
  If completeTransaction() was never called, or if discardTransaction() is called, those writes will never be seen.
*/
async function createTransaction(transactionId: string, host: Host) {}

async function completeTransaction(transactionId: string, host: Host) {}
