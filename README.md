# ScuttleKit

NOTICE: This is work in progress. Planning for an alpha by mid-May.

ScuttleKit simplifies the development of distributed apps that run on the Secure ScuttleButt (SSB) peer-to-peer network. ScuttleKit apps run in the browser and requires the end-user to be on the SSB network. If the end user is not on the network, an option to install ScuttleButt is shown.

Apps are built entirely with client-side technologies; HTML, CSS and JavaScript.

# Creating a client

First, add scuttlekit-client to your project via npm or yarn. 

```bash
yarn add scuttlekit-client
```

An app should initialize the ScuttleKit SDK on Page Load (DOMContentLoaded). If the app is not registered on the end user's machine, the SDK will redirect the user's browser to a ScuttleKit hosted page (localhost:1103) where the user can choose to allow or disallow the app to execute. Once the user allows registration, the app is reloaded in the browser and allowed access to the underlying distributed database. There may be a delay on first load, since the local database needs to be created.

As part of the registration, the developer needs to supply details like the appName, version and database schema to ScuttleKit. Primary key for each table is an auto-generated string column called \_\_id. This need not be specified in the schema.

```js
import * as scuttlekit from "scuttlekit-client";

// Your app's name.
const name = "Scuttle Do";

// A unique identifier for your app
const identifier = "scuttledo";

// Your app/schema version
const version = "1.0.0";

// Version of the ScuttleKit SDK you need.
// If a lower version is installed on the user's computer, an error is shown.
const sdkCompatibility = "^0.0.1";

// This is the database schema
const schema = {
  tables: {
    todo: {
      fields: {
        text: { type: "string", maxLength: 200 },
        dueDate: { type: "string" },
        completed: { type: "boolean" },
        timestamp: { type: "number", required: false },
        listId: { type: "string" }
      },
      encrypted: { type: "boolean" },
      foreignKeys: [{ field: "listId", table: "lists" }]
      indexes: [
        ["completed"],
        ["completed", "timestamp"]
      ]
    },
    list: {
      fields: {
        name: { type: "string" }
      }
    }
  }
};

// Init on Page Load
document.addEventListener("DOMContentLoaded", function(event) {
  scuttlekit.init({
    name,
    identifier,
    version,
    types: {
      "scuttledo": "write",
      "scuttledo-todo": "write",
      "scuttledo-list": "write"
    }
    registration: {
      successUrl: "/register"
    },
    schema
  });
});
```

### Insert a Row

Insert an object. The primary key (\_\_id) is an autogenerated number that keeps increases, but may have gaps. The newly generated \_\_id is returned by the insert() function.

```js
async function addTodo(todo) {
  const todo = {
    task: "But oranges",
    priority: 1,
    dueDate: "13-04-2018"
  };
  const result = await scuttlekit.db.insert("todo", todo);
  console.log("The primary key is", result.__id);
}
```

### Reading Data

You can write regular SQL queries to fetch data from the underlying sqlite database.

```js
async function loadTodos(date) {
  return await scuttlekit.db.query(`SELECT * FROM todos WHERE date='$date'`, {
    $date: date
  });
}
```

You can use joins, sure!

```js
async function loadTodosByListName(list) {
  return await scuttlekit.db.query(
    `SELECT * FROM todos JOIN lists ON todos.listId = lists.__id WHERE lists.name='$list'`,
    { $list: list }
  );
}
```

### Update a Row

Update an object. Make sure you pass in the primary key, in addition to the fields to be updated. If \_\_id is missing, the statement will not execute.

```js
async function setCompleted(id) {
  return await scuttlekit.db.update("todo", id, completed: true });
}
```

### Delete a Row

Delete a todo. Remember that the data is only deleted from the sqlite view, and will always reside in the append-only SSB log.

```js
async function deleteTodo(id) {
  return await scuttlekit.db.del("todo", id);
}
```

### Permissions

When a row is written, a set of permissions are also written. The permissions array governs how the row may be modified. Each permissions object in the array has three propertyies:

* user: the public key of a user
* owner: boolean which gives the user full access including delete, and changing permissions.
* fields: An array of fields to which a user has access. '\*' signifies access to all fields.

The author of the row will usually set oneself as the owner, getting complete access to the row. An owner can modify any field in the row, or delete or, or change permissions. The toolkit ensures that atleast one person owns the row.

Here's how Alice can allow Bob to edit a Todo. Bob can edit all fields, but cannot delete or change permissions.

```js
async function createSharedTodo(todo) {
  return await scuttlekit.db.insert("todo", todo, {
    permissions: [
      { user: "alices-public-key", owner: true },
      { user: "bobs-public-key", fields: ["*"] }
    ]
  });
}
```

Bob can now edit an entry created by Alice. In the following example, assume that '\_\_id' corresponds to a todo originally created by his friend Alice.

```js
async function completeSharedTodo(__id) {
  return await scuttlekit.db.update("todo", { __id, completed: true });
}
```

Write permissions can be restricted to specific fields. In the following example, Bob is only allowed to edit the 'completed' field.

```js
async function createSharedTodo(todo) {
  return await scuttlekit.db.insert("todo", todo, {
    permissions: [
      { user: "alices-public-key", owner: true },
      { user: "bobs-public-key", fields: ["completed"] }
    ]
  });
}
```

Alice can modify permissions during updation as well, and not just during an insert. Only owners can do that.

```js
async function assignPermissions(id) {
  return await scuttlekit.db.update(
    "todo",
    { id },
    {
      permissions: [
        { user: "alices-public-key", owner: true },
        { user: "bobs-public-key", fields: ["completed"] }
      ]
    }
  );
}
```

### Transactions

A ScuttleKit transaction can be used to process a list of operations (such as insert, update etc) together. If an operation has the transaction property set, the corresponding row will not be updated until the transaction is committed.

Do note that they are not the same as a database transaction.

* Inside a transaction, read operations don't see the uncommitted changes.
* If an update fails on account of missing permissions, other statements will still succeed.

```js
async function addTodoAndDeleteAnother(newTodo, oldTodoId) {
  const transaction = db.createTransaction();
  await scuttlekit.db.insert("todo", newTodo, { transaction });
  await scuttlekit.db.del("todo", oldTodoId, { transaction });
  await scuttlekit.db.completeTransaction(transaction);
}
```

Sometimes, it is necessary to see the state of uncommited data. You can do this with the get() function. Here's a simple example.

```js
async function addTodoAndDeleteAnother(newTodo, oldTodoId) {
  const transaction = db.createTransaction();
  const { __id } = await scuttlekit.db.insert("todo", newTodo, { transaction });
  const newlyInsertedTodo = await scuttlekit.db.get("todo", __id, {
    transaction
  });
  await scuttlekit.db.completeTransaction(transaction);
}
```

### Triggers

ScuttleKit lets you set triggers that will be called when data is modified.
Triggers are similar to those one would find in typical databases, but with restrictions. If the record is modified in a transaction, the trigger fires only when the transaction completes.

An app does not see trigger events if it is not active at the time of the event.
So these are meant to use used for live updates on the screen.

```js
async function alertOnNewSong() {
  // Valid values are insert, update and delete.
  const triggerConfig = { type: "insert" };
  const triggerId = await scuttlekit.db.trigger("song", triggerConfig, song => {
    console.log(song);
  });
}
```

A trigger may be removed at any point.

```js
async function removeSongAlerts(triggerId) {
  await scuttlekit.db.untrigger(triggerId);
}
```

### Notifications

There is built-in support for notifications and messages via the messaging service.

Send a message to another user

```js
import { messaging } from "scuttlekit-client";

async function sendMessage() {
  const type = "my-greeting";
  const recipients = ["bobs-id", "carols-id"];
  const message = { greeting: "Hello world" };
  scuttlekit.messaging.send(type, recipients, greeting);
}
```

Receive Notifications

```js
async function receiveMessage() {
  const type = "my-greeting";
  const senders = ["alices-id"];
  scuttlekit.messaging.receive(type, senders, event => {
    const sender = event.sender;
    const text = event.data.text;
    console.log(`${sender} said $${text}`);
  });
}
```

Broadcast a message to all users

```js
async function broadcastMessage() {
  const type = "my-greeting";
  const recipients = ["bobs-id", "carols-id"];
  const message = { greeting: "Hello world" };
  scuttlekit.messaging.broadcast(type, greeting);
}
```

Receive a broadcast

```js
async function receiveBroadcast() {
  const type = "my-greeting";
  scuttlekit.messaging.listen(type, event => {
    const sender = event.sender;
    const text = event.data.text;
    console.log(`${sender} said $${text}`);
  });
}
```

### Schema Changes (Incomplete!)

It is inevitable that at some point you'll make changes to the schema. To support this, ScuttleKit allows you to define transforms which can convert data from an earlier schema into a newer one. Transform Functions are run when the schema version changes - the SSB log is replayed and the transform function will be called for each entry. The function should return an object or throw an Error - if an error is thrown, it is logged and the next record is processed.

Every SSB log entry made via ScuttleKit will contain an \_\_schema property, which signifies the schema at the time of record creation.
The transform function could use the version to decide how to interpret a record.

```js
const schema = {
  tables: {
    // ...omitted
  },

  // Example: Versions prior to 0.1.0, did not have firstName and lastName.
  // Versions between 0.1.0 and 0.2.1 used fname and lname as field names.
  // We're going to convert it to firstName and lastName.
  transform: logEntry => {
    if (logEntry.__schema <= "0.1.0") {
      return {
        firstName: logEntry.name.split(" ")[0],
        lastName: logEntry.name.split(" ")[1],
        age: logEntry.age
      };
    } else if (logEntry.__schema <= "0.2.1" && logEntry.__schema > "0.1.0") {
      return {
        firstName: logEntry.fname,
        lastName: logEntry.lname,
        age: logEntry.age
      };
    }
  }
};
```

There's an onTransformComplete callback available which lets you make additional modifications to a database after all entries have been transformed.
The onTransformComplete function is regular function in which the standard database API (insert, update etc) is available.
The key difference is that it DOES NOT write the changes back to the SSB log. Use this sparingly - it's more like an escape hatch.

```js
const schema = {
  tables: {
    todo: {
      // ...omitted
    },
    list: {
      // ...omitted
    }
  },

  transform: (logEntry) => {
    // ...omitted
  },

  //Note that the db writes in onTransformComplete skip the SSB log.
  onTransformComplete: (db) => {
    const todos = await scuttlekit.db.query("SELECT * FROM todos");
    const assigneeNames = todos.map(t => t.assignee);
    for (const assigneeName of assigneeNames) {
      db.insert("assignee", { name: assigneeName })
    }
  }
};
```
