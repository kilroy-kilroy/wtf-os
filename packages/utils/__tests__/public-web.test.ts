import { describe, it, expect } from 'vitest';
import { publicAddress, publicUrl } from '../public-web';
describe('research network boundary', () => {
 it.each(['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','172.16.0.1','192.168.1.1','::1','::ffff:127.0.0.1','fc00::1','2002:7f00:1::'])('rejects %s', ip => expect(publicAddress(ip)).toBe(false));
 it.each(['https://127.1','http://2130706433','http://0x7f000001','http://[::1]','http://localhost','http://test.local','https://user:pass@example.com','https://example.com:8080','file:///etc/passwd'])('rejects URL %s', url => expect(() => publicUrl(url)).toThrow());
 it('accepts ordinary public destinations', () => { expect(publicAddress('8.8.8.8')).toBe(true);expect(publicUrl('example.com').href).toBe('https://example.com/'); });
});
