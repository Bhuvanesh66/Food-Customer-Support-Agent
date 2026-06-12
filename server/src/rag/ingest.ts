import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { DocSourceType } from '../types.js';

export type ExtractedDoc = {
  title: string;
  sourceType: DocSourceType;
  sourceRef: string | null;
  text: string;
};

/** Extract clean text from a PDF buffer (pdf-parse v2 / pdfjs-dist). */
export async function extractPdf(buffer: Buffer, filename: string): Promise<ExtractedDoc> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = (result.text || '').trim();
    if (!text) throw new Error('No extractable text in PDF (scanned/image PDFs are unsupported).');
    return {
      title: filename.replace(/\.pdf$/i, ''),
      sourceType: 'pdf',
      sourceRef: filename,
      text,
    };
  } finally {
    await parser.destroy();
  }
}

/** Markdown is stored as-is (headings preserved for structure-aware chunking). */
export function extractMarkdown(text: string, title?: string): ExtractedDoc {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty markdown content.');
  // Derive a title from the first H1 if not provided.
  const h1 = trimmed.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    title: title?.trim() || h1 || 'Untitled document',
    sourceType: 'markdown',
    sourceRef: null,
    text: trimmed,
  };
}

/** Fetch a URL and extract readable text (Readability, with a plain-text fallback). */
export async function extractUrl(url: string): Promise<ExtractedDoc> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      headers: {
        // A real browser UA + Accept header avoids many bot blocks.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } catch {
    throw new Error('Could not reach that URL (network error or blocked).');
  }
  if (!res.ok) {
    throw new Error(`The site returned HTTP ${res.status}. It may block automated fetching.`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  const pageTitle = doc.querySelector('title')?.textContent?.trim();

  // 1) Try Readability (best for article pages).
  let text = '';
  try {
    const article = new Readability(doc.cloneNode(true) as Document).parse();
    text = (article?.textContent || '').trim();
    if (text && article?.title) {
      return { title: article.title.trim(), sourceType: 'url', sourceRef: url, text };
    }
  } catch {
    /* fall through to plain-text */
  }

  // 2) Fallback: strip scripts/styles/nav and take visible body text.
  if (!text || text.length < 200) {
    doc.querySelectorAll('script,style,noscript,svg,nav,footer,header,form').forEach((el) => el.remove());
    const bodyText = (doc.body?.textContent || '')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    if (bodyText.length > text.length) text = bodyText;
  }

  if (!text || text.length < 80) {
    throw new Error(
      'No readable text found on that page — it likely loads content with JavaScript. Try a plain article/help page, or paste the text via the Markdown tab.',
    );
  }

  return {
    title: pageTitle || new URL(url).hostname,
    sourceType: 'url',
    sourceRef: url,
    text,
  };
}
