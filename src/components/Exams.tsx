import { Exam } from '../types';
import { Calendar, Trash2, Clock } from 'lucide-react';
import { daysUntil, formatDateShort, isThisWeek } from '../utils/dateUtils';
import { useLanguage } from '../i18n/LanguageContext';

interface ExamsProps {
  exams: Exam[];
  onUpdateProgress: (id: string, progress: number) => void;
  onDeleteExam: (id: string) => void;
}

export function Exams({ exams, onUpdateProgress, onDeleteExam }: ExamsProps) {
  const { t } = useLanguage();
  const upcoming = exams.filter(e => daysUntil(e.exam_date) >= 0);
  const past = exams.filter(e => daysUntil(e.exam_date) < 0);

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'text-gray-400';
    if (days === 0) return 'text-red-600';
    if (days <= 3) return 'text-red-500';
    if (days <= 7) return 'text-orange-500';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Exams */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('upcomingExams')} ({upcoming.length})
        </h3>

        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center">
            <Calendar className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">{t('noUpcomingExams')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map(exam => {
              const days = daysUntil(exam.exam_date);
              const isThisWeekExam = isThisWeek(exam.exam_date);

              return (
                <div
                  key={exam.id}
                  className={`bg-white rounded-xl p-5 border shadow-sm transition-shadow hover:shadow-md ${
                    isThisWeekExam ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{exam.title}</h4>
                      <p className="text-sm text-gray-500">{exam.subject}</p>
                    </div>
                    <button
                      onClick={() => onDeleteExam(exam.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{formatDateShort(exam.exam_date)}</span>
                    </div>
                    <div className={`flex items-center gap-1 font-medium ${getUrgencyColor(days)}`}>
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {days === 0 ? t('todayExam') : days === 1 ? t('tomorrow') : t('daysLeft', { count: days })}
                      </span>
                    </div>
                  </div>

                  {exam.description && (
                    <p className="text-sm text-gray-500 mb-4">{exam.description}</p>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{t('learningProgress')}</span>
                      <span className="text-sm font-medium text-gray-900">{exam.study_progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          exam.study_progress === 100 ? 'bg-green-500' :
                          exam.study_progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${exam.study_progress}%` }}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      {[0, 25, 50, 75, 100].map(progress => (
                        <button
                          key={progress}
                          onClick={() => onUpdateProgress(exam.id, progress)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            exam.study_progress === progress
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {progress}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Exams */}
      {past.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('pastExams')} ({past.length})
          </h3>
          <div className="space-y-2">
            {past.map(exam => (
              <div
                key={exam.id}
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-700 line-through">{exam.title}</p>
                    <p className="text-sm text-gray-400">{exam.subject} - {formatDateShort(exam.exam_date)}</p>
                  </div>
                  <button
                    onClick={() => onDeleteExam(exam.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
