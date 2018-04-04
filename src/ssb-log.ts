import { constructRowFromMessage } from "./db-row";
import * as sql from "./sql";
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

export async function mergeMessagesIntoRow(
  msg: Msg<ILogEntry<IRowMeta>>,
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: IHost
): Promise<MergeResult | undefined> {
  const unorderedMessages = await host.getMessagesByPrimaryKey(
    table,
    primaryKey
  );
  const messages = sortMessages(unorderedMessages);

  const rowsForKey = await sql.getByPrimaryKey(table, primaryKey, db);

  const existingRow = rowsForKey.length > 0 ? rowsForKey.rows[0] : undefined;
  const existsInDb = typeof existingRow === "undefined";

  const logEntry = msg.value.content;

  function loop(row: IDbRow | undefined, msgs: Msg<ILogEntry<IRowMeta>>[]) {
    const [current, ...rest] = msgs;
    return rest.length
      ? logEntry.__meta.operation === Operation.Insert
        ? loop(insert(current, existsInDb), rest)
        : logEntry.__meta.operation === Operation.Update
          ? row && hasUpdatePermissions()
            ? loop(update(current, existsInDb), rest)
            : // If row does not exist or no permissions, treat as an invalid instruction. Skip.
              loop(row, rest)
          : logEntry.__meta.operation === Operation.Del
            ? // Delete if row exists in db and you have delete permissions
              existsInDb && hasDeletePermissions()
              ? new MergeToDelete(primaryKey)
              : // if row not in db and was just created, return empty.
                row
                ? undefined
                : // If row doesn't exist, treat as an invalid instruction. Skip.
                  loop(row, rest)
            : loop(row, rest)
      : row;
  }

  const row = loop(existingRow, messages);

  return row
    ? isDeleted
      ? existsInDb ? new MergeToDelete(primaryKey) : undefined
      : existsInDb ? new MergeToUpdate(row) : new MergeToInsert(row)
    : undefined;
}

function insert(
  msg: Msg<ILogEntry<IRowMeta>>,
  rowExists: boolean
): IDbRow | undefined {
  const logEntry = msg.value.content;
  const [rowId, feedId] = logEntry.__meta.primaryKey.split("_");
  return !rowExists && feedId === msg.value.author
    ? constructRowFromMessage(
        logEntry as ILogEntry<IEditMeta>,
        msg.value.timestamp
      )
    : undefined;
}

function update(msg: Msg<ILogEntry<IRowMeta>>, row: IDbRow): void {
  const logEntry = msg.value.content;
}

function del(msg: Msg<ILogEntry<IRowMeta>>, row: IDbRow): void {
  const logEntry = msg.value.content;
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

function sortMessages(entries: Msg<ILogEntry<IRowMeta>>[]) {
  return entries;
}

function parsePrimaryKey<T>(msg: Msg<ILogEntry<IEditMeta>>): [string, string] {
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
