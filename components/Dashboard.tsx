import React, { useState } from 'react';
import { LorryReceipt, LRStatus, View } from '../types';
import { CurrencyRupeeIcon, TruckIcon, UsersIcon, ListIcon, CreateIcon, PencilIcon, CheckCircleIcon, ClockIcon, XIcon, UploadIcon, DashboardIcon, InvoiceIcon, DocumentTextIcon, ArrowLeftIcon, CogIcon, ExclamationTriangleIcon, PhoneIcon } from './icons';
import { Language, t } from '../utils/translations';
import { BiltyBook3D, LogisticsTruck3D, RunningTruckLoader } from './BookTruckAnimation';

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
    savedParties?: any[];
    savedTrucks?: any[];
    companyDetails?: any;
    userEmail?: string;
    onSignOut?: () => void;
    onOpenAdminPanel?: () => void;
    onOpenSettings?: () => void;
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
// 1B. 3D ACCOUNTING REGISTER / BILTY KHATA NOTEBOOK COMPONENT
// -------------------------------------------------------------
const RegisterNotebook3D: React.FC<{
    interactive?: boolean;
    onClick?: () => void;
}> = ({ interactive = true, onClick }) => {
    const [pageTurn, setPageTurn] = useState(false);

    const handleInteract = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPageTurn(prev => !prev);
        if (onClick) onClick();
    };

    return (
        <div 
            onClick={interactive ? handleInteract : undefined}
            title={interactive ? "Click to flip Bilty Ledger Register!" : undefined}
            className={`relative flex items-center justify-center select-none ${interactive ? 'cursor-pointer group' : ''}`}
            style={{ perspective: '1200px' }}
        >
            {/* Ambient Green & Golden Book Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-amber-500/25 rounded-full blur-xl animate-pulseGlow pointer-events-none" />

            {/* Book Body / Leather Cover */}
            <div 
                className="relative w-48 h-32 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 rounded-xl shadow-[0_20px_45px_-10px_rgba(5,150,105,0.6),inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-4px_8px_rgba(0,0,0,0.7)] border-2 border-emerald-400/50 p-2 flex group-hover:scale-105 transition-all duration-300"
                style={{ transform: 'rotateY(-4deg) rotateX(6deg)' }}
            >
                {/* Brass Corner Guards */}
                <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400 bg-gradient-to-br from-amber-200 to-amber-600 rounded-tl shadow-xs z-30" />
                <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400 bg-gradient-to-bl from-amber-200 to-amber-600 rounded-tr shadow-xs z-30" />
                <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400 bg-gradient-to-tr from-amber-200 to-amber-600 rounded-bl shadow-xs z-30" />
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400 bg-gradient-to-tl from-amber-200 to-amber-600 rounded-br shadow-xs z-30" />

                {/* Left Page (Accounting Ledger) */}
                <div className="w-1/2 h-full bg-gradient-to-l from-amber-50 to-emerald-50/70 rounded-l-md shadow-inner border-r border-slate-300 p-2 flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between border-b border-emerald-300 pb-1 mb-1">
                            <span className="text-[7.5px] font-black tracking-wider text-emerald-900 uppercase">KHATA REGISTER</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        {/* Ledger Lines */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-1">
                                <div className="h-1 bg-emerald-400/50 rounded w-1/3" />
                                <div className="h-1 bg-slate-300 rounded w-2/3" />
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="h-1 bg-emerald-300/40 rounded w-1/4" />
                                <div className="h-1 bg-slate-200 rounded w-3/4" />
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="h-1 bg-emerald-400/50 rounded w-1/3" />
                                <div className="h-1 bg-slate-300 rounded w-2/3" />
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="h-1 bg-emerald-300/40 rounded w-2/5" />
                                <div className="h-1 bg-slate-200 rounded w-3/5" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-[6.5px] text-slate-500 font-bold border-t border-slate-200 pt-0.5">
                        <span>FOLIO #104</span>
                        <span className="text-emerald-700 font-black">₹ RECORDED</span>
                    </div>
                </div>

                {/* Spine Golden Crease */}
                <div className="w-2 h-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-700 shadow-md z-20 -mx-0.5 rounded-sm flex flex-col justify-evenly items-center py-1">
                    <span className="w-1 h-1 bg-slate-900 rounded-full" />
                    <span className="w-1 h-1 bg-slate-900 rounded-full" />
                    <span className="w-1 h-1 bg-slate-900 rounded-full" />
                </div>

                {/* Right Page */}
                <div className="w-1/2 h-full bg-gradient-to-r from-amber-50 to-emerald-50/70 rounded-r-md shadow-inner border-l border-slate-300 p-2 flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between border-b border-teal-300 pb-1 mb-1">
                            <span className="text-[7.5px] font-black text-teal-950 tracking-wider">ENTRIES & GST</span>
                            <span className="text-[6.5px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">VERIFIED</span>
                        </div>
                        <div className="space-y-1">
                            <div className="h-1 bg-teal-300/50 rounded w-full" />
                            <div className="h-1 bg-slate-200 rounded w-4/5" />
                            <div className="h-1 bg-teal-200/50 rounded w-5/6" />
                        </div>
                    </div>

                    {/* Official Red Rubber Stamp */}
                    <div className="self-end border-2 border-red-600/80 text-red-600 text-[6.5px] font-black px-1.5 py-0.5 rounded transform -rotate-12 uppercase tracking-tighter shadow-xs bg-red-50/50">
                        AUDITED ✓
                    </div>
                </div>

                {/* Dynamic Page Turn Overlay */}
                <div 
                    className={`absolute top-2 left-1/2 w-[calc(50%-8px)] h-[calc(100%-16px)] bg-gradient-to-r from-amber-100 to-white rounded-r-md shadow-2xl border-l border-slate-300 p-2 flex flex-col justify-between origin-left transition-all duration-700 pointer-events-none z-30 ${
                        pageTurn ? 'animate-biltyFlip' : ''
                    }`}
                    style={{
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden'
                    }}
                >
                    <div>
                        <div className="flex items-center justify-between border-b border-emerald-300 pb-1 mb-1">
                            <span className="text-[7px] font-extrabold text-emerald-700">PARTY LEDGER</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin" />
                        </div>
                        <div className="space-y-1">
                            <div className="h-1 bg-emerald-300 rounded w-full" />
                            <div className="h-1 bg-slate-200 rounded w-3/4" />
                            <div className="h-1 bg-emerald-200 rounded w-5/6" />
                        </div>
                    </div>
                    <div className="text-[6px] text-emerald-600 font-mono text-center font-bold">
                        DATA MASTER
                    </div>
                </div>

                {/* Red Bookmark Ribbon */}
                <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-3.5 h-6 bg-gradient-to-b from-red-600 to-red-700 rounded-b shadow-lg flex items-end justify-center pb-1 z-10">
                    <div className="w-1.5 h-1.5 bg-amber-300 rounded-full shadow-xs" />
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
const WeeklyTrendGlassChart: React.FC<{ lorryReceipts: LorryReceipt[]; language?: Language }> = ({ lorryReceipts, language = 'en' }) => {
    const isHi = language === 'hi';
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
                            {isHi ? 'साप्ताहिक रुझान' : 'NEW WEEKLY TREND'}
                        </h3>
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {isHi ? 'दैनिक वॉल्यूम और पूर्णता • रियल-टाइम' : 'DAILY VOLUME & COMPLETION • REAL-TIME'}
                    </p>
                </div>

                {/* View Mode Toggle Switch */}
                <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs lg:text-sm font-bold shadow-inner">
                    <button
                        type="button"
                        onClick={() => setViewMode('volume')}
                        className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg transition-all cursor-pointer ${
                            viewMode === 'volume'
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {isHi ? 'वॉल्यूम और पूर्ण' : 'Volume & Done'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('cashflow')}
                        className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg transition-all cursor-pointer ${
                            viewMode === 'cashflow'
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {isHi ? '₹ भुगतान' : '₹ Payments'}
                    </button>
                </div>
            </div>

            {/* REAL-TIME PAYMENT RECEIVED VS PENDING METRIC BANNER */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 relative z-10">
                {/* 1. Received Tile */}
                <div className="bg-gradient-to-br from-emerald-950/50 via-emerald-900/20 to-slate-900/90 border border-emerald-500/40 rounded-2xl p-3 sm:p-4 lg:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                            {isHi ? 'प्राप्त भुगतान' : 'PAYMENT RECEIVED'}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-emerald-300 mt-1 tracking-tight">
                        ₹ {totalReceivedAll.toLocaleString('en-IN')}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-xs text-emerald-400/90 font-semibold mt-1">
                        <span>{isHi ? 'एडवांस:' : 'Adv:'} ₹{totalAdvanceCollected.toLocaleString('en-IN')}</span>
                        {invoicedLRsCount > 0 && (
                            <>
                                <span>•</span>
                                <span>{invoicedLRsCount} {isHi ? 'इनवॉइस पेड' : 'Invoiced Paid'}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Pending Tile */}
                <div className="bg-gradient-to-br from-rose-950/50 via-rose-900/20 to-slate-900/90 border border-rose-500/40 rounded-2xl p-3 sm:p-4 lg:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-400">
                            {isHi ? 'बकाया भुगतान' : 'PAYMENT PENDING'}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]"></span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-rose-300 mt-1 tracking-tight">
                        ₹ {totalPendingAll.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] sm:text-xs text-rose-400/90 font-medium mt-1">
                        {allFinancials.filter(f => f.pendingAmount > 0).length} {isHi ? 'गैर-चालान बकाया' : 'Uninvoiced Dues'}
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
                                {isHi ? 'बुक किया गया' : 'Booked Volume'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]"></span>
                                {isHi ? 'पहुंचा दिया' : 'Delivered'}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
                                {isHi ? 'प्राप्त (₹)' : 'Received (₹)'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]"></span>
                                {isHi ? 'बकाया (₹)' : 'Pending (₹)'}
                            </span>
                        </>
                    )}
                </div>
                <span className="text-cyan-300 font-black">
                    {completionRate}% {isHi ? 'पूर्ण' : 'Completed'}
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
                            <strong className="text-white font-black">{activeDay.volume}</strong> {isHi ? 'LRs बुक' : 'LRs Booked'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-purple-300">
                            <strong className="text-white font-black">{activeDay.delivered}</strong> {isHi ? 'डिलीवर' : 'Delivered'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400 font-black">
                            {isHi ? 'प्राप्त:' : 'Recd:'} ₹{activeDay.received.toLocaleString('en-IN')}
                            <span className="text-[10px] text-emerald-300/80 font-normal ml-1">
                                ({isHi ? 'एडवांस:' : 'Adv:'} ₹{activeDay.dayAdvance.toLocaleString('en-IN')}{activeDay.dayInvoicedCount > 0 ? ` + ${activeDay.dayInvoicedCount} ${isHi ? 'इनवॉइस' : 'Inv'}` : ''})
                            </span>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-rose-400 font-black">
                            {isHi ? 'बकाया:' : 'Pending:'} ₹{activeDay.pending.toLocaleString('en-IN')}
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
                        {d.isToday && <span className="block text-[8px] lg:text-[9px] text-cyan-400 lowercase font-mono">{isHi ? 'आज' : 'today'}</span>}
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
    onRejectManagerRequest,
    savedParties = [],
    savedTrucks = [],
    companyDetails,
    userEmail,
    onSignOut,
    onOpenAdminPanel,
    onOpenSettings
}) => {

    // --- Metric Calculations & Language Flag ---
    const isHi = language === 'hi';
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
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
            return Boolean(lrNoMatch || truckMatch || debtorMatch || consignorMatch || consigneeMatch || routeMatch);
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
    const isLRSectionActive = activeSection === 'lr';

    // Click transit loading state for animated running truck transition
    const [transitLoading, setTransitLoading] = useState<{ active: boolean; target: 'lr' | 'data'; title: string; sub: string } | null>(null);

    const handleSelectLR = () => {
        setTransitLoading({
            active: true,
            target: 'lr',
            title: isHi ? 'LR प्रबंधन में जा रहे हैं...' : 'Dispatching to LR Management...',
            sub: isHi ? 'फ्लीट, बिल्टी रिकॉर्ड्स और शिपमेंट लोड हो रहे हैं...' : 'Loading Fleet, Bilty Records & Transport Desk...'
        });
        setTimeout(() => {
            setActiveSection('lr');
            setTransitLoading(null);
        }, 450);
    };

    const handleSelectData = () => {
        setTransitLoading({
            active: true,
            target: 'data',
            title: isHi ? 'डेटा रजिस्टर और खाता खोल रहे हैं...' : 'Opening Bilty Register & Master Data...',
            sub: isHi ? 'कंपनी सेटिंग्स, पार्टीज और वाहन सूची लोड हो रही है...' : 'Synchronizing Ledger Entries, Parties & Truck Fleet...'
        });
        setTimeout(() => {
            setCurrentView('data-management');
            setTransitLoading(null);
        }, 450);
    };

    // ─── HOME SCREEN (shown when no section is selected) ─────────────────────
    if (activeSection === null) {
        const totalLRsDisplay = lorryReceipts.length > 0 ? lorryReceipts.length : 617;
        const inTransitDisplay = statusCounts['In Transit'] || 0;
        const totalPartiesDisplay = (savedParties && savedParties.length > 0) ? savedParties.length : (uniqueConsignors || 35);
        const activeTrucksDisplay = (savedTrucks && savedTrucks.length > 0) ? savedTrucks.length : 12;
        const userName = companyDetails?.name || 'Harsh Dalal';
        const userInitial = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'HD';
        const userRoleDisplay = currentRole || 'Admin';

        // Time-based greeting
        const currentHour = new Date().getHours();
        const greetingText = currentHour < 12 
            ? (isHi ? 'सुप्रभात' : 'Good Morning') 
            : currentHour < 17 
                ? (isHi ? 'शुभ दोपहर' : 'Good Afternoon') 
                : (isHi ? 'शुभ संध्या' : 'Good Evening');
        const firstName = userName.split(' ')[0] || 'Harsh';

        // Formatted date string for Today at a Glance
        const formattedTodayDate = new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return (
            <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col lg:flex-row antialiased font-sans select-none">
                
                {/* ════════════════════════════════════════════════════════════════
                    1. LEFT SIDEBAR (Desktop only - lg and up)
                ════════════════════════════════════════════════════════════════ */}
                <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#0a0f1e] border-r border-slate-800/80 shrink-0 min-h-screen p-5 justify-between sticky top-0 h-screen overflow-y-auto">
                    <div>
                        {/* Brand Logo Header */}
                        <div className="flex items-center gap-3 px-2 py-2 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m8 0h3m0 0l3-5.5a1 1 0 00-.2-.5l-1.8-2a1 1 0 00-.7-.4H13v8.4m5 0h2" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xl font-black tracking-tight leading-none">
                                    <span className="text-white">BiltyBook</span>
                                    <span className="text-cyan-400">.online</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium tracking-wide mt-1">
                                    {isHi ? 'ट्रांसपोर्ट व्यवसाय सरल बनाएं' : 'Simplify Your Transport Business'}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="space-y-1.5">
                            {/* Dashboard (Active) */}
                            <button
                                onClick={() => setActiveSection(null)}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer text-left"
                            >
                                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>{isHi ? 'डैशबोर्ड' : 'Dashboard'}</span>
                            </button>

                            {/* LR Management */}
                            <button
                                onClick={handleSelectLR}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 0m7 0l4 0m0 0l3-5h-7v5z" />
                                </svg>
                                <span>{isHi ? 'LR प्रबंधन' : 'LR Management'}</span>
                            </button>

                            {/* Data Management */}
                            <button
                                onClick={handleSelectData}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                                <span>{isHi ? 'डेटा प्रबंधन' : 'Data Management'}</span>
                            </button>

                            {/* Parties */}
                            <button
                                onClick={() => setCurrentView('parties')}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>{isHi ? 'पार्टियां' : 'Parties'}</span>
                            </button>

                            {/* Trucks */}
                            <button
                                onClick={() => setCurrentView('trucks')}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-orange-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 4h11v10H3V4zm11 3h4l3 4v3h-7V7z" />
                                </svg>
                                <span>{isHi ? 'ट्रक' : 'Trucks'}</span>
                            </button>

                            {/* Bookings */}
                            <button
                                onClick={() => setCurrentView('booking-register')}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{isHi ? 'बुकिंग रजिस्टर' : 'Bookings'}</span>
                            </button>

                            {/* Invoices */}
                            <button
                                onClick={() => setCurrentView('invoices')}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>{isHi ? 'इनवॉइस' : 'Invoices'}</span>
                            </button>

                            {/* Reports */}
                            <button
                                onClick={() => setCurrentView('reports')}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>{isHi ? 'रिपोर्ट्स' : 'Reports'}</span>
                            </button>

                            {/* Settings */}
                            <button
                                onClick={() => onOpenSettings ? onOpenSettings() : setCurrentView('data-management')}
                                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors cursor-pointer text-left group"
                            >
                                <svg className="w-5 h-5 shrink-0 group-hover:text-slate-200 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{isHi ? 'सेटिंग्स' : 'Settings'}</span>
                            </button>

                            {/* Sign Out (Sidebar) */}
                            {onSignOut && (
                                <button
                                    onClick={onSignOut}
                                    className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 font-medium text-sm transition-colors cursor-pointer text-left group"
                                    title={isHi ? 'खाते से लॉगआउट करें' : 'Sign out of your account'}
                                >
                                    <svg className="w-5 h-5 shrink-0 group-hover:text-rose-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span>{isHi ? 'साइन आउट' : 'Sign Out'}</span>
                                </button>
                            )}
                        </nav>
                    </div>

                    {/* Sidebar Bottom Card: Keep Your Business Moving Forward */}
                    <div className="pt-4">
                        <div 
                            className="rounded-2xl p-4 relative overflow-hidden text-white shadow-xl min-h-[140px] flex flex-col justify-end border border-slate-700/60"
                            style={{
                                backgroundImage: "linear-gradient(to top, rgba(6, 11, 25, 0.95) 0%, rgba(6, 11, 25, 0.4) 100%), url('/hero_banner.jpg')",
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            <p className="text-xs font-bold leading-tight drop-shadow-md">
                                {isHi ? 'व्यवसाय को हमेशा आगे बढ़ाते रहें' : 'Keep Your Business Moving Forward'}
                            </p>
                        </div>

                        {/* Version info */}
                        <div className="mt-4 px-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                            <span>BiltyBook.online</span>
                            <span>v1.0.0</span>
                        </div>
                    </div>
                </aside>

                {/* ════════════════════════════════════════════════════════════════
                    2. MAIN CONTENT WRAPPER (Scrollable, Light Background)
                ════════════════════════════════════════════════════════════════ */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#f1f5f9] text-slate-800 min-h-screen">
                    
                    {/* ── TOP HEADER BAR ── */}
                    <header className="sticky top-0 z-30 bg-[#080d1a] border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
                        {/* Mobile Brand (visible only on screens < lg) */}
                        <div className="flex lg:hidden items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m8 0h3m0 0l3-5.5a1 1 0 00-.2-.5l-1.8-2a1 1 0 00-.7-.4H13v8.4m5 0h2" />
                                </svg>
                            </div>
                            <span className="text-base font-black text-white">
                                BiltyBook<span className="text-cyan-400">.online</span>
                            </span>
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative flex-1 max-w-md hidden sm:block">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder={isHi ? 'LR, पार्टी, ट्रक, इनवॉइस खोजें...' : 'Search LR, Party, Truck, Invoice...'}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onViewList();
                                    }
                                }}
                                className="w-full pl-10 pr-16 py-2 rounded-xl bg-slate-900/90 border border-slate-700/70 text-slate-200 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                                    Ctrl + K
                                </span>
                            </div>
                        </div>

                        {/* Right: Notification Bell + User Profile */}
                        <div className="flex items-center gap-3 ml-auto">
                            {/* Notification Bell */}
                            <div className="relative cursor-pointer p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                                    3
                                </span>
                            </div>

                            {/* User Profile with Interactive Dropdown */}
                            <div className="relative">
                                <div 
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 sm:gap-3 pl-2 py-1 pr-2 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
                                    title={isHi ? "प्रोफ़ाइल मेनू खोलें" : "Open user menu"}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 border border-slate-700 flex items-center justify-center text-white font-black text-xs shadow-inner">
                                        {userInitial}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <div className="text-xs font-bold text-white leading-tight">
                                            {userName}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                            {userRoleDisplay}
                                        </div>
                                    </div>
                                    <svg className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>

                                {/* User Dropdown Popover */}
                                {isUserMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0e1628] border border-slate-700/80 shadow-2xl z-50 p-2 text-slate-200 animate-fadeIn">
                                            <div className="px-3 py-2.5 border-b border-slate-800/80 mb-1.5">
                                                <p className="text-xs font-black text-white truncate">{userName}</p>
                                                <p className="text-[10px] text-cyan-400 font-mono font-medium truncate mt-0.5">{userEmail || 'Active Operator'}</p>
                                                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-wider border border-blue-500/30">
                                                    {userRoleDisplay} MODE
                                                </span>
                                            </div>

                                            {onOpenAdminPanel && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsUserMenuOpen(false);
                                                        onOpenAdminPanel();
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
                                                >
                                                    <span className="text-sm">🛡️</span>
                                                    <span>{isHi ? 'एडमिन सेंटर' : 'Admin Control Center'}</span>
                                                </button>
                                            )}

                                            {onOpenSettings && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsUserMenuOpen(false);
                                                        onOpenSettings();
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
                                                >
                                                    <span className="text-sm">⚙️</span>
                                                    <span>{isHi ? 'वेब ऐप सेटिंग्स' : 'Web App Settings'}</span>
                                                </button>
                                            )}

                                            {onSignOut && (
                                                <div className="border-t border-slate-800/80 mt-1.5 pt-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsUserMenuOpen(false);
                                                            onSignOut();
                                                        }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/30 transition-colors text-left cursor-pointer"
                                                    >
                                                        <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                        </svg>
                                                        <span>{isHi ? 'साइन आउट (लॉगआउट)' : 'Sign Out of Account'}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Settings Button */}
                            <button
                                onClick={() => onOpenSettings ? onOpenSettings() : setCurrentView('data-management')}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title={isHi ? 'वेब ऐप सेटिंग्स' : 'Web App Settings'}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>

                            {/* Sign Out Button (Prominent & Quick Access) */}
                            {onSignOut && (
                                <button
                                    onClick={onSignOut}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-xs active:scale-95 text-xs font-bold"
                                    title={isHi ? 'लॉगआउट' : 'Sign Out'}
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span className="hidden sm:inline">{isHi ? 'साइन आउट' : 'Sign Out'}</span>
                                </button>
                            )}
                        </div>
                    </header>

                    {/* ── SCROLLABLE DASHBOARD BODY ── */}
                    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
                        
                        {/* ════════════════════════════════════════════════════════
                            3. HERO BANNER SECTION (Manage Transport Smarter)
                        ════════════════════════════════════════════════════════ */}
                        <div 
                            className="rounded-[28px] overflow-hidden relative shadow-xl min-h-[220px] sm:min-h-[250px] flex items-center p-6 sm:p-10 border border-slate-700/50"
                            style={{
                                backgroundImage: "linear-gradient(90deg, rgba(8, 15, 30, 0.94) 0%, rgba(8, 15, 30, 0.82) 50%, rgba(8, 15, 30, 0.3) 100%), url('/hero_banner.jpg')",
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            <div className="relative z-10 max-w-2xl text-left">
                                <div className="text-amber-300 font-bold text-xs sm:text-sm tracking-wide mb-2 flex items-center gap-1.5">
                                    <span>{greetingText}, {firstName}!</span>
                                    <span>👋</span>
                                </div>
                                <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-tight">
                                    {isHi ? 'ट्रांसपोर्ट को स्मार्ट बनाएं ' : 'Manage Transport Smarter with '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-200">
                                        BiltyBook.online
                                    </span>
                                </h1>
                                <p className="text-slate-300 text-xs sm:text-sm font-medium mt-2 leading-relaxed max-w-lg">
                                    {isHi 
                                        ? 'बिल्टी बनाएं, पार्टियां प्रबंधित करें, शिपमेंट ट्रैक करें और अपने व्यवसाय को आगे बढ़ाएं।' 
                                        : 'Create Bilties, Manage Parties, Track Shipments and Grow Your Business.'}
                                </p>
                            </div>

                            {/* Right side floating badges (Desktop) */}
                            <div className="hidden md:flex flex-col items-end gap-3 ml-auto relative z-10">
                                <div className="text-cyan-200/90 font-serif italic text-lg sm:text-xl font-bold tracking-wide transform -rotate-3 select-none">
                                    Every Shipment Matters
                                </div>
                                <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <div className="text-left text-xs">
                                        <div className="font-bold text-white">Reliable Tracking</div>
                                        <div className="text-[10px] text-slate-300 font-medium">Move • Track • Grow</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════════════════
                            4. 4 KPI STAT CARDS ROW
                        ════════════════════════════════════════════════════════ */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                            {/* Card 1: Total LRs */}
                            <div 
                                onClick={onViewList}
                                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                        <span>↑</span> 12%
                                    </span>
                                </div>
                                <div className="mt-4 flex items-baseline justify-between">
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                            {totalLRsDisplay}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500 mt-0.5">
                                            {isHi ? 'कुल LRs' : 'Total LRs'}
                                        </div>
                                    </div>
                                    {/* Mini SVG Sparkline */}
                                    <svg className="w-14 h-8 text-blue-500" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M0 30 Q 25 35, 50 15 T 100 5" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* Card 2: In Transit */}
                            <div 
                                onClick={onViewList}
                                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 4h11v10H3V4zm11 3h4l3 4v3h-7V7z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-baseline justify-between">
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                            {inTransitDisplay}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500 mt-0.5">
                                            {isHi ? 'रास्ते में' : 'In Transit'}
                                        </div>
                                    </div>
                                    <svg className="w-14 h-8 text-emerald-500" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M0 35 Q 35 15, 70 25 T 100 10" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* Card 3: Total Parties */}
                            <div 
                                onClick={() => setCurrentView('parties')}
                                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-baseline justify-between">
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                            {totalPartiesDisplay}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500 mt-0.5">
                                            {isHi ? 'कुल पार्टियां' : 'Total Parties'}
                                        </div>
                                    </div>
                                    <svg className="w-14 h-8 text-purple-500" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M0 25 Q 40 40, 75 10 T 100 15" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* Card 4: Active Trucks */}
                            <div 
                                onClick={() => setCurrentView('trucks')}
                                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m8 0h3m0 0l3-5.5a1 1 0 00-.2-.5l-1.8-2a1 1 0 00-.7-.4H13v8.4m5 0h2" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-baseline justify-between">
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                            {activeTrucksDisplay}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500 mt-0.5">
                                            {isHi ? 'सक्रिय ट्रक' : 'Active Trucks'}
                                        </div>
                                    </div>
                                    <svg className="w-14 h-8 text-orange-500" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M0 20 Q 30 35, 60 10 T 100 20" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════════════════
                            5. TWO MAIN MODULE CARDS (LR & Data Management)
                        ════════════════════════════════════════════════════════ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            {/* Card 1: LR Management (Blue) */}
                            <div 
                                onClick={handleSelectLR}
                                className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[220px]"
                                style={{
                                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)',
                                    boxShadow: '0 20px 40px -10px rgba(37, 99, 235, 0.45)'
                                }}
                            >
                                <div>
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-4 border border-white/20 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 4h11v10H3V4zm11 3h4l3 4v3h-7V7z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight group-hover:text-cyan-100 transition-colors">
                                        {isHi ? 'LR प्रबंधन' : 'LR Management'}
                                    </h2>
                                    <p className="text-blue-100/90 text-xs sm:text-sm font-medium mt-1.5 max-w-sm">
                                        {isHi
                                            ? 'बिल्टी बनाएं, शिपमेंट ट्रैक करें, इनवॉइस व कलेक्शन प्रबंधित करें।'
                                            : 'Create bilties, track shipments, manage invoices & collections.'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/15">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-950/60 text-white border border-white/10">
                                            {totalLRsDisplay} {isHi ? 'कुल LRs' : 'Total LRs'}
                                        </span>
                                        <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-900/60 text-emerald-200 border border-emerald-400/20">
                                            {inTransitDisplay} {isHi ? 'रास्ते में' : 'In Transit'}
                                        </span>
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Data Management (Green) */}
                            <div 
                                onClick={handleSelectData}
                                className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[220px]"
                                style={{
                                    background: 'linear-gradient(135deg, #047857 0%, #059669 50%, #065f46 100%)',
                                    boxShadow: '0 20px 40px -10px rgba(5, 150, 105, 0.45)'
                                }}
                            >
                                <div>
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-4 border border-white/20 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight group-hover:text-emerald-100 transition-colors">
                                        {isHi ? 'डेटा प्रबंधन' : 'Data Management'}
                                    </h2>
                                    <p className="text-emerald-100/90 text-xs sm:text-sm font-medium mt-1.5 max-w-sm">
                                        {isHi
                                            ? 'कंपनी सेटिंग्स, पार्टियां, ट्रक, बुकिंग रजिस्टर और बहीखाता।'
                                            : 'Company settings, parties, trucks, booking register & more.'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/15">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-950/60 text-white border border-white/10">
                                            {totalPartiesDisplay} {isHi ? 'पार्टियां' : 'Parties'}
                                        </span>
                                        <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-teal-900/60 text-teal-200 border border-teal-400/20">
                                            {isHi ? 'सेटिंग्स' : 'Settings'}
                                        </span>
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════════════════
                            6. QUICK ACTIONS BAR
                        ════════════════════════════════════════════════════════ */}
                        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-600 font-black text-lg">⚡</span>
                                    <h3 className="font-black text-slate-800 text-base sm:text-lg">
                                        {isHi ? 'त्वरित कार्य' : 'Quick Actions'}
                                    </h3>
                                </div>
                                <span className="text-xs text-slate-400 font-semibold">
                                    {isHi ? 'तेजी से काम करें' : 'Manage Faster, Do More'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {/* Action 1: Create New LR */}
                                <button
                                    onClick={onAddNew}
                                    className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                                >
                                    <span>+</span>
                                    <span>{isHi ? 'नई LR बनाएं' : 'Create New LR'}</span>
                                </button>

                                {/* Action 2: Add Party */}
                                <button
                                    onClick={() => setCurrentView('parties')}
                                    className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                                >
                                    <span>+</span>
                                    <span>{isHi ? 'पार्टी जोड़ें' : 'Add Party'}</span>
                                </button>

                                {/* Action 3: Add Truck */}
                                <button
                                    onClick={() => setCurrentView('trucks')}
                                    className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-[#ea580c] text-white font-bold text-xs sm:text-sm hover:bg-orange-600 active:scale-95 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                                >
                                    <span>+</span>
                                    <span>{isHi ? 'ट्रक जोड़ें' : 'Add Truck'}</span>
                                </button>

                                {/* Action 4: New Invoice */}
                                <button
                                    onClick={() => setCurrentView('invoices')}
                                    className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs sm:text-sm hover:bg-purple-100 active:scale-95 transition-all cursor-pointer"
                                >
                                    <span>📄</span>
                                    <span>{isHi ? 'नया इनवॉइस' : 'New Invoice'}</span>
                                </button>

                                {/* Action 5: View Reports */}
                                <button
                                    onClick={() => setCurrentView('reports')}
                                    className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs sm:text-sm hover:bg-sky-100 active:scale-95 transition-all cursor-pointer"
                                >
                                    <span>📊</span>
                                    <span>{isHi ? 'रिपोर्ट्स देखें' : 'View Reports'}</span>
                                </button>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════════════════
                            7. RECENT ACTIVITY & TODAY AT A GLANCE
                        ════════════════════════════════════════════════════════ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                            
                            {/* Left Box: Recent Activity */}
                            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="font-black text-slate-800 text-base sm:text-lg">
                                            {isHi ? 'हाल की गतिविधि' : 'Recent Activity'}
                                        </h3>
                                        <button 
                                            onClick={onViewList}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>{isHi ? 'सभी देखें' : 'View All'}</span>
                                            <span>→</span>
                                        </button>
                                    </div>

                                    {/* Activity List Items */}
                                    <div className="space-y-3.5">
                                        {/* Item 1: Latest LR */}
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-xs font-black text-slate-800">
                                                        LR #{lorryReceipts[0]?.lrNo || 'BB001234'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        {isHi ? 'सफलतापूर्वक बनाया गया' : 'Created successfully'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                2 mins ago
                                            </span>
                                        </div>

                                        {/* Item 2: Party Added */}
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-xs font-black text-slate-800">
                                                        {isHi ? 'पार्टी जोड़ी गई' : 'Party Added'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        {savedParties?.[0]?.name || 'Sharma Transport Co.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                15 mins ago
                                            </span>
                                        </div>

                                        {/* Item 3: Truck Updated */}
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 4h11v10H3V4zm11 3h4l3 4v3h-7V7z" />
                                                    </svg>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-xs font-black text-slate-800">
                                                        {isHi ? 'ट्रक अपडेट हुआ' : 'Truck Updated'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        {savedTrucks?.[0]?.truckNo || 'HR 45 AB 1234'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                1 hour ago
                                            </span>
                                        </div>

                                        {/* Item 4: Invoice Generated */}
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-xs font-black text-slate-800">
                                                        {isHi ? 'इनवॉइस जनरेट किया' : 'Invoice Generated'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        INV #2025-0913
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                3 hours ago
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Box: Today at a Glance */}
                            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-600">📍</span>
                                            <h3 className="font-black text-slate-800 text-base sm:text-lg">
                                                {isHi ? 'आज की स्थिति' : 'Today at a Glance'}
                                            </h3>
                                        </div>
                                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl flex items-center gap-1.5">
                                            <span>📅</span>
                                            <span>{formattedTodayDate}</span>
                                        </div>
                                    </div>

                                    {/* 2x2 Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        {/* Box 1 */}
                                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-500">
                                                    {isHi ? 'आज के शिपमेंट' : 'Shipments Today'}
                                                </div>
                                                <div className="text-xl font-black text-slate-800 mt-1">
                                                    8
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
                                                📦
                                            </div>
                                        </div>

                                        {/* Box 2 */}
                                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-500">
                                                    {isHi ? 'संभावित डिलीवरी' : 'Expected Deliveries'}
                                                </div>
                                                <div className="text-xl font-black text-slate-800 mt-1">
                                                    5
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-sm">
                                                🚚
                                            </div>
                                        </div>

                                        {/* Box 3 */}
                                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-500">
                                                    {isHi ? 'पेंडिंग इनवॉइस' : 'Pending Invoices'}
                                                </div>
                                                <div className="text-xl font-black text-slate-800 mt-1">
                                                    3
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-sm">
                                                📑
                                            </div>
                                        </div>

                                        {/* Box 4 */}
                                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-500">
                                                    {isHi ? 'कलेक्शन' : 'Collections'}
                                                </div>
                                                <div className="text-xl font-black text-emerald-600 mt-1">
                                                    {totalFreight > 0 ? `₹ ${(totalFreight).toLocaleString('en-IN')}` : '₹ 1,25,000'}
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                                                ₹
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Motivational Quote Box at Bottom */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 flex items-center gap-3">
                                    <span className="text-2xl text-blue-500 font-serif leading-none">“</span>
                                    <div className="text-left">
                                        <p className="text-xs italic font-semibold text-slate-700">
                                            {isHi 
                                                ? 'एक मजबूत कल के लिए कुशल और स्मार्ट लॉजिस्टिक्स।' 
                                                : '"Efficient logistics for a stronger tomorrow."'}
                                        </p>
                                        <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                                            — BiltyBook.online
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                    {/* ════════════════════════════════════════════════════════
                        8. MOBILE BOTTOM NAVIGATION BAR (Screens < lg)
                    ════════════════════════════════════════════════════════ */}
                    <div className="lg:hidden sticky bottom-0 z-30 bg-[#080d1a] border-t border-slate-800 px-4 py-2 flex items-center justify-around">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="flex flex-col items-center gap-1 text-blue-500 font-bold text-[10px]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>Home</span>
                        </button>
                        <button
                            onClick={onViewList}
                            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white font-medium text-[10px]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>LRs</span>
                        </button>
                        <button
                            onClick={() => setCurrentView('parties')}
                            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white font-medium text-[10px]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Parties</span>
                        </button>
                        <button
                            onClick={() => setCurrentView('trucks')}
                            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white font-medium text-[10px]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 4h11v10H3V4zm11 3h4l3 4v3h-7V7z" />
                            </svg>
                            <span>Trucks</span>
                        </button>
                        <button
                            onClick={handleSelectData}
                            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white font-medium text-[10px]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span>More</span>
                        </button>
                        {onSignOut && (
                            <button
                                onClick={onSignOut}
                                className="flex flex-col items-center gap-1 text-rose-400 hover:text-rose-300 font-bold text-[10px]"
                                title={isHi ? 'लॉगआउट' : 'Sign Out'}
                            >
                                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>{isHi ? 'लॉगआउट' : 'Sign Out'}</span>
                            </button>
                        )}
                    </div>

                </div>

                {/* Running Truck Transit Overlay */}
                {transitLoading?.active && (
                    <RunningTruckLoader 
                        statusMessage={transitLoading.title}
                        subMessage={transitLoading.sub}
                        fullScreen={true}
                    />
                )}
            </div>
        );
    }

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
                        className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-blue-600 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                        title={isHi ? "वापस जाएं" : "Back"}
                    >
                        <ArrowLeftIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">
                            {isHi ? 'LR प्रबंधन डैशबोर्ड' : 'LR Management Dashboard'}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            {isHi ? 'रियल-टाइम लॉजिस्टिक्स एनालिटिक्स और कंसाइनमेंट संचालन' : 'Real-time logistics analytics & consignment operations'}
                        </p>
                    </div>
                </div>

                {/* Right: Action Pills */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* + New LR Pill */}
                    {currentRole !== 'Manager' && (
                        <button
                            onClick={onAddNew}
                            className="flex items-center gap-1.5 px-4 py-2.5 lg:px-5 lg:py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs lg:text-sm shadow-md shadow-sky-500/20 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="text-base lg:text-lg font-black">+</span>
                            {isHi ? 'नई LR' : 'New LR'}
                        </button>
                    )}

                    {/* New Invoice Pill */}
                    {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                        <button
                            onClick={() => setCurrentView('invoices')}
                            className="flex items-center gap-1.5 px-4 py-2.5 lg:px-5 lg:py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs lg:text-sm shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                        >
                            <DocumentTextIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            {isHi ? 'नया चालान' : 'New Invoice'}
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Navigation Filter Bar */}
            <div className="flex items-center justify-end gap-2.5 flex-wrap">
                <button
                    onClick={() => setCurrentView('invoices')}
                    className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-[#be185d] hover:bg-[#9d174d] text-white font-bold text-xs lg:text-sm shadow-sm transition-all cursor-pointer"
                >
                    <InvoiceIcon className="w-4 h-4" />
                    {isHi ? 'चालान (Invoices)' : 'Invoices'}
                </button>
                <button
                    onClick={onAddNew}
                    className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs lg:text-sm shadow-sm transition-all cursor-pointer"
                >
                    <CreateIcon className="w-4 h-4" />
                    {isHi ? 'LR बनाएं' : 'Create LR'}
                </button>
                {onViewVouchers && (
                    <button
                        onClick={onViewVouchers}
                        className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs lg:text-sm shadow-sm transition-all cursor-pointer"
                    >
                        <span>📑</span>
                        {isHi ? 'वाउचर' : 'Vouchers'}
                    </button>
                )}
                <button
                    onClick={onViewList}
                    className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs lg:text-sm shadow-sm transition-all cursor-pointer"
                >
                    <ListIcon className="w-4 h-4" />
                    {isHi ? 'सूची' : 'List'}
                </button>
            </div>

            {/* Manager / Operator Notices */}
            {rbacEnabled && currentRole === 'Manager' && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-xs font-semibold">
                    <span>👁️</span>
                    <span>
                        {isHi
                            ? <>आप <strong>केवल देखने (View Only)</strong> मोड में हैं। आप सभी LRs और ट्रैकिंग विवरण देख सकते हैं।</>
                            : <>You are in <strong>View Only</strong> mode. You can inspect all LRs and tracking details.</>
                        }
                    </span>
                </div>
            )}

            {/* --- 1. TOP 4 3D CLAYMORPHIC KPI CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
                {/* 1. TOTAL LRs (Bronze/Copper) */}
                <ClayKPICard
                    title={isHi ? "कुल LRs" : "TOTAL LRs"}
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
                    title={isHi ? "भाड़ा मूल्य" : "FREIGHT VALUE"}
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
                    title={isHi ? "प्रेषक (पार्टियां)" : "CONSIGNORS"}
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
                    title={isHi ? "लंबित PODs" : "PENDING PODS"}
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
                        {isHi ? 'शिपमेंट स्थिति' : 'Shipment Status'}
                    </h3>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {isHi ? 'लाइव फ्लीट ट्रैक' : 'Live Fleet Track'}
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
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">
                                    {isHi ? 'बुक किया गया' : 'BOOKED'}
                                </span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{statusCounts['Booked'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-black text-base lg:text-lg shadow-sm">
                                +
                            </div>
                        </div>

                        {/* STAGE 2: IN TRANSIT (With 3D Truck on the Highway) */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-teal-400 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-md bg-teal-50/20">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-teal-700 uppercase tracking-wider">
                                    {isHi ? 'रास्ते में' : 'IN TRANSIT'}
                                </span>
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
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">
                                    {isHi ? 'डिलीवरी के लिए बाहर' : 'OUT FOR DELIVERY'}
                                </span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{statusCounts['Out for Delivery'] || 0}</span>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center shadow-sm">
                                <ClockIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            </div>
                        </div>

                        {/* STAGE 4: DELIVERED (Golden Delivery Shield Emblem) */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">
                                    {isHi ? 'पहुंचा दिया' : 'DELIVERED'}
                                </span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{statusCounts['Delivered'] || 0}</span>
                            </div>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 flex items-center justify-center shadow-md border border-amber-200 text-base lg:text-lg">
                                <span>📦</span>
                            </div>
                        </div>

                        {/* STAGE 5: CANCELLED */}
                        <div className="relative z-10 flex-1 flex items-center justify-between bg-white border-2 border-slate-200 rounded-full py-2.5 px-4 lg:py-3.5 lg:px-6 shadow-sm hover:shadow-md transition-all">
                            <div>
                                <span className="block text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">
                                    {isHi ? 'रद्द' : 'CANCELLED'}
                                </span>
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
                                {isHi ? 'हाल की लॉरी रसीदें' : 'Recent Lorry Receipts'}
                            </h3>
                            <button
                                onClick={onViewList}
                                className="text-xs sm:text-sm font-black text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                            >
                                {isHi ? 'सभी देखें ➔' : 'View All ➔'}
                            </button>
                        </div>

                        {/* Recent LRs Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead>
                                    <tr className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        <th className="pb-3.5">{isHi ? 'LR नंबर' : 'LR NO'}</th>
                                        <th className="pb-3.5">{isHi ? 'दिनांक' : 'DATE'}</th>
                                        <th className="pb-3.5">{isHi ? 'ट्रक' : 'TRUCK'}</th>
                                        <th className="pb-3.5 text-right">{isHi ? 'भाड़ा' : 'FREIGHT'}</th>
                                        <th className="pb-3.5 text-center">{isHi ? 'कार्रवाई' : 'ACTION'}</th>
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
                                                        {lr.truckNo || (isHi ? 'आवंटित नहीं' : 'Not Assigned')}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 lg:py-4 text-right font-black text-slate-900 text-xs sm:text-sm lg:text-base">
                                                    ₹ {Number(lr.freight || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3.5 lg:py-4 text-center">
                                                    <button
                                                        onClick={() => onEditLR(lr.lrNo)}
                                                        className="p-2 lg:p-2.5 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                                        title={isHi ? "LR खोलें" : "Open LR"}
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
                                                {isHi ? 'अभी तक कोई लॉरी रसीद नहीं बनी है। शुरू करने के लिए "+ नई LR" पर क्लिक करें!' : 'No Lorry Receipts created yet. Click "+ New LR" to start!'}
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
                    <WeeklyTrendGlassChart lorryReceipts={lorryReceipts} language={language} />
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
                                    {isHi ? 'आगामी डिलीवरी और लंबित वसूली' : 'Upcoming Deliveries & Pending Collections'}
                                </h3>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                                    {isHi
                                        ? 'किस-किस LR के कितने पैसे लेने बाकी हैं — लाइव बकाया वसूली विवरण'
                                        : 'Real-time live dues & pending collection tracker'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl lg:rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-black shadow-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                            {isHi ? `कुल बकाया: ₹ ${totalPendingAll.toLocaleString('en-IN')}` : `Total Pending: ₹ ${totalPendingAll.toLocaleString('en-IN')}`}
                        </div>
                    </div>
                </div>

                {/* KPI Ribbon: Quick Counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* 1. Total Pending */}
                    <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-rose-600 uppercase tracking-wider block">
                            {isHi ? 'कुल बकाया राशि' : 'TOTAL PENDING DUES'}
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-700 mt-1 tracking-tight">
                            ₹ {totalPendingAll.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] sm:text-xs text-rose-500 font-bold block mt-0.5">
                            {isHi ? `${pendingLRsWithFin.length} LRs का बकाया` : `${pendingLRsWithFin.length} LRs with dues`}
                        </span>
                    </div>

                    {/* 2. TO PAY (Consignee) */}
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-amber-700 uppercase tracking-wider block">
                            {isHi ? 'टू पे (कंसाइनी)' : 'TO PAY (CONSIGNEE)'}
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-800 mt-1 tracking-tight">
                            {toPayCount} {isHi ? 'LRs' : 'LRs'}
                        </div>
                        <span className="text-[10px] sm:text-xs text-amber-600 font-bold block mt-0.5">
                            {isHi ? 'डिलीवरी पर देय' : 'Due on delivery'}
                        </span>
                    </div>

                    {/* 3. TO BE BILLED */}
                    <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-indigo-700 uppercase tracking-wider block">
                            {isHi ? 'टू बी बिल्ड (TBB)' : 'TO BE BILLED (TBB)'}
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-800 mt-1 tracking-tight">
                            {tbbCount} {isHi ? 'LRs' : 'LRs'}
                        </div>
                        <span className="text-[10px] sm:text-xs text-indigo-600 font-bold block mt-0.5">
                            {isHi ? 'पार्टियों को बिल करना है' : 'To invoice parties'}
                        </span>
                    </div>

                    {/* 4. Active On-Road */}
                    <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-3.5 sm:p-4 lg:p-5 shadow-xs">
                        <span className="text-[10px] sm:text-xs font-black text-teal-700 uppercase tracking-wider block">
                            {isHi ? 'रास्ते में डिलीवरी' : 'ON-ROAD DELIVERIES'}
                        </span>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-teal-800 mt-1 tracking-tight">
                            {onRoadCount} {isHi ? 'LRs' : 'LRs'}
                        </div>
                        <span className="text-[10px] sm:text-xs text-teal-600 font-bold block mt-0.5">
                            {isHi ? 'ट्रांजिट में / डिलीवरी के लिए' : 'In transit / Out for delivery'}
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
                            placeholder={isHi ? "LR नंबर, कंसाइनी, प्रेषक, ट्रक, शहर से खोजें..." : "Search by LR No, Consignee, Consignor, Truck, City..."}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {pendingSearchQuery && (
                            <button
                                onClick={() => setPendingSearchQuery('')}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-xs sm:text-sm cursor-pointer"
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
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all cursor-pointer ${
                                    pendingBasisFilter === 'ALL'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {isHi ? `सभी (${pendingLRsWithFin.length})` : `All (${pendingLRsWithFin.length})`}
                            </button>
                            <button
                                onClick={() => setPendingBasisFilter('TO PAY')}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all cursor-pointer ${
                                    pendingBasisFilter === 'TO PAY'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {isHi ? `टू पे (${toPayCount})` : `TO PAY (${toPayCount})`}
                            </button>
                            <button
                                onClick={() => setPendingBasisFilter('TO BE BILLED')}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all cursor-pointer ${
                                    pendingBasisFilter === 'TO BE BILLED'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {isHi ? `TBB (${tbbCount})` : `TBB (${tbbCount})`}
                            </button>
                            <button
                                onClick={() => setPendingBasisFilter('ON_ROAD')}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all cursor-pointer ${
                                    pendingBasisFilter === 'ON_ROAD'
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {isHi ? `रास्ते में (${onRoadCount})` : `On Road (${onRoadCount})`}
                            </button>
                        </div>

                        {/* Sort Selector */}
                        <select
                            value={pendingSortBy}
                            onChange={(e) => setPendingSortBy(e.target.value as any)}
                            className="text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs cursor-pointer"
                        >
                            <option value="highest">{isHi ? 'अधिकतम बकाया पहले' : 'Highest Dues First'}</option>
                            <option value="recent">{isHi ? 'नवीनतम तारीख पहले' : 'Recent Date First'}</option>
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
                                                className="font-mono font-black text-sm sm:text-base lg:text-lg text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 cursor-pointer"
                                                title={isHi ? "LR विवरण खोलें" : "Open LR details"}
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
                                                {isHi
                                                    ? (lr.status === 'Delivered' ? 'पहुंचा दिया' : lr.status === 'In Transit' ? 'रास्ते में' : lr.status === 'Out for Delivery' ? 'डिलीवरी के लिए' : lr.status)
                                                    : lr.status}
                                            </span>

                                            {/* Payment Basis Badge */}
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase ${
                                                fin.freightBasis === 'TO PAY'
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : fin.freightBasis === 'TO BE BILLED'
                                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            }`}>
                                                {isHi
                                                    ? (fin.freightBasis === 'TO PAY' ? 'टू पे' : fin.freightBasis === 'TO BE BILLED' ? 'TBB बिलिंग' : 'पेड')
                                                    : fin.freightBasis}
                                            </span>

                                            {isOnRoad && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-cyan-100 text-cyan-800 border border-cyan-200 animate-pulse">
                                                    {isHi ? '🚚 डिलीवरी जारी है' : '🚚 Delivery in progress'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs sm:text-sm font-semibold text-slate-500">
                                            {lr.date ? new Date(lr.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
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
                                                        {fin.debtorType === 'Consignee'
                                                            ? (isHi ? 'कंसाइनी से लेना है:' : 'Consignee (Debtor):')
                                                            : (isHi ? 'बिलिंग पार्टी:' : 'Billing Party:')
                                                        }
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
                                                                title={isHi ? "कॉल करें" : "Call contact"}
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
                                                    {lr.fromPlace || (isHi ? 'मूल स्थान' : 'Origin')} ➔ {lr.toPlace || (isHi ? 'गंतव्य' : 'Destination')}
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-mono font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs sm:text-sm shadow-xs">
                                                    {lr.truckNo || (isHi ? 'ट्रक आवंटित नहीं' : 'No Truck Assigned')}
                                                </span>
                                                {lr.consignor?.name && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-xs sm:text-sm text-slate-500 truncate max-w-[200px]" title={lr.consignor.name}>
                                                            {isHi ? 'प्रेषक:' : 'Consignor:'} {lr.consignor.name}
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
                                                    {isHi ? 'लेना बाकी (बकाया):' : 'Pending Dues:'}
                                                </div>
                                                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-600 tracking-tight mt-0.5">
                                                    ₹ {fin.pendingAmount.toLocaleString('en-IN')}
                                                </div>
                                                <div className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                                    {isHi ? 'कुल:' : 'Total:'} ₹{fin.totalFreight.toLocaleString('en-IN')}
                                                    {fin.advancePaid > 0 && ` | ${isHi ? 'एडवांस:' : 'Adv:'} ₹${fin.advancePaid.toLocaleString('en-IN')}`}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                type="button"
                                                onClick={() => onEditLR(lr.lrNo)}
                                                className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl lg:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 flex-shrink-0 cursor-pointer"
                                                title={isHi ? "LR विवरण खोलें" : "Open LR"}
                                            >
                                                <span>{isHi ? 'LR देखें' : 'Open LR'}</span>
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
                                    ? (isHi ? 'कोई मेल खाता बकाया रिकॉर्ड नहीं मिला' : 'No matching pending records found')
                                    : (isHi ? 'सभी भुगतान प्राप्त हो चुके हैं! (कोई बकाया नहीं)' : 'All Payments Received! (No Pending Dues)')}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                                {pendingSearchQuery
                                    ? (isHi ? 'अपनी खोज या फ़िल्टर बदलकर पुनः प्रयास करें।' : 'Try adjusting your search query or basis filter.')
                                    : (isHi ? 'सभी सक्रिय लॉरी रसीदों की राशि पूरी तरह से एकत्र हो चुकी है।' : 'All active Lorry Receipts have zero outstanding balance or payments have been collected.')}
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
                            className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
                        >
                            {showAllPending
                                ? (isHi ? 'कम दिखाएं ▴' : 'Show Less ▴')
                                : (isHi ? `सभी ${filteredPending.length} बकाया LRs देखें ▾` : `Show All ${filteredPending.length} Pending LRs ▾`)}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
