import React, { ReactNode } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  GraduationCap,
  MessageCircleHeart,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  FileBarChart,
  User as UserIcon,
  Database,
  ClipboardList,
  Bot,
  Search
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onLogout?: () => void;
  user?: User | null;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'master-data', label: 'Master Data', icon: Database },
  { id: 'journal', label: 'eJurnal', icon: BookOpen },
  { id: 'attendance', label: 'eSensi', icon: CheckSquare },
  { id: 'assessment', label: 'ePenilaian', icon: GraduationCap },
  { id: 'counseling', label: 'eKonseling', icon: MessageCircleHeart },
  { id: 'reports', label: 'Laporan', icon: FileBarChart },
  { id: 'chat-ai', label: 'Chat AI', icon: Bot },
];

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  isDarkMode,
  toggleTheme,
  onLogout,
  user
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredMenuItems = MENU_ITEMS.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row font-sans">

      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-gray-800 shadow p-4 flex justify-between items-center sticky top-0 z-50">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="bg-primary-600 text-white p-2 rounded-lg">
            <GraduationCap size={20} />
          </div>
          <h1 className="font-bold text-lg dark:text-white">EduGuru</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 transition-colors">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 dark:text-gray-300 transition-transform active:scale-95">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div
            className="p-6 hidden md:flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group/logo"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="bg-primary-600 text-white p-2 rounded-lg shadow-lg shadow-primary-600/20 group-hover/logo:scale-110 transition-transform">
              <GraduationCap size={24} />
            </div>
            <span className="text-2xl font-black dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600">EduGuru</span>
          </div>

          {/* User Profile Snippet */}
          {user && (
            <div className="px-6 pb-4 mb-2 border-b border-gray-50 dark:border-gray-700/50">
              <div className="flex items-center gap-3 p-2 rounded-2xl bg-gray-50 dark:bg-gray-700/30">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 overflow-hidden flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                  {user.avatar ? (
                    <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={20} className="text-primary-600" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-[10px] uppercase font-black text-gray-400">{user.role === 'GURU' ? 'Guru Mapel' : user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Search */}
          <div className="px-4 mb-4 mt-2">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Cari Menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary-500 dark:text-white transition-all outline-none"
              />
            </div>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200
                  ${activeTab === item.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 -translate-y-0.5'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50'}
                `}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-gray-400'} />
                {item.label}
              </button>
            ))}

            {filteredMenuItems.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-8 italic">Menu tidak ditemukan</p>
            )}

            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700/50">
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200
                  ${activeTab === 'settings'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}
                `}
              >
                <Settings size={20} className={activeTab === 'settings' ? 'text-white' : 'text-gray-400'} />
                Pengaturan
              </button>
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </nav>

          {/* Theme Toggle Desktop */}
          <div className="p-4 hidden md:flex border-t border-gray-100 dark:border-gray-700/50 justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <span className="text-[10px] uppercase font-black text-gray-400">Mode Tampilan</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 p-1.5 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 transition-transform active:scale-95"
            >
              <div className={`p-1 rounded-full transition-colors ${!isDarkMode ? 'bg-amber-100 text-amber-600' : 'text-gray-400'}`}>
                <Sun size={14} />
              </div>
              <div className={`p-1 rounded-full transition-colors ${isDarkMode ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}>
                <Moon size={14} />
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto pb-20 md:pb-0 h-full">
          {children}
        </div>
      </main>

      {/* Overlay for mobile drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};