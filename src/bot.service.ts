import { Injectable } from '@nestjs/common';
import { connect, launch, Page } from 'puppeteer';
import { shuffle } from 'lodash';

@Injectable()
export class BotService {
  urls = {
    source: 'https://instagram.com',
  };

  levers = {
    likeRatio: 0.75, // DO NOT GO HIGHER THEN 0.90
    maxFollow: 8, // 7 to 13 follows per hour or 100 - 150 follows per day
    maxLike: 200, // 300 to 400 per day

    mostRecentPhotosToLook: 50,
    topPostsToLook: 9,

    likeTopPosts: true,
    likeMostRecent: false,

    disableLike: true,
    // unlike 700 daily limit
    // add 1 photo per 1-3 days
    //
    randomWaitMin: 2000,
    randomWaitMax: 3000,
  };

  config = {
    // hashtags: ['#fujifilm', '#fujifilm_xseries', '#fuji', '#fujifeed'],
    hashtags: ['#newyork_ig', '#nycfood', '#nyc', '#nycfashion', '#nycgo'],
    // hashtags: [
    //   '#iso',
    //   '#isolation',
    //   '#isolationlife',
    //   '#isolating',
    //   '#isolyfe',
    //   '#iso2020',
    //   '#isolation2020',
    // ], // 150 likes
    // hashtags: ['#newyorklike', '#newyorkgram', '#newyorknewyork', '#nycity'],
    // hashtags: ['#selfisolation'],
    headless: false,
    username: 'whoisjordangarcia',
    password: 'LHJcapHgqo6gi3ENNsrK',
    browserWsEndpoint:
      'ws://127.0.0.1:9222/devtools/browser/e8d4882e-640c-4b62-a1fd-c796bc399e28',
  };

  // selectors
  selectors = {
    loginUsername: '[type="text"]',
    loginPassword: 'input[type="password"]',
    loginSubmit: 'button[type="submit"]',

    homepage: 'nav a[href="/"]',
    loggedinState: `a[href="/${this.config.username}/"]`,
    searchbox: 'nav input[type="text"]',

    hashTagsTopImages: 'article h2 + div a',
    hashTagsMostRecentImage: 'article > h2 + div a',

    photoPopup: 'div[role="dialog"] article',
    photoPopupClose: '.yiMZG button',
    photoPopupUsername: 'a.ZIAjV',
    photoPopupGreyLikeButton: 'button.wpO6b svg[fill="#262626"]',
    photoPopupLikeButton: 'button.wpO6b:nth-child(1)',
  };

  startBrowser = async () => {
    const browser = await launch({
      headless: this.config.headless,
      // executablePath:
      //   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
    return await browser.newPage();
  };

  actionRandomWait = (): number => {
    const waitTime =
      Math.floor(Math.random() * this.levers.randomWaitMax) +
      this.levers.randomWaitMin;
    console.log(`Random wait time: ${waitTime}`);
    return waitTime;
  };

  clearInput = async (page: Page, selector: string) => {
    const searchInput = await page.$(selector);
    await searchInput.click({ clickCount: 3 });
    await searchInput.press('Backspace');
  };

  initPuppeter = async () => {
    const browser = await connect({
      browserWSEndpoint: this.config.browserWsEndpoint,
    });
    let instagramPage = null;
    const pages = await browser.pages();
    for (const page of pages) {
      if (page.url().includes('instagram.com')) {
        instagramPage = page;
        this.sleep();
        instagramPage.setViewport({ width: 1080, height: 850 });
      }
    }

    if (instagramPage == null) {
      const page = await browser.newPage();
      instagramPage = await page.goto(this.urls.source);
      this.sleep();
      instagramPage.setViewport({ width: 1080, height: 850 });
    }

    return instagramPage;
  };

  checkNotificationDialog = async (page: Page) => {
    try {
      console.info('Checking notification dialog');
      await page.waitFor(this.actionRandomWait());
      await page.waitForSelector('div[role="dialog"]', { timeout: 200 });
      await page.click('div[role="dialog"] .HoLwm');
    } catch (e) {
      console.log('Turn on notifications not found. Skipping.');
    }
  };

  loginProcedure = async (page: Page) => {
    console.info('Filling in username');
    await page.focus(this.selectors.loginUsername);
    await page.keyboard.type(this.config.username, {
      delay: 100,
    });

    await page.waitFor(this.actionRandomWait());

    console.info('Filling in password');
    await page.focus(this.selectors.loginPassword);
    await page.keyboard.type(this.config.password, {
      delay: 200,
    });

    await page.waitFor(this.actionRandomWait());
    console.info('Logging in..');
    await page.click(this.selectors.loginSubmit);
    await page.waitForNavigation();
  };

  navigateToHomePage = async (page: Page) => {
    console.log('Navigating to homepage');
    await page.focus(this.selectors.homepage);
    await page.click(this.selectors.homepage);
    await page.waitFor(this.actionRandomWait());
  };

  searchHashTag = async (page: Page, hashTag: string) => {
    this.clearInput(page, this.selectors.searchbox);
    await page.focus(this.selectors.searchbox);
    await page.waitFor(this.actionRandomWait());

    await page.keyboard.type(hashTag, {
      delay: 200,
    });
    await page.waitFor(this.actionRandomWait());

    console.log('Selecting hashtag');
    await page.keyboard.press('ArrowDown');
    await page.waitFor(this.actionRandomWait());
    await page.keyboard.press('Enter');
  };

  interactWithMostRecentHashtag = async (page: Page, hashTag: string) => {
    if (!this.levers.likeMostRecent) {
      console.log('Most Recent Photos is turned off! Skipping..');
      return;
    }
    console.log('>>> Selecting most recent <<<');

    await page.waitFor(this.actionRandomWait());
    await page.focus(this.selectors.hashTagsMostRecentImage);
    await page.click(this.selectors.hashTagsMostRecentImage);

    await page.waitForSelector(this.selectors.photoPopup);

    await this.interactiveWithPosts(
      page,
      hashTag,
      this.levers.mostRecentPhotosToLook,
    );
  };

  interactWithTopPostHashtag = async (page: Page, hashTag: string) => {
    if (!this.levers.likeTopPosts) {
      console.log('Top Photos is turned off! Skipping..');
      return;
    }
    console.log('>>> Selecting top posts <<<');
    await page.waitFor(this.actionRandomWait());
    await page.focus(this.selectors.hashTagsTopImages);
    await page.click(this.selectors.hashTagsTopImages);

    await page.waitForSelector(this.selectors.photoPopup);

    await this.interactiveWithPosts(page, hashTag, this.levers.topPostsToLook);
  };

  interactiveWithPosts = async (page: Page, hashTag: string, photosToLook) => {
    for (let index = 0; index <= photosToLook; index++) {
      console.log(`${hashTag} | Image ${index}`);

      let username = null;
      let photoError = false;
      try {
        username = await page.evaluate(selectors => {
          const element: HTMLLinkElement = document.querySelector(
            selectors.photoPopupUsername,
          );
          return Promise.resolve(element ? element.innerText : '');
        }, this.selectors);
      } catch (e) {
        console.log(`${hashTag} | Unable to load image ${index}`);
        photoError = true;
      }

      if (!photoError) {
        console.log(`${hashTag} | ${username} | INTERACTING`);

        // bug with empty heart
        const hasEmptyHeart = await page.$(
          this.selectors.photoPopupGreyLikeButton,
        );

        await page.focus(this.selectors.photoPopupGreyLikeButton);
        if (!this.levers.disableLike) {
          if (!hasEmptyHeart) {
            console.log(
              `${hashTag} | ${username} | Post already liked - Skipped!`,
            );
          } else if (Math.random() < this.levers.likeRatio) {
            console.log(`${hashTag} | ${username} | Liked!`);
            await page.click(this.selectors.photoPopupLikeButton); //click the like button
            await page.waitFor(this.actionRandomWait());
          } else {
            console.log(`${hashTag} | ${username} | Like Ratio - Skipped!`);
          }
        } else {
          console.log(`${hashTag} | DISABLE LIKE`);
        }
      }

      console.log(`${hashTag} | >>> Next Photo! <<<`);
      await page.keyboard.press('ArrowRight');
      await page.waitFor(this.actionRandomWait());
    }
  };

  visitHashTags = async (page: Page) => {
    const hashTags = shuffle(this.config.hashtags);
    console.log('Visiting hashtags', hashTags);

    for (let tagIndex = 0; tagIndex < hashTags.length; tagIndex++) {
      const hashTag = hashTags[tagIndex];

      console.log(`<<<< Currently Exploring >>>> ${hashTag}`);

      await this.searchHashTag(page, hashTag);

      await this.interactWithMostRecentHashtag(page, hashTag);

      try {
        await page.focus(this.selectors.photoPopupClose);
        await page.click(this.selectors.photoPopupClose);
      } catch (e) {}

      await this.interactWithTopPostHashtag(page, hashTag);
    }
    console.log('Fin.');
  };

  sleep = async () => {
    return await setTimeout(() => {
      console.log('waiting...');
    }, this.actionRandomWait());
  };

  async start(): Promise<string> {
    const page = await this.initPuppeter();
    console.log('Puppeteer Initialized');
    this.sleep();
    await page.waitFor(this.actionRandomWait());

    try {
      console.info('Checking if user is logged in.');
      await page.waitFor(this.actionRandomWait());
      await page.waitForSelector(this.selectors.loggedinState, {
        timeout: 4000,
      });
      console.info('User is logged in.');
    } catch (e) {
      console.log('User is logged out.');
      await this.loginProcedure(page);
    }

    //Close turn on notification modal after login
    this.checkNotificationDialog(page);

    this.navigateToHomePage(page);

    this.visitHashTags(page);

    return 'Done.';
  }
}
