import Database = require("better-sqlite3");
import { TableSchema, DatabaseSchema } from "./types";

export async function createTable(table: TableSchema, underlying: Database) {}

export type SystemTableOptions = {
  settings: DatabaseSchema;
};

export async function createSystemTable(
  { settings }: SystemTableOptions,
  underlying: Database
) {}
