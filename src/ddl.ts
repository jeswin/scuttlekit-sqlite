import Database = require("better-sqlite3");
import { ITableSchema, IDatabaseSchema } from "./types";

export async function createTable(table: ITableSchema, underlying: Database) {}

export type SystemTableOptions = {
  schema: IDatabaseSchema;
};

export async function createSystemTable(
  { schema }: SystemTableOptions,
  underlying: Database
) {}
