
import React, { useState, useEffect } from 'react';
import { CompanyDetails } from '../types';
import { CogIcon, XIcon, SpinnerIcon, GlobeIcon, UsersIcon } from './icons';
import { Language, t } from '../utils/translations';

import { toast } from 'react-hot-toast';

interface HeaderProps {
    companyDetails: CompanyDetails;
    onUpdateDetails: (details: CompanyDetails) => Promise<boolean>;
    onUploadAsset: (file: File, assetType: 'logo' | 'signature') => Promise<string | null>;
    userEmail?: string;
    onSignOut?: () => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    currentRole: 'Admin' | 'Manager';
    onRoleChange: (role: 'Admin' | 'Manager', passkey?: string) => boolean;
    onForgotPasskey?: () => void;
    settingsTrigger?: number;
    isOperator?: boolean;
    onOpenAdminPanel?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    companyDetails,
    onUpdateDetails,
    onUploadAsset,
    userEmail,
    onSignOut,
    language,
    setLanguage,
    currentRole,
    onRoleChange,
    onForgotPasskey,
    settingsTrigger,
    isOperator,
    onOpenAdminPanel
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [localDetails, setLocalDetails] = useState(companyDetails);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);
    const [passkeyInput, setPasskeyInput] = useState('');
    const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
    const [confirmAdminPasskey, setConfirmAdminPasskey] = useState('');
    const [confirmManagerPasskey, setConfirmManagerPasskey] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    // Watch for external trigger to open settings
    useEffect(() => {
        if (settingsTrigger && settingsTrigger > 0) {
            setIsSettingsOpen(true);
        }
    }, [settingsTrigger]);

    // Sync localDetails with companyDetails when modal opens or companyDetails changes
    useEffect(() => {
        setLocalDetails(companyDetails);
        setConfirmAdminPasskey('');
        setConfirmManagerPasskey('');
    }, [companyDetails, isSettingsOpen]);


    const handleSaveSettings = async () => {
        if (localDetails.rbacEnabled) {
            if (confirmAdminPasskey && localDetails.adminPasskey !== confirmAdminPasskey) {
                toast.error("Admin Passkeys do not match!");
                return;
            }
            if (confirmManagerPasskey && localDetails.managerPasskey !== confirmManagerPasskey) {
                toast.error("Manager Passkeys do not match!");
                return;
            }
        }

        setIsSaving(true);
        const toastId = toast.loading("Saving settings...");

        try {
            const success = await onUpdateDetails(localDetails);
            if (success) {
                toast.success("Settings saved successfully!", { id: toastId });
                setIsSettingsOpen(false);
                setConfirmAdminPasskey('');
                setConfirmManagerPasskey('');
            } else {
                toast.error("Failed to save settings.", { id: toastId });
            }
        } catch (error: any) {
            console.error("Save error:", error);
            const message = error?.message || "Error saving settings.";
            toast.error(message, { id: toastId, duration: 5000 });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingLogo(true);
            try {
                const url = await onUploadAsset(file, 'logo');
                if (url) {
                    // Update local state
                    const updatedDetails = { ...localDetails, logoUrl: url };
                    setLocalDetails(updatedDetails);

                    // Immediately save to database
                    const success = await onUpdateDetails(updatedDetails);
                    if (success) {
                        toast.success("Logo uploaded and saved successfully!");
                    } else {
                        toast.error("Logo uploaded but failed to save to database");
                    }
                }
            } catch (error: any) {
                console.error("Logo upload error:", error);
                toast.error(error?.message || "Failed to upload logo");
            } finally {
                setIsUploadingLogo(false);
            }
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingSignature(true);
            try {
                const url = await onUploadAsset(file, 'signature');
                if (url) {
                    // Update local state
                    const updatedDetails = { ...localDetails, signatureImageUrl: url };
                    setLocalDetails(updatedDetails);

                    // Immediately save to database
                    const success = await onUpdateDetails(updatedDetails);
                    if (success) {
                        toast.success("Signature uploaded and saved successfully!");
                    } else {
                        toast.error("Signature uploaded but failed to save to database");
                    }
                }
            } catch (error: any) {
                console.error("Signature upload error:", error);
                toast.error(error?.message || "Failed to upload signature");
            } finally {
                setIsUploadingSignature(false);
            }
        }
    };


    return (
        <header className="bg-slate-100/90 backdrop-blur-md text-slate-800 border-b border-slate-200 shadow-xs sticky top-0 z-30 transition-all">
            <div className="container mx-auto px-3 sm:px-6 py-2.5 flex flex-row justify-between items-center gap-2 sm:gap-4">
                {/* Brand Logo & Name */}
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    {companyDetails.logoUrl ? (
                        <img src={companyDetails.logoUrl} alt="Logo" className="h-8 sm:h-10 w-auto max-w-[40px] sm:max-w-[60px] object-contain rounded-xl shadow-xs" />
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white font-black flex items-center justify-center text-xs shadow-xs">
                            🚛
                        </div>
                    )}
                    <h1 className="text-sm sm:text-lg md:text-xl font-black italic tracking-tight text-slate-900 truncate font-serif">
                        {companyDetails.name || 'SSK Cargo Services Pvt'}
                    </h1>
                </div>

                {/* Right Actions & User Controls */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Role Tag */}
                    {!isOperator && companyDetails.rbacEnabled && (
                        <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-xs">
                            <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-black rounded-lg ${currentRole === 'Admin' ? 'bg-rose-500 text-white' : 'bg-slate-600 text-white'}`}>
                                {currentRole === 'Admin' ? 'Admin' : currentRole}
                            </span>
                            <button
                                onClick={() => {
                                    if (currentRole === 'Admin') {
                                        onRoleChange('Manager');
                                    } else {
                                        setIsPasskeyModalOpen(true);
                                    }
                                }}
                                className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                Switch
                            </button>
                        </div>
                    )}

                    {isOperator && (
                        <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-xs">
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-emerald-500 text-white">
                                Operator
                            </span>
                        </div>
                    )}

                    {/* Notification Bell */}
                    <button className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 shadow-xs transition-colors" title="Notifications">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>

                    {/* Language Switcher Pill */}
                    <div className="flex items-center bg-white rounded-full p-0.5 border border-slate-200 shadow-xs">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${language === 'en' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('hi')}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${language === 'hi' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            HI
                        </button>
                    </div>

                    {/* User Profile / Email */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
                        {userEmail && <span className="hidden sm:inline-block font-mono text-[11px] text-slate-600">{userEmail}</span>}
                        {onSignOut && (
                            <button
                                onClick={onSignOut}
                                className="text-slate-400 hover:text-rose-600 transition-colors"
                                title="Sign Out"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Admin / Settings Controls */}
                    {!isOperator && (
                        <div className="flex gap-1">
                            {currentRole === 'Admin' && onOpenAdminPanel && (
                                <button
                                    onClick={onOpenAdminPanel}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 shadow-xs transition-colors"
                                    title="Admin Control Center"
                                >
                                    <UsersIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setLocalDetails(companyDetails);
                                    setIsSettingsOpen(true);
                                }}
                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 shadow-xs transition-colors"
                                title="Settings"
                            >
                                <CogIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
                    <div className="bg-white text-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto font-sans">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-2xl font-bold text-ssk-blue">{t[language].settings}</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded-full hover:bg-gray-200">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Company Name</label>
                                <input type="text" value={localDetails.name} onChange={(e) => setLocalDetails({ ...localDetails, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Tagline</label>
                                <input type="text" value={localDetails.tagline} onChange={(e) => setLocalDetails({ ...localDetails, tagline: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Address</label>
                                <textarea value={localDetails.address} onChange={(e) => setLocalDetails({ ...localDetails, address: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={2}></textarea>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Email</label>
                                    <input type="email" value={localDetails.email} onChange={(e) => setLocalDetails({ ...localDetails, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Website</label>
                                    <input type="text" value={localDetails.web} onChange={(e) => setLocalDetails({ ...localDetails, web: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">PAN No.</label>
                                    <input type="text" value={localDetails.pan} onChange={(e) => setLocalDetails({ ...localDetails, pan: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">GSTN</label>
                                    <input type="text" value={localDetails.gstn} onChange={(e) => setLocalDetails({ ...localDetails, gstn: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700">SAC/HSN Code</label>
                                <input type="text" value={localDetails.sacCode || ''} onChange={(e) => setLocalDetails({ ...localDetails, sacCode: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="e.g. 9965" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Contact Numbers (comma-separated)</label>
                                <input type="text" value={localDetails.contact.join(', ')} onChange={(e) => setLocalDetails({ ...localDetails, contact: e.target.value.split(',').map(s => s.trim()) })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Jurisdiction City</label>
                                <input type="text" value={localDetails.jurisdictionCity} onChange={(e) => setLocalDetails({ ...localDetails, jurisdictionCity: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Branch Locations (comma-separated)</label>
                                <input type="text" value={localDetails.branchLocations.join(', ')} onChange={(e) => setLocalDetails({ ...localDetails, branchLocations: e.target.value.split(',').map(s => s.trim()) })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>

                            <h3 className="text-lg font-bold border-b mt-6 mb-2 text-ssk-blue">Bank Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Bank Name</label>
                                    <input type="text" value={localDetails.bankDetails.name} onChange={(e) => setLocalDetails({ ...localDetails, bankDetails: { ...localDetails.bankDetails, name: e.target.value } })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Branch</label>
                                    <input type="text" value={localDetails.bankDetails.branch} onChange={(e) => setLocalDetails({ ...localDetails, bankDetails: { ...localDetails.bankDetails, branch: e.target.value } })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Account Number</label>
                                    <input type="text" value={localDetails.bankDetails.accountNo} onChange={(e) => setLocalDetails({ ...localDetails, bankDetails: { ...localDetails.bankDetails, accountNo: e.target.value } })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">IFSC Code</label>
                                    <input type="text" value={localDetails.bankDetails.ifscCode} onChange={(e) => setLocalDetails({ ...localDetails, bankDetails: { ...localDetails.bankDetails, ifscCode: e.target.value } })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                            </div>

                            {currentRole === 'Admin' && (
                                <>
                                    <h3 className="text-lg font-bold border-b mt-6 mb-2 text-ssk-blue">Role Management (RBAC)</h3>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">Enable Role System</p>
                                                <p className="text-xs text-gray-500">Restrict Manager access to LR creation and basic data.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={localDetails.rbacEnabled || false}
                                                    onChange={(e) => setLocalDetails({ ...localDetails, rbacEnabled: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ssk-blue"></div>
                                            </label>
                                        </div>
                                        {localDetails.rbacEnabled && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700">Admin Passkey</label>
                                                        <input
                                                            type="password"
                                                            placeholder="Create Admin Passkey"
                                                            value={localDetails.adminPasskey || ''}
                                                            onChange={(e) => setLocalDetails({ ...localDetails, adminPasskey: e.target.value })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700">Confirm Admin Passkey</label>
                                                        <input
                                                            type="password"
                                                            placeholder="Confirm Admin Passkey"
                                                            value={confirmAdminPasskey}
                                                            onChange={(e) => setConfirmAdminPasskey(e.target.value)}
                                                            className={`mt-1 block w-full border rounded-md shadow-sm p-2 bg-white ${confirmAdminPasskey && localDetails.adminPasskey !== confirmAdminPasskey ? 'border-red-500' : 'border-gray-300'}`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700">Manager Passkey</label>
                                                        <input
                                                            type="password"
                                                            placeholder="Create Manager Passkey"
                                                            value={localDetails.managerPasskey || ''}
                                                            onChange={(e) => setLocalDetails({ ...localDetails, managerPasskey: e.target.value })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700">Confirm Manager Passkey</label>
                                                        <input
                                                            type="password"
                                                            placeholder="Confirm Manager Passkey"
                                                            value={confirmManagerPasskey}
                                                            onChange={(e) => setConfirmManagerPasskey(e.target.value)}
                                                            className={`mt-1 block w-full border rounded-md shadow-sm p-2 bg-white ${confirmManagerPasskey && localDetails.managerPasskey !== confirmManagerPasskey ? 'border-red-500' : 'border-gray-300'}`}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 italic">Passkeys are required for independent role access.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <h3 className="text-lg font-bold border-b mt-6 mb-2 text-ssk-blue">Assets</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center gap-4">
                                        <label className="block text-sm font-bold text-gray-700">Company Logo</label>
                                        {isUploadingLogo && <SpinnerIcon className="w-4 h-4 animate-spin text-ssk-blue" />}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-ssk-blue file:text-white" />
                                    {localDetails.logoUrl && (
                                        <img src={localDetails.logoUrl} alt="Logo" className="mt-2 h-12 w-24 object-contain border p-1 rounded bg-gray-50" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-4">
                                        <label className="block text-sm font-bold text-gray-700">Signature</label>
                                        {isUploadingSignature && <SpinnerIcon className="w-4 h-4 animate-spin text-ssk-blue" />}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} disabled={isUploadingSignature} className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-ssk-blue file:text-white" />
                                    {localDetails.signatureImageUrl && (
                                        <img src={localDetails.signatureImageUrl} alt="Signature" className="mt-2 h-12 w-24 object-contain border p-1 rounded bg-gray-50" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3 border-t pt-4">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-md" disabled={isSaving}>
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                className="bg-ssk-blue text-white px-6 py-2 rounded-md hover:bg-blue-800 font-bold shadow-md flex items-center justify-center min-w-[140px]"
                                disabled={isSaving}
                            >
                                {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Save All Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Passkey Modal */}
            {isPasskeyModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white text-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm font-sans">
                        <h3 className="text-xl font-bold mb-2 text-ssk-blue">Admin Access Required</h3>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-gray-500">Please enter the passkey.</p>
                            <button
                                onClick={() => {
                                    setIsPasskeyModalOpen(false);
                                    onForgotPasskey && onForgotPasskey();
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                            >
                                Forgot Passkey?
                            </button>
                        </div>
                        <input
                            type="password"
                            autoFocus
                            placeholder="Passkey"
                            value={passkeyInput}
                            onChange={(e) => setPasskeyInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (onRoleChange('Admin', passkeyInput)) {
                                        setIsPasskeyModalOpen(false);
                                        setPasskeyInput('');
                                    }
                                }
                            }}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-ssk-blue focus:ring-0 mb-6 text-center text-2xl tracking-widest font-mono"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setIsPasskeyModalOpen(false); setPasskeyInput(''); }}
                                className="flex-1 px-4 py-2 border rounded-lg font-semibold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (onRoleChange('Admin', passkeyInput)) {
                                        setIsPasskeyModalOpen(false);
                                        setPasskeyInput('');
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-ssk-blue text-white rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                            >
                                Unlock Admin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
