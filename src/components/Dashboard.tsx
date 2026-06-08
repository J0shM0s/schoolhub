import { Task, Exam } from '../types';
import { Check, Clock, AlertCircle, Calendar, BookOpen, Target } from 'lucide-react';
import { formatDateShort, getTodayTasks, getUpcomingExams, getWeekProgress, getDeadlineStatus, daysUntil, getPriorityColor } from '../utils/dateUtils';
import { useLanguage } from '../i18n/LanguageContext';

interface DashboardProps {
  tasks: Task[];
  exams: Exam[];
  onToggleTask: (id: string, completed: boolean) => void;
}

export function Dashboard({ tasks, exams, onToggleTask }: DashboardProps) {
  const { t } = useLanguage();
  const todayTasks = getTodayTasks(tasks);
  const upcomingExams = getUpcomingExams(exams);
  const weekProgress = getWeekProgress(tasks);
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedToday = tasks.filter(t => t.completed && new Date(t.updated_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="space-y-6">
      {/* Today Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('today')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t('dueToday')}</span>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{todayTasks.length}</p>
            <p className="text-sm text-gray-500 mt-1">{t('tasks')}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t('thisWeek')}</span>
              <Target className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{weekProgress}%</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${weekProgress}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t('exams')}</span>
              <BookOpen className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{upcomingExams.length}</p>
            <p className="text-sm text-gray-500 mt-1">{t('examsThisWeek')}</p>
          </div>
        </div>

        {completedToday > 0 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              {t('nice')} {t('tasksCompleted', { count: completedToday, plural: completedToday !== 1 ? 's' : '' })}
            </span>
          </div>
        )}
      </section>

      {/* Todo Widget */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('upcomingTasks')}</h3>
        {pendingTasks.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">{t('allTasksDone')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingTasks.slice(0, 6).map(task => {
              const status = getDeadlineStatus(task.due_date);
              const days = daysUntil(task.due_date);

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                >
                  <button
                    onClick={() => onToggleTask(task.id, true)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-blue-400 transition-colors flex items-center justify-center flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? t('high') : task.priority === 'medium' ? t('medium') : t('low')}
                    </span>
                    <span className={`text-sm flex items-center gap-1 ${
                      status === 'overdue' ? 'text-red-600 font-medium' :
                      status === 'urgent' ? 'text-red-500' :
                      status === 'soon' ? 'text-orange-500' : 'text-gray-500'
                    }`}>
                      {status === 'overdue' && <AlertCircle className="w-4 h-4" />}
                      {status === 'urgent' ? t('today') : days === 1 ? t('tomorrow') : formatDateShort(task.due_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Exams */}
      {exams.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('exams')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exams.slice(0, 4).map(exam => {
              const days = daysUntil(exam.exam_date);

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{exam.title}</p>
                    <p className="text-sm text-gray-500">{exam.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      days < 0 ? 'text-gray-400' : days <= 3 ? 'text-red-500' : days <= 7 ? 'text-orange-500' : 'text-gray-600'
                    }`}>
                      {days < 0 ? t('past') : days === 0 ? t('todayExam') : t('daysLeft', { count: days })}
                    </p>
                    <div className="w-24 bg-gray-100 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full transition-all duration-500 bg-green-500"
                        style={{ width: `${exam.study_progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
