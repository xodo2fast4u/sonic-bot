import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      quotes: "off",
      semi: "off",
      indent: "off",
      "comma-dangle": "off",
      "max-len": "off",

      "no-unused-vars": "warn",
      "no-console": "warn",
    },
  },
];
