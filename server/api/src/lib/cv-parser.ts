import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const CV_MAX_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 20000;

const CV_MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
} as const;

export type CvMimeType = (typeof CV_MIME_TYPES)[keyof typeof CV_MIME_TYPES];

export function isSupportedCvMime(mimetype: string): mimetype is CvMimeType {
  return (Object.values(CV_MIME_TYPES) as string[]).includes(mimetype);
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseCv(buffer: Buffer, mimetype: string): Promise<string> {
  if (!isSupportedCvMime(mimetype)) {
    throw new Error('Unsupported file type. Use PDF, DOCX, or TXT.');
  }

  let text: string;
  if (mimetype === CV_MIME_TYPES.pdf) {
    text = await extractPdf(buffer);
  } else if (mimetype === CV_MIME_TYPES.docx) {
    text = await extractDocx(buffer);
  } else {
    text = buffer.toString('utf-8');
  }

  const trimmed = text.replace(/\s+\n/g, '\n').trim();
  if (trimmed.length === 0) {
    throw new Error('Could not extract any text from the file.');
  }
  return trimmed.slice(0, MAX_TEXT_LENGTH);
}
