import { useState, useCallback, useEffect } from 'react';
import { Home, Calendar, BookOpen, GraduationCap, Plus, Settings } from 'lucide-react';
import { useData } from './hooks/useData';
import { AuthProvider, useAuthContext } from './hooks/useAuthContext';
import { getUserSettings, updateUserSettings } from './lib/localStorage';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { TabType, FormData } from './types';
import { Dashboard } from './components/Dashboard';
import { Calendar as CalendarView } from './components/Calendar';
import { Homework } from './components/Homework';
import { Exams } from './components/Exams';
import { AddModal } from './components/AddModal';
import { AuthPage } from './components/AuthPage';
import { SettingsPanel } from './components/SettingsPanel';

function AppContent() {
  const { t, language } = useLanguage();
  const { session, loading: authLoading, signUp, signIn, signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    tasks,
    exams,
    loading: dataLoading,
    addTask,
    updateTask,
    deleteTask,
    addExam,
    updateExam,
    deleteExam,
  } = useData();

  const isLoading = authLoading || dataLoading;

  const handleAuth = async (email: string, password: string, isSignUp: boolean) => {
    if (isSignUp) {
      return signUp(email, password);
    } else {
      return signIn(email, password);
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    await updateTask(id, { completed });
    if (completed) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleUpdateExamProgress = async (id: string, progress: number) => {
    await updateExam(id, { study_progress: progress });
  };

  const handleSubmitForm = async (data: FormData) => {
    if (data.type === 'task') {
      await addTask({
        subject: data.subject,
        title: data.title,
        description: data.description || null,
        due_date: data.date,
        priority: data.priority,
        completed: false,
      });
    } else {
      await addExam({
        subject: data.subject,
        title: data.title,
        description: data.description || null,
        exam_date: data.date,
        study_progress: 0,
      });
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleGoogleConnect = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const res = await fetch(`/.netlify/functions/google-auth-url?state=${encodeURIComponent(userId)}`);
      const data = await res.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        'GoogleSignIn',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setRefreshKey((k) => k + 1);
        }
      }, 500);
    } catch (error) {
      console.error('Failed to get Google auth URL:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!session?.user?.id) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data as Record<string, unknown>;
      if (data?.type !== 'googleAuth' || data?.state !== session.user.id) return;

      const accessToken = data.access_token as string | undefined;
      const refreshToken = data.refresh_token as string | undefined;
      const expiresAt = typeof data.expires_at === 'number' ? data.expires_at : null;

      if (accessToken) {
        updateUserSettings(session.user.id, {
          google_access_token: accessToken,
          google_refresh_token: refreshToken ?? null,
          google_token_expiry: expiresAt,
        });
        setRefreshKey((k) => k + 1);
        setShowSuccess(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [session?.user?.id]);

  const handleGoogleDisconnect = async () => {
    if (!session?.user?.id) return;

    updateUserSettings(session.user.id, {
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
      google_calendar_sync: false,
      google_tasks_sync: false,
    });
    setRefreshKey((k) => k + 1);
  };

  const handleSyncCalendar = async () => {
    if (!session?.user?.id) return;
    const settings = getUserSettings(session.user.id);
    if (!settings.google_access_token && !settings.google_refresh_token) return;

    const eventsToSync = tasks
      .filter((t) => !t.completed)
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        title: t.title,
        description: t.description,
        date: t.due_date,
      }));

    const response = await fetch('/.netlify/functions/sync-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: settings.google_access_token,
        refresh_token: settings.google_refresh_token,
        expires_at: settings.google_token_expiry,
        events: eventsToSync,
      }),
    });

    const result = await response.json();
    if (result.tokens) {
      updateUserSettings(session.user.id, {
        google_access_token: result.tokens.access_token,
        google_refresh_token: result.tokens.refresh_token ?? settings.google_refresh_token,
        google_token_expiry: result.tokens.expires_at,
      });
      setRefreshKey((k) => k + 1);
    }
    setShowSuccess(true);
  };

  const handleSyncTasks = async () => {
    if (!session?.user?.id) return;
    const settings = getUserSettings(session.user.id);
    if (!settings.google_access_token && !settings.google_refresh_token) return;

    const tasksToSync = tasks.map((t) => ({
      id: t.id,
      subject: t.subject,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      completed: t.completed,
    }));

    const response = await fetch('/.netlify/functions/sync-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: settings.google_access_token,
        refresh_token: settings.google_refresh_token,
        expires_at: settings.google_token_expiry,
        tasks: tasksToSync,
      }),
    });

    const result = await response.json();
    if (result.tokens) {
      updateUserSettings(session.user.id, {
        google_access_token: result.tokens.access_token,
        google_refresh_token: result.tokens.refresh_token ?? settings.google_refresh_token,
        google_token_expiry: result.tokens.expires_at,
      });
      setRefreshKey((k) => k + 1);
    }
    setShowSuccess(true);
  };

  const tabs = [
    { id: 'dashboard' as const, label: t('overview'), icon: Home },
    { id: 'calendar' as const, label: t('calendar'), icon: Calendar },
    { id: 'homework' as const, label: t('homework'), icon: BookOpen },
    { id: 'exams' as const, label: t('exams'), icon: GraduationCap },
  ];

  if (!session && !authLoading) {
    return <AuthPage onAuth={handleAuth} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-8">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">School Hub</h1>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setIsModalOpen(true);
                }}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('createNew')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard tasks={tasks} exams={exams} onToggleTask={handleToggleTask} />
        )}
        {activeTab === 'calendar' && (
          <CalendarView tasks={tasks} exams={exams} onSelectDate={handleDateSelect} />
        )}
        {activeTab === 'homework' && (
          <Homework tasks={tasks} onToggleTask={handleToggleTask} onDeleteTask={deleteTask} />
        )}
        {activeTab === 'exams' && (
          <Exams exams={exams} onUpdateProgress={handleUpdateExamProgress} onDeleteExam={deleteExam} />
        )}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="flex items-center justify-around py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <button
        onClick={() => {
          setSelectedDate(null);
          setIsModalOpen(true);
        }}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all z-30 active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        selectedDate={selectedDate}
      />

      <SettingsPanel
        key={refreshKey}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogout={async () => {
          await signOut();
          setIsSettingsOpen(false);
        }}
        onGoogleConnect={handleGoogleConnect}
        onGoogleDisconnect={handleGoogleDisconnect}
        onSyncCalendar={handleSyncCalendar}
        onSyncTasks={handleSyncTasks}
        userEmail={session?.user?.email || ''}
        userId={session?.user?.id || ''}
      />

      {showSuccess && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium">{t('saved')}</span>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
