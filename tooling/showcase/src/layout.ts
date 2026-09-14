import type { ShotStyle } from '#src/model';
import { browserChromeHeight } from '#src/presets';
import { mix } from '#src/timeline';

export type Rect = { x: number; y: number; width: number; height: number };

function fitPanel(box: Rect, aspect: number): Rect {
  const width = Math.min(box.width, box.height * aspect);
  const height = width / aspect;
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height
  };
}

/** Every layout scales the same desktop + chrome rectangle; none changes its aspect. */
export function layoutRects(
  style: ShotStyle,
  width: number,
  height: number,
  viewport: { width: number; height: number }
) {
  const aspect = viewport.width / (viewport.height + browserChromeHeight);
  const margin = width / 30;
  const gap = width / 60;
  const stage = { x: margin, y: height * 0.12, width: width - margin * 2, height: height * 0.8 };
  const rects: Record<string, Rect> = {};
  const first = style.actors[0];
  if (style.layout === 'solo') {
    rects[first] = fitPanel(stage, aspect);
  } else if (style.layout === 'pip') {
    const main = fitPanel(stage, aspect);
    rects[first] = main;
    const pipWidth = main.width * 0.33;
    rects[style.actors[1]] = {
      x: Math.min(width - margin - pipWidth, main.x + main.width - pipWidth * 0.15),
      y: main.y + main.height * 0.1,
      width: pipWidth,
      height: pipWidth / aspect
    };
  } else {
    const columns = style.actors.length === 1 ? 1 : 2;
    const rows = Math.ceil(style.actors.length / columns);
    const cellWidth = (stage.width - gap * (columns - 1)) / columns;
    const cellHeight = (stage.height - gap * (rows - 1)) / rows;
    for (const [index, actor] of style.actors.entries()) {
      rects[actor] = fitPanel(
        {
          x: stage.x + (index % columns) * (cellWidth + gap),
          y: stage.y + Math.floor(index / columns) * (cellHeight + gap),
          width: cellWidth,
          height: cellHeight
        },
        aspect
      );
    }
  }
  return rects;
}

/** Uniform interpolation preserves aspect through the entire transition. */
export function blendRect(from: Rect, to: Rect, progress: number): Rect {
  return {
    x: mix(from.x, to.x, progress),
    y: mix(from.y, to.y, progress),
    width: mix(from.width, to.width, progress),
    height: mix(from.height, to.height, progress)
  };
}

/** Stage a full desktop just outside its destination while preserving its aspect ratio. */
export function stagedRect(rect: Rect, canvasWidth: number, direction: -1 | 1): Rect {
  const scale = 0.84;
  const width = rect.width * scale;
  const height = rect.height * scale;
  return {
    x: rect.x + (rect.width - width) / 2 + direction * canvasWidth * 0.16,
    y: rect.y + (rect.height - height) / 2,
    width,
    height
  };
}
