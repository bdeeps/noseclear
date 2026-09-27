// Chapter 3: smell receptors, zoomed in to the olfactory epithelium (about a thousand times).
// Shown the right way up: the smell patch lines the ROOF of the nose, so the air is below, the
// mucus hangs underneath, the neurons point their cilia down into it, and their axons run up
// through the cribriform plate to the brain.
// Sources:
//  - Buck & Axel, Cell 65:175 (1991): the odorant receptor gene family; Nobel Prize 2004.
//  - About 400 intact olfactory receptor genes in humans (≈390 with open reading frames, a
//    similar number of pseudogenes): Malnic, Godfrey & Buck, PNAS 101:2584 (2004);
//    Niimura & Nei, PNAS 100:12235 (2003). Each neuron expresses one receptor gene.
//  - Combinatorial code: Malnic, Hirono, Sato & Buck, Cell 96:713 (1999).
//  - Number of olfactory sensory neurons: estimates range from about 6 million to 20 million
//    (e.g. Moran et al., J Neurocytol 11:721, 1982; textbook figures vary).
//  - Neurons are replaced from basal stem cells throughout life, roughly every one to two
//    months in animal studies (Graziadei & Monti Graziadei, 1979; Schwob, Anat Rec 269:33, 2002).
//  - Carvone mirror forms: (R)-(−)-carvone smells of spearmint, (S)-(+)-carvone of caraway
//    (Russell & Hills, Science 172:1043, 1971; Leitereg et al., Nature 230:455, 1971).
import { THREE, M, canvasTexture, clamp, lerp } from '../kit.js';
import { ODOURS, RTYPES, active, molecule, tint, fitNarrow, compactReadout } from '../nose.js';

const Y = { air: 0.4, mucusTop: 0.5, mucusBot: 1.6, cellTop: 1.6, soma: 3.2, basal: 4.7, plate: 5.5, top: 7.6 };
const NN = 16;

function drawBars(g, w, h, st) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
  const od = ODOURS[st.odour], act = active(od, st.conc);
  g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText(`${od.name}: its receptor “barcode”`, 30, 44);
  g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('8 of about 400 receptor types shown · pattern illustrative', 30, 74);
  const L = 40, R = w - 30, top = 100, bot = h - 60, bw = (R - L) / 8;
  act.forEach((a, i) => {
    const x = L + i * bw + 8, c = '#' + RTYPES[i].toString(16).padStart(6, '0');
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, top, bw - 16, bot - top);
    const f = clamp(a + st.flash[i] * 0.25, 0, 1);
    g.fillStyle = c; g.globalAlpha = 0.25 + 0.75 * (a > 0 ? 1 : 0); g.fillRect(x, bot - f * (bot - top), bw - 16, f * (bot - top)); g.globalAlpha = 1;
    g.fillStyle = a > 0 ? c : 'rgba(255,255,255,.35)'; g.font = 'bold 22px sans-serif'; g.fillText(a > 0 ? 'ON' : 'off', x + (bw - 16) / 2 - 16, bot + 32);
  });
}

export default {
  id: 'receptors',
  short: 'Smell receptors',
  title: 'Locks, keys and barcodes',
  subtitle: 'About 400 kinds of receptor, and every smell lights up its own combination.',
  view: { pos: [4.4, 9.2, 19.5], target: [3.6, 6.6, 0] },
  learn: `<p>Zoom into the smell patch about a thousand times. It hangs from the roof of your nose, so air is <i>below</i> it. A thin layer of <b>mucus</b> covers it, and millions of <b>olfactory sensory neurons</b> poke tiny hairs, <b>cilia</b>, down into that mucus.</p>
    <p>A smell is a cloud of molecules light enough to float in air. They drift up, dissolve in the mucus and bump into the cilia. The cilia carry <b>receptors</b>: proteins shaped to grab only certain molecules. When one grabs a molecule, its neuron fires an electrical signal up its <b>axon</b>, through the holes in the cribriform plate, to the brain.</p>
    <p>In 1991 <b>Linda Buck</b> and <b>Richard Axel</b> found the genes for these receptors. Humans have about <b>400</b> working kinds, and each neuron uses just one kind. But you can tell apart far more than 400 smells, because each molecule fits several receptor types, strongly or weakly. The smell is the <b>combination</b> that fires, like a barcode. Change the strength of a smell and the barcode changes too, which is why some smells seem different when faint.</p>
    <p>Shape matters. <b>Carvone</b> comes in two forms that are mirror images of each other, like your left and right hands. One smells of <b>spearmint</b>; its mirror twin smells of <b>caraway</b>. Same atoms, different fit, different barcode.</p>
    <p class="tip"><b>Try it:</b> switch between Spearmint and Caraway and compare their barcodes, then turn the strength down to see which receptors drop out first.</p>`,
  terms: [
    { t: 'Olfactory sensory neuron', d: 'A nerve cell in the smell patch that detects odour molecules and signals the brain.' },
    { t: 'Odorant receptor', d: 'A protein on a smell neuron’s cilia that grabs certain molecules. Humans have about 400 kinds.' },
    { t: 'Combinatorial code', d: 'The idea that each smell is recognised by the combination of receptor types it activates.' },
    { t: 'Enantiomers', d: 'Two forms of a molecule that are mirror images of each other, like left and right hands.' },
    { t: 'Basal cells', d: 'Stem cells at the base of the smell patch that make new smell neurons throughout life.' },
  ],
  defaults: { odour: 'spearmint', conc: 0.6, speed: 1 },
  controls: [
    { key: 'odour', type: 'seg', label: 'Smell', options: Object.entries(ODOURS).map(([v, o]) => ({ v, label: o.name })) },
    { key: 'conc', type: 'range', label: 'Strength of the smell', min: 0.05, max: 1, step: 0.01, ends: ['faint', 'strong'], fmt: (v) => (v < 0.25 ? 'faint' : v < 0.65 ? 'medium' : 'strong') },
    { key: 'speed', type: 'range', label: 'Speed', min: 0.2, max: 2, step: 0.05, fmt: (v) => v.toFixed(1) + '×' },
  ],
  quiz: [
    { q: 'About how many kinds of working smell receptor do humans have?', options: ['5, like taste', 'About 400', 'About 1 trillion', 'Exactly one per smell'], answer: 1, why: 'Buck and Axel’s gene family gives humans about 400 working receptor types (mice have over 1,000).' },
    { q: 'How can 400 receptor types tell apart many thousands of smells?', options: ['Each receptor detects one smell', 'Each smell activates its own combination of receptors', 'The brain guesses', 'The nose uses colour'], answer: 1, why: 'A molecule fits several receptor types to different degrees, and the combination acts like a barcode.' },
    { q: 'Spearmint and caraway both contain carvone. Why do they smell different?', options: ['Different atoms', 'The two carvones are mirror images, so they fit receptors differently', 'Caraway is warmer', 'Spearmint has more water'], answer: 1, why: 'The two mirror forms have the same atoms but different 3D shapes, so they activate different receptor combinations.' },
  ],
  reel: [
    { ms: 5000, caption: 'Smell molecules drift up into the mucus and fit receptors on tiny hairs. Each fit fires a neuron.', set: { odour: 'banana', conc: 0.7, speed: 1 }, view: { pos: [4.0, 7.4, 20], target: [3.4, 5.4, 0] }, spin: 0.15 },
    { ms: 5400, caption: 'Spearmint and caraway are mirror-image molecules. Your nose reads them as different barcodes.', set: { odour: 'spearmint', conc: 0.7, speed: 1 }, act: (s, inst) => inst.twins?.(), spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(0, 2.2, 0); stage.root.add(root);
    // Layers
    const W = 12, D = 4;
    const mucus = new THREE.Mesh(new THREE.BoxGeometry(W, Y.mucusBot - Y.mucusTop, D), M.clear(0x9fd8ff, 0.2)); mucus.position.y = (Y.mucusTop + Y.mucusBot) / 2; root.add(mucus);
    const sup = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.26, 0.3, Y.basal - Y.cellTop, 10), new THREE.MeshStandardMaterial({ color: 0xf3d9c8, transparent: true, opacity: 0.22, depthWrite: false }), 70);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 70; i++) { m4.makeTranslation(-W / 2 + 0.4 + (i % 14) * 0.86 + (Math.floor(i / 14) % 2) * 0.4, (Y.cellTop + Y.basal) / 2, -D / 2 + 0.4 + Math.floor(i / 14) * 0.8); sup.setMatrixAt(i, m4); }
    root.add(sup);
    const basal = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 8), M.plastic(0xc8a2ff), 24);
    for (let i = 0; i < 24; i++) { m4.makeTranslation(-W / 2 + 0.5 + (i % 12) * 0.95, Y.basal + 0.05, i < 12 ? -0.9 : 0.9); basal.setMatrixAt(i, m4); }
    root.add(basal);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, D), M.matte(0xefe4cc, { transparent: true, opacity: 0.85 })); plate.position.y = Y.plate; root.add(plate);

    // Neurons
    const rnd = (i) => { const x = Math.sin(i * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };
    const neurons = [];
    for (let i = 0; i < NN; i++) {
      const type = [0, 3, 6, 1, 4, 7, 2, 5, 1, 6, 3, 0, 5, 2, 7, 4][i];
      const x = -W / 2 + 0.9 + (i % 8) * 1.45 + (rnd(i) - 0.5) * 0.4, z = i < 8 ? -0.75 : 0.75, ys = Y.soma + (rnd(i + 5) - 0.5) * 0.8;
      const col = RTYPES[type];
      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 0.15, roughness: 0.4 });
      const g = new THREE.Group(); root.add(g);
      const soma = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), mat); soma.position.set(x, ys, z); g.add(soma);
      const dend = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ys - Y.cellTop + 0.1, 8), mat); dend.position.set(x, (ys + Y.cellTop - 0.1) / 2, z); g.add(dend);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), mat); knob.position.set(x, Y.cellTop - 0.12, z); g.add(knob);
      const cilia = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rnd(i * 7 + k), r = 0.7 + rnd(i + k) * 0.35;
        const end = new THREE.Vector3(x + Math.cos(a) * r, Y.mucusTop + 0.35 + rnd(i * 3 + k) * 0.3, z + Math.sin(a) * r * 0.7);
        const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(knob.position.clone(), new THREE.Vector3(x + Math.cos(a) * r * 0.4, Y.mucusBot - 0.5, z + Math.sin(a) * r * 0.3), end), 10, 0.022, 5), mat);
        g.add(c); cilia.push(end);
      }
      const axon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, Y.top - ys, 8), mat); axon.position.set(x, (Y.top + ys) / 2, z); g.add(axon);
      const spike = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), M.glow(0xffffff)); spike.visible = false; g.add(spike);
      neurons.push({ type, x, z, ys, mat, soma, cilia, spike, fire: 0, spikeT: -1 });
    }
    const L = (html, pos, cls) => tint(stage.label(html, pos, root), cls);
    const labs = [
      L('Air in the nose', [-4.6, -1.3, 1.6], 'air'),
      L('Mucus', [-6.6, 1.05, 1.8], 'air'),
      L('Cilia with receptors', [3.2, -0.2, 2.0], 'gold'),
      L('Smell neuron', [6.0, 2.7, 2.0], 'gold'),
      L('Supporting cells', [-6.3, 2.6, 2.0], 'skin'),
      L('Stem (basal) cells', [-3.0, 4.75, 2.0], 'pink'),
      L('Cribriform plate', [2.5, Y.plate + 0.1, 2.0], 'bone'),
      L('Axons up to the olfactory bulb', [6.6, Y.top - 0.3, 0], 'gold'),
    ];

    // Molecules
    const MN = 22, mols = [];
    let molId = null;
    const makeMols = (id) => {
      mols.forEach((m) => { root.remove(m.obj); m.obj.traverse((o) => { o.geometry?.dispose(); }); });
      mols.length = 0; molId = id;
      for (let i = 0; i < MN; i++) { const obj = molecule(id, 0.22); root.add(obj); mols.push({ obj, p: new THREE.Vector3(), v: new THREE.Vector3(), state: 'drift', t: 0, n: null, seed: i }); spawn(mols[i], true); }
    };
    const spawn = (m, anywhere = false) => {
      m.p.set((Math.random() - 0.5) * (W - 1), anywhere ? -2 + Math.random() * 3.2 : -2.2, (Math.random() - 0.5) * (D - 1));
      m.v.set(0, 0.6 + Math.random() * 0.5, 0); m.state = 'drift'; m.t = 0; m.n = null; m.obj.visible = true;
      m.obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    };

    // Big display molecule (and its mirror twin for carvone).
    const show = new THREE.Group(); show.position.set(10.2, 1.4, 0); root.add(show);
    let showId = null, twinsOn = 0;
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 2.8), M.ghost(0xcfe8ff, 0.5)); mirror.rotation.y = Math.PI / 2;
    const showLab = L('', [10.2, -0.6, 0], 'gold');
    const buildShow = (id) => {
      [...show.children].forEach((c) => show.remove(c));
      const isC = id === 'spearmint' || id === 'caraway';
      const a = molecule(id, 0.6); show.add(a);
      if (isC) {
        const b = molecule(id === 'spearmint' ? 'caraway' : 'spearmint', 0.6);
        a.position.x = -1.6; b.position.x = 1.6; show.add(b); show.add(mirror); mirror.position.set(0, 0, 0);
        mirror.geometry.dispose(); mirror.geometry = new THREE.PlaneGeometry(2.6, 2.8);
      }
      showId = id;
      const od = ODOURS[id];
      showLab.element.innerHTML = isC ? `<b>${od.mol}</b> and its mirror twin` : `<b>${od.mol}</b> · ${od.formula}`;
    };

    // Board
    const st = { odour: 'spearmint', conc: 0.6, flash: new Array(8).fill(0) };
    const chart = canvasTexture(900, 420, (g, w, h) => drawBars(g, w, h, st));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.0), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(10.2, 5.4, 0); root.add(board);

    const fit = fitNarrow(stage, { pos: [3.8, 7.4, 19], target: [3.6, 5.6, 0] });
    let acc = 0, fired = 0, rate = 0, spin = 0;
    const tmp = new THREE.Vector3();
    return compactReadout(stage, {
      twins() { twinsOn = 1; },
      update(dt, s) {
        dt = Math.max(0, dt) * s.speed;
        const narrow = fit();
        labs.forEach((l) => { l.visible = !narrow; });
        if (s.odour !== molId) makeMols(s.odour);
        if (s.odour !== showId) buildShow(s.odour);
        spin += dt * 0.6; show.children.forEach((c) => { if (c !== mirror) c.rotation.y = c.position.x > 0 ? -spin : spin; });
        const od = ODOURS[s.odour], act = active(od, s.conc);
        st.odour = s.odour; st.conc = s.conc;
        // Molecules: fewer of them when the smell is faint.
        const nActive = Math.round(6 + 16 * s.conc);
        mols.forEach((m, i) => {
          if (i >= nActive) { m.obj.visible = false; return; }
          if (!m.obj.visible && m.state === 'drift') spawn(m);
          m.t += dt;
          if (m.state === 'drift') {
            // Brownian drift upwards; slower once in the mucus.
            const inMucus = m.p.y > Y.mucusTop;
            const vy = inMucus ? 0.35 : m.v.y;
            m.p.x += (Math.sin(m.t * 3.1 + m.seed) * 0.5) * dt; m.p.z += Math.cos(m.t * 2.3 + m.seed) * 0.3 * dt; m.p.y += vy * dt;
            m.obj.rotation.x += dt * 1.3; m.obj.rotation.y += dt * 0.9;
            if (inMucus && m.p.y > Y.mucusTop + 0.25) {
              // Nearest neuron whose receptor responds: bind with a probability set by the fit.
              let best = null, bd = 1.4;
              for (const n of neurons) { const d = Math.hypot(n.x - m.p.x, n.z - m.p.z); if (d < bd && act[n.type] > 0) { bd = d; best = n; } }
              if (best && Math.random() < act[best.type] * 0.6) { m.state = 'bind'; m.n = best; m.t = 0; m.from = m.p.clone(); m.to = best.cilia[m.seed % best.cilia.length]; }
            }
            if (m.p.y > Y.mucusBot - 0.15) { m.obj.visible = false; spawn(m); }
          } else if (m.state === 'bind') {
            const k = clamp(m.t / 0.35, 0, 1);
            m.p.lerpVectors(m.from, m.to, k);
            if (m.t > 0.35 && m.n.spikeT < 0) { m.n.fire = 1; m.n.spikeT = 0; fired++; st.flash[m.n.type] = 1; }
            if (m.t > 1.1) { m.obj.visible = false; spawn(m); }
          }
          m.obj.position.copy(m.p);
        });
        // Neurons light up and send a spike up the axon.
        neurons.forEach((n) => {
          n.fire = Math.max(0, n.fire - dt * 2.2);
          n.mat.emissiveIntensity = 0.15 + 1.6 * n.fire;
          n.soma.scale.setScalar(1 + 0.25 * n.fire);
          if (n.spikeT >= 0) {
            n.spikeT += dt; const k = n.spikeT / 0.6;
            n.spike.visible = k < 1; n.spike.position.set(n.x, lerp(n.ys, Y.top, k), n.z);
            if (k >= 1) n.spikeT = -1;
          }
        });
        st.flash = st.flash.map((f) => Math.max(0, f - dt * 2));
        acc += dt; if (acc > 0.1) { rate = lerp(rate, fired / acc, 0.3); fired = 0; acc = 0; chart.redraw(); }
      },
      readout: (s) => {
        const od = ODOURS[s.odour], n = active(od, s.conc).filter((a) => a > 0).length;
        return `<div class="big">${od.name}</div>
          <div class="row"><span>Molecule</span><b>${od.mol}, ${od.formula}</b></div>
          <div class="row"><span>Receptor types firing (of 8 shown)</span><b>${n}</b></div>
          <div class="row"><span>Receptor types in a human nose</span><b>about 400</b></div>
          <div class="row"><span>Smell neurons</span><b>millions</b></div>
          <small>${od.note[0].toUpperCase() + od.note.slice(1)}. The barcode is illustrative: for most smells, which of our 400 receptors respond is still unknown.</small>`;
      },
    });
  },
};
