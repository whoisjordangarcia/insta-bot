import { Injectable } from '@nestjs/common';
import { connect, launch, Page } from 'puppeteer';
import { shuffle } from 'lodash';

import { BotHelperService } from './bot-helper.service';
import { hashTagContext, profileContext } from './models/context';

@Injectable()
export class BotService extends BotHelperService {
  initPuppeter = async () => {
    const browser = await connect({
      browserWSEndpoint: this.config.browserWsEndpoint,
      defaultViewport: {
        width: 1080,
        height: 850,
      },
    });
    let instagramPage = null;
    const pages = await browser.pages();
    for (const page of pages) {
      if (page.url().includes('instagram.com')) {
        instagramPage = page;
        await this.sleep();
      }
    }

    if (instagramPage == null) {
      // bug here
      const page = await browser.newPage();
      instagramPage = await page.goto(this.urls.source);
      await instagramPage.waitFor(2500);
    }

    await this.sleep();
    return instagramPage;
  };

  loginProcedure = async () => {
    console.info('Filling in username');
    this.type(this.selectors.loginUsername, this.config.username);

    await this.waitAction();

    console.info('Filling in password');
    this.type(this.selectors.loginPassword, this.config.password);

    console.info('Logging in..');
    await this.page.click(this.selectors.loginSubmit);

    await this.page.waitForNavigation();
    await this.waitAction();
  };

  interactWithMostRecentHashtag = async (hashTag: string) => {
    if (!this.levers.likeMostRecent) {
      console.log(`${hashTag} | Most Recent Photos - Skipped`);
      return;
    }
    console.log(`${hashTag} | Most Recent Photos - Initiated`);

    return await this.gridHashtagInteraction(hashTag, {
      photosToLook: this.levers.mostRecentPhotosToLook,
      isMostRecent: true,
    });
  };

  interactWithTopPostHashtag = async (hashTag: string) => {
    if (!this.levers.likeTopPosts) {
      console.log(`${hashTag} | Top Photos - Skipped`);
      return;
    }

    console.log(`${hashTag} | Top Photos - Initiated`);

    return await this.gridHashtagInteraction(hashTag, {
      photosToLook: this.levers.topPostsToLook,
      isMostRecent: false,
    });
  };

  gridHashtagInteraction = async (
    category: string,
    options: {
      photosToLook: number;
      isMostRecent: boolean;
    },
  ) => {
    let photosLooked = 1;
    for (let row = 1; row < 4; row++) {
      for (let column = 1; column < 4; column++) {
        const tileSelector = !options.isMostRecent
          ? `article .weEfm:nth-child(${row}) > ._bz0w:nth-child(${column}) > a`
          : `article > div > div > .weEfm:nth-child(${row}) > ._bz0w:nth-child(${column}) > a`;

        await this.click(tileSelector);

        const username = await this.getUserName();

        await this.click(this.selectors.photoPopupUsername);

        await this.gridProfileInteraction(username, {
          photosToLook: this.levers.profilePhotosToLook,
          hashTagContext: {
            row: row,
            column: column,
            imageNumber: photosLooked,
            category: category,
          },
        });

        await this.goToHashTag(category);

        if (photosLooked > options.photosToLook) {
          console.log(`${category} | ${username} | Reached Limit.`);
          return;
        }
        photosLooked++;
      }
    }
    return;
  };

  gridProfileInteraction = async (
    username: string,
    options: {
      photosToLook: number;
      hashTagContext: {
        row: number;
        column: number;
        imageNumber: number;
        category: string;
      };
    },
  ) => {
    let photosLooked = 1;

    const postCount = await this.getPostCount();
    console.log(`Post Count ${postCount}`);
    if (postCount <= 50) {
      console.log('Post Count under 50. Skipping user');
      return;
    }

    const followerCount = await this.getFollowerCount();
    console.log(`Follower Count ${followerCount}`);
    if (followerCount <= 500) {
      console.log('Post Count under 500. Skipping user');
      return;
    }
    for (let row = 1; row < 4; row++) {
      for (let column = 1; column < 4; column++) {
        const tile = `article .weEfm:nth-child(${row}) > ._bz0w:nth-child(${column}) > a`;

        const newOptions = {
          ...options,
          profileContext: {
            row: row,
            column: column,
            imageNumber: photosLooked,
          },
        };

        await this.click(tile);

        await this.likePost(username, newOptions);

        await this.closePopup();

        if (photosLooked >= options.photosToLook) {
          console.log(
            `${options.hashTagContext.category} | ${username} | Reached Limit.`,
          );
          return;
        }
        photosLooked++;
      }
    }
    return;
  };

  likePost = async (
    username: string,
    options: {
      photosToLook: number;
      hashTagContext: hashTagContext;
      profileContext: profileContext;
    },
  ) => {
    let consolePrefix = `${options.hashTagContext.category} | ${username} | image:${options.profileContext.imageNumber}`;
    if (this.levers.disableLike) {
      console.log(
        `LIKED AMT:${this.photosLiked} | ${consolePrefix} | Like Disabled - Skipped!`,
      );
      return;
    }

    // bug with empty heart
    const hasEmptyHeart = await this.hasEmptyHeart();

    let action = '';
    if (!hasEmptyHeart) {
      action = 'Post already liked - Skipped!';
    } else if (Math.random() < this.levers.likeRatio) {
      this.photosLiked += 1;
      this.likedUsers.push(username);
      action = 'Liked!';
      await this.click(this.selectors.photoPopupLikeButton);
    } else {
      action = 'Like Ratio - Skipped!';
    }

    console.log(`LIKED AMT:${this.photosLiked} | ${consolePrefix} | ${action}`);

    await this.waitAction();
  };

  visitHashTags = async () => {
    const hashTags = shuffle(this.config.hashtags);
    console.log('Visiting hashtags', hashTags);

    for (let tagIndex = 0; tagIndex < hashTags.length; tagIndex++) {
      const hashTag = hashTags[tagIndex];

      console.log(`${hashTag} | Curently Exploring...`);

      await this.searchHashTag(hashTag);

      await this.interactWithTopPostHashtag(hashTag);

      await this.interactWithMostRecentHashtag(hashTag);
    }
  };

  async start(): Promise<string> {
    console.log('Instabot Initialized');

    this.page = await this.initPuppeter();

    this.printStats();

    this.waitAction();

    if (!this.isLoggedIn) {
      await this.loginProcedure();
    }

    //Close turn on notification modal after login
    await this.checkNotificationDialog();

    await this.navigateToHomePage();

    await this.visitHashTags();

    console.log('Finished. Here are the results....');

    console.log('Photos liked', this.photosLiked);
    console.log('Users liked with', this.likedUsers);

    return 'Done.';
  }
}
