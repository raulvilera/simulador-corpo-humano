/* =========================================================================
   CORPO EM MOVIMENTO — andar e correr
   As malhas anatômicas são estáticas. Para animá-las, este módulo cria um
   esqueleto virtual (quadril, coluna, cabeça, braços e pernas) e calcula, para
   cada vértice, quanto ele segue cada "osso" (pesos de skinning). A deformação é
   feita na placa de vídeo (THREE.SkinnedMesh) e só fica ligada enquanto o corpo
   se move: parado, o modelo volta a ser exatamente o original.
   Coordenadas do corpo (≈ decímetros): frente = +Z, para cima = +Y, lado DIREITO = -X.
   ========================================================================= */
window.MOVIMENTO = (function () {
  const RAD = Math.PI / 180, TAU = Math.PI * 2;
  // gaussiana periódica (fase em [0,1))
  const g = (p, c, w) => { let d = p - c; d -= Math.round(d); return Math.exp(-(d / w) * (d / w)); };
  const fr = p => p - Math.floor(p);

  function criar(corpo, T) {
    const { raiz } = corpo;
    const V = (x, y, z) => new T.Vector3(x, y, z);
    const COT = corpo.refs.cotoveloD || V(-2.359, 11.226, -0.109);

    /* ------------------------- ESQUELETO VIRTUAL --------------------------- */
    // junta (centro de rotação) e segmento de influência [a, b] de cada osso, raio típico do
    // segmento (r), quanto custa passar das pontas (kA, kB) e achatamento do tronco em Z (zs)
    const DEF = [];
    const osso = (nome, pai, lado, junta, a, b, r, kA, kB, zs) => DEF.push({ nome, pai, lado, junta, a, b, r, kA, kB, zs: zs || 1 });
    osso("quadril", null, 0, V(0, 9.3, -0.15), V(0, 8.45, -0.15), V(0, 10.1, -0.2), 1.3, 2.5, 0.6, 1.3);
    osso("lombar", "quadril", 0, V(0, 10.1, -0.3), V(0, 10.1, -0.15), V(0, 11.7, -0.15), 1.3, 0.6, 0.6, 1.3);
    osso("torax", "lombar", 0, V(0, 11.7, -0.3), V(0, 11.7, -0.15), V(0, 14.0, -0.2), 1.35, 0.6, 0.8, 1.3);
    osso("pescoco", "torax", 0, V(0, 14.15, -0.25), V(0, 14.1, -0.2), V(0, 15.3, -0.1), 0.65, 0.8, 0.6, 1);
    osso("cabeca", "pescoco", 0, V(0, 15.3, -0.15), V(0, 15.4, 0), V(0, 16.9, 0), 1.0, 0.6, 1, 1);
    [-1, 1].forEach(s => {
      const L = s < 0 ? "D" : "E", m = v => V(v.x * (s < 0 ? 1 : -1), v.y, v.z);
      const ombro = V(-1.62, 13.85, -0.2), cot = V(COT.x, COT.y, COT.z), punho = V(-2.55, 8.95, 0.15), dedos = V(-2.75, 7.5, 0.5);
      const coxa = V(-0.88, 8.85, -0.2), joelho = V(-0.78, 4.58, -0.17), torn = V(-0.98, 0.62, -0.1);
      osso("ombro" + L, "torax", s, m(ombro), m(ombro), m(cot), 0.5, 2.2, 0.6);
      osso("cotovelo" + L, "ombro" + L, s, m(cot), m(cot), m(punho), 0.42, 0.6, 0.6);
      osso("punho" + L, "cotovelo" + L, s, m(punho), m(punho), m(dedos), 0.4, 0.6, 1);
      osso("coxa" + L, "quadril", s, m(coxa), m(coxa), m(joelho), 0.7, 2.5, 0.6);
      osso("joelho" + L, "coxa" + L, s, m(joelho), m(joelho), m(torn), 0.55, 0.6, 2.0);
      osso("tornozelo" + L, "joelho" + L, s, m(torn), m(V(-1.0, 0.35, -0.35)), m(V(-1.15, 0.2, 1.15)), 0.45, 1, 1);
    });
    const NB = DEF.length, IDX = {};
    DEF.forEach((d, i) => IDX[d.nome] = i);

    const rig = new T.Object3D(); rig.name = "rig-movimento";   // fora da cena: espaço = corpo em repouso
    const ossos = DEF.map(d => { const b = new T.Bone(); b.name = d.nome; return b; });
    DEF.forEach((d, i) => {
      const b = ossos[i], pai = d.pai ? DEF[IDX[d.pai]] : null;
      b.position.copy(d.junta); if (pai) b.position.sub(pai.junta);
      (pai ? ossos[IDX[d.pai]] : rig).add(b);
    });
    rig.updateMatrixWorld(true);
    const esqueleto = new T.Skeleton(ossos);
    const B = n => ossos[IDX[n]];
    const posQuadril = DEF[0].junta.clone();

    // marcadores da sola (calcanhar, cabeça dos metatarsos e ponta dos dedos) para manter os pés no chão
    const marcadores = { D: [], E: [] };
    [-1, 1].forEach(s => {
      const L = s < 0 ? "D" : "E", t = B("tornozelo" + L), j = DEF[IDX["tornozelo" + L]].junta;
      [[-0.98, 0.08, -0.62], [-1.12, 0.08, 0.85], [-1.2, 0.1, 1.25]].forEach(p => {
        const o = new T.Object3D(); o.position.set(p[0] * (s < 0 ? 1 : -1) - j.x, p[1] - j.y, p[2] - j.z); t.add(o); marcadores[L].push(o);
      });
    });
    const CHAO = 0.08;

    /* --------------------------- PESOS POR VÉRTICE -------------------------- */
    const S = DEF.map(d => {
      const zs = d.zs, ax = d.a.x, ay = d.a.y, az = d.a.z * zs, dx = d.b.x - ax, dy = d.b.y - ay, dz = d.b.z * zs - az;
      const l2 = dx * dx + dy * dy + dz * dz;
      return { ax, ay, az, dx, dy, dz, l2, l: Math.sqrt(l2), r: d.r, kA: d.kA, kB: d.kB, zs, lado: d.lado, perna: /^(coxa|joelho|tornozelo)/.test(d.nome) };
    });
    const SUAVE = 0.14;
    const nTmp = new Float32Array(NB);
    // calcula até 4 ossos e pesos para o ponto (x,y,z) do corpo em repouso
    function pesos(x, y, z, iOut, wOut) {
      let nmin = 1e9;
      for (let i = 0; i < NB; i++) {
        const s = S[i];
        // membro do outro lado: só vale perto da linha média; abaixo da virilha, nunca (as coxas se tocam)
        if (s.lado && (x * s.lado < -0.25 || (s.perna && y < 8.4 && x * s.lado < 0))) { nTmp[i] = 1e9; continue; }
        const px = x - s.ax, py = y - s.ay, pz = z * s.zs - s.az;
        const t = (px * s.dx + py * s.dy + pz * s.dz) / s.l2;
        const qx = px - s.dx * t, qy = py - s.dy * t, qz = pz - s.dz * t;
        const alem = t < 0 ? -t * s.l * s.kA : t > 1 ? (t - 1) * s.l * s.kB : 0;
        const n = Math.sqrt(qx * qx + qy * qy + qz * qz + alem * alem) / s.r;
        nTmp[i] = n; if (n < nmin) nmin = n;
      }
      // os 4 menores
      for (let k = 0; k < 4; k++) { iOut[k] = 0; wOut[k] = 0; }
      let soma = 0;
      for (let k = 0; k < 4; k++) {
        let m = -1, mv = 1e9;
        for (let i = 0; i < NB; i++) if (nTmp[i] < mv) { mv = nTmp[i]; m = i; }
        if (m < 0 || mv > nmin + SUAVE * 4.6) break;   // contribuição < 1%
        const w = Math.exp(-(mv - nmin) / SUAVE);
        iOut[k] = m; wOut[k] = w; soma += w; nTmp[m] = 1e9;
      }
      for (let k = 0; k < 4; k++) wOut[k] /= soma;
    }
    // ossos do esqueleto: cada peça segue um único osso virtual (são rígidos)
    const RIGIDO = {
      pelve: "quadril", sacro: "quadril", femur: "coxa", patela: "joelho", osso_tibia: "joelho", fibula: "joelho", tibia: "joelho",
      calcaneo: "tornozelo", talus: "tornozelo", tarso: "tornozelo", metatarso: "tornozelo", falanges_pe: "tornozelo", pe: "tornozelo",
      umero: "ombro", osso_radio: "cotovelo", ulna: "cotovelo", radio: "cotovelo", carpo: "punho", metacarpo: "punho", falanges_mao: "punho", mao: "punho",
      vertebras_cervicais: "pescoco", vertebras_toracicas: "torax", vertebras_lombares: "lombar",
      costelas_verdadeiras: "torax", costelas_falsas: "torax", costelas_flutuantes: "torax", cartilagens_costais: "torax",
      manubrio: "torax", corpo_esterno: "torax", processo_xifoide: "torax", clavicula: "torax", escapula: "torax",
      osso_frontal: "cabeca", osso_parietal: "cabeca", osso_occipital: "cabeca", osso_temporal: "cabeca", osso_esfenoide: "cabeca",
      osso_zigomatico: "cabeca", osso_nasal: "cabeca", maxila: "cabeca", osso_palatino: "cabeca", vomer: "cabeca", osso_etmoide: "cabeca",
      osso_lacrimal: "cabeca", mandibula: "cabeca"
    };
    const LADOS = new Set(["coxa", "joelho", "tornozelo", "ombro", "cotovelo", "punho"]);
    const PERNA_D = new Set(["coxaD", "joelhoD", "tornozeloD"].map(n => IDX[n])), PERNA_E = new Set(["coxaE", "joelhoE", "tornozeloE"].map(n => IDX[n]));
    function ossoRigido(m) {
      if (m.userData.sistema !== "esqueletico") return null;
      return RIGIDO[m.userData.id] || null;
    }

    let malhas = null;   // malhas preparadas (com pesos)
    const iT = new Uint8Array(4), wT = new Float32Array(4);
    function pesosDaMalha(m, Lm) {
      const geo = m.geometry, p = geo.attributes.position, n = p.count;
      const si = new Uint8Array(n * 4), sw = new Uint8Array(n * 4);
      const rig1 = ossoRigido(m), v = V(0, 0, 0), e = Lm.elements;
      for (let i = 0; i < n; i++) {
        const x0 = p.getX(i), y0 = p.getY(i), z0 = p.getZ(i);
        const x = e[0] * x0 + e[4] * y0 + e[8] * z0 + e[12], y = e[1] * x0 + e[5] * y0 + e[9] * z0 + e[13], z = e[2] * x0 + e[6] * y0 + e[10] * z0 + e[14];
        if (rig1) {
          const nome = LADOS.has(rig1) ? rig1 + (x < 0 ? "D" : "E") : rig1;
          si[i * 4] = IDX[nome]; sw[i * 4] = 255; continue;
        }
        pesos(x, y, z, iT, wT);
        let resto = 255, maior = 0;
        for (let k = 0; k < 4; k++) {
          const q = Math.round(wT[k] * 255); si[i * 4 + k] = iT[k]; sw[i * 4 + k] = q; resto -= q;
          if (wT[k] > wT[maior]) maior = k;
        }
        sw[i * 4 + maior] += resto;   // soma exata = 255
      }
      geo.setAttribute("skinIndex", new T.BufferAttribute(si, 4));
      geo.setAttribute("skinWeight", new T.BufferAttribute(sw, 4, true));
      // Na pele, as coxas encostam uma na outra e a malha liga as duas pernas. Em movimento,
      // esses triângulos de "ponte" virariam uma membrana esticada: são retirados enquanto o corpo se move.
      if (geo.index) {
        const ladoPerna = new Int8Array(n);
        for (let i = 0; i < n; i++) {
          let d = 0, e = 0;
          for (let k = 0; k < 4; k++) { const b = si[i * 4 + k], w = sw[i * 4 + k]; if (PERNA_D.has(b)) d += w; else if (PERNA_E.has(b)) e += w; }
          ladoPerna[i] = d > 128 ? -1 : e > 128 ? 1 : 0;
        }
        const idx = geo.index.array, fica = [];
        let tirou = 0;
        for (let t = 0; t < idx.length; t += 3) {
          const a = ladoPerna[idx[t]], b = ladoPerna[idx[t + 1]], c = ladoPerna[idx[t + 2]];
          if ((a < 0 || b < 0 || c < 0) && (a > 0 || b > 0 || c > 0)) { tirou++; continue; }
          fica.push(idx[t], idx[t + 1], idx[t + 2]);
        }
        if (tirou) { geo.userData.indiceOrig = geo.index; geo.userData.indiceMov = new T.BufferAttribute(n > 65535 ? new Uint32Array(fica) : new Uint16Array(fica), 1); }
      }
    }

    const inv = new T.Matrix4(), raizInv = new T.Matrix4();
    let quadro = 0, quadroInv = -1;
    function atualizarBind() {   // onBeforeRender: this = malha
      if (quadroInv !== quadro) { raizInv.copy(raiz.matrixWorld).invert(); quadroInv = quadro; }
      this.bindMatrix.multiplyMatrices(raizInv, this.matrixWorld);
      this.bindMatrixInverse.copy(this.bindMatrix).invert();
    }
    async function preparar(aoProgresso) {
      if (malhas) return;
      const lista = [];
      raiz.updateMatrixWorld(true);
      raizInv.copy(raiz.matrixWorld).invert();
      raiz.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh || o.userData.particula || o.userData.semMovimento) return;
        if (!o.geometry || !o.geometry.attributes.position) return;
        lista.push(o);
      });
      const total = lista.reduce((s, m) => s + m.geometry.attributes.position.count, 0);
      const geoDe = new Map();
      let feito = 0, desdePausa = 0;
      for (const m of lista) {
        const Lm = new T.Matrix4().multiplyMatrices(raizInv, m.matrixWorld);
        const outra = geoDe.get(m.geometry);
        if (outra && !outra.equals(Lm)) m.geometry = m.geometry.clone();   // mesma geometria em outro lugar
        if (!geoDe.has(m.geometry)) { pesosDaMalha(m, Lm); geoDe.set(m.geometry, Lm); }
        const c = m.geometry.attributes.position.count; feito += c; desdePausa += c;
        if (desdePausa > 120000) { desdePausa = 0; aoProgresso && aoProgresso(feito / total); await new Promise(r => setTimeout(r, 0)); }
      }
      malhas = lista;
      aoProgresso && aoProgresso(1);
    }
    // liga/desliga a deformação (SkinnedMesh só enquanto há movimento)
    let skinLigado = false;
    function ligarSkin(on) {
      if (!malhas || on === skinLigado) return;
      skinLigado = on;
      malhas.forEach(m => {
        const geo = m.geometry;
        if (on) {
          Object.setPrototypeOf(m, T.SkinnedMesh.prototype);
          m.isSkinnedMesh = true; m.type = "SkinnedMesh"; m.bindMode = "detached";
          if (!m.bindMatrix) { m.bindMatrix = new T.Matrix4(); m.bindMatrixInverse = new T.Matrix4(); }
          m.skeleton = esqueleto; m.onBeforeRender = atualizarBind;
          if (!geo.boundingSphere) geo.computeBoundingSphere();
          if (geo.userData.raio0 === undefined) geo.userData.raio0 = geo.boundingSphere.radius;
          geo.boundingSphere.radius = geo.userData.raio0 + 6;   // os membros saem do lugar
          if (geo.userData.indiceMov) geo.setIndex(geo.userData.indiceMov);
        } else {
          Object.setPrototypeOf(m, T.Mesh.prototype);
          m.isSkinnedMesh = false; m.type = "Mesh";
          delete m.onBeforeRender;
          if (geo.userData.raio0 !== undefined && geo.boundingSphere) geo.boundingSphere.radius = geo.userData.raio0;
          if (geo.userData.indiceOrig) geo.setIndex(geo.userData.indiceOrig);
        }
      });
    }

    /* ----------------------------- CICLO DA MARCHA ---------------------------- */
    // q = fase da passada de UMA perna: 0 = contato do calcanhar (andar) / do pé (correr)
    const ANDAR = {
      freq: 0.9, apoio: 0.6,
      quadril: q => 10 + 20 * Math.cos(TAU * (q - 0.9)),
      joelho: q => 4 + 14 * g(q, 0.14, 0.08) + 56 * g(q, 0.72, 0.12),
      tornozelo: q => -6 * g(q, 0.06, 0.05) + 10 * g(q, 0.42, 0.12) - 18 * g(q, 0.62, 0.06) + 2 * g(q, 0.85, 0.1),
      ombro: q => 3 + 15 * Math.cos(TAU * (q - 0.9)),
      cotovelo: q => 14 + 10 * Math.max(0, Math.cos(TAU * (q - 0.9))),
      giro: 4, bascula: 3.5, desvio: 0.22, incl: 2, aduc: 0, voo: 0,
      ativ: {   // ativação aproximada (eletromiografia da marcha)
        gluteo: q => g(q, 0.05, 0.1),
        quadriceps: q => 0.9 * g(q, 0.1, 0.08) + 0.3 * g(q, 0.95, 0.06),
        isquiotibiais: q => 0.8 * g(q, 0.92, 0.08) + 0.3 * g(q, 0.03, 0.05),
        panturrilha: q => g(q, 0.45, 0.1),
        tibial: q => 0.7 * g(q, 0.03, 0.06) + 0.5 * g(q, 0.75, 0.12)
      }
    };
    const CORRER = {
      freq: 1.4, apoio: 0.38,
      quadril: q => 15 + 32 * Math.cos(TAU * (q - 0.85)),
      joelho: q => 18 + 24 * g(q, 0.16, 0.09) + 92 * g(q, 0.66, 0.13),
      tornozelo: q => -4 * g(q, 0.0, 0.04) + 12 * g(q, 0.15, 0.08) - 26 * g(q, 0.38, 0.06) + 6 * g(q, 0.75, 0.12),
      ombro: q => 8 + 30 * Math.cos(TAU * (q - 0.85)),
      cotovelo: q => 86 + 8 * Math.cos(TAU * (q - 0.85)),
      giro: 6, bascula: 4, desvio: 0.12, incl: 8, aduc: 7, voo: 0.32,
      ativ: {
        gluteo: q => g(q, 0.0, 0.1) + 0.4 * g(q, 0.85, 0.08),
        quadriceps: q => g(q, 0.12, 0.1) + 0.3 * g(q, 0.9, 0.06),
        isquiotibiais: q => 0.9 * g(q, 0.88, 0.1) + 0.3 * g(q, 0.05, 0.06),
        panturrilha: q => g(q, 0.24, 0.1),
        tibial: q => 0.5 * g(q, 0.0, 0.06) + 0.6 * g(q, 0.78, 0.12)
      }
    };
    const MODOS = { parado: null, andar: ANDAR, correr: CORRER };

    const est = {
      modo: "parado", pA: 0, pC: 0,   // pesos (suavizados) de andar e correr
      fase: 0, velAnim: 1, pausa: false, ligado: false,
      apoio: { D: false, E: false }, ativ: {}, esteira: 0, velEsteira: 0
    };
    Object.keys(ANDAR.ativ).forEach(k => est.ativ[k] = { D: 0, E: 0 });

    const mist = (f, q) => est.pA * ANDAR[f](q) + est.pC * CORRER[f](q);
    const mistN = f => est.pA * ANDAR[f] + est.pC * CORRER[f];
    const tmp = V(0, 0, 0);
    let ultimoPe = null, zAnterior = 0;

    const PERNA = 8.25;   // quadril → sola
    ["D", "E"].forEach(L => B("coxa" + L).rotation.order = "YXZ");   // flexão sempre no plano sagital
    function aplicarPose(p) {
      const A = est.pA + est.pC;
      const giro = mistN("giro") * Math.cos(TAU * p), bascula = -mistN("bascula") * Math.sin(TAU * p), incl = mistN("incl");
      const desvio = -mistN("desvio") * Math.sin(TAU * p);
      // a pelve gira e inclina, mas as pernas compensam: pés apontam para a frente e não escorregam para o lado
      const compZ = -bascula * RAD - Math.asin(Math.max(-0.3, Math.min(0.3, desvio / PERNA)));
      // pernas e braços
      ["D", "E"].forEach(L => {
        const q = fr(p + (L === "E" ? 0.5 : 0)), qb = fr(q + 0.5);   // braço acompanha a perna oposta
        const s = L === "D" ? 1 : -1;
        B("coxa" + L).rotation.set(-mist("quadril", q) * RAD, -giro * RAD, compZ);
        B("joelho" + L).rotation.set(mist("joelho", q) * RAD, 0, 0);
        B("tornozelo" + L).rotation.set(-mist("tornozelo", q) * RAD, 0, 0);
        B("ombro" + L).rotation.set(-mist("ombro", qb) * RAD, 0, s * mistN("aduc") * RAD);
        B("cotovelo" + L).rotation.set(-mist("cotovelo", qb) * RAD, 0, 0);
        B("punho" + L).rotation.set(0, 0, 0);
      });
      // pelve, tronco e cabeça
      const quad = B("quadril"), lomb = B("lombar"), tor = B("torax"), pes = B("pescoco"), cab = B("cabeca");
      quad.rotation.set(incl * 0.3 * RAD, giro * RAD, bascula * RAD);
      lomb.rotation.set(incl * 0.4 * RAD, -giro * 0.6 * RAD, -bascula * 0.5 * RAD);
      tor.rotation.set(incl * 0.3 * RAD, -giro * 0.9 * RAD, -bascula * 0.3 * RAD);
      pes.rotation.set(-incl * 0.6 * RAD, giro * 0.5 * RAD, -bascula * 0.2 * RAD);
      cab.rotation.set(-incl * 0.4 * RAD, 0, 0);
      quad.position.copy(posQuadril);
      quad.position.x += desvio;
      rig.updateMatrixWorld(true);
      // pés no chão: o ponto mais baixo das solas toca o solo
      let ymin = 1e9, pe = null, zPe = 0;
      ["D", "E"].forEach(L => marcadores[L].forEach(o => {
        tmp.setFromMatrixPosition(o.matrixWorld);
        if (tmp.y < ymin) { ymin = tmp.y; pe = L; zPe = tmp.z; }
      }));
      // fase de voo da corrida
      const qv = fr(p - CORRER.apoio + 0.02) % 0.5;
      const voo = est.pC * CORRER.voo * (qv < 0.16 ? Math.sin(Math.PI * qv / 0.16) : 0);
      quad.position.y += (CHAO - ymin) + voo;
      rig.updateMatrixWorld(true);
      // esteira acompanha o pé de apoio (sem escorregar)
      if (A > 0.02 && pe === ultimoPe && voo < 0.02) {
        const dz = zPe - zAnterior;
        if (dz < 0) est.esteira += dz;
      }
      ultimoPe = pe; zAnterior = zPe;
      // apoio e ativação muscular
      ["D", "E"].forEach(L => {
        const q = fr(p + (L === "E" ? 0.5 : 0));
        const apoio = est.pC > est.pA ? CORRER.apoio : ANDAR.apoio;
        est.apoio[L] = A > 0.2 && q < apoio;
        Object.keys(est.ativ).forEach(k => est.ativ[k][L] = est.pA * ANDAR.ativ[k](q) * 0.7 + est.pC * CORRER.ativ[k](q));
      });
    }

    function passo(dt) {
      quadro++;
      const alvo = MODOS[est.modo];
      if (est.pausa && alvo) dt = 0;
      const k = 1 - Math.exp(-dt * 1.8);
      est.pA += ((alvo === ANDAR ? 1 : 0) - est.pA) * k;
      est.pC += ((alvo === CORRER ? 1 : 0) - est.pC) * k;
      const A = est.pA + est.pC;
      if (!alvo && A < 0.01) {
        est.pA = est.pC = 0;
        if (skinLigado) { aplicarPose(est.fase); ligarSkin(false); }
        est.ligado = false; est.apoio.D = est.apoio.E = false;
        Object.values(est.ativ).forEach(a => a.D = a.E = 0);
        return false;
      }
      if (!malhas) return false;
      if (!skinLigado) ligarSkin(true);
      est.ligado = true;
      const f = (est.pA * ANDAR.freq + est.pC * CORRER.freq) / Math.max(A, 1e-3);
      if (!est.pausa) est.fase = fr(est.fase + dt * f * est.velAnim);
      aplicarPose(est.fase);
      return true;
    }

    // Posição deformada de um ponto do corpo (coordenadas do corpo em repouso) — para partículas etc.
    const mB = new T.Matrix4(), acc = V(0, 0, 0), tv = V(0, 0, 0);
    function deformar(v) {
      if (!skinLigado) return v;
      pesos(v.x, v.y, v.z, iT, wT);
      acc.set(0, 0, 0);
      for (let k = 0; k < 4; k++) {
        if (!wT[k]) continue;
        mB.multiplyMatrices(ossos[iT[k]].matrixWorld, esqueleto.boneInverses[iT[k]]);
        acc.addScaledVector(tv.copy(v).applyMatrix4(mB), wT[k]);
      }
      return v.copy(acc);
    }

    return {
      est, preparar, passo, deformar,
      get pronto() { return !!malhas; },
      get ativo() { return skinLigado; },
      definirModo(m) { est.modo = MODOS.hasOwnProperty(m) ? m : "parado"; },
      parar() { est.modo = "parado"; }
    };
  }
  return { criar };
})();
