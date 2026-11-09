import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetworkConnection from '@/components/NetworkConnection';
import { fontScale, scaleSize } from '@/utils/scale';

const s = scaleSize;
const f = fontScale;

/** The Wi-Fi Connection panel as a pop-up, opened from the Home screen. */
export default function NetworkConnectionModal({
  visible,
  onClose,
  isLandscape,
}: {
  visible: boolean;
  onClose: () => void;
  isLandscape: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // iOS locks modals to portrait unless told otherwise.
      supportedOrientations={['portrait', 'landscape']}
    >
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: s(16) + insets.top,
            paddingBottom: s(16) + insets.bottom,
            paddingLeft: s(16) + insets.left,
            paddingRight: s(16) + insets.right,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Connect to Wi-Fi</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <NetworkConnection isLandscape={isLandscape} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '100%',
    backgroundColor: '#EAF2F8',
    borderRadius: s(18),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    backgroundColor: '#0B1220',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: f(15),
    fontWeight: '800',
  },
  closeButton: {
    paddingHorizontal: s(10),
    paddingVertical: s(4),
  },
  closeText: {
    color: '#38bdf8',
    fontSize: f(12),
    fontWeight: '800',
  },
  content: {
    padding: s(12),
  },
});
