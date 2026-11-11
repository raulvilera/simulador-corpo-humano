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
    medula: [0xf0dcae, { roughness: 0.45, clearcoat: 0.3 }], nervo: [0xffc21a, { roughness: 0.4, clearcoat: 0.3 }], ganglio: [0xff6a1f, { roughness: 0.35, clearcoat: 0.5 }],
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
    mamas: [0xf3d2b0, { roughness: 0.55, transparent: true, opacity: 0.32 }], linfonodo: [0x5fb08a, { roughness: 0.5, clearcoat: 0.3 }], vaso_linf: [0x8fd3ae, { roughness: 0.4 }],
    uretra: [0xe9c98f, { roughness: 0.4, clearcoat: 0.3 }], salivar: [0xe0a070, { roughness: 0.55, clearcoat: 0.3 }],
    paratireoide: [0xf2c14e, { roughness: 0.45, clearcoat: 0.3 }], medula_ossea: [0xb3262e, { roughness: 0.6 }]
  };
  window.PALETA = PAL;
  function material(id, mat) {
    const chave = mat === id || !mat ? id : id + ":" + mat;
    if (!mats[chave]) {
      const EX = window.SENTIDOS ? SENTIDOS.PAL : {};
      const [cor, extra] = PAL[mat] || EX[mat] || PAL[id] || [0xcccccc, {}];
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

  window.decodificarPacote = async p => { const d = await descomprimir(p.dados); return p.cab.map(c => ({ c, geo: geometria(c, d) })); };

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
    if (mat === "nervo") r *= 1.3;   // nervos em evidência
    const m = new T.Mesh(new T.TubeGeometry(c, Math.max(24, pts.length * 8), r, 8, false), material(id, mat));
    m.userData.curva = c; registrar(m, id, sist); (pai || grupos[sist]).add(m); return m;
  }
  // Gânglio: pequeno corpo ovoide (agrupamento de corpos de neurônios fora do SNC)
  function ganglio(id, p, r, esc, pai) {
    const m = new T.Mesh(new T.SphereGeometry(r, 16, 12), material(id, "ganglio"));
    m.position.copy(p.isVector3 ? p : VA(p)); if (esc) m.scale.set(esc[0], esc[1], esc[2]);
    registrar(m, id, "nervoso"); (pai || grupos.nervoso).add(m); return m;
  }
  // Nervos periféricos (seguem os feixes vasculonervosos reais)
  const N = TR.L.nervos;
  Object.entries(N).forEach(([nome, pts]) => {
    const id = /braco/.test(nome) ? "nervo_mediano" : /isquiatico/.test(nome) ? "nervo_isquiatico" : /femoral/.test(nome) ? "nervo_femoral" : /intercostal/.test(nome) ? "nervos_intercostais" : "nervos";
    const r = /isquiatico/.test(nome) ? 0.05 : /intercostal/.test(nome) ? 0.016 : 0.03;
    if (nome === "antebracoD") tubo(pts.map(p => [p[0] - COT.x, p[1] - COT.y, p[2] - COT.z]), r, id, "nervoso", "nervo", pivo(grupos.nervoso, "nervoso"));
    else if (/isquiatico/.test(nome)) {   // perto do joelho o isquiático continua como nervo tibial
      const k = pts.findIndex(p => p[1] < 4.9);
      tubo(pts.slice(0, k + 1), r, id, "nervoso", "nervo"); tubo(pts.slice(k), 0.034, "nervo_tibial", "nervoso", "nervo");
    } else tubo(pts, r, id, "nervoso", "nervo");
  });
  // Nervo intercostal de qualquer nível (2 a 12): os níveis 3, 5, 7 e 9 têm trajeto real;
  // os demais são interpolados (ou extrapolados) a partir dos vizinhos.
  function intercostalPts(n, L) {
    const nomes = { 3: "Third", 5: "Fifth", 7: "Seventh", 9: "Ninth" }, de = k => N["intercostal" + nomes[k] + L];
    if (nomes[n]) return de(n);
    const a = n < 3 ? 3 : n > 9 ? 7 : n - 1, t = (n - a) / 2, A = de(a), B = de(a + 2);
    return A.map((p, i) => p.map((v, k) => { const x = v + (B[i][k] - v) * t; return k === 0 && n > 9 ? Math.sign(x) * Math.min(Math.abs(x), 1.22) : x; }));
  }
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

  // Músculos da face (mímica e mastigação), moldados sobre o crânio, olhos e nariz reais
  (function () {
    const BASE = ["cranio", "mandibula", "palpebras", "esclera", "cartilagens_nasais"];
    const fontes = pecas.filter(m => BASE.includes(m.userData.id) && m.parent && !m.parent.userData.pivo);
    if (!fontes.some(m => m.userData.id === "cranio")) return;
    // Mapa de altura: para cada (a,b) guarda a maior "altura" da superfície (rasterização dos triângulos)
    function mapa(a0, a1, b0, b1, R, proj) {
      const NA = Math.round((a1 - a0) / R) + 1, NB = Math.round((b1 - b0) / R) + 1;
      let H = new Float32Array(NA * NB).fill(-Infinity);
      const A = [0, 0, 0], B = [0, 0, 0], Z = [0, 0, 0];
      fontes.forEach(m => {
        const p = m.geometry.attributes.position, I = m.geometry.index.array;
        for (let t = 0; t < I.length; t += 3) {
          let ok = true;
          for (let k = 0; k < 3; k++) { const r = proj(p.getX(I[t + k]), p.getY(I[t + k]), p.getZ(I[t + k])); if (!r) { ok = false; break; } A[k] = r[0]; B[k] = r[1]; Z[k] = r[2]; }
          if (!ok) continue;
          const d = (B[1] - B[2]) * (A[0] - A[2]) + (A[2] - A[1]) * (B[0] - B[2]); if (Math.abs(d) < 1e-12) continue;
          const i0 = Math.max(0, Math.ceil((Math.min(A[0], A[1], A[2]) - a0) / R)), i1 = Math.min(NA - 1, Math.floor((Math.max(A[0], A[1], A[2]) - a0) / R));
          const j0 = Math.max(0, Math.ceil((Math.min(B[0], B[1], B[2]) - b0) / R)), j1 = Math.min(NB - 1, Math.floor((Math.max(B[0], B[1], B[2]) - b0) / R));
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
            const pa = a0 + i * R, pb = b0 + j * R;
            const l1 = ((B[1] - B[2]) * (pa - A[2]) + (A[2] - A[1]) * (pb - B[2])) / d, l2 = ((B[2] - B[0]) * (pa - A[2]) + (A[0] - A[2]) * (pb - B[2])) / d, l3 = 1 - l1 - l2;
            if (l1 < 0 || l2 < 0 || l3 < 0) continue;
            const z = l1 * Z[0] + l2 * Z[1] + l3 * Z[2], q = j * NA + i; if (z > H[q]) H[q] = z;
          }
        }
      });
      // preenche buracos (boca, abertura nasal, bordas) com a média dos vizinhos
      for (let it = 0; it < 80; it++) {
        const N2 = H.slice(); let falta = false;
        for (let j = 0; j < NB; j++) for (let i = 0; i < NA; i++) {
          const q = j * NA + i; if (H[q] > -Infinity) continue;
          let s = 0, n = 0;
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj, ii = i + di; if (jj < 0 || ii < 0 || jj >= NB || ii >= NA) continue; const v = H[jj * NA + ii]; if (v > -Infinity) { s += v; n++; } }
          if (n) N2[q] = s / n - R * 0.5; else falta = true;
        }
        H = N2; if (!falta) break;
      }
      const borrar = (X, n) => { for (let k = 0; k < n; k++) { const Y = X.slice(); for (let j = 1; j < NB - 1; j++) for (let i = 1; i < NA - 1; i++) { let s = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += X[(j + dj) * NA + i + di]; Y[j * NA + i] = s / 9; } X = Y; } return X; };
      // "fechamento": cobre concavidades (órbitas, dentes) como faria o tecido mole
      const L = borrar(H, 4); for (let q = 0; q < H.length; q++) H[q] = Math.max(H[q], L[q]);
      H = borrar(H, 2);
      const amostra = (a, b) => {
        const fa = Math.min(NA - 1.001, Math.max(0, (a - a0) / R)), fb = Math.min(NB - 1.001, Math.max(0, (b - b0) / R));
        const i = Math.floor(fa), j = Math.floor(fb), u = fa - i, v = fb - j, q = j * NA + i;
        return H[q] * (1 - u) * (1 - v) + H[q + 1] * u * (1 - v) + H[q + NA] * (1 - u) * v + H[q + NA + 1] * u * v;
      };
      return (a, b) => {   // altura + normal (no espaço do mapa)
        const h = amostra(a, b), e = R * 1.5;
        const ga = (amostra(a + e, b) - amostra(a - e, b)) / (2 * e), gb = (amostra(a, b + e) - amostra(a, b - e)) / (2 * e);
        const l = Math.hypot(ga, gb, 1); return [h, -ga / l, -gb / l, 1 / l];
      };
    }
    const frente = mapa(-0.95, 0.95, 14.85, 17.25, 0.015, (x, y, z) => [x, y, z]);
    const lado = { 1: mapa(-0.6, 0.8, 14.9, 16.4, 0.015, (x, y, z) => x > 0 ? [z, y, x] : null), [-1]: mapa(-0.6, 0.8, 14.9, 16.4, 0.015, (x, y, z) => x < 0 ? [z, y, -x] : null) };

    // Gera uma "almofada" muscular: superfície externa (com estrias das fibras) + interna, coladas na borda
    function musculo(id, s, ponto, o) {
      const NU = o.nu || 28, NV = o.nv || 22, pos = [], idx = [];
      const camada = o.camada || 0.008, esp = o.esp || 0.04;
      const mundo = (a, b, off) => {
        if (o.lado) { const [h, na, nb, nh] = lado[s](a, b); return [s * (h + nh * off), b + nb * off, a + na * off]; }
        const x = s * a, [h, na, nb, nh] = frente(x, b); return [x + na * off, b + nb * off, h + nh * off];
      };
      for (let f = 0; f < 2; f++) for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
        const u = i / NU, v = j / NV, [a, b, perfil, fibra] = ponto(u, v);
        const estria = 1 - (o.estrias === 0 ? 0 : 0.18) * Math.pow(Math.abs(Math.sin(Math.PI * fibra * (o.nf || 7))), 3);
        pos.push(...mundo(a, b, f ? camada : camada + esp * perfil * estria));
      }
      const n1 = (NU + 1) * (NV + 1), id_ = (f, i, j) => f * n1 + j * (NU + 1) + i;
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
        const a = id_(0, i, j), b = id_(0, i + 1, j), c = id_(0, i + 1, j + 1), d = id_(0, i, j + 1);
        idx.push(a, b, c, a, c, d);
        idx.push(a + n1, c + n1, b + n1, a + n1, d + n1, c + n1);
      }
      const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      // garante que a face externa aponte para fora (para frente / para o lado)
      const k = id_(0, NU >> 1, NV >> 1), nrm = geo.attributes.normal;
      const fora = o.lado ? nrm.getX(k) * s : nrm.getZ(k);
      if (fora < 0) { for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; } geo.setIndex(idx); geo.computeVertexNormals(); }
      const m = new T.Mesh(geo, material(id, "musculo")); registrar(m, id, "muscular"); grupos.muscular.add(m); return m;
    }
    const liso = (t, p) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t)))), p);
    // faixa (músculo em fita) ao longo de uma curva de Bézier quadrática
    const faixa = (id, P0, P1, w0, w1, o) => [1, -1].forEach(s => musculo(id, s, (u, v) => {
      const C = o && o.c || [(P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2], k = 1 - v;
      const a = k * k * P0[0] + 2 * k * v * C[0] + v * v * P1[0], b = k * k * P0[1] + 2 * k * v * C[1] + v * v * P1[1];
      let ta = 2 * k * (C[0] - P0[0]) + 2 * v * (P1[0] - C[0]), tb = 2 * k * (C[1] - P0[1]) + 2 * v * (P1[1] - C[1]); const l = Math.hypot(ta, tb); ta /= l; tb /= l;
      const w = (w0 + (w1 - w0) * v) * (u - 0.5);
      return [a - tb * w, b + ta * w, liso(u, 0.55) * liso(v, (o && o.ponta) || 0.35), u];
    }, o || {}));
    // anel (músculos orbiculares)
    const anel = (id, cx, cy, ri, re, o) => [1, -1].forEach(s => musculo(id, s, (u, v) => {
      const ang = u * Math.PI * 2, rx = ri[0] + (re[0] - ri[0]) * v, ry = ri[1] + (re[1] - ri[1]) * v;
      return [cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, liso(Math.pow(v, (o && o.lab) || 1), 0.6), v];
    }, Object.assign({ nu: 64, nv: 12, nf: 5 }, o || {})));

    // Ventre frontal do occipitofrontal (testa) — fibras verticais
    faixa("frontal", [0.29, 16.13], [0.27, 16.98], 0.5, 0.44, { esp: 0.035, camada: 0.006, ponta: 0.6, nf: 9, nu: 34, nv: 26 });
    // Prócero e nasal
    faixa("nasal_m", [0.045, 15.96], [0.03, 16.3], 0.075, 0.07, { esp: 0.025, camada: 0.006, nf: 3 });
    faixa("nasal_m", [0.135, 15.64], [0.025, 15.86], 0.07, 0.06, { esp: 0.022, camada: 0.004, nf: 4, c: [0.12, 15.8] });
    // Orbicular do olho (em volta da pálpebra)
    anel("orbicular_olho", 0.295, 15.965, [0.15, 0.11], [0.31, 0.255], { esp: 0.035, camada: 0.012, nf: 6 });
    // Levantadores do lábio superior e zigomáticos
    faixa("levantador_labio", [0.09, 16.02], [0.14, 15.5], 0.05, 0.06, { esp: 0.028, camada: 0.008, c: [0.12, 15.75], nf: 4 });
    faixa("levantador_labio", [0.26, 15.83], [0.15, 15.46], 0.13, 0.07, { esp: 0.035, camada: 0.012, nf: 5 });
    faixa("zigomatico", [0.4, 15.79], [0.18, 15.45], 0.06, 0.05, { esp: 0.03, camada: 0.016, nf: 3 });
    faixa("zigomatico", [0.55, 15.73], [0.215, 15.37], 0.085, 0.065, { esp: 0.045, camada: 0.02, c: [0.42, 15.52], nf: 4 });
    // Bucinador (profundo, bochecha) e risório
    faixa("bucinador", [0.47, 15.36], [0.22, 15.36], 0.2, 0.12, { esp: 0.03, camada: 0.004, nf: 6, ponta: 0.25 });
    faixa("risorio", [0.53, 15.28], [0.22, 15.345], 0.06, 0.035, { esp: 0.02, camada: 0.03, nf: 3 });
    // Orbicular da boca (lábios)
    anel("orbicular_boca", 0, 15.36, [0.115, 0.016], [0.25, 0.165], { esp: 0.075, camada: 0.012, lab: 0.55, nf: 7 });
    // Depressores e mentual (queixo)
    faixa("depressores_labio", [0.215, 15.31], [0.29, 15.05], 0.05, 0.17, { esp: 0.03, camada: 0.014, nf: 5 });
    faixa("depressores_labio", [0.09, 15.25], [0.15, 15.05], 0.07, 0.11, { esp: 0.03, camada: 0.01, nf: 4 });
    faixa("mentual", [0.035, 15.22], [0.06, 15.03], 0.065, 0.07, { esp: 0.035, camada: 0.008, nf: 3 });
    // Masseter (lateral: do arco zigomático ao ângulo da mandíbula)
    faixa("masseter", [0.17, 15.82], [0.03, 15.17], 0.38, 0.32, { lado: true, esp: 0.11, camada: 0.006, ponta: 0.3, nf: 8, nu: 30, nv: 26 });
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
    [[-0.17, 13.56, -0.12], [0.15, 13.55, -0.1], [0, 13.42, -0.08], [-0.3, 13.3, -0.05], [0.32, 13.28, -0.05]].forEach(p => no(VA(p), 0.8));   // mediastinais (traqueobrônquicos)
    [[0, 10.35, 0.24], [-0.22, 10.05, 0.3], [0.22, 10.15, 0.3], [0.04, 9.8, 0.3], [-0.12, 9.55, 0.28]].forEach(p => no(VA(p), 0.8));          // mesentéricos
    [-1, 1].forEach(s => { no(V(s * 0.75, 4.86, -0.4), 0.8); no(V(s * 0.72, 4.68, -0.42), 0.7); });                                             // poplíteos
    // ducto linfático direito (curto): drena o braço direito e o lado direito da cabeça e do tórax
    const jD = vs[1][Math.min(vs[1].length - 1, 6)];
    tubo([V(-0.42, 13.25, -0.2), V(-0.38, 13.6, -0.12), jD.clone()], 0.014, "vasos_linfaticos", "linfatico", "vaso_linf");
  })();

  /* ------------- ESTRUTURAS QUE COMPLETAM OS SISTEMAS (posições medidas nas malhas reais) ------------- */
  const elipsoide = (id, sist, mat, c, r, rot, pai) => {
    const m = new T.Mesh(new T.SphereGeometry(1, 22, 16), material(id, mat));
    m.scale.set(r[0], r[1], r[2]); m.position.set(c[0], c[1], c[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    registrar(m, id, sist); (pai || grupos[sist]).add(m); return m;
  };
  // Uretra: do colo da bexiga ao exterior (masculina: atravessa a próstata e o pênis; feminina: curta, à frente da vagina)
  tubo([[-0.05, 8.7, -0.19], [-0.01, 8.6, -0.2], [0, 8.5, -0.23], [-0.03, 8.42, -0.2], [-0.01, 8.43, 0.05], [0, 8.45, 0.23], [0, 8.48, 0.43], [0, 8.46, 0.6], [0, 8.4, 0.76], [0, 8.2, 0.84], [0, 7.9, 0.87]],
    0.022, "uretra", "urinario", "uretra", sub("urinario", "masc"));
  tubo([[-0.05, 8.7, -0.04], [-0.06, 8.55, 0.09], [-0.06, 8.32, 0.16], [-0.06, 8.1, 0.18]], 0.024, "uretra", "urinario", "uretra", sub("urinario", "fem"));
  // Glândulas salivares maiores: parótida, submandibular e sublingual (dos dois lados)
  [-1, 1].forEach(s => {
    elipsoide("glandulas_salivares", "digestorio", "salivar", [s * 0.56, 15.5, -0.03], [0.075, 0.26, 0.16], [0, 0, s * 0.08]);
    elipsoide("glandulas_salivares", "digestorio", "salivar", [s * 0.27, 15.09, 0.25], [0.095, 0.085, 0.15]);
    elipsoide("glandulas_salivares", "digestorio", "salivar", [s * 0.1, 15.07, 0.52], [0.05, 0.04, 0.13], [0, -s * 0.35, 0]);
  });
  // Paratireoides: quatro glândulas atrás dos lobos da tireoide
  (function () {
    const yC = TR.ref.cartTireoide[0][1] - 0.32, zT = TR.ref.traqueia[1][2] - 0.02 - 0.06;
    [-1, 1].forEach(s => [0.11, -0.13].forEach(dy => elipsoide("paratireoides", "endocrino", "paratireoide", [s * 0.165, yC + dy, zT - 0.085], [0.03, 0.038, 0.026])));
  })();
  // Medula óssea vermelha: no interior do esterno e das extremidades proximais do fêmur e do úmero
  tubo([[0, 12.6, 1.06], [0, 12.92, 0.975], [0, 13.31, 0.85], [0, 13.6, 0.71], [0, 13.86, 0.5]], 0.045, "medula_ossea", "linfatico", "medula_ossea");
  [-1, 1].forEach(s => {
    tubo([[s * 1.03, 7.2, -0.11], [s * 1.06, 7.6, -0.14], [s * 1.08, 8.05, -0.25], [s * 1.12, 8.45, -0.3], [s * 0.98, 8.82, -0.25], [s * 0.82, 8.95, -0.22]], 0.065, "medula_ossea", "linfatico", "medula_ossea");
    tubo([[s * 1.96, 12.75, -0.3], [s * 1.8, 13.28, -0.245], [s * 1.71, 13.65, -0.24], [s * 1.6, 13.9, -0.2]], 0.05, "medula_ossea", "linfatico", "medula_ossea");
  });
  // Nervos espinais (31 pares) e plexos, saindo da medula real entre as vértebras
  (function () {
    const med = ptsMed.slice().sort((a, b) => a.y - b.y), yFim = med[0].y;
    const CANAL = [[9.0, -0.9], [9.36, -0.84], [9.62, -0.72], [9.93, -0.68], [10.2, -0.6], [10.5, -0.52], [10.8, -0.5], [yFim, med[0].z]];   // canal vertebral abaixo da medula
    const interp = (tab, y, f) => { if (y <= f(tab[0])[0]) return f(tab[0]); for (let i = 1; i < tab.length; i++) { const a = f(tab[i - 1]), b = f(tab[i]); if (y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0] + 1e-9); return a.map((v, k) => v + (b[k] - v) * t); } } return f(tab[tab.length - 1]); };
    const canal = y => { if (y >= yFim) { const r = interp(med, y, p => [p.y, p.x, p.z]); return V(r[1], y, r[2]); } const r = interp(CANAL, y, p => p); return V(med[0].x * Math.max(0, (y - 9.6) / (yFim - 9.6)), y, r[1]); };
    const niveis = [];   // [nome, y de saída, y de origem na medula]
    for (let k = 0; k < 8; k++) { const y = 15.5 - k * 0.126; niveis.push(["C" + (k + 1), y, y + 0.03]); }
    for (let k = 0; k < 12; k++) { const y = 14.48 - k * 0.2515; niveis.push(["T" + (k + 1), y, y + 0.04 + 0.2 * k / 11]); }
    for (let k = 0; k < 5; k++) niveis.push(["L" + (k + 1), 11.4 - k * 0.375, 11.75 - k * 0.075]);
    for (let k = 0; k < 5; k++) niveis.push(["S" + (k + 1), 9.62 - k * 0.148, 11.375 - k * 0.075]);
    niveis.push(["Co", 8.9, 11.0]);
    [-1, 1].forEach(s => {
      const L = s < 0 ? "D" : "E", braco = VA(N["braco" + L][0]), fem = VA(N["femoral" + L][0]), isq0 = VA(N["isquiatico" + L][0]), isq1 = VA(N["isquiatico" + L][1]);
      const sacral = isq0.clone().lerp(isq1, 0.35);
      niveis.forEach(([nome, ys, yo]) => {
        const c = canal(ys), pts = [canal(yo).add(V(s * 0.025, 0, 0))];
        if (yo - ys > 0.3) { pts.push(canal((yo + ys) / 2).add(V(s * 0.035, 0, -0.01))); pts.push(canal(ys + 0.1).add(V(s * 0.05, 0, 0))); }
        const F = V(s * 0.2, ys, c.z + 0.06); pts.push(F);
        if (nome !== "Co") ganglio("ganglios_espinais", pts[pts.length - 2].clone().lerp(F, 0.62), 0.03, [1.35, 1, 1]);   // gânglio espinal (raiz dorsal)
        const n = +nome.slice(1), g = nome[0]; let r = 0.013;
        if (g === "C" && n <= 4) pts.push(V(s * 0.3, ys - 0.07, c.z + 0.14), V(s * 0.44, ys - 0.16, c.z + 0.2));                                   // plexo cervical
        else if ((g === "C" && n >= 5) || nome === "T1") { r = 0.017; pts.push(V(s * 0.45, (ys + 14.3) / 2, -0.12), V(s * 0.72, 14.22, -0.02), braco); }   // plexo braquial
        else if (g === "T") { const ic = intercostalPts(n, L); pts.splice(-1, 1, VA(ic[0]), VA(ic[1])); }   // intercostais
        else if (g === "L" && n <= 4) { r = 0.017; pts.push(V(s * 0.42, (ys + 9.7) / 2, -0.28), V(s * 0.52, 9.5, -0.05), fem); }                    // plexo lombar → nervo femoral
        else if (nome === "L5" || (g === "S" && n <= 3)) { r = 0.017; pts.push(V(s * 0.4, (ys + sacral.y) / 2, (c.z + sacral.z) / 2), sacral); }    // plexo sacral → nervo isquiático
        else pts.push(V(s * 0.24, ys - 0.14, c.z + 0.03));                                                                                         // S4, S5 e coccígeo
        tubo(pts, r, "nervos_espinais", "nervoso", "nervo");
      });
      /* ---- sistema nervoso autônomo: tronco simpático (cadeia de gânglios ao lado da coluna) ---- */
      const zs = y => y > 14.4 ? 0.3 : y > 11.5 ? 0.22 : y > 9.7 ? 0.4 : 0.26;
      const xs = y => y > 9.7 ? 0.3 : 0.3 * Math.max(0.2, (y - 8.9) / 0.8);
      const ts = y => { const c = canal(y); return V(c.x + s * xs(y), y, c.z + zs(y)); };
      const impar = V(0, 8.95, canal(8.95).z + 0.24);
      const cerv = [[15.35, 0.042, 2.3], [14.9, 0.03, 1.5], [14.52, 0.04, 1.7]];   // cervicais superior, médio e cervicotorácico (estrelado)
      const comRaiz = niveis.filter(([nome]) => /^T([2-9]|1[0-2])$|^L[1-4]$|^S[1-4]$/.test(nome));
      tubo([ts(15.62), ...cerv.map(g => ts(g[0])), ...comRaiz.map(([, ys]) => ts(ys)), impar], 0.012, "tronco_simpatico", "nervoso", "nervo");
      cerv.forEach(g => ganglio("ganglios_simpaticos", ts(g[0]), g[1], [1, g[2], 1]));
      comRaiz.forEach(([, ys]) => {
        const G = ts(ys), c = canal(ys), F = V(s * 0.2, ys, c.z + 0.06);
        ganglio("ganglios_simpaticos", G, 0.03, [1, 1.5, 1]);
        tubo([G, G.clone().lerp(F, 0.5).add(V(s * 0.03, 0.015, 0)), F], 0.007, "tronco_simpatico", "nervoso", "nervo");   // ramos comunicantes
      });
      [[14.52, 14.48], [15.35, 15.25], [15.35, 15.37], [14.9, 14.87]].forEach(([yg, yn]) => { const c = canal(yn); tubo([ts(yg), ts(yg).lerp(V(s * 0.2, yn, c.z + 0.06), 0.5), V(s * 0.2, yn, c.z + 0.06)], 0.007, "tronco_simpatico", "nervoso", "nervo"); });
      if (s > 0) ganglio("ganglios_simpaticos", impar, 0.035, [1.2, 1, 1]);   // gânglio ímpar, onde as duas cadeias se unem
      // gânglios pré-vertebrais (à frente da aorta) e nervos esplâncnicos que chegam a eles
      const ao = y => V(0.08, y, (y > 11.59 ? 0.08 - (y - 11.59) * 0.34 : 0.08 + (11.59 - y) * 0.138) + 0.1);
      const cel = ao(11.75).add(V(s * 0.16, 0, 0)), mesS = ao(11.45), mesI = ao(10.7);
      ganglio("ganglios_pre_vertebrais", cel, 0.06, [1.1, 0.8, 0.7]);
      const yT = n => 14.48 - (n - 1) * 0.2515;
      [5, 6, 7, 8, 9].forEach(n => tubo([ts(yT(n)), V(s * 0.3, (yT(n) + 12.0) / 2, canal(12.4).z + 0.32), V(s * 0.22, 12.0, -0.25), cel], 0.008, "nervos_esplancnicos", "nervoso", "nervo"));   // esplâncnico maior
      [10, 11].forEach(n => tubo([ts(yT(n)), V(s * 0.26, 11.75, -0.2), mesS.clone().add(V(s * 0.05, 0, 0))], 0.008, "nervos_esplancnicos", "nervoso", "nervo"));                               // esplâncnico menor
      [11.4, 11.03].forEach(y => tubo([ts(y), V(s * 0.2, y - 0.35, 0.05), mesI.clone().add(V(s * 0.04, 0, 0))], 0.008, "nervos_esplancnicos", "nervoso", "nervo"));                              // esplâncnicos lombares
      tubo([cel, mesS], 0.01, "nervos_esplancnicos", "nervoso", "nervo");
      // plexo hipogástrico: desce do gânglio mesentérico inferior para os órgãos da pelve
      tubo([mesI, V(s * 0.06, 10.1, 0.12), V(s * 0.2, 9.6, -0.2), V(s * 0.28, 9.15, -0.42)], 0.01, "nervos_esplancnicos", "nervoso", "nervo");
      ganglio("ganglios_pre_vertebrais", V(s * 0.28, 9.15, -0.42), 0.04, [1, 1, 0.8]);
      if (s > 0) {
        ganglio("ganglios_pre_vertebrais", mesS, 0.05, [1, 0.9, 0.7]); ganglio("ganglios_pre_vertebrais", mesI, 0.045, [1, 0.9, 0.7]);
        tubo([mesS, ao(11.1), mesI], 0.01, "nervos_esplancnicos", "nervoso", "nervo");
        // ramos do plexo celíaco ("plexo solar") para estômago, fígado e intestino
        [[[0.3, 11.85, 0.3], [0.55, 11.8, 0.5]], [[-0.25, 11.9, 0.3], [-0.55, 11.95, 0.45]], [[0.1, 11.4, 0.35], [0.15, 11.1, 0.5]]].forEach(b => tubo([ao(11.75), VA(b[0]), VA(b[1])], 0.008, "nervos_esplancnicos", "nervoso", "nervo"));
      }
    });
  })();

  // Nervos periféricos complementares: ramos do plexo braquial até os dedos, todos os
  // intercostais, ramos dos plexos lombar e sacral até o pé e nervos frênico, vago e facial.
  // Coordenadas do lado esquerdo (x > 0), espelhadas para o direito; trajetos guiados pelos
  // ossos e pela pele do próprio modelo. O antebraço direito acompanha o pivô do cotovelo.
  (function () {
    const pv = pivo(grupos.nervoso, "nervoso");
    [-1, 1].forEach(s => {
      const L = s < 0 ? "D" : "E";
      const nv = (id, r, pts, piv) => {
        const q = pts.map(p => [p[0] * s, p[1], p[2]]);
        if (piv && s < 0) tubo(q.map(p => [p[0] - COT.x, p[1] - COT.y, p[2] - COT.z]), r, id, "nervoso", "nervo", pv);
        else tubo(q, r, id, "nervoso", "nervo");
      };
      const esq = p => [Math.abs(p[0]), p[1], p[2]];
      /* ---- membro superior (plexo braquial) ---- */
      const ax = [0.98, 14.09, 0.02], punho = [2.45, 8.81, 0.34], palma = [2.58, 8.45, 0.4];
      // mediano (o trecho braço–punho vem dos trajetos reais): palma e dedos polegar, indicador e médio
      nv("nervo_mediano", 0.022, [punho, [2.52, 8.62, 0.37], palma], true);
      nv("nervo_mediano", 0.011, [palma, [2.88, 8.42, 0.48], [3.05, 8.3, 0.57], [3.18, 8.05, 0.7]], true);
      nv("nervo_mediano", 0.011, [palma, [2.82, 8.05, 0.44], [2.97, 7.65, 0.58], [3.06, 7.42, 0.78]], true);
      nv("nervo_mediano", 0.011, [palma, [2.62, 8.05, 0.44], [2.73, 7.62, 0.63], [2.76, 7.4, 0.8]], true);
      // ulnar: face medial do braço, atrás do epicôndilo medial ("choque" do cotovelo), dedos anular e mínimo
      nv("nervo_ulnar", 0.026, [ax, [1.3, 13.8, -0.12], [1.58, 13.1, -0.27], [1.78, 12.3, -0.36], [1.9, 11.6, -0.46], [1.93, 11.15, -0.5]]);
      nv("nervo_ulnar", 0.024, [[1.93, 11.15, -0.5], [2.08, 10.7, -0.42], [2.2, 10.2, -0.28], [2.26, 9.6, -0.08], [2.32, 9.1, 0.12], [2.36, 8.8, 0.24], [2.36, 8.4, 0.3]], true);
      nv("nervo_ulnar", 0.011, [[2.36, 8.4, 0.3], [2.3, 8.05, 0.42], [2.24, 7.75, 0.64], [2.23, 7.6, 0.76]], true);
      nv("nervo_ulnar", 0.011, [[2.36, 8.4, 0.3], [2.47, 8.05, 0.42], [2.48, 7.75, 0.6], [2.5, 7.45, 0.84]], true);
      // radial: contorna o úmero por trás e desce pela face lateral até o dorso da mão
      nv("nervo_radial", 0.028, [ax, [1.35, 13.9, -0.2], [1.62, 13.5, -0.38], [1.85, 12.9, -0.42], [2.08, 12.3, -0.4], [2.22, 11.8, -0.3], [2.3, 11.3, -0.2]]);
      nv("nervo_radial", 0.022, [[2.3, 11.3, -0.2], [2.45, 10.8, -0.12], [2.56, 10.2, -0.05], [2.64, 9.6, 0.04], [2.74, 9.1, 0.16], [2.8, 8.85, 0.26], [2.95, 8.6, 0.4], [3.05, 8.4, 0.52]], true);
      // axilar (deltoide) e musculocutâneo (bíceps)
      nv("nervos_ombro_braco", 0.02, [ax, [1.3, 14.0, -0.2], [1.6, 13.85, -0.42], [1.9, 13.7, -0.4], [2.1, 13.6, -0.25]]);
      nv("nervos_ombro_braco", 0.02, [ax, [1.4, 13.85, 0.02], [1.72, 13.2, -0.02], [1.93, 12.4, -0.05], [2.12, 11.7, 0], [2.28, 11.2, 0.05]]);
      nv("nervos_ombro_braco", 0.015, [[2.28, 11.2, 0.05], [2.42, 10.7, 0.1], [2.52, 10.1, 0.14], [2.58, 9.5, 0.2]], true);
      /* ---- tronco ---- */
      for (let n = 2; n <= 12; n++) if (![3, 5, 7, 9].includes(n)) tubo(intercostalPts(n, L), 0.016, "nervos_intercostais", "nervoso", "nervo");
      // frênico (C3–C5): desce pelo pescoço e pelo tórax, ao lado do coração, até o diafragma
      nv("nervo_frenico", 0.018, [[0.3, 15.05, 0.05], [0.35, 14.5, 0.12], [0.4, 14.0, 0.15], [0.62, 13.5, 0.2], [0.82, 13.0, 0.25], [0.85, 12.5, 0.28], [0.7, 12.05, 0.3]]);
      // vago (X par craniano): do tronco encefálico ao pescoço, tórax (junto ao esôfago) e estômago
      const vago = [[0.14, 15.6, -0.22], [0.3, 15.3, -0.05], [0.33, 14.8, 0.02], [0.3, 14.2, 0], [0.22, 13.7, -0.1], [0.2, 13.0, -0.25], [0.15, 12.3, -0.25]].map(p => [p[0] * s, p[1], p[2]]);
      tubo(vago.concat(s > 0 ? [[0.2, 11.95, -0.05], [0.45, 11.8, 0.3], [0.7, 11.6, 0.5]] : [[0.02, 11.98, -0.25], [0.2, 11.75, -0.12], [0.4, 11.6, -0.05]]), 0.026, "nervo_vago", "nervoso", "nervo");
      // facial (VII par craniano): sai à frente da orelha e abre-se em leque sobre o rosto
      const fac = [0.68, 15.75, 0.08];
      nv("nervo_facial", 0.015, [[0.2, 15.8, -0.2], [0.48, 15.8, -0.12], fac]);
      nv("nervo_facial", 0.01, [fac, [0.7, 16.1, 0.3], [0.62, 16.42, 0.48]]);
      nv("nervo_facial", 0.01, [fac, [0.68, 15.95, 0.42], [0.58, 16.0, 0.72]]);
      nv("nervo_facial", 0.01, [fac, [0.64, 15.65, 0.48], [0.48, 15.6, 0.82]]);
      nv("nervo_facial", 0.01, [fac, [0.58, 15.4, 0.3], [0.44, 15.2, 0.6]]);
      // trigêmeo (V par): gânglio trigeminal e os ramos oftálmico, maxilar e mandibular
      const gt = [0.26, 15.98, -0.02];
      nv("nervo_trigemeo", 0.018, [[0.16, 15.9, -0.22], [0.2, 15.95, -0.12], gt]);
      ganglio("nervo_trigemeo", [gt[0] * s, gt[1], gt[2]], 0.05, [1.2, 0.8, 1]);
      nv("nervo_trigemeo", 0.012, [gt, [0.3, 16.25, 0.35], [0.3, 16.45, 0.7], [0.26, 16.6, 0.82]]);
      nv("nervo_trigemeo", 0.012, [gt, [0.32, 15.92, 0.4], [0.3, 15.85, 0.82]]);
      nv("nervo_trigemeo", 0.012, [gt, [0.36, 15.6, 0.15], [0.34, 15.3, 0.4], [0.22, 15.12, 0.66]]);
      // acessório (XI par) para o trapézio e hipoglosso (XII par) para a língua
      nv("nervo_acessorio", 0.014, [[0.14, 15.5, -0.26], [0.36, 15.2, -0.3], [0.62, 14.85, -0.38], [0.95, 14.5, -0.45]]);
      nv("nervo_hipoglosso", 0.012, [[0.12, 15.52, -0.18], [0.3, 15.25, 0.05], [0.24, 15.15, 0.32], [0.08, 15.22, 0.5]]);
      // ramos do vago para o coração e os pulmões
      nv("nervo_vago", 0.012, [[0.24, 13.8, -0.08], [0.3, 13.55, 0.1], [0.25, 13.3, 0.25]]);
      nv("nervo_vago", 0.012, [[0.2, 13.3, -0.2], [0.42, 13.2, -0.15], [0.62, 13.1, -0.1]]);
      // plexo cervical (C1–C4): occipital (couro cabeludo) e supraclaviculares (ombro)
      nv("plexo_cervical", 0.012, [[0.2, 15.4, -0.05], [0.3, 15.55, -0.5], [0.3, 15.95, -1.0], [0.3, 16.35, -1.2]]);
      nv("plexo_cervical", 0.012, [[0.3, 15.1, 0.1], [0.55, 14.8, 0.2], [0.85, 14.5, 0.3], [1.15, 14.3, 0.3]]);
      /* ---- plexo lombar ---- */
      nv("nervo_femoral", 0.02, [[0.56, 8.95, 0.25], [0.75, 8.3, 0.35], [0.9, 7.5, 0.3], [0.95, 6.6, 0.25]]);                                   // ramos para o quadríceps
      nv("nervo_femoral", 0.016, [[0.66, 5.61, -0.04], [0.5, 5.0, -0.15], [0.4, 4.4, -0.25], [0.38, 3.4, -0.33], [0.4, 2.4, -0.35], [0.45, 1.5, -0.33], [0.52, 0.8, -0.2]]);   // nervo safeno
      nv("nervo_obturatorio", 0.02, [[0.3, 10.6, -0.5], [0.42, 9.8, -0.35], [0.48, 9.0, -0.12], [0.42, 8.3, -0.05], [0.4, 7.4, -0.08], [0.45, 6.6, -0.1]]);
      nv("ramos_plexo_lombar", 0.016, [[0.3, 11.3, -0.6], [0.8, 11.0, -0.55], [1.2, 10.6, -0.2], [1.25, 10.2, 0.2], [0.9, 9.8, 0.5], [0.4, 9.45, 0.62]]);       // ílio-hipogástrico
      nv("ramos_plexo_lombar", 0.016, [[0.35, 10.9, -0.5], [0.8, 10.5, -0.3], [1.2, 10.0, 0.1], [1.3, 9.4, 0.3], [1.35, 8.5, 0.32], [1.3, 7.4, 0.3], [1.2, 6.2, 0.25]]);   // cutâneo femoral lateral
      /* ---- plexo sacral ---- */
      nv("nervo_pudendo", 0.016, [[0.3, 9.5, -0.72], [0.5, 9.0, -0.6], [0.45, 8.6, -0.4], [0.25, 8.45, -0.15]]);
      const isq = N["isquiatico" + L].map(esq), popl = isq.reduce((a, p) => Math.abs(p[1] - 5.0) < Math.abs(a[1] - 5.0) ? p : a), torn = isq[isq.length - 1];
      // tibial: continua pela planta do pé
      nv("nervo_tibial", 0.02, [torn, [0.6, 0.3, -0.25], [0.78, 0.14, 0.15], [1.0, 0.11, 0.7], [1.15, 0.1, 1.1]]);
      // fibular comum: contorna a cabeça da fíbula e divide-se em profundo (frente da perna e dorso do pé) e superficial (lateral)
      // dedos dos pés: ramos digitais plantares (tibial) e dorsais (fibular)
      const dedos = [[0.98, 0.11, 1.32], [1.15, 0.11, 1.28], [1.3, 0.11, 1.23], [1.43, 0.11, 1.16], [1.56, 0.11, 1.08]];
      dedos.forEach((d, i) => nv("nervo_tibial", 0.009, [[1.0, 0.11, 0.7], [0.95 + i * 0.12, 0.1, 0.95], d]));
      dedos.forEach((d, i) => nv("nervo_fibular", 0.009, [i < 2 ? [1.05, 0.24, 1.0] : [1.3, 0.22, 0.95], [d[0], 0.19, d[2] - 0.14], [d[0], 0.16, d[2] - 0.02]]));
      // sural: pele da panturrilha e da borda lateral do pé
      nv("nervo_sural", 0.016, [popl, [0.88, 4.2, -0.62], [0.92, 3.2, -0.8], [0.95, 2.2, -0.75], [1.02, 1.2, -0.6], [1.08, 0.6, -0.45], [1.2, 0.3, 0], [1.5, 0.2, 0.6]]);
      // glúteos superior e inferior
      nv("nervos_gluteos", 0.016, [[0.4, 9.6, -0.7], [0.8, 9.75, -0.82], [1.2, 9.6, -0.78]]);
      nv("nervos_gluteos", 0.016, [[0.4, 9.45, -0.72], [0.75, 9.1, -0.85], [1.05, 8.8, -0.8]]);
      const colo = [1.22, 3.9, -0.3];
      nv("nervo_fibular", 0.028, [popl, [1.08, 4.6, -0.45], [1.2, 4.2, -0.4], colo]);
      nv("nervo_fibular", 0.02, [colo, [1.1, 3.4, -0.15], [1.0, 2.6, -0.1], [0.92, 1.8, -0.1], [0.86, 1.0, -0.05], [0.86, 0.62, 0.2], [0.95, 0.42, 0.6], [1.05, 0.24, 1.0], [1.1, 0.18, 1.2]]);
      nv("nervo_fibular", 0.018, [colo, [1.22, 3.2, -0.32], [1.15, 2.4, -0.32], [1.06, 1.6, -0.28], [1.02, 1.0, -0.12], [1.1, 0.6, 0.25], [1.2, 0.4, 0.55], [1.3, 0.22, 0.95]]);
    });
  })();

  // Orelha média e interna (tamanho real) dentro da cabeça, nos dois lados
  if (window.SENTIDOS) (function () {
    const pav = pecas.find(m => m.userData.id === "pavilhao"); if (!pav) return;
    const p = pav.geometry.attributes.position;
    [-1, 1].forEach(s => {
      const cx = new T.Box3(); const v = V(0, 0, 0);
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (v.x * s > 0) cx.expandByPoint(v); }
      if (cx.isEmpty()) return;
      const ent = V(s < 0 ? cx.max.x - 0.02 : cx.min.x + 0.02, cx.min.y + (cx.max.y - cx.min.y) * 0.42, cx.min.z + (cx.max.z - cx.min.z) * 0.62);
      const g = SENTIDOS.construirOrelha((id, k) => material(id, k));
      g.scale.set(0.1 * (s < 0 ? 1 : -1), 0.1, 0.1); g.position.copy(ent).add(V(-s * 0.255, 0, 0));
      g.traverse(o => { if (o.isMesh && o.userData.id) registrar(o, o.userData.id, "sensorial"); });
      grupos.sensorial.add(g);
    });
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
