import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsLandscape } from '@/hooks/use-is-landscape';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = {
  primary: '#22228c',
  primaryHover: '#1a1a70',
  bg: '#1a2a6c',
  card: '#f2f2f2',
  text: '#1a1a2e',
  textSecondary: '#333',
  border: '#c7c7c7',
  link: '#2244cc',
  sealRed: '#c1272d',
  sealDark: '#1a1a6e',
  sealGreen: '#1a7a3c',
  gold: '#f5c518',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const isLandscape = useIsLandscape();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    if (password.length >= 4) {
      login(email);
      router.replace('/(tabs)');
    } else {
      Alert.alert('Invalid Credentials', 'Password must be at least 4 characters');
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.bg, '#2a3a8c', '#1e2875']} style={StyleSheet.absoluteFill}>
      {/* Android draws edge-to-edge, so it no longer shrinks the screen for the keyboard; padding
          lifts the form above it ('height' made the screen flicker on Android). */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingLeft: 24 + insets.left,
              paddingRight: 24 + insets.right,
              paddingTop: 16 + insets.top,
              paddingBottom: 16 + insets.bottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[styles.card, !isLandscape && styles.cardPortrait]}>
            <View style={[styles.brandPane, !isLandscape && styles.paneFull]}>
              <Seal />
              <Text style={styles.title}>
                City Environment and Natural Resources Office (CENRO) Aquatic Management System
              </Text>
            </View>

            <View style={isLandscape ? styles.paneDivider : styles.paneDividerPortrait} />

            <View style={[styles.formPane, !isLandscape && styles.paneFull]}>
              <View style={styles.form}>
                <View>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="username@troid.com"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLoading}
                  />
                </View>

                <View>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isLoading}
                    onSubmitEditing={handleLogin}
                  />
                </View>

                <Pressable
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>{isLoading ? 'Signing in...' : 'Login'}</Text>
                </Pressable>
              </View>

              <Pressable onPress={() => Alert.alert('Reset', 'Password reset flow')}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Seal() {
  return (
    <Svg width="96" height="96" viewBox="0 0 96 96">
      <Circle cx={48} cy={48} r={47} fill={COLORS.sealRed} />
      <Circle cx={48} cy={48} r={40} fill="#fff" />
      <Circle cx={48} cy={48} r={40} fill="none" stroke={COLORS.sealRed} strokeWidth={1.5} />
      <Circle cx={48} cy={48} r={34} fill={COLORS.sealDark} />
      <Circle cx={48} cy={48} r={27} fill="#fff" />
      <Circle cx={48} cy={48} r={27} fill="none" stroke={COLORS.sealGreen} strokeWidth={2} />

      <Path d="M48 38c-3-5-9-5-11-1c-2 4 1 8 11 16c10-8 13-12 11-16c-2-4-8-4-11 1z" fill={COLORS.sealRed} />
      <Circle cx={48} cy={34} r={3} fill={COLORS.gold} />

      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * 2 * Math.PI;
        const r = 30;
        const x = 48 + r * Math.sin(angle);
        const y = 48 - r * Math.cos(angle);
        return <Circle key={i} cx={x} cy={y} r={1.4} fill={COLORS.sealGreen} />;
      })}

      <Defs>
        <Path id="topArc" d="M 12 48 A 36 36 0 0 1 84 48" fill="none" />
        <Path id="bottomArc" d="M 18 66 A 32 32 0 0 0 78 66" fill="none" />
      </Defs>
      <SvgLinearGradient id="textGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#fff" />
        <Stop offset="100%" stopColor="#ddd" />
      </SvgLinearGradient>
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 640,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
    elevation: 10,
  },
  cardPortrait: {
    flexDirection: 'column',
    alignItems: 'stretch',
    maxWidth: 360,
    paddingVertical: 28,
  },
  brandPane: {
    flex: 1,
    alignItems: 'center',
    gap: 14,
  },
  paneFull: {
    flex: 0,
  },
  paneDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border,
    marginHorizontal: 28,
  },
  paneDividerPortrait: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  formPane: {
    flex: 1.15,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 21,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    fontSize: 14,
    color: COLORS.text,
  },
  button: {
    width: '100%',
    padding: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPassword: {
    color: COLORS.link,
    fontSize: 12.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'right',
    marginTop: 14,
  },
});
