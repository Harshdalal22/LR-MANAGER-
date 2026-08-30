import React, { useState, useEffect } from 'react';
import { LorryReceipt, Item, PartyDetails, DetailedCharges, CompanyDetails, SavedParty, SavedTruck } from '../types';
import LRPreviewModal, { LRContent } from './LRPreviewModal';
import { PlusIcon, TrashIcon, CreateIcon, ListIcon, SparklesIcon, ArrowLeftIcon } from './icons';
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
    items: [{ description: 'High Precision Engine Gaskets & Auto Parts', pcs: 140, weight: 4250, chargedWeight: 4500, packingDetails: 'Boxes', rate: 7.5, unit: 'Kg', hsn: '87082900' }],
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
    vehicleType: '32 Ft MXL',
    advancePaid: 0,
    freightBasis: 'TO PAY',
    insuranceCompany: '',
    insurancePolicyNo: '',
    transitRisk: "Owner's Risk (Consignor Insured)",
    hsnCode: '87082900',
    templateStyle: 'modern-gst',
    copyType: 'CONSIGNOR COPY'
};

const Fieldset: React.FC<{ legend: string; children: React.ReactNode; className?: string }> = ({ legend, children, className = '' }) => (
    <fieldset className="border border-gray-300 p-4 rounded-xl mb-6 shadow-lg bg-white/50 backdrop-blur-sm">
        <legend className="px-2 font-bold text-base text-ssk-blue">{legend}</legend>
        <div className={className}>
            {children}
        </div>
    </fieldset>
);

const LRForm: React.FC<LRFormProps> = ({ onSave, existingLR, onCancel, companyDetails, lorryReceipts, savedParties = [], savedTrucks = [], language }) => {
    const [formData, setFormData] = useState<LorryReceipt>(initialLRState);
    const [billingPartyType, setBillingPartyType] = useState<'Consignor' | 'Consignee' | 'Other'>('Consignor');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [livePreviewTemplate, setLivePreviewTemplate] = useState<'modern-gst' | 'classic'>('modern-gst');
    const [livePreviewCopy, setLivePreviewCopy] = useState<string>('CONSIGNOR COPY');

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
                    setFormData(initialLRState);
                    setBillingPartyType('Consignor');
                }
            } else {
                let nextLrNo = '';
                if (lorryReceipts && lorryReceipts.length > 0) {
                    nextLrNo = getNextSequence(lorryReceipts[0].lrNo);
                }
                setFormData({ ...initialLRState, lrNo: nextLrNo });
                setBillingPartyType('Consignor');
            }
        }
    }, [existingLR, lorryReceipts]);

    // Auto-save draft to local storage whenever formData or billingPartyType changes
    useEffect(() => {
        if (!existingLR) {
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

    useEffect(() => {
        const totalWeight = formData.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
        setFormData(prev => ({ ...prev, weight: totalWeight }));
    }, [formData.items]);

    useEffect(() => {
        // Calculate freight automatically if not Fixed
        if (formData.rateOn !== 'Fixed') {
            const weightForCalc = Number(formData.chargedWeight) > 0 ? Number(formData.chargedWeight) : (Number(formData.actualWeightMT) > 0 ? Number(formData.actualWeightMT) * 1000 : Number(formData.weight) || 0);
            if (formData.rateOn === 'Ton') {
                const tons = Number(formData.actualWeightMT) > 0 ? Number(formData.actualWeightMT) : (weightForCalc / 1000);
                const calculatedFreight = tons * (Number(formData.rate) || 0);
                if (calculatedFreight > 0) {
                    setFormData(prev => ({ ...prev, freight: Math.round(calculatedFreight) }));
                }
            } else if (formData.rateOn === 'Kg') {
                const calculatedFreight = weightForCalc * (Number(formData.rate) || 0);
                if (calculatedFreight > 0) {
                    setFormData(prev => ({ ...prev, freight: Math.round(calculatedFreight) }));
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
            items: [...prev.items, { description: '', pcs: 0, weight: 0, packingDetails: 'Boxes', hsn: prev.hsnCode || '996511' }]
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
            toast.error('Please fill all required fields marked with *.');
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

    const handleCreateNew = () => {
        if (window.confirm('Are you sure you want to discard current changes and create a new LR?')) {
            localStorage.removeItem('lr_draft_data');
            localStorage.removeItem('lr_draft_billing');

            let nextLrNo = '';
            if (lorryReceipts && lorryReceipts.length > 0) {
                nextLrNo = getNextSequence(lorryReceipts[0].lrNo);
            }
            setFormData({ ...initialLRState, lrNo: nextLrNo });
            setBillingPartyType('Consignor');
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
        toast.success('Loaded Speedway / Apex Sample GST LR!');
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

    const renderPartySection = (title: string, partyKey: 'consignor' | 'consignee' | 'billingTo') => {
        const isDisabled = partyKey === 'billingTo' && billingPartyType !== 'Other';
        const disabledClass = isDisabled ? 'bg-gray-100 cursor-not-allowed' : 'text-gray-900 placeholder-gray-500';
        const relevantParties = savedParties;

        return (
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <h3 className="bg-ssk-red text-white p-2 font-bold text-sm uppercase">{title}</h3>
                <div className="p-2 space-y-1.5 bg-white">
                    <input
                        list={`list-${partyKey}`}
                        name="name"
                        value={formData[partyKey].name}
                        onChange={(e) => handlePartyChange(partyKey, e)}
                        placeholder="NAME *"
                        className={`w-full text-xs p-1.5 border rounded-md ${disabledClass}`}
                        disabled={isDisabled}
                        autoComplete="off"
                        required={partyKey !== 'billingTo'}
                    />
                    <datalist id={`list-${partyKey}`}>
                        {relevantParties.map(p => (
                            <option key={p.id || p.name} value={p.name} />
                        ))}
                    </datalist>

                    <textarea
                        name="address"
                        value={formData[partyKey].address}
                        onChange={(e) => handlePartyChange(partyKey, e)}
                        placeholder="ADDRESS"
                        className={`w-full text-xs p-1.5 border rounded-md ${disabledClass}`}
                        rows={2}
                        disabled={isDisabled}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            name="city"
                            value={formData[partyKey].city}
                            onChange={(e) => handlePartyChange(partyKey, e)}
                            placeholder="CITY"
                            className={`w-full text-xs p-1.5 border rounded-md ${disabledClass}`}
                            disabled={isDisabled}
                        />
                        <input
                            type="text"
                            name="contact"
                            value={formData[partyKey].contact}
                            onChange={(e) => handlePartyChange(partyKey, e)}
                            placeholder="CONTACT / PHONE"
                            className={`w-full text-xs p-1.5 border rounded-md ${disabledClass}`}
                            disabled={isDisabled}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            name="gst"
                            value={formData[partyKey].gst}
                            onChange={(e) => handlePartyChange(partyKey, e)}
                            placeholder="GSTIN"
                            className={`w-full text-xs p-1.5 border rounded-md uppercase font-mono ${disabledClass}`}
                            disabled={isDisabled}
                        />
                        <input
                            type="text"
                            name="pan"
                            value={formData[partyKey].pan}
                            onChange={(e) => handlePartyChange(partyKey, e)}
                            placeholder="PAN NO"
                            className={`w-full text-xs p-1.5 border rounded-md uppercase font-mono ${disabledClass}`}
                            disabled={isDisabled}
                        />
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

    const inputClass = "w-full p-2 border border-gray-300 bg-white rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-ssk-blue focus:border-transparent transition-all duration-200";
    const labelClass = "block text-xs font-bold text-gray-600 uppercase mb-1";

    return (
        <div className="flex flex-col xl:flex-row gap-8 items-start">
            {/* Form Section */}
            <div className="w-full xl:w-3/5">
                <div className="flex items-center gap-4 mb-6 border-b pb-4 justify-between flex-wrap">
                    <div className="flex items-center gap-3">
                        <button onClick={onCancel} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-all group" title="Back">
                            <ArrowLeftIcon className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800">
                                {existingLR ? 'Edit Lorry Receipt / Bilty' : 'Create GST Bilty (Lorry Receipt)'}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Generate compliant Consignment Notes</p>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                        {/* 1-Click Speedway Sample Generator */}
                        <button
                            type="button"
                            onClick={handleLoadSampleLR}
                            className="flex items-center bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-md font-bold hover:from-amber-600 hover:to-orange-600 transition-all text-xs sm:text-sm shadow-md"
                            title="Instantly fills the form with Speedway Logistics / Apex Automotive sample data"
                        >
                            <span className="mr-1">⚡</span>
                            Load Sample LR
                        </button>
                        <button onClick={onCancel} className="flex items-center bg-white text-gray-700 px-3 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors text-xs sm:text-sm shadow-sm border">
                            <ListIcon className="w-4 h-4 mr-1.5" />
                            {t[language].viewList}
                        </button>
                        <button onClick={handleCreateNew} className="flex items-center bg-white text-gray-700 px-3 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors text-xs sm:text-sm shadow-sm border">
                            <CreateIcon className="w-4 h-4 mr-1.5" />
                            {t[language].createLR}
                        </button>
                        <button
                            onClick={handleAiAutofill}
                            disabled={isAiLoading || !formData.truckNo || !formData.fromPlace || !formData.toPlace}
                            className="flex items-center bg-purple-600 text-white px-3 py-2 rounded-md font-semibold hover:bg-purple-700 transition-colors text-xs sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                        >
                            <SparklesIcon className="w-4 h-4 mr-1.5" />
                            {isAiLoading ? 'Thinking...' : t[language].aiAutofill}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* 1. Core Route & LR Details */}
                    <Fieldset legend={t[language].coreDetails} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
                        <div>
                            <label className={labelClass}>{t[language].lrType}*</label>
                            <div className="flex items-center space-x-3 h-10">
                                <label className="flex items-center text-xs font-semibold cursor-pointer">
                                    <input type="radio" name="lrType" value="Original" checked={formData.lrType === 'Original'} onChange={handleChange} className="h-4 w-4 text-ssk-blue focus:ring-ssk-blue" />
                                    <span className="ml-1 text-slate-800">Original</span>
                                </label>
                                <label className="flex items-center text-xs font-semibold cursor-pointer">
                                    <input type="radio" name="lrType" value="Dummy" checked={formData.lrType === 'Dummy'} onChange={handleChange} className="h-4 w-4 text-ssk-blue focus:ring-ssk-blue" />
                                    <span className="ml-1 text-slate-800">Dummy</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>{t[language].truckNo}*</label>
                            <input
                                list="trucks-list"
                                type="text"
                                name="truckNo"
                                placeholder="HR-12-AU-2864"
                                value={formData.truckNo}
                                onChange={handleChange}
                                className={`${inputClass} font-bold font-mono uppercase`}
                                required
                                autoComplete="off"
                            />
                            <datalist id="trucks-list">
                                {savedTrucks.map(t => <option key={t.id || t.truckNo} value={t.truckNo} />)}
                            </datalist>
                        </div>

                        <div>
                            <label className={labelClass}>Vehicle Type / Dim</label>
                            <input
                                type="text"
                                name="vehicleType"
                                placeholder="32 Ft MXL / Open"
                                value={formData.vehicleType || ''}
                                onChange={handleChange}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>{t[language].cNoteNo}*</label>
                            <input
                                type="text"
                                name="lrNo"
                                placeholder="SWL-2026-0892"
                                value={formData.lrNo}
                                onChange={handleChange}
                                className={`${inputClass} font-black font-mono text-blue-700`}
                                required
                                disabled={!!existingLR}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>{t[language].date}*</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} required />
                        </div>

                        <div>
                            <label className={labelClass}>Freight Basis</label>
                            <select
                                name="freightBasis"
                                value={formData.freightBasis || 'TO PAY'}
                                onChange={handleChange}
                                className={`${inputClass} font-bold`}
                            >
                                <option value="TO PAY">TO PAY (Consignee)</option>
                                <option value="PAID">PAID (Consignor)</option>
                                <option value="TO BE BILLED">TO BE BILLED (TBB)</option>
                            </select>
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClass}>{t[language].fromPlace} (Source/Origin)*</label>
                            <input type="text" name="fromPlace" placeholder="GURGAON (HR)" value={formData.fromPlace} onChange={handleChange} className={`${inputClass} font-bold uppercase`} required />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClass}>{t[language].toPlace} (Destination)*</label>
                            <input type="text" name="toPlace" placeholder="MUMBAI (MH)" value={formData.toPlace} onChange={handleChange} className={`${inputClass} font-bold uppercase`} required />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClass}>Driver Name</label>
                            <input type="text" name="driverName" placeholder="Rajesh Kumar" value={formData.driverName || ''} onChange={handleChange} className={inputClass} />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClass}>Driver Contact / Mobile</label>
                            <input type="text" name="driverContact" placeholder="9876543210" value={formData.driverContact || ''} onChange={handleChange} className={inputClass} />
                        </div>
                    </Fieldset>

                    {/* 2. Shipment & Statutory Details */}
                    <Fieldset legend={t[language].shipmentDetails} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                        <div><label className={labelClass}>{t[language].invoice}</label><input type="text" name="invoiceNo" placeholder="AAC/26-27/0419" value={formData.invoiceNo} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>{t[language].invoiceAmount}</label><input type="number" name="invoiceAmount" placeholder="1485000" value={formData.invoiceAmount || ''} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>{t[language].invoiceDate}</label><input type="date" name="invoiceDate" value={formData.invoiceDate || ''} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>HSN / SAC Code</label><input type="text" name="hsnCode" placeholder="87082900" value={formData.hsnCode || ''} onChange={handleChange} className={inputClass} /></div>

                        <div><label className={labelClass}>{t[language].ewayBillNo}</label><input type="text" name="ewayBillNo" placeholder="5819 2840 1928" value={formData.ewayBillNo} onChange={handleChange} className={`${inputClass} font-mono`} /></div>
                        <div><label className={labelClass}>{t[language].ewayBillDate}</label><input type="date" name="ewayBillDate" value={formData.ewayBillDate || ''} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>E-Way Valid Upto</label><input type="date" name="ewayExDate" value={formData.ewayExDate || ''} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>{t[language].poNo}</label><input type="text" name="poNo" placeholder="PO-PUN-9821" value={formData.poNo} onChange={handleChange} className={inputClass} /></div>

                        <div className="md:col-span-2"><label className={labelClass}>Insurance Policy No / Insurer</label><input type="text" name="insurancePolicyNo" placeholder="ICICI-LOMB-77210940 • ICICI Lombard" value={formData.insurancePolicyNo || ''} onChange={handleChange} className={inputClass} /></div>
                        <div className="md:col-span-2"><label className={labelClass}>{t[language].addressOfDelivery}</label><input type="text" name="addressOfDelivery" placeholder="Gate 3, MIDC Chakan, Pune" value={formData.addressOfDelivery} onChange={handleChange} className={inputClass} /></div>
                    </Fieldset>

                    {/* 3. Billing Selection */}
                    <Fieldset legend={t[language].billingDetails} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>{t[language].billingParty}</label>
                            <div className="flex items-center space-x-4 mt-2">
                                <label className="flex items-center text-xs font-semibold cursor-pointer">
                                    <input id="bill_consignor" type="radio" name="billingPartyType" value="Consignor" checked={billingPartyType === 'Consignor'} onChange={() => setBillingPartyType('Consignor')} className="h-4 w-4 text-ssk-blue focus:ring-ssk-blue" />
                                    <span className="ml-1.5">{t[language].consignor}</span>
                                </label>
                                <label className="flex items-center text-xs font-semibold cursor-pointer">
                                    <input id="bill_consignee" type="radio" name="billingPartyType" value="Consignee" checked={billingPartyType === 'Consignee'} onChange={() => setBillingPartyType('Consignee')} className="h-4 w-4 text-ssk-blue focus:ring-ssk-blue" />
                                    <span className="ml-1.5">{t[language].consignee}</span>
                                </label>
                                <label className="flex items-center text-xs font-semibold cursor-pointer">
                                    <input id="bill_other" type="radio" name="billingPartyType" value="Other" checked={billingPartyType === 'Other'} onChange={() => setBillingPartyType('Other')} className="h-4 w-4 text-ssk-blue focus:ring-ssk-blue" />
                                    <span className="ml-1.5">{t[language].other}</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>{t[language].gstPaidBy}</label>
                            <select name="gstPaidBy" value={formData.gstPaidBy} onChange={handleChange} className={inputClass}>
                                <option value="Consignor">{t[language].consignor} (RCM)</option>
                                <option value="Consignee">{t[language].consignee} (RCM)</option>
                                <option value="Transporter">{t[language].transporter} (Forward Charge)</option>
                            </select>
                        </div>
                    </Fieldset>

                    {/* 4. Parties Grid */}
                    <Fieldset legend={t[language].partyDetails} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {renderPartySection(t[language].consignor, 'consignor')}
                        {renderPartySection(t[language].consignee, 'consignee')}
                        {billingPartyType === 'Other' && renderPartySection(t[language].billingParty, 'billingTo')}
                    </Fieldset>

                    {/* 5. Goods / Items Details */}
                    <div className="border border-gray-300 p-3 rounded-xl shadow-lg bg-white/50 backdrop-blur-sm mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-base text-gray-800">{t[language].itemDetails}</h3>
                            <button type="button" onClick={addItem} className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm border border-blue-200">
                                <PlusIcon className="w-4 h-4 mr-1" />
                                {t[language].addRow}
                            </button>
                        </div>
                        <div className="grid grid-cols-12 gap-2 bg-slate-100 p-2 rounded-t-md font-bold text-slate-700 text-left text-xs">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-4">{t[language].description} & Packing</div>
                            <div className="col-span-2">Pkgs / Units</div>
                            <div className="col-span-2">Actual Wt (Kg)</div>
                            <div className="col-span-2">Charged Wt (Kg)</div>
                            <div className="col-span-1"></div>
                        </div>
                        <div className="border-l border-r border-b border-gray-200 rounded-b-md bg-white divide-y divide-gray-100">
                            {formData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2">
                                    <div className="col-span-1 text-center font-bold text-gray-500">{index + 1}</div>
                                    <div className="col-span-4 space-y-1">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="w-full p-1.5 border rounded-md text-xs font-bold uppercase"
                                            placeholder="Description of Goods"
                                        />
                                        <div className="grid grid-cols-2 gap-1">
                                            <input
                                                type="text"
                                                value={item.packingDetails || ''}
                                                onChange={(e) => handleItemChange(index, 'packingDetails', e.target.value)}
                                                className="w-full p-1 border rounded-md text-[11px]"
                                                placeholder="Packing (e.g. Boxes, Drums)"
                                            />
                                            <input
                                                type="text"
                                                value={item.hsn || ''}
                                                onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                                className="w-full p-1 border rounded-md text-[11px] font-mono"
                                                placeholder="HSN Code"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={item.pcs || ''}
                                            onChange={(e) => handleItemChange(index, 'pcs', parseInt(e.target.value) || 0)}
                                            className="w-full p-1.5 border rounded-md text-xs font-bold text-center"
                                            placeholder="140"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={item.weight || ''}
                                            onChange={(e) => handleItemChange(index, 'weight', parseFloat(e.target.value) || 0)}
                                            className="w-full p-1.5 border rounded-md text-xs font-bold text-right"
                                            placeholder="4250"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={item.chargedWeight || ''}
                                            onChange={(e) => handleItemChange(index, 'chargedWeight', parseFloat(e.target.value) || 0)}
                                            className="w-full p-1.5 border rounded-md text-xs font-bold text-right"
                                            placeholder="4500"
                                        />
                                    </div>
                                    <div className="col-span-1 text-right">
                                        {formData.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(index)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 6. Weight & Rate Section */}
                    <Fieldset legend={t[language].weightRate} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className={labelClass}>{t[language].totalPkgsWeight} (Kg)</label>
                            <input type="number" name="weight" value={formData.weight} readOnly placeholder="Auto-calculated" className={`${inputClass} bg-gray-100 cursor-not-allowed font-bold`} />
                        </div>
                        <div>
                            <label className={labelClass}>Charged Weight (Kg)</label>
                            <input type="number" name="chargedWeight" placeholder="4500" value={formData.chargedWeight || ''} onChange={handleChange} className={`${inputClass} font-bold`} />
                        </div>
                        <div>
                            <label className={labelClass}>{t[language].rate}</label>
                            <input type="number" step="0.01" name="rate" value={formData.rate || ''} onChange={handleChange} placeholder="7.50" className={`${inputClass} font-bold text-blue-700`} />
                        </div>
                        <div>
                            <label className={labelClass}>{t[language].calcBasis}</label>
                            <select name="rateOn" value={formData.rateOn} onChange={handleChange} className={`${inputClass} font-semibold`}>
                                <option value="Kg">Per Kg</option>
                                <option value="Ton">Per Ton (MT)</option>
                                <option value="Fixed">Fixed Amount (Manual)</option>
                            </select>
                        </div>
                    </Fieldset>

                    {/* 7. Charges Breakdown */}
                    <Fieldset legend={t[language].chargesBreakdown} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <div><label className={labelClass}>Loading / Hamali</label><input type="number" name="hamail" value={formData.charges.hamail || ''} onChange={handleChargeChange} placeholder="0" className={inputClass} /></div>
                        <div><label className={labelClass}>Door Delivery</label><input type="number" name="ddCharge" value={formData.charges.ddCharge || ''} onChange={handleChargeChange} placeholder="0" className={inputClass} /></div>
                        <div><label className={labelClass}>Statistical / LR</label><input type="number" name="stCharge" value={formData.charges.stCharge || ''} onChange={handleChargeChange} placeholder="0" className={inputClass} /></div>
                        <div><label className={labelClass}>Toll / Green Tax</label><input type="number" name="tollTax" value={formData.charges.tollTax || ''} onChange={handleChargeChange} placeholder="0" className={inputClass} /></div>
                        <div><label className={labelClass}>Surcharge / Risk</label><input type="number" name="surCharge" value={formData.charges.surCharge || ''} onChange={handleChargeChange} placeholder="0" className={inputClass} /></div>
                        <div><label className={labelClass}>Other Charges</label><input type="number" name="otherCharge" value={formData.charges.otherCharge || ''} onChange={handleChargeChange} placeholder="0" className={inputClass} /></div>
                    </Fieldset>

                    {/* 8. Totals & Advance Breakdown */}
                    <Fieldset legend={t[language].totals} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className={labelClass}>{t[language].freight}</label>
                            <input
                                type="number"
                                name="freight"
                                value={formData.freight || ''}
                                onChange={handleChange}
                                placeholder="51350"
                                className={`${inputClass} font-bold text-slate-800`}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{t[language].grandTotal}</label>
                            <input type="number" value={totalFreight} readOnly className={`${inputClass} bg-blue-50 border-blue-300 font-extrabold text-blue-900 cursor-not-allowed`} />
                        </div>
                        <div>
                            <label className={labelClass}>Advance Paid (₹)</label>
                            <input
                                type="number"
                                name="advancePaid"
                                value={formData.advancePaid || ''}
                                onChange={handleChange}
                                placeholder="15000"
                                className={`${inputClass} font-bold text-emerald-700 border-emerald-300`}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Net Balance To Pay</label>
                            <input
                                type="number"
                                value={netBalanceToPay}
                                readOnly
                                className={`${inputClass} bg-emerald-50 border-emerald-400 font-black text-emerald-950 text-base cursor-not-allowed`}
                            />
                        </div>
                    </Fieldset>

                    {/* Remarks */}
                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl shadow-lg border mb-6">
                        <label className={labelClass}>{t[language].remark}</label>
                        <textarea name="remark" value={formData.remark} onChange={handleChange} placeholder="Enter any shipment instructions or remarks..." className={`${inputClass} h-20`}></textarea>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex flex-col sm:flex-row sm:justify-center gap-4 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold text-base shadow-lg transition-all transform ${isSaving ? 'opacity-70 cursor-not-allowed scale-95' : 'hover:scale-105'}`}
                        >
                            {isSaving ? 'Saving LR...' : (existingLR ? t[language].updateLR : t[language].saveLR)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPreviewModal(true)}
                            className="w-full sm:w-auto bg-slate-800 text-white px-8 py-3 rounded-xl hover:bg-slate-900 font-bold text-base shadow-lg transition-transform transform hover:scale-105"
                        >
                            {t[language].preview} & Compare
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full sm:w-auto bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 font-bold text-base shadow-lg transition-transform transform hover:scale-105"
                        >
                            {t[language].cancel}
                        </button>
                    </div>
                </form>
            </div>

            {/* Live Preview Section (Desktop) */}
            <div className="hidden xl:block w-2/5 sticky top-24" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-slate-200 overflow-y-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
                    {/* Live Preview Controls */}
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                            <h3 className="font-extrabold text-slate-800 text-sm">
                                Live Bilty Preview
                            </h3>
                        </div>

                        {/* Template Switcher with Recommendation */}
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

                    {/* Recommendation Hint */}
                    <div className="bg-blue-50/80 border border-blue-200 rounded-lg px-2.5 py-1.5 mb-2 text-[10px] text-blue-900 flex justify-between items-center">
                        <span>
                            💡 <strong>Modern GST</strong> is recommended for GST RCM compliance, vehicle/driver details, and WhatsApp sharing.
                        </span>
                    </div>

                    <div className="overflow-x-auto bg-slate-100 p-2 rounded-xl border border-slate-200">
                        <div className="origin-top scale-[0.82] -my-10">
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
