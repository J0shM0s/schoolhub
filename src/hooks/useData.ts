import { useState, useEffect, useCallback } from 'react';
import { Task, Exam } from '../types';
import { useAuthContext } from './useAuthContext';
import { supabase } from '../lib/supabase';

export function useData() {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setExams([]);
      setLoading(false);
      return;
    }

    try {
      const [{ data: tasksData }, { data: examsData }] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('exams')
          .select('*')
          .eq('user_id', user.id),
      ]);

      setTasks((tasksData || []).sort((a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ));
      setExams((examsData || []).sort((a, b) =>
        new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
      ));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        user_id: user.id,
      })
      .select()
      .single();

    if (data) {
      setTasks([...tasks, data].sort((a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ));
    }

    return { data, error };
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (data) {
      setTasks(tasks.map((task) => (task.id === id ? data : task)));
    }

    return { data, error };
  };

  const deleteTask = async (id: string) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setTasks(tasks.filter((task) => task.id !== id));
    }

    return { error };
  };

  const addExam = async (exam: Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const { data, error } = await supabase
      .from('exams')
      .insert({
        ...exam,
        user_id: user.id,
      })
      .select()
      .single();

    if (data) {
      setExams([...exams, data].sort((a, b) =>
        new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
      ));
    }

    return { data, error };
  };

  const updateExam = async (id: string, updates: Partial<Exam>) => {
    if (!user) {
      return { data: null, error: new Error('No authenticated user') };
    }

    const { data, error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (data) {
      setExams(exams.map((exam) => (exam.id === id ? data : exam)));
    }

    return { data, error };
  };

  const deleteExam = async (id: string) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setExams(exams.filter((exam) => exam.id !== id));
    }

    return { error };
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
