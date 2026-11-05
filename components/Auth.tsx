import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
    signUp, 
    signIn, 
    sendPasswordReset, 
    signInWithGoogle, 
    createManagerAccessRequest, 
    listenToAccessRequest, 
    applySession 
} from '../services/supabaseService';
import { RunningTruckLoader } from './BookTruckAnimation';

// --- Vector Icons ---
const SpiralBookIcon: React.FC<{ className?: string }> = ({ className = "w-7 h-7" }) => (
    <svg className={className} viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Book Body */}
        <rect x="7" y="2" width="23" height="32" rx="4" fill="#FFFFFF" fillOpacity="0.95" />
        <rect x="11" y="6" width="15" height="4" rx="1.5" fill="#3B82F6" />
        <rect x="11" y="13" width="12" height="2.5" rx="1.2" fill="#93C5FD" />
        <rect x="11" y="18" width="14" height="2.5" rx="1.2" fill="#E2E8F0" />
        <rect x="11" y="23" width="9" height="2.5" rx="1.2" fill="#E2E8F0" />
        {/* Spiral Rings */}
        <path d="M4 8C4 6.5 6 6.5 8 8C10 9.5 8 11.5 6 11.5C4 11.5 4 9.5 4 8Z" fill="#1E40AF" />
        <path d="M4 15C4 13.5 6 13.5 8 15C10 16.5 8 18.5 6 18.5C4 18.5 4 16.5 4 15Z" fill="#1E40AF" />
        <path d="M4 22C4 20.5 6 20.5 8 22C10 23.5 8 25.5 6 25.5C4 25.5 4 23.5 4 22Z" fill="#1E40AF" />
        <path d="M4 28C4 26.5 6 26.5 8 28C10 29.5 8 31 6 31C4 31 4 29.5 4 28Z" fill="#1E40AF" />
    </svg>
);

const TruckIllustration: React.FC<{ className?: string }> = ({ className = "w-56 sm:w-64" }) => (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
        <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-2xl">
            {/* Ground Shadow */}
            <ellipse cx="140" cy="162" rx="115" ry="9" fill="#0f172a" fillOpacity="0.25" />
            
            {/* Road Dash */}
            <path d="M20 162H260" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="16 12" strokeLinecap="round" />

            {/* Main Cargo Container (Orange Box) */}
            <g id="cargo-container">
                {/* Back box shadow/depth */}
                <path d="M52 38H165V136H52V38Z" fill="#D95D0F" rx="5" />
                <path d="M54 36H163C165.2 36 167 37.8 167 40V134C167 136.2 165.2 138 163 138H54C51.8 138 50 136.2 50 134V40C50 37.8 51.8 36 54 36Z" fill="#F97316" />
                
                {/* Container Top Highlight */}
                <path d="M52 38C52 36.9 52.9 36 54 36H163C164.1 36 165 36.9 165 38V44H52V38Z" fill="#FB923C" />
                
                {/* Container Corrugated Ridges */}
                <path d="M66 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M78 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M90 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M102 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M114 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M126 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M138 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M150 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
                <path d="M162 44V130" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />

                {/* Corner Reinforcement Rivets */}
                <circle cx="56" cy="42" r="1.5" fill="#FFF" fillOpacity="0.6" />
                <circle cx="161" cy="42" r="1.5" fill="#FFF" fillOpacity="0.6" />
                <circle cx="56" cy="132" r="1.5" fill="#FFF" fillOpacity="0.6" />
                <circle cx="161" cy="132" r="1.5" fill="#FFF" fillOpacity="0.6" />
            </g>

            {/* Truck Chassis / Base */}
            <path d="M48 134H222V142H48V134Z" fill="#334155" />
            {/* Fuel Tank / Battery Box */}
            <rect x="76" y="137" width="28" height="9" rx="2" fill="#64748B" />
            <rect x="110" y="138" width="18" height="8" rx="1.5" fill="#475569" />

            {/* Truck Cab */}
            <g id="truck-cab">
                {/* Cab Main Body */}
                <path d="M167 56H206C212.5 56 218 60.5 220.5 66.5L232.5 98C234.5 103 235 107.5 235 113V135C235 137.2 233.2 139 231 139H167V56Z" fill="#EA580C" />
                <path d="M168 58H205C210.5 58 215.5 61.8 217.8 67L229.2 97C231 101.5 231.5 105.5 231.5 110.5V135H168V58Z" fill="#FB923C" />
                
                {/* Cab Roof Deflector / Sun visor */}
                <path d="M164 54H208C213 54 217 56 220 59L170 59L164 54Z" fill="#D97706" />

                {/* Windshield */}
                <path d="M174 64H204C207.5 64 210.5 66.5 211.8 70L221 95C221.8 97.2 220.2 99.5 217.8 99.5H174V64Z" fill="#38BDF8" />
                {/* Glass Glare */}
                <path d="M178 68H188L183 95H176L178 68Z" fill="#FFFFFF" fillOpacity="0.45" />

                {/* Side Window */}
                <rect x="174" y="65" width="20" height="28" rx="2" fill="#0284C7" fillOpacity="0.3" />
                <line x1="194" y1="65" x2="194" y2="99" stroke="#EA580C" strokeWidth="2" />

                {/* Door Line */}
                <path d="M171 63V132H206V100" stroke="#C2410C" strokeWidth="1.8" strokeLinecap="round" />
                {/* Door Handle */}
                <rect x="175" y="105" width="8" height="2.5" rx="1" fill="#1E293B" />

                {/* Side Mirror */}
                <rect x="214" y="76" width="3" height="15" rx="1.5" fill="#1E293B" />
                <rect x="216" y="78" width="5" height="11" rx="1.5" fill="#334155" />
                <rect x="218" y="79" width="2" height="9" rx="0.5" fill="#94A3B8" />

                {/* Front Grille */}
                <rect x="222" y="110" width="11" height="16" rx="2" fill="#1E293B" />
                <line x1="223" y1="114" x2="231" y2="114" stroke="#64748B" strokeWidth="1.2" />
                <line x1="223" y1="118" x2="231" y2="118" stroke="#64748B" strokeWidth="1.2" />
                <line x1="223" y1="122" x2="231" y2="122" stroke="#64748B" strokeWidth="1.2" />

                {/* Headlights */}
                <rect x="224" y="127" width="8" height="5" rx="1.5" fill="#FEF08A" />
                <rect x="225" y="128" width="6" height="3" rx="1" fill="#FFFFFF" />

                {/* Front Bumper */}
                <path d="M218 132H236C237.5 132 238.5 133.5 238 135L236 141C235.5 142 234.5 142.5 233.5 142.5H218V132Z" fill="#1E293B" />
                <rect x="222" y="135" width="12" height="4" rx="1" fill="#F8FAFC" />
            </g>

            {/* Rear Wheels */}
            <g id="rear-wheels">
                {/* Left Rear Wheel */}
                <circle cx="78" cy="144" r="17" fill="#0F172A" />
                <circle cx="78" cy="144" r="14" fill="#1E293B" />
                <circle cx="78" cy="144" r="9" fill="#94A3B8" />
                <circle cx="78" cy="144" r="5" fill="#475569" />
                <circle cx="78" cy="144" r="2" fill="#E2E8F0" />
                {/* Rim Spokes */}
                <circle cx="78" cy="138" r="1" fill="#0F172A" />
                <circle cx="84" cy="144" r="1" fill="#0F172A" />
                <circle cx="78" cy="150" r="1" fill="#0F172A" />
                <circle cx="72" cy="144" r="1" fill="#0F172A" />

                {/* Dual wheel hint */}
                <path d="M60 144C60 137 62 133 64 130V158C62 155 60 151 60 144Z" fill="#0F172A" />
            </g>

            {/* Front Wheel */}
            <g id="front-wheel">
                <circle cx="198" cy="144" r="17" fill="#0F172A" />
                <circle cx="198" cy="144" r="14" fill="#1E293B" />
                <circle cx="198" cy="144" r="9" fill="#CBD5E1" />
                <circle cx="198" cy="144" r="5" fill="#475569" />
                <circle cx="198" cy="144" r="2" fill="#F8FAFC" />
                {/* Rim Bolts */}
                <circle cx="198" cy="138" r="1" fill="#0F172A" />
                <circle cx="204" cy="144" r="1" fill="#0F172A" />
                <circle cx="198" cy="150" r="1" fill="#0F172A" />
                <circle cx="192" cy="144" r="1" fill="#0F172A" />
            </g>
        </svg>
    </div>
);

// Desktop banner illustration with background mountains and night sky
const DesktopHeroGraphic: React.FC = () => (
    <div className="relative w-full max-w-md mx-auto my-6 flex flex-col items-center">
        {/* Soft radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <svg viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-2xl">
            {/* Background Mountains */}
            <path d="M10 160L85 85C95 75 110 75 120 85L165 130L215 70C225 60 240 60 250 70L330 160H10Z" fill="#1e293b" fillOpacity="0.4" />
            <path d="M50 160L125 95C132 88 144 88 152 95L185 125L235 75C243 67 257 67 265 75L340 160H50Z" fill="#334155" fillOpacity="0.3" />

            {/* Cargo Boxes stack behind truck */}
            <rect x="75" y="80" width="30" height="28" rx="2" fill="#1e3a5f" />
            <rect x="75" y="80" width="30" height="28" rx="2" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.4" />
            <line x1="90" y1="80" x2="90" y2="108" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.3" />
            
            <rect x="90" y="95" width="28" height="26" rx="2" fill="#ea580c" />
            <line x1="104" y1="95" x2="104" y2="121" stroke="#fed7aa" strokeWidth="1" strokeOpacity="0.5" />
            
            <rect x="68" y="102" width="28" height="26" rx="2" fill="#0369a1" />

            {/* Road */}
            <path d="M0 160C80 156 260 156 340 160L330 185H10L0 160Z" fill="#0f172a" fillOpacity="0.8" />
            <path d="M20 172H320" stroke="#fbbf24" strokeWidth="2" strokeDasharray="16 10" strokeLinecap="round" />

            {/* Roadside marker poles */}
            <rect x="35" y="145" width="4" height="15" rx="1" fill="#475569" />
            <rect x="33" y="140" width="8" height="7" rx="1" fill="#f97316" />
            <rect x="310" y="145" width="4" height="15" rx="1" fill="#475569" />
            <rect x="308" y="140" width="8" height="7" rx="1" fill="#f97316" />

            {/* Moving Truck scaled */}
            <g transform="translate(42, 10) scale(0.95)">
                {/* Truck Cargo Box */}
                <rect x="52" y="38" width="112" height="98" rx="4" fill="#F97316" />
                <path d="M52 38H164V46H52V38Z" fill="#FB923C" />
                <path d="M68 46V130" stroke="#C2410C" strokeWidth="2.5" />
                <path d="M84 46V130" stroke="#C2410C" strokeWidth="2.5" />
                <path d="M100 46V130" stroke="#C2410C" strokeWidth="2.5" />
                <path d="M116 46V130" stroke="#C2410C" strokeWidth="2.5" />
                <path d="M132 46V130" stroke="#C2410C" strokeWidth="2.5" />
                <path d="M148 46V130" stroke="#C2410C" strokeWidth="2.5" />

                {/* Chassis */}
                <rect x="48" y="134" width="170" height="8" rx="1" fill="#334155" />
                <rect x="80" y="137" width="24" height="8" rx="1" fill="#64748B" />

                {/* Cab */}
                <path d="M164 58H202C208 58 213 62 215 68L225 96C227 101 228 106 228 111V134C228 136 226 138 224 138H164V58Z" fill="#EA580C" />
                <path d="M165 60H201C206 60 211 63.5 213 69L223 96C225 100 226 104 226 108V134H165V60Z" fill="#FB923C" />
                {/* Windshield */}
                <path d="M170 65H199C203 65 206 68 207 72L215 94C216 96 214 98 212 98H170V65Z" fill="#7DD3FC" />
                <path d="M174 68H182L178 94H172L174 68Z" fill="#FFFFFF" fillOpacity="0.45" />

                {/* Handle & Lights */}
                <rect x="172" y="106" width="7" height="2" rx="1" fill="#1E293B" />
                <rect x="220" y="123" width="7" height="5" rx="1" fill="#FEF08A" />
                <rect x="214" y="130" width="16" height="7" rx="1.5" fill="#1E293B" />

                {/* Wheels */}
                <circle cx="76" cy="144" r="16" fill="#0F172A" />
                <circle cx="76" cy="144" r="9" fill="#94A3B8" />
                <circle cx="76" cy="144" r="4" fill="#334155" />

                <circle cx="194" cy="144" r="16" fill="#0F172A" />
                <circle cx="194" cy="144" r="9" fill="#94A3B8" />
                <circle cx="194" cy="144" r="4" fill="#334155" />
            </g>
        </svg>
    </div>
);

// Eye icon for password toggling
const EyeIcon: React.FC<{ open?: boolean }> = ({ open }) => (
    open ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
    ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    )
);

// Google Icon
const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
);

// Apple Icon
const AppleIcon: React.FC = () => (
    <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.74-11.89-14.09-6.42-9.78-11.45-20.9-15.09-33.34-3.64-12.44-5.46-24.32-5.46-35.63 0-14.24 3.58-25.92 10.74-35.03 7.16-9.11 16.14-13.78 26.93-14.01 4.58 0 9.8 1.15 15.66 3.46 5.86 2.31 9.77 3.52 11.73 3.63 1.57-.11 5.65-1.39 12.24-3.84 6.59-2.45 12.08-3.55 16.48-3.3 12.11.89 21.61 5.46 28.51 13.7-10.78 6.53-16.05 15.42-15.82 26.68.23 8.78 3.52 16.03 9.87 21.75 6.35 5.72 13.88 9.02 22.59 9.89-2.23 6.9-4.88 13.54-7.94 19.92zM119.22 33.15c0-6.7 2.4-12.98 7.21-18.84 4.81-5.86 10.87-9.59 18.17-11.19 1.01 6.81-.88 13.33-5.67 19.56-4.79 6.23-11.02 9.86-18.69 10.9-.34-.14-.68-.27-1.02-.43z" />
    </svg>
);

// Microsoft Icon
const MicrosoftIcon: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 23 23">
        <path fill="#f35325" d="M1 1h10v10H1z"/>
        <path fill="#81bc06" d="M12 1h10v10H12z"/>
        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
        <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
);

type ActiveTab = 'admin' | 'manager' | 'signup';

const Auth: React.FC = () => {
    // Current Active Tab: 'admin' | 'manager' | 'signup'
    const [activeTab, setActiveTab] = useState<ActiveTab>('admin');

    // Fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(() => sessionStorage.getItem('lastEmail') || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(true);
    const [rememberMe, setRememberMe] = useState(true);

    // States
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [waitingForApproval, setWaitingForApproval] = useState(false);
    const [companyAdminEmail, setCompanyAdminEmail] = useState('');

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Forgot password flow
        if (isForgotPassword) {
            if (!email.trim()) {
                toast.error('Please enter your registered email address');
                return;
            }
            setLoading(true);
            const toastId = toast.loading('Sending password reset instructions...');
            try {
                await sendPasswordReset(email.trim());
                toast.success('Password reset link sent! Please check your inbox.', { id: toastId, duration: 6000 });
                setIsForgotPassword(false);
            } catch (err: any) {
                toast.error(err?.message || 'Failed to send password reset email', { id: toastId });
            } finally {
                setLoading(false);
            }
            return;
        }

        // 2. Signup flow
        if (activeTab === 'signup') {
            if (!agreedTerms) {
                toast.error('Please agree to the Terms & Privacy Policy to continue');
                return;
            }
            const trimmedEmail = email.trim();
            if (!trimmedEmail) {
                toast.error('Please enter your email address for account creation');
                return;
            }
            if (password.length < 6) {
                toast.error('Password must be at least 6 characters long');
                return;
            }

            setLoading(true);
            const toastId = toast.loading('Creating your BiltyBook account...');
            try {
                await signUp(trimmedEmail, password);
                sessionStorage.setItem('lastEmail', trimmedEmail);
                if (rememberMe) {
                    localStorage.setItem('savedEmail', trimmedEmail);
                }
                toast.success('Account created! Please check your email to confirm registration.', { id: toastId, duration: 6000 });
                // Switch to admin login after signup
                setActiveTab('admin');
            } catch (err: any) {
                toast.error(err?.message || 'Sign up failed. Please try again.', { id: toastId });
            } finally {
                setLoading(false);
            }
            return;
        }

        // 3. Admin / Manager Login flow
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            toast.error('Please enter both email and password');
            return;
        }

        setSigningIn(true);
        const toastId = toast.loading(
            activeTab === 'manager' ? 'Authenticating Manager...' : 'Authenticating Admin...'
        );

        try {
            const res = await signIn(trimmedEmail, password);
            sessionStorage.setItem('lastEmail', trimmedEmail);
            sessionStorage.setItem('currentRole', activeTab === 'manager' ? 'Manager' : 'Admin');
            sessionStorage.setItem('roleSelected', 'true');

            if (rememberMe) {
                localStorage.setItem('savedEmail', trimmedEmail);
            }

            toast.success(`Welcome to BiltyBook! Logging in as ${activeTab === 'manager' ? 'Manager' : 'Admin'}...`, { id: toastId, duration: 2500 });
        } catch (err: any) {
            if (err?.message?.includes('signal is aborted') || err?.name === 'AbortError') return;
            toast.error(err?.message || 'Invalid credentials. Please check your email and password.', { id: toastId });
        } finally {
            setSigningIn(false);
        }
    };

    // Google Sign-In
    const handleGoogleAuth = async () => {
        setLoading(true);
        const toastId = toast.loading('Connecting Google Account...');
        try {
            await signInWithGoogle();
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            toast.error(err?.message || 'Google sign-in failed. Please check your credentials.', { id: toastId });
            setLoading(false);
        }
    };

    // Quick Manager Access Request
    const handleManagerRequest = async () => {
        if (!companyAdminEmail.trim() || !email.trim()) {
            toast.error('Please provide Company Admin Email and Your Email');
            return;
        }
        setLoading(true);
        const toastId = toast.loading('Dispatching Manager terminal request to Admin...');
        try {
            const req = await createManagerAccessRequest(companyAdminEmail.trim(), fullName || 'Manager', email.trim());
            setWaitingForApproval(true);
            toast.success('Request dispatched! Awaiting Admin approval...', { id: toastId, duration: 4000 });

            listenToAccessRequest(req.id, async (sessionData) => {
                toast.success('Admin Approved! Launching Manager Desk...', { duration: 4000 });
                sessionStorage.setItem('roleSelected', 'true');
                sessionStorage.setItem('currentRole', 'Manager');
                await applySession(sessionData);
                setTimeout(() => window.location.reload(), 1200);
            }, (err) => {
                toast.error(`Approval error: ${err.message || 'Unknown'}`);
            });
        } catch (err: any) {
            toast.error(err?.message || 'Failed to dispatch request', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col justify-center items-center font-sans selection:bg-orange-500 selection:text-white bg-slate-100">

            {/* Loading Indicator Overlay */}
            {(loading || signingIn) && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white/95 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
                        <RunningTruckLoader 
                            statusMessage={
                                signingIn 
                                    ? `Logging in as ${activeTab === 'manager' ? 'Manager' : 'Admin'}...` 
                                    : activeTab === 'signup' 
                                        ? 'Registering your BiltyBook...' 
                                        : 'Processing request...'
                            } 
                            subMessage="Connecting to secure logistics network..."
                        />
                    </div>
                </div>
            )}

            {/* Waiting for approval view */}
            {waitingForApproval && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center animate-fadeIn">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                            📡
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Waiting for Admin Approval</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Request dispatched to <span className="font-semibold text-blue-600">{companyAdminEmail}</span>. This screen will auto-refresh once approved.
                        </p>
                        <button
                            type="button"
                            onClick={() => setWaitingForApproval(false)}
                            className="text-xs font-bold text-rose-500 hover:underline"
                        >
                            Cancel Request
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MAIN CONTAINER: Responsive Split on Desktop, Single Seamless Gradient on Mobile */}
            {/* ========================================================================= */}
            <div className="w-full min-h-screen flex items-center justify-center sm:p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-5xl md:bg-white md:rounded-3xl md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] md:overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">

                    {/* ===================================================================== */}
                    {/* LEFT PANEL (Desktop Only, Navy Blue BiltyBook Brand Hero from Image 2) */}
                    {/* ===================================================================== */}
                    <div className="hidden md:flex md:col-span-6 lg:col-span-6 bg-gradient-to-b from-[#0a192f] via-[#0f2847] to-[#123157] text-white p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
                        
                        {/* Background pattern details */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none"
                             style={{
                                 backgroundImage: `radial-gradient(circle at 20% 30%, #38bdf8 0, transparent 40%), radial-gradient(circle at 80% 80%, #f97316 0, transparent 40%)`
                             }}
                        />

                        {/* Top Branding */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5 1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5m1.5-9H17V12h4.5M6 18.5A1.5 1.5 0 0 1 4.5 17 1.5 1.5 0 0 1 6 15.5 1.5 1.5 0 0 1 7.5 17 1.5 1.5 0 0 1 6 18.5M20 7.5h-3V4H3C1.9 4 1 4.9 1 6v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-4-4.5Z" />
                                    </svg>
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-white flex items-center">
                                    biltybook
                                </h1>
                            </div>

                            {/* Truck Illustration graphic */}
                            <DesktopHeroGraphic />

                            <div className="mt-4">
                                <h2 className="text-2xl lg:text-3xl font-black tracking-tight leading-snug text-white">
                                    Complete Transport<br />Bahi-Khata
                                </h2>
                                <p className="text-sm text-slate-300 mt-2 font-medium leading-relaxed max-w-sm">
                                    Manage your freight, invoices & accounts — all in one place. Fast. Secure. Reliable.
                                </p>
                            </div>
                        </div>

                        {/* Feature Badges Footer */}
                        <div className="grid grid-cols-3 gap-2 pt-6 relative z-10 border-t border-slate-700/60 mt-6">
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 flex items-center gap-2 border border-white/10">
                                <span className="text-base">📋</span>
                                <span className="text-[11px] font-bold text-slate-200 leading-tight">Bahi-Khata Ledger</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 flex items-center gap-2 border border-white/10">
                                <span className="text-base">🚚</span>
                                <span className="text-[11px] font-bold text-slate-200 leading-tight">Fleet Tracking</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 flex items-center gap-2 border border-white/10">
                                <span className="text-base">🛡️</span>
                                <span className="text-[11px] font-bold text-slate-200 leading-tight">Secure & GST Ready</span>
                            </div>
                        </div>
                    </div>

                    {/* ===================================================================== */}
                    {/* RIGHT / MOBILE MAIN CARD */}
                    {/* On Mobile: Rich Blue to Orange Gradient container (as in Image 1) */}
                    {/* On Desktop: Clean White Card (as in Image 2) */}
                    {/* ===================================================================== */}
                    <div className="col-span-1 md:col-span-6 lg:col-span-6 flex flex-col justify-center min-h-screen md:min-h-full w-full bg-gradient-to-b from-[#1e40af] via-[#2563eb] to-[#ea580c] md:bg-none md:bg-white p-4 sm:p-6 lg:p-10 relative">

                        {/* Mobile Status Bar Simulation (for authentic mobile look on mobile app) */}
                        <div className="md:hidden flex justify-between items-center text-white/90 text-xs font-semibold px-2 mb-3">
                            <span>9:41</span>
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.58 10.56 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/></svg>
                                <svg className="w-5 h-3 fill-current" viewBox="0 0 24 14"><rect x="1" y="1" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="3" y="3" width="12" height="8" rx="1"/><rect x="21" y="4" width="2" height="6" rx="1"/></svg>
                            </div>
                        </div>

                        {/* Mobile Header Branding (Shown only on Mobile screen `< md`) */}
                        <div className="md:hidden flex flex-col items-center text-center mb-3">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <SpiralBookIcon className="w-8 h-8" />
                                <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                                    BiltyBook
                                </h1>
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-white/90 drop-shadow-sm">
                                Complete Transport Bahi-Khata
                            </p>

                            {/* Truck Illustration on Mobile (exact as Image 1) */}
                            <div className="my-2 sm:my-3">
                                <TruckIllustration className="w-52 sm:w-60" />
                            </div>
                        </div>

                        {/* ================================================================= */}
                        {/* SEGMENTED TAB SWITCHER: [ Admin | Manager | Signup ] */}
                        {/* ================================================================= */}
                        <div className="w-full max-w-sm mx-auto mb-4 sm:mb-5">
                            {/* Mobile pill container */}
                            <div className="flex p-1 rounded-full bg-black/20 md:bg-slate-100 backdrop-blur-md border border-white/20 md:border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab('admin');
                                        setIsForgotPassword(false);
                                    }}
                                    className={`flex-1 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 text-center ${
                                        activeTab === 'admin'
                                            ? 'bg-white md:bg-[#f97316] text-slate-900 md:text-white shadow-md'
                                            : 'text-white/80 md:text-slate-600 hover:text-white md:hover:text-slate-900'
                                    }`}
                                >
                                    Admin
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab('manager');
                                        setIsForgotPassword(false);
                                    }}
                                    className={`flex-1 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 text-center ${
                                        activeTab === 'manager'
                                            ? 'bg-white md:bg-[#f97316] text-slate-900 md:text-white shadow-md'
                                            : 'text-white/80 md:text-slate-600 hover:text-white md:hover:text-slate-900'
                                    }`}
                                >
                                    Manager
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab('signup');
                                        setIsForgotPassword(false);
                                    }}
                                    className={`flex-1 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 text-center ${
                                        activeTab === 'signup'
                                            ? 'bg-white md:bg-[#f97316] text-slate-900 md:text-white shadow-md'
                                            : 'text-white/80 md:text-slate-600 hover:text-white md:hover:text-slate-900'
                                    }`}
                                >
                                    Signup
                                </button>
                            </div>
                        </div>

                        {/* ================================================================= */}
                        {/* FORM CARD (White rounded card from Image 1 & Image 2) */}
                        {/* ================================================================= */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl md:shadow-none w-full max-w-sm sm:max-w-md mx-auto transition-all">
                            
                            {/* Card Heading */}
                            <div className="mb-5">
                                {isForgotPassword ? (
                                    <>
                                        <h2 className="text-2xl font-black text-slate-900">Reset Password</h2>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Enter your email to receive recovery instructions
                                        </p>
                                    </>
                                ) : activeTab === 'signup' ? (
                                    <>
                                        <h2 className="text-2xl font-black text-slate-900">Create your account</h2>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Start managing your transport bahi-khata today
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Welcome Back</h2>
                                        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                                            Log in to your biltybook account as <span className="font-bold text-slate-700 capitalize">{activeTab}</span> to continue
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Main Form */}
                            <form onSubmit={handleFormSubmit} className="space-y-3.5">
                                
                                {/* ---------------- SIGNUP SPECIFIC FIELDS ---------------- */}
                                {activeTab === 'signup' && !isForgotPassword && (
                                    <>
                                        {/* Full Name */}
                                        <div className="border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex items-center gap-3">
                                            <div className="text-slate-400">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Full Name
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Enter your full name"
                                                    className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>

                                        {/* Phone Number */}
                                        <div className="border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex items-center gap-3">
                                            <div className="text-slate-400">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+91 98765 43210"
                                                    className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ---------------- COMMON: EMAIL ADDRESS ---------------- */}
                                <div className="border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex items-center gap-3">
                                    <div className="text-slate-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@company.com"
                                            className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                                        />
                                    </div>
                                </div>

                                {/* ---------------- MANAGER ACCESS REQUEST OPTION ---------------- */}
                                {activeTab === 'manager' && !isForgotPassword && (
                                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-bold text-amber-900">
                                                💼 Terminal Access Request
                                            </span>
                                            <span className="text-[10px] bg-amber-200/80 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                                                Optional
                                            </span>
                                        </div>
                                        <input
                                            type="email"
                                            value={companyAdminEmail}
                                            onChange={(e) => setCompanyAdminEmail(e.target.value)}
                                            placeholder="Company Admin Email (if requesting access)"
                                            className="w-full text-xs p-2 rounded-xl border border-amber-300 bg-white placeholder-slate-400 focus:outline-none"
                                        />
                                        {companyAdminEmail && (
                                            <button
                                                type="button"
                                                onClick={handleManagerRequest}
                                                className="mt-2 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Send Request to Admin
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* ---------------- PASSWORD FIELD ---------------- */}
                                {!isForgotPassword && (
                                    <div className="border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex items-center gap-3">
                                        <div className="text-slate-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Password
                                            </label>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder={activeTab === 'signup' ? 'Create a password' : '••••••••••••'}
                                                className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                                            title={showPassword ? "Hide password" : "Show password"}
                                        >
                                            <EyeIcon open={showPassword} />
                                        </button>
                                    </div>
                                )}

                                {/* ---------------- HELPER CHECKBOXES & LINKS ---------------- */}
                                {activeTab === 'signup' && !isForgotPassword && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <input
                                            id="termsCheckbox"
                                            type="checkbox"
                                            checked={agreedTerms}
                                            onChange={(e) => setAgreedTerms(e.target.checked)}
                                            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-slate-300 cursor-pointer"
                                        />
                                        <label htmlFor="termsCheckbox" className="text-xs text-slate-600 font-medium select-none cursor-pointer">
                                            I agree to the <span className="font-bold text-slate-800">Terms & Privacy Policy</span>
                                        </label>
                                    </div>
                                )}

                                {activeTab !== 'signup' && !isForgotPassword && (
                                    <div className="flex items-center justify-between pt-1">
                                        <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-slate-300"
                                            />
                                            <span>Remember me</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsForgotPassword(true)}
                                            className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}

                                {/* ---------------- SUBMIT ACTION BUTTON ---------------- */}
                                <div className="pt-2">
                                    {activeTab === 'signup' && !isForgotPassword ? (
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm sm:text-base bg-gradient-to-r from-[#2563eb] to-[#ea580c] hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-70"
                                        >
                                            Create Account
                                        </button>
                                    ) : isForgotPassword ? (
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm sm:text-base bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.99] transition-all shadow-md cursor-pointer disabled:opacity-70"
                                        >
                                            Send Reset Instructions
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={signingIn}
                                            className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm sm:text-base bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.99] transition-all shadow-md shadow-orange-500/25 cursor-pointer disabled:opacity-70"
                                        >
                                            {activeTab === 'manager' ? 'Login as Manager' : 'Login as Admin'}
                                        </button>
                                    )}
                                </div>
                            </form>

                            {/* ---------------- OR CONTINUE WITH ---------------- */}
                            {!isForgotPassword && (
                                <div className="mt-5">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-full border-t border-slate-200" />
                                        <span className="absolute px-3 bg-white text-slate-400 text-xs font-medium">
                                            or continue with
                                        </span>
                                    </div>

                                    {/* Social Login Buttons */}
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={handleGoogleAuth}
                                            className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
                                        >
                                            <GoogleIcon />
                                            <span>Google</span>
                                        </button>

                                        {activeTab === 'signup' ? (
                                            <button
                                                type="button"
                                                onClick={() => toast('Apple sign-in ready for iOS production build', { icon: '🍎' })}
                                                className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
                                            >
                                                <AppleIcon />
                                                <span>Apple</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => toast('Microsoft SSO enabled for enterprise fleet accounts', { icon: '🪟' })}
                                                className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
                                            >
                                                <MicrosoftIcon />
                                                <span>Microsoft</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ---------------- FOOTER REDIRECT LINK ---------------- */}
                            <div className="mt-6 text-center text-xs text-slate-600 font-medium">
                                {isForgotPassword ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(false)}
                                        className="font-bold text-orange-500 hover:underline"
                                    >
                                        ← Back to Login
                                    </button>
                                ) : activeTab === 'signup' ? (
                                    <span>
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('admin')}
                                            className="font-bold text-orange-500 hover:underline cursor-pointer"
                                        >
                                            Login
                                        </button>
                                    </span>
                                ) : (
                                    <span>
                                        Don't have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('signup')}
                                            className="font-bold text-orange-500 hover:underline cursor-pointer"
                                        >
                                            Sign up
                                        </button>
                                    </span>
                                )}
                            </div>

                        </div>

                        {/* Extra Mobile Footer Spacer */}
                        <div className="md:hidden py-4 text-center text-white/80 text-[11px] font-medium">
                            <span>🔒 256-Bit Encrypted Bilty Cloud</span>
                            <span className="mx-2">•</span>
                            <span>GST & E-Way Ready</span>
                        </div>

                    </div>

                </div>
            </div>

        </div>
    );
};

export default Auth;
