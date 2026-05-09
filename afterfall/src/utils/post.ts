import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { QualityProfile } from './quality';

export function makeRenderer(canvas: HTMLCanvasElement, profile: QualityProfile): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({
    canvas,
    antialias: profile.preset === 'high',
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  r.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioCap));
  r.setSize(canvas.clientWidth, canvas.clientHeight, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = profile.shadows;
  if (profile.shadows) r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

export interface RenderTarget {
  render: () => void;
  setSize: (w: number, h: number) => void;
  bloom?: UnrealBloomPass;
  dispose: () => void;
}

export function makeRenderTarget(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  profile: QualityProfile,
): RenderTarget {
  if (!profile.bloom) {
    return {
      render: () => renderer.render(scene, camera),
      setSize: (w: number, h: number) => renderer.setSize(w, h, false),
      dispose: () => {},
    };
  }
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight),
    0.5, 0.5, 0.85,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize: (w: number, h: number) => { renderer.setSize(w, h, false); composer.setSize(w, h); },
    bloom,
    dispose: () => composer.dispose(),
  };
}
