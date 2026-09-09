import React, { useState } from 'react';
import { LorryReceipt, LRStatus, View } from '../types';
import { CurrencyRupeeIcon, TruckIcon, UsersIcon, ListIcon, CreateIcon, PencilIcon, CheckCircleIcon, ClockIcon, XIcon, UploadIcon, DashboardIcon, InvoiceIcon, DocumentTextIcon, ArrowLeftIcon, CogIcon, ExclamationTriangleIcon, PhoneIcon } from './icons';
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
                relative overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-7 text-white ${st.bg} ${st.shadow} ${st.border}
                transform transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] active:scale-95
                flex items-center justify-between min-h-[115px] sm:min-h-[130px] lg:min-h-[145px] xl:min-h-[155px] cursor-pointer group select-none
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
            <div className="relative z-10 space-y-1.5">
                <p className="text-[11px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-white/90 drop-shadow-sm">
                    {title}
                </p>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
                    {value}
                </p>
            </div>

            {/* Right 3D Embossed Icon Token */}
            <div className="relative z-10">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 rounded-2xl lg:rounded-3xl bg-white/25 backdrop-blur-md border border-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_8px_16px_rgba(0,0,0,0.2)] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    {icon}
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// 2. FINANCIAL CALCULATION HELPER & TYPES
// -------------------------------------------------------------
export interface LRFinancials {
    basicFreight: number;
    totalCharges: number;
    totalFreight: number;
    advancePaid: number;
    receivedAmount: number;
    pendingAmount: number;
    isFullyPaid: boolean;
    hasInvoice: boolean;
    freightBasis: 'PAID' | 'TO PAY' | 'TO BE BILLED';
    debtorType: 'Consignor' | 'Consignee' | 'Billing Party';
    debtorName: string;
    debtorCity: string;
    debtorPhone: string;
}

export const getLRFinancials = (lr: LorryReceipt): LRFinancials => {
    const isCancelled = lr.status === 'Cancelled';
    const charges = lr.charges || ({} as any);

    const hamali = Number(charges.hamail) || 0;
    const doorDelivery = Number(charges.ddCharge) || 0;
    const statistical = Number(charges.stCharge) || 0;
    const tollTax = Number(charges.tollTax) || 0;
    const surcharge = Number(charges.surCharge) || 0;
    const collection = Number(charges.collectionCharge) || 0;
    const risk = Number(charges.riskCharge) || 0;
    const other = Number(charges.otherCharge) || 0;

    const totalCharges = hamali + doorDelivery + statistical + tollTax + surcharge + collection + risk + other;
    const basicFreight = Number(lr.freight) || 0;
    const totalFreight = basicFreight + totalCharges;
    const advancePaid = Number(lr.advancePaid ?? charges.advancePaid ?? 0);

    const rawBasis = String(lr.freightBasis || (lr.gstPaidBy === 'Consignor' ? 'PAID' : 'TO PAY')).toUpperCase();
    let freightBasis: 'PAID' | 'TO PAY' | 'TO BE BILLED' = 'TO PAY';
    if (rawBasis.includes('BILLED') || rawBasis.includes('TBB')) {
        freightBasis = 'TO BE BILLED';
    } else if (rawBasis.includes('PAID') && !rawBasis.includes('TO PAY')) {
        freightBasis = 'PAID';
    } else {
        freightBasis = 'TO PAY';
    }

    // Check if transporter invoice has been generated for this LR
    const hasInvoice = Boolean(lr.isInvoiceGenerated === true || lr.isInvoiceGenerated === ('true' as any));

    let receivedAmount = 0;
    let pendingAmount = 0;

    if (isCancelled) {
        receivedAmount = 0;
        pendingAmount = 0;
    } else if (hasInvoice || freightBasis === 'PAID') {
        // Jis LR ka invoice ban gaya ho uski bhi payment received ho chuki hai, ya fir PAID basis ho
        receivedAmount = totalFreight > 0 ? totalFreight : advancePaid;
        pendingAmount = 0;
    } else {
        // Non-invoiced TO PAY ya TO BE BILLED:
        // Jo advance aayi ho wo received amount me aayegi, baaki remaining pending me
        receivedAmount = Math.min(totalFreight, advancePaid);
        pendingAmount = Math.max(0, totalFreight - advancePaid);
    }

    let debtorType: 'Consignor' | 'Consignee' | 'Billing Party' = 'Consignee';
    let debtorName = lr.consignee?.name || 'Consignee';
    let debtorCity = lr.toPlace || lr.consignee?.city || '';
    let debtorPhone = lr.consignee?.contact?.[0] || '';

    if (freightBasis === 'TO BE BILLED') {
        debtorType = 'Billing Party';
        debtorName = lr.billingTo?.name || lr.consignor?.name || 'Billing Party';
        debtorCity = lr.billingTo?.city || lr.consignor?.city || lr.fromPlace || '';
        debtorPhone = lr.billingTo?.contact?.[0] || lr.consignor?.contact?.[0] || '';
    } else if (freightBasis === 'PAID') {
        debtorType = 'Consignor';
        debtorName = lr.consignor?.name || 'Consignor';
        debtorCity = lr.fromPlace || lr.consignor?.city || '';
        debtorPhone = lr.consignor?.contact?.[0] || '';
    }

    return {
        basicFreight,
        totalCharges,
        totalFreight,
        advancePaid,
        receivedAmount,
        pendingAmount,
        isFullyPaid: pendingAmount === 0,
        hasInvoice,
        freightBasis,
        debtorType,
        debtorName,
        debtorCity,
        debtorPhone
    };
};

// -------------------------------------------------------------
// 3. NEW WEEKLY TREND DARK GLASSMORPHIC CHART COMPONENT (REAL-TIME)
// -------------------------------------------------------------
const WeeklyTrendGlassChart: React.FC<{ lorryReceipts: LorryReceipt[] }> = ({ lorryReceipts }) => {
    const [viewMode, setViewMode] = useState<'volume' | 'cashflow'>('volume');
    const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

    // Calculate rolling 7 days up to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const past7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const iso = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return {
            date: d,
            iso,
            label: dayLabel,
            dateFormatted,
            isToday: i === 6
        };
    });

    // Compute stats per day from actual LRs
    const dailyStats = past7Days.map((dayObj, idx) => {
        const dayLRs = lorryReceipts.filter(lr => {
            if (!lr.date) return false;
            return lr.date.startsWith(dayObj.iso);
        });

        const volume = dayLRs.length;
        const delivered = dayLRs.filter(lr => lr.status === 'Delivered').length;
        let received = 0;
        let pending = 0;
        let totalFreight = 0;
        let dayAdvance = 0;
        let dayInvoicedCount = 0;

        dayLRs.forEach(lr => {
            const fin = getLRFinancials(lr);
            received += fin.receivedAmount;
            pending += fin.pendingAmount;
            totalFreight += fin.totalFreight;
            dayAdvance += fin.advancePaid;
            if (fin.hasInvoice) dayInvoicedCount++;
        });

        return {
            ...dayObj,
            idx,
            volume,
            delivered,
            received,
            pending,
            totalFreight,
            dayAdvance,
            dayInvoicedCount
        };
    });

    // All-time totals across all LRs
    const allFinancials = lorryReceipts.map(getLRFinancials);
    const totalReceivedAll = allFinancials.reduce((sum, f) => sum + f.receivedAmount, 0);
    const totalPendingAll = allFinancials.reduce((sum, f) => sum + f.pendingAmount, 0);
    const totalAdvanceCollected = allFinancials.reduce((sum, f) => sum + f.advancePaid, 0);
    const invoicedLRsCount = lorryReceipts.filter(lr => Boolean(lr.isInvoiceGenerated) && lr.status !== 'Cancelled').length;
    const totalDeliveredAll = lorryReceipts.filter(lr => lr.status === 'Delivered').length;
    const activeLRsCount = lorryReceipts.filter(lr => lr.status !== 'Cancelled').length;
    const completionRate = activeLRsCount > 0 ? Math.round((totalDeliveredAll / activeLRsCount) * 100) : 0;

    // SVG coordinates: 7 points across 350 width
    const xCoords = [25, 75, 125, 175, 225, 275, 325];

    const primaryVals = viewMode === 'volume'
        ? dailyStats.map(d => d.volume)
        : dailyStats.map(d => d.received);
    const secondaryVals = viewMode === 'volume'
        ? dailyStats.map(d => d.delivered)
        : dailyStats.map(d => d.pending);

    const maxVal = Math.max(...primaryVals, ...secondaryVals, 1);

    const getPointY = (val: number) => {
        if (maxVal === 0) return 80;
        const normalized = val / maxVal;
        return 85 - (normalized * 60);
    };

    const primaryPoints = dailyStats.map((d, i) => ({
        x: xCoords[i],
        y: getPointY(primaryVals[i]),
        val: primaryVals[i],
        label: d.label
    }));

    const secondaryPoints = dailyStats.map((d, i) => ({
        x: xCoords[i],
        y: getPointY(secondaryVals[i]),
        val: secondaryVals[i],
        label: d.label
    }));

    // Smooth Bezier Curve Path generator
    const generateSmoothPath = (pts: { x: number; y: number }[]) => {
        if (pts.length === 0) return '';
        let path = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i + 1];
            const mx = (p0.x + p1.x) / 2;
            path += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
        }
        return path;
    };

    const primaryCurve = generateSmoothPath(primaryPoints);
    const secondaryCurve = generateSmoothPath(secondaryPoints);

    const primaryArea = `${primaryCurve} L ${xCoords[6]},105 L ${xCoords[0]},105 Z`;
    const secondaryArea = `${secondaryCurve} L ${xCoords[6]},105 L ${xCoords[0]},105 Z`;

    const formatPillVal = (val: number) => {
        if (viewMode === 'volume') return val.toString();
        if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
        return `${val}`;
    };

    const activeDay = selectedDayIdx !== null ? dailyStats[selectedDayIdx] : null;

    return (
        <div className="bg-[#111520] rounded-3xl p-5 md:p-6 lg:p-7 xl:p-8 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-white relative overflow-hidden flex flex-col justify-between h-full min-h-[420px] sm:min-h-[460px] lg:min-h-[520px] xl:min-h-[560px]">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 relative z-10">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-black tracking-wider uppercase text-white">
                            NEW WEEKLY TREND
                        </h3>
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        DAILY VOLUME & COMPLETION • REAL-TIME
                    </p>
                </div>

                {/* View Mode Toggle Switch */}
                <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs lg:text-sm font-bold shadow-inner">
                    <button
                        type="button"
                        onClick={() => setViewMode('volume')}
                        className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg transition-all ${
                            viewMode === 'volume'
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Volume & Done
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('cashflow')}
                        className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg transition-all ${
                            viewMode === 'cashflow'
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        ₹ Payments
                    </button>
                </div>
            </div>

            {/* REAL-TIME PAYMENT RECEIVED VS PENDING METRIC BANNER */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 relative z-10">
                {/* 1. Received Tile */}
                <div className="bg-gradient-to-br from-emerald-950/50 via-emerald-900/20 to-slate-900/90 border border-emerald-500/40 rounded-2xl p-3 sm:p-4 lg:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                            PAYMENT RECEIVED
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-emerald-300 mt-1 tracking-tight">
                        ₹ {totalReceivedAll.toLocaleString('en-IN')}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-xs text-emerald-400/90 font-semibold mt-1">
                        <span>Adv: ₹{totalAdvanceCollected.toLocaleString('en-IN')}</span>
                        {invoicedLRsCount > 0 && (
                            <>
                                <span>•</span>
                                <span>{invoicedLRsCount} Invoiced Paid</span>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Pending Tile */}
                <div className="bg-gradient-to-br from-rose-950/50 via-rose-900/20 to-slate-900/90 border border-rose-500/40 rounded-2xl p-3 sm:p-4 lg:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-400">
                            PAYMENT PENDING
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]"></span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-rose-300 mt-1 tracking-tight">
                        ₹ {totalPendingAll.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] sm:text-xs text-rose-400/90 font-medium mt-1">
                        {allFinancials.filter(f => f.pendingAmount > 0).length} Uninvoiced Dues
                    </div>
                </div>
            </div>

            {/* Legend & Completion rate indicator */}
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-400 px-1 mb-1">
                <div className="flex items-center gap-3 sm:gap-4">
                    {viewMode === 'volume' ? (
                        <>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                                Booked Volume
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]"></span>
                                Delivered
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
                                Received (₹)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]"></span>
                                Pending (₹)
                            </span>
                        </>
                    )}
                </div>
                <span className="text-cyan-300 font-black">
                    {completionRate}% Completed
                </span>
            </div>

            {/* Glowing SVG Multi-Wave Chart Area (Taller and wider on desktop) */}
            <div className="relative w-full flex-grow my-3 flex items-center justify-center">
                <svg className="w-full h-44 sm:h-52 md:h-60 lg:h-72 xl:h-80 overflow-visible" viewBox="0 0 350 110" preserveAspectRatio="none">
                    <defs>
                        {/* Cyan Gradient */}
                        <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                        </linearGradient>
                        {/* Purple Gradient */}
                        <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.38" />
                            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                        </linearGradient>
                        {/* Emerald Gradient */}
                        <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                        {/* Rose Gradient */}
                        <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.38" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Subtle Grid Lines */}
                    <line x1="0" y1="25" x2="350" y2="25" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                    <line x1="0" y1="55" x2="350" y2="55" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                    <line x1="0" y1="85" x2="350" y2="85" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />

                    {/* SECONDARY WAVE (Delivered in volume mode, Pending in cashflow mode) */}
                    <path
                        d={secondaryArea}
                        fill={viewMode === 'volume' ? "url(#purpleGrad)" : "url(#roseGrad)"}
                    />
                    <path
                        d={secondaryCurve}
                        fill="none"
                        stroke={viewMode === 'volume' ? "#c084fc" : "#f43f5e"}
                        strokeWidth="2.8"
                    />

                    {/* PRIMARY WAVE (Booked volume in volume mode, Received in cashflow mode) */}
                    <path
                        d={primaryArea}
                        fill={viewMode === 'volume' ? "url(#cyanGrad)" : "url(#emeraldGrad)"}
                    />
                    <path
                        d={primaryCurve}
                        fill="none"
                        stroke={viewMode === 'volume' ? "#22d3ee" : "#10b981"}
                        strokeWidth="3.2"
                        className={viewMode === 'volume' ? "drop-shadow-[0_0_12px_#22d3ee]" : "drop-shadow-[0_0_12px_#10b981]"}
                    />

                    {/* Floating Value Pill Pins for Primary Points */}
                    {primaryPoints.map((pt, idx) => {
                        const isHovered = selectedDayIdx === idx;
                        const pillStroke = viewMode === 'volume' ? '#22d3ee' : '#10b981';
                        const pillBg = viewMode === 'volume' ? '#0e7490' : '#065f46';
                        const pillVal = formatPillVal(pt.val);
                        const pillWidth = Math.max(18, pillVal.length * 7 + 6);

                        return (
                            <g key={idx} className="cursor-pointer" onClick={() => setSelectedDayIdx(idx)}>
                                {/* Outer Glow Ring */}
                                <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isHovered ? "6" : "4"}
                                    fill={pillStroke}
                                    className="animate-pulse opacity-80"
                                />
                                <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="3.2"
                                    fill="#ffffff"
                                    stroke={pillStroke}
                                    strokeWidth="1.8"
                                />

                                {/* Floating Number Badge Pill */}
                                <rect
                                    x={pt.x - pillWidth / 2}
                                    y={pt.y - 19}
                                    width={pillWidth}
                                    height="13"
                                    rx="3.5"
                                    fill={pillBg}
                                    stroke={pillStroke}
                                    strokeWidth={isHovered ? "1.8" : "1"}
                                    className="shadow-md"
                                />
                                <text
                                    x={pt.x}
                                    y={pt.y - 9.5}
                                    textAnchor="middle"
                                    fill="#ffffff"
                                    fontSize="8"
                                    fontWeight="bold"
                                    fontFamily="sans-serif"
                                >
                                    {pillVal}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Selected Day Details Strip (shows when user clicks or hovers a day) */}
            {activeDay && (
                <div className="bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-2.5 mb-2.5 flex items-center justify-between text-xs lg:text-sm animate-fadeIn shadow-lg">
                    <div className="font-black text-cyan-400">
                        {activeDay.label} ({activeDay.dateFormatted}):
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs lg:text-sm font-semibold flex-wrap">
                        <span className="text-slate-300">
                            <strong className="text-white font-black">{activeDay.volume}</strong> LRs Booked
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-purple-300">
                            <strong className="text-white font-black">{activeDay.delivered}</strong> Delivered
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400 font-black">
                            Recd: ₹{activeDay.received.toLocaleString('en-IN')}
                            <span className="text-[10px] text-emerald-300/80 font-normal ml-1">
                                (Adv: ₹{activeDay.dayAdvance.toLocaleString('en-IN')}{activeDay.dayInvoicedCount > 0 ? ` + ${activeDay.dayInvoicedCount} Inv` : ''})
                            </span>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-rose-400 font-black">
                            Pending: ₹{activeDay.pending.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <button
                        onClick={() => setSelectedDayIdx(null)}
                        className="text-slate-400 hover:text-white text-sm px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                        title="Close breakdown"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Bottom Days Axis */}
            <div className="flex justify-between items-center text-xs lg:text-sm font-black text-slate-400 uppercase pt-2.5 border-t border-slate-800/80">
                {dailyStats.map((d, i) => (
                    <button
                        key={d.label + i}
                        type="button"
                        onClick={() => setSelectedDayIdx(selectedDayIdx === i ? null : i)}
                        className={`transition-all px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg ${
                            selectedDayIdx === i
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-black shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                                : d.isToday
                                ? 'text-cyan-400 font-black'
                                : 'hover:text-cyan-400 hover:bg-slate-900/60'
                        }`}
                        title={`${d.label} (${d.dateFormatted}) - Click to inspect`}
                    >
                        {d.label}
                        {d.isToday && <span className="block text-[8px] lg:text-[9px] text-cyan-400 lowercase font-mono">today</span>}
                    </button>
                ))}
            </div>

            {/* Ambient Cyan Base Glow */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-cyan-500/20 blur-2xl pointer-events-none"></div>
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

    // State for Pending Collections & Upcoming Deliveries section
    const [pendingSearchQuery, setPendingSearchQuery] = useState('');
    const [pendingBasisFilter, setPendingBasisFilter] = useState<'ALL' | 'TO PAY' | 'TO BE BILLED' | 'ON_ROAD'>('ALL');
    const [pendingSortBy, setPendingSortBy] = useState<'highest' | 'recent'>('highest');
    const [showAllPending, setShowAllPending] = useState(false);

    // Compute all pending LRs with financials in real-time
    const pendingLRsWithFin = lorryReceipts
        .map(lr => ({ lr, fin: getLRFinancials(lr) }))
        .filter(item => item.lr.status !== 'Cancelled' && item.fin.pendingAmount > 0);

    const totalPendingAll = pendingLRsWithFin.reduce((sum, item) => sum + item.fin.pendingAmount, 0);
    const totalAdvanceOnPending = pendingLRsWithFin.reduce((sum, item) => sum + item.fin.advancePaid, 0);

    const toPayCount = pendingLRsWithFin.filter(i => i.fin.freightBasis === 'TO PAY').length;
    const tbbCount = pendingLRsWithFin.filter(i => i.fin.freightBasis === 'TO BE BILLED').length;
    const onRoadCount = pendingLRsWithFin.filter(i => i.lr.status === 'In Transit' || i.lr.status === 'Out for Delivery').length;

    // Filter by basis & search query
    const filteredPending = pendingLRsWithFin.filter(({ lr, fin }) => {
        if (pendingBasisFilter === 'TO PAY' && fin.freightBasis !== 'TO PAY') return false;
        if (pendingBasisFilter === 'TO BE BILLED' && fin.freightBasis !== 'TO BE BILLED') return false;
        if (pendingBasisFilter === 'ON_ROAD' && lr.status !== 'In Transit' && lr.status !== 'Out for Delivery') return false;

        if (pendingSearchQuery.trim()) {
            const q = pendingSearchQuery.toLowerCase();
            const lrNoMatch = lr.lrNo?.toLowerCase().includes(q);
            const truckMatch = lr.truckNo?.toLowerCase().includes(q);
            const debtorMatch = fin.debtorName?.toLowerCase().includes(q);
            const consignorMatch = lr.consignor?.name?.toLowerCase().includes(q);
            const consigneeMatch = lr.consignee?.name?.toLowerCase().includes(q);
            const routeMatch = `${lr.fromPlace || ''} ${lr.toPlace || ''}`.toLowerCase().includes(q);
            return lrNoMatch || truckMatch || debtorMatch || consignorMatch || consigneeMatch || routeMatch;
        }
        return true;
    });

    // Sorting
    filteredPending.sort((a, b) => {
        if (pendingSortBy === 'highest') {
            return b.fin.pendingAmount - a.fin.pendingAmount;
        } else {
            return new Date(b.lr.date || 0).getTime() - new Date(a.lr.date || 0).getTime();
        }
    });

    const visiblePending = showAllPending ? filteredPending : filteredPending.slice(0, 6);

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
                        className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
                        title="Back"
                    >
                        <ArrowLeftIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">
                            LR Management Dashboard
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Real-time logistics analytics & consignment operations</p>
                    </div>
                </div>

                {/* Right: Action Pills */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* + New LR Pill */}
                    {currentRole !== 'Manager' && (
                        <button
                            onClick={onAddNew}
                            className="flex items-center gap-1.5 px-4 py-2.5 lg:px-5 lg:py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs lg:text-sm shadow-md shadow-sky-500/20 hover:shadow-lg transition-all active:scale-95"
                        >
                            <span className="text-base lg:text-lg font-black">+</span>
                            New LR
                        </button>
                    )}

                    {/* New Invoice Pill */}
                    {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                        <button
                            onClick={() => setCurrentView('invoices')}
                            className="flex items-center gap-1.5 px-4 py-2.5 lg:px-5 lg:py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs lg:text-sm shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all active:scale-95"
                        >
                            <DocumentTextIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            New Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Navigation Filter Bar */}
            <div className="flex items-center justify-end gap-2.5 flex-wrap">
                <button
                    onClick={() => setCurrentView('invoices')}
                    className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-[#be185d] hover:bg-[#9d174d] text-white font-bold text-xs lg:text-sm shadow-sm transition-all"
                >
                    <InvoiceIcon className="w-4 h-4" />
                    Invoices
                </button>
                <button
                    onClick={onAddNew}
                    className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs lg:text-sm shadow-sm transition-all"
                >
                    <CreateIcon className="w-4 h-4" />
                    Create LR
                </button>
                {onViewVouchers && (
                    <button
                        onClick={onViewVouchers}
                        className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs lg:text-sm shadow-sm transition-all"
                    >
                        <span>📑</span>
                        Vouchers
                    </button>
                )}
                <button
                    onClick={onViewList}
                    className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs lg:text-sm shadow-sm transition-all"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
                {/* 1. TOTAL LRs (Bronze/Copper) */}
                <ClayKPICard
                    title="TOTAL LRs"
                    value={totalLRs}
                    theme="bronze"
                    sparklineColor="#fdba74"
                    onClick={onViewList}
                    icon={
                        <div className="text-white">
                            <TruckIcon className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10" />
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
                        <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 text-amber-950 font-black text-xl lg:text-2xl flex items-center justify-center shadow-md border-2 border-white/60">
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
                            <UsersIcon className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10" />
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
                            <UploadIcon className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10" />
                        </div>
                    }
                />
            </div>

            {/* --- 2. 3D HIGHWAY / SHIPMENT STATUS PIPELINE --- */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 md:p-6 lg:p-7 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-4 sm:space-y-5">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-base sm:text-lg lg:text-xl text-slate-800 tracking-tight">
                        Shipment Status
                    </h3>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Live Fleet Track
                    </span>
                </div>

                {/* 3D Highway Track */}
                <div className="relative overflow-x-auto pb-2">
                    <div className="min-w-[700px] flex items-center justify-between gap-3 sm:gap-4 relative py-2.5 px-1">
                        {/* Background Road Curve */}
                        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-10 lg:h-12 bg-slate-100 rounded-full border-2 border-slate-200/80 shadow-inner z-0 overflow-hidden flex items-center">
                            <div className="w-full border-t-2 border-dashed border-cyan-400/80 opacity-60"></div>
                        </div>

                        {/* STAGE 1: BOOKED */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">BOOKED</span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{statusCounts['Booked'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-black text-base lg:text-lg shadow-sm">
                                +
                            </div>
                        </div>

                        {/* STAGE 2: IN TRANSIT (With 3D Truck on the Highway) */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-teal-400 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-md bg-teal-50/20">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-teal-700 uppercase tracking-wider">IN TRANSIT</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {/* 3D Cargo Truck Container Graphic */}
                                    <div className="flex items-center bg-[#1e3a8a] text-white px-2 py-0.5 rounded text-[10px] lg:text-xs font-black font-mono shadow-xs">
                                        SSK 2664
                                    </div>
                                    <span className="text-sm lg:text-base font-black text-teal-800">
                                        ({statusCounts['In Transit'] || 0})
                                    </span>
                                </div>
                            </div>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-sm">
                                <TruckIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                            </div>
                        </div>

                        {/* STAGE 3: OUT FOR DELIVERY */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">OUT FOR DELIVERY</span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{statusCounts['Out for Delivery'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center shadow-sm">
                                <ClockIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            </div>
                        </div>

                        {/* STAGE 4: DELIVERED (Golden Delivery Shield Emblem) */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">DELIVERED</span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{statusCounts['Delivered'] || 0}</span>
                            </div>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 flex items-center justify-center shadow-md border border-amber-200 text-base lg:text-lg">
                                <span>📦</span>
                            </div>
                        </div>

                        {/* STAGE 5: CANCELLED */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">CANCELLED</span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{statusCounts['Cancelled'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-sm">
                                <XIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 3. MIDDLE SECTION: RECENT LRs & NEW WEEKLY TREND --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left 7 Cols: Recent Lorry Receipts */}
                <div className="lg:col-span-7 bg-white/90 backdrop-blur-md rounded-3xl p-5 md:p-6 lg:p-7 xl:p-8 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-100">
                            <h3 className="font-black text-base sm:text-lg lg:text-xl text-slate-800 tracking-tight">
                                Recent Lorry Receipts
                            </h3>
                            <button
                                onClick={onViewList}
                                className="text-xs sm:text-sm font-black text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                View All ➔
                            </button>
                        </div>

                        {/* Recent LRs Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead>
                                    <tr className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        <th className="pb-3.5">LR NO</th>
                                        <th className="pb-3.5">DATE</th>
                                        <th className="pb-3.5">TRUCK</th>
                                        <th className="pb-3.5 text-right">FREIGHT</th>
                                        <th className="pb-3.5 text-center">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentLRs.length > 0 ? (
                                        recentLRs.map((lr) => (
                                            <tr key={lr.lrNo} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 lg:py-4 font-black text-blue-600 font-mono text-xs sm:text-sm lg:text-base">
                                                    {lr.lrNo}
                                                </td>
                                                <td className="py-3.5 lg:py-4 text-slate-600 font-medium">
                                                    {lr.date ? new Date(lr.date).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="py-3.5 lg:py-4 font-semibold text-slate-800">
                                                    <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                                                    <span className="font-mono bg-slate-100 px-2 py-1 rounded-lg text-xs sm:text-sm font-bold">
                                                        {lr.truckNo || 'Not Assigned'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 lg:py-4 text-right font-black text-slate-900 text-xs sm:text-sm lg:text-base">
                                                    ₹ {Number(lr.freight || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3.5 lg:py-4 text-center">
                                                    <button
                                                        onClick={() => onEditLR(lr.lrNo)}
                                                        className="p-2 lg:p-2.5 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Open LR"
                                                    >
                                                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <WeeklyTrendGlassChart lorryReceipts={lorryReceipts} />
                </div>
            </div>

            {/* --- 4. BOTTOM SECTION: UPCOMING DELIVERIES & REAL-TIME PENDING COLLECTIONS --- */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 md:p-6 lg:p-8 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-5 sm:space-y-6">
                {/* Header & Live Dues Summary */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4 sm:pb-5">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-13 lg:h-13 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md">
                                <CurrencyRupeeIcon className="w-6 h-6 lg:w-7 lg:h-7" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg sm:text-xl lg:text-2xl text-slate-800 tracking-tight">
                                    Upcoming Deliveries & Pending Collections
                                </h3>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                                    किस-किस LR के कितने पैसे लेने बाकी हैं — लाइव बकाया विवरण (Real-Time Live Dues)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl lg:rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-black shadow-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                            Total Pending: ₹ {totalPendingAll.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* KPI Ribbon: Quick Counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* 1. Total Pending */}
                    <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-rose-600 uppercase tracking-wider block">
                            TOTAL PENDING DUES
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-700 mt-1 tracking-tight">
                            ₹ {totalPendingAll.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] sm:text-xs text-rose-500 font-bold block mt-0.5">
                            {pendingLRsWithFin.length} LRs with dues
                        </span>
                    </div>

                    {/* 2. TO PAY (Consignee) */}
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-amber-700 uppercase tracking-wider block">
                            TO PAY (CONSIGNEE)
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-800 mt-1 tracking-tight">
                            {toPayCount} LRs
                        </div>
                        <span className="text-[10px] sm:text-xs text-amber-600 font-bold block mt-0.5">
                            Due on delivery
                        </span>
                    </div>

                    {/* 3. TO BE BILLED */}
                    <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-indigo-700 uppercase tracking-wider block">
                            TO BE BILLED (TBB)
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-800 mt-1 tracking-tight">
                            {tbbCount} LRs
                        </div>
                        <span className="text-[10px] sm:text-xs text-indigo-600 font-bold block mt-0.5">
                            To invoice parties
                        </span>
                    </div>

                    {/* 4. Active On-Road */}
                    <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-teal-700 uppercase tracking-wider block">
                            ON-ROAD DELIVERIES
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-teal-800 mt-1 tracking-tight">
                            {onRoadCount} LRs
                        </div>
                        <span className="text-[10px] sm:text-xs text-teal-600 font-bold block mt-0.5">
                            In transit / Out for delivery
                        </span>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-lg">
                        <input
                            type="text"
                            value={pendingSearchQuery}
                            onChange={(e) => setPendingSearchQuery(e.target.value)}
                            placeholder="Search by LR No, Consignee, Consignor, Truck, City..."
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {pendingSearchQuery && (
                            <button
                                onClick={() => setPendingSearchQuery('')}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-xs sm:text-sm"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Filter Pills & Sort */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Basis Filters */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs sm:text-sm font-bold">
                            <button
                                onClick={() => setPendingBasisFilter('ALL')}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all ${
                                    pendingBasisFilter === 'ALL'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                All ({pendingLRsWithFin.length})
                            </button>
                            <button
                                onClick={() => setPendingBasisFilter('TO PAY')}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all ${
                                    pendingBasisFilter === 'TO PAY'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                TO PAY ({toPayCount})
                            </button>
                            <button
                                onClick={() => setPendingBasisFilter('TO BE BILLED')}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all ${
                                    pendingBasisFilter === 'TO BE BILLED'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                TBB ({tbbCount})
                            </button>
                            <button
                                onClick={() => setPendingBasisFilter('ON_ROAD')}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all ${
                                    pendingBasisFilter === 'ON_ROAD'
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                On Road ({onRoadCount})
                            </button>
                        </div>

                        {/* Sort Selector */}
                        <select
                            value={pendingSortBy}
                            onChange={(e) => setPendingSortBy(e.target.value as any)}
                            className="text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs cursor-pointer"
                        >
                            <option value="highest">Highest Dues First</option>
                            <option value="recent">Recent Date First</option>
                        </select>
                    </div>
                </div>

                {/* List of Pending LRs */}
                <div className="space-y-3.5 sm:space-y-4">
                    {visiblePending.length > 0 ? (
                        visiblePending.map(({ lr, fin }) => {
                            const isDelivered = lr.status === 'Delivered';
                            const isOnRoad = lr.status === 'In Transit' || lr.status === 'Out for Delivery';

                            return (
                                <div
                                    key={lr.lrNo}
                                    className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 transition-all shadow-xs hover:shadow-md group"
                                >
                                    {/* Top Row: LR No, Status Badges, Date */}
                                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => onEditLR(lr.lrNo)}
                                                className="font-mono font-black text-sm sm:text-base lg:text-lg text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                                                title="Open LR details"
                                            >
                                                <span>LR #{lr.lrNo}</span>
                                                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </button>

                                            {/* Status Badge */}
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                                                lr.status === 'Delivered'
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    : lr.status === 'In Transit'
                                                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                                    : lr.status === 'Out for Delivery'
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                            }`}>
                                                {lr.status}
                                            </span>

                                            {/* Payment Basis Badge */}
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase ${
                                                fin.freightBasis === 'TO PAY'
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : fin.freightBasis === 'TO BE BILLED'
                                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            }`}>
                                                {fin.freightBasis}
                                            </span>

                                            {isOnRoad && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-cyan-100 text-cyan-800 border border-cyan-200 animate-pulse">
                                                    🚚 Delivery in progress
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs sm:text-sm font-semibold text-slate-500">
                                            {lr.date ? new Date(lr.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Date'}
                                        </div>
                                    </div>

                                    {/* Middle Row: Debtor Details, Route, Money Breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pt-3.5 items-center">
                                        {/* Left 7 Cols: Who owes the money & Route */}
                                        <div className="md:col-span-7 space-y-2">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-xs sm:text-sm font-black flex-shrink-0 mt-0.5">
                                                    👤
                                                </div>
                                                <div>
                                                    <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                        {fin.debtorType === 'Consignee' ? 'पैसे लेने हैं (Consignee):' : 'बिलिंग पार्टी (Billing Party):'}
                                                    </div>
                                                    <div className="text-sm sm:text-base lg:text-lg font-black text-slate-900 flex items-center gap-2.5 flex-wrap">
                                                        <span>{fin.debtorName}</span>
                                                        {fin.debtorCity && (
                                                            <span className="text-xs sm:text-sm font-medium text-slate-500">
                                                                ({fin.debtorCity})
                                                            </span>
                                                        )}
                                                        {fin.debtorPhone && (
                                                            <a
                                                                href={`tel:${fin.debtorPhone}`}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                                                                title="Call contact"
                                                            >
                                                                <PhoneIcon className="w-3.5 h-3.5" />
                                                                {fin.debtorPhone}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Route & Truck */}
                                            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 pl-9 sm:pl-10 flex-wrap">
                                                <span className="font-bold text-slate-800 text-xs sm:text-sm lg:text-base">
                                                    {lr.fromPlace || 'Origin'} ➔ {lr.toPlace || 'Destination'}
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-mono font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs sm:text-sm shadow-xs">
                                                    {lr.truckNo || 'No Truck Assigned'}
                                                </span>
                                                {lr.consignor?.name && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-xs sm:text-sm text-slate-500 truncate max-w-[200px]" title={lr.consignor.name}>
                                                            Consignor: {lr.consignor.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right 5 Cols: Pending Amount Highlight & Action */}
                                        <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-4 sm:gap-5 bg-white/80 md:bg-transparent p-3 md:p-0 rounded-2xl border border-slate-200/60 md:border-0">
                                            {/* Amount Box */}
                                            <div className="text-left md:text-right">
                                                <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-600 flex items-center md:justify-end gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                                                    लेना बाकी (Pending Dues):
                                                </div>
                                                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-600 tracking-tight mt-0.5">
                                                    ₹ {fin.pendingAmount.toLocaleString('en-IN')}
                                                </div>
                                                <div className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                                    Total: ₹{fin.totalFreight.toLocaleString('en-IN')}
                                                    {fin.advancePaid > 0 && ` | Adv: ₹${fin.advancePaid.toLocaleString('en-IN')}`}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                type="button"
                                                onClick={() => onEditLR(lr.lrNo)}
                                                className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl lg:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 flex-shrink-0"
                                                title="Open LR"
                                            >
                                                <span>Open LR</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-14 px-4 text-center rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 space-y-2.5">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl shadow-xs">
                                ✓
                            </div>
                            <div className="text-base sm:text-lg font-black text-slate-800">
                                {pendingSearchQuery
                                    ? 'No matching pending records found'
                                    : 'Sabhi Payments Received Hain! (No Pending Dues)'}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                                {pendingSearchQuery
                                    ? 'Try adjusting your search query or basis filter.'
                                    : 'All active Lorry Receipts have zero outstanding balance or payments have been collected.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Show More / Show Less Button */}
                {filteredPending.length > 6 && (
                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAllPending(!showAllPending)}
                            className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm transition-colors shadow-xs"
                        >
                            {showAllPending
                                ? 'Show Less ▴'
                                : `Show All ${filteredPending.length} Pending LRs ▾`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
