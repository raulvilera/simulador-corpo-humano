/* =========================================================================
   CORPO HUMANO 3D — Laboratórios interativos 2D
   ========================================================================= */
window.SIM2D = (function () {
  const $ = s => document.querySelector(s);
  let parar = null;
  const fmt = (n, d) => n.toLocaleString("pt-BR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });

  function abrir(nome) {
    const lab = LABS[nome]; if (!lab) return;
    fechar();
    $("#modalTitulo").innerHTML = lab.titulo;
    $("#modalCorpo").innerHTML = lab.html();
    $("#modal").hidden = false;
    document.body.classList.add("modal-aberto");
    parar = lab.init() || null;
  }
  function fechar() {
    if (parar) { parar(); parar = null; }
    $("#modal").hidden = true; document.body.classList.remove("modal-aberto");
  }
  document.addEventListener("DOMContentLoaded", () => { });
  setTimeout(() => {
    $("#modalFechar").onclick = fechar;
    $("#modal").addEventListener("click", e => { if (e.target.id === "modal") fechar(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") fechar(); });
  });

  function canvasHD(cv) {
    const r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * r; cv.height = h * r; const c = cv.getContext("2d"); c.setTransform(r, 0, 0, r, 0, 0); return { c, w, h };
  }
  const corTxt = () => getComputedStyle(document.body).getPropertyValue("--txt").trim() || "#e8eefc";

  const LABS = {};

  /* =======================================================================
     VISÃO E LENTES — EF06CI08
  ======================================================================= */
  LABS.visao = {
    titulo: "👁️ Visão e correção com lentes <span class='cod'>EF06CI08</span>",
    html: () => `
      <div class="lab-grade">
        <div><canvas id="cvOlho" class="cv" style="height:300px"></canvas>
          <div class="leg"><span class="lg r"></span> raios de luz &nbsp; <span class="lg f"></span> foco &nbsp; <span class="lg rt"></span> retina</div></div>
        <div class="controles">
          <label>Condição do olho<select id="vDef"><option value="normal">Visão normal (emetropia)</option><option value="miopia">Miopia (olho alongado)</option><option value="hiper">Hipermetropia (olho curto)</option></select></label>
          <label>Tipo de lente<select id="vLente"><option value="0">Sem lente</option><option value="-1">Divergente (−)</option><option value="1">Convergente (+)</option></select></label>
          <label>Grau da lente: <b id="vGrau">0</b> di<input type="range" id="rGrau" min="0" max="4" step="0.25" value="0"></label>
          <div class="destaque" id="vMsg"></div>
          <h4>Como a pessoa enxerga</h4>
          <canvas id="cvVista" class="cv" style="height:130px"></canvas>
        </div>
      </div>
      <details><summary>Entenda</summary><p>A luz atravessa a <b>córnea</b>, a <b>pupila</b> e a <b>lente</b> (cristalino), que a fazem convergir sobre a <b>retina</b>. Lá, cones e bastonetes transformam luz em impulsos que o <b>nervo óptico</b> leva ao cérebro (lobo occipital), onde a imagem é interpretada. Na <b>miopia</b> o foco fica antes da retina (vê mal de longe) → lente <b>divergente</b>. Na <b>hipermetropia</b> o foco fica depois da retina (vê mal de perto) → lente <b>convergente</b>. No <b>astigmatismo</b> (córnea irregular) usa-se lente cilíndrica; na <b>presbiopia</b> (vista cansada, após ~40 anos) a lente perde elasticidade.</p></details>`,
    init() {
      const cv = $("#cvOlho"), cv2 = $("#cvVista");
      const desenhar = () => {
        const { c, w, h } = canvasHD(cv);
        const def = $("#vDef").value, tipo = +$("#vLente").value, grau = +$("#rGrau").value;
        $("#vGrau").textContent = (tipo * grau > 0 ? "+" : "") + fmt(tipo * grau, 2);
        const cy = h / 2, ex = w * 0.42, R = Math.min(h * 0.36, w * 0.22);
        const comp = def === "miopia" ? 1.22 : def === "hiper" ? 0.82 : 1;
        const retina = ex + R * 2 * comp - R * 0.2;
        const focoBase = ex + R * 1.8;            // foco do olho sem correção
        let foco = focoBase - tipo * grau * R * 0.12;
        c.clearRect(0, 0, w, h);
        // globo ocular
        c.save(); c.translate(ex + R * comp - R * 0.1, cy);
        c.beginPath(); c.ellipse(0, 0, R * comp, R, 0, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,255,.08)"; c.fill();
        c.lineWidth = 3; c.strokeStyle = "#cfd8e6"; c.stroke();
        c.restore();
        // retina
        c.beginPath(); c.ellipse(ex + R * comp - R * 0.1, cy, R * comp - 4, R - 4, 0, -0.9, 0.9); c.strokeStyle = "#ff5c8a"; c.lineWidth = 5; c.stroke();
        // córnea e lente (cristalino)
        c.beginPath(); c.ellipse(ex - R * 0.05, cy, R * 0.18, R * 0.62, 0, Math.PI / 2, Math.PI * 1.5); c.strokeStyle = "#8fd3ff"; c.lineWidth = 3; c.stroke();
        c.beginPath(); c.ellipse(ex + R * 0.32, cy, R * 0.16, R * 0.45, 0, 0, Math.PI * 2); c.fillStyle = "rgba(143,211,255,.35)"; c.fill();
        // íris
        c.fillStyle = "#5b8c3a"; c.fillRect(ex + R * 0.2, cy - R * 0.62, 5, R * 0.36); c.fillRect(ex + R * 0.2, cy + R * 0.26, 5, R * 0.36);
        // nervo óptico
        c.strokeStyle = "#f4d35e"; c.lineWidth = 8; c.beginPath(); c.moveTo(retina - 2, cy + 6); c.quadraticCurveTo(retina + 30, cy + 20, w - 10, cy + 40); c.stroke();
        // lente corretiva
        const lx = ex - R * 0.7;
        if (tipo !== 0 && grau > 0) {
          c.beginPath(); c.fillStyle = "rgba(200,230,255,.45)"; c.strokeStyle = "#e0f2ff"; c.lineWidth = 2;
          const hh = R * 0.85, b = 6 + grau * 3;
          if (tipo > 0) { c.moveTo(lx, cy - hh); c.quadraticCurveTo(lx + b * 2, cy, lx, cy + hh); c.quadraticCurveTo(lx - b * 2, cy, lx, cy - hh); }
          else { c.moveTo(lx - b, cy - hh); c.lineTo(lx + b, cy - hh); c.quadraticCurveTo(lx + 1, cy, lx + b, cy + hh); c.lineTo(lx - b, cy + hh); c.quadraticCurveTo(lx - 1, cy, lx - b, cy - hh); }
          c.fill(); c.stroke();
        }
        // raios paralelos (objeto distante)
        c.strokeStyle = "#ffd166"; c.lineWidth = 1.6;
        const alturas = [-0.5, -0.25, 0.25, 0.5];
        alturas.forEach(a => {
          const y0 = cy + a * R;
          c.beginPath(); c.moveTo(8, y0); c.lineTo(lx, y0);
          // após a lente corretiva, raio se inclina levemente
          const yC = tipo !== 0 && grau > 0 ? y0 + (y0 - cy) * (-tipo * grau * 0.05) : y0;
          c.lineTo(ex - R * 0.05, yC);
          // convergência até o foco
          c.lineTo(foco, cy);
          // continua além do foco até a retina
          const dx = retina - foco; const incl = (cy - yC) / (foco - (ex - R * 0.05));
          c.lineTo(retina, cy + incl * dx);
          c.stroke();
        });
        c.fillStyle = "#06d6a0"; c.beginPath(); c.arc(foco, cy, 5, 0, Math.PI * 2); c.fill();
        c.fillStyle = corTxt(); c.font = "12px system-ui";
        c.fillText("córnea", ex - R * 0.4, cy - R * 0.7); c.fillText("lente", ex + R * 0.18, cy - R * 0.5); c.fillText("retina", retina - 20, cy - R * 0.98); c.fillText("nervo óptico", w - 95, cy + 60);
        c.fillText("luz de um objeto distante →", 10, cy - R * 0.7);
        const erro = foco - retina;
        const nitido = Math.abs(erro) < R * 0.08;
        const msg = $("#vMsg");
        if (nitido) { msg.className = "destaque saude"; msg.innerHTML = "✔️ <b>Imagem nítida!</b> O foco está sobre a retina."; }
        else if (erro < 0) { msg.className = "destaque erro"; msg.innerHTML = "O foco está <b>antes</b> da retina — imagem borrada. " + (def === "miopia" ? "Experimente uma lente <b>divergente</b>." : "A lente está forte demais."); }
        else { msg.className = "destaque erro"; msg.innerHTML = "O foco está <b>depois</b> da retina — imagem borrada. " + (def === "hiper" ? "Experimente uma lente <b>convergente</b>." : "A lente está divergindo demais."); }
        // vista simulada
        const v = canvasHD(cv2); const k = v.c;
        k.clearRect(0, 0, v.w, v.h);
        k.filter = `blur(${Math.min(10, Math.abs(erro) / R * 22).toFixed(1)}px)`;
        k.fillStyle = "#87ceeb"; k.fillRect(0, 0, v.w, v.h * 0.65); k.fillStyle = "#6ab04c"; k.fillRect(0, v.h * 0.65, v.w, v.h);
        k.fillStyle = "#c0392b"; k.fillRect(v.w * 0.15, v.h * 0.35, 60, 45); k.beginPath(); k.moveTo(v.w * 0.15 - 8, v.h * 0.35); k.lineTo(v.w * 0.15 + 30, v.h * 0.12); k.lineTo(v.w * 0.15 + 68, v.h * 0.35); k.fillStyle = "#8e44ad"; k.fill();
        k.fillStyle = "#6d4c41"; k.fillRect(v.w * 0.62, v.h * 0.35, 10, 50); k.beginPath(); k.arc(v.w * 0.62 + 5, v.h * 0.3, 28, 0, 7); k.fillStyle = "#2e7d32"; k.fill();
        k.fillStyle = "#fff"; k.font = "bold 22px system-ui"; k.fillText("ÔNIBUS 42", v.w * 0.32, v.h * 0.25);
        k.filter = "none";
      };
      ["vDef", "vLente", "rGrau"].forEach(id => $("#" + id).addEventListener("input", desenhar));
      window.addEventListener("resize", desenhar);
      desenhar();
      return () => window.removeEventListener("resize", desenhar);
    }
  };

  /* =======================================================================
     VACINAÇÃO E EPIDEMIAS — EF04CI08 · EF07CI09 · EF07CI10 · EM13CNT310
  ======================================================================= */
  LABS.vacina = {
    titulo: "💉 Vacinação, imunidade de rebanho e saúde pública <span class='cod'>EF07CI10 · EM13CNT310</span>",
    html: () => `
      <div class="lab-grade">
        <div><canvas id="cvPop" class="cv" style="height:340px"></canvas>
          <div class="leg"><span class="lg s"></span> suscetível <span class="lg i"></span> infectado <span class="lg rc"></span> recuperado <span class="lg v"></span> vacinado</div>
          <canvas id="cvGraf" class="cv" style="height:110px;margin-top:8px"></canvas></div>
        <div class="controles">
          <label>Doença<select id="vDoenca"><option value="15">Sarampo (R₀ ≈ 12–18)</option><option value="6">Coqueluche/caxumba (R₀ ≈ 5–7)</option><option value="3">Covid-19 inicial (R₀ ≈ 2,5–3)</option><option value="1.6">Gripe sazonal (R₀ ≈ 1,3–1,8)</option></select></label>
          <label>Cobertura vacinal: <b id="vCob">50</b>%<input type="range" id="rCob" min="0" max="100" value="50"></label>
          <label class="chk"><input type="checkbox" id="chkHig"> Medidas de higiene/saneamento (−30% transmissão)</label>
          <div class="linha-btn"><button class="btn prim" id="btnEpi">▶ Iniciar surto</button></div>
          <div class="medidores"><div><small>Infectados agora</small><b id="mInf">0</b></div><div><small>Já adoeceram</small><b id="mTot">0</b></div><div><small>Limiar de rebanho</small><b id="mLim">—</b></div></div>
          <div class="destaque" id="msgEpi"></div>
        </div>
      </div>
      <details><summary>Como a vacina age?</summary><p>A vacina contém o agente <b>inativado</b> ou <b>atenuado</b>, partes dele (proteínas) ou instruções genéticas (mRNA). O sistema imune reconhece esses <b>antígenos</b>, produz <b>anticorpos</b> e forma <b>células de memória</b>: num contato futuro, a resposta é rápida e a doença não se desenvolve. Quando muitas pessoas estão imunes, o agente não encontra a quem infectar e até quem não pode se vacinar (bebês, imunossuprimidos) fica protegido — é a <b>imunidade coletiva (de rebanho)</b>. Graças à vacinação, a <b>varíola</b> foi erradicada (1980) e o Brasil eliminou a <b>poliomielite</b> (certificado em 1994). A queda da cobertura vacinal favorece o retorno de doenças como o sarampo. O <b>SUS</b>, pelo Programa Nacional de Imunizações (1973), oferece gratuitamente as vacinas do calendário.</p></details>`,
    init() {
      const cv = $("#cvPop"), cg = $("#cvGraf");
      let pop = [], hist = [], rodando = false, raf = 0, tick = 0;
      const N = 320;
      const limiar = () => { const r0 = +$("#vDoenca").value; $("#mLim").textContent = Math.round((1 - 1 / r0) * 100) + "%"; };
      function criar() {
        const { w, h } = canvasHD(cv); const cob = +$("#rCob").value / 100;
        pop = []; hist = [];
        for (let i = 0; i < N; i++) {
          const a = Math.random() * Math.PI * 2, v = 0.4 + Math.random() * 0.5;
          pop.push({ x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * v, vy: Math.sin(a) * v, e: Math.random() < cob ? "V" : "S", t: 0 });
        }
        const sus = pop.filter(p => p.e === "S");
        for (let k = 0; k < 3 && sus.length; k++) { const p = sus[Math.random() * sus.length | 0]; p.e = "I"; p.t = 0; }
      }
      function passo() {
        const { c, w, h } = canvasHD(cv);
        const r0 = +$("#vDoenca").value, hig = $("#chkHig").checked ? 0.7 : 1;
        const dur = 260, raio = 9;
        // prob. por contato calibrada para aproximar o R0 (contatos esperados ~ dur * taxa)
        const pInf = Math.min(0.9, r0 * hig * 0.0055);
        pop.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 3 || p.x > w - 3) p.vx *= -1; if (p.y < 3 || p.y > h - 3) p.vy *= -1;
          if (p.e === "I") { p.t++; if (p.t > dur) p.e = "R"; }
        });
        const inf = pop.filter(p => p.e === "I");
        inf.forEach(a => pop.forEach(b => { if (b.e === "S" && Math.abs(a.x - b.x) < raio && Math.abs(a.y - b.y) < raio && Math.random() < pInf) { b.e = "I"; b.t = 0; } }));
        const cores = { S: "#9aa7bd", I: "#ef476f", R: "#06d6a0", V: "#4cc9f0" };
        c.clearRect(0, 0, w, h);
        pop.forEach(p => { c.beginPath(); c.arc(p.x, p.y, p.e === "I" ? 4.5 : 3.5, 0, 7); c.fillStyle = cores[p.e]; c.fill(); if (p.e === "V") { c.strokeStyle = "#fff"; c.lineWidth = .8; c.stroke(); } });
        const nI = inf.length, nR = pop.filter(p => p.e === "R").length;
        tick++; if (tick % 3 === 0) hist.push([nI, nR]);
        $("#mInf").textContent = nI; $("#mTot").textContent = nI + nR;
        // gráfico
        const g = canvasHD(cg); g.c.clearRect(0, 0, g.w, g.h);
        g.c.strokeStyle = "rgba(150,160,180,.4)"; g.c.strokeRect(0.5, 0.5, g.w - 1, g.h - 1);
        const plot = (idx, cor) => { g.c.beginPath(); hist.forEach((v, i) => { const x = i / Math.max(hist.length - 1, 1) * g.w, y = g.h - v[idx] / N * g.h; i ? g.c.lineTo(x, y) : g.c.moveTo(x, y); }); g.c.strokeStyle = cor; g.c.lineWidth = 2; g.c.stroke(); };
        plot(0, "#ef476f"); plot(1, "#06d6a0");
        g.c.fillStyle = corTxt(); g.c.font = "11px system-ui"; g.c.fillText("infectados (vermelho) e recuperados (verde) ao longo do tempo", 6, 13);
        if (nI === 0 && rodando) {
          rodando = false;
          const tot = nR, susc = pop.filter(p => p.e !== "V").length;
          const pct = Math.round(tot / N * 100);
          $("#msgEpi").innerHTML = `<b>O surto terminou.</b> ${tot} de ${N} pessoas adoeceram (${pct}%). ${pct < 10 ? "A alta cobertura vacinal bloqueou a transmissão: imunidade de rebanho! 🛡️" : "Com mais pessoas vacinadas, o vírus teria menos caminhos para se espalhar."} Ainda ficaram ${susc - tot} pessoas não vacinadas que não adoeceram.`;
        }
        if (rodando) raf = requestAnimationFrame(passo);
      }
      const iniciar = () => { cancelAnimationFrame(raf); criar(); tick = 0; rodando = true; $("#msgEpi").textContent = "Observe a propagação..."; passo(); };
      $("#btnEpi").onclick = iniciar;
      $("#rCob").oninput = e => { $("#vCob").textContent = e.target.value; };
      $("#vDoenca").onchange = limiar;
      limiar(); criar(); rodando = false; passo();
      $("#msgEpi").innerHTML = "Escolha a doença e a cobertura vacinal e clique em <b>Iniciar surto</b>. Compare 30%, 70% e 95%.";
      return () => cancelAnimationFrame(raf);
    }
  };

  /* =======================================================================
     CARDÁPIO EQUILIBRADO E IMC — EF05CI08 · EF05CI09
  ======================================================================= */
  const ALIM = [
    ["Arroz (4 colheres)", "Cereais", 160, "in natura"], ["Feijão (1 concha)", "Leguminosas", 110, "in natura"], ["Pão francês", "Cereais", 135, "processado"],
    ["Macarrão (1 prato raso)", "Cereais", 220, "in natura"], ["Mandioca cozida", "Raízes e tubérculos", 125, "in natura"], ["Batata cozida", "Raízes e tubérculos", 90, "in natura"],
    ["Alface e tomate", "Verduras e legumes", 25, "in natura"], ["Cenoura e beterraba", "Verduras e legumes", 45, "in natura"], ["Brócolis", "Verduras e legumes", 30, "in natura"],
    ["Banana", "Frutas", 90, "in natura"], ["Laranja", "Frutas", 60, "in natura"], ["Maçã", "Frutas", 70, "in natura"],
    ["Ovo cozido", "Carnes e ovos", 75, "in natura"], ["Frango grelhado (filé)", "Carnes e ovos", 160, "in natura"], ["Peixe assado", "Carnes e ovos", 140, "in natura"],
    ["Carne bovina (bife)", "Carnes e ovos", 210, "in natura"], ["Leite (1 copo)", "Leite e derivados", 120, "in natura"], ["Queijo (1 fatia)", "Leite e derivados", 80, "processado"],
    ["Iogurte natural", "Leite e derivados", 100, "in natura"], ["Castanhas (punhado)", "Castanhas e nozes", 170, "in natura"],
    ["Refrigerante (lata)", "Ultraprocessados", 140, "ultraprocessado"], ["Salgadinho (pacote)", "Ultraprocessados", 250, "ultraprocessado"], ["Biscoito recheado (5 un.)", "Ultraprocessados", 240, "ultraprocessado"],
    ["Salsicha (2 un.)", "Ultraprocessados", 230, "ultraprocessado"], ["Macarrão instantâneo", "Ultraprocessados", 380, "ultraprocessado"], ["Chocolate (barra)", "Ultraprocessados", 270, "ultraprocessado"]
  ];
  LABS.cardapio = {
    titulo: "🥗 Monte um cardápio equilibrado e calcule o IMC <span class='cod'>EF05CI08 · EF05CI09</span>",
    html: () => `
      <div class="lab-grade">
        <div>
          <div class="controles linha3">
            <label>Idade<select id="cIdade"><option value="9">6–10 anos</option><option value="13" selected>11–14 anos</option><option value="16">15–18 anos</option><option value="25">Adulto</option></select></label>
            <label>Sexo<select id="cSexo"><option value="f">Feminino</option><option value="m">Masculino</option></select></label>
            <label>Atividade física<select id="cAtiv"><option value="0.85">Pouca</option><option value="1" selected>Moderada</option><option value="1.2">Intensa</option></select></label>
          </div>
          <h4>Alimentos (clique para adicionar ao dia)</h4>
          <div class="alimentos" id="listaAlim">${ALIM.map((a, i) => `<button class="alim ${a[3] === "ultraprocessado" ? "ultra" : ""}" data-a="${i}"><b>${a[0]}</b><small>${a[1]} · ${a[2]} kcal</small></button>`).join("")}</div>
        </div>
        <div class="controles">
          <h4>Meu dia alimentar</h4><div id="prato" class="prato"><span class="muted">Nenhum alimento ainda.</span></div>
          <div class="medidores"><div><small>Total</small><b id="cTot">0 kcal</b></div><div><small>Necessidade estimada</small><b id="cNec">—</b></div></div>
          <div class="barra grande"><span id="cBarra"></span></div>
          <div id="cGrupos" class="grupos"></div>
          <div class="destaque" id="cMsg">Adicione alimentos para analisar.</div>
          <button class="btn" id="cLimpar">Limpar</button>
          <hr><h4>Calculadora de IMC</h4>
          <div class="linha3"><label>Peso (kg)<input type="number" id="iPeso" value="45" min="10" max="250"></label><label>Altura (cm)<input type="number" id="iAlt" value="155" min="80" max="230"></label><button class="btn prim" id="iCalc">Calcular</button></div>
          <div class="destaque" id="iRes"></div>
        </div>
      </div>
      <details><summary>Guia Alimentar para a População Brasileira</summary><p>Faça de alimentos <b>in natura</b> ou minimamente processados a base da alimentação; use óleos, sal e açúcar em pequenas quantidades; limite alimentos <b>processados</b> e <b>evite os ultraprocessados</b> (ricos em açúcar, gordura, sal e aditivos). Coma com regularidade, com atenção e em companhia. A <b>obesidade</b> e a <b>subnutrição</b> estão ligadas aos hábitos alimentares, à prática de atividade física e às condições sociais e econômicas.</p></details>`,
    init() {
      const dia = [];
      const nec = () => {
        const i = +$("#cIdade").value, s = $("#cSexo").value, a = +$("#cAtiv").value;
        const base = i <= 10 ? 1700 : i <= 14 ? (s === "m" ? 2300 : 2050) : i <= 18 ? (s === "m" ? 2700 : 2150) : (s === "m" ? 2500 : 2000);
        return Math.round(base * a / 50) * 50;
      };
      const GRUPOS = ["Cereais", "Leguminosas", "Raízes e tubérculos", "Verduras e legumes", "Frutas", "Carnes e ovos", "Leite e derivados", "Castanhas e nozes", "Ultraprocessados"];
      function atualizar() {
        const n = nec(); const tot = dia.reduce((s, i) => s + ALIM[i][2], 0);
        $("#cNec").textContent = fmt(n) + " kcal"; $("#cTot").textContent = fmt(tot) + " kcal";
        const pct = tot / n * 100; const b = $("#cBarra"); b.style.width = Math.min(100, pct) + "%"; b.style.background = pct > 115 ? "#ef476f" : pct < 70 ? "#ffd166" : "#06d6a0";
        $("#prato").innerHTML = dia.length ? dia.map((i, k) => `<span class="tag ${ALIM[i][3] === "ultraprocessado" ? "ultra" : ""}" data-k="${k}">${ALIM[i][0]} ✕</span>`).join("") : '<span class="muted">Nenhum alimento ainda.</span>';
        $("#prato").querySelectorAll("[data-k]").forEach(t => t.onclick = () => { dia.splice(+t.dataset.k, 1); atualizar(); });
        const cont = {}; dia.forEach(i => cont[ALIM[i][1]] = (cont[ALIM[i][1]] || 0) + 1);
        $("#cGrupos").innerHTML = GRUPOS.map(g => `<span class="${cont[g] ? "ok" : ""} ${g === "Ultraprocessados" && cont[g] ? "mau" : ""}">${g}${cont[g] ? " ×" + cont[g] : ""}</span>`).join("");
        if (!dia.length) return;
        const falta = ["Cereais", "Leguminosas", "Verduras e legumes", "Frutas"].filter(g => !cont[g]);
        const ultra = cont.Ultraprocessados || 0;
        let m = [];
        if (pct > 115) m.push("⚠️ Calorias acima da necessidade: o excesso frequente contribui para o <b>sobrepeso e a obesidade</b>.");
        else if (pct < 70) m.push("⚠️ Calorias abaixo da necessidade: faltam energia e nutrientes para o crescimento (risco de <b>subnutrição</b>).");
        else m.push("✔️ A quantidade de energia está adequada.");
        if (falta.length) m.push("Faltam grupos importantes: <b>" + falta.join(", ") + "</b>.");
        if (ultra) m.push(`Há ${ultra} ultraprocessado(s): ricos em açúcar, sal, gorduras e aditivos — evite-os.`);
        if (!falta.length && !ultra && pct >= 70 && pct <= 115) m.push("🏆 Cardápio equilibrado e variado!");
        const box = $("#cMsg"); box.innerHTML = m.join("<br>"); box.className = "destaque " + (!falta.length && !ultra && pct >= 70 && pct <= 115 ? "saude" : "");
      }
      $("#listaAlim").onclick = e => { const b = e.target.closest("[data-a]"); if (b) { dia.push(+b.dataset.a); atualizar(); } };
      ["cIdade", "cSexo", "cAtiv"].forEach(id => $("#" + id).onchange = atualizar);
      $("#cLimpar").onclick = () => { dia.length = 0; atualizar(); };
      $("#iCalc").onclick = () => {
        const p = +$("#iPeso").value, a = +$("#iAlt").value / 100; if (!p || !a) return;
        const imc = p / (a * a);
        const idade = +$("#cIdade").value;
        let cl = imc < 18.5 ? "abaixo do peso" : imc < 25 ? "peso adequado (eutrofia)" : imc < 30 ? "sobrepeso" : "obesidade";
        $("#iRes").innerHTML = `IMC = ${fmt(p)} ÷ (${fmt(a, 2)} × ${fmt(a, 2)}) = <b>${fmt(imc, 1)} kg/m²</b><br>` +
          (idade < 19 ? "Para crianças e adolescentes, o IMC deve ser interpretado nas <b>curvas de crescimento da OMS (IMC por idade)</b>, usadas na Caderneta de Saúde do Adolescente. A classificação de adultos não se aplica diretamente." : `Classificação para adultos (OMS): <b>${cl}</b>.`) +
          "<br><small>O IMC é um indicador simples: não diferencia músculo de gordura. Procure a Unidade Básica de Saúde para uma avaliação completa.</small>";
      };
      atualizar();
    }
  };

  /* =======================================================================
     NÍVEIS DE ORGANIZAÇÃO E CÉLULA — EF06CI05 · EF06CI06 · EM13CNT202
  ======================================================================= */
  const NIVEIS = [
    { n: "Célula", t: "Unidade estrutural e funcional dos seres vivos. A célula humana é <b>eucariótica</b>: tem membrana plasmática, citoplasma com organelas e núcleo com o DNA.", svg: () => `
      <svg viewBox="0 0 320 220" class="svg"><ellipse cx="160" cy="110" rx="140" ry="95" fill="#ffd6e0" stroke="#e56b8c" stroke-width="4"/>
      <circle cx="165" cy="105" r="38" fill="#b39ddb" stroke="#6a4c93" stroke-width="3"/><circle cx="172" cy="98" r="10" fill="#6a4c93"/>
      <ellipse cx="80" cy="80" rx="24" ry="11" fill="#f4a261" stroke="#b5651d" stroke-width="2" transform="rotate(-20 80 80)"/><path d="M62 82 q6 -8 12 0 t12 0 t12 0" stroke="#b5651d" fill="none"/>
      <ellipse cx="240" cy="150" rx="22" ry="10" fill="#f4a261" stroke="#b5651d" stroke-width="2" transform="rotate(25 240 150)"/>
      <path d="M90 150 q20 -12 40 0 t40 0" stroke="#2a9d8f" stroke-width="5" fill="none"/><path d="M95 165 q20 -12 40 0 t40 0" stroke="#2a9d8f" stroke-width="5" fill="none"/>
      <circle cx="235" cy="70" r="9" fill="#90be6d"/><circle cx="110" cy="120" r="5" fill="#577590"/><circle cx="125" cy="130" r="4" fill="#577590"/>
      <g font-size="12" fill="currentColor"><text x="185" y="62">núcleo (DNA)</text><text x="20" y="55">mitocôndria</text><text x="70" y="195">retículo endoplasmático</text><text x="248" y="62">lisossomo</text><text x="235" y="200">membrana</text><text x="200" y="135">citoplasma</text></g></svg>`,
      extra: "<b>Tipos de células humanas:</b> neurônio (impulsos nervosos), hemácia (sem núcleo, transporta O₂), fibra muscular (contração), célula epitelial (revestimento), gametas (reprodução), leucócitos (defesa). Temos cerca de <b>30 trilhões</b> de células." },
    { n: "Tecido", t: "Conjunto de células semelhantes que realizam a mesma função. Os 4 tecidos básicos: <b>epitelial</b> (revestimento e glândulas), <b>conjuntivo</b> (sustentação: ósseo, cartilaginoso, adiposo, sangue), <b>muscular</b> (contração) e <b>nervoso</b> (impulsos).", svg: () => {
      let s = '<svg viewBox="0 0 320 220" class="svg">'; for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) s += `<rect x="${12 + c * 42}" y="${20 + r * 46}" width="38" height="42" rx="6" fill="#f7c59f" stroke="#c97b4a" stroke-width="2"/><circle cx="${31 + c * 42}" cy="${41 + r * 46}" r="7" fill="#8e6cb8"/>`;
      return s + '<text x="12" y="214" font-size="12" fill="currentColor">tecido epitelial (células unidas)</text></svg>'; }, extra: "O sangue é considerado um tecido conjuntivo líquido." },
    { n: "Órgão", t: "Estrutura formada por diferentes tecidos que trabalham juntos. Exemplo: o <b>estômago</b> tem tecido epitelial (mucosa e glândulas), muscular liso (mistura o alimento), conjuntivo e nervoso.", svg: () => `
      <svg viewBox="0 0 320 220" class="svg"><path d="M120 30 C 110 60 120 70 150 75 C 250 80 270 140 230 175 C 190 205 120 200 105 165 C 95 140 120 130 140 135" fill="#e5897f" stroke="#a84a3f" stroke-width="5"/><path d="M120 30 L 112 5" stroke="#e8877a" stroke-width="18"/><path d="M140 135 C 120 150 100 160 80 160" stroke="#f0a58f" stroke-width="14" fill="none"/>
      <g font-size="12" fill="currentColor"><text x="130" y="15">esôfago</text><text x="200" y="110">estômago</text><text x="20" y="180">duodeno</text></g></svg>`, extra: "" },
    { n: "Sistema", t: "Conjunto de órgãos que atuam de forma integrada numa função. Ex.: o <b>sistema digestório</b> (boca, esôfago, estômago, intestinos, fígado, pâncreas).", svg: null, extra: "<button class='btn prim' id='verSis'>Ver o sistema digestório no 3D ▸</button>" },
    { n: "Organismo", t: "Todos os sistemas funcionando de forma <b>integrada</b>: o digestório fornece nutrientes, o respiratório oxigênio, o circulatório transporta tudo, o urinário elimina resíduos, e os sistemas nervoso e endócrino coordenam — mantendo a <b>homeostase</b>.", svg: null, extra: "<button class='btn prim' id='verOrg'>Ver o corpo completo no 3D ▸</button>" }
  ];
  LABS.niveis = {
    titulo: "🔬 Níveis de organização do corpo humano <span class='cod'>EF06CI05 · EF06CI06 · EM13CNT202</span>",
    html: () => `<div class="degraus">${NIVEIS.map((n, i) => `<button class="degrau ${i === 0 ? "ativo" : ""}" data-n="${i}"><b>${i + 1}</b>${n.n}</button>${i < NIVEIS.length - 1 ? "<span>→</span>" : ""}`).join("")}</div><div id="nivelConteudo" class="nivel"></div>`,
    init() {
      const mostrar = i => {
        const n = NIVEIS[i];
        document.querySelectorAll(".degrau").forEach((b, k) => b.classList.toggle("ativo", k === i));
        $("#nivelConteudo").innerHTML = `<div class="lab-grade"><div>${n.svg ? n.svg() : `<div class="grande-emoji">${i === 3 ? "🫃" : "🧍"}</div>`}</div><div><h3>${n.n}</h3><p>${n.t}</p><p>${n.extra}</p></div></div>`;
        const vs = $("#verSis"); if (vs) vs.onclick = () => { fechar(); APP.aplicarPreset("nutricao"); APP.selecionar("estomago", true); };
        const vo = $("#verOrg"); if (vo) vo.onclick = () => { fechar(); APP.aplicarPreset("tudo"); };
      };
      document.querySelectorAll(".degrau").forEach(b => b.onclick = () => mostrar(+b.dataset.n));
      mostrar(0);
    }
  };

  /* =======================================================================
     CONTRACEPÇÃO, ISTs E SEXUALIDADE — EF08CI09 · EF08CI10 · EF08CI11
  ======================================================================= */
  const METODOS = [
    ["Preservativo externo (camisinha)", "Barreira", "Impede o contato dos espermatozoides com o corpo da parceria.", 87, 98, true],
    ["Preservativo interno", "Barreira", "Bolsa colocada no canal vaginal.", 79, 95, true],
    ["Pílula anticoncepcional", "Hormonal", "Hormônios impedem a ovulação. Uso diário com orientação médica.", 93, 99.7, false],
    ["Injetável (mensal/trimestral)", "Hormonal", "Hormônios aplicados por injeção impedem a ovulação.", 96, 99.8, false],
    ["Implante subdérmico", "Hormonal", "Bastão sob a pele do braço libera hormônio por até 3 anos.", 99.9, 99.9, false],
    ["DIU de cobre", "Dispositivo", "Colocado no útero; o cobre prejudica espermatozoides. Oferecido pelo SUS.", 99.2, 99.4, false],
    ["DIU hormonal", "Dispositivo", "Libera hormônio no útero.", 99.8, 99.8, false],
    ["Diafragma", "Barreira", "Cobre o colo do útero.", 83, 94, false],
    ["Tabelinha / percepção da fertilidade", "Comportamental", "Evita relações no período fértil; ciclos irregulares tornam o método pouco seguro.", 77, 95, false],
    ["Coito interrompido", "Comportamental", "Muito falho: há espermatozoides no líquido pré-ejaculatório.", 78, 96, false],
    ["Laqueadura", "Cirúrgico", "Interrupção das tubas uterinas. Definitivo.", 99.5, 99.5, false],
    ["Vasectomia", "Cirúrgico", "Interrupção dos ductos deferentes. Definitivo.", 99.85, 99.9, false]
  ];
  const ISTS = [
    ["HIV / AIDS", "Vírus (HIV)", "Pode não ter sintomas por anos; depois, infecções oportunistas por queda dos linfócitos T CD4.", "Relação sexual sem preservativo, sangue (seringas), gestação/parto/amamentação.", "Preservativo, PrEP e PEP (SUS), testagem. Tratamento antirretroviral gratuito: com carga viral indetectável, o vírus não é transmitido (I = I)."],
    ["Sífilis", "Bactéria (Treponema pallidum)", "Ferida indolor (cancro), manchas na pele; pode atingir coração e nervos.", "Sexual e da gestante para o bebê (sífilis congênita).", "Preservativo, teste rápido. Tratamento com penicilina."],
    ["HPV", "Vírus (papilomavírus)", "Verrugas genitais; alguns tipos causam câncer de colo do útero, ânus, pênis e garganta.", "Contato sexual (pele com pele).", "Vacina gratuita no SUS (9 a 14 anos), preservativo, exame preventivo."],
    ["Gonorreia e clamídia", "Bactérias", "Corrimento, ardor ao urinar; muitas vezes sem sintomas. Pode causar infertilidade.", "Relação sexual sem preservativo.", "Preservativo. Tratamento com antibióticos para a pessoa e as parcerias."],
    ["Herpes genital", "Vírus (HSV)", "Bolhas e feridas dolorosas que reaparecem.", "Contato com lesões.", "Preservativo; antivirais controlam as crises (não há cura)."],
    ["Hepatite B", "Vírus (HBV)", "Pode causar cirrose e câncer de fígado.", "Sexual, sangue, gestação.", "Vacina gratuita no SUS (3 doses) e preservativo."]
  ];
  LABS.contraceptivos = {
    titulo: "🛡️ Métodos contraceptivos, ISTs e sexualidade <span class='cod'>EF08CI09 · EF08CI10 · EF08CI11</span>",
    html: () => `
      <div class="subabas"><button class="chip ativo" data-sub="m">Métodos contraceptivos</button><button class="chip" data-sub="i">ISTs</button><button class="chip" data-sub="s">Dimensões da sexualidade</button></div>
      <div data-painel="m">
        <p class="muted">Eficácia = % de pessoas que <b>não</b> engravidam em 1 ano de uso. <b>Uso típico</b> (como as pessoas realmente usam) × <b>uso perfeito</b>. Fonte: Trussell/OMS (valores aproximados).</p>
        <div class="metodos">${METODOS.map(m => `<div class="metodo"><div class="m-top"><b>${m[0]}</b><span class="tipo">${m[1]}</span>${m[5] ? '<span class="ist">protege contra ISTs</span>' : ""}</div><small>${m[2]}</small>
          <div class="barra2"><span style="width:${m[3]}%"></span><em style="left:${m[4]}%"></em></div><small>Uso típico: <b>${fmt(m[3], m[3] % 1 ? 1 : 0)}%</b> · perfeito: ${fmt(m[4], m[4] % 1 ? 1 : 0)}%</small></div>`).join("")}</div>
        <div class="destaque saude"><b>Responsabilidade compartilhada:</b> a escolha do método deve ser conversada pelas pessoas envolvidas, com orientação de profissionais da Unidade Básica de Saúde. <b>Somente os preservativos protegem contra ISTs</b> — por isso recomenda-se a <b>dupla proteção</b> (preservativo + outro método).</div>
      </div>
      <div data-painel="i" hidden><div class="tabela-wrap"><table class="tabela"><thead><tr><th>IST</th><th>Agente</th><th>Sintomas</th><th>Transmissão</th><th>Prevenção e tratamento</th></tr></thead><tbody>${ISTS.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <div class="destaque">Testes rápidos de HIV, sífilis e hepatites B e C são <b>gratuitos e sigilosos</b> no SUS. Ter uma IST não é motivo de vergonha: procure atendimento.</div></div>
      <div data-painel="s" hidden><div class="grade-lab">
        <div class="cartao"><h4>🧬 Biológica</h4><p>Corpo, hormônios, reprodução, puberdade e saúde sexual.</p></div>
        <div class="cartao"><h4>🌎 Sociocultural</h4><p>Valores, normas e papéis de gênero variam entre culturas e épocas; mídia e redes sociais influenciam padrões.</p></div>
        <div class="cartao"><h4>💛 Afetiva</h4><p>Sentimentos, autoestima, amizade, amor, vínculos e respeito ao tempo de cada um.</p></div>
        <div class="cartao"><h4>⚖️ Ética</h4><p>Consentimento, respeito à diversidade, igualdade, combate à violência e ao preconceito. Toda forma de abuso deve ser denunciada (Disque 100).</p></div>
      </div></div>`,
    init() {
      document.querySelectorAll("[data-sub]").forEach(b => b.onclick = () => {
        document.querySelectorAll("[data-sub]").forEach(x => x.classList.toggle("ativo", x === b));
        document.querySelectorAll("[data-painel]").forEach(p => p.hidden = p.dataset.painel !== b.dataset.sub);
      });
    }
  };

  /* =======================================================================
     GAMETAS E HEREDITARIEDADE — EF09CI08
  ======================================================================= */
  LABS.heranca = {
    titulo: "🧬 Gametas e transmissão das características hereditárias <span class='cod'>EF09CI08</span>",
    html: () => `
      <div class="lab-grade">
        <div class="controles">
          <label>Característica<select id="hCar"><option value="alb">Albinismo (A = pigmentação normal, a = albinismo)</option><option value="lob">Lobo da orelha (L = solto, l = preso)</option></select></label>
          <div class="linha3"><label>Genótipo do pai<select id="hPai"><option>AA</option><option selected>Aa</option><option>aa</option></select></label>
          <label>Genótipo da mãe<select id="hMae"><option>AA</option><option selected>Aa</option><option>aa</option></select></label></div>
          <div class="destaque"><b>Meiose:</b> células do corpo têm <b>46 cromossomos</b> (2n). Os gametas têm <b>23</b> (n) — só <b>um</b> alelo de cada gene. Na fecundação, o zigoto volta a ter 46: metade de cada genitor.</div>
          <button class="btn prim" id="hSort">🎲 Sortear um(a) filho(a)</button>
          <div id="hFilho" class="destaque"></div>
        </div>
        <div><h4>Quadro de Punnett</h4><div id="hQuadro"></div><div id="hProb"></div></div>
      </div>`,
    init() {
      const nomes = { alb: { D: "pigmentação normal", r: "albinismo", L: "A", l: "a" }, lob: { D: "lobo solto", r: "lobo preso", L: "L", l: "l" } };
      const desenhar = () => {
        const car = nomes[$("#hCar").value];
        const conv = g => g.replace(/A/g, car.L).replace(/a/g, car.l);
        ["hPai", "hMae"].forEach(id => Array.from($("#" + id).options).forEach((o, i) => o.textContent = conv(["AA", "Aa", "aa"][i])));
        const p = ["AA", "Aa", "aa"][$("#hPai").selectedIndex], m = ["AA", "Aa", "aa"][$("#hMae").selectedIndex];
        const gp = p.split(""), gm = m.split("");
        const cel = (a, b) => { const g = [a, b].sort().join(""); return g; };
        let h = `<table class="punnett"><tr><th>♀ \\ ♂</th>${gp.map(x => `<th class="gam">${conv(x)}</th>`).join("")}</tr>`;
        const cont = {};
        gm.forEach(y => { h += `<tr><th class="gam">${conv(y)}</th>`; gp.forEach(x => { const g = cel(x, y); cont[g] = (cont[g] || 0) + 1; h += `<td class="${g === "aa" ? "rec" : ""}">${conv(g)}</td>`; }); h += "</tr>"; });
        $("#hQuadro").innerHTML = h + "</table>";
        const rec = (cont.aa || 0) / 4 * 100;
        $("#hProb").innerHTML = `<div class="medidores"><div><small>${car.D}</small><b>${100 - rec}%</b></div><div><small>${car.r}</small><b>${rec}%</b></div></div><p class="muted">Genótipos: ${Object.entries(cont).map(([g, n]) => `${conv(g)} = ${n * 25}%`).join(" · ")}</p>`;
        return { gp, gm, conv, car };
      };
      ["hCar", "hPai", "hMae"].forEach(id => $("#" + id).onchange = desenhar);
      $("#hSort").onclick = () => {
        const { gp, gm, conv, car } = desenhar();
        const a = gp[Math.random() * 2 | 0], b = gm[Math.random() * 2 | 0]; const g = [a, b].sort().join("");
        $("#hFilho").innerHTML = `Espermatozoide levou <b>${conv(a)}</b> + ovócito levou <b>${conv(b)}</b> → zigoto <b>${conv(g)}</b>: ${g === "aa" ? car.r : car.D}.`;
      };
      desenhar();
    }
  };

  return { abrir, fechar };
})();
