import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { sendChatMessage, ChatMessage, isAIAvailable } from '../services/geminiService';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    isError?: boolean;
    isLoading?: boolean;
}

const INITIAL_MESSAGE: Message = {
    id: 'init-1',
    role: 'model',
    text: 'Halo Bapak/Ibu Guru! 👋\n\nSaya adalah Asisten Cerdas EduGuru yang siap membantu Anda:\n\n• 📚 Merancang strategi pembelajaran kreatif\n• ✍️ Membuat soal latihan formatif/sumatif\n• 👥 Saran penanganan siswa (konseling dasar)\n• 💡 Menjawab pertanyaan seputar materi pelajaran\n\nApa yang bisa saya bantu hari ini?'
};

const QUICK_PROMPTS = [
    { label: '📝 Buat Soal', prompt: 'Buatkan 5 soal pilihan ganda tentang ' },
    { label: '💡 Ide Mengajar', prompt: 'Berikan 3 metode pembelajaran kreatif untuk materi ' },
    { label: '📚 Rangkum Materi', prompt: 'Buatkan rangkuman singkat tentang ' },
    { label: '🎯 RPP Singkat', prompt: 'Buatkan kerangka RPP untuk materi ' },
];

export const ChatAI: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Check AI availability on mount
        const checkAI = async () => {
            try {
                const available = await isAIAvailable();
                setAiStatus(available ? 'online' : 'offline');

                if (!available) {
                    setMessages(prev => [...prev, {
                        id: 'err-init',
                        role: 'model',
                        text: '⚠️ Layanan AI sedang tidak tersedia. Pastikan GEMINI_API_KEY sudah dikonfigurasi di server.',
                        isError: true
                    }]);
                }
            } catch {
                setAiStatus('offline');
            }
        };

        checkAI();
    }, []);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Build chat history for context
    const getChatHistory = (): ChatMessage[] => {
        return messages
            .filter(m => !m.isError && !m.isLoading && m.id !== 'init-1')
            .map(m => ({ role: m.role, text: m.text }));
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userText = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

        // Add user message
        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: userText }]);

        // Add loading placeholder
        const aiMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: '', isLoading: true }]);

        try {
            const history = getChatHistory();
            const response = await sendChatMessage(userText, history);

            // Update with actual response
            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId ? { ...msg, text: response, isLoading: false } : msg
            ));
        } catch (error: any) {
            console.error(error);
            // Replace loading with error message
            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId ? {
                    ...msg,
                    text: error.message || 'Maaf, terjadi kesalahan saat menghubungi server AI. Silakan coba lagi.',
                    isLoading: false,
                    isError: true
                } : msg
            ));
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        setInputValue(prompt);
        inputRef.current?.focus();
    };

    const handleReset = () => {
        setMessages([INITIAL_MESSAGE]);
        setInputValue('');
    };

    const formatMessage = (text: string) => {
        // Simple markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">$1</code>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                            <Sparkles size={22} />
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${aiStatus === 'online' ? 'bg-green-500' :
                                aiStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                            }`} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            Asisten Cerdas
                            {aiStatus === 'online' && (
                                <span className="text-xs font-normal bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Wifi size={10} /> Online
                                </span>
                            )}
                            {aiStatus === 'offline' && (
                                <span className="text-xs font-normal bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <WifiOff size={10} /> Offline
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Gemini AI</p>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2"
                    title="Reset Chat"
                >
                    <RefreshCw size={18} />
                    <span className="hidden sm:inline text-sm font-medium">Reset</span>
                </button>
            </div>

            {/* Quick Prompts */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                {QUICK_PROMPTS.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleQuickPrompt(item.prompt)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-4 mb-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-[fadeIn_0.2s_ease-out]`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-primary-500 to-green-500 text-white'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                            {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                        </div>

                        <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-primary-600 to-green-600 text-white rounded-tr-sm shadow-lg shadow-primary-500/20'
                                : msg.isError
                                    ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50 rounded-tl-sm'
                                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-tl-sm'
                            }`}>
                            {msg.isLoading ? (
                                <div className="flex gap-2 items-center h-6">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                                    <span className="text-gray-500 dark:text-gray-400">Sedang mengetik...</span>
                                </div>
                            ) : msg.isError ? (
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{msg.text}</span>
                                </div>
                            ) : (
                                <div
                                    className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                                />
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="relative bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition">
                <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={aiStatus === 'offline' ? 'AI sedang offline...' : 'Ketik pesan Anda... (Enter untuk kirim)'}
                    disabled={aiStatus === 'offline'}
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none max-h-32 min-h-[52px] py-3 pl-3 pr-14 text-sm dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={1}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim() || aiStatus === 'offline'}
                    className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all ${isLoading || !inputValue.trim() || aiStatus === 'offline'
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-primary-600 to-green-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 active:scale-95'
                        }`}
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>

            {/* Mobile hint */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2 md:hidden">
                Shift+Enter untuk baris baru
            </p>
        </div>
    );
};