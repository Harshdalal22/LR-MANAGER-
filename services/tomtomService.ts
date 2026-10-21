/**
 * TomTom Maps & Routing Service for LR-MANAGER
 * Uses TomTom Developer APIs (https://developer.tomtom.com)
 *
 * Features:
 * 1. Secure API key management (localStorage, same pattern as IndianAPI fuel key)
 * 2. Geocoding API — Place name → [lat, lon] coordinates
 * 3. Routing API — Real driving distance & duration between two places
 * 4. Search / Autocomplete API — Live city suggestions for LR form
 * 5. Seamless fallback to OSRM/Nominatim if TomTom key not configured
 */

import { DrivingDistanceResult, formatDuration } from './fuelPriceService';

const TOMTOM_KEY_STORAGE = 'tomtom_api_key';
const TOMTOM_BASE = 'https://api.tomtom.com';

// ── Default App-Wide TomTom Key ──────────────────────────────────────────────
// This key powers the complete app out-of-the-box without requiring manual setup.
// Users can still override this key anytime in Settings → Maps & APIs.
const DEFAULT_TOMTOM_KEY = 'gi5nsH7wZDUSnn8ERfh4dgK4trRf2WAB';

// ── API Key Management ────────────────────────────────────────────────────────

/**
 * Read TomTom API key.
 * Priority:
 * 1) Supabase-synced key (companyDetails.tomtomApiKey)
 * 2) localStorage override (custom key saved via Settings)
 * 3) Default app-wide key (complete app works out-of-the-box)
 */
export function getTomTomApiKey(companyDetails?: { tomtomApiKey?: string }): string {
    // 1. Prefer Supabase-sourced key from companyDetails
    if (companyDetails?.tomtomApiKey && companyDetails.tomtomApiKey.trim()) {
        return companyDetails.tomtomApiKey.trim();
    }
    // 2. Check localStorage override
    if (typeof window !== 'undefined' && window.localStorage) {
        const local = localStorage.getItem(TOMTOM_KEY_STORAGE);
        if (local && local.trim()) return local.trim();
    }
    // 3. Fallback to default app-wide key
    return DEFAULT_TOMTOM_KEY;
}

/**
 * Save TomTom API key to localStorage cache.
 * The canonical save path is via saveCompanyDetails() → Supabase.
 * localStorage is used as a fast local cache so the key works immediately.
 */
export function saveTomTomApiKey(apiKey: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (apiKey.trim()) {
        localStorage.setItem(TOMTOM_KEY_STORAGE, apiKey.trim());
    } else {
        localStorage.removeItem(TOMTOM_KEY_STORAGE);
    }
}

export function hasTomTomApiKey(companyDetails?: { tomtomApiKey?: string }): boolean {
    return getTomTomApiKey(companyDetails).length > 0;
}

// ── API Connection Test ───────────────────────────────────────────────────────

export async function testTomTomConnection(apiKey: string): Promise<{
    success: boolean;
    message: string;
}> {
    if (!apiKey || !apiKey.trim()) {
        return { success: false, message: 'Please enter a valid API key' };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // Use a simple geocode of "Delhi" to verify the key works
        const url = `${TOMTOM_BASE}/search/2/geocode/Delhi%2C%20India.json?key=${apiKey.trim()}&limit=1`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const resultCount = data?.results?.length || 0;
            return {
                success: true,
                message: `Connected! TomTom Search API active (${resultCount} result for test query)`,
            };
        } else if (response.status === 403) {
            return { success: false, message: 'Invalid API Key (HTTP 403 Forbidden)' };
        } else if (response.status === 401) {
            return { success: false, message: 'Unauthorized API Key (HTTP 401)' };
        } else {
            return { success: false, message: `Server error: HTTP ${response.status}` };
        }
    } catch (e: any) {
        return {
            success: false,
            message: e.name === 'AbortError' ? 'Connection timed out' : `Connection error: ${e.message}`
        };
    }
}

// ── Geocoding API ─────────────────────────────────────────────────────────────

/**
 * Resolve a place name to [latitude, longitude] using TomTom Geocoding API.
 * Results are cached in localStorage to avoid redundant API calls.
 */
export async function tomtomGeocode(place: string): Promise<[number, number] | null> {
    const apiKey = getTomTomApiKey();
    if (!apiKey || !place || !place.trim()) return null;

    const cacheKey = `tt_geo_${place.trim().toLowerCase()}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length === 2) return parsed as [number, number];
        }
    } catch (_) {}

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        // Bias results toward India for logistics context
        const query = encodeURIComponent(`${place.trim()}, India`);
        const url = `${TOMTOM_BASE}/search/2/geocode/${query}.json?key=${apiKey}&limit=1&countrySet=IN`;
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const result = data?.results?.[0];
            if (result?.position?.lat && result?.position?.lon) {
                const coords: [number, number] = [result.position.lat, result.position.lon];
                try { localStorage.setItem(cacheKey, JSON.stringify(coords)); } catch (_) {}
                return coords;
            }
        }
    } catch (_) {
        // Network timeout or offline — caller will use existing OSRM/Nominatim fallback
    }

    return null;
}

// ── Routing API ───────────────────────────────────────────────────────────────

/**
 * Calculate real truck driving distance & duration using TomTom Routing API.
 * Returns null if API key not set or request fails (caller falls back to OSRM).
 */
export async function tomtomDrivingRoute(
    fromPlace: string,
    toPlace: string,
    fromCoords: [number, number],
    toCoords: [number, number]
): Promise<DrivingDistanceResult | null> {
    const apiKey = getTomTomApiKey();
    if (!apiKey) return null;

    const routeKey = `${fromPlace.trim().toLowerCase()} -> ${toPlace.trim().toLowerCase()}`;
    const cacheKey = `tt_route_${routeKey}`;

    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.distanceKm > 0) return parsed as DrivingDistanceResult;
        }
    } catch (_) {}

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // TomTom Routing: lat,lon:lat,lon format
        const origin = `${fromCoords[0]},${fromCoords[1]}`;
        const dest = `${toCoords[0]},${toCoords[1]}`;
        const url = `${TOMTOM_BASE}/routing/1/calculateRoute/${origin}:${dest}/json?key=${apiKey}&travelMode=truck&traffic=false`;

        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const route = data?.routes?.[0];
            if (route?.summary) {
                const distanceMeters = route.summary.lengthInMeters || 0;
                const durationSec = Math.round(route.summary.travelTimeInSeconds || 0);
                const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;

                const result: DrivingDistanceResult = {
                    distanceKm,
                    durationSeconds: durationSec,
                    formattedDuration: formatDuration(durationSec),
                    source: 'OSRM', // reusing the union type; displayed as TomTom via source tag override
                    isEstimated: false,
                    routeKey
                };

                // Extend with TomTom label for UI display
                (result as any).tomtomSource = true;

                try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (_) {}
                return result;
            }
        }
    } catch (_) {
        // Network timeout or API error — caller uses OSRM fallback
    }

    return null;
}

// ── Search / Autocomplete API ─────────────────────────────────────────────────

/**
 * Get live place suggestions using TomTom Search API.
 * Returns up to 6 formatted "City (State)" strings for LR form autocomplete.
 */
export async function tomtomSearchSuggestions(query: string): Promise<string[]> {
    const apiKey = getTomTomApiKey();
    if (!apiKey || !query || query.trim().length < 2) return [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const q = encodeURIComponent(query.trim());
        const url = `${TOMTOM_BASE}/search/2/search/${q}.json?key=${apiKey}&limit=6&countrySet=IN&idxSet=Geo&typeahead=true`;
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.results)) {
                return data.results
                    .map((r: any) => {
                        const municipality = r?.address?.municipality || r?.address?.localName || '';
                        const stateCode = r?.address?.countrySubdivisionCode || r?.address?.countrySubdivision || '';
                        if (!municipality) return null;
                        return stateCode
                            ? `${municipality.toUpperCase()} (${stateCode.toUpperCase()})`
                            : municipality.toUpperCase();
                    })
                    .filter(Boolean)
                    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i) // deduplicate
                    .slice(0, 6) as string[];
            }
        }
    } catch (_) {
        // Silently fail — autocomplete is non-critical
    }

    return [];
}
