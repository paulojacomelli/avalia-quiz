/**
 * VLibras Dictionary Validator - Runtime Safeguard
 * 
 * Valida glosas contra o dicionário oficial do VLibras antes de enviar para o Unity
 * Evita o fallback para soletração (datilologia) pelos causado por tokens 404
 * 
 * Fontes:
 * - https://dicionario2.vlibras.gov.br/api/dict
 * - Contém ALL tokens suportados pelo banco de animações 3D
 */

/**
 * Instância singleton do validador
 * Carregado uma única vez na inicialização do app
 */
let dictionaryCache: Set<string> | null = null;
let fetchPromise: Promise<Set<string>> | null = null;

/**
 * Carrega o dicionário oficial do VLibras
 * Implementa lazy loading + caching
 * 
 * @returns Promise que resolve com Set de tokens válidos
 */
export async function loadVLibrasDictionary(): Promise<Set<string>> {
  // Se já foi carregado, retorna cache
  if (dictionaryCache) {
    return dictionaryCache;
  }

  // Se está carregando, aguarda a promise em andamento
  if (fetchPromise) {
    return fetchPromise;
  }

  // Inicia novo carregamento
  fetchPromise = (async () => {
    try {
      console.log('[VLibras Validator] Carregando dicionário oficial...');
      
      // Endpoint oficial do dicionário
      const response = await fetch('https://dicionario2.vlibras.gov.br/api/dict', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Avalia-Quiz/1.4.5'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Estrutura esperada: Array de objetos com campo "glosa" ou "id"
      // Adaptamos para diferentes formatos que possam vir da API
      const tokens = new Set<string>();
      
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          const token = item.glosa || item.id || item.word || item.sign;
          if (token && typeof token === 'string') {
            tokens.add(token.toUpperCase().trim());
          }
        });
      } else if (data.tokens && Array.isArray(data.tokens)) {
        data.tokens.forEach((item: any) => {
          const token = typeof item === 'string' ? item : (item.glosa || item.id);
          if (token) {
            tokens.add(token.toUpperCase().trim());
          }
        });
      } else if (typeof data === 'object') {
        // Se for um objeto mapa {token: info}, usa as chaves
        Object.keys(data).forEach(key => {
          tokens.add(key.toUpperCase().trim());
        });
      }

      console.log(`[VLibras Validator] ✅ Dicionário carregado: ${tokens.size} tokens`);
      
      // Armazena em cache
      dictionaryCache = tokens;
      fetchPromise = null;
      
      return tokens;
    } catch (error) {
      console.error('[VLibras Validator] ❌ Erro ao carregar dicionário:', error);
      fetchPromise = null;
      
      // Fallback: retorna set vazio (comportamento seguro)
      // Glosas não-validadas serão descartadas para evitar soletração
      dictionaryCache = new Set();
      return dictionaryCache;
    }
  })();

  return fetchPromise;
}

/**
 * Valida um token individual contra o dicionário
 * 
 * @param token Token a ser validado (ex: "BEM_VINDO")
 * @returns true se token é válido, false caso contrário
 */
export function isTokenValid(token: string, dictionary: Set<string>): boolean {
  if (!token || token.length === 0) {
    return false;
  }

  const normalized = token.toUpperCase().trim();

  // 1. Checa o token exato
  if (dictionary.has(normalized)) {
    return true;
  }

  // 2. Checa removendo sufixos de variação (.1, .2, .3)
  const baseToken = normalized.split('.')[0];
  if (baseToken !== normalized && dictionary.has(baseToken)) {
    return true;
  }

  // 3. Checa desambiguação (&CONTEXTO)
  const disambigToken = normalized.split('&')[0];
  if (disambigToken !== normalized && dictionary.has(disambigToken)) {
    return true;
  }

  // 4. Checa marcadores não-manuais entre colchetes
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    const markerName = normalized.slice(1, -1);
    // Marcadores reconhecidos internacionalmente
    const validMarkers = ['PONTO', 'INTERROGACAO', 'EXCLAMACAO', 'ATENCAO'];
    if (validMarkers.includes(markerName)) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitiza uma glosa inteira validando todos os tokens
 * Remove ou degrada graciosamente tokens inválidos
 * 
 * @param glosa String contendo múltiplos tokens separados por espaço
 * @param dictionary Set de tokens válidos (obtido de loadVLibrasDictionary)
 * @returns Glosa sanitizada contendo apenas tokens válidos
 */
export function sanitizeGlosaStrict(
  glosa: string,
  dictionary: Set<string>
): string {
  if (!glosa || glosa.trim().length === 0) {
    return '';
  }

  // Divide em tokens (separador é espaço único)
  const tokens = glosa.toUpperCase().trim().split(/\s+/);
  
  // Filtra tokens válidos
  const validTokens: string[] = [];

  tokens.forEach((token) => {
    const normalized = token.toUpperCase().trim();
    
    // 1. Tenta a forma exata
    if (dictionary.has(normalized)) {
      validTokens.push(normalized);
      return;
    }

    // 2. Tenta a base (sem .1, .2, etc)
    const baseToken = normalized.split('.')[0];
    if (baseToken !== normalized && dictionary.has(baseToken)) {
      console.warn(`[VLibras Validator] ℹ️ Usando base: "${baseToken}" para "${token}"`);
      validTokens.push(baseToken);
      return;
    }

    // 3. Tenta sem desambiguação (&)
    const disambigToken = normalized.split('&')[0];
    if (disambigToken !== normalized && dictionary.has(disambigToken)) {
      console.warn(`[VLibras Validator] ℹ️ Usando raiz: "${disambigToken}" para "${token}"`);
      validTokens.push(disambigToken);
      return;
    }

    // 4. Marcadores não-manuais
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      const markerName = normalized.slice(1, -1);
      const validMarkers = ['PONTO', 'INTERROGACAO', 'EXCLAMACAO', 'ATENCAO'];
      if (validMarkers.includes(markerName)) {
        validTokens.push(normalized);
        return;
      }
    }

    console.warn(`[VLibras Validator] 🗑️ Descartando token inválido: "${token}"`);
  });

  const result = validTokens.join(' ');
  
  if (result.length === 0) {
    console.warn(
      `[VLibras Validator] ⚠️  GLOSA VAZIA: "${glosa}" não contém tokens válidos`
    );
  }

  return result;
}

/**
 * Hook para inicializar o validador na montagem da aplicação
 * 
 * Exemplo de uso:
 * ```tsx
 * export function App() {
 *   useInitializeVLibrasValidator();
 *   // ... resto do app
 * }
 * ```
 */
export function initializeVLibrasValidator(): void {
  // Carrega o dicionário em background sem bloquear
  loadVLibrasDictionary().catch((err) => {
    console.error('[VLibras Validator] Falha ao inicializar:', err);
  });
}

/**
 * Função de teste para debug
 * Mostra quais tokens estão no dicionário
 */
export async function debugDictionary(tokensToCheck: string[]): Promise<void> {
  const dict = await loadVLibrasDictionary();
  
  console.group('[VLibras Validator] Debug: Validação de Tokens');
  tokensToCheck.forEach((token) => {
    const isValid = isTokenValid(token, dict);
    console.log(
      `${isValid ? '✅' : '❌'} "${token}" ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`
    );
  });
  console.groupEnd();
}

/**
 * Obtém informações sobre o estado atual do cache do dicionário
 */
export function getDictionaryStatus(): {
  cached: boolean;
  loading: boolean;
  tokenCount: number | null;
} {
  return {
    cached: dictionaryCache !== null,
    loading: fetchPromise !== null,
    tokenCount: dictionaryCache?.size ?? null,
  };
}
