import { Msg } from "./ssb-types";

/* ScuttleKit */
export interface FieldSchema {
  type: string;
}

export interface ForeignKey {
  foreignKey: string;
  primaryKey: string;
  table: string;
}

export interface TableSchema {
  fields: {
    [key: string]: FieldSchema;
  };
  encrypted: boolean;
  primaryKey: string;
  foreignKeys: ForeignKey[];
}

export interface DatabaseSchema {
  tables: {
    [key: string]: TableSchema;
  };
}

export interface RowMeta {
  transactionId: string;
  operation: Operation;
}

export interface EditMeta extends RowMeta {
  permissions: Permission[];
  operation: Operation.Insert | Operation.Update
}

export interface DeleteMeta extends RowMeta {
  operation: Operation.Del
}

export interface LogEntry<TMeta extends RowMeta> {
  table: string;
  primaryKey: string;
  type: string;
  __meta: TMeta;
  [key: string]: any;
}

export type WriteParams = {
  operation: Operation;
};

export type DbRow = {
  fields: DbField[];
};

export type DbField = {
  field: string;
  value: string | number | boolean;
};

export type QueryResult = {
  length: number;
  rows: DbRow[];
};

export enum Operation {
  Insert = "Insert",
  Update = "Update",
  Del = "Del"
}

export interface Permission {
  feedId: string;
  fields?: string[];
}

export interface Host {
  write(record: LogEntry<RowMeta>, params?: WriteParams): Promise<void>;
  onWrite(cb: (record: object) => void): void;
  getMessagesByPrimaryKey() : Msg<LogEntry<RowMeta>>[]
}