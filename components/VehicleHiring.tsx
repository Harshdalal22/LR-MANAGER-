

import React, { useState, useEffect } from 'react';
import { DashboardIcon, SearchIcon, PlusIcon, SaveIcon, PencilIcon, TrashIcon, TruckIcon } from './icons';
import { VehicleHiring } from '../types';
import { getVehicleHirings, saveVehicleHiring, deleteVehicleHiring } from '../services/supabaseService';
import { toast } from 'react-hot-toast';

interface VehicleHiringProps {
    onBack: () => void;
}

const initialRecord: VehicleHiring = {
    date: new Date().toISOString().split('T')[0],
    grNo: '',
    billNo: '',
    lorryNo: '',
    driverNo: '',
    ownerName: 'Third Party',
    fromPlace: '',
    toPlace: '',
    freight: 0,
    advance: 0,
    balance: 0,
    otherExpenses: 0,
    totalBalance: 0,
    podStatus: 'Pending',
    paymentStatus: 'Pending'
};

const VehicleHiring: React.FC<VehicleHiringProps> = ({ onBack }) => {
    const [records, setRecords] = useState<VehicleHiring[]>([]);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [formData, setFormData] = useState<VehicleHiring>(initialRecord);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    // Auto-calculate balances
    useEffect(() => {
        const balance = (Number(formData.freight) || 0) - (Number(formData.advance) || 0);
        const total = balance + (Number(formData.otherExpenses) || 0);
        setFormData(prev => ({
            ...prev,
            balance: balance,
            totalBalance: total
        }));
    }, [formData.freight, formData.advance, formData.otherExpenses]);

    const getErrorMessage = (error: any): string => {
        if (!error) return 'Unknown error';
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        if (typeof error === 'object') {
            if (error.message && typeof error.message === 'string') return error.message;
            if (error.details && typeof error.details === 'string') return error.details;
            try {
                return JSON.stringify(error);
            } catch {
                return 'Unserializable error object';
            }
        }
        return String(error);
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getVehicleHirings();
            setRecords(data);
        } catch (error) {
            console.error("Failed to load vehicle hirings:", error);
            const msg = getErrorMessage(error);
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes('relation "vehicle_hirings" does not exist') || lowerMsg.includes('in the schema cache')) {
                 toast.error(
                    "Database setup for Vehicle Hiring is missing. Please run the setup script from the Data Management dashboard.", 
                    { duration: 10000, id: 'vh-table-missing' }
                );
            } else {
                 toast.error(`Failed to load hiring data: ${msg}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (record: VehicleHiring) => {
        setFormData(record);
        setView('form');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        const toastId = toast.loading('Deleting...');
        try {
            await deleteVehicleHiring(id);
            setRecords(prev => prev.filter(r => r.id !== id));
            toast.success('Deleted successfully', { id: toastId });
        } catch (error) {
            toast.error(`Failed to delete: ${getErrorMessage(error)}`, { id: toastId });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Saving...');
        try {
            const saved = await saveVehicleHiring(formData);
            if (formData.id) {
                setRecords(prev => prev.map(r => r.id === saved.id ? saved : r));
            } else {
                setRecords(prev => [saved, ...prev]);
            }
            toast.success('Saved successfully', { id: toastId });
            setView('list');
        } catch (error) {
            toast.error(`Failed to save: ${getErrorMessage(error)}`, { id: toastId });
        }
    };

    const filteredRecords = records.filter(r => 
        r.lorryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.grNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.driverNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalActive = records.length;
    const pendingPayments = records.filter(r => r.paymentStatus === 'Pending').length;
    const pendingPODs = records.filter(r => r.podStatus === 'Pending').length;

    return (
        <div className="bg-white/70 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg min-h-[500px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 self-start">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <DashboardIcon className="w-6 h-6 text-gray-600"/>
                    </button>
                    <h2 className="text-2xl font-bold text-ssk-blue">Vehicle Hiring Details</h2>
                </div>
                {view === 'list' && (
                    <button 
                        onClick={() => { setFormData(initialRecord); setView('form'); }}
                        className="bg-ssk-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-md"
                    >
                        <PlusIcon className="w-5 h-5" /> Add Hiring
                    </button>
                )}
            </div>

            {/* Dashboard Overview */}
            {view === 'list' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-bold">Total Active Hirings</p>
                                <p className="text-2xl font-bold text-blue-700">{totalActive}</p>
                            </div>
                            <TruckIcon className="w-8 h-8 text-blue-300" />
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-bold">Pending Payments</p>
                                <p className="text-2xl font-bold text-orange-700">{pendingPayments}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-600 font-bold">₹</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-bold">Pending PODs</p>
                                <p className="text-2xl font-bold text-purple-700">{pendingPODs}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 font-bold">!</div>
                        </div>
                    </div>

                    <div className="mb-4 relative">
                        <input
                            type="text"
                            placeholder="Search by Lorry No, GR No, Driver..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-ssk-blue"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>

                    <div className="overflow-x-auto rounded-lg border shadow-sm">
                        <table className="w-full text-sm text-left text-gray-700 bg-white">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">GR No</th>
                                    <th className="px-4 py-3">Lorry No</th>
                                    <th className="px-4 py-3">From - To</th>
                                    <th className="px-4 py-3 text-right">Freight</th>
                                    <th className="px-4 py-3 text-right">Balance</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={8} className="p-8 text-center">Loading...</td></tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">No records found.</td></tr>
                                ) : (
                                    filteredRecords.map(r => (
                                        <tr key={r.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                                            <td className="px-4 py-3 font-medium text-blue-600">{r.grNo}</td>
                                            <td className="px-4 py-3">{r.lorryNo}</td>
                                            <td className="px-4 py-3 text-xs">{r.fromPlace} → {r.toPlace}</td>
                                            <td className="px-4 py-3 text-right">₹{r.freight}</td>
                                            <td className="px-4 py-3 text-right font-bold text-red-600">₹{r.totalBalance}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.paymentStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {r.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 flex justify-center gap-2">
                                                <button onClick={() => handleEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => r.id && handleDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Add/Edit Form */}
            {view === 'form' && (
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Basic Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Date*</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Booking ID</label>
                                    <input type="text" placeholder="Auto / Optional" value={formData.bookingId || ''} onChange={e => setFormData({...formData, bookingId: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">GR Number*</label>
                                    <input type="text" required value={formData.grNo} onChange={e => setFormData({...formData, grNo: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Bill Number</label>
                                    <input type="text" value={formData.billNo || ''} onChange={e => setFormData({...formData, billNo: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Lorry Number*</label>
                                    <input type="text" required value={formData.lorryNo} onChange={e => setFormData({...formData, lorryNo: e.target.value.toUpperCase()})} className="w-full p-2 border rounded uppercase" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Driver Number</label>
                                    <input type="text" value={formData.driverNo || ''} onChange={e => setFormData({...formData, driverNo: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Owner Name</label>
                                    <select value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value as any})} className="w-full p-2 border rounded">
                                        <option value="Self">Self</option>
                                        <option value="Third Party">Third Party</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">From</label>
                                    <input type="text" value={formData.fromPlace} onChange={e => setFormData({...formData, fromPlace: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">To</label>
                                    <input type="text" value={formData.toPlace} onChange={e => setFormData({...formData, toPlace: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Financials & Status</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Freight Amount</label>
                                    <input type="number" value={formData.freight} onChange={e => setFormData({...formData, freight: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Advance</label>
                                    <input type="number" value={formData.advance} onChange={e => setFormData({...formData, advance: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Other Expenses</label>
                                    <input type="number" value={formData.otherExpenses} onChange={e => setFormData({...formData, otherExpenses: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Total Balance</label>
                                    <input type="number" readOnly value={formData.totalBalance} className="w-full p-2 border rounded bg-gray-200 font-bold text-blue-800" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">POD Status</label>
                                    <select value={formData.podStatus} onChange={e => setFormData({...formData, podStatus: e.target.value as any})} className="w-full p-2 border rounded">
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Payment Status</label>
                                    <select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})} className="w-full p-2 border rounded">
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => setView('list')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                                Cancel
                            </button>
                            <button type="submit" className="px-6 py-2 bg-ssk-blue text-white rounded-lg hover:bg-blue-800 font-semibold flex items-center gap-2 shadow-lg">
                                <SaveIcon className="w-5 h-5" /> Save Record
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default VehicleHiring;
