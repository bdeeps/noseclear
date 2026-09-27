// Chapter 5: flavour = taste + smell (+ touch and temperature). When you chew and breathe
// out, aroma molecules from the food rise from the back of the mouth, up the nasopharynx to
// the smell patch: retronasal smell. Pinch your nose and the air stops moving, so the aroma
// never arrives and most "taste" disappears. Chilli heat (capsaicin, TRPV1) and mint cool
// (menthol, TRPM8) come through the trigeminal nerve, not taste or smell.
// Sources:
//  - Rozin, "Taste–smell confusions" and the concept of olfaction as a dual sense, Perception &
//    Psychophysics 31:397 (1982); Small et al., Neuron 47:593 (2005).
//  - The often quoted "80% of flavour is smell" has no solid measurement behind it; the point
//    that most food identification needs smell is well supported (e.g. Mozell et al., Arch
//    Otolaryngol 90:367, 1969: identification of foods dropped sharply with the nose blocked).
//  - Capsaicin receptor TRPV1: Caterina et al., Nature 389:816 (1997); menthol receptor TRPM8:
//    McKemy, Neuhausser & Julius, Nature 416:52 (2002) (Nobel Prize 2021, Julius).
//  - Adaptation: perceived intensity of a steady odour falls within minutes and recovers after
//    a break (Dalton, Chem Senses 25:487, 2000). The curve used here is illustrative.
// Food "profiles" below are illustrative, not measurements.
import { THREE, M, canvasTexture, clamp, lerp } from '../kit.js';
import { makeNose, tint, fitNarrow, compactReadout, pathOf, smoothPts } from '../nose.js';

const FOODS = {
  mango: { name: 'Mango', color: 0xffa62b, taste: [0.8, 0.3, 0, 0, 0], aroma: 0.9, heat: 0, cool: 0, full: 'Ripe mango!', blind: 'Sweet and a bit sour… some fruit?' },
  coffee: { name: 'Coffee', color: 0x5a3417, taste: [0.05, 0.35, 0, 0.75, 0], aroma: 0.95, heat: 0, cool: 0, full: 'Coffee!', blind: 'Bitter and a bit sour… no idea.' },
  chilli: { name: 'Green chilli', color: 0x3fae3a, taste: [0.1, 0.1, 0.05, 0.15, 0], aroma: 0.35, heat: 1, cool: 0, full: 'Green chilli, hot!', blind: 'It burns! But what is it?' },
  mint: { name: 'Mint', color: 0x5ce1a9, taste: [0.1, 0, 0, 0.12, 0], aroma: 0.8, heat: 0, cool: 0.9, full: 'Fresh mint!', blind: 'Cool and fresh… something.' },
};
const TASTES = ['Sweet', 'Sour', 'Salty', 'Bitter', 'Umami'];
// Illustrative adaptation curve: strength of a steady smell after t minutes.
export const adapt = (min) => 0.3 + 0.7 * Math.exp(-min / 2);

function drawBars(g, w, h, st) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.92)'; g.fillRect(0, 0, w, h);
  const f = FOODS[st.food];
  g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText(`What you sense: ${f.name.toLowerCase()}`, 28, 44);
  g.font = '19px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('illustrative strengths', 28, 72);
  const bars = [...TASTES.map((t, i) => [t, f.taste[i], '#ff7ad0', 'tongue']), ['Aroma', st.aroma, '#ffd166', 'nose'], ['Heat', f.heat, '#ff5a4a', 'nerve'], ['Cool', f.cool, '#6fb6ff', 'nerve']];
  const L = 30, R = w - 20, top = 100, bot = h - 76, bw = (R - L) / bars.length;
  bars.forEach(([name, v, col, src], i) => {
    const x = L + i * bw + 8, bh = (bot - top) * clamp(v, 0, 1);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, top, bw - 16, bot - top);
    g.fillStyle = col; g.fillRect(x, bot - bh, bw - 16, bh);
    g.fillStyle = '#e8eef8'; g.font = 'bold 19px sans-serif'; g.fillText(name, x, bot + 26);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '16px sans-serif'; g.fillText(src, x, bot + 48);
  });
}

const VIEW = { pos: [2.2, 9.9, 21.5], target: [1.6, 7.9, 0] };

export default {
  id: 'flavour',
  short: 'Flavour',
  title: 'Flavour is mostly smell',
  subtitle: 'Your tongue tastes five things. The rest of a mango comes up the back of your nose.',
  view: VIEW,
  learn: `<p>Your tongue can detect just five basic tastes: <b>sweet</b>, <b>sour</b>, <b>salty</b>, <b>bitter</b> and <b>umami</b> (savoury). You can find out how in <a href="/tongueclear/">TongueClear</a>. So how can you tell a mango from a banana, or good coffee from bad?</p>
    <p>When you chew and breathe out, air from the back of your mouth carries the food’s smell molecules up behind the palate, through the nasopharynx, to the smell patch. This is <b>retronasal smell</b>, smelling from the inside. Your brain blends it with taste and feels it all “in your mouth”, so we call the whole thing <b>flavour</b> and usually say “taste” when we mean smell. People often quote “80% of flavour is smell”; nobody has measured it that neatly, but experiments show most foods are hard to recognise once smell is blocked.</p>
    <p>Hold your nose and the air in it stops moving, so the smell never arrives: a mango is just “sweet and sour”. That is also why food seems dull when you have a blocked nose from a cold.</p>
    <p>Chilli burn and mint cool are neither taste nor smell. They come from a third nerve, the <b>trigeminal nerve</b>, whose sensors are also triggered by heat (for capsaicin in chilli) and by cold (for menthol in mint). Finally, smell gets tired: if a smell stays the same, your nose and brain turn it down within minutes. This is <b>adaptation</b>, and it is why you stop noticing your own home’s smell.</p>
    <p class="tip"><b>Try it:</b> pick a food, then switch on “Hold your nose” and watch the aroma bar and the guess collapse. Chilli keeps its burn!</p>`,
  terms: [
    { t: 'Flavour', d: 'The combined sense of taste, smell, touch and temperature that we feel when eating.' },
    { t: 'Retronasal smell', d: 'Smelling food from inside the mouth, as air flows up the back of the nose while you chew and breathe out.' },
    { t: 'Orthonasal smell', d: 'Ordinary sniffing, with air coming in through the nostrils.' },
    { t: 'Trigeminal nerve', d: 'A face nerve that senses touch, pain, heat and cold, including chilli burn and mint cool.' },
    { t: 'Adaptation', d: 'The way a steady smell seems to fade after a few minutes, even though it is still there.' },
  ],
  defaults: { food: 'mango', pinch: false, minutes: 0, chewing: true },
  controls: [
    { key: 'food', type: 'seg', label: 'In your mouth', options: Object.entries(FOODS).map(([v, f]) => ({ v, label: f.name })) },
    { key: 'pinch', type: 'toggle', label: 'Hold your nose' },
    { key: 'minutes', type: 'range', label: 'Minutes with the same smell (adaptation)', min: 0, max: 10, step: 0.1, ends: ['just started', '10 min'], fmt: (v) => v.toFixed(1) + ' min' },
    { key: 'chewing', type: 'toggle', label: 'Chewing and breathing out' },
  ],
  quiz: [
    { q: 'How do a food’s smell molecules reach your smell patch while you eat?', options: ['Through your ears', 'Up the back of the throat into the nose as you breathe out: retronasal smell', 'Through the tongue', 'They can’t while you eat'], answer: 1, why: 'Air from the back of the mouth rises through the nasopharynx to the smell patch.' },
    { q: 'Why does food taste bland with a blocked nose?', options: ['The tongue stops working', 'Aroma molecules can’t reach the smell patch, so you lose most of the flavour', 'Food gets colder', 'Mucus adds salt'], answer: 1, why: 'With no air moving through the nose, retronasal smell stops; only the five basic tastes are left.' },
    { q: 'Which nerve tells you chilli is “hot”?', options: ['The olfactory nerve', 'The trigeminal nerve', 'The optic nerve', 'The taste nerve for sweet'], answer: 1, why: 'Capsaicin triggers heat sensors on trigeminal nerve endings, the same ones that respond to real heat.' },
  ],
  reel: [
    { ms: 5200, caption: 'As you chew and breathe out, a mango’s aroma rises up the back of your nose to the smell patch.', set: { food: 'mango', pinch: false, minutes: 0, chewing: true }, view: VIEW, spin: 0 },
    { ms: 4800, caption: 'Hold your nose and the air stops. The mango is just sweet and sour.', set: { food: 'mango', pinch: true, minutes: 0, chewing: true }, view: VIEW, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(0, 8.2, 0); stage.root.add(root);
    const nose = makeNose(stage, { labels: false, flow: false, sinuses: false });
    root.add(nose.root);
    nose.setCut(true);
    // Food on the tongue.
    const foodG = new THREE.Group(); foodG.position.set(6.2, -0.75, 0); root.add(foodG);
    const foodMat = M.plastic(0xffa62b, { roughness: 0.5 });
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), foodMat); foodG.add(food);
    // Fingers pinching the nose.
    const skin = M.matte(0xd9a47e);
    const fingers = [1, -1].map((s) => { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.6, 6, 14), skin); f.rotation.z = Math.PI / 2 + 0.35; f.position.set(10.0, 0.9, 1.25 * s); root.add(f); return f; });
    // Aroma path: mouth → oropharynx → up the nasopharynx → smell patch → out of the nostrils.
    const R = pathOf(smoothPts([[6.2, -0.7], [4, -0.55], [1.5, -0.75], [0, -1.4], [-1.25, -1.8], [-1.45, -0.6], [-0.9, 0.8], [0.1, 1.9], [1.0, 3.0], [2.0, 4.1], [3.5, 4.75], [5.0, 4.85], [6.3, 4.35], [7.5, 3.0], [8.6, 1.2], [9.5, 0]].map(([x, y]) => [x, y, -0.12]), 140));
    const U_PATCH = 0.62, N = 120;
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N);
    dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dots.frustumCulled = false; root.add(dots);
    const u = Float32Array.from({ length: N }, (_, i) => (i / N) * 0.9), jj = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9) * 0.5, Math.sin(i * 78.2) * 0.5, Math.sin(i * 37.7) * 0.5]);
    const L = (html, pos, cls) => tint(stage.label(html, pos, root), cls);
    const labs = [
      L('Smell patch', [6.4, 5.5, 0], 'gold'),
      L('Tongue: 5 basic tastes', [1.4, -2.8, 0.6], 'pink'),
      L('Aroma rises up the back of the nose', [-3.2, -3.7, 0], 'gold'),
    ];
    const pinchL = L('<b>Nose held: no air flows</b>', [11.4, 2.0, 0], 'warm');

    const st = { food: 'mango', aroma: 0.9 };
    const chart = canvasTexture(900, 420, (g, w, h) => drawBars(g, w, h, st));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.0), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false, depthTest: false, depthWrite: false }));
    board.renderOrder = 20; board.position.set(5.6, -5.4, 2.5); root.add(board);

    const fit = fitNarrow(stage, { pos: [3, 9.2, 20], target: [2.4, 7.8, 0] });
    let t = 0, acc = 0, aroma = 0.9, flow = 1;
    const o = new THREE.Object3D(), p = new THREE.Vector3(), col = new THREE.Color();
    const api = {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fit();
        labs.forEach((l) => { l.visible = !narrow; });
        nose.setXray(1);
        const f = FOODS[s.food];
        foodMat.color.set(f.color);
        food.scale.set(s.food === 'chilli' ? 1.9 : 1, s.food === 'mint' ? 0.25 : s.food === 'chilli' ? 0.45 : 0.8, s.food === 'chilli' ? 0.45 : 1);
        foodG.rotation.y = s.chewing ? Math.sin(t * 5) * 0.2 : 0;
        food.position.y = s.chewing ? Math.abs(Math.sin(t * 5)) * 0.08 : 0;
        fingers.forEach((g) => { g.visible = s.pinch; });
        pinchL.visible = s.pinch && !narrow;
        // Air only moves up through the nose when it can get out of the nostrils.
        flow = lerp(flow, s.pinch || !s.chewing ? 0 : 1, 1 - Math.exp(-dt * 4));
        const target = f.aroma * (s.pinch ? 0.05 : 1) * adapt(s.minutes);
        aroma = lerp(aroma, s.chewing ? target : target * 0.3, 1 - Math.exp(-dt * 3));
        col.set(f.color).lerp(new THREE.Color(0xffffff), 0.35);
        for (let i = 0; i < N; i++) {
          // With no flow, molecules only mill about in the mouth and throat.
          const cap = 0.3;
          u[i] += (flow * 2.8 * dt) / R.total * 3;
          if (u[i] > 1) u[i] -= 1;
          let uu = u[i];
          if (flow < 0.2) uu = (u[i] % cap);
          R.at(uu, p);
          o.position.set(p.x + jj[i][0] * 0.3, p.y + jj[i][1] * 0.3 + Math.sin(t * 3 + i) * 0.04, p.z + jj[i][2] * 0.2);
          const vis = s.chewing && !(flow < 0.2 && uu > 0.29);
          o.scale.setScalar(vis ? (uu > U_PATCH - 0.03 && uu < U_PATCH + 0.03 ? 1.6 : 1) : 0.0001);
          o.updateMatrix(); dots.setMatrixAt(i, o.matrix); dots.setColorAt(i, col);
        }
        dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
        nose.olfMat.emissiveIntensity = 0.3 + 1.2 * aroma * (0.6 + 0.4 * Math.sin(t * 6));
        st.food = s.food; st.aroma = aroma;
        acc += dt; if (acc > 0.1) { acc = 0; chart.redraw(); }
      },
      readout: (s) => {
        const f = FOODS[s.food], ident = aroma > 0.45;
        const tastes = TASTES.filter((_, i) => f.taste[i] > 0.2).map((x) => x.toLowerCase()).join(', ') || 'barely anything';
        return `<div class="big">“${ident ? f.full : f.blind}”</div>
          <div class="row"><span>Tongue: basic tastes</span><b>${tastes}</b></div>
          <div class="row"><span>Nose: aroma reaching the smell patch</span><b>${Math.round(aroma * 100)}%</b></div>
          <div class="row"><span>Trigeminal nerve</span><b>${f.heat ? 'burning heat' : f.cool ? 'cooling' : 'nothing special'}</b></div>
          ${s.minutes > 0.2 ? `<div class="row"><span>Adaptation after ${s.minutes.toFixed(1)} min</span><b>${Math.round(adapt(s.minutes) * 100)}% as strong</b></div>` : ''}
          <small>${s.pinch ? 'With the nose held, air can’t flow out through it, so the aroma never rises to the smell patch.' : 'Strengths are illustrative. The trigeminal “heat” and “cool” come from TRPV1 and TRPM8 sensors, not from taste buds.'}</small>`;
      },
    };
    return compactReadout(stage, api);
  },
};
