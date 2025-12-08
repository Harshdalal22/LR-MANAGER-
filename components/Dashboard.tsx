
import React from 'react';
import { LorryReceipt, LRStatus, View } from '../types';
import { CurrencyRupeeIcon, TruckIcon, UsersIcon, ListIcon, CreateIcon, PencilIcon, CheckCircleIcon, ClockIcon, XIcon, UploadIcon, DashboardIcon } from './icons';

interface DashboardProps {
    lorryReceipts: LorryReceipt[];
    onAddNew: () => void;
    onViewList: () => void;
    onEditLR: (lrNo: string) => void;
    setCurrentView: (view: View) => void;
}

interface StatCardProps {
    icon: React.ReactElement;
    title: string;
    value: string | number;
    color: string;
    onClick?: () => void;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, onClick, className = '' }) => (
    <div 
        onClick={onClick}
        className={`bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.1)] flex items-center space-x-4 border-l-4 ${color} transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 cursor-pointer ${className}`}
    >
        <div className="text-3xl drop-shadow-md">{icon}</div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const ManagementCard: React.FC<{ title: string; icon: React.ReactElement<{ className?: string }>; onClick: () => void }> = ({ title, icon, onClick }) => (
    <div 
        onClick={onClick}
        className="bg-gradient-to-br from-white to-gray-100 p-8 rounded-2xl shadow-[0_20px_50px_rgba(30,58,138,0.15)] hover:shadow-[0_20px_50px_rgba(30,58,138,0.25)] flex flex-col items-center justify-center text-center transform hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-gray-100 group"
    >
        <div className="p-4 bg-blue-50 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
            {React.cloneElement(icon, { className: "w-10 h-10 text-ssk-blue" })}
        </div>
        <h3 className="text-xl font-bold text-gray-800 group-hover:text-ssk-blue transition-colors">{title}</h3>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ lorryReceipts, onAddNew, onViewList, onEditLR, setCurrentView }) => {
    // --- Metric Calculations ---
    const totalLRs = lorryReceipts.length;
    const totalFreight = lorryReceipts.reduce((sum, lr) => sum + (Number(lr.freight) || 0), 0);
    const uniqueConsignors = new Set(lorryReceipts.map(lr => lr.consignor.name.trim())).size;
    const recentLRs = lorryReceipts.slice(0, 5);
    const podsPending = lorryReceipts.filter(lr => lr.status === 'Delivered' && !lr.pod_path).length;

    const statusCounts = lorryReceipts.reduce((acc, lr) => {
        acc[lr.status] = (acc[lr.status] || 0) + 1;
        return acc;
    }, {} as Record<LRStatus, number>);


    // --- Chart Data Calculation ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        return { 
            date, 
            label: date.toLocaleDateString('en-US', { weekday: 'short' }), 
            freight: 0 
        };
    }).reverse();

    lorryReceipts.forEach(lr => {
        const lrDate = new Date(lr.date);
        lrDate.setHours(0, 0, 0, 0);
        const dayData = last7DaysData.find(d => d.date.getTime() === lrDate.getTime());
        if (dayData) {
            dayData.freight += (Number(lr.freight) || 0);
        }
    });

    const maxFreight = Math.max(...last7DaysData.map(d => d.freight), 1); // Avoid division by zero

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-600 drop-shadow-sm">Dashboard</h1>
            </div>

            {/* Section 1: Operations & Management */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-8 w-1 bg-ssk-blue rounded-full"></div>
                    <h2 className="text-2xl font-bold text-gray-800">Operations & Management</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <ManagementCard 
                        title="Vehicle Hiring" 
                        icon={<TruckIcon />} 
                        onClick={() => setCurrentView('vehicle-hiring')} 
                    />
                    <ManagementCard 
                        title="Booking Register" 
                        icon={<ListIcon />} 
                        onClick={() => setCurrentView('booking-register')} 
                    />
                    <ManagementCard 
                        title="Data Management" 
                        icon={<DashboardIcon />} 
                        onClick={() => setCurrentView('data-management')} 
                    />
                </div>
            </section>

            {/* Section 2: LR Management & Analytics */}
            <section>
                 <div className="flex items-center justify-between gap-3 mb-6 mt-12">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1 bg-ssk-red rounded-full"></div>
                        <h2 className="text-2xl font-bold text-gray-800">LR Management & Analytics</h2>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={onViewList} className="flex items-center bg-white text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-all shadow-md hover:shadow-lg border border-gray-100 transform hover:-translate-y-0.5">
                            <ListIcon className="w-5 h-5 mr-2" />
                            View All LRs
                        </button>
                        <button onClick={onAddNew} className="flex items-center bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                            <CreateIcon className="w-5 h-5 mr-2" />
                            Create New LR
                        </button>
                    </div>
                </div>

                {/* Sub-Section: Quick Access Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div onClick={() => setCurrentView('parties')} className="bg-purple-50 p-6 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 hover:-translate-y-1">
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <UsersIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Manage Parties</h3>
                            <p className="text-sm text-gray-500">Add or Edit Consignors & Consignees</p>
                        </div>
                    </div>
                    <div onClick={() => setCurrentView('trucks')} className="bg-teal-50 p-6 rounded-xl border border-teal-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 hover:-translate-y-1">
                        <div className="p-3 bg-teal-100 rounded-full text-teal-600">
                            <TruckIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Manage Trucks</h3>
                            <p className="text-sm text-gray-500">Save Truck details for quick selection</p>
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                        icon={<TruckIcon className="w-8 h-8 text-blue-600"/>} 
                        title="Total Lorry Receipts" 
                        value={totalLRs} 
                        color="border-blue-500"
                        onClick={onViewList}
                    />
                    <StatCard 
                        icon={<CurrencyRupeeIcon className="w-8 h-8 text-green-600"/>} 
                        title="Total Freight Value" 
                        value={`₹${totalFreight.toLocaleString('en-IN')}`}
                        color="border-green-500"
                    />
                    <StatCard 
                        icon={<UsersIcon className="w-8 h-8 text-purple-600"/>} 
                        title="Unique Consignors" 
                        value={uniqueConsignors} 
                        color="border-purple-500"
                    />
                    <StatCard 
                        icon={<UploadIcon className="w-8 h-8 text-orange-600"/>} 
                        title="PODs Pending" 
                        value={podsPending}
                        color="border-orange-500"
                    />
                </div>
                
                {/* Status Overview */}
                <div className="mb-8">
                     <h3 className="text-lg font-bold text-gray-700 mb-4 ml-1">Shipment Status</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard className="p-4" icon={<TruckIcon className="w-6 h-6 text-yellow-500" />} title="In Transit" value={statusCounts['In Transit'] || 0} color="border-yellow-500" />
                        <StatCard className="p-4" icon={<ClockIcon className="w-6 h-6 text-orange-500" />} title="Out for Delivery" value={statusCounts['Out for Delivery'] || 0} color="border-orange-500" />
                        <StatCard className="p-4" icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} title="Delivered" value={statusCounts['Delivered'] || 0} color="border-green-500" />
                        <StatCard className="p-4" icon={<CreateIcon className="w-6 h-6 text-blue-500" />} title="Booked" value={statusCounts['Booked'] || 0} color="border-blue-500" />
                        <StatCard className="p-4" icon={<XIcon className="w-6 h-6 text-red-500" />} title="Cancelled" value={statusCounts['Cancelled'] || 0} color="border-red-500" />
                     </div>
                </div>

                {/* Recent Activity & Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Lorry Receipts</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-gray-500">
                                    <tr>
                                        <th className="p-2">LR No.</th>
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Truck No.</th>
                                        <th className="p-2">Consignee</th>
                                        <th className="p-2 text-right">Freight</th>
                                        <th className="p-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentLRs.map(lr => (
                                        <tr key={lr.lrNo} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors">
                                            <td className="p-2 font-medium text-blue-600">{lr.lrNo}</td>
                                            <td className="p-2">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-2">{lr.truckNo}</td>
                                            <td className="p-2">{lr.consignee.name}</td>
                                            <td className="p-2 text-right font-semibold">₹{Number(lr.freight).toLocaleString('en-IN')}</td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => onEditLR(lr.lrNo)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Edit">
                                                    <PencilIcon className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50 flex flex-col">
                         <h2 className="text-xl font-bold text-gray-800 mb-4">7-Day Freight Overview</h2>
                         <div className="flex justify-between items-end h-48 space-x-2 flex-grow">
                            {last7DaysData.map(day => (
                                <div key={day.label} className="flex-1 flex flex-col items-center justify-end group">
                                    <div className="text-xs text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity mb-1" title={`₹${day.freight.toLocaleString('en-IN')}`}>
                                        {`₹${(day.freight / 1000).toFixed(1)}k`}
                                    </div>
                                    <div 
                                        className="w-full bg-gradient-to-t from-blue-900 to-blue-500 rounded-t-md hover:from-blue-700 hover:to-blue-400 transition-all duration-300 shadow-md" 
                                        style={{ height: `${(day.freight / maxFreight) * 100}%`, minHeight: '4px' }}
                                    ></div>
                                    <div className="text-xs text-gray-600 font-bold mt-2">{day.label}</div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
