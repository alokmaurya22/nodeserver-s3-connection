import wixData from "wix-data";
import wixWindow from "wix-window";
import wixLocation from "wix-location";
import { session, local } from "wix-storage";


// ============================================
// 🔹 FILTER FLAGS
// ============================================
// true  = only current user
// false = show all users
const FILTER_TEAMS_BY_USER = true;
const FILTER_TWYNIGHTS_BY_USER = true;
const FILTER_POSTS_BY_USER = false;
let SHOW_MY_TEAMS_USERS = true; // default = My team

// ============================================
// GLOBALS
// ============================================
let currentUser = null;
let currentUserItem = null;
let videoList = [];
let postsList = [];

// ============================================
// HELPERS
// ============================================
function getImageUrl(img) {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("wix:image://")) {
    const id = img.replace("wix:image://v1/", "").split("/")[0].split("#")[0];
    return `https://static.wixstatic.com/media/${id}`;
  }
  return img;
}

function isValidUsername(u) {
  if (!u) return false;
  const invalid = ["profile", "home", "about", "contact", "null", "undefined"];
  return !invalid.includes(u.toLowerCase());
}

function normalizeCount(val) {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ============================================
// PAGE READY
// ============================================
$w.onReady(() => {
  $w("#html-loader").show();
  $w("#pageLoader").show();
  initTimelinesButton();
  profilePageButtons();
  initClickMeCTA();
  initProfileRedirectButtons();
  resolveUserAndLoad();
});


// ============================================
// BUTTONS
// ============================================
function initTimelinesButton() {
  $w("#timelines-btn").onClick(() => {
    if (!currentUser) return;
    wixLocation.to(`/timelines?user=${currentUser}`);
  });
}

function profilePageButtons() {
  $w("#post-btn").onClick(() => {
    $w("#post-txt-btn").scrollTo();
  });

  $w("#twynlights-btn").onClick(() => {
    $w("#twynlights-txt-btn").scrollTo();
  });
}
// ============================================
// PROFILE PAGE MESSAGE HANDLER
// ============================================
function setProfilePageMessage(twynlightsCount) {

  const msg = $w("#profile-page-message");
  if (!msg) return;

  // Logged-in user (session/local)
  const loggedInUser =
    session.getItem("currentUser") ||
    local.getItem("currentUser");

  // URL user
  const urlUser = currentUser; // already resolved username

  // --------------------------------
  // CASE 3️⃣ — No Twynlights
  // --------------------------------
  if (twynlightsCount === 0) {
    msg.text =
      "Your Twynlights will appear here once your first Magic Moment is created";
    msg.show();
    return;
  }

  // --------------------------------
  // CASE 1️⃣ — Same user + has data
  // --------------------------------
  if (loggedInUser && loggedInUser === urlUser) {
    msg.text = "All your highlight moments, in one place.";
    msg.show();
    return;
  }

  // --------------------------------
  // CASE 2️⃣ — Different user + has data
  // --------------------------------
  const fullName =
    currentUserItem?.name ||
    currentUserItem?.fullName ||
    "User";

  msg.text = `A collection of ${fullName}’s highlight moments`;
  msg.show();
}


// ============================================
// MAIN PIPELINE
// ============================================
async function resolveUserAndLoad() {
  const slug = wixLocation.path[0];
  currentUser = isValidUsername(slug) ? slug : null;
  if (!currentUser) return;

  const res = await wixData.query("Users")
    .eq("username", currentUser)
    .limit(1)
    .find();

  if (!res.items.length) return;

  currentUserItem = res.items[0];

  await loadProfile();
  hideLoader();
  loadTeams();
  loadTwynlights();
  loadPosts();
  loadUsersForSlider();
}

// ============================================
// PROFILE
// ============================================
async function loadProfile() {
  return new Promise(resolve => {

    $w("#user-full-name2").text = currentUserItem.name || "";
    $w("#userbio").text = currentUserItem.bio || "";

    if (currentUserItem.profileImage) {
      $w("#user-DP").src = getImageUrl(currentUserItem.profileImage);
    }

    if (currentUserItem.heroImage) {
      $w("#clickMeImg").src = getImageUrl(currentUserItem.heroImage);
    }

    $w("#badge1count").text = "X " + normalizeCount(currentUserItem.badge1count);
    $w("#badge2count").text = "X " + normalizeCount(currentUserItem.badge2count);
    $w("#badge3count").text = "X " + normalizeCount(currentUserItem.badge3count);
    $w("#badge4count").text = "X " + normalizeCount(currentUserItem.badge4count);

    setTimeout(resolve, 600);
  });
}

// ============================================
// LOADER
// ============================================
function hideLoader() {
  setTimeout(() => {
    $w("#pageLoader").hide();
    $w("#html-loader").hide();
  }, 260);
}

// ============================================
// TEAMS
// ============================================
async function loadTeams() {
  try {
    let teams = [];

    if (FILTER_TEAMS_BY_USER) {
      const ref = await wixData.queryReferenced(
        "Users",
        currentUserItem._id,
        "userTeams"
      );

      teams = ref.items.map(t => ({
        logo: getImageUrl(t.logo),
        name: t.teamName,
        count: t.playersCount || 0
      }));

    } else {
      const res = await wixData.query("Teams").find();
      teams = res.items.map(t => ({
        logo: getImageUrl(t.logo),
        name: t.teamName,
        count: t.playersCount || 0
      }));
    }

    $w("#teams-count").text = String(teams.length);
    $w("#html1").postMessage({ type: "teamsData", items: teams });

  } catch {
    //
  }
}

// ============================================
// TWYNLIGHTS
// ============================================
async function loadTwynlights() {
  try {
    let query = wixData.query("Twynlights").descending("uploadDate");

    if (FILTER_TWYNIGHTS_BY_USER) {
      query = query.eq("username", currentUserItem._id);
    }

    const res = await query.find();
    const now = Date.now();

    videoList = res.items.map(i => ({
      id: i._id,
      collection: "Twynlights",
      thumbnail: getImageUrl(i.thumbnailImage),
      videoUrl: i.videoUrl,
      caption: i.caption || "",
      location: i.locations || "",
      daysOld: i.uploadDate
        ? Math.floor((now - new Date(i.uploadDate).getTime()) / 86400000)
        : 0
    }));

    $w("#html2").postMessage({ type: "twynlights", items: videoList });
    if (videoList.length < 1) {
      $w("#html2").hide();
      $w("#box8").hide();
    } else {
      $w("#html2").show();
      $w("#box8").show();
    }

    // 🔥 SET PROFILE PAGE MESSAGE
    setProfilePageMessage(videoList.length);

  } catch (err) {
    console.error("loadTwynlights FAILED", err);
  }
}

// ============================================
// POSTS
// ============================================
async function loadPosts() {
  try {
    let query = wixData.query("Posts").descending("_createdDate");

    if (FILTER_POSTS_BY_USER) {
      query = query.eq("username", currentUserItem._id);
    }

    const res = await query.find();
    const now = Date.now();

    postsList = res.items.map(i => ({
      id: i._id,
      collection: "Posts",
      thumbnail: getImageUrl(i.thumbnailImage),
      videoUrl: i.videoUrl,
      caption: i.caption || "",
      sport: i.sport || "",
      location: i.locations || "",
      daysOld: i.uploadDate
        ? Math.floor((now - new Date(i.uploadDate).getTime()) / 86400000)
        : 0
    }));

    $w("#html3").postMessage({ type: "postsData", items: postsList });

  } catch (err) {
    console.error("loadPosts FAILED", err);
  }
}

// ============================================
// USERS SLIDER (HTML #html4)
// ============================================
async function loadUsersForSlider() {

  if (!currentUserItem?._id) return;

  let users = [];

  // =================================================
  // 🔥 MY TEAMS USERS
  // =================================================
  if (SHOW_MY_TEAMS_USERS) {

    // 1️⃣ current user ke teams
    const myTeams = await wixData.queryReferenced(
      "Users",
      currentUserItem._id,
      "userTeams"
    );

    if (!myTeams.items.length) {
      $w("#html4").postMessage({ type: "usersData", items: [] });
      return;
    }

    // 2️⃣ Teams → Users_userTeams
    const userIdSet = new Set();

    for (const team of myTeams.items) {
      const teamUsers = await wixData.queryReferenced(
        "Teams",
        team._id,
        "Users_userTeams"
      );

      teamUsers.items.forEach(u => {
        if (u._id !== currentUserItem._id) {
          userIdSet.add(u._id);
        }
      });
    }

    const userIds = Array.from(userIdSet);

    if (!userIds.length) {
      $w("#html4").postMessage({ type: "usersData", items: [] });
      return;
    }

    // 🔥 IMPORTANT FIX → include userTeams
    const res = await wixData.query("Users")
      .hasSome("_id", userIds)
      .include("userTeams")
      .find();

    users = res.items;

  } 
  // =================================================
  // 🔥 ALL USERS
  // =================================================
  else {

    // 🔥 IMPORTANT FIX → include userTeams
    const res = await wixData.query("Users")
      .ne("_id", currentUserItem._id)
      .include("userTeams")
      .find();

    users = res.items;
  }

  // =================================================
  // MAP DATA FOR HTML (TEAM FIXED)
  // =================================================
  const mappedUsers = users.map(u => {

    const firstTeam =
      Array.isArray(u.userTeams) && u.userTeams.length
        ? u.userTeams[0]
        : null;

    return {
      username: u.username,
      name: u.name || u.fullName || "User",
      image: getImageUrl(u.profileImage),

      // 🔥 TEAM DATA (NOW WORKING)
      teamName: firstTeam ? firstTeam.teamName : "",
      teamLogo: firstTeam ? getImageUrl(firstTeam.logo) : ""
    };
  });

  // =================================================
  // SEND TO HTML
  // =================================================
  $w("#html4").postMessage({
    type: "usersData",
    items: mappedUsers
  });
}


// ============================================
// HTML EVENTS
// ============================================
$w("#html2").onMessage(e => {
  if (e.data?.type === "videoClick") {
    const v = videoList[e.data.index];
    if (v?.videoUrl) {
      wixWindow.openLightbox("lightboxPopup", {
        video: v.videoUrl,
        videoId: v.id,
        collection: v.collection
      });
    }
  }
  if (e.data?.type === "viewMoreTwynlights") {
    if (!currentUser) return;
    wixLocation.to(`/video?type=twynlights&&user=${currentUser}`);
  }
});

$w("#html3").onMessage(e => {
  if (e.data?.type === "postClick") {
    const p = postsList[e.data.index];
    if (p?.videoUrl) {
      wixWindow.openLightbox("lightboxPopup", {
        video: p.videoUrl,
        videoId: p.id,
        collection: p.collection
      });
    }
  }
  if (e.data?.type === "viewMorePosts") {
    if (!currentUser) return;
    wixLocation.to(`/video?type=post&&user=${currentUser}`);
  }
});

// 🔥 USER CLICK → PROFILE
$w("#html4").onMessage(async (e) => {

  // ---------------------------
  // USER CLICK → PROFILE
  // ---------------------------
  if (e.data?.type === "userClick") {
    const username = e.data.username;
    if (username) {
      wixLocation.to(`/profile/${username}`);
    }
  }

  // ---------------------------
  // TOGGLE CHANGE (My team / All users)
  // ---------------------------
  if (e.data?.type === "usersFilterChange") {
    SHOW_MY_TEAMS_USERS = e.data.mode === "myTeams";
    await loadUsersForSlider();
  }
});



// ============================================
// HERO CTA + VIDEO (UNCHANGED)
// ============================================
function initClickMeCTA() {
  const cta = $w("#blackBox");
  const ctaImg = $w("#clickMeImg");
  const player = $w("#heroVideoPlayer");

  if (!cta || !player) return;

  ctaImg.show();

  cta.onClick(() => {
    loadHeroVideo();
    ctaImg.hide("fade", { duration: 300 });
    player.mute();
    player.play().catch(() => {});
  });
}

function loadHeroVideo() {
  const player = $w("#heroVideoPlayer");
  const video = currentUserItem.heroVideo;
  const poster = currentUserItem.heroImage;

  player.hide();

  if (!video && poster) {
    player.poster = getImageUrl(poster);
    player.show();
    return;
  }

  if (video) {
    player.src = video;
    player.show();
    player.onViewportEnter(() => player.play().catch(() => {}));
    player.onViewportLeave(() => player.pause());
  }
}

// ============================================
// PROFILE BUTTON REDIRECTS
// ============================================
function initProfileRedirectButtons() {

  // POSTS
  $w("#post-txt-btn").onClick(() => {
    if (!currentUser) return;
    wixLocation.to(`/video?type=post&&user=${currentUser}`);
  });

  // TWYNLIGHTS
  $w("#twynlights-txt-btn").onClick(() => {
    if (!currentUser) return;
    wixLocation.to(`/video?type=twynlights&&user=${currentUser}`);
  });

  // USERS
  $w("#users-txt-btn").onClick(() => {
    //wixLocation.to(`/users`);
  });
}