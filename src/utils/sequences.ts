const EMPTY_SLOT_COUNT = 100;

const syncedSequences = new Map<string, number>();
const currentSequences = new Map<string, number>();

export function init(value: number) {}

// TODO: Write to DB
export async function syncSequence(table: string, value: number) {
  syncedSequences.set(table, value);
  return;
}

export async function next(table: string) {
  const current = 1 + (currentSequences.get(table) as number);
  const max = syncedSequences.get(table) as number;
  if (current === max) {
    await syncSequence(table, current + EMPTY_SLOT_COUNT);
  }
  currentSequences.set(table, current);
  return current + 1;
}
