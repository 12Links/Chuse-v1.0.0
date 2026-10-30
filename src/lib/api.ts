import { supabase } from './supabase';

const API_BASE_URL = '';

/**
 * Make an authenticated request to the backend API with Supabase access token
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || localStorage.getItem('supabase_token') || localStorage.getItem('sa_access_token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Sync user profile with backend after Supabase authentication
 */
export async function syncUserProfile(uid: string, userProfile: any): Promise<any> {
  return apiRequest('/api/v1/auth/sync-profile', {
    method: 'POST',
    body: JSON.stringify(userProfile),
  });
}

/**
 * Register a new user with the backend
 */
export async function registerUser(
  uid: string,
  email: string,
  displayName: string,
  province: string
): Promise<any> {
  return fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      email,
      displayName,
      loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
      preferredStoreLocation: province,
    }),
  }).then(res => {
    if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
    return res.json();
  });
}

/**
 * Get current user profile from backend
 */
export async function getCurrentUserProfile(): Promise<any | null> {
  try {
    return await apiRequest('/api/v1/users/me', {
      method: 'GET',
    });
  } catch (error: any) {
    if (error?.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Update user profile on backend
 */
export async function updateUserProfile(updates: {
  displayName?: string;
  avatarUrl?: string;
  loyaltyCards?: Record<string, boolean>;
  preferredStoreLocation?: string;
}): Promise<any> {
  return apiRequest('/api/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Sync the current basket to the backend
 */
export async function syncBasket(items: Array<{ productId: string; quantity: number }>): Promise<any> {
  return apiRequest('/api/v1/basket/sync', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

/**
 * Perform login - sync profile with backend after Supabase login
 */
export async function loginUser(uid: string, email: string): Promise<any> {
  return apiRequest('/api/v1/auth/sync-profile', {
    method: 'POST',
    body: JSON.stringify({ uid, email }),
  });
}
