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
import { NonResult } from "./host-events";

export async function mergeMessagesIntoRow(
  message: Msg<ILogEntry<IRowMeta>>,
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

  const logEntry = message.value.content;

  function loop(
    row: IDbRow | MergeToDelete | undefined,
    msgs: Msg<ILogEntry<IRowMeta>>[]
  ): MergeResult | undefined {
    if (row instanceof MergeToDelete) {
      return row;
    } else {
      const [current, ...rest] = msgs;
      return rest.length
        ? logEntry.__meta.operation === Operation.Insert
          ? // If row exists or has an invalid key, skip.
            !row ? loop(insert(current, row) || row, rest) : loop(row, rest)
          : logEntry.__meta.operation === Operation.Update
            ? row
              ? loop(update(current, row) || row, rest)
              : // If row does not exist, skip.
                loop(row, rest)
            : logEntry.__meta.operation === Operation.Del
              ? row ? del(current, row) || loop(row, rest) : loop(row, rest)
              : loop(row, rest)
        : row
          ? existingRow ? new MergeToUpdate(row) : new MergeToInsert(row)
          : undefined;
    }
  }

  return loop(existingRow, messages);
}

/*
  Returns undefined if the row already exists.
*/
function insert(
  msg: Msg<ILogEntry<IRowMeta>>,
  row?: IDbRow
): IDbRow | undefined {
  if (!row) {
    const logEntry = msg.value.content;
    const [rowId, feedId] = logEntry.__meta.primaryKey.split("_");
    return feedId === msg.value.author
      ? constructRowFromMessage(
          logEntry as ILogEntry<IEditMeta>,
          msg.value.timestamp
        )
      : undefined;
  } else {
    return undefined;
  }
}

/*
  Returns undefined if row doesn't exist.
*/
function update(
  msg: Msg<ILogEntry<IRowMeta>>,
  row: IDbRow
): IDbRow | undefined {
  const permissions = getPermissionsFromString(row.__permissions);
  if (row) {
    return row;
  } else {
    return undefined;
  }
}

/*
  Returns undefined if row doesn't exist.
*/
function del(
  msg: Msg<ILogEntry<IRowMeta>>,
  row: IDbRow
): MergeToDelete | undefined {
  if (row) {
    return new MergeToDelete(primaryKey);
  } else {
    return undefined;
  }
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

export function getPermissionsFromString(strPerms?: string) {
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
