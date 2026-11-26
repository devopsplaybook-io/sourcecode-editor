module.exports = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.(ts|tsx|js)$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2020",
        },
      },
    ],
  },
  // uuid ships ESM; cookie (used by Fastify's light-my-request inject) is
  // ESM-only too, so both must go through the swc transform.
  transformIgnorePatterns: ["/node_modules/(?!(uuid|cookie)/)"],
  coverageProvider: "v8",
  testMatch: ["/**/src/**/*.spec.(ts|js)"],
  testEnvironment: "node",
};
