
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
import InvoiceList from './components/InvoiceList';
import AdBanner from './components/AdBanner';
import { Language } from './utils/translations';
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
    const [dashboardSection, setDashboardSection] = useState<'lr' | 'data' | null>(null);
    const [viewHistory, setViewHistory] = useState<View[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingPODFor, setUploadingPODFor] = useState<LorryReceipt | null>(null);
    const [language, setLanguage] = useState<Language>('en');

    const handleError = (error: unknown, context: string) => {
        let errorMessage = 'An unknown error occurred.';
    
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
            const errObj = error as any;
            errorMessage = errObj.message || errObj.error_description || errObj.details || errObj.hint;
            
            if (!errorMessage || errorMessage === '[object Object]') {
                try {
                    errorMessage = JSON.stringify(error);
                } catch {
                    errorMessage = 'A non-serializable error object was received.';
                }
            }
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
    
        console.error(`${context}:`, error);
        const lowerMsg = errorMessage.toLowerCase();
    
        if ((lowerMsg.includes('relation') && lowerMsg.includes('does not exist')) || lowerMsg.includes('in the schema cache')) {
            let featureName = "A feature";
            if (lowerMsg.includes('lorry_receipts') || lowerMsg.includes('company_details')) {
                 featureName = "The core application";
            } else if (lowerMsg.includes('saved_parties')) {
                featureName = "'Manage Parties'";
            } else if (lowerMsg.includes('saved_trucks')) {
                featureName = "'Manage Trucks'";
            } else if (lowerMsg.includes('vehicle_hirings')) {
                featureName = "'Vehicle Hiring'";
            } else if (lowerMsg.includes('booking_registers')) {
                featureName = "'Booking Register'";
            }
    
            toast.error(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-red-600">Database Setup Required</p>
                        <p className="text-sm">{featureName} requires a database update. Please run the SQL script.</p>
                        <button onClick={() => { toast.dismiss(t.id); navigateTo('data-management'); }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm w-fit">Go to Setup</button>
                    </div>
                ), { duration: 15000, id: `table-missing-${featureName.replace(/\W/g, '')}` }
            );
            return;
        }
        
        toast.error(`${context}: ${errorMessage}`, { duration: 8000 });
    };

    // Navigation Helper
    const navigateTo = (view: View) => {
        if (view === currentView) return;
        setViewHistory(prev => [...prev, currentView]);
        setCurrentView(view);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        if (viewHistory.length > 0) {
            const newHistory = [...viewHistory];
            const prevView = newHistory.pop();
            setViewHistory(newHistory);
            if (prevView) setCurrentView(prevView);
        } else {
            // Default fallback if history is empty
            if (currentView !== 'dashboard') {
                setCurrentView('dashboard');
            }
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
                        setDashboardSection(null);
                        setViewHistory([]);
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
                getCompanyDetails(defaultCompanyDetails),
            ]);
            setLorryReceipts(lrs);
            setCompanyDetails(details);

            const [partiesResult, trucksResult] = await Promise.allSettled([
                getSavedParties(),
                getSavedTrucks()
            ]);

            if (partiesResult.status === 'fulfilled') {
                setSavedParties(partiesResult.value);
            } else {
                handleError(partiesResult.reason, "Failed to load saved parties");
            }

            if (trucksResult.status === 'fulfilled') {
                setSavedTrucks(trucksResult.value);
            } else {
                handleError(trucksResult.reason, "Failed to load saved trucks");
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
            isInvoiceGenerated: editingLR ? editingLR.isInvoiceGenerated : false,
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

            // --- Auto-save Truck ---
            const truckNum = savedLr.truckNo.trim();
            if (truckNum && !savedTrucks.some(t => t.truckNo.toLowerCase() === truckNum.toLowerCase())) {
                saveSavedTruck({ truckNo: truckNum })
                    .then(newTruck => {
                        setSavedTrucks(prev => {
                            // Check again to avoid race condition duplicates
                            if (prev.some(t => t.truckNo.toLowerCase() === newTruck.truckNo.toLowerCase())) return prev;
                            return [...prev, newTruck];
                        });
                    })
                    .catch(err => console.error("Auto-save truck error", err));
            }

            // --- Auto-save Parties ---
            const partiesToCheck = [
                { ...savedLr.consignor, type: 'Consignor' as const },
                { ...savedLr.consignee, type: 'Consignee' as const }
            ];

            // If billing party is different from both, check it too
            if (savedLr.billingTo?.name && 
                savedLr.billingTo.name !== savedLr.consignor.name && 
                savedLr.billingTo.name !== savedLr.consignee.name) {
                partiesToCheck.push({ ...savedLr.billingTo, type: 'Consignor' as const });
            }

            // Dedupe locally before processing
            const uniquePartiesToSave = new Map<string, typeof partiesToCheck[0]>();
            partiesToCheck.forEach(p => {
                if (p.name && !uniquePartiesToSave.has(p.name.toLowerCase())) {
                    uniquePartiesToSave.set(p.name.toLowerCase(), p);
                }
            });

            // Save new parties
            uniquePartiesToSave.forEach(p => {
                const exists = savedParties.some(sp => sp.name.toLowerCase() === p.name.toLowerCase());
                if (!exists) {
                    saveSavedParty(p)
                        .then(newParty => {
                             setSavedParties(prev => {
                                if (prev.some(existing => existing.name.toLowerCase() === newParty.name.toLowerCase())) return prev;
                                return [...prev, newParty];
                            });
                        })
                        .catch(err => console.error("Auto-save party error", err));
                }
            });


            if (editingLR) {
                setLorryReceipts(lorryReceipts.map(r => r.lrNo === savedLr.lrNo ? savedLr : r));
                toast.success('LR updated successfully!', { id: toastId });
            } else {
                setLorryReceipts([savedLr, ...lorryReceipts]);
                toast.success('LR generated successfully!', { id: toastId });
            }
            setEditingLR(null);
            navigateTo('list');
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
        const toastId = toast.loading('Generating Invoice...');
        try {
            await updateLorryReceiptInvoiceDetails(lrNos, invoiceNo, invoiceDate);
            setLorryReceipts(prev => prev.map(lr => 
                lrNos.includes(lr.lrNo) 
                    ? { ...lr, invoiceNo, invoiceDate, isInvoiceGenerated: true } 
                    : lr
            ));
            toast.success('Invoice Generated Successfully', { id: toastId });
            navigateTo('invoices');
        } catch (error) {
            toast.dismiss(toastId);
            handleError(error, "Failed to generate Invoice");
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

    const handleEditLR = (lrNo: string) => {
        const lrToEdit = lorryReceipts.find(lr => lr.lrNo === lrNo);
        if (lrToEdit) {
            setEditingLR(lrToEdit);
            navigateTo('form');
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

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <Dashboard 
                        lorryReceipts={lorryReceipts}
                        onAddNew={() => { setEditingLR(null); navigateTo('form'); }}
                        onViewList={() => navigateTo('list')}
                        onEditLR={handleEditLR}
                        setCurrentView={navigateTo}
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
                        companyDetails={companyDetails}
                        onAddNew={() => { setEditingLR(null); navigateTo('form'); }}
                        onBackToDashboard={handleBack}
                        onUpdateStatus={handleUpdateLRStatus}
                        onOpenPODUploader={(lr) => setUploadingPODFor(lr)}
                        onViewPOD={async (path) => {
                            const url = await getPodSignedUrl(path);
                            window.open(url, '_blank');
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
                        onCancel={() => { setEditingLR(null); handleBack(); }}
                        companyDetails={companyDetails}
                        lorryReceipts={lorryReceipts}
                        savedParties={savedParties}
                        savedTrucks={savedTrucks}
                        language={language}
                    />
                );
            case 'parties':
                return (
                    <PartyManagement 
                        savedParties={savedParties}
                        onSave={async (p) => { await saveSavedParty(p); await fetchData(); }}
                        onDelete={async (id) => { await deleteSavedParty(id); await fetchData(); }}
                        onBack={handleBack}
                    />
                );
            case 'trucks':
                return (
                    <TruckManagement 
                        savedTrucks={savedTrucks}
                        onSave={async (t) => { await saveSavedTruck(t); await fetchData(); }}
                        onDelete={async (id) => { await deleteSavedTruck(id); await fetchData(); }}
                        onBack={handleBack}
                    />
                );
            case 'vehicle-hiring': return <VehicleHiring onBack={handleBack} />;
            case 'booking-register': return <BookingRegister onBack={handleBack} />;
            case 'data-management': return <DataManagement onBack={handleBack} />;
            case 'invoices': 
                return (
                    <InvoiceList 
                        lorryReceipts={lorryReceipts} 
                        companyDetails={companyDetails} 
                        onBack={handleBack} 
                        onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
                    />
                );
            default:
                return null;
        }
    }


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
                        const updated = await uploadPOD(file, lr.lrNo);
                        setLorryReceipts(prev => prev.map(r => r.lrNo === updated.lrNo ? updated : r));
                        setUploadingPODFor(null);
                        toast.success('POD uploaded successfully');
                    }}
                />
            )}
        </div>
    );
};

export default App;
