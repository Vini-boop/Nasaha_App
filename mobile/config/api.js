/**
 * API configuration for the NasahaApp mobile client.
 *
 * For Expo Go on a physical device, replace 'localhost' with your
 * computer's LAN IP address (e.g. 192.168.1.x).
 *
 * For Android Emulator use: 10.0.2.2
 * For iOS Simulator use:    localhost
 * For physical device use:  your machine's local IP e.g. 192.168.1.50
 */

import { Platform } from 'react-native';

// ── Change this to your machine's LAN IP when testing on a real device ────────
const LAN_IP = '192.168.1.100';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || (
  Platform.OS === 'web'
    ? 'http://localhost:3001'         // Web browser → same host
    : Platform.OS === 'android' && !__DEV__
    ? `http://${LAN_IP}:3001`
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'          // Android emulator → host machine
    : `http://${LAN_IP}:3001`         // iOS simulator / physical device
);

export const API_URL = BASE_URL;

export const getNetworkImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  if (url.includes('localhost')) {
    return url.replace(/^http:\/\/localhost:\d+/, API_URL);
  }
  return url;
};

export const ENDPOINTS = {
  health:  `${BASE_URL}/api/health`,
  dibaji:  `${BASE_URL}/api/dibaji`,
  methali: `${BASE_URL}/api/methali`,
  makala:  `${BASE_URL}/api/makala`,
  publicNotifications: `${BASE_URL}/api/public-notifications`,
};

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Convenience wrapper with Stale-While-Revalidate offline caching */
export async function apiFetch(url, options = {}) {
  const cacheKey = `nasaha_cache_${url}`;
  const isGet = !options.method || options.method === 'GET';

  // 1. Start the network request in the background
  const fetchFromNetwork = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 s timeout

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      
      const data = await res.json();
      
      // Save fresh data to cache for next time
      if (isGet) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(console.warn);
      }
      
      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Server timeout — is the API server running?');
      throw err;
    }
  };

  const networkPromise = fetchFromNetwork();

  // 2. If it's a GET request and not bypassing cache, check the local cache first
  if (isGet && !options.bypassCache) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        // We have local data! Return it instantly for zero-latency UI.
        networkPromise.then(freshData => {
          if (options.onUpdate && JSON.stringify(freshData) !== cached) {
            options.onUpdate(freshData);
          }
        }).catch(e => console.log('Offline/Background fetch failed:', e.message));
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('AsyncStorage read error:', e);
    }
  }

  // 3. If we don't have cache, or it's a POST/PUT/DELETE, we must await the network
  return await networkPromise;
}
