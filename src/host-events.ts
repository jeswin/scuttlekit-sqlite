import { LogEntry, Host, Operation, TableSchema } from "./types";
import SqliteDb from "./sqlitedb";
import exception from "./exception";
import { getDb } from "./native-db";

export async function onWrite(logEntry: LogEntry, db: SqliteDb, host: Host) {
  if (logEntry.type.startsWith(`${db.appName}-`)) {
    const meta = logEntry.__meta;

    const handler =
      meta.operation === Operation.Insert
        ? onInsert
        : meta.operation === Operation.Update
          ? onUpdate
          : meta.operation === Operation.Del
            ? onDel
            : exception(`Unknown operation ${meta.operation}`);

    return await handler(logEntry, db, host);
  }
}

function getFields(table: TableSchema) {
  return []
}

async function onInsert(logEntry: LogEntry, db: SqliteDb, host: Host) {
  const sqlite = await getDb(db.appName);
  const insert = sqlite.prepare(
    `INSERT INTO ${logEntry.__meta.table} VALUES ()`
  );
  insert.run();
}

async function onUpdate(logEntry: LogEntry, db: SqliteDb, host: Host) {}

async function onDel(logEntry: LogEntry, db: SqliteDb, host: Host) {}

async function onTransactionComplete() {}
