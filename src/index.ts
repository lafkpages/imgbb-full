import { getType } from "mime";
import type { User } from "@replit-svelte/types";

let IMGBB_KEY: string | undefined = undefined;
let IMGBB_COOKIE: string | undefined = undefined;
let IMGBB_USERNAME: string | undefined = undefined;

export const host = "imgbb.com";
export const website = `https://${host}`;
export const endpoint = `/json`;

export interface ImageUploadOptions {
  image: Blob | Buffer;
  username?: string;
  expiration?: ImageUploadExpiration;
  album?: string;
  name?: string;
}

export enum ImageUploadExpiration {
  OneHour = "PT1H",
  SixMonths = "P6M",
  Never = "",
}

export type ImageUploadResultCode = 200;

export interface ImageUploadResult {
  status_code: ImageUploadResultCode;
  status_txt?: string;
  success: {
    message?: string;
    code?: ImageUploadResultCode;
  };
  image: ImageUploadImage & {
    width?: number;
    height?: number;
    size_formatted?: string;
    time?: number;
    expiration?: number;
    likes?: number;
    description?: string | null;
    original_filename?: string;
    user?: ImageUploadUser;
    album?: ImageUploadAlbum;
    is_animated?: number;
    is_360?: number;
    nsfw?: number;
    id_encoded: string;
    url_viewer?: string;
    url_viewer_preview?: string;
    url_viewer_thumb?: string;
    image?: ImageUploadImage;
    thumb?: ImageUploadImage;
    display_url?: string;
    display_width?: number;
    display_height?: number;
    delete_url?: string;
    views_label?: string;
    likes_label?: string;
    how_long_ago?: string;
    date_fixed_peer?: string;
    title?: string;
    title_truncated?: string;
    title_truncated_html?: string;
    is_use_loader?: boolean;
  };
  request?: {
    action?: "upload" | string;
    album_id?: number;
    auth_token?: string;
    expiration?: ImageUploadExpiration;
    timestamp?: string;
    type?: "file" | string;
  };
}

export interface ImageUploadImage {
  filename?: string;
  name?: string;
  mime?: string;
  extension?: string;
  url?: string;
  size?: number;
}

export interface ImageUploadUser {
  name?: string;
  username?: string;
  website?: string;
  timezone?: string;
  language?: string;
  is_private?: number;
  premium?: number;
  show_nsfw_listings?: 0 | 1;
  image_count?: number;
  album_count?: number;
  image_keep_exif?: 0 | 1;
  image_expiration?: any;
  likes?: number;
  liked?: number;
  following?: number;
  followers?: number;
  content_views?: number;
  notifications_unread?: number;
  notifications_unread_display?: number;
  image_count_display?: string;
  album_count_display?: string;
  url?: string;
  url_albums?: string;
  url_liked?: string;
  url_following?: string;
  url_followers?: string;
  website_safe_html?: string;
  website_display?: string;
  image_count_label?: string;
  album_count_label?: string;
  firstname?: string;
  firstname_html?: string;
  name_short?: string;
  name_short_html?: string;
  avatar?: {
    filename?: string;
    url?: string;
  };
}

export interface ApiOptions {
  body: FormData;
  username?: string;
  cookie?: string;
  origin?: string;
  endpoint?: string;
  endpointUseOrigin?: boolean;
}

export interface ImageUploadAlbum {
  name?: string;
  time?: number;
  parent_id?: null | string;
  cover_id?: any;
  privacy?: "private_but_link" | any;
  privacy_notes?: string | null;
  privacy_readable?: string | null;
  password?: string | null;
  image_count?: number;
  description?: string | null;
  likes?: number;
  views?: number;
  id_encoded: string;
  url?: string;
  url_short?: string;
  name_html?: string;
  name_with_privacy_readable?: string;
  name_with_privacy_readable_html?: string;
  name_truncated?: string;
  name_truncated_html?: string;
  display_url?: string;
  display_width?: string;
  display_height?: string;
}

export interface ApiConfig {
  key?: string;
  cookie?: string;
  username?: string;
}

export function config(config: ApiConfig) {
  ({ key: IMGBB_KEY, cookie: IMGBB_COOKIE, username: IMGBB_USERNAME } = config);
}

function ensureCreds() {
  if (!IMGBB_KEY || !IMGBB_COOKIE || !IMGBB_USERNAME) {
    throw new Error("ImgBB credentials not configured, please use config()");
  }
}

export async function apiRequest(opts: ApiOptions) {
  ensureCreds();

  const origin =
    opts.origin || `https://${opts.username || IMGBB_USERNAME}.${host}`;

  const resp = await fetch(
    opts.endpoint || `${opts.endpointUseOrigin ? origin : website}${endpoint}`,
    {
      method: "POST",
      body: opts.body,
      headers: {
        cookie: opts.cookie || IMGBB_COOKIE!,
        origin,
      },
    },
  );

  if (!resp.ok) {
    const data = await resp.json();

    throw new Error(
      `response status ${resp.status}: ${
        data?.error?.message || "no error message provided"
      }`,
    );
  }

  return resp;
}

export async function uploadImage(opts: ImageUploadOptions) {
  ensureCreds();

  opts = {
    username: IMGBB_USERNAME,
    expiration: ImageUploadExpiration.SixMonths,
    name: "image.png",
    ...opts,
  };

  const type = getType(opts.name || "") || undefined;

  const blob =
    opts.image instanceof Blob
      ? opts.image
      : new Blob([opts.image], {
          type,
        });

  if (!(blob instanceof Blob)) {
    throw new TypeError("opts.image is not a blob");
  }

  const body = new FormData();

  body.set("action", "upload");
  body.set("album_id", opts.album || "");
  body.set("auth_token", IMGBB_KEY!);
  body.set("expiration", opts.expiration || "");
  body.set("source", blob, opts.name);
  body.set("timestamp", Date.now().toString());
  body.set("type", "file");

  const resp = await apiRequest({ body });

  const data: ImageUploadResult = await resp.json();

  return data;
}

export async function removeImages(id: string[] | string) {
  ensureCreds();

  if (id.length == 0) {
    return;
  }

  const body = new FormData();

  body.set("action", "delete");
  body.set("auth_token", IMGBB_KEY!);

  if (typeof id == "string") {
    body.set("single", "true");
    body.set("delete", "image");
    body.set("deleting[id]", id);
  } else {
    body.set("from", "list");
    body.set("multiple", "true");
    body.set("delete", "images");

    for (const i of id) {
      body.set("deleting[ids][]", i);
    }
  }

  const resp = await apiRequest({
    body,
    endpointUseOrigin: true,
  });

  return await resp.json();
}

export function getImageIdByUrl(urlOrUser: string | User) {
  const url = typeof urlOrUser == "string" ? urlOrUser : urlOrUser.image;

  if (!url) {
    return null;
  }

  // TODO: don't hardcode CDN URL in RegEx, use a const

  return url.match(/^https?:\/\/i.ibb.co\/(\w+)\//i)?.[1] || null;
}
