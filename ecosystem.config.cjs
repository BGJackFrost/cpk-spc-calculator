// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'spc-calculator',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        OFFLINE_MODE: 'true',
        AUTH_MODE: 'local',
        STORAGE_MODE: 'local',
        LLM_MODE: 'disabled',
        LOCAL_STORAGE_PATH: './uploads',
      },
      // Log configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 10000,
    },
  ],
};
