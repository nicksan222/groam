import { expect, test } from 'vitest';
import { StockCover, type StockCoverCandidate, type WikipediaLeadImage } from './stock';

test('takes the lead image from Wikipedia’s most relevant place article', () => {
  const lead: WikipediaLeadImage | null = StockCover.leadImage({
    query: {
      pages: [
        {
          fullurl: 'https://en.wikipedia.org/wiki/Lisbon_Airport',
          index: 3,
          pageimage: 'Logo_LIS_en.svg',
          title: 'Lisbon Airport'
        },
        {
          fullurl: 'https://en.wikipedia.org/wiki/Lisbon',
          index: 1,
          pageimage: 'Lisboa_-_Portugal_(52597836992).jpg',
          title: 'Lisbon'
        },
        {
          fullurl: 'https://en.wikipedia.org/wiki/1755_Lisbon_earthquake',
          index: 2,
          pageimage: '1755_Lisbon_Earthquake_Location.png',
          title: '1755 Lisbon earthquake'
        }
      ]
    }
  });

  expect(lead).toEqual({
    articleTitle: 'Lisbon',
    articleUrl: 'https://en.wikipedia.org/wiki/Lisbon',
    fileTitle: 'File:Lisboa_-_Portugal_(52597836992).jpg'
  });
});

test('builds an attributed cover from the Wikipedia image metadata', () => {
  const candidates: StockCoverCandidate[] = StockCover.candidates(
    {
      query: {
        pages: [
          {
            imageinfo: [
              {
                descriptionurl:
                  'https://commons.wikimedia.org/wiki/File:Lisboa_-_Portugal_(52597836992).jpg',
                extmetadata: {
                  Artist: {
                    value:
                      '<a rel="nofollow" href="https://www.flickr.com/people/21446942@N00">Vitor Oliveira</a>'
                  },
                  LicenseShortName: { value: 'CC BY-SA 2.0' },
                  LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/2.0/' },
                  ObjectName: { value: 'Lisboa - Portugal' }
                },
                height: 1313,
                mime: 'image/jpeg',
                thumbheight: 1313,
                thumburl:
                  'https://upload.wikimedia.org/wikipedia/commons/f/f2/Lisboa_-_Portugal_%2852597836992%29.jpg',
                thumbwidth: 2048,
                width: 2048
              }
            ],
            title: 'File:Lisboa - Portugal (52597836992).jpg'
          }
        ]
      }
    },
    'Lisbon'
  );

  expect(candidates).toEqual([
    {
      attribution: {
        creator: 'Vitor Oliveira',
        creatorUrl: 'https://www.flickr.com/people/21446942@N00',
        license: 'CC BY-SA 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
        sourceName: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lisboa_-_Portugal_(52597836992).jpg',
        title: 'Lisboa - Portugal'
      },
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/f/f2/Lisboa_-_Portugal_%2852597836992%29.jpg'
    }
  ]);
});

test('rejects non-photographic and non-commercial lead images without keyword scoring', () => {
  expect(
    StockCover.candidates(
      {
        query: {
          pages: [
            {
              imageinfo: [
                {
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Flag_of_Mallorca.svg',
                  extmetadata: {
                    LicenseShortName: { value: 'CC BY-SA 4.0' },
                    LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }
                  },
                  height: 500,
                  mime: 'image/svg+xml',
                  thumburl:
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_Mallorca.svg/2400px-Flag_of_Mallorca.svg.png',
                  width: 750
                }
              ],
              title: 'File:Flag of Mallorca.svg'
            },
            {
              imageinfo: [
                {
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Restricted.jpg',
                  extmetadata: {
                    LicenseShortName: { value: 'CC BY-NC 4.0' },
                    LicenseUrl: { value: 'https://creativecommons.org/licenses/by-nc/4.0/' }
                  },
                  height: 1600,
                  mime: 'image/jpeg',
                  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/restricted.jpg',
                  width: 2400
                }
              ],
              title: 'File:Restricted.jpg'
            }
          ]
        }
      },
      'Mallorca'
    )
  ).toEqual([]);
});

test('supports object-shaped Wikipedia pages and rejects untrusted article metadata', () => {
  expect(
    StockCover.leadImage({
      query: {
        pages: {
          invalid: null,
          untrusted: {
            fullurl: 'http://en.wikipedia.org/wiki/Porto',
            pageimage: 'Porto.jpg',
            title: 'Porto'
          },
          valid: {
            fullurl: 'https://en.wikipedia.org/wiki/Porto',
            pageimage: 'File:Porto.jpg',
            title: ' Porto '
          }
        }
      }
    })
  ).toEqual({
    articleTitle: 'Porto',
    articleUrl: 'https://en.wikipedia.org/wiki/Porto',
    fileTitle: 'File:Porto.jpg'
  });
});

test('derives safe fallback license links, titles, and creator metadata', () => {
  const makePage = (
    title: string,
    sourceName: string,
    license: string,
    metadata: Record<string, { value: string }> = {}
  ) => ({
    imageinfo: [
      {
        descriptionurl: `https://commons.wikimedia.org/wiki/File:${sourceName}.jpg`,
        extmetadata: {
          Artist: {
            value: "<a href='https://example.com/artist?a=1&amp;b=2'>Artist &amp; Friend</a>"
          },
          ImageDescription: { value: '<b>A &quot;lovely&quot; place</b>' },
          LicenseShortName: { value: license },
          ...metadata
        },
        height: 900,
        mime: 'image/jpeg',
        url: `https://upload.wikimedia.org/wikipedia/commons/${sourceName}.jpg`,
        width: 1200
      }
    ],
    title
  });
  const payload = {
    query: {
      pages: [
        makePage('File:Zero.jpg', 'zero', 'CC0 1.0'),
        makePage('File:Public.jpg', 'public', 'Public domain'),
        makePage('File:Share.jpg', 'share', 'CC BY-SA 4.0')
      ]
    }
  };

  const candidates = StockCover.candidates(payload, 'Fallback');
  expect(candidates.map((candidate) => candidate.attribution.licenseUrl)).toEqual([
    'https://creativecommons.org/publicdomain/zero/1.0/',
    'https://creativecommons.org/publicdomain/mark/1.0/',
    'https://creativecommons.org/licenses/by-sa/4.0/'
  ]);
  expect(candidates[0]?.attribution).toMatchObject({
    creator: 'Artist & Friend',
    creatorUrl: 'https://example.com/artist?a=1&b=2',
    title: 'A "lovely" place'
  });
  expect(
    StockCover.candidates(payload, 'Fallback', candidates[0]?.attribution.sourceUrl)
  ).toHaveLength(2);
});

test('bounds metadata bodies by both declared and streamed byte size', async () => {
  await expect(
    StockCover.readBoundedBody(
      new Response('small', { headers: { 'Content-Length': '5' } }),
      5,
      'Metadata'
    )
  ).resolves.toEqual(new TextEncoder().encode('small'));
  await expect(
    StockCover.readBoundedBody(
      new Response('large', { headers: { 'Content-Length': '5' } }),
      4,
      'Metadata'
    )
  ).rejects.toThrow('Metadata response was too large');
  await expect(StockCover.readBoundedBody(new Response('large'), 4, 'Metadata')).rejects.toThrow(
    'Metadata response was too large'
  );
});

test('accepts only image bytes matching a supported content type', () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff]);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46], 0);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);

  expect(StockCover.hasSignature(jpeg, 'image/jpeg')).toBe(true);
  expect(StockCover.hasSignature(png, 'image/png')).toBe(true);
  expect(StockCover.hasSignature(webp, 'image/webp')).toBe(true);
  expect(StockCover.hasSignature(png, 'image/jpeg')).toBe(false);
  expect(StockCover.hasSignature(png, 'image/gif')).toBe(false);
  expect(StockCover.hasSignature(Uint8Array.from([0x89, 0x50]), 'image/png')).toBe(false);
});

test('rejects malformed Wikipedia responses', () => {
  expect(StockCover.leadImage(null)).toBeNull();
  expect(StockCover.leadImage({ query: { pages: 'invalid' } })).toBeNull();
  expect(StockCover.candidates(null, 'Lisbon')).toEqual([]);
});
