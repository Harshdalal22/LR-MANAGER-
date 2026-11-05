import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LorryReceipt, CompanyDetails, PartyDetails, InvoiceRowItem } from '../types';
import { DownloadIcon, XIcon, SaveIcon, PrintIcon } from './icons';
import { toWords } from '../utils/numberToWords';
import { getNextSequence } from '../utils/sequenceUtils';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    lorryReceipts: LorryReceipt[];
    allLorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    onSaveInvoiceDetails?: (
        lrNos: string[], 
        invoiceNo: string, 
        invoiceDate: string, 
        rowDetails?: InvoiceRowItem[], 
        invoiceNote?: string
    ) => Promise<void>;
}

interface InvoiceContentProps {
    invoiceRows: InvoiceRowItem[];
    onRowChange: (lrNo: string, field: keyof InvoiceRowItem, value: any) => void;
    billedTo: Partial<PartyDetails>;
    companyDetails: CompanyDetails;
    billNo: string;
    billDate: string;
    taxType: 'intra' | 'inter';
    showGst: boolean;
    showFromColumn: boolean;
    note: string;
    onNoteChange: (val: string) => void;
    tableNote: string;
    onTableNoteChange: (val: string) => void;
    isExporting: boolean;
}

const formatDateDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return dateStr;
    }
};

const InvoiceContent = forwardRef<HTMLDivElement, InvoiceContentProps>(({
    invoiceRows,
    onRowChange,
    billedTo,
    companyDetails,
    billNo,
    billDate,
    taxType,
    showGst,
    showFromColumn,
    note,
    onNoteChange,
    tableNote,
    onTableNoteChange,
    isExporting
}, ref) => {
    // Calculations
    const totalFreight = invoiceRows.reduce((sum, r) => sum + (Number(r.freight) || 0), 0);
    const totalExtraPoint = invoiceRows.reduce((sum, r) => sum + (Number(r.extraPoint) || 0), 0);
    const totalDetention = invoiceRows.reduce((sum, r) => sum + (Number(r.detention) || 0), 0);
    const totalAmount = invoiceRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    // GST amounts — only applied when showGst is true
    const totalCgst = (showGst && taxType === 'intra') ? totalAmount * 0.09 : 0;
    const totalSgst = (showGst && taxType === 'intra') ? totalAmount * 0.09 : 0;
    const totalIgst = (showGst && taxType === 'inter') ? totalAmount * 0.18 : 0;

    const netAmount = totalAmount + totalCgst + totalSgst + totalIgst;
    const amountInWords = toWords(Math.round(netAmount));

    const formattedBillDate = billDate ? formatDateDDMMYYYY(billDate) : '';

    const numCols = 11;
    const emptyRowCount = Math.max(0, 14 - invoiceRows.length);

    return (
        <div ref={ref} className="printable-area p-5 bg-white text-black font-['Calibri',sans-serif] w-[750px] mx-auto border border-gray-600 text-xs shadow-sm">
            {/* Header Title */}
            <div className="flex justify-between items-start text-black mb-1">
                <div className="w-1/4"></div>
                <div className="w-1/2 text-center">
                    <h2 className="font-bold text-xl underline tracking-wider">
                        {showGst ? 'TAX INVOICE' : 'INVOICE'}
                    </h2>
                </div>
                <div className="w-1/4 text-right">
                    <p className="text-[10px] font-bold text-gray-700">
                        SUBJECT TO {companyDetails.jurisdictionCity ? companyDetails.jurisdictionCity.toUpperCase() : 'ROHTAK'} JURISDICTION
                    </p>
                </div>
            </div>

            {/* Company Info Banner */}
            <div className="flex justify-between items-center pb-2 border-b-2 border-black gap-2">
                <div className="w-24 flex-shrink-0 flex justify-start items-center">
                    {companyDetails.logoUrl ? (
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-14 max-w-[90px] object-contain" />
                    ) : (
                        <div className="h-12 w-20 border border-gray-400 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400 font-semibold uppercase">
                            No Logo
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center text-black min-w-0 px-2 space-y-0.5">
                    <h1 className="text-xl sm:text-[22px] font-black text-red-600 tracking-normal uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                        {companyDetails.name || 'SSK CARGO SERVICES PRIVATE LIMITED'}
                    </h1>
                    {/* Single Company Address from Settings */}
                    {companyDetails.address && (
                        <p className="text-[10.5px] mt-0.5 text-gray-800 font-medium leading-tight">
                            <span className="font-bold text-gray-900">Address: </span>
                            {companyDetails.address.replace(/\r?\n+/g, ', ').trim()}
                        </p>
                    )}
                    {/* Contact & Email (just like LR) */}
                    {((companyDetails.contact && companyDetails.contact.length > 0) || companyDetails.email) && (
                        <p className="text-[10px] text-gray-700 leading-tight">
                            {companyDetails.contact && companyDetails.contact.length > 0 && (
                                <><span className="font-bold text-gray-900">Phone: </span><span>{companyDetails.contact.join(', ')}</span></>
                            )}
                            {companyDetails.contact && companyDetails.contact.length > 0 && companyDetails.email && ' • '}
                            {companyDetails.email && (
                                <><span className="font-bold text-gray-900">Email: </span><span>{companyDetails.email}</span></>
                            )}
                        </p>
                    )}
                    {/* GSTIN & PAN (just like LR) */}
                    {(companyDetails.gstn || companyDetails.pan) && (
                        <p className="text-[10px] text-gray-800 font-semibold leading-tight">
                            {companyDetails.gstn && (
                                <><span className="font-bold text-gray-900">GSTIN: </span><span className="font-mono">{companyDetails.gstn}</span></>
                            )}
                            {companyDetails.gstn && companyDetails.pan && ' • '}
                            {companyDetails.pan && (
                                <><span className="font-bold text-gray-900">PAN: </span><span className="font-mono">{companyDetails.pan}</span></>
                            )}
                        </p>
                    )}
                </div>
                <div className="w-24 flex-shrink-0">
                    {/* Right spacer to keep center text perfectly centered */}
                </div>
            </div>

            {/* Billed To & Bill No / Date */}
            <div className="flex justify-between items-start mt-2 pb-1 text-black">
                <div className="w-3/5 text-xs">
                    <p className="font-bold text-[13px] tracking-wide text-gray-900">
                        M/S {billedTo.name || ''}
                    </p>
                    {billedTo.address && (
                        <p className="text-gray-800 font-medium text-[11px] leading-tight mt-0.5">
                            {billedTo.address.replace(/\r?\n+/g, ', ').trim()}
                        </p>
                    )}
                    {showGst && billedTo.gst && (
                        <p className="font-bold text-[11px] text-black mt-1">
                            GST NO: <span className="font-mono">{billedTo.gst}</span>
                        </p>
                    )}
                </div>
                <div className="w-2/5 text-right text-xs space-y-1">
                    <p className="font-bold text-[13px]">
                        BILL NO- <span className="font-mono text-black font-extrabold">{billNo}</span>
                    </p>
                    <p className="font-bold text-[12px]">
                        DATE- <span className="font-mono">{formattedBillDate}</span>
                    </p>
                </div>
            </div>

            {/* Main Table */}
            <table className="w-full border-collapse border border-gray-700 mt-2 text-xs text-black">
                <thead className="font-bold text-center bg-[#fed7aa]/50 border-b border-gray-700 text-[11px]">
                    <tr>
                        <th className="border border-gray-600 p-1 w-[5%] uppercase">SR. NO</th>
                        <th className="border border-gray-600 p-1 w-[9%] uppercase">Date</th>
                        <th className="border border-gray-600 p-1 w-[12%] uppercase">VEHICLE NO.</th>
                        <th className="border border-gray-600 p-1 w-[9%] uppercase">LR NUMBER</th>
                        <th className="border border-gray-600 p-1 w-[11%] uppercase">GATE PASS NO</th>
                        <th className="border border-gray-600 p-1 w-[10%] uppercase">FROM</th>
                        <th className="border border-gray-600 p-1 w-[10%] uppercase">TO</th>
                        <th className="border border-gray-600 p-1 w-[10%] uppercase">FREIGHT</th>
                        <th className="border border-gray-600 p-1 w-[8%] uppercase">EXTRA POINT</th>
                        <th className="border border-gray-600 p-1 w-[8%] uppercase">DETENTION</th>
                        <th className="border border-gray-600 p-1 w-[8%] uppercase bg-[#fed7aa]/70">TOTAL FREIGHT</th>
                    </tr>
                </thead>
                <tbody className="text-[11px]">
                    {invoiceRows.map((row, index) => (
                        <tr key={row.lrNo} style={{ height: '23px' }}>
                            <td className="border border-gray-600 p-0.5 text-center font-medium">
                                {index + 1}
                            </td>
                            <td className="border border-gray-600 p-0.5 text-center whitespace-nowrap font-mono text-[10.5px]">
                                {formatDateDDMMYYYY(row.date)}
                            </td>
                            <td className="border border-gray-600 p-0.5 text-center font-bold whitespace-nowrap">
                                {row.truckNo}
                            </td>
                            <td className="border border-gray-600 p-0.5 text-center font-mono">
                                {row.lrNo}
                            </td>
                            <td className="border border-gray-600 p-0 text-center">
                                {isExporting ? (
                                    <span className="font-mono text-[10.5px] px-1">{row.gatePassNo || '-'}</span>
                                ) : (
                                    <input
                                        type="text"
                                        value={row.gatePassNo}
                                        onChange={(e) => onRowChange(row.lrNo, 'gatePassNo', e.target.value)}
                                        placeholder="Gate Pass"
                                        title="Click to edit Gate Pass No."
                                        className="w-full text-center bg-transparent border-0 border-b border-transparent hover:border-gray-400 focus:border-blue-500 focus:bg-amber-50 outline-none text-[11px] font-mono py-0.5 px-0.5"
                                    />
                                )}
                            </td>
                            <td className="border border-gray-600 p-0 text-left">
                                {isExporting ? (
                                    <span className="px-1 font-medium">{row.fromPlace}</span>
                                ) : (
                                    <input
                                        type="text"
                                        value={row.fromPlace}
                                        onChange={(e) => onRowChange(row.lrNo, 'fromPlace', e.target.value)}
                                        placeholder="From"
                                        className="w-full text-left bg-transparent border-0 border-b border-transparent hover:border-gray-400 focus:border-blue-500 focus:bg-amber-50 outline-none text-[11px] py-0.5 px-1 font-medium"
                                    />
                                )}
                            </td>
                            <td className="border border-gray-600 p-0 text-left">
                                {isExporting ? (
                                    <span className="px-1 font-medium">{row.toPlace}</span>
                                ) : (
                                    <input
                                        type="text"
                                        value={row.toPlace}
                                        onChange={(e) => onRowChange(row.lrNo, 'toPlace', e.target.value)}
                                        placeholder="Destination"
                                        className="w-full text-left bg-transparent border-0 border-b border-transparent hover:border-gray-400 focus:border-blue-500 focus:bg-amber-50 outline-none text-[11px] py-0.5 px-1 font-medium"
                                    />
                                )}
                            </td>
                            <td className="border border-gray-600 p-0 text-right">
                                {isExporting ? (
                                    <span className="px-1">{Number(row.freight).toFixed(2)}</span>
                                ) : (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={row.freight || ''}
                                        onChange={(e) => onRowChange(row.lrNo, 'freight', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        title="Click to edit Freight"
                                        className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-400 focus:border-blue-500 focus:bg-amber-50 outline-none text-[11px] py-0.5 px-1"
                                    />
                                )}
                            </td>
                            <td className="border border-gray-600 p-0 text-right">
                                {isExporting ? (
                                    <span className="px-1">{Number(row.extraPoint).toFixed(2)}</span>
                                ) : (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={row.extraPoint || ''}
                                        onChange={(e) => onRowChange(row.lrNo, 'extraPoint', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        title="Click to edit Extra Point"
                                        className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-400 focus:border-blue-500 focus:bg-amber-50 outline-none text-[11px] py-0.5 px-1 font-medium"
                                    />
                                )}
                            </td>
                            <td className="border border-gray-600 p-0 text-right">
                                {isExporting ? (
                                    <span className="px-1">{Number(row.detention).toFixed(2)}</span>
                                ) : (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={row.detention || ''}
                                        onChange={(e) => onRowChange(row.lrNo, 'detention', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        title="Click to edit Detention"
                                        className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-400 focus:border-blue-500 focus:bg-amber-50 outline-none text-[11px] py-0.5 px-1 font-medium"
                                    />
                                )}
                            </td>
                            <td className="border border-gray-600 p-1 text-right font-bold bg-amber-50/30">
                                {Number(row.total).toFixed(2)}
                            </td>
                        </tr>
                    ))}

                    {/* Empty placeholder rows to fill A4 format nicely */}
                    {Array.from({ length: emptyRowCount }).map((_, i) => (
                        <tr key={`empty-${i}`} style={{ height: '22px' }}>
                            {Array.from({ length: 11 }).map((_, j) => (
                                <td key={j} className="border border-gray-600"></td>
                            ))}
                        </tr>
                    ))}

                    {/* Table NOTE Row — just above TOTAL, merged under FROM (Col 6), TO (Col 7), FREIGHT (Col 8) */}
                    <tr className="border-t border-gray-500" style={{ height: '24px' }}>
                        <td className="border border-gray-600 p-0.5"></td>
                        <td className="border border-gray-600 p-0.5"></td>
                        <td className="border border-gray-600 p-0.5"></td>
                        <td className="border border-gray-600 p-0.5"></td>
                        <td className="border border-gray-600 p-0.5"></td>
                        {/* Merged under FROM, TO, FREIGHT */}
                        <td colSpan={3} className="border border-gray-600 p-0 text-left bg-yellow-50/40">
                            <div className="flex items-center gap-1 px-1.5 py-0.5">
                                <span className="font-bold text-[10px] text-gray-700 whitespace-nowrap">NOTE:</span>
                                {isExporting ? (
                                    <span className="text-[10px] text-gray-800 italic px-1 font-semibold">{tableNote || ''}</span>
                                ) : (
                                    <input
                                        type="text"
                                        value={tableNote}
                                        onChange={(e) => onTableNoteChange(e.target.value)}
                                        placeholder="Note under From, To & Freight..."
                                        title="Type note under From, To, Freight"
                                        className="w-full text-[10px] text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-300 focus:border-blue-500 outline-none py-0.5 px-0.5 font-sans font-medium"
                                    />
                                )}
                            </div>
                        </td>
                        <td className="border border-gray-600 p-0.5"></td>
                        <td className="border border-gray-600 p-0.5"></td>
                        <td className="border border-gray-600 p-0.5 bg-amber-50/30"></td>
                    </tr>

                    {/* Table TOTAL Row */}
                    <tr className="bg-[#fed7aa]/50 font-bold text-black border-t-2 border-gray-700">
                        <td colSpan={7} className="border border-gray-600 p-1 text-center tracking-wider text-xs font-extrabold">
                            TOTAL
                        </td>
                        <td className="border border-gray-600 p-1 text-right text-[11px] font-bold">
                            {totalFreight > 0 ? totalFreight.toFixed(2) : ''}
                        </td>
                        <td className="border border-gray-600 p-1 text-right text-[11px] font-bold">
                            {totalExtraPoint.toFixed(2)}
                        </td>
                        <td className="border border-gray-600 p-1 text-right text-[11px] font-bold">
                            {totalDetention.toFixed(2)}
                        </td>
                        <td className="border border-gray-600 p-1 text-right text-xs font-extrabold bg-[#fed7aa]/80">
                            {totalAmount.toFixed(2)}
                        </td>
                    </tr>
                </tbody>

                {/* Table Footer: Bank Details & Tax Summary */}
                <tfoot className="text-black font-bold text-xs">
                    <tr>
                        {/* Left Side: Bank Details, PAN, In Words, Note */}
                        <td colSpan={6} className="border border-gray-600 p-2 align-top text-xs">
                            <div className="space-y-0.5 text-[11px]">
                                <p><span className="font-bold">PAN NUMBER : </span>{companyDetails.pan || 'N/A'}</p>
                                <p><span className="font-bold">GST NUMBER : </span>{companyDetails.gstn || 'N/A'}</p>
                                <p><span className="font-bold">BANK NAME : </span>{companyDetails.bankDetails?.name || 'N/A'}</p>
                                <p><span className="font-bold">A/C NUMBER : </span>{companyDetails.bankDetails?.accountNo || 'N/A'}</p>
                                <p><span className="font-bold">IFSC CODE : </span>{companyDetails.bankDetails?.ifscCode || 'N/A'}</p>
                                <p><span className="font-bold">BRANCH : </span>{companyDetails.bankDetails?.branch || 'N/A'}</p>
                                {companyDetails.sacCode && (
                                    <p><span className="font-bold">SAC CODE : </span>{companyDetails.sacCode}</p>
                                )}
                            </div>

                            {/* In Words */}
                            <div className="mt-2 pt-1 border-t border-gray-400">
                                <p className="font-bold text-[11px] leading-tight">
                                    IN WORDS : <span className="font-semibold text-gray-900">{amountInWords.toUpperCase()} ONLY</span>
                                </p>
                            </div>

                            {/* Note Section (User requested: Neeche note likhne ka option de do) */}
                            <div className="mt-2 pt-1.5 border-t border-dashed border-gray-400">
                                <div className="flex items-start gap-1">
                                    <span className="font-bold text-[11px] text-gray-900 whitespace-nowrap">NOTE :</span>
                                    {isExporting ? (
                                        <span className="text-[11px] text-gray-800 font-medium italic">
                                            {note || '-'}
                                        </span>
                                    ) : (
                                        <textarea
                                            rows={2}
                                            value={note}
                                            onChange={(e) => onNoteChange(e.target.value)}
                                            placeholder="Neeche note likhne ke liye yahan type karein..."
                                            title="Click to type custom Note on bill"
                                            className="w-full text-[11px] text-gray-800 bg-amber-50/50 hover:bg-amber-50 focus:bg-white border border-dashed border-gray-300 focus:border-blue-500 rounded p-1 outline-none resize-none font-sans"
                                        />
                                    )}
                                </div>
                            </div>
                        </td>

                        {/* Right Side: Tax Calculations & Signatory */}
                        <td colSpan={5} className="border border-gray-600 p-0 align-top">
                            <table className="w-full text-xs font-bold border-collapse">
                                <tbody>
                                    <tr className="border-b border-gray-600">
                                        <td className="p-1.5 bg-[#fed7aa]/30 border-r border-gray-600 text-[11px]">TAXABLE AMOUNT</td>
                                        <td className="p-1.5 text-right font-mono text-[11px]">{totalAmount.toFixed(2)}</td>
                                    </tr>

                                    {/* GST rows — only shown when showGst is ON */}
                                    {showGst && taxType === 'intra' && (
                                        <>
                                            <tr className="border-b border-gray-600">
                                                <td className="p-1.5 bg-[#fed7aa]/30 border-r border-gray-600 text-[11px]">SGST (9%)</td>
                                                <td className="p-1.5 text-right font-mono text-[11px]">{totalSgst.toFixed(2)}</td>
                                            </tr>
                                            <tr className="border-b border-gray-600">
                                                <td className="p-1.5 bg-[#fed7aa]/30 border-r border-gray-600 text-[11px]">CGST (9%)</td>
                                                <td className="p-1.5 text-right font-mono text-[11px]">{totalCgst.toFixed(2)}</td>
                                            </tr>
                                        </>
                                    )}

                                    {showGst && taxType === 'inter' && (
                                        <tr className="border-b border-gray-600">
                                            <td className="p-1.5 bg-[#fed7aa]/30 border-r border-gray-600 text-[11px]">IGST (18%)</td>
                                            <td className="p-1.5 text-right font-mono text-[11px]">{totalIgst.toFixed(2)}</td>
                                        </tr>
                                    )}

                                    {/* TOTAL AMOUNT */}
                                    <tr className="bg-[#fed7aa] font-extrabold text-xs sm:text-sm border-t-2 border-gray-700">
                                        <td className="p-2 border-r border-gray-600 text-black">TOTAL AMOUNT</td>
                                        <td className="p-2 text-right text-black font-mono">
                                            {netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Signatory Box */}
                            <div className="p-2 text-right mt-6">
                                <p className="font-bold text-[11px] text-black uppercase">
                                    {companyDetails.name || 'SSK CARGO SERVICES PRIVATE LIMITED'}
                                </p>
                                <div className="h-12 flex items-center justify-end my-1">
                                    {companyDetails.signatureImageUrl ? (
                                        <img src={companyDetails.signatureImageUrl} alt="Signature" className="h-12 object-contain" />
                                    ) : (
                                        <div className="h-8"></div>
                                    )}
                                </div>
                                <p className="text-[11px] font-bold text-black border-t border-gray-500 inline-block pt-0.5">
                                    Authorized Signatory
                                </p>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
});

const InvoiceModal: React.FC<InvoiceModalProps> = ({ 
    isOpen, 
    onClose, 
    lorryReceipts, 
    allLorryReceipts, 
    companyDetails, 
    onSaveInvoiceDetails 
}) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const printRoot = document.getElementById('print-root');
    const [billNo, setBillNo] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [taxType, setTaxType] = useState<'intra' | 'inter'>('intra');
    const [showGst, setShowGst] = useState(true);
    const [showFromColumn, setShowFromColumn] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Note state
    const [note, setNote] = useState<string>('');
    // Table-level note (above TOTAL row, in merged From/To/Freight cells)
    const [tableNote, setTableNote] = useState<string>('');

    // State for individual LR rows
    const [invoiceRows, setInvoiceRows] = useState<InvoiceRowItem[]>([]);

    // Ref to debounce auto-saving to DB
    const autoSaveTimerRef = useRef<any>(null);
    // Ref to track initialized invoice to avoid overwriting during session
    const activeInvoiceKeyRef = useRef<string>('');

    // Save state directly to localStorage to guarantee data is never lost
    const persistToLocalStorage = (
        bNo: string, 
        bDate: string, 
        tType: 'intra' | 'inter', 
        sGst: boolean, 
        sFrom: boolean, 
        currentNote: string, 
        currentTableNote: string,
        rows: InvoiceRowItem[]
    ) => {
        if (!bNo) return;
        try {
            const payload = {
                billNo: bNo,
                billDate: bDate,
                taxType: tType,
                showGst: sGst,
                showFromColumn: true,
                note: currentNote,
                tableNote: currentTableNote,
                rows: rows.reduce((acc, r) => {
                    acc[r.lrNo] = {
                        gatePassNo: r.gatePassNo,
                        fromPlace: r.fromPlace,
                        freight: r.freight,
                        extraPoint: r.extraPoint,
                        detention: r.detention,
                        toPlace: r.toPlace,
                        total: r.total
                    };
                    return acc;
                }, {} as Record<string, any>)
            };
            localStorage.setItem(`bilty_inv_custom_${bNo}`, JSON.stringify(payload));
            localStorage.setItem('bilty_invoice_note', currentNote);
        } catch (e) {}
    };

    // Debounced auto-save function
    const triggerDebouncedAutoSave = (
        updatedRows: InvoiceRowItem[], 
        updatedNote: string, 
        bNo: string, 
        bDate: string
    ) => {
        if (!onSaveInvoiceDetails || !bNo) return;
        setSaveStatus('saving');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                const lrNos = updatedRows.map(r => r.lrNo);
                await onSaveInvoiceDetails(lrNos, bNo, bDate, updatedRows, updatedNote);
                setSaveStatus('saved');
            } catch (err) {
                console.warn('Auto-save error:', err);
                setSaveStatus('idle');
            }
        }, 800);
    };

    useEffect(() => {
        if (!isOpen || lorryReceipts.length === 0) {
            activeInvoiceKeyRef.current = '';
            setSaveStatus('idle');
            return;
        }

        // Sort LRs by LR Number ascending
        const sorted = [...lorryReceipts].sort((a, b) => 
            a.lrNo.localeCompare(b.lrNo, undefined, { numeric: true, sensitivity: 'base' })
        );

        // Compute unique key for this session (Do NOT use lr.invoiceNo which is the party material invoice!)
        const existingFreightBillNo = lorryReceipts[0]?.freightBillNo || lorryReceipts[0]?.charges?.freightBillNo;
        const sessionKey = `${existingFreightBillNo || 'NEW'}_${sorted.map(l => l.lrNo).join(',')}`;
        
        // Prevent re-initialization if already editing this exact modal session
        if (activeInvoiceKeyRef.current === sessionKey) {
            return;
        }
        activeInvoiceKeyRef.current = sessionKey;

        // Resolve Bill No - only use previous freightBillNo, otherwise generate fresh sequence
        let resolvedBillNo = existingFreightBillNo;
        if (!resolvedBillNo) {
            let maxNum = -1;
            let fallbackLatestNo = '';
            let latestDate = 0;

            allLorryReceipts.forEach(lr => {
                const fNo = lr.freightBillNo || lr.charges?.freightBillNo;
                if (lr.isInvoiceGenerated && fNo) {
                    const dateTime = (lr.freightBillDate || lr.charges?.freightBillDate) ? new Date(lr.freightBillDate || lr.charges?.freightBillDate!).getTime() : 0;
                    if (dateTime > latestDate) {
                        latestDate = dateTime;
                        fallbackLatestNo = fNo;
                    }
                    const match = fNo.match(/(\d+)$/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) {
                            maxNum = num;
                            fallbackLatestNo = fNo;
                        }
                    }
                }
            });

            if (fallbackLatestNo) {
                resolvedBillNo = getNextSequence(fallbackLatestNo);
            } else {
                const companyName = companyDetails.name || '';
                const cleanName = companyName.replace(/[^a-zA-Z]/g, '');
                const prefix = (cleanName.substring(0, 3) || 'INV').toUpperCase();
                resolvedBillNo = `${prefix}-0001`;
            }
        }
        setBillNo(resolvedBillNo);

        // Check for saved invoice customizations from localStorage
        let savedCustom: any = null;
        try {
            const raw = localStorage.getItem(`bilty_inv_custom_${resolvedBillNo}`);
            if (raw) savedCustom = JSON.parse(raw);
        } catch {}

        // Resolve Note
        let resolvedNote = '';
        if (savedCustom?.note !== undefined) {
            resolvedNote = savedCustom.note;
        } else {
            const lrWithNote = lorryReceipts.find(lr => lr.charges?.invoiceNote || lr.invoiceNote);
            resolvedNote = lrWithNote ? (lrWithNote.charges?.invoiceNote || lrWithNote.invoiceNote || '') : (localStorage.getItem('bilty_invoice_note') || '');
        }
        setNote(resolvedNote);

        // Resolve Table Note
        setTableNote(savedCustom?.tableNote || '');

        // Resolve Date
        if (savedCustom?.billDate) {
            setBillDate(savedCustom.billDate);
        } else {
            const rawDate = lorryReceipts[0]?.invoiceDate;
            setBillDate(rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        }

        // Resolve Tax Type & Toggles
        if (savedCustom?.taxType) setTaxType(savedCustom.taxType);
        if (savedCustom?.showGst !== undefined) setShowGst(savedCustom.showGst);
        setShowFromColumn(true); // Permanent FROM column

        // Populate rows with saved or initial fields
        const initialRows: InvoiceRowItem[] = sorted.map(lr => {
            const savedRow = savedCustom?.rows?.[lr.lrNo];

            const ep = savedRow?.extraPoint !== undefined 
                ? Number(savedRow.extraPoint) 
                : Number(lr.charges?.extraPoint ?? lr.charges?.extraCharge ?? lr.charges?.otherCharge ?? lr.extraPoint ?? 0);
            
            const dt = savedRow?.detention !== undefined 
                ? Number(savedRow.detention) 
                : Number(lr.charges?.detention ?? lr.detention ?? 0);
            
            const fr = savedRow?.freight !== undefined 
                ? Number(savedRow.freight) 
                : Number(lr.freight ?? 0);
            
            const gp = savedRow?.gatePassNo !== undefined 
                ? savedRow.gatePassNo 
                : (lr.charges?.gatePassNo || lr.gatePassNo || lr.poNo || lr.ewayBillNo || '');
            
            const to = savedRow?.toPlace !== undefined 
                ? savedRow.toPlace 
                : (lr.toPlace || '');

            const from = savedRow?.fromPlace !== undefined
                ? savedRow.fromPlace
                : (lr.fromPlace || '');

            return {
                lrNo: lr.lrNo,
                date: lr.date,
                truckNo: lr.truckNo,
                fromPlace: from,
                toPlace: to,
                gatePassNo: gp,
                freight: fr,
                extraPoint: ep,
                detention: dt,
                total: fr + ep + dt
            };
        });

        setInvoiceRows(initialRows);
        setSaveStatus(savedCustom ? 'saved' : 'idle');
    }, [isOpen, lorryReceipts, allLorryReceipts, companyDetails.name]);

    if (!isOpen) return null;

    const handleRowChange = (lrNo: string, field: keyof InvoiceRowItem, value: any) => {
        const updated = invoiceRows.map(row => {
            if (row.lrNo !== lrNo) return row;
            const updatedRow = { ...row, [field]: value };
            if (field === 'freight' || field === 'extraPoint' || field === 'detention') {
                const fr = Number(field === 'freight' ? value : updatedRow.freight) || 0;
                const ep = Number(field === 'extraPoint' ? value : updatedRow.extraPoint) || 0;
                const dt = Number(field === 'detention' ? value : updatedRow.detention) || 0;
                updatedRow.total = fr + ep + dt;
            }
            return updatedRow;
        });

        setInvoiceRows(updated);
        persistToLocalStorage(billNo, billDate, taxType, showGst, showFromColumn, note, tableNote, updated);
        triggerDebouncedAutoSave(updated, note, billNo, billDate);
    };

    const handleNoteChange = (newNote: string) => {
        setNote(newNote);
        persistToLocalStorage(billNo, billDate, taxType, showGst, showFromColumn, newNote, tableNote, invoiceRows);
        triggerDebouncedAutoSave(invoiceRows, newNote, billNo, billDate);
    };

    const handleTableNoteChange = (newTableNote: string) => {
        setTableNote(newTableNote);
        persistToLocalStorage(billNo, billDate, taxType, showGst, showFromColumn, note, newTableNote, invoiceRows);
    };

    const handleBillNoChange = (newNo: string) => {
        setBillNo(newNo);
        persistToLocalStorage(newNo, billDate, taxType, showGst, showFromColumn, note, tableNote, invoiceRows);
        triggerDebouncedAutoSave(invoiceRows, note, newNo, billDate);
    };

    const handleBillDateChange = (newDate: string) => {
        setBillDate(newDate);
        persistToLocalStorage(billNo, newDate, taxType, showGst, showFromColumn, note, tableNote, invoiceRows);
        triggerDebouncedAutoSave(invoiceRows, note, billNo, newDate);
    };

    const handleTaxTypeChange = (newType: 'intra' | 'inter') => {
        setTaxType(newType);
        persistToLocalStorage(billNo, billDate, newType, showGst, showFromColumn, note, tableNote, invoiceRows);
    };

    const handleGstToggle = () => {
        const next = !showGst;
        setShowGst(next);
        persistToLocalStorage(billNo, billDate, taxType, next, showFromColumn, note, tableNote, invoiceRows);
    };

    const handleFromColumnToggle = () => {
        const next = !showFromColumn;
        setShowFromColumn(next);
        persistToLocalStorage(billNo, billDate, taxType, showGst, next, note, tableNote, invoiceRows);
    };

    const billedTo: Partial<PartyDetails> = lorryReceipts.length > 0 
        ? (lorryReceipts[0].billingTo?.name ? lorryReceipts[0].billingTo : lorryReceipts[0].consignor) 
        : { name: 'N/A', address: 'N/A', gst: 'N/A' };

    const handlePrint = () => {
        let styleEl = document.getElementById('dynamic-print-style') as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-print-style';
            document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = `
            @media print {
                @page {
                    size: A4 portrait;
                    margin: 4mm 4mm;
                }
                #print-root {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .printable-area {
                    width: 100% !important;
                    max-width: 760px !important;
                    box-shadow: none !important;
                }
            }
        `;
        window.print();
    };

    const handleDownloadPDF = async () => {
        const element = previewRef.current || (document.querySelector('.printable-area') as HTMLElement);
        if (!element) {
            toast.error('Invoice preview not found');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading('Generating Perfect Single-Page PDF...');

        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(element, {
                scale: 2.5,
                useCORS: true,
                allowTaint: false,
                logging: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            });

            const cleanBillNo = (billNo || 'BILL').replace(/[/\\?%*:|"<>]/g, '_');
            const cleanParty = (billedTo.name || 'Party').split(' ')[0].replace(/[/\\?%*:|"<>]/g, '_');
            const filename = `Invoice-${cleanBillNo}-${cleanParty}.pdf`;

            const pdf = new jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });

            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const margin = 3.5;
            const maxW = pdfW - (margin * 2);
            const maxH = pdfH - (margin * 2);

            const imgRatio = canvas.width / canvas.height;
            let renderW = maxW;
            let renderH = renderW / imgRatio;

            if (renderH > maxH) {
                renderH = maxH;
                renderW = renderH * imgRatio;
            }

            const posX = margin + (maxW - renderW) / 2;
            const posY = margin + (maxH - renderH) / 2;

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');

            // 1. Native jsPDF save
            pdf.save(filename);

            // 2. Fallback direct Blob anchor trigger
            try {
                const pdfBlob = pdf.output('blob');
                const blobUrl = URL.createObjectURL(pdfBlob);
                const downloadLink = document.createElement('a');
                downloadLink.href = blobUrl;
                downloadLink.download = filename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
            } catch (e) {}

            toast.success(`Invoice PDF downloaded! ✅`, { id: toastId });
        } catch (err: any) {
            console.error('Invoice PDF error:', err);
            toast.error('Direct PDF error. Opening Print dialog...', { id: toastId });
            handlePrint();
        } finally {
            setIsExporting(false);
        }
    };

    const handleSaveOnly = async () => {
        if (!onSaveInvoiceDetails) return;
        setIsSaving(true);
        const toastId = toast.loading('Saving invoice changes...');
        try {
            const lrNos = invoiceRows.map(r => r.lrNo);
            persistToLocalStorage(billNo, billDate, taxType, showGst, showFromColumn, note, tableNote, invoiceRows);
            await onSaveInvoiceDetails(lrNos, billNo, billDate, invoiceRows, note);
            setSaveStatus('saved');
            toast.success(`Invoice ${billNo} saved successfully!`, { id: toastId });
        } catch (error) {
            toast.error('Failed to save invoice', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndDownload = async () => {
        if (onSaveInvoiceDetails) {
            setIsSaving(true);
            try {
                const lrNos = invoiceRows.map(r => r.lrNo);
                persistToLocalStorage(billNo, billDate, taxType, showGst, showFromColumn, note, tableNote, invoiceRows);
                await onSaveInvoiceDetails(lrNos, billNo, billDate, invoiceRows, note);
                setSaveStatus('saved');
            } catch (error) {
                console.warn('Background save note:', error);
            } finally {
                setIsSaving(false);
            }
        }
        await handleDownloadPDF();
    };

    return (
        <div className="fixed inset-0 bg-black/75 z-50 flex justify-center items-start p-2 sm:p-4 overflow-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-6 flex flex-col overflow-hidden">
                {/* Header Toolbar */}
                <div className="p-4 bg-gray-50 border-b flex flex-wrap justify-between items-center gap-3 sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                            ₹
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-gray-800">Tax Invoice Generator</h2>
                                {/* Live Auto-Save Indicator */}
                                {saveStatus === 'saving' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                        Saving...
                                    </span>
                                )}
                                {saveStatus === 'saved' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                        ✓ Saved
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">Edit values anytime — changes are saved automatically</p>
                        </div>
                    </div>

                    {/* Quick Config Controls */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm flex-wrap text-xs">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600">Invoice No.</label>
                            <input 
                                type="text"
                                value={billNo}
                                onChange={(e) => handleBillNoChange(e.target.value)}
                                className="p-1 border rounded text-xs w-28 font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600">Invoice Date</label>
                            <input 
                                type="date"
                                value={billDate}
                                onChange={(e) => handleBillDateChange(e.target.value)}
                                className="p-1 border rounded text-xs w-32"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600">Tax Type</label>
                            <select
                                value={taxType}
                                onChange={(e) => handleTaxTypeChange(e.target.value as 'intra' | 'inter')}
                                className="p-1 border rounded text-xs w-28"
                                disabled={!showGst}
                            >
                                <option value="intra">CGST &amp; SGST</option>
                                <option value="inter">IGST (18%)</option>
                            </select>
                        </div>

                        {/* GST Toggle */}
                        <div className="flex flex-col items-center border-l pl-2">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">GST</label>
                            <button
                                type="button"
                                onClick={handleGstToggle}
                                className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors duration-200 ${
                                    showGst ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                                    showGst ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                        <button 
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-900 text-xs font-semibold shadow-sm transition-colors"
                            title="Print or Save as Vector PDF"
                        >
                            <PrintIcon className="w-4 h-4 mr-1"/>
                            Print
                        </button>
                        <button 
                            type="button"
                            onClick={handleDownloadPDF} 
                            disabled={isExporting}
                            className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-xs font-semibold shadow-sm transition-colors disabled:bg-gray-400"
                            title="Download 1-Page PDF"
                        >
                            <DownloadIcon className="w-4 h-4 mr-1"/>
                            {isExporting ? 'Generating...' : 'Download PDF'}
                        </button>
                        {onSaveInvoiceDetails && (
                            <button 
                                type="button"
                                onClick={handleSaveOnly} 
                                disabled={isSaving}
                                className="flex items-center bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 text-xs font-semibold shadow-sm disabled:bg-gray-400 transition-colors"
                                title="Save changes to database"
                            >
                                <SaveIcon className="w-4 h-4 mr-1"/>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200">
                            <XIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                {/* Helpful Instruction Banner */}
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">⚡ Live Editing &amp; Auto-Save:</span>
                        <span>Aap table me <strong>Gate Pass No.</strong>, <strong>Extra Point</strong>, <strong>Detention</strong> aur <strong>Freight</strong> ko direct edit kar sakte hain. Sabhi badlav automatic save hote rehte hain!</span>
                    </div>
                </div>

                {/* Document Preview Area */}
                <div className="p-3 sm:p-6 overflow-x-auto bg-gray-100 flex justify-center">
                    <InvoiceContent
                        ref={previewRef}
                        invoiceRows={invoiceRows}
                        onRowChange={handleRowChange}
                        billedTo={billedTo}
                        companyDetails={companyDetails}
                        billNo={billNo}
                        billDate={billDate}
                        taxType={taxType}
                        showGst={showGst}
                        showFromColumn={showFromColumn}
                        note={note}
                        onNoteChange={handleNoteChange}
                        tableNote={tableNote}
                        onTableNoteChange={handleTableNoteChange}
                        isExporting={isExporting}
                    />
                </div>
            </div>

            {/* Print Portal for Direct Browser & Mobile Vector PDF Print */}
            {printRoot && createPortal(
                <div className="print-copies-container">
                    <InvoiceContent
                        invoiceRows={invoiceRows}
                        onRowChange={() => {}}
                        billedTo={billedTo}
                        companyDetails={companyDetails}
                        billNo={billNo}
                        billDate={billDate}
                        taxType={taxType}
                        showGst={showGst}
                        showFromColumn={showFromColumn}
                        note={note}
                        onNoteChange={() => {}}
                        tableNote={tableNote}
                        onTableNoteChange={() => {}}
                        isExporting={true}
                    />
                </div>,
                printRoot
            )}
        </div>
    );
};

export default InvoiceModal;
