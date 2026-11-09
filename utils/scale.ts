import { Dimensions } from 'react-native';

const window = Dimensions.get('window');

// The app rotates, but this is only read once at startup, so derive the scale
// from the long/short sides to get the same sizes in either orientation.
const SCREEN_WIDTH = Math.max(window.width, window.height);
const SCREEN_HEIGHT = Math.min(window.width, window.height);

// Design baseline: a 375x812 phone (expressed as long side x short side).
const guidelineBaseWidth = 812;
const guidelineBaseHeight = 375;

const scale = Math.min(SCREEN_WIDTH / guidelineBaseWidth, SCREEN_HEIGHT / guidelineBaseHeight);

const moderateFactor = 0.5;

export const scaleSize = (size: number): number => {
  return Math.round(size + (size * scale - size) * moderateFactor);
};

export const fontScale = (size: number): number => {
  return Math.round(size + (size * scale - size) * moderateFactor);
};

export const verticalScale = (size: number): number => {
  const heightScale = SCREEN_HEIGHT / guidelineBaseHeight;
  return Math.round(size + (size * heightScale - size) * moderateFactor);
};

export { SCREEN_WIDTH, SCREEN_HEIGHT, scale };
