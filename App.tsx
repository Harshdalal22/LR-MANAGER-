import React, { useState, useCallback, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { LorryReceipt, CompanyDetails, LRStatus, View } from './types';
import LRForm from './components/LRForm';
import LRList from './components/LRList';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import PODUploadModal from './components/PODUploadModal';
import VehicleHiring from './components/VehicleHiring';
import BookingRegister from './components/BookingRegister';
import DataManagement from './components/DataManagement';
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
    updateLorryReceiptInvoiceDetails 
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
    const [editingLR, setEditingLR] = useState<LorryReceipt | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(defaultCompanyDetails);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingPODFor, setUploadingPODFor] = useState<LorryReceipt | null>(null);

    // Centralized error handler for consistent user feedback
    const handleError = (error: unknown, context: string) => {
        let errorMessage = 'An unknown error occurred.';

        // More robust error message extraction
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
            // Handle Supabase error objects which might not be instances of Error
            errorMessage = (error as any).message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        console.error(`${context}:`, error); // Log the full error for debugging

        if (errorMessage.toLowerCase().includes('failed to fetch')) {
            toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold">Connection Failed: Could not connect to the database.</p>
                        <p>
                            <span className="font-bold">ACTION REQUIRED:</span> This is likely a CORS issue. You MUST add this application's URL to your Supabase project's "CORS Origins" settings in the API section of your dashboard.
                        </p>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="mt-2 w-full bg-ssk-red text-white px-3 py-1 rounded-md text-sm font-semibold"
                        >
                            Dismiss
                        </button>
                    </div>
                ),
                { duration: Infinity, id: 'fetch-error' }
            );
        } else if (
            errorMessage.includes("Could not find the 'branchLocations' column") || 
            errorMessage.includes("Could not find the 'jurisdictionCity' column") ||
            errorMessage.includes('has no field "updated_at"')
        ) {
             toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-red-600">Database Update Required</p>
                        <p className="text-sm">
                            The database schema is missing required columns. Please run the provided SQL script in your Supabase SQL Editor.
                            <br/>
                            <span className="font-bold">After running the script, go to Supabase Project Settings &gt; API &gt; Schema Cache and click "Reload".</span>
                        </p>
                         <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                setTimeout(() => window.location.reload(), 500); // Force reload after dismissing the error, assuming user ran SQL.
                            }}
                            className="mt-2 w-full bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold"
                        >
                            Okay, I've run the SQL
                        </button>
                    </div>
                ),
                { duration: Infinity, id: 'schema-error' }
            );
        } else {
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
            const [lrs, details] = await Promise.all([
                getLorryReceipts(),
                getCompanyDetails(defaultCompanyDetails)
            ]);
            setLorryReceipts(lrs);
            setCompanyDetails(details);
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
        
        // Comprehensive data sanitization
        const sanitizedLR = {
            ...lr,
            invoiceDate: lr.invoiceDate || null,
            poDate: lr.poDate || null,
            ewayBillDate: lr.ewayBillDate || null,
            ewayExDate: lr.ewayExDate || null,
            status: editingLR ? lr.status : 'Booked',
            // Ensure numeric fields are numbers, defaulting to 0 if null/undefined/NaN
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
            
            // Update local state
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
                // First delete associated POD file, if it exists
                if (lrToDelete.pod_path) {
                    await deletePOD(lrToDelete.pod_path);
                }
                // Then delete the LR record
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
                <AdBanner /> {/* Ad banner at the bottom of the main content */}
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