import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Share,
  Image,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  RefreshControl,
  Animated,
  Alert,
  Dimensions,
  ImageBackground,
  SafeAreaView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProverbsData } from "../hooks/useProverbsData";
import { useFavorites } from "../context/FavoritesContext";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const MORNING_BACKGROUND_IMAGE = require("../assets/kiswahili_chetu.jpg"); // Replace with morning image
const AFTERNOON_BACKGROUND_IMAGE = require("../assets/kiswahili_chetu.jpg"); // Replace with afternoon image
const NIGHT_BACKGROUND_IMAGE = require("../assets/kiswahili_chetu.jpg"); // Replace with night/evening image
const DIBAJI_CARD_IMAGE = require("../assets/mpanze-yako-yatimizwe.webp");

export default function HomeScreen({ navigation }) {
  const { proverbs, loading: proverbsLoading, error: proverbsError, reload: reloadProverbs } = useProverbsData();
  const { favorites, isFavorite: isFavoriteInStore, toggleFavorite } = useFavorites();

  // Daily proverbs state
  const [dailyProverbs, setDailyProverbs] = useState({ morning: null, afternoon: null, night: null });
  const [currentDay, setCurrentDay] = useState(1);
  const [currentTimePeriod, setCurrentTimePeriod] = useState('morning');
  const [isReshuffleAvailable, setIsReshuffleAvailable] = useState(false);
  const [lastReshuffleDay, setLastReshuffleDay] = useState(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [isNewWeek, setIsNewWeek] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnglish, setIsEnglish] = useState(false);
  const [isLoadingNew, setIsLoadingNew] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const cardScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const expandOpacity = useRef(new Animated.Value(0)).current;
  const lastIndexRef = useRef(-1);
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
    // Collapse expanded section when proverb changes
    if (isExpanded) {
      setIsExpanded(false);
      expandAnim.setValue(0);
      expandOpacity.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Get current time period based on hour
  const getTimePeriod = useCallback(() => {
  const hour = new Date().getHours();
   if (hour >= 5 && hour < 12) return 'morning';
   if (hour >= 12 && hour < 17) return 'afternoon';
   return 'night';
  }, []);

  // Get background image based on time period
  const getBackgroundImage = () => {
  const timePeriod = getTimePeriod();
  switch(timePeriod) {
   case 'morning': return MORNING_BACKGROUND_IMAGE;
   case 'afternoon': return AFTERNOON_BACKGROUND_IMAGE;
   case 'night': return NIGHT_BACKGROUND_IMAGE;
   default: return MORNING_BACKGROUND_IMAGE;
  }
 };

  // Get day of week (1-7)
  const getDayOfWeek = useCallback(() => {
  const day = new Date().getDay();
   return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
  }, []);

  // Load daily proverbs from AsyncStorage or generate new ones
  const loadDailyProverbs = useCallback(async () => {
    try {
    const today = getDayOfWeek();
    const timePeriod = getTimePeriod();
      
     setCurrentDay(today);
     setCurrentTimePeriod(timePeriod);
      
    const storedDate = await AsyncStorage.getItem('dailyProverbsDate');
    const storedDay = parseInt(await AsyncStorage.getItem('dailyProverbsDay') || '0');
    const storedProverbs = await AsyncStorage.getItem('dailyProverbs');
    const storedReshuffleDay = await AsyncStorage.getItem('lastReshuffleDay');
    const storedWeekNumber = parseInt(await AsyncStorage.getItem('weekNumber') || '1');
    const storedWeekStartDate = await AsyncStorage.getItem('weekStartDate');
      
      // Calculate current week number based on start date
    const todayDate = new Date();
      let weekStartDate = storedWeekStartDate ? new Date(storedWeekStartDate) : new Date();
      
      // If no week start date exists, set it to the most recent Monday
    if (!storedWeekStartDate) {
     const dayOfWeek = weekStartDate.getDay();
     const diff = weekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
       weekStartDate.setDate(diff);
       weekStartDate.setHours(0, 0, 0, 0);
       await AsyncStorage.setItem('weekStartDate', weekStartDate.toISOString());
     }
      
      // Calculate days since week start
    const diffTime = todayDate.getTime() - weekStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNum = Math.floor(diffDays / 7) + 1;
      
     setWeekNumber(currentWeekNum);
      
      // Check if it's a new week (7 days have passed) or new day
    if (!storedDate || !storedProverbs || storedDay !== today || diffDays >= 7) {
        // New week or new day - generate fresh proverbs
     const newProverbs = {
         morning: proverbs[Math.floor(Math.random() * proverbs.length)],
         afternoon: proverbs[Math.floor(Math.random() * proverbs.length)],
         night: proverbs[Math.floor(Math.random() * proverbs.length)]
       };
       
       await AsyncStorage.setItem('dailyProverbsDate', new Date().toDateString());
       await AsyncStorage.setItem('dailyProverbsDay', today.toString());
       await AsyncStorage.setItem('dailyProverbs', JSON.stringify(newProverbs));
       await AsyncStorage.setItem('weekNumber', currentWeekNum.toString());
       
       // Reset week if 7 days passed
     if (diffDays >= 7) {
     const newWeekStartDate = new Date();
     const dayOfWeek = newWeekStartDate.getDay();
     const diff = newWeekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
         newWeekStartDate.setDate(diff);
         newWeekStartDate.setHours(0, 0, 0, 0);
         await AsyncStorage.setItem('weekStartDate', newWeekStartDate.toISOString());
       setIsNewWeek(true);
       setTimeout(() => setIsNewWeek(false), 3000);
       }
       
     setDailyProverbs(newProverbs);
     setCurrentIndex(proverbs.indexOf(newProverbs[timePeriod]));
       
       // Reset reshuffle availability for new day/week
     if (today === 3) {
       setIsReshuffleAvailable(true);
       setLastReshuffleDay(null);
       } else {
       setIsReshuffleAvailable(false);
       }
     } else {
       // Same day - load stored proverbs
     const parsed = JSON.parse(storedProverbs);
      setDailyProverbs(parsed);
      setCurrentIndex(proverbs.indexOf(parsed[timePeriod]));
       
       // Check if reshuffle is available (only on day 3, and not yet done)
     if (storedDay === 3 && storedReshuffleDay !== '3') {
       setIsReshuffleAvailable(true);
       }
     }
      
    if (storedReshuffleDay) {
      setLastReshuffleDay(parseInt(storedReshuffleDay));
     }
    } catch (error) {
   console.log('Error loading daily proverbs:', error);
      // Fallback to random proverb
   const randomIndex = Math.floor(Math.random() * proverbs.length);
    setCurrentIndex(randomIndex);
    }
  }, [proverbs, getDayOfWeek, getTimePeriod]);

  useEffect(() => {
    if (Platform.OS === "android" && LayoutAnimation && typeof LayoutAnimation.configureNext === "function") {
      // Enable layout animations on Android for smoother transitions
      // @ts-ignore - RN older types may not include this property
      if (Platform.OS === "android" && global?.UIManager?.setLayoutAnimationEnabledExperimental) {
        // @ts-ignore
        global.UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
    loadUserData();
  }, []);

  // Load daily proverbs when component mounts and proverbs are ready
  useEffect(() => {
    if (!proverbsLoading && proverbs && proverbs.length > 0) {
      loadDailyProverbs();
    }
  }, [proverbsLoading, proverbs, loadDailyProverbs]);

  const loadUserData = async () => {
    try {
      const savedName = await AsyncStorage.getItem("userName");
      if (savedName) setUserName(savedName);
    } catch (error) {
      console.log("Error loading user data:", error);
    }
  };

  const proverb = useMemo(() => proverbs[currentIndex], [currentIndex, proverbs]);
  const isFavorite = useMemo(() => isFavoriteInStore(proverb), [isFavoriteInStore, proverb]);
  const displayText = useMemo(() => {
    if (!proverb) return "";
    return isEnglish && proverb.enText ? proverb.enText : `“${proverb.text}”`;
  }, [isEnglish, proverb]);
  const displayMeaning = useMemo(() => {
    if (!proverb) return "";
    return isEnglish && proverb.enMeaning ? proverb.enMeaning : proverb.meaning;
  }, [isEnglish, proverb]);

  // Generate reflection/explanation for "Soma kwa Zaidi" with life examples
  const getReflection = useCallback((proverb) => {
    if (!proverb) return "";

   const reflections = {
      sw: {
        "Kuna Mungu Eeeh, anaabudiwa.": {
         reflection: "Dibaji hii inatukumbusha umuhimu wa kuweka Mungu katika katikati ya maisha yetu. Tunapomweka Mungu mbele, tunapata nguvu na mwongozo katika maamuzi yetu. Hii si tu dini, bali ni mfumo wa maadili unaoweza kutuwezesha kuishi kwa amani na kujiamini.",
          example: "Mfano: Biashara yako inakwama, unaweza kuswali na kuomba mwongozo wa Mungu badala ya kukata tamaa. Au unapopata mafanikio makubwa, kumshukuru Mungu kunakukumbusha kuwa sio kwa nguvu zako pekee."
        },
        "Wanetu eeh tuwe na subira.": {
         reflection: "Subira ni silaha muhimu katika safari ya maisha. Mara nyingi tunataka matokeo haraka, lakini uhalisia ni kwamba mambo mazuri huchukua muda. Subira inatupa nafasi ya kufikiria kwa kina, kujifunza kutoka kwa makosa.",
          example: "Mfano: Unajenga nyumba, huwezi kukaa madirisha na milango kabla ya msingi kuwa imara. Vilevile, elimu au biashara inahitaji muda - miaka 4 ya chuo kikuu au miezi 6 ya mpango wa biashara kabla ya faida."
        },
        "Wanetu eeh tuwe na tuwe na Ukiasi.": {
         reflection: "Ukiasi ni kufahamu kile unachoweza kukifanya na kile ambacho hakifai. Ni kujua mipaka yako na kuishi ndani yake kwa furaha. Hii inatupa amani ya roho na kuepuka msongo.",
          example: "Mfano: Unapopata mishahara mingi, usijaribu kuishi kama tajiri. Fanya bajeti, akiba, na uishi kadiri ya kipato chako. Au usijilinganishe na wengine kwenye mitandao - kila mtu ana safari yake."
        },
        "Haba na haba hujaza kibaba.": {
         reflection: "Mafanikio makubwa huanza na hatua ndogo. Kila siku, kila juhudi ndogo inaongeza thamani kwenye lengo lako. Usiogope kuanza kidogo - hata mwamba mkubwa unaweza kuvunjika kwa matone ya maji.",
          example: "Mfano: Akiba ya shillingi 1000 kwa siku ni shillingi 365,000 kwa mwaka. Kusoma kurasa 5 kwa siku kunakamilisha vitabu vingi mwakani. Mabadiliko madogo ya kila siku yanaleta tofauti kubwa."
        },
        "Haraka haraka haina baraka.": {
         reflection: "Kufanya mambo kwa haraka mara nyingi huleta makosa. Tunapopiga haraka, hatuna muda wa kufikiria kwa kina au kuona picha kubwa. Baraka huja kwa kufanya mambo kwa makini na kwa makusudi.",
          example: "Mfano: Mwanafunzi anasoma usiku wa manane kabla ya mtihani - anapita maswali muhimu. Mjenzi anajenga haraka - ukuta unapasuka. Lakini mpanda mbao anavuna baada ya msimu mzima wa uvumilivu."
        },
        "Bandu bandu humaliza gogo.": {
         reflection: "Kazi kubwa haionekani kubwa tunapoigawanya katika sehemu ndogo. Kila hatua inachukuliwa kwa makini, na hatimaye gogo lote linamalizika. Hakuna kazi kubwa sana kwa mwenye nia na uvumilivu.",
          example: "Mfano: Kuandika riwaya - andika ukurasa 1 kwa siku, baada ya mwaka una kitabu! Kulipa deni - lipa kidogo kila mwezi, hatimaye umemaliza. Safari ndefu huanza na hatua moja."
        }
      },
      en: {
        "There is God, He is worshiped.": {
         reflection: "This wisdom reminds us of the importance of placing God at the center of our lives. When we put God first, we gain strength and guidance in our decisions. This is not just religion, but a value system that enables us to live in peace.",
          example: "Example: When your business struggles, you can pray for guidance instead of giving up. Or when you achieve success, thanking God reminds you it's not by your strength alone."
        },
        "Let us be patient.": {
         reflection: "Patience is an important tool in life's journey. Often we want quick results, but the reality is that good things take time. Patience gives us the opportunity to think deeply and learn from mistakes.",
          example: "Example: Building a house - you can't install windows before the foundation is solid. Similarly, education or business takes time - 4 years of university or months of business planning before profit."
        },
        "Let us be content and moderate.": {
         reflection: "Moderation is knowing what you can do and what doesn't fit. It's knowing your limits and living within them with joy. This gives us peace of mind and avoids stress.",
          example: "Example: When you earn a good salary, don't try to live like a millionaire. Budget, save, and live within your means. Or don't compare yourself to others on social media - everyone has their own journey."
        },
        "Little by little fills the measure.": {
         reflection: "Great successes start with small steps. Every day, every small effort adds value to your goal. Don't be afraid to start small - even a large rock can be broken by water drops.",
          example: "Example: Saving 1000 shillings daily is 365,000 shillings yearly. Reading 5 pages daily completes many books in a year. Small daily changes create big differences."
        },
        "Haste has no blessing.": {
         reflection: "Doing things in haste often leads to mistakes. When we rush, we don't have time to think deeply or see the big picture. Blessings come from doing things carefully and purposefully.",
          example: "Example: A student crams all night before an exam - they miss key questions. A builder builds quickly - the wall cracks. But the farmer harvests after a full season of patience."
        },
        "Little by little finishes the log.": {
         reflection: "A big task doesn't seem big when we divide it into small parts. Each step is taken carefully, and eventually the whole log is finished. There is no task too big for a person with intention.",
          example: "Example: Writing a novel - write 1 page daily, after a year you have a book! Paying debt - pay a little each month, eventually it's gone. A long journey begins with one step."
        }
      }
    };

   const key = isEnglish ? proverb.enText : proverb.text;
   const reflectionSet = isEnglish ? reflections.en : reflections.sw;

   const reflection = reflectionSet[key];
    
    if (reflection) {
     return `${reflection.reflection}\n\n${reflection.example}`;
    }
    
   return isEnglish
      ? "This wisdom offers deep insights into living a meaningful life. Take time to reflect on how it applies to your own journey and experiences.\n\nExample: Consider how small consistent actions in your daily routine can lead to significant positive changes over time."
      : "Dibaji hii inatoa maarifa ya kina kuhusu kuishi maisha yenye maana. Chukua muda wa kufikiria jinsi inavyoweza kutumika katika safari yako ya maisha na uzoefu wako.\n\nMfano: Fikiria jinsi vitendo vidogo vya kila siku vinavyoweza kuleta mabadiliko makubwa chanya kadiri muda unavyokwenda.";
  }, [isEnglish]);

  const handleToggleExpand = useCallback(() => {
    if (!proverb) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  }, [isExpanded, proverb, expandAnim, expandOpacity]);

  useEffect(() => {
    if (proverbsLoading) return;
    if (!Array.isArray(proverbs) || proverbs.length === 0) return;

    setCurrentIndex((prev) => {
      if (prev >= 0 && prev < proverbs.length) return prev;
      const next = Math.floor(Math.random() * proverbs.length);
      lastIndexRef.current = next;
      return next;
    });
  }, [proverbs, proverbsLoading]);

  // Handle reshuffling daily proverbs (available on day 3)
  const handleReshuffleDaily = useCallback(async () => {
    if (!proverbs || proverbs.length === 0 || currentDay !== 3) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoadingNew(true);
    
    try {
      // Generate new random proverbs for all periods
     const newProverbs = {
        morning: proverbs[Math.floor(Math.random() * proverbs.length)],
        afternoon: proverbs[Math.floor(Math.random() * proverbs.length)],
        night: proverbs[Math.floor(Math.random() * proverbs.length)]
      };
      
      await AsyncStorage.setItem('dailyProverbs', JSON.stringify(newProverbs));
      await AsyncStorage.setItem('lastReshuffleDay', '3');
      
      setDailyProverbs(newProverbs);
      setCurrentIndex(proverbs.indexOf(newProverbs[currentTimePeriod]));
      setIsReshuffleAvailable(false);
      setLastReshuffleDay(3);
      
      Alert.alert(
        "Imefanikiwa!",
        "Dibaji za leo zimeshashushwa upya!",
        [{ text: "Sawa", onPress: () => setIsLoadingNew(false) }]
      );
    } catch (error) {
     console.log('Error reshuffling:', error);
      Alert.alert("Tatizo", "Imeshindikana kureshufli. Jaribu tena.");
      setIsLoadingNew(false);
    }
  }, [proverbs, currentDay, currentTimePeriod]);

  // Switch between time periods
  const switchToTimePeriod = useCallback((period) => {
    if (!dailyProverbs[period]) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentIndex(proverbs.indexOf(dailyProverbs[period]));
    setCurrentTimePeriod(period);
  }, [dailyProverbs, proverbs]);

  const animateCardPress = useCallback(
    ({ toValue = 0.98, duration = 100 } = {}) => {
      Animated.sequence([
        Animated.timing(cardScale, { toValue, duration, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }),
      ]).start();
    },
    [cardScale]
  );

  const getNextIndex = useCallback(
    (current, length) => {
      if (length <= 1) return 0;
      let next = current;
      let guard = 0;
      while (next === current && guard < 10) {
        next = Math.floor(Math.random() * length);
        guard += 1;
      }
      return next;
    },
    []
  );

  const fadeOutAndSetProverb = useCallback((nextIndex) => {
    // Fade out current content
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Update proverb and animate in
      setCurrentIndex(nextIndex);
      lastIndexRef.current = nextIndex;

      // Scroll to top if needed
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }

      // Animate in after a short delay
      setTimeout(() => {
        animateIn();
        setIsLoadingNew(false);
      }, 100);
    });
  }, [fadeAnim]);

  const handleNewProverb = useCallback(() => {
    if (isLoadingNew || proverbsLoading || !proverbs || proverbs.length === 0) return;

    setIsLoadingNew(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateCardPress({ toValue: 0.97, duration: 120 });

    const next = getNextIndex(currentIndex, proverbs.length);
    fadeOutAndSetProverb(next);
  }, [currentIndex, isLoadingNew, proverbsLoading, proverbs, fadeOutAndSetProverb]);

  const handleToggleFavorite = async () => {
    try {
      if (!proverb) return;

     const willFavorite = !isFavorite;
      // Add visual feedback
      animateCardPress({ toValue: 0.98, duration: 100 });

      // Save to favorites
      await toggleFavorite(proverb);

      if (willFavorite) {
        Alert.alert("Imepatikana!", "Nasaha imeongezwa kwenye favoriti zako");
      } else {
        Alert.alert("Imeondolewa", "Nasaha imeondolewa kwenye favoriti");
      }
    } catch (_) {
      Alert.alert("Tatizo", "Imeshindikana kuhifadhi favoriti. Jaribu tena.");
    }
  };

  // Get time period display name
  const getTimePeriodName = (period) => {
    switch(period) {
      case 'morning': return 'Asubuhi';
      case 'afternoon': return 'Mchana';
      case 'night': return 'Usiku';
      default: return '';
    }
  };

  // Get appropriate greeting based on time period
  const getTimePeriodGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Natumai asubuhi yako imeanza vyema";
  if (hour < 17) return "Natumai mchana wako unaendelea vizuri";
  return "Natumai jioni yako imekuwa tulivu";
 };

  // Get background gradient colors based on time
  const getTimeBasedGradient = () => {
  const hour = new Date().getHours();
  
  // Morning (5 AM - 12 PM): Warm sunrise colors
 if (hour < 12) {
  return ['rgba(255,183,77,0.6)', 'rgba(255,138,101,0.4)', 'rgba(255,112,67,0.3)'];
  }
  // Afternoon (12 PM - 5 PM): Bright daylight colors
 if (hour < 17) {
  return ['rgba(66,165,245,0.5)', 'rgba(33,150,243,0.3)', 'rgba(30,136,229,0.2)'];
  }
  // Evening/Night (5 PM onwards): Deep twilight colors
 return ['rgba(49,27,146,0.7)', 'rgba(26,35,126,0.5)', 'rgba(13,71,161,0.3)'];
 };

  const handleShare = async () => {
    try {
      if (!proverb) return;
      // Add visual feedback
      animateCardPress({ toValue: 0.98, duration: 100 });
      await Share.share({
        message: `${isEnglish ? (proverb.enText || proverb.text) : proverb.text}\n\n${isEnglish ? "Meaning" : "Maana"}: ${isEnglish ? (proverb.enMeaning || proverb.meaning) : proverb.meaning}\n— ${proverb.source}`,
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
    if (!proverb) return;
    const textToSpeak = isEnglish ? (proverb.enText || proverb.text) : proverb.text;
    Speech.speak(textToSpeak, {
      language: isEnglish ? "en-US" : "sw", // Kiswahili
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    setIsSpeaking(true);
  };

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    handleNewProverb();
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* New Week Alert Banner */}
      {isNewWeek && (
        <View style={styles.newWeekBanner}>
          <Ionicons name="celebrate" size={24} color="#FFFFFF" />
          <Text style={styles.newWeekBannerText}>Wiki Mpya Imeanza! Baraka Mpya!</Text>
          <TouchableOpacity onPress={() => setIsNewWeek(false)}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Header with Gradient Overlay */}
      <View style={styles.headerContainer}>
        <ImageBackground
         source={getBackgroundImage()}
          style={styles.headerBackground}
          imageStyle={styles.headerBackgroundImage}
         resizeMode="cover"
        >
          <LinearGradient
         colors={getTimeBasedGradient()}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>{getTimePeriodGreeting()}</Text>
                {!!userName && <Text style={styles.userName}>{userName}</Text>}
              </View>
              
              {/* Day Counter */}
              <View style={styles.dayCounterContainer}>
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                <Text style={styles.dayCounterText}>Siku {currentDay}/7 • Wiki {weekNumber}</Text>
              </View>

            </View>
            <Text style={styles.headerTitle}>Nasaha ya Leo</Text>
          </LinearGradient>
        </ImageBackground>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#285D6C']}
            tintColor="#285D6C"
          />
        }
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Main Wisdom Card */}
        <Animated.View
          style={[
            styles.mainCard,
            {
              transform: [
                { scale: cardScale },
                { translateY: translateY }
              ],
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Card Header with Image - Hero Style */}
          <View style={styles.cardImageContainer}>
            <Image
              source={DIBAJI_CARD_IMAGE}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.5, 1]}
              style={styles.cardImageGradient}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  Dibaji za {getTimePeriodName(currentTimePeriod)} - Siku {currentDay} (Wiki {weekNumber})
                </Text>
                {/* Time Period Selector */}
                <View style={styles.timePeriodSelector}>
                  <TouchableOpacity
                    onPress={() => switchToTimePeriod('morning')}
                    style={[
                      styles.timePeriodBtn,
                      currentTimePeriod === 'morning' && styles.timePeriodBtnActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={currentTimePeriod === 'morning' ? 'sunny' : 'sunny-outline'} 
                      size={16} 
                     color={currentTimePeriod === 'morning' ? '#F59E0B' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.timePeriodText,
                      currentTimePeriod === 'morning' && styles.timePeriodTextActive
                    ]}>Asubuhi</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => switchToTimePeriod('afternoon')}
                    style={[
                      styles.timePeriodBtn,
                      currentTimePeriod === 'afternoon' && styles.timePeriodBtnActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={currentTimePeriod === 'afternoon' ? 'partly-sunny' : 'partly-sunny-outline'} 
                      size={16} 
                     color={currentTimePeriod === 'afternoon' ? '#F97316' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.timePeriodText,
                      currentTimePeriod === 'afternoon' && styles.timePeriodTextActive
                    ]}>Mchana</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => switchToTimePeriod('night')}
                    style={[
                      styles.timePeriodBtn,
                      currentTimePeriod === 'night' && styles.timePeriodBtnActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={currentTimePeriod === 'night' ? 'moon' : 'moon-outline'} 
                      size={16} 
                     color={currentTimePeriod === 'night' ? '#6366F1' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.timePeriodText,
                      currentTimePeriod === 'night' && styles.timePeriodTextActive
                    ]}>Usiku</Text>
                  </TouchableOpacity>
                </View>

                {/* Reshuffle Button - Only available on Day 3 */}
                {currentDay === 3 && isReshuffleAvailable && (
                  <TouchableOpacity
                    onPress={handleReshuffleDaily}
                    style={styles.reshuffleButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.reshuffleText}>Reshufli Dibaji</Text>
                  </TouchableOpacity>
                )}
                
                {currentDay === 3 && lastReshuffleDay === 3 && (
                  <View style={styles.reshuffleDoneBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.reshuffleDoneText}>Imeshushwa Upya</Text>
                  </View>
                )}

                <View style={styles.languageToggle}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsEnglish(false);
                    }}
                    style={[styles.langButton, !isEnglish && styles.langButtonActive]}
                  >
                    <Text style={[styles.langText, !isEnglish && styles.langTextActive]}>SW</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsEnglish(true);
                    }}
                    style={[styles.langButton, isEnglish && styles.langButtonActive]}
                  >
                    <Text style={[styles.langText, isEnglish && styles.langTextActive]}>EN</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.cardContent}>
            {proverbsLoading ? (
              <View style={styles.centeredInfo}>
                <ActivityIndicator size="large" color="#285D6C" />
              </View>
            ) : proverbsError ? (
              <View style={styles.centeredInfo}>
                <Ionicons name="warning-outline" size={40} color="#EF4444" style={styles.errorIcon} />
                <Text style={styles.errorInlineText}>{proverbsError}</Text>
                <TouchableOpacity
                  style={styles.retryInlineButton}
                  onPress={reloadProverbs}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryInlineText}>
                    <Ionicons name="refresh" size={14} color="#FFFFFF" />  Jaribu Tena
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.wisdomText}>{displayText}</Text>
                <View style={styles.meaningContainer}>
                  <View style={styles.meaningIcon}>
                    <Ionicons name="bulb-outline" size={20} color="#4B5563" />
                  </View>
                  <Text style={styles.meaningText}>{displayMeaning}</Text>
                </View>

                {/* "Soma kwa Zaidi" Expandable Section */}
                <TouchableOpacity
                  onPress={handleToggleExpand}
                  style={styles.readMoreButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isEnglish ? "Read more" : "Soma kwa zaidi"}
                >
                  <Text style={styles.readMoreText}>
                    {isEnglish ? "Read More" : "Soma kwa Zaidi"}
                  </Text>
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
                      <Ionicons name="library-outline" size={20} color="#285D6C" />
                      <Text style={styles.reflectionTitle}>
                        {isEnglish ? "Reflection" : "Tafakari"}
                      </Text>
                    </View>
                    <Text style={styles.reflectionText}>
                      {getReflection(proverb)}
                    </Text>
                  </View>
                </Animated.View>

                <View style={styles.sourceContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.sourceText}>
                    <Ionicons name="bookmark-outline" size={12} color="#6B7280" /> {proverb?.source}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleToggleFavorite();
              }}
              style={[styles.actionBtn, styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
              accessibilityRole="button"
              accessibilityLabel="Penda nasaha"
              disabled={proverbsLoading || !!proverbsError || !proverb}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
              color={isFavorite ? "#DC2626" : "#970404ff"}
              />
              <Text style={[
                styles.actionBtnText,
                isFavorite && styles.actionBtnTextActive
              ]}>
                {isFavorite ? "Imependwa" : "Penda"}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionButtonsDivider} />

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSpeak();
              }}
              style={[styles.actionBtn, styles.speakBtn]}
              accessibilityRole="button"
              accessibilityLabel="Soma kwa sauti"
              disabled={proverbsLoading || !!proverbsError || !proverb}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSpeaking ? "volume-high" : "volume-medium"}
                size={22}
                color="#285D6C"
              />
              <Text style={styles.actionBtnText}>
                {isSpeaking ? "Inasikika..." : "Sikiliza"}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionButtonsDivider} />

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleShare();
              }}
              style={[styles.actionBtn, styles.shareBtn]}
              accessibilityRole="button"
              accessibilityLabel="Shiriki nasaha"
              disabled={proverbsLoading || !!proverbsError || !proverb}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={22} color="#285D6C" />
              <Text style={styles.actionBtnText}>Shiriki</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateY }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={handleNewProverb}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Nasaha mpya"
          disabled={proverbsLoading || !!proverbsError || !proverb}
          activeOpacity={0.8}
        >
          {isLoadingNew ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  newWeekBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    zIndex: 1000,
  },
  newWeekBannerText: {
  color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  headerContainer: {
    height: height * 0.25,
    backgroundColor: '#285D6C',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
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
    paddingBottom: 30,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  contentContainer: {
    paddingBottom: 120,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  dayCounterContainer: {
    position: 'absolute',
    right: 20,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dayCounterText: {
   color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
    gap: 10,
  },
  timePeriodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 10,
  },
  timePeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  timePeriodBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  timePeriodText: {
   color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  timePeriodTextActive: {
   color: '#285D6C',
  },
 reshuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 10,
  },
 reshuffleText: {
   color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
 reshuffleDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 10,
  },
 reshuffleDoneText: {
   color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  langButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  langButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  langText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  langTextActive: {
    color: '#285D6C',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    marginBottom: 20,
  },
  cardImageContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    padding: 20,
    paddingTop: 30,
    justifyContent: 'flex-end',
  },
  cardContent: {
    padding: 20,
  },
  wisdomText: {
    fontSize: 22,
    lineHeight: 32,
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  meaningContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  meaningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  meaningText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    fontWeight: '400',
  },
  sourceContainer: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  sourceText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'right',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
    marginBottom: 8,
  },
  reflectionContainer: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: '#285D6C',
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reflectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  reflectionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    fontWeight: '400',
    textAlign: 'left',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  actionButtonsDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  favoriteBtn: {
    backgroundColor: '#FEF2F2',
  },
  favoriteBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  speakBtn: {
    backgroundColor: '#F0F9FF',
  },
  shareBtn: {
    backgroundColor: '#F5F3FF',
  },
  actionBtnText: {
    marginLeft: 8,
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnTextActive: {
    color: '#DC2626',
  },
  centeredInfo: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorInlineText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryInlineButton: {
    backgroundColor: '#285D6C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryInlineText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickActionLeft: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    paddingLeft: 16,
  },
  quickActionRight: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingRight: 16,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '400',
  },
  quickActionArrow: {
    marginLeft: 'auto',
  },
  quickActionsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 0,
    zIndex: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#285D6C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 24,
  },
});
