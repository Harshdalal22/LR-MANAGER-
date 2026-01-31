import React, { useState } from 'react';
import { UserRole } from '../types';

interface RoleSelectionProps {
    onRoleSelect: (role: UserRole, passkey: string) => void;
    onCancel: () => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect, onCancel }) => {
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [passkey, setPasskey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!selectedRole) {
            setError('Please select a role');
            return;
        }
        if (!passkey) {
            setError('Please enter your passkey');
            return;
        }
        onRoleSelect(selectedRole, passkey);
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-fadeIn">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Select Your Role</h2>
                    <p className="text-gray-500 font-medium">Choose your access level to continue</p>
                </div>

                {/* Role Selection Cards */}
                <div className="space-y-3 mb-6">
                    <button
                        onClick={() => { setSelectedRole('Admin'); setError(''); }}
                        className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${selectedRole === 'Admin'
                                ? 'border-red-500 bg-red-50 shadow-lg shadow-red-100'
                                : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === 'Admin' ? 'bg-red-500' : 'bg-gray-200'
                                }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${selectedRole === 'Admin' ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-gray-800">Admin</h3>
                                <p className="text-xs text-gray-500">Full system access & settings</p>
                            </div>
                            {selectedRole === 'Admin' && (
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </button>

                    <button
                        onClick={() => { setSelectedRole('Manager'); setError(''); }}
                        className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${selectedRole === 'Manager'
                                ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === 'Manager' ? 'bg-blue-500' : 'bg-gray-200'
                                }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${selectedRole === 'Manager' ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-gray-800">Manager</h3>
                                <p className="text-xs text-gray-500">LR creation & basic operations</p>
                            </div>
                            {selectedRole === 'Manager' && (
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </button>
                </div>

                {/* Passkey Input */}
                {selectedRole && (
                    <div className="mb-6 animate-slideIn">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            {selectedRole} Passkey
                        </label>
                        <input
                            type="password"
                            autoFocus
                            placeholder="Enter your passkey"
                            value={passkey}
                            onChange={(e) => { setPasskey(e.target.value); setError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 text-center text-2xl tracking-widest font-mono"
                        />
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-semibold text-center">
                        {error}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedRole || !passkey}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all ${selectedRole && passkey
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-xl active:scale-95'
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
