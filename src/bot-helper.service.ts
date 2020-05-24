import { Page } from 'puppeteer';
import numbro from 'numbro';

import { BotBaseService } from './bot-base.service';

export class BotHelperService extends BotBaseService {
  printStats = () => {
    let number = 1;

    if (this.levers.likeTopPosts) {
      number = this.levers.profilePhotosToLook * this.levers.topPostsToLook;
    }

    if (this.levers.likeMostRecent) {
      number =
        number +
        this.levers.profilePhotosToLook * this.levers.mostRecentPhotosToLook;
    }
    this.logger.log(`Potential to like: ${number}`);
  };

  validateProfile = async () => {
    let valid = true;
    const postCount = await this.getPostCount();

    this.logger.verbose(`Post Count ${postCount}`);

    if (postCount <= this.levers.minPhotos) {
      this.logger.verbose(
        `Post count under ${this.levers.minPhotos}. Invalid profile.`,
      );
      valid = false;
    }

    const followerCount = await this.getFollowerCount();

    this.logger.verbose(`Followers Count ${followerCount}.`);

    if (followerCount <= this.levers.minFollows) {
      this.logger.verbose(
        `Post count under ${this.levers.minFollows}. Invalid profile.`,
      );
      valid = false;
    }
    return valid;
  };

  printResults = () => {
    this.logger.log('Finished. Here are the results....');

    this.logger.log(`Photos liked ${this.photosLiked}`);
    this.logger.log(`Users liked with ${this.likedUsers}`);
  };

  goToHashTag = async (category: string) => {
    this.logger.verbose(`Navigating to hashtag page ${category}`);

    await this.page.goto(
      `${this.urls.source}/explore/tags/${category.replace('#', '')}/`,
    );
    await this.waitAction();
  };

  viewStories = async () => {
    this.logger.log('About to view story');

    try {
      await this.waitForElement(this.selectors.profileStoryButton, 200);

      this.click(this.selectors.profileStoryButton);
    } catch (e) {
      this.logger.verbose('Stories already viewed');
    }

    try {
      await this.page.waitForSelector(this.selectors.profileAmountOfPosts, {
        visible: true,
        timeout: 100000,
      });

      this.logger.log('Finished watching stories!');
    } catch (e) {
      console.log('Could not detect a screen close.');
    }
  };

  checkNotificationDialog = async () => {
    // Close turn on notification modal after login
    try {
      this.logger.log('Checking notification dialog');

      await this.waitForElement(this.selectors.notificationDialog, 200);

      await this.click(this.selectors.notificationDialogNotNow);

      this.logger.verbose('Has found notification dialog');

      await this.waitAction();
    } catch (e) {
      this.logger.verbose('Turn on notifications not found. Skipping.');
    }
  };

  navigateToHomePage = async () => {
    if (this.page.url() === this.urls.source) {
      return;
    }
    this.logger.log(this.page.url());
    this.logger.log('Navigating to homepage');

    await this.click(this.selectors.homepage);
  };

  sleep = () => {
    this.logger.log('Waiting...');
    return new Promise(resolve => {
      setTimeout(resolve, 5000);
    });
  };

  getElementValue = async (selector: string): Promise<string> => {
    let value = null;
    try {
      value = await this.page.evaluate(select => {
        const element: HTMLLinkElement = document.querySelector(select);
        return Promise.resolve(element ? element.innerText : '');
      }, selector);
    } catch (e) {}

    await this.waitAction();

    return value;
  };

  getUserName = async (): Promise<string> => {
    return await this.getElementValue(this.selectors.photoPopupUsername);
  };

  getPostCount = async (): Promise<number> => {
    const postCount = await this.getElementValue(
      this.selectors.profileAmountOfPosts,
    );
    const parsedCount = numbro().unformat(numbro(postCount).format('3a'));
    return parsedCount;
  };

  getFollowerCount = async () => {
    const followerCount = await this.getElementValue(
      this.selectors.profileFollowerCount,
    );
    const parsedCount = numbro().unformat(numbro(followerCount).format('3a'));
    return parsedCount;
  };

  clearInput = async () => {
    this.logger.verbose('Clearing input');
    try {
      await this.waitForElement(this.selectors.clearSearchBox, 100);

      this.logger.debug('Has found clear input button');

      await this.click(this.selectors.clearSearchBox);
    } catch (e) {}
    await this.waitAction();
  };

  searchHashTag = async (hashTag: string) => {
    this.logger.verbose('Performing Hashtag search');
    await this.clearInput();

    this.logger.verbose('Typing hashtag');
    await this.type(this.selectors.searchbox, hashTag);

    this.logger.verbose('Selecting hashtag');
    await this.page.keyboard.press('ArrowDown');
    await this.waitAction();

    await this.page.keyboard.press('Enter');
    await this.waitAction();
  };

  closePopup = async () => {
    try {
      this.logger.verbose('Closing popup.');
      this.click(this.selectors.photoPopupClose);
    } catch (e) {
      this.logger.debug('Could not find close button');
    }

    await this.waitAction();
  };

  type = async (selector: string, value: string) => {
    try {
      await this.page.focus(selector);

      await this.page.keyboard.type(value, {
        delay:
          Math.floor(Math.random() * this.levers.randomTypeMax) +
          this.levers.randomTypeMin,
      });

      await this.waitAction();
    } catch (e) {
      this.logger.error(`Could not type for '${selector}' - '${value}'`);
    }
  };

  click = async (selector: string, scroll: boolean = true) => {
    try {
      this.logger.verbose(`clicking '${selector}'`);

      await this.page.focus(selector);

      if (scroll) {
        await this.page.evaluate(select => {
          const element = document.querySelector(select);
          if (
            typeof element.scrollIntoView !== 'undefined' &&
            typeof element.scrollIntoView === 'function'
          ) {
            element.scrollIntoView();
          }
        }, selector);
      }

      await this.waitAction();

      await this.page.evaluate(select => {
        document.querySelector(select).click();
      }, selector);

      await this.waitAction();
    } catch (e) {
      this.logger.error(`Could not type for '${selector}'`);
    }
  };

  isLoggedIn = async () => {
    let loggedIn = false;
    this.logger.verbose('Checking if user is logged in.');
    try {
      await this.waitForElement(this.selectors.loggedinState, 200);
      this.logger.verbose('User is logged in.');
      loggedIn = true;
    } catch (e) {
      this.logger.verbose('User is logged out.');
      loggedIn = false;
    }
    return loggedIn;
  };

  hasGreyHeart = async () => {
    let haGreyHeart = false;
    try {
      await this.page.waitForSelector(this.selectors.photoPopupGreyLikeButton);

      this.logger.debug('Found Grey Heart');

      haGreyHeart = true;
    } catch (e) {
      this.logger.debug('Could not find grey heart');
    }
    return haGreyHeart;
  };

  hasSeenStories = async () => {
    let hasScreenStory = false;
    try {
      await this.page.waitForSelector(this.selectors.profileStoryButtonRead);

      this.logger.debug('Found seen story button');

      hasScreenStory = true;
    } catch (e) {
      this.logger.debug('Could not find seen story button');
    }
    return hasScreenStory;
  };

  actionRandomWait = (): number => {
    const waitTime =
      Math.floor(Math.random() * this.levers.randomWaitMax) +
      this.levers.randomWaitMin;
    this.logger.verbose(`Random wait time: ${waitTime}`);
    return waitTime;
  };

  waitAction = async () => await this.page.waitFor(this.actionRandomWait());

  waitForElement = async (selector: string, timeout: number = 4000) => {
    try {
      await this.page.waitForSelector(selector, {
        timeout,
      });
      this.logger.verbose(`Found element ${selector}`)
    } catch (e) {
      this.logger.error(`Could not wait for element ${selector}`);
      throw new Error(e)
    }
  };

  log = (action: string) =>
    this.logger.log(
      `${this.hashtag} | ${this.username} | LIKED ${this.photosLiked} | IMG ${this.profileIndex} | ${action}`,
    );
}
