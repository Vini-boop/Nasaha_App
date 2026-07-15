import React, { useLayoutEffect, useState } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import SuccessToast from '../components/SuccessToast';
import { apiFetch, ENDPOINTS, getNetworkImageUrl } from '../config/api';
import { Typography } from '../theme/typography';
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
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../theme/spacing";
import { moderateScale } from "../theme/metrics";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#285D6C';
const PRIMARY_DARK = '#1C3F4A';
const PRIMARY_LIGHT = '#3A7A8C';

export default function ArticleDetailScreen({ route, navigation }) {
  const { article } = route.params || {};
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [bookmarked, setBookmarked] = useState(false);
  
  // Likes & Comments state
  const [likesCount, setLikesCount] = useState(article?.likes || 0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchComments = async () => {
    if (!article?.id) return;
    try {
      const data = await apiFetch(`${ENDPOINTS.makala}/${article.id}/comments`);
      setComments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchComments();
  }, [navigation, article]);

  const handleLike = async () => {
    if (liked || !article?.id) return;
    setLiked(true);
    setLikesCount(prev => prev + 1);
    try {
      await fetch(`${import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/api/makala/${article.id}/like`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to like', e);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newCommentText.trim() || !article?.id) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/api/makala/${article.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: newCommentName || 'Msomaji',
          comment: newCommentText
        })
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments([newComment, ...comments]);
        setNewCommentText('');
        setToastMessage('Maoni yatumwa kikamilifu!');
        setToastVisible(true);
      }
    } catch (e) {
      console.error('Failed to comment', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Soma makala hii: "${article.title}" kwenye Nasaha App!\n\n${article.excerpt || ''}`,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  const openInBrowser = () => {
    if (article?.url) Linking.openURL(article.url);
  };

  if (!article) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />
        {/* Header */}
        <LinearGradient colors={[PRIMARY_DARK, PRIMARY]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Makala</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="document-text-outline" size={48} color={PRIMARY} />
          </View>
          <Text style={styles.errorTitle}>Makala Haipatikani</Text>
          <Text style={styles.errorText}>Samahani, makala hii haipo au imeondolewa.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar backgroundColor={PRIMARY_DARK} barStyle="light-content" />

      {/* ── HEADER ── */}
      <LinearGradient colors={[PRIMARY_DARK, PRIMARY]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {article?.category || 'Makala'}
        </Text>
        <TouchableOpacity style={styles.headerActionBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={{ alignSelf: 'center', width: Math.min(width, 768), paddingBottom: Spacing.xxl }}>
          {/* ── HERO IMAGE CARD ── */}
        <View style={styles.heroCard}>
          <Image
            source={{ uri: getNetworkImageUrl(article?.image) || 'https://placehold.co/400x260' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={styles.heroGradient}
          />

          {/* Bookmark pill */}
          <TouchableOpacity
            style={styles.bookmarkPill}
            onPress={() => setBookmarked(!bookmarked)}
          >
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? PRIMARY : '#FFFFFF'}
            />
          </TouchableOpacity>

          {/* Bottom meta row */}
          <View style={styles.heroMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color="#FFFFFF" />
              <Text style={styles.metaChipText}>{article?.readTime ? article.readTime.replace(/mins?/gi, 'Dakika').replace(/hours?|hrs?/gi, 'Saa') : '5 Dakika'}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={13} color="#FFFFFF" />
              <Text style={styles.metaChipText}>{article?.date || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* ── CONTENT CARD ── */}
        <View style={styles.contentCard}>

          {/* Category badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article?.category || 'Makala'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article?.title || 'Makala Isiyojulikana'}</Text>

          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.authorMeta}>
              <Text style={styles.authorName}>{article?.author || 'Mwandishi'}</Text>
              <Text style={styles.authorRole}>Mwandishi wa Makala</Text>
            </View>
            {/* Like pill */}
            <TouchableOpacity 
              style={[styles.likeChip, liked && styles.likeChipActive]}
              onPress={handleLike}
              disabled={liked}
            >
              <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? "#FFFFFF" : PRIMARY} />
              <Text style={[styles.likeChipText, liked && { color: '#FFFFFF' }]}>{likesCount} Likes</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Body text */}
          <Text style={styles.bodyText}>
            {article?.content || 'Hakuna maudhui ya makala.'}
          </Text>

          {/* ── CTA CARD ── */}
          <LinearGradient
            colors={[PRIMARY, PRIMARY_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaCard}
          >
            <Ionicons name="share-social" size={32} color="rgba(255,255,255,0.3)" style={styles.ctaBgIcon} />
            <Text style={styles.ctaTitle}>Je, makala hii imekusaidia?</Text>
            <Text style={styles.ctaSubtext}>Shiriki na marafiki wako ili wao pia wapate kufaidika</Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={16} color={PRIMARY} />
              <Text style={styles.ctaBtnText}>Shiriki Sasa</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ── COMMENTS SECTION ── */}
        <View style={styles.commentsContainer}>
          <Text style={styles.sectionTitle}>Maoni ({comments.length})</Text>
          
          <View style={styles.commentInputBox}>
            <TextInput
              style={styles.commentNameInput}
              placeholder="Jina lako (si lazima)"
              placeholderTextColor="#94A3B8"
              value={newCommentName}
              onChangeText={setNewCommentName}
            />
            <TextInput
              style={styles.commentTextInput}
              placeholder="Andika maoni yako hapa..."
              placeholderTextColor="#94A3B8"
              multiline
              value={newCommentText}
              onChangeText={setNewCommentText}
            />
            <TouchableOpacity 
              style={[styles.commentSubmitBtn, !newCommentText.trim() && { opacity: 0.5 }]} 
              onPress={handleCommentSubmit}
              disabled={submittingComment || !newCommentText.trim()}
            >
              {submittingComment ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.commentSubmitText}>Tuma Maoni</Text>}
            </TouchableOpacity>
          </View>

          {loadingComments ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
          ) : comments.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 10, marginBottom: 30 }}>Kuwa wa kwanza kutoa maoni!</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{c.user_name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.commentContentBox}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{c.user_name}</Text>
                    <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.comment}</Text>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.bottomAction} onPress={() => setLiked(!liked)}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? '#E11D48' : '#64748B'}
          />
          <Text style={styles.bottomActionText}>Penda</Text>
        </TouchableOpacity>

        <View style={styles.bottomDivider} />

        <TouchableOpacity style={styles.bottomAction} onPress={() => setBookmarked(!bookmarked)}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? PRIMARY : '#64748B'}
          />
          <Text style={styles.bottomActionText}>Hifadhi</Text>
        </TouchableOpacity>

        <View style={styles.bottomDivider} />

        <TouchableOpacity style={styles.bottomAction} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#64748B" />
          <Text style={styles.bottomActionText}>Shiriki</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.readMoreBtn} onPress={openInBrowser}>
          <Text style={styles.readMoreText}>Soma Zaidi</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <SuccessToast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F6',
  },

  /* ── HEADER ── */
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
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    marginHorizontal: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── SCROLL ── */
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  /* ── HERO ── */
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    height: 240,
    elevation: 6,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.18)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bookmarkPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  heroMeta: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  metaChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },

  /* ── CONTENT CARD ── */
  contentCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${PRIMARY}18`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  categoryText: {
    color: PRIMARY,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#1A2B35',
    lineHeight: 32,
    marginBottom: 16,
  },

  /* ── AUTHOR ── */
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorMeta: { flex: 1 },
  authorName: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: '#1A2B35',
  },
  authorRole: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#94A3B8',
    marginTop: 1,
  },
  likeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  likeChipActive: {
    backgroundColor: PRIMARY,
  },
  likeChipText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: PRIMARY,
  },

  divider: {
    height: 1,
    backgroundColor: '#EEF2F5',
    marginBottom: 16,
  },

  bodyText: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#334155',
    lineHeight: 26,
    marginBottom: 28,
  },

  /* ── RELATED ── */
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: '#1A2B35',
    marginBottom: 14,
  },
  relatedImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  relatedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  relatedTitle: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    lineHeight: 18,
    margin: 12,
  },

  /* ── COMMENTS ── */
  commentsContainer: {
    marginHorizontal: 16,
    marginBottom: 40,
  },
  commentInputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.06)',
  },
  commentNameInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F5',
    paddingVertical: 8,
    marginBottom: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#1A2B35',
  },
  commentTextInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'Nunito_400Regular',
    color: '#334155',
    marginBottom: 12,
  },
  commentSubmitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  commentSubmitText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  commentContentBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    elevation: 1,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontFamily: 'Nunito_700Bold',
    color: '#1A2B35',
    fontSize: 14,
  },
  commentDate: {
    fontFamily: 'Nunito_400Regular',
    color: '#94A3B8',
    fontSize: 12,
  },
  commentText: {
    fontFamily: 'Nunito_400Regular',
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },

  /* ── CTA ── */
  ctaCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  ctaBgIcon: {
    position: 'absolute',
    right: -10,
    top: -10,
    fontSize: 80,
  },
  ctaTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  ctaSubtext: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  ctaBtnText: {
    color: PRIMARY,
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },

  /* ── BOTTOM BAR ── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EEF2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    elevation: 12,
    boxShadow: '0px -2px 6px rgba(0, 0, 0, 0.08)',
    
    
    
  },
  bottomAction: {
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 2,
  },
  bottomActionText: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
    color: '#64748B',
    marginTop: 2,
  },
  bottomDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8EEF2',
    marginHorizontal: 4,
  },
  readMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    marginLeft: 12,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  readMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },

  /* ── ERROR STATE ── */
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${PRIMARY}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#1A2B35',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
