# Corpo Humano 3D — Simulador didático (BNCC)

Simulador interativo em 3D do corpo humano, em Língua Portuguesa, para o Ensino Fundamental e o Ensino Médio, alinhado às habilidades da BNCC.

**Acesse:** https://raulvilera.github.io/simulador-corpo-humano/

## Funcionalidades
- **Explorar:** modelo 3D com 12 sistemas (liga/desliga e transparência), corpo feminino/masculino, vistas e regiões, rótulos, fichas de cada estrutura com habilidades BNCC e leitura em voz alta.
- **Simular:** batimentos e circulação, respiração, digestão, visão, vacinação, herança, níveis de organização, cardápio e métodos contraceptivos.
- **BNCC, Quiz, Desafio e Saiba mais.**

## Uso local
Abra `index.html` no navegador — não precisa de instalação nem de internet.

## Modelos anatômicos
Os modelos 3D são reais, reconstruídos a partir de exames de imagem:
- **BodyParts3D**, © The Database Center for Life Science — [CC BY 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) (esqueleto, músculos, órgãos, vasos e corpo masculino).
- **HuBMAP Human Reference Atlas — 3D Reference Organs** — [CC BY 4.0](https://humanatlas.io/3d-reference-library) (corpo e órgãos genitais femininos, pulmões, medula espinal, tonsilas).

As malhas foram simplificadas e compactadas com [meshoptimizer](https://github.com/zeux/meshoptimizer) e ficam na pasta `modelos/`.

## Imagens anatômicas reais
Cada estrutura tem uma imagem real (fotografia, prancha anatômica ou ilustração médica) na ficha — clique nela para ampliar. As imagens vêm do **Wikimedia Commons**, todas com licenças livres (domínio público, CC0, CC BY ou CC BY-SA), incluindo pranchas de *Gray's Anatomy* (1918) e Sobotta (1909), ilustrações Blausen Medical e imagens do BodyParts3D. O autor e a licença de cada imagem aparecem abaixo dela e estão registrados em `js/imagens.js`; os arquivos ficam na pasta `imagens/` (funcionam sem internet).

Feito com [three.js](https://threejs.org/).
