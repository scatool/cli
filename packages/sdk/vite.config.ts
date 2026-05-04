import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: ["src/generated/**"],
  },
  fmt: {
    ignorePatterns: ["src/generated/**"],
  },
  run: {
    tasks: {
      generate: {
        command: "openapi-ts",
        input: [{ pattern: "openapi.yaml", base: "workspace" }, "openapi-ts.config.ts"],
      },
      build: {
        command: "vp pack",
        dependsOn: ["generate"],
      },
    },
  },
});
