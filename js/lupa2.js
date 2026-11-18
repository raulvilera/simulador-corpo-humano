/* =========================================================================
   CORPO HUMANO 3D — Lupa: outras estruturas em detalhe
   Acrescenta à "Lupa" (js/sentidos.js): encéfalo (lobos e áreas do córtex),
   coração (com corte), neurônio e sinapse, alvéolos pulmonares e néfron.
   O encéfalo e o coração usam as malhas reais do corpo (BodyParts3D/HuBMAP);
   neurônio, alvéolos e néfron são modelos didáticos, fora de escala.
   ========================================================================= */
(function () {
  if (!window.LUPA || !window.LUPA.registrar || !window.SENTIDOS) return;
  const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z);
  const D = window.DADOS;

  /* ---------- cores ---------- */
  Object.assign(window.SENTIDOS.PAL, {
    lobo_frontal: [0x6ea8e0, { roughness: 0.6, clearcoat: 0.25 }], lobo_parietal: [0xf0c552, { roughness: 0.6, clearcoat: 0.25 }],
    lobo_temporal: [0x7cc47c, { roughness: 0.6, clearcoat: 0.25 }], lobo_occipital: [0xe57fa6, { roughness: 0.6, clearcoat: 0.25 }],
    area_marca: [0xffffff, { roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.6 }],
    soma: [0xb98be0, { roughness: 0.45, clearcoat: 0.4 }], nucleo_n: [0x5b3fa0, { roughness: 0.4, clearcoat: 0.4 }], dendrito: [0xc9a2ec, { roughness: 0.45, clearcoat: 0.3 }],
    axonio: [0xa781d6, { roughness: 0.45, clearcoat: 0.3 }], mielina: [0xf3ecd2, { roughness: 0.35, clearcoat: 0.6 }], ranvier: [0xff9f43, { roughness: 0.4 }],
    terminal: [0xd99ef0, { roughness: 0.4, clearcoat: 0.4 }], vesicula: [0x4cc9f0, { roughness: 0.3, clearcoat: 0.5 }], seguinte: [0x9ec7f2, { roughness: 0.45, clearcoat: 0.3 }],
    receptor_n: [0x2ecc71, { roughness: 0.4 }], schwann_n: [0x8a6d3b, { roughness: 0.5 }],
    alveolo: [0xf2a7b3, { roughness: 0.55, transparent: true, opacity: 0.55, sheen: 0.4, sheenColor: 0xffd6dc }], bronquiolo: [0xe7b6a8, { roughness: 0.5, clearcoat: 0.3 }],
    capilar: [0xb03a5b, { roughness: 0.4, clearcoat: 0.4 }], arteriola_p: [0x3b5fc0, { roughness: 0.35, clearcoat: 0.5 }], venula_p: [0xd2343e, { roughness: 0.35, clearcoat: 0.5 }],
    capsula: [0xf6d6a8, { roughness: 0.45, transparent: true, opacity: 0.45, side: T.DoubleSide }], glomerulo: [0xc4212b, { roughness: 0.4, clearcoat: 0.5 }],
    tubulo_p: [0xf0b35a, { roughness: 0.45, clearcoat: 0.3 }], henle: [0x9ad06a, { roughness: 0.45, clearcoat: 0.3 }], tubulo_d: [0x5fc3c9, { roughness: 0.45, clearcoat: 0.3 }],
    coletor: [0xe9e36a, { roughness: 0.45, clearcoat: 0.3 }], peritubular: [0xd06c86, { roughness: 0.4, transparent: true, opacity: 0.6 }]
  });

  /* ---------- fichas das novas estruturas ---------- */
  const N = (orgao, sistema, nome, funcao, desc, curiosidade, saude) => ({ nome, sistema, orgao, soLupa: true, funcao, desc, curiosidade: curiosidade || "", saude: saude || "" });
  Object.assign(D.estruturas, {
    lobo_frontal: N("encefalo", "nervoso", "Lobo frontal", "Planejamento, decisões, autocontrole, personalidade, movimentos voluntários e produção da fala.", "Parte da frente de cada hemisfério cerebral, até o sulco central. Na sua parte de trás fica o córtex motor; na de baixo, do lado esquerdo, a área de Broca (fala). A região da testa é o córtex pré-frontal.", "O córtex pré-frontal é a última parte do cérebro a amadurecer, por volta dos 25 anos.", "Álcool e outras drogas prejudicam primeiro o autocontrole comandado pelo lobo frontal."),
    lobo_parietal: N("encefalo", "nervoso", "Lobo parietal", "Recebe e interpreta o tato, a temperatura, a dor e a posição do corpo; orientação no espaço.", "Fica atrás do sulco central, no alto da cabeça. Logo atrás do sulco está o córtex somestésico, com um “mapa” do corpo inteiro.", "As mãos e os lábios ocupam uma área enorme desse mapa: por isso são tão sensíveis."),
    lobo_temporal: N("encefalo", "nervoso", "Lobo temporal", "Audição, compreensão da linguagem (área de Wernicke), memória e reconhecimento de rostos e objetos.", "Fica na lateral de cada hemisfério, na altura das orelhas, abaixo do sulco lateral. Na sua face interna ficam o hipocampo (memória) e a amígdala (emoções).", "Quem tem lesão na área de Wernicke fala com fluência, mas as frases ficam sem sentido."),
    lobo_occipital: N("encefalo", "nervoso", "Lobo occipital", "Visão: interpreta as imagens que chegam dos olhos (cores, formas e movimento).", "Parte de trás de cada hemisfério, na nuca. Recebe as fibras que vêm da retina passando pelo nervo óptico e pelo tálamo.", "Uma pancada forte na nuca pode fazer “ver estrelas”: é o córtex visual sendo estimulado."),
    dendritos: N("neuronio", "nervoso", "Dendritos", "Recebem os sinais de outros neurônios ou dos receptores dos sentidos.", "Prolongamentos curtos e muito ramificados que saem do corpo celular. Têm receptores para os neurotransmissores.", "Um único neurônio pode receber sinais de até 10 mil outros neurônios."),
    corpo_celular: N("neuronio", "nervoso", "Corpo celular", "Centro de controle do neurônio: produz energia e proteínas e soma os sinais recebidos.", "Parte mais larga do neurônio, onde ficam o núcleo e a maior parte das organelas.", "Os corpos celulares formam a substância cinzenta do encéfalo e da medula."),
    nucleo_neuronio: N("neuronio", "nervoso", "Núcleo", "Guarda o material genético (DNA) e comanda as atividades da célula.", "Fica no corpo celular. A maioria dos neurônios não se divide mais depois de formada.", "Por isso as lesões no sistema nervoso central são difíceis de recuperar."),
    axonio: N("neuronio", "nervoso", "Axônio", "Conduz o impulso nervoso do corpo celular até as terminações, em direção a outra célula.", "Prolongamento único e longo, que começa no cone de implantação. Pode ter menos de 1 mm ou mais de 1 metro (da medula até o dedão do pé).", "Os axônios são como “fios” do sistema nervoso; os nervos são feixes de milhares de axônios."),
    bainha_mielina: N("neuronio", "nervoso", "Bainha de mielina", "Isola o axônio e faz o impulso “saltar” entre os nódulos: a condução fica muito mais rápida.", "Camadas de membrana, ricas em gordura, enroladas em volta do axônio. Nos nervos é formada pelas células de Schwann; no encéfalo e na medula, pelos oligodendrócitos.", "Com mielina o impulso chega a ~120 m/s; sem ela, a cerca de 1 m/s.", "Na esclerose múltipla, o próprio sistema de defesa ataca a mielina e os impulsos ficam lentos ou falham."),
    nodulo_ranvier: N("neuronio", "nervoso", "Nódulos de Ranvier", "Pontos onde o impulso é regenerado: ele salta de um nódulo para o seguinte (condução saltatória).", "Pequenos intervalos sem mielina entre duas células de Schwann, onde a membrana do axônio fica exposta.", ""),
    terminal_axonico: N("neuronio", "nervoso", "Terminações do axônio (botões sinápticos)", "Liberam os neurotransmissores na sinapse.", "Ramificações no fim do axônio, com dilatações (botões) cheias de vesículas de neurotransmissor.", ""),
    sinapse: N("neuronio", "nervoso", "Sinapse", "Passa o sinal de um neurônio para outra célula.", "Região de comunicação entre o botão sináptico e a célula seguinte, separados por uma fenda de cerca de 20 nanômetros. O impulso elétrico libera neurotransmissores (sinal químico), que se ligam aos receptores do outro lado.", "Muitas drogas e remédios agem justamente nas sinapses."),
    neuronio_seguinte: N("neuronio", "nervoso", "Neurônio seguinte", "Recebe o sinal pela sinapse e pode gerar um novo impulso.", "Seus dendritos têm receptores que se encaixam nos neurotransmissores, como chave e fechadura.", ""),
    bronquiolo: N("alveolos", "respiratorio", "Bronquíolo", "Leva o ar até os alvéolos.", "Os brônquios se ramificam cerca de 23 vezes, formando tubos cada vez mais finos (menos de 1 mm), os bronquíolos, que terminam nos ductos e sacos alveolares.", ""),
    alveolos_p: N("alveolos", "respiratorio", "Alvéolos pulmonares", "Local da hematose: o oxigênio passa do ar para o sangue e o gás carbônico, do sangue para o ar.", "Pequenas bolsas de parede finíssima (uma só camada de células), agrupadas em cachos. Os dois pulmões têm cerca de 300 a 500 milhões de alvéolos.", "Abertos, os alvéolos cobririam cerca de 70 m², quase uma quadra de vôlei.", "O cigarro destrói as paredes dos alvéolos (enfisema): a área de trocas diminui e falta ar."),
    capilares_p: N("alveolos", "respiratorio", "Capilares pulmonares", "Envolvem os alvéolos; o sangue chega pobre em O₂ e sai rico em O₂.", "Vasos finíssimos, por onde as hemácias passam quase em fila. A distância entre o ar e o sangue é menor que 1 milésimo de milímetro.", ""),
    arteriola_pulmonar: N("alveolos", "respiratorio", "Arteríola pulmonar", "Traz o sangue pobre em oxigênio, vindo do lado direito do coração.", "Ramo da artéria pulmonar. É a única artéria do corpo que leva sangue pobre em O₂ (por isso aparece em azul).", ""),
    venula_pulmonar: N("alveolos", "respiratorio", "Vênula pulmonar", "Leva o sangue rico em oxigênio para o lado esquerdo do coração.", "Os capilares se juntam em vênulas e depois nas veias pulmonares, as únicas veias com sangue rico em O₂.", ""),
    glomerulo: N("nefron", "urinario", "Glomérulo", "Filtra o sangue: água, sais, glicose, ureia e outras pequenas moléculas passam para a cápsula.", "Novelo de capilares entre a arteríola aferente (que chega) e a eferente (que sai). Células do sangue e proteínas grandes não passam.", "Os rins filtram cerca de 180 litros de sangue por dia.", "Pressão alta e diabetes podem lesar os glomérulos: é preciso controlar as duas doenças."),
    capsula_bowman: N("nefron", "urinario", "Cápsula de Bowman (glomerular)", "Recebe o filtrado que sai do glomérulo.", "Taça de parede dupla que envolve o glomérulo. Glomérulo + cápsula = corpúsculo renal.", ""),
    tubulo_proximal: N("nefron", "urinario", "Túbulo contorcido proximal", "Reabsorve a maior parte do que é útil: toda a glicose, aminoácidos, sais e cerca de 65% da água.", "Tubo enrolado logo depois da cápsula, com células cheias de microvilosidades e mitocôndrias.", "Quando há glicose demais no sangue (diabetes), o túbulo não dá conta e sobra glicose na urina."),
    alca_henle: N("nefron", "urinario", "Alça de Henle (néfrica)", "Concentra a urina: reabsorve água e sais, criando um meio salgado no interior do rim.", "Tubo em forma de U que desce até a medula renal e volta.", ""),
    tubulo_distal: N("nefron", "urinario", "Túbulo contorcido distal", "Ajuste fino: reabsorve sais e secreta substâncias, sob a ação de hormônios.", "Segundo trecho enrolado, que volta para perto do glomérulo e desemboca no ducto coletor.", ""),
    ducto_coletor: N("nefron", "urinario", "Ducto coletor", "Recebe a urina de vários néfrons e decide quanta água ainda volta para o sangue.", "Tubo reto que atravessa a medula renal até a pelve do rim. O hormônio ADH abre canais de água nas suas células.", "Com pouca água no corpo, o ADH aumenta e a urina fica escura e concentrada."),
    arteriolas_rim: N("nefron", "urinario", "Arteríolas aferente e eferente", "A aferente leva sangue ao glomérulo; a eferente sai dele e forma os capilares em volta dos túbulos.", "A aferente é mais larga que a eferente: isso mantém a pressão alta dentro do glomérulo e força a filtração.", ""),
    capilares_peritubulares: N("nefron", "urinario", "Capilares peritubulares", "Recebem de volta as substâncias reabsorvidas pelos túbulos.", "Rede de capilares em volta dos túbulos, formada a partir da arteríola eferente.", "")
  });
  // fichas gerais de cada vista (aparecem ao abrir a vista na lupa)
  Object.assign(D.estruturas, {
    encefalo: Object.assign(N(null, "nervoso", "Encéfalo", "Centro de controle do corpo: recebe as informações dos sentidos, decide, guarda memórias e comanda movimentos, emoções e funções vitais.", "Formado pelo cérebro (dois hemisférios, cada um com os lobos frontal, parietal, temporal e occipital), pelo cerebelo e pelo tronco encefálico. Fica protegido pelo crânio, pelas meninges e pelo líquido cefalorraquidiano.", "O encéfalo tem cerca de 86 bilhões de neurônios e usa cerca de 20% da energia do corpo, mesmo pesando só uns 1,4 kg.", "Use capacete na bicicleta, no skate e na moto: lesões no encéfalo podem ser permanentes."), { lupa: "encefalo" }),
    neuronio: Object.assign(N(null, "nervoso", "Neurônio", "Célula do sistema nervoso: recebe, conduz e transmite impulsos nervosos.", "Formado por dendritos (recebem sinais), corpo celular (com o núcleo) e axônio (conduz o impulso), que termina em botões sinápticos. Muitos axônios são cobertos pela bainha de mielina.", "Os neurônios se comunicam por sinapses: cada um pode fazer milhares de conexões."), { lupa: "neuronio" }),
    alveolos: Object.assign(N(null, "respiratorio", "Alvéolos pulmonares", "Local onde acontecem as trocas gasosas entre o ar e o sangue (hematose).", "Os bronquíolos terminam em cachos de pequenas bolsas, os alvéolos, envolvidos por uma rede de capilares sanguíneos.", "São de 300 a 500 milhões de alvéolos nos dois pulmões."), { lupa: "alveolos" }),
    nefron: Object.assign(N(null, "urinario", "Néfron", "Unidade funcional do rim: filtra o sangue e forma a urina.", "Formado pelo corpúsculo renal (glomérulo + cápsula de Bowman) e por um longo túbulo (proximal, alça de Henle e distal), que desemboca no ducto coletor.", "Cada rim tem cerca de 1 milhão de néfrons."), { lupa: "nefron" })
  });
  // fichas do corpo que ganham o botão "Ver em detalhe"
  [["coracao", "coracao"], ["cerebro", "encefalo"], ["cerebelo", "encefalo"], ["tronco_encefalico", "encefalo"], ["pulmao_d", "alveolos"], ["pulmao_e", "alveolos"], ["bronquios", "alveolos"], ["rim_d", "nefron"], ["rim_e", "nefron"]]
    .forEach(([id, l]) => { if (D.estruturas[id] && !D.estruturas[id].lupa) D.estruturas[id].lupa = l; });

  /* ---------- utilidades ---------- */
  function cil(H, a, b, r, id, key, r2) { const d = b.clone().sub(a), m = new T.Mesh(new T.CylinderGeometry(r2 == null ? r : r2, r, d.length(), 18, 1), H.M(id, key)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return H.marca(m, id); }
  function subGeo(geo, teste) {   // separa os triângulos de uma geometria conforme um rótulo
    const pos = geo.attributes.position, I = geo.index.array, grupos = {};
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      const k = teste((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3);
      (grupos[k] = grupos[k] || []).push(a, b, c);
    }
    const out = {};
    Object.entries(grupos).forEach(([k, idx]) => { const g = new T.BufferGeometry(); g.setAttribute("position", pos); if (geo.attributes.normal) g.setAttribute("normal", geo.attributes.normal); g.setIndex(idx); out[k] = g; });
    return out;
  }
  const brilho = (lista, v, cor) => lista.forEach(m => { if (m.material.emissive) { m.material.emissive.setHex(cor); m.material.emissiveIntensity = v; } });
  const malhasDe = (ctx, id) => ctx.malhas.filter(m => m.userData.id === id);

  /* =====================================================================
     ENCÉFALO: lobos coloridos e áreas funcionais do córtex
     ===================================================================== */
  window.LUPA.registrar("encefalo", {
    nome: "Encéfalo", icone: "🧠", inclui: ["cerebelo", "tronco_encefalico", "hipofise", "hipotalamo", "pineal", "medula", "nervo_optico"],
    montar: async H => {
      const raiz = new T.Group();
      const pecas = H.clonarDoCorpo(["cerebro", "cerebelo", "tronco_encefalico", "hipofise", "hipotalamo", "pineal", "nervo_optico", "medula"], (x, y) => y > 14.9);
      const cxb = new T.Box3(); pecas.filter(p => p.id === "cerebro").forEach(p => { p.geo.computeBoundingBox(); cxb.union(p.geo.boundingBox); });
      const c = cxb.getCenter(V(0, 0, 0)), E = 5;
      pecas.forEach(p => {
        if (p.id === "cerebro") {
          // lobos: separados pela posição (sulco central inclinado, sulco lateral e polo occipital)
          const lobos = subGeo(p.geo, (x, y, z) => z < -0.72 ? "lobo_occipital" : (y < 16.42 && Math.abs(x) > 0.24 && z < 0.42) ? "lobo_temporal" : z > -0.32 + (16.95 - y) * 0.25 ? "lobo_frontal" : "lobo_parietal");
          Object.entries(lobos).forEach(([id, g]) => { const m = new T.Mesh(g, H.M(id, id)); H.marca(m, id); raiz.add(m); });
        } else { const m = new T.Mesh(p.geo, H.M(p.id, p.key)); H.marca(m, p.id); raiz.add(m); }
      });
      raiz.children.forEach(m => { m.geometry = m.geometry.clone(); m.geometry.translate(-c.x, -c.y, -c.z); m.geometry.scale(E, E, E); m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere(); });
      // áreas funcionais do córtex (hemisfério esquerdo, x > 0), presas à superfície
      const sup = raiz.children.filter(m => /^lobo_/.test(m.userData.id)), vv = V(0, 0, 0);
      const naSuperficie = p => { const q = V((p[0] - c.x) * E, (p[1] - c.y) * E, (p[2] - c.z) * E); let best = null, bd = 1e9; sup.forEach(m => { const a = m.geometry.attributes.position, I = m.geometry.index.array; for (let i = 0; i < I.length; i += 9) { vv.fromBufferAttribute(a, I[i]); const d = vv.distanceToSquared(q); if (d < bd) { bd = d; best = vv.clone(); } } }); return best.add(best.clone().sub(V(0, 0, 0)).setLength(0.05)); };
      const AREAS = {
        motor: { nome: "Córtex motor", lobo: "lobo_frontal", cor: 0xff6e40, pts: [[0.58, 16.6, -0.1], [0.45, 16.85, -0.17], [0.25, 17.0, -0.23], [0.66, 16.4, -0.04]], txt: "<b>Córtex motor</b> (parte de trás do lobo frontal): comanda os <b>movimentos voluntários</b>. O hemisfério esquerdo move o lado direito do corpo, e vice-versa." },
        tato: { nome: "Córtex somestésico", lobo: "lobo_parietal", cor: 0x4fc3f7, pts: [[0.6, 16.6, -0.38], [0.46, 16.85, -0.44], [0.26, 16.98, -0.48], [0.66, 16.42, -0.3]], txt: "<b>Córtex somestésico</b> (início do lobo parietal): recebe o <b>tato, a dor, a temperatura</b> e a posição do corpo." },
        visao: { nome: "Córtex visual", lobo: "lobo_occipital", cor: 0xe57fa6, pts: [[0.2, 16.45, -1.06], [0.35, 16.6, -0.98], [0.12, 16.25, -1.0]], txt: "<b>Córtex visual</b> (lobo occipital, na nuca): forma as imagens que chegam dos olhos." },
        audicao: { nome: "Córtex auditivo", lobo: "lobo_temporal", cor: 0x7cc47c, pts: [[0.68, 16.33, -0.25], [0.7, 16.3, -0.05]], txt: "<b>Córtex auditivo</b> (lobo temporal, perto da orelha): percebe os sons." },
        fala: { nome: "Áreas de Broca e Wernicke", lobo: null, cor: 0xffd54f, pts: [[0.62, 16.4, 0.3], [0.64, 16.45, -0.55]], txt: "<b>Linguagem</b> (geralmente no hemisfério esquerdo): a <b>área de Wernicke</b> (temporal) entende as palavras e a <b>área de Broca</b> (frontal) planeja a fala." },
        decisao: { nome: "Córtex pré-frontal", lobo: "lobo_frontal", cor: 0x6ea8e0, pts: [[0.25, 16.75, 0.6], [0.4, 16.55, 0.62], [0.1, 16.9, 0.45]], txt: "<b>Córtex pré-frontal</b> (testa): planejamento, decisões, atenção e <b>autocontrole</b>." },
        equilibrio: { nome: "Cerebelo", lobo: "cerebelo", cor: 0xd99c97, pts: [], txt: "<b>Cerebelo</b>: equilíbrio, postura e coordenação dos movimentos (andar de bicicleta, escrever, chutar)." },
        vital: { nome: "Tronco encefálico", lobo: "tronco_encefalico", cor: 0xe4bfac, pts: [], txt: "<b>Tronco encefálico</b> (mesencéfalo, ponte e bulbo): controla a <b>respiração, os batimentos</b>, a pressão, a deglutição e o vômito; liga o cérebro à medula." },
        hormonios: { nome: "Hipotálamo e hipófise", lobo: "hipotalamo", cor: 0xb388ff, pts: [], txt: "<b>Hipotálamo</b>: temperatura, fome, sede, sono e emoções; comanda a <b>hipófise</b>, a glândula-mestra do sistema endócrino." }
      };
      const marcas = new T.Group(); raiz.add(marcas);
      let ativo = null, t = 0;
      const demo = {
        montar(el) {
          el.innerHTML = `<div class="lupa-demo-tit">🧠 Áreas do encéfalo e suas funções</div>
            <div class="chips">${Object.entries(AREAS).map(([k, a]) => `<button class="chip" data-area="${k}">${a.nome}</button>`).join("")}<button class="chip" data-area="x">Limpar</button></div>
            <p class="mini-txt" id="txtArea">Cores dos lobos: <b style="color:#6ea8e0">frontal</b>, <b style="color:#f0c552">parietal</b>, <b style="color:#7cc47c">temporal</b> e <b style="color:#e57fa6">occipital</b>. Escolha uma função para ver onde ela acontece. Use ✂️ Corte para ver o interior.</p>`;
          el.querySelectorAll("[data-area]").forEach(b => b.onclick = () => {
            el.querySelectorAll("[data-area]").forEach(x => x.classList.toggle("ativo", x === b));
            while (marcas.children.length) marcas.remove(marcas.children[0]);
            Object.values(AREAS).forEach(a => a.lobo && brilho(malhasDe(H.ctx, a.lobo), 0, 0));
            if (b.dataset.area === "x") { ativo = null; return; }
            ativo = AREAS[b.dataset.area]; t = 0; el.querySelector("#txtArea").innerHTML = ativo.txt;
            ativo.pts.forEach(p => { const m = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshBasicMaterial({ color: ativo.cor, transparent: true, opacity: 0.9, depthTest: false })); m.renderOrder = 10; m.position.copy(naSuperficie(p)); marcas.add(m); });
          });
        },
        passo(dt) {
          if (!ativo) return; t += dt; const k = 0.75 + 0.25 * Math.sin(t * 5);
          marcas.children.forEach(m => m.scale.setScalar(k));
          if (ativo.lobo && H.ctx.sel !== ativo.lobo) brilho(malhasDe(H.ctx, ativo.lobo), 0.25 + 0.2 * Math.sin(t * 5), ativo.cor);
        }
      };
      return { raiz, cam: [V(9, 3.5, 7), V(0, -0.5, 0)], corte: false, demo };
    }
  });

  /* =====================================================================
     CORAÇÃO: malha real com corte e batimentos
     ===================================================================== */
  window.LUPA.registrar("coracao", {
    nome: "Coração", icone: "❤️", inclui: ["aorta", "veia_cava", "pulmonares_v"],
    montar: async H => {
      const raiz = new T.Group(), giro = new T.Group(); raiz.add(giro);
      const perto = (x, y, z) => y > 12.45 && y < 14.1 && x > -0.55 && x < 0.95 && z > -0.45 && z < 0.85;
      const pecas = H.clonarDoCorpo(["coracao", "aorta", "veia_cava", "pulmonares_v"], perto);
      const cx = new T.Box3(); pecas.filter(p => p.id === "coracao").forEach(p => { p.geo.computeBoundingBox(); cx.union(p.geo.boundingBox); });
      const c = cx.getCenter(V(0, 0, 0)), E = 5;
      pecas.forEach(p => { p.geo.translate(-c.x, -c.y, -c.z); p.geo.scale(E, E, E); p.geo.computeVertexNormals(); const m = new T.Mesh(p.geo, H.M(p.id, p.key)); H.marca(m, p.id); giro.add(m); });
      // o corte da lupa é feito no plano x = 0: girando o coração 90°, ele mostra as quatro cavidades (corte frontal)
      giro.rotation.y = Math.PI / 2;
      const cor = giro.children.filter(m => m.userData.id === "coracao");
      let bate = false, t = 0, bpm = 72;
      const demo = {
        montar(el) {
          el.innerHTML = `<div class="lupa-demo-tit">❤️ Coração: cavidades e batimentos</div>
            <div class="chips"><button class="chip" id="btnBate">▶ Bater</button><button class="chip" data-bpm="60">Repouso</button><button class="chip" data-bpm="150">Exercício</button></div>
            <p class="mini-txt" id="txtCor">Com o <b>✂️ Corte</b> ligado você vê o interior: à sua esquerda ficam o <b>átrio e o ventrículo direitos</b> (sangue pobre em O₂, que vai aos pulmões) e à direita o <b>átrio e o ventrículo esquerdos</b> (sangue rico em O₂, que vai ao corpo pela aorta). A parede do ventrículo esquerdo é a mais grossa: ele bombeia para o corpo inteiro. As <b>valvas</b> impedem que o sangue volte.</p>`;
          el.querySelector("#btnBate").onclick = e => { bate = !bate; e.currentTarget.textContent = bate ? "⏸ Parar" : "▶ Bater"; if (!bate) { cor.forEach(m => m.scale.setScalar(1)); brilho(cor, 0, 0); } };
          el.querySelectorAll("[data-bpm]").forEach(b => b.onclick = () => { bpm = +b.dataset.bpm; bate = true; el.querySelector("#btnBate").textContent = "⏸ Parar"; el.querySelector("#txtCor").innerHTML = `<b>${bpm} batimentos por minuto.</b> ${bpm > 100 ? "No exercício os músculos precisam de mais O₂: o coração bate mais rápido e mais forte." : "Em repouso, cada batimento bombeia cerca de 70 mL de sangue."} Cada batimento tem a <b>sístole</b> (contração: o sangue sai) e a <b>diástole</b> (relaxamento: o coração se enche).`; });
        },
        passo(dt) {
          if (!bate) return; t += dt * bpm / 60; const f = t % 1;
          const s = f < 0.12 ? 1 + 0.05 * Math.sin(f / 0.12 * Math.PI) : f > 0.18 && f < 0.42 ? 1 - 0.07 * Math.sin((f - 0.18) / 0.24 * Math.PI) : 1;
          cor.forEach(m => m.scale.setScalar(s));
          if (H.ctx.sel !== "coracao") brilho(cor, s < 1 ? (1 - s) * 5 : 0, 0xff3b30);
        }
      };
      return { raiz, cam: [V(9, 2, 4), V(0, 0, 0)], corte: true, demo };
    }
  });

  /* =====================================================================
     NEURÔNIO E SINAPSE (modelo didático)
     ===================================================================== */
  window.LUPA.registrar("neuronio", {
    nome: "Neurônio", icone: "⚡",
    montar: async H => {
      const raiz = new T.Group(), { M, marca, tubo, esfera } = H;
      let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
      const soma = esfera(M, V(-7, 0, 0), 1.25, "corpo_celular", "soma", [1.1, 0.95, 1]); raiz.add(soma);
      raiz.add(esfera(M, V(-7.1, 0.05, 0), 0.5, "nucleo_neuronio", "nucleo_n"));
      // dendritos ramificados
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.55 + i / 6 * Math.PI * 0.95, d = V(Math.cos(a), Math.sin(a), (R() - 0.5) * 0.8).normalize();
        const p0 = V(-7, 0, 0).addScaledVector(d, 1.1), p1 = p0.clone().addScaledVector(d, 1.6).add(V(0, R() - 0.5, R() - 0.5)), p2 = p1.clone().addScaledVector(d, 1.4);
        raiz.add(tubo(M, [p0, p1, p2], 0.13, "dendritos", "dendrito"));
        for (let j = 0; j < 3; j++) { const q = p1.clone().addScaledVector(V(R() - 0.5, R() - 0.5, R() - 0.5).add(d).normalize(), 1.1 + R() * 0.6); raiz.add(tubo(M, [p1, p1.clone().lerp(q, 0.5).add(V(0, 0.2, 0)), q], 0.06, "dendritos", "dendrito")); }
      }
      // cone de implantação e axônio
      raiz.add(cil(H, V(-5.85, 0, 0), V(-5.0, 0, 0), 0.18, "axonio", "axonio", 0.45));
      raiz.add(cil(H, V(-5.0, 0, 0), V(6.2, 0, 0), 0.17, "axonio", "axonio"));
      // bainha de mielina (células de Schwann) e nódulos de Ranvier
      const nos = [], seg = 1.7, gap = 0.3; let x = -4.7;
      while (x + seg < 5.8) {
        const m = new T.Mesh(new T.CapsuleGeometry(0.4, seg - 0.8, 6, 18), M("bainha_mielina", "mielina")); m.rotation.z = Math.PI / 2; m.position.set(x + seg / 2, 0, 0); raiz.add(marca(m, "bainha_mielina"));
        raiz.add(esfera(M, V(x + seg / 2, 0.42, 0.05), 0.09, "bainha_mielina", "schwann_n", [1.6, 0.6, 1]));
        x += seg + gap; if (x < 5.8) { const n = new T.Mesh(new T.TorusGeometry(0.2, 0.05, 8, 20), M("nodulo_ranvier", "ranvier")); n.rotation.y = Math.PI / 2; n.position.set(x - gap / 2, 0, 0); raiz.add(marca(n, "nodulo_ranvier")); nos.push(x - gap / 2); }
      }
      // terminações e botões sinápticos
      const botoes = [];
      [[0.9, 0.5], [0, 0], [-0.9, -0.4]].forEach(([dy, dz]) => {
        const fim = V(7.6, dy, dz); raiz.add(tubo(M, [V(6.2, 0, 0), V(6.9, dy * 0.6, dz * 0.6), fim], 0.08, "terminal_axonico", "terminal"));
        const b = esfera(M, fim.clone().add(V(0.25, 0, 0)), 0.33, "terminal_axonico", "terminal"); raiz.add(b); botoes.push(b);
      });
      // sinapse ampliada: botão grande com vesículas, fenda e dendrito do neurônio seguinte com receptores
      const BS = V(9.4, -2.6, 0);
      const bot = new T.Mesh(new T.SphereGeometry(1.1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), M("sinapse", "terminal")); bot.rotation.z = -Math.PI / 2; bot.position.copy(BS); raiz.add(marca(bot, "sinapse"));
      bot.material.transparent = true; bot.material.opacity = 0.55; bot.material.side = T.DoubleSide;
      raiz.add(tubo(M, [V(7.85, 0, 0), V(8.4, -1.2, 0), BS.clone().add(V(-1.0, 0, 0))], 0.1, "sinapse", "terminal"));
      const ves = []; for (let i = 0; i < 12; i++) { const v = esfera(M, BS.clone().add(V(-0.2 - R() * 0.6, (R() - 0.5) * 1.2, (R() - 0.5) * 1.2)), 0.11, "sinapse", "vesicula"); raiz.add(v); ves.push({ m: v, p0: v.position.clone() }); }
      const den = new T.Mesh(new T.SphereGeometry(1.0, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), M("neuronio_seguinte", "seguinte")); den.rotation.z = Math.PI / 2; den.position.copy(BS).add(V(1.55, 0, 0)); raiz.add(marca(den, "neuronio_seguinte"));
      raiz.add(tubo(M, [den.position.clone().add(V(0.9, 0, 0)), den.position.clone().add(V(2.4, -0.6, 0))], 0.32, "neuronio_seguinte", "seguinte"));
      const recs = []; for (let i = 0; i < 7; i++) { const a = -0.8 + i * 0.27, r = new T.Mesh(new T.BoxGeometry(0.1, 0.16, 0.16), M("neuronio_seguinte", "receptor_n")); r.position.set(BS.x + 0.55, BS.y + Math.sin(a) * 0.95, Math.cos(a) * 0.3); raiz.add(marca(r, "neuronio_seguinte")); recs.push(r); }
      const nts = []; for (let i = 0; i < 18; i++) { const m = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), new T.MeshBasicMaterial({ color: 0xff5ea8 })); m.visible = false; raiz.add(m); nts.push({ m, f: -1, y: (R() - 0.5) * 1.4, z: (R() - 0.5) * 0.5 }); }
      // impulso
      const imp = new T.Mesh(new T.SphereGeometry(0.32, 16, 12), new T.MeshBasicMaterial({ color: 0xfff176, transparent: true, opacity: 0.85, depthTest: false })); imp.renderOrder = 10; imp.visible = false; raiz.add(imp);
      let modo = null, t = 0;
      const demo = {
        montar(el) {
          el.innerHTML = `<div class="lupa-demo-tit">⚡ Impulso nervoso e sinapse</div>
            <div class="chips"><button class="chip" data-imp="mielina">Com mielina (saltatória)</button><button class="chip" data-imp="sem">Sem mielina (lenta)</button><button class="chip" data-imp="x">Parar</button></div>
            <p class="mini-txt" id="txtNeu">O impulso nasce no cone de implantação e percorre o axônio. Na <b>sinapse</b> (ampliada à direita, embaixo), as <b>vesículas</b> liberam <b>neurotransmissores</b> (rosa), que atravessam a fenda e se encaixam nos <b>receptores</b> (verde) do neurônio seguinte.</p>`;
          el.querySelectorAll("[data-imp]").forEach(b => b.onclick = () => {
            el.querySelectorAll("[data-imp]").forEach(x => x.classList.toggle("ativo", x === b && b.dataset.imp !== "x"));
            modo = b.dataset.imp === "x" ? null : b.dataset.imp; t = 0; imp.visible = !!modo;
            malhasDe(H.ctx, "bainha_mielina").forEach(m => m.visible = modo !== "sem");
            if (!modo) { malhasDe(H.ctx, "bainha_mielina").forEach(m => m.visible = true); nts.forEach(n => n.m.visible = false); brilho(recs, 0, 0); }
            el.querySelector("#txtNeu").innerHTML = modo === "sem" ? "<b>Sem bainha de mielina</b>, o impulso precisa percorrer toda a membrana do axônio, ponto a ponto: a condução é lenta (cerca de 0,5 a 2 m/s), como nas fibras da dor “em queimação”." : modo ? "<b>Condução saltatória:</b> a mielina isola o axônio e o impulso salta de um <b>nódulo de Ranvier</b> para o seguinte. É muito mais rápido: até cerca de 120 m/s." : el.querySelector("#txtNeu").innerHTML;
          });
        },
        passo(dt) {
          if (!modo) return; t += dt;
          const durAx = modo === "sem" ? 5 : 1.6, ciclo = durAx + 2.6, f = t % ciclo;
          if (f < durAx) {
            const k = f / durAx; let xx;
            if (modo === "sem") xx = -5.6 + k * 11.8;
            else { const pts = [-5.6, ...nos, 6.2], i = Math.min(pts.length - 2, Math.floor(k * (pts.length - 1))), u = k * (pts.length - 1) - i; xx = pts[i] + (pts[i + 1] - pts[i]) * (u < 0.25 ? u / 0.25 : 1); }
            imp.visible = true; imp.position.set(xx, 0, 0); imp.scale.setScalar(modo === "sem" ? 0.75 : 1);
          } else {
            imp.visible = false; const g = (f - durAx) / 2.6;
            brilho(botoes, g < 0.3 ? 0.6 : 0, 0xfff176);
            ves.forEach((v, i) => { const s = Math.min(1, g * 2.5); v.m.position.copy(v.p0).lerp(V(BS.x + 0.35, v.p0.y * 0.8, v.p0.z * 0.6), i % 2 ? s : s * 0.5); });
            nts.forEach((n, i) => { const h = Math.max(0, (g - 0.25 - i * 0.012) * 2.2); n.m.visible = h > 0 && h < 1.4; n.m.position.set(BS.x + 0.38 + Math.min(1, h) * 0.12, BS.y + n.y * 0.6, n.z); });
            brilho(recs, g > 0.55 ? 0.8 : 0, 0x2ecc71);
            if (H.ctx.sel !== "neuronio_seguinte") brilho(malhasDe(H.ctx, "neuronio_seguinte").filter(m => !recs.includes(m)), g > 0.65 ? 0.35 * Math.sin((g - 0.65) / 0.35 * Math.PI) : 0, 0xfff176);
          }
        }
      };
      return { raiz, cam: [V(1.5, 3, 19), V(1.5, -0.8, 0)], corte: false, demo };
    }
  });

  /* =====================================================================
     ALVÉOLOS PULMONARES (modelo didático)
     ===================================================================== */
  window.LUPA.registrar("alveolos", {
    nome: "Alvéolos", icone: "🫁",
    montar: async H => {
      const raiz = new T.Group(), { M, marca, tubo, esfera } = H;
      let rnd = 11; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
      raiz.add(tubo(M, [V(0, 7, 0), V(0, 4.5, 0), V(0, 3, 0)], 0.55, "bronquiolo", "bronquiolo"));
      const sacos = [V(-2.6, -0.6, 0.4), V(2.5, -0.4, -0.3), V(0.1, -2.6, 0.2)], alv = [];
      sacos.forEach(s => {
        raiz.add(tubo(M, [V(0, 3, 0), V(0, 3, 0).lerp(s, 0.5).add(V(0, 0.4, 0)), s], 0.35, "bronquiolo", "bronquiolo"));
        for (let i = 0; i < 9; i++) { const d = V(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), p = s.clone().addScaledVector(d, 1.0 + R() * 0.25); const a = esfera(M, p, 0.62 + R() * 0.15, "alveolos_p", "alveolo"); raiz.add(a); alv.push(a); }
      });
      // arteríola (azul) e vênula (vermelha) com a rede de capilares em volta dos alvéolos
      raiz.add(tubo(M, [V(-6, 5, -1.5), V(-4, 3.2, -1.2), V(-2.6, 1.2, -1.0)], 0.28, "arteriola_pulmonar", "arteriola_p"));
      raiz.add(tubo(M, [V(2.6, 1.3, -1.1), V(4.2, 3.2, -1.3), V(6, 5, -1.5)], 0.3, "venula_pulmonar", "venula_p"));
      const caps = [];
      alv.forEach((a, i) => {
        const p = a.position, r = a.geometry.parameters.radius * 1.03, ang = R() * Math.PI;
        const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10 * Math.PI * 1.6 + ang; pts.push(p.clone().add(V(Math.cos(u) * r, Math.sin(u * 0.7) * r * 0.6, Math.sin(u) * r))); }
        const c = tubo(M, pts, 0.045, "capilares_p", "capilar"); raiz.add(c); caps.push(c);
      });
      [[V(-2.6, 1.2, -1.0), sacos[0]], [V(-2.6, 1.2, -1.0), sacos[2]], [sacos[0], V(2.6, 1.3, -1.1)], [sacos[1], V(2.6, 1.3, -1.1)], [sacos[2], sacos[1]]].forEach(([a, b]) => raiz.add(tubo(M, [a, a.clone().lerp(b, 0.5).add(V(0, -0.3, -0.9)), b], 0.06, "capilares_p", "capilar")));
      // gases: O₂ (azul-claro) entra no sangue, CO₂ (cinza) sai para o ar
      const gases = []; for (let i = 0; i < 40; i++) { const o2 = i % 2 === 0, m = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), new T.MeshBasicMaterial({ color: o2 ? 0x4fc3f7 : 0x9e9e9e })); m.visible = false; raiz.add(m); gases.push({ m, o2, a: alv[i % alv.length], f: R(), d: V(R() - 0.5, R() - 0.5, R() - 0.5).normalize() }); }
      let ativo = false, t = 0;
      const demo = {
        montar(el) {
          el.innerHTML = `<div class="lupa-demo-tit">🫁 Hematose: troca de gases</div>
            <div class="chips"><button class="chip" id="btnHem">▶ Respirar</button></div>
            <p class="mini-txt">O ar chega pelo <b>bronquíolo</b> até os <b>alvéolos</b>. O <b style="color:#4fc3f7">oxigênio</b> atravessa a parede do alvéolo e a do capilar e entra no sangue (que fica vermelho-vivo); o <b style="color:#9e9e9e">gás carbônico</b> faz o caminho inverso e sai na expiração. Os gases passam por <b>difusão</b>: do lugar onde estão mais concentrados para onde estão menos.</p>`;
          el.querySelector("#btnHem").onclick = e => { ativo = !ativo; e.currentTarget.textContent = ativo ? "⏸ Parar" : "▶ Respirar"; gases.forEach(g => g.m.visible = ativo); if (!ativo) alv.forEach(a => a.scale.setScalar(1)); };
        },
        passo(dt) {
          if (!ativo) return; t += dt; const resp = 1 + 0.08 * Math.sin(t * 1.6);
          alv.forEach(a => a.scale.setScalar(resp));
          gases.forEach(g => {
            g.f = (g.f + dt * 0.35) % 1; const r = g.a.geometry.parameters.radius;
            const din = g.o2 ? g.f : 1 - g.f;   // 0 = centro do alvéolo, 1 = capilar
            g.m.position.copy(g.a.position).addScaledVector(g.d, r * (0.2 + din * 0.95));
          });
          if (H.ctx.sel !== "capilares_p") brilho(caps, 0.15 + 0.1 * Math.sin(t * 3), 0xff2a2a);
        }
      };
      return { raiz, cam: [V(2, 2.5, 15), V(0, 1, 0)], corte: false, demo };
    }
  });

  /* =====================================================================
     NÉFRON (modelo didático)
     ===================================================================== */
  window.LUPA.registrar("nefron", {
    nome: "Néfron", icone: "🫘",
    montar: async H => {
      const raiz = new T.Group(), { M, marca, tubo } = H;
      const G = V(-3, 4, 0);   // corpúsculo renal
      const cap = new T.Mesh(new T.SphereGeometry(1.25, 32, 20, 0, Math.PI * 2, 0.35, Math.PI - 0.35), M("capsula_bowman", "capsula")); cap.rotation.z = -Math.PI / 2; cap.position.copy(G); raiz.add(marca(cap, "capsula_bowman"));
      const glo = []; for (let i = 0; i <= 120; i++) { const u = i / 120 * Math.PI * 9; glo.push(G.clone().add(V(0.7 * Math.cos(u) * Math.sin(u * 0.31), 0.7 * Math.sin(u * 0.5) * Math.cos(u * 0.13), 0.7 * Math.sin(u) * Math.cos(u * 0.27)))); }
      raiz.add(tubo(M, glo, 0.12, "glomerulo", "glomerulo", 480));
      raiz.add(tubo(M, [V(-7, 5.6, 0), V(-5.2, 5.0, 0), G.clone().add(V(-0.6, 0.6, 0))], 0.22, "arteriolas_rim", "arteria"));
      raiz.add(tubo(M, [G.clone().add(V(-0.6, -0.5, 0)), V(-5.2, 2.6, 0.2), V(-6.5, 1.5, 0.6)], 0.15, "arteriolas_rim", "arteria"));
      // túbulo proximal (enrolado) → alça de Henle → túbulo distal → ducto coletor
      const prox = [G.clone().add(V(1.2, 0, 0))]; for (let i = 1; i <= 40; i++) { const u = i / 40; prox.push(V(-1.6 + u * 3.2 + 0.35 * Math.sin(u * 25), 4.4 + 0.9 * Math.sin(u * 14), 0.6 * Math.cos(u * 18))); }
      prox.push(V(1.8, 3.4, 0));
      raiz.add(tubo(M, prox, 0.24, "tubulo_proximal", "tubulo_p", 300));
      const henle = [V(1.8, 3.4, 0), V(1.9, 0, 0), V(1.95, -4, 0), V(2.4, -5.3, 0), V(2.9, -4, 0), V(3.0, 0, 0), V(3.1, 2.6, 0)];
      raiz.add(tubo(M, henle, 0.18, "alca_henle", "henle", 200));
      const dist = [V(3.1, 2.6, 0)]; for (let i = 1; i <= 26; i++) { const u = i / 26; dist.push(V(3.1 + u * 2.2 + 0.3 * Math.sin(u * 20), 3.0 + 0.7 * Math.sin(u * 11), 0.5 * Math.cos(u * 14))); }
      dist.push(V(5.9, 3.8, 0));
      raiz.add(tubo(M, dist, 0.22, "tubulo_distal", "tubulo_d", 220));
      const col = [V(5.9, 3.8, 0), V(6.6, 4.2, 0), V(6.8, 2, 0), V(6.8, -2, 0), V(6.8, -6.5, 0)];
      raiz.add(tubo(M, col, 0.32, "ducto_coletor", "coletor", 120));
      raiz.add(tubo(M, [V(7.6, 6.5, 0), V(7.0, 5, 0), V(6.85, 4, 0)], 0.25, "ducto_coletor", "coletor"));   // chega de outros néfrons
      // capilares peritubulares (saem da arteríola eferente)
      raiz.add(tubo(M, [V(-6.5, 1.5, 0.6), V(-2, 3.0, 1.2), V(0, 5.2, 1.0), V(1.5, 3.8, 1.0), V(2.5, -3, 0.8), V(2.4, -5.0, 0.6), V(3.4, -2, 0.8), V(4.5, 3.6, 1.0), V(7.5, 1.5, 1.0)], 0.07, "capilares_peritubulares", "peritubular", 260));
      const caminho = new T.CatmullRomCurve3([...prox, ...henle.slice(1), ...dist.slice(1), ...col.slice(1)].map(p => p.clone()));
      const parts = []; for (let i = 0; i < 36; i++) { const m = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), new T.MeshBasicMaterial({ color: 0xf6d743 })); m.visible = false; raiz.add(m); parts.push({ m, f: i / 36, tipo: i % 4 }); }
      const volta = []; for (let i = 0; i < 16; i++) { const m = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), new T.MeshBasicMaterial({ color: i % 2 ? 0x4fc3f7 : 0xffffff })); m.visible = false; raiz.add(m); volta.push({ m, f: i / 16 }); }
      let ativo = false, adh = false, t = 0;
      const demo = {
        montar(el) {
          el.innerHTML = `<div class="lupa-demo-tit">🫘 Formação da urina</div>
            <div class="chips"><button class="chip" id="btnUri">▶ Filtrar</button><button class="chip" id="btnAdh">💧 Pouca água (ADH alto)</button></div>
            <p class="mini-txt" id="txtNef">1. <b>Filtração:</b> no <b>glomérulo</b>, a pressão empurra água, sais, glicose e ureia para a <b>cápsula</b> (amarelo). 2. <b>Reabsorção:</b> nos túbulos, glicose, sais e a maior parte da água <b style="color:#4fc3f7">voltam para o sangue</b> dos capilares. 3. <b>Secreção</b> de algumas substâncias para dentro do túbulo. O que sobra no <b>ducto coletor</b> é a urina.</p>`;
          el.querySelector("#btnUri").onclick = e => { ativo = !ativo; e.currentTarget.textContent = ativo ? "⏸ Parar" : "▶ Filtrar"; parts.forEach(p => p.m.visible = ativo); volta.forEach(p => p.m.visible = ativo); };
          el.querySelector("#btnAdh").onclick = e => { adh = !adh; e.currentTarget.classList.toggle("ativo", adh); el.querySelector("#txtNef").innerHTML = adh ? "<b>Com pouca água no corpo</b>, a hipófise libera mais <b>ADH</b>: o ducto coletor reabsorve muito mais água. Sai pouca urina, mais escura e concentrada." : "Com o corpo bem hidratado, o ADH diminui: menos água é reabsorvida no ducto coletor e a urina sai mais clara e em maior volume."; };
        },
        passo(dt) {
          if (!ativo) return; t += dt;
          parts.forEach(p => {
            p.f = (p.f + dt * 0.06) % 1;
            // ao longo do caminho, parte do filtrado é reabsorvida: as partículas somem (voltam ao sangue)
            const some = p.tipo === 0 ? 0.25 : p.tipo === 1 ? 0.55 : p.tipo === 2 && adh ? 0.88 : 2;
            p.m.visible = p.f < some; p.m.position.copy(caminho.getPointAt(p.f));
            p.m.material.color.setHex(p.f > 0.86 ? 0xe6c229 : 0xf6d743);
          });
          volta.forEach(v => { v.f = (v.f + dt * 0.25) % 1; const base = caminho.getPointAt(0.1 + (v.f * 7 % 1) * 0.5); v.m.position.copy(base).add(V(0, 0, 0.3 + v.f * 0.7)); });
          if (H.ctx.sel !== "glomerulo") brilho(malhasDe(H.ctx, "glomerulo"), 0.25 + 0.2 * Math.sin(t * 6), 0xff5050);
        }
      };
      return { raiz, cam: [V(0.5, 0.5, 19), V(0.5, 0, 0)], corte: false, demo };
    }
  });
})();
