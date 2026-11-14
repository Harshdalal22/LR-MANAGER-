import { View } from '../types';

export const VALID_VIEWS: View[] = [
    'dashboard',
    'list',
    'form',
    'vehicle-hiring',
    'booking-register',
    'data-management',
    'parties',
    'trucks',
    'invoices',
    'vouchers',
    'gps-panel',
    'register-manager',
    'reports',
    'accounting',
    'garage'
];

export interface RouteState {
    view: View;
    params: Record<string, string>;
}

/**
 * Parses the current or provided hash into view and query parameters.
 * E.g. "#accounting?tab=expenses" -> { view: 'accounting', params: { tab: 'expenses' } }
 */
export const parseRoute = (hashStr: string = window.location.hash): RouteState => {
    try {
        const clean = hashStr.replace(/^#\/?/, '').trim();
        if (!clean) return { view: 'dashboard', params: {} };
        const [viewPart, queryPart] = clean.split('?');
        const view = (VALID_VIEWS.includes(viewPart as View) ? viewPart : 'dashboard') as View;
        const params: Record<string, string> = {};
        if (queryPart) {
            const sp = new URLSearchParams(queryPart);
            sp.forEach((val, key) => {
                if (val !== undefined && val !== null) {
                    params[key] = val;
                }
            });
        }
        return { view, params };
    } catch {
        return { view: 'dashboard', params: {} };
    }
};

/**
 * Constructs a full hash URL with query parameters.
 * E.g. buildRouteHash('accounting', { tab: 'expenses' }) -> "#accounting?tab=expenses"
 */
export const buildRouteHash = (view: View, params?: Record<string, string | null | undefined>): string => {
    let hash = `#${view}`;
    if (params) {
        const sp = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                sp.set(k, String(v));
            }
        });
        const qs = sp.toString();
        if (qs) {
            hash += `?${qs}`;
        }
    }
    return hash;
};

/**
 * Pushes a new route onto browser history.
 */
export const pushRoute = (view: View, params?: Record<string, string | null | undefined>) => {
    const targetHash = buildRouteHash(view, params);
    if (window.location.hash !== targetHash) {
        window.history.pushState({ view, params: params || {} }, '', targetHash);
    }
};

/**
 * Replaces the current route in browser history without pushing a new entry.
 */
export const replaceRoute = (view: View, params?: Record<string, string | null | undefined>) => {
    const targetHash = buildRouteHash(view, params);
    window.history.replaceState({ view, params: params || {} }, '', targetHash);
};
