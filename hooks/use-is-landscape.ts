import { useWindowDimensions } from 'react-native';

/** True when the window is wider than it is tall. Re-renders on rotation. */
export function useIsLandscape() {
  const { width, height } = useWindowDimensions();
  return width > height;
}
