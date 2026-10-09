import React from 'react';
import { SavedTruck, LorryReceipt, Voucher } from '../types';
import TruckGarage from './TruckGarage';

interface TruckManagementProps {
    savedTrucks: SavedTruck[];
    lorryReceipts?: LorryReceipt[];
    vouchers?: Voucher[];
    onSave: (truck: SavedTruck) => Promise<void>;
    onDelete: (id: string, truckNo?: string) => Promise<void>;
    onBack: () => void;
    onNavigateToExpenses?: (truckNo: string) => void;
}

const TruckManagement: React.FC<TruckManagementProps> = ({
    savedTrucks,
    lorryReceipts = [],
    vouchers = [],
    onSave,
    onDelete,
    onBack,
    onNavigateToExpenses
}) => {
    return (
        <TruckGarage
            savedTrucks={savedTrucks}
            lorryReceipts={lorryReceipts}
            vouchers={vouchers}
            onSaveTruck={onSave}
            onDeleteTruck={onDelete}
            onBack={onBack}
            onNavigateToExpenses={onNavigateToExpenses}
        />
    );
};

export default TruckManagement;
