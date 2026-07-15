import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "favorites";
const METHALI_STORAGE_KEY = "methaliFavorites";

/**
 * Generate a stable, type-aware key for a favorites item.
 *
 * Priority order:
 *  1. If the item has a `methali` string  → methali item, key by methali text
 *  2. If the item has a `text` string     → dibaji item, key by text content
 *  3. Fallback to id if nothing else works
 *
 * NOTE: We intentionally key dibaji items by their `text` content so that
 * items saved from any context (HomeScreen, MethaliScreen, etc.) with the
 * same text are always treated as the same favorite, regardless of whether
 * the object shape carries extra fields like `date`, `day`, or `cycleStart`.
 */
const getItemKey = (item) => {
  if (!item) return null;
  // Methali items always have a `methali` string field
  if (typeof item.methali === "string" && item.methali.length > 0) {
    return `methali:${item.methali}`;
  }
  // Dibaji items have a `text` field
  if (typeof item.text === "string" && item.text.length > 0) {
    return `dibaji:${item.text}`;
  }
  // Last resort — use id if present
  if (item.id != null) return `item:${String(item.id)}`;
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

      // Migrate: old code stored separate "methaliFavorites" key — merge and remove it
      const needsMigration = !!rawMethali;
      if (needsMigration) {
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

      // Strip rotation-only fields before saving so stored objects stay lean.
      // isFavorite comparison works off text/methali content, not these fields.
      const toStore = item.methali
        ? { id: item.id, methali: item.methali, meaning: item.meaning, lesson: item.lesson, category: item.category, image: item.image, source: item.source }
        : { id: item.id, text: item.text, meaning: item.meaning, source: item.source, enText: item.enText, enMeaning: item.enMeaning };

      const exists = state.favorites.some((fav) => getItemKey(fav) === key);
      const next = exists
        ? state.favorites.filter((fav) => getItemKey(fav) !== key)
        : [toStore, ...state.favorites];

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
