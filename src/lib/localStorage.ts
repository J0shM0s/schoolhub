import { Exam, Task } from '../types';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface UserSettings {
  language: 'de' | 'en';
  google_calendar_sync: boolean;
  google_tasks_sync: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: number | null;
}

const USERS_KEY = 'school-hub-users';
const SESSION_KEY = 'school-hub-session';
const DATA_KEY_PREFIX = 'school-hub-data-';
const SETTINGS_KEY_PREFIX = 'school-hub-settings-';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function getUsers() {
  return read<{ id: string; email: string; password: string }[]>(USERS_KEY, []);
}

export function saveUsers(users: { id: string; email: string; password: string }[]) {
  write(USERS_KEY, users);
}

export function getSession(): AuthSession | null {
  return read<AuthSession | null>(SESSION_KEY, null);
}

export function saveSession(session: AuthSession | null) {
  if (session === null) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    return;
  }
  write(SESSION_KEY, session);
}

export function createUser(email: string, password: string) {
  const users = getUsers();
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('Email already registered');
  }

  const newUser = {
    id: generateId(),
    email,
    password,
  };

  saveUsers([...users, newUser]);
  return { id: newUser.id, email: newUser.email };
}

export function loginUser(email: string, password: string) {
  const users = getUsers();
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (!existing) {
    throw new Error('Email not found');
  }
  if (existing.password !== password) {
    throw new Error('Incorrect password');
  }
  return { id: existing.id, email: existing.email };
}

export function getUserData(userId: string) {
  return read<{ tasks: Task[]; exams: Exam[] }>(`${DATA_KEY_PREFIX}${userId}`, {
    tasks: [],
    exams: [],
  });
}

export function saveUserData(userId: string, data: { tasks: Task[]; exams: Exam[] }) {
  write(`${DATA_KEY_PREFIX}${userId}`, data);
}

export function getUserSettings(userId: string): UserSettings {
  return read<UserSettings>(`${SETTINGS_KEY_PREFIX}${userId}`, {
    language: 'de',
    google_calendar_sync: false,
    google_tasks_sync: false,
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
  });
}

export function saveUserSettings(userId: string, settings: UserSettings) {
  write(`${SETTINGS_KEY_PREFIX}${userId}`, settings);
}

export function updateUserSettings(userId: string, updates: Partial<UserSettings>) {
  const current = getUserSettings(userId);
  const next = { ...current, ...updates };
  saveUserSettings(userId, next);
  return next;
}
