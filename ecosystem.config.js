const fs = require("fs");
let devEnv = {};
if (fs.existsSync("./env-dev.js")) {
  devEnv = require("./env-dev");
}

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
        ...devEnv,
        DEV_MODE: "true",
        DATA_DIR: "../docs/dev/data",
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
