import { DatabaseSchema, ScuttleBot } from "./types";

export async function open(db: string, token: string, sbot: ScuttleBot) {
  //We're going to open a connection 
}

export async function insert(sbot: ScuttleBot) {}

export async function update(sbot: ScuttleBot) {}

export async function del(sbot: ScuttleBot) {}

export async function query(sbot: ScuttleBot) {}

/*
  ScuttleKit transactions are a little different from a regular database transaction.
  It simply means that the writes cannot be read until a completeTransaction() call is written to the log.
  If completeTransaction() was never called, or if discardTransaction() is called, those writes will never be seen.
*/
export async function createTransaction(
  transactionId: string,
  sbot: ScuttleBot
) {}

export async function completeTransaction(
  transactionId: string,
  sbot: ScuttleBot
) {}

export async function discardTransaction(
  transactionId: string,
  sbot: ScuttleBot
) {

}

/*
  This creates a database.
*/
export async function create(schema: DatabaseSchema, sbot: ScuttleBot) {}

/*
  Recreate the database from the scuttlebutt logs.
  This wipes out the current views/cache.
*/
export async function recreate(databse: string, sbot: ScuttleBot) {}
