import React, { useRef, forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
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

declare const html2pdf: any;

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
}>(({ 
    lr, 
    companyDetails, 
    showCompanyDetails = true, 
    showAmounts = true, 
    copyType = 'CONSIGNOR COPY',
    orientation = 'portrait',
    paperSize = 'a4',
    singlePageFit = true
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
        ? 'max-w-[1040px] p-3 text-[9px]' 
        : paperSize === 'a5' 
            ? 'max-w-[580px] p-2 text-[8px]' 
            : 'max-w-[760px] p-4 text-[9.5px]';

    return (
        <div
            ref={ref}
            className={`printable-area bg-white text-slate-900 font-sans w-full mx-auto border border-slate-800 shadow-md ${containerClass} leading-snug relative selection:bg-blue-100 ${singlePageFit ? 'page-avoid-break' : ''}`}
            style={{ boxSizing: 'border-box' }}
        >
            {/* Header Section */}
            <div className="flex flex-row justify-between items-start border-b-2 border-slate-900 pb-2 gap-2">
                {/* Left: Company Branding & Details */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        {companyDetails.logoUrl && (
                            <img
                                src={companyDetails.logoUrl}
                                alt="Logo"
                                className="h-12 w-auto max-w-[70px] object-contain"
                            />
                        )}
                        <div>
                            <h1 className="font-black text-[#0f2439] text-xl uppercase tracking-tight leading-none">
                                {companyDetails.name || 'TRANSPORT LOGISTICS CO.'}
                            </h1>
                            <p className="text-[9px] font-semibold text-slate-600 mt-0.5">
                                {companyDetails.tagline || 'Fleet Owners, Heavy Transport Contractors & Logistics Consultants'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-1 space-y-0.5 text-[8.5px] text-slate-700">
                        <p className="leading-tight font-medium">
                            <span className="font-bold text-slate-800">Regd Off:</span> {companyDetails.address || 'Transport Nagar, Main Road'}
                            {companyDetails.jurisdictionCity ? ` • Sub to ${companyDetails.jurisdictionCity} Jurisdiction` : ''}
                        </p>
                        {showCompanyDetails && (
                            <p className="font-bold text-slate-900">
                                GSTIN: <span className="font-mono">{companyDetails.gstn || 'N/A'}</span>
                                {companyDetails.pan && <> • PAN: <span className="font-mono">{companyDetails.pan}</span></>}
                            </p>
                        )}
                        <p className="text-slate-600">
                            {companyDetails.contact && companyDetails.contact.length > 0 && (
                                <>Ph: <span className="font-medium text-slate-800">{companyDetails.contact.join(', ')}</span></>
                            )}
                            {companyDetails.email && <> • Email: <span className="font-medium text-slate-800">{companyDetails.email}</span></>}
                        </p>
                    </div>
                </div>

                {/* Right: Modern Compact Doc Details Box */}
                <div className="w-[280px] bg-slate-50 border border-slate-300 rounded-sm p-2 flex flex-col justify-between">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="bg-slate-900 text-white font-extrabold px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase">
                            {activeCopy}
                        </span>
                        <div className="text-right">
                            <span className="text-[8px] text-slate-500 font-bold block">LR / BILTY NO.</span>
                            <span className="font-mono font-black text-sm text-blue-900 leading-none">
                                {lr.lrNo || 'DRAFT-001'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mt-1 text-[8.5px]">
                        <div>
                            <span className="text-slate-500 font-semibold block">Date:</span>
                            <span className="font-bold text-slate-900">{formatDisplayDate(lr.date)}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-semibold block">Truck / Vehicle:</span>
                            <span className="font-mono font-black text-slate-900 uppercase">{lr.truckNo || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-semibold block">Vehicle Type:</span>
                            <span className="font-bold text-slate-800">{vehicleType || 'Standard'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-semibold block">Driver Name/Mob:</span>
                            <span className="font-medium text-slate-800">
                                {driverName ? `${driverName} ${driverContact ? `(${driverContact})` : ''}` : '--'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between items-center bg-blue-50/60 px-1.5 py-0.5 rounded-sm">
                        <span className="font-bold text-[8px] text-blue-950 uppercase">Freight Basis:</span>
                        <span className="font-black text-[9px] text-blue-900 uppercase tracking-wide">{freightBasis}</span>
                    </div>
                </div>
            </div>

            {/* Route Banner */}
            <div className="bg-[#0f2439] text-white flex justify-between items-center px-3 py-1.5 my-1.5 rounded-sm shadow-xs">
                <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium text-[8px] uppercase tracking-wider">Origin Station:</span>
                    <span className="font-black text-xs uppercase tracking-wide text-cyan-300">{lr.fromPlace || 'ORIGIN'}</span>
                </div>
                <div className="text-cyan-400 font-bold text-sm tracking-widest">
                    ━━━━━►
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium text-[8px] uppercase tracking-wider">Destination:</span>
                    <span className="font-black text-xs uppercase tracking-wide text-yellow-300">{lr.toPlace || 'DESTINATION'}</span>
                </div>
            </div>

            {/* Two-Column Party Box: Consignor & Consignee */}
            <div className="grid grid-cols-2 gap-2 my-1.5">
                {/* Consignor Details */}
                <div className="border border-slate-300 rounded-sm p-2 bg-slate-50/60 relative">
                    <div className="bg-[#0f2439] text-white text-[7.5px] font-extrabold px-1.5 py-0.2 rounded-xs inline-block uppercase tracking-wider mb-1">
                        CONSIGNOR (DISPATCH FROM)
                    </div>
                    <h3 className="font-black text-[10px] text-slate-900 uppercase leading-tight">
                        {lr.consignor?.name || '---'}
                    </h3>
                    <p className="text-[8.5px] text-slate-700 leading-tight mt-0.5 font-medium">
                        {lr.consignor?.address || '---'}
                        {lr.consignor?.city ? `, ${lr.consignor.city}` : ''}
                    </p>
                    <div className="mt-1 pt-1 border-t border-slate-200 grid grid-cols-2 gap-1 text-[8px]">
                        <div>
                            <span className="text-slate-500 font-bold">GSTIN:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consignorGst || 'UNREGISTERED'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-bold">State Code:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consignorStateCode || '--'}</span>
                        </div>
                        {lr.consignor?.contact && (
                            <div className="col-span-2">
                                <span className="text-slate-500 font-bold">Contact:</span>{' '}
                                <span className="text-slate-800">{lr.consignor.contact}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Consignee Details */}
                <div className="border border-slate-300 rounded-sm p-2 bg-slate-50/60 relative">
                    <div className="bg-[#0f2439] text-white text-[7.5px] font-extrabold px-1.5 py-0.2 rounded-xs inline-block uppercase tracking-wider mb-1">
                        CONSIGNEE (DELIVER TO)
                    </div>
                    <h3 className="font-black text-[10px] text-slate-900 uppercase leading-tight">
                        {lr.consignee?.name || '---'}
                    </h3>
                    <p className="text-[8.5px] text-slate-700 leading-tight mt-0.5 font-medium">
                        {lr.consignee?.address || '---'}
                        {lr.consignee?.city ? `, ${lr.consignee.city}` : ''}
                    </p>
                    <div className="mt-1 pt-1 border-t border-slate-200 grid grid-cols-2 gap-1 text-[8px]">
                        <div>
                            <span className="text-slate-500 font-bold">GSTIN:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consigneeGst || 'UNREGISTERED'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-bold">State Code:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{consigneeStateCode || '--'}</span>
                        </div>
                        {lr.consignee?.contact && (
                            <div className="col-span-2">
                                <span className="text-slate-500 font-bold">Contact:</span>{' '}
                                <span className="text-slate-800">{lr.consignee.contact}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Separate Billing Party if Applicable */}
            {isBillingPartySeparate && (
                <div className="border border-amber-300 bg-amber-50/60 rounded-sm p-1.5 my-1 flex justify-between items-center text-[8.5px]">
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

            {/* Invoice & E-Way Bill Details Strip */}
            <div className="grid grid-cols-4 gap-1.5 my-1.5 bg-slate-100 border border-slate-300 p-1.5 rounded-sm text-[8px]">
                <div>
                    <span className="text-slate-500 font-bold block">INVOICE NO & DATE:</span>
                    <span className="font-bold text-slate-900 font-mono">
                        {lr.invoiceNo || '---'} {lr.invoiceDate ? `• ${formatDisplayDate(lr.invoiceDate)}` : ''}
                    </span>
                </div>
                <div>
                    <span className="text-slate-500 font-bold block">E-WAY BILL NO:</span>
                    <span className="font-mono font-black text-blue-900">
                        {lr.ewayBillNo || '---'}
                    </span>
                </div>
                <div>
                    <span className="text-slate-500 font-bold block">EWB EXPIRY DATE:</span>
                    <span className="font-bold text-slate-900">
                        {lr.ewayExDate ? formatDisplayDate(lr.ewayExDate) : (lr.ewayBillDate ? formatDisplayDate(lr.ewayBillDate) : '---')}
                    </span>
                </div>
                <div>
                    <span className="text-slate-500 font-bold block">PO / REF NO:</span>
                    <span className="font-bold text-slate-900 font-mono">
                        {lr.poNo || '---'} {lr.poDate ? `• ${formatDisplayDate(lr.poDate)}` : ''}
                    </span>
                </div>
            </div>

            {/* Goods Description & Packages Itemized Table */}
            <div className="border border-slate-300 rounded-sm overflow-hidden my-1.5">
                <table className="w-full text-left border-collapse text-[8.5px]">
                    <thead>
                        <tr className="bg-[#0f2439] text-white text-[8px] uppercase tracking-wider font-bold">
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
                            <tr>
                                <td className="p-1 text-center font-bold border-r border-slate-200">1</td>
                                <td className="p-1 text-center font-bold border-r border-slate-200">1 Pkg</td>
                                <td className="p-1 border-r border-slate-200 font-bold uppercase">General Goods (Said to Contain)</td>
                                <td className="p-1 text-center font-mono border-r border-slate-200">996511</td>
                                <td className="p-1 text-right font-bold border-r border-slate-200">{totalActualWeight}</td>
                                <td className="p-1 text-right font-bold border-r border-slate-200">{totalChargedWeight}</td>
                                <td className="p-1 text-right font-bold">--</td>
                            </tr>
                        )}

                        {/* Summary Total Row */}
                        <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-800 text-[8.5px]">
                            <td className="p-1 text-center border-r border-slate-300">•</td>
                            <td className="p-1 text-center font-black border-r border-slate-300">
                                {totalPcs > 0 ? `${totalPcs} Total` : 'Total'}
                            </td>
                            <td className="p-1 font-black border-r border-slate-300">Total Quantities Dispatched (Said to Contain)</td>
                            <td className="p-1 text-center border-r border-slate-300">--</td>
                            <td className="p-1 text-right font-black border-r border-slate-300">{totalActualWeight}</td>
                            <td className="p-1 text-right font-black border-r border-slate-300">{totalChargedWeight}</td>
                            <td className="p-1 text-right">--</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Bottom Split Section: GST / Statutory & Financial Breakdown */}
            <div className="grid grid-cols-12 gap-2 my-1.5 items-start">
                {/* Left 7 Columns: GST & STATUTORY COMPLIANCE */}
                <div className="col-span-7 flex flex-col justify-between h-full space-y-1.5">
                    <div>
                        <div className="font-extrabold text-[8.5px] text-[#0f2439] uppercase border-b border-slate-300 pb-0.5">
                            GST & STATUTORY COMPLIANCE DETAILS
                        </div>

                        {/* RCM Liability Banner */}
                        <div className="mt-1 p-1 bg-blue-50/70 border border-blue-200 rounded-sm">
                            <div className="font-black text-[8px] text-blue-900 uppercase">
                                GST on Freight Liability (RCM): <span className="text-blue-700 underline">REVERSE CHARGE APPLICABLE</span>
                            </div>
                            <p className="text-[7px] text-slate-600 leading-tight mt-0.5">
                                As per Notification No. 11/2017-CT(R) / 13/2017-CT(R), Goods Transport Agency (GTA) services tax liability is payable under Reverse Charge Mechanism (RCM @ 5%) by the Consignor / Consignee.
                            </p>
                        </div>

                        {/* Declared Value & Insurance */}
                        <div className="mt-1 text-[8px] space-y-0.5 border border-slate-200 p-1 rounded-sm bg-slate-50/50">
                            <p>
                                <span className="font-bold text-slate-800">Declared Value of Goods:</span> <span className="font-black text-slate-900">{declaredValue}</span>
                                <> • <span className="font-bold text-slate-800">Transit Risk:</span> <span className="font-medium text-slate-900">{transitRisk}</span></>
                            </p>
                            <p className="text-slate-700">
                                <span className="font-bold text-slate-800">Insurance Policy No:</span> {insurancePolicy}
                                <> • <span className="font-bold text-slate-800">Insurer:</span> {insuranceCompany}</>
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
                            <div className="mt-1 p-1 bg-amber-50 border border-amber-200 text-[7.5px] rounded-sm">
                                <span className="font-bold text-amber-900">REMARK: </span>
                                <span className="text-slate-800">{lr.remark}</span>
                            </div>
                        )}
                    </div>

                    {/* 3 Signatures Area */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-300 text-center text-[7.5px]">
                        <div className="flex flex-col justify-end h-14">
                            <div className="border-b border-dashed border-slate-400 mb-1 w-3/4 mx-auto"></div>
                            <span className="font-bold text-slate-700 uppercase">Consignor's Signature</span>
                        </div>
                        <div className="flex flex-col justify-end h-14">
                            <div className="border-b border-dashed border-slate-400 mb-1 w-3/4 mx-auto"></div>
                            <span className="font-bold text-slate-700 uppercase">Driver / Broker Sign</span>
                        </div>
                        <div className="flex flex-col justify-end h-14 items-center">
                            {companyDetails.signatureImageUrl ? (
                                <img
                                    src={companyDetails.signatureImageUrl}
                                    alt="Sign"
                                    className="h-9 w-auto object-contain mb-0.5"
                                />
                            ) : (
                                <div className="border-b border-dashed border-slate-400 mb-1 w-3/4 mx-auto"></div>
                            )}
                            <span className="font-black text-slate-900 uppercase">For {companyDetails.name || 'Carrier'}</span>
                            <span className="text-[6.5px] text-slate-500 font-semibold">(Authorized Signatory)</span>
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: FINANCIAL CHARGES & NET PAYABLE */}
                <div className="col-span-5 border border-slate-800 rounded-sm bg-slate-50/50 overflow-hidden shadow-xs">
                    <div className="bg-[#0f2439] text-white p-1 text-center font-black text-[9px] uppercase tracking-wider">
                        FREIGHT & CHARGES BREAKDOWN
                    </div>

                    <div className="divide-y divide-slate-200 text-[8.5px]">
                        <div className="flex justify-between p-1 bg-white font-bold">
                            <span className="text-slate-800">Basic Freight Charge:</span>
                            <span className="font-mono text-slate-900 font-extrabold">{showAmounts ? formatINR(basicFreight) : '₹ 0.00'}</span>
                        </div>
                        {hamali > 0 && (
                            <div className="flex justify-between p-1 bg-slate-50">
                                <span className="text-slate-700">Hamali / Loading Charges:</span>
                                <span className="font-mono text-slate-800">{showAmounts ? formatINR(hamali) : '₹ 0.00'}</span>
                            </div>
                        )}
                        {doorDelivery > 0 && (
                            <div className="flex justify-between p-1 bg-white">
                                <span className="text-slate-700">Door Delivery Charges:</span>
                                <span className="font-mono text-slate-800">{showAmounts ? formatINR(doorDelivery) : '₹ 0.00'}</span>
                            </div>
                        )}
                        {statistical > 0 && (
                            <div className="flex justify-between p-1 bg-slate-50">
                                <span className="text-slate-700">Statistical & Bilty Charges:</span>
                                <span className="font-mono text-slate-800">{showAmounts ? formatINR(statistical) : '₹ 0.00'}</span>
                            </div>
                        )}
                        {tollTax > 0 && (
                            <div className="flex justify-between p-1 bg-white">
                                <span className="text-slate-700">Toll Tax / Crossing:</span>
                                <span className="font-mono text-slate-800">{showAmounts ? formatINR(tollTax) : '₹ 0.00'}</span>
                            </div>
                        )}
                        {otherSum > 0 && (
                            <div className="flex justify-between p-1 bg-slate-50">
                                <span className="text-slate-700">Surcharge / Collection / Other:</span>
                                <span className="font-mono text-slate-800">{showAmounts ? formatINR(otherSum) : '₹ 0.00'}</span>
                            </div>
                        )}

                        {/* Total Freight Row */}
                        <div className="flex justify-between p-1 bg-blue-100 font-extrabold text-blue-950 border-t border-blue-300">
                            <span>TOTAL FREIGHT CHARGES:</span>
                            <span className="font-mono text-[9.5px]">{showAmounts ? formatINR(totalFreight) : '₹ 0.00'}</span>
                        </div>

                        {/* Advance Paid */}
                        <div className="flex justify-between p-1 bg-emerald-50 text-emerald-950 font-bold">
                            <span>Less: Advance Paid:</span>
                            <span className="font-mono font-black text-emerald-700">- {showAmounts ? formatINR(advancePaid) : '₹ 0.00'}</span>
                        </div>

                        {/* Net Balance To Pay */}
                        <div className="flex justify-between items-center p-1.5 bg-[#0f2439] text-white">
                            <div>
                                <span className="font-black text-[9px] uppercase tracking-wide block">NET BALANCE TO PAY:</span>
                                <span className="text-[7px] text-cyan-300 font-medium tracking-tight">
                                    {freightBasis.includes('PAID') ? '(PAID IN ADVANCE)' : '(PAYABLE AT DESTINATION)'}
                                </span>
                            </div>
                            <span className="font-mono font-black text-base text-yellow-300 tracking-tight">
                                {showAmounts ? formatINR(netBalanceToPay) : '₹ 0.00'}
                            </span>
                        </div>
                    </div>

                    {/* Bank & Payment Info Box */}
                    {companyDetails.bankDetails && companyDetails.bankDetails.accountNo && (
                        <div className="p-1 bg-slate-100 border-t border-slate-300 text-[7px] space-y-0.2">
                            <span className="font-black text-slate-900 block uppercase">Bank RTGS/NEFT Details:</span>
                            <p className="text-slate-700 font-medium leading-tight">
                                Bank: <strong className="text-slate-900">{companyDetails.bankDetails.name}</strong> • A/c: <strong className="font-mono text-slate-900">{companyDetails.bankDetails.accountNo}</strong> • IFSC: <strong className="font-mono text-slate-900">{companyDetails.bankDetails.ifscCode}</strong>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Watermark */}
            <div className="border-t border-slate-300 pt-0.5 flex justify-between items-center text-[7px] text-slate-400 font-medium">
                <span>Computer Generated GST Lorry Receipt • Speedway Logistics ERP</span>
                <span>Page 1 of 1</span>
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
}>(({ 
    lr, 
    companyDetails, 
    showCompanyDetails, 
    showAmounts, 
    templateStyle = 'modern-gst', 
    copyType = 'CONSIGNOR COPY',
    orientation = 'portrait',
    paperSize = 'a4',
    singlePageFit = true
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
${lr.ewayBillNo ? `📑 *E-Way Bill:* ${lr.ewayBillNo}\n` : ''}${lr.invoiceNo ? `🧾 *Invoice No:* ${lr.invoiceNo}\n` : ''}━━━━━━━━━━━━━━━━━━━━
Carrier: *${companyDetails.name || 'Speedway Logistics'}*
${companyDetails.contact?.[0] ? `Helpline: ${companyDetails.contact[0]}` : ''}`;
    };

    // PDF Generator Guaranteed on Single Page
    const handleDownloadPDF = async () => {
        const element = previewRef.current;
        if (!element) return;

        setIsExporting(true);
        const toastId = toast.loading('Generating Single-Page PDF...');

        try {
            const isLandscape = printOrientation === 'landscape';
            const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}_${copyType.replace(/\s+/g, '_')}.pdf`;

            const opt = {
                margin: singlePageFit ? [3, 3, 3, 3] : [5, 5, 5, 5],
                filename: filename,
                image: { type: 'jpeg', quality: 0.99 },
                html2canvas: {
                    scale: 2.3,
                    useCORS: true,
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: isLandscape ? 1120 : paperSize === 'a5' ? 620 : 794
                },
                jsPDF: {
                    unit: 'mm',
                    format: paperSize.toLowerCase(),
                    orientation: printOrientation,
                    compress: true
                },
                pagebreak: singlePageFit ? { mode: ['avoid-all', 'css', 'legacy'] } : { mode: ['css', 'legacy'] }
            };

            await html2pdf().from(element).set(opt).save();
            toast.success('Single-Page PDF downloaded successfully!', { id: toastId });
        } catch (err: any) {
            console.error('PDF error:', err);
            toast.error('Could not generate PDF directly. Opening Print dialog...', { id: toastId });
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
        const element = previewRef.current;
        if (!element) return;
        setIsExporting(true);
        const toastId = toast.loading('Exporting High-Res Image...');
        try {
            const isLandscape = printOrientation === 'landscape';
            const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}_${copyType.replace(/\s+/g, '_')}.png`;

            const imgData = await html2pdf().from(element).set({
                image: { type: 'png', quality: 1.0 },
                html2canvas: {
                    scale: 2.5,
                    useCORS: true,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: isLandscape ? 1120 : paperSize === 'a5' ? 620 : 794
                }
            }).outputImg('datauristring');

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

        const element = previewRef.current;
        if (navigator.share && navigator.canShare && element) {
            try {
                const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
                const pdfBlob = await html2pdf().from(element).set({
                    margin: [3, 3, 3, 3],
                    filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: paperSize.toLowerCase(), orientation: printOrientation }
                }).output('blob');

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

                        {/* Share Hub Button */}
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="flex items-center bg-green-600 text-white px-3.5 py-1.5 rounded-xl hover:bg-green-700 font-bold text-xs shadow-md transition-all active:scale-95"
                            title="Share on WhatsApp, Email & SMS"
                        >
                            <WhatsAppIcon className="w-4 h-4 mr-1.5" />
                            Share Hub
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
                    {/* Left: Orientation & Ratio Controls */}
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
