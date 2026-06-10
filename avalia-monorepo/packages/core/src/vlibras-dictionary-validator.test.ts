import { describe, it, expect } from 'vitest';
import { isTokenValid, sanitizeGlosaStrict } from './vlibras-dictionary-validator';

describe('VLibras Dictionary Validator', () => {
  const mockDictionary = new Set(['BOM_DIA', 'COMO', 'VOCE', 'ESTA', 'NOME', 'QUAL']);

  describe('isTokenValid', () => {
    it('deve validar tokens presentes no dicionário', () => {
      expect(isTokenValid('BOM_DIA', mockDictionary)).toBe(true);
      expect(isTokenValid('como', mockDictionary)).toBe(true); // Case insensitive check handled inside
    });

    it('deve invalidar tokens ausentes', () => {
      expect(isTokenValid('TOKEN_INEXISTENTE', mockDictionary)).toBe(false);
    });

    it('deve validar tokens com variações numéricas (.1, .2)', () => {
      expect(isTokenValid('BOM_DIA.1', mockDictionary)).toBe(true);
      expect(isTokenValid('COMO.2', mockDictionary)).toBe(true);
    });

    it('deve validar tokens com desambiguação (&CONTEXTO)', () => {
      expect(isTokenValid('ESTA&VERBO', mockDictionary)).toBe(true);
    });

    it('deve validar marcadores não-manuais entre colchetes', () => {
      expect(isTokenValid('[PONTO]', mockDictionary)).toBe(true);
      expect(isTokenValid('[INTERROGACAO]', mockDictionary)).toBe(true);
      expect(isTokenValid('[EXCLAMACAO]', mockDictionary)).toBe(true);
    });

    it('deve invalidar marcadores não-manuais desconhecidos', () => {
      expect(isTokenValid('[MARCADOR_DOIDO]', mockDictionary)).toBe(false);
    });
  });

  describe('sanitizeGlosaStrict', () => {
    it('deve manter apenas tokens válidos em uma glosa', () => {
      const glosa = 'BOM_DIA COMO VOCE ESTA TOKEN_INVALIDO';
      const expected = 'BOM_DIA COMO VOCE ESTA';
      expect(sanitizeGlosaStrict(glosa, mockDictionary)).toBe(expected);
    });

    it('deve degradar graciosamente tokens com sufixos', () => {
      const glosa = 'QUAL.1 NOME.2 VOCE&PRONOME';
      const expected = 'QUAL NOME VOCE';
      expect(sanitizeGlosaStrict(glosa, mockDictionary)).toBe(expected);
    });

    it('deve retornar string vazia se nenhum token for válido', () => {
      const glosa = 'BLABLABLA WHISKY_SODA';
      expect(sanitizeGlosaStrict(glosa, mockDictionary)).toBe('');
    });

    it('deve lidar com espaços múltiplos e glosas em minúsculo', () => {
      const glosa = '  bom_dia   qual  nome  ';
      const expected = 'BOM_DIA QUAL NOME';
      expect(sanitizeGlosaStrict(glosa, mockDictionary)).toBe(expected);
    });
  });
});
