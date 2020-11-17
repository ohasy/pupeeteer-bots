module.exports = {
    apps: [
        {
            name: "followerbot",
            script: "./followerbot.js",
            error_file: "pm2_followerbot_err.log",
            resart_delay: 60000,
            log_date_format: "YYYY-MM-DD HH:mm Z",
            watch: true,
        },
        {
            name: "downloaderbot",
            script: "./downloaderbot.js",
            error_file: "pm2_downloaderbot_err.log",
            cron_restart: '*/15 * * * *',
            watch: false,
        },
        {
            name: "posterbot",
            error_file: "pm2_posterbot_err.log",
            script: "./posterbot.js",
            cron_restart: '*/30 * * * *',
            watch: false,
        }
    ]
}