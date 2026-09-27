// Chapter 6: smell and health. General facts only, never advice: for anything about your own
// sense of smell, see a doctor.
// Sources:
//  - NIDCD, "Smell disorders" (nidcd.nih.gov/health/smell-disorders) and "Quick statistics about
//    taste and smell": causes (colds and flu, sinus disease, head injury, ageing), and that
//    smell problems become more common with age.
//  - NHS, "Lost or changed sense of smell" (nhs.uk/conditions/lost-or-changed-sense-of-smell).
//  - Ageing: Murphy et al., JAMA 288:2307 (2002): olfactory impairment in 24.5% of people aged
//    53–97 and 62.5% of those aged 80–97 (Beaver Dam, USA); Doty et al., Science 226:1441 (1984):
//    more than half of people aged 65–80 and over three-quarters of those over 80 had major loss.
//  - COVID-19: early meta-analyses found smell loss in roughly 40–50% of patients in 2020
//    (e.g. Tong et al., Otolaryngol Head Neck Surg 163:3, 2020: 52.7%; others about 38–48%), far
//    fewer with Omicron (about 7%: von Bartheld & Wang, 2023). The virus infects the supporting
//    (sustentacular) cells, not mainly the neurons (Brann et al., Sci Adv 6:eabc5801, 2020).
//    Most people recover; an estimated 5.6% of those who lost smell reported lasting problems
//    (Tan et al., BMJ 378:e069503, 2022). The UK added loss of smell to its official symptom list
//    on 18 May 2020.
//  - Gas odorant: ethyl mercaptan (ethanethiol) can be smelled at around 1 ppb or less (reported
//    thresholds 0.1–1 ppb; e.g. Nagata, Japan Ministry of the Environment odour thresholds, 2003:
//    0.0087 ppm for ethyl mercaptan is a common tabulated value for recognition; detection
//    thresholds are lower). A common dose is about 1 lb per 10,000 US gallons of propane
//    (NFPA 58 practice), about 25 ppm by mass, ≈ 18 ppm by volume. LPG's lower explosive limit is
//    about 1.8% (butane) to 2.1% (propane) in air. In India the LPG emergency number is 1906
//    (Ministry of Petroleum and Natural Gas).
import { THREE, M, latheX, rod, clamp, lerp } from '../kit.js';
import { makeNose, tint, fitNarrow, compactReadout } from '../nose.js';

const ODORANT_PPM = 18;            // ethyl mercaptan in LPG, by volume
const THRESH_PPB = 1;              // a round, conservative smell threshold
const LEL = 1.8;                   // % LPG in air where it can first burn (butane-rich mix)

const VIEWS = {
  cold: { pos: [3.6, 12.8, 19], target: [1.4, 11.2, 0] },
  covid: { pos: [4.4, 13.8, 15.5], target: [2.6, 12.4, 0] },
  gas: { pos: [10.0, 11.2, 28], target: [9.0, 9.9, 0] },
  age: { pos: [4.4, 13.8, 15.5], target: [2.6, 12.4, 0] },
};
const ageLoss = (a) => (a < 50 ? 'uncommon' : a < 65 ? 'about 1 in 8 to 1 in 4' : a < 80 ? 'about half' : '60–75%');

export default {
  id: 'health',
  short: 'Smell and health',
  title: 'When smell goes wrong',
  subtitle: 'Colds, COVID-19, getting older, and the smell that is added to gas to keep you safe.',
  view: VIEWS.cold,
  learn: `<p>This chapter shares general facts only. If your sense of smell changes, <b>see a doctor</b>: they can check what is going on.</p>
    <p><b>A blocked nose.</b> In a cold, the lining and turbinates swell with blood and mucus. Air can’t reach the smell patch high in the roof, so smells and flavours fade. They usually come back as the cold clears.</p>
    <p><b>Losing smell.</b> Losing your sense of smell completely is called <b>anosmia</b>. In 2020 it became one of the best-known signs of <b>COVID-19</b>: studies early in the pandemic found it in roughly 40 to 50% of patients, far fewer with later variants. The virus mainly infects the <b>supporting cells</b> around the smell neurons. Most people recover over weeks to months, though a small share, around 1 in 20 of those affected in one large analysis, report lasting problems.</p>
    <p><b>Getting older.</b> Smell slowly weakens with age. In one US study, about a quarter of people over 53 had a measurable loss, and more than 60% of those over 80. Many don’t notice, which matters because smell warns us about smoke, spoiled food and gas.</p>
    <p><b>The smell of gas.</b> Cooking gas (LPG) and natural gas have almost no smell of their own. So companies add a tiny amount of a very smelly chemical, usually <b>ethyl mercaptan</b>, which most noses notice at around one part per billion. After a gas explosion killed about 300 people at a school in New London, Texas, in 1937, laws began to require it. See how a kitchen chimney deals with fumes in <a href="/chimneyclear/">ChimneyClear</a>. If you ever smell gas: don’t switch anything electrical on or off, no flames, open doors and windows, turn off the cylinder if you safely can, get out, and call for help (in India, the LPG emergency line is <b>1906</b>).</p>
    <p class="tip"><b>Try it:</b> in “Gas leak”, slide the leak up and see how early your nose can warn you, long before the gas could burn.</p>`,
  terms: [
    { t: 'Anosmia', d: 'Complete loss of the sense of smell. Partial loss is called hyposmia.' },
    { t: 'Supporting cells', d: 'Cells in the smell patch that look after the smell neurons. The COVID-19 virus mainly infects these.' },
    { t: 'Ethyl mercaptan', d: 'A sulphur chemical with a strong smell, added to cooking gas so leaks can be noticed.' },
    { t: 'Lower explosive limit', d: 'The smallest amount of a gas in air that can catch fire. For LPG it is about 2%.' },
    { t: 'ppb', d: 'Parts per billion: one molecule in every billion molecules of air.' },
  ],
  defaults: { scene: 'cold', swell: 0.7, days: 3, leak: 0.02, age: 30 },
  controls: [
    { key: 'scene', type: 'seg', label: 'Show', options: [{ v: 'cold', label: 'Blocked nose' }, { v: 'covid', label: 'Smell loss' }, { v: 'gas', label: 'Gas leak' }, { v: 'age', label: 'Getting older' }] },
    { key: 'swell', type: 'range', label: 'Blocked nose: swelling', min: 0, max: 1, step: 0.01, ends: ['clear', 'fully blocked'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'days', type: 'range', label: 'Smell loss: days since it started', min: 0, max: 180, step: 1, ends: ['day 0', '6 months'], fmt: (v) => Math.round(v) + ' days' },
    { key: 'leak', type: 'log', label: 'Gas leak: LPG in the room air', min: 0.0005, max: 2.5, fmt: (v) => (v < 0.01 ? v.toFixed(4) : v < 0.1 ? v.toFixed(3) : v.toFixed(2)) + '%' },
    { key: 'age', type: 'range', label: 'Getting older: age', min: 20, max: 90, step: 1, fmt: (v) => Math.round(v) + ' years' },
  ],
  quiz: [
    { q: 'Why can’t you smell much when you have a cold?', options: ['The smell neurons die at once', 'Swollen lining stops air reaching the smell patch', 'The brain switches smell off', 'Mucus smells too strong'], answer: 1, why: 'The turbinates and lining swell, so air and odour molecules can’t get up to the roof of the nose.' },
    { q: 'Why is a smelly chemical added to cooking gas?', options: ['To make it burn hotter', 'So that leaks can be noticed long before the gas could catch fire', 'To keep insects away', 'It is there naturally'], answer: 1, why: 'LPG has almost no smell. A trace of ethyl mercaptan lets noses detect tiny leaks, far below the level that can burn.' },
    { q: 'In COVID-19, which cells in the smell patch does the virus mainly infect?', options: ['The smell neurons', 'The supporting cells around them', 'Red blood cells', 'The olfactory bulb'], answer: 1, why: 'Research in 2020 showed the virus’s entry proteins sit on supporting cells, not mainly on the neurons.' },
  ],
  reel: [
    { ms: 5400, caption: 'Cooking gas has no smell of its own. A trace of ethyl mercaptan warns your nose long before it can burn.', set: { scene: 'gas' }, anim: { leak: [0.0006, 0.3, true] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(0, 8.2, 0); stage.root.add(root);
    const nose = makeNose(stage, { labels: false, sinuses: false });
    root.add(nose.root); nose.setCut(true); nose.setXray(1);
    const olfBase = new THREE.Color(0xe8c25a), grey = new THREE.Color(0x77706a);
    // Mucus blobs for the cold.
    const mucus = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xd8e6a0, transparent: true, opacity: 0.8, roughness: 0.2, clearcoat: 1 }), 22);
    for (let i = 0; i < 22; i++) { const m = new THREE.Matrix4().compose(new THREE.Vector3(1.2 + (i % 11) * 0.55, i < 11 ? 0.6 : 2.2, -0.35), new THREE.Quaternion(), new THREE.Vector3(1.4, 0.8, 0.8)); mucus.setMatrixAt(i, m); }
    root.add(mucus);
    // Virus particles for the smell-loss scene.
    const virus = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 1), M.plastic(0xff5a6a), 30);
    root.add(virus);
    // A gas cylinder (not to scale) with a leaking regulator, and the plume.
    const gasG = new THREE.Group(); gasG.position.set(19, -8.2, -2); root.add(gasG);
    const red = M.plastic(0xc8202a, { roughness: 0.35 });
    const cyl = latheX([[0, 0], [0, 3.0], [0.6, 3.2], [6.0, 3.2], [6.9, 2.6], [7.3, 1.2], [7.4, 0]], red, { seg: 48 }); cyl.rotation.z = Math.PI / 2; gasG.add(cyl);
    const collar = rod(-0.65, 0.65, 1.3, 1.3, red, 32, true); collar.rotation.z = Math.PI / 2; collar.position.y = 7.95; gasG.add(collar);
    const reg = rod(-0.45, 0.45, 0.55, 0.55, M.metal(0xd8d8d8), 24); reg.rotation.z = Math.PI / 2; reg.position.y = 7.9; gasG.add(reg);
    gasG.scale.setScalar(0.8);
    const valve = new THREE.Vector3(19, -8.2 + 8.4 * 0.8, -2);
    const PN = 160, plume = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.85 }), PN);
    plume.instanceMatrix.setUsage(THREE.DynamicDrawUsage); plume.frustumCulled = false; root.add(plume);
    const pu = Float32Array.from({ length: PN }, (_, i) => i / PN), pj = Array.from({ length: PN }, (_, i) => [Math.sin(i * 12.9), Math.sin(i * 78.2), Math.sin(i * 37.7)]);
    const cOd = new THREE.Color(0xb8ff6a), cGas = new THREE.Color(0x8a93a6);
    for (let i = 0; i < PN; i++) plume.setColorAt(i, i % 6 === 0 ? cOd : cGas);
    const L = (html, pos, cls) => tint(stage.label(html, pos, root), cls);
    const labs = {
      cold: [L('Swollen turbinates', [3.0, -0.8, 0.4], 'turb'), L('Smell patch: little air gets up here', [5.8, 6.2, 0], 'gold')],
      covid: [L('Smell patch', [6.4, 5.8, 0], 'gold')],
      gas: [L('LPG cylinder (not to scale)', [19, -2.6, 1.0], 'warm'), L('Leak', [20.6, -0.8, -2], 'warm')],
      age: [L('Smell patch', [6.4, 5.8, 0], 'gold')],
    };
    const status = L('', [5.0, 8.4, 0], 'gold');

    const fit = fitNarrow(stage, { pos: [3.8, 12.4, 19], target: [2.2, 11.0, 0] });
    let t = 0, last = null, sm = 0;
    const o = new THREE.Object3D(), p = new THREE.Vector3(), col = new THREE.Color();
    const recovered = (d) => clamp(1 - Math.exp(-d / 30), 0, 1) * 0.94;        // illustrative shape: most recover over weeks to months
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fit();
        if (s.scene !== last) { if (last !== null || s.scene !== 'cold') stage.setView(VIEWS[s.scene].pos, VIEWS[s.scene].target, 0.9); last = s.scene; }
        Object.entries(labs).forEach(([k, ls]) => ls.forEach((l) => { l.visible = k === s.scene && !narrow; }));
        const cold = s.scene === 'cold';
        nose.setSwell(-1, cold ? s.swell : 0);
        mucus.visible = cold && s.swell > 0.3;
        // Smell patch appearance.
        let health = 1;
        if (s.scene === 'covid') health = 0.12 + 0.88 * recovered(s.days);
        if (s.scene === 'age') health = s.age < 50 ? 1 : clamp(1 - (s.age - 50) / 55, 0.3, 1);
        nose.olfMat.color.copy(grey).lerp(olfBase, health);
        nose.olfMat.emissiveIntensity = 0.45 * health;
        virus.visible = s.scene === 'covid' && s.days < 30;
        if (virus.visible) {
          for (let i = 0; i < 30; i++) { o.position.set(2.0 + (i % 10) * 0.45, 4.55 + Math.sin(t * 2 + i) * 0.12, -0.2 - (i % 3) * 0.1); o.scale.setScalar(1 - s.days / 30); o.updateMatrix(); virus.setMatrixAt(i, o.matrix); }
          virus.instanceMatrix.needsUpdate = true;
        }
        // Airflow: swelling stops air reaching the roof.
        const upper = cold ? 0.08 * (1 - s.swell) : 0.08;
        nose.flow.mesh.visible = s.scene !== 'gas';
        nose.flow.step(dt, { flow: 0.9, dir: 1, upper, open: { 1: 1, [-1]: cold ? 1 - 0.85 * s.swell : 1 } });
        // Gas plume: more dots for a bigger leak (log scale), drifting to the nose.
        gasG.visible = plume.visible = s.scene === 'gas';
        if (plume.visible) {
          const frac = clamp((Math.log10(s.leak) + 3.3) / 3.7, 0.05, 1), n = Math.round(PN * frac);
          for (let i = 0; i < PN; i++) {
            pu[i] = (pu[i] + dt * 0.12) % 1;
            const k = pu[i];
            p.set(lerp(valve.x, 10.2, k), lerp(valve.y, 0.2, k) + Math.sin(k * 3.1) * 1.6, lerp(valve.z, 0, k));
            o.position.set(p.x + pj[i][0] * (0.3 + 2.2 * k), p.y + pj[i][1] * (0.3 + 1.5 * k), p.z + pj[i][2] * (0.3 + 2.0 * k));
            o.scale.setScalar(i < n ? 1 : 0.0001); o.updateMatrix(); plume.setMatrixAt(i, o.matrix);
          }
          plume.instanceMatrix.needsUpdate = true;
        }
        const ppb = s.leak / 100 * ODORANT_PPM * 1000;
        sm = lerp(sm, s.scene === 'gas' ? clamp(Math.log10(ppb / THRESH_PPB + 1e-6) / 2 + 0.5, 0, 1) : 0, 1 - Math.exp(-dt * 4));
        if (s.scene === 'gas') { nose.olfMat.color.copy(olfBase).lerp(new THREE.Color(0xb8ff6a), sm); nose.olfMat.emissiveIntensity = 0.3 + 1.2 * sm * (0.7 + 0.3 * Math.sin(t * 8)); }
        status.visible = !narrow;
        status.position.set(...(s.scene === 'gas' ? [12.2, 3.2, 0] : [5.0, 8.4, 0]));
        status.element.innerHTML = s.scene === 'gas'
          ? (ppb >= THRESH_PPB ? '<b>“I smell gas!”</b>' : '<b>Too faint to notice yet</b>')
          : s.scene === 'cold' ? (s.swell > 0.6 ? '<b>Smells and flavours fade</b>' : '<b>Air still reaches the smell patch</b>')
          : s.scene === 'covid' ? (health < 0.5 ? '<b>Smell reduced or lost</b>' : '<b>Smell coming back</b>')
          : '<b>Smell changes slowly with age</b>';
      },
      readout: (s) => {
        if (s.scene === 'gas') {
          const ppb = s.leak / 100 * ODORANT_PPM * 1000, x = ppb / THRESH_PPB, lelShare = s.leak / LEL;
          return `<div class="big">${ppb >= THRESH_PPB ? 'Your nose can warn you' : 'Too faint to smell'}</div>
            <div class="row"><span>LPG in the air</span><b>${s.leak < 0.01 ? s.leak.toFixed(4) : s.leak.toFixed(3)}% (${Math.round(lelShare * 100)}% of the burnable level)</b></div>
            <div class="row"><span>Odorant in the air</span><b>${ppb < 10 ? ppb.toFixed(2) : Math.round(ppb)} ppb</b></div>
            <div class="row"><span>Compared with a ~1 ppb smell threshold</span><b class="${x >= 1 ? 'ok' : 'no'}">${x >= 1 ? Math.round(x) + '× stronger' : 'below it'}</b></div>
            <small>${s.leak >= LEL ? 'Danger: this much gas can catch fire. Get everyone out and call for help from outside.' : 'If you smell gas: no switches or flames, open windows, turn off the cylinder if safe, leave and call for help (India: 1906).'}</small>`;
        }
        if (s.scene === 'covid') {
          return `<div class="big">Day ${Math.round(s.days)}: ${s.days < 14 ? 'smell reduced or lost' : s.days < 60 ? 'often improving' : 'most have recovered'}</div>
            <div class="row"><span>COVID-19 patients with smell loss, 2020</span><b>roughly 40–50%</b></div>
            <div class="row"><span>With the Omicron variant</span><b>far fewer, about 7%</b></div>
            <div class="row"><span>Reporting lasting problems</span><b>about 1 in 20 of those affected</b></div>
            <small>The recovery here is a simple illustration, not a prediction. If your sense of smell changes, see a doctor.</small>`;
        }
        if (s.scene === 'age') {
          return `<div class="big">Age ${Math.round(s.age)}: loss is ${ageLoss(s.age)}</div>
            <div class="row"><span>Aged 53–97 with measurable loss</span><b>24.5%</b></div>
            <div class="row"><span>Aged 80–97</span><b>62.5%</b></div>
            <div class="row"><span>Many with loss who didn’t know</span><b>most</b></div>
            <small>From a US study of about 2,500 people (Murphy et al., 2002). Smell tests are simple; a doctor can arrange one.</small>`;
        }
        return `<div class="big">${s.swell > 0.6 ? 'Blocked: smells fade' : s.swell > 0.3 ? 'Stuffy' : 'Clear'}</div>
          <div class="row"><span>Swelling of the lining</span><b>${Math.round(s.swell * 100)}%</b></div>
          <div class="row"><span>Air reaching the smell patch</span><b>${s.swell > 0.6 ? 'very little' : s.swell > 0.3 ? 'less than usual' : 'a normal small share'}</b></div>
          <small>A cold usually clears in about a week or two, and smell comes back with it. If it doesn’t, or you lose smell suddenly, see a doctor.</small>`;
      },
    });
  },
};
