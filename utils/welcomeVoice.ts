// =========================================================================
// Lady Welcome Voice & Audio Chime Service for Bilty Book
// Plays a warm, professional lady greeting: "Welcome to Bilty Book"
// Supported on Web, Android Capacitor WebView & iOS Safari
// =========================================================================

type VoiceStateListener = (speaking: boolean) => void;
const listeners: Set<VoiceStateListener> = new Set();
let isCurrentlySpeaking = false;
let unlockListenerAttached = false;

const notifyListeners = (speaking: boolean) => {
    isCurrentlySpeaking = speaking;
    listeners.forEach(cb => cb(speaking));
};

export const subscribeVoiceState = (cb: VoiceStateListener) => {
    listeners.add(cb);
    cb(isCurrentlySpeaking);
    return () => {
        listeners.delete(cb);
    };
};

// -------------------------------------------------------------
// 1. Soft Luxury Chime (Web Audio API)
// -------------------------------------------------------------
export const playWelcomeChime = async () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const now = ctx.currentTime;
        const notes = [523.25, 659.25]; // C5 -> E5 pleasant welcome chord

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.5);
        });

        setTimeout(() => {
            try { ctx.close(); } catch {}
        }, 800);
    } catch (e) {
        // AudioContext silent fallback
    }
};

// -------------------------------------------------------------
// 2. Female Voice Finder Helper
// -------------------------------------------------------------
const findLadyVoice = (voices: SpeechSynthesisVoice[], isHindi: boolean): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) return null;

    if (isHindi) {
        // Look for Hindi female voice first
        const hiFemale = voices.find(v => 
            v.lang.toLowerCase().startsWith('hi') && 
            (v.name.toLowerCase().includes('swara') || 
             v.name.toLowerCase().includes('kalpana') || 
             v.name.toLowerCase().includes('female') ||
             v.name.toLowerCase().includes('google'))
        );
        if (hiFemale) return hiFemale;

        // Any Hindi voice
        const hiAny = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
        if (hiAny) return hiAny;
    }

    // English Female Voices (Windows: Zira/Jenny, Mac/iOS: Samantha/Karen/Victoria, Android/Chrome: Google UK/US Female)
    const femaleKeywords = [
        'zira', 'samantha', 'karen', 'jenny', 'victoria', 
        'moira', 'veena', 'fiona', 'tessa', 'swara', 
        'female', 'woman', 'google uk english female', 'google us english'
    ];

    for (const kw of femaleKeywords) {
        const found = voices.find(v => 
            v.name.toLowerCase().includes(kw) && 
            (v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().startsWith('hi'))
        );
        if (found) return found;
    }

    // Fallback: any English voice
    const enVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    return enVoice || voices[0] || null;
};

// -------------------------------------------------------------
// 3. Play Lady Welcome Voice Function
// -------------------------------------------------------------
export interface LadyWelcomeOptions {
    force?: boolean;             // Force replay even if already played this session
    language?: 'en' | 'hi';      // Specific language
    customMessage?: string;      // Custom phrase override
    onComplete?: () => void;
}

export const playLadyWelcome = (options: LadyWelcomeOptions = {}) => {
    if (typeof window === 'undefined') return;

    // Check user preference
    const isMuted = localStorage.getItem('bilty_voice_greeting_enabled') === 'false';
    if (isMuted && !options.force) {
        return;
    }

    // Check session play unless forced
    const alreadyPlayed = sessionStorage.getItem('bilty_welcome_played');
    if (alreadyPlayed && !options.force) {
        return;
    }

    if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis is not supported on this device/browser');
        return;
    }

    const isHi = options.language === 'hi' || localStorage.getItem('bilty_language') === 'hi';
    const message = options.customMessage || (isHi ? 'Welcome to Bilty Book. Bilty Book में आपका स्वागत है' : 'Welcome to Bilty Book');

    const speak = () => {
        try {
            window.speechSynthesis.cancel(); // Stop any pending utterances

            const voices = window.speechSynthesis.getVoices();
            const utterance = new SpeechSynthesisUtterance(message);
            const ladyVoice = findLadyVoice(voices, isHi);

            if (ladyVoice) {
                utterance.voice = ladyVoice;
            }

            // High pitch & measured cadence for a sweet, warm, articulate lady voice
            utterance.pitch = 1.18;
            utterance.rate = 0.92;
            utterance.volume = 1.0;
            utterance.lang = isHi ? 'hi-IN' : 'en-US';

            utterance.onstart = () => {
                notifyListeners(true);
            };

            utterance.onend = () => {
                notifyListeners(false);
                sessionStorage.setItem('bilty_welcome_played', 'true');
                if (options.onComplete) options.onComplete();
            };

            utterance.onerror = (e) => {
                console.warn('Speech synthesis error / interrupted:', e);
                notifyListeners(false);
            };

            // Play modern chime then speak
            playWelcomeChime();
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 120);

        } catch (err) {
            console.warn('Could not trigger lady welcome voice:', err);
            notifyListeners(false);
        }
    };

    // If voices are already loaded, speak immediately
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
        speak();
    } else {
        // Wait for voices to load
        const handleVoicesChanged = () => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            speak();
        };
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        // Fallback timeout in case voiceschanged does not fire
        setTimeout(() => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            speak();
        }, 300);
    }

    // Attach unlock listener in case mobile browser blocked unprompted autoplay
    if (!unlockListenerAttached && !alreadyPlayed) {
        unlockListenerAttached = true;
        const unlock = () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
            unlockListenerAttached = false;

            if (!sessionStorage.getItem('bilty_welcome_played')) {
                playLadyWelcome({ force: false, language: options.language });
            }
        };
        window.addEventListener('click', unlock, { once: true, passive: true });
        window.addEventListener('touchstart', unlock, { once: true, passive: true });
    }
};

// -------------------------------------------------------------
// 4. Utility Controls
// -------------------------------------------------------------
export const stopLadyVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        notifyListeners(false);
    }
};

export const isLadyVoiceSpeaking = () => isCurrentlySpeaking;

export const setVoiceGreetingEnabled = (enabled: boolean) => {
    localStorage.setItem('bilty_voice_greeting_enabled', enabled ? 'true' : 'false');
};

export const getVoiceGreetingEnabled = (): boolean => {
    return localStorage.getItem('bilty_voice_greeting_enabled') !== 'false';
};
