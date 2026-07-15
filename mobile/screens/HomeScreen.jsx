import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
  Share, Image, ActivityIndicator, Platform, RefreshControl,
  Animated, Alert, Dimensions, ImageBackground, Modal,
  TextInput,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SuccessToast from '../components/SuccessToast';
import { useProverbsData } from "../hooks/useProverbsData";
import { useFavorites } from "../context/FavoritesContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../theme/spacing";
import { moderateScale } from "../theme/metrics";

const PRIMARY = '#285D6C';
const PRIMARY_DARK = '#285D6C';

const BG_IMAGE = require("../assets/kiswahili_chetu.jpg");
const CARD_IMAGE = require("../assets/mpanze-yako-yatimizwe.webp");

export default function HomeScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const { proverbs, loading: proverbsLoading, error: proverbsError, reload: reloadProverbs } = useProverbsData();
  const { isFavorite: isFavoriteInStore, toggleFavorite } = useFavorites();

  // ── Rotation state (driven by /api/dibaji/current) ──────────────────────────
  const [activeDibaji, setActiveDibaji] = useState(null);       // today's dibaji
  const [dailyProverbsHistory, setDailyProverbsHistory] = useState([]); // this-week history
  const [rotationLoading, setRotationLoading] = useState(true);
  const [rotationError, setRotationError] = useState(null);
  const [isNewWeek, setIsNewWeek] = useState(false);

  // currentIndex still drives the "browse all proverbs" card — kept for the
  // random-browse action (handleNewProverb) that is separate from the daily dibaji.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingNew, setIsLoadingNew] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [dibajiComments, setDibajiComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [likedDibajis, setLikedDibajis] = useState({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { expoPushToken, notification, tappedResponse } = usePushNotifications();

  // Watch for real-time incoming notifications while app is in foreground
  useEffect(() => {
    if (notification) {
      fetchUnreadNotificationsCount();
    }
  }, [notification]);

  useEffect(() => {
    if (tappedResponse) {
      navigation.navigate('Notifications');
    }
  }, [tappedResponse, navigation]);

  const cardScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      fetchUnreadNotificationsCount();
    }, [])
  );

  const fetchUnreadNotificationsCount = async () => {
    try {
      const stored = await AsyncStorage.getItem('@dismissed_notifications');
      const dismissed = stored ? JSON.parse(stored) : [];
      
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/public-notifications`);
      if (res.ok) {
        const data = await res.json();
        const unread = data.filter(n => !dismissed.includes(n.id));
        setUnreadNotifications(unread.length);
      }
    } catch (e) {
      console.log('Error fetching unread notifications:', e);
    }
  };
  const translateY = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const expandOpacity = useRef(new Animated.Value(0)).current;
  const lastIndexRef = useRef(-1);
  const scrollViewRef = useRef(null);

  const animateCardPress = useCallback(({ toValue = 0.98, duration = 100 } = {}) => {
    Animated.sequence([
      Animated.timing(cardScale, { toValue, duration, useNativeDriver: false }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: false, friction: 6, tension: 80 }),
    ]).start();
  }, [cardScale]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    translateY.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: false }),
    ]).start();
  };

  useEffect(() => {
    animateIn();
    if (isExpanded) {
      setIsExpanded(false);
      expandAnim.setValue(0);
      expandOpacity.setValue(0);
    }
  }, [currentIndex]);

  /**
   * Fetch today's active Dibaji and weekly history from the backend.
   * The backend (Africa/Nairobi timezone) is the single source of truth:
   *  - Identical result on admin and mobile
   *  - Stable across refreshes within the same day
   *  - Resets automatically at Sunday 00:00 Nairobi time
   */
  const loadActiveDibaji = useCallback(async (force = false) => {
    const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    try {
      setRotationLoading(true);
      setRotationError(null);

      // Serve from AsyncStorage cache if the date hasn't changed — skips network on every render
      if (!force) {
        const cachedDate = await AsyncStorage.getItem('dibaji_rotation_date');
        const today = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"
        if (cachedDate === today) {
          const cachedRaw = await AsyncStorage.getItem('dibaji_rotation_data');
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            setActiveDibaji(cached.activeDibaji);
            setDailyProverbsHistory(cached.history || []);
            setIsNewWeek(cached.isNewWeek || false);
            if (cached.activeDibaji && proverbs?.length > 0) {
              const idx = proverbs.findIndex(p => p.id === cached.activeDibaji.id);
              if (idx >= 0) setCurrentIndex(idx);
            }
            return;
          }
        }
      }

      const res = await fetch(`${API_BASE}/api/dibaji/current`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (!data.activeDibaji) {
        console.log('No active dibaji returned from server.');
      }
      const today = new Date().toLocaleDateString('en-CA');
      const isNewWeekFlag = data.history?.length === 0 && data.activeDibaji?.day === 'Sunday';

      setActiveDibaji(data.activeDibaji);
      setDailyProverbsHistory(data.history || []);
      setIsNewWeek(isNewWeekFlag);

      // Sync currentIndex so comments / like / share act on the active dibaji
      if (proverbs?.length > 0 && data.activeDibaji) {
        const idx = proverbs.findIndex(p => p.id === data.activeDibaji.id);
        if (idx >= 0) setCurrentIndex(idx);
      }

      // Persist locally so repeat renders within the same day skip the network call
      await AsyncStorage.setItem('dibaji_rotation_date', today);
      await AsyncStorage.setItem('dibaji_rotation_data', JSON.stringify({
        activeDibaji: data.activeDibaji,
        history: data.history || [],
        isNewWeek: isNewWeekFlag,
      }));

    } catch (e) {
      console.log('Error loading active dibaji from backend:', e);
      setRotationError('Imeshindikana kupakua dibaji ya leo. Jaribu tena.');
    } finally {
      setRotationLoading(false);
    }
  }, [proverbs]);

  useEffect(() => {
    loadUserData();
  }, []);

  // Load active dibaji once proverbs fetch is complete (whether successful or not)
  useEffect(() => {
    if (!proverbsLoading) {
      loadActiveDibaji();
    }
  }, [proverbsLoading, loadActiveDibaji]);

  useEffect(() => {
    if (proverbsLoading || !Array.isArray(proverbs) || !proverbs.length) return;
    setCurrentIndex(prev => (prev >= 0 && prev < proverbs.length) ? prev : 0);
  }, [proverbs, proverbsLoading]);

  const loadUserData = async () => {
    try { const n = await AsyncStorage.getItem('userName'); if (n) setUserName(n); } catch (_) { }
  };

  // The currently displayed proverb
  const proverb = useMemo(
    () => proverbs[currentIndex] || activeDibaji || { text: '', meaning: '', source: 'Dibaji za leo' },
    [activeDibaji, currentIndex, proverbs]
  );

  const activeDibajiText = proverb?.text || '';
  const activeDibajiMeaning = proverb?.meaning || '';
  const activeDibajiSource = proverb?.source || 'Dibaji za leo';

  const isFavorite = isFavoriteInStore(proverb);

  const handleToggleFavorite = useCallback(async () => {
    try {
      if (!proverb) return;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      animateCardPress({ toValue: 0.98, duration: 100 });
      await toggleFavorite(proverb);
    } catch (_) { }
  }, [proverb, animateCardPress, toggleFavorite]);

  const handleLikeDibaji = async () => {
    if (!proverb || !proverb.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Like = only send the server count increment, NOT a bookmark
    if (!likedDibajis[proverb.id]) {
      setLikedDibajis(prev => ({ ...prev, [proverb.id]: true }));
      try {
        await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/api/dibaji/${proverb.id}/like`, { method: 'POST' });
      } catch (e) { console.log(e); }
    }
  };

  const handleOpenComments = async () => {
    if (!proverb || !proverb.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentsModalVisible(true);
    setLoadingComments(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/api/dibaji/${proverb.id}/comments`);
      if (res.ok) setDibajiComments(await res.json());
    } catch (e) { console.log(e); }
    finally { setLoadingComments(false); }
  };

  const handleSubmitComment = async () => {
    if (!newCommentText.trim() || !proverb?.id) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/api/dibaji/${proverb.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: newCommentName || 'Msomaji', comment: newCommentText })
      });
      if (res.ok) {
        const newC = await res.json();
        setDibajiComments([newC, ...dibajiComments]);
        setNewCommentText('');
        setToastMessage('Maoni yatumwa kikamilifu!');
        setToastVisible(true);
      }
    } catch (e) { console.log(e); }
    finally { setSubmittingComment(false); }
  };

  const getReflection = useCallback((p) => {
    if (!p) return '';
    return 'Dibaji hii inatoa maarifa ya kina kuhusu kuishi maisha yenye maana. Fikiria jinsi inavyotumika katika safari yako.\n\nMfano: Vitendo vidogo vya kila siku vinaleta mabadiliko makubwa kadiri muda unavyokwenda.';
  }, []);

  const handleToggleExpand = useCallback(() => {
    if (!proverb) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) {
      Animated.parallel([
        Animated.timing(expandAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(expandOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(expandAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.timing(expandOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [isExpanded, proverb, expandAnim, expandOpacity]);

  const getNextIndex = useCallback((cur, len) => {
    if (len <= 1) return 0;
    let next = cur, g = 0;
    while (next === cur && g < 10) { next = Math.floor(Math.random() * len); g++; }
    return next;
  }, []);

  const fadeOutAndSet = useCallback((nextIdx) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
      setCurrentIndex(nextIdx);
      lastIndexRef.current = nextIdx;
      if (scrollViewRef.current) scrollViewRef.current.scrollTo({ y: 0, animated: false });
      setTimeout(() => { animateIn(); setIsLoadingNew(false); }, 100);
    });
  }, [fadeAnim]);

  const handleNewProverb = useCallback(() => {
    if (isLoadingNew || proverbsLoading || !proverbs?.length) return;
    setIsLoadingNew(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateCardPress({ toValue: 0.97, duration: 120 });
    fadeOutAndSet(getNextIndex(currentIndex, proverbs.length));
  }, [currentIndex, isLoadingNew, proverbsLoading, proverbs, fadeOutAndSet]);

  const handleShare = async () => {
    try {
      if (!proverb) return;
      await Share.share({ message: `${proverb.text}\n\nMaana: ${proverb.meaning}\n— ${proverb.source}` });
    } catch (_) { }
  };

  const onSpeak = async () => {
    const soundSetting = await AsyncStorage.getItem('soundEnabled');
    const isSoundEnabled = soundSetting === null ? true : JSON.parse(soundSetting);
    
    if (!isSoundEnabled) {
      Alert.alert("Sauti imezimwa", "Tafadhali washa sauti kwenye Mipangilio (Profile) ili kusikiliza.");
      return;
    }

    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    if (!proverb) return;
    Speech.speak(proverb.text, {
      language: 'sw',
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    setIsSpeaking(true);
  };

  const onRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    // Force re-fetch from backend — same dibaji will come back for the same day,
    // confirming stability. On a new day the fresh rotation is fetched.
    loadActiveDibaji(true).finally(() => setRefreshing(false));
  }, [refreshing, loadActiveDibaji]);




  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} translucent={false} />

      {/* ── NEW WEEK BANNER ── */}
      {isNewWeek && (
        <View style={[styles.newWeekBanner, { top: insets.top + Spacing.sm }]}>
          <Ionicons name="star" size={moderateScale(18)} color="#FFFFFF" />
          <Text style={styles.newWeekText}>Wiki Mpya Imeanza! Baraka Mpya!</Text>
          <TouchableOpacity onPress={() => setIsNewWeek(false)}>
            <Ionicons name="close" size={moderateScale(18)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════════════
          TOP NAV BAR
          ══════════════════════ */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="menu" size={moderateScale(26)} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Dibaji Za Leo</Text>

        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={moderateScale(26)} color="#FFFFFF" />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ══════════════════════
          SCROLL BODY
          ══════════════════════ */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
        }
      >
        {/* ── HERO IMAGE ── */}
        <View style={{ width: '100%', height: height * 0.38 }}>
          <ImageBackground source={BG_IMAGE} style={styles.heroBg} resizeMode="cover">
            <LinearGradient
              colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.72)']}
              style={StyleSheet.absoluteFill}
            />
            {/* Bookmark top-right */}
            <TouchableOpacity
              style={styles.heroBookmark}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleToggleFavorite(); }}
              disabled={!proverb}
            >
              <Ionicons
                name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isFavorite ? '#F59E0B' : '#FFFFFF'}
              />
            </TouchableOpacity>
            {/* Title overlay at bottom */}
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>
                Dunia Ni Shule
              </Text>
              <Text style={styles.heroSubtitle}>
                Tunajifunza Kila Siku, Karibia tujifunze
              </Text>
            </View>
          </ImageBackground>
        </View>


        {/* ── MAIN PROVERB CARD ── */}
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }, { translateY }], opacity: fadeAnim, alignSelf: 'center', width: Math.min(width - 32, 600) }]}>

          {/* Card body */}
          <View style={styles.cardBody}>
            {(proverbsLoading || rotationLoading) ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={styles.loadTxt}>Inapakia…</Text>
              </View>
            ) : (rotationError || proverbsError) ? (
              <View style={styles.center}>
                <Ionicons name="warning-outline" size={36} color="#EF4444" />
                <Text style={styles.errTxt}>{rotationError || proverbsError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => loadActiveDibaji(true)}>
                  <Ionicons name="refresh" size={15} color="#FFFFFF" />
                  <Text style={styles.retryTxt}>Jaribu Tena</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.proverbTxt}>"{activeDibajiText}"</Text>

                {/* Read More Pill */}
                <TouchableOpacity style={styles.readMorePill} onPress={handleToggleExpand} activeOpacity={0.7}>
                  <Text style={styles.readMoreTxt}>Soma kwa Zaidi</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={PRIMARY} />
                </TouchableOpacity>

                {/* Expanded meaning */}
                <Animated.View style={[styles.expandBlock, {
                  maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 280] }),
                  opacity: expandOpacity,
                }]}>
                  <Text style={styles.meaningTxt}>{activeDibajiMeaning}</Text>
                </Animated.View>

                {/* Source */}
                <View style={styles.srcRow}>
                  <View style={styles.srcLine} />
                  <Ionicons name="bookmark-outline" size={12} color="#94A3B8" />
                  <Text style={styles.srcTxt}>{activeDibajiSource}</Text>
                </View>
              </Animated.View>
            )}
          </View>

        </Animated.View>

        {/* ── EXTERNAL ACTION BUTTONS ── */}
        <Animated.View style={[styles.externalActionsRow, { opacity: fadeAnim, alignSelf: 'center', width: Math.min(width - 32, 600) }]}>
          {/* Hifadhi — saves to local favourites (bookmark) */}
          <TouchableOpacity
            style={styles.externalActionCard}
            onPress={handleToggleFavorite}
            disabled={!proverb}
          >
            <Ionicons
              name={isFavorite ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isFavorite ? '#F59E0B' : PRIMARY}
            />
            <Text style={[styles.externalActionTxt, isFavorite && { color: '#F59E0B' }]}>
              {isFavorite ? 'Imehifadhiwa' : 'Hifadhi'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.externalActionCard}
            onPress={handleOpenComments}
            disabled={!proverb}
          >
            <Ionicons name="chatbubble-outline" size={22} color={PRIMARY} />
            <Text style={styles.externalActionTxt}>Maoni</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.externalActionCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSpeak(); }}
            disabled={!proverb}
          >
            <Ionicons name={isSpeaking ? 'volume-high' : 'volume-medium-outline'} size={22} color={PRIMARY} />
            <Text style={styles.externalActionTxt}>Sikiliza</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.externalActionCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleShare(); }}
            disabled={!proverb}
          >
            <Ionicons name="share-social-outline" size={22} color="#D97706" />
            <Text style={styles.externalActionTxt}>Shiriki</Text>
          </TouchableOpacity>
        </Animated.View>

        {dailyProverbsHistory && dailyProverbsHistory.length > 0 && (
          <Animated.View style={[styles.historyContainer, { opacity: fadeAnim, alignSelf: 'center', width: Math.min(width - 32, 600) }]}>
            <Text style={styles.historyTitle}>Nasaha Zilizopita (Wiki Hii)</Text>
            {dailyProverbsHistory.map((item, idx) => (
              <View key={idx} style={styles.historyCard}>
                <View style={styles.historyCardContent}>
                  {item?.day && (
                    <Text style={styles.historyDayLabel}>{item.day}</Text>
                  )}
                  <Text style={styles.historyItemText}>"{item?.text || ''}"</Text>
                  {item?.meaning ? (
                    <Text style={styles.historyItemMeaning} numberOfLines={2}>{item.meaning}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Credits / Wachangiaji */}
        <Animated.View style={[styles.card, { marginTop: 24, marginBottom: 12, opacity: fadeAnim, alignSelf: 'center', width: Math.min(width - 32, 600) }]}>
          <View style={styles.creditsHeader}>
            <Ionicons name="library" size={26} color="#285D6C" />
            <Text style={{ fontFamily: 'Nunito_700Bold', color: '#285D6C', fontSize: 18, marginBottom: 0, marginLeft: 8 }}>Waliohusika</Text>
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 12 }}>

            <Text style={[styles.aboutText, { marginBottom: 0 }]}>
              Hii ni mikusanyiko maalum ya fikra na hekima kutoka kwa magwiji wafuatao:
            </Text>
          </View>

          <View style={styles.creditsSection}>
            <Text style={styles.creditsSectionTitle}>Wachangiaji Wakuu</Text>
            <View style={styles.creditsList}>
              <View style={styles.creditItem}><Text style={styles.creditText}>• Walah Bin Walah</Text></View>
              <View style={styles.creditItem}><Text style={styles.creditText}>• Khan Mbarouk</Text></View>
              <View style={styles.creditItem}><Text style={styles.creditText}>• Steve Champion</Text></View>
              <View style={styles.creditItem}><Text style={styles.creditText}>• Amani Demile</Text></View>
            </View>
          </View>

          <View style={[styles.creditsSection, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 16 }]}>
            <Text style={styles.creditsSectionTitle}>Wachangiaji Wengine</Text>
            <View style={styles.creditsGrid}>
              <View style={styles.creditGridItem}><Text style={styles.creditText}>• Chisano Jrn</Text></View>
              <View style={styles.creditGridItem}><Text style={styles.creditText}>• Mina Ali</Text></View>
              <View style={styles.creditGridItem}><Text style={styles.creditText}>• Cleva Mjomba</Text></View>
              <View style={styles.creditGridItem}><Text style={styles.creditText}>• Madebe Lidai</Text></View>
              <View style={styles.creditGridItem}><Text style={styles.creditText}>• Kamdomo Kamdomo</Text></View>
            </View>
            <Text style={styles.creditsFooterText}>Na wengine wengi...</Text>
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* COMMENTS MODAL */}
      <Modal visible={commentsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentsModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#1A2B35' }}>Maoni</Text>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexGrow: 0, maxHeight: 300, marginBottom: 16 }}>
              {loadingComments ? (
                <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
              ) : dibajiComments.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>Kuwa wa kwanza kutoa maoni!</Text>
              ) : (
                dibajiComments.map(c => (
                  <View key={c.id} style={{ marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontFamily: 'Nunito_700Bold', color: '#1A2B35', fontSize: 14 }}>{c.user_name}</Text>
                      <Text style={{ fontFamily: 'Nunito_400Regular', color: '#94A3B8', fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <Text style={{ fontFamily: 'Nunito_400Regular', color: '#334155', fontSize: 14 }}>{c.comment}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 }}>
              <TextInput
                style={{ borderBottomWidth: 1, borderBottomColor: '#EEF2F5', paddingVertical: 8, marginBottom: 8, fontFamily: 'Nunito_600SemiBold', color: '#1A2B35' }}
                placeholder="Jina lako (si lazima)"
                placeholderTextColor="#94A3B8"
                value={newCommentName}
                onChangeText={setNewCommentName}
              />
              <TextInput
                style={{ minHeight: 60, textAlignVertical: 'top', fontFamily: 'Nunito_400Regular', color: '#334155', marginBottom: 8 }}
                placeholder="Andika maoni yako hapa..."
                placeholderTextColor="#94A3B8"
                multiline
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity
                style={{ backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: !newCommentText.trim() ? 0.5 : 1 }}
                onPress={handleSubmitComment}
                disabled={submittingComment || !newCommentText.trim()}
              >
                {submittingComment ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontFamily: 'Nunito_700Bold' }}>Tuma Maoni</Text>}
              </TouchableOpacity>
            </View>
            <SuccessToast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB removed per user request */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F6' },

  /* NEW WEEK */
  newWeekBanner: {
    position: 'absolute', top: Platform.OS === 'ios' ? 58 : 48,
    left: 16, right: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 14, zIndex: 100, elevation: 10, gap: 10,
  },
  newWeekText: { flex: 1, color: '#FFFFFF', fontSize: 13, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },

  /* TOP BAR */
  topBar: {
    backgroundColor: PRIMARY_DARK,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 34,
    paddingBottom: 12, paddingHorizontal: 14,
  },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, color: '#FFFFFF', fontSize: 22, fontFamily: 'Nunito_800ExtraBold', marginLeft: 6, letterSpacing: 0.3 },
  topBarEnd: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  /* SCROLL */
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },

  /* HERO */
  heroBg: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  heroBookmark: {
    position: 'absolute', top: 14, right: 14,
    width: moderateScale(38), height: moderateScale(38), borderRadius: moderateScale(19),
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTextBlock: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Nunito_800ExtraBold', lineHeight: 34, marginBottom: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 14, fontFamily: 'Nunito_400Regular' },

  /* FILTER BAR */
  filterBar: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF2F5',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: `${PRIMARY}55`, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 7, gap: 5, backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipTxt: { color: PRIMARY, fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  chipTxtActive: { color: '#FFFFFF' },
  reshuffleChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 24, gap: 5,
  },
  reshuffleTxt: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Nunito_700Bold' },

  /* META ROW */
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9, gap: 5,
    backgroundColor: '#FFFFFF', marginBottom: 2,
  },
  metaTxt: { color: '#94A3B8', fontSize: 12, fontFamily: 'Nunito_400Regular' },
  speakPill: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: `${PRIMARY}55`, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, gap: 5,
  },
  speakPillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  speakTxt: { color: PRIMARY, fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  /* CARD */
  card: {
    marginTop: Spacing.md,
    backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
    elevation: 8,
    boxShadow: '0px 6px 18px rgba(0,0,0,0.12)',
  },

  /* CARD BODY */
  cardBody: { paddingHorizontal: 24, paddingVertical: 32 },
  center: { paddingVertical: 28, alignItems: 'center', gap: 10 },
  loadTxt: { color: '#94A3B8', fontSize: 14, fontFamily: 'Nunito_400Regular' },
  errTxt: { color: '#EF4444', fontSize: 14, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, gap: 6, marginTop: 4,
  },
  retryTxt: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  proverbTxt: {
    fontSize: 26, fontFamily: 'Georgia', fontWeight: 'bold', color: PRIMARY_DARK,
    lineHeight: 38, textAlign: 'center', fontStyle: 'italic', marginBottom: 28,
  },
  readMorePill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F5F3FF', paddingVertical: 14, borderRadius: 12, marginBottom: 12,
  },
  readMoreTxt: { color: PRIMARY, fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  expandBlock: { overflow: 'hidden', marginTop: 4, marginBottom: 16 },
  meaningTxt: { color: '#334155', fontSize: 15, fontFamily: 'Nunito_400Regular', lineHeight: 24, marginBottom: 10 },
  reflCard: {
    backgroundColor: '#F0F7F9', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: PRIMARY,
  },
  reflHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  reflTitle: { color: '#1A2B35', fontSize: 14, fontFamily: 'Nunito_700Bold' },
  reflTxt: { color: '#4B5563', fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 22 },
  srcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 24, gap: 6 },
  srcLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9', marginRight: 12 },
  srcTxt: { color: '#94A3B8', fontSize: 13, fontFamily: 'Georgia', fontStyle: 'italic' },

  /* EXTERNAL ACTIONS ROW */
  externalActionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, gap: 12,
  },
  externalActionCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: Spacing.md,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    elevation: 4, boxShadow: '0px 4px 8px rgba(0,0,0,0.08)',
  },
  externalActionTxt: { color: PRIMARY_DARK, fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  /* HISTORY SECTION */
  historyContainer: {
    marginTop: 28,
  },
  historyTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    lineHeight: 26,
    color: PRIMARY_DARK,
    marginBottom: 12,
    marginLeft: 4,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    boxShadow: '0px 3px 6px rgba(0,0,0,0.05)',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  historyCardContent: {
    gap: 6,
  },
  historyDayLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  historyItemText: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontStyle: 'italic',
    color: '#1E293B',
    lineHeight: 22,
  },
  historyItemMeaning: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  /* FAB */
  fabWrap: { position: 'absolute', right: 20, bottom: 24, zIndex: 20 },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    elevation: 10, boxShadow: '0px 5px 10px PRIMARY_DARK',
  },

  /* CREDITS STYLES */
  aboutText: {
    fontFamily: 'Nunito_400Regular',
    color: "#475569",
    lineHeight: 18,
    marginBottom: 6,
    fontStyle: 'italic',
    fontSize: 13,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  creditsSection: {
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  creditsSectionTitle: {
    fontFamily: 'Nunito_700Bold',
    color: '#285D6C',
    marginBottom: 4,
    fontSize: 14,
  },
  creditsList: {
    gap: 2,
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 1,
  },
  creditsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  creditGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '48%',
    paddingVertical: 1,
  },
  creditText: {
    fontFamily: 'Nunito_700Bold',
    color: '#90959bff',
    fontSize: 13,
  },
  creditsFooterText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    lineHeight: 23,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 6,
  },
});
