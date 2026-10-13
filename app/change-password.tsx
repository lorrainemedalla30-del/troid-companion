import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, PASSWORD_RULES } from '@/utils/troid-api';

// Same palette as the login screen.
const COLORS = {
  primary: '#22228c',
  bg: '#1a2a6c',
  card: '#f2f2f2',
  text: '#1a1a2e',
  textSecondary: '#333',
  border: '#c7c7c7',
  link: '#2244cc',
  error: '#c1272d',
  ok: '#1a7a3c',
  muted: '#888',
};

/**
 * Shown after signing in with the temporary password an admin created or reset
 * the account with; the operator sets their own password before using the app.
 */
export default function ChangePasswordScreen() {
  const { operator, hasTemporaryPassword, changePassword, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetsRules = PASSWORD_RULES.every(rule => rule.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSave = meetsRules && matches && (hasTemporaryPassword || currentPassword.length > 0) && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      // The root layout opens the app once the password is changed.
      await changePassword(newPassword, hasTemporaryPassword ? undefined : currentPassword);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.bg, '#2a3a8c', '#1e2875']} style={StyleSheet.absoluteFill}>
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
          <View style={styles.card}>
            <Text style={styles.title}>Set your password</Text>
            <Text style={styles.subtitle}>
              {operator?.name ? `Welcome, ${operator.name}. ` : ''}Your account has a temporary password. Choose
              your own password to continue.
            </Text>

            <View style={styles.form}>
              {!hasTemporaryPassword && (
                <View>
                  <Text style={styles.label}>Temporary password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="From your email"
                    placeholderTextColor="#999"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!isSaving}
                  />
                </View>
              )}

              <View>
                <Text style={styles.label}>New password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor="#999"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isSaving}
                />
              </View>

              <View style={styles.rules}>
                {PASSWORD_RULES.map(rule => (
                  <Rule key={rule.label} label={rule.label} met={rule.test(newPassword)} />
                ))}
              </View>

              <View>
                <Text style={styles.label}>Confirm new password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type it again"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isSaving}
                  onSubmitEditing={handleSave}
                />
              </View>
              {confirmPassword.length > 0 && !matches && <Text style={styles.error}>The passwords don&apos;t match.</Text>}
              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable style={[styles.button, !canSave && styles.buttonDisabled]} onPress={handleSave} disabled={!canSave}>
                <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save password'}</Text>
              </Pressable>
            </View>

            <Pressable onPress={logout} disabled={isSaving}>
              <Text style={styles.link}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Rule({ label, met }: { label: string; met: boolean }) {
  return (
    <View style={styles.rule}>
      <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={met ? COLORS.ok : COLORS.muted} />
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
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
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
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
  rules: {
    gap: 4,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 12.5,
    color: COLORS.muted,
  },
  ruleTextMet: {
    color: COLORS.ok,
  },
  error: {
    color: COLORS.error,
    fontSize: 12.5,
    fontWeight: '600',
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
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  link: {
    color: COLORS.link,
    fontSize: 12.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'right',
    marginTop: 14,
  },
});
