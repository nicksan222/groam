import { defineVideo, shot, split } from '#src/authoring/storyboard';
import type { Capture } from '#src/model';

export const testVideo = defineVideo(
  {
    id: 'test',
    actors: {
      owner: { label: 'Owner', role: 'Organizer' },
      member: { label: 'Member', role: 'Traveler' }
    },
    prepare: async () => {},
    presentation: { title: 'Together', subtitle: 'A shared plan', outro: 'Ready to go', fps: 30 }
  },
  ({ owner, member }) => [shot('chat', 'Chat', { view: split(owner, member) })]
);

export const testCapture: Capture = {
  version: 2,
  scenario: 'test',
  viewport: { width: 1920, height: 1080 },
  pixelSize: { width: 3840, height: 2160 },
  colorScheme: 'dark',
  format: 'png',
  durationMs: 2000,
  actors: testVideo.actors.map((actor) => ({
    ...actor,
    frames: [{ atMs: 0, src: `captures/test/${actor.id}/initial.png` }],
    cursor: []
  })),
  shots: [{ style: testVideo.storyboard[0].style, startMs: 100, endMs: 2000 }]
};
