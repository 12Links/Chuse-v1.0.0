// src/lib/prices.ts

const metaEnv = (import.meta as any).env || {};
const API_BASE_URL = metaEnv.VITE_API_URL || 'http://localhost:8000';

export async function getPricesForProduct(productId: string) {
  const response = await fetch(`${API_BASE_URL}/prices/${productId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.status}`);
  }
  return response.json();
}
