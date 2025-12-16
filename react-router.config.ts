import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';
import {vercelPreset} from '@vercel/react-router/vite';

export default {
  ssr: true,
  presets: [hydrogenPreset(), vercelPreset()],
} satisfies Config;
