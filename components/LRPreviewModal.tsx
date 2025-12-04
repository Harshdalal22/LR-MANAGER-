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
    const totalCharges = (Object.values(lr.charges || {}) as number[]).reduce((sum: number, charge: number) => sum + (charge || 0), 0);
    const totalToPay = (Number(lr.freight) || 0) + totalCharges;

    const isBillingPartySeparate = lr.billingTo && lr.billingTo.name && 
                                   (lr.billingTo.name !== lr.consignor.name || lr.billingTo.address !== lr.consignor.address) &&
                                   (lr.billingTo.name !== lr.consignee.name || lr.billingTo.address !== lr.consignee.address);

    return (
        <div ref={ref} className="printable-area p-2 bg-white text-black font-sans w-[680px] mx-auto border-2 border-black">
            {/* Dynamic Header */}
            <div className="flex justify-between items-start pb-4 border-b-4 border-ssk-blue">
                <div className="w-1/4 flex justify-start">
                    {companyDetails.logoUrl && <img src={companyDetails.logoUrl} alt="Company Logo" className="h-24 w-auto object-contain"/>}
                </div>
                <div className="w-1/2 text-center pt-2">
                    <h1 className="font-extrabold text-ssk-red text-4xl leading-tight">{companyDetails.name}</h1>
                    {companyDetails.tagline && <p className="text-lg font-semibold text-ssk-blue mt-1">{companyDetails.tagline}</p>}
                    <p className="text-sm mt-2 text-gray-700">{companyDetails.address}</p>
                </div>
                <div className="w-1/4 text-right flex flex-col items-end justify-between h-24">
                    <div>
                      <p className="text-sm font-semibold">{companyDetails.email}</p>
                      {companyDetails.contact.map(c => <p key={c} className="text-sm font-semibold">{c}</p>)}
                    </div>
                    <div className="bg-ssk-blue text-white px-4 py-1 rounded-md">
                        <span className="font-bold text-base tracking-wider">{lr.lrType.toUpperCase()}</span>
                    </div>
                </div>
            </div>


            {/* Top Body Grid */}
            <div className="grid grid-cols-12 gap-x-1 text-[9px] mt-1">
                {/* Left Col */}
                <div className="col-span-4 flex flex-col">
                    <div className="border border-black p-1">
                        <span className="font-bold bg-white px-1 relative -top-3 text-black">Available At :</span>
                        <div className="-mt-2 grid grid-cols-2">
                            {(companyDetails.branchLocations || []).map(loc => (
                                <p key={loc} className="font-bold">{loc.toUpperCase()}</p>
                            ))}
                        </div>
                    </div>
                    <div className="border border-black p-1 mt-1 caution-notice-section">
                        <p className="font-bold text-center text-red-600 text-base">CAUTION</p>
                        <p className="text-[7px]">This Consignment Will Not Be Detained Diverted,Re-Routed Or Re-Booked Without Consignee Bank Written Permission Will Be Delivered At the Destination.</p>
                    </div>
                     <div className="border border-black p-1 mt-1 flex-grow caution-notice-section">
                        <p className="font-bold text-center text-red-600 text-base">NOTICE</p>
                        <p className="text-[7px]">This consignment covered in this set of special lorry receipt shall be stored at the destination under the control of the transport operator & shall be delivered to or to the order of the Consignee bank whose name is mentioned in the lorry receipt. And under no circumstances be delivered to anyone without the written authority form the consignee Bank or its order endorsed on the Consignee Copy or on a separated Letter or Authority.</p>
                    </div>
                </div>
                {/* Mid Col */}
                <div className="col-span-4">
                    <div className="border border-black p-1">
                        <p className="font-bold text-center underline">AT OWNERS RISKS</p>
                        {showCompanyDetails && (
                            <>
                                <p>Pan No. : <span className="font-bold text-black">{companyDetails.pan}</span></p>
                                <p>GST No. : <span className="text-black font-bold">{companyDetails.gstn}</span></p>
                            </>
                        )}
                    </div>
                     <div className="border border-black p-1 mt-1 text-center">
                        <p className="font-bold underline">INSURANCE</p>
                        <p className="text-[8px] font-bold">The Customer Has Started That He Has Not Insured The Consignment</p>
                        <div className="flex justify-between mt-1 text-left">
                            <span>Policy No _________</span>
                            <span>Date _________</span>
                        </div>
                        <div className="flex justify-between mt-1 text-left">
                            <span>Amount _________</span>
                            <span>Risk _________</span>
                        </div>
                    </div>
                </div>
                {/* Right Col */}
                <div className="col-span-4 text-center">
                     <div className="border border-black p-1">
                        <p className="font-bold underline">SCHEDULE OF DEMURRAGE CHARGES</p>
                        <p className="text-[8px] font-bold">Demmurrage Chargeable After 5 days Arrival Of Goods Rs. 7/per Qtl.Per Day On Weight Charged</p>
                    </div>
                    <div className="border border-black p-1 mt-1 font-bold">Address Of Delivery : <span className="font-bold text-black">{lr.addressOfDelivery}</span></div>
                    <div className="border border-black p-1 mt-1 font-bold">Vehicle No. : <span className="font-extrabold text-black text-xl">{lr.truckNo}</span></div>
                    <div className="border-y-2 border-black p-1 mt-1 font-bold">C NOTE No. : <span className="font-bold text-black">{lr.lrNo}</span></div>
                    {lr.ewayBillNo && (
                        <div className="border-b-2 border-black p-1 font-bold text-left">
                            E-Way Bill: <span className="font-bold text-black">{lr.ewayBillNo}</span>
                            <br/>
                            <span className="text-[8px]">
                                Date: <span className="font-bold text-black">{lr.ewayBillDate ? new Date(lr.ewayBillDate).toLocaleDateString('en-GB'): 'N/A'}</span>
                                &nbsp;|&nbsp;
                                Expiry: <span className="font-bold text-black">{lr.ewayExDate ? new Date(lr.ewayExDate).toLocaleDateString('en-GB'): 'N/A'}</span>
                            </span>
                        </div>
                    )}
                    <div className="grid grid-cols-5 mt-1">
                        <div className="col-span-2 border border-black p-1 font-bold">DATE :</div>
                        <div className="col-span-3 border-y border-r border-black p-1 font-bold text-black">{new Date(lr.date).toLocaleDateString('en-GB')}</div>
                        <div className="col-span-2 border-x border-b border-black p-1 font-bold flex items-center justify-center">FROM :</div>
                        <div className="col-span-3 border-r border-b border-black p-2 font-extrabold text-black bg-gray-300 text-lg text-center">{lr.fromPlace}</div>
                        <div className="col-span-2 border-x border-b border-black p-1 font-bold flex items-center justify-center">TO :</div>
                        <div className="col-span-3 border-r border-b border-black p-2 font-extrabold text-black bg-gray-300 text-lg text-center">{lr.toPlace}</div>
                    </div>
                </div>
            </div>
            
            {/* Consignor/Consignee details */}
            <table className="w-full border-collapse border-2 border-black text-[9px] mt-1">
                <thead>
                    <tr>
                        <td className="border-r-2 border-black p-1 font-bold w-1/2">Consignor</td>
                        <td className="p-1 font-bold w-1/2">Consignee</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border-r-2 border-black p-1 align-top h-[70px]">
                            <p className="font-bold text-black">{lr.consignor.name}</p>
                            <p className="font-bold text-black">{lr.consignor.address}, {lr.consignor.city}</p>
                            {lr.consignor.gst && <p className="font-bold text-black">GST: {lr.consignor.gst}</p>}
                            {lr.consignor.pan && <p className="font-bold text-black">PAN: {lr.consignor.pan}</p>}
                            {lr.consignor.contact && <p className="font-bold text-black">Contact: {lr.consignor.contact}</p>}
                        </td>
                        <td className="p-1 align-top h-[70px]">
                            <p className="font-bold text-black">{lr.consignee.name}</p>
                            <p className="font-bold text-black">{lr.consignee.address}, {lr.consignee.city}</p>
                            {lr.consignee.gst && <p className="font-bold text-black">GST: {lr.consignee.gst}</p>}
                            {lr.consignee.pan && <p className="font-bold text-black">PAN: {lr.consignee.pan}</p>}
                            {lr.consignee.contact && <p className="font-bold text-black">Contact: {lr.consignee.contact}</p>}
                        </td>
                    </tr>
                </tbody>
            </table>
            
            {/* Conditionally rendered Billing To details */}
            {isBillingPartySeparate && (
                <table className="w-full border-collapse border-2 border-black text-[9px] mt-1">
                    <thead>
                        <tr>
                            <td className="p-1 font-bold">Billing To</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-1 align-top h-[70px]">
                                <p className="font-bold text-black">{lr.billingTo.name}</p>
                                <p className="font-bold text-black">{lr.billingTo.address}, {lr.billingTo.city}</p>
                                {lr.billingTo.gst && <p className="font-bold text-black">GST: {lr.billingTo.gst}</p>}
                                {lr.billingTo.pan && <p className="font-bold text-black">PAN: {lr.billingTo.pan}</p>}
                                {lr.billingTo.contact && <p className="font-bold text-black">Contact: {lr.billingTo.contact}</p>}
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}
            
            {/* Main Content Table */}
            <table className="w-full border-collapse border-2 border-black text-[8px] mt-1">
                <thead>
                    <tr className="font-bold text-center">
                        <td className="border-r-2 border-black p-1 w-[8%]">Packages</td>
                        <td className="border-r-2 border-black p-1">Description</td>
                        <td className="border-r-2 border-black p-1 w-[12%]" colSpan={2}>Weight</td>
                        <td className="border-r-2 border-black p-1 w-[15%]">Rate</td>
                        <td className="border-r-2 border-black p-1 w-[10%]">Amount</td>
                        <td className="p-1 w-[20%]">Any Other Information Remarks</td>
                    </tr>
                    <tr className="font-bold text-center">
                        <td className="border-t-2 border-r-2 border-black"></td>
                        <td className="border-t-2 border-r-2 border-black"></td>
                        <td className="border-t-2 border-r border-black p-1">Actual</td>
                        <td className="border-t-2 border-r-2 border-black p-1">Charged</td>
                        <td className="border-t-2 border-r-2 border-black"></td>
                        <td className="border-t-2 border-r-2 border-black"></td>
                        <td className="border-t-2 border-black"></td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border-t-2 border-r-2 border-black p-1 text-center h-40 align-top font-bold text-black">{lr.items.reduce((sum, item) => sum + item.pcs, 0)}</td>
                        <td className="border-t-2 border-r-2 border-black p-1 align-top">
                             <p className="font-bold text-black">{lr.items.map(i => i.description).join(', ')}</p>
                        </td>
                        <td className="border-t-2 border-r border-black p-1 text-center align-top font-bold text-black">{lr.actualWeightMT}</td>
                        <td className="border-t-2 border-r-2 border-black p-1 text-center align-top font-bold text-black">{lr.chargedWeight}</td>
                        <td className="border-t-2 border-r-2 border-black p-0 align-top bg-blue-50">
                            <div className="grid grid-cols-2 h-full text-center">
                                <div className="border-b border-r border-black p-1">Hamail</div><div className="border-b border-black p-1 font-bold text-black">{lr.charges && lr.charges.hamail > 0 ? lr.charges.hamail.toFixed(2) : ''}</div>
                                <div className="border-b border-r border-black p-1">Sur.CH.</div><div className="border-b border-black p-1 font-bold text-black">{lr.charges && lr.charges.surCharge > 0 ? lr.charges.surCharge.toFixed(2) : ''}</div>
                                <div className="border-b border-r border-black p-1">St.CH.</div><div className="border-b border-black p-1 font-bold text-black">{lr.charges && lr.charges.stCharge > 0 ? lr.charges.stCharge.toFixed(2) : ''}</div>
                                <div className="border-b border-r border-black p-1">Collection CH.</div><div className="border-b border-black p-1 font-bold text-black">{lr.charges && lr.charges.collectionCharge > 0 ? lr.charges.collectionCharge.toFixed(2) : ''}</div>
                                <div className="border-b border-r border-black p-1">D.Dty CH.</div><div className="border-b border-black p-1 font-bold text-black">{lr.charges && lr.charges.ddCharge > 0 ? lr.charges.ddCharge.toFixed(2) : ''}</div>
                                <div className="border-b border-r border-black p-1">Other CH.</div><div className="border-b border-black p-1 font-bold text-black">{lr.charges && lr.charges.otherCharge > 0 ? lr.charges.otherCharge.toFixed(2) : ''}</div>
                                <div className="border-b border-r border-black p-1">Risk CH.</div><div className="border-b border-black p-1 font-bold text-black">{lr.charges && lr.charges.riskCharge > 0 ? lr.charges.riskCharge.toFixed(2) : ''}</div>
                                <div className="border-r border-black p-1 font-bold">Total</div><div className="p-1 font-bold text-black">{totalCharges > 0 ? totalCharges.toFixed(2) : ''}</div>
                            </div>
                        </td>
                        <td className="border-t-2 border-r-2 border-black p-1 align-top text-center font-bold text-black">{Number(lr.freight).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td className="border-t-2 border-black p-1 align-top">
                            
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={3} className="border-t-2 border-r-2 border-black p-1 text-black font-bold">
                            <div>
                                <span className="font-bold text-black">Invoice No.: {lr.invoiceNo}</span>
                                <span className="ml-4 font-bold text-black">Date: {lr.invoiceDate ? new Date(lr.invoiceDate).toLocaleDateString('en-GB'): ''}</span>
                            </div>
                             <div>
                                <span className="font-bold text-black">P.O. No.: {lr.poNo}</span>
                                <span className="ml-4 font-bold text-black">Date: {lr.poDate ? new Date(lr.poDate).toLocaleDateString('en-GB'): ''}</span>
                            </div>
                        </td>
                        <td className="border-t-2 border-r-2 border-black p-1">Mark</td>
                        <td className="border-t-2 border-r-2 border-black p-1"></td>
                        <td className="border-t-2 border-r-2 border-black p-1"></td>
                        <td className="border-t-2 border-black p-1"></td>
                    </tr>
                    <tr className="h-full">
                        <td colSpan={4} className="border-t-2 border-r-2 border-black p-1 text-[7px] align-top relative">
                             <div className="flex flex-col justify-between h-full">
                                <div>
                                    <p>Endorsement Its Is Intended To use Consignee Copy Of the Set For The Purpose Of Borrowing From The Consignee Bank</p>
                                    {companyDetails.jurisdictionCity && <p className="my-2">The Court In {companyDetails.jurisdictionCity} Alone Shall Have Jurisdiction In Respect Of The Claims And Matters Arising Under The Consignment Or Of The Claims And Matter Arising Under The Goods Entrusted For Transport</p>}
                                    <p className="mt-2 text-[9px]">Value : <span className="font-bold text-black">{Number(lr.invoiceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                                     <div className="grid grid-cols-2 text-[9px] mt-1">
                                        {lr.gstPaidBy && <p>GST Paid By: <span className="font-bold text-black">{lr.gstPaidBy}</span></p>}
                                        
                                    </div>
                                </div>
                                <div className="border-t-2 border-black mt-1 pt-1 text-[9px]">
                                    <span className="font-bold">REMARKS:</span> <span className="font-bold text-black">{lr.remark}</span>
                                </div>
                            </div>
                        </td>
                        <td colSpan={3} className="border-t-2 border-black p-1 align-bottom">
                            <div className="flex justify-end items-end h-full">
                                <div className="text-right">
                                    {companyDetails.signatureImageUrl && (
                                        <img src={companyDetails.signatureImageUrl} alt="Authorized Signatory" className="h-20 w-auto object-contain" />
                                    )}
                                </div>
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