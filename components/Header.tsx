
import React, { useState, useEffect } from 'react';
import { CompanyDetails } from '../types';
import { CogIcon, XIcon, SpinnerIcon, GlobeIcon } from './icons';
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
    settingsTrigger
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
        <header className="bg-ssk-blue text-white shadow-lg sticky top-0 z-30">
            <div className="container mx-auto p-2 sm:p-4 flex flex-row justify-between items-center gap-1 sm:gap-4">
                <div className="flex items-center space-x-1.5 sm:space-x-4 flex-1 mr-1">
                    {companyDetails.logoUrl && (
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-8 sm:h-12 w-auto max-w-[48px] sm:max-w-[96px] object-contain bg-white p-0.5 sm:p-1 rounded-sm shrink-0" />
                    )}
                    <h1 className="text-[9px] min-[380px]:text-[10px] sm:text-xl md:text-2xl font-black uppercase leading-tight break-words" style={{ lineHeight: '1.2' }}>
                        {companyDetails.name}
                    </h1>
                </div>
                <div className="flex items-center gap-1 sm:gap-4 shrink-0">

                    {companyDetails.rbacEnabled && (
                        <div className="flex items-center bg-white/10 rounded-lg p-0.5 sm:p-1 border border-white/20">
                            <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-bold rounded ${currentRole === 'Admin' ? 'bg-ssk-red text-white' : 'bg-gray-500 text-white'}`}>
                                {currentRole === 'Admin' ? 'Adm' : currentRole}
                            </span>
                            <button
                                onClick={() => {
                                    if (currentRole === 'Admin') {
                                        onRoleChange('Manager');
                                    } else {
                                        setIsPasskeyModalOpen(true);
                                    }
                                }}
                                className="ml-1 sm:ml-2 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-semibold bg-white text-ssk-blue rounded hover:bg-gray-100"
                            >
                                Sw
                            </button>
                        </div>
                    )}

                    {/* Language Switcher */}
                    <div className="flex items-center bg-blue-800 rounded-full p-0.5 sm:p-1 border border-blue-600">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-ssk-blue shadow-sm' : 'text-blue-200 hover:text-white'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('hi')}
                            className={`px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${language === 'hi' ? 'bg-white text-ssk-blue shadow-sm' : 'text-blue-200 hover:text-white'}`}
                        >
                            HI
                        </button>
                    </div>

                    {userEmail && (
                        <div className="flex items-center gap-2 sm:gap-4">
                            <span className="hidden md:inline-block text-sm font-medium">{userEmail}</span>
                            <button
                                onClick={onSignOut}
                                className="bg-ssk-red text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded text-[10px] sm:text-sm font-semibold hover:bg-red-700 transition-colors whitespace-nowrap"
                            >
                                Out
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            setLocalDetails(companyDetails);
                            setIsSettingsOpen(true);
                        }}
                        className="p-1 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Open Settings"
                    >
                        <CogIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
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
