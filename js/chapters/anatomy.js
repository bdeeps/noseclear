// Chapter 1: the nose and nasal cavity. The external nose, nostrils, septum, the three
// turbinates, the smell patch high in the roof, the cribriform plate, the olfactory bulb, the
// sinuses and the nasopharynx, with air flowing through and a sniff that sends more air up
// to the smell patch. Anatomy and airflow sources are in nose.js.
import { THREE, clamp } from '../kit.js';
import { makeNose, tint, fitNarrow, compactReadout, airSpeed } from '../nose.js';

// One quiet breath every 4 s (15 a minute) of 0.5 L, drawn in over 2 s with a sine-shaped flow:
// peak = π·V/T = π × 0.5 L / 4 s ≈ 0.39 L/s ≈ 24 L/min (NHLBI; Guyton & Hall).
const BREATH_T = 4, TIDAL = 0.5, PEAK = (Math.PI * TIDAL / BREATH_T) * 60;
// A sniff: about 0.4 s, peak around 30 L/min (Laing, Perception 12:99, 1983).
const SNIFF_PEAK = 30;

export default {
  id: 'anatomy',
  short: 'Inside the nose',
  title: 'Inside your nose',
  subtitle: 'Two tunnels, three curly shelves, and a stamp-sized smell patch in the roof.',
  view: { pos: [3.2, 13.1, 18.2], target: [1.2, 11.55, 0] },
  learn: `<p>The bit of nose you can see is only the doorway. Behind it, two tunnels, the <b>nasal cavities</b>, run about 10 cm back into your head. A thin wall, the <b>septum</b>, splits them into left and right: bendy <b>cartilage</b> at the front, bone further back. We have cut the left side away so you can look into the right one.</p>
    <p>On the outer wall of each tunnel hang three curled shelves of bone covered in soft, wet lining: the <b>inferior</b>, <b>middle</b> and <b>superior turbinates</b> (doctors also call them conchae). They make the air swirl past a big, warm, wet surface, which is how your nose warms, wets and cleans each breath before it reaches your <a href="/lungsclear/">lungs</a>.</p>
    <p>Smelling happens in just one small place: a yellowish patch high in the roof, the <b>olfactory epithelium</b>. It covers a few square centimetres in all, roughly a postage stamp on each side. Millions of smell nerve cells live there. Their fibres pass up through tiny holes in a sieve of bone, the <b>cribriform plate</b>, to the <b>olfactory bulb</b>, the first stop in the brain.</p>
    <p>Around the nose sit air-filled spaces in the skull bones, the <b>sinuses</b>: in your forehead, your cheeks, between your eyes and behind your nose. At the back, both tunnels meet in the <b>nasopharynx</b>, which leads down your throat.</p>
    <p>In quiet breathing most air rushes along the lower tunnels, and only a small share, roughly 5 to 15% in computer models, curls up to the smell patch. A <b>sniff</b> pulls air in faster and sends more of it up there.</p>
    <p class="tip"><b>Try it:</b> press “Sniff!” and watch the gold dots climb to the smell patch, then take the nose apart to see each piece.</p>`,
  terms: [
    { t: 'Nasal cavity', d: 'Each of the two air tunnels behind your nostrils, from the nostril to the back of the nose.' },
    { t: 'Septum', d: 'The wall of cartilage and bone that splits the nose into left and right sides.' },
    { t: 'Turbinates', d: 'Three curled shelves on each side wall of the nose (conchae) that warm, wet and clean the air.' },
    { t: 'Olfactory epithelium', d: 'The small patch of lining in the roof of the nose that holds the smell nerve cells.' },
    { t: 'Cribriform plate', d: 'A thin, sieve-like piece of bone in the nose’s roof. Smell nerve fibres pass through its holes.' },
    { t: 'Olfactory bulb', d: 'A small bulge of brain just above the nose where the smell nerves first connect.' },
    { t: 'Sinuses', d: 'Air-filled spaces in the skull bones around the nose, lined with the same wet lining.' },
  ],
  defaults: { explode: 0, xray: true, cut: true, breathing: true, labels: true },
  controls: [
    { key: 'sniff', type: 'buttons', label: 'Breathe', items: [{ label: 'Sniff!', act: (s, inst) => inst.sniff?.() }] },
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray: see inside the head' },
    { key: 'cut', type: 'toggle', label: 'Cut away the left side' },
    { key: 'breathing', type: 'toggle', label: 'Breathing' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Where in the nose are the smell nerve cells?', options: ['All over the inside of the nostrils', 'In a small patch high in the roof', 'In the sinuses', 'On the tip of the nose'], answer: 1, why: 'The olfactory epithelium is a small patch in the roof of each nasal cavity, just under the cribriform plate.' },
    { q: 'What are the turbinates?', options: ['Muscles that open the nostrils', 'Curled shelves on the side walls that warm, wet and clean the air', 'The holes in the skull for nerves', 'Hairs inside the nostrils'], answer: 1, why: 'Three curled, lined shelves on each side make the air swirl over a large warm, wet surface.' },
    { q: 'Why do you sniff when you want to smell something?', options: ['To cool the nose', 'It sends faster air, and more of it, up to the smell patch', 'It closes the sinuses', 'It stops you breathing out'], answer: 1, why: 'Most quiet breathing air flows low in the nose. A sniff pulls in air fast and more of it reaches the roof.' },
  ],
  reel: [
    { ms: 5000, caption: 'Behind your nose are two 10 cm tunnels, split by a wall called the septum.', set: { explode: 0, xray: false, cut: false, breathing: true, labels: false }, anim: { xray: [false, true] }, view: { pos: [9.5, 12.9, 21], target: [3.2, 11.2, 0] }, spin: 0.25 },
    { ms: 5600, caption: 'Only a stamp-sized patch high in the roof can smell. A sniff sends air up to it.', set: { explode: 0, xray: true, cut: true, breathing: true, labels: false }, act: (s, inst) => inst.sniff?.(true), view: { pos: [5.5, 13.0, 15.5], target: [4.0, 11.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    root.position.set(0, 8.2, 0);
    const nose = makeNose(stage);
    root.add(nose.root);
    const front = tint(stage.label('Side view: the face points right', [3.5, -3.6, 0], root), 'side');
    const fit = fitNarrow(stage, { pos: [5.5, 13.2, 22], target: [3.8, 11.8, 0] });
    let t = 0, xr = 1, sniffT = -1, repeat = false, flowNow = 0, lastCut = null;
    return compactReadout(stage, {
      sniff(loop = false) { sniffT = 0; repeat = loop; },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        xr += ((s.xray ? 1 : 0) - xr) * Math.min(1, dt * 5);
        nose.setXray(xr);
        if (s.cut !== lastCut) { nose.setCut(s.cut); lastCut = s.cut; }
        nose.setExplode(s.explode);
        const narrow = fit();
        nose.showLabels(s.labels && xr > 0.5, narrow);
        front.visible = s.labels && !narrow;
        // Breathing and sniffing.
        let flow = 0, dir = 1, upper = 0.08;
        if (sniffT >= 0) {
          sniffT += dt;
          const k = sniffT / 1.6;                       // show the sniff slowed down 4× so you can follow it
          flow = SNIFF_PEAK * Math.sin(Math.PI * clamp(k, 0, 1)); upper = 0.35; dir = 1;
          if (k >= 1) { sniffT = repeat ? 0 : -1; }
        } else if (s.breathing) {
          const ph = (t % BREATH_T) / BREATH_T;
          flow = PEAK * Math.abs(Math.sin(2 * Math.PI * ph)); dir = ph < 0.5 ? 1 : -1;
        }
        flowNow = flow * dir;
        const flowDraw = sniffT >= 0 ? 1.4 : flow / PEAK * 0.8;
        nose.flow.step(dt, {
          flow: flowDraw, dir, upper,
          colorAt: (c, u, name) => c.set(name === 'upper' && sniffT >= 0 ? 0xffd166 : 0x9fdcff),
        });
      },
      readout: (s) => {
        const sniffing = sniffT >= 0, f = Math.abs(flowNow);
        return `<div class="big">${sniffing ? 'Sniff!' : flowNow > 0.5 ? 'Breathing in' : flowNow < -0.5 ? 'Breathing out' : s.breathing ? 'Between breaths' : 'Holding still'}</div>
          <div class="row"><span>Air flow through the nose</span><b>${f.toFixed(0)} L/min</b></div>
          <div class="row"><span>Air speed at the narrowest point</span><b>${airSpeed(f).toFixed(1)} m/s</b></div>
          <div class="row"><span>Air reaching the smell patch</span><b>${sniffing ? 'more: a sniff aims it up' : 'a small share, ~5–15%'}</b></div>
          <small>${sniffing ? 'A real sniff lasts about 0.4 s and peaks near 30 L/min. Here it is slowed down so you can follow it.' : 'Quiet breathing: about 15 breaths a minute of half a litre each. The narrowest point, the nasal valve, is about 0.7 cm² on each side.'}</small>`;
      },
    });
  },
};
