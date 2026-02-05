
import React from 'react';
import { TrashIcon } from './icons';

interface DraftIndicatorProps {
    lastSaved: Date | null;
    onClear: () => void;
    className?: string;
}

export const DraftIndicator: React.FC<DraftIndicatorProps> = ({ lastSaved, onClear, className = '' }) => {
    if (!lastSaved) return null;

    return (
        <div className={`flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm animate-fade-in transition-all duration-300 ${className}`}>
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            <span>
                Draft saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    if (window.confirm('Are you sure you want to discard this draft? unsaved changes will be lost.')) {
                        onClear();
                    }
                }}
                className="ml-2 hover:bg-yellow-200 p-1 rounded-full transition-colors text-yellow-700 hover:text-red-600"
                title="Discard Draft"
            >
                <TrashIcon className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};
