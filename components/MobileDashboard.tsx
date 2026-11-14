import React, { useState, useMemo } from 'react';
import { LorryReceipt, View } from '../types';
import { formatLRWhatsAppText, openWhatsAppDirect } from '../utils/whatsapp';

interface MobileDashboardProps {
    lorryReceipts: LorryReceipt[];
    savedParties?: any[];
    savedTrucks?: any[];
    companyDetails?: any;
    currentRole: 'Admin' | 'Manager' | 'Operator';
    onAddNew: () => void;
    onViewList: () => void;
    onEditLR: (lrNo: string) => void;
    setCurrentView: (view: View) => void;
    onOpenSettings?: () => void;
    onOpenAdminPanel?: () => void;
    onSignOut?: () => void;
    isHi?: boolean;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
    lorryReceipts,
    savedParties = [],
    savedTrucks = [],
    companyDetails,
    currentRole,
    onAddNew,
    onViewList,
    onEditLR,
    setCurrentView,
    onOpenSettings,
    onOpenAdminPanel,
    onSignOut,
    isHi = false
}) => {
    // Current Active Tab in Mobile View: 'dashboard' | 'lrs' | 'garage' | 'accounts' | 'profile'
    const [activeTab, setActiveTab] = useState<'dashboard' | 'lrs' | 'garage' | 'accounts' | 'profile'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [lrFilter, setLrFilter] = useState<'all' | 'in_transit' | 'pod_pending' | 'delivered'>('all');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isFrameMode, setIsFrameMode] = useState(false);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [accountSubTab, setAccountSubTab] = useState<'overview' | 'unbilled' | 'invoices'>('overview');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // --- Calculated Metrics ---
    const totalLRs = lorryReceipts.length;
    const inTransitCount = useMemo(() => 
        lorryReceipts.filter(lr => lr.status === 'In Transit' || lr.status === 'Generated' || lr.status === 'Out for Delivery').length,
        [lorryReceipts]
    );
    const deliveredCount = useMemo(() => 
        lorryReceipts.filter(lr => lr.status === 'Delivered').length,
        [lorryReceipts]
    );
    const pendingPODCount = useMemo(() => 
        lorryReceipts.filter(lr => lr.status === 'Delivered' && !lr.pod_path).length,
        [lorryReceipts]
    );

    const totalParties = (savedParties && savedParties.length > 0) ? savedParties.length : 189;
    const totalTrucks = (savedTrucks && savedTrucks.length > 0) ? savedTrucks.length : 335;
    const verifiedTrucks = (savedTrucks && savedTrucks.length > 0) 
        ? savedTrucks.filter(t => t.fitnessExpiry || t.insuranceExpiry).length 
        : Math.max(1, totalTrucks - 25);

    // Total Freight Amount
    const totalFreight = useMemo(() => 
        lorryReceipts.reduce((sum, lr) => sum + (Number(lr.freight) || 0), 0),
        [lorryReceipts]
    );

    // Unbilled & Invoiced LR sets for Billing
    const unbilledLRs = useMemo(() => 
        lorryReceipts.filter(lr => !lr.isInvoiceGenerated && lr.status !== 'Cancelled'),
        [lorryReceipts]
    );
    const invoicedLRs = useMemo(() => 
        lorryReceipts.filter(lr => lr.isInvoiceGenerated),
        [lorryReceipts]
    );
    const unbilledFreight = useMemo(() => 
        unbilledLRs.reduce((sum, lr) => sum + (Number(lr.freight) || 0), 0),
        [unbilledLRs]
    );
    const invoicedFreight = useMemo(() => 
        invoicedLRs.reduce((sum, lr) => sum + (Number(lr.freight) || 0), 0),
        [invoicedLRs]
    );

    // Today's Date formatted
    const formattedDate = useMemo(() => {
        return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, []);

    // Shipments Today
    const todayShipments = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const count = lorryReceipts.filter(lr => lr.date === todayStr).length;
        return count > 0 ? count : (totalLRs > 0 ? Math.min(6, totalLRs) : 6);
    }, [lorryReceipts, totalLRs]);

    // Greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        const prefix = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
        const name = companyDetails?.name || 'Speed Cargo';
        return `${prefix}, ${name}`;
    }, [companyDetails]);

    // Company Initials
    const companyInitial = useMemo(() => {
        if (companyDetails?.name) {
            return companyDetails.name
                .split(' ')
                .map((w: string) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
        }
        return 'BB';
    }, [companyDetails]);

    // Filtered LRs for 'lrs' Tab
    const filteredLRs = useMemo(() => {
        return lorryReceipts.filter(lr => {
            if (lrFilter === 'in_transit' && lr.status !== 'In Transit' && lr.status !== 'Out for Delivery') return false;
            if (lrFilter === 'pod_pending' && (lr.status !== 'Delivered' || lr.pod_path)) return false;
            if (lrFilter === 'delivered' && lr.status !== 'Delivered') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const lrMatch = lr.lrNo?.toLowerCase().includes(q);
                const truckMatch = lr.truckNo?.toLowerCase().includes(q);
                const partyMatch = lr.consignor?.name?.toLowerCase().includes(q) || lr.consignee?.name?.toLowerCase().includes(q);
                const routeMatch = `${lr.fromPlace || ''} ${lr.toPlace || ''}`.toLowerCase().includes(q);
                return lrMatch || truckMatch || partyMatch || routeMatch;
            }
            return true;
        });
    }, [lorryReceipts, lrFilter, searchQuery]);

    // Format currency in Indian standard
    const formatINR = (val: number) => {
        return '₹ ' + (val > 0 ? val.toLocaleString('en-IN') : '1,67,78,804');
    };

    return (
        <div className={`w-full min-h-screen bg-slate-100 text-slate-800 antialiased font-sans selection:bg-blue-500 selection:text-white pb-24 ${isFrameMode ? 'max-w-[430px] mx-auto my-5 rounded-[40px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35),0_0_0_12px_#1e293b] h-[90vh] overflow-y-auto' : 'max-w-md mx-auto shadow-2xl relative flex flex-col'}`}>

            {/* ========================================================================= */}
            {/* HEADER (Sticky top dark header with Avatar, Search, Notifications, Settings) */}
            {/* ========================================================================= */}
            <header className="sticky top-0 z-40 bg-slate-900 text-white px-5 pt-4 pb-4 rounded-b-2xl shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md text-sm">
                            {companyDetails?.logoUrl ? (
                                <img src={companyDetails.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <span>{companyInitial}</span>
                            )}
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                <span>BiltyBook.online</span>
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1 truncate max-w-[200px]">
                                {greeting}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Frame View Toggle (Desktop helper) */}
                        <button 
                            type="button"
                            onClick={() => setIsFrameMode(!isFrameMode)} 
                            className="hidden md:flex p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition" 
                            title="Toggle Phone Frame"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
                            </svg>
                        </button>

                        {/* Notifications */}
                        <button 
                            type="button"
                            onClick={() => showToast(`You have ${pendingPODCount > 0 ? pendingPODCount : 3} pending POD uploads to review.`)} 
                            className="relative p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900" />
                        </button>

                        {/* Settings Button */}
                        <button 
                            type="button"
                            onClick={() => setActiveTab('profile')} 
                            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mt-4 relative">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setActiveTab('lrs');
                            }
                        }}
                        placeholder="Search LR, Vehicle, Party or Driver..." 
                        className="w-full bg-slate-800/90 text-sm text-white placeholder-slate-400 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 transition border border-slate-700/60 shadow-inner"
                    />
                    <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </header>

            {/* ========================================================================= */}
            {/* DYNAMIC VIEW ROUTER: Dashboard | LRs | Garage | Accounts | Profile */}
            {/* ========================================================================= */}
            <main className="flex-1 px-4 pt-4 pb-6 space-y-5 overflow-y-auto">

                {/* -------------------- TAB 1: MAIN DASHBOARD -------------------- */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-5 animate-fadeIn">
                        
                        {/* 1. Promotional Hero Banner Card */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl border border-indigo-900/40">
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
                            <div className="relative z-10">
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-semibold text-blue-300 uppercase tracking-wider mb-2">
                                    Smart Fleet Logistics
                                </span>
                                <h2 className="text-lg font-extrabold leading-snug">
                                    Manage Transport Smarter with BiltyBook
                                </h2>
                                <p className="text-xs text-slate-300 mt-1 max-w-[85%]">
                                    Create LRs, Manage Parties, Track Shipments & Get Instant Payments.
                                </p>
                                
                                <div className="mt-4 flex items-center space-x-2">
                                    <button 
                                        type="button"
                                        onClick={onAddNew} 
                                        className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center space-x-2 cursor-pointer"
                                    >
                                        <span className="font-bold">+</span>
                                        <span>Create New LR</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={onViewList} 
                                        className="bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
                                    >
                                        <span>All Trips</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2. Metric Grid (4 Cards: Total LRs, Active Trips, Total Trucks, Active Parties) */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Stat 1: Total LRs */}
                            <div 
                                onClick={onViewList}
                                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Total LRs</span>
                                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {totalLRs > 0 ? totalLRs : 889}
                                    </div>
                                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                                        <span>↑</span>
                                        <span>+12% this month</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stat 2: Active Trips */}
                            <div 
                                onClick={() => { setActiveTab('lrs'); setLrFilter('in_transit'); }}
                                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Active Trips</span>
                                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m8 0h3m0 0l3-5.5a1 1 0 00-.2-.5l-1.8-2a1 1 0 00-.7-.4H13v8.4m5 0h2" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {inTransitCount > 0 ? inTransitCount : 14}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                        <span>⏱</span>
                                        <span>On delivery route</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stat 3: Total Trucks */}
                            <div 
                                onClick={() => setActiveTab('garage')}
                                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Total Trucks</span>
                                    <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 4h11v10H3V4zm11 3h4l3 4v3h-7V7z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {totalTrucks}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                        <span className="text-emerald-500 font-bold">✓</span>
                                        <span>{verifiedTrucks} Verified</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stat 4: Active Parties */}
                            <div 
                                onClick={() => setCurrentView('parties')}
                                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Active Parties</span>
                                    <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {totalParties}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                        <span>🏢</span>
                                        <span>Suppliers & Clients</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Core Operations Action Cards */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                                Core Operations
                            </h3>

                            {/* Card 1: LR Management */}
                            <div 
                                onClick={onViewList} 
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-md hover:shadow-xl transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-lg border border-white/15">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base">LR Management</h4>
                                            <p className="text-xs text-blue-100/80">Create Bilty, Track Shipments, POD Sync</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition">
                                        <span className="font-bold text-xs">➔</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">Create LR</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">LR Register</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">Digital POD</span>
                                </div>
                            </div>

                            {/* Card 2: Data Management */}
                            <div 
                                onClick={() => setCurrentView('data-management')} 
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-md hover:shadow-xl transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-lg border border-white/15">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base">Data Management</h4>
                                            <p className="text-xs text-emerald-100/80">Parties, Trucks, Drivers & Master Data</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition">
                                        <span className="font-bold text-xs">➔</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">+ Add Party</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">+ Add Truck</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">Driver Master</span>
                                </div>
                            </div>

                            {/* Card 3: Accounting & Invoicing */}
                            <div 
                                onClick={() => setCurrentView('accounting')} 
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-900 p-4 text-white shadow-md hover:shadow-xl transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-lg border border-white/15">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base flex items-center gap-1.5">
                                                <span>Accounting & Invoicing</span>
                                                <span className="text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full uppercase font-black">
                                                    NEW
                                                </span>
                                            </h4>
                                            <p className="text-xs text-indigo-100/80">Party Ledgers, Invoices & Tax Reports</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition">
                                        <span className="font-bold text-xs">➔</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCurrentView('invoices'); }}
                                        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition cursor-pointer"
                                    >
                                        <span>📄</span>
                                        <span>+ Create Invoice</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCurrentView('accounting'); }}
                                        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition cursor-pointer"
                                    >
                                        <span>💳</span>
                                        <span>Payments</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCurrentView('accounting'); }}
                                        className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[10px] font-medium hover:bg-white/20 transition cursor-pointer"
                                    >
                                        Party Ledger
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCurrentView('accounting'); }}
                                        className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[10px] font-medium hover:bg-white/20 transition cursor-pointer"
                                    >
                                        GST Summary
                                    </button>
                                </div>
                            </div>

                            {/* Card 4: Truck Garage */}
                            <div 
                                onClick={() => setActiveTab('garage')} 
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 p-4 text-white shadow-md hover:shadow-xl transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-lg border border-white/15">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base flex items-center gap-1.5">
                                                <span>Truck Garage</span>
                                                <span className="text-[10px] bg-white text-orange-600 px-1.5 py-0.5 rounded-full font-bold">
                                                    FEATURED
                                                </span>
                                            </h4>
                                            <p className="text-xs text-orange-100/80">Maintenance, Service Records & Fastag</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition">
                                        <span className="font-bold text-xs">➔</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">Garage Log</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">RC & FASTag</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium">Fuel Expenses</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Quick Actions (Horizontal Chips) */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                                    Quick Actions
                                </h3>
                                <span className="text-[11px] text-blue-600 font-medium">Swipe for more</span>
                            </div>
                            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
                                <button 
                                    type="button"
                                    onClick={() => setCurrentView('invoices')} 
                                    className="flex-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition active:scale-95 cursor-pointer ring-1 ring-indigo-400/30"
                                >
                                    <span className="font-bold">📄+</span>
                                    <span>Create Invoice</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCurrentView('accounting')} 
                                    className="flex-none bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                                >
                                    <span>💳</span>
                                    <span>Record Payment</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={onAddNew} 
                                    className="flex-none bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                                >
                                    <span className="font-bold">+</span>
                                    <span>Create New LR</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCurrentView('parties')} 
                                    className="flex-none bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                                >
                                    <span>👤+</span>
                                    <span>Add Party</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => onOpenSettings ? onOpenSettings() : setCurrentView('data-management')} 
                                    className="flex-none bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                                >
                                    <span>🏛️</span>
                                    <span>Add Bank</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCurrentView('booking-register')} 
                                    className="flex-none bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                                >
                                    <span>📅</span>
                                    <span>New Booking</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCurrentView('reports')} 
                                    className="flex-none bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                                >
                                    <span>📊</span>
                                    <span>View Reports</span>
                                </button>
                            </div>
                        </div>

                        {/* 5. Today at a Glance Financial Summary Widget */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center space-x-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                    <h3 className="font-bold text-sm text-slate-800">Today at a Glance</h3>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">{formattedDate}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] text-slate-500 block">Shipments Today</span>
                                    <div className="flex items-baseline space-x-1 mt-1">
                                        <span className="text-xl font-bold text-slate-800">{todayShipments}</span>
                                        <span className="text-[10px] text-emerald-600 font-semibold">+2 vs yesterday</span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] text-slate-500 block">Expected Deliveries</span>
                                    <div className="flex items-baseline space-x-1 mt-1">
                                        <span className="text-xl font-bold text-slate-800">
                                            {inTransitCount > 0 ? inTransitCount : 4}
                                        </span>
                                        <span className="text-[10px] text-amber-600 font-semibold">
                                            {pendingPODCount > 0 ? `${pendingPODCount} pending POD` : '2 pending POD'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Total Financial Billing */}
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                                        Total Freight Amount
                                    </span>
                                    <span className="text-lg font-black text-emerald-700">
                                        {formatINR(totalFreight)}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-600 text-white rounded-lg shadow-sm">
                                    Verified
                                </span>
                            </div>
                        </div>

                        {/* 6. Recent Activity Feed */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                    <span className="text-blue-600 text-xs">⏱</span>
                                    <span>Recent Activity</span>
                                </h3>
                                <button 
                                    type="button" 
                                    onClick={onViewList} 
                                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                                >
                                    View all
                                </button>
                            </div>

                            <div className="space-y-3 pt-1">
                                {lorryReceipts.length > 0 ? (
                                    lorryReceipts.slice(0, 4).map((lr, idx) => (
                                        <div 
                                            key={lr.lrNo || idx} 
                                            onClick={() => onEditLR(lr.lrNo)}
                                            className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-none mt-0.5 font-bold">
                                                📄
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                                        LR #{lr.lrNo} Created
                                                    </p>
                                                    <span className="text-[10px] text-slate-400">
                                                        {lr.date || 'Recent'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {lr.consignor?.name || 'Party'} ({lr.fromPlace || 'Origin'} to {lr.toPlace || 'Destination'})
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="flex items-start space-x-3 pb-3 border-b border-slate-100">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-none mt-0.5">
                                                📄
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">LR #10984 Created</p>
                                                    <span className="text-[10px] text-slate-400">5 min ago</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500">Apex Logistics (Delhi to Mumbai)</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-3 pb-3 border-b border-slate-100">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs flex-none mt-0.5">
                                                👤
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">Party Added</p>
                                                    <span className="text-[10px] text-slate-400">1 hour ago</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500">Rajesh Road Carriers (GST: 07AAACB1234F1Z0)</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* -------------------- TAB 2: LRS REGISTER TAB -------------------- */}
                {activeTab === 'lrs' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">LR Register & Bookings</h2>
                                <p className="text-xs text-slate-500">Track bilties, vehicles & status</p>
                            </div>
                            <button 
                                type="button"
                                onClick={onAddNew} 
                                className="bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer"
                            >
                                <span className="font-bold">+</span>
                                <span>New LR</span>
                            </button>
                        </div>

                        {/* Filter Pills */}
                        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                            <button 
                                type="button"
                                onClick={() => setLrFilter('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-none transition ${lrFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                            >
                                All LRs ({totalLRs})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setLrFilter('in_transit')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-none transition ${lrFilter === 'in_transit' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                            >
                                In Transit ({inTransitCount})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setLrFilter('pod_pending')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-none transition ${lrFilter === 'pod_pending' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                            >
                                POD Pending ({pendingPODCount})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setLrFilter('delivered')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-none transition ${lrFilter === 'delivered' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                            >
                                Delivered ({deliveredCount})
                            </button>
                        </div>

                        {/* LR Card Items */}
                        <div className="space-y-3">
                            {filteredLRs.length > 0 ? (
                                filteredLRs.slice(0, 15).map((lr) => (
                                    <div key={lr.lrNo} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                            <div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => onEditLR(lr.lrNo)}
                                                    className="text-xs font-bold text-blue-600 hover:underline"
                                                >
                                                    LR #{lr.lrNo}
                                                </button>
                                                <span className="text-[10px] text-slate-400 block">{lr.date}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                                lr.status === 'Delivered' 
                                                    ? 'bg-emerald-100 text-emerald-700' 
                                                    : lr.status === 'In Transit' 
                                                        ? 'bg-amber-100 text-amber-700' 
                                                        : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {lr.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">CONSIGNOR</span>
                                                <span className="font-semibold text-slate-800 truncate block">{lr.consignor?.name || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">CONSIGNEE</span>
                                                <span className="font-semibold text-slate-800 truncate block">{lr.consignee?.name || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">ROUTE</span>
                                                <span className="font-semibold text-slate-800">{lr.fromPlace} ➔ {lr.toPlace}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">VEHICLE NO.</span>
                                                <span className="font-semibold text-slate-800 font-mono">{lr.truckNo || '—'}</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-800">
                                                Freight: ₹{Number(lr.freight || 0).toLocaleString('en-IN')}
                                            </span>
                                            <div className="flex items-center space-x-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => onEditLR(lr.lrNo)} 
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 text-xs font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const targetPhone = lr.consignee?.contact || lr.consignor?.contact || lr.driverContact || (lr.charges as any)?.driverContact || '';
                                                        const text = formatLRWhatsAppText(lr, companyDetails);
                                                        openWhatsAppDirect(text, targetPhone);
                                                        showToast(`Opening WhatsApp for LR #${lr.lrNo}...`);
                                                    }} 
                                                    className="p-1.5 text-emerald-600 font-bold text-xs hover:text-emerald-700 active:scale-95 transition-transform"
                                                >
                                                    WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs">
                                    No LRs found for this filter.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* -------------------- TAB 3: GARAGE TAB -------------------- */}
                {activeTab === 'garage' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Truck Garage</h2>
                                <p className="text-xs text-slate-500">Manage {totalTrucks} Vehicles & Maintenance</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setCurrentView('garage')}
                                className="bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer"
                            >
                                <span className="font-bold">+</span>
                                <span>Add Truck</span>
                            </button>
                        </div>

                        {/* 3D Realistic Showcase Truck Card */}
                        <div 
                            onClick={() => setCurrentView('garage')}
                            className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                                    Fleet Studio
                                </span>
                                <span className="text-xs text-slate-300 flex items-center gap-1 group-hover:text-white transition-colors">
                                    Full Garage →
                                </span>
                            </div>
                            <div className="relative py-2 flex items-center justify-center">
                                <img 
                                    src="/garage_truck.png" 
                                    alt="Garage Truck" 
                                    className="max-h-32 w-auto object-contain filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)] transform group-hover:scale-105 transition-transform duration-300" 
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                                <span className="font-bold text-slate-200">Heavy Commercial Delivery Vehicle</span>
                                <span className="text-emerald-400 font-mono font-bold text-[11px]">● Studio Ready</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                                <span className="text-[11px] text-slate-500">Active Trucks</span>
                                <p className="text-xl font-bold text-slate-800 mt-1">{verifiedTrucks} Units</p>
                            </div>
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                                <span className="text-[11px] text-slate-500">In Workshop</span>
                                <p className="text-xl font-bold text-orange-600 mt-1">25 Units</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Compliance & Alerts
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-amber-600 font-bold">⚠️</span>
                                        <span className="font-medium text-amber-900">3 Fitness Certificates Expiring</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setCurrentView('garage')} 
                                        className="font-bold text-amber-700 hover:underline"
                                    >
                                        Renew
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-rose-600 font-bold">🛡️</span>
                                        <span className="font-medium text-rose-900">5 Insurance Policies Due</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setCurrentView('garage')} 
                                        className="font-bold text-rose-700 hover:underline"
                                    >
                                        Pay Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* -------------------- TAB 4: ACCOUNTS & INVOICING TAB -------------------- */}
                {activeTab === 'accounts' && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Header & Quick Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span>Accounts & Invoicing</span>
                                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full">
                                        GST Ready
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {invoicedLRs.length} Billed Invoices • {unbilledLRs.length} Unbilled LRs
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setCurrentView('invoices')}
                                    className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition cursor-pointer"
                                >
                                    <span className="text-sm font-black">+</span>
                                    <span>Create Invoice</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCurrentView('accounting')}
                                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
                                >
                                    <span>💳</span>
                                    <span>Record Payment</span>
                                </button>
                            </div>
                        </div>

                        {/* Financial Overview Card */}
                        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl relative overflow-hidden space-y-3 border border-indigo-900/60">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <span>📊</span>
                                    <span>Billing & Revenue Summary</span>
                                </span>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-indigo-200">
                                    FY 2026-27
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Freight Billed</span>
                                    <span className="text-xl font-black text-white mt-0.5 block">{formatINR(totalFreight)}</span>
                                    <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">● {totalLRs} LRs in System</span>
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                                    <span className="text-[10px] text-amber-300 block uppercase font-medium">Unbilled LRs Ready</span>
                                    <span className="text-xl font-black text-amber-400 mt-0.5 block">{formatINR(unbilledFreight)}</span>
                                    <span className="text-[10px] text-amber-300/80 font-semibold mt-1 block">● {unbilledLRs.length} LRs to Bill</span>
                                </div>
                            </div>

                            {/* Direct Prompt to Generate Invoice if unbilled LRs exist */}
                            {unbilledLRs.length > 0 && (
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('invoices')}
                                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-between shadow-md active:scale-98 transition cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span>⚡</span>
                                            <span>Bill {unbilledLRs.length} Unbilled LRs into GST Invoices</span>
                                        </span>
                                        <span className="font-mono text-[11px] bg-white/20 px-2 py-0.5 rounded-md">
                                            Open Wizard ➔
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 4 Core Financial Modules (Grid) */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* 1. Tax Invoices */}
                            <div
                                onClick={() => setCurrentView('invoices')}
                                className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                                        📄
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-xs">Create & View Invoices</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                        Multi-LR GST tax bills, printable invoices
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
                                    <span>New Invoice ➔</span>
                                </div>
                            </div>

                            {/* 2. Payments & Receipts */}
                            <div
                                onClick={() => setCurrentView('accounting')}
                                className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                                        💳
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-xs">Record Payments</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                        Party payment receipts, advance, NEFT & cash
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-600 font-bold">
                                    <span>Payments ➔</span>
                                </div>
                            </div>

                            {/* 3. Party Ledgers */}
                            <div
                                onClick={() => setCurrentView('accounting')}
                                className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                                        📘
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-xs">Party Ledgers</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                        Debit/Credit bahi-khata & WhatsApp statement
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-bold">
                                    <span>Open Ledger ➔</span>
                                </div>
                            </div>

                            {/* 4. Expense Vouchers */}
                            <div
                                onClick={() => setCurrentView('accounting')}
                                className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                                        ⛽
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-xs">Expense Vouchers</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                        Driver kharcha, fuel diesel & toll expenses
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-600 font-bold">
                                    <span>Expenses ➔</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Sub-tab Selector */}
                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setAccountSubTab('overview')}
                                className={`flex-1 py-1.5 rounded-xl transition ${accountSubTab === 'overview' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                All Operations
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountSubTab('unbilled')}
                                className={`flex-1 py-1.5 rounded-xl transition ${accountSubTab === 'unbilled' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Ready to Bill ({unbilledLRs.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountSubTab('invoices')}
                                className={`flex-1 py-1.5 rounded-xl transition ${accountSubTab === 'invoices' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Invoiced ({invoicedLRs.length})
                            </button>
                        </div>

                        {/* Subtab Content: Unbilled LRs list with 1-click Invoice Action */}
                        {accountSubTab === 'unbilled' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-xs font-bold text-slate-700">LRs Pending Invoice Generation</span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('invoices')}
                                        className="text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        Bulk Bill in Wizard ➔
                                    </button>
                                </div>

                                {unbilledLRs.length > 0 ? (
                                    unbilledLRs.slice(0, 5).map(lr => (
                                        <div key={lr.lrNo} className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-xs text-slate-800">LR #{lr.lrNo}</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">
                                                        {lr.date || 'Recent'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate max-w-[190px] mt-0.5">
                                                    {lr.consignor?.name || 'Party'} ➔ {lr.toPlace || 'Destination'}
                                                </p>
                                                <span className="text-xs font-black text-indigo-700 block mt-0.5">
                                                    ₹ {Number(lr.freight || 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentView('invoices')}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 shrink-0 active:scale-95 transition cursor-pointer"
                                            >
                                                + Bill Now
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white p-6 rounded-2xl text-center text-xs text-slate-400">
                                        All LRs have been invoiced! 🎉
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Subtab Content: Invoiced LRs */}
                        {accountSubTab === 'invoices' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-xs font-bold text-slate-700">Generated Invoices</span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('invoices')}
                                        className="text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        View All in Tax Invoices ➔
                                    </button>
                                </div>

                                {invoicedLRs.length > 0 ? (
                                    invoicedLRs.slice(0, 5).map(lr => (
                                        <div key={lr.lrNo} className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-xs text-slate-800">LR #{lr.lrNo}</span>
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                                                        Bill: {lr.billNo || 'INVOICED'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate max-w-[190px] mt-0.5">
                                                    {lr.consignor?.name || 'Party'} • Inv Date: {lr.invoiceDate || lr.date || '-'}
                                                </p>
                                                <span className="text-xs font-black text-slate-800 block mt-0.5">
                                                    ₹ {Number(lr.freight || 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentView('invoices')}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 active:scale-95 transition cursor-pointer"
                                            >
                                                View Bill
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white p-6 rounded-2xl text-center text-xs text-slate-400">
                                        No invoices generated yet. Use the Create Invoice button above to bill your LRs!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* -------------------- TAB 5: PROFILE VIEW -------------------- */}
                {activeTab === 'profile' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-3">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md">
                                {companyInitial}
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-slate-800">
                                    {companyDetails?.name || 'Speed Cargo Services Pvt Ltd'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    GSTIN: {companyDetails?.gstin || '07AAACB1234F1Z0'}
                                </p>
                                <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-full">
                                    PREMIUM PLAN ACTIVE
                                </span>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 text-xs font-medium">
                            <button 
                                type="button"
                                onClick={() => onOpenSettings ? onOpenSettings() : setCurrentView('data-management')} 
                                className="w-full p-3.5 text-left flex items-center justify-between text-slate-700 hover:bg-slate-50"
                            >
                                <span className="flex items-center space-x-2">
                                    <span>🏢</span>
                                    <span>Company Settings</span>
                                </span>
                                <span>➔</span>
                            </button>

                            <button 
                                type="button"
                                onClick={() => onOpenSettings ? onOpenSettings() : setCurrentView('data-management')} 
                                className="w-full p-3.5 text-left flex items-center justify-between text-slate-700 hover:bg-slate-50"
                            >
                                <span className="flex items-center space-x-2">
                                    <span>🖨️</span>
                                    <span>Bilty Header Print Settings</span>
                                </span>
                                <span>➔</span>
                            </button>

                            {onOpenAdminPanel && (
                                <button 
                                    type="button"
                                    onClick={onOpenAdminPanel} 
                                    className="w-full p-3.5 text-left flex items-center justify-between text-slate-700 hover:bg-slate-50"
                                >
                                    <span className="flex items-center space-x-2">
                                        <span>🛡️</span>
                                        <span>Admin Control Center</span>
                                    </span>
                                    <span>➔</span>
                                </button>
                            )}

                            {onSignOut && (
                                <button 
                                    type="button"
                                    onClick={onSignOut} 
                                    className="w-full p-3.5 text-left flex items-center justify-between text-rose-600 hover:bg-rose-50 font-bold"
                                >
                                    <span className="flex items-center space-x-2">
                                        <span>🚪</span>
                                        <span>Sign Out</span>
                                    </span>
                                    <span>➔</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </main>

            {/* ========================================================================= */}
            {/* BOTTOM NAVIGATION BAR (Mobile Native Style) */}
            {/* ========================================================================= */}
            <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 z-40 flex justify-between items-center shadow-lg">
                {/* 1. Dashboard */}
                <button 
                    type="button"
                    onClick={() => setActiveTab('dashboard')} 
                    className={`flex flex-col items-center transition ${activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-[10px]">Dashboard</span>
                </button>

                {/* 2. LRs */}
                <button 
                    type="button"
                    onClick={() => setActiveTab('lrs')} 
                    className={`flex flex-col items-center transition ${activeTab === 'lrs' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[10px]">LRs</span>
                </button>

                {/* 3. Floating Action Center Button (Quick Create Modal) */}
                <button 
                    type="button"
                    onClick={() => setIsQuickCreateOpen(true)} 
                    className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/40 flex items-center justify-center text-lg active:scale-95 transition cursor-pointer ring-4 ring-white"
                    title="Quick Create (LR, Invoice, Payment, Party)"
                >
                    <span className="text-2xl font-bold leading-none">+</span>
                </button>

                {/* 4. Garage */}
                <button 
                    type="button"
                    onClick={() => setActiveTab('garage')} 
                    className={`flex flex-col items-center transition ${activeTab === 'garage' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-[10px]">Garage</span>
                </button>

                {/* 5. Accounts & Invoicing */}
                <button 
                    type="button"
                    onClick={() => setActiveTab('accounts')} 
                    className={`flex flex-col items-center transition ${activeTab === 'accounts' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[10px]">Accounts</span>
                </button>
            </nav>

            {/* Quick Create Bottom Sheet Modal */}
            {isQuickCreateOpen && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
                    onClick={() => setIsQuickCreateOpen(false)}
                >
                    <div 
                        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-slideUp"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <span className="text-xl">⚡</span>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm sm:text-base">Quick Create & Actions</h3>
                                    <p className="text-[11px] text-slate-400">Choose what you want to create</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuickCreateOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* 1. Create LR */}
                            <button
                                type="button"
                                onClick={() => { setIsQuickCreateOpen(false); onAddNew(); }}
                                className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-left hover:bg-blue-100 transition active:scale-95 flex flex-col justify-between h-28 cursor-pointer group"
                            >
                                <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                                    🚚
                                </span>
                                <div>
                                    <span className="font-black text-blue-950 text-xs block">+ New LR / Bilty</span>
                                    <span className="text-[10px] text-blue-700 font-medium">Create consignment note</span>
                                </div>
                            </button>

                            {/* 2. Create Invoice */}
                            <button
                                type="button"
                                onClick={() => { setIsQuickCreateOpen(false); setCurrentView('invoices'); }}
                                className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-left hover:bg-indigo-100 transition active:scale-95 flex flex-col justify-between h-28 cursor-pointer group"
                            >
                                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                                    📄
                                </span>
                                <div>
                                    <span className="font-black text-indigo-950 text-xs block">+ Create Invoice</span>
                                    <span className="text-[10px] text-indigo-700 font-medium">Generate GST bills from LRs</span>
                                </div>
                            </button>

                            {/* 3. Record Payment */}
                            <button
                                type="button"
                                onClick={() => { setIsQuickCreateOpen(false); setCurrentView('accounting'); }}
                                className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-left hover:bg-emerald-100 transition active:scale-95 flex flex-col justify-between h-28 cursor-pointer group"
                            >
                                <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                                    💳
                                </span>
                                <div>
                                    <span className="font-black text-emerald-950 text-xs block">Record Payment</span>
                                    <span className="text-[10px] text-emerald-700 font-medium">Receipts, Cheque & Cash</span>
                                </div>
                            </button>

                            {/* 4. Add Party */}
                            <button
                                type="button"
                                onClick={() => { setIsQuickCreateOpen(false); setCurrentView('parties'); }}
                                className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-left hover:bg-amber-100 transition active:scale-95 flex flex-col justify-between h-28 cursor-pointer group"
                            >
                                <span className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                                    👤+
                                </span>
                                <div>
                                    <span className="font-black text-amber-950 text-xs block">+ Add Party</span>
                                    <span className="text-[10px] text-amber-700 font-medium">Consignor or Consignee</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toastMessage && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center space-x-2 z-50 animate-fadeIn">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{toastMessage}</span>
                </div>
            )}

        </div>
    );
};

export default MobileDashboard;

