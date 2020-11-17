// const puppeteer = require('puppeteer-extra')
// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// puppeteer.use(StealthPlugin())
const puppeteer = require('puppeteer')
// const puppeteer = require('puppeteer'); // eslint-disable-line import/no-extraneous-dependencies
const {creds, followerbot} = require('./config'); // eslint-disable-line 
const Instauto = require('instauto'); // eslint-disable-line import/no-unresolved
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const options = {
  cookiesPath: './DB/followerbot_cookie.json',

  username: creds.username,
  password: creds.password,

  // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one hour:
  maxFollowsPerHour: 20,
  // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one day:
  maxFollowsPerDay: 150,
  // (NOTE setting the above parameters too high will cause temp ban/throttle)

  maxLikesPerDay: 50,

  // Don't follow users that have a followers / following ratio less than this:
  followUserRatioMin: 0.2,
  // Don't follow users that have a followers / following ratio higher than this:
  followUserRatioMax: 4.0,
  // Don't follow users who have more followers than this:
  followUserMaxFollowers: null,
  // Don't follow users who have more people following them than this:
  followUserMaxFollowing: null,
  // Don't follow users who have less followers than this:
  followUserMinFollowers: null,
  // Don't follow users who have more people following them than this:
  followUserMinFollowing: null,

  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,

  // Usernames that we should not touch, e.g. your friends and actual followings
  excludeUsers: [],

  // If true, will not do any actions (defaults to true)
  dryRun: false,
};

(async () => {
  let browser;

  try {
    browser = await puppeteer.launch({ 
//  executablePath: 'chromium-browser',
 timeout: 0,
// executablePath: '/usr/bin/chromium-browser',
headless: false,
//args: ['--disable-features=VizDisplayCompositor'],

 });

    // Create a database where state will be loaded/saved to
    const instautoDb = await Instauto.JSONDB({
      // Will store a list of all users that have been followed before, to prevent future re-following.
      followedDbPath: followerbot.followedDbPath,
      // Will store all unfollowed users here
      unfollowedDbPath: followerbot.unfollowedDbPath,
      // Will store all likes here
      likedPhotosDbPath: followerbot.likedPhotosDbPath,
    });

    const instauto = await Instauto(instautoDb, browser, options);

    // List of usernames that we should follow the followers of, can be celebrities etc.
    const usersToFollowFollowersOf = followerbot.followFollowersOf;

    // Now go through each of these and follow a certain amount of their followers
    await instauto.followUsersFollowers({ usersToFollowFollowersOf, skipPrivate: true, enableLikeImages: true });

    await instauto.sleep(10 * 60 * 1000);

    // This is used to unfollow people - auto-followed AND manually followed -
    // who are not following us back, after some time has passed
    // (config parameter dontUnfollowUntilTimeElapsed)
    await instauto.unfollowNonMutualFollowers();

    await instauto.sleep(10 * 60 * 1000);

    // Unfollow auto-followed users (regardless of whether they are following us)
    // after a certain amount of days
    await instauto.unfollowOldFollowed({ ageInDays: 60 });

    console.log('Done running');

    await instauto.sleep(30000);
  } catch (err) {
    console.error(err);
    logger.log("error", {time: new Date().toISOString(x), error: err})
  } finally {
    console.log('Closing browser');
    if (browser) await browser.close();
  }
})();
