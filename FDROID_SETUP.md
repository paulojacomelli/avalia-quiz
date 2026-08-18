# Configuração dos Repositórios F-Droid (Avalia Apps)

Este guia descreve como configurar os repositórios F-Droid (Canary/Dev e Oficial/Produção) para os aplicativos do ecossistema Avalia (`Avalia Quiz`, `Avalia JW Quiz` e `Avalia Kids Quiz`).

---

## 1. Arquitetura dos Repositórios

Os repositórios F-Droid são servidos diretamente via **GitHub Pages** na branch `gh-pages`:

- **Canary / Dev**: `https://<usuario>.github.io/<repositorio>/repo-dev/repo`
- **Oficial / Produção**: `https://<usuario>.github.io/<repositorio>/repo`

---

## 2. Assinatura dos APKs e do Índice F-Droid

Existem dois níveis de assinatura:
1. **Assinatura do APK**:
   - Compilado via `./gradlew assembleDebug` (ou `assembleRelease` com keystore Android).
   - O APK é indexado pelo `fdroidserver`.
2. **Assinatura do Repositório F-Droid (`keystore.p12`)**:
   - Utilizado pelo `fdroid update` para assinar digitalmente o arquivo de metadados `index-v1.jar` / `index-v2.json`.

---

## 3. Gerando os Keystores F-Droid (.p12)

Execute no terminal (Linux/macOS ou WSL no Windows):

```bash
# Para o repositório Oficial (Produção)
keytool -genkey -v -keystore fdroid-keystore-prod.p12 -storetype PKCS12 -alias fdroid -keyalg RSA -keysize 4096 -validity 10000

# Para o repositório Dev (Canary)
keytool -genkey -v -keystore fdroid-keystore-dev.p12 -storetype PKCS12 -alias fdroid -keyalg RSA -keysize 4096 -validity 10000
```

Converta para Base64 para adicionar aos Secrets do GitHub:

```bash
# No PowerShell (Windows)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("fdroid-keystore-prod.p12")) | Set-Clipboard
```

---

## 4. Secrets Obrigatórios no GitHub Actions

Acesse o repositório no GitHub: **Settings > Secrets and variables > Actions > Secrets**:

| Nome do Secret | Descrição |
|---|---|
| `FDROID_KEYSTORE_PROD_B64` | Conteúdo do arquivo `fdroid-keystore-prod.p12` em Base64 |
| `FDROID_KEYSTORE_DEV_B64` | Conteúdo do arquivo `fdroid-keystore-dev.p12` em Base64 |
| `FDROID_KEYSTORE_PASSWORD` | Senha definida ao criar os keystores `.p12` |
| `VITE_FIREBASE_*` | Variáveis do Firebase para compilação Web |

---

## 6. Checklist de Homologação em Execução Real

Execute os seguintes testes após o primeiro disparo do workflow:

1. **Reprodutibilidade em Runner Limpo**:
   - Garantir que o CI gera o projeto do zero sem depender de resíduos de compilação locais.
2. **Validação de Assinatura Digital**:
   - Verificar a integridade do APK gerado:
     ```bash
     apksigner verify --verbose --print-certs app-debug.apk
     ```
   - Verificar se o `index-v1.jar` do repositório foi assinado pelo certificado do keystore configurado.
3. **Coexistência de Identificadores (Canary vs Prod)**:
   - Instalar o APK Canary (`app.avalia.*.canary`) e o APK Oficial (`app.avalia.*`) no mesmo dispositivo físico para validar ausência de colisão de pacotes.
4. **Persistência e Integridade Multi-Release**:
   - Disparar uma segunda publicação e confirmar que os diretórios `repo` e `repo-dev/repo` permanecem consistentes no GitHub Pages, preservando versões anteriores e mantendo o índice F-Droid atualizado.
5. **Teste de Atualização OTA**:
   - Validar se o cliente F-Droid no dispositivo detecta automaticamente a nova versão e realiza o upgrade sem quebra de integridade de dados locais.

