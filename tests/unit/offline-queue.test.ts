import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineQueue } from '../../src/lib/api';
import { OfflineQueuedScan } from '../../src/types';

// Mock localStorage for Node runtime
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) || null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Offline Queue Storage & FIFO Management', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('starts with an empty queue', () => {
    expect(offlineQueue.get()).toEqual([]);
  });

  it('appends queued scans in FIFO order', () => {
    const scan1: OfflineQueuedScan = {
      client_scan_id: 'scan_uuid_001',
      event_id: 'ev_001',
      scanned_value: '1MS21CS001',
      scan_type: 'QR',
      timestamp: new Date().toISOString(),
      retry_count: 0,
    };
    const scan2: OfflineQueuedScan = {
      client_scan_id: 'scan_uuid_002',
      event_id: 'ev_001',
      scanned_value: '1MS21CS002',
      scan_type: 'BARCODE',
      timestamp: new Date().toISOString(),
      retry_count: 0,
    };

    offlineQueue.add(scan1);
    offlineQueue.add(scan2);

    const items = offlineQueue.get();
    expect(items.length).toBe(2);
    expect(items[0].client_scan_id).toBe('scan_uuid_001');
    expect(items[1].client_scan_id).toBe('scan_uuid_002');
  });

  it('removes scan by client_scan_id', () => {
    const scan1: OfflineQueuedScan = {
      client_scan_id: 'scan_uuid_001',
      event_id: 'ev_001',
      scanned_value: '1MS21CS001',
      scan_type: 'QR',
      timestamp: new Date().toISOString(),
      retry_count: 0,
    };
    const scan2: OfflineQueuedScan = {
      client_scan_id: 'scan_uuid_002',
      event_id: 'ev_001',
      scanned_value: '1MS21CS002',
      scan_type: 'BARCODE',
      timestamp: new Date().toISOString(),
      retry_count: 0,
    };

    offlineQueue.add(scan1);
    offlineQueue.add(scan2);

    offlineQueue.removeById('scan_uuid_001');

    const remaining = offlineQueue.get();
    expect(remaining.length).toBe(1);
    expect(remaining[0].client_scan_id).toBe('scan_uuid_002');
  });

  it('clears all queued scans completely upon successful batch sync', () => {
    const scan1: OfflineQueuedScan = {
      client_scan_id: 'scan_uuid_001',
      event_id: 'ev_001',
      scanned_value: '1MS21CS001',
      scan_type: 'QR',
      timestamp: new Date().toISOString(),
      retry_count: 0,
    };
    offlineQueue.add(scan1);
    expect(offlineQueue.get().length).toBe(1);

    offlineQueue.clear();
    expect(offlineQueue.get()).toEqual([]);
  });
});
