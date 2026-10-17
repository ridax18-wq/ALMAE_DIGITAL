import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "src/types/database.ts"],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["scripts/**"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;
