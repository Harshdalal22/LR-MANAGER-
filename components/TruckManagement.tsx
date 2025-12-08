
import React, { useState } from 'react';
import { SavedTruck } from '../types';
import { DashboardIcon, PencilIcon, TrashIcon, SearchIcon, TruckIcon, SaveIcon } from './icons';
import { toast } from 'react-hot-toast';

interface TruckManagementProps {
    savedTrucks: SavedTruck[];
    onSave: (truck: SavedTruck) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onBack: () => void;
}

const initialTruck: SavedTruck = {
    truckNo: '',
    ownerName: '',
    contactNumber: ''
};

const TruckManagement: React.FC<TruckManagementProps> = ({ savedTrucks, onSave, onDelete, onBack }) => {
    const [editingTruck, setEditingTruck] = useState<SavedTruck>(initialTruck);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTruck.truckNo) {
            toast.error('Truck number is required');
            return;
        }
        await onSave(editingTruck);
        setEditingTruck(initialTruck);
        setIsEditing(false);
    };

    const handleEdit = (truck: SavedTruck) => {
        setEditingTruck(truck);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this truck?')) {
            await onDelete(id);
            if (editingTruck.id === id) {
                setEditingTruck(initialTruck);
                setIsEditing(false);
            }
        }
    };

    const handleCancel = () => {
        setEditingTruck(initialTruck);
        setIsEditing(false);
    };

    const filteredTrucks = savedTrucks.filter(t => 
        t.truckNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.ownerName && t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Form Section */}
            <div className="w-full lg:w-1/3 order-1 lg:order-2">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50 sticky top-28">
                     <h3 className="text-xl font-bold text-ssk-blue mb-4 flex items-center">
                        <TruckIcon className="w-6 h-6 mr-2" />
                        {isEditing ? 'Edit Truck' : 'Add New Truck'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Truck Number*</label>
                            <input 
                                type="text" 
                                value={editingTruck.truckNo}
                                onChange={e => setEditingTruck({...editingTruck, truckNo: e.target.value.toUpperCase()})}
                                className="w-full p-2 border rounded-md font-mono"
                                placeholder="MH12AB1234"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Owner Name</label>
                            <input 
                                type="text"
                                value={editingTruck.ownerName}
                                onChange={e => setEditingTruck({...editingTruck, ownerName: e.target.value})}
                                className="w-full p-2 border rounded-md"
                                placeholder="Owner Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Contact Number</label>
                            <input 
                                type="text"
                                value={editingTruck.contactNumber}
                                onChange={e => setEditingTruck({...editingTruck, contactNumber: e.target.value})}
                                className="w-full p-2 border rounded-md"
                                placeholder="Mobile Number"
                            />
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                             <button type="submit" className="flex-1 bg-ssk-blue text-white py-2 rounded-md hover:bg-blue-800 font-bold shadow-md flex items-center justify-center">
                                <SaveIcon className="w-5 h-5 mr-2" />
                                {isEditing ? 'Update' : 'Save'}
                            </button>
                            {isEditing && (
                                <button type="button" onClick={handleCancel} className="px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* List Section */}
            <div className="w-full lg:w-2/3 order-2 lg:order-1">
                 <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <DashboardIcon className="w-6 h-6 text-gray-600"/>
                        </button>
                        <h2 className="text-2xl font-bold text-ssk-blue">Manage Trucks</h2>
                    </div>

                    <div className="mb-4 relative">
                        <input
                            type="text"
                            placeholder="Search trucks..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-ssk-blue"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTrucks.map(truck => (
                            <div key={truck.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg font-mono">{truck.truckNo}</h4>
                                    {(truck.ownerName || truck.contactNumber) && (
                                        <div className="text-sm text-gray-600 mt-1">
                                            {truck.ownerName && <p>{truck.ownerName}</p>}
                                            {truck.contactNumber && <p className="text-xs text-gray-500">{truck.contactNumber}</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(truck)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => truck.id && handleDelete(truck.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredTrucks.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                No trucks found. Add one to get started.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TruckManagement;
