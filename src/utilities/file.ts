const ALLOWED_IMG_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_DOC_MIME_TYPES = ['application/pdf'];

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMG_MIME_TYPES,
  ...ALLOWED_DOC_MIME_TYPES,
];

export const isAllowedType = (type: string) =>
  ALLOWED_MIME_TYPES.includes(type);

export const isImage = (type: string) => ALLOWED_IMG_MIME_TYPES.includes(type);

export const isDocument = (type: string) =>
  ALLOWED_DOC_MIME_TYPES.includes(type);
