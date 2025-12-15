
import React, { useMemo, useState } from 'react';
import { LorryReceipt, CompanyDetails } from '../types';
import { DashboardIcon, SearchIcon, PrintIcon, InvoiceIcon } from './icons';
import InvoiceModal from './InvoiceModal';

interface InvoiceListProps {
    lorryReceipts: LorryReceipt[];
    companyDetails: CompanyDetails;
    onBack: () => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ lorryReceipts, companyDetails, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<{ invoiceNo: string, lrs: LorryReceipt[] } | null>(null);

    // Group LRs by invoiceNo, filtering out those without one
    const invoices = useMemo(() => {
        const groups: { [key: string]: LorryReceipt[] } = {};
        
        lorryReceipts.forEach(lr => {
            if (lr.invoiceNo) {
                if (!groups[lr.invoiceNo]) groups[lr.invoiceNo] = [];
                groups[lr.invoiceNo].push(lr);
            }
        });

        // Convert to array and calculate summaries
        return Object.keys(groups).map(invoiceNo => {
            const lrs = groups[invoiceNo];
            // Assume all LRs in an invoice share the same date and customer (or take first)
            const firstLR = lrs[0];
            const date = firstLR.invoiceDate || firstLR.date; // Fallback to LR date if invoice date missing
            const customer = firstLR.billingTo?.name || firstLR.consignor.name;
            
            const totalAmount = lrs.reduce((sum, lr) => {
                const charges = (Object.values(lr.charges || {}) as number[]).reduce((a, b) => a + (b || 0), 0);
                return sum + (Number(lr.freight) || 0) + charges;
            }, 0);

            return {
                invoiceNo,
                date,
                customer,
                count: lrs.length,
                totalAmount,
                lrs
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [lorryReceipts]);

    const filteredInvoices = invoices.filter(inv => 
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-lg min-h-[500px]">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <DashboardIcon className="w-6 h-6 text-gray-600"/>
                </button>
                <h2 className="text-2xl font-bold text-ssk-blue">Generated Invoices</h2>
            </div>

            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Search by Invoice No or Customer..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">Invoice No</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3 text-center">LRs Included</th>
                            <th className="px-6 py-3 text-right">Total Amount (Excl. Tax)</th>
                            <th className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.length === 0 ? (
                             <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                    No invoices found. Generate one from the LR List.
                                </td>
                            </tr>
                        ) : (
                            filteredInvoices.map((inv) => (
                                <tr key={inv.invoiceNo} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-blue-600">{inv.invoiceNo}</td>
                                    <td className="px-6 py-4">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-6 py-4 font-medium">{inv.customer}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">{inv.count}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold">₹{inv.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setSelectedInvoice({ invoiceNo: inv.invoiceNo, lrs: inv.lrs })}
                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                            title="View / Print Invoice"
                                        >
                                            <InvoiceIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedInvoice && (
                <InvoiceModal
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    lorryReceipts={selectedInvoice.lrs}
                    companyDetails={companyDetails}
                    // Pass null for onSaveInvoiceDetails to make it "View Only" (hides save button)
                    onSaveInvoiceDetails={undefined} 
                />
            )}
        </div>
    );
};

export default InvoiceList;
