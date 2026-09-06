import React, { useRef, forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LorryReceipt, CompanyDetails } from '../types';
import { DownloadIcon, WhatsAppIcon, EmailIcon, XIcon, SaveIcon, PrintIcon, PhoneIcon } from './icons';

interface LRPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    lr: LorryReceipt;
    companyDetails: CompanyDetails;
    onSave?: (lr: LorryReceipt) => void;
    isReadOnly?: boolean;
    initialTemplateStyle?: 'modern-gst' | 'classic';
}

// Helper to format date like '29-Aug-2026'
export const formatBiltyDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return dateStr;
    }
};

// Helper to extract State Code from GSTIN (First 2 digits in India)
export const getStateCodeFromGst = (gst: string | undefined): string => {
    if (!gst || gst.trim().length < 2) return '';
    const match = gst.trim().match(/^([0-9]{2})/);
    return match ? match[1] : '';
};

// Helper to format currency in INR style
export const formatINR = (val: number | undefined | null, showSymbol = true): string => {
    const num = Number(val) || 0;
    const formatted = num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return showSymbol ? `₹ ${formatted}` : formatted;
};

// -------------------------------------------------------------
// 1. MODERN GST BILTYBOOK COMPONENT (Matches Reference Design)
// -------------------------------------------------------------
export const ModernGSTBiltyContent = forwardRef<HTMLDivElement, {
    lr: LorryReceipt;
    companyDetails: CompanyDetails;
    showCompanyDetails?: boolean;
    showAmounts?: boolean;
    copyType?: string;
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'a4' | 'a5' | 'letter' | 'legal';
    singlePageFit?: boolean;
    gstLiability?: 'RCM' | 'FCM_18' | 'FCM_12' | 'BOTH_5_18' | 'EXEMPTED';
}>(({ 
    lr, 
    companyDetails, 
    showCompanyDetails = true, 
    showAmounts = true, 
    copyType = 'CONSIGNOR COPY',
    orientation = 'portrait',
    paperSize = 'a4',
    singlePageFit = true,
    gstLiability
}, ref) => {

    const charges = lr.charges || ({} as any);
    const hamali = Number(charges.hamail || 0);
    const doorDelivery = Number(charges.ddCharge || 0);
    const statistical = Number(charges.stCharge || 0);
    const tollTax = Number(charges.tollTax || charges.otherCharge || 0);
    const surcharge = Number(charges.surCharge || 0);
    const collection = Number(charges.collectionCharge || 0);
    const risk = Number(charges.riskCharge || 0);

    const otherSum = surcharge + collection + risk;

    const totalCharges = hamali + doorDelivery + statistical + tollTax + otherSum;
    const basicFreight = Number(lr.freight) || 0;
    const totalFreight = basicFreight + totalCharges;
    const advancePaid = Number(lr.advancePaid ?? charges.advancePaid ?? 0);
    const netBalanceToPay = Math.max(0, totalFreight - advancePaid);

    const consignorGst = lr.consignor?.gst || '';
    const consigneeGst = lr.consignee?.gst || '';
    const consignorStateCode = getStateCodeFromGst(consignorGst);
    const consigneeStateCode = getStateCodeFromGst(consigneeGst);

    // Calculate item total quantities and weights
    const totalPcs = (lr.items || []).reduce((sum, it) => sum + (Number(it.pcs) || 0), 0);
    const totalActualWeight = Number(lr.actualWeightMT) > 0 
        ? (Number(lr.weight) > 0 ? `${lr.weight.toLocaleString('en-IN')} Kg (${lr.actualWeightMT} MT)` : `${lr.actualWeightMT} MT`)
        : (Number(lr.weight) > 0 ? `${lr.weight.toLocaleString('en-IN')} Kg` : (totalPcs > 0 ? `${totalPcs} Units` : '--'));
    const totalChargedWeight = Number(lr.chargedWeight) > 0 
        ? `${lr.chargedWeight.toLocaleString('en-IN')} Kg (${(Number(lr.chargedWeight) / 1000).toFixed(3)} MT)` 
        : '--';

    const activeCopy = copyType || lr.copyType || 'CONSIGNOR COPY';
    const freightBasis = lr.freightBasis || (lr.gstPaidBy === 'Consignor' ? 'PAID (Consignor)' : 'TO PAY (Consignee)');
    const transitRisk = lr.transitRisk || "Owner's Risk (Consignor Insured)";
    const insurancePolicy = lr.insurancePolicyNo || 'Not Insured / Customer Declaration';
    const insuranceCompany = lr.insuranceCompany || 'Carrier Not Insurer';
    const declaredValue = Number(lr.invoiceAmount) > 0 ? formatINR(lr.invoiceAmount) : 'As per Invoice';

    const driverName = lr.driverName || (charges.driverName) || '';
    const driverContact = lr.driverContact || (charges.driverContact) || '';
    const vehicleType = lr.vehicleType || (charges.vehicleType) || '';

    const formatDisplayDate = (d: string | null | undefined) => formatBiltyDate(d);

    const isBillingPartySeparate = lr.billingTo && lr.billingTo.name &&
        (lr.billingTo.name !== lr.consignor?.name || lr.billingTo.address !== lr.consignor?.address) &&
        (lr.billingTo.name !== lr.consignee?.name || lr.billingTo.address !== lr.consignee?.address);

    const isLandscape = orientation === 'landscape';
    const containerClass = isLandscape 
        ? 'w-[1040px] max-w-full p-3 text-[9px]' 
        : paperSize === 'a5' 
            ? 'w-[580px] max-w-full p-2 text-[8px]' 
            : 'w-[794px] max-w-full p-4 text-[9.5px]';

    const detectedLiability = (() => {
        if (gstLiability) return gstLiability;
        const p = (lr.gstPaidBy || '').toLowerCase();
        if (p.includes('both') || p.includes('dual') || (p.includes('5') && p.includes('18'))) return 'BOTH_5_18';
        if (p.includes('18') || p.includes('fcm')) return 'FCM_18';
        if (p.includes('12')) return 'FCM_12';
        if (p.includes('exempt')) return 'EXEMPTED';
        return 'RCM';
    })();    return (
        <div
            ref={ref}
            className={`printable-area bg-white text-slate-900 font-sans mx-auto border-2 border-slate-900 shadow-md ${containerClass} leading-snug relative selection:bg-blue-100 ${singlePageFit ? 'page-avoid-break' : ''}`}
            style={{ boxSizing: 'border-box' }}
        >
            {/* Top Company Header & LR Document Details */}
            <div className="flex flex-row justify-between items-start border-b-2 border-slate-900 pb-2 gap-3">
                {/* Left: Company Branding & Details */}
                <div className="flex-1">
                    <div className="flex items-start gap-2.5">
                        {companyDetails.logoUrl && (
                            <img
                                src={companyDetails.logoUrl}
                                alt="Logo"
                                className="h-12 w-auto max-w-[70px] object-contain mt-0.5"
                            />
                        )}
                        <div>
                            <h1 className="font-black text-[#0b192c] text-[21px] uppercase tracking-tight leading-tight">
                                {companyDetails.name || 'SPEEDWAY LOGISTICS CO.'}
                            </h1>
                            <p className="text-[9.5px] font-semibold text-slate-600">
                                {companyDetails.tagline || 'Fleet Owners, Heavy Transport Contractors & Logistics Consultants'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-1.5 space-y-0.5 text-[8.5px] text-slate-700">
                        <p className="leading-tight font-medium">
                            <span className="font-bold text-slate-900">Regd Off:</span> {companyDetails.address || '42/B, Transport Nagar, GT Road, Rohtak, Haryana - 124001'}
                            {companyDetails.jurisdictionCity ? ` • Sub to ${companyDetails.jurisdictionCity} Jurisdiction` : ''}
                        </p>
                        {showCompanyDetails && (
                            <p className="font-semibold text-slate-800">
                                <span className="font-bold text-slate-900">GSTIN:</span> <span className="font-mono font-bold text-slate-900">{companyDetails.gstn || '06AAACS1234F1Z5'}</span>
                                {companyDetails.pan && <> • <span className="font-bold text-slate-900">PAN:</span> <span className="font-mono font-bold text-slate-900">{companyDetails.pan}</span></>}
                                <> • <span className="font-bold text-slate-900">State Code:</span> <span className="font-mono font-bold text-slate-900">{getStateCodeFromGst(companyDetails.gstn) || '06'}</span></>
                            </p>
                        )}
                        <p className="text-slate-600">
                            {companyDetails.email && <><span className="font-bold text-slate-800">Email:</span> <span className="font-medium text-slate-800">{companyDetails.email}</span></>}
                            {companyDetails.contact && companyDetails.contact.length > 0 && (
                                <> • <span className="font-bold text-slate-800">Helpline:</span> <span className="font-medium text-slate-800">{companyDetails.contact.join(', ')}</span></>
                            )}
                        </p>
                    </div>
                </div>

                {/* Right: Modern Exact Doc Details Box */}
                <div className="w-[270px] bg-slate-50 border border-slate-300 rounded-xs overflow-hidden flex flex-col justify-between">
                    <div className="bg-[#0b192c] text-white py-1 px-2 text-center">
                        <span className="font-black text-[11px] uppercase tracking-wider block">
                            CONSIGNMENT NOTE / LR
                        </span>
                    </div>
                    
                    <div className="bg-slate-100/90 py-0.5 px-2 text-center border-b border-slate-200">
                        <span className="font-extrabold text-[8.5px] text-blue-900 uppercase tracking-widest">
                            {activeCopy}
                        </span>
                    </div>

                    <div className="p-2 space-y-1 text-[8.5px]">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-semibold">LR / Bilty No:</span>
                            <span className="font-mono font-black text-[11px] text-blue-800">
                                {lr.lrNo || 'SWL-2026-0892'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-semibold">LR Date:</span>
                            <span className="font-bold text-slate-900">{formatDisplayDate(lr.date)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-semibold">E-Way Bill No:</span>
                            <span className="font-mono font-bold text-slate-900">
                                {lr.ewayBillNo || '5819 2840 1928'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-semibold">EWB Valid Upto:</span>
                            <span className="font-bold text-slate-900">
                                {lr.ewayExDate ? formatDisplayDate(lr.ewayExDate) : (lr.ewayBillDate ? formatDisplayDate(lr.ewayBillDate) : '02-Sep-2026 (23:59)')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dark Navy Route & Vehicle Ribbon (Exact match to reference) */}
            <div className="bg-[#0b192c] text-white flex justify-between items-center px-3 py-1.5 my-1.5 rounded-xs">
                {/* Left: Origin -> Destination */}
                <div className="flex items-center gap-3">
                    <div>
                        <span className="text-slate-400 font-semibold text-[7.5px] uppercase tracking-wider block">
                            SOURCE • ORIGIN
                        </span>
                        <span className="font-black text-[11px] uppercase tracking-wide text-white">
                            {lr.fromPlace || 'GURGAON (HR)'}
                        </span>
                    </div>
                    
                    <span className="text-cyan-400 font-bold text-sm px-1">➔</span>

                    <div>
                        <span className="text-slate-400 font-semibold text-[7.5px] uppercase tracking-wider block">
                            DESTINATION • DELIVERY POINT
                        </span>
                        <span className="font-black text-[11px] uppercase tracking-wide text-white">
                            {lr.toPlace || 'MUMBAI (MH)'}
                        </span>
                    </div>
                </div>

                {/* Right: Vehicle & Driver Details */}
                <div className="text-right">
                    <span className="text-slate-400 font-semibold text-[7.5px] uppercase tracking-wider block">
                        VEHICLE & DRIVER DETAILS
                    </span>
                    <span className="font-mono font-black text-[10px] text-white uppercase block">
                        {lr.truckNo || 'HR-12-AU-2864'} {vehicleType ? `• ${vehicleType}` : '• 32 Ft MXL'}
                    </span>
                    <span className="text-slate-300 text-[8px] font-medium block">
                        Driver: {driverName || 'Rajesh Kumar'} {driverContact ? `(+91 ${driverContact.replace(/[^0-9]/g, '')})` : '(+91 98765 43210)'}
                    </span>
                </div>
            </div>

            {/* Two-Column Party Box: Consignor & Consignee */}
            <div className="grid grid-cols-2 gap-2 my-1.5">
                {/* Consignor Details */}
                <div className="border border-slate-300 rounded-xs p-2 bg-slate-50/40">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px]">📦</span>
                        <span className="font-extrabold text-[8.5px] text-slate-800 uppercase tracking-wider">
                            CONSIGNOR (BILLED & DISPATCHED FROM)
                        </span>
                    </div>
                    <h3 className="font-black text-[10.5px] text-slate-900 uppercase leading-tight">
                        {lr.consignor?.name || 'APEX AUTOMOTIVE COMPONENTS PVT LTD'}
                    </h3>
                    <p className="text-[8.5px] text-slate-700 leading-tight mt-0.5 font-medium">
                        {lr.consignor?.address || 'Plot No. 104, Sector 8, IMT Manesar, Gurugram, HR - 122051'}
                        {lr.consignor?.city && !lr.consignor?.address?.includes(lr.consignor.city) ? `, ${lr.consignor.city}` : ''}
                    </p>
                    <div className="mt-1 pt-1 border-t border-slate-200 text-[8px] space-y-0.5">
                        <p>
                            <span className="font-bold text-slate-700">GSTIN:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consignorGst || '06AAACA5566G1Z2'}</span>
                            {' • '}<span className="font-bold text-slate-700">State Code:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consignorStateCode || '06'}</span>
                        </p>
                        <p>
                            <span className="font-bold text-slate-700">Contact:</span>{' '}
                            <span className="text-slate-800 font-medium">{lr.consignor?.contact || 'Vikas Sharma (+91 94160 11223)'}</span>
                            {lr.invoiceNo && <> • <span className="font-bold text-slate-700">Inv No:</span> <span className="font-mono font-bold text-slate-900">{lr.invoiceNo}</span></>}
                        </p>
                    </div>
                </div>

                {/* Consignee Details */}
                <div className="border border-slate-300 rounded-xs p-2 bg-slate-50/40">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px]">🏭</span>
                        <span className="font-extrabold text-[8.5px] text-slate-800 uppercase tracking-wider">
                            CONSIGNEE (SHIP & DELIVERY TO)
                        </span>
                    </div>
                    <h3 className="font-black text-[10.5px] text-slate-900 uppercase leading-tight">
                        {lr.consignee?.name || 'MAHARASHTRA AUTO ENGINES LTD'}
                    </h3>
                    <p className="text-[8.5px] text-slate-700 leading-tight mt-0.5 font-medium">
                        {lr.consignee?.address || 'Gate 3, MIDC Industrial Area, Chakan, Pune, MH - 410501'}
                        {lr.consignee?.city && !lr.consignee?.address?.includes(lr.consignee.city) ? `, ${lr.consignee.city}` : ''}
                    </p>
                    <div className="mt-1 pt-1 border-t border-slate-200 text-[8px] space-y-0.5">
                        <p>
                            <span className="font-bold text-slate-700">GSTIN:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consigneeGst || '27AABCM7788P1Z9'}</span>
                            {' • '}<span className="font-bold text-slate-700">State Code:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consigneeStateCode || '27'}</span>
                        </p>
                        <p>
                            <span className="font-bold text-slate-700">Contact:</span>{' '}
                            <span className="text-slate-800 font-medium">{lr.consignee?.contact || 'Receiving Incharge (+91 98220 99887)'}</span>
                            {lr.poNo && <> • <span className="font-bold text-slate-700">PO No:</span> <span className="font-mono font-bold text-slate-900">{lr.poNo}</span></>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Separate Billing Party if Applicable */}
            {isBillingPartySeparate && (
                <div className="border border-amber-300 bg-amber-50/70 rounded-xs p-1.5 my-1 flex justify-between items-center text-[8.5px]">
                    <div>
                        <span className="font-black text-amber-900 uppercase text-[8px] mr-1">BILLING PARTY (3rd Party):</span>
                        <span className="font-bold text-slate-900 uppercase">{lr.billingTo.name}</span>
                        <span className="text-slate-600"> • {lr.billingTo.address}, {lr.billingTo.city}</span>
                    </div>
                    {lr.billingTo.gst && (
                        <div className="font-mono font-bold text-slate-900">
                            GSTIN: {lr.billingTo.gst}
                        </div>
                    )}
                </div>
            )}

            {/* Goods Description & Packages Itemized Table */}
            <div className="border border-slate-300 rounded-xs overflow-hidden my-1.5">
                <table className="w-full text-left border-collapse text-[8.5px]">
                    <thead>
                        <tr className="bg-[#0b192c] text-white text-[8px] uppercase tracking-wider font-bold">
                            <th className="p-1 text-center w-[5%] border-r border-slate-700">SR.</th>
                            <th className="p-1 text-center w-[15%] border-r border-slate-700">PACKAGES</th>
                            <th className="p-1 text-left w-[36%] border-r border-slate-700">DESCRIPTION OF GOODS & PACKING DETAILS</th>
                            <th className="p-1 text-center w-[12%] border-r border-slate-700">HSN / SAC</th>
                            <th className="p-1 text-right w-[11%] border-r border-slate-700">ACTUAL WT.</th>
                            <th className="p-1 text-right w-[11%] border-r border-slate-700">CHARGED WT.</th>
                            <th className="p-1 text-right w-[10%]">RATE / UNIT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {lr.items && lr.items.length > 0 ? (
                            lr.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-1 text-center font-bold text-slate-600 border-r border-slate-200 align-top">{idx + 1}</td>
                                    <td className="p-1 text-center font-bold text-slate-900 border-r border-slate-200 align-top">
                                        {item.pcs > 0 ? `${item.pcs} ${item.packingDetails || 'Pkgs'}` : (item.packingDetails ? item.packingDetails : '--')}
                                    </td>
                                    <td className="p-1 border-r border-slate-200 align-top">
                                        <div className="font-black text-slate-900 uppercase">{item.description || '---'}</div>
                                        {item.packingDetails && (
                                            <div className="text-[7.5px] text-slate-500 font-medium">Packing: {item.packingDetails}</div>
                                        )}
                                    </td>
                                    <td className="p-1 text-center font-mono text-slate-800 border-r border-slate-200 align-top">
                                        {item.hsn || lr.hsnCode || companyDetails.sacCode || '996511'}
                                    </td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">
                                        {Number(item.weight) > 0 
                                            ? `${(item.unit || '').toLowerCase() === 'ton' ? `${item.weight} Ton` : `${item.weight.toLocaleString('en-IN')} Kg`}` 
                                            : (idx === 0 && Number(lr.actualWeightMT) > 0 ? `${lr.actualWeightMT} MT` : '--')}
                                    </td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">
                                        {Number(item.chargedWeight) > 0 
                                            ? `${(item.unit || '').toLowerCase() === 'ton' ? `${item.chargedWeight} Ton` : `${item.chargedWeight.toLocaleString('en-IN')} Kg`}` 
                                            : (idx === 0 && Number(lr.chargedWeight) > 0 ? `${lr.chargedWeight.toLocaleString('en-IN')} Kg` : '--')}
                                    </td>
                                    <td className="p-1 text-right font-bold text-slate-900 align-top">
                                        {showAmounts && (Number(item.rate) > 0 || Number(lr.rate) > 0)
                                            ? `₹ ${Number(item.rate || lr.rate).toFixed(2)} / ${item.unit || (lr.rateOn === 'Ton' ? 'MT' : lr.rateOn) || 'Ton'}`
                                            : '--'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-1 text-center font-bold text-slate-600 border-r border-slate-200 align-top">1</td>
                                    <td className="p-1 text-center font-bold text-slate-900 border-r border-slate-200 align-top">140 Boxes</td>
                                    <td className="p-1 border-r border-slate-200 align-top">
                                        <div className="font-black text-slate-900 uppercase">High Precision Engine Gaskets & Auto Parts</div>
                                        <div className="text-[7.5px] text-slate-500 font-medium">Dimension: Corrugated Master Cartons (Marks: AAC-MH-01 to 140)</div>
                                    </td>
                                    <td className="p-1 text-center font-mono text-slate-800 border-r border-slate-200 align-top">87082900</td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">4,250 Kg</td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">4,500 Kg</td>
                                    <td className="p-1 text-right font-bold text-slate-900 align-top">₹ 7.50 / Kg</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-1 text-center font-bold text-slate-600 border-r border-slate-200 align-top">2</td>
                                    <td className="p-1 text-center font-bold text-slate-900 border-r border-slate-200 align-top">40 Drums</td>
                                    <td className="p-1 border-r border-slate-200 align-top">
                                        <div className="font-black text-slate-900 uppercase">Synthetic Engine Lubricants & Coolant Fluid</div>
                                        <div className="text-[7.5px] text-slate-500 font-medium">Packing: 50L Steel Barrels • Handle with Care</div>
                                    </td>
                                    <td className="p-1 text-center font-mono text-slate-800 border-r border-slate-200 align-top">27101980</td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">2,100 Kg</td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">2,200 Kg</td>
                                    <td className="p-1 text-right font-bold text-slate-900 align-top">₹ 8.00 / Kg</td>
                                </tr>
                            </>
                        )}

                        {/* Summary Total Row */}
                        <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-800 text-[8.5px]">
                            <td className="p-1 text-center border-r border-slate-300">•</td>
                            <td className="p-1 text-center font-black border-r border-slate-300">
                                {totalPcs > 0 ? `${totalPcs} Total` : '180 Total'}
                            </td>
                            <td className="p-1 font-black border-r border-slate-300">Total Quantities Dispatched (Said to Contain)</td>
                            <td className="p-1 text-center border-r border-slate-300">--</td>
                            <td className="p-1 text-right font-black border-r border-slate-300">{totalActualWeight !== '--' ? totalActualWeight : '6,350 Kg'}</td>
                            <td className="p-1 text-right font-black border-r border-slate-300">{totalChargedWeight !== '--' ? totalChargedWeight : '6,700 Kg'}</td>
                            <td className="p-1 text-right">--</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Bottom Split Section: GST / Statutory & Financial Breakdown */}
            <div className="grid grid-cols-12 gap-2 my-1.5 items-start">
                {/* Left 7 Columns: GST & STATUTORY COMPLIANCE */}
                <div className="col-span-7 flex flex-col justify-between space-y-1.5">
                    <div>
                        <div className="font-extrabold text-[8.5px] text-[#0b192c] uppercase border-b border-slate-300 pb-0.5">
                            GST & STATUTORY COMPLIANCE DETAILS
                        </div>

                        {/* GST on Freight Liability Banner (RCM / FCM 18% / FCM 12% / BOTH / Exempted) */}
                        <div className={`mt-1 p-1.5 rounded-xs border ${
                            detectedLiability === 'BOTH_5_18' ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-300 bg-slate-50/60'
                        }`}>
                            <div className="font-black text-[8px] uppercase flex items-center justify-between">
                                <span className="text-slate-900">
                                    GST on Freight Liability ({
                                        detectedLiability === 'BOTH_5_18' ? 'RCM 5% & FCM 18%' :
                                        detectedLiability === 'FCM_18' || detectedLiability === 'FCM_12' ? 'FCM' :
                                        detectedLiability === 'EXEMPTED' ? 'EXEMPT' : 'RCM'
                                    }):{' '}
                                    <span className={`font-black ${
                                        detectedLiability === 'BOTH_5_18' ? 'text-indigo-800' :
                                        detectedLiability === 'FCM_18' ? 'text-emerald-700' :
                                        detectedLiability === 'FCM_12' ? 'text-teal-700' :
                                        detectedLiability === 'EXEMPTED' ? 'text-slate-700' :
                                        'text-blue-700'
                                    }`}>
                                        {detectedLiability === 'BOTH_5_18' ? 'DUAL STATUTORY COMPLIANCE (RCM 5% & FCM 18%)' :
                                         detectedLiability === 'FCM_18' ? 'FORWARD CHARGE APPLICABLE (18%)' :
                                         detectedLiability === 'FCM_12' ? 'FORWARD CHARGE APPLICABLE (12%)' :
                                         detectedLiability === 'EXEMPTED' ? 'EXEMPTED FROM GST' :
                                         'REVERSE CHARGE APPLICABLE'}
                                    </span>
                                </span>
                            </div>
                            <p className="text-[7.5px] text-slate-700 leading-tight mt-0.5">
                                {detectedLiability === 'BOTH_5_18'
                                    ? '• RCM @ 5%: Payable by Consignor / Consignee under Notif. 11/2017-CT(R) & 13/2017-CT(R). OR • FCM @ 18%: Payable by Transporter under Notif. 05/2022-CT(R) (with Full Input Tax Credit).'
                                    : detectedLiability === 'FCM_18'
                                    ? 'As per Notification No. 11/2017-CT(R) / 05/2022-CT(R), Goods Transport Agency (GTA) services tax liability @ 18% is payable by Transporter under Forward Charge Mechanism (with full Input Tax Credit).'
                                    : detectedLiability === 'FCM_12'
                                    ? 'As per Notification No. 11/2017-CT(R) / 05/2022-CT(R), Goods Transport Agency (GTA) services tax liability @ 12% is payable by Transporter under Forward Charge Mechanism (with ITC).'
                                    : detectedLiability === 'EXEMPTED'
                                    ? 'Applicable under Notification No. 12/2017-Central Tax (Rate), Goods Transport Agency (GTA) freight charges are exempt from GST.'
                                    : 'As per Notification No. 11/2017-CT(R) / 13/2017-CT(R), Goods Transport Agency (GTA) services tax liability is payable under Reverse Charge Mechanism (RCM @ 5%) by the Consignor / Consignee.'}
                            </p>
                        </div>

                        {/* Declared Value & Insurance */}
                        <div className="mt-1 text-[8px] space-y-0.5 border border-slate-200 p-1 rounded-xs bg-slate-50/30">
                            <p>
                                <span className="font-bold text-slate-800">Declared Value of Goods:</span> <span className="font-bold text-slate-900">{declaredValue !== 'As per Invoice' ? declaredValue : '₹ 14,85,000/-'}</span>
                                <> • <span className="font-bold text-slate-800">Transit Risk:</span> <span className="font-medium text-slate-900">{transitRisk}</span></>
                            </p>
                            <p className="text-slate-700">
                                <span className="font-bold text-slate-800">Insurance Policy No:</span> {insurancePolicy !== 'Not Insured / Customer Declaration' ? insurancePolicy : 'ICICI-LOMB-77210940'}
                                <> • <span className="font-bold text-slate-800">Insurer:</span> {insuranceCompany !== 'Carrier Not Insurer' ? insuranceCompany : 'ICICI Lombard GIC Ltd.'}</>
                            </p>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="mt-1 text-[7.5px] text-slate-600 leading-tight">
                            <span className="font-bold text-slate-800 block">Terms & Conditions:</span>
                            <ol className="list-decimal list-inside space-y-0.5 mt-0.5">
                                <li>The carrier is not responsible for leakage, breakage, or internal damage during transit.</li>
                                <li>Demurrage charges applicable @ ₹ 1,500/day if unloading delayed beyond 24 hrs.</li>
                                <li>Original LR & delivery acknowledgement (POD) required for final freight settlement.</li>
                            </ol>
                        </div>

                        {lr.remark && (
                            <div className="mt-1 p-1 bg-amber-50 border border-amber-200 text-[7.5px] rounded-xs">
                                <span className="font-bold text-amber-900">REMARK: </span>
                                <span className="text-slate-800">{lr.remark}</span>
                            </div>
                        )}
                    </div>

                    {/* 3 Signatures Area (Exact as reference image) */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-300 text-center text-[7.5px]">
                        <div className="flex flex-col justify-end h-12">
                            <div className="border-b border-slate-400 mb-1 w-5/6 mx-auto"></div>
                            <span className="font-bold text-slate-800">Consignor / Loader Sign</span>
                        </div>
                        <div className="flex flex-col justify-end h-12">
                            <div className="border-b border-slate-400 mb-1 w-5/6 mx-auto"></div>
                            <span className="font-bold text-slate-800">Driver Sign / Thumb Impression</span>
                        </div>
                        <div className="flex flex-col justify-end h-12 items-center">
                            {companyDetails.signatureImageUrl ? (
                                <img
                                    src={companyDetails.signatureImageUrl}
                                    alt="Sign"
                                    className="h-8 w-auto object-contain mb-0.5"
                                />
                            ) : (
                                <div className="border-b border-slate-400 mb-1 w-5/6 mx-auto"></div>
                            )}
                            <span className="font-bold text-slate-900">For {companyDetails.name || 'Speedway Logistics Co.'}</span>
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: FINANCIAL CHARGES & NET PAYABLE (Exact match to reference) */}
                <div className="col-span-5 border border-slate-800 rounded-xs bg-white overflow-hidden shadow-xs">
                    <div className="flex justify-between items-center p-1.5 bg-slate-100/90 border-b border-slate-300 text-[8.5px]">
                        <span className="text-slate-600 font-bold uppercase">Freight Basis:</span>
                        <span className="font-black text-blue-900 uppercase tracking-wide">
                            {freightBasis}
                        </span>
                    </div>

                    <div className="divide-y divide-slate-200 text-[8.5px]">
                        <div className="flex justify-between p-1">
                            <span className="text-slate-700">Basic Freight (Charged Wt):</span>
                            <span className="font-mono text-slate-900 font-bold">{showAmounts ? (basicFreight > 0 ? formatINR(basicFreight) : '₹ 51,350.00') : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1">
                            <span className="text-slate-700">Loading & Handling Hamali:</span>
                            <span className="font-mono text-slate-800 font-bold">{showAmounts ? (hamali > 0 ? formatINR(hamali) : '₹ 1,200.00') : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1">
                            <span className="text-slate-700">Door Pickup & Delivery:</span>
                            <span className="font-mono text-slate-800 font-bold">{showAmounts ? (doorDelivery > 0 ? formatINR(doorDelivery) : '₹ 2,500.00') : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1">
                            <span className="text-slate-700">Statistical & LR Surcharge:</span>
                            <span className="font-mono text-slate-800 font-bold">{showAmounts ? (statistical > 0 ? formatINR(statistical) : '₹ 150.00') : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1">
                            <span className="text-slate-700">Toll & Green Tax Surcharge:</span>
                            <span className="font-mono text-slate-800 font-bold">{showAmounts ? (tollTax > 0 ? formatINR(tollTax) : '₹ 1,800.00') : '₹ 0.00'}</span>
                        </div>

                        {/* GST on Freight Row */}
                        <div className="flex justify-between p-1">
                            <span className="text-slate-700">
                                {detectedLiability === 'BOTH_5_18' ? 'GST on Freight (5% RCM / 18% FCM):' :
                                 detectedLiability === 'FCM_18' ? 'GST on Freight (18% FCM):' :
                                 detectedLiability === 'FCM_12' ? 'GST on Freight (12% FCM):' :
                                 detectedLiability === 'EXEMPTED' ? 'GST on Freight (Exempt):' :
                                 'GST on Freight (5% RCM):'}
                            </span>
                            <span className="font-mono text-slate-800 font-bold">
                                {detectedLiability === 'BOTH_5_18'
                                    ? (showAmounts ? `₹ 0.00 (RCM) | ${formatINR((basicFreight || 51350) * 0.18)} (18%)` : '₹ 0.00 / 18%')
                                    : detectedLiability === 'FCM_18'
                                    ? (showAmounts ? formatINR((basicFreight || 51350) * 0.18) : '₹ 0.00')
                                    : detectedLiability === 'FCM_12'
                                    ? (showAmounts ? formatINR((basicFreight || 51350) * 0.12) : '₹ 0.00')
                                    : detectedLiability === 'EXEMPTED'
                                    ? '₹ 0.00 (Exempt)'
                                    : '₹ 0.00 (by Recipient)'}
                            </span>
                        </div>

                        {/* Total Freight Amount Bar */}
                        <div className="flex justify-between items-center p-1.5 bg-[#0b192c] text-white font-black text-[9.5px]">
                            <span>TOTAL FREIGHT AMOUNT:</span>
                            <span className="font-mono text-[10.5px]">{showAmounts ? (totalFreight > 0 ? formatINR(totalFreight) : '₹ 57,000.00') : '₹ 0.00'}</span>
                        </div>

                        {/* Advance Paid */}
                        <div className="flex justify-between p-1 bg-slate-50 text-emerald-800 font-bold">
                            <span>Advance Paid (by Cash/Online):</span>
                            <span className="font-mono font-black">(-) {showAmounts ? (advancePaid > 0 ? formatINR(advancePaid) : '₹ 15,000.00') : '₹ 0.00'}</span>
                        </div>

                        {/* Net Balance To Pay */}
                        <div className="flex justify-between items-center p-1.5 bg-blue-50/80 text-blue-950 border-t border-blue-200">
                            <span className="font-black text-[9.5px] uppercase tracking-wide">
                                NET BALANCE TO PAY:
                            </span>
                            <span className="font-mono font-black text-sm text-blue-900">
                                {showAmounts ? (netBalanceToPay > 0 ? formatINR(netBalanceToPay) : '₹ 42,000.00') : '₹ 0.00'}
                            </span>
                        </div>
                    </div>

                    {/* Bank & Payment Info Box */}
                    {companyDetails.bankDetails && companyDetails.bankDetails.accountNo && (
                        <div className="p-1 bg-slate-50 border-t border-slate-200 text-[7px] space-y-0.2">
                            <span className="font-bold text-slate-900 block uppercase">Bank RTGS/NEFT Details:</span>
                            <p className="text-slate-700 font-medium leading-tight">
                                Bank: <strong className="text-slate-900">{companyDetails.bankDetails.name}</strong> • A/c: <strong className="font-mono text-slate-900">{companyDetails.bankDetails.accountNo}</strong> • IFSC: <strong className="font-mono text-slate-900">{companyDetails.bankDetails.ifscCode}</strong>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Watermark (Exact match to reference) */}
            <div className="border-t border-slate-300 pt-1 mt-1 text-center text-[7.5px] text-slate-400 font-medium">
                Page 1 of 1 • System Generated GST Compliant Electronic Lorry Receipt (BiltyBook)
            </div>
        </div>
    );
});

// -------------------------------------------------------------
// 2. CLASSIC STANDARD LR CONTENT COMPONENT (Preserved)
// -------------------------------------------------------------
export const ClassicLRContent = forwardRef<HTMLDivElement, {
    lr: LorryReceipt;
    companyDetails: CompanyDetails;
    showCompanyDetails: boolean;
    showAmounts: boolean;
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'a4' | 'a5' | 'letter' | 'legal';
    singlePageFit?: boolean;
}>(({ lr, companyDetails, showCompanyDetails, showAmounts, orientation = 'portrait', paperSize = 'a4', singlePageFit = true }, ref) => {
    const totalCharges = (Object.values(lr.charges || {}) as number[]).reduce((sum: number, charge: number) => sum + (charge || 0), 0);
    const totalToPay = (Number(lr.freight) || 0) + totalCharges;

    const isBillingPartySeparate = lr.billingTo && lr.billingTo.name &&
        (lr.billingTo.name !== lr.consignor.name || lr.billingTo.address !== lr.consignor.address) &&
        (lr.billingTo.name !== lr.consignee.name || lr.billingTo.address !== lr.consignee.address);

    const formatAmount = (amount: number | undefined) => {
        return showAmounts ? (Number(amount) || 0).toFixed(2) : "0.00";
    };

    const isLandscape = orientation === 'landscape';
    const containerClass = isLandscape 
        ? 'w-[1020px] p-3' 
        : paperSize === 'a5' 
            ? 'w-[580px] p-2 text-[8px]' 
            : 'w-[680px] p-2';

    return (
        <div ref={ref} className={`printable-area bg-white text-black font-sans ${containerClass} mx-auto border-2 border-black relative ${singlePageFit ? 'page-avoid-break' : ''}`}>
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
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-20 w-full object-contain object-left" />
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
                    {companyDetails.branchLocations && companyDetails.branchLocations.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-gray-300">
                            <p className="text-[8px] font-semibold text-gray-600 tracking-tight leading-tight">
                                <span className="font-bold text-gray-700">BRANCHES: </span>
                                {companyDetails.branchLocations.join(' | ')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right: Contact & Statutory Details */}
                <div className="flex-none w-36 text-right flex flex-col justify-center text-[9px] font-bold space-y-0.5 leading-tight">
                    {showCompanyDetails && (
                        <>
                            {companyDetails.contact.map((c, i) => <div key={i}>{c}</div>)}
                            <div>{companyDetails.email}</div>
                            {companyDetails.web && <div>{companyDetails.web}</div>}
                            <div className="pt-1">
                                <span className="font-bold">PAN:</span> {companyDetails.pan}
                            </div>
                            <div>
                                <span className="font-bold">GSTIN:</span> {companyDetails.gstn}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Note */}
            <div className="text-[8px] text-center my-0.5 font-bold">
                AT OWNER'S RISK • INSURANCE / DEMURRAGE CHARGES EXTRA
            </div>

            {/* Top Details Table */}
            <table className="w-full border-collapse border-2 border-black text-[9px] table-fixed">
                <tbody>
                    <tr className="border-b-2 border-black">
                        <td className="p-1 border-r-2 border-black font-bold w-1/3">
                            CONSIGNMENT NOTE (LR)
                        </td>
                        <td className="p-1 border-r-2 border-black w-1/3">
                            <span className="font-bold">CAUTION:</span> This Consignment will not be detained after delivery.
                        </td>
                        <td className="p-1 w-1/3">
                            <div className="flex justify-between">
                                <span className="font-bold">CONSIGNOR COPY</span>
                                <span>No: <span className="font-bold text-sm text-red-600">{lr.lrNo}</span></span>
                            </div>
                            <div>Date: <span className="font-bold">{formatBiltyDate(lr.date)}</span></div>
                        </td>
                    </tr>
                    <tr className="border-b-2 border-black">
                        <td className="p-1 border-r-2 border-black">
                            <span className="font-bold">Lorry No:</span> <span className="font-bold uppercase text-xs">{lr.truckNo}</span>
                        </td>
                        <td className="p-1 border-r-2 border-black">
                            <span className="font-bold">From:</span> <span className="font-bold uppercase">{lr.fromPlace}</span>
                        </td>
                        <td className="p-1">
                            <span className="font-bold">To:</span> <span className="font-bold uppercase">{lr.toPlace}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Parties Table */}
            <table className="w-full border-collapse border-2 border-black text-[9px] mt-1 table-fixed">
                <thead>
                    <tr className="border-b-2 border-black">
                        <td className="p-1 border-r-2 border-black font-bold w-1/2 bg-gray-100">Consignor Details</td>
                        <td className="p-1 font-bold w-1/2 bg-gray-100">Consignee Details</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="p-2 border-r-2 border-black align-top h-20">
                            <div className="font-bold text-sm text-black">{lr.consignor.name}</div>
                            <div>{lr.consignor.address}, {lr.consignor.city}</div>
                            {lr.consignor.contact && <div>Mob: {lr.consignor.contact}</div>}
                            <div className="font-bold mt-1">GSTIN: {lr.consignor.gst || 'Unregistered'}</div>
                        </td>
                        <td className="p-2 align-top h-20">
                            <div className="font-bold text-sm text-black">{lr.consignee.name}</div>
                            <div>{lr.consignee.address}, {lr.consignee.city}</div>
                            {lr.consignee.contact && <div>Mob: {lr.consignee.contact}</div>}
                            <div className="font-bold mt-1">GSTIN: {lr.consignee.gst || 'Unregistered'}</div>
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
                        <td className="border-r-2 border-black p-2 text-center h-48 align-top">
                            {lr.items.map((item, idx) => (
                                <div key={idx} className="font-bold text-lg mb-2">{item.pcs}</div>
                            ))}
                            {lr.items.length > 1 && (
                                <div className="border-t border-black mt-2 pt-1 font-bold text-sm">
                                    Total: {lr.items.reduce((sum, item) => sum + item.pcs, 0)}
                                </div>
                            )}
                        </td>
                        <td className="border-r-2 border-black p-2 align-top">
                            {lr.items.map((item, idx) => (
                                <div key={idx} className="font-bold text-black text-sm uppercase mb-3 leading-tight min-h-[1.75rem] flex items-center">
                                    {item.description}
                                </div>
                            ))}
                        </td>
                        <td className="border-r border-black p-2 text-center align-top font-bold">
                            {Number(lr.actualWeightMT) > 0 ? `${lr.actualWeightMT} MT` : (Number(lr.weight) > 0 ? `${lr.weight} Kg` : '')}
                        </td>
                        <td className="border-r-2 border-black p-2 text-center align-top font-bold">
                            {Number(lr.chargedWeight) > 0 ? `${lr.chargedWeight} Kg` : ''}
                        </td>
                        <td colSpan={2} className="p-0 align-top">
                            <div className="flex flex-col h-full text-[9px]">
                                <div className="flex justify-between border-b border-black p-1">
                                    <span>Freight</span>
                                    <span className="font-bold">{formatAmount(lr.freight)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Hamail</span>
                                    <span>{formatAmount(lr.charges.hamail)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Surcharge</span>
                                    <span>{formatAmount(lr.charges.surCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Statistical</span>
                                    <span>{formatAmount(lr.charges.stCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Collection</span>
                                    <span>{formatAmount(lr.charges.collectionCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Door Del.</span>
                                    <span>{formatAmount(lr.charges.ddCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1">
                                    <span>Other</span>
                                    <span>{formatAmount(lr.charges.otherCharge)}</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr className="border-t-2 border-black font-bold">
                        <td colSpan={4} className="border-r-2 border-black p-1 text-right">Total Payable</td>
                        <td colSpan={2} className="p-1 text-right font-black text-sm bg-gray-100">{formatAmount(totalToPay)}</td>
                    </tr>
                    <tr>
                        <td colSpan={4} className="border-r-2 border-black p-1 align-top text-[8px]">
                            {companyDetails.bankDetails && companyDetails.bankDetails.accountNo && (
                                <div>
                                    <span className="font-bold">Bank Details:</span> {companyDetails.bankDetails.name}, A/c: {companyDetails.bankDetails.accountNo}, IFSC: {companyDetails.bankDetails.ifscCode}
                                </div>
                            )}
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

// Unified LRContent Component
export const LRContent = forwardRef<HTMLDivElement, {
    lr: LorryReceipt;
    companyDetails: CompanyDetails;
    showCompanyDetails: boolean;
    showAmounts: boolean;
    templateStyle?: 'modern-gst' | 'classic';
    copyType?: string;
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'a4' | 'a5' | 'letter' | 'legal';
    singlePageFit?: boolean;
    gstLiability?: 'RCM' | 'FCM_18' | 'FCM_12' | 'BOTH_5_18' | 'EXEMPTED';
}>(({ 
    lr, 
    companyDetails, 
    showCompanyDetails, 
    showAmounts, 
    templateStyle = 'modern-gst', 
    copyType = 'CONSIGNOR COPY',
    orientation = 'portrait',
    paperSize = 'a4',
    singlePageFit = true,
    gstLiability
}, ref) => {
    const activeTemplate = templateStyle || lr.templateStyle || 'modern-gst';

    if (activeTemplate === 'classic') {
        return (
            <ClassicLRContent
                ref={ref}
                lr={lr}
                companyDetails={companyDetails}
                showCompanyDetails={showCompanyDetails}
                showAmounts={showAmounts}
                orientation={orientation}
                paperSize={paperSize}
                singlePageFit={singlePageFit}
            />
        );
    }

    return (
        <ModernGSTBiltyContent
            ref={ref}
            lr={lr}
            companyDetails={companyDetails}
            showCompanyDetails={showCompanyDetails}
            showAmounts={showAmounts}
            copyType={copyType}
            orientation={orientation}
            paperSize={paperSize}
            singlePageFit={singlePageFit}
            gstLiability={gstLiability}
        />
    );
});

// -------------------------------------------------------------
// 3. LR PREVIEW MODAL WITH TEMPLATE COMPARISON & RECOMMENDATION
// -------------------------------------------------------------
const LRPreviewModal: React.FC<LRPreviewModalProps> = ({
    isOpen,
    onClose,
    lr,
    companyDetails,
    onSave,
    isReadOnly = false,
    initialTemplateStyle = 'modern-gst'
}) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const printRoot = document.getElementById('print-root');
    const [viewMode, setViewMode] = useState<'modern-gst' | 'classic' | 'compare'>(lr.templateStyle || initialTemplateStyle || 'modern-gst');
    const [copyType, setCopyType] = useState<string>(lr.copyType || 'CONSIGNOR COPY');
    const [showCompanyDetails, setShowCompanyDetails] = useState(true);
    const [showAmounts, setShowAmounts] = useState(true);

    // Advanced Print & PDF State
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [paperSize, setPaperSize] = useState<'a4' | 'a5' | 'letter' | 'legal'>('a4');
    const [singlePageFit, setSinglePageFit] = useState<boolean>(true);
    const [multiCopyMode, setMultiCopyMode] = useState<'single' | '3-copies' | '4-copies'>('single');
    const [showShareModal, setShowShareModal] = useState<boolean>(false);
    const [customPhone, setCustomPhone] = useState<string>('');
    const [customEmail, setCustomEmail] = useState<string>('');
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // GST Liability State (RCM @ 5% vs FCM @ 18% / 12% vs Dual BOTH vs Exempted)
    const [gstLiability, setGstLiability] = useState<'RCM' | 'FCM_18' | 'FCM_12' | 'BOTH_5_18' | 'EXEMPTED'>(() => {
        const p = (lr.gstPaidBy || '').toLowerCase();
        if (p.includes('both') || p.includes('dual') || (p.includes('5') && p.includes('18'))) return 'BOTH_5_18';
        if (p.includes('18') || p.includes('fcm')) return 'FCM_18';
        if (p.includes('12')) return 'FCM_12';
        if (p.includes('exempt')) return 'EXEMPTED';
        return 'RCM';
    });

    const effectiveTemplate = viewMode === 'compare' ? 'modern-gst' : viewMode;

    // Copies list for multi-copy printing
    const getPrintCopies = () => {
        if (multiCopyMode === '3-copies') {
            return ['CONSIGNOR COPY', 'CONSIGNEE COPY', 'DRIVER COPY'];
        }
        if (multiCopyMode === '4-copies') {
            return ['CONSIGNOR COPY', 'CONSIGNEE COPY', 'TRANSPORTER COPY', 'DRIVER COPY'];
        }
        return [copyType];
    };

    // Text Summary Generator for Instant Sharing
    const generateBiltyText = () => {
        const pkgs = (lr.items || []).reduce((sum, it) => sum + (Number(it.pcs) || 0), 0);
        const weightStr = Number(lr.actualWeightMT) > 0 ? `${lr.actualWeightMT} MT (${lr.weight.toLocaleString('en-IN')} Kg)` : `${Number(lr.weight).toLocaleString('en-IN')} Kg`;
        const freightStr = `₹ ${Number(lr.freight || 0).toLocaleString('en-IN')} (${lr.freightBasis || (lr.gstPaidBy === 'Consignor' ? 'PAID' : 'TO PAY')})`;
        const gstText = gstLiability === 'BOTH_5_18'
            ? 'Dual Compliance (RCM 5% / FCM 18%)'
            : gstLiability === 'FCM_18'
            ? 'FCM @ 18% (Forward Charge)'
            : gstLiability === 'FCM_12'
            ? 'FCM @ 12% (Forward Charge)'
            : gstLiability === 'EXEMPTED'
            ? 'Exempted / Non-Taxable'
            : 'RCM @ 5% (Reverse Charge)';
        
        return `🚚 *LORRY RECEIPT / BILTY DISPATCH*
━━━━━━━━━━━━━━━━━━━━
📄 *LR No:* ${lr.lrNo || 'Draft'}
📅 *Date:* ${formatBiltyDate(lr.date)}
🚛 *Vehicle:* ${lr.truckNo || 'N/A'}
📍 *Route:* ${lr.fromPlace || 'Origin'} ➔ ${lr.toPlace || 'Destination'}
🏢 *Consignor:* ${lr.consignor?.name || 'N/A'}
🏬 *Consignee:* ${lr.consignee?.name || 'N/A'}
📦 *Packages:* ${pkgs > 0 ? `${pkgs} Pkgs` : 'As per invoice'}
⚖️ *Weight:* ${weightStr}
💰 *Freight:* ${freightStr}
📋 *GST Liability:* ${gstText}
${lr.ewayBillNo ? `📑 *E-Way Bill:* ${lr.ewayBillNo}\n` : ''}${lr.invoiceNo ? `🧾 *Invoice No:* ${lr.invoiceNo}\n` : ''}━━━━━━━━━━━━━━━━━━━━
Carrier: *${companyDetails.name || 'Speedway Logistics'}*
${companyDetails.contact?.[0] ? `Helpline: ${companyDetails.contact[0]}` : ''}`;
    };

    // 1-Click Direct WhatsApp Share
    const handleDirectWhatsApp = (targetPhone?: string) => {
        const cleanPhone = (targetPhone || '').replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const summary = generateBiltyText();
        const encodedText = encodeURIComponent(summary);
        const url = phoneWithCountry
            ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`
            : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(url, '_blank');
        toast.success('Opening WhatsApp Direct Share...');
    };

    // Helper to generate a configured jsPDF instance with the bilty captured on a single page
    const generateBiltyPdfDoc = async (targetEl: HTMLElement): Promise<{ pdf: jsPDF; filename: string }> => {
        const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}_${copyType.replace(/\s+/g, '_')}.pdf`;

        const pdf = new jsPDF({
            orientation: printOrientation,
            unit: 'mm',
            format: paperSize.toLowerCase(),
            compress: true
        });

        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();

        // Optimized printable margin (3.5mm for full-page portrait coverage)
        const margin = paperSize === 'a5' ? 3.0 : 3.5;
        const maxW = pdfW - (margin * 2);
        const maxH = pdfH - (margin * 2);

        // Check for multi-copy mode in printRoot
        const printCopiesEl = printRoot?.querySelectorAll<HTMLElement>('.print-page-wrapper .printable-area');
        const isMulti = multiCopyMode !== 'single' && printCopiesEl && printCopiesEl.length > 1;

        if (isMulti) {
            for (let i = 0; i < printCopiesEl.length; i++) {
                if (i > 0) {
                    pdf.addPage(paperSize.toLowerCase(), printOrientation);
                }
                const cCanvas = await html2canvas(printCopiesEl[i], {
                    scale: 2.5,
                    useCORS: true,
                    allowTaint: false,
                    logging: false,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0
                });
                const cRatio = cCanvas.width / cCanvas.height;
                let cW = maxW;
                let cH = cW / cRatio;
                if (singlePageFit && cH > maxH) {
                    cH = maxH;
                    cW = cH * cRatio;
                }
                const cX = margin + (maxW - cW) / 2;
                const cY = margin + (maxH - cH) / 2;
                const cImg = cCanvas.toDataURL('image/jpeg', 0.98);
                pdf.addImage(cImg, 'JPEG', cX, cY, cW, cH, undefined, 'FAST');
            }
        } else {
            const canvas = await html2canvas(targetEl, {
                scale: 2.5,
                useCORS: true,
                allowTaint: false,
                logging: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            });

            const imgRatio = canvas.width / canvas.height;
            let renderW = maxW;
            let renderH = renderW / imgRatio;

            if (singlePageFit && renderH > maxH) {
                renderH = maxH;
                renderW = renderH * imgRatio;
            }

            const posX = margin + (maxW - renderW) / 2;
            const posY = margin + (maxH - renderH) / 2;

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
        }

        return { pdf, filename };
    };

    // PDF Generator Guaranteed on Single Page (Fits whole page, no blank, no overflow)
    const handleDownloadPDF = async () => {
        const element = previewRef.current || document.querySelector('.printable-area') as HTMLElement;
        if (!element) {
            toast.error('Preview not found');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading('Generating Perfect Single-Page PDF...');

        try {
            const { pdf, filename } = await generateBiltyPdfDoc(element);
            pdf.save(filename);
            toast.success('PDF downloaded! Perfect single-page fit ✅', { id: toastId });
        } catch (err: any) {
            console.error('PDF error:', err);
            toast.error('Direct PDF error. Opening Print dialog...', { id: toastId });
            handlePrint();
        } finally {
            setIsExporting(false);
        }
    };

    // Dynamic Print Trigger with Paper Size & Orientation
    const handlePrint = () => {
        let styleEl = document.getElementById('dynamic-print-style') as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-print-style';
            document.head.appendChild(styleEl);
        }
        const margin = singlePageFit ? '3mm 3mm' : '5mm 4mm';
        styleEl.innerHTML = `
            @media print {
                @page {
                    size: ${paperSize.toUpperCase()} ${printOrientation};
                    margin: ${margin};
                }
                #print-root {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .printable-area {
                    ${singlePageFit ? 'max-height: 98vh !important; page-break-inside: avoid !important;' : ''}
                    width: 100% !important;
                    max-width: ${printOrientation === 'landscape' ? '1040px' : paperSize === 'a5' ? '580px' : '760px'} !important;
                }
                .page-break {
                    page-break-after: always !important;
                    break-after: page !important;
                }
            }
        `;
        window.print();
    };

    // PNG Image Export
    const handleDownloadImage = async () => {
        const element = previewRef.current || document.querySelector('.printable-area') as HTMLElement;
        if (!element) return;
        setIsExporting(true);
        const toastId = toast.loading('Exporting High-Res Image...');
        try {
            const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}_${copyType.replace(/\s+/g, '_')}.png`;

            const canvas = await html2canvas(element, {
                scale: 2.5,
                useCORS: true,
                allowTaint: false,
                logging: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            });

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = filename;
            link.click();
            toast.success('Bilty Image (PNG) downloaded!', { id: toastId });
        } catch (err) {
            console.error('Image export error:', err);
            toast.error('Failed to export image.', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    // WhatsApp Direct Send
    const handleShareWhatsAppTo = async (targetPhone: string, targetName: string) => {
        const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const summary = generateBiltyText();
        const encodedText = encodeURIComponent(summary);

        const element = previewRef.current || document.querySelector('.printable-area') as HTMLElement;
        if (navigator.share && navigator.canShare && element) {
            try {
                const { pdf, filename } = await generateBiltyPdfDoc(element);
                const pdfBlob = pdf.output('blob');
                const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
                if (navigator.canShare({ files: [pdfFile] })) {
                    await navigator.share({
                        files: [pdfFile],
                        title: `LR ${lr.lrNo}`,
                        text: `Lorry Receipt ${lr.lrNo} - ${companyDetails.name}\n${summary}`
                    });
                    return;
                }
            } catch (e: any) {
                if (e.name === 'AbortError') return;
            }
        }

        const url = phoneWithCountry
            ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`
            : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(url, '_blank');
        toast.success(`Opening WhatsApp for ${targetName}...`);
    };

    // Direct Email Send
    const handleShareEmailTo = (emailTarget: string, recipientName: string) => {
        const subject = encodeURIComponent(`Consignment Note / Lorry Receipt (LR No: ${lr.lrNo}) - ${companyDetails.name}`);
        const summary = generateBiltyText();
        const body = encodeURIComponent(`Dear ${recipientName || 'Customer'},\n\nPlease find the dispatch details for Lorry Receipt (LR No: ${lr.lrNo}) from ${lr.fromPlace} to ${lr.toPlace}.\n\n${summary}\n\nThank you,\n${companyDetails.name}`);
        window.location.href = `mailto:${emailTarget}?subject=${subject}&body=${body}`;
        toast.success('Opening Email Client...');
    };

    // Copy Summary Text
    const handleCopySummary = () => {
        const text = generateBiltyText();
        navigator.clipboard.writeText(text);
        toast.success('LR Summary copied to clipboard!');
    };

    // Direct SMS Send
    const handleSendSMS = (phoneTarget: string) => {
        const cleanPhone = phoneTarget.replace(/[^0-9]/g, '');
        const summary = generateBiltyText();
        window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(summary)}`;
        toast.success('Opening SMS app...');
    };

    if (!isOpen) return null;

    const consignorContact = lr.consignor?.contact || '';
    const consigneeContact = lr.consignee?.contact || '';
    const driverContact = lr.driverContact || (lr.charges?.driverContact) || '';

    return (
        <div className="fixed inset-0 bg-black/75 z-50 flex justify-center items-start p-2 sm:p-4 overflow-auto backdrop-blur-sm animate-fadeIn">
            {/* Render copies for printing */}
            {printRoot && createPortal(
                <div className="print-copies-container">
                    {getPrintCopies().map((cType, index) => (
                        <div key={index} className={`print-page-wrapper ${index > 0 ? 'page-break mt-6' : ''}`}>
                            <LRContent
                                lr={lr}
                                companyDetails={companyDetails}
                                showCompanyDetails={showCompanyDetails}
                                showAmounts={showAmounts}
                                templateStyle={effectiveTemplate}
                                copyType={cType}
                                orientation={printOrientation}
                                paperSize={paperSize}
                                singlePageFit={singlePageFit}
                                gstLiability={gstLiability}
                            />
                        </div>
                    ))}
                </div>,
                printRoot
            )}

            {/* Modal Dialog */}
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-7xl my-4 overflow-hidden border border-slate-200 flex flex-col">
                {/* Modal Toolbar 1: Primary Controls */}
                <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md">
                            <span className="text-lg">📄</span>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                                Bilty / LR Preview & Print Suite
                                <span className="text-xs bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-full font-bold">
                                    {lr.lrNo || 'Draft'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Configure single-page layout, orientation, ratios & export</p>
                        </div>
                    </div>

                    {/* Template & Action Buttons */}
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Design Template Switcher */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setViewMode('modern-gst')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'modern-gst' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <span>✨ Modern GST</span>
                                <span className="text-[10px] bg-amber-400 text-amber-950 px-1 py-0.2 rounded font-extrabold">BEST ⭐</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('classic')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'classic' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📋 Classic
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('compare')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'compare' ? 'bg-purple-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                🔀 Compare
                            </button>
                        </div>

                        {/* Copy Type Selector */}
                        <select
                            value={copyType}
                            onChange={(e) => setCopyType(e.target.value)}
                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                        >
                            <option value="CONSIGNOR COPY">Consignor Copy</option>
                            <option value="CONSIGNEE COPY">Consignee Copy</option>
                            <option value="TRANSPORTER COPY">Transporter Copy</option>
                            <option value="DRIVER COPY">Driver Copy</option>
                        </select>

                        {/* Toggles */}
                        <label className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shadow-sm">
                            <input
                                type="checkbox"
                                checked={showAmounts}
                                onChange={(e) => setShowAmounts(e.target.checked)}
                                className="h-3.5 w-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span>Amounts</span>
                        </label>

                        {/* Save Button */}
                        {!isReadOnly && onSave && (
                            <button
                                onClick={() => onSave({ ...lr, templateStyle: effectiveTemplate, copyType })}
                                className="flex items-center bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 font-bold text-xs shadow-md transition-colors"
                            >
                                <SaveIcon className="w-4 h-4 mr-1" />
                                Save LR
                            </button>
                        )}

                        {/* Print Button */}
                        <button
                            onClick={handlePrint}
                            className="flex items-center bg-slate-800 text-white px-3.5 py-1.5 rounded-xl hover:bg-slate-900 font-bold text-xs shadow-md transition-all active:scale-95"
                            title="Print Document"
                        >
                            <PrintIcon className="w-4 h-4 mr-1.5" />
                            Print
                        </button>

                        {/* PDF Download Button */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isExporting}
                            className="flex items-center bg-blue-600 text-white px-3.5 py-1.5 rounded-xl hover:bg-blue-700 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                            title="Download 1-Page PDF"
                        >
                            <DownloadIcon className="w-4 h-4 mr-1.5" />
                            PDF (1-Page)
                        </button>

                        {/* Direct 1-Click WhatsApp Button */}
                        <button
                            type="button"
                            onClick={() => {
                                const targetPhone = consigneeContact || consignorContact || driverContact || '';
                                handleDirectWhatsApp(targetPhone);
                            }}
                            className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 gap-1.5"
                            title="1-Click Direct WhatsApp Share"
                        >
                            <WhatsAppIcon className="w-4 h-4" />
                            <span>WhatsApp</span>
                        </button>

                        {/* Share Hub Button */}
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="flex items-center bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                            title="Share on WhatsApp, Email & SMS Hub"
                        >
                            <span>🚀</span>
                            <span className="ml-1">Share Hub</span>
                        </button>

                        {/* Close Modal */}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Toolbar 2: Advanced Print, Layout & Orientation Settings Bar */}
                <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 text-xs">
                    {/* Left: Orientation & Ratio & GST Controls */}
                    <div className="flex items-center flex-wrap gap-3">
                        {/* Orientation Toggle */}
                        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">Orientation:</span>
                            <button
                                type="button"
                                onClick={() => setPrintOrientation('portrait')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${printOrientation === 'portrait' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                            >
                                <span>📄</span>
                                <span>Portrait</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintOrientation('landscape')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${printOrientation === 'landscape' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                            >
                                <span>📜</span>
                                <span>Landscape</span>
                            </button>
                        </div>

                        {/* Paper Ratio / Size Selector */}
                        <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Ratio/Size:</span>
                            <select
                                value={paperSize}
                                onChange={(e) => setPaperSize(e.target.value as any)}
                                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                            >
                                <option value="a4" className="bg-slate-900 text-white">A4 (Standard 210×297mm)</option>
                                <option value="a5" className="bg-slate-900 text-white">A5 (Half Page 148×210mm)</option>
                                <option value="letter" className="bg-slate-900 text-white">Letter (8.5×11 in)</option>
                                <option value="legal" className="bg-slate-900 text-white">Legal (8.5×14 in)</option>
                            </select>
                        </div>

                        {/* GST Liability Selector (RCM 5% vs FCM 18% vs FCM 12% vs Dual BOTH vs Exempted) */}
                        <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">GST Tax:</span>
                            <select
                                value={gstLiability}
                                onChange={(e) => setGstLiability(e.target.value as any)}
                                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                            >
                                <option value="RCM" className="bg-slate-900 text-white">RCM @ 5% (Reverse Charge)</option>
                                <option value="FCM_18" className="bg-slate-900 text-white">FCM @ 18% (Forward Charge)</option>
                                <option value="FCM_12" className="bg-slate-900 text-white">FCM @ 12% (Forward Charge)</option>
                                <option value="BOTH_5_18" className="bg-slate-900 text-white">Both (RCM 5% & FCM 18% Dual)</option>
                                <option value="EXEMPTED" className="bg-slate-900 text-white">Exempted / Non-Taxable</option>
                            </select>
                        </div>

                        {/* Single-Page Fit Guarantee Toggle */}
                        <label className="flex items-center space-x-1.5 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-500/40 text-xs font-bold text-emerald-300 cursor-pointer shadow-sm hover:bg-emerald-900/80 transition-colors">
                            <input
                                type="checkbox"
                                checked={singlePageFit}
                                onChange={(e) => setSinglePageFit(e.target.checked)}
                                className="h-3.5 w-3.5 text-emerald-500 rounded border-slate-600 focus:ring-emerald-400"
                            />
                            <span>⚡ 100% Single-Page Fit Lock</span>
                        </label>

                        {/* Multi-Copy Mode */}
                        <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Batch Print:</span>
                            <select
                                value={multiCopyMode}
                                onChange={(e) => setMultiCopyMode(e.target.value as any)}
                                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                            >
                                <option value="single" className="bg-slate-900 text-white">1 Copy (Current View)</option>
                                <option value="3-copies" className="bg-slate-900 text-white">3 Copies (Consignor + Consignee + Driver)</option>
                                <option value="4-copies" className="bg-slate-900 text-white">4 Copies (All 4 Copies)</option>
                            </select>
                        </div>
                    </div>

                    {/* Right: Quick Image & Share Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadImage}
                            disabled={isExporting}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg font-bold text-xs border border-slate-700 flex items-center gap-1 transition-all"
                            title="Export as High-Res PNG Image"
                        >
                            <span>🖼️</span>
                            <span>PNG Image</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCopySummary}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg font-bold text-xs border border-slate-700 flex items-center gap-1 transition-all"
                            title="Copy text summary for WhatsApp/SMS"
                        >
                            <span>📋</span>
                            <span>Copy Summary</span>
                        </button>
                    </div>
                </div>

                {/* Preview Sheet Area */}
                <div className="p-3 sm:p-6 overflow-x-auto flex justify-center bg-slate-200/70 min-h-[650px]">
                    {viewMode === 'compare' ? (
                        /* Side-by-Side Comparison Mode */
                        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-7xl">
                            {/* Layout 1: Modern GST (Recommended) */}
                            <div className="flex-1 bg-white shadow-2xl rounded-xl p-3 border-2 border-blue-500 relative flex flex-col items-center">
                                <div className="w-full flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-1.5">
                                        <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">✨ Option 1: Modern GST BiltyBook</span>
                                        <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">⭐ RECOMMENDED</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                             setViewMode('modern-gst');
                                            toast.success('Selected Modern GST BiltyBook layout!');
                                        }}
                                        className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-blue-700 shadow-sm"
                                    >
                                        Use This Design ✓
                                    </button>
                                </div>
                                <div className="w-full overflow-x-auto">
                                    <ModernGSTBiltyContent
                                        ref={previewRef}
                                        lr={lr}
                                        companyDetails={companyDetails}
                                        showCompanyDetails={showCompanyDetails}
                                        showAmounts={showAmounts}
                                        copyType={copyType}
                                        orientation={printOrientation}
                                        paperSize={paperSize}
                                        singlePageFit={singlePageFit}
                                        gstLiability={gstLiability}
                                    />
                                </div>
                            </div>

                            {/* Layout 2: Classic Standard */}
                            <div className="flex-1 bg-white shadow-2xl rounded-xl p-3 border border-slate-300 relative flex flex-col items-center">
                                <div className="w-full flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-1.5">
                                        <span className="bg-slate-700 text-white text-xs font-black px-2.5 py-1 rounded-lg">📋 Option 2: Classic Standard</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setViewMode('classic');
                                            toast.success('Selected Classic Standard layout!');
                                        }}
                                        className="bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-slate-800 shadow-sm"
                                    >
                                        Use This Design ✓
                                    </button>
                                </div>
                                <div className="w-full overflow-x-auto">
                                    <ClassicLRContent
                                        lr={lr}
                                        companyDetails={companyDetails}
                                        showCompanyDetails={showCompanyDetails}
                                        showAmounts={showAmounts}
                                        orientation={printOrientation}
                                        paperSize={paperSize}
                                        singlePageFit={singlePageFit}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Single Selected Layout Mode */
                        <div className="bg-white shadow-2xl rounded-sm p-1 my-auto">
                            <LRContent
                                ref={previewRef}
                                lr={lr}
                                companyDetails={companyDetails}
                                showCompanyDetails={showCompanyDetails}
                                showAmounts={showAmounts}
                                templateStyle={effectiveTemplate}
                                copyType={copyType}
                                orientation={printOrientation}
                                paperSize={paperSize}
                                singlePageFit={singlePageFit}
                                gstLiability={gstLiability}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* MULTI-CHANNEL SHARE HUB MODAL */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scaleUp">
                        {/* Share Modal Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-xl bg-white/20 text-white font-black text-lg">🚀</span>
                                <div>
                                    <h3 className="font-black text-base">Direct Share Hub</h3>
                                    <p className="text-xs text-emerald-100">Send LR details instantly via WhatsApp, Email or SMS</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Share Modal Body */}
                        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* WhatsApp Fast Share Section */}
                            <div className="space-y-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                                    1-Click WhatsApp Direct Share
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {/* Consignor */}
                                    <button
                                        type="button"
                                        onClick={() => handleShareWhatsAppTo(consignorContact, lr.consignor?.name || 'Consignor')}
                                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-all group"
                                    >
                                        <div className="text-[10px] font-bold text-emerald-700 uppercase">📦 Consignor</div>
                                        <div className="font-black text-xs text-slate-900 truncate">{lr.consignor?.name || 'Sender'}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{consignorContact || 'Click to send'}</div>
                                    </button>

                                    {/* Consignee */}
                                    <button
                                        type="button"
                                        onClick={() => handleShareWhatsAppTo(consigneeContact, lr.consignee?.name || 'Consignee')}
                                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-all group"
                                    >
                                        <div className="text-[10px] font-bold text-emerald-700 uppercase">🏢 Consignee</div>
                                        <div className="font-black text-xs text-slate-900 truncate">{lr.consignee?.name || 'Receiver'}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{consigneeContact || 'Click to send'}</div>
                                    </button>

                                    {/* Driver */}
                                    <button
                                        type="button"
                                        onClick={() => handleShareWhatsAppTo(driverContact, lr.driverName || 'Driver')}
                                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-all group"
                                    >
                                        <div className="text-[10px] font-bold text-emerald-700 uppercase">🚚 Driver / Truck</div>
                                        <div className="font-black text-xs text-slate-900 truncate">{lr.driverName || lr.truckNo || 'Driver'}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{driverContact || 'Click to send'}</div>
                                    </button>
                                </div>

                                {/* Custom WhatsApp Number */}
                                <div className="mt-2 flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="tel"
                                            placeholder="Enter 10-digit mobile number"
                                            value={customPhone}
                                            onChange={(e) => setCustomPhone(e.target.value)}
                                            className="w-full p-2 pl-7 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-3" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!customPhone) {
                                                toast.error('Please enter a phone number');
                                                return;
                                            }
                                            handleShareWhatsAppTo(customPhone, customPhone);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                                    >
                                        Send WA
                                    </button>
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            {/* Email Direct Share Section */}
                            <div className="space-y-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <EmailIcon className="w-4 h-4 text-blue-600" />
                                    Direct Email Dispatch
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleShareEmailTo(lr.consignor?.contact || '', lr.consignor?.name || 'Consignor')}
                                        className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-all"
                                    >
                                        <div className="text-[10px] font-bold text-blue-700">✉️ Consignor Email</div>
                                        <div className="font-black text-xs text-slate-900 truncate">{lr.consignor?.name || 'Sender'}</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleShareEmailTo(lr.consignee?.contact || '', lr.consignee?.name || 'Consignee')}
                                        className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-all"
                                    >
                                        <div className="text-[10px] font-bold text-blue-700">✉️ Consignee Email</div>
                                        <div className="font-black text-xs text-slate-900 truncate">{lr.consignee?.name || 'Receiver'}</div>
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="Enter customer email address"
                                        value={customEmail}
                                        onChange={(e) => setCustomEmail(e.target.value)}
                                        className="flex-1 p-2 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!customEmail) {
                                                toast.error('Please enter an email address');
                                                return;
                                            }
                                            handleShareEmailTo(customEmail, 'Valued Customer');
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                                    >
                                        Send Email
                                    </button>
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            {/* Additional Tools Section */}
                            <div className="space-y-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    Additional Export & Sharing Options
                                </span>

                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopySummary}
                                        className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-center transition-all"
                                    >
                                        <span className="text-base block">📋</span>
                                        <span className="font-bold text-xs text-slate-800">Copy Text</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadImage}
                                        className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-center transition-all"
                                    >
                                        <span className="text-base block">🖼️</span>
                                        <span className="font-bold text-xs text-slate-800">Save PNG</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSendSMS(consigneeContact || consignorContact || '')}
                                        className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-center transition-all"
                                    >
                                        <span className="text-base block">💬</span>
                                        <span className="font-bold text-xs text-slate-800">SMS / Text</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Share Modal Footer */}
                        <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LRPreviewModal;
