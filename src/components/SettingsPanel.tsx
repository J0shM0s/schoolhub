import { useState, useEffect } from 'react';
import { X, Globe, Link, Unlink, Calendar, CheckSquare, LogOut, User, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getUserSettings, saveUserSettings, UserSettings } from '../lib/localStorage';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
  onSyncCalendar: () => void;
  onSyncTasks: () => void;
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
  userEmail,
  userId,
}: SettingsPanelProps) {
  const { t, language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'calendar' | 'tasks' | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadSettings();
    }
  }, [isOpen, userId]);

  const loadSettings = async () => {
    setLoading(true);
    const userSettings = getUserSettings(userId);
    setSettings(userSettings);
    if (userSettings.language && userSettings.language !== language) {
      setLanguage(userSettings.language);
    }
    setLoading(false);
  };

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
    saveUserSettings(userId, nextSettings);
  };

  const handleToggleSync = async (type: 'calendar' | 'tasks') => {
    if (!userId || !settings) return;

    const field = type === 'calendar' ? 'google_calendar_sync' : 'google_tasks_sync';
    const nextSettings: UserSettings = {
      ...settings,
      [field]: !settings[field],
    } as UserSettings;

    setSettings(nextSettings);
    saveUserSettings(userId, nextSettings);
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

              {!settings?.google_access_token ? (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{t('googleNotConnected')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('connectGoogle')}</p>
                    </div>
                  </div>
                  <button
                    onClick={onGoogleConnect}
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
                    <p className="font-medium text-green-700">{t('googleConnected')}</p>
                  </div>

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
                      <button
                        onClick={handleSyncCalendar}
                        disabled={syncing === 'calendar'}
                        className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {syncing === 'calendar' ? t('loading') : t('syncCalendar')}
                      </button>
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
                      <button
                        onClick={handleSyncTasks}
                        disabled={syncing === 'tasks'}
                        className="w-full py-2 bg-green-50 hover:bg-green-100 text-green-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {syncing === 'tasks' ? t('loading') : t('syncTasks')}
                      </button>
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
