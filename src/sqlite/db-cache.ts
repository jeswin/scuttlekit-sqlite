import Database = require("better-sqlite3");
import * as path from "path";

const dbsByName: {
  [key: string]: Database;
} = {};

export async function getDb(filePath: string) {
  return (
    dbsByName[filePath] ||
    ((dbsByName[filePath] = new Database(filePath)), dbsByName[filePath])
  );
}
