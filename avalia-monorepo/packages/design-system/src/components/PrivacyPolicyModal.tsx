import React, { useState } from 'react';

export interface PrivacyPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    appName: string;
    defaultTab?: 'privacy' | 'terms' | 'ai' | 'cookies' | 'oss';
}

export function PrivacyPolicyModal({ isOpen, onClose, appName, defaultTab = 'privacy' }: PrivacyPolicyModalProps) {
    const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'ai' | 'cookies' | 'oss'>(defaultTab);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 animate-fade-in">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-3xl max-h-[85vh] bg-brand-card border border-gray-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700/30 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-brand-blue/10 text-brand-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Políticas do App</h2>
                            <p className="text-xs text-gray-400">{appName} • Termos, Privacidade, IA, Cookies e Open Source</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        title="Fechar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tab Navigation Bar */}
                <div className="flex border-b border-gray-700/30 bg-black/10 px-4 pt-2 overflow-x-auto gap-2 scrollbar-none">
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'privacy'
                                ? 'bg-brand-card text-brand-blue border-brand-blue shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-white/5'
                        }`}
                    >
                        Privacidade (LGPD)
                    </button>
                    <button
                        onClick={() => setActiveTab('terms')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'terms'
                                ? 'bg-brand-card text-brand-blue border-brand-blue shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-white/5'
                        }`}
                    >
                        Termos de Uso
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'ai'
                                ? 'bg-brand-card text-brand-blue border-brand-blue shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-white/5'
                        }`}
                    >
                        Uso de IA
                    </button>
                    <button
                        onClick={() => setActiveTab('cookies')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'cookies'
                                ? 'bg-brand-card text-brand-blue border-brand-blue shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-white/5'
                        }`}
                    >
                        Cookies & Acessibilidade
                    </button>
                    <button
                        onClick={() => setActiveTab('oss')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'oss'
                                ? 'bg-brand-card text-brand-blue border-brand-blue shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-white/5'
                        }`}
                    >
                        Open Source & Licença
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-sm text-gray-300 leading-relaxed custom-scrollbar">
                    {activeTab === 'privacy' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <h3 className="text-base font-bold text-white mb-2">
                                    Política de Privacidade e Proteção de Dados (LGPD)
                                </h3>
                                <p>
                                    No <strong>{appName}</strong>, levamos a privacidade e a segurança dos seus dados com extrema responsabilidade, em conformidade total com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">1. Coleta e Armazenamento Local</h4>
                                <p>
                                    O aplicativo funciona no modelo <em>client-side first</em>. Não coletamos dados pessoais identificáveis (PII) nem armazenamos seu histórico privado de navegação em servidores terceiros sem o seu consentimento explícito.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                    <li>Preferências visuais (Tema Claro/Escuro, Zoom da tela).</li>
                                    <li>Configurações de som e narração/síntese de voz (TTS).</li>
                                    <li><strong>Histórico de Temas:</strong> Até 50 palavras-chave temáticas são salvas localmente para evitar repetição de perguntas. Você pode limpar este histórico a qualquer momento em "Limpar Histórico" nas configurações do jogo.</li>
                                    <li><strong>Modo Chave API (BYOK):</strong> Sua chave pessoal é armazenada em texto plano no localStorage do navegador e enviada diretamente às APIs oficiais do provedor, sem passar por nossos servidores. <strong>Recomendação:</strong> Use apenas em dispositivos pessoais confiáveis. Faça logout ao usar computadores públicos ou compartilhados.</li>
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">2. Compartilhamento de Informações</h4>
                                <p>
                                    Não vendemos nem compartilhamos dados pessoais para fins publicitários. Ao utilizar funcionalidades específicas (como personalização de quizzes por IA ou tradução em LIBRAS), seu navegador estabelece comunicação direta com os provedores necessários para a prestação do serviço.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">3. Direitos do Titular</h4>
                                <p>
                                    Você tem total controle sobre seus dados. A qualquer momento, é possível redefinir ou apagar todo o histórico local clicando em <strong>Alterar Chave / Sair</strong> ou limpando os dados de navegação do seu browser.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'terms' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <h3 className="text-base font-bold text-white mb-2">
                                    Termos de Uso e Condições do Serviço
                                </h3>
                                <p>
                                    Ao utilizar a plataforma <strong>{appName}</strong>, você concorda com os termos e regras estabelecidos abaixo.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">1. Finalidade da Plataforma</h4>
                                <p>
                                    O <strong>{appName}</strong> é uma ferramenta educacional e interativa desenvolvida para geração dinâmica de quizzes, testes de conhecimento e estudo com auxílio de Inteligência Artificial.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">2. Conteúdo Gerado por IA e Responsabilidade</h4>
                                <p>
                                    O Avalia Quiz não realiza moderação prévia manual ou censura própria sobre o conteúdo gerado pela IA. A filtragem de temas inadequados depende dos filtros nativos de segurança dos provedores utilizados (Google AI, OpenAI, Groq, Anthropic, DeepSeek, OpenRouter). O usuário é o único responsável por revisar e validar os conteúdos antes do uso ou compartilhamento.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">3. Uso Aceitável</h4>
                                <p>É proibido utilizar o aplicativo para:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                    <li>Gerar conteúdo discriminatório, odioso, difamatório ou ilegal.</li>
                                    <li>Ataques de força bruta contra credenciais de autenticação ou chaves de acesso.</li>
                                    <li>Engenharia reversa não autorizada do código ou APIs do projeto.</li>
                                    <li>Distribuição automatizada não autorizada (spams ou bots em massa).</li>
                                    <li>
                                        <strong>Abuso de Cotas de Provedores:</strong> Ao utilizar o modo Chave API (BYOK) ou qualquer outro método de geração, você é responsável por respeitar os limites de uso e cotas estabelecidas pelos provedores de IA (Google AI, OpenAI, Groq, etc.). O usuário assume integralmente a responsabilidade por consumo de tokens e cumprimento dos termos de serviço dos provedores.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">4. Propriedade Intelectual</h4>
                                <p>
                                    A marca, o design do aplicativo e a arquitetura visual pertencem ao ecossistema Avalia. Os conteúdos de perguntas gerados por IA pertencem ao usuário para fins educacionais e acadêmicos.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <h3 className="text-base font-bold text-white mb-2">
                                    Diretrizes de Uso de Inteligência Artificial
                                </h3>
                                <p>
                                    O <strong>{appName}</strong> integra provedores de Inteligência Artificial de alta precisão (Google Gemini, OpenAI, Groq, DeepSeek, Anthropic Claude e OpenRouter) para criação automatizada de desafios, feedback instantâneo e suporte interativo.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">1. Processamento de Conteúdo e Envio de Dados para a IA</h4>
                                <p>
                                    Nenhum dado pessoal, histórico de navegação ou informação do seu dispositivo é enviado automaticamente para os servidores dos provedores de Inteligência Artificial.
                                </p>
                                <p className="mt-2 text-gray-400">
                                    <strong>Dados Enviados para Provedores de IA:</strong> No modo Chave API (BYOK), você fornece sua credencial de acesso — isso é esperado e necessário para autorizar suas requisições diretamente do seu navegador. Porém, ao personalizar quizzes com temas, links ou trechos de texto, você é responsável por não incluir tokens de acesso privados, senhas ou dados sensíveis nesses campos, pois a string completa será enviada como contexto para a IA gerar o seu desafio.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">2. Limitações e Isenção de Responsabilidade</h4>
                                <p>
                                    Embora utilizemos Engenharia de Prompt rigorosa para garantir alta precisão científica e pedagógica, modelos de linguagem generativa podem eventualmente apresentar inconsistências ou alucinações. 
                                </p>
                                <p className="mt-2 text-xs text-brand-blue font-bold">
                                    Recomendação: Para provas oficiais ou pesquisas acadêmicas críticas, verifique sempre as fontes primárias.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">3. Interação em Tempo Real (Live Voice & Chat)</h4>
                                <p>
                                    Nas modalidades de resposta livre e live por voz, a entrada de áudio é convertida para texto para permitir a validação conceitual por IA sem armazenamento permanente de voz pelo Avalia Quiz.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'cookies' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <h3 className="text-base font-bold text-white mb-2">
                                    LocalStorage, Acessibilidade & LIBRAS
                                </h3>
                                <p>
                                    Transparência sobre os recursos técnicos que garantem uma experiência fluida e inclusiva para todos os usuários.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">1. Uso de LocalStorage (Sem Cookies)</h4>
                                <p>
                                    O aplicativo utiliza exclusivamente o <code>localStorage</code> do seu navegador para manter suas sessões ativas e salvar suas preferências de jogo. Não gravamos cookies de rastreamento nem arquivos de cookies em seu computador.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">2. Acessibilidade em LIBRAS</h4>
                                <p>
                                    O aplicativo oferece suporte à Língua Brasileira de Sinais via integração com a ferramenta pública VLibras. Ao ativar este recurso, componentes visuais e avatares 3D são carregados diretamente dos servidores públicos oficiais do Governo Federal (<code>vlibras.gov.br</code>). 
                                </p>
                                <p className="mt-2 text-gray-400">
                                    <strong>Nota Técnica:</strong> Ao realizar essas requisições HTTP, informações técnicas como seu endereço IP e determinados headers padrão do navegador podem ser processados pelo servidor responsável pelo recurso (Governo Federal), conforme suas próprias políticas de privacidade.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">3. Síntese de Voz (TTS) e Atalhos de Teclado</h4>
                                <p>
                                    Disponibilizamos leitura de conteúdo por síntese de voz e transcrição local via Web Speech API nativa do seu navegador. O Avalia Quiz não armazena nem envia deliberadamente gravações de áudio próprias. A navegação acessível suporta os atalhos de teclado: <code>1-4</code> / <code>A-D</code> (seleção de alternativas), <code>Espaço</code> / <code>Enter</code> (avançar), <code>Esc</code> (fechar menus) e <code>Tab</code> (foco).
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'oss' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <h3 className="text-base font-bold text-white mb-2">
                                    Política Open Source e Licenciamento
                                </h3>
                                <p>
                                    O ecossistema <strong>{appName}</strong> apoia os princípios do software livre e da cultura open-source, promovendo transparência, colaboração e auditabilidade de código.
                                </p>
                            </section>

                            <section className="p-4 bg-brand-blue/10 border border-brand-blue/30 rounded-2xl">
                                <h4 className="text-brand-blue font-bold mb-2">1. Licença GNU General Public License v3.0 (GPLv3)</h4>
                                <p className="text-gray-200">
                                    O código-fonte do <strong>{appName}</strong> é 100% open-source sob a licença <strong>GPLv3</strong>. Você tem liberdade para estudar, modificar e redistribuir o código, inclusive para fins comerciais. <strong>Obrigação de Copyleft:</strong> A redistribuição de cópias ou versões modificadas do software deve seguir os termos de licenciamento da GPLv3.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">2. Transparência e Auditabilidade</h4>
                                <p>
                                    Todo o processamento de estado, validação de regras de jogo e manipulação local é executado via código client-side aberto, permitindo que desenvolvedores e pesquisadores auditem o funcionamento da aplicação.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">3. Bibliotecas e Licenças de Terceiros</h4>
                                <p>
                                    Agradecemos e respeitamos a comunidade de software livre. Embora o código deste projeto seja licenciado sob a GPLv3, ele faz uso de bibliotecas de terceiros licenciadas sob termos permissivos (como MIT, Apache 2.0 e BSD), incluindo:
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                    <li>React 19 & TypeScript</li>
                                    <li>Vite, TailwindCSS & Turborepo</li>
                                    <li>Google Gen AI SDK & Firebase SDK</li>
                                    <li>VLibras Core & Unity Engine WebGL</li>
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">4. Diretrizes para Contribuição</h4>
                                <p>
                                    Contribuições da comunidade para correção de falhas, melhorias de acessibilidade ou novas funcionalidades são bem-vindas através dos repositórios oficiais da organização no GitHub.
                                </p>
                            </section>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-700/30 text-[10px] text-gray-500 text-center">
                        Avalia Quiz Ecosystem • Atualizado em Julho de 2026 • v1.9.49
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 flex justify-between items-center border-t border-gray-700/30">
                    <span className="text-xs text-gray-500 hidden sm:inline">
                        Dúvidas? Consulte a documentação oficial.
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-brand-blue text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all shadow-lg ml-auto"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

export const AppPoliciesModal = PrivacyPolicyModal;
