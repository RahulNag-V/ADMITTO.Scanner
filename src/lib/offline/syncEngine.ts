import { getAdmittoDB, purgeEventOfflineData } from './idb';
import { apiFetch } from '../api';
import { SyncQueueItem, SyncHistoryItem, BatchSyncResponse } from './types';
import { getOrCreateDeviceUuid } from './security';

export interface SyncEngineStatus {
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

type SyncListener = (status: SyncEngineStatus) => void;
type RevocationListener = () => void;

class SyncEngine {
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private listeners: Set<SyncListener> = new Set();
  private revocationListeners: Set<RevocationListener> = new Set();
  private lastSyncAt: string | null = null;
  private lastError: string | null = null;
  private activeEventId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.activeEventId) {
          this.triggerSync(this.activeEventId);
        }
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.emitStatus();
    return () => this.listeners.delete(listener);
  }

  public onRevocation(listener: RevocationListener): () => void {
    this.revocationListeners.add(listener);
    return () => this.revocationListeners.delete(listener);
  }

  public setActiveEvent(eventId: string | null) {
    this.activeEventId = eventId;
    if (eventId) {
      this.startPeriodicSync(eventId);
    } else {
      this.stopPeriodicSync();
    }
    this.emitStatus();
  }

  public startPeriodicSync(eventId: string) {
    this.stopPeriodicSync();
    this.activeEventId = eventId;
    // Check queue immediately then every 20 seconds
    this.triggerSync(eventId);
    this.syncTimer = setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        this.triggerSync(eventId);
      }
    }, 20000);
  }

  public stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public async getQueueStatus(eventId?: string): Promise<{ pending: number; syncing: number; conflicts: number; synced: number }> {
    try {
      const db = await getAdmittoDB();
      const tx = db.transaction(['sync_queue', 'sync_history'], 'readonly');
      const queueStore = tx.objectStore('sync_queue');
      const historyStore = tx.objectStore('sync_history');

      const allQueue = await queueStore.getAll();
      const allHistory = await historyStore.getAll();

      const filteredQueue = eventId ? allQueue.filter((i) => i.event_id === eventId) : allQueue;
      const filteredHistory = eventId ? allHistory.filter((i) => i.event_id === eventId) : allHistory;

      const pending = filteredQueue.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length;
      const syncing = filteredQueue.filter((i) => i.status === 'SYNCING').length;
      const conflicts = filteredHistory.filter((i) => i.status === 'CONFLICT').length;
      const synced = filteredHistory.filter((i) => i.status === 'SYNCED').length;

      return { pending, syncing, conflicts, synced };
    } catch {
      return { pending: 0, syncing: 0, conflicts: 0, synced: 0 };
    }
  }

  private async emitStatus() {
    const counts = await this.getQueueStatus(this.activeEventId || undefined);
    const status: SyncEngineStatus = {
      isSyncing: this.isSyncing,
      pendingCount: counts.pending,
      syncedCount: counts.synced,
      conflictCount: counts.conflicts,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
    this.listeners.forEach((l) => l(status));
  }

  /**
   * Calculate exponential backoff with randomized jitter
   */
  private getBackoffMs(retryCount: number): number {
    const baseMs = 1000; // 1s
    const maxMs = 30000; // 30s
    const exponential = Math.min(maxMs, baseMs * Math.pow(2, retryCount));
    const jitter = exponential * 0.2 * (Math.random() * 2 - 1); // +/- 20%
    return Math.max(1000, Math.floor(exponential + jitter));
  }

  /**
   * Trigger synchronization for an event
   */
  public async triggerSync(eventId: string): Promise<{ synced: number; conflicts: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, conflicts: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, conflicts: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.emitStatus();

    let totalSynced = 0;
    let totalConflicts = 0;
    let totalFailed = 0;

    try {
      const db = await getAdmittoDB();
      const deviceUuid = await getOrCreateDeviceUuid();

      // Retrieve items eligible for sync (PENDING or FAILED with expired backoff)
      const allQueueItems = await db.getAll('sync_queue');
      const now = Date.now();

      const eligibleItems = allQueueItems.filter((item) => {
        if (item.event_id !== eventId) return false;
        if (item.status === 'PENDING') return true;
        if (item.status === 'FAILED') {
          const lastAttempt = item.last_attempt_at ? new Date(item.last_attempt_at).getTime() : 0;
          const backoff = this.getBackoffMs(item.retry_count);
          return now - lastAttempt >= backoff;
        }
        return false;
      });

      if (eligibleItems.length === 0) {
        this.isSyncing = false;
        this.emitStatus();
        return { synced: 0, conflicts: 0, failed: 0 };
      }

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < eligibleItems.length; i += batchSize) {
        const batch = eligibleItems.slice(i, i + batchSize);

        // Mark batch as SYNCING in IndexedDB
        const markTx = db.transaction('sync_queue', 'readwrite');
        for (const item of batch) {
          item.status = 'SYNCING';
          item.last_attempt_at = new Date().toISOString();
          await markTx.objectStore('sync_queue').put(item);
        }
        await markTx.done;
        this.emitStatus();

        try {
          const response = await apiFetch<BatchSyncResponse>('/api/scan/batch-sync', {
            method: 'POST',
            body: JSON.stringify({
              eventId,
              deviceUuid,
              scans: batch.map((b) => ({
                client_scan_id: b.client_scan_id,
                scanned_value: b.scanned_value,
                scan_type: b.scan_type,
              })),
            }),
          });

          // Process each individual result
          const processTx = db.transaction(['sync_queue', 'sync_history'], 'readwrite');
          const queueStore = processTx.objectStore('sync_queue');
          const historyStore = processTx.objectStore('sync_history');

          const resultMap = new Map(response.results.map((r) => [r.client_scan_id, r]));

          for (const item of batch) {
            const res = resultMap.get(item.client_scan_id);

            if (!res) {
              // Server did not acknowledge this specific item, mark FAILED for retry
              item.status = 'FAILED';
              item.retry_count += 1;
              item.error_message = 'Missing from server response acknowledgment';
              await queueStore.put(item);
              totalFailed++;
              continue;
            }

            if (res.status === 'POST_SYNC_DUPLICATE_CONFLICT') {
              // Conflict: Attendee was checked in by another scanner before sync arrived
              totalConflicts++;
              const historyItem: SyncHistoryItem = {
                id: 'hist_' + item.client_scan_id,
                client_scan_id: item.client_scan_id,
                event_id: item.event_id,
                student_id: item.student_id,
                student_name: res.student?.name,
                scanned_value: item.scanned_value,
                scan_type: item.scan_type,
                status: 'CONFLICT',
                conflict_reason: res.conflict_reason || res.message,
                synced_at: new Date().toISOString(),
              };
              await historyStore.put(historyItem);
              await queueStore.delete(item.client_scan_id);
            } else if (res.success || res.status === 'SUCCESS' || res.status === 'IDEMPOTENT_SUCCESS') {
              // Definitive success
              totalSynced++;
              const historyItem: SyncHistoryItem = {
                id: 'hist_' + item.client_scan_id,
                client_scan_id: item.client_scan_id,
                event_id: item.event_id,
                student_id: item.student_id,
                student_name: res.student?.name,
                scanned_value: item.scanned_value,
                scan_type: item.scan_type,
                status: 'SYNCED',
                synced_at: new Date().toISOString(),
              };
              await historyStore.put(historyItem);
              await queueStore.delete(item.client_scan_id);
            } else {
              // Item-level error
              item.status = 'FAILED';
              item.retry_count += 1;
              item.error_code = res.status;
              item.error_message = res.message;
              await queueStore.put(item);
              totalFailed++;
            }
          }

          await processTx.done;
          this.lastSyncAt = new Date().toISOString();
          this.lastError = null;
        } catch (batchErr: any) {
          console.error('[SyncEngine] Batch sync network or server error:', batchErr);
          this.lastError = batchErr.message || 'Batch sync failed';

          // Handle Scanner Revocation: 403 SCANNER_REVOKED
          if (batchErr.status === 403 || batchErr.message?.includes('revoked') || batchErr.code === 'SCANNER_REVOKED') {
            await purgeEventOfflineData(eventId, false);
            this.revocationListeners.forEach((l) => l());
            throw batchErr;
          }

          // Mark batch as FAILED to retry with exponential backoff
          const failTx = db.transaction('sync_queue', 'readwrite');
          for (const item of batch) {
            item.status = 'FAILED';
            item.retry_count += 1;
            item.error_message = batchErr.message;
            await failTx.objectStore('sync_queue').put(item);
          }
          await failTx.done;
          totalFailed += batch.length;
        }
      }
    } catch (err: any) {
      console.error('[SyncEngine] Sync error:', err);
      this.lastError = err.message || 'Sync failed';
    } finally {
      this.isSyncing = false;
      this.emitStatus();
    }

    return { synced: totalSynced, conflicts: totalConflicts, failed: totalFailed };
  }
}

export const syncEngine = new SyncEngine();
