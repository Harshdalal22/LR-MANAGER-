
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UseAutoSaveOptions {
    enabled?: boolean;
    debounceMs?: number;
    version?: string;
    onRestore?: () => void;
}

interface UseAutoSaveReturn<T> {
    hasDraft: boolean;
    lastSaved: Date | null;
    clearDraft: () => void;
    restoreDraft: () => T | null;
}

export function useAutoSave<T>(
    key: string,
    data: T,
    { enabled = true, debounceMs = 1000, version = '1.0' }: UseAutoSaveOptions = {}
): UseAutoSaveReturn<T> {
    const [hasDraft, setHasDraft] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const isInitialMount = useRef(true);

    // Provide detailed fallback for JSON.stringify to handle complex objects
    const safeStringify = (obj: any): string => {
        try {
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (value instanceof Set) return Array.from(value);
                    if (value instanceof Map) return Object.fromEntries(value);
                }
                return value;
            });
        } catch (error) {
            console.error('AutoSave: Failed to stringify data', error);
            return '';
        }
    };

    // Check for existing draft on mount
    useEffect(() => {
        try {
            const savedItem = localStorage.getItem(key);
            if (savedItem) {
                const parsed = JSON.parse(savedItem);

                // Only consider it a valid draft if versions match
                // If version is not present in savedItem (legacy), we might still want it if no version specified
                const savedVersion = parsed._version || '1.0';

                if (savedVersion === version) {
                    setHasDraft(true);
                    setLastSaved(new Date(parsed._timestamp));
                }
            }
        } catch (error) {
            console.error('AutoSave: Failed to check drafts', error);
        }
    }, [key, version]);

    // Save effect with debounce
    useEffect(() => {
        if (!enabled || isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            try {
                const dataToSave = {
                    ...data,
                    _timestamp: new Date().toISOString(),
                    _version: version
                };

                const stringData = safeStringify(dataToSave);
                if (!stringData) return;

                localStorage.setItem(key, stringData);
                setLastSaved(new Date());
                setHasDraft(true);

                // Optional: Console log for debugging
                // console.log(`AutoSaved draft for ${key} at ${new Date().toLocaleTimeString()}`);

            } catch (error) {
                console.error('AutoSave: Save failed', error);
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    toast.error('Draft auto-save failed: storage full', { id: 'autosave-quota' });
                }
            }
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, key, enabled, debounceMs, version]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(key);
            setHasDraft(false);
            setLastSaved(null);
        } catch (error) {
            console.error('AutoSave: Clear failed', error);
        }
    }, [key]);

    const restoreDraft = useCallback((): T | null => {
        try {
            const savedItem = localStorage.getItem(key);
            if (!savedItem) return null;

            const parsed = JSON.parse(savedItem);

            // Remove metadata fields before returning
            const { _timestamp, _version, ...cleanData } = parsed;

            return cleanData as T;
        } catch (error) {
            console.error('AutoSave: Restore failed', error);
            toast.error('Failed to restore draft');
            return null;
        }
    }, [key]);

    return { hasDraft, lastSaved, clearDraft, restoreDraft };
}
