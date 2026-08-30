import React, { useState } from 'react';
import { LorryReceipt, LRStatus, View } from '../types';
import { CurrencyRupeeIcon, TruckIcon, UsersIcon, ListIcon, CreateIcon, PencilIcon, CheckCircleIcon, ClockIcon, XIcon, UploadIcon, DashboardIcon, InvoiceIcon, DocumentTextIcon, ArrowLeftIcon, CogIcon, ExclamationTriangleIcon } from './icons';
import { Language, t } from '../utils/translations';

interface DashboardProps {
    lorryReceipts: LorryReceipt[];
    onAddNew: () => void;
    onViewList: () => void;
    onViewVouchers?: () => void;
    onEditLR: (lrNo: string) => void;
    setCurrentView: (view: View) => void;
    language: Language;
    activeSection: 'lr' | 'data' | 'emergency' | null;
    setActiveSection: (section: 'lr' | 'data' | 'emergency' | null) => void;
    currentRole: 'Admin' | 'Manager' | 'Operator';
    rbacEnabled?: boolean;
    managerRequests?: any[];
    onApproveManagerRequest?: (request: any) => void;
    onRejectManagerRequest?: (requestId: string) => void;
}

// -------------------------------------------------------------
// 1. 3D CLAYMORPHIC KPI CARD COMPONENT
// -------------------------------------------------------------
interface ClayKPICardProps {
    title: string;
    value: string | number;
    theme: 'bronze' | 'teal' | 'pink' | 'lime';
    icon: React.ReactNode;
    sparklineColor: string;
    onClick?: () => void;
}

const ClayKPICard: React.FC<ClayKPICardProps> = ({ title, value, theme, icon, sparklineColor, onClick }) => {
    const themeStyles = {
        bronze: {
            bg: 'bg-gradient-to-br from-[#c8764a] via-[#b36338] to-[#924b23]',
            shadow: 'shadow-[0_16px_32px_-6px_rgba(146,75,35,0.45),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.3)]',
            border: 'border border-[#d9875a]/50',
            glow: 'rgba(200, 118, 74, 0.4)'
        },
        teal: {
            bg: 'bg-gradient-to-br from-[#18a2a5] via-[#108386] to-[#0a585a]',
            shadow: 'shadow-[0_16px_32px_-6px_rgba(10,88,90,0.45),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.3)]',
            border: 'border border-[#25b8bb]/50',
            glow: 'rgba(24, 162, 165, 0.4)'
        },
        pink: {
            bg: 'bg-gradient-to-br from-[#e44686] via-[#cb2d6f] to-[#9e1b52]',
            shadow: 'shadow-[0_16px_32px_-6px_rgba(158,27,82,0.45),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.3)]',
            border: 'border border-[#f05a98]/50',
            glow: 'rgba(228, 70, 134, 0.4)'
        },
        lime: {
            bg: 'bg-gradient-to-br from-[#a6d15b] via-[#8bbd3e] to-[#689426]',
            shadow: 'shadow-[0_16px_32px_-6px_rgba(104,148,38,0.45),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.3)]',
            border: 'border border-[#b8e070]/50',
            glow: 'rgba(166, 209, 91, 0.4)'
        }
    };

    const st = themeStyles[theme];

    return (
        <div
            onClick={onClick}
            className={`
                relative overflow-hidden rounded-3xl p-5 text-white ${st.bg} ${st.shadow} ${st.border}
                transform transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] active:scale-95
                flex items-center justify-between min-h-[110px] cursor-pointer group select-none
            `}
        >
            {/* Ambient Background Wave SVG */}
            <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                    <path
                        d="M0,50 Q40,20 80,45 T160,30 T200,40"
                        fill="none"
                        stroke={sparklineColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    />
                </svg>
            </div>

            {/* Left Content */}
            <div className="relative z-10 space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/80 drop-shadow-sm">
                    {title}
                </p>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                    {value}
                </p>
            </div>

            {/* Right 3D Embossed Icon Token */}
            <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md border border-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_8px_16px_rgba(0,0,0,0.2)] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    {icon}
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// 2. NEW WEEKLY TREND DARK GLASSMORPHIC CHART COMPONENT
// -------------------------------------------------------------
const WeeklyTrendGlassChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    // Generate multi-wave coordinates
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const wavePointsCyan = [
        { day: 'Mon', x: 20, y: 70, val: 2 },
        { day: 'Tue', x: 70, y: 35, val: 2 },
        { day: 'Wed', x: 120, y: 55, val: 3 },
        { day: 'Thu', x: 170, y: 25, val: 15 },
        { day: 'Fri', x: 220, y: 45, val: 11 },
        { day: 'Sat', x: 270, y: 15, val: 15 },
        { day: 'Sun', x: 320, y: 45, val: 3 }
    ];

    return (
        <div className="bg-[#111520] rounded-3xl p-6 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-white relative overflow-hidden flex flex-col justify-between h-full min-h-[360px]">
            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                    <h3 className="text-base font-black tracking-wider uppercase text-white">
                        NEW WEEKLY TREND
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        DAILY VOLUME & COMPLETION
                    </p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
            </div>

            {/* Glowing SVG Multi-Wave Chart Area */}
            <div className="relative w-full flex-grow my-3 flex items-center justify-center">
                <svg className="w-full h-48 overflow-visible" viewBox="0 0 340 100" preserveAspectRatio="none">
                    <defs>
                        {/* Cyan Gradient */}
                        <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                        </linearGradient>
                        {/* Gold Gradient */}
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                        </linearGradient>
                        {/* Purple Gradient */}
                        <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Subtle Grid Lines */}
                    <line x1="0" y1="20" x2="340" y2="20" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                    <line x1="0" y1="50" x2="340" y2="50" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="340" y2="80" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />

                    {/* Purple Lower Wave */}
                    <path
                        d="M0,85 C40,82 60,65 90,65 C120,65 140,78 170,70 C200,62 230,75 260,65 C290,55 310,72 340,70 L340,100 L0,100 Z"
                        fill="url(#purpleGrad)"
                    />
                    <path
                        d="M0,85 C40,82 60,65 90,65 C120,65 140,78 170,70 C200,62 230,75 260,65 C290,55 310,72 340,70"
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="2.5"
                    />

                    {/* Gold Mid Wave */}
                    <path
                        d="M0,75 C40,70 60,50 90,52 C120,54 140,68 170,52 C200,36 230,60 260,42 C290,25 310,55 340,55 L340,100 L0,100 Z"
                        fill="url(#goldGrad)"
                    />
                    <path
                        d="M0,75 C40,70 60,50 90,52 C120,54 140,68 170,52 C200,36 230,60 260,42 C290,25 310,55 340,55"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.5"
                    />

                    {/* Cyan Top Wave (Dominant) */}
                    <path
                        d="M0,70 C40,68 60,32 90,35 C120,38 140,58 170,25 C200,10 230,48 260,15 C290,0 310,45 340,40 L340,100 L0,100 Z"
                        fill="url(#cyanGrad)"
                    />
                    <path
                        d="M0,70 C40,68 60,32 90,35 C120,38 140,58 170,25 C200,10 230,48 260,15 C290,0 310,45 340,40"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="3"
                        className="drop-shadow-[0_0_10px_#22d3ee]"
                    />

                    {/* Floating Value Pill Pins */}
                    {wavePointsCyan.map((pt, idx) => (
                        <g key={idx}>
                            {/* Outer Glow Ring */}
                            <circle cx={pt.x} cy={pt.y} r="3.5" fill="#22d3ee" className="animate-ping opacity-75" />
                            <circle cx={pt.x} cy={pt.y} r="3.5" fill="#ffffff" stroke="#0891b2" strokeWidth="2" />

                            {/* Floating Number Badge Pill */}
                            <rect
                                x={pt.x - 8}
                                y={pt.y - 18}
                                width="16"
                                height="12"
                                rx="3"
                                fill="#0e7490"
                                stroke="#22d3ee"
                                strokeWidth="0.8"
                                className="shadow-lg"
                            />
                            <text
                                x={pt.x}
                                y={pt.y - 9.5}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="7"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                            >
                                {pt.val}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Bottom Days Axis */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase pt-2 border-t border-slate-800/80">
                {days.map(d => (
                    <span key={d} className="hover:text-cyan-400 transition-colors cursor-pointer">
                        {d}
                    </span>
                ))}
            </div>

            {/* Ambient Cyan Base Glow */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-cyan-500/20 blur-xl pointer-events-none"></div>
        </div>
    );
};

// -------------------------------------------------------------
// 3. MAIN DASHBOARD COMPONENT
// -------------------------------------------------------------
const Dashboard: React.FC<DashboardProps> = ({
    lorryReceipts,
    onAddNew,
    onViewList,
    onViewVouchers,
    onEditLR,
    setCurrentView,
    language,
    activeSection,
    setActiveSection,
    currentRole,
    rbacEnabled,
    managerRequests = [],
    onApproveManagerRequest,
    onRejectManagerRequest
}) => {

    // --- Metric Calculations ---
    const totalLRs = lorryReceipts.length;
    const totalFreight = lorryReceipts.reduce((sum, lr) => sum + (Number(lr.freight) || 0), 0);
    const uniqueConsignors = new Set(lorryReceipts.map(lr => lr.consignor.name.trim()).filter(Boolean)).size;
    const recentLRs = lorryReceipts.slice(0, 6);
    const podsPending = lorryReceipts.filter(lr => lr.status === 'Delivered' && !lr.pod_path).length;

    const statusCounts = lorryReceipts.reduce((acc, lr) => {
        acc[lr.status] = (acc[lr.status] || 0) + 1;
        return acc;
    }, {} as Record<LRStatus, number>);

    // Format freight for KPI card (e.g. ₹4L or ₹42.5K)
    const formatCompactFreight = (amount: number) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
        }
        if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
        }
        return `₹${amount}`;
    };

    // Calculate Last 7 Days chart data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        return {
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            value: 0
        };
    }).reverse();

    // Default to 'lr' view if activeSection is null or 'lr'
    const isLRSectionActive = activeSection === 'lr' || activeSection === null;

    return (
        <div className="space-y-6 md:space-y-8 pb-16 animate-fadeIn">
            {/* Top Navigation & Action Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs">
                {/* Left: Back Button & Title */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (activeSection) setActiveSection(null);
                        }}
                        className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
                        title="Back"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                            LR Management Dashboard
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">Real-time logistics analytics & consignment operations</p>
                    </div>
                </div>

                {/* Right: Action Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* + New LR Pill */}
                    {currentRole !== 'Manager' && (
                        <button
                            onClick={onAddNew}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 hover:shadow-lg transition-all active:scale-95"
                        >
                            <span className="text-base font-black">+</span>
                            New LR
                        </button>
                    )}

                    {/* New Invoice Pill */}
                    {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                        <button
                            onClick={() => setCurrentView('invoices')}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all active:scale-95"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            New Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Navigation Filter Bar */}
            <div className="flex items-center justify-end gap-2 flex-wrap">
                <button
                    onClick={() => setCurrentView('invoices')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#be185d] hover:bg-[#9d174d] text-white font-bold text-xs shadow-sm transition-all"
                >
                    <InvoiceIcon className="w-4 h-4" />
                    Invoices
                </button>
                <button
                    onClick={onAddNew}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs shadow-sm transition-all"
                >
                    <CreateIcon className="w-4 h-4" />
                    Create LR
                </button>
                {onViewVouchers && (
                    <button
                        onClick={onViewVouchers}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs shadow-sm transition-all"
                    >
                        <span>📑</span>
                        Vouchers
                    </button>
                )}
                <button
                    onClick={onViewList}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs shadow-sm transition-all"
                >
                    <ListIcon className="w-4 h-4" />
                    List
                </button>
            </div>

            {/* Manager / Operator Notices */}
            {rbacEnabled && currentRole === 'Manager' && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-xs font-semibold">
                    <span>👁️</span>
                    <span>You are in <strong>View Only</strong> mode. You can inspect all LRs and tracking details.</span>
                </div>
            )}

            {/* --- 1. TOP 4 3D CLAYMORPHIC KPI CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {/* 1. TOTAL LRs (Bronze/Copper) */}
                <ClayKPICard
                    title="TOTAL LRs"
                    value={totalLRs}
                    theme="bronze"
                    sparklineColor="#fdba74"
                    onClick={onViewList}
                    icon={
                        <div className="text-white">
                            <TruckIcon className="w-8 h-8" />
                        </div>
                    }
                />

                {/* 2. FREIGHT VALUE (Teal/Emerald) */}
                <ClayKPICard
                    title="FREIGHT VALUE"
                    value={formatCompactFreight(totalFreight)}
                    theme="teal"
                    sparklineColor="#67e8f9"
                    icon={
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 text-amber-950 font-black text-xl flex items-center justify-center shadow-md border-2 border-white/60">
                            ₹
                        </div>
                    }
                />

                {/* 3. CONSIGNORS (Magenta/Pink) */}
                <ClayKPICard
                    title="CONSIGNORS"
                    value={uniqueConsignors}
                    theme="pink"
                    sparklineColor="#f472b6"
                    icon={
                        <div className="text-white">
                            <UsersIcon className="w-8 h-8" />
                        </div>
                    }
                />

                {/* 4. PENDING PODS (Lime/Olive Green) */}
                <ClayKPICard
                    title="PENDING PODS"
                    value={podsPending}
                    theme="lime"
                    sparklineColor="#fde047"
                    icon={
                        <div className="text-white">
                            <UploadIcon className="w-8 h-8" />
                        </div>
                    }
                />
            </div>

            {/* --- 2. 3D HIGHWAY / SHIPMENT STATUS PIPELINE --- */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                        Shipment Status
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Live Fleet Track
                    </span>
                </div>

                {/* 3D Highway Track */}
                <div className="relative overflow-x-auto pb-2">
                    <div className="min-w-[700px] flex items-center justify-between gap-3 relative py-2 px-1">
                        {/* Background Road Curve */}
                        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-10 bg-slate-100 rounded-full border-2 border-slate-200/80 shadow-inner z-0 overflow-hidden flex items-center">
                            <div className="w-full border-t-2 border-dashed border-cyan-400/80 opacity-60"></div>
                        </div>

                        {/* STAGE 1: BOOKED */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2 px-4 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">BOOKED</span>
                                <span className="text-lg font-black text-slate-800">{statusCounts['Booked'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                +
                            </div>
                        </div>

                        {/* STAGE 2: IN TRANSIT (With 3D Truck on the Highway) */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-teal-400 rounded-full py-2 px-4 shadow-md bg-teal-50/20">
                            <div>
                                <span className="block text-[9px] font-extrabold text-teal-700 uppercase tracking-wider">IN TRANSIT</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {/* 3D Cargo Truck Container Graphic */}
                                    <div className="flex items-center bg-[#1e3a8a] text-white px-2 py-0.5 rounded text-[10px] font-black font-mono shadow-xs">
                                        SSK 2664
                                    </div>
                                    <span className="text-sm font-black text-teal-800">
                                        ({statusCounts['In Transit'] || 0})
                                    </span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-sm">
                                <TruckIcon className="w-5 h-5" />
                            </div>
                        </div>

                        {/* STAGE 3: OUT FOR DELIVERY */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2 px-4 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">OUT FOR DELIVERY</span>
                                <span className="text-lg font-black text-slate-800">{statusCounts['Out for Delivery'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center shadow-sm">
                                <ClockIcon className="w-4 h-4" />
                            </div>
                        </div>

                        {/* STAGE 4: DELIVERED (Golden Delivery Shield Emblem) */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2 px-4 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">DELIVERED</span>
                                <span className="text-lg font-black text-slate-800">{statusCounts['Delivered'] || 0}</span>
                            </div>
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 flex items-center justify-center shadow-md border border-amber-200">
                                <span>📦</span>
                            </div>
                        </div>

                        {/* STAGE 5: CANCELLED */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2 px-4 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CANCELLED</span>
                                <span className="text-lg font-black text-slate-800">{statusCounts['Cancelled'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-sm">
                                <XIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 3. MIDDLE SECTION: RECENT LRs & NEW WEEKLY TREND --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left 7 Cols: Recent Lorry Receipts */}
                <div className="lg:col-span-7 bg-white/90 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                            <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                                Recent Lorry Receipts
                            </h3>
                            <button
                                onClick={onViewList}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                View All ➔
                            </button>
                        </div>

                        {/* Recent LRs Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        <th className="pb-3">LR NO</th>
                                        <th className="pb-3">DATE</th>
                                        <th className="pb-3">TRUCK</th>
                                        <th className="pb-3 text-right">FREIGHT</th>
                                        <th className="pb-3 text-center">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentLRs.length > 0 ? (
                                        recentLRs.map((lr) => (
                                            <tr key={lr.lrNo} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 font-bold text-blue-600 font-mono">
                                                    {lr.lrNo}
                                                </td>
                                                <td className="py-3 text-slate-600">
                                                    {lr.date ? new Date(lr.date).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="py-3 font-semibold text-slate-800">
                                                    <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                                                    {lr.truckNo || 'Not Assigned'}
                                                </td>
                                                <td className="py-3 text-right font-black text-slate-900">
                                                    ₹ {Number(lr.freight || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3 text-center">
                                                    <button
                                                        onClick={() => onEditLR(lr.lrNo)}
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Open LR"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                                No Lorry Receipts created yet. Click "+ New LR" to start!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right 5 Cols: NEW WEEKLY TREND (Dark Glassmorphic Card) */}
                <div className="lg:col-span-5">
                    <WeeklyTrendGlassChart data={last7DaysData} />
                </div>
            </div>

            {/* --- 4. BOTTOM SECTION: UPCOMING DELIVERIES --- */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                        Upcoming Deliveries
                    </h3>
                    <span className="text-xs font-bold text-slate-400">Scheduled Routes</span>
                </div>

                <div className="space-y-3">
                    {/* Sample / Live Upcoming Item 1 */}
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors">
                        <div className="w-6 h-6 rounded-full border-4 border-cyan-400 shadow-sm flex-shrink-0"></div>
                        <div className="flex-1">
                            <div className="h-2.5 bg-slate-200 rounded-full w-3/4 mb-1.5"></div>
                            <div className="h-2 bg-slate-100 rounded-full w-1/2"></div>
                        </div>
                    </div>

                    {/* Sample / Live Upcoming Item 2 */}
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors">
                        <div className="w-6 h-6 rounded-full border-4 border-rose-400 shadow-sm flex-shrink-0"></div>
                        <div className="flex-1">
                            <div className="h-2.5 bg-slate-200 rounded-full w-2/3 mb-1.5"></div>
                            <div className="h-2 bg-slate-100 rounded-full w-1/3"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
