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
    .filter(([_key, nullable]) => (nullable ?? null) !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `/#/${nearDevGovGigsWidgetsAccountId}/widget/gigs-board.pages.${widgetName}${
    linkPropsQuery ? "?" : ""
  }${linkPropsQuery}`;
}
/* END_INCLUDE: "common.jsx" */
/* INCLUDE: "core/lib/record" */
const Record = {
  deepFieldUpdate: (
    node,
    { input, params, path: [nextNodeKey, ...remainingPath], via: toFieldValue }
  ) => ({
    ...node,

    [nextNodeKey]:
      remainingPath.length > 0
        ? Record.deepFieldUpdate(
            Record.typeMatch(node[nextNodeKey]) ||
              Array.isArray(node[nextNodeKey])
              ? node[nextNodeKey]
              : {
                  ...((node[nextNodeKey] ?? null) !== null
                    ? { __archivedLeaf__: node[nextNodeKey] }
                    : {}),
                },

            { input, path: remainingPath, via: toFieldValue }
          )
        : toFieldValue({
            input,
            lastKnownValue: node[nextNodeKey],
            params,
          }),
  }),

  isEqual: (input1, input2) =>
    Record.typeMatch(input1) && Record.typeMatch(input2)
      ? JSON.stringify(Record.toOrdered(input1)) ===
        JSON.stringify(Record.toOrdered(input2))
      : false,

  toOrdered: (input) =>
    Object.keys(input)
      .sort()
      .reduce((output, key) => ({ ...output, [key]: input[key] }), {}),

  pick: (object, subsetKeys) =>
    Object.fromEntries(
      Object.entries(object ?? {}).filter(([key, _]) =>
        subsetKeys.includes(key)
      )
    ),

  typeMatch: (input) =>
    input !== null && typeof input === "object" && !Array.isArray(input),
};
/* END_INCLUDE: "core/lib/record" */
/* INCLUDE: "core/adapter/dev-hub" */
const devHubAccountId =
  props.nearDevGovGigsContractAccountId ||
  (context.widgetSrc ?? "devgovgigs.near").split("/", 1)[0];

const DevHub = {
  edit_community_github: ({ handle, github }) =>
    Near.call(devHubAccountId, "edit_community_github", { handle, github }) ??
    null,

  get_access_control_info: () =>
    Near.view(devHubAccountId, "get_access_control_info") ?? null,

  get_all_authors: () => Near.view(devHubAccountId, "get_all_authors") ?? null,

  get_all_communities: () =>
    Near.view(devHubAccountId, "get_all_communities") ?? null,

  get_all_labels: () => Near.view(devHubAccountId, "get_all_labels") ?? null,

  get_community: ({ handle }) =>
    Near.view(devHubAccountId, "get_community", { handle }) ?? null,

  get_post: ({ post_id }) =>
    Near.view(devHubAccountId, "get_post", { post_id }) ?? null,

  get_posts_by_author: ({ author }) =>
    Near.view(devHubAccountId, "get_posts_by_author", { author }) ?? null,

  get_posts_by_label: ({ label }) =>
    Near.view(nearDevGovGigsContractAccountId, "get_posts_by_label", {
      label,
    }) ?? null,

  get_root_members: () =>
    Near.view(devHubAccountId, "get_root_members") ?? null,

  useQuery: ({ name, params }) => {
    const initialState = { data: null, error: null, isLoading: true };

    const cacheState = useCache(
      () =>
        Near.asyncView(devHubAccountId, ["get", name].join("_"), params ?? {})
          .then((response) => ({
            ...initialState,
            data: response ?? null,
            isLoading: false,
          }))
          .catch((error) => ({
            ...initialState,
            error: props?.error ?? error,
            isLoading: false,
          })),

      JSON.stringify({ name, params }),
      { subscribe: true }
    );

    return cacheState === null
      ? { ...cacheState, ...initialState }
      : cacheState;
  },
};
/* END_INCLUDE: "core/adapter/dev-hub" */
/* INCLUDE: "entity/viewer" */
const access_control_info = DevHub.useQuery({
  name: "access_control_info",
});

const Viewer = {
  isDevHubModerator:
    access_control_info.data === null || access_control_info.isLoading
      ? false
      : access_control_info.data.members_list[
          "team:moderators"
        ]?.children?.includes?.(context.accountId) ?? false,
};
/* END_INCLUDE: "entity/viewer" */

const withoutEmptyStrings = (array) =>
  array.filter((string) => string.length > 0);

const accessControlSectionFormatter = ({ admins }) => ({
  admins: withoutEmptyStrings(admins),
});

const CommunityDefaults = {
  handle: null,
  admins: [context.accountId],
  name: "",
  description: "",
  bio_markdown: null,

  logo_url:
    "https://ipfs.near.social/ipfs/bafkreibysr2mkwhb4j36h2t7mqwhynqdy4vzjfygfkfg65kuspd2bawauu",

  banner_url:
    "https://ipfs.near.social/ipfs/bafkreic4xgorjt6ha5z4s5e3hscjqrowe5ahd7hlfc5p4hb6kdfp6prgy4",

  tag: "",
  github_handle: null,
  telegram_handle: null,
  twitter_handle: null,
  website_url: null,
  github: null,
  sponsorship: null,
  wiki1: null,
  wiki2: null,
};

const CommunityEditorUI = ({ handle: communityHandle }) => {
  State.init({
    canEdit: false,
    communityData: null,
    hasUnsavedChanges: false,
    isCommunityNew: typeof communityHandle !== "string",
  });

  const community = state.isCommunityNew
    ? { data: CommunityDefaults, error: null, isLoading: false }
    : DevHub.useQuery({
        name: "community",
        params: { handle: communityHandle },
      });

  const canEdit =
    typeof communityHandle !== "string" ||
    (community.data?.admins ?? []).includes(context.accountId) ||
    Viewer.isDevHubModerator;

  const isSynced = Record.isEqual(state.communityData, community.data);

  if (state.communityData === null) {
    State.update((lastKnownState) => ({
      ...lastKnownState,
      communityData: community.data,
      hasUnsavedChanges: false,
      isCommunityNew: typeof communityHandle !== "string",
    }));
  } else if (
    // TODO: Remove or fix this probably redundant branch
    typeof communityHandle === "string" &&
    !state.hasUnsavedChanges &&
    !community.isLoading &&
    !isSynced
  ) {
    State.update((lastKnownState) => ({
      ...lastKnownState,
      communityData: community.data,
      hasUnsavedChanges: false,
    }));
  }

  const sectionSubmit = (sectionData) => {
    State.update((lastKnownState) => {
      const communityDataUpdate = {
        ...Object.entries(sectionData).reduce(
          (update, [propertyKey, propertyValue]) => ({
            ...update,

            [propertyKey]:
              typeof propertyValue !== "string" ||
              (propertyValue?.length ?? 0) > 0
                ? propertyValue ?? null
                : null,
          }),

          lastKnownState.communityData
        ),
      };

      return {
        ...lastKnownState,
        communityData: communityDataUpdate,

        hasUnsavedChanges: !Record.isEqual(communityDataUpdate, community.data),
      };
    });
  };

  const changesSave = () =>
    Near.call(
      nearDevGovGigsContractAccountId,
      state.isCommunityNew ? "add_community" : "edit_community",

      {
        handle: state.isCommunityNew
          ? state.communityData?.handle
          : communityHandle,

        community: state.communityData,
      }
    );

  const onDelete = () =>
    Near.call(nearDevGovGigsContractAccountId, "delete_community", {
      handle: communityHandle,
    });

  return community.isLoading && !state.isCommunityNew ? (
    <div>Loading...</div>
  ) : (
    <div className="d-flex flex-column align-items-center gap-4 p-4">
      {typeof community.data?.handle === "string" || state.isCommunityNew ? (
        <>
          {widget("feature.community-editor.branding-section", {
            isMutable: canEdit,
            onChangesSubmit: sectionSubmit,
            values: state.communityData,
          })}

          {widget("components.organism.editor", {
            classNames: {
              submit: "btn-primary",
              submitAdornment: "bi-check-circle-fill",
            },

            heading: "Basic information",
            isEditorActive: state.isCommunityNew,
            isMutable: canEdit,
            onChangesSubmit: sectionSubmit,
            submitLabel: "Accept",
            data: state.communityData,

            schema: {
              name: {
                inputProps: {
                  min: 2,
                  max: 30,
                  placeholder: "Community name.",
                  required: true,
                },

                label: "Name",
                order: 1,
              },

              description: {
                inputProps: {
                  min: 2,
                  max: 60,

                  placeholder:
                    "Describe your community in one short sentence that will appear in the discovery communities page.",

                  required: true,
                },

                label: "Description",
                order: 2,
              },

              handle: {
                inputProps: {
                  min: 2,
                  max: 40,

                  placeholder:
                    "Choose unique URL handle for your community by adding letters and numbers. Example: zero-knowledge.",

                  required: true,
                },

                label: "Handle",
                order: 3,
              },

              tag: {
                inputProps: {
                  min: 2,
                  max: 20,

                  placeholder:
                    "Choose one tag for your community. Any posts with this tag will show up in your community feed.",

                  required: true,
                },

                label: "Tag",
                order: 4,
              },
            },
          })}

          {widget("components.organism.editor", {
            classNames: {
              submit: "btn-primary",
              submitAdornment: "bi-check-circle-fill",
            },

            heading: "About",
            isMutable: canEdit,
            onChangesSubmit: sectionSubmit,
            submitLabel: "Accept",
            data: state.communityData,

            schema: {
              bio_markdown: {
                format: "markdown",

                inputProps: {
                  min: 2,
                  max: 200,

                  placeholder:
                    "Tell more about your community. This will appear in the About section of your community’s homepage.",
                },

                label: "Bio",
                multiline: true,
                order: 1,
              },

              twitter_handle: {
                inputProps: { min: 2, max: 60 },
                label: "Twitter handle",
                order: 2,
              },

              github_handle: {
                inputProps: { min: 2, max: 60 },
                label: "Github organization handle",
                order: 3,
              },

              telegram_handle: {
                inputProps: { min: 2, max: 60 },
                label: "Telegram handle",
                order: 4,
              },

              website_url: {
                inputProps: { min: 2, max: 60 },
                label: "Website",
                order: 5,
              },
            },
          })}

          {widget("components.organism.editor", {
            classNames: {
              submit: "btn-primary",
              submitAdornment: "bi-check-circle-fill",
            },

            formatter: accessControlSectionFormatter,
            heading: "Access control",
            isMutable: canEdit,
            onChangesSubmit: sectionSubmit,
            submitLabel: "Accept",
            data: state.communityData,

            schema: {
              admins: {
                format: "comma-separated",
                inputProps: { required: true },
                label: "Admins",
                order: 1,
              },
            },
          })}

          {widget("components.organism.editor", {
            classNames: {
              submit: "btn-primary",
              submitAdornment: "bi-check-circle-fill",
            },

            heading: "Wiki page 1",
            isMutable: canEdit,
            onChangesSubmit: (value) => sectionSubmit({ wiki1: value }),
            submitLabel: "Accept",
            data: state.communityData?.wiki1,

            schema: {
              name: {
                label: "Name",
                order: 1,
              },

              content_markdown: {
                format: "markdown",
                label: "Content",
                multiline: true,
                order: 2,
              },
            },
          })}

          {widget("components.organism.editor", {
            classNames: {
              submit: "btn-primary",
              submitAdornment: "bi-check-circle-fill",
            },

            heading: "Wiki page 2",
            isMutable: canEdit,
            onChangesSubmit: (value) => sectionSubmit({ wiki2: value }),
            submitLabel: "Accept",
            data: state.communityData?.wiki2,

            schema: {
              name: {
                label: "Name",
                order: 1,
              },

              content_markdown: {
                format: "markdown",
                label: "Content",
                multiline: true,
                order: 2,
              },
            },
          })}

          {!state.isCommunityNew && Viewer.isDevHubModerator ? (
            <div
              className="d-flex justify-content-center gap-4 p-4 w-100"
              style={{ maxWidth: 896 }}
            >
              {widget("components.atom.button", {
                classNames: {
                  root: "btn-lg btn-outline-danger border-none",
                },

                label: "Delete community",
                onClick: onDelete,
              })}
            </div>
          ) : null}

          {canEdit && state.hasUnsavedChanges && (
            <div
              className="position-fixed end-0 bottom-0 bg-transparent pe-4 pb-4"
              style={{
                borderTopLeftRadius: "100%",
              }}
            >
              {widget("components.atom.button", {
                classNames: {
                  root: "btn-lg btn-success",

                  adornment: `bi ${
                    state.isCommunityNew
                      ? "bi-rocket-takeoff-fill"
                      : "bi-exclamation-triangle-fill"
                  }`,

                  adornmentHover: `bi ${
                    state.isCommunityNew
                      ? "bi-rocket-takeoff-fill"
                      : "bi-sign-merge-right-fill"
                  }`,
                },

                isCollapsible: true,
                label: state.isCommunityNew ? "Launch" : "Save",
                onClick: changesSave,
              })}
            </div>
          )}
        </>
      ) : (
        <div
          className="d-flex flex-column justify-content-center align-items-center w-100"
          style={{ height: 384 }}
        >
          <h2 className="h2">{`Community with handle "${communityHandle}" not found.`}</h2>
        </div>
      )}
    </div>
  );
};

return CommunityEditorUI(props);
