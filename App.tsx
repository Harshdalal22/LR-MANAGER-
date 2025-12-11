
import React, { useState, useCallback, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { LorryReceipt, CompanyDetails, LRStatus, View, SavedParty, SavedTruck } from './types';
import LRForm from './components/LRForm';
import LRList from './components/LRList';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import PODUploadModal from './components/PODUploadModal';
import VehicleHiring from './components/VehicleHiring';
import BookingRegister from './components/BookingRegister';
import DataManagement from './components/DataManagement';
import PartyManagement from './components/PartyManagement';
import TruckManagement from './components/TruckManagement';
import AdBanner from './components/AdBanner';
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
    deletePOD, 
    updateLorryReceiptInvoiceDetails,
    getSavedParties,
    saveSavedParty,
    deleteSavedParty,
    getSavedTrucks,
    saveSavedTruck,
    deleteSavedTruck
} from './services/supabaseService';
import { Session, Subscription } from '@supabase/supabase-js';


const defaultCompanyDetails: CompanyDetails = {
    name: 'Your Company Name',
    logoUrl: '',
    signatureImageUrl: '',
    tagline: '',
    address: '',
    email: '',
    web: '',
    contact: [],
    pan: '',
    gstn: '',
    sacCode: '',
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
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingPODFor, setUploadingPODFor] = useState<LorryReceipt | null>(null);

    // Centralized error handler for consistent user feedback
    const handleError = (error: unknown, context: string) => {
        let errorMessage = 'An unknown error occurred.';

        // Robust error parsing
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
            const errObj = error as any;
            // Explicitly check for string properties to avoid [object Object]
            if (typeof errObj.message === 'string') {
                errorMessage = errObj.message;
            } else if (typeof errObj.error_description === 'string') {
                errorMessage = errObj.error_description;
            } else if (typeof errObj.details === 'string') {
                errorMessage = errObj.details;
            } else {
                try {
                    errorMessage = JSON.stringify(error);
                } catch {
                    errorMessage = 'Non-serializable error object';
                }
            }
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        console.error(`${context}:`, error);

        // Standardize case for checking
        const lowerMsg = errorMessage.toLowerCase();

        if (lowerMsg.includes('failed to fetch')) {
            toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold">Connection Failed</p>
                        <p>Could not connect to the database. Check your internet or Supabase status.</p>
                        <button onClick={() => toast.dismiss(t.id)} className="bg-white text-black px-2 py-1 rounded text-xs border">Dismiss</button>
                    </div>
                ),
                { duration: Infinity, id: 'fetch-error' }
            );
        } else if (
            errorMessage.includes("Could not find the 'branchLocations' column") || 
            errorMessage.includes("Could not find the 'jurisdictionCity' column") ||
            errorMessage.includes("Could not find the 'contactNumber' column") ||
            errorMessage.includes("Could not find the 'ownerName' column") ||
            errorMessage.includes("Could not find the 'truckNo' column") ||
            errorMessage.includes("Could not find the 'sacCode' column") ||
            errorMessage.includes('has no field "updated_at"')
        ) {
             toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-red-600">Database Update Required</p>
                        <p className="text-sm">The database schema is outdated. Please run the SQL migration.</p>
                         <button onClick={() => { toast.dismiss(t.id); window.location.reload(); }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Reload</button>
                    </div>
                ), { duration: Infinity, id: 'schema-error' }
            );
        } else if (lowerMsg.includes('relation "lorry_receipts" does not exist') || lowerMsg.includes('relation "company_details" does not exist')) {
            toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-red-600">Critical: Tables Missing</p>
                        <p className="text-sm">The core tables are missing. Please run the setup SQL.</p>
                         <button onClick={() => toast.dismiss(t.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Dismiss</button>
                    </div>
                ), { duration: Infinity, id: 'core-tables-missing' }
            );
        } else if (lowerMsg.includes('relation "saved_parties" does not exist') || lowerMsg.includes('relation "public.saved_parties" does not exist')) {
            toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-blue-600">Setup Required</p>
                        <p className="text-sm">The 'saved_parties' table is missing. Please run the SQL to create it.</p>
                        <button onClick={() => toast.dismiss(t.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm w-fit">Dismiss</button>
                    </div>
                ), { duration: 10000, id: 'party-table-missing' }
            );
        } else if (lowerMsg.includes('relation "saved_trucks" does not exist') || lowerMsg.includes('relation "public.saved_trucks" does not exist')) {
            toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-blue-600">Setup Required</p>
                        <p className="text-sm">The 'saved_trucks' table is missing. Please run the SQL to create it.</p>
                        <button onClick={() => toast.dismiss(t.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm w-fit">Dismiss</button>
                    </div>
                ), { duration: 10000, id: 'truck-table-missing' }
            );
        } else {
            // Fallback: Display the stringified message to ensure [object Object] isn't shown
            toast.error(`${context}: ${errorMessage}`, { duration: 8000 });
        }
    };


    useEffect(() => {
        let authSubscription: Subscription | null = null;

        const setupAuth = async () => {
            try {
                const currentSession = await getSession();
                setSession(currentSession);
                
                if (!currentSession) {
                    setIsLoading(false);
                }

                const { data } = subscribeToAuthState((_event, session) => {
                    setSession(session);
                    if (!session) {
                        setLorryReceipts([]);
                        setSavedParties([]);
                        setSavedTrucks([]);
                        setCompanyDetails(defaultCompanyDetails);
                        setCurrentView('dashboard');
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

    const fetchData = useCallback(async () => {
        if (!session) return;
        setIsLoading(true);
        try {
            // 1. Fetch Core Data (Lorry Receipts & Company Details)
            const [lrs, details] = await Promise.all([
                getLorryReceipts(),
                getCompanyDetails(defaultCompanyDetails),
            ]);
            setLorryReceipts(lrs);
            setCompanyDetails(details);

            // 2. Fetch Optional Data (Parties & Trucks)
            // We use Promise.allSettled so one failure doesn't break the whole app
            const [partiesResult, trucksResult] = await Promise.allSettled([
                getSavedParties(),
                getSavedTrucks()
            ]);

            if (partiesResult.status === 'fulfilled') {
                setSavedParties(partiesResult.value);
            } else {
                console.warn("Could not load parties (feature might be disabled or tables missing).");
            }

            if (trucksResult.status === 'fulfilled') {
                setSavedTrucks(trucksResult.value);
            } else {
                console.warn("Could not load trucks (feature might be disabled or tables missing).");
            }

        } catch (error) {
            handleError(error, "Failed to load initial data");
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            fetchData();
        }
    }, [session, fetchData]);


    const handleSaveLR = async (lr: LorryReceipt) => {
        const toastId = toast.loading(editingLR ? 'Updating LR...' : 'Saving LR...');
        
        const sanitizedLR = {
            ...lr,
            invoiceDate: lr.invoiceDate || null,
            poDate: lr.poDate || null,
            ewayBillDate: lr.ewayBillDate || null,
            ewayExDate: lr.ewayExDate || null,
            status: editingLR ? lr.status : 'Booked',
            invoiceAmount: Number(lr.invoiceAmount) || 0,
            chargedWeight: Number(lr.chargedWeight) || 0,
            weight: Number(lr.weight) || 0,
            actualWeightMT: Number(lr.actualWeightMT) || 0,
            freight: Number(lr.freight) || 0,
            rate: Number(lr.rate) || 0,
            charges: Object.entries(lr.charges).reduce((acc, [key, value]) => {
                acc[key as keyof typeof lr.charges] = Number(value) || 0;
                return acc;
            }, {} as typeof lr.charges),
            items: lr.items.map(item => ({
                ...item,
                pcs: Number(item.pcs) || 0,
                weight: Number(item.weight) || 0,
            })),
        };

        try {
            const savedLr = await saveLorryReceipt(sanitizedLR);
            if (editingLR) {
                setLorryReceipts(lorryReceipts.map(r => r.lrNo === savedLr.lrNo ? savedLr : r));
                toast.success('LR updated successfully!', { id: toastId });
            } else {
                setLorryReceipts([savedLr, ...lorryReceipts]);
                toast.success('LR generated successfully!', { id: toastId });
            }
            setEditingLR(null);
            setCurrentView('list');
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to save LR");
        }
    };
    
    // --- Party Management Handlers ---
    const handleSaveParty = async (party: SavedParty) => {
        const toastId = toast.loading('Saving party...');
        try {
            const saved = await saveSavedParty(party);
            setSavedParties(prev => {
                const exists = prev.find(p => p.id === saved.id);
                if (exists) return prev.map(p => p.id === saved.id ? saved : p);
                return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
            });
            toast.success('Party saved successfully!', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to save party");
        }
    };

    const handleDeleteParty = async (id: string) => {
        const toastId = toast.loading('Deleting party...');
        try {
            await deleteSavedParty(id);
            setSavedParties(prev => prev.filter(p => p.id !== id));
            toast.success('Party deleted successfully!', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to delete party");
        }
    };

    // --- Truck Management Handlers ---
    const handleSaveTruck = async (truck: SavedTruck) => {
        const toastId = toast.loading('Saving truck...');
        try {
            const saved = await saveSavedTruck(truck);
            setSavedTrucks(prev => {
                 const exists = prev.find(t => t.id === saved.id);
                if (exists) return prev.map(t => t.id === saved.id ? saved : t);
                return [...prev, saved].sort((a, b) => a.truckNo.localeCompare(b.truckNo));
            });
            toast.success('Truck saved successfully!', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to save truck");
        }
    };

    const handleDeleteTruck = async (id: string) => {
        const toastId = toast.loading('Deleting truck...');
        try {
            await deleteSavedTruck(id);
            setSavedTrucks(prev => prev.filter(t => t.id !== id));
            toast.success('Truck deleted successfully!', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to delete truck");
        }
    };


    const handleUpdateLRStatus = async (lrNo: string, status: LRStatus) => {
        const originalLRs = [...lorryReceipts];
        const updatedLRs = lorryReceipts.map(lr => 
            lr.lrNo === lrNo ? { ...lr, status } : lr
        );
        setLorryReceipts(updatedLRs);

        const toastId = toast.loading(`Updating status to ${status}...`);
        try {
            const updatedLR = await updateLorryReceiptStatus(lrNo, status);
            setLorryReceipts(lrs => lrs.map(lr => lr.lrNo === lrNo ? updatedLR : lr));
            toast.success('Status updated successfully!', { id: toastId });
        } catch (error) {
            setLorryReceipts(originalLRs);
            toast.dismiss(toastId);
            handleError(error, "Failed to update status");
        }
    };

    const handleUpdateInvoiceDetails = async (lrNos: string[], invoiceNo: string, invoiceDate: string) => {
        const toastId = toast.loading('Updating LRs with Invoice Details...');
        try {
            await updateLorryReceiptInvoiceDetails(lrNos, invoiceNo, invoiceDate);
            setLorryReceipts(prev => prev.map(lr => 
                lrNos.includes(lr.lrNo) 
                    ? { ...lr, invoiceNo, invoiceDate } 
                    : lr
            ));
            toast.success('Invoice details saved to LRs!', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to update Invoice Details");
        }
    };
    
    const handleUploadPOD = async (lr: LorryReceipt, file: File) => {
        const toastId = toast.loading('Uploading POD...');
        try {
            const updatedLR = await uploadPOD(file, lr.lrNo);
            setLorryReceipts(lorryReceipts.map(r => r.lrNo === updatedLR.lrNo ? updatedLR : r));
            toast.success('POD uploaded successfully!', { id: toastId });
            setUploadingPODFor(null);
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to upload POD");
        }
    };
    
    const handleViewPOD = async (podPath: string) => {
        const toastId = toast.loading('Generating secure link...');
        try {
            const signedUrl = await getPodSignedUrl(podPath);
            window.open(signedUrl, '_blank');
            toast.dismiss(toastId);
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to view POD");
        }
    };

    const handleUploadCompanyAsset = async (file: File, assetType: 'logo' | 'signature'): Promise<string | null> => {
        const toastId = toast.loading(`Uploading ${assetType}...`);
        try {
            const url = await uploadCompanyAsset(file, assetType);
            toast.success(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} uploaded successfully!`, { id: toastId });
            return url;
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, `Failed to upload ${assetType}`);
            return null;
        }
    };


    const handleAddNew = () => {
        setEditingLR(null);
        setCurrentView('form');
    };

    const handleViewList = () => {
        setCurrentView('list');
    }

    const handleBackToDashboard = () => {
        setCurrentView('dashboard');
    }

    const handleEditLR = (lrNo: string) => {
        const lrToEdit = lorryReceipts.find(lr => lr.lrNo === lrNo);
        if (lrToEdit) {
            setEditingLR(lrToEdit);
            setCurrentView('form');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDeleteLR = async (lrNo: string) => {
        const lrToDelete = lorryReceipts.find(lr => lr.lrNo === lrNo);
        if (!lrToDelete) return;

        if (window.confirm('Are you sure you want to delete this LR? This action cannot be undone.')) {
            const toastId = toast.loading('Deleting LR...');
            try {
                if (lrToDelete.pod_path) {
                    await deletePOD(lrToDelete.pod_path);
                }
                await deleteLorryReceipt(lrNo);
                setLorryReceipts(lorryReceipts.filter(lr => lr.lrNo !== lrNo));
                toast.success('LR deleted successfully!', { id: toastId });
            } catch (error) {
                toast.dismiss(toastId);
                handleError(error, "Failed to delete LR");
            }
        }
    };

    const handleCancelForm = () => {
        setEditingLR(null);
        setCurrentView('list');
    };
    
    const handleUpdateCompanyDetails = async (details: CompanyDetails): Promise<boolean> => {
        const toastId = toast.loading('Saving settings...');
        try {
            const savedDetails = await saveCompanyDetails(details);
            setCompanyDetails(savedDetails);
            toast.success('Settings saved successfully!', { id: toastId });
            return true;
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to save settings");
            return false;
        }
    };
    
    const handleSignOut = async () => {
        const toastId = toast.loading('Signing out...');
        try {
            await signOut();
            toast.success('Signed out successfully.', { id: toastId });
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Sign out failed");
        }
    };

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <Dashboard 
                        lorryReceipts={lorryReceipts}
                        onAddNew={handleAddNew}
                        onViewList={handleViewList}
                        onEditLR={handleEditLR}
                        setCurrentView={setCurrentView}
                    />
                );
            case 'list':
                return (
                    <LRList 
                        lorryReceipts={lorryReceipts}
                        onEdit={handleEditLR}
                        onDelete={handleDeleteLR}
                        companyDetails={companyDetails}
                        onAddNew={handleAddNew}
                        onBackToDashboard={handleBackToDashboard}
                        onUpdateStatus={handleUpdateLRStatus}
                        onOpenPODUploader={(lr) => setUploadingPODFor(lr)}
                        onViewPOD={handleViewPOD}
                        onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
                    />
                );
            case 'form':
                return (
                     <LRForm 
                        onSave={handleSaveLR}
                        existingLR={editingLR}
                        onCancel={handleCancelForm}
                        companyDetails={companyDetails}
                        lorryReceipts={lorryReceipts}
                        savedParties={savedParties}
                        savedTrucks={savedTrucks}
                    />
                );
            case 'parties':
                return (
                    <PartyManagement 
                        savedParties={savedParties}
                        onSave={handleSaveParty}
                        onDelete={handleDeleteParty}
                        onBack={handleBackToDashboard}
                    />
                );
            case 'trucks':
                return (
                    <TruckManagement 
                        savedTrucks={savedTrucks}
                        onSave={handleSaveTruck}
                        onDelete={handleDeleteTruck}
                        onBack={handleBackToDashboard}
                    />
                );
            case 'vehicle-hiring':
                return <VehicleHiring onBack={handleBackToDashboard} />;
            case 'booking-register':
                return <BookingRegister onBack={handleBackToDashboard} />;
            case 'data-management':
                return <DataManagement onBack={handleBackToDashboard} />;
            default:
                return null;
        }
    }


    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-200">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-ssk-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg font-semibold text-gray-700">Loading Bilty Book...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
             <div className="bg-gradient-to-br from-slate-50 to-gray-200 min-h-screen font-sans">
                 <Toaster position="top-center" />
                 <Auth />
            </div>
        );
    }


    return (
        <div className="bg-gradient-to-br from-slate-50 to-gray-200 min-h-screen font-sans">
            <Toaster position="top-center" />
            <Header 
                companyDetails={companyDetails} 
                onUpdateDetails={handleUpdateCompanyDetails}
                onUploadAsset={handleUploadCompanyAsset}
                userEmail={session.user.email}
                onSignOut={handleSignOut}
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
                    onUpload={handleUploadPOD}
                />
            )}
        </div>
    );
};

export default App;
