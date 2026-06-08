import { Task, Exam } from '../types';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  });
}

export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  return date >= today && date <= weekEnd;
}

export function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function daysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(dateStr: string): 'overdue' | 'urgent' | 'soon' | 'normal' {
  const days = daysUntil(dateStr);
  if (days < 0) return 'overdue';
  if (days === 0) return 'urgent';
  if (days <= 3) return 'soon';
  return 'normal';
}

export function getTodayTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => isToday(t.due_date) && !t.completed);
}

export function getUpcomingTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => !t.completed && isThisWeek(t.due_date));
}

export function getUpcomingExams(exams: Exam[]): Exam[] {
  return exams.filter(e => isThisWeek(e.exam_date));
}

export function getWeekProgress(tasks: Task[]): number {
  const thisWeek = tasks.filter(t => isThisWeek(t.due_date));
  if (thisWeek.length === 0) return 0;
  const completed = thisWeek.filter(t => t.completed).length;
  return Math.round((completed / thisWeek.length) * 100);
}

export function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get the day of the week for the first day (0 = Sunday)
  const startPadding = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startPadding);

  // Get the day of the week for the last day
  const endPadding = 6 - lastDay.getDay();
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + endPadding);

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function getWeekDates(date: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }

  return dates;
}

export function dateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function getSubjectColor(subject: string): string {
  const colors = [
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-purple-50 border-purple-200',
    'bg-amber-50 border-amber-200',
    'bg-rose-50 border-rose-200',
    'bg-cyan-50 border-cyan-200',
  ];
  const index = subject.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}
