module.exports = {
  apps: [{
    name: "eduguru",
    script: "server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    cwd: "./backend",
    env: {
      NODE_ENV: "production",
      PORT: 3002
    }
  }]
}
