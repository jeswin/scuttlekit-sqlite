import Database = require("better-sqlite3");
import * as ddl from "./ddl";
import exception from "./exception";
import SqliteDb from "./sqlitedb";
import {
  IDatabaseSchema,
  IDeleteMeta,
  IEditMeta,
  IHost,
  ILogEntry,
  IPermission,
  IRowMeta,
  Operation
} from "./types";

function getTableName(appName: string, table: string) {
  return `${appName}-${table}`;
}

export interface IRowEditOptions {
  permissions: IPermission[];
  transactionId: string;
}

function getFeedIdFromRowId(id: string) {
  return id.split("_")[1];
}

async function insert(
  table: string,
  row: object,
  options: IRowEditOptions,
  db: SqliteDb,
  host: IHost
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
                __meta: {
                  operation: Operation.Insert,
                  permissions: options.permissions,
                  transactionId: options.transactionId
                } as IEditMeta,
                primaryKey,
                table,
                type: getTableName(db.appName, table)
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
  options: IRowEditOptions,
  db: SqliteDb,
  host: IHost
) {
  const tableSchema = db.settings.tables[table];
  const primaryKey: string = (row as any)[tableSchema.primaryKey];

  return primaryKey
    ? await host.write({
        ...row,
        __meta: {
          operation: Operation.Update,
          permissions: options.permissions,
          transactionId: options.transactionId
        } as IEditMeta,
        primaryKey,
        table,
        type: getTableName(db.appName, table)
      })
    : exception(
        `The table ${table} does not contain a row with primary key ${primaryKey}.`
      );
}

export interface IRowDeleteOptions {
  transactionId: string;
}

async function del(
  table: string,
  primaryKey: string,
  options: IRowDeleteOptions,
  db: SqliteDb,
  host: IHost
) {
  const tableSchema = db.settings.tables[table];

  return primaryKey
    ? await host.write({
        __meta: {
          operation: Operation.Del,
          transactionId: options.transactionId
        } as IDeleteMeta,
        primaryKey,
        table,
        type: getTableName(db.appName, table)
      })
    : exception(
        `The table ${table} does not contain a row with primary key ${primaryKey}.`
      );
}

async function query(host: IHost) {}

async function getById(
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: IHost
) {}

/*
  ScuttleKit transactions are a little different from a regular database transaction.
  It simply means that the writes cannot be read until a completeTransaction() call is written to the log.
  If completeTransaction() was never called, or if discardTransaction() is called, those writes will never be seen.
*/
async function createTransaction(transactionId: string, host: IHost) {}

async function completeTransaction(transactionId: string, host: IHost) {}
