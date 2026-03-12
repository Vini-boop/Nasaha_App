import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "favorites";
const METHALI_STORAGE_KEY = "methaliFavorites";

const getItemKey = (item) => {
  if (!item) return null;
  if (typeof item.id !== "undefined" || typeof item.methali === "string") {
    if (typeof item.id !== "undefined" && item.id !== null) return `methali:${String(item.id)}`;
    if (typeof item.methali === "string" && item.methali.length > 0) return `methali:${item.methali}`;
  }
  if (typeof item.text === "string" && item.text.length > 0) return `proverb:${item.text}`;
  return null;
};

const FavoritesContext = createContext(null);

const initialState = {
  favorites: [],
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { favorites: action.payload || [], loading: false, error: null };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.payload || "Failed to load favorites." };
    case "SET_FAVORITES":
      return { ...state, favorites: action.payload || [] };
    default:
      return state;
  }
}

export function FavoritesProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const persist = useCallback(async (favorites) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, []);

  const loadFavorites = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const [raw, rawMethali] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(METHALI_STORAGE_KEY),
      ]);

      const parsed = raw ? JSON.parse(raw) : [];
      const parsedMethali = rawMethali ? JSON.parse(rawMethali) : [];

      const combined = [];
      const seen = new Set();

      const addAll = (items) => {
        if (!Array.isArray(items)) return;
        items.forEach((item) => {
          const key = getItemKey(item);
          if (!key) return;
          if (seen.has(key)) return;
          seen.add(key);
          combined.push(item);
        });
      };

      addAll(parsed);
      addAll(parsedMethali);

      if (rawMethali) {
        await AsyncStorage.removeItem(METHALI_STORAGE_KEY);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      }

      dispatch({ type: "LOAD_SUCCESS", payload: combined });
    } catch (_) {
      dispatch({ type: "LOAD_ERROR", payload: "Failed to load favorites." });
    }
  }, []);

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFavorite = useCallback(
    (item) => {
      if (!item) return false;
      const key = getItemKey(item);
      if (!key) return false;
      return state.favorites.some((fav) => getItemKey(fav) === key);
    },
    [state.favorites]
  );

  const toggleFavorite = useCallback(
    async (item) => {
      if (!item) return;

      const key = getItemKey(item);
      if (!key) return;

      const exists = state.favorites.some((fav) => getItemKey(fav) === key);
      const next = exists
        ? state.favorites.filter((fav) => getItemKey(fav) !== key)
        : [...state.favorites, item];

      dispatch({ type: "SET_FAVORITES", payload: next });
      try {
        await persist(next);
      } catch (_) {
        dispatch({ type: "SET_FAVORITES", payload: state.favorites });
        throw new Error("Failed to save favorites");
      }
    },
    [persist, state.favorites]
  );

  const value = useMemo(
    () => ({
      favorites: state.favorites,
      loading: state.loading,
      error: state.error,
      reload: loadFavorites,
      isFavorite,
      toggleFavorite,
    }),
    [isFavorite, loadFavorites, state.error, state.favorites, state.loading, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}
