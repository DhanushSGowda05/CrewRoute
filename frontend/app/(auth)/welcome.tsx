import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors,theme } from '../../src/config';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🏍️</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>CrewRoute</Text>
        <Text style={styles.subtitle}>
          Ride Together, Stay Connected
        </Text>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="📍" text="Real-time Location Tracking" />
          <FeatureItem icon="🚨" text="Emergency Alerts" />
          <FeatureItem icon="👥" text="Group Coordination" />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(auth)/sign-in')}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          Ride safe. Ride together.
        </Text>
      </Animated.View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    backgroundColor: colors.primary,
    opacity: 0.1,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
    backgroundColor: colors.emergency,
    opacity: 0.05,
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  logoContainer: {
    marginBottom: theme.spacing.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  logoEmoji: {
    fontSize: 60,
  },
  title: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: theme.fontSizes.lg,
    color: colors.textSecondary,
    marginBottom: theme.spacing.xxl,
    textAlign: 'center',
  },
  features: {
    width: '100%',
    marginBottom: theme.spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  featureText: {
    fontSize: theme.fontSizes.md,
    color: colors.textPrimary,
    flex: 1,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  buttonText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: colors.background,
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: theme.fontSizes.sm,
    color: colors.textTertiary,
    marginTop: theme.spacing.xl,
  },
});