
import React, { useState, useEffect, useRef } from 'react';
import { DashboardIcon, CheckCircleIcon, SearchIcon, PlusIcon, DownloadIcon, UploadIcon, PrintIcon, PencilIcon, TrashIcon, DocumentTextIcon, ArrowLeftIcon } from './icons';
import { toast } from 'react-hot-toast';
import {
    getVehicleHirings, getBookingRecords, getSavedParties, getSavedTrucks,
    deleteVehicleHiring, deleteBookingRecord, deleteSavedParty, deleteSavedTruck,
    saveVehicleHiring, saveBookingRecord, saveSavedParty, saveSavedTruck
} from '../services/supabaseService';
import { VehicleHiring, BookingRecord, SavedParty, SavedTruck } from '../types';
import * as XLSX from 'xlsx';

interface DataManagementProps {
    onBack: () => void;
}

type Tab = 'vehicle-hiring' | 'booking-register' | 'customer-details' | 'vehicle-fleet' | 'database-setup';

const DataManagement: React.FC<DataManagementProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('database-setup');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data States
    const [hirings, setHirings] = useState<VehicleHiring[]>([]);
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [parties, setParties] = useState<SavedParty[]>([]);
    const [trucks, setTrucks] = useState<SavedTruck[]>([]);

    // SQL Script State
    const [copied, setCopied] = useState(false);
    const sqlScript = `
-- ================================================================================
-- 🛠️ COMPLETE DATABASE FIX SCRIPT (FIXES SCHEMA & 403 PERMISSION ERRORS)
-- ================================================================================
-- Run this ENTIRE script in your Supabase SQL Editor.
-- ================================================================================

-- === STEP 1: ADD/FIX COLUMNS & CONSTRAINTS ===

ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceNo" TEXT;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceAmount" NUMERIC;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "poDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "ewayBillDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "ewayExDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS is_invoice_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS pod_path TEXT;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS consignor JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS consignee JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "billingTo" JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS charges JSONB;

-- This might fail if the constraint already exists, which is safe to ignore.
-- ALTER TABLE public.lorry_receipts ADD CONSTRAINT "lorry_receipts_lrNo_key" UNIQUE ("lrNo");

ALTER TABLE public.lorry_receipts ALTER COLUMN "invoiceDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "poDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayBillDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayExDate" DROP NOT NULL;

-- === STEP 2: APPLY ROW LEVEL SECURITY (RLS) POLICIES TO FIX 403 ERRORS ===

-- This ensures you can only access your own data.
-- Apply to ALL tables that store user-specific information.

-- Table: lorry_receipts
ALTER TABLE public.lorry_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own LRs" ON public.lorry_receipts;
CREATE POLICY "Users can manage their own LRs" ON public.lorry_receipts FOR ALL
USING (auth.uid() = user_id);

-- Table: company_details
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own company details" ON public.company_details;
CREATE POLICY "Users can manage their own company details" ON public.company_details FOR ALL
USING (auth.uid() = user_id);

-- Table: saved_parties
ALTER TABLE public.saved_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved parties" ON public.saved_parties;
CREATE POLICY "Users can manage their own saved parties" ON public.saved_parties FOR ALL
USING (auth.uid() = user_id);

-- Table: saved_trucks
ALTER TABLE public.saved_trucks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved trucks" ON public.saved_trucks;
CREATE POLICY "Users can manage their own saved trucks" ON public.saved_trucks FOR ALL
USING (auth.uid() = user_id);

-- Table: vehicle_hirings
ALTER TABLE public.vehicle_hirings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own vehicle hirings" ON public.vehicle_hirings;
CREATE POLICY "Users can manage their own vehicle hirings" ON public.vehicle_hirings FOR ALL
USING (auth.uid() = user_id);

-- Table: booking_registers
ALTER TABLE public.booking_registers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own booking records" ON public.booking_registers;
CREATE POLICY "Users can manage their own booking records" ON public.booking_registers FOR ALL
USING (auth.uid() = user_id);


-- === STEP 3: REFRESH SCHEMA CACHE ===
NOTIFY pgrst, 'reload config';

-- === STEP 4: ADD MISSING ASSET COLUMNS ===
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

-- === STEP 5: CREATE STORAGE BUCKETS ===

-- Create 'company_assets' bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company_assets', 'company_assets', true) 
ON CONFLICT (id) DO NOTHING;

-- Create 'pods' bucket if not exists (for Proof of Delivery)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pods', 'pods', true) 
ON CONFLICT (id) DO NOTHING;

-- === STEP 6: STORAGE POLICIES (Fixes "Permission denied" on upload) ===

-- 1. Policies for 'company_assets'
DROP POLICY IF EXISTS "Give users access to own folder 1" ON storage.objects;
CREATE POLICY "Give users access to own folder 1" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "Give users access to own folder 2" ON storage.objects;
CREATE POLICY "Give users access to own folder 2" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "Give public access to company_assets" ON storage.objects;
CREATE POLICY "Give public access to company_assets" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'company_assets');

-- 2. Policies for 'pods'
DROP POLICY IF EXISTS "Give users access to pods insert" ON storage.objects;
CREATE POLICY "Give users access to pods insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pods');

DROP POLICY IF EXISTS "Give users access to pods select" ON storage.objects;
CREATE POLICY "Give users access to pods select" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'pods');

DROP POLICY IF EXISTS "Give users access to pods delete" ON storage.objects;
CREATE POLICY "Give users access to pods delete" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'pods');
    `.trim();

    useEffect(() => {
        if (activeTab !== 'database-setup') {
            fetchData();
        }
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

    const handleExport = () => {
        let data: any[] = [];
        let filename = '';

        switch (activeTab) {
            case 'vehicle-hiring':
                data = hirings.map(h => ({
                    Date: h.date,
                    'GR Number': h.grNo,
                    'Lorry Number': h.lorryNo,
                    'From': h.fromPlace,
                    'To': h.toPlace,
                    'Freight': h.freight,
                    'Other Expenses': h.otherExpenses,
                    'Advance': h.advance,
                    'Total Balance': h.totalBalance,
                    'Owner Name': h.ownerName
                }));
                filename = 'Vehicle_Hiring_Data';
                break;
            case 'booking-register':
                data = bookings.map(b => ({
                    Date: b.date,
                    'Party Name': b.partyName,
                    'GR Number': b.grNo,
                    'From': b.fromPlace,
                    'To': b.toPlace,
                    'Weight': b.weight,
                    'Freight': b.freight,
                    'Other Expenses': b.otherExpenses
                }));
                filename = 'Booking_Register_Data';
                break;
            case 'customer-details':
                data = parties.map(p => ({
                    'Party Name': p.name,
                    'Type': p.type,
                    'Address': p.address,
                    'City': p.city,
                    'GSTIN': p.gst,
                    'Contact': p.contact
                }));
                filename = 'Customer_Details';
                break;
            case 'vehicle-fleet':
                data = trucks.map(t => ({
                    'Truck Number': t.truckNo,
                    'Owner Name': t.ownerName,
                    'Contact Number': t.contactNumber
                }));
                filename = 'Vehicle_Fleet_Data';
                break;
            default:
                return;
        }

        if (data.length === 0) {
            toast.error("No data to export");
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel exported successfully!");
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset
            fileInputRef.current.click();
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading("Reading file...");

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

            if (jsonData.length === 0) {
                toast.error("File is empty", { id: toastId });
                setIsImporting(false);
                return;
            }

            let successCount = 0;

            if (activeTab === 'vehicle-hiring') {
                for (const row of jsonData) {
                    const hiring: VehicleHiring = {
                        date: row['Date'] || new Date().toISOString().split('T')[0],
                        lorryNo: row['Lorry Number'] || row['Truck Number'] || '',
                        grNo: row['GR Number'] || '',
                        billNo: row['Bill Number'] || '',
                        driverNo: row['Driver Number'] || '',
                        ownerName: row['Owner Name'] === 'Self' ? 'Self' : 'Third Party',
                        fromPlace: row['From'] || '',
                        toPlace: row['To'] || '',
                        freight: Number(row['Freight']) || 0,
                        otherExpenses: Number(row['Other Expenses']) || 0,
                        advance: Number(row['Advance']) || 0,
                        balance: 0,
                        totalBalance: Number(row['Total Balance']) || 0,
                        podStatus: 'Pending',
                        paymentStatus: 'Pending'
                    };

                    // Simple calc
                    hiring.balance = hiring.freight + hiring.otherExpenses - hiring.advance;
                    if (!hiring.totalBalance) hiring.totalBalance = hiring.balance;

                    if (hiring.lorryNo) {
                        await saveVehicleHiring(hiring);
                        successCount++;
                    }
                }
            } else if (activeTab === 'booking-register') {
                for (const row of jsonData) {
                    const booking: BookingRecord = {
                        date: row['Date'] || new Date().toISOString().split('T')[0],
                        partyName: row['Party Name'] || '',
                        grNo: row['GR Number'] || '',
                        billNo: row['Bill Number'] || '',
                        lorryNo: row['Lorry Number'] || '',
                        lorryType: 'Open', // Default
                        weight: Number(row['Weight']) || 0,
                        fromPlace: row['From'] || '',
                        toPlace: row['To'] || '',
                        freight: Number(row['Freight']) || 0,
                        advance: Number(row['Advance']) || 0,
                        otherExpenses: Number(row['Other Expenses']) || 0,
                        balance: 0,
                        totalBalance: 0,
                        paymentStatus: 'Pending'
                    };

                    booking.balance = booking.freight + booking.otherExpenses - booking.advance;
                    booking.totalBalance = booking.balance;

                    if (booking.partyName) {
                        await saveBookingRecord(booking);
                        successCount++;
                    }
                }
            } else if (activeTab === 'customer-details') {
                for (const row of jsonData) {
                    const party: SavedParty = {
                        name: row['Party Name'] || row['Name'] || '',
                        type: (row['Type'] === 'Consignor' || row['Type'] === 'Consignee') ? row['Type'] : 'Both',
                        address: row['Address'] || '',
                        city: row['City'] || '',
                        gst: row['GSTIN'] || row['GST'] || '',
                        contact: row['Contact'] || row['Mobile'] || '',
                        pan: row['PAN'] || ''
                    };
                    if (party.name) {
                        await saveSavedParty(party);
                        successCount++;
                    }
                }
            } else if (activeTab === 'vehicle-fleet') {
                for (const row of jsonData) {
                    const truck: SavedTruck = {
                        truckNo: row['Truck Number'] || row['Truck No'] || '',
                        ownerName: row['Owner Name'] || '',
                        contactNumber: row['Contact Number'] || row['Mobile'] || ''
                    };
                    if (truck.truckNo) {
                        await saveSavedTruck(truck);
                        successCount++;
                    }
                }
            }

            toast.success(`Successfully imported ${successCount} records!`, { id: toastId });
            await fetchData(); // Refresh data

        } catch (error) {
            console.error(error);
            toast.error("Failed to import file. Check format.", { id: toastId });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
        switch (activeTab) {
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
                        className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === tab.id
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
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <CheckCircleIcon className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-bold">
                                    Database Update Required
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    To fix "403 Permission Denied" or "Could not find column" errors, copy and run the complete script below in your Supabase SQL Editor.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Complete Fix Script</h3>
                            <button
                                onClick={handleCopy}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                            >
                                {copied ? <CheckCircleIcon className="w-5 h-5" /> : null}
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
                    <div className="relative mb-6 flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder={`Search ${activeTab.replace(/-/g, ' ')}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>

                        {/* Import/Export Buttons */}
                        <div className="flex gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx, .xls" />
                            <button
                                onClick={handleImportClick}
                                disabled={isImporting}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> : <UploadIcon className="w-4 h-4" />}
                                Import Excel
                            </button>
                            <button
                                onClick={handleExport}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm flex items-center gap-2"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Export Excel
                            </button>
                        </div>
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