import { Stack } from 'expo-router';
import { colors } from '../../../src/config';

export default function RideDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}