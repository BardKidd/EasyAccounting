import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  name: string;
  email: string;
  setUser: (user: { name: string; email: string }) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        name: '',
        email: '',
        setUser: (user) => set({ name: user.name, email: user.email }),
        clearUser: () => set({ name: '', email: '' }),
      }),
      {
        name: 'user-storage',
      }
    )
  )
);
