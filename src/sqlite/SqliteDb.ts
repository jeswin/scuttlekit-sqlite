import Database = require("better-sqlite3");
import { IDatabaseSchema, IHost, ILogEntry } from "../types/basic";
import { getDb } from "./db-cache";

/*
  The SqliteDb interface, which clients use to access DB functionality.  
*/
export default class SqliteDb {
  appName: string;
  sqlite: Database;
  schema: IDatabaseSchema;

  constructor(appName: string, sqlite: Database, schema: IDatabaseSchema) {
    this.appName = appName;
    this.sqlite = sqlite;
    this.schema = schema;
  }
}
