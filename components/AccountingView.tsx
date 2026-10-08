import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LorryReceipt, CompanyDetails, SavedParty, LedgerEntry, Voucher, PaymentReceipt } from '../types';
import {
    getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
    getVouchers, addVoucher, updateVoucher,
    getPaymentReceipts, savePaymentReceipt, deletePaymentReceipt
} from '../services/supabaseService';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccountingViewProps {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    savedParties: SavedParty[];
    onBack: () => void;
}

type AccTab = 'overview' | 'ledger' | 'invoices' | 'payments' | 'expenses' | 'reports';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const today = () => new Date().toISOString().split('T')[0];
const parseDate = (d: string) => new Date(d);

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
    const totalExpenses = vouchers.reduce((s, v) => s + v.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // Chart data — last 6 months
    const chartData = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const label = MONTHS[d.getMonth()];
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const revenue = invoicedLRs.filter(lr => lr.date?.startsWith(monthStr)).reduce((s, lr) => s + (lr.freight || 0), 0);
            const expenses = vouchers.filter(v => v.date?.startsWith(monthStr)).reduce((s, v) => s + v.amount, 0);
            return { month: label, revenue, expenses };
        });
    }, [invoicedLRs, vouchers]);

    // Recent transactions
    const recentTx = useMemo(() => {
        const txs: { date: string; label: string; amount: number; type: 'credit' | 'debit' }[] = [];
        payments.slice(0, 5).forEach(p => txs.push({ date: p.date, label: `Received from ${p.party_name}`, amount: p.amount, type: 'credit' }));
        vouchers.slice(0, 5).forEach(v => txs.push({ date: v.date, label: v.description, amount: v.amount, type: 'debit' }));
        return txs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    }, [payments, vouchers]);

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
                            { label: 'Expense Count', value: `${vouchers.length}`, color: 'text-red-600' },
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
        return Object.entries(invoicedLRs).map(([invoiceNo, lrs]) => {
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
                {Object.entries(aging).map(([bucket, amount]) => (
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
                            <select multiple value={form.invoice_nos || []} onChange={e => setForm(f => ({ ...f, invoice_nos: Array.from(e.target.selectedOptions, o => o.value) }))}
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
const ExpensesTab = ({ vouchers, lorryReceipts, onRefresh }: {
    vouchers: Voucher[];
    lorryReceipts: LorryReceipt[];
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

    // ── General form state ──────────────────────────────────────────────────────
    const [genForm, setGenForm] = useState<Partial<Voucher>>({
        date: today(), description: '', amount: 0, payment_mode: 'Cash',
        voucher_no: `EXP-${Date.now().toString().slice(-6)}`, party_name: ''
    });
    const [genSaving, setGenSaving] = useState(false);
    const [filterCat, setFilterCat] = useState('All');

    const GEN_CATEGORIES = ['All', 'Fuel', 'Toll', 'Driver Payment', 'Hamali', 'Maintenance', 'Commission', 'Office', 'Other'];

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
        ? vouchers
        : vouchers.filter(v =>
            v.description?.toLowerCase().includes(filterCat.toLowerCase()) ||
            v.party_name?.toLowerCase().includes(filterCat.toLowerCase()));

    const totalExpAll      = vouchers.reduce((s, v) => s + v.amount, 0);
    const totalExpFiltered = filtered.reduce((s, v) => s + v.amount, 0);
    const truckExpTotal    = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const breakdown = GEN_CATEGORIES.slice(1).map(cat => ({
        cat,
        total: vouchers.filter(v => v.description?.toLowerCase().includes(cat.toLowerCase())).reduce((s, v) => s + v.amount, 0)
    })).filter(b => b.total > 0);

    // Expenses grouped by truck
    const byTruck = useMemo(() => {
        const map: Record<string, { amount: number; count: number }> = {};
        vouchers.forEach(v => {
            const match = v.description?.match(/\[Truck:\s*([^\]]+)\]/);
            const key = match ? match[1] : '(General)';
            if (!map[key]) map[key] = { amount: 0, count: 0 };
            map[key].amount += v.amount;
            map[key].count  += 1;
        });
        return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
    }, [vouchers]);

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

            {/* ── Top Row ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3 flex-wrap">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
                        <div className="text-xs text-gray-500 font-bold">TOTAL EXPENSES</div>
                        <div className="text-xl font-black text-red-600">{fmt(totalExpAll)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
                        <div className="text-xs text-gray-500 font-bold">VOUCHERS</div>
                        <div className="text-xl font-black text-orange-600">{vouchers.length}</div>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
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
                                {['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'NEFT', 'RTGS'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Expense category grid */}
                    <div>
                        <div className="text-xs font-black text-orange-700 mb-3 uppercase tracking-wider">
                            💰 Expense Categories — Jo bhi hua daalo (0 wale skip ho jaayenge)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {TRUCK_EXPENSE_CATEGORIES.map((cat, idx) => (
                                <div key={cat.key}
                                    className={`bg-white rounded-xl border p-3 transition-all ${Number(expenses[idx].amount) > 0 ? 'border-orange-400 shadow-md' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-base">{cat.icon}</span>
                                        <span className="text-sm font-bold text-gray-700">{cat.label}</span>
                                        {Number(expenses[idx].amount) > 0 && (
                                            <span className="ml-auto text-xs font-black text-orange-600">
                                                ₹{Number(expenses[idx].amount).toLocaleString('en-IN')}
                                            </span>
                                        )}
                                    </div>
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
                                {['Date', 'Voucher No', 'Description', 'Truck / Vendor', 'Mode', 'Amount'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No expenses recorded</td></tr>
                            ) : filtered.map((v, i) => {
                                const isTruck = v.description?.includes('[Truck:');
                                return (
                                    <tr key={v.id || i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">{v.date}</td>
                                        <td className="px-4 py-3 font-bold text-red-700">{v.voucher_no}</td>
                                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={v.description}>
                                            {isTruck && <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded mr-1">🚛</span>}
                                            {v.description?.replace(/\[Truck:[^\]]+\]\s*/, '')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{v.party_name || '—'}</td>
                                        <td className="px-4 py-3"><Badge color="bg-gray-100 text-gray-600">{v.payment_mode}</Badge></td>
                                        <td className="px-4 py-3 font-black text-red-600 whitespace-nowrap">{fmt(v.amount)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td colSpan={5} className="px-4 py-3 font-black text-gray-700">TOTAL ({filtered.length} entries)</td>
                                    <td className="px-4 py-3 font-black text-red-700">{fmt(totalExpFiltered)}</td>
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
        vouchers.filter(v => v.date >= fromDate && v.date <= toDate), [vouchers, fromDate, toDate]);
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

    // GST Summary from LRs
    const gstSummary = useMemo(() => {
        return filteredLRs.reduce((acc, lr) => {
            const taxable = lr.freight || 0;
            const cgst = (taxable * 2.5) / 100;
            const sgst = (taxable * 2.5) / 100;
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
                    <p className="text-sm text-gray-500 mb-6">Period: {fromDate} to {toDate} | Based on freight invoices (CGST 2.5% + SGST 2.5%)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Taxable Value', value: fmt(gstSummary.taxable), color: 'text-blue-700' },
                            { label: 'CGST @2.5%', value: fmt(gstSummary.cgst), color: 'text-purple-700' },
                            { label: 'SGST @2.5%', value: fmt(gstSummary.sgst), color: 'text-indigo-700' },
                            { label: 'Total GST', value: fmt(gstSummary.cgst + gstSummary.sgst), color: 'text-green-700' },
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
                                {['Invoice No', 'LR No', 'Date', 'Party', 'Taxable', 'CGST', 'SGST', 'Total'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLRs.map(lr => {
                                    const taxable = lr.freight || 0;
                                    const cgst = (taxable * 2.5) / 100;
                                    const sgst = (taxable * 2.5) / 100;
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AccountingView: React.FC<AccountingViewProps> = ({ lorryReceipts, companyDetails, savedParties, onBack }) => {
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

    const TABS: { id: AccTab; label: string; icon: string }[] = [
        { id: 'overview', label: 'Overview', icon: '📊' },
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
                        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition font-semibold text-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back
                        </button>
                        <div className="h-5 w-px bg-gray-300" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-black text-sm">₹</div>
                            <div>
                                <div className="font-black text-gray-800 leading-tight">Accounting</div>
                                <div className="text-xs text-gray-500 leading-tight">{companyDetails.name || 'Your Company'}</div>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <button onClick={loadData} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition">
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
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
                        {activeTab === 'ledger' && <LedgerTab lorryReceipts={lorryReceipts} ledgerEntries={ledgerEntries} payments={payments} onRefresh={loadData} />}
                        {activeTab === 'invoices' && <InvoicesTab lorryReceipts={lorryReceipts} payments={payments} />}
                        {activeTab === 'payments' && <PaymentsTab payments={payments} lorryReceipts={lorryReceipts} onRefresh={loadData} />}
                        {activeTab === 'expenses' && <ExpensesTab vouchers={vouchers} lorryReceipts={lorryReceipts} onRefresh={loadData} />}
                        {activeTab === 'reports' && <ReportsTab lorryReceipts={lorryReceipts} vouchers={vouchers} payments={payments} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default AccountingView;
