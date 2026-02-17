import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthStore } from '../stores/authStore';

/**
 * ClerkTokenSync
 *
 * This component must be placed INSIDE your <ClerkProvider> but at the root
 * of your app (e.g. in _layout.tsx). It registers Clerk's getToken function
 * into the authStore so that the Axios interceptor can always get a fresh,
 * non-expired JWT — without needing React hooks inside the service layer.
 *
 * Place it like this in _layout.tsx:
 *
 *   <ClerkProvider>
 *     <ClerkTokenSync />   <-- add this
 *     <Stack />
 *   </ClerkProvider>
 */
export function ClerkTokenSync() {
  const { getToken, isSignedIn } = useAuth();
  const { setGetFreshToken, setToken, setUser, logout } = useAuthStore();

  useEffect(() => {
    if (isSignedIn) {
      // ✅ Register Clerk's getToken into the store
      // The Axios interceptor will call this before every request
      setGetFreshToken(async () => {
        try {
          const token = await getToken();
          return token;
        } catch (error) {
          console.error('❌ Failed to get fresh Clerk token:', error);
          return null;
        }
      });

      // ✅ Also fetch and store an initial token immediately
      getToken().then((token) => {
        if (token) {
          setToken(token);
          console.log('✅ Initial Clerk token loaded');
        }
      });
    } else {
      // User signed out — clear the token function
      setGetFreshToken(() => Promise.resolve(null));
    }
  }, [isSignedIn]);

  return null; // renders nothing
}