import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { sampleArticles } from '../data/sampleArticles';

export default function MakalaScreen({ navigation }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadArticles = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setArticles(sampleArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadArticles();
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
          source={article.image}
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
            <Text style={styles.articleMeta}>{article.readTime}</Text>
            <View style={styles.dot} />
            <Text style={styles.articleMeta}>By {article.author}</Text>
          </View>
          <Text style={styles.articleDate}>{article.date}</Text>
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.articleExcerpt} numberOfLines={2}>
          {article.excerpt}
        </Text>
        <View style={styles.articleFooter}>
          <View style={styles.readMoreContainer}>
            <Text style={styles.readMore}>Soma zaidi</Text>
            <Ionicons name="arrow-forward" size={16} color="#285D6C" />
          </View>
          <TouchableOpacity style={styles.bookmarkButton}>
            <Ionicons name="bookmark-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#285D6C" barStyle="light-content" />

      <ImageBackground
        source={require('../assets/Conservancies-in-Kenya.-By-Kenya-Wildlife-Conservancies.jpg')}
        style={styles.headerBackground}
        imageStyle={styles.headerBackgroundImage}
        blurRadius={5}
      >
        <LinearGradient 
          colors={['rgba(40, 93, 108, 0.78)', 'rgba(40, 93, 108, 0.92)']} 
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextCard}>
              <Text style={styles.headerTitle}>Makala</Text>
              <Text style={styles.headerSubtitle}>Soma makala mbalimbali za kuelimisha</Text>
            </View>
            <TouchableOpacity style={styles.searchButton}>
              <Ionicons name="search" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Makala Mpya</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Angalia zote</Text>
            </TouchableOpacity>
          </View>
          
          {articles.length > 0 ? (
            <View style={styles.articlesGrid}>
              {articles.map(renderArticleCard)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={64} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>Hakuna makala</Text>
              <Text style={styles.emptyText}>Hakuna makala zilizopatikana kwa sasa</Text>
            </View>
          )}
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
  headerBackground: {
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerBackgroundImage: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextCard: {
    flex: 1,
    marginRight: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'System',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  seeAll: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
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
    fontSize: 12,
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
    fontSize: 12,
    color: '#94A3B8',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  articleExcerpt: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 22,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#285D6C',
    marginRight: 4,
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
