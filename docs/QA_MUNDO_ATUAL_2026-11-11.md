# Ajustes de QA para mundo procedural (11/11/2026)

O mapa passou de 28×18 para 192×120 com seis biomas, rios e fauna selvagem. Antigos testes que elegem células fixas como (36,22) e usam flags globais de ferramentas não correspondem mais à jogabilidade atual.

- Use \`tests/helpers/world-sites.cjs\` para selecionar terreno livre da seed gerada no teste.
- Use \`tests/helpers/save-fixture.cjs\` para editar um save antes de reload (o \`pagehide\` do jogo grava o estado do motor e pode sobrescrever alterações diretas do localStorage).
- Ferramentas são individuais; conceder \`worker.inventory.tools.hoe\` à fixture, nunca só \`crafting.equipment.hoe\`.
- Fauna \`wild:true\` é legítima no mapa; testes de fertilização doméstica devem selecionar \`!wild\`.
- Casas são colocadas por **Objetos > Cabana**, não pelo menu antigo de ordens.
- Registros de teste devem comprovar que recursos continuam físicos, sem geração gratuita.

A atualização dos cenários não elimina a necessidade de validar construções, abastecimento e migração de saves em partidas reais. Não remover mecânicas para satisfazer expectativas legadas.
