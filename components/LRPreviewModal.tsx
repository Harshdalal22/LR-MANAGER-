import React, { useRef, forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { LorryReceipt, CompanyDetails } from '../types';
import { DownloadIcon, WhatsAppIcon, EmailIcon, XIcon, SaveIcon, PrintIcon } from './icons';

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
}>(({ lr, companyDetails, showCompanyDetails = true, showAmounts = true, copyType = 'CONSIGNOR COPY' }, ref) => {

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
    const companyStateCode = getStateCodeFromGst(companyDetails.gstn);

    // Calculate item total quantities and weights
    const totalPcs = (lr.items || []).reduce((sum, it) => sum + (Number(it.pcs) || 0), 0);
    const totalActualWeight = Number(lr.actualWeightMT) > 0 
        ? `${lr.actualWeightMT} MT` 
        : (Number(lr.weight) > 0 ? `${lr.weight.toLocaleString('en-IN')} Kg` : (totalPcs > 0 ? `${totalPcs} Units` : '--'));
    const totalChargedWeight = Number(lr.chargedWeight) > 0 ? `${lr.chargedWeight.toLocaleString('en-IN')} Kg` : '--';

    const activeCopy = copyType || lr.copyType || 'CONSIGNOR COPY';
    const freightBasis = lr.freightBasis || (lr.gstPaidBy === 'Consignor' ? 'PAID (Consignor)' : 'TO PAY (Consignee)');
    const transitRisk = lr.transitRisk || "Owner's Risk (Consignor Insured)";
    const insurancePolicy = lr.insurancePolicyNo || 'Not Insured / Customer Declaration';
    const insuranceCompany = lr.insuranceCompany || 'Carrier Not Insurer';
    const declaredValue = Number(lr.invoiceAmount) > 0 ? formatINR(lr.invoiceAmount) : 'As per Invoice';

    const driverName = lr.driverName || (charges.driverName) || '';
    const driverContact = lr.driverContact || (charges.driverContact) || '';
    const vehicleType = lr.vehicleType || (charges.vehicleType) || '';

    return (
        <div
            ref={ref}
            className="printable-area bg-white text-slate-900 font-sans w-full max-w-[760px] mx-auto border border-slate-800 shadow-md p-4 text-[9.5px] leading-snug relative selection:bg-blue-100"
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
                                {companyStateCode && <> • State Code: <span className="font-mono">{companyStateCode}</span></>}
                            </p>
                        )}
                        <p className="text-slate-600">
                            {companyDetails.email && <>Email: <span className="font-medium text-slate-800">{companyDetails.email}</span></>}
                            {companyDetails.contact && companyDetails.contact.length > 0 && (
                                <> • Helpline: <span className="font-semibold text-slate-800">{companyDetails.contact.join(', ')}</span></>
                            )}
                        </p>
                    </div>
                </div>

                {/* Right: Consignment Note Card */}
                <div className="w-[240px] flex-shrink-0 border border-slate-900 rounded-sm overflow-hidden bg-white">
                    <div className="bg-[#0f2439] text-white text-center font-black text-[11px] py-0.5 tracking-wider uppercase">
                        CONSIGNMENT NOTE / LR
                    </div>
                    <div className="bg-slate-100 text-center font-black text-[9px] text-blue-900 border-b border-slate-300 py-0.5 uppercase tracking-wider">
                        {activeCopy}
                    </div>
                    <div className="p-1.5 space-y-0.5 text-[8.5px]">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-semibold">LR / Bilty No:</span>
                            <span className="font-black text-blue-700 text-[11px] font-mono">{lr.lrNo}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-semibold">LR Date:</span>
                            <span className="font-bold text-slate-900">{formatBiltyDate(lr.date)}</span>
                        </div>
                        {lr.ewayBillNo && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 font-semibold">E-Way Bill No:</span>
                                <span className="font-bold text-slate-900 font-mono text-[8px]">{lr.ewayBillNo}</span>
                            </div>
                        )}
                        {lr.ewayExDate && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 font-semibold">EWB Valid Upto:</span>
                                <span className="font-bold text-slate-900 text-[8px]">{formatBiltyDate(lr.ewayExDate)} (23:59)</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Route & Vehicle Banner (Dark Navy) */}
            <div className="bg-[#0f2439] text-white my-1.5 px-3 py-1.5 rounded-sm flex flex-row justify-between items-center">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="text-cyan-300 text-[7px] font-extrabold uppercase tracking-widest">SOURCE • ORIGIN</div>
                        <div className="text-xs font-black tracking-wide uppercase text-white">{lr.fromPlace || 'ORIGIN'}</div>
                    </div>
                    <div className="text-cyan-400 font-black text-sm px-1">➔</div>
                    <div>
                        <div className="text-cyan-300 text-[7px] font-extrabold uppercase tracking-widest">DESTINATION • DELIVERY POINT</div>
                        <div className="text-xs font-black tracking-wide uppercase text-white">{lr.toPlace || 'DESTINATION'}</div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-cyan-300 text-[7px] font-extrabold uppercase tracking-widest">VEHICLE & DRIVER DETAILS</div>
                    <div className="text-xs font-black uppercase text-white tracking-wider">
                        {lr.truckNo} {vehicleType ? `• ${vehicleType}` : ''}
                    </div>
                    {(driverName || driverContact) && (
                        <div className="text-[8px] text-slate-300 font-medium">
                            Driver: {driverName || 'Assigned'} {driverContact ? `(+91 ${driverContact})` : ''}
                        </div>
                    )}
                </div>
            </div>

            {/* Consignor & Consignee 2-Column Grid */}
            <div className="grid grid-cols-2 gap-2 my-1.5">
                {/* Consignor Box */}
                <div className="border border-slate-400 p-2 rounded-sm bg-slate-50/40 flex flex-col justify-between min-h-[90px]">
                    <div>
                        <div className="font-extrabold text-[8.5px] text-[#0f2439] uppercase flex items-center gap-1 border-b border-slate-300 pb-0.5 mb-1">
                            <span>📦</span> CONSIGNOR (BILLED & DISPATCHED FROM)
                        </div>
                        <p className="font-black text-slate-900 text-[10.5px] uppercase">{lr.consignor?.name || 'CONSIGNOR NAME'}</p>
                        <p className="text-[8.5px] text-slate-700 mt-0.5 leading-tight">
                            {lr.consignor?.address}{lr.consignor?.city ? `, ${lr.consignor.city}` : ''}
                        </p>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-200 text-[8px] space-y-0.5">
                        {consignorGst && (
                            <p className="font-bold text-slate-800">
                                GSTIN: <span className="font-mono">{consignorGst}</span>
                                {consignorStateCode && <> • State Code: <span className="font-mono">{consignorStateCode}</span></>}
                            </p>
                        )}
                        <p className="text-slate-700">
                            {lr.consignor?.contact && <>Contact: <span className="font-medium">{lr.consignor.contact}</span></>}
                            {lr.invoiceNo && <> • Inv No: <span className="font-bold text-slate-900">{lr.invoiceNo}</span></>}
                            {lr.invoiceDate && <> ({formatBiltyDate(lr.invoiceDate)})</>}
                        </p>
                    </div>
                </div>

                {/* Consignee Box */}
                <div className="border border-slate-400 p-2 rounded-sm bg-slate-50/40 flex flex-col justify-between min-h-[90px]">
                    <div>
                        <div className="font-extrabold text-[8.5px] text-[#0f2439] uppercase flex items-center gap-1 border-b border-slate-300 pb-0.5 mb-1">
                            <span>🏢</span> CONSIGNEE (SHIP & DELIVERY TO)
                        </div>
                        <p className="font-black text-slate-900 text-[10.5px] uppercase">{lr.consignee?.name || 'CONSIGNEE NAME'}</p>
                        <p className="text-[8.5px] text-slate-700 mt-0.5 leading-tight">
                            {lr.consignee?.address}{lr.consignee?.city ? `, ${lr.consignee.city}` : ''}
                        </p>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-200 text-[8px] space-y-0.5">
                        {consigneeGst && (
                            <p className="font-bold text-slate-800">
                                GSTIN: <span className="font-mono">{consigneeGst}</span>
                                {consigneeStateCode && <> • State Code: <span className="font-mono">{consigneeStateCode}</span></>}
                            </p>
                        )}
                        <p className="text-slate-700">
                            {lr.consignee?.contact && <>Contact: <span className="font-medium">{lr.consignee.contact}</span></>}
                            {lr.poNo && <> • PO No: <span className="font-bold text-slate-900">{lr.poNo}</span></>}
                            {lr.addressOfDelivery && <> • Del: {lr.addressOfDelivery}</>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Separate Billing Party Banner (If different) */}
            {lr.billingTo?.name && (lr.billingTo.name !== lr.consignor.name && lr.billingTo.name !== lr.consignee.name) && (
                <div className="bg-amber-50 border border-amber-300 px-2 py-1 rounded-sm my-1 text-[8.5px]">
                    <span className="font-black text-amber-900 uppercase">BILLING PARTY: </span>
                    <span className="font-bold text-slate-900">{lr.billingTo.name}</span>
                    <span> — {lr.billingTo.address}, {lr.billingTo.city} {lr.billingTo.gst && `(GST: ${lr.billingTo.gst})`}</span>
                </div>
            )}

            {/* Goods & Packages Table */}
            <div className="my-1.5 border border-slate-800 rounded-sm overflow-hidden">
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
                                        {item.pcs} {item.packingDetails || 'Pkgs'}
                                    </td>
                                    <td className="p-1 border-r border-slate-200 align-top">
                                        <div className="font-black text-slate-900 uppercase">{item.description}</div>
                                        {item.packingDetails && (
                                            <div className="text-[7.5px] text-slate-500 font-medium">Packing: {item.packingDetails}</div>
                                        )}
                                    </td>
                                    <td className="p-1 text-center font-mono text-slate-800 border-r border-slate-200 align-top">
                                        {item.hsn || lr.hsnCode || companyDetails.sacCode || '996511'}
                                    </td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">
                                        {Number(item.weight) > 0 ? `${item.weight.toLocaleString('en-IN')} Kg` : (idx === 0 && Number(lr.actualWeightMT) > 0 ? `${lr.actualWeightMT} MT` : '--')}
                                    </td>
                                    <td className="p-1 text-right font-bold text-slate-900 border-r border-slate-200 align-top">
                                        {Number(item.chargedWeight) > 0 ? `${item.chargedWeight.toLocaleString('en-IN')} Kg` : (idx === 0 && Number(lr.chargedWeight) > 0 ? `${lr.chargedWeight.toLocaleString('en-IN')} Kg` : '--')}
                                    </td>
                                    <td className="p-1 text-right font-bold text-slate-900 align-top">
                                        {showAmounts && (Number(item.rate) > 0 || Number(lr.rate) > 0)
                                            ? `₹ ${Number(item.rate || lr.rate).toFixed(2)} / ${item.unit || lr.rateOn || 'Ton'}`
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
                            <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-700">
                                Consignor / Loader Sign
                            </div>
                        </div>
                        <div className="flex flex-col justify-end h-14">
                            <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-700">
                                Driver Sign / Thumb Impression
                            </div>
                        </div>
                        <div className="flex flex-col justify-end items-center h-14">
                            {companyDetails.signatureImageUrl && (
                                <img
                                    src={companyDetails.signatureImageUrl}
                                    alt="Sign"
                                    className="h-8 w-auto object-contain mb-0.5"
                                />
                            )}
                            <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900 w-full">
                                For {companyDetails.name || 'Logistics Co.'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: FREIGHT & CHARGES BREAKDOWN */}
                <div className="col-span-5 border border-slate-400 rounded-sm bg-slate-50/50 p-2 flex flex-col justify-between">
                    <div className="space-y-1">
                        {/* Freight Basis Badge */}
                        <div className="flex justify-between items-center bg-blue-100 border border-blue-300 p-1 rounded-sm">
                            <span className="font-bold text-[8px] text-blue-900 uppercase">Freight Basis:</span>
                            <span className="font-black text-[9px] text-blue-800 uppercase">{freightBasis}</span>
                        </div>

                        {/* Charges Lines */}
                        <div className="divide-y divide-slate-200 text-[8.5px] pt-1">
                            <div className="flex justify-between py-0.5">
                                <span className="text-slate-600 font-medium">Basic Freight (Charged Wt):</span>
                                <span className="font-bold text-slate-900">{formatINR(showAmounts ? basicFreight : 0)}</span>
                            </div>
                            {hamali > 0 && (
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-600 font-medium">Loading & Handling Hamali:</span>
                                    <span className="font-bold text-slate-900">{formatINR(showAmounts ? hamali : 0)}</span>
                                </div>
                            )}
                            {doorDelivery > 0 && (
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-600 font-medium">Door Pickup & Delivery:</span>
                                    <span className="font-bold text-slate-900">{formatINR(showAmounts ? doorDelivery : 0)}</span>
                                </div>
                            )}
                            {statistical > 0 && (
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-600 font-medium">Statistical & LR Surcharge:</span>
                                    <span className="font-bold text-slate-900">{formatINR(showAmounts ? statistical : 0)}</span>
                                </div>
                            )}
                            {tollTax > 0 && (
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-600 font-medium">Toll & Green Tax Surcharge:</span>
                                    <span className="font-bold text-slate-900">{formatINR(showAmounts ? tollTax : 0)}</span>
                                </div>
                            )}
                            {otherSum > 0 && (
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-600 font-medium">Other Charges / Risk:</span>
                                    <span className="font-bold text-slate-900">{formatINR(showAmounts ? otherSum : 0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-0.5 text-slate-500 text-[8px]">
                                <span>GST on Freight (5% RCM):</span>
                                <span className="font-bold text-slate-700">{formatINR(0)} (by Recipient)</span>
                            </div>
                        </div>

                        {/* Total Freight Banner */}
                        <div className="bg-[#0f2439] text-white p-1.5 rounded-sm flex justify-between items-center my-1">
                            <span className="font-bold text-[9px] uppercase tracking-wider">TOTAL FREIGHT AMOUNT:</span>
                            <span className="font-black text-sm">{formatINR(showAmounts ? totalFreight : 0)}</span>
                        </div>

                        {/* Advance Paid */}
                        <div className="flex justify-between items-center py-0.5 text-[8.5px] px-1">
                            <span className="text-slate-600 font-semibold">Advance Paid (by Cash/Online):</span>
                            <span className="font-bold text-emerald-700">(-) {formatINR(showAmounts ? advancePaid : 0)}</span>
                        </div>

                        {/* Net Balance To Pay */}
                        <div className="bg-blue-50 border-2 border-blue-600 p-1.5 rounded-sm flex justify-between items-center mt-1">
                            <span className="font-black text-[9.5px] text-blue-950 uppercase tracking-wide">NET BALANCE TO PAY:</span>
                            <span className="font-black text-sm text-blue-900">{formatINR(showAmounts ? netBalanceToPay : 0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Notice */}
            <div className="text-[7px] text-slate-400 text-center pt-1 italic border-t border-slate-200 mt-1">
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
}>(({ lr, companyDetails, showCompanyDetails, showAmounts }, ref) => {
    const totalCharges = (Object.values(lr.charges || {}) as number[]).reduce((sum: number, charge: number) => sum + (charge || 0), 0);
    const totalToPay = (Number(lr.freight) || 0) + totalCharges;

    const isBillingPartySeparate = lr.billingTo && lr.billingTo.name &&
        (lr.billingTo.name !== lr.consignor.name || lr.billingTo.address !== lr.consignor.address) &&
        (lr.billingTo.name !== lr.consignee.name || lr.billingTo.address !== lr.consignee.address);

    const formatAmount = (amount: number | undefined) => {
        return showAmounts ? (Number(amount) || 0).toFixed(2) : "0.00";
    };

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
                </div>

                {/* Right: Contact & Badge */}
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
                                <span>Dt: {lr.ewayBillDate ? new Date(lr.ewayBillDate).toLocaleDateString('en-GB') : '-'}</span>
                                <span>Ex: {lr.ewayExDate ? new Date(lr.ewayExDate).toLocaleDateString('en-GB') : '-'}</span>
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
                            {Number(lr.actualWeightMT) > 0 ? lr.actualWeightMT : (Number(lr.weight) > 0 ? lr.weight : '')}
                        </td>
                        <td className="border-r-2 border-black p-2 text-center align-top font-bold">
                            {Number(lr.chargedWeight) > 0 ? lr.chargedWeight : ''}
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
                                <div className="flex justify-between border-b border-black p-1">
                                    <span>Risk Charges</span>
                                    <span>{formatAmount(lr.charges.riskCharge)}</span>
                                </div>
                                <div className="flex justify-between p-1 mt-auto bg-gray-100 font-bold border-t border-black text-sm">
                                    <span>Total</span>
                                    <span>{formatAmount(totalToPay)}</span>
                                </div>
                            </div>
                        </td>
                    </tr>

                    {/* Footer Section inside Table */}
                    <tr>
                        <td colSpan={4} className="border-t-2 border-r-2 border-black p-2 align-top">
                            <div className="flex flex-col justify-between h-full space-y-2">
                                <div className="grid grid-cols-1 gap-2 text-[8px]">
                                    <div>
                                        <p className="font-bold">Invoice No: <span className="font-normal">{lr.invoiceNo}</span></p>
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

// Unified LRContent Component
export const LRContent = forwardRef<HTMLDivElement, {
    lr: LorryReceipt;
    companyDetails: CompanyDetails;
    showCompanyDetails: boolean;
    showAmounts: boolean;
    templateStyle?: 'modern-gst' | 'classic';
    copyType?: string;
}>(({ lr, companyDetails, showCompanyDetails, showAmounts, templateStyle = 'modern-gst', copyType = 'CONSIGNOR COPY' }, ref) => {
    const activeTemplate = templateStyle || lr.templateStyle || 'modern-gst';

    if (activeTemplate === 'classic') {
        return (
            <ClassicLRContent
                ref={ref}
                lr={lr}
                companyDetails={companyDetails}
                showCompanyDetails={showCompanyDetails}
                showAmounts={showAmounts}
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

    const effectiveTemplate = viewMode === 'compare' ? 'modern-gst' : viewMode;

    const handleDownloadPDF = () => {
        const element = previewRef.current;
        if (!element) return;

        const opt = {
            margin: [4, 4, 4, 4],
            filename: `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}_${copyType.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.99 },
            html2canvas: { scale: 2.5, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(element).set(opt).save();
    };

    const handlePrint = () => {
        window.print();
    };

    const handleShareWhatsApp = async () => {
        const element = previewRef.current;
        if (!element) {
            toast.error("Preview content not found. Cannot generate PDF.");
            return;
        }

        const filename = `LR-${(lr.lrNo || 'RECEIPT').replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
        const message = `Hi ${lr.consignee?.name || 'Customer'}, here is your GST-compliant Lorry Receipt (LR No. ${lr.lrNo}) from ${companyDetails.name || 'Speedway Logistics'}.`;

        try {
            const opt = {
                margin: [4, 4, 4, 4],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
                toast.error('Your browser doesn\'t support direct sharing. Downloading PDF instead...', { duration: 4000 });
                html2pdf().from(element).set(opt).save();
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing file:', error);
                toast.error('An error occurred while trying to share the file.');
            }
        }
    };

    const handleShareEmail = () => {
        const email = lr.consignee?.contact || '';
        const subject = encodeURIComponent(`Lorry Receipt (LR No: ${lr.lrNo}) - ${companyDetails.name}`);
        const body = encodeURIComponent(`Dear ${lr.consignee?.name || 'Customer'},\n\nPlease find the Consignment Note / Lorry Receipt (LR No: ${lr.lrNo}) attached for shipment dispatched from ${lr.fromPlace} to ${lr.toPlace}.\n\nThank you,\n${companyDetails.name}`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/75 z-50 flex justify-center items-start p-2 sm:p-4 overflow-auto backdrop-blur-sm animate-fadeIn">
            {/* Render a copy for printing */}
            {printRoot && createPortal(
                <LRContent
                    lr={lr}
                    companyDetails={companyDetails}
                    showCompanyDetails={showCompanyDetails}
                    showAmounts={showAmounts}
                    templateStyle={effectiveTemplate}
                    copyType={copyType}
                />,
                printRoot
            )}

            {/* Modal Dialog */}
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-7xl my-4 overflow-hidden border border-slate-200 flex flex-col">
                {/* Modal Toolbar */}
                <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md">
                            <span className="text-lg">📄</span>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                                Bilty / LR Preview & Layout Selector
                                <span className="text-xs bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-full font-bold">
                                    {lr.lrNo || 'Draft'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Compare layouts & export print-ready GST Lorry Receipts</p>
                        </div>
                    </div>

                    {/* Template & Copy Switchers + Action Buttons */}
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Design Template Switcher with Recommendation */}
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
                                🔀 Compare Both
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
                            className="flex items-center bg-slate-800 text-white px-3 py-1.5 rounded-xl hover:bg-slate-900 font-bold text-xs shadow-md transition-colors"
                        >
                            <PrintIcon className="w-4 h-4 mr-1" />
                            Print
                        </button>

                        {/* PDF Download Button */}
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-xl hover:bg-blue-700 font-bold text-xs shadow-md transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4 mr-1" />
                            PDF
                        </button>

                        {/* WhatsApp Share */}
                        <button
                            onClick={handleShareWhatsApp}
                            className="flex items-center bg-green-500 text-white px-3 py-1.5 rounded-xl hover:bg-green-600 font-bold text-xs shadow-md transition-colors"
                        >
                            <WhatsAppIcon className="w-4 h-4 mr-1" />
                            Share
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

                {/* Layout Recommendation Banner */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                            💡 Layout Recommendation
                        </span>
                        <span className="font-medium text-slate-200">
                            {viewMode === 'modern-gst' ? (
                                <><strong>Modern GST BiltyBook (Recommended)</strong>: Best for GST Compliance, Corporate Customers, E-Way Bill audits, and WhatsApp/PDF sharing.</>
                            ) : viewMode === 'classic' ? (
                                <><strong>Classic Standard Layout</strong>: Traditional dot-matrix format for basic printing on legacy paper.</>
                            ) : (
                                <><strong>Side-by-Side Comparison</strong>: Compare Modern GST vs Classic layout to pick the best format for your company branding.</>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                        <span>Current Selected: <strong className="text-white uppercase">{effectiveTemplate === 'modern-gst' ? '✨ Modern GST BiltyBook' : '📋 Classic Standard'}</strong></span>
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
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LRPreviewModal;
