import { log } from "util";

import exception from "./exception";
import { getDb } from "./native-db";
import { Msg } from "./ssb-types";
import {
  Host,
  LogEntry,
  Operation,
  TableSchema,
  DbField,
  RowMeta,
  EditMeta,
  DeleteMeta,
  DbRow
} from "./types";
import SqliteDb from "./sqlitedb";
import * as crud from "./crud";

export type NonResultType =
  | "AWAIT_TRANSACTION"
  | "AWAIT_INSERTION"
  | "NO_PERMISSION";

export class NonResult {
  type: NonResultType;
  logEntry: LogEntry<RowMeta>;

  constructor(type: NonResultType, logEntry: LogEntry<RowMeta>) {
    this.type = type;
    this.logEntry = logEntry;
  }
}

export async function onWrite(
  msg: Msg<LogEntry<RowMeta>>,
  db: SqliteDb,
  host: Host
) {
  const logEntry = msg.value.content;
  if (logEntry.type.startsWith(`${db.appName}-`)) {
    const logEntry = msg.value.content;

    return logEntry.__meta.transactionId
      ? new NonResult("AWAIT_TRANSACTION", logEntry)
      : await serializeOpsForRow(logEntry.table, logEntry.primaryKey, db, host);
  }
}

function sortMessages(entries: Msg<LogEntry<RowMeta>>[]) {
  return entries;
}

async function serializeOpsForRow(
  table: string,
  key: string,
  db: SqliteDb,
  host: Host
) {
  const messages = await host.getMessagesByPrimaryKey();
  const sortedMessages = sortMessages(messages);

  return await Promise.all(
    sortedMessages.map(msg => {
      const meta = msg.value.content.__meta;
      
      const handler =
        meta.operation === Operation.Insert
          ? onInsert
          : meta.operation === Operation.Update
            ? onUpdate
            : meta.operation === Operation.Del
              ? onDel
              : exception(`Unknown operation ${meta.operation}`);

      return handler(msg, db, host);
    })
  );
}

function getFieldsFromRow(logEntry: LogEntry<EditMeta>): DbField[] {
  return Object.keys(logEntry)
    .filter(k => !["type", "__meta"].includes(k))
    .map(k => ({ field: k, value: logEntry[k] }));
}

function parsePrimaryKeyForInsertion<T>(
  msg: Msg<LogEntry<EditMeta>>
): [string, string] {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;
  const [rowId, feedId] = logEntry.primaryKey.split("_");

  return feedId === msg.value.author
    ? [rowId, feedId]
    : exception(
        `The record ${table}:${rowId} was not authored by ${msg.value.author}.`
      );
}

function getPermissionsField(logEntry: LogEntry<EditMeta>) {
  /*
    Permissions are going to look like feedId1:*;feedId2:field1,field2;feedId3:*;...
    @hxGxqPrplLjRG2vtjQL87abX4QKqeLgCwQpS730nNwE=.ed25519;
    @jlaasdewqLjjflkdjfddfkljsdflksjdflfjfjjfk3al=.ed25519:field1,field2
  */
  return logEntry.__meta.permissions.map(
    p => `${p.feedId}:${!p.fields ? "*" : p.fields.join(",")}`
  );
}

async function onInsert(
  msg: Msg<LogEntry<EditMeta>>,
  db: SqliteDb,
  host: Host
) {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;

  return logEntry.__meta.transactionId
    ? new NonResult("AWAIT_TRANSACTION", logEntry)
    : await serializeOpsForRow(msg, db, host);
}

async function onUpdate(
  msg: Msg<LogEntry<EditMeta>>,
  db: SqliteDb,
  host: Host
) {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;

  return logEntry.__meta.transactionId
    ? new NonResult("AWAIT_TRANSACTION", logEntry)
    : await serializeOpsForRow(msg, db, host);
}

async function onDel(msg: Msg<LogEntry<DeleteMeta>>, db: SqliteDb, host: Host) {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;

  return logEntry.__meta.transactionId
    ? new NonResult("AWAIT_TRANSACTION", logEntry)
    : await serializeOpsForRow(msg, db, host);
}

async function doInsert() {
  const [rowId, feedId] = parsePrimaryKeyForInsertion(msg);
  const sqlite = await getDb(db.appName);
  const permissionsField = {
    field: "permissions",
    value: getPermissionsField(logEntry)
  };
  const fields = getFieldsFromRow(logEntry).concat([permissionsField]);
  const result = await crud.insert(table, fields, db, host);
}

async function doUpdate() {
  // We have to check if the record exists.
  // If it doesn't, we'll wait until it appears. If ever.
  const itemResult = await crud.getByPrimaryKey(
    table,
    logEntry.primaryKey,
    db,
    host
  );
  if (!itemResult.length) {
    return new NonResult("AWAIT_INSERTION", logEntry);
  } else {
    const row = itemResult.rows[0];

    // Gotta check if the author has permissions.
    const permissionsString = getFieldValue(row, "permissions") as string;
    const permissions = getPermissionsFromString(permissionsString);
    const fieldsInUpdate = getFieldsFromLogEntry(logEntry);

    // See if the author has write permissions into all fields in the update,
    // Or if the author has write permissions into "*"
    const hasPermission =
      msg.value.author === db.feedId ||
      permissions.some(
        p =>
          p.feedId === msg.value.author &&
          (p.fields.includes("*") ||
            fieldsInUpdate.every(f => p.fields.includes(f)))
      );

    return hasPermission
      ? await crud.update()
      : new NonResult("NO_PERMISSION", logEntry);
  }
}

async function doDel() {
  // We have to check if the record exists.
  // If it doesn't, we'll wait until it appears. If ever.
  const itemResult = await crud.getByPrimaryKey(
    table,
    logEntry.primaryKey,
    db,
    host
  );

  if (!itemResult.length) {
    return new NonResult("AWAIT_INSERTION", logEntry);
  } else {
    const row = itemResult.rows[0];

    // Gotta check if the author has permissions.
    const permissionsString = getFieldValue(row, "permissions") as string;
    const permissions = getPermissionsFromString(permissionsString);
    const fieldsInUpdate = getFieldsFromLogEntry(logEntry);

    // The author needs * permissions to delete a row
    const hasPermission =
      msg.value.author === db.feedId ||
      permissions.some(
        p => p.feedId === msg.value.author && p.fields.includes("*")
      );

    return hasPermission
      ? await crud.del()
      : new NonResult("NO_PERMISSION", logEntry);
  }
}

function getPermissionsFromString(strPerms?: string) {
  return strPerms
    ? strPerms.split(";").map(f => {
        const [feedId, strFields] = f.split(":");
        return {
          feedId,
          fields: strFields.split(",")
        };
      })
    : [];
}

function getFieldsFromLogEntry(logEntry: LogEntry<any>) {
  return Object.keys(logEntry).filter(k =>
    ["primaryKey", "type", "__meta"].includes(k)
  );
}

function getFieldValue(row: DbRow, fieldName: string) {
  const field = row.fields.find(f => f.field === fieldName);
  return field ? field.value : undefined;
}

async function onTransactionComplete() {}
