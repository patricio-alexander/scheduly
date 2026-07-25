/**
 * PM2 — Scheduly
 *
 * En el servidor (primera vez / deploy):
 *   npm ci
 *   npm run db:migrate
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *
 * Arranque:      pm2 start ecosystem.config.cjs
 * Estado:        pm2 status
 * Logs:          pm2 logs scheduly
 * Reinicio:      pm2 restart scheduly
 */
module.exports = {
  apps: [
    {
      name: "scheduly",
      script: "npm",
      instances: 1,
      args: "run start",
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
