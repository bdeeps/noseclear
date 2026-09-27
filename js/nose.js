// NoseClear's shared models: a stylised but anatomically placed human nose and nasal cavity,
// the air-conditioning physics used by the readouts, the odour molecules and their receptor
// patterns, and small helpers (paths, labels, phone-width framing).
//
// Orientation: we look at the head from its LEFT side, face pointing to the right, as in a
// sagittal (side-on) anatomy atlas. Axes of the head: +x = forwards (towards the nose tip),
// +y = up, +z = the patient's left (towards you). One model unit is 1 cm.
// With "cut away" on, the left half of the nose is removed and the septum turned see-through,
// so you look at the lateral wall of the RIGHT nasal cavity, the classic atlas view.
//
// Anatomy follows Gray's Anatomy (42nd ed.), Netter's Atlas of Human Anatomy, and
// NIDCD "Smell disorders" (nidcd.nih.gov/health/smell-disorders):
//  - each nasal cavity runs about 10 cm from nostril to the choana (the back opening into the
//    nasopharynx), is about 5 cm tall and 1.5 cm wide at the floor, narrowing to a slit of a
//    few millimetres at the roof;
//  - three curled bony shelves covered in mucosa, the inferior, middle and superior turbinates
//    (conchae), hang from each lateral wall; the air channels under them are the meatuses;
//  - the olfactory epithelium lines the roof (the olfactory cleft): the underside of the
//    cribriform plate, the top of the septum and the superior turbinate. It is yellowish, a
//    few square centimetres in all (figures from about 1 to 10 cm² appear in the literature;
//    ~5 cm² total is the common textbook value);
//  - the cribriform plate of the ethmoid bone is a sieve of ~20 small holes on each side through
//    which bundles of olfactory nerve fibres pass to the olfactory bulb, which lies on it under
//    the frontal lobe (a human bulb is about 1 cm long);
//  - the paranasal sinuses: frontal (in the forehead), ethmoid cells (between the nose and eye),
//    maxillary (in the cheeks, the largest) and sphenoid (behind the nose, under the brain).
import { THREE, M, tube, clamp, lerp, smooth } from './kit.js';

// ================================================================ colours
export const COL = {
  mucosa: 0xe58a93, turb: 0xdd7482, olf: 0xe8c25a, bone: 0xefe4cc, cart: 0xcfe1f2,
  skin: 0xe2ab8f, air: 0x8fd0ff, brain: 0xf1b4c4, bulb: 0xffd166, nerve: 0xffe08a,
  cold: 0x7fb2ff, warm: 0xffa04a, odour: 0xffd166, dust: 0xb08a5a,
};

// ================================================================ the cavity outline
// Sagittal outline of one nasal cavity (x forwards, y up), from the back of the floor round
// the front and along the roof. The choana is the open back edge at x = 0.
export const OUTLINE = [
  [0, 0], [2, 0], [4, 0], [6, 0], [8.0, 0.05], [8.35, 0.45], [8.5, 1.4], [8.35, 2.6], [7.95, 3.8], [7.2, 4.65],
  [6.3, 5.1], [5.0, 5.25], [3.5, 5.3], [2.3, 5.2], [1.4, 4.7], [0.7, 3.6], [0.2, 2.8], [0, 2.6],
];
export const ROOF = 5.3;
// Half-width of the cavity (distance from the septum to the lateral wall) at height y:
// about 1.4 cm at the floor, a slit of ~2 mm up in the olfactory cleft.
export const wallZ = (y) => 0.2 + 1.2 * Math.pow(1 - clamp(y / ROOF, 0, 1), 0.55);

function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Where a horizontal line at height y crosses the outline: the [back, front] x of the cavity.
export function span(poly, y) {
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) || (y === yi && y === yj)) xs.push(yi === yj ? xi : xi + ((y - yi) * (xj - xi)) / (yj - yi));
  }
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
}
// A curved sheet filling a sagittal outline row by row (so its edge follows the outline
// exactly): z = zf(x, y). Optional y range and x clip for patches.
export function sheetGeometry(poly, zf, { nx = 60, ny = 44, y0 = null, y1 = null, clip = [-1e9, 1e9] } = {}) {
  const ys = poly.map((p) => p[1]);
  const lo = y0 ?? Math.min(...ys) + 1e-4, hi = y1 ?? Math.max(...ys) - 1e-4;
  const pos = [], idx = [];
  for (let j = 0; j <= ny; j++) {
    const y = lo + ((hi - lo) * j) / ny, sp = span(poly, y) || [0, 0];
    const a = Math.max(sp[0], clip[0]), b = Math.max(a, Math.min(sp[1], clip[1]));
    for (let i = 0; i <= nx; i++) { const x = a + ((b - a) * i) / nx; pos.push(x, y, zf(x, y)); }
  }
  const id = (i, j) => j * (nx + 1) + i;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) idx.push(id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// The smell patch: the roof of the cavity above this height, between these x limits
// (the underside of the cribriform plate, the top of the septum, the superior turbinate).
export const OLF = { y0: 4.25, clip: [1.6, 6.7] };

// ================================================================ lofted shapes
// Stack horizontal slices (constant y). slice(y) → { cx, a (front half-length), b (back
// half-length), w (half-width), nf, nb (superellipse exponents front/back) }.
function loft(ys, slice, seg = 48, { half = false } = {}) {
  const pos = [], idx = [], rings = ys.length;
  const cols = seg + 1;
  for (const y of ys) {
    const s = slice(y);
    for (let k = 0; k <= seg; k++) {
      const phi = half ? Math.PI + (Math.PI * k) / seg : (2 * Math.PI * k) / seg;   // half: the right side (z ≤ 0)
      const c = Math.cos(phi), sn = Math.sin(phi);
      const n = c >= 0 ? s.nf : s.nb, L = c >= 0 ? s.a : s.b;
      const x = s.cx + L * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const z = s.w * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      pos.push(x, y, z);
    }
  }
  for (let r = 0; r < rings - 1; r++) for (let k = 0; k < seg; k++) {
    const a = r * cols + k, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const interp = (table, y) => {
  if (y <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) if (y <= table[i][0]) { const [y0, v0] = table[i - 1], [y1, v1] = table[i]; return lerp(v0, v1, smooth((y - y0) / (y1 - y0))); }
  return table[table.length - 1][1];
};

// The head: a stylised adult head and neck, about 20 cm from brow to back, built from slices.
const HEAD_F = [[-8.2, 3.4], [-7.6, 3.4], [-7.0, 4.8], [-6.6, 7.2], [-5.2, 8.8], [-3.9, 8.2], [-2.8, 8.9], [-2.1, 8.55], [-1.2, 9.05], [0, 8.45], [3, 8.2], [5.4, 8.5], [7, 8.9], [9, 8.7], [12, 8.4], [15, 7.3], [17, 5], [18.6, 0.5]];
const HEAD_B = [[-8.2, -6.3], [-6, -6.2], [-3, -6.4], [0, -7.6], [3, -9.2], [6, -10.2], [9, -10.8], [12, -10.6], [15, -9.3], [17, -6.5], [18.6, -1.0]];
const HEAD_W = [[-8.2, 4.9], [-7, 4.9], [-5.5, 5.0], [-3, 5.7], [0, 6.4], [3, 7.0], [6, 7.3], [9, 7.6], [12, 7.6], [15, 7.0], [17, 5.2], [18.6, 0.6]];
export function headGeometry() {
  const ys = []; for (let y = -8.2; y <= 18.6001; y += 0.35) ys.push(y);
  return loft(ys, (y) => { const f = interp(HEAD_F, y), b = interp(HEAD_B, y); return { cx: (f + b) / 2, a: (f - b) / 2, b: (f - b) / 2, w: interp(HEAD_W, y), nf: 2.5, nb: 2 }; }, 64);
}
// The external nose: from the nasion (root, between the eyes) down the bridge to the tip, with
// the wide alae (wings) at its base. The nostrils open downwards on its underside.
const NOSE_F = [[0, 9.85], [0.2, 10.3], [0.55, 10.72], [1.0, 10.8], [1.6, 10.4], [2.5, 9.8], [4.0, 9.08], [5.45, 8.55]];
const NOSE_W = [[0, 1.55], [0.2, 1.72], [0.55, 1.7], [1.0, 1.35], [1.6, 1.0], [2.5, 0.8], [4.0, 0.64], [5.45, 0.52]];
export const NOSE_BACK = 8.1;
export function noseGeometry(half = false) {
  const ys = []; for (let y = 0; y <= 5.4501; y += 0.15) ys.push(y);
  const g = loft(ys, (y) => { const f = interp(NOSE_F, y); return { cx: NOSE_BACK, a: f - NOSE_BACK, b: 0.01, w: interp(NOSE_W, y), nf: 2.3, nb: 2 }; }, 40, { half });
  return g;
}

// ================================================================ paths
// A polyline sampled by arc length, so particles can travel along it at a steady speed.
export function pathOf(points) {
  const Pt = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p)));
  const L = [0];
  for (let i = 1; i < Pt.length; i++) L.push(L[i - 1] + Pt[i].distanceTo(Pt[i - 1]));
  const total = L[L.length - 1];
  return {
    points: Pt, total,
    at(u, out = new THREE.Vector3()) {
      const d = clamp(u, 0, 1) * total;
      let lo = 0, hi = L.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
      const k = (d - L[lo]) / Math.max(1e-9, L[hi] - L[lo]);
      return out.copy(Pt[lo]).lerp(Pt[hi], k);
    },
  };
}
export const smoothPts = (pts, n = 90) => new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p)))).getPoints(n);

// Air streams through one side (x, y; z is added per side). Computational models of nasal
// airflow find most air goes through the middle and lower channels and only a small share,
// of the order of 5–15%, reaches the olfactory cleft in quiet breathing, more in a sniff
// (Keyhani, Scherer & Mozell, J Theor Biol 186:279, 1997; Zhao et al., Chem Senses 29:365, 2004).
const PHARYNX = [[-0.9, 0.7], [-1.4, -0.9], [-1.5, -3.4]];
export const STREAMS = {
  floor: [[9.5, 0.0], [9.0, 0.7], [8.1, 1.0], [6.8, 0.42], [4, 0.35], [1.2, 0.45], [0, 0.9], ...PHARYNX],
  middle: [[9.5, 0.0], [8.95, 0.8], [8.05, 1.65], [6.6, 2.0], [4, 2.05], [1.4, 2.0], [0, 1.6], ...PHARYNX],
  upper: [[9.5, 0.0], [8.9, 0.9], [8.05, 2.3], [7.1, 3.6], [5.9, 4.62], [4.3, 4.92], [2.8, 4.8], [1.8, 4.1], [0.8, 2.8], [-0.1, 1.6], ...PHARYNX],
};
// Breathing through the mouth: lips, over the tongue, down the throat.
export const MOUTH = [[9.4, -2.1], [8.2, -1.7], [5.5, -0.9], [2.5, -0.9], [0.2, -1.6], [-1.2, -2.6], [-1.5, -4.0]];
// Where along a stream the air is inside the cavity proper (for the air-conditioning model).
export const S_NASOPHARYNX = 0.86;

// ================================================================ air conditioning
// Saturation vapour pressure of water (kPa), Magnus formula (WMO 2008 coefficients).
export const esat = (T) => 0.6112 * Math.exp((17.62 * T) / (243.12 + T));
// Warming and humidifying along the nose. Keck et al. measured, for room air of about 25 °C and
// 40% humidity, about 34 °C and 90–95% relative humidity by the nasopharynx
// (Laryngoscope 110:651, 2000; Rhinology 38:167, 2000). We treat the mucosa as a heat and water
// source at 35 °C and saturated, and air approaching it exponentially along the passage; the
// constants below reproduce Keck's values. Mouth breathing: a rough model where much less of
// the gap is closed by the back of the throat (the airways further down finish the job).
export const TM = 35;
export function condition(Tin, RHin, s, mouth = false) {
  const kT = mouth ? 0.6 : Math.log(10), kW = mouth ? 0.5 : Math.log(1 / 0.13);
  const fT = Math.exp(-kT * s), fW = Math.exp(-kW * s);
  const T = TM - (TM - Tin) * fT;
  const eIn = (RHin / 100) * esat(Tin), eM = 0.97 * esat(TM);
  const e = eM - (eM - eIn) * fW;
  const RH = Math.min(100, (100 * e) / esat(T));
  return { T, RH, e, condenses: (100 * e) / esat(T) > 100 };
}

// ================================================================ odours
// Receptor types shown on the board (8 of the ~400 in a human nose; colours only).
export const RTYPES = [0xff5a6a, 0xffb547, 0xffe066, 0x5ce1a9, 0x4fc3ff, 0x7a8cff, 0xc49bff, 0xff7ad0];
// The activation patterns are ILLUSTRATIVE: they show how a combinatorial code works
// (Malnic, Hirono, Sato & Buck, Cell 96:713, 1999: one odorant activates several receptor types,
// one receptor type responds to several odorants, and the set changes with concentration).
// thr: the concentration (relative) at which each receptor type starts to respond.
export const ODOURS = {
  banana: { name: 'Banana', mol: 'isoamyl acetate', formula: 'C₇H₁₄O₂', note: 'fruity, like banana and pear drops', color: 0xffe066, thr: [0.15, 1, 0.35, 1, 1, 0.7, 1, 0.55] },
  rose: { name: 'Rose', mol: '2-phenylethanol', formula: 'C₈H₁₀O', note: 'rose petals, a little honey', color: 0xff7ad0, thr: [1, 0.3, 1, 0.8, 0.2, 1, 0.6, 1] },
  spearmint: { name: 'Spearmint', mol: '(R)-carvone', formula: 'C₁₀H₁₄O', note: 'spearmint gum', color: 0x5ce1a9, thr: [1, 0.6, 1, 0.15, 0.45, 0.35, 1, 1] },
  caraway: { name: 'Caraway', mol: '(S)-carvone', formula: 'C₁₀H₁₄O', note: 'caraway and dill seed', color: 0xc49bff, thr: [0.75, 0.6, 1, 1, 0.45, 0.35, 0.2, 1] },
  gas: { name: 'Gas odorant', mol: 'ethyl mercaptan (ethanethiol)', formula: 'C₂H₆S', note: 'rotten cabbage, “gas”', color: 0xb8ff6a, thr: [0.4, 1, 1, 1, 1, 1, 0.08, 0.25] },
};
export const active = (od, conc) => od.thr.map((t) => clamp((conc - t) / 0.25 + 0.35, 0, 1) * (conc >= t ? 1 : 0));

// Ball-and-stick molecules, heavy atoms plus the polar hydrogen, in a flat-ish layout.
// Bond length is 1 unit; the model scales them down. Carvone's mirror forms are built as true
// mirror images (z → −z), which is exactly what the two enantiomers are.
const RING = (cx, cy, r = 1, a0 = Math.PI / 2) => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos(a0 + (i * Math.PI) / 3), cy + r * Math.sin(a0 + (i * Math.PI) / 3), 0]);
function molData(id) {
  if (id === 'gas') return { atoms: [['C', 0, 0, 0], ['C', 0.87, 0.5, 0], ['S', 1.95, -0.1, 0], ['H', 2.7, 0.45, 0]], bonds: [[0, 1], [1, 2], [2, 3]] };
  if (id === 'banana') {
    const z = [[0, 0], [0.87, 0.5], [1.73, 0], [2.6, 0.5], [3.46, 0], [4.33, 0.5], [5.2, 0], [4.33, 1.5]];
    return { atoms: [['C', ...z[0], 0], ['C', ...z[1], 0], ['O', ...z[2], 0], ['C', ...z[3], 0], ['C', ...z[4], 0], ['C', ...z[5], 0], ['C', ...z[6], 0], ['C', ...z[7], 0], ['O', 0.87, 1.5, 0]], bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [5, 7], [1, 8]] };
  }
  if (id === 'rose') {
    const r = RING(0, 0);
    return { atoms: [...r.map((p) => ['C', ...p]), ['C', 0.87 * 2, 1.0, 0], ['C', 2.6, 0.5, 0], ['O', 3.46, 1.0, 0], ['H', 4.2, 0.55, 0]], bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [5, 6], [6, 7], [7, 8], [8, 9]] };
  }
  // carvone: ring C1..C6; C1=O, C2 methyl, C5 carries the isopropenyl group out of the ring plane.
  const r = RING(0, 0, 1, Math.PI / 2);
  const out = (i, k = 1) => [r[i][0] * (1 + k), r[i][1] * (1 + k), 0];
  const zS = id === 'caraway' ? -1 : 1;
  const c5 = r[4], dir = [c5[0] * 0.55, c5[1] * 0.55, 0.8 * zS];
  const iso = [c5[0] + dir[0], c5[1] + dir[1], dir[2]];
  return {
    atoms: [...r.map((p) => ['C', ...p]), ['O', ...out(0)], ['C', ...out(1)], ['C', ...iso], ['C', iso[0] + 0.9, iso[1] - 0.2, iso[2] + 0.35 * zS], ['C', iso[0] - 0.2, iso[1] - 0.9, iso[2] + 0.35 * zS]],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [1, 7], [4, 8], [8, 9], [8, 10]],
  };
}
const ATOM = { C: [0x3a3f4a, 0.3], O: [0xff4b4b, 0.32], S: [0xffd43b, 0.4], H: [0xf2f2f2, 0.2] };
export function molecule(id, scale = 0.2) {
  const g = new THREE.Group(), d = molData(id);
  const pts = d.atoms.map(([, x, y, z]) => new THREE.Vector3(x, y, z));
  const c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  pts.forEach((p) => p.sub(c));
  d.atoms.forEach(([el], i) => { const [col, r] = ATOM[el]; const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), M.plastic(col, { roughness: 0.35 })); m.position.copy(pts[i]); g.add(m); });
  const bm = M.plastic(0xd8dde6);
  d.bonds.forEach(([a, b]) => { const A = pts[a], B = pts[b], L = A.distanceTo(B); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, L, 8), bm); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.add(m); });
  g.scale.setScalar(scale);
  return g;
}

// ================================================================ the nose and head model
// opts: { labels, cut (hide the left side), flow (air particles), head, brain }
export function makeNose(stage, opts = {}) {
  const o = { labels: true, cut: true, flow: true, head: true, brain: true, sinuses: true, ...opts };
  const root = new THREE.Group();
  const groups = {};
  const G = (name, parent = root) => { const g = new THREE.Group(); parent.add(g); groups[name] = g; return g; };
  const physical = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35, transparent: true, opacity: 1, side: THREE.DoubleSide, ...extra });
  const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; parent.add(m); return m; };
  const left = [];                                   // everything on the patient's left side

  // ---- head skin and the external nose
  const skinMat = new THREE.MeshStandardMaterial({ color: COL.skin, roughness: 0.6, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.FrontSide });
  const headG = G('head');
  const head = mk(headGeometry(), skinMat, headG); head.renderOrder = 5;
  const eyeMat = M.ghost(0xf7f3ea, 0.1);
  const eyes = [1, -1].map((s) => { const e = mk(new THREE.SphereGeometry(1.2, 24, 16), eyeMat, headG); e.position.set(6.7, 6.1, 3.1 * s); return e; });
  headG.visible = o.head;
  const noseG = G('nose');
  const noseMat = physical(COL.skin, { roughness: 0.55, clearcoat: 0.15 });
  const noseFull = mk(noseGeometry(false), noseMat, noseG);
  const noseHalf = mk(noseGeometry(true), noseMat, noseG);   // right half only, for the cutaway
  const nostrilMat = M.matte(0x2a0f14);
  const nostrils = [1, -1].map((s) => { const n = mk(new THREE.CircleGeometry(1, 24), nostrilMat, noseG); n.scale.set(0.5, 0.28, 1); n.rotation.x = Math.PI / 2; n.position.set(9.45, -0.02, 0.62 * s); return n; });

  // ---- bones: hard palate, nasal bone, cribriform plate
  const boneMat = M.matte(COL.bone, { transparent: true, opacity: 1 });
  const palateG = G('palate');
  const palate = mk(new THREE.BoxGeometry(7.8, 0.35, 3.4), boneMat, palateG); palate.position.set(4.2, -0.2, 0);
  const softPal = tube([[0.3, -0.2, 0], [-0.4, -0.7, 0], [-0.8, -1.5, 0]], 0.22, physical(COL.mucosa), false, 24); palateG.add(softPal);
  const tongue = mk(new THREE.SphereGeometry(1, 32, 20), physical(0xe56a7a, { opacity: 0.22, depthWrite: false }), palateG); tongue.scale.set(3.7, 1.1, 2.0); tongue.position.set(4.0, -1.75, 0);
  const plateG = G('plate');
  const plate = mk(new THREE.BoxGeometry(4.2, 0.12, 1.5), boneMat, plateG); plate.position.set(4.3, ROOF + 0.08, 0);
  const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8), M.matte(0x3a2a20), 40);
  for (let i = 0; i < 40; i++) { const m = new THREE.Matrix4().makeTranslation(2.6 + (i % 10) * 0.38, ROOF + 0.08, (Math.floor(i / 10) - 1.5) * 0.3); holes.setMatrixAt(i, m); }
  plateG.add(holes);
  const nasalBone = mk(new THREE.BoxGeometry(1.3, 0.12, 1.2), boneMat, noseG); nasalBone.position.set(8.55, 4.75, 0); nasalBone.rotation.z = -1.1;

  // ---- walls, septum and turbinates (both sides; side s = +1 is the patient's left)
  const mucosaMat = physical(COL.mucosa, { opacity: 0.95 });
  const olfMat = physical(COL.olf, { roughness: 0.55, emissive: new THREE.Color(COL.olf), emissiveIntensity: 0.45 });
  const turbMat = physical(COL.turb);
  const sides = {};
  for (const s of [1, -1]) {
    const g = G(s > 0 ? 'leftSide' : 'rightSide');
    const wall = mk(sheetGeometry(OUTLINE, (x, y) => s * wallZ(y)), mucosaMat, g);
    const wallOlf = mk(sheetGeometry(OUTLINE, (x, y) => s * (wallZ(y) - 0.012), { ...OLF, ny: 10 }), olfMat, g);
    const turbs = {};
    const TURB = { inferior: [1.0, 6.4, 1.05, 1.2, 0.0], middle: [1.4, 5.8, 2.75, 1.05, 0.05], superior: [1.4, 3.9, 4.0, 0.62, 0.08] };
    for (const [name, [x0, x1, yc, h, tilt]] of Object.entries(TURB)) {
      const tg = new THREE.Group(); g.add(tg); groups[`${name}${s > 0 ? 'L' : 'R'}`] = tg;
      const geo = new THREE.SphereGeometry(1, 40, 20);
      // Taper the back end, so the front "head" of each turbinate is fuller, as in life.
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 1 - 0.28 * Math.max(0, -p.getX(i)); p.setY(i, p.getY(i) * k); p.setZ(i, p.getZ(i) * k); }
      geo.computeVertexNormals();
      const m = mk(geo, name === 'superior' ? olfMat : turbMat, tg);
      const t = { mesh: m, group: tg, x0, x1, yc, h, s, gap: 0.2 };
      t.set = (gap, swell = 0) => {
        t.gap = gap;
        const wz = wallZ(yc), rz = (wz + 0.3 - gap) / 2;
        m.scale.set((x1 - x0) / 2, (h / 2) * (1 + 0.45 * swell), rz);
        m.position.set((x0 + x1) / 2, yc, s * (gap + rz));
        m.rotation.set(0, 0, tilt);
      };
      t.set(0.2);
      turbs[name] = t;
    }
    sides[s] = { group: g, wall, wallOlf, turbs };
    if (s > 0) left.push(g);
  }
  // Septum: cartilage at the front, bone behind; smell patch on its top on both faces.
  const septG = G('septum');
  const septMat = physical(COL.cart, { opacity: 0.22, depthWrite: false, roughness: 0.4 });
  const septum = mk(sheetGeometry(OUTLINE, () => 0, { ny: 12, nx: 20 }), septMat, septG);
  const septOlf = mk(sheetGeometry(OUTLINE, () => -0.01, { ...OLF, ny: 6 }), olfMat.clone(), septG); septOlf.material.opacity = 0.75;

  // ---- olfactory bulbs, tracts, nerve fibres and the brain above
  const bulbG = G('bulb');
  const bulbMat = physical(COL.bulb, { roughness: 0.5, emissive: new THREE.Color(COL.bulb), emissiveIntensity: 0.25, opacity: 1 });
  const bulbs = [1, -1].map((s) => { const b = mk(new THREE.SphereGeometry(1, 28, 16), bulbMat, bulbG); b.scale.set(0.75, 0.24, 0.26); b.position.set(4.9, ROOF + 0.45, 0.42 * s); return b; });
  const tracts = [1, -1].map((s) => tube([[4.3, ROOF + 0.45, 0.42 * s], [2.5, ROOF + 0.62, 0.5 * s], [0.5, ROOF + 0.95, 0.8 * s], [-1.2, ROOF + 1.5, 1.2 * s]], 0.11, bulbMat, false, 40));
  tracts.forEach((t) => bulbG.add(t));
  const fibreMat = M.glow(COL.nerve, { transparent: true, opacity: 0.8 });
  const fibres = new THREE.Group(); bulbG.add(fibres);
  for (let i = 0; i < 14; i++) {
    const x = 2.7 + (i % 7) * 0.52, s = i < 7 ? 1 : -1;
    fibres.add(tube([[x, ROOF - 0.35, 0.12 * s], [x + 0.05, ROOF + 0.1, 0.25 * s], [x + 0.25, ROOF + 0.35, 0.4 * s]], 0.022, fibreMat, false, 8));
  }
  const brainG = G('brain', bulbG);
  const brain = mk(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshStandardMaterial({ color: COL.brain, transparent: true, opacity: 0.07, depthWrite: false, roughness: 0.6 }), brainG);
  brain.scale.set(8.8, 6.0, 6.6); brain.position.set(-1.2, 11.35, 0); brain.renderOrder = 4;
  brainG.visible = o.brain;

  // ---- sinuses (air spaces in the bone, lined with mucosa)
  const airMat = new THREE.MeshStandardMaterial({ color: COL.air, transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.3 });
  const sinG = G('sinuses');
  const egg = (p, r, parent = sinG) => { const m = mk(new THREE.SphereGeometry(1, 24, 16), airMat, parent); m.scale.set(...r); m.position.set(...p); m.renderOrder = 3; return m; };
  const frontalG = G('frontal', sinG), maxG = G('maxillary', sinG), sphG = G('sphenoid', sinG), ethG = G('ethmoid', sinG);
  [1, -1].forEach((s) => { egg([7.55, 7.4, 0.95 * s], [0.62, 1.1, 0.85], frontalG); const mx = egg([4.8, 1.7, 3.1 * s], [1.9, 1.5, 1.15], maxG); if (s > 0) left.push(mx); });
  egg([-0.35, 4.3, 0], [1.05, 1.0, 1.25], sphG);
  for (let i = 0; i < 12; i++) { const s = i % 2 ? 1 : -1, k = i >> 1; const e = egg([3.1 + (k % 3) * 1.1, 3.6 + Math.floor(k / 3) * 0.75, (1.85 + 0.25 * (k % 2)) * s], [0.4, 0.33, 0.33], ethG); if (s > 0) left.push(e); }
  sinG.visible = o.sinuses;

  // ---- nasopharynx: where the two sides meet at the back, then down to the throat
  const npG = G('pharynx');
  const npMat = physical(COL.mucosa, { opacity: 0.35, depthWrite: false });
  const np = tube([[0.4, 1.5, 0], [-0.8, 1.0, 0], [-1.4, -0.6, 0], [-1.5, -2.4, 0], [-1.5, -4.2, 0]], 0.85, npMat, false, 60); npG.add(np); np.renderOrder = 3;

  // ---- air particles
  const flow = makeAir(root);
  flow.mesh.visible = o.flow;

  // ---- labels
  const labels = [], minor = [];
  const L = (html, pos, parent, cls = '', main = false) => { const l = stage.label(html, pos, parent); tint(l, cls); labels.push(l); if (!main) minor.push(l); return l; };
  if (o.labels) {
    L('Nostril', [10.2, -0.9, 0.9], noseG, 'skin', true);
    L('Septum (see-through)', [7.4, 0.55, 0.1], septG, 'side');
    L('Inferior turbinate', [3.2, 0.95, 0.4], groups.inferiorR, 'turb', true);
    L('Middle turbinate', [3.4, 2.72, 0.4], groups.middleR, 'turb', true);
    L('Superior turbinate', [2.1, 3.95, 0.4], groups.superiorR, 'turb');
    L('Smell patch<br><small>olfactory epithelium</small>', [7.6, 4.85, 0.3], septG, 'gold', true);
    L('Cribriform plate', [6.9, ROOF + 0.15, 0], plateG, 'bone');
    L('Olfactory bulb', [5.7, ROOF + 1.0, 0.5], bulbG, 'gold', true);
    L('Brain (frontal lobe)', [0.5, 9.2, 0], brainG, 'side');
    L('Frontal sinus', [7.4, 8.7, 0.9], frontalG, 'air');
    L('Maxillary sinus<br><small>in the cheek</small>', [7.3, 3.2, -3.1], maxG, 'air');
    L('Sphenoid sinus', [-0.4, 5.1, 0], sphG, 'air');
    L('Nasopharynx<br><small>to the throat and lungs</small>', [-2.4, -1.4, 0], npG, 'skin', true);
    L('Hard palate', [5.5, -0.75, 0.6], palateG, 'bone');
  }

  // ---- state
  let cut = o.cut, xr = 1;
  const api = {
    root, groups, sides, flow, labels, minor, bulbs, fibres, olfMat, septum, head, noseG,
    mats: { mucosa: mucosaMat, turb: turbMat, olf: olfMat, skin: skinMat, nose: noseMat, sept: septMat },
    meshes: { plate, palate, tongue, brain, np, septOlf },
    // 0 = solid skin, 1 = see-through
    setXray(k) {
      xr = k;
      skinMat.opacity = lerp(0.96, 0.06, k); skinMat.depthWrite = k < 0.5;
      noseMat.opacity = lerp(1, 0.2, k); noseMat.depthWrite = k < 0.5;
      eyeMat.opacity = lerp(0.0, 0.1, k);
      head.renderOrder = k < 0.5 ? 0 : 5;
    },
    setCut(on) {
      cut = on;
      left.forEach((m) => { m.visible = !on; });
      noseFull.visible = !on; noseHalf.visible = on;
      nostrils[0].visible = !on;
      septMat.opacity = on ? 0.22 : 0.35;
      flow.sides[1] = !on;
    },
    // Pull the parts apart (k 0 → 1).
    setExplode(k) {
      const e = smooth(k);
      const set = (g, x, y, z) => g.position.set(x * e, y * e, z * e);
      set(noseG, 3.2, -0.4, 0);
      set(septG, 0, 0, 3.2);
      set(sides[1].group, 0, 0, 6.5);
      set(sides[-1].group, 0, 0, -1.2);
      set(groups.inferiorR, 0.4, -0.5, 3.3); set(groups.middleR, 0.4, 0, 4.2); set(groups.superiorR, 0.4, 0.6, 5.1);
      set(plateG, 0, 1.3, 0); set(bulbG, 0, 2.8, 0);
      set(frontalG, 1.4, 1.6, 0); set(maxG, 0, -0.6, -2.6); set(sphG, -2.2, 0.6, 0); set(ethG, 0, 0.9, -2.2);
      set(palateG, 0, -2.2, 0); set(npG, -2.2, -0.4, 0);
      headG.visible = o.head && k < 0.6;
      skinMat.opacity = lerp(0.96, 0.06, xr) * (1 - smooth(k / 0.6));
      flow.mesh.visible = o.flow && k < 0.03;
    },
    // Swelling of one side's turbinates (0 = open, 1 = fully congested, as in a cold).
    setSwell(s, k) { for (const t of Object.values(sides[s].turbs)) t.set(lerp(0.2, 0.015, k), k); },
    showLabels(on, narrow = false) { labels.forEach((l) => { l.visible = on; }); if (on && narrow) minor.forEach((l) => { l.visible = false; }); },
  };
  api.setXray(1); api.setCut(cut); api.setExplode(0);
  return api;
}

// ================================================================ air particles
// Dots flow along the three streams of each side, out through the nasopharynx. q: {
//  flow (0..3, 1 = quiet breathing), upper (share of dots in the upper stream), sides {1, -1}
//  open (0..1 per side), colorAt(u, stream) optional }.
export function makeAir(parent, perSide = 150) {
  const list = [];
  for (const s of [1, -1]) for (const [name, pts] of Object.entries(STREAMS)) {
    const P = smoothPts(pts.map(([x, y], i) => {
      const inCavity = x > -0.2;
      const z = inCavity ? s * (i === 0 ? 0.62 : x > 8.3 ? 0.45 : name === 'upper' ? 0.1 : 0.12) : s * 0.08;
      return [x, y, z];
    }), 120);
    list.push({ s, name, path: pathOf(P) });
  }
  const N = perSide * 2;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true }), N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
  parent.add(mesh);
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const dots = Array.from({ length: N }, (_, i) => ({ s: i < perSide ? 1 : -1, u: rnd(i), r: rnd(i + 11), j: [rnd(i + 3) - 0.5, rnd(i + 5) - 0.5, rnd(i + 9) - 0.5], kind: 0 }));
  const o = new THREE.Object3D(), p = new THREE.Vector3(), col = new THREE.Color();
  const pick = (d, upper) => list.find((r) => r.s === d.s && r.name === (d.r < upper ? 'upper' : d.r < upper + (1 - upper) * 0.55 ? 'middle' : 'floor'));
  const api = {
    mesh, dots, sides: { 1: true, [-1]: true },
    // Step along. q.dir = +1 breathing in, −1 breathing out.
    step(dt, q) {
      dt = Math.max(0, dt);
      const upper = q.upper ?? 0.1;
      for (let i = 0; i < N; i++) {
        const d = dots[i], open = q.open?.[d.s] ?? 1;
        const r = pick(d, upper);
        const v = (q.flow ?? 1) * (0.25 + 0.75 * open) * 6.5 * (q.dir ?? 1);
        let u = d.u + (v * dt) / r.path.total;
        if (u >= 1) { u -= 1; d.r = rnd(d.r * 97 + i); }
        if (u < 0) { u += 1; d.r = rnd(d.r * 89 + i); }
        d.u = u;
        r.path.at(u, p);
        const spread = 0.12;
        o.position.set(p.x + d.j[0] * spread, p.y + d.j[1] * spread * 1.5, p.z + d.j[2] * 0.06);
        const vis = api.sides[d.s] && open > 0.02;
        o.scale.setScalar(vis ? 1 : 0.0001);
        o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
        if (q.colorAt) { q.colorAt(col, u, r.name, d); mesh.setColorAt(i, col); }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
  const c0 = new THREE.Color(0x9fdcff); for (let i = 0; i < N; i++) mesh.setColorAt(i, c0);
  return api;
}

// ================================================================ labels and framing
const TINT = { gold: '#ffd166', side: '#8ef0ff', turb: '#ff9aa6', bone: '#efe4cc', air: '#9fdcff', skin: '#f3c2a8', warm: '#ffb070', cold: '#8fb0ff', green: '#5ce1a9', pink: '#ff7ad0' };
export function tint(l, cls) { const c = TINT[cls]; if (c) { l.element.style.borderColor = c; l.element.style.color = c; } return l; }

// On a phone-width stage the readout covers the upper left, so re-centre once, unless the
// viewer has already orbited.
export function fitNarrow(stage, view) {
  let done = false;
  return () => {
    const narrow = stage.host.clientWidth < 560;
    if (narrow && !done && !stage.moved && !document.body.classList.contains('gb-reel')) { stage.setView(view.pos, view.target, 0.01); done = true; }
    return narrow;
  };
}
// On phones keep only the readout's headline and two rows.
export function compactReadout(stage, api) {
  const full = api.readout;
  if (!full) return api;
  api.readout = (s) => {
    const html = full(s);
    if (stage.host.clientWidth >= 560 || !html) return html;
    let rows = 0;
    return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++rows <= 2 ? m : ''));
  };
  return api;
}

// Breathing: quiet breathing is about 12–20 breaths a minute of ~0.5 L (NHLBI; Guyton & Hall),
// so about 6–8 L/min on average and a peak of roughly 15–20 L/min while breathing in.
// A natural sniff lasts about 0.4 s with peak flows around 30 L/min (Laing, Perception 12:99, 1983).
// Air speed at the nasal valve: flow ÷ area, with a minimum cross-section of about 0.7 cm²
// per side (acoustic rhinometry; Hilberg, Allergy 57 Suppl 70:5, 2002).
export const VALVE_AREA = 0.7;              // cm² per side
export const airSpeed = (Lmin, sides = 2) => (Lmin * 1000 / 60) / (VALVE_AREA * sides) / 100;   // m/s
