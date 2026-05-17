module.exports = {
  apps: [
    {
      name: 'kcis-api',
      script: 'src/index.js',
      cwd: '/opt/kcis/server',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/opt/kcis/logs/kcis-api.err.log',
      out_file: '/opt/kcis/logs/kcis-api.out.log',
      time: true,
    },
  ],
};
