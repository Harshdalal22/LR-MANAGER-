
import React, { useState } from 'react';
import { LorryReceipt, LRStatus, View } from '../types';
import { CurrencyRupeeIcon, TruckIcon, UsersIcon, ListIcon, CreateIcon, PencilIcon, CheckCircleIcon, ClockIcon, XIcon, UploadIcon, DashboardIcon, InvoiceIcon, DocumentTextIcon, ArrowLeftIcon, CogIcon } from './icons';

interface DashboardProps {
    lorryReceipts: LorryReceipt[];
    onAddNew: () => void;
    onViewList: () => void;
    onEditLR: (lrNo: string) => void;
    setCurrentView: (view: View) => void;
}

interface StatCardProps {
    icon: React.ReactElement<{ className?: string }>;
    title: string;
    value: string | number;
    color: string;
    onClick?: () => void;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, onClick, className = '' }) => (
    <div 
        onClick={onClick}
        className={`bg-white md:bg-gradient-to-br md:from-white md:to-gray-50 p-4 md:p-6 rounded-xl shadow-sm md:shadow-[0_10px_20px_rgba(0,0,0,0.1)] flex items-center space-x-3 md:space-x-4 border-l-4 ${color} transform active:scale-95 md:hover:-translate-y-1 md:hover:scale-105 transition-all duration-300 cursor-pointer ${className}`}
    >
        <div className="text-2xl md:text-3xl drop-shadow-md flex-shrink-0">
             {React.cloneElement(icon, { className: "w-6 h-6 md:w-8 md:h-8" })}
        </div>
        <div className="min-w-0">
            <p className="text-gray-500 text-xs md:text-sm font-medium truncate">{title}</p>
            <p className="text-lg md:text-2xl font-bold text-gray-800 truncate">{value}</p>
        </div>
    </div>
);

const ManagementCard: React.FC<{ title: string; description?: string; icon: React.ReactElement<{ className?: string }>; onClick: () => void; color?: string }> = ({ title, description, icon, onClick, color = 'bg-blue-50' }) => (
    <div 
        onClick={onClick}
        className="bg-white md:bg-gradient-to-br md:from-white md:to-gray-50 p-4 md:p-8 rounded-xl md:rounded-2xl shadow-sm md:shadow-lg hover:shadow-xl flex flex-col items-center justify-center text-center transform active:scale-95 md:hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-gray-100 group h-full min-h-[140px]"
    >
        <div className={`p-3 md:p-4 rounded-full mb-3 md:mb-4 group-hover:bg-opacity-80 transition-colors ${color}`}>
            {React.cloneElement(icon, { className: "w-8 h-8 md:w-10 md:h-10 text-gray-700" })}
        </div>
        <h3 className="text-sm md:text-xl font-bold text-gray-800 group-hover:text-ssk-blue transition-colors leading-tight px-1 mb-1">{title}</h3>
        {description && <p className="text-xs text-gray-500 hidden md:block">{description}</p>}
    </div>
);

const FreightTrendChart: React.FC<{ data: { label: string; value: number; dateStr: string }[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const values = data.map(d => d.value);
    const maxVal = Math.max(...values, 1000) * 1.1; // Add 10% headroom
    const minVal = 0;

    // SVG ViewBox dimensions
    const width = 300;
    const height = 150;
    const paddingX = 10;
    const paddingY = 20;

    const getX = (index: number) => paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
    const getY = (value: number) => height - paddingY - ((value - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);

    const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
    // Area closes at the bottom corners
    const areaPoints = `${getX(0)},${height - paddingY} ${points} ${getX(data.length - 1)},${height - paddingY}`;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative select-none" onMouseLeave={() => setHoveredIndex(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                        <stop offset="90%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                    const y = getY(maxVal * ratio);
                    return (
                        <line key={ratio} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                    );
                })}

                {/* Area Path */}
                <path d={`M${areaPoints} Z`} fill="url(#chartGradient)" stroke="none" />

                {/* Line Path */}
                <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Interactive Points */}
                {data.map((d, i) => (
                    <g key={i} onMouseEnter={() => setHoveredIndex(i)} className="cursor-pointer">
                        {/* Invisible larger target for easier hovering */}
                        <circle cx={getX(i)} cy={getY(d.value)} r="8" fill="transparent" />
                        {/* Visible point */}
                        <circle 
                            cx={getX(i)} 
                            cy={getY(d.value)} 
                            r={hoveredIndex === i ? 5 : 3} 
                            fill={hoveredIndex === i ? "#fff" : "#2563eb"} 
                            stroke="#2563eb" 
                            strokeWidth="2"
                            className="transition-all duration-200"
                        />
                    </g>
                ))}
            </svg>

            {/* Tooltip */}
            {hoveredIndex !== null && (
                <div 
                    className="absolute bg-gray-800/90 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl backdrop-blur-sm pointer-events-none z-10 transform -translate-x-1/2 -translate-y-4 transition-all duration-200"
                    style={{ 
                        left: `${((hoveredIndex / (data.length - 1)) * 100)}%`, 
                        top: '10%' 
                    }}
                >
                    <div className="font-bold whitespace-nowrap mb-0.5">{data[hoveredIndex].dateStr}</div>
                    <div className="font-mono text-green-300">₹{data[hoveredIndex].value.toLocaleString('en-IN')}</div>
                    {/* Tiny arrow pointing down */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800/90"></div>
                </div>
            )}

            {/* X-Axis Labels */}
            <div className="w-full flex justify-between px-2 mt-2">
                {data.map((d, i) => (
                    <div key={i} className={`text-[10px] sm:text-xs text-gray-500 font-medium transition-colors duration-200 ${hoveredIndex === i ? 'text-blue-600 font-bold scale-110' : ''}`}>
                        {d.label}
                    </div>
                ))}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ lorryReceipts, onAddNew, onViewList, onEditLR, setCurrentView }) => {
    const [activeSection, setActiveSection] = useState<'lr' | 'data' | null>(null);

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
            dateStr: date.toLocaleDateString('en-GB'),
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

    const chartData = last7DaysData.map(d => ({
        label: d.label,
        value: d.freight,
        dateStr: d.dateStr
    }));

    // --- RENDER: MAIN SELECTION MENU ---
    if (!activeSection) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fadeIn py-10">
                 <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-600 mb-8 text-center drop-shadow-sm">
                    Welcome to Bilty Book
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                    {/* LR Management Card */}
                    <div
                        onClick={() => setActiveSection('lr')}
                        className="group bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl border border-blue-50 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center relative overflow-hidden"
                    >
                         <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                         <div className="bg-blue-100 p-6 rounded-full mb-6 group-hover:bg-blue-600 transition-colors duration-300 shadow-inner">
                            <DocumentTextIcon className="w-12 h-12 text-blue-600 group-hover:text-white transition-colors" />
                         </div>
                         <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-blue-700 transition-colors">LR Management</h2>
                         <p className="text-gray-500 leading-relaxed">Create, track, and manage Lorry Receipts. View freight analytics, generate invoices, and monitor shipment status.</p>
                         <div className="mt-6 text-blue-600 font-semibold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                            Open Dashboard →
                         </div>
                    </div>

                    {/* Data Management Card */}
                    <div
                        onClick={() => setActiveSection('data')}
                        className="group bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl border border-purple-50 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center relative overflow-hidden"
                    >
                         <div className="absolute top-0 left-0 w-full h-2 bg-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                         <div className="bg-purple-100 p-6 rounded-full mb-6 group-hover:bg-purple-600 transition-colors duration-300 shadow-inner">
                            <DashboardIcon className="w-12 h-12 text-purple-600 group-hover:text-white transition-colors" />
                         </div>
                         <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-purple-700 transition-colors">Data Management</h2>
                         <p className="text-gray-500 leading-relaxed">Manage Vehicle Hiring, Booking Registers, Parties, Trucks, and configure System Data & Database.</p>
                         <div className="mt-6 text-purple-600 font-semibold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                            Open Menu →
                         </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 pb-20 md:pb-0">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row justify-between items-center pb-2 md:pb-4 border-b">
                <div className="flex items-center gap-4 self-start sm:self-center">
                    <button 
                        onClick={() => setActiveSection(null)} 
                        className="p-2 bg-white rounded-full hover:bg-gray-100 border shadow-sm transition-all group"
                        title="Back to Home"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 drop-shadow-sm">
                        {activeSection === 'lr' ? 'LR Management Dashboard' : 'Data Management & Operations'}
                    </h1>
                </div>
            </div>

            {/* --- SECTION: LR MANAGEMENT --- */}
            {activeSection === 'lr' && (
                <div className="animate-slideIn">
                    {/* Top Action Bar */}
                     <div className="flex flex-wrap md:flex-row md:items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="h-6 w-1 md:h-8 bg-blue-500 rounded-full"></div>
                            <h2 className="text-lg md:text-xl font-bold text-gray-700">Overview & Actions</h2>
                        </div>
                         <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                             <button onClick={() => setCurrentView('invoices')} className="flex items-center bg-green-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold hover:bg-green-700 transition-all shadow-sm border border-green-500 text-xs md:text-base">
                                <InvoiceIcon className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                                Invoices
                            </button>
                            <button onClick={onViewList} className="flex items-center bg-white text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold hover:bg-gray-50 transition-all shadow-sm border border-gray-200 text-xs md:text-base">
                                <ListIcon className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                                View List
                            </button>
                            <button onClick={onAddNew} className="flex items-center bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm border border-blue-600 text-xs md:text-base">
                                <CreateIcon className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                                Create LR
                            </button>
                        </div>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                        <StatCard 
                            icon={<TruckIcon className="text-blue-600"/>} 
                            title="Total LRs" 
                            value={totalLRs} 
                            color="border-blue-500"
                            onClick={onViewList}
                        />
                        <StatCard 
                            icon={<CurrencyRupeeIcon className="text-green-600"/>} 
                            title="Freight Value" 
                            value={`₹${totalFreight.toLocaleString('en-IN', { maximumFractionDigits: 0, notation: "compact" })}`}
                            color="border-green-500"
                        />
                        <StatCard 
                            icon={<UsersIcon className="text-purple-600"/>} 
                            title="Consignors" 
                            value={uniqueConsignors} 
                            color="border-purple-500"
                        />
                        <StatCard 
                            icon={<UploadIcon className="text-orange-600"/>} 
                            title="Pending PODs" 
                            value={podsPending}
                            color="border-orange-500"
                        />
                    </div>
                    
                    {/* Status Overview */}
                    <div className="mb-8">
                         <h3 className="text-sm md:text-lg font-bold text-gray-700 mb-2 md:mb-4 ml-1">Shipment Status</h3>
                         <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
                            <StatCard className="p-2 md:p-4" icon={<CreateIcon className="text-blue-500" />} title="Booked" value={statusCounts['Booked'] || 0} color="border-blue-500" />
                            <StatCard className="p-2 md:p-4" icon={<TruckIcon className="text-yellow-500" />} title="Transit" value={statusCounts['In Transit'] || 0} color="border-yellow-500" />
                            <StatCard className="p-2 md:p-4" icon={<ClockIcon className="text-orange-500" />} title="Out For Del" value={statusCounts['Out for Delivery'] || 0} color="border-orange-500" />
                            <StatCard className="p-2 md:p-4" icon={<CheckCircleIcon className="text-green-500" />} title="Delivered" value={statusCounts['Delivered'] || 0} color="border-green-500" />
                            <StatCard className="p-2 md:p-4" icon={<XIcon className="text-red-500" />} title="Cancelled" value={statusCounts['Cancelled'] || 0} color="border-red-500" />
                         </div>
                    </div>

                    {/* Recent Activity & Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-xl border border-white/50">
                            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Recent Lorry Receipts</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs md:text-sm">
                                    <thead className="text-left text-gray-500">
                                        <tr>
                                            <th className="p-2">LR No.</th>
                                            <th className="p-2 hidden sm:table-cell">Date</th>
                                            <th className="p-2">Truck No.</th>
                                            <th className="p-2 hidden sm:table-cell">Consignee</th>
                                            <th className="p-2 text-right">Freight</th>
                                            <th className="p-2 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentLRs.map(lr => (
                                            <tr key={lr.lrNo} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors">
                                                <td className="p-2 font-medium text-blue-600">{lr.lrNo}</td>
                                                <td className="p-2 hidden sm:table-cell">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                                <td className="p-2">{lr.truckNo}</td>
                                                <td className="p-2 hidden sm:table-cell truncate max-w-[100px]">{lr.consignee.name}</td>
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

                        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-xl border border-white/50 flex flex-col">
                             <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Weekly Trend</h2>
                             <div className="flex-grow flex items-center justify-center">
                                <div className="w-full h-48 md:h-64">
                                    <FreightTrendChart data={chartData} />
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECTION: DATA MANAGEMENT --- */}
            {activeSection === 'data' && (
                <div className="animate-slideIn">
                    <p className="text-gray-500 mb-6">Select a module to manage records or configure system settings.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        <ManagementCard 
                            title="Vehicle Hiring" 
                            description="Manage truck hiring records and payments"
                            icon={<TruckIcon />} 
                            onClick={() => setCurrentView('vehicle-hiring')}
                            color="bg-orange-100 text-orange-600"
                        />
                        <ManagementCard 
                            title="Booking Register" 
                            description="Maintain booking records and freight details"
                            icon={<ListIcon />} 
                            onClick={() => setCurrentView('booking-register')}
                            color="bg-green-100 text-green-600"
                        />
                        <ManagementCard 
                            title="Manage Parties" 
                            description="Add or edit consignor and consignee details"
                            icon={<UsersIcon />} 
                            onClick={() => setCurrentView('parties')} 
                            color="bg-purple-100 text-purple-600"
                        />
                        <ManagementCard 
                            title="Manage Trucks" 
                            description="Maintain your fleet or hired truck database"
                            icon={<TruckIcon />} 
                            onClick={() => setCurrentView('trucks')} 
                            color="bg-teal-100 text-teal-600"
                        />
                        <ManagementCard 
                            title="Data Setup" 
                            description="Database fixes and system configuration"
                            icon={<CogIcon />} 
                            onClick={() => setCurrentView('data-management')} 
                            color="bg-gray-200 text-gray-700"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
