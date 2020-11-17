const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
// const puppeteer = require('puppeteer')

const fs = require('fs');
const _ = require("lodash");
const { join } = require('path');
const {creds, posterbot} =require("./config");
const {updatePosterDB, getPosterDB, sleep} = require("./common");


const username = creds.username;
const password = creds.password;

const downloaded = getPosterDB({type:"downloaded"})
const uploaded = getPosterDB({type:"uploaded"})

const target_subreddits = posterbot.downloadPostsFrom.reddit.subreddits;

// Defaults to Galaxy s9 user agent
// const USER_AGENT = "Mozilla/5.0 (Linux; U; Android 8.0.0; en-us; SCH-I535 Build/KOT49H) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30";
const USER_AGENT = posterbot.userAgent;
console.log("User agent being used: ",USER_AGENT)
const INSTAGRAM_LOGIN_URL = posterbot.instagramLoginUrl;
const INSTAGRAM_URL = posterbot.instagramUrl;
const cookiesPath = posterbot.cookiesPath;


  const uploadPic = async (page, imagePath, caption) => {
    // They may try to show us something but just go straight to instagram.com

    

    console.debug("waiting for the file inputs");

    // Wait until everything is loaded
    await page.waitForSelector("input[type='file']");

    // Set the value for the correct file input (last on the page is new post)
    let fileInputs = await page.$$('input[type="file"]');
    let input = fileInputs[fileInputs.length-1];

    console.debug("clicking new post");
    await sleep(250);
    // Upload the file
    // Note: Instagram seems to have a check in place to make sure you've viewed the file upload dialog, 
    // so we have to open it here.
    // await page.evaluate( function() { 
    //     document.querySelector("[aria-label='New Post']").parentElement.click() } );
    //await page.click("[aria-label='New Post']"); 
    await sleep(250);

    const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.evaluate( function() { 
            document.querySelector("[aria-label='New Post']").parentElement.click() } ), // some button that triggers file selection
      ]);

    await fileChooser.accept([imagePath]) 

    console.debug("uploading the image");


    // await input.uploadFile(imagePath);
    await sleep(250);
    
    try {
      console.debug("Waiting for Expand button");

      // Find Expand button
      await page.waitForXPath(`//button[span='Expand']`)
      
      let [expandBtn] = await page.$x(`//button[span='Expand']`)
  
      expandBtn.click()
    } catch (e)
    {
      console.debug("no expand button found")
    }


    console.debug("waiting for next");

    // Wait for the next button
    await page.waitForXPath("//button[contains(text(),'Next')]");

    console.debug("clicking next");

    // Get the next button
    let [next] = await page.$x("//button[contains(text(),'Next')]");
    await next.click();

    console.debug("adding the caption");

    if(caption) {
        // Wait for the caption option
        await page.waitForSelector("textarea[aria-label='Write a caption…']");

        // Click the caption option
        await page.click("textarea[aria-label='Write a caption…']");

        // Type
        await page.keyboard.type(caption);
    }

    console.debug("waiting for share");

    // Get the share button and click it
    await page.waitForXPath("//button[contains(text(),'Share')]");
    let share = await page.$x("//button[contains(text(),'Share')]");

    console.debug("clicking share");

    await share[0].click();

    console.debug("finishing up");

    // Wait for a little while before finishing
    await sleep(10000);
}

const updateRedditPics = async (page) => {
    if (!_.isEmpty(downloaded.reddit.subreddits)) {
        for (const subreddit of target_subreddits) {
            const downloadedPosts = _.get(downloaded, `reddit.subreddits.${subreddit}`, [])
                for (const post of downloadedPosts) {
                    const uploadedPosts = _.get(uploaded, `reddit.subreddits.${subreddit}`, []);
                    const uploadedPostNames = uploadedPosts.map(up => up.split(".")[0]);
                    if (post.split(".")[1] === "gif"){
                        console.log(post, " : cant upload gif files for now")
                    }
                    else if (uploadedPostNames.includes(post.split(".")[0]))
                    {
                      console.log(uploadedPostNames)
                        console.log(post, " : uploaded already.")
                    }
                    else {
                        const imgPath = `./${posterbot.imagesDir}/hot/${subreddit}/${post.split(".")[0]}.jpg`;
                        if (fs.existsSync(imgPath)) {
                            await uploadPic(page, imgPath)
                            if (!uploaded.reddit.subreddits[subreddit]) uploaded.reddit.subreddits[subreddit] = [];
                            if (!uploaded.reddit.subreddits[subreddit].includes(post)){
                                  uploaded.reddit.subreddits[subreddit].push(post);
                                  updatePosterDB({type: "uploaded",content: uploaded})
                            }
                            console.log(post, ": upload completed.")
                            await sleep(10000)
                        }
                        else {
                            console.log(post, "couldn't find the image in directory.")
                        }
                    }
                }
            }
        }
    }




async function tryLoadCookies(page) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath));
      for (const cookie of cookies) {
        if (cookie.name !== 'ig_lang') await page.setCookie(cookie);
      }
    } catch (err) {
      console.error('No cookies found');
    }
}

async function trySaveCookies(page) {
    try {
      console.log('Saving cookies');
      const cookies = await page.cookies();
     console.log(cookies, cookiesPath)
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    } catch (err) {
      console.error('Failed to save cookies', err);
    }
  }

  async function tryDeleteCookies() {
    try {
      console.log('Deleting cookies');
       fs.unlinkSync(cookiesPath);
    } catch (err) {
      console.error('No cookies to delete');
    }
  }



// We are good to go
run();

/************* Functions *************/

/**
 * Run the program.
 */

async function takeScreenshot(page) {
    try {
      const fileName = `${new Date().getTime()}.jpg`;
      console.log('Taking screenshot', fileName);
      await page.screenshot({ path: join("screenshots", fileName), type: 'jpeg', quality: 30 });
    } catch (err) {
        console.error('Failed to take screenshot', err);
    }
  }

async function run() {

    console.debug("launching puppeteer");

    // Configure puppeteer options
    let options = {
        defaultViewport: {
            width: 320,
            height: 570 
        },
        headless: false,
        timeout: 0,
        args: ["--no-sandbox"]
    };

    // Get the browser
    let browser = await puppeteer.launch( options );

    // Get the page
    let page  = await browser.newPage();
    await page.setDefaultNavigationTimeout(0); 
    // Instagram only allows posting on their mobile site, so we have to pretend to be on mobile
    await page.setUserAgent(USER_AGENT);
    await tryLoadCookies(page);

    console.debug("visiting the instagram login page");

    // Go to instagram.com
    await page.goto(INSTAGRAM_LOGIN_URL)
    await takeScreenshot(page)
    console.debug("waiting for the username input");

    // Wait for the username input
    try {
        await page.waitForSelector("input[name='username']", {timeout: 10000 });
        await sleep(250);
        console.debug("typing in the username and password");

        // Get the inputs on the page
        let usernameInput = await page.$("input[name='username']");
        let passwordInput = await page.$("input[name='password']");

                // Type the username in the username input
                await usernameInput.click();
                await page.keyboard.type(username);
        
                // Type the password in the password input
                await passwordInput.click();
                await page.keyboard.type(password);
        
                console.debug("clicking log in");
        
                // Click the login button
                let button = await page.$x("//div[contains(text(),'Log In')]//..");
                await button[0].click();
        
                // Make sure we are signed in
                await page.waitForNavigation();
        
                console.debug("going to instagram home");
                
                console.debug("saving cookies");
                await tryDeleteCookies(page);
                await trySaveCookies(page);
                await page.goto(INSTAGRAM_URL);
                await updateRedditPics(page)
    }
    catch (e){
        console.debug("check if already logged in and can upload pics")
        console.debug("yup we are already logged in")
        // await page.goto(INSTAGRAM_URL);
        await updateRedditPics(page)
    }

   




    
    // They may try to show us something but just go straight to instagram.com
    // await page.goto(INSTAGRAM_URL);
    

    // console.debug("waiting for the file inputs");

    // // Wait until everything is loaded
    // await page.waitForSelector("input[type='file']");

    // // Set the value for the correct file input (last on the page is new post)
    // let fileInputs = await page.$$('input[type="file"]');
    // let input = fileInputs[fileInputs.length-1];

    // console.debug("clicking new post");

    // // Upload the file
    // // Note: Instagram seems to have a check in place to make sure you've viewed the file upload dialog, 
    // // so we have to open it here.
    // await page.evaluate( function() { document.querySelector("[aria-label='New Post']").parentElement.click() } );
    // //await page.click("[aria-label='New Post']"); 
    // await sleep(250);

    // console.debug("uploading the image");


    // await input.uploadFile('./images/hot/hmmm/1605169533_hmmm.jpg');
    // await sleep(250);

    // console.debug("waiting for next");

    // // Wait for the next button
    // await page.waitForXPath("//button[contains(text(),'Next')]");

    // console.debug("clicking next");

    // // Get the next button
    // let next = await page.$x("//button[contains(text(),'Next')]");
    // await next[0].click();

    // console.debug("adding the caption");

    // // if(argv.caption) {
    // //     // Wait for the caption option
    // //     await page.waitForSelector("textarea[aria-label='Write a caption…']");

    // //     // Click the caption option
    // //     await page.click("textarea[aria-label='Write a caption…']");

    // //     // Type
    // //     await page.keyboard.type(argv.caption);
    // // }

    // console.debug("waiting for share");

    // // Get the share button and click it
    // await page.waitForXPath("//button[contains(text(),'Share')]");
    // let share = await page.$x("//button[contains(text(),'Share')]");

    // console.debug("clicking share");

    // await share[0].click();

    // console.debug("finishing up");

    // // Wait for a little while before finishing
    // await sleep(5000);

    // Close
    await browser.close();

    console.log("the post was made successfully");
}

/**
 * Print the correct usage of this program.
 */
function usage() {
    console.log("Usage: node index.js --username <username> --password <password> --image <image_path (jpeg/jpg only)> [-caption <caption>] [-executablePath <chrome_path>] [-agent <user_agent>]");
}

/**
 * Exit the program with an error
 */
function fail() {
    usage();
    process.exit(1);
}
