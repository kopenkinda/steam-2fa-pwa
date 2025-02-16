import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateAuthCode } from "./lib/totp";

export type SteamAccount = {
  alias: string;
  key: string;
};

export type AccountStore = {
  selectedAccount: SteamAccount | null;
  accounts: SteamAccount[];
  addAccount: (account: SteamAccount) => void;
  selectAccount: (key: string) => void;
  removeAccount: (key: string) => void;
};

const store = persist<AccountStore>(
  (set) => ({
    selectedAccount: null,
    accounts: [],
    addAccount(account) {
      set((state) => ({
        accounts: state.accounts.some((acc) => acc.key === account.key)
          ? state.accounts
          : [...state.accounts, account],
      }));
    },
    selectAccount(key) {
      set((state) => ({
        selectedAccount: state.accounts.find((acc) => acc.key === key) || null,
      }));
    },
    removeAccount(key) {
      set((state) => ({
        accounts: state.accounts.filter((acc) => acc.key !== key),
        selectedAccount:
          state.selectedAccount?.key === key ? null : state.selectedAccount,
      }));
    },
  }),
  {
    name: "steam-accounts",
    storage: createJSONStorage(() => localStorage),
    partialize(state) {
      return {
        ...state,
        selectedAccount: null,
      };
    },
  }
);

export const useAccountsStore = create(store);
export const useAccounts = () => useAccountsStore((state) => state.accounts);
export const useAddAccount = () =>
  useAccountsStore((state) => state.addAccount);
export const useRemoveAccount = () =>
  useAccountsStore((state) => state.removeAccount);
export const useSelectedAccount = () => {
  const acc = useAccountsStore((state) => state.selectedAccount);
  if (!acc) {
    return null;
  }
  return {
    ...acc,
    code: async () => {
      return await generateAuthCode(acc.key);
    },
  };
};
export const useSelectAccount = () =>
  useAccountsStore((state) => state.selectAccount);
