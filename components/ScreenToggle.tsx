import { scaleSize } from '@/utils/scale';
import { usePathname, useRouter } from 'expo-router';
import { Gamepad2, LayoutGrid } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

const s = scaleSize;
const SIZE = s(44);
const TOP_GAP = s(8);

/** Explore's background, so the circle hands over to that screen seamlessly. */
const EXPLORE_BG = '#EAF2F8';
const GROW_MS = 420;
const FADE_MS = 180;
/** Gives the new screen a moment to render under the circle before it's revealed. */
const SETTLE_MS = 60;

/**
 * Round button floating at the top middle of the screen that switches between
 * the ROV dashboard and Explore (landscape only; portrait has the tab bar).
 *
 * Going to Explore, a circle grows out of the button until it fills the
 * screen, then gives way to Explore. Coming back, the circle starts full
 * screen over Explore and shrinks back into the button, revealing the controls.
 */
export default function ScreenToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const onExplore = pathname === '/explore';
  const Icon = onExplore ? Gamepad2 : LayoutGrid;

  // 0 = circle the size of the button, 1 = circle covering the whole screen.
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [animating, setAnimating] = useState(false);

  // The circle is centred on the button; its radius reaches the farthest corner.
  const cx = width / 2;
  const cy = insets.top + TOP_GAP + SIZE / 2;
  const radius = Math.ceil(Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)));
  const minScale = SIZE / (radius * 2);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [minScale, 1]) }],
  }));

  const done = () => setAnimating(false);
  const goTo = (path: '/' | '/explore') => router.navigate(path);

  const openExplore = () => {
    progress.set(0);
    opacity.set(1);
    progress.set(withTiming(1, { duration: GROW_MS, easing: Easing.out(Easing.cubic) }, finished => {
      if (!finished) return;
      scheduleOnRN(goTo, '/explore');
      opacity.set(withDelay(SETTLE_MS, withTiming(0, { duration: FADE_MS }, () => {
        progress.set(0);
        scheduleOnRN(done);
      })));
    }));
  };

  const backToControls = () => {
    progress.set(1);
    opacity.set(1);
    goTo('/');
    progress.set(withDelay(SETTLE_MS, withTiming(0, { duration: GROW_MS, easing: Easing.in(Easing.cubic) }, () => {
      opacity.set(0);
      scheduleOnRN(done);
    })));
  };

  const onPress = () => {
    if (animating) return;
    setAnimating(true);
    if (onExplore) backToControls();
    else openExplore();
  };

  return (
    // Blocks touches only while the circle is animating.
    <View style={StyleSheet.absoluteFill} pointerEvents={animating ? 'auto' : 'box-none'}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.circle,
          {
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            left: cx - radius,
            top: cy - radius,
          },
          circleStyle,
        ]}
      />
      <View style={[styles.wrap, { top: insets.top + TOP_GAP }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onExplore ? 'Back to ROV controls' : 'Open Explore'}
          hitSlop={s(6)}
          onPress={onPress}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Icon size={s(20)} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    backgroundColor: EXPLORE_BG,
  },
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(11,18,32,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: s(6),
    shadowOffset: { width: 0, height: s(2) },
    elevation: 4,
  },
  buttonPressed: {
    backgroundColor: 'rgba(56,189,248,0.3)',
  },
});
