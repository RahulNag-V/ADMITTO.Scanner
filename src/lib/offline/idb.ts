import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  CachedEvent,
  CachedAttendee,
  LocalCheckIn,
  SyncQueueItem,
  SyncHistoryItem,
  TerminalMetadata,
} from './types';

const DB_NAME = 'admitto_offline_db';
const DB_VERSION = 1;

export interface AdmittoDBSchema extends DBSchema {
  cached_event: {
    key: string;
    value: CachedEvent;
  };
  cached_attendees: {
    key: string;
    value: CachedAttendee;
    indexes: {
      by_event_id: string;
      by_event_qr: [string, string];
      by_event_barcode: [string, string];
      by_event_usn: [string, string];
      by_event_primary: [string, string];
    };
  };
  local_check_ins: {
    key: string;
    value: LocalCheckIn;
    indexes: {
      by_event_student: [string, string];
      by_event_id: string;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      by_status: string;
      by_event_status: [string, string];
      by_created_at: string;
    };
  };
  sync_history: {
    key: string;
    value: SyncHistoryItem;
    indexes: {
      by_event_id: string;
      by_synced_at: string;
    };
  };
  terminal_metadata: {
    key: string;
    value: TerminalMetadata;
  };
}

let dbPromise: Promise<IDBPDatabase<AdmittoDBSchema>> | null = null;

export async function closeAdmittoDB(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    } finally {
      dbPromise = null;
    }
  }
}

export async function getAdmittoDB(): Promise<IDBPDatabase<AdmittoDBSchema>> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not supported in this environment.');
  }

  if (!dbPromise) {
    dbPromise = openDB<AdmittoDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. cached_event
        if (!db.objectStoreNames.contains('cached_event')) {
          db.createObjectStore('cached_event', { keyPath: 'id' });
        }

        // 2. cached_attendees
        if (!db.objectStoreNames.contains('cached_attendees')) {
          const attendeeStore = db.createObjectStore('cached_attendees', { keyPath: 'id' });
          attendeeStore.createIndex('by_event_id', 'event_id');
          attendeeStore.createIndex('by_event_qr', ['event_id', 'qr_code']);
          attendeeStore.createIndex('by_event_barcode', ['event_id', 'barcode']);
          attendeeStore.createIndex('by_event_usn', ['event_id', 'usn']);
          attendeeStore.createIndex('by_event_primary', ['event_id', 'primary_scan_value']);
        }

        // 3. local_check_ins
        if (!db.objectStoreNames.contains('local_check_ins')) {
          const checkinStore = db.createObjectStore('local_check_ins', { keyPath: 'client_scan_id' });
          checkinStore.createIndex('by_event_student', ['event_id', 'student_id']);
          checkinStore.createIndex('by_event_id', 'event_id');
        }

        // 4. sync_queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'client_scan_id' });
          queueStore.createIndex('by_status', 'status');
          queueStore.createIndex('by_event_status', ['event_id', 'status']);
          queueStore.createIndex('by_created_at', 'created_at');
        }

        // 5. sync_history
        if (!db.objectStoreNames.contains('sync_history')) {
          const historyStore = db.createObjectStore('sync_history', { keyPath: 'id' });
          historyStore.createIndex('by_event_id', 'event_id');
          historyStore.createIndex('by_synced_at', 'synced_at');
        }

        // 6. terminal_metadata
        if (!db.objectStoreNames.contains('terminal_metadata')) {
          db.createObjectStore('terminal_metadata', { keyPath: 'key' });
        }
      },
      terminated() {
        dbPromise = null;
      },
    }).then((db) => {
      const origClose = db.close.bind(db);
      db.close = () => {
        dbPromise = null;
        return origClose();
      };
      return db;
    });
  }

  return dbPromise;
}

/**
 * Request persistent browser storage if supported
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Metadata Helpers
 */
export async function getMetadata<T = any>(key: string): Promise<T | null> {
  const db = await getAdmittoDB();
  const entry = await db.get('terminal_metadata', key);
  return entry ? (entry.value as T) : null;
}

export async function setMetadata(key: string, value: any): Promise<void> {
  const db = await getAdmittoDB();
  await db.put('terminal_metadata', {
    key,
    value,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteMetadata(key: string): Promise<void> {
  const db = await getAdmittoDB();
  await db.delete('terminal_metadata', key);
}

/**
 * Purge sensitive event data (event bundle, cached attendees, local check-in records for this event)
 * Preserves unsynced queue items unless explicitly directed to clear them.
 */
export async function purgeEventOfflineData(eventId: string, purgeQueue: boolean = false): Promise<void> {
  const db = await getAdmittoDB();
  const tx = db.transaction(
    ['cached_event', 'cached_attendees', 'local_check_ins', 'sync_queue', 'sync_history', 'terminal_metadata'],
    'readwrite'
  );

  await tx.objectStore('cached_event').delete(eventId);

  // Delete all cached attendees for this event
  const attendeeIdx = tx.objectStore('cached_attendees').index('by_event_id');
  let attendeeCursor = await attendeeIdx.openCursor(eventId);
  while (attendeeCursor) {
    await attendeeCursor.delete();
    attendeeCursor = await attendeeCursor.continue();
  }

  // Delete local check_ins for this event
  const checkInIdx = tx.objectStore('local_check_ins').index('by_event_id');
  let checkInCursor = await checkInIdx.openCursor(eventId);
  while (checkInCursor) {
    await checkInCursor.delete();
    checkInCursor = await checkInCursor.continue();
  }

  // Delete sync history for this event
  const historyIdx = tx.objectStore('sync_history').index('by_event_id');
  let historyCursor = await historyIdx.openCursor(eventId);
  while (historyCursor) {
    await historyCursor.delete();
    historyCursor = await historyCursor.continue();
  }

  if (purgeQueue) {
    const queueIdx = tx.objectStore('sync_queue').index('by_event_status');
    let queueCursor = await queueIdx.openCursor(IDBKeyRange.bound([eventId, ''], [eventId, '\uffff']));
    while (queueCursor) {
      await queueCursor.delete();
      queueCursor = await queueCursor.continue();
    }
  }

  await tx.done;
}

/**
 * Clear all offline databases completely (e.g. on full hard reset)
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await getAdmittoDB();
  const tx = db.transaction(
    ['cached_event', 'cached_attendees', 'local_check_ins', 'sync_queue', 'sync_history', 'terminal_metadata'],
    'readwrite'
  );

  await tx.objectStore('cached_event').clear();
  await tx.objectStore('cached_attendees').clear();
  await tx.objectStore('local_check_ins').clear();
  await tx.objectStore('sync_queue').clear();
  await tx.objectStore('sync_history').clear();
  await tx.objectStore('terminal_metadata').clear();

  await tx.done;
}
