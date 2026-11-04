import { supabase } from './supabase';
import { BasketItem } from '../types';

const LOCAL_BASKET_KEY = 'sa_price_compare_basket';
const LOCAL_SYNC_CODE_KEY = 'chuse_sync_code';

export interface SyncStatus {
  isCloudSynced: boolean;
  userId?: string;
  syncCode?: string;
  lastSyncedAt?: string;
}

/**
 * Fetch the latest basket from Supabase Cloud or Local Storage
 */
export async function fetchLatestBasket(): Promise<BasketItem[] | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // 1. If signed in, query user basket row from Supabase
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('baskets')
        .select('items, updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!error && data?.items && Array.isArray(data.items)) {
        localStorage.setItem(LOCAL_BASKET_KEY, JSON.stringify(data.items));
        return data.items as BasketItem[];
      }
    }

    // 2. Fallback to local storage if not logged in or offline
    const local = localStorage.getItem(LOCAL_BASKET_KEY);
    if (local) {
      return JSON.parse(local) as BasketItem[];
    }
  } catch (err) {
    console.warn('[SyncService] Failed to fetch cloud basket:', err);
  }

  return null;
}

/**
 * Push basket changes to Cloud (Supabase) and local storage
 */
export async function pushBasketUpdate(items: BasketItem[]): Promise<void> {
  // Always update local storage first (instant responsiveness)
  localStorage.setItem(LOCAL_BASKET_KEY, JSON.stringify(items));

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // If user is authenticated, sync directly to Supabase baskets table
    if (session?.user?.id) {
      const { error } = await supabase.from('baskets').upsert({
        user_id: session.user.id,
        items,
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.warn('[SyncService] Supabase basket upsert warning:', error.message);
      }
    }
  } catch (err) {
    console.warn('[SyncService] Cloud basket sync failed (local remains safe):', err);
  }
}

/**
 * Realtime listener: Subscribes to Supabase basket updates
 * Whenever cart changes on Web, Mobile app updates instantly!
 */
export function subscribeToBasketUpdates(
  userId: string,
  onUpdate: (items: BasketItem[]) => void
): () => void {
  try {
    const channelName = `basket-sync-${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'baskets',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.new?.items && Array.isArray(payload.new.items)) {
            localStorage.setItem(LOCAL_BASKET_KEY, JSON.stringify(payload.new.items));
            onUpdate(payload.new.items as BasketItem[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[SyncService] Realtime subscription notice:', err);
    return () => {};
  }
}

/**
 * Setup lifecycle listeners so that when mobile app resumes or window focuses,
 * it pulls the freshest cart from cloud.
 */
export function setupAutoSyncOnResume(onSyncNeeded: () => void): () => void {
  const handleFocusOrResume = () => {
    onSyncNeeded();
  };

  window.addEventListener('focus', handleFocusOrResume);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleFocusOrResume();
    }
  });

  return () => {
    window.removeEventListener('focus', handleFocusOrResume);
    document.removeEventListener('visibilitychange', handleFocusOrResume);
  };
}
