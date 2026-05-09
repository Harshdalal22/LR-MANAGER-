import React, { useState, useEffect, useRef } from 'react';
import { GPSInvoice, CompanyDetails } from '../types';
import { getGPSInvoices, saveGPSInvoice, deleteGPSInvoice } from '../services/supabaseService';
import { DownloadIcon, PlusIcon, TrashIcon, XIcon, SaveIcon } from './icons';
import { toWords } from '../utils/numberToWords';
import { toast } from 'react-hot-toast';

declare const html2pdf: any;

interface GPSPanelProps {
    companyDetails: CompanyDetails;
    onSignOut: () => void;
}

const GPSPanel: React.FC<GPSPanelProps> = ({ companyDetails, onSignOut }) => {
    const [invoices, setInvoices] = useState<GPSInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isGeneratingPdfFor, setIsGeneratingPdfFor] = useState<GPSInvoice | null>(null);

    const [formData, setFormData] = useState<Partial<GPSInvoice>>({
        date: new Date().toISOString().split('T')[0],
        status: 'Paid'
    });

    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'amount' ? parseFloat(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.invoiceNo || !formData.date || !formData.customerName || !formData.vehicleNo || !formData.gpsImei || !formData.amount) {
            toast.error("Please fill all required fields");
            return;
        }

        try {
            const toastId = toast.loading('Saving Invoice...');
            const saved = await saveGPSInvoice(formData as GPSInvoice);
            setInvoices(prev => [saved, ...prev.filter(i => i.id !== saved.id)]);
            setIsFormOpen(false);
            setFormData({ date: new Date().toISOString().split('T')[0], status: 'Paid' });
            toast.success('Invoice Saved!', { id: toastId });
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
        // Add a small delay to ensure the DOM is updated before generating PDF
        setTimeout(() => {
            const element = pdfRef.current;
            if (!element) {
                toast.error("Error generating PDF");
                setIsGeneratingPdfFor(null);
                return;
            }

            const opt = {
                margin: 10,
                filename: `GPS_Invoice_${invoice.invoiceNo}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().from(element).set(opt).save().then(() => {
                setIsGeneratingPdfFor(null);
            });
        }, 300);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">GPS Invoice Management</h1>
                    <p className="text-gray-500 text-sm">Manage GPS installations and generate invoices.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="bg-ssk-blue text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-blue-700"
                    >
                        <PlusIcon className="w-5 h-5 mr-1" /> New Invoice
                    </button>
                    <button 
                        onClick={onSignOut}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-sm border-b">
                            <tr>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Invoice No</th>
                                <th className="p-4 font-semibold">Customer</th>
                                <th className="p-4 font-semibold">Vehicle No</th>
                                <th className="p-4 font-semibold">GPS IMEI</th>
                                <th className="p-4 font-semibold">Amount</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {isLoading ? (
                                <tr><td colSpan={8} className="p-4 text-center">Loading...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={8} className="p-4 text-center text-gray-500">No GPS invoices found.</td></tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="p-4">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                        <td className="p-4 font-medium">{inv.invoiceNo}</td>
                                        <td className="p-4">{inv.customerName}</td>
                                        <td className="p-4">{inv.vehicleNo}</td>
                                        <td className="p-4 text-gray-500 font-mono text-xs">{inv.gpsImei}</td>
                                        <td className="p-4">₹{inv.amount.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => generatePdf(inv)}
                                                className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                                title="Download PDF"
                                            >
                                                <DownloadIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(inv.id!)}
                                                className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Create GPS Invoice</h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-800"><XIcon className="w-6 h-6"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No</label>
                                    <input required type="text" name="invoiceNo" value={formData.invoiceNo || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="e.g. GPS-001" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input required type="date" name="date" value={formData.date || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                <input required type="text" name="customerName" value={formData.customerName || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                                    <input required type="text" name="vehicleNo" value={formData.vehicleNo || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GPS IMEI</label>
                                    <input required type="text" name="gpsImei" value={formData.gpsImei || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                    <input required type="number" name="amount" value={formData.amount || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select name="status" value={formData.status || 'Paid'} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                                        <option value="Paid">Paid</option>
                                        <option value="Unpaid">Unpaid</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-ssk-blue text-white rounded-md hover:bg-blue-700 flex items-center">
                                    <SaveIcon className="w-4 h-4 mr-2" /> Save Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden PDF Template */}
            <div style={{ display: 'none' }}>
                {isGeneratingPdfFor && (
                    <div ref={pdfRef} className="printable-area p-8 bg-white text-black font-['Calibri',sans-serif] w-[800px] border">
                        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                            <div className="w-1/4">
                                {companyDetails.logoUrl && <img src={companyDetails.logoUrl} alt="Logo" className="h-20 object-contain" />}
                            </div>
                            <div className="w-1/2 text-center">
                                <h1 className="text-3xl font-bold text-red-600">{companyDetails.name}</h1>
                                <p className="text-sm font-semibold mt-1">GPS Tracking Solutions</p>
                                <p className="text-xs mt-1">{companyDetails.address}</p>
                            </div>
                            <div className="w-1/4 text-right text-sm">
                                {companyDetails.contact.map((c, i) => <p key={i}>{c}</p>)}
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold underline">INVOICE</h2>
                        </div>

                        <div className="flex justify-between mb-8 text-sm">
                            <div className="w-1/2 border p-3 rounded bg-gray-50">
                                <p className="font-bold text-gray-600 mb-1">Billed To:</p>
                                <p className="font-bold text-base">{isGeneratingPdfFor.customerName}</p>
                                <p>Vehicle No: <span className="font-semibold">{isGeneratingPdfFor.vehicleNo}</span></p>
                            </div>
                            <div className="w-1/3 border p-3 rounded">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-gray-600">Invoice No:</span>
                                    <span className="font-bold">{isGeneratingPdfFor.invoiceNo}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-600">Date:</span>
                                    <span>{new Date(isGeneratingPdfFor.date).toLocaleDateString('en-GB')}</span>
                                </div>
                            </div>
                        </div>

                        <table className="w-full border-collapse border border-gray-400 mb-6 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border border-gray-400 p-2 text-left">Description</th>
                                    <th className="border border-gray-400 p-2 text-center">IMEI / Serial No.</th>
                                    <th className="border border-gray-400 p-2 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="h-32 align-top">
                                    <td className="border border-gray-400 p-2 font-medium">GPS Device & Installation Charges</td>
                                    <td className="border border-gray-400 p-2 text-center font-mono">{isGeneratingPdfFor.gpsImei}</td>
                                    <td className="border border-gray-400 p-2 text-right">{isGeneratingPdfFor.amount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2} className="border border-gray-400 p-2 text-right font-bold">Total Amount</td>
                                    <td className="border border-gray-400 p-2 text-right font-bold text-lg bg-gray-50">{isGeneratingPdfFor.amount.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="mb-12">
                            <p className="font-bold text-sm">Amount in words: <span className="font-normal capitalize">{toWords(isGeneratingPdfFor.amount)} Rupees Only.</span></p>
                        </div>

                        <div className="flex justify-between items-end">
                            <div className="text-xs text-gray-600">
                                <p className="font-bold mb-1">Terms & Conditions:</p>
                                <p>1. Hardware warranty as per company policy.</p>
                                <p>2. Subscription valid for 1 year from installation.</p>
                            </div>
                            <div className="text-center">
                                {companyDetails.signatureImageUrl && (
                                    <img src={companyDetails.signatureImageUrl} alt="Signature" className="h-16 object-contain mb-1 mx-auto" />
                                )}
                                <p className="font-bold text-sm border-t border-gray-400 pt-1 px-4">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GPSPanel;
