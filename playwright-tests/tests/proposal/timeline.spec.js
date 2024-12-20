import { test as base, expect } from "@playwright/test";
import {
  pauseIfVideoRecording,
  waitForSelectorToBeVisible,
} from "../../testUtils.js";
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

const TIMELINE_STATUS = {
  DRAFT: "DRAFT",
  REVIEW: "REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELED: "CANCELLED",
  APPROVED_CONDITIONALLY: "APPROVED_CONDITIONALLY",
  PAYMENT_PROCESSING: "PAYMENT_PROCESSING",
  FUNDED: "FUNDED",
};

const test = base.extend({
  // Define an option and provide a default value.
  // We can later override it in the config.
  account: ["devhub.near", { option: true }],
  proposalAuthorAccountId: ["megha19.near", { option: true }],
});

test.afterEach(
  async ({ page }) => await page.unrouteAll({ behavior: "ignoreErrors" })
);

test.describe('Moderator with "Don\'t ask again" enabled', () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-with-devhub-moderator-access-key.json",
  });

  // TODO: check any of the checkboxes next to
  //Sponsor provides feedback or requests reviews
  //Reviewer completes attestations (Optional

  test("should clear all checkboxes when changing timeline status from Funded to Draft", async ({
    page,
    account,
  }) => {
    if (account === "infrastructure-committee.near") {
      // infrastructure committee uses edit_proposal_timeline
      test.skip();
    }
    test.setTimeout(70000);
    let isTransactionCompleted = false;
    // Mock the proposal
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult.snapshot.timeline.status = "FUNDED";

        // After submitting this will execute
        if (isTransactionCompleted) {
          const lastSnapshot =
            originalResult.snapshot_history[
              originalResult.snapshot_history.length - 1
            ];
          lastSnapshot.timeline.status = "FUNDED";

          const newSnapshot = Object.assign({}, originalResult.snapshot);
          newSnapshot.timeline.status = "DRAFT";
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

    await page.goto(`/${account}/widget/app?page=proposal&id=112`);

    await setDontAskAgainCacheValues({
      page,
      contractId: account,
      // infrastructure also has a different devhub.path.to.proposal.Proposal
      widgetSrc: `${account}/widget/devhub.entity.proposal.Proposal`,
      // TODO: infrastructure committee uses edit_proposal_timeline
      methodName: "edit_proposal_versioned_timeline",
    });

    await page.waitForSelector(`iframe`, {
      state: "visible",
    });
    // Check if the status badge is "FUNDED"
    const firstStatusBadge = await page
      .locator("div.fw-bold.rounded-2.p-1.px-2")
      .first();
    await expect(firstStatusBadge).toHaveText("FUNDED", { timeout: 10000 });

    // Click on the timeline settings cog
    await page.locator(".d-flex > div > .bi").click();

    // Wait for the dropdown to be visible
    await page.getByTestId("dropdown").waitFor({ state: "visible" });

    // Select the DRAFT status
    await page.getByRole("button", { name: "Funded", exact: true }).click();
    await page.getByText("Draft", { exact: true }).first().click();

    // Save the status as Draft
    await pauseIfVideoRecording(page);
    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Save" }).click();

    await pauseIfVideoRecording(page);

    // TODO implement
    // Everything should be cleared
  });

  test("should clear all checkboxes when changing timeline status from Payment Processing to Draft", async ({
    page,
    account,
  }) => {
    if (account === "infrastructure-committee.near") {
      // infrastructure committee uses edit_proposal_timeline
      test.skip();
    }
    test.setTimeout(70000);
    let isTransactionCompleted = false;
    // Mock the proposal
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult.snapshot.timeline.status = "PAYMENT_PROCESSING";

        // After submitting this will execute
        if (isTransactionCompleted) {
          const lastSnapshot =
            originalResult.snapshot_history[
              originalResult.snapshot_history.length - 1
            ];
          lastSnapshot.timeline.status = "PAYMENT_PROCESSING";

          const newSnapshot = Object.assign({}, originalResult.snapshot);
          newSnapshot.timeline.status = "DRAFT";
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

    await page.goto(`/${account}/widget/app?page=proposal&id=112`);

    await setDontAskAgainCacheValues({
      page,
      contractId: account,
      // infrastructure also has a different devhub.path.to.proposal.Proposal
      widgetSrc: `${account}/widget/devhub.entity.proposal.Proposal`,
      // TODO: infrastructure committee uses edit_proposal_timeline
      methodName: "edit_proposal_versioned_timeline",
    });

    await page.waitForSelector(`iframe`, {
      state: "visible",
    });
    // Check if the status badge is "FUNDED"
    const firstStatusBadge = await page
      .locator("div.fw-bold.rounded-2.p-1.px-2")
      .first();
    await expect(firstStatusBadge).toHaveText("PAYMENT PROCESSING", {
      timeout: 10000,
    });

    // Click on the timeline settings cog
    await page.locator(".d-flex > div > .bi").click();

    // Wait for the dropdown to be visible
    await page.getByTestId("dropdown").waitFor({ state: "visible" });

    // Select the DRAFT status
    await page
      .getByRole("button", { name: "Payment-processing", exact: true })
      .click();
    await page.getByText("Draft", { exact: true }).first().click();

    // Save the status as Draft
    await pauseIfVideoRecording(page);
    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Save" }).click();

    await pauseIfVideoRecording(page);

    // TODO implement
    // Everything should be cleared
  });

  test("should clear all checkboxes when changing timeline status from Rejected to Draft", async ({
    page,
    account,
  }) => {
    if (account === "infrastructure-committee.near") {
      // infrastructure committee uses edit_proposal_timeline
      test.skip();
    }
    test.setTimeout(70000);
    let isTransactionCompleted = false;
    // Mock the proposal
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult.snapshot.timeline.status = "REJECTED";

        // After submitting this will execute
        if (isTransactionCompleted) {
          const lastSnapshot =
            originalResult.snapshot_history[
              originalResult.snapshot_history.length - 1
            ];
          lastSnapshot.timeline.status = "REJECTED";

          const newSnapshot = Object.assign({}, originalResult.snapshot);
          newSnapshot.timeline.status = "DRAFT";
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

    await page.goto(`/${account}/widget/app?page=proposal&id=112`);

    await setDontAskAgainCacheValues({
      page,
      contractId: account,
      // infrastructure also has a different devhub.path.to.proposal.Proposal
      widgetSrc: `${account}/widget/devhub.entity.proposal.Proposal`,
      // TODO: infrastructure committee uses edit_proposal_timeline
      methodName: "edit_proposal_versioned_timeline",
    });

    await page.waitForSelector(`iframe`, {
      state: "visible",
    });
    // Check if the status badge is "FUNDED"
    const firstStatusBadge = await page
      .locator("div.fw-bold.rounded-2.p-1.px-2")
      .first();
    await expect(firstStatusBadge).toHaveText("REJECTED", {
      timeout: 10000,
    });

    // Click on the timeline settings cog
    await page.locator(".d-flex > div > .bi").click();

    // Wait for the dropdown to be visible
    await page.getByTestId("dropdown").waitFor({ state: "visible" });

    // Select the DRAFT status
    await page.getByRole("button", { name: "Rejected", exact: true }).click();
    await page.getByText("Draft", { exact: true }).first().click();

    // Save the status as Draft
    await pauseIfVideoRecording(page);
    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Save" }).click();

    await pauseIfVideoRecording(page);

    // TODO implement
    // Everything should be cleared
  });

  test("should clear all checkboxes when changing timeline status from Cancelled to Draft", async ({
    page,
    account,
  }) => {
    if (account === "infrastructure-committee.near") {
      // infrastructure committee uses edit_proposal_timeline
      test.skip();
    }
    test.setTimeout(70000);
    let isTransactionCompleted = false;
    // Mock the proposal
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult.snapshot.timeline.status = "CANCELLED";

        // After submitting this will execute
        if (isTransactionCompleted) {
          const lastSnapshot =
            originalResult.snapshot_history[
              originalResult.snapshot_history.length - 1
            ];
          lastSnapshot.timeline.status = "CANCELLED";

          const newSnapshot = Object.assign({}, originalResult.snapshot);
          newSnapshot.timeline.status = "DRAFT";
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

    await page.goto(`/${account}/widget/app?page=proposal&id=112`);

    await setDontAskAgainCacheValues({
      page,
      contractId: account,
      // infrastructure also has a different devhub.path.to.proposal.Proposal
      widgetSrc: `${account}/widget/devhub.entity.proposal.Proposal`,
      // TODO: infrastructure committee uses edit_proposal_timeline
      methodName: "edit_proposal_versioned_timeline",
    });

    await page.waitForSelector(`iframe`, {
      state: "visible",
    });
    // Check if the status badge is "FUNDED"
    const firstStatusBadge = await page
      .locator("div.fw-bold.rounded-2.p-1.px-2")
      .first();
    await expect(firstStatusBadge).toHaveText("CANCELLED", {
      timeout: 10000,
    });

    // Click on the timeline settings cog
    await page.locator(".d-flex > div > .bi").click();

    // Wait for the dropdown to be visible
    await page.getByTestId("dropdown").waitFor({ state: "visible" });

    // Select the DRAFT status
    await page.getByRole("button", { name: "Cancelled", exact: true }).click();
    await page.getByText("Draft", { exact: true }).first().click();

    // Save the status as Draft
    await pauseIfVideoRecording(page);
    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Save" }).click();

    await pauseIfVideoRecording(page);

    // TODO implement
    // Everything should be cleared
  });
});
