import React, { useState, useEffect, useRef } from 'react';
import { GPSInvoice, CompanyDetails } from '../types';
import { getGPSInvoices, saveGPSInvoice, deleteGPSInvoice } from '../services/supabaseService';
import { DownloadIcon, PlusIcon, TrashIcon, XIcon, SaveIcon, GlobeIcon, UploadIcon, PencilIcon } from './icons';
import { toWords } from '../utils/numberToWords';
import { toast } from 'react-hot-toast';
import { getNextSequence } from '../utils/sequenceUtils';

declare const html2pdf: any;

interface GPSPanelProps {
    companyDetails: CompanyDetails;
    onSignOut: () => void;
    onUpdateDetails: (details: CompanyDetails) => Promise<void>;
    onUploadAsset: (file: File, type: 'logo' | 'signature') => Promise<string>;
}

const GPSPanel: React.FC<GPSPanelProps> = ({ companyDetails, onSignOut, onUpdateDetails, onUploadAsset }) => {
    const [invoices, setInvoices] = useState<GPSInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'invoices' | 'settings'>('invoices');
    const [isGeneratingPdfFor, setIsGeneratingPdfFor] = useState<GPSInvoice | null>(null);
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

    const [formData, setFormData] = useState<Partial<GPSInvoice>>({
        date: new Date().toISOString().split('T')[0],
        status: 'Paid',
        quantity: 1,
        hsnCode: '85269190',
        taxRate: 18
    });

    const [settingsData, setSettingsData] = useState<CompanyDetails>(companyDetails);

    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        setSettingsData(companyDetails);
    }, [companyDetails]);

    const fetchInvoices = async () => {
        try {
            setIsLoading(true);
            const data = await getGPSInvoices();
            setInvoices(data);
        } catch (error) {
            toast.error("Failed to fetch GPS invoices");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            
            if (name === 'quantity' || name === 'rate' || name === 'taxRate') {
                const qty = parseFloat(name === 'quantity' ? value : String(prev.quantity || 1)) || 0;
                const rate = parseFloat(name === 'rate' ? value : String(prev.rate || 0)) || 0;
                const taxR = parseFloat(name === 'taxRate' ? value : String(prev.taxRate || 18)) || 0;
                
                const baseAmount = qty * rate;
                const totalTax = baseAmount * (taxR / 100);
                newData.amount = baseAmount + totalTax;
                newData.cgst = totalTax / 2;
                newData.sgst = totalTax / 2;
            }
            return newData;
        });
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettingsData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const toastId = toast.loading(`Uploading ${type}...`);
            const url = await onUploadAsset(file, type);
            toast.success(`${type} uploaded successfully`, { id: toastId });
        } catch (error) {
            toast.error(`Failed to upload ${type}`);
            console.error(error);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setIsUpdatingSettings(true);
            const toastId = toast.loading('Saving settings...');
            await onUpdateDetails(settingsData);
            toast.success('Settings saved successfully', { id: toastId });
            setActiveTab('invoices');
        } catch (error) {
            toast.error('Failed to save settings');
            console.error(error);
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.invoiceNo || !formData.date || !formData.customerName || !formData.amount) {
            toast.error("Please fill all required fields");
            return;
        }

        try {
            const toastId = toast.loading('Saving Invoice...');
            const saved = await saveGPSInvoice(formData as GPSInvoice);
            setInvoices(prev => [saved, ...prev.filter(i => i.id !== saved.id)]);
            setIsFormOpen(false);
            setFormData({ date: new Date().toISOString().split('T')[0], status: 'Paid', quantity: 1, hsnCode: '85269190', taxRate: 18 });
            toast.success('Invoice Saved!', { id: toastId });
            generatePdf(saved);
        } catch (error) {
            toast.error("Failed to save invoice");
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this invoice?")) return;
        try {
            const toastId = toast.loading('Deleting...');
            await deleteGPSInvoice(id);
            setInvoices(prev => prev.filter(i => i.id !== id));
            toast.success('Deleted successfully', { id: toastId });
        } catch (error) {
            toast.error("Failed to delete invoice");
            console.error(error);
        }
    };

    const generatePdf = (invoice: GPSInvoice) => {
        setIsGeneratingPdfFor(invoice);
        setTimeout(() => {
            const element = pdfRef.current;
            if (!element) {
                toast.error("Error generating PDF");
                setIsGeneratingPdfFor(null);
                return;
            }

            const opt = {
                margin: 0,
                filename: `Invoice_${invoice.invoiceNo}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().from(element).set(opt).save().then(() => {
                setIsGeneratingPdfFor(null);
            });
        }, 500);
    };

    const handleOpenForm = () => {
        let nextInvNo = 'GPS-001';
        if (invoices.length > 0) {
            nextInvNo = getNextSequence(invoices[0].invoiceNo);
        }
        setFormData({
            invoiceNo: nextInvNo,
            date: new Date().toISOString().split('T')[0],
            status: 'Paid',
            quantity: 1,
            hsnCode: '85269190',
            taxRate: 18,
            cgst: 0,
            sgst: 0
        });
        setIsFormOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <nav className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-ssk-blue p-2 rounded-lg">
                        <GlobeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">GPS Billing Panel</h1>
                        <p className="text-xs text-slate-500 font-medium">{companyDetails.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setActiveTab('invoices')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-ssk-blue text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        Invoices
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-ssk-blue text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        Branding & Settings
                    </button>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    <button onClick={onSignOut} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200">Sign Out</button>
                </div>
            </nav>

            <main className="container mx-auto p-6 md:p-8 animate-fadeIn">
                {activeTab === 'invoices' ? (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Invoice History</h2>
                                <p className="text-slate-500 font-medium">Manage and download your GPS billing records</p>
                            </div>
                            <button 
                                onClick={handleOpenForm}
                                className="bg-ssk-blue text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" /> Create New Invoice
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Invoice No</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Vehicle / IMEI</th>
                                            <th className="px-6 py-4">Total Amount</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoading ? (
                                            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium italic">Loading records...</td></tr>
                                        ) : invoices.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium italic">No invoices found. Create your first one above.</td></tr>
                                        ) : (
                                            invoices.map((inv) => (
                                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                                    <td className="px-6 py-4 font-black text-ssk-blue">{inv.invoiceNo}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-slate-800">{inv.customerName}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{inv.customerAddress}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-slate-700">{inv.vehicleNo}</div>
                                                        <div className="text-[10px] font-mono text-slate-400">{inv.gpsImei}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-slate-800">₹{inv.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => generatePdf(inv)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Download PDF"><DownloadIcon className="w-4 h-4"/></button>
                                                            <button onClick={() => handleDelete(inv.id!)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Delete"><TrashIcon className="w-4 h-4"/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-800">Branding & Business Settings</h2>
                            <p className="text-slate-500 font-medium">Update your company logo, signature, and billing details for professional invoices.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/60">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Company Logo</h3>
                                    <div className="relative group aspect-video bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                        {companyDetails.logoUrl ? (
                                            <img src={companyDetails.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-4" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <UploadIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">No Logo Uploaded</p>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                            <span className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2">
                                                <UploadIcon className="w-4 h-4" /> Change Logo
                                            </span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/60">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Authorized Signature</h3>
                                    <div className="relative group h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                        {companyDetails.signatureImageUrl ? (
                                            <img src={companyDetails.signatureImageUrl} alt="Signature" className="max-h-full max-w-full object-contain p-4" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <PencilIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">No Signature Uploaded</p>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                            <span className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2">
                                                <UploadIcon className="w-4 h-4" /> Change Signature
                                            </span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'signature')} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/60 grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Company Name</label>
                                        <input type="text" name="name" value={settingsData.name} onChange={handleSettingsChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Address</label>
                                        <textarea name="address" value={settingsData.address} onChange={handleSettingsChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-medium text-slate-800 h-24" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">GST Number</label>
                                        <input type="text" name="gstn" value={settingsData.gstn} onChange={handleSettingsChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">PAN Number</label>
                                        <input type="text" name="pan" value={settingsData.pan} onChange={handleSettingsChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                                        <input type="email" name="email" value={settingsData.email} onChange={handleSettingsChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Number</label>
                                        <input type="text" value={settingsData.contact[0] || ''} onChange={(e) => setSettingsData(prev => ({ ...prev, contact: [e.target.value] }))} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    
                                    <div className="col-span-2 pt-4 border-t mt-2">
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-ssk-blue rounded-full"></div> Bank Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bank Name</label>
                                                <input type="text" value={settingsData.bankDetails.bankName} onChange={(e) => setSettingsData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: e.target.value } }))} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">A/C Number</label>
                                                <input type="text" value={settingsData.bankDetails.accountNumber} onChange={(e) => setSettingsData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: e.target.value } }))} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">IFSC & Branch</label>
                                                <input type="text" value={settingsData.bankDetails.ifsc} onChange={(e) => setSettingsData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, ifsc: e.target.value } }))} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button 
                                        disabled={isUpdatingSettings}
                                        onClick={handleSaveSettings}
                                        className="bg-ssk-blue text-white px-12 py-4 rounded-2xl font-black shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                                    >
                                        <SaveIcon className="w-6 h-6" /> Save Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {isFormOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeInUp">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">Generate New GPS Invoice</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Professional Tally Style</p>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="bg-white p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm transition-all"><XIcon className="w-6 h-6"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Invoice Number</label>
                                    <input required type="text" name="invoiceNo" value={formData.invoiceNo || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Invoice Date</label>
                                    <input required type="date" name="date" value={formData.date || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h4 className="text-[11px] font-black text-ssk-blue uppercase tracking-widest mb-4">Buyer Details (Bill To)</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer Name</label>
                                        <input required type="text" name="customerName" value={formData.customerName || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer Address</label>
                                        <textarea name="customerAddress" value={formData.customerAddress || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-medium text-slate-800 h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer GST (Optional)</label>
                                        <input type="text" name="customerGst" value={formData.customerGst || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                                        <select name="status" value={formData.status || 'Paid'} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800">
                                            <option value="Paid">Paid</option>
                                            <option value="Unpaid">Unpaid</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h4 className="text-[11px] font-black text-ssk-blue uppercase tracking-widest mb-4">Device & Product Info</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle Number</label>
                                        <input required type="text" name="vehicleNo" value={formData.vehicleNo || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" placeholder="e.g. RJ-14-GB-1234" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">GPS IMEI Number</label>
                                        <input required type="text" name="gpsImei" value={formData.gpsImei || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" placeholder="15-digit IMEI" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">HSN Code</label>
                                        <input type="text" name="hsnCode" value={formData.hsnCode || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tax Rate (%)</label>
                                        <select name="taxRate" value={formData.taxRate || 18} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800">
                                            <option value="0">0% (Exempt)</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity (Pcs)</label>
                                        <input required type="number" name="quantity" value={formData.quantity || 1} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unit Rate (₹)</label>
                                        <input required type="number" name="rate" value={formData.rate || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-ssk-blue font-bold text-slate-800" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t flex justify-between items-center bg-slate-50 -mx-8 -mb-8 px-8 py-6 rounded-b-3xl">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Invoice Value</p>
                                    <h3 className="text-3xl font-black text-ssk-blue">₹{formData.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">Cancel</button>
                                    <button type="submit" className="px-8 py-3 bg-ssk-blue text-white rounded-xl font-black shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center">
                                        <SaveIcon className="w-5 h-5 mr-2" /> Save & Generate
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {isGeneratingPdfFor && (
                    <div ref={pdfRef} className="bg-white p-0 text-black font-['Calibri',sans-serif] w-[794px]" style={{ minHeight: '1123px' }}>
                        <div className="border-[1.5px] border-black m-6 h-full flex flex-col">
                            <div className="text-center py-1 border-b-[1.5px] border-black font-black text-sm uppercase">Tax Invoice</div>
                            
                            <div className="flex border-b-[1.5px] border-black">
                                <div className="w-[60%] border-r-[1.5px] border-black p-4">
                                    <div className="flex items-start gap-4 mb-3">
                                        {companyDetails.logoUrl && (
                                            <img src={companyDetails.logoUrl} alt="Logo" className="h-14 object-contain" />
                                        )}
                                        <div>
                                            <h1 className="text-xl font-black tracking-tight leading-tight">{companyDetails.name}</h1>
                                            <p className="text-[9px] font-bold text-gray-700 leading-tight whitespace-pre-wrap mt-1">{companyDetails.address}</p>
                                            <div className="mt-1.5 space-y-0.5">
                                                <p className="text-[9px] font-bold">GSTIN/UIN: <span className="font-black">{companyDetails.gstn}</span></p>
                                                <p className="text-[9px] font-bold">PAN: <span className="font-black">{companyDetails.pan}</span></p>
                                                <p className="text-[9px] font-bold">E-Mail: <span className="text-blue-700 underline">{companyDetails.email}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-[40%] text-[10px]">
                                    <div className="flex border-b-[1.5px] border-black">
                                        <div className="w-1/2 p-1.5 border-r-[1.5px] border-black">
                                            <p className="text-[8px] font-bold text-gray-500">Invoice No.</p>
                                            <p className="font-black text-base leading-none py-1">{isGeneratingPdfFor.invoiceNo}</p>
                                        </div>
                                        <div className="w-1/2 p-1.5">
                                            <p className="text-[8px] font-bold text-gray-500">Dated</p>
                                            <p className="font-black text-base leading-none py-1">{new Date(isGeneratingPdfFor.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="flex border-b-[1.5px] border-black">
                                        <div className="w-1/2 p-1.5 border-r-[1.5px] border-black h-10"><p className="text-[8px] font-bold text-gray-500">Delivery Note</p></div>
                                        <div className="w-1/2 p-1.5 h-10"><p className="text-[8px] font-bold text-gray-500">Mode/Terms of Payment</p></div>
                                    </div>
                                    <div className="flex border-b-[1.5px] border-black">
                                        <div className="w-1/2 p-1.5 border-r-[1.5px] border-black h-10"><p className="text-[8px] font-bold text-gray-500">Reference No. & Date</p></div>
                                        <div className="w-1/2 p-1.5 h-10"><p className="text-[8px] font-bold text-gray-500">Other References</p></div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-1/2 p-1.5 border-r-[1.5px] border-black h-10"><p className="text-[8px] font-bold text-gray-500">Buyer's Order No.</p></div>
                                        <div className="w-1/2 p-1.5 h-10"><p className="text-[8px] font-bold text-gray-500">Dated</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex border-b-[1.5px] border-black min-h-[140px]">
                                <div className="w-1/2 border-r-[1.5px] border-black p-2">
                                    <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Consignee (Ship to)</p>
                                    <p className="text-[11px] font-black">{isGeneratingPdfFor.customerName}</p>
                                    <p className="text-[10px] font-bold whitespace-pre-wrap leading-tight">{isGeneratingPdfFor.customerAddress}</p>
                                    <p className="text-[10px] font-bold mt-2">GSTIN/UIN: <span className="font-black">{isGeneratingPdfFor.customerGst || 'N/A'}</span></p>
                                </div>
                                <div className="w-1/2 p-2">
                                    <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Buyer (Bill to)</p>
                                    <p className="text-[11px] font-black">{isGeneratingPdfFor.customerName}</p>
                                    <p className="text-[10px] font-bold whitespace-pre-wrap leading-tight">{isGeneratingPdfFor.customerAddress}</p>
                                    <p className="text-[10px] font-bold mt-2">GSTIN/UIN: <span className="font-black">{isGeneratingPdfFor.customerGst || 'N/A'}</span></p>
                                </div>
                            </div>

                            <div className="flex-grow flex flex-col">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase border-b-[1.5px] border-black bg-gray-50">
                                            <th className="border-r-[1.5px] border-black p-1 text-center w-[5%]">Sl.</th>
                                            <th className="border-r-[1.5px] border-black p-1 text-left w-[45%]">Description of Goods</th>
                                            <th className="border-r-[1.5px] border-black p-1 text-center w-[12%]">HSN/SAC</th>
                                            <th className="border-r-[1.5px] border-black p-1 text-center w-[10%]">Quantity</th>
                                            <th className="border-r-[1.5px] border-black p-1 text-center w-[10%]">Rate</th>
                                            <th className="border-r-[1.5px] border-black p-1 text-center w-[5%]">per</th>
                                            <th className="p-1 text-right w-[13%]">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[11px]">
                                        <tr className="min-h-[300px]">
                                            <td className="border-r-[1.5px] border-black p-2 text-center align-top">1</td>
                                            <td className="border-r-[1.5px] border-black p-2 align-top">
                                                <p className="font-black text-xs">Vehicle Tracking System with GPS Device</p>
                                                <p className="text-[9px] font-bold text-gray-600 mt-1 italic">Vehicle No: {isGeneratingPdfFor.vehicleNo}</p>
                                                <p className="text-[9px] font-bold text-gray-600 italic">IMEI: {isGeneratingPdfFor.gpsImei}</p>
                                                
                                                <div className="mt-12 text-right space-y-1">
                                                    {isGeneratingPdfFor.cgst ? <p className="font-black italic">OUTPUT CGST @{isGeneratingPdfFor.taxRate ? (isGeneratingPdfFor.taxRate/2) : 9}%</p> : null}
                                                    {isGeneratingPdfFor.sgst ? <p className="font-black italic">OUTPUT SGST @{isGeneratingPdfFor.taxRate ? (isGeneratingPdfFor.taxRate/2) : 9}%</p> : null}
                                                </div>
                                            </td>
                                            <td className="border-r-[1.5px] border-black p-2 text-center align-top font-bold">{isGeneratingPdfFor.hsnCode}</td>
                                            <td className="border-r-[1.5px] border-black p-2 text-center align-top font-black">{isGeneratingPdfFor.quantity} Pcs</td>
                                            <td className="border-r-[1.5px] border-black p-2 text-right align-top font-bold">{isGeneratingPdfFor.rate?.toFixed(2)}</td>
                                            <td className="border-r-[1.5px] border-black p-2 text-center align-top">Pcs</td>
                                            <td className="p-2 text-right align-top">
                                                <p className="font-black">{( (isGeneratingPdfFor.rate || 0) * (isGeneratingPdfFor.quantity || 0) ).toFixed(2)}</p>
                                                <div className="mt-12 space-y-1">
                                                    {isGeneratingPdfFor.cgst ? <p className="font-black">{isGeneratingPdfFor.cgst.toFixed(2)}</p> : null}
                                                    {isGeneratingPdfFor.sgst ? <p className="font-black">{isGeneratingPdfFor.sgst.toFixed(2)}</p> : null}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr className="h-[250px]">
                                            <td className="border-r-[1.5px] border-black"></td>
                                            <td className="border-r-[1.5px] border-black"></td>
                                            <td className="border-r-[1.5px] border-black"></td>
                                            <td className="border-r-[1.5px] border-black"></td>
                                            <td className="border-r-[1.5px] border-black"></td>
                                            <td className="border-r-[1.5px] border-black"></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-[1.5px] border-black text-[11px] font-black">
                                            <td colSpan={3} className="border-r-[1.5px] border-black p-1 text-right">Total</td>
                                            <td className="border-r-[1.5px] border-black p-1 text-center">{isGeneratingPdfFor.quantity} Pcs</td>
                                            <td className="border-r-[1.5px] border-black p-1"></td>
                                            <td className="border-r-[1.5px] border-black p-1"></td>
                                            <td className="p-1 text-right bg-gray-50 text-base">₹{isGeneratingPdfFor.amount.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="border-t-[1.5px] border-black p-2 bg-slate-50/30">
                                <p className="text-[10px] font-bold uppercase text-gray-500">Amount Chargeable (in words)</p>
                                <p className="text-xs font-black italic">Indian Rupees {toWords(isGeneratingPdfFor.amount)} Only</p>
                            </div>

                            <div className="flex border-t-[1.5px] border-black text-[10px]">
                                <div className="w-[60%] border-r-[1.5px] border-black p-3">
                                    <p className="font-black underline mb-2">Declaration:</p>
                                    <p className="text-[9px] font-bold leading-tight">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. All disputes are subject to Local jurisdiction only.</p>
                                    
                                    <div className="mt-4 pt-2 border-t border-gray-300">
                                        <p className="font-black text-gray-700 underline">Terms & Conditions:</p>
                                        <ol className="list-decimal ml-4 mt-1 text-[8px] font-bold text-gray-600 space-y-0.5">
                                            <li>Payment should be made in favor of "{companyDetails.name}".</li>
                                            <li>Warranty on hardware is as per manufacturer's policy.</li>
                                            <li>Subscription and SIM services are valid for 1 year from date of installation.</li>
                                        </ol>
                                    </div>
                                </div>
                                <div className="w-[40%] p-3 bg-gray-50/50">
                                    <p className="font-black underline mb-2">Company's Bank Details:</p>
                                    <div className="space-y-1">
                                        <p className="font-bold">Bank Name: <span className="font-black">{companyDetails.bankDetails.bankName}</span></p>
                                        <p className="font-bold">A/C No.: <span className="font-black">{companyDetails.bankDetails.accountNumber}</span></p>
                                        <p className="font-bold">Branch & IFSC: <span className="font-black">{companyDetails.bankDetails.ifsc}</span></p>
                                    </div>
                                    
                                    <div className="mt-8 text-center">
                                        <p className="text-[8px] font-bold text-gray-500 uppercase italic">for {companyDetails.name}</p>
                                        <div className="h-16 flex items-center justify-center py-2">
                                            {companyDetails.signatureImageUrl && (
                                                <img src={companyDetails.signatureImageUrl} alt="Signature" className="max-h-full object-contain" />
                                            )}
                                        </div>
                                        <p className="font-black border-t border-black pt-1">Authorized Signatory</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GPSPanel;
