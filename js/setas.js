/* =========================================================================
   SETAS — rótulos com setas no estilo de atlas anatômico.
   Os nomes ficam em colunas nas margens esquerda e direita da área 3D e uma
   seta liga cada nome à superfície da estrutura, sem cobrir o modelo.
   ========================================================================= */
window.SETAS = (function () {
  const NS = "http://www.w3.org/2000/svg";
  let contador = 0;

  // Amostra até `max` pontos da superfície (coordenadas locais de cada malha).
  function amostrar(malhas, max) {
    const total = malhas.reduce((s, m) => s + (m.geometry && m.geometry.attributes.position ? m.geometry.attributes.position.count : 0), 0);
    if (!total) return [];
    const passo = Math.max(1, Math.floor(total / (max || 220)));
    const pts = [];
    malhas.forEach(m => {
      const p = m.geometry && m.geometry.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i += passo) pts.push({ m, i, x: p.getX(i), y: p.getY(i), z: p.getZ(i) });
    });
    return pts;
  }

  // Ponto da estrutura mais próximo da câmera (fica na face visível), opcionalmente
  // aceitando só pontos que passem no filtro (ex.: lado não cortado).
  function ancora(pts, camera, T, aceitar, malhaOk) {
    const v = new T.Vector3(), cam = camera.position;
    let melhor = null, dmin = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (malhaOk ? !malhaOk(p.m) : !p.m.visible) continue;
      v.set(p.x, p.y, p.z);
      if (p.m.isSkinnedMesh && p.m.skeleton) p.m.boneTransform(p.i, v);   // corpo em movimento
      v.applyMatrix4(p.m.matrixWorld);
      if (aceitar && !aceitar(v)) continue;
      const d = v.distanceToSquared(cam);
      if (d < dmin) { dmin = d; melhor = melhor || new T.Vector3(); melhor.copy(v); }
    }
    return melhor;
  }

  function criar(camada) {
    const idMarc = "setaPonta" + (++contador);
    camada.classList.add("camada-setas");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "setas-svg");
    svg.innerHTML = `<defs><marker id="${idMarc}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="seta-ponta"/></marker></defs>`;
    camada.appendChild(svg);
    const itens = {};

    function adicionar(id, nome, aoClicar) {
      const el = document.createElement("button");
      el.className = "seta-rotulo"; el.type = "button"; el.textContent = nome; el.title = nome;
      el.style.display = "none";
      if (aoClicar) el.onclick = aoClicar;
      camada.appendChild(el);
      const linha = document.createElementNS(NS, "path");
      linha.setAttribute("class", "seta-linha"); linha.setAttribute("marker-end", `url(#${idMarc})`);
      linha.style.display = "none";
      svg.appendChild(linha);
      itens[id] = { id, el, linha, w: 0, h: 0 };
    }

    function limpar() {
      Object.values(itens).forEach(it => { it.el.remove(); it.linha.remove(); });
      Object.keys(itens).forEach(k => delete itens[k]);
    }

    function marcar(id) { Object.values(itens).forEach(it => it.el.classList.toggle("ativo", it.id === id)); }

    // pontos: [{ id, x, y }] em pixels dentro da camada (apenas os visíveis)
    function atualizar(pontos, w, h) {
      const M = 8, TOPO = 8, BASE = 8, GAP = 4;
      const usados = new Set(pontos.map(p => p.id));
      Object.values(itens).forEach(it => { if (!usados.has(it.id)) { it.el.style.display = "none"; it.linha.style.display = "none"; } });
      const lados = { e: [], d: [] };
      pontos.forEach(p => {
        const it = itens[p.id]; if (!it) return;
        if (it.el.style.display === "none") { it.el.style.display = ""; it.linha.style.display = ""; }
        if (!it.w) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
        (p.x < w / 2 ? lados.e : lados.d).push({ p, it });
      });
      // equilibra as colunas: move para o outro lado os pontos mais próximos do centro
      const porCentro = (a, b) => Math.abs(a.p.x - w / 2) - Math.abs(b.p.x - w / 2);
      while (Math.abs(lados.e.length - lados.d.length) > 2) {
        const [maior, menor] = lados.e.length > lados.d.length ? [lados.e, lados.d] : [lados.d, lados.e];
        maior.sort(porCentro); menor.push(maior.shift());
      }
      ["e", "d"].forEach(lado => {
        const col = lados[lado].sort((a, b) => a.p.y - b.p.y);
        if (!col.length) return;
        const alturaTotal = col.reduce((s, c) => s + c.it.h, 0);
        const gap = Math.max(0, Math.min(GAP, (h - TOPO - BASE - alturaTotal) / Math.max(1, col.length - 1)));
        // desce: cada rótulo o mais perto possível da altura da sua estrutura, sem sobrepor
        let y = TOPO;
        col.forEach(c => { c.y = Math.max(y, c.p.y - c.it.h / 2); y = c.y + c.it.h + gap; });
        // sobe: se passou do fundo, empurra para cima
        let lim = h - BASE;
        for (let i = col.length - 1; i >= 0; i--) { const c = col[i]; c.y = Math.min(c.y, lim - c.it.h); lim = c.y - gap; }
        if (col[0].y < TOPO) { let yy = TOPO; col.forEach(c => { c.y = yy; yy += c.it.h + gap; }); }
        col.forEach(c => {
          const { it, p } = c;
          const x = lado === "e" ? M : w - M - it.w;
          it.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(c.y)}px)`;
          const yMeio = c.y + it.h / 2;
          const x0 = lado === "e" ? x + it.w : x;                 // borda do rótulo
          const x1 = lado === "e" ? x0 + 10 : x0 - 10;            // pequeno trecho horizontal
          it.linha.setAttribute("d", `M${x0.toFixed(1)},${yMeio.toFixed(1)} L${x1.toFixed(1)},${yMeio.toFixed(1)} L${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        });
      });
    }

    return { adicionar, atualizar, limpar, marcar, itens };
  }

  return { criar, amostrar, ancora };
})();
