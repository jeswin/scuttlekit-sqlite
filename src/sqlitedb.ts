import Database = require("better-sqlite3");
import * as ddl from "./ddl";
import * as instances from "./instances";
import { IDatabaseSchema, IHost, ILogEntry } from "./types";
import { getDb } from "./native-db"

import { insert, update, del, query } from "./db";

/*
  The SqliteDb interface, which clients use to access DB functionality.  
*/
export default class SqliteDb {
  appName: string;
  settings: IDatabaseSchema;
  feedId: string;

  constructor(appName: string, settings: IDatabaseSchema, feedId: string) {
    this.appName = appName;
    this.settings = settings;
    this.feedId = feedId;
  }

}