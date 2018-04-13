import { NonResult } from "../host/events";
import * as sql from "../sqlite/sql";
import SqliteDb from "../sqlite/SqliteDb";
import {
  IDbRow,
  IDeleteMeta,
  IEditMeta,
  IFields,
  IHost,
  ILogEntry,
  IPermission,
  IRowMeta,
  ITableSchema,
  Operation
} from "../types/basic";
import { Msg } from "../types/ssb-types";

export class MergeToDelete {
  pKey: string;
  constructor(key: string) {
    this.pKey = key;
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
  pKey: string,
  db: SqliteDb,
  host: IHost
): Promise<MergeResult | undefined> {
  const unorderedMessages = await host.getMessagesByPKey(table, pKey);
  const messages = sortMessages(unorderedMessages);

  const rowsForKey = await sql.getByPKey(table, pKey, db);
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
  ): MergeResult | undefined {
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
    const [rowId, feedId] = logEntry.__meta.pKey.split("_");
    if (feedId === msg.value.author) {
      const fields = basicFieldsFromMessage(logEntry);
      return {
        ...fields,
        __deleted: false,
        __permissions: JSON.stringify(""),
        __timestamp: 0
      };
    } else {
      return new MergeFail("NO_PERMISSION");
    }
  } else {
    return new MergeFail("ROW_EXISTS");
  }
}

function update(
  row: IDbRow,
  msg: Msg<ILogEntry<IEditMeta>>
): IDbRow | MergeFail {
  const logEntry = msg.value.content;
  const permissions = JSON.parse(row.__permissions) as IPermission[];
  const userPermission = permissions.find(p => p.feedId === msg.value.author);
  const fields = basicFieldsFromMessage(logEntry);
  const hasPermission =
    userPermission &&
    (userPermission.owner ||
      userPermission.fields.includes("*") ||
      Object.keys(fields).every(f => userPermission.fields.includes(f)));
  return hasPermission
    ? mergeFieldsIntoRow(row, fields)
    : new MergeFail("NO_PERMISSION");
}

function del(
  row: IDbRow,
  msg: Msg<ILogEntry<IRowMeta>>
): MergeToDelete | MergeFail {
  const logEntry = msg.value.content;
  const permissions = JSON.parse(row.__permissions) as IPermission[];
  const userPermission = permissions.find(p => p.feedId === msg.value.author);
  const hasPermission = userPermission && userPermission.owner;
  return hasPermission
    ? new MergeToDelete(logEntry.__meta.pKey)
    : new MergeFail("NO_PERMISSION");
}

function sortMessages(entries: Msg<ILogEntry<IRowMeta>>[]) {
  return entries;
}

export function parsePKey<T>(msg: Msg<ILogEntry<IEditMeta>>): [string, string] {
  const [rowId, feedId] = msg.value.content.pKey.split("_");
  return [rowId, feedId];
}

export function basicFieldsFromMessage(
  logEntry: ILogEntry<IEditMeta>
): IFields {
  const result: any = {};
  for (const key of Object.keys(logEntry)) {
    if (key !== "__meta" && key !== "type") {
      result[key] = logEntry[key];
    }
  }
  return result;
}

export function mergeFieldsIntoRow(row: IDbRow, fields: IFields) {
  for (const key of Object.keys(fields)) {
    row[key] = fields[key];
  }
  return row;
}

export function getFieldsFromLogEntry(logEntry: ILogEntry<any>) {
  return Object.keys(logEntry).filter(k =>
    ["pKey", "type", "__meta"].includes(k)
  );
}

export function getFieldsFromRow(logEntry: ILogEntry<IEditMeta>) {
  return Object.keys(logEntry)
    .filter(k => !["type", "__meta"].includes(k))
    .map(k => ({ field: k, value: logEntry[k] }));
}
