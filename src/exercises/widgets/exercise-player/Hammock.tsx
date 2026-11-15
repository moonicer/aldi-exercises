import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useEased } from './useEased';

const COLORS = {
  surface: '#E9A07A',
  outline: '#1E5B57',
  background: '#FBF5EE',
} as const;

// Hammock half-width (x) and half-depth (z), in world units.
const W = 1.1;
const D = 0.7;
const SEG_X = 32;
const SEG_Z = 12;
// Height where the hammock is anchored to the bones.
const END_Y = -0.2;
// Centre sag: relaxed hangs low, lifted rises slightly above the anchors.
const SAG_RELAXED = 0.5;
const SAG_LIFTED = -0.15;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Surface height at (x, z) for a given lift. */
function surfaceY(x: number, z: number, lift: number) {
  const u = x / W;
  const v = z / D;
  const sag = THREE.MathUtils.lerp(SAG_RELAXED, SAG_LIFTED, lift);
  // Parabolic sag across x, softer towards the front/back edges, edges slightly cradled.
  return END_Y - sag * (1 - u * u) * (1 - 0.25 * v * v) + 0.06 * v * v;
}

/** Flat [x,y,z,...] list tracing the hammock's rim. */
function rimPositions(lift: number): number[] {
  const out: number[] = [];
  const push = (x: number, z: number) => out.push(x, surfaceY(x, z, lift), z);
  for (let i = 0; i <= SEG_X; i++) push(-W + (2 * W * i) / SEG_X, -D);
  for (let i = 1; i <= SEG_Z; i++) push(W, -D + (2 * D * i) / SEG_Z);
  for (let i = 1; i <= SEG_X; i++) push(W - (2 * W * i) / SEG_X, D);
  for (let i = 1; i <= SEG_Z; i++) push(-W, D - (2 * D * i) / SEG_Z);
  return out;
}

function toPoints(flat: number[]): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < flat.length; i += 3) pts.push([flat[i], flat[i + 1], flat[i + 2]]);
  return pts;
}

/** Deform the plane's vertices to the hammock shape for `lift`. */
function shapeSurface(g: THREE.BufferGeometry, lift: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, surfaceY(pos.getX(i), pos.getZ(i), lift));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
}

/** A pelvic bone drawn as a simple arc; side -1 = left "(", 1 = right ")". */
function Bone({ side }: { side: -1 | 1 }) {
  const arc = THREE.MathUtils.degToRad(160);
  const start = side === 1 ? THREE.MathUtils.degToRad(-80) : THREE.MathUtils.degToRad(100);
  return (
    <mesh position={[side * 1.0, 0.25, 0]} rotation={[0, 0, start]}>
      <torusGeometry args={[0.5, 0.06, 12, 48, arc]} />
      <meshStandardMaterial color={COLORS.outline} roughness={0.6} />
    </mesh>
  );
}

function HammockScene({ lift }: { lift: number }) {
  const target = clamp01(lift);
  // Lift at mount; the geometry and rim are shaped for it before the first frame.
  const [initialLift] = useState(target);
  const rimRef = useRef<ComponentRef<typeof Line>>(null);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(2 * W, 2 * D, SEG_X, SEG_Z);
    g.rotateX(-Math.PI / 2); // lie flat in the XZ plane
    shapeSurface(g, initialLift);
    return g;
  }, [initialLift]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const initialRim = useMemo(() => toPoints(rimPositions(initialLift)), [initialLift]);

  useEased(target, (l) => {
    shapeSurface(geometry, l);
    rimRef.current?.geometry.setPositions(rimPositions(l));
  });

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />

      <Bone side={-1} />
      <Bone side={1} />

      <mesh geometry={geometry}>
        <meshStandardMaterial color={COLORS.surface} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <Line ref={rimRef} points={initialRim} color={COLORS.outline} lineWidth={2.5} />
    </>
  );
}

export interface HammockProps {
  /** 0 = relaxed, 1 = lifted. The surface eases toward this value. */
  lift: number;
  /** Accessible description of the illustration. */
  label: string;
  className?: string;
  /** Shown if the canvas can't render (e.g. no WebGL). */
  fallback?: ReactNode;
}

export function Hammock({ lift, label, className, fallback }: HammockProps) {
  return (
    <div className={className} role="img" aria-label={label} style={{ background: COLORS.background }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 1.3, 3.4], fov: 45 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.05, 0)}
        fallback={fallback}
      >
        <HammockScene lift={lift} />
      </Canvas>
    </div>
  );
}
