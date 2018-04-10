import "mocha";
import "should";

import * as lib from "../";
import { IAppSettings, IDatabaseSchema } from "../types/basic";
import MockHost from "./MockHost";

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

function getSchema(): IDatabaseSchema {
  return {
    tables: {
      list: {
        fields: {
          name: { type: "string" }
        }
      },
      todo: {
        encrypted: false,
        fields: {
          completed: { type: "boolean" },
          dueDate: { type: "string" },
          text: { type: "string" },
          timestamp: { type: "number", required: false }
        },
        foreignKeys: [{ foreignKey: "listId", table: "lists" }]
      }
    }
  };
}

describe("scuttlekit-sqlite", () => {
  it("creates a database", async () => {
    const host = getHost();
    const appSettings = getAppSettings();
    const schema = getSchema();
    const s = await lib.create(appSettings, { schema }, host);
  });

  // it("registers", async () => {
  //   const host = new Host();
  //   const registration = await lib.register();
  // });
});
