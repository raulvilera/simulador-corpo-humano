/* =========================================================================
   CORPO HUMANO 3D — Órgãos dos sentidos em detalhe ("Lupa dos sentidos")
   • Olho: malhas reais do HuBMAP (Visible Human, CC BY 4.0) + BodyParts3D.
   • Orelha média/interna, olfato, papilas/botão gustativo e pele: modelos
     didáticos construídos a partir de medidas anatômicas de referência.
   Unidades dos modelos: centímetros (olho, orelha, nariz, língua);
   o bloco de pele é ampliado (~1 unidade = 0,5 mm).
   ========================================================================= */
(function () {
  const T = THREE;
  const V = (x, y, z) => new T.Vector3(x, y, z);

  /* cores extras (somam-se à paleta do corpo) */
  const PAL = {
    meato: [0xe2ae98, { roughness: 0.6, transparent: true, opacity: 0.55 }], timpano: [0xeed8cc, { roughness: 0.3, transparent: true, opacity: 0.85, clearcoat: 0.6 }],
    ossiculo: [0xf0e4c4, { roughness: 0.45, clearcoat: 0.3 }], vestibulo: [0xc4b0ea, { roughness: 0.35, clearcoat: 0.5 }], canal_sc: [0x8fbcef, { roughness: 0.35, clearcoat: 0.5 }],
    coclea: [0xf2a99a, { roughness: 0.35, clearcoat: 0.5 }], tuba: [0xe6b1aa, { roughness: 0.5, transparent: true, opacity: 0.8 }],
    epitelio_olf: [0xf0c94a, { roughness: 0.45, clearcoat: 0.3 }], bulbo: [0xf3d36b, { roughness: 0.4, clearcoat: 0.3 }], cribriforme: [0xe6dcc3, { roughness: 0.7 }],
    concha: [0xe59a96, { roughness: 0.45, clearcoat: 0.4 }], septo: [0xd9c3c0, { roughness: 0.5, transparent: true, opacity: 0.35 }],
    papila_fil: [0xf1cbc4, { roughness: 0.6 }], papila_fung: [0xd5475a, { roughness: 0.4, clearcoat: 0.4 }], papila_cv: [0xd77580, { roughness: 0.4, clearcoat: 0.4 }],
    papila_fol: [0xce6e7a, { roughness: 0.45 }], botao: [0xf5c9b8, { roughness: 0.4, clearcoat: 0.3 }], epit_lingua: [0xf0b7b3, { roughness: 0.5, transparent: true, opacity: 0.35 }],
    corneo: [0xf3dfc8, { roughness: 0.8 }], epiderme: [0xe5b190, { roughness: 0.65 }], derme: [0xeaa6a0, { roughness: 0.6, transparent: true, opacity: 0.5 }],
    hipoderme: [0xf3d68e, { roughness: 0.6, transparent: true, opacity: 0.35 }], gordura: [0xf6dc8a, { roughness: 0.4, clearcoat: 0.3 }],
    pelo: [0x3a2a22, { roughness: 0.5 }], foliculo: [0xd8a38a, { roughness: 0.5, transparent: true, opacity: 0.8 }], sebacea: [0xf6e3a1, { roughness: 0.4 }],
    eretor: [0xc0504d, { roughness: 0.5 }], sudoripara: [0x92cde6, { roughness: 0.35, clearcoat: 0.4 }], meissner: [0xf4b7d0, { roughness: 0.4 }],
    merkel: [0x7fd0c3, { roughness: 0.4 }], ruffini: [0x9fc0f2, { roughness: 0.4 }], pacini: [0xf1e5c8, { roughness: 0.3, transparent: true, opacity: 0.75, clearcoat: 0.5 }],
    conjuntiva: [0xf3dcd8, { roughness: 0.3, transparent: true, opacity: 0.35 }], disco: [0xf6e7a0, { roughness: 0.4 }], vitreo: [0xdbeeff, { roughness: 0.05, transparent: true, opacity: 0.18 }],
    ciliar: [0x5b3b33, { roughness: 0.5 }], coroide: [0x6b2a2a, { roughness: 0.5 }], retina: [0xe58f6e, { roughness: 0.45 }], lacrimal: [0xf0c4b0, { roughness: 0.45 }], palpebra: [0xe8cfc0, { roughness: 0.5 }],
    raio: [0xffe066, {}], oculos: [0xbfe6ff, { roughness: 0.05, transparent: true, opacity: 0.45, clearcoat: 1 }]
  };

  /* ---------------------------- utilidades ------------------------------ */
  const marca = (m, id) => { m.userData.id = id; return m; };
  function tubo(M, pts, r, id, key, segs) {
    const c = new T.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    const m = new T.Mesh(new T.TubeGeometry(c, segs || Math.max(16, pts.length * 10), r, 10, false), M(id, key));
    m.userData.curva = c; return marca(m, id);
  }
  function esfera(M, p, r, id, key, s) { const m = new T.Mesh(new T.SphereGeometry(r, 20, 14), M(id, key)); m.position.copy(p); if (s) m.scale.set(...s); return marca(m, id); }
  function cil(M, a, b, r, id, key, r2) {
    const d = b.clone().sub(a); const m = new T.Mesh(new T.CylinderGeometry(r2 === undefined ? r : r2, r, d.length(), 14), M(id, key));
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return marca(m, id);
  }

  /* ======================= ORELHA (externa, média e interna) =================
     Referencial em cm: lateral = -X; entrada do meato em x = -2,5; tímpano em x ≈ 0. */
  function construirOrelha(M, op) {
    op = op || {};
    const g = new T.Group(); g.name = "orelha_detalhe"; const pecas = {};
    const add = (m, k) => { g.add(m); (pecas[k || m.userData.id] ||= []).push(m); return m; };
    // meato acústico externo
    if (op.meato !== false) add(tubo(M, [V(-2.55, 0.05, 0.05), V(-1.9, 0.12, 0.12), V(-1.1, 0.02, 0.18), V(-0.08, 0, 0.05)], 0.34, "meato_acustico", "meato"));
    // membrana timpânica (cone raso, ápice = umbigo voltado para dentro)
    const tp = new T.Mesh(new T.ConeGeometry(0.45, 0.14, 40, 1, true), M("timpano", "timpano"));
    tp.material.side = T.DoubleSide; tp.rotation.z = -Math.PI / 2; tp.rotation.y = -0.5; tp.position.set(0, 0, 0.05);
    add(marca(tp, "timpano"));
    // ossículos
    const osso = (a, b, r, id, r2) => add(cil(M, a, b, r, id, "ossiculo", r2), id);
    const umbigo = V(0.06, -0.05, 0.05), cabM = V(0.16, 0.48, 0.02);
    osso(umbigo, V(0.12, 0.3, 0.03), 0.035, "martelo", 0.045); osso(V(0.12, 0.3, 0.03), cabM, 0.05, "martelo", 0.06);
    add(esfera(M, cabM, 0.1, "martelo", "ossiculo", [1, 1.15, 1]), "martelo");
    osso(V(0.14, 0.35, 0.02), V(0.26, 0.38, 0.12), 0.025, "martelo");
    const corpoB = V(0.31, 0.46, -0.04);
    add(esfera(M, corpoB, 0.1, "bigorna", "ossiculo", [1, 1.1, 0.9]), "bigorna");
    osso(corpoB, V(0.36, 0.55, -0.3), 0.04, "bigorna", 0.025);           // ramo curto
    osso(corpoB, V(0.36, 0.08, -0.02), 0.035, "bigorna", 0.03);          // ramo longo
    add(esfera(M, V(0.37, 0.06, -0.01), 0.035, "bigorna", "ossiculo"), "bigorna");
    const cabE = V(0.42, 0.05, 0), base = V(0.64, 0.02, 0);
    add(esfera(M, cabE, 0.04, "estribo", "ossiculo"), "estribo");
    [-1, 1].forEach(s => add(tubo(M, [cabE, V(0.52, 0.04, 0.06 * s), base.clone().add(V(0, 0.02, 0.09 * s))], 0.016, "estribo", "ossiculo", 16), "estribo"));
    const pe = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.03, 24), M("estribo", "ossiculo")); pe.scale.set(1, 1, 0.55); pe.rotation.z = Math.PI / 2; pe.position.copy(base); add(marca(pe, "estribo"));
    // orelha interna: vestíbulo
    const vest = V(0.86, 0.06, -0.06);
    add(esfera(M, vest, 0.24, "vestibulo", "vestibulo", [0.9, 1.2, 0.85]));
    // canais semicirculares (três planos perpendiculares) com ampolas
    const canal = (centro, rot, amp) => {
      const t = new T.Mesh(new T.TorusGeometry(0.33, 0.045, 10, 48, Math.PI * 1.55), M("canais_semicirculares", "canal_sc"));
      t.position.copy(centro); t.rotation.set(...rot); add(marca(t, "canais_semicirculares"));
      add(esfera(M, amp, 0.08, "canais_semicirculares", "canal_sc"));
    };
    canal(V(1.0, 0.62, -0.18), [0, Math.PI / 4, -0.6], V(0.82, 0.38, 0.06));          // anterior
    canal(V(1.08, 0.5, -0.55), [0, -Math.PI / 4, 0.9], V(1.02, 0.02, -0.32));         // posterior
    canal(V(0.98, 0.26, -0.48), [Math.PI / 2, 0, 0.5], V(0.68, 0.26, -0.18));         // lateral
    // cóclea: espiral de 2,75 voltas que afina para o ápice
    const espiral = new T.Group(); const voltas = 2.75, N = 6;
    for (let k = 0; k < N; k++) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = (k + i / 24) / N, th = u * voltas * Math.PI * 2, r = 0.46 * (1 - 0.72 * u);
        pts.push(V(Math.cos(th) * r, Math.sin(th) * r, u * 0.5));
      }
      const m = tubo(M, pts, 0.12 * (1 - 0.6 * k / N), "coclea", "coclea", 48); espiral.add(m); (pecas.coclea ||= []).push(m);
    }
    espiral.position.set(0.95, -0.2, 0.32);
    espiral.quaternion.setFromUnitVectors(V(0, 0, 1), V(-0.45, -0.35, 0.82).normalize());
    g.add(espiral);
    add(tubo(M, [V(0.8, -0.05, 0.12), V(0.88, -0.12, 0.25)], 0.09, "coclea", "coclea"));
    // nervo vestibulococlear
    add(tubo(M, [V(1.0, -0.15, 0.32), V(1.4, -0.05, 0.22), V(2.0, 0.02, 0.16), V(2.7, 0.1, 0.1)], 0.1, "nervo_vestibulococlear", "nervo"));
    add(tubo(M, [vest.clone().add(V(0.1, 0, 0)), V(1.35, -0.02, 0.1), V(1.7, -0.02, 0.15)], 0.06, "nervo_vestibulococlear", "nervo"));
    // tuba auditiva (até a faringe)
    add(tubo(M, [V(0.3, -0.32, 0.22), V(0.9, -0.7, 0.9), V(1.6, -1.25, 1.8), V(2.2, -1.8, 2.7)], 0.09, "tuba_auditiva", "tuba"));
    g.userData.pecas = pecas;
    return g;
  }

  /* ============================ NARIZ (olfato) ==============================
     Recebe as malhas reais das cartilagens e conchas inferiores (em cm, centradas). */
  function construirNariz(M, cx) {
    const g = new T.Group(); const y0 = cx.min.y, y1 = cx.max.y, zf = cx.max.z, zb = cx.min.z, xs = Math.max(0.9, cx.max.x);
    const L = zf - zb;
    // conchas média e superior (lâminas enroladas na parede lateral)
    const concha = (s, y, z0, z1, larg) => {
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(V(s * (xs - 0.15 - 0.05 * Math.sin(t * Math.PI)), y + 0.1 * Math.sin(t * Math.PI), z0 + (z1 - z0) * t)); }
      const m = tubo(M, pts, larg, "conchas_nasais", "concha"); m.scale.set(1, 1.6, 1); m.position.y -= y * 0.6; return m;
    };
    [-1, 1].forEach(s => {
      g.add(concha(s, y1 + 0.9, zb + 0.5, zb + L * 0.7, 0.22));
      g.add(concha(s, y1 + 1.75, zb + 0.4, zb + L * 0.45, 0.15));
    });
    // septo (parte óssea posterior, translúcida)
    const sep = new T.Mesh(new T.BoxGeometry(0.06, y1 - y0 + 3.2, L * 0.75), M("cartilagens_nasais", "septo"));
    sep.position.set(0, (y0 + y1) / 2 + 1.2, zb + L * 0.36); g.add(marca(sep, "cartilagens_nasais"));
    // teto: epitélio olfatório (dos dois lados do septo e sobre a concha superior)
    const yE = y1 + 2.35;
    [-1, 1].forEach(s => {
      const ep = new T.Mesh(new T.BoxGeometry(0.55, 0.12, L * 0.42), M("epitelio_olfatorio", "epitelio_olf"));
      ep.position.set(s * 0.38, yE, zb + L * 0.33); ep.rotation.z = -s * 0.25; g.add(marca(ep, "epitelio_olfatorio"));
    });
    // lâmina cribriforme (com furinhos)
    const lam = new T.Mesh(new T.BoxGeometry(1.4, 0.08, L * 0.46), M("bulbo_olfatorio", "cribriforme")); lam.position.set(0, yE + 0.3, zb + L * 0.33); g.add(marca(lam, "bulbo_olfatorio"));
    // bulbos e tratos olfatórios + fibras do nervo olfatório
    [-1, 1].forEach(s => {
      const b = new T.Mesh(new T.CapsuleGeometry(0.17, L * 0.28, 8, 16), M("bulbo_olfatorio", "bulbo"));
      b.rotation.x = Math.PI / 2; b.position.set(s * 0.32, yE + 0.55, zb + L * 0.38); g.add(marca(b, "bulbo_olfatorio"));
      g.add(tubo(M, [V(s * 0.32, yE + 0.55, zb + L * 0.2), V(s * 0.35, yE + 0.75, zb - 0.6), V(s * 0.6, yE + 0.9, zb - 2.2)], 0.09, "bulbo_olfatorio", "bulbo"));
      for (let i = 0; i < 9; i++) {
        const z = zb + L * (0.18 + 0.3 * i / 8), x = s * (0.28 + 0.1 * Math.sin(i));
        g.add(cil(M, V(x, yE + 0.04, z), V(s * 0.32, yE + 0.45, z), 0.018, "epitelio_olfatorio", "bulbo"));
      }
    });
    return g;
  }

  /* ====================== LÍNGUA: papilas e botão gustativo ================== */
  function construirPapilas(M, lingua) {
    const g = new T.Group(); const cx = new T.Box3().setFromObject(lingua);
    const ray = new T.Raycaster(); const meio = (cx.min.x + cx.max.x) / 2, larg = (cx.max.x - cx.min.x) / 2;
    const tz = t => cx.min.z + (cx.max.z - cx.min.z) * t;   // t = 0 (raiz) … 1 (ponta)
    function sup(x, z) {
      ray.set(V(x, cx.max.y + 3, z), V(0, -1, 0)); const h = ray.intersectObject(lingua, false)[0];
      if (!h || !h.face) return null; const n = h.face.normal.clone().transformDirection(lingua.matrixWorld); return n.y > 0.35 ? { p: h.point, n } : null;
    }
    const q = new T.Quaternion(), up = V(0, 1, 0), mtx = new T.Matrix4(), sc = V(1, 1, 1);
    let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    // filiformes (instanciadas)
    const filG = new T.ConeGeometry(0.035, 0.13, 6); filG.translate(0, 0.06, 0);
    const fil = new T.InstancedMesh(filG, M("papilas_filiformes", "papila_fil"), 900); let nf = 0;
    for (let i = 0; i < 4000 && nf < 900; i++) {
      const t = 0.42 + R() * 0.56, x = meio + (R() * 2 - 1) * larg * 0.85; const s = sup(x, tz(t)); if (!s) continue;
      q.setFromUnitVectors(up, s.n); mtx.compose(s.p, q, sc); fil.setMatrixAt(nf++, mtx);
    }
    fil.count = nf; g.add(marca(fil, "papilas_filiformes"));
    // fungiformes (mais na ponta e nas bordas)
    for (let i = 0, n = 0; i < 2000 && n < 70; i++) {
      const t = 0.42 + R() * 0.56, xr = R() * 2 - 1; if (R() > 0.25 + 0.6 * t + 0.4 * Math.abs(xr)) continue;
      const s = sup(meio + xr * larg * 0.85, tz(t)); if (!s) continue;
      const m = esfera(M, s.p.clone().addScaledVector(s.n, 0.07), 0.075, "papilas_fungiformes", "papila_fung", [1, 0.75, 1]);
      m.quaternion.setFromUnitVectors(up, s.n); g.add(m); n++;
    }
    // circunvaladas em "V" (sulco terminal)
    for (let k = -4; k <= 4; k++) {
      const t = 0.36 + Math.abs(k) * 0.022, s = sup(meio + k * larg * 0.11, tz(t)); if (!s) continue;
      const c = new T.Mesh(new T.CylinderGeometry(0.17, 0.15, 0.1, 24), M("papilas_circunvaladas", "papila_cv"));
      c.position.copy(s.p).addScaledVector(s.n, 0.02); c.quaternion.setFromUnitVectors(up, s.n); g.add(marca(c, "papilas_circunvaladas"));
      const v = new T.Mesh(new T.TorusGeometry(0.24, 0.035, 8, 28), M("papilas_circunvaladas", "papila_cv"));
      v.position.copy(c.position); v.quaternion.copy(c.quaternion).multiply(new T.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2)); g.add(marca(v, "papilas_circunvaladas"));
    }
    // folhadas (pregas nas bordas posteriores)
    [-1, 1].forEach(sx => {
      for (let k = 0; k < 6; k++) {
        const s = sup(meio + sx * larg * 0.8, tz(0.4 + k * 0.025)); if (!s) continue;
        const f = new T.Mesh(new T.BoxGeometry(0.05, 0.12, 0.5), M("papilas_folhadas", "papila_fol"));
        f.position.copy(s.p); f.rotation.y = sx * 0.2; f.rotation.x = Math.PI / 2 - 0.2; g.add(marca(f, "papilas_folhadas"));
      }
    });
    // botão gustativo ampliado (ao lado da língua), com ligação visual
    const bg = new T.Group(); bg.position.set(cx.max.x + 3.2, cx.max.y - 0.5, (cx.min.z + cx.max.z) / 2 + 0.5);
    const epit = new T.Mesh(new T.BoxGeometry(3.4, 2.4, 2.2), M("botao_gustativo", "epit_lingua")); epit.position.y = -0.2; bg.add(marca(epit, "botao_gustativo"));
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, r = 0.42;
      const cel = new T.Mesh(new T.CapsuleGeometry(0.13, 1.2, 6, 12), M("botao_gustativo", "botao"));
      cel.position.set(Math.cos(a) * r, -0.15, Math.sin(a) * r); cel.rotation.z = -Math.cos(a) * 0.22; cel.rotation.x = Math.sin(a) * 0.22; bg.add(marca(cel, "botao_gustativo"));
    }
    const poro = new T.Mesh(new T.TorusGeometry(0.16, 0.04, 8, 24), M("botao_gustativo", "papila_fung")); poro.rotation.x = Math.PI / 2; poro.position.y = 0.95; bg.add(marca(poro, "botao_gustativo"));
    for (let i = 0; i < 4; i++) { const a = i * 1.6; bg.add(tubo(M, [V(Math.cos(a) * 0.3, -0.75, Math.sin(a) * 0.3), V(Math.cos(a) * 0.5, -1.1, Math.sin(a) * 0.4), V(0.2 * Math.cos(a), -1.6, 0)], 0.035, "botao_gustativo", "nervo")); }
    bg.add(tubo(M, [V(0.2, -1.6, 0), V(0.6, -1.9, 0), V(1.5, -2.0, 0)], 0.07, "botao_gustativo", "nervo"));
    g.add(bg); g.userData.botao = bg;
    const alvo = sup(meio, tz(0.36)); if (alvo) { const lg = new T.BufferGeometry().setFromPoints([alvo.p, bg.position.clone().add(V(-1.7, 0.6, 0))]); g.add(new T.Line(lg, new T.LineDashedMaterial({ color: 0x4cc9f0, dashSize: 0.2, gapSize: 0.12 })).computeLineDistances()); }
    return g;
  }

  /* ============================ PELE (bloco ampliado) ======================== */
  function construirPele(M) {
    const g = new T.Group(); const W = 6, D = 5;
    const camada = (y0, y1, id, key) => { const m = new T.Mesh(new T.BoxGeometry(W, y1 - y0, D), M(id, key)); m.position.y = (y0 + y1) / 2; g.add(marca(m, id)); return m; };
    camada(0, 2.2, "hipoderme", "hipoderme"); camada(2.2, 4.55, "derme", "derme"); camada(4.55, 5.0, "epiderme", "epiderme"); camada(5.0, 5.1, "epiderme", "corneo");
    // papilas dérmicas (ondulação da junção derme-epiderme)
    for (let i = 0; i < 7; i++) for (let k = 0; k < 5; k++) {
      const p = new T.Mesh(new T.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M("derme", "derme")); p.position.set(-2.6 + i * 0.86, 4.5, -2 + k * 1.0); p.scale.set(1, 0.9, 1); g.add(marca(p, "derme"));
    }
    // gordura (adipócitos em lóbulos)
    let rnd = 3; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    const gord = new T.InstancedMesh(new T.SphereGeometry(1, 12, 8), M("hipoderme", "gordura"), 150); const mtx = new T.Matrix4();
    for (let i = 0; i < 150; i++) { const r = 0.2 + R() * 0.15; mtx.compose(V(-2.7 + R() * 5.4, 0.25 + R() * 1.75, -2.2 + R() * 4.4), new T.Quaternion(), V(r, r * 0.85, r)); gord.setMatrixAt(i, mtx); }
    g.add(marca(gord, "hipoderme"));
    // pelo, folículo, glândula sebácea e músculo eretor
    const b0 = V(-1.6, 1.3, -0.3), b1 = V(-1.05, 5.0, 0.0);
    g.add(cil(M, b0, b1, 0.2, "pelo", "foliculo", 0.16));
    g.add(esfera(M, b0, 0.28, "pelo", "foliculo", [1, 1.2, 1]));
    g.add(cil(M, b0.clone().add(V(0, 0.1, 0)), V(-0.7, 7.6, 0.2), 0.065, "pelo", "pelo"));
    for (let i = 0; i < 6; i++) g.add(esfera(M, V(-1.05 + 0.12 * Math.cos(i), 3.85 + 0.12 * Math.sin(i * 2), 0.18 + 0.1 * Math.sin(i)), 0.13, "glandula_sebacea", "sebacea"));
    g.add(cil(M, V(-1.4, 2.9, -0.2), V(-0.35, 4.5, -0.1), 0.045, "pelo", "eretor"));
    // glândula sudorípara (enovelado + ducto + poro)
    const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 7; pts.push(V(1.7 + 0.32 * Math.cos(a), 1.55 + 0.25 * Math.sin(a * 0.5) + i * 0.004, 0.6 + 0.32 * Math.sin(a))); }
    g.add(tubo(M, pts, 0.06, "glandula_sudoripara", "sudoripara", 240));
    const duto = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 6; duto.push(V(1.7 + 0.12 * Math.cos(a) * (t > 0.85 ? 1 : 0.4), 1.9 + t * 3.2, 0.6 + 0.12 * Math.sin(a) * (t > 0.85 ? 1 : 0.4))); }
    g.add(tubo(M, duto, 0.045, "glandula_sudoripara", "sudoripara", 120));
    const poro = new T.Mesh(new T.TorusGeometry(0.1, 0.03, 8, 20), M("glandula_sudoripara", "sudoripara")); poro.rotation.x = Math.PI / 2; poro.position.set(1.7, 5.11, 0.6); g.add(marca(poro, "glandula_sudoripara"));
    // vasos: arteríola, vênula e alças capilares nas papilas
    g.add(tubo(M, [V(-3, 2.35, 1.3), V(0, 2.3, 1.2), V(3, 2.4, 1.3)], 0.1, "vasos_pele", "arteria"));
    g.add(tubo(M, [V(-3, 2.6, 1.7), V(0, 2.55, 1.6), V(3, 2.65, 1.7)], 0.12, "vasos_pele", "veia"));
    for (let i = 0; i < 5; i++) { const x = -2.4 + i * 1.2; g.add(tubo(M, [V(x, 2.35, 1.25), V(x, 3.6, 1.3), V(x + 0.05, 4.48, 1.4), V(x + 0.1, 3.6, 1.55), V(x + 0.1, 2.6, 1.65)], 0.03, "vasos_pele", "arteria", 40)); }
    // nervo e receptores
    g.add(tubo(M, [V(-3, 1.6, -1.4), V(0, 1.65, -1.3), V(3, 1.6, -1.4)], 0.12, "nervo_cutaneo", "nervo"));
    const meiss = [], merk = [], ruff = [], pac = [], livres = [];
    [-1.7, 0.0, 1.7].forEach((x, i) => {
      const m = new T.Mesh(new T.CapsuleGeometry(0.09, 0.2, 6, 12), M("meissner", "meissner")); m.position.set(x, 4.45, -1.0); g.add(marca(m, "meissner")); meiss.push(m);
      g.add(tubo(M, [V(x, 1.65, -1.3), V(x + 0.2, 3.0, -1.2), V(x, 4.3, -1.0)], 0.022, "nervo_cutaneo", "nervo"));
    });
    [-0.85, 0.85].forEach(x => {
      for (let k = 0; k < 3; k++) { const d = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.025, 14), M("merkel", "merkel")); d.position.set(x + (k - 1) * 0.16, 4.6, -1.6); g.add(marca(d, "merkel")); merk.push(d); }
      g.add(tubo(M, [V(x, 1.65, -1.35), V(x, 3.2, -1.5), V(x, 4.55, -1.6)], 0.02, "nervo_cutaneo", "nervo"));
    });
    [-1.2, 1.3].forEach(x => {
      const r = new T.Mesh(new T.CapsuleGeometry(0.08, 0.5, 6, 12), M("ruffini", "ruffini")); r.rotation.z = Math.PI / 2; r.position.set(x, 3.3, -0.6); g.add(marca(r, "ruffini")); ruff.push(r);
      g.add(tubo(M, [V(x - 0.3, 1.65, -1.3), V(x - 0.35, 2.6, -0.9), V(x - 0.3, 3.3, -0.6)], 0.02, "nervo_cutaneo", "nervo"));
    });
    [[1.3, 0.9, -1.5], [-0.4, 0.8, 1.0]].forEach(p => {
      for (let k = 0; k < 4; k++) { const c = new T.Mesh(new T.SphereGeometry(0.16 + k * 0.1, 18, 12), M("pacini", "pacini")); c.scale.set(1.5, 0.85, 0.85); c.position.set(...p); g.add(marca(c, "pacini")); if (k === 0) pac.push(c); }
      g.add(tubo(M, [V(p[0] - 0.6, 1.62, -1.3), V(p[0] - 0.6, 1.2, p[2] * 0.5), V(p[0] - 0.45, p[1], p[2])], 0.025, "nervo_cutaneo", "nervo"));
    });
    [-2.3, -0.4, 2.4].forEach(x => {
      const l = tubo(M, [V(x, 1.65, -1.3), V(x + 0.1, 3.4, -0.4), V(x - 0.1, 4.6, 0.2), V(x + 0.05, 4.92, 0.3)], 0.018, "terminacoes_livres", "nervo"); g.add(l); livres.push(l);
      g.add(tubo(M, [V(x - 0.1, 4.6, 0.2), V(x - 0.3, 4.9, 0.45)], 0.012, "terminacoes_livres", "nervo"));
    });
    g.userData.receptores = { meiss, merk, ruff, pac, livres };
    g.position.y = -2.6;
    return g;
  }

  window.SENTIDOS = { PAL, construirOrelha, construirNariz, construirPapilas, construirPele };

  /* ================================ LUPA =================================== */
  const ORGAOS = {
    olho: { nome: "Olho", icone: "👁️" }, orelha: { nome: "Orelha", icone: "👂" }, nariz: { nome: "Nariz", icone: "👃" },
    lingua: { nome: "Língua", icone: "👅" }, pele: { nome: "Pele", icone: "✋" }
  };
  let ctx = null; // { renderer, cena, camera, controles, ... }
  let APPREF = null;

  function iniciar(app) { APPREF = app; }

  function montarDOM() {
    const wrap = document.querySelector(".palco-wrap");
    const div = document.createElement("div"); div.id = "lupa"; div.hidden = true;
    div.innerHTML = `
      <div class="lupa-topo">
        <b class="lupa-titulo">🔬 Lupa dos sentidos</b>
        <div class="lupa-abas">${Object.entries(ORGAOS).map(([k, o]) => `<button data-lupa="${k}">${o.icone} ${o.nome}</button>`).join("")}</div>
        <div class="lupa-acoes">
          <button id="lupaCorte" title="Cortar ao meio">✂️ Corte</button>
          <button id="lupaRot" title="Mostrar nomes">🏷️ Rótulos</button>
          <button id="lupaFechar" title="Voltar ao corpo">✕ Voltar ao corpo</button>
        </div>
      </div>
      <div class="lupa-corpo">
        <div class="lupa-lista" id="lupaLista"></div>
        <div class="lupa-palco" id="lupaPalco"><div id="lupaRotulos"></div><div class="lupa-carga" id="lupaCarga" hidden>Carregando…</div></div>
      </div>
      <div class="lupa-demo" id="lupaDemo"></div>`;
    wrap.appendChild(div);
    div.querySelectorAll("[data-lupa]").forEach(b => b.onclick = () => abrir(b.dataset.lupa));
    div.querySelector("#lupaFechar").onclick = fechar;
    div.querySelector("#lupaCorte").onclick = e => { ctx.corte = !ctx.corte; e.currentTarget.classList.toggle("ativo", ctx.corte); aplicarCorte(); };
    div.querySelector("#lupaRot").onclick = e => { ctx.rotulos = !ctx.rotulos; e.currentTarget.classList.toggle("ativo", ctx.rotulos); document.getElementById("lupaRotulos").hidden = !ctx.rotulos; };
    return div;
  }

  function criarContexto() {
    const div = montarDOM(); const palco = div.querySelector("#lupaPalco");
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.localClippingEnabled = true;
    palco.insertBefore(renderer.domElement, palco.firstChild);
    const cena = new T.Scene();
    try { const pm = new T.PMREMGenerator(renderer); cena.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; } catch (e) { }
    cena.add(new T.HemisphereLight(0xfff4ee, 0x3a4a5a, 0.5));
    const l1 = new T.DirectionalLight(0xfff1e6, 1.2); l1.position.set(5, 8, 7); cena.add(l1);
    const l2 = new T.DirectionalLight(0xbcd4ff, 0.5); l2.position.set(-6, 3, -5); cena.add(l2);
    const camera = new T.PerspectiveCamera(35, 1, 0.05, 200);
    const controles = new T.OrbitControls(camera, renderer.domElement); controles.enableDamping = true;
    ctx = { div, palco, renderer, cena, camera, controles, raiz: null, mats: {}, malhas: [], corte: false, rotulos: false, plano: new T.Plane(V(-1, 0, 0), 0), anim: null, sel: null, cache: {} };
    // seleção
    const ray = new T.Raycaster(), mouse = new T.Vector2(); let down = null;
    renderer.domElement.addEventListener("pointerdown", e => down = [e.clientX, e.clientY]);
    renderer.domElement.addEventListener("pointerup", e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(ctx.malhas.filter(m => vis(m) && m.material.opacity > 0.2), false).filter(h => !ctx.corte || ctx.plano.distanceToPoint(h.point) >= 0);
      if (hits[0]) selecionar(hits[0].object.userData.id);
    });
    window.addEventListener("resize", redim);
    if (window.ResizeObserver) new ResizeObserver(redim).observe(palco);
    const relogio = new T.Clock();
    (function laco() {
      requestAnimationFrame(laco);
      if (ctx.div.hidden) return;
      const dt = Math.min(relogio.getDelta(), 0.05);
      if (ctx.anim) ctx.anim(dt, relogio.elapsedTime);
      controles.update(); renderer.render(cena, camera); rotulos();
    })();
    return ctx;
  }
  const vis = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  function redim() { if (!ctx || ctx.div.hidden) return; const w = ctx.palco.clientWidth, h = ctx.palco.clientHeight; if (!w || !h) return; ctx.renderer.setSize(w, h, false); ctx.camera.aspect = w / h; ctx.camera.updateProjectionMatrix(); }

  function M(id, key) {
    const k = id + ":" + key;
    if (!ctx.mats[k]) {
      const P = (window.PALETA && window.PALETA[key]) || PAL[key] || (window.PALETA && window.PALETA[id]) || [0xcccccc, {}];
      const op = Object.assign({ color: P[0], metalness: 0 }, P[1]); if (op.sheenColor !== undefined) op.sheenColor = new T.Color(op.sheenColor);
      const m = new T.MeshPhysicalMaterial(op); m.envMapIntensity = 0.8; m.userData.op0 = m.opacity;
      ctx.mats[k] = m;
    }
    return ctx.mats[k];
  }
  function aplicarCorte() {
    Object.values(ctx.mats).forEach(m => { m.clippingPlanes = ctx.corte ? [ctx.plano] : []; m.side = ctx.corte ? T.DoubleSide : (m.userData.lado0 || T.FrontSide); m.needsUpdate = true; });
  }

  // clona geometrias reais do corpo (em dm) para o referencial da lupa (cm)
  function clonarDoCorpo(ids, filtro) {
    const res = [];
    APPREF.pecas.filter(p => ids.includes(p.userData.id)).forEach(p => {
      p.updateWorldMatrix(true, false);
      const geo = p.geometry.clone(); geo.applyMatrix4(p.matrixWorld);
      if (filtro) { // mantém só triângulos que passam no filtro (ex.: lado direito)
        const pos = geo.attributes.position, I = geo.index.array, ni = [];
        for (let t = 0; t < I.length; t += 3) { const cx = (pos.getX(I[t]) + pos.getX(I[t + 1]) + pos.getX(I[t + 2])) / 3; if (filtro(cx)) ni.push(I[t], I[t + 1], I[t + 2]); }
        geo.setIndex(ni);
      }
      res.push({ id: p.userData.id, geo, key: p.material.userData.chave || p.userData.id });
    });
    return res;
  }

  /* ---------------------------- montagem por órgão ---------------------- */
  async function montar(org) {
    const raiz = new T.Group(); let cam = [V(4, 2, 6), V(0, 0, 0)], corte = false, demo = "";
    const reg = m => { m.traverse(o => { if (o.isMesh && o.userData.id) ctx.malhas.push(o); }); };
    if (org === "olho") {
      if (!window.DETALHE_OLHO) await carregarScript("modelos/detalhe_olho.js");
      const partes = await window.decodificarPacote(window.DETALHE_OLHO);
      partes.forEach(({ c, geo }) => { const m = new T.Mesh(geo, M(c.id, c.mat)); marca(m, c.id); raiz.add(m); });
      cam = [V(4.2, 1.6, 4.2), V(0, 0, 0)]; corte = true;
      demo = demoOlho(raiz);
    } else if (org === "orelha") {
      const pav = clonarDoCorpo(["pavilhao"], x => x < 0);
      const cxp = new T.Box3(); pav.forEach(p => { p.geo.computeBoundingBox(); cxp.union(p.geo.boundingBox); });
      const ent = V(cxp.max.x - 0.02, cxp.min.y + (cxp.max.y - cxp.min.y) * 0.42, cxp.min.z + (cxp.max.z - cxp.min.z) * 0.62);
      pav.forEach(p => { p.geo.translate(-ent.x, -ent.y, -ent.z); p.geo.scale(10, 10, 10); p.geo.translate(-2.55, 0, 0); p.geo.computeVertexNormals(); const m = new T.Mesh(p.geo, M("pavilhao", "orelha")); marca(m, "pavilhao"); raiz.add(m); });
      const ore = construirOrelha(M); raiz.add(ore); raiz.userData.orelha = ore;
      cam = [V(-1.5, 2.2, 7.5), V(0, 0, 0.3)];
      demo = demoOrelha(ore);
    } else if (org === "nariz") {
      const pecas = clonarDoCorpo(["cartilagens_nasais", "conchas_nasais"]);
      const cxc = new T.Box3(); pecas.filter(p => p.id === "conchas_nasais").forEach(p => { p.geo.computeBoundingBox(); cxc.union(p.geo.boundingBox); });
      const c = cxc.getCenter(V(0, 0, 0));
      pecas.forEach(p => { p.geo.translate(-c.x, -c.y, -c.z); p.geo.scale(10, 10, 10); p.geo.computeVertexNormals(); const m = new T.Mesh(p.geo, M(p.id, p.id === "conchas_nasais" ? "concha" : "cartilagem")); marca(m, p.id); raiz.add(m); });
      const cx = new T.Box3(); raiz.children.filter(m => m.userData.id === "conchas_nasais").forEach(m => cx.expandByObject(m));
      raiz.add(construirNariz(M, cx));
      cam = [V(9, 4, 8), V(0, 1.2, -0.5)]; corte = true;
      demo = demoNariz(raiz, cx);
    } else if (org === "lingua") {
      const [p] = clonarDoCorpo(["lingua"]);
      p.geo.computeBoundingBox(); const c = p.geo.boundingBox.getCenter(V(0, 0, 0));
      p.geo.translate(-c.x, -c.y, -c.z); p.geo.scale(10, 10, 10); p.geo.computeVertexNormals();
      const ling = new T.Mesh(p.geo, M("lingua", "lingua")); marca(ling, "lingua"); raiz.add(ling); ling.updateMatrixWorld();
      raiz.add(construirPapilas(M, ling));
      cam = [V(2.5, 7, 8), V(1.8, 0, 0)];
      demo = demoLingua(raiz);
    } else if (org === "pele") {
      const p = construirPele(M); raiz.add(p); raiz.userData.pele = p;
      cam = [V(8, 6.5, 12), V(0, 0, 0)]; corte = false;
      demo = demoPele(p);
    }
    reg(raiz);
    return { raiz, cam, corte, demo };
  }

  function carregarScript(src) {
    return new Promise((ok, erro) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
  }

  async function abrir(org, parte) {
    if (!ctx) criarContexto();
    ctx.div.hidden = false; redim();
    ctx.div.querySelectorAll("[data-lupa]").forEach(b => b.classList.toggle("ativo", b.dataset.lupa === org));
    if (ctx.org !== org) {
      if (ctx.raiz) { ctx.cena.remove(ctx.raiz); }
      ctx.malhas = []; ctx.anim = null; ctx.org = org; ctx.sel = null;
      document.getElementById("lupaCarga").hidden = false; document.getElementById("lupaDemo").innerHTML = "";
      if (!ctx.cache[org]) ctx.cache[org] = await montar(org);
      const k = ctx.cache[org];
      ctx.malhas = []; k.raiz.traverse(o => { if (o.isMesh && o.userData.id) ctx.malhas.push(o); });
      ctx.raiz = k.raiz; ctx.cena.add(k.raiz);
      ctx.camera.position.copy(k.cam[0]); ctx.controles.target.copy(k.cam[1]);
      ctx.corte = k.corte; ctx.div.querySelector("#lupaCorte").classList.toggle("ativo", ctx.corte); aplicarCorte();
      document.getElementById("lupaCarga").hidden = true;
      montarLista(org); document.getElementById("lupaDemo").innerHTML = ""; if (k.demo) k.demo.montar(document.getElementById("lupaDemo"));
      ctx.anim = k.demo ? k.demo.passo : null;
      montarRotulos();
    }
    selecionar(parte || org, true);
  }
  function fechar() { if (ctx) ctx.div.hidden = true; }

  function partesDe(org) {
    const D = window.DADOS.estruturas; const ids = new Set(ctx.malhas.map(m => m.userData.id));
    return Object.keys(D).filter(k => ids.has(k) && (D[k].orgao === org || k === org || (org === "pele" && D[k].orgao === "pele")));
  }
  function montarLista(org) {
    const D = window.DADOS.estruturas; const lista = document.getElementById("lupaLista");
    lista.innerHTML = `<h4>${ORGAOS[org].icone} ${ORGAOS[org].nome}: estruturas</h4>` + partesDe(org).map(k => `
      <label class="lupa-item"><input type="checkbox" checked data-vis="${k}"><button data-sel="${k}">${D[k].nome}</button></label>`).join("") +
      `<p class="muted mini-txt">Clique em uma estrutura no modelo ou na lista. Arraste para girar e use a roda para aproximar.</p>`;
    lista.querySelectorAll("[data-sel]").forEach(b => b.onclick = e => { e.preventDefault(); selecionar(b.dataset.sel, true); });
    lista.querySelectorAll("[data-vis]").forEach(c => c.onchange = () => { ctx.malhas.forEach(m => { if (m.userData.id === c.dataset.vis) m.visible = c.checked; }); });
  }
  function montarRotulos() {
    const camada = document.getElementById("lupaRotulos"); camada.innerHTML = ""; camada.hidden = !ctx.rotulos;
    const D = window.DADOS.estruturas; ctx.rots = [];
    partesDe(ctx.org).forEach(k => {
      const cx = new T.Box3(); ctx.malhas.filter(m => m.userData.id === k).forEach(m => cx.expandByObject(m));
      if (cx.isEmpty()) return;
      const d = document.createElement("div"); d.className = "rotulo"; d.textContent = D[k].nome; d.onclick = () => selecionar(k, true); camada.appendChild(d);
      ctx.rots.push({ d, p: cx.getCenter(V(0, 0, 0)), k });
    });
  }
  function rotulos() {
    if (!ctx.rotulos || !ctx.rots) return; const w = ctx.palco.clientWidth, h = ctx.palco.clientHeight;
    ctx.rots.forEach(r => { const v = r.p.clone().project(ctx.camera); r.d.hidden = v.z > 1; r.d.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`; });
  }
  function realce(id, cor) { ctx.malhas.forEach(m => { if (m.userData.id === id && m.material.emissive) { m.material.emissive.setHex(cor); m.material.emissiveIntensity = 0.45; } }); }
  function selecionar(id, deLista) {
    const D = window.DADOS.estruturas;
    if (ctx.sel) realce(ctx.sel, 0);
    ctx.sel = id; if (ctx.malhas.some(m => m.userData.id === id)) realce(id, 0xffaa22);
    ctx.div.querySelectorAll("[data-sel]").forEach(b => b.classList.toggle("ativo", b.dataset.sel === id));
    if (D[id] && APPREF && APPREF.info) APPREF.info(id, true);
  }

  /* ------------------------------- demonstrações ------------------------- */
  function demoOlho(raiz) {
    const cx = new T.Box3().setFromObject(raiz.children.find(m => m.userData.id === "esclera") || raiz);
    const zc = cx.max.z, zr = cx.min.z + 0.12, ys = [-0.38, 0, 0.38];
    const g = new T.Group(); raiz.add(g); g.visible = false;
    const linhas = ys.map(() => { const l = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0xffd23f })); g.add(l); return l; });
    const foco = new T.Mesh(new T.SphereGeometry(0.06, 12, 8), new T.MeshBasicMaterial({ color: 0xff4d4d })); g.add(foco);
    const lente = new T.Mesh(new T.LatheGeometry([V(0.001, -0.9, 0), V(0.18, -0.9, 0), V(0.12, 0, 0), V(0.18, 0.9, 0), V(0.001, 0.9, 0)], 32), M("oculos", "oculos"));
    lente.rotation.x = Math.PI / 2; lente.rotation.z = Math.PI / 2; lente.position.z = zc + 2.2; lente.rotation.set(Math.PI / 2, 0, 0); g.add(lente);
    let modo = "normal";
    const MODOS = {
      normal: { f: zr, lente: 0, txt: "<b>Visão normal:</b> córnea e lente desviam (refratam) os raios de luz, que se encontram exatamente sobre a retina. A imagem formada é nítida, menor e invertida." },
      miopia: { f: zr + 0.7, lente: 0, txt: "<b>Miopia:</b> o olho é mais alongado (ou a córnea é muito curva). Os raios se encontram ANTES da retina e a imagem de objetos distantes fica borrada." },
      miopia_c: { f: zr, lente: -1, txt: "<b>Miopia corrigida:</b> uma lente <b>divergente</b> (côncava) abre um pouco os raios antes de entrarem no olho, e o foco volta para a retina." },
      hiper: { f: zr - 0.8, lente: 0, txt: "<b>Hipermetropia:</b> o olho é mais curto. Os raios se encontrariam DEPOIS da retina; a visão de perto fica borrada." },
      hiper_c: { f: zr, lente: 1, txt: "<b>Hipermetropia corrigida:</b> uma lente <b>convergente</b> (convexa) aproxima os raios e o foco volta para a retina." }
    };
    function desenhar() {
      const m = MODOS[modo]; lente.visible = m.lente !== 0;
      if (m.lente) { const prof = m.lente > 0 ? [V(0.001, -0.9, 0), V(0.05, -0.9, 0), V(0.22, 0, 0), V(0.05, 0.9, 0), V(0.001, 0.9, 0)] : [V(0.001, -0.9, 0), V(0.2, -0.9, 0), V(0.07, 0, 0), V(0.2, 0.9, 0), V(0.001, 0.9, 0)]; lente.geometry.dispose(); lente.geometry = new T.LatheGeometry(prof, 32); }
      const zl = lente.position.z;
      ys.forEach((y, i) => {
        const pts = [V(0, y, zc + 5)];
        let yc = y; if (m.lente) { pts.push(V(0, y, zl)); yc = y * (m.lente < 0 ? 1.18 : 0.8); }
        pts.push(V(0, yc, zc - 0.05)); const F = V(0, 0, m.f);
        const dir = F.clone().sub(pts[pts.length - 1]).normalize(); const t = (zr - pts[pts.length - 1].z) / dir.z;
        pts.push(m.f > zr ? F : pts[pts.length - 1].clone().addScaledVector(dir, t));
        if (m.f > zr) { const d2 = F.clone().sub(pts[pts.length - 2]).normalize(); pts.push(F.clone().addScaledVector(d2, (zr - F.z) / d2.z)); }
        linhas[i].geometry.setFromPoints(pts);
      });
      foco.position.set(0, 0, m.f); document.getElementById("txtOlho").innerHTML = m.txt;
    }
    return {
      montar(el) {
        el.innerHTML = `<div class="lupa-demo-tit">💡 Como o olho forma a imagem (EF06CI08)</div>
          <div class="chips">${[["normal", "Visão normal"], ["miopia", "Miopia"], ["miopia_c", "Miopia + lente divergente"], ["hiper", "Hipermetropia"], ["hiper_c", "Hipermetropia + lente convergente"]].map(([k, n]) => `<button class="chip" data-mo="${k}">${n}</button>`).join("")}
          <button class="chip" data-mo="off">Ocultar raios</button></div><p id="txtOlho" class="mini-txt"></p>`;
        el.querySelectorAll("[data-mo]").forEach(b => b.onclick = () => {
          if (b.dataset.mo === "off") { g.visible = false; return; }
          modo = b.dataset.mo; g.visible = true; desenhar();
          el.querySelectorAll("[data-mo]").forEach(x => x.classList.toggle("ativo", x === b));
          ctx.camera.position.set(6, 1.2, 1.5); ctx.controles.target.set(0, 0, 0.6);
        });
      },
      passo() { }
    };
  }

  function demoOrelha(ore) {
    const P = ore.userData.pecas; let tocando = false, t = 0;
    const ondas = [0, 1, 2].map(() => { const o = new T.Mesh(new T.TorusGeometry(0.5, 0.03, 6, 40), new T.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true })); o.rotation.y = Math.PI / 2; o.visible = false; ore.add(o); return o; });
    const base = id => (P[id] || []).map(m => [m, m.position.clone()]);
    const oss = [...base("martelo"), ...base("bigorna"), ...base("estribo")], tp = P.timpano ? P.timpano[0] : null;
    const brilho = (lista, v, cor) => (lista || []).forEach(m => { m.material.emissive.setHex(cor); m.material.emissiveIntensity = v; });
    return {
      montar(el) {
        el.innerHTML = `<div class="lupa-demo-tit">🔊 Caminho do som</div><div class="chips"><button class="chip" id="btnSom">▶ Tocar som</button></div>
          <p class="mini-txt">As ondas sonoras entram pelo <b>meato acústico</b> e fazem o <b>tímpano</b> vibrar. Os ossículos (<b>martelo → bigorna → estribo</b>) amplificam a vibração e o estribo empurra a janela oval. O líquido da <b>cóclea</b> vibra, as células ciliadas geram impulsos e o <b>nervo vestibulococlear</b> os leva ao lobo temporal. O <b>vestíbulo</b> e os <b>canais semicirculares</b> cuidam do equilíbrio.</p>`;
        el.querySelector("#btnSom").onclick = e => { tocando = !tocando; e.currentTarget.textContent = tocando ? "⏸ Parar" : "▶ Tocar som"; if (!tocando) { ondas.forEach(o => o.visible = false); brilho(P.coclea, 0, 0); brilho(P.nervo_vestibulococlear, 0, 0); } };
      },
      passo(dt) {
        if (!tocando) return; t += dt;
        ondas.forEach((o, i) => { const f = ((t * 0.8 + i / 3) % 1); o.visible = true; o.position.set(-6 + f * 3.4, 0.05, 0.05); o.scale.setScalar(2.2 - f * 1.4); o.material.opacity = 1 - f * 0.6; });
        const vib = Math.sin(t * 40);
        if (tp) tp.scale.set(1, 1 + 0.25 * vib, 1);
        oss.forEach(([m, p0]) => m.position.set(p0.x + 0.02 * vib, p0.y, p0.z));
        const pulso = 0.25 + 0.25 * Math.sin(t * 8);
        if (ctx.sel !== "coclea") brilho(P.coclea, pulso, 0x66ccff);
        if (ctx.sel !== "nervo_vestibulococlear") brilho(P.nervo_vestibulococlear, 0.3 + 0.3 * Math.sin(t * 8 - 1.5), 0xffee55);
      }
    };
  }

  function demoNariz(raiz, cx) {
    let ativo = false, t = 0; const N = 26; const parts = [];
    const geo = new T.SphereGeometry(0.06, 8, 6);
    for (let i = 0; i < N; i++) { const odor = i % 3 === 0; const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: odor ? 0xb15cff : 0xbfe9ff })); m.visible = false; raiz.add(m); parts.push({ m, odor, f: i / N, x: (i % 2 ? 1 : -1) * (0.45 + 0.3 * Math.random()) }); }
    const zf = cx.max.z + 1.6, zb = cx.min.z, y0 = cx.min.y, yE = cx.max.y + 2.3;
    const ep = () => ctx.malhas.filter(m => m.userData.id === "epitelio_olfatorio" || m.userData.id === "bulbo_olfatorio");
    return {
      montar(el) {
        el.innerHTML = `<div class="lupa-demo-tit">🌸 Como sentimos cheiros</div><div class="chips"><button class="chip" id="btnAr">▶ Inspirar</button></div>
          <p class="mini-txt">O ar entra pelas narinas e passa entre as <b>conchas nasais</b>, que o aquecem, umedecem e filtram. Moléculas de odor (em roxo) sobem até o <b>epitélio olfatório</b> no teto da cavidade, dissolvem-se no muco e estimulam os receptores. O impulso atravessa a lâmina cribriforme até o <b>bulbo olfatório</b> e segue para o encéfalo.</p>`;
        el.querySelector("#btnAr").onclick = e => { ativo = !ativo; e.currentTarget.textContent = ativo ? "⏸ Parar" : "▶ Inspirar"; parts.forEach(p => p.m.visible = ativo); if (!ativo) ep().forEach(m => m.material.emissive.setHex(0)); };
      },
      passo(dt) {
        if (!ativo) return; t += dt; let chegou = false;
        parts.forEach(p => {
          p.f = (p.f + dt * 0.18) % 1; const f = p.f;
          const z = zf - f * (zf - zb + 0.5);
          const y = p.odor ? y0 + 0.3 + Math.min(1, f * 1.6) * (yE - y0 - 0.4) : y0 + 0.3 + Math.sin(f * Math.PI) * 0.8;
          p.m.position.set(p.x, y, z); if (p.odor && f > 0.62) chegou = true;
        });
        ep().forEach(m => { if (ctx.sel !== m.userData.id) { m.material.emissive.setHex(0xffcc33); m.material.emissiveIntensity = chegou ? 0.35 + 0.25 * Math.sin(t * 10) : 0; } });
      }
    };
  }

  function demoLingua(raiz) {
    const bg = raiz.children.find(c => c.userData && c.userData.botao); const botao = bg ? bg.userData.botao : null;
    let ativo = false, t = 0; const SAB = [["Doce", 0xff7eb6], ["Salgado", 0xffffff], ["Azedo", 0xf6e04b], ["Amargo", 0x5cc46b], ["Umami", 0xb07a4f]];
    let cor = SAB[0][1]; const mols = [];
    if (botao) for (let i = 0; i < 10; i++) { const m = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), new T.MeshBasicMaterial({ color: cor })); m.visible = false; botao.add(m); mols.push({ m, f: i / 10, x: (Math.random() - 0.5) * 1.2 }); }
    const cel = () => ctx.malhas.filter(m => m.userData.id === "botao_gustativo" && m.geometry.type === "CapsuleGeometry");
    return {
      montar(el) {
        el.innerHTML = `<div class="lupa-demo-tit">😋 Gustação</div><div class="chips">${SAB.map(([n], i) => `<button class="chip" data-sab="${i}">${n}</button>`).join("")}<button class="chip" data-sab="x">Parar</button></div>
          <p class="mini-txt">As substâncias do alimento se dissolvem na <b>saliva</b>, entram pelo <b>poro gustativo</b> e estimulam as células receptoras do <b>botão gustativo</b> (à direita, muito ampliado). Elas ativam fibras nervosas que levam a informação ao encéfalo. Os botões ficam principalmente nas papilas <b>circunvaladas, fungiformes e folhadas</b>; as <b>filiformes</b> não têm botões e percebem a textura.</p>`;
        el.querySelectorAll("[data-sab]").forEach(b => b.onclick = () => {
          if (b.dataset.sab === "x") { ativo = false; mols.forEach(m => m.m.visible = false); cel().forEach(m => m.material.emissive.setHex(0)); return; }
          ativo = true; cor = SAB[+b.dataset.sab][1]; mols.forEach(m => { m.m.visible = true; m.m.material.color.setHex(cor); });
          if (botao) { ctx.controles.target.copy(botao.getWorldPosition(V(0, 0, 0))); }
        });
      },
      passo(dt) {
        if (!ativo) return; t += dt;
        mols.forEach(p => { p.f = (p.f + dt * 0.35) % 1; const f = p.f; p.m.position.set(p.x * (1 - f) * 1.0, 2.6 - f * 2.0, 0.3 * Math.sin(p.f * 9)); });
        cel().forEach(m => { if (ctx.sel !== "botao_gustativo") { m.material.emissive.setHex(cor === 0xffffff ? 0x99ccff : cor); m.material.emissiveIntensity = 0.2 + 0.2 * Math.sin(t * 8); } });
      }
    };
  }

  function demoPele(pele) {
    const R = pele.userData.receptores; let modo = null, t = 0;
    const dedo = new T.Mesh(new T.SphereGeometry(0.9, 24, 16), new T.MeshPhysicalMaterial({ color: 0xd6a184, roughness: 0.6, transparent: true, opacity: 0.85 })); dedo.scale.set(1, 1.3, 1); dedo.visible = false; pele.add(dedo);
    const imp = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshBasicMaterial({ color: 0xfff176 })); imp.visible = false; pele.add(imp);
    const brilho = (lista, v, cor) => lista.forEach(m => { m.material.emissive.setHex(cor); m.material.emissiveIntensity = v; });
    const todos = () => [...R.meiss, ...R.merk, ...R.ruff, ...R.pac, ...R.livres];
    const MOD = {
      leve: { r: () => [...R.meiss, ...R.merk], cor: 0xff66aa, txt: "<b>Toque leve:</b> os <b>corpúsculos de Meissner</b> e os <b>discos de Merkel</b>, logo abaixo da epiderme, são estimulados." },
      pressao: { r: () => [...R.pac, ...R.ruff], cor: 0x66aaff, txt: "<b>Pressão forte e vibração:</b> os <b>corpúsculos de Pacini</b> (profundos) e de <b>Ruffini</b> (estiramento) respondem." },
      dor: { r: () => R.livres, cor: 0xff3333, txt: "<b>Calor, frio e dor:</b> as <b>terminações nervosas livres</b>, que chegam até a epiderme, são ativadas. A resposta rápida pode ser um arco reflexo." }
    };
    return {
      montar(el) {
        el.innerHTML = `<div class="lupa-demo-tit">✋ Tato: receptores da pele</div><div class="chips"><button class="chip" data-tt="leve">Toque leve</button><button class="chip" data-tt="pressao">Pressão / vibração</button><button class="chip" data-tt="dor">Calor / dor</button><button class="chip" data-tt="x">Parar</button></div><p id="txtPele" class="mini-txt">Escolha um estímulo. O bloco mostra as três camadas da pele (epiderme, derme e hipoderme) muito ampliadas; ligue o ✂️ Corte para ver o interior.</p>`;
        el.querySelectorAll("[data-tt]").forEach(b => b.onclick = () => {
          brilho(todos(), 0, 0); if (b.dataset.tt === "x") { modo = null; dedo.visible = false; imp.visible = false; return; }
          modo = b.dataset.tt; t = 0; dedo.visible = modo !== "dor"; document.getElementById("txtPele").innerHTML = MOD[modo].txt;
        });
      },
      passo(dt) {
        if (!modo) return; t += dt; const m = MOD[modo];
        const ap = modo === "pressao" ? 0.5 + 0.12 * Math.sin(t * 30) : 0.5 + 0.5 * Math.sin(t * 2.5);
        dedo.position.set(0, 6.1 + (1 - ap) * 0.9 - (modo === "pressao" ? 0.35 : 0), -1.0);
        brilho(m.r(), 0.25 + 0.45 * ap, m.cor);
        imp.visible = true; const f = (t * 0.6) % 1; imp.position.set(-3 + (1 - f) * 3, 1.62, -1.3);
      }
    };
  }

  window.LUPA = { iniciar, abrir, fechar, ORGAOS };
})();
