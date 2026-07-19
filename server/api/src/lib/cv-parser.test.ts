import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSupportedCvMime, parseCv } from './cv-parser';

describe('cv-parser', () => {
  it('accepts known mime types', () => {
    assert.equal(isSupportedCvMime('application/pdf'), true);
    assert.equal(isSupportedCvMime('text/plain'), true);
    assert.equal(isSupportedCvMime('image/png'), false);
  });

  it('parses plain text CV', async () => {
    const text = await parseCv(Buffer.from('Jane Doe\nReact Developer\n5 years experience'), 'text/plain');
    assert.match(text, /Jane Doe/);
    assert.match(text, /React Developer/);
  });

  it('rejects empty text', async () => {
    await assert.rejects(() => parseCv(Buffer.from('   \n  '), 'text/plain'), /extract any text/);
  });

  it('rejects unsupported mime', async () => {
    await assert.rejects(() => parseCv(Buffer.from('x'), 'image/png'), /Unsupported file type/);
  });
});
