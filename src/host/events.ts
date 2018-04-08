import exception from "./exception";
import { getDb } from "./native-db";
import * as sql from "./sql";
import SqliteDb from "./SqliteDb";
import { mergeMessagesIntoRow, MergeToDelete, MergeToUpdate } from "./ssb-log";
import { Msg } from "./ssb-types";
import {
  IDbRow,
  IDeleteMeta,
  IEditMeta,
  IHost,
  ILogEntry,
  IRowMeta,
  ITableSchema,
  Operation
} from "./types";

export type NonResultType =
  | "AWAIT_TRANSACTION_COMMIT"
  | "AWAIT_INSERTION"
  | "NO_PERMISSION"
  | "ROW_EXISTS";

export class NonResult {
  type: NonResultType;
  logEntry: ILogEntry<IRowMeta>;

  constructor(type: NonResultType, logEntry: ILogEntry<IRowMeta>) {
    this.type = type;
    this.logEntry = logEntry;
  }
}

export async function onWrite(
  msg: Msg<ILogEntry<IRowMeta>>,
  db: SqliteDb,
  host: IHost
) {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;

  const mergeResult = logEntry.type.startsWith(`${db.appName}-`)
    ? logEntry.__meta.transactionId
      ? new NonResult("AWAIT_TRANSACTION_COMMIT", logEntry)
      : await mergeMessagesIntoRow(
          msg,
          logEntry.__meta.table,
          logEntry.__meta.pKey,
          db,
          host
        )
    : undefined;

  return mergeResult
    ? mergeResult instanceof NonResult
      ? mergeResult
      : mergeResult instanceof MergeToDelete
        ? sql.del(table, mergeResult.pKey, db)
        : mergeResult instanceof MergeToUpdate
          ? sql.update(table, mergeResult.row, db)
          : sql.insert(table, mergeResult.row, db)
    : undefined;
}
