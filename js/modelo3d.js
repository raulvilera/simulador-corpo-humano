/* =========================================================================
   CORPO HUMANO 3D — Modelo anatômico realista
   Malhas reais de:
     • BodyParts3D, (c) The Database Center for Life Science — CC BY 4.0
       (reconstrução 3D a partir de ressonância magnética de um adulto)
     • HuBMAP Human Reference Atlas — 3D Reference Organs (Visible Human) — CC BY 4.0
       (pulmões, medula espinal, tonsilas, corpo e órgãos genitais femininos)
   As malhas foram simplificadas e compactadas (meshoptimizer) e ficam em /modelos.
   Unidades ≈ decímetros: a pessoa tem ~17,2 unidades. Frente = +Z; lado DIREITO = -X.
   ========================================================================= */
window.construirCorpo = async function (aoProgresso) {
  const T = THREE;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const VA = a => new T.Vector3(a[0], a[1], a[2]);
  const progresso = aoProgresso || (() => { });

  const raiz = new T.Group(); raiz.name = "corpo";
  const grupos = {};
  Object.keys(DADOS.sistemas).forEach(id => { const g = new T.Group(); g.name = id; grupos[id] = g; raiz.add(g); });
  const mats = {}, pecas = [];
  const TR = window.TRAJETOS;
  const refs = { pivos: [], arterias: [], veias: [], pulmoes: [] };
  const COT = VA(TR.ref.cotovelo);
  refs.cotoveloD = COT.clone();

  /* ------------------------------- MATERIAIS ------------------------------- */
  const PAL = {
    pele: [0xd6a184, { roughness: 0.62, sheen: 0.4, sheenColor: 0xffd8c8 }],
    osso: [0xe6dcc3, { roughness: 0.72 }], cartilagem: [0xbfd6dc, { roughness: 0.35, clearcoat: 0.3 }], disco: [0xc8dbe0, { roughness: 0.4 }],
    dente: [0xf6f2e6, { roughness: 0.25, clearcoat: 0.6 }],
    musculo: [0xa3302c, { roughness: 0.5, sheen: 0.6, sheenColor: 0xff8a7a, clearcoat: 0.15 }], tendao: [0xe9e2d2, { roughness: 0.3, clearcoat: 0.5 }],
    arteria: [0xc4212b, { roughness: 0.32, clearcoat: 0.5 }], veia: [0x2d4fae, { roughness: 0.32, clearcoat: 0.5 }],
    pulm_art: [0x3b5fc0, { roughness: 0.32, clearcoat: 0.5 }], pulm_veia: [0xd2343e, { roughness: 0.32, clearcoat: 0.5 }],
    coracao: [0xa3282a, { roughness: 0.38, clearcoat: 0.6, sheen: 0.3, sheenColor: 0xff9a8a }],
    cerebro: [0xe7b9b0, { roughness: 0.62, clearcoat: 0.25 }], cerebelo: [0xd99c97, { roughness: 0.6, clearcoat: 0.25 }], tronco: [0xe4bfac, { roughness: 0.55 }],
    medula: [0xf0dcae, { roughness: 0.45, clearcoat: 0.3 }], nervo: [0xf3d36b, { roughness: 0.45, clearcoat: 0.3 }],
    olho: [0xf5f2ec, { roughness: 0.2, clearcoat: 0.8 }], cornea: [0xe8f4ff, { roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 }],
    iris: [0x4f7d46, { roughness: 0.4 }], cristalino: [0xf2f6ff, { roughness: 0.05, transparent: true, opacity: 0.5 }], musc_olho: [0xae3c37, { roughness: 0.5 }],
    orelha: [0xd6a184, { roughness: 0.6 }], lingua: [0xc95560, { roughness: 0.55, clearcoat: 0.4 }],
    boca: [0xcf6e68, { roughness: 0.5, clearcoat: 0.3 }], gengiva: [0xdc6a78, { roughness: 0.45, clearcoat: 0.4 }],
    traqueia: [0xe3d1c2, { roughness: 0.4, clearcoat: 0.3 }], bronquios: [0xe9cbbb, { roughness: 0.42, clearcoat: 0.3 }], laringe: [0xd8b0a2, { roughness: 0.45, clearcoat: 0.3 }],
    pulmao: [0xe79aa4, { roughness: 0.78, sheen: 0.5, sheenColor: 0xffd0d6 }], diafragma: [0xb2463d, { roughness: 0.5, sheen: 0.5, sheenColor: 0xff9a8a }],
    esofago: [0xcf7b6e, { roughness: 0.45, clearcoat: 0.4 }], estomago: [0xd88a78, { roughness: 0.45, clearcoat: 0.5 }],
    intestino_delgado: [0xe4a48d, { roughness: 0.42, clearcoat: 0.5 }], intestino_grosso: [0xc99476, { roughness: 0.48, clearcoat: 0.4 }],
    figado: [0x7a2c22, { roughness: 0.32, clearcoat: 0.7 }], vesicula: [0x3e7a3a, { roughness: 0.3, clearcoat: 0.7 }], pancreas: [0xe6b57c, { roughness: 0.55, clearcoat: 0.3 }],
    baco: [0x6b2541, { roughness: 0.35, clearcoat: 0.6 }], rim: [0x8a3a2c, { roughness: 0.35, clearcoat: 0.6 }], ureter: [0xe4c08c, { roughness: 0.4 }], bexiga: [0xe2b089, { roughness: 0.4, clearcoat: 0.5 }],
    adrenal: [0xe0ae45, { roughness: 0.5 }], timo: [0xdca59c, { roughness: 0.55 }], tonsila: [0xd6848a, { roughness: 0.5 }],
    hipofise: [0xb07cc6, { roughness: 0.45 }], hipotalamo: [0xc49ad4, { roughness: 0.45 }], pineal: [0xb07cc6, { roughness: 0.45 }], tireoide: [0xa94a59, { roughness: 0.4, clearcoat: 0.5 }],
    testiculos: [0xd9a9b6, { roughness: 0.4, clearcoat: 0.4 }], ductos: [0xe7c39a, { roughness: 0.45 }], prostata: [0xc98477, { roughness: 0.45 }], penis: [0xcf9585, { roughness: 0.5 }],
    utero: [0xd2707f, { roughness: 0.4, clearcoat: 0.5 }], vagina: [0xe0909c, { roughness: 0.45 }], tubas: [0xe79fac, { roughness: 0.45 }], ovarios: [0xe9c6c4, { roughness: 0.5 }],
    mamas: [0xf3d2b0, { roughness: 0.55, transparent: true, opacity: 0.32 }], linfonodo: [0x5fb08a, { roughness: 0.5, clearcoat: 0.3 }], vaso_linf: [0x8fd3ae, { roughness: 0.4 }]
  };
  function material(id, mat) {
    const chave = mat === id || !mat ? id : id + ":" + mat;
    if (!mats[chave]) {
      const [cor, extra] = PAL[mat] || PAL[id] || [0xcccccc, {}];
      const op = Object.assign({ color: cor, metalness: 0 }, extra);
      if (op.sheenColor !== undefined) op.sheenColor = new T.Color(op.sheenColor);
      const m = new T.MeshPhysicalMaterial(op);
      m.envMapIntensity = 0.75;
      m.userData.corBase = new T.Color(cor);
      mats[chave] = m;
      if (!mats[id]) mats[id] = m;
    }
    return mats[chave];
  }

  /* --------------------------- DECODIFICAÇÃO ------------------------------- */
  async function descomprimir(b64) {
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const ds = new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }
  await MeshoptDecoder.ready;
  function geometria(c, dados) {
    const q = new Uint8Array(c.nv * 8); MeshoptDecoder.decodeVertexBuffer(q, c.nv, 8, dados.subarray(c.vo, c.vo + c.vl));
    const ib = new Uint8Array(c.ni * 4); MeshoptDecoder.decodeIndexBuffer(ib, c.ni, 4, dados.subarray(c.io, c.io + c.il));
    const q16 = new Uint16Array(q.buffer), pos = new Float32Array(c.nv * 3);
    for (let v = 0; v < c.nv; v++) for (let k = 0; k < 3; k++) pos[v * 3 + k] = c.mn[k] + q16[v * 4 + k] / 65535 * c.esc[k];
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setIndex(new T.BufferAttribute(new Uint32Array(ib.buffer), 1));
    g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }

  /* ------------------------ ORGANIZAÇÃO NA CENA ---------------------------- */
  const subgrupos = { fem: [], masc: [] };
  function sub(sist, grupo) {
    if (!grupo) return grupos[sist];
    const nome = grupo === "fem" ? "feminino" : "masculino";
    let g = grupos[sist].children.find(x => x.name === nome);
    if (!g) { g = new T.Group(); g.name = nome; grupos[sist].add(g); subgrupos[grupo].push(g); }
    return g;
  }
  function pivo(pai, sist) {
    let p = pai.children.find(x => x.userData.pivo);
    if (!p) { p = new T.Group(); p.position.copy(COT); p.userData.pivo = true; p.userData.sistema = sist; pai.add(p); refs.pivos.push(p); }
    return p;
  }
  // grupos centrados (para pulsar/encher em torno do próprio centro)
  const centrados = {};
  function centrado(chave, pai) {
    if (!centrados[chave]) { const g = new T.Group(); g.name = chave; g.userData.escalaBase = V(1, 1, 1); pai.add(g); centrados[chave] = { g, malhas: [] }; }
    return centrados[chave];
  }
  function registrar(mesh, id, sist) {
    mesh.userData.id = id; mesh.userData.sistema = sist; pecas.push(mesh); return mesh;
  }
  const CENTRAR = { coracao: "coracao", pulmao_d: "pulmao_d", pulmao_e: "pulmao_e", bexiga: "bexiga", diafragma: "diafragma" };
  let peleMasc = null;
  const ordem = Object.keys(window.MODELOS || {});
  for (let i = 0; i < ordem.length; i++) {
    const sist = ordem[i]; const pacote = window.MODELOS[sist];
    progresso(i / ordem.length, DADOS.sistemas[sist] ? DADOS.sistemas[sist].nome : sist);
    const dados = await descomprimir(pacote.dados);
    for (const c of pacote.cab) {
      const mesh = new T.Mesh(geometria(c, dados), material(c.id, c.mat));
      registrar(mesh, c.id, sist);
      const pai = sub(sist, c.grupo);
      if (c.piv) { mesh.position.copy(COT).negate(); pivo(pai, sist).add(mesh); }
      else if (CENTRAR[c.id] || (c.lado === "D" && (c.id === "biceps" || c.id === "triceps"))) centrado(c.id + (c.lado || ""), pai).malhas.push(mesh);
      else pai.add(mesh);
      if (c.id === "pele" && c.grupo === "masc" && !c.piv) peleMasc = mesh;
    }
    pacote.dados = null; // libera memória
    await new Promise(r => setTimeout(r, 0));
  }
  // posiciona grupos centrados no centro de suas malhas
  Object.values(centrados).forEach(({ g, malhas }) => {
    const cx = new T.Box3(); malhas.forEach(m => cx.expandByObject(m)); const c = cx.getCenter(V(0, 0, 0));
    g.position.copy(c); malhas.forEach(m => { m.position.sub(c); g.add(m); });
    g.userData.posBase = g.position.clone();
  });
  refs.coracao = centrados.coracao.g;
  refs.pulmoes = [centrados.pulmao_d.g, centrados.pulmao_e.g];
  refs.bexiga = centrados.bexiga.g;
  refs.diafragma = centrados.diafragma.g;
  refs.biceps = centrados.bicepsD.g; refs.triceps = centrados.tricepsD.g;
  const corpoSexo = g => ({ set visible(v) { subgrupos[g].forEach(x => x.visible = v); }, get visible() { return subgrupos[g].some(x => x.visible); } });
  refs.fem = corpoSexo("fem"); refs.masc = corpoSexo("masc");

  /* ------------------------ ESTRUTURAS COMPLEMENTARES ---------------------- */
  progresso(0.95, "Estruturas complementares");
  const curva = pts => new T.CatmullRomCurve3(pts.map(p => p.isVector3 ? p : VA(p)), false, "catmullrom", 0.5);
  function tubo(pts, r, id, sist, mat, pai) {
    const c = curva(pts);
    const m = new T.Mesh(new T.TubeGeometry(c, Math.max(24, pts.length * 8), r, 8, false), material(id, mat));
    m.userData.curva = c; registrar(m, id, sist); (pai || grupos[sist]).add(m); return m;
  }
  // Nervos periféricos (seguem os feixes vasculonervosos reais)
  const N = TR.L.nervos;
  Object.entries(N).forEach(([nome, pts]) => {
    const r = /isquiatico/.test(nome) ? 0.045 : /intercostal/.test(nome) ? 0.014 : 0.026;
    if (nome === "antebracoD") {
      const m = tubo(pts.map(p => [p[0] - COT.x, p[1] - COT.y, p[2] - COT.z]), r, "nervos", "nervoso", "nervo", pivo(grupos.nervoso, "nervoso"));
    } else tubo(pts, r, "nervos", "nervoso", "nervo");
  });
  // Medula espinal: linha central da malha real
  const medMalhas = pecas.filter(m => m.userData.id === "medula");
  const ptsMed = (() => {
    const b = [], cx = new T.Box3(); medMalhas.forEach(m => cx.expandByObject(m));
    const n = 16, s = Array.from({ length: n }, () => [0, 0, 0, 0]); const v = V(0, 0, 0);
    medMalhas.forEach(m => { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i); const k = Math.min(n - 1, Math.floor((v.y - cx.min.y) / (cx.max.y - cx.min.y + 1e-6) * n)); s[k][0] += v.x; s[k][1] += v.y; s[k][2] += v.z; s[k][3]++; } });
    s.forEach(a => { if (a[3]) b.push(V(a[0] / a[3], a[1] / a[3], a[2] / a[3])); });
    return b;
  })();
  refs.medula = curva(ptsMed);
  // vias do reflexo (lado direito)
  const bracoD = N.bracoD.map(VA), antD = N.antebracoD.map(VA);
  const nivelC6 = ptsMed.reduce((a, p) => Math.abs(p.y - 14.2) < Math.abs(a.y - 14.2) ? p : a, ptsMed[0]);
  refs.nervoAntebraco = curva(antD.slice().reverse());
  refs.nervoBraco = curva([...bracoD.slice().reverse(), nivelC6]);
  refs.motorBiceps = curva([nivelC6, ...bracoD.slice(0, Math.ceil(bracoD.length * 0.6)), VA(TR.ref.biceps)]);

  // Tireoide (borboleta sobre a traqueia)
  (function () {
    const tq = TR.ref.traqueia, ct = TR.ref.cartTireoide;
    const zf = tq[1][2] - 0.02, yC = ct[0][1] - 0.32;
    const lobo = s => {
      const g = new T.SphereGeometry(1, 32, 24); const p = g.attributes.position, v = V(0, 0, 0);
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 - 0.35 * v.y; p.setXYZ(i, v.x * 0.11 * k, v.y * 0.24, v.z * 0.085 * k); }
      g.computeVertexNormals(); const m = new T.Mesh(g, material("tireoide", "tireoide"));
      m.position.set(0.15 * s, yC, zf - 0.06); m.rotation.z = -0.18 * s; m.rotation.y = 0.5 * s; return m;
    };
    [-1, 1].forEach(s => { const m = lobo(s); registrar(m, "tireoide", "endocrino"); grupos.endocrino.add(m); });
    const ist = new T.Mesh(new T.CapsuleGeometry(0.045, 0.2, 6, 12), material("tireoide", "tireoide"));
    ist.rotation.z = Math.PI / 2; ist.position.set(0, yC - 0.1, zf + 0.02); registrar(ist, "tireoide", "endocrino"); grupos.endocrino.add(ist);
  })();

  // Reto do abdome: modelado sobre a parede abdominal real (a partir da pele)
  if (peleMasc) (function () {
    const g = peleMasc.geometry, p = g.attributes.position, n = g.attributes.normal, I = g.index.array;
    const y0 = TR.ref.pubis[1][1] - 0.95, y1 = TR.ref.xifoide[1][1] - 0.05;
    const larg = y => 0.24 + 0.36 * Math.min(1, Math.max(0, (y - y0) / (y1 - y0) * 1.6));
    const dentro = i => { const x = p.getX(i), y = p.getY(i); return y > y0 && y < y1 && Math.abs(x) < larg(y) && n.getZ(i) > 0.3; };
    const mapa = new Map(), pos = [], idx = [];
    const ints = [0.25, 0.5, 0.75].map(t => y0 + (y1 - y0) * (0.35 + t * 0.62));
    const add = (i, prof) => {
      const chave = i + ":" + prof; if (mapa.has(chave)) return mapa.get(chave);
      const x = p.getX(i), y = p.getY(i);
      let d = prof;
      if (prof < 0.15) { d += 0.035 * Math.exp(-Math.pow(x / 0.035, 2)); ints.forEach(yi => { if (y > y0 + (y1 - y0) * 0.4) d += 0.022 * Math.exp(-Math.pow((y - yi) / 0.05, 2)); }); d += 0.06 * Math.pow(Math.abs(x) / larg(y), 6); }
      pos.push(x - n.getX(i) * d, y - n.getY(i) * d, p.getZ(i) - n.getZ(i) * d);
      const k = pos.length / 3 - 1; mapa.set(chave, k); return k;
    };
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      if (!(dentro(a) && dentro(b) && dentro(c))) continue;
      idx.push(add(a, 0.1), add(b, 0.1), add(c, 0.1));
      idx.push(add(a, 0.24), add(c, 0.24), add(b, 0.24));
    }
    if (!idx.length) return;
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new T.Mesh(geo, material("abdominal", "musculo")); registrar(m, "abdominal", "muscular"); grupos.muscular.add(m);
  })();

  // Linfonodos e vasos linfáticos (ao longo das veias reais)
  (function () {
    const no = (p, s) => { const m = new T.Mesh(new T.SphereGeometry(0.055 * (s || 1), 14, 10), material("linfonodos", "linfonodo")); m.scale.set(1.2, 0.8, 0.9); m.position.copy(p); registrar(m, "linfonodos", "linfatico"); grupos.linfatico.add(m); };
    const vs = TR.L.veias.map(l => l.map(VA));
    const amostra = (l, a, b, n, d) => { for (let k = 0; k < n; k++) { const p = l[Math.round(a + (b - a) * k / Math.max(1, n - 1))]; if (p) no(p.clone().add(V((Math.random() - 0.5) * 0.12, 0, d || 0.06))); } };
    [0, 4].forEach(o => {                       // por lado: pernas(0/4), jugulares(1/5), braços(2/6)
      const perna = vs[o], jug = vs[o + 1], braco = vs[o + 2];
      const iFem = perna.findIndex(p => p.y > 8.0); amostra(perna, Math.max(0, iFem - 4), iFem, 4, 0.1);        // inguinais
      amostra(jug, 1, Math.min(jug.length - 4, 6), 5, 0.1);                                                      // cervicais
      const iAx = braco.findIndex(p => p.y > 12.6); amostra(braco, Math.max(0, iAx - 2), iAx + 2, 4, -0.05);     // axilares
      tubo(perna.filter((p, i) => i % 2 === 0).map(p => p.clone().add(V(0.05, 0, 0.07))), 0.012, "vasos_linfaticos", "linfatico", "vaso_linf");
      tubo(braco.slice(0, iAx + 2).filter((p, i) => i % 2 === 0 && p.y > COT.y + 0.1).map(p => p.clone().add(V(0, 0, 0.07))), 0.012, "vasos_linfaticos", "linfatico", "vaso_linf");
    });
    // ducto torácico: da cisterna do quilo (L1) até a junção jugulossubclávia esquerda
    const ao = TR.L.arterias[0].map(VA).filter(p => p.y < 12.6 && p.y > 10.3).sort((a, b) => a.y - b.y);
    const jE = vs[5][Math.min(vs[5].length - 1, 6)];
    const ducto = [...ao.map(p => p.clone().add(V(-0.08, 0, -0.14))), V(0.25, 13.6, -0.3), jE.clone()];
    tubo(ducto, 0.016, "vasos_linfaticos", "linfatico", "vaso_linf");
    ao.filter((p, i) => i % 2 === 0).forEach(p => no(p.clone().add(V(0.14, 0, 0.05)), 0.9));               // para-aórticos
  })();

  /* ------------------------------ TRAJETOS -------------------------------- */
  TR.L.arterias.forEach(l => refs.arterias.push(curva(l)));
  TR.L.veias.forEach(l => refs.veias.push(curva(l)));
  refs.trajetoDigestao = [
    { nome: "Boca", curva: curva(TR.L.boca), dur: 3, texto: "BOCA — Mastigação (digestão mecânica) e saliva com amilase salivar, que inicia a digestão do amido. Forma-se o bolo alimentar.", tempo: "≈ 5 a 30 segundos" },
    { nome: "Esôfago", curva: curva(TR.L.esofago), dur: 3, texto: "FARINGE e ESÔFAGO — A deglutição empurra o bolo; a epiglote fecha a laringe. Movimentos peristálticos levam o alimento ao estômago.", tempo: "≈ 5 a 10 segundos" },
    { nome: "Estômago", curva: curva(TR.L.estomago), dur: 5, texto: "ESTÔMAGO — Suco gástrico (HCl + pepsina) digere proteínas. O bolo vira QUIMO.", tempo: "≈ 2 a 4 horas" },
    { nome: "Intestino delgado", curva: curva(TR.L.intestino_delgado), dur: 10, texto: "INTESTINO DELGADO — Bile (fígado) emulsiona gorduras; suco pancreático e entérico completam a digestão. Vilosidades ABSORVEM os nutrientes, que vão para o SANGUE.", tempo: "≈ 3 a 5 horas" },
    { nome: "Intestino grosso", curva: curva(TR.L.intestino_grosso), dur: 6, texto: "INTESTINO GROSSO — Absorção de água e sais; bactérias da microbiota fermentam fibras. Formação e eliminação das fezes.", tempo: "≈ 12 a 48 horas" }
  ];
  refs.hipofise = mats.hipofise; refs.hipotalamo = mats.hipotalamo;
  refs.gonadasF = mats.ovarios; refs.gonadasM = mats.testiculos;
  refs.fem.visible = true; refs.masc.visible = false;

  pecas.forEach(m => { m.castShadow = false; m.receiveShadow = false; });
  progresso(1, "Pronto");
  return { raiz, grupos, pecas, mats, refs };
};
