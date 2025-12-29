import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserData {
  "_id"?: string,
  "phone": string,
  "role"?: string,
  "provider"?: string,
  "isVerified"?: boolean,
  "isProfileCompleted"?: boolean,
  "profile"?: {
    "_id"?: string,
    "user"?: string,
    "fullName"?: string,
    "licenseDocuments"?: any[],
    "availability"?: any,
    "createdAt"?: any,
    "updatedAt"?: any,
    "__v"?: 0
  },
}

interface AuthStore {
  token: string;
  refreshToken: string;
  userData?: UserData;
  isLoggedIn?: boolean;
  profileVersion: number;

  setToken: (token: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  setUserData: (user: UserData) => void;
  updateUserData: (partialUser: Partial<UserData>) => void;
  bumpProfileVersion: () => void;
  logout: () => void;
}

// Custom localStorage adapter
const localStorageAdapter = {
  getItem: (name: string) => {
    try {
      const value = localStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('Failed to parse localStorage value', e);
      return null;
    }
  },
  setItem: (name: string, value: unknown) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

// Create the Zustand store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: '',
      refreshToken: '',
      userData: undefined,
      isLoggedIn: false,
      profileVersion: 0,

      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setUserData: (user) => set({ userData: user, isLoggedIn: true }),

      updateUserData: (partialUser: any) => {
        const current = get().userData || {};
        set({
          userData: {
            ...current,
            ...partialUser,
          },
        });
      },

      bumpProfileVersion: () =>
        set({
          profileVersion: (get().profileVersion || 0) + 1,
        }),

      logout: () =>
        set({
          token: '',
          refreshToken: '',
          userData: undefined,
          isLoggedIn: false,
          profileVersion: 0,
        }),
    }),
    {
      name: 'auth-storage',
      storage: localStorageAdapter,
    },
  ),
);
