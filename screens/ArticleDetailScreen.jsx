import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  StatusBar,
  Linking,
  useWindowDimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ArticleDetailScreen({ route, navigation }) {
  const { article } = route.params || {};
  const { width } = useWindowDimensions();
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Soma "${article.title}" kwenye Nasaha App: ${article.url || 'https://example.com'}`,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  const openInBrowser = () => {
    if (article.url) {
      Linking.openURL(article.url);
    }
  };

  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#285D6C" barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Makala</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
          <Text style={styles.errorTitle}>Makala Haipatikani</Text>
          <Text style={styles.errorText}>Samahani, makala hii haipo au imeondolewa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{article?.category || 'Makala'}</Text>
        <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
          <Ionicons name="share-social" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Article Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: article?.image || 'https://placehold.co/400x300' }} 
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          
          {/* Floating Meta */}
          <View style={styles.floatingMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#FFFFFF" />
              <Text style={styles.metaText}>{article?.readTime || '5 min'} kusoma</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.metaText}>{article?.date || 'N/A'}</Text>
            </View>
          </View>
        </View>
        
        {/* Article Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{article?.title || 'Makala Isiyojulikana'}</Text>
          
          {/* Author Info */}
          <View style={styles.authorContainer}>
            <View style={styles.authorAvatar}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{article?.author || 'Mwandishi Asiyejulikana'}</Text>
              <Text style={styles.authorRole}>Mwandishi wa Makala</Text>
            </View>
            <TouchableOpacity style={styles.bookmarkButton}>
              <Ionicons name="bookmark-outline" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          
          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.contentText}>
              {article?.content || 'Hakuna maudhui ya makala'}
              {'\n\n'}
              Hii ni sehemu ya ziada ya maandishi ambayo inaweza kupanuliwa zaidi kwa maelezo zaidi kuhusu mada husika. Makala hii inalenga kukuwezesha kufahamu zaidi kuhusu {(article?.title || 'makala').toLowerCase()} na jinsi inavyoweza kukusaidia katika maisha yako ya kila siku.
              {'\n\n'}
              Kumbuka kuwa mada hii inaweza kupanuliwa zaidi kwa maelezo zaidi na mifano halisi kutoka kwa wataalamu na watafiti wa fani hii.
            </Text>
            
            {/* Related Articles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Makala Zinazohusiana</Text>
              <View style={styles.relatedArticles}>
                {[1, 2].map((item) => (
                  <TouchableOpacity key={item} style={styles.relatedArticle}>
                    <Image 
                      source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1932&q=80' }} 
                      style={styles.relatedImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.relatedTitle} numberOfLines={2}>
                      {item === 1 ? 'Mambo Muhimu Kuhusu Utamaduni Wetu' : 'Jinsi ya Kujenga Jamii Bora'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Call to Action */}
            <View style={styles.ctaContainer}>
              <Text style={styles.ctaTitle}>Je, makala hii imekusaidia?</Text>
              <Text style={styles.ctaText}>Shiriki na marafiki wako ili wao pia wapate kufaidika</Text>
              <TouchableOpacity style={styles.ctaButton} onPress={handleShare}>
                <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.ctaButtonText}>Shiriki Sasa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.likeContainer}>
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="thumbs-up-outline" size={20} color="#64748B" />
              <Text style={styles.likeText}>Thumbs Up</Text>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#64748B" />
              <Text style={styles.likeText}>Maoni</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.readButton} onPress={openInBrowser}>
            <Text style={styles.readButtonText}>Soma Zaidi</Text>
            <Ionicons name="open-outline" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    paddingBottom: 100,
  },
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Image Section
  imageContainer: {
    height: 300,
    position: 'relative',
    marginBottom: 24,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  floatingMeta: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  // Content
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: 24,
    paddingBottom: 40,
  },
  articleBody: {
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  // Author
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  authorRole: {
    fontSize: 12,
    color: '#94A3B8',
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Article Content
  contentText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#334155',
    marginBottom: 24,
  },
  
  // Sections
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  
  // Related Articles
  relatedArticles: {
    flexDirection: 'row',
    marginHorizontal: -8,
    marginTop: 8,
  },
  relatedArticle: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  relatedImage: {
    width: '100%',
    height: 100,
  },
  relatedTitle: {
    padding: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    lineHeight: 20,
  },
  
  // CTA Section
  ctaContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#285D6C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 8,
  },
  likeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#64748B',
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  readButton: {
    flexDirection: 'row',
    backgroundColor: '#285D6C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  readButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Back Button
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
