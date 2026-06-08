import { useState } from 'react';
import { Task, Exam } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthDates, getWeekDates, dateToString, isToday, getSubjectColor } from '../utils/dateUtils';
import { useLanguage } from '../i18n/LanguageContext';

interface CalendarProps {
  tasks: Task[];
  exams: Exam[];
  onSelectDate: (date: Date) => void;
}

export function Calendar({ tasks, exams, onSelectDate }: CalendarProps) {
  const { t, language } = useLanguage();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = dateToString(date);
    const dayTasks = tasks.filter(t => t.due_date === dateStr && !t.completed);
    const dayExams = exams.filter(e => e.exam_date === dateStr);
    return { tasks: dayTasks, exams: dayExams };
  };

  const dates = view === 'month'
    ? getMonthDates(currentDate.getFullYear(), currentDate.getMonth())
    : getWeekDates(currentDate);

  const weekDaysDe = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const weekDaysEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const weekDays = language === 'de' ? weekDaysDe : weekDaysEn;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {view === 'month'
              ? currentDate.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' })
              : `${t('weekFrom')} ${dates[0].toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit' })}`
            }
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t('month')}
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t('week')}
            </button>
          </div>
          <button
            onClick={() => navigate('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {dates.map((date, index) => {
            const dateStr = dateToString(date);
            const { tasks: dayTasks, exams: dayExams } = getEventsForDate(date);
            const isCurrentMonth = view === 'month' ? date.getMonth() === currentDate.getMonth() : true;
            const today = isToday(dateStr);

            return (
              <div
                key={index}
                onClick={() => onSelectDate(date)}
                className={`min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  !isCurrentMonth ? 'bg-gray-50/50' : ''
                }`}
              >
                <div className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-medium ${
                  today ? 'bg-blue-500 text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {date.getDate()}
                </div>

                <div className="mt-1 space-y-1">
                  {dayTasks.slice(0, 2).map(task => (
                    <div
                      key={task.id}
                      className={`text-xs px-2 py-1 rounded truncate border ${getSubjectColor(task.subject)}`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayExams.slice(0, 2 - dayTasks.length).map(exam => (
                    <div
                      key={exam.id}
                      className="text-xs px-2 py-1 rounded truncate bg-red-50 border border-red-200 text-red-700"
                    >
                      {exam.title}
                    </div>
                  ))}
                  {(dayTasks.length + dayExams.length > 2) && (
                    <div className="text-xs text-gray-400 px-2">
                      +{dayTasks.length + dayExams.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span>{t('task')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
          <span>{t('exam')}</span>
        </div>
      </div>
    </div>
  );
}
