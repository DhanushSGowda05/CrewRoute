import { registerAs } from '@nestjs/config';

export default registerAs('maps', () => ({
  provider: process.env.MAPS_PROVIDER,
  olaApiKey: process.env.OLA_MAPS_API_KEY,
  googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
}));
