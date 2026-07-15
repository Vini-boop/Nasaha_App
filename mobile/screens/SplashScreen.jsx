import React, { useCallback, useEffect, useRef, useState } from "react";
import { Typography } from '../theme/typography';
import { View, Text, StyleSheet, StatusBar, Animated, Image, ActivityIndicator, TouchableOpacity, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from '../context/AuthContext';

export default function SplashScreen({ navigation }) {
  const { user, loading: authLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [isReady, setIsReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [error, setError] = useState(null);
  const runIdRef = useRef(0);
  const timeoutRef = useRef(null);

  const performInitialTasks = useCallback(async () => {
    await AsyncStorage.getItem("appConfig");
    // Note: auth state is handled by AuthContext now
  }, []);

  const startInitialization = useCallback(() => {
    runIdRef.current += 1;
    const runId = runIdRef.current;

    setError(null);
    setIsReady(false);
    setMinTimeElapsed(false);
    setAnimationDone(false);

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const minTimer = setTimeout(() => {
      if (runIdRef.current === runId) setMinTimeElapsed(true);
    }, 2000);

    // Set a maximum timeout to prevent hanging
    timeoutRef.current = setTimeout(() => {
      if (runIdRef.current === runId && !(isReady && minTimeElapsed && animationDone && !authLoading)) {
        setError("App startup took too long. Please restart.");
      }
    }, 10000);  // 10 second max timeout

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      if (runIdRef.current === runId) setAnimationDone(true);
    });

    performInitialTasks()
      .then(() => {
        if (runIdRef.current === runId) setIsReady(true);
      })
      .catch(() => {
        if (runIdRef.current !== runId) return;
        setError("Something went wrong while starting the app.");
      });

    return () => {
      clearTimeout(minTimer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fadeAnim, performInitialTasks, scaleAnim, authLoading]);

  useEffect(() => {
    const cleanup = startInitialization();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) return;
    if (!isReady || !minTimeElapsed || !animationDone || authLoading) return;

    if (navigation && typeof navigation.replace === "function") {
      navigation.replace("MainTabs");
    }

    // Clear timeout when transitioning
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [animationDone, error, isReady, minTimeElapsed, navigation, authLoading, user]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#285D6C" barStyle="light-content" />
      <Animated.View style={[
        styles.logoContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}>
        <Image
          source={require("../assets/Splash.png")}
          style={styles.logoImage}
          resizeMode="contain"
          onLoad={() => { }}
        />
        <View style={styles.subtitleContainer}>
          <Text style={styles.textNa}>Na</Text>
          <Text style={styles.textAppName}>Busara Za Kila Siku</Text>
          <Text style={styles.textTagline}>Dunia Shule</Text>
        </View>
        {animationDone && !isReady && !error ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#C7D3D4" />
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={startInitialization}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#285D6C",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  subtitleContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  textNa: {
    ...Typography.caption,
    fontFamily: 'Nunito_400Regular',
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 4,
  },
  textAppName: {
    ...Typography.title,
    fontFamily: 'Nunito_800ExtraBold',
    color: "#FFFFFF",
    textAlign: "center",
    fontStyle: "italic",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textTagline: {
    ...Typography.bodyLarge,
    fontFamily: 'Nunito_600SemiBold',
    color: "#FFFFFF",
    textAlign: "center",
    fontStyle: "italic",
    letterSpacing: 1,
    opacity: 0.9,
  },
  loadingContainer: {
    marginTop: 32,
  },
  errorContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  errorText: {
    ...Typography.tiny,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    maxWidth: 260,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  retryText: {
    color: "#FFFFFF",
    ...Typography.tiny,
    fontFamily: 'Nunito_600SemiBold',
  },
});
