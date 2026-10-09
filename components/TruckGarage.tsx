import React, { useState, useMemo, useEffect } from 'react';
import { SavedTruck, LorryReceipt, Voucher } from '../types';
import { getVouchers } from '../services/supabaseService';
import { toast } from 'react-hot-toast';

interface TruckGarageProps {
    savedTrucks: SavedTruck[];
    lorryReceipts?: LorryReceipt[];
    vouchers?: Voucher[];
    initialSelectedTruckNo?: string;
    onSaveTruck: (truck: SavedTruck) => Promise<void>;
    onDeleteTruck: (id: string, truckNo?: string) => Promise<void>;
    onBack: () => void;
    onNavigateToExpenses?: (truckNo: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

// Truck Brands & Sample Models
export const TRUCK_BRANDS = [
    { name: 'Tata Motors', logo: '🚛', color: '#1e40af', models: ['Signa 4825.TK', 'Signa 2823.K', 'Prima 3530.K', 'Signa 4018.S', 'LPT 1916'] },
    { name: 'Ashok Leyland', logo: '☀️', color: '#d97706', models: ['4220 HG', 'AVTR 2820', '4825 Tipper', 'Captain 2518', 'Boss 1415'] },
    { name: 'BharatBenz', logo: '⭐', color: '#0f172a', models: ['2823R', '3528R', '1923C', '4228R Multi-Axle', '5528TT Tractor'] },
    { name: 'Eicher', logo: '🔴', color: '#dc2626', models: ['Pro 6028', 'Pro 3019', 'Pro 2114XP', 'Pro 6048', 'Pro 8035XM'] },
    { name: 'Mahindra', logo: '🚚', color: '#7c3aed', models: ['Blazo X 42', 'Blazo X 28', 'Furio 17', 'Furio 14', 'Cruzo Grande'] },
    { name: 'Volvo', logo: '🛡️', color: '#0369a1', models: ['FH16 750', 'FMX 460', 'FM 420 Tipper', 'FH 500 Tractor'] },
    { name: 'Other', logo: '🚛', color: '#475569', models: ['Standard Heavy Vehicle'] },
];

const TRUCK_TYPES = [
    '16 Wheeler Container',
    '14 Wheeler Open Body',
    '12 Wheeler Tipper',
    '10 Wheeler Turbo',
    '6 Wheeler LCV',
    'Prime Mover Trailer',
    'Multi-Axle Tanker',
    'Closed Container',
];

// Document Status Calculator
export const checkDocStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: 'NOT AVAILABLE', label: 'Not Available', color: 'bg-gray-100 text-gray-500 border-gray-200', days: 999 };
    const exp = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { status: 'EXPIRED', label: `Expired ${Math.abs(diffDays)}d ago`, color: 'bg-rose-50 text-rose-700 border-rose-200', days: diffDays };
    }
    if (diffDays <= 15) {
        return { status: 'EXPIRING SOON', label: `Expires in ${diffDays}d`, color: 'bg-amber-50 text-amber-700 border-amber-200', days: diffDays };
    }
    return { status: 'ACTIVE', label: `Active • ${new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', days: diffDays };
};

// Realistic Double-tone Air Horn Sound
const playTruckHorn = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const playTone = (freq: number, startTime: number, duration: number, gainVal: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            gain.gain.setValueAtTime(gainVal, ctx.currentTime + startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
        };
        playTone(349.23, 0.0, 0.45, 0.35); // F4
        playTone(440.00, 0.05, 0.50, 0.40); // A4
        playTone(349.23, 0.65, 0.55, 0.38); // Second blast
        playTone(440.00, 0.70, 0.60, 0.45);
    } catch (e) {
        console.warn('Horn audio not permitted:', e);
    }
};

// ── Realistic Indian HSRP Number Plate Component ─────────────────────────────
export const IndianNumberPlate: React.FC<{ plateNo: string; size?: 'sm' | 'md' | 'lg' }> = ({ plateNo, size = 'md' }) => {
    const formatted = (plateNo || 'HR 55 AB 1234').toUpperCase().replace(/[\s-]/g, '');
    const state = formatted.slice(0, 2);
    const rto = formatted.slice(2, 4);
    const series = formatted.slice(4, formatted.length - 4);
    const digits = formatted.slice(formatted.length - 4);
    const displayStr = `${state} ${rto} ${series} ${digits}`.trim().replace(/\s+/g, ' ');

    const scaleClass = {
        sm: 'text-xs px-2 py-0.5 border-[1.5px]',
        md: 'text-sm sm:text-base px-3 py-1 border-2',
        lg: 'text-lg sm:text-xl px-4 py-1.5 border-[2.5px]',
    }[size];

    return (
        <div className={`inline-flex items-center bg-white rounded-md border-black/80 shadow-md font-mono font-black tracking-widest text-slate-900 select-none ${scaleClass}`}>
            {/* Left Blue IND Strip */}
            <div className="flex flex-col items-center justify-center bg-[#0038A8] text-white px-1.5 py-0.5 rounded-l-sm mr-2.5 -ml-1 sm:-ml-2 self-stretch">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-yellow-300 flex items-center justify-center mb-0.5">
                    <span className="text-[6px] sm:text-[7px] text-yellow-300 font-bold leading-none">⚙</span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-black tracking-tighter leading-none">IND</span>
            </div>
            {/* Number Text */}
            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">{displayStr || plateNo}</span>
        </div>
    );
};

// ── 3D Realistic Truck Studio Illustration ────────────────────────────────────
const TruckStudioGraphic: React.FC<{
    make?: string;
    model?: string;
    color?: string;
    lightsOn?: boolean;
    isHonking?: boolean;
}> = ({ make = 'Tata Motors', color = '#1e3a8a', lightsOn = true, isHonking = false }) => {
    return (
        <div className="relative w-full max-w-lg mx-auto h-52 sm:h-64 flex items-center justify-center select-none">
            {/* Studio Floor Radial Light & Shadow */}
            <div className="absolute inset-0 bg-gradient-radial from-slate-200/60 via-slate-100/20 to-transparent pointer-events-none rounded-full blur-2xl" />
            
            {/* Contact Floor Shadow Under Wheels */}
            <div className="absolute bottom-4 w-4/5 h-6 bg-gradient-to-t from-black/40 via-black/20 to-transparent rounded-[100%] blur-md transform scale-y-75" />

            {/* Truck SVG Model */}
            <svg viewBox="0 0 540 240" className="w-full h-full drop-shadow-2xl overflow-visible transition-transform duration-300">
                <defs>
                    <linearGradient id="cabinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                        <stop offset="30%" stopColor={color} />
                        <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="bodyMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#334155" />
                        <stop offset="50%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#0284c7" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="50%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                    <radialGradient id="headlightGlow" cx="0%" cy="50%" r="80%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                        <stop offset="40%" stopColor="#facc15" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                    </radialGradient>
                    <filter id="shadow3d" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.25" />
                    </filter>
                </defs>

                {/* --- 1. REAR CARGO CONTAINER BODY --- */}
                <g filter="url(#shadow3d)">
                    {/* Main Container Box */}
                    <rect x="40" y="45" width="280" height="130" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                    {/* Container Ribs Texture */}
                    {[70, 100, 130, 160, 190, 220, 250, 280].map(x => (
                        <g key={x}>
                            <line x1={x} y1="46" x2={x} y2="174" stroke="#475569" strokeWidth="2.5" />
                            <line x1={x + 1} y1="46" x2={x + 1} y2="174" stroke="#0f172a" strokeWidth="1.5" />
                        </g>
                    ))}
                    {/* Container Top Corner Castings */}
                    <rect x="40" y="45" width="12" height="12" fill="url(#chromeGrad)" />
                    <rect x="308" y="45" width="12" height="12" fill="url(#chromeGrad)" />
                    
                    {/* Container Brand Label */}
                    <rect x="60" y="60" width="130" height="26" rx="4" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(255, 255, 255, 0.15)" />
                    <text x="70" y="77" fill="#38bdf8" fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">
                        BILTY EXPRESS
                    </text>
                    <text x="70" y="110" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        ALL INDIA PERMIT • GPS TRACKED
                    </text>
                </g>

                {/* --- 2. TRUCK CHASSIS & UNDERCARRIAGE --- */}
                <rect x="30" y="170" width="460" height="12" rx="2" fill="#0f172a" />
                {/* Diesel Fuel Tank (Silver Cylindrical) */}
                <rect x="180" y="160" width="65" height="22" rx="5" fill="url(#chromeGrad)" stroke="#475569" strokeWidth="1" />
                <line x1="200" y1="160" x2="200" y2="182" stroke="#334155" strokeWidth="2" />
                <line x1="225" y1="160" x2="225" y2="182" stroke="#334155" strokeWidth="2" />
                {/* Tool Box */}
                <rect x="120" y="162" width="40" height="18" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />

                {/* --- 3. CABIN (FRONT TRACTOR UNIT) --- */}
                <g filter="url(#shadow3d)">
                    {/* Aerodynamic Roof Fairing / Deflector */}
                    <path d="M 320,45 L 340,30 L 410,30 L 420,45 Z" fill={color} opacity="0.9" />
                    
                    {/* Main Cabin Body Shell */}
                    <path d="M 320,45 L 420,45 Q 445,45 455,70 L 475,130 Q 480,145 480,165 L 480,180 L 320,180 Z" 
                          fill="url(#cabinGrad)" stroke="#0f172a" strokeWidth="2" />

                    {/* Windshield Glass */}
                    <path d="M 365,55 L 425,55 Q 440,55 448,75 L 460,115 L 365,115 Z" 
                          fill="url(#glassGrad)" stroke="#0284c7" strokeWidth="1.5" />
                    {/* Glass Reflection Glare */}
                    <path d="M 375,60 L 415,60 L 390,110 L 375,110 Z" fill="#ffffff" opacity="0.35" />
                    
                    {/* Side Door Window */}
                    <path d="M 330,60 L 360,60 L 360,115 L 330,115 Z" fill="url(#glassGrad)" stroke="#0369a1" />
                    <rect x="332" y="125" width="12" height="4" rx="1" fill="url(#chromeGrad)" />

                    {/* Cabin Front Chrome Grille */}
                    <path d="M 462,125 L 478,125 L 477,165 L 458,165 Z" fill="#0f172a" />
                    <line x1="462" y1="133" x2="477" y2="133" stroke="url(#chromeGrad)" strokeWidth="2.5" />
                    <line x1="460" y1="141" x2="477" y2="141" stroke="url(#chromeGrad)" strokeWidth="2.5" />
                    <line x1="458" y1="149" x2="477" y2="149" stroke="url(#chromeGrad)" strokeWidth="2.5" />
                    <line x1="458" y1="157" x2="476" y2="157" stroke="url(#chromeGrad)" strokeWidth="2.5" />

                    {/* Brand Badge on Grille */}
                    <circle cx="469" cy="141" r="5" fill="#f8fafc" stroke="#0f172a" strokeWidth="1" />
                    <text x="466.5" y="143.5" fontSize="6" fontWeight="bold" fill="#0f172a">T</text>

                    {/* Heavy Duty Steel Bumper */}
                    <path d="M 450,170 L 490,170 Q 495,170 495,178 L 495,188 L 445,188 Z" fill="url(#chromeGrad)" stroke="#334155" strokeWidth="1.5" />

                    {/* Headlight Housing & Beam */}
                    <rect x="472" y="160" width="14" height="9" rx="2" fill={lightsOn ? '#fef08a' : '#94a3b8'} stroke="#475569" strokeWidth="1" />
                    {lightsOn && (
                        <>
                            {/* Headlight Glow */}
                            <circle cx="482" cy="164" r="10" fill="url(#headlightGlow)" opacity="0.8" />
                            {/* Forward Light Beam */}
                            <polygon points="486,160 550,135 550,210 486,172" fill="url(#headlightGlow)" opacity="0.45" />
                        </>
                    )}

                    {/* Rear View Mirrors */}
                    <rect x="368" y="70" width="4" height="20" rx="1" fill="#0f172a" />
                    <path d="M 370,72 L 378,72 L 378,88 L 370,88 Z" fill="url(#chromeGrad)" stroke="#0f172a" />

                    {/* Roof Air Horn */}
                    <path d="M 390,38 L 415,35 L 418,40 L 390,40 Z" fill="url(#chromeGrad)" />
                    {isHonking && (
                        <g>
                            <circle cx="430" cy="38" r="8" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.8" className="animate-ping" />
                            <text x="430" y="25" fill="#f59e0b" fontSize="12" fontWeight="black">PEEP!</text>
                        </g>
                    )}
                </g>

                {/* --- 4. WHEELS (ALLOY RIMS WITH TREAD) --- */}
                {/* Rear Dual Wheels (Axle 1, Axle 2, Axle 3) & Front Steer Wheel */}
                {[
                    { cx: 80, cy: 182, r: 24 },
                    { cx: 135, cy: 182, r: 24 },
                    { cx: 275, cy: 182, r: 24 },
                    { cx: 435, cy: 182, r: 24 }
                ].map((w, idx) => (
                    <g key={idx} filter="url(#shadow3d)">
                        {/* Outer Black Rubber Tire with Tread */}
                        <circle cx={w.cx} cy={w.cy} r={w.r} fill="#090d16" stroke="#1e293b" strokeWidth="4" />
                        {/* Wheel Rim / Alloy Metal */}
                        <circle cx={w.cx} cy={w.cy} r={w.r - 7} fill="url(#chromeGrad)" stroke="#475569" strokeWidth="1.5" />
                        {/* Wheel Hub Center */}
                        <circle cx={w.cx} cy={w.cy} r={6} fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
                        {/* Lug Nuts */}
                        {[0, 60, 120, 180, 240, 300].map(deg => {
                            const rad = (deg * Math.PI) / 180;
                            const nx = w.cx + 10 * Math.cos(rad);
                            const ny = w.cy + 10 * Math.sin(rad);
                            return <circle key={deg} cx={nx} cy={ny} r="1.5" fill="#334155" />;
                        })}
                    </g>
                ))}
            </svg>
        </div>
    );
};

// ── MAIN TRUCK GARAGE COMPONENT ───────────────────────────────────────────────
export const TruckGarage: React.FC<TruckGarageProps> = ({
    savedTrucks,
    lorryReceipts = [],
    vouchers = [],
    initialSelectedTruckNo,
    onSaveTruck,
    onDeleteTruck,
    onBack,
    onNavigateToExpenses
}) => {
    const [selectedTruckNo, setSelectedTruckNo] = useState<string>(() => {
        if (initialSelectedTruckNo && savedTrucks.some(t => t.truckNo === initialSelectedTruckNo)) {
            return initialSelectedTruckNo;
        }
        return savedTrucks.length > 0 ? savedTrucks[0].truckNo : '';
    });
    const [localVouchers, setLocalVouchers] = useState<Voucher[]>(vouchers);

    useEffect(() => {
        if (vouchers && vouchers.length > 0) {
            setLocalVouchers(vouchers);
        } else {
            getVouchers().then(vs => setLocalVouchers(vs)).catch(() => {});
        }
    }, [vouchers]);

    useEffect(() => {
        if (initialSelectedTruckNo && savedTrucks.some(t => t.truckNo === initialSelectedTruckNo)) {
            setSelectedTruckNo(initialSelectedTruckNo);
        }
    }, [initialSelectedTruckNo, savedTrucks]);

    const [filterCategory, setFilterCategory] = useState<'all' | 'alerts' | 'active'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHonking, setIsHonking] = useState(false);
    const [lightsOn, setLightsOn] = useState(true);
    const [truckColor, setTruckColor] = useState('#1e3a8a');
    const [quickDocModal, setQuickDocModal] = useState<{ isOpen: boolean; docType: string; label: string; currentVal: string } | null>(null);

    // Initial Truck Form State
    const initialFormState: SavedTruck = {
        truckNo: '',
        ownerName: '',
        contactNumber: '',
        make: 'Tata Motors',
        model: 'Signa 4825.TK',
        truckType: '16 Wheeler Container',
        driverName: '',
        driverContact: '',
        insuranceExpiry: '',
        insurancePolicyNo: '',
        insuranceProvider: 'Tata AIG General Insurance',
        pollutionExpiry: '',
        fitnessExpiry: '',
        nationalPermitExpiry: '',
        roadTaxExpiry: '',
        fastagBalance: 1500,
        fastagBank: 'IDBI FASTag',
        emiAmount: 38500,
        emiDueDay: 10,
        financerName: 'HDFC Bank Vehicle Finance',
        status: 'Active'
    };

    const [formState, setFormState] = useState<SavedTruck>(initialFormState);

    // Active Selected Truck
    const activeTruck = useMemo(() => {
        return savedTrucks.find(t => t.truckNo === selectedTruckNo) || savedTrucks[0] || initialFormState;
    }, [savedTrucks, selectedTruckNo]);

    // Financial Spends & Earnings for Active Truck
    const truckFinancials = useMemo(() => {
        if (!activeTruck?.truckNo) return { freightEarned: 0, totalExpenses: 0, netProfit: 0, tripsCount: 0, margin: 0 };
        
        // 1. LRs freight earned by this truck
        const matchedLRs = lorryReceipts.filter(lr => 
            lr.truckNo && lr.truckNo.replace(/[\s-]/g, '').toUpperCase() === activeTruck.truckNo.replace(/[\s-]/g, '').toUpperCase()
        );
        const freightEarned = matchedLRs.reduce((sum, lr) => sum + (Number(lr.freight) || 0), 0);

        // 2. Expenses logged for this truck in vouchers
        const truckRegex = new RegExp(`\\[Truck:\\s*${activeTruck.truckNo}\\]`, 'i');
        const matchedVouchers = localVouchers.filter(v => 
            (v.description && truckRegex.test(v.description)) || 
            (v.party_name && v.party_name.replace(/[\s-]/g, '').toUpperCase() === activeTruck.truckNo.replace(/[\s-]/g, '').toUpperCase())
        );
        const totalExpenses = matchedVouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
        const netProfit = freightEarned - totalExpenses;
        const margin = freightEarned > 0 ? (netProfit / freightEarned) * 100 : 0;

        return {
            freightEarned,
            totalExpenses,
            netProfit,
            tripsCount: matchedLRs.length,
            margin,
            recentLRs: matchedLRs.slice(0, 5),
            recentExpenses: matchedVouchers.slice(0, 5)
        };
    }, [activeTruck, lorryReceipts, localVouchers]);

    // Fleet-Wide Expiry Scanner
    const fleetAlerts = useMemo(() => {
        const alerts: { truckNo: string; type: string; label: string; days: number; critical: boolean }[] = [];
        savedTrucks.forEach(t => {
            const ins = checkDocStatus(t.insuranceExpiry);
            if (ins.status === 'EXPIRED') alerts.push({ truckNo: t.truckNo, type: 'Insurance', label: 'Insurance Expired', days: ins.days, critical: true });
            else if (ins.status === 'EXPIRING SOON') alerts.push({ truckNo: t.truckNo, type: 'Insurance', label: `Insurance Expiring in ${ins.days}d`, days: ins.days, critical: false });

            const puc = checkDocStatus(t.pollutionExpiry);
            if (puc.status === 'EXPIRED') alerts.push({ truckNo: t.truckNo, type: 'Pollution', label: 'PUCC Expired', days: puc.days, critical: true });
            else if (puc.status === 'EXPIRING SOON') alerts.push({ truckNo: t.truckNo, type: 'Pollution', label: `PUCC Expiring in ${puc.days}d`, days: puc.days, critical: false });

            const fit = checkDocStatus(t.fitnessExpiry);
            if (fit.status === 'EXPIRED') alerts.push({ truckNo: t.truckNo, type: 'Fitness', label: 'Fitness Expired', days: fit.days, critical: true });

            if (t.fastagBalance !== undefined && t.fastagBalance < 500) {
                alerts.push({ truckNo: t.truckNo, type: 'FASTag', label: `Low FASTag Balance (₹${t.fastagBalance})`, days: 0, critical: false });
            }
        });
        return alerts;
    }, [savedTrucks]);

    // Filtered Trucks list for carousel
    const filteredTrucks = useMemo(() => {
        return savedTrucks.filter(t => {
            const matchesQuery = t.truckNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (t.ownerName && t.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                 (t.make && t.make.toLowerCase().includes(searchQuery.toLowerCase()));
            if (!matchesQuery) return false;
            if (filterCategory === 'alerts') {
                return fleetAlerts.some(a => a.truckNo === t.truckNo);
            }
            if (filterCategory === 'active') {
                return t.status !== 'Maintenance';
            }
            return true;
        });
    }, [savedTrucks, searchQuery, filterCategory, fleetAlerts]);

    // Handle Form Submit
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.truckNo.trim()) {
            toast.error('Truck Number is required');
            return;
        }
        const cleanedNo = formState.truckNo.toUpperCase().replace(/\s+/g, ' ').trim();
        const payload: SavedTruck = { ...formState, truckNo: cleanedNo };

        try {
            await onSaveTruck(payload);
            setSelectedTruckNo(cleanedNo);
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            toast.success(`Vehicle ${cleanedNo} saved to Garage! 🚛`);
        } catch (err: any) {
            toast.error('Save failed: ' + err.message);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = () => {
        setFormState({ ...activeTruck });
        setIsEditModalOpen(true);
    };

    // Delete Truck
    const handleDelete = async () => {
        if (!activeTruck?.id) return;
        if (window.confirm(`Are you sure you want to remove ${activeTruck.truckNo} from your garage?`)) {
            await onDeleteTruck(activeTruck.id, activeTruck.truckNo);
            toast.success(`Truck ${activeTruck.truckNo} removed`);
            const remaining = savedTrucks.filter(t => t.truckNo !== activeTruck.truckNo);
            if (remaining.length > 0) setSelectedTruckNo(remaining[0].truckNo);
        }
    };

    // Quick Update Single Document
    const handleSaveQuickDoc = async (newVal: string) => {
        if (!quickDocModal || !activeTruck) return;
        const updated: SavedTruck = { ...activeTruck, [quickDocModal.docType]: newVal };
        await onSaveTruck(updated);
        setQuickDocModal(null);
        toast.success(`${quickDocModal.label} updated! ✅`);
    };

    // Trigger Horn
    const handleHonk = () => {
        setIsHonking(true);
        playTruckHorn();
        setTimeout(() => setIsHonking(false), 1200);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-16">
            
            {/* ── Top App Bar ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xl">🚛</span>
                        <h1 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">TRUCK GARAGE</h1>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                            FLEET
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setFormState(initialFormState); setIsAddModalOpen(true); }}
                            className="bg-slate-900 hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <span className="text-base leading-none">+</span>
                            <span>Add Truck</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Fleet Compliance Attention Notification Bar ─────────────── */}
            {fleetAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md">
                    <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-base animate-pulse">⚠️</span>
                            <span className="font-black uppercase tracking-wider text-[11px] bg-black/25 px-2 py-0.5 rounded">
                                {fleetAlerts.length} FLEET ALERTS
                            </span>
                            <span className="truncate">
                                {fleetAlerts[0].truckNo}: {fleetAlerts[0].label}
                                {fleetAlerts.length > 1 && ` (+${fleetAlerts.length - 1} more)`}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedTruckNo(fleetAlerts[0].truckNo);
                                setFilterCategory('alerts');
                            }}
                            className="underline hover:text-amber-100 shrink-0 font-bold text-xs cursor-pointer"
                        >
                            Inspect Truck →
                        </button>
                    </div>
                </div>
            )}

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-6">

                {/* ── HERO STAGE: 3D Truck Showcase (CRED Garage Style) ──────── */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 sm:p-8 text-center relative">
                    
                    {/* Brand Model & Number Plate Header */}
                    <div className="flex flex-col items-center justify-center space-y-2 mb-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                            <span>{activeTruck.make || 'Tata Motors'}</span>
                            <span>•</span>
                            <span>{activeTruck.model || 'Heavy Multi-Axle'}</span>
                            {activeTruck.status && (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    {activeTruck.status}
                                </span>
                            )}
                        </div>

                        {/* Bold Indian HSRP Number Plate */}
                        <div className="py-1">
                            <IndianNumberPlate plateNo={activeTruck.truckNo || 'SELECT TRUCK'} size="lg" />
                        </div>

                        {activeTruck.ownerName && (
                            <p className="text-xs text-slate-400 font-medium">
                                Owner: <strong className="text-slate-700">{activeTruck.ownerName}</strong>
                                {activeTruck.contactNumber && ` (${activeTruck.contactNumber})`}
                            </p>
                        )}
                    </div>

                    {/* Interactive 3D Studio Stage */}
                    <div className="my-2 relative">
                        <TruckStudioGraphic 
                            make={activeTruck.make} 
                            model={activeTruck.model} 
                            color={truckColor} 
                            lightsOn={lightsOn}
                            isHonking={isHonking}
                        />

                        {/* Interactive Stage Controls Floating Overlay */}
                        <div className="absolute right-2 bottom-2 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
                            <button
                                onClick={handleHonk}
                                title="Press Truck Air Horn!"
                                className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-700 transition cursor-pointer flex items-center gap-1"
                            >
                                <span>📢</span>
                                <span className="hidden sm:inline">Horn</span>
                            </button>
                            <div className="w-px h-4 bg-slate-200" />
                            <button
                                onClick={() => setLightsOn(v => !v)}
                                title="Toggle Headlights"
                                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-700 transition cursor-pointer flex items-center gap-1"
                            >
                                <span>{lightsOn ? '💡' : '🌑'}</span>
                                <span className="hidden sm:inline">Lights</span>
                            </button>
                            <div className="w-px h-4 bg-slate-200" />
                            {/* Color Selector */}
                            <div className="flex items-center gap-1">
                                {['#1e3a8a', '#d97706', '#dc2626', '#0f172a', '#059669'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setTruckColor(c)}
                                        style={{ backgroundColor: c }}
                                        className={`w-3.5 h-3.5 rounded-full transition-transform ${truckColor === c ? 'scale-125 ring-2 ring-slate-400' : 'opacity-70'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Banner under truck */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                        <div className="bg-slate-50 rounded-2xl p-3 text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TRIP REVENUE</div>
                            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{fmt(truckFinancials.freightEarned)}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">{truckFinancials.tripsCount} LRs Completed</div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-3 text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TOTAL EXPENSES</div>
                            <div className="text-base sm:text-lg font-black text-rose-600 mt-0.5">{fmt(truckFinancials.totalExpenses)}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">Fuel, Toll, Repairs</div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-3 text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NET PROFIT</div>
                            <div className={`text-base sm:text-lg font-black mt-0.5 ${truckFinancials.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {fmt(truckFinancials.netProfit)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">{truckFinancials.margin.toFixed(1)}% Operating Margin</div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-3 text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MONTHLY EMI</div>
                            <div className="text-base sm:text-lg font-black text-blue-700 mt-0.5">
                                {activeTruck.emiAmount ? fmt(activeTruck.emiAmount) : '—'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                                {activeTruck.emiDueDay ? `Due ${activeTruck.emiDueDay}th of month` : 'No EMI Added'}
                            </div>
                        </div>
                    </div>

                    {/* Manage Vehicle Actions */}
                    <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-slate-100">
                        <button
                            onClick={handleOpenEdit}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <span>✏️</span>
                            <span>Edit Truck Details</span>
                        </button>
                        {onNavigateToExpenses && (
                            <button
                                onClick={() => onNavigateToExpenses(activeTruck.truckNo)}
                                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-orange-200"
                            >
                                <span>💸</span>
                                <span>+ Record Expense</span>
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-rose-200"
                            title="Delete this truck from garage"
                        >
                            <span>🗑️</span>
                        </button>
                    </div>
                </div>

                {/* ── FLEET THUMBNAIL CAROUSEL (CRED Style Horizontal Selector) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">YOUR FLEET ({savedTrucks.length})</span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setFilterCategory('all')} 
                                className={`text-xs px-2.5 py-1 rounded-full font-bold cursor-pointer ${filterCategory === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setFilterCategory('alerts')} 
                                className={`text-xs px-2.5 py-1 rounded-full font-bold cursor-pointer ${filterCategory === 'alerts' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Alerts ({fleetAlerts.length})
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {/* Add Truck Card Button */}
                        <button
                            onClick={() => { setFormState(initialFormState); setIsAddModalOpen(true); }}
                            className="w-28 sm:w-32 h-24 shrink-0 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer group"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center font-bold text-lg mb-1">
                                +
                            </div>
                            <span className="text-[11px] font-bold">Add Truck</span>
                        </button>

                        {/* Trucks Carousel List */}
                        {filteredTrucks.map(truck => {
                            const isSelected = truck.truckNo === activeTruck.truckNo;
                            const hasAlert = fleetAlerts.some(a => a.truckNo === truck.truckNo);

                            return (
                                <div
                                    key={truck.truckNo}
                                    onClick={() => setSelectedTruckNo(truck.truckNo)}
                                    className={`w-36 sm:w-44 h-24 shrink-0 rounded-2xl p-2.5 border-2 transition-all cursor-pointer flex flex-col justify-between relative bg-white ${
                                        isSelected 
                                            ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20' 
                                            : 'border-slate-200 hover:border-slate-300 shadow-xs'
                                    }`}
                                >
                                    {/* Alert Badge Indicator */}
                                    {hasAlert && (
                                        <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" title="Document requires attention" />
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-xl">🚛</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[80px]">
                                            {truck.make || 'Tata'}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="font-mono font-black text-xs sm:text-sm text-slate-900 truncate">
                                            {truck.truckNo}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                            {truck.driverName ? `Driver: ${truck.driverName}` : (truck.ownerName || 'Self')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── CRED GARAGE COMPLIANCE & STATUS TILES ───────────────────── */}
                <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                        VEHICLE COMPLIANCE & SERVICES
                    </div>

                    <div className="space-y-2.5">

                        {/* 1. INSURANCE */}
                        {(() => {
                            const ins = checkDocStatus(activeTruck.insuranceExpiry);
                            return (
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:shadow-md transition">
                                    <div className="space-y-1">
                                        <div className="text-sm sm:text-base font-black text-slate-900 capitalize">
                                            Insurance
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border ${ins.color}`}>
                                                {ins.status}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {activeTruck.insuranceExpiry ? new Date(activeTruck.insuranceExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Expiry date not set'}
                                            </span>
                                        </div>
                                        {activeTruck.insurancePolicyNo && (
                                            <div className="text-xs text-slate-400">
                                                {activeTruck.insuranceProvider || 'General Insurance'} • Policy #{activeTruck.insurancePolicyNo}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setQuickDocModal({ isOpen: true, docType: 'insuranceExpiry', label: 'Insurance Expiry Date', currentVal: activeTruck.insuranceExpiry || '' })}
                                        className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition shrink-0 cursor-pointer"
                                    >
                                        {activeTruck.insuranceExpiry ? 'Update' : 'Add Policy'}
                                    </button>
                                </div>
                            );
                        })()}

                        {/* 2. FASTAG */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:shadow-md transition">
                            <div className="space-y-1">
                                <div className="text-sm sm:text-base font-black text-slate-900 capitalize">
                                    FASTag
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border ${(activeTruck.fastagBalance || 0) > 500 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                        {(activeTruck.fastagBalance || 0) > 500 ? 'SUFFICIENT' : 'LOW BALANCE'}
                                    </span>
                                    <span className="text-xs font-black text-slate-800">
                                        • {fmt(activeTruck.fastagBalance || 0)}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    {activeTruck.fastagBank || 'IDBI FASTag'} • NHAI Automatic Toll
                                </div>
                            </div>
                            <button 
                                onClick={() => setQuickDocModal({ isOpen: true, docType: 'fastagBalance', label: 'Update FASTag Balance (₹)', currentVal: String(activeTruck.fastagBalance || 0) })}
                                className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition shrink-0 cursor-pointer"
                            >
                                Recharge
                            </button>
                        </div>

                        {/* 3. POLLUTION CHECK (PUCC) */}
                        {(() => {
                            const puc = checkDocStatus(activeTruck.pollutionExpiry);
                            return (
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:shadow-md transition">
                                    <div className="space-y-1">
                                        <div className="text-sm sm:text-base font-black text-slate-900 capitalize">
                                            Pollution Check (PUCC)
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border ${puc.color}`}>
                                                {puc.status}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {activeTruck.pollutionExpiry ? new Date(activeTruck.pollutionExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No certificate recorded'}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setQuickDocModal({ isOpen: true, docType: 'pollutionExpiry', label: 'PUCC Expiry Date', currentVal: activeTruck.pollutionExpiry || '' })}
                                        className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition shrink-0 cursor-pointer"
                                    >
                                        Update
                                    </button>
                                </div>
                            );
                        })()}

                        {/* 4. FITNESS CERTIFICATE */}
                        {(() => {
                            const fit = checkDocStatus(activeTruck.fitnessExpiry);
                            return (
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:shadow-md transition">
                                    <div className="space-y-1">
                                        <div className="text-sm sm:text-base font-black text-slate-900 capitalize">
                                            Fitness Certificate
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border ${fit.color}`}>
                                                {fit.status}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {activeTruck.fitnessExpiry ? new Date(activeTruck.fitnessExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'RTO Fitness not set'}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setQuickDocModal({ isOpen: true, docType: 'fitnessExpiry', label: 'Fitness Expiry Date', currentVal: activeTruck.fitnessExpiry || '' })}
                                        className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition shrink-0 cursor-pointer"
                                    >
                                        Update
                                    </button>
                                </div>
                            );
                        })()}

                        {/* 5. MONTHLY EMI TRACKER */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:shadow-md transition">
                            <div className="space-y-1">
                                <div className="text-sm sm:text-base font-black text-slate-900 capitalize">
                                    Vehicle Loan & EMI
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                                        {activeTruck.emiDueDay ? `DUE ON ${activeTruck.emiDueDay}TH` : 'EMI INFO'}
                                    </span>
                                    <span className="text-xs font-black text-slate-800">
                                        • {activeTruck.emiAmount ? `${fmt(activeTruck.emiAmount)} / month` : 'No EMI'}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    {activeTruck.financerName || 'Financer not set'} • Direct Bank Debit
                                </div>
                            </div>
                            <button 
                                onClick={() => setQuickDocModal({ isOpen: true, docType: 'emiAmount', label: 'Monthly EMI Amount (₹)', currentVal: String(activeTruck.emiAmount || 0) })}
                                className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition shrink-0 cursor-pointer"
                            >
                                Pay / Edit
                            </button>
                        </div>

                        {/* 6. ASSIGNED DRIVER */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:shadow-md transition">
                            <div className="space-y-1">
                                <div className="text-sm sm:text-base font-black text-slate-900 capitalize">
                                    Assigned Driver
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                                        {activeTruck.driverName ? 'ASSIGNED' : 'UNASSIGNED'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">
                                        • {activeTruck.driverName || 'No Driver Assigned'}
                                    </span>
                                </div>
                                {activeTruck.driverContact && (
                                    <div className="text-xs text-slate-400">
                                        Contact: {activeTruck.driverContact}
                                    </div>
                                )}
                            </div>
                            {activeTruck.driverContact ? (
                                <a 
                                    href={`tel:${activeTruck.driverContact}`}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition shrink-0 flex items-center gap-1.5"
                                >
                                    <span>📞</span>
                                    <span>Call</span>
                                </a>
                            ) : (
                                <button 
                                    onClick={handleOpenEdit}
                                    className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition shrink-0 cursor-pointer"
                                >
                                    Assign
                                </button>
                            )}
                        </div>

                        {/* 7. DIGITAL GLOVEBOX (Document Vault) */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">📁</span>
                                    <h3 className="font-black text-base tracking-tight">DIGITAL GLOVEBOX</h3>
                                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">DIGILOCKER READY</span>
                                </div>
                                <p className="text-slate-300 text-xs sm:text-sm max-w-md">
                                    Store RC, DL, Insurance policies & RTO road fitness documents in one secure digital vault.
                                </p>
                            </div>
                            <button
                                onClick={() => toast.success('Digital Glovebox documents linked with RC & Policy records.')}
                                className="bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition shrink-0 cursor-pointer"
                            >
                                View Documents 🗂️
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── VEHICLE SPENDS & PROFIT REPORT (Truck Accounting) ───────── */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">VEHICLE FINANCIALS</span>
                            <h3 className="text-xl font-black text-slate-900">Spends & Profit Breakdown</h3>
                        </div>
                        {onNavigateToExpenses && (
                            <button
                                onClick={() => onNavigateToExpenses(activeTruck.truckNo)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                            >
                                + Add Trip Expense
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 text-center">
                            <span className="text-xs font-bold text-blue-700">TOTAL FREIGHT REVENUE</span>
                            <div className="text-2xl font-black text-blue-900 mt-1">{fmt(truckFinancials.freightEarned)}</div>
                            <span className="text-[11px] text-blue-600 font-semibold">{truckFinancials.tripsCount} Completed LRs</span>
                        </div>

                        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 text-center">
                            <span className="text-xs font-bold text-rose-700">TOTAL TRIP EXPENSES</span>
                            <div className="text-2xl font-black text-rose-900 mt-1">{fmt(truckFinancials.totalExpenses)}</div>
                            <span className="text-[11px] text-rose-600 font-semibold">Fuel, Toll, Drivers & Maintenance</span>
                        </div>

                        <div className={`rounded-2xl p-4 text-center border ${truckFinancials.netProfit >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'}`}>
                            <span className={`text-xs font-bold ${truckFinancials.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                NET PROFIT / LOSS
                            </span>
                            <div className={`text-2xl font-black mt-1 ${truckFinancials.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                                {fmt(truckFinancials.netProfit)}
                            </div>
                            <span className={`text-[11px] font-bold ${truckFinancials.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {truckFinancials.margin.toFixed(1)}% Operating Margin
                            </span>
                        </div>
                    </div>

                    {/* Recent LRs for this truck */}
                    {truckFinancials.recentLRs && truckFinancials.recentLRs.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="text-xs font-black uppercase tracking-wider text-slate-500">Recent Trips (LRs)</div>
                            <div className="divide-y divide-slate-100">
                                {truckFinancials.recentLRs.map(lr => (
                                    <div key={lr.lrNo} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                                        <div>
                                            <span className="font-bold text-blue-700">LR #{lr.lrNo}</span>
                                            <span className="text-slate-400 mx-1.5">•</span>
                                            <span className="text-slate-600 font-medium">{lr.fromPlace} → {lr.toPlace}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-slate-900">{fmt(Number(lr.freight) || 0)}</span>
                                            <span className="text-slate-400 text-xs block">{lr.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </main>

            {/* ── ADD / EDIT TRUCK MODAL ──────────────────────────────────── */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🚛</span>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">
                                        {isEditModalOpen ? 'Edit Truck Details' : 'Add New Truck to Garage'}
                                    </h3>
                                    <p className="text-xs text-slate-500">Enter registration, brand, documents and loan details</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-5">
                            
                            {/* Section 1: Vehicle Identification */}
                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                <div className="text-xs font-black uppercase text-slate-500 tracking-wider">1. Basic Vehicle Info</div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Truck Number *</label>
                                        <input 
                                            type="text"
                                            value={formState.truckNo}
                                            onChange={e => setFormState({ ...formState, truckNo: e.target.value.toUpperCase() })}
                                            placeholder="e.g. HR55AB1234"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturer / Make</label>
                                        <select
                                            value={formState.make}
                                            onChange={e => {
                                                const selectedMake = e.target.value;
                                                const brand = TRUCK_BRANDS.find(b => b.name === selectedMake);
                                                setFormState({ 
                                                    ...formState, 
                                                    make: selectedMake,
                                                    model: brand?.models[0] || formState.model
                                                });
                                            }}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            {TRUCK_BRANDS.map(b => (
                                                <option key={b.name} value={b.name}>{b.logo} {b.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Model Name</label>
                                        <input 
                                            type="text"
                                            value={formState.model || ''}
                                            onChange={e => setFormState({ ...formState, model: e.target.value })}
                                            placeholder="e.g. Signa 4825.TK"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Truck Type / Body</label>
                                        <select
                                            value={formState.truckType}
                                            onChange={e => setFormState({ ...formState, truckType: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            {TRUCK_TYPES.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Owner Name</label>
                                        <input 
                                            type="text"
                                            value={formState.ownerName || ''}
                                            onChange={e => setFormState({ ...formState, ownerName: e.target.value })}
                                            placeholder="e.g. Self or Transporter Name"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Owner Contact</label>
                                        <input 
                                            type="text"
                                            value={formState.contactNumber || ''}
                                            onChange={e => setFormState({ ...formState, contactNumber: e.target.value })}
                                            placeholder="e.g. 9876543210"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Driver Info */}
                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                <div className="text-xs font-black uppercase text-slate-500 tracking-wider">2. Driver Assignment</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
                                        <input 
                                            type="text"
                                            value={formState.driverName || ''}
                                            onChange={e => setFormState({ ...formState, driverName: e.target.value })}
                                            placeholder="Driver full name"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Driver Mobile</label>
                                        <input 
                                            type="text"
                                            value={formState.driverContact || ''}
                                            onChange={e => setFormState({ ...formState, driverContact: e.target.value })}
                                            placeholder="10-digit phone number"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Compliance & Expiry Dates */}
                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                <div className="text-xs font-black uppercase text-slate-500 tracking-wider">3. Document Validity & Expiry Dates</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Insurance Expiry</label>
                                        <input 
                                            type="date"
                                            value={formState.insuranceExpiry || ''}
                                            onChange={e => setFormState({ ...formState, insuranceExpiry: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Pollution (PUCC) Expiry</label>
                                        <input 
                                            type="date"
                                            value={formState.pollutionExpiry || ''}
                                            onChange={e => setFormState({ ...formState, pollutionExpiry: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Fitness Expiry</label>
                                        <input 
                                            type="date"
                                            value={formState.fitnessExpiry || ''}
                                            onChange={e => setFormState({ ...formState, fitnessExpiry: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">National Permit Expiry</label>
                                        <input 
                                            type="date"
                                            value={formState.nationalPermitExpiry || ''}
                                            onChange={e => setFormState({ ...formState, nationalPermitExpiry: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Road Tax Paid Upto</label>
                                        <input 
                                            type="date"
                                            value={formState.roadTaxExpiry || ''}
                                            onChange={e => setFormState({ ...formState, roadTaxExpiry: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">FASTag Balance (₹)</label>
                                        <input 
                                            type="number"
                                            value={formState.fastagBalance || 0}
                                            onChange={e => setFormState({ ...formState, fastagBalance: Number(e.target.value) })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Vehicle Loan / EMI Details */}
                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                <div className="text-xs font-black uppercase text-slate-500 tracking-wider">4. Loan / EMI Schedule</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Monthly EMI (₹)</label>
                                        <input 
                                            type="number"
                                            value={formState.emiAmount || 0}
                                            onChange={e => setFormState({ ...formState, emiAmount: Number(e.target.value) })}
                                            placeholder="e.g. 38500"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Due Day (1 - 31)</label>
                                        <input 
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={formState.emiDueDay || 10}
                                            onChange={e => setFormState({ ...formState, emiDueDay: Number(e.target.value) })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Financer / Bank</label>
                                        <input 
                                            type="text"
                                            value={formState.financerName || ''}
                                            onChange={e => setFormState({ ...formState, financerName: e.target.value })}
                                            placeholder="e.g. HDFC Bank, Tata Finance"
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer"
                                >
                                    {isEditModalOpen ? 'Update Vehicle' : 'Save to Garage'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── QUICK DOCUMENT UPDATE MODAL ─────────────────────────────── */}
            {quickDocModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
                        <h4 className="font-black text-slate-900 text-lg mb-1">{quickDocModal.label}</h4>
                        <p className="text-xs text-slate-500 mb-4">Update record for {activeTruck.truckNo}</p>
                        
                        <div className="mb-4">
                            <input
                                type={quickDocModal.docType === 'fastagBalance' || quickDocModal.docType === 'emiAmount' ? 'number' : 'date'}
                                defaultValue={quickDocModal.currentVal}
                                id="quickDocInput"
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setQuickDocModal(null)}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const val = (document.getElementById('quickDocInput') as HTMLInputElement)?.value;
                                    handleSaveQuickDoc(val);
                                }}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md"
                            >
                                Save Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TruckGarage;
