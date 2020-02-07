const process = require('process');
var async = require('async');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const rp = require('request-promise');
const ProgressBar = require('progress');
const Axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');

const cookiesPath = "./cookies.json";
const downloaded_id_path = "./docker_downloaded.txt"
const courseId = "1035000"
// const courseId = "1754098"
const courseTitle = 'Docker Mastery: with Kubernetes +Swarm from a Docker Captain';
const courseUrl = "https://www.udemy.com/course/docker-mastery/"

var downloading_lecture=""

const bearerToken = "Bearer Y9fBvuWfee3yamq5Mgr6FHRbrXX2mqnoOYrDajOc"


async function fetchVideoLink(chapter_name, lecture_name, lecture_id){
    const url = courseUrl+"learn/lecture/"+lecture_id+"?start=30#overview";
    const browser = await puppeteer.launch({headless:false});
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36');
   
    const session = await page.target().createCDPSession();
    const {windowId} = await session.send('Browser.getWindowForTarget');
    await session.send('Browser.setWindowBounds', {windowId, bounds: {windowState: 'minimized'}});
    
    const previousSession = fs.existsSync(cookiesPath)
    if (previousSession) {
        const content = fs.readFileSync(cookiesPath);
        const cookiesArr = JSON.parse(content);
        if (cookiesArr.length !== 0) {
            for (let cookie of cookiesArr) {
                await page.setCookie(cookie)
            }
            // console.log('Session has been loaded in the browser')
        }
    }
    try {
        await page.goto(url);
        await page.waitForSelector("[class='vjs-tech']");
        await sleep(2000);
        const videoLink = await page.evaluate(() => {
            return document.querySelector('.vjs-tech').getAttribute('src');
        });
        browser.close();
        return {chapter_name,lecture_name,videoLink};
    } catch (error) {
        browser.close();
        
    }
    return {};



    // enable request interception
    // await page.setRequestInterception(true);
    // // add header for the navigation requests
    // page.on('request', request => {
    // // Do nothing in case of non-navigation requests.
    // if (!request.isNavigationRequest()) {
    //     request.continue();
    //     return;
    // }
    // // Add a new header for navigation request.
    // const headers = request.headers();
    // headers['accept'] = 'application/json, text/plain, */*';
    // headers['authorization'] = 'Bearer lZ1YgoWdNMhXL6ZRqrMbfn0Xjlqsr05oAW0sqDpB';
    // headers['referer'] = 'https://www.udemy.com/course/the-data-science-course-complete-data-science-bootcamp/learn/lecture/10762750?components=buy_button%2Cdiscount_expiration%2Cgift_this_course%2Cintroduction_asset%2Cpurchase%2Cdeal_badge%2Credeem_coupon';
    // headers['sec-fetch-mode'] = 'cors';
    // headers['x-requested-with'] = 'XMLHttpRequest';
    // request.continue({ headers });
    // });
   
    // courseTitle = await page.evaluate(() => document.title)
    // await page.waitForSelector("[class='play-button']");
    // await page.click("[class='play-button']");
    // await page.waitForSelector("[class='w100p']");

    // Pure

    // await page.waitForSelector("[class='section--title--eCwjX']");
    // const sectionTitle = await page.evaluate(() => {
    //     var element =  document.querySelector('.section--section--BukKG');
    //     if (element.dataset['aria-extended'] == 'true') {
    //         console.log(element.innerText)
    //     }
    //     // .replace(/[\n\\]/g, '- ');
    // });

    // const videoName = await page.evaluate(() => {
    //     return document.querySelector('.curriculum-item-link--is-current--31BPo > .item-link').getAttribute('aria-label').replace(/[\n\\]/g, ' ');
    // });

    // console.log(sectionTitle);
    // console.log(videoLink);
    //click login
    // await page.waitForSelector("[class='btn btn-quaternary']");
    // await page.click("[class='btn btn-quaternary']");
    // fill email
    // await page.waitForSelector("[name='email']");
    // await page.$eval('input[name=email]', el => el.value = 'tarun13317@gmail.com');
    // await page.keyboard.down("Tab");
    // await page.$eval('input[name=password]', el => el.value = 'h3llo2uh3llo2u');
    // await page.click("[name ='submit']");
}

async function saveVideo(videoData, lecture_id, callback){
    // {chapter_name,lecture_name,videoLink};
    const course_dir = './'+courseTitle;
    const section_dir = course_dir+'/'+videoData.chapter_name;
    const videoFile = section_dir+'/'+videoData.lecture_name+'.mp4';
    const url = videoData.videoLink;

    if (!fs.existsSync(course_dir)){
        fs.mkdirSync(course_dir);
    }

    if (!fs.existsSync(section_dir)){
        fs.mkdirSync(section_dir);
    }
    const { data, headers } = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
      })
      const totalLength = headers['content-length']
    
      // console.log("                 Downloading to ...: "+videoData.lecture_name);
      const progressBar = new ProgressBar('                 '+"lecture ["+downloading_lecture+"] "+parseFloat(Math.round((totalLength/1024)/1024))+' MB'+'-> [:bar] :percent :etas', {
          width: 40,
          complete: '=',
          incomplete: ' ',
          renderThrottle: 1,
          total: parseInt(totalLength)
        })

    const writer = fs.createWriteStream(videoFile);
    data.pipe(writer)

    return new Promise((resolve, reject)=> {
        data.on('data', (chunk) => progressBar.tick(chunk.length))
        data.on('end', () => {
            resolve('DownloadComplete')
            // console.log(videoData);
            
        })
        data.on('error', err => {
            reject('DownloadFailed')
        })

    });
}

async function getCourseCurriculum(id){
    const apiurl = "https://www.udemy.com/api-2.0/courses/"+id+"/subscriber-curriculum-items/?page_size=1400&fields[lecture]=title,object_index&fields[chapter]=title,object_index"
    var options = {
        uri:apiurl,
        headers: {
            'accept': 'application/json, text/plain, */*',
            'authorization': bearerToken,
            // 'referer' : 'https://www.udemy.com/course/the-data-science-course-complete-data-science-bootcamp/learn/lecture/10762750?components=buy_button%2Cdiscount_expiration%2Cgift_this_course%2Cintroduction_asset%2Cpurchase%2Cdeal_badge%2Credeem_coupon',
            'sec-fetch-mode' : 'cors',
            'x-requested-with':'XMLHttpRequest'
        },
        json: true // Automatically parses the JSON string in the response
    };
    
    return rp(options)
    .then(function (jsonResponse) {
        // console.log(jsonResponse.results);
        return jsonResponse.results;
    })
    .catch(function (err) {
        console.log('API call failed...'+err);
    });
}

async function parseAndSaveCourse(jsonarray){
    var data = fs.readFileSync(downloaded_id_path, 'utf8');
    var idArr = data.split(',');
    var currentChapter = "";
    var lectureCounter = 1;

    async.eachLimit(jsonarray, 1, async function(object, done) {
        var jsonObj = object;
        if(jsonObj.hasOwnProperty('_class')){
            if(jsonObj._class=='quiz'){
                //
            }
            else if(jsonObj._class=='chapter'){
                lectureCounter=1;
                chapter_counter = jsonObj.object_index;
                currentChapter = chapter_counter+'_'+jsonObj.title;
                process.stdout.write("\n*****"+currentChapter+"*****");

            }else if(jsonObj._class=='lecture'){
                if(idArr.includes(''+jsonObj.id)){
                    
                }else{
                    //Download lecture here
                    var currentLecture = lectureCounter+'_'+jsonObj.title;
                    downloading_lecture = (chapter_counter+"."+lectureCounter)
                    process.stdout.write(chalk.red("\n          "+chapter_counter+"."+currentLecture));
                    try {
                        const videoData =  await fetchVideoLink(currentChapter, currentLecture, jsonObj.id)
                        await saveVideo(videoData, jsonObj.id).then((message) => {
                            // done(message);/
                            //save the id of downloaded video only if the download is complete
                            if(message=="DownloadComplete"){
                                try {
                                    var log = fs.createWriteStream(downloaded_id_path, {
                                        flags: 'a'
                                    })
                                    log.write(jsonObj.id+',');
                                    // console.log();
                                                    
                                    process.stdout.write("                 Downloaded, id saved for future:"+jsonObj.id);
 
                                } catch (error) {
                                    console.log(error)
                                }
                            }
                        });
                    } catch (error) {
                        if(error.code=="ERR_INVALID_ARG_TYPE"){
                            try {
                                var log = fs.createWriteStream(downloaded_id_path, {
                                    flags: 'a'
                                  })
                                    log.write(jsonObj.id+',');
                                    
                                    process.stdout.write("\n                lecture having resources: id saved for future:"+jsonObj.id);
                            } catch (error) {
                                console.log(error)
                            }
                        }
                        // console.log(error)
                    }              
                }
                lectureCounter++; 
            }
       }
    }, (error) => {
        console.log(error);
    });
}

async function downloadCourse(){
    if (process.pid) {
        console.log('Process id: ' + process.pid);
      }
    const json = await getCourseCurriculum(courseId);
    // console.log(json);
    await parseAndSaveCourse(json);

    // const videoData = await fetchVideoLink(url);
    // const writeStatus = await saveVideo(videoData);
 }

 function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

 downloadCourse();