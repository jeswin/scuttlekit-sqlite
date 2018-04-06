import {
  basicFieldsFromMessage,
  constructRowFromMessage,
  mergeFieldsIntoRow
} from "./db-row";
import { NonResult } from "./host-events";
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

export type MergeFailReasons = "NO_PERMISSION" | "ROW_EXISTS" | "MISSING_ROW";

export class MergeFail {
  type: MergeFailReasons;

  constructor(type: MergeFailReasons) {
    this.type = type;
  }
}

export type MergeResult = MergeToDelete | MergeToUpdate | MergeToInsert;

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

  function validMergeOrPrevious(
    mergeResult: IDbRow | MergeFail,
    previous?: IDbRow
  ) {
    return !(mergeResult instanceof MergeFail) ? mergeResult : previous;
  }

  function loop(
    row: IDbRow | undefined,
    msgs: Msg<ILogEntry<IRowMeta>>[]
  ): any | MergeResult | MergeFail {
    if (row instanceof MergeToDelete) {
      return row;
    } else {
      const [current, ...rest] = msgs;
      return rest.length
        ? logEntry.__meta.operation === Operation.Insert
          ? loop(
              !row
                ? validMergeOrPrevious(
                    insert(row, current as Msg<ILogEntry<IEditMeta>>),
                    row
                  )
                : row,
              rest
            )
          : logEntry.__meta.operation === Operation.Update
            ? loop(
                row
                  ? validMergeOrPrevious(
                      update(row, current as Msg<ILogEntry<IEditMeta>>),
                      row
                    )
                  : row,
                rest
              )
            : logEntry.__meta.operation === Operation.Del
              ? row
                ? (() => {
                    const delResult = del(row, current);
                    return delResult instanceof MergeToDelete
                      ? delResult
                      : loop(row, rest);
                  })()
                : loop(row, rest)
              : loop(row, rest)
        : row
          ? existingRow ? new MergeToUpdate(row) : new MergeToInsert(row)
          : undefined;
    }
  }

  return loop(existingRow, messages);
}

function insert(
  row: IDbRow | undefined,
  msg: Msg<ILogEntry<IEditMeta>>
): IDbRow | MergeFail {
  if (!row) {
    const logEntry = msg.value.content;
    const [rowId, feedId] = logEntry.__meta.primaryKey.split("_");
    return feedId === msg.value.author
      ? constructRowFromMessage(logEntry, msg.value.timestamp)
      : new MergeFail("NO_PERMISSION");
  } else {
    return new MergeFail("ROW_EXISTS");
  }
}

function update(
  row: IDbRow,
  msg: Msg<ILogEntry<IEditMeta>>
): IDbRow | MergeFail {
  const logEntry = msg.value.content;
  const permissions = getPermissionsFromString(row.__permissions);
  const userPermission = permissions.find(p => p.feedId === msg.value.author);
  const fields = basicFieldsFromMessage(logEntry);
  const hasPermission =
    userPermission &&
    Object.keys(fields).every(f => userPermission.fields.includes(f));
  return hasPermission
    ? mergeFieldsIntoRow(row, fields)
    : new MergeFail("NO_PERMISSION");
}

function del(
  row: IDbRow,
  msg: Msg<ILogEntry<IRowMeta>>
): MergeToDelete | MergeFail {
  const logEntry = msg.value.content;
  const permissions = getPermissionsFromString(row.__permissions);
  const userPermission = permissions.find(p => p.feedId === msg.value.author);
  const hasPermission = userPermission && userPermission.fields.includes("*");
  return hasPermission
    ? new MergeToDelete(logEntry.__meta.primaryKey)
    : new MergeFail("NO_PERMISSION");
}

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
