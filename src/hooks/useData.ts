import { useState, useEffect, useCallback } from 'react';
import { Task, Exam } from '../types';
import { useAuthContext } from './useAuthContext';
import { getUserData, saveUserData, generateId, nowISO } from '../lib/localStorage';

export function useData() {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!user) {
      setTasks([]);
      setExams([]);
      setLoading(false);
      return;
    }

    const { tasks: storedTasks, exams: storedExams } = getUserData(user.id);
    setTasks(storedTasks);
    setExams(storedExams);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const persist = (nextTasks: Task[], nextExams: Exam[]) => {
    if (!user) return;
    saveUserData(user.id, { tasks: nextTasks, exams: nextExams });
  };

  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const newTask: Task = {
      ...task,
      id: generateId(),
      user_id: user.id,
      created_at: nowISO(),
      updated_at: nowISO(),
    };

    const nextTasks = [...tasks, newTask].sort((a, b) =>
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
    setTasks(nextTasks);
    persist(nextTasks, exams);

    return { data: newTask, error: null };
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const nextTasks = tasks.map((task) =>
      task.id === id ? { ...task, ...updates, updated_at: nowISO() } : task
    );
    setTasks(nextTasks);
    persist(nextTasks, exams);

    const updatedTask = nextTasks.find((task) => task.id === id) ?? null;
    return { data: updatedTask, error: null };
  };

  const deleteTask = async (id: string) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    const nextTasks = tasks.filter((task) => task.id !== id);
    setTasks(nextTasks);
    persist(nextTasks, exams);
    return { error: null };
  };

  const addExam = async (exam: Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const newExam: Exam = {
      ...exam,
      id: generateId(),
      user_id: user.id,
      created_at: nowISO(),
      updated_at: nowISO(),
    };

    const nextExams = [...exams, newExam].sort((a, b) =>
      new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
    );
    setExams(nextExams);
    persist(tasks, nextExams);

    return { data: newExam, error: null };
  };

  const updateExam = async (id: string, updates: Partial<Exam>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const nextExams = exams.map((exam) =>
      exam.id === id ? { ...exam, ...updates, updated_at: nowISO() } : exam
    );
    setExams(nextExams);
    persist(tasks, nextExams);

    const updatedExam = nextExams.find((exam) => exam.id === id) ?? null;
    return { data: updatedExam, error: null };
  };

  const deleteExam = async (id: string) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    const nextExams = exams.filter((exam) => exam.id !== id);
    setExams(nextExams);
    persist(tasks, nextExams);
    return { error: null };
  };

  return {
    tasks,
    exams,
    loading,
    addTask,
    updateTask,
    deleteTask,
    addExam,
    updateExam,
    deleteExam,
    refresh: fetchData,
  };
}
