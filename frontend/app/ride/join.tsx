import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Clipboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, theme } from '../../src/config';
import { ridesService } from '../../src/services';

export default function JoinRideScreen() {
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);

    const [code, setCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Auto-focus input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    // Auto-submit when 6 characters
    useEffect(() => {
        if (code.length === 6 && !isJoining) {
            handleJoinRide();
        }
    }, [code]);

    const handleCodeChange = (text: string) => {
        // Only allow alphanumeric, max 6 chars, auto-uppercase
        const cleaned = text
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6);
        setCode(cleaned);
    };

    const handlePasteFromClipboard = async () => {
        try {
            const clipboardContent = await Clipboard.getString();
            if (clipboardContent) {
                handleCodeChange(clipboardContent);
            }
        } catch (err) {
            Alert.alert('Error', 'Could not read clipboard');
        }
    };

    const handleJoinRide = async () => {
        if (code.length !== 6) {
            Alert.alert('Invalid Code', 'Ride code must be 6 characters');
            return;
        }

        setIsJoining(true);
        try {
            const response = await ridesService.joinRide(code);
            console.log('✅ Joined ride:', response.ride.id);

            // Navigate to waiting room
            router.replace(`/ride/${response.ride.id}/waiting`);
        } catch (err: any) {
            console.error('Failed to join ride:', err);

            const errorMessage = err?.response?.data?.message || 'Invalid ride code or ride not found';

            Alert.alert('Join Failed', errorMessage, [
                { text: 'Try Again', onPress: () => setCode('') },
            ]);
        } finally {
            setIsJoining(false);
        }
    };

    const canJoin = code.length === 6 && !isJoining;

    // Split code into individual boxes
    const codeBoxes = Array(6)
        .fill('')
        .map((_, i) => code[i] || '');

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Join Ride</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>🔗</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Enter Ride Code</Text>
                    <Text style={styles.subtitle}>
                        Ask the ride owner for the 6-character code
                    </Text>

                    {/* Code Display (Visual Boxes) */}
                    <View style={styles.codeBoxesContainer}>
                        {codeBoxes.map((char, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.codeBox,
                                    char && styles.codeBoxFilled,
                                    index === code.length && styles.codeBoxActive,
                                ]}
                            >
                                <Text style={styles.codeBoxText}>{char}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Hidden Input (triggers keyboard) */}
                    <TextInput
                        ref={inputRef}
                        style={styles.hiddenInput}
                        value={code}
                        onChangeText={handleCodeChange}
                        maxLength={6}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardType="default"
                        returnKeyType="done"
                        editable={!isJoining}
                    />

                    {/* Tap to type hint */}
                    {code.length === 0 && (
                        <TouchableOpacity
                            style={styles.tapToTypeHint}
                            onPress={() => inputRef.current?.focus()}
                        >
                            <Text style={styles.tapToTypeText}>Tap to type code</Text>
                        </TouchableOpacity>
                    )}

                    {/* Format Example */}
                    <Text style={styles.formatExample}>Format: ABC123</Text>

                    {/* Paste Button */}
                    <TouchableOpacity
                        style={styles.pasteButton}
                        onPress={handlePasteFromClipboard}
                        disabled={isJoining}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.pasteButtonIcon}>📋</Text>
                        <Text style={styles.pasteButtonText}>Paste from Clipboard</Text>
                    </TouchableOpacity>

                    {/* Join Button */}
                    <TouchableOpacity
                        style={[styles.joinButton, !canJoin && styles.joinButtonDisabled]}
                        onPress={handleJoinRide}
                        disabled={!canJoin}
                        activeOpacity={0.8}
                    >
                        {isJoining ? (
                            <ActivityIndicator color={colors.background} size="small" />
                        ) : (
                            <Text style={styles.joinButtonText}>
                                {code.length === 6 ? 'JOIN RIDE →' : `Enter ${6 - code.length} more characters`}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Clear Button */}
                    {code.length > 0 && !isJoining && (
                        <TouchableOpacity style={styles.clearButton} onPress={() => setCode('')}>
                            <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                    )}

                    {/* Bottom padding for keyboard */}
                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
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
    content: {
        flex: 1,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xxl,
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    icon: {
        fontSize: 48,
    },
    title: {
        fontSize: theme.fontSizes.xxxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: theme.fontSizes.md,
        color: colors.textSecondary,
        marginBottom: theme.spacing.xxl,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    codeBoxesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    codeBox: {
        width: 50,
        height: 60,
        borderRadius: theme.borderRadius.md,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    codeBoxFilled: {
        backgroundColor: colors.surface,
        borderColor: colors.primary,
    },
    codeBoxActive: {
        borderColor: colors.primary,
        borderWidth: 3,
    },
    codeBoxText: {
        fontSize: theme.fontSizes.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        fontFamily: 'monospace',
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        width: 1,
        height: 1,
    },
    tapToTypeHint: {
        marginBottom: theme.spacing.lg,
    },
    tapToTypeText: {
        fontSize: theme.fontSizes.sm,
        color: colors.primary,
        textAlign: 'center',
    },
    formatExample: {
        fontSize: theme.fontSizes.sm,
        color: colors.textTertiary,
        marginBottom: theme.spacing.xxl,
        textAlign: 'center',
    },
    pasteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.xl,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    pasteButtonIcon: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    pasteButtonText: {
        fontSize: theme.fontSizes.md,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    joinButton: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.shadows.md,
    },
    joinButtonDisabled: {
        backgroundColor: colors.surfaceLight,
        opacity: 0.7,
    },
    joinButtonText: {
        fontSize: theme.fontSizes.lg,
        fontWeight: 'bold',
        color: colors.background,
    },
    clearButton: {
        paddingVertical: theme.spacing.md,
    },
    clearButtonText: {
        fontSize: theme.fontSizes.md,
        color: colors.textSecondary,
    },
});
