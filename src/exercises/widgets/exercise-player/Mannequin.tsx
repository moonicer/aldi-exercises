import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ExerciseId } from '../../../entities/exercise/types';
import { useEased } from './useEased';

const COLORS = {
  body: '#A8C3A0',
  mat: '#EADCCB',
  background: '#FBF5EE',
} as const;

export type MannequinExercise = Extract<ExerciseId, 'pelvic-tilt' | 'bridge'>;

/*
 * Side view in the XY plane: head at -x, feet at +x, floor at y = 0.
 * Depth (z) only separates left/right limbs. Units are roughly metres.
 */
type Vec2 = readonly [number, number];

/** Joints that move between keyframes. Head, shoulders and arms stay on the floor. */
interface Pose {
  lumbar: Vec2;
  hip: Vec2;
  knee: Vec2;
  ankle: Vec2;
  toe: Vec2;
  /** Extra pelvis rotation (rad) on top of the lumbar→hip direction. + = posterior tilt. */
  pelvisTilt: number;
}

type Joint = keyof Omit<Pose, 'pelvisTilt'> | 'head' | 'neck' | 'shoulder' | 'elbow' | 'wrist';

const STATIC: Record<'head' | 'neck' | 'shoulder' | 'elbow' | 'wrist', Vec2> = {
  head: [-0.86, 0.11],
  neck: [-0.72, 0.1],
  shoulder: [-0.62, 0.11],
  elbow: [-0.38, 0.05],
  wrist: [-0.13, 0.05],
};

const REST: Pose = {
  lumbar: [-0.25, 0.11],
  hip: [0, 0.11],
  knee: [0.38, 0.42],
  ankle: [0.55, 0.06],
  toe: [0.68, 0.045],
  pelvisTilt: 0,
};

/** Keyframes evenly spaced over progress 0..1. */
const KEYFRAMES: Record<MannequinExercise, Pose[]> = {
  // Small, gentle: pelvis rocks back, lower back settles toward the floor.
  'pelvic-tilt': [
    REST,
    {
      lumbar: [-0.25, 0.1],
      hip: [0.005, 0.125],
      knee: [0.385, 0.425],
      ankle: [0.55, 0.06],
      toe: [0.68, 0.045],
      pelvisTilt: THREE.MathUtils.degToRad(12),
    },
  ],
  // Hips lift until shoulders, hips and knees are in one line.
  bridge: [
    REST,
    {
      lumbar: [-0.258, 0.175],
      hip: [-0.015, 0.22],
      knee: [0.42, 0.45],
      ankle: [0.55, 0.06],
      toe: [0.68, 0.045],
      pelvisTilt: 0,
    },
    {
      lumbar: [-0.266, 0.242],
      hip: [-0.03, 0.33],
      knee: [0.45, 0.47],
      ankle: [0.55, 0.06],
      toe: [0.68, 0.045],
      pelvisTilt: 0,
    },
  ],
};

interface Segment {
  from: Joint;
  to: Joint;
  radius: number;
  z: number;
}

const SEGMENTS: Segment[] = [
  { from: 'shoulder', to: 'lumbar', radius: 0.12, z: 0 },
  { from: 'lumbar', to: 'hip', radius: 0.11, z: 0 },
  { from: 'neck', to: 'shoulder', radius: 0.05, z: 0 },
  ...([-1, 1] as const).flatMap((side): Segment[] => [
    { from: 'hip', to: 'knee', radius: 0.075, z: side * 0.1 },
    { from: 'knee', to: 'ankle', radius: 0.06, z: side * 0.1 },
    { from: 'ankle', to: 'toe', radius: 0.045, z: side * 0.1 },
    { from: 'shoulder', to: 'elbow', radius: 0.045, z: side * 0.2 },
    { from: 'elbow', to: 'wrist', radius: 0.04, z: side * 0.2 },
  ]),
];

const HEAD_RADIUS = 0.11;
const PELVIS = { radius: 0.12, length: 0.12 };

type JointMap = Record<Joint, [number, number]>;

function newJointMap(): JointMap {
  const m = {} as JointMap;
  for (const k of [...Object.keys(STATIC), ...Object.keys(REST)] as (Joint | 'pelvisTilt')[]) {
    if (k !== 'pelvisTilt') m[k] = [0, 0];
  }
  for (const [k, v] of Object.entries(STATIC)) m[k as Joint] = [v[0], v[1]];
  return m;
}

/** Writes the interpolated pose for `progress` into `out`; returns the pelvis tilt. */
function samplePose(frames: Pose[], progress: number, out: JointMap): number {
  const p = Math.min(1, Math.max(0, progress)) * (frames.length - 1);
  const i = Math.min(Math.floor(p), frames.length - 2);
  const t = p - i;
  const a = frames[i];
  const b = frames[i + 1];
  for (const k of ['lumbar', 'hip', 'knee', 'ankle', 'toe'] as const) {
    out[k][0] = a[k][0] + (b[k][0] - a[k][0]) * t;
    out[k][1] = a[k][1] + (b[k][1] - a[k][1]) * t;
  }
  return a.pelvisTilt + (b.pelvisTilt - a.pelvisTilt) * t;
}

function restLength(s: Segment): number {
  const j = newJointMap();
  samplePose([REST, REST], 0, j);
  return Math.hypot(j[s.to][0] - j[s.from][0], j[s.to][1] - j[s.from][1]);
}

/** Places a Y-aligned capsule between two points in the XY plane. */
function placeBetween(mesh: THREE.Object3D, a: [number, number], b: [number, number], z: number, rest: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  mesh.rotation.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2);
  mesh.scale.set(1, Math.hypot(dx, dy) / rest, 1);
}

function MannequinScene({
  exercise,
  progress,
  paused,
}: {
  exercise: MannequinExercise;
  progress: number;
  paused: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const segMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const pelvisMesh = useRef<THREE.Mesh>(null);
  const joints = useMemo(() => newJointMap(), []);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.body, roughness: 0.7 }), []);
  const geometries = useMemo(
    () => SEGMENTS.map((s) => ({ geo: new THREE.CapsuleGeometry(s.radius, restLength(s), 6, 14), rest: restLength(s) })),
    [],
  );
  const pelvisGeo = useMemo(() => new THREE.CapsuleGeometry(PELVIS.radius, PELVIS.length, 6, 14), []);
  useLayoutEffect(
    () => () => {
      material.dispose();
      pelvisGeo.dispose();
      geometries.forEach((g) => g.geo.dispose());
    },
    [material, pelvisGeo, geometries],
  );

  const apply = (value: number) => {
    const tilt = samplePose(KEYFRAMES[exercise], value, joints);
    SEGMENTS.forEach((s, i) => {
      const m = segMeshes.current[i];
      if (m) placeBetween(m, joints[s.from], joints[s.to], s.z, geometries[i].rest);
    });
    const pelvis = pelvisMesh.current;
    if (pelvis) {
      const [lx, ly] = joints.lumbar;
      const [hx, hy] = joints.hip;
      pelvis.position.set(hx - 0.02, hy, 0);
      pelvis.rotation.set(0, 0, Math.atan2(hy - ly, hx - lx) - Math.PI / 2 + tilt);
    }
  };

  const current = useEased(progress, apply, paused);

  // Pose on mount and whenever the exercise changes (even if progress is settled).
  useLayoutEffect(() => {
    apply(current.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply is rebuilt each render; exercise is what matters
  }, [exercise, current, invalidate]);

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[1, 3, 3]} intensity={1.3} />
      <directionalLight position={[-2, 1, -2]} intensity={0.35} />

      {/* Exercise mat */}
      <mesh position={[-0.1, -0.01, 0]}>
        <boxGeometry args={[2.1, 0.02, 0.8]} />
        <meshStandardMaterial color={COLORS.mat} roughness={0.95} />
      </mesh>

      {/* Faceless head */}
      <mesh position={[STATIC.head[0], STATIC.head[1], 0]} material={material}>
        <sphereGeometry args={[HEAD_RADIUS, 24, 16]} />
      </mesh>

      <mesh ref={pelvisMesh} geometry={pelvisGeo} material={material} />

      {SEGMENTS.map((s, i) => (
        <mesh
          key={`${s.from}-${s.to}-${s.z}`}
          ref={(m) => {
            segMeshes.current[i] = m;
          }}
          geometry={geometries[i].geo}
          material={material}
        />
      ))}
    </>
  );
}

export interface MannequinProps {
  exercise: MannequinExercise;
  /** 0 = rest pose, 1 = full exercise pose. The figure eases toward this value. */
  progress: number;
  /** Freezes the motion where it is (e.g. while the player is paused). */
  paused?: boolean;
  /** Accessible description of the illustration. */
  label: string;
  className?: string;
  /** Shown if the canvas can't render (e.g. no WebGL). */
  fallback?: ReactNode;
}

export function Mannequin({ exercise, progress, paused = false, label, className, fallback }: MannequinProps) {
  return (
    <div className={className} role="img" aria-label={label} style={{ background: COLORS.background }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [-0.1, 0.35, 2.4], fov: 35 }}
        onCreated={({ camera }) => camera.lookAt(-0.1, 0.2, 0)}
        fallback={fallback}
      >
        <MannequinScene exercise={exercise} progress={progress} paused={paused} />
      </Canvas>
    </div>
  );
}
