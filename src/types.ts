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

export interface LogEntry {
  type: string,
  [key: string]: any
}

export interface Host {
  write(record: object): Promise<void>;
  onWrite(cb: (record: object) => void): void;
}


