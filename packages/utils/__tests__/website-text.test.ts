import {describe, it, expect} from 'vitest';
import {publicWebsiteText} from '../research';
describe('public website text extraction',()=>{
 it('uses HTML parsing for whitespace in closing tags and removes executable content',()=>{
  expect(publicWebsiteText('<body><p>Agency &amp; Co</p><script>secret()</script ><style>.hidden{}</style ><p>Useful research</p></body>')).toBe('Agency & Co Useful research');
 });
 it('excludes non-visible embedded content',()=>{
  expect(publicWebsiteText('<body>Public<template>Hidden</template><iframe>Injected</iframe><noscript>Fallback</noscript></body>')).toBe('Public');
 });
});
