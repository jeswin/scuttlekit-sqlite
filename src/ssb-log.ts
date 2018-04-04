import * as crud from "./crud";
import { constructRowFromMessage } from "./dbrow";
import SqliteDb from "./sqlitedb";
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

export function sortMessages(entries: Msg<ILogEntry<IRowMeta>>[]) {
  return entries;
}

export function parsePrimaryKey<T>(
  msg: Msg<ILogEntry<IEditMeta>>
): [string, string] {
  const [rowId, feedId] = msg.value.content.primaryKey.split("_");
  return [rowId, feedId];
}

export function getPermissionsField(logEntry: ILogEntry<IEditMeta>) {
  /*
    Permissions are going to look like feedId1:*;feedId2:field1,field2;feedId3:*;...
    @hxGxqPrplLjRG2vtjQL87abX4QKqeLgCwQpS730nNwE=.ed25519;
    @jlaasdewqLjjflkdjfddfkljsdflksjdflfjfjjfk3al=.ed25519:field1,field2
  */
  return logEntry.__meta.permissions.map(
    p => `${p.feedId}:${!p.fields ? "*" : p.fields.join(",")}`
  );
}

export function getFieldsFromLogEntry(logEntry: ILogEntry<any>) {
  return Object.keys(logEntry).filter(k =>
    ["primaryKey", "type", "__meta"].includes(k)
  );
}

export function getFieldsFromRow(logEntry: ILogEntry<IEditMeta>) {
  return Object.keys(logEntry)
    .filter(k => !["type", "__meta"].includes(k))
    .map(k => ({ field: k, value: logEntry[k] }));
}

export class MergeToDelete {
  primaryKey: string;
  constructor(key: string) {
    this.primaryKey = key;
  }
}

export class MergeToInsert {
  row: IDbRow;

  constructor(row: IDbRow) {
    this.row = row;
  }
}

export class MergeToUpdate {
  row: IDbRow;

  constructor(row: IDbRow) {
    this.row = row;
  }
}

export type MergeResult = MergeToDelete | MergeToUpdate | MergeToInsert;

export async function mergeMessagesIntoRow(
  msg: Msg<ILogEntry<IRowMeta>>,
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: IHost
): Promise<MergeResult | undefined> {
  const messages = await host.getMessagesByPrimaryKey(table, primaryKey);
  const sortedMessages = sortMessages(messages);

  const rowsForKey = await crud.getByPrimaryKey(table, primaryKey, db, host);

  let row = rowsForKey.length > 0 ? rowsForKey.rows[0] : undefined;
  const rowExists = typeof row === "undefined";
  let isDeleted = false;

  const isCurrentUser = msg.value.author === db.feedId;

  for (const message of sortedMessages) {
    const logEntry = message.value.content;
    if (logEntry.__meta.operation === Operation.Insert) {
      if (!rowExists) {
        row = constructRowFromMessage(
          logEntry as ILogEntry<IEditMeta>,
          msg.value.timestamp
        );
      }
    } else if (logEntry.__meta.operation === Operation.Update) {
      if (row) {
        updateRowFromMessage(
          row,
          logEntry as ILogEntry<IEditMeta>,
          msg.value.timestamp,
          isCurrentUser
        );
      }
    } else if (logEntry.__meta.operation === Operation.Del) {
      if (row) {
        isDeleted = true;
        break;
      }
    }
  }

  return row
    ? isDeleted
      ? new MergeToDelete(primaryKey)
      : rowExists ? new MergeToUpdate(row) : new MergeToInsert(row)
    : undefined;
}
