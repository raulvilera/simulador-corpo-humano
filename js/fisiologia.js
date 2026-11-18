/* =========================================================================
   FISIOLOGIA EM AÇÃO (modelo 3D)
   1. Sistema nervoso em ação: o caminho do impulso nervoso em ações do dia a dia
      (sensitivo → integração no sistema nervoso central → motor/autônomo).
   2. Drogas psicoativas: onde cada droga age no encéfalo, o neurotransmissor envolvido e os efeitos.
   3. Hormônios em ação: o hormônio sai da glândula, viaja pelo sangue e age nas células-alvo.
   Modelos didáticos simplificados, para o ensino.
   ========================================================================= */
window.FISIO = (function () {
  const COR = { sens: 0x4fc3f7, int: 0xffe14d, mot: 0xff6e40, auto: 0xb388ff };
  const TIPO = { sens: "Sensitivo (aferente)", int: "Integração no SNC", mot: "Motor (eferente)", auto: "Autônomo (involuntário)" };

  /* ---- pontos do encéfalo e da cabeça (coordenadas do modelo; x > 0 = lado esquerdo do corpo) ---- */
  const P = {
    olhoD: [-0.2, 15.96, 0.58], olhoE: [0.2, 15.96, 0.58], quiasma: [0, 16.06, 0.12], talamo: [0.1, 16.3, -0.22],
    visual: [0.18, 16.45, -0.98], prefrontal: [0.3, 16.75, 0.5], motorMao: [0.5, 16.86, -0.12], motorPerna: [0.1, 17.0, -0.2],
    motorFace: [0.6, 16.45, 0.02], somestesico: [0.5, 16.84, -0.42], auditivo: [0.62, 16.3, -0.2], wernicke: [0.6, 16.45, -0.52],
    broca: [0.58, 16.45, 0.3], cerebelo: [0.3, 15.92, -0.62], bulbo: [0.0, 15.6, -0.3], ponte: [0.02, 15.85, -0.26],
    hipotalamo: [0, 16.2, 0.0], amigdala: [0.32, 16.1, 0.02], hipocampo: [0.4, 16.18, -0.32], recompensa: [0.1, 16.22, 0.18],
    cocleaD: [-0.22, 15.78, -0.07], orelhaD: [-0.7, 15.85, -0.12], laringe: [0.0, 15.05, 0.12], lingua: [0.0, 15.25, 0.45],
    labios: [0.0, 15.3, 0.82], carotida: [-0.32, 14.9, 0.12], decussacao: [0.0, 15.5, -0.36]
  };

  function criar(ctx) {
    const { T, cena, camera, palco, pecas, refs, est } = ctx;
    const V = a => new T.Vector3(a[0], a[1], a[2]);

    /* ---------------- utilidades ---------------- */
    const cacheC = {};
    function centro(id, lado) {   // centro (no mundo) das malhas de uma estrutura; lado -1 = direito, +1 = esquerdo
      const k = id + "|" + (lado || 0); if (cacheC[k]) return cacheC[k].clone();
      const ms = pecas.filter(m => m.userData.id === id); if (!ms.length) return null;
      const soma = new T.Vector3(), v = new T.Vector3(); let n = 0;
      ms.forEach(m => {
        m.updateWorldMatrix(true, false); const p = m.geometry.attributes.position, passo = Math.max(1, Math.floor(p.count / 400));
        for (let i = 0; i < p.count; i += passo) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (lado && v.x * lado <= 0.02) continue; soma.add(v); n++; }
      });
      if (!n) return lado ? centro(id) : null;
      cacheC[k] = soma.divideScalar(n); return cacheC[k].clone();
    }
    function sistemaDe(id) { const m = pecas.find(x => x.userData.id === id); return m ? m.userData.sistema : null; }
    function pontosCurva(c, n, inverso) { const a = []; for (let i = 0; i <= n; i++) a.push(c.getPointAt(inverso ? 1 - i / n : i / n)); return a; }
    function medula(y1, y2) {   // trecho da medula espinal entre duas alturas, na ordem pedida
      const pts = pontosCurva(refs.medula, 60).filter(p => p.y <= Math.max(y1, y2) + 0.05 && p.y >= Math.min(y1, y2) - 0.05);
      pts.sort((a, b) => y1 > y2 ? b.y - a.y : a.y - b.y); return pts;
    }
    function nervo(id, lado, perto) {   // trajeto de um nervo do modelo, começando pela ponta mais próxima de "perto"
      const ms = pecas.filter(m => m.userData.id === id && m.userData.curva);
      let melhor = null, comp = 0;
      ms.forEach(m => {
        m.updateWorldMatrix(true, false); const c = m.userData.curva, mid = c.getPointAt(0.5).applyMatrix4(m.matrixWorld);
        if (lado && mid.x * lado <= 0) return; const L = c.getLength(); if (L > comp) { comp = L; melhor = m; }
      });
      if (!melhor) return [];
      const pts = pontosCurva(melhor.userData.curva, 30).map(p => p.applyMatrix4(melhor.matrixWorld));
      if (perto && pts[pts.length - 1].distanceTo(V(perto)) < pts[0].distanceTo(V(perto))) pts.reverse();
      return pts;
    }
    // junta pedaços (pontos soltos, listas de pontos) num só caminho
    function caminho(...partes) {
      const out = [];
      partes.forEach(p => { const lista = Array.isArray(p) && typeof p[0] === "number" ? [V(p)] : Array.isArray(p) ? p.map(q => q.isVector3 ? q : V(q)) : [p]; lista.forEach(q => { if (!out.length || out[out.length - 1].distanceTo(q) > 0.02) out.push(q.clone()); }); });
      return out.length > 1 ? new T.CatmullRomCurve3(out, false, "catmullrom", 0.3) : null;
    }

    /* ---------------- etiquetas (nomes presos a pontos 3D) ---------------- */
    const camada = document.createElement("div"); camada.className = "fis-etiquetas"; palco.parentElement.appendChild(camada);
    let etiquetas = [];
    function etiquetar(lista) {   // [{p: Vector3, txt, cor}]
      camada.innerHTML = ""; etiquetas = lista.map(e => { const d = document.createElement("div"); d.className = "fis-et"; d.innerHTML = e.txt; if (e.cor) d.style.setProperty("--c", "#" + new T.Color(e.cor).getHexString()); camada.appendChild(d); return { el: d, p: e.p }; });
    }
    const vp = new T.Vector3();
    function posEtiquetas() {
      if (!etiquetas.length) return; const w = palco.clientWidth, h = palco.clientHeight;
      etiquetas.forEach(e => { vp.copy(e.p).project(camera); const vis = vp.z < 1 && Math.abs(vp.x) < 1.1 && Math.abs(vp.y) < 1.1; e.el.style.display = vis ? "" : "none"; if (vis) e.el.style.transform = `translate(${(vp.x + 1) / 2 * w}px, ${(1 - vp.y) / 2 * h}px)`; });
    }

    /* ---------------- marcadores brilhantes (áreas do encéfalo, glândulas) ---------------- */
    const grupoFx = new T.Group(); grupoFx.renderOrder = 999; cena.add(grupoFx);
    const matFx = cor => new T.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, toneMapped: false });
    let marcadores = [];
    function marcar(lista) {   // [{p, cor, r}]
      marcadores.forEach(m => grupoFx.remove(m)); marcadores = lista.map(e => {
        const g = new T.Mesh(new T.SphereGeometry(e.r || 0.09, 18, 12), matFx(e.cor)); g.position.copy(e.p); g.renderOrder = 999;
        const halo = new T.Mesh(new T.SphereGeometry((e.r || 0.09) * 2.2, 18, 12), matFx(e.cor)); halo.material.opacity = 0.22; halo.renderOrder = 998; g.add(halo);
        grupoFx.add(g); return g;
      });
    }

    /* ---------------- impulsos (cabeça brilhante + rastro) ---------------- */
    function criarPulso(cor) {
      const g = new T.Group(); const bolas = [];
      for (let i = 0; i < 9; i++) { const m = new T.Mesh(new T.SphereGeometry(i ? 0.05 * (1 - i / 11) : 0.075, 12, 8), matFx(i ? cor : 0xffffff)); m.material.opacity = i ? 0.75 * (1 - i / 10) : 1; m.renderOrder = 999; g.add(m); bolas.push(m); }
      const halo = new T.Mesh(new T.SphereGeometry(0.17, 14, 10), matFx(cor)); halo.material.opacity = 0.35; bolas[0].add(halo);
      grupoFx.add(g); return { g, bolas };
    }
    function moverPulso(pu, curva, t) {
      // de longe o impulso fica maior, para continuar visível com o corpo inteiro na tela
      const f = Math.min(2.2, Math.max(1, camera.position.distanceTo(pu.bolas[0].position) / 8));
      pu.bolas.forEach((b, i) => { const tt = t - i * 0.018; b.visible = tt >= 0 && tt <= 1; if (b.visible) { b.position.copy(curva.getPointAt(tt)); b.scale.setScalar(f); } });
    }
    function limparPulsos(lista) { lista.forEach(p => grupoFx.remove(p.g)); }

    /* ---------------- visibilidade dos sistemas ---------------- */
    function mostrar(sistemas, opac) {   // deixa estes sistemas visíveis com a opacidade dada (sem esconder os outros)
      sistemas.forEach(s => { if (!s) return; est.visivel[s] = true; est.opac[s] = opac[s] != null ? opac[s] : 0.5; });
      ctx.aplicarTudo();
    }
    const CAM = {
      cabeca: [[0.15, 16.3, -0.15], [3.6, 17.2, 4.6]], tronco: [[0, 13.2, 0], [-4.5, 14.2, 11]], braco: [[-1.6, 11, 0], [-4.5, 12, 15]],
      corpo: [[0, 9.6, 0], [-8, 11.5, 24]], perna: [[-0.5, 6, 0], [-7, 8, 17]], pescoco: [[0, 15, 0], [-3.5, 15.8, 6]]
    };
    const voar = k => { const c = CAM[k]; if (c) ctx.voarPara(V(c[0]), V(c[1]), 1.1); };

    /* =====================================================================
       1. SISTEMA NERVOSO EM AÇÃO
       ===================================================================== */
    const lado = -1;   // braço e perna direitos (comandados pelo hemisfério esquerdo)
    function acoes() {
      const ombroC6 = medula(15.6, 14.2), C6 = ombroC6[ombroC6.length - 1];
      const fimMed = pontosCurva(refs.medula, 60).reduce((a, p) => p.y < a.y ? p : a);
      const maoAteC6 = () => pontosCurva(refs.nervoAntebraco, 30).concat(pontosCurva(refs.nervoBraco, 30));
      const C6ateMao = () => maoAteC6().reverse();
      const cauda = [fimMed, [-0.12, 10.3, -0.62], [-0.28, 9.6, -0.7]];
      const visao = () => caminho(P.olhoD, P.quiasma, P.talamo, [0.15, 16.4, -0.6], P.visual);
      return {
        pegar: {
          titulo: "✋ Pegar um objeto", tempo: "≈ 0,3 a 0,5 s", resumo: "Ato voluntário: você vê o objeto, decide pegar e o cérebro comanda os músculos do braço.",
          passos: [
            { tipo: "sens", cam: "cabeca", nome: "Os olhos captam a imagem", txt: "A luz chega à <b>retina</b>; os fotorreceptores geram impulsos que seguem pelo <b>nervo óptico</b>, passam pelo <b>tálamo</b> e chegam ao <b>córtex visual</b>, na nuca (lobo occipital).", c: [visao()], areas: ["visual", "talamo"] },
            { tipo: "int", cam: "cabeca", nome: "O cérebro decide e planeja", txt: "O <b>córtex pré-frontal</b> decide pegar o objeto e o <b>córtex motor</b> monta o comando. Quem move a mão <b>direita</b> é o hemisfério <b>esquerdo</b> do cérebro: as vias se cruzam.", c: [caminho(P.visual, [0.3, 16.75, -0.5], [0.32, 16.9, 0.1], P.prefrontal, [0.45, 16.9, 0.2], P.motorMao)], areas: ["prefrontal", "motorMao"] },
            { tipo: "int", cam: "cabeca", nome: "Cerebelo ajusta a força e a pontaria", txt: "O <b>cerebelo</b> calcula a força e a direção certas, e o comando desce pelo <b>tronco encefálico</b>, onde cruza para o lado direito.", c: [caminho(P.motorMao, [0.35, 16.5, -0.3], P.cerebelo, P.ponte, P.decussacao)], areas: ["cerebelo", "ponte"] },
            { tipo: "mot", cam: "tronco", nome: "Pela medula espinal", txt: "O impulso desce pela <b>medula espinal</b> até a altura do pescoço (C5–C8), de onde saem os nervos do braço (plexo braquial).", c: [caminho(P.decussacao, ombroC6)] },
            { tipo: "mot", cam: "braco", nome: "Nervos do braço → músculos", txt: "Os <b>nervos motores</b> levam a ordem até os músculos: o <b>bíceps</b> dobra o cotovelo e os músculos do antebraço fecham os dedos. Na <b>sinapse</b> com o músculo, a <b>acetilcolina</b> faz a fibra contrair.", c: [caminho(C6ateMao())], acende: ["biceps", "antebraco_m"], flexao: 70 },
            { tipo: "sens", cam: "tronco", nome: "O tato confirma: objeto na mão!", txt: "Receptores de <b>tato e pressão</b> dos dedos mandam impulsos de volta, pela medula, até o <b>córtex somestésico</b>. É assim que você sente o objeto e ajusta a força para não deixá-lo cair.", c: [caminho(maoAteC6(), medula(14.2, 15.5), P.ponte, P.talamo, P.somestesico)], areas: ["somestesico"] }
          ]
        },
        chutar: {
          titulo: "⚽ Chutar uma bola", tempo: "≈ 0,4 a 0,6 s", resumo: "Ato voluntário que exige equilíbrio: uma perna chuta enquanto a outra sustenta o corpo.",
          passos: [
            { tipo: "sens", cam: "cabeca", nome: "Ver a bola chegando", txt: "Os olhos acompanham a bola; a imagem segue pelo nervo óptico até o <b>córtex visual</b>.", c: [visao()], areas: ["visual"] },
            { tipo: "int", cam: "cabeca", nome: "Planejar o chute", txt: "O <b>córtex motor</b> (área da perna, no alto da cabeça) prepara o movimento, e o <b>cerebelo</b> coordena o tempo do chute e o <b>equilíbrio</b> na perna de apoio.", c: [caminho(P.visual, [0.2, 16.85, -0.6], P.motorPerna), caminho(P.visual, [0.3, 16.2, -0.85], P.cerebelo)], areas: ["motorPerna", "cerebelo"] },
            { tipo: "mot", cam: "corpo", nome: "Medula espinal até a região lombar", txt: "O comando desce por toda a <b>medula espinal</b>. Ela termina na altura das primeiras vértebras lombares; dali os nervos seguem como a <b>cauda equina</b>.", c: [caminho(P.motorPerna, P.ponte, P.decussacao, medula(15.5, 11), cauda)] },
            { tipo: "mot", cam: "perna", nome: "Nervo femoral → quadríceps", txt: "O <b>nervo femoral</b> faz o <b>quadríceps</b> contrair e estender o joelho: é o chute! Os músculos de trás da coxa relaxam (músculos antagonistas).", c: [caminho(nervo("nervo_femoral", lado, [-0.5, 9, 0]))], acende: ["quadriceps"] },
            { tipo: "sens", cam: "corpo", nome: "O pé informa o contato com a bola", txt: "Receptores da pele e dos músculos (propriocepção) mandam informações pelo <b>nervo isquiático</b> até a medula e o <b>cerebelo</b>, que corrige a postura para você não cair.", c: [caminho(nervo("nervo_tibial", lado, [-1, 0.2, 1]), nervo("nervo_isquiatico", lado, [-1, 5, -0.3]), cauda.slice().reverse(), medula(11, 15.5), P.cerebelo)], areas: ["cerebelo"] }
          ]
        },
        reflexo: {
          titulo: "🔥 Tocar em algo quente", tempo: "≈ 0,05 s (reflexo)", resumo: "Ato reflexo: a medula espinal responde sozinha, antes de o cérebro perceber a dor.",
          passos: [
            { tipo: "sens", cam: "braco", nome: "Receptores de dor e calor", txt: "Receptores na pele dos dedos detectam o calor e disparam impulsos pelo <b>nervo sensitivo</b> do braço até a medula.", c: [caminho(maoAteC6())], fogo: true },
            { tipo: "int", cam: "tronco", nome: "A medula decide sozinha", txt: "Na <b>medula espinal</b>, um <b>neurônio de associação</b> liga o sensitivo direto ao motor. A resposta sai dali, <b>sem passar pelo cérebro</b>: por isso é tão rápida.", c: [caminho(C6, C6.clone().add(V([0.05, 0.08, 0.08])), C6.clone().add(V([-0.05, 0.02, 0.1])))] },
            { tipo: "mot", cam: "braco", nome: "O braço se afasta", txt: "O <b>nervo motor</b> faz o <b>bíceps</b> contrair e a mão se afasta do calor.", c: [caminho(pontosCurva(refs.motorBiceps, 30))], acende: ["biceps"], flexao: 90 },
            { tipo: "sens", cam: "tronco", nome: "Só depois você sente a dor", txt: "Ao mesmo tempo, o impulso <b>sobe pela medula</b> até o <b>córtex somestésico</b>. Quando você sente a dor, a mão já saiu do lugar.", c: [caminho(medula(14.2, 15.55), P.ponte, P.talamo, P.somestesico)], areas: ["somestesico"] }
          ]
        },
        ouvir: {
          titulo: "👂 Ouvir seu nome e responder", tempo: "≈ 0,6 s até começar a falar", resumo: "Audição, compreensão da linguagem e fala: várias áreas do cérebro trabalham em sequência.",
          passos: [
            { tipo: "sens", cam: "cabeca", nome: "O som vira impulso na cóclea", txt: "O som faz vibrar o tímpano e os ossículos; na <b>cóclea</b>, células ciliadas transformam a vibração em impulsos, que seguem pelo <b>nervo vestibulococlear</b>.", c: [caminho(P.orelhaD, P.cocleaD, [-0.1, 15.8, -0.2], P.ponte)], acende: ["coclea"] },
            { tipo: "int", cam: "cabeca", nome: "Córtex auditivo e área de Wernicke", txt: "O impulso chega ao <b>córtex auditivo</b> (lobo temporal) e à <b>área de Wernicke</b>, que reconhece as palavras: é o seu nome!", c: [caminho(P.ponte, P.talamo, P.auditivo, P.wernicke)], areas: ["auditivo", "wernicke"] },
            { tipo: "int", cam: "cabeca", nome: "Área de Broca planeja a resposta", txt: "A <b>área de Broca</b> (lobo frontal) monta a resposta e o <b>córtex motor</b> da face prepara os movimentos da fala.", c: [caminho(P.wernicke, [0.68, 16.55, -0.1], P.broca, P.motorFace)], areas: ["broca", "motorFace"] },
            { tipo: "mot", cam: "pescoco", nome: "Nervos cranianos: laringe, língua e lábios", txt: "Pelo tronco encefálico saem os <b>nervos cranianos</b>: o <b>vago</b> move as cordas vocais da laringe, o <b>hipoglosso</b> move a língua e o <b>facial</b> move os lábios. “Oi, tô aqui!”", c: [caminho(P.motorFace, P.ponte, P.bulbo, [0.25, 15.3, -0.1], P.laringe), caminho(P.motorFace, P.ponte, P.bulbo, [0.2, 15.25, 0.1], P.lingua), caminho(P.motorFace, P.ponte, [0.45, 15.7, 0.1], [0.4, 15.4, 0.5], P.labios)], acende: ["laringe", "lingua", "orbicular_boca"] }
          ]
        },
        respirar: {
          titulo: "🫁 Respirar e o coração bater", tempo: "o tempo todo, sem você pensar", resumo: "Atos involuntários controlados pelo tronco encefálico e pelo sistema nervoso autônomo.",
          passos: [
            { tipo: "auto", cam: "tronco", nome: "Bulbo → nervo frênico → diafragma", txt: "O <b>bulbo</b> (tronco encefálico) dispara impulsos ritmados que descem pela medula e saem pelo <b>nervo frênico</b> até o <b>diafragma</b>: ele contrai e o ar entra nos pulmões.", c: [caminho(P.bulbo, medula(15.4, 15.0), nervo("nervo_frenico", -1, [0, 15, 0])), caminho(P.bulbo, medula(15.4, 15.0), nervo("nervo_frenico", 1, [0, 15, 0]))], acende: ["diafragma"], mostrar: ["respiratorio"] },
            { tipo: "auto", cam: "tronco", nome: "Nervo vago desacelera o coração", txt: "O <b>nervo vago</b> (parassimpático) sai do bulbo e chega ao <b>coração</b>, mantendo os batimentos calmos no repouso.", c: [caminho(P.bulbo, nervo("nervo_vago", -1, [0, 15.6, -0.2]).slice(0, 18), centro("coracao"))], acende: ["coracao"], mostrar: ["circulatorio"] },
            { tipo: "sens", cam: "pescoco", nome: "Sensores de CO₂ avisam o bulbo", txt: "Sensores no pescoço (junto às artérias carótidas) e no próprio bulbo medem o <b>gás carbônico</b> do sangue. Se ele sobe (no exercício, por exemplo), o bulbo acelera a respiração.", c: [caminho(P.carotida, [-0.25, 15.2, -0.1], P.bulbo)], areas: ["bulbo"] }
          ]
        },
        susto: {
          titulo: "😱 Levar um susto", tempo: "≈ 0,2 s", resumo: "Reação de “luta ou fuga”: o sistema nervoso simpático prepara o corpo para agir.",
          passos: [
            { tipo: "sens", cam: "cabeca", nome: "Algo inesperado!", txt: "Um barulho alto ou um vulto: os sentidos mandam o sinal ao <b>tálamo</b>, que o repassa rapidamente para a <b>amígdala</b>, o “alarme” das emoções.", c: [caminho(P.olhoD, P.quiasma, P.talamo, P.amigdala), caminho(P.orelhaD, P.cocleaD, P.ponte, P.talamo)], areas: ["amigdala", "talamo"] },
            { tipo: "int", cam: "cabeca", nome: "Hipotálamo dispara o alerta", txt: "A amígdala ativa o <b>hipotálamo</b>, que comanda o <b>sistema nervoso simpático</b> através do tronco encefálico e da medula.", c: [caminho(P.amigdala, P.hipotalamo, P.ponte, P.bulbo)], areas: ["hipotalamo"] },
            { tipo: "auto", cam: "corpo", nome: "Simpático: coração e glândulas suprarrenais", txt: "Pela medula torácica e pelos <b>nervos simpáticos</b>, o impulso acelera o <b>coração</b>, dilata as pupilas e os brônquios e faz as <b>glândulas suprarrenais</b> liberarem <b>adrenalina</b> no sangue. Veja a adrenalina em “Hormônios em ação”.", c: [caminho(P.bulbo, medula(15.4, 12.2), [-0.25, 11.9, -0.3], centro("adrenais", -1) || [-0.5, 11.55, -0.2]), caminho(P.bulbo, medula(15.4, 13.6), [0.15, 13.4, -0.2], centro("coracao"))], acende: ["adrenais", "coracao"], mostrar: ["endocrino", "circulatorio"], bpm: 125 }
          ]
        }
      };
    }
    const NV = { lista: null, ativa: null, passo: -1, t: 0, pulsos: [], curvas: [], dur: 1, lento: false, pausa: false, bpm0: null };
    function nomeArea(k) { return { visual: "Córtex visual", prefrontal: "Córtex pré-frontal", motorMao: "Córtex motor (mão)", motorPerna: "Córtex motor (perna)", motorFace: "Córtex motor (face)", somestesico: "Córtex somestésico", auditivo: "Córtex auditivo", wernicke: "Área de Wernicke", broca: "Área de Broca", cerebelo: "Cerebelo", ponte: "Tronco encefálico", bulbo: "Bulbo", hipotalamo: "Hipotálamo", amigdala: "Amígdala", talamo: "Tálamo", hipocampo: "Hipocampo", recompensa: "Sistema de recompensa" }[k] || k; }
    function iniciarAcao(k) {
      pararAcao(); NV.lista = NV.lista || acoes(); const a = NV.lista[k]; if (!a) return;
      ctx.aplicarPreset("drogas"); mostrar(["muscular"], { muscular: 0.22 }); ctx.desselecionar && ctx.desselecionar();
      NV.ativa = k; NV.passo = -1; NV.pausa = false; ctx.est.flexao = 0; ctx.aplicarFlexao();
      const ol = document.querySelector("#acoesPassos"); if (ol) ol.innerHTML = a.passos.map((p, i) => `<li data-p="${i}"><i style="background:#${new T.Color(COR[p.tipo]).getHexString()}"></i>${p.nome}</li>`).join("");
      document.querySelector("#acoesTempo").textContent = a.tempo; document.querySelector("#acoesResumo").innerHTML = a.resumo;
      document.querySelectorAll("[data-acao]").forEach(b => b.classList.toggle("ativo", b.dataset.acao === k));
      proximoPasso();
    }
    function proximoPasso() {
      const a = NV.lista[NV.ativa]; limparPulsos(NV.pulsos); NV.pulsos = [];
      const ant = a.passos[NV.passo]; if (ant && ant.acende) ant.acende.forEach(id => ctx.limparRealce(id));
      NV.passo++;
      if (NV.passo >= a.passos.length) { fimAcao(); return; }
      const p = a.passos[NV.passo];
      NV.curvas = p.c.filter(Boolean); NV.t = 0;
      NV.dur = Math.max(1.4, Math.max(...NV.curvas.map(c => c.getLength())) / 3.2);
      NV.pulsos = NV.curvas.map(() => criarPulso(COR[p.tipo]));
      if (p.mostrar) mostrar(p.mostrar, {});
      voar(p.cam);
      const areas = (p.areas || []).map(k => ({ p: V(P[k]), cor: COR[p.tipo], txt: nomeArea(k) }));
      marcar(areas); etiquetar(areas);
      if (p.fogo) ctx.fogo(true);
      if (p.bpm) { NV.bpm0 = NV.bpm0 || est.bpm; est.bpm = p.bpm; ctx.atuBpm(); }
      document.querySelectorAll("#acoesPassos li").forEach((li, i) => { li.classList.toggle("atual", i === NV.passo); li.classList.toggle("feito", i < NV.passo); });
      const d = document.querySelector("#acoesTxt"); if (d) d.innerHTML = `<span class="fis-tipo" style="--c:#${new T.Color(COR[p.tipo]).getHexString()}">${TIPO[p.tipo]}</span> ${p.txt}`;
    }
    function fimAcao() {
      marcar([]); etiquetar([]); ctx.fogo(false);
      const a = NV.lista[NV.ativa]; a.passos.forEach(p => (p.acende || []).forEach(id => ctx.limparRealce(id)));
      document.querySelectorAll("#acoesPassos li").forEach(li => { li.classList.remove("atual"); li.classList.add("feito"); });
      const d = document.querySelector("#acoesTxt"); if (d) d.innerHTML += ` <b>Fim!</b> Toque de novo para repetir ou escolha outra ação.`;
      if (NV.bpm0) { setTimeout(() => { est.bpm = NV.bpm0; NV.bpm0 = null; ctx.atuBpm(); }, 2500); }
      const vol = setInterval(() => { est.flexao = Math.max(0, est.flexao - 3); ctx.aplicarFlexao(); if (est.flexao <= 0) clearInterval(vol); }, 30);
      NV.ativa = null;
    }
    function pararAcao() {
      if (NV.ativa && NV.lista) NV.lista[NV.ativa].passos.forEach(p => (p.acende || []).forEach(id => ctx.limparRealce(id)));
      limparPulsos(NV.pulsos); NV.pulsos = []; NV.ativa = null; marcar([]); etiquetar([]); ctx.fogo(false);
      if (NV.bpm0) { est.bpm = NV.bpm0; NV.bpm0 = null; ctx.atuBpm(); }
    }
    function passoNervoso(dt) {
      if (!NV.ativa || NV.pausa) return;
      const a = NV.lista[NV.ativa], p = a.passos[NV.passo];
      NV.t += dt / (NV.dur * (NV.lento ? 2.5 : 1));
      const t = Math.min(1, NV.t);
      NV.pulsos.forEach((pu, i) => moverPulso(pu, NV.curvas[i], t * 1.15));
      if (p.acende && t > 0.75) p.acende.forEach(id => ctx.realcar(id, COR[p.tipo], 0.55 + 0.25 * Math.sin(performance.now() / 90)));
      if (p.flexao && t > 0.7) { est.flexao = Math.min(p.flexao, est.flexao + dt * 160); ctx.aplicarFlexao(); }
      const pulsa = 1 + 0.25 * Math.sin(performance.now() / 160); marcadores.forEach(m => m.scale.setScalar(pulsa));
      if (NV.t >= 1.35) proximoPasso();
    }

    /* =====================================================================
       2. DROGAS PSICOATIVAS: ONDE CADA UMA AGE
       ===================================================================== */
    const AREAS_DROGA = { prefrontal: "Córtex pré-frontal: decisões e autocontrole", recompensa: "Sistema de recompensa (dopamina): prazer e motivação", hipocampo: "Hipocampo: memória", cerebelo: "Cerebelo: equilíbrio e coordenação", bulbo: "Bulbo: respiração e batimentos", visual: "Córtex visual e sensorial: percepção", hipotalamo: "Hipotálamo: temperatura, fome e sono", amigdala: "Amígdala: medo e ansiedade", motorMao: "Córtex motor: movimentos" };
    const SUBST = {
      alcool: { nome: "Álcool", tipo: "depressora", neuro: "Aumenta a ação do <b>GABA</b> (freio) e diminui a do <b>glutamato</b> (acelerador)", areas: ["prefrontal", "cerebelo", "hipocampo", "bulbo"], efeito: "Desinibição, fala enrolada, perda de equilíbrio e de reflexos, “apagões” de memória. Em grande quantidade, deprime o bulbo e pode parar a respiração (coma alcoólico).", longo: "Lesões no fígado (cirrose), no cérebro e no coração; dependência. Proibido para menores de 18 anos e ao dirigir." },
      calmantes: { nome: "Calmantes (benzodiazepínicos)", tipo: "depressora", neuro: "Reforçam o receptor de <b>GABA</b>", areas: ["amigdala", "cerebelo", "bulbo"], efeito: "Diminuem a ansiedade e dão sono. São remédios: só com receita e acompanhamento médico. Misturados com álcool, deprimem a respiração.", longo: "Tolerância e dependência; sonolência, quedas e perda de memória." },
      opioides: { nome: "Opioides (morfina, heroína, fentanil)", tipo: "depressora", neuro: "Ligam-se aos <b>receptores opioides</b> (os mesmos das endorfinas) e liberam muita dopamina", areas: ["recompensa", "bulbo"], efeito: "Alívio da dor (uso médico), euforia e sonolência. O maior perigo: deprimem o <b>bulbo</b> e a respiração para (overdose).", longo: "Dependência muito forte, abstinência intensa e alto risco de morte por overdose." },
      inalantes: { nome: "Inalantes e solventes (cola, lança-perfume, “loló”)", tipo: "depressora", neuro: "Dissolvem-se nas membranas dos neurônios e deprimem o sistema nervoso", areas: ["cerebelo", "prefrontal", "hipocampo", "bulbo"], efeito: "Tontura, euforia rápida, perda de coordenação; podem causar arritmia cardíaca e morte súbita já no primeiro uso.", longo: "Lesões no cerebelo, nos nervos, nos rins e no fígado." },
      nicotina: { nome: "Nicotina (cigarro, vape, narguilé)", tipo: "estimulante", neuro: "Imita a <b>acetilcolina</b> nos receptores nicotínicos e libera <b>dopamina</b>", areas: ["recompensa", "prefrontal"], efeito: "Sensação rápida de prazer e alerta, coração acelerado e vasos contraídos.", longo: "Uma das drogas que mais causam dependência. A fumaça e o vapor levam substâncias que causam câncer, infarto, AVC e doenças pulmonares." },
      cafeina: { nome: "Cafeína (café, energéticos, refrigerantes)", tipo: "estimulante", neuro: "Bloqueia os receptores de <b>adenosina</b>, a substância que dá sono", areas: ["prefrontal", "bulbo"], efeito: "Mais alerta, menos sono, coração um pouco mais rápido. Em excesso: ansiedade, tremores e insônia.", longo: "Dependência leve (dor de cabeça na abstinência). Energéticos com álcool são perigosos." },
      cocaina: { nome: "Cocaína e crack", tipo: "estimulante", neuro: "Bloqueia a <b>recaptação de dopamina</b>, que se acumula na fenda sináptica", areas: ["recompensa", "prefrontal", "amigdala"], efeito: "Euforia intensa e curta, agitação, pupilas dilatadas, coração e pressão muito altos (risco de infarto e AVC).", longo: "Dependência muito rápida (principalmente o crack), paranoia, lesões no coração e no nariz/pulmões." },
      anfetaminas: { nome: "Anfetaminas e ecstasy (MDMA)", tipo: "estimulante", neuro: "Fazem os neurônios liberarem <b>dopamina, noradrenalina e serotonina</b>", areas: ["recompensa", "hipotalamo", "prefrontal"], efeito: "Euforia, falta de sono e de fome. O ecstasy pode elevar demais a temperatura do corpo (hipertermia) e causar desidratação grave.", longo: "Depressão e ansiedade depois do efeito, lesões nos neurônios de serotonina, problemas no coração." },
      maconha: { nome: "Maconha (THC)", tipo: "perturbadora", neuro: "O THC age nos receptores <b>canabinoides (CB1)</b>, alterando vários neurotransmissores", areas: ["hipocampo", "cerebelo", "recompensa", "prefrontal"], efeito: "Alteração da percepção do tempo, da memória recente, da atenção e da coordenação; olhos vermelhos e fome.", longo: "Em adolescentes, prejudica memória e aprendizagem; pode desencadear surtos psicóticos em quem tem predisposição; dependência." },
      lsd: { nome: "LSD e cogumelos alucinógenos", tipo: "perturbadora", neuro: "Parecidos com a <b>serotonina</b>, ativam os receptores 5-HT2A como “chaves falsas”", areas: ["visual", "prefrontal"], efeito: "Alucinações visuais e sonoras, distorção do tempo e do próprio corpo. Pode haver pânico e comportamentos de risco (“bad trip”).", longo: "Pode desencadear transtornos psiquiátricos e “flashbacks” (as alucinações voltam sem usar a droga)." }
    };
    const COR_TIPO = { depressora: 0x4a78ff, estimulante: 0xff6a2a, perturbadora: 0xb060f0 };
    let drogaAtual = null;
    function mostrarDroga(k, s, clicarModo) {
      const d = SUBST[k]; if (!d) return; drogaAtual = k;
      s.querySelectorAll("[data-subst]").forEach(b => b.classList.toggle("ativo", b.dataset.subst === k));
      clicarModo(d.tipo);
      const el = s.querySelector("#detSubst");
      el.hidden = false;
      el.innerHTML = `<h4>${d.nome} <span class="fis-tipo" style="--c:#${new T.Color(COR_TIPO[d.tipo]).getHexString()}">${{ depressora: "Depressora", estimulante: "Estimulante", perturbadora: "Perturbadora" }[d.tipo]}</span></h4>
        <p><b>Como age:</b> ${d.neuro}.</p>
        <p><b>Onde age no encéfalo:</b></p><ul class="lista mini-txt">${d.areas.map(a => `<li>${AREAS_DROGA[a]}</li>`).join("")}</ul>
        <p><b>Efeitos:</b> ${d.efeito}</p><p><b>Com o uso repetido:</b> ${d.longo}</p>`;
      ctx.aplicarPreset("drogas"); ctx.desselecionar && ctx.desselecionar(); est.droga3d = true;
      const lista = d.areas.map(a => ({ p: V(P[a]), cor: COR_TIPO[d.tipo], txt: AREAS_DROGA[a].split(":")[0], r: 0.11 }));
      pararAcao(); marcar(lista); etiquetar(lista);
      ctx.voarPara(V([0.1, 16.3, -0.15]), V([4.2, 17.3, 4.8]), 1.1);
    }

    /* =====================================================================
       3. HORMÔNIOS EM AÇÃO
       ===================================================================== */
    const HORM = {
      insulina: { nome: "Insulina", gl: "pancreas", cor: 0x29b6f6, quando: "Depois de uma refeição, a glicose (açúcar) do sangue sobe.", alvos: [["figado", "Fígado guarda a glicose como glicogênio"], ["quadriceps", "Músculos absorvem glicose para gerar energia", -1], ["biceps", "", 1]], efeito: "A insulina “abre a porta” das células para a glicose entrar. A glicose do sangue volta ao normal.", retro: "Glicose normal → o pâncreas diminui a insulina (retroalimentação negativa).", med: ["Glicose no sangue", 150, 90, "mg/dL"], saude: "No <b>diabetes</b>, falta insulina (tipo 1) ou as células respondem mal a ela (tipo 2): a glicose fica alta no sangue." },
      glucagon: { nome: "Glucagon", gl: "pancreas", cor: 0xffa726, quando: "Em jejum ou durante um exercício longo, a glicose do sangue cai.", alvos: [["figado", "Fígado quebra o glicogênio e solta glicose no sangue"]], efeito: "A glicose do sangue sobe de volta ao normal. Insulina e glucagon têm efeitos opostos (antagonistas).", retro: "Glicose normal → o pâncreas para de liberar glucagon.", med: ["Glicose no sangue", 60, 88, "mg/dL"] },
      adrenalina: { nome: "Adrenalina", gl: "adrenais", cor: 0xef5350, quando: "Susto, perigo, competição: o sistema nervoso simpático ativa as glândulas suprarrenais.", alvos: [["coracao", "Coração bate mais rápido e mais forte"], ["bronquios", "Brônquios se dilatam: entra mais ar"], ["figado", "Fígado libera glicose: energia rápida"], ["quadriceps", "Músculos recebem mais sangue", -1]], efeito: "O corpo fica pronto para “lutar ou fugir” em poucos segundos.", retro: "Passado o perigo, o simpático se acalma e o efeito some em minutos.", med: ["Frequência cardíaca", 72, 130, "bpm"], bpm: 130 },
      cortisol: { nome: "Cortisol", gl: "adrenais", cor: 0xab47bc, quando: "Estresse prolongado e de manhã, ao acordar.", alvos: [["figado", "Fígado produz mais glicose"], ["quadriceps", "Músculos liberam aminoácidos", -1], ["baco", "Diminui a inflamação e a defesa do corpo"]], efeito: "Mantém energia disponível durante o estresse.", retro: "Cortisol alto → hipotálamo e hipófise diminuem o estímulo (CRH e ACTH).", med: ["Cortisol", 10, 22, "µg/dL"], saude: "Estresse constante mantém o cortisol alto: atrapalha o sono, a imunidade e a memória." },
      tiroxina: { nome: "Tiroxina (T3 e T4)", gl: "tireoide", cor: 0xffd54f, quando: "A hipófise libera TSH, que estimula a tireoide.", alvos: [["coracao", "Coração: ritmo"], ["figado", "Fígado: metabolismo"], ["quadriceps", "Músculos: produção de calor", -1], ["cerebro", "Cérebro: desenvolvimento e atenção"]], efeito: "Acelera o metabolismo de quase todas as células: mais energia e mais calor.", retro: "T3/T4 altos → a hipófise diminui o TSH.", med: ["Metabolismo", 100, 115, "%"], saude: "Faltando iodo na alimentação, a tireoide aumenta (bócio). Por isso o sal de cozinha tem iodo." },
      tsh: { nome: "TSH (hipófise)", gl: "hipofise", cor: 0x9ccc65, quando: "O hipotálamo libera TRH, que estimula a hipófise.", alvos: [["tireoide", "Tireoide: produz T3 e T4"]], efeito: "A hipófise é a “glândula-mestra”: seus hormônios comandam outras glândulas.", retro: "Eixo hipotálamo → hipófise → tireoide, com retroalimentação negativa.", med: ["TSH", 1, 3, "mUI/L"] },
      gh: { nome: "Hormônio do crescimento (GH)", gl: "hipofise", cor: 0x66bb6a, quando: "Liberado principalmente durante o sono profundo e no exercício.", alvos: [["femur", "Ossos crescem nas placas de crescimento", -1], ["quadriceps", "Músculos ganham massa", 1], ["figado", "Fígado produz IGF-1, que leva o sinal às células"]], efeito: "Faz crescer ossos e músculos, principalmente na infância e na adolescência.", retro: "IGF-1 alto → o hipotálamo e a hipófise reduzem o GH.", med: ["GH durante o sono", 1, 10, "ng/mL"], saude: "Dormir bem é importante para crescer!" },
      adh: { nome: "ADH (antidiurético)", gl: "hipofise", cor: 0x4dd0e1, quando: "Pouca água no corpo (calor, suor, pouca bebida): o sangue fica concentrado.", alvos: [["rim_d", "Rins reabsorvem mais água"], ["rim_e", ""]], efeito: "Sai menos urina, mais concentrada (mais escura).", retro: "Hidratação normal → menos ADH. O álcool inibe o ADH: por isso faz urinar mais.", med: ["Urina por dia", 1.5, 0.8, "L"] },
      ocitocina: { nome: "Ocitocina", gl: "hipofise", cor: 0xf48fb1, sexo: "feminino", quando: "No parto e na amamentação.", alvos: [["utero", "Útero contrai no parto"], ["mamas", "Mamas liberam o leite"]], efeito: "Contrações do útero e saída do leite; também participa dos laços afetivos.", retro: "No parto é retroalimentação positiva: mais contrações → mais ocitocina, até o bebê nascer.", med: ["Contrações por 10 min", 0, 4, ""] },
      estrogenio: { nome: "Estrogênio e progesterona", gl: "ovarios", cor: 0xec407a, sexo: "feminino", quando: "A partir da puberdade, comandados pelo LH e FSH da hipófise.", alvos: [["utero", "Útero: prepara a parede (endométrio) a cada ciclo"], ["mamas", "Mamas se desenvolvem"], ["femur", "Ossos ficam mais fortes", -1]], efeito: "Caracteres sexuais secundários e o ciclo menstrual.", retro: "Ciclo de cerca de 28 dias, regulado pela hipófise e pelo hipotálamo.", med: ["Estrogênio", 40, 250, "pg/mL"] },
      testosterona: { nome: "Testosterona", gl: "testiculos", cor: 0x5c6bc0, sexo: "masculino", quando: "A partir da puberdade, comandada pelo LH da hipófise.", alvos: [["quadriceps", "Músculos ganham massa", -1], ["laringe", "Laringe cresce: a voz engrossa"], ["femur", "Ossos crescem e ficam mais fortes", 1]], efeito: "Caracteres sexuais secundários: pelos, voz grave, músculos; produção de espermatozoides.", retro: "Testosterona alta → hipotálamo e hipófise reduzem GnRH e LH.", med: ["Testosterona", 50, 600, "ng/dL"], saude: "Anabolizantes (testosterona sintética) sem indicação médica causam lesões no fígado, no coração e infertilidade." },
      melatonina: { nome: "Melatonina", gl: "pineal", cor: 0x7e57c2, quando: "Quando escurece: a luz (principalmente a azul das telas) inibe a pineal.", alvos: [["hipotalamo", "Hipotálamo ajusta o “relógio biológico”"], ["cerebro", "Cérebro: sonolência"]], efeito: "Prepara o corpo para dormir.", retro: "De manhã, a luz do dia corta a melatonina. Telas à noite atrasam o sono.", med: ["Melatonina", 10, 80, "pg/mL"] },
      pth: { nome: "Paratormônio (PTH)", gl: "paratireoides", cor: 0xbcaaa4, quando: "O cálcio do sangue cai.", alvos: [["femur", "Ossos liberam cálcio", -1], ["rim_e", "Rins guardam cálcio e ativam a vitamina D"]], efeito: "O cálcio do sangue volta ao normal (os músculos e o coração precisam dele).", retro: "Cálcio normal → menos PTH. A calcitonina (tireoide) tem efeito oposto.", med: ["Cálcio no sangue", 8.2, 9.6, "mg/dL"] }
    };
    const HH = { ativo: null, t: 0, part: null, dados: [], alvos: [], med: null };
    const NPART = 160;
    function criarParticulas(cor) {
      const im = new T.InstancedMesh(new T.SphereGeometry(0.045, 8, 6), matFx(cor), NPART); im.renderOrder = 999; im.frustumCulled = false; im.instanceMatrix.setUsage(T.DynamicDrawUsage);
      grupoFx.add(im); return im;
    }
    function iniciarHormonio(k, s) {
      pararHormonio(); pararAcao();
      const h = HORM[k]; if (!h) return;
      if (h.sexo && est.sexo !== h.sexo) ctx.definirSexo(h.sexo);
      ctx.desselecionar && ctx.desselecionar();
      const gl = centro(h.gl); if (!gl) return;
      const cor = centro("coracao") || V([0.2, 13, 0.2]);
      // deixa à mostra o endócrino e, mais apagados, os órgãos-alvo
      ctx.aplicarPreset("tudo");
      Object.keys(est.opac).forEach(si => { est.visivel[si] = false; });
      const sis = new Set(["endocrino", "circulatorio"]); h.alvos.forEach(a => sis.add(sistemaDe(a[0])));
      if (h.gl === "ovarios" || h.gl === "testiculos") sis.add("reprodutor");
      est.visivel.tegumentar = true; est.opac.tegumentar = 0.06;
      sis.forEach(si => { if (si) { est.visivel[si] = true; est.opac[si] = si === "endocrino" ? 1 : si === "circulatorio" ? 0.12 : si === "muscular" ? 0.22 : 0.6; } });
      ctx.aplicarTudo();
      const alvos = h.alvos.map(([id, txt, ld]) => ({ id, txt, p: centro(id, ld) })).filter(a => a.p);
      // caminho: glândula → veias → coração → artérias → órgão-alvo
      const curvas = alvos.map(a => caminho(gl, gl.clone().lerp(cor, 0.5).add(V([0.25, 0, 0.35])), cor, cor.clone().lerp(a.p, 0.5).add(V([0.2, 0.2, 0.3])), a.p));
      HH.ativo = k; HH.t = 0; HH.alvos = alvos; HH.curvas = curvas; HH.gl = gl;
      HH.part = criarParticulas(h.cor);
      HH.dados = Array.from({ length: NPART }, (_, i) => ({ c: i % curvas.length, t0: (i / NPART) * 3.2 + Math.random() * 0.3 }));
      const lista = [{ p: gl, cor: h.cor, txt: `<b>${({ pancreas: "Pâncreas", adrenais: "Suprarrenais", tireoide: "Tireoide", hipofise: "Hipófise", ovarios: "Ovários", testiculos: "Testículos", pineal: "Pineal", paratireoides: "Paratireoides" })[h.gl]}</b>`, r: 0.12 }]
        .concat(alvos.filter(a => a.txt).map(a => ({ p: a.p, cor: 0xffffff, txt: a.txt, r: 0.07 })));
      marcar(lista.slice(0, 1)); etiquetar(lista);
      // enquadra glândula e alvos
      const cx = new T.Box3().setFromPoints([gl, ...alvos.map(a => a.p)]), c = cx.getCenter(new T.Vector3()), tam = cx.getSize(new T.Vector3());
      const dist = Math.max(4.5, Math.max(tam.y, tam.x * 1.4) * 1.9 + 2);
      ctx.voarPara(c, c.clone().add(V([-0.25 * dist, 0.1 * dist, dist])), 1.2);
      s.querySelectorAll("[data-horm]").forEach(b => b.classList.toggle("ativo", b.dataset.horm === k));
      const el = s.querySelector("#detHorm"); el.hidden = false;
      el.innerHTML = `<p><b>Quando é liberado:</b> ${h.quando}</p><p><b>O que faz:</b> ${h.efeito}</p>
        <ul class="lista mini-txt">${alvos.filter(a => a.txt).map(a => `<li>${a.txt}</li>`).join("")}</ul>
        <div class="destaque"><b>Equilíbrio:</b> ${h.retro}</div>${h.saude ? `<div class="destaque curioso">${h.saude}</div>` : ""}`;
      HH.med = h.med; s.querySelector("#medHormNome").textContent = h.med[0];
      if (h.bpm) { HH.bpm0 = est.bpm; }
    }
    function pararHormonio() {
      if (HH.part) { grupoFx.remove(HH.part); HH.part.geometry.dispose(); HH.part = null; }
      if (HH.alvos) HH.alvos.forEach(a => ctx.limparRealce(a.id));
      if (HH.ativo) { const h = HORM[HH.ativo]; ctx.limparRealce(h.gl); if (HH.bpm0) { est.bpm = HH.bpm0; HH.bpm0 = null; ctx.atuBpm(); } }
      HH.ativo = null; marcar([]); etiquetar([]);
    }
    const mtx = new T.Matrix4(), esc = new T.Vector3(), q = new T.Quaternion(), pt = new T.Vector3();
    function passoHormonio(dt) {
      if (!HH.ativo || !HH.part) return;
      const h = HORM[HH.ativo]; HH.t += dt;
      const pulsa = 0.5 + 0.35 * Math.sin(HH.t * 5); ctx.realcar(h.gl, h.cor, pulsa); marcadores.forEach(m => m.scale.setScalar(1 + 0.2 * Math.sin(HH.t * 5)));
      HH.dados.forEach((d, i) => {
        const tt = ((HH.t - d.t0) / 3.2); let s = 0;
        if (tt > 0) { const f = tt % 1; HH.curvas[d.c].getPointAt(Math.min(1, f), pt); s = f > 0.92 ? (1 - f) / 0.08 : 1; }
        HH.part.setMatrixAt(i, mtx.compose(pt, q, esc.setScalar(s || 0.0001)));
      });
      HH.part.instanceMatrix.needsUpdate = true;
      const chegou = Math.min(1, Math.max(0, (HH.t - 2.6) / 4));
      if (HH.t > 2.6) HH.alvos.forEach(a => ctx.realcar(a.id, h.cor, 0.15 + 0.45 * chegou * (0.7 + 0.3 * Math.sin(HH.t * 4))));
      const [nome, de, para, un] = HH.med, v = de + (para - de) * chegou, el = document.querySelector("#medHorm");
      if (el) el.textContent = (Math.abs(para - de) < 20 ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : Math.round(v).toLocaleString("pt-BR")) + (un ? " " + un : "");
      if (h.bpm && HH.bpm0) { const b = Math.round(HH.bpm0 + (h.bpm - HH.bpm0) * chegou); if (b !== est.bpm) { est.bpm = b; ctx.atuBpm(); } }
    }

    /* =====================================================================
       HTML dos cartões e ligação dos botões
       ===================================================================== */
    function cartaoAcoes() {
      const ac = [["pegar", "✋ Pegar um objeto"], ["chutar", "⚽ Chutar uma bola"], ["reflexo", "🔥 Tocar em algo quente"], ["ouvir", "👂 Ouvir e responder"], ["respirar", "🫁 Respirar e o coração bater"], ["susto", "😱 Levar um susto"]];
      return `<div class="cartao sim" id="simAcoes">
      <h3>⚡ Sistema nervoso em ação <span class="cod">EF06CI07 · EF06CI08 · EF06CI09</span></h3>
      <p class="muted">Escolha uma ação e acompanhe os <b>impulsos nervosos</b> no modelo 3D: dos órgãos dos sentidos ao encéfalo e à medula, e de lá aos músculos e órgãos.</p>
      <div class="grade-acoes">${ac.map(([k, n]) => `<button class="btn" data-acao="${k}">${n}</button>`).join("")}</div>
      <div class="legenda-sin"><span><i style="background:#4fc3f7"></i>sensitivo</span><span><i style="background:#ffe14d"></i>integração (SNC)</span><span><i style="background:#ff6e40"></i>motor</span><span><i style="background:#b388ff"></i>autônomo</span></div>
      <p class="mini-txt" id="acoesResumo"></p>
      <ol class="fis-passos" id="acoesPassos"></ol>
      <div class="medidores"><div><small>Tempo real da ação</small><b id="acoesTempo">—</b></div><div><small>Velocidade do impulso</small><b>até 120 m/s</b></div></div>
      <div class="destaque" id="acoesTxt">Toque numa ação para começar.</div>
      <div class="linha-btn"><button class="btn" id="acoesPausa">⏸ Pausar</button><button class="btn" id="acoesParar">⏹ Parar</button><label class="chk"><input type="checkbox" id="acoesLento"> Câmera lenta</label></div>
      <details><summary>Entenda</summary>
        <p>O <b>sistema nervoso central</b> (encéfalo e medula espinal) recebe as informações e decide; o <b>periférico</b> (nervos e gânglios) leva as informações e as ordens.</p>
        <p>Os <b>nervos sensitivos</b> (aferentes) levam informações dos receptores ao SNC; os <b>motores</b> (eferentes) levam as ordens aos músculos e glândulas. No <b>ato voluntário</b> o cérebro decide; no <b>reflexo</b> a medula responde sozinha; os atos do <b>sistema autônomo</b> (respirar, batimentos, digestão) acontecem sem você pensar.</p>
        <p>O impulso nervoso é uma onda elétrica que percorre o neurônio. Na <b>sinapse</b>, ele passa ao neurônio seguinte por meio de <b>neurotransmissores</b>. Nos nervos mais rápidos, o impulso chega a cerca de 120 m/s (mais de 400 km/h).</p>
      </details>
    </div>`;
    }
    function chipsDrogas() {
      return `<p class="mini-txt"><b>Ou escolha uma substância</b> para ver onde ela age no encéfalo:</p>
      <div class="chips-subst">${Object.entries(SUBST).map(([k, d]) => `<button class="btn chip" data-subst="${k}" style="--c:#${new T.Color(COR_TIPO[d.tipo]).getHexString()}">${d.nome.split(" (")[0]}</button>`).join("")}</div>
      <div class="det-subst" id="detSubst" hidden></div>`;
    }
    function cartaoHormonios() {
      return `<div class="cartao sim" id="simHorm">
      <h3>🧪 Hormônios em ação <span class="cod">EF08CI08 · EM13CNT207</span></h3>
      <p class="muted">Os hormônios são mensageiros químicos: saem da glândula, caem no <b>sangue</b> e agem só nas <b>células-alvo</b>, que têm receptores para eles. Escolha um hormônio:</p>
      <div class="chips-subst">${Object.entries(HORM).map(([k, h]) => `<button class="btn chip" data-horm="${k}" style="--c:#${new T.Color(h.cor).getHexString()}">${h.nome.split(" (")[0]}</button>`).join("")}</div>
      <div class="medidores"><div><small id="medHormNome">—</small><b id="medHorm">—</b></div></div>
      <div class="det-subst" id="detHorm" hidden></div>
      <div class="linha-btn"><button class="btn" id="hormParar">⏹ Parar</button></div>
      <details><summary>Entenda</summary>
        <p>O <b>sistema nervoso</b> age por impulsos elétricos, muito rápidos e de curta duração. O <b>sistema endócrino</b> age por hormônios levados pelo sangue: é mais lento, mas o efeito dura mais. Os dois trabalham juntos: o <b>hipotálamo</b> (sistema nervoso) comanda a <b>hipófise</b>, a “glândula-mestra”.</p>
        <p>A maioria dos hormônios é regulada por <b>retroalimentação negativa</b>: quando o efeito é atingido, a glândula diminui a produção, como um termostato.</p>
      </details>
    </div>`;
    }
    function ligar(s, clicarModo) {
      s.querySelectorAll("[data-acao]").forEach(b => b.onclick = () => { pararHormonio(); iniciarAcao(b.dataset.acao); });
      const bp = s.querySelector("#acoesPausa"); if (bp) bp.onclick = () => { NV.pausa = !NV.pausa; bp.textContent = NV.pausa ? "▶ Continuar" : "⏸ Pausar"; };
      const bpar = s.querySelector("#acoesParar"); if (bpar) bpar.onclick = () => { pararAcao(); s.querySelectorAll("[data-acao]").forEach(b => b.classList.remove("ativo")); };
      const bl = s.querySelector("#acoesLento"); if (bl) bl.onchange = e => { NV.lento = e.target.checked; };
      s.querySelectorAll("[data-subst]").forEach(b => b.onclick = () => { pararHormonio(); mostrarDroga(b.dataset.subst, s, clicarModo); });
      s.querySelectorAll("[data-horm]").forEach(b => b.onclick = () => iniciarHormonio(b.dataset.horm, s));
      const bh = s.querySelector("#hormParar"); if (bh) bh.onclick = () => { pararHormonio(); s.querySelectorAll("[data-horm]").forEach(b => b.classList.remove("ativo")); };
    }
    function limparDroga() { if (drogaAtual) { drogaAtual = null; marcar([]); etiquetar([]); document.querySelectorAll("[data-subst]").forEach(b => b.classList.remove("ativo")); const d = document.querySelector("#detSubst"); if (d) d.hidden = true; } }
    function passo(dt) {
      dt *= window.__fisVel || 1;   // (usado só nos testes automáticos)
      passoNervoso(dt); passoHormonio(dt);
      if (drogaAtual && marcadores.length) { const pul = 1 + 0.2 * Math.sin(performance.now() / 200); marcadores.forEach(m => m.scale.setScalar(pul)); }
      posEtiquetas();
    }
    function parar() { pararAcao(); pararHormonio(); limparDroga(); }
    // para os testes automáticos: vai direto a um passo de uma ação, num instante t (0 a 1)
    function _ir(k, i, t) { iniciarAcao(k); while (NV.passo < i && NV.ativa) proximoPasso(); NV.t = t; NV.pausa = true; NV.pulsos.forEach((pu, j) => moverPulso(pu, NV.curvas[j], t * 1.15)); }
    return { cartaoAcoes, chipsDrogas, cartaoHormonios, ligar, passo, parar, limparDroga, _ir };
  }
  return { criar };
})();
