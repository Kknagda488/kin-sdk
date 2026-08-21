export interface PageContext {
  url: string;
  title: string;
  breadcrumbs: string[];
  headings: string[];
  main_text_excerpt: string;
  referrer: string;
}

/**
 * Scrapes basic context from the current page to send to the AI agent.
 */
export function collectPageContext(): PageContext {
  if (typeof window === 'undefined') {
    return {
      url: '',
      title: '',
      breadcrumbs: [],
      headings: [],
      main_text_excerpt: '',
      referrer: '',
    };
  }

  // 1. Get headings (h1, h2)
  const headings: string[] = [];
  document.querySelectorAll('h1, h2').forEach((el) => {
    if (el.textContent && el.textContent.trim().length > 0) {
      headings.push(el.textContent.trim());
    }
  });

  // 2. Main text excerpt (first 1000 chars of main/article or body)
  let mainElement = document.querySelector('main') || document.querySelector('article') || document.body;
  // A very basic text extraction, ignoring scripts/styles
  const rawText = mainElement?.innerText || '';
  const main_text_excerpt = rawText.replace(/\\s+/g, ' ').substring(0, 1000).trim();

  // 3. Breadcrumbs (basic heuristic - look for nav or structured data)
  // This is a naive implementation; production would look for schema.org BreadcrumbList
  const breadcrumbs: string[] = [];
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    breadcrumbs.push('Home', ...pathParts);
  }

  return {
    url: window.location.href,
    title: document.title,
    breadcrumbs,
    headings: headings.slice(0, 5), // Only take first 5 to keep payload small
    main_text_excerpt,
    referrer: document.referrer,
  };
}
