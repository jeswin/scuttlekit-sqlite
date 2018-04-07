import Database = require("better-sqlite3");
import { getDb } from "./native-db";
import { IDatabaseSchema, IHost, ILogEntry } from "./types";

/*
  The SqliteDb interface, which clients use to access DB functionality.  
*/
export default class SqliteDb {
  appName: string;
  settings: IDatabaseSchema;

  constructor(appName: string, settings: IDatabaseSchema) {
    this.appName = appName;
    this.settings = settings;
  }
}
