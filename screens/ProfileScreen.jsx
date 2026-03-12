import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBar,
  Image,
  ImageBackground,
  Alert,
  Modal,
  Platform,
  Switch
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

export default function ProfileScreen() {
  const [avatarUri, setAvatarUri] = useState(null);
  const [userName, setUserName] = useState("Asha Mwinyi");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const savedAvatar = await AsyncStorage.getItem("userAvatarUri");
      const savedName = await AsyncStorage.getItem("userName");
      const savedNotifications = await AsyncStorage.getItem("notificationsEnabled");
      const savedDarkMode = await AsyncStorage.getItem("darkModeEnabled");
      const savedSound = await AsyncStorage.getItem("soundEnabled");
      
      if (savedAvatar) setAvatarUri(savedAvatar);
      if (savedName) setUserName(savedName);
      if (savedNotifications !== null) setNotificationsEnabled(JSON.parse(savedNotifications));
      if (savedDarkMode !== null) setDarkModeEnabled(JSON.parse(savedDarkMode));
      if (savedSound !== null) setSoundEnabled(JSON.parse(savedSound));
    } catch (error) {
      console.log("Error loading user data:", error);
    }
  };

  const [previewUri, setPreviewUri] = useState(null);
  const MAX_FILE_SIZE_MB = 5; // 5MB limit

  const checkFileSize = async (uri) => {
    if (Platform.OS === "web") {
      // On web, expo-file-system cannot get size for blob/object URLs reliably; skip check
      return true;
    }
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        const sizeMB = fileInfo.size / (1024 * 1024);
        return sizeMB <= MAX_FILE_SIZE_MB;
      }
      return false;
    } catch (_) {
      return false;
    }
  };

  const confirmAndSave = async (uri) => {
    // compress and square-fit
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setAvatarUri(manipulated.uri);
      try {
        await AsyncStorage.setItem("userAvatarUri", manipulated.uri);
      } catch (_) {}
    } catch (_) {
      setAvatarUri(uri);
    }
    setPreviewUri(null);
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ruhusa inahitajika", "Ruhusu upatikanaji wa picha ili kubadilisha picha ya wasifu.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (uri) {
        const isValidSize = await checkFileSize(uri);
        if (isValidSize) {
          setPreviewUri(uri);
        } else {
          Alert.alert("Faili ni kubwa sana", `Picha lazima iwe chini ya ${MAX_FILE_SIZE_MB}MB. Tafadhali chagua picha nyingine.`);
        }
      }
    } catch (e) {
      // surface minimal error to user
      Alert.alert("Hitilafu", "Imeshindikana kuchagua picha kwa sasa.");
    }
  };

  const captureAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ruhusa inahitajika", "Ruhusu kamera ili kupiga picha ya wasifu.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        const isValidSize = await checkFileSize(uri);
        if (isValidSize) {
          setPreviewUri(uri);
        } else {
          Alert.alert("Faili ni kubwa sana", `Picha lazima iwe chini ya ${MAX_FILE_SIZE_MB}MB. Tafadhali chagua picha nyingine.`);
        }
      }
    } catch (_) {
      Alert.alert("Hitilafu", "Imeshindikana kupiga picha kwa sasa.");
    }
  };

  const removeAvatar = async () => {
    try {
      setAvatarUri(null);
      await AsyncStorage.removeItem("userAvatarUri");
    } catch (_) {
      // best-effort remove
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.log("Error updating setting:", error);
    }
  };

  const handleNotificationToggle = (value) => {
    setNotificationsEnabled(value);
    updateSetting("notificationsEnabled", value);
  };

  const handleDarkModeToggle = (value) => {
    setDarkModeEnabled(value);
    updateSetting("darkModeEnabled", value);
  };

  const handleSoundToggle = (value) => {
    setSoundEnabled(value);
    updateSetting("soundEnabled", value);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#285D6C" barStyle="light-content" />
      
      {/* Header */}
        <LinearGradient 
          colors={["#285D6C", "#3C7C8D"]} 
          style={styles.header}
        >
        <TouchableOpacity 
          style={styles.profileImageContainer} 
          onPress={pickAvatar} 
          accessibilityRole="button" 
          accessibilityLabel="Badilisha picha ya wasifu"
        >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.profileImagePhoto} />
            ) : (
            <Ionicons name="person" size={40} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        <Text style={styles.headerText}>{userName}</Text>
          <Text style={styles.headerSubtext}>"Napenda kujifunza kila siku"</Text>
        
          <View style={styles.avatarActions}>
          <TouchableOpacity onPress={pickAvatar} style={[styles.avatarActionBtn, styles.avatarActionBtnSpacer]}>
            <Ionicons name="image-outline" size={16} color="#FFFFFF" style={styles.avatarActionIcon} />
              <Text style={styles.avatarActionText}>Chagua</Text>
            </TouchableOpacity>
          <TouchableOpacity
            onPress={captureAvatar}
            style={[styles.avatarActionBtn, avatarUri ? styles.avatarActionBtnSpacer : null]}
          >
            <Ionicons name="camera-outline" size={16} color="#FFFFFF" style={styles.avatarActionIcon} />
            <Text style={styles.avatarActionText}>Piga</Text>
          </TouchableOpacity>
          {avatarUri && (
            <TouchableOpacity onPress={removeAvatar} style={styles.avatarActionBtn}>
              <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={styles.avatarActionIcon} />
              <Text style={styles.avatarActionText}>Ondoa</Text>
            </TouchableOpacity>
          )}
          </View>
        </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mipangilio</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#285D6C" />
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Arifa za Kila Siku</Text>
              <Text style={styles.settingSubtitle}>Pokea nasaha ya leo kila siku</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: "#E2E8F0", true: "#B4EC51" }}
              thumbColor={notificationsEnabled ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={24} color="#285D6C" />
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Hali ya Giza</Text>
              <Text style={styles.settingSubtitle}>Tumia rangi za giza</Text>
              </View>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: "#E2E8F0", true: "#B4EC51" }}
              thumbColor={darkModeEnabled ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high-outline" size={24} color="#285D6C" />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Sauti</Text>
                <Text style={styles.settingSubtitle}>Sauti za app</Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: "#E2E8F0", true: "#B4EC51" }}
              thumbColor={soundEnabled ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Takwimu Zangu</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Favoriti</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>7</Text>
              <Text style={styles.statLabel}>Siku za Mfululizo</Text>
          </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>45</Text>
              <Text style={styles.statLabel}>Nasaha Zilizosomwa</Text>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kuhusu App</Text>
          
          <TouchableOpacity style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={24} color="#285D6C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Toleo</Text>
              <Text style={styles.infoSubtitle}>1.0.0</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoItem}>
            <Ionicons name="star-outline" size={24} color="#285D6C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Kadiria App</Text>
              <Text style={styles.infoSubtitle}>Google Play Store</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoItem}>
            <Ionicons name="mail-outline" size={24} color="#285D6C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Wasiliana Nasi</Text>
              <Text style={styles.infoSubtitle}>nasaha@example.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Ondoka</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {previewUri && (
              <Image source={{ uri: previewUri }} style={styles.modalImage} />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setPreviewUri(null)} 
                style={[styles.modalButton, styles.modalCancel]}
              >
                <Text style={styles.modalButtonText}>Ghairi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => confirmAndSave(previewUri)} 
                style={[styles.modalButton, styles.modalConfirm]}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>Hifadhi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  profileImagePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarActions: {
    flexDirection: "row",
    marginTop: 12,
  },
  avatarActionBtnSpacer: {
    marginRight: 12,
  },
  avatarActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  avatarActionIcon: {
    marginRight: 4,
  },
  avatarActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  headerText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },
  headerSubtext: {
    color: "#FFFFFF",
    fontSize: 16,
    opacity: 0.9,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    color: "#285D6C",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingContent: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingSubtitle: {
    color: "#64748B",
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "#285D6C",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoSubtitle: {
    color: "#64748B",
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 360,
  },
  modalImage: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancel: {
    backgroundColor: "#E2E8F0",
    marginRight: 6,
  },
  modalConfirm: {
    backgroundColor: "#B4EC51",
    marginLeft: 6,
  },
  modalButtonText: {
    color: "#0B1220",
    fontWeight: "800",
  },
});
