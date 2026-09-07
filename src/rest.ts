import * as THREE from 'three';

export interface RestAnimationOptions {
  /** Seconds of stillness before the added rest motion begins. */
  delay?: number;
  /** Multiplier for all angular offsets. Keep this near 1. */
  strength?: number;
  /** Stable phase offset for multiple characters or alternate takes. */
  phase?: number;
}

export interface RestFrame {
  /** Absolute simulation time in seconds. Use a fixed-step value for capture. */
  time: number;
  /** Simulation delta in seconds. */
  delta: number;
  /** True only while standing safely. */
  standing: boolean;
}

export interface RestAnimation {
  /** Restore the previous mixer pose before AnimationMixer.update(). */
  restore(): void;
  /** Call after AnimationMixer.update(), once per frame. */
  update(frame: RestFrame): void;
  /** Clears transition state. Pass the current simulation time. */
  reset(time?: number): void;
  /** Current additive influence, useful for capture/debugging. */
  readonly weight: number;
}

type RestBoneName =
  | 'Spine02'
  | 'Spine01'
  | 'Spine'
  | 'neck'
  | 'Head'
  | 'LeftShoulder'
  | 'RightShoulder'
  | 'LeftForeArm'
  | 'RightForeArm';

const BONE_NAMES: RestBoneName[] = [
  'Spine02', 'Spine01', 'Spine', 'neck', 'Head',
  'LeftShoulder', 'RightShoulder', 'LeftForeArm', 'RightForeArm',
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

/**
 * Adds a quiet rest pose over the GLB Idle clip.
 *
 * It never writes translations or touches Hips, legs, feet, hands, face meshes,
 * or the player Group. AnimationMixer remains the owner of the base pose.
 */
export function createRestAnimation(
  characterRoot: THREE.Object3D,
  options: RestAnimationOptions = {},
): RestAnimation {
  const delay = Math.max(0, options.delay ?? 2.75);
  const strength = Math.max(0, options.strength ?? 1);
  const phase = options.phase ?? 0;
  const bones = new Map<RestBoneName, THREE.Object3D>();

  for (const name of BONE_NAMES) {
    const bone = characterRoot.getObjectByName(name);
    if (bone) bones.set(name, bone);
  }

  // Reused temporaries keep the render loop allocation-free.
  const deltaRotation = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'XYZ');
  let standingSince: number | null = null;
  let influence = 0;
  const bases = new Map<RestBoneName,THREE.Quaternion>();
  let applied=false;
  function restore(){if(!applied)return;for(const [name,q] of bases)bones.get(name)!.quaternion.copy(q);applied=false;}

  const rotate = (name: RestBoneName, x: number, y: number, z: number) => {
    const bone = bones.get(name);
    if (!bone || influence <= 0) return;
    euler.set(x * influence * strength, y * influence * strength, z * influence * strength);
    deltaRotation.setFromEuler(euler);
    bone.quaternion.multiply(deltaRotation).normalize();
  };

  return {
    restore,
    update({ time, delta, standing }: RestFrame) {
      if (!Number.isFinite(time) || !Number.isFinite(delta)) return;
      const dt = Math.max(0, Math.min(delta, 0.1));

      if (standing) {
        if (standingSince === null) standingSince = time;
      } else {
        standingSince = null;
      }

      const stillFor = standingSince === null ? 0 : Math.max(0, time - standingSince);
      const delayedTarget = standing ? smoothstep((stillFor - delay) / 0.8) : 0;
      const blendRate = delayedTarget > influence ? 4.5 : 10;
      influence += (delayedTarget - influence) * (1 - Math.exp(-blendRate * dt));
      if (influence < 0.0001) influence = 0;
      for(const [name,bone] of bones){if(!bases.has(name))bases.set(name,new THREE.Quaternion());bases.get(name)!.copy(bone.quaternion);}
      applied=true;

      // Frequencies are deliberately incommensurate, avoiding a visible loop.
      const breath = Math.sin(time * 1.17 + phase);
      const breathSoft = Math.sin(time * 0.585 + phase + 0.35);
      const sway = Math.sin(time * 0.43 + phase + 1.1);
      const settle = Math.sin(time * 0.29 + phase + 2.4);
      const glance = Math.sin(time * 0.21 + phase + 0.7);

      // Local offsets in radians, sampled against this exact rig. Largest angle
      // is 0.014 rad (0.8 degrees). Lower body stays fully mixer-driven.
      rotate('Spine02', 0.0035 * breath, 0.0015 * settle, 0.006 * sway);
      rotate('Spine01', 0.0045 * breathSoft, 0, 0.004 * sway);
      rotate('Spine', 0.006 * breath, -0.002 * sway, 0.0025 * sway);
      rotate('neck', -0.003 * breath, 0.005 * glance, -0.002 * sway);
      rotate('Head', 0.002 * breathSoft, 0.007 * glance, -0.003 * sway);

      const shoulderBreath = 0.004 * Math.max(-0.35, breath);
      rotate('LeftShoulder', 0, 0, shoulderBreath + 0.002 * sway);
      rotate('RightShoulder', 0, 0, -shoulderBreath + 0.002 * sway);
      rotate('LeftForeArm', 0.004 * settle, 0, 0.002 * breathSoft);
      rotate('RightForeArm', -0.004 * settle, 0, -0.002 * breathSoft);
    },

    reset(time = 0) {
      restore();
      standingSince = time;
      influence = 0;
    },

    get weight() {
      return influence;
    },
  };
}
