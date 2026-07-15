import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('nasaha_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Failed to load user from storage", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (userInfo) => {
    try {
      await AsyncStorage.setItem('nasaha_user', JSON.stringify(userInfo));
      setUser(userInfo);
    } catch (error) {
      console.error("Failed to save user session", error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('nasaha_user');
      setUser(null);
    } catch (error) {
      console.error("Failed to clear user session", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
