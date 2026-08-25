const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'div',
  'span',
]);

const sanitizeUrl = (url = '') => {
  const value = String(url || '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch (err) {
    return '';
  }
};

/**
 * Stores safe HTML for article descriptions (headings, bold, links, lists).
 * Plain text is converted into paragraphs.
 */
const sanitizeArticleHtml = (raw = '') => {
  const input = String(raw || '').trim();
  if (!input) return '';

  if (!/<[a-z][\s\S]*>/i.test(input)) {
    return input
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  let html = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tagName, attrs = '') => {
    const tag = String(tagName).toLowerCase();
    const isClosing = match.startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (isClosing) return `</${tag}>`;
    if (tag === 'br') return '<br>';

    if (tag === 'a') {
      const hrefMatch = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = sanitizeUrl(hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || '');
      if (!href) return '<a>';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }

    return `<${tag}>`;
  });

  return html.trim();
};

const normalizeSocialLinks = (raw) => {
  let source = raw;
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw);
    } catch (err) {
      source = {};
    }
  }

  const data = source && typeof source === 'object' ? source : {};

  return {
    facebook: sanitizeUrl(data.facebook),
    instagram: sanitizeUrl(data.instagram),
    twitter: sanitizeUrl(data.twitter),
  };
};

module.exports = {
  sanitizeArticleHtml,
  normalizeSocialLinks,
  sanitizeUrl,
};
