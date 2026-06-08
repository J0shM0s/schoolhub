export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  subject: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: Priority;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject: string;
  title: string;
  description: string | null;
  exam_date: string;
  study_progress: number;
  created_at: string;
  updated_at: string;
}

export type TabType = 'dashboard' | 'calendar' | 'homework' | 'exams';

export interface FormData {
  type: 'task' | 'exam';
  subject: string;
  title: string;
  description: string;
  date: string;
  priority: Priority;
}
