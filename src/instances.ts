import Database = require("better-sqlite3");

const dbsByName: {
  [key: string]: Database;
} = {};

const dbsByToken: {
  [key: string]: Database;
} = {};

export async function createDb(name: string, token: string) {
  const db = new Database(name);
  dbsByName[name] = db;
  dbsByToken[token] = db;
  return db;
}

export async function getDbByName(name: string) {
  return dbsByName[name];
}

export async function getDbsByToken(token: string) {
  return dbsByToken[token];
}
