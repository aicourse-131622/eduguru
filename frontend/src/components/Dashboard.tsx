import React, { useEffect, useState } from 'react';
import {
    Users,
    BookOpen,
    Clock,
    AlertCircle,
    Zap,
    Calendar as CalendarIcon,
    Megaphone,
    PlusCircle,
    TrendingUp,
    MessageSquare,
    ChevronRight,
    Search,
    BookMarked,
    CheckSquare,
    GraduationCap,
    ChevronLeft,
    ExternalLink
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    LineChart,
    Line
} from 'recharts';
import { User, JournalEntry, AttendanceStatus } from '../types';
import { storageService } from '../services/storageService';

interface DashboardProps {
    user: User | null;
    setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, setActiveTab }) => {
    const [stats, setStats] = useState({
        studentCount: 0,
        journalCount: 0,
        teachingHours: 0,
        actionNeeded: 0,
        actionClasses: [] as string[]
    });
    const [adminProgress, setAdminProgress] = useState({
        journal: 0,        // Progress E-Jurnal (target: 40 jurnal per bulan)
        assessment: 0,     // Progress E-Penilaian (persentase siswa yang sudah dinilai)
        counseling: 0      // Progress Bimbingan Konseling (target: 10 sesi per bulan)
    });
    const [todayActivities, setTodayActivities] = useState<{ journal: JournalEntry, className: string }[]>([]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<AttendanceStatus | null>(null);
    const [calendarDate, setCalendarDate] = useState(new Date());

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 11) return "Selamat Pagi";
        if (hour < 15) return "Selamat Siang";
        if (hour < 19) return "Selamat Sore";
        return "Selamat Malam";
    };

    const quotes = [
        "Pendidikan adalah senjata paling mematikan di dunia.",
        "Mengajar adalah belajar dua kali.",
        "Siswa tidak peduli seberapa banyak Anda tahu, sampai mereka tahu seberapa besar Anda peduli.",
        "Masa depan bangsa ada di tangan para pendidik."
    ];
    const [randomQuote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const basicStats = await storageService.getDashboardStats();
                const allJournals = await storageService.getJournals();
                const allClasses = await storageService.getClasses();
                const allStudents = await storageService.getStudents();
                const allRecords = await storageService.getAllAttendanceRecords();
                const allScores = await storageService.getAllScores();
                const allCounseling = await storageService.getCounselingSessions();

                const todayDate = new Date();
                const currentMonth = todayDate.getMonth();
                const currentYear = todayDate.getFullYear();

                // === CALCULATE ADMIN PROGRESS ===

                // 1. E-Jurnal Progress: Target 40 jurnal per bulan
                const journalsThisMonth = allJournals.filter(j => {
                    if (!j.date) return false;
                    const parts = String(j.date).split('-');
                    if (parts.length < 2) return false;
                    return parseInt(parts[0]) === currentYear && parseInt(parts[1]) - 1 === currentMonth;
                });
                const journalProgress = Math.min(Math.round((journalsThisMonth.length / 40) * 100), 100);

                // 2. E-Penilaian Progress: Persentase siswa yang sudah memiliki minimal 1 nilai bulan ini
                const scoresThisMonth = allScores.filter(s => {
                    if (!s.date) return false;
                    const parts = String(s.date).split('-');
                    if (parts.length < 2) return false;
                    return parseInt(parts[0]) === currentYear && parseInt(parts[1]) - 1 === currentMonth;
                });
                const studentsWithScores = new Set(scoresThisMonth.map(s => s.studentId));
                const assessmentProgress = allStudents.length > 0
                    ? Math.min(Math.round((studentsWithScores.size / allStudents.length) * 100), 100)
                    : 0;

                // 3. Bimbingan Konseling Progress: Target 10 sesi per bulan
                const counselingThisMonth = allCounseling.filter(c => {
                    if (!c.date) return false;
                    const parts = String(c.date).split('-');
                    if (parts.length < 2) return false;
                    return parseInt(parts[0]) === currentYear && parseInt(parts[1]) - 1 === currentMonth;
                });
                const counselingProgress = Math.min(Math.round((counselingThisMonth.length / 10) * 100), 100);

                setAdminProgress({
                    journal: journalProgress,
                    assessment: assessmentProgress,
                    counseling: counselingProgress
                });

                // === EXISTING LOGIC ===
                const alfaCounts: Record<string, number> = {};
                allRecords.forEach(r => {
                    const rDate = new Date(r.date);
                    if (r.status === 'A' && rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
                        alfaCounts[r.studentId] = (alfaCounts[r.studentId] || 0) + 1;
                    }
                });

                const problematicStudentIds = Object.keys(alfaCounts).filter(id => alfaCounts[id] >= 4);

                const affectedClassIds = new Set<string>();
                problematicStudentIds.forEach(sid => {
                    const student = allStudents.find(s => s.id === sid);
                    if (student) affectedClassIds.add(student.classId);
                });

                const affectedClassNames = Array.from(affectedClassIds).map(cid => {
                    return allClasses.find(c => c.id === cid)?.name || cid;
                });

                setStats({
                    ...basicStats,
                    actionNeeded: problematicStudentIds.length,
                    actionClasses: affectedClassNames
                });

                const todayStr = todayDate.toISOString().split('T')[0];
                const todays = allJournals
                    .filter(j => j.date === todayStr)
                    .map(j => ({
                        journal: j,
                        className: allClasses.find(c => c.id === j.classId)?.name || j.classId
                    }));

                setTodayActivities(todays);

                const pieData = [
                    { name: 'Hadir', value: 0, color: '#10b981', key: 'H' },
                    { name: 'Sakit', value: 0, color: '#3b82f6', key: 'S' },
                    { name: 'Izin', value: 0, color: '#f59e0b', key: 'I' },
                    { name: 'Alfa', value: 0, color: '#ef4444', key: 'A' }
                ];

                allRecords.forEach(r => {
                    const rDate = new Date(r.date);
                    if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
                        const cell = pieData.find(p => p.key === r.status);
                        if (cell) cell.value++;
                    }
                });

                setAttendanceData(pieData.filter(d => d.value > 0));
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            }
        };

        loadDashboardData();
    }, []);

    const statCards = [
        { title: 'Total Siswa', value: stats.studentCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', trend: [30, 40, 35, 50, 45, 60] },
        { title: 'Jurnal', value: stats.journalCount, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', trend: [10, 20, 15, 25, 30, 45] },
        { title: 'Jam Mengajar', value: stats.teachingHours, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', trend: [18, 18, 20, 22, 21, 24] },
        { title: 'Perlu Tindakan', value: stats.actionNeeded, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', details: stats.actionClasses },
    ];

    const shortcuts = [
        { label: 'Buat Jurnal', icon: PlusCircle, color: 'bg-primary-500', tab: 'journal' },
        { label: 'Input Absensi', icon: CheckSquare, color: 'bg-emerald-500', tab: 'attendance' },
        { label: 'ePenilaian', icon: GraduationCap, color: 'bg-blue-500', tab: 'assessment' },
        { label: 'Tanya AI', icon: MessageSquare, color: 'bg-purple-500', tab: 'chat-ai' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {getGreeting()}, <span className="text-primary-600 dark:text-primary-400">{user?.name}!</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium italic flex items-center gap-2">
                        <Zap size={16} className="text-amber-500" />
                        "{randomQuote}"
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm font-bold bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <CalendarIcon size={18} className="text-primary-600" />
                    <span className="dark:text-white">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="group overflow-hidden bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
                        <div className="flex justify-between items-start relative z-10">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                                <stat.icon size={24} />
                            </div>
                            {stat.trend && (
                                <div className="h-10 w-20 opacity-30 group-hover:opacity-100 transition-opacity">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={stat.trend.map(t => ({ v: t }))}>
                                            <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} className={stat.color} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 relative z-10">
                            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{stat.title}</h3>
                            <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 leading-none">
                                {stat.value}
                                {stat.title === 'Jam Mengajar' && <span className="text-sm font-medium ml-1">Jam</span>}
                            </p>
                        </div>

                        {stat.details && stat.value > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex flex-wrap gap-2">
                                <span className="text-[10px] uppercase font-black text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">Butuh Verifikasi</span>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">Alfa &ge; 4x di {stat.details.length} Kelas</div>
                            </div>
                        )}
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity ${stat.bg}`}></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black dark:text-white tracking-tight">Statistik Kehadiran</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Bulan berjalan ({new Date().toLocaleDateString('id-ID', { month: 'long' })})</p>
                            </div>
                            <TrendingUp className="text-emerald-500" size={24} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="h-64 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={attendanceData}
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                            onClick={(data) => setSelectedCategory(data.key)}
                                        >
                                            {attendanceData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer hover:opacity-80 transition-opacity outline-none" />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black dark:text-white">
                                        {Math.round((attendanceData.find((d: any) => d.key === 'H')?.value || 0) / attendanceData.reduce((a: number, b: any) => a + b.value, 0) * 100 || 0)}%
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Total Hadir</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {attendanceData.map((item: any) => (
                                    <div
                                        key={item.key}
                                        onClick={() => setSelectedCategory(item.key)}
                                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${selectedCategory === item.key ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-primary-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                                        </div>
                                        <span className="text-gray-900 dark:text-white font-black">{item.value} <span className="text-xs font-normal text-gray-500 italic">Siswa</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-black dark:text-white tracking-tight mb-6">Progress Administrasi</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'E-Jurnal', progress: adminProgress.journal, color: 'bg-emerald-500', target: '40 jurnal/bulan' },
                                { label: 'E-Penilaian', progress: adminProgress.assessment, color: 'bg-blue-500', target: '% siswa dinilai' },
                                { label: 'Bimbingan Konseling', progress: adminProgress.counseling, color: 'bg-amber-500', target: '10 sesi/bulan' }
                            ].map((p, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <div>
                                            <span className="font-bold dark:text-gray-300">{p.label}</span>
                                            <span className="text-xs text-gray-400 ml-2">({p.target})</span>
                                        </div>
                                        <span className="text-gray-500 font-semibold">{p.progress}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${p.color} transition-all duration-1000 ease-out`} style={{ width: `${p.progress}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-black dark:text-white mb-4">Shortcut Cepat</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {shortcuts.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveTab(s.tab)}
                                    className="group p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl hover:bg-primary-500 transition-all duration-300 text-left"
                                >
                                    <div className={`${s.color} p-2 rounded-xl text-white w-fit mb-3 group-hover:bg-white group-hover:text-primary-500 transition-colors shadow-lg shadow-black/5`}>
                                        <s.icon size={20} />
                                    </div>
                                    <span className="text-sm font-bold dark:text-white group-hover:text-white transition-colors">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black dark:text-white">Aktivitas Hari Ini</h3>
                            <div className="text-[10px] font-black uppercase text-primary-600 bg-primary-50 dark:bg-primary-900/40 px-3 py-1 rounded-full">
                                {todayActivities.length} Jurnal
                            </div>
                        </div>

                        <div className="space-y-4">
                            {todayActivities.length > 0 ? (
                                todayActivities.map((item: any, i: number) => (
                                    <div key={i} className="group p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border-l-4 border-primary-500 hover:bg-white dark:hover:bg-gray-700 transition shadow-sm hover:shadow-md">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{item.className}</h4>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.journal.subject}</p>
                                        <div className="mt-3 flex justify-between items-center">
                                            <span className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 px-2 py-0.5 rounded-full font-bold">Jam ke-{item.journal.startTime}</span>
                                            <button className="text-[10px] text-primary-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Detail <ChevronRight size={10} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 group bg-gray-50 dark:bg-gray-700/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-600 transition hover:border-primary-500">
                                    <BookMarked size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3 group-hover:text-primary-400 transition-colors" />
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Belum Ada Sesi</p>
                                    <button onClick={() => setActiveTab('journal')} className="text-xs text-primary-600 font-bold mt-2 hover:underline">Mulai buat jurnal sekarang &rarr;</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-primary-600 p-6 rounded-[2rem] text-white shadow-xl shadow-primary-500/20 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Megaphone size={20} className="animate-bounce" />
                                <h3 className="font-black text-lg">Pengumuman</h3>
                            </div>
                            <div className="space-y-4">
                                <a href="https://kemendikdasmen.go.id/" target="_blank" rel="noopener noreferrer" className="block bg-white/10 p-3 rounded-2xl backdrop-blur-sm hover:bg-white/20 transition cursor-pointer group/item">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold opacity-80">Info Kemdikdasmen</p>
                                        <ExternalLink size={12} className="opacity-60 group-hover/item:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-sm font-medium">Info terbaru dari Kementerian Pendidikan Dasar dan Menengah.</p>
                                </a>
                                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                                    <p className="text-xs font-bold opacity-80 mb-1">Sistem Update</p>
                                    <p className="text-sm font-medium">Fitur Chat AI baru saja ditingkatkan kinerjanya!</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                    </div>

                    <div onClick={() => setActiveTab('chat-ai')} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 group cursor-pointer hover:border-primary-500 transition-colors">
                        <div className="flex items-center gap-3 mb-4 text-purple-600">
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl">
                                <MessageSquare size={20} />
                            </div>
                            <h3 className="text-lg font-black dark:text-white">Chat AI Insight</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Tanyakan ke AI: "Bagaimana cara menangani siswa yang sering terlambat?"</p>
                        <div className="mt-4 py-2 px-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl text-xs font-bold text-purple-600 flex justify-between items-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                            <span>Ingin mencoba fitur Chat AI?</span>
                            <PlusCircle size={14} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-500 hover:text-primary-600"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white capitalize tracking-tight">
                                {calendarDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button
                                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-500 hover:text-primary-600"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'].map((d) => (
                                <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">
                                    {d}
                                </div>
                            ))}
                            {Array(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay()).fill(null).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {[...Array(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                                const day = i + 1;
                                const isToday = new Date().toDateString() === new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toDateString();
                                const isSunday = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).getDay() === 0;

                                return (
                                    <div key={day} className={`aspect-square flex items-center justify-center relative rounded-2xl transition-all duration-300 text-sm font-medium
                                        ${isToday
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/40 font-bold scale-110'
                                            : 'hover:bg-primary-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}
                                        ${isSunday && !isToday ? 'text-red-500' : ''}
                                    `}>
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};