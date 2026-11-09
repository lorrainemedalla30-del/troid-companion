import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';

// Same palette as the login screen.
const COLORS = {
  primary: '#22228c',
  bg: '#1a2a6c',
  card: '#f2f2f2',
  text: '#1a1a2e',
  textSecondary: '#555',
};

/**
 * Shown when the app opens with a saved session: greets the operator while the
 * TROID server re-checks the account. The root layout moves on to the app (or
 * back to the login page if the account was signed out) when it's done.
 */
export default function WelcomeBackScreen() {
  const { operator } = useAuth();
  const name = operator?.name.trim() || operator?.email || '';

  return (
    <LinearGradient colors={[COLORS.bg, '#2a3a8c', '#1e2875']} style={styles.container}>
      <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.status}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.statusText}>Signing you in...</Text>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

/** "Juan Dela Cruz" -> "JC"; falls back to the first letter (e.g. of an email). */
function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 28,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
    elevation: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
