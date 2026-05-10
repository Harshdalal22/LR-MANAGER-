

import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Session, Subscription } from '@supabase/supabase-js';
import Auth from './components/Auth';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LRList from './components/LRList';
import LRForm from './components/LRForm';
import VehicleHiring from './components/VehicleHiring';
import BookingRegister from './components/BookingRegister';
import DataManagement from './components/DataManagement';
import PartyManagement from './components/PartyManagement';
import TruckManagement from './components/TruckManagement';
import InvoiceList from './components/InvoiceList';
import AdBanner from './components/AdBanner';
import PODUploadModal from './components/PODUploadModal';
import PasswordResetModal from './components/PasswordResetModal';
import RoleSelection from './components/RoleSelection';
import AdminPanel3D from './components/AdminPanel3D';
import GPSPanel from './components/GPSPanel';
import {
    LorryReceipt,
    CompanyDetails,
    SavedParty,
    SavedTruck,
    View,
    LRStatus
} from './types';
import {
    getLorryReceipts,
    saveLorryReceipt,
    deleteLorryReceipt,
    getCompanyDetails,
    saveCompanyDetails,
    subscribeToAuthState,
    signOut,
    signIn,
    getSession,
    updateLorryReceiptStatus,
    uploadPOD,
    uploadCompanyAsset,
    getPodSignedUrl,
    updateLorryReceiptInvoiceDetails,
    getSavedParties,
    saveSavedParty,
    deleteSavedParty,
    getSavedTrucks,
    saveSavedTruck,
    deleteSavedTruck,
    updateUserPassword,
    getPendingAccessRequests,
    listenForAdminAccessRequests,
    approveAccessRequest,
    rejectAccessRequest,
    checkOperatorRole
} from './services/supabaseService';
import { t, Language } from './utils/translations';

const defaultCompanyDetails: CompanyDetails = {
    name: '',
    logoUrl: '',
    signatureImageUrl: '',
    tagline: '',
    address: '',
    email: '',
    web: '',
    contact: [],
    pan: '',
    gstn: '',
    bankDetails: {
        name: '',
        branch: '',
        accountNo: '',
        ifscCode: ''
    },
    jurisdictionCity: '',
    branchLocations: []
};

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [lorryReceipts, setLorryReceipts] = useState<LorryReceipt[]>([]);
    const [savedParties, setSavedParties] = useState<SavedParty[]>([]);
    const [savedTrucks, setSavedTrucks] = useState<SavedTruck[]>([]);
    const [editingLR, setEditingLR] = useState<LorryReceipt | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(defaultCompanyDetails);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [dashboardSection, setDashboardSection] = useState<'lr' | 'data' | 'emergency' | null>(null);
    const [viewHistory, setViewHistory] = useState<View[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [uploadingPODFor, setUploadingPODFor] = useState<LorryReceipt | null>(null);
    const [language, setLanguage] = useState<Language>('en');
    const [isPasswordResetting, setIsPasswordResetting] = useState(false);
    const [currentRole, setCurrentRole] = useState<'Admin' | 'Manager' | 'Operator'>(() => {
        return (sessionStorage.getItem('currentRole') as 'Admin' | 'Manager' | 'Operator') || 'Admin';
    });
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const [roleSelectionError, setRoleSelectionError] = useState('');
    const [isVerifyPasswordModalOpen, setIsVerifyPasswordModalOpen] = useState(false);
    const [passwordForVerification, setPasswordForVerification] = useState('');
    const [headerSettingsTrigger, setHeaderSettingsTrigger] = useState(0);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [managerRequests, setManagerRequests] = useState<any[]>([]);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

    const handleError = (error: unknown, fallbackMessage: string) => {
        console.error(fallbackMessage, error);
        toast.error(`${fallbackMessage}: ${error instanceof Error ? error.message : String(error)}`);
    };


    const handleUpdateDetails = async (details: CompanyDetails) => {
        const toastId = toast.loading('Saving settings...');
        try {
            const saved = await saveCompanyDetails(details);
            setCompanyDetails(saved);
            toast.success('Settings updated successfully', { id: toastId });
            setHeaderSettingsTrigger(prev => prev + 1);
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to save settings");
        }
    };

    const handleUploadAsset = async (file: File, type: 'logo' | 'signature') => {
        const toastId = toast.loading(`Uploading ${type}...`);
        try {
            const url = await uploadCompanyAsset(file, type);
            const updated = { ...companyDetails, [type === 'logo' ? 'logoUrl' : 'signatureImageUrl']: url };
            setCompanyDetails(updated);
            await saveCompanyDetails(updated);
            toast.success(`${type === 'logo' ? 'Logo' : 'Signature'} uploaded successfully`, { id: toastId });
            setHeaderSettingsTrigger(prev => prev + 1);
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to upload asset");
        }
    };

    const handleRoleChangeRequest = (role: 'Admin' | 'Manager') => {
        if (role === 'Admin' && companyDetails.rbacEnabled) {
            const passkey = prompt("Enter Admin Passkey:");
            if (passkey) {
                handleRoleChange(role, passkey);
            }
        } else if (role === 'Manager' && companyDetails.rbacEnabled && currentRole !== 'Admin') {
            const passkey = prompt("Enter Manager Passkey:");
            if (passkey) {
                handleRoleChange(role, passkey);
            }
        } else {
            handleRoleChange(role);
        }
    };

    const navigateTo = (view: View) => {
        setViewHistory(prev => [...prev, currentView]);
        setCurrentView(view);
        if (view === 'dashboard') {
            // keep section
        }
    };

    useEffect(() => {
        // Dynamic favicon
        if (companyDetails.logoUrl) {
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            (link as HTMLLinkElement).type = 'image/x-icon';
            (link as HTMLLinkElement).rel = 'shortcut icon';
            (link as HTMLLinkElement).href = companyDetails.logoUrl;
            document.getElementsByTagName('head')[0].appendChild(link);
        }
    }, [companyDetails.logoUrl]);

    useEffect(() => {
        let authSubscription: Subscription | null = null;

        const setupAuth = async () => {
            try {
                const currentSession = await getSession();
                setSession(currentSession);

                if (currentSession) {
                    if (currentSession.user?.email !== 'gps@ssk.com') {
                        const roleInfo = await checkOperatorRole();
                        if (roleInfo && !roleInfo.isAdmin) {
                            sessionStorage.setItem('currentRole', 'Operator');
                            sessionStorage.setItem('adminId', roleInfo.adminId);
                            setCurrentRole('Operator');
                        }
                    }
                    // For existing session, we'll let fetchData (triggered by session state change)
                    // handle setting setIsLoading(false) after it finishes loading initial data.
                } else {
                    setIsLoading(false);
                }

                const { data } = subscribeToAuthState(async (event, session) => {
                    if (session) {
                        if (session.user?.email === 'gps@ssk.com') {
                            setIsLoading(false);
                        } else {
                            const roleInfo = await checkOperatorRole();
                            if (roleInfo && !roleInfo.isAdmin) {
                                sessionStorage.setItem('currentRole', 'Operator');
                                sessionStorage.setItem('adminId', roleInfo.adminId);
                                setCurrentRole('Operator');
                            } else if (roleInfo && roleInfo.isAdmin) {
                                const storedRole = sessionStorage.getItem('currentRole');
                                if (!storedRole || storedRole === 'Operator') {
                                    sessionStorage.setItem('currentRole', 'Admin');
                                    setCurrentRole('Admin');
                                }
                            }
                            setIsLoading(false);
                        }
                    }

                    setSession(session);

                    if (event === 'PASSWORD_RECOVERY') {
                        setIsPasswordResetting(true);
                    }

                    if (!session) {
                        sessionStorage.removeItem('currentRole');
                        sessionStorage.removeItem('adminId');
                        sessionStorage.removeItem('roleSelected');
                        setCurrentRole('Admin');
                        setLorryReceipts([]);
                        setSavedParties([]);
                        setSavedTrucks([]);
                        setCompanyDetails(defaultCompanyDetails);
                        setCurrentView('dashboard');
                        setDashboardSection(null);
                        setViewHistory([]);
                        setIsPasswordResetting(false);
                    }
                });
                authSubscription = data.subscription;

            } catch (error: any) {
                if (error?.message?.includes('signal is aborted') || error?.name === 'AbortError') {
                    // Ignore abort errors from rapid re-renders or overlapping auth requests
                    return;
                }
                handleError(error, "Failed to initialize authentication");
                setIsLoading(false);
            }
        };

        setupAuth();

        // Fallback: Check URL hash explicitly for recovery links in case event is missed
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            setIsPasswordResetting(true);
            // We delay clearing the hash so Supabase has time to process the token and set the session
            setTimeout(() => {
                window.history.replaceState(null, '', window.location.pathname);
            }, 2000);
        }

        return () => {
            authSubscription?.unsubscribe();
        };
    }, []);

    const fetchData = async () => {
        if (!session) {
            setIsLoading(false);
            return;
        }
        if (session.user?.email === 'gps@ssk.com') {
            setIsLoading(false);
            return;
        }
        setIsDataLoading(true);
        try {
            const [lrs, company, parties, trucks] = await Promise.all([
                getLorryReceipts(),
                getCompanyDetails(),
                getSavedParties(),
                getSavedTrucks()
            ]);
            setLorryReceipts(lrs);
            if (company) setCompanyDetails(company);
            setSavedParties(parties);
            setSavedTrucks(trucks);
        } catch (error) {
            handleError(error, "Failed to load data");
        } finally {
            setIsDataLoading(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchData();
        }
    }, [session]);

    // Show role selection after login if RBAC is enabled
    useEffect(() => {
        if (session && companyDetails.rbacEnabled && !showRoleSelection && currentRole === 'Admin') {
            // Check if we need to show role selection (only on fresh login)
            const hasSelectedRole = sessionStorage.getItem('roleSelected');
            if (!hasSelectedRole) {
                setShowRoleSelection(true);
            }
        }
    }, [session, companyDetails.rbacEnabled]);

    // Listen for Manager Access Requests
    useEffect(() => {
        if (session?.user?.email && session.user.email !== 'gps@ssk.com' && currentRole === 'Admin') {
            getPendingAccessRequests(session.user.email)
                .then(reqs => setManagerRequests(reqs))
                .catch(e => console.error("Error fetching requests:", e));

            const subscription = listenForAdminAccessRequests(session.user.email, (newReq) => {
                setManagerRequests(prev => [...prev, newReq]);
                toast(`New Manager Access Request from ${newReq.manager_name}`, { icon: '👋', duration: 6000 });
            });

            return () => { subscription.unsubscribe(); };
        } else {
            setManagerRequests([]);
        }
    }, [session?.user?.email, currentRole]);

    const handleApproveManagerRequest = async (request: any) => {
        if (!session) return;
        const toastId = toast.loading('Approving request and generating session...');
        try {
            // Give the manager our session (access and refresh token)
            const currentSession = await getSession();
            if (!currentSession) throw new Error("No active session to share.");

            await approveAccessRequest(request.id, {
                access_token: currentSession.access_token,
                refresh_token: currentSession.refresh_token
            });

            setManagerRequests(prev => prev.filter(req => req.id !== request.id));
            toast.success(`${request.manager_name} has been granted Manager access!`, { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to approve request");
        }
    };

    const handleRejectManagerRequest = async (requestId: string) => {
        try {
            await rejectAccessRequest(requestId);
            setManagerRequests(prev => prev.filter(req => req.id !== requestId));
            toast.success('Request rejected.');
        } catch (error) {
            handleError(error, "Failed to reject request");
        }
    };

    const handleSaveLR = async (lr: LorryReceipt) => {
        const toastId = toast.loading('Saving LR...');
        try {
            const savedLR = await saveLorryReceipt(lr);

            // --- Auto-Save Parties & Truck ---
            const promises = [];

            // 1. Auto-save Consignor
            if (lr.consignor.name && !savedParties.some(p => p.name.toLowerCase() === lr.consignor.name.toLowerCase() && (p.type === 'Consignor' || p.type === 'Both'))) {
                const newConsignor: SavedParty = { ...lr.consignor, type: 'Consignor' };
                promises.push(saveSavedParty(newConsignor).then(p => setSavedParties(prev => [...prev, p])));
            }

            // 2. Auto-save Consignee
            if (lr.consignee.name && !savedParties.some(p => p.name.toLowerCase() === lr.consignee.name.toLowerCase() && (p.type === 'Consignee' || p.type === 'Both'))) {
                // Check if we just added this name as Consignor (edge case: same name for both)
                const existing = savedParties.find(p => p.name.toLowerCase() === lr.consignee.name.toLowerCase());

                if (!existing) {
                    const newConsignee: SavedParty = { ...lr.consignee, type: 'Consignee' };
                    promises.push(saveSavedParty(newConsignee).then(p => setSavedParties(prev => [...prev, p])));
                } else if (existing.type === 'Consignor') {
                    // Upgrade to 'Both' if it exists as Consignor
                    const updatedParty = { ...existing, type: 'Both' as const };
                    promises.push(saveSavedParty(updatedParty).then(p => setSavedParties(prev => prev.map(x => x.id === p.id ? p : x))));
                }
            }

            // 3. Auto-save Truck
            if (lr.truckNo && !savedTrucks.some(t => t.truckNo.replace(/\s/g, '').toLowerCase() === lr.truckNo.replace(/\s/g, '').toLowerCase())) {
                const newTruck: SavedTruck = { truckNo: lr.truckNo, ownerName: '', contactNumber: '' };
                promises.push(saveSavedTruck(newTruck).then(t => setSavedTrucks(prev => [...prev, t])));
            }

            // Run side effects in background (don't block UI)
            Promise.all(promises).catch(err => console.error("Auto-save error:", err));

            setLorryReceipts(prev => {
                const index = prev.findIndex(item => item.lrNo === savedLR.lrNo);
                if (index >= 0) {
                    const newArray = [...prev];
                    newArray[index] = savedLR;
                    return newArray;
                }
                return [savedLR, ...prev];
            });
            toast.success('LR Saved Successfully', { id: toastId });
            if (currentRole === 'Operator') {
                navigateTo('dashboard');
            } else {
                navigateTo('list');
            }
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to save LR");
        }
    };

    const handleUpdateLRStatus = async (lrNo: string, status: LRStatus) => {
        try {
            await updateLorryReceiptStatus(lrNo, status);
            setLorryReceipts(prev => prev.map(lr => lr.lrNo === lrNo ? { ...lr, status, status_updated_at: new Date().toISOString() } : lr));
            toast.success(`Status updated to ${status}`);
        } catch (error) {
            handleError(error, "Failed to update status");
        }
    };

    const handleUpdateInvoiceDetails = async (lrNos: string[], invoiceNo: string, invoiceDate: string) => {
        const toastId = toast.loading('Updating Invoice details...');
        try {
            await updateLorryReceiptInvoiceDetails(lrNos, invoiceNo, invoiceDate);
            setLorryReceipts(prev => prev.map(lr => lrNos.includes(lr.lrNo) ? { ...lr, invoiceNo, invoiceDate, isInvoiceGenerated: true } : lr));
            toast.success('Invoice details updated', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to update invoice details");
        }
    };

    const handleDeleteLR = async (lrNo: string) => {
        if (!confirm("Are you sure you want to delete this LR?")) return;
        const toastId = toast.loading('Deleting LR...');
        try {
            await deleteLorryReceipt(lrNo);
            setLorryReceipts(prev => prev.filter(lr => lr.lrNo !== lrNo));
            toast.success('LR Deleted', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to delete LR");
        }
    };

    const handleUpdatePassword = async (password: string) => {
        const toastId = toast.loading('Updating password...');
        try {
            await updateUserPassword(password);
            toast.success('Password updated successfully!', { id: toastId });
            setIsPasswordResetting(false);
            navigateTo('dashboard');
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to update password");
        }
    };

    const handleSignOut = async () => {
        const toastId = toast.loading('Signing out...');
        try {
            // Optimistically clear local state for instant UI transition
            setSession(null);
            setIsPasswordResetting(false);
            sessionStorage.removeItem('roleSelected');
            sessionStorage.removeItem('currentRole');
            setCurrentRole('Admin');
            
            // Background the remote signout call
            signOut().catch(err => console.error("Sign out error:", err));
            
            toast.success('Signed out successfully.', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Sign out failed");
        }
    };

    const handleEditLR = (lrNo: string) => {
        const lr = lorryReceipts.find(l => l.lrNo === lrNo);
        if (lr) {
            setEditingLR(lr);
            setCurrentView('form');
        }
    };

    const handleRoleChange = (role: 'Admin' | 'Manager', passkey?: string) => {
        if (role === 'Admin' && companyDetails.rbacEnabled) {
            if (companyDetails.adminPasskey && passkey !== companyDetails.adminPasskey) {
                toast.error("Invalid Admin Passkey");
                return false;
            }
        }
        if (role === 'Manager' && companyDetails.rbacEnabled) {
            // If already Admin, allow switching to Manager without passkey
            if (currentRole !== 'Admin') {
                if (companyDetails.managerPasskey && passkey !== companyDetails.managerPasskey) {
                    toast.error("Invalid Manager Passkey");
                    return false;
                }
            }
        }
        setCurrentRole(role);
        sessionStorage.setItem('currentRole', role);
        toast.success(`Switched to ${role} mode`);

        // If switching to Manager while in restricted view, go to dashboard
        // 'list' is now accessible to managers, so excluded from restricted
        const restrictedViews: View[] = ['vehicle-hiring', 'booking-register', 'data-management', 'invoices'];
        if (role === 'Manager' && companyDetails.rbacEnabled && restrictedViews.includes(currentView)) {
            setCurrentView('dashboard');
        }
        return true;
    };

    const handleRoleSelection = (role: 'Admin' | 'Manager', passkey: string) => {
        // Verify passkey
        if (role === 'Admin') {
            if (!companyDetails.adminPasskey || passkey !== companyDetails.adminPasskey) {
                setRoleSelectionError('Invalid Admin passkey');
                toast.error('Invalid Admin passkey');
                return;
            }
        } else if (role === 'Manager') {
            if (!companyDetails.managerPasskey || passkey !== companyDetails.managerPasskey) {
                setRoleSelectionError('Invalid Manager passkey');
                toast.error('Invalid Manager passkey');
                return;
            }
        }

        // Set role and mark as selected
        setCurrentRole(role);
        sessionStorage.setItem('currentRole', role);
        setShowRoleSelection(false);
        setRoleSelectionError('');
        sessionStorage.setItem('roleSelected', 'true');
        toast.success(`Logged in as ${role}`);
    };

    const handleCancelRoleSelection = async () => {
        // Sign out if user cancels role selection
        await handleSignOut();
        setShowRoleSelection(false);
    };

    const handleForgotPasskeyTrigger = () => {
        setIsVerifyPasswordModalOpen(true);
    };

    const handleVerifyPassword = async () => {
        if (!session?.user?.email) return;
        setIsVerifyingPassword(true);
        const toastId = toast.loading('Verifying identity...');

        try {
            // We use signIn to verify the password. This refreshes the session but proves ownership.
            const { error } = await signIn(session.user.email, passwordForVerification);

            if (error) {
                toast.error("Incorrect password. Please try again.", { id: toastId });
                setIsVerifyingPassword(false);
                return;
            }

            // Success! Unlock Admin
            toast.success("Identity Verified! Admin access granted.", { id: toastId });
            setCurrentRole('Admin');
            sessionStorage.setItem('currentRole', 'Admin');

            // Close all blocking modals
            setIsVerifyPasswordModalOpen(false);
            setShowRoleSelection(false);
            setPasswordForVerification('');

            // Optional: Show a hint to update settings
            toast('You can view/reset your passkeys in Settings.', {
                icon: '🔑',
                duration: 6000
            });

        } catch (e) {
            handleError(e, "Verification failed");
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    const renderContent = () => {
        // RBAC Restriction logic
        const isManager = companyDetails.rbacEnabled && currentRole === 'Manager';
        const isOperator = currentRole === 'Operator';
        
        // 'list' is now accessible to managers
        const restrictedViewsManager: View[] = ['vehicle-hiring', 'booking-register', 'data-management', 'invoices'];
        // Operator can access parties/trucks (inside data-management) but NOT invoices, vouchers, or list
        const restrictedViewsOperator: View[] = ['list', 'vehicle-hiring', 'booking-register', 'invoices', 'vouchers'];

        if ((isManager && restrictedViewsManager.includes(currentView)) || (isOperator && restrictedViewsOperator.includes(currentView))) {
            return (
                <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-lg mx-auto border border-gray-100 animate-fadeIn">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 mb-8 font-medium">You do not have permission to access this module. Please switch to Admin mode if you have the passkey.</p>
                    <button
                        onClick={() => setCurrentView('dashboard')}
                        className="w-full py-4 bg-ssk-blue text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                    >
                        Back to Dashboard
                    </button>
                </div>
            );
        }

        switch (currentView) {
            case 'dashboard':
                return (
                    <Dashboard
                        lorryReceipts={lorryReceipts}
                        onAddNew={() => { setEditingLR(null); setCurrentView('form'); }}
                        onViewList={() => setCurrentView('list')}
                        onViewVouchers={() => setCurrentView('vouchers')}
                        onEditLR={handleEditLR}
                        setCurrentView={setCurrentView}
                        language={language}
                        activeSection={dashboardSection}
                        setActiveSection={setDashboardSection}
                        currentRole={currentRole}
                        rbacEnabled={companyDetails.rbacEnabled}
                        managerRequests={managerRequests}
                        onApproveManagerRequest={handleApproveManagerRequest}
                        onRejectManagerRequest={handleRejectManagerRequest}
                    />
                );
            case 'list':
                return (
                    <LRList
                        lorryReceipts={lorryReceipts}
                        onEdit={handleEditLR}
                        onDelete={handleDeleteLR}
                        onAddNew={() => { setEditingLR(null); setCurrentView('form'); }}
                        companyDetails={companyDetails}
                        onBackToDashboard={() => setCurrentView('dashboard')}
                        onUpdateStatus={handleUpdateLRStatus}
                        onOpenPODUploader={(lr) => setUploadingPODFor(lr)}
                        onViewPOD={async (path) => {
                            try {
                                const url = await getPodSignedUrl(path);
                                window.open(url, '_blank');
                            } catch (e) { toast.error("Could not load POD"); }
                        }}
                        onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
                        language={language}
                        isReadOnly={isManager}
                        initialViewMode="lrs"
                        savedParties={savedParties}
                    />
                );
            case 'vouchers':
                return (
                    <LRList
                        lorryReceipts={lorryReceipts}
                        onEdit={handleEditLR}
                        onDelete={handleDeleteLR}
                        onAddNew={() => { setEditingLR(null); setCurrentView('form'); }}
                        companyDetails={companyDetails}
                        onBackToDashboard={() => setCurrentView('dashboard')}
                        onUpdateStatus={handleUpdateLRStatus}
                        onOpenPODUploader={(lr) => setUploadingPODFor(lr)}
                        onViewPOD={async (path) => {
                            try {
                                const url = await getPodSignedUrl(path);
                                window.open(url, '_blank');
                            } catch (e) { toast.error("Could not load POD"); }
                        }}
                        onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
                        language={language}
                        isReadOnly={isManager}
                        initialViewMode="vouchers"
                        savedParties={savedParties}
                    />
                );
            case 'form':
                return (
                    <LRForm
                        onSave={handleSaveLR}
                        existingLR={editingLR}
                        onCancel={() => { setEditingLR(null); setCurrentView('dashboard'); }}
                        companyDetails={companyDetails}
                        lorryReceipts={lorryReceipts}
                        savedParties={savedParties}
                        savedTrucks={savedTrucks}
                        language={language}
                    />
                );
            case 'vehicle-hiring':
                return <VehicleHiring onBack={() => setCurrentView('dashboard')} />;
            case 'booking-register':
                return <DataManagement onBack={() => setCurrentView('dashboard')} currentRole={currentRole} initialTab="register-entries" />;
            case 'data-management':
                return <DataManagement onBack={() => setCurrentView('dashboard')} currentRole={currentRole} />;
            case 'parties':
                return (
                    <PartyManagement
                        savedParties={savedParties}
                        onSave={async (p) => {
                            await saveSavedParty(p);
                            setSavedParties(await getSavedParties());
                            toast.success("Party saved");
                        }}
                        onDelete={async (id) => {
                            await deleteSavedParty(id);
                            setSavedParties(prev => prev.filter(x => x.id !== id));
                        }}
                        onBack={() => setCurrentView('dashboard')}
                    />
                );
            case 'trucks':
                return (
                    <TruckManagement
                        savedTrucks={savedTrucks}
                        onSave={async (t) => {
                            await saveSavedTruck(t);
                            setSavedTrucks(await getSavedTrucks());
                            toast.success("Truck saved");
                        }}
                        onDelete={async (id) => {
                            await deleteSavedTruck(id);
                            setSavedTrucks(prev => prev.filter(x => x.id !== id));
                        }}
                        onBack={() => setCurrentView('dashboard')}
                    />
                );
            case 'invoices':
                return (
                    <InvoiceList
                        lorryReceipts={lorryReceipts}
                        companyDetails={companyDetails}
                        onBack={() => setCurrentView('dashboard')}
                        onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
                    />
                );
            default:
                return <div>View Not Found</div>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <p className="text-lg font-semibold text-gray-700">Loading Bilty Book...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="bg-slate-50 min-h-screen">
                <Toaster position="top-center" />
                <Auth />
            </div>
        );
    }


    if (session?.user?.email === 'gps@ssk.com') {
        return (
            <div className="bg-slate-50 min-h-screen font-sans">
                <Toaster position="top-center" />
                <GPSPanel companyDetails={companyDetails} onSignOut={handleSignOut} />
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <Toaster position="top-center" />
            <Header
                companyDetails={companyDetails}
                onUpdateDetails={handleUpdateDetails}
                onUploadAsset={handleUploadAsset}
                userEmail={session?.user?.email}
                onSignOut={handleSignOut}
                language={language}
                setLanguage={setLanguage}
                currentRole={currentRole}
                onRoleChange={handleRoleChangeRequest}
                onForgotPasskey={handleForgotPasskeyTrigger}
                settingsTrigger={headerSettingsTrigger}
                isOperator={currentRole === 'Operator'}
                onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
            />
            <main className="container mx-auto p-4 md:p-6">
                {renderContent()}
                <AdBanner />
            </main>
            {uploadingPODFor && (
                <PODUploadModal
                    isOpen={!!uploadingPODFor}
                    onClose={() => setUploadingPODFor(null)}
                    lr={uploadingPODFor}
                    onUpload={async (lr, file) => {
                        try {
                            const updated = await uploadPOD(file, lr.lrNo);
                            setLorryReceipts(prev => prev.map(r => r.lrNo === updated.lrNo ? updated : r));
                            setUploadingPODFor(null);
                            toast.success('POD uploaded successfully');
                        } catch (e) {
                            handleError(e, "Failed to upload POD");
                        }
                    }}
                />
            )}
            {isPasswordResetting && (
                <PasswordResetModal
                    isOpen={isPasswordResetting}
                    onSubmit={handleUpdatePassword}
                    onCancel={() => setIsPasswordResetting(false)}
                />
            )}
            {showRoleSelection && (
                <RoleSelection
                    onRoleSelect={handleRoleSelection}
                    onCancel={handleCancelRoleSelection}
                    onForgotPasskey={handleForgotPasskeyTrigger}
                />
            )}
            {isVerifyPasswordModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white text-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm font-sans animate-fadeIn">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🔒</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-800">Verify Identity</h3>
                            <p className="text-sm text-gray-500">
                                To reset your Admin Passkey, please enter your main account password.
                            </p>
                        </div>

                        <input
                            type="password"
                            autoFocus
                            placeholder="Account Password"
                            value={passwordForVerification}
                            onChange={(e) => setPasswordForVerification(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 mb-6 text-center text-lg"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsVerifyPasswordModalOpen(false);
                                    setPasswordForVerification('');
                                }}
                                className="flex-1 px-4 py-2 border rounded-lg font-semibold hover:bg-gray-50 text-gray-600"
                                disabled={isVerifyingPassword}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerifyPassword}
                                disabled={!passwordForVerification || isVerifyingPassword}
                                className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg transition-transform ${isVerifyingPassword ? 'opacity-75 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                {isVerifyingPassword ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {isAdminPanelOpen && (
                <div className="fixed inset-0 z-50 overflow-auto bg-gray-900">
                    <AdminPanel3D onClose={() => setIsAdminPanelOpen(false)} currentRole={currentRole} />
                </div>
            )}
        </div>
    );
};

export default App;