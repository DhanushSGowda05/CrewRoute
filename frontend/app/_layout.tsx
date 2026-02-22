import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores';
import { ClerkTokenSync } from '../src/components/clerkTokenSync';
import { usersService } from '../src/services/api/users.service'; // ✅ import here, not in store

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Save token error:', err);
    }
  },
};

function InitialLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // ✅ Use all setters from store
  const { setToken, setUser, setGetFreshToken, logout } = useAuthStore();

  // Navigation guard
  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    }
  }, [isSignedIn, segments, isLoaded]);

  // ✅ Sync logic with getFreshToken storage
  useEffect(() => {
    const syncAuth = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token) {
            console.log('🔑 Got Clerk token, syncing with backend...');
            setToken(token);

            // ✅ Store the getToken function for WebSocket use
            setGetFreshToken(getToken);

            // Fetch user from backend and store in authStore
            const response = await usersService.getCurrentUser();
            setUser(response.user);

            console.log('✅ User synced with backend:', response.user);
          }
        } catch (error) {
          console.error('❌ Error syncing auth:', error);
        }
      } else {
        await logout();
      }
    };
    syncAuth();
  }, [isSignedIn]);

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkTokenSync />
      <InitialLayout />
    </ClerkProvider>
  );
}