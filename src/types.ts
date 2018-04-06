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
  primaryKey: string;
  table: string;
}

export interface ITableSchema {
  fields: {
    [key: string]: IFieldSchema;
  };
  encrypted: boolean;
  primaryKey: string;
  foreignKeys: IForeignKey[];
}

export interface IDatabaseSchema {
  tables: {
    [key: string]: ITableSchema;
  };
}

/* Querying */
export interface IRowMeta {
  table: string;
  primaryKey: string;
  transactionId: string;
  operation: Operation;
}

export interface IEditMeta extends IRowMeta {
  permissions: IPermission[];
  operation: Operation.Insert | Operation.Update;
}

export interface IDeleteMeta extends IRowMeta {
  operation: Operation.Del;
}

export interface ILogEntry<TMeta extends IRowMeta> {
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
  Del = "Del"
}

/* Permissions */

export interface IPermission {
  feedId: string;
  fields?: string[];
}

/* Host */
export interface IHost {
  write(record: ILogEntry<IRowMeta>, params?: IWriteParams): Promise<void>;
  onWrite(cb: (record: object) => void): void;
  getMessagesByPrimaryKey(
    table: string,
    primaryKey: string
  ): Msg<ILogEntry<IRowMeta>>[];
}
