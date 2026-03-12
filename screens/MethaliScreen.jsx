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
  Dimensions,
  ImageBackground,
  SafeAreaView,
  Image
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { useFavorites } from "../context/FavoritesContext";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

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

const methaliData = [
  {
    id: 1,
    methali: "Mvumilivu hula mbivu",
    meaning: "Mtu mwenye subira hupata matunda ya bidii yake",
    lesson: "Subira na uvumilivu ni sifa muhimu za mafanikio",
    category: "Subira",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1932&q=80"
  },
  {
    id: 2,
    methali: "Asiyekujua hakujui",
    meaning: "Mtu asiyekujua wewe, hawezi kukusaidia",
    lesson: "Jitambulishe kwa watu ili waweze kukusaidia",
    category: "Urafiki",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
  },
  {
    id: 3,
    methali: "Haraka haraka haina baraka",
    meaning: "Kufanya kazi kwa haraka bila makini huleta matokeo mabaya",
    lesson: "Fanya kila kitu kwa makini na utulivu",
    category: "Utulivu",
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
  },
  {
    id: 4,
    methali: "Mgeni ni baraka",
    meaning: "Mgeni ni baraka na ni lazima amkaribishwe",
    lesson: "Karibisha wageni na uwaonyeshe heshima",
    category: "Ukarimu",
    image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
  },
  {
    id: 5,
    methali: "Akili ni mali",
    meaning: "Akili ni mali ya thamani zaidi kuliko mali yoyote",
    lesson: "Tumia akili yako kwa busara na ujifunze kila siku",
    category: "Akili",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1073&q=80"
  },
  {
    id: 6,
    methali: "Kila mtu ana jambo lake",
    meaning: "Kila mtu ana shida na matatizo yake",
    lesson: "Usiwaonee wengine vibaya kwa sababu unajua sehemu ya maisha yao",
    category: "Uelewa",
    image: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1169&q=80"
  },
  {
    id: 7,
    methali: "Mwenye kazi hawezi kufa njaa",
    meaning: "Mtu mwenye kazi na bidii hawezi kufa njaa",
    lesson: "Kazi na bidii ni njia ya kujipatia riziki",
    category: "Kazi",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1171&q=80"
  },
  {
    id: 8,
    methali: "Mkono mmoja haushindi kambi",
    meaning: "Mtu mmoja hawezi kufanya kazi nyingi peke yake",
    lesson: "Ushirikiano na kufanya kazi pamoja ni muhimu",
    category: "Ushirikiano",
    image: "https://images.unsplash.com/photo-1529154691717-330608dd63f2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
  }
];

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
  const { isFavorite: isFavoriteInStore, toggleFavorite } = useFavorites();

  const [currentMethali, setCurrentMethali] = useState(methaliData[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const cardScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const expandOpacity = useRef(new Animated.Value(0)).current;
  const lastIdRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Animation config
  const animateIn = () => {
    fadeAnim.setValue(0);
    translateY.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  };

  useEffect(() => {
    animateIn();
    setIsFavorite(isFavoriteInStore(currentMethali));
    // Collapse expanded section when methali changes
    if (isExpanded) {
      setIsExpanded(false);
      expandAnim.setValue(0);
      expandOpacity.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMethali]);

  useEffect(() => {
    if (Platform.OS === "android" && LayoutAnimation && typeof LayoutAnimation.configureNext === "function") {
      // @ts-ignore - RN older types may not include this property
      if (Platform.OS === "android" && global?.UIManager?.setLayoutAnimationEnabledExperimental) {
        // @ts-ignore
        global.UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  const animateCardPress = useCallback(
    ({ toValue = 0.98, duration = 100 } = {}) => {
      Animated.sequence([
        Animated.timing(cardScale, { toValue, duration, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }),
      ]).start();
    },
    [cardScale]
  );

  const getRandomMethali = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    safeImpactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const filteredData = selectedCategory === "all"
      ? methaliData
      : methaliData.filter(item => item.category === selectedCategory);

    if (filteredData.length === 0) {
      Alert.alert("Hakuna Methali", "Hakuna methali zilizopatikana kwenye kundi hili");
      setIsAnimating(false);
      return;
    }

    // Optimized random selection with avoidance of immediate repeats
    let picked;
    if (filteredData.length === 1) {
      picked = filteredData[0];
    } else {
      // Get random index, but avoid the current one
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
  }, [isAnimating, selectedCategory]);

  const fadeOutAndSetMethali = useCallback((methali) => {
    // Fade out current content
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Update methali and animate in
      lastIdRef.current = methali.id;
      setCurrentMethali(methali);
      setIsFavorite(isFavoriteInStore(methali));

      // Scroll to top if needed
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }

      // Animate in after a short delay
      setTimeout(() => {
        animateIn();
        setIsAnimating(false);
      }, 100);
    });
  }, [fadeAnim, isFavoriteInStore]);

  const handleToggleFavorite = async () => {
    try {
      const willFavorite = !isFavorite;

      // Add visual feedback
      const animation = Animated.sequence([
        Animated.timing(cardScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }),
      ]);

      // Add haptic feedback
      safeImpactAsync(willFavorite
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium
      );

      // Start animation
      animation.start();

      // Update local state immediately for better UX
      setIsFavorite(willFavorite);

      // Save to favorites
      await toggleFavorite(currentMethali);

      // Show toast-like message
      // (In a real app, you might want to use a toast library here)
      if (willFavorite) {
        Alert.alert("Imepatikana!", "Methali imeongezwa kwenye favoriti zako");
      } else {
        Alert.alert("Imeondolewa", "Methali imeondolewa kwenye favoriti");
      }
    } catch (_) {
      // Revert state on error
      setIsFavorite(!isFavorite);
      Alert.alert("Tatizo", "Imeshindikana kuhifadhi favoriti. Jaribu tena.");
    }
  };

  const handleShare = async () => {
    try {
      // Add visual feedback
      animateCardPress({ toValue: 0.98, duration: 100 });

      await Share.share({
        message: `"${currentMethali.methali}"\n\nMaana: ${currentMethali.meaning}\n\nSomo: ${currentMethali.lesson}`,
      });
    } catch (_) {
      // no-op: best-effort share
    }
  };

  const onSpeak = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    Speech.speak(currentMethali.methali, {
      language: "sw", // Kiswahili
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    setIsSpeaking(true);
  };

  // Generate reflection/explanation for "Soma kwa Zaidi"
  const getReflection = useCallback((methali) => {
    if (!methali) return "";

    const reflections = {
      "Mvumilivu hula mbivu": "Dibaji hii inatukumbusha thamani ya subira katika maisha yetu. Mara nyingi tunataka matokeo haraka, lakini uhalisia ni kwamba mambo mazuri huchukua muda. Subira inatupa nafasi ya kujifunza, kukua, na kujenga msingi imara. Tunaposubiri kwa uvumilivu, tunapata matunda mazuri zaidi kuliko tunavyojaribu kukimbilia haraka. Hii ni hekima ya wazee ambayo inaweza kutuwezesha kuishi maisha yenye maana na amani.",
      "Asiyekujua hakujui": "Dibaji hii inasisitiza umuhimu wa kujitambulisha na kujulikana na watu. Tunapojitambulisha kwa watu, tunawapa fursa ya kukusaidia na kukuelewa. Hii si kujivuna, bali ni kujenga uhusiano wa kuaminiana. Watu hawawezi kukusaidia kama hawakujui wewe ni nani na unahitaji nini. Jitambulishe kwa ujasiri na uwe na ujasiri wa kuomba msaada unapohitaji.",
      "Haraka haraka haina baraka": "Dibaji hii inatukumbusha kwamba kufanya mambo kwa haraka mara nyingi huleta makosa na hasara. Tunapopiga haraka, hatuna muda wa kufikiria kwa kina au kuona picha kubwa. Baraka huja kwa kufanya mambo kwa makini na kwa makusudi. Kila jambo lina wakati wake, na kusubiri wakati ufaao ni busara, si woga. Fanya kila kitu kwa utulivu na uangalifu.",
      "Mgeni ni baraka": "Dibaji hii inasisitiza umuhimu wa kukaribisha wageni na kuwaonyesha heshima. Mgeni ni baraka kwa sababu anaweza kuleta maarifa mapya, fursa, na urafiki. Tunapomkaribisha mgeni, tunajenga uhusiano na kujenga jamii yenye nguvu. Hii ni desturi ya Kiswahili ambayo ina thamani kubwa katika kuishi pamoja kwa amani na upendo.",
      "Akili ni mali": "Dibaji hii inasisitiza kwamba akili ni mali ya thamani zaidi kuliko mali yoyote ya kidunia. Akili inaweza kutupa mafanikio makubwa zaidi kuliko mali. Tumia akili yako kwa busara, ujifunze kila siku, na uwe na uwezo wa kutatua matatizo. Akili ni kitu ambacho hakuna mtu anaweza kukuchukua, na ni mali ambayo inaweza kukukua zaidi unapoiendeleza.",
      "Kila mtu ana jambo lake": "Dibaji hii inatukumbusha kwamba kila mtu ana shida na matatizo yake. Usiwaonee wengine vibaya kwa sababu unajua sehemu ya maisha yao. Kila mtu ana safari yake ya maisha na changamoto zake. Tunaweza kuwa na huruma na kuelewa kwamba hatuwezi kujua kila kitu kuhusu maisha ya mtu mwingine. Hii inatupa nafasi ya kuwa na huruma na kusaidiana.",
      "Mwenye kazi hawezi kufa njaa": "Dibaji hii inasisitiza umuhimu wa kazi na bidii katika maisha. Mtu mwenye kazi na bidii hawezi kufa njaa kwa sababu kazi inamletea riziki. Hii si tu kuhusu kazi ya kazi, bali pia kuhusu kujitahidi katika kila jambo tunalofanya. Kazi na bidii ni njia ya kujipatia riziki na kufanikiwa katika maisha.",
      "Mkono mmoja haushindi kambi": "Dibaji hii inasisitiza umuhimu wa ushirikiano na kufanya kazi pamoja. Mtu mmoja hawezi kufanya kazi nyingi peke yake. Tunapofanya kazi pamoja, tunaweza kufikia mafanikio makubwa zaidi. Ushirikiano ni muhimu katika kuishi pamoja kwa amani na kufanikiwa. Hii ni hekima ambayo inaweza kutuwezesha kuishi maisha bora zaidi."
    };

    return reflections[methali.methali] || "Dibaji hii inatoa maarifa ya kina kuhusu kuishi maisha yenye maana. Chukua muda wa kufikiria jinsi inavyoweza kutumika katika safari yako ya maisha na uzoefu wako. Hekima ya wazee ni hazina ya thamani ambayo inaweza kutuwezesha kuishi maisha bora zaidi.";
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
  }, [isExpanded, currentMethali, expandAnim, expandOpacity]);

  const categories = ["Zote", ...new Set(methaliData.map(item => item.category))];

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
        // Reset to show a random methali from the new category
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
        color={selectedCategory === item.id ? '#FFFFFF' : '#64748B'}
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <ImageBackground
          source={METHALI_HEADER_IMAGE}
          style={styles.headerBackground}
          imageStyle={styles.headerBackgroundImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.25)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerText}>Methali za Kiswahili</Text>
                <Text style={styles.headerSubtext}>Busara na hekima kutoka kwa wazee</Text>
              </View>
              <TouchableOpacity
                style={styles.favoritesButton}
                onPress={() => navigation.navigate('Favorites')}
              >
                <Ionicons name="bookmark" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
              transform: [
                { scale: cardScale },
                { translateY: translateY }
              ]
            },
          ]}
        >
          {/* Card Header with Image - Hero Style */}
          <View style={styles.cardImageContainer}>
            <Image
              source={{ uri: currentMethali.image }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.5, 1]}
              style={styles.cardImageGradient}
            />
            <View style={styles.cardHeader}>
              <View style={styles.categoryBadge}>
                <Ionicons name="bookmark" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.categoryBadgeText}>{currentMethali.category}</Text>
              </View>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={handleToggleFavorite}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? "Ondoa kwenye favoriti" : "Ongeza kwenye favoriti"}
                accessibilityHint="Gonga kwa kubadilisha hali ya favoriti"
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorite ? "#EF4444" : "#FFFFFF"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            <Text style={styles.methaliText}>"{currentMethali.methali}"</Text>

            <View style={styles.divider} />

            <View style={styles.meaningContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book-outline" size={18} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Maana Yake</Text>
              </View>
              <Text style={styles.meaningText}>{currentMethali.meaning}</Text>
            </View>

            <View style={styles.lessonContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="library-outline" size={18} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Somo Linalofundishwa</Text>
              </View>
              <Text style={styles.lessonText}>{currentMethali.lesson}</Text>
            </View>

            {/* "Soma kwa Zaidi" Expandable Section */}
            <TouchableOpacity
              onPress={handleToggleExpand}
              style={styles.readMoreButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Soma kwa zaidi"
              accessibilityHint="Gonga kwa kupanua maelezo zaidi kuhusu methali hii"
            >
              <Text style={styles.readMoreText}>Soma kwa Zaidi</Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
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
                    outputRange: [0, 500],
                  }),
                  opacity: expandOpacity,
                },
              ]}
            >
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

            {/* Action Buttons */}
            <View style={styles.actions}>
              <AnimatedTouchable
                style={[styles.actionButton, styles.speakButton]}
                onPress={onSpeak}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={isSpeaking ? "Amesimama" : "Sikiliza methali"}
                accessibilityHint="Gonga kwa kusikiliza methali kwa sauti"
              >
                <Ionicons
                  name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>
                  {isSpeaking ? "Amesimama" : "Sikiliza"}
                </Text>
              </AnimatedTouchable>

              <View style={styles.actionDivider} />

              <AnimatedTouchable
                style={[styles.actionButton, styles.shareButton]}
                onPress={handleShare}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Shiriki methali"
                accessibilityHint="Gonga kwa kushiriki methali hii"
              >
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Shiriki</Text>
              </AnimatedTouchable>

              <View style={styles.actionDivider} />

              <AnimatedTouchable
                style={[styles.actionButton, styles.copyButton]}
                onPress={() => {
                  safeNotificationAsync(Haptics.NotificationFeedbackType.Success);
                  // Copy to clipboard logic would go here
                  Alert.alert("Imeingizwa kwenye ubao wa kunakili", currentMethali.methali);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Nakili methali"
                accessibilityHint="Gonga kwa kunakili methali hii"
              >
                <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Nakili</Text>
              </AnimatedTouchable>
            </View>
          </View>
        </Animated.View>

        {/* Next Button */}
        <AnimatedTouchable
          style={styles.nextButton}
          onPress={getRandomMethali}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Pata methali nyingine"
          accessibilityHint="Gonga kwa kupata methali nyingine ya nasaha"
        >
          <Text style={styles.nextButtonText}>Methali Nyingine</Text>
          <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </AnimatedTouchable>

        {/* Info Section */}
        <View style={styles.infoSection} accessibilityRole="text">
          <Ionicons name="library" size={24} color="#285D6C" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Methali za Kiswahili</Text>
            <Text style={styles.infoText}>
              Methali ni mifano ya usemi wa mazoea na hekima za watu. Zinasaidia kufundisha maadili,
              kutoa mawaidha, na kutoa mifano ya maisha ya kila siku.
            </Text>
          </View>
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
  // Header Styles
  headerContainer: {
    height: height * 0.22,
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
    paddingTop: (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 18,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  favoritesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  // Categories
  categoriesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoriesScroll: {
    paddingRight: 16,
  },
  categoryItem: {
    marginRight: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  categoryText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 240,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    paddingTop: 30,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  cardHeader: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  methaliText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meaningContainer: {
    marginBottom: 20,
  },
  meaningText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 26,
    marginLeft: 24,
  },
  lessonContainer: {
    marginBottom: 10,
  },
  lessonText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 26,
    fontStyle: 'italic',
    marginLeft: 24,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  readMoreText: {
    fontSize: 15,
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
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#285D6C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reflectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  reflectionText: {
    fontSize: 15,
    lineHeight: 26,
    color: '#4B5563',
    fontWeight: '400',
    textAlign: 'left',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  speakButton: {
    backgroundColor: '#285D6C',
  },
  shareButton: {
    backgroundColor: '#3B82F6',
  },
  copyButton: {
    backgroundColor: '#F0F9FF',
  },
  actionDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  nextButton: {
    backgroundColor: '#285D6C',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    fontWeight: '400',
  },
  methaliListContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 100,
  },
  listTitle: {
    color: "#285D6C",
    fontSize: 18,
    fontWeight: "700",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  methaliItemCategory: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
