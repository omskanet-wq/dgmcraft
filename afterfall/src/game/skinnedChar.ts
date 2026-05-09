// Async loader for the skinned humanoid model used by the player and zombies.
// Built on top of three.js's GLTFLoader + SkeletonUtils.clone so a single
// downloaded skeleton can be reused as many independent instances.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

interface CharacterTemplate {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

let templateP: Promise<CharacterTemplate> | null = null;

export function loadCharacterTemplate(): Promise<CharacterTemplate> {
  if (templateP) return templateP;
  const loader = new GLTFLoader();
  templateP = new Promise((resolve, reject) => {
    loader.load(
      'models/Soldier.glb',
      (gltf) => {
        const scene = gltf.scene;
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
            // The Mixamo soldier ships with a very dark FBX-baked diffuse —
            // brighten its material slightly for readability under our lighting.
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat && mat.isMeshStandardMaterial) {
              mat.envMapIntensity = 1.0;
              mat.roughness = Math.max(0.6, mat.roughness ?? 1);
            }
          }
        });
        resolve({ scene, animations: gltf.animations });
      },
      undefined,
      reject,
    );
  });
  return templateP;
}

export interface SkinnedInstance {
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: {
    idle: THREE.AnimationAction;
    walk: THREE.AnimationAction;
    run: THREE.AnimationAction;
  };
  setMotion(speed: number): void;
  dispose(): void;
}

// Mixamo Soldier animation ordering (verified against the official three.js
// example): 0=idle, 1=run, 3=walk. Index 2 is a t-pose we don't use.
const ANIM_INDEX = { idle: 0, run: 1, walk: 3 };

export function spawnCharacterInstance(template: CharacterTemplate): SkinnedInstance {
  const cloned = SkeletonUtils.clone(template.scene) as THREE.Group;
  const mixer = new THREE.AnimationMixer(cloned);
  const idle = mixer.clipAction(template.animations[ANIM_INDEX.idle]);
  const walk = mixer.clipAction(template.animations[ANIM_INDEX.walk]);
  const run = mixer.clipAction(template.animations[ANIM_INDEX.run]);
  idle.play(); walk.play(); run.play();
  // Start with full idle, zero of the others; setMotion blends.
  idle.weight = 1; walk.weight = 0; run.weight = 0;

  function setMotion(speed: number): void {
    // speed = world units per second. Walk peaks around 2, run around 5.
    if (speed < 0.05) {
      idle.weight = 1; walk.weight = 0; run.weight = 0;
    } else if (speed < 3.5) {
      const t = Math.min(1, speed / 3.5);
      idle.weight = 1 - t; walk.weight = t; run.weight = 0;
    } else {
      const t = Math.min(1, (speed - 3) / 4);
      idle.weight = 0; walk.weight = 1 - t; run.weight = t;
    }
  }

  function dispose(): void {
    mixer.stopAllAction();
    cloned.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) sm.skeleton.dispose();
    });
  }

  return { group: cloned, mixer, actions: { idle, walk, run }, setMotion, dispose };
}

// --- Quaternius CC0 zombie (Zombie Apocalypse Kit) ----------------------------
// Separate template so the zombie's animation indices can differ from the
// player's. The skeleton has 50 joints and 16 baked animations.
let zombieP: Promise<CharacterTemplate> | null = null;
export function loadZombieTemplate(): Promise<CharacterTemplate> {
  if (zombieP) return zombieP;
  const loader = new GLTFLoader();
  zombieP = new Promise((resolve, reject) => {
    loader.load(
      'models/Zombie_Basic.glb',
      (gltf) => {
        const scene = gltf.scene;
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat && mat.isMeshStandardMaterial) {
              mat.envMapIntensity = 0.9;
              mat.roughness = Math.max(0.7, mat.roughness ?? 1);
            }
          }
        });
        resolve({ scene, animations: gltf.animations });
      },
      undefined,
      reject,
    );
  });
  return zombieP;
}

export interface ZombieSkinInstance {
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  setMotion(speed: number): void;
  playHit(): void;
  playPunch(): void;
  playDeath(): void;
  dispose(): void;
}

// Verified animation index mapping for Zombie_Basic.glb:
//   1=Death, 2=HitReact, 3=Idle, 9=Punch, 10=Run, 13=Walk
const Z_ANIM = { idle: 3, walk: 13, run: 10, hit: 2, punch: 9, death: 1 };

export function spawnZombieSkinInstance(template: CharacterTemplate): ZombieSkinInstance {
  const cloned = SkeletonUtils.clone(template.scene) as THREE.Group;
  // Quaternius models ship at ~1.0 unit tall but our world uses ~1.7 player.
  cloned.scale.set(1.05, 1.05, 1.05);
  const mixer = new THREE.AnimationMixer(cloned);
  const idle = mixer.clipAction(template.animations[Z_ANIM.idle]);
  const walk = mixer.clipAction(template.animations[Z_ANIM.walk]);
  const run = mixer.clipAction(template.animations[Z_ANIM.run]);
  const hit = mixer.clipAction(template.animations[Z_ANIM.hit]);
  const punch = mixer.clipAction(template.animations[Z_ANIM.punch]);
  const death = mixer.clipAction(template.animations[Z_ANIM.death]);
  hit.setLoop(THREE.LoopOnce, 1); hit.clampWhenFinished = false;
  punch.setLoop(THREE.LoopOnce, 1); punch.clampWhenFinished = false;
  death.setLoop(THREE.LoopOnce, 1); death.clampWhenFinished = true;
  idle.play(); walk.play(); run.play();
  idle.weight = 1; walk.weight = 0; run.weight = 0;

  function setMotion(speed: number): void {
    if (speed < 0.05) {
      idle.weight = 1; walk.weight = 0; run.weight = 0;
    } else if (speed < 2.5) {
      const t = Math.min(1, speed / 2.5);
      idle.weight = 1 - t; walk.weight = t; run.weight = 0;
    } else {
      const t = Math.min(1, (speed - 2) / 3);
      idle.weight = 0; walk.weight = 1 - t; run.weight = t;
    }
  }
  function playHit(): void { hit.reset().play(); }
  function playPunch(): void { punch.reset().play(); }
  function playDeath(): void { death.reset().play(); }
  function dispose(): void {
    mixer.stopAllAction();
    cloned.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) sm.skeleton.dispose();
    });
  }
  return { group: cloned, mixer, setMotion, playHit, playPunch, playDeath, dispose };
}

/** Re-tint a cloned instance for zombies. Mutates materials on the clone. */
export function tintZombie(instance: SkinnedInstance, opts: { skin: number; shirt: number }): void {
  // The Soldier model has a single combined material. Clone it on this
  // instance so we can recolor without touching the shared template.
  instance.group.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) {
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.color.setHex(opts.shirt);
      mat.emissive = new THREE.Color(0x110000);
      mat.emissiveIntensity = 0.15;
      m.material = mat;
    }
  });
  // Eyes / decals would go here if the model exposed them.
  void opts.skin;
}
