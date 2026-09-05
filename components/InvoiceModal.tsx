
import React, { useRef, forwardRef, useState, useEffect, useMemo } from 'react';
import { LorryReceipt, CompanyDetails, PartyDetails } from '../types';
import { DownloadIcon, XIcon, SaveIcon } from './icons';
import { toWords } from '../utils/numberToWords';
import { getNextSequence } from '../utils/sequenceUtils';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    lorryReceipts: LorryReceipt[];
    allLorryReceipts: LorryReceipt[]; // Added to calculate next sequence
    companyDetails: CompanyDetails;
    onSaveInvoiceDetails?: (lrNos: string[], invoiceNo: string, invoiceDate: string) => Promise<void>;
}

declare const html2pdf: any;

interface InvoiceContentProps {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    billNo: string;
    billDate: string;
    taxType: 'intra' | 'inter';
    showGst: boolean;  // NEW: toggle GST on/off
}

const InvoiceContent = forwardRef<HTMLDivElement, InvoiceContentProps>(({ lorryReceipts, companyDetails, billNo, billDate, taxType, showGst }, ref) => {
    // Sort LRs by LR Number ascending for the PDF/Preview
    const sortedLorryReceipts = useMemo(() => {
        return [...lorryReceipts].sort((a, b) => 
            a.lrNo.localeCompare(b.lrNo, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [lorryReceipts]);

    // Helper: sum only numeric values from charges (string fields like driverName, vehicleType etc. are ignored)
    const safeChargesSum = (charges: Record<string, any>) =>
        Object.values(charges || {}).reduce((sum: number, val: any) => {
            const n = Number(val);
            return sum + (isFinite(n) ? n : 0);
        }, 0);

    const totalAmount = sortedLorryReceipts.reduce((sum, lr) => {
        const totalCharges = safeChargesSum(lr.charges);
        return sum + (Number(lr.freight) || 0) + totalCharges;
    }, 0);

    // GST amounts — only applied when showGst is true
    const totalCgst = (showGst && taxType === 'intra') ? totalAmount * 0.09 : 0;
    const totalSgst = (showGst && taxType === 'intra') ? totalAmount * 0.09 : 0;
    const totalIgst = (showGst && taxType === 'inter') ? totalAmount * 0.18 : 0;
    
    const netAmount = totalAmount + totalCgst + totalSgst + totalIgst;
    const amountInWords = toWords(Math.round(netAmount));

    const billedTo: Partial<PartyDetails> = sortedLorryReceipts.length > 0 ? (sortedLorryReceipts[0].billingTo?.name ? sortedLorryReceipts[0].billingTo : sortedLorryReceipts[0].consignor) : { name: 'N/A', address: 'N/A', gst: 'N/A' };
    
    const formattedBillDate = billDate ? new Date(billDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';


    return (
        <div ref={ref} className="printable-area p-4 bg-white text-black font-['Calibri',sans-serif] w-[680px] mx-auto border border-gray-600 text-sm">
            <div className="text-center text-black">
                <h2 className="font-bold text-xl underline tracking-wider mb-1">
                    {showGst ? 'TAX INVOICE' : 'INVOICE'}
                </h2>
                {companyDetails.jurisdictionCity && <p className="text-xs">SUBJECT TO {companyDetails.jurisdictionCity.toUpperCase()} JURISDICTION</p>}
            </div>
            
            <div className="flex justify-between items-center mt-1 pb-2 border-b border-gray-600">
                <div className="w-1/4 flex justify-start">
                     {companyDetails.logoUrl ? 
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-16 w-auto object-contain" /> :
                        <div className="h-16 w-32 border bg-gray-200 flex items-center justify-center text-xs text-center">No Logo</div>
                    }
                </div>
                <div className="w-1/2 text-center text-black">
                    <h1 className="text-3xl font-bold text-red-600 whitespace-nowrap">{companyDetails.name}</h1>
                    <p className="font-bold text-base">(Fleet Owner &amp; Contractor)</p>
                    <p className="text-xs mt-1">{companyDetails.address}</p>
                    <p className="text-xs">
                        Mail-{companyDetails.email}, Web-{companyDetails.web}
                    </p>
                </div>
                <div className="w-1/4 text-right font-bold text-xs text-black">
                    {(companyDetails.contact || []).map(c => <p key={c}>{c}</p>)}
                </div>
            </div>

            <div className="flex justify-between items-start mt-2 text-black">
                <div className="w-2/3">
                    <p className="font-bold">M/S :</p>
                    <p className="font-bold">{billedTo.name}</p>
                    <p>{billedTo.address}</p>
                </div>
                <div className="w-1/3 text-left pl-10">
                    <p className="font-bold">INVOICE NO. : {billNo}</p>
                    <p className="font-bold">DATE : {formattedBillDate}</p>
                </div>
            </div>

            {/* GST line — only shown when showGst is ON */}
            {showGst && (
                <p className="font-bold text-black mt-2">GST :- {billedTo.gst}</p>
            )}

            {/* Table */}
            <table className="w-full border-collapse border border-gray-600 mt-2 text-xs text-black">
                <thead className="font-bold text-center">
                    <tr>
                        <th className="border border-gray-600 p-1 w-[5%]">Sr.No</th>
                        <th className="border border-gray-600 p-1 w-[10%]">Date</th>
                        <th className="border border-gray-600 p-1 w-[12%]">Truck</th>
                        <th className="border border-gray-600 p-1 w-[12%]">LR No.</th>
                        <th className="border border-gray-600 p-1">From</th>
                        <th className="border border-gray-600 p-1">To</th>
                        <th className="border border-gray-600 p-1 w-[10%]">Freight</th>
                        <th className="border border-gray-600 p-1 w-[10%]">Other Charges</th>
                        <th className="border border-gray-600 p-1 w-[10%]">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedLorryReceipts.map((lr, index) => {
                        const totalCharges = safeChargesSum(lr.charges);
                        return (
                            <tr key={lr.lrNo} style={{ height: '24px' }}>
                                <td className="border border-gray-600 p-1 text-center">{index + 1}</td>
                                <td className="border border-gray-600 p-1 text-center">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                <td className="border border-gray-600 p-1">{lr.truckNo}</td>
                                <td className="border border-gray-600 p-1 text-center">{lr.lrNo}</td>
                                <td className="border border-gray-600 p-1">{lr.fromPlace}</td>
                                <td className="border border-gray-600 p-1">{lr.toPlace}</td>
                                <td className="border border-gray-600 p-1 text-right">{Number(lr.freight).toFixed(2)}</td>
                                <td className="border border-gray-600 p-1 text-right">{totalCharges.toFixed(2)}</td>
                                <td className="border border-gray-600 p-1 text-right">{(Number(lr.freight) + totalCharges).toFixed(2)}</td>
                            </tr>
                        );
                    })}
                    {Array.from({ length: Math.max(0, 15 - sortedLorryReceipts.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} style={{ height: '24px' }}>
                            {Array.from({ length: 9 }).map((_, j) => <td key={j} className="border border-gray-600"></td>)}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="text-black font-bold text-xs">
                    <tr>
                        <td colSpan={6} className="border border-gray-600 p-1 align-top">
                            {/* GSTIN only when GST is enabled */}
                            {showGst && <p>GSTIN : {companyDetails.gstn}</p>}
                            <p className={showGst ? 'mt-1' : ''}>
                                <span>PAN No. : {companyDetails.pan}</span>
                                {companyDetails.sacCode && <span className="ml-4 font-bold">SAC CODE - {companyDetails.sacCode}</span>}
                            </p>
                            <div className="mt-2">
                                <p>BANK DETAILS</p>
                                <p>BANK NAME : {companyDetails.bankDetails?.name}</p>
                                <p>BRANCH : {companyDetails.bankDetails?.branch}</p>
                                <p>A/C NO. : {companyDetails.bankDetails?.accountNo}</p>
                                <p>IFSCCODE : {companyDetails.bankDetails?.ifscCode}</p>
                            </div>
                        </td>
                        <td colSpan={3} className="border border-gray-600 p-0 align-top">
                            <table className="w-full text-xs font-bold">
                                <tbody>
                                    <tr>
                                        <td className="border-b border-gray-600 p-1 bg-blue-100 text-black">AMOUNT</td>
                                        <td className="border-b border-gray-600 p-1 text-right bg-blue-100 text-black">{totalAmount.toFixed(2)}</td>
                                    </tr>
                                    {/* GST rows — only shown when showGst is ON */}
                                    {showGst && taxType === 'intra' && (
                                        <>
                                            <tr>
                                                <td className="border-b border-gray-600 p-1 bg-blue-100 text-black">CGST (9%)</td>
                                                <td className="border-b border-gray-600 p-1 text-right bg-blue-100 text-black">{totalCgst.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="border-b border-gray-600 p-1 bg-blue-100 text-black">SGST (9%)</td>
                                                <td className="border-b border-gray-600 p-1 text-right bg-blue-100 text-black">{totalSgst.toFixed(2)}</td>
                                            </tr>
                                        </>
                                    )}
                                    {showGst && taxType === 'inter' && (
                                         <tr>
                                            <td className="p-1 border-b border-gray-600 bg-blue-100 text-black">IGST (18%)</td>
                                            <td className="p-1 text-right border-b border-gray-600 bg-blue-100 text-black">{totalIgst.toFixed(2)}</td>
                                        </tr>
                                    )}
                                     <tr style={{ height: '60px' }}><td colSpan={2}></td></tr>

                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={6} className="border-x border-b border-gray-600 p-1 align-bottom">
                             <p>Rupees(word): {amountInWords} Rupees Only</p>
                        </td>
                        <td colSpan={3} className="border-x border-b border-gray-600 p-0">
                             <div className="border-t border-gray-600 py-1 px-1 flex justify-between bg-blue-100 text-black font-bold">
                                <span>NET AMOUNT</span>
                                <span>{netAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                             </div>
                        </td>
                    </tr>
                     <tr>
                        <td colSpan={9} className="p-1 align-bottom text-right h-[100px]">
                            <div className="inline-block text-center">
                                {companyDetails.signatureImageUrl && (
                                    <img src={companyDetails.signatureImageUrl} alt="Signature" className="h-16 object-contain mx-auto" />
                                 )}
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
});

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, lorryReceipts, allLorryReceipts, companyDetails, onSaveInvoiceDetails }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [billNo, setBillNo] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [taxType, setTaxType] = useState<'intra' | 'inter'>('intra');
    const [showGst, setShowGst] = useState(true);   // NEW: default ON
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && lorryReceipts.length > 0) {
             const existingInvoiceNo = lorryReceipts[0].invoiceNo;
             
             if (existingInvoiceNo) {
                 setBillNo(existingInvoiceNo);
             } else {
                 // Automated numbering logic
                 
                 let maxNum = -1;
                 let fallbackLatestNo = '';
                 let latestDate = 0;

                 allLorryReceipts.forEach(lr => {
                     if (lr.isInvoiceGenerated && lr.invoiceNo) {
                         // Track fallback by date
                         const dateTime = lr.invoiceDate ? new Date(lr.invoiceDate).getTime() : 0;
                         if (dateTime > latestDate) {
                             latestDate = dateTime;
                             fallbackLatestNo = lr.invoiceNo;
                         }

                         // Try to extract number
                         const match = lr.invoiceNo.match(/(\d+)$/);
                         if (match) {
                             const num = parseInt(match[1], 10);
                             if (num > maxNum) {
                                 maxNum = num;
                                 fallbackLatestNo = lr.invoiceNo;
                             }
                         }
                     }
                 });

                 if (fallbackLatestNo) {
                     setBillNo(getNextSequence(fallbackLatestNo));
                 } else {
                     const companyName = companyDetails.name || '';
                     const cleanName = companyName.replace(/[^a-zA-Z]/g, '');
                     const prefix = (cleanName.substring(0, 3) || 'INV').toUpperCase();
                     setBillNo(`${prefix}-0001`);
                 }
             }
            
            setBillDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, lorryReceipts, allLorryReceipts, companyDetails.name]);


    if (!isOpen) return null;

    const handleDownloadPDF = () => {
        const element = previewRef.current;
        if (!element) return;
        
        const billedTo = lorryReceipts.length > 0 ? (lorryReceipts[0].billingTo?.name ? lorryReceipts[0].billingTo : lorryReceipts[0].consignor) : { name: 'bill' };
        
        const opt = {
            margin:       5, 
            filename:     `Invoice-${billNo}-${billedTo.name?.split(' ')[0]}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(element).set(opt).save();
    };

    const handleSaveDetails = async () => {
        if (onSaveInvoiceDetails) {
            setIsSaving(true);
            try {
                const lrNos = lorryReceipts.map(lr => lr.lrNo);
                await onSaveInvoiceDetails(lrNos, billNo, billDate);
                // Automatically download PDF upon successful save
                handleDownloadPDF();
                onClose();
            } catch (error) {
                // error handled in parent
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-start p-2 sm:p-4 overflow-auto">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl my-8">
                <div className="p-4 bg-gray-100 rounded-t-lg flex flex-wrap justify-between items-center gap-4 sticky top-0 z-10">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Tax Invoice Preview</h2>
                     <div className="flex items-center gap-4 bg-white p-2 rounded-md border shadow-sm flex-wrap">
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Invoice No.</label>
                            <input 
                                type="text"
                                value={billNo}
                                onChange={(e) => setBillNo(e.target.value)}
                                className="p-1 border rounded-md text-sm w-40 font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Invoice Date</label>
                             <input 
                                type="date"
                                value={billDate}
                                onChange={(e) => setBillDate(e.target.value)}
                                className="p-1 border rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Tax Type</label>
                            <select
                                value={taxType}
                                onChange={(e) => setTaxType(e.target.value as 'intra' | 'inter')}
                                className="p-1 border rounded-md text-sm"
                                disabled={!showGst}
                            >
                                <option value="intra">CGST &amp; SGST</option>
                                <option value="inter">IGST</option>
                            </select>
                        </div>

                        {/* ── NEW: GST Toggle ── */}
                        <div className="flex flex-col items-center justify-center">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Include GST</label>
                            <button
                                type="button"
                                onClick={() => setShowGst(prev => !prev)}
                                title={showGst ? 'Click to hide GST' : 'Click to show GST'}
                                className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                                    showGst ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-300 ${
                                    showGst ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                            <span className={`text-[11px] font-bold mt-0.5 ${showGst ? 'text-green-600' : 'text-gray-400'}`}>
                                {showGst ? '✓ With GST' : '✗ No GST'}
                            </span>
                        </div>
                        {/* ── END GST Toggle ── */}

                    </div>
                    <div className="flex items-center space-x-2">
                        {onSaveInvoiceDetails && (
                            <button 
                                onClick={handleSaveDetails} 
                                disabled={isSaving}
                                className="flex items-center bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400"
                            >
                                <SaveIcon className="w-5 h-5 mr-1"/>
                                {isSaving ? 'Saving...' : 'Save & Download PDF'}
                            </button>
                        )}
                        <button onClick={handleDownloadPDF} className="flex items-center bg-ssk-red text-white px-3 py-2 rounded-md hover:bg-red-700 font-semibold">
                            <DownloadIcon className="w-5 h-5 mr-1"/>Download PDF Only
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-300">
                            <XIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>
                <div className="p-2 sm:p-4 overflow-x-auto">
                    <InvoiceContent
                        ref={previewRef}
                        lorryReceipts={lorryReceipts}
                        companyDetails={companyDetails}
                        billNo={billNo}
                        billDate={billDate}
                        taxType={taxType}
                        showGst={showGst}
                    />
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
