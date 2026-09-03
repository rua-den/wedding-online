const port = process.env.PORT || "3000";
const hostname = process.env.HOSTNAME || "0.0.0.0";

module.exports = {
  apps: [
    {
      name: "huy-nhi-wedding",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: port,
        HOSTNAME: hostname,
      },
    },
  ],
};
