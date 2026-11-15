import React, { useRef, forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LorryReceipt, CompanyDetails } from '../types';
import { DownloadIcon, WhatsAppIcon, EmailIcon, XIcon, SaveIcon, PrintIcon } from './icons';
import { openWhatsAppDirect } from '../utils/whatsapp';

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
        ? 'w-[1040px] max-w-full p-4 text-[10px] min-h-[680px] flex flex-col justify-between' 
        : paperSize === 'a5' 
            ? 'w-[580px] max-w-full p-2.5 text-[9px]' 
            : 'w-[794px] max-w-full p-5 text-[11px] min-h-[1050px] flex flex-col justify-between';

    const detectedLiability = (() => {
        if (gstLiability) return gstLiability;
        const p = (lr.gstPaidBy || '').toLowerCase();
        if (p.includes('both') || p.includes('dual') || (p.includes('5') && p.includes('18'))) return 'BOTH_5_18';
        if (p.includes('18') || p.includes('fcm')) return 'FCM_18';
        if (p.includes('12')) return 'FCM_12';
        if (p.includes('exempt')) return 'EXEMPTED';
        return 'RCM';
    })();

    return (
        <div
            ref={ref}
            className={`printable-area bg-white text-slate-900 font-sans mx-auto border-2 border-slate-900 shadow-md ${containerClass} leading-snug relative selection:bg-blue-100 ${singlePageFit ? 'page-avoid-break' : ''}`}
        >
            {/* Top Company Header & LR Document Details */}
            <div className="flex flex-row justify-between items-start border-b-2 border-slate-900 pb-2.5 gap-3">
                <div className="flex-1">
                    <div className="flex items-start gap-3">
                        {companyDetails.logoUrl && (
                            <img
                                src={companyDetails.logoUrl}
                                alt="Logo"
                                className="h-16 w-auto max-w-[85px] object-contain mt-0.5"
                            />
                        )}
                        <div>
                            <h1 className="font-black text-[#0b192c] text-[25px] uppercase tracking-tight leading-tight">
                                {companyDetails.name || ''}
                            </h1>
                            <p className="text-[11px] font-bold text-slate-700">
                                {companyDetails.tagline || ''}
                            </p>
                        </div>
                    </div>

                    <div className="mt-1.5 space-y-0.5 text-[10.5px] text-slate-800">
                        <p className="leading-snug font-semibold text-slate-900">
                            {companyDetails.address && <><span className="font-black text-slate-950">Regd Off:</span> {companyDetails.address}</>}
                            {companyDetails.jurisdictionCity ? ` • Sub to ${companyDetails.jurisdictionCity} Jurisdiction` : ''}
                        </p>
                        {showCompanyDetails && companyDetails.gstn && (
                            <p className="font-bold text-slate-900">
                                <span className="font-black text-slate-950">GSTIN:</span> <span className="font-mono font-black text-slate-950">{companyDetails.gstn}</span>
                                {companyDetails.pan && <> • <span className="font-black text-slate-950">PAN:</span> <span className="font-mono font-black text-slate-950">{companyDetails.pan}</span></>}
                                <> • <span className="font-black text-slate-950">State Code:</span> <span className="font-mono font-black text-slate-950">{getStateCodeFromGst(companyDetails.gstn) || '--'}</span></>
                            </p>
                        )}
                        <p className="text-slate-800 font-bold">
                            {companyDetails.email && <><span className="font-black text-slate-950">Email:</span> <span className="font-bold text-slate-900">{companyDetails.email}</span></>}
                            {companyDetails.contact && companyDetails.contact.length > 0 && (
                                <> • <span className="font-black text-slate-950">Helpline:</span> <span className="font-bold text-slate-900">{companyDetails.contact.join(', ')}</span></>
                            )}
                        </p>
                    </div>
                </div>

                {/* Right: Modern Exact Doc Details Box */}
                <div className="w-[290px] bg-slate-50 border-2 border-slate-900 rounded-xs overflow-hidden flex flex-col justify-between">
                    <div className="bg-[#0b192c] text-white py-1.5 px-2 text-center">
                        <span className="font-black text-[13px] uppercase tracking-wider block">
                            CONSIGNMENT NOTE / LR
                        </span>
                    </div>
                    
                    <div className="bg-slate-100 py-1 px-2 text-center border-b border-slate-300">
                        <span className="font-black text-[10.5px] text-blue-900 uppercase tracking-widest">
                            {activeCopy}
                        </span>
                    </div>

                    <div className="p-2.5 space-y-1 text-[10.5px]">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-bold">LR / Bilty No:</span>
                            <span className="font-mono font-black text-[14px] text-blue-900">
                                {lr.lrNo || '--'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-bold">LR Date:</span>
                            <span className="font-black text-slate-950">{formatDisplayDate(lr.date)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-bold">E-Way Bill No:</span>
                            <span className="font-mono font-black text-slate-950">
                                {lr.ewayBillNo || '--'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-bold">EWB Valid Upto:</span>
                            <span className="font-black text-slate-950">
                                {lr.ewayExDate ? formatDisplayDate(lr.ewayExDate) : (lr.ewayBillDate ? formatDisplayDate(lr.ewayBillDate) : '--')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dark Navy Route & Vehicle Ribbon */}
            <div className="bg-[#0b192c] text-white flex justify-between items-center px-4 py-2.5 my-2.5 rounded-xs border border-slate-800">
                {/* Left: Origin -> Destination */}
                <div className="flex items-center gap-3">
                    <div>
                        <span className="text-slate-300 font-bold text-[9px] uppercase tracking-wider block">
                            SOURCE • ORIGIN
                        </span>
                        <span className="font-black text-[14.5px] uppercase tracking-wide text-white">
                            {lr.fromPlace || '--'}
                        </span>
                    </div>
                    
                    <span className="text-cyan-300 font-black text-xl px-2">➔</span>

                    <div>
                        <span className="text-slate-300 font-bold text-[9px] uppercase tracking-wider block">
                            DESTINATION • DELIVERY POINT
                        </span>
                        <span className="font-black text-[14.5px] uppercase tracking-wide text-white">
                            {lr.toPlace || '--'}
                        </span>
                    </div>
                </div>

                {/* Right: Vehicle & Driver Details */}
                <div className="text-right">
                    <span className="text-slate-300 font-bold text-[9px] uppercase tracking-wider block">
                        VEHICLE & DRIVER DETAILS
                    </span>
                    <span className="font-mono font-black text-[13px] text-white uppercase block">
                        {lr.truckNo || '--'} {vehicleType ? `• ${vehicleType}` : ''}
                    </span>
                    <span className="text-slate-200 text-[10px] font-bold block">
                        Driver: {driverName || '--'} {driverContact ? `(+91 ${driverContact.replace(/[^0-9]/g, '')})` : ''}
                    </span>
                </div>
            </div>

            {/* Two-Column Party Box: Consignor & Consignee */}
            <div className="grid grid-cols-2 gap-3 my-2.5">
                {/* Consignor Details */}
                <div className="border-2 border-slate-400 rounded-xs p-3 bg-slate-50/50">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[11px]">📦</span>
                        <span className="font-black text-[10px] text-slate-800 uppercase tracking-wider">
                            CONSIGNOR (BILLED & DISPATCHED FROM)
                        </span>
                    </div>
                    <h3 className="font-black text-[13.5px] text-slate-950 uppercase leading-snug">
                        {lr.consignor?.name || '--'}
                    </h3>
                    <p className="text-[11px] text-slate-800 leading-snug mt-1 font-bold">
                        {lr.consignor?.address || '--'}
                        {lr.consignor?.city && !lr.consignor?.address?.includes(lr.consignor.city) ? `, ${lr.consignor.city}` : ''}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-300 text-[10.5px] space-y-0.5 font-bold">
                        <p>
                            <span className="font-black text-slate-900">GSTIN:</span>{' '}
                            <span className="font-mono font-black text-slate-950">{consignorGst || '--'}</span>
                            {' • '}<span className="font-black text-slate-900">State Code:</span>{' '}
                            <span className="font-mono font-black text-slate-950">{consignorStateCode || '--'}</span>
                        </p>
                        <p>
                            <span className="font-black text-slate-900">Contact:</span>{' '}
                            <span className="text-slate-950 font-black">{lr.consignor?.contact || '--'}</span>
                            {lr.invoiceNo && <> • <span className="font-black text-slate-900">Inv No:</span> <span className="font-mono font-black text-slate-950">{lr.invoiceNo}</span></>}
                        </p>
                    </div>
                </div>

                {/* Consignee Details */}
                <div className="border-2 border-slate-400 rounded-xs p-3 bg-slate-50/50">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[11px]">🏭</span>
                        <span className="font-black text-[10px] text-slate-800 uppercase tracking-wider">
                            CONSIGNEE (SHIP & DELIVERY TO)
                        </span>
                    </div>
                    <h3 className="font-black text-[13.5px] text-slate-950 uppercase leading-snug">
                        {lr.consignee?.name || '--'}
                    </h3>
                    <p className="text-[11px] text-slate-800 leading-snug mt-1 font-bold">
                        {lr.consignee?.address || '--'}
                        {lr.consignee?.city && !lr.consignee?.address?.includes(lr.consignee.city) ? `, ${lr.consignee.city}` : ''}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-300 text-[10.5px] space-y-0.5 font-bold">
                        <p>
                            <span className="font-black text-slate-900">GSTIN:</span>{' '}
                            <span className="font-mono font-black text-slate-950">{consigneeGst || '--'}</span>
                            {' • '}<span className="font-black text-slate-900">State Code:</span>{' '}
                            <span className="font-mono font-black text-slate-950">{consigneeStateCode || '--'}</span>
                        </p>
                        <p>
                            <span className="font-black text-slate-900">Contact:</span>{' '}
                            <span className="text-slate-950 font-black">{lr.consignee?.contact || '--'}</span>
                            {lr.poNo && <> • <span className="font-black text-slate-900">PO No:</span> <span className="font-mono font-black text-slate-950">{lr.poNo}</span></>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Separate Billing Party if Applicable */}
            {isBillingPartySeparate && (
                <div className="border-2 border-amber-300 bg-amber-50/70 rounded-xs p-2.5 my-2 flex justify-between items-center text-[10.5px]">
                    <div>
                        <span className="font-black text-amber-900 uppercase text-[9.5px] mr-1">BILLING PARTY (3rd Party):</span>
                        <span className="font-black text-slate-950 uppercase">{lr.billingTo.name}</span>
                        <span className="text-slate-700 font-bold"> • {lr.billingTo.address}, {lr.billingTo.city}</span>
                    </div>
                    {lr.billingTo.gst && (
                        <div className="font-mono font-black text-slate-950">
                            GSTIN: {lr.billingTo.gst}
                        </div>
                    )}
                </div>
            )}

            {/* Goods Description & Packages Itemized Table */}
            <div className="border-2 border-slate-900 rounded-xs overflow-hidden my-2.5">
                <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead>
                        <tr className="bg-[#0b192c] text-white text-[10px] uppercase tracking-wider font-black">
                            <th className="p-2 text-center w-[5%] border-r border-slate-700">SR.</th>
                            <th className="p-2 text-center w-[15%] border-r border-slate-700">PACKAGES</th>
                            <th className="p-2 text-left w-[36%] border-r border-slate-700">DESCRIPTION OF GOODS & PACKING DETAILS</th>
                            <th className="p-2 text-center w-[12%] border-r border-slate-700">HSN / SAC</th>
                            <th className="p-2 text-right w-[11%] border-r border-slate-700">ACTUAL WT.</th>
                            <th className="p-2 text-right w-[11%] border-r border-slate-700">CHARGED WT.</th>
                            <th className="p-2 text-right w-[10%]">RATE / UNIT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {lr.items && lr.items.length > 0 ? (
                            lr.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-2 text-center font-black text-slate-700 border-r border-slate-300 align-top text-[11px]">{idx + 1}</td>
                                    <td className="p-2 text-center font-black text-slate-950 border-r border-slate-300 align-top text-[11.5px]">
                                        {item.pcs > 0 ? `${item.pcs} ${item.packingDetails || 'Pkgs'}` : (item.packingDetails ? item.packingDetails : '--')}
                                    </td>
                                    <td className="p-2 border-r border-slate-300 align-top">
                                        <div className="font-black text-slate-950 uppercase text-[12px] leading-snug">{item.description || '--'}</div>
                                        {item.packingDetails && (
                                            <div className="text-[9px] text-slate-600 font-bold">Packing: {item.packingDetails}</div>
                                        )}
                                    </td>
                                    <td className="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300 align-top text-[11px]">
                                        {item.hsn || lr.hsnCode || companyDetails.sacCode || '--'}
                                    </td>
                                    <td className="p-2 text-right font-black text-slate-950 border-r border-slate-300 align-top text-[11.5px]">
                                        {Number(item.weight) > 0 
                                            ? `${(item.unit || '').toLowerCase() === 'ton' ? `${item.weight} Ton` : `${item.weight.toLocaleString('en-IN')} Kg`}` 
                                            : (idx === 0 && Number(lr.actualWeightMT) > 0 ? `${lr.actualWeightMT} MT` : '--')}
                                    </td>
                                    <td className="p-2 text-right font-black text-slate-950 border-r border-slate-300 align-top text-[11.5px]">
                                        {Number(item.chargedWeight) > 0 
                                            ? `${(item.unit || '').toLowerCase() === 'ton' ? `${item.chargedWeight} Ton` : `${item.chargedWeight.toLocaleString('en-IN')} Kg`}` 
                                            : (idx === 0 && Number(lr.chargedWeight) > 0 ? `${lr.chargedWeight.toLocaleString('en-IN')} Kg` : '--')}
                                    </td>
                                    <td className="p-2 text-right font-black text-slate-950 align-top text-[11.5px]">
                                        {showAmounts && (Number(item.rate) > 0 || Number(lr.rate) > 0)
                                            ? `₹ ${Number(item.rate || lr.rate).toFixed(2)} / ${item.unit || (lr.rateOn === 'Ton' ? 'MT' : lr.rateOn) || 'Ton'}`
                                            : '--'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr className="hover:bg-slate-50">
                                <td className="p-2 text-center font-black text-slate-700 border-r border-slate-300 align-top text-[11px]">1</td>
                                <td className="p-2 text-center font-black text-slate-950 border-r border-slate-300 align-top text-[11.5px]">--</td>
                                <td className="p-2 border-r border-slate-300 align-top font-black text-slate-950 uppercase text-[12px]">--</td>
                                <td className="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300 align-top text-[11px]">--</td>
                                <td className="p-2 text-right font-black text-slate-950 border-r border-slate-300 align-top text-[11.5px]">--</td>
                                <td className="p-2 text-right font-black text-slate-950 border-r border-slate-300 align-top text-[11.5px]">--</td>
                                <td className="p-2 text-right font-black text-slate-950 align-top text-[11.5px]">--</td>
                            </tr>
                        )}

                        {/* Summary Total Row */}
                        {(() => {
                            const minRows = isLandscape ? 1 : 2;
                            const currentCount = lr.items && lr.items.length > 0 ? lr.items.length : 1;
                            const emptyRowsCount = Math.max(0, minRows - currentCount);
                            return Array.from({ length: emptyRowsCount }).map((_, emptyIdx) => (
                                <tr key={`empty-${emptyIdx}`} className="hover:bg-slate-50">
                                    <td className="p-1.5 text-center font-bold text-slate-300 border-r border-slate-200 align-top">
                                        {currentCount + emptyIdx + 1}
                                    </td>
                                    <td className="p-1.5 text-center font-bold text-slate-300 border-r border-slate-200 align-top">&nbsp;</td>
                                    <td className="p-1.5 border-r border-slate-200 align-top font-bold text-slate-300">&nbsp;</td>
                                    <td className="p-1.5 text-center font-mono text-slate-300 border-r border-slate-200 align-top">&nbsp;</td>
                                    <td className="p-1.5 text-right font-bold text-slate-300 border-r border-slate-200 align-top">&nbsp;</td>
                                    <td className="p-1.5 text-right font-bold text-slate-300 border-r border-slate-200 align-top">&nbsp;</td>
                                    <td className="p-1.5 text-right font-bold text-slate-300 align-top">&nbsp;</td>
                                </tr>
                            ));
                        })()}

                        {/* Summary Total Row */}
                        <tr className="bg-slate-100 font-black text-slate-950 border-t-2 border-slate-900 text-[11px]">
                            <td className="p-2 text-center border-r border-slate-400">•</td>
                            <td className="p-2 text-center font-black border-r border-slate-400 text-[11.5px]">
                                {totalPcs > 0 ? `${totalPcs} Total` : '--'}
                            </td>
                            <td className="p-2 font-black border-r border-slate-400">Total Quantities Dispatched (Said to Contain)</td>
                            <td className="p-2 text-center border-r border-slate-400">--</td>
                            <td className="p-2 text-right font-black border-r border-slate-400 text-[12px]">{totalActualWeight}</td>
                            <td className="p-2 text-right font-black border-r border-slate-400 text-[12px]">{totalChargedWeight}</td>
                            <td className="p-2 text-right">--</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Bottom Split Section: GST / Statutory & Financial Breakdown */}
            <div className="grid grid-cols-12 gap-2.5 my-1.5 items-start">
                {/* Left 7 Columns: STATUTORY COMPLIANCE & CONSIGNMENT DETAILS */}
                <div className="col-span-7 flex flex-col justify-between space-y-2">
                    <div>
                        <div className="font-black text-[10.5px] text-[#0b192c] uppercase border-b-2 border-slate-400 pb-1 tracking-wide">
                            STATUTORY & CONSIGNMENT DETAILS
                        </div>

                        {/* Declared Value & Insurance */}
                        <div className="mt-1.5 text-[10px] space-y-1 border border-slate-300 p-2 rounded-xs bg-slate-50/50">
                            <p>
                                <span className="font-black text-slate-900">Declared Value of Goods:</span> <span className="font-black text-slate-950">{declaredValue}</span>
                                <> • <span className="font-black text-slate-900">Transit Risk:</span> <span className="font-bold text-slate-950">{transitRisk}</span></>
                            </p>
                            <p className="text-slate-800">
                                <span className="font-bold text-slate-900">Insurance Policy No:</span> {insurancePolicy}
                                <> • <span className="font-bold text-slate-900">Insurer:</span> {insuranceCompany}</>
                            </p>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="mt-1.5 text-[9.5px] text-slate-700 leading-normal">
                            <span className="font-black text-slate-900 block">Terms & Conditions:</span>
                            <ol className="list-decimal list-inside space-y-0.5 mt-0.5 font-semibold">
                                <li>The carrier is not responsible for leakage, breakage, or internal damage during transit.</li>
                                <li>Demurrage charges applicable @ ₹ 1,500/day if unloading delayed beyond 24 hrs.</li>
                                <li>Original LR & delivery acknowledgement (POD) required for final freight settlement.</li>
                            </ol>
                        </div>

                        {lr.remark && (
                            <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-300 text-[9.5px] rounded-xs">
                                <span className="font-black text-amber-950">REMARK: </span>
                                <span className="text-slate-900 font-black">{lr.remark}</span>
                            </div>
                        )}
                    </div>

                    {/* 3 Signatures Area (Exact as reference image) */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t-2 border-slate-400 text-center text-[9.5px]">
                        <div className={`flex flex-col justify-end ${isLandscape ? 'h-12' : 'h-18'}`}>
                            <div className="border-b-2 border-slate-600 mb-1 w-5/6 mx-auto"></div>
                            <span className="font-black text-slate-900">Consignor / Loader Sign</span>
                        </div>
                        <div className={`flex flex-col justify-end ${isLandscape ? 'h-12' : 'h-18'}`}>
                            <div className="border-b-2 border-slate-600 mb-1 w-5/6 mx-auto"></div>
                            <span className="font-black text-slate-900">Driver Sign / Thumb</span>
                        </div>
                        <div className={`flex flex-col justify-end ${isLandscape ? 'h-12' : 'h-18'} items-center`}>
                            {companyDetails.signatureImageUrl ? (
                                <img
                                    src={companyDetails.signatureImageUrl}
                                    alt="Sign"
                                    className={`${isLandscape ? 'h-8' : 'h-12'} w-auto object-contain mb-0.5`}
                                />
                            ) : (
                                <div className="border-b-2 border-slate-600 mb-1 w-5/6 mx-auto"></div>
                            )}
                            <span className="font-black text-slate-950">For {companyDetails.name || ''}</span>
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: FINANCIAL CHARGES & NET PAYABLE */}
                <div className="col-span-5 border-2 border-slate-900 rounded-xs bg-white overflow-hidden shadow-xs">
                    <div className="flex justify-between items-center p-1.5 bg-slate-100 border-b border-slate-300 text-[10.5px]">
                        <span className="text-slate-700 font-black uppercase">Freight Basis:</span>
                        <span className="font-black text-blue-900 uppercase tracking-wide">
                            {freightBasis}
                        </span>
                    </div>

                    <div className="divide-y divide-slate-200 text-[10.5px]">
                        <div className="flex justify-between p-1.5">
                            <span className="text-slate-800 font-bold">Basic Freight (Charged Wt):</span>
                            <span className="font-mono text-slate-950 font-black text-[11.5px]">{showAmounts ? formatINR(basicFreight) : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1.5">
                            <span className="text-slate-800 font-bold">Loading & Handling Hamali:</span>
                            <span className="font-mono text-slate-950 font-black text-[11.5px]">{showAmounts ? formatINR(hamali) : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1.5">
                            <span className="text-slate-800 font-bold">Door Pickup & Delivery:</span>
                            <span className="font-mono text-slate-950 font-black text-[11.5px]">{showAmounts ? formatINR(doorDelivery) : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1.5">
                            <span className="text-slate-800 font-bold">Statistical & LR Surcharge:</span>
                            <span className="font-mono text-slate-950 font-black text-[11.5px]">{showAmounts ? formatINR(statistical) : '₹ 0.00'}</span>
                        </div>
                        <div className="flex justify-between p-1.5">
                            <span className="text-slate-800 font-bold">Toll & Green Tax Surcharge:</span>
                            <span className="font-mono text-slate-950 font-black text-[11.5px]">{showAmounts ? formatINR(tollTax) : '₹ 0.00'}</span>
                        </div>

                        {/* Total Freight Amount Bar */}
                        <div className="flex justify-between items-center p-2 bg-[#0b192c] text-white font-black text-[11.5px]">
                            <span className="tracking-wide">TOTAL FREIGHT AMOUNT:</span>
                            <span className="font-mono text-[13.5px]">{showAmounts ? formatINR(totalFreight) : '₹ 0.00'}</span>
                        </div>

                        {/* Advance Paid */}
                        <div className="flex justify-between p-1.5 bg-slate-50 text-emerald-900 font-black text-[11px]">
                            <span>Advance Paid (by Cash/Online):</span>
                            <span className="font-mono font-black text-[12px]">(-) {showAmounts ? formatINR(advancePaid) : '₹ 0.00'}</span>
                        </div>

                        {/* Net Balance To Pay */}
                        <div className="flex justify-between items-center p-2 bg-blue-50 text-blue-950 border-t-2 border-blue-300">
                            <span className="font-black text-[11.5px] uppercase tracking-wide">
                                NET BALANCE TO PAY:
                            </span>
                            <span className="font-mono font-black text-[17px] text-blue-900">
                                {showAmounts ? formatINR(netBalanceToPay) : '₹ 0.00'}
                            </span>
                        </div>
                    </div>

                    {/* Bank & Payment Info Box */}
                    {companyDetails.bankDetails && companyDetails.bankDetails.accountNo && (
                        <div className="p-1.5 bg-slate-50 border-t border-slate-300 text-[9px] space-y-0.5">
                            <span className="font-black text-slate-900 block uppercase">Bank RTGS/NEFT Details:</span>
                            <p className="text-slate-800 font-semibold leading-tight">
                                Bank: <strong className="text-slate-950 font-black">{companyDetails.bankDetails.name}</strong> • A/c: <strong className="font-mono font-black text-slate-950">{companyDetails.bankDetails.accountNo}</strong> • IFSC: <strong className="font-mono font-black text-slate-950">{companyDetails.bankDetails.ifscCode}</strong>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Watermark (Exact match to reference) */}
            <div className="border-t border-slate-300 pt-1 mt-1 text-center text-[8.5px] text-slate-400 font-medium">
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
    copyType?: string;
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'a4' | 'a5' | 'letter' | 'legal';
    singlePageFit?: boolean;
    gstLiability?: 'RCM' | 'FCM_18' | 'FCM_12' | 'BOTH_5_18' | 'EXEMPTED';
}>(({ lr, companyDetails, showCompanyDetails, showAmounts, copyType = 'CONSIGNOR COPY', orientation = 'portrait', paperSize = 'a4', singlePageFit = true }, ref) => {
    const totalCharges = (Object.values(lr.charges || {}) as number[]).reduce((sum: number, charge: number) => sum + (charge || 0), 0);
    const totalToPay = (Number(lr.freight) || 0) + totalCharges;

    const isBillingPartySeparate = lr.billingTo && lr.billingTo.name &&
        (lr.billingTo.name !== lr.consignor?.name || lr.billingTo.address !== lr.consignor?.address) &&
        (lr.billingTo.name !== lr.consignee?.name || lr.billingTo.address !== lr.consignee?.address);

    const formatAmount = (amount: number | undefined) => {
        return showAmounts ? (Number(amount) || 0).toFixed(2) : "0.00";
    };

    const activeCopy = copyType || lr.copyType || 'CONSIGNOR COPY';
    const isLandscape = orientation === 'landscape';
    const containerClass = isLandscape 
        ? 'w-[1040px] max-w-full p-4 text-[10.5px] min-h-[680px] flex flex-col justify-between' 
        : paperSize === 'a5' 
            ? 'w-[580px] max-w-full p-2.5 text-[9px]' 
            : 'w-[794px] max-w-full p-5 text-[11px] min-h-[1050px] flex flex-col justify-between';

    return (
        <div ref={ref} className={`printable-area bg-white text-black font-sans ${containerClass} mx-auto border-2 border-black relative ${singlePageFit ? 'page-avoid-break' : ''}`}>
            {/* Jurisdiction Header */}
            {companyDetails.jurisdictionCity && (
                <div className="text-[11px] font-black text-center w-full pb-1 uppercase tracking-wider text-slate-900">
                    SUBJECT TO {companyDetails.jurisdictionCity} JURISDICTION
                </div>
            )}

            {/* Dynamic Header */}
            <div className="flex flex-row justify-between items-stretch pb-2 border-b-4 border-ssk-blue min-h-[100px] gap-2">
                {/* Left: Logo */}
                <div className="flex-none w-28 flex justify-start items-center">
                    {companyDetails.logoUrl && (
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-20 w-full object-contain object-left" />
                    )}
                </div>

                {/* Center: Company Details */}
                <div className="flex-1 px-2 text-center flex flex-col justify-center overflow-hidden">
                    <h1 className="font-black text-ssk-red text-3xl sm:text-4xl leading-tight tracking-tight uppercase">
                        {companyDetails.name}
                    </h1>
                    {companyDetails.tagline && (
                        <p className="text-sm font-black text-ssk-blue mt-0.5">{companyDetails.tagline}</p>
                    )}
                    <p className="text-[11.5px] mt-1 text-slate-900 font-bold whitespace-normal leading-snug">
                        {companyDetails.address}
                    </p>
                    {companyDetails.branchLocations && companyDetails.branchLocations.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-gray-300">
                            <p className="text-[9.5px] font-bold text-gray-700 tracking-tight leading-tight">
                                <span className="font-black text-gray-900">BRANCHES: </span>
                                {companyDetails.branchLocations.join(' | ')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right: Contact & Statutory Details */}
                <div className="flex-none w-48 text-right flex flex-col justify-center text-[10.5px] font-black text-slate-900 space-y-0.5 leading-tight">
                    {showCompanyDetails && (
                        <>
                            {companyDetails.contact.map((c, i) => <div key={i}>{c}</div>)}
                            <div>{companyDetails.email}</div>
                            {companyDetails.web && <div>{companyDetails.web}</div>}
                            <div className="pt-1">
                                <span className="font-black">PAN:</span> {companyDetails.pan}
                            </div>
                            <div>
                                <span className="font-black">GSTIN:</span> {companyDetails.gstn}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Note */}
            <div className="text-[9.5px] text-center my-1 font-black uppercase text-slate-800 tracking-wider">
                AT OWNER'S RISK • INSURANCE / DEMURRAGE CHARGES EXTRA
            </div>

            {/* Top Details Table */}
            <table className="w-full border-collapse border-2 border-black text-[10.5px] table-fixed">
                <tbody>
                    <tr className="border-b-2 border-black">
                        <td className="p-1.5 border-r-2 border-black font-black w-1/3 text-slate-900">
                            CONSIGNMENT NOTE (LR)
                        </td>
                        <td className="p-1.5 border-r-2 border-black w-1/3 text-slate-900 font-bold">
                            <span className="font-black">CAUTION:</span> This Consignment will not be detained after delivery.
                        </td>
                        <td className="p-1.5 w-1/3">
                            <div className="flex justify-between items-center">
                                <span className="font-black text-blue-900 uppercase">{activeCopy}</span>
                                <span>No: <span className="font-black text-lg text-red-600 font-mono">{lr.lrNo}</span></span>
                            </div>
                            <div className="font-bold text-slate-900">Date: <span className="font-black">{formatBiltyDate(lr.date)}</span></div>
                        </td>
                    </tr>
                    <tr className="border-b-2 border-black font-bold">
                        <td className="p-1.5 border-r-2 border-black">
                            <span className="font-black text-slate-900">Lorry No:</span> <span className="font-black uppercase text-[12.5px] text-slate-950 font-mono">{lr.truckNo}</span>
                        </td>
                        <td className="p-1.5 border-r-2 border-black">
                            <span className="font-black text-slate-900">From:</span> <span className="font-black uppercase text-[12px] text-slate-950">{lr.fromPlace}</span>
                        </td>
                        <td className="p-1.5">
                            <span className="font-black text-slate-900">To:</span> <span className="font-black uppercase text-[12px] text-slate-950">{lr.toPlace}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Parties Table */}
            <table className="w-full border-collapse border-2 border-black text-[10.5px] mt-1 table-fixed">
                <thead>
                    <tr className="border-b-2 border-black">
                        <td className="p-1.5 border-r-2 border-black font-black w-1/2 bg-gray-100 uppercase">Consignor Details</td>
                        <td className="p-1.5 font-black w-1/2 bg-gray-100 uppercase">Consignee Details</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="p-2 border-r-2 border-black align-top h-20">
                            <div className="font-black text-[14.5px] text-black uppercase leading-tight">{lr.consignor?.name || '--'}</div>
                            <div className="font-bold text-slate-800 text-[11px] leading-snug mt-1">{lr.consignor?.address || '--'}, {lr.consignor?.city}</div>
                            {lr.consignor?.contact && <div className="font-bold text-slate-900 mt-0.5">Mob: {lr.consignor.contact}</div>}
                            <div className="font-black text-slate-900 mt-1">GSTIN: {lr.consignor?.gst || 'Unregistered'}</div>
                        </td>
                        <td className="p-2 align-top h-20">
                            <div className="font-black text-[14.5px] text-black uppercase leading-tight">{lr.consignee?.name || '--'}</div>
                            <div className="font-bold text-slate-800 text-[11px] leading-snug mt-1">{lr.consignee?.address || '--'}, {lr.consignee?.city}</div>
                            {lr.consignee?.contact && <div className="font-bold text-slate-900 mt-0.5">Mob: {lr.consignee.contact}</div>}
                            <div className="font-black text-slate-900 mt-1">GSTIN: {lr.consignee?.gst || 'Unregistered'}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Conditionally rendered Billing To details */}
            {isBillingPartySeparate && (
                <table className="w-full border-collapse border-2 border-black text-[10.5px] mt-1 table-fixed">
                    <thead>
                        <tr>
                            <td className="p-1 font-black bg-gray-100 uppercase">Billing Party</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 align-top font-bold text-slate-900">
                                <span className="font-black text-black uppercase text-[12px]">{lr.billingTo.name}</span> - {lr.billingTo.address}, {lr.billingTo.city} {lr.billingTo.gst && `(GST: ${lr.billingTo.gst})`}
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}

            {/* Main Content Table */}
            <table className="w-full border-collapse border-2 border-black text-[10.5px] mt-1">
                <thead>
                    <tr className="font-black text-center bg-gray-100">
                        <td className="border-r-2 border-black p-1.5 w-[8%]">Pkgs</td>
                        <td className="border-r-2 border-black p-1.5">Description (Said to Contain)</td>
                        <td className="border-r-2 border-black p-1.5 w-[18%]" colSpan={2}>Weight (Kg/MT)</td>
                        <td className="border-r-2 border-black p-1.5 w-[25%]" colSpan={2}>Charges</td>
                    </tr>
                    <tr className="font-black text-center border-b-2 border-black text-[9.5px]">
                        <td className="border-r-2 border-black p-1">No.</td>
                        <td className="border-r-2 border-black p-1">Particulars</td>
                        <td className="border-r border-black p-1">Actual</td>
                        <td className="border-r-2 border-black p-1">Charged</td>
                        <td className="border-r-2 border-black p-1 w-[15%]">Particulars</td>
                        <td className="p-1 w-[10%]">Amount</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border-r-2 border-black p-2 text-center h-48 align-top font-black">
                            {(lr.items || []).map((item, idx) => (
                                <div key={idx} className="font-black text-xl mb-2">{item.pcs}</div>
                            ))}
                            {(lr.items || []).length > 1 && (
                                <div className="border-t-2 border-black mt-2 pt-1 font-black text-sm">
                                    Total: {(lr.items || []).reduce((sum, item) => sum + (Number(item.pcs) || 0), 0)}
                                </div>
                            )}
                        </td>
                        <td className="border-r-2 border-black p-2 align-top">
                            {(lr.items || []).map((item, idx) => (
                                <div key={idx} className="font-black text-black text-[13.5px] uppercase mb-3 leading-tight min-h-[1.75rem] flex items-center">
                                    {item.description}
                                </div>
                            ))}
                        </td>
                        <td className="border-r border-black p-2 text-center align-top font-black text-slate-900 text-[12px]">
                            {Number(lr.actualWeightMT) > 0 ? `${lr.actualWeightMT} MT` : (Number(lr.weight) > 0 ? `${Number(lr.weight).toLocaleString('en-IN')} Kg` : '')}
                        </td>
                        <td className="border-r-2 border-black p-2 text-center align-top font-black text-slate-900 text-[12px]">
                            {Number(lr.chargedWeight) > 0 ? `${Number(lr.chargedWeight).toLocaleString('en-IN')} Kg` : ''}
                        </td>
                        <td colSpan={2} className="p-0 align-top">
                            <div className="flex flex-col h-full text-[10.5px]">
                                <div className="flex justify-between border-b border-black p-1.5 font-bold">
                                    <span>Freight</span>
                                    <span className="font-black text-[11.5px]">{formatAmount(lr.freight)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1.5 font-bold">
                                    <span>Hamail</span>
                                    <span className="font-black text-[11.5px]">{formatAmount(lr.charges?.hamail)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1.5 font-bold">
                                    <span>Surcharge</span>
                                    <span className="font-black text-[11.5px]">{formatAmount(lr.charges?.surCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1.5 font-bold">
                                    <span>Statistical</span>
                                    <span className="font-black text-[11.5px]">{formatAmount(lr.charges?.stCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1.5 font-bold">
                                    <span>Collection</span>
                                    <span className="font-black text-[11.5px]">{formatAmount(lr.charges?.collectionCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1.5 font-bold">
                                    <span>Door Del.</span>
                                    <span className="font-black text-[11.5px]">{formatAmount(lr.charges?.ddCharge)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 p-1.5 font-bold">
                                    <span>Other</span>
                                    <span className="font-black text-[11.5px]">{formatAmount(lr.charges?.otherCharge)}</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr className="border-t-2 border-black font-black">
                        <td colSpan={4} className="border-r-2 border-black p-2 text-right text-[12.5px] uppercase">Total Payable</td>
                        <td colSpan={2} className="p-2 text-right font-black text-lg bg-gray-100 font-mono">{formatAmount(totalToPay)}</td>
                    </tr>
                    <tr>
                        <td colSpan={4} className="border-r-2 border-black p-2 align-top text-[9.5px]">
                            {companyDetails.bankDetails && companyDetails.bankDetails.accountNo && (
                                <div className="space-y-0.5">
                                    <span className="font-black block uppercase text-slate-900">Bank Details:</span>
                                    <p className="font-bold text-slate-800">
                                        {companyDetails.bankDetails.name}, A/c: <span className="font-mono font-black">{companyDetails.bankDetails.accountNo}</span>, IFSC: <span className="font-mono font-black">{companyDetails.bankDetails.ifscCode}</span>
                                    </p>
                                </div>
                            )}
                        </td>
                        <td colSpan={2} className="border-t-2 border-black p-2 align-bottom">
                            <div className="flex flex-col items-center justify-end h-full min-h-[60px]">
                                {companyDetails.signatureImageUrl && (
                                    <img src={companyDetails.signatureImageUrl} alt="Authorized Signatory" className="h-12 w-auto object-contain mb-1" />
                                )}
                                <p className="font-black text-[9.5px] uppercase text-slate-900">Authorized Signatory</p>
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
                copyType={copyType}
                orientation={orientation}
                paperSize={paperSize}
                singlePageFit={singlePageFit}
                gstLiability={gstLiability}
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
    const [activeTemplate, setActiveTemplate] = useState<'modern-gst' | 'classic'>(
        initialTemplateStyle || lr.templateStyle || 'modern-gst'
    );
    const [copyType, setCopyType] = useState<string>(lr.copyType || 'CONSIGNOR COPY');
    const [showCompanyDetails, setShowCompanyDetails] = useState(true);
    const [showAmounts, setShowAmounts] = useState(true);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // Text Summary Generator for Instant Sharing
    const generateBiltyText = () => {
        const pkgs = (lr.items || []).reduce((sum, it) => sum + (Number(it.pcs) || 0), 0);
        const weightStr = Number(lr.actualWeightMT) > 0 ? `${lr.actualWeightMT} MT (${lr.weight.toLocaleString('en-IN')} Kg)` : `${Number(lr.weight).toLocaleString('en-IN')} Kg`;
        const freightStr = `₹ ${Number(lr.freight || 0).toLocaleString('en-IN')} (${lr.freightBasis || (lr.gstPaidBy === 'Consignor' ? 'PAID' : 'TO PAY')})`;
        const detectedGst = (() => {
            const p = (lr.gstPaidBy || '').toLowerCase();
            if (p.includes('both') || p.includes('dual') || (p.includes('5') && p.includes('18'))) return 'BOTH_5_18';
            if (p.includes('18') || p.includes('fcm')) return 'FCM_18';
            if (p.includes('12')) return 'FCM_12';
            if (p.includes('exempt')) return 'EXEMPTED';
            return 'RCM';
        })();
        const gstText = detectedGst === 'BOTH_5_18'
            ? 'Dual Compliance (RCM 5% / FCM 18%)'
            : detectedGst === 'FCM_18'
            ? 'FCM @ 18% (Forward Charge)'
            : detectedGst === 'FCM_12'
            ? 'FCM @ 12% (Forward Charge)'
            : detectedGst === 'EXEMPTED'
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

    // 1-Click Direct WhatsApp Share - immediately opens WhatsApp with full Bilty text
    const handleDirectWhatsApp = (targetPhone?: string) => {
        const summary = generateBiltyText();
        openWhatsAppDirect(summary, targetPhone);
        toast.success('Opening WhatsApp...');
    };

    // Helper to generate a configured jsPDF instance with the bilty captured on a single page
    const generateBiltyPdfDoc = async (targetEl: HTMLElement): Promise<{ pdf: jsPDF; filename: string }> => {
        const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}_${activeTemplate}_${copyType.replace(/\s+/g, '_')}_${orientation}.pdf`;

        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();

        // Optimized printable margin (3.5mm for full-page portrait coverage)
        const margin = 3.5;
        const maxW = pdfW - (margin * 2);
        const maxH = pdfH - (margin * 2);

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

        if (renderH > maxH) {
            renderH = maxH;
            renderW = renderH * imgRatio;
        }

        const posX = margin + (maxW - renderW) / 2;
        const posY = margin + (maxH - renderH) / 2;

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');

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

    // Dynamic Print Trigger — Full-page A4 print matching PDF exactly (No shrinking, 100% full page)
    const handlePrint = () => {
        let styleEl = document.getElementById('dynamic-print-style') as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-print-style';
            document.head.appendChild(styleEl);
        }
        const printHeight = orientation === 'landscape' ? '198mm' : '287mm';
        styleEl.innerHTML = `
            @media print {
                @page {
                    size: A4 ${orientation};
                    margin: 4mm;
                }
                html, body {
                    width: 100% !important;
                    height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body * {
                    visibility: hidden;
                }
                #print-root, #print-root * {
                    visibility: visible;
                }
                #print-root {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: block !important;
                }
                .print-copies-container {
                    width: 100% !important;
                }
                .print-page-wrapper {
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: block !important;
                    page-break-after: always;
                    break-after: page;
                }
                .print-page-wrapper:last-child {
                    page-break-after: auto;
                    break-after: auto;
                }
                .printable-area {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 100% !important;
                    height: ${printHeight} !important;
                    min-height: ${printHeight} !important;
                    box-sizing: border-box !important;
                    margin: 0 auto !important;
                    padding: 4mm 5mm !important;
                    border: 2px solid #0f172a !important;
                    box-shadow: none !important;
                    transform: none !important;
                    zoom: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
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
            const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}_${activeTemplate}_${copyType.replace(/\s+/g, '_')}.png`;

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
    const handleShareWhatsAppTo = (targetPhone: string, targetName: string) => {
        const summary = generateBiltyText();
        openWhatsAppDirect(summary, targetPhone);
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
                    <div className="print-page-wrapper">
                        <LRContent
                            lr={lr}
                            companyDetails={companyDetails}
                            showCompanyDetails={showCompanyDetails}
                            showAmounts={showAmounts}
                            templateStyle={activeTemplate}
                            copyType={copyType}
                            orientation={orientation}
                            paperSize="a4"
                            singlePageFit={true}
                        />
                    </div>
                </div>,
                printRoot
            )}

            {/* Modal Dialog */}
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-7xl my-4 overflow-hidden border border-slate-200 flex flex-col">
                {/* Modal Toolbar: Clean Header & Primary Actions */}
                <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md">
                            <span className="text-lg">📄</span>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                                Bilty / LR Preview
                                <span className="text-xs bg-blue-100 text-blue-800 font-mono px-2.5 py-0.5 rounded-full font-bold">
                                    {lr.lrNo || 'Draft'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Standard A4 Full-Page Electronic Consignment Note</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Template Selector: Modern GST vs Classic */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-300 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setActiveTemplate('modern-gst')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    activeTemplate === 'modern-gst'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Modern GST Compliant Template"
                            >
                                <span>🎨</span>
                                <span>Modern GST</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTemplate('classic')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    activeTemplate === 'classic'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Classic Standard Template"
                            >
                                <span>📋</span>
                                <span>Classic</span>
                            </button>
                        </div>

                        {/* Copy Type Selector */}
                        <select
                            value={copyType}
                            onChange={(e) => setCopyType(e.target.value)}
                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                        >
                            <option value="CONSIGNOR COPY">Consignor Copy</option>
                            <option value="CONSIGNEE COPY">Consignee Copy</option>
                            <option value="TRANSPORTER COPY">Transporter Copy</option>
                            <option value="DRIVER COPY">Driver Copy</option>
                        </select>

                        {/* Page Orientation Selector (Portrait / Landscape) */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-300 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setOrientation('portrait')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    orientation === 'portrait'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Portrait View (Vertical A4 Full Page)"
                            >
                                <span>📄</span>
                                <span>Portrait</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrientation('landscape')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    orientation === 'landscape'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Landscape View (Wide A4 Full Page)"
                            >
                                <span>📜</span>
                                <span>Landscape</span>
                            </button>
                        </div>

                        {/* Amounts Toggle */}
                        <label className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shadow-sm">
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
                                onClick={() => onSave({ ...lr, templateStyle: activeTemplate, copyType })}
                                className="flex items-center bg-emerald-600 text-white px-3.5 py-2 rounded-xl hover:bg-emerald-700 font-bold text-xs shadow-md transition-colors"
                            >
                                <SaveIcon className="w-4 h-4 mr-1" />
                                Save LR
                            </button>
                        )}

                        {/* Print Button (Full A4 Page) */}
                        <button
                            onClick={handlePrint}
                            className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-black font-bold text-xs shadow-md transition-all active:scale-95 gap-1.5"
                            title="Print LR on Full A4 Page"
                        >
                            <PrintIcon className="w-4 h-4" />
                            <span>Print</span>
                        </button>

                        {/* PDF Download Button */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isExporting}
                            className="flex items-center bg-blue-600 text-white px-3.5 py-2 rounded-xl hover:bg-blue-700 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 gap-1.5"
                            title="Download 1-Page PDF"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>PDF</span>
                        </button>

                        {/* Image PNG Download Button */}
                        <button
                            type="button"
                            onClick={handleDownloadImage}
                            disabled={isExporting}
                            className="flex items-center bg-indigo-600 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-700 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 gap-1.5 cursor-pointer"
                            title="Download High-Res PNG Image"
                        >
                            <span>🖼️</span>
                            <span>Image</span>
                        </button>

                        {/* Direct 1-Click WhatsApp Button */}
                        <button
                            type="button"
                            onClick={() => {
                                const targetPhone = consigneeContact || consignorContact || driverContact || '';
                                handleDirectWhatsApp(targetPhone);
                            }}
                            className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 gap-1.5 cursor-pointer"
                            title="Share via WhatsApp"
                        >
                            <WhatsAppIcon className="w-4 h-4" />
                            <span>WhatsApp</span>
                        </button>

                        {/* Close / Back Button */}
                        <button
                            onClick={() => {
                                if (window.history.length > 1) {
                                    onClose();
                                    window.history.back();
                                } else {
                                    onClose();
                                }
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors ml-1"
                            title="Close preview"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Sheet Area */}
                <div className="p-3 sm:p-6 overflow-x-auto flex justify-center bg-slate-200/70 min-h-[650px]">
                    <div className="bg-white shadow-2xl rounded-xs p-1 my-auto">
                        <LRContent
                            ref={previewRef}
                            lr={lr}
                            companyDetails={companyDetails}
                            showCompanyDetails={showCompanyDetails}
                            showAmounts={showAmounts}
                            templateStyle={activeTemplate}
                            copyType={copyType}
                            orientation={orientation}
                            paperSize="a4"
                            singlePageFit={true}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LRPreviewModal;
