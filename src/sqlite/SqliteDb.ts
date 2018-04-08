import Database = require("better-sqlite3");
import { IDatabaseSchema, IHost, ILogEntry } from "../types/basic";
import { getDb } from "./native-db";

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
