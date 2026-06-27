module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Note: react-native-worklets/plugin (required by Reanimated v4) is injected
    // automatically by babel-preset-expo in SDK 54, so it is not listed here.
  };
};
