import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, ENDPOINTS } from '../config/api';
import { Spacing } from '../theme/spacing';
import { moderateScale } from '../theme/metrics';

const PRIMARY = '#285D6C';
const PRIMARY_DARK = '#1C3F4A';

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load dismissed IDs
      const stored = await AsyncStorage.getItem('@dismissed_notifications');
      const dismissed = stored ? JSON.parse(stored) : [];
      setDismissedIds(dismissed);

      // Fetch from API
      const data = await apiFetch(ENDPOINTS.publicNotifications);
      // Filter out dismissed
      const visible = data.filter(n => !dismissed.includes(n.id));
      setNotifications(visible);
    } catch (e) {
      console.log('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async (id) => {
    const updatedDismissed = [...dismissedIds, id];
    setDismissedIds(updatedDismissed);
    setNotifications(prev => prev.filter(n => n.id !== id));
    await AsyncStorage.setItem('@dismissed_notifications', JSON.stringify(updatedDismissed));
  };

  const dismissAll = async () => {
    const allIds = [...dismissedIds, ...notifications.map(n => n.id)];
    setDismissedIds(allIds);
    setNotifications([]);
    await AsyncStorage.setItem('@dismissed_notifications', JSON.stringify(allIds));
  };

  const renderItem = ({ item }) => {
    let iconName = 'notifications';
    let iconColor = PRIMARY;

    if (item.type === 'MAKALA_ADDED') { iconName = 'document-text'; iconColor = '#38BDF8'; }
    if (item.type === 'DIBAJI_ADDED') { iconName = 'book'; iconColor = '#F59E0B'; }
    if (item.type === 'ADMIN_ANNOUNCEMENT') { iconName = 'megaphone'; iconColor = '#EF4444'; }

    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: `${iconColor}1A` }]}>
          <Ionicons name={iconName} size={moderateScale(24)} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardText}>{item.message}</Text>
          <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <TouchableOpacity style={styles.dismissBtn} onPress={() => dismissNotification(item.id)}>
          <Ionicons name="close" size={moderateScale(20)} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={PRIMARY_DARK} barStyle="light-content" />
      
      <LinearGradient colors={[PRIMARY_DARK, PRIMARY]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arifa</Text>
        <TouchableOpacity style={styles.clearAllBtn} onPress={dismissAll}>
          <Text style={styles.clearAllText}>Safi Zote</Text>
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={moderateScale(60)} color="#CBD5E1" />
              <Text style={styles.emptyText}>Hakuna arifa mpya.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: moderateScale(17),
    fontFamily: 'Nunito_700Bold',
  },
  clearAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  clearAllText: {
    color: '#FFF',
    fontSize: moderateScale(13),
    fontFamily: 'Nunito_600SemiBold',
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
    elevation: 2,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
  },
  iconBox: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: moderateScale(23),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardText: {
    fontSize: moderateScale(14),
    fontFamily: 'Nunito_600SemiBold',
    color: '#1E293B',
    lineHeight: moderateScale(20),
    marginBottom: Spacing.xs,
  },
  cardDate: {
    fontSize: moderateScale(11),
    fontFamily: 'Nunito_400Regular',
    color: '#64748B',
  },
  dismissBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: moderateScale(16),
    fontFamily: 'Nunito_600SemiBold',
    color: '#94A3B8',
  }
});
