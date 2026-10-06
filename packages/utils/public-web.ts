import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';

export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
      (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
  }
  // Only ordinary global IPv6 unicast. Reject mapped IPv4, local, multicast,
  // transition and documentation ranges rather than reinterpret ambiguous IPs.
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address) &&
    !/^200[12]:|^2001:db8:|^2001:0:/i.test(address);
}
export function publicUrl(input: string): URL {
  const url = new URL(input.startsWith('http') ? input : `https://${input}`);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port))) throw new Error('Unsupported website URL');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      !host.includes('.') && !isIP(host) || isIP(host) && !publicAddress(host)) throw new Error('Website must be public');
  return url;
}

/** Resolve, validate and pin each hop. No second DNS lookup at connection time. */
export async function fetchPublicHtml(input: string, signal?: AbortSignal): Promise<string> {
  const timeout = AbortSignal.timeout(15_000);
  const deadline = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let url = publicUrl(input);
  for (let hop = 0; hop < 4; hop++) {
    deadline.throwIfAborted();
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await abortableLookup(host, deadline);
    if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('Website resolved to a non-public address');
    const pinned = addresses[0];
    const result = await new Promise<{ location?: string; html?: string }>((resolve, reject) => {
      const req = (url.protocol === 'https:' ? https : http).request(url, {
        method: 'GET', signal: deadline, agent: false,
        headers: { 'User-Agent': 'DiscoveryLab/1.0', Accept: 'text/html' },
        lookup: ((_host: string, opts: any, cb: any) => opts?.all ? cb(null, [pinned]) : cb(null, pinned.address, pinned.family)) as any,
      }, res => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.destroy(); resolve({ location: res.headers.location }); return;
        }
        if (!res.statusCode || res.statusCode >= 400 || !/text\/html|application\/xhtml/i.test(res.headers['content-type'] || '')) {
          res.destroy(); reject(new Error('Website did not return HTML')); return;
        }
        let size = 0; const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) { res.destroy(); reject(new Error('Website is too large')); return; }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      });
      req.on('error', reject); req.end();
    });
    if (result.html !== undefined) return result.html;
    url = publicUrl(new URL(result.location!, url).href);
  }
  throw new Error('Too many redirects');
}

async function abortableLookup(host: string, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<{address: string; family: number}[]>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, {once: true});
    lookup(host, {all: true}).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
