import React, { useState } from 'react';
import {
    GraduationCap,
    Mail,
    Lock,
    User as UserIcon,
    ArrowRight,
    Github,
    ArrowLeft,
    CheckCircle,
    Shield,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { authApi, setToken } from '../services/apiService';
import { User, Role } from '../types';

interface LoginProps {
    onLogin: (user: User) => void;
}

type ViewState = 'LOGIN' | 'REGISTER' | 'FORGOT';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [view, setView] = useState<ViewState>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-login from OAuth Redirect
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const userJson = params.get('user');

        if (token && userJson) {
            try {
                const user = JSON.parse(decodeURIComponent(userJson));
                storageService.saveToken(token);
                storageService.saveUser(user);
                setToken(token);
                onLogin(user);

                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.error('Failed to parse OAuth user', e);
            }
        }
    }, [onLogin]);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'GURU' as Role
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null); // Clear error on input change
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (view === 'FORGOT') {
                // Forgot password is still mock (would need email service)
                alert(`Link reset password telah dikirim ke ${formData.email}`);
                setView('LOGIN');
                setLoading(false);
                return;
            }

            if (view === 'REGISTER') {
                // Validate passwords match
                if (formData.password !== formData.confirmPassword) {
                    setError('Password konfirmasi tidak cocok!');
                    setLoading(false);
                    return;
                }

                if (formData.password.length < 8) {
                    setError('Password minimal 8 karakter');
                    setLoading(false);
                    return;
                }

                // Register new user
                const response = await authApi.register({
                    username: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role: formData.role
                });

                // Save token and user
                storageService.saveToken(response.token);
                storageService.saveUser(response.user);
                setToken(response.token);

                onLogin(response.user);
            } else {
                // Login
                const response = await authApi.login(formData.email, formData.password);

                // Save token and user
                storageService.saveToken(response.token);
                storageService.saveUser(response.user);
                setToken(response.token);

                onLogin(response.user);
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        // Redirect to backend OAuth endpoint
        const API_URL = import.meta.env.VITE_API_URL || (window.location.origin + '/api');
        window.location.href = `${API_URL}/auth/${provider.toLowerCase()}`;
    };

    const handleDemoLogin = (provider?: string) => {
        setLoading(true);

        const name = provider ? `${provider} User` : 'Guru Demo';
        // Simulating different avatars based on provider
        let avatar = 'https://ui-avatars.com/api/?name=Guru+Demo&background=22c55e&color=fff';
        if (provider === 'Google') avatar = 'https://ui-avatars.com/api/?name=Google+User&background=DB4437&color=fff';
        if (provider === 'GitHub') avatar = 'https://ui-avatars.com/api/?name=GitHub+User&background=24292F&color=fff';
        if (provider === 'Microsoft') avatar = 'https://ui-avatars.com/api/?name=Microsoft+User&background=00A4EF&color=fff';

        // Create mock user
        const demoUser: User = {
            id: provider ? `demo_${provider.toLowerCase()}_001` : 'demo_user_001',
            username: provider ? `demo@${provider.toLowerCase()}.com` : 'demo@eduguru.com',
            name: name,
            role: 'GURU',
            avatar: avatar
        };

        setTimeout(() => {
            storageService.saveUser(demoUser);
            onLogin(demoUser);
            setLoading(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex font-sans" >

            {/* LEFT SIDE - BRANDING & ILLUSTRATION (Hidden on Mobile) */}
            < div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-green-800 dark:from-primary-700 dark:via-primary-800 dark:to-green-900 relative overflow-hidden flex-col justify-between p-12 text-white" >
                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/10 shadow-lg">
                        <GraduationCap size={32} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">EduGuru</h1>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-4xl font-extrabold mb-6 leading-tight drop-shadow-lg">
                        Mengajar Lebih Efektif, <br />Administrasi Lebih Rapi.
                    </h2>
                    <p className="text-primary-100 text-lg mb-8 leading-relaxed">
                        Bergabunglah dengan ribuan guru yang telah beralih ke digital.
                        Kelola jurnal, absensi, nilai, dan konseling dalam satu aplikasi terintegrasi dengan AI.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-6">
                        {['Jurnal Mengajar', 'Absensi Siswa', 'Penilaian', 'Bimbingan', 'AI Assistant'].map((feature, i) => (
                            <span key={i} className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm border border-white/10">
                                {feature}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 w-fit">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-9 h-9 rounded-full border-2 border-primary-600 bg-gray-300 overflow-hidden shadow-md">
                                    <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="user" />
                                </div>
                            ))}
                        </div>
                        <span>Dipercaya oleh Guru Profesional</span>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-primary-200/80">
                    © 2024 EduGuru App. All rights reserved. Powered by Gemini AI.
                </div>

                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" ></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-900/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
                <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-green-400/20 rounded-full blur-2xl"></div>
            </div >

            {/* RIGHT SIDE - FORM */}
            < div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative" >
                <div className="w-full max-w-md space-y-6">

                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="mx-auto h-14 w-14 bg-gradient-to-br from-primary-500 to-green-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary-500/30 rotate-3">
                            <GraduationCap size={30} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">EduGuru</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Asisten Guru Modern</p>
                    </div>

                    {/* Header Text based on View */}
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {view === 'LOGIN' && 'Selamat Datang Kembali'}
                            {view === 'REGISTER' && 'Buat Akun Baru'}
                            {view === 'FORGOT' && 'Lupa Password?'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {view === 'LOGIN' && 'Masuk untuk mengelola kelas Anda hari ini.'}
                            {view === 'REGISTER' && 'Lengkapi data diri untuk mulai menggunakan aplikasi.'}
                            {view === 'FORGOT' && 'Masukkan email untuk mereset kata sandi Anda.'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 animate-shake">
                            <AlertCircle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Social Login Buttons */}
                    {view === 'LOGIN' && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Google')}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm"
                            >
                                <GoogleIcon className="w-5 h-5" />
                                Google
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Microsoft')}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm"
                            >
                                <MicrosoftIcon className="w-5 h-5" />
                                Microsoft
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('GitHub')}
                                disabled={loading}
                                className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#24292F] text-white border border-[#24292F] rounded-xl font-bold hover:bg-[#24292F]/90 transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm"
                            >
                                <Github size={20} />
                                GitHub
                            </button>
                        </div>
                    )}

                    {/* Divider */}
                    {view === 'LOGIN' && (
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-gray-50 dark:bg-gray-900 text-gray-500">atau masuk dengan akun</span>
                            </div>
                        </div>
                    )}

                    {/* FORM */}
                    <form className="space-y-5" onSubmit={handleSubmit}>

                        {view === 'REGISTER' && (
                            <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5 ml-1">Nama Lengkap</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <UserIcon size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:text-white sm:text-sm transition-shadow"
                                            placeholder="Nama Lengkap & Gelar"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5 ml-1">Peran / Role</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'GURU' })}
                                            className={`flex items-center justify-center px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${formData.role === 'GURU'
                                                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 ring-1 ring-primary-500'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                                                }`}
                                        >
                                            Guru Mapel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                                            className={`flex items-center justify-center px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${formData.role === 'ADMIN'
                                                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 ring-1 ring-primary-500'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                                                }`}
                                        >
                                            <Shield size={16} className="mr-2" />
                                            Admin / BK
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5 ml-1">
                                {view === 'REGISTER' ? 'Email Address' : 'Username / Email'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    name="email"
                                    type="text"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:text-white sm:text-sm transition-shadow"
                                    placeholder="nama@sekolah.sch.id"
                                />
                            </div>
                        </div>

                        {view !== 'FORGOT' && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5 ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:text-white sm:text-sm transition-shadow"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {view === 'REGISTER' && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5 ml-1">Konfirmasi Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <CheckCircle size={18} />
                                    </div>
                                    <input
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:text-white sm:text-sm transition-shadow"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {view === 'LOGIN' && (
                            <div className="flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => setView('FORGOT')}
                                    className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                                >
                                    Lupa password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-600/30 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-green-600 hover:from-primary-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] hover:shadow-primary-500/40"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {view === 'LOGIN' && 'Masuk Aplikasi'}
                                    {view === 'REGISTER' && 'Daftar Sekarang'}
                                    {view === 'FORGOT' && 'Kirim Link Reset'}
                                    {view !== 'FORGOT' && <ArrowRight size={18} />}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="text-center mt-6">
                        {view === 'LOGIN' ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Belum punya akun?{' '}
                                <button
                                    onClick={() => { setView('REGISTER'); setError(null); }}
                                    className="font-bold text-primary-600 hover:text-primary-500 dark:text-primary-400 transition"
                                >
                                    Daftar gratis
                                </button>
                            </p>
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                                <ArrowLeft size={14} />
                                Kembali ke{' '}
                                <button
                                    onClick={() => { setView('LOGIN'); setError(null); }}
                                    className="font-bold text-primary-600 hover:text-primary-500 dark:text-primary-400 transition"
                                >
                                    Halaman Login
                                </button>
                            </p>
                        )}
                    </div>

                    {/* Server Status Indicator */}
                    <div className="text-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Secure connection • v1.0.0
                        </p>
                    </div>
                </div>
            </div >
        </div >
    );
};

// Simple Google Icon Component
const GoogleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const MicrosoftIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
        <path fill="#f35325" d="M1 1h10v10H1z" />
        <path fill="#81bc06" d="M12 1h10v10H12z" />
        <path fill="#05a6f0" d="M1 12h10v10H1z" />
        <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
);
