import { Msg } from "./ssb-types";

export interface IAppSettings {
  name: string;
  types: string[];
}

/* Db Schema */
export interface IFieldSchema {
  type: string;
}

export interface IForeignKey {
  foreignKey: string;
  table: string;
}

export interface ITableSchema {
  fields: {
    [key: string]: IFieldSchema;
  };
  encrypted: boolean;
  foreignKeys: IForeignKey[];
  indexes: {
    field: string;
    ascending: boolean;
  }[];
}

export interface IDatabaseSchema {
  tables: {
    [key: string]: ITableSchema;
  };
}

/* Querying */
export interface ILogEntryMeta {
  operation: Operation;
}

export interface IRowMeta extends ILogEntryMeta {
  table: string;
  pKey: string;
  transactionId: string;
}

export interface IEditMeta extends IRowMeta {
  permissions: IPermission[];
  operation: Operation.Insert | Operation.Update;
}

export interface IDeleteMeta extends IRowMeta {
  operation: Operation.Del;
}

export interface ICommitTransactionMeta extends ILogEntryMeta {
  operation: Operation.CommitTransaction;
  transactionId: string;
}

export interface ILogEntry<TMeta extends ILogEntryMeta> {
  type: string;
  __meta: TMeta;
  [key: string]: any;
}

export interface IWriteParams {
  operation: Operation;
}

export interface IFields {
  [name: string]: string | number | boolean;
}

export interface IDbRow extends IFields {
  __deleted: boolean;
  __permissions: string;
  __timestamp: number;
}

export interface IQueryResult {
  length: number;
  rows: IDbRow[];
}

export enum Operation {
  Insert = "Insert",
  Update = "Update",
  Del = "Del",
  CommitTransaction = "CommitTransaction"
}

/* Permissions */

export interface IPermission {
  feedId: string;
  fields?: string[];
}

/* Host */
export interface IHost {
  getFeedId(): string;
  getMessagesBypKey(table: string, pKey: string): Msg<ILogEntry<IRowMeta>>[];
  write(record: ILogEntry<ILogEntryMeta>, params?: IWriteParams): Promise<void>;
  onWrite(cb: (record: object) => void): void;
}