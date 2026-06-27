// Garap wordmark logo (branding asset).
// Constrained by height so the aspect ratio stays crisp in both top-bar and
// login-screen contexts.

import { Image, type ImageStyle, type StyleProp } from 'react-native';

interface WordmarkProps {
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export function Wordmark({ height = 32, style }: WordmarkProps) {
  return (
    <Image
      source={require('@/src/assets/icons/wordmark.png')}
      style={[{ height, width: height * 4 }, style]}
      resizeMode="contain"
    />
  );
}
