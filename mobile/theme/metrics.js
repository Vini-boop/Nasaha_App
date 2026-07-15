import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Standard mobile device width (e.g., iPhone 11/12/13/14 Pro is ~390-393, iPhone SE is 375)
const baseWidth = 375;

/**
 * A basic scaling utility for values that don't need to be reactive to rotation
 * (e.g., base typography that should be slightly larger on tablets).
 * For true responsiveness (like width/height), use `useWindowDimensions()` directly in components.
 */
export const scale = (size) => (width / baseWidth) * size;
export const verticalScale = (size) => (height / 812) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export const Metrics = {
  screenWidth: width,
  screenHeight: height,
  // Define what we consider a tablet (typically > 600 or 768)
  isTablet: width >= 768,
  // Max width for content on tablets to avoid stretching
  tabletMaxWidth: 768,
  // Breakpoint for switching layouts
  tabletBreakpoint: 768,
};
