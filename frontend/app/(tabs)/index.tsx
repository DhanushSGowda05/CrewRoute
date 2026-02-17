import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { colors, theme } from '../../src/config';
import { ridesService } from '../../src/services';
import { Ride } from '../../src/types';
import { useAuthStore } from '../../src/stores/authStore';

export default function HomeScreen() {
  const { token, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { user } = useUser();
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (token && isAuthenticated) {
      loadRecentRides();
    }
  }, [token, isAuthenticated]);


  const loadRecentRides = async () => {
    try {
      setIsLoading(true);
      const rides = await ridesService.listMyRides();
      setRides(rides.slice(0, 3));
      console.log('✅ Loaded rides:', rides.length);

    } catch (error) {
      console.error('❌ Failed to load rides:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRecentRides();
    setIsRefreshing(false);
  };

  const handleCreateRide = () => {
    router.push('/ride/create');
  };

  const handleJoinRide = () => {
    router.push('/ride/join');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>🏍️ CrewRoute</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Start ride for the ride</Text>
          <Text style={styles.heroSubtitle}>
            Group up and coordinate your journey
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Create Ride Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateRide}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.buttonIconText}>🏍️</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.primaryButtonTitle}>CREATE NEW RIDE</Text>
              <Text style={styles.primaryButtonSubtitle}>
                Plan a group ride
              </Text>
            </View>
            <Text style={styles.buttonArrow}>→</Text>
          </TouchableOpacity>

          {/* Join Ride Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleJoinRide}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.buttonIconText}>🔗</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.secondaryButtonTitle}>JOIN RIDE</Text>
              <Text style={styles.secondaryButtonSubtitle}>
                Enter 6-digit code
              </Text>
            </View>
            <Text style={styles.buttonArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Rides Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT RIDES</Text>
            {rides.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/rides')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : rides.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🏍️</Text>
              <Text style={styles.emptyStateText}>No rides yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first ride to get started
              </Text>
            </View>
          ) : (
            rides.map((ride) => <RideCard key={ride.id} ride={ride} />)
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            Signed in as: {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Ride Card Component
function RideCard({ ride }: { ride: Ride }) {
  const statusColor =
    ride.status === 'COMPLETED'
      ? colors.success
      : ride.status === 'ACTIVE'
        ? colors.primary
        : colors.textSecondary;

  const statusIcon =
    ride.status === 'COMPLETED'
      ? '✓'
      : ride.status === 'ACTIVE'
        ? '▶'
        : '○';

  return (
    <TouchableOpacity style={styles.rideCard} activeOpacity={0.7}>
      <View style={styles.rideCardHeader}>
        <Text style={styles.rideCardTitle}>
          {ride.rideName || 'Unnamed Ride'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusIcon}</Text>
        </View>
      </View>

      <View style={styles.rideCardBody}>
        <Text style={styles.rideCardInfo}>
          Code: {ride.rideCode}
        </Text>

        <View style={styles.rideCardStats}>
          <Text style={styles.rideCardStat}>
            {ride.route.distance}
          </Text>
          <Text style={styles.rideCardStat}>·</Text>
          <Text style={styles.rideCardStat}>
            {ride.route.duration}
          </Text>

        </View>
      </View>

      {/* Mini Route Visualization */}
      <View style={styles.miniRoute}>
        <View style={styles.miniRouteBar}>
          <View style={styles.miniRouteProgress} />
        </View>
      </View>

      <Text style={styles.rideCardDate}>
        {new Date(ride.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  logo: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  heroSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  heroTitle: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  buttonIconText: {
    fontSize: 24,
  },
  buttonContent: {
    flex: 1,
  },
  primaryButtonTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: colors.background,
    marginBottom: 2,
  },
  primaryButtonSubtitle: {
    fontSize: theme.fontSizes.sm,
    color: colors.background,
    opacity: 0.8,
  },
  secondaryButtonTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  secondaryButtonSubtitle: {
    fontSize: theme.fontSizes.sm,
    color: colors.textSecondary,
  },
  buttonArrow: {
    fontSize: 24,
    color: colors.background,
    marginLeft: theme.spacing.md,
  },
  recentSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: theme.fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  userInfo: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  userInfoText: {
    fontSize: theme.fontSizes.sm,
    color: colors.textTertiary,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: theme.fontSizes.sm,
    color: colors.primary,
  },
  rideCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rideCardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rideCardBody: {
    marginBottom: theme.spacing.md,
  },
  rideCardInfo: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  rideCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideCardStat: {
    fontSize: theme.fontSizes.sm,
    color: colors.textTertiary,
    marginRight: theme.spacing.xs,
  },
  miniRoute: {
    marginBottom: theme.spacing.sm,
  },
  miniRouteBar: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniRouteProgress: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.primary,
  },
  rideCardDate: {
    fontSize: theme.fontSizes.xs,
    color: colors.textTertiary,
  },
});