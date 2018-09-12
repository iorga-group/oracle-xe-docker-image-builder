const puppeteer = require('puppeteer');
const debug = require('debug')('downloader');
const fs = require('fs');

const fileToDownload = process.argv[2] || 'oracle-xe-11.2.0-1.0.x86_64.rpm.zip';
const downloadFolder = process.argv[3] || '/tmp';

const otnUsername = process.argv[4] || process.env.OTN_USERNAME;
if (!otnUsername) {
  console.error('OTN_USERNAME not specified.');
  process.exit(1);
}

const otnPassword = process.argv[5] || process.env.OTN_PASSWORD;
if (!otnPassword) {
  console.error('OTN_PASSWORD not specified.');
  process.exit(2);
}

(async () => {

  const browser = await puppeteer.launch({
    // executablePath: process.env.CHROME_BIN || null,
    ignoreHTTPSErrors: true,
    // headless: false,
    // devtools: true,
    args: [
      '--no-sandbox', // to avoid "[0912/203419.155386:FATAL:zygote_host_impl_linux.cc(116)] No usable sandbox! Update your kernel or see https://chromium.googlesource.com/chromium/src/+/master/docs/linux_suid_sandbox_development.md for more information on developing with the SUID sandbox. If you want to live dangerously and need an immediate workaround, you can try using --no-sandbox."
      //   '--disable-setuid-sandbox'
      //   '--remote-debugging-port=9228'
      //   '--ignore-certificate-errors',
    ]
  });

  debug('before newPage, browser.version %o', await browser.version());

  const page = await browser.newPage();
  debug('after newPage');
  const client = await page.target().createCDPSession();

  page.on('console', msg => debug('PAGE LOG: %o', msg));
  page.on('error', err => console.error('PAGE ERROR: ', err));

  try {
    const waitUntilRealyLoadedOption = {waitUntil: ['load', 'domcontentloaded', 'networkidle0']};

    await page.goto('http://www.oracle.com/technetwork/database/database-technologies/express-edition/downloads/index.html', waitUntilRealyLoadedOption);

    // Validate cookies
    const cookieFrame = await page.frames().find(frame => (frame.name() && frame.name().startsWith('pop-frame')));

    const firstCookieAgreeSelector = 'div.cookiecat:nth-child(2) > div.switch > span.gwt-InlineHTML.off';
    await cookieFrame.waitForSelector(firstCookieAgreeSelector);
    await cookieFrame.click(firstCookieAgreeSelector);
    await cookieFrame.click('div.cookiecat:nth-child(3) > div.switch > span.gwt-InlineHTML.off');
    await cookieFrame.click('div.gdpr > div.pdynamicbutton > a.submit');
    const closePopupSelector = 'div.pdynamicbutton > a.close';
    await cookieFrame.waitForSelector(closePopupSelector);
    await cookieFrame.click(closePopupSelector);

    debug('after cookie agreement');
    // await page.screenshot({path: 'after_cookie_agreement.png'});

    // Agree
    await page.click('input[name=agreement]:first-of-type');

    const downloadUrl = `http://download.oracle.com/otn/linux/oracle11g/xe/${fileToDownload}`;

    const downloadLink = `a[href="${downloadUrl}"]`;
    await page.waitForSelector(downloadLink);

    debug('before download link clicked');
    // await page.screenshot({path: 'before_download_link_click.png'});

    // Click on the download link
    // const navigationPromise = page.waitForNavigation(waitUntilRealyLoadedOption); // this does not work, we will wait for a given selector instead
    await page.click(downloadLink);
    // await navigationPromise;

    debug('after download link clicked');
    // await page.screenshot({path: 'after_download_link_click.png'});

    // Authenticate
    const usernameInputSelector = 'input#sso_username';
    await page.waitForSelector(usernameInputSelector);

    debug('before login');
    // await page.screenshot({path: 'before_login.png'});

    await page.click(usernameInputSelector);
    await page.keyboard.type(otnUsername);

    // await page.$eval(usernameInputSelector, (el, otnUsername) => el.value = otnUsername); // must pass otnUsername in order to be defined in the running Chrome to avoid "Problem occured: Error: Evaluation failed: ReferenceError: otnUsername is not defined" thanks to https://stackoverflow.com/a/46098448/535203 // replace with page.keyboard.type after click into the input ? https://medium.com/@e_mad_ehsan/getting-started-with-puppeteer-and-chrome-headless-for-web-scrapping-6bf5979dee3e
    // await page.$eval('input#ssopassword', (el, otnPassword) => el.value = otnPassword);
    await page.click('input#ssopassword');
    await page.keyboard.type(otnPassword);

    // when clicking on the login button, it will download the file but in a separated event so the script will continue and cut the download. We could intercept the request as explained here https://kb.apify.com/actor/handling-file-download-with-puppeteer but this does not work, I think due to the specificity of the request

    await client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: downloadFolder});
    // await page.setRequestInterception(true); // tried the interception without success: timeout is reached even if the file is downloaded

    // const downloadPromise = page.waitForNavigation(Object.assign({timeout: 600*1000}, waitUntilRealyLoadedOption)); // this doesn't work: even after the file is downloaded, it will wait until the timeout
    await page.click('input[type="button"]');
    // await downloadPromise;

    debug('waiting for downloaded file to be created');
    // wait until the file is downloaded: chromium rename it from <filename>.crdownload to <filename>
    await new Promise(resolve => {
      const fsWatcher = fs.watch(downloadFolder, (eventType, filename) => {
        if (filename.endsWith(fileToDownload)) {
          console.log('File event: '+eventType+ ' on '+filename);
          resolve(filename);
          fsWatcher.close();
        }
      })
    });

    debug('end download script');

    // const finalRequest = await page.waitForRequest(request => request.url().indexOf('oracle-xe-11.2.0-1.0.x86_64.rpm.zip') >= 0);
    // await finalRequest.continue(); // this fails if setRequestInterception is not set, and if it is, the download request is never reached...

    // const finalDownloadRequest = await new Promise(resolve => {
    //   page.on('request', request => {
    //     if (request.url().indexOf('oracle-xe-11.2.0-1.0.x86_64.rpm.zip') >= 0) {
    //       resolve(request);
    //     } else {
    //       request.continue();
    //     }
    //   });
    // });
    // await finalDownloadRequest.continue(); // this is not working either

    // const interceptedRequest = await new Promise(resolve => {
    //   page.on('requestfinished', request => {
    //     if (request.url().indexOf('oracle-xe-11.2.0-1.0.x86_64.rpm.zip') >= 0) {
    //       resolve(request);
    //     }
    //     request.continue();
    //   });
    // });
    // await interceptedRequest.continue();
    // // replay the intercepted request by copying cookies
    // const cookies = await page.cookies();
    // const options = {
    //   encoding: null,
    //   method: interceptedRequest._method,
    //   uri: interceptedRequest._url,
    //   body: interceptedRequest._postData,
    //   headers: interceptedRequest._headers
    // };
    // options.headers.Cookie = cookies.map(ck => ck.name + '=' + ck.value).join(';');
    // // and launch the request
    // request(options).pipe(fs.createWriteStream('oracle-xe-11.2.0-1.0.x86_64.rpm.zip'));

    // await page.screenshot({path: 'screen.png'});
    // await page.pdf({path: 'screen.pdf', displayHeaderFooter: true});
  } catch (error) {
    console.error('Problem occured: %O', error);

    // await page.screenshot({path: 'error.png'});
    // await page.pdf({path: 'error.pdf', displayHeaderFooter: true});
  }

  browser.close();
  debug('browser closed');

})();
