import SqliteDb from "./sqlitedb";
import { DbField, Host, QueryResult } from "./types";
import { getDb } from "./native-db";

export async function getByPrimaryKey(
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: Host
) {
  return { length: 100, rows: [{ fields: [] }] } as QueryResult;
}

export async function insert(
  table: string,
  fields: DbField[],
  db: SqliteDb,
  host: Host
) {
  const sqlite = await getDb(db.appName);
  const fieldNames = fields.map(f => f.field).join(", ");
  const values = fields.map(f => f.value);
  const questionMarks = values.map(_ => "?").join(", ");
  const insert = sqlite.prepare(
    `INSERT INTO ${fieldNames} VALUES (${questionMarks})`
  );
  return insert.run(values);
}

export async function update(
  table: string,
  fields: DbField[],
  db: SqliteDb,
  host: Host
) {
  const sqlite = await getDb(db.appName);
  const fieldNames = fields.map(f => f.field).join(", ");
  const values = fields.map(f => f.value);
  const questionMarks = values.map(_ => "?").join(", ");
  const insert = sqlite.prepare(
    `INSERT INTO ${fieldNames} VALUES (${questionMarks})`
  );
  return insert.run(values);
}

export async function del(
  table: string,
  fields: DbField[],
  db: SqliteDb,
  host: Host
) {
  const sqlite = await getDb(db.appName);
  const fieldNames = fields.map(f => f.field).join(", ");
  const values = fields.map(f => f.value);
  const questionMarks = values.map(_ => "?").join(", ");
  const insert = sqlite.prepare(
    `INSERT INTO ${fieldNames} VALUES (${questionMarks})`
  );
  return insert.run(values);
}
