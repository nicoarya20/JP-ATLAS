// babel-preset-expo already adds the react-native-worklets plugin; module-resolver maps `@/` to src/
// (same as tsconfig paths) so Metro and Jest resolve gluestack's `@/components/ui/*` imports alike.
module.exports = (api) => {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [['module-resolver', { alias: { '@': './src' } }]],
  };
};
