import { Page } from 'puppeteer';

export class BotBaseService {
  page: Page | null;

  urls = {
    source: 'https://instagram.com',
  };

  levers = {
    likeRatio: 0.75, // DO NOT GO HIGHER THEN 0.90
    maxFollow: 8, // 7 to 13 follows per hour or 100 - 150 follows per day
    maxLike: 200, // 300 to 400 per day

    profilePhotosToLook: 3,
    mostRecentPhotosToLook: 5,
    topPostsToLook: 9,

    likeTopPosts: false,
    likeMostRecent: true,

    disableLike: false,
    // unlike 700 daily limit
    // add 1 photo per 1-3 days
    //
    randomWaitMin: 3000,
    randomWaitMax: 5000,

    randomTypeMin: 100,
    randomTypeMax: 200,
  };

  config = {
    // 27 (9*3)
    hashtags: ['#mechanicalkeyboards'],
    headless: false,
    username: 'whoisjordangarcia',
    password: 'LHJcapHgqo6gi3ENNsrK',
    browserWsEndpoint:
      'ws://127.0.0.1:9222/devtools/browser/28ddf8cc-0a19-4a3f-9202-c3c75d06e13f',
  };

  // selectors
  selectors = {
    loginUsername: '[type="text"]',
    loginPassword: 'input[type="password"]',
    loginSubmit: 'button[type="submit"]',

    homepage: 'nav a[href="/"]',
    loggedinState: `a[href="/${this.config.username}/"]`,
    searchbox: 'nav input[type="text"]',
    clearSearchBox: '.coreSpriteSearchClear',

    notificationDialog: 'div[role="dialog"]',
    notificationDialogNotNow: 'div[role="dialog"] .HoLwm',

    hashTagsTopImages: 'article h2 + div a',
    hashTagsMostRecentImage: 'article > h2 + div a',

    profileAmountOfPosts: 'span > span.g47SY',
    profileFollowerCount: 'a > span.g47SY',

    photoPopup: 'div[role="dialog"] article',
    photoPopupClose: 'div[role="dialog"] > .yiMZG button',
    photoPopupUsername: 'a.ZIAjV',
    photoPopupGreyLikeButton:
      'section button[type="button"] svg[fill="#262626"]',
    photoPopupLikeButton: 'section.Slqrh > span > button',
  };

  photosLiked = 0;
  likedUsers = [];
}
