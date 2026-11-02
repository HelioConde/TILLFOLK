# Fauna selvagem e produção de esterco

O TILLFOLK gera coelhos, galinhas, vacas e outras espécies **selvagens** no mapa inicial. Esses animais não fazem parte da criação da fazenda nem geram esterco para coleta.

## Problema corrigido

Antes, a validação das ordens considerava `state.animals.length` e até `animal.manure` de qualquer animal, incluindo os selvagens. A interface podia responder "aguardando o animal produzir esterco" mesmo sem nenhum animal doméstico apto; um save atípico poderia considerar esterco do animal selvagem disponível.

## Regra atual

- A ordem **Fertilizar** funciona se existir esterco no estoque ou se um **animal doméstico** já tiver esterco para coleta.
- Se não houver animais domésticos nem esterco, a mensagem explica que fauna selvagem não produz esterco coletável.
- Se houver animal doméstico ainda sem esterco, a ordem aguarda sua produção.
- A ordem **Recolher esterco** verifica exclusivamente o animal doméstico selecionado.
- A execução de `collectManure` e busca de suprimentos no motor também excluem animais com `wild:true`.

## Segurança

Não foram alterados o catálogo visual de animais, os sprites, o mapa, o autotile, a economia, os saves nem a geração de animais. Apenas o pré-requisito da tarefa e a mensagem de bloqueio foram corrigidos.

### Testes

`node --test tests/manure-wildlife.test.cjs`

Testa: fauna selvagem sem esterco, cenário adulterado com esterco em fauna selvagem, esterco já guardado, animal doméstico com esterco e animal doméstico sem produção.
