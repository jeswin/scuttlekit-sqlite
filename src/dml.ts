import Database = require("better-sqlite3");
import * as ddl from "./ddl";
import { DatabaseSchema, Host, LogEntry, Operation, Permission } from "./types";
import SqliteDb from "./sqlitedb";
import exception from "./exception";

function getTableName(appName: string, table: string) {
  return `${appName}-${table}`;
}

export type RowEditOptions = {
  permissions: Permission[];
  transactionId: string;
};

function getFeedIdFromRowId(id: string) {
  return id.split("_")[1];
}

async function insert(
  table: string,
  row: object,
  options: RowEditOptions,
  db: SqliteDb,
  host: Host
) {
  const tableSchema = db.settings.tables[table];
  const primaryKey: string = (row as any)[tableSchema.primaryKey];
  const [rowId, feedId] = primaryKey.split("_");

  return feedId === db.feedId
    ? await (async () => {
        const existingRow = await getById(table, primaryKey, db, host);
        return !existingRow
          ? await (async () => {
              return await host.write({
                ...row,
                primaryKey,
                type: getTableName(db.appName, table),
                __meta: {
                  table,
                  permissions: options.permissions,
                  transactionId: options.transactionId,
                  operation: Operation.Insert
                }
              });
            })
          : exception(
              `The primary key ${primaryKey} already exists on table ${table}.`
            );
      })()
    : exception(
        `Invalid userId. The primaryKey should be suffixed with the id of the current user.`
      );
}

async function update(
  table: string,
  row: object,
  options: RowEditOptions,
  db: SqliteDb,
  host: Host
) {
  const tableSchema = db.settings.tables[table];
  const primaryKey: string = (row as any)[tableSchema.primaryKey];

  return primaryKey
    ? await host.write({
        ...row,
        type: getTableName(db.appName, table),
        primaryKey,
        __meta: {
          table,
          permissions: options.permissions,
          transactionId: options.transactionId,
          operation: Operation.Update
        }
      })
    : exception(
        `The table ${table} does not contain a row with primary key ${primaryKey}.`
      );
}

export type RowDeleteOptions = {
  transactionId: string;
};

async function del(
  table: string,
  primaryKey: string,
  options: RowDeleteOptions,
  db: SqliteDb,
  host: Host
) {
  const tableSchema = db.settings.tables[table];

  return primaryKey
    ? await host.write({
        type: getTableName(db.appName, table),
        primaryKey,
        __meta: {
          table,
          transactionId: options.transactionId,
          operation: Operation.Del
        }
      })
    : exception(
        `The table ${table} does not contain a row with primary key ${primaryKey}.`
      );
}

async function query(host: Host) {}

async function getById(
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: Host
) {}

/*
  ScuttleKit transactions are a little different from a regular database transaction.
  It simply means that the writes cannot be read until a completeTransaction() call is written to the log.
  If completeTransaction() was never called, or if discardTransaction() is called, those writes will never be seen.
*/
async function createTransaction(transactionId: string, host: Host) {}

async function completeTransaction(transactionId: string, host: Host) {}
