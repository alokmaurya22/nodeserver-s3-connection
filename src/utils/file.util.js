import { randomUUID } from "crypto";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// Allowed upload destinations (STRICT)
const FOLDER_MAP = {
  post_video: { path: "post/video", types: VIDEO_TYPES },
  post_thumbnail: { path: "post/thumbnail", types: IMAGE_TYPES },

  twynlights_video: { path: "twynlights/video", types: VIDEO_TYPES },
  twynlights_thumbnail: { path: "twynlights/thumbnail", types: IMAGE_TYPES },

  profile_dp: { path: "profile/profile-dp", types: IMAGE_TYPES },
  profile_video: { path: "profile/profile-video", types: VIDEO_TYPES },
  profile_thumbnail: { path: "profile/thumbnail", types: IMAGE_TYPES },

  team_logo: { path: "team/team-logo", types: IMAGE_TYPES },
  league_logo: { path: "league/league-logo", types: IMAGE_TYPES }
};

export function validateFile({ context, contentType }) {
  const rule = FOLDER_MAP[context];
  if (!rule) return "Invalid upload context";
  if (!rule.types.includes(contentType)) return "Invalid file type";
  return null;
}

export function buildFileKey({ context, contentType }) {
  const rule = FOLDER_MAP[context];
  const ext = contentType.split("/")[1];
  return `${rule.path}/${randomUUID()}.${ext}`;
}
