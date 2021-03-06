import Database = require("better-sqlite3");
import exception from "./exception";
import * as sql from "./sqlite/sql";
import SqliteDb from "./sqlite/SqliteDb";
import {
  ICommitTransactionMeta,
  IDatabaseSchema,
  IDeleteMeta,
  IEditMeta,
  IHost,
  ILogEntry,
  IPermission,
  IRowMeta,
  Operation
} from "./types/basic";
import { uuidv4 } from "./utils/random";
import * as sequences from "./utils/sequences";

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
      fields: ["*"],
      owner: true
    }
  ];
}

export interface IRowDeleteOptions {
  transactionId: string;
}

export default class ClientAPI {
  db: SqliteDb;
  host: IHost;

  constructor(db: SqliteDb, host: IHost) {
    this.db = db;
    this.host = host;
  }

  async insert(
    table: string,
    row: object,
    options: IRowEditOptions,
    db: SqliteDb,
    host: IHost
  ) {
    const feedId = host.getFeedId();
    const tableSchema = db.schema.tables[table];
    const nextId = await sequences.next(table);
    const pKey = `${feedId}_${nextId}`;

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

  async update(
    table: string,
    pKey: string,
    row: object,
    options: IRowEditOptions,
    db: SqliteDb,
    host: IHost
  ) {
    const tableSchema = db.schema.tables[table];

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

  async del(
    table: string,
    pKey: string,
    options: IRowDeleteOptions,
    db: SqliteDb,
    host: IHost
  ) {
    const tableSchema = db.schema.tables[table];

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
  It simply means that the writes are not considered until a completeTransaction() call is written to the log.
  If completeTransaction() was never called, those writes will never be seen.
*/
  createTransaction() {
    return uuidv4();
  }

  async completeTransaction(transactionId: string, db: SqliteDb, host: IHost) {
    return await host.write({
      __meta: {
        operation: Operation.CommitTransaction,
        transactionId
      } as ICommitTransactionMeta,
      type: db.appName
    });
  }

  async query(sqlQuery: string, db: SqliteDb, host: IHost) {
    return await sql.query(sqlQuery, db);
  }
}
