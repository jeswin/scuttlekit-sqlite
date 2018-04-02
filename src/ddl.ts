import Database = require("better-sqlite3");
import { ITableSchema, IDatabaseSchema } from "./types";

export async function createTable(table: ITableSchema, underlying: Database) {}

export type SystemTableOptions = {
  settings: IDatabaseSchema;
};

export async function createSystemTable(
  { settings }: SystemTableOptions,
  underlying: Database
) {}
