import Database = require("better-sqlite3");
import { IDatabaseSchema, ITableSchema } from "../types/basic";
import SqliteDb from "./SqliteDb";

export async function createTable(table: ITableSchema, db: SqliteDb) {}

export interface ISystemTableOptions {
  schema: IDatabaseSchema;
}

export async function createSystemTable(
  db: SqliteDb
) {}
