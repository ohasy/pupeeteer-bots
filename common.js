const fs = require("fs");
const downloaded_json_file = "./DB/post_downloaded.json";
const uploaded_json_file = "./DB/post_uploaded.json";


const fixDownloadUploadJson = (json) => {
    if (!json.reddit) json.reddit = {subreddits: {}}
    else if (!json.reddit.subreddits) json.reddit.subreddits = {}
    return json;
}

const getPosterDB = ({type}) => {
    let content = {};
    if (type === "uploaded") {
         content = JSON.parse(fs.readFileSync(uploaded_json_file) || "{}");
    } else if (type === "downloaded") {
        content = JSON.parse(fs.readFileSync(downloaded_json_file) || "{}");
    }
    return fixDownloadUploadJson(content);

}

const updatePosterDB = ({type, content}) => {
    if (type === "uploaded") {
        fs.writeFileSync(uploaded_json_file, JSON.stringify(content))
    } else if (type === "downloaded") {
        fs.writeFileSync(downloaded_json_file, JSON.stringify(content))

    }
}

const sleep = (ms, dev = 1) => {
    const msWithDev = ((Math.random() * dev) + 1) * ms;
    return new Promise(resolve => setTimeout(resolve, msWithDev));
};

module.exports = {
    getPosterDB,
    updatePosterDB,
    sleep
}