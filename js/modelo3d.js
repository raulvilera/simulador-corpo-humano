/* =========================================================================
   CORPO HUMANO 3D — Construção procedural do modelo anatômico (Three.js)
   Unidades ≈ decímetros: a pessoa tem ~17,5 unidades (1,75 m).
   O indivíduo está de frente para +Z; o lado DIREITO dele fica em -X.
   ========================================================================= */
window.construirCorpo = function () {
  const T = THREE;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const EIXO_Y = V(0, 1, 0);

  const raiz = new T.Group();
  raiz.name = "corpo";
  const grupos = {};
  Object.keys(DADOS.sistemas).forEach(id => {
    const g = new T.Group(); g.name = id; grupos[id] = g; raiz.add(g);
  });

  const mats = {};
  const pecas = [];
  const refs = { pivos: [], arterias: [], veias: [], pulmoes: [], fem: null, masc: null };

  /* --------------------------- ponto de referência ---------------------- */
  const ombro = s => V(2.0 * s, 13.9, 0);
  const cotovelo = s => V(2.35 * s, 11.0, -0.05);
  const punho = s => V(2.6 * s, 8.6, 0.05);
  const dedos = s => V(2.72 * s, 7.45, 0.12);
  const quadril = s => V(0.95 * s, 8.6, 0);
  const joelho = s => V(0.85 * s, 4.9, 0.05);
  const tornozelo = s => V(0.8 * s, 0.75, -0.08);
  const ponta = s => V(0.88 * s, 0.15, 1.05);
  const COT_D = cotovelo(-1);
  refs.cotoveloD = COT_D.clone();

  /* --------------------------- utilidades -------------------------------- */
  function material(id, cor, extra) {
    if (!mats[id]) {
      mats[id] = new T.MeshStandardMaterial(Object.assign({ color: cor, roughness: 0.55, metalness: 0.04 }, extra || {}));
      mats[id].userData.corBase = new T.Color(cor);
    }
    return mats[id];
  }
  function pivo(sist) {
    let p = refs.pivos.find(x => x.userData.sistema === sist);
    if (!p) {
      p = new T.Group(); p.position.copy(COT_D); p.userData.sistema = sist;
      grupos[sist].add(p); refs.pivos.push(p);
    }
    return p;
  }
  /* adiciona peça: mesh já posicionada em coordenadas do mundo */
  function P(mesh, id, sist, cor, op) {
    op = op || {};
    mesh.material = op.mat || material(id, cor, op.extra);
    mesh.userData.id = id;
    mesh.userData.sistema = sist;
    if (op.piv) { mesh.position.sub(COT_D); pivo(sist).add(mesh); }
    else (op.pai || grupos[sist]).add(mesh);
    pecas.push(mesh);
    return mesh;
  }
  function cil(a, b, r1, r2, seg) {
    const d = b.clone().sub(a); const L = d.length();
    const m = new T.Mesh(new T.CylinderGeometry(r2, r1, L, seg || 16, 1));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(EIXO_Y, d.normalize());
    return m;
  }
  function fuso(a, b, rx, rz) {
    const d = b.clone().sub(a); const L = d.length();
    const m = new T.Mesh(new T.SphereGeometry(1, 28, 18));
    m.scale.set(rx, L / 2, rz === undefined ? rx : rz);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(EIXO_Y, d.normalize());
    return m;
  }
  function esf(c, r, sx, sy, sz, seg) {
    const m = new T.Mesh(new T.SphereGeometry(r, seg || 28, seg ? Math.max(8, seg * 0.66 | 0) : 18));
    m.position.copy(c); m.scale.set(sx || 1, sy || 1, sz || 1);
    return m;
  }
  function curva(pts) { return new T.CatmullRomCurve3(pts, false, "catmullrom", 0.5); }
  function tubo(pts, r, segs, radial) {
    const c = pts.isCurve ? pts : curva(pts);
    const m = new T.Mesh(new T.TubeGeometry(c, segs || 64, r, radial || 10, false));
    m.userData.curva = c;
    return m;
  }
  function osso(a, b, r, id, op) {
    const cor = 0xefe6cf;
    P(cil(a, b, r, r * 0.9, 14), id, "esqueletico", cor, op);
    P(esf(a, r * 1.55), id, "esqueletico", cor, op);
    P(esf(b, r * 1.45), id, "esqueletico", cor, op);
  }
  function enrugar(geo, amp, freq) {               // relevo de giros e sulcos
    const p = geo.attributes.position, n = geo.attributes.normal, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = Math.sin(v.x * freq) * Math.sin(v.y * freq * 1.3 + v.z * 3) * Math.cos(v.z * freq * 0.9 + v.x * 2);
      p.setXYZ(i, v.x + n.getX(i) * k * amp, v.y + n.getY(i) * k * amp, v.z + n.getZ(i) * k * amp);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const lados = [-1, 1];

  /* =======================================================================
     PELE (silhueta)
  ======================================================================= */
  const matPele = new T.MeshPhysicalMaterial({
    color: 0xe0a07c, roughness: 0.55, metalness: 0, clearcoat: 0.15, sheen: 0.4,
    transparent: true, opacity: 0.18, depthWrite: false
  });
  matPele.userData.corBase = new T.Color(0xe0a07c);
  mats.pele = matPele;
  const PE = (m, op) => P(m, "pele", "tegumentar", 0, Object.assign({ mat: matPele }, op || {}));

  PE(esf(V(0, 16.25, 0.05), 1, 0.95, 1.18, 1.08, 40));
  PE(cil(V(0, 14.4, -0.05), V(0, 15.3, 0.0), 0.62, 0.52, 24));
  // tronco por revolução (perfil anatômico) — achatado no eixo Z
  const perfil = [
    [0.02, 7.85], [0.9, 7.95], [1.45, 8.2], [1.68, 8.8], [1.6, 9.4], [1.42, 9.9], [1.36, 10.4],
    [1.48, 11.2], [1.66, 12.1], [1.8, 13.0], [1.85, 13.6], [1.7, 14.05], [1.25, 14.35], [0.62, 14.55], [0.3, 14.6]
  ].map(p => new T.Vector2(p[0], p[1]));
  const tronco = new T.Mesh(new T.LatheGeometry(perfil, 48));
  tronco.scale.set(1, 1, 0.64);
  PE(tronco);
  lados.forEach(s => {
    PE(esf(ombro(s).clone().add(V(-0.1 * s, 0.05, 0)), 0.55, 1, 0.9, 0.9));
    PE(cil(ombro(s), cotovelo(s), 0.52, 0.38, 24));
    PE(esf(cotovelo(s), 0.37));
    const piv = s < 0;
    PE(cil(cotovelo(s), punho(s), 0.37, 0.25, 24), { piv });
    PE(fuso(punho(s).clone().add(V(0, 0.1, 0)), dedos(s), 0.3, 0.13), { piv });
    PE(cil(quadril(s).clone().add(V(-0.05 * s, 0.2, 0)), joelho(s), 0.88, 0.52, 28));
    PE(esf(joelho(s), 0.52));
    PE(cil(joelho(s), tornozelo(s), 0.53, 0.3, 24));
    PE(esf(tornozelo(s), 0.3));
    PE(fuso(V(0.8 * s, 0.25, -0.4), ponta(s), 0.38, 0.22).rotateX(0));
    // seios / tórax arredondado
  });

  /* =======================================================================
     ESQUELETO
  ======================================================================= */
  const CO = 0xefe6cf;
  // crânio
  const calota = esf(V(0, 16.42, -0.05), 1, 0.86, 0.98, 1.0, 36);
  P(calota, "cranio", "esqueletico", CO);
  P(esf(V(0, 15.95, 0.42), 0.55, 1.05, 0.75, 0.8), "cranio", "esqueletico", CO); // maxila / face
  lados.forEach(s => {
    const orb = esf(V(0.33 * s, 16.32, 0.86), 0.2, 1, 0.85, 0.5);
    P(orb, "cranio", "esqueletico", 0x3a2a22, { extra: { roughness: 0.9 } });
    mats.cranio_orb = orb.material;
  });
  // mandíbula: arco em U
  const mand = tubo([V(-0.72, 15.95, -0.05), V(-0.68, 15.45, 0.25), V(-0.35, 15.25, 0.7), V(0, 15.2, 0.85), V(0.35, 15.25, 0.7), V(0.68, 15.45, 0.25), V(0.72, 15.95, -0.05)], 0.11, 40);
  P(mand, "mandibula", "esqueletico", CO);
  // dentes
  const dentes = tubo([V(-0.38, 15.62, 0.62), V(-0.2, 15.62, 0.84), V(0, 15.62, 0.9), V(0.2, 15.62, 0.84), V(0.38, 15.62, 0.62)], 0.07, 30);
  P(dentes, "boca", "digestorio", 0xfffbf0, { extra: { roughness: 0.2 } });

  // coluna: curva sagital em S
  const colZ = y => -0.55 - 0.12 * Math.sin((y - 9) * 0.9) + (y > 14 ? 0.15 * (y - 14) : 0);
  const pontosColuna = [];
  for (let y = 7.9; y <= 15.35; y += 0.25) pontosColuna.push(V(0, y, colZ(y)));
  let iv = 0;
  for (let y = 8.9; y <= 15.2; y += 0.27) {
    const r = y < 10.4 ? 0.24 : (y > 14.2 ? 0.15 : 0.19);
    const vt = cil(V(0, y, colZ(y)), V(0, y + 0.19, colZ(y + 0.19)), r, r, 14);
    P(vt, "coluna", "esqueletico", CO);
    P(fuso(V(0, y + 0.08, colZ(y) - r * 0.8), V(0, y - 0.05, colZ(y) - r * 0.8 - 0.32), 0.05, 0.06), "coluna", "esqueletico", CO);
    iv++;
  }
  // sacro e cóccix
  P(fuso(V(0, 9.0, -0.62), V(0, 7.9, -0.35), 0.32, 0.14), "pelve", "esqueletico", CO);

  // caixa torácica — 12 pares de costelas
  for (let i = 0; i < 12; i++) {
    const y = 14.05 - i * 0.33;
    const larg = 0.75 + Math.min(i, 6) * 0.13 - Math.max(0, i - 8) * 0.06;
    const fren = i < 7 ? 0.92 : (i < 10 ? 0.75 : 0.25);
    lados.forEach(s => {
      const pts = [V(0.22 * s, y, colZ(y) + 0.05), V(larg * 0.75 * s, y + 0.05, colZ(y) - 0.12), V(larg * s, y - 0.25, 0.0)];
      if (i < 10) pts.push(V(larg * 0.75 * s, y - 0.55, fren * 0.85), V(0.2 * s, y - (i < 7 ? 0.5 + i * 0.07 : 0.9), fren));
      else pts.push(V(larg * 0.85 * s, y - 0.45, fren));
      P(tubo(pts, 0.055, 40, 6), "costelas", "esqueletico", CO);
    });
  }
  P(new T.Mesh(new T.BoxGeometry(0.32, 2.0, 0.1)).translateX(0).translateY(12.75).translateZ(0.97), "esterno", "esqueletico", CO);
  lados.forEach(s => {
    P(tubo([V(0.15 * s, 14.1, 0.85), V(0.8 * s, 14.25, 0.75), V(1.5 * s, 14.25, 0.25), V(1.85 * s, 14.2, -0.05)], 0.07, 24), "clavicula", "esqueletico", CO);
    const esc = esf(V(1.15 * s, 13.15, -0.82), 0.6, 0.75, 1.15, 0.12);
    esc.rotation.z = 0.25 * s; esc.rotation.y = -0.35 * s;
    P(esc, "escapula", "esqueletico", CO);
    // membro superior
    osso(ombro(s).clone().add(V(-0.1 * s, 0, 0)), cotovelo(s), 0.12, "umero");
    const piv = s < 0;
    const c = cotovelo(s), p = punho(s);
    osso(c.clone().add(V(0.08 * s, 0, 0.08)), p.clone().add(V(0.05 * s, 0, 0.1)), 0.075, "radio", { piv });
    osso(c.clone().add(V(-0.07 * s, 0.1, -0.08)), p.clone().add(V(-0.06 * s, 0, -0.06)), 0.07, "radio", { piv });
    for (let d = 0; d < 5; d++) {          // metacarpos e falanges
      const ang = (d - 2) * 0.09;
      const base = p.clone().add(V((d - 2) * 0.08 * s, -0.18, 0.05));
      const meio = base.clone().add(V(Math.sin(ang) * 0.4 * s, -0.5, 0.03));
      const fim = meio.clone().add(V(Math.sin(ang) * 0.3 * s, d === 0 ? -0.25 : -0.5, 0.06));
      if (d === 0) { base.add(V(0.12 * s, 0.1, 0.12)); meio.add(V(0.15 * s, 0.2, 0.15)); fim.add(V(0.12 * s, 0.25, 0.12)); }
      P(cil(base, meio, 0.035, 0.03, 8), "mao", "esqueletico", CO, { piv });
      P(cil(meio, fim, 0.03, 0.022, 8), "mao", "esqueletico", CO, { piv });
    }
    // pelve: ílio
    const ilio = esf(V(0.82 * s, 9.15, -0.25), 0.75, 0.85, 0.8, 0.18);
    ilio.rotation.y = 0.65 * s; ilio.rotation.z = -0.25 * s;
    P(ilio, "pelve", "esqueletico", CO);
    P(tubo([V(0.75 * s, 8.6, -0.35), V(0.95 * s, 8.25, 0.0), V(0.55 * s, 8.0, 0.45), V(0.08 * s, 8.15, 0.55)], 0.11, 24), "pelve", "esqueletico", CO);
    P(esf(quadril(s), 0.2), "pelve", "esqueletico", CO);
    // membro inferior
    const q = quadril(s), j = joelho(s), t = tornozelo(s);
    P(cil(q, q.clone().add(V(0.38 * s, -0.25, 0)), 0.1, 0.12), "femur", "esqueletico", CO);
    osso(q.clone().add(V(0.38 * s, -0.3, 0)), j, 0.14, "femur");
    P(esf(j.clone().add(V(0, 0, 0.22)), 0.13, 1, 1.2, 0.6), "patela", "esqueletico", CO);
    osso(j.clone().add(V(-0.03 * s, -0.12, 0)), t.clone(), 0.12, "tibia");
    osso(j.clone().add(V(0.18 * s, -0.25, -0.1)), t.clone().add(V(0.2 * s, 0, -0.05)), 0.05, "tibia");
    P(esf(V(0.8 * s, 0.35, -0.38), 0.2, 1, 0.9, 1.2), "pe", "esqueletico", CO);          // calcâneo
    for (let d = 0; d < 5; d++) {
      const b = V((0.8 + (d - 2) * 0.07) * s, 0.42, 0.15);
      const f = V((0.82 + (d - 2) * 0.1) * s, 0.12, 0.98 - Math.abs(d - 1) * 0.08);
      P(cil(b, f, 0.04, 0.03, 8), "pe", "esqueletico", CO);
    }
  });

  /* =======================================================================
     MÚSCULOS
  ======================================================================= */
  const CM = 0xb5413b, CM2 = 0xa3362f, CT = 0xe9dcc9;
  const fibras = { roughness: 0.62 };
  const M = (m, id, op) => P(m, id, "muscular", id === "abdominal" ? CM2 : CM, Object.assign({ extra: fibras }, op || {}));
  lados.forEach(s => {
    M(fuso(V(0.62 * s, 16.0, 0.35), V(0.55 * s, 15.35, 0.55), 0.16, 0.12), "temporal_m");
    M(fuso(V(0.72 * s, 16.7, 0.1), V(0.7 * s, 16.0, 0.25), 0.2, 0.1), "temporal_m");
    M(tubo([V(0.55 * s, 15.6, -0.25), V(0.4 * s, 14.9, 0.2), V(0.12 * s, 14.25, 0.75)], 0.11, 20), "esternocleido");
    const trap = tubo([V(0.1 * s, 15.3, -0.55), V(0.7 * s, 14.5, -0.6), V(1.8 * s, 14.1, -0.25)], 0.22, 24);
    M(trap, "trapezio");
    M(fuso(V(0.15 * s, 14.2, -0.8), V(0.25 * s, 11.6, -0.9), 0.55, 0.12), "trapezio");
    M(esf(ombro(s).clone().add(V(0.05 * s, -0.25, 0)), 0.46, 0.85, 1.25, 0.95), "deltoide");
    const pe = M(fuso(V(0.2 * s, 13.55, 0.92), V(1.5 * s, 13.3, 0.5), 0.5, 0.1), "peitoral");
    pe.rotateZ(0.0);
    // braço
    const o = ombro(s), c = cotovelo(s), p = punho(s);
    const bic = M(fuso(o.clone().lerp(c, 0.18).add(V(0, 0, 0.18)), c.clone().add(V(0, 0.15, 0.17)), 0.23, 0.22), "biceps");
    const tri = M(fuso(o.clone().lerp(c, 0.1).add(V(0, 0, -0.2)), c.clone().add(V(0, 0.1, -0.2)), 0.25, 0.21), "triceps");
    if (s < 0) { refs.biceps = bic; refs.triceps = tri; }
    const piv = s < 0;
    M(fuso(c.clone().add(V(0.05 * s, -0.1, 0.08)), p.clone().add(V(0, 0.2, 0.05)), 0.23, 0.2), "antebraco_m", { piv });
    // abdome
    if (s > 0) for (let k = 0; k < 4; k++) {
      const y = 11.6 - k * 0.55;
      lados.forEach(s2 => {
        const g = new T.Mesh(new T.CapsuleGeometry(0.15, 0.22, 4, 12));
        g.position.set(0.25 * s2, y, 0.98); g.scale.set(1.25, 1, 0.32);
        M(g, "abdominal");
      });
    }
    M(fuso(V(1.3 * s, 12.0, 0.4), V(1.05 * s, 9.3, 0.55), 0.3, 0.32), "obliquo");
    M(esf(V(0.7 * s, 8.4, -0.75), 0.62, 1, 1.05, 0.75), "gluteo");
    // coxa e perna
    const q = quadril(s), j = joelho(s), t = tornozelo(s);
    M(fuso(q.clone().add(V(-0.05 * s, 0.0, 0.35)), j.clone().add(V(0, 0.35, 0.25)), 0.5, 0.36), "quadriceps");
    M(fuso(q.clone().add(V(-0.05 * s, -0.4, -0.35)), j.clone().add(V(0, 0.4, -0.3)), 0.45, 0.33), "isquiotibiais");
    M(fuso(j.clone().add(V(0, -0.2, -0.22)), t.clone().add(V(0, 1.6, -0.2)), 0.36, 0.3), "panturrilha");
    P(cil(t.clone().add(V(0, 1.7, -0.25)), V(0.8 * s, 0.45, -0.42), 0.09, 0.06), "panturrilha", "muscular", CT);
    M(fuso(j.clone().add(V(0.12 * s, -0.4, 0.2)), t.clone().add(V(0.0, 0.6, 0.15)), 0.17, 0.15), "tibial");
  });
  // diafragma (cúpula)
  const diaf = new T.Mesh(new T.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2));
  diaf.scale.set(1.5, 0.55, 0.95); diaf.position.set(0, 10.9, -0.05);
  P(diaf, "diafragma", "respiratorio", 0xc0504a, { extra: { side: T.DoubleSide, roughness: 0.6 } });
  refs.diafragma = diaf;

  /* =======================================================================
     SISTEMA NERVOSO
  ======================================================================= */
  const CN = 0xf4d35e, CB = 0xf0b9c4;
  lados.forEach(s => {
    const g = enrugar(new T.SphereGeometry(0.5, 64, 48), 0.035, 26);
    const h = new T.Mesh(g); h.position.set(0.25 * s, 16.55, 0.02); h.scale.set(0.95, 1.12, 1.82);
    P(h, "cerebro", "nervoso", CB, { extra: { roughness: 0.75 } });
  });
  const cb = new T.Mesh(enrugar(new T.SphereGeometry(0.42, 48, 32), 0.02, 40));
  cb.position.set(0, 15.98, -0.62); cb.scale.set(1.45, 0.7, 0.9);
  P(cb, "cerebelo", "nervoso", 0xe39fae, { extra: { roughness: 0.8 } });
  P(cil(V(0, 16.3, -0.1), V(0, 15.35, -0.42), 0.16, 0.12), "tronco_encefalico", "nervoso", 0xe8b3a0);
  const ptsMedula = pontosColuna.filter(p => p.y > 9.9).map(p => V(0, p.y, p.z - 0.0));
  ptsMedula.push(V(0, 15.4, -0.42));
  const med = tubo(ptsMedula, 0.075, 80);
  P(med, "medula", "nervoso", CN);
  refs.medula = med.userData.curva;
  // cauda equina e nervo isquiático
  lados.forEach(s => {
    P(tubo([V(0.03 * s, 10.0, colZ(10)), V(0.1 * s, 9.0, -0.62), V(0.45 * s, 8.4, -0.5), V(0.8 * s, 7.9, -0.35), joelho(s).clone().add(V(0, 0.4, -0.3)), V(0.82 * s, 2.5, -0.25), V(0.8 * s, 0.5, -0.05), V(0.85 * s, 0.25, 0.8)], 0.045, 100, 6), "nervos", "nervoso", CN);
    // plexo braquial + nervo do braço (até o cotovelo)
    const yb = 14.3;
    const bra = [V(0.05 * s, yb, colZ(yb) + 0.05), V(0.65 * s, 14.1, -0.3), V(1.75 * s, 13.6, -0.05), ombro(s).lerp(cotovelo(s), 0.5).add(V(0.05 * s, 0, 0.12)), cotovelo(s).clone().add(V(0, 0.05, 0.12))];
    const nb = P(tubo(bra, 0.04, 60, 6), "nervos", "nervoso", CN);
    const ant = [cotovelo(s).clone().add(V(0, 0.05, 0.12)), cotovelo(s).lerp(punho(s), 0.5).add(V(0, 0, 0.12)), punho(s).clone().add(V(0, 0, 0.1)), dedos(s).clone().add(V(0, 0.2, 0.05))];
    const na = P(tubo(ant, 0.035, 40, 6), "nervos", "nervoso", CN, { piv: s < 0 });
    if (s < 0) { refs.nervoBraco = curva(bra.slice().reverse()); refs.nervoAntebraco = curva(ant.slice().reverse()); refs.motorBiceps = curva(bra.slice(0, 4).concat([refs.biceps.position.clone()])); }
    // nervos intercostais
    for (let i = 2; i < 11; i += 2) {
      const y = 13.85 - i * 0.33;
      P(tubo([V(0.12 * s, y - 0.08, colZ(y)), V((0.9 + i * 0.05) * s, y - 0.2, -0.15), V(0.85 * s, y - 0.55, 0.7)], 0.02, 24, 5), "nervos", "nervoso", CN);
    }
  });

  /* =======================================================================
     ÓRGÃOS DOS SENTIDOS
  ======================================================================= */
  lados.forEach(s => {
    const olho = esf(V(0.33 * s, 16.32, 0.92), 0.16);
    P(olho, "olho", "sensorial", 0xfafafa, { extra: { roughness: 0.15 } });
    const iris = new T.Mesh(new T.CircleGeometry(0.075, 24)); iris.position.set(0.33 * s, 16.32, 1.081);
    P(iris, "olho", "sensorial", 0, { mat: material("olho_iris", 0x4a7a3a, { roughness: 0.3 }) }).userData.id = "olho";
    const pup = new T.Mesh(new T.CircleGeometry(0.035, 20)); pup.position.set(0.33 * s, 16.32, 1.083);
    P(pup, "olho", "sensorial", 0, { mat: material("olho_pupila", 0x050505) }).userData.id = "olho";
    P(tubo([V(0.33 * s, 16.32, 0.76), V(0.18 * s, 16.3, 0.45), V(0.05 * s, 16.25, 0.25)], 0.03, 16, 6), "nervos", "nervoso", CN);
    const orelha = new T.Mesh(new T.TorusGeometry(0.22, 0.07, 10, 24));
    orelha.position.set(0.93 * s, 16.2, -0.05); orelha.rotation.y = Math.PI / 2; orelha.scale.set(1, 1.45, 1);
    P(orelha, "orelha", "sensorial", 0xe7a07d);
    const coclea = new T.Mesh(new T.TorusGeometry(0.07, 0.03, 8, 20, Math.PI * 1.7));
    coclea.position.set(0.65 * s, 16.12, -0.05); coclea.rotation.y = Math.PI / 2;
    P(coclea, "orelha", "sensorial", 0xf1c27d);
  });
  const nariz = new T.Mesh(new T.ConeGeometry(0.16, 0.5, 4)); nariz.position.set(0, 16.05, 1.12); nariz.rotation.x = -0.25; nariz.rotation.y = Math.PI / 4;
  P(nariz, "nariz", "sensorial", 0xd98b6d);
  P(esf(V(0, 15.58, 0.5), 0.3, 0.9, 0.3, 1.1), "lingua", "sensorial", 0xe06b7b);

  /* =======================================================================
     SISTEMA RESPIRATÓRIO
  ======================================================================= */
  P(cil(V(0, 15.2, 0.25), V(0, 14.45, 0.45), 0.16, 0.15), "laringe", "respiratorio", 0xe8a0b0);
  const traq = P(cil(V(0, 14.45, 0.45), V(0, 13.0, 0.25), 0.115, 0.115), "traqueia", "respiratorio", 0xf2c4cf);
  for (let y = 13.15; y < 14.4; y += 0.16) {
    const anel = new T.Mesh(new T.TorusGeometry(0.12, 0.022, 6, 16)); anel.rotation.x = Math.PI / 2 - 0.12;
    anel.position.set(0, y, 0.25 + (y - 13) * 0.137);
    P(anel, "traqueia", "respiratorio", 0xf8dfe5);
  }
  lados.forEach(s => {
    P(tubo([V(0, 13.0, 0.25), V(0.35 * s, 12.75, 0.18), V(0.7 * s, 12.45, 0.1)], 0.075, 20), "bronquios", "respiratorio", 0xf2c4cf);
    P(tubo([V(0.7 * s, 12.45, 0.1), V(0.95 * s, 12.0, 0.15), V(1.05 * s, 11.55, 0.1)], 0.045, 16), "bronquios", "respiratorio", 0xf2c4cf);
    P(tubo([V(0.7 * s, 12.45, 0.1), V(1.0 * s, 12.85, 0.0), V(1.1 * s, 13.25, 0.0)], 0.045, 16), "bronquios", "respiratorio", 0xf2c4cf);
    const pg = new T.SphereGeometry(1, 40, 30);
    const pul = new T.Mesh(pg);
    const dir = s < 0;
    pul.position.set((dir ? 0.88 : 0.95) * s, 12.45, 0.02);
    pul.scale.set(dir ? 0.72 : 0.62, 1.45, 0.82);
    P(pul, dir ? "pulmao_d" : "pulmao_e", "respiratorio", 0xf49cbb, { extra: { transparent: true, opacity: 0.82, roughness: 0.7 } });
    refs.pulmoes.push(pul);
    pul.userData.escalaBase = pul.scale.clone();
  });

  /* =======================================================================
     SISTEMA CARDIOVASCULAR
  ======================================================================= */
  const CA = 0xd62839, CV = 0x2f5fd0;
  const coracao = new T.Group(); coracao.position.set(0.25, 12.15, 0.45); coracao.rotation.z = -0.45; coracao.rotation.x = 0.2;
  grupos.circulatorio.add(coracao); refs.coracao = coracao;
  const ventr = esf(V(0, -0.1, 0), 0.5, 0.95, 1.15, 0.85, 36);
  ventr.geometry.translate(0, 0, 0);
  // ápice afunilado
  (function () {
    const p = ventr.geometry.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (v.y < 0) { const k = 1 + v.y * 0.9; p.setXYZ(i, v.x * k, v.y * 1.1, v.z * k); } }
    ventr.geometry.computeVertexNormals();
  })();
  P(ventr, "coracao", "circulatorio", 0xb3202e, { pai: coracao, extra: { roughness: 0.4 } });
  P(esf(V(-0.28, 0.42, 0.05), 0.27), "coracao", "circulatorio", 0x5a5fc8, { pai: coracao });   // átrio direito
  P(esf(V(0.25, 0.45, -0.05), 0.25), "coracao", "circulatorio", 0xc8323f, { pai: coracao });  // átrio esquerdo
  // aorta
  const aortaPts = [V(0.2, 12.7, 0.45), V(0.15, 13.35, 0.42), V(-0.05, 13.6, 0.15), V(-0.2, 13.35, -0.2), V(-0.15, 12.6, -0.32), V(-0.08, 11.2, -0.32), V(0, 9.9, -0.2), V(0, 9.2, -0.1)];
  const aorta = P(tubo(aortaPts, 0.12, 60), "aorta", "circulatorio", CA, { extra: { roughness: 0.35 } });
  refs.arterias.push(aorta.userData.curva);
  const ART = (pts, r, op) => { const m = P(tubo(pts, r || 0.05, 60, 8), "arterias", "circulatorio", CA, Object.assign({ extra: { roughness: 0.35 } }, op || {})); if (!(op && op.piv)) refs.arterias.push(m.userData.curva); return m; };
  const VEI = (pts, r, op) => { const m = P(tubo(pts, r || 0.05, 60, 8), "veias", "circulatorio", CV, Object.assign({ extra: { roughness: 0.35 } }, op || {})); if (!(op && op.piv)) refs.veias.push(m.userData.curva); return m; };
  lados.forEach(s => {
    // carótidas e jugulares
    ART([V(-0.02 + 0.05 * s, 13.55, 0.2), V(0.28 * s, 14.4, 0.25), V(0.35 * s, 15.3, 0.2), V(0.45 * s, 16.0, 0.1), V(0.3 * s, 16.8, 0.0)], 0.045);
    VEI([V(0.55 * s, 16.4, -0.1), V(0.45 * s, 15.3, 0.05), V(0.38 * s, 14.4, 0.15), V(0.25 * s, 13.7, 0.45)], 0.055);
    // subclávias → braquiais → (antebraço)
    ART([V(-0.05, 13.55, 0.15), V(0.7 * s, 13.95, 0.2), V(1.75 * s, 13.65, 0.05), ombro(s).lerp(cotovelo(s), 0.5).add(V(-0.12 * s, 0, 0.08)), cotovelo(s).clone().add(V(-0.05 * s, 0, 0.1))], 0.045);
    ART([cotovelo(s).clone().add(V(-0.05 * s, 0, 0.1)), cotovelo(s).lerp(punho(s), 0.5).add(V(0.05 * s, 0, 0.1)), punho(s).clone().add(V(0.08 * s, 0, 0.12)), dedos(s).clone().add(V(0, 0.35, 0.08))], 0.035, { piv: s < 0 });
    VEI([cotovelo(s).clone().add(V(0.1 * s, 0, 0.0)), ombro(s).lerp(cotovelo(s), 0.5).add(V(0.12 * s, 0, -0.05)), V(1.75 * s, 13.55, -0.05), V(0.75 * s, 13.8, 0.1), V(0.35, 13.6, 0.45)], 0.045);
    VEI([dedos(s).clone().add(V(0.05 * s, 0.4, 0.0)), punho(s).clone().add(V(-0.05 * s, 0, 0.0)), cotovelo(s).lerp(punho(s), 0.5).add(V(-0.06 * s, 0, -0.02)), cotovelo(s).clone().add(V(0.1 * s, 0, 0.0))], 0.035, { piv: s < 0 });
    // ilíacas → femorais
    const q = quadril(s), j = joelho(s), t = tornozelo(s);
    ART([V(0, 9.2, -0.1), V(0.45 * s, 8.75, 0.1), q.clone().add(V(-0.2 * s, -0.2, 0.35)), q.clone().lerp(j, 0.5).add(V(-0.2 * s, 0, 0.2)), j.clone().add(V(0, 0, -0.2)), t.clone().add(V(-0.05 * s, 1.5, 0.15)), t.clone().add(V(0, 0, 0.25)), ponta(s).clone().add(V(0, 0.15, -0.3))], 0.05);
    VEI([ponta(s).clone().add(V(-0.08 * s, 0.15, -0.35)), t.clone().add(V(-0.15 * s, 0.05, 0.1)), t.clone().add(V(-0.2 * s, 1.6, 0.0)), j.clone().add(V(-0.25 * s, 0, -0.05)), q.clone().lerp(j, 0.5).add(V(-0.32 * s, 0, 0.1)), q.clone().add(V(-0.35 * s, -0.2, 0.3)), V(0.45 * s, 8.85, 0.0), V(0.25, 9.25, -0.05)], 0.055);
    // artérias renais e pulmonares
    ART([V(0, 10.2, -0.22), V(0.6 * s, 10.15 - (s < 0 ? 0.2 : 0), -0.42)], 0.03);
    P(tubo([V(0.05, 12.55, 0.5), V(0.3 * s, 12.65, 0.35), V(0.75 * s, 12.5, 0.12)], 0.06, 20), "pulmonares_v", "circulatorio", 0x5c4ec9);
    P(tubo([V(0.75 * s, 12.2, 0.1), V(0.4 * s, 12.15, 0.15), V(0.25, 12.3, 0.25)], 0.05, 20), "pulmonares_v", "circulatorio", 0xe0405a);
  });
  const cs = P(tubo([V(0.35, 13.65, 0.45), V(0.38, 13.0, 0.42), V(0.0, 12.55, 0.48)], 0.09, 20), "veia_cava", "circulatorio", CV);
  const ci = P(tubo([V(0.25, 9.25, -0.05), V(0.25, 10.2, -0.15), V(0.25, 11.0, 0.05), V(0.05, 11.8, 0.35)], 0.1, 30), "veia_cava", "circulatorio", CV);
  refs.veias.push(cs.userData.curva, ci.userData.curva);

  /* =======================================================================
     SISTEMA DIGESTÓRIO
  ======================================================================= */
  const CD = 0xf6ae2d;
  const esofPts = [V(0, 15.45, 0.45), V(0, 15.15, 0.05), V(0, 14.4, 0.12), V(0.0, 13.2, 0.0), V(0.1, 12.0, -0.05), V(0.35, 11.15, 0.1)];
  const esof = P(tubo(esofPts, 0.075, 50), "esofago", "digestorio", 0xe8877a);
  const estPts = [V(0.35, 11.15, 0.1), V(0.7, 11.2, 0.25), V(0.95, 10.85, 0.35), V(0.85, 10.3, 0.45), V(0.45, 10.05, 0.5), V(0.1, 10.1, 0.5)];
  const est = P(tubo(estPts, 0.32, 60, 20), "estomago", "digestorio", 0xe5897f, { extra: { roughness: 0.45 } });
  P(esf(V(0.62, 11.2, 0.22), 0.36), "estomago", "digestorio", 0xe5897f);
  const fig = esf(V(-0.55, 10.95, 0.28), 1, 1.1, 0.52, 0.72, 40);
  fig.rotation.z = 0.28;
  P(fig, "figado", "digestorio", 0x7a2a22, { extra: { roughness: 0.4 } });
  P(fuso(V(-0.35, 10.6, 0.78), V(-0.42, 10.2, 0.82), 0.11), "vesicula", "digestorio", 0x4d8a3c);
  P(fuso(V(-0.2, 10.05, 0.0), V(1.05, 10.35, -0.15), 0.12, 0.1), "pancreas", "digestorio", 0xf3c58a);
  // intestino delgado: alças serpenteando
  const idPts = [V(0.1, 10.1, 0.5), V(-0.25, 10.0, 0.4), V(-0.3, 9.75, 0.35), V(0.05, 9.7, 0.3)];
  let fila = 0;
  for (let y = 9.65; y >= 8.7; y -= 0.19) {
    const dirx = fila % 2 === 0 ? 1 : -1;
    for (let k = 0; k <= 6; k++) {
      const x = dirx * (-0.72 + k * 0.24);
      idPts.push(V(x, y + 0.05 * Math.sin(k * 1.7), 0.38 + 0.18 * Math.sin(k * 1.3 + fila)));
    }
    fila++;
  }
  idPts.push(V(-0.95, 8.7, 0.4));
  const idel = P(tubo(idPts, 0.1, 500, 10), "intestino_delgado", "digestorio", 0xf0a58f, { extra: { roughness: 0.5 } });
  const igPts = [V(-0.95, 8.7, 0.4), V(-1.05, 9.2, 0.38), V(-1.05, 9.95, 0.35), V(-0.6, 10.15, 0.62), V(0.3, 10.0, 0.7), V(1.05, 10.2, 0.4), V(1.1, 9.4, 0.3), V(1.0, 8.75, 0.3), V(0.55, 8.4, 0.15), V(0.15, 8.35, -0.1), V(0, 7.95, -0.3), V(0, 7.6, -0.25)];
  const igr = P(tubo(igPts, 0.19, 120, 14), "intestino_grosso", "digestorio", 0xc98a5e, { extra: { roughness: 0.6 } });
  P(tubo([V(-0.95, 8.65, 0.4), V(-0.9, 8.35, 0.42), V(-0.75, 8.2, 0.5)], 0.04, 12), "apendice", "digestorio", 0xc98a5e);
  refs.trajetoDigestao = [
    { nome: "Boca", curva: curva([V(0, 15.6, 1.0), V(0, 15.6, 0.7), V(0, 15.45, 0.45)]), dur: 3, texto: "BOCA — Mastigação (digestão mecânica) e saliva com amilase salivar, que inicia a digestão do amido. Forma-se o bolo alimentar.", tempo: "≈ 5 a 30 segundos" },
    { nome: "Esôfago", curva: esof.userData.curva, dur: 3, texto: "FARINGE e ESÔFAGO — A deglutição empurra o bolo; a epiglote fecha a laringe. Movimentos peristálticos levam o alimento ao estômago.", tempo: "≈ 5 a 10 segundos" },
    { nome: "Estômago", curva: est.userData.curva, dur: 5, texto: "ESTÔMAGO — Suco gástrico (HCl + pepsina) digere proteínas. O bolo vira QUIMO.", tempo: "≈ 2 a 4 horas" },
    { nome: "Intestino delgado", curva: idel.userData.curva, dur: 10, texto: "INTESTINO DELGADO — Bile (fígado) emulsiona gorduras; suco pancreático e entérico completam a digestão. Vilosidades ABSORVEM os nutrientes, que vão para o SANGUE.", tempo: "≈ 3 a 5 horas" },
    { nome: "Intestino grosso", curva: igr.userData.curva, dur: 6, texto: "INTESTINO GROSSO — Absorção de água e sais; bactérias da microbiota fermentam fibras. Formação e eliminação das fezes.", tempo: "≈ 12 a 48 horas" }
  ];

  /* =======================================================================
     SISTEMA URINÁRIO
  ======================================================================= */
  lados.forEach(s => {
    const dir = s < 0;
    const y = dir ? 9.95 : 10.2;
    const rim = esf(V(0.68 * s, y, -0.45), 1, 0.27, 0.48, 0.22, 32);
    rim.rotation.z = 0.15 * s;
    P(rim, dir ? "rim_d" : "rim_e", "urinario", 0x8b3a3a, { extra: { roughness: 0.45 } });
    P(tubo([V(0.55 * s, y - 0.3, -0.38), V(0.45 * s, 9.2, -0.25), V(0.35 * s, 8.5, 0.15), V(0.15 * s, 8.15, 0.4)], 0.028, 40, 6), "ureteres", "urinario", 0xe9c46a);
    const adr = new T.Mesh(new T.ConeGeometry(0.17, 0.25, 12)); adr.position.set(0.65 * s, y + 0.55, -0.45);
    P(adr, "adrenais", "endocrino", 0xb388eb);
    VEI([V(0.6 * s, y, -0.4), V(0.25, 10.15 + (dir ? -0.1 : 0), -0.18)], 0.035);
  });
  const bex = esf(V(0, 8.1, 0.45), 0.3, 1.1, 0.9, 0.95);
  P(bex, "bexiga", "urinario", 0xe9c46a, { extra: { transparent: true, opacity: 0.92 } });
  refs.bexiga = bex; bex.userData.escalaBase = bex.scale.clone();

  /* =======================================================================
     SISTEMA ENDÓCRINO
  ======================================================================= */
  const CE = 0x9b5de5;
  P(esf(V(0, 16.28, 0.12), 0.09), "hipotalamo", "endocrino", 0xc77dff);
  P(esf(V(0, 16.08, 0.22), 0.07, 1, 0.8, 1), "hipofise", "endocrino", CE);
  P(esf(V(0, 16.45, -0.28), 0.06, 1, 1.3, 1), "pineal", "endocrino", CE);
  lados.forEach(s => {
    const lobo = esf(V(0.17 * s, 14.68, 0.48), 0.12, 0.8, 1.5, 0.6); P(lobo, "tireoide", "endocrino", CE);
  });
  P(cil(V(-0.12, 14.6, 0.56), V(0.12, 14.6, 0.56), 0.05, 0.05), "tireoide", "endocrino", CE);
  refs.hipofise = mats.hipofise; refs.hipotalamo = mats.hipotalamo;

  /* =======================================================================
     SISTEMA LINFÁTICO / IMUNE
  ======================================================================= */
  const CL = 0x43aa8b;
  P(esf(V(0, 13.55, 0.62), 0.25, 1.1, 1.3, 0.4), "timo", "linfatico", 0x7bc8a4);
  P(esf(V(1.1, 10.65, -0.35), 0.3, 0.75, 1.1, 0.7), "baco", "linfatico", 0x6a2c70);
  lados.forEach(s => {
    P(esf(V(0.17 * s, 15.42, 0.32), 0.06, 1, 1.4, 1), "tonsilas", "linfatico", CL);
    const grupoLinf = [V(0.5 * s, 15.0, 0.2), V(0.55 * s, 14.75, 0.05), V(0.45 * s, 14.55, 0.3), V(1.6 * s, 13.2, 0.1), V(1.5 * s, 13.0, -0.1), V(1.65 * s, 12.9, 0.05), V(0.7 * s, 8.35, 0.5), V(0.8 * s, 8.15, 0.45), V(0.6 * s, 8.15, 0.55), V(0.3 * s, 9.5, -0.05), V(0.25 * s, 10.0, 0.0)];
    grupoLinf.forEach(p => P(esf(p, 0.07, 1, 0.75, 0.75, 10), "linfonodos", "linfatico", 0x2a9d8f));
    P(tubo([V(0.75 * s, 8.15, 0.45), V(0.4 * s, 9.0, 0.0), V(0.15 * s, 10.0, -0.1), V(0.05 * s, 12.0, -0.2), V(-0.25, 13.6, 0.1), V(-0.4, 13.8, 0.2)], 0.02, 60, 5), "vasos_linfaticos", "linfatico", CL);
    P(tubo([V(1.6 * s, 13.0, 0.0), V(1.0 * s, 13.5, 0.1), V(0.45 * s, 13.75, 0.2)], 0.02, 30, 5), "vasos_linfaticos", "linfatico", CL);
    P(tubo([V(0.5 * s, 14.75, 0.1), V(0.42 * s, 14.1, 0.2), V(0.4 * s, 13.8, 0.2)], 0.02, 20, 5), "vasos_linfaticos", "linfatico", CL);
  });

  /* =======================================================================
     SISTEMA GENITAL (feminino e masculino — esquemático)
  ======================================================================= */
  const fem = new T.Group(); fem.name = "feminino"; grupos.reprodutor.add(fem); refs.fem = fem;
  const masc = new T.Group(); masc.name = "masculino"; grupos.reprodutor.add(masc); refs.masc = masc;
  const CR = 0xff8fab;
  const ut = esf(V(0, 8.55, 0.15), 0.25, 1.1, 1.3, 0.75);
  P(ut, "utero", "reprodutor", 0xe56b8c, { pai: fem });
  lados.forEach(s => {
    P(tubo([V(0.22 * s, 8.75, 0.15), V(0.45 * s, 8.85, 0.12), V(0.62 * s, 8.7, 0.05), V(0.6 * s, 8.5, 0.12)], 0.03, 24, 6), "tubas", "reprodutor", CR, { pai: fem });
    P(esf(V(0.55 * s, 8.48, 0.08), 0.1, 1.3, 0.8, 0.8), "ovarios", "reprodutor", 0xc77dff, { pai: fem });
  });
  P(cil(V(0, 8.25, 0.15), V(0, 7.75, 0.3), 0.08, 0.07), "vagina", "reprodutor", 0xf4a6b8, { pai: fem });
  refs.gonadasF = mats.ovarios;
  lados.forEach(s => {
    P(esf(V(0.17 * s, 7.6, 0.55), 0.13, 0.85, 1.15, 0.9), "testiculos", "reprodutor", 0xc77dff, { pai: masc });
    P(tubo([V(0.2 * s, 7.7, 0.48), V(0.35 * s, 8.1, 0.55), V(0.35 * s, 8.4, 0.35), V(0.2 * s, 8.25, 0.1), V(0.06 * s, 7.95, 0.15)], 0.025, 30, 6), "ductos", "reprodutor", CR, { pai: masc });
    P(esf(V(0.14 * s, 8.05, 0.12), 0.08, 0.7, 1.4, 0.7), "prostata", "reprodutor", 0xe76f8f, { pai: masc });
  });
  P(esf(V(0, 7.85, 0.2), 0.14), "prostata", "reprodutor", 0xe76f8f, { pai: masc });
  P(cil(V(0, 7.9, 0.6), V(0, 7.45, 0.82), 0.11, 0.1), "penis", "reprodutor", 0xe9a08f, { pai: masc });
  refs.gonadasM = mats.testiculos;
  masc.visible = false;

  /* ---- sombras/realces ---- */
  pecas.forEach(m => { m.castShadow = false; m.receiveShadow = false; });

  return { raiz, grupos, pecas, mats, refs };
};
