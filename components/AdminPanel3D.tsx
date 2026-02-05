import React, { useState, useEffect } from 'react';
import {
    UsersIcon,
    CogIcon,
    ShieldCheckIcon,
    TruckIcon,
    DocumentTextIcon,
    ChartBarIcon,
    BellIcon,
    KeyIcon,
    DatabaseIcon,
    CloudIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    CurrencyRupeeIcon,
    ExclamationTriangleIcon,
    UploadIcon,
    DownloadIcon,
    RefreshIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    SearchIcon,
    FilterIcon,
    SettingsIcon,
    UserGroupIcon,
    ServerIcon,
    ActivityIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    CalendarIcon,
    MailIcon,
    PhoneIcon,
    StarIcon,
    HeartIcon,
    BoltIcon,
    RocketIcon,
    TargetIcon,
    AwardIcon,
    InfoIcon,
    ArrowRightIcon,
    CloseIcon,
    DashboardIcon,
    ListIcon,
    GridIcon,
    SendIcon,
    UserIcon,
} from './icons';

interface AdminPanel3DProps {
    onClose?: () => void;
    currentRole: 'Admin' | 'Manager';
}

interface StatCard3DProps {
    title: string;
    value: string | number;
    icon: React.ReactElement;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink' | 'indigo' | 'teal';
    delay?: number;
}

interface ActionCardProps {
    title: string;
    description: string;
    icon: React.ReactElement;
    onClick: () => void;
    color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink' | 'indigo' | 'teal';
    badge?: string;
}

interface ActivityItem {
    id: string;
    user: string;
    action: string;
    timestamp: string;
    type: 'success' | 'warning' | 'error' | 'info';
}

// 3D Stat Card with Glassmorphism
const StatCard3D: React.FC<StatCard3DProps> = ({ title, value, icon, trend, trendValue, color, delay = 0 }) => {
    const [isHovered, setIsHovered] = useState(false);

    const colorThemes = {
        blue: {
            gradient: 'from-blue-500 via-blue-600 to-indigo-600',
            shadow: 'shadow-blue-500/50',
            glow: 'group-hover:shadow-blue-500/70',
            text: 'text-blue-600',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
        },
        purple: {
            gradient: 'from-purple-500 via-purple-600 to-pink-600',
            shadow: 'shadow-purple-500/50',
            glow: 'group-hover:shadow-purple-500/70',
            text: 'text-purple-600',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
        },
        green: {
            gradient: 'from-emerald-500 via-green-600 to-teal-600',
            shadow: 'shadow-green-500/50',
            glow: 'group-hover:shadow-green-500/70',
            text: 'text-green-600',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
        },
        orange: {
            gradient: 'from-orange-500 via-orange-600 to-red-500',
            shadow: 'shadow-orange-500/50',
            glow: 'group-hover:shadow-orange-500/70',
            text: 'text-orange-600',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
        },
        red: {
            gradient: 'from-red-500 via-red-600 to-pink-600',
            shadow: 'shadow-red-500/50',
            glow: 'group-hover:shadow-red-500/70',
            text: 'text-red-600',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
        },
        pink: {
            gradient: 'from-pink-500 via-pink-600 to-rose-600',
            shadow: 'shadow-pink-500/50',
            glow: 'group-hover:shadow-pink-500/70',
            text: 'text-pink-600',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20',
        },
        indigo: {
            gradient: 'from-indigo-500 via-indigo-600 to-purple-600',
            shadow: 'shadow-indigo-500/50',
            glow: 'group-hover:shadow-indigo-500/70',
            text: 'text-indigo-600',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
        },
        teal: {
            gradient: 'from-teal-500 via-teal-600 to-cyan-600',
            shadow: 'shadow-teal-500/50',
            glow: 'group-hover:shadow-teal-500/70',
            text: 'text-teal-600',
            bg: 'bg-teal-500/10',
            border: 'border-teal-500/20',
        },
    };

    const theme = colorThemes[color];

    return (
        <div
            className={`group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border ${theme.border} 
                       shadow-2xl ${theme.shadow} ${theme.glow} 
                       transform transition-all duration-700 hover:scale-105 hover:-translate-y-2
                       animate-fadeInUp`}
            style={{ animationDelay: `${delay}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-700`}></div>

            {/* Floating orbs */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${theme.gradient} rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700`}></div>
            <div className={`absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr ${theme.gradient} rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700`}></div>

            <div className="relative p-6 z-10">
                {/* Icon with 3D effect */}
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${theme.gradient} shadow-xl ${theme.shadow} 
                               transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 mb-4`}>
                    {React.cloneElement(icon, { className: 'w-8 h-8 text-white' })}
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>

                {/* Value with counter animation */}
                <div className="flex items-baseline gap-3">
                    <p className={`text-4xl font-black ${theme.text} transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}>
                        {value}
                    </p>

                    {/* Trend indicator */}
                    {trend && trendValue && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
                                       ${trend === 'up' ? 'bg-green-100 text-green-700' :
                                trend === 'down' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'}`}>
                            {trend === 'up' ? <TrendingUpIcon className="w-3 h-3" /> :
                                trend === 'down' ? <TrendingDownIcon className="w-3 h-3" /> : null}
                            <span>{trendValue}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Shine effect on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none
                           bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 
                           ${isHovered ? 'translate-x-full' : '-translate-x-full'}`}
                style={{ transition: 'transform 1s ease-in-out' }}>
            </div>
        </div>
    );
};

// Action Card with 3D depth
const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon, onClick, color, badge }) => {
    const colorThemes = {
        blue: 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
        purple: 'from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700',
        green: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
        orange: 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
        red: 'from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700',
        pink: 'from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700',
        indigo: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
        teal: 'from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700',
    };

    return (
        <div
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50
                       shadow-xl hover:shadow-2xl transform transition-all duration-500 hover:scale-105 hover:-translate-y-1
                       cursor-pointer"
        >
            {/* Badge */}
            {badge && (
                <div className="absolute top-4 right-4 z-20">
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                        {badge}
                    </span>
                </div>
            )}

            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorThemes[color]} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

            <div className="relative p-6 z-10">
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${colorThemes[color]} shadow-lg mb-4
                               transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    {React.cloneElement(icon, { className: 'w-6 h-6 text-white' })}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                    {title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Arrow indicator */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </div>
        </div>
    );
};

// Activity Feed Item
const ActivityFeedItem: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
    const typeStyles = {
        success: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircleIcon className="w-4 h-4" /> },
        warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
        error: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircleIcon className="w-4 h-4" /> },
        info: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <InfoIcon className="w-4 h-4" /> },
    };

    const style = typeStyles[activity.type];

    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-gray-100 hover:bg-white/80 transition-all duration-300 group">
            <div className={`flex-shrink-0 p-2 rounded-lg ${style.bg} ${style.text}`}>
                {style.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {activity.user}
                </p>
                <p className="text-sm text-gray-600 mt-1">{activity.action}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {activity.timestamp}
                </p>
            </div>
        </div>
    );
};

const AdminPanel3D: React.FC<AdminPanel3DProps> = ({ onClose, currentRole }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'analytics'>('overview');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Mock data
    const recentActivities: ActivityItem[] = [
        { id: '1', user: 'Rajesh Kumar', action: 'Created new LR #LR-2024-001', timestamp: '2 minutes ago', type: 'success' },
        { id: '2', user: 'Priya Sharma', action: 'Updated truck details MH-12-AB-1234', timestamp: '15 minutes ago', type: 'info' },
        { id: '3', user: 'System', action: 'Database backup completed', timestamp: '1 hour ago', type: 'success' },
        { id: '4', user: 'Amit Patel', action: 'Failed login attempt detected', timestamp: '2 hours ago', type: 'warning' },
        { id: '5', user: 'Sneha Reddy', action: 'Generated monthly invoice report', timestamp: '3 hours ago', type: 'info' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8 overflow-hidden relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Main Container */}
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl shadow-blue-500/50 transform hover:scale-110 transition-transform duration-300">
                            <ShieldCheckIcon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient">
                                {currentRole} Control Center
                            </h1>
                            <p className="text-gray-400 mt-1 flex items-center gap-2">
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
                            className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-semibold
                                     hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl"
                        >
                            Close Panel
                        </button>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="mb-8 flex gap-2 p-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Overview', icon: <DashboardIcon className="w-5 h-5" /> },
                        { id: 'users', label: 'Users', icon: <UsersIcon className="w-5 h-5" /> },
                        { id: 'system', label: 'System', icon: <ServerIcon className="w-5 h-5" /> },
                        { id: 'analytics', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5" /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap
                                     ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl shadow-blue-500/50 scale-105'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard3D
                                title="Total Users"
                                value="1,247"
                                icon={<UsersIcon />}
                                trend="up"
                                trendValue="+12%"
                                color="blue"
                                delay={0}
                            />
                            <StatCard3D
                                title="Active LRs"
                                value="3,842"
                                icon={<DocumentTextIcon />}
                                trend="up"
                                trendValue="+8%"
                                color="green"
                                delay={100}
                            />
                            <StatCard3D
                                title="Total Revenue"
                                value="₹24.5L"
                                icon={<CurrencyRupeeIcon />}
                                trend="up"
                                trendValue="+15%"
                                color="purple"
                                delay={200}
                            />
                            <StatCard3D
                                title="System Health"
                                value="98.5%"
                                icon={<ActivityIcon />}
                                trend="neutral"
                                trendValue="Stable"
                                color="teal"
                                delay={300}
                            />
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <BoltIcon className="w-7 h-7 text-yellow-400" />
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <ActionCard
                                    title="User Management"
                                    description="Add, edit, or remove user accounts and manage permissions"
                                    icon={<UserGroupIcon />}
                                    onClick={() => setActiveTab('users')}
                                    color="blue"
                                />
                                <ActionCard
                                    title="System Settings"
                                    description="Configure application settings and preferences"
                                    icon={<CogIcon />}
                                    onClick={() => setActiveTab('system')}
                                    color="purple"
                                />
                                <ActionCard
                                    title="Database Backup"
                                    description="Create and manage database backups"
                                    icon={<DatabaseIcon />}
                                    onClick={() => alert('Database backup initiated')}
                                    color="green"
                                />
                                <ActionCard
                                    title="Security Audit"
                                    description="Review security logs and access controls"
                                    icon={<ShieldCheckIcon />}
                                    onClick={() => alert('Opening security audit')}
                                    color="red"
                                    badge="New"
                                />
                                <ActionCard
                                    title="Analytics Dashboard"
                                    description="View detailed analytics and reports"
                                    icon={<ChartBarIcon />}
                                    onClick={() => setActiveTab('analytics')}
                                    color="indigo"
                                />
                                <ActionCard
                                    title="Notifications"
                                    description="Manage system notifications and alerts"
                                    icon={<BellIcon />}
                                    onClick={() => alert('Opening notifications')}
                                    color="orange"
                                    badge="5"
                                />
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <ActivityIcon className="w-7 h-7 text-green-400" />
                                Recent Activity
                            </h2>
                            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
                                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                    {recentActivities.map((activity) => (
                                        <ActivityFeedItem key={activity.id} activity={activity} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">User Management</h2>
                            <p className="text-gray-300 mb-6">Manage user accounts, roles, and permissions from this panel.</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <button className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                                    <PlusIcon className="w-5 h-5" />
                                    Add New User
                                </button>
                                <button className="px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2">
                                    <SearchIcon className="w-5 h-5" />
                                    Search Users
                                </button>
                                <button className="px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2">
                                    <DownloadIcon className="w-5 h-5" />
                                    Export Data
                                </button>
                            </div>

                            <div className="text-center py-12 text-gray-400">
                                <UsersIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>User management interface will be displayed here</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* System Tab */}
                {activeTab === 'system' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <ServerIcon className="w-6 h-6 text-blue-400" />
                                    Server Status
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">CPU Usage</span>
                                        <span className="text-green-400 font-bold">24%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full" style={{ width: '24%' }}></div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Memory Usage</span>
                                        <span className="text-yellow-400 font-bold">67%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Disk Usage</span>
                                        <span className="text-blue-400 font-bold">45%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <DatabaseIcon className="w-6 h-6 text-purple-400" />
                                    Database Info
                                </h3>
                                <div className="space-y-4 text-gray-300">
                                    <div className="flex justify-between">
                                        <span>Total Records</span>
                                        <span className="font-bold text-white">45,892</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Last Backup</span>
                                        <span className="font-bold text-green-400">2 hours ago</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Database Size</span>
                                        <span className="font-bold text-white">2.4 GB</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Connection Pool</span>
                                        <span className="font-bold text-blue-400">Active (12/20)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">Analytics Dashboard</h2>
                            <div className="text-center py-12 text-gray-400">
                                <ChartBarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Advanced analytics and charts will be displayed here</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-in-out;
                }

                .animate-fadeInUp {
                    animation: fadeInUp 0.6s ease-out forwards;
                }

                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 10px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
};

export default AdminPanel3D;
