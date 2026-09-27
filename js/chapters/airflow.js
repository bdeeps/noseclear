// Chapter 2: the nose as an air conditioner. Air is warmed and moistened on its way through
// (model and sources in nose.js: Keck et al. 2000), dust sticks to mucus and is carried back
// to the throat by cilia, and the two sides take turns to swell (the nasal cycle).
// Mucociliary clearance: cilia beat about 10–15 times a second and move the mucus blanket back
// at roughly 6 mm a minute (range about 3–25 mm/min; Proctor, Am Rev Respir Dis 115:97, 1977).
// Particles larger than about 10 µm are mostly caught in the nose and throat (US EPA,
// "Particulate Matter (PM) Basics"). Nasal cycle: present in about 70–80% of adults, with
// sides alternating every few hours, typically 1–5 h (Pendolino et al., Rhinology Online 1:67, 2018).
import { THREE, M, canvasTexture, clamp, lerp } from '../kit.js';
import { makeNose, tint, fitNarrow, compactReadout, condition, esat, pathOf, smoothPts, MOUTH, S_NASOPHARYNX, TM } from '../nose.js';

// Temperature colour: blue (cold) → white → orange (body warm).
const cCold = new THREE.Color(0x4f8bff), cMid = new THREE.Color(0xe8eef8), cWarm = new THREE.Color(0xff8a3a);
function tempColor(out, T) {
  const k = clamp((T + 10) / 47, 0, 1);
  return k < 0.55 ? out.copy(cCold).lerp(cMid, k / 0.55) : out.copy(cMid).lerp(cWarm, (k - 0.55) / 0.45);
}
// Absolute humidity (g of water per m³ of air) from vapour pressure (kPa) and temperature.
const absHum = (eKPa, T) => (eKPa * 1000) / (461.5 * (T + 273.15)) * 1000;
// Water added per day: 0.5 L breaths, 15 a minute (quiet breathing), warmed to the throat.
function waterPerDay(Tin, RH, mouth) {
  const a = absHum((RH / 100) * esat(Tin), Tin), end = condition(Tin, RH, 1, mouth), b = absHum(end.e, end.T);
  return Math.max(0, b - a) * 0.0005 * 15 * 60 * 24;            // grams (≈ mL) per day
}

function drawBoard(g, w, h, st) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
  const L = 90, R = w - 40, top = 70, bot = h - 70;
  const X = (s) => L + s * (R - L), YT = (T) => bot - ((T + 10) / 50) * (bot - top), YH = (r) => bot - (r / 100) * (bot - top);
  g.font = '22px sans-serif'; g.lineWidth = 1;
  for (let T = -10; T <= 40; T += 10) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, YT(T)); g.lineTo(R, YT(T)); g.stroke(); g.fillStyle = '#ffb070'; g.fillText(T + '°', 30, YT(T) + 6); }
  g.fillStyle = '#8fc6ff'; for (let r = 0; r <= 100; r += 25) g.fillText(r + '%', R + 2 - 44, YH(r) - 4);
  // landmarks
  const marks = [[0, 'nostril'], [0.2, 'nasal valve'], [0.55, 'turbinates'], [1, 'back of the nose']];
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '21px sans-serif';
  marks.forEach(([s, t]) => { g.strokeStyle = 'rgba(255,255,255,.14)'; g.setLineDash([5, 6]); g.beginPath(); g.moveTo(X(s), top - 10); g.lineTo(X(s), bot); g.stroke(); g.setLineDash([]); g.fillText(t, Math.min(R - g.measureText(t).width, Math.max(L, X(s) - g.measureText(t).width / 2)), bot + 26); });
  // curves
  const curve = (f, Y, col, dash = []) => { g.strokeStyle = col; g.lineWidth = 5; g.setLineDash(dash); g.beginPath(); for (let i = 0; i <= 80; i++) { const s = i / 80, v = f(s); i ? g.lineTo(X(s), Y(v)) : g.moveTo(X(s), Y(v)); } g.stroke(); g.setLineDash([]); };
  curve((s) => condition(st.Tin, st.RH, s, st.mouth).T, YT, '#ff9a4a');
  curve((s) => condition(st.Tin, st.RH, s, st.mouth).RH, YH, '#6fb6ff', [12, 8]);
  // body temperature line
  g.strokeStyle = 'rgba(255,90,106,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, YT(37)); g.lineTo(R, YT(37)); g.stroke();
  g.fillStyle = 'rgba(255,90,106,.9)'; g.fillText('body 37°', L + 6, YT(37) - 8);
  g.fillStyle = '#e8eef8'; g.font = 'bold 28px sans-serif';
  g.fillText(st.mouth ? 'Breathing through the mouth: air on its way down' : 'Air on its way through the nose', L, 34);
  g.font = 'bold 21px sans-serif'; g.fillStyle = '#ff9a4a'; g.fillText('temperature', L, 60); g.fillStyle = '#6fb6ff'; g.fillText('- - relative humidity', L + 150, 60);
  const e = condition(st.Tin, st.RH, 1, st.mouth);
  g.fillStyle = '#e8eef8'; g.font = 'bold 24px sans-serif'; g.fillText(`${e.T.toFixed(1)} °C · ${Math.round(e.RH)}%`, R - 210, 60);
}

const VIEW = { pos: [15.7, 13.6, 12.0], target: [2.7, 10.8, 1.4] };

export default {
  id: 'airflow',
  short: 'Air conditioner',
  title: 'Your nose, the air conditioner',
  subtitle: 'Warm, wet and clean: what happens to air in the tenth of a second it spends in your nose.',
  view: VIEW,
  learn: `<p>Your lungs are delicate. They like air at body temperature and nearly full of water vapour, whatever the weather outside. Your nose does that job in a fraction of a second.</p>
    <p>The turbinates are packed with blood vessels and covered in wet <b>mucus</b>. As air swirls past, heat flows from the warm lining into it and water evaporates into it. Measurements inside people’s noses found that room air at about 25 °C reaches the back of the nose at about <b>34 °C</b> and about <b>90%</b> relative humidity. Even freezing air is warmed to around 30 °C. Breathe through your mouth and much less of this happens, so the airways further down, towards your <a href="/lungsclear/">lungs</a>, have to finish the job.</p>
    <p>The mucus is also flypaper. Dust, pollen and germs stick to it; particles bigger than about 10 micrometres rarely get past the nose and throat. Tiny hairs called <b>cilia</b> beat more than ten times a second, sliding the whole mucus blanket back towards your throat at a few millimetres a minute, where you swallow it without noticing.</p>
    <p>Here is a surprise: in most people the two sides take turns. One side swells a little and the other opens up, then they swap every few hours. This is the <b>nasal cycle</b>, and it is why one nostril often feels more blocked than the other.</p>
    <p class="tip"><b>Try it:</b> drop the outside temperature to −10 °C and watch the dots warm up on the way in. Then switch to mouth breathing, and turn on the nasal cycle.</p>`,
  terms: [
    { t: 'Mucus', d: 'A sticky, wet layer on the lining of the nose that traps dust and germs and adds water to the air.' },
    { t: 'Cilia', d: 'Microscopic hairs on the lining cells that beat together to move mucus towards the throat.' },
    { t: 'Relative humidity', d: 'How much water vapour air holds compared with the most it could hold at that temperature.' },
    { t: 'Nasal cycle', d: 'The natural swapping of swelling between the two sides of the nose every few hours.' },
    { t: 'Mucociliary clearance', d: 'The conveyor belt of mucus and cilia that carries trapped particles out of the nose.' },
  ],
  defaults: { Tin: 25, RH: 40, mouth: false, cycle: false, dust: true },
  controls: [
    { key: 'Tin', type: 'range', label: 'Outside air temperature', min: -10, max: 45, step: 1, ends: ['freezing', 'desert heat'], fmt: (v) => Math.round(v) + ' °C' },
    { key: 'RH', type: 'range', label: 'Outside humidity', min: 5, max: 100, step: 1, ends: ['dry', 'monsoon'], fmt: (v) => Math.round(v) + '%' },
    { key: 'mouth', type: 'seg', label: 'Breathe through', options: [{ v: 'false', label: 'Nose' }, { v: 'true', label: 'Mouth' }] },
    { key: 'cycle', type: 'toggle', label: 'Run the nasal cycle (1 hour per second)' },
    { key: 'dust', type: 'toggle', label: 'Show dust being caught' },
  ],
  onChange(s) { if (typeof s.mouth === 'string') s.mouth = s.mouth === 'true'; },
  quiz: [
    { q: 'Room air at 25 °C goes in through your nose. Roughly how warm is it at the back of the nose?', options: ['About 25 °C, unchanged', 'About 34 °C', 'About 50 °C', 'Below 20 °C'], answer: 1, why: 'Measurements found about 34 °C and about 90% humidity at the back of the nose.' },
    { q: 'What happens to the dust your nose catches?', options: ['It stays in the nose for ever', 'Cilia slide the mucus back to the throat, where it is swallowed', 'It is breathed into the lungs', 'It dissolves in the air'], answer: 1, why: 'The mucus blanket moves back a few millimetres a minute, carrying dust with it.' },
    { q: 'Why does one nostril often feel more blocked than the other?', options: ['You are always getting a cold', 'The nasal cycle: the sides take turns to swell every few hours', 'One nostril is always smaller', 'The septum moves'], answer: 1, why: 'In most people the lining swells on one side and shrinks on the other, then they swap.' },
  ],
  reel: [
    { ms: 5000, caption: 'Freezing air in, warm wet air out: the nose heats each breath to about 30 °C in a fraction of a second.', set: { Tin: -10, RH: 40, mouth: false, cycle: false, dust: false }, anim: { Tin: [-10, 5] }, view: VIEW, spin: 0.2 },
    { ms: 4800, caption: 'Every few hours your two nostrils swap: one swells while the other opens.', set: { Tin: 25, RH: 40, mouth: false, cycle: true, dust: true }, view: { pos: [24, 12.5, 4], target: [4.0, 10.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(0, 8.2, 0); stage.root.add(root);
    const nose = makeNose(stage, { cut: false, labels: false, brain: false, sinuses: false });
    root.add(nose.root);
    nose.mats.mucosa.opacity = 0.3; nose.mats.mucosa.depthWrite = false;
    nose.mats.nose.opacity = 0.12;
    const labs = [
      tint(stage.label('Turbinates: warm, wet, full of blood vessels', [1.2, -0.6, -2.2], root), 'turb'),
    ];
    const sideL = { 1: tint(stage.label('', [8.8, 3.4, 2.6], root), 'side'), [-1]: tint(stage.label('', [8.8, 3.4, -2.6], root), 'side') };

    // Mouth-breathing air.
    const mouthPath = pathOf(smoothPts(MOUTH.map(([x, y]) => [x, y + (x > 1 && x < 8.3 ? 0.35 : 0), 0]), 80));
    const MN = 90, mouthDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MN);
    mouthDots.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mouthDots.frustumCulled = false; root.add(mouthDots);
    const mu = Float32Array.from({ length: MN }, (_, i) => i / MN), mj = Array.from({ length: MN }, (_, i) => [Math.sin(i * 12.9) * 0.5, Math.sin(i * 78.2) * 0.5, Math.sin(i * 37.7) * 0.5]);
    for (let i = 0; i < MN; i++) mouthDots.setColorAt(i, new THREE.Color(0xffffff));

    // Dust: caught on the lining, then carried back by the cilia (sped up a lot).
    const DN = 26, dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), M.matte(0xb08a5a), DN);
    dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dust.frustumCulled = false; root.add(dust);
    const dpath = pathOf(smoothPts([[9.5, 0], [8.9, 0.8], [8.0, 1.7], [6.6, 2.0], [4, 1.9], [1.4, 1.8], [0, 1.4], [-0.9, 0.7], [-1.4, -0.9], [-1.5, -3.4]].map(([x, y]) => [x, y, 0]), 100));
    const dd = Array.from({ length: DN }, (_, i) => ({ s: i % 2 ? 1 : -1, u: (i / DN) * 0.5, stick: 0.12 + ((i * 0.37) % 1) * 0.4, stuck: false, y: 0.4 + ((i * 0.61) % 1) * 3.6, x: 0 }));

    // Board
    const st = { Tin: 25, RH: 40, mouth: false };
    const chart = canvasTexture(1000, 420, (g, w, h) => drawBoard(g, w, h, st));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.53), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false, depthTest: false, depthWrite: false }));
    // Hang the board to the right of the face, turned towards the default camera.
    {
      const T = new THREE.Vector3(...VIEW.target), P = new THREE.Vector3(...VIEW.pos), f = T.clone().sub(P).normalize();
      const right = f.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
      board.position.copy(T).addScaledVector(right, 3.2).add(new THREE.Vector3(0, -4.3, 0)).addScaledVector(f, -3);
      board.lookAt(P.clone().addScaledVector(right, 3.2).add(new THREE.Vector3(0, -4.3, 0)));
    }
    board.renderOrder = 20; stage.root.add(board);

    const fit = fitNarrow(stage, { pos: [15, 12.2, 10.5], target: [4.2, 9.2, 0.5] });
    let t = 0, hours = 0, acc = 0, shares = { 1: 0.5, [-1]: 0.5 };
    const o = new THREE.Object3D(), p = new THREE.Vector3(), col = new THREE.Color();
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fit();
        labs.forEach((l) => { l.visible = !narrow; });
        // Nasal cycle: a 4-hour period, shown at 1 hour per second. Swelling up to half-closed.
        if (s.cycle) hours += dt;
        const k = s.cycle ? 0.5 + 0.5 * Math.sin((2 * Math.PI * hours) / 4) : 0.5;
        const swell = { 1: 0.5 * k, [-1]: 0.5 * (1 - k) };
        nose.setSwell(1, s.cycle ? swell[1] : 0); nose.setSwell(-1, s.cycle ? swell[-1] : 0);
        // Flow share between the sides: a narrow slit passes flow roughly as gap² (rough model).
        const gap = (sd) => lerp(0.2, 0.015, s.cycle ? swell[sd] : 0);
        const a = gap(1) ** 2, b = gap(-1) ** 2;
        shares = { 1: a / (a + b), [-1]: b / (a + b) };
        [1, -1].forEach((sd) => { sideL[sd].visible = !narrow; sideL[sd].element.innerHTML = `Patient’s ${sd > 0 ? 'left' : 'right'}${s.cycle ? `: <b>${Math.round(shares[sd] * 100)}% of the air</b>` : ''}`; });
        // Air through the nose, coloured by its temperature.
        nose.flow.mesh.visible = !s.mouth;
        nose.flow.step(dt, {
          flow: 0.9, dir: 1, upper: 0.08, open: { 1: shares[1] * 2, [-1]: shares[-1] * 2 },
          colorAt: (c, u) => tempColor(c, condition(s.Tin, s.RH, Math.min(1, u / S_NASOPHARYNX)).T),
        });
        // Through the mouth.
        mouthDots.visible = s.mouth;
        if (s.mouth) {
          for (let i = 0; i < MN; i++) {
            mu[i] = (mu[i] + (5 * dt) / mouthPath.total) % 1;
            mouthPath.at(mu[i], p);
            o.position.set(p.x + mj[i][0] * 0.25, p.y + mj[i][1] * 0.2, p.z + mj[i][2] * 1.2); o.updateMatrix(); mouthDots.setMatrixAt(i, o.matrix);
            mouthDots.setColorAt(i, tempColor(col, condition(s.Tin, s.RH, Math.min(1, mu[i] / 0.85), true).T));
          }
          mouthDots.instanceMatrix.needsUpdate = true; mouthDots.instanceColor.needsUpdate = true;
        }
        // Dust.
        dust.visible = s.dust && !s.mouth;
        if (dust.visible) {
          for (let i = 0; i < DN; i++) {
            const d = dd[i];
            if (!d.stuck) {
              d.u += (5.5 * dt) / dpath.total;
              dpath.at(d.u, p); p.y += (d.y - 1.8) * Math.min(1, d.u * 4) * 0.8;
              if (d.u >= d.stick) { d.stuck = true; d.x = p.x; d.yy = p.y; }
              o.position.set(p.x, p.y, d.s * 0.3);
            } else {
              // Carried back along the lining towards the throat (real speed ~6 mm/min; here ×1,000).
              d.x -= 0.1 * dt;
              const wz = 0.2 + 1.2 * Math.pow(1 - clamp(d.yy / 5.3, 0, 1), 0.55);
              o.position.set(d.x, d.yy + Math.sin(t * 8 + i) * 0.01, d.s * (wz - 0.06));
              if (d.x < 0.2) { d.stuck = false; d.u = 0; }
            }
            o.updateMatrix(); dust.setMatrixAt(i, o.matrix);
          }
          dust.instanceMatrix.needsUpdate = true;
        }
        st.Tin = s.Tin; st.RH = s.RH; st.mouth = s.mouth;
        acc += dt; if (acc > 0.2) { acc = 0; chart.redraw(); }
      },
      readout: (s) => {
        const e = condition(s.Tin, s.RH, 1, s.mouth), wpd = waterPerDay(s.Tin, s.RH, s.mouth);
        return `<div class="big">${e.T.toFixed(0)} °C, ${Math.round(e.RH)}% humid</div>
          <div class="row"><span>Outside air</span><b>${Math.round(s.Tin)} °C · ${Math.round(s.RH)}%</b></div>
          <div class="row"><span>At the back of the ${s.mouth ? 'mouth' : 'nose'}</span><b>${e.T.toFixed(1)} °C · ${Math.round(e.RH)}%</b></div>
          <div class="row"><span>Water added to the air, per day</span><b>about ${Math.round(wpd / 10) * 10} mL</b></div>
          ${s.cycle ? `<div class="row"><span>Nasal cycle, hour ${Math.floor(hours % 24)}</span><b>right ${Math.round(shares[-1] * 100)}% · left ${Math.round(shares[1] * 100)}%</b></div>` : ''}
          <small>${e.condenses ? 'Cold air can’t hold all the water it picks up, so some condenses: one reason your nose runs in the cold.' : s.mouth ? 'Mouth breathing warms and wets the air much less (a rough model), so the throat and airways dry out.' : `Model tuned to measurements of 34 °C and about 90% at the back of the nose (Keck et al., 2000). The lining is at about ${TM} °C.`}</small>`;
      },
    });
  },
};
