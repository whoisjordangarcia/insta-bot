import { Injectable } from '@nestjs/common';
import { connect } from 'puppeteer';
import { shuffle } from 'lodash';

import { BotHelperService } from './bot-helper.service';

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
      }
    }

    if (instagramPage == null) {
      // bug here
      const page = await browser.newPage();
      instagramPage = await page.goto(this.urls.source);
      await page.waitFor(2500);
    }

    await this.sleep();
    return instagramPage;
  };

  loginProcedure = async () => {
    this.logger.verbose('Filling in username');
    await this.type(this.selectors.loginUsername, this.config.username);

    this.logger.verbose('Filling in password');
    await this.type(this.selectors.loginPassword, this.config.password);

    this.logger.verbose('Logging in..');
    await this.page.click(this.selectors.loginSubmit);

    await this.page.waitForNavigation();
  };

  interactWithMostRecentHashtag = async () => {
    if (!this.levers.likeMostRecent) {
      this.logger.verbose(`${this.hashtag} | Most Recent Photos - Skipped`);
      return;
    }
    this.logger.log(`${this.hashtag} | Most Recent Photos - Initiated`);

    return await this.gridHashtagInteraction(
      this.selectors.mostRecentGrid,
      this.levers.mostRecentPhotosToLook,
    );
  };

  interactWithTopPostHashtag = async () => {
    if (!this.levers.likeTopPosts) {
      this.logger.verbose(`${this.hashtag} | Top Photos - Skipped`);
      return;
    }

    this.logger.log(`${this.hashtag} | Top Photos - Initiated`);

    return await this.gridHashtagInteraction(
      this.selectors.topPhotosGrid,
      this.levers.topPostsToLook,
    );
  };

  gridHashtagInteraction = async (
    gridSelector: (row: number, column: number) => string,
    photosToLook: number,
  ) => {
    let hashtagIndex = 1;
    for (let row = 1; row < 4; row++) {
      for (let column = 1; column < 4; column++) {
        const tileSelector = gridSelector(row, column);

        await this.click(tileSelector);

        const username = await this.getUserName();
        this.username = username;
        this.hashtagIndex = hashtagIndex;
        this.hashtagColumn = column;
        this.hashtagRow = row;

        await this.click(this.selectors.photoPopupUsername);

        await this.gridProfileInteraction(this.levers.profilePhotosToLook);

        await this.goToHashTag(this.hashtag);

        if (hashtagIndex > photosToLook) {
          this.hashtagIndex = -1;
          this.log('Reached Limit Hashtag.');
          return;
        }
        hashtagIndex++;
      }
    }
    return;
  };

  gridProfileInteraction = async (photosToLook: number) => {
    let photoIndex = 1;

    const valid = await this.validateProfile();

    if (!valid) {
      this.log('Invalid Profile. Skipping');
      await this.goToHashTag(this.hashtag);
      return;
    }

    const hasSeenStories = await this.hasSeenStories();
    if (!hasSeenStories) {
      await this.viewStories();
    } else {
      this.logger.log('Already screen stories');
    }

    for (let row = 1; row < 100; row++) {
      for (let column = 1; column < 4; column++) {
        const tileSelector = this.selectors.profileGrid(row, column);

        this.profileIndex = photoIndex;
        this.profileColumn = column;
        this.profileRow = row;

        await this.click(tileSelector);

        await this.likePost();

        await this.closePopup();

        if (photoIndex >= photosToLook) {
          this.profileIndex = -1;
          this.log('Reached Limit Profile.');
          return;
        }
        photoIndex++;
      }
    }
    return;
  };

  likePost = async () => {
    if (this.levers.disableLike) {
      this.log('Like Disabled - Skipped!');
      return;
    }

    // bug with empty heart
    const hasGreyHeart = await this.hasGreyHeart();

    if (!hasGreyHeart) {
      this.log('Post already liked - Skipped!');
    } else if (Math.random() < this.levers.likeRatio) {
      this.photosLiked += 1;
      this.likedUsers.push(this.username);

      this.log('Liked!');
      await this.click(this.selectors.photoPopupLikeButton);
    } else {
      this.log('Like Ratio - Skipped!');
    }

    await this.waitAction();
  };

  visitHashTags = async () => {
    const hashTags = shuffle(this.config.hashtags);
    this.logger.log(`Visiting hashtags ${hashTags}`);

    for (let tagIndex = 0; tagIndex < hashTags.length; tagIndex++) {
      this.hashtag = hashTags[tagIndex];

      this.logger.log(`${this.hashtag} | Curently Exploring...`);

      await this.searchHashTag(this.hashtag);

      await this.interactWithTopPostHashtag();

      await this.interactWithMostRecentHashtag();
    }
  };

  async start(): Promise<string> {
    this.logger.log('Instabot Initialized');

    this.page = await this.initPuppeter();

    this.printStats();

    this.waitAction();

    const isLoggedIn = await this.isLoggedIn();
    if (!isLoggedIn) {
      await this.loginProcedure();
    }

    await this.checkNotificationDialog();

    await this.navigateToHomePage();

    await this.visitHashTags();

    this.printResults();

    await this.viewStories();
    return 'Done.';
  }
}
