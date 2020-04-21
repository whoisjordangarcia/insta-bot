import { Page } from 'puppeteer';
import numbro from 'numbro';

import { BotBaseService } from './bot-base.service';

export class BotHelperService extends BotBaseService {
  printStats = () => {
    let number = 1;

    if (this.levers.likeTopPosts) {
      number =
        number * this.levers.profilePhotosToLook * this.levers.topPostsToLook;
    }

    if (this.levers.likeMostRecent) {
      number =
        number *
        this.levers.profilePhotosToLook *
        this.levers.mostRecentPhotosToLook;
    }
    console.log(`Potential to like: ${number}`);
  };

  goToHashTag = async (category: string) => {
    //console.log(`Navigating to hashtag page ${category}`);

    await this.page.goto(
      `${this.urls.source}/explore/tags/${category.replace('#', '')}/`,
    );
    await this.waitAction();
  };

  checkNotificationDialog = async () => {
    try {
      console.info('Checking notification dialog');
      await this.waitAction();

      await this.waitForElement(this.selectors.notificationDialog, 200);

      await this.click(this.selectors.notificationDialogNotNow);
    } catch (e) {
      console.log('Turn on notifications not found. Skipping.');
    }
  };

  navigateToHomePage = async () => {
    console.log('Navigating to homepage');
    await this.click(this.selectors.homepage);
  };

  sleep = () => {
    console.log('waiting...');
    return new Promise(resolve => {
      setTimeout(resolve, 5000);
    });
  };

  getElementValue = async (selector: string): Promise<string> => {
    let value = null;
    try {
      value = await this.page.evaluate(select => {
        console.log(select);
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
    // console.log('Clearing input');
    try {
      await this.waitForElement(this.selectors.clearSearchBox, 100);
      await this.click(this.selectors.clearSearchBox);
    } catch (e) {}
    await this.waitAction();
  };

  searchHashTag = async (hashTag: string) => {
    //console.log('Performing Hashtag search');
    await this.clearInput();

    //console.log('Typing hashtag');
    await this.type(this.selectors.searchbox, hashTag);

    //console.log('Selecting hashtag');
    await this.page.keyboard.press('ArrowDown');
    await this.waitAction();
    await this.page.keyboard.press('Enter');
    await this.waitAction();
  };

  closePopup = async () => {
    try {
      //console.log('Closing popup.');
      this.click(this.selectors.photoPopupClose);
    } catch (e) {}

    await this.waitAction();
  };

  type = async (selector: string, value: string) => {
    await this.page.focus(selector);
    await this.page.keyboard.type(value, {
      delay:
        Math.floor(Math.random() * this.levers.randomTypeMax) +
        this.levers.randomTypeMin,
    });

    await this.waitAction();
  };

  click = async (selector: string) => {
    // console.log(`About to click ${selector}`);
    await this.page.focus(selector);
    await this.page.click(selector);
    await this.page.waitFor(this.actionRandomWait());
  };

  isLoggedIn = async () => {
    let loggedIn = false;
    try {
      console.info('Checking if user is logged in.');
      this.waitForElement(this.selectors.loggedinState);
      console.info('User is logged in.');
      loggedIn = true;
    } catch (e) {
      console.log('User is logged out.');
      loggedIn = false;
    }
    return loggedIn;
  };

  hasEmptyHeart = async () =>
    await this.page.$(this.selectors.photoPopupGreyLikeButton);

  actionRandomWait = (): number => {
    const waitTime =
      Math.floor(Math.random() * this.levers.randomWaitMax) +
      this.levers.randomWaitMin;
    //console.log(`Random wait time: ${waitTime}`);
    return waitTime;
  };

  waitAction = async () => await this.page.waitFor(this.actionRandomWait());

  waitForElement = async (selector: string, timeout: number = 4000) =>
    await this.page.waitForSelector(selector, {
      timeout,
    });
}
