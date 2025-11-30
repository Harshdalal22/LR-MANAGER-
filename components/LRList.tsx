import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LorryReceipt, CompanyDetails, LRStatus } from '../types';
import { PencilIcon, TrashIcon, DownloadIcon, SearchIcon, PrintIcon, FilterIcon, DotsVerticalIcon, DashboardIcon, CheckCircleIcon, ClockIcon, TruckIcon, XIcon, UploadIcon, DocumentTextIcon } from './icons';
import LRPreviewModal, { LRContent } from './LRPreviewModal';
import InvoiceModal from './InvoiceModal';

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
}

const statusColors: { [key in LRStatus]: string } = {
    Booked: 'bg-blue-100 text-blue-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    'Out for Delivery': 'bg-orange-100 text-orange-800',
    Delivered: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
};

const StatusBadge: React.FC<{ status: LRStatus }> = ({ status }) => (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
    </span>
);

const PODStatusIcon: React.FC<{ lr: LorryReceipt; onViewPOD: (podPath: string) => void }> = ({ lr, onViewPOD }) => {
    if (lr.pod_path) {
        return (
            <button onClick={() => onViewPOD(lr.pod_path!)} title="View POD" className="p-1 hover:bg-green-100 rounded-full">
                <DocumentTextIcon className="w-5 h-5 text-green-600" />
            </button>
        );
    }
    if (lr.status === 'Delivered') {
        return <span title="POD Pending"><UploadIcon className="w-5 h-5 text-orange-500" /></span>;
    }
    return <span className="text-gray-400 text-xs" title="N/A">-</span>;
};


const LRList: React.FC<LRListProps> = ({ lorryReceipts, onEdit, onDelete, onAddNew, companyDetails, onBackToDashboard, onUpdateStatus, onOpenPODUploader, onViewPOD, onUpdateInvoiceDetails }) => {
    const [previewingLR, setPreviewingLR] = useState<LorryReceipt | null>(null);
    const [selectedLRs, setSelectedLRs] = useState<string[]>([]);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [isPrinting, setIsPrinting] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [openMenuLrNo, setOpenMenuLrNo] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuLrNo(null);
            }
        };

        if (openMenuLrNo) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuLrNo]);


    const filteredLRs = useMemo(() => {
        return lorryReceipts.filter(lr => {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === '' ||
                lr.truckNo.toLowerCase().includes(lowerSearchTerm) ||
                lr.consignor.name.toLowerCase().includes(lowerSearchTerm) ||
                lr.consignee.name.toLowerCase().includes(lowerSearchTerm) ||
                lr.status.toLowerCase().includes(lowerSearchTerm);

            const lrDate = new Date(lr.date);
            const fromDate = dateRange.from ? new Date(dateRange.from) : null;
            const toDate = dateRange.to ? new Date(dateRange.to) : null;
            
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            if (toDate) toDate.setHours(23, 59, 59, 999);

            const matchesDate = (!fromDate || lrDate >= fromDate) && (!toDate || lrDate <= toDate);

            return matchesSearch && matchesDate;
        });
    }, [lorryReceipts, searchTerm, dateRange]);


    const handleSelectLR = (lrNo: string) => {
        setSelectedLRs(prev =>
            prev.includes(lrNo)
                ? prev.filter(no => no !== lrNo)
                : [...prev, lrNo]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLRs(filteredLRs.map(lr => lr.lrNo));
        } else {
            setSelectedLRs([]);
        }
    };
    
    const handleClearFilters = () => {
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
    }

    const lrsForInvoice = lorryReceipts.filter(lr => selectedLRs.includes(lr.lrNo));
    const lrsToPrint = lorryReceipts.filter(lr => selectedLRs.includes(lr.lrNo));
    const printRoot = document.getElementById('print-root');

    const handlePrintSelected = () => {
        if (lrsToPrint.length > 0) {
            setIsPrinting(true);
        }
    };

    useEffect(() => {
        if (isPrinting) {
            const handleAfterPrint = () => {
                setIsPrinting(false);
                window.removeEventListener('afterprint', handleAfterPrint);
            };
            window.addEventListener('afterprint', handleAfterPrint);

            // Timeout ensures content is rendered to the portal before print dialog opens
            const timer = setTimeout(() => {
                window.print();
            }, 100);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('afterprint', handleAfterPrint);
            };
        }
    }, [isPrinting]);

    return (
        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-4 self-start sm:self-center">
                    <button onClick={onBackToDashboard} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Back to Dashboard">
                        <DashboardIcon className="w-6 h-6 text-gray-600"/>
                    </button>
                    <h2 className="text-2xl font-bold text-ssk-blue">View LR Details</h2>
                </div>
                 <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                     <button
                        onClick={handlePrintSelected}
                        disabled={selectedLRs.length === 0}
                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-transform hover:scale-105"
                    >
                        <PrintIcon className="w-5 h-5" />
                        Print ({selectedLRs.length})
                    </button>
                    <button
                        onClick={() => setIsInvoiceModalOpen(true)}
                        disabled={selectedLRs.length === 0}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md transition-transform hover:scale-105"
                    >
                        Generate Bill ({selectedLRs.length})
                    </button>
                    <button
                        onClick={onAddNew}
                        className="bg-ssk-red text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 shadow-md transition-transform hover:scale-105"
                    >
                        ADD NEW LR
                    </button>
                </div>
            </div>

            {/* Filtering Toolbar */}
            <div className="mb-4 p-4 bg-gray-50/50 rounded-lg border">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search by Truck, Party, or Status..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-ssk-blue"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">From:</label>
                        <input 
                            type="date" 
                            value={dateRange.from} 
                            onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))}
                            className="p-2 border rounded-lg text-sm"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">To:</label>
                        <input 
                            type="date" 
                            value={dateRange.to} 
                            onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))}
                            className="p-2 border rounded-lg text-sm"
                        />
                    </div>
                    <button onClick={handleClearFilters} className="text-sm text-blue-600 hover:underline">Clear</button>
                </div>
            </div>


            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100/50">
                        <tr>
                            <th scope="col" className="p-4">
                                <input type="checkbox" onChange={handleSelectAll} checked={selectedLRs.length > 0 && selectedLRs.length === filteredLRs.length} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"/>
                            </th>
                            <th scope="col" className="px-6 py-3">LR No.</th>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Truck No.</th>
                            <th scope="col" className="px-6 py-3">Consignor</th>
                            <th scope="col" className="px-6 py-3">Consignee</th>
                            <th scope="col" className="px-6 py-3 text-right">Freight</th>
                            <th scope="col" className="px-6 py-3 text-center">Status</th>
                            <th scope="col" className="px-6 py-3 text-center">POD</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLRs.map(lr => (
                            <tr key={lr.lrNo} className="bg-white border-b hover:bg-gray-50">
                                <td className="w-4 p-4">
                                    <input type="checkbox" checked={selectedLRs.includes(lr.lrNo)} onChange={() => handleSelectLR(lr.lrNo)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                                </td>
                                <td className="px-6 py-4 font-medium text-blue-600 whitespace-nowrap">{lr.lrNo}</td>
                                <td className="px-6 py-4">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4">{lr.truckNo}</td>
                                <td className="px-6 py-4">{lr.consignor.name}</td>
                                <td className="px-6 py-4">{lr.consignee.name}</td>
                                <td className="px-6 py-4 text-right font-semibold">₹{Number(lr.freight).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-center"><StatusBadge status={lr.status} /></td>
                                <td className="px-6 py-4 text-center flex justify-center"><PODStatusIcon lr={lr} onViewPOD={onViewPOD} /></td>
                                <td className="px-6 py-4 text-center relative">
                                    <button onClick={() => setOpenMenuLrNo(lr.lrNo === openMenuLrNo ? null : lr.lrNo)} className="p-2 hover:bg-gray-200 rounded-full">
                                        <DotsVerticalIcon className="w-5 h-5"/>
                                    </button>
                                    {openMenuLrNo === lr.lrNo && (
                                        <div ref={menuRef} className="absolute right-8 top-full mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                            <div className="py-1">
                                                <button onClick={() => { onEdit(lr.lrNo); setOpenMenuLrNo(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><PencilIcon className="w-4 h-4 mr-2"/>Edit</button>
                                                <button onClick={() => { setPreviewingLR(lr); setOpenMenuLrNo(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><DownloadIcon className="w-4 h-4 mr-2"/>View/Download</button>
                                                <div className="border-t my-1"></div>
                                                <div className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500">Update Status</div>
                                                <button onClick={() => { onUpdateStatus(lr.lrNo, 'In Transit'); setOpenMenuLrNo(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><TruckIcon className="w-4 h-4 mr-2"/>In Transit</button>
                                                <button onClick={() => { onUpdateStatus(lr.lrNo, 'Delivered'); setOpenMenuLrNo(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><CheckCircleIcon className="w-4 h-4 mr-2"/>Delivered</button>
                                                <button onClick={() => { onUpdateStatus(lr.lrNo, 'Cancelled'); setOpenMenuLrNo(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"><XIcon className="w-4 h-4 mr-2"/>Cancel</button>
                                                <div className="border-t my-1"></div>
                                                <button onClick={() => { onOpenPODUploader(lr); setOpenMenuLrNo(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><UploadIcon className="w-4 h-4 mr-2"/>Upload POD</button>
                                                <div className="border-t my-1"></div>
                                                <button onClick={() => { onDelete(lr.lrNo); setOpenMenuLrNo(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"><TrashIcon className="w-4 h-4 mr-2"/>Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredLRs.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p className="font-semibold">No Lorry Receipts Found</p>
                        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>

            {previewingLR && (
                <LRPreviewModal 
                    isOpen={!!previewingLR} 
                    onClose={() => setPreviewingLR(null)}
                    lr={previewingLR}
                    companyDetails={companyDetails}
                    isReadOnly={true}
                />
            )}
            {isInvoiceModalOpen && (
                 <InvoiceModal
                    isOpen={isInvoiceModalOpen}
                    onClose={() => setIsInvoiceModalOpen(false)}
                    lorryReceipts={lrsForInvoice}
                    companyDetails={companyDetails}
                    onSaveInvoiceDetails={onUpdateInvoiceDetails}
                />
            )}
            {isPrinting && printRoot && createPortal(
                <div className="printing-container">
                    {lrsToPrint.map((lr, index) => (
                        <div key={lr.lrNo} className={`page-break ${index === 0 ? 'first-page' : ''}`}>
                             <LRContent lr={lr} companyDetails={companyDetails} showCompanyDetails={true} />
                        </div>
                    ))}
                </div>,
                printRoot
            )}
        </div>
    );
};

export default LRList;
