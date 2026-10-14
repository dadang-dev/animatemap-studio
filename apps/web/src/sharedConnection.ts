import { create } from 'zustand';
import type { SharedDocument } from '@animatemap/project-schema/collaboration';
// Connection metadata remains transient; credentials are exclusively HttpOnly cookies.
export const useSharedConnection = create<{
  accountId: string | null;
  document: SharedDocument | null;
  account: (id: string | null) => void;
  select: (document: SharedDocument | null) => void;
}>((set) => ({
  accountId: null,
  document: null,
  account: (id) =>
    set((state) => ({
      accountId: id,
      document: state.accountId === id ? state.document : null,
    })),
  select: (document) => set({ document }),
}));
