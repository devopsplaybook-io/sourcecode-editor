module.exports = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.(ts|tsx|js)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.spec.json",
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(uuid)/)"],
  testMatch: ["/**/src/**/*.spec.(ts|js)"],
  testEnvironment: "node",
};
