import React, { useState, useEffect } from 'react';
import { LorryReceipt, Item, PartyDetails, DetailedCharges, CompanyDetails, SavedParty, SavedTruck } from '../types';
import LRPreviewModal, { LRContent } from './LRPreviewModal';
import { PlusIcon, TrashIcon, CreateIcon, ListIcon, SparklesIcon, ArrowLeftIcon, DownloadIcon, WhatsAppIcon, PrintIcon } from './icons';
import { suggestLRDetails } from '../services/geminiService';
import { toast } from 'react-hot-toast';
import { Language, t } from '../utils/translations';
import { getNextSequence } from '../utils/sequenceUtils';

interface LRFormProps {
    onSave: (lr: LorryReceipt) => void;
    existingLR: LorryReceipt | null;
    onCancel: () => void;
    companyDetails: CompanyDetails;
    lorryReceipts: LorryReceipt[];
    savedParties?: SavedParty[];
    savedTrucks?: SavedTruck[];
    language: Language;
}

const initialPartyState: PartyDetails = { name: '', address: '', city: '', contact: '', pan: '', gst: '' };

const initialChargesState: DetailedCharges = {
    hamail: 0, surCharge: 0, stCharge: 0, collectionCharge: 0, ddCharge: 0, otherCharge: 0, riskCharge: 0, tollTax: 0, advancePaid: 0
};

// 100% CLEAN, ZEROED OUT FRESH STATE
const initialLRState: LorryReceipt = {
    lrNo: '',
    lrType: 'Original',
    truckNo: '',
    date: new Date().toISOString().split('T')[0],
    fromPlace: '',
    toPlace: '',
    invoiceNo: '',
    invoiceAmount: 0,
    invoiceDate: '',
    poNo: '',
    poDate: '',
    ewayBillNo: '',
    ewayBillDate: '',
    ewayExDate: '',
    addressOfDelivery: '',
    chargedWeight: 0,
    gstPaidBy: 'Consignor',
    consignor: { ...initialPartyState },
    consignee: { ...initialPartyState },
    billingTo: { ...initialPartyState },
    items: [{ description: '', pcs: 0, weight: 0, chargedWeight: 0, packingDetails: '', rate: 0, unit: 'Kg', hsn: '' }],
    weight: 0,
    actualWeightMT: 0,
    freight: 0,
    charges: { ...initialChargesState },
    rate: 0,
    rateOn: 'Ton',
    remark: '',
    status: 'Booked',
    driverName: '',
    driverContact: '',
    vehicleType: '',
    advancePaid: 0,
    freightBasis: 'TO PAY',
    insuranceCompany: '',
    insurancePolicyNo: '',
    transitRisk: "Owner's Risk (Consignor Insured)",
    hsnCode: '',
    templateStyle: 'modern-gst',
    copyType: 'CONSIGNOR COPY'
};

const VEHICLE_PRESETS = ['14 Ft Open', '19 Ft Container', '20 Ft Container', '32 Ft SXL', '32 Ft MXL', '40 Ft Trailer', 'Taurus 10-Wheeler'];
const PACKING_PRESETS = ['Boxes', 'Cartons', 'Drums', 'Bags', 'Wooden Cases', 'Pallets', 'Loose Units'];

const LRForm: React.FC<LRFormProps> = ({ onSave, existingLR, onCancel, companyDetails, lorryReceipts, savedParties = [], savedTrucks = [], language }) => {
    const [formData, setFormData] = useState<LorryReceipt>(initialLRState);
    const [billingPartyType, setBillingPartyType] = useState<'Consignor' | 'Consignee' | 'Other'>('Consignor');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [livePreviewTemplate, setLivePreviewTemplate] = useState<'modern-gst' | 'classic'>('modern-gst');
    const [livePreviewCopy, setLivePreviewCopy] = useState<string>('CONSIGNOR COPY');
    const [previewScale, setPreviewScale] = useState<number>(0.82);
    const [chargedWeightUnit, setChargedWeightUnit] = useState<'Kg' | 'Ton'>('Kg');

    useEffect(() => {
        if (existingLR) {
            setFormData(existingLR);
            if (existingLR.templateStyle) setLivePreviewTemplate(existingLR.templateStyle);
            if (existingLR.copyType) setLivePreviewCopy(existingLR.copyType);

            if (JSON.stringify(existingLR.billingTo) === JSON.stringify(existingLR.consignor)) {
                setBillingPartyType('Consignor');
            } else if (JSON.stringify(existingLR.billingTo) === JSON.stringify(existingLR.consignee)) {
                setBillingPartyType('Consignee');
            } else {
                setBillingPartyType('Other');
            }
        } else {
            const savedDraft = localStorage.getItem('lr_draft_data');
            const savedBilling = localStorage.getItem('lr_draft_billing') as 'Consignor' | 'Consignee' | 'Other';
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    setFormData(parsed);
                    if (parsed.templateStyle) setLivePreviewTemplate(parsed.templateStyle);
                    setBillingPartyType(savedBilling || 'Consignor');
                } catch (e) {
                    console.error('Failed to parse draft LR data');
                    resetToCleanState();
                }
            } else {
                resetToCleanState();
            }
        }
    }, [existingLR]);

    const resetToCleanState = () => {
        let nextLrNo = '';
        if (lorryReceipts && lorryReceipts.length > 0) {
            nextLrNo = getNextSequence(lorryReceipts[0].lrNo);
        }
        setFormData({ ...initialLRState, lrNo: nextLrNo });
        setBillingPartyType('Consignor');
    };

    // Auto-save draft to local storage whenever formData or billingPartyType changes
    useEffect(() => {
        if (!existingLR && formData.lrNo) {
            localStorage.setItem('lr_draft_data', JSON.stringify(formData));
            localStorage.setItem('lr_draft_billing', billingPartyType);
        }
    }, [formData, billingPartyType, existingLR]);

    useEffect(() => {
        if (billingPartyType === 'Consignor') {
            setFormData(prev => ({ ...prev, billingTo: prev.consignor }));
        } else if (billingPartyType === 'Consignee') {
            setFormData(prev => ({ ...prev, billingTo: prev.consignee }));
        }
    }, [billingPartyType, formData.consignor, formData.consignee]);

    // Weight calculation: normalize all item weights to both Kg and Ton (MT)
    useEffect(() => {
        let totalKg = 0;
        let totalTon = 0;

        formData.items.forEach(item => {
            const w = Number(item.weight) || 0;
            const unit = (item.unit || 'Kg').toLowerCase();

            if (unit === 'ton' || unit === 'mt') {
                totalTon += w;
                totalKg += w * 1000;
            } else {
                totalKg += w;
                totalTon += w / 1000;
            }
        });

        const formattedTon = Number(totalTon.toFixed(3));
        const formattedKg = Math.round(totalKg);

        setFormData(prev => ({
            ...prev,
            weight: formattedKg,
            actualWeightMT: formattedTon
        }));
    }, [formData.items]);

    useEffect(() => {
        // Calculate freight automatically if not Fixed
        if (formData.rateOn !== 'Fixed') {
            const rate = Number(formData.rate) || 0;
            if (rate > 0) {
                if (formData.rateOn === 'Ton') {
                    // Use charged weight in tons if specified, else actual weight in MT/Ton
                    const tons = Number(formData.chargedWeight) > 0 
                        ? Number(formData.chargedWeight) / 1000 
                        : (Number(formData.actualWeightMT) > 0 ? Number(formData.actualWeightMT) : (Number(formData.weight) || 0) / 1000);
                    const calculatedFreight = tons * rate;
                    if (calculatedFreight > 0) {
                        setFormData(prev => ({ ...prev, freight: Math.round(calculatedFreight) }));
                    }
                } else if (formData.rateOn === 'Kg') {
                    // Use charged weight in kg if specified, else weight in kg
                    const kgs = Number(formData.chargedWeight) > 0 
                        ? Number(formData.chargedWeight) 
                        : (Number(formData.weight) > 0 ? Number(formData.weight) : (Number(formData.actualWeightMT) || 0) * 1000);
                    const calculatedFreight = kgs * rate;
                    if (calculatedFreight > 0) {
                        setFormData(prev => ({ ...prev, freight: Math.round(calculatedFreight) }));
                    }
                }
            }
        }
    }, [formData.actualWeightMT, formData.chargedWeight, formData.weight, formData.rate, formData.rateOn]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePartyChange = (party: 'consignor' | 'consignee' | 'billingTo', e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [party]: {
                ...prev[party],
                [name]: value
            }
        }));

        if (name === 'name') {
            const foundParty = savedParties.find(p => p.name.toLowerCase() === value.toLowerCase());
            if (foundParty) {
                setFormData(prev => ({
                    ...prev,
                    [party]: {
                        ...prev[party],
                        name: foundParty.name,
                        address: foundParty.address || prev[party].address,
                        city: foundParty.city || prev[party].city,
                        contact: foundParty.contact || prev[party].contact,
                        pan: foundParty.pan || prev[party].pan,
                        gst: foundParty.gst || prev[party].gst,
                    }
                }));
            }
        }
    };

    const handleItemChange = (index: number, field: keyof Item, value: any) => {
        const newItems = [...formData.items];
        (newItems[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', pcs: 0, weight: 0, chargedWeight: 0, packingDetails: '', rate: 0, unit: 'Kg', hsn: prev.hsnCode || '996511' }]
        }));
    };

    const removeItem = (index: number) => {
        if (formData.items.length > 1) {
            const newItems = formData.items.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, items: newItems }));
        }
    };

    const handleChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            charges: {
                ...prev.charges,
                [name]: parseFloat(value) || 0
            }
        }));
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.lrNo || !formData.truckNo || !formData.fromPlace || !formData.toPlace || !formData.consignor.name || !formData.consignee.name) {
            toast.error('Please fill all required fields marked with * (LR No, Truck No, From, To, Consignor, Consignee).');
            return;
        }

        setIsSaving(true);
        try {
            const payload: LorryReceipt = {
                ...formData,
                templateStyle: livePreviewTemplate,
                copyType: livePreviewCopy
            };
            await onSave(payload);
            if (!existingLR) {
                localStorage.removeItem('lr_draft_data');
                localStorage.removeItem('lr_draft_billing');
            }
        } catch (error) {
            console.error("Save error in LRForm:", error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    // Clean Fresh Reset
    const handleResetFresh = () => {
        if (window.confirm('Reset all fields to a fresh, clean LR with zero values?')) {
            localStorage.removeItem('lr_draft_data');
            localStorage.removeItem('lr_draft_billing');
            resetToCleanState();
            toast.success('Form reset to fresh clean state!');
        }
    };

    // 1-Click Generator for Speedway / Apex Reference Bilty
    const handleLoadSampleLR = () => {
        const sampleLR: LorryReceipt = {
            lrNo: 'SWL-2026-0892',
            lrType: 'Original',
            truckNo: 'HR-12-AU-2864',
            vehicleType: '32 Ft MXL',
            driverName: 'Rajesh Kumar',
            driverContact: '9876543210',
            date: '2026-08-29',
            fromPlace: 'GURGAON (HR)',
            toPlace: 'MUMBAI (MH)',
            invoiceNo: 'AAC/26-27/0419',
            invoiceAmount: 1485000,
            invoiceDate: '2026-08-28',
            poNo: 'PO-PUN-9821',
            poDate: '2026-08-25',
            ewayBillNo: '5819 2840 1928',
            ewayBillDate: '2026-08-29',
            ewayExDate: '2026-09-02',
            addressOfDelivery: 'Gate 3, MIDC Industrial Area, Chakan, Pune, MH - 410501',
            chargedWeight: 6700,
            gstPaidBy: 'Consignor',
            consignor: {
                name: 'APEX AUTOMOTIVE COMPONENTS PVT LTD',
                address: 'Plot No. 104, Sector 8, IMT Manesar',
                city: 'Gurugram, HR - 122051',
                contact: 'Vikas Sharma (+91 94160 11223)',
                pan: 'AAACA5566G',
                gst: '06AAACA5566G1Z2'
            },
            consignee: {
                name: 'MAHARASHTRA AUTO ENGINES LTD',
                address: 'Gate 3, MIDC Industrial Area, Chakan',
                city: 'Pune, MH - 410501',
                contact: 'Receiving Incharge (+91 98220 99887)',
                pan: 'AABCM7788P',
                gst: '27AABCM7788P1Z9'
            },
            billingTo: {
                name: 'APEX AUTOMOTIVE COMPONENTS PVT LTD',
                address: 'Plot No. 104, Sector 8, IMT Manesar',
                city: 'Gurugram, HR - 122051',
                contact: 'Vikas Sharma (+91 94160 11223)',
                pan: 'AAACA5566G',
                gst: '06AAACA5566G1Z2'
            },
            items: [
                {
                    description: 'High Precision Engine Gaskets & Auto Parts',
                    pcs: 140,
                    weight: 4250,
                    chargedWeight: 4500,
                    packingDetails: 'Corrugated Master Cartons (Marks: AAC-MH-01 to 140)',
                    rate: 7.50,
                    unit: 'Kg',
                    hsn: '87082900'
                },
                {
                    description: 'Synthetic Engine Lubricants & Coolant Fluid',
                    pcs: 40,
                    weight: 2100,
                    chargedWeight: 2200,
                    packingDetails: '50L Steel Barrels • Handle with Care',
                    rate: 8.00,
                    unit: 'Kg',
                    hsn: '27101980'
                }
            ],
            weight: 6350,
            actualWeightMT: 6.35,
            freight: 51350,
            charges: {
                hamail: 1200,
                ddCharge: 2500,
                stCharge: 150,
                tollTax: 1800,
                surCharge: 0,
                collectionCharge: 0,
                otherCharge: 0,
                riskCharge: 0,
                advancePaid: 15000
            },
            advancePaid: 15000,
            freightBasis: 'TO PAY',
            rate: 7.50,
            rateOn: 'Kg',
            insuranceCompany: 'ICICI Lombard GIC Ltd.',
            insurancePolicyNo: 'ICICI-LOMB-77210940',
            transitRisk: "Owner's Risk (Consignor Insured)",
            hsnCode: '87082900',
            remark: 'Goods handled with care. Demurrage charges applicable @ ₹ 1,500/day if unloading delayed beyond 24 hrs.',
            status: 'Booked',
            templateStyle: 'modern-gst',
            copyType: 'CONSIGNOR COPY'
        };

        setFormData(sampleLR);
        setBillingPartyType('Consignor');
        setLivePreviewTemplate('modern-gst');
        toast.success('Loaded Speedway / Apex Sample GST Bilty!');
    };

    const handleAiAutofill = async () => {
        setIsAiLoading(true);
        const toastId = toast.loading('AI is analyzing shipment & details...');

        try {
            const suggestions = await suggestLRDetails(formData);
            toast.dismiss(toastId);

            if (suggestions && Object.keys(suggestions).length > 0) {
                setFormData(prev => {
                    const newFormData = { ...prev };
                    const isPartyEmpty = (party: PartyDetails) => !party.name && !party.address;

                    if (suggestions.consignor && isPartyEmpty(prev.consignor)) {
                        newFormData.consignor = { ...initialPartyState, ...suggestions.consignor };
                    }
                    if (suggestions.consignee && isPartyEmpty(prev.consignee)) {
                        newFormData.consignee = { ...initialPartyState, ...suggestions.consignee };
                    }
                    if (billingPartyType === 'Other' && suggestions.billingTo && isPartyEmpty(prev.billingTo)) {
                        newFormData.billingTo = { ...initialPartyState, ...suggestions.billingTo };
                    }
                    if (suggestions.invoiceNo && !prev.invoiceNo) {
                        newFormData.invoiceNo = suggestions.invoiceNo;
                    }
                    if (suggestions.remark && !prev.remark) {
                        newFormData.remark = suggestions.remark;
                    }
                    return newFormData;
                });
                toast.success('AI suggestions applied!');
            } else {
                toast.error('AI could not provide suggestions. Please fill manually.');
            }
        } catch (error) {
            console.error("AI Autofill Error:", error);
            toast.dismiss(toastId);
            toast.error(error instanceof Error ? error.message : 'An error occurred while getting AI suggestions.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const renderPartySection = (title: string, icon: string, partyKey: 'consignor' | 'consignee' | 'billingTo') => {
        const isDisabled = partyKey === 'billingTo' && billingPartyType !== 'Other';
        const disabledClass = isDisabled ? 'bg-slate-100/70 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
        const relevantParties = savedParties;

        return (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <h4 className="font-extrabold text-sm text-slate-800 tracking-wide uppercase">{title}</h4>
                    </div>
                    {partyKey !== 'billingTo' && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                            Required *
                        </span>
                    )}
                </div>

                <div className="space-y-2.5">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Company / Party Name *</label>
                        <input
                            list={`list-${partyKey}`}
                            name="name"
                            value={formData[partyKey].name}
                            onChange={(e) => handlePartyChange(partyKey, e)}
                            placeholder="Enter or select party name..."
                            className={`w-full text-xs p-2 rounded-xl font-bold uppercase ${disabledClass}`}
                            disabled={isDisabled}
                            autoComplete="off"
                            required={partyKey !== 'billingTo'}
                        />
                        <datalist id={`list-${partyKey}`}>
                            {relevantParties.map(p => (
                                <option key={p.id || p.name} value={p.name} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Address</label>
                        <textarea
                            name="address"
                            value={formData[partyKey].address}
                            onChange={(e) => handlePartyChange(partyKey, e)}
                            placeholder="Street, Industrial Area, Sector..."
                            className={`w-full text-xs p-2 rounded-xl ${disabledClass}`}
                            rows={2}
                            disabled={isDisabled}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">City / State</label>
                            <input
                                type="text"
                                name="city"
                                value={formData[partyKey].city}
                                onChange={(e) => handlePartyChange(partyKey, e)}
                                placeholder="e.g. Pune, MH"
                                className={`w-full text-xs p-2 rounded-xl ${disabledClass}`}
                                disabled={isDisabled}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone / Mobile</label>
                            <input
                                type="text"
                                name="contact"
                                value={formData[partyKey].contact}
                                onChange={(e) => handlePartyChange(partyKey, e)}
                                placeholder="9876543210"
                                className={`w-full text-xs p-2 rounded-xl ${disabledClass}`}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">GSTIN</label>
                            <input
                                type="text"
                                name="gst"
                                value={formData[partyKey].gst}
                                onChange={(e) => handlePartyChange(partyKey, e)}
                                placeholder="27AABCM7788P1Z9"
                                className={`w-full text-xs p-2 rounded-xl font-mono uppercase font-semibold ${disabledClass}`}
                                disabled={isDisabled}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">PAN No</label>
                            <input
                                type="text"
                                name="pan"
                                value={formData[partyKey].pan}
                                onChange={(e) => handlePartyChange(partyKey, e)}
                                placeholder="AABCM7788P"
                                className={`w-full text-xs p-2 rounded-xl font-mono uppercase ${disabledClass}`}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const charges = formData.charges || initialChargesState;
    const hamali = Number(charges.hamail || 0);
    const doorDelivery = Number(charges.ddCharge || 0);
    const statistical = Number(charges.stCharge || 0);
    const tollTax = Number(charges.tollTax || charges.otherCharge || 0);
    const surcharge = Number(charges.surCharge || 0);
    const collection = Number(charges.collectionCharge || 0);
    const risk = Number(charges.riskCharge || 0);

    const totalCharges = hamali + doorDelivery + statistical + tollTax + surcharge + collection + risk;
    const totalFreight = (Number(formData.freight) || 0) + totalCharges;
    const advancePaid = Number(formData.advancePaid ?? charges.advancePaid ?? 0);
    const netBalanceToPay = Math.max(0, totalFreight - advancePaid);

    const inputBase = "w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-xs";
    const labelBase = "block text-[11px] font-bold text-slate-700 uppercase mb-1 tracking-wider";

    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start max-w-[1700px] mx-auto pb-12">
            {/* Main Form Section */}
            <div className="w-full xl:w-7/12 space-y-6">
                {/* God-Tier Top Glassmorphism Navigation Bar */}
                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-md flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCancel}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-xs"
                            title="Back"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                                    {existingLR ? 'Edit Consignment Note' : 'Create GST Bilty (Lorry Receipt)'}
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Clean, fresh, and zero-error GST logistics workflow</p>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Reset / Fresh Button */}
                        <button
                            type="button"
                            onClick={handleResetFresh}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors border border-slate-200"
                            title="Reset all fields to 0 / empty"
                        >
                            <span>🔄</span> Reset Clean
                        </button>

                        {/* 1-Click Speedway Sample Generator */}
                        <button
                            type="button"
                            onClick={handleLoadSampleLR}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-sm transition-all"
                            title="Load realistic sample data matching reference design"
                        >
                            <span>⚡</span> Load Sample LR
                        </button>

                        {/* AI Autofill */}
                        <button
                            type="button"
                            onClick={handleAiAutofill}
                            disabled={isAiLoading || !formData.truckNo || !formData.fromPlace || !formData.toPlace}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm transition-all"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            {isAiLoading ? 'Analyzing...' : 'AI Autofill'}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SECTION 1: ROUTE & VEHICLE LOGISTICS */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-base">🚚</span>
                                <div>
                                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">1. Route & Vehicle Logistics</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">Source, destination, vehicle number & driver contact</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer">
                                    <input type="radio" name="lrType" value="Original" checked={formData.lrType === 'Original'} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-1.5" />
                                    Original
                                </label>
                                <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer">
                                    <input type="radio" name="lrType" value="Dummy" checked={formData.lrType === 'Dummy'} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-1.5" />
                                    Dummy
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {/* LR Number */}
                            <div className="lg:col-span-2">
                                <label className={labelBase}>LR / C Note No *</label>
                                <input
                                    type="text"
                                    name="lrNo"
                                    placeholder="e.g. SWL-2026-0892"
                                    value={formData.lrNo}
                                    onChange={handleChange}
                                    className={`${inputBase} font-mono font-black text-blue-700 text-sm`}
                                    required
                                />
                            </div>

                            {/* LR Date */}
                            <div className="lg:col-span-2">
                                <label className={labelBase}>LR Date *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className={inputBase}
                                    required
                                />
                            </div>

                            {/* Freight Basis */}
                            <div className="lg:col-span-2">
                                <label className={labelBase}>Freight Basis *</label>
                                <select
                                    name="freightBasis"
                                    value={formData.freightBasis || 'TO PAY'}
                                    onChange={handleChange}
                                    className={`${inputBase} font-bold`}
                                >
                                    <option value="TO PAY">TO PAY (Consignee)</option>
                                    <option value="PAID">PAID (Consignor)</option>
                                    <option value="TO BE BILLED">TO BE BILLED (TBB)</option>
                                </select>
                            </div>

                            {/* Origin / Source */}
                            <div className="lg:col-span-3">
                                <label className={labelBase}>Origin / Source City *</label>
                                <input
                                    type="text"
                                    name="fromPlace"
                                    placeholder="e.g. GURGAON (HR)"
                                    value={formData.fromPlace}
                                    onChange={handleChange}
                                    className={`${inputBase} uppercase font-bold text-slate-800`}
                                    required
                                />
                            </div>

                            {/* Destination */}
                            <div className="lg:col-span-3">
                                <label className={labelBase}>Destination / Delivery City *</label>
                                <input
                                    type="text"
                                    name="toPlace"
                                    placeholder="e.g. MUMBAI (MH)"
                                    value={formData.toPlace}
                                    onChange={handleChange}
                                    className={`${inputBase} uppercase font-bold text-slate-800`}
                                    required
                                />
                            </div>

                            {/* Vehicle Number */}
                            <div className="lg:col-span-2">
                                <label className={labelBase}>Vehicle / Truck No *</label>
                                <input
                                    list="trucks-list"
                                    type="text"
                                    name="truckNo"
                                    placeholder="HR-12-AU-2864"
                                    value={formData.truckNo}
                                    onChange={handleChange}
                                    className={`${inputBase} font-mono uppercase font-black tracking-wider text-slate-900`}
                                    required
                                    autoComplete="off"
                                />
                                <datalist id="trucks-list">
                                    {savedTrucks.map(t => <option key={t.id || t.truckNo} value={t.truckNo} />)}
                                </datalist>
                            </div>

                            {/* Vehicle Type / Dimension */}
                            <div className="lg:col-span-2">
                                <label className={labelBase}>Vehicle Dimension / Type</label>
                                <input
                                    type="text"
                                    name="vehicleType"
                                    placeholder="32 Ft MXL / Container"
                                    value={formData.vehicleType || ''}
                                    onChange={handleChange}
                                    className={inputBase}
                                />
                            </div>

                            {/* Driver Name */}
                            <div className="lg:col-span-1">
                                <label className={labelBase}>Driver Name</label>
                                <input
                                    type="text"
                                    name="driverName"
                                    placeholder="Rajesh Kumar"
                                    value={formData.driverName || ''}
                                    onChange={handleChange}
                                    className={inputBase}
                                />
                            </div>

                            {/* Driver Phone */}
                            <div className="lg:col-span-1">
                                <label className={labelBase}>Driver Phone</label>
                                <input
                                    type="text"
                                    name="driverContact"
                                    placeholder="9876543210"
                                    value={formData.driverContact || ''}
                                    onChange={handleChange}
                                    className={inputBase}
                                />
                            </div>
                        </div>

                        {/* Quick Vehicle Type Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Select:</span>
                            {VEHICLE_PRESETS.map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, vehicleType: type }))}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${formData.vehicleType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SECTION 2: CONSIGNOR & CONSIGNEE PARTIES */}
                    <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-base">🏢</span>
                                <div>
                                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">2. Consignor & Consignee Parties</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">Sender and receiver company credentials</p>
                                </div>
                            </div>

                            {/* Billing Party Selection */}
                            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
                                <span className="text-slate-500 font-bold">Billing Party:</span>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="billingPartyType" value="Consignor" checked={billingPartyType === 'Consignor'} onChange={() => setBillingPartyType('Consignor')} className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 mr-1" />
                                    Consignor
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="billingPartyType" value="Consignee" checked={billingPartyType === 'Consignee'} onChange={() => setBillingPartyType('Consignee')} className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 mr-1" />
                                    Consignee
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="billingPartyType" value="Other" checked={billingPartyType === 'Other'} onChange={() => setBillingPartyType('Other')} className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 mr-1" />
                                    Other Party
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {renderPartySection('Consignor (Sender)', '📦', 'consignor')}
                            {renderPartySection('Consignee (Receiver)', '🏢', 'consignee')}
                            {billingPartyType === 'Other' && renderPartySection('Billing Party (Third Party)', '💳', 'billingTo')}
                        </div>
                    </div>

                    {/* SECTION 3: CONSIGNMENT ITEMS & GOODS TABLE */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-base">📦</span>
                                <div>
                                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">3. Consignment Items & Goods</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">Itemized goods description, packages, HSN & weights in Ton / Kg</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Item Row
                            </button>
                        </div>

                        {/* Items Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                            <div className="grid grid-cols-12 gap-2 bg-slate-100 p-2.5 font-black text-slate-700 text-xs uppercase tracking-wider items-center">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-4">Description of Goods & Packing</div>
                                <div className="col-span-1 text-center">Unit</div>
                                <div className="col-span-2 text-center">Packages (Pcs)</div>
                                <div className="col-span-2 text-right">Actual Wt</div>
                                <div className="col-span-1 text-right">Charged Wt</div>
                                <div className="col-span-1 text-center">Action</div>
                            </div>

                            <div className="divide-y divide-slate-100 bg-white">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-2.5 hover:bg-slate-50/50 transition-colors">
                                        <div className="col-span-1 text-center font-bold text-slate-400 text-xs">
                                             {index + 1}
                                        </div>
                                        <div className="col-span-4 space-y-1.5">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold uppercase focus:border-blue-500 outline-none"
                                                placeholder="e.g. High Precision Engine Parts"
                                            />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <input
                                                    type="text"
                                                    value={item.packingDetails || ''}
                                                    onChange={(e) => handleItemChange(index, 'packingDetails', e.target.value)}
                                                    className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none"
                                                    placeholder="Packing: Boxes, Drums..."
                                                />
                                                <input
                                                    type="text"
                                                    value={item.hsn || ''}
                                                    onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                                    className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-800 outline-none"
                                                    placeholder="HSN Code (87082900)"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <select
                                                value={item.unit || 'Kg'}
                                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-center bg-slate-50 focus:border-blue-500 outline-none cursor-pointer"
                                                title="Select unit (Kg or Ton)"
                                            >
                                                <option value="Kg">Kg</option>
                                                <option value="Ton">Ton</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                value={item.pcs === 0 ? '' : item.pcs}
                                                onChange={(e) => handleItemChange(index, 'pcs', parseInt(e.target.value) || 0)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-center focus:border-blue-500 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                step="any"
                                                value={item.weight === 0 ? '' : item.weight}
                                                onChange={(e) => handleItemChange(index, 'weight', parseFloat(e.target.value) || 0)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-right focus:border-blue-500 outline-none"
                                                placeholder={item.unit === 'Ton' ? '0.00 MT' : '0 Kg'}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                step="any"
                                                value={item.chargedWeight === 0 ? '' : item.chargedWeight}
                                                onChange={(e) => handleItemChange(index, 'chargedWeight', parseFloat(e.target.value) || 0)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-right focus:border-blue-500 outline-none"
                                                placeholder={item.unit === 'Ton' ? '0.00 MT' : '0 Kg'}
                                            />
                                        </div>
                                        <div className="col-span-1 text-center">
                                            {formData.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete row"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weight & Rate Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                            {/* Dual Actual Weight Display (Kg & Ton) */}
                            <div className="space-y-1">
                                <label className={labelBase}>Total Actual Weight (Auto)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.weight ? `${formData.weight.toLocaleString('en-IN')}` : '0'}
                                            readOnly
                                            placeholder="0"
                                            className={`${inputBase} bg-slate-100 cursor-not-allowed font-bold text-slate-800 text-xs pr-8`}
                                        />
                                        <span className="absolute right-2 top-2.5 text-[10px] font-black text-slate-500">Kg</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.actualWeightMT ? `${formData.actualWeightMT}` : '0'}
                                            readOnly
                                            placeholder="0"
                                            className={`${inputBase} bg-slate-100 cursor-not-allowed font-bold text-blue-700 text-xs pr-9`}
                                        />
                                        <span className="absolute right-2 top-2.5 text-[10px] font-black text-blue-600">Ton</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    {formData.weight > 0 ? `⚖️ ${formData.weight.toLocaleString('en-IN')} Kg = ${formData.actualWeightMT} MT` : 'Auto-calculated from items'}
                                </p>
                            </div>

                            {/* Charged Weight with Unit Switcher */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className={labelBase}>Total Charged Weight</label>
                                    <div className="flex items-center gap-0.5 bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setChargedWeightUnit('Kg')}
                                            className={`px-2 py-0.5 rounded-md transition-all ${chargedWeightUnit === 'Kg' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Kg
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChargedWeightUnit('Ton')}
                                            className={`px-2 py-0.5 rounded-md transition-all ${chargedWeightUnit === 'Ton' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Ton
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step={chargedWeightUnit === 'Ton' ? '0.001' : '1'}
                                        value={
                                            formData.chargedWeight === 0 
                                                ? '' 
                                                : (chargedWeightUnit === 'Ton' ? Number((formData.chargedWeight / 1000).toFixed(3)) : formData.chargedWeight)
                                        }
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const inKg = chargedWeightUnit === 'Ton' ? Math.round(val * 1000) : val;
                                            setFormData(prev => ({ ...prev, chargedWeight: inKg }));
                                        }}
                                        placeholder={chargedWeightUnit === 'Ton' ? '0.000' : '0'}
                                        className={`${inputBase} font-bold text-slate-900 pr-10`}
                                    />
                                    <span className="absolute right-2.5 top-2.5 text-[10px] font-black text-slate-500">
                                        {chargedWeightUnit}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    {formData.chargedWeight > 0 ? (
                                        chargedWeightUnit === 'Ton'
                                            ? `Equivalent: ${formData.chargedWeight.toLocaleString('en-IN')} Kg`
                                            : `Equivalent: ${(formData.chargedWeight / 1000).toFixed(3)} Ton (MT)`
                                    ) : 'Leave 0 to use actual weight'}
                                </p>
                            </div>

                            {/* Freight Rate */}
                            <div className="space-y-1">
                                <label className={labelBase}>Freight Rate (₹)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="rate"
                                        value={formData.rate === 0 ? '' : formData.rate}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className={`${inputBase} font-black text-blue-700 pr-12`}
                                    />
                                    <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-500">
                                        / {formData.rateOn === 'Ton' ? 'MT' : formData.rateOn === 'Kg' ? 'Kg' : 'Fix'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    Rate applied per calculation basis
                                </p>
                            </div>

                            {/* Calculation Basis */}
                            <div className="space-y-1">
                                <label className={labelBase}>Calculation Basis</label>
                                <select
                                    name="rateOn"
                                    value={formData.rateOn}
                                    onChange={handleChange}
                                    className={`${inputBase} font-semibold`}
                                >
                                    <option value="Ton">Per Ton (MT)</option>
                                    <option value="Kg">Per Kg</option>
                                    <option value="Fixed">Fixed Amount (Manual)</option>
                                </select>
                                <p className="text-[10px] text-emerald-600 font-bold">
                                    {formData.rateOn === 'Ton' && 'Freight = Tons (MT) × Rate'}
                                    {formData.rateOn === 'Kg' && 'Freight = Total Kg × Rate'}
                                    {formData.rateOn === 'Fixed' && 'Enter lump-sum freight manually'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: STATUTORY, INVOICE & E-WAY DETAILS */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-base">📄</span>
                            <div>
                                <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">4. Invoice, E-Way Bill & Statutory Compliance</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Invoice amount, EWB validity, insurance and RCM</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <label className={labelBase}>Invoice No</label>
                                <input type="text" name="invoiceNo" placeholder="AAC/26-27/0419" value={formData.invoiceNo} onChange={handleChange} className={inputBase} />
                            </div>
                            <div>
                                <label className={labelBase}>Invoice Amount (₹)</label>
                                <input type="number" name="invoiceAmount" placeholder="0" value={formData.invoiceAmount === 0 ? '' : formData.invoiceAmount} onChange={handleChange} className={inputBase} />
                            </div>
                            <div>
                                <label className={labelBase}>Invoice Date</label>
                                <input type="date" name="invoiceDate" value={formData.invoiceDate || ''} onChange={handleChange} className={inputBase} />
                            </div>
                            <div>
                                <label className={labelBase}>GST Liability / Paid By</label>
                                <select name="gstPaidBy" value={formData.gstPaidBy} onChange={handleChange} className={inputBase}>
                                    <option value="Consignor (RCM @ 5%)">Consignor (RCM @ 5%)</option>
                                    <option value="Consignee (RCM @ 5%)">Consignee (RCM @ 5%)</option>
                                    <option value="Transporter (FCM @ 18%)">Transporter / GTA (FCM @ 18%)</option>
                                    <option value="Transporter (FCM @ 12%)">Transporter / GTA (FCM @ 12%)</option>
                                    <option value="Both (RCM 5% & FCM 18%)">Dual / Both (RCM 5% & FCM 18%)</option>
                                    <option value="Exempted">Exempted / Non-Taxable</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelBase}>E-Way Bill No</label>
                                <input type="text" name="ewayBillNo" placeholder="5819 2840 1928" value={formData.ewayBillNo} onChange={handleChange} className={`${inputBase} font-mono`} />
                            </div>
                            <div>
                                <label className={labelBase}>EWB Date</label>
                                <input type="date" name="ewayBillDate" value={formData.ewayBillDate || ''} onChange={handleChange} className={inputBase} />
                            </div>
                            <div>
                                <label className={labelBase}>EWB Valid Upto</label>
                                <input type="date" name="ewayExDate" value={formData.ewayExDate || ''} onChange={handleChange} className={inputBase} />
                            </div>
                            <div>
                                <label className={labelBase}>PO / Ref No</label>
                                <input type="text" name="poNo" placeholder="PO-PUN-9821" value={formData.poNo} onChange={handleChange} className={inputBase} />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelBase}>Insurance Policy & Insurer</label>
                                <input type="text" name="insurancePolicyNo" placeholder="e.g. ICICI-LOMB-77210940 • ICICI Lombard" value={formData.insurancePolicyNo || ''} onChange={handleChange} className={inputBase} />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelBase}>Delivery Address / Unloading Gate</label>
                                <input type="text" name="addressOfDelivery" placeholder="e.g. Gate 3, MIDC Industrial Area, Chakan" value={formData.addressOfDelivery} onChange={handleChange} className={inputBase} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: FREIGHT CHARGES & FINANCIAL CALCULATOR */}
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-700/80 pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-blue-600/30 text-cyan-300 font-bold text-base">💰</span>
                                <div>
                                    <h3 className="font-black text-sm text-white uppercase tracking-wide">5. Freight & Charges Calculator</h3>
                                    <p className="text-[11px] text-slate-300">Live breakdown with automatic advance deduction</p>
                                </div>
                            </div>
                            <span className="text-xs bg-cyan-500/20 text-cyan-300 font-bold px-3 py-1 rounded-full border border-cyan-500/30">
                                Real-Time Balance
                            </span>
                        </div>

                        {/* Charges Input Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Hamali / Loading</label>
                                <input type="number" name="hamail" value={charges.hamail === 0 ? '' : charges.hamail} onChange={handleChargeChange} placeholder="0" className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-cyan-400 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Door Delivery</label>
                                <input type="number" name="ddCharge" value={charges.ddCharge === 0 ? '' : charges.ddCharge} onChange={handleChargeChange} placeholder="0" className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-cyan-400 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Statistical / LR</label>
                                <input type="number" name="stCharge" value={charges.stCharge === 0 ? '' : charges.stCharge} onChange={handleChargeChange} placeholder="0" className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-cyan-400 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Toll / Green Tax</label>
                                <input type="number" name="tollTax" value={charges.tollTax === 0 ? '' : charges.tollTax} onChange={handleChargeChange} placeholder="0" className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-cyan-400 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Surcharge / Risk</label>
                                <input type="number" name="surCharge" value={charges.surCharge === 0 ? '' : charges.surCharge} onChange={handleChargeChange} placeholder="0" className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-cyan-400 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Other Charges</label>
                                <input type="number" name="otherCharge" value={charges.otherCharge === 0 ? '' : charges.otherCharge} onChange={handleChargeChange} placeholder="0" className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-cyan-400 outline-none" />
                            </div>
                        </div>

                        {/* Grand Totals Highlights Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Basic Freight (₹)</label>
                                <input
                                    type="number"
                                    name="freight"
                                    value={formData.freight === 0 ? '' : formData.freight}
                                    onChange={handleChange}
                                    placeholder="0"
                                    className="w-full bg-transparent font-black text-xl text-white outline-none"
                                />
                            </div>
                            <div className="bg-blue-900/50 p-3 rounded-xl border border-blue-700/50">
                                <label className="block text-[10px] font-bold text-cyan-300 uppercase">Grand Total Freight (₹)</label>
                                <div className="font-black text-xl text-cyan-200">
                                    ₹ {totalFreight.toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-700/50">
                                <label className="block text-[10px] font-bold text-emerald-300 uppercase">Advance Paid (₹)</label>
                                <input
                                    type="number"
                                    name="advancePaid"
                                    value={formData.advancePaid === 0 ? '' : formData.advancePaid}
                                    onChange={handleChange}
                                    placeholder="0"
                                    className="w-full bg-transparent font-black text-xl text-emerald-300 outline-none"
                                />
                            </div>
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg">
                                <label className="block text-[10px] font-black text-slate-950 uppercase">Net Balance to Pay</label>
                                <div className="font-black text-2xl text-slate-950">
                                    ₹ {netBalanceToPay.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Remarks Card */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
                        <label className={labelBase}>Shipment Instructions / Remarks</label>
                        <textarea
                            name="remark"
                            value={formData.remark}
                            onChange={handleChange}
                            placeholder="Enter any delivery instructions or remarks..."
                            className={`${inputBase} h-20`}
                        />
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPreviewModal(true)}
                            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-md transition-all"
                        >
                            Preview & Compare Layouts
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving LR...' : (existingLR ? 'Update Lorry Receipt' : 'Save & Print LR')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Desktop Sticky Live Preview Panel */}
            <div className="hidden xl:block w-5/12 sticky top-4" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-4 border border-slate-200/80 overflow-y-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
                    {/* Live Preview Controls */}
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h3 className="font-black text-slate-900 text-sm">
                                Live Bilty Preview
                            </h3>
                        </div>

                        {/* Template Switcher */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setLivePreviewTemplate('modern-gst')}
                                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${livePreviewTemplate === 'modern-gst' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <span>✨ Modern GST</span>
                                <span className="text-[9px] bg-amber-400 text-amber-950 px-1 py-0.2 rounded font-black">TOP ⭐</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLivePreviewTemplate('classic')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${livePreviewTemplate === 'classic' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📋 Classic
                            </button>
                        </div>
                    </div>

                    {/* Copy Selector & Quick Actions */}
                    <div className="flex justify-between items-center gap-2 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                        <select
                            value={livePreviewCopy}
                            onChange={(e) => setLivePreviewCopy(e.target.value)}
                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2 py-1 outline-none shadow-xs"
                        >
                            <option value="CONSIGNOR COPY">Consignor Copy</option>
                            <option value="CONSIGNEE COPY">Consignee Copy</option>
                            <option value="TRANSPORTER COPY">Transporter Copy</option>
                            <option value="DRIVER COPY">Driver Copy</option>
                        </select>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(true)}
                                className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg hover:bg-blue-700"
                            >
                                Fullscreen / PDF ↗
                            </button>
                        </div>
                    </div>

                    {/* Live Sheet Container */}
                    <div className="overflow-x-auto bg-slate-100/80 p-2 rounded-xl border border-slate-200 flex justify-center">
                        <div className="origin-top scale-[0.78] -my-14">
                            <LRContent
                                lr={formData}
                                companyDetails={companyDetails}
                                showCompanyDetails={true}
                                showAmounts={true}
                                templateStyle={livePreviewTemplate}
                                copyType={livePreviewCopy}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showPreviewModal && (
                <LRPreviewModal
                    isOpen={showPreviewModal}
                    onClose={() => setShowPreviewModal(false)}
                    lr={formData}
                    companyDetails={companyDetails}
                    isReadOnly={true}
                    initialTemplateStyle={livePreviewTemplate}
                />
            )}
        </div>
    );
};

export default LRForm;
