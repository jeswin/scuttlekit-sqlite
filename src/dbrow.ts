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

export function getFieldValue(row: IDbRow, fieldName: string) {
  const field = row.fields.find(f => f.field === fieldName);
  return field ? field.value : undefined;
}

export function constructRowFromMessage(
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

export function updateRowFromMessage(
  row: IDbRow,
  msg: Msg<ILogEntry<IEditMeta>>,
  timestamp: number,
  isCurrentUser: boolean
) {
  const logEntry = msg.value.content;
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
