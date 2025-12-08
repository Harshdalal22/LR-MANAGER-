
import React, { useState } from 'react';
import { SavedParty } from '../types';
import { DashboardIcon, PencilIcon, TrashIcon, SearchIcon, PlusIcon, SaveIcon } from './icons';
import { toast } from 'react-hot-toast';

interface PartyManagementProps {
    savedParties: SavedParty[];
    onSave: (party: SavedParty) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onBack: () => void;
}

const initialParty: SavedParty = {
    name: '',
    address: '',
    city: '',
    contact: '',
    pan: '',
    gst: '',
    type: 'Both'
};

const PartyManagement: React.FC<PartyManagementProps> = ({ savedParties, onSave, onDelete, onBack }) => {
    const [editingParty, setEditingParty] = useState<SavedParty>(initialParty);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingParty.name) {
            toast.error('Party name is required');
            return;
        }
        await onSave(editingParty);
        setEditingParty(initialParty);
        setIsEditing(false);
    };

    const handleEdit = (party: SavedParty) => {
        setEditingParty(party);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this party?')) {
            await onDelete(id);
            if (editingParty.id === id) {
                setEditingParty(initialParty);
                setIsEditing(false);
            }
        }
    };

    const handleCancel = () => {
        setEditingParty(initialParty);
        setIsEditing(false);
    };

    const filteredParties = savedParties.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Form Section */}
            <div className="w-full lg:w-1/3 order-1 lg:order-2">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50 sticky top-28">
                    <h3 className="text-xl font-bold text-ssk-blue mb-4">
                        {isEditing ? 'Edit Party' : 'Add New Party'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Party Type</label>
                            <select 
                                value={editingParty.type} 
                                onChange={e => setEditingParty({...editingParty, type: e.target.value as any})}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="Both">Both</option>
                                <option value="Consignor">Consignor</option>
                                <option value="Consignee">Consignee</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Name*</label>
                            <input 
                                type="text" 
                                value={editingParty.name}
                                onChange={e => setEditingParty({...editingParty, name: e.target.value})}
                                className="w-full p-2 border rounded-md"
                                placeholder="Company Name"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                            <textarea 
                                value={editingParty.address}
                                onChange={e => setEditingParty({...editingParty, address: e.target.value})}
                                className="w-full p-2 border rounded-md"
                                placeholder="Full Address"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                                <input 
                                    type="text" 
                                    value={editingParty.city}
                                    onChange={e => setEditingParty({...editingParty, city: e.target.value})}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Contact</label>
                                <input 
                                    type="text" 
                                    value={editingParty.contact}
                                    onChange={e => setEditingParty({...editingParty, contact: e.target.value})}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">PAN</label>
                                <input 
                                    type="text" 
                                    value={editingParty.pan}
                                    onChange={e => setEditingParty({...editingParty, pan: e.target.value})}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">GSTIN</label>
                                <input 
                                    type="text" 
                                    value={editingParty.gst}
                                    onChange={e => setEditingParty({...editingParty, gst: e.target.value})}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
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
                        <h2 className="text-2xl font-bold text-ssk-blue">Manage Parties</h2>
                    </div>

                    <div className="mb-4 relative">
                        <input
                            type="text"
                            placeholder="Search parties..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-ssk-blue"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>

                    <div className="space-y-3">
                        {filteredParties.map(party => (
                            <div key={party.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-800 text-lg">{party.name}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${party.type === 'Both' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {party.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{party.address}, {party.city}</p>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-500 font-medium">
                                        {party.gst && <span>GST: {party.gst}</span>}
                                        {party.contact && <span>Ph: {party.contact}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(party)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => party.id && handleDelete(party.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredParties.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                No parties found. Add one to get started.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartyManagement;
