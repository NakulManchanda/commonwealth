import { expect as pwexpect, test } from '@playwright/test';
import { expect } from 'chai';
import { PORT } from '../../../server/config';
import {
  addAddressIfNone,
  addAlchemyKey,
  createInitialUser,
  login,
} from '../utils/e2eUtils';

test.setTimeout(60000);

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

test.describe('Commonwealth Create Community', () => {
  test.beforeAll(async () => {
    await addAlchemyKey();
  });

  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/createCommunity`);
    await login(page);
  });

  test('Test create starter community', async ({ page }) => {
    const chainName = Date.now().toString() + getRandomInteger(1, 100000);
    await page.locator('input#NameInput').fill(chainName);
    const iconField = await page.locator('input[id*=Icon]');
    await iconField.fill(
      'https://assets.commonwealth.im/8c3f1d15-4c21-4fc0-9ea4-6f9bd234eb62.jpg'
    );
    await page.click('button.Button.primary-blue');

    await assertAdminCapablities(page, chainName);
  });

  test('Test create erc20 community', async ({ page }) => {
    const chainName = Date.now().toString() + getRandomInteger(1, 100000);

    await fillOutERCForm(
      page,
      'ERC20',
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      chainName
    );

    await assertAdminCapablities(page, chainName);
  });

  test('Test create erc721 community', async ({ page }) => {
    const chainName = Date.now().toString() + getRandomInteger(1, 100000);

    await fillOutERCForm(
      page,
      'ERC721',
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      chainName
    );

    await assertAdminCapablities(page, chainName);
  });

  test('Test create Polygon community', async ({ page }) => {
    const chainName = Date.now().toString() + getRandomInteger(1, 100000);
    await page.locator('input#NameInput').fill(chainName);
    const iconField = await page.locator('input[id*=Icon]');
    await iconField.fill(
      'https://assets.commonwealth.im/8c3f1d15-4c21-4fc0-9ea4-6f9bd234eb62.jpg'
    );
    await page.click('button.Button.primary-blue');

    await assertAdminCapablities(page, chainName);
  });
});

async function fillOutERCForm(page, formName, tokenContractAddress, chainName) {
  await pwexpect(async () => {
    await pwexpect(page.locator('input[id*=Contract]')).toHaveCount(0);
    await page.getByText(formName).click();
  }).toPass();

  // populate token contract address
  const tokenContractAddressForm = await page.locator('input[id*=Contract]');
  await tokenContractAddressForm.fill(tokenContractAddress);
  await (
    await page.locator('button.Button.primary-blue >> text=/Populate/')
  ).click();

  await page.locator('input#NameInput').fill(chainName);
  const iconField = await page.locator('input[id*=Icon]');
  await iconField.fill(
    'https://assets.commonwealth.im/8c3f1d15-4c21-4fc0-9ea4-6f9bd234eb62.jpg'
  );
  do {
    await page.click('button.Button.primary-blue >> text=/Save/');
  } while (!page.getByText('Success!'));
}

async function assertAdminCapablities(page, chainName) {
  await page.waitForNavigation({
    url: `http://localhost:${PORT}/${chainName}/discussions`,
  });

  // Assert create thread button is not disabled
  const button = await page.locator(
    'button.Button.mini-black >> text=Create Thread'
  );
  const isDisabled = await button?.getAttribute('disabled');
  expect(isDisabled).to.be.not.true;

  // Assert that the element with the text "Admin Capabilities" exists
  expect(
    await page.isVisible('div.Text.b1.regular:has-text("Admin Capabilities")')
  ).to.be.true;
}
