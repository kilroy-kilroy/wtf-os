import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".next/**", "node_modules/**", "out/**", "build/**"] },
  ...nextConfig,
];

export default config;
