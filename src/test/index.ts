import "mocha";
import "should";

import * as lib from "../";
import Host from "./mock-host";

describe("scuttlekit-sqlite", () => {
  it("returns undefined if db does not exist", async () => {
    const host = new Host();
    const settings = await lib.getSystemSettings("test-app", host);
  });

  // it("registers", async () => {
  //   const host = new Host();
  //   const registration = await lib.register();
  // });
});
