import { log } from "util";

import * as crud from "./crud";
import exception from "./exception";
import { getDb } from "./native-db";
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
  return logEntry.type.startsWith(`${db.appName}-`)
    ? logEntry.__meta.transactionId
      ? new NonResult("AWAIT_TRANSACTION_COMMIT", logEntry)
      : await mergeMessagesIntoRow(
          msg,
          logEntry.__meta.table,
          logEntry.__meta.primaryKey,
          db,
          host
        )
    : undefined;
}

function sortMessages(entries: Msg<ILogEntry<IRowMeta>>[]) {
  return entries;
}

interface IMergeResult {
  type: "INSERT" | "UPDATE";
  row: object;
}

function getPermissionsField(logEntry: ILogEntry<IEditMeta>) {
  /*
    Permissions are going to look like feedId1:*;feedId2:field1,field2;feedId3:*;...
    @hxGxqPrplLjRG2vtjQL87abX4QKqeLgCwQpS730nNwE=.ed25519;
    @jlaasdewqLjjflkdjfddfkljsdflksjdflfjfjjfk3al=.ed25519:field1,field2
  */
  return logEntry.__meta.permissions.map(
    p => `${p.feedId}:${!p.fields ? "*" : p.fields.join(",")}`
  );
}

function constructRowFromMessage(
  msg: Msg<ILogEntry<IRowMeta>>,
  timestamp: number
): IDbRow {
  const logEntry = msg.value.content as ILogEntry<IEditMeta>;
  const result: any = {};
  for (const key of Object.keys(logEntry)) {
    if (key !== "__meta" && key !== "type") {
      result[key] = logEntry[key];
    }
  }
  result.__deleted = false;
  result.__permissions = getPermissionsField(logEntry);
  result.__timestamp = timestamp;
  return result;
}

function updateRowFromMessage(
  row: IDbRow,
  msg: Msg<ILogEntry<IRowMeta>>,
  timestamp: number,
  isCurrentUser: boolean
) {
  const logEntry = msg.value.content as ILogEntry<IEditMeta>;
  const permissions = getPermissionsFromString(row.__permissions);
  const userPermissions = permissions.find(p => p.feedId === msg.value.author);

  for (const key of Object.keys(logEntry)) {
    if (key !== "__meta" && key !== "type") {
      // Check if we have permissions to update
      if (
        isCurrentUser ||
        (userPermissions &&
          ["*", key].some(f => userPermissions.fields.includes(f)))
      ) {
        row[key] = logEntry[key];
      }
    }
  }

  // Updating permissions; you gotta be the owner.
  if (logEntry.__meta.permissions.length) {
    if (
      isCurrentUser ||
      (userPermissions && userPermissions.fields.includes("*"))
    ) {
      row.__permissions = getPermissionsField();
    }
  }
}

async function mergeMessagesIntoRow(
  msg: Msg<ILogEntry<IRowMeta>>,
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: IHost
): Promise<IDbRow | undefined> {
  const messages = await host.getMessagesByPrimaryKey(table, primaryKey);
  const sortedMessages = sortMessages(messages);

  const rowsForKey = await crud.getByPrimaryKey(table, primaryKey, db, host);

  let row = rowsForKey.length > 0 ? rowsForKey.rows[0] : undefined;
  const rowExists = typeof row === "undefined";

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
          msg.value.timestamp
        );
      }
    } else if (logEntry.__meta.operation === Operation.Del) {
      if (row) {
        row.__deleted = true;
        break;
      }
    }
  }

  return row;
}

/*
  Insert a row.
*/
async function mergeMessages(
  msg: Msg<ILogEntry<IRowMeta>>,
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: IHost
) {}

async function updateRow(
  msg: Msg<ILogEntry<IRowMeta>>,
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: IHost
) {}

function getFieldsFromRow(logEntry: ILogEntry<IEditMeta>): IDbField[] {
  return Object.keys(logEntry)
    .filter(k => !["type", "__meta"].includes(k))
    .map(k => ({ field: k, value: logEntry[k] }));
}

function parsePrimaryKeyForInsertion<T>(
  msg: Msg<ILogEntry<IEditMeta>>
): [string, string] {
  const logEntry = msg.value.content;
  const [rowId, feedId] = logEntry.primaryKey.split("_");

  return feedId === msg.value.author
    ? [rowId, feedId]
    : exception(
        `The record ${logEntry.table}:${rowId} was not authored by ${
          msg.value.author
        }.`
      );
}

interface ICrudOptions {
  existingRow: IDbRow;
}

function mergeRowOps() {
  return;
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

function getFieldsFromLogEntry(logEntry: ILogEntry<any>) {
  return Object.keys(logEntry).filter(k =>
    ["primaryKey", "type", "__meta"].includes(k)
  );
}

function getFieldValue(row: IDbRow, fieldName: string) {
  const field = row.fields.find(f => f.field === fieldName);
  return field ? field.value : undefined;
}

async function onTransactionComplete() {}
