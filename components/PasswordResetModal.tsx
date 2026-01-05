
import React, { useState } from 'react';
import { SaveIcon, XIcon } from './icons';
import { toast } from 'react-hot-toast';

interface PasswordResetModalProps {
    isOpen: boolean;
    onSubmit: (password: string) => Promise<void>;
    onCancel: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onSubmit, onCancel }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        
        setIsLoading(true);
        await onSubmit(password);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Set New Password</h2>
                    <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="Min. 6 characters"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="Re-enter password"
                            required
                            minLength={6}
                        />
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition-colors shadow-sm"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-md disabled:bg-blue-400"
                        >
                            <SaveIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordResetModal;
