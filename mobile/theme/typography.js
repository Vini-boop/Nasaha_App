/**
 * typography.js — NasahaApp central typography system
 *
 * Font: Nunito (Google Fonts via @expo-google-fonts/nunito)
 * Load fonts in App.js with useFonts() before using these tokens.
 */

import { moderateScale } from './metrics';

// ─── Font Family Names ────────────────────────────────────────────────────────
export const Fonts = {
  regular:   'Nunito_400Regular',
  semiBold:  'Nunito_600SemiBold',
  bold:      'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
};

// ─── Type Scale ───────────────────────────────────────────────────────────────
export const Typography = {
  display: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(28, 0.3),
    lineHeight: moderateScale(36, 0.3),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(22, 0.3),
    lineHeight: moderateScale(30, 0.3),
  },
  heading: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18, 0.3),
    lineHeight: moderateScale(26, 0.3),
  },
  subheading: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(16, 0.3),
    lineHeight: moderateScale(24, 0.3),
  },
  bodyLarge: {
    fontFamily: Fonts.regular,
    fontSize: moderateScale(16, 0.3),
    lineHeight: moderateScale(24, 0.3),
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: moderateScale(15, 0.3),
    lineHeight: moderateScale(23, 0.3),
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: moderateScale(13, 0.3),
    lineHeight: moderateScale(20, 0.3),
  },
  tiny: {
    fontFamily: Fonts.regular,
    fontSize: moderateScale(12, 0.3),
    lineHeight: moderateScale(18, 0.3),
  },
  // Semantic shortcuts
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(13, 0.3),
    lineHeight: moderateScale(20, 0.3),
  },
  button: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(15, 0.3),
    lineHeight: moderateScale(22, 0.3),
  },
};
