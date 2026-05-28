/** Characters allowed in a tag name after the leading character. */
export const TAG_NAME_BODY = '[\\w\\u4e00-\\u9fff/-]*';

/** First character of a tag name (after #). */
export const TAG_NAME_START = '[\\w\\u4e00-\\u9fff]';

export const TAG_NAME_CAPTURE = `(${TAG_NAME_START}${TAG_NAME_BODY})`;

export const TAG_DECORATION_REGEX = new RegExp(`(?:^|\\s)#${TAG_NAME_CAPTURE}`, 'g');

export const TAG_EXTRACT_REGEX = new RegExp(`(?:^|[^&\\w])#${TAG_NAME_CAPTURE}`, 'g');
