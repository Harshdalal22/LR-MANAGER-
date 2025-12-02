import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { signUp, signIn, sendPasswordReset } from '../services/supabaseService';
import { BookOpenIcon } from './icons';

type AuthView = 'sign_in' | 'sign_up' | 'forgot_password';

const Auth: React.FC = () => {
    const [view, setView] = useState<AuthView>('sign_in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Processing...');

        try {
            switch (view) {
                case 'sign_in':
                    await signIn(email, password);
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
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast.error(errorMessage, { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    const renderHeader = () => {
        switch (view) {
            case 'sign_in': return 'Welcome Back';
            case 'sign_up': return 'Join Bilty Book';
            case 'forgot_password': return 'Reset Password';
        }
    };

    const renderSubHeader = () => {
        switch (view) {
            case 'sign_in': return 'Enter your credentials to access your dashboard.';
            case 'sign_up': return 'Create a new account to manage your LRs.';
            case 'forgot_password': return 'Enter your email to receive a reset link.';
        }
    };
    
    const renderButtonText = () => {
        switch (view) {
            case 'sign_in': return 'Sign In';
            case 'sign_up': return 'Create Account';
            case 'forgot_password': return 'Send Link';
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
                        <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner mb-8 relative z-10">
                            <button
                                onClick={() => setView('sign_in')}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                                    view === 'sign_in'
                                        ? 'bg-white text-blue-700 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] transform scale-105'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setView('sign_up')}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                                    view === 'sign_up'
                                        ? 'bg-white text-blue-700 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] transform scale-105'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    <form className="space-y-6 relative z-10" onSubmit={handleAuthAction}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1 ml-1">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:z-10 sm:text-sm shadow-inner bg-gray-50 transition-all duration-200"
                                placeholder="name@company.com"
                            />
                        </div>

                        {view !== 'forgot_password' && (
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