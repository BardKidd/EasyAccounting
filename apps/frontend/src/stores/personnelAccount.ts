import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Account } from '@repo/shared';

interface PersonnelAccountState {
  personnelAccounts: Account[];
  setPersonnelAccounts: (personnelAccounts: Account[]) => void;
}

export const usePersonnelAccountStore = create<PersonnelAccountState>()(
  devtools((set) => ({
    personnelAccounts: [],
    setPersonnelAccounts: (personnelAccounts) => set({ personnelAccounts }),
  }))
);
