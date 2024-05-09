import { expect, test } from "@playwright/test";
import { pauseIfVideoRecording } from "../testUtils.js";
import { mockDefaultTabs } from "../util/addons.js";

const baseUrl =
  "/devhub.near/widget/app?page=community&handle=webassemblymusic&tab=first-blog";

test.describe("Wallet is not connected", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-not-connected.json",
  });

  test("should filter blog posts from search criteria", async ({ page }) => {
    const topics = [
      "cows",
      "cars",
      "sheep",
      "birds",
      "computers",
      "blockchain technology",
      "Artificial intelligence",
      "search for extra terrestrial life",
      "the meaning of life",
    ];

    await page.route("https://api.near.social/get", async (route) => {
      const request = route.request();
      const requestBody = request.postDataJSON();

      if (
        requestBody.keys[0] === "webassemblymusic.community.devhub.near/blog/**"
      ) {
        const blogPosts = {};
        for (let n = 0; n < 100; n++) {
          const topic = topics[n % topics.length];
          const blogDate = new Date(2024, 0, 1);
          blogDate.setDate(n);
          blogPosts["new-blog-post-cg" + n] = {
            "": `# Blog post ${n + 1}
This is an article about ${topic}.
`,
            metadata: {
              title: "New Blog Post" + n,
              createdAt: blogDate.toJSON(),
              updatedAt: blogDate.toJSON(),
              publishedAt: blogDate.toJSON(),
              status: "PUBLISH",
              subtitle: `${topic
                .substring(0, 1)
                .toUpperCase()}${topic.substring(1)}`,
              description: "Description" + n,
              author: "Author",
              communityAddonId: "blogv2",
            },
          };
        }

        const blogResults = {
          "webassemblymusic.community.devhub.near": {
            blog: blogPosts,
          },
        };
        await route.fulfill({
          headers: { "content-type": "application/json" },
          body: JSON.stringify(blogResults, null, 1),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto(baseUrl);

    await page.waitForSelector(".nav-item", {
      state: "visible",
    });

    await pauseIfVideoRecording(page);
    const searchField = await page.getByPlaceholder("search blog posts");
    await searchField.scrollIntoViewIfNeeded();
    for (const topic of topics) {
      await searchField.fill("");
      await searchField.pressSequentially(topic, { delay: 50 });

      await searchField.blur();
      await page.waitForTimeout(200);
      const blogCards = await page.locator("a div").all();
      await expect(blogCards.length).toBeGreaterThan(3);
      await Promise.all(
        blogCards.map(
          async (blogCard) =>
            await expect(blogCard).toContainText(topic, { ignoreCase: true })
        )
      );
    }
  });
});
