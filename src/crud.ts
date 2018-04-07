import Database = require("better-sqlite3");
import exception from "./exception";
import SqliteDb from "./SqliteDb";
import {
  IDatabaseSchema,
  IDeleteMeta,
  IEditMeta,
  IHost,
  ILogEntry,
  IPermission,
  IRowMeta,
  Operation,
  ICommitTransactionMeta
} from "./types";
import { uuidv4 } from "./utils/random";

function getTableName(appName: string, table: string) {
  return `${appName}-${table}`;
}

export interface IRowEditOptions {
  permissions: IPermission[];
  transactionId: string;
}

function defaultPermissions(feedId: string): IPermission[] {
  return [
    {
      feedId,
      fields: ["*"]
    }
  ];
}

async function insert(
  table: string,
  pKey: string,
  row: object,
  options: IRowEditOptions,
  db: SqliteDb,
  host: IHost
) {
  const tableSchema = db.settings.tables[table];
  const [rowId, feedId] = pKey.split("_");

  const authorId = host.getFeedId();
  return feedId === authorId
    ? await host.write({
        ...row,
        __meta: {
          operation: Operation.Insert,
          pKey,
          permissions: options.permissions || defaultPermissions(authorId),
          table,
          transactionId: options.transactionId
        } as IEditMeta,
        type: getTableName(db.appName, table)
      })
    : exception(
        `Invalid feedId. The pKey should be suffixed with the id of the current user.`
      );
}

async function update(
  table: string,
  pKey: string,
  row: object,
  options: IRowEditOptions,
  db: SqliteDb,
  host: IHost
) {
  const tableSchema = db.settings.tables[table];

  return pKey
    ? await host.write({
        ...row,
        __meta: {
          operation: Operation.Update,
          pKey,
          permissions: options.permissions,
          table,
          transactionId: options.transactionId
        } as IEditMeta,
        type: getTableName(db.appName, table)
      })
    : exception(
        `The table ${table} does not contain a row with primary key ${pKey}.`
      );
}

export interface IRowDeleteOptions {
  transactionId: string;
}

async function del(
  table: string,
  pKey: string,
  options: IRowDeleteOptions,
  db: SqliteDb,
  host: IHost
) {
  const tableSchema = db.settings.tables[table];

  return pKey
    ? await host.write({
        __meta: {
          operation: Operation.Del,
          pKey,
          table,
          transactionId: options.transactionId
        } as IDeleteMeta,
        type: getTableName(db.appName, table)
      })
    : exception(
        `The table ${table} does not contain a row with primary key ${pKey}.`
      );
}

/*
  ScuttleKit transactions are a little different from a regular database transaction.
  It simply means that the writes cannot be read until a completeTransaction() call is written to the log.
  If completeTransaction() was never called, or if discardTransaction() is called, those writes will never be seen.
*/
function createTransaction() {
  return uuidv4();
}

async function completeTransaction(
  transactionId: string,
  db: SqliteDb,
  host: IHost
) {
  return await host.write({
    __meta: {
      operation: Operation.CommitTransaction,
      transactionId
    } as ICommitTransactionMeta,
    type: db.appName
  });
}

async function query(query: string, db: SqliteDb, host: IHost) {}
