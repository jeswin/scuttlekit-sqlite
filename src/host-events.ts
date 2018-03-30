import { log } from "util";

import exception from "./exception";
import { getDb } from "./native-db";
import { Msg } from "./ssb-types";
import { Host, LogEntry, Operation, TableSchema } from "./types";

import SqliteDb from "./sqlitedb";

export class TransactionalStatement {
  logEntry: LogEntry;

  constructor(logEntry: LogEntry) {
    this.logEntry = logEntry;
  }
}

export async function onWrite(msg: Msg<LogEntry>, db: SqliteDb, host: Host) {
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

function getFieldsFromRow(logEntry: LogEntry) {
  return Object.keys(logEntry)
    .filter(k => !["type", "__meta"].includes(k))
    .map(k => ({ field: k, value: logEntry[k] }));
}

function getPrimaryKey<T>(msg: Msg<LogEntry>): [string, string] {
  const logEntry = msg.value.content;
  const table = logEntry.__meta.table;
  const [rowId, feedId] = logEntry.primaryKey.split("_");

  return feedId === msg.value.author
    ? [rowId, feedId]
    : exception(
        `The record ${table}:${rowId} was not authored by ${msg.value.author}.`
      );
}

function getPermissionsField(logEntry: LogEntry) {
  /*
   Permissions are going to look like feedId:permissions
    @hxGxqPrplLjRG2vtjQL87abX4QKqeLgCwQpS730nNwE=.ed25519:read,
    @jlaasdewqLjjflkdjfddfkljsdflksjdflfjfjjfk3al=.ed25519:readwrite
  */
  return logEntry.__meta.permissions
    ? logEntry.__meta.permissions.map(p => `${p.feedId}:${p.access}`).join(",")
    : "";
}

async function onInsert(msg: Msg<LogEntry>, db: SqliteDb, host: Host) {
  const logEntry = msg.value.content;

  if (logEntry.__meta.transactionId) {
    return new TransactionalStatement(logEntry);
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

async function onUpdate(msg: Msg<LogEntry>, db: SqliteDb, host: Host) {
  const logEntry = msg.value.content;

  if (logEntry.__meta.transactionId) {
    return new TransactionalStatement(logEntry);
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

async function onDel(msg: Msg<LogEntry>, db: SqliteDb, host: Host) {
  const logEntry = msg.value.content;

  if (logEntry.__meta.transactionId) {
    return new TransactionalStatement(logEntry);
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

async function onTransactionComplete() {

}
