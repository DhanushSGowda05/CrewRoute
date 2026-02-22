import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Clipboard,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, theme } from '../../../src/config';
import { ridesService } from '../../../src/services';
import { socketService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores';
import { Ride, Participant } from '../../../src/types';

export default function WaitingRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [ride, setRide] = useState<Ride | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const isOwner = ride?.ownerId === user?.id;

  // Load ride data
  const loadRide = useCallback(async () => {
    try {
      const response = await ridesService.getRide(id);
      setRide(response.ride);

      // ✅ Initialize participants from API response
      if (response.ride.participants && response.ride.participants.length > 0) {
        const activeParticipants = response.ride.participants.filter(p => !p.leftAt);
        setParticipants(activeParticipants);
        console.log('👥 Loaded participants:', activeParticipants.length);
      } else {
        setParticipants([]);
      }

    } catch (err) {
      console.error('Failed to load ride:', err);
      Alert.alert('Error', 'Could not load ride details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Listen for ride cancellation
  useEffect(() => {
    if (ride?.status === 'CANCELLED') {
      Alert.alert(
        'Ride Cancelled',
        'This ride has been cancelled',
        [
          {
            text: 'OK',
            onPress: () => {
              socketService.leaveRide(id);
              router.replace('/(tabs)');
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [ride?.status]);

  // Connect WebSocket
  useEffect(() => {
    let mounted = true;

    const setupWebSocket = async () => {
      await loadRide();

      if (!mounted) return;

      // Connect socket
      await socketService.connect();

      // Small delay to ensure connection
      setTimeout(() => {
        if (!mounted) return;

        // Join ride room
        socketService.joinRide(id);

        // Listen for new participants
        socketService.onUserJoined((data) => {
          console.log('👤 User joined:', data.username);
          if (!mounted) return;

          setParticipants((prev) => {
            // Remove if already exists (avoid duplicates)
            const filtered = prev.filter(p => p.userId !== data.userId);
            // Add new participant
            return [
              ...filtered,
              {
                userId: data.userId,
                username: data.username,
                role: 'participant',
                joinedAt: data.joinedAt || new Date().toISOString(),
                leftAt: null,
              },
            ];
          });
        });

        // Listen for participants leaving
        socketService.onUserLeft((data) => {
          console.log('👋 User left:', data.username);
          if (!mounted) return;

          setParticipants((prev) => prev.filter(p => p.userId !== data.userId));
        });

        // Listen for ride started
        socketService.onRideStarted((data) => {
          console.log('🚀 Ride started!');
          if (!mounted) return;

          Alert.alert('Ride Started!', 'The ride has begun', [
            {
              text: 'OK',
              onPress: () => router.replace(`/ride/${id}/tracking`),
            },
          ]);
        });
      }, 500);
    };

    setupWebSocket();

    // Cleanup
    return () => {
      mounted = false;
      socketService.leaveRide(id);
    };
  }, [id]);

  // Auto-refresh every 3 seconds (backup for WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      loadRide();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadRide]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRide();
    setIsRefreshing(false);
  };

  const handleCopyCode = () => {
    if (ride?.rideCode) {
      Clipboard.setString(ride.rideCode);
      Alert.alert('Copied!', `Ride code ${ride.rideCode} copied to clipboard`);
    }
  };

  const handleShareCode = async () => {
    if (!ride?.rideCode) return;
    try {
      await Share.share({
        message: `Join my ride on CrewRoute!\n\nRide Code: ${ride.rideCode}\n\nOpen the CrewRoute app and enter this code to join.`,
        title: 'Join my CrewRoute ride',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleStartRide = async () => {
    if (!ride) return;

    Alert.alert(
      'Start Ride',
      `Start the ride with ${participants.length} rider${participants.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          style: 'default',
          onPress: async () => {
            setIsStarting(true);
            try {
              await ridesService.startRide(ride.id);
              console.log('✅ Ride started');
              // Navigation will happen via WebSocket event
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to start ride');
            } finally {
              setIsStarting(false);
            }
          },
        },
      ],
    );
  };

  const handleLeaveRide = () => {
    // Owner should cancel, participants should leave
    const actionText = isOwner ? 'Cancel Ride' : 'Leave Ride';
    const warningText = isOwner
      ? 'This will cancel the ride for everyone. Are you sure?'
      : 'Are you sure you want to leave this ride?';

    Alert.alert(
      actionText,
      warningText,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            try {
              if (isOwner) {
                // Owner cancels the ride
                await ridesService.cancelRide(id);
                console.log('🚫 Ride cancelled');
              } else {
                // Participant leaves
                await ridesService.leaveRide(id);
                console.log('👋 Left ride');
              }
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || `Failed to ${isOwner ? 'cancel' : 'leave'} ride`);
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ],
    );
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ride...</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Ride not found</Text>
      </View>
    );
  }

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleLeaveRide}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Waiting Room</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Ride Name */}
        {ride.rideName && (
          <Text style={styles.rideName}>{ride.rideName}</Text>
        )}

        {/* Code Section */}
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Share this code:</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{ride.rideCode}</Text>
          </View>

          {/* Copy/Share Buttons */}
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeActionButton} onPress={handleCopyCode}>
              <Text style={styles.codeActionIcon}>📋</Text>
              <Text style={styles.codeActionText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.codeActionButton} onPress={handleShareCode}>
              <Text style={styles.codeActionIcon}>📤</Text>
              <Text style={styles.codeActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <View style={styles.participantsHeader}>
            <Text style={styles.participantsTitle}>
              RIDERS JOINED ({participants.length})
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.participantsList}>
            {participants.length === 0 ? (
              <View style={styles.emptyParticipants}>
                <Text style={styles.emptyParticipantsIcon}>👥</Text>
                <Text style={styles.emptyParticipantsText}>
                  Waiting for riders to join...
                </Text>
              </View>
            ) : (
              participants.map((participant) => (
                <View key={participant.userId} style={styles.participantItem}>
                  <Text style={styles.participantIcon}>👤</Text>
                  <Text style={styles.participantName}>
                    {participant.username}
                    {participant.userId === user?.id && ' (You)'}
                    {participant.userId === ride.ownerId && ' (Owner)'}
                  </Text>
                  <Text style={styles.participantCheck}>✓</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Info Text */}
        {participants.length === 1 && isOwner && (
          <Text style={styles.infoText}>
            Share the ride code with your crew to get started!
          </Text>
        )}

        {/* Action Buttons - ONLY ONE PLACE */}
        <View style={styles.actionsSection}>
          {isOwner ? (
            <>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  participants.length < 1 && styles.startButtonDisabled,
                ]}
                onPress={handleStartRide}
                disabled={participants.length < 1 || isStarting}
                activeOpacity={0.8}
              >
                {isStarting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.startButtonText}>START RIDE →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleLeaveRide}
                disabled={isLeaving}
              >
                <Text style={styles.cancelButtonText}>
                  {isLeaving ? 'Cancelling...' : 'Cancel Ride'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveRide}
              disabled={isLeaving}
              activeOpacity={0.8}
            >
              {isLeaving ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.leaveButtonText}>Leave Ride</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: colors.textSecondary,
    fontSize: theme.fontSizes.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: theme.fontSizes.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  rideName: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  codeSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  codeBox: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 3,
    borderColor: colors.primary,
    minWidth: 280,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  codeActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  codeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  codeActionIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  codeActionText: {
    fontSize: theme.fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  participantsSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  participantsTitle: {
    fontSize: theme.fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: theme.spacing.xs,
  },
  liveText: {
    fontSize: theme.fontSizes.xs,
    color: colors.success,
    fontWeight: 'bold',
  },
  participantsList: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  participantIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },
  participantName: {
    flex: 1,
    fontSize: theme.fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  participantCheck: {
    fontSize: 18,
    color: colors.success,
  },
  emptyParticipants: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyParticipantsIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyParticipantsText: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoText: {
    fontSize: theme.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  actionsSection: {
    paddingHorizontal: theme.spacing.xl,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  startButtonDisabled: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.7,
  },
  startButtonText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: colors.background,
  },
  cancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSizes.md,
    color: colors.danger,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: colors.danger,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  leaveButtonText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});