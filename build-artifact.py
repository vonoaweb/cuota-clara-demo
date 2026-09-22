#!/usr/bin/env python3
"""Genera dist/artifact-index.html a partir de index.html.

El artifact de claude.ai envuelve la pagina en su propio <!doctype>/<head>/<body>,
asi que la version publicada no debe traer esas etiquetas. Este script toma los
dos bloques marcados en index.html y los concatena. index.html sigue siendo la
unica fuente: sirve tal cual para hospedaje propio (SiteGround, GitHub Pages).

    python build-artifact.py
"""
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(RAIZ, 'index.html')
DESTINO = os.path.join(RAIZ, 'dist', 'artifact-index.html')


def extraer(texto, marca):
    patron = r'<!--ARTIFACT:%s-START-->(.*?)<!--ARTIFACT:%s-END-->' % (marca, marca)
    m = re.search(patron, texto, re.S)
    if not m:
        sys.exit('Falta el marcador ARTIFACT:%s en index.html' % marca)
    return m.group(1).strip()


def main():
    with io.open(ORIGEN, encoding='utf-8') as f:
        fuente = f.read()

    salida = extraer(fuente, 'HEAD') + '\n\n' + extraer(fuente, 'BODY') + '\n'

    os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
    with io.open(DESTINO, 'w', encoding='utf-8') as f:
        f.write(salida)

    print('%s  (%d bytes)' % (os.path.relpath(DESTINO, RAIZ), len(salida.encode('utf-8'))))


if __name__ == '__main__':
    main()
