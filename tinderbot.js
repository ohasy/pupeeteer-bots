const puppeteer = require("puppeteer");
const {username, password} = require("./config").tinderbot.creds;

const fs = require("fs");
const notifier = require("node-notifier");
const player = require("play-sound")((opts = {}));
const cities = require("./cities");
const cookiesPath = './DB/tinderbot_cookies.json'
const localStoragePath = './localstorage.json'
const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.193 Safari/537.36`;

const trySettingUsrAgent = async (page) => await page.setUserAgent(page)
const enableBackgroundMode = false;

let swipeCount = 0;
const filePath = "swipeInfo.json";

let swipeInfoObj = { swipes: 0, likes: 0, skipped: 0 };

let swipeInfo;


try {
  swipeInfo = JSON.parse(fs.readFileSync(filePath));
} catch (error) {
  swipeInfo = swipeInfoObj;
}

//sleep function to pause further code
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function trySaveCookies(page) {
  const localStorageData = await page.evaluate(() => {
    let json = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== 'activeTabKey') json[key] = localStorage.getItem(key);
    }
    return json;
  });
  fs.writeFileSync(localStoragePath, JSON.stringify(localStorageData, null, 2));

  try {
    console.log('Saving cookies');
    const cookies = await page.cookies();
   console.log(cookies, cookiesPath)
  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
  } catch (err) {
    console.error('Failed to save cookies', err);
  }
}

async function tryLoadCookies(page) {
  try {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath));
    const lsData =  JSON.parse(fs.readFileSync(localStoragePath));
    for (const cookie of cookies) {
      if (cookie.name !== 'ig_lang') await page.setCookie(cookie);
    }

    await page.evaluateOnNewDocument((lsData) => {
      for (const lsKey of Object.keys(lsData)) 
      {
        localStorage.setItem(lsKey, lsData[lsKey]);
      }
      
    },lsData);

  } catch (err) {
    console.error('No cookies found', err);
  }
}

console.log("Running Tinder Bot");
notifier.notify({
  title: "Bot started running",
  message: "..",
  sound: true, // Only Notification Center or Windows Toasters
  wait: true // Wait with callback, until user action is taken against notification, does not apply to Windows Toasters as they always wait or notify-send as it does not support the wait option
});

(async () => {
  //set headless to false if you want to see the chrome
  const browser = await puppeteer.launch({
    headless: enableBackgroundMode,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--window-size=1920,1080"
      // "--no-sandbox",
      // "--disable-setuid-sandbox"
    ]
  });
  // create browser context
  const context = browser.defaultBrowserContext();
  // allow location permission for tinder.com
  await context.overridePermissions("https://tinder.com", ["geolocation"]);

  // open a new tab
  const page = await browser.newPage();
  // fix the size of window
  await page._client.send("Emulation.clearDeviceMetricsOverride");

  // await trySettingUsrAgent([page]);
  //open tinder
  await page.goto("https://tinder.com");
  
  // try {
  //   // await tryLoadCookies(page);

  //   // await page.goto("https://tinder.com/app/recs");
  // }
  // catch (e)
  // {
  //   console.log(e);
  // }

  

  // add your cordinates of location
  await page.setGeolocation({
    latitude: 28.588681897184927,
    longitude: 77.38302630354374
  });

  await sleep(2000)
  
  await page.waitForXPath(`//button[span='Log in']`);

  const [LoginBtn] = await page.$x(`//button[span='Log in']`);

  LoginBtn.click()

  await sleep(2000)

  try {
    await page.waitForXPath(`//button[text()='More options']`,{timeout:2000})

    const [moreOptionsBtn] = await page.$x(`//button[text()='More options']`)
  
    await moreOptionsBtn.click()
  }
  catch (e)
  {
    console.log("more options button not found;")
  }

  // wait for facebook login button to appear

  await sleep(2000)

  await page.waitForXPath(
    `//*[@id="modal-manager"]/div/div/div/div/div[3]/span/div[2]/button`
    // to get xpath right click on the element > copy > xpath
  );

  // select the login button
  const [FBLoginBtn] = await page.$x(
    `//*[@id="modal-manager"]/div/div/div/div/div[3]/span/div[2]/button`
  );

  // capture the FB login popup
  // const newPagePromise = new Promise(x =>
  //   browser.once("targetcreated", target => x(target.page()))
  // );

  const newPagePromise = new Promise(x => page.once("popup", x));
  //better way of capturing popup

  // click the login button
  await FBLoginBtn.click();
  const popup = await newPagePromise;
  // await trySettingUsrAgent(popup);
  sleep(2000)

  // wait for email box to open
  await popup.waitForSelector("#email");

  // click on the input
  await popup.click("#email");
  // type the username/email in textfeild
  await popup.keyboard.type(username);

  // click on the password input and type password
  await popup.click("#pass");
  await popup.keyboard.type(password);

  // wait for login btn to appear and then click on it
  await popup.waitForSelector("#loginbutton");
  await popup.click("#loginbutton");
  // wait for the swipe card to appear

  setTimeout(async () => {
    page.reload();
  }, 3000);

  const checkForSwipeCard = async () => {
    try {
      await page.waitForXPath(
        '(//*[@id="content"]/div/div[1]/div/main/div[1]/div/div/div[1]/div/div[1]/div[3]/div[1]/div[1])',
        { timeout: 30000 }
      );
      // console.log(swipeInfo);
      swipeInfo.swipes++;
      // swipeInfo.skipped = swipeInfo.swipes - swipeInfo.likes;
      fs.writeFileSync(filePath, JSON.stringify(swipeInfo), {
        flag: "w+"
      });
      return true;

      // console.log("Logged into Tinder");
    } catch (err) {
      // login is failed now terminate the browser
      console.log("There is no card " + err);

      return false;
      // process.exit();
    }
  };

  // checkForSwipeCard();

  // return aria label of like or nope randomly
  const randomSwipeSelector = () => {
    const randomNum = Math.random() * 5;
    if (randomNum < 1) {
      return "[aria-label='Nope']";
    } else {
      return "[aria-label='Like']";
    }
  };

  let prvUrl;
  // whenever the page will get a http response this will fire
  page.on("response", response => {
    //get the url of response
    const url = response.request().url();
    // regex pattern to match only https://api.gotinder.com/pass/
    const pattern = /https:\/\/api.gotinder.com\/like\/*/;

    //if it's  true then we liked it
    if (pattern.test(url) && prvUrl !== url) {
      prvUrl = url;
      swipeInfo.likes++;
      // console.log(url);
    }
  });

  // change location randomly
  const changeRandomLocation = () => {
    const index = Math.floor(Math.random() * cities.length);
    console.log("Current location ");
    console.log(cities[index]);

    //play an audio before exiting if no card also send notification
    // player.play("iphone_tweet.mp3", function(err) {
    //   if (err) throw err;
    // });
    //send a notification
    notifier.notify({
      title: "No profiles, Location Changed To",
      message: cities[index].name,
      sound: false,
      wait: true
    });

    page.setGeolocation({
      latitude: cities[index].latitude,
      longitude: cities[index].longitude
    });
  };

  // await page.screenshot({ path: "loggedin.png" });

  //now set an interval and click the like/nope button every ms

  let intervalTime = 1000;
  let locationChangeCount = 0;
  let updatedCookies = false;
  const swipeCard = async () => {
    if (!updatedCookies) {
      await trySaveCookies(page);
      updatedCookies = true;
    }
    const isCardThere = await checkForSwipeCard();
    if (isCardThere) {
      page
        .click(randomSwipeSelector())
        .then(() => {})
        .catch(err => {
          console.log(err);
        });
      // generate random number b/w 500 - 2500 for random swipe time
      intervalTime = Math.floor(Math.random() * 2500) + 500;

      if (swipeInfo.swipes % 100 === 0) {
        await sleep(intervalTime * 10); //2mins
      }
      setTimeout(swipeCard, intervalTime);
    } else {
      // process.exit();
      console.log("not calling interval");
      changeRandomLocation();
      //wait for 15 sec after changing location
      locationChangeCount++;
      //see if it's the 10th time using modulo
      if (locationChangeCount % 15 === 0) {
        await sleep(5 * 60 * 1000); //10mins
      }
      await sleep(10000);

      await page.reload();
      setTimeout(swipeCard, intervalTime);
    }
  };
  swipeCard();

  // await browser.close();
})();
