import React from 'react';
import { DashboardIcon } from './icons';

interface BookingRegisterProps {
    onBack: () => void;
}

const BookingRegister: React.FC<BookingRegisterProps> = ({ onBack }) => {
    return (
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg min-h-[500px]">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <DashboardIcon className="w-6 h-6 text-gray-600"/>
                </button>
                <h2 className="text-2xl font-bold text-ssk-blue">Booking Register</h2>
            </div>
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-lg font-semibold">Booking Register Module</p>
                <p>Coming Soon</p>
            </div>
        </div>
    );
};

export default BookingRegister;
