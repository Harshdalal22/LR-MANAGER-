
import React, { useState } from 'react';
import { CompanyDetails } from '../types';
import { CogIcon, XIcon, SpinnerIcon } from './icons';

interface HeaderProps {
    companyDetails: CompanyDetails;
    onUpdateDetails: (details: CompanyDetails) => Promise<boolean>;
    onUploadAsset: (file: File, assetType: 'logo' | 'signature') => Promise<string | null>;
    userEmail?: string;
    onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ companyDetails, onUpdateDetails, onUploadAsset, userEmail, onSignOut }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [localDetails, setLocalDetails] = useState(companyDetails);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);


    const handleSaveSettings = async () => {
        const success = await onUpdateDetails(localDetails);
        if (success) {
            setIsSettingsOpen(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingLogo(true);
            const url = await onUploadAsset(file, 'logo');
            if(url) {
                setLocalDetails(prev => ({ ...prev, logoUrl: url }));
            }
            setIsUploadingLogo(false);
        }
    };
    
    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingSignature(true);
            const url = await onUploadAsset(file, 'signature');
            if (url) {
                setLocalDetails(prev => ({ ...prev, signatureImageUrl: url }));
            }
            setIsUploadingSignature(false);
        }
    };


    return (
        <header className="bg-ssk-blue text-white shadow-lg sticky top-0 z-30">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-4">
                    {companyDetails.logoUrl && (
                        <img src={companyDetails.logoUrl} alt="Company Logo" className="h-10 sm:h-12 w-20 sm:w-24 object-contain bg-white p-1 rounded-sm"/>
                    )}
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">{companyDetails.name}</h1>
                </div>
                <div className="flex items-center gap-4">
                    {userEmail && (
                        <div className="hidden sm:flex items-center gap-4">
                            <span className="text-sm font-medium">{userEmail}</span>
                            <button 
                                onClick={onSignOut}
                                className="bg-ssk-red text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-red-700 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            setLocalDetails(companyDetails);
                            setIsSettingsOpen(true);
                        }}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Open Settings"
                    >
                        <CogIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
                    <div className="bg-white text-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Admin Controls</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded-full hover:bg-gray-200">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                <input type="text" value={localDetails.name} onChange={(e) => setLocalDetails({...localDetails, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Tagline</label>
                                <input type="text" value={localDetails.tagline} onChange={(e) => setLocalDetails({...localDetails, tagline: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea value={localDetails.address} onChange={(e) => setLocalDetails({...localDetails, address: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={2}></textarea>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input type="email" value={localDetails.email} onChange={(e) => setLocalDetails({...localDetails, email: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Website</label>
                                    <input type="text" value={localDetails.web} onChange={(e) => setLocalDetails({...localDetails, web: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                             </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">PAN No.</label>
                                    <input type="text" value={localDetails.pan} onChange={(e) => setLocalDetails({...localDetails, pan: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">GSTN</label>
                                    <input type="text" value={localDetails.gstn} onChange={(e) => setLocalDetails({...localDetails, gstn: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">SAC/HSN Code</label>
                                <input type="text" value={localDetails.sacCode || ''} onChange={(e) => setLocalDetails({...localDetails, sacCode: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="e.g. 9965" />
                            </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Contact Numbers (comma-separated)</label>
                                <input type="text" value={localDetails.contact.join(', ')} onChange={(e) => setLocalDetails({...localDetails, contact: e.target.value.split(',').map(s => s.trim())})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Jurisdiction City</label>
                                <input type="text" value={localDetails.jurisdictionCity} onChange={(e) => setLocalDetails({...localDetails, jurisdictionCity: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Branch Locations (comma-separated)</label>
                                <input type="text" value={localDetails.branchLocations.join(', ')} onChange={(e) => setLocalDetails({...localDetails, branchLocations: e.target.value.split(',').map(s => s.trim())})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>

                            <h3 className="text-lg font-semibold border-b mt-4 mb-2">Bank Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                                    <input type="text" value={localDetails.bankDetails.name} onChange={(e) => setLocalDetails({...localDetails, bankDetails: {...localDetails.bankDetails, name: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Branch</label>
                                    <input type="text" value={localDetails.bankDetails.branch} onChange={(e) => setLocalDetails({...localDetails, bankDetails: {...localDetails.bankDetails, branch: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                    <input type="text" value={localDetails.bankDetails.accountNo} onChange={(e) => setLocalDetails({...localDetails, bankDetails: {...localDetails.bankDetails, accountNo: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                                    <input type="text" value={localDetails.bankDetails.ifscCode} onChange={(e) => setLocalDetails({...localDetails, bankDetails: {...localDetails.bankDetails, ifscCode: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold border-b mt-4 mb-2">Assets</h3>
                            <div className="flex items-center gap-4">
                                <label className="block text-sm font-medium text-gray-700">Upload Logo</label>
                                {isUploadingLogo && <SpinnerIcon className="w-5 h-5 animate-spin text-ssk-blue" />}
                            </div>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-ssk-blue file:text-white hover:file:bg-ssk-blue/90 disabled:file:bg-gray-400" />
                            
                            {localDetails.logoUrl && (
                                <div>
                                    <span className="block text-sm font-medium text-gray-700 mt-2">Logo Preview</span>
                                    <img src={localDetails.logoUrl} alt="Logo Preview" className="mt-2 h-16 w-32 object-contain border p-1 rounded-md bg-gray-100" />
                                </div>
                            )}
                             <div className="flex items-center gap-4 mt-4">
                                <label className="block text-sm font-medium text-gray-700">Upload Signature</label>
                                {isUploadingSignature && <SpinnerIcon className="w-5 h-5 animate-spin text-ssk-blue" />}
                            </div>
                            <input type="file" accept="image/*" onChange={handleSignatureUpload} disabled={isUploadingSignature} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-ssk-blue file:text-white hover:file:bg-ssk-blue/90 disabled:file:bg-gray-400" />
                            
                            {localDetails.signatureImageUrl && (
                                <div>
                                    <span className="block text-sm font-medium text-gray-700 mt-2">Signature Preview</span>
                                    <img src={localDetails.signatureImageUrl} alt="Signature Preview" className="mt-2 h-16 w-auto object-contain border p-1 rounded-md bg-gray-100" />
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                             <button onClick={handleSaveSettings} className="bg-ssk-blue text-white px-4 py-2 rounded-md hover:bg-ssk-blue/90 font-semibold">
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
