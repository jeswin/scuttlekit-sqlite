import { IHost } from "../types/basic";

export default class MockHost implements IHost {
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
