// Leonida Trophy Guide — hand-in program (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html, style.css,
// app.js, data/trophies.json) that a browser opens with the network off.
// This program copies app/ and screenshots/ next to this file into the
// output directory and writes dossier.json there with the vendored
// make.fun library, which is the summary the judge reads. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyHandIn() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  const shotsOut = join(outputDir, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(repoRoot, 'screenshots');
  if (existsSync(shotsIn)) cpSync(shotsIn, shotsOut, { recursive: true });
}

function writeDossier() {
  // Caps mirror the gate: at most 4 screenshots of 256 KiB, app/ at most
  // 993 files and 48 MiB. Only text_max_bytes changes the bytes written.
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

copyHandIn();
writeDossier();
