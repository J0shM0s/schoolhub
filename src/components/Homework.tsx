import { useState, useMemo } from 'react';
import { Task } from '../types';
import { Check, Trash2, Filter, ArrowUpDown } from 'lucide-react';
import { formatDateShort, getDeadlineStatus, daysUntil, getPriorityColor } from '../utils/dateUtils';
import { useLanguage } from '../i18n/LanguageContext';

interface HomeworkProps {
  tasks: Task[];
  onToggleTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
}

export function Homework({ tasks, onToggleTask, onDeleteTask }: HomeworkProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'subject'>('date');
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  const subjects = useMemo(() => {
    const unique = [...new Set(tasks.map(t => t.subject))];
    return unique.sort();
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (filter === 'pending') {
      result = result.filter(t => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter(t => t.completed);
    }

    if (subjectFilter) {
      result = result.filter(t => t.subject === subjectFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'subject') {
        return a.subject.localeCompare(b.subject);
      }
      return 0;
    });

    return result;
  }, [tasks, filter, sortBy, subjectFilter]);

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{t('progress')}</span>
          <span className="text-sm font-medium text-gray-900">{completedCount} / {tasks.length} {t('completed')}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500 bg-green-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['pending', 'completed', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f === 'pending' ? t('open') : f === 'completed' ? t('completed') : t('all')}
            </button>
          ))}
        </div>

        {subjects.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allSubjects')}</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">{t('byDate')}</option>
            <option value="priority">{t('byPriority')}</option>
            <option value="subject">{t('bySubject')}</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">
            {filter === 'pending' ? t('noOpenTasks') : t('noTasksFound')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedTasks.map(task => {
            const status = getDeadlineStatus(task.due_date);
            const days = daysUntil(task.due_date);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-all ${
                  task.completed ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onToggleTask(task.id, !task.completed)}
                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${
                      task.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {task.completed && <Check className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <p className="text-sm text-gray-500">{task.subject}</p>
                    {task.description && (
                      <p className="text-sm text-gray-400 mt-1 truncate">{task.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? t('high') : task.priority === 'medium' ? t('medium') : t('low')}
                    </span>
                    <span className={`text-sm ${
                      task.completed ? 'text-gray-400' :
                      status === 'overdue' ? 'text-red-600 font-medium' :
                      status === 'urgent' ? 'text-red-500' :
                      status === 'soon' ? 'text-orange-500' : 'text-gray-500'
                    }`}>
                      {status === 'overdue' ? t('overdue') : status === 'urgent' ? t('today') : days === 1 ? t('tomorrow') : formatDateShort(task.due_date)}
                    </span>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
