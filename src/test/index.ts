import "mocha";
import "should";

import * as lib from "../";
import Host from "./mock-host";

describe("scuttlekit-sqlite", () => {
  it("registers", async () => {
    const host = new Host();
    lib.init();
  });
});
