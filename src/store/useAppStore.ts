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
    }),
    {
      name: 'cheap-fuel-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        filters: state.filters,
        sortMode: state.sortMode,
        searchRadius: state.searchRadius,
        darkMode: state.darkMode,
        manualCurrency: state.manualCurrency,
        savings: state.savings,
      }),
    }
  )
);