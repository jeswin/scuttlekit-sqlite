import Database = require("better-sqlite3");
import { IDatabaseSchema, ITableSchema, IFieldSchema } from "../types/basic";
import SqliteDb from "./SqliteDb";

export async function createTable(table: ITableSchema, db: SqliteDb) {
  // Object.keys(table.fields).reduce((acc, name) => {
  //   const fieldDef = table.fields[name];

  // }, []);
}

function getColumnType(fieldSchema: IFieldSchema) {
  // return fieldSchema.type === "string"
  //   ? { type: "varchar", length:  }
}

export interface ISystemTableOptions {
  schema: IDatabaseSchema;
}

export async function createSystemTable(
  db: SqliteDb
) {
  
}
