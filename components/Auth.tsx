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
import { GoogleIcon, EyeIcon } from './icons';
import { BiltyBook3D, LogisticsTruck3D, ProcessLoadingState } from './BookTruckAnimation';

type AuthView = 'sign_in' | 'sign_up' | 'forgot_password' | 'manager_request';

const Auth: React.FC = () => {
    const [view, setView] = useState<AuthView>('sign_in');
    // Pre-fill last used email for faster repeat logins
    const [email, setEmail] = useState(() => sessionStorage.getItem('lastEmail') || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [managerName, setManagerName] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [loading, setLoading] = useState(false);
    // For sign_in only: keeps form visible with inline spinner (faster feel)
    const [signingIn, setSigningIn] = useState(false);
    const [waitingForApproval, setWaitingForApproval] = useState(false);
    const [interactionBadge, setInteractionBadge] = useState<string | null>(null);

    const triggerBadgeFeedback = (msg: string) => {
        setInteractionBadge(msg);
        setTimeout(() => setInteractionBadge(null), 2000);
    };

    const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Trim email to avoid whitespace login failures
        const trimmedEmail = email.trim();
        setEmail(trimmedEmail);

        if (view === 'sign_in') {
            // FAST PATH: keep form visible, only spin the button
            setSigningIn(true);
            const toastId = toast.loading('Authenticating...');
            try {
                await signIn(trimmedEmail, password);
                sessionStorage.setItem('lastEmail', trimmedEmail);
                toast.success('Signed in! Launching Bilty Book...', { id: toastId, duration: 2000 });
            } catch (error: any) {
                if (error?.message?.includes('signal is aborted') || error?.name === 'AbortError') return;
                toast.error(error instanceof Error ? error.message : 'Login failed. Check your credentials.', { id: toastId });
            } finally {
                setSigningIn(false);
            }
            return;
        }

        setLoading(true);
        const toastId = toast.loading(
            view === 'sign_up' ? 'Creating your account...' : 'Processing...'
        );

        try {
            switch (view) {
                case 'sign_in':
                    await signIn(email, password);
                    toast.success('Signed in successfully! Launching Bilty Book...', { id: toastId });
                    break;
                case 'sign_up':
                    await signUp(email, password);
                    toast.success('Sign up successful! Please check your email to confirm your account.', { id: toastId, duration: 6000 });
                    break;
                case 'forgot_password':
                    await sendPasswordReset(email);
                    toast.success('Password reset email dispatched! Please check your inbox.', { id: toastId, duration: 6000 });
                    break;
                case 'manager_request':
                    const request = await createManagerAccessRequest(companyEmail, managerName, email);
                    setWaitingForApproval(true);
                    toast.success('Request sent! Waiting for Admin approval...', { id: toastId, duration: 4000 });

                    listenToAccessRequest(request.id, async (sessionData) => {
                        try {
                            toast.success('Admin Approved! Signing you into Manager Desk...', { duration: 4000 });
                            sessionStorage.setItem('roleSelected', 'true');
                            sessionStorage.setItem('currentRole', 'Manager');
                            await applySession(sessionData);

                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        } catch (err: any) {
                            console.error("Auto-login error:", err);
                            toast.error(err.message || 'Auto-login failed. Please refresh and try again.');
                            setWaitingForApproval(false);
                            setLoading(false);
                        }
                    }, (err) => {
                        console.error("Listener error:", err);
                        toast.error(`Error checking approval status: ${err.message || 'Unknown error'}`);
                    });
                    break;
            }
        } catch (error: any) {
            if (error?.message?.includes('signal is aborted') || error?.name === 'AbortError') {
                return;
            }
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast.error(errorMessage, { id: toastId });
            setWaitingForApproval(false);
        } finally {
            if (view !== 'manager_request') setLoading(false);
            else if (!waitingForApproval) setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        const toastId = toast.loading('Connecting Google Transport Portal...');
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Google Auth Error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Google Sign In failed.';

            toast.error(
                <div>
                    <span className="font-bold">Login Failed: </span>
                    {errorMessage}
                    <br />
                    <span className="text-xs mt-1 block opacity-90">
                        Check that your Google Cloud Project is NOT in "Testing" mode, or your email is added to "Test Users".
                    </span>
                </div>,
                { id: toastId, duration: 6000 }
            );
            setLoading(false);
        }
    };

    const renderHeader = () => {
        switch (view) {
            case 'sign_in': return 'Admin Access';
            case 'sign_up': return 'Create Account';
            case 'forgot_password': return 'Reset Passkey';
            case 'manager_request': return 'Manager Terminal';
        }
    };

    const renderSubHeader = () => {
        switch (view) {
            case 'sign_in': return 'Enter your logistics credentials to access the central Bilty Book.';
            case 'sign_up': return 'Sign up to register your transport fleet and generate instant LRs.';
            case 'forgot_password': return 'Enter your transport account email to receive recovery instructions.';
            case 'manager_request': return 'Request fast-track terminal access from your company Admin.';
        }
    };

    const renderButtonText = () => {
        switch (view) {
            case 'sign_in': return 'Sign In to Portal';
            case 'sign_up': return 'Create Transport Account';
            case 'forgot_password': return 'Send Recovery Link';
            case 'manager_request': return 'Dispatch Access Request';
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans text-slate-100 selection:bg-blue-600 selection:text-white">
            
            {/* ============================================================ */}
            {/* BACKGROUND LOGISTICS HIGHWAY & LIGHTING EFFECTS */}
            {/* ============================================================ */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Glowing Aura Spheres */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/10 rounded-full blur-3xl" />

                {/* Perspective Highway Grid Overlay */}
                <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
                        WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)'
                    }}
                />
            </div>

            {/* ============================================================ */}
            {/* MAIN AUTHENTICATION CARD */}
            {/* ============================================================ */}
            <div className="w-full max-w-lg relative z-10">
                
                {/* Top Interactive Animation Showcase */}
                <div className="mb-6 flex flex-col items-center justify-center">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-4 shadow-2xl shadow-blue-950/50 flex items-center justify-center gap-6 sm:gap-8 hover:border-blue-500/50 transition-all duration-300">
                        
                        {/* Interactive Flipping Book */}
                        <div className="flex flex-col items-center">
                            <BiltyBook3D 
                                size="sm" 
                                interactive={!loading}
                                onBookClick={() => triggerBadgeFeedback("📄 Bilty Page Turned!")} 
                            />
                            <span className="text-[10px] font-extrabold text-blue-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                <span>📖 Bilty Book</span>
                                <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1 rounded">Click</span>
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-16 bg-gradient-to-b from-transparent via-slate-600 to-transparent" />

                        {/* Interactive Driving Truck */}
                        <div className="flex flex-col items-center">
                            <LogisticsTruck3D 
                                isMoving={true} 
                                showRoad={true} 
                                interactive={!loading}
                                onTruckClick={() => triggerBadgeFeedback("🚛 Truck Boosted & Honked!")}
                            />
                            <span className="text-[10px] font-extrabold text-amber-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                <span>⚡ Logistics Express</span>
                                <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded">Honk</span>
                            </span>
                        </div>
                    </div>

                    {/* Interactive Toast Bubble */}
                    {interactionBadge && (
                        <div className="mt-2 text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-full shadow-lg animate-bounce">
                            {interactionBadge}
                        </div>
                    )}
                </div>

                {/* Glassmorphic Form Card */}
                <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-slate-700/80 p-6 sm:p-10 relative overflow-hidden">
                    
                    {/* Top Glowing Edge Strip */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />
                    
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                            <span>SSK Logistics System</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
                            {renderHeader()}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium max-w-sm mx-auto">
                            {renderSubHeader()}
                        </p>
                    </div>

                    {/* Segmented Mode Switcher */}
                    {view !== 'forgot_password' && !loading && !waitingForApproval && (
                        <div className="grid grid-cols-3 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl mb-6 shadow-inner text-xs sm:text-sm font-bold">
                            <button
                                type="button"
                                onClick={() => setView('sign_in')}
                                className={`py-2.5 px-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                    view === 'sign_in'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/40 scale-100'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                            >
                                <span>Admin</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('manager_request')}
                                className={`py-2.5 px-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                    view === 'manager_request'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/40 scale-100'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                            >
                                <span>Manager</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('sign_up')}
                                className={`py-2.5 px-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                    view === 'sign_up'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/40 scale-100'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                            >
                                <span>Sign Up</span>
                            </button>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* VIEW: PROCESSING / IN PROGRESS STATE (signup/manager only) */}
                    {/* ============================================================ */}
                    {loading && !waitingForApproval ? (
                        <ProcessLoadingState 
                            statusMessage={
                                view === 'sign_up' 
                                    ? 'Generating New Fleet Account...' 
                                    : 'Dispatching Freight Request...'
                            }
                            subMessage="Synchronizing ledger entries, vehicle records and digital signature keys."
                        />
                    ) : waitingForApproval ? (
                        /* ============================================================ */
                        /* VIEW: WAITING FOR ADMIN APPROVAL */
                        /* ============================================================ */
                        <div className="text-center py-8 relative isolate animate-fadeInUp">
                            <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                                <div className="absolute inset-2 rounded-full bg-indigo-500/30 animate-pulse" />
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl border-2 border-cyan-400/50">
                                    <span className="text-2xl">📡</span>
                                </div>
                            </div>
                            
                            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                                Waiting for Admin Authorization
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                                We dispatched your Manager Access Request to <strong className="text-blue-400">{companyEmail}</strong>. Keep this screen open; your dashboard will launch automatically once approved.
                            </p>

                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-950/60 py-2 px-4 rounded-xl border border-slate-800 w-fit mx-auto">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <span>Listening for real-time approval channel...</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setWaitingForApproval(false)}
                                className="mt-6 text-xs font-bold text-slate-400 hover:text-rose-400 underline transition-colors"
                            >
                                Cancel Request & Return
                            </button>
                        </div>
                    ) : (
                        /* ============================================================ */
                        /* VIEW: FORM INPUTS */
                        /* ============================================================ */
                        <form className="space-y-4" onSubmit={handleAuthAction}>
                            
                            {/* Manager Access Request Fields */}
                            {view === 'manager_request' && (
                                <>
                                    <div>
                                        <label htmlFor="companyEmail" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                                            🏢 Company (Admin) Email
                                        </label>
                                        <input
                                            id="companyEmail"
                                            type="email"
                                            required
                                            value={companyEmail}
                                            onChange={(e) => setCompanyEmail(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700 text-white rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm shadow-inner"
                                            placeholder="admin@transportcompany.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="managerName" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                                            👤 Your Full Name / Designation
                                        </label>
                                        <input
                                            id="managerName"
                                            type="text"
                                            required
                                            value={managerName}
                                            onChange={(e) => setManagerName(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700 text-white rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm shadow-inner"
                                            placeholder="Rajesh Sharma (Terminal Manager)"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                                    {view === 'manager_request' ? "✉️ Your Manager Email" : "✉️ Account Email Address"}
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700 text-white rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm shadow-inner"
                                    placeholder={view === 'manager_request' ? "manager@gmail.com" : "owner@logistics.com"}
                                />
                            </div>

                            {/* Password Field with Show/Hide Toggle */}
                            {(view === 'sign_in' || view === 'sign_up') && (
                                <div>
                                    <div className="flex justify-between items-center mb-1.5 ml-1">
                                        <label htmlFor="password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                                            🔒 Password / Security Key
                                        </label>
                                        {view === 'sign_in' && (
                                            <button
                                                type="button"
                                                onClick={() => setView('forgot_password')}
                                                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete={view === 'sign_in' ? "current-password" : "new-password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-4 pr-11 py-3 bg-slate-950/70 border border-slate-700 text-white rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm shadow-inner"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded transition-colors"
                                            title={showPassword ? "Hide password" : "Show password"}
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || signingIn}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 active:scale-[0.98] transition-all shadow-[0_10px_25px_-5px_rgba(59,130,246,0.5)] border border-blue-400/30 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
                                >
                                    {signingIn ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Signing In...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{renderButtonText()}</span>
                                            <span className="group-hover:translate-x-1 transition-transform">➔</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Google Sign-in Alternative */}
                    {(view === 'sign_in' || view === 'sign_up') && !loading && !signingIn && !waitingForApproval && (
                        <div className="mt-6">
                            <div className="relative flex items-center justify-center">
                                <div className="w-full border-t border-slate-800" />
                                <span className="absolute px-3 bg-slate-900 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    or quick login
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-700/80 text-white rounded-xl text-sm font-bold shadow-md hover:border-slate-500 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                            >
                                <GoogleIcon className="h-5 w-5" />
                                <span>Continue with Google</span>
                            </button>
                        </div>
                    )}

                    {/* Navigation Footer */}
                    <div className="mt-6 text-center">
                        {view === 'forgot_password' ? (
                            <button
                                type="button"
                                onClick={() => setView('sign_in')}
                                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1 mx-auto"
                            >
                                <span>← Back to Admin Login</span>
                            </button>
                        ) : null}
                    </div>

                </div>

                {/* Footer Security Badge */}
                <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-[11px] font-semibold">
                    <span>🔒 256-Bit Encrypted Bilty Cloud</span>
                    <span>•</span>
                    <span>GST & E-Way Bill Ready</span>
                </div>
            </div>
        </div>
    );
};

export default Auth;
