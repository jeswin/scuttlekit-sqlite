import * as path from "path";
import { IHost } from "../types/basic";

export default class MockHost implements IHost {
  getDataDirectory() {
    return path.join(__dirname, "sqlite");
  }

  getFeedId() {
    return "666";
  }

  getMessagesBypKey(table: string, pKey: string): Msg<ILogEntry<IRowMeta>>[] {}

  write(
    record: ILogEntry<ILogEntryMeta>,
    params?: IWriteParams
  ): Promise<void> {}

  onWrite(cb: (record: object) => void): void {}
}
