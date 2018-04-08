import Database = require("better-sqlite3");
import { IDatabaseSchema, ITableSchema } from "../types/basic";

export async function createTable(table: ITableSchema, underlying: Database) {}

export interface ISystemTableOptions {
  schema: IDatabaseSchema;
}

export async function createSystemTable(
  { schema }: ISystemTableOptions,
  underlying: Database
) {}
