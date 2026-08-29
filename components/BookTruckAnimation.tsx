import React, { useState, useEffect } from 'react';

// ==========================================
// 1. 3D FLIPPING BILTY BOOK COMPONENT
// ==========================================
export const BiltyBook3D: React.FC<{
    isProcessing?: boolean;
    size?: 'sm' | 'md' | 'lg';
    interactive?: boolean;
    onBookClick?: () => void;
}> = ({ isProcessing = false, size = 'md', interactive = true, onBookClick }) => {
    const [pageCount, setPageCount] = useState(1);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        if (isProcessing) {
            const interval = setInterval(() => {
                setPageCount(prev => (prev % 10) + 1);
            }, 800);
            return () => clearInterval(interval);
        }
    }, [isProcessing]);

    const handleFlip = () => {
        if (isFlipping) return;
        setIsFlipping(true);
        setPageCount(prev => (prev % 10) + 1);
        if (onBookClick) onBookClick();
        setTimeout(() => setIsFlipping(false), 700);
    };

    const scaleClasses = {
        sm: 'scale-75',
        md: 'scale-95 sm:scale-100',
        lg: 'scale-110 sm:scale-125'
    }[size];

    return (
        <div 
            onClick={interactive ? handleFlip : undefined}
            title={interactive ? "Click to flip Bilty page!" : undefined}
            className={`relative flex items-center justify-center select-none ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} transition-transform duration-300 ${scaleClasses}`}
            style={{ perspective: '1000px' }}
        >
            {/* Ambient Book Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-xl animate-pulse pointer-events-none" />

            {/* Book Spine / Cover Base */}
            <div className="relative w-44 h-32 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-xl shadow-[0_20px_40px_-10px_rgba(30,58,138,0.5)] border-2 border-blue-400/40 p-2 flex">
                
                {/* Golden Corner Accents */}
                <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400 rounded-tl-sm" />
                <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400 rounded-tr-sm" />
                <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-amber-400 rounded-bl-sm" />
                <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400 rounded-br-sm" />

                {/* Left Page (Stationary) */}
                <div className="w-1/2 h-full bg-gradient-to-l from-slate-100 to-amber-50 rounded-l-md shadow-inner border-r border-slate-300 p-2 flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between border-b border-blue-200 pb-1 mb-1.5">
                            <span className="text-[8px] font-black tracking-wider text-blue-900 uppercase">BILTY #{pageCount.toString().padStart(3, '0')}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        </div>
                        <div className="space-y-1">
                            <div className="h-1 bg-slate-300 rounded w-full" />
                            <div className="h-1 bg-slate-200 rounded w-4/5" />
                            <div className="h-1 bg-slate-300 rounded w-5/6" />
                            <div className="h-1 bg-slate-200 rounded w-2/3" />
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-[7px] text-slate-400 font-bold">
                        <span>ORIGIN</span>
                        <span>DEST</span>
                    </div>
                </div>

                {/* Center Spine Crease */}
                <div className="w-1.5 h-full bg-gradient-to-r from-slate-400 via-slate-600 to-slate-400 shadow-md z-20 -mx-0.5 rounded-sm" />

                {/* Right Page (Stationary Bottom) */}
                <div className="w-1/2 h-full bg-gradient-to-r from-slate-100 to-amber-50 rounded-r-md shadow-inner border-l border-slate-300 p-2 flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between border-b border-indigo-200 pb-1 mb-1.5">
                            <span className="text-[8px] font-black text-indigo-900 tracking-wider">FREIGHT LR</span>
                            <span className="text-[7px] bg-blue-100 text-blue-800 px-1 rounded font-bold">PAID</span>
                        </div>
                        <div className="space-y-1">
                            <div className="h-1 bg-indigo-200 rounded w-full" />
                            <div className="h-1 bg-slate-200 rounded w-3/4" />
                            <div className="h-1 bg-indigo-100 rounded w-5/6" />
                        </div>
                    </div>
                    {/* Stamp Indicator */}
                    <div className="self-end border border-red-500 text-red-600 text-[6px] font-black px-1 rounded transform -rotate-12 uppercase tracking-tighter">
                        PASSED
                    </div>
                </div>

                {/* Dynamic 3D Flipping Page */}
                <div 
                    className={`absolute top-2 left-1/2 w-[calc(50%-8px)] h-[calc(100%-16px)] bg-gradient-to-r from-amber-50 to-white rounded-r-md shadow-2xl border-l border-slate-300 p-2 flex flex-col justify-between origin-left transition-all duration-700 pointer-events-none z-30 ${
                        isFlipping || isProcessing ? 'animate-biltyFlip' : ''
                    }`}
                    style={{
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden'
                    }}
                >
                    <div>
                        <div className="flex items-center justify-between border-b border-blue-200 pb-1 mb-1">
                            <span className="text-[8px] font-extrabold text-blue-700">PAGE {pageCount}</span>
                            <div className="w-2 h-2 rounded bg-amber-400 animate-spin" />
                        </div>
                        <div className="space-y-1">
                            <div className="h-1 bg-blue-300 rounded w-full" />
                            <div className="h-1 bg-slate-300 rounded w-4/5" />
                            <div className="h-1 bg-blue-200 rounded w-3/4" />
                        </div>
                    </div>
                    <div className="text-[6px] text-blue-500 font-mono text-center">
                        ⚡ BILTY BOOK
                    </div>
                </div>

                {/* Bookmark Ribbon */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-5 bg-red-600 rounded-b shadow-md flex items-end justify-center pb-0.5 z-10">
                    <div className="w-1 h-1 bg-amber-300 rounded-full" />
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. ANIMATED LOGISTICS TRUCK COMPONENT
// ==========================================

// Plays a real double-tone Indian truck air horn using Web Audio API
const playTruckHorn = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const waveshaper = ctx.createWaveShaper();

            // Sawtooth wave = truck air-horn timbre
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) {
                const x = (i * 2) / 256 - 1;
                curve[i] = ((Math.PI + 200) * x) / (Math.PI + 200 * Math.abs(x));
            }
            waveshaper.curve = curve;
            waveshaper.oversample = '4x';

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            osc.frequency.linearRampToValueAtTime(freq * 1.02, ctx.currentTime + startTime + 0.05);
            osc.frequency.linearRampToValueAtTime(freq * 0.99, ctx.currentTime + startTime + 0.15);

            gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + startTime + 0.03);
            gainNode.gain.setValueAtTime(gain, ctx.currentTime + startTime + duration - 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration);

            osc.connect(waveshaper);
            waveshaper.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
        };

        // Classic Indian truck double horn: low-high blast sequence
        playTone(220, 0,    0.45, 0.55);
        playTone(330, 0,    0.45, 0.35);
        playTone(260, 0.50, 0.55, 0.60);
        playTone(390, 0.50, 0.55, 0.40);

        setTimeout(() => ctx.close(), 1600);
    } catch {
        // Silently fail if audio not supported
    }
};

export const LogisticsTruck3D: React.FC<{
    isMoving?: boolean;
    showRoad?: boolean;
    interactive?: boolean;
    onTruckClick?: () => void;
}> = ({ isMoving = true, showRoad = true, interactive = true, onTruckClick }) => {
    const [honking, setHonking] = useState(false);
    const [boost, setBoost] = useState(false);

    const handleClick = () => {
        playTruckHorn();   // 🔊 Real truck horn!
        setHonking(true);
        setBoost(true);
        if (onTruckClick) onTruckClick();
        setTimeout(() => setHonking(false), 1100);
        setTimeout(() => setBoost(false), 1400);
    };

    return (
        <div 
            onClick={interactive ? handleClick : undefined}
            title={interactive ? "Click the Truck to Honk & Boost!" : undefined}
            className={`relative flex flex-col items-center justify-center select-none ${interactive ? 'cursor-pointer' : ''}`}
        >
            {/* Honk Soundwave Bubble */}
            {honking && (
                <div className="absolute -top-7 right-2 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-amber-200 animate-bounce z-40">
                    📢 PEEP PEEP!
                </div>
            )}

            {/* Truck Body Wrapper with suspension bounce */}
            <div className={`relative flex items-end ${isMoving ? 'animate-truckBounce' : ''} ${boost ? 'animate-truckBoost' : ''} transition-all duration-300`}>
                
                {/* Exhaust Smoke Puffs */}
                {isMoving && (
                    <div className="absolute -left-3 bottom-3 flex space-x-1 pointer-events-none">
                        <span className="w-2 h-2 rounded-full bg-slate-400/40 animate-smokePuff" style={{ animationDelay: '0s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300/50 animate-smokePuff" style={{ animationDelay: '0.2s' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200/30 animate-smokePuff" style={{ animationDelay: '0.4s' }} />
                    </div>
                )}

                {/* Cargo Container (Back of Truck) */}
                <div className="relative w-28 h-16 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 rounded-l-xl rounded-tr-sm shadow-xl border border-blue-400/30 flex flex-col justify-between p-1.5 overflow-hidden">
                    {/* Container Ribs / Metallic Texture */}
                    <div className="absolute inset-0 flex justify-evenly pointer-events-none opacity-20">
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                    </div>

                    {/* Logo & Bilty Label */}
                    <div className="flex items-center justify-between z-10">
                        <div className="flex items-center space-x-1">
                            <span className="w-2 h-2 rounded bg-amber-400 animate-pulse" />
                            <span className="text-[9px] font-black text-white tracking-wider">BILTY EXPRESS</span>
                        </div>
                        <span className="text-[7px] font-extrabold bg-blue-950/60 text-cyan-300 px-1 py-0.5 rounded border border-cyan-400/30">24x7</span>
                    </div>

                    {/* Cargo Graphic lines */}
                    <div className="z-10 bg-white/10 backdrop-blur-sm rounded p-1 flex items-center justify-between border border-white/10">
                        <span className="text-[7px] font-mono text-cyan-200 font-bold">ALL INDIA PERMIT</span>
                        <span className="text-[8px] text-amber-300">📦⚡</span>
                    </div>

                    {/* Rear Red Reflector lights */}
                    <div className="absolute left-0 bottom-2 w-1 h-3 bg-red-600 rounded-r shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                </div>

                {/* Cabin (Front of Truck) */}
                <div className="relative w-14 h-13 bg-gradient-to-b from-slate-800 via-slate-900 to-blue-950 rounded-tr-2xl rounded-br-md shadow-xl border-t border-r border-b border-blue-400/40 p-1 flex flex-col justify-between">
                    
                    {/* Windshield & Driver Seat */}
                    <div className="relative w-full h-6 bg-gradient-to-br from-cyan-400/30 via-sky-300/40 to-blue-600/30 rounded-tr-xl rounded-tl-sm border border-cyan-300/50 shadow-inner flex items-center justify-center overflow-hidden">
                        <div className="w-2.5 h-2.5 bg-slate-800 rounded-full opacity-60 ml-3 mt-1" />
                        {/* Glass Reflection Glare */}
                        <div className="absolute -top-4 -right-2 w-12 h-2 bg-white/40 rotate-45 pointer-events-none" />
                    </div>

                    {/* Grill & Headlight Beam */}
                    <div className="flex items-center justify-between mt-1">
                        <div className="space-y-0.5">
                            <div className="w-5 h-0.5 bg-slate-600 rounded" />
                            <div className="w-5 h-0.5 bg-slate-600 rounded" />
                        </div>
                        {/* Glowing Headlight */}
                        <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)] border border-white animate-pulse" />
                            {/* Headlight Beam Cone */}
                            <div className="absolute left-3 -top-1 w-16 h-8 bg-gradient-to-r from-amber-300/40 via-amber-200/10 to-transparent clip-beam pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Spinning Wheels with 3D Rims */}
                {/* Rear Wheel 1 */}
                <div className="absolute left-4 -bottom-3 w-6 h-6 rounded-full bg-slate-950 border-2 border-slate-700 shadow-md flex items-center justify-center z-20">
                    <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 border border-slate-600 flex items-center justify-center ${isMoving ? 'animate-spin' : ''}`} style={{ animationDuration: '0.4s' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </div>
                </div>

                {/* Rear Wheel 2 */}
                <div className="absolute left-14 -bottom-3 w-6 h-6 rounded-full bg-slate-950 border-2 border-slate-700 shadow-md flex items-center justify-center z-20">
                    <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 border border-slate-600 flex items-center justify-center ${isMoving ? 'animate-spin' : ''}`} style={{ animationDuration: '0.4s' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </div>
                </div>

                {/* Front Wheel */}
                <div className="absolute right-3 -bottom-3 w-6 h-6 rounded-full bg-slate-950 border-2 border-slate-700 shadow-md flex items-center justify-center z-20">
                    <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 border border-slate-600 flex items-center justify-center ${isMoving ? 'animate-spin' : ''}`} style={{ animationDuration: '0.4s' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </div>
                </div>
            </div>

            {/* Roadway & Speed Lines */}
            {showRoad && (
                <div className="w-48 h-2 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 rounded-full mt-3 relative overflow-hidden shadow-inner border-t border-slate-600">
                    <div className="absolute inset-0 flex items-center justify-around animate-roadDashes">
                        <span className="w-4 h-0.5 bg-amber-400 rounded-full" />
                        <span className="w-4 h-0.5 bg-amber-400 rounded-full" />
                        <span className="w-4 h-0.5 bg-amber-400 rounded-full" />
                        <span className="w-4 h-0.5 bg-amber-400 rounded-full" />
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 3. FULL IN-PROCESS LOGISTICS STAGE LOADER
// ==========================================
export const ProcessLoadingState: React.FC<{
    statusMessage?: string;
    subMessage?: string;
}> = ({
    statusMessage = "Processing your request...",
    subMessage = "Synchronizing Bilty Records with Freight Cloud..."
}) => {
    const [stepIndex, setStepIndex] = useState(0);
    const steps = [
        "Verifying Freight Ledger & Credentials...",
        "Rotating Bilty Book to Fresh LR Page...",
        "Dispatching Logistics Fleet...",
        "Connecting Secure Transport Portal..."
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setStepIndex(prev => (prev + 1) % steps.length);
        }, 1200);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center z-20">
            {/* Dual Themed Animation Showcase: Flipping Book + Speeding Truck */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 my-4">
                <div className="transform hover:scale-105 transition-transform duration-300">
                    <BiltyBook3D isProcessing={true} size="md" interactive={false} />
                    <p className="text-[10px] font-bold text-blue-400 mt-2 uppercase tracking-widest">Turning Bilty Pages</p>
                </div>
                
                <div className="hidden sm:block w-px h-24 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent" />

                <div className="transform hover:scale-105 transition-transform duration-300">
                    <LogisticsTruck3D isMoving={true} showRoad={true} interactive={false} />
                    <p className="text-[10px] font-bold text-amber-400 mt-2 uppercase tracking-widest">Express Dispatch</p>
                </div>
            </div>

            {/* Glowing Processing Status */}
            <div className="mt-4 max-w-sm space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-blue-300 text-xs font-semibold shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span>{statusMessage}</span>
                </div>
                <h4 className="text-sm font-black text-white tracking-wide transition-all duration-300 min-h-[20px]">
                    {steps[stepIndex]}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                    {subMessage}
                </p>
            </div>
        </div>
    );
};
