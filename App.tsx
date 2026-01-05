

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
    updateUserPassword
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
    const [uploadingPODFor, setUploadingPODFor] = useState<LorryReceipt | null>(null);
    const [language, setLanguage] = useState<Language>('en');
    const [isPasswordResetting, setIsPasswordResetting] = useState(false);

    const handleError = (error: unknown, fallbackMessage: string) => {
        console.error(fallbackMessage, error);
        let message = fallbackMessage;
        
        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'object' && error !== null) {
            const anyError = error as any;
            const extractedMessage = anyError.message || anyError.error_description || anyError.statusText;
            
            if (extractedMessage) {
                message = extractedMessage;
                if (anyError.details) message += ` (${anyError.details})`;
                if (anyError.hint) message += ` Hint: ${anyError.hint}`;

                // Add specific hint for 403 RLS errors
                if (String(anyError.status) === '403' || message.toLowerCase().includes('rls')) {
                    message = "Permission Denied. Please run the complete 'Fix SQL Script' from the Data Management section to apply security policies.";
                }

            } else {
                try {
                    message = `${fallbackMessage}: ${JSON.stringify(anyError)}`;
                } catch {
                    message = `${fallbackMessage}: Unknown error object`;
                }
            }
        } else if (typeof error === 'string') {
            message = error;
        }
        
        toast.error(message, { duration: 8000 });
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
                
                if (!currentSession) {
                    setIsLoading(false);
                }

                const { data } = subscribeToAuthState((event, session) => {
                    setSession(session);
                    
                    if (event === 'PASSWORD_RECOVERY') {
                        setIsPasswordResetting(true);
                    }

                    if (!session) {
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
                
            } catch (error) {
                handleError(error, "Failed to initialize authentication");
                setIsLoading(false);
            }
        };

        setupAuth();

        return () => {
            authSubscription?.unsubscribe();
        };
    }, []);

    const fetchData = async () => {
        if (!session) return;
        setIsLoading(true);
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
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchData();
        }
    }, [session]);

    const handleSaveLR = async (lr: LorryReceipt) => {
        const toastId = toast.loading('Saving LR...');
        try {
            const savedLR = await saveLorryReceipt(lr);
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
            navigateTo('list');
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
            await signOut();
            setSession(null);
            setIsPasswordResetting(false);
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

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <Dashboard 
                        lorryReceipts={lorryReceipts}
                        onAddNew={() => { setEditingLR(null); setCurrentView('form'); }}
                        onViewList={() => setCurrentView('list')}
                        onEditLR={handleEditLR}
                        setCurrentView={setCurrentView}
                        language={language}
                        activeSection={dashboardSection}
                        setActiveSection={setDashboardSection}
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
                           } catch(e) { toast.error("Could not load POD"); }
                        }}
                        onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
                        language={language}
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
                return <BookingRegister onBack={() => setCurrentView('dashboard')} />;
            case 'data-management':
                return <DataManagement onBack={() => setCurrentView('dashboard')} />;
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


    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <Toaster position="top-center" />
            <Header 
                companyDetails={companyDetails} 
                onUpdateDetails={async (d) => { const s = await saveCompanyDetails(d); setCompanyDetails(s); return true; }}
                onUploadAsset={uploadCompanyAsset}
                userEmail={session.user.email}
                onSignOut={handleSignOut}
                language={language}
                setLanguage={setLanguage}
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
        </div>
    );
};

export default App;