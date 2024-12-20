const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const httpbin = fetch(`https://httpbin.org/headers`);

const { getCommunity } = VM.require(
  "${REPL_DEVHUB}/widget/core.adapter.devhub-contract"
) || {
  getCommunity: () => {},
};
const imagelink =
  "https://ipfs.near.social/ipfs/bafkreiajzvmy7574k7mp3if6u53mdukfr3hoc2kjkhjadt6x56vqhd5swy";

const { data, onEdit, community: handle, isAllowedToEdit } = props;

const {
  category,
  title,
  subtitle,
  publishedAt: date,
  content,
  author,
  communityAddonId,
} = data;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  padding: 0 3rem;
  margin-bottom: 2rem;
  position: relative;

  span.news {
    color: #f40303;
  }

  span.reference {
    color: #ff7a00;
  }

  span.guide {
    color: #004be1;
  }

  span.category {
    font-size: 1.5rem;
    font-style: normal;
    font-weight: 700;
    line-height: 20px; /* 125% */
    text-transform: uppercase;
  }

  div.date {
    color: #818181;
    font-size: 1rem;
    font-style: normal;
    font-weight: 400;
    line-height: 20px; /* 125% */
    margin: 1.5rem 0;
    width: 100%;
  }

  h1 {
    color: #151515;
    font-size: 3.5rem;
    font-style: normal;
    font-weight: 700;
    line-height: 100%; /* 88px */
    margin: 1.5rem 0;
  }

  p.subtitle {
    color: #555;
    font-size: 1.5rem;
    font-style: normal;
    font-weight: 400;
    line-height: 110%; /* 35.2px */
    margin: 0;
  }

  .edit-icon {
    position: absolute;
    top: 20px;
    right: 20px;
    cursor: pointer;
  }

  .share-icon {
    position: absolute;
    top: 25px;
    right: 55px;
    cursor: pointer;
  }

  @media screen and (max-width: 768px) {
    padding: 0 1rem;

    span.category {
      font-size: 0.75rem;
    }

    h1 {
      font-size: 2rem;
    }

    p.subtitle {
      font-size: 1rem;
    }
  }
`;

const BackgroundImage = styled.img`
  width: 100%;
  height: auto;
  object-fit: cover;
  margin-bottom: 1rem;
`;

if (!handle) {
  return <div>Community handle not found</div>;
}

const community = getCommunity({ handle: handle });

let communityConfig = (community.addons || []).find(
  (addon) => addon.id === communityAddonId
);

if (communityConfig === undefined) {
  return <div>Community addon not found</div>;
}
const parameters = JSON.parse(communityConfig.parameters || {}) || {};

// Make sure only the categories that are configured in the settings are displayed.
let categoryIsOptionInSettings = true;
let categoriesInSettings = (parameters?.categories || []).map((c) => c.value);
if (
  categoriesInSettings.length > 0 &&
  !categoriesInSettings.includes(category) &&
  category !== "" &&
  category !== null
) {
  categoryIsOptionInSettings = false;
}

const options = { year: "numeric", month: "short", day: "numeric" };
const formattedDate = new Date(date).toLocaleString("en-US", options);

return (
  <>
    <BackgroundImage src={imagelink} />
    <Container>
      <Widget
        src="${REPL_DEVHUB}/widget/devhub.components.molecule.ShareButton"
        props={{
          className: "share-icon",
          size: "35px",
          postType: "blog",
          externalLink: href({
            gateway: httpbin?.body?.headers?.Origin?.slice(8) ?? "near.social",
            widgetSrc: "${REPL_DEVHUB}/widget/app",
            params: {
              page: "blogv2",
              community: community.handle,
              id: data.id,
            },
          }),
        }}
      />
      {isAllowedToEdit && (
        <div className="edit-icon" onClick={onEdit}>
          <div class="bi bi-pencil-square" style={{ fontSize: "30px" }}></div>
        </div>
      )}
      {category &&
        parameters.categoriesEnabled === "enabled" &&
        categoryIsOptionInSettings && (
          <span
            className={`category ${category && category.toLowerCase()}`}
            data-testid="blog-category"
          >
            {category}
          </span>
        )}
      <h1 data-testid="blog-title">{title}</h1>
      <p className="subtitle">{subtitle}</p>
      <div className="d-flex flex-row justify-content-between date">
        {author && parameters.authorEnabled !== "disabled" && (
          <div data-testid="blog-author">{author}</div>
        )}
        <div data-testid="blog-date">{formattedDate}</div>
      </div>
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.SimpleMDEViewer"}
        props={{ content: content }}
      />
    </Container>
  </>
);
