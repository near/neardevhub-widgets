import { test, expect } from "@playwright/test";
import {
  setDontAskAgainCacheValues,
  getDontAskAgainCacheValues,
  setCommitWritePermissionDontAskAgainCacheValues,
} from "../util/cache.js";
import { modifySocialNearGetRPCResponsesInsteadOfGettingWidgetsFromBOSLoader } from "../util/bos-loader.js";
import {
  mockTransactionSubmitRPCResponses,
  decodeResultJSON,
  encodeResultJSON,
} from "../util/transaction.js";

test.describe("Wallet is connected", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-peter.json",
  });

  test("should create a discussion when content matches", async ({ page }) => {
    await page.goto(
      "/devhub.near/widget/app?page=community&handle=webassemblymusic&tab=discussions"
    );

    const socialdbaccount = "petersalomonsen.near";
    const viewsocialdbpostresult = await fetch("https://rpc.mainnet.near.org", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: "social.near",
          method_name: "get",
          args_base64: btoa(
            JSON.stringify({
              keys: [socialdbaccount + "/post/main"],
              options: { with_block_height: true },
            })
          ),
        },
      }),
    }).then((r) => r.json());

    const socialdbpost = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(viewsocialdbpostresult.result.result)
      )
    );
    const socialdbpostcontent = JSON.parse(
      socialdbpost[socialdbaccount].post.main[""]
    );
    const socialdbpostblockheight =
      socialdbpost[socialdbaccount].post.main[":block"];

    const discussionPostEditor = await page.getByTestId("compose-announcement");
    await discussionPostEditor.scrollIntoViewIfNeeded();
    await discussionPostEditor.fill(socialdbpostcontent.text);

    await page.getByTestId("post-btn").click();
    await page.route("https://rpc.mainnet.near.org/", async (route) => {
      const request = await route.request();

      const requestPostData = request.postDataJSON();
      if (requestPostData.method === "tx") {
        await route.continue({ url: "https://archival-rpc.mainnet.near.org/" });
      } else {
        await route.continue();
      }
    });

    await page.goto(
      "/devhub.near/widget/app?page=community&handle=webassemblymusic&tab=discussions&transactionHashes=mi2a1KwagRFZhpqBNKhKaCTkHVj98J8tZnxSr1NpxSQ"
    );

    await expect(page.locator("div.modal-body code")).toHaveText(
      JSON.stringify(
        {
          handle: "webassemblymusic",
          block_height: socialdbpostblockheight,
        },
        null,
        1
      )
    );
  });

  test("should not create a discussion if content does not match", async ({
    page,
  }) => {
    await page.goto(
      "/devhub.near/widget/app?page=community&handle=webassemblymusic&tab=discussions"
    );

    const socialdbaccount = "petersalomonsen.near";
    const viewsocialdbpostresult = await fetch("https://rpc.mainnet.near.org", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: "social.near",
          method_name: "get",
          args_base64: btoa(
            JSON.stringify({
              keys: [socialdbaccount + "/post/main"],
              options: { with_block_height: true },
            })
          ),
        },
      }),
    }).then((r) => r.json());

    const socialdbpost = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(viewsocialdbpostresult.result.result)
      )
    );
    const socialdbpostcontent = JSON.parse(
      socialdbpost[socialdbaccount].post.main[""]
    );

    const discussionPostEditor = await page.getByTestId("compose-announcement");
    await discussionPostEditor.scrollIntoViewIfNeeded();
    await discussionPostEditor.fill(
      socialdbpostcontent.text + " something else so that it does not match"
    );

    await page.getByTestId("post-btn").click();

    await page.route("https://rpc.mainnet.near.org/", async (route) => {
      const request = await route.request();

      const requestPostData = request.postDataJSON();
      if (requestPostData.method === "tx") {
        await route.continue({ url: "https://archival-rpc.mainnet.near.org/" });
      } else {
        await route.continue();
      }
    });
    await page.goto(
      "/devhub.near/widget/app?page=community&handle=webassemblymusic&tab=discussions&transactionHashes=mi2a1KwagRFZhpqBNKhKaCTkHVj98J8tZnxSr1NpxSQ"
    );

    const transactionConfirmationModal = page.locator("div.modal-body code");
    await page.waitForTimeout(4000);
    expect(await transactionConfirmationModal.isVisible()).toBeFalsy();
  });
});

test.describe("Don't ask again enabled", () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-with-devhub-access-key.json",
  });

  test("should create a discussion when content matches", async ({ page }) => {
    await modifySocialNearGetRPCResponsesInsteadOfGettingWidgetsFromBOSLoader(
      page
    );

    await page.goto(
      "/devhub.near/widget/app?page=community&handle=webassemblymusic&tab=discussions"
    );

    const widgetSrc = "devhub.near/widget/devhub.entity.community.Discussions";
    await setDontAskAgainCacheValues({
      page,
      widgetSrc,
      methodName: "create_discussion",
      contractId: "devhub.near",
    });

    expect(
      await getDontAskAgainCacheValues({
        page,
        widgetSrc,
        methodName: "create_discussion",
        contractId: "devhub.near",
      })
    ).toEqual({ create_discussion: true });

    await setCommitWritePermissionDontAskAgainCacheValues({
      page,
      widgetSrc,
      accountId: "petersalomonsen.near",
    });
    const socialdbaccount = "petersalomonsen.near";
    const viewsocialdbpostresult = await fetch("https://rpc.mainnet.near.org", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: "social.near",
          method_name: "get",
          args_base64: btoa(
            JSON.stringify({
              keys: [socialdbaccount + "/post/main"],
              options: { with_block_height: true },
            })
          ),
        },
      }),
    }).then((r) => r.json());

    const socialdbpost = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(viewsocialdbpostresult.result.result)
      )
    );
    const socialdbpostcontent = JSON.parse(
      socialdbpost[socialdbaccount].post.main[""]
    );
    const socialdbpostblockheight =
      socialdbpost[socialdbaccount].post.main[":block"];

    const discussionPostEditor = await page.getByTestId("compose-announcement");
    await discussionPostEditor.scrollIntoViewIfNeeded();
    await discussionPostEditor.fill(socialdbpostcontent.text);

    await mockTransactionSubmitRPCResponses(
      page,
      async ({ route, request, transaction_completed, last_receiver_id }) => {
        const postData = request.postDataJSON();
        const args_base64 = postData.params?.args_base64;
        if (args_base64) {
          const args = atob(args_base64);
          if (
            args.indexOf(
              "discussions.webassemblymusic.community.devhub.near/index/**"
            ) > -1
          ) {
            const response = await route.fetch();
            const json = await response.json();

            if (!transaction_completed || last_receiver_id !== "devhub.near") {
              const resultObj = decodeResultJSON(json.result.result);
              resultObj[
                "discussions.webassemblymusic.community.devhub.near"
              ].index.repost = "[]";
              json.result.result = encodeResultJSON(resultObj);
            }
            await route.fulfill({ response, json });
            return;
          }
        }
        await route.continue();
      }
    );

    const postButton = await page.getByTestId("post-btn");
    await postButton.click();

    const loadingIndicator = await page
      .locator(".submit-post-loading-indicator")
      .first();

    await expect(loadingIndicator).toBeVisible();
    await expect(postButton).toBeDisabled();

    const transaction_toast = await page.getByText(
      "Calling contract devhub.near with method create_discussion"
    );
    expect(transaction_toast).toBeVisible();

    await expect(loadingIndicator).toBeVisible();
    await expect(postButton).toBeDisabled();

    await transaction_toast.waitFor({ state: "detached" });
    expect(transaction_toast).not.toBeVisible();
    await loadingIndicator.waitFor({ state: "detached" });
    await expect(postButton).not.toBeDisabled();

    await expect(await discussionPostEditor.textContent()).toEqual("");
    await page.waitForTimeout(100);
    expect(transaction_toast).not.toBeVisible();
  });
});
