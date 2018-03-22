import SqliteDb from "./db";

const dbsByName: {
  [key: string]: SqliteDb;
} = {};

export async function getDb(name: string) {
  return (
    dbsByName[name] || ((dbsByName[name] = new SqliteDb(name)), dbsByName[name])
  );
}
