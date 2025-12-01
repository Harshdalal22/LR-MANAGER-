import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { LorryReceipt, CompanyDetails, PartyDetails } from '../types';
import { DownloadIcon, XIcon, SaveIcon } from './icons';
import { toWords } from '../utils/numberToWords';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    lorryReceipts: LorryReceipt[];
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
}

const InvoiceContent = forwardRef<HTMLDivElement, InvoiceContentProps>(({ lorryReceipts, companyDetails, billNo, billDate, taxType }, ref) => {
    const totalAmount = lorryReceipts.reduce((sum, lr) => {
        const totalCharges = (Object.values(lr.charges || {}) as number[]).reduce((chargeSum: number, charge: number) => chargeSum + (charge || 0), 0);
        return sum + (Number(lr.freight) || 0) + totalCharges;
    }, 0);

    const totalCgst = taxType === 'intra' ? totalAmount * 0.025 : 0;
    const totalSgst = taxType === 'intra' ? totalAmount * 0.025 : 0;
    const totalIgst = taxType === 'inter' ? totalAmount * 0.05 : 0;
    
    const netAmount = totalAmount + totalCgst + totalSgst + totalIgst;
    const amountInWords = toWords(Math.round(netAmount));

    const billedTo: Partial<PartyDetails> = lorryReceipts.length > 0 ? (lorryReceipts[0].billingTo?.name ? lorryReceipts[0].billingTo : lorryReceipts[0].consignor) : { name: 'N/A', address: 'N/A', gst: 'N/A' };
    
    const formattedBillDate = billDate ? new Date(billDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';


    return (
        <div ref={ref} className="printable-area p-4 bg-white text-black font-['Calibri',sans-serif] w-[710px] lg:w-full mx-auto border border-gray-600 text-sm">
            {/* Header - "JAI DADA UDMI RAM" removed as requested */}
            <div className="text-center text-black">
                <p className="text-xs">SUBJECT TO HARYANA JURISDICTION</p>
            </div>
            
            <div className="flex justify-between items-center mt-1 pb-2 border-b border-gray-600">
                <div className="w-1/4 flex justify-start">
                     {companyDetails.logoUrl ? 
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-16 w-auto object-contain" /> :
                        <div className="h-16 w-32 border bg-gray-200 flex items-center justify-center text-xs text-center">No Logo</div>
                    }
                </div>
                <div className="w-1/2 text-center text-black">
                    <h1 className="text-3xl font-bold text-red-600">SSK CARGO SERVICES Pvt. Ltd.</h1>
                    <p className="font-bold text-base">(Fleet Owner & Contractor)</p>
                    <p className="text-xs mt-1">{companyDetails.address}</p>
                    <p className="text-xs">
                        Mail-{companyDetails.email}, Web-
                    </p>
                </div>
                <div className="w-1/4 text-right font-bold text-xs text-black">
                    {companyDetails.contact.map(c => <p key={c}>{c}</p>)}
                </div>
            </div>

            <div className="flex justify-between items-start mt-2 text-black">
                <div className="w-2/3">
                    <p className="font-bold">M/S :</p>
                    <p className="font-bold">{billedTo.name}</p>
                    <p>{billedTo.address}</p>
                </div>
                <div className="w-1/3 text-left pl-10">
                    <p className="font-bold">BILL NO. : {billNo}</p>
                    <p className="font-bold">DATE : {formattedBillDate}</p>
                </div>
            </div>
            <p className="font-bold text-black mt-2">GST :- {billedTo.gst}</p>

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
                    {lorryReceipts.map((lr, index) => {
                        const totalCharges = (Object.values(lr.charges || {}) as number[]).reduce((chargeSum: number, charge: number) => chargeSum + (charge || 0), 0);
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
                    {Array.from({ length: Math.max(0, 15 - lorryReceipts.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} style={{ height: '24px' }}>
                            {Array.from({ length: 9 }).map((_, j) => <td key={j} className="border border-gray-600"></td>)}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="text-black font-bold text-xs">
                    <tr>
                        <td colSpan={6} className="border border-gray-600 p-1 align-top">
                            <p>GSTIN : {companyDetails.gstn}</p>
                            <p className="mt-1">PAN No. : {companyDetails.pan}</p>
                            <div className="mt-2">
                                <p>BANK DETAILS</p>
                                <p>BANK NAME : {companyDetails.bankDetails.name}</p>
                                <p>BRANCH : {companyDetails.bankDetails.branch}</p>
                                <p>A/C NO. : {companyDetails.bankDetails.accountNo}</p>
                                <p>IFSCCODE : {companyDetails.bankDetails.ifscCode}</p>
                            </div>
                        </td>
                        <td colSpan={3} className="border border-gray-600 p-0 align-top">
                            <table className="w-full text-xs font-bold">
                                <tbody>
                                    <tr>
                                        <td className="border-b border-gray-600 p-1 bg-blue-100 text-black">AMOUNT</td>
                                        <td className="border-b border-gray-600 p-1 text-right bg-blue-100 text-black">{totalAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border-b border-gray-600 p-1 bg-blue-100 text-black">CGST (2.5%)</td>
                                        <td className="border-b border-gray-600 p-1 text-right bg-blue-100 text-black">{totalCgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border-b border-gray-600 p-1 bg-blue-100 text-black">SGST (2.5%)</td>
                                        <td className="border-b border-gray-600 p-1 text-right bg-blue-100 text-black">{totalSgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-1 h-[60px] align-top bg-blue-100 text-black">IGST (5%)</td>
                                        <td className="p-1 text-right align-top bg-blue-100 text-black">{totalIgst.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={6} className="border-x border-b border-gray-600 p-1 align-bottom">
                             <p>Rupees(word): {amountInWords} Rupees</p>
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

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, lorryReceipts, companyDetails, onSaveInvoiceDetails }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [billNo, setBillNo] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [taxType, setTaxType] = useState<'intra' | 'inter'>('intra');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && lorryReceipts.length > 0) {
            // Suggest a bill number: try to see if the first LR has one, otherwise generate
             const existingInvoiceNo = lorryReceipts[0].invoiceNo;
             const suggestedBillNo = existingInvoiceNo 
                ? existingInvoiceNo 
                : `INV-${new Date().getFullYear()}-${String(lorryReceipts.length).padStart(4, '0')}`;
            
            setBillNo(suggestedBillNo);
            setBillDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, lorryReceipts]);


    if (!isOpen) return null;

    const handleDownloadPDF = () => {
        const element = previewRef.current;
        if (!element) return;
        
        const billedTo = lorryReceipts.length > 0 ? (lorryReceipts[0].billingTo?.name ? lorryReceipts[0].billingTo : lorryReceipts[0].consignor) : { name: 'bill' };
        
        const opt = {
            margin:       10, // 10mm margin on all sides
            filename:     `Bill-${billNo}-${billedTo.name?.split(' ')[0]}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
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
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Invoice Preview</h2>
                     <div className="flex items-center gap-4 bg-white p-2 rounded-md border shadow-sm flex-wrap">
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Bill No.</label>
                            <input 
                                type="text"
                                value={billNo}
                                onChange={(e) => setBillNo(e.target.value)}
                                className="p-1 border rounded-md text-sm w-40"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Bill Date</label>
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
                            >
                                <option value="intra">CGST & SGST</option>
                                <option value="inter">IGST</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {onSaveInvoiceDetails && (
                            <button 
                                onClick={handleSaveDetails} 
                                disabled={isSaving}
                                className="flex items-center bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400"
                            >
                                <SaveIcon className="w-5 h-5 mr-1"/>
                                {isSaving ? 'Saving...' : 'Save & Update LRs'}
                            </button>
                        )}
                        <button onClick={handleDownloadPDF} className="flex items-center bg-ssk-red text-white px-3 py-2 rounded-md hover:bg-red-700 font-semibold">
                            <DownloadIcon className="w-5 h-5 mr-1"/>Download PDF
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-300">
                            <XIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>
                <div className="p-2 sm:p-4 overflow-x-auto">
                    <InvoiceContent ref={previewRef} lorryReceipts={lorryReceipts} companyDetails={companyDetails} billNo={billNo} billDate={billDate} taxType={taxType} />
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;