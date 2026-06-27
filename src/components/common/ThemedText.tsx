// Text wrapper that applies the loaded Cal Sans font family by default.
//
// React Native Text does not inherit fontFamily from parent Views, so a wrapper
// is the cleanest way to apply a custom font globally across the app. Any file
// that imports ThemedText instead of react-native's Text gets the Cal Sans
// default; headings can override via the `font-heading-*` Tailwind utilities.

import { Text, type TextProps } from 'react-native';

export function ThemedText({ className = '', style, ...props }: TextProps) {
  return <Text className={`font-sans ${className}`} style={style} {...props} />;
}
