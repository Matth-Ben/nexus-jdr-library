import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // @testing-library/react ne détecte son hook de nettoyage automatique
    // (afterEach) entre les tests que si l'objet global existe — sans ça,
    // le DOM des rendus précédents reste attaché et pollue les requêtes
    // getByLabelText/getByRole des tests suivants du même fichier.
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
