/* =========================================================================
   DROGAS PSICOATIVAS E ATIVIDADE CEREBRAL (EM13CNT207)
   Modelo didático de uma sinapse química: mostra onde cada tipo de droga
   interfere na neurotransmissão e o que isso causa na atividade do cérebro.
   É uma simplificação para o ensino, não um modelo farmacológico.
   ========================================================================= */
window.DROGAS = (function () {
  const MODOS = {
    nenhuma: {
      rotulo: "Sem droga", exemplos: "",
      acao: "Sinapse funcionando normalmente",
      txt: "O impulso chega ao fim do axônio e libera <b>neurotransmissores</b> na fenda sináptica. Eles se encaixam nos <b>receptores</b> do neurônio seguinte (modelo “chave-fechadura”), que dispara um novo impulso. Depois são <b>recaptados</b> e a sinapse volta ao repouso.",
      atividade: "normal", reacao: "≈ 180 ms", bpm: 72, percepcao: "normal", cor: 0x7fd4ff
    },
    depressora: {
      rotulo: "Depressoras", exemplos: "álcool, calmantes, solventes (inalantes)",
      acao: "Reforçam o “freio” dos neurônios",
      txt: "As depressoras <b>reduzem a atividade do cérebro</b>. O álcool e os calmantes reforçam a ação do <b>GABA</b>, o neurotransmissor que inibe os neurônios: mesmo com neurotransmissor nos receptores, o neurônio seguinte dispara pouco. Resultado: reflexos lentos, sonolência, perda de coordenação, de atenção e de memória.",
      atividade: "reduzida", reacao: "≈ 410 ms (lento)", bpm: 58, percepcao: "atenção e coordenação reduzidas", cor: 0x4a78ff
    },
    estimulante: {
      rotulo: "Estimulantes", exemplos: "nicotina, cafeína, cocaína, anfetaminas",
      acao: "Deixam neurotransmissor sobrando na fenda",
      txt: "As estimulantes <b>amplificam a atividade do cérebro</b>. A cocaína e as anfetaminas <b>bloqueiam a recaptação</b> de dopamina e noradrenalina: o neurotransmissor se acumula na fenda e os receptores ficam ativados o tempo todo. A nicotina age de outro jeito: imita a acetilcolina. Resultado: agitação, ansiedade, coração acelerado, menos sono e menos fome.",
      atividade: "aumentada", reacao: "≈ 130 ms, com erros", bpm: 118, percepcao: "agitação e ansiedade", cor: 0xff6a2a
    },
    perturbadora: {
      rotulo: "Perturbadoras", exemplos: "LSD, maconha, cogumelos alucinógenos",
      acao: "Funcionam como “chaves falsas” nos receptores",
      txt: "As perturbadoras (alucinógenas) <b>alteram a qualidade da atividade do cérebro</b>. Suas moléculas têm forma <b>parecida com a de neurotransmissores</b> (o LSD lembra a serotonina) e se encaixam nos receptores sem que nenhum impulso tenha chegado. O neurônio seguinte dispara fora de hora, de modo irregular. Resultado: percepção distorcida, confusão, alucinações e delírios.",
      atividade: "desorganizada", reacao: "irregular", bpm: 96, percepcao: "distorcida (alucinações)", cor: 0xc86bff
    }
  };

  const REC_X = [0.27, 0.36, 0.45, 0.55, 0.64, 0.73];   // receptores na membrana pós-sináptica
  const TRANSP = [[0.265, 0.43], [0.735, 0.43]];        // transportadores de recaptação
  const GABA_X = [0.18, 0.82];                          // receptores inibitórios (só nas depressoras)
  const Y_SAIDA = 0.5, Y_MEMB = 0.76;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function criar() {
    const s = {
      modo: "nenhuma", cronico: false, t: 0,
      nts: [], falsas: [], recs: [], pulsoPre: -9, pulsoPos: -9, proxPre: 0.4,
      V: 0, refrat: 0, disparos: [], aoDisparar: null,
      P: { g: 1.6, gDep: 0.45, gDepTol: 1.3, perda: 0, refrat: 0, recapt: 0.9, lig: [0.18, 0.28], falsas: 7, porImpulso: 6 }
    };
    function montar() {
      s.nts = []; s.V = 0; s.disparos = [];
      // uso repetido: o neurônio se adapta e fica com menos receptores (tolerância)
      const ativos = s.cronico ? [1, 3, 4] : [0, 1, 2, 3, 4, 5];
      s.recs = ativos.map(i => ({ x: REC_X[i], com: null, ate: 0 }));
      s.falsas = s.modo === "perturbadora" ? Array.from({ length: s.P.falsas }, () => ({ x: rnd(0.25, 0.75), y: rnd(0.55, 0.72), vx: 0, vy: 0, rec: null, ate: 0 })) : [];
    }
    s.definir = (modo, cronico) => { s.modo = modo; s.cronico = !!cronico; montar(); };
    montar();

    s.passo = dt => {
      s.t += dt; const t = s.t;
      // 1. impulsos chegam pelo axônio em ritmo regular e liberam neurotransmissores
      if (t >= s.proxPre) {
        s.proxPre = t + rnd(0.5, 0.7); s.pulsoPre = t;
        for (let i = 0; i < s.P.porImpulso; i++) s.nts.push({ x: rnd(0.4, 0.6), y: Y_SAIDA, vx: rnd(-0.3, 0.3), vy: rnd(0.55, 0.95), idade: 0, rec: null, estado: "livre" });
      }
      const bloqueado = s.modo === "estimulante";
      // 2. neurotransmissores: difundem, ligam-se aos receptores e são recaptados
      for (const n of s.nts) {
        n.idade += dt;
        if (n.estado === "ligado") { if (t >= n.rec.ate) { n.rec.com = null; n.rec = null; n.vy = -0.2; n.pausa = t + 0.3; if (bloqueado) n.estado = "livre"; else { n.estado = "recapt"; n.alvo = n.x < 0.5 ? 0 : 1; } } continue; }
        if (n.estado === "recapt") {
          const [tx, ty] = TRANSP[n.alvo], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy) || 1;
          n.x += dx / d * 0.5 * dt; n.y += dy / d * 0.5 * dt; if (d < 0.03) n.fim = true; continue;
        }
        const am = Math.exp(-2.5 * dt); n.vx = (n.vx + rnd(-2.4, 2.4) * dt) * am; n.vy = (n.vy + (rnd(-2.4, 2.4) + 0.6) * dt) * am;
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0.22) { n.x = 0.22; n.vx = Math.abs(n.vx); } if (n.x > 0.78) { n.x = 0.78; n.vx = -Math.abs(n.vx); }
        if (n.y < Y_SAIDA + 0.02) { n.y = Y_SAIDA + 0.02; n.vy = Math.abs(n.vy); }
        if (n.y > Y_MEMB - 0.03) {
          n.y = Y_MEMB - 0.03; n.vy = -Math.abs(n.vy) * 0.5;
          const r = !(n.pausa > t) && s.recs.find(r => !r.com && Math.abs(r.x - n.x) < 0.04);
          if (r) { r.com = "nt"; r.ate = t + rnd(s.P.lig[0], s.P.lig[1]); n.rec = r; n.estado = "ligado"; n.x = r.x; n.y = Y_MEMB - 0.035; }
        }
        if (n.estado !== "livre") continue;
        if (!bloqueado && n.idade > s.P.recapt) { n.estado = "recapt"; n.alvo = n.x < 0.5 ? 0 : 1; }
        if (bloqueado && n.idade > 5) n.fim = true;   // sem recaptação, só se desfaz bem devagar
      }
      s.nts = s.nts.filter(n => !n.fim);
      while (s.nts.length > 60) { const i = s.nts.findIndex(n => n.estado === "livre"); if (i < 0) break; s.nts.splice(i, 1); }
      // 3. perturbadoras: moléculas parecidas com o neurotransmissor ocupam os receptores ao acaso
      for (const f of s.falsas) {
        if (f.rec) { if (t >= f.ate) { f.rec.com = null; f.rec = null; f.vy = -0.3; f.pausa = t + rnd(0.05, 1.8); } continue; }
        const am = Math.exp(-3 * dt); f.vx = (f.vx + rnd(-2.6, 2.6) * dt) * am; f.vy = (f.vy + rnd(-2.6, 3.0) * dt) * am; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < 0.22) { f.x = 0.22; f.vx = Math.abs(f.vx); } if (f.x > 0.78) { f.x = 0.78; f.vx = -Math.abs(f.vx); }
        if (f.y < Y_SAIDA + 0.03) { f.y = Y_SAIDA + 0.03; f.vy = Math.abs(f.vy); }
        if (f.y > Y_MEMB - 0.03) {
          f.y = Y_MEMB - 0.03; f.vy = -Math.abs(f.vy) * 0.5;
          const r = !(f.pausa > t) && s.recs.find(r => !r.com && Math.abs(r.x - f.x) < 0.05);
          if (r) { r.com = "falsa"; f.rec = r; s.V += rnd(0.35, 1.05);   // ativa o receptor sem que tenha chegado impulso
            f.ate = t + rnd(0.1, 1.2); f.x = r.x; f.y = Y_MEMB - 0.035; }
        }
      }
      // 4. neurônio pós-sináptico: soma os receptores ativados e dispara ao atingir o limiar
      const ativos = s.recs.reduce((a, r) => a + (r.com === "nt" ? 1 : 0), 0);
      // com o uso repetido (tolerância) a droga freia menos
      const ganho = s.modo === "depressora" ? (s.cronico ? s.P.gDepTol : s.P.gDep) : s.P.g;   // o GABA reforçado "freia" o neurônio
      s.refrat -= dt;
      if (s.refrat <= 0) s.V += ativos * ganho * dt;
      s.V -= s.V * s.P.perda * dt;
      if (s.V >= 1) { s.V = 0; s.refrat = s.P.refrat; s.pulsoPos = t; s.disparos.push(t); if (s.aoDisparar) s.aoDisparar(); }
      while (s.disparos.length && s.disparos[0] < t - 8) s.disparos.shift();
    };
    // impulsos por segundo do neurônio pós-sináptico (média dos últimos 4 s)
    s.taxa = () => s.disparos.filter(d => d > s.t - 4).length / Math.min(4, Math.max(s.t, 0.5));
    return s;
  }

  /* ------------------------------ DESENHO -------------------------------- */
  function tema() {
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    return { txt: v("--txt") || "#f1ecdf", muted: v("--muted") || "#9bb5b2", card: v("--card") || "#123438", borda: v("--borda") || "#24545a", acento: v("--acento") || "#f5b041" };
  }
  function prepararCanvas(cv) {
    const r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
    const c = cv.getContext("2d"); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h); return { c, w, h };
  }
  const COR = { celula: "#f8e3a0", borda: "#e09a1f", nt: "#d9589a", rec: "#58b4e8", transp: "#3fae8c", depress: "#4a78ff", estim: "#ff6a2a", falsa: "#b060f0", gaba: "#8a6be0" };

  function desenharSinapse(cv, s) {
    const { c, w, h } = prepararCanvas(cv); if (!w) return;
    const T = tema(), X = x => x * w, Y = y => y * h, t = s.t;
    const brilhoPre = Math.max(0, 1 - (t - s.pulsoPre) / 0.35), brilhoPos = Math.max(0, 1 - (t - s.pulsoPos) / 0.3);
    c.lineJoin = "round"; c.lineCap = "round"; c.font = "600 11px system-ui, sans-serif"; c.textBaseline = "middle";

    // neurônio pré-sináptico (axônio + botão terminal)
    c.beginPath();
    c.moveTo(X(0.42), 0); c.lineTo(X(0.42), Y(0.12));
    c.bezierCurveTo(X(0.40), Y(0.22), X(0.22), Y(0.22), X(0.22), Y(0.37));
    c.bezierCurveTo(X(0.22), Y(0.48), X(0.32), Y(0.5), X(0.5), Y(0.5));
    c.bezierCurveTo(X(0.68), Y(0.5), X(0.78), Y(0.48), X(0.78), Y(0.37));
    c.bezierCurveTo(X(0.78), Y(0.22), X(0.60), Y(0.22), X(0.58), Y(0.12)); c.lineTo(X(0.58), 0);
    c.fillStyle = COR.celula; c.fill(); c.strokeStyle = COR.borda; c.lineWidth = 2.5; c.stroke();
    if (brilhoPre > 0) { c.fillStyle = `rgba(255,255,255,${0.55 * brilhoPre})`; c.fill(); }
    // impulso descendo pelo axônio
    const k = (t - s.pulsoPre) / 0.25;
    if (k >= 0 && k < 1) { c.beginPath(); c.arc(X(0.5), Y(0.02 + 0.3 * k), 7, 0, 7); c.fillStyle = "#fff7c2"; c.shadowColor = "#ffd84a"; c.shadowBlur = 14; c.fill(); c.shadowBlur = 0; }
    // vesículas com neurotransmissor
    [[0.36, 0.33], [0.5, 0.29], [0.64, 0.34], [0.44, 0.41], [0.58, 0.42]].forEach(([vx, vy], i) => {
      c.beginPath(); c.arc(X(vx), Y(vy), 11, 0, 7); c.fillStyle = "#fbd66b"; c.fill(); c.strokeStyle = COR.borda; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = COR.nt; for (let j = 0; j < 5; j++) { const a = j * 1.3 + i; c.beginPath(); c.arc(X(vx) + Math.cos(a) * 5, Y(vy) + Math.sin(a * 1.7) * 5, 2, 0, 7); c.fill(); }
    });
    // transportadores de recaptação (bloqueados pelas estimulantes)
    TRANSP.forEach(([tx, ty], i) => {
      c.save(); c.translate(X(tx), Y(ty)); c.rotate(i ? -0.6 : 0.6);
      c.fillStyle = COR.transp; c.strokeStyle = "#1f7a60"; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(-9, -6, 7, 12, 3); c.fill(); c.stroke(); c.beginPath(); c.roundRect(2, -6, 7, 12, 3); c.fill(); c.stroke();
      if (s.modo === "estimulante") { c.fillStyle = COR.estim; c.strokeStyle = "#a83a08"; c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 0); c.lineTo(0, 9); c.lineTo(-8, 0); c.closePath(); c.fill(); c.stroke(); }
      c.restore();
    });

    // neurônio pós-sináptico
    c.beginPath(); c.moveTo(0, h); c.lineTo(0, Y(0.86));
    c.bezierCurveTo(X(0.1), Y(0.76), X(0.3), Y(0.76), X(0.5), Y(0.76)); c.bezierCurveTo(X(0.7), Y(0.76), X(0.9), Y(0.76), w, Y(0.86)); c.lineTo(w, h); c.closePath();
    c.fillStyle = s.modo === "depressora" ? "#dfe0f6" : COR.celula; c.fill(); c.strokeStyle = COR.borda; c.lineWidth = 2.5; c.stroke();
    if (brilhoPos > 0) { c.fillStyle = `rgba(255,255,255,${0.75 * brilhoPos})`; c.fill(); c.fillStyle = "#b8860b"; c.font = "700 16px system-ui"; c.fillText("⚡ impulso", X(0.5) - 34, Y(0.9)); c.font = "600 11px system-ui, sans-serif"; }
    // receptores
    const cup = (x, cor, borda) => { c.beginPath(); c.moveTo(X(x) - 9, Y(Y_MEMB) - 9); c.quadraticCurveTo(X(x), Y(Y_MEMB) + 1, X(x) + 9, Y(Y_MEMB) - 9); c.lineTo(X(x) + 9, Y(Y_MEMB) + 7); c.lineTo(X(x) - 9, Y(Y_MEMB) + 7); c.closePath(); c.fillStyle = cor; c.fill(); c.strokeStyle = borda; c.lineWidth = 1.5; c.stroke(); };
    s.recs.forEach(r => cup(r.x, r.com ? "#9fdcff" : COR.rec, "#1f6fa8"));
    if (s.modo === "depressora") GABA_X.forEach(x => { cup(x, COR.gaba, "#4b34a8"); c.fillStyle = COR.depress; c.strokeStyle = "#1c3fb0"; c.beginPath(); c.rect(X(x) - 5, Y(Y_MEMB) - 13, 10, 10); c.fill(); c.stroke(); });

    // partículas
    c.fillStyle = COR.nt; c.strokeStyle = "#8f2a62"; c.lineWidth = 1;
    s.nts.forEach(n => { c.beginPath(); c.arc(X(n.x), Y(n.y), 3.6, 0, 7); c.fill(); c.stroke(); });
    c.fillStyle = COR.falsa; c.strokeStyle = "#5a1fa0";
    s.falsas.forEach(f => { c.beginPath(); c.moveTo(X(f.x), Y(f.y) - 5); c.lineTo(X(f.x) + 5, Y(f.y)); c.lineTo(X(f.x), Y(f.y) + 5); c.lineTo(X(f.x) - 5, Y(f.y)); c.closePath(); c.fill(); c.stroke(); });

    // legendas
    c.fillStyle = "#5a3d00"; c.textAlign = "center"; c.fillText("Neurônio que envia", X(0.5), Y(0.17));
    c.fillText("Neurônio que recebe", X(0.5), Y(0.955) + (brilhoPos > 0 ? 9 : 0));
    c.fillStyle = T.muted; c.textAlign = "left"; c.fillText("Fenda", 6, Y(0.6)); c.fillText("sináptica", 6, Y(0.6) + 13);
    c.textAlign = "right"; c.fillText("Recaptação", w - 6, Y(0.37)); c.fillText("Receptores", w - 6, Y(0.68));
    if (s.modo === "depressora") { c.textAlign = "left"; c.fillStyle = COR.gaba; c.fillText("GABA", 4, Y(0.7)); }
    c.textAlign = "left";
  }

  // Traçado da atividade: cada pico é um impulso do neurônio que recebe o sinal
  function desenharAtividade(cv, s) {
    const { c, w, h } = prepararCanvas(cv); if (!w) return;
    const T = tema(), JAN = 6, t = s.t, base = h * 0.72;
    c.strokeStyle = T.borda; c.lineWidth = 1; c.beginPath(); c.moveTo(0, base); c.lineTo(w, base); c.stroke();
    c.strokeStyle = MODOS[s.modo] ? "#" + MODOS[s.modo].cor.toString(16).padStart(6, "0") : T.acento; c.lineWidth = 1.8; c.beginPath();
    const dis = s.disparos.filter(d => d > t - JAN - 0.2);
    for (let px = 0; px <= w; px += 1.5) {
      const tt = t - JAN + px / w * JAN; let y = Math.sin(tt * 9) * 1.6 + Math.sin(tt * 23.7) * 1.1;
      if (s.modo === "perturbadora") y += Math.sin(tt * 5.3) * 3.5 * Math.sin(tt * 1.7);
      for (const d of dis) { const u = tt - d; if (u > -0.03 && u < 0.16) y -= (h * 0.6) * Math.exp(-Math.pow((u - 0.03) / 0.022, 2)) - (h * 0.13) * Math.exp(-Math.pow((u - 0.09) / 0.03, 2)); }
      px === 0 ? c.moveTo(px, base + y) : c.lineTo(px, base + y);
    }
    c.stroke();
    c.fillStyle = T.muted; c.font = "600 10px system-ui, sans-serif"; c.textBaseline = "top"; c.fillText("Atividade do neurônio (impulsos ao longo do tempo)", 4, 2);
  }

  return { MODOS, criar, desenharSinapse, desenharAtividade };
})();
