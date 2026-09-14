import React, { useState, useEffect } from 'react';
import { CompanyDetails } from '../types';
import { XIcon, SpinnerIcon, UploadIcon } from './icons';
import { Language } from '../utils/translations';
import { toast } from 'react-hot-toast';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyDetails: CompanyDetails;
    onUpdateDetails: (details: CompanyDetails) => Promise<boolean>;
    onUploadAsset: (file: File, assetType: 'logo' | 'signature') => Promise<string | null>;
    language?: Language;
    currentRole?: 'Admin' | 'Manager' | 'Operator';
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    companyDetails,
    onUpdateDetails,
    onUploadAsset,
    language = 'en',
    currentRole = 'Admin'
}) => {
    const isHi = language === 'hi';
    const [localDetails, setLocalDetails] = useState<CompanyDetails>(companyDetails);
    const [activeTab, setActiveTab] = useState<'general' | 'tax_bank' | 'assets' | 'security'>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);
    const [showAdminKey, setShowAdminKey] = useState(false);
    const [showManagerKey, setShowManagerKey] = useState(false);

    useEffect(() => {
        setLocalDetails(companyDetails);
    }, [companyDetails, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const success = await onUpdateDetails(localDetails);
            if (success) {
                toast.success(isHi ? 'सेटिंग्स सफलतापूर्वक अपडेट की गईं!' : 'Web App Settings updated successfully!');
                onClose();
            }
        } catch (error) {
            toast.error(isHi ? 'सेटिंग्स सहेजने में विफल' : 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingLogo(true);
        try {
            const url = await onUploadAsset(file, 'logo');
            if (url) {
                setLocalDetails(prev => ({ ...prev, logoUrl: url }));
                toast.success(isHi ? 'लोगो सफलतापूर्वक अपलोड हुआ!' : 'Logo uploaded successfully!');
            }
        } catch (error) {
            toast.error(isHi ? 'लोगो अपलोड विफल' : 'Failed to upload logo');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingSignature(true);
        try {
            const url = await onUploadAsset(file, 'signature');
            if (url) {
                setLocalDetails(prev => ({ ...prev, signatureImageUrl: url }));
                toast.success(isHi ? 'हस्ताक्षर सफलतापूर्वक अपलोड हुआ!' : 'Signature uploaded successfully!');
            }
        } catch (error) {
            toast.error(isHi ? 'हस्ताक्षर अपलोड विफल' : 'Failed to upload signature');
        } finally {
            setIsUploadingSignature(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-fadeIn select-none font-sans">
            <div 
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Modal Header ── */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">
                                {isHi ? 'वेब ऐप और कंपनी सेटिंग्स' : 'Web App & Company Settings'}
                            </h2>
                            <p className="text-xs text-slate-400 font-medium">
                                {isHi ? 'कंपनी प्रोफ़ाइल, लोगो, बैंक विवरण और पासकीज प्रबंधित करें' : 'Manage Company Details, Brand Assets, Bank & Security'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Navigation Tabs ── */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto shrink-0">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'general'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        🏢 {isHi ? 'सामान्य विवरण' : 'Company Info'}
                    </button>
                    <button
                        onClick={() => setActiveTab('tax_bank')}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'tax_bank'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        🏦 {isHi ? 'टैक्स और बैंक' : 'Tax & Bank'}
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'assets'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        🖼️ {isHi ? 'लोगो और हस्ताक्षर' : 'Brand Assets'}
                    </button>
                    {currentRole === 'Admin' && (
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'security'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            🔐 {isHi ? 'सुरक्षा और पासकी' : 'Security & RBAC'}
                        </button>
                    )}
                </div>

                {/* ── Modal Content Body (Scrollable) ── */}
                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                    
                    {/* TAB 1: General Company Info */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    {isHi ? 'कंपनी का नाम' : 'Company Name'} *
                                </label>
                                <input
                                    type="text"
                                    value={localDetails.name || ''}
                                    onChange={(e) => setLocalDetails({ ...localDetails, name: e.target.value })}
                                    placeholder="e.g. BiltyBook Logistics Pvt Ltd"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    {isHi ? 'टैगलाइन / स्लोगन' : 'Tagline / Slogan'}
                                </label>
                                <input
                                    type="text"
                                    value={localDetails.tagline || ''}
                                    onChange={(e) => setLocalDetails({ ...localDetails, tagline: e.target.value })}
                                    placeholder="e.g. Reliable Transport Solutions Across India"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    {isHi ? 'मुख्य पता (Head Office Address)' : 'Head Office Address'}
                                </label>
                                <textarea
                                    value={localDetails.address || ''}
                                    onChange={(e) => setLocalDetails({ ...localDetails, address: e.target.value })}
                                    rows={2}
                                    placeholder="Full office address for Bilty / Invoice header"
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        {isHi ? 'ईमेल आईडी' : 'Official Email'}
                                    </label>
                                    <input
                                        type="email"
                                        value={localDetails.email || ''}
                                        onChange={(e) => setLocalDetails({ ...localDetails, email: e.target.value })}
                                        placeholder="support@transport.com"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        {isHi ? 'वेबसाइट' : 'Website'}
                                    </label>
                                    <input
                                        type="text"
                                        value={localDetails.web || ''}
                                        onChange={(e) => setLocalDetails({ ...localDetails, web: e.target.value })}
                                        placeholder="www.biltybook.online"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        {isHi ? 'हेल्पलाइन / संपर्क नंबर' : 'Contact Numbers (comma separated)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={localDetails.contact?.join(', ') || ''}
                                        onChange={(e) => setLocalDetails({ ...localDetails, contact: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                        placeholder="9876543210, 9123456780"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        {isHi ? 'न्यायाधिकार शहर (Jurisdiction)' : 'Jurisdiction City'}
                                    </label>
                                    <input
                                        type="text"
                                        value={localDetails.jurisdictionCity || ''}
                                        onChange={(e) => setLocalDetails({ ...localDetails, jurisdictionCity: e.target.value })}
                                        placeholder="Subject to Delhi Jurisdiction"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    {isHi ? 'शाखाएं / ब्रांच स्थान' : 'Branch Locations (comma separated)'}
                                </label>
                                <input
                                    type="text"
                                    value={localDetails.branchLocations?.join(', ') || ''}
                                    onChange={(e) => setLocalDetails({ ...localDetails, branchLocations: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    placeholder="Delhi, Mumbai, Ahmedabad, Jaipur, Kolkata"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Tax & Bank Details */}
                    {activeTab === 'tax_bank' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                                <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 mb-3">
                                    {isHi ? 'टैक्स पहचान विवरण' : 'Tax & Regulatory Identifiers'}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">PAN No.</label>
                                        <input
                                            type="text"
                                            value={localDetails.pan || ''}
                                            onChange={(e) => setLocalDetails({ ...localDetails, pan: e.target.value.toUpperCase() })}
                                            placeholder="ABCDE1234F"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold uppercase focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN</label>
                                        <input
                                            type="text"
                                            value={localDetails.gstn || ''}
                                            onChange={(e) => setLocalDetails({ ...localDetails, gstn: e.target.value.toUpperCase() })}
                                            placeholder="07AAAAA0000A1Z5"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold uppercase focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">SAC/HSN Code</label>
                                        <input
                                            type="text"
                                            value={localDetails.sacCode || ''}
                                            onChange={(e) => setLocalDetails({ ...localDetails, sacCode: e.target.value })}
                                            placeholder="9965 (Goods Transport)"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center justify-between">
                                    <span>{isHi ? 'बैंक खाता विवरण (चालान व इनवॉइस के लिए)' : 'Bank Account Details (For Invoices)'}</span>
                                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">Live on Invoices</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            {isHi ? 'बैंक का नाम' : 'Bank Name'}
                                        </label>
                                        <input
                                            type="text"
                                            value={localDetails.bankDetails?.name || ''}
                                            onChange={(e) => setLocalDetails({
                                                ...localDetails,
                                                bankDetails: { ...localDetails.bankDetails, name: e.target.value }
                                            })}
                                            placeholder="e.g. HDFC Bank Ltd"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            {isHi ? 'शाखा (Branch)' : 'Branch'}
                                        </label>
                                        <input
                                            type="text"
                                            value={localDetails.bankDetails?.branch || ''}
                                            onChange={(e) => setLocalDetails({
                                                ...localDetails,
                                                bankDetails: { ...localDetails.bankDetails, branch: e.target.value }
                                            })}
                                            placeholder="Connaught Place, New Delhi"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            {isHi ? 'खाता संख्या (Account No.)' : 'Account Number'}
                                        </label>
                                        <input
                                            type="text"
                                            value={localDetails.bankDetails?.accountNo || ''}
                                            onChange={(e) => setLocalDetails({
                                                ...localDetails,
                                                bankDetails: { ...localDetails.bankDetails, accountNo: e.target.value }
                                            })}
                                            placeholder="50200012345678"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            {isHi ? 'आईएफएससी कोड (IFSC Code)' : 'IFSC Code'}
                                        </label>
                                        <input
                                            type="text"
                                            value={localDetails.bankDetails?.ifscCode || ''}
                                            onChange={(e) => setLocalDetails({
                                                ...localDetails,
                                                bankDetails: { ...localDetails.bankDetails, ifscCode: e.target.value.toUpperCase() }
                                            })}
                                            placeholder="HDFC0001234"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Brand Assets & Terms */}
                    {activeTab === 'assets' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Logo Upload Card */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center flex flex-col justify-between">
                                    <div>
                                        <div className="text-xs font-black uppercase text-slate-700 mb-2">
                                            {isHi ? 'कंपनी लोगो (Header & Print)' : 'Company Logo'}
                                        </div>
                                        <div className="w-24 h-24 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                                            {localDetails.logoUrl ? (
                                                <img src={localDetails.logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain p-2" />
                                            ) : (
                                                <span className="text-xs text-slate-400 font-bold">No Logo</span>
                                            )}
                                        </div>
                                    </div>
                                    <label className="w-full py-2 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors cursor-pointer">
                                        {isUploadingLogo ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
                                        <span>{isUploadingLogo ? 'Uploading...' : (localDetails.logoUrl ? 'Change Logo' : 'Upload Logo')}</span>
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                    </label>
                                </div>

                                {/* Signature Upload Card */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center flex flex-col justify-between">
                                    <div>
                                        <div className="text-xs font-black uppercase text-slate-700 mb-2">
                                            {isHi ? 'अधिकृत हस्ताक्षर (Authorized Sign)' : 'Authorized Signature'}
                                        </div>
                                        <div className="w-32 h-24 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                                            {localDetails.signatureImageUrl ? (
                                                <img src={localDetails.signatureImageUrl} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
                                            ) : (
                                                <span className="text-xs text-slate-400 font-bold">No Signature</span>
                                            )}
                                        </div>
                                    </div>
                                    <label className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors cursor-pointer">
                                        {isUploadingSignature ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
                                        <span>{isUploadingSignature ? 'Uploading...' : (localDetails.signatureImageUrl ? 'Change Signature' : 'Upload Signature')}</span>
                                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            {/* Terms & Conditions */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    {isHi ? 'बिल्टी नियम व शर्तें (LR Terms & Conditions)' : 'Terms & Conditions (Printed on LRs)'}
                                </label>
                                <textarea
                                    value={localDetails.termsAndConditions || ''}
                                    onChange={(e) => setLocalDetails({ ...localDetails, termsAndConditions: e.target.value })}
                                    rows={4}
                                    placeholder="Enter company terms and conditions for goods transit..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs leading-relaxed focus:outline-none focus:border-blue-600 font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Security & Passkeys */}
                    {activeTab === 'security' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-900">
                                            {isHi ? 'भूमिका प्रणाली सक्षम करें (RBAC)' : 'Enable Role-Based Access Control (RBAC)'}
                                        </h4>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            {isHi ? 'मैनेजर और ऑपरेटर की पहुंच को सुरक्षित पासकी के साथ सीमित करें' : 'Restrict manager & operator access to specific modules'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={localDetails.rbacEnabled || false}
                                            onChange={(e) => setLocalDetails({ ...localDetails, rbacEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                    <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
                                        Admin Passkey 🔑
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showAdminKey ? 'text' : 'password'}
                                            value={localDetails.adminPasskey || ''}
                                            onChange={(e) => setLocalDetails({ ...localDetails, adminPasskey: e.target.value })}
                                            placeholder="Enter Admin Passkey"
                                            className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAdminKey(!showAdminKey)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                        >
                                            {showAdminKey ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Required to access Admin features and reset locks.</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                    <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
                                        Manager Passkey 🛡️
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showManagerKey ? 'text' : 'password'}
                                            value={localDetails.managerPasskey || ''}
                                            onChange={(e) => setLocalDetails({ ...localDetails, managerPasskey: e.target.value })}
                                            placeholder="Enter Manager Passkey"
                                            className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowManagerKey(!showManagerKey)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                        >
                                            {showManagerKey ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Required for manager role access.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Modal Action Footer ── */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        {isHi ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        {isSaving && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                        <span>{isSaving ? (isHi ? 'सहेज रहे हैं...' : 'Saving...') : (isHi ? 'सेटिंग्स सहेजें' : 'Save Settings')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
