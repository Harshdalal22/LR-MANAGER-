
import React, { useMemo, useState } from 'react';
import { LorryReceipt, CompanyDetails } from '../types';
import { SearchIcon, InvoiceIcon, PlusIcon, XIcon, CheckCircleIcon, FilterIcon, ArrowLeftIcon, SaveIcon } from './icons';
import InvoiceModal from './InvoiceModal';

// Edit / Pencil icon inline since it may not be in icons.tsx
const EditIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

interface InvoiceListProps {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    onBack: () => void;
    onUpdateInvoiceDetails?: (lrNos: string[], invoiceNo: string, invoiceDate: string) => Promise<void>;
    onRemoveLRsFromInvoice?: (lrNos: string[]) => Promise<void>;
}

const InvoiceList: React.FC<InvoiceListProps> = ({
    lorryReceipts,
    companyDetails,
    onBack,
    onUpdateInvoiceDetails,
    onRemoveLRsFromInvoice,
}) => {
    // ── Main list state ──
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<'number-asc' | 'number-desc' | 'date-asc' | 'date-desc'>('number-asc');

    // ── New Invoice Wizard state ──
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedPartyName, setSelectedPartyName] = useState('');
    const [selectedLRs, setSelectedLRs] = useState<Set<string>>(new Set());
    const [showAllLRs, setShowAllLRs] = useState(false);
    const [showGenerationModal, setShowGenerationModal] = useState(false);

    // ── View / Print modal state ──
    const [selectedInvoice, setSelectedInvoice] = useState<{ invoiceNo: string; lrs: LorryReceipt[] } | null>(null);

    // ── Edit Invoice state ──
    const [editingInvoice, setEditingInvoice] = useState<{ invoiceNo: string; lrs: LorryReceipt[] } | null>(null);
    const [editBillNo, setEditBillNo] = useState('');
    const [editBillDate, setEditBillDate] = useState('');
    const [removingLrNos, setRemovingLrNos] = useState<Set<string>>(new Set());
    const [addingLrNos, setAddingLrNos] = useState<Set<string>>(new Set());
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [showAddMore, setShowAddMore] = useState(false);
    const [editAddParty, setEditAddParty] = useState(''); // party selector in Add More LRs

    // ── Computed: generated invoices grouped ──
    const generatedInvoices = useMemo(() => {
        const groups: { [key: string]: LorryReceipt[] } = {};
        lorryReceipts.forEach(lr => {
            if (lr.isInvoiceGenerated && lr.invoiceNo) {
                if (!groups[lr.invoiceNo]) groups[lr.invoiceNo] = [];
                groups[lr.invoiceNo].push(lr);
            }
        });

        return Object.keys(groups).map(invoiceNo => {
            const lrs = groups[invoiceNo];
            const firstLR = lrs[0];
            const date = firstLR.invoiceDate || firstLR.date;
            const customer = firstLR.billingTo?.name || firstLR.consignor.name;
            const totalAmount = lrs.reduce((sum, lr) => {
                const charges = Object.values(lr.charges || {}).reduce((a: number, b: any) => {
                    const n = Number(b);
                    return a + (isFinite(n) ? n : 0);
                }, 0);
                return sum + (Number(lr.freight) || 0) + charges;
            }, 0);
            return { invoiceNo, date, customer, count: lrs.length, totalAmount, lrs };
        }).sort((a, b) => {
            switch (sortOption) {
                case 'number-asc': return a.invoiceNo.localeCompare(b.invoiceNo, undefined, { numeric: true, sensitivity: 'base' });
                case 'number-desc': return b.invoiceNo.localeCompare(a.invoiceNo, undefined, { numeric: true, sensitivity: 'base' });
                case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
                default: return 0;
            }
        });
    }, [lorryReceipts, sortOption]);

    // ── Computed: all party names ──
    const allParties = useMemo(() => {
        const names = new Set<string>();
        lorryReceipts.forEach(lr => {
            if (lr.consignor.name) names.add(lr.consignor.name);
            if (lr.consignee.name) names.add(lr.consignee.name);
            if (lr.billingTo?.name) names.add(lr.billingTo.name);
        });
        return Array.from(names).sort();
    }, [lorryReceipts]);

    // ── Computed: LRs for new invoice wizard ──
    const pendingLRsForParty = useMemo(() => {
        if (!selectedPartyName) return [];
        return lorryReceipts.filter(lr =>
            (showAllLRs || !lr.isInvoiceGenerated) &&
            (lr.consignor.name === selectedPartyName ||
                lr.consignee.name === selectedPartyName ||
                lr.billingTo?.name === selectedPartyName)
        );
    }, [lorryReceipts, selectedPartyName, showAllLRs]);

    // ── Computed: LRs available to add when editing (filtered by editAddParty) ──
    const availableLRsToAdd = useMemo(() => {
        if (!editingInvoice) return [];
        const currentLrNos = new Set(editingInvoice.lrs.map(lr => lr.lrNo));
        const filterParty = editAddParty; // user-selected party in Add More section
        if (!filterParty) return [];
        return lorryReceipts.filter(lr =>
            !currentLrNos.has(lr.lrNo) &&
            (lr.consignor.name === filterParty ||
                lr.consignee.name === filterParty ||
                lr.billingTo?.name === filterParty)
        );
    }, [editingInvoice, lorryReceipts, editAddParty]);

    // ── Filtered invoices for search ──
    const filteredInvoices = generatedInvoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Handlers: Wizard ──
    const handleSelectLR = (lrNo: string) => {
        const newSelected = new Set(selectedLRs);
        if (newSelected.has(lrNo)) newSelected.delete(lrNo); else newSelected.add(lrNo);
        setSelectedLRs(newSelected);
    };

    const handleStartGeneration = () => { if (selectedLRs.size > 0) setShowGenerationModal(true); };

    const closeWizard = () => { setIsWizardOpen(false); setSelectedPartyName(''); setSelectedLRs(new Set()); setShowAllLRs(false); };

    // ── Handlers: Edit Invoice ──
    const handleStartEdit = (inv: { invoiceNo: string; lrs: LorryReceipt[] }) => {
        closeWizard();
        setEditingInvoice(inv);
        setEditBillNo(inv.lrs[0]?.invoiceNo || inv.invoiceNo);
        const rawDate = inv.lrs[0]?.invoiceDate;
        setEditBillDate(rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setRemovingLrNos(new Set());
        setAddingLrNos(new Set());
        setShowAddMore(false);
        // Default add-party to the invoice's own party
        const defaultParty =
            inv.lrs[0]?.billingTo?.name ||
            inv.lrs[0]?.consignor?.name || '';
        setEditAddParty(defaultParty);
    };

    const toggleRemoveLR = (lrNo: string) => {
        setRemovingLrNos(prev => {
            const next = new Set(prev);
            if (next.has(lrNo)) next.delete(lrNo); else next.add(lrNo);
            return next;
        });
    };

    const toggleAddLR = (lrNo: string) => {
        setAddingLrNos(prev => {
            const next = new Set(prev);
            if (next.has(lrNo)) next.delete(lrNo); else next.add(lrNo);
            return next;
        });
    };

    const handleSaveEdit = async () => {
        if (!editingInvoice) return;
        setIsSavingEdit(true);
        try {
            // 1. Remove marked LRs
            if (removingLrNos.size > 0 && onRemoveLRsFromInvoice) {
                await onRemoveLRsFromInvoice(Array.from(removingLrNos));
            }
            // 2. Update remaining + added LRs with new invoice number/date
            const remainingLrNos = editingInvoice.lrs
                .filter(lr => !removingLrNos.has(lr.lrNo))
                .map(lr => lr.lrNo);
            const allLrNos = [...remainingLrNos, ...Array.from(addingLrNos)];
            if (allLrNos.length > 0 && onUpdateInvoiceDetails) {
                await onUpdateInvoiceDetails(allLrNos, editBillNo, editBillDate);
            }
            setEditingInvoice(null);
        } catch {
            // handled in parent via toast
        } finally {
            setIsSavingEdit(false);
        }
    };

    // ── Derived edit summary ──
    const editKeptCount = editingInvoice
        ? editingInvoice.lrs.filter(lr => !removingLrNos.has(lr.lrNo)).length + addingLrNos.size
        : 0;

    // ════════════════════════════════════════════════
    return (
        <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-lg min-h-[500px]">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex items-center gap-4 self-start">
                        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-all group" title="Back">
                            <ArrowLeftIcon className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <h2 className="text-2xl font-bold text-ssk-blue">Invoices</h2>
                    </div>
                    {!isWizardOpen && !editingInvoice && (
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="flex items-center gap-2 bg-ssk-blue text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-md font-bold"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Generate New Invoice
                        </button>
                    )}
                </div>

                {/* ══════════════════════════════════════════════ */}
                {/* ── EDIT INVOICE PANEL ── */}
                {/* ══════════════════════════════════════════════ */}
                {editingInvoice && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 md:p-6 mb-6 animate-fadeIn">
                        {/* Edit Header */}
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
                            <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                                <EditIcon className="w-6 h-6" />
                                Edit Invoice — {editingInvoice.invoiceNo}
                            </h3>
                            <button
                                onClick={() => setEditingInvoice(null)}
                                className="p-1 hover:bg-amber-100 rounded-full text-amber-900"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Invoice No & Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Invoice No.</label>
                                <input
                                    type="text"
                                    value={editBillNo}
                                    onChange={e => setEditBillNo(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-gray-800 focus:ring-2 focus:ring-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Invoice Date</label>
                                <input
                                    type="date"
                                    value={editBillDate}
                                    onChange={e => setEditBillDate(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-amber-400"
                                />
                            </div>
                        </div>

                        {/* Current LRs in this Invoice */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-amber-800 uppercase mb-2">
                                Current LRs in Invoice ({editingInvoice.lrs.length})
                            </label>
                            <div className="bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm max-h-[260px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-amber-100 text-amber-900 text-[10px] uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="p-3">LR No.</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Truck</th>
                                            <th className="p-3">Route</th>
                                            <th className="p-3 text-right">Freight</th>
                                            <th className="p-3 text-center">Remove</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {editingInvoice.lrs.map(lr => (
                                            <tr
                                                key={lr.lrNo}
                                                className={`transition-colors ${removingLrNos.has(lr.lrNo) ? 'bg-red-50 opacity-60' : 'hover:bg-amber-50'}`}
                                            >
                                                <td className="p-3 font-bold text-blue-700">{lr.lrNo}</td>
                                                <td className="p-3">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                                <td className="p-3 font-mono text-xs">{lr.truckNo}</td>
                                                <td className="p-3 text-xs">{lr.fromPlace} → {lr.toPlace}</td>
                                                <td className="p-3 text-right font-semibold">₹{lr.freight}</td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => toggleRemoveLR(lr.lrNo)}
                                                        title={removingLrNos.has(lr.lrNo) ? 'Undo remove' : 'Remove from invoice'}
                                                        className={`p-1.5 rounded-full transition-colors ${removingLrNos.has(lr.lrNo)
                                                            ? 'bg-red-200 text-red-700 hover:bg-red-300'
                                                            : 'text-red-500 hover:bg-red-100'}`}
                                                    >
                                                        {removingLrNos.has(lr.lrNo)
                                                            ? <span className="text-[10px] font-bold px-1">UNDO</span>
                                                            : <TrashIcon className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {removingLrNos.size > 0 && (
                                <p className="mt-1 text-xs text-red-600 font-semibold">
                                    ⚠️ {removingLrNos.size} LR(s) invoice se remove ho jayengi save karne par.
                                </p>
                            )}
                        </div>

                        {/* Add More LRs section */}
                        <div className="mb-5">
                            <button
                                onClick={() => setShowAddMore(prev => !prev)}
                                className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase mb-2 hover:text-amber-900 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {showAddMore ? 'Collapse — Add More LRs' : 'Expand — Add More LRs'}&nbsp;
                                ({availableLRsToAdd.length} available)
                            </button>

                            {showAddMore && (
                                <>
                                    {/* Party Selector for Add More */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Party Select karo (Jis party ke LR add karne hain)</label>
                                        <select
                                            value={editAddParty}
                                            onChange={e => { setEditAddParty(e.target.value); setAddingLrNos(new Set()); }}
                                            className="w-full sm:w-72 p-2 bg-white border border-amber-300 rounded-lg font-semibold text-gray-800 focus:ring-2 focus:ring-amber-400 text-sm"
                                        >
                                            <option value="">-- Party Select Karo --</option>
                                            {allParties.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                <div className="bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm max-h-[220px] overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-green-50 text-green-900 text-[10px] uppercase font-bold sticky top-0">
                                            <tr>
                                                <th className="p-3 w-10">Add</th>
                                                <th className="p-3">LR No.</th>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Truck</th>
                                                <th className="p-3">Route</th>
                                                <th className="p-3 text-right">Freight</th>
                                                <th className="p-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {availableLRsToAdd.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-6 text-center text-gray-400 italic text-xs">
                                                        Is party ke aur LR nahi hain.
                                                    </td>
                                                </tr>
                                            ) : (
                                                availableLRsToAdd.map(lr => (
                                                    <tr
                                                        key={lr.lrNo}
                                                        className={`cursor-pointer transition-colors ${addingLrNos.has(lr.lrNo) ? 'bg-green-50' : 'hover:bg-green-50'}`}
                                                        onClick={() => toggleAddLR(lr.lrNo)}
                                                    >
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={addingLrNos.has(lr.lrNo)}
                                                                onChange={() => {}}
                                                                className="w-4 h-4 text-green-600 rounded"
                                                            />
                                                        </td>
                                                        <td className="p-3 font-bold text-blue-700">
                                                            {lr.lrNo}
                                                        </td>
                                                        <td className="p-3">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                                        <td className="p-3 font-mono text-xs">{lr.truckNo}</td>
                                                        <td className="p-3 text-xs">{lr.fromPlace} → {lr.toPlace}</td>
                                                        <td className="p-3 text-right font-semibold">₹{lr.freight}</td>
                                                        <td className="p-3 text-center">
                                                            {lr.isInvoiceGenerated
                                                                ? <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">Invoiced #{lr.invoiceNo}</span>
                                                                : <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">Pending</span>}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    </div>
                                </>
                            )}
                            {addingLrNos.size > 0 && (
                                <p className="mt-1 text-xs text-green-700 font-semibold">
                                    ✅ {addingLrNos.size} LR(s) is invoice mein add hongi.
                                </p>
                            )}
                        </div>

                        {/* Edit Actions */}
                        <div className="flex flex-wrap justify-between items-center gap-3 border-t border-amber-200 pt-4">
                            <div className="text-sm font-bold text-amber-900">
                                Final LRs in Invoice: <span className="text-blue-700 text-base">{editKeptCount}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditingInvoice(null)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingEdit || editKeptCount === 0}
                                    className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition-all"
                                >
                                    <SaveIcon className="w-5 h-5" />
                                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                                {/* Also View/Print after editing */}
                                <button
                                    onClick={() => setSelectedInvoice({ invoiceNo: editingInvoice.invoiceNo, lrs: editingInvoice.lrs })}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow-md transition-all"
                                >
                                    <InvoiceIcon className="w-5 h-5" />
                                    Preview
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* ── NEW INVOICE WIZARD ── */}
                {/* ══════════════════════════════════════════════ */}
                {isWizardOpen && !editingInvoice && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                                <InvoiceIcon className="w-6 h-6" />
                                New Invoice Wizard
                            </h3>
                            <button onClick={closeWizard} className="p-1 hover:bg-blue-100 rounded-full text-blue-900">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Step 1 */}
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-blue-700 uppercase mb-2">1. Select Party</label>
                                <select
                                    value={selectedPartyName}
                                    onChange={e => { setSelectedPartyName(e.target.value); setSelectedLRs(new Set()); }}
                                    className="w-full p-3 bg-white border border-blue-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
                                >
                                    <option value="">-- Choose Party --</option>
                                    {allParties.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                                <p className="mt-2 text-[10px] text-blue-600 font-medium italic">Shows all parties</p>
                            </div>

                            {/* Step 2 */}
                            <div className="md:col-span-3">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-blue-700 uppercase">2. Select LRs ({pendingLRsForParty.length})</label>
                                    <label className="flex items-center gap-2 text-xs text-blue-700 cursor-pointer font-semibold">
                                        <input type="checkbox" checked={showAllLRs} onChange={e => setShowAllLRs(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                        Already Invoiced LRs bhi dikhao
                                    </label>
                                </div>
                                <div className="bg-white border border-blue-200 rounded-lg overflow-hidden shadow-sm max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold sticky top-0">
                                            <tr>
                                                <th className="p-3 w-10">Select</th>
                                                <th className="p-3">LR No</th>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Truck</th>
                                                <th className="p-3">Route</th>
                                                <th className="p-3 text-right">Freight</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {pendingLRsForParty.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                                                        {selectedPartyName
                                                            ? (showAllLRs ? 'Is party ke liye koi LR nahi mili.' : "Koi pending LR nahi. 'Already Invoiced LRs bhi dikhao' check karein.")
                                                            : 'Pehle party select karein.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                pendingLRsForParty.map(lr => (
                                                    <tr
                                                        key={lr.lrNo}
                                                        className={`hover:bg-blue-50 cursor-pointer ${selectedLRs.has(lr.lrNo) ? 'bg-blue-50' : ''}`}
                                                        onClick={() => handleSelectLR(lr.lrNo)}
                                                    >
                                                        <td className="p-3 text-center">
                                                            <input type="checkbox" checked={selectedLRs.has(lr.lrNo)} onChange={() => {}} className="w-4 h-4 text-blue-600 rounded" />
                                                        </td>
                                                        <td className="p-3 font-bold">
                                                            {lr.lrNo}
                                                            {lr.isInvoiceGenerated && (
                                                                <span className="ml-1 text-[9px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded font-bold">Invoiced</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                                        <td className="p-3 font-mono text-xs">{lr.truckNo}</td>
                                                        <td className="p-3 text-xs">{lr.fromPlace} → {lr.toPlace}</td>
                                                        <td className="p-3 text-right font-semibold">₹{lr.freight}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 flex justify-between items-center">
                                    <div className="text-sm text-blue-800 font-bold">{selectedLRs.size} LRs Selected</div>
                                    <button
                                        onClick={handleStartGeneration}
                                        disabled={selectedLRs.size === 0}
                                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Continue to Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* ── MAIN INVOICE LIST ── */}
                {/* ══════════════════════════════════════════════ */}
                {!isWizardOpen && !editingInvoice && (
                    <>
                        {/* Search + Sort */}
                        <div className="mb-6 flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    placeholder="Search by Invoice No or Customer..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                                />
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-3 py-2 shadow-sm min-w-[220px]">
                                <FilterIcon className="w-5 h-5 text-gray-500" />
                                <select
                                    value={sortOption}
                                    onChange={e => setSortOption(e.target.value as any)}
                                    className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 cursor-pointer outline-none w-full font-medium"
                                >
                                    <option value="number-asc">No. (Ascending)</option>
                                    <option value="number-desc">No. (Descending)</option>
                                    <option value="date-asc">Date (Oldest First)</option>
                                    <option value="date-desc">Date (Newest First)</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3">Invoice No</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3 text-center">LRs</th>
                                        <th className="px-6 py-3 text-right">Total (Excl. Tax)</th>
                                        <th className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                                No invoices found. Generate one using the wizard above.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map(inv => (
                                            <tr key={inv.invoiceNo} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-blue-600">{inv.invoiceNo}</td>
                                                <td className="px-6 py-4">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                                <td className="px-6 py-4 font-medium">{inv.customer}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">{inv.count}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold">₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* View / Print */}
                                                        <button
                                                            onClick={() => setSelectedInvoice({ invoiceNo: inv.invoiceNo, lrs: inv.lrs })}
                                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                                            title="View / Print Invoice"
                                                        >
                                                            <InvoiceIcon className="w-5 h-5" />
                                                        </button>
                                                        {/* Edit */}
                                                        <button
                                                            onClick={() => handleStartEdit({ invoiceNo: inv.invoiceNo, lrs: inv.lrs })}
                                                            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-2 rounded-full transition-colors"
                                                            title="Edit Invoice (Add/Remove LRs, Change No./Date)"
                                                        >
                                                            <EditIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* ── View/Print Modal ── */}
            {selectedInvoice && (
                <InvoiceModal
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    lorryReceipts={selectedInvoice.lrs}
                    allLorryReceipts={lorryReceipts}
                    companyDetails={companyDetails}
                    onSaveInvoiceDetails={onUpdateInvoiceDetails ? async (lrNos, invNo, invDate) => {
                        await onUpdateInvoiceDetails(lrNos, invNo, invDate);
                        setSelectedInvoice(null);
                    } : undefined}
                />
            )}

            {/* ── New Invoice Generation Modal ── */}
            {showGenerationModal && (
                <InvoiceModal
                    isOpen={showGenerationModal}
                    onClose={() => setShowGenerationModal(false)}
                    lorryReceipts={lorryReceipts.filter(lr => selectedLRs.has(lr.lrNo))}
                    allLorryReceipts={lorryReceipts}
                    companyDetails={companyDetails}
                    onSaveInvoiceDetails={async (lrNos, invNo, invDate) => {
                        if (onUpdateInvoiceDetails) {
                            await onUpdateInvoiceDetails(lrNos, invNo, invDate);
                            closeWizard();
                        }
                        setShowGenerationModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default InvoiceList;
