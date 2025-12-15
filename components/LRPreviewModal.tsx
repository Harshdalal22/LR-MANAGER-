
import React, { useRef, forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { LorryReceipt, CompanyDetails } from '../types';
import { DownloadIcon, WhatsAppIcon, EmailIcon, XIcon, SaveIcon, PhoneIcon } from './icons';

interface LRPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    lr: LorryReceipt;
    companyDetails: CompanyDetails;
    onSave?: (lr: LorryReceipt) => void;
    isReadOnly?: boolean;
}

declare const html2pdf: any;

// A dedicated component for the LR content to be reused for screen and print.
export const LRContent = forwardRef<HTMLDivElement, { lr: LorryReceipt; companyDetails: CompanyDetails; showCompanyDetails: boolean }>(({ lr, companyDetails, showCompanyDetails }, ref) => {
    // Note: Calculations are kept for logic if needed elsewhere, but display is hardcoded to 0.00
    const totalCharges = (Object.values(lr.charges || {}) as number[]).reduce((sum: number, charge: number) => sum + (charge || 0), 0);
    const totalToPay = (Number(lr.freight) || 0) + totalCharges;

    const isBillingPartySeparate = lr.billingTo && lr.billingTo.name && 
                                   (lr.billingTo.name !== lr.consignor.name || lr.billingTo.address !== lr.consignor.address) &&
                                   (lr.billingTo.name !== lr.consignee.name || lr.billingTo.address !== lr.consignee.address);

    return (
        <div ref={ref} className="printable-area p-2 bg-white text-black font-sans w-[680px] mx-auto border-2 border-black relative">
            
            {/* Jurisdiction Header */}
            {companyDetails.jurisdictionCity && (
                <div className="text-[10px] font-bold text-center w-full pb-1 uppercase tracking-wide">
                    SUBJECT TO {companyDetails.jurisdictionCity} JURISDICTION
                </div>
            )}

            {/* Dynamic Header */}
            <div className="flex flex-row justify-between items-stretch pb-2 border-b-4 border-ssk-blue min-h-[100px]">
                {/* Left: Logo */}
                <div className="flex-none w-24 flex justify-start items-center">
                    {companyDetails.logoUrl && (
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-20 w-full object-contain object-left"/>
                    )}
                </div>

                {/* Center: Company Details */}
                <div className="flex-1 px-1 text-center flex flex-col justify-center overflow-hidden">
                    <h1 className="font-extrabold text-ssk-red text-2xl leading-none tracking-tight whitespace-nowrap">
                        {companyDetails.name}
                    </h1>
                    {companyDetails.tagline && (
                        <p className="text-xs font-bold text-ssk-blue mt-1">{companyDetails.tagline}</p>
                    )}
                    <p className="text-[10px] sm:text-xs mt-1 text-gray-800 font-semibold whitespace-normal leading-tight">
                        {companyDetails.address}
                    </p>
                </div>

                {/* Right: Contact & Badge */}
                {/* Fixed width to ensure it stays in bounds and aligns right */}
                <div className="flex-none w-[180px] flex flex-col items-end justify-between py-1">
                    <div className="text-[10px] font-bold text-right leading-tight w-full break-words">
                        <p>{companyDetails.email}</p>
                        {companyDetails.contact.slice(0, 2).map(c => <p key={c}>{c}</p>)}
                    </div>
                    <div className="mt-2 self-end">
                        <span className="bg-ssk-blue text-white px-3 py-1 rounded text-sm font-bold tracking-wider uppercase block text-center min-w-[100px]">
                            {lr.lrType}
                        </span>
                    </div>
                </div>
            </div>


            {/* Top Body Grid */}
            <div className="grid grid-cols-12 gap-x-1 text-[9px] mt-1">
                {/* Left Col */}
                <div className="col-span-4 flex flex-col">
                    <div className="border border-black p-1">
                        <span className="font-bold bg-white px-1 relative -top-3 text-black">Available At :</span>
                        <div className="-mt-2 grid grid-cols-2 gap-x-2">
                            {(companyDetails.branchLocations || []).map(loc => (
                                <p key={loc} className="font-bold truncate">{loc.toUpperCase()}</p>
                            ))}
                        </div>
                    </div>
                    <div className="border border-black p-1 mt-1 caution-notice-section">
                        <p className="font-bold text-center text-red-600 text-sm">CAUTION</p>
                        <p className="text-[7px] leading-tight">This Consignment Will Not Be Detained Diverted,Re-Routed Or Re-Booked Without Consignee Bank Written Permission Will Be Delivered At the Destination.</p>
                    </div>
                     <div className="border border-black p-1 mt-1 flex-grow caution-notice-section">
                        <p className="font-bold text-center text-red-600 text-sm">NOTICE</p>
                        <p className="text-[7px] leading-tight">This consignment covered in this set of special lorry receipt shall be stored at the destination under the control of the transport operator & shall be delivered to or to the order of the Consignee bank whose name is mentioned in the lorry receipt.</p>
                    </div>
                </div>
                {/* Mid Col */}
                <div className="col-span-4">
                    <div className="border border-black p-1">
                        <p className="font-bold text-center underline mb-1">AT OWNERS RISKS</p>
                        {showCompanyDetails && (
                            <>
                                <p className="flex justify-between"><span>Pan No. :</span> <span className="font-bold text-black">{companyDetails.pan}</span></p>
                                <p className="flex justify-between"><span>GST No. :</span> <span className="text-black font-bold">{companyDetails.gstn}</span></p>
                            </>
                        )}
                    </div>
                     <div className="border border-black p-1 mt-1 text-center h-[90px]">
                        <p className="font-bold underline">INSURANCE</p>
                        <p className="text-[7px] font-bold my-1 leading-tight">The Customer Has Started That He Has Not Insured The Consignment</p>
                        <div className="flex justify-between mt-1 text-left border-b border-gray-300 pb-1">
                            <span>Policy No: _______</span>
                            <span>Date: _______</span>
                        </div>
                        <div className="flex justify-between mt-1 text-left">
                            <span>Amount: _______</span>
                            <span>Risk: _______</span>
                        </div>
                    </div>
                </div>
                {/* Right Col */}
                <div className="col-span-4 text-center">
                     <div className="border border-black p-1">
                        <p className="font-bold underline">DEMURRAGE CHARGES</p>
                        <p className="text-[7px] font-bold leading-tight">Chargeable After 5 days Arrival Of Goods Rs. 7/per Qtl.Per Day On Weight Charged</p>
                    </div>
                    <div className="border border-black p-1 mt-1 font-bold text-left truncate">Del Addr: <span className="font-bold text-black">{lr.addressOfDelivery}</span></div>
                    <div className="border border-black p-1 mt-1 font-bold flex justify-between items-center bg-gray-100">
                        <span>Vehicle No.:</span> 
                        <span className="font-extrabold text-black text-lg">{lr.truckNo}</span>
                    </div>
                    <div className="border-y-2 border-black p-1 mt-1 font-bold text-lg flex justify-between">
                        <span>C NOTE No.:</span> 
                        <span className="font-extrabold text-red-600">{lr.lrNo}</span>
                    </div>
                    {lr.ewayBillNo && (
                        <div className="border-b-2 border-black p-1 font-bold text-left text-[8px]">
                            E-Way: <span className="font-bold text-black">{lr.ewayBillNo}</span>
                            <div className="flex justify-between">
                                <span>Dt: {lr.ewayBillDate ? new Date(lr.ewayBillDate).toLocaleDateString('en-GB'): '-'}</span>
                                <span>Ex: {lr.ewayExDate ? new Date(lr.ewayExDate).toLocaleDateString('en-GB'): '-'}</span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-5 mt-1 border border-black text-[8px]">
                        <div className="col-span-2 border-r border-b border-black p-1 font-bold bg-gray-50">DATE</div>
                        <div className="col-span-3 border-b border-black p-1 font-bold text-black">{new Date(lr.date).toLocaleDateString('en-GB')}</div>
                        <div className="col-span-2 border-r border-b border-black p-1 font-bold bg-gray-50">FROM</div>
                        <div className="col-span-3 border-b border-black p-1 font-bold text-black uppercase">{lr.fromPlace}</div>
                        <div className="col-span-2 border-r border-black p-1 font-bold bg-gray-50">TO</div>
                        <div className="col-span-3 p-1 font-bold text-black uppercase">{lr.toPlace}</div>
                    </div>
                </div>
            </div>
            
            {/* Consignor/Consignee details */}
            <table className="w-full border-collapse border-2 border-black text-[9px] mt-1 table-fixed">
                <thead>
                    <tr>
                        <td className="border-r-2 border-black p-1 font-bold w-1/2 bg-gray-100">Consignor Name & Address</td>
                        <td className="p-1 font-bold w-1/2 bg-gray-100">Consignee Name & Address</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border-r-2 border-black p-2 align-top h-[70px]">
                            <p className="font-bold text-black text-xs">{lr.consignor.name}</p>
                            <p className="text-gray-800">{lr.consignor.address}, {lr.consignor.city}</p>
                            <div className="mt-1 space-y-0.5">
                                {lr.consignor.gst && <p className="font-semibold">GST: {lr.consignor.gst}</p>}
                                {lr.consignor.contact && <p>Ph: {lr.consignor.contact}</p>}
                            </div>
                        </td>
                        <td className="p-2 align-top h-[70px]">
                            <p className="font-bold text-black text-xs">{lr.consignee.name}</p>
                            <p className="text-gray-800">{lr.consignee.address}, {lr.consignee.city}</p>
                            <div className="mt-1 space-y-0.5">
                                {lr.consignee.gst && <p className="font-semibold">GST: {lr.consignee.gst}</p>}
                                {lr.consignee.contact && <p>Ph: {lr.consignee.contact}</p>}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            {/* Conditionally rendered Billing To details */}
            {isBillingPartySeparate && (
                <table className="w-full border-collapse border-2 border-black text-[9px] mt-1 table-fixed">
                    <thead>
                        <tr>
                            <td className="p-1 font-bold bg-gray-100">Billing Party</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 align-top">
                                <span className="font-bold text-black">{lr.billingTo.name}</span> - {lr.billingTo.address}, {lr.billingTo.city} {lr.billingTo.gst && `(GST: ${lr.billingTo.gst})`}
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}
            
            {/* Main Content Table */}
            <table className="w-full border-collapse border-2 border-black text-[9px] mt-1">
                <thead>
                    <tr className="font-bold text-center bg-gray-100">
                        <td className="border-r-2 border-black p-1 w-[8%]">Pkgs</td>
                        <td className="border-r-2 border-black p-1">Description (Said to Contain)</td>
                        <td className="border-r-2 border-black p-1 w-[18%]" colSpan={2}>Weight (Kg/MT)</td>
                        <td className="border-r-2 border-black p-1 w-[25%]" colSpan={2}>Charges</td>
                    </tr>
                    <tr className="font-bold text-center border-b-2 border-black text-[8px]">
                        <td className="border-r-2 border-black">No.</td>
                        <td className="border-r-2 border-black">Particulars</td>
                        <td className="border-r border-black p-1">Actual</td>
                        <td className="border-r-2 border-black p-1">Charged</td>
                        <td className="border-r-2 border-black p-1 w-[15%]">Particulars</td>
                        <td className="p-1 w-[10%]">Amount</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border-r-2 border-black p-2 text-center h-48 align-top font-bold text-lg">{lr.items.reduce((sum, item) => sum + item.pcs, 0)}</td>
                        <td className="border-r-2 border-black p-2 align-top">
                             <ul className="list-decimal list-inside font-semibold space-y-1">
                                {lr.items.map((item, idx) => (
                                    <li key={idx}>
                                        <span className="font-bold text-black text-sm uppercase">{item.description}</span>
                                        {/* Weight display removed as requested */}
                                    </li>
                                ))}
                             </ul>
                        </td>
                        {/* Actual Weight column - intentionally empty */}
                        <td className="border-r border-black p-2 text-center align-top font-bold"></td>
                        {/* Charged Weight column - intentionally empty */}
                        <td className="border-r-2 border-black p-2 text-center align-top font-bold"></td>
                        <td colSpan={2} className="p-0 align-top">
                            <div className="flex flex-col h-full text-[9px]">
                                <div className="flex justify-between border-b border-black p-1">
                                    <span>Freight</span>
                                    <span className="font-bold">0.00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Hamail</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Surcharge</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Statistical</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Collection</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Door Del.</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Other</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between border-b border-black p-1">
                                    <span>Risk Charges</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between p-1 mt-auto bg-gray-100 font-bold border-t border-black text-sm">
                                    <span>Total</span>
                                    <span>0.00</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                    
                    {/* Footer Section inside Table */}
                    <tr>
                        <td colSpan={4} className="border-t-2 border-r-2 border-black p-2 align-top">
                             <div className="flex flex-col justify-between h-full space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-[8px]">
                                    <div>
                                        <p className="font-bold">Invoice No: <span className="font-normal">{lr.invoiceNo}</span></p>
                                        <p className="font-bold">Date: <span className="font-normal">{lr.invoiceDate ? new Date(lr.invoiceDate).toLocaleDateString('en-GB'): ''}</span></p>
                                    </div>
                                    <div>
                                        <p className="font-bold">Value: <span className="font-normal">₹{Number(lr.invoiceAmount).toLocaleString('en-IN')}</span></p>
                                        <p className="font-bold">GST Paid By: <span className="font-normal">{lr.gstPaidBy}</span></p>
                                    </div>
                                </div>
                                <div className="border border-black p-1 text-[8px] bg-gray-50">
                                    <span className="font-bold block">REMARKS:</span> 
                                    <span className="font-medium text-black">{lr.remark}</span>
                                </div>
                            </div>
                        </td>
                        <td colSpan={2} className="border-t-2 border-black p-2 align-bottom">
                            <div className="flex flex-col items-center justify-end h-full min-h-[60px]">
                                {companyDetails.signatureImageUrl && (
                                    <img src={companyDetails.signatureImageUrl} alt="Authorized Signatory" className="h-12 w-auto object-contain mb-1" />
                                )}
                                <p className="font-bold text-[8px]">Authorized Signatory</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
});


const LRPreviewModal: React.FC<LRPreviewModalProps> = ({ isOpen, onClose, lr, companyDetails, onSave, isReadOnly = false }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const printRoot = document.getElementById('print-root');
    const [showCompanyDetails, setShowCompanyDetails] = useState(true);

    const handleDownloadPDF = () => {
        const element = previewRef.current;
        if (!element) return;
        
        const opt = {
            margin:       5, // Reduced margin to prevent clipping
            filename:     `LR-${lr.lrNo.replace('/', '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(element).set(opt).save();
    };
    
    const handleShareWhatsApp = async () => {
        const element = previewRef.current;
        if (!element) {
            toast.error("Preview content not found. Cannot generate PDF.");
            return;
        };

        const filename = `LR-${lr.lrNo.replace('/', '_')}.pdf`;
        const message = `Hi ${lr.consignee?.name}, here is the Lorry Receipt (LR No. ${lr.lrNo}) for your shipment.`;
        
        try {
            const opt = {
                margin:       5, // Reduced margin to prevent clipping
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: `Lorry Receipt ${lr.lrNo}`,
                    text: message,
                });
            } else {
                toast.error('Your browser doesn\'t support sharing files. Please download the PDF and share it manually.', { duration: 5000 });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') { // AbortError is when the user cancels the share dialog
                console.error('Error sharing file:', error);
                toast.error('An error occurred while trying to share the file.');
            }
        }
    };

    const handleShareEmail = () => {
        const email = lr.consignee?.gst || ''; // Assuming email is in gst field for now
        const subject = encodeURIComponent(`Lorry Receipt (LR No: ${lr.lrNo}) for your shipment`);
        const body = encodeURIComponent(`Dear ${lr.consignee?.name},\n\nPlease find the details for your shipment with LR No. ${lr.lrNo}.\n\nWe advise you to download the attached PDF for your records.\n\nThank you,\n${companyDetails.name}`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };


    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-start p-2 sm:p-4 overflow-auto">
            {/* Render a copy of the content specifically for printing, outside the visible modal */}
            {printRoot && createPortal(<LRContent lr={lr} companyDetails={companyDetails} showCompanyDetails={showCompanyDetails} />, printRoot)}

            {/* The visible modal for on-screen preview */}
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl my-8">
                <div className="p-4 bg-gray-100 rounded-t-lg flex flex-wrap justify-between items-center gap-2 sticky top-0 z-10">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">LR Preview & Actions</h2>
                    <div className="flex items-center flex-wrap gap-2">
                        <div className="flex items-center space-x-2 mr-4 bg-white p-2 rounded-md border">
                           <input
                                type="checkbox"
                                id="showCompanyDetails"
                                checked={showCompanyDetails}
                                onChange={(e) => setShowCompanyDetails(e.target.checked)}
                                className="h-4 w-4 text-ssk-blue focus:ring-ssk-blue border-gray-300 rounded"
                            />
                            <label htmlFor="showCompanyDetails" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                Include GST/PAN
                            </label>
                        </div>
                        {!isReadOnly && onSave && <button onClick={() => onSave(lr)} className="flex items-center bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 font-semibold"><SaveIcon className="w-5 h-5 mr-1"/>Save LR</button>}
                        <button onClick={handleDownloadPDF} className="flex items-center bg-ssk-red text-white px-3 py-2 rounded-md hover:bg-red-700 font-semibold"><DownloadIcon className="w-5 h-5 mr-1"/>Download PDF</button>
                        <button onClick={handleShareWhatsApp} className="flex items-center bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 font-semibold"><WhatsAppIcon className="w-5 h-5 mr-1"/>WhatsApp</button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-300"><XIcon className="w-6 h-6"/></button>
                    </div>
                </div>

                <div className="p-2 sm:p-4 overflow-x-auto">
                    <LRContent ref={previewRef} lr={lr} companyDetails={companyDetails} showCompanyDetails={showCompanyDetails} />
                </div>
            </div>
        </div>
    );
};

export default LRPreviewModal;
