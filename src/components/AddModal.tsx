import { useState, useEffect } from 'react';
import { X, BookOpen, FileText } from 'lucide-react';
import { FormData, Priority } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  selectedDate?: Date | null;
}

export function AddModal({ isOpen, onClose, onSubmit, selectedDate }: AddModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    type: 'task',
    subject: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium',
  });

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0],
      }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: 'task',
        subject: '',
        title: '',
        description: '',
        date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        priority: 'medium',
      });
    }
  }, [isOpen, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.title || !formData.date) return;
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('createNew')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFormData(prev => ({ ...prev, type: 'task' }))}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              formData.type === 'task'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            {t('task')}
          </button>
          <button
            onClick={() => setFormData(prev => ({ ...prev, type: 'exam' }))}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              formData.type === 'exam'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            {t('exam')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('subject')}</label>
            <input
              type="text"
              value={formData.subject}
              onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder={t('subjectPlaceholder')}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {formData.type === 'task' ? t('taskTitle') : t('examTitle')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={formData.type === 'task' ? t('taskTitlePlaceholder') : t('examTitlePlaceholder')}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('description')} <span className="text-gray-400">{t('descriptionOptional')}</span>
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('descriptionPlaceholder')}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {formData.type === 'task' ? t('dueDate') : t('examDate')}
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {formData.type === 'task' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('priority')}</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as Priority[]).map(priority => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      formData.priority === priority
                        ? priority === 'high'
                          ? 'bg-orange-500 text-white'
                          : priority === 'medium'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {priority === 'high' ? t('high') : priority === 'medium' ? t('medium') : t('low')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              {formData.type === 'task' ? t('createTask') : t('createExam')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
