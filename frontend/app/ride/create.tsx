import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors, theme } from '../../src/config';
import { mapsService, AutocompleteSuggestion } from '../../src/services/api/maps.service';
import { ridesService } from '../../src/services/api/rides.service';

// ─── Types ────────────────────────────────────────────────
interface SelectedLocation {
  placeId: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
}

interface RouteInfo {
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}

// ─── Decode Polyline ──────────────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    // Ola Maps uses [lng, lat] order
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

// ─── Build Ola Map HTML ───────────────────────────────────
function buildMapHTML(params: {
  apiKey: string;
  center: [number, number];
  pickup?: SelectedLocation | null;
  destination?: SelectedLocation | null;
  routeCoords?: [number, number][];
}): string {
  const { apiKey, center, pickup, destination, routeCoords } = params;

  const pickupMarker = pickup
    ? `
    olaMaps.addMarker({
      offset: [0, -10],
      anchor: 'bottom',
      color: '#00D9C0',
    })
    .setLngLat([${pickup.lng}, ${pickup.lat}])
    .addTo(myMap);
  `
    : '';

  const destinationMarker = destination
    ? `
    olaMaps.addMarker({
      offset: [0, -10],
      anchor: 'bottom',
      color: '#FF4444',
    })
    .setLngLat([${destination.lng}, ${destination.lat}])
    .addTo(myMap);
  `
    : '';

  const routeLayer =
    routeCoords && routeCoords.length > 0
      ? `
    myMap.on('load', function() {
      myMap.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: ${JSON.stringify(routeCoords)}
          }
        }
      });
      myMap.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00D9C0',
          'line-width': 5,
          'line-opacity': 0.9
        }
      });
    });
  `
      : '';

  // Fit bounds if both markers exist
  const fitBounds =
    pickup && destination
      ? `
    myMap.fitBounds([
      [${Math.min(pickup.lng, destination.lng) - 0.05}, ${Math.min(pickup.lat, destination.lat) - 0.05}],
      [${Math.max(pickup.lng, destination.lng) + 0.05}, ${Math.max(pickup.lat, destination.lat) + 0.05}]
    ], { padding: 40, animate: false });
  `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #1a1a1a; }
    #map { width: 100%; height: 100%; }
    .maplibregl-ctrl-bottom-left,
    .maplibregl-ctrl-bottom-right,
    .maplibregl-ctrl-top-left,
    .maplibregl-ctrl-top-right { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://www.unpkg.com/olamaps-web-sdk@latest/dist/olamaps-web-sdk.umd.js"></script>
  <script>
    (async () => {
      try {
        const olaMaps = new OlaMaps({ apiKey: '${apiKey}' });

        const myMap = await olaMaps.init({
          style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json',
          container: 'map',
          center: [${center[0]}, ${center[1]}],
          zoom: 12,
        });

        ${pickupMarker}
        ${destinationMarker}
        ${fitBounds}
        ${routeLayer}

      } catch(e) {
        console.error('Map error:', e);
      }
    })();
  </script>
</body>
</html>
  `;
}

// ─── Autocomplete Input ───────────────────────────────────
interface AutocompleteInputProps {
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  suggestions: AutocompleteSuggestion[];
  isLoading: boolean;
  onClear: () => void;
}

function AutocompleteInput({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  onSelect,
  suggestions,
  isLoading,
  onClear,
}: AutocompleteInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const showDropdown = isFocused && (suggestions.length > 0 || isLoading);

  return (
    <View style={acStyles.container}>
      <Text style={acStyles.label}>{label}</Text>
      <View style={[acStyles.inputWrapper, isFocused && acStyles.inputFocused]}>
        <Text style={acStyles.icon}>{icon}</Text>
        <TextInput
          style={acStyles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {isLoading && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
        )}
        {value.length > 0 && !isLoading && (
          <TouchableOpacity onPress={onClear} style={acStyles.clearBtn}>
            <Text style={acStyles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View style={acStyles.dropdown}>
          {isLoading && suggestions.length === 0 ? (
            <View style={acStyles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={acStyles.loadingText}>Searching...</Text>
            </View>
          ) : (
            suggestions.map((s, i) => (
              <TouchableOpacity
                key={s.placeId || i.toString()}
                style={[acStyles.suggestion, i < suggestions.length - 1 && acStyles.suggestionBorder]}
                onPress={() => { onSelect(s); setIsFocused(false); }}
              >
                <Text style={acStyles.suggestionIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={acStyles.suggestionName} numberOfLines={1}>{s.name}</Text>
                  <Text style={acStyles.suggestionDesc} numberOfLines={1}>{s.description}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────
export default function CreateRideScreen() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get API key from env
  const OLA_API_KEY = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || '';

  // Form state
  const [rideName, setRideName] = useState('');
  const [pickupText, setPickupText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [pickup, setPickup] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);

  // Autocomplete
  const [pickupSuggestions, setPickupSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [destinationLoading, setDestinationLoading] = useState(false);

  // Route
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // Create
  const [creating, setCreating] = useState(false);

  // User location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([77.5946, 12.9716]);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const ul = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(ul);
        setMapCenter([loc.coords.longitude, loc.coords.latitude]);

        try {
          const result = await mapsService.reverseGeocode(ul.lat, ul.lng);
          if (result?.address) {
            setPickupText(result.address);
            setPickup({
              placeId: 'current-location',
              name: result.address,
              description: 'Your current location',
              lat: ul.lat,
              lng: ul.lng,
            });
          }
        } catch (e) {
          console.log('Could not reverse geocode');
        }
      }
    })();
  }, []);

  // Debounced autocomplete
  const searchAutocomplete = useCallback(
    async (
      text: string,
      setSuggestions: (s: AutocompleteSuggestion[]) => void,
      setLoading: (b: boolean) => void,
    ) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.length < 2) { setSuggestions([]); return; }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const results = await mapsService.autocomplete(text, userLocation || undefined);
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [userLocation],
  );

  const handlePickupChange = (text: string) => {
    setPickupText(text);
    setPickup(null);
    setRouteInfo(null);
    setRouteCoords([]);
    searchAutocomplete(text, setPickupSuggestions, setPickupLoading);
  };

  const handleDestChange = (text: string) => {
    setDestinationText(text);
    setDestination(null);
    setRouteInfo(null);
    setRouteCoords([]);
    searchAutocomplete(text, setDestinationSuggestions, setDestinationLoading);
  };

  // Fetch route
  const fetchRoute = async (from: SelectedLocation, to: SelectedLocation) => {
    setRouteLoading(true);
    try {
      const response = await mapsService.getRoute(
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng },
      );
      const coords = decodePolyline(response.route.polyline);
      setRouteCoords(coords);
      setRouteInfo({
        distance: response.route.distance,
        duration: response.route.duration,
        distanceMeters: response.route.distanceMeters,
        durationSeconds: response.route.durationSeconds,
        polyline: response.route.polyline,
      });
      // Center map between pickup and destination
      setMapCenter([
        (from.lng + to.lng) / 2,
        (from.lat + to.lat) / 2,
      ]);
    } catch (err) {
      console.error('Route error:', err);
      Alert.alert('Route Error', 'Could not get route. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  const handlePickupSelect = (s: AutocompleteSuggestion) => {
    if (!s.lat || !s.lng) return;
    const loc: SelectedLocation = { placeId: s.placeId, name: s.name, description: s.description, lat: s.lat, lng: s.lng };
    setPickupText(s.name);
    setPickup(loc);
    setPickupSuggestions([]);
    setMapCenter([s.lng, s.lat]);
    if (destination) fetchRoute(loc, destination);
  };

  const handleDestSelect = (s: AutocompleteSuggestion) => {
    if (!s.lat || !s.lng) return;
    const loc: SelectedLocation = { placeId: s.placeId, name: s.name, description: s.description, lat: s.lat, lng: s.lng };
    setDestinationText(s.name);
    setDestination(loc);
    setDestinationSuggestions([]);
    setMapCenter([s.lng, s.lat]);
    if (pickup) fetchRoute(pickup, loc);
  };

  // Create ride
  const handleCreateRide = async () => {
    if (!pickup || !destination) {
      Alert.alert('Missing Info', 'Please select pickup and destination.');
      return;
    }
    setCreating(true);
    try {
      const response = await ridesService.createRide({
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.description || pickup.name },
        destination: { lat: destination.lat, lng: destination.lng, address: destination.description || destination.name },
        rideName: rideName.trim() || undefined,
      });
      console.log('✅ Ride created:', response.ride.rideCode);
      router.replace(`/ride/${response.ride.id}/waiting`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create ride.');
    } finally {
      setCreating(false);
    }
  };

  // Build map HTML
  const mapHTML = buildMapHTML({
    apiKey: OLA_API_KEY,
    center: mapCenter,
    pickup,
    destination,
    routeCoords: routeCoords.length > 0 ? routeCoords : undefined,
  });

  const canCreate = !!pickup && !!destination && !creating;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Ride</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Ride Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RIDE NAME (OPTIONAL)</Text>
          <TextInput
            style={styles.rideNameInput}
            placeholder="e.g. Weekend Highway Run"
            placeholderTextColor={colors.textTertiary}
            value={rideName}
            onChangeText={setRideName}
            autoCorrect={false}
          />
        </View>

        {/* Route Inputs */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ROUTE</Text>

          <AutocompleteInput
            label="Pickup"
            icon="📍"
            placeholder="Where are you starting?"
            value={pickupText}
            onChangeText={handlePickupChange}
            onSelect={handlePickupSelect}
            suggestions={pickupSuggestions}
            isLoading={pickupLoading}
            onClear={() => { setPickupText(''); setPickup(null); setPickupSuggestions([]); setRouteInfo(null); setRouteCoords([]); }}
          />

          <View style={styles.connector}>
            <View style={styles.connectorLine} />
          </View>

          <AutocompleteInput
            label="Destination"
            icon="🚩"
            placeholder="Where are you going?"
            value={destinationText}
            onChangeText={handleDestChange}
            onSelect={handleDestSelect}
            suggestions={destinationSuggestions}
            isLoading={destinationLoading}
            onClear={() => { setDestinationText(''); setDestination(null); setDestinationSuggestions([]); setRouteInfo(null); setRouteCoords([]); }}
          />
        </View>

        {/* Ola Map Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ROUTE PREVIEW</Text>
          <View style={styles.mapContainer}>
            {routeLoading && (
              <View style={styles.mapOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.mapOverlayText}>Fetching route...</Text>
              </View>
            )}

            {!pickup && !destination ? (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
                <Text style={styles.mapPlaceholderText}>
                  Select locations to see route
                </Text>
              </View>
            ) : (
              <WebView
                style={styles.map}
                source={{ html: mapHTML }}
                scrollEnabled={false}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                onError={(e) => console.error('WebView error:', e.nativeEvent)}
              />
            )}
          </View>

          {/* Route Info */}
          {routeInfo && (
            <View style={styles.routeInfoBox}>
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoIcon}>📏</Text>
                <Text style={styles.routeInfoValue}>{routeInfo.distance}</Text>
                <Text style={styles.routeInfoLabel}>Distance</Text>
              </View>
              <View style={styles.routeInfoDivider} />
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoIcon}>⏱️</Text>
                <Text style={styles.routeInfoValue}>{routeInfo.duration}</Text>
                <Text style={styles.routeInfoLabel}>Duration</Text>
              </View>
            </View>
          )}
        </View>

        {/* Create Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreateRide}
            disabled={!canCreate}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.createBtnText}>
                {!pickup || !destination ? 'Select Pickup & Destination' : 'CREATE RIDE →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 24, color: colors.textPrimary },
  headerTitle: { fontSize: theme.fontSizes.xl, fontWeight: 'bold', color: colors.textPrimary },
  section: { paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.xl },
  sectionLabel: {
    fontSize: theme.fontSizes.xs, fontWeight: 'bold',
    color: colors.textTertiary, letterSpacing: 1, marginBottom: theme.spacing.md,
  },
  rideNameInput: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    fontSize: theme.fontSizes.lg,
    color: colors.textPrimary,
    borderWidth: 2, borderColor: 'transparent',
  },
  connector: { alignItems: 'flex-start', height: 20, justifyContent: 'center', marginLeft: theme.spacing.xl },
  connectorLine: { width: 2, height: 16, backgroundColor: colors.primary, opacity: 0.5 },
  mapContainer: {
    height: 260, borderRadius: theme.borderRadius.lg,
    overflow: 'hidden', backgroundColor: colors.surface,
  },
  map: { flex: 1, backgroundColor: colors.surface },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10,
  },
  mapOverlayText: { marginTop: theme.spacing.md, color: colors.textPrimary, fontSize: theme.fontSizes.md },
  mapPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  mapPlaceholderIcon: { fontSize: 48, marginBottom: theme.spacing.md },
  mapPlaceholderText: {
    color: colors.textSecondary, fontSize: theme.fontSizes.md,
    textAlign: 'center', paddingHorizontal: theme.spacing.xl,
  },
  routeInfoBox: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.md,
  },
  routeInfoItem: { flex: 1, alignItems: 'center' },
  routeInfoIcon: { fontSize: 20, marginBottom: theme.spacing.xs },
  routeInfoValue: { fontSize: theme.fontSizes.xl, fontWeight: 'bold', color: colors.primary, marginBottom: 2 },
  routeInfoLabel: { fontSize: theme.fontSizes.xs, color: colors.textTertiary },
  routeInfoDivider: { width: 1, backgroundColor: colors.surfaceLight, marginHorizontal: theme.spacing.lg },
  createBtn: {
    backgroundColor: colors.primary, borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg, alignItems: 'center', ...theme.shadows.md,
  },
  createBtnDisabled: { backgroundColor: colors.surfaceLight, opacity: 0.7 },
  createBtnText: { fontSize: theme.fontSizes.lg, fontWeight: 'bold', color: colors.background },
});

const acStyles = StyleSheet.create({
  container: { marginBottom: theme.spacing.sm, zIndex: 10 },
  label: { fontSize: theme.fontSizes.sm, color: colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg, borderWidth: 2, borderColor: 'transparent',
  },
  inputFocused: { borderColor: colors.primary },
  icon: { fontSize: 20, marginRight: theme.spacing.md },
  input: { flex: 1, paddingVertical: theme.spacing.lg, fontSize: theme.fontSizes.md, color: colors.textPrimary },
  clearBtn: { padding: theme.spacing.sm },
  clearText: { color: colors.textTertiary, fontSize: 16 },
  dropdown: {
    backgroundColor: colors.surface, borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs, borderWidth: 1, borderColor: colors.surfaceLight,
    ...theme.shadows.md, zIndex: 999,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  loadingText: { color: colors.textSecondary, marginLeft: theme.spacing.md, fontSize: theme.fontSizes.md },
  suggestion: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceLight },
  suggestionIcon: { fontSize: 16, marginRight: theme.spacing.md },
  suggestionName: { fontSize: theme.fontSizes.md, color: colors.textPrimary, fontWeight: '600', marginBottom: 2 },
  suggestionDesc: { fontSize: theme.fontSizes.sm, color: colors.textSecondary },
});