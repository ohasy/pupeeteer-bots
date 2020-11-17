const path = require('path');
const fs = require("fs");
const axios = require("axios").default;
const pngToJpeg = require('png-to-jpeg');
// const  {snakeCase}  = require('lodash');
const {posterbot} = require("./config.js");
const {sleep, getPosterDB, updatePosterDB} = require("./common");
const subreddits = posterbot.downloadPostsFrom.reddit.subreddits;
const downloaded = getPosterDB({type: "downloaded"})

console.log("sub", subreddits)
class ImageToFilesystemWriter {
  constructor() {}

  saveToDisk(imageEntry, targetDir) {
    const entryPoint = path.resolve(targetDir, imageEntry.subreddit);
    const dir = path.resolve(
      targetDir,
      imageEntry.subreddit,
      imageEntry.formattedFilename,
    );

    // create dir if not existing
    if (!fs.existsSync(entryPoint)) {
      fs.mkdirSync(entryPoint, {
        recursive: true,
      });
    }

    // preexisting files will NOT be overwritten
    if (downloaded.reddit.subreddits[imageEntry.subreddit] && 
        downloaded.reddit.subreddits[imageEntry.subreddit].includes(imageEntry.formattedFilename))
    {
        console.log(`${imageEntry.formattedFilename} already downloaded.`);
        return;
    }
    // else if (fs.existsSync(dir)) {
    //   console.log(`${imageEntry.formattedFilename} exists.`);
    //   return;
    // } 
    else {
      const writer = fs.createWriteStream(dir);
      writer.on(
        "finish",
        async () => {
            console.log(`${imageEntry.formattedFilename} written`)
            if (imageEntry.formattedFilename.endsWith(".png")){
                let buffer = fs.readFileSync(dir);
                const output = await pngToJpeg({quality: 90})(buffer)
                const name = imageEntry.formattedFilename.split(".")[0]
                fs.writeFileSync(path.resolve(entryPoint,`${name}.jpg`), output)
                fs.unlinkSync(dir)
            }
        },
      );
      writer.on(
        "error",
        (error) =>
          console.log(`${imageEntry.formattedFilename} error ${error}`),
      );
      axios.get(imageEntry.imageUrl, {
        responseType: "stream",
      }).then((result) => {
        result.data.pipe(writer);
      }).catch((error) => console.log(error));
    }
  }
};

class RedditEntry {
    constructor(data, subreddit) {
      // this.data = data
      this.created_utc = data.created_utc;
      this.title = data.title;
      this.url = data.url;
      this.subreddit = subreddit;
    }
  
    get imageUrl() {
      if (this.urlIsImage() == true) {
        return this.url;
      } else {
        return undefined;
      }
    }
  
    get formattedFilename() {
      if (this.imageUrl !== undefined) {
        const fileending = this.imageUrl.split(".").slice(-1)[0];
        const filename = `${this.created_utc}_${this.title}`;
        return `${this.sanitizeFilename(filename)}.${fileending}`;
      } else {
        return undefined;
      }
    }
  
    sanitizeFilename(filenameString) {
      return filenameString.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    }
  
    urlIsImage() {
      const isDefined = this.url !== undefined;
      const regexImage = this.url.match(/\.(gif|jpeg|jpg|png)$/ig) !== null;
      return isDefined && regexImage;
    }
}


const getHotImagesOfSubReddit = (subreddit) => {
    const redditUrl = `https://www.reddit.com/r/${subreddit}/hot.json`;
    return getJsonFromReddit(subreddit, redditUrl);
  }

const getJsonFromReddit = (subreddit, redditUrl) => {
    return new Promise(function (resolve, reject) {
      axios.get(redditUrl)
        .then(function (response) {
          const dataChildren = response.data.data.children;
          const redditImagePosts = dataChildren.map((child) =>
            new RedditEntry(child.data, subreddit)
          );
          resolve(redditImagePosts);
        })
        .catch(function (error) {
          console.log(error);
          reject(error);
        })
        .finally(function () {
          // do stuff?
          // maybe allow devs to add another function to call?
        });
    });
  }

const saveRedditImageEntryToDisk = (imageEntry, targetDir) => {
    // do not write to disk, when no filename was parsed
    if (imageEntry.formattedFilename !== undefined) {
      const fsWriter = new ImageToFilesystemWriter();
      fsWriter.saveToDisk(imageEntry, targetDir);
      if (!downloaded.reddit.subreddits[imageEntry.subreddit]) downloaded.reddit.subreddits[imageEntry.subreddit] = [];
      if (!downloaded.reddit.subreddits[imageEntry.subreddit].includes(imageEntry.formattedFilename)){
            downloaded.reddit.subreddits[imageEntry.subreddit].push(imageEntry.formattedFilename);
            updatePosterDB({type: "downloaded", content: downloaded})
      }
      return imageEntry.formattedFilename;
    }
  }
  


(async () => {
for (const subreddit of subreddits) {
    try {
        const result = await getHotImagesOfSubReddit(subreddit);

        for (imageEntry of result) {
            const targetDirectory = path.resolve(__dirname, posterbot.imagesDir, 'hot');
            saveRedditImageEntryToDisk(imageEntry, targetDirectory);
         }
         await sleep(1000)
        
    }
    catch (error) {
        console.log(error)
    }
    }
})()



