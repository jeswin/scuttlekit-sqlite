import SqliteDb from "./sqlitedb";
import { IDbField, IHost, IQueryResult } from "./types";
import { getDb } from "./native-db";

export async function getByPrimaryKey(
  table: string,
  primaryKey: string,
  db: SqliteDb,
  host: IHost
) {
  return { length: 100, rows: [{ __timestamp: 0 }] } as IQueryResult;
}

export async function insert(
  table: string,
  fields: IDbField[],
  db: SqliteDb,
  host: IHost
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
  fields: IDbField[],
  db: SqliteDb,
  host: IHost
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
  fields: IDbField[],
  db: SqliteDb,
  host: IHost
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
