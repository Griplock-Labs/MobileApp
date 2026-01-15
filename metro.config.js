const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve("buffer/"),
};

const originalGetModulesRunBeforeMainModule =
  config.serializer?.getModulesRunBeforeMainModule;

config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => {
    const original = originalGetModulesRunBeforeMainModule?.() || [];
    return [
      ...original,
      require.resolve(path.join(__dirname, "client/shim.js")),
    ];
  },
};

module.exports = config;
