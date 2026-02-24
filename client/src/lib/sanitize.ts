import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Use this whenever rendering user-generated or external HTML content.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'div', 'span',
      'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'sup', 'sub', 'small',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'style',
      'target', 'rel', 'width', 'height',
      'colspan', 'rowspan', 'scope',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Create a safe innerHTML object for React's dangerouslySetInnerHTML.
 * Always use this instead of raw dangerouslySetInnerHTML.
 */
export function createSafeHtml(dirty: string): { __html: string } {
  return { __html: sanitizeHtml(dirty) };
}
