import wixData from "wix-data";

/* ===============================
   GLOBALS - SEPARATE VARIABLES
=============================== */
let selectedTeamsFromHtml = [];

// POST files
let pendingPostVideoFile = null;
let pendingPostThumbnailFile = null;

// TWYNLIGHTS files
let pendingTwynlightsVideoFile = null;
let pendingTwynlightsThumbnailFile = null;

const BACKEND_URL = "http://localhost:5050";

/* ===============================
   CONTENT TYPE RESOLVER
=============================== */
function resolveContentType(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  const mimeMap = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  };
  return mimeMap[ext] || null;
}

/* ===============================
   S3 DIRECT UPLOAD (UNCHANGED - arrayBuffer)
=============================== */
async function uploadToS3Direct(fileData, context) {
  if (!fileData) return null;

  const { fileName, mimeType, arrayBuffer } = fileData;
  const contentType = mimeType || resolveContentType(fileName);

  const presignRes = await fetch(`${BACKEND_URL}/api/s3/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, contentType })
  });

  if (!presignRes.ok) {
    throw new Error("Presign failed");
  }

  const presignData = await presignRes.json();

  const blob = new Blob([arrayBuffer], { type: contentType });

  const uploadRes = await fetch(presignData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });

  if (!uploadRes.ok) {
    throw new Error("S3 upload failed");
  }

  return presignData.publicUrl;
}

/* ===============================
   PAGE READY
=============================== */
$w.onReady(function () {

  /* --------------------------------------
     SECTION SWITCHING
  -------------------------------------- */
  const sections = [
    "#box-add-user",
    "#box-add-teams",
    "#box-add-leauge",
    "#box-add-timelines",
    "#box-add-posts",
    "#box-add-twynlights"
  ];

  function hideAll() {
    sections.forEach(id => $w(id)?.hide());
  }

  function showSection(id) {
    hideAll();
    $w(id)?.show();
  }

  showSection("#box-add-user");

  $w("#add-user").onClick(() => showSection("#box-add-user"));
  $w("#add-teams").onClick(() => showSection("#box-add-teams"));
  $w("#add-leauge").onClick(() => showSection("#box-add-leauge"));
  $w("#add-timelines").onClick(() => showSection("#box-add-timelines"));
  $w("#add-posts").onClick(() => showSection("#box-add-posts"));
  $w("#add-twynlights").onClick(() => showSection("#box-add-twynlights"));

  /* --------------------------------------
     TEAMS → HTML
  -------------------------------------- */
  wixData.query("Teams")
    .limit(1000)
    .find()
    .then(res => {
      $w("#html1").postMessage({
        type: "TEAMS_DATA",
        teams: res.items.map(t => ({
          _id: t._id,
          teamName: t.teamName,
          sport: t.sport
        }))
      });
    });

  $w("#html1").onMessage(event => {
    if (event.data.type === "SELECTED_TEAMS") {
      selectedTeamsFromHtml = event.data.teams;
    }
  });

  /* --------------------------------------
     POST VIDEO FILE
  -------------------------------------- */
  $w("#postVideoUpload").onMessage(e => {
    if (e.data.type === "POST_VIDEO_FILE_SELECTED") {
      console.log("📥 POST video received:", e.data.fileName);
      pendingPostVideoFile = e.data;
    }
  });

  /* --------------------------------------
     POST THUMBNAIL FILE
  -------------------------------------- */
  $w("#postThumbnailUpload").onMessage(e => {
    if (e.data.type === "POST_THUMBNAIL_FILE_SELECTED") {
      console.log("📥 POST thumbnail received:", e.data.fileName);
      pendingPostThumbnailFile = e.data;
    }
  });

  /* --------------------------------------
     TWYNLIGHTS VIDEO FILE
  -------------------------------------- */
  $w("#twynlights-video-upload").onMessage(e => {
    if (e.data.type === "TWYNLIGHTS_VIDEO_FILE_SELECTED") {
      console.log("📥 TWYNLIGHTS video received:", e.data.fileName);
      pendingTwynlightsVideoFile = e.data;
    }
  });

  /* --------------------------------------
     TWYNLIGHTS THUMBNAIL FILE
  -------------------------------------- */
  $w("#twynlights-thumbnail-upload").onMessage(e => {
    if (e.data.type === "TWYNLIGHTS_THUMBNAIL_FILE_SELECTED") {
      console.log("📥 TWYNLIGHTS thumbnail received:", e.data.fileName);
      pendingTwynlightsThumbnailFile = e.data;
    }
  });

  /* --------------------------------------
     POSTS SUBMIT
  -------------------------------------- */
  if ($w("#post-submit")) {
    $w("#post-submit").onClick(async () => {
      try {
        $w("#post-submit").disable();
        $w("#post-submit").label = "Uploading...";

        const dataset = $w("#datasetPosts");

        const videoUrl = await uploadToS3Direct(pendingPostVideoFile, "post_video");
        const thumbUrl = await uploadToS3Direct(pendingPostThumbnailFile, "post_thumbnail");

        if (videoUrl) dataset.setFieldValue("videoLinkS3", videoUrl);
        if (thumbUrl) dataset.setFieldValue("thumbnailLinkS3", thumbUrl);

        await dataset.save();

        pendingPostVideoFile = null;
        pendingPostThumbnailFile = null;

        console.log("✅ Post saved");

      } catch (err) {
        console.error("Post upload failed:", err);
      } finally {
        $w("#post-submit").enable();
        $w("#post-submit").label = "Submit";
      }
    });
  }

  /* --------------------------------------
     TWYNLIGHTS SUBMIT
  -------------------------------------- */
  if ($w("#twynlights-submit")) {
    $w("#twynlights-submit").onClick(async () => {
      try {
        $w("#twynlights-submit").disable();
        $w("#twynlights-submit").label = "Uploading...";

        const dataset = $w("#twynlights1dataset");

        const videoUrl = await uploadToS3Direct(pendingTwynlightsVideoFile, "twynlights_video");
        const thumbUrl = await uploadToS3Direct(pendingTwynlightsThumbnailFile, "twynlights_thumbnail");

        if (videoUrl) dataset.setFieldValue("videoLinkS3", videoUrl);
        if (thumbUrl) dataset.setFieldValue("thumbnailLinkS3", thumbUrl);

        await dataset.save();

        pendingTwynlightsVideoFile = null;
        pendingTwynlightsThumbnailFile = null;

        $w("#twynlights-success-msg")?.show();
        setTimeout(() => $w("#twynlights-success-msg")?.hide(), 3000);

        console.log("✅ Twynlight saved");

      } catch (err) {
        console.error("Twynlight upload failed:", err);
      } finally {
        $w("#twynlights-submit").enable();
        $w("#twynlights-submit").label = "Submit";
      }
    });
  }

});