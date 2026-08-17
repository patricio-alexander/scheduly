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
 * Logs worker:   pm2 logs scheduly-sri-auth
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
        SRI_POLL_ENABLED: "false",
      },
    },
    {
      name: "scheduly-sri-auth",
      script: "npm",
      instances: 1,
      args: "run worker:sri-auth",
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        SRI_POLL_ENABLED: "true",
        SRI_POLL_CRON: "*/3 * * * *",
      },
    },
  ],
};
