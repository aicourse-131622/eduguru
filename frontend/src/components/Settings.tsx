import React, { useState } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { Save, User as UserIcon, Moon, Sun, Trash2, Shield, Bell, CheckCircle, X, Key, Camera, Layout, Zap, Globe, Github } from 'lucide-react';

interface SettingsProps {
    user: User | null;
    onUpdateUser: (user: User) => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser, isDarkMode, toggleTheme }) => {
    const [name, setName] = useState(user?.name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');

    // State Password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    // State Notifikasi
    const [notification, setNotification] = useState<{ show: boolean, message: string, type?: 'success' | 'error' } | null>(null);

    const handleSaveProfile = async () => {
        if (!user) return;
        try {
            const updated = await storageService.updateUser({ name, avatar });
            if (updated) {
                onUpdateUser(updated);
                setNotification({ show: true, message: 'Profil berhasil diperbarui!', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (error) {
            setNotification({ show: true, message: 'Gagal memperbarui profil.', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setNotification({ show: true, message: 'Konfirmasi password tidak cocok!', type: 'error' });
            return;
        }

        setIsPasswordLoading(true);
        try {
            const updated = await storageService.updateUser({ currentPassword, newPassword });
            if (updated) {
                setNotification({ show: true, message: 'Password berhasil diganti!', type: 'success' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            setNotification({ show: true, message: error.message || 'Gagal mengganti password', type: 'error' });
        } finally {
            setIsPasswordLoading(false);
            setTimeout(() => setNotification(null), 4000);
        }
    };

    const handleResetData = () => {
        const confirmText = prompt("Ketik 'RESET' untuk menghapus semua data (Jurnal, Nilai, Absensi). Data User tidak akan dihapus.");
        if (confirmText === 'RESET') {
            storageService.clearAllData();
            // Tidak perlu toast disini karena halaman akan direload
            alert('Semua data aplikasi telah dihapus. Halaman akan dimuat ulang.');
            window.location.reload();
        }
    };

    return (
        <div className="space-y-6 pb-10 relative">

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-20 right-4 z-[100] animate-[slideIn_0.3s_ease-out] md:right-8">
                    <div className={`${notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-lg bg-opacity-90 border border-white/10`}>
                        <div className="p-2 bg-white/20 rounded-full">
                            {notification.type === 'error' ? <X size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">{notification.type === 'error' ? 'Oops!' : 'Berhasil!'}</h4>
                            <p className="text-xs opacity-90">{notification.message}</p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-2 opacity-50 hover:opacity-100 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black dark:text-white tracking-tight">Pengaturan</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Kelola akun dan preferensi aplikasi Anda.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile & Security */}
                <div className="lg:col-span-2 space-y-8">
                    {/* User Profile Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <UserIcon size={120} />
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                            {/* Avatar section */}
                            <div className="relative group/avatar">
                                <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-primary-500 to-emerald-600 p-1 shadow-xl">
                                    <div className="w-full h-full rounded-[1.8rem] bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                                        {avatar ? (
                                            <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={48} className="text-primary-500" />
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = prompt('Masukkan URL foto profil baru Anda:', avatar);
                                        if (url !== null) setAvatar(url);
                                    }}
                                    className="absolute -right-2 -bottom-2 p-3 bg-white dark:bg-gray-700 shadow-lg rounded-2xl text-primary-600 hover:scale-110 transition active:scale-95 border border-gray-100 dark:border-gray-600"
                                >
                                    <Camera size={20} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-6 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider ml-1">Nama Lengkap & Gelar</label>
                                        <div className="relative group">
                                            <UserIcon className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-gray-50 dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all font-semibold"
                                                placeholder="Contoh: Ahmad, S.Pd."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider ml-1">Username / NIP</label>
                                        <div className="relative opacity-60">
                                            <Shield className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                readOnly
                                                value={username}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-gray-100 dark:bg-gray-900/40 dark:text-gray-400 font-semibold cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black uppercase text-primary-600 dark:text-primary-400 tracking-widest">{user?.role} ACCOUNT</span>
                                    </div>
                                    <button
                                        onClick={handleSaveProfile}
                                        className="bg-primary-600 hover:bg-primary-700 text-white font-black py-3 px-8 rounded-2xl shadow-xl shadow-primary-500/20 flex items-center gap-2 transition-all active:scale-[0.95]"
                                    >
                                        <Save size={20} />
                                        Simpan Perubahan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl shadow-inner">
                                <Key size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black dark:text-white tracking-tight">Keamanan Akun</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Perbarui kata sandi Anda secara berkala.</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider ml-1">Password Saat Ini</label>
                                    <input
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-2xl border-none bg-gray-50 dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all font-semibold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider ml-1">Password Baru</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-2xl border-none bg-gray-50 dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all font-semibold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider ml-1">Konfirmasi Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-2xl border-none bg-gray-50 dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all font-semibold"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    disabled={isPasswordLoading}
                                    className="px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPasswordLoading ? 'Memproses...' : 'Ganti Password Sekarang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column: App Settings & Info */}
                <div className="space-y-8">
                    {/* Appearance Section */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                    {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black dark:text-white">Tema</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{isDarkMode ? 'Dark Mode Aktif' : 'Light Mode Aktif'}</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`h-8 w-14 rounded-full transition-all flex items-center p-1 ${isDarkMode ? 'bg-primary-600' : 'bg-gray-200'}`}
                            >
                                <div className={`h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Language Section Mockup */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black dark:text-white">Bahasa</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pilih bahasa aplikasi</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex-1 py-2 px-3 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-xl font-bold text-xs ring-2 ring-primary-500">Bahasa Indonesia</button>
                            <button className="flex-1 py-2 px-3 bg-gray-50 dark:bg-gray-700/50 text-gray-400 rounded-xl font-bold text-xs opacity-50 grayscale hover:grayscale-0 transition cursor-not-allowed" title="Segera Hadir">English (Soon)</button>
                        </div>
                    </div>

                    {/* Modern Feature: Statistics Card */}
                    <div className="bg-primary-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-primary-500/20 relative overflow-hidden group">
                        <Zap className="absolute -right-8 -bottom-8 w-32 h-32 opacity-10 group-hover:scale-125 transition-transform duration-1000" />
                        <div className="relative z-10 flex flex-col h-full">
                            <h4 className="text-sm font-black uppercase tracking-widest opacity-80 mb-6">Status Sistem</h4>
                            <div className="space-y-4 flex-1">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span>Cloud Sync</span>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px]">AKTIF</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span>Database</span>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px]">CONNECTED</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span>Uptime</span>
                                    <span>99.9%</span>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                <p className="text-xs font-black tracking-widest">EDUGURU v1.2.0 PRO</p>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone Updated */}
                    <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-[2.5rem] border border-red-100 dark:border-red-900/50">
                        <h3 className="text-lg font-black text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
                            <Trash2 size={20} /> Danger Zone
                        </h3>
                        <p className="text-xs text-red-600 dark:text-red-400/70 mb-6 leading-relaxed">
                            Semua data jurnal, nilai, dan sesi bimbingan akan dihapus permanen dari server. Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <button
                            onClick={handleResetData}
                            className="w-full bg-white dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black py-4 rounded-2xl hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all shadow-sm active:scale-95 border border-red-100 dark:border-red-800/50"
                        >
                            Reset Semua Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 py-12">
                <div className="flex items-center gap-6 text-gray-400">
                    <a href="#" className="hover:text-primary-500 transition-colors"><Github size={20} /></a>
                    <Layout size={20} className="opacity-50" />
                    <Globe size={20} className="opacity-50" />
                </div>
                <div className="text-center text-[10px] font-black tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">
                    &copy; 2026 EduGuru Advanced &bull; Handcrafted for Teachers
                </div>
            </div>
        </div>
    );
};
