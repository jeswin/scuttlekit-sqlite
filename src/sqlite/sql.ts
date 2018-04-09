import { IDbRow, IHost, IQueryResult } from "../types/basic";
import { getDb } from "./db-cache";
import SqliteDb from "./SqliteDb";

export async function getBypKey(table: string, pKey: string, db: SqliteDb) {
  return { length: 100, rows: [{ __timestamp: 0 }] } as IQueryResult;
}

export async function insert(table: string, row: IDbRow, db: SqliteDb) {
  const fieldNames = fields.map(f => f.field).join(", ");
  const values = fields.map(f => f.value);
  const questionMarks = values.map(_ => "?").join(", ");
  const insert = db.sqlite.prepare(
    `INSERT INTO ${fieldNames} VALUES (${questionMarks})`
  );
  return insert.run(values);
}

export async function update(table: string, row: IDbRow, db: SqliteDb) {
  return;
}

export async function del(table: string, pKey: string, db: SqliteDb) {
  return;
}

export async function query(sqlQuery: string, db: SqliteDb) {
  return;
}
