import React, { useMemo, useState, useCallback, useRef } from "react";
import { Typography } from '../theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
  Animated,
  Dimensions,
  Pressable,
  Keyboard,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
  Image,
  useWindowDimensions,
  KeyboardAvoidingView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFavorites } from "../context/FavoritesContext";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../theme/spacing";
import { moderateScale } from "../theme/metrics";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Extract RightActions component for better reusability
const RightActions = ({ progress, dragX, onPress }) => {
  const scale = dragX.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const opacity = dragX.interpolate({
    inputRange: [-100, -50, 0],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.rightAction}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Ondoa kwenye favoriti"
      accessibilityHint="Gonga kwa kuondoa kwenye favoriti"
    >
      <Animated.View style={[styles.rightActionContent, {
        transform: [{ scale }],
        opacity
      }]}>
        <Ionicons name="bookmark" size={22} color="#fff" />
        <Text style={styles.rightActionText}>Ondoa</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Extract FavoriteCard component for better organization
const FavoriteCard = React.memo(({
  item,
  index,
  scrollY,
  onRemove
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const expandOpacity = useRef(new Animated.Value(0)).current;

  const title = item?.methali ? `"${item.methali}"` : item?.text ? `"${item.text}"` : "";
  const subtitle = item?.methali ? item?.meaning : item?.meaning;
  const secondary = item?.methali ? item?.lesson : item?.enMeaning;
  const tag = item?.methali ? item?.category : item?.source;
  const itemType = item?.methali ? 'methali' : 'dibaji';
  const key = item?.methali
    ? `methali:${item?.id != null ? String(item.id) : String(item.methali)}`
    : `dibaji:${String(item?.text || title)}`;

  // Generate reflection for "Soma kwa Zaidi"
  const getReflection = useCallback(() => {
    if (!item) return "";

    if (item.methali) {
      const reflections = {
        "Mvumilivu hula mbivu": "Dibaji hii inatukumbusha thamani ya subira katika maisha yetu. Mara nyingi tunataka matokeo haraka, lakini uhalisia ni kwamba mambo mazuri huchukua muda. Subira inatupa nafasi ya kujifunza, kukua, na kujenga msingi imara.",
        "Asiyekujua hakujui": "Dibaji hii inasisitiza umuhimu wa kujitambulisha na kujulikana na watu. Tunapojitambulisha kwa watu, tunawapa fursa ya kukusaidia na kukuelewa.",
        "Haraka haraka haina baraka": "Dibaji hii inatukumbusha kwamba kufanya mambo kwa haraka mara nyingi huleta makosa na hasara. Baraka huja kwa kufanya mambo kwa makini na kwa makusudi.",
        "Mgeni ni baraka": "Dibaji hii inasisitiza umuhimu wa kukaribisha wageni na kuwaonyesha heshima. Mgeni ni baraka kwa sababu anaweza kuleta maarifa mapya, fursa, na urafiki.",
        "Akili ni mali": "Dibaji hii inasisitiza kwamba akili ni mali ya thamani zaidi kuliko mali yoyote ya kidunia. Tumia akili yako kwa busara, ujifunze kila siku.",
        "Kila mtu ana jambo lake": "Dibaji hii inatukumbusha kwamba kila mtu ana shida na matatizo yake. Usiwaonee wengine vibaya kwa sababu unajua sehemu ya maisha yao.",
        "Mwenye kazi hawezi kufa njaa": "Dibaji hii inasisitiza umuhimu wa kazi na bidii katika maisha. Mtu mwenye kazi na bidii hawezi kufa njaa kwa sababu kazi inamletea riziki.",
        "Mkono mmoja haushindi kambi": "Dibaji hii inasisitiza umuhimu wa ushirikiano na kufanya kazi pamoja. Tunapofanya kazi pamoja, tunaweza kufikia mafanikio makubwa zaidi."
      };
      return reflections[item.methali] || "Dibaji hii inatoa maarifa ya kina kuhusu kuishi maisha yenye maana. Chukua muda wa kufikiria jinsi inavyoweza kutumika katika safari yako ya maisha.";
    }

    return "Nasaha hii inatoa maarifa ya kina kuhusu kuishi maisha yenye maana. Chukua muda wa kufikiria jinsi inavyoweza kutumika katika safari yako ya maisha na uzoefu wako.";
  }, [item]);

  const handleToggleExpand = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const willExpand = !isExpanded;
    setIsExpanded(willExpand);

    if (willExpand) {
      Animated.parallel([
        Animated.timing(expandAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(expandOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(expandAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(expandOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [isExpanded, expandAnim, expandOpacity]);

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const shareText = item?.methali
        ? `"${item.methali}"\n\nMaana: ${item.meaning}\n\nSomo: ${item.lesson}`
        : `"${item.text}"\n\nMaana: ${item.meaning}`;
      await Share.share({ message: shareText });
    } catch (_) {
      // Best-effort share
    }
  }, [item]);

  const handleCopy = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const copyText = item?.methali ? item.methali : item?.text || "";
    Alert.alert("Imeingizwa kwenye ubao wa kunakili", copyText);
  }, [item]);

  const renderRightActions = useCallback((progress, dragX) => (
    <RightActions progress={progress} dragX={dragX} onPress={onRemove} />
  ), [onRemove]);

  return (
    <Swipeable
      key={key}
      renderRightActions={renderRightActions}
      rightThreshold={50}
      containerStyle={styles.swipeableContainer}
      overshootRight={false}
    >
      <Animated.View
        style={[
          styles.card,
          {
            opacity: scrollY.interpolate({
              inputRange: [
                -1, 
                0,
                (index * 100) / 2 + 1,
                (index * 100) / 2 + 50
              ],
              outputRange: [1, 1, 1, 0],
            }),
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[
            styles.badge,
            itemType === 'methali' ? styles.badgeMethali : styles.badgeProverb
          ]}>
            <Ionicons
              name={itemType === 'methali' ? 'library' : 'book'}
              size={12}
              color={itemType === 'methali' ? '#0369A1' : '#475569'}
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.badgeText,
              itemType === 'methali' ? styles.badgeTextMethali : styles.badgeTextProverb
            ]}>
              {itemType === 'methali' ? 'Methali' : 'Dibaji'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRemove}
            style={styles.removeButton}
            accessibilityRole="button"
            accessibilityLabel="Ondoa kwenye favoriti"
            accessibilityHint="Gonga kwa kuondoa kwenye favoriti"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="heart" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title} selectable>{title}</Text>

        {tag ? (
          <View style={styles.tagContainer}>
            <Ionicons name="bookmark-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.tagText} numberOfLines={1} ellipsizeMode="tail">
              {tag}
            </Text>
          </View>
        ) : null}

        {subtitle ? (
          <View style={styles.meaningContainer}>
            <View style={styles.meaningHeader}>
              <Ionicons name="book-outline" size={14} color="#3B82F6" />
              <Text style={styles.meaningLabel}>Maana</Text>
            </View>
            <Text style={styles.subtitle} selectable>{subtitle}</Text>
          </View>
        ) : null}

        {secondary ? (
          <View style={styles.lessonContainer}>
            <View style={styles.lessonHeader}>
              <Ionicons name="library-outline" size={14} color="#F59E0B" />
              <Text style={styles.lessonLabel}>Somo</Text>
            </View>
            <Text style={styles.secondary} selectable>{secondary}</Text>
          </View>
        ) : null}

        {/* "Soma kwa Zaidi" Expandable Section */}
        <TouchableOpacity
          onPress={handleToggleExpand}
          style={styles.readMoreButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Soma kwa zaidi"
          accessibilityHint="Gonga kwa kupanua maelezo zaidi"
        >
          <Text style={styles.readMoreText}>Soma kwa Zaidi</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#285D6C"
            style={styles.readMoreIcon}
          />
        </TouchableOpacity>

        {/* Expanded Reflection Section */}
        <Animated.View
          style={[
            styles.expandedSection,
            {
              maxHeight: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 400],
              }),
              opacity: expandOpacity,
            },
          ]}
        >
          <View style={styles.reflectionContainer}>
            <View style={styles.reflectionHeader}>
              <Ionicons name="library" size={16} color="#285D6C" />
              <Text style={styles.reflectionTitle}>Tafakari</Text>
            </View>
            <Text style={styles.reflectionText}>
              {getReflection()}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.cardFooter}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Shiriki"
              accessibilityHint="Gonga kwa kushiriki nasaha hii"
            >
              <Ionicons name="share-outline" size={16} color="#285D6C" />
              <Text style={styles.actionText}>Shiriki</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel="Nakili"
              accessibilityHint="Gonga kwa kunakili nasaha hii"
            >
              <Ionicons name="copy-outline" size={16} color="#285D6C" />
              <Text style={styles.actionText}>Nakili</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Swipeable>
  );
});

export default function FavoritesScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const { favorites, toggleFavorite, loading: isLoading, reload } = useFavorites();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload?.();
    setRefreshing(false);
  }, [reload]);

  const filteredFavorites = useMemo(() => {
    return favorites.filter(item => {
      const matchesSearch = searchQuery === '' ||
        (item?.text?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item?.methali?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item?.meaning?.toLowerCase().includes(searchQuery.toLowerCase()));

      if (activeFilter === 'all') return matchesSearch;
      if (activeFilter === 'dibaji') return matchesSearch && item.text;
      if (activeFilter === 'methali') return matchesSearch && item.methali;
      return matchesSearch;
    });
  }, [favorites, searchQuery, activeFilter]);

  const sections = useMemo(() => {
    const dibaji = [];
    const methali = [];

    filteredFavorites.forEach((item) => {
      if (item && typeof item.methali === "string") {
        methali.push(item);
      } else if (item && typeof item.text === "string") {
        dibaji.push(item);
      }
    });

    return { dibaji, methali };
  }, [filteredFavorites]);

  const handleRemove = useCallback((item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleFavorite(item);
  }, [toggleFavorite]);

  const renderSwipeableItem = useCallback((item, index) => {
    // Key must match getItemKey() in FavoritesContext for correct deduplication
    const itemKey = item?.methali
      ? `methali:${String(item.methali)}`
      : `dibaji:${String(item?.text || '')}`;
    return (
      <FavoriteCard
        key={itemKey}
        item={item}
        index={index}
        scrollY={scrollY}
        onRemove={() => handleRemove(item)}
        onShare={() => { }}
        onCopy={() => { }}
      />
    );
  }, [scrollY, handleRemove]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState} accessibilityRole="text">
      <View style={styles.dashedCircle}>
        <View style={styles.iconSquare}>
          <Ionicons name="book-outline" size={48} color="#86EFAC" />
          <View style={styles.heartBadge}>
            <Ionicons name="heart" size={16} color="#78350F" />
          </View>
        </View>
      </View>

      <Text style={styles.emptyTitle}>Hakuna favoriti bado</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || activeFilter !== 'all'
          ? 'Hakuna vifaa vilivyo patikana kwa utafutaji wako. Jaribu maneno mengine au ondoa vichujio.'
          : 'Bonyeza alama ya moyo kwenye nasaha au methali yoyote kuiweka hapa.'}
      </Text>

      {(searchQuery || activeFilter !== 'all') ? (
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => {
            setSearchQuery('');
            setActiveFilter('all');
          }}
          accessibilityRole="button"
        >
          <Text style={styles.exploreButtonText}>Ondoa Vichujio</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => {
            // Can add navigation to home here
          }}
        >
          <Text style={styles.exploreButtonText}>Gundua Hekima Mpya</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      )}

      {!searchQuery && activeFilter === 'all' && (
        <View style={styles.emptyBottomImageContainer} style={[{ pointerEvents: "none" }]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' }}
            style={styles.emptyBottomImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['#F8FAFC', 'rgba(248,250,252,0.7)', 'rgba(248,250,252,0)']}
            style={StyleSheet.absoluteFillObject}
            locations={[0, 0.5, 1]}
          />
        </View>
      )}
    </View>
  ), [searchQuery, activeFilter]);

  const renderFilterChip = useCallback(({ id, label }) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.filterChip,
        activeFilter === id && styles.filterChipActive,
      ]}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
        setActiveFilter(id);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: activeFilter === id }}
    >
      <Text
        style={[
          styles.filterChipText,
          activeFilter === id && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  ), [activeFilter]);

  const filters = [
    { id: 'all', label: 'Zote' },
    { id: 'dibaji', label: 'Dibaji' },
    { id: 'methali', label: 'Methali' },
  ];

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.container} onPress={() => Keyboard.dismiss()}>
        <StatusBar barStyle="light-content" backgroundColor="#285D6C" />

        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {isSearchActive ? (
              <TextInput
                style={styles.topBarSearchInput}
                placeholder="Tafuta kati ya favoriti..."
                placeholderTextColor="#A0D1DD"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
            ) : (
              <Text style={styles.topBarTitle}>
                Favoriti{favorites.length > 0 ? ` (${favorites.length})` : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchIconBtn}
            onPress={() => {
              if (isSearchActive && searchQuery !== "") {
                setSearchQuery("");
                setIsSearchActive(false);
              } else {
                setIsSearchActive(!isSearchActive);
              }
            }}
          >
            <Ionicons name={isSearchActive ? "close" : "search"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {filters.map(renderFilterChip)}
          </ScrollView>
        </View>

        {isLoading && favorites.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3C7C8D" />
          </View>
        ) : (
          <Animated.ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#3C7C8D"
                colors={['#3C7C8D']}
              />
            }
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
          >
            {filteredFavorites.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {sections.dibaji.length > 0 && (
                  <View style={[styles.section, { alignSelf: 'center', width: Math.min(width - 32, 600) }]}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Dibaji</Text>
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{sections.dibaji.length}</Text>
                      </View>
                    </View>
                    {sections.dibaji.map((item, index) =>
                      renderSwipeableItem(item, index)
                    )}
                  </View>
                )}

                {sections.methali.length > 0 && (
                  <View style={[styles.section, { alignSelf: 'center', width: Math.min(width - 32, 600) }]}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Methali</Text>
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{sections.methali.length}</Text>
                      </View>
                    </View>
                    {sections.methali.map((item, index) =>
                      renderSwipeableItem(item, sections.dibaji.length + index)
                    )}
                  </View>
                )}
              </>
            )}
          </Animated.ScrollView>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  swipeableContainer: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',



      },
      android: {
        elevation: 2,
      },
    }),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#285D6C',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarTitle: {
    ...Typography.heading,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFFFFF',
    marginLeft: 16,
    fontSize: 22,
  },
  iconBtn: {
    padding: 4,
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBtn: {
    marginRight: 12,
    padding: 4,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filtersScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    marginRight: 12,
  },
  filterChipActive: {
    backgroundColor: '#285D6C',
  },
  filterChipText: {
    ...Typography.body,
    fontFamily: 'Nunito_700Bold',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  rightAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    width: 90,
    paddingHorizontal: 12,
  },
  rightActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    ...Typography.heading,
    fontFamily: 'Nunito_600SemiBold',
    color: '#1E293B',
  },
  sectionBadge: {
    backgroundColor: '#285D6C',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  topBarSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    marginLeft: 12,
    paddingVertical: 4,
  },
  badgeMethali: {
    backgroundColor: '#E0F2FE',
  },
  badgeProverb: {
    backgroundColor: '#F1F5F9',
  },
  badgeTextMethali: {
    color: '#0369A1',
  },
  badgeTextProverb: {
    color: '#475569',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    ...Typography.subheading,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 6,
    marginLeft: 6,
    borderRadius: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',



      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#64748B',
    ...Typography.caption,
    fontFamily: 'Nunito_600SemiBold',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  badgeText: {
    ...Typography.tiny,
    fontFamily: 'Nunito_600SemiBold',
  },
  removeButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  title: {
    ...Typography.heading,
    fontFamily: 'Nunito_600SemiBold',
    color: "#1E293B",
    marginBottom: 12,
    lineHeight: 28,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  meta: {
    ...Typography.tiny,
    color: "#64748B",
    marginBottom: 8,
    fontStyle: "italic",
  },
  meaningContainer: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  meaningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meaningLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#475569",
    ...Typography.body,
    marginBottom: 0,
    paddingLeft: 20,
  },
  lessonContainer: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondary: {
    color: "#64748B",
    ...Typography.caption,
    lineHeight: 22,
    marginBottom: 0,
    fontStyle: "italic",
    paddingLeft: 20,
  },
  tagContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagText: {
    ...Typography.tiny,
    fontFamily: 'Nunito_600SemiBold',
    color: '#64748B',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  readMoreText: {
    ...Typography.caption,
    fontFamily: 'Nunito_600SemiBold',
    color: '#285D6C',
    marginRight: 6,
  },
  readMoreIcon: {
    marginLeft: 4,
  },
  expandedSection: {
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
  },
  reflectionContainer: {
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#285D6C',
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reflectionTitle: {
    ...Typography.body,
    fontFamily: 'Nunito_700Bold',
    color: '#1F2937',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  reflectionText: {
    ...Typography.caption,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'left',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    minHeight: Dimensions.get('window').height - 250,
  },
  dashedCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconSquare: {
    width: 100,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',



    elevation: 2,
  },
  heartBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#FED7AA',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F8FAFC',
  },
  emptyTitle: {
    ...Typography.title,
    fontFamily: 'Nunito_800ExtraBold',
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Typography.body,
    fontFamily: 'Georgia',
    color: "#475569",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#285D6C',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',



    elevation: 4,
    zIndex: 10,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    ...Typography.subheading,
    fontFamily: 'Nunito_700Bold',
  },
  emptyBottomImageContainer: {
    position: 'absolute',
    bottom: 0,
    width: '120%',
    height: 200,
    zIndex: 1,
    opacity: 0.5,
  },
  emptyBottomImage: {
    width: '100%',
    height: '100%',
    tintColor: '#CBD5E1',
  },
  badgeMethali: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  badgeProverb: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
});
