
import React, { useState, useEffect, useRef } from 'react';
import { DashboardIcon, SearchIcon, PlusIcon, SaveIcon, PencilIcon, TrashIcon, ListIcon, ArrowLeftIcon, DownloadIcon, UploadIcon } from './icons';
import { BookingRecord, PaymentRecord, SavedTruck } from '../types';
import { getBookingRecords, saveBookingRecord, deleteBookingRecord, getSavedTrucks } from '../services/supabaseService';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface BookingRegisterProps {
    onBack: () => void;
}


const initialRecord: BookingRecord = {
    date: new Date().toISOString().split('T')[0],
    partyName: '',
    grNo: '',
    billNo: '',
    lorryNo: '',
    lorryType: 'Closed',
    weight: 0,
    fromPlace: '',
    toPlace: '',
    freight: 0,
    advance: 0,
    advances: [],
    balance: 0,
    otherExpenses: 0,
    totalBalance: 0,
    paymentStatus: 'Pending'
};

const BookingRegister: React.FC<BookingRegisterProps> = ({ onBack }) => {
    const [records, setRecords] = useState<BookingRecord[]>([]);
    const [savedTrucks, setSavedTrucks] = useState<SavedTruck[]>([]);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [formData, setFormData] = useState<BookingRecord>(initialRecord);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Temp state for new payment entry
    const [newPayment, setNewPayment] = useState<PaymentRecord>({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    // Effect to calculate totals whenever freight, advances, or expenses change
    useEffect(() => {
        // Calculate total advance from the array. Ensure advances is an array.
        const advancesList = Array.isArray(formData.advances) ? formData.advances : [];
        const totalAdvance = advancesList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Calculate balance (Freight - Total Advance)
        const balance = (Number(formData.freight) || 0) - totalAdvance;

        // Calculate Total Balance (Balance + Other Expenses)
        const total = balance + (Number(formData.otherExpenses) || 0);

        setFormData(prev => ({
            ...prev,
            advance: totalAdvance,
            balance: balance,
            totalBalance: total
        }));
    }, [formData.freight, formData.advances, formData.otherExpenses]);

    const getErrorMessage = (error: any): string => {
        if (!error) return 'Unknown error';
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        if (typeof error === 'object') {
            // Prioritize common error properties
            if (error.message && typeof error.message === 'string') return error.message;
            if (error.error_description && typeof error.error_description === 'string') return error.error_description;
            if (error.details && typeof error.details === 'string') return error.details;

            // Fallback to JSON stringify for other objects
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
            const [bookingsResult, trucksResult] = await Promise.allSettled([
                getBookingRecords(),
                getSavedTrucks()
            ]);

            let loadedRecords: BookingRecord[] = [];
            let loadedTrucks: SavedTruck[] = [];

            if (bookingsResult.status === 'fulfilled') {
                loadedRecords = bookingsResult.value;
            } else {
                console.error("Failed to load bookings:", bookingsResult.reason);
                const errorMsg = getErrorMessage(bookingsResult.reason);
                const lowerErrorMsg = errorMsg.toLowerCase();
                if (lowerErrorMsg.includes('relation "booking_registers" does not exist') || lowerErrorMsg.includes("in the schema cache")) {
                    toast.error(
                        "Database setup for Booking Register is missing. Please run the setup script from the Data Management dashboard.",
                        { duration: 10000, id: 'br-table-missing' }
                    );
                } else {
                    toast.error(`Failed to load bookings: ${errorMsg}`);
                }
            }

            if (trucksResult.status === 'fulfilled') {
                loadedTrucks = trucksResult.value;
            } else {
                console.error("Failed to load trucks:", trucksResult.reason);
            }

            const sanitizedData = loadedRecords.map(record => ({
                ...record,
                advances: Array.isArray(record.advances)
                    ? record.advances
                    : (record.advance ? [{ amount: record.advance, date: record.date || new Date().toISOString().split('T')[0], notes: 'Legacy Advance' }] : [])
            }));

            setRecords(sanitizedData);
            setSavedTrucks(loadedTrucks);
        } catch (error) {
            console.error("Critical Error loading booking data:", error);
            toast.error(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (record: BookingRecord) => {
        setFormData({
            ...record,
            advances: Array.isArray(record.advances) ? record.advances : []
        });
        setView('form');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this booking?')) return;
        const toastId = toast.loading('Deleting...');
        try {
            await deleteBookingRecord(id);
            setRecords(prev => prev.filter(r => r.id !== id));
            toast.success('Deleted successfully', { id: toastId });
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(`Failed to delete: ${getErrorMessage(error)}`, { id: toastId });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Saving...');
        try {
            const payload = {
                ...formData,
                advances: Array.isArray(formData.advances) ? formData.advances : []
            };

            const saved = await saveBookingRecord(payload);
            if (formData.id) {
                setRecords(prev => prev.map(r => r.id === saved.id ? saved : r));
            } else {
                setRecords(prev => [saved, ...prev]);
            }
            toast.success('Saved successfully', { id: toastId });
            setView('list');
        } catch (error) {
            console.error("Save error:", error);
            toast.error(`Failed to save: ${getErrorMessage(error)}`, { id: toastId });
        }
    };

    const handleAddPayment = () => {
        if (!newPayment.amount || newPayment.amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        setFormData(prev => ({
            ...prev,
            advances: [...(Array.isArray(prev.advances) ? prev.advances : []), newPayment]
        }));
        setNewPayment({
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const handleRemovePayment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            advances: (prev.advances || []).filter((_, i) => i !== index)
        }));
    };

    const handleExport = () => {
        if (records.length === 0) {
            toast.error("No data to export");
            return;
        }

        const data = records.map(b => ({
            Date: b.date,
            'Party Name': b.partyName,
            'GR Number': b.grNo,
            'Bill Number': b.billNo,
            'Lorry Number': b.lorryNo,
            'Lorry Type': b.lorryType,
            'From': b.fromPlace,
            'To': b.toPlace,
            'Weight': b.weight,
            'Freight': b.freight,
            'Other Expenses': b.otherExpenses,
            'Advance': b.advance,
            'Total Balance': b.totalBalance,
            'Payment Status': b.paymentStatus
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-size columns
        const colWidths: any[] = [];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

        for (let C = range.s.c; C <= range.e.c; ++C) {
            let maxWidth = 10;
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellAddress];
                if (cell && cell.v) {
                    const cellLength = cell.v.toString().length;
                    maxWidth = Math.max(maxWidth, cellLength);
                }
            }
            colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
        }
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Booking Register");
        XLSX.writeFile(wb, `Booking_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel exported successfully!");
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading("Reading file...");

        try {
            const data = await file.arrayBuffer();
            // cellDates: true ensures Excel serial dates are converted to JS Date objects
            const workbook = XLSX.read(data, { cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Smart Header Detection (Score-based)
            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            let headerRowIndex = 0;
            let maxScore = 0;

            const knownKeywords = [
                'date', 'booking', 'party', 'customer', 'name', 'client',
                'gr', 'lr', 'bill', 'invoice',
                'lorry', 'truck', 'vehicle', 'type',
                'weight', 'wt', 'kg',
                'from', 'source', 'to', 'dest',
                'freight', 'amount', 'advance', 'balance', 'status'
            ];

            // Scan first 15 rows
            for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
                let score = 0;
                const row = rawRows[i];
                if (!row || !Array.isArray(row)) continue;

                const rowCells = row.map(c => String(c).toLowerCase().trim());

                rowCells.forEach(cell => {
                    if (knownKeywords.some(k => cell.includes(k))) {
                        score++;
                    }
                });

                if (score > maxScore) {
                    maxScore = score;
                    headerRowIndex = i;
                }
            }

            console.log(`Using Header Row Index: ${headerRowIndex} (Score: ${maxScore})`);
            const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

            if (jsonData.length === 0) {
                toast.error("File appears empty or unreadable", { id: toastId });
                setIsImporting(false);
                return;
            }

            let successCount = 0;
            let failCount = 0;
            // Collect keys found (for debugging/user feedback)
            const foundKeys = jsonData.length > 0 ? Object.keys(jsonData[0] as object).join(', ') : 'None';
            console.log("Found Keys:", foundKeys);

            // Helper to find value by flexible key matching
            const getValue = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const key of keys) {
                    // 1. Exact match (case insensitive)
                    let foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                    if (foundKey) return row[foundKey];

                    // 2. "Contains" match (if strict exact failed, try lenient) 
                    if (key.length > 3) {
                        foundKey = rowKeys.find(k => k.toLowerCase().includes(key.toLowerCase().trim()));
                        if (foundKey) return row[foundKey];
                    }
                }
                return undefined;
            };

            // Helper to safely parse dates
            const parseDate = (val: any): string => {
                if (!val) return new Date().toISOString().split('T')[0];
                if (val instanceof Date) {
                    const offset = val.getTimezoneOffset() * 60000;
                    return new Date(val.getTime() - offset).toISOString().split('T')[0];
                }
                if (typeof val === 'string') {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                }
                return new Date().toISOString().split('T')[0];
            };

            for (const row of jsonData) {
                try {
                    const partyName = getValue(row, ['Party Name', 'Party', 'Customer Name', 'Customer', 'Client Name', 'Billed To']);

                    // Skip rows without Party Name (Primary Key-ish)
                    if (!partyName) {
                        failCount++;
                        continue;
                    }

                    const booking: BookingRecord = {
                        date: parseDate(getValue(row, ['Date', 'Booking Date', 'Inv Date'])),
                        partyName: String(partyName).trim(),
                        grNo: String(getValue(row, ['GR Number', 'GR No', 'LR Number', 'LR No', 'GR']) || ''),
                        billNo: String(getValue(row, ['Bill Number', 'Bill No', 'Invoice No', 'Bill', 'Invoice']) || ''),
                        lorryNo: String(getValue(row, ['Lorry Number', 'Lorry No', 'Truck No', 'Vehicle No', 'Lorry', 'Truck']) || ''),
                        lorryType: (String(getValue(row, ['Lorry Type', 'Type'])).toLowerCase().includes('open') ? 'Open' : 'Closed'),
                        weight: Number(getValue(row, ['Weight', 'Wt', 'Kgs', 'Net Weight'])) || 0,
                        fromPlace: String(getValue(row, ['From', 'Source', 'Origin']) || ''),
                        toPlace: String(getValue(row, ['To', 'Destination']) || ''),
                        freight: Number(getValue(row, ['Freight', 'Freight Amount', 'Total Freight', 'Rate'])) || 0,
                        advance: Number(getValue(row, ['Advance', 'Advance Amount', 'Less Advance'])) || 0,
                        otherExpenses: Number(getValue(row, ['Other Expenses', 'Other Charges', 'Extra'])) || 0,
                        balance: 0,
                        totalBalance: Number(getValue(row, ['Total Balance', 'Balance', 'Total', 'Net'])) || 0,
                        paymentStatus: (String(getValue(row, ['Payment Status', 'Status'])).toLowerCase().includes('complete') ? 'Completed' : 'Pending')
                    };

                    // Auto-calculate logic
                    const calculatedBalance = booking.freight + booking.otherExpenses - booking.advance;

                    if (!booking.totalBalance || booking.totalBalance === 0) {
                        booking.totalBalance = calculatedBalance;
                        booking.balance = booking.totalBalance - booking.otherExpenses;
                    } else {
                        booking.balance = booking.totalBalance - booking.otherExpenses;
                    }

                    await saveBookingRecord(booking);
                    successCount++;
                } catch (err) {
                    console.error("Booking Import Row Failed:", row, err);
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Imported ${successCount} records! ${failCount > 0 ? `(${failCount} skipped)` : ''}`, { id: toastId });
                await loadData();
            } else {
                toast.error(`No valid records found. ${failCount} skipped.`, { id: toastId });
            }

        } catch (error) {
            console.error("File processing error:", error);
            toast.error("Failed to process file.", { id: toastId });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = filteredRecords.map(r => r.id).filter((id): id is number => id !== undefined);
            setSelectedRows(new Set(allIds));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleSelectRow = (id: number | undefined, checked: boolean) => {
        if (!id) return;
        const newSelected = new Set(selectedRows);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedRows(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) {
            toast.error('No rows selected');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedRows.size} record(s)?`)) {
            return;
        }

        const toastId = toast.loading('Deleting records...');
        try {
            await Promise.all(
                Array.from(selectedRows).map(id => deleteBookingRecord(id))
            );
            toast.success(`Successfully deleted ${selectedRows.size} record(s)`, { id: toastId });
            setSelectedRows(new Set());
            await loadData();
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error('Failed to delete some records', { id: toastId });
        }
    };

    const filteredRecords = records.filter(r =>
        (r.partyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.grNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.lorryNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalBookings = records.length;
    const totalRevenue = records.reduce((sum, r) => sum + (Number(r.freight) || 0), 0);
    const openBookings = records.filter(r => r.paymentStatus === 'Pending').length;

    return (
        <div className="bg-white/70 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg min-h-[500px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 self-start">
                    <button onClick={onBack} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-all group" title="Back">
                        <ArrowLeftIcon className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <h2 className="text-2xl font-bold text-ssk-blue">Booking Register</h2>
                </div>
                {view === 'list' && (
                    <div className="flex gap-2">
                        {selectedRows.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-md"
                            >
                                <TrashIcon className="w-5 h-5" />
                                Delete ({selectedRows.size})
                            </button>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx, .xls" />
                        <button
                            onClick={handleImportClick}
                            disabled={isImporting}
                            className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div> : <UploadIcon className="w-5 h-5" />}
                            Import
                        </button>
                        <button
                            onClick={handleExport}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Export CSV
                        </button>
                        <button
                            onClick={() => { setFormData(initialRecord); setView('form'); }}
                            className="bg-ssk-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-md"
                        >
                            <PlusIcon className="w-5 h-5" /> Add Row
                        </button>
                    </div>
                )}
            </div>

            {/* Dashboard Overview */}
            {view === 'list' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-bold">Total Bookings</p>
                                <p className="text-2xl font-bold text-green-700">{totalBookings}</p>
                            </div>
                            <ListIcon className="w-8 h-8 text-green-300" />
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-bold">Total Revenue</p>
                                <p className="text-2xl font-bold text-blue-700">₹{totalRevenue.toLocaleString()}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-bold">₹</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-bold">Open Bookings</p>
                                <p className="text-2xl font-bold text-red-700">{openBookings}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-red-200 flex items-center justify-center text-red-600 font-bold">!</div>
                        </div>
                    </div>

                    <div className="mb-4 relative">
                        <input
                            type="text"
                            placeholder="Search by Party, GR No, Lorry No..."
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
                                    <th className="px-4 py-3 w-12">
                                        <input
                                            type="checkbox"
                                            checked={filteredRecords.length > 0 && filteredRecords.every(r => r.id && selectedRows.has(r.id))}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Party Name</th>
                                    <th className="px-4 py-3">GR No</th>
                                    <th className="px-4 py-3">Lorry No</th>
                                    <th className="px-4 py-3">Route</th>
                                    <th className="px-4 py-3 text-right">Freight</th>
                                    <th className="px-4 py-3 text-right">Balance</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={10} className="p-8 text-center">Loading...</td></tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr><td colSpan={10} className="p-8 text-center text-gray-500">No records found.</td></tr>
                                ) : (
                                    filteredRecords.map(r => (
                                        <tr key={r.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={r.id ? selectedRows.has(r.id) : false}
                                                    onChange={(e) => handleSelectRow(r.id, e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3">{r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-'}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{r.partyName}</td>
                                            <td className="px-4 py-3 text-blue-600">{r.grNo}</td>
                                            <td className="px-4 py-3">{r.lorryNo}</td>
                                            <td className="px-4 py-3 text-xs">{r.fromPlace} - {r.toPlace}</td>
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
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Booking Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Booking ID</label>
                                    <input type="text" placeholder="Auto / Optional" value={formData.bookingId || ''} onChange={e => setFormData({ ...formData, bookingId: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Party Name*</label>
                                    <input type="text" required value={formData.partyName} onChange={e => setFormData({ ...formData, partyName: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Date*</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">GR Number*</label>
                                    <input type="text" required value={formData.grNo} onChange={e => setFormData({ ...formData, grNo: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Bill Number</label>
                                    <input type="text" value={formData.billNo || ''} onChange={e => setFormData({ ...formData, billNo: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Lorry Number*</label>
                                    <input
                                        list="truck-list"
                                        type="text"
                                        value={formData.lorryNo}
                                        onChange={e => setFormData({ ...formData, lorryNo: e.target.value.toUpperCase() })}
                                        className="w-full p-2 border rounded uppercase"
                                        placeholder="Select or Type"
                                        required
                                    />
                                    <datalist id="truck-list">
                                        {savedTrucks.map(truck => (
                                            <option key={truck.id || truck.truckNo} value={truck.truckNo} />
                                        ))}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Lorry Type</label>
                                    <select value={formData.lorryType} onChange={e => setFormData({ ...formData, lorryType: e.target.value as any })} className="w-full p-2 border rounded">
                                        <option value="Closed">Closed</option>
                                        <option value="Open">Open</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Weight (kg)*</label>
                                    <input type="number" required value={formData.weight} onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">From*</label>
                                    <input type="text" required value={formData.fromPlace} onChange={e => setFormData({ ...formData, fromPlace: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">To*</label>
                                    <input type="text" required value={formData.toPlace} onChange={e => setFormData({ ...formData, toPlace: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Financials Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border">
                                <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Charges</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Freight (₹)*</label>
                                        <input type="number" required value={formData.freight} onChange={e => setFormData({ ...formData, freight: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Other Expenses (₹)</label>
                                        <input type="number" value={formData.otherExpenses} onChange={e => setFormData({ ...formData, otherExpenses: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border">
                                <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Summary & Status</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                                        <span className="text-sm text-gray-600">Total Freight</span>
                                        <span className="font-bold">₹{formData.freight}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                                        <span className="text-sm text-gray-600">Total Advances</span>
                                        <span className="font-bold text-green-600">- ₹{formData.advance}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                                        <span className="text-sm text-gray-600">Other Expenses</span>
                                        <span className="font-bold">+ ₹{formData.otherExpenses}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 bg-blue-50 px-2 rounded">
                                        <span className="text-sm font-bold text-blue-800">Total Due Balance</span>
                                        <span className="font-bold text-blue-800 text-lg">₹{formData.totalBalance}</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Payment Status</label>
                                        <select value={formData.paymentStatus} onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as any })} className="w-full p-2 border rounded bg-gray-50">
                                            <option value="Pending">Pending</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advance Payments Section */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">Advance Payments</h3>
                                <div className="text-sm font-bold text-gray-600">Total: ₹{formData.advance}</div>
                            </div>

                            {/* List of Payments */}
                            {Array.isArray(formData.advances) && formData.advances.length > 0 && (
                                <div className="mb-4 space-y-2">
                                    {formData.advances.map((payment, index) => (
                                        <div key={index} className="flex items-center gap-4 bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                                            <div className="font-bold w-24">₹{payment.amount}</div>
                                            <div className="text-gray-500 w-32">{payment.date ? new Date(payment.date).toLocaleDateString('en-GB') : '-'}</div>
                                            <div className="flex-grow text-gray-600 truncate">{payment.notes || '-'}</div>
                                            <button type="button" onClick={() => handleRemovePayment(index)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add New Payment Input Row */}
                            <div className="flex flex-col md:flex-row gap-3 items-end bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                                <div className="w-full md:w-32">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Amount (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={newPayment.amount || ''}
                                        onChange={e => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })}
                                        className="w-full p-2 border rounded text-sm"
                                    />
                                </div>
                                <div className="w-full md:w-40">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newPayment.date}
                                        onChange={e => setNewPayment({ ...newPayment, date: e.target.value })}
                                        className="w-full p-2 border rounded text-sm"
                                    />
                                </div>
                                <div className="flex-grow w-full">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Notes</label>
                                    <input
                                        type="text"
                                        placeholder="Optional notes (e.g. Bank Ref)"
                                        value={newPayment.notes || ''}
                                        onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
                                        className="w-full p-2 border rounded text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddPayment}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 font-semibold text-sm flex items-center shadow-sm"
                                >
                                    <PlusIcon className="w-4 h-4 mr-1" /> Add Payment
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setView('list')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                                Cancel
                            </button>
                            <button type="submit" className="px-6 py-2 bg-ssk-blue text-white rounded-lg hover:bg-blue-800 font-semibold flex items-center gap-2 shadow-lg">
                                <SaveIcon className="w-5 h-5" /> Save Booking
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default BookingRegister;
