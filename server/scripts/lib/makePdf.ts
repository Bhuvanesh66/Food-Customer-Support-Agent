import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Generate a clean, text-extractable PDF with pdf-lib so the demo exercises the
 * real PDF ingestion path. Wraps text and paginates automatically.
 */
export async function makeTextPdf(title: string, body: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 54;
  const FONT_SIZE = 11;
  const LINE_H = 16;
  const maxWidth = PAGE_W - MARGIN * 2;

  const lines = [`__TITLE__${title}`, '', ...body.replace(/\r\n/g, '\n').split('\n')];

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const draw = (text: string, useBold: boolean) => {
    if (y < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    page.drawText(text, {
      x: MARGIN,
      y,
      size: useBold ? FONT_SIZE + 3 : FONT_SIZE,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= useBold ? LINE_H + 6 : LINE_H;
  };

  for (const raw of lines) {
    const isTitle = raw.startsWith('__TITLE__');
    const text = isTitle ? raw.slice('__TITLE__'.length) : raw;
    if (text === '') {
      y -= LINE_H / 2;
      continue;
    }
    for (const wrapped of wrap(text, font, isTitle ? FONT_SIZE + 3 : FONT_SIZE, maxWidth)) {
      draw(wrapped, isTitle);
    }
  }

  // Disable object streams so the (old) pdf.js bundled with pdf-parse can read it.
  const bytes = await doc.save({ useObjectStreams: false });
  return Buffer.from(bytes);
}

function wrap(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}
