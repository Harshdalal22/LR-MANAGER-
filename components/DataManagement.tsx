
import React, { useState, useEffect, useMemo } from 'react';
import { DashboardIcon, CheckCircleIcon, SearchIcon, PlusIcon, DownloadIcon, UploadIcon, PrintIcon, PencilIcon, TrashIcon, DocumentTextIcon, ArrowLeftIcon } from './icons';
import { toast } from 'react-hot-toast';
import { getVehicleHirings, getBookingRecords, getSavedParties, getSavedTrucks, deleteVehicleHiring, deleteBookingRecord, deleteSavedParty, deleteSavedTruck } from '../services/supabaseService';
import { VehicleHiring, BookingRecord, SavedParty, SavedTruck } from '../types';

interface DataManagementProps {
    onBack: () => void;
}

type Tab = 'vehicle-hiring' | 'booking-register' | 'customer-details' | 'vehicle-fleet' | 'database-setup';

const DataManagement: React.FC<DataManagementProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('vehicle-hiring');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Data States
    const [hirings, setHirings] = useState<VehicleHiring[]>([]);
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [parties, setParties] = useState<SavedParty[]>([]);
    const [trucks, setTrucks] = useState<SavedTruck[]>([]);

    // SQL Script State
    const [copied, setCopied] = useState(false);
    const sqlScript = `
-- 🛠️ DATABASE FIX FOR BILTY BOOK
-- Run this in your Supabase SQL Editor to fix "Could not find column" errors.

-- 1. Add missing column for Invoice Generation
-- Note: Database uses snake_case: is_invoice_generated
ALTER TABLE public.lorry_receipts 
ADD COLUMN IF NOT EXISTS is_invoice_generated BOOLEAN DEFAULT FALSE;

-- 2. Ensure other status columns exist
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS pod_path TEXT;

-- 3. 🚨 CRITICAL: Refresh Schema Cache
-- This tells the API about the new columns. Without this, you will still see errors.
NOTIFY pgrst, 'reload config';

-- 4. Re-Apply Security Policy (Ensure user access)
ALTER TABLE public.lorry_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own LRs" ON public.lorry_receipts;
CREATE POLICY "Users can manage their own LRs" ON public.lorry_receipts 
FOR ALL USING (auth.uid() = user_id);
    `.trim();

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            switch (activeTab) {
                case 'vehicle-hiring':
                    setHirings(await getVehicleHirings());
                    break;
                case 'booking-register':
                    setBookings(await getBookingRecords());
                    break;
                case 'customer-details':
                    setParties(await getSavedParties());
                    break;
                case 'vehicle-fleet':
                    setTrucks(await getSavedTrucks());
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlScript);
        setCopied(true);
        toast.success('SQL Script copied! Run it in your Supabase Dashboard.');
        setTimeout(() => setCopied(false), 3000);
    };
    
    const handleDelete = async (id: string, type: 'hiring' | 'booking' | 'party' | 'truck') => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            if (type === 'hiring') {
                await deleteVehicleHiring(id);
                setHirings(prev => prev.filter(i => i.id !== id));
            } else if (type === 'booking') {
                await deleteBookingRecord(id);
                setBookings(prev => prev.filter(i => i.id !== id));
            } else if (type === 'party') {
                await deleteSavedParty(id);
                setParties(prev => prev.filter(i => i.id !== id));
            } else if (type === 'truck') {
                await deleteSavedTruck(id);
                setTrucks(prev => prev.filter(i => i.id !== id));
            }
            toast.success('Deleted successfully');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const renderTableContent = () => {
        if (isLoading) return <div className="p-8 text-center text-gray-500">Loading data...</div>;

        if (activeTab === 'vehicle-hiring') {
            const filtered = hirings.filter(h => 
                h.lorryNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                h.grNo.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-gray-700">
                        <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 border-r">Date</th>
                                <th className="px-3 py-3 border-r">GR Number</th>
                                <th className="px-3 py-3 border-r">Lorry Number</th>
                                <th className="px-3 py-3 border-r">Route</th>
                                <th className="px-3 py-3 border-r">Freight</th>
                                <th className="px-3 py-3 border-r">Total Balance</th>
                                <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="p-4 text-center text-gray-500 italic">No records found. Run database setup if tables are missing.</td></tr>
                            ) : filtered.map(r => (
                                <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2 border-r whitespace-nowrap">{r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-'}</td>
                                    <td className="px-3 py-2 border-r">{r.grNo}</td>
                                    <td className="px-3 py-2 border-r font-bold">{r.lorryNo}</td>
                                    <td className="px-3 py-2 border-r text-xs">{r.fromPlace} → {r.toPlace}</td>
                                    <td className="px-3 py-2 border-r text-right">₹{r.freight}</td>
                                    <td className="px-3 py-2 border-r text-right font-bold text-red-600">₹{r.totalBalance}</td>
                                    <td className="px-3 py-2 text-center">
                                         <button onClick={() => r.id && handleDelete(r.id, 'hiring')} className="p-1 hover:bg-gray-100 rounded text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (activeTab === 'booking-register') {
            const filtered = bookings.filter(b => 
                b.partyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                b.grNo.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-gray-700">
                        <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 border-r">Date</th>
                                <th className="px-3 py-3 border-r">Party Name</th>
                                <th className="px-3 py-3 border-r">GR Number</th>
                                <th className="px-3 py-3 border-r">Route</th>
                                <th className="px-3 py-3 border-r">Freight</th>
                                <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="p-4 text-center text-gray-500 italic">No records found. Run database setup if tables are missing.</td></tr>
                            ) : filtered.map(r => (
                                <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2 border-r whitespace-nowrap">{r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-'}</td>
                                    <td className="px-3 py-2 border-r font-medium">{r.partyName}</td>
                                    <td className="px-3 py-2 border-r">{r.grNo}</td>
                                    <td className="px-3 py-2 border-r text-xs">{r.fromPlace} - {r.toPlace}</td>
                                    <td className="px-3 py-2 border-r text-right">₹{r.freight}</td>
                                    <td className="px-3 py-2 text-center">
                                         <button onClick={() => r.id && handleDelete(r.id, 'booking')} className="p-1 hover:bg-gray-100 rounded text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        
        if (activeTab === 'customer-details') {
            const filtered = parties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-gray-700">
                        <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 border-r">Party Name</th>
                                <th className="px-3 py-3 border-r">Type</th>
                                <th className="px-3 py-3 border-r">City</th>
                                <th className="px-3 py-3 border-r">GSTIN</th>
                                <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                             {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500 italic">No records found. Run database setup if tables are missing.</td></tr>
                            ) : filtered.map(p => (
                                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2 border-r font-bold">{p.name}</td>
                                    <td className="px-3 py-2 border-r">{p.type}</td>
                                    <td className="px-3 py-2 border-r">{p.city}</td>
                                    <td className="px-3 py-2 border-r">{p.gst}</td>
                                    <td className="px-3 py-2 text-center">
                                         <button onClick={() => p.id && handleDelete(p.id, 'party')} className="p-1 hover:bg-gray-100 rounded text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (activeTab === 'vehicle-fleet') {
            const filtered = trucks.filter(t => t.truckNo.toLowerCase().includes(searchTerm.toLowerCase()));
            return (
                <div className="overflow-x-auto">
                     <table className="w-full text-xs text-left text-gray-700">
                        <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 border-r">Truck No</th>
                                <th className="px-3 py-3 border-r">Owner Name</th>
                                <th className="px-3 py-3 border-r">Contact Number</th>
                                <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                         <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-gray-500 italic">No records found. Run database setup if tables are missing.</td></tr>
                            ) : filtered.map(t => (
                                <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2 border-r font-bold font-mono">{t.truckNo}</td>
                                    <td className="px-3 py-2 border-r">{t.ownerName}</td>
                                    <td className="px-3 py-2 border-r">{t.contactNumber}</td>
                                    <td className="px-3 py-2 text-center">
                                         <button onClick={() => t.id && handleDelete(t.id, 'truck')} className="p-1 hover:bg-gray-100 rounded text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
            );
        }

        return <div className="p-8 text-center text-gray-500">Select a tab to view records.</div>;
    };

    const getRecordCount = () => {
        switch(activeTab) {
            case 'vehicle-hiring': return hirings.length;
            case 'booking-register': return bookings.length;
            case 'customer-details': return parties.length;
            case 'vehicle-fleet': return trucks.length;
            default: return 0;
        }
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg min-h-[600px] border border-gray-200">
            <div className="flex flex-col gap-1 mb-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-all group" title="Back">
                             <ArrowLeftIcon className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
                    </div>
                 </div>
                 <p className="text-sm text-gray-500 ml-11">View, manage, and fix database schema errors</p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6 bg-gray-50/50 p-1 rounded-t-lg">
                {[
                    { id: 'vehicle-hiring', label: 'Vehicle Hiring' },
                    { id: 'booking-register', label: 'Booking Register' },
                    { id: 'customer-details', label: 'Customer Details' },
                    { id: 'vehicle-fleet', label: 'Vehicle Fleet' },
                    { id: 'database-setup', label: 'Database Setup' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${
                            activeTab === tab.id
                                ? 'bg-white border-blue-600 text-blue-700 shadow-sm'
                                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'database-setup' ? (
                <div className="space-y-6">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <CheckCircleIcon className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-bold">
                                    Database Update Required
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    To fix the "isInvoiceGenerated" error, copy and run the script below in your Supabase SQL Editor.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Fix SQL Script</h3>
                            <button 
                                onClick={handleCopy}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                            >
                                {copied ? <CheckCircleIcon className="w-5 h-5"/> : null}
                                {copied ? 'Copied!' : 'Copy Fix Script'}
                            </button>
                        </div>
                        
                        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[400px] border border-gray-700 shadow-inner group relative">
                            <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{sqlScript}</pre>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="relative mb-6">
                        <input
                            type="text"
                            placeholder={`Search ${activeTab.replace(/-/g, ' ')}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                {activeTab.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{getRecordCount()}</span>
                            </h3>
                        </div>

                        <div className="min-h-[300px]">
                            {renderTableContent()}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DataManagement;
