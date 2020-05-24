import { Page } from 'puppeteer';
import { Logger } from '@nestjs/common';

export class BotBaseService {
  logger = new Logger(BotBaseService.name);

  page: Page | null;

  urls = {
    source: 'https://instagram.com',
  };

  levers = {
    likeRatio: 0.75, // DO NOT GO HIGHER THEN 0.90
    maxFollow: 8, // 7 to 13 follows per hour or 100 - 150 follows per day
    maxLike: 200, // 300 to 400 per day

    profilePhotosToLook: 3,
    mostRecentPhotosToLook: 2,
    topPostsToLook: 2,

    likeTopPosts: true,
    likeMostRecent: true,

    disableLike: false,
    // unlike 700 daily limit
    // add 1 photo per 1-3 days
    //
    minPhotos: 50,
    minFollows: 500,

    randomWaitMin: 3000,
    randomWaitMax: 5000,

    randomTypeMin: 100,
    randomTypeMax: 200,
  };

  config = {
    hashtags: ['#fujifilm_xseries', '#fujinon', '#fujilove', '#myfujilove'],
    headless: false,
    username: process.env.username,
    password: process.env.password,
    // /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=$(mktemp -d -t 'chrome-remote_data_dir')
    browserWsEndpoint:
      'ws://127.0.0.1:9222/devtools/browser/8161ba04-ec94-48c9-bac8-83b572b78c8a',
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

    profileStoryButton: 'header div[role="button"] canvas[height="168"]',
    profileStoryButtonRead: 'header div[role="button"] canvas[height="166"]',
    profileAmountOfPosts: 'span > span.g47SY',
    profileFollowerCount: 'a > span.g47SY',

    photoPopup: 'div[role="dialog"] article',
    photoPopupClose: 'div[role="dialog"] > .yiMZG button',
    photoPopupUsername: 'a.ZIAjV',
    photoPopupGreyLikeButton:
      'div[role="dialog"] section .fr66n button[type="button"]  svg[fill="#262626"]',
    photoPopupLikeButton: 'section.Slqrh > span > button',

    topPhotosGrid: (row: number, column: number) =>
      `article .weEfm:nth-child(${row}) > ._bz0w:nth-child(${column}) > a`,
    mostRecentGrid: (row: number, column: number) =>
      `article > div > div > .weEfm:nth-child(${row}) > ._bz0w:nth-child(${column}) > a`,

    profileGrid: (row: number, column: number) =>
      `article .weEfm:nth-child(${row}) > ._bz0w:nth-child(${column}) > a`,
  };

  // current state
  hashtag = null;
  username = null;

  hashtagIndex = 0;
  hashtagRow = 0;
  hashtagColumn = 0;

  profileIndex = 0;
  profileRow = 0;
  profileColumn = 0;

  // overall
  photosLiked = 0;
  likedUsers = [];
}
