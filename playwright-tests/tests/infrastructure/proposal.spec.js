import { test as base, expect } from "@playwright/test";
import { pauseIfVideoRecording } from "../../testUtils";
import { MOCK_RPC_URL } from "../../util/rpcmock.js";

const test = base.extend({
  // Define an option and provide a default value.
  // We can later override it in the config.
  account: ["infrastructure-committee.near", { option: true }],
  proposalAuthorAccountId: ["megha19.near", { option: true }],
});

test.describe("Wallet is connected as admin", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test("should show proposal feed", async ({ page }) => {
    await page.goto("/infrastructure-committee.near/widget/app?page=proposals");

    await expect(await page.locator(".proposal-card").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show correct linked RFP to a proposal in feed page", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto("/infrastructure-committee.near/widget/app?page=proposals");
    let proposalId;
    const linkedRfpId = 0;
    await page.route(
      "https://infra-cache-api-rs.fly.dev/proposals?order=id_desc&limit=20&offset=0",
      async (route) => {
        const response = await route.fetch();
        const json = await response.json();

        if (json?.records) {
          json.records = json.records.map((i, index) => {
            if (index === 0) {
              proposalId = i.proposal_id;
              return {
                ...i,
                linked_rfp: linkedRfpId,
              };
            }
            return i;
          });
        }
        await route.fulfill({ response, json });
      }
    );
    await page.waitForTimeout(10_000);
    await expect(
      page.getByTestId(`proposalId_${proposalId}_rfpId_${linkedRfpId}`)
    ).toBeVisible({
      timeout: 10000,
    });
  });

  async function createProposal(page, linkRfp = false) {
    const description = "The proposal description. This proposal should win.";
    const summary = "The excellent proposal summary";
    const title = "The title";
    const amount = "2000";
    const token = "USDC";
    await page.goto("/infrastructure-committee.near/widget/app?page=proposals");
    await page
      .getByRole("button", { name: " Submit Proposal" })
      .click({ timeout: 10000 });
    await page.getByText("Select Category").click();
    await expect(await page.getByText("Indexers")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByText("Indexers").click();

    await pauseIfVideoRecording(page);
    if (linkRfp) {
      await page.getByText("Search RFP").click();
      let input = page.getByPlaceholder("Search by Id");
      await input.fill("0", { delay: 100 });
      await page.getByText("# 0 : A Cool RFP").click();
      await expect(
        await page.getByRole("link", { name: "# 0 : A Cool RFP" })
      ).toBeVisible();

      await expect(await page.getByText("Indexers")).not.toBeVisible();
      await expect(page.locator(".badge").first()).toHaveText("Other");
    } else {
    }
    await page.getByRole("textbox").first().fill(title);

    await page.locator('textarea[type="text"]').fill(summary);
    await page
      .frameLocator("iframe")
      .locator(".CodeMirror textarea")
      .pressSequentially(description);

    await page.getByRole("textbox").nth(3).fill(amount);
    await page.getByRole("checkbox").first().click();
    await page.getByText("Submit Draft").click();

    const transactionText = JSON.stringify(
      JSON.parse(await page.locator("div.modal-body code").innerText()),
      null,
      1
    );

    let data = {};
    if (linkRfp) {
      data = {
        labels: [],
        body: {
          proposal_body_version: "V1",
          linked_rfp: 0,
          category: "Infrastructure Committee",
          name: title,
          description: description,
          summary: summary,
          linked_proposals: [],
          requested_sponsorship_usd_amount: amount,
          requested_sponsorship_paid_in_currency: token,
          receiver_account: "theori.near",
          requested_sponsor: "infrastructure-committee.near",
          supervisor: null,
          timeline: {
            status: "DRAFT",
          },
        },
      };
    } else {
      data = {
        labels: ["Indexers"],
        body: {
          proposal_body_version: "V1",
          category: "Infrastructure Committee",
          name: title,
          description: description,
          summary: summary,
          linked_proposals: [],
          requested_sponsorship_usd_amount: amount,
          requested_sponsorship_paid_in_currency: token,
          receiver_account: "theori.near",
          requested_sponsor: "infrastructure-committee.near",
          supervisor: null,
          timeline: {
            status: "DRAFT",
          },
        },
      };
    }

    await expect(transactionText).toEqual(JSON.stringify(data, null, 1));

    await pauseIfVideoRecording(page);
  }

  test("should create proposal and link an RFP", async ({ page }) => {
    await createProposal(page, true);
  });

  test("should create a proposal without linking an RFP", async ({ page }) => {
    await createProposal(page, false);
  });

  test("should show relevant users in mention autocomplete and correct name and image in viewer", async ({
    page,
    account,
  }) => {
    test.setTimeout(120000);
    await page.goto(`/${account}/widget/app?page=proposal&id=1`);
    await page.waitForSelector(`iframe`, {
      state: "visible",
    });

    const proposal = page.getByRole("link", { name: "hemera.near" }).first();
    await proposal.waitFor();
    await proposal.scrollIntoViewIfNeeded();

    const comment = page
      .getByRole("link", { name: "trechriron71.near" })
      .first();
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
      "hemera.near", // author,
      "infrastructure-committee.near", //  requested_sponsor,
      "trechriron71.near", // comment author,
      "as2.near",
    ];
    let mentionSuggestions = [];
    for (let i = 0; i < liLocators.length; i++) {
      const text = await liLocators[i].innerText();
      mentionSuggestions.push(text);
    }

    expect(mentionSuggestions.slice(0, 4)).toEqual(expected);
    await pauseIfVideoRecording(page);

    await page
      .frameLocator("iframe")
      .getByRole("button", { name: "hemera.near" })
      .click();
    await commentEditor.pressSequentially(" test");
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Preview" }).click();
    await page.waitForTimeout(10_000);
    const accountLink = page
      .locator(".compose-preview")
      .locator("div[data-component='mob.near/widget/ProfileImage']");
    await expect(accountLink).toBeVisible({ timeout: 20_000 });
    accountLink.click();
    await page.waitForNavigation();
    await expect(page).toHaveURL(
      /mob\.near\/widget\/ProfilePage\?accountId=hemera\.near/
    );
  });

  test("should show links in markdown viewer", async ({ page, account }) => {
    test.setTimeout(120000);
    await page.goto(`/${account}/widget/app?page=proposal&id=1`);
    await page.goto(`/${account}/widget/app?page=proposal&id=1`);
    await page.waitForSelector(`iframe`, {
      state: "visible",
    });

    const proposal = page.getByRole("link", { name: "hemera.near" }).first();
    await proposal.waitFor();
    await proposal.scrollIntoViewIfNeeded();

    const comment = page
      .getByRole("link", { name: "trechriron71.near" })
      .first();
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
      `Adding a test [link](https://www.google.com/)`,
      {
        delay: delay_milliseconds_between_keypress_when_typing,
      }
    );
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Preview" }).click();

    // make sure links open in new tab
    const link = await page.getByRole("link", { name: "link" });
    expect(link).toBeVisible();
    link.click();
    const pagePromise = page.waitForEvent("popup");
    const newTab = await pagePromise;
    await newTab.waitForLoadState();
    await expect(newTab).toHaveURL("https://www.google.com");
  });
});

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

test.describe("Wallet is connected", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected.json",
  });

  test("should create a autolink reference to existing proposal", async ({
    page,
    account,
  }) => {
    test.setTimeout(120000);
    await getCurrentBlockHeight(page);
    await page.goto(`/${account}/widget/app?page=create-proposal`);

    const delay_milliseconds_between_keypress_when_typing = 0;
    const titleArea = await page.getByRole("textbox").first();
    await expect(titleArea).toBeEditable({ timeout: 10_000 });
    await titleArea.pressSequentially("Test proposal 123456", {
      delay: delay_milliseconds_between_keypress_when_typing,
    });

    await pauseIfVideoRecording(page);

    const descriptionArea = await page
      .frameLocator("iframe")
      .locator(".CodeMirror textarea");
    await descriptionArea.focus();
    await descriptionArea.scrollIntoViewIfNeeded();
    await descriptionArea.pressSequentially(
      `The test proposal description. And referencing #`,
      {
        delay: delay_milliseconds_between_keypress_when_typing,
      }
    );
    await descriptionArea.pressSequentially("2", { delay: 10 });
    await pauseIfVideoRecording(page);

    let proposalLink = await page
      .frameLocator("iframe")
      .getByText(
        "#2 Proposal: Near Enablement in Alterscope Risk Infrastructure"
      )
      .click({ timeout: 10000 });
    // check the visibility
    await expect(
      page
        .frameLocator("iframe")
        .getByText(
          "https://near.social/infrastructure-committee.near/widget/app?page=proposal&id=2"
        )
    ).toBeVisible({ timeout: 10000 });

    await pauseIfVideoRecording(page);
  });
});
