import { fontScale, scaleSize } from '@/utils/scale';
import { VideoOff } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/** Shown in place of the camera feed while the Pi relay is unreachable or has no frames. */
export default function VideoPlaceholder({ style, connecting }: { style?: StyleProp<ViewStyle>; connecting: boolean }) {
  return (
    <View style={[style, styles.placeholder]} pointerEvents="none">
      <VideoOff size={scaleSize(28)} color="rgba(255,255,255,0.35)" />
      <Text style={styles.placeholderText}>{connecting ? 'CONNECTING TO CAMERA…' : 'NO VIDEO'}</Text>
      {!connecting && <Text style={styles.placeholderHint}>Join the Pi&apos;s hotspot to see the camera feed</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSize(6),
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: fontScale(12),
    fontWeight: '700',
    letterSpacing: 1,
  },
  placeholderHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: fontScale(11),
  },
});
