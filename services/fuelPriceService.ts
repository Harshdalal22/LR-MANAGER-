/**
 * OpenFuel Real-Time Fuel Price Service for India
 * Source: https://github.com/SHN2004/OpenFuel
 * Endpoint: https://raw.githubusercontent.com/SHN2004/OpenFuel/main/prices.json
 * Updates daily at 06:00 AM IST via automated Git Scraping
 */

export interface FuelCityPrice {
    city: string;
    price: number;
}

export interface FuelPriceResponse {
    last_updated_ist: string;
    petrol: FuelCityPrice[];
    diesel: FuelCityPrice[];
    source?: string;
    cached?: boolean;
}

const OPENFUEL_API_URL = 'https://raw.githubusercontent.com/SHN2004/OpenFuel/main/prices.json';
const CACHE_KEY = 'openfuel_prices_cache';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours cache

// Fallback prices in case user is offline or GitHub raw is unreachable
const FALLBACK_PRICES: FuelPriceResponse = {
    last_updated_ist: new Date().toISOString(),
    source: 'offline-fallback',
    diesel: [
        { city: 'New Delhi', price: 95.20 },
        { city: 'Delhi', price: 95.20 },
        { city: 'Gurgaon', price: 95.64 },
        { city: 'Noida', price: 95.75 },
        { city: 'Haryana', price: 95.94 },
        { city: 'Rajasthan', price: 97.78 },
        { city: 'Jaipur', price: 97.78 },
        { city: 'Uttar Pradesh', price: 95.32 },
        { city: 'Lucknow', price: 95.32 },
        { city: 'Maharashtra', price: 97.83 },
        { city: 'Mumbai', price: 97.83 },
        { city: 'Gujarat', price: 98.13 },
        { city: 'Punjab', price: 95.26 },
        { city: 'Chandigarh', price: 89.47 },
        { city: 'Madhya Pradesh', price: 99.64 },
        { city: 'Kolkata', price: 99.82 },
        { city: 'West Bengal', price: 99.82 },
        { city: 'Bangalore', price: 98.80 },
        { city: 'Karnataka', price: 98.80 },
        { city: 'Chennai', price: 99.57 },
        { city: 'Tamil Nadu', price: 99.57 },
        { city: 'Hyderabad', price: 103.82 },
        { city: 'Telangana', price: 103.82 },
        { city: 'Bihar', price: 99.36 },
        { city: 'Patna', price: 99.36 },
        { city: 'Himachal Pradesh', price: 94.43 },
        { city: 'Uttarakhand', price: 95.95 },
        { city: 'Jharkhand', price: 100.49 },
        { city: 'Odisha', price: 100.68 },
    ],
    petrol: [
        { city: 'New Delhi', price: 94.77 },
        { city: 'Delhi', price: 94.77 },
        { city: 'Gurgaon', price: 95.25 },
        { city: 'Noida', price: 94.83 },
        { city: 'Mumbai', price: 103.44 },
        { city: 'Kolkata', price: 104.95 },
        { city: 'Chennai', price: 100.75 },
        { city: 'Haryana', price: 95.25 },
        { city: 'Rajasthan', price: 104.88 },
        { city: 'Uttar Pradesh', price: 94.65 },
        { city: 'Gujarat', price: 96.42 }
    ]
};

/**
 * Fetch daily fuel prices from OpenFuel API with localStorage caching
 */
export async function fetchDailyFuelPrices(forceRefresh = false): Promise<FuelPriceResponse> {
    // 1. Check local cache
    if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
        try {
            const cachedRaw = localStorage.getItem(CACHE_KEY);
            if (cachedRaw) {
                const parsed = JSON.parse(cachedRaw);
                const age = Date.now() - (parsed.cachedAt || 0);
                if (age < CACHE_TTL_MS && parsed.data?.diesel?.length > 0) {
                    return { ...parsed.data, cached: true };
                }
            }
        } catch (e) {
            console.warn('Fuel cache read failed:', e);
        }
    }

    // 2. Fetch fresh prices from OpenFuel GitHub API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout
        
        const response = await fetch(OPENFUEL_API_URL + '?t=' + Date.now(), {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`OpenFuel API returned status ${response.status}`);
        }

        const data: FuelPriceResponse = await response.json();
        
        // Cache result in localStorage
        if (typeof window !== 'undefined' && window.localStorage && data?.diesel?.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                cachedAt: Date.now(),
                data: { ...data, source: 'OpenFuel-API' }
            }));
        }

        return { ...data, source: 'OpenFuel-API', cached: false };
    } catch (err) {
        console.warn('OpenFuel API fetch failed, using fallback/cache:', err);
        // Fallback to previously stored cache or hardcoded prices
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const cachedRaw = localStorage.getItem(CACHE_KEY);
                if (cachedRaw) {
                    const parsed = JSON.parse(cachedRaw);
                    if (parsed.data?.diesel?.length > 0) {
                        return { ...parsed.data, cached: true, source: 'Stale-Cache' };
                    }
                }
            } catch (e) {}
        }
        return FALLBACK_PRICES;
    }
}

/**
 * Get diesel rate for a given city/state or default to New Delhi/Haryana
 */
export function findDieselPrice(prices: FuelPriceResponse, locationQuery = 'Delhi'): { city: string; price: number } {
    if (!prices?.diesel || prices.diesel.length === 0) {
        return { city: 'Delhi', price: 95.20 };
    }

    const query = locationQuery.trim().toLowerCase();
    
    // Exact or partial match
    const match = prices.diesel.find(d => 
        d.city.toLowerCase() === query ||
        d.city.toLowerCase().includes(query) ||
        query.includes(d.city.toLowerCase())
    );

    if (match) return match;

    // Default to Delhi or first entry
    const defaultCity = prices.diesel.find(d => /delhi/i.test(d.city)) || prices.diesel[0];
    return defaultCity || { city: 'Delhi', price: 95.20 };
}

/**
 * Get list of available cities/states for fuel lookup
 */
export function getAvailableFuelLocations(prices: FuelPriceResponse): string[] {
    if (!prices?.diesel) return ['Delhi', 'Haryana', 'Rajasthan', 'Uttar Pradesh', 'Maharashtra', 'Gujarat', 'Punjab'];
    return prices.diesel.map(d => d.city).sort();
}

/**
 * Calculate fuel cost based on liters
 */
export function calculateFuelCostByLiters(liters: number, pricePerLiter: number): number {
    return Math.round(liters * pricePerLiter);
}

/**
 * Calculate trip fuel requirement and cost based on distance and truck mileage
 * @param distanceKm Total distance in Kilometers
 * @param mileageKmpl Average truck mileage (e.g. 3.5 km/l)
 * @param pricePerLiter Current diesel rate (₹/L)
 */
export function calculateTripFuel(distanceKm: number, mileageKmpl: number, pricePerLiter: number): {
    liters: number;
    totalCost: number;
    costPerKm: number;
} {
    const safeMileage = mileageKmpl > 0 ? mileageKmpl : 3.5;
    const liters = Math.round((distanceKm / safeMileage) * 10) / 10;
    const totalCost = Math.round(liters * pricePerLiter);
    const costPerKm = distanceKm > 0 ? Math.round((totalCost / distanceKm) * 100) / 100 : 0;

    return {
        liters,
        totalCost,
        costPerKm
    };
}
