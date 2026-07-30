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
                                    <li>Histórico de palavras-chave usadas localmente para evitar repetições.</li>
                                    <li>No modo Chave API (BYOK), sua chave pessoal é armazenada exclusivamente de forma local no seu navegador. Nenhuma informação pessoal ou credencial privada sua é coletada ou compartilhada.</li>
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">2. Compartilhamento de Informações</h4>
                                <p>
                                    Não vendemos, alugamos ou compartilhamos seus dados com anunciantes ou terceiros. O envio de requisições ocorre diretamente entre o seu navegador e as APIs oficiais do ecossistema.
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
                                <h4 className="text-white font-bold mb-2">2. Uso Aceitável</h4>
                                <p>É proibido utilizar o aplicativo para:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                    <li>Gerar conteúdo discriminatório, odioso, difamatório ou ilegal.</li>
                                    <li>Tentativas de engenharia reversa para burlar cotas de API ou chaves de acesso.</li>
                                    <li>Distribuição automatizada não autorizada (spams ou bots em massa).</li>
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">3. Propriedade Intelectual</h4>
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
                                <h4 className="text-white font-bold mb-2">1. Como os Prompts São Processados</h4>
                                <p>
                                    Ao solicitar a geração de um quiz, os tópicos escolhidos são enviados de forma anônima para a API da Google AI. Nenhuma informação pessoal ou credencial de conta é incluída no prompt enviado.
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
                                    Nas modalidades de resposta livre e live por voz, a entrada de áudio é convertida para texto para permitir a validação conceitual por IA sem armazenamento permanente de voz.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'cookies' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <h3 className="text-base font-bold text-white mb-2">
                                    Cookies, Armazenamento & Acessibilidade
                                </h3>
                                <p>
                                    Transparência sobre os recursos técnicos que garantem uma experiência fluida e inclusiva para todos os usuários.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">1. Uso de Cookies e LocalStorage</h4>
                                <p>
                                    Utilizamos exclusivamente cookies técnicos e `localStorage` estritamente necessários para manter suas sessões de jogo ativas e salvar suas preferências sem necessidade de logins invasivos.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">2. Acessibilidade Inclusiva & LIBRAS</h4>
                                <p>
                                    O aplicativo possui suporte nativo à Língua Brasileira de Sinais através da integração com o <strong>VLibras Widget / Unity Motor</strong>, permitindo tradução e animação de glosas em tempo real para pessoas surdas ou com deficiência auditiva.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-white font-bold mb-2">3. Síntese de Voz (TTS) e Atalhos de Teclado</h4>
                                <p>
                                    Disponibilizamos suporte à leitura de perguntas por voz sintetizada e navegação acessível via teclado (`Tab`, `Espaço`, `Enter` e `Esc`).
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
                                <h4 className="text-brand-blue font-bold mb-2">1. Este Aplicativo é 100% Open Source</h4>
                                <p className="text-gray-200">
                                    O <strong>{appName}</strong> é um projeto inteiramente open-source. Todo o código-fonte desta aplicação (incluindo o motor de jogo, o sistema de design visual, os componentes de acessibilidade em LIBRAS e os conectores da Google Gemini API) está publicamente disponível para estudo, auditoria e uso livre.
                                </p>
                                <p className="mt-2 text-xs text-gray-400">
                                    Você pode visualizar o código, criar bifurcações (forks), propor melhorias ou hospedar sua própria versão autônoma da plataforma.
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
                                    Agradecemos e respeitamos a comunidade de software livre. Este projeto faz uso de bibliotecas de código aberto sob licenças permissivas (MIT, Apache 2.0 e BSD), incluindo:
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
