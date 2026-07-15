import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Share,
  Alert,
  Platform,
  LayoutAnimation,
  useWindowDimensions,
  ImageBackground,
  SafeAreaView,
  Image,
  ActivityIndicator,
  TextInput
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { useFavorites } from "../context/FavoritesContext";
import { usePushNotifications } from '../hooks/usePushNotifications';
import * as Haptics from 'expo-haptics';
import { Typography } from "../theme/typography";
import { apiFetch, ENDPOINTS, getNetworkImageUrl } from "../config/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../theme/spacing";
import { moderateScale } from "../theme/metrics";

const METHALI_HEADER_IMAGE = require("../assets/Conservancies-in-Kenya.-By-Kenya-Wildlife-Conservancies.jpg");

const safeImpactAsync = (style) => {
  if (Platform.OS === 'web') return Promise.resolve();
  return Haptics.impactAsync(style).catch(() => undefined);
};

const safeSelectionAsync = () => {
  if (Platform.OS === 'web') return Promise.resolve();
  return Haptics.selectionAsync().catch(() => undefined);
};

const safeNotificationAsync = (type) => {
  if (Platform.OS === 'web') return Promise.resolve();
  return Haptics.notificationAsync(type).catch(() => undefined);
};

const categoryData = [
  { id: 'all', name: 'Zote', icon: 'grid-on' },
  { id: 'Subira', name: 'Subira', icon: 'hourglass-empty' },
  { id: 'Urafiki', name: 'Urafiki', icon: 'people' },
  { id: 'Utulivu', name: 'Utulivu', icon: 'self-improvement' },
  { id: 'Ukarimu', name: 'Ukarimu', icon: 'favorite' },
  { id: 'Akili', name: 'Akili', icon: 'psychology' },
  { id: 'Uelewa', name: 'Uelewa', icon: 'lightbulb' },
  { id: 'Kazi', name: 'Kazi', icon: 'work' },
  { id: 'Ushirikiano', name: 'Ushirikiano', icon: 'group-work' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function MethaliScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const { isFavorite: isFavoriteInStore, toggleFavorite } = useFavorites();

  const [methaliList, setMethaliList] = useState([]);
  const [currentMethali, setCurrentMethali] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const { notification } = usePushNotifications();

  // Watch for real-time incoming notifications
  useEffect(() => {
    if (notification) {
      loadMethali(true);
    }
  }, [notification]);

  const cardScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const expandOpacity = useRef(new Animated.Value(0)).current;
  const lastIdRef = useRef(null);
  const scrollViewRef = useRef(null);

  const loadMethali = async (bypassCache = false) => {
    try {
      setLoading(true);
      const data = await apiFetch(ENDPOINTS.methali, {
        bypassCache,
        onUpdate: (freshData) => {
          setMethaliList(freshData);
          if (freshData.length > 0) {
            setCurrentMethali(prev => {
              if (!prev) return freshData[0];
              const updated = freshData.find(m => m.id === prev.id);
              return updated || prev;
            });
          }
        }
      });
      setMethaliList(data);
      if (data.length > 0 && !currentMethali) {
        setCurrentMethali(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethali();
  }, []);

  const animateIn = () => {
    fadeAnim.setValue(0);
    translateY.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  };

  useEffect(() => {
    if (!currentMethali) return;
    animateIn();
    setIsFavorite(isFavoriteInStore(currentMethali));
    if (isExpanded) {
      setIsExpanded(false);
      expandAnim.setValue(0);
      expandOpacity.setValue(0);
    }
  }, [currentMethali]);

  useEffect(() => {
    if (Platform.OS === "android" && LayoutAnimation && typeof LayoutAnimation.configureNext === "function") {
      if (Platform.OS === "android" && global.UIManager && global.UIManager.setLayoutAnimationEnabledExperimental) {
        global.UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  const animateCardPress = useCallback(
    ({ toValue = 0.98, duration = 100 } = {}) => {
      Animated.sequence([
        Animated.timing(cardScale, { toValue, duration, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 6, tension: 80 }),
      ]).start();
    },
    [cardScale]
  );

  const getRandomMethali = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    safeImpactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let filteredData = methaliList;
    if (selectedCategory !== "all") {
      filteredData = filteredData.filter(item => item.category === selectedCategory);
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.methali.toLowerCase().includes(q) || item.meaning.toLowerCase().includes(q)
      );
    }

    if (filteredData.length === 0) {
      fadeOutAndSetMethali({
        id: 'not_found',
        methali: 'Hakuna Methali Zilizopatikana',
        meaning: 'Hakuna methali zinazoendana na utafutaji au kundi hili. Jaribu neno jingine.',
        category: selectedCategory,
        lesson: 'Tafadhali badili utafutaji wako.',
      });
      setIsAnimating(false);
      return;
    }

    let picked;
    if (filteredData.length === 1) {
      picked = filteredData[0];
    } else {
      const availableIndices = filteredData
        .map((_, index) => index)
        .filter(index => filteredData[index].id !== lastIdRef.current);

      const randomIndex = availableIndices.length > 0
        ? availableIndices[Math.floor(Math.random() * availableIndices.length)]
        : Math.floor(Math.random() * filteredData.length);

      picked = filteredData[randomIndex];
    }

    if (!picked) {
      setIsAnimating(false);
      return;
    }

    fadeOutAndSetMethali(picked);
  }, [isAnimating, selectedCategory, methaliList, searchQuery]);

  const fadeOutAndSetMethali = useCallback((methali) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      lastIdRef.current = methali.id;
      setCurrentMethali(methali);
      setIsFavorite(isFavoriteInStore(methali));

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }

      setTimeout(() => {
        animateIn();
        setIsAnimating(false);
      }, 100);
    });
  }, [fadeAnim, isFavoriteInStore]);

  const handleToggleFavorite = async () => {
    try {
      const willFavorite = !isFavorite;
      safeImpactAsync(willFavorite
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium
      );
      if (!currentMethali) return;
      await toggleFavorite(currentMethali);
      setIsFavorite(willFavorite);
    } catch (_) { }
  };

  const handleShare = async () => {
    try {
      animateCardPress({ toValue: 0.98, duration: 100 });
      await Share.share({
        message: `"${currentMethali.methali}"\n\nMaana: ${currentMethali.meaning}\n\nSomo: ${currentMethali.lesson}`,
      });
    } catch (_) {
    }
  };

  const getReflection = useCallback((methali) => {
    if (!methali) return "";

    const reflections = {
      "Mvumilivu hula mbivu": "Usemi huu unatukumbusha thamani ya subira katika maisha yetu. Mara nyingi tunataka matokeo haraka, lakini uhalisia ni kwamba mambo mazuri huchukua muda. Subira inatupa nafasi ya kujifunza, kukua, na kujenga msingi imara. Tunaposubiri kwa uvumilivu, tunapata matunda mazuri zaidi kuliko tunavyojaribu kukimbilia haraka. Hii ni hekima ya wazee ambayo inaweza kutuwezesha kuishi maisha yenye maana na amani.",
      "Asiyekujua hakujui": "Usemi huu unasisitiza umuhimu wa kujitambulisha na kujulikana na watu. Tunapojitambulisha kwa watu, tunawapa fursa ya kukusaidia na kukuelewa. Hii si kujivuna, bali ni kujenga uhusiano wa kuaminiana. Watu hawawezi kukusaidia kama hawakujui wewe ni nani na unahitaji nini. Jitambulishe kwa ujasiri na uwe na ujasiri wa kuomba msaada unapohitaji.",
      "Haraka haraka haina baraka": "Usemi huu unatukumbusha kwamba kufanya mambo kwa haraka mara nyingi huleta makosa na hasara. Tunapopiga haraka, hatuna muda wa kufikiria kwa kina au kuona picha kubwa. Baraka huja kwa kufanya mambo kwa makini na kwa makusudi. Kila jambo lina wakati wake, na kusubiri wakati ufaao ni busara, si woga. Fanya kila kitu kwa utulivu na uangalifu.",
      "Mgeni ni baraka": "Usemi huu unasisitiza umuhimu wa kukaribisha wageni na kuwaonyesha heshima. Mgeni ni baraka kwa sababu anaweza kuleta maarifa mapya, fursa, na urafiki. Tunapomkaribisha mgeni, tunajenga uhusiano na kujenga jamii yenye nguvu. Hii ni desturi ya Kiswahili ambayo ina thamani kubwa katika kuishi pamoja kwa amani na upendo.",
      "Akili ni mali": "Usemi huu unasisitiza kwamba akili ni mali ya thamani zaidi kuliko mali yoyote ya kidunia. Akili inaweza kutupa mafanikio makubwa zaidi kuliko mali. Tumia akili yako kwa busara, ujifunze kila siku, na uwe na uwezo wa kutatua matatizo. Akili ni kitu ambacho hakuna mtu anaweza kukuchukua, na ni mali ambayo inaweza kukukua zaidi unapoiendeleza.",
      "Kila mtu ana jambo lake": "Usemi huu unatukumbusha kwamba kila mtu ana shida na matatizo yake. Usiwaonee wengine vibaya kwa sababu unajua sehemu ya maisha yao. Kila mtu ana safari yake ya maisha na changamoto zake. Tunaweza kuwa na huruma na kuelewa kwamba hatuwezi kujua kila kitu kuhusu maisha ya mtu mwingine. Hii inatupa nafasi ya kuwa na huruma na kusaidiana.",
      "Mwenye kazi hawezi kufa njaa": "Usemi huu unasisitiza umuhimu wa kazi na bidii katika maisha. Mtu mwenye kazi na bidii hawezi kufa njaa kwa sababu kazi inamletea riziki. Hii si tu kuhusu kazi ya kazi, bali pia kuhusu kujitahidi katika kila jambo tunalofanya. Kazi na bidii ni njia ya kujipatia riziki na kufanikiwa katika maisha.",
      "Mkono mmoja haushindi kambi": "Usemi huu unasisitiza umuhimu wa ushirikiano na kufanya kazi pamoja. Mtu mmoja hawezi kufanya kazi nyingi peke yake. Tunapofanya kazi pamoja, tunaweza kufikia mafanikio makubwa zaidi. Ushirikiano ni muhimu katika kuishi pamoja kwa amani na kufanikiwa. Hii ni hekima ambayo inaweza kutuwezesha kuishi maisha bora zaidi."
    };

    return reflections[methali.methali] || "Usemi huu inatoa maarifa ya kina kuhusu kuishi maisha yenye maana. Chukua muda wa kufikiria jinsi inavyoweza kutumika katika safari yako ya maisha na uzoefu wako. Hekima ya wazee ni hazina ya thamani ambayo inaweza kutuwezesha kuishi maisha bora zaidi.";
  }, []);

  const handleToggleExpand = useCallback(() => {
    if (!currentMethali) return;

    safeImpactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  }, [isExpanded, currentMethali, expandAnim, expandOpacity]);

  const renderCategoryItem = ({ item }) => (
    <AnimatedTouchable
      key={item.id}
      style={[
        styles.categoryButton,
        selectedCategory === item.id && styles.categoryButtonActive,
      ]}
      onPress={() => {
        safeSelectionAsync();
        setSelectedCategory(item.id);
        setTimeout(() => {
          if (!isAnimating) {
            getRandomMethali();
          }
        }, 100);
      }}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={item.icon}
        size={20}
        color={selectedCategory === item.id ? '#FFFFFF' : '#475569'}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.categoryTextActive,
        ]}
      >
        {item.name}
      </Text>
    </AnimatedTouchable>
  );

  if (loading || !currentMethali) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#285D6C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#285D6C" />

      {/* Top Nav Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {isSearchActive ? (
            <TextInput
              style={styles.searchInput}
              placeholder="Tafuta methali..."
              placeholderTextColor="#A0D1DD"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              onSubmitEditing={() => {
                if (!isAnimating) getRandomMethali();
              }}
            />
          ) : (
            <Text style={styles.topBarTitle}>Methali</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.iconBtn}
          onPress={() => {
            if (isSearchActive && searchQuery !== "") {
              setSearchQuery("");
              setIsSearchActive(false);
              setTimeout(() => { if (!isAnimating) getRandomMethali(); }, 100);
            } else {
              setIsSearchActive(!isSearchActive);
            }
          }}
        >
          <Ionicons name={isSearchActive ? "close" : "search"} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Hero Section */}
        <View style={[styles.headerContainer, { height: height * 0.22 }]}>
          <ImageBackground
            source={METHALI_HEADER_IMAGE}
            style={styles.headerBackground}
            imageStyle={styles.headerBackgroundImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
              style={styles.headerGradient}
            >
              <TouchableOpacity
                style={styles.headerFavoritesButton}
                onPress={() => navigation.navigate('Favorites')}
              >
                <Ionicons name="bookmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerText}>Maneno yenyeBusara na hekima </Text>
                  <Text style={styles.headerSubtext}>Tujifunze Wanetu</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Category Filter */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categoryData.map((item) => (
              <View key={item.id} style={styles.categoryItem}>
                {renderCategoryItem({ item })}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Methali Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              alignSelf: 'center', 
              width: Math.min(width - 32, 600),
              transform: [
                { scale: cardScale },
                { translateY: translateY }
              ]
            },
          ]}
        >
          {/* Card Header with Image - Hero Style */}
          <View style={styles.cardImageContainer}>
            <Animated.Image
              source={{ uri: getNetworkImageUrl(currentMethali.image) }}
              style={[styles.cardImage, { transform: [{ scale: 1.05 }] }]}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.5, 1]}
              style={styles.cardImageGradient}
            />
            <View style={styles.cardHeader}>
              <View style={styles.categoryBadge}>
                <MaterialIcons name={categoryData.find(c => c.name === currentMethali.category)?.icon || 'hourglass-empty'} size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.categoryBadgeText}>{currentMethali.category}</Text>
              </View>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={handleToggleFavorite}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={20}
                  color={isFavorite ? "#285D6C" : "#475569"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            <Text style={styles.methaliText}>"{currentMethali.methali}"</Text>

            <View style={styles.meaningContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book-outline" size={18} color="#8B6D3B" />
                <Text style={styles.meaningTitleText}>MAANA YAKE</Text>
              </View>
              <Text style={styles.meaningText}>{currentMethali.meaning}</Text>
            </View>

            {/* Expanded Reflection Section */}
            <Animated.View
              style={[
                styles.expandedSection,
                {
                  maxHeight: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 500],
                  }),
                  opacity: expandOpacity,
                },
              ]}
            >
              <View style={styles.lessonContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="school-outline" size={20} color="#0F766E" />
                  <Text style={styles.lessonTitleText}>SOMO LINALOFUNDISHWA</Text>
                </View>
                <Text style={styles.lessonText}>{currentMethali.lesson}</Text>
              </View>

              <View style={styles.reflectionContainer}>
                <View style={styles.reflectionHeader}>
                  <Ionicons name="library" size={20} color="#285D6C" />
                  <Text style={styles.reflectionTitle}>Tafakari</Text>
                </View>
                <Text style={styles.reflectionText}>
                  {getReflection(currentMethali)}
                </Text>
              </View>
            </Animated.View>

            <View style={styles.horizontalDivider} />

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.sambazaBtn} onPress={handleShare} activeOpacity={0.7}>
                <Ionicons name="share-social-outline" size={20} color="#285D6C" />
                <Text style={styles.sambazaText}>Sambaza</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.somaZaidiBtn} onPress={handleToggleExpand} activeOpacity={0.8}>
                <Text style={styles.somaZaidiText}>{isExpanded ? 'Ficha' : 'Soma zaidi'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Other Methali List */}
        <View style={styles.listContainer}>
          {methaliList
            .filter(item => item.id !== currentMethali.id && (selectedCategory === 'all' || item.category === selectedCategory))
            .slice(0, 5)
            .map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItemCard}
                onPress={() => {
                  safeImpactAsync(Haptics.ImpactFeedbackStyle.Light);
                  fadeOutAndSetMethali(item);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.listItemCategory}>{item.category.toUpperCase()}</Text>
                <Text style={styles.listItemTitle}>"{item.methali}"</Text>
                <Text style={styles.listItemDesc} numberOfLines={2}>
                  {item.meaning}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  // Top Nav Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
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
  // Header Styles
  headerContainer: {
    backgroundColor: '#285D6C',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    marginBottom: 6,
  },
  headerBackground: {
    flex: 1,
    width: '100%',
  },
  headerBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  headerText: {
    ...Typography.title,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFFFFF',
    marginBottom: 4,
    fontSize: 26,
    letterSpacing: 0.5,
  },
  headerSubtext: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  headerFavoritesButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  // Categories
  categoriesContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  categoriesScroll: {
    paddingRight: 16,
  },
  categoryItem: {
    marginRight: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#EAEAE2',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    
    
    
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#285D6C',
  },
  categoryText: {
    ...Typography.label,
    fontFamily: 'Nunito_700Bold',
    color: '#475569',
    marginLeft: 6,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    boxShadow: '0px 6px 14px rgba(0, 0, 0, 0.1)',
    
    
    
    elevation: 6,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 220,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  cardHeader: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  categoryBadge: {
    backgroundColor: 'rgba(20, 50, 40, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    ...Typography.caption,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.5,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    ...Typography.body,
    marginLeft: 10,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    
    
    
    elevation: 3,
  },
  cardContent: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  methaliText: {
    ...Typography.title,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#285D6C',
    fontSize: 26,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  meaningContainer: {
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FDBA74',
    paddingLeft: 16,
  },
  meaningTitleText: {
    ...Typography.caption,
    fontFamily: 'Nunito_700Bold',
    color: '#92400E',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  meaningText: {
    ...Typography.body,
    color: '#334155',
    lineHeight: 28,
    textAlign: 'center',
    paddingRight: 16,
  },
  lessonContainer: {
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#A7F3D0',
    paddingLeft: 16,
  },
  lessonTitleText: {
    ...Typography.caption,
    fontFamily: 'Nunito_700Bold',
    color: '#0F766E',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lessonText: {
    ...Typography.body,
    color: '#475569',
    lineHeight: 28,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingRight: 16,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 24,
    marginTop: 8,
    marginHorizontal: -8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sambazaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  sambazaText: {
    fontFamily: 'Nunito_700Bold',
    color: '#285D6C',
    marginLeft: 8,
    fontSize: 15,
  },
  somaZaidiBtn: {
    backgroundColor: '#285D6C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  somaZaidiText: {
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
    fontSize: 15,
  },
  expandedSection: {
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: 16,
  },
  reflectionContainer: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#285D6C',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    
    
    
    elevation: 2,
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reflectionTitle: {
    ...Typography.subheading,
    fontFamily: 'Nunito_700Bold',
    color: '#1F2937',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  reflectionText: {
    ...Typography.body,
    color: '#4B5563',
    textAlign: 'left',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.06)',
    
    
    
    elevation: 3,
  },
  listItemCategory: {
    ...Typography.tiny,
    fontFamily: 'Nunito_700Bold',
    color: '#A89481',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listItemTitle: {
    ...Typography.title,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#285D6C',
    fontSize: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  listItemDesc: {
    ...Typography.body,
    color: '#4B5563',
    lineHeight: 24,
  },
  methaliListContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
    elevation: 3,
    marginBottom: 100,
  },
  listTitle: {
    color: "#285D6C",
    ...Typography.heading,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 16,
  },
  methaliItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  methaliItemActive: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#285D6C",
  },
  methaliItemContent: {
    flex: 1,
  },
  methaliItemText: {
    color: "#1E293B",
    ...Typography.subheading,
    fontFamily: 'Nunito_600SemiBold',
    marginBottom: 4,
  },
  methaliItemCategory: {
    color: "#64748B",
    ...Typography.tiny,
    fontFamily: 'Nunito_600SemiBold',
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#285D6C",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: '0px 6px 10px rgba(0,0,0,0.15)',
    elevation: 8,
  },
});
