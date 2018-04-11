import * as path from "path";
import {
  IDbRow,
  IDeleteMeta,
  IEditMeta,
  IFields,
  IHost,
  ILogEntry,
  ILogEntryMeta,
  IRowMeta,
  ITableSchema,
  IWriteParams,
  Operation
} from "../types/basic";
import { Msg } from "../types/ssb-types";

export default class MockHost implements IHost {
  getDataDirectory() {
    return path.join(__dirname, "sqlite");
  }

  getFeedId() {
    return "666";
  }

  async getMessagesByPKey(
    table: string,
    pKey: string
  ): Promise<Msg<ILogEntry<IRowMeta>>[]> {
    return 1 as any;
  }

  async write(
    record: ILogEntry<ILogEntryMeta>,
    params?: IWriteParams
  ): Promise<void> {
    return;
  }

  onWrite(cb: (record: Msg<ILogEntry<IRowMeta>>) => void): void {}

  replayMessages() {}
}
