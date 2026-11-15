# Exercises slice — rules for Claude
Scope: pages/exercises, widgets/exercise-player, entities/exercise,
"exercises.*" keys in shared/i18n/locales/{ru,kk,uz,en}.json. Nothing else.
Do not change package.json, router, Prisma, or API contracts; list needed changes instead.

Stack: React + TypeScript, @react-three/fiber, @react-three/drei. No external 3D files:
all geometry is procedural. Must run at 30+ fps on a mid-range Android phone.

Content: Kazakh (kk) text is written by a native speaker. NEVER rewrite or "fix" kk strings.
ru/en/uz are drafts: mark machineTranslated: true. uz uses Latin script (oʻ, gʻ).
All exercises have reviewed: false and show a "demo, not specialist-reviewed" badge.

Behaviour: play / pause / replay; breathing cue text always visible (works without sound);
cues stay in sync after pause; if WebGL fails, show the text steps instead.
Accessibility: buttons have labels, controls work by keyboard, text min 16px.

Work style: propose a short plan first, then build one step at a time; tell me how to test each step.
