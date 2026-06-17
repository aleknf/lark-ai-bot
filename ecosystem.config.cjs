// PM2 Ecosystem File — Lark AI Bot
module.exports = {
  apps: [
    {
      name: "lark-ai-bot",
      script: "./dist/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      // Restart if memory exceeds 300MB
      max_memory_restart: "300M",
      // Log configuration
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      merge_logs: true,
      // Auto-restart on crash (within 5s)
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
