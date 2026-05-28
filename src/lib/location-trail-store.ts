import type { TrailPointPayload } from "@/lib/location-trail";

const DB_NAME = "tofu-run-trail-v1";
const STORE_NAME = "queues";
const DB_VERSION = 1;

type QueueRecord = {
  key: string;
  sessionId: string;
  userId: string;
  pending: TrailPointPayload[];
};

function queueKey(sessionId: string, userId: string): string {
  return `${sessionId}:${userId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function readRecord(
  sessionId: string,
  userId: string
): Promise<QueueRecord> {
  const db = await openDb();
  const key = queueKey(sessionId, userId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    req.onsuccess = () => {
      const row = req.result as QueueRecord | undefined;
      resolve(
        row ?? { key, sessionId, userId, pending: [] }
      );
    };
  });
}

async function writeRecord(record: QueueRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB write failed"));
    req.onsuccess = () => resolve();
  });
}

export async function appendTrailPoint(
  sessionId: string,
  userId: string,
  point: TrailPointPayload
): Promise<void> {
  const record = await readRecord(sessionId, userId);
  record.pending.push(point);
  await writeRecord(record);
}

export async function takeTrailBatch(
  sessionId: string,
  userId: string,
  max: number
): Promise<TrailPointPayload[]> {
  const record = await readRecord(sessionId, userId);
  if (record.pending.length === 0) return [];
  const batch = record.pending.splice(0, max);
  await writeRecord(record);
  return batch;
}

export async function prependTrailPoints(
  sessionId: string,
  userId: string,
  points: TrailPointPayload[]
): Promise<void> {
  if (points.length === 0) return;
  const record = await readRecord(sessionId, userId);
  record.pending = [...points, ...record.pending];
  await writeRecord(record);
}

export async function getTrailPendingCount(
  sessionId: string,
  userId: string
): Promise<number> {
  const record = await readRecord(sessionId, userId);
  return record.pending.length;
}
