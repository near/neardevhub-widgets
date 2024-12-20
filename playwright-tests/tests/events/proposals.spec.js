import { test as base, expect } from "@playwright/test";
import { pauseIfVideoRecording } from "../../testUtils.js";
import {
  setCommitWritePermissionDontAskAgainCacheValues,
  setDontAskAgainCacheValues,
} from "../../util/cache.js";
import {
  mockTransactionSubmitRPCResponses,
  decodeResultJSON,
  encodeResultJSON,
} from "../../util/transaction.js";
import { MOCK_RPC_URL, mockRpcRequest } from "../../util/rpcmock.js";

const test = base.extend({
  // Define an option and provide a default value.
  // We can later override it in the config.
  account: ["events-committee.near", { option: true }],
  proposalAuthorAccountId: ["megha19.near", { option: true }],
});

test.afterEach(
  async ({ page }) => await page.unrouteAll({ behavior: "ignoreErrors" })
);

let acceptedTermsVersion = 122927956;
async function getCurrentBlockHeight(page) {
  // set current block height for accepted terms and conditions
  await page.route(MOCK_RPC_URL, async (route) => {
    const request = route.request();
    const requestPostData = request.postDataJSON();
    if (
      requestPostData?.method === "block" &&
      requestPostData?.params?.finality === "optimistic"
    ) {
      const response = await route.fetch();
      const json = await response.json();
      json.result.header.height = acceptedTermsVersion;
      await route.fulfill({ response, json });
    } else {
      await route.continue();
    }
  });
}

test.describe("Wallet is connected, but not KYC verified", () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-not-kyc-verified-account.json",
  });
  test("should be able to blur 'get verified' drop-down", async ({
    page,
    account,
  }) => {
    test.setTimeout(120000);
    await page.goto(`/${account}/widget/app?page=create-proposal`);

    const titleArea = await page.getByRole("textbox").first();
    await titleArea.fill("Test proposal 123456");
    await titleArea.blur();
    await pauseIfVideoRecording(page);

    await expect(await page.getByText("notkycverified.near")).toBeVisible();

    const getVerifiedButton = await page.locator("#getVerifiedButton");
    await getVerifiedButton.scrollIntoViewIfNeeded();
    await getVerifiedButton.click();

    const getVerifiedDropDown = await page.getByText(
      "KYC Choose this if you are an individual. KYB Choose this if you are a business"
    );
    await expect(getVerifiedDropDown).toBeVisible();
    await pauseIfVideoRecording(page);
    await getVerifiedButton.blur();
    await pauseIfVideoRecording(page);
    await expect(getVerifiedDropDown).not.toBeVisible();
    await pauseIfVideoRecording(page);
  });
});
test.describe("Don't ask again enabled", () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-with-devhub-access-key.json",
  });
  test("should create a proposal", async ({ page, account }) => {
    test.setTimeout(120000);
    await page.goto(`/${account}/widget/app?page=proposals`);

    const widgetSrc = `${account}/widget/devhub.entity.proposal.Editor`;

    await setDontAskAgainCacheValues({
      page,
      widgetSrc,
      methodName: "add_proposal",
      contractId: account,
    });

    await page.getByRole("button", { name: " Submit Proposal" }).click();

    const titleArea = await page.getByRole("textbox").first();
    await titleArea.fill("Test proposal 123456");
    await titleArea.blur();
    await pauseIfVideoRecording(page);

    const categoryDropdown = await page.locator(".dropdown-toggle").first();
    await categoryDropdown.click();
    await page.locator(".dropdown-menu > div > div:nth-child(2) > div").click();

    const disabledSubmitButton = await page.locator(
      ".submit-draft-button.disabled"
    );

    const summary = await page.locator('textarea[type="text"]');
    await summary.fill("Test proposal summary 123456789");
    await summary.blur();
    await pauseIfVideoRecording(page);

    const descriptionArea = await page
      .frameLocator("iframe")
      .locator(".CodeMirror textarea");
    await descriptionArea.focus();
    await descriptionArea.fill("The test proposal description.");
    await descriptionArea.blur();
    await pauseIfVideoRecording(page);

    await page.locator('input[type="text"]').nth(2).fill("1000");
    await pauseIfVideoRecording(page);
    await page.getByRole("checkbox").first().click();
    await pauseIfVideoRecording(page);
    await expect(disabledSubmitButton).toBeAttached();
    await page.getByRole("checkbox").nth(1).click();
    await pauseIfVideoRecording(page);
    await expect(disabledSubmitButton).not.toBeAttached();

    let newProposalId = 0;
    await mockTransactionSubmitRPCResponses(
      page,
      async ({ route, request, transaction_completed, last_receiver_id }) => {
        const postData = request.postDataJSON();
        if (postData.params?.method_name === "get_all_proposal_ids") {
          const response = await route.fetch();
          const json = await response.json();

          await new Promise((resolve) => setTimeout(() => resolve(), 4000));
          const resultObj = decodeResultJSON(json.result.result);
          newProposalId = resultObj[resultObj.length - 1] + 1;
          if (transaction_completed) {
            resultObj.push(newProposalId);
          }
          json.result.result = encodeResultJSON(resultObj);

          await route.fulfill({ response, json });
        } else if (
          postData.params?.method_name === "get_proposal" &&
          postData.params.args_base64 ===
            btoa(JSON.stringify({ proposal_id: newProposalId }))
        ) {
          postData.params.args_base64 = btoa(
            JSON.stringify({ proposal_id: newProposalId - 1 })
          );
          const response = await route.fetch({
            postData: JSON.stringify(postData),
          });
          const json = await response.json();

          let resultObj = decodeResultJSON(json.result.result);
          resultObj.snapshot.name = "Test proposal 123456";
          resultObj.snapshot.description = "The test proposal description.";
          json.result.result = encodeResultJSON(resultObj);

          await route.fulfill({ response, json });
        } else {
          await route.continue();
        }
      }
    );

    const submitButton = await page.getByText("Submit Draft");
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.hover();
    await pauseIfVideoRecording(page);
    await submitButton.click();
    await expect(disabledSubmitButton).toBeAttached();

    const loadingIndicator = await page.locator(
      ".submit-proposal-draft-loading-indicator"
    );
    await expect(loadingIndicator).toBeAttached();

    const transaction_toast = await page.getByText(
      `Calling contract ${account} with method add_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
    await expect(transaction_toast).not.toBeVisible();
    await loadingIndicator.waitFor({ state: "detached", timeout: 10000 });
    await expect(loadingIndicator).not.toBeVisible();

    await page.waitForTimeout(1000);
    await pauseIfVideoRecording(page);
  });
});

test.describe('Moderator with "Don\'t ask again" enabled', () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-with-devhub-moderator-access-key.json",
  });
  test("should edit proposal timeline from review to decision stage with KYC verified", async ({
    page,
    account,
  }) => {
    test.setTimeout(70000);
    let isTransactionCompleted = false;

    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult.snapshot.timeline.status = "REVIEW";

        if (isTransactionCompleted) {
          const lastSnapshot =
            originalResult.snapshot_history[
              originalResult.snapshot_history.length - 1
            ];
          lastSnapshot.timeline.status = "REVIEW";

          const newSnapshot = Object.assign({}, originalResult.snapshot);
          newSnapshot.timeline.status = "APPROVED";
          newSnapshot.timestamp = (
            BigInt(new Date().getTime()) * 1_000_000n
          ).toString();
          originalResult.snapshot = newSnapshot;
          originalResult.snapshot_history.push(lastSnapshot);
        }

        return originalResult;
      },
    });

    await mockTransactionSubmitRPCResponses(
      page,
      async ({
        route,
        request,
        transaction_completed,
        last_receiver_id,
        requestPostData,
      }) => {
        isTransactionCompleted = transaction_completed;
        await route.fallback();
      }
    );

    await page.goto(`/${account}/widget/app?page=proposal&id=17`);

    await setDontAskAgainCacheValues({
      page,
      contractId: account,
      widgetSrc: `${account}/widget/devhub.entity.proposal.Proposal`,
      methodName: "edit_proposal_versioned_timeline",
    });

    const firstStatusBadge = await page
      .locator("div.fw-bold.rounded-2.p-1.px-2")
      .first();
    await expect(firstStatusBadge).toHaveText("REVIEW", { timeout: 10000 });
    await page.locator(".d-flex > div > .bi").click();
    await page.getByTestId("Sponsor verifies KYC/KYB").check();
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByText("Approved", { exact: true }).first().click();

    await pauseIfVideoRecording(page);

    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Save" }).click();

    const callContractToast = await page.getByText("Sending transaction");
    await expect(callContractToast).toBeVisible();
    await expect(callContractToast).not.toBeAttached();
    const timeLineStatusSubmittedToast = await page
      .getByText("Timeline status submitted successfully")
      .first();
    await expect(timeLineStatusSubmittedToast).toBeVisible();

    await expect(firstStatusBadge).toHaveText("APPROVED");
    await firstStatusBadge.scrollIntoViewIfNeeded();
    await pauseIfVideoRecording(page);
    const lastLogItem = await page.locator(
      "div.flex-1.gap-1.w-100.text-wrap.text-muted.align-items-center",
      { hasText: /.*s ago/ }
    );
    await expect(lastLogItem).toContainText(
      "moved proposal from REVIEW to APPROVED",
      { timeout: 10000 }
    );
    await lastLogItem.scrollIntoViewIfNeeded();
    await expect(timeLineStatusSubmittedToast).not.toBeAttached();
    await pauseIfVideoRecording(page);
  });

  test("should not be able to move proposal timeline to decision stage without approving KYC in review stage", async ({
    page,
    account,
  }) => {
    test.setTimeout(60000);

    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult.snapshot.timeline.status = "REVIEW";
        return originalResult;
      },
    });
    await page.goto(`/${account}/widget/app?page=proposal&id=17`);

    const firstStatusBadge = await page
      .locator("div.fw-bold.rounded-2.p-1.px-2")
      .first();
    await expect(firstStatusBadge).toHaveText("REVIEW", { timeout: 10000 });
    await page.locator(".d-flex > div > .bi").click();

    await page.getByTestId("Sponsor verifies KYC/KYB").uncheck();
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByText("Approved", { exact: true }).first().click();

    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeDisabled();
  });
});

test.describe("Wallet is connected", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected.json",
  });
  test("editing proposal should not be laggy, even if mentioning someone", async ({
    page,
    account,
  }) => {
    test.setTimeout(120000);
    await getCurrentBlockHeight(page);
    await page.goto(`/${account}/widget/app?page=create-proposal`);
    const delay_milliseconds_between_keypress_when_typing = 0;
    const titleArea = await page.getByRole("textbox").first();
    await expect(titleArea).toBeEditable();
    await titleArea.pressSequentially("Test proposal 123456", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });

    await pauseIfVideoRecording(page);

    const categoryDropdown = await page.locator(".dropdown-toggle").first();
    await categoryDropdown.click();
    await page.locator(".dropdown-menu > div > div:nth-child(2) > div").click();

    const disabledSubmitButton = await page.locator(
      ".submit-draft-button.disabled"
    );

    const summary = await page.locator('textarea[type="text"]');
    await expect(summary).toBeEditable();
    await summary.pressSequentially("Test proposal summary 123456789", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });

    await pauseIfVideoRecording(page);

    const descriptionArea = await page
      .frameLocator("iframe")
      .locator(".CodeMirror textarea");
    await descriptionArea.focus();
    await descriptionArea.pressSequentially(
      `The test proposal description. And mentioning @petersal`,
      {
        delay: delay_milliseconds_between_keypress_when_typing,
      }
    );

    await pauseIfVideoRecording(page);

    await page
      .frameLocator("iframe")
      .getByText("petersalomonsen.near")
      .click({ timeout: 10000 });

    await descriptionArea.pressSequentially(`. Also mentioning @m`, {
      delay: delay_milliseconds_between_keypress_when_typing,
    });

    await pauseIfVideoRecording(page);
    await descriptionArea.press("Backspace");
    await pauseIfVideoRecording(page);
    await descriptionArea.press("m");
    await pauseIfVideoRecording(page);
    await descriptionArea.pressSequentially(`egha19.`, {
      delay: delay_milliseconds_between_keypress_when_typing,
    });

    await page.frameLocator("iframe").getByText("megha19.near").click();

    await page.locator('input[type="text"]').nth(2).pressSequentially("12345", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });
    await pauseIfVideoRecording(page);
    await page.getByRole("checkbox").first().click();
    await pauseIfVideoRecording(page);
    await expect(disabledSubmitButton).toBeAttached();
    await page.getByRole("checkbox").nth(1).click();
    await pauseIfVideoRecording(page);
    await expect(disabledSubmitButton).not.toBeAttached();

    const submitButton = await page.getByText("Submit Draft");
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.hover();
    await pauseIfVideoRecording(page);
    await submitButton.click();
    const transactionText = JSON.stringify(
      JSON.parse(await page.locator("div.modal-body code").innerText()),
      null,
      1
    );
    expect(transactionText).toEqual(
      JSON.stringify(
        {
          labels: ["Bounty booster"],
          body: {
            proposal_body_version: "V0",
            name: "Test proposal 123456",
            description:
              "The test proposal description. And mentioning @petersalomonsen.near. Also mentioning @megha19.near",
            category: "Bounty",
            summary: "Test proposal summary 123456789",
            linked_proposals: [],
            requested_sponsorship_usd_amount: "12345",
            requested_sponsorship_paid_in_currency: "USDC",
            receiver_account: "efiz.near",
            supervisor: null,
            requested_sponsor: "events-committee.near",
            timeline: {
              status: "DRAFT",
            },
          },
          accepted_terms_and_conditions_version: acceptedTermsVersion,
        },
        null,
        1
      )
    );

    await pauseIfVideoRecording(page);
  });

  test("should show relevant users in mention autocomplete", async ({
    page,
    account,
  }) => {
    await page.goto(`/${account}/widget/app?page=proposal&id=2`);

    await page.waitForSelector(`iframe`, {
      state: "visible",
    });

    const comment = page.getByRole("link", { name: "toronto-sc.near" }).first();
    await comment.waitFor();
    await comment.scrollIntoViewIfNeeded();

    const heading = page.getByText("Add a comment");
    await heading.waitFor();
    await heading.scrollIntoViewIfNeeded();

    await page.waitForTimeout(5000);

    const delay_milliseconds_between_keypress_when_typing = 0;
    const commentEditor = page
      .frameLocator("iframe")
      .locator(".CodeMirror textarea");
    await commentEditor.focus();
    await commentEditor.pressSequentially(
      `Make sure relevant users show up in a mention. @`,
      {
        delay: delay_milliseconds_between_keypress_when_typing,
      }
    );

    await pauseIfVideoRecording(page);
    const iframe = page.frameLocator("iframe");
    const liFrameLocators = iframe.frameLocator(
      'ul[id="mentiondropdown"] > li'
    );
    const liLocators = await liFrameLocators.owner().all();
    const expected = [
      "toronto-sc.near",
      "yarotska.near",
      "events-committee.near",
      "nneoma.near",
    ];
    let mentionSuggestions = [];
    for (let i = 0; i < liLocators.length; i++) {
      const text = await liLocators[i].innerText();
      mentionSuggestions.push(text);
    }

    expect(mentionSuggestions.slice(0, 4)).toEqual(expected);
    await pauseIfVideoRecording(page);
  });

  test("should show only valid input in amount field and show error for invalid", async ({
    page,
    account,
  }) => {
    test.setTimeout(120000);
    const delay_milliseconds_between_keypress_when_typing = 0;
    await page.goto(`/${account}/widget/app?page=create-proposal`);
    const input = page.locator('input[type="text"]').nth(2);
    const errorText = await page.getByText(
      "Please enter the nearest positive whole number."
    );
    await input.pressSequentially("12345de", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });
    await expect(errorText).toBeVisible();
    // clear input field
    for (let i = 0; i < 7; i++) {
      await input.press("Backspace", {
        delay: delay_milliseconds_between_keypress_when_typing,
      });
    }
    await input.pressSequentially("12334", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });
    await expect(errorText).toBeHidden();
    await pauseIfVideoRecording(page);
  });

  test("should create a proposal, autolink reference to existing proposal", async ({
    page,
    account,
  }) => {
    test.setTimeout(120000);
    await getCurrentBlockHeight(page);
    await page.goto(`/${account}/widget/app?page=create-proposal`);
    await getCurrentBlockHeight(page);

    const delay_milliseconds_between_keypress_when_typing = 100;
    const titleArea = await page.getByRole("textbox").first();
    await expect(titleArea).toBeEditable();
    await titleArea.pressSequentially("Test proposal 123456", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });

    await pauseIfVideoRecording(page);

    const categoryDropdown = await page.locator(".dropdown-toggle").first();
    await categoryDropdown.click();
    await page.locator(".dropdown-menu > div > div:nth-child(2) > div").click();

    const disabledSubmitButton = await page.locator(
      ".submit-draft-button.disabled"
    );

    const summary = await page.locator('textarea[type="text"]');
    await expect(summary).toBeEditable();
    await summary.pressSequentially("Test proposal summary 123456789", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });

    await pauseIfVideoRecording(page);

    const descriptionArea = await page
      .frameLocator("iframe")
      .locator(".CodeMirror textarea");
    await descriptionArea.focus();
    await descriptionArea.pressSequentially(
      `The test proposal description. And referencing #`,
      {
        delay: delay_milliseconds_between_keypress_when_typing,
      }
    );
    await descriptionArea.pressSequentially("2", { delay: 10 });
    await pauseIfVideoRecording(page);

    await page
      .frameLocator("iframe")
      .getByText(
        "NEAR Toronto Hackathon Proposal [Hackbox Cohort 1 - Q2 2024] | #PoweredByHackbox"
      )
      .click({ timeout: 10000 });

    await page.locator('input[type="text"]').nth(2).pressSequentially("12345", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });
    await pauseIfVideoRecording(page);
    await page.getByRole("checkbox").first().click();
    await pauseIfVideoRecording(page);
    await expect(disabledSubmitButton).toBeAttached();
    await page.getByRole("checkbox").nth(1).click();
    await pauseIfVideoRecording(page);
    await expect(disabledSubmitButton).not.toBeAttached();

    const submitButton = await page.getByText("Submit Draft");
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.hover();
    await pauseIfVideoRecording(page);
    await submitButton.click();
    const transactionText = JSON.stringify(
      JSON.parse(await page.locator("div.modal-body code").innerText()),
      null,
      1
    );
    await expect(transactionText).toEqual(
      JSON.stringify(
        {
          labels: ["Bounty booster"],
          body: {
            proposal_body_version: "V0",
            name: "Test proposal 123456",
            description:
              "The test proposal description. And referencing [#2 NEAR Toronto Hackathon Proposal [Hackbox Cohort 1 - Q2 2024] | #PoweredByHackbox](https://near.social/events-committee.near/widget/app?page=proposal&id=2)",
            category: "Bounty",
            summary: "Test proposal summary 123456789",
            linked_proposals: [],
            requested_sponsorship_usd_amount: "12345",
            requested_sponsorship_paid_in_currency: "USDC",
            receiver_account: "efiz.near",
            supervisor: null,
            requested_sponsor: "events-committee.near",
            timeline: {
              status: "DRAFT",
            },
          },
          accepted_terms_and_conditions_version: acceptedTermsVersion,
        },
        null,
        1
      )
    );

    await pauseIfVideoRecording(page);
  });

  test.describe("filter proposals using different mechanism", () => {
    test.beforeEach(async ({ page, account }) => {
      await page.goto(`/${account}/widget/app?page=proposals`);
      expect(page.locator(".proposal-card").first()).toBeVisible({
        timeout: 10000,
      });
    });
    test("should filter proposals by categories", async ({ page, account }) => {
      test.setTimeout(60000);
      const loader = page.getByRole("img", { name: "loader" });
      await expect(loader).toBeVisible({ timeout: 20000 });
      await expect(page.locator(".proposal-card").first()).toBeVisible({
        timeout: 20000,
      });
      const category = "Bounty";
      await page.getByRole("button", { name: "Category" }).click();
      await page.getByRole("list").getByText(category).first().click();
      await expect(
        page.getByRole("button", { name: `Category : ${category}` })
      ).toBeVisible();
      await expect(loader).toBeHidden({ timeout: 40000 });

      const bountyTag = page.getByText(category, { exact: true }).nth(1);

      await expect(bountyTag).toContainText(category);
    });

    test("should filter proposals by timeline", async ({ page }) => {
      test.setTimeout(60000);
      const stage = "Funded";
      await page.getByRole("button", { name: "Stage" }).click();
      await page.getByRole("list").getByText(stage).click();
      await expect(
        page.getByRole("button", { name: `Stage : ${stage}` })
      ).toBeVisible();
      const loader = page.getByRole("img", { name: "loader" });
      expect(loader).toBeHidden({ timeout: 10000 });
      const timelineTag = await page.locator(".green-tag").first();
      await expect(timelineTag).toContainText(stage.toUpperCase());
    });

    test("should filter proposals by author", async ({ page }) => {
      test.setTimeout(60000);
      const accountId = "yarotska.near";
      const profileName = "yarotska";
      await page.getByRole("button", { name: "Author" }).click();
      await page.getByRole("list").getByText(accountId).click();
      await expect(
        page.getByRole("button", { name: `Author : ${accountId}` })
      ).toBeVisible();
      const loader = page.getByRole("img", { name: "loader" });
      expect(loader).toBeHidden({ timeout: 10000 });
      await expect(
        page.getByText(`By ${profileName ?? accountId} ･`).first()
      ).toBeVisible();
    });

    test("should filter proposals by search text", async ({ page }) => {
      test.setTimeout(60000);
      const term = "ETH Oxford Hackathon bounty payout";
      const input = await page.getByPlaceholder("Search by content");
      await input.click();
      await input.fill(term);
      await input.press("Enter");
      const loader = page.getByRole("img", { name: "loader" });
      expect(loader).toBeHidden({ timeout: 10000 });
      const element = page.locator(`:has-text("${term}")`).nth(1);
      await expect(element).toBeVisible({ timeout: 10000 });
    });
  });
});
