module.exports = {
    apps: [{
        name: 'ltc-txs',
        script: 'dist/server.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
    }]
  }