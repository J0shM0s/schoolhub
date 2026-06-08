import { useState, useCallback, useEffect, useRef } from 'react';
import { Home, Calendar, BookOpen, GraduationCap, Plus, Settings } from 'lucide-react';
import { useData } from './hooks/useData';
import { AuthProvider, useAuthContext } from './hooks/useAuthContext';
import { supabase } from './lib/supabase';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { TabType, FormData, GoogleImportItem, GoogleSource } from './types';
import { Dashboard } from './components/Dashboard';
import { Calendar as CalendarView } from './components/Calendar';
import { Homework } from './components/Homework';
import { Exams } from './components/Exams';
import { AddModal } from './components/AddModal';
import { AuthPage } from './components/AuthPage';
import { SettingsPanel } from './components/SettingsPanel';

const itemSourceKey = (type: 'task' | 'exam', title: string, date: string, subject: string) =>
  `${type}|${title.trim().toLowerCase()}|${date}|${subject.trim().toLowerCase()}`;

type GoogleImportedSourceMap = Record<string, { sourceId: string; kind: 'calendar' | 'taskList' }>;

interface GoogleSettings {
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: number | null;
  google_calendar_sync: boolean;
  google_tasks_sync: boolean;
  google_selected_calendar_ids: string[] | null;
  google_selected_tasklist_ids: string[] | null;
  google_imported_source_map: GoogleImportedSourceMap | null;
}

function AppContent() {
  const { t, language, setLanguage } = useLanguage();
  const { session, loading: authLoading, signUp, signIn, signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [refreshKey, setRefreshKey] = useState(0);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleSource[]>([]);
  const [googleTaskLists, setGoogleTaskLists] = useState<GoogleSource[]>([]);
  const [googleImportedSourceMap, setGoogleImportedSourceMap] = useState<GoogleImportedSourceMap>({});
  const autoImportKeyRef = useRef<string | null>(null);

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
    refresh,
  } = useData();

  const isLoading = authLoading || dataLoading;
  const selectedGoogleCalendarIds = new Set(googleCalendars.filter((source) => source.selected).map((source) => source.id));
  const selectedGoogleTaskListIds = new Set(googleTaskLists.filter((source) => source.selected).map((source) => source.id));
  const shouldShowGoogleItem = (type: 'task' | 'exam', title: string, date: string, subject: string) => {
    const source = googleImportedSourceMap[itemSourceKey(type, title, date, subject)];
    if (!source) return true;
    if (source.kind === 'calendar') return googleCalendars.length === 0 || selectedGoogleCalendarIds.has(source.sourceId);
    return googleTaskLists.length === 0 || selectedGoogleTaskListIds.has(source.sourceId);
  };
  const visibleTasks = tasks.filter((task) => shouldShowGoogleItem('task', task.title, task.due_date, task.subject));
  const visibleExams = exams.filter((exam) => shouldShowGoogleItem('exam', exam.title, exam.exam_date, exam.subject));

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
      setStatusType('success');
      setStatusMessage(t('saved'));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
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
    setStatusType('success');
    setStatusMessage(t('saved'));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
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
    const handleMessage = async (event: MessageEvent) => {
      if (!session?.user?.id) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data as Record<string, unknown>;
      if (data?.type !== 'googleAuth' || data?.state !== session.user.id) return;

      const accessToken = data.access_token as string | undefined;
      const refreshToken = data.refresh_token as string | undefined;
      const expiresAt = typeof data.expires_at === 'number' ? data.expires_at : null;

      if (accessToken) {
        const { data: existingSettings } = await supabase
          .from('user_settings')
          .select('google_refresh_token')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const { data: savedSettings, error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: session.user.id,
            google_access_token: accessToken,
            google_refresh_token: refreshToken ?? existingSettings?.google_refresh_token ?? null,
            google_token_expiry: expiresAt,
            google_calendar_sync: true,
            google_tasks_sync: true,
          }, { onConflict: 'user_id' })
          .select('google_access_token, google_refresh_token')
          .maybeSingle();

        if (error || (!savedSettings?.google_access_token && !savedSettings?.google_refresh_token)) {
          console.error('Failed to save Google tokens:', error);
          setStatusType('error');
          setStatusMessage(error?.message || 'Google konnte nicht gespeichert werden.');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 5000);
          return;
        }

        setGoogleCalendars([]);
        setGoogleTaskLists([]);
        setRefreshKey((k) => k + 1);
        setStatusType('success');
        setStatusMessage(t('saved'));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [session?.user?.id, t]);

  const loadGoogleSettings = useCallback(async () => {
    if (!session?.user?.id) {
      setGoogleImportedSourceMap({});
      return null;
    }

    const selectGoogleSettings = async (includePersistedSources: boolean) => supabase
      .from('user_settings')
      .select(includePersistedSources
        ? 'google_access_token, google_refresh_token, google_token_expiry, google_calendar_sync, google_tasks_sync, google_selected_calendar_ids, google_selected_tasklist_ids, google_imported_source_map'
        : 'google_access_token, google_refresh_token, google_token_expiry, google_calendar_sync, google_tasks_sync'
      )
      .eq('user_id', session.user.id)
      .maybeSingle();

    let { data, error } = await selectGoogleSettings(true);

    if (error && /google_selected_|google_imported_source_map|column/i.test(error.message)) {
      const fallback = await selectGoogleSettings(false);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Failed to load Google settings:', error);
      return null;
    }

    const settings = data as GoogleSettings | null;
    setGoogleImportedSourceMap(settings?.google_imported_source_map ?? {});
    return settings;
  }, [session?.user?.id]);

  useEffect(() => {
    loadGoogleSettings();
  }, [loadGoogleSettings]);

  const updateGoogleTokens = useCallback(async (
    currentRefreshToken: string | null,
    tokens?: { access_token: string; refresh_token?: string | null; expires_at: number | null }
  ) => {
    if (!session?.user?.id || !tokens) return;

    await supabase
      .from('user_settings')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token ?? currentRefreshToken,
        google_token_expiry: tokens.expires_at,
      })
      .eq('user_id', session.user.id);
  }, [session?.user?.id]);

  const importGoogleData = useCallback(async (showSaved = false) => {
    if (!session?.user?.id) return;

    const settings = await loadGoogleSettings();

    if (!settings?.google_access_token && !settings?.google_refresh_token) return;
    if (!settings.google_calendar_sync && !settings.google_tasks_sync) return;

    const response = await fetch('/.netlify/functions/google-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: settings.google_access_token,
        refresh_token: settings.google_refresh_token,
        expires_at: settings.google_token_expiry,
        selected_calendar_ids: settings.google_calendar_sync ? settings.google_selected_calendar_ids : [],
        selected_tasklist_ids: settings.google_tasks_sync ? settings.google_selected_tasklist_ids : [],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Failed to import Google data:', result);
      return;
    }

    await updateGoogleTokens(settings.google_refresh_token, result.tokens);
    setGoogleCalendars(result.calendars || []);
    setGoogleTaskLists(result.taskLists || []);

    const selectedCalendarIds = (result.calendars || [])
      .filter((source: GoogleSource) => source.selected)
      .map((source: GoogleSource) => source.id);
    const selectedTaskListIds = (result.taskLists || [])
      .filter((source: GoogleSource) => source.selected)
      .map((source: GoogleSource) => source.id);
    const calendarIdsToSave = settings.google_selected_calendar_ids ?? selectedCalendarIds;
    const taskListIdsToSave = settings.google_selected_tasklist_ids ?? selectedTaskListIds;

    const importedItems = (result.items || []) as GoogleImportItem[];
    const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();
    const taskKeys = new Set(tasks.map((task) => `${normalize(task.title)}|${task.due_date}|${normalize(task.subject)}`));
    const examKeys = new Set(exams.map((exam) => `${normalize(exam.title)}|${exam.exam_date}|${normalize(exam.subject)}`));

    const tasksToInsert = importedItems
      .filter((item) => item.type === 'task')
      .filter((item) => {
        const key = `${normalize(item.title)}|${item.date}|${normalize(item.subject)}`;
        if (taskKeys.has(key)) return false;
        taskKeys.add(key);
        return true;
      })
      .map((item) => ({
        user_id: session.user.id,
        subject: item.subject,
        title: item.title,
        description: item.description,
        due_date: item.date,
        priority: 'medium',
        completed: Boolean(item.completed),
      }));

    const examsToInsert = importedItems
      .filter((item) => item.type === 'exam')
      .filter((item) => {
        const key = `${normalize(item.title)}|${item.date}|${normalize(item.subject)}`;
        if (examKeys.has(key)) return false;
        examKeys.add(key);
        return true;
      })
      .map((item) => ({
        user_id: session.user.id,
        subject: item.subject,
        title: item.title,
        description: item.description,
        exam_date: item.date,
        study_progress: 0,
      }));

    const nextSourceMap = { ...(settings.google_imported_source_map ?? {}) };
    const calendarIdsFromImport = new Set((result.calendars || []).map((source: GoogleSource) => source.id));
    for (const item of importedItems) {
      nextSourceMap[itemSourceKey(item.type, item.title, item.date, item.subject)] = {
        sourceId: item.source_id,
        kind: calendarIdsFromImport.has(item.source_id) ? 'calendar' : 'taskList',
      };
    }
    await supabase
      .from('user_settings')
      .upsert({
        user_id: session.user.id,
        google_selected_calendar_ids: calendarIdsToSave,
        google_selected_tasklist_ids: taskListIdsToSave,
        google_imported_source_map: nextSourceMap,
      })
      .eq('user_id', session.user.id);
    setGoogleImportedSourceMap(nextSourceMap);

    if (tasksToInsert.length > 0) {
      await supabase.from('tasks').insert(tasksToInsert);
    }
    if (examsToInsert.length > 0) {
      await supabase.from('exams').insert(examsToInsert);
    }
    if (tasksToInsert.length > 0 || examsToInsert.length > 0) {
      await refresh();
    }
    if (showSaved) {
      setStatusType('success');
      setStatusMessage(t('saved'));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }
  }, [exams, loadGoogleSettings, refresh, session?.user?.id, t, tasks, updateGoogleTokens]);

  const handleRefreshGoogleSources = useCallback(async () => {
    await importGoogleData(false);
  }, [importGoogleData]);

  const handleGoogleSourceToggle = useCallback(async (kind: 'calendar' | 'taskList', id: string, selected: boolean) => {
    if (!session?.user?.id) return;

    if (kind === 'calendar') {
      const next = googleCalendars.map((source) => source.id === id ? { ...source, selected } : source);
      setGoogleCalendars(next);
      await supabase
        .from('user_settings')
        .upsert({
          user_id: session.user.id,
          google_selected_calendar_ids: next.filter((source) => source.selected).map((source) => source.id),
        })
        .eq('user_id', session.user.id);
    } else {
      const next = googleTaskLists.map((source) => source.id === id ? { ...source, selected } : source);
      setGoogleTaskLists(next);
      await supabase
        .from('user_settings')
        .upsert({
          user_id: session.user.id,
          google_selected_tasklist_ids: next.filter((source) => source.selected).map((source) => source.id),
        })
        .eq('user_id', session.user.id);
    }
    await importGoogleData(true);
  }, [googleCalendars, googleTaskLists, importGoogleData, session?.user?.id]);

  const handleGoogleDisconnect = async () => {
    if (!session?.user?.id) return;

    await supabase
      .from('user_settings')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        google_calendar_sync: false,
        google_tasks_sync: false,
      })
      .eq('user_id', session.user.id);
    setGoogleCalendars([]);
    setGoogleTaskLists([]);
    setGoogleImportedSourceMap({});
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    const loadLanguage = async () => {
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data?.language === 'de' || data?.language === 'en') {
        setLanguage(data.language);
      }
    };

    loadLanguage();
  }, [session?.user?.id, setLanguage]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const key = `${session.user.id}-${refreshKey}`;
    if (autoImportKeyRef.current === key) return;
    autoImportKeyRef.current = key;
    importGoogleData(false);
  }, [importGoogleData, refreshKey, session?.user?.id]);

  const handleSyncCalendar = async () => {
    if (!session?.user?.id) return;
    
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('user_id', session.user.id)
      .single();

    if (!settings?.google_access_token && !settings?.google_refresh_token) return;

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
      await supabase
        .from('user_settings')
        .update({
          google_access_token: result.tokens.access_token,
          google_refresh_token: result.tokens.refresh_token ?? settings.google_refresh_token,
          google_token_expiry: result.tokens.expires_at,
        })
        .eq('user_id', session.user.id);
      setRefreshKey((k) => k + 1);
    }
    setStatusType('success');
    setStatusMessage(t('saved'));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleSyncTasks = async () => {
    if (!session?.user?.id) return;
    
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('user_id', session.user.id)
      .single();

    if (!settings?.google_access_token && !settings?.google_refresh_token) return;

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
      await supabase
        .from('user_settings')
        .update({
          google_access_token: result.tokens.access_token,
          google_refresh_token: result.tokens.refresh_token ?? settings.google_refresh_token,
          google_token_expiry: result.tokens.expires_at,
        })
        .eq('user_id', session.user.id);
      setRefreshKey((k) => k + 1);
    }
    setStatusType('success');
    setStatusMessage(t('saved'));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
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
          <Dashboard tasks={visibleTasks} exams={visibleExams} onToggleTask={handleToggleTask} />
        )}
        {activeTab === 'calendar' && (
          <CalendarView tasks={visibleTasks} exams={visibleExams} onSelectDate={handleDateSelect} />
        )}
        {activeTab === 'homework' && (
          <Homework tasks={visibleTasks} onToggleTask={handleToggleTask} onDeleteTask={deleteTask} />
        )}
        {activeTab === 'exams' && (
          <Exams exams={visibleExams} onUpdateProgress={handleUpdateExamProgress} onDeleteExam={deleteExam} />
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
        onImportGoogleData={() => importGoogleData(true)}
        onRefreshGoogleSources={handleRefreshGoogleSources}
        onGoogleSourceToggle={handleGoogleSourceToggle}
        googleCalendars={googleCalendars}
        googleTaskLists={googleTaskLists}
        userEmail={session?.user?.email || ''}
        userId={session?.user?.id || ''}
      />

      {showSuccess && (
        <div className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 ${
          statusType === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            {statusType === 'success' ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-sm font-bold">!</span>
            )}
          </div>
          <span className="font-medium">{statusMessage || t('saved')}</span>
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
