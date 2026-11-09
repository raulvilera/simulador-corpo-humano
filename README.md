# Corpo Humano 3D — Simulador didático (BNCC)

Simulador interativo em 3D do corpo humano, em Língua Portuguesa, para o Ensino Fundamental e o Ensino Médio, alinhado às habilidades da BNCC.

**Acesse:** https://raulvilera.github.io/simulador-corpo-humano/

## Funcionalidades
- **Explorar:** modelo 3D com 11 sistemas (liga/desliga e transparência), corpo feminino/masculino, vistas e regiões, rótulos, fichas de cada estrutura com habilidades BNCC e leitura em voz alta.
- **Simular:** batimentos e circulação, respiração, digestão, visão, vacinação, herança, níveis de organização, cardápio e métodos contraceptivos.
- **BNCC, Quiz, Desafio e Saiba mais.**

## Uso local
Abra `index.html` no navegador — não precisa de instalação nem de internet.

## Modelos anatômicos
Os modelos 3D são reais, reconstruídos a partir de exames de imagem:
- **BodyParts3D**, © The Database Center for Life Science — [CC BY 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) (esqueleto, músculos, órgãos, vasos e corpo masculino).
- **HuBMAP Human Reference Atlas — 3D Reference Organs** — [CC BY 4.0](https://humanatlas.io/3d-reference-library) (corpo e órgãos genitais femininos, pulmões, medula espinal, tonsilas).

As malhas foram simplificadas e compactadas com [meshoptimizer](https://github.com/zeux/meshoptimizer) e ficam na pasta `modelos/`.

Feito com [three.js](https://threejs.org/).
