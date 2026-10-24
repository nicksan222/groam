import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { downloadStockCover, searchWikipediaCover, type StockCoverCandidate } from './wikimedia';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

afterEach(() => vi.restoreAllMocks());

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

type Route = (url: URL) => Response | Promise<Response>;

function mockNetwork(route: Route) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return await route(url);
  });
}

function urlsOf(spy: ReturnType<typeof mockNetwork>) {
  return spy.mock.calls.map(([input]) => new URL(String(input)));
}

function lead(title: string, file: string) {
  return {
    fullurl: `https://en.wikipedia.org/wiki/${title}`,
    pageimage: file,
    title
  };
}

type ImageOptions = {
  license?: string | null;
  mime?: string;
  thumbwidth?: number;
  width?: number;
};

function imagePage(file: string, options: ImageOptions = {}) {
  const { license = 'CC BY-SA 4.0', mime = 'image/jpeg', thumbwidth = 2400, width } = options;
  return {
    imageinfo: [
      {
        descriptionurl: `https://commons.wikimedia.org/wiki/File:${file}`,
        extmetadata: license
          ? {
              LicenseShortName: { value: license },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/other/1.0/' }
            }
          : {},
        mime,
        ...(width === undefined
          ? { thumburl: `https://upload.wikimedia.org/${file}`, thumbwidth }
          : { url: `https://upload.wikimedia.org/${file}`, width })
      }
    ],
    title: `File:${file}`
  };
}

const sourceUrl = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

function candidate(file: string): StockCoverCandidate {
  return {
    attribution: {
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      sourceName: 'Wikimedia Commons',
      sourceUrl: sourceUrl(file),
      title: file
    },
    imageUrl: `https://upload.wikimedia.org/${file}`
  };
}

test('uses the first Wikipedia lead image that has an eligible Commons file', async () => {
  const network = mockNetwork((url) => {
    if (url.hostname === 'en.wikipedia.org') {
      return json({
        query: {
          pages: [
            { ...lead('Lisbon_Airport', 'Logo.svg'), index: 2 },
            { ...lead('Lisbon', 'Lisbon.jpg'), index: 1 }
          ]
        }
      });
    }
    // Lisbon's file is a tiny image, so the airport article is tried next.
    if (url.searchParams.get('titles') === 'File:Lisbon.jpg') {
      return json({ query: { pages: [imagePage('Lisbon.jpg', { thumbwidth: 640 })] } });
    }
    return json({ query: { pages: [imagePage('Logo.svg.png')] } });
  });

  const candidates = await searchWikipediaCover('Lisbon', undefined);

  expect(candidates.map((entry) => entry.attribution.sourceUrl)).toEqual([
    sourceUrl('Logo.svg.png')
  ]);
  const [search, first, second, ...rest] = urlsOf(network);
  expect(rest).toEqual([]);
  expect(search?.hostname).toBe('en.wikipedia.org');
  expect(Object.fromEntries(search?.searchParams ?? [])).toMatchObject({
    gsrlimit: '5',
    gsrnamespace: '0',
    gsrsearch: 'Lisbon',
    pilicense: 'free'
  });
  expect(first?.searchParams.get('titles')).toBe('File:Lisbon.jpg');
  expect(second?.searchParams.get('titles')).toBe('File:Logo.svg');
  // The Commons lookup asks for a bounded thumbnail rather than the full original.
  expect(first?.searchParams.get('iiurlwidth')).toBe('2400');
  expect(first?.searchParams.get('iiprop')).toBe('url|size|mime|extmetadata');
});

test('skips the file the cover already shows and falls back to Commons search', async () => {
  const network = mockNetwork((url) => {
    if (url.hostname === 'en.wikipedia.org') {
      return json({ query: { pages: [lead('Porto', 'Porto.jpg')] } });
    }
    if (url.searchParams.get('generator') === 'search') {
      return json({
        query: { pages: [imagePage('Porto.jpg'), imagePage('Ribeira.jpg')] }
      });
    }
    return json({ query: { pages: [imagePage('Porto.jpg')] } });
  });

  const candidates = await searchWikipediaCover('Porto', sourceUrl('Porto.jpg'));

  expect(candidates.map((entry) => entry.attribution.sourceUrl)).toEqual([
    sourceUrl('Ribeira.jpg')
  ]);
  const commonsSearch = urlsOf(network).at(-1);
  expect(commonsSearch?.hostname).toBe('commons.wikimedia.org');
  expect(Object.fromEntries(commonsSearch?.searchParams ?? [])).toMatchObject({
    gsrlimit: '20',
    gsrnamespace: '6',
    gsrsearch: 'Porto'
  });
});

test('falls back to Commons search when Wikipedia fails or has no usable lead', async () => {
  expectConsole('warn', 'Wikipedia lead image lookup failed');
  mockNetwork((url) => {
    if (url.hostname === 'en.wikipedia.org') throw new Error('offline');
    return json({ query: { pages: [imagePage('Fallback.jpg')] } });
  });
  await expect(searchWikipediaCover('Faro', undefined)).resolves.toHaveLength(1);

  vi.restoreAllMocks();
  mockNetwork((url) =>
    url.hostname === 'en.wikipedia.org'
      ? json({ query: { pages: [] } })
      : json({ query: { pages: [imagePage('Empty-lead.jpg')] } })
  );
  await expect(searchWikipediaCover('Faro', undefined)).resolves.toHaveLength(1);
});

test('returns no candidates when nothing is eligible and surfaces Commons failures', async () => {
  mockNetwork(() => json({ query: { pages: [] } }));
  await expect(searchWikipediaCover('Nowhere', undefined)).resolves.toEqual([]);

  expectConsole('warn', 'Wikipedia lead image lookup failed');
  vi.restoreAllMocks();
  mockNetwork(() => new Response('  maintenance  ', { status: 503 }));
  await expect(searchWikipediaCover('Faro', undefined)).rejects.toThrow(
    'Wikimedia image search returned 503 (maintenance)'
  );
});

test('only accepts photos that are wide enough, free to reuse, and a supported type', async () => {
  mockNetwork(() =>
    json({
      query: {
        pages: [
          imagePage('Narrow.jpg', { thumbwidth: 899 }),
          imagePage('Exact.jpg', { thumbwidth: 900 }),
          imagePage('Gif.gif', { mime: 'image/gif' }),
          imagePage('Svg.svg', { mime: 'image/svg+xml' }),
          imagePage('Webp.webp', { mime: 'image/webp' }),
          imagePage('Nolicense.jpg', { license: null }),
          imagePage('Noncommercial.jpg', { license: 'CC BY-NC 4.0' }),
          imagePage('NoDerivs.jpg', { license: 'CC BY-ND 4.0' }),
          imagePage('Gfdl.jpg', { license: 'GFDL' }),
          imagePage('Original.jpg', { width: 1000 }),
          imagePage('SmallOriginal.jpg', { width: 400 }),
          imagePage('Cc0.jpg', { license: 'CC0' }),
          imagePage('Pd.jpg', { license: 'Public domain' }),
          imagePage('By.jpg', { license: 'CC BY 3.0' })
        ]
      }
    })
  );

  const candidates = await searchWikipediaCover('Anywhere', undefined);

  expect(candidates.map((entry) => entry.attribution.title)).toEqual([
    'Exact',
    'Webp',
    'Original',
    'Cc0',
    'Pd',
    'By'
  ]);
});

test('rejects Wikimedia responses that are not trusted JSON', async () => {
  expectConsole('warn', 'Wikipedia lead image lookup failed');
  const respond = (response: () => Response) => {
    vi.restoreAllMocks();
    mockNetwork((url) => {
      if (url.hostname === 'en.wikipedia.org') throw new Error('skip lead');
      return response();
    });
  };

  respond(() => new Response('{}', { headers: { 'content-type': 'text/html' } }));
  await expect(searchWikipediaCover('Faro', undefined)).rejects.toThrow(
    'Wikimedia image search returned invalid content'
  );

  respond(() => new Response('{nope', { headers: { 'content-type': 'application/json' } }));
  await expect(searchWikipediaCover('Faro', undefined)).rejects.toThrow(
    'Wikimedia image search returned invalid JSON'
  );

  respond(
    () =>
      new Response('x'.repeat(2 * 1024 * 1024 + 1), {
        headers: { 'content-type': 'application/json' }
      })
  );
  await expect(searchWikipediaCover('Faro', undefined)).rejects.toThrow('response was too large');

  respond(() => new Response(null, { status: 429 }));
  await expect(searchWikipediaCover('Faro', undefined)).rejects.toThrow(
    'Wikimedia image search returned 429'
  );
});

test('wraps network failures and never follows redirects', async () => {
  expectConsole('warn', 'Wikipedia lead image lookup failed');
  const network = mockNetwork((url) => {
    if (url.hostname === 'en.wikipedia.org') throw new TypeError('redirect mode is set to error');
    throw new TypeError('connection reset');
  });

  await expect(searchWikipediaCover('Faro', undefined)).rejects.toThrow(
    'Wikimedia image search is unavailable (connection reset)'
  );
  for (const [, init] of network.mock.calls) {
    expect(init).toMatchObject({ redirect: 'error' });
    expect(init).toMatchObject({ headers: { 'User-Agent': expect.stringContaining('Groam') } });
  }
});

test('downloads the first candidate that is a real image and describes why others failed', async () => {
  const network = mockNetwork((url) => {
    if (url.pathname.endsWith('First.png')) return new Response('gone', { status: 404 });
    if (url.pathname.endsWith('Second.png')) {
      return new Response('fake', { headers: { 'content-type': 'image/png' } });
    }
    return new Response(PNG, { headers: { 'content-type': 'image/png' } });
  });

  const result = await downloadStockCover([
    candidate('First.png'),
    candidate('Second.png'),
    candidate('Third.png'),
    candidate('Fourth.png')
  ]);

  expect(result.attribution.title).toBe('Third.png');
  expect(result.blob.type).toBe('image/png');
  expect(result.blob.size).toBe(PNG.byteLength);
  expect(network).toHaveBeenCalledTimes(3);
  const [, init] = network.mock.calls[0] ?? [];
  expect(init).toMatchObject({ redirect: 'error' });
});

test('stops after eight download attempts and reports every failure', async () => {
  const network = mockNetwork(() => new Response('nope', { status: 500 }));
  const candidates = Array.from({ length: 12 }, (_value, index) => candidate(`Photo${index}.png`));

  await expect(downloadStockCover(candidates)).rejects.toThrow(
    /^No downloadable Wikipedia location image was found: (HTTP 500 \(nope\); ){7}HTTP 500 \(nope\)$/u
  );
  expect(network).toHaveBeenCalledTimes(8);
});

test('rejects an empty candidate list and untrusted or oversized images', async () => {
  const network = mockNetwork(
    () =>
      new Response(PNG, { headers: { 'content-type': 'image/png', 'content-length': '99999999' } })
  );
  await expect(downloadStockCover([])).rejects.toThrow('no results');

  const untrusted = { ...candidate('Evil.png'), imageUrl: 'https://evil.example/Evil.png' };
  const http = { ...candidate('Http.png'), imageUrl: 'http://upload.wikimedia.org/Http.png' };
  await expect(downloadStockCover([untrusted, http])).rejects.toThrow(
    'image URL was not trusted; image URL was not trusted'
  );
  expect(network).not.toHaveBeenCalled();

  await expect(downloadStockCover([candidate('Huge.png')])).rejects.toThrow(
    'Wikimedia image download response was too large'
  );

  vi.restoreAllMocks();
  mockNetwork(() => new Response(PNG));
  await expect(downloadStockCover([candidate('NoType.png')])).rejects.toThrow(
    'unsupported content type missing'
  );

  vi.restoreAllMocks();
  mockNetwork(() => new Response(PNG, { headers: { 'content-type': 'image/gif' } }));
  await expect(downloadStockCover([candidate('Gif.png')])).rejects.toThrow(
    'unsupported content type image/gif'
  );
});
