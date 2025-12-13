
import React, { useState, useEffect, useMemo } from 'react';
import { DashboardIcon, CheckCircleIcon, SearchIcon, PlusIcon, DownloadIcon, UploadIcon, PrintIcon, PencilIcon, TrashIcon, DocumentTextIcon } from './icons';
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
-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Tables (if they don't exist)

-- Lorry Receipts Table
create table if not exists public.lorry_receipts (
  "lrNo" text not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "lrType" text default 'Original',
  "truckNo" text,
  date date,
  "fromPlace" text,
  "toPlace" text,
  "invoiceNo" text,
  "invoiceAmount" numeric,
  "invoiceDate" date,
  "poNo" text,
  "poDate" date,
  "ewayBillNo" text,
  "ewayBillDate" date,
  "ewayExDate" date,
  "addressOfDelivery" text,
  "chargedWeight" numeric,
  "billingTo" jsonb default '{}'::jsonb,
  "gstPaidBy" text,
  consignor jsonb default '{}'::jsonb,
  consignee jsonb default '{}'::jsonb,
  items jsonb default '[]'::jsonb,
  weight numeric,
  "actualWeightMT" numeric,
  freight numeric,
  charges jsonb default '{}'::jsonb,
  rate numeric,
  "rateOn" text,
  remark text,
  status text default 'Booked',
  status_updated_at timestamp with time zone,
  pod_path text,
  primary key ("lrNo", user_id)
);

-- Company Details Table
create table if not exists public.company_details (
  user_id uuid references auth.users not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text,
  "logoUrl" text,
  "signatureImageUrl" text,
  tagline text,
  address text,
  email text,
  web text,
  contact text[],
  pan text,
  gstn text,
  "sacCode" text,
  "bankDetails" jsonb default '{}'::jsonb,
  "jurisdictionCity" text,
  "branchLocations" text[]
);

-- Saved Parties Table
create table if not exists public.saved_parties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  address text,
  city text,
  contact text,
  pan text,
  gst text,
  type text
);

-- Saved Trucks Table
create table if not exists public.saved_trucks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "truckNo" text not null,
  "ownerName" text,
  "contactNumber" text
);

-- Vehicle Hirings Table
create table if not exists public.vehicle_hirings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date not null,
  "bookingId" text,
  "grNo" text,
  "billNo" text,
  "lorryNo" text not null,
  "driverNo" text,
  "ownerName" text default 'Third Party',
  "fromPlace" text,
  "toPlace" text,
  freight numeric default 0,
  advance numeric default 0,
  advances jsonb default '[]'::jsonb,
  balance numeric default 0,
  "otherExpenses" numeric default 0,
  "totalBalance" numeric default 0,
  "podStatus" text default 'Pending',
  "paymentStatus" text default 'Pending'
);

-- Booking Registers Table
create table if not exists public.booking_registers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date not null,
  "bookingId" text,
  "partyName" text not null,
  "grNo" text,
  "billNo" text,
  "lorryNo" text not null,
  "lorryType" text default 'Closed',
  weight numeric default 0,
  "fromPlace" text,
  "toPlace" text,
  freight numeric default 0,
  advance numeric default 0,
  advances jsonb default '[]'::jsonb,
  balance numeric default 0,
  "otherExpenses" numeric default 0,
  "totalBalance" numeric default 0,
  "paymentStatus" text default 'Pending'
);

-- 3. MIGRATIONS (Fix missing columns in existing tables)

-- Add 'advances' to vehicle_hirings if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'vehicle_hirings' and column_name = 'advances') then
    alter table public.vehicle_hirings add column advances jsonb default '[]'::jsonb;
  end if;
end $$;

-- Add 'advances' to booking_registers if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'booking_registers' and column_name = 'advances') then
    alter table public.booking_registers add column advances jsonb default '[]'::jsonb;
  end if;
end $$;

-- 4. CRITICAL: Reload Schema Cache
-- This fixes the error: "Could not find the 'advances' column ... in the schema cache"
NOTIFY pgrst, 'reload config';

-- 5. Enable Row Level Security (RLS)
alter table public.lorry_receipts enable row level security;
alter table public.company_details enable row level security;
alter table public.saved_parties enable row level security;
alter table public.saved_trucks enable row level security;
alter table public.vehicle_hirings enable row level security;
alter table public.booking_registers enable row level security;

-- 6. Create/Update Security Policies
-- (Drops existing policies first to prevent errors on re-run)

drop policy if exists "Users can manage their own LRs" on public.lorry_receipts;
create policy "Users can manage their own LRs" on public.lorry_receipts for all using (auth.uid() = user_id);

drop policy if exists "Users can manage their own Company Details" on public.company_details;
create policy "Users can manage their own Company Details" on public.company_details for all using (auth.uid() = user_id);

drop policy if exists "Users can manage their own Saved Parties" on public.saved_parties;
create policy "Users can manage their own Saved Parties" on public.saved_parties for all using (auth.uid() = user_id);

drop policy if exists "Users can manage their own Saved Trucks" on public.saved_trucks;
create policy "Users can manage their own Saved Trucks" on public.saved_trucks for all using (auth.uid() = user_id);

drop policy if exists "Users can manage their own Vehicle Hirings" on public.vehicle_hirings;
create policy "Users can manage their own Vehicle Hirings" on public.vehicle_hirings for all using (auth.uid() = user_id);

drop policy if exists "Users can manage their own Booking Registers" on public.booking_registers;
create policy "Users can manage their own Booking Registers" on public.booking_registers for all using (auth.uid() = user_id);

-- 7. Create Indexes for Performance
create index if not exists idx_vehicle_hirings_user_id on public.vehicle_hirings(user_id);
create index if not exists idx_vehicle_hirings_date on public.vehicle_hirings(date);
create index if not exists idx_booking_registers_user_id on public.booking_registers(user_id);
create index if not exists idx_booking_registers_date on public.booking_registers(date);
create index if not exists idx_lorry_receipts_date on public.lorry_receipts(date);
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
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlScript);
        setCopied(true);
        toast.success('SQL Script copied to clipboard!');
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
                                <th className="px-3 py-3 border-r">Booking ID</th>
                                <th className="px-3 py-3 border-r">Date</th>
                                <th className="px-3 py-3 border-r">GR Number</th>
                                <th className="px-3 py-3 border-r">Bill Number</th>
                                <th className="px-3 py-3 border-r">Lorry Number</th>
                                <th className="px-3 py-3 border-r">Driver Number</th>
                                <th className="px-3 py-3 border-r">Owner Name</th>
                                <th className="px-3 py-3 border-r">From</th>
                                <th className="px-3 py-3 border-r">To</th>
                                <th className="px-3 py-3 border-r">Freight</th>
                                <th className="px-3 py-3 border-r">Advance</th>
                                <th className="px-3 py-3 border-r">Balance</th>
                                <th className="px-3 py-3 border-r">Other Exp.</th>
                                <th className="px-3 py-3 border-r">Total Balance</th>
                                <th className="px-3 py-3 border-r">POD Status</th>
                                <th className="px-3 py-3 border-r">Payment Status</th>
                                <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2 border-r font-medium text-blue-600">{r.bookingId || '-'}</td>
                                    <td className="px-3 py-2 border-r whitespace-nowrap">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-3 py-2 border-r">{r.grNo}</td>
                                    <td className="px-3 py-2 border-r">{r.billNo || '-'}</td>
                                    <td className="px-3 py-2 border-r font-bold">{r.lorryNo}</td>
                                    <td className="px-3 py-2 border-r">{r.driverNo || '-'}</td>
                                    <td className="px-3 py-2 border-r">{r.ownerName}</td>
                                    <td className="px-3 py-2 border-r">{r.fromPlace}</td>
                                    <td className="px-3 py-2 border-r">{r.toPlace}</td>
                                    <td className="px-3 py-2 border-r text-right">₹{r.freight}</td>
                                    <td className="px-3 py-2 border-r text-right">₹{r.advance}</td>
                                    <td className="px-3 py-2 border-r text-right">₹{r.balance}</td>
                                    <td className="px-3 py-2 border-r text-right">₹{r.otherExpenses}</td>
                                    <td className="px-3 py-2 border-r text-right font-bold text-red-600">₹{r.totalBalance}</td>
                                    <td className="px-3 py-2 border-r">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.podStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.podStatus}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 border-r">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.paymentStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.paymentStatus}
                                        </span>
                                    </td>
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
                                <th className="px-3 py-3 border-r">Booking ID</th>
                                <th className="px-3 py-3 border-r">Date</th>
                                <th className="px-3 py-3 border-r">Party Name</th>
                                <th className="px-3 py-3 border-r">GR Number</th>
                                <th className="px-3 py-3 border-r">Lorry No</th>
                                <th className="px-3 py-3 border-r">Route</th>
                                <th className="px-3 py-3 border-r">Weight</th>
                                <th className="px-3 py-3 border-r">Freight</th>
                                <th className="px-3 py-3 border-r">Total Balance</th>
                                <th className="px-3 py-3 border-r">Payment</th>
                                <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2 border-r font-medium text-blue-600">{r.bookingId || '-'}</td>
                                    <td className="px-3 py-2 border-r whitespace-nowrap">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-3 py-2 border-r font-medium">{r.partyName}</td>
                                    <td className="px-3 py-2 border-r">{r.grNo}</td>
                                    <td className="px-3 py-2 border-r">{r.lorryNo}</td>
                                    <td className="px-3 py-2 border-r">{r.fromPlace} - {r.toPlace}</td>
                                    <td className="px-3 py-2 border-r">{r.weight}</td>
                                    <td className="px-3 py-2 border-r text-right">₹{r.freight}</td>
                                    <td className="px-3 py-2 border-r text-right font-bold text-red-600">₹{r.totalBalance}</td>
                                    <td className="px-3 py-2 border-r">
                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.paymentStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.paymentStatus}
                                        </span>
                                    </td>
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
                                <th className="px-3 py-3 border-r">Address</th>
                                <th className="px-3 py-3 border-r">City</th>
                                <th className="px-3 py-3 border-r">Contact</th>
                                <th className="px-3 py-3 border-r">GSTIN</th>
                                <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2 border-r font-bold">{p.name}</td>
                                    <td className="px-3 py-2 border-r">{p.type}</td>
                                    <td className="px-3 py-2 border-r truncate max-w-xs">{p.address}</td>
                                    <td className="px-3 py-2 border-r">{p.city}</td>
                                    <td className="px-3 py-2 border-r">{p.contact}</td>
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
                            {filtered.map(t => (
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

    // Database Setup Tab (Legacy DataManagement)
    if (activeTab === 'database-setup') {
        return (
             <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg min-h-[500px]">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <DashboardIcon className="w-6 h-6 text-gray-600"/>
                    </button>
                    <h2 className="text-2xl font-bold text-ssk-blue">Data Management & Setup</h2>
                </div>

                <div className="flex space-x-1 border-b border-gray-300 mb-6 overflow-x-auto">
                    {['vehicle-hiring', 'booking-register', 'customer-details', 'vehicle-fleet', 'database-setup'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as Tab)}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                                activeTab === tab
                                    ? 'border-b-2 border-ssk-blue text-ssk-blue bg-blue-50/50'
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                     <div className="flex">
                        <div className="flex-shrink-0">
                             <CheckCircleIcon className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700 font-bold">
                                Database Migration Required?
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                                If you are facing "Schema Cache" errors or missing columns, run the script below in Supabase.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Supabase SQL Script</h3>
                         <button 
                            onClick={handleCopy}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                        >
                            {copied ? <CheckCircleIcon className="w-5 h-5"/> : null}
                            {copied ? 'Copied!' : 'Copy Script'}
                        </button>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[400px] border border-gray-700 shadow-inner">
                        <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">{sqlScript}</pre>
                    </div>
                </div>
            </div>
        );
    }

    // Main Data Management Interface
    return (
        <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg min-h-[600px] border border-gray-200">
            {/* Header */}
            <div className="flex flex-col gap-1 mb-6">
                 <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <DashboardIcon className="w-6 h-6 text-gray-600"/>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
                 </div>
                 <p className="text-sm text-gray-500 ml-11">View, import, and export all records in Excel-like format</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Search across all fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {/* Tabs */}
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

            {/* Table Area */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Table Header Controls */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {activeTab.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Records
                        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{getRecordCount()}</span>
                    </h3>
                    <div className="flex gap-2">
                        <button className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-sm">
                            <PlusIcon className="w-4 h-4 mr-1.5" /> Add New
                        </button>
                        <button className="flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 shadow-sm">
                            <DocumentTextIcon className="w-4 h-4 mr-1.5 text-green-600" /> Excel
                        </button>
                         <button className="flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 shadow-sm">
                            <PrintIcon className="w-4 h-4 mr-1.5 text-gray-600" /> PDF
                        </button>
                         <button className="flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 shadow-sm">
                            <UploadIcon className="w-4 h-4 mr-1.5 text-blue-600" /> Import
                        </button>
                    </div>
                </div>

                {/* Actual Table */}
                <div className="min-h-[300px]">
                    {renderTableContent()}
                </div>
                
                {/* Pagination (Visual Only) */}
                <div className="p-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-gray-50/30">
                    <span>Showing 1 to {getRecordCount()} of {getRecordCount()} entries</span>
                    <div className="flex gap-1">
                        <button disabled className="px-2 py-1 border rounded bg-gray-100 disabled:opacity-50">Previous</button>
                        <button className="px-2 py-1 border rounded bg-blue-50 text-blue-600 font-bold">1</button>
                        <button disabled className="px-2 py-1 border rounded bg-gray-100 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;
