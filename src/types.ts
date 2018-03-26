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

export interface Meta {
  table: string,
  permissions: Permission[];
  transactionId: string;
  operation: Operation;
}

export interface LogEntry {
  type: string;
  __meta: Meta;
  [key: string]: any;
}

export type WriteParams = {
  operation: Operation;
};

export interface Host {
  write(record: object, params?: WriteParams): Promise<void>;
  onWrite(cb: (record: object) => void): void;
}

export enum Operation {
  Insert = "Insert",
  Update = "Update",
  Del = "Del"
}

export enum PermissionType {
  Read = "Read",
  Write = "Write",
  ReadWrite = "ReadWrite"
}

export interface Permission {
  user: string;
  access: string;
}
