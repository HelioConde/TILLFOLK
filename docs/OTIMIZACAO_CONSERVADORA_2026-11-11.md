# Otimização conservadora de renderização e CSS — 11/11/2026

- Canvas permanece em 192×120 tiles de 32px: não alteramos câmera, saves ou autotile.
- src/render-budget.js limita somente o desenho em dispositivos de largura até 600px a cerca de 30fps, mantendo ~60fps no desktop. Simulação, eventos, UI e autosave continuam a atualizar no loop original.
- tools/build-css-bundle.cjs consolida as 34 folhas CSS no artefato publicado, preservando a cascata original, imagens e fontes com URLs relativas à raiz. Fontes separadas continuam no Git para depuração.
- npm run test:performance verifica ordem dos estilos e orçamento de FPS.
- O tamanho do buffer do Canvas (~90MiB RGBA) não foi reduzido: isso exige reprojetar as coordenadas e a câmera e validação de screenshots/fps em aparelhos reais. Registrar benchmark antes de alterar backing buffer.
