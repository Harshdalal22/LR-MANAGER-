import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LorryReceipt, CompanyDetails, SavedParty, LedgerEntry, Voucher, PaymentReceipt, SavedTruck } from '../types';
import { IndianNumberPlate } from './TruckGarage';
import {
    getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
    getVouchers, addVoucher, updateVoucher, deleteVoucher,
    getPaymentReceipts, savePaymentReceipt, deletePaymentReceipt
} from '../services/supabaseService';
import {
    fetchDailyFuelPrices, findDieselPrice, findFuelPrice, getAvailableFuelLocations,
    calculateTripFuel, estimateRouteDistance, calculateLRTripFuel, getResolvedDistance,
    getIndianApiKey, saveIndianApiKey, testIndianApiConnection,
    FuelPriceResponse, FuelType
} from '../services/fuelPriceService';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccountingViewProps {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    savedParties: SavedParty[];
    savedTrucks?: SavedTruck[];
    onBack: () => void;
    onOpenGarage?: (truckNo?: string) => void;
}

type AccTab = 'overview' | 'truck-pnl' | 'gst' | 'ledger' | 'invoices' | 'payments' | 'expenses' | 'reports';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const today = () => new Date().toISOString().split('T')[0];
const parseDate = (d: string) => new Date(d);
const isExpenseVoucher = (v: Voucher) => !v.voucher_no?.startsWith('VCH-');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Mini Components ─────────────────────────────────────────────────────────
const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{children}</span>
);

const StatCard = ({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
        </div>
        <div className="text-2xl font-black text-gray-800 leading-tight">{value}</div>
        <div className="text-sm font-semibold text-gray-500 mt-1">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
);

// Simple bar chart
const BarChart = ({ data }: { data: { month: string; revenue: number; expenses: number }[] }) => {
    const max = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
    return (
        <div className="flex items-end gap-2 h-40 px-2">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: 120 }}>
                        <div
                            className="flex-1 bg-blue-500 rounded-t-sm opacity-80"
                            style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue > 0 ? 4 : 0 }}
                            title={`Revenue: ${fmt(d.revenue)}`}
                        />
                        <div
                            className="flex-1 bg-red-400 rounded-t-sm opacity-80"
                            style={{ height: `${(d.expenses / max) * 100}%`, minHeight: d.expenses > 0 ? 4 : 0 }}
                            title={`Expenses: ${fmt(d.expenses)}`}
                        />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{d.month}</span>
                </div>
            ))}
        </div>
    );
};

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
const OverviewTab = ({ lorryReceipts, vouchers, payments, ledgerEntries }: {
    lorryReceipts: LorryReceipt[];
    vouchers: Voucher[];
    payments: PaymentReceipt[];
    ledgerEntries: LedgerEntry[];
}) => {
    const invoicedLRs = lorryReceipts.filter(lr => lr.isInvoiceGenerated);
    const totalRevenue = invoicedLRs.reduce((s, lr) => s + (lr.freight || 0), 0);
    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const totalOutstanding = Math.max(0, totalRevenue - totalReceived);
    const expenseVouchers = useMemo(() => vouchers.filter(isExpenseVoucher), [vouchers]);
    const totalExpenses = expenseVouchers.reduce((s, v) => s + v.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // Chart data — last 6 months
    const chartData = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const label = MONTHS[d.getMonth()];
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const revenue = invoicedLRs.filter(lr => lr.date?.startsWith(monthStr)).reduce((s, lr) => s + (lr.freight || 0), 0);
            const expenses = expenseVouchers.filter(v => v.date?.startsWith(monthStr)).reduce((s, v) => s + v.amount, 0);
            return { month: label, revenue, expenses };
        });
    }, [invoicedLRs, expenseVouchers]);

    // Recent transactions
    const recentTx = useMemo(() => {
        const txs: { date: string; label: string; amount: number; type: 'credit' | 'debit' }[] = [];
        payments.slice(0, 5).forEach(p => txs.push({ date: p.date, label: `Received from ${p.party_name}`, amount: p.amount, type: 'credit' }));
        expenseVouchers.slice(0, 5).forEach(v => txs.push({ date: v.date, label: v.description, amount: v.amount, type: 'debit' }));
        return txs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    }, [payments, expenseVouchers]);

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Revenue" value={fmt(totalRevenue)} sub={`${invoicedLRs.length} invoices`} color="bg-blue-100 text-blue-600" icon="💰" />
                <StatCard label="Amount Received" value={fmt(totalReceived)} sub={`${payments.length} payments`} color="bg-green-100 text-green-600" icon="✅" />
                <StatCard label="Outstanding" value={fmt(totalOutstanding)} sub="Pending collection" color="bg-orange-100 text-orange-600" icon="⏳" />
                <StatCard label="Net Profit" value={fmt(netProfit)} sub={`Expenses: ${fmt(totalExpenses)}`} color={netProfit >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"} icon="📈" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Revenue vs Expenses (6 months)</h3>
                        <div className="flex gap-3 text-xs">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm inline-block" /> Revenue</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block" /> Expenses</span>
                        </div>
                    </div>
                    <BarChart data={chartData} />
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-800 mb-4">Business Health</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Collection Rate', value: totalRevenue > 0 ? `${Math.round((totalReceived / totalRevenue) * 100)}%` : '0%', color: 'text-green-600' },
                            { label: 'Total LRs', value: `${lorryReceipts.length}`, color: 'text-blue-600' },
                            { label: 'Invoiced LRs', value: `${invoicedLRs.length}`, color: 'text-purple-600' },
                            { label: 'Expense Count', value: `${expenseVouchers.length}`, color: 'text-red-600' },
                        ].map(s => (
                            <div key={s.label} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{s.label}</span>
                                <span className={`font-bold ${s.color}`}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-4">Recent Transactions</h3>
                {recentTx.length === 0 ? (
                    <p className="text-gray-400 text-center py-6">No transactions yet. Add payments or expenses.</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recentTx.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {tx.type === 'credit' ? '↓' : '↑'}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-700">{tx.label}</div>
                                        <div className="text-xs text-gray-400">{tx.date}</div>
                                    </div>
                                </div>
                                <span className={`font-bold text-sm ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── LEDGER TAB ───────────────────────────────────────────────────────────────
const LedgerTab = ({ lorryReceipts, ledgerEntries, payments, onRefresh }: {
    lorryReceipts: LorryReceipt[];
    ledgerEntries: LedgerEntry[];
    payments: PaymentReceipt[];
    onRefresh: () => void;
}) => {
    const [selectedParty, setSelectedParty] = useState<string>('');
    const [showForm, setShowForm] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [form, setForm] = useState<Partial<LedgerEntry>>({
        date: today(), description: '', debit: 0, credit: 0, payment_mode: 'Cash', party_name: '', entry_type: 'manual'
    });
    const [saving, setSaving] = useState(false);

    // Build party list from LRs + ledger entries
    const parties = useMemo(() => {
        const set = new Set<string>();
        lorryReceipts.forEach(lr => {
            if (lr.billingTo?.name) set.add(lr.billingTo.name);
            if (lr.consignor?.name) set.add(lr.consignor.name);
            if (lr.consignee?.name) set.add(lr.consignee.name);
        });
        ledgerEntries.forEach(e => { if (e.party_name) set.add(e.party_name); });
        payments.forEach(p => { if (p.party_name) set.add(p.party_name); });
        return Array.from(set).sort();
    }, [lorryReceipts, ledgerEntries, payments]);

    // Build transactions for selected party
    const transactions = useMemo(() => {
        if (!selectedParty) return [];

        const txs: { date: string; description: string; debit: number; credit: number; source: string; ref?: string }[] = [];

        // From LRs (freight = debit = receivable)
        lorryReceipts.filter(lr =>
            lr.billingTo?.name === selectedParty || lr.consignor?.name === selectedParty || lr.consignee?.name === selectedParty
        ).forEach(lr => {
            txs.push({
                date: lr.date,
                description: `LR# ${lr.lrNo} — ${lr.fromPlace} to ${lr.toPlace}`,
                debit: lr.freight || 0,
                credit: 0,
                source: lr.isInvoiceGenerated ? `Invoice: ${lr.invoiceNo}` : 'Not Invoiced',
                ref: lr.lrNo
            });
        });

        // From payments
        payments.filter(p => p.party_name === selectedParty).forEach(p => {
            txs.push({ date: p.date, description: `Payment — ${p.payment_mode} — ${p.receipt_no}`, debit: 0, credit: p.amount, source: 'Payment Receipt', ref: p.receipt_no });
        });

        // From manual ledger entries
        ledgerEntries.filter(e => e.party_name === selectedParty).forEach(e => {
            txs.push({ date: e.date, description: e.description, debit: e.debit, credit: e.credit, source: e.entry_type || 'Manual', ref: e.voucher_no });
        });

        // Sort by date
        txs.sort((a, b) => a.date.localeCompare(b.date));

        // Apply date filter
        return txs.filter(tx => {
            if (fromDate && tx.date < fromDate) return false;
            if (toDate && tx.date > toDate) return false;
            return true;
        });
    }, [selectedParty, lorryReceipts, payments, ledgerEntries, fromDate, toDate]);

    const balance = useMemo(() => {
        let running = 0;
        return transactions.map(tx => {
            running += tx.debit - tx.credit;
            return { ...tx, balance: running };
        });
    }, [transactions]);

    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
    const closingBalance = totalDebit - totalCredit;

    const handleSave = async () => {
        if (!form.description || (!form.debit && !form.credit)) return toast.error('Fill in description and amount');
        setSaving(true);
        try {
            await addLedgerEntry(form);
            toast.success('Entry added');
            setShowForm(false);
            setForm({ date: today(), description: '', debit: 0, credit: 0, payment_mode: 'Cash', party_name: selectedParty, entry_type: 'manual' });
            onRefresh();
        } catch (e: any) { toast.error(e.message); }
        finally { setSaving(false); }
    };

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html><head><title>Ledger - ${selectedParty}</title>
            <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;}
            table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:6px;text-align:left;}
            th{background:#f5f5f5;font-weight:bold;}.dr{color:#e53e3e;}.cr{color:#38a169;}</style></head>
            <body>
            <h2>Ledger Statement - ${selectedParty}</h2>
            <p>Period: ${fromDate || 'All'} to ${toDate || 'All'}</p>
            <table><thead><tr><th>Date</th><th>Description</th><th>Debit (₹)</th><th>Credit (₹)</th><th>Balance (₹)</th></tr></thead>
            <tbody>${balance.map(t => `<tr>
                <td>${t.date}</td><td>${t.description}</td>
                <td class="dr">${t.debit > 0 ? fmtNum(t.debit) : ''}</td>
                <td class="cr">${t.credit > 0 ? fmtNum(t.credit) : ''}</td>
                <td>${fmtNum(t.balance)}</td></tr>`).join('')}
            </tbody><tfoot><tr><th colspan="2">Total</th><th class="dr">${fmtNum(totalDebit)}</th><th class="cr">${fmtNum(totalCredit)}</th><th>${fmtNum(closingBalance)}</th></tr></tfoot>
            </table></body></html>`);
        win.document.close();
        win.print();
    };

    return (
        <div className="space-y-5">
            {/* Party Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-48">
                        <label className="block text-xs font-bold text-gray-500 mb-1">SELECT PARTY</label>
                        <select value={selectedParty} onChange={e => setSelectedParty(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-gray-50">
                            <option value="">— Choose a Party —</option>
                            {parties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">FROM DATE</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">TO DATE</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                    </div>
                    {selectedParty && (
                        <>
                            <button onClick={() => setShowForm(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow hover:bg-blue-700 transition">+ Add Entry</button>
                            <button onClick={handlePrint} className="px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold shadow hover:bg-gray-900 transition">🖨️ Print</button>
                        </>
                    )}
                </div>
            </div>

            {/* Add Entry Form */}
            {showForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <h3 className="font-bold text-blue-800 mb-4">Add Manual Ledger Entry</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Party Name</label>
                            <input value={form.party_name || ''} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))}
                                list="party-list" placeholder="Party name"
                                className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <datalist id="party-list">{parties.map(p => <option key={p} value={p} />)}</datalist>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                            <input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Description" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Debit (₹)</label>
                            <input type="number" value={form.debit || ''} onChange={e => setForm(f => ({ ...f, debit: +e.target.value }))}
                                placeholder="0" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Credit (₹)</label>
                            <input type="number" value={form.credit || ''} onChange={e => setForm(f => ({ ...f, credit: +e.target.value }))}
                                placeholder="0" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Payment Mode</label>
                            <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm">
                                {['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleSave} disabled={saving}
                            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow hover:bg-blue-700 disabled:opacity-60">
                            {saving ? 'Saving...' : 'Save Entry'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                    </div>
                </div>
            )}

            {/* Ledger Table */}
            {selectedParty ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-black text-gray-800 text-lg">{selectedParty}</h3>
                            <div className={`text-sm font-bold mt-0.5 ${closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                Closing Balance: {fmt(Math.abs(closingBalance))} {closingBalance > 0 ? 'DR' : 'CR'}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-right">
                            <div><div className="text-xs text-gray-400">Total Debit</div><div className="font-bold text-red-600">{fmt(totalDebit)}</div></div>
                            <div><div className="text-xs text-gray-400">Total Credit</div><div className="font-bold text-green-600">{fmt(totalCredit)}</div></div>
                            <div><div className="text-xs text-gray-400">Balance</div><div className={`font-bold ${closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(Math.abs(closingBalance))}</div></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Source</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Debit</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Credit</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {balance.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No transactions found for this party</td></tr>
                                ) : balance.map((tx, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-medium">{tx.date}</td>
                                        <td className="px-4 py-3 text-gray-700">{tx.description}</td>
                                        <td className="px-4 py-3">
                                            <Badge color={tx.source.includes('Invoice') ? 'bg-blue-100 text-blue-700' : tx.source.includes('Payment') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                                                {tx.source}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">{tx.debit > 0 ? fmt(tx.debit) : '—'}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-600">{tx.credit > 0 ? fmt(tx.credit) : '—'}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(Math.abs(tx.balance))} <span className={`text-xs ${tx.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{tx.balance > 0 ? 'DR' : 'CR'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
                    <div className="text-5xl mb-4">📒</div>
                    <div className="font-bold text-lg">Select a Party to view Ledger</div>
                    <div className="text-sm mt-1">Party list is auto-populated from your LR records</div>
                </div>
            )}
        </div>
    );
};

// ─── INVOICES TAB ─────────────────────────────────────────────────────────────
const InvoicesTab = ({ lorryReceipts, payments }: { lorryReceipts: LorryReceipt[]; payments: PaymentReceipt[] }) => {
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
    const [search, setSearch] = useState('');

    const invoicedLRs = useMemo(() => {
        const grouped: Record<string, LorryReceipt[]> = {};
        lorryReceipts.filter(lr => lr.isInvoiceGenerated && lr.invoiceNo).forEach(lr => {
            const key = lr.invoiceNo!;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(lr);
        });
        return grouped;
    }, [lorryReceipts]);

    const invoices = useMemo(() => {
        return (Object.entries(invoicedLRs) as [string, LorryReceipt[]][]).map(([invoiceNo, lrs]) => {
            const totalFreight = lrs.reduce((s, lr) => s + (lr.freight || 0), 0);
            const received = payments.filter(p => p.invoice_nos?.includes(invoiceNo)).reduce((s, p) => s + p.amount, 0);
            const outstanding = Math.max(0, totalFreight - received);
            const date = lrs[0].invoiceDate || lrs[0].date;
            const daysOld = Math.floor((Date.now() - parseDate(date).getTime()) / 86400000);
            const party = lrs[0].billingTo?.name || lrs[0].consignor?.name || '—';
            const status: 'paid' | 'partial' | 'unpaid' = received >= totalFreight ? 'paid' : received > 0 ? 'partial' : 'unpaid';
            return { invoiceNo, lrs, totalFreight, received, outstanding, date, daysOld, party, status };
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [invoicedLRs, payments]);

    const filtered = useMemo(() => {
        return invoices.filter(inv => {
            if (filter !== 'all' && inv.status !== filter) return false;
            if (search && !inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) && !inv.party.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [invoices, filter, search]);

    // Aging buckets
    const aging = useMemo(() => {
        const unpaid = invoices.filter(i => i.status !== 'paid');
        return {
            '0-30': unpaid.filter(i => i.daysOld <= 30).reduce((s, i) => s + i.outstanding, 0),
            '31-60': unpaid.filter(i => i.daysOld > 30 && i.daysOld <= 60).reduce((s, i) => s + i.outstanding, 0),
            '61-90': unpaid.filter(i => i.daysOld > 60 && i.daysOld <= 90).reduce((s, i) => s + i.outstanding, 0),
            '90+': unpaid.filter(i => i.daysOld > 90).reduce((s, i) => s + i.outstanding, 0),
        };
    }, [invoices]);

    return (
        <div className="space-y-5">
            {/* Aging Summary */}
            <div className="grid grid-cols-4 gap-3">
                {(Object.entries(aging) as [string, number][]).map(([bucket, amount]) => (
                    <div key={bucket} className={`bg-white rounded-xl border p-4 shadow-sm text-center ${amount > 0 ? 'border-orange-200' : 'border-gray-100'}`}>
                        <div className="text-xs font-bold text-gray-500 mb-1">{bucket} Days</div>
                        <div className={`text-lg font-black ${amount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{fmt(amount)}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search invoice / party..." className="flex-1 min-w-40 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                    {(['all', 'unpaid', 'partial', 'paid'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                {['Invoice No', 'Party', 'Date', 'Days', 'LRs', 'Total Freight', 'Received', 'Outstanding', 'Status'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No invoices found</td></tr>
                            ) : filtered.map(inv => (
                                <tr key={inv.invoiceNo} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-blue-700">{inv.invoiceNo}</td>
                                    <td className="px-4 py-3 text-gray-700 font-medium">{inv.party}</td>
                                    <td className="px-4 py-3 text-gray-600">{inv.date}</td>
                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${inv.daysOld > 60 ? 'text-red-600' : inv.daysOld > 30 ? 'text-orange-600' : 'text-gray-700'}`}>{inv.daysOld}d</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{inv.lrs.length}</td>
                                    <td className="px-4 py-3 font-bold text-gray-800">{fmt(inv.totalFreight)}</td>
                                    <td className="px-4 py-3 font-bold text-green-600">{fmt(inv.received)}</td>
                                    <td className="px-4 py-3 font-bold text-red-600">{fmt(inv.outstanding)}</td>
                                    <td className="px-4 py-3">
                                        <Badge color={inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                            {inv.status === 'paid' ? '✓ Paid' : inv.status === 'partial' ? '◑ Partial' : '○ Unpaid'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td colSpan={5} className="px-4 py-3 font-black text-gray-700">TOTAL ({filtered.length} invoices)</td>
                                    <td className="px-4 py-3 font-black text-gray-800">{fmt(filtered.reduce((s, i) => s + i.totalFreight, 0))}</td>
                                    <td className="px-4 py-3 font-black text-green-700">{fmt(filtered.reduce((s, i) => s + i.received, 0))}</td>
                                    <td className="px-4 py-3 font-black text-red-700">{fmt(filtered.reduce((s, i) => s + i.outstanding, 0))}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── PAYMENTS TAB ─────────────────────────────────────────────────────────────
const PaymentsTab = ({ payments, lorryReceipts, onRefresh }: {
    payments: PaymentReceipt[];
    lorryReceipts: LorryReceipt[];
    onRefresh: () => void;
}) => {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<Partial<PaymentReceipt>>({
        date: today(), receipt_no: `RCP-${Date.now().toString().slice(-6)}`, party_name: '', amount: 0,
        payment_mode: 'Cash', invoice_nos: [], notes: ''
    });
    const [saving, setSaving] = useState(false);

    const parties = useMemo(() => {
        const set = new Set<string>();
        lorryReceipts.forEach(lr => { if (lr.billingTo?.name) set.add(lr.billingTo.name); if (lr.consignor?.name) set.add(lr.consignor.name); });
        payments.forEach(p => set.add(p.party_name));
        return Array.from(set).sort();
    }, [lorryReceipts, payments]);

    const invoiceOptions = useMemo(() => {
        if (!form.party_name) return [];
        return lorryReceipts.filter(lr => lr.isInvoiceGenerated && lr.invoiceNo && (lr.billingTo?.name === form.party_name || lr.consignor?.name === form.party_name)).map(lr => lr.invoiceNo!).filter((v, i, a) => a.indexOf(v) === i);
    }, [form.party_name, lorryReceipts]);

    const handleSave = async () => {
        if (!form.party_name || !form.amount) return toast.error('Party name and amount are required');
        setSaving(true);
        try {
            await savePaymentReceipt(form as PaymentReceipt);
            toast.success('Payment receipt saved');
            setShowForm(false);
            setForm({ date: today(), receipt_no: `RCP-${Date.now().toString().slice(-6)}`, party_name: '', amount: 0, payment_mode: 'Cash', invoice_nos: [], notes: '' });
            onRefresh();
        } catch (e: any) { toast.error(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this payment receipt?')) return;
        try { await deletePaymentReceipt(id); toast.success('Deleted'); onRefresh(); } catch (e: any) { toast.error(e.message); }
    };

    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
                        <div className="text-xs text-gray-500 font-bold">TOTAL RECEIVED</div>
                        <div className="text-xl font-black text-green-600">{fmt(totalReceived)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
                        <div className="text-xs text-gray-500 font-bold">PAYMENTS</div>
                        <div className="text-xl font-black text-blue-600">{payments.length}</div>
                    </div>
                </div>
                <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow hover:bg-green-700 transition">
                    + Record Payment
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                    <h3 className="font-bold text-green-800 mb-4">Record Payment Receipt</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Date *</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Receipt No *</label>
                            <input value={form.receipt_no} onChange={e => setForm(f => ({ ...f, receipt_no: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Payment Mode *</label>
                            <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value as any }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                                {['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Party Name *</label>
                            <input value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} list="pay-party"
                                placeholder="Party name" className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <datalist id="pay-party">{parties.map(p => <option key={p} value={p} />)}</datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Amount (₹) *</label>
                            <input type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))}
                                placeholder="0" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Link Invoice(s)</label>
                            <select multiple value={form.invoice_nos || []} onChange={e => setForm(f => ({ ...f, invoice_nos: Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value) }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm h-20">
                                {invoiceOptions.map(inv => <option key={inv} value={inv}>{inv}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Notes</label>
                            <input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Optional notes" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow hover:bg-green-700 disabled:opacity-60">
                            {saving ? 'Saving...' : 'Save Receipt'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                {['Date', 'Receipt No', 'Party', 'Amount', 'Mode', 'Linked Invoices', 'Notes', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {payments.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No payments recorded yet</td></tr>
                            ) : payments.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-600">{p.date}</td>
                                    <td className="px-4 py-3 font-bold text-green-700">{p.receipt_no}</td>
                                    <td className="px-4 py-3 text-gray-800 font-semibold">{p.party_name}</td>
                                    <td className="px-4 py-3 font-black text-green-600">{fmt(p.amount)}</td>
                                    <td className="px-4 py-3"><Badge color="bg-blue-100 text-blue-700">{p.payment_mode}</Badge></td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{(p.invoice_nos || []).join(', ') || '—'}</td>
                                    <td className="px-4 py-3 text-gray-500">{p.notes || '—'}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleDelete(p.id!)} className="text-red-400 hover:text-red-600 text-xs font-bold">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── TRUCK EXPENSE TYPES ─────────────────────────────────────────────────────
interface TruckExpenseEntry {
    category: string;
    amount: number;
    note: string;
}

const TRUCK_EXPENSE_CATEGORIES = [
    { key: 'Fuel',          icon: '⛽', label: 'Fuel' },
    { key: 'Toll',          icon: '🛣️', label: 'Toll' },
    { key: 'Driver Payment',icon: '👨‍✈️', label: 'Driver Payment' },
    { key: 'Driver Advance',icon: '💵', label: 'Driver Advance' },
    { key: 'Hamali',        icon: '🏋️', label: 'Hamali / Loading' },
    { key: 'Maintenance',   icon: '🔧', label: 'Maintenance / Repair' },
    { key: 'Tyre',          icon: '🔄', label: 'Tyre / Puncture' },
    { key: 'Police / RTO',  icon: '🚔', label: 'Police / RTO' },
    { key: 'Cleaning',      icon: '🧹', label: 'Cleaning / Dhulai' },
    { key: 'Commission',    icon: '🤝', label: 'Commission' },
    { key: 'Extra',         icon: '➕', label: 'Extra / Misc' },
];

// ─── EXPENSES TAB ─────────────────────────────────────────────────────────────
const ExpensesTab = ({ vouchers, lorryReceipts, savedTrucks, onRefresh }: {
    vouchers: Voucher[];
    lorryReceipts: LorryReceipt[];
    savedTrucks?: SavedTruck[];
    onRefresh: () => void;
}) => {
    // ── Truck Expense Form state ────────────────────────────────────────────────
    const [showTruckForm, setShowTruckForm]   = useState(false);
    const [showGenForm,   setShowGenForm]     = useState(false);
    const [selectedTruck, setSelectedTruck]   = useState('');
    const [selectedLR,    setSelectedLR]      = useState('');
    const [expDate,       setExpDate]         = useState(today());
    const [payMode,       setPayMode]         = useState('Cash');
    const [expenses,      setExpenses]        = useState<TruckExpenseEntry[]>(
        TRUCK_EXPENSE_CATEGORIES.map(c => ({ category: c.key, amount: 0, note: '' }))
    );
    const [saving,        setSaving]          = useState(false);

    // ── Live Fuel Price & Auto-Calculator State ─────────────────────────────────
    const [fuelPrices, setFuelPrices] = useState<FuelPriceResponse | null>(null);
    const [loadingFuel, setLoadingFuel] = useState(false);
    const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('Diesel');
    const [selectedFuelCity, setSelectedFuelCity] = useState('Delhi');
    const [customDieselRate, setCustomDieselRate] = useState<number | ''>('');
    const [showFuelCalc, setShowFuelCalc] = useState(false);
    const [fuelCalcMode, setFuelCalcMode] = useState<'liters' | 'distance'>('distance');
    const [fuelLiters, setFuelLiters] = useState<number | ''>('');
    const [fuelDistanceKm, setFuelDistanceKm] = useState<number | ''>('');
    const [fuelMileageKmpl, setFuelMileageKmpl] = useState<number>(6.0);

    // ── Quick Fuel Modal State ─────────────────────────────────────────────────
    const [showQuickFuelModal, setShowQuickFuelModal] = useState(false);
    const [quickTruck, setQuickTruck] = useState('');
    const [quickLR, setQuickLR] = useState('');
    const [quickFuelType, setQuickFuelType] = useState<FuelType>('Petrol');
    const [quickDate, setQuickDate] = useState(today());
    const [quickPayMode, setQuickPayMode] = useState('Cash');
    const [quickCity, setQuickCity] = useState('Delhi');
    const [quickLiters, setQuickLiters] = useState<number | ''>('');
    const [quickDistanceKm, setQuickDistanceKm] = useState<number | ''>('');
    const [quickMileageKmpl, setQuickMileageKmpl] = useState<number>(6.0);
    const [quickMode, setQuickMode] = useState<'liters' | 'distance'>('distance');
    const [quickCustomRate, setQuickCustomRate] = useState<number | ''>('');
    const [quickSaving, setQuickSaving] = useState(false);

    // ── Petrol Expense Tracker (Per LR & Truck - View Only, No Ledger) ────────
    const [showAutoLRFuelModal, setShowAutoLRFuelModal] = useState(false);
    const [petrolViewTab, setPetrolViewTab] = useState<'truck' | 'lr'>('truck');
    const [petrolRateInput, setPetrolRateInput] = useState<number>(94.77);
    const [petrolMileageInput, setPetrolMileageInput] = useState<number>(6.0);
    const [autoLRSearch, setAutoLRSearch] = useState('');

    const truckPetrolSummary = useMemo(() => {
        const map = new Map<string, { truckNo: string; trips: number; totalKm: number; litres: number; cost: number; routes: string[] }>();
        lorryReceipts.forEach(lr => {
            const truck = (lr.truckNo || 'Unassigned').trim().toUpperCase();
            const dist = lr.distanceKm && lr.distanceKm > 0 ? lr.distanceKm : getResolvedDistance(lr.fromPlace, lr.toPlace).distanceKm;
            const entry = map.get(truck) || { truckNo: truck, trips: 0, totalKm: 0, litres: 0, cost: 0, routes: [] };
            entry.trips += 1;
            entry.totalKm += dist;
            if (lr.fromPlace && lr.toPlace && entry.routes.length < 2) {
                entry.routes.push(`${lr.fromPlace}→${lr.toPlace}`);
            }
            map.set(truck, entry);
        });

        return Array.from(map.values()).map(t => {
            const litres = Math.round((t.totalKm / (petrolMileageInput || 6.0)) * 10) / 10;
            const cost = Math.round(litres * (petrolRateInput || 94.77));
            return { ...t, litres, cost };
        }).sort((a, b) => b.cost - a.cost);
    }, [lorryReceipts, petrolMileageInput, petrolRateInput]);

    const totalFleetKm = useMemo(() => truckPetrolSummary.reduce((sum, t) => sum + t.totalKm, 0), [truckPetrolSummary]);
    const totalFleetPetrolLitres = useMemo(() => Math.round((totalFleetKm / (petrolMileageInput || 6.0)) * 10) / 10, [totalFleetKm, petrolMileageInput]);
    const totalFleetPetrolCost = useMemo(() => Math.round(totalFleetPetrolLitres * (petrolRateInput || 94.77)), [totalFleetPetrolLitres, petrolRateInput]);

    // ── IndianAPI Key Settings Modal State ──────────────────────────────────────
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [inputApiKey, setInputApiKey] = useState('');
    const [testingApiKey, setTestingApiKey] = useState(false);
    const [apiTestStatus, setApiTestStatus] = useState<{ checked: boolean; success: boolean; message: string } | null>(null);

    // ── Helper: Get Truck Specs (Fuel Type & Mileage) ───────────────────────────
    const getTruckDetails = useCallback((truckNo: string) => {
        const clean = (truckNo || '').replace(/[\s-]/g, '').toUpperCase();
        const trk = savedTrucks?.find(t => t.truckNo && t.truckNo.replace(/[\s-]/g, '').toUpperCase() === clean);
        const fType: FuelType = trk?.fuelType || 'Diesel';
        const defaultMil = 6.0; // Default mileage 6.0 km/l or km/kg
        return {
            fuelType: fType,
            mileage: trk?.mileage && trk.mileage > 0 ? trk.mileage : defaultMil,
            tankCapacity: trk?.tankCapacity,
            ownerName: trk?.ownerName,
            driverName: trk?.driverName
        };
    }, [savedTrucks]);

    // ── Helper: Check if Fuel expense is already logged for an LR ───────────────
    const isLRFuelLogged = useCallback((lrNo: string) => {
        if (!lrNo) return false;
        return vouchers.some(v => 
            (v.voucher_no?.includes(lrNo) || v.description?.includes(lrNo) || v.description?.includes(`LR# ${lrNo}`)) &&
            /fuel|diesel|cng|petrol/i.test(v.description || '')
        );
    }, [vouchers]);

    // ── Fetch Daily Fuel Prices (IndianAPI or OpenFuel) ─────────────────────────
    const loadFuelPrices = useCallback(async (force = false) => {
        setLoadingFuel(true);
        try {
            const res = await fetchDailyFuelPrices(force);
            setFuelPrices(res);
            const defaultRate = findFuelPrice(res, selectedFuelType, selectedFuelCity).price;
            setCustomDieselRate(defaultRate);
            setQuickCustomRate(defaultRate);
            if (force) toast.success(`Live ${selectedFuelType} rates refreshed! ⛽`);
        } catch (e: any) {
            console.warn('Fuel price load error:', e);
        } finally {
            setLoadingFuel(false);
        }
    }, [selectedFuelType, selectedFuelCity]);

    useEffect(() => {
        loadFuelPrices();
        setInputApiKey(getIndianApiKey());
    }, [loadFuelPrices]);

    const currentFuel = useMemo(() => {
        return findFuelPrice(fuelPrices, selectedFuelType, selectedFuelCity);
    }, [fuelPrices, selectedFuelType, selectedFuelCity]);

    const quickCurrentFuel = useMemo(() => {
        return findFuelPrice(fuelPrices, quickFuelType, quickCity);
    }, [fuelPrices, quickFuelType, quickCity]);

    useEffect(() => {
        if (currentFuel?.price) setCustomDieselRate(currentFuel.price);
    }, [currentFuel]);

    useEffect(() => {
        if (quickCurrentFuel?.price) setQuickCustomRate(quickCurrentFuel.price);
    }, [quickCurrentFuel]);

    // When selectedTruck changes, sync fuel type & mileage
    useEffect(() => {
        if (selectedTruck) {
            const trk = getTruckDetails(selectedTruck);
            setSelectedFuelType(trk.fuelType);
            setFuelMileageKmpl(trk.mileage);
        }
    }, [selectedTruck, getTruckDetails]);

    // Auto-detect route distance & location from selected LR (From Place / To Place)
    useEffect(() => {
        if (selectedLR && lorryReceipts) {
            const lr = lorryReceipts.find(l => l.lrNo === selectedLR);
            if (lr) {
                if (lr.truckNo) {
                    setSelectedTruck(lr.truckNo);
                    const trk = getTruckDetails(lr.truckNo);
                    setSelectedFuelType(trk.fuelType);
                    setFuelMileageKmpl(trk.mileage);
                }
                const distRes = estimateRouteDistance(lr.fromPlace, lr.toPlace);
                setFuelDistanceKm(distRes.distanceKm);
                setFuelCalcMode('distance');

                if (fuelPrices?.diesel) {
                    const match = fuelPrices.diesel.find(d => 
                        (lr.fromPlace && (lr.fromPlace.toLowerCase().includes(d.city.toLowerCase()) || d.city.toLowerCase().includes(lr.fromPlace.toLowerCase()))) ||
                        (lr.toPlace && (lr.toPlace.toLowerCase().includes(d.city.toLowerCase()) || d.city.toLowerCase().includes(lr.toPlace.toLowerCase())))
                    );
                    if (match) setSelectedFuelCity(match.city);
                }
            }
        }
    }, [selectedLR, lorryReceipts, fuelPrices, getTruckDetails]);

    // Apply auto-calculated fuel expense to Truck Expense form
    const handleApplyFuelCalc = () => {
        const rate = Number(customDieselRate) || currentFuel.price;
        const fuelIdx = TRUCK_EXPENSE_CATEGORIES.findIndex(c => c.key === 'Fuel');
        if (fuelIdx === -1) return;
        const unit = currentFuel.unit;
        const unitLabel = unit.includes('kg') ? 'Kg' : 'L';

        if (fuelCalcMode === 'liters') {
            const ltr = Number(fuelLiters) || 0;
            if (ltr <= 0) return toast.error(`Kripya quantity daalo (${unitLabel})`);
            const total = Math.round(ltr * rate);
            const note = `Fuel: ${ltr} ${unitLabel} @ ₹${rate.toFixed(2)}/${unitLabel} (${selectedFuelCity}) [${selectedFuelType}]`;
            setExpenses(prev => prev.map((e, i) => i === fuelIdx ? { ...e, amount: total, note } : e));
            toast.success(`Fuel auto-filled: ₹${total.toLocaleString('en-IN')} (${ltr} ${unitLabel} @ ₹${rate}) ⛽`);
            setShowFuelCalc(false);
        } else {
            const dist = Number(fuelDistanceKm) || 0;
            const mil = Number(fuelMileageKmpl) || 6.0;
            if (dist <= 0) return toast.error('Kripya Trip Distance (KM) daalo');
            const res = calculateTripFuel(dist, mil, rate);
            const note = `Trip Fuel: ${dist} km @ ${mil} km/${unitLabel} (${res.liters} ${unitLabel} @ ₹${rate.toFixed(2)}/${unitLabel} - ${selectedFuelCity}) [${selectedFuelType}]`;
            setExpenses(prev => prev.map((e, i) => i === fuelIdx ? { ...e, amount: res.totalCost, note } : e));
            toast.success(`Trip Fuel auto-filled: ₹${res.totalCost.toLocaleString('en-IN')} (${res.liters} ${unitLabel}) ⛽`);
            setShowFuelCalc(false);
        }
    };

    // Quick Fuel Voucher Direct Save
    const handleQuickFuelSave = async () => {
        if (!quickTruck) return toast.error('Pehle truck select karo');
        const rate = Number(quickCustomRate) || quickCurrentFuel.price;
        const unit = quickCurrentFuel.unit;
        const unitLabel = unit.includes('kg') ? 'Kg' : 'L';
        let amount = 0;
        let note = '';

        if (quickMode === 'liters') {
            const ltr = Number(quickLiters) || 0;
            if (ltr <= 0) return toast.error(`Kripya quantity daalo (${unitLabel})`);
            amount = Math.round(ltr * rate);
            note = `Fuel: ${ltr} ${unitLabel} @ ₹${rate.toFixed(2)}/${unitLabel} (${quickCity}) [${quickFuelType}]`;
        } else {
            const dist = Number(quickDistanceKm) || 0;
            const mil = Number(quickMileageKmpl) || 6.0;
            if (dist <= 0) return toast.error('Kripya Distance (KM) daalo');
            const res = calculateTripFuel(dist, mil, rate);
            amount = res.totalCost;
            note = `Trip Fuel: ${dist} km @ ${mil} km/${unitLabel} (${res.liters} ${unitLabel} @ ₹${rate.toFixed(2)}/${unitLabel} - ${quickCity}) [${quickFuelType}]`;
        }

        const lr = lorryReceipts.find(l => l.lrNo === quickLR);
        const lrTag = lr ? ` | LR# ${lr.lrNo} (${lr.fromPlace}→${lr.toPlace})` : '';

        setQuickSaving(true);
        try {
            await addVoucher({
                date: quickDate,
                voucher_no: `FUEL-${quickTruck}-${Date.now().toString().slice(-5)}`,
                description: `[Truck: ${quickTruck}] Fuel${lrTag} | ${note}`,
                amount,
                payment_mode: quickPayMode,
                party_name: quickTruck
            });
            toast.success(`Fuel expense ₹${amount.toLocaleString('en-IN')} saved for ${quickTruck} ⛽✅`);
            setShowQuickFuelModal(false);
            setQuickLiters('');
            setQuickDistanceKm('');
            setQuickLR('');
            onRefresh();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setQuickSaving(false);
        }
    };

    // Save individual LR Fuel Expense
    const handleSaveSingleLRFuel = async (lr: LorryReceipt, customDist?: number, fuelTypeOverride?: FuelType) => {
        const trk = getTruckDetails(lr.truckNo || '');
        const chosenFuelType: FuelType = fuelTypeOverride || customLRFuelTypes[lr.lrNo] || (autoSyncFuelType === 'Auto' ? trk.fuelType : autoSyncFuelType);
        const chosenMileage: number = autoSyncMileage || trk.mileage || 6.0;

        const fuelCalc = calculateLRTripFuel({
            fromPlace: lr.fromPlace,
            toPlace: lr.toPlace,
            truck: { fuelType: chosenFuelType, mileage: chosenMileage },
            fuelPrices,
            customDistanceKm: customDist || lr.distanceKm
        });

        try {
            await addVoucher({
                date: lr.date || today(),
                voucher_no: `FUEL-${lr.truckNo || 'TRK'}-${lr.lrNo}`,
                description: `[Truck: ${lr.truckNo || 'Fleet'}] ${chosenFuelType} Fuel | LR# ${lr.lrNo} (${lr.fromPlace}→${lr.toPlace}) | ${fuelCalc.description}`,
                amount: fuelCalc.totalCost,
                payment_mode: 'Cash',
                party_name: lr.truckNo || 'Fleet'
            });
            toast.success(`LR# ${lr.lrNo} ${chosenFuelType} expense ₹${fuelCalc.totalCost.toLocaleString('en-IN')} added! ⛽✅`);
            onRefresh();
        } catch (e: any) {
            toast.error(e.message || 'Error saving fuel expense');
        }
    };

    // Bulk Auto-Sync All Pending LRs Fuel
    const handleAutoSyncAllPendingLRs = async () => {
        const pending = lorryReceipts.filter(lr => !isLRFuelLogged(lr.lrNo));
        if (pending.length === 0) {
            toast.success('Sabhi LRs ka fuel expense pehle se recorded hai! ✅');
            return;
        }

        setAutoSyncSaving(true);
        let successCount = 0;
        let totalCost = 0;

        for (const lr of pending) {
            try {
                const trk = getTruckDetails(lr.truckNo || '');
                const cDist = customLRDistances[lr.lrNo];
                const chosenFuelType: FuelType = customLRFuelTypes[lr.lrNo] || (autoSyncFuelType === 'Auto' ? trk.fuelType : autoSyncFuelType);
                const chosenMileage: number = autoSyncMileage || trk.mileage || 6.0;

                const fuelCalc = calculateLRTripFuel({
                    fromPlace: lr.fromPlace,
                    toPlace: lr.toPlace,
                    truck: { fuelType: chosenFuelType, mileage: chosenMileage },
                    fuelPrices,
                    customDistanceKm: cDist || lr.distanceKm
                });

                await addVoucher({
                    date: lr.date || today(),
                    voucher_no: `FUEL-${lr.truckNo || 'TRK'}-${lr.lrNo}`,
                    description: `[Truck: ${lr.truckNo || 'Fleet'}] ${chosenFuelType} Fuel | LR# ${lr.lrNo} (${lr.fromPlace}→${lr.toPlace}) | ${fuelCalc.description}`,
                    amount: fuelCalc.totalCost,
                    payment_mode: 'Cash',
                    party_name: lr.truckNo || 'Fleet'
                });
                successCount++;
                totalCost += fuelCalc.totalCost;
            } catch (err) {
                console.warn(`Failed syncing fuel for LR ${lr.lrNo}:`, err);
            }
        }

        setAutoSyncSaving(false);
        toast.success(`🎉 ${successCount} LRs ka ${autoSyncFuelType} fuel expense (Total ₹${totalCost.toLocaleString('en-IN')} @ ${autoSyncMileage} km/L) successfully sync ho gaya! ⛽`);
        setShowAutoLRFuelModal(false);
        onRefresh();
    };

    // Test IndianAPI connection
    const handleTestApiKey = async () => {
        setTestingApiKey(true);
        setApiTestStatus(null);
        try {
            const res = await testIndianApiConnection(inputApiKey);
            setApiTestStatus({ checked: true, success: res.success, message: res.message });
            if (res.success) {
                saveIndianApiKey(inputApiKey);
                toast.success('IndianAPI key connected & saved! 🚀');
                loadFuelPrices(true);
            } else {
                toast.error(res.message);
            }
        } catch (e: any) {
            setApiTestStatus({ checked: true, success: false, message: e.message });
        } finally {
            setTestingApiKey(false);
        }
    };


    // ── General form state ──────────────────────────────────────────────────────
    const [genForm, setGenForm] = useState<Partial<Voucher>>({
        date: today(), description: '', amount: 0, payment_mode: 'Cash',
        voucher_no: `EXP-${Date.now().toString().slice(-6)}`, party_name: ''
    });
    const [genSaving, setGenSaving] = useState(false);
    const [filterCat, setFilterCat] = useState('All');

    const GEN_CATEGORIES = ['All', 'Fuel', 'Toll', 'Driver Payment', 'Hamali', 'Maintenance', 'Commission', 'Office', 'Other'];

    // ── Filter only real expenses (exclude VCH- vouchers from LR List) ─────────────
    const expenseList = useMemo(() => {
        return vouchers.filter(isExpenseVoucher);
    }, [vouchers]);

    // ── Derived ─────────────────────────────────────────────────────────────────
    const trucks = useMemo(() => {
        const set = new Set<string>();
        lorryReceipts.forEach(lr => { if (lr.truckNo) set.add(lr.truckNo.trim().toUpperCase()); });
        return Array.from(set).sort();
    }, [lorryReceipts]);

    const truckLRs = useMemo(() =>
        selectedTruck
            ? lorryReceipts
                .filter(lr => lr.truckNo?.trim().toUpperCase() === selectedTruck)
                .sort((a, b) => b.date.localeCompare(a.date))
            : [],
    [selectedTruck, lorryReceipts]);

    const filtered = filterCat === 'All'
        ? expenseList
        : expenseList.filter(v =>
            v.description?.toLowerCase().includes(filterCat.toLowerCase()) ||
            v.party_name?.toLowerCase().includes(filterCat.toLowerCase()));

    const totalExpAll      = expenseList.reduce((s, v) => s + v.amount, 0);
    const totalExpFiltered = filtered.reduce((s, v) => s + v.amount, 0);
    const truckExpTotal    = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const breakdown = GEN_CATEGORIES.slice(1).map(cat => ({
        cat,
        total: expenseList.filter(v => v.description?.toLowerCase().includes(cat.toLowerCase())).reduce((s, v) => s + v.amount, 0)
    })).filter(b => b.total > 0);

    // Expenses grouped by truck
    const byTruck = useMemo(() => {
        const map: Record<string, { amount: number; count: number }> = {};
        expenseList.forEach(v => {
            const match = v.description?.match(/\[Truck:\s*([^\]]+)\]/);
            const key = match ? match[1] : (v.party_name && (v.party_name.startsWith('HR') || v.party_name.startsWith('DL') || v.party_name.match(/^[A-Z]{2}\s*\d/)) ? v.party_name : '(General)');
            if (!map[key]) map[key] = { amount: 0, count: 0 };
            map[key].amount += v.amount;
            map[key].count  += 1;
        });
        return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
    }, [expenseList]);

    // ── Handlers ────────────────────────────────────────────────────────────────
    const updateExpense = (idx: number, field: keyof TruckExpenseEntry, value: string | number) =>
        setExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));

    const handleTruckExpenseSave = async () => {
        if (!selectedTruck) return toast.error('Pehle truck select karo');
        const active = expenses.filter(e => Number(e.amount) > 0);
        if (active.length === 0) return toast.error('Kam se kam ek expense amount daalo');
        setSaving(true);
        try {
            const lr = truckLRs.find(l => l.lrNo === selectedLR);
            const lrTag = lr ? ` | LR# ${lr.lrNo} (${lr.fromPlace}→${lr.toPlace})` : '';
            await Promise.all(active.map((e, i) =>
                addVoucher({
                    date:         expDate,
                    voucher_no:   `TRK-${selectedTruck}-${Date.now().toString().slice(-5)}-${i}`,
                    description:  `[Truck: ${selectedTruck}] ${e.category}${lrTag}${e.note ? ' | ' + e.note : ''}`,
                    amount:       Number(e.amount),
                    payment_mode: payMode,
                    party_name:   selectedTruck,
                })
            ));
            toast.success(`${active.length} expense(s) saved for ${selectedTruck} ✅`);
            setShowTruckForm(false);
            setExpenses(TRUCK_EXPENSE_CATEGORIES.map(c => ({ category: c.key, amount: 0, note: '' })));
            setSelectedLR('');
            onRefresh();
        } catch (e: any) { toast.error(e.message); }
        finally { setSaving(false); }
    };

    const handleGenSave = async () => {
        if (!genForm.description || !genForm.amount) return toast.error('Description and amount required');
        setGenSaving(true);
        try {
            await addVoucher(genForm);
            toast.success('Expense saved');
            setShowGenForm(false);
            setGenForm({ date: today(), description: '', amount: 0, payment_mode: 'Cash', voucher_no: `EXP-${Date.now().toString().slice(-6)}`, party_name: '' });
            onRefresh();
        } catch (e: any) { toast.error(e.message); }
        finally { setGenSaving(false); }
    };

    return (
        <div className="space-y-5">

            {/* ── OpenFuel & IndianAPI Live Daily Fuel Ticker Banner ── */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white rounded-2xl p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
                            {selectedFuelType === 'CNG' ? '🌿' : '⛽'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm uppercase tracking-wider">
                                    DAILY LIVE {selectedFuelType.toUpperCase()} PRICES (INDIA)
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] bg-white/25 backdrop-blur px-2.5 py-0.5 rounded-full font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    {fuelPrices?.source || 'OpenFuel & IndianAPI (Daily 06:00 AM)'}
                                </span>
                            </div>

                            {/* Corridor Rates for selected fuel type */}
                            <div className="text-xs text-white/95 mt-1 flex items-center gap-2.5 flex-wrap font-medium">
                                <span>Delhi: <strong>₹{(findFuelPrice(fuelPrices, selectedFuelType, 'Delhi').price).toFixed(2)}{currentFuel.unit.replace('₹', '')}</strong></span>
                                <span className="text-white/40">•</span>
                                <span>Haryana: <strong>₹{(findFuelPrice(fuelPrices, selectedFuelType, 'Haryana').price).toFixed(2)}{currentFuel.unit.replace('₹', '')}</strong></span>
                                <span className="text-white/40">•</span>
                                <span>UP: <strong>₹{(findFuelPrice(fuelPrices, selectedFuelType, 'Uttar Pradesh').price).toFixed(2)}{currentFuel.unit.replace('₹', '')}</strong></span>
                                <span className="text-white/40">•</span>
                                <span>Rajasthan: <strong>₹{(findFuelPrice(fuelPrices, selectedFuelType, 'Rajasthan').price).toFixed(2)}{currentFuel.unit.replace('₹', '')}</strong></span>
                                <span className="text-white/40">•</span>
                                <span>Maharashtra: <strong>₹{(findFuelPrice(fuelPrices, selectedFuelType, 'Maharashtra').price).toFixed(2)}{currentFuel.unit.replace('₹', '')}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Fuel Type Switcher */}
                        <div className="flex items-center bg-black/25 backdrop-blur-md p-1 rounded-xl border border-white/20 text-xs font-bold">
                            {(['Diesel', 'CNG', 'Petrol'] as FuelType[]).map(ft => (
                                <button
                                    key={ft}
                                    type="button"
                                    onClick={() => setSelectedFuelType(ft)}
                                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                                        selectedFuelType === ft
                                            ? 'bg-white text-orange-900 font-black shadow-xs'
                                            : 'text-white/80 hover:text-white'
                                    }`}
                                >
                                    <span>{ft === 'CNG' ? '🌿' : '⛽'}</span>
                                    <span>{ft}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowApiKeyModal(true)}
                            className="px-2.5 py-1.5 text-xs bg-white/20 hover:bg-white/30 rounded-xl font-bold backdrop-blur transition cursor-pointer flex items-center gap-1 text-white"
                            title="Configure IndianAPI Key (x-api-key)"
                        >
                            <span>🔑</span>
                            <span className="hidden sm:inline">API Key</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => loadFuelPrices(true)}
                            disabled={loadingFuel}
                            className="px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 rounded-xl font-bold backdrop-blur transition cursor-pointer flex items-center gap-1.5"
                            title="Fetch latest rates from OpenFuel / IndianAPI"
                        >
                            <span>{loadingFuel ? '⌛' : '↻'}</span>
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setQuickTruck(selectedTruck || (trucks[0] || ''));
                                setShowQuickFuelModal(true);
                            }}
                            className="px-3.5 py-1.5 text-xs bg-white text-orange-700 hover:bg-amber-50 rounded-xl font-black shadow-sm transition cursor-pointer flex items-center gap-1.5"
                        >
                            <span>⚡</span>
                            <span>+ Quick Refuel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Top Row ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3 flex-wrap">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
                        <div className="text-xs text-gray-500 font-bold">TOTAL EXPENSES</div>
                        <div className="text-xl font-black text-red-600">{fmt(totalExpAll)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
                        <div className="text-xs text-gray-500 font-bold">TOTAL ENTRIES</div>
                        <div className="text-xl font-black text-orange-600">{expenseList.length}</div>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    {/* Petrol Expense Tracker Button */}
                    <button
                        onClick={() => setShowAutoLRFuelModal(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-black shadow-md transition flex items-center gap-2 cursor-pointer"
                        title="View live Petrol expense calculated per LR and per Truck (No ledger entries created)"
                    >
                        <span>⛽</span>
                        <span>Petrol Expense Tracker</span>
                        <span className="bg-amber-100 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {lorryReceipts.length} LRs
                        </span>
                    </button>

                    <button onClick={() => {
                        setQuickTruck(selectedTruck || (trucks[0] || ''));
                        setShowQuickFuelModal(true);
                    }}
                        className="px-4 py-2.5 bg-amber-600 text-white rounded-xl font-bold shadow hover:bg-amber-700 transition flex items-center gap-2 cursor-pointer">
                        <span>⛽</span>
                        <span>+ Quick Fuel</span>
                    </button>
                    <button onClick={() => { setShowTruckForm(v => !v); setShowGenForm(false); }}
                        className="px-4 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow hover:bg-orange-700 transition flex items-center gap-2">
                        🚛 Truck Expense
                    </button>
                    <button onClick={() => { setShowGenForm(v => !v); setShowTruckForm(false); }}
                        className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow hover:bg-red-700 transition">
                        + General Expense
                    </button>
                </div>
            </div>

            {/* ── Real-Time Petrol Expense by Truck Banner (Pure Analytics - No Ledger) ── */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-md flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl">
                        ⛽
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-wider text-amber-100">
                            LIVE PETROL EXPENSE (PER TRUCK & LR @ {petrolMileageInput} KM/L)
                        </div>
                        <div className="text-2xl font-black mt-0.5">
                            ₹{totalFleetPetrolCost.toLocaleString('en-IN')}{' '}
                            <span className="text-xs font-normal text-amber-100">
                                ({totalFleetPetrolLitres.toLocaleString('en-IN')} L across {totalFleetKm.toLocaleString('en-IN')} KM)
                            </span>
                        </div>
                        <div className="text-[11px] text-amber-100/90 mt-0.5">
                            🛡️ Calculated distance-wise • Ledger me koi entry nahi jaati (Ledger 100% clean)
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowAutoLRFuelModal(true)}
                    className="px-4 py-2 bg-white text-amber-900 hover:bg-amber-50 rounded-xl font-black text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                    <span>🔍</span>
                    <span>View Per Truck & LR Details</span>
                </button>
            </div>

            {/* ── Truck-wise summary ── */}
            {byTruck.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {byTruck.map(([truck, data]) => (
                        <div key={truck} className="bg-white rounded-xl border border-orange-100 shadow-sm p-3 text-center">
                            <div className="text-xs font-bold text-orange-700 truncate mb-1">🚛 {truck}</div>
                            <div className="font-black text-red-600 text-sm">{fmt(data.amount)}</div>
                            <div className="text-xs text-gray-400">{data.count} entries</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ══ TRUCK EXPENSE FORM ══ */}
            {showTruckForm && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-orange-800 text-lg">🚛 Truck Expense Entry</h3>
                        <button onClick={() => setShowTruckForm(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
                    </div>

                    {/* Truck / LR / Date / Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-xl p-4 border border-orange-100">
                        <div>
                            <label className="block text-xs font-black text-orange-700 mb-1">🚛 TRUCK NO *</label>
                            <select value={selectedTruck} onChange={e => { setSelectedTruck(e.target.value); setSelectedLR(''); }}
                                className="w-full border-2 border-orange-300 rounded-lg px-3 py-2.5 text-sm font-bold bg-orange-50 focus:outline-none focus:border-orange-500">
                                <option value="">— Select Truck —</option>
                                {trucks.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-orange-700 mb-1">📋 LINK LR (Optional)</label>
                            <select value={selectedLR} onChange={e => setSelectedLR(e.target.value)} disabled={!selectedTruck}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 disabled:bg-gray-100 disabled:text-gray-400">
                                <option value="">— No LR —</option>
                                {truckLRs.map(lr => (
                                    <option key={lr.lrNo} value={lr.lrNo}>
                                        LR# {lr.lrNo} | {lr.date} | {lr.fromPlace}→{lr.toPlace}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-orange-700 mb-1">📅 DATE *</label>
                            <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-orange-700 mb-1">💳 PAYMENT MODE</label>
                            <select value={payMode} onChange={e => setPayMode(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                                {['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'NEFT', 'RTGS', 'Fuel Card'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Expense category grid */}
                    <div>
                        <div className="text-xs font-black text-orange-700 mb-3 uppercase tracking-wider flex items-center justify-between">
                            <span>💰 Expense Categories — Jo bhi hua daalo (0 wale skip ho jaayenge)</span>
                            <span className="text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                                ⛽ Fuel me Live Diesel Auto-Calculator active hai
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {TRUCK_EXPENSE_CATEGORIES.map((cat, idx) => (
                                <div key={cat.key}
                                    className={`bg-white rounded-xl border p-3 transition-all ${Number(expenses[idx].amount) > 0 ? 'border-orange-400 shadow-md' : 'border-gray-200'} ${cat.key === 'Fuel' ? 'ring-1 ring-amber-300' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="text-base">{cat.icon}</span>
                                        <span className="text-sm font-bold text-gray-700">{cat.label}</span>
                                        
                                        {/* Smart Live Diesel calculator toggle for Fuel */}
                                        {cat.key === 'Fuel' && (
                                            <button
                                                type="button"
                                                onClick={() => setShowFuelCalc(v => !v)}
                                                className="ml-auto text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                                title="Open OpenFuel live rate calculator"
                                            >
                                                <span>⚡ Live ₹{(Number(customDieselRate) || currentFuel.price).toFixed(2)}/{currentFuel.unit === '₹/kg' ? 'kg' : 'L'}</span>
                                                <span>{showFuelCalc ? '▲' : '▼'}</span>
                                            </button>
                                        )}

                                        {cat.key !== 'Fuel' && Number(expenses[idx].amount) > 0 && (
                                            <span className="ml-auto text-xs font-black text-orange-600">
                                                ₹{Number(expenses[idx].amount).toLocaleString('en-IN')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Inline Live Fuel Calculator (OpenFuel API) */}
                                    {cat.key === 'Fuel' && showFuelCalc && (
                                        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 mb-2.5 text-xs space-y-2.5 animate-fadeIn">
                                            <div className="flex items-center justify-between">
                                                <span className="font-black text-amber-900 flex items-center gap-1">
                                                    <span>⛽ Live Fuel Calculator</span>
                                                    <span className="text-[9px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-black">OpenFuel</span>
                                                </span>
                                                <div className="flex bg-amber-200/80 rounded p-0.5 text-[10px] font-bold">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFuelCalcMode('liters')}
                                                        className={`px-2 py-0.5 rounded cursor-pointer transition ${fuelCalcMode === 'liters' ? 'bg-amber-600 text-white font-black' : 'text-amber-900'}`}
                                                    >
                                                        By Litres
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFuelCalcMode('distance')}
                                                        className={`px-2 py-0.5 rounded cursor-pointer transition ${fuelCalcMode === 'distance' ? 'bg-amber-600 text-white font-black' : 'text-amber-900'}`}
                                                    >
                                                        By Distance (KM)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Location & Rate */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">Location (City/State)</label>
                                                    <select
                                                        value={selectedFuelCity}
                                                        onChange={e => setSelectedFuelCity(e.target.value)}
                                                        className="w-full bg-white border border-amber-300 rounded px-1.5 py-1 text-xs font-bold text-gray-800"
                                                    >
                                                        {getAvailableFuelLocations(fuelPrices || { last_updated_ist: '', petrol: [], diesel: [] }).map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">Diesel Rate (₹/L)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={customDieselRate}
                                                        onChange={e => setCustomDieselRate(e.target.value ? +e.target.value : '')}
                                                        className="w-full bg-white border border-amber-300 rounded px-1.5 py-1 text-xs font-black text-amber-900"
                                                    />
                                                </div>
                                            </div>

                                            {/* Mode Inputs */}
                                            {fuelCalcMode === 'liters' ? (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">Litres Filled (L)</label>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            placeholder="e.g. 150"
                                                            value={fuelLiters}
                                                            onChange={e => setFuelLiters(e.target.value ? +e.target.value : '')}
                                                            className="flex-1 bg-white border border-amber-300 rounded px-2 py-1 text-xs font-black text-gray-900"
                                                        />
                                                        <div className="flex gap-1 text-[10px]">
                                                            {[50, 100, 150, 200].map(l => (
                                                                <button
                                                                    key={l}
                                                                    type="button"
                                                                    onClick={() => setFuelLiters(l)}
                                                                    className="bg-amber-200/90 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                                                                >
                                                                    +{l}L
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-amber-800 mb-0.5">Trip Distance (KM)</label>
                                                        <input
                                                            type="number"
                                                            placeholder="e.g. 450"
                                                            value={fuelDistanceKm}
                                                            onChange={e => setFuelDistanceKm(e.target.value ? +e.target.value : '')}
                                                            className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs font-black text-gray-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-amber-800 mb-0.5">Truck Mileage ({selectedFuelType === 'CNG' ? 'KM/kg' : 'KM/L'})</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="e.g. 6.0"
                                                            value={fuelMileageKmpl}
                                                            onChange={e => setFuelMileageKmpl(+e.target.value || 6.0)}
                                                            className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs font-black text-gray-900"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Preview & Apply button */}
                                            <div className="flex items-center justify-between pt-1.5 border-t border-amber-200">
                                                <div>
                                                    <span className="text-[10px] text-amber-700 block">Auto Calculated Total</span>
                                                    <span className="text-sm font-black text-amber-900">
                                                        ₹{fuelCalcMode === 'liters'
                                                            ? Math.round((Number(fuelLiters) || 0) * (Number(customDieselRate) || currentFuel.price)).toLocaleString('en-IN')
                                                            : calculateTripFuel(Number(fuelDistanceKm) || 0, Number(fuelMileageKmpl) || 6.0, Number(customDieselRate) || currentFuel.price).totalCost.toLocaleString('en-IN')
                                                        }
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleApplyFuelCalc}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-xs cursor-pointer flex items-center gap-1"
                                                >
                                                    <span>✓</span>
                                                    <span>Apply to Fuel</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <input type="number" placeholder="Amount (₹)"
                                            value={expenses[idx].amount || ''}
                                            onChange={e => updateExpense(idx, 'amount', +e.target.value)}
                                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-400 min-w-0" />
                                        <input type="text" placeholder="Note (optional)"
                                            value={expenses[idx].note}
                                            onChange={e => updateExpense(idx, 'note', e.target.value)}
                                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-400 min-w-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total + Save */}
                    <div className="flex items-center justify-between bg-orange-100 rounded-xl px-5 py-4 border border-orange-200">
                        <div>
                            <div className="text-xs font-bold text-orange-700">TOTAL — {selectedTruck || 'TRUCK'}</div>
                            <div className="text-2xl font-black text-orange-800">{fmt(truckExpTotal)}</div>
                            <div className="text-xs text-orange-600">{expenses.filter(e => Number(e.amount) > 0).length} categories active</div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setExpenses(TRUCK_EXPENSE_CATEGORIES.map(c => ({ category: c.key, amount: 0, note: '' })))}
                                className="px-4 py-2 border border-orange-300 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-50">
                                Clear All
                            </button>
                            <button onClick={handleTruckExpenseSave}
                                disabled={saving || !selectedTruck || truckExpTotal === 0}
                                className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-black shadow hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed">
                                {saving ? 'Saving...' : `💾 Save ${expenses.filter(e => Number(e.amount) > 0).length} Expense(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ QUICK FUEL ENTRY MODAL (OpenFuel & IndianAPI) ══ */}
            {showQuickFuelModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-xs">
                                    {quickFuelType === 'CNG' ? '🌿' : '⛽'}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-base">Quick Fuel Expense Entry</h3>
                                    <div className="text-xs text-gray-500 font-medium">Real-time daily fuel pricing ({quickFuelType})</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQuickFuelModal(false)}
                                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Truck & Fuel Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1">🚛 TRUCK NO *</label>
                                <select
                                    value={quickTruck}
                                    onChange={e => {
                                        const tNo = e.target.value;
                                        setQuickTruck(tNo);
                                        setQuickLR('');
                                        if (tNo) {
                                            const trk = getTruckDetails(tNo);
                                            setQuickFuelType(trk.fuelType);
                                            setQuickMileageKmpl(trk.mileage);
                                        }
                                    }}
                                    className="w-full border-2 border-amber-300 rounded-xl px-3 py-2 text-sm font-bold bg-amber-50/50 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="">— Select Truck —</option>
                                    {trucks.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1">⛽ FUEL TYPE</label>
                                <select
                                    value={quickFuelType}
                                    onChange={e => {
                                        const fType = e.target.value as FuelType;
                                        setQuickFuelType(fType);
                                        setQuickMileageKmpl(6.0);
                                    }}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="Diesel">⛽ Diesel</option>
                                    <option value="CNG">🌿 CNG</option>
                                    <option value="Petrol">⚡ Petrol</option>
                                </select>
                            </div>
                        </div>

                        {/* Link LR */}
                        <div>
                            <label className="block text-xs font-black text-gray-700 mb-1">📋 LINK TRIP LR (Auto-Fills Route & KM)</label>
                            <select
                                value={quickLR}
                                onChange={e => {
                                    const lrNo = e.target.value;
                                    setQuickLR(lrNo);
                                    const lr = lorryReceipts.find(l => l.lrNo === lrNo);
                                    if (lr) {
                                        if (lr.truckNo) {
                                            setQuickTruck(lr.truckNo);
                                            const trk = getTruckDetails(lr.truckNo);
                                            setQuickFuelType(trk.fuelType);
                                            setQuickMileageKmpl(trk.mileage);
                                        }
                                        const distRes = estimateRouteDistance(lr.fromPlace, lr.toPlace);
                                        setQuickDistanceKm(distRes.distanceKm);
                                        setQuickMode('distance');
                                        if (lr.fromPlace) {
                                            const match = getAvailableFuelLocations(fuelPrices).find(c => 
                                                c.toLowerCase().includes(lr.fromPlace.toLowerCase()) || lr.fromPlace.toLowerCase().includes(c.toLowerCase())
                                            );
                                            if (match) setQuickCity(match);
                                        }
                                    }
                                }}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                            >
                                <option value="">— Select Trip LR (Optional) —</option>
                                {lorryReceipts
                                    .filter(lr => !quickTruck || lr.truckNo?.trim().toUpperCase() === quickTruck.trim().toUpperCase())
                                    .slice(0, 15)
                                    .map(lr => (
                                        <option key={lr.lrNo} value={lr.lrNo}>
                                            LR# {lr.lrNo} | {lr.fromPlace} → {lr.toPlace} ({lr.truckNo || 'No Truck'})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        {/* Location & Live Fuel Rate */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-amber-900 mb-1">📍 FUEL LOCATION</label>
                                    <select
                                        value={quickCity}
                                        onChange={e => setQuickCity(e.target.value)}
                                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:border-amber-500"
                                    >
                                        {getAvailableFuelLocations(fuelPrices).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-amber-900 mb-1">
                                        LIVE RATE ({quickCurrentFuel.unit})
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={quickCustomRate}
                                        onChange={e => setQuickCustomRate(e.target.value ? +e.target.value : '')}
                                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-black text-amber-900 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Mode tabs */}
                            <div className="flex bg-amber-200/60 rounded-xl p-1 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setQuickMode('distance')}
                                    className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${quickMode === 'distance' ? 'bg-amber-600 text-white font-black shadow-xs' : 'text-amber-900 hover:text-amber-950'}`}
                                >
                                    🗺️ By Route Distance & Mileage
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickMode('liters')}
                                    className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${quickMode === 'liters' ? 'bg-amber-600 text-white font-black shadow-xs' : 'text-amber-900 hover:text-amber-950'}`}
                                >
                                    ⛽ By Quantity ({quickFuelType === 'CNG' ? 'Kg' : 'Litres'})
                                </button>
                            </div>

                            {/* Mode input fields */}
                            {quickMode === 'distance' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-black text-amber-900 mb-1">TRIP DISTANCE (KM) *</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 1420"
                                            value={quickDistanceKm}
                                            onChange={e => setQuickDistanceKm(e.target.value ? +e.target.value : '')}
                                            className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-black text-gray-900 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-amber-900 mb-1">
                                            MILEAGE ({quickFuelType === 'CNG' ? 'KM/kg' : 'KM/L'})
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={quickMileageKmpl}
                                            onChange={e => setQuickMileageKmpl(+e.target.value || 6.0)}
                                            className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-black text-gray-900 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-black text-amber-900 mb-1">
                                        TOTAL {quickFuelType === 'CNG' ? 'KG' : 'LITRES'} *
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            placeholder={`Enter ${quickFuelType === 'CNG' ? 'kg' : 'litres'} (e.g. 150)`}
                                            value={quickLiters}
                                            onChange={e => setQuickLiters(e.target.value ? +e.target.value : '')}
                                            className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-black text-gray-900 focus:outline-none focus:border-amber-500"
                                        />
                                        <div className="flex gap-1 text-xs">
                                            {[50, 100, 150, 200, 300].map(l => (
                                                <button
                                                    key={l}
                                                    type="button"
                                                    onClick={() => setQuickLiters(l)}
                                                    className="bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-1 rounded-lg font-bold cursor-pointer text-xs"
                                                >
                                                    +{l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Live calculation banner */}
                            <div className="bg-white rounded-xl p-3 border border-amber-200 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase">CALCULATED FUEL EXPENSE</div>
                                    <div className="text-xl font-black text-amber-900">
                                        ₹{quickMode === 'liters'
                                            ? Math.round((Number(quickLiters) || 0) * (Number(quickCustomRate) || quickCurrentFuel.price)).toLocaleString('en-IN')
                                            : calculateTripFuel(Number(quickDistanceKm) || 0, Number(quickMileageKmpl) || 6.0, Number(quickCustomRate) || quickCurrentFuel.price).totalCost.toLocaleString('en-IN')
                                        }
                                    </div>
                                    <div className="text-[11px] text-amber-700 font-semibold">
                                        {quickMode === 'liters'
                                            ? `${Number(quickLiters) || 0} ${quickFuelType === 'CNG' ? 'kg' : 'L'} @ ₹${(Number(quickCustomRate) || quickCurrentFuel.price).toFixed(2)} [${quickFuelType}]`
                                            : `${calculateTripFuel(Number(quickDistanceKm) || 0, Number(quickMileageKmpl) || 6.0, Number(quickCustomRate) || quickCurrentFuel.price).liters} ${quickFuelType === 'CNG' ? 'kg' : 'L'} needed (${Number(quickDistanceKm) || 0} km @ ${quickMileageKmpl} ${quickFuelType === 'CNG' ? 'km/kg' : 'km/L'})`
                                        }
                                    </div>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                    <span className="font-bold text-gray-800">{quickCity}</span>
                                    <div className="text-[10px] text-emerald-600 font-bold">● Live Daily Rate</div>
                                </div>
                            </div>
                        </div>

                        {/* Date and Payment Mode */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1">📅 DATE *</label>
                                <input
                                    type="date"
                                    value={quickDate}
                                    onChange={e => setQuickDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1">💳 PAYMENT MODE</label>
                                <select
                                    value={quickPayMode}
                                    onChange={e => setQuickPayMode(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                                >
                                    {['Cash', 'UPI', 'Fuel Card', 'Bank Transfer', 'NEFT'].map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowQuickFuelModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickFuelSave}
                                disabled={quickSaving || !quickTruck || (quickMode === 'liters' ? !quickLiters : !quickDistanceKm)}
                                className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-sm font-black shadow-md hover:from-amber-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {quickSaving ? 'Saving...' : '💾 Save Fuel Expense'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ PETROL EXPENSE TRACKER MODAL (PER LR & TRUCK - VIEW ONLY, NO LEDGER) ══ */}
            {showAutoLRFuelModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-amber-200 space-y-4 max-h-[92vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-sm">
                                    ⛽
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                                        <span>Petrol Expense Tracker</span>
                                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                                            Per LR & Truck
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        🛡️ Pure Analytics View — Ledger me koi voucher add nahi hota. Main accounts 100% clean rahenge.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAutoLRFuelModal(false)}
                                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none cursor-pointer p-1"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">ACTIVE TRUCKS</div>
                                <div className="text-xl font-black text-slate-900 mt-0.5">{truckPetrolSummary.length}</div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                                <div className="text-[10px] font-bold text-blue-700 uppercase">TOTAL FLEET DISTANCE</div>
                                <div className="text-xl font-black text-blue-900 mt-0.5">{totalFleetKm.toLocaleString('en-IN')} KM</div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                                <div className="text-[10px] font-bold text-amber-700 uppercase">PETROL REQUIRED (@ {petrolMileageInput} KM/L)</div>
                                <div className="text-xl font-black text-amber-900 mt-0.5">{totalFleetPetrolLitres.toLocaleString('en-IN')} L</div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3 text-center">
                                <div className="text-[10px] font-bold text-emerald-800 uppercase">TOTAL PETROL EXPENSE</div>
                                <div className="text-xl font-black text-emerald-800 mt-0.5">₹{totalFleetPetrolCost.toLocaleString('en-IN')}</div>
                            </div>
                        </div>

                        {/* Controls Bar: Rate, Mileage, Search & Tabs */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setPetrolViewTab('truck')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                        petrolViewTab === 'truck'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-slate-700 hover:bg-amber-100'
                                    }`}
                                >
                                    <span>🚛 By Truck ({truckPetrolSummary.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPetrolViewTab('lr')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                        petrolViewTab === 'lr'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-slate-700 hover:bg-amber-100'
                                    }`}
                                >
                                    <span>📋 By LR ({lorryReceipts.length})</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                                    <span className="text-xs font-bold text-slate-600">⚡ Mileage:</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="1"
                                        max="30"
                                        value={petrolMileageInput}
                                        onChange={e => setPetrolMileageInput(parseFloat(e.target.value) || 6.0)}
                                        className="w-12 font-mono font-black text-amber-900 text-xs text-center border-b border-amber-400 outline-none"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">KM/L</span>
                                </div>

                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                                    <span className="text-xs font-bold text-slate-600">⛽ Rate: ₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="50"
                                        max="150"
                                        value={petrolRateInput}
                                        onChange={e => setPetrolRateInput(parseFloat(e.target.value) || 94.77)}
                                        className="w-16 font-mono font-black text-amber-900 text-xs text-center border-b border-amber-400 outline-none"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">/L</span>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Search Truck#, LR#, or City..."
                                    value={autoLRSearch}
                                    onChange={e => setAutoLRSearch(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs w-48 focus:outline-none focus:border-amber-500 shadow-2xs"
                                />
                            </div>
                        </div>

                        {/* Content Area: Truck-wise or LR-wise */}
                        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100 min-h-[300px]">
                            {petrolViewTab === 'truck' ? (
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-gray-200">
                                        <tr>
                                            <th className="p-3">Truck Number</th>
                                            <th className="p-3 text-center">Trips (LRs)</th>
                                            <th className="p-3 text-right">Total Distance</th>
                                            <th className="p-3 text-right">Petrol (@ {petrolMileageInput} km/L)</th>
                                            <th className="p-3 text-right">Petrol Expense</th>
                                            <th className="p-3 text-right">Avg / Trip</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {truckPetrolSummary
                                            .filter(t => !autoLRSearch || t.truckNo.toLowerCase().includes(autoLRSearch.toLowerCase()))
                                            .map(t => (
                                                <tr key={t.truckNo} className="hover:bg-amber-50/50 transition">
                                                    <td className="p-3 font-mono font-black text-slate-900 text-xs flex items-center gap-1.5">
                                                        <span>🚛</span>
                                                        <span>{t.truckNo}</span>
                                                    </td>
                                                    <td className="p-3 text-center font-bold text-slate-700">
                                                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full font-mono text-[11px]">
                                                            {t.trips} trips
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                                                        {t.totalKm.toLocaleString('en-IN')} KM
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-amber-800">
                                                        {t.litres.toLocaleString('en-IN')} Litres
                                                    </td>
                                                    <td className="p-3 text-right font-black text-sm text-emerald-700">
                                                        ₹{t.cost.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-slate-500">
                                                        ₹{t.trips > 0 ? Math.round(t.cost / t.trips).toLocaleString('en-IN') : 0}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-gray-200">
                                        <tr>
                                            <th className="p-3">LR # & Date</th>
                                            <th className="p-3">Truck</th>
                                            <th className="p-3">Route (Origin ➔ Destination)</th>
                                            <th className="p-3 text-right">Distance</th>
                                            <th className="p-3 text-right">Petrol (@ {petrolMileageInput} km/L)</th>
                                            <th className="p-3 text-right">Expense (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {lorryReceipts
                                            .filter(lr => {
                                                if (!autoLRSearch) return true;
                                                const q = autoLRSearch.toLowerCase();
                                                return (
                                                    (lr.lrNo && lr.lrNo.toLowerCase().includes(q)) ||
                                                    (lr.truckNo && lr.truckNo.toLowerCase().includes(q)) ||
                                                    (lr.fromPlace && lr.fromPlace.toLowerCase().includes(q)) ||
                                                    (lr.toPlace && lr.toPlace.toLowerCase().includes(q))
                                                );
                                            })
                                            .map(lr => {
                                                const dist = lr.distanceKm && lr.distanceKm > 0 ? lr.distanceKm : getResolvedDistance(lr.fromPlace, lr.toPlace).distanceKm;
                                                const litres = Math.round((dist / (petrolMileageInput || 6.0)) * 10) / 10;
                                                const cost = Math.round(litres * (petrolRateInput || 94.77));
                                                return (
                                                    <tr key={lr.lrNo} className="hover:bg-amber-50/50 transition">
                                                        <td className="p-3">
                                                            <div className="font-mono font-black text-slate-900">LR #{lr.lrNo}</div>
                                                            <div className="text-[10px] text-slate-400">{lr.date}</div>
                                                        </td>
                                                        <td className="p-3 font-mono font-bold text-slate-700">
                                                            🚛 {lr.truckNo || 'Unassigned'}
                                                        </td>
                                                        <td className="p-3 font-bold text-slate-800">
                                                            {lr.fromPlace || 'Origin'} → {lr.toPlace || 'Destination'}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-blue-900">
                                                            {dist} KM
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-amber-800">
                                                            {litres} L <span className="text-[10px] text-slate-400 font-normal">(@ ₹{petrolRateInput.toFixed(2)})</span>
                                                        </td>
                                                        <td className="p-3 text-right font-black text-sm text-emerald-700">
                                                            ₹{cost.toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer: Informative & Safe (No Ledger Modifications) */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-3">
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                <span className="text-emerald-600 font-bold">🛡️ Ledger Safe:</span>
                                <span>Ledger me koi entry nahi jaati. Yeh pure calculation & tracking report hai.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                                >
                                    <span>🖨️</span>
                                    <span>Print / Export</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAutoLRFuelModal(false)}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ INDIAN API KEY CONFIGURATION MODAL ══ */}
            {showApiKeyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-xs">
                                    🔑
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-base">IndianAPI Fuel Settings</h3>
                                    <div className="text-xs text-gray-500 font-medium">Server: https://fuel.indianapi.in</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowApiKeyModal(false)}
                                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1">
                                    X-API-KEY (Header: <code className="text-orange-700">x-api-key</code>)
                                </label>
                                <input
                                    type="text"
                                    value={inputApiKey}
                                    onChange={e => setInputApiKey(e.target.value)}
                                    placeholder="Enter your IndianAPI key..."
                                    className="w-full font-mono text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 bg-slate-50"
                                />
                            </div>

                            {apiTestStatus?.checked && (
                                <div className={`p-3 rounded-xl text-xs font-bold border ${
                                    apiTestStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                    {apiTestStatus.success ? '✅ ' : '❌ '}
                                    {apiTestStatus.message}
                                </div>
                            )}

                            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs text-amber-900 space-y-1">
                                <div className="font-black flex items-center gap-1">
                                    <span>ℹ️</span>
                                    <span>Zero-Cost Fallback Active</span>
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                    Agar aapke paas IndianAPI key nahi hai ya API quota finish ho jaye, tab bhi <strong>OpenFuel automated scraper</strong> subah 6:00 AM par India ke sabhi states ke diesel, CNG aur petrol rates automatically update karta rahega!
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleTestApiKey}
                                disabled={testingApiKey || !inputApiKey}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition disabled:opacity-50 cursor-pointer"
                            >
                                {testingApiKey ? 'Testing...' : 'Test Connection (/states)'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    saveIndianApiKey(inputApiKey);
                                    toast.success('API Key saved!');
                                    setShowApiKeyModal(false);
                                    loadFuelPrices(true);
                                }}
                                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
                            >
                                Save Key
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ══ GENERAL EXPENSE FORM ══ */}
            {showGenForm && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-red-800">Add General Expense</h3>
                        <button onClick={() => setShowGenForm(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Date *</label>
                            <input type="date" value={genForm.date} onChange={e => setGenForm(f => ({ ...f, date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Voucher No</label>
                            <input value={genForm.voucher_no} onChange={e => setGenForm(f => ({ ...f, voucher_no: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Payment Mode</label>
                            <select value={genForm.payment_mode} onChange={e => setGenForm(f => ({ ...f, payment_mode: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                                {['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Description *</label>
                            <input value={genForm.description} onChange={e => setGenForm(f => ({ ...f, description: e.target.value }))}
                                list="gen-exp-cats" placeholder="Expense description / category" className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <datalist id="gen-exp-cats">{GEN_CATEGORIES.slice(1).map(c => <option key={c} value={c} />)}</datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Amount (₹) *</label>
                            <input type="number" value={genForm.amount || ''} onChange={e => setGenForm(f => ({ ...f, amount: +e.target.value }))}
                                placeholder="0" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Party / Vendor</label>
                            <input value={genForm.party_name || ''} onChange={e => setGenForm(f => ({ ...f, party_name: e.target.value }))}
                                placeholder="Optional vendor name" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleGenSave} disabled={genSaving} className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow hover:bg-red-700 disabled:opacity-60">
                            {genSaving ? 'Saving...' : 'Save Expense'}
                        </button>
                        <button onClick={() => setShowGenForm(false)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                    </div>
                </div>
            )}

            {/* ── Filter pills ── */}
            <div className="flex gap-2 flex-wrap">
                {GEN_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setFilterCat(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterCat === cat ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* ── Category breakdown ── */}
            {breakdown.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {breakdown.map(b => (
                        <div key={b.cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                            <div className="text-xs text-gray-500 mb-1 truncate">{b.cat}</div>
                            <div className="font-bold text-red-600 text-sm">{fmt(b.total)}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Expense Table ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                {['Date', 'Truck / Vehicle', 'Expense / Description', 'Vendor / Paid To', 'Mode', 'Amount', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No expenses recorded</td></tr>
                            ) : filtered.map((v, i) => {
                                const truckMatch = v.description?.match(/\[Truck:\s*([^\]]+)\]/);
                                const truckNo = truckMatch ? truckMatch[1] : (v.party_name && (v.party_name.startsWith('HR') || v.party_name.startsWith('DL') || v.party_name.match(/^[A-Z]{2}\s*\d/)) ? v.party_name : null);
                                const lrMatch = v.description?.match(/LR#\s*([^\s|)]+)/);
                                const lrNo = lrMatch ? lrMatch[1] : null;

                                const cleanDesc = v.description
                                    ?.replace(/\[Truck:[^\]]+\]\s*/, '')
                                    ?.replace(/\|\s*LR#[^|]+(\||$)/, '')
                                    ?.trim() || 'Expense';

                                const vendor = (truckNo && v.party_name === truckNo) ? '—' : (v.party_name || '—');

                                return (
                                    <tr key={v.id || i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">{v.date}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {truckNo ? (
                                                <div>
                                                    <span className="font-bold text-gray-800 text-xs">🚛 {truckNo}</span>
                                                    {lrNo && <span className="block text-[11px] text-blue-600 font-semibold">LR #{lrNo}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 font-medium">General</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 max-w-sm truncate" title={v.description}>
                                            <span className="font-medium">{cleanDesc}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{vendor}</td>
                                        <td className="px-4 py-3"><Badge color="bg-gray-100 text-gray-600">{v.payment_mode}</Badge></td>
                                        <td className="px-4 py-3 font-black text-red-600 whitespace-nowrap">{fmt(v.amount)}</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {v.id && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`Kya aap ye expense (${cleanDesc} - ${fmt(v.amount)}) delete karna chahte hain?`)) {
                                                            try {
                                                                await deleteVoucher(v.id!);
                                                                toast.success('Expense deleted ✅');
                                                                onRefresh();
                                                            } catch (err: any) {
                                                                toast.error('Delete failed: ' + err.message);
                                                            }
                                                        }
                                                    }}
                                                    className="text-gray-400 hover:text-red-600 p-1 rounded transition text-xs font-semibold"
                                                    title="Delete expense"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td colSpan={5} className="px-4 py-3 font-black text-gray-700">TOTAL ({filtered.length} entries)</td>
                                    <td className="px-4 py-3 font-black text-red-700">{fmt(totalExpFiltered)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
const ReportsTab = ({ lorryReceipts, vouchers, payments }: {
    lorryReceipts: LorryReceipt[];
    vouchers: Voucher[];
    payments: PaymentReceipt[];
}) => {
    const [reportType, setReportType] = useState<'pl' | 'daybook' | 'outstanding' | 'gst' | 'trial'>('pl');
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(today());

    const invoicedLRs = lorryReceipts.filter(lr => lr.isInvoiceGenerated);

    const filteredLRs = useMemo(() =>
        invoicedLRs.filter(lr => lr.date >= fromDate && lr.date <= toDate), [invoicedLRs, fromDate, toDate]);
    const filteredVouchers = useMemo(() =>
        vouchers.filter(v => isExpenseVoucher(v) && v.date >= fromDate && v.date <= toDate), [vouchers, fromDate, toDate]);
    const filteredPayments = useMemo(() =>
        payments.filter(p => p.date >= fromDate && p.date <= toDate), [payments, fromDate, toDate]);

    const totalRevenue = filteredLRs.reduce((s, lr) => s + (lr.freight || 0), 0);
    const totalExpenses = filteredVouchers.reduce((s, v) => s + v.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const received = filteredPayments.reduce((s, p) => s + p.amount, 0);

    // Outstanding by party
    const outstandingByParty = useMemo(() => {
        const map: Record<string, { debit: number; credit: number }> = {};
        invoicedLRs.forEach(lr => {
            const party = lr.billingTo?.name || lr.consignor?.name || 'Unknown';
            if (!map[party]) map[party] = { debit: 0, credit: 0 };
            map[party].debit += lr.freight || 0;
        });
        payments.forEach(p => {
            if (!map[p.party_name]) map[p.party_name] = { debit: 0, credit: 0 };
            map[p.party_name].credit += p.amount;
        });
        return Object.entries(map).map(([party, { debit, credit }]) => ({ party, debit, credit, outstanding: Math.max(0, debit - credit) })).filter(r => r.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
    }, [invoicedLRs, payments]);

    // GST Summary from LRs (18% GST: 9% CGST + 9% SGST)
    const gstSummary = useMemo(() => {
        return filteredLRs.reduce((acc, lr) => {
            const taxable = lr.freight || 0;
            const cgst = (taxable * 9) / 100;
            const sgst = (taxable * 9) / 100;
            return { taxable: acc.taxable + taxable, cgst: acc.cgst + cgst, sgst: acc.sgst + sgst, igst: acc.igst + 0 };
        }, { taxable: 0, cgst: 0, sgst: 0, igst: 0 });
    }, [filteredLRs]);

    // Day book
    const dayBook = useMemo(() => {
        const entries: { date: string; type: string; desc: string; debit: number; credit: number }[] = [];
        filteredLRs.forEach(lr => entries.push({ date: lr.date, type: 'LR Invoice', desc: `LR# ${lr.lrNo} — ${lr.invoiceNo}`, debit: lr.freight || 0, credit: 0 }));
        filteredVouchers.forEach(v => entries.push({ date: v.date, type: 'Expense', desc: v.description, debit: 0, credit: v.amount }));
        filteredPayments.forEach(p => entries.push({ date: p.date, type: 'Payment Received', desc: `${p.party_name} — ${p.receipt_no}`, debit: 0, credit: p.amount }));
        return entries.sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredLRs, filteredVouchers, filteredPayments]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-5">
            {/* Report Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">REPORT TYPE</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value as any)}
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-gray-50 font-semibold">
                            <option value="pl">📊 Profit & Loss</option>
                            <option value="daybook">📅 Day Book</option>
                            <option value="outstanding">⏳ Outstanding Report</option>
                            <option value="gst">🧾 GST Summary</option>
                            <option value="trial">⚖️ Trial Balance</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">FROM</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">TO</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                    </div>
                    <button onClick={handlePrint} className="px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold shadow hover:bg-gray-900">🖨️ Print</button>
                </div>
            </div>

            {/* P&L Report */}
            {reportType === 'pl' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-black text-gray-800 text-lg mb-1">Profit & Loss Statement</h3>
                    <p className="text-sm text-gray-500 mb-6">Period: {fromDate} to {toDate}</p>
                    <div className="space-y-6">
                        {/* Income */}
                        <div>
                            <div className="flex justify-between items-center py-2 border-b-2 border-blue-600">
                                <span className="font-black text-blue-700 text-sm uppercase tracking-wider">Income</span>
                            </div>
                            <div className="flex justify-between py-3 px-2">
                                <span className="text-gray-700">Freight Revenue ({filteredLRs.length} LRs)</span>
                                <span className="font-bold text-gray-800">{fmt(totalRevenue)}</span>
                            </div>
                            <div className="flex justify-between py-2 px-2 bg-blue-50 rounded-lg">
                                <span className="font-black text-blue-700">Gross Income</span>
                                <span className="font-black text-blue-700">{fmt(totalRevenue)}</span>
                            </div>
                        </div>
                        {/* Expenses */}
                        <div>
                            <div className="flex justify-between items-center py-2 border-b-2 border-red-500">
                                <span className="font-black text-red-600 text-sm uppercase tracking-wider">Expenses</span>
                            </div>
                            {filteredVouchers.slice(0, 10).map(v => (
                                <div key={v.id} className="flex justify-between py-2 px-2 text-gray-600">
                                    <span>{v.description}</span>
                                    <span className="font-semibold">{fmt(v.amount)}</span>
                                </div>
                            ))}
                            {filteredVouchers.length > 10 && <div className="text-xs text-gray-400 px-2">... and {filteredVouchers.length - 10} more</div>}
                            <div className="flex justify-between py-2 px-2 bg-red-50 rounded-lg mt-1">
                                <span className="font-black text-red-600">Total Expenses</span>
                                <span className="font-black text-red-600">{fmt(totalExpenses)}</span>
                            </div>
                        </div>
                        {/* Net */}
                        <div className={`flex justify-between py-4 px-4 rounded-2xl ${netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <span className={`font-black text-xl ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net {netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                            <span className={`font-black text-xl ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(Math.abs(netProfit))}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Day Book */}
            {reportType === 'daybook' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="font-black text-gray-800">Day Book — {fromDate} to {toDate}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50">
                                {['Date', 'Type', 'Description', 'Debit', 'Credit'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {dayBook.map((e, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-600">{e.date}</td>
                                        <td className="px-4 py-3"><Badge color={e.type === 'LR Invoice' ? 'bg-blue-100 text-blue-700' : e.type === 'Payment Received' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{e.type}</Badge></td>
                                        <td className="px-4 py-3 text-gray-700">{e.desc}</td>
                                        <td className="px-4 py-3 font-bold text-red-600">{e.debit > 0 ? fmt(e.debit) : '—'}</td>
                                        <td className="px-4 py-3 font-bold text-green-600">{e.credit > 0 ? fmt(e.credit) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2">
                                    <td colSpan={3} className="px-4 py-3 font-black">TOTAL</td>
                                    <td className="px-4 py-3 font-black text-red-700">{fmt(dayBook.reduce((s, e) => s + e.debit, 0))}</td>
                                    <td className="px-4 py-3 font-black text-green-700">{fmt(dayBook.reduce((s, e) => s + e.credit, 0))}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Outstanding */}
            {reportType === 'outstanding' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between">
                        <h3 className="font-black text-gray-800">Party-wise Outstanding Report</h3>
                        <div className="font-black text-orange-600">{fmt(outstandingByParty.reduce((s, r) => s + r.outstanding, 0))} Total Outstanding</div>
                    </div>
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50">
                            {['Party', 'Total Invoiced', 'Received', 'Outstanding'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {outstandingByParty.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-bold text-green-600">🎉 All invoices paid!</td></tr>
                            ) : outstandingByParty.map(r => (
                                <tr key={r.party} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-bold text-gray-800">{r.party}</td>
                                    <td className="px-4 py-3 font-semibold text-gray-700">{fmt(r.debit)}</td>
                                    <td className="px-4 py-3 font-semibold text-green-600">{fmt(r.credit)}</td>
                                    <td className="px-4 py-3 font-black text-orange-600">{fmt(r.outstanding)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* GST Summary */}
            {reportType === 'gst' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-black text-gray-800 text-lg mb-1">GST Summary</h3>
                    <p className="text-sm text-gray-500 mb-6">Period: {fromDate} to {toDate} | Based on freight invoices (CGST 9% + SGST 9% = 18% GST)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Taxable Value', value: fmt(gstSummary.taxable), color: 'text-blue-700' },
                            { label: 'CGST @9.0%', value: fmt(gstSummary.cgst), color: 'text-purple-700' },
                            { label: 'SGST @9.0%', value: fmt(gstSummary.sgst), color: 'text-indigo-700' },
                            { label: 'Total GST (18%)', value: fmt(gstSummary.cgst + gstSummary.sgst), color: 'text-green-700' },
                        ].map(s => (
                            <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                                <div className="text-xs text-gray-500 font-bold mb-1">{s.label}</div>
                                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50">
                                {['Invoice No', 'LR No', 'Date', 'Party', 'Taxable', 'CGST (9%)', 'SGST (9%)', 'Total (18%)'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLRs.map(lr => {
                                    const taxable = lr.freight || 0;
                                    const cgst = (taxable * 9) / 100;
                                    const sgst = (taxable * 9) / 100;
                                    return (
                                        <tr key={lr.lrNo} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-bold text-blue-700">{lr.invoiceNo}</td>
                                            <td className="px-3 py-2 text-gray-600">{lr.lrNo}</td>
                                            <td className="px-3 py-2 text-gray-600">{lr.date}</td>
                                            <td className="px-3 py-2 text-gray-700">{lr.billingTo?.name || lr.consignor?.name}</td>
                                            <td className="px-3 py-2 font-semibold">{fmt(taxable)}</td>
                                            <td className="px-3 py-2 text-purple-600">{fmt(cgst)}</td>
                                            <td className="px-3 py-2 text-indigo-600">{fmt(sgst)}</td>
                                            <td className="px-3 py-2 font-bold">{fmt(cgst + sgst)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Trial Balance */}
            {reportType === 'trial' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-black text-gray-800 text-lg mb-1">Trial Balance</h3>
                    <p className="text-sm text-gray-500 mb-6">Period: {fromDate} to {toDate}</p>
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Account</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Debit (₹)</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Credit (₹)</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-700 font-medium">Freight Revenue (Trade Receivables)</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalRevenue)}</td>
                                <td className="px-4 py-3 text-right text-gray-400">—</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-700 font-medium">Payments Received (Cash/Bank)</td>
                                <td className="px-4 py-3 text-right text-gray-400">—</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(received)}</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-700 font-medium">Operating Expenses</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalExpenses)}</td>
                                <td className="px-4 py-3 text-right text-gray-400">—</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50">
                                <td className="px-4 py-3 font-black text-gray-800">TOTAL</td>
                                <td className="px-4 py-3 text-right font-black text-gray-800">{fmt(totalRevenue + totalExpenses)}</td>
                                <td className="px-4 py-3 text-right font-black text-gray-800">{fmt(received)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div className={`mt-4 p-4 rounded-xl ${netProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <span className="font-black">Closing Balance (Net {netProfit >= 0 ? 'Profit' : 'Loss'}): {fmt(Math.abs(netProfit))}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── TRUCK P&L / FLEET PROFITABILITY TAB ──────────────────────────────────────
const TruckPnlTab = ({
    lorryReceipts,
    vouchers,
    savedTrucks = [],
    onOpenGarage
}: {
    lorryReceipts: LorryReceipt[];
    vouchers: Voucher[];
    savedTrucks?: SavedTruck[];
    onOpenGarage?: (truckNo?: string) => void;
}) => {
    // 1. Gather all unique trucks from savedTrucks, LRs, and expense vouchers
    const allTruckNumbers = useMemo(() => {
        const set = new Set<string>();
        savedTrucks.forEach(t => t.truckNo && set.add(t.truckNo.toUpperCase().trim()));
        lorryReceipts.forEach(lr => lr.truckNo && set.add(lr.truckNo.toUpperCase().trim()));
        vouchers.forEach(v => {
            const match = v.description?.match(/\[Truck:\s*([^\]]+)\]/i);
            if (match) set.add(match[1].toUpperCase().trim());
            else if (v.party_name && (v.party_name.startsWith('HR') || v.party_name.startsWith('DL') || v.party_name.match(/^[A-Z]{2}\s*\d/))) {
                set.add(v.party_name.toUpperCase().trim());
            }
        });
        return Array.from(set).filter(Boolean);
    }, [savedTrucks, lorryReceipts, vouchers]);

    // 2. Compute financial performance for every truck
    const fleetMetrics = useMemo(() => {
        return allTruckNumbers.map(truckNo => {
            const saved = savedTrucks.find(t => t.truckNo.toUpperCase().trim() === truckNo);
            
            // LRs for this truck
            const truckLRs = lorryReceipts.filter(lr => lr.truckNo && lr.truckNo.toUpperCase().trim() === truckNo);
            const totalFreight = truckLRs.reduce((s, lr) => s + (Number(lr.freight) || 0), 0);

            // Expenses for this truck
            const truckExpenses = vouchers.filter(v => {
                const descMatch = v.description && new RegExp(`\\[Truck:\\s*${truckNo}\\]`, 'i').test(v.description);
                const partyMatch = v.party_name && v.party_name.toUpperCase().trim() === truckNo;
                return descMatch || partyMatch;
            });
            const totalExpenses = truckExpenses.reduce((s, v) => s + (Number(v.amount) || 0), 0);

            // Category breakdown
            const catMap: Record<string, number> = {
                'Fuel': 0,
                'Toll': 0,
                'Driver': 0,
                'Maintenance': 0,
                'Tyres': 0,
                'Challan': 0,
                'EMI': 0,
                'Other': 0
            };

            truckExpenses.forEach(v => {
                const desc = (v.description || '').toLowerCase();
                if (/fuel|diesel/i.test(desc)) catMap['Fuel'] += v.amount;
                else if (/toll/i.test(desc)) catMap['Toll'] += v.amount;
                else if (/driver|bhatta|kharcha/i.test(desc)) catMap['Driver'] += v.amount;
                else if (/repair|maintenance|servicing/i.test(desc)) catMap['Maintenance'] += v.amount;
                else if (/tyre|tire/i.test(desc)) catMap['Tyres'] += v.amount;
                else if (/challan|fine/i.test(desc)) catMap['Challan'] += v.amount;
                else if (/emi|finance|loan/i.test(desc)) catMap['EMI'] += v.amount;
                else catMap['Other'] += v.amount;
            });

            const netProfit = totalFreight - totalExpenses;
            const margin = totalFreight > 0 ? (netProfit / totalFreight) * 100 : 0;

            return {
                truckNo,
                make: saved?.make || 'Tata Motors',
                model: saved?.model || 'Heavy Hauler',
                driverName: saved?.driverName || '',
                ownerName: saved?.ownerName || '',
                emiAmount: saved?.emiAmount || 0,
                lrs: truckLRs,
                tripsCount: truckLRs.length,
                totalFreight,
                expenses: truckExpenses,
                totalExpenses,
                catBreakdown: catMap,
                netProfit,
                margin
            };
        }).sort((a, b) => b.netProfit - a.netProfit);
    }, [allTruckNumbers, savedTrucks, lorryReceipts, vouchers]);

    // Selected spotlight truck
    const [selectedTruck, setSelectedTruck] = useState<string>(() => fleetMetrics[0]?.truckNo || '');
    const [searchTruck, setSearchTruck] = useState('');
    const [sortField, setSortField] = useState<'profit' | 'freight' | 'expenses' | 'trips'>('profit');

    const activeTruckData = useMemo(() => {
        return fleetMetrics.find(t => t.truckNo === selectedTruck) || fleetMetrics[0];
    }, [fleetMetrics, selectedTruck]);

    // Fleet Summary Totals
    const totalFleetFreight = fleetMetrics.reduce((s, t) => s + t.totalFreight, 0);
    const totalFleetExpenses = fleetMetrics.reduce((s, t) => s + t.totalExpenses, 0);
    const totalFleetProfit = totalFleetFreight - totalFleetExpenses;
    const avgFleetMargin = totalFleetFreight > 0 ? (totalFleetProfit / totalFleetFreight) * 100 : 0;
    const topTruck = fleetMetrics[0];

    const sortedTrucks = useMemo(() => {
        return [...fleetMetrics]
            .filter(t => t.truckNo.toLowerCase().includes(searchTruck.toLowerCase()) || t.make.toLowerCase().includes(searchTruck.toLowerCase()))
            .sort((a, b) => {
                if (sortField === 'freight') return b.totalFreight - a.totalFreight;
                if (sortField === 'expenses') return b.totalExpenses - a.totalExpenses;
                if (sortField === 'trips') return b.tripsCount - a.tripsCount;
                return b.netProfit - a.netProfit;
            });
    }, [fleetMetrics, searchTruck, sortField]);

    const exportCsv = () => {
        const headers = ['Truck Number', 'Make/Brand', 'Trips Count', 'Freight Earned (₹)', 'Expenses (₹)', 'Net Profit (₹)', 'Margin %'];
        const rows = fleetMetrics.map(t => [
            t.truckNo,
            t.make,
            t.tripsCount,
            t.totalFreight,
            t.totalExpenses,
            t.netProfit,
            `${t.margin.toFixed(1)}%`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Fleet_Profit_Loss_${today()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Fleet Profit & Loss exported to CSV ✅');
    };

    return (
        <div className="space-y-6">
            
            {/* ── Top Fleet KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                    label="Fleet Freight Revenue" 
                    value={fmt(totalFleetFreight)} 
                    sub={`${fleetMetrics.reduce((s, t) => s + t.tripsCount, 0)} Total LRs`} 
                    color="bg-blue-100 text-blue-700" 
                    icon="🚛" 
                />
                <StatCard 
                    label="Fleet Trip Expenses" 
                    value={fmt(totalFleetExpenses)} 
                    sub="Fuel, Toll, Repairs & Drivers" 
                    color="bg-rose-100 text-rose-700" 
                    icon="⛽" 
                />
                <StatCard 
                    label="Fleet Net Operating Profit" 
                    value={fmt(totalFleetProfit)} 
                    sub={`${avgFleetMargin.toFixed(1)}% Fleet Margin`} 
                    color={totalFleetProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} 
                    icon="💰" 
                />
                <StatCard 
                    label="Top Performing Truck" 
                    value={topTruck ? topTruck.truckNo : '—'} 
                    sub={topTruck ? `${fmt(topTruck.netProfit)} profit (${topTruck.tripsCount} trips)` : 'No Data'} 
                    color="bg-amber-100 text-amber-700" 
                    icon="🏆" 
                />
            </div>

            {/* ── Spotlight Selected Truck Card (3D preview & deep P&L) ── */}
            {activeTruckData && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center text-3xl shadow-md">
                                🚛
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <IndianNumberPlate plateNo={activeTruckData.truckNo} size="md" />
                                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                                        {activeTruckData.make} {activeTruckData.model}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                    {activeTruckData.driverName ? `Driver: ${activeTruckData.driverName}` : 'Self Driven'} 
                                    {activeTruckData.ownerName && ` • Owner: ${activeTruckData.ownerName}`}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {onOpenGarage && (
                                <button
                                    onClick={() => onOpenGarage(activeTruckData.truckNo)}
                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>🚛 Inspect in 3D Garage</span>
                                    <span>→</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Financial Scoreboard for Selected Truck */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-center">
                            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">LR Freight Revenue</span>
                            <div className="text-xl sm:text-2xl font-black text-blue-900 mt-1">{fmt(activeTruckData.totalFreight)}</div>
                            <span className="text-[10px] text-blue-600 font-semibold">{activeTruckData.tripsCount} Completed LRs</span>
                        </div>

                        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-center">
                            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Trip Expenses</span>
                            <div className="text-xl sm:text-2xl font-black text-rose-900 mt-1">{fmt(activeTruckData.totalExpenses)}</div>
                            <span className="text-[10px] text-rose-600 font-semibold">{activeTruckData.expenses.length} Expense Entries</span>
                        </div>

                        <div className={`rounded-2xl p-4 text-center border ${activeTruckData.netProfit >= 0 ? 'bg-emerald-50/70 border-emerald-100' : 'bg-red-50/70 border-red-100'}`}>
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTruckData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                Net Profit / Loss
                            </span>
                            <div className={`text-xl sm:text-2xl font-black mt-1 ${activeTruckData.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                                {fmt(activeTruckData.netProfit)}
                            </div>
                            <span className={`text-[10px] font-bold ${activeTruckData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {activeTruckData.margin.toFixed(1)}% Operating Margin
                            </span>
                        </div>

                        <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 text-center">
                            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Avg Freight per Trip</span>
                            <div className="text-xl sm:text-2xl font-black text-purple-900 mt-1">
                                {activeTruckData.tripsCount > 0 ? fmt(Math.round(activeTruckData.totalFreight / activeTruckData.tripsCount)) : '—'}
                            </div>
                            <span className="text-[10px] text-purple-600 font-semibold">Per Trip Average</span>
                        </div>
                    </div>

                    {/* Expense Breakdown by Category */}
                    <div>
                        <div className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3">
                            Expense Categories for {activeTruckData.truckNo}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(Object.entries(activeTruckData.catBreakdown) as [string, number][]).map(([cat, amt]) => {
                                const pct = activeTruckData.totalExpenses > 0 ? (((amt || 0) / activeTruckData.totalExpenses) * 100).toFixed(0) : '0';
                                return (
                                    <div key={cat} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-bold text-gray-700">{cat}</span>
                                            <span className="text-[10px] text-gray-400 font-semibold">{pct}%</span>
                                        </div>
                                        <div className="text-sm font-black text-gray-900">{fmt(amt || 0)}</div>
                                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                            <div 
                                                className="bg-orange-500 h-full rounded-full transition-all" 
                                                style={{ width: `${Math.min(Number(pct), 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── FLEET PROFITABILITY COMPARATIVE TABLE ── */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-black text-gray-900 text-lg">Fleet Profit & Loss Overview</h3>
                        <p className="text-xs text-gray-500">Every truck's trips, freight earned, trip expenses and net margin</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Search truck number..."
                            value={searchTruck}
                            onChange={e => setSearchTruck(e.target.value)}
                            className="p-2 border border-gray-200 rounded-xl text-xs font-bold flex-1 sm:w-44 focus:outline-none focus:border-blue-500"
                        />
                        <select
                            value={sortField}
                            onChange={e => setSortField(e.target.value as any)}
                            className="p-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 focus:outline-none"
                        >
                            <option value="profit">Sort: Net Profit</option>
                            <option value="freight">Sort: Freight Revenue</option>
                            <option value="expenses">Sort: Trip Expenses</option>
                            <option value="trips">Sort: Total Trips</option>
                        </select>
                        <button
                            onClick={exportCsv}
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                            title="Export to CSV"
                        >
                            <span>📥</span>
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Rank</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Truck Number</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Brand & Model</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Trips</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Freight Revenue</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Trip Expenses</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Net Profit / Loss</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Margin</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedTrucks.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-gray-400 font-semibold">
                                        No trucks found matching "{searchTruck}".
                                    </td>
                                </tr>
                            ) : (
                                sortedTrucks.map((truck, idx) => {
                                    const isSelected = truck.truckNo === selectedTruck;
                                    return (
                                        <tr 
                                            key={truck.truckNo} 
                                            onClick={() => setSelectedTruck(truck.truckNo)}
                                            className={`hover:bg-blue-50/40 transition cursor-pointer ${isSelected ? 'bg-blue-50/70' : ''}`}
                                        >
                                            <td className="px-4 py-3 font-bold text-gray-400 text-xs">
                                                #{idx + 1}
                                            </td>
                                            <td className="px-4 py-3 font-mono font-black text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <span>🚛</span>
                                                    <span>{truck.truckNo}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">
                                                <span className="font-bold text-gray-800">{truck.make}</span> {truck.model}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-700">
                                                {truck.tripsCount}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-700">
                                                {fmt(truck.totalFreight)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-rose-600">
                                                {fmt(truck.totalExpenses)}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-black ${truck.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {fmt(truck.netProfit)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${truck.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                    {truck.margin.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {onOpenGarage && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenGarage(truck.truckNo);
                                                        }}
                                                        className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                                    >
                                                        3D Garage 🚛
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

// ─── ADVANCED GST COLLECTION & TAX DASHBOARD ─────────────────────────────────
const GSTCenterTab = ({
    lorryReceipts,
    companyDetails
}: {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGstRate, setSelectedGstRate] = useState<number>(18);
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 2);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(today());

    // Invoiced LRs calculation
    const invoicedLRs = useMemo(() => {
        return lorryReceipts.filter(lr => lr.isInvoiceGenerated && lr.invoiceNo);
    }, [lorryReceipts]);

    const gstRows = useMemo(() => {
        return invoicedLRs.map(lr => {
            const taxable = Number(lr.freight) || 0;
            // Standard Transport/Logistics invoice GST rate is 18% (9% CGST + 9% SGST / 18% IGST)
            const rate = selectedGstRate;
            // Check if intra-state or inter-state
            const isInterstate = lr.fromPlace && lr.toPlace && lr.fromPlace.split(',')[0].trim().toLowerCase() !== lr.toPlace.split(',')[0].trim().toLowerCase();
            
            let cgst = 0;
            let sgst = 0;
            let igst = 0;

            if (isInterstate) {
                igst = (taxable * rate) / 100;
            } else {
                cgst = (taxable * (rate / 2)) / 100;
                sgst = (taxable * (rate / 2)) / 100;
            }

            const totalGst = cgst + sgst + igst;
            const invoiceTotal = taxable + totalGst;

            return {
                invoiceNo: lr.invoiceNo,
                invoiceDate: lr.invoiceDate || lr.date,
                lrNo: lr.lrNo,
                party: lr.billingTo?.name || lr.consignor?.name || 'Party',
                partyGst: lr.billingTo?.gstin || lr.consignor?.gstin || 'Unregistered',
                from: lr.fromPlace,
                to: lr.toPlace,
                taxable,
                rate,
                cgst,
                sgst,
                igst,
                totalGst,
                invoiceTotal,
                isInterstate
            };
        });
    }, [invoicedLRs, selectedGstRate]);

    // Filter by date & search
    const filteredRows = useMemo(() => {
        return gstRows.filter(r => {
            if (fromDate && r.invoiceDate && r.invoiceDate < fromDate) return false;
            if (toDate && r.invoiceDate && r.invoiceDate > toDate) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchInv = r.invoiceNo?.toLowerCase().includes(q);
                const matchParty = r.party?.toLowerCase().includes(q);
                const matchGst = r.partyGst?.toLowerCase().includes(q);
                if (!matchInv && !matchParty && !matchGst) return false;
            }
            return true;
        });
    }, [gstRows, fromDate, toDate, searchQuery]);

    // Summary Totals
    const totalTaxable = filteredRows.reduce((s, r) => s + r.taxable, 0);
    const totalCGST = filteredRows.reduce((s, r) => s + r.cgst, 0);
    const totalSGST = filteredRows.reduce((s, r) => s + r.sgst, 0);
    const totalIGST = filteredRows.reduce((s, r) => s + r.igst, 0);
    const totalGST = totalCGST + totalSGST + totalIGST;
    const totalInvoiceValue = totalTaxable + totalGST;

    const exportGstCsv = () => {
        const headers = ['Invoice No', 'Date', 'LR No', 'Party Name', 'Party GSTIN', 'Taxable Freight (₹)', 'Rate %', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total GST (₹)', 'Invoice Value (₹)'];
        const rows = filteredRows.map(r => [
            r.invoiceNo,
            r.invoiceDate,
            r.lrNo,
            `"${r.party}"`,
            r.partyGst,
            r.taxable,
            `${r.rate}%`,
            r.cgst,
            r.sgst,
            r.igst,
            r.totalGst,
            r.invoiceTotal
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `GST_Collection_Report_${today()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('GST Collection Report exported to CSV ✅');
    };

    return (
        <div className="space-y-6">
            
            {/* ── Top GST Metric Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                    label="Total GST Collected" 
                    value={fmt(totalGST)} 
                    sub={`${filteredRows.length} Invoices Filed (${selectedGstRate}% Rate)`} 
                    color="bg-emerald-100 text-emerald-700" 
                    icon="🏛️" 
                />
                <StatCard 
                    label={`CGST Collected (@${(selectedGstRate / 2).toFixed(1)}%)`} 
                    value={fmt(totalCGST)} 
                    sub="Central GST Pool" 
                    color="bg-blue-100 text-blue-700" 
                    icon="📊" 
                />
                <StatCard 
                    label={`SGST Collected (@${(selectedGstRate / 2).toFixed(1)}%)`} 
                    value={fmt(totalSGST)} 
                    sub="State GST Pool" 
                    color="bg-indigo-100 text-indigo-700" 
                    icon="📈" 
                />
                <StatCard 
                    label={`IGST Collected (@${selectedGstRate.toFixed(1)}%)`} 
                    value={fmt(totalIGST)} 
                    sub="Inter-state Transport" 
                    color="bg-purple-100 text-purple-700" 
                    icon="🌐" 
                />
            </div>

            {/* ── Secondary Summary Tiles ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">TAXABLE TURNOVER</span>
                    <div className="text-2xl font-black text-gray-900 mt-1">{fmt(totalTaxable)}</div>
                    <span className="text-xs text-gray-400 font-medium">Total freight base value before tax</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">TOTAL INVOICE VALUE</span>
                    <div className="text-2xl font-black text-blue-800 mt-1">{fmt(totalInvoiceValue)}</div>
                    <span className="text-xs text-gray-400 font-medium">Grand gross billed including tax</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">COMPANY GSTIN</span>
                    <div className="text-lg font-mono font-black text-slate-800 mt-1">{companyDetails.gstn || 'NOT SPECIFIED'}</div>
                    <span className="text-xs text-gray-400 font-medium">PAN: {companyDetails.pan || '—'}</span>
                </div>
            </div>

            {/* ── GST Schedule Table (GSTR-1 Ready) ── */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-black text-gray-900 text-lg">GST Filing Schedule (GSTR-1)</h3>
                        <p className="text-xs text-gray-500">Period: {fromDate} to {toDate} • Detailed itemized tax breakdown</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 shadow-2xs">
                            <span className="text-[11px] font-black text-emerald-950 uppercase">GST Rate:</span>
                            <span className="text-xs font-black text-emerald-700">18% (9% CGST + 9% SGST / 18% IGST)</span>
                        </div>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="p-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="p-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50"
                        />
                        <input
                            type="text"
                            placeholder="Search party or invoice..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="p-2 border border-gray-200 rounded-xl text-xs font-bold flex-1 sm:w-44 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={exportGstCsv}
                            className="p-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        >
                            <span>📥</span>
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Invoice No</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Party Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Party GSTIN</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Taxable (₹)</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">CGST (₹)</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">SGST (₹)</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">IGST (₹)</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total GST (₹)</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Invoice Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-12 text-gray-400 font-semibold">
                                        No invoices found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map(r => (
                                    <tr key={r.invoiceNo + r.lrNo} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-mono font-bold text-blue-700">
                                            {r.invoiceNo}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                            {r.invoiceDate}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-900 truncate max-w-[160px]">
                                            {r.party}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                            {r.partyGst}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                            {fmt(r.taxable)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-blue-700">
                                            {fmt(r.cgst)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                                            {fmt(r.sgst)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-purple-700">
                                            {fmt(r.igst)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                                            {fmt(r.totalGst)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-gray-900">
                                            {fmt(r.invoiceTotal)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50 font-black text-gray-900">
                                <td colSpan={4} className="px-4 py-3 uppercase text-xs">TOTALS ({filteredRows.length} INVOICES)</td>
                                <td className="px-4 py-3 text-right text-blue-900">{fmt(totalTaxable)}</td>
                                <td className="px-4 py-3 text-right text-blue-900">{fmt(totalCGST)}</td>
                                <td className="px-4 py-3 text-right text-indigo-900">{fmt(totalSGST)}</td>
                                <td className="px-4 py-3 text-right text-purple-900">{fmt(totalIGST)}</td>
                                <td className="px-4 py-3 text-right text-emerald-900">{fmt(totalGST)}</td>
                                <td className="px-4 py-3 text-right text-slate-950">{fmt(totalInvoiceValue)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AccountingView: React.FC<AccountingViewProps> = ({ 
    lorryReceipts, 
    companyDetails, 
    savedParties, 
    savedTrucks = [],
    onBack,
    onOpenGarage
}) => {
    const [activeTab, setActiveTab] = useState<AccTab>('overview');
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [payments, setPayments] = useState<PaymentReceipt[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [les, vs, ps] = await Promise.all([
                getLedgerEntries(),
                getVouchers(),
                getPaymentReceipts().catch(() => []) // graceful fallback if table doesn't exist yet
            ]);
            setLedgerEntries(les);
            setVouchers(vs);
            setPayments(ps);
        } catch (e: any) {
            console.error('Accounting data load error:', e);
            toast.error('Error loading accounting data: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const TABS: { id: AccTab; label: string; icon: string; badge?: string }[] = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'truck-pnl', label: 'Truck P&L', icon: '🚛', badge: 'PROFIT' },
        { id: 'gst', label: 'GST Collection', icon: '🏛️', badge: 'TAX' },
        { id: 'ledger', label: 'Ledger', icon: '📒' },
        { id: 'invoices', label: 'Invoices', icon: '🧾' },
        { id: 'payments', label: 'Payments', icon: '💰' },
        { id: 'expenses', label: 'Expenses', icon: '💸' },
        { id: 'reports', label: 'Reports', icon: '📈' },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center gap-4 py-3">
                        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition font-semibold text-sm cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back
                        </button>
                        <div className="h-5 w-px bg-gray-300" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-black text-sm">₹</div>
                            <div>
                                <div className="font-black text-gray-800 leading-tight">Advanced Accounting</div>
                                <div className="text-xs text-gray-500 leading-tight">{companyDetails.name || 'Your Company'}</div>
                            </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            {onOpenGarage && (
                                <button
                                    onClick={() => onOpenGarage()}
                                    className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg font-bold hover:bg-blue-600 transition cursor-pointer flex items-center gap-1.5"
                                >
                                    <span>🚛 Truck Garage</span>
                                </button>
                            )}
                            <button onClick={loadData} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition cursor-pointer">
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <div className="font-semibold">Loading accounting data...</div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && <OverviewTab lorryReceipts={lorryReceipts} vouchers={vouchers} payments={payments} ledgerEntries={ledgerEntries} />}
                        {activeTab === 'truck-pnl' && <TruckPnlTab lorryReceipts={lorryReceipts} vouchers={vouchers} savedTrucks={savedTrucks} onOpenGarage={onOpenGarage} />}
                        {activeTab === 'gst' && <GSTCenterTab lorryReceipts={lorryReceipts} companyDetails={companyDetails} />}
                        {activeTab === 'ledger' && <LedgerTab lorryReceipts={lorryReceipts} ledgerEntries={ledgerEntries} payments={payments} onRefresh={loadData} />}
                        {activeTab === 'invoices' && <InvoicesTab lorryReceipts={lorryReceipts} payments={payments} />}
                        {activeTab === 'payments' && <PaymentsTab payments={payments} lorryReceipts={lorryReceipts} onRefresh={loadData} />}
                        {activeTab === 'expenses' && <ExpensesTab vouchers={vouchers} lorryReceipts={lorryReceipts} savedTrucks={savedTrucks} onRefresh={loadData} />}
                        {activeTab === 'reports' && <ReportsTab lorryReceipts={lorryReceipts} vouchers={vouchers} payments={payments} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default AccountingView;
