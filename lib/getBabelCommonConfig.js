
var _os = require('os');

module.exports = function getBabelCommonConfig() {
  const babelConfig =  {
    cacheDirectory: (0, _os.tmpdir)(),
    presets: [require.resolve('babel-preset-es2015-ie'), require.resolve('babel-preset-react'), require.resolve('babel-preset-stage-0')],
    plugins: [require.resolve('babel-plugin-add-module-exports'), require.resolve('babel-plugin-transform-decorators-legacy')]
  };

  babelConfig.plugins.push([require.resolve('babel-plugin-transform-runtime'),
    { polyfill: false }]);
  return babelConfig;
};
