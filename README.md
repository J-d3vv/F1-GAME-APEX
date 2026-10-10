# APEX GP — Corrida 2D multiplayer

```
f1-game/
  server.py          # Flask + Socket.IO: salas, sincronização, ranking, estatísticas (stats.json)
  requirements.txt
  static/index.html  # interface + canvas
  static/game.js     # física, pistas, bots, menus, carreira, multiplayer
```

## Rodar localmente
```
pip install -r requirements.txt
python server.py        # abra http://localhost:5000
```
Na mesma rede Wi-Fi, amigos entram em `http://IP-DO-SEU-PC:5000`.

## Publicar grátis (Render.com)
1. Suba a pasta em um repositório no GitHub.
2. Render → New → Web Service → conecte o repositório.
3. Build: `pip install -r requirements.txt`
4. Start: `gunicorn -k gthread --threads 100 -w 1 -b 0.0.0.0:$PORT server:app`
5. Compartilhe o link `https://seu-app.onrender.com`. (Plano grátis dorme após inatividade; o 1º acesso demora ~1 min. O arquivo stats.json é apagado a cada redeploy no plano grátis; para persistir, use um disco ou banco.)

Use **1 worker** (`-w 1`): as salas ficam na memória do processo.

## Como jogar
- Setas/WASD pilotam, **P** pede pit stop (troca de pneu ao cruzar a linha), **Esc** sai. No celular há botões na tela.
- Online: crie sala, copie o link de convite, o host inicia.
- Pneus: macio (aderência, desgasta rápido), médio, duro. Pneu gasto perde velocidade e aderência.
- Campeonato: 3 etapas contra 9 bots, pontos 25-18-15…; Classificação define seu lugar no grid.

## Observações
Nomes das equipes são só rótulos editáveis em `TEAMS` (game.js); pilotos são fictícios. Para uso comercial, troque por nomes próprios. Gráficos são desenhados em canvas, sem arquivos externos.
