import React, { useMemo, useState, useCallback, useRef } from "react";
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
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
  Share,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFavorites } from "../context/FavoritesContext";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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
  const itemType = item?.methali ? 'methali' : 'proverb';
  const key = item?.methali
    ? `methali:${item?.id != null ? String(item.id) : String(item.methali)}`
    : `proverb:${String(item?.text || title)}`;

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
          useNativeDriver: true,
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
          useNativeDriver: true,
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
                -1, 0, 
                (index * 100) / 2, 
                (index * 100) / 2 + 0.5
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
              {itemType === 'methali' ? 'Methali' : 'Nasaha'}
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

export default function FavoritesScreen() {
  const { favorites, toggleFavorite, loading: isLoading, reload } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
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
      if (activeFilter === 'proverbs') return matchesSearch && item.text;
      if (activeFilter === 'methali') return matchesSearch && item.methali;
      return matchesSearch;
    });
  }, [favorites, searchQuery, activeFilter]);

  const sections = useMemo(() => {
    const proverbs = [];
    const methali = [];

    filteredFavorites.forEach((item) => {
      if (item && typeof item.methali === "string") {
        methali.push(item);
      } else if (item && typeof item.text === "string") {
        proverbs.push(item);
      }
    });

    return { proverbs, methali };
  }, [filteredFavorites]);

  const handleRemove = useCallback((item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleFavorite(item);
  }, [toggleFavorite]);

  const renderSwipeableItem = useCallback((item, index) => {
    return (
      <FavoriteCard
        key={item?.methali
          ? `methali:${item?.id != null ? String(item.id) : String(item.methali)}`
          : `proverb:${String(item?.text || '')}`}
        item={item}
        index={index}
        scrollY={scrollY}
        onRemove={() => handleRemove(item)}
        onShare={() => {}}
        onCopy={() => {}}
      />
    );
  }, [scrollY, handleRemove]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState} accessibilityRole="text">
      <View style={styles.emptyIcon}>
        <Ionicons name="library-outline" size={64} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>Hakuna favoriti bado</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || activeFilter !== 'all' 
          ? 'Hakuna vifaa vilivyo patikana kwa ufafanuzi wako. Jaribu maneno mengine au angalia chaguo zingine.' 
          : 'Bonyeza alama ya moyo kwenye nasaha au methali yoyote kuiweka hapa.'}
      </Text>
      
      {(searchQuery || activeFilter !== 'all') && (
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => {
            setSearchQuery('');
            setActiveFilter('all');
          }}
          accessibilityRole="button"
          accessibilityLabel="Ondoa vichujio"
          accessibilityHint="Gonga kwa kuondoa vichujio vya utafutaji"
        >
          <Text style={styles.resetButtonText}>Ondoa Vichujio</Text>
        </TouchableOpacity>
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
    { id: 'proverbs', label: 'Nasaha' },
    { id: 'methali', label: 'Methali' },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar backgroundColor="#285D6C" barStyle="light-content" />

        <AnimatedLinearGradient 
          colors={["#285D6C", "#3C7C8D"]} 
          style={[
            styles.header,
            {
              height: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [180, 140],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="library" size={28} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Favoriti Zako</Text>
            </View>
            <Text style={styles.headerSubtitle}>Hekima na nasaha ulivyozichagua</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons 
                name="search" 
                size={20} 
                color="#E2E8F0" 
                style={styles.searchIcon} 
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Tafuta kati ya favoriti..."
                placeholderTextColor="#CBD5E1"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
                accessibilityLabel="Tafuta kati ya favoriti"
                accessibilityHint="Andika ili kutafuta nasaha au methali kati ya favoriti zako"
                returnKeyType="search"
              />
              {searchQuery ? (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Futa utafutaji"
                >
                  <Ionicons name="close-circle" size={20} color="#E2E8F0" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </AnimatedLinearGradient>

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
                {sections.proverbs.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nasaha</Text>
                    {sections.proverbs.map((item, index) => 
                      renderSwipeableItem(item, index)
                    )}
                  </View>
                )}

                {sections.methali.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Methali</Text>
                    {sections.methali.map((item, index) => 
                      renderSwipeableItem(item, sections.proverbs.length + index)
                    )}
                  </View>
                )}
              </>
            )}
          </Animated.ScrollView>
        )}
      </View>
    </TouchableWithoutFeedback>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    marginTop: 'auto',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#E2E8F0",
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 0.2,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  filterChipTextActive: {
    color: '#0369A1',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 10,
    fontWeight: '500',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
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
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
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
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  meta: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
    fontStyle: "italic",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
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
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 0,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
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
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 0,
    fontStyle: "italic",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
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
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  reflectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
    fontWeight: '400',
    textAlign: 'left',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  badgeMethali: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  badgeProverb: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#285D6C',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
