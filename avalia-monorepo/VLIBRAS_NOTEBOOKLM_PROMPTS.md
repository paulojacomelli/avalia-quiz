# 🤖 Perguntas para NotebookLM - Documentação VLibras

## CONTEXTO
Estou desenvolvendo uma integração do VLibras em uma aplicação React/TypeScript. O avatar está renderizando corretamente, mas as glosas estão sendo **soletradas letra por letra** em vez de serem interpretadas como **sinais únicos**.

---

## 📋 PROMPT 1: Formato de Glosas
```
Como devo formatar as glosas para o VLibras interpretar corretamente?

Exemplos que NÃO estão funcionando:
- "BEM-VINDO" → está soletando B-E-M-V-I-N-D-O
- "BEMVINDO" → continua soletando
- "OLA" → está soletando O-L-A

Qual é o formato correto de glosa que o VLibras espera?
Devo usar espaços, hífens, underscores ou outro separador?
Existe alguma convenção de escrita para glosas (maiúsculas, minúsculas, etc.)?
```

---

## 📋 PROMPT 2: API do Player
```
Quais são os métodos disponíveis no VLibras.Player para controlar a reprodução de glosas?

Especificamente preciso saber:
1. Como invocar o método play() ou playGlosa()? Qual a assinatura correta?
2. Existe diferença entre play(texto) e translate(texto)?
3. O que é o método translate() e quando devo usá-lo?
4. Como forçar o VLibras a interpretar como glosa e não soletrar?
5. Existe algum parâmetro ou flag para controlar o modo de interpretação?
```

---

## 📋 PROMPT 3: Configuração do Player
```
Como configurar corretamente a instância do VLibras.Player?

Estou instanciando assim:
```javascript
const player = new window.VLibras.Player({
  rootPath: 'https://vlibras.gov.br/app',
  avatar: 'icaro'
});
```

Perguntas:
1. Existe alguma opção de configuração para definir o modo de interpretação (glosa vs soletração)?
2. Preciso configurar algo relacionado ao dicionário ou tradutor?
3. O parâmetro 'translator' é obrigatório? Como configurá-lo?
4. Qual a diferença entre usar o Player diretamente vs usar o Widget/Plugin?
```

---

## 📋 PROMPT 4: Método translate() vs play()
```
Qual a diferença entre os métodos translate() e play() no VLibras?

Código atual:
```javascript
playerRef.current.play(glosa);
```

Perguntas:
1. Devo usar translate() em vez de play()?
2. O translate() processa a glosa de forma diferente?
3. Qual método é recomendado para interpretação de glosas?
4. Como o método translate() funciona internamente?
5. Preciso passar algum parâmetro adicional?
```

---

## 📋 PROMPT 5: Formato de Glosa Oficial
```
Você pode fornecer exemplos de código funcionais para:

1. Reproduzir uma glosa simples como "OLÁ" ou "BEM-VINDO"
2. Reproduzir uma sequência de glosas
3. Configurar o player para modo de interpretação de glosas
4. Evitar que o VLibras soletre as palavras

Exemplo do que eu preciso:
```javascript
// Como fazer isso funcionar corretamente?
player.???("BEMVINDO AVALIA QUIZ");
```

---

## 📋 PROMPT 6: PlayerManager e Comunicação Unity
```
Como funciona a comunicação entre o PlayerManager e o motor Unity?

Estou usando:
```javascript
playerRef.current.play(glosa);
```

Perguntas:
1. O PlayerManager usa o método _send() internamente? Como?
2. Qual comando é enviado ao Unity quando chamo play()?
3. Existe um comando específico para "interpretar glosa" vs "soletrar"?
4. Como o Unity diferencia os modos de interpretação?
5. Posso enviar comandos diretos ao Unity via PlayerManager._send()?
```

---

## 📋 PROMPT 7: Exemplos Práticos
```
Você pode fornecer exemplos de código funcionais para:

1. Reproduzir uma glosa simples como "OLÁ" ou "BEM-VINDO"
2. Reproduzir uma sequência de glosas
3. Configurar o player para modo de interpretação de glosas
4. Evitar que o VLibras soletre as palavras

Exemplo do que eu preciso:
```javascript
// Como fazer isso funcionar corretamente?
player.???("BEMVINDO AVALIA QUIZ");
```
```

---

## 📋 PROMPT 8: Troubleshooting
```
Por que o VLibras está soletrando em vez de interpretar glosas?

Situação atual:
- Player carrega corretamente
- Avatar renderiza e anima
- Mas toda string enviada é soletrada letra por letra

Possíveis causas:
1. Formato de string incorreto?
2. Método errado sendo chamado?
3. Configuração faltando na inicialização?
4. Problema com o dicionário/tradutor?
5. Versão incompatível do player?

Qual é o diagnóstico mais provável?
```

---

## 📋 PROMPT 9: Configuração do Tradutor
```
Como configurar corretamente o componente Translator do VLibras?

Código atual não usa translator explicitamente:
```javascript
const player = new VLibras.Player({
  rootPath: VLIBRAS_CDN,
  avatar: 'icaro'
});
```

Perguntas:
1. Preciso passar a opção 'translator'?
2. Qual é a URL do translator oficial?
3. O translator é responsável por converter texto em glosa?
4. Se eu passar glosas diretas, ainda preciso do translator?
5. Como funciona o GlosaTranslator?
```

---

## 📋 PROMPT 10: Eventos e Callbacks
```
Quais eventos o VLibras.Player emite durante a reprodução?

Preciso saber:
1. Existe algum evento que indica "modo de interpretação"?
2. Como detectar se está soletando vs sinalizando?
3. Posso interceptar e modificar a glosa antes de ser enviada ao Unity?
4. Existe callback ou evento para debug da glosa recebida?
5. Como monitorar o que está sendo enviado ao motor Unity?
```

---

## 🎯 FORMATO DE RESPOSTA ESPERADO

Para cada pergunta, peça ao NotebookLM:
1. **Citação direta** da documentação oficial
2. **Exemplo de código** funcional
3. **Referência** à página/seção da documentação

---

## 📤 COMO USAR

1. Copie cada PROMPT (1 a 10) individualmente
2. Cole no NotebookLM
3. Aguarde a resposta completa
4. Copie a resposta e me envie
5. Eu vou analisar e implementar a solução correta

---

**Objetivo**: Descobrir o **formato correto de glosa** e o **método correto** para o VLibras interpretar sinais em vez de soletrar.
