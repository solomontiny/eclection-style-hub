export const ADVERT_VIDEO_MAX_BYTES = 15 * 1024 * 1024;

export function validateAdvertVideo(file) {
  if (!file || file.type !== "video/mp4") return "Choose an MP4 video file.";
  if (file.size > ADVERT_VIDEO_MAX_BYTES)
    return "Video must be 15 MB or smaller. 3–10 MB is recommended.";
  return null;
}
