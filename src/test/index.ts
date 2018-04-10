import "mocha";
import "should";

import * as lib from "../";
import Host from "./MockHost";
import MockHost from "./MockHost";
import { IAppSettings } from "../types/basic";

function getHost() {
  return new MockHost();
}

function getAppSettings(): IAppSettings {
  return {
    identifier: "scuttle-test",
    name: "Scuttle Test",
    types: {
      customers: "read"
    },
    version: "1.0.0"
  };
}

describe("scuttlekit-sqlite", () => {
  it("creates a database", async () => {
    const host = getHost();
    const appSettings = getAppSettings();
    const s = await lib.createDatabase(appSettings, host);
  });

  // it("registers", async () => {
  //   const host = new Host();
  //   const registration = await lib.register();
  // });
});
