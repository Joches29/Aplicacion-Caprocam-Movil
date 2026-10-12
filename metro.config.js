const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const existingEnhanceMiddleware = config.server?.enhanceMiddleware;

// expo-sqlite/web importa wa-sqlite.wasm; Metro debe tratar .wasm como asset.
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// Evita conflictos si .wasm apareciera en sourceExts por otras configuraciones.
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== "wasm");

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const enhancedMiddleware = existingEnhanceMiddleware
      ? existingEnhanceMiddleware(middleware, server)
      : middleware;

    return (req, res, next) => {
      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      return enhancedMiddleware(req, res, next);
    };
  },
};

module.exports = config;
