const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-sqlite/web importa wa-sqlite.wasm; Metro debe tratar .wasm como asset.
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// Evita conflictos si .wasm apareciera en sourceExts por otras configuraciones.
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== "wasm");

module.exports = config;
