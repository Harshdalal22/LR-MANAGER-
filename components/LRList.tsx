
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LorryReceipt, CompanyDetails, LRStatus } from '../types';
import { PencilIcon, TrashIcon, SearchIcon, PrintIcon, FilterIcon, DashboardIcon, CheckCircleIcon, ClockIcon, TruckIcon, XIcon, UploadIcon, DocumentTextIcon, InvoiceIcon, PlusIcon, ArrowLeftIcon } from './icons';
import LRPreviewModal, { LRContent } from './LRPreviewModal';
import InvoiceModal from './InvoiceModal';
import { Language, t } from '../utils/translations';
import { addLedgerEntry } from '../services/supabaseService';
import { toast } from 'react-hot-toast';

interface LRListProps {
    lorryReceipts: LorryReceipt[];
    onEdit: (lrNo: string) => void;
    onDelete: (lrNo: string) => void;
    onAddNew: () => void;
    companyDetails: CompanyDetails;
    onBackToDashboard: () => void;
    onUpdateStatus: (lrNo: string, status: LRStatus) => void;
    onOpenPODUploader: (lr: LorryReceipt) => void;
    onViewPOD: (podPath: string) => void;
    onUpdateInvoiceDetails?: (lrNos: string[], invoiceNo: string, invoiceDate: string) => Promise<void>;
    language: Language;
    isReadOnly?: boolean;
}

const statusColors: { [key in LRStatus]: string } = {
    Booked: 'bg-blue-100 text-blue-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    'Out for Delivery': 'bg-orange-100 text-orange-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800',
};

const LRList: React.FC<LRListProps> = ({
    lorryReceipts,
    onEdit,
    onDelete,
    onAddNew,
    companyDetails,
    onBackToDashboard,
    onUpdateStatus,
    onOpenPODUploader,
    onViewPOD,
    onUpdateInvoiceDetails,
    language,
    isReadOnly = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<LRStatus | 'All'>('All');
    const [selectedLRs, setSelectedLRs] = useState<Set<string>>(new Set());
    const [previewLR, setPreviewLR] = useState<LorryReceipt | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [isBulkPrinting, setIsBulkPrinting] = useState(false);
    const [showLedgerCreateModal, setShowLedgerCreateModal] = useState(false);
    const [ledgerDescription, setLedgerDescription] = useState('Freight Invoice');
    const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().split('T')[0]);
    const [isPostingLedger, setIsPostingLedger] = useState(false);

    // Bulk print settings
    const [bulkPrintShowAmounts, setBulkPrintShowAmounts] = useState(true);

    const filteredLRs = useMemo(() => {
        return lorryReceipts.filter(lr => {
            const matchesSearch =
                lr.lrNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lr.consignor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lr.consignee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lr.truckNo.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'All' || lr.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [lorryReceipts, searchTerm, statusFilter]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLRs(new Set(filteredLRs.map(lr => lr.lrNo)));
        } else {
            setSelectedLRs(new Set());
        }
    };

    const handleSelectLR = (lrNo: string) => {
        const newSelected = new Set(selectedLRs);
        if (newSelected.has(lrNo)) {
            newSelected.delete(lrNo);
        } else {
            newSelected.add(lrNo);
        }
        setSelectedLRs(newSelected);
    };

    const handleBulkPrint = () => {
        if (selectedLRs.size === 0) return;
        setIsBulkPrinting(true);
        // Wait for portal to render then print
        setTimeout(() => {
            window.print();
            setIsBulkPrinting(false);
        }, 500);
    };

    const handleGenerateInvoice = () => {
        if (selectedLRs.size === 0) return;
        setShowInvoiceModal(true);
    };

    const handlePostToLedger = async () => {
        setIsPostingLedger(true);
        const toastId = toast.loading('Posting to ledger...');
        try {
            const selectedLRsArray = filteredLRs.filter(lr => selectedLRs.has(lr.lrNo));
            const totalAmount = selectedLRsArray.reduce((acc, lr) => acc + (Number(lr.invoiceAmount) || Number(lr.freight) || 0), 0);
            const invoiceNos = selectedLRsArray.map(lr => lr.invoiceNo || lr.lrNo).join(', ');

            await addLedgerEntry({
                date: ledgerDate,
                description: ledgerDescription,
                invoice_no: invoiceNos,
                credit: totalAmount,
                debit: 0
            });
            toast.success('Successfully posted to ledger', { id: toastId });
            setShowLedgerCreateModal(false);
            setSelectedLRs(new Set());
        } catch (error) {
            console.error('Error posting to ledger:', error);
            toast.error('Failed to post to ledger', { id: toastId });
        } finally {
            setIsPostingLedger(false);
        }
    };

    const getStatusIcon = (status: LRStatus) => {
        switch (status) {
            case 'Booked': return <DocumentTextIcon className="w-4 h-4" />;
            case 'In Transit': return <TruckIcon className="w-4 h-4" />;
            case 'Out for Delivery': return <ClockIcon className="w-4 h-4" />;
            case 'Delivered': return <CheckCircleIcon className="w-4 h-4" />;
            case 'Cancelled': return <XIcon className="w-4 h-4" />;
            default: return null;
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg border border-white/50 min-h-[600px] flex flex-col">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-3 self-start md:self-center">
                    <button onClick={onBackToDashboard} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-all group" title="Back">
                        <ArrowLeftIcon className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">{t[language].viewList}</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{filteredLRs.length}</span>
                    {isReadOnly && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                            👁️ View Only
                        </span>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t[language].searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>

                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-3 py-2">
                        <FilterIcon className="w-5 h-5 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as LRStatus | 'All')}
                            className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 cursor-pointer outline-none"
                        >
                            <option value="All">{t[language].allStatus}</option>
                            <option value="Booked">Booked</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    {!isReadOnly && (
                        <button onClick={onAddNew} className="bg-ssk-blue text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold whitespace-nowrap">
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">{t[language].newLR}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {!isReadOnly && selectedLRs.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-800">{selectedLRs.size} selected</span>
                        <button onClick={() => setSelectedLRs(new Set())} className="text-xs text-blue-600 hover:underline">Clear</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-4 bg-white px-2 py-1 rounded border border-blue-200">
                            <input
                                type="checkbox"
                                id="bulkPrintAmounts"
                                checked={bulkPrintShowAmounts}
                                onChange={(e) => setBulkPrintShowAmounts(e.target.checked)}
                                className="h-4 w-4 text-ssk-blue rounded"
                            />
                            <label htmlFor="bulkPrintAmounts" className="text-sm text-gray-700 cursor-pointer select-none">Show Amounts on Print</label>
                        </div>

                        {onUpdateInvoiceDetails && (
                            <button
                                onClick={handleGenerateInvoice}
                                className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 text-sm font-semibold transition-colors shadow-sm"
                            >
                                <InvoiceIcon className="w-4 h-4" /> {t[language].generateInvoice}
                            </button>
                        )}
                        <button
                            onClick={() => setShowLedgerCreateModal(true)}
                            className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 text-sm font-semibold transition-colors shadow-sm"
                        >
                            <DocumentTextIcon className="w-4 h-4" /> Post to Ledger
                        </button>
                        <button
                            onClick={handleBulkPrint}
                            className="flex items-center gap-2 bg-gray-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 text-sm font-semibold transition-colors shadow-sm"
                        >
                            <PrintIcon className="w-4 h-4" /> {t[language].printSelected}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200 flex-grow">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            {!isReadOnly && (
                                <th className="p-4 w-4">
                                    <input
                                        type="checkbox"
                                        checked={filteredLRs.length > 0 && selectedLRs.size === filteredLRs.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </th>
                            )}
                            <th className="px-4 py-3">{t[language].lrNoDate}</th>
                            <th className="px-4 py-3">{t[language].consignor}</th>
                            <th className="px-4 py-3">{t[language].consignee}</th>
                            <th className="px-4 py-3">{t[language].truckRoute}</th>
                            <th className="px-4 py-3 text-right">{t[language].amount}</th>
                            <th className="px-4 py-3 text-center">{t[language].status}</th>
                            <th className="px-4 py-3 text-center">{t[language].pod}</th>
                            {!isReadOnly && <th className="px-4 py-3 text-center">{t[language].actions}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLRs.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                                    No Lorry Receipts found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredLRs.map((lr) => (
                                <tr key={lr.lrNo} className={`border-b hover:bg-gray-50 transition-colors ${selectedLRs.has(lr.lrNo) ? 'bg-blue-50/50' : ''}`}>
                                    {!isReadOnly && (
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedLRs.has(lr.lrNo)}
                                                onChange={() => handleSelectLR(lr.lrNo)}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-900">{lr.lrNo}</div>
                                        <div className="text-xs text-gray-500">{new Date(lr.date).toLocaleDateString('en-GB')}</div>
                                        {lr.isInvoiceGenerated ? (
                                            <div className="text-[9px] text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded border border-green-200 mt-1 inline-block whitespace-nowrap">
                                                GENERATED
                                            </div>
                                        ) : (
                                            <div className="text-[9px] text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 mt-1 inline-block whitespace-nowrap">
                                                NOT GENERATED
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-800 truncate max-w-[150px]" title={lr.consignor.name}>{lr.consignor.name}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{lr.consignor.city}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-800 truncate max-w-[150px]" title={lr.consignee.name}>{lr.consignee.name}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{lr.consignee.city}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit mb-1">
                                            <TruckIcon className="w-3 h-3" /> {lr.truckNo}
                                        </div>
                                        <div className="text-xs text-gray-500">{lr.fromPlace} &rarr; {lr.toPlace}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-700">
                                        ₹{Number(lr.freight).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="relative group">
                                            {isReadOnly ? (
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[lr.status]}`}>
                                                    {lr.status}
                                                </span>
                                            ) : (
                                                <select
                                                    value={lr.status}
                                                    onChange={(e) => onUpdateStatus(lr.lrNo, e.target.value as LRStatus)}
                                                    className={`appearance-none cursor-pointer text-xs font-bold px-2 py-1 rounded-full border-0 text-center w-full focus:ring-2 focus:ring-blue-500 ${statusColors[lr.status]}`}
                                                >
                                                    {Object.keys(statusColors).map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        {lr.status === 'Delivered' && (
                                            <div className="text-[10px] text-gray-400 mt-1">
                                                {lr.status_updated_at ? new Date(lr.status_updated_at).toLocaleDateString() : '-'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {lr.pod_path ? (
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => onViewPOD(lr.pod_path!)} className="text-blue-600 hover:text-blue-800" title="View POD">
                                                    <DocumentTextIcon className="w-5 h-5" />
                                                </button>
                                                {!isReadOnly && (
                                                    <button onClick={() => onOpenPODUploader(lr)} className="text-gray-400 hover:text-gray-600" title="Re-upload POD">
                                                        <UploadIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            isReadOnly ? (
                                                <span className="text-xs text-gray-400">No POD</span>
                                            ) : (
                                                <button onClick={() => onOpenPODUploader(lr)} className="text-gray-400 hover:text-blue-600 transition-colors mx-auto block" title="Upload POD">
                                                    <UploadIcon className="w-5 h-5" />
                                                </button>
                                            )
                                        )}
                                    </td>
                                    {!isReadOnly && (
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setPreviewLR(lr)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-blue-600 transition-colors" title="Preview / Print">
                                                    <PrintIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onEdit(lr.lrNo)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-green-600 transition-colors" title="Edit">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDelete(lr.lrNo)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-red-600 transition-colors" title="Delete">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    {isReadOnly && (
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => setPreviewLR(lr)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-blue-600 transition-colors" title="Preview">
                                                <PrintIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {previewLR && (
                <LRPreviewModal
                    isOpen={!!previewLR}
                    onClose={() => setPreviewLR(null)}
                    lr={previewLR}
                    companyDetails={companyDetails}
                    isReadOnly={true}
                />
            )}

            {showInvoiceModal && selectedLRs.size > 0 && (
                <InvoiceModal
                    isOpen={showInvoiceModal}
                    onClose={() => setShowInvoiceModal(false)}
                    lorryReceipts={lorryReceipts.filter(lr => selectedLRs.has(lr.lrNo))}
                    allLorryReceipts={lorryReceipts}
                    companyDetails={companyDetails}
                    onSaveInvoiceDetails={onUpdateInvoiceDetails}
                />
            )}

            {/* Ledger Create Modal */}
            {showLedgerCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                                Post to Ledger
                            </h3>
                            <button onClick={() => setShowLedgerCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                                <input 
                                    type="date" 
                                    value={ledgerDate}
                                    onChange={(e) => setLedgerDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                <input 
                                    type="text" 
                                    value={ledgerDescription}
                                    onChange={(e) => setLedgerDescription(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                    placeholder="e.g. Freight Invoice"
                                />
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Selected LRs:</span>
                                    <span className="font-bold text-gray-800">{selectedLRs.size}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Total Credit Amount:</span>
                                    <span className="font-bold text-purple-700 text-lg">
                                        ₹ {filteredLRs.filter(lr => selectedLRs.has(lr.lrNo)).reduce((acc, lr) => acc + (Number(lr.invoiceAmount) || Number(lr.freight) || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/80">
                            <button
                                onClick={() => setShowLedgerCreateModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                                disabled={isPostingLedger}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePostToLedger}
                                disabled={isPostingLedger}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:opacity-90 transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
                            >
                                {isPostingLedger ? 'Posting...' : 'Post Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Portal */}
            {isBulkPrinting && (
                createPortal(
                    <div className="print-only">
                        {lorryReceipts
                            .filter(lr => selectedLRs.has(lr.lrNo))
                            .map((lr, index) => (
                                <div key={lr.lrNo}>
                                    <LRContent
                                        lr={lr}
                                        companyDetails={companyDetails}
                                        showCompanyDetails={true}
                                        showAmounts={bulkPrintShowAmounts}
                                    />
                                    {index < selectedLRs.size - 1 && <div className="page-break" />}
                                </div>
                            ))
                        }
                    </div>,
                    document.getElementById('print-root')!
                )
            )}
        </div>
    );
};

export default LRList;
