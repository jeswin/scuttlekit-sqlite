import Database = require("better-sqlite3");
import * as ddl from "./ddl";
import * as instances from "./instances";
import { DatabaseSchema, Host, LogEntry } from "./types";

import { insert, update, del, query } from "./db";

/*
  The SqliteDb interface, which clients use to access DB functionality.  
*/
export default class SqliteDb {
  appName: string;
  settings: DatabaseSchema;

  constructor(appName: string, settings: DatabaseSchema) {
    this.appName = appName;
    this.settings = settings;
  }

  async query(query: string, host: Host) {
    //return await insert(table, row, this, host);
  }

  async insert(table: string, row: object, host: Host) {
    return await insert(table, row, this, host);
  }

  async update(table: string, row: object, host: Host) {
    return await insert(table, row, this, host);
  }
  
  async del(table: string, row: object, host: Host) {
    return await insert(table, row, this, host);
  }
}
