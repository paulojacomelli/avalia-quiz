import dns from 'dns';
import * as cheerio from 'cheerio';
import { convert } from 'html-to-text';

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  let cleanIp = ip.trim();

  // Tratamento para IPv6 mapeado para IPv4 (ex: ::ffff:127.0.0.1)
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }

  // Checagem IPv4
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    const [a, b] = parts;

    // Loopback (127.0.0.0/8) & Unspecified (0.0.0.0/8)
    if (a === 127 || a === 0) return true;
    // Private Class A (10.0.0.0/8)
    if (a === 10) return true;
    // Private Class B (172.16.0.0/12)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // Private Class C (192.168.0.0/16)
    if (a === 192 && b === 168) return true;
    // Link-Local & GCP Metadata (169.254.0.0/16)
    if (a === 169 && b === 254) return true;
    // CGNAT (100.64.0.0/10)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // Multicast (224.0.0.0/4)
    if (a >= 224) return true;

    return false;
  }

  // Checagem IPv6
  const lowerV6 = cleanIp.toLowerCase();
  // Loopback (::1) & Unspecified (::)
  if (lowerV6 === '::1' || lowerV6 === '::') return true;
  // Unique Local Address - ULA (fc00::/7 -> fc.. ou fd..)
  if (lowerV6.startsWith('fc') || lowerV6.startsWith('fd')) return true;
  // Link-Local (fe80::/10 -> fe8, fe9, fea, feb)
  if (lowerV6.startsWith('fe8') || lowerV6.startsWith('fe9') || lowerV6.startsWith('fea') || lowerV6.startsWith('feb')) return true;

  return false;
}

async function validateHostname(hostname: string): Promise<void> {
  if (!hostname) throw new Error("Hostname invalido.");

  // Se for hostname literal localhost
  if (hostname.toLowerCase() === 'localhost') {
    throw new Error("Acesso a 'localhost' eh estritamente proibido por seguranca (SSRF).");
  }

  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Nao foi possivel resolver DNS para o hostname: ${hostname}`);
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        throw new Error(`Endereco IP privado/reservado detectado (${record.address}). Conexao bloqueada por seguranca (SSRF).`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('SSRF')) throw err;
    throw new Error(`Falha na resolucao de DNS do hostname '${hostname}': ${err.message}`);
  }
}

export async function fetchAndCleanPageContent(
  targetUrl: string,
  allowedDomains: string[] = [],
  maxRedirects: number = 3
): Promise<string> {
  let currentUrlStr = targetUrl.trim();

  // Validacao estrita de esquema HTTP/HTTPS
  if (!currentUrlStr.startsWith('http://') && !currentUrlStr.startsWith('https://')) {
    throw new Error("A URL informada deve comecar obrigatoriamente com http:// ou https://");
  }

  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrlStr);
    } catch {
      throw new Error(`URL malformada ou invalida: ${currentUrlStr}`);
    }

    const hostname = parsedUrl.hostname;

    // 1. Validacao de Dominios Permitidos
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain =>
        hostname.toLowerCase() === domain.toLowerCase() ||
        hostname.toLowerCase().endsWith('.' + domain.toLowerCase())
      );
      if (!isAllowed) {
        throw new Error(`O dominio '${hostname}' nao eh permitido para este aplicativo. Dominios permitidos: ${allowedDomains.join(', ')}.`);
      }
    }

    // 2. Resolucao DNS e Validacao de IP Privado (SSRF) para CADA HOP do redirect
    await validateHostname(hostname);

    // 3. Requisicao HTTP com Timeout de 6 segundos e sem seguir redirects automaticamente
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response: Response;
    try {
      response = await fetch(currentUrlStr, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AvaliaQuiz/1.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        },
        redirect: 'manual',
        signal: controller.signal
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Timeout na requisicao HTTP (limite de 6 segundos excedido) ao acessar '${currentUrlStr}'.`);
      }
      throw new Error(`Falha de conexao ao acessar a pagina '${currentUrlStr}': ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Tratamento de Redirects (301, 302, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirecionamento HTTP ${response.status} sem cabecalho Location em '${currentUrlStr}'.`);
      }

      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new Error(`Limite maximo de ${maxRedirects} redirecionamentos excedido.`);
      }

      // Resolve URL relativa se necessario
      currentUrlStr = new URL(location, currentUrlStr).toString();
      continue; // Repete a resolucao DNS e validacao de IP para o NOVO hostname do redirect!
    }

    if (!response.ok) {
      throw new Error(`A pagina retornou status HTTP ${response.status} ao ser acessada.`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`O tipo de conteudo '${contentType}' nao eh compativel. Apenas paginas HTML/texto sao aceitas.`);
    }

    const htmlContent = await response.text();
    if (!htmlContent || !htmlContent.trim()) {
      throw new Error("A pagina retornou conteudo vazio.");
    }

    // 4. Cheerio + html-to-text para limpar HTML e extrair apenas o texto principal
    const $ = cheerio.load(htmlContent);

    // Remove elementos indesejados (scripts, estilos, navegacao, banners, rodapes)
    $('script, style, svg, iframe, nav, footer, header, noscript, [aria-hidden="true"]').remove();

    // Seleciona a area principal do artigo se existir
    const mainElement = $('main, article, #content, .content, .main').first();
    const targetHtml = mainElement.length > 0 ? mainElement.html() || '' : $('body').html() || htmlContent;

    const cleanText = convert(targetHtml, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' }
      ]
    }).replace(/\n\s*\n/g, '\n\n').trim();

    if (!cleanText) {
      throw new Error("Nao foi possivel extrair texto legivel do conteudo da pagina.");
    }

    // 5. Cap do tamanho em 8.000 caracteres maximos
    return cleanText.substring(0, 8000);
  }

  throw new Error("Falha inesperada no processamento da pagina.");
}
