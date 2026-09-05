
import React, { useMemo, useState } from 'react';
import { LorryReceipt, CompanyDetails } from '../types';
import { DashboardIcon, SearchIcon, PrintIcon, InvoiceIcon, PlusIcon, XIcon, CheckCircleIcon, FilterIcon, ArrowLeftIcon } from './icons';
import InvoiceModal from './InvoiceModal';

interface InvoiceListProps {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    onBack: () => void;
    onUpdateInvoiceDetails?: (lrNos: string[], invoiceNo: string, invoiceDate: string) => Promise<void>;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ lorryReceipts, companyDetails, onBack, onUpdateInvoiceDetails }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedPartyName, setSelectedPartyName] = useState('');
    const [selectedLRs, setSelectedLRs] = useState<Set<string>>(new Set());
    const [selectedInvoice, setSelectedInvoice] = useState<{ invoiceNo: string, lrs: LorryReceipt[] } | null>(null);
    const [showGenerationModal, setShowGenerationModal] = useState(false);
    const [sortOption, setSortOption] = useState<'number-asc' | 'number-desc' | 'date-asc' | 'date-desc'>('number-asc');

    // Group officially generated LRs for the main list
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
                const charges = (Object.values(lr.charges || {}) as number[]).reduce((a, b) => a + (b || 0), 0);
                return sum + (Number(lr.freight) || 0) + charges;
            }, 0);

            return { invoiceNo, date, customer, count: lrs.length, totalAmount, lrs };
        }).sort((a, b) => {
            switch (sortOption) {
                case 'number-asc':
                    return a.invoiceNo.localeCompare(b.invoiceNo, undefined, { numeric: true, sensitivity: 'base' });
                case 'number-desc':
                    return b.invoiceNo.localeCompare(a.invoiceNo, undefined, { numeric: true, sensitivity: 'base' });
                case 'date-asc':
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'date-desc':
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                default:
                    return 0;
            }
        });
    }, [lorryReceipts, sortOption]);

    // Unique list of all parties from all LRs
    const allParties = useMemo(() => {
        const names = new Set<string>();
        lorryReceipts.forEach(lr => {
            if (lr.consignor.name) names.add(lr.consignor.name);
            if (lr.consignee.name) names.add(lr.consignee.name);
            if (lr.billingTo?.name) names.add(lr.billingTo.name);
        });
        return Array.from(names).sort();
    }, [lorryReceipts]);

    // Toggle to show already-invoiced LRs
    const [showAllLRs, setShowAllLRs] = useState(false);

    // LRs for the selected party (show all or only pending)
    const pendingLRsForParty = useMemo(() => {
        if (!selectedPartyName) return [];
        return lorryReceipts.filter(lr => 
            (showAllLRs || !lr.isInvoiceGenerated) &&
            (lr.consignor.name === selectedPartyName || 
             lr.consignee.name === selectedPartyName || 
             lr.billingTo?.name === selectedPartyName)
        );
    }, [lorryReceipts, selectedPartyName, showAllLRs]);

    const handleSelectLR = (lrNo: string) => {
        const newSelected = new Set(selectedLRs);
        if (newSelected.has(lrNo)) newSelected.delete(lrNo);
        else newSelected.add(lrNo);
        setSelectedLRs(newSelected);
    };

    const handleStartGeneration = () => {
        if (selectedLRs.size === 0) return;
        setShowGenerationModal(true);
    };

    const filteredInvoices = generatedInvoices.filter(inv => 
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-lg min-h-[500px]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex items-center gap-4 self-start">
                        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-all group" title="Back">
                             <ArrowLeftIcon className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <h2 className="text-2xl font-bold text-ssk-blue">Invoices</h2>
                    </div>
                    
                    {!isWizardOpen && (
                        <button 
                            onClick={() => setIsWizardOpen(true)}
                            className="flex items-center gap-2 bg-ssk-blue text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-md font-bold"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Generate New Invoice
                        </button>
                    )}
                </div>

                {isWizardOpen ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                                <InvoiceIcon className="w-6 h-6" />
                                New Invoice Wizard
                            </h3>
                            <button onClick={() => { setIsWizardOpen(false); setSelectedPartyName(''); setSelectedLRs(new Set()); }} className="p-1 hover:bg-blue-100 rounded-full text-blue-900">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Step 1: Select Party */}
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-blue-700 uppercase mb-2">1. Select Party</label>
                                <select 
                                    value={selectedPartyName}
                                    onChange={(e) => { setSelectedPartyName(e.target.value); setSelectedLRs(new Set()); }}
                                    className="w-full p-3 bg-white border border-blue-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
                                >
                                    <option value="">-- Choose Party --</option>
                                    {allParties.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                                <p className="mt-2 text-[10px] text-blue-600 font-medium italic">Shows all parties</p>
                            </div>

                            {/* Step 2: Select LRs */}
                            <div className="md:col-span-3">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-blue-700 uppercase">2. Select LRs ({pendingLRsForParty.length})</label>
                                    <label className="flex items-center gap-2 text-xs text-blue-700 cursor-pointer font-semibold">
                                        <input
                                            type="checkbox"
                                            checked={showAllLRs}
                                            onChange={e => setShowAllLRs(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
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
                                                        {selectedPartyName ? (showAllLRs ? "Is party ke liye koi LR nahi mili." : "Koi pending LR nahi. 'Already Invoiced LRs bhi dikhao' check karein.") : "Pehle party select karein."}
                                                    </td>
                                                </tr>
                                            ) : (
                                                pendingLRsForParty.map(lr => (
                                                    <tr key={lr.lrNo} className={`hover:bg-blue-50 cursor-pointer ${selectedLRs.has(lr.lrNo) ? 'bg-blue-50' : ''}`} onClick={() => handleSelectLR(lr.lrNo)}>
                                                        <td className="p-3 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedLRs.has(lr.lrNo)} 
                                                                onChange={() => {}} // Controlled by row click
                                                                className="w-4 h-4 text-blue-600 rounded"
                                                            />
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
                                    <div className="text-sm text-blue-800 font-bold">
                                        {selectedLRs.size} LRs Selected
                                    </div>
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
                ) : (
                    <>
                        <div className="mb-6 flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    placeholder="Search Generated Invoices by No or Customer..."
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
                                    onChange={(e) => setSortOption(e.target.value as any)}
                                    className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 cursor-pointer outline-none w-full font-medium"
                                >
                                    <option value="number-asc">No. (Ascending)</option>
                                    <option value="number-desc">No. (Descending)</option>
                                    <option value="date-asc">Date (Oldest First)</option>
                                    <option value="date-desc">Date (Newest First)</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3">Invoice No</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3 text-center">LRs Included</th>
                                        <th className="px-6 py-3 text-right">Total Amount (Excl. Tax)</th>
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
                                        filteredInvoices.map((inv) => (
                                            <tr key={inv.invoiceNo} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-blue-600">{inv.invoiceNo}</td>
                                                <td className="px-6 py-4">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                                <td className="px-6 py-4 font-medium">{inv.customer}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">{inv.count}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold">₹{inv.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => setSelectedInvoice({ invoiceNo: inv.invoiceNo, lrs: inv.lrs })}
                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                                        title="View / Print Invoice"
                                                    >
                                                        <InvoiceIcon className="w-5 h-5" />
                                                    </button>
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

            {/* Modal for viewing/editing already generated invoices */}
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

            {/* Modal for generating new invoice from selection */}
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
                            setIsWizardOpen(false);
                            setSelectedPartyName('');
                            setSelectedLRs(new Set());
                        }
                        setShowGenerationModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default InvoiceList;
