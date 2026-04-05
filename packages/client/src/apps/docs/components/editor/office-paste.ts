// ─── Office Paste Helpers ───────────────────────────────────────────────────
// Detect and clean HTML pasted from Microsoft Office, Google Docs, etc.

export function isOfficePaste(html: string): boolean {
  return (
    /class="?Mso/i.test(html) ||
    /xmlns:o="urn:schemas-microsoft-com:office/i.test(html) ||
    /docs-internal-guid/i.test(html) ||
    /<google-sheets-html-origin/i.test(html) ||
    /x:str/i.test(html)
  );
}

export function cleanOfficePaste(html: string): string {
  let cleaned = html;
  // Remove everything before <body> and after </body>
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) cleaned = bodyMatch[1];
  // Remove XML namespaces and Office-specific tags
  cleaned = cleaned.replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '');
  cleaned = cleaned.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '');
  cleaned = cleaned.replace(/<m:[^>]*>[\s\S]*?<\/m:[^>]*>/gi, '');
  cleaned = cleaned.replace(/<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  // Remove all style attributes (Office adds massive inline styles)
  cleaned = cleaned.replace(/\s+style="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+style='[^']*'/gi, '');
  // Remove class attributes with mso-* or Office-specific classes
  cleaned = cleaned.replace(/\s+class="[^"]*"/gi, '');
  // Remove <span> tags without useful attributes (Office wraps everything in spans)
  cleaned = cleaned.replace(/<span\s*>/gi, '');
  cleaned = cleaned.replace(/<\/span>/gi, '');
  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p[^>]*>\s*(&nbsp;|\u00a0)?\s*<\/p>/gi, '');
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  return cleaned.trim();
}
