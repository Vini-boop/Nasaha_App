import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  Modal,
  Platform,
  Switch,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../theme/spacing";
import { moderateScale } from "../theme/metrics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import * as Notifications from 'expo-notifications';

const PRIMARY = '#285D6C';
const PRIMARY_LIGHT = '#3C7C8D';
const ACCENT = '#B4EC51';

// ── Reusable row components ────────────────────────────────────────────────────

function MenuRow({ icon, iconBg, label, subtitle, onPress, rightEl, last = false }) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, last && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg || '#EFF6FF' }]}>
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <View style={styles.menuRowBody}>
        <Text style={styles.menuRowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightEl !== undefined ? rightEl : (
        onPress ? <Ionicons name="chevron-forward" size={18} color="#CBD5E1" /> : null
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { logout, user } = useAuth();
  const { favorites } = useFavorites();

  const [avatarUri, setAvatarUri] = useState(null);
  const [userName, setUserName] = useState("Mgeni");
  const [previewUri, setPreviewUri] = useState(null);

  // Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Derived stats
  const dibajiCount = favorites.filter(f => typeof f.text === 'string').length;
  const methaliCount = favorites.filter(f => typeof f.methali === 'string').length;

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      const savedAvatar = await AsyncStorage.getItem("userAvatarUri");
      const savedName = await AsyncStorage.getItem("userName");
      const savedNotifications = await AsyncStorage.getItem("notificationsEnabled");
      const savedSound = await AsyncStorage.getItem("soundEnabled");

      if (user?.photo) setAvatarUri(user.photo);
      else if (savedAvatar) setAvatarUri(savedAvatar);

      if (user?.name) setUserName(user.name);
      else if (savedName) setUserName(savedName);

      if (savedNotifications !== null) setNotificationsEnabled(JSON.parse(savedNotifications));
      if (savedSound !== null) setSoundEnabled(JSON.parse(savedSound));
    } catch (e) {
      console.log("Error loading profile data:", e);
    }
  };

  const updateSetting = useCallback(async (key, value) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch (_) { }
  }, []);

  const handleToggleNotifications = async (value) => {
    if (value) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert("Ruhusa imekataliwa", "Tafadhali ruhusu arifa kwenye mipangilio ya simu yako ili kupokea nasaha.");
        setNotificationsEnabled(false);
        updateSetting("notificationsEnabled", false);
        return;
      }

      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Nasaha ya Leo inakusubiri! 📚",
            body: "Fungua app sasa ili kupata dibaji na methali ya leo.",
            sound: true,
          },
          trigger: {
            hour: 8,
            minute: 0,
            repeats: true,
          },
        });
      } catch (e) {
        console.log("Error scheduling notification:", e);
      }

      setNotificationsEnabled(true);
      updateSetting("notificationsEnabled", true);
    } else {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (e) {
        console.log("Error canceling notifications:", e);
      }
      setNotificationsEnabled(false);
      updateSetting("notificationsEnabled", false);
    }
  };

  // ── Avatar helpers ────────────────────────────────────────────────────────
  const MAX_MB = 5;

  const checkFileSize = async (uri) => {
    if (Platform.OS === 'web') return true;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists && info.size / (1024 * 1024) <= MAX_MB;
    } catch (_) { return false; }
  };

  const confirmAndSave = async (uri) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );
      setAvatarUri(result.uri);
      await AsyncStorage.setItem("userAvatarUri", result.uri).catch(() => { });
    } catch (_) {
      setAvatarUri(uri);
    }
    setPreviewUri(null);
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Ruhusa inahitajika", "Ruhusu upatikanaji wa picha ili kubadilisha picha ya wasifu.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.9,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        if (await checkFileSize(uri)) setPreviewUri(uri);
        else Alert.alert("Faili ni kubwa sana", `Picha lazima iwe chini ya ${MAX_MB}MB.`);
      }
    } catch (_) { Alert.alert("Hitilafu", "Imeshindikana kuchagua picha."); }
  };

  const captureAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Ruhusa inahitajika", "Ruhusu kamera ili kupiga picha ya wasifu.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [1, 1], quality: 0.9,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        if (await checkFileSize(uri)) setPreviewUri(uri);
        else Alert.alert("Faili ni kubwa sana", `Picha lazima iwe chini ya ${MAX_MB}MB.`);
      }
    } catch (_) { Alert.alert("Hitilafu", "Imeshindikana kupiga picha."); }
  };

  const removeAvatar = async () => {
    setAvatarUri(null);
    await AsyncStorage.removeItem("userAvatarUri").catch(() => { });
  };

  const showAvatarOptions = () => {
    Alert.alert("Badilisha Picha", "Chagua chanzo cha picha", [
      { text: "Picha za Simu", onPress: pickAvatar },
      { text: "Piga Picha", onPress: captureAvatar },
      avatarUri ? { text: "Ondoa Picha", style: "destructive", onPress: removeAvatar } : null,
      { text: "Ghairi", style: "cancel" },
    ].filter(Boolean));
  };

  const handleLogout = () => {
    Alert.alert(
      "Toka",
      "Je, unataka kutoka kwenye akaunti yako?",
      [
        { text: "Hapana", style: "cancel" },
        { text: "Ndiyo, Toka", style: "destructive", onPress: logout },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <LinearGradient 
          colors={[PRIMARY, PRIMARY_LIGHT, '#4A9BAD']} 
          style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}
        >

          {/* Back arrow */}
          <TouchableOpacity 
            style={[styles.backBtn, { top: Math.max(insets.top, 20) + 16 }]} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={moderateScale(26)} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>NasahaApp</Text>
        </LinearGradient>

        {/* ══ NAVIGATION MENU ═════════════════════════════════════════════ */}
        <View style={[styles.body, { alignSelf: 'center', width: Math.min(width, 600) }]}>



          {/* Settings */}
          <SectionHeader title="MIPANGILIO" />
          <View style={styles.card}>
            <MenuRow
              icon="notifications-outline"
              iconBg="#EFF6FF"
              label="Arifa za Kila Siku"
              subtitle="Pokea nasaha ya leo kila asubuhi"
              rightEl={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: "#E2E8F0", true: ACCENT }}
                  thumbColor="#FFFFFF"
                  style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : {}}
                />
              }
            />
            <MenuRow
              icon="volume-high-outline"
              iconBg="#F0FDF4"
              label="Sauti"
              subtitle="Sauti za kusikiliza nasaha"
              last
              rightEl={
                <Switch
                  value={soundEnabled}
                  onValueChange={(v) => { setSoundEnabled(v); updateSetting("soundEnabled", v); }}
                  trackColor={{ false: "#E2E8F0", true: ACCENT }}
                  thumbColor="#FFFFFF"
                  style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : {}}
                />
              }
            />
          </View>

          {/* App info */}
          <SectionHeader title="KUHUSU APP" />
          <View style={styles.card}>
            <View style={styles.aboutBlock}>
              <Text style={styles.aboutText}>
                Nasaha ni App ambayo inakuletea methali, misemo, na hekima za Kiswahili kiganjani mwako.
                Jifunze, tafakari, na kufurahia urithi wa lugha yetu.
              </Text>
            </View>
            <MenuRow
              icon="information-circle-outline"
              iconBg="#EFF6FF"
              label="Toleo (Version)"
              subtitle="2.2.0"
              rightEl={<View />}
            />
            <MenuRow
              icon="star-outline"
              iconBg="#FFFBEB"
              label="Kadiria App"
              subtitle="bado kuchapishwa kwa Google Play Store"
              onPress={() => { }}
            />
            <MenuRow
              icon="mail-outline"
              iconBg="#F0FDF4"
              label="Wasiliana Nasi"
              subtitle="nasahanabusara@gmail.com"
              onPress={() => { }}
              last
            />
          </View>



          {/* Footer */}
          <Text style={styles.footer}>NasahaApp © {new Date().getFullYear()}</Text>

        </View>
      </ScrollView>

      {/* ══ AVATAR PREVIEW MODAL ═══════════════════════════════════════════ */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Thibitisha Picha</Text>
            {previewUri && (
              <Image source={{ uri: previewUri }} style={styles.modalImage} resizeMode="cover" />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setPreviewUri(null)}>
                <Text style={styles.modalBtnCancelText}>Ghairi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={() => confirmAndSave(previewUri)}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalBtnConfirmText}>Hifadhi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Header ──
  header: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  backBtn: {
    position: 'absolute',
    top: 52, // This needs to be relative to safe area, but absolute doesn't easily play well with dynamic insets without inline styles, so we move it to the inline style.
    left: 20,
    zIndex: 10,
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userQuote: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    fontStyle: 'italic',
    marginBottom: 22,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: ACCENT,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // ── Body ──
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  sectionHeader: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    letterSpacing: 1.1,
    color: '#94A3B8',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },

  // ── Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { boxShadow: '0px 2px 12px rgba(0,0,0,0.07)' },
      android: { elevation: 3 },
      default: { boxShadow: '0px 2px 12px rgba(0,0,0,0.07)' },
    }),
  },

  // ── Menu Row ──
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 14,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuRowBody: {
    flex: 1,
  },
  menuRowLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 20,
  },
  menuRowSubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  // ── About block ──
  aboutBlock: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  aboutText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // ── Logout ──
  logoutBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
  },
  logoutText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  // ── Footer ──
  footer: {
    textAlign: 'center',
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 8,
    marginTop: 4,
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: '#1E293B',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalImage: {
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnCancelText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#475569',
  },
  modalBtnConfirm: {
    backgroundColor: PRIMARY,
  },
  modalBtnConfirmText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
