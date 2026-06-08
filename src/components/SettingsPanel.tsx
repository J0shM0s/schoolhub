import { useState, useEffect, useCallback } from 'react';
import { X, Globe, Link, Unlink, Calendar, CheckSquare, LogOut, User, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { GoogleSource } from '../types';

interface UserSettings {
  language: 'de' | 'en';
  google_calendar_sync: boolean;
  google_tasks_sync: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: number | null;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
  onSyncCalendar: () => void;
  onSyncTasks: () => void;
  onImportGoogleData: () => void;
  onRefreshGoogleSources: () => void;
  onGoogleSourceToggle: (kind: 'calendar' | 'taskList', id: string, selected: boolean) => void;
  googleCalendars: GoogleSource[];
  googleTaskLists: GoogleSource[];
  userEmail: string;
  userId: string;
}

export function SettingsPanel({
  isOpen,
  onClose,
  onLogout,
  onGoogleConnect,
  onGoogleDisconnect,
  onSyncCalendar,
  onSyncTasks,
  onImportGoogleData,
  onRefreshGoogleSources,
  onGoogleSourceToggle,
  googleCalendars,
  googleTaskLists,
  userEmail,
  userId,
}: SettingsPanelProps) {
  const { t, language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'calendar' | 'tasks' | 'import' | 'sources' | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const { data: remoteSettings } = await supabase
      .from('user_settings')
      .select('language, google_calendar_sync, google_tasks_sync, google_access_token, google_refresh_token, google_token_expiry')
      .eq('user_id', userId)
      .maybeSingle();

    const nextSettings: UserSettings = {
      language: remoteSettings?.language ?? 'de',
      google_calendar_sync: Boolean(remoteSettings?.google_calendar_sync),
      google_tasks_sync: Boolean(remoteSettings?.google_tasks_sync),
      google_access_token: remoteSettings?.google_access_token ?? null,
      google_refresh_token: remoteSettings?.google_refresh_token ?? null,
      google_token_expiry: remoteSettings?.google_token_expiry ?? null,
    };

    setSettings(nextSettings);
    if (nextSettings.language && nextSettings.language !== language) {
      setLanguage(nextSettings.language);
    }
    setLoading(false);
  }, [language, setLanguage, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadSettings();
    }
  }, [isOpen, loadSettings, userId]);

  const handleLanguageChange = async (lang: 'de' | 'en') => {
    setLanguage(lang);
    if (!userId) return;

    const nextSettings: UserSettings = {
      ...(settings ?? {
        language: 'de',
        google_calendar_sync: false,
        google_tasks_sync: false,
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
      }),
      language: lang,
    };

    setSettings(nextSettings);
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        language: lang,
      })
      .eq('user_id', userId);
  };

  const handleToggleSync = async (type: 'calendar' | 'tasks') => {
    if (!userId || !settings) return;

    const field = type === 'calendar' ? 'google_calendar_sync' : 'google_tasks_sync';
    const nextSettings: UserSettings = {
      ...settings,
      [field]: !settings[field],
    } as UserSettings;

    setSettings(nextSettings);
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        [field]: nextSettings[field],
      })
      .eq('user_id', userId);
    await onRefreshGoogleSources();
  };

  const handleSyncCalendar = async () => {
    setSyncing('calendar');
    await onSyncCalendar();
    setSyncing(null);
  };

  const handleSyncTasks = async () => {
    setSyncing('tasks');
    await onSyncTasks();
    setSyncing(null);
  };

  const handleImportGoogleData = async () => {
    setSyncing('import');
    await onImportGoogleData();
    setSyncing(null);
  };

  const handleRefreshGoogleSources = async () => {
    setSyncing('sources');
    await onRefreshGoogleSources();
    setSyncing(null);
  };

  const sourceLabel = (source: GoogleSource) => (
    <span className="min-w-0">
      <span className="block text-sm font-medium text-gray-900 truncate">{source.title}</span>
      <span className="block text-xs text-gray-500">{source.type === 'exam' ? t('exam') : t('task')}</span>
    </span>
  );

  const selectedCalendarsCount = googleCalendars.filter((c) => c.selected).length;
  const selectedTaskListsCount = googleTaskLists.filter((t) => t.selected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t('settings')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Account */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('account')}
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">{t('email')}</p>
                <p className="font-medium text-gray-900">{userEmail}</p>
              </div>
              <button
                onClick={onLogout}
                className="mt-4 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </button>
            </section>

            {/* Language */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {t('language')}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLanguageChange('de')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    language === 'de'
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('german')}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    language === 'en'
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('english')}
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <Link className="w-4 h-4" />
                {t('syncSettings')}
              </h3>

              {!settings?.google_access_token && !settings?.google_refresh_token ? (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{t('googleNotConnected')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('connectGoogle')}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await onGoogleConnect();
                      setTimeout(loadSettings, 1000);
                    }}
                    className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {t('connectGoogle')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-green-700">{t('googleConnected')}</p>
                      <p className="text-sm text-green-700/80">{t('googleAutoSync')}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleImportGoogleData}
                    disabled={syncing === 'import'}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing === 'import' ? 'animate-spin' : ''}`} />
                    {syncing === 'import' ? t('loading') : t('importGoogleNow')}
                  </button>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <span className="font-medium text-gray-900">{t('googleCalendar')}</span>
                      </div>
                      <button
                        onClick={() => handleToggleSync('calendar')}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.google_calendar_sync ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.google_calendar_sync ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    {settings.google_calendar_sync && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {googleCalendars.length === 0 ? (
                            <button
                              onClick={handleRefreshGoogleSources}
                              disabled={syncing === 'sources'}
                              className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {syncing === 'sources' ? t('loading') : t('loadGoogleSources')}
                            </button>
                          ) : googleCalendars.map((source) => (
                            <label key={source.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={source.selected}
                                onChange={(event) => onGoogleSourceToggle('calendar', source.id, event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                disabled={source.selected && selectedCalendarsCount === 1}
                              />
                              {sourceLabel(source)}
                            </label>
                          )))}
                        </div>
                        <button
                          onClick={handleSyncCalendar}
                          disabled={syncing === 'calendar'}
                          className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {syncing === 'calendar' ? t('loading') : t('syncCalendar')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-gray-900">{t('googleTasks')}</span>
                      </div>
                      <button
                        onClick={() => handleToggleSync('tasks')}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.google_tasks_sync ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.google_tasks_sync ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    {settings.google_tasks_sync && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {googleTaskLists.length === 0 ? (
                            <button
                              onClick={handleRefreshGoogleSources}
                              disabled={syncing === 'sources'}
                              className="w-full py-2 bg-green-50 hover:bg-green-100 text-green-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {syncing === 'sources' ? t('loading') : t('loadGoogleSources')}
                            </button>
                          ) : googleTaskLists.map((source) => (
                            <label key={source.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={source.selected}
                                onChange={(event) => onGoogleSourceToggle('taskList', source.id, event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-green-600"
                                disabled={source.selected && selectedTaskListsCount === 1}
                              />
                              {sourceLabel(source)}
                            </label>
                          )))}
                        </div>
                        <button
                          onClick={handleSyncTasks}
                          disabled={syncing === 'tasks'}
                          className="w-full py-2 bg-green-50 hover:bg-green-100 text-green-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {syncing === 'tasks' ? t('loading') : t('syncTasks')}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={onGoogleDisconnect}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Unlink className="w-4 h-4" />
                    {t('disconnectGoogle')}
                  </button>
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
