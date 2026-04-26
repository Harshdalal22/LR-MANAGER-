
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { signUp, signIn, sendPasswordReset, signInWithGoogle, createManagerAccessRequest, listenToAccessRequest, applySession, checkOperatorRole } from '../services/supabaseService';
import { BookOpenIcon, GoogleIcon } from './icons';

type AuthView = 'sign_in' | 'sign_up' | 'forgot_password' | 'manager_request';

const Auth: React.FC = () => {
    const [view, setView] = useState<AuthView>('sign_in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [managerName, setManagerName] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [waitingForApproval, setWaitingForApproval] = useState(false);

    const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Processing...');

        try {
            switch (view) {
                case 'sign_in':
                    await signIn(email, password);
                    const roleInfo = await checkOperatorRole();
                    if (roleInfo && !roleInfo.isAdmin) {
                        sessionStorage.setItem('currentRole', 'Operator');
                        sessionStorage.setItem('adminId', roleInfo.adminId);
                        sessionStorage.setItem('roleSelected', 'true'); // Skip role selection
                    }
                    toast.success('Signed in successfully! Redirecting...', { id: toastId });
                    break;
                case 'sign_up':
                    await signUp(email, password);
                    toast.success('Sign up successful! Please check your email to confirm your account.', { id: toastId, duration: 6000 });
                    break;
                case 'forgot_password':
                    await sendPasswordReset(email);
                    toast.success('Password reset email sent! Please check your inbox.', { id: toastId, duration: 6000 });
                    break;
                case 'manager_request':
                    const request = await createManagerAccessRequest(companyEmail, managerName, email);
                    setWaitingForApproval(true);
                    toast.success('Request sent! Waiting for Admin to approve...', { id: toastId, duration: 4000 });

                    // Listen for the magic moment
                    listenToAccessRequest(request.id, async (sessionData) => {
                        try {
                            toast.success('Admin Approved Request! Signing you in...', { duration: 4000 });
                            sessionStorage.setItem('roleSelected', 'true'); // Automatically skip Role Selection modal
                            sessionStorage.setItem('currentRole', 'Manager'); // Ensure they login as Manager!
                            await applySession(sessionData);

                            // Force a hard reload to reset all React states (like currentRole and session) cleanly
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
        } catch (error) {
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
        const toastId = toast.loading('Redirecting to Google...');
        try {
            await signInWithGoogle();
            // Redirect happens automatically
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
            case 'sign_in': return 'Welcome Back';
            case 'sign_up': return 'Join Bilty Book';
            case 'forgot_password': return 'Reset Password';
            case 'manager_request': return 'Manager Access';
        }
    };

    const renderSubHeader = () => {
        switch (view) {
            case 'sign_in': return 'Enter your credentials to access your dashboard.';
            case 'sign_up': return 'Create a new account to manage your LRs.';
            case 'forgot_password': return 'Enter your email to receive a reset link.';
            case 'manager_request': return 'Send a request to your admin for instant access.';
        }
    };

    const renderButtonText = () => {
        switch (view) {
            case 'sign_in': return 'Sign In';
            case 'sign_up': return 'Create Account';
            case 'forgot_password': return 'Send Link';
            case 'manager_request': return 'Request Access';
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-gray-100 to-slate-200 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 relative">

                {/* 3D Card Container */}
                <div className="bg-white rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 p-10 relative overflow-hidden">

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                    <div className="text-center mb-8 relative z-10">
                        <BookOpenIcon className="w-16 h-16 mx-auto text-ssk-blue mb-4" />
                        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-800 mb-2 drop-shadow-sm">
                            {renderHeader()}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">
                            {renderSubHeader()}
                        </p>
                    </div>

                    {/* 3D Tabs / Toggle */}
                    {view !== 'forgot_password' && (
                        <div className="flex flex-wrap sm:flex-nowrap p-1 bg-gray-100 rounded-xl shadow-inner mb-8 relative z-10 text-xs sm:text-sm">
                            <button
                                onClick={() => setView('sign_in')}
                                className={`flex-1 min-w-[30%] py-2.5 font-bold rounded-lg transition-all duration-300 ${view === 'sign_in'
                                    ? 'bg-white text-blue-700 shadow-md transform scale-105 z-10'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Admin Login
                            </button>
                            <button
                                onClick={() => setView('manager_request')}
                                className={`flex-1 min-w-[30%] py-2.5 font-bold rounded-lg transition-all duration-300 ${view === 'manager_request'
                                    ? 'bg-white text-blue-700 shadow-md transform scale-105 z-10'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Manager
                            </button>
                            <button
                                onClick={() => setView('sign_up')}
                                className={`flex-1 py-2.5 font-bold rounded-lg transition-all duration-300 ${view === 'sign_up'
                                    ? 'bg-white text-blue-700 shadow-md transform scale-105 z-10'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    {waitingForApproval ? (
                        <div className="text-center py-10 relative z-10 isolate animate-pulse">
                            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-2xl font-bold text-blue-900 mb-2">Waiting for Admin</h3>
                            <p className="text-gray-500">We have notified the Admin. Please wait here, you will be automatically logged in once approved.</p>
                            <button
                                onClick={() => setWaitingForApproval(false)}
                                className="mt-8 text-sm font-semibold text-gray-500 hover:text-blue-600 underline"
                            >
                                Cancel Request
                            </button>
                        </div>
                    ) : (
                        <form className="space-y-6 relative z-10" onSubmit={handleAuthAction}>
                            {view === 'manager_request' && (
                                <>
                                    <div>
                                        <label htmlFor="companyEmail" className="block text-sm font-bold text-gray-700 mb-1 ml-1">Company (Admin) Email</label>
                                        <input
                                            id="companyEmail"
                                            type="email"
                                            required
                                            value={companyEmail}
                                            onChange={(e) => setCompanyEmail(e.target.value)}
                                            className="appearance-none relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-inner bg-gray-50 transition-all duration-200"
                                            placeholder="admin@company.com"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="managerName" className="block text-sm font-bold text-gray-700 mb-1 ml-1">Your Name</label>
                                        <input
                                            id="managerName"
                                            type="text"
                                            required
                                            value={managerName}
                                            onChange={(e) => setManagerName(e.target.value)}
                                            className="appearance-none relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-inner bg-gray-50 transition-all duration-200"
                                            placeholder="John Manager"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1 ml-1">{view === 'manager_request' ? "Your Email" : "Email Address"}</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:z-10 sm:text-sm shadow-inner bg-gray-50 transition-all duration-200"
                                    placeholder={view === 'manager_request' ? "you@gmail.com" : "name@company.com"}
                                />
                            </div>

                            {(view === 'sign_in' || view === 'sign_up') && (
                                <div>
                                    <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1 ml-1">Password</label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete={view === 'sign_in' ? "current-password" : "new-password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:z-10 sm:text-sm shadow-inner bg-gray-50 transition-all duration-200"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.6)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                                >
                                    {loading ? (
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : renderButtonText()}
                                </button>
                            </div>
                        </form>
                    )}

                    {(view === 'sign_in' || view === 'sign_up') && !waitingForApproval && (
                        <div className="mt-4 relative z-10">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500 font-medium">Or continue with</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                            >
                                <GoogleIcon className="h-5 w-5 mr-2" />
                                Google
                            </button>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-center relative z-10">
                        {view === 'sign_in' ? (
                            <button
                                onClick={() => setView('forgot_password')}
                                className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                Forgot your password?
                            </button>
                        ) : view === 'forgot_password' ? (
                            <button
                                onClick={() => setView('sign_in')}
                                className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                Back to Sign In
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Bottom Shadow Reflection */}
                <div className="absolute top-full left-10 right-10 h-4 bg-black/10 blur-xl rounded-[50%]"></div>
            </div>
        </div>
    );
};

export default Auth;
