'use client';

import { Color as HexToVec, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import { cn } from '#src/lib/utils';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct RampStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     RampStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  RampStop currentColor = colors[index];                   \
  RampStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  RampStop colors[3];
  colors[0] = RampStop(uColorStops[0], 0.0);
  colors[1] = RampStop(uColorStops[1], 0.5);
  colors[2] = RampStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    fragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);
  } else {
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
`;

export type AuroraBackgroundProps = {
  amplitude?: number;
  blend?: number;
  className?: string;
  lightMode?: boolean;
  speed?: number;
};

function readAuroraStops(element: HTMLElement): [string, string, string] {
  const styles = getComputedStyle(element);
  return [
    styles.getPropertyValue('--auth-aurora-1').trim() ||
      styles.getPropertyValue('--primary').trim(),
    styles.getPropertyValue('--auth-aurora-2').trim() ||
      styles.getPropertyValue('--primary').trim(),
    styles.getPropertyValue('--auth-aurora-3').trim() ||
      styles.getPropertyValue('--primary-hover').trim()
  ];
}

function toRgbStops(hexStops: string[]) {
  return hexStops.map((hex) => {
    const parsed = new HexToVec(hex);
    return [parsed.r, parsed.g, parsed.b] as [number, number, number];
  });
}

/** React Bits–style WebGL aurora; colors come from `--auth-aurora-*` tokens. */
function AuroraBackground({
  amplitude = 1.05,
  blend = 0.55,
  className,
  lightMode = false,
  speed = 0.85
}: AuroraBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ amplitude, blend, lightMode, speed });

  useEffect(() => {
    propsRef.current = { amplitude, blend, lightMode, speed };
  }, [amplitude, blend, lightMode, speed]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const root: HTMLDivElement = node;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

    let renderer: Renderer;
    try {
      // Probe first so jsdom / no-WebGL environments exit before ogl constructs a canvas.
      const probe = document.createElement('canvas');
      const gl2 = probe.getContext('webgl2');
      const gl1 = gl2 ?? probe.getContext('webgl');
      if (!gl1) return;

      renderer = new Renderer({
        alpha: true,
        antialias: true,
        premultipliedAlpha: true
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    const clearCanvas = gl.clearColor.bind(gl);
    clearCanvas(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = 'transparent';
    gl.canvas.style.display = 'block';
    gl.canvas.style.height = '100%';
    gl.canvas.style.width = '100%';

    let program: Program | undefined;

    function resize() {
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      renderer.setSize(width, height);
      if (program) {
        program.uniforms.uResolution.value = [width, height];
      }
    }

    window.addEventListener('resize', resize);

    const geometry = new Triangle(gl);
    // Triangle fullscreen pass only binds `position`; drop unused UVs.
    Reflect.deleteProperty(geometry.attributes, 'uv');

    const stops = toRgbStops(readAuroraStops(root));
    program = new Program(gl, {
      fragment: FRAG,
      uniforms: {
        uAmplitude: { value: amplitude },
        uBlend: { value: blend },
        uColorStops: { value: stops },
        uLightMode: { value: lightMode ? 1 : 0 },
        uResolution: { value: [root.offsetWidth, root.offsetHeight] },
        uTime: { value: 0 }
      },
      vertex: VERT
    });

    const mesh = new Mesh(gl, { geometry, program });
    root.appendChild(gl.canvas);

    let frame = 0;
    const activeProgram = program;
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      const current = propsRef.current;
      activeProgram.uniforms.uTime.value = time * 0.01 * current.speed * 0.1;
      activeProgram.uniforms.uAmplitude.value = current.amplitude;
      activeProgram.uniforms.uBlend.value = current.blend;
      activeProgram.uniforms.uLightMode.value = current.lightMode ? 1 : 0;
      activeProgram.uniforms.uColorStops.value = toRgbStops(readAuroraStops(root));
      renderer.render({ scene: mesh });
    };
    frame = requestAnimationFrame(tick);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      if (gl.canvas.parentNode === root) {
        root.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [amplitude, blend, lightMode]);

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      data-slot="aurora-background"
      ref={containerRef}
    />
  );
}

export { AuroraBackground };
