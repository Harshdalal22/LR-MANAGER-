import React, { useState, useEffect } from 'react';
import {
    TruckIcon,
    DocumentTextIcon,
    UsersIcon,
    CurrencyRupeeIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    CalendarIcon,
    PhoneIcon,
    MailIcon,
    BellIcon,
    SearchIcon,
    FilterIcon,
    DownloadIcon,
    UploadIcon,
    RefreshIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    ListIcon,
    GridIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    ActivityIcon,
    TargetIcon,
    AwardIcon,
    StarIcon,
    BoltIcon,
    HeartIcon,
    RocketIcon,
    InfoIcon,
    DashboardIcon,
    SettingsIcon,
    UserIcon,
    CloseIcon,
} from './icons';

interface ManagerPanel3DProps {
    onClose?: () => void;
}

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactElement;
    color: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'lime' | 'fuchsia';
    trend?: {
        direction: 'up' | 'down';
        value: string;
    };
    delay?: number;
}

interface TaskCardProps {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    assignee?: string;
    progress?: number;
    onClick?: () => void;
}

interface QuickLinkProps {
    title: string;
    icon: React.ReactElement;
    onClick: () => void;
    color: string;
}

// 3D Metric Card with depth and shadows
const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color, trend, delay = 0 }) => {
    const [isHovered, setIsHovered] = useState(false);

    const colorThemes = {
        cyan: {
            gradient: 'from-cyan-400 via-cyan-500 to-blue-500',
            shadow: 'shadow-cyan-500/50',
            glow: 'group-hover:shadow-cyan-500/80',
            text: 'text-cyan-600',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/30',
            ring: 'ring-cyan-500/50',
        },
        emerald: {
            gradient: 'from-emerald-400 via-emerald-500 to-green-500',
            shadow: 'shadow-emerald-500/50',
            glow: 'group-hover:shadow-emerald-500/80',
            text: 'text-emerald-600',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            ring: 'ring-emerald-500/50',
        },
        amber: {
            gradient: 'from-amber-400 via-amber-500 to-orange-500',
            shadow: 'shadow-amber-500/50',
            glow: 'group-hover:shadow-amber-500/80',
            text: 'text-amber-600',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            ring: 'ring-amber-500/50',
        },
        rose: {
            gradient: 'from-rose-400 via-rose-500 to-pink-500',
            shadow: 'shadow-rose-500/50',
            glow: 'group-hover:shadow-rose-500/80',
            text: 'text-rose-600',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            ring: 'ring-rose-500/50',
        },
        violet: {
            gradient: 'from-violet-400 via-violet-500 to-purple-500',
            shadow: 'shadow-violet-500/50',
            glow: 'group-hover:shadow-violet-500/80',
            text: 'text-violet-600',
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/30',
            ring: 'ring-violet-500/50',
        },
        sky: {
            gradient: 'from-sky-400 via-sky-500 to-blue-500',
            shadow: 'shadow-sky-500/50',
            glow: 'group-hover:shadow-sky-500/80',
            text: 'text-sky-600',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/30',
            ring: 'ring-sky-500/50',
        },
        lime: {
            gradient: 'from-lime-400 via-lime-500 to-green-500',
            shadow: 'shadow-lime-500/50',
            glow: 'group-hover:shadow-lime-500/80',
            text: 'text-lime-600',
            bg: 'bg-lime-500/10',
            border: 'border-lime-500/30',
            ring: 'ring-lime-500/50',
        },
        fuchsia: {
            gradient: 'from-fuchsia-400 via-fuchsia-500 to-pink-500',
            shadow: 'shadow-fuchsia-500/50',
            glow: 'group-hover:shadow-fuchsia-500/80',
            text: 'text-fuchsia-600',
            bg: 'bg-fuchsia-500/10',
            border: 'border-fuchsia-500/30',
            ring: 'ring-fuchsia-500/50',
        },
    };

    const theme = colorThemes[color];

    return (
        <div
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-2xl
                       border-2 ${theme.border} shadow-2xl ${theme.shadow} ${theme.glow}
                       transform transition-all duration-700 hover:scale-[1.03] hover:-translate-y-3 hover:rotate-1
                       animate-slideInUp cursor-pointer`}
            style={{ animationDelay: `${delay}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Animated mesh gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-700`}></div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-0 left-0 w-32 h-32 bg-gradient-to-br ${theme.gradient} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-float`}></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${theme.gradient} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-float-delayed`}></div>
            </div>

            <div className="relative p-6 z-10">
                {/* Icon with 3D depth */}
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${theme.gradient} shadow-2xl ${theme.shadow}
                               transform transition-all duration-500 group-hover:scale-125 group-hover:rotate-12 mb-4
                               ring-4 ${theme.ring}`}>
                    {React.cloneElement(icon, { className: 'w-7 h-7 text-white drop-shadow-lg' })}
                </div>

                {/* Title */}
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    {title}
                    {trend && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                                       ${trend.direction === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {trend.direction === 'up' ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                            {trend.value}
                        </span>
                    )}
                </h3>

                {/* Value with scale animation */}
                <p className={`text-5xl font-black ${theme.text} mb-2 transition-all duration-300 
                             ${isHovered ? 'scale-110 tracking-wider' : ''} drop-shadow-sm`}>
                    {value}
                </p>

                {/* Subtitle */}
                {subtitle && (
                    <p className="text-sm text-gray-600 font-medium">{subtitle}</p>
                )}
            </div>

            {/* Shimmer effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none
                           bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12
                           ${isHovered ? 'translate-x-full' : '-translate-x-full'}`}
                style={{ transition: 'transform 1.2s ease-in-out' }}>
            </div>
        </div>
    );
};

// Task Card with priority indicators
const TaskCard: React.FC<TaskCardProps> = ({ title, description, priority, dueDate, assignee, progress, onClick }) => {
    const priorityStyles = {
        high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
        medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
        low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
    };

    const style = priorityStyles[priority];

    return (
        <div
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border-2 border-gray-200/50
                       shadow-xl hover:shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1
                       cursor-pointer"
        >
            {/* Priority indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${style.dot}`}></div>

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors mb-1">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text} border ${style.border} ml-3 whitespace-nowrap`}>
                        {priority.toUpperCase()}
                    </span>
                </div>

                {/* Progress bar */}
                {progress !== undefined && (
                    <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-500 font-semibold">Progress</span>
                            <span className="text-xs font-bold text-gray-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="font-medium">{dueDate}</span>
                    </div>
                    {assignee && (
                        <div className="flex items-center gap-1">
                            <UserIcon className="w-4 h-4" />
                            <span className="font-medium">{assignee}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Quick Link Button
const QuickLink: React.FC<QuickLinkProps> = ({ title, icon, onClick, color }) => {
    return (
        <button
            onClick={onClick}
            className={`group flex flex-col items-center justify-center p-6 rounded-2xl bg-white/80 backdrop-blur-xl
                       border-2 border-gray-200/50 shadow-lg hover:shadow-2xl
                       transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 ${color}`}
        >
            <div className="mb-3 transform transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">
                {React.cloneElement(icon, { className: 'w-8 h-8' })}
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors text-center">
                {title}
            </span>
        </button>
    );
};

const ManagerPanel3D: React.FC<ManagerPanel3DProps> = ({ onClose }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeView, setActiveView] = useState<'dashboard' | 'tasks' | 'reports'>('dashboard');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Mock data
    const todayTasks: TaskCardProps[] = [
        {
            title: 'Review Pending LRs',
            description: 'Check and approve 15 pending lorry receipts from yesterday',
            priority: 'high',
            dueDate: 'Today, 5:00 PM',
            assignee: 'You',
            progress: 60,
        },
        {
            title: 'Update Truck Database',
            description: 'Add new truck registrations and update maintenance records',
            priority: 'medium',
            dueDate: 'Tomorrow',
            assignee: 'Team',
            progress: 30,
        },
        {
            title: 'Client Meeting - ABC Logistics',
            description: 'Discuss new freight rates and contract renewal',
            priority: 'high',
            dueDate: 'Today, 3:00 PM',
            progress: 0,
        },
        {
            title: 'Generate Weekly Report',
            description: 'Compile weekly performance metrics and send to admin',
            priority: 'low',
            dueDate: 'Friday',
            assignee: 'You',
            progress: 80,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900 p-4 md:p-8 overflow-hidden relative">
            {/* Animated background mesh */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full opacity-30">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>
            </div>

            {/* Main Container */}
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="p-5 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-3xl shadow-2xl shadow-cyan-500/50 
                                              transform hover:scale-110 hover:rotate-6 transition-all duration-500 ring-4 ring-white/30">
                                    <RocketIcon className="w-12 h-12 text-white drop-shadow-2xl" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                            </div>
                            <div>
                                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 
                                             drop-shadow-lg animate-gradient leading-tight">
                                    Manager Dashboard
                                </h1>
                                <p className="text-gray-300 mt-2 flex items-center gap-2 text-sm">
                                    <ClockIcon className="w-4 h-4" />
                                    {currentTime.toLocaleString('en-IN', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-8 py-4 bg-white/10 backdrop-blur-2xl border-2 border-white/30 rounded-2xl text-white font-bold
                                         hover:bg-white/20 hover:border-white/50 transition-all duration-300 hover:scale-105 shadow-2xl
                                         flex items-center gap-2 group"
                            >
                                <CloseIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                Close Panel
                            </button>
                        )}
                    </div>
                </div>

                {/* Navigation Pills */}
                <div className="mb-8 flex gap-3 p-2 bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/20 overflow-x-auto">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" /> },
                        { id: 'tasks', label: 'My Tasks', icon: <CheckCircleIcon className="w-5 h-5" /> },
                        { id: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-5 h-5" /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all duration-500 whitespace-nowrap
                                     ${activeView === tab.id
                                    ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white shadow-2xl shadow-cyan-500/50 scale-105'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white hover:scale-105'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Dashboard View */}
                {activeView === 'dashboard' && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard
                                title="Today's LRs"
                                value="47"
                                subtitle="8 pending approval"
                                icon={<DocumentTextIcon />}
                                color="cyan"
                                trend={{ direction: 'up', value: '+12%' }}
                                delay={0}
                            />
                            <MetricCard
                                title="Active Trucks"
                                value="124"
                                subtitle="18 on route"
                                icon={<TruckIcon />}
                                color="emerald"
                                trend={{ direction: 'up', value: '+5%' }}
                                delay={100}
                            />
                            <MetricCard
                                title="Revenue Today"
                                value="₹3.2L"
                                subtitle="Target: ₹4L"
                                icon={<CurrencyRupeeIcon />}
                                color="amber"
                                trend={{ direction: 'up', value: '+18%' }}
                                delay={200}
                            />
                            <MetricCard
                                title="Pending Tasks"
                                value="12"
                                subtitle="4 high priority"
                                icon={<ExclamationTriangleIcon />}
                                color="rose"
                                trend={{ direction: 'down', value: '-3' }}
                                delay={300}
                            />
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3">
                                <BoltIcon className="w-8 h-8 text-yellow-300" />
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <QuickLink
                                    title="Create LR"
                                    icon={<PlusIcon className="text-blue-600" />}
                                    onClick={() => alert('Create LR')}
                                    color="hover:bg-blue-50"
                                />
                                <QuickLink
                                    title="View LRs"
                                    icon={<ListIcon className="text-purple-600" />}
                                    onClick={() => alert('View LRs')}
                                    color="hover:bg-purple-50"
                                />
                                <QuickLink
                                    title="Manage Parties"
                                    icon={<UsersIcon className="text-green-600" />}
                                    onClick={() => alert('Manage Parties')}
                                    color="hover:bg-green-50"
                                />
                                <QuickLink
                                    title="Truck Fleet"
                                    icon={<TruckIcon className="text-orange-600" />}
                                    onClick={() => alert('Truck Fleet')}
                                    color="hover:bg-orange-50"
                                />
                                <QuickLink
                                    title="Reports"
                                    icon={<ChartBarIcon className="text-pink-600" />}
                                    onClick={() => setActiveView('reports')}
                                    color="hover:bg-pink-50"
                                />
                                <QuickLink
                                    title="Settings"
                                    icon={<SettingsIcon className="text-gray-600" />}
                                    onClick={() => alert('Settings')}
                                    color="hover:bg-gray-50"
                                />
                            </div>
                        </div>

                        {/* Today's Tasks */}
                        <div>
                            <h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3">
                                <TargetIcon className="w-8 h-8 text-green-300" />
                                Today's Priority Tasks
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {todayTasks.map((task, index) => (
                                    <TaskCard key={index} {...task} onClick={() => alert(`Opening: ${task.title}`)} />
                                ))}
                            </div>
                        </div>

                        {/* Performance Summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/20 p-8 shadow-2xl">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <ActivityIcon className="w-6 h-6 text-cyan-400" />
                                    Weekly Performance
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'LRs Created', value: 245, max: 300, color: 'from-cyan-500 to-blue-500' },
                                        { label: 'Revenue Generated', value: 85, max: 100, color: 'from-emerald-500 to-green-500' },
                                        { label: 'Customer Satisfaction', value: 92, max: 100, color: 'from-amber-500 to-orange-500' },
                                        { label: 'On-Time Delivery', value: 88, max: 100, color: 'from-violet-500 to-purple-500' },
                                    ].map((item, index) => (
                                        <div key={index}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-semibold text-gray-300">{item.label}</span>
                                                <span className="text-sm font-bold text-white">{item.value}%</span>
                                            </div>
                                            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-3 bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 shadow-lg`}
                                                    style={{ width: `${(item.value / item.max) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/20 p-8 shadow-2xl">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <AwardIcon className="w-6 h-6 text-yellow-400" />
                                    Achievements
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { title: 'Top Performer', description: 'Highest LRs this month', icon: <StarIcon className="w-6 h-6 text-yellow-400" /> },
                                        { title: 'Quick Responder', description: '95% response rate', icon: <BoltIcon className="w-6 h-6 text-cyan-400" /> },
                                        { title: 'Customer Favorite', description: '4.8/5 rating', icon: <HeartIcon className="w-6 h-6 text-pink-400" /> },
                                        { title: 'Efficiency Master', description: '30% faster processing', icon: <RocketIcon className="w-6 h-6 text-purple-400" /> },
                                    ].map((achievement, index) => (
                                        <div key={index} className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                                            <div className="flex-shrink-0 p-3 bg-gradient-to-br from-white/20 to-white/10 rounded-xl">
                                                {achievement.icon}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">{achievement.title}</h4>
                                                <p className="text-sm text-gray-300">{achievement.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tasks View */}
                {activeView === 'tasks' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/20 p-8 shadow-2xl">
                            <h2 className="text-3xl font-bold text-white mb-6">All Tasks</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {todayTasks.map((task, index) => (
                                    <TaskCard key={index} {...task} onClick={() => alert(`Opening: ${task.title}`)} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports View */}
                {activeView === 'reports' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/20 p-8 shadow-2xl">
                            <h2 className="text-3xl font-bold text-white mb-6">Reports & Analytics</h2>
                            <div className="text-center py-16 text-gray-300">
                                <ChartBarIcon className="w-20 h-20 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Detailed reports and analytics will be displayed here</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    50% { transform: translateY(-20px) translateX(10px); }
                }

                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    50% { transform: translateY(20px) translateX(-10px); }
                }

                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.6s ease-in-out;
                }

                .animate-slideInUp {
                    animation: slideInUp 0.8s ease-out forwards;
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-float-delayed {
                    animation: float-delayed 8s ease-in-out infinite;
                }

                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 4s ease infinite;
                }
            `}</style>
        </div>
    );
};

export default ManagerPanel3D;
