/* =========================================================================
   CORPO HUMANO 3D — Aplicação principal
   ========================================================================= */
(async function () {
  const T = THREE;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false; // cores em sRGB corretas
  const D = window.DADOS;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const el = (tag, attrs, html) => { const e = document.createElement(tag); if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (html !== undefined) e.innerHTML = html; return e; };

  /* ------------------------------ CENA ---------------------------------- */
  const palco = $("#palco");
  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  palco.appendChild(renderer.domElement);

  const cena = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 400);
  camera.position.set(0, 10.5, 27);
  const controles = new T.OrbitControls(camera, renderer.domElement);
  controles.target.set(0, 9.2, 0);
  controles.enableDamping = true; controles.dampingFactor = 0.08;
  controles.minDistance = 0.4; controles.maxDistance = 70;

  // iluminação de estúdio: ambiente refletido (PBR) + luzes de recorte
  try { const pm = new T.PMREMGenerator(renderer); cena.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; } catch (e) { }
  cena.add(new T.HemisphereLight(0xfff4ee, 0x3a4a5a, 0.45));
  const luz1 = new T.DirectionalLight(0xfff1e6, 1.25); luz1.position.set(8, 22, 16); cena.add(luz1);
  const luz2 = new T.DirectionalLight(0xbcd4ff, 0.55); luz2.position.set(-12, 10, -12); cena.add(luz2);
  const luz3 = new T.DirectionalLight(0xffe2cc, 0.3); luz3.position.set(0, -4, 12); cena.add(luz3);

  // base circular
  // chão: sombra de contato suave + um anel fino, no lugar de um pedestal
  const cvSombra = document.createElement("canvas"); cvSombra.width = cvSombra.height = 256;
  const gSombra = cvSombra.getContext("2d"), grad = gSombra.createRadialGradient(128, 128, 6, 128, 128, 128);
  grad.addColorStop(0, "rgba(0,0,0,.5)"); grad.addColorStop(0.45, "rgba(0,0,0,.2)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  gSombra.fillStyle = grad; gSombra.fillRect(0, 0, 256, 256);
  const base = new T.Mesh(new T.CircleGeometry(4.4, 64), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cvSombra), transparent: true, depthWrite: false, toneMapped: false }));
  base.rotation.x = -Math.PI / 2; base.scale.set(1, 0.6, 1); base.position.y = -0.03; base.renderOrder = -2; cena.add(base);
  const anel = new T.Mesh(new T.RingGeometry(4.3, 4.335, 128), new T.MeshBasicMaterial({ color: 0x9bb5b2, transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = -0.02; anel.renderOrder = -1; cena.add(anel);

  // tema claro/escuro
  const aplicarTema = t => { document.documentElement.dataset.theme = t; anel.material.color.setHex(t === "light" ? 0x53706c : 0x9bb5b2); base.material.opacity = t === "light" ? 0.6 : 1; };
  aplicarTema(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  $("#btnTema").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    aplicarTema(t); try { localStorage.setItem("tema", t); } catch (e) { }
  });

  const telaCarga = $("#carregando"), txtCarga = document.querySelector("#carregando p");
  let corpo;
  try {
    corpo = await construirCorpo((f, nome) => { telaCarga.style.setProperty("--p", f); if (txtCarga) txtCarga.textContent = `Carregando modelos anatômicos: ${nome} (${Math.round(f * 100)}%)`; });
  } catch (e) {
    console.error(e);
    if (txtCarga) txtCarga.innerHTML = "Os modelos 3D não carregaram.<br><small>Abra em um navegador atualizado (Chrome, Edge, Firefox ou Safari).</small>";
    return;
  }
  cena.add(corpo.raiz);
  const { grupos, pecas, mats, refs } = corpo;
  Object.values(mats).forEach(m => { m.userData.opBase = m.opacity; m.userData.transpBase = m.transparent; });

  /* ------------------------------ ESTADO -------------------------------- */
  const est = {
    selecionado: null, opac: {}, visivel: {}, sexo: "feminino",
    bpm: 72, fr: 14, fluxo: true, girar: false,
    digest: null, reflexo: null, flexao: 0, hidrat: 2, bexiga: 0.25, idade: 14,
    rotulos: true, vistaInteira: "frente", modo: "explorar", desafio: null, puberdadeAtiva: false
  };
  Object.keys(D.sistemas).forEach(s => { est.opac[s] = 1; est.visivel[s] = true; });
  est.opac.tegumentar = 0.18;

  /* --------------------------- REDIMENSIONAR ---------------------------- */
  function redimensionar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (est.vistaInteira) { const v = vistaInteira(est.vistaInteira); controles.target.copy(v[0]); camera.position.copy(v[1]); anim = null; }
  }
  window.addEventListener("resize", redimensionar);
  if (window.ResizeObserver) new ResizeObserver(redimensionar).observe(palco);

  // Enquadra o corpo inteiro (da cabeça aos pés, com os braços) conforme o tamanho da área 3D.
  const DIRECOES = { frente: [0, 1], costas: [0, -1], lado: [1, 0] };
  function vistaInteira(nome) {
    const meiaAlt = 9.3, meiaLarg = 4.4, cy = 8.75, profundidade = 1.6;
    const tanV = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(meiaAlt / tanV, meiaLarg / (tanV * camera.aspect)) * 1.08 + profundidade;
    const [dx, dz] = DIRECOES[nome] || DIRECOES.frente;
    return [new T.Vector3(0, cy, 0), new T.Vector3(dx * dist, cy + 0.8, dz * dist)];
  }
  function verCorpoInteiro(nome, dur) { est.vistaInteira = nome || "frente"; const v = vistaInteira(est.vistaInteira); voarPara(v[0], v[1], dur); }

  /* ---------------------------- OPACIDADE ------------------------------- */
  function aplicarOpacidade(sist) {
    const o = est.opac[sist];
    const vistos = new Set();
    grupos[sist].traverse(obj => {
      if (!obj.isMesh || !obj.material || vistos.has(obj.material) || obj.userData.particula) return;
      vistos.add(obj.material);
      const m = obj.material;
      const ob = m.userData.opBase === undefined ? 1 : m.userData.opBase;
      if (sist === "tegumentar") { m.opacity = o; m.transparent = o < 1; m.depthWrite = o > 0.6; }
      else { m.opacity = ob * o; m.transparent = m.userData.transpBase || o < 1; m.depthWrite = o > 0.5; }
      m.needsUpdate = true;
    });
    grupos[sist].visible = est.visivel[sist] && o > 0.01;
    aplicarCompartilhados();
  }
  /* Órgãos compartilhados: uma estrutura pode pertencer a mais de um sistema (campo "tambem" em dados.js).
     Ex.: o pâncreas é do Digestório e do Endócrino — aparece quando qualquer um dos dois está ligado. */
  const ativo = s => est.visivel[s] && est.opac[s] > 0.01;
  function outrosSistemas(id) {
    const e = D.estruturas[id]; if (!e) return null;
    return e.tambem || (e.orgao && D.estruturas[e.orgao] && D.estruturas[e.orgao].tambem) || null;
  }
  function sistemasDe(id) { const e = D.estruturas[id]; return e ? [e.sistema].concat(outrosSistemas(id) || []) : []; }
  const compartilhadas = pecas.filter(m => outrosSistemas(m.userData.id));
  const casasCompart = Array.from(new Set(compartilhadas.map(m => m.userData.sistema)));
  function aplicarCompartilhados() {
    const emprestada = m => { const o = outrosSistemas(m.userData.id); return !!o && o.some(ativo); };
    casasCompart.forEach(casa => {
      const on = ativo(casa), emprestimo = !on && compartilhadas.some(m => m.userData.sistema === casa && emprestada(m));
      grupos[casa].visible = on || emprestimo;
      grupos[casa].traverse(o => { if (o.isMesh && !o.userData.particula) o.visible = on || (emprestimo && emprestada(o)); });
    });
    compartilhadas.forEach(m => {
      const vis = [m.userData.sistema].concat(outrosSistemas(m.userData.id)).filter(ativo); if (!vis.length) return;
      const o = Math.max.apply(null, vis.map(s => est.opac[s])), mt = m.material;
      const ob = mt.userData.opBase === undefined ? 1 : mt.userData.opBase;
      mt.opacity = ob * o; mt.transparent = mt.userData.transpBase || o < 1; mt.depthWrite = o > 0.5; mt.needsUpdate = true;
    });
  }
  function aplicarTudo() { Object.keys(D.sistemas).forEach(aplicarOpacidade); atualizarListaSistemas(); }

  /* ----------------------------- PAINEL SISTEMAS ------------------------ */
  const lista = $("#listaSistemas");
  Object.entries(D.sistemas).forEach(([id, s]) => {
    const li = el("div", { class: "sistema", "data-id": id });
    li.innerHTML = `
      <label class="sis-top">
        <input type="checkbox" checked data-chk="${id}">
        <span class="bolinha" style="background:${s.cor}"></span>
        <span class="sis-nome">${s.nome}</span>
        <button class="mini" data-solo="${id}" title="Mostrar só este sistema">só</button>
      </label>
      <input type="range" min="0" max="100" value="${Math.round(est.opac[id] * 100)}" data-op="${id}" aria-label="Opacidade de ${s.nome}">`;
    lista.appendChild(li);
  });
  lista.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.chk) { est.visivel[t.dataset.chk] = t.checked; aplicarOpacidade(t.dataset.chk); }
    if (t.dataset.op) { est.opac[t.dataset.op] = t.value / 100; if (t.value > 0) est.visivel[t.dataset.op] = true; aplicarOpacidade(t.dataset.op); atualizarListaSistemas(); }
  });
  lista.addEventListener("click", e => {
    const b = e.target.closest("[data-solo]"); if (!b) return;
    e.preventDefault();
    const id = b.dataset.solo;
    Object.keys(D.sistemas).forEach(s => { est.visivel[s] = s === id; if (s === id && est.opac[s] < 0.3) est.opac[s] = 1; });
    aplicarTudo(); mostrarSistema(id);
  });
  function atualizarListaSistemas() {
    Object.keys(D.sistemas).forEach(id => {
      const c = lista.querySelector(`[data-chk="${id}"]`), r = lista.querySelector(`[data-op="${id}"]`);
      c.checked = est.visivel[id]; r.value = Math.round(est.opac[id] * 100);
      c.closest(".sistema").classList.toggle("desligado", !est.visivel[id]);
    });
  }

  const selPreset = $("#preset");
  Object.entries(D.presets).forEach(([k, p]) => selPreset.appendChild(el("option", { value: k }, p.nome)));
  selPreset.addEventListener("change", () => aplicarPreset(selPreset.value));
  function aplicarPreset(nome) {
    const p = D.presets[nome]; if (!p) return;
    Object.keys(D.sistemas).forEach(s => {
      est.visivel[s] = p.sistemas.includes(s);
      if (s !== "tegumentar") est.opac[s] = 1;
    });
    est.opac.tegumentar = p.pele; est.visivel.tegumentar = p.pele > 0 || p.sistemas.includes("tegumentar");
    if (est.opac.tegumentar === 0) est.visivel.tegumentar = false;
    selPreset.value = nome;
    aplicarTudo();
  }

  $$("[data-sexo]").forEach(b => b.addEventListener("click", () => definirSexo(b.dataset.sexo)));
  function definirSexo(s) {
    est.sexo = s; refs.fem.visible = s === "feminino"; refs.masc.visible = s === "masculino";
    $$("[data-sexo]").forEach(b => b.classList.toggle("ativo", b.dataset.sexo === s));
    if (est.puberdadeAtiva) atualizarPuberdade();
  }

  /* --------------------------- CORTE (clipping) ------------------------- */
  const plano = new T.Plane(new T.Vector3(-1, 0, 0), 100);
  function aplicarCorte() {
    const tipo = $("#corteTipo").value, v = +$("#corteVal").value;
    let planos = [];
    if (tipo !== "nenhum") {
      if (tipo === "sagital") { plano.normal.set(-1, 0, 0); plano.constant = v / 100 * 3; }
      if (tipo === "coronal") { plano.normal.set(0, 0, -1); plano.constant = v / 100 * 1.6; }
      if (tipo === "transversal") { plano.normal.set(0, -1, 0); plano.constant = 9 + v / 100 * 9; }
      planos = [plano];
    }
    Object.values(mats).forEach(m => { m.clippingPlanes = planos; m.side = planos.length ? T.DoubleSide : (m.userData.ladoBase || T.FrontSide); m.needsUpdate = true; });
  }
  Object.values(mats).forEach(m => m.userData.ladoBase = m.side);
  $("#corteTipo").addEventListener("change", aplicarCorte);
  $("#corteVal").addEventListener("input", aplicarCorte);

  /* ----------------------------- CÂMERA --------------------------------- */
  let anim = null;
  function voarPara(alvo, pos, dur) {
    anim = { t: 0, dur: dur || 0.9, a0: controles.target.clone(), a1: alvo.clone(), p0: camera.position.clone(), p1: pos.clone() };
  }
  const VISTAS = {
    cabeca: [[0, 16.2, 0], [0, 16.6, 7.5]], torax: [[0, 12.4, 0], [0, 12.8, 11]], abdome: [[0, 9.6, 0], [0, 10, 10]],
    pelve: [[0, 8.2, 0], [0, 8.6, 8]], pernas: [[0, 4.5, 0], [0, 5, 20]]
  };
  $$("[data-vista]").forEach(b => b.addEventListener("click", () => {
    const nome = b.dataset.vista;
    if (DIRECOES[nome]) return verCorpoInteiro(nome);
    const v = VISTAS[nome]; est.vistaInteira = null; voarPara(new T.Vector3(...v[0]), new T.Vector3(...v[1]));
  }));
  controles.addEventListener("start", () => { est.vistaInteira = null; });
  $("#btnGirar").addEventListener("click", e => { est.girar = !est.girar; e.currentTarget.classList.toggle("ativo", est.girar); });
  $("#btnFoto").addEventListener("click", () => {
    renderer.render(cena, camera);
    const a = el("a", { href: renderer.domElement.toDataURL("image/png"), download: "corpo-humano-3d.png" }); a.click();
  });
  $("#btnTela").addEventListener("click", () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen(); });

  // uma malha "pertence" a um id se for a própria estrutura ou parte do órgão (ex.: córnea → olho)
  const pertence = (m, id) => m.userData.id === id || (D.estruturas[m.userData.id] && D.estruturas[m.userData.id].orgao === id);
  function focar(id) {
    const caixa = new T.Box3();
    let ok = false;
    pecas.forEach(m => { if (pertence(m, id) && visivelDeFato(m)) { caixa.expandByObject(m); ok = true; } });
    if (!ok) pecas.forEach(m => { if (pertence(m, id)) { caixa.expandByObject(m); ok = true; } });
    if (!ok) return;
    const c = caixa.getCenter(new T.Vector3()); const tam = caixa.getSize(new T.Vector3()).length();
    const dist = Math.min(Math.max(tam * 2.2, 1.2), 40);
    const dir = camera.position.clone().sub(controles.target).normalize();
    if (Math.abs(dir.y) > 0.8) dir.set(0, 0.2, 1).normalize();
    est.vistaInteira = null;
    voarPara(c, c.clone().add(dir.multiplyScalar(dist)));
  }

  /* --------------------------- SELEÇÃO / HOVER -------------------------- */
  const ray = new T.Raycaster();
  const mouse = new T.Vector2();
  const dica = $("#dica");
  function visivelDeFato(o) {
    while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  }
  function selecionaveis() {
    return pecas.concat(importados).filter(m => {
      if (!visivelDeFato(m)) return false;
      if (m.userData.id === "pele" && est.opac.tegumentar < 0.6) return false;
      return !m.material || m.material.opacity > 0.15;
    });
  }
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(selecionaveis(), false);
    const planos = mats.pele.clippingPlanes;
    const h = hits.find(x => !planos || !planos.length || planos[0].distanceToPoint(x.point) >= 0);
    return h ? h.object : null;
  }
  let realceHover = null;
  function realcar(id, cor, intens) {
    pecas.concat(importados).forEach(m => {
      if (!pertence(m, id) || !m.material || !m.material.emissive) return;
      m.material.emissive.setHex(cor); m.material.emissiveIntensity = intens;
    });
  }
  function limparRealce(id) {
    if (!id) return;
    pecas.concat(importados).forEach(m => { if (pertence(m, id) && m.material && m.material.emissive) { m.material.emissive.setHex(0); } });
  }
  let ultimoMove = 0;
  renderer.domElement.addEventListener("pointermove", ev => {
    const agora = performance.now(); if (agora - ultimoMove < 40) return; ultimoMove = agora;
    const o = pick(ev);
    const id = o ? o.userData.id : null;
    if (realceHover !== id) {
      if (realceHover && realceHover !== est.selecionado) limparRealce(realceHover);
      if (id && id !== est.selecionado && est.modo !== "desafio") realcar(id, 0x4a3a1c, 0.6);
      realceHover = id;
    }
    if (o && est.modo !== "desafio") {
      const info = D.estruturas[id];
      dica.textContent = info ? info.nome : (o.userData.nome || id);
      dica.style.left = (ev.clientX + 14) + "px"; dica.style.top = (ev.clientY + 10) + "px"; dica.hidden = false;
      renderer.domElement.style.cursor = "pointer";
    } else { dica.hidden = true; renderer.domElement.style.cursor = "grab"; }
  });
  renderer.domElement.addEventListener("pointerleave", () => { dica.hidden = true; });
  let downPos = null;
  renderer.domElement.addEventListener("pointerdown", ev => { downPos = [ev.clientX, ev.clientY]; });
  renderer.domElement.addEventListener("pointerup", ev => {
    if (!downPos || Math.hypot(ev.clientX - downPos[0], ev.clientY - downPos[1]) > 5) return;
    const o = pick(ev);
    if (est.modo === "desafio" && est.desafio) { responderDesafio(o); return; }
    if (o) selecionar(o.userData.id, false, o); else desselecionar();
  });

  const EXTERNOS = ["tegumentar", "muscular", "esqueletico"];
  function selecionar(id, voar, obj) {
    if (setasCorpo) setasCorpo.marcar(id);
    if (voar && D.estruturas[id] && !EXTERNOS.includes(D.estruturas[id].sistema)) {
      // ao focar um órgão interno, deixa as camadas externas translúcidas
      if (est.visivel.muscular && est.opac.muscular > 0.2) est.opac.muscular = 0.12;
      if (est.visivel.esqueletico && est.opac.esqueletico > 0.5) est.opac.esqueletico = 0.4;
      if (est.opac.tegumentar > 0.15) est.opac.tegumentar = 0.08;
      aplicarTudo();
    }
    if (est.selecionado) limparRealce(est.selecionado);
    est.selecionado = id;
    realcar(id, 0xffaa22, 0.55);
    mostrarInfo(id, obj);
    if (voar) focar(id);
    if (est.modo !== "explorar" && window.innerWidth < 900) { }
  }
  function desselecionar() { if (est.selecionado) limparRealce(est.selecionado); est.selecionado = null; if (setasCorpo) setasCorpo.marcar(null); }

  /* --------------------------- PAINEL DE INFORMAÇÃO --------------------- */
  const painelInfo = $("#info");
  function bnccDoSistema(sist) {
    return D.bncc.filter(h => {
      const a = h.acao || {};
      const p = a.preset && D.presets[a.preset];
      return p && p.sistemas.includes(sist) && a.preset !== "tudo";
    }).map(h => h.codigo);
  }
  function mostrarInfo(id, obj, daLupa) {
    trocarAba("explorar");
    const e = D.estruturas[id];
    if (!e) {
      painelInfo.innerHTML = `<div class="cartao"><h2>${(obj && obj.userData.nome) || id}</h2><p class="muted">Estrutura de um modelo importado. Sem ficha didática cadastrada.</p></div>`;
      return;
    }
    const s = D.sistemas[e.sistema];
    const cods = bnccDoSistema(e.sistema);
    const img = (window.IMAGENS || {})[id] || (window.IMAGENS || {})[e.img];
    painelInfo.innerHTML = `
      <div class="cartao">
        <div class="etiqueta" style="--c:${s.cor}">${s.nome}</div>
        <h2>${e.nome}</h2>
        ${img ? `<figure class="foto-real">
          <button class="foto-zoom" id="btnFotoReal" title="Ampliar imagem"><img src="${img.src}" alt="${e.nome} — imagem anatômica real" loading="lazy"></button>
          <figcaption>Imagem real: ${escaparHTML(img.autor)} · <a href="${img.fonte}" target="_blank" rel="noopener">${escaparHTML(img.licenca || "Wikimedia Commons")}</a></figcaption>
        </figure>` : ""}
        <h4>Função</h4><p>${e.funcao}</p>
        <h4>Como é</h4><p>${e.desc}</p>
        ${e.curiosidade ? `<div class="destaque curioso"><b>Você sabia?</b> ${e.curiosidade}</div>` : ""}
        ${e.saude ? `<div class="destaque saude"><b>Saúde e prevenção:</b> ${e.saude}</div>` : ""}
        ${cods.length ? `<h4>Habilidades BNCC relacionadas</h4><div class="chips">${cods.map(c => `<button class="chip" data-bncc="${c}">${c}</button>`).join("")}</div>` : ""}
        ${e.tambem ? `<p class="mini-txt muted">Também faz parte do sistema: ${e.tambem.map(x => D.sistemas[x].nome).join(", ")}</p>` : ""}
        ${e.orgao && D.estruturas[e.orgao] ? `<p class="mini-txt muted">Faz parte de: <a href="#" id="lnkOrgao">${D.estruturas[e.orgao].nome}</a></p>` : ""}
        <div class="acoes">
          ${lupaDe(id) && !daLupa ? `<button class="btn destaque-btn" id="btnLupaInfo">Ver em detalhe</button>` : ""}
          ${e.soLupa ? "" : `<button class="btn" id="btnFocar">Aproximar</button>`}
          <button class="btn" id="btnOuvir">Ouvir</button>
          <button class="btn" id="btnIsolar">Isolar sistema</button>
        </div>
      </div>
      <div class="cartao pequeno"><h4>Sobre o sistema ${s.nome}</h4><p>${s.descricao}</p></div>`;
    if ($("#btnFotoReal")) $("#btnFotoReal").onclick = () => abrirFotoReal(e.nome, img);
    if ($("#btnFocar")) $("#btnFocar").onclick = () => { if (window.LUPA) LUPA.fechar(); focar(id); };
    if ($("#btnLupaInfo")) $("#btnLupaInfo").onclick = () => LUPA.abrir(lupaDe(id), id);
    if ($("#lnkOrgao")) $("#lnkOrgao").onclick = ev => { ev.preventDefault(); daLupa ? LUPA.abrir(lupaDe(id), e.orgao) : selecionar(e.orgao, true); };
    $("#btnOuvir").onclick = () => falar(`${e.nome}. ${e.funcao} ${e.desc} ${e.curiosidade || ""}`);
    $("#btnIsolar").onclick = () => { Object.keys(D.sistemas).forEach(x => est.visivel[x] = x === e.sistema); if (est.opac[e.sistema] < 0.3) est.opac[e.sistema] = 1; aplicarTudo(); };
    painelInfo.querySelectorAll("[data-bncc]").forEach(b => b.onclick = () => { trocarAba("bncc"); destacarBNCC(b.dataset.bncc); });
  }
  function escaparHTML(t) { return String(t || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function abrirFotoReal(nome, img) {
    let caixa = $("#fotoRealCaixa");
    if (!caixa) {
      caixa = document.createElement("div");
      caixa.id = "fotoRealCaixa";
      caixa.className = "foto-caixa";
      caixa.addEventListener("click", ev => { if (ev.target === caixa || ev.target.closest(".foto-fechar")) caixa.hidden = true; });
      document.addEventListener("keydown", ev => { if (ev.key === "Escape") caixa.hidden = true; });
      document.body.appendChild(caixa);
    }
    caixa.innerHTML = `<div class="foto-caixa-in">
      <button class="foto-fechar" title="Fechar">✕</button>
      <h3>${escaparHTML(nome)}</h3>
      <img src="${img.src}" alt="${escaparHTML(nome)}">
      <p class="mini-txt muted">${escaparHTML(img.arquivo)} — ${escaparHTML(img.autor)} · <a href="${img.fonte}" target="_blank" rel="noopener">${escaparHTML(img.licenca || "Wikimedia Commons")}</a></p>
    </div>`;
    caixa.hidden = false;
  }
  function lupaDe(id) {
    const e = D.estruturas[id]; if (!e || !window.LUPA) return null;
    if (e.lupa) return e.lupa; if (e.orgao && D.estruturas[e.orgao]) return D.estruturas[e.orgao].lupa || null; return null;
  }
  function mostrarSistema(id) {
    const s = D.sistemas[id];
    const estr = Object.entries(D.estruturas).filter(([, e]) => e.sistema === id || (e.tambem && e.tambem.includes(id)));
    trocarAba("explorar");
    painelInfo.innerHTML = `<div class="cartao"><div class="etiqueta" style="--c:${s.cor}">Sistema</div><h2>${s.nome}</h2><p>${s.descricao}</p>
      <h4>Estruturas (clique para localizar)</h4><div class="chips">${estr.filter(([, e]) => !e.soLupa).map(([k, e]) => `<button class="chip" data-estr="${k}">${e.nome}</button>`).join("")}</div>
      ${estr.some(([, e]) => e.soLupa) ? `<h4>🔬 Vistas ampliadas (Lupa dos sentidos)</h4><div class="chips">${estr.filter(([, e]) => e.soLupa).map(([k, e]) => `<button class="chip" data-lupa-estr="${k}">${e.nome}</button>`).join("")}</div>` : ""}</div>`;
    painelInfo.querySelectorAll("[data-estr]").forEach(b => b.onclick = () => selecionar(b.dataset.estr, true));
    painelInfo.querySelectorAll("[data-lupa-estr]").forEach(b => b.onclick = () => LUPA.abrir(lupaDe(b.dataset.lupaEstr), b.dataset.lupaEstr));
  }
  function falar(txt) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt.replace(/[₂]/g, "2")); u.lang = "pt-BR"; u.rate = 1;
    const voz = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("pt"));
    if (voz) u.voice = voz;
    speechSynthesis.speak(u);
  }

  /* ------------------------------ BUSCA --------------------------------- */
  const busca = $("#busca"), sug = $("#sugestoes");
  const semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  busca.addEventListener("input", () => {
    const q = semAcento(busca.value.trim());
    sug.innerHTML = "";
    if (q.length < 2) { sug.hidden = true; return; }
    const res = Object.entries(D.estruturas).filter(([k, e]) => semAcento(e.nome + " " + e.funcao).includes(q)).slice(0, 8);
    res.forEach(([k, e]) => {
      const b = el("button", { class: "sug" }, `<b>${e.nome}</b><small>${D.sistemas[e.sistema].nome}</small>`);
      b.onclick = () => { garantirVisivel(e.sistema); selecionar(k, true); sug.hidden = true; busca.value = e.nome; };
      sug.appendChild(b);
    });
    sug.hidden = !res.length;
  });
  function garantirVisivel(sist) {
    est.visivel[sist] = true; if (est.opac[sist] < 0.4) est.opac[sist] = 1;
    if (sist !== "tegumentar" && est.opac.tegumentar > 0.3) est.opac.tegumentar = 0.12;
    aplicarTudo();
  }

  /* ------------------------------ RÓTULOS ------------------------------- */
  const camadaRot = $("#rotulos");
  const ROT = ["cerebro", "cerebelo", "olho", "coracao", "pulmao_d", "pulmao_e", "figado", "estomago", "intestino_delgado", "intestino_grosso", "rim_d", "rim_e", "bexiga", "cranio", "coluna", "costelas", "femur", "umero", "traqueia", "esofago", "tireoide", "baco", "pancreas", "diafragma", "biceps", "quadriceps", "deltoide", "aorta", "medula", "utero", "testiculos", "ovarios", "timo", "glandulas_salivares", "uretra"];
  // nomes dos nervos: só aparecem quando poucos sistemas estão visíveis, para não poluir o corpo completo
  const ROT_NERVOS = new Set(["nervo_trigemeo", "plexo_cervical", "nervos_espinais", "ganglios_espinais", "ganglios_simpaticos", "tronco_simpatico", "ganglios_pre_vertebrais", "nervos_esplancnicos", "nervos_ombro_braco", "nervo_obturatorio", "nervo_sural", "nervo_facial", "nervo_vago", "nervo_frenico", "nervos_intercostais", "nervo_radial", "nervo_mediano", "nervo_ulnar", "nervo_femoral", "nervo_isquiatico", "nervo_tibial", "nervo_fibular"]);
  ROT.push(...ROT_NERVOS);
  // Setas: nomes nas margens da área 3D, com seta até a superfície da estrutura.
  var setasCorpo = SETAS.criar(camadaRot);   // var: pode ser consultada antes desta linha
  ROT.forEach(id => setasCorpo.adicionar(id, D.estruturas[id].nome, () => selecionar(id, true)));
  const amostras = {};
  function amostrasDe(id) { if (!amostras[id]) amostras[id] = SETAS.amostrar(pecas.filter(m => pertence(m, id)), 240); return amostras[id]; }
  function atualizarRotulos() {
    if (!est.rotulos) return;
    const w = palco.clientWidth, h = palco.clientHeight, pts = [];
    const poucos = Object.keys(D.sistemas).filter(s => s !== "tegumentar" && est.visivel[s] && est.opac[s] >= 0.15).length <= 3;
    ROT.forEach(id => {
      if (ROT_NERVOS.has(id) && !poucos) return;
      if (!sistemasDe(id).some(s => est.visivel[s] && est.opac[s] >= 0.15)) return;
      const a = SETAS.ancora(amostrasDe(id), camera, T, null, visivelDeFato); if (!a) return;
      const v = a.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) return;
      pts.push({ id, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h });
    });
    setasCorpo.atualizar(pts, w, h);
  }
  camadaRot.hidden = !est.rotulos;
  $("#btnRotulos").classList.toggle("ativo", est.rotulos);
  $("#btnRotulos").addEventListener("click", e => {
    est.rotulos = !est.rotulos; e.currentTarget.classList.toggle("ativo", est.rotulos);
    camadaRot.hidden = !est.rotulos;
  });

  /* -------------------------- PARTÍCULAS DO SANGUE ---------------------- */
  function criarParticulas(curvas, cor, porCurva) {
    const n = curvas.length * porCurva;
    const im = new T.InstancedMesh(new T.SphereGeometry(0.045, 8, 6), new T.MeshBasicMaterial({ color: cor }), n);
    im.userData.particula = true;
    const dados = [];
    curvas.forEach((c, i) => { const comp = c.getLength(); for (let k = 0; k < porCurva; k++) dados.push({ c, t: k / porCurva + Math.random() * 0.05, comp }); });
    im.userData.dados = dados;
    grupos.circulatorio.add(im);
    return im;
  }
  const partA = criarParticulas(refs.arterias, 0xff4d5e, 7);
  const partV = criarParticulas(refs.veias, 0x6c8cff, 7);
  const mtx = new T.Matrix4();
  function moverParticulas(im, dt, vel) {
    im.visible = est.fluxo;
    if (!est.fluxo) return;
    im.userData.dados.forEach((d, i) => {
      d.t += dt * vel / d.comp; if (d.t > 1) d.t -= 1;
      const p = d.c.getPointAt(d.t);
      mtx.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, mtx);
    });
    im.instanceMatrix.needsUpdate = true;
  }

  /* ------------------------- OBJETOS DE SIMULAÇÃO ----------------------- */
  const bolo = new T.Mesh(new T.SphereGeometry(0.16, 20, 14), new T.MeshStandardMaterial({ color: 0x8bc34a, emissive: 0x335511, roughness: 0.5 }));
  bolo.visible = false; cena.add(bolo);
  const impulso = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), new T.MeshBasicMaterial({ color: 0xfff176 }));
  const halo = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.35 }));
  impulso.add(halo); impulso.visible = false; cena.add(impulso);
  const fogo = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 12), new T.MeshBasicMaterial({ color: 0xff7043, transparent: true, opacity: 0.85 }));
  fogo.position.copy(new T.Vector3(-2.72, 6.85, 0.3)); fogo.visible = false; cena.add(fogo);

  /* ---------------------- PAINEL DE SIMULAÇÕES (3D) --------------------- */
  const SUBST = {
    nenhuma: { nome: "Nenhuma", fator: 1, txt: "Condução normal do impulso nervoso. Tempo de reação típico ≈ 150–250 ms." },
    depressora: { nome: "Depressora (ex.: álcool, calmantes, solventes)", fator: 2.3, txt: "Depressoras DIMINUEM a atividade do SNC: reflexos lentos, sonolência, perda de coordenação (cerebelo) — por isso é proibido dirigir após beber." },
    estimulante: { nome: "Estimulante (ex.: cafeína, nicotina, cocaína, anfetaminas)", fator: 0.7, txt: "Estimulantes AUMENTAM a atividade do SNC: agitação, insônia, coração acelerado e pressão alta. Nicotina e cocaína causam forte dependência." },
    perturbadora: { nome: "Perturbadora (ex.: LSD, maconha em altas doses)", fator: 1.4, txt: "Perturbadoras ALTERAM a percepção: o impulso se torna irregular, com distorções sensoriais, alucinações e prejuízo da memória e atenção." }
  };
  function montarSimulacoes() {
    const s = $("#aba-simular");
    s.innerHTML = `
    <div class="cartao sim" id="simCoracao">
      <h3>❤️ Batimentos cardíacos e circulação <span class="cod">EF05CI07 · EM13CNT202</span></h3>
      <p class="muted">Ajuste a frequência cardíaca (FC) e veja o sangue circulando: vermelho = rico em O₂ (artérias), azul = pobre em O₂ (veias).</p>
      <div class="linha-btn"><button class="btn" data-ativ="60">😴 Repouso</button><button class="btn" data-ativ="100">🚶 Caminhada</button><button class="btn" data-ativ="160">🏃 Corrida</button></div>
      <label>FC: <b id="vBpm">72</b> bpm<input type="range" id="rBpm" min="40" max="200" value="72"></label>
      <div class="medidores">
        <div><small>Débito cardíaco</small><b id="vDc">5,0 L/min</b></div>
        <div><small>Sangue/dia</small><b id="vDia">7.258 L</b></div>
        <div><small>Batimentos/dia</small><b id="vBd">103.680</b></div>
      </div>
      <label class="chk"><input type="checkbox" id="chkFluxo" checked> Mostrar fluxo sanguíneo</label>
      <details><summary>Entenda</summary><p>Débito cardíaco = FC × volume sistólico (≈ 70 mL em repouso, até ~110 mL no exercício). Durante o exercício, os músculos precisam de mais O₂ e nutrientes: o coração acelera para entregá-los e para retirar o CO₂ e os resíduos produzidos, que serão eliminados pelos pulmões e rins.</p></details>
      <button class="btn link" data-focar="coracao">Ver o coração de perto</button>
    </div>

    <div class="cartao sim">
      <h3>🫁 Respiração e trocas gasosas <span class="cod">EF05CI06 · EM13CNT104</span></h3>
      <label>Frequência respiratória: <b id="vFr">14</b> respirações/min<input type="range" id="rFr" min="6" max="40" value="14"></label>
      <div class="medidores">
        <div><small>Volume corrente</small><b id="vVc">500 mL</b></div>
        <div><small>Ventilação</small><b id="vVm">7,0 L/min</b></div>
        <div><small>Fase</small><b id="vFase">—</b></div>
      </div>
      <label class="chk"><input type="checkbox" id="chkFumante"> Pulmões de fumante (alvéolos danificados)</label>
      <details><summary>Entenda</summary><p>Na <b>inspiração</b> o diafragma e os intercostais contraem: o diafragma desce, o tórax aumenta e o ar entra. Na <b>expiração</b> eles relaxam e o ar sai. Nos alvéolos ocorre a <b>hematose</b>: O₂ passa para o sangue e CO₂ sai dele, por difusão. A fumaça do cigarro contém monóxido de carbono, alcatrão e mais de 4.700 substâncias tóxicas.</p></details>
      <button class="btn link" data-preset="respiratorio">Mostrar só respiratório + circulatório</button>
    </div>

    <div class="cartao sim">
      <h3>🍎 Viagem do alimento (digestão) <span class="cod">EF05CI06</span></h3>
      <p class="muted">Acompanhe o bolo alimentar pelo tubo digestório.</p>
      <div class="linha-btn"><button class="btn prim" id="btnDigest">▶ Iniciar digestão</button><select id="velDig"><option value="1">Velocidade normal</option><option value="0.5">Lenta</option><option value="2">Rápida</option></select></div>
      <div class="etapas" id="etapasDig">${refs.trajetoDigestao.map((e, i) => `<span data-et="${i}">${e.nome}</span>`).join("")}</div>
      <div class="destaque" id="txtDig">Clique em “Iniciar” para começar.</div>
    </div>

    <div class="cartao sim">
      <h3>⚡ Arco reflexo e substâncias psicoativas <span class="cod">EF06CI07 · EF06CI10 · EM13CNT207</span></h3>
      <p class="muted">A mão encosta em algo quente: o impulso sobe pelo nervo sensitivo até a medula, que responde pelo nervo motor, e o bíceps puxa o braço.</p>
      <label>Substância no organismo<select id="selSubst">${Object.entries(SUBST).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join("")}</select></label>
      <div class="linha-btn"><button class="btn prim" id="btnReflexo">🔥 Encostar no fogo</button></div>
      <div class="medidores"><div><small>Tempo de reação</small><b id="vReac">—</b></div><div><small>Etapa</small><b id="vEtapaR">—</b></div></div>
      <div class="destaque" id="txtSubst">${SUBST.nenhuma.txt}</div>
    </div>

    <div class="cartao sim">
      <h3>💪 Movimento: ossos + músculos + nervos <span class="cod">EF06CI09</span></h3>
      <label>Flexão do cotovelo direito: <b id="vFlex">0°</b><input type="range" id="rFlex" min="0" max="140" value="0"></label>
      <div class="medidores"><div><small>Bíceps</small><b id="vBic">relaxado</b></div><div><small>Tríceps</small><b id="vTri">relaxado</b></div></div>
      <details open><summary>Entenda</summary><p>O <b>sistema nervoso</b> envia o comando; o <b>bíceps</b> contrai (encurta e engrossa) e puxa o rádio; o <b>tríceps</b>, antagonista, relaxa. O cotovelo funciona como uma <b>articulação</b> (dobradiça) e os ossos como <b>alavancas</b>.</p></details>
      <button class="btn link" data-preset="locomocao">Mostrar ossos, músculos e nervos</button>
    </div>

    <div class="cartao sim">
      <h3>💧 Rins, hidratação e urina <span class="cod">EF05CI07 · EM13CNT202</span></h3>
      <label>Ingestão de água: <b id="vAgua">2,0</b> L/dia<input type="range" id="rAgua" min="0.5" max="4" step="0.1" value="2"></label>
      <div class="medidores"><div><small>Bexiga</small><b id="vBex">25%</b></div><div><small>Urina</small><b id="vUri"><span id="corUri" class="amostra"></span></b></div><div><small>ADH</small><b id="vAdh">normal</b></div></div>
      <div class="linha-btn"><button class="btn" id="btnUrinar">🚽 Esvaziar a bexiga</button></div>
      <details><summary>Entenda</summary><p>Os rins filtram cerca de 180 L de sangue por dia, mas formam só ~1,5 L de urina: quase toda a água é reabsorvida. Com pouca água, o hormônio ADH (antidiurético) aumenta e a urina fica mais escura e concentrada.</p></details>
    </div>

    <div class="cartao sim">
      <h3>🌱 Puberdade e hormônios <span class="cod">EF08CI08</span></h3>
      <div class="linha-btn"><button class="btn ${est.sexo === "feminino" ? "ativo" : ""}" data-sexo2="feminino">Corpo feminino</button><button class="btn ${est.sexo === "masculino" ? "ativo" : ""}" data-sexo2="masculino">Corpo masculino</button></div>
      <label>Idade: <b id="vIdade">14</b> anos<input type="range" id="rIdade" min="6" max="20" value="14"></label>
      <div class="eixo-horm"><span class="h1">Hipotálamo<br><small>GnRH</small></span>→<span class="h2">Hipófise<br><small>LH · FSH</small></span>→<span class="h3" id="gonada">Ovários<br><small>Estrogênio · Progesterona</small></span></div>
      <div class="destaque" id="txtPub"></div>
      <button class="btn link" id="btnPub3d">Destacar glândulas no modelo</button>
    </div>

    <div class="cartao">
      <h3>🧪 Laboratórios interativos</h3>
      <div class="grade-lab">
        <button class="lab" data-modal="visao">👁️<b>Visão e lentes</b><small>EF06CI08</small></button>
        <button class="lab" data-modal="vacina">💉<b>Vacinação e epidemias</b><small>EF07CI10 · EM13CNT310</small></button>
        <button class="lab" data-modal="cardapio">🥗<b>Cardápio e IMC</b><small>EF05CI08 · EF05CI09</small></button>
        <button class="lab" data-modal="niveis">🔬<b>Níveis de organização e célula</b><small>EF06CI05 · EF06CI06</small></button>
        <button class="lab" data-modal="contraceptivos">🛡️<b>Contracepção e ISTs</b><small>EF08CI09 · EF08CI10 · EF08CI11</small></button>
        <button class="lab" data-modal="heranca">🧬<b>Gametas e hereditariedade</b><small>EF09CI08</small></button>
      </div>
    </div>`;

    const fmt = (n, d) => n.toLocaleString("pt-BR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
    const atuBpm = () => {
      $("#vBpm").textContent = est.bpm;
      const vs = 70 + Math.max(0, est.bpm - 70) * 0.3;
      const dc = est.bpm * vs / 1000;
      $("#vDc").textContent = fmt(dc, 1) + " L/min";
      $("#vDia").textContent = fmt(dc * 60 * 24) + " L";
      $("#vBd").textContent = fmt(est.bpm * 60 * 24);
      $("#rBpm").value = est.bpm;
    };
    $("#rBpm").oninput = e => { est.bpm = +e.target.value; atuBpm(); };
    s.querySelectorAll("[data-ativ]").forEach(b => b.onclick = () => { est.bpm = +b.dataset.ativ; est.fr = est.bpm > 140 ? 32 : est.bpm > 90 ? 20 : 12; $("#rFr").value = est.fr; atuFr(); atuBpm(); });
    $("#chkFluxo").onchange = e => est.fluxo = e.target.checked;
    atuBpm();
    const atuFr = () => {
      $("#vFr").textContent = est.fr;
      const vc = est.fr > 20 ? 500 + (est.fr - 20) * 40 : 500;
      const f = $("#chkFumante").checked ? 0.7 : 1;
      $("#vVc").textContent = fmt(vc * f) + " mL";
      $("#vVm").textContent = fmt(vc * f * est.fr / 1000, 1) + " L/min";
    };
    $("#rFr").oninput = e => { est.fr = +e.target.value; atuFr(); };
    $("#chkFumante").onchange = e => {
      const fum = e.target.checked;
      refs.pulmoes.forEach(p => p.traverse(o => { if (o.isMesh) o.material.color.setHex(fum ? 0x5e4b4f : o.material.userData.corBase.getHex()); }));
      atuFr();
    };
    atuFr();
    $("#btnDigest").onclick = () => iniciarDigestao();
    $("#selSubst").onchange = e => $("#txtSubst").textContent = SUBST[e.target.value].txt;
    $("#btnReflexo").onclick = () => iniciarReflexo();
    $("#rFlex").oninput = e => { est.flexao = +e.target.value; aplicarFlexao(); };
    $("#rAgua").oninput = e => { est.hidrat = +e.target.value; atuRim(); };
    $("#btnUrinar").onclick = () => { est.bexiga = 0.05; };
    $("#rIdade").oninput = e => { est.idade = +e.target.value; est.puberdadeAtiva = true; atualizarPuberdade(); };
    s.querySelectorAll("[data-sexo2]").forEach(b => b.onclick = () => { definirSexo(b.dataset.sexo2); s.querySelectorAll("[data-sexo2]").forEach(x => x.classList.toggle("ativo", x === b)); atualizarPuberdade(); });
    $("#btnPub3d").onclick = () => { aplicarPreset("puberdade"); est.puberdadeAtiva = true; atualizarPuberdade(); voarPara(new T.Vector3(0, 12, 0), new T.Vector3(0, 12.5, 24)); };
    s.querySelectorAll("[data-focar]").forEach(b => b.onclick = () => { garantirVisivel(D.estruturas[b.dataset.focar].sistema); selecionar(b.dataset.focar, true); trocarAba("simular"); });
    s.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => aplicarPreset(b.dataset.preset));
    s.querySelectorAll("[data-modal]").forEach(b => b.onclick = () => SIM2D.abrir(b.dataset.modal));
    atuRim(); atualizarPuberdade(true);
  }

  /* ---- digestão ---- */
  function iniciarDigestao() {
    garantirVisivel("digestorio");
    est.digest = { etapa: 0, t: 0 };
    bolo.visible = true;
    voarPara(new T.Vector3(0, 11.5, 0.3), new T.Vector3(3, 12, 13));
    atuEtapaDig();
  }
  const MAPA_DIG = ["boca", "esofago", "estomago", "intestino_delgado", "intestino_grosso"];
  function atuEtapaDig() {
    const d = est.digest; const e = refs.trajetoDigestao[d.etapa];
    $$("#etapasDig span").forEach((x, i) => { x.classList.toggle("feito", i < d.etapa); x.classList.toggle("atual", i === d.etapa); });
    $("#txtDig").innerHTML = `<b>${e.texto}</b><br><small>Tempo real aproximado: ${e.tempo}</small>`;
    MAPA_DIG.forEach(limparRealce);
    realcar(MAPA_DIG[d.etapa], 0x88ff44, 0.35);
    if (d.etapa === 3) { realcar("figado", 0x557700, 0.3); realcar("pancreas", 0x557700, 0.3); }
  }
  function passoDigestao(dt) {
    const d = est.digest; if (!d) return;
    const e = refs.trajetoDigestao[d.etapa];
    d.t += dt * (+$("#velDig").value) / e.dur;
    if (d.t >= 1) {
      d.t = 0; d.etapa++;
      if (d.etapa >= refs.trajetoDigestao.length) {
        est.digest = null; bolo.visible = false; MAPA_DIG.concat(["figado", "pancreas"]).forEach(limparRealce);
        $$("#etapasDig span").forEach(x => { x.classList.add("feito"); x.classList.remove("atual"); });
        $("#txtDig").innerHTML = "<b>Fim da viagem!</b> Os nutrientes absorvidos no intestino delgado foram levados pelo sangue a todas as células, onde, com o O₂ trazido pelo sistema respiratório, liberam energia (respiração celular).";
        return;
      }
      atuEtapaDig();
    }
    const p = refs.trajetoDigestao[d.etapa].curva.getPointAt(Math.min(d.t, 1));
    bolo.position.copy(p);
    const k = d.etapa >= 2 ? 0.75 : 1; bolo.scale.setScalar(d.etapa >= 3 ? 0.6 : k);
    bolo.material.color.setHex([0x8bc34a, 0x9ccc65, 0xd4b94a, 0xc9a54a, 0x8d6e43][d.etapa]);
  }

  /* ---- arco reflexo ---- */
  function iniciarReflexo() {
    if (est.reflexo) return;
    garantirVisivel("nervoso");
    est.flexao = 0; aplicarFlexao(); $("#rFlex").value = 0;
    const sub = SUBST[$("#selSubst").value];
    est.reflexo = { fase: 0, t: 0, fator: sub.fator, k: $("#selSubst").value, inicio: performance.now() };
    fogo.visible = true; impulso.visible = true;
    voarPara(new T.Vector3(-1.6, 11, 0), new T.Vector3(-4, 12, 16));
  }
  const FASES_R = ["Receptor na pele → nervo sensitivo", "Nervo sensitivo → medula espinal", "Medula → nervo motor", "Músculo contrai: braço se afasta!", "Cérebro percebe a dor"];
  function passoReflexo(dt) {
    const r = est.reflexo; if (!r) return;
    const dur = [0.9, 1.0, 1.1, 0.8, 1.4][r.fase] * r.fator;
    let ti = r.t;
    if (r.k === "perturbadora") ti += Math.sin(performance.now() / 70) * 0.03;
    r.t += dt / dur;
    $("#vEtapaR").textContent = FASES_R[Math.min(r.fase, 4)];
    const tt = Math.min(Math.max(ti, 0), 1);
    if (r.fase === 0) impulso.position.copy(refs.nervoAntebraco.getPointAt(tt));
    else if (r.fase === 1) impulso.position.copy(refs.nervoBraco.getPointAt(tt));
    else if (r.fase === 2) impulso.position.copy(refs.motorBiceps.getPointAt(tt));
    else if (r.fase === 3) { impulso.visible = false; est.flexao = 100 * Math.sin(Math.min(tt, 1) * Math.PI / 2); aplicarFlexao(); realcar("biceps", 0xff3300, 0.6); }
    else if (r.fase === 4) {
      const p = refs.medula.getPointAt(Math.min(1, 0.6 + tt * 0.4)); impulso.visible = true; impulso.position.copy(p);
      realcar("cerebro", 0xffdd00, 0.25 * tt);
    }
    if (r.t >= 1) {
      r.t = 0; r.fase++;
      if (r.fase === 3) { $("#vReac").textContent = Math.round(180 * r.fator + (r.k === "perturbadora" ? Math.random() * 120 : 0)) + " ms"; }
      if (r.fase > 4) {
        est.reflexo = null; impulso.visible = false; fogo.visible = false; limparRealce("biceps"); limparRealce("cerebro");
        const vol = setInterval(() => { est.flexao = Math.max(0, est.flexao - 4); aplicarFlexao(); if (est.flexao <= 0) clearInterval(vol); }, 30);
      }
    }
  }
  /* ---- movimento ---- */
  function aplicarFlexao() {
    const a = est.flexao * Math.PI / 180;
    refs.pivos.forEach(p => p.rotation.x = -a);
    const k = est.flexao / 140;
    const b = refs.biceps, t = refs.triceps;
    if (!b.userData.e0) { b.userData.e0 = b.scale.clone(); t.userData.e0 = t.scale.clone(); }
    b.scale.set(b.userData.e0.x * (1 + 0.22 * k), b.userData.e0.y * (1 - 0.1 * k), b.userData.e0.z * (1 + 0.28 * k));
    t.scale.set(t.userData.e0.x * (1 - 0.12 * k), t.userData.e0.y * (1 + 0.05 * k), t.userData.e0.z * (1 - 0.12 * k));
    const vf = $("#vFlex"); if (vf) {
      vf.textContent = Math.round(est.flexao) + "°";
      $("#vBic").textContent = k > 0.05 ? "CONTRAÍDO" : "relaxado";
      $("#vTri").textContent = k > 0.05 ? "relaxado (estirado)" : "relaxado";
    }
  }
  /* ---- rins ---- */
  function atuRim() {
    const h = est.hidrat;
    $("#vAgua").textContent = h.toLocaleString("pt-BR", { minimumFractionDigits: 1 });
    const cores = ["#b86f0c", "#d99a1e", "#efc73a", "#f6e27a", "#fbf3c0"];
    const i = Math.min(4, Math.floor((h - 0.5) / 0.75));
    $("#corUri").style.background = cores[i];
    $("#vAdh").textContent = h < 1.2 ? "ALTO (poupa água)" : h > 3 ? "baixo" : "normal";
  }
  function passoRim(dt) {
    est.bexiga = Math.min(1, est.bexiga + dt * 0.006 * est.hidrat);
    const b = refs.bexiga; const k = 0.7 + est.bexiga * 0.9;
    b.scale.set(b.userData.escalaBase.x * k, b.userData.escalaBase.y * k, b.userData.escalaBase.z * k);
    const vb = $("#vBex"); if (vb) vb.textContent = Math.round(est.bexiga * 100) + "%" + (est.bexiga > 0.85 ? " ⚠️" : "");
  }
  /* ---- puberdade ---- */
  function atualizarPuberdade(silencioso) {
    const i = est.idade, f = est.sexo === "feminino";
    const g = $("#gonada"); if (g) g.innerHTML = f ? "Ovários<br><small>Estrogênio · Progesterona</small>" : "Testículos<br><small>Testosterona</small>";
    let txt;
    if (i < 8) txt = "Infância: o eixo hipotálamo–hipófise–gônadas está pouco ativo. Os hormônios sexuais estão em níveis baixos.";
    else if (i < (f ? 10 : 11)) txt = "Pré-puberdade: o hipotálamo começa a liberar GnRH em pulsos, principalmente durante o sono.";
    else if (i < 15) txt = f
      ? "Puberdade (geralmente entre 8 e 13 anos o início): crescimento das mamas (telarca), pelos pubianos e axilares, estirão de crescimento, alargamento dos quadris e a primeira menstruação (menarca), em média entre 11 e 13 anos."
      : "Puberdade (geralmente entre 9 e 14 anos o início): aumento dos testículos e do pênis, pelos pubianos, axilares e faciais, voz mais grave (laringe cresce), estirão de crescimento, aumento da massa muscular e primeiras ejaculações (semenarca).";
    else if (i < 18) txt = "Fim da puberdade: o crescimento desacelera e as cartilagens de crescimento dos ossos se fecham. A pele fica mais oleosa (acne) pela ação dos hormônios. Mudanças emocionais também fazem parte: o sistema nervoso (especialmente o córtex pré-frontal) continua amadurecendo até ~25 anos.";
    else txt = "Fase adulta: maturidade reprodutiva. O crescimento em altura terminou.";
    const t = $("#txtPub"); if (t) t.innerHTML = txt + "<br><small>Cada pessoa tem o seu ritmo — variações de idade são normais.</small>";
    const esc = 0.72 + 0.28 * Math.min(1, Math.max(0, (i - 6) / 12));
    if (!silencioso) corpo.raiz.scale.setScalar(esc);
  }
  function passoPuberdade(tempo) {
    if (!est.puberdadeAtiva) return;
    const i = est.idade;
    const nivel = i < 8 ? 0.05 : i < 10 ? 0.25 : i < 16 ? 0.9 : 0.55;
    const pulso = (Math.sin(tempo * 3) * 0.5 + 0.5) * nivel;
    const glow = (m, c) => { if (m) { m.emissive.setHex(c); m.emissiveIntensity = pulso; } };
    glow(mats.hipotalamo, 0xff66ff); glow(mats.hipofise, 0xff66ff);
    glow(mats.ovarios, 0xff4488); glow(mats.testiculos, 0x4488ff);
  }

  /* ------------------------------- BNCC --------------------------------- */
  function montarBNCC() {
    const box = $("#aba-bncc");
    const etapas = [...new Set(D.bncc.map(h => h.etapa))];
    box.innerHTML = `
      <div class="cartao"><h3>Habilidades da BNCC — corpo humano</h3>
      <p class="muted">Unidade temática <b>Vida e evolução</b> (Ciências – Ensino Fundamental) e competências específicas de <b>Ciências da Natureza e suas Tecnologias</b> (Ensino Médio). Clique em “Explorar” para abrir o recurso correspondente.</p>
      <div class="filtros">${["Todas"].concat(etapas).map((e, i) => `<button class="chip ${i === 0 ? "ativo" : ""}" data-etapa="${e}">${e}</button>`).join("")}</div></div>
      <div id="listaBNCC"></div>`;
    const lst = $("#listaBNCC");
    D.bncc.forEach(h => {
      const c = el("div", { class: "cartao hab", "data-cod": h.codigo, "data-et": h.etapa });
      c.innerHTML = `<div class="hab-top"><span class="codigo">${h.codigo}</span><span class="muted">${h.ano} · ${h.unidade}</span></div><p>${h.texto}</p><button class="btn prim">Explorar</button>`;
      c.querySelector("button").onclick = () => executarAcao(h.acao);
      lst.appendChild(c);
    });
    box.querySelectorAll("[data-etapa]").forEach(b => b.onclick = () => {
      box.querySelectorAll("[data-etapa]").forEach(x => x.classList.toggle("ativo", x === b));
      lst.querySelectorAll(".hab").forEach(c => c.hidden = !(b.dataset.etapa === "Todas" || c.dataset.et === b.dataset.etapa));
    });
  }
  function destacarBNCC(cod) {
    const c = document.querySelector(`.hab[data-cod="${cod}"]`); if (!c) return;
    c.hidden = false; c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.add("piscar"); setTimeout(() => c.classList.remove("piscar"), 1600);
  }
  function executarAcao(a) {
    if (!a) return;
    if (a.preset) aplicarPreset(a.preset);
    if (a.foco) { garantirVisivel(D.estruturas[a.foco].sistema); selecionar(a.foco, true); }
    if (a.aba === "identificar") { trocarAba("desafio"); }
    if (a.sim) {
      trocarAba("simular");
      const alvo = { coracao: "#simCoracao", digestao: "#btnDigest", reflexo: "#btnReflexo", movimento: "#rFlex", respiracao: "#rFr", puberdade: "#rIdade" }[a.sim];
      const n = alvo && $(alvo);
      if (n) { const card = n.closest(".cartao"); card.scrollIntoView({ behavior: "smooth", block: "start" }); card.classList.add("piscar"); setTimeout(() => card.classList.remove("piscar"), 1600); }
      if (a.sim === "puberdade") { est.puberdadeAtiva = true; atualizarPuberdade(); }
    }
    if (a.modal) SIM2D.abrir(a.modal);
  }

  /* ------------------------------- QUIZ --------------------------------- */
  const quiz = { lista: [], i: 0, pontos: 0, respondida: false };
  function montarQuiz() {
    const box = $("#aba-quiz");
    box.innerHTML = `<div class="cartao"><h3>📝 Quiz</h3><p class="muted">Escolha o nível. As questões são sorteadas e indicam a habilidade da BNCC avaliada.</p>
      <div class="linha-btn"><button class="btn" data-niv="EF1">Fundamental – Anos Iniciais</button><button class="btn" data-niv="EF2">Fundamental – Anos Finais</button><button class="btn" data-niv="EM">Ensino Médio</button><button class="btn" data-niv="TODOS">Misturado</button></div></div>
      <div id="quizArea"></div>`;
    box.querySelectorAll("[data-niv]").forEach(b => b.onclick = () => iniciarQuiz(b.dataset.niv));
  }
  const embaralhar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function iniciarQuiz(niv) {
    quiz.lista = embaralhar(D.quiz.filter(q => niv === "TODOS" || q.nivel === niv)).slice(0, 10);
    quiz.i = 0; quiz.pontos = 0; mostrarQuestao();
  }
  function mostrarQuestao() {
    const area = $("#quizArea");
    if (quiz.i >= quiz.lista.length) {
      const n = quiz.lista.length, p = quiz.pontos, pct = Math.round(p / n * 100);
      const msg = pct >= 80 ? "Excelente! 🏆" : pct >= 60 ? "Muito bom! 👏" : pct >= 40 ? "Bom começo — revise os sistemas no modelo 3D. 📚" : "Continue estudando: explore o modelo e tente de novo! 💪";
      area.innerHTML = `<div class="cartao centro"><h2>${p} / ${n}</h2><div class="barra"><span style="width:${pct}%"></span></div><p>${msg}</p><button class="btn prim" id="qDeNovo">Jogar novamente</button></div>`;
      $("#qDeNovo").onclick = () => { const q = $("#aba-quiz [data-niv]"); area.innerHTML = ""; };
      return;
    }
    const q = quiz.lista[quiz.i]; quiz.respondida = false;
    const ordem = embaralhar(q.o.map((t, i) => ({ t, i })));
    area.innerHTML = `<div class="cartao"><div class="hab-top"><span class="muted">Questão ${quiz.i + 1} de ${quiz.lista.length}</span><span class="codigo">${q.bncc}</span></div>
      <div class="barra"><span style="width:${quiz.i / quiz.lista.length * 100}%"></span></div>
      <h3 class="pergunta">${q.p}</h3><div class="opcoes">${ordem.map(o => `<button class="opcao" data-i="${o.i}">${o.t}</button>`).join("")}</div>
      <div id="qFeed"></div></div>`;
    area.querySelectorAll(".opcao").forEach(b => b.onclick = () => {
      if (quiz.respondida) return; quiz.respondida = true;
      const certo = +b.dataset.i === q.c;
      if (certo) quiz.pontos++;
      area.querySelectorAll(".opcao").forEach(x => { if (+x.dataset.i === q.c) x.classList.add("certa"); else if (x === b) x.classList.add("errada"); x.disabled = true; });
      $("#qFeed").innerHTML = `<div class="destaque ${certo ? "saude" : "erro"}"><b>${certo ? "Correto!" : "Não foi dessa vez."}</b> ${q.e}</div><button class="btn prim" id="qProx">Próxima</button>`;
      $("#qProx").onclick = () => { quiz.i++; mostrarQuestao(); };
    });
  }

  /* ------------------------------ DESAFIO ------------------------------- */
  function montarDesafio() {
    const box = $("#aba-desafio");
    box.innerHTML = `<div class="cartao"><h3>🎯 Desafio: encontre no corpo!</h3>
      <p class="muted">Aparece o nome de uma estrutura: clique nela no modelo 3D. Use os botões de sistemas para mostrar ou esconder camadas. 10 rodadas.</p>
      <button class="btn prim" id="btnIniDes">Começar desafio</button></div><div id="desArea"></div>`;
    $("#btnIniDes").onclick = iniciarDesafio;
  }
  function iniciarDesafio() {
    aplicarPreset("tudo"); est.opac.tegumentar = 0; est.visivel.tegumentar = false;
    est.opac.muscular = 0.35; aplicarTudo();
    est.desafio = { fila: embaralhar(D.desafio).slice(0, 10), i: 0, pontos: 0, tent: 0, inicio: performance.now() };
    est.modo = "desafio";
    rodadaDesafio();
  }
  function rodadaDesafio() {
    const d = est.desafio, area = $("#desArea");
    if (d.i >= d.fila.length) {
      const seg = Math.round((performance.now() - d.inicio) / 1000);
      area.innerHTML = `<div class="cartao centro"><h2>${d.pontos} / ${d.fila.length}</h2><p>Tempo total: ${seg} s</p><button class="btn prim" id="btnDesNovo">Jogar de novo</button></div>`;
      $("#btnDesNovo").onclick = iniciarDesafio; est.desafio = null; est.modo = "explorar"; return;
    }
    const id = d.fila[d.i]; d.tent = 0;
    const s = D.estruturas[id].sistema;
    area.innerHTML = `<div class="cartao centro alvo"><small>Rodada ${d.i + 1}/${d.fila.length} · Pontos: ${d.pontos}</small><h2>Clique em: <span>${D.estruturas[id].nome}</span></h2>
      <p class="muted">Dica: sistema ${D.sistemas[s].nome}</p><div id="desFeed"></div><button class="btn" id="btnPular">Pular / mostrar</button></div>`;
    $("#btnPular").onclick = () => { garantirVisivel(s); selecionar(id, true); trocarAba("desafio"); setTimeout(() => { d.i++; rodadaDesafio(); }, 1800); };
  }
  function responderDesafio(o) {
    const d = est.desafio; const alvo = d.fila[d.i];
    const fb = $("#desFeed");
    if (!o) return;
    const id = o.userData.id;
    if (id === alvo || (D.estruturas[id] && D.estruturas[id].orgao === alvo)) {
      d.pontos += d.tent === 0 ? 1 : 0.5;
      realcar(alvo, 0x22ff66, 0.7); setTimeout(() => limparRealce(alvo), 900);
      fb.innerHTML = `<div class="destaque saude">✔️ Isso mesmo! ${D.estruturas[alvo].funcao}</div>`;
      d.i++; setTimeout(rodadaDesafio, 1300);
    } else {
      d.tent++;
      realcar(id, 0xff2222, 0.6); setTimeout(() => limparRealce(id), 600);
      const n = D.estruturas[id] ? D.estruturas[id].nome : id;
      fb.innerHTML = `<div class="destaque erro">✖️ Isso é: <b>${n}</b>. Tente de novo!</div>`;
    }
  }

  /* -------------------------- GLOSSÁRIO / SOBRE ------------------------- */
  function montarSaibaMais() {
    $("#aba-saiba").innerHTML = `
      <div class="cartao"><h3>📖 Glossário</h3><dl class="glossario">${D.glossario.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl></div>
      <div class="cartao"><h3>🧭 Como usar</h3><ul class="lista">
        <li><b>Girar:</b> arraste com o botão esquerdo · <b>Mover:</b> botão direito ou dois dedos · <b>Zoom:</b> roda do mouse ou pinça.</li>
        <li>Clique em qualquer estrutura para ver a ficha; use <b>Ouvir</b> para escutar a explicação.</li>
        <li>No painel esquerdo, ligue/desligue sistemas e ajuste a transparência de cada um. Use <b>Corte anatômico</b> para ver planos sagital, coronal e transversal.</li>
        <li>Importe um modelo científico <b>.glb</b> (ex.: Z-Anatomy / BodyParts3D) para comparar com o modelo didático.</li></ul></div>
      <div class="cartao"><h3>🔎 Pesquisa e referências</h3><p class="muted">Modelos e fontes usados como referência científica (inclusive em cursos de medicina), adaptados para o Ensino Fundamental e Médio:</p>
      <ul class="refs">${D.referencias.map(([t, d, u]) => `<li><b>${u ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t}</b><br><small>${d}</small></li>`).join("")}</ul>
      <p class="muted"><small>Este simulador é didático e esquemático: tamanhos e posições são aproximados para fins de ensino. Não substitui avaliação médica.</small></p></div>`;
  }

  /* ---------------------------- IMPORTAR GLB ---------------------------- */
  const importados = [];
  const grupoImp = new T.Group(); cena.add(grupoImp);
  $("#arquivoGlb").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      new T.GLTFLoader().parse(leitor.result, "", gltf => {
        const obj = gltf.scene;
        const cx = new T.Box3().setFromObject(obj); const tam = cx.getSize(new T.Vector3());
        const esc = 17.5 / Math.max(tam.y, 1e-6); obj.scale.setScalar(esc);
        const cx2 = new T.Box3().setFromObject(obj); const c = cx2.getCenter(new T.Vector3());
        obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= cx2.min.y;
        obj.position.x += 9;
        obj.traverse(m => { if (m.isMesh) { m.userData.id = "imp_" + (m.name || m.id); m.userData.nome = (m.name || "Estrutura").replace(/_/g, " "); if (m.material) { m.material = m.material.clone(); } importados.push(m); } });
        grupoImp.add(obj);
        voarPara(new T.Vector3(4.5, 9, 0), new T.Vector3(4.5, 11, 42));
        avisar(`Modelo “${f.name}” importado ao lado do modelo didático (${importados.length} partes).`);
      }, err => avisar("Não foi possível ler o arquivo: " + err.message));
    };
    leitor.readAsArrayBuffer(f);
  });
  function avisar(t) { const a = $("#aviso"); a.textContent = t; a.hidden = false; clearTimeout(a._t); a._t = setTimeout(() => a.hidden = true, 4500); }

  /* -------------------------------- ABAS -------------------------------- */
  function trocarAba(nome) {
    $$(".aba").forEach(b => b.classList.toggle("ativo", b.dataset.aba === nome));
    $$(".conteudo-aba").forEach(c => c.hidden = c.id !== "aba-" + nome);
    if (nome !== "desafio" && est.modo === "desafio") { est.modo = "explorar"; est.desafio = null; }
    if (nome === "desafio" && !est.desafio) montarDesafio();
    document.body.classList.add("painel-aberto");
  }
  $$(".aba").forEach(b => b.addEventListener("click", () => trocarAba(b.dataset.aba)));
  $("#btnPainelSis").addEventListener("click", () => document.body.classList.toggle("sis-aberto"));
  $("#btnFecharPainel").addEventListener("click", () => document.body.classList.remove("painel-aberto"));
  $("#btnReset").addEventListener("click", () => {
    aplicarPreset("tudo"); definirSexo("feminino"); est.flexao = 0; aplicarFlexao(); corpo.raiz.scale.setScalar(1); est.puberdadeAtiva = false;
    ["hipotalamo", "hipofise", "ovarios", "testiculos"].forEach(limparRealce);
    $("#corteTipo").value = "nenhum"; aplicarCorte(); verCorpoInteiro("frente"); desselecionar();
  });

  /* -------------------------------- LOOP -------------------------------- */
  const relogio = new T.Clock();
  let faseCor = 0, faseResp = 0;
  function laco() {
    requestAnimationFrame(laco);
    const dt = Math.min(relogio.getDelta(), 0.05), tempo = relogio.elapsedTime;
    if (anim) {
      anim.t += dt / anim.dur; const k = anim.t >= 1 ? 1 : 1 - Math.pow(1 - anim.t, 3);
      controles.target.lerpVectors(anim.a0, anim.a1, k); camera.position.lerpVectors(anim.p0, anim.p1, k);
      if (anim.t >= 1) anim = null;
    }
    if (est.girar) corpo.raiz.rotation.y += dt * 0.35, grupoImp.rotation.y = corpo.raiz.rotation.y;
    // coração: sístole/diástole
    faseCor += dt * est.bpm / 60;
    const f = faseCor % 1;
    const bat = f < 0.15 ? Math.sin(f / 0.15 * Math.PI) : (f > 0.25 && f < 0.37 ? 0.45 * Math.sin((f - 0.25) / 0.12 * Math.PI) : 0);
    refs.coracao.scale.setScalar(1 + 0.06 * bat);
    const vel = 1.2 * est.bpm / 72;
    moverParticulas(partA, dt, vel); moverParticulas(partV, dt, vel * 0.75);
    // respiração
    faseResp += dt * est.fr / 60;
    const r = Math.sin(faseResp * Math.PI * 2);
    const amp = $("#chkFumante") && $("#chkFumante").checked ? 0.045 : 0.075;
    refs.pulmoes.forEach(p => { const b = p.userData.escalaBase; p.scale.set(b.x * (1 + amp * r), b.y * (1 + amp * 0.6 * r), b.z * (1 + amp * r)); });
    refs.diafragma.position.y = refs.diafragma.userData.posBase.y - 0.12 * r; refs.diafragma.scale.y = 1 - 0.06 * r;
    const vf = document.getElementById("vFase"); if (vf) vf.textContent = r > 0 ? (Math.cos(faseResp * Math.PI * 2) > 0 ? "inspiração" : "expiração") : (Math.cos(faseResp * Math.PI * 2) < 0 ? "expiração" : "inspiração");
    passoDigestao(dt); passoReflexo(dt); passoRim(dt); passoPuberdade(tempo);
    if (fogo.visible) fogo.scale.set(1, 1 + 0.2 * Math.sin(tempo * 20), 1);
    halo.scale.setScalar(1 + 0.3 * Math.sin(tempo * 15));
    controles.update();
    renderer.render(cena, camera);
    atualizarRotulos();
  }

  /* ------------------------------ INICIAR ------------------------------- */
  montarSimulacoes(); montarBNCC(); montarQuiz(); montarDesafio(); montarSaibaMais();
  aplicarPreset("tudo"); definirSexo("feminino"); aplicarCorte();
  mostrarBoasVindas();
  function mostrarBoasVindas() {
    painelInfo.innerHTML = `<div class="cartao inicio"><h2>Por onde você quer começar?</h2>
      <p>Escolha um dos ${Object.keys(D.sistemas).length} sistemas para vê-lo sozinho no modelo, ou clique direto em um órgão para abrir a ficha dele.</p>
      <div class="grade-sis">${Object.entries(D.sistemas).map(([k, s]) => `<button class="sis-btn" data-sis="${k}"><i style="background:${s.cor}"></i><span>${s.nome}</span></button>`).join("")}</div></div>
      <div class="cartao pequeno"><h4>O que mais dá para fazer</h4><ul class="lista">
        <li>Em <b>Simular</b>, veja o coração bater, a respiração, a digestão e o arco reflexo.</li>
        <li>Em <b>BNCC</b>, escolha uma habilidade e vá direto ao recurso.</li>
        <li>Em <b>Quiz</b> e <b>Desafio</b>, teste o que você aprendeu.</li></ul></div>`;
    painelInfo.querySelectorAll("[data-sis]").forEach(b => b.onclick = () => {
      const id = b.dataset.sis;
      Object.keys(D.sistemas).forEach(x => est.visivel[x] = x === id || (id !== "tegumentar" && x === "tegumentar"));
      est.opac[id] = 1; if (id !== "tegumentar") est.opac.tegumentar = 0.08;
      aplicarTudo(); mostrarSistema(id);
    });
  }
  window.APP = { aplicarPreset, selecionar, garantirVisivel, trocarAba, voarPara, est, falar, info: (id, daLupa) => mostrarInfo(id, null, daLupa) };
  if (window.LUPA) { LUPA.iniciar({ pecas, info: (id, daLupa) => mostrarInfo(id, null, daLupa) }); $("#btnLupa").onclick = () => LUPA.abrir("olho"); }
  redimensionar();
  laco();
  setTimeout(() => $("#carregando").classList.add("some"), 300);
})();
