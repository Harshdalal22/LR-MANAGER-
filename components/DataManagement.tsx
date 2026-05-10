
import React, { useState, useEffect, useRef } from 'react';
import { DashboardIcon, CheckCircleIcon, SearchIcon, PlusIcon, DownloadIcon, UploadIcon, PrintIcon, PencilIcon, TrashIcon, DocumentTextIcon, ArrowLeftIcon, XIcon } from './icons';
import { toast } from 'react-hot-toast';
import {
    getVehicleHirings, getBookingRecords, getSavedParties, getSavedTrucks, getRegisterEntries,
    deleteVehicleHiring, deleteBookingRecord, deleteSavedParty, deleteSavedTruck, deleteRegisterEntry,
    saveVehicleHiring, saveBookingRecord, saveSavedParty, saveSavedTruck, saveRegisterEntry
} from '../services/supabaseService';
import { VehicleHiring, BookingRecord, SavedParty, SavedTruck, RegisterEntry } from '../types';
import * as XLSX from 'xlsx';

interface DataManagementProps {
    onBack: () => void;
    currentRole?: string;
    initialTab?: Tab;
}

type Tab = 'vehicle-hiring' | 'booking-register' | 'customer-details' | 'vehicle-fleet' | 'register-entries' | 'database-setup';

const DataManagement: React.FC<DataManagementProps> = ({ onBack, currentRole, initialTab }) => {
    const [activeTab, setActiveTab] = useState<Tab>(initialTab || (currentRole === 'Operator' ? 'customer-details' : 'database-setup'));
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data States
    const [hirings, setHirings] = useState<VehicleHiring[]>([]);
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [parties, setParties] = useState<SavedParty[]>([]);
    const [trucks, setTrucks] = useState<SavedTruck[]>([]);
    const [registers, setRegisters] = useState<RegisterEntry[]>([]);
    const [editingRegister, setEditingRegister] = useState<Partial<RegisterEntry> | null>(null);
    const [showRegisterForm, setShowRegisterForm] = useState(false);

    // Filter States for Register
    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterParty, setFilterParty] = useState('');
    const [filterGR, setFilterGR] = useState('');

    // Selection States for Bulk Actions
    const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
    const [selectedRegisterIds, setSelectedRegisterIds] = useState<string[]>([]);

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

-- Table: register_entries
CREATE TABLE IF NOT EXISTS public.register_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL,
    month TEXT,
    gr_no TEXT,
    lrc_no TEXT,
    bill_no TEXT,
    date TEXT,
    vehicle_no TEXT,
    contact_no TEXT,
    owner_name TEXT,
    ref_tpt TEXT,
    from_loc TEXT,
    to_loc TEXT,
    driver_fare NUMERIC,
    driver_advance NUMERIC,
    pod_status TEXT,
    driver_payment_status TEXT,
    note TEXT,
    driver_balance NUMERIC,
    actual_balance NUMERIC,
    party_tpt TEXT,
    party_fare NUMERIC,
    party_advance NUMERIC,
    party_balance NUMERIC,
    other_exp NUMERIC,
    party_total_balance NUMERIC,
    party_payment_status TEXT,
    commission NUMERIC,
    difference NUMERIC,
    total NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.register_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access register entries" ON public.register_entries;
CREATE POLICY "Users can access register entries" ON public.register_entries 
FOR ALL 
USING (
    auth.uid() = admin_id 
    OR 
    EXISTS (
        SELECT 1 FROM app_users 
        WHERE app_users.operator_id = auth.uid() 
        AND app_users.admin_id = register_entries.admin_id
    )
);

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
                case 'register-entries':
                    setRegisters(await getRegisterEntries());
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

    const handleSaveRegister = async () => {
        if (!editingRegister) return;
        if (!editingRegister.gr_no) {
            toast.error("GR Number is required");
            return;
        }

        const toastId = toast.loading("Saving register entry...");
        try {
            await saveRegisterEntry(editingRegister as RegisterEntry);
            toast.success("Entry saved successfully!", { id: toastId });
            setShowRegisterForm(false);
            setEditingRegister(null);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save entry", { id: toastId });
        }
    };

    const handleDeleteBulk = async (type: 'booking' | 'register') => {
        const ids = type === 'booking' ? selectedBookingIds : selectedRegisterIds;
        if (ids.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${ids.length} selected records?`)) return;

        const toastId = toast.loading(`Deleting ${ids.length} records...`);
        try {
            if (type === 'booking') {
                await Promise.all(ids.map(id => deleteBookingRecord(id)));
                setBookings(prev => prev.filter(b => b.id && !ids.includes(b.id)));
                setSelectedBookingIds([]);
            } else if (type === 'register') {
                await Promise.all(ids.map(id => deleteRegisterEntry(id)));
                setRegisters(prev => prev.filter(r => r.id && !ids.includes(r.id)));
                setSelectedRegisterIds([]);
            }
            toast.success('Deleted successfully', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete some records', { id: toastId });
        }
    };

    const handleDelete = async (id: string, type: 'hiring' | 'booking' | 'party' | 'truck' | 'register') => {
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
            } else if (type === 'register') {
                await deleteRegisterEntry(id);
                setRegisters(prev => prev.filter(i => i.id !== id));
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
                    'Bill Number': h.billNo,
                    'Lorry Number': h.lorryNo,
                    'Driver Number': h.driverNo || '',
                    'Owner Name': h.ownerName,
                    'From': h.fromPlace,
                    'To': h.toPlace,
                    'Freight': h.freight,
                    'Other Expenses': h.otherExpenses,
                    'Advance': h.advance,
                    'Total Balance': h.totalBalance,
                    'POD Status': h.podStatus,
                    'Payment Status': h.paymentStatus
                }));
                filename = 'Vehicle_Hiring_Data';
                break;
            case 'booking-register':
                data = bookings.map(b => ({
                    Date: b.date,
                    'Party Name': b.partyName,
                    'GR Number': b.grNo,
                    'Bill Number': b.billNo,
                    'Lorry Number': b.lorryNo,
                    'Lorry Type': b.lorryType,
                    'From': b.fromPlace,
                    'To': b.toPlace,
                    'Weight': b.weight,
                    'Freight': b.freight,
                    'Other Expenses': b.otherExpenses,
                    'Advance': b.advance,
                    'Total Balance': b.totalBalance,
                    'Payment Status': b.paymentStatus
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
                    'Contact': p.contact,
                    'PAN': p.pan || ''
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
            case 'register-entries':
                data = registers.map(r => ({
                    'Month': r.month,
                    'GR No': r.gr_no,
                    'LRC No': r.lrc_no,
                    'Bill No': r.bill_no,
                    'Date': r.date,
                    'Vehicle No': r.vehicle_no,
                    'Contact No': r.contact_no,
                    'Owner Name': r.owner_name,
                    'Ref TPT': r.ref_tpt,
                    'From': r.from_loc,
                    'To': r.to_loc,
                    'Driver Fare': r.driver_fare,
                    'Driver Advance': r.driver_advance,
                    'POD Status': r.pod_status,
                    'Driver Payment Status': r.driver_payment_status,
                    'Note': r.note,
                    'Driver Balance': r.driver_balance,
                    'Actual Balance': r.actual_balance,
                    'Party TPT': r.party_tpt,
                    'Party Fare': r.party_fare,
                    'Party Advance': r.party_advance,
                    'Party Balance': r.party_balance,
                    'Other Exp': r.other_exp,
                    'Party Total Balance': r.party_total_balance,
                    'Party Payment Status': r.party_payment_status,
                    'Commission': r.commission,
                    'Difference': r.difference,
                    'Total': r.total,
                    'Status': r.status
                }));
                filename = 'Register_Entries';
                break;
            default:
                return;
        }

        if (data.length === 0) {
            toast.error("No data to export");
            return;
        }

        // Create worksheet from data
        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-size columns based on content
        const colWidths: any[] = [];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

        for (let C = range.s.c; C <= range.e.c; ++C) {
            let maxWidth = 10;
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellAddress];
                if (cell && cell.v) {
                    const cellLength = cell.v.toString().length;
                    maxWidth = Math.max(maxWidth, cellLength);
                }
            }
            colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
        }
        ws['!cols'] = colWidths;

        // Style header row (bold, background color)
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!ws[cellAddress]) continue;

            ws[cellAddress].s = {
                font: { bold: true, sz: 12 },
                fill: { fgColor: { rgb: "4472C4" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
        }

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

    const parseNumber = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        
        const str = String(val);
        if (str.includes('[object')) return 0; // Guard against objects being stringified
        
        // Remove currency symbols, commas, and other formatting
        const clean = str.replace(/[^\d.-]/g, '');
        if (!clean) return 0;
        
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading("Reading file...");

        try {
            const data = await file.arrayBuffer();
            // cellDates: true ensures Excel serial dates are converted to JS Date objects
            const workbook = XLSX.read(data, { cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Smart Header Detection (Score-based)
            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            let headerRowIndex = 0;
            let maxScore = 0;

            const knownKeywords = [
                'date', 'booking', 'party', 'customer', 'name', 'client',
                'gr', 'lr', 'bill', 'invoice',
                'lorry', 'truck', 'vehicle', 'type',
                'weight', 'wt', 'kg',
                'from', 'source', 'to', 'dest',
                'freight', 'amount', 'advance', 'balance', 'status', 'gst', 'pan', 'mobile', 'contact'
            ];

            // Scan first 15 rows
            for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
                let score = 0;
                const row = rawRows[i];
                if (!row || !Array.isArray(row)) continue;

                const rowCells = row.map(c => String(c).toLowerCase().trim());
                rowCells.forEach(cell => {
                    if (knownKeywords.some(k => cell.includes(k))) {
                        score++;
                    }
                });

                if (score > maxScore) {
                    maxScore = score;
                    headerRowIndex = i;
                }
            }

            console.log(`Using Header Row Index: ${headerRowIndex} (Score: ${maxScore})`);
            const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

            console.log("Imported Raw Data (DataMgmt):", jsonData);

            if (jsonData.length === 0) {
                toast.error("File appears empty or unreadable", { id: toastId });
                setIsImporting(false);
                return;
            }

            let successCount = 0;
            let failCount = 0;
            const foundKeys = jsonData.length > 0 ? Object.keys(jsonData[0] as object).join(', ') : 'None';
            console.log("Found Keys:", foundKeys);

            // Helper to find value by flexible key matching
            const getValue = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                
                // Helper to normalize strings for comparison (lowercase, no spaces/underscores)
                const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '').trim();

                for (const key of keys) {
                    const normalizedTarget = normalize(key);
                    
                    // 1. Exact or normalized match
                    let foundKey = rowKeys.find(k => normalize(k) === normalizedTarget);
                    
                    // 2. Lenient match (includes)
                    if (!foundKey && key.length > 3) {
                        foundKey = rowKeys.find(k => normalize(k).includes(normalizedTarget) || normalizedTarget.includes(normalize(k)));
                    }
                    
                    if (foundKey) {
                        const val = row[foundKey];
                        // Handle xlsx cell objects if they exist
                        if (val !== null && typeof val === 'object' && 'v' in val) return val.v;
                        if (val !== null && typeof val === 'object' && 'w' in val) return val.w;
                        return val;
                    }
                }
                return undefined;
            };

            // Helper to safely parse dates
            const parseDate = (val: any): string => {
                if (!val) return new Date().toISOString().split('T')[0];
                if (val instanceof Date) {
                    const offset = val.getTimezoneOffset() * 60000;
                    return new Date(val.getTime() - offset).toISOString().split('T')[0];
                }
                if (typeof val === 'string') {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                }
                return new Date().toISOString().split('T')[0];
            };

            for (const row of jsonData) {
                try {
                    if (activeTab === 'vehicle-hiring') {
                        const lorryNo = getValue(row, ['Lorry Number', 'Lorry No', 'Truck Number', 'Truck No', 'Vehicle No']);
                        if (!lorryNo) { failCount++; continue; }

                        const hiring: VehicleHiring = {
                            date: parseDate(getValue(row, ['Date', 'Booking Date'])),
                            lorryNo: String(lorryNo).trim(),
                            grNo: String(getValue(row, ['GR Number', 'GR No', 'LR Number', 'LR No']) || ''),
                            billNo: String(getValue(row, ['Bill Number', 'Bill No', 'Invoice No']) || ''),
                            driverNo: String(getValue(row, ['Driver Number', 'Driver No', 'Driver Phone']) || ''),
                            ownerName: getValue(row, ['Owner Name', 'Owner']) === 'Self' ? 'Self' : 'Third Party',
                            fromPlace: String(getValue(row, ['From', 'Source', 'Origin']) || ''),
                            toPlace: String(getValue(row, ['To', 'Destination']) || ''),
                            freight: Number(getValue(row, ['Freight', 'Freight Amount'])) || 0,
                            otherExpenses: Number(getValue(row, ['Other Expenses', 'Other Charges'])) || 0,
                            advance: Number(getValue(row, ['Advance', 'Avg Advance'])) || 0,
                            balance: 0,
                            totalBalance: Number(getValue(row, ['Total Balance', 'Balance', 'Due'])) || 0,
                            podStatus: (String(getValue(row, ['POD Status', 'POD'])).toLowerCase() === 'completed' ? 'Completed' : 'Pending'),
                            paymentStatus: (String(getValue(row, ['Payment Status', 'Status'])).toLowerCase() === 'completed' ? 'Completed' : 'Pending')
                        };

                        const calculatedBalance = hiring.freight + hiring.otherExpenses - hiring.advance;
                        if (!hiring.totalBalance || hiring.totalBalance === 0) {
                            hiring.totalBalance = calculatedBalance;
                            hiring.balance = hiring.totalBalance - hiring.otherExpenses;
                        } else {
                            hiring.balance = hiring.totalBalance - hiring.otherExpenses;
                        }

                        await saveVehicleHiring(hiring);

                    } else if (activeTab === 'booking-register') {
                        const partyName = getValue(row, ['Party Name', 'Party', 'Customer']);
                        if (!partyName) { failCount++; continue; }

                        const booking: BookingRecord = {
                            date: parseDate(getValue(row, ['Date', 'Booking Date'])),
                            partyName: String(partyName).trim(),
                            grNo: String(getValue(row, ['GR Number', 'GR No', 'LR Number']) || ''),
                            billNo: String(getValue(row, ['Bill Number', 'Bill No']) || ''),
                            lorryNo: String(getValue(row, ['Lorry Number', 'Lorry No', 'Truck No']) || ''),
                            lorryType: (String(getValue(row, ['Lorry Type', 'Type'])).toLowerCase() === 'closed' ? 'Closed' : 'Open'),
                            weight: Number(getValue(row, ['Weight', 'Wt', 'Kgs'])) || 0,
                            fromPlace: String(getValue(row, ['From', 'Source']) || ''),
                            toPlace: String(getValue(row, ['To', 'Destination']) || ''),
                            freight: Number(getValue(row, ['Freight', 'Freight Amount'])) || 0,
                            advance: Number(getValue(row, ['Advance', 'Advance Amount'])) || 0,
                            otherExpenses: Number(getValue(row, ['Other Expenses', 'Other Charges'])) || 0,
                            balance: 0,
                            totalBalance: Number(getValue(row, ['Total Balance', 'Balance', 'Total'])) || 0,
                            paymentStatus: (String(getValue(row, ['Payment Status', 'Status'])).toLowerCase() === 'completed' ? 'Completed' : 'Pending')
                        };

                        const calculatedBalance = booking.freight + booking.otherExpenses - booking.advance;
                        if (!booking.totalBalance || booking.totalBalance === 0) {
                            booking.totalBalance = calculatedBalance;
                            booking.balance = booking.totalBalance - booking.otherExpenses;
                        } else {
                            booking.balance = booking.totalBalance - booking.otherExpenses;
                        }

                        await saveBookingRecord(booking);

                    } else if (activeTab === 'customer-details') {
                        const rawName = getValue(row, ['Party Name', 'Name', 'Customer Name']);
                        if (!rawName) { failCount++; continue; }

                        const party: SavedParty = {
                            name: String(rawName).trim(),
                            type: (getValue(row, ['Type']) === 'Consignor' || getValue(row, ['Type']) === 'Consignee') ? getValue(row, ['Type']) : 'Both',
                            address: String(getValue(row, ['Address', 'Location']) || ''),
                            city: String(getValue(row, ['City', 'Place']) || ''),
                            gst: String(getValue(row, ['GSTIN', 'GST', 'GST No']) || ''),
                            contact: String(getValue(row, ['Contact', 'Mobile', 'Phone', 'Cell']) || ''),
                            pan: String(getValue(row, ['PAN', 'PAN No']) || '')
                        };
                        await saveSavedParty(party);

                    } else if (activeTab === 'vehicle-fleet') {
                        const rawTruck = getValue(row, ['Truck Number', 'Truck No', 'Vehicle No', 'Lorry Number']);
                        if (!rawTruck) { failCount++; continue; }

                        const truck: SavedTruck = {
                            truckNo: String(rawTruck).trim(),
                            ownerName: String(getValue(row, ['Owner Name', 'Owner']) || ''),
                            contactNumber: String(getValue(row, ['Contact Number', 'Mobile', 'Phone']) || '')
                        };
                        await saveSavedTruck(truck);
                    } else if (activeTab === 'register-entries') {
                        const grNo = getValue(row, ['GR No', 'GR Number', 'GR']);
                        if (!grNo) { failCount++; continue; }

                        const register: RegisterEntry = {
                            month: String(getValue(row, ['Month', 'Mnth']) || ''),
                            gr_no: String(grNo).trim(),
                            lrc_no: String(getValue(row, ['LRC No', 'LRC Number', 'LRC', 'LRC No.']) || ''),
                            bill_no: String(getValue(row, ['Bill No', 'Bill Number', 'Invoice No', 'Inv No']) || ''),
                            date: parseDate(getValue(row, ['Date', 'DT'])),
                            vehicle_no: String(getValue(row, ['Vehicle No', 'Vehicle Number', 'Truck No', 'Vehicle']) || ''),
                            contact_no: String(getValue(row, ['Contact No', 'Contact Number', 'Phone', 'Mobile']) || ''),
                            owner_name: String(getValue(row, ['Owner Name', 'Owner']) || ''),
                            ref_tpt: String(getValue(row, ['Ref TPT', 'Ref Transporter', 'Ref TPT Party TPT']) || ''),
                            from_loc: String(getValue(row, ['From', 'From Location', 'Source', 'Origin']) || ''),
                            to_loc: String(getValue(row, ['To', 'To Location', 'Destination']) || ''),
                            driver_fare: parseNumber(getValue(row, ['Driver Fare', 'Driver Rate', 'Fare'])),
                            driver_advance: parseNumber(getValue(row, ['Driver Advance', 'Advance', 'Driver Adv', 'Adv'])),
                            pod_status: String(getValue(row, ['POD Status', 'POD']) || ''),
                            driver_payment_status: String(getValue(row, ['Driver Payment Status', 'Payment Status', 'Driver Pay', 'Pay Status']) || ''),
                            note: String(getValue(row, ['Note', 'Remarks', 'Remark']) || ''),
                            driver_balance: parseNumber(getValue(row, ['Driver Balance', 'Balance', 'Driver Bal', 'Bal'])),
                            actual_balance: parseNumber(getValue(row, ['Actual Balance', 'Act Bal'])),
                            party_tpt: String(getValue(row, ['Party TPT', 'Party Transporter', 'Client', 'Client TPT']) || ''),
                            party_fare: parseNumber(getValue(row, ['Party Fare', 'Party Rate', 'Party Pay Fare', 'Client Fare', 'Client Rate', 'PTY FARE'])),
                            party_advance: parseNumber(getValue(row, ['Party Advance', 'Party Adv', 'Party Adv.', 'Client Advance', 'Client Adv', 'PTY ADV'])),
                            party_balance: parseNumber(getValue(row, ['Party Balance', 'Party Bal', 'Party Bal.', 'Client Balance', 'Client Bal', 'PTY BAL'])),
                            other_exp: parseNumber(getValue(row, ['Other Exp', 'Other Expenses', 'Other Exp.', 'Misc Exp', 'Client Exp'])),
                            party_total_balance: parseNumber(getValue(row, ['Party Total Balance', 'Party Total Bal', 'Net Bal', 'Client Total Bal', 'Total Party Bal'])),
                            party_payment_status: String(getValue(row, ['Party Payment Status', 'Party Pay', 'Party Payment', 'Client Pay Status', 'PTY PAY']) || ''),
                            commission: parseNumber(getValue(row, ['Commission', 'Comm'])),
                            difference: parseNumber(getValue(row, ['Difference', 'Diff'])),
                            total: parseNumber(getValue(row, ['Total', 'Grand Total'])),
                            status: String(getValue(row, ['Status', 'Shipment Status']) || '')
                        };
                        await saveRegisterEntry(register);
                    }

                    successCount++;
                } catch (err) {
                    console.error("DataMgmt Import Row Failed:", row, err);
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Imported ${successCount} records! ${failCount > 0 ? `(${failCount} skipped)` : ''}`, { id: toastId });
                await fetchData(); // Refresh data
            } else {
                toast.error(`No valid records found. ${failCount} skipped. Check console for details.`, { id: toastId });
            }

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
                    {selectedBookingIds.length > 0 && (
                        <div className="p-3 bg-red-50 border-b border-red-100 flex justify-between items-center sticky left-0">
                            <span className="text-red-700 text-xs font-bold">{selectedBookingIds.length} items selected</span>
                            <button 
                                onClick={() => handleDeleteBulk('booking')}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-bold transition-colors shadow-sm"
                            >
                                Delete Selected
                            </button>
                        </div>
                    )}
                    <table className="w-full text-xs text-left text-gray-700">
                        <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 border-r w-10 text-center">
                                    <input 
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={filtered.length > 0 && selectedBookingIds.length === filtered.length}
                                        onChange={() => {
                                            const ids = filtered.map(b => b.id).filter((id): id is string => !!id);
                                            setSelectedBookingIds(prev => prev.length === ids.length ? [] : ids);
                                        }}
                                    />
                                </th>
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
                                <tr><td colSpan={7} className="p-4 text-center text-gray-500 italic">No records found. Run database setup if tables are missing.</td></tr>
                            ) : filtered.map(r => (
                                <tr key={r.id} className={`bg-white border-b hover:bg-gray-50 transition-colors ${selectedBookingIds.includes(r.id!) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-3 py-2 border-r text-center">
                                        <input 
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={r.id ? selectedBookingIds.includes(r.id) : false}
                                            onChange={() => {
                                                if (!r.id) return;
                                                setSelectedBookingIds(prev => 
                                                    prev.includes(r.id!) 
                                                        ? prev.filter(id => id !== r.id) 
                                                        : [...prev, r.id!]
                                                );
                                            }}
                                        />
                                    </td>
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

        if (activeTab === 'register-entries') {
            const filtered = registers.filter(r => {
                const matchesSearch = (r.gr_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (r.vehicle_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (r.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesDate = !filterDate || (r.date && r.date.includes(filterDate));
                const matchesMonth = !filterMonth || (r.month && r.month.toLowerCase().includes(filterMonth.toLowerCase()));
                const matchesParty = !filterParty || (r.party_tpt && r.party_tpt.toLowerCase().includes(filterParty.toLowerCase()));
                const matchesGR = !filterGR || (r.gr_no && r.gr_no.toLowerCase().includes(filterGR.toLowerCase()));
                
                return matchesSearch && matchesDate && matchesMonth && matchesParty && matchesGR;
            });

            return (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Filter by Date</label>
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Filter by Month</label>
                            <input 
                                type="text" 
                                placeholder="e.g. January"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Party Name</label>
                            <input 
                                type="text" 
                                placeholder="Search party..."
                                value={filterParty}
                                onChange={(e) => setFilterParty(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">GR / LR Number</label>
                            <input 
                                type="text" 
                                placeholder="Search GR..."
                                value={filterGR}
                                onChange={(e) => setFilterGR(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={() => { setEditingRegister({}); setShowRegisterForm(true); }}
                                className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add New Row
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {selectedRegisterIds.length > 0 && (
                            <div className="p-3 bg-red-50 border-b border-red-100 flex justify-between items-center sticky left-0 z-20">
                                <span className="text-red-700 text-xs font-bold">{selectedRegisterIds.length} items selected</span>
                                <button 
                                    onClick={() => handleDeleteBulk('register')}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-bold transition-colors shadow-sm"
                                >
                                    Delete Selected
                                </button>
                            </div>
                        )}
                        <table className="w-full text-xs text-left text-gray-700 whitespace-nowrap">
                            <thead className="text-[10px] text-white uppercase bg-blue-700">
                                <tr>
                                    <th className="px-3 py-3 border-r border-blue-600 sticky left-0 bg-blue-700 z-10 text-center w-10">
                                        <input 
                                            type="checkbox"
                                            className="rounded border-blue-400 text-white focus:ring-blue-300 bg-blue-800"
                                            checked={filtered.length > 0 && selectedRegisterIds.length === filtered.length}
                                            onChange={() => {
                                                const ids = filtered.map(r => r.id).filter((id): id is string => !!id);
                                                setSelectedRegisterIds(prev => prev.length === ids.length ? [] : ids);
                                            }}
                                        />
                                    </th>
                                    <th className="px-3 py-3 border-r border-blue-600 sticky left-[40px] bg-blue-700 z-10">Actions</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Month</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Date</th>
                                    <th className="px-3 py-3 border-r border-blue-600">GR No</th>
                                    <th className="px-3 py-3 border-r border-blue-600">LRC No</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Bill No</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Vehicle No</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Contact No</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Owner Name</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Ref TPT</th>
                                    <th className="px-3 py-3 border-r border-blue-600">From</th>
                                    <th className="px-3 py-3 border-r border-blue-600">To</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-green-700">Driver Fare</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-green-700">Driver Adv</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-green-700">Driver Bal</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-green-700">Actual Bal</th>
                                    <th className="px-3 py-3 border-r border-blue-600">POD Status</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Driver Pay</th>
                                    <th className="px-3 py-3 border-r border-blue-600">Note</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-orange-600">Party TPT</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-orange-600">Party Fare</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-orange-600">Party Adv</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-orange-600">Party Bal</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-orange-600">Other Exp</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-orange-600">Party Total Bal</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-orange-600">Party Pay</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-purple-700">Commission</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-purple-700">Difference</th>
                                    <th className="px-3 py-3 border-r border-blue-600 bg-purple-700">Total</th>
                                    <th className="px-3 py-3 border-blue-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={31} className="p-8 text-center text-gray-500 italic">
                                            No records found matching filters.
                                        </td>
                                    </tr>
                                ) : filtered.map((r, idx) => (
                                    <tr key={r.id || idx} className={`border-b hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedRegisterIds.includes(r.id!) ? 'bg-blue-50/70' : ''}`}>
                                        <td className="px-3 py-2 border-r text-center sticky left-0 bg-inherit z-10">
                                            <input 
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={r.id ? selectedRegisterIds.includes(r.id) : false}
                                                onChange={() => {
                                                    if (!r.id) return;
                                                    setSelectedRegisterIds(prev => 
                                                        prev.includes(r.id!) 
                                                            ? prev.filter(id => id !== r.id) 
                                                            : [...prev, r.id!]
                                                    );
                                                }}
                                            />
                                        </td>
                                        <td className="px-3 py-2 border-r text-center sticky left-[40px] bg-inherit z-10">
                                            <div className="flex items-center justify-center gap-1">
                                                <button 
                                                    onClick={() => { setEditingRegister(r); setShowRegisterForm(true); }}
                                                    className="p-1 hover:bg-blue-100 rounded text-blue-600"
                                                >
                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => r.id && handleDelete(r.id, 'register')} 
                                                    className="p-1 hover:bg-red-100 rounded text-red-500"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 border-r">{r.month || '-'}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap">{r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-'}</td>
                                        <td className="px-3 py-2 border-r font-bold text-blue-700">{r.gr_no || '-'}</td>
                                        <td className="px-3 py-2 border-r">{r.lrc_no || '-'}</td>
                                        <td className="px-3 py-2 border-r">{r.bill_no || '-'}</td>
                                        <td className="px-3 py-2 border-r font-mono font-bold">{r.vehicle_no || '-'}</td>
                                        <td className="px-3 py-2 border-r">{r.contact_no || '-'}</td>
                                        <td className="px-3 py-2 border-r">{r.owner_name || '-'}</td>
                                        <td className="px-3 py-2 border-r">{r.ref_tpt || '-'}</td>
                                        <td className="px-3 py-2 border-r">{r.from_loc || '-'}</td>
                                        <td className="px-3 py-2 border-r">{r.to_loc || '-'}</td>
                                        <td className="px-3 py-2 border-r text-right font-semibold text-green-700">₹{r.driver_fare ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right text-green-700">₹{r.driver_advance ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right text-green-700">₹{r.driver_balance ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right text-green-700">₹{r.actual_balance ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(r.pod_status || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {r.pod_status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 border-r text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(r.driver_payment_status || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {r.driver_payment_status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 border-r text-gray-500 italic max-w-[150px] overflow-hidden text-ellipsis">{r.note || '-'}</td>
                                        <td className="px-3 py-2 border-r text-orange-700">{r.party_tpt || '-'}</td>
                                        <td className="px-3 py-2 border-r text-right font-semibold text-orange-700">₹{r.party_fare ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right text-orange-700">₹{r.party_advance ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right text-orange-700">₹{r.party_balance ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right text-orange-700">₹{r.other_exp ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right font-bold text-orange-700">₹{r.party_total_balance ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(r.party_payment_status || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {r.party_payment_status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 border-r text-right text-purple-700">₹{r.commission ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right text-purple-700">₹{r.difference ?? 0}</td>
                                        <td className="px-3 py-2 border-r text-right font-bold text-purple-700">₹{r.total ?? 0}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(r.status || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                                {r.status || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
            case 'register-entries': return registers.length;
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
                    { id: 'register-entries', label: 'Register' },
                    { id: 'database-setup', label: 'Database Setup' }
                ].filter(tab => {
                    if (currentRole === 'Operator') {
                        return tab.id === 'customer-details' || tab.id === 'vehicle-fleet' || tab.id === 'register-entries';
                    }
                    return true;
                }).map((tab) => (
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
            {/* Register Form Modal */}
            {showRegisterForm && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fadeIn">
                        {/* Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-blue-600 rounded-t-2xl">
                            <h2 className="text-white font-bold flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5" />
                                {editingRegister?.id ? 'Edit Register Entry' : 'Add New Register Entry'}
                            </h2>
                            <button 
                                onClick={() => { setShowRegisterForm(false); setEditingRegister(null); }}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50">
                            {/* General Details Section */}
                            <div className="md:col-span-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">General Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Month</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.month || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, month: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g. May"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Date</label>
                                        <input 
                                            type="date" 
                                            value={editingRegister?.date || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">GR No <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.gr_no || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, gr_no: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="GR Number"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">LRC No</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.lrc_no || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, lrc_no: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="LRC No"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Bill No</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.bill_no || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, bill_no: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Bill No"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Vehicle No</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.vehicle_no || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, vehicle_no: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g. HR 55 A 1234"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Contact No</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.contact_no || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, contact_no: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Driver/Owner Contact"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Owner Name</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.owner_name || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, owner_name: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Truck Owner"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Ref TPT</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.ref_tpt || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, ref_tpt: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Reference TPT"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.from_loc || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, from_loc: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.to_loc || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, to_loc: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Driver FinancialsSection */}
                            <div className="md:col-span-3">
                                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Driver / Vendor Financials</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Driver Fare</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.driver_fare || 0} 
                                            onChange={(e) => {
                                                const fare = Number(e.target.value);
                                                const adv = editingRegister?.driver_advance || 0;
                                                setEditingRegister(prev => ({ 
                                                    ...prev, 
                                                    driver_fare: fare,
                                                    driver_balance: fare - adv,
                                                    actual_balance: fare - adv,
                                                    commission: (editingRegister?.party_fare || 0) - fare
                                                }));
                                            }}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Advance</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.driver_advance || 0} 
                                            onChange={(e) => {
                                                const adv = Number(e.target.value);
                                                const fare = editingRegister?.driver_fare || 0;
                                                setEditingRegister(prev => ({ 
                                                    ...prev, 
                                                    driver_advance: adv,
                                                    driver_balance: fare - adv,
                                                    actual_balance: fare - adv
                                                }));
                                            }}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Driver Balance (Auto)</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.driver_balance || 0} 
                                            readOnly
                                            className="w-full text-sm p-2 rounded-lg border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Status</label>
                                        <select 
                                            value={editingRegister?.driver_payment_status || 'Pending'} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, driver_payment_status: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Partial">Partial</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">POD Status</label>
                                        <select 
                                            value={editingRegister?.pod_status || 'Pending'} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, pod_status: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Received">Received</option>
                                            <option value="Submitted">Submitted</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Internal Note</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.note || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, note: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                                            placeholder="Add remarks for driver/vendor"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Party Financials Section */}
                            <div className="md:col-span-3">
                                <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Party / Client Financials</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Party Name</label>
                                        <input 
                                            type="text" 
                                            value={editingRegister?.party_tpt || ''} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, party_tpt: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="Client Name"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Party Fare</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.party_fare || 0} 
                                            onChange={(e) => {
                                                const fare = Number(e.target.value);
                                                const adv = editingRegister?.party_advance || 0;
                                                const exp = editingRegister?.other_exp || 0;
                                                const bal = fare - adv;
                                                setEditingRegister(prev => ({ 
                                                    ...prev, 
                                                    party_fare: fare,
                                                    party_balance: bal,
                                                    party_total_balance: bal + exp,
                                                    commission: fare - (editingRegister?.driver_fare || 0),
                                                    total: bal + exp
                                                }));
                                            }}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Advance</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.party_advance || 0} 
                                            onChange={(e) => {
                                                const adv = Number(e.target.value);
                                                const fare = editingRegister?.party_fare || 0;
                                                const exp = editingRegister?.other_exp || 0;
                                                const bal = fare - adv;
                                                setEditingRegister(prev => ({ 
                                                    ...prev, 
                                                    party_advance: adv,
                                                    party_balance: bal,
                                                    party_total_balance: bal + exp,
                                                    total: bal + exp
                                                }));
                                            }}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Other Exp</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.other_exp || 0} 
                                            onChange={(e) => {
                                                const exp = Number(e.target.value);
                                                const bal = editingRegister?.party_balance || 0;
                                                setEditingRegister(prev => ({ 
                                                    ...prev, 
                                                    other_exp: exp,
                                                    party_total_balance: bal + exp,
                                                    total: bal + exp
                                                }));
                                            }}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Party Balance (Auto)</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.party_total_balance || 0} 
                                            readOnly
                                            className="w-full text-sm p-2 rounded-lg border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Status</label>
                                        <select 
                                            value={editingRegister?.party_payment_status || 'Pending'} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, party_payment_status: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Partial">Partial</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Profitability / Status Section */}
                            <div className="md:col-span-3">
                                <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Profitability & Final Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Commission (Auto)</label>
                                        <input 
                                            type="number" 
                                            value={editingRegister?.commission || 0} 
                                            readOnly
                                            className="w-full text-sm p-2 rounded-lg border-gray-200 bg-gray-100 text-purple-700 font-bold cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Status</label>
                                        <select 
                                            value={editingRegister?.status || 'Active'} 
                                            onChange={(e) => setEditingRegister(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full text-sm p-2 rounded-lg border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
                            <button 
                                onClick={() => { setShowRegisterForm(false); setEditingRegister(null); }}
                                className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveRegister}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-colors flex items-center gap-2"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                Save Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataManagement;