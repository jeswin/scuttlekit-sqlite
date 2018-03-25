import { LogEntry, Host, Operation } from "./types";
import SqliteDb from "./sqlitedb";
import exception from "./exception";

export async function onWrite(logEntry: LogEntry, db: SqliteDb, host: Host) {
  if (logEntry.type.startsWith(`${db.appName}-`)) {
    const meta = logEntry.__meta;
    return meta.operation === Operation.Insert
      ? onInsert(logEntry)
      : meta.operation === Operation.Update
        ? onUpdate(logEntry)
        : meta.operation === Operation.Del
          ? onDel(logEntry)
          : exception(`Unknown operation ${meta.operation}`);
  }
}

async function onInsert(logEntry: LogEntry) {}

async function onUpdate(logEntry: LogEntry) {}

async function onDel(logEntry: LogEntry) {}

async function onTransactionComplete() {}
