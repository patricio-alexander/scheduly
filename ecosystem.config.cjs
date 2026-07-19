/**
 * PM2 — Scheduly
 *
 * Build previo:  npm run build
 * Arranque:      pm2 start ecosystem.config.cjs
 * Estado:        pm2 status
 * Logs:          pm2 logs scheduly
 * Reinicio:      pm2 restart scheduly
 */
module.exports = {
  apps: [
    {
      name: "scheduly",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3004",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3004,
      },
    },
  ],
};
