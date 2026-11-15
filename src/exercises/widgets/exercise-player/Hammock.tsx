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

/*
 * Pelvis sides: a thick curved wall on each side, like the inner bowl of the pelvis.
 * Cross-section (front view) is a ring segment; it is extruded along z through the
 * hammock's full depth. The inner face passes just outside the hammock's side edge,
 * so the edge is buried in the wall and the hammock visibly hangs between the sides.
 */
const PELVIS = {
  innerR: 0.35,
  outerR: 0.52,
  from: THREE.MathUtils.degToRad(-75), // bottom of the wall
  to: THREE.MathUtils.degToRad(65), // top of the wall
  anchorAngle: THREE.MathUtils.degToRad(-25), // where the hammock edge meets the inner face
  embed: 0.04, // how far the hammock edge sinks into the wall
  bevel: 0.04,
};
// Centre of the right-hand ring so that its inner face meets the hammock edge.
const PELVIS_CX = W - PELVIS.embed - PELVIS.innerR * Math.cos(PELVIS.anchorAngle);
const PELVIS_CY = END_Y - PELVIS.innerR * Math.sin(PELVIS.anchorAngle);

function createPelvisSideGeometry() {
  const { innerR, outerR, from, to, bevel } = PELVIS;
  const shape = new THREE.Shape();
  shape.absarc(PELVIS_CX, PELVIS_CY, outerR, from, to, false);
  shape.absarc(PELVIS_CX, PELVIS_CY, innerR, to, from, true);
  shape.closePath();
  const depth = 2 * D + 0.1;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 32,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Both pelvis sides; the left one is the right one mirrored. */
function PelvisSides() {
  const geometry = useMemo(() => createPelvisSideGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} geometry={geometry} scale={[side, 1, 1]}>
          <meshStandardMaterial color={COLORS.outline} roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

function HammockScene({ lift, paused }: { lift: number; paused: boolean }) {
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
  }, paused);

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />

      <PelvisSides />

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
  /** Freezes the motion where it is (e.g. while the player is paused). */
  paused?: boolean;
  /** Accessible description of the illustration. */
  label: string;
  className?: string;
  /** Shown if the canvas can't render (e.g. no WebGL). */
  fallback?: ReactNode;
}

export function Hammock({ lift, paused = false, label, className, fallback }: HammockProps) {
  return (
    <div className={className} role="img" aria-label={label} style={{ background: COLORS.background }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 1.3, 3.4], fov: 45 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.05, 0)}
        fallback={fallback}
      >
        <HammockScene lift={lift} paused={paused} />
      </Canvas>
    </div>
  );
}
