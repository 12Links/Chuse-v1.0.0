import { SUPERMARKET_BRANCHES, SupermarketBranch } from '../data/supermarketBranches';
import { StoreId } from '../types';

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  suburbName?: string;
  source?: 'gps' | 'saved' | 'default';
}

export interface BranchWithDistance extends SupermarketBranch {
  distanceKm: number;
  distanceFormatted: string;
  isOpenNow: boolean;
  openStatusLabel: string;
}

export type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'timeout';

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance for clean South African retail UI (e.g. "850 m away" or "1.2 km away")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1.0) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Determines whether a supermarket branch is currently open according to South African Standard Time (SAST, UTC+2)
 */
export function getBranchTradingStatus(hours: { open: string; close: string }): {
  isOpen: boolean;
  label: string;
} {
  try {
    // Current SA time
    const now = new Date();
    // Get SAST time string in HH:mm
    const sastTimeStr = now.toLocaleTimeString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const [currentH, currentM] = sastTimeStr.split(':').map(Number);
    const currentMinutes = currentH * 60 + currentM;

    const [openH, openM] = hours.open.split(':').map(Number);
    const openMinutes = openH * 60 + openM;

    const [closeH, closeM] = hours.close.split(':').map(Number);
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return {
        isOpen: true,
        label: `Open · Closes ${hours.close}`
      };
    } else {
      return {
        isOpen: false,
        label: `Closed · Opens ${hours.open}`
      };
    }
  } catch {
    return {
      isOpen: true,
      label: `Trading: ${hours.open} - ${hours.close}`
    };
  }
}

/**
 * Retrieves the user's current GPS location via HTML5 Geolocation API
 */
export function requestUserLocation(): Promise<UserCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: UserCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        };

        // Cache last known coordinates
        try {
          localStorage.setItem('chuse_user_coordinates', JSON.stringify(coords));
        } catch (e) {
          console.warn('Could not cache coordinates', e);
        }

        resolve(coords);
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access to see supermarkets near you.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS location is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

/**
 * Gets cached user location from local storage or returns Sandton City as default
 */
export function getSavedOrFallbackCoordinates(): UserCoordinates {
  try {
    const cached = localStorage.getItem('chuse_user_coordinates');
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...parsed, source: 'saved' };
    }
  } catch {}

  // Fallback default: Sandton City, Johannesburg
  return {
    lat: -26.1076,
    lng: 28.0526,
    suburbName: 'Sandton City',
    source: 'default'
  };
}

/**
 * Finds all supermarket branches sorted by distance to the user
 */
export function findNearestBranches(
  coords: UserCoordinates,
  options?: {
    storeId?: StoreId | 'all';
    maxDistanceKm?: number;
    limit?: number;
  }
): BranchWithDistance[] {
  const storeFilter = options?.storeId || 'all';
  const maxDistance = options?.maxDistanceKm || 50; // default 50km radius
  const limit = options?.limit || 20;

  const branchesWithDist: BranchWithDistance[] = SUPERMARKET_BRANCHES
    .filter((b) => storeFilter === 'all' || b.storeId === storeFilter)
    .map((b) => {
      const dist = calculateDistanceKm(coords.lat, coords.lng, b.coordinates.lat, b.coordinates.lng);
      const status = getBranchTradingStatus(b.tradingHours);

      return {
        ...b,
        distanceKm: dist,
        distanceFormatted: formatDistance(dist),
        isOpenNow: status.isOpen,
        openStatusLabel: status.label
      };
    })
    .filter((b) => b.distanceKm <= maxDistance)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return branchesWithDist.slice(0, limit);
}

/**
 * Returns the single nearest branch for a specific supermarket chain
 */
export function getNearestBranchForStore(
  coords: UserCoordinates,
  storeId: StoreId
): BranchWithDistance | null {
  const matches = findNearestBranches(coords, { storeId, maxDistanceKm: 100, limit: 1 });
  return matches[0] || null;
}

/**
 * Generates a turn-by-turn Google Maps directions URL
 */
export function getGoogleMapsDirectionsUrl(branch: SupermarketBranch): string {
  const query = encodeURIComponent(`${branch.name}, ${branch.address}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${branch.coordinates.lat},${branch.coordinates.lng}&destination_place_id=${query}`;
}
