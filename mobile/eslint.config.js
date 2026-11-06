const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist*/**", "android/**", "ios/**", "artifacts/**"] },
  {
    files: ["src/core/shared.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
