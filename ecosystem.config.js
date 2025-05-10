module.exports = {
  apps: [
    {
      name: "sourcecode-editor-proxy",
      cwd: "sourcecode-editor-proxy",
      script: "npm",
      args: "run start",
      autorestart: false,
      ignore_watch: ["node_modules"],
    },
    {
      name: "sourcecode-editor-server",
      cwd: "sourcecode-editor-server",
      script: "npm",
      args: "run dev",
      autorestart: false,
      env_development: {
        DEV_MODE: "true",
        DATA_DIR: "../docs/dev/data",
        OPENTELEMETRY_COLLECTOR_HTTP: "http://localhost:4318/v1/traces",
        OPENTELEMETRY_COLLECTOR_AWS: true,
      },
    },
    {
      name: "sourcecode-editor-web",
      cwd: "sourcecode-editor-web",
      script: "npm",
      args: "run dev",
      autorestart: false,
      env_development: {
        DEV_MODE: "true",
      },
    },
  ],
};
