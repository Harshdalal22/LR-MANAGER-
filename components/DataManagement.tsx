
import React, { useState } from 'react';
import { DashboardIcon, CheckCircleIcon } from './icons';
import { toast } from 'react-hot-toast';

interface DataManagementProps {
    onBack: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onBack }) => {
    const [copied, setCopied] = useState(false);

    const sqlScript = `
-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Tables

-- Lorry Receipts Table (Composite PK for multi-tenancy)
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

-- Company Details Table (1:1 with User)
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

-- 3. Enable Row Level Security (RLS)
alter table public.lorry_receipts enable row level security;
alter table public.company_details enable row level security;
alter table public.saved_parties enable row level security;
alter table public.saved_trucks enable row level security;
alter table public.vehicle_hirings enable row level security;
alter table public.booking_registers enable row level security;

-- 4. Create Security Policies 
-- We drop policies first to ensure the script is idempotent and doesn't fail if they exist.

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

-- 5. Create Indexes for Performance
create index if not exists idx_vehicle_hirings_user_id on public.vehicle_hirings(user_id);
create index if not exists idx_vehicle_hirings_date on public.vehicle_hirings(date);
create index if not exists idx_booking_registers_user_id on public.booking_registers(user_id);
create index if not exists idx_booking_registers_date on public.booking_registers(date);
create index if not exists idx_lorry_receipts_date on public.lorry_receipts(date);

-- 6. Storage Buckets (Optional: Run if buckets exist or created via dashboard)
-- create policy "Users can upload own PODs" on storage.objects for insert with check ( bucket_id = 'pods' and auth.uid()::text = (storage.foldername(name))[1] );
-- create policy "Users can view own PODs" on storage.objects for select using ( bucket_id = 'pods' and auth.uid()::text = (storage.foldername(name))[1] );
-- create policy "Users can delete own PODs" on storage.objects for delete using ( bucket_id = 'pods' and auth.uid()::text = (storage.foldername(name))[1] );
-- create policy "Users can upload own Assets" on storage.objects for insert with check ( bucket_id = 'company-assets' and auth.uid()::text = (storage.foldername(name))[1] );
-- create policy "Users can view own Assets" on storage.objects for select using ( bucket_id = 'company-assets' and auth.uid()::text = (storage.foldername(name))[1] );
    `.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlScript);
        setCopied(true);
        toast.success('SQL Script copied to clipboard!');
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg min-h-[500px]">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <DashboardIcon className="w-6 h-6 text-gray-600"/>
                </button>
                <h2 className="text-2xl font-bold text-ssk-blue">Data Management & Setup</h2>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                         <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            <strong>Setup Required:</strong> Copy and run this SQL script in your Supabase SQL Editor to create all necessary tables and policies. This fixes "Failed to load" errors.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Database Schema (SQL)</h3>
                     <button 
                        onClick={handleCopy}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                        {copied ? <CheckCircleIcon className="w-5 h-5"/> : null}
                        {copied ? 'Copied!' : 'Copy SQL Script'}
                    </button>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[500px] border border-gray-700 shadow-inner">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">{sqlScript}</pre>
                </div>

                <div className="mt-6">
                    <h4 className="font-bold text-gray-800 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                        <li>Copy the SQL script above.</li>
                        <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Dashboard</a>.</li>
                        <li>Navigate to the <strong>SQL Editor</strong> section in the sidebar.</li>
                        <li>Paste the script into the query editor and click <strong>Run</strong>.</li>
                        <li>Once successful, return here and refresh the page to start using the new features.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;
