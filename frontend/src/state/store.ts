import { create } from 'zustand';

interface AppState {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  // Add more state as needed (e.g. notifications, user info)
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));
