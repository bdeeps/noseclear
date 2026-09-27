// Chapter 4: from nose to brain. Neurons that carry the same receptor type, wherever they sit
// in the smell patch, send their axons to the same few glomeruli in the olfactory bulb. Mitral
// cells carry the signal along the olfactory tract straight to the piriform (smell) cortex, the
// amygdala (emotion) and the entorhinal cortex, the gateway to the hippocampus (memory).
// Sources:
//  - Convergence onto glomeruli: Mombaerts et al., Cell 87:675 (1996); Buck & Axel Nobel
//    lectures (2004).
//  - Human bulb: more than 5,500 glomeruli on average, about 16 per receptor type; mice about
//    1,100 receptor types and a ratio near 2:1 (Maresh, Gil, Whitman & Greer, PLoS One 3:e2640,
//    2008). Counts vary a lot between people and fall with age.
//  - Pathways: Purves et al., Neuroscience (6th ed.), ch. 15; Gottfried, Nat Rev Neurosci
//    11:628 (2010). Unlike the other senses, the first stop in the cortex is reached without a
//    relay in the thalamus; a later route does pass through the mediodorsal thalamus to the
//    orbitofrontal cortex (Courtiol & Wilson, Front Neural Circuits 9:49, 2015).
//  - Smell and autobiographical memory: Herz & Schooler, Am J Psychol 115:21 (2002); the
//    "Proust effect" after the madeleine scene in Swann's Way (1913).
import { THREE, M, tube, canvasTexture, clamp, lerp } from '../kit.js';
import { ODOURS, RTYPES, active, pathOf, smoothPts, tint, fitNarrow, compactReadout } from '../nose.js';

const REG = {
  piriform: { name: 'Piriform cortex', job: 'names the smell', pos: [2.3, -1.45, 2.7], col: 0xff9a4a, r: [0.75, 0.38, 0.4] },
  amygdala: { name: 'Amygdala', job: 'feelings', pos: [1.05, -1.25, 3.05], col: 0xff5a6a, r: [0.45, 0.42, 0.42] },
  entorhinal: { name: 'Entorhinal cortex', job: 'gateway to memory', pos: [-0.1, -1.85, 3.2], col: 0x7a8cff, r: [0.6, 0.3, 0.35] },
  ofc: { name: 'Orbitofrontal cortex', job: 'flavour, liking, choosing', pos: [5.1, -0.35, 2.0], col: 0xffd166, r: [1.3, 0.3, 1.1] },
  thalamus: { name: 'Thalamus', job: 'relay hub for other senses', pos: [-1.0, 1.7, 0.8], col: 0x5ce1a9, r: [1.1, 0.7, 0.8] },
};
const HIPPO = [[-0.5, -1.55, 3.1], [-1.8, -1.2, 3.0], [-3.0, -0.5, 2.7], [-3.9, 0.5, 2.2]];
const BULB = new THREE.Vector3(6.25, -2.15, 0.7);

function drawMap(g, w, h, st) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
  const od = ODOURS[st.odour], act = active(od, 0.7);
  g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText(`${od.name}: its map in the bulb`, 28, 44);
  g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('Each dot is a glomerulus. Same receptor type → same spot.', 28, 74);
  const cols = 8, rows = 2, L = 60, top = 110, cw = (w - 2 * L) / cols, rh = (h - top - 40) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r ? 7 - c : c, a = act[i], x = L + c * cw + cw / 2, y = top + r * rh + rh / 2;
    const col = '#' + RTYPES[i].toString(16).padStart(6, '0');
    g.globalAlpha = a > 0 ? 1 : 0.18; g.fillStyle = col;
    g.beginPath(); g.arc(x, y, 26 + (a > 0 ? 8 * st.pulse : 0), 0, 7); g.fill();
    g.globalAlpha = 1;
  }
  g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '18px sans-serif'; g.fillText('front of bulb', L, h - 12); g.fillText('back', w - L - 40, h - 12);
}

export default {
  id: 'bulb',
  short: 'Nose to brain',
  title: 'From nose to brain',
  subtitle: 'Why a smell can bring back a memory before you even know what it is.',
  view: { pos: [1.6, 7.9, 18.5], target: [0.8, 6.9, 0] },
  learn: `<p>The smell neurons for one receptor type are scattered all over the smell patch. Yet their axons all find their way to the same one or two tiny knots in the <b>olfactory bulb</b>, called <b>glomeruli</b>. So each smell’s barcode becomes a <b>map</b> of lit-up spots on the bulb. In mice each receptor type has about two glomeruli; human bulbs have more than 5,500 glomeruli, roughly 16 per type, and the numbers vary a lot from person to person.</p>
    <p>From the bulb, <b>mitral cells</b> carry the signal along the <b>olfactory tract</b> to the <b>piriform cortex</b>, which helps work out what the smell is, and, just as directly, to the <b>amygdala</b>, a centre for feelings, and the <b>entorhinal cortex</b>, the doorway to the <b>hippocampus</b>, where memories are made. You can explore these parts in <a href="/brainclear/">BrainClear</a>.</p>
    <p>Every other sense stops first at a relay station deep in the brain, the <b>thalamus</b>, before reaching the thinking cortex. Smell’s first stop in the cortex skips it (a second route does loop through the thalamus later, on the way to the <b>orbitofrontal cortex</b> behind your eyes). That short, direct wiring into the brain’s feeling and memory centres is one reason a whiff of rain, jasmine or a grandmother’s cooking can bring back a whole scene, full of feeling. Writers call it the <b>Proust effect</b>, after a novel in which the taste and smell of a cake dipped in tea unlocks a childhood memory.</p>
    <p class="tip"><b>Try it:</b> switch between smells and watch a different map light up on the bulb. Then turn on “A smell you know” to see the memory and feeling centres join in.</p>`,
  terms: [
    { t: 'Glomerulus', d: 'A tiny ball-shaped knot in the olfactory bulb where axons of one receptor type meet the next nerve cells. Plural: glomeruli.' },
    { t: 'Mitral cell', d: 'The main nerve cell of the olfactory bulb. It carries smell signals on to the brain.' },
    { t: 'Piriform cortex', d: 'The main smell area of the cortex, which helps recognise what a smell is.' },
    { t: 'Amygdala', d: 'An almond-shaped brain area involved in emotions such as fear and pleasure.' },
    { t: 'Hippocampus', d: 'A curved brain structure that helps form and recall memories of events and places.' },
    { t: 'Thalamus', d: 'The brain’s relay hub: signals from every other sense pass through it on their way to the cortex.' },
  ],
  defaults: { odour: 'rose', memory: false, thalamus: true, labels: true },
  controls: [
    { key: 'odour', type: 'seg', label: 'Smell', options: ['banana', 'rose', 'spearmint', 'gas'].map((v) => ({ v, label: ODOURS[v].name })) },
    { key: 'memory', type: 'toggle', label: 'A smell you know (memory and feeling)' },
    { key: 'thalamus', type: 'toggle', label: 'Show the later route through the thalamus' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Where do axons from neurons with the same receptor type end up?', options: ['Spread all over the brain', 'In the same glomeruli in the olfactory bulb', 'In the thalamus', 'Back in the nose'], answer: 1, why: 'They converge on the same few glomeruli, turning the barcode into a map on the bulb.' },
    { q: 'What is special about how smell reaches the cortex?', options: ['It goes through the ears first', 'Its first stop in the cortex skips the thalamus relay the other senses use', 'It is the slowest sense', 'It only uses the right side of the brain'], answer: 1, why: 'Bulb signals go straight to the piriform cortex, amygdala and entorhinal cortex.' },
    { q: 'Why can smells trigger strong memories and feelings?', options: ['Smells are stored in the nose', 'The smell pathway links directly to the amygdala and the hippocampus system', 'Smell is the loudest sense', 'They can’t'], answer: 1, why: 'The olfactory tract feeds the amygdala (feelings) and the entorhinal cortex, the gateway to the hippocampus (memory).' },
  ],
  reel: [
    { ms: 5600, caption: 'Smell takes a short cut: straight from the bulb to the brain’s centres for feeling and memory.', set: { odour: 'rose', memory: true, thalamus: false, labels: false }, view: { pos: [2.2, 6.6, 18.5], target: [1.4, 5.7, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(0, 7.5, 0); stage.root.add(root);
    // Ghost brain (patient's left hemisphere towards you, face to the right).
    const ghost = (col, o) => new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: o, depthWrite: false, roughness: 0.6 });
    const blob = (p, r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), mat); m.scale.set(...r); m.position.set(...p); root.add(m); return m; };
    blob([0, 3.2, 0], [8.2, 5.2, 6.2], ghost(0xf1b4c4, 0.07));
    blob([1.0, -0.6, 3.1], [4.6, 2.1, 2.6], ghost(0xf1b4c4, 0.07));
    blob([-6.1, -1.7, 0], [2.7, 1.7, 4.0], ghost(0xd9a0b8, 0.12));
    const stem = tube([[-2.8, -0.2, 0], [-3.1, -3, 0], [-3.4, -6, 0]], 1.0, ghost(0xd9a0b8, 0.12), false, 30); root.add(stem);
    // Nose below: the smell patch and the cribriform plate.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 2.2), M.matte(0xefe4cc, { transparent: true, opacity: 0.8 })); plate.position.set(6.4, -2.85, 0.7); root.add(plate);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 2.0), new THREE.MeshStandardMaterial({ color: 0xe8c25a, emissive: 0xe8c25a, emissiveIntensity: 0.3 })); patch.position.set(6.4, -3.6, 0.7); root.add(patch);
    // Bulb (shown about twice life size) with 16 glomeruli: 2 per receptor type.
    const bulbMat = new THREE.MeshPhysicalMaterial({ color: 0xffd166, transparent: true, opacity: 0.35, roughness: 0.4, depthWrite: false });
    const bulb = blob(BULB.toArray(), [1.5, 0.5, 0.55], bulbMat);
    const tract = tube([[5.0, -2.05, 0.8], [3.8, -1.8, 1.4], [2.9, -1.55, 2.2]], 0.16, bulbMat, false, 30); root.add(tract);
    const glom = [];
    for (let i = 0; i < 16; i++) {
      const type = i % 8, row = i < 8 ? 1 : -1;
      const x = BULB.x - 1.15 + (i % 8) * 0.33, p = new THREE.Vector3(x, BULB.y - 0.12 + row * 0.05, BULB.z + row * 0.3);
      const mat = new THREE.MeshStandardMaterial({ color: RTYPES[type], emissive: new THREE.Color(RTYPES[type]), emissiveIntensity: 0.1 });
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mat); m.position.copy(p); root.add(m);
      glom.push({ type, p, mat, m, lit: 0 });
    }
    // Smell neurons scattered in the patch, each wired to a glomerulus of its own type.
    const rnd = (i) => { const x = Math.sin(i * 51.3 + 7.1) * 43758.5453; return x - Math.floor(x); };
    const neurons = [], axonPaths = [];
    for (let i = 0; i < 24; i++) {
      const type = [2, 5, 0, 7, 3, 1, 6, 4][i % 8];
      const p = new THREE.Vector3(5.0 + rnd(i) * 2.8, -3.52, 0.0 + rnd(i + 3) * 1.4);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: RTYPES[type], emissive: new THREE.Color(RTYPES[type]), emissiveIntensity: 0.3 })); m.position.copy(p); root.add(m);
      const target = glom.filter((gl) => gl.type === type).sort((a, b) => a.p.distanceTo(p) - b.p.distanceTo(p))[0];
      const pts = [p, new THREE.Vector3(p.x, -2.85, p.z), new THREE.Vector3((p.x + target.p.x) / 2, -2.5, (p.z + target.p.z) / 2), target.p];
      const ax = tube(pts, 0.018, new THREE.MeshBasicMaterial({ color: RTYPES[type], transparent: true, opacity: 0.55 }), false, 24); root.add(ax);
      neurons.push({ type, m, ax }); axonPaths.push({ type, path: pathOf(smoothPts(pts, 30)) });
    }
    // Brain regions.
    const regions = {};
    for (const [k, r] of Object.entries(REG)) {
      const mat = new THREE.MeshStandardMaterial({ color: r.col, emissive: new THREE.Color(r.col), emissiveIntensity: 0.1, transparent: true, opacity: 0.85 });
      regions[k] = { mat, m: blob(r.pos, r.r, mat), glow: 0 };
    }
    const hipMat = new THREE.MeshStandardMaterial({ color: 0xc49bff, emissive: new THREE.Color(0xc49bff), emissiveIntensity: 0.1, transparent: true, opacity: 0.85 });
    root.add(tube(HIPPO, 0.28, hipMat, false, 40));
    regions.hippocampus = { mat: hipMat, glow: 0 };
    // Routes for the signal.
    const V = (a) => new THREE.Vector3(...a);
    const R = (pts) => pathOf(smoothPts(pts.map((p) => (p.isVector3 ? p : V(p))), 40));
    const routes = {
      tractP: R([[5.0, -2.05, 0.8], [3.8, -1.8, 1.4], REG.piriform.pos]),
      tractA: R([[5.0, -2.05, 0.8], [3.6, -1.7, 1.8], [2.4, -1.5, 2.6], REG.amygdala.pos]),
      tractE: R([[5.0, -2.05, 0.8], [3.4, -2.0, 2.0], [1.6, -1.95, 3.0], REG.entorhinal.pos]),
      toHip: R([REG.entorhinal.pos, ...HIPPO]),
      toOfc: R([REG.piriform.pos, [3.6, -0.9, 2.3], REG.ofc.pos]),
      viaThal: R([REG.piriform.pos, [0.8, 0.2, 1.8], REG.thalamus.pos, [2.5, 0.9, 1.6], REG.ofc.pos]),
    };
    const thalLine = tube(routes.viaThal.points, 0.035, new THREE.MeshBasicMaterial({ color: 0x5ce1a9, transparent: true, opacity: 0.45 }), false, 60); root.add(thalLine);
    const P = 60, pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), P);
    pulses.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pulses.frustumCulled = false; root.add(pulses);

    // Labels
    const L = (html, pos, cls) => tint(stage.label(html, pos, root), cls);
    const labs = [
      L('Smell patch in the nose', [8.9, -3.7, 0.7], 'gold'),
      L('Olfactory bulb<br><small>glomeruli, shown enlarged</small>', [8.4, -1.4, 0.7], 'gold'),
      L('Olfactory tract', [4.0, -1.1, 1.4], 'gold'),
      ...Object.entries(REG).map(([k, r]) => L(`${r.name}<br><small>${r.job}</small>`, [r.pos[0] + (k === 'thalamus' ? 0 : 0), r.pos[1] + (k === 'ofc' ? 0.8 : k === 'thalamus' ? -1.05 : k === 'piriform' ? -1.0 : k === 'amygdala' ? 0.95 : -0.95), r.pos[2]], k === 'thalamus' ? 'green' : k === 'ofc' ? 'gold' : k === 'amygdala' ? 'pink' : k === 'entorhinal' ? 'cold' : 'warm')),
      L('Hippocampus<br><small>memories</small>', [-4.6, -0.5, 2.2], 'pink'),
      L('Brain, seen from the left side', [-6.4, -4.4, 1.0], 'side'),
    ];
    const memL = L('', [-4.2, -2.6, 3.2], 'pink');

    // Board
    const st = { odour: 'rose', pulse: 0 };
    const chart = canvasTexture(900, 380, (g, w, h) => drawMap(g, w, h, st));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.62), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(2.6, -5.3, 3.2); root.add(board);

    const fit = fitNarrow(stage, { pos: [2.2, 6.8, 17.5], target: [1.8, 5.9, 0] });
    let t = 0, acc = 0;
    const o = new THREE.Object3D(), p = new THREE.Vector3();
    const CYCLE = 3.2;
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fit();
        labs.forEach((l) => { l.visible = s.labels && !narrow; });
        const act = active(ODOURS[s.odour], 0.7);
        st.odour = s.odour;
        const c = t % CYCLE;
        // Which pulses exist this moment: [route, start, duration].
        let n = 0;
        const put = (path, k) => { if (n >= P || k < 0 || k > 1) return; path.at(k, p); o.position.copy(p); o.scale.setScalar(1); o.updateMatrix(); pulses.setMatrixAt(n++, o.matrix); };
        axonPaths.forEach((a) => { if (act[a.type] > 0) put(a.path, c / 0.7); });
        const main = [['tractP', 0.7], ['tractA', 0.7], ['tractE', 0.7], ['toOfc', 1.4]];
        if (s.memory) main.push(['toHip', 1.4]);
        if (s.thalamus) main.push(['viaThal', 1.4]);
        main.forEach(([k, t0]) => { for (let j = 0; j < 3; j++) put(routes[k], (c - t0 - j * 0.1) / 0.8); });
        for (let i = n; i < P; i++) { o.scale.setScalar(0.0001); o.updateMatrix(); pulses.setMatrixAt(i, o.matrix); }
        pulses.instanceMatrix.needsUpdate = true;
        // Glow when signals arrive.
        const arrive = (t1) => Math.max(0, 1 - Math.abs(c - t1) / 0.5);
        glom.forEach((gl) => { gl.lit = act[gl.type] > 0 ? 0.4 + 1.6 * arrive(0.75) : 0; gl.mat.emissiveIntensity = 0.08 + gl.lit; gl.m.scale.setScalar(act[gl.type] > 0 ? 1.25 : 0.8); });
        neurons.forEach((nn) => { nn.ax.material.opacity = act[nn.type] > 0 ? 0.85 : 0.12; });
        const mem = s.memory ? 1 : 0.25;
        regions.piriform.glow = arrive(1.5); regions.amygdala.glow = arrive(1.5) * mem * 1.6; regions.entorhinal.glow = arrive(1.5) * mem;
        regions.hippocampus.glow = s.memory ? arrive(2.2) * 1.6 : 0; regions.ofc.glow = arrive(2.2); regions.thalamus.glow = s.thalamus ? arrive(1.8) : 0;
        Object.values(regions).forEach((r) => { r.mat.emissiveIntensity = 0.1 + 1.4 * r.glow; });
        thalLine.visible = s.thalamus;
        memL.visible = s.memory && !narrow;
        memL.element.innerHTML = '<b>“I know that smell…”</b><br><small>feeling and memory join in</small>';
        st.pulse = arrive(0.75);
        acc += dt; if (acc > 0.1) { acc = 0; chart.redraw(); }
      },
      readout: (s) => {
        const od = ODOURS[s.odour], k = active(od, 0.7).filter((a) => a > 0).length;
        return `<div class="big">${od.name}: ${k * 2} of 16 glomeruli lit</div>
          <div class="row"><span>Human bulb (each side)</span><b>5,500+ glomeruli</b></div>
          <div class="row"><span>Glomeruli per receptor type</span><b>about 16 (mice: about 2)</b></div>
          <div class="row"><span>First stop in the cortex</span><b>piriform cortex, no thalamus relay</b></div>
          <small>${s.memory ? 'A familiar smell stirs the amygdala (feeling) and the hippocampus (memory) as well as the smell cortex.' : 'Neurons of one type (one colour) are scattered, but their wires all meet at the same spot.'}</small>`;
      },
    });
  },
};
