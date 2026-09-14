import React, { useState, useMemo } from 'react';
import { LorryReceipt, CompanyDetails } from '../types';
import { ArrowLeftIcon, SearchIcon, PrintIcon, DownloadIcon, CheckCircleIcon, ClockIcon } from './icons';
import { Language } from '../utils/translations';

interface ReportsViewProps {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    onBack: () => void;
    language?: Language;
}

interface PeriodStat {
    key: string;
    label: string;
    subLabel?: string;
    totalLRs: number;
    invoicesGenerated: number;
    invoicesLeft: number;
    totalFreight: number;
    advancePaid: number;
    pendingAmount: number;
    deliveredCount: number;
    inTransitCount: number;
    lrs: LorryReceipt[];
}

const ReportsView: React.FC<ReportsViewProps> = ({
    lorryReceipts,
    companyDetails,
    onBack,
    language = 'en'
}) => {
    const isHi = language === 'hi';

    // ── 1. Available Years Selection ──
    const currentYear = new Date().getFullYear();
    const availableYears = useMemo(() => {
        const yearsSet = new Set<number>();
        yearsSet.add(currentYear);
        lorryReceipts.forEach(lr => {
            if (lr.date) {
                const y = new Date(lr.date).getFullYear();
                if (!isNaN(y) && y > 2000 && y < 2100) yearsSet.add(y);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [lorryReceipts, currentYear]);

    const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(currentYear);
    const [activeTab, setActiveTab] = useState<'month' | 'week' | 'date'>('month');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPeriodLrs, setSelectedPeriodLrs] = useState<{ title: string; lrs: LorryReceipt[] } | null>(null);

    // ── 2. Filter LRs by Selected Year and Search Query ──
    const filteredLRs = useMemo(() => {
        return lorryReceipts.filter(lr => {
            if (selectedYear !== 'ALL') {
                const lrDate = new Date(lr.date || '');
                if (!isNaN(lrDate.getTime()) && lrDate.getFullYear() !== selectedYear) {
                    return false;
                }
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchNo = lr.lrNo?.toLowerCase().includes(q);
                const matchTruck = lr.truckNo?.toLowerCase().includes(q);
                const matchConsignor = lr.consignor?.name?.toLowerCase().includes(q);
                const matchConsignee = lr.consignee?.name?.toLowerCase().includes(q);
                const matchInvoice = lr.invoiceNo?.toLowerCase().includes(q);
                return matchNo || matchTruck || matchConsignor || matchConsignee || matchInvoice;
            }
            return true;
        });
    }, [lorryReceipts, selectedYear, searchQuery]);

    // Helper: is an invoice generated for this LR?
    const hasInvoice = (lr: LorryReceipt): boolean => {
        return Boolean(lr.isInvoiceGenerated || (lr.invoiceNo && lr.invoiceNo.trim() !== ''));
    };

    // ── 3. KPI Summary Calculations ──
    const summary = useMemo(() => {
        let totalFreight = 0;
        let totalAdvance = 0;
        let totalPending = 0;
        let invoicesGenerated = 0;
        let invoicesLeft = 0;
        let delivered = 0;
        let inTransit = 0;

        filteredLRs.forEach(lr => {
            const freight = Number(lr.freight) || 0;
            const adv = Number(lr.advance) || 0;
            const bal = Number(lr.balance) || (freight - adv);

            totalFreight += freight;
            totalAdvance += adv;
            totalPending += Math.max(0, bal);

            if (hasInvoice(lr)) {
                invoicesGenerated++;
            } else {
                invoicesLeft++;
            }

            if (lr.status === 'Delivered') delivered++;
            if (lr.status === 'In Transit') inTransit++;
        });

        const invoiceRate = filteredLRs.length > 0 
            ? Math.round((invoicesGenerated / filteredLRs.length) * 100) 
            : 0;

        return {
            totalLRs: filteredLRs.length,
            totalFreight,
            totalAdvance,
            totalPending,
            invoicesGenerated,
            invoicesLeft,
            invoiceRate,
            delivered,
            inTransit
        };
    }, [filteredLRs]);

    // ── 4. Month-Wise Breakdown ──
    const monthStats = useMemo<PeriodStat[]>(() => {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthNamesHi = [
            'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
            'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
        ];

        const map = new Map<number, PeriodStat>();
        for (let m = 0; m < 12; m++) {
            map.set(m, {
                key: `m-${m}`,
                label: isHi ? monthNamesHi[m] : monthNames[m],
                subLabel: selectedYear === 'ALL' ? 'All Years' : `${selectedYear}`,
                totalLRs: 0,
                invoicesGenerated: 0,
                invoicesLeft: 0,
                totalFreight: 0,
                advancePaid: 0,
                pendingAmount: 0,
                deliveredCount: 0,
                inTransitCount: 0,
                lrs: []
            });
        }

        filteredLRs.forEach(lr => {
            const d = new Date(lr.date || '');
            if (!isNaN(d.getTime())) {
                const m = d.getMonth();
                const stat = map.get(m);
                if (stat) {
                    stat.totalLRs++;
                    const fr = Number(lr.freight) || 0;
                    const adv = Number(lr.advance) || 0;
                    const bal = Number(lr.balance) || (fr - adv);
                    stat.totalFreight += fr;
                    stat.advancePaid += adv;
                    stat.pendingAmount += Math.max(0, bal);
                    if (hasInvoice(lr)) {
                        stat.invoicesGenerated++;
                    } else {
                        stat.invoicesLeft++;
                    }
                    if (lr.status === 'Delivered') stat.deliveredCount++;
                    if (lr.status === 'In Transit') stat.inTransitCount++;
                    stat.lrs.push(lr);
                }
            }
        });

        return Array.from(map.values());
    }, [filteredLRs, isHi, selectedYear]);

    // ── 5. Week-Wise Breakdown ──
    const weekStats = useMemo<PeriodStat[]>(() => {
        const map = new Map<string, PeriodStat>();

        filteredLRs.forEach(lr => {
            const d = new Date(lr.date || '');
            if (!isNaN(d.getTime())) {
                // Compute week number
                const startOfYear = new Date(d.getFullYear(), 0, 1);
                const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
                const key = `${d.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;

                if (!map.has(key)) {
                    map.set(key, {
                        key,
                        label: isHi ? `सप्ताह ${weekNum}` : `Week ${weekNum}`,
                        subLabel: `${d.getFullYear()}`,
                        totalLRs: 0,
                        invoicesGenerated: 0,
                        invoicesLeft: 0,
                        totalFreight: 0,
                        advancePaid: 0,
                        pendingAmount: 0,
                        deliveredCount: 0,
                        inTransitCount: 0,
                        lrs: []
                    });
                }

                const stat = map.get(key)!;
                stat.totalLRs++;
                const fr = Number(lr.freight) || 0;
                const adv = Number(lr.advance) || 0;
                const bal = Number(lr.balance) || (fr - adv);
                stat.totalFreight += fr;
                stat.advancePaid += adv;
                stat.pendingAmount += Math.max(0, bal);
                if (hasInvoice(lr)) {
                    stat.invoicesGenerated++;
                } else {
                    stat.invoicesLeft++;
                }
                if (lr.status === 'Delivered') stat.deliveredCount++;
                if (lr.status === 'In Transit') stat.inTransitCount++;
                stat.lrs.push(lr);
            }
        });

        return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [filteredLRs, isHi]);

    // ── 6. Date-Wise Breakdown ──
    const dateStats = useMemo<PeriodStat[]>(() => {
        const map = new Map<string, PeriodStat>();

        filteredLRs.forEach(lr => {
            const d = new Date(lr.date || '');
            if (!isNaN(d.getTime())) {
                const dateKey = d.toISOString().split('T')[0];
                const formattedDate = d.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                if (!map.has(dateKey)) {
                    map.set(dateKey, {
                        key: dateKey,
                        label: formattedDate,
                        subLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
                        totalLRs: 0,
                        invoicesGenerated: 0,
                        invoicesLeft: 0,
                        totalFreight: 0,
                        advancePaid: 0,
                        pendingAmount: 0,
                        deliveredCount: 0,
                        inTransitCount: 0,
                        lrs: []
                    });
                }

                const stat = map.get(dateKey)!;
                stat.totalLRs++;
                const fr = Number(lr.freight) || 0;
                const adv = Number(lr.advance) || 0;
                const bal = Number(lr.balance) || (fr - adv);
                stat.totalFreight += fr;
                stat.advancePaid += adv;
                stat.pendingAmount += Math.max(0, bal);
                if (hasInvoice(lr)) {
                    stat.invoicesGenerated++;
                } else {
                    stat.invoicesLeft++;
                }
                if (lr.status === 'Delivered') stat.deliveredCount++;
                if (lr.status === 'In Transit') stat.inTransitCount++;
                stat.lrs.push(lr);
            }
        });

        return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [filteredLRs]);

    const activeList = activeTab === 'month' ? monthStats : activeTab === 'week' ? weekStats : dateStats;

    // ── 7. Export to CSV ──
    const handleExportCSV = () => {
        const headers = [
            'Period',
            'Total LRs',
            'Invoices Generated',
            'Invoices Left (Pending)',
            'Total Freight (INR)',
            'Advance Collected (INR)',
            'Pending Balance (INR)',
            'Delivered',
            'In Transit'
        ];

        const rows = activeList.map(item => [
            `"${item.label} ${item.subLabel || ''}"`,
            item.totalLRs,
            item.invoicesGenerated,
            item.invoicesLeft,
            item.totalFreight,
            item.advancePaid,
            item.pendingAmount,
            item.deliveredCount,
            item.inTransitCount
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `bilty_report_${activeTab}_${selectedYear}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate max freight for chart height scaling
    const maxMonthFreight = Math.max(...monthStats.map(m => m.totalFreight), 1000);

    return (
        <div className="space-y-6 animate-fadeIn pb-16 font-sans">
            
            {/* ════════════════════════════════════════════════════════════════
                TOP NAVIGATION & ACTION HEADER
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <button
                        onClick={onBack}
                        className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-blue-600 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                        title={isHi ? 'वापस डैशबोर्ड' : 'Back to Dashboard'}
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                {isHi ? 'वित्तीय एवं ट्रांसपोर्ट रिपोर्ट' : 'Financial & Transport Reports'}
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase tracking-wider">
                                Live Analytics
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {isHi 
                                ? 'महीने, सप्ताह और तारीख अनुसार कुल भुगतान, LRs और इनवॉइस स्थिति की लाइव रिपोर्ट' 
                                : 'Real-time analysis of monthly payments, bilties, and invoice generation'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {/* Print Button */}
                    <button
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                    >
                        <PrintIcon className="w-4 h-4 text-slate-500" />
                        <span>{isHi ? 'प्रिंट करें' : 'Print'}</span>
                    </button>

                    {/* Export CSV Button */}
                    <button
                        onClick={handleExportCSV}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span>{isHi ? 'CSV डाउनलोड' : 'Export CSV'}</span>
                    </button>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                FILTER & YEAR CONTROLS BAR
            ════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Granularity Tabs (Month-wise, Week-wise, Date-wise) */}
                <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('month')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'month'
                                ? 'bg-white text-blue-600 shadow-sm scale-100'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        📅 {isHi ? 'महीने अनुसार' : 'Month-wise'}
                    </button>
                    <button
                        onClick={() => setActiveTab('week')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'week'
                                ? 'bg-white text-blue-600 shadow-sm scale-100'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        📆 {isHi ? 'सप्ताह अनुसार' : 'Week-wise'}
                    </button>
                    <button
                        onClick={() => setActiveTab('date')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'date'
                                ? 'bg-white text-blue-600 shadow-sm scale-100'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        🗓️ {isHi ? 'तारीख अनुसार' : 'Date-wise'}
                    </button>
                </div>

                {/* Right controls: Year Selector + Search Bar */}
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    {/* Year Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                            {isHi ? 'वर्ष:' : 'Year:'}
                        </span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-800 shadow-xs focus:outline-none focus:border-blue-600 cursor-pointer"
                        >
                            <option value="ALL">{isHi ? 'सभी वर्ष (All Years)' : 'All Years'}</option>
                            {availableYears.map(yr => (
                                <option key={yr} value={yr}>{yr}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search filter input */}
                    <div className="relative flex-1 sm:w-64">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isHi ? 'पार्टी, LR, इनवॉइस खोजें...' : 'Filter Party, LR, Invoice...'}
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-blue-600 shadow-xs"
                        />
                        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                REAL-TIME KPI METRICS ROW
            ════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                
                {/* 1. Total Freight / Payments */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white rounded-3xl p-5 shadow-lg shadow-blue-500/20 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-wider uppercase text-blue-200">
                                {isHi ? 'कुल फ्रेट / भुगतान' : 'Total Freight'}
                            </span>
                            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold">
                                ₹
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black mt-3 tracking-tight">
                            ₹ {summary.totalFreight.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px]">
                        <span className="text-blue-100 font-medium">{isHi ? 'एडवांस प्राप्त:' : 'Advance:'} ₹{summary.totalAdvance.toLocaleString('en-IN')}</span>
                        <span className="text-amber-300 font-bold">{isHi ? 'बाकी:' : 'Bal:'} ₹{summary.totalPending.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                {/* 2. Total LRs */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">
                                {isHi ? 'कुल LRs (बिल्टी)' : 'Total LRs'}
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-3 tracking-tight">
                            {summary.totalLRs}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-600 font-bold">✓ {summary.delivered} Delivered</span>
                        <span className="text-blue-600 font-bold">🚚 {summary.inTransit} In Transit</span>
                    </div>
                </div>

                {/* 3. Invoices Generated */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">
                                {isHi ? 'जनरेट किए गए इनवॉइस' : 'Invoices Generated'}
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircleIcon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-3 tracking-tight">
                            {summary.invoicesGenerated}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">{isHi ? 'बिलिंग दर' : 'Billed Rate'}:</span>
                        <span className="text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded-full">
                            {summary.invoiceRate}%
                        </span>
                    </div>
                </div>

                {/* 4. Invoices Left (Pending/Unbilled) */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">
                                {isHi ? 'बाकी इनवॉइस (Unbilled)' : 'Invoices Left to Generate'}
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <ClockIcon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-3 tracking-tight">
                            {summary.invoicesLeft}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">{isHi ? 'पेंडिंग बिल्टी' : 'Unbilled LRs'}:</span>
                        <span className="text-amber-700 font-black bg-amber-100 px-2 py-0.5 rounded-full">
                            {summary.invoicesLeft > 0 ? `${summary.invoicesLeft} Left` : 'All Billed'}
                        </span>
                    </div>
                </div>

            </div>

            {/* ════════════════════════════════════════════════════════════════
                MONTHLY REVENUE & INVOICING TREND CHART (Visible in Month tab)
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'month' && (
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                                {isHi ? 'महीने अनुसार फ्रेट और इनवॉइस तुलना' : 'Monthly Freight & Invoice Overview'} ({selectedYear})
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {isHi ? 'हर महीने का कुल भुगतान और जनरेटेड बनाम बाकी इनवॉइस' : 'Monthly revenue scale with generated vs pending invoices'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-md bg-blue-600" />
                                <span className="text-slate-600">{isHi ? 'फ्रेट वॉल्यूम' : 'Freight'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                                <span className="text-slate-600">{isHi ? 'इनवॉइस बना' : 'Billed'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-md bg-amber-400" />
                                <span className="text-slate-600">{isHi ? 'बाकी इनवॉइस' : 'Left'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart Grid */}
                    <div className="h-56 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2 border-b border-slate-200">
                        {monthStats.map((m, idx) => {
                            const barHeightPercent = Math.max(10, Math.round((m.totalFreight / maxMonthFreight) * 100));
                            const hasData = m.totalLRs > 0;

                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                                        <div className="bg-slate-900 text-white text-[11px] rounded-xl p-2.5 shadow-xl whitespace-nowrap text-left border border-slate-700">
                                            <div className="font-black text-amber-300">{m.label} {selectedYear}</div>
                                            <div className="mt-1">Freight: ₹{m.totalFreight.toLocaleString('en-IN')}</div>
                                            <div>Total LRs: {m.totalLRs}</div>
                                            <div className="text-emerald-400">Invoices Generated: {m.invoicesGenerated}</div>
                                            <div className="text-amber-400">Invoices Left: {m.invoicesLeft}</div>
                                        </div>
                                    </div>

                                    {/* Stacked bar or gradient bar */}
                                    <div className="w-full max-w-[40px] flex flex-col items-center justify-end rounded-t-xl overflow-hidden transition-all duration-300 group-hover:scale-105"
                                        style={{ height: `${hasData ? barHeightPercent : 6}%` }}>
                                        {hasData ? (
                                            <div className="w-full h-full bg-gradient-to-t from-blue-700 via-blue-500 to-cyan-400 rounded-t-xl flex flex-col justify-between p-1">
                                                <span className="text-[9px] font-black text-white text-center leading-none">
                                                    {m.totalLRs}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 rounded-t-md" />
                                        )}
                                    </div>

                                    {/* Month Label */}
                                    <span className="text-[10px] font-bold text-slate-500 mt-2 truncate max-w-full">
                                        {m.label.slice(0, 3)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                DETAILED DATA BREAKDOWN TABLE
            ════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-800">
                            {activeTab === 'month' 
                                ? (isHi ? 'महीने अनुसार रिपोर्ट टेबल' : 'Month-wise Performance & Invoicing Table')
                                : activeTab === 'week'
                                    ? (isHi ? 'सप्ताह अनुसार रिपोर्ट टेबल' : 'Week-wise Performance & Invoicing Table')
                                    : (isHi ? 'दैनिक रिपोर्ट टेबल' : 'Daily Date-wise Report Table')}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                            {isHi 
                                ? 'किसी भी पंक्ति पर क्लिक करके उस अवधि की सभी LRs और इनवॉइस देखें' 
                                : 'Click on any row to view individual LRs and verify invoice numbers'}
                        </p>
                    </div>
                    <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                        {activeList.length} {activeTab === 'month' ? 'Months' : activeTab === 'week' ? 'Weeks' : 'Dates'}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                                <th className="py-3.5 px-4 sm:px-6">{isHi ? 'अवधि / समय' : 'Period'}</th>
                                <th className="py-3.5 px-4 text-center">{isHi ? 'कुल LRs' : 'Total LRs'}</th>
                                <th className="py-3.5 px-4 text-center">{isHi ? 'इनवॉइस जनरेट' : 'Invoices Generated'}</th>
                                <th className="py-3.5 px-4 text-center">{isHi ? 'बाकी इनवॉइस' : 'Invoices Left'}</th>
                                <th className="py-3.5 px-4 text-right">{isHi ? 'कुल फ्रेट (₹)' : 'Total Freight (₹)'}</th>
                                <th className="py-3.5 px-4 text-right">{isHi ? 'एडवांस (₹)' : 'Advance (₹)'}</th>
                                <th className="py-3.5 px-4 text-right">{isHi ? 'बाकी (₹)' : 'Pending (₹)'}</th>
                                <th className="py-3.5 px-4 text-center">{isHi ? 'डिलिवरी दर' : 'Delivered'}</th>
                                <th className="py-3.5 px-4 text-center">{isHi ? 'विवरण' : 'Action'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                            {activeList.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400">
                                        {isHi ? 'कोई रिकॉर्ड नहीं मिला' : 'No records found for the selected period'}
                                    </td>
                                </tr>
                            ) : (
                                activeList.map((item) => (
                                    <tr 
                                        key={item.key}
                                        onClick={() => item.totalLRs > 0 && setSelectedPeriodLrs({ title: `${item.label} ${item.subLabel || ''}`, lrs: item.lrs })}
                                        className={`hover:bg-blue-50/40 transition-colors ${item.totalLRs > 0 ? 'cursor-pointer' : 'opacity-60'}`}
                                    >
                                        {/* Period Name */}
                                        <td className="py-3.5 px-4 sm:px-6">
                                            <div className="font-bold text-slate-900">{item.label}</div>
                                            {item.subLabel && <div className="text-[10px] text-slate-400">{item.subLabel}</div>}
                                        </td>

                                        {/* Total LRs */}
                                        <td className="py-3.5 px-4 text-center font-black text-slate-800">
                                            {item.totalLRs}
                                        </td>

                                        {/* Invoices Generated */}
                                        <td className="py-3.5 px-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span>✓</span> {item.invoicesGenerated}
                                            </span>
                                        </td>

                                        {/* Invoices Left */}
                                        <td className="py-3.5 px-4 text-center">
                                            {item.invoicesLeft > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                                    <span>⏳</span> {item.invoicesLeft} Left
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 font-semibold">0</span>
                                            )}
                                        </td>

                                        {/* Total Freight */}
                                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                                            ₹ {item.totalFreight.toLocaleString('en-IN')}
                                        </td>

                                        {/* Advance Paid */}
                                        <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                                            ₹ {item.advancePaid.toLocaleString('en-IN')}
                                        </td>

                                        {/* Pending Amount */}
                                        <td className="py-3.5 px-4 text-right text-amber-600 font-semibold">
                                            ₹ {item.pendingAmount.toLocaleString('en-IN')}
                                        </td>

                                        {/* Delivery status */}
                                        <td className="py-3.5 px-4 text-center">
                                            <span className="text-[11px] font-bold text-slate-600">
                                                {item.deliveredCount}/{item.totalLRs}
                                            </span>
                                        </td>

                                        {/* Action drilldown button */}
                                        <td className="py-3.5 px-4 text-center">
                                            {item.totalLRs > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPeriodLrs({ title: `${item.label} ${item.subLabel || ''}`, lrs: item.lrs });
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                                                    title="View LRs in this period"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* TOTALS FOOTER ROW */}
                        {activeList.length > 0 && (
                            <tfoot className="bg-slate-900 text-white font-black text-xs">
                                <tr>
                                    <td className="py-4 px-4 sm:px-6 uppercase tracking-wider">
                                        {isHi ? 'कुल योग (TOTAL)' : 'Grand Total'}
                                    </td>
                                    <td className="py-4 px-4 text-center text-sm text-cyan-300">
                                        {summary.totalLRs}
                                    </td>
                                    <td className="py-4 px-4 text-center text-emerald-400">
                                        {summary.invoicesGenerated}
                                    </td>
                                    <td className="py-4 px-4 text-center text-amber-400">
                                        {summary.invoicesLeft}
                                    </td>
                                    <td className="py-4 px-4 text-right text-sm text-cyan-300">
                                        ₹ {summary.totalFreight.toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-4 px-4 text-right text-emerald-400">
                                        ₹ {summary.totalAdvance.toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-4 px-4 text-right text-amber-400">
                                        ₹ {summary.totalPending.toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        {summary.delivered}/{summary.totalLRs}
                                    </td>
                                    <td className="py-4 px-4"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                DRILLDOWN MODAL: View LRs for clicked period
            ════════════════════════════════════════════════════════════════ */}
            {selectedPeriodLrs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
                    <div 
                        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black">{selectedPeriodLrs.title}</h3>
                                <p className="text-xs text-slate-300 font-medium">
                                    {selectedPeriodLrs.lrs.length} {isHi ? 'बिल्टी रिकॉर्ड्स' : 'Lorry Receipts in this period'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPeriodLrs(null)}
                                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 flex-1">
                            {selectedPeriodLrs.lrs.map(lr => {
                                const billed = hasInvoice(lr);
                                return (
                                    <div key={lr.lrNo} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-slate-900">LR #{lr.lrNo}</span>
                                                <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                                    {lr.truckNo || 'No Truck'}
                                                </span>
                                                {billed ? (
                                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                        ✓ Invoice #{lr.invoiceNo}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                        ⏳ Unbilled (No Invoice)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-600 mt-1">
                                                <span className="font-semibold">{lr.consignor?.name}</span> → <span className="font-semibold">{lr.consignee?.name}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-slate-900">
                                                ₹ {(Number(lr.freight) || 0).toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                Adv: ₹{Number(lr.advance) || 0} | Bal: ₹{Number(lr.balance) || 0}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setSelectedPeriodLrs(null)}
                                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 cursor-pointer"
                            >
                                {isHi ? 'बंद करें' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReportsView;
