import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Journal } from './components/Journal';
import { Attendance } from './components/Attendance';
import { Assessment } from './components/Assessment';
import { Counseling } from './components/Counseling';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { MasterData } from './components/MasterData';
import { ChatAI } from './components/ChatAI';
import { storageService } from './services/storageService';
import { User } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Initialize theme and check user session
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }

    // Check local storage for session
    const storedUser = storageService.getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  // Toggle Dark Mode Class on Body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Listen for unauthorized events (401)
  useEffect(() => {
    const handleUnauthorized = () => {
      storageService.logout();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} setActiveTab={setActiveTab} />;
      case 'journal': return <Journal />;
      case 'attendance': return <Attendance />;
      case 'assessment': return <Assessment />;
      case 'counseling': return <Counseling />;
      case 'reports': return <Reports />;
      case 'master-data': return <MasterData />;
      case 'chat-ai': return <ChatAI />;
      case 'settings': return <Settings user={user} onUpdateUser={setUser} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;
      default: return <Dashboard user={user} setActiveTab={setActiveTab} />;
    }
  };

  if (!user) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <Login onLogin={(u) => setUser(u)} />
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      toggleTheme={() => setIsDarkMode(!isDarkMode)}
      onLogout={handleLogout}
      user={user}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;