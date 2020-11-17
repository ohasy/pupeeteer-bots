const credentials = require("./cred.js");

exports.creds = credentials;

const userAgents = {
    android: "Mozilla/5.0 (Linux; U; Android 8.0.0; en-us; SCH-I535 Build/KOT49H) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1"
}

module.exports = {
    creds: credentials,
    followerbot: {
        followFollowersOf:[
            'bikanerikaka',
            'bikanercityblog',
            'bikaneri_sarcasm',
            'thatbikanagirl',
            'bikaner_chutkule_07',
            'foodmapbikaner'
        ],
        followedDbPath: './DB/followed.json',
        unfollowedDbPath: './DB/unfollowed.json',
        likedPhotosDbPath: './DB/liked-photos.json',
        cookiesPath: "./DB/followerbot_cookie.json",
    },
    posterbot: {
        // subreddits - beware of these bad boys. there can be anything.
        downloadPostsFrom: {
            reddit: {
                subreddits: [
                    "memes",
                    "IndianMeyMeys",
                    "IndianHistoryMemes",
                    "Cringetopia",
                    "dankmemes",
                    "MemeEconomy",
                    "PrequelMemes",
                    "bakchodi",
                    "terriblefacebookmemes",
                    "ComedyCemetery"
                    // "cursedimages",
                    // "dankmemes",
                    // "cursedcomments",
                    // "MemeEconomy",
                    // "PrequelMemes",
                    // "hmmm"
                ]
            }
        },
        imagesDir: 'downloaded_images',
        userAgent: userAgents.ios,
        instagramLoginUrl: "https://instagram.com/accounts/login",
        instagramUrl: "https://instagram.com",
        cookiesPath: "./DB/posterbot_cookie.json"
    },
    tinderbot: {
        creds: credentials.tinderCred
    }
}

