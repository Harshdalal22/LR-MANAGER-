import React, { useState, useEffect } from 'react';
import { playLadyWelcome, subscribeVoiceState, getVoiceGreetingEnabled, setVoiceGreetingEnabled } from '../utils/welcomeVoice';

interface LadyWelcomeBannerProps {
    isHi?: boolean;
    onDismiss?: () => void;
    compact?: boolean;
    className?: string;
}

export const LadyWelcomeBanner: React.FC<LadyWelcomeBannerProps> = ({
    isHi = false,
    onDismiss,
    compact = false,
    className = ''
}) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(getVoiceGreetingEnabled());
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeVoiceState((speaking) => {
            setIsSpeaking(speaking);
        });
        return unsubscribe;
    }, []);

    const handlePlayVoice = () => {
        playLadyWelcome({ force: true, language: isHi ? 'hi' : 'en' });
    };

    const handleToggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = !voiceEnabled;
        setVoiceEnabled(next);
        setVoiceGreetingEnabled(next);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDismissed(true);
        if (onDismiss) onDismiss();
    };

    if (isDismissed) return null;

    if (compact) {
        return (
            <div 
                onClick={handlePlayVoice}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-400/30 backdrop-blur-md cursor-pointer hover:border-pink-400/60 transition shadow-sm ${className}`}
                title="Tap to hear Lady Welcome"
            >
                {/* Lady Avatar Tiny */}
                <div className="relative w-6 h-6 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs shadow-sm">
                    👩‍💼
                    {isSpeaking && (
                        <span className="absolute -inset-0.5 rounded-full bg-pink-400/40 animate-ping pointer-events-none" />
                    )}
                </div>
                
                <span className="text-xs font-semibold text-slate-800">
                    {isHi ? 'Bilty Book में आपका स्वागत है' : 'Welcome to Bilty Book'}
                </span>

                {/* Animated Sound Waves */}
                <div className="flex items-center gap-0.5 h-3 ml-1">
                    <span className={`w-0.5 bg-pink-500 rounded-full transition-all duration-200 ${isSpeaking ? 'h-3 animate-pulse' : 'h-1'}`} />
                    <span className={`w-0.5 bg-purple-500 rounded-full transition-all duration-200 ${isSpeaking ? 'h-4 animate-pulse delay-75' : 'h-2'}`} />
                    <span className={`w-0.5 bg-indigo-500 rounded-full transition-all duration-200 ${isSpeaking ? 'h-3 animate-pulse delay-150' : 'h-1'}`} />
                </div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 border border-indigo-500/30 shadow-xl transition-all duration-300 hover:border-indigo-400/50 ${className}`}>
            
            {/* Ambient background glows */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                
                {/* Lady Avatar Graphic with headset & animated pulse */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="relative shrink-0">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-indigo-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center transition-transform duration-300 ${isSpeaking ? 'scale-105' : ''}`}>
                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden relative">
                                {/* Stylized Lady Assistant Avatar SVG */}
                                <svg className="w-9 h-9 sm:w-10 sm:h-10 text-pink-300" viewBox="0 0 48 48" fill="none">
                                    {/* Face & Hair */}
                                    <circle cx="24" cy="18" r="10" fill="#FCE7F3" />
                                    {/* Hair */}
                                    <path d="M14 18C14 12.4772 18.4772 8 24 8C29.5228 8 34 12.4772 34 18C34 20 33 21 31 21C29 21 28 17 24 17C20 17 19 21 17 21C15 21 14 20 14 18Z" fill="#831843" />
                                    {/* Cheerful Eyes & Smile */}
                                    <circle cx="20.5" cy="18.5" r="1.5" fill="#475569" />
                                    <circle cx="27.5" cy="18.5" r="1.5" fill="#475569" />
                                    <path d="M21.5 22.5C22.5 24 25.5 24 26.5 22.5" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" />
                                    {/* Headset Microphone */}
                                    <path d="M14 16C13 16 12 18 12 20C12 22 13 23 14 23" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
                                    <path d="M13 22C13 25 16 28 20 28H21" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="22" cy="28" r="2" fill="#0284C7" />
                                    {/* Professional Blazer */}
                                    <path d="M12 40C12 32.5 17 29 24 29C31 29 36 32.5 36 40H12Z" fill="#1E293B" />
                                    <path d="M20 29L24 35L28 29" fill="#EC4899" />
                                    <path d="M22 29L24 33L26 29" fill="#FFFFFF" />
                                </svg>
                            </div>
                        </div>

                        {/* Speaking Pulse Ring */}
                        {isSpeaking && (
                            <span className="absolute -inset-1 rounded-2xl border-2 border-pink-400 animate-ping pointer-events-none" />
                        )}
                        
                        {/* Live Voice Indicator Dot */}
                        <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span>AI</span>
                        </div>
                    </div>

                    {/* Greeting Details */}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30">
                                Lady Voice Assistant
                            </span>
                            {isSpeaking && (
                                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Speaking...
                                </span>
                            )}
                        </div>

                        <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 flex items-center gap-2">
                            <span>{isHi ? 'Welcome to Bilty Book' : 'Welcome to Bilty Book'}</span>
                            <span className="text-pink-400 inline-block animate-bounce">✨</span>
                        </h3>

                        <p className="text-xs text-slate-300 font-medium mt-0.5 max-w-sm">
                            {isHi 
                                ? 'नमस्ते! आपके ट्रांसपोर्ट, LRs और फ्लीट का संपूर्ण डिजिटल बही-खाता।' 
                                : 'Fast LRs, automatic freight billing, live trips & 24/7 fleet control.'}
                        </p>
                    </div>
                </div>

                {/* Right Action: Play / Replay button & sound equalizer */}
                <div className="flex items-center space-x-2 shrink-0">
                    <button
                        type="button"
                        onClick={handlePlayVoice}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                            isSpeaking 
                                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-pink-500/40 ring-2 ring-pink-300' 
                                : 'bg-slate-800 hover:bg-slate-700 text-pink-300 border border-pink-500/30 hover:border-pink-400'
                        }`}
                        title="Click to play Lady Welcome voice"
                    >
                        {/* Speaker or Sound Wave */}
                        {isSpeaking ? (
                            <div className="flex items-center gap-1 h-3.5">
                                <span className="w-1 bg-white rounded-full h-3.5 animate-pulse" />
                                <span className="w-1 bg-white rounded-full h-2 animate-pulse delay-75" />
                                <span className="w-1 bg-white rounded-full h-4 animate-pulse delay-150" />
                                <span className="w-1 bg-white rounded-full h-2.5 animate-pulse delay-100" />
                            </div>
                        ) : (
                            <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5-1.23L6.5 6H2v12h4.5l5 4V2zM14 8.83v6.34c1.3-.61 2.2-1.92 2.2-3.17s-.9-2.56-2.2-3.17z"/>
                            </svg>
                        )}
                        <span className="hidden sm:inline">
                            {isSpeaking ? (isHi ? 'सुनाया जा रहा है...' : 'Speaking...') : (isHi ? 'पुनः सुनें' : 'Listen')}
                        </span>
                    </button>

                    {/* Mute/Unmute Toggle */}
                    <button
                        type="button"
                        onClick={handleToggleMute}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        title={voiceEnabled ? "Mute automatic greetings" : "Unmute voice greetings"}
                    >
                        {voiceEnabled ? (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                        )}
                    </button>

                    {/* Dismiss Button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        title="Dismiss banner"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LadyWelcomeBanner;
