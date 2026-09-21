import { getSupabaseClient } from './supabase/client';
import { getApiBaseUrl } from './api';
import { RealtimeScanBroadcast } from '../types';

export type ScanEventCallback = (data: RealtimeScanBroadcast) => void;
export type LogsClearedCallback = (payload: { scanIds?: string[] }) => void;

interface SubscriptionCallbacks {
  onScan: ScanEventCallback;
  onLogsCleared?: LogsClearedCallback;
}

// Rolling deduplication cache to prevent processing the same scan event multiple times
const processedEventIds = new Set<string>();
const MAX_DEDUP_CACHE_SIZE = 300;

function rememberEventId(id: string): boolean {
  if (!id) return false;
  if (processedEventIds.has(id)) return true; // Already processed
  processedEventIds.add(id);
  if (processedEventIds.size > MAX_DEDUP_CACHE_SIZE) {
    const firstItem = processedEventIds.values().next().value;
    if (firstItem) processedEventIds.delete(firstItem);
  }
  return false;
}

// Active Supabase channel references
const activeSupabaseChannels = new Map<string, any>();

/**
 * Subscribes to real-time scanning synchronization for an event.
 * Uses a resilient dual-connection strategy:
 * 1. Supabase Realtime Broadcast & Database changes
 * 2. Backend Server-Sent Events (SSE) stream
 */
export function subscribeToEventSync(
  eventId: string,
  callbacks: SubscriptionCallbacks
): () => void {
  if (!eventId) return () => {};

  let isCleanedUp = false;
  let eventSource: EventSource | null = null;
  const supabase = getSupabaseClient();
  const channelName = `event-sync-${eventId}`;

  // Safe handler that filters duplicates
  const handleIncomingScan = (data: RealtimeScanBroadcast) => {
    if (isCleanedUp || !data) return;
    const eventKey =
      data.id ||
      data.scan?.id ||
      `${data.scan?.scanned_value}-${data.timestamp}-${data.scanner?.id || ''}`;

    if (rememberEventId(eventKey)) {
      return; // Duplicate ignored
    }

    try {
      callbacks.onScan(data);
    } catch (err) {
      console.warn('[RealtimeSync] Error in onScan handler:', err);
    }
  };

  const handleIncomingClear = (payload: { scanIds?: string[] }) => {
    if (isCleanedUp) return;
    try {
      callbacks.onLogsCleared?.(payload);
    } catch (err) {
      console.warn('[RealtimeSync] Error in onLogsCleared handler:', err);
    }
  };

  // 1. Supabase Realtime Subscription
  if (supabase) {
    try {
      let channel = activeSupabaseChannels.get(channelName);
      if (!channel) {
        channel = supabase.channel(channelName, {
          config: { broadcast: { ack: true } },
        });

        channel
          .on('broadcast', { event: 'scan_event' }, (payload: any) => {
            if (payload?.payload) {
              handleIncomingScan(payload.payload);
            }
          })
          .on('broadcast', { event: 'logs_cleared' }, (payload: any) => {
            handleIncomingClear(payload?.payload || {});
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'scan_attempts',
              filter: `event_id=eq.${eventId}`,
            },
            (payload: any) => {
              if (payload?.new) {
                const row = payload.new;
                const broadcastPayload: RealtimeScanBroadcast = {
                  id: row.id,
                  eventId: row.event_id,
                  scan: {
                    id: row.id,
                    event_id: row.event_id,
                    student_id: row.student_id,
                    scanned_value: row.scanned_value,
                    scan_type: row.scan_type,
                    result: row.result,
                    reason: row.reason,
                    scanner_id: row.scanner_id,
                    timestamp: row.timestamp,
                  },
                  scanner: {
                    id: row.scanner_id || 'unknown',
                    name: 'Gate Scanner',
                  },
                  isCheckIn: row.result === 'success',
                  timestamp: row.timestamp,
                };
                handleIncomingScan(broadcastPayload);
              }
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              // Successfully subscribed to Supabase Realtime
            }
          });

        activeSupabaseChannels.set(channelName, channel);
      }
    } catch (supabaseErr) {
      console.warn('[RealtimeSync] Supabase Realtime setup warning:', supabaseErr);
    }
  }

  // 2. Server-Sent Events (SSE) Stream Subscription (guaranteed fallback)
  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
    try {
      const apiBase = getApiBaseUrl();
      const sseUrl = `${apiBase}/api/events/${eventId}/live-stream`;

      eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.onmessage = (event) => {
        if (isCleanedUp || !event?.data) return;
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'SCAN_EVENT') {
            handleIncomingScan(parsed as RealtimeScanBroadcast);
          } else if (parsed.type === 'LOGS_CLEARED') {
            handleIncomingClear({ scanIds: parsed.scanIds });
          }
        } catch {
          // Heartbeats or ping frames are ignored
        }
      };

      eventSource.onerror = () => {
        // SSE handles reconnection automatically
      };
    } catch (sseErr) {
      console.warn('[RealtimeSync] SSE connection warning:', sseErr);
    }
  }

  // Teardown / Unsubscribe
  return () => {
    isCleanedUp = true;
    if (eventSource) {
      try {
        eventSource.close();
      } catch {
        // Ignored
      }
      eventSource = null;
    }
  };
}

/**
 * Broadcasts a completed scan to all connected peers via Supabase Realtime channel.
 */
export async function broadcastEventScan(
  eventId: string,
  data: RealtimeScanBroadcast
): Promise<void> {
  if (!eventId || !data) return;

  // Mark our own scan as already processed so we don't handle our own broadcast reflection
  rememberEventId(data.id);

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const channelName = `event-sync-${eventId}`;
    let channel = activeSupabaseChannels.get(channelName);
    if (!channel) {
      channel = supabase.channel(channelName, {
        config: { broadcast: { ack: true } },
      });
      channel.subscribe();
      activeSupabaseChannels.set(channelName, channel);
    }

    await channel.send({
      type: 'broadcast',
      event: 'scan_event',
      payload: data,
    });
  } catch (err) {
    console.warn('[RealtimeSync] Failed to broadcast scan event via Supabase:', err);
  }
}

/**
 * Broadcasts logs cleared event to all peers.
 */
export async function broadcastEventLogsCleared(
  eventId: string,
  scanIds?: string[]
): Promise<void> {
  if (!eventId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const channelName = `event-sync-${eventId}`;
    const channel = activeSupabaseChannels.get(channelName);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'logs_cleared',
        payload: { scanIds },
      });
    }
  } catch (err) {
    console.warn('[RealtimeSync] Failed to broadcast logs cleared event:', err);
  }
}
