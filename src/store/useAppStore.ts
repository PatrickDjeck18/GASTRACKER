import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Station, SortMode, MapRegion } from '../types/station';
import { DEFAULT_SEARCH_RADIUS } from '../constants/fuelTypes';

export interface FilterState {
  fuelType: string | null;
  openNowOnly: boolean;
  maxPrice: number | null;
  minPrice: number | null;
  countryFilter: string | null;
}

export interface SavingsState {
  tankSize: string;
  usualPrice: string;
  economy: string;
}

export interface SavedCalculation {
  id: string;
  date: number; // timestamp
  fillSaving: number;
  tripCost: number;
  net: number;
  currency: string;
}

export interface RetentionState {
  lastOpenDate: string | null;
  lastOpenAt: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  weeklySavingsGoal: number;
}

interface AppState {
  /* location */
  userCoords: { latitude: number; longitude: number } | null;
  countryCode: string | null;
  locationName: string | null;

  /* stations */
  stations: Station[];
  selectedStationId: string | null;

  /* filters & sorting */
  filters: FilterState;
  sortMode: SortMode;
  searchRadius: number;

  /* map */
  mapRegion: MapRegion | null;
  isMapMoved: boolean;

  /* preferences */
  darkMode: 'system' | 'light' | 'dark';
  manualCurrency: string | null;

  /* savings */
  savings: SavingsState;
  savedCalculations: SavedCalculation[];
  retention: RetentionState;

  /* actions */
  setUserLocation: (lat: number, lon: number, country?: string | null) => void;
  setLocationName: (name: string | null) => void;
  setStations: (stations: Station[]) => void;
  setSelectedStation: (id: string | null) => void;
  setFilters: (patch: Partial<FilterState>) => void;
  setSortMode: (mode: SortMode) => void;
  setSearchRadius: (r: number) => void;
  setMapRegion: (region: MapRegion) => void;
  setIsMapMoved: (v: boolean) => void;
  setDarkMode: (mode: AppState['darkMode']) => void;
  setManualCurrency: (c: string | null) => void;
  setSavings: (patch: Partial<SavingsState>) => void;
  addSavedCalculation: (calc: Omit<SavedCalculation, 'id' | 'date'>) => void;
  removeSavedCalculation: (id: string) => void;
  trackAppOpen: () => void;
  setWeeklySavingsGoal: (value: number) => void;
}

const defaultFilters: FilterState = {
  fuelType: null,
  openNowOnly: false,
  maxPrice: null,
  minPrice: null,
  countryFilter: null,
};

const defaultSavings: SavingsState = {
  tankSize: '50',
  usualPrice: '',
  economy: '12',
};

const defaultRetention: RetentionState = {
  lastOpenDate: null,
  lastOpenAt: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  weeklySavingsGoal: 25,
};

function getLocalDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userCoords: null,
      countryCode: null,
      locationName: null,
      stations: [],
      selectedStationId: null,
      filters: defaultFilters,
      sortMode: 'distance',
      searchRadius: DEFAULT_SEARCH_RADIUS,
      mapRegion: null,
      isMapMoved: false,
      darkMode: 'system',
      manualCurrency: null,
      savings: defaultSavings,
      savedCalculations: [],
      retention: defaultRetention,

      setUserLocation: (latitude, longitude, country) => {
        const countryCode = country ?? get().countryCode;
        set({ userCoords: { latitude, longitude }, countryCode: countryCode ?? null });
      },
      setLocationName: (locationName) => set({ locationName }),
      setStations: (stations) => set({ stations }),
      setSelectedStation: (selectedStationId) => set({ selectedStationId }),
      setFilters: (patch) =>
        set({ filters: { ...get().filters, ...patch } }),
      setSortMode: (sortMode) => set({ sortMode }),
      setSearchRadius: (searchRadius) => set({ searchRadius }),
      setMapRegion: (mapRegion) => set({ mapRegion }),
      setIsMapMoved: (isMapMoved) => set({ isMapMoved }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setManualCurrency: (manualCurrency) => set({ manualCurrency }),
      setSavings: (patch) =>
        set({ savings: { ...get().savings, ...patch } }),
      addSavedCalculation: (calc) =>
        set((state) => ({
          savedCalculations: [
            { ...calc, id: Date.now().toString(), date: Date.now() },
            ...state.savedCalculations,
          ],
        })),
      removeSavedCalculation: (id) =>
        set((state) => ({
          savedCalculations: state.savedCalculations.filter((c) => c.id !== id),
        })),
      trackAppOpen: () =>
        set((state) => {
          const now = Date.now();
          // Debounce repeated calls while navigating between tabs.
          if (state.retention.lastOpenAt && now - state.retention.lastOpenAt < 10 * 60 * 1000) {
            return state;
          }

          const today = getLocalDateKey(now);
          const last = state.retention.lastOpenDate;

          let currentStreak = state.retention.currentStreak;
          if (!last) {
            currentStreak = 1;
          } else if (last !== today) {
            const prev = new Date(last);
            const diffDays = Math.floor((new Date(today).getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
            currentStreak = diffDays === 1 ? state.retention.currentStreak + 1 : 1;
          }

          return {
            retention: {
              ...state.retention,
              lastOpenDate: today,
              lastOpenAt: now,
              currentStreak,
              longestStreak: Math.max(state.retention.longestStreak, currentStreak),
              totalSessions: state.retention.totalSessions + 1,
            },
          };
        }),
      setWeeklySavingsGoal: (value) =>
        set((state) => ({
          retention: {
            ...state.retention,
            weeklySavingsGoal: Math.max(1, Number.isFinite(value) ? value : state.retention.weeklySavingsGoal),
          },
        })),
    }),
    {
      name: 'cheap-fuel-storage',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<AppState> | undefined) ?? {};
        return {
          ...currentState,
          ...persisted,
          filters: { ...defaultFilters, ...(persisted.filters ?? {}) },
          savings: { ...defaultSavings, ...(persisted.savings ?? {}) },
          retention: { ...defaultRetention, ...(persisted.retention ?? {}) },
        };
      },
      partialize: (state) => ({
        filters: state.filters,
        sortMode: state.sortMode,
        searchRadius: state.searchRadius,
        darkMode: state.darkMode,
        manualCurrency: state.manualCurrency,
        savings: state.savings,
        savedCalculations: state.savedCalculations,
        retention: state.retention,
      }),
    }
  )
);