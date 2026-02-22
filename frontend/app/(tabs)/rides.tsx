import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, theme } from '../../src/config';
import { ridesService } from '../../src/services';
import { Ride } from '../../src/types';
import { useAuthStore } from '../../src/stores';


export default function RidesScreen() {
  const { token, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');

  useEffect(() => {
    if (token && isAuthenticated) {
      loadRides();
    }
  }, [filter, token, isAuthenticated]);


  const loadRides = async () => {
    try {
      setIsLoading(true);

      const status =
        filter === 'all' ? undefined : filter.toUpperCase();

      const rides = await ridesService.listMyRides(status);

      setRides(rides);

      console.log('✅ Loaded rides:', rides.length);
    } catch (error) {
      console.error('❌ Failed to load rides:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRides();
    setIsRefreshing(false);
  };

  const handleRidePress = (ride: Ride) => {
    // Navigate to ride detail
    router.push(`/ride/${ride.id}/summary`);
  };

  const getFilteredRides = () => {
    if (filter === 'all') return rides;
    if (filter === 'completed') return rides.filter(r => r.status === 'COMPLETED');
    if (filter === 'active') return rides.filter(r => r.status === 'ACTIVE');
    return rides;
  };

  const filteredRides = getFilteredRides();

  return (
    <View style={styles.container}>
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
        <View style={styles.header}>
          <Text style={styles.title}>My Rides</Text>
          <Text style={styles.subtitle}>Your ride history</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rides List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading rides...</Text>
          </View>
        ) : filteredRides.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No rides found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'all'
                ? 'Your rides will appear here'
                : `No ${filter} rides yet`}
            </Text>
          </View>
        ) : (
          <View style={styles.ridesContainer}>
            {filteredRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                onPress={() => handleRidePress(ride)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Ride Card Component
function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  const getStatusColor = () => {
    switch (ride.status) {
      case 'COMPLETED':
        return colors.success;
      case 'ACTIVE':
        return colors.primary;
      case 'CANCELLED':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = () => {
    switch (ride.status) {
      case 'COMPLETED':
        return '✓';
      case 'ACTIVE':
        return '▶';
      case 'CANCELLED':
        return '✕';
      default:
        return '○';
    }
  };

  const getStatusText = () => {
    switch (ride.status) {
      case 'COMPLETED':
        return 'Completed';
      case 'ACTIVE':
        return 'Active';
      case 'CANCELLED':
        return 'Cancelled';
      case 'CREATED':
        return 'Waiting';
      default:
        return ride.status;
    }
  };

  return (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rideCardHeader}>
        <View style={styles.rideCardTitleContainer}>
          <Text style={styles.rideCardTitle}>
            {ride.rideName || 'Unnamed Ride'}
          </Text>
          <Text style={styles.rideCardCode}>Code: {ride.rideCode}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
          </View>
          <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      <View style={styles.rideCardBody}>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {ride.pickupAddress
              ? ride.pickupAddress.split(',')[0]
              : `${ride.pickupLat?.toFixed(4)}, ${ride.pickupLng?.toFixed(4)}`}
          </Text>

        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>🚩</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {ride.destinationAddress
              ? ride.destinationAddress.split(',')[0]
              : `${ride.destinationLat?.toFixed(4)}, ${ride.destinationLng?.toFixed(4)}`}
          </Text>

        </View>
      </View>

      <View style={styles.rideCardStats}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📏</Text>
          <Text style={styles.statText}>
            {ride.routeDistance ? Math.round(ride.routeDistance / 1000) : 0} km
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statText}>
            {ride.routeDuration ? Math.round(ride.routeDuration / 60) : 0} min
          </Text>
        </View>

        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statText}>
            {new Date(ride.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      {ride.status === 'COMPLETED' && (
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
      )}
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSizes.lg,
    color: colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.background,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: theme.fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
    fontWeight: 'bold',
  },
  emptyStateSubtext: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ridesContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
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
    marginBottom: theme.spacing.md,
  },
  rideCardTitleContainer: {
    flex: 1,
  },
  rideCardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  rideCardCode: {
    fontSize: theme.fontSizes.sm,
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  statusIcon: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: theme.fontSizes.xs,
    fontWeight: '600',
  },
  rideCardBody: {
    marginBottom: theme.spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  locationText: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 8,
  },
  rideCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
  statText: {
    fontSize: theme.fontSizes.sm,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.surfaceLight,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginTop: theme.spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.success,
  },
});