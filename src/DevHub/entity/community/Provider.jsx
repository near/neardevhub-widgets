const { handle, Children } = props;

const {
  getAccountCommunityPermissions,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getCommunity,
} = VM.require("${REPL_DEVHUB}/widget/DevHub.modules.contract-sdk");

if (
  !getCommunity ||
  !getAccountCommunityPermissions ||
  !createCommunity ||
  !updateCommunity ||
  !deleteCommunity
) {
  return <p>Loading modules...</p>;
}

const CenteredMessage = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: ${(p) => p.height ?? "100%"};
`;

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
// const [community, setCommunity] = useState(null);

// TODO: This doesn't work as expected, it does not catch the error
const community = Near.view("${REPL_DEVHUB_CONTRACT}", "get_community", {
  handle: handle,
});

const permissions = getAccountCommunityPermissions("${REPL_DEVHUB_CONTRACT}", {
  account_id: context.accountId,
  community_handle: handle,
}) || {
  can_configure: false,
  can_delete: false,
};

if (isLoading) {
  return (
    <CenteredMessage height={"384px"}>
      <h2>Loading...</h2>
    </CenteredMessage>
  );
} else if (!community) {
  return (
    <CenteredMessage height={"384px"}>
      <h2>{`Community with handle "${handle}" not found.`}</h2>
    </CenteredMessage>
  );
}

function handleUpdateCommunity(v) {
  updateCommunity(v);
}

community.addons = [
  {
    // id: `${handle}-wiki-1`,
    addon_id: "wiki",
    display_name: "Screams and Whispers",
    enabled: true,
    parameters: JSON.stringify({
      title: "Screams and Whispers",
      description: "The Haunted Hack House Wiki",
      content:
        "🎃 **Hack-o-ween is Upon Us!** 🎃 Prepare to be spooked and code in the dark shadows. As the moon rises on this haunted month, Boo's Horror House Wiki welcomes you to join us for the sinister celebration of Hacktoberfest and Hack-o-ween. 🦇 **Hacktoberfest Tombstone** 🦇 Don't be scared, contribute to our open-source projects during this eerie month. Dive into the world of code and contribute your terrifyingly awesome enhancements, bug fixes, and features. Each pull request brings you one step closer to the grand prize. Who knows what dark secrets and hidden gems you'll unearth in our haunted repositories? 🕸️ **Hack-o-ween: Unmask the Coder Within** 🕸️ Halloween is a time for costumes and masks, but this Hacktoberfest, it's all about unmasking the coder within you. Join our ghoulish coding challenges, hackathons, and themed coding nights. Share your code horrors and achievements in our spooky community. 🌙 **The Boo's Horror House Wiki** 🌙 *Screams and Whispers* beckon you to explore our wiki of the supernatural and macabre. Unlock the mysteries of coding in the dark and discover eerie coding tricks and tales from the crypt. Contribute to our spine-chilling articles and be a part of this horror-themed knowledge repository. It's a month filled with frights, delights, and code that bites! Join us for Hacktoberfest and Hack-o-ween, if you dare... 🧛‍♂️💻🦉",
    }),
  },
];

const availableAddons = [
  {
    id: "wiki",
    title: "Wiki",
    icon: "bi bi-book",
    description: "Create a wiki for your community",
    view_widget: "devhub-dev.testnet/widget/DevHub.entity.addon.wiki.Viewer",
    configurator_widget:
      "devhub-dev.testnet/widget/DevHub.entity.addon.wiki.Configurator",
  },
  {
    id: "telegram",
    title: "Telegram",
    icon: "bi bi-telegram",
    description: "Connect your telegram",
    view_widget:
      "devhub-dev.testnet/widget/DevHub.entity.addon.telegram.Viewer",
    configurator_widget:
      "devhub-dev.testnet/widget/DevHub.entity.addon.telegram.Configurator",
  },
  {
    id: "github",
    title: "Github",
    icon: "bi bi-github",
    description: "Connect your github",
    view_widget: "devhub-dev.testnet/widget/DevHub.entity.addon.github.Viewer",
    configurator_widget:
      "devhub-dev.testnet/widget/DevHub.entity.addon.github.Configurator",
  },
  {
    id: "kanban",
    title: "Kanban",
    icon: "bi bi-columns-gap",
    description: "Connect your github kanban board",
    view_widget: "devhub-dev.testnet/widget/DevHub.entity.addon.kanban.Viewer",
    configurator_widget:
      "devhub-dev.testnet/widget/DevHub.entity.addon.kanban.Configurator",
  },
  {
    id: "blog",
    title: "Blog",
    icon: "bi bi-newspaper",
    description: "Create a blog for your community",
    view_widget: "devhub-dev.testnet/widget/DevHub.entity.addon.blog.Viewer",
    configurator_widget:
      "devhub-dev.testnet/widget/DevHub.entity.addon.blog.Configurator",
  },
];

return (
  <Children
    permissions={permissions}
    community={community}
    availableAddons={availableAddons}
    createCommunity={createCommunity}
    updateCommunity={handleUpdateCommunity}
    deleteCommunity={deleteCommunity}
  />
);
