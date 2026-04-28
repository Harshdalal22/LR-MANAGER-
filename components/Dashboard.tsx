
import React, { useState } from 'react';
import { LorryReceipt, LRStatus, View } from '../types';
import { CurrencyRupeeIcon, TruckIcon, UsersIcon, ListIcon, CreateIcon, PencilIcon, CheckCircleIcon, ClockIcon, XIcon, UploadIcon, DashboardIcon, InvoiceIcon, DocumentTextIcon, ArrowLeftIcon, CogIcon, ExclamationTriangleIcon, PhoneIcon, WrenchIcon, MapPinIcon, CreditCardIcon, ChatBubbleIcon, SirenIcon, TowTruckIcon, FuelIcon, BatteryIcon, ShieldCheckIcon } from './icons';
import { Language, t } from '../utils/translations';

interface DashboardProps {
    lorryReceipts: LorryReceipt[];
    onAddNew: () => void;
    onViewList: () => void;
    onViewVouchers?: () => void;
    onEditLR: (lrNo: string) => void;
    setCurrentView: (view: View) => void;
    language: Language;
    activeSection: 'lr' | 'data' | 'emergency' | null;
    setActiveSection: (section: 'lr' | 'data' | 'emergency' | null) => void;
    currentRole: 'Admin' | 'Manager' | 'Operator';
    rbacEnabled?: boolean;
    managerRequests?: any[]; // Array of pending requests
    onApproveManagerRequest?: (request: any) => void;
    onRejectManagerRequest?: (requestId: string) => void;
}

interface StatCardProps {
    icon: React.ReactElement<{ className?: string }>;
    title: string;
    value: string | number;
    color: string; // Tailwind color class like 'blue', 'green'
    onClick?: () => void;
    className?: string;
}

// 3D Stat Card Component
const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, onClick, className = '' }) => {
    // Map simplified color names to tailwind classes for the 3D effect
    const colorMap: Record<string, { bg: string, border: string, text: string, shadow: string }> = {
        blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', shadow: 'shadow-blue-200' },
        green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', shadow: 'shadow-green-200' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', shadow: 'shadow-purple-200' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', shadow: 'shadow-orange-200' },
        yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', shadow: 'shadow-yellow-200' },
        red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', shadow: 'shadow-red-200' },
    };

    const styles = colorMap[color] || colorMap['blue'];

    return (
        <div
            onClick={onClick}
            className={`
                group relative overflow-hidden
                bg-white rounded-3xl p-6
                border border-gray-100 border-b-8 ${styles.border}
                shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)]
                transform transition-all duration-500 ease-out
                active:scale-95 hover:-translate-y-2
                flex items-center justify-between
                animate-fadeInUp
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            <div className="z-10 relative">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-gray-600 transition-colors">{title}</p>
                <p className="text-3xl font-black text-gray-800 tracking-tight">{value}</p>
            </div>
            <div className={`p-4 rounded-2xl ${styles.bg} ${styles.text} shadow-inner group-hover:scale-110 transition-transform duration-500 relative z-10`}>
                {React.cloneElement(icon, { className: "w-8 h-8" })}
            </div>
            {/* Decorative background circle */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${styles.bg} opacity-50 z-0`}></div>
        </div>
    );
};

// 3D Management Card Component
const ManagementCard: React.FC<{ title: string; description?: string; icon: React.ReactElement<{ className?: string }>; onClick?: () => void; href?: string; colorTheme: 'blue' | 'purple' | 'orange' | 'green' | 'teal' | 'gray' | 'red' }> = ({ title, description, icon, onClick, href, colorTheme }) => {

    const themes = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-200',
        purple: 'from-purple-500 to-purple-600 shadow-purple-200',
        orange: 'from-orange-500 to-orange-600 shadow-orange-200',
        green: 'from-green-500 to-green-600 shadow-green-200',
        teal: 'from-teal-500 to-teal-600 shadow-teal-200',
        gray: 'from-gray-600 to-gray-700 shadow-gray-200',
        red: 'from-red-500 to-red-600 shadow-red-200',
    };

    const gradient = themes[colorTheme] || themes['blue'];
    const Wrapper = href ? 'a' : 'div';

    return (
        <Wrapper
            onClick={onClick}
            href={href}
            target={href ? "_blank" : undefined}
            rel={href ? "noreferrer" : undefined}
            className={`
                group relative overflow-hidden
                bg-white rounded-3xl p-6 md:p-8
                shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)]
                border border-gray-100 border-b-[6px] border-gray-200 hover:border-b-[6px] hover:border-[${gradient.split(' ')[1].replace('to-', '')}]
                transform transition-all duration-500 ease-out
                hover:-translate-y-2 active:scale-95 active:border-b-2
                cursor-pointer
                flex flex-row sm:flex-col items-center sm:text-center gap-5
                block no-underline
                animate-fadeInUp
            `}
        >
            {/* 3D background blob */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br ${gradient} blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700`}></div>

            {/* Icon Container */}
            <div className={`
                p-5 rounded-3xl relative z-10
                bg-gradient-to-br ${gradient}
                text-white shadow-xl group-hover:shadow-2xl
                flex-shrink-0 group-hover:scale-110 transition-transform duration-500
            `}>
                {React.cloneElement(icon, { className: "w-8 h-8" })}
            </div>

            {/* Text Content */}
            <div className="flex-grow relative z-10">
                <h3 className="text-xl font-black text-gray-800 group-hover:text-blue-600 transition-colors tracking-tight">
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed font-medium">
                        {description}
                    </p>
                )}
            </div>

            {/* Mobile Arrow */}
            <div className="sm:hidden text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </Wrapper>
    );
};

// Comprehensive Emergency Service Card
const EmergencyServiceCard: React.FC<{
    title: string;
    features: string[];
    icon: React.ReactElement<{ className?: string }>;
    colorTheme: 'blue' | 'orange' | 'green' | 'red';
    actionText: string;
    onAction: () => void;
}> = ({ title, features, icon, colorTheme, actionText, onAction }) => {
    const themeStyles = {
        blue: { gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-800', btn: 'bg-blue-600 hover:bg-blue-700' },
        orange: { gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50', text: 'text-orange-800', btn: 'bg-orange-600 hover:bg-orange-700' },
        green: { gradient: 'from-emerald-500 to-green-600', bg: 'bg-green-50', text: 'text-green-800', btn: 'bg-green-600 hover:bg-green-700' },
        red: { gradient: 'from-red-600 to-pink-600', bg: 'bg-red-50', text: 'text-red-800', btn: 'bg-red-600 hover:bg-red-700' },
    };

    const style = themeStyles[colorTheme];

    return (
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col h-full transform transition-all duration-500 ease-out hover:-translate-y-2 group animate-fadeInUp">
            <div className={`h-28 bg-gradient-to-r ${style.gradient} relative overflow-hidden`}>
                {/* Abstract geometric shapes for modern feel */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>

                <div className="absolute -bottom-8 left-6 p-4 bg-white rounded-2xl shadow-xl border border-gray-50 group-hover:scale-110 transition-transform duration-500 z-10">
                    {React.cloneElement(icon, { className: `w-8 h-8 ${style.text}` })}
                </div>
            </div>
            <div className="pt-10 px-6 pb-6 flex-grow flex flex-col">
                <h3 className="text-xl font-black text-gray-800 mb-4">{title}</h3>
                <ul className="space-y-2 mb-6 flex-grow">
                    {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600 font-medium">
                            <span className={`mr-2 mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.btn}`}></span>
                            {feature}
                        </li>
                    ))}
                </ul>
                <button
                    onClick={onAction}
                    className={`w-full py-4 rounded-2xl text-white font-black text-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all active:scale-95 ${style.btn}`}
                >
                    {actionText}
                </button>
            </div>
        </div>
    );
};

const QuickActionButton: React.FC<{ icon: React.ReactElement; label: string; color: string; onClick: () => void }> = ({ icon, label, color, onClick }) => (
    <button
        onClick={onClick}
        className={`group flex flex-col items-center justify-center p-4 rounded-[1.5rem] bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_10px_25px_rgb(0,0,0,0.1)] active:scale-90 transform transition-all duration-300 hover:-translate-y-1 ${color}`}
    >
        <div className="mb-2 transform scale-110">
            {icon}
        </div>
        <span className="text-xs font-bold text-center leading-tight">{label}</span>
    </button>
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
                    className="absolute bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl z-10 transform -translate-x-1/2 -translate-y-4 transition-all duration-200 pointer-events-none"
                    style={{
                        left: `${((hoveredIndex / (data.length - 1)) * 100)}%`,
                        top: '10%'
                    }}
                >
                    <div className="font-bold whitespace-nowrap mb-1 text-center border-b border-gray-700 pb-1">{data[hoveredIndex].dateStr}</div>
                    <div className="font-mono text-green-400 font-bold text-center">₹{data[hoveredIndex].value.toLocaleString('en-IN')}</div>
                    {/* Tiny arrow pointing down */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
            )}

            {/* X-Axis Labels */}
            <div className="w-full flex justify-between px-2 mt-2">
                {data.map((d, i) => (
                    <div key={i} className={`text-[9px] sm:text-xs text-gray-500 font-medium transition-colors duration-200 ${hoveredIndex === i ? 'text-blue-600 font-bold' : ''}`}>
                        {d.label}
                    </div>
                ))}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({
    lorryReceipts,
    onAddNew,
    onViewList,
    onViewVouchers,
    onEditLR,
    setCurrentView,
    language,
    activeSection,
    setActiveSection,
    currentRole,
    rbacEnabled,
    managerRequests = [],
    onApproveManagerRequest,
    onRejectManagerRequest
}) => {

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
            <div className="flex flex-col items-center justify-start md:justify-center min-h-[70vh] gap-6 animate-fadeInUp pt-8 pb-20">
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 mb-4 text-center drop-shadow-md tracking-tight leading-tight animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    {t[language].welcome}
                </h1>

                {/* Vertical Stack on Mobile, Grid on Desktop */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-6xl px-4">

                    {/* Manager Approval Section (Admin Only - Moved to Main Screen) */}
                    {managerRequests.length > 0 && currentRole === 'Admin' && (
                        <div className="md:col-span-full w-full mb-2">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                Pending Manager Requests
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {managerRequests.map(req => (
                                    <div key={req.id} className="bg-white border-[3px] border-blue-100 p-4 md:p-5 rounded-2xl shadow-[0_8px_15px_-3px_rgba(37,99,235,0.2)] md:hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.3)] transition-all flex flex-col justify-between h-full hover:-translate-y-1 animate-pulse">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-extrabold text-blue-900 text-lg sm:text-base">{req.manager_name}</h5>
                                                <span className="bg-blue-100 text-blue-700 text-[10px] md:text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2 mt-0.5">New Request</span>
                                            </div>
                                            <p className="text-xs md:text-sm text-gray-500 mb-4 font-mono truncate">{req.manager_email}</p>
                                        </div>
                                        <div className="flex gap-2 w-full mt-auto pt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRejectManagerRequest && onRejectManagerRequest(req.id); }}
                                                className="px-3 md:px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-xs md:text-sm font-bold hover:bg-gray-100 flex-1 shadow-sm active:scale-95 transition-transform"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onApproveManagerRequest && onApproveManagerRequest(req); }}
                                                className="px-3 md:px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-[0_4px_10px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_15px_rgba(37,99,235,0.4)] flex-1 active:scale-95 transition-all"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LR Management Card */}
                    <div
                        onClick={() => setActiveSection('lr')}
                        className="group flex-1 bg-white rounded-[2rem] p-5 sm:p-6 md:p-10 border border-gray-100 hover:border-blue-200 cursor-pointer transition-all duration-500 transform active:scale-95 hover:-translate-y-3 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.3)] animate-fadeInUp" style={{ animationDelay: '0.2s' }}
                    >
                        {/* 3D gradient blob */}
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-100 rounded-full blur-2xl md:blur-3xl -mr-8 -mt-8 md:-mr-10 md:-mt-10 opacity-70 group-hover:scale-110 transition-transform duration-500"></div>

                        <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6 relative z-10">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 sm:p-4 md:p-6 rounded-2xl shadow-[0_10px_15px_-3px_rgba(37,99,235,0.4)] group-hover:shadow-[0_15px_25px_-5px_rgba(37,99,235,0.5)] transition-shadow duration-300">
                                <DocumentTextIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-white" />
                            </div>
                            <div className="text-left flex-grow">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 mb-1 md:mb-3 group-hover:text-blue-700 transition-colors">{t[language].lrManagement}</h2>
                                <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-snug md:leading-relaxed max-w-[200px] sm:max-w-xs">{t[language].lrManagementDesc}</p>
                            </div>
                            <div className="ml-auto md:ml-0 md:mt-4 self-center md:self-start">
                                <span className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-[0_4px_10px_rgba(37,99,235,0.3)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Data Management Card */}
                    <div
                        onClick={() => setActiveSection('data')}
                        className="group flex-1 bg-white rounded-[2rem] p-5 sm:p-6 md:p-10 border border-gray-100 hover:border-purple-200 cursor-pointer transition-all duration-500 transform active:scale-95 hover:-translate-y-3 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(147,51,234,0.3)] animate-fadeInUp" style={{ animationDelay: '0.3s' }}
                    >
                        {/* 3D gradient blob */}
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-purple-100 rounded-full blur-2xl md:blur-3xl -mr-8 -mt-8 md:-mr-10 md:-mt-10 opacity-70 group-hover:scale-110 transition-transform duration-500"></div>

                        <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6 relative z-10">
                            <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-3 sm:p-4 md:p-6 rounded-2xl shadow-[0_10px_15px_-3px_rgba(147,51,234,0.4)] group-hover:shadow-[0_15px_25px_-5px_rgba(147,51,234,0.5)] transition-shadow duration-300">
                                <DashboardIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-white" />
                            </div>
                            <div className="text-left flex-grow">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 mb-1 md:mb-3 group-hover:text-purple-700 transition-colors">{t[language].dataManagement}</h2>
                                <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-snug md:leading-relaxed max-w-[200px] sm:max-w-xs">{rbacEnabled && currentRole === 'Manager' ? "Manage Parties and Trucks" : t[language].dataManagementDesc}</p>
                            </div>
                            <div className="ml-auto md:ml-0 md:mt-4 self-center md:self-start">
                                <span className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-[0_4px_10px_rgba(147,51,234,0.3)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Card */}
                    {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                        <div
                            onClick={() => setActiveSection('emergency')}
                            className="group flex-1 bg-white rounded-[2rem] p-5 sm:p-6 md:p-10 border border-gray-100 hover:border-red-200 cursor-pointer transition-all duration-500 transform active:scale-95 hover:-translate-y-3 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(220,38,38,0.3)] animate-fadeInUp" style={{ animationDelay: '0.4s' }}
                        >
                            {/* 3D gradient blob */}
                            <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-red-100 rounded-full blur-2xl md:blur-3xl -mr-8 -mt-8 md:-mr-10 md:-mt-10 opacity-70 group-hover:scale-110 transition-transform duration-500"></div>

                            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6 relative z-10">
                                <div className="bg-gradient-to-br from-red-500 to-red-700 p-3 sm:p-4 md:p-6 rounded-2xl shadow-[0_10px_15px_-3px_rgba(220,38,38,0.4)] group-hover:shadow-[0_15px_25px_-5px_rgba(220,38,38,0.5)] transition-shadow duration-300">
                                    <ExclamationTriangleIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-white" />
                                </div>
                                <div className="text-left flex-grow">
                                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 mb-1 md:mb-3 group-hover:text-red-700 transition-colors">{t[language].emergency}</h2>
                                    <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-snug md:leading-relaxed max-w-[200px] sm:max-w-xs">{t[language].emergencyDesc}</p>
                                </div>
                                <div className="ml-auto md:ml-0 md:mt-4 self-center md:self-start">
                                    <span className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-[0_4px_10px_rgba(220,38,38,0.3)]">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 pb-20 md:pb-0">
            {/* Header with Back Button */}
            <div className="flex flex-row items-center gap-3 pb-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveSection(null)}
                    className="p-2 bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 text-gray-600 hover:text-blue-600 transition-all active:scale-95"
                    title={t[language].backToHome}
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <h1 className="text-xl md:text-3xl font-black text-gray-800 tracking-tight">
                    {activeSection === 'lr' ? t[language].lrManagementDashboard :
                        activeSection === 'data' ? t[language].dataManagementOperations :
                            t[language].emergencyServices}
                </h1>
            </div>

            {/* --- SECTION: LR MANAGEMENT --- */}
            {activeSection === 'lr' && (
                <div className="animate-fadeInUp space-y-6">
                    {/* Actions Scroll View for Mobile */}
                    <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                        {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                            <button onClick={() => setCurrentView('invoices')} className="flex-shrink-0 flex items-center bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-green-200 transition-all text-sm border-b-4 border-green-700 active:border-b-0 active:translate-y-1">
                                <InvoiceIcon className="w-5 h-5 mr-2" />
                                {t[language].invoices}
                            </button>
                        )}
                        {/* View List button - accessible to ALL roles including Manager */}
                        <button onClick={onViewList} className="flex-shrink-0 flex items-center bg-white text-gray-700 px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all text-sm border-b-4 border-gray-200 active:border-b-0 active:translate-y-1">
                            <ListIcon className="w-5 h-5 mr-2" />
                            {t[language].viewList}
                        </button>
                        {currentRole !== 'Manager' && (
                            <button onClick={onAddNew} className="flex-shrink-0 flex items-center bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 transition-all text-sm border-b-4 border-blue-700 active:border-b-0 active:translate-y-1">
                                <CreateIcon className="w-5 h-5 mr-2" />
                                {t[language].createLR}
                            </button>
                        )}
                        {currentRole !== 'Operator' && (
                            <button onClick={onViewVouchers} className="flex-shrink-0 flex items-center bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-red-200 transition-all text-sm border-b-4 border-red-700 active:border-b-0 active:translate-y-1">
                                <InvoiceIcon className="w-5 h-5 mr-2" />
                                Vouchers
                            </button>
                        )}
                    </div>

                    {/* Manager Info Banner */}
                    {rbacEnabled && currentRole === 'Manager' && (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-sm font-medium animate-fadeInUp">
                            <span className="text-lg">👁️</span>
                            <span>You are in <strong>View Only</strong> mode. You can view all LRs and their details, but cannot create, edit or delete them.</span>
                        </div>
                    )}
                    
                    {/* Operator Info Banner */}
                    {currentRole === 'Operator' && (
                        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-green-800 text-sm font-medium animate-fadeInUp">
                            <span className="text-lg">🛠️</span>
                            <span>You are an <strong>Operator</strong>. You can create LRs, Trucks, and Parties on behalf of your admin.</span>
                        </div>
                    )}

                    {/* Stat Cards - Vertical Stack on Mobile */}
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={<TruckIcon />}
                                    title={t[language].totalLRs}
                                    value={totalLRs}
                                    color="blue"
                                    onClick={onViewList}
                                />
                                {currentRole !== 'Operator' && (
                                    <StatCard
                                        icon={<CurrencyRupeeIcon />}
                                        title={t[language].freightValue}
                                        value={`₹${totalFreight.toLocaleString('en-IN', { maximumFractionDigits: 0, notation: "compact" })}`}
                                        color="green"
                                    />
                                )}
                                <StatCard
                                    icon={<UsersIcon />}
                                    title={t[language].consignors}
                                    value={uniqueConsignors}
                                    color="purple"
                                />
                                <StatCard
                                    icon={<UploadIcon />}
                                    title={t[language].pendingPODs}
                                    value={podsPending}
                                    color="orange"
                                />
                            </div>

                            {/* Status Overview Grid */}
                            <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-shadow duration-300 border border-gray-100">
                                <h3 className="text-xl font-black text-gray-800 mb-5 tracking-tight">{t[language].shipmentStatus}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <StatCard className="p-3 shadow-none border-b-2 bg-gray-50" icon={<CreateIcon />} title={t[language].booked} value={statusCounts['Booked'] || 0} color="blue" />
                                    <StatCard className="p-3 shadow-none border-b-2 bg-gray-50" icon={<TruckIcon />} title={t[language].inTransit} value={statusCounts['In Transit'] || 0} color="yellow" />
                                    <StatCard className="p-3 shadow-none border-b-2 bg-gray-50" icon={<ClockIcon />} title={t[language].outForDelivery} value={statusCounts['Out for Delivery'] || 0} color="orange" />
                                    <StatCard className="p-3 shadow-none border-b-2 bg-gray-50" icon={<CheckCircleIcon />} title={t[language].delivered} value={statusCounts['Delivered'] || 0} color="green" />
                                    <StatCard className="p-3 shadow-none border-b-2 bg-gray-50" icon={<XIcon />} title={t[language].cancelled} value={statusCounts['Cancelled'] || 0} color="red" />
                                </div>
                            </div>

                            {/* Chart & Recent Activity */}
                            <div className={`grid grid-cols-1 ${currentRole !== 'Operator' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>

                                {/* Recent Activity Card */}
                                <div className={`${currentRole !== 'Operator' ? 'lg:col-span-2' : ''} bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-shadow duration-300 border border-gray-100 overflow-hidden`}>
                                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                        <h2 className="text-xl font-black text-gray-800 tracking-tight">{t[language].recentLRs}</h2>
                                    </div>
                                    <div className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-semibold">
                                                    <tr>
                                                        <th className="px-6 py-4">LR No</th>
                                                        <th className="px-6 py-4 hidden sm:table-cell">Date</th>
                                                        <th className="px-6 py-4">Truck</th>
                                                        {currentRole !== 'Operator' && <th className="px-6 py-4 text-right">Freight</th>}
                                                        <th className="px-6 py-4 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {recentLRs.map(lr => (
                                                        <tr key={lr.lrNo} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-blue-600">{lr.lrNo}</td>
                                                            <td className="px-6 py-4 hidden sm:table-cell text-gray-600">{new Date(lr.date).toLocaleDateString('en-GB')}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                                    <span className="font-mono text-gray-700">{lr.truckNo}</span>
                                                                </div>
                                                            </td>
                                                            {currentRole !== 'Operator' && (
                                                                <td className="px-6 py-4 text-right font-bold text-gray-800">₹{Number(lr.freight).toLocaleString('en-IN')}</td>
                                                            )}
                                                            <td className="px-6 py-4 text-center">
                                                                <button onClick={() => onEditLR(lr.lrNo)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart Card */}
                                {currentRole !== 'Operator' && (
                                    <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-shadow duration-300 border border-gray-100 p-6 flex flex-col">
                                        <h2 className="text-xl font-black text-gray-800 mb-6 tracking-tight">{t[language].weeklyTrend}</h2>
                                        <div className="flex-grow flex items-center justify-center min-h-[200px]">
                                            <FreightTrendChart data={chartData} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                </div>
            )}

            {/* --- SECTION: DATA MANAGEMENT --- */}
            {activeSection === 'data' && (
                <div className="animate-fadeInUp space-y-6">
                    <p className="text-gray-500 font-medium mb-6">{t[language].selectModule}</p>

                    {/* Vertical Stack on Mobile, Grid on Larger Screens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                            <ManagementCard
                                title={t[language].vehicleHiring}
                                description="Manage truck hiring records and payments"
                                icon={<TruckIcon />}
                                onClick={() => setCurrentView('vehicle-hiring')}
                                colorTheme="orange"
                            />
                        )}
                        {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                            <ManagementCard
                                title={t[language].bookingRegister}
                                description="Maintain booking records and freight details"
                                icon={<ListIcon />}
                                onClick={() => setCurrentView('booking-register')}
                                colorTheme="green"
                            />
                        )}
                        <ManagementCard
                            title={t[language].manageParties}
                            description="Add or edit consignor and consignee details"
                            icon={<UsersIcon />}
                            onClick={() => setCurrentView('parties')}
                            colorTheme="purple"
                        />
                        <ManagementCard
                            title={t[language].manageTrucks}
                            description="Maintain your fleet or hired truck database"
                            icon={<TruckIcon />}
                            onClick={() => setCurrentView('trucks')}
                            colorTheme="teal"
                        />
                        {currentRole !== 'Operator' && (!rbacEnabled || currentRole === 'Admin') && (
                            <ManagementCard
                                title={t[language].dataSetup}
                                description="Database fixes and system configuration"
                                icon={<CogIcon />}
                                onClick={() => setCurrentView('data-management')}
                                colorTheme="gray"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* --- SECTION: EMERGENCY (REVAMPED) --- */}
            {activeSection === 'emergency' && (
                <div className="animate-fadeInUp space-y-6">
                    <p className="text-gray-500 font-medium mb-6">{t[language].emergencySubtitle}</p>

                    {/* Quick Actions Grid (Mobile-First Sticky/Prominent) */}
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">{t[language].quickActions}</h4>
                        <div className="grid grid-cols-4 gap-2 md:gap-4">
                            <QuickActionButton
                                icon={<SirenIcon className="w-6 h-6 md:w-8 md:h-8 text-red-600" />}
                                label={t[language].accidentReport}
                                color="hover:bg-red-50 hover:border-red-200 text-red-700"
                                onClick={() => alert("Opening Accident Report...")}
                            />
                            <QuickActionButton
                                icon={<TowTruckIcon className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />}
                                label={t[language].towingService}
                                color="hover:bg-orange-50 hover:border-orange-200 text-orange-700"
                                onClick={() => alert("Requesting Towing...")}
                            />
                            <QuickActionButton
                                icon={<FuelIcon className="w-6 h-6 md:w-8 md:h-8 text-green-600" />}
                                label={t[language].fuelDelivery}
                                color="hover:bg-green-50 hover:border-green-200 text-green-700"
                                onClick={() => alert("Requesting Fuel...")}
                            />
                            <QuickActionButton
                                icon={<BatteryIcon className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />}
                                label={t[language].batteryJump}
                                color="hover:bg-yellow-50 hover:border-yellow-200 text-yellow-700"
                                onClick={() => alert("Requesting Battery Service...")}
                            />
                        </div>
                    </div>

                    {/* Main 4 Comprehensive Sections */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <EmergencyServiceCard
                            title={t[language].mechanicTitle}
                            features={t[language].mechanicFeatures}
                            icon={<WrenchIcon />}
                            colorTheme="orange"
                            actionText={t[language].mechanicAction}
                            onAction={() => alert("Mechanic flow initiated")}
                        />
                        <EmergencyServiceCard
                            title={t[language].gpsTitle}
                            features={t[language].gpsFeatures}
                            icon={<MapPinIcon />}
                            colorTheme="blue"
                            actionText={t[language].gpsAction}
                            onAction={() => alert("GPS subscription flow")}
                        />
                        <EmergencyServiceCard
                            title={t[language].fuelTitle}
                            features={t[language].fuelFeatures}
                            icon={<CreditCardIcon />}
                            colorTheme="green"
                            actionText={t[language].fuelAction}
                            onAction={() => alert("Fuel card application")}
                        />
                        <EmergencyServiceCard
                            title={t[language].supportTitle}
                            features={t[language].supportFeatures}
                            icon={<ChatBubbleIcon />}
                            colorTheme="red"
                            actionText={t[language].supportAction}
                            onAction={() => alert("Opening chat...")}
                        />
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Emergency Helplines</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ManagementCard
                            title={t[language].police}
                            description="Dial 100 or 112"
                            icon={<ShieldCheckIcon />}
                            href="tel:100"
                            colorTheme="gray"
                        />
                        <ManagementCard
                            title={t[language].ambulance}
                            description="Dial 108 or 102"
                            icon={<ExclamationTriangleIcon />}
                            href="tel:108"
                            colorTheme="gray"
                        />
                        <ManagementCard
                            title={t[language].highwayHelpline}
                            description="Dial 1033"
                            icon={<TruckIcon />}
                            href="tel:1033"
                            colorTheme="gray"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
