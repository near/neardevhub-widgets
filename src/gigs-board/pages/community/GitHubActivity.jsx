/* INCLUDE: "common.jsx" */
const nearDevGovGigsContractAccountId =
  props.nearDevGovGigsContractAccountId ||
  (context.widgetSrc ?? "devgovgigs.near").split("/", 1)[0];

const nearDevGovGigsWidgetsAccountId =
  props.nearDevGovGigsWidgetsAccountId ||
  (context.widgetSrc ?? "devgovgigs.near").split("/", 1)[0];

function widget(widgetName, widgetProps, key) {
  widgetProps = {
    ...widgetProps,
    nearDevGovGigsContractAccountId: props.nearDevGovGigsContractAccountId,
    nearDevGovGigsWidgetsAccountId: props.nearDevGovGigsWidgetsAccountId,
    referral: props.referral,
  };

  return (
    <Widget
      src={`${nearDevGovGigsWidgetsAccountId}/widget/gigs-board.${widgetName}`}
      props={widgetProps}
      key={key}
    />
  );
}

function href(widgetName, linkProps) {
  linkProps = { ...linkProps };

  if (props.nearDevGovGigsContractAccountId) {
    linkProps.nearDevGovGigsContractAccountId =
      props.nearDevGovGigsContractAccountId;
  }

  if (props.nearDevGovGigsWidgetsAccountId) {
    linkProps.nearDevGovGigsWidgetsAccountId =
      props.nearDevGovGigsWidgetsAccountId;
  }

  if (props.referral) {
    linkProps.referral = props.referral;
  }

  const linkPropsQuery = Object.entries(linkProps)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `#/${nearDevGovGigsWidgetsAccountId}/widget/gigs-board.pages.${widgetName}${
    linkPropsQuery ? "?" : ""
  }${linkPropsQuery}`;
}
/* END_INCLUDE: "common.jsx" */

const { action, boardId, label } = props;

State.init({
  newBoardConfig: {
    boardId: "probablyUUIDv4", // uuid-v4() ?

    columns: [
      { label: "widget", title: "Widget" },
      { label: "integration", title: "Integration" },
      { label: "feature-request", title: "Feature Request" },
    ],

    contentTypes: {
      PullRequest: true,
      Issue: false,
    },

    excludedLabels: [],
    name: "NEAR Protocol NEPs",
    repoURL: "https://github.com/near/NEPs",
    requiredLabels: ["A-NEP"],
  },
});

/**
 * Reads a board config from SocialDB.
 * Currently a mock.
 *
 * Boards are stored on SocialDB and indexed by those ids.
 */
const boardConfigByBoardId = ({ boardId }) => {
  return {
    probablyUUIDv4: {
      id: "probablyUUIDv4",
      columns: [],
      excludedLabels: [],
      name: "sample board",
      repoURL: "https://github.com/near/NEPs",
      requiredLabels: [],
    },
  }[boardId];
};

const TabContent = (
  <div class="flex column gap-4">
    {action === "new" && (
      <div>
        <h4>New GitHub activity board</h4>

        <div></div>
      </div>
    )}

    {action === "new" &&
      widget("entities.GithubRepo.Board", state.newBoardConfig)}

    {action === "view" &&
      widget("entities.GithubRepo.Board", {
        ...boardConfigByBoardId(boardId),
        linkedPage: "GithubActivity",
      })}
  </div>
);

return widget("components.community.Layout", {
  label,
  tab: "Custom GH integration",
  children: TabContent,
});
