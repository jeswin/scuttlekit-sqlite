import Database = require("better-sqlite3");

const dbsByName: {
  [key: string]: Database;
} = {};

export async function getDb(name: string) {
  return (
    dbsByName[name] || ((dbsByName[name] = new Database(name)), dbsByName[name])
  );
}
