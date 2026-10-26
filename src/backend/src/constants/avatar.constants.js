/**
 * Avatar upload and processing limits shared by the multipart middleware and
 * the image-normalization pipeline.
 *
 * These are deliberately conservative defaults; deployers may tune them by
 * overriding the related environment values in `env.config.js`.
 */

/** The multipart file field name accepted by the avatar upload route. */
export const AVATAR_FIELD_NAME = 'avatar';

/** Client-declared MIME types accepted on the first pass. */
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Decoded image formats accepted after content inspection. */
export const SUPPORTED_AVATAR_FORMATS = new Set(['jpeg', 'png', 'webp']);

/** Output square size in pixels for normalized avatars. */
export const AVATAR_OUTPUT_SIZE = 512;

/** Maximum accepted width or height in pixels for an uploaded image. */
export const AVATAR_MAX_DIMENSION = 8000;

/** Maximum decoded pixel count enforced during sharp input processing. */
export const AVATAR_MAX_INPUT_PIXELS = 40_000_000;

/** Content type emitted for every normalized avatar. */
export const AVATAR_OUTPUT_CONTENT_TYPE = 'image/webp';

/** Storage namespace under which avatar objects are written. */
export const AVATAR_NAMESPACE = 'avatars';
