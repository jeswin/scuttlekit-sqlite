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
  DeleteMeta
} from "./types";
import SqliteDb from "./sqlitedb";
import * as crud from "./crud";

export type NonResultType =
  | "AWAIT_TRANSACTION"
  | "AWAIT_INSERTION"
  | "NO_PERMISSIONS";

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
    const meta = logEntry.__meta;

    const handler =
      meta.operation === Operation.Insert
        ? onInsert
        : meta.operation === Operation.Update
          ? onUpdate
          : meta.operation === Operation.Del
            ? onDel
            : exception(`Unknown operation ${meta.operation}`);

    return await handler(msg, db, host);
  }
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

async function onInsert(msg: Msg<LogEntry<EditMeta>>, db: SqliteDb, host: Host) {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;

  if (logEntry.__meta.transactionId) {
    return new NonResult("AWAIT_TRANSACTION", logEntry);
  } else {
    const [rowId, feedId] = parsePrimaryKeyForInsertion(msg);
    const sqlite = await getDb(db.appName);
    const permissionsField = {
      field: "permissions",
      value: getPermissionsField(logEntry)
    };
    const fields = getFieldsFromRow(logEntry).concat([permissionsField]);
    const result = await crud.insert(table, fields, db, host);
  }
}

async function onUpdate(msg: Msg<LogEntry<EditMeta>>, db: SqliteDb, host: Host) {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;

  if (logEntry.__meta.transactionId) {
    return new NonResult("AWAIT_TRANSACTION", logEntry);
  } else {
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
      // Gotta check if the author has permissions.
      const existingRow = itemResult.rows[0];
      const permissionsField = existingRow.fields.find(
        f => f.field === "permissions"
      );
      const permissions = (permissionsField &&
        permissionsField.value) as string;
      const hasPermission = permissions.split(",").some(p => {
        const [feedId, access] = p.split(":");
        return feedId === msg.value.author && access === "WRITE";
        //if (permissions.value === )
      });
    }
  }
}

async function onDel(msg: Msg<LogEntry<DeleteMeta>>, db: SqliteDb, host: Host) {
  const logEntry = msg.value.content;

  if (logEntry.__meta.transactionId) {
    return new NonResult(logEntry);
  } else {
    const [rowId, feedId] = getPrimaryKey(msg);
    const sqlite = await getDb(db.appName);
    const permissionsField = {
      field: "permissions",
      value: getPermissionsField(logEntry)
    };
    const fields = getFieldsFromRow(logEntry).concat([permissionsField]);
    const fieldNames = fields.map(f => f.field).join(", ");
    const values = fields.map(f => f.value);
    const questionMarks = values.map(_ => "?").join(", ");
    const insert = sqlite.prepare(
      `INSERT INTO ${fieldNames} VALUES (${questionMarks})`
    );
    return insert.run(values);
  }
}

async function onTransactionComplete() {}
