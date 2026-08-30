
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LorryReceipt, CompanyDetails, LRStatus, SavedParty } from '../types';
import { PencilIcon, TrashIcon, SearchIcon, PrintIcon, FilterIcon, DashboardIcon, CheckCircleIcon, ClockIcon, TruckIcon, XIcon, UploadIcon, DocumentTextIcon, InvoiceIcon, PlusIcon, ArrowLeftIcon } from './icons';
import LRPreviewModal, { LRContent } from './LRPreviewModal';
import InvoiceModal from './InvoiceModal';
import { Language, t } from '../utils/translations';
import { addLedgerEntry, getVouchers, addVoucher, subscribeToVouchers, updateVoucher } from '../services/supabaseService';
import { toast } from 'react-hot-toast';
import { Voucher } from '../types';

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
    isReadOnly?: boolean;
    initialViewMode?: 'lrs' | 'vouchers';
    savedParties?: SavedParty[];
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
    isReadOnly = false,
    initialViewMode = 'lrs',
    savedParties = []
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

    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
    const [voucherDescription, setVoucherDescription] = useState('Driver Advance');
    const [voucherNo, setVoucherNo] = useState(`VCH-${Math.floor(Math.random() * 10000)}`);
    const [voucherAmount, setVoucherAmount] = useState(0);
    const [voucherPaymentMode, setVoucherPaymentMode] = useState('Cash');
    const [voucherParty, setVoucherParty] = useState('');
    const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
    const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'lrs' | 'vouchers'>(initialViewMode);
    
    // Sync viewMode when initialViewMode changes from outside
    useEffect(() => {
        if (initialViewMode) setViewMode(initialViewMode);
    }, [initialViewMode]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);

    useEffect(() => {
        if (viewMode === 'vouchers') {
            fetchVouchers();
            const subscription = subscribeToVouchers((payload) => {
                fetchVouchers();
            });
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [viewMode]);

    const fetchVouchers = async () => {
        setIsLoadingVouchers(true);
        try {
            const data = await getVouchers();
            setVouchers(data);
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            toast.error('Failed to fetch vouchers');
        } finally {
            setIsLoadingVouchers(false);
        }
    };

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

    const handleCreateVoucher = async () => {
        setIsCreatingVoucher(true);
        const isEditing = !!editingVoucherId;
        const toastId = toast.loading(isEditing ? 'Updating voucher...' : 'Creating voucher...');
        try {
            const voucherData = {
                date: voucherDate,
                description: voucherDescription,
                voucher_no: voucherNo,
                amount: voucherAmount,
                payment_mode: voucherPaymentMode,
                party_name: voucherParty || undefined
            };

            if (isEditing) {
                await updateVoucher(editingVoucherId, voucherData);
                toast.success('Successfully updated voucher', { id: toastId });
            } else {
                // 1. Save voucher — this is the critical step
                await addVoucher(voucherData);

                // 2. Mirror to ledger as a background side-effect (don't block UI or fail voucher if ledger insert fails)
                addLedgerEntry({
                    date: voucherDate,
                    description: voucherDescription,
                    voucher_no: voucherNo,
                    credit: 0,
                    debit: voucherAmount,
                }).catch(err => console.warn('Ledger mirror failed (non-critical):', err));

                toast.success('Successfully created voucher', { id: toastId });
            }

            setShowVoucherModal(false);
            setSelectedLRs(new Set());
            setEditingVoucherId(null);
            
            // Reset fields
            setVoucherNo(`VCH-${Math.floor(Math.random() * 10000)}`);
            setVoucherAmount(0);
            setVoucherParty('');
            setVoucherDescription('');
            if (viewMode === 'vouchers') fetchVouchers();
        } catch (error: any) {
            console.error('Error saving voucher:', error);
            const msg = error?.message || (isEditing ? 'Failed to update voucher' : 'Failed to create voucher');
            toast.error(msg, { id: toastId });
        } finally {
            setIsCreatingVoucher(false);
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
            
            {/* Top Level Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setViewMode('lrs')}
                    className={`py-3 px-6 font-bold text-lg border-b-4 transition-colors flex items-center gap-2 ${viewMode === 'lrs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <DocumentTextIcon className="w-5 h-5" />
                    Lorry Receipts
                </button>
                <button
                    onClick={() => setViewMode('vouchers')}
                    className={`py-3 px-6 font-bold text-lg border-b-4 transition-colors flex items-center gap-2 ${viewMode === 'vouchers' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <InvoiceIcon className="w-5 h-5" />
                    Voucher Section
                </button>
            </div>

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-3 self-start md:self-center">
                    <button onClick={onBackToDashboard} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-all group" title="Back">
                        <ArrowLeftIcon className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {viewMode === 'lrs' ? t[language].viewList : 'Vouchers'}
                    </h2>
                    {viewMode === 'lrs' && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{filteredLRs.length}</span>
                    )}
                    {isReadOnly && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                            👁️ View Only
                        </span>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {viewMode === 'lrs' && (
                        <>
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
                        </>
                    )}

                    {!isReadOnly && viewMode === 'lrs' && (
                        <button onClick={onAddNew} className="bg-ssk-blue text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold whitespace-nowrap">
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">{t[language].newLR}</span>
                        </button>
                    )}
                    
                    {!isReadOnly && viewMode === 'vouchers' && (
                        <button onClick={() => {
                            setVoucherDescription('');
                            setShowVoucherModal(true);
                        }} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold whitespace-nowrap">
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Create Voucher</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {!isReadOnly && viewMode === 'lrs' && selectedLRs.size > 0 && (
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
                            onClick={() => {
                                const selectedLRsArray = filteredLRs.filter(lr => selectedLRs.has(lr.lrNo));
                                setVoucherDescription(`Expense/Advance for LR: ${selectedLRsArray.map(lr => lr.lrNo).join(', ')}`);
                                setShowVoucherModal(true);
                            }}
                            className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 text-sm font-semibold transition-colors shadow-sm"
                        >
                            <InvoiceIcon className="w-4 h-4" /> Create Voucher
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
            {viewMode === 'lrs' ? (
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
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200 flex-grow">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Voucher No</th>
                                <th className="px-6 py-4 font-semibold">Party Name</th>
                                <th className="px-6 py-4 font-semibold">Description / Details</th>
                                <th className="px-6 py-4 font-semibold">Mode of Payment</th>
                                <th className="px-6 py-4 font-semibold text-right">Amount (₹)</th>
                                {!isReadOnly && <th className="px-6 py-4 font-semibold text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingVouchers ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading vouchers...</td>
                                </tr>
                            ) : vouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <InvoiceIcon className="w-12 h-12 text-gray-300 mb-3" />
                                            <p className="text-lg font-medium">No Vouchers Found</p>
                                            <p className="text-sm mt-1">Create a voucher to track expenses or advances.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                vouchers.map((voucher) => (
                                    <tr key={voucher.id} className="border-b hover:bg-gray-50 transition-colors bg-white">
                                        <td className="px-6 py-4 whitespace-nowrap">{new Date(voucher.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900 font-mono">{voucher.voucher_no}</td>
                                        <td className="px-6 py-4">
                                            {voucher.party_name ? (
                                                <span className="font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md text-xs">{voucher.party_name}</span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{voucher.description}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                {voucher.payment_mode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-red-600">₹{voucher.amount.toLocaleString()}</td>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => {
                                                        setEditingVoucherId(voucher.id || null);
                                                        setVoucherDate(voucher.date);
                                                        setVoucherNo(voucher.voucher_no);
                                                        setVoucherDescription(voucher.description);
                                                        setVoucherParty(voucher.party_name || '');
                                                        setVoucherAmount(voucher.amount);
                                                        setVoucherPaymentMode(voucher.payment_mode);
                                                        setShowVoucherModal(true);
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-green-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

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

            {/* Voucher Create Modal */}
            {showVoucherModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <InvoiceIcon className="w-6 h-6 text-red-500" />
                                {editingVoucherId ? 'Edit Voucher' : 'Create Voucher (Debit)'}
                            </h3>
                            <button onClick={() => {
                                setShowVoucherModal(false);
                                setEditingVoucherId(null);
                            }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                                    <input 
                                        type="date" 
                                        value={voucherDate}
                                        onChange={(e) => setVoucherDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Voucher No.</label>
                                    <input 
                                        type="text" 
                                        value={voucherNo}
                                        onChange={(e) => setVoucherNo(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-mono"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Details / Description</label>
                                <textarea 
                                    value={voucherDescription}
                                    onChange={(e) => setVoucherDescription(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                    rows={2}
                                />
                            </div>

                            {/* Party Selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Party Name <span className="text-gray-400 font-normal">(optional)</span></label>
                                <select
                                    value={voucherParty}
                                    onChange={(e) => setVoucherParty(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
                                >
                                    <option value="">— Select Party —</option>
                                    {savedParties.map((p) => (
                                        <option key={p.id || p.name} value={p.name}>{p.name} {p.city ? `(${p.city})` : ''}</option>
                                    ))}
                                </select>
                                {voucherParty && (
                                    <p className="text-xs text-blue-600 mt-1 font-medium">✓ Party selected: {voucherParty}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        value={voucherAmount || ''}
                                        onChange={(e) => setVoucherAmount(Number(e.target.value))}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-bold text-red-600"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mode of Payment</label>
                                    <select 
                                        value={voucherPaymentMode}
                                        onChange={(e) => setVoucherPaymentMode(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Online">Online</option>
                                        <option value="RTGS">RTGS</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/80">
                            <button
                                onClick={() => {
                                    setShowVoucherModal(false);
                                    setEditingVoucherId(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                                disabled={isCreatingVoucher}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateVoucher}
                                disabled={isCreatingVoucher || voucherAmount <= 0}
                                className="px-6 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-lg hover:opacity-90 transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCreatingVoucher ? (editingVoucherId ? 'Updating...' : 'Creating...') : (editingVoucherId ? 'Update Voucher' : 'Create Voucher')}
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
                                        templateStyle={lr.templateStyle || 'modern-gst'}
                                        copyType={lr.copyType || 'CONSIGNOR COPY'}
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
