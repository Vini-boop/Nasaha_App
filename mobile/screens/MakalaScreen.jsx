import React, { useState, useEffect } from 'react';
import { Typography } from '../theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, ENDPOINTS, getNetworkImageUrl } from '../config/api';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../theme/spacing";
import { moderateScale } from "../theme/metrics";

export default function MakalaScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { notification } = usePushNotifications();

  // Watch for real-time incoming notifications (e.g. new makala added)
  useEffect(() => {
    if (notification) {
      loadArticles(true);
    }
  }, [notification]);

  const loadArticles = async (bypassCache = false) => {
    try {
      setLoading(true);
      const data = await apiFetch(ENDPOINTS.makala, {
        bypassCache,
        onUpdate: (freshData) => {
          setArticles(freshData);
          if (refreshing) setRefreshing(false);
        }
      });
      setArticles(data);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadArticles(true);
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const renderArticleCard = (article) => (
    <TouchableOpacity
      key={article.id}
      style={styles.articleCard}
      onPress={() => navigation.navigate('ArticleDetail', { article })}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={typeof article.image === 'string' ? { uri: getNetworkImageUrl(article.image) } : article.image}
          style={styles.articleImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{article.category}</Text>
        </View>
      </View>
      <View style={styles.articleContent}>
        <View style={styles.articleHeader}>
          <View style={styles.metaContainer}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.articleMeta}>{article.readTime ? article.readTime.replace(/mins?/gi, 'Dakika').replace(/hours?|hrs?/gi, 'Saa') : ''}</Text>
            <View style={styles.dot} />
            <Text style={styles.articleMeta}>{article.author}</Text>
          </View>
          <View style={styles.dot} />
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.articleExcerpt} numberOfLines={2}>
          {article.excerpt}
        </Text>
        <View style={styles.articleFooter}>
          <View style={styles.readMoreContainer}>
            <Text style={styles.readMore}>Soma zaidi</Text>
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          </View>
          <TouchableOpacity style={styles.bookmarkButton}>
            <Ionicons name="bookmark-outline" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#285D6C" barStyle="light-content" />

      {/* TOP NAV BAR */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {isSearchActive ? (
            <TextInput
              style={styles.searchInput}
              placeholder="Tafuta makala..."
              placeholderTextColor="#A0D1DD"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
          ) : (
            <Text style={styles.topBarTitle}>Tusome</Text>
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#285D6C" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#285D6C']}
              tintColor="#285D6C"
            />
          }
        >
          <View style={{ alignSelf: 'center', width: Math.min(width, 768), paddingHorizontal: Spacing.md }}>
            {/* Hero Card */}
            <View style={styles.heroCard}>
            <ImageBackground
              source={require('../assets/makala_hero.jpg')}
              style={styles.heroBackground}
              imageStyle={styles.heroBackgroundImage}
              blurRadius={0}
            >
              <LinearGradient
                colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.8)']}
                style={styles.heroGradient}
              >
                <Text style={styles.heroTitle}>Makala</Text>
                <Text style={styles.heroSubtitle}>Soma makala mbalimbali za kuelimisha</Text>
              </LinearGradient>
            </ImageBackground>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Makala Mpya</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Angalia zote</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            const filteredArticles = articles.filter(article => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return article.title.toLowerCase().includes(q) || article.excerpt.toLowerCase().includes(q);
            });
            return filteredArticles.length > 0 ? (
              <View style={styles.articlesGrid}>
                {filteredArticles.map(renderArticleCard)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={64} color="#E2E8F0" />
                <Text style={styles.emptyTitle}>Hakuna makala</Text>
                <Text style={styles.emptyText}>Hakuna makala zilizopatikana kwa sasa</Text>
              </View>
            );
          })()}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#285D6C',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    ...Typography.body,
    marginLeft: 10,
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
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 180,
    marginBottom: 24,
  },
  heroBackground: {
    width: '100%',
    height: '100%',
  },
  heroBackgroundImage: {
    borderRadius: 24,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroTitle: {
    ...Typography.title,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFFFFF',
    fontSize: 32,
    marginBottom: 4,
  },
  heroSubtitle: {
    ...Typography.caption,
    fontFamily: 'Nunito_600SemiBold',
    color: '#E2E8F0',
  },
  contentContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.heading,
    fontFamily: 'Nunito_700Bold',
    color: '#285D6C',
    fontSize: 22,
  },
  seeAll: {
    color: '#92400E',
    ...Typography.caption,
    fontFamily: 'Nunito_700Bold',
  },
  articlesGrid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: {
    ...Typography.heading,
    fontFamily: 'Nunito_600SemiBold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...Typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    
    
    
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    transform: [{ translateY: 0 }],
  },
  imageContainer: {
    height: 160,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    ...Typography.tiny,
    fontFamily: 'Nunito_700Bold',
    color: '#285D6C',
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  articleContent: {
    padding: 16,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  articleMeta: {
    ...Typography.tiny,
    color: '#64748B',
    marginLeft: 4,
    marginRight: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    marginHorizontal: 6,
  },
  articleDate: {
    ...Typography.tiny,
    color: '#94A3B8',
  },
  articleTitle: {
    ...Typography.heading,
    fontFamily: 'Nunito_700Bold',
    color: '#285D6C',
    fontSize: 20,
    marginBottom: 10,
    lineHeight: 28,
  },
  articleExcerpt: {
    ...Typography.body,
    fontFamily: 'Georgia',
    color: '#475569',
    marginBottom: 16,
    lineHeight: 24,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMore: {
    ...Typography.body,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#0F172A',
    marginRight: 8,
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
