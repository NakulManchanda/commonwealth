import { expect, test } from '@playwright/test';
import { parseInt } from 'lodash';
import { PORT } from '../../../server/config';
import { createTestEntities, testChains } from '../hooks/e2eDbEntityHooks.spec';
import { addAddressIfNone, login, testDb } from '../utils/e2eUtils';

test.beforeEach(async () => {
  await createTestEntities();
});

test.describe('Discussion Page Tests', () => {
  let threadId;

  test.beforeEach(async ({ page }) => {
    threadId = (
      await testDb.query(`
        INSERT INTO "Threads" (address_id, title, body, chain, topic_id, kind, created_at, updated_at)
        VALUES (-1, 'Example Title', 'Example Body', 'cmntest', -1, 'discussion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id;
    `)
    )[0][0]['id'];

    await page.goto(
      `http://localhost:${PORT}/${testChains[0].id}/discussion/${threadId}`
    );
    await addAddressIfNone(testChains[0].id);
    await login(page);
  });

  test('Check User can create/update/delete/like/unlike comment', async ({
    page,
  }) => {
    test.setTimeout(60000);

    let time = Date.now();

    let commentText = `test comment made at ${time}`;
    await fillQuillTextBox(page, commentText);

    await page.getByRole('button', { name: 'Submit' }).click();

    // asserts that comment is created
    await page.getByText(commentText);

    await performUpvote(page, 'comment-content');

    // The 3 dots below the comment doesn't have a clear unique identifier.
    let commentOptionButton = await page.locator(
      'xpath=(//div[@class="comment-footer"]//button[@class="ThreadAction"])[4]'
    );
    await commentOptionButton.click();
    await page.locator('div.PopoverMenuItem').first().click();

    time = Date.now();

    commentText = `test comment updated at ${time}`;
    await fillQuillTextBox(page, commentText);

    await page.getByRole('button', { name: 'Save' }).click();

    // asserts that comment is created
    await page.getByText(commentText);

    // The 3 dots below the comment doesn't have a clear unique identifier.
    commentOptionButton = await page.locator(
      'xpath=(//div[@class="comment-footer"]//button[@class="ThreadAction"])[4]'
    );
    await commentOptionButton.click();
    await page.locator('div.PopoverMenuItem').nth(2).click();

    const deleteButton = await page.locator('button.mini-red');
    await deleteButton.click();

    let commentExists = await page.getByText(commentText).count();
    do {
      commentExists = await page.getByText(commentText).count();
    } while (commentExists !== 0);

    expect(await page.getByText(commentText).count()).toEqual(0);
  });

  test('Check User can like/dislike thread', async ({ page }) => {
    await performUpvote(page, 'ThreadOptions');
  });
});

async function fillQuillTextBox(page, commentText) {
  await expect(async () => {
    const textBox = await page.locator('.ql-editor');
    await textBox.fill(commentText);
    await expect(page.locator('.ql-editor')).toHaveText(commentText);
  }).toPass();
}

// performs upvote for the specified parent class.
async function performUpvote(page, parentClass: string) {
  const amountOfThreadLikes = await page
    .locator(
      `xpath=(//div[@class="${parentClass}"]//button[contains(@class,"ThreadAction")])[1]//div`
    )
    .textContent();

  let threadLikeButton = await page.locator(
    `xpath=(//div[@class="${parentClass}"]//button[contains(@class,"ThreadAction")])[1]`
  );
  await threadLikeButton.click();

  // expect likes to increment by 1
  await expect(async () => {
    expect(
      await page
        .locator(
          `xpath=(//div[@class="${parentClass}"]//button[contains(@class,"ThreadAction")])[1]//div`
        )
        .textContent()
    ).toEqual((parseInt(amountOfThreadLikes) + 1).toString());
  }).toPass();

  threadLikeButton = await page.locator(
    `xpath=(//div[@class="${parentClass}"]//button[contains(@class,"ThreadAction")])[1]`
  );
  await threadLikeButton.click();

  await expect(async () => {
    expect(
      await page
        .locator(
          `xpath=(//div[@class="${parentClass}"]//button[contains(@class,"ThreadAction")])[1]//div`
        )
        .textContent()
    ).toEqual(amountOfThreadLikes);
  }).toPass();
}
