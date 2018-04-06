import { Msg } from "./ssb-types";
import {
  IDbRow,
  IDeleteMeta,
  IEditMeta,
  IFields,
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

export function constructRowFromMessage(
  logEntry: ILogEntry<IEditMeta>,
  timestamp: number
): IDbRow {
  return {
    ...basicFieldsFromMessage(logEntry),
    __deleted: false,
    __permissions: getPermissionsField(logEntry),
    __timestamp: timestamp
  };
}

export function mergeFieldsIntoRow(row: IDbRow, fields: IFields) {
  for (const key of Object.keys(fields)) {
    row[key] = fields[key];
  }
  return row;
}
