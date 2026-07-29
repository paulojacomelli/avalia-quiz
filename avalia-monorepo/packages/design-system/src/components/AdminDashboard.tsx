import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  loginWithGoogle, logoutGoogle, subscribeAuthState,
  fetchTelemetryLogs, fetchSavedQuizzes,
  logTelemetryEvent, updateSavedQuizQuestions, checkIsUserAdmin
} from '@avalia/services';
import { TelemetryLogEntry } from '@avalia/core';

interface AdminDashboardProps {
  appName?: string;
  onReturnToQuiz?: () => void;
  themeLabelMap?: Record<string, string>;
}

class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode; onReturnToQuiz?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Erro capturado no AdminDashboard:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen bg-[#0d0e12] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-3xl max-w-lg space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-red-400">Falha ao Carregar o Painel Restrito</h2>
            <p className="text-xs text-gray-300">
              Ocorreu um erro inesperado durante o processamento dos dados de BI ou autenticação.
            </p>
            <div className="bg-black/60 p-3 rounded-xl border border-red-500/20 text-[11px] font-mono text-red-300 text-left overflow-auto max-h-36">
              {this.state.error?.message || "Erro desconhecido de renderização."}
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-colors"
              >
                Recarregar Página
              </button>
              {this.props.onReturnToQuiz && (
                <button
                  onClick={this.props.onReturnToQuiz}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Voltar ao Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- COMPONENTE DE GRÁFICO DE LINHA E ÁREA SVG POR TEMPO ---
const TimelineLineChart: React.FC<{ data: { label: string; value: number }[]; color?: string }> = ({ data, color = '#f59e0b' }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value), 5);
  const height = 150;
  const width = 800;
  const padding = 25;
  const gradId = `lineAreaGrad_${color.replace('#', '')}`;

  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  // Amostragem inteligente para evitar sobreposição de rótulos no eixo X
  const visibleIndices = useMemo(() => {
    const total = data.length;
    if (total <= 8) return new Set(data.map((_, i) => i));
    const targetTicks = 6;
    const step = (total - 1) / (targetTicks - 1);
    const indices = new Set<number>();
    for (let i = 0; i < targetTicks; i++) {
      indices.add(Math.round(i * step));
    }
    return indices;
  }, [data.length]);

  const showAllDots = data.length <= 15;

  return (
    <div className="w-full space-y-3">
      <div className="relative w-full h-40">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <polygon points={areaPoints} fill={`url(#${gradId})`} />

          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {data.map((d, idx) => {
            const x = padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding);
            const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
            const isLast = idx === data.length - 1;
            const hasValue = d.value > 0;
            const shouldRenderDot = showAllDots || isLast || hasValue;

            return (
              <g key={idx} className="group">
                {shouldRenderDot && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isLast ? "6" : hasValue ? "5" : "3.5"}
                    fill={color}
                    className="transition-all group-hover:r-8 stroke-[#0d0e12] stroke-2 cursor-pointer"
                  />
                )}
                {/* Legenda de valor no gráfico: Exibida no hover do usuário ou no ponto ativo */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <rect x={Math.min(width - 55, Math.max(5, x - 24))} y={y - 34} width="48" height="24" rx="6" fill="#14151d" stroke={color} strokeWidth="2" />
                  <text x={Math.min(width - 31, Math.max(29, x))} y={y - 18} textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="monospace">
                    {d.value}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Eixo X com posicionamento relativo e limites seguros */}
      <div className="relative w-full h-5 text-[11px] font-mono font-bold text-gray-400 overflow-hidden">
        {data.map((d, idx) => {
          if (!visibleIndices.has(idx)) return null;
          const pct = (idx / Math.max(1, data.length - 1)) * 100;
          return (
            <span
              key={idx}
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
              style={{
                left: `${pct}%`,
                transform: idx === 0 ? 'translateX(0%)' : idx === data.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)'
              }}
            >
              {d.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// --- COMPONENTE DE GRÁFICO MULTI-LINHAS PARA COMPARATIVO DE MODELOS POR TEMPO ---
const MultiModelTimelineChart: React.FC<{
  days: string[];
  series: { name: string; color: string; data: number[] }[];
}> = ({ days, series }) => {
  if (!series || series.length === 0) {
    return <div className="text-xs text-gray-500 italic py-8 text-center">Sem dados suficientes para comparar modelos por tempo.</div>;
  }

  const width = 800;
  const height = 150;
  const padding = 25;

  const allValues = series.flatMap(s => s.data);
  const maxValue = Math.max(...allValues, 5);

  const visibleIndices = useMemo(() => {
    const total = days.length;
    if (total <= 8) return new Set(days.map((_, i) => i));
    const targetTicks = 6;
    const step = (total - 1) / (targetTicks - 1);
    const indices = new Set<number>();
    for (let i = 0; i < targetTicks; i++) {
      indices.add(Math.round(i * step));
    }
    return indices;
  }, [days.length]);

  const showAllDots = days.length <= 15;

  return (
    <div className="w-full space-y-3">
      <div className="relative w-full h-40">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = height - padding - ratio * (height - 2 * padding);
            return (
              <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            );
          })}

          {series.map((s, sIdx) => {
            const points = s.data.map((val, idx) => {
              const x = padding + (idx / Math.max(1, days.length - 1)) * (width - 2 * padding);
              const y = height - padding - (val / maxValue) * (height - 2 * padding);
              return `${x},${y}`;
            }).join(' ');

            return (
              <g key={sIdx}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                  className="transition-all duration-300 hover:stroke-[4.5]"
                />
                {s.data.map((val, idx) => {
                  const x = padding + (idx / Math.max(1, days.length - 1)) * (width - 2 * padding);
                  const y = height - padding - (val / maxValue) * (height - 2 * padding);
                  const isLast = idx === days.length - 1;
                  const hasValue = val > 0;
                  const shouldRenderDot = showAllDots || isLast || hasValue;

                  return (
                    <g key={idx} className="group">
                      {shouldRenderDot && (
                        <circle
                          cx={x}
                          cy={y}
                          r={isLast ? "6" : hasValue ? "5" : "3.5"}
                          fill={s.color}
                          className="stroke-[#0d0e12] stroke-2 cursor-pointer group-hover:r-8 transition-all"
                        />
                      )}
                      {val > 0 && (
                        <g className={isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"}>
                          <rect x={Math.min(width - 55, Math.max(5, x - 24))} y={y - 34} width="48" height="24" rx="6" fill="#14151d" stroke={s.color} strokeWidth="2" />
                          <text x={Math.min(width - 31, Math.max(29, x))} y={y - 18} textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="monospace">
                            {val}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="relative w-full h-5 text-[11px] font-mono font-bold text-gray-400 overflow-hidden">
        {days.map((day, idx) => {
          if (!visibleIndices.has(idx)) return null;
          const pct = (idx / Math.max(1, days.length - 1)) * 100;
          return (
            <span
              key={idx}
              className="absolute top-0 whitespace-nowrap"
              style={{
                left: `${pct}%`,
                transform: idx === 0 ? 'translateX(0%)' : idx === days.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)'
              }}
            >
              {day}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        {series.map((s, idx) => {
          const totalVal = s.data.reduce((acc, curr) => acc + curr, 0);
          return (
            <div key={idx} className="flex items-center gap-2 bg-[#1c1d26] px-3 py-1.5 rounded-xl border border-white/10 text-xs shadow-sm">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
              <span className="text-gray-100 font-semibold whitespace-nowrap">{s.name}</span>
              <span className="text-amber-400 font-mono font-bold text-xs">({totalVal})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- COMPONENTE DE GRÁFICO DE PIZZA / DONUT SVG ---
const DonutPieChart: React.FC<{
  items: { name: string; value: number; color: string }[];
  total: number;
  centerValue?: string | number;
  centerLabel?: string;
}> = ({ items, total, centerValue, centerLabel }) => {
  const PAGE_SIZE = 10;
  const PAGINATION_THRESHOLD = 25;

  const [expanded, setExpanded] = React.useState(false);
  const [page, setPage] = React.useState(1);

  if (total === 0) return <div className="text-xs text-gray-500 italic py-8 text-center">Sem dados suficientes para o gráfico de pizza.</div>;

  let currentAngle = 0;
  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const displayCenterValue = centerValue !== undefined ? centerValue : total;
  const displayCenterLabel = centerLabel !== undefined ? centerLabel : 'Total';

  const hasPagination = items.length > PAGINATION_THRESHOLD;
  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  let visibleItems: typeof items;
  if (hasPagination) {
    const start = (page - 1) * PAGE_SIZE;
    visibleItems = items.slice(start, start + PAGE_SIZE);
  } else if (expanded) {
    visibleItems = items;
  } else {
    visibleItems = items.slice(0, PAGE_SIZE);
  }

  const showToggle = !hasPagination && items.length > PAGE_SIZE;

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {/* GRÁFICO DONUT — renderiza todos os itens para manter proporção visual */}
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center mx-auto my-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {items.map((item, idx) => {
            if (item.value === 0) return null;
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -currentAngle * circumference;
            currentAngle += item.value / total;

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 hover:opacity-80"
              />
            );
          })}
        </svg>
        <div className="absolute text-center">
          <span className="text-xl font-black font-mono text-white">{displayCenterValue}</span>
          <span className="text-[9px] font-mono text-gray-400 block uppercase">{displayCenterLabel}</span>
        </div>
      </div>

      {/* LEGENDAS COM PAGINAÇÃO OU VER MAIS */}
      <div className="w-full space-y-2 pt-3 border-t border-white/10">
        {visibleItems.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center justify-between gap-3 w-full border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-3 h-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-100 font-semibold text-xs truncate" title={item.name}>{item.name}</span>
              </div>
              <span className="font-mono text-amber-300 font-bold text-xs whitespace-nowrap shrink-0">{item.value} ({pct}%)</span>
            </div>
          );
        })}
      </div>

      {/* CONTROLE: VER MAIS / VER MENOS (≤25 itens) */}
      {showToggle && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="w-full text-center text-xs font-bold text-amber-400 hover:text-amber-300 py-1.5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
        >
          {expanded ? `▲ Ver menos` : `▼ Ver mais (${items.length - PAGE_SIZE} ocultos)`}
        </button>
      )}

      {/* CONTROLE: PAGINAÇÃO (>25 itens) */}
      {hasPagination && (
        <div className="flex items-center justify-between w-full pt-1 gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >
            ← Anterior
          </button>
          <span className="text-xs font-mono text-gray-400">
            Página <span className="text-white font-bold">{page}</span> / {totalPages}
            <span className="text-gray-600 ml-1">({items.length} modelos)</span>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
};

const AUTHORIZED_ADMINS: string[] = [];

const AdminDashboardContent: React.FC<AdminDashboardProps> = ({ appName = 'Sistema', onReturnToQuiz, themeLabelMap = {} }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<'overview' | 'ai_metrics' | 'tables'>('overview');
  const [activeTab, setActiveTab] = useState<'logs' | 'quizzes'>('logs');
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>('all');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- FILTRO DE PERÍODO / TEMPO ---
  type TimeRangePreset = '1h' | '24h' | '3d' | '7d' | '15d' | '30d' | '60d' | '90d' | 'custom';
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [latencyViewMode, setLatencyViewMode] = useState<'provider' | 'model'>('provider');

  const [logsPage, setLogsPage] = useState<number>(1);
  const [quizzesPage, setQuizzesPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setLogsPage(1);
    setQuizzesPage(1);
  }, [searchQuery, selectedAppFilter]);

  // Métrica ativa para o Gráfico de Linha por Tempo
  const [chartMetric, setChartMetric] = useState<'quizzes' | 'errors' | 'users' | 'logs'>('quizzes');

  const METRIC_COLORS: Record<string, string> = {
    quizzes: '#f59e0b',
    errors: '#ef4444',
    users: '#3b82f6',
    logs: '#10b981',
  };

  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedQuizDetail, setSelectedQuizDetail] = useState<any | null>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<TelemetryLogEntry | null>(null);

  // --- GERENCIAMENTO DE QUESTÕES DO QUIZ (MARCAR ERRADA, EDITAR E DESCARTAR) ---
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Record<string, boolean>>({});
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<{
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }>({ question: '', options: [], correctAnswerIndex: 0, explanation: '' });

  const handleReportQuestion = (questionKey: string, questionText: string) => {
    setReportedQuestionIds(prev => ({ ...prev, [questionKey]: true }));
    logTelemetryEvent({
      eventType: 'error',
      errorCode: 'BAD_QUESTION',
      appName: selectedQuizDetail?.appName || appName || 'Sistema',
      title: 'Questão Marcada como Incorreta no Admin',
      errorMessage: `Questão apontada com erro: ${questionText}`,
      solution: 'Revisar enunciado, alternativas ou resposta correta no editor.'
    });
  };

  const handleDiscardQuestion = async (questionIdx: number) => {
    if (!selectedQuizDetail || !selectedQuizDetail.questions) return;
    const updatedQuestions = selectedQuizDetail.questions.filter((_: any, idx: number) => idx !== questionIdx);
    const updatedQuiz = { ...selectedQuizDetail, questions: updatedQuestions };

    setSelectedQuizDetail(updatedQuiz);
    setQuizzes(prev => prev.map(q => q.id === selectedQuizDetail.id ? updatedQuiz : q));

    if (selectedQuizDetail.id) {
      await updateSavedQuizQuestions(selectedQuizDetail.id, updatedQuestions);
    }
  };

  const handleStartEditing = (idx: number, q: any) => {
    setEditingQuestionIndex(idx);
    setEditFormData({
      question: q.question || '',
      options: q.options ? [...q.options] : [],
      correctAnswerIndex: q.correctAnswerIndex ?? 0,
      explanation: q.explanation || ''
    });
  };

  const handleSaveEditedQuestion = async (idx: number) => {
    if (!selectedQuizDetail || !selectedQuizDetail.questions) return;
    const updatedQuestions = [...selectedQuizDetail.questions];
    updatedQuestions[idx] = {
      ...updatedQuestions[idx],
      question: editFormData.question,
      options: editFormData.options,
      correctAnswerIndex: editFormData.correctAnswerIndex,
      explanation: editFormData.explanation
    };

    const updatedQuiz = { ...selectedQuizDetail, questions: updatedQuestions };
    setSelectedQuizDetail(updatedQuiz);
    setQuizzes(prev => prev.map(q => q.id === selectedQuizDetail.id ? updatedQuiz : q));
    setEditingQuestionIndex(null);

    if (selectedQuizDetail.id) {
      await updateSavedQuizQuestions(selectedQuizDetail.id, updatedQuestions);
    }
  };

  // Verificação Dinâmica de Autorização via Firebase
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeAuthState((currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);
      if (currentUser?.email) {
        checkIsUserAdmin(currentUser.email)
          .then((authorized) => {
            if (isMounted) {
              setIsAuthorized(authorized);
              setLoadingAuth(false);
            }
          })
          .catch((err) => {
            console.warn("Aviso de verificação admin:", err);
            if (isMounted) {
              setIsAuthorized(true);
              setLoadingAuth(false);
            }
          });
      } else {
        setIsAuthorized(false);
        setLoadingAuth(false);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    console.log('[DEBUG AUTH] Executando loadData... user:', user?.email, 'isAuthorized:', isAuthorized);
    if (!user || !isAuthorized) {
      console.warn('[DEBUG AUTH] loadData abortado por falta de user ou isAuthorized');
      return;
    }
    setLoadingData(true);
    try {
      const [logsData, quizzesData] = await Promise.all([
        fetchTelemetryLogs(1000),
        fetchSavedQuizzes(1000)
      ]);
      console.log('[DEBUG AUTH] Quizzes e Logs carregados com sucesso. Quizzes:', quizzesData.length, 'Logs:', logsData.length);
      setLogs(logsData);
      setQuizzes(quizzesData);
    } catch (err: any) {
      console.error("Erro ao carregar dados de BI:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    console.log('[DEBUG AUTH] Status atual -> user:', user?.email, 'isAuthorized:', isAuthorized);
    if (user && isAuthorized) loadData();
  }, [user, isAuthorized]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err?.message || 'Falha ao autenticar com Google.');
    }
  };

  // --- LISTA DINÂMICA DE APLICATIVOS ---
  const availableApps = useMemo(() => {
    const appSet = new Set<string>();
    (logs || []).forEach(l => { if (l?.appName?.trim()) appSet.add(l.appName.trim()); });
    (quizzes || []).forEach(q => { if (q?.appName?.trim()) appSet.add(q.appName.trim()); });
    return Array.from(appSet);
  }, [logs, quizzes]);

  // --- FILTRAGEM DE ESCOPO POR APP PARA MÉTRICAS E GRÁFICOS ---
  const scopedLogs = useMemo(() => {
    if (!logs) return [];
    if (selectedAppFilter === 'all') return logs;
    return logs.filter(log => log && log.appName === selectedAppFilter);
  }, [logs, selectedAppFilter]);

  const scopedQuizzes = useMemo(() => {
    if (!quizzes) return [];
    if (selectedAppFilter === 'all') return quizzes;
    return quizzes.filter(quiz => quiz && quiz.appName === selectedAppFilter);
  }, [quizzes, selectedAppFilter]);

  // --- HELPER DE DETECÇÃO DE ERROS ---
  const isErrorLog = useCallback((l: any): boolean => {
    if (!l) return false;
    const type = String(l.eventType || '').toLowerCase();
    const code = String(l.errorCode || '').toLowerCase();
    const msg = String(l.errorMessage || '').toLowerCase();
    const title = String(l.title || '').toLowerCase();

    if (type.includes('error') || type.includes('err') || type.includes('fail')) return true;
    if (code && code !== '200' && code !== '0' && code !== 'ok' && code !== 'undefined') return true;
    if (msg.includes('error') || msg.includes('erro') || msg.includes('fail') || msg.includes('falha') || msg.includes('exception') || msg.includes('invalid')) return true;
    if (title.includes('erro') || title.includes('falha') || title.includes('incorreta')) return true;

    return Boolean(l.errorCode) || Boolean(l.errorMessage);
  }, []);

  // --- CÁLCULOS E MÉTRICAS DE BI ---
  const filteredLogs = useMemo(() => {
    const toMs = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts === 'object' && 'seconds' in ts) return ts.seconds * 1000;
      const d = new Date(ts);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    return scopedLogs
      .filter(log => {
        if (!log) return false;
        const eventMatch = selectedEventFilter === 'all'
          ? true
          : selectedEventFilter === 'error'
            ? isErrorLog(log)
            : log.eventType === selectedEventFilter;
        const searchMatch = !searchQuery.trim() ||
          (log.title && log.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (log.errorMessage && log.errorMessage.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (log.errorCode && log.errorCode.toLowerCase().includes(searchQuery.toLowerCase()));
        return eventMatch && searchMatch;
      })
      .sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
  }, [scopedLogs, selectedEventFilter, searchQuery, isErrorLog]);

  const filteredQuizzes = useMemo(() => {
    const toMs = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts === 'object' && 'seconds' in ts) return ts.seconds * 1000;
      const d = new Date(ts);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    return scopedQuizzes
      .filter(quiz => {
        if (!quiz) return false;
        const searchMatch = !searchQuery.trim() ||
          (quiz.title && quiz.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (quiz.theme && quiz.theme.toLowerCase().includes(searchQuery.toLowerCase()));
        return searchMatch;
      })
      .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }, [scopedQuizzes, searchQuery]);

  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, logsPage]);

  const totalLogsPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  }, [filteredLogs]);

  const paginatedQuizzes = useMemo(() => {
    const start = (quizzesPage - 1) * ITEMS_PER_PAGE;
    return filteredQuizzes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuizzes, quizzesPage]);

  const totalQuizzesPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredQuizzes.length / ITEMS_PER_PAGE));
  }, [filteredQuizzes]);

  const totalErrors = useMemo(() => scopedLogs.filter(isErrorLog).length, [scopedLogs, isErrorLog]);
  const totalQuizzes = scopedQuizzes.length;

  // Cálculo de Usuários / Dispositivos Únicos e Média de Quizzes por Usuário
  // Padrão estrito de mercado (GA4 / MS Clarity): contabiliza APENAS identificadores 100% precisos (clientId UUID v4 ou userEmail).
  const uniqueUsersCount = useMemo(() => {
    const userSet = new Set<string>();
    scopedLogs.forEach(l => {
      if (!l) return;
      const id = (l as any).clientId || l.userEmail;
      if (id) userSet.add(id);
    });
    scopedQuizzes.forEach(q => {
      if (!q) return;
      const id = q.clientId || q.userEmail || q.createdBy || q.userId;
      if (id) userSet.add(id);
    });
    return Math.max(1, userSet.size);
  }, [scopedLogs, scopedQuizzes]);

  const quizzesPerUserAverage = useMemo(() => {
    if (uniqueUsersCount === 0) return '0.0';
    return (totalQuizzes / uniqueUsersCount).toFixed(1);
  }, [totalQuizzes, uniqueUsersCount]);

  const normalizeErrorCode = (l: any): string => {
    let code = (l.errorCode || '').toString().trim();
    if (!code || code === 'ERRO' || code === 'Outros') {
      const fullText = String(l.errorMessage || l.title || '');
      if (fullText.includes('402')) code = '402';
      else if (fullText.includes('503')) code = '503';
      else if (fullText.includes('404')) code = '404';
      else if (fullText.includes('429')) code = '429';
      else if (fullText.includes('403') || fullText.includes('401')) code = '403';
      else code = 'Outros';
    }
    return code;
  };

  // Contagem por Código de Erro
  const errorCodeCounts = useMemo(() => {
    const counts: Record<string, number> = { '503': 0, '402': 0, '404': 0, '429': 0, '403': 0, 'Outros': 0 };
    scopedLogs.filter(isErrorLog).forEach(l => {
      const code = normalizeErrorCode(l);
      if (counts[code] !== undefined) counts[code] += 1;
      else counts['Outros'] += 1;
    });
    return counts;
  }, [scopedLogs]);

  // Contagem por Aplicativo para BI
  const appMetrics = useMemo(() => {
    const counts: Record<string, { total: number; errors: number; quizzes: number; users: Set<string> }> = {};
    availableApps.forEach(appName => {
      counts[appName] = { total: 0, errors: 0, quizzes: 0, users: new Set() };
    });

    (logs || []).forEach(l => {
      if (!l) return;
      const name = l.appName?.trim() || 'Avalia Quiz';
      if (!counts[name]) counts[name] = { total: 0, errors: 0, quizzes: 0, users: new Set() };
      counts[name].total += 1;
      if (l.eventType === 'error') counts[name].errors += 1;
      if (l.userAgent) counts[name].users.add(l.userAgent);
    });

    (quizzes || []).forEach(q => {
      if (!q) return;
      const name = q.appName?.trim() || 'Avalia Quiz';
      if (!counts[name]) counts[name] = { total: 0, errors: 0, quizzes: 0, users: new Set() };
      counts[name].quizzes += 1;
      if (q.createdBy) counts[name].users.add(q.createdBy);
    });

    return counts;
  }, [logs, quizzes, availableApps]);

  const normalizeAiModel = (rawModel?: string): string => {
    if (!rawModel) return 'Desconhecido';
    return rawModel.trim();
  };

  const getCanonicalRawModel = (rawModel?: string, rawProvider?: string): string => {
    const modelStr = String(rawModel || rawProvider || '').trim();
    return modelStr || 'Desconhecido';
  };

  const getCanonicalProvider = useCallback((rawModel?: string, rawProvider?: string): string => {
    if (rawProvider && rawProvider.trim() && rawProvider.trim().toLowerCase() !== 'auto') {
      const p = rawProvider.trim().toLowerCase();
      if (p === 'google-ai' || p === 'google_ai' || p === 'googleai') return 'Google AI';
      if (p === 'groq') return 'Groq';
      if (p === 'openrouter') return 'OpenRouter';
      if (p === 'deepseek') return 'DeepSeek';
      if (p === 'openai') return 'OpenAI';
      if (p === 'claude' || p === 'anthropic') return 'Claude';
      return rawProvider.trim();
    }
    if (rawModel && rawModel.trim()) {
      const m = rawModel.trim().toLowerCase();
      if (m.startsWith('groq/')) return 'Groq';
      if (m.startsWith('google-ai/') || m.startsWith('google/') || m.startsWith('gemini')) return 'Google AI';
      if (m.startsWith('openrouter/')) return 'OpenRouter';
      if (m.startsWith('deepseek/') || m.startsWith('deepseek')) return 'DeepSeek';
      if (m.startsWith('openai/') || m.startsWith('gpt')) return 'OpenAI';
      if (m.startsWith('claude/') || m.startsWith('claude') || m.startsWith('anthropic/')) return 'Claude';
    }
    return 'Desconhecido';
  }, []);

  const getProviderColor = useCallback((providerName: string): string => {
    const p = providerName.toLowerCase();
    if (p.includes('groq')) return '#f45036';
    if (p.includes('google')) return '#3b82f6';
    if (p.includes('openrouter')) return '#C8FF00';
    if (p.includes('deepseek')) return '#4d6bfe';
    if (p.includes('openai')) return '#10b981';
    if (p.includes('claude') || p.includes('anthropic')) return '#d97454';
    return '#ec4899';
  }, []);

  const formatTokenNumber = (num: number): string => {
    if (num < 10000) return num.toLocaleString('pt-BR');
    if (num < 1000000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
    return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 2)}M`;
  };

  const PALETTE_VIBRANT = [
    '#10b981', // Esmeralda
    '#C8FF00', // Neon
    '#f59e0b', // Amarelo
    '#3b82f6', // Azul
    '#a855f7', // Roxo
    '#ec4899', // Rosa
    '#06b6d4', // Ciano
    '#f97316', // Laranja
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#eab308', // Dourado
    '#8b5cf6', // Violeta
    '#d946ef', // Fuchsia
    '#0284c7', // Sky Blue
    '#84cc16', // Lime
    '#ef4444', // Red
  ];

  // Contagem e Estatísticas por Modelo de IA (Nomes Brutos)
  const modelMetrics = useMemo(() => {
    const counts: Record<string, { total: number; errors: number; quizzes: number }> = {};

    scopedLogs.forEach(l => {
      if (!l) return;
      const hasAi = Boolean((l as any).aiModel || (l as any).aiProvider || l.eventType === 'quiz_generated' || l.eventType === 'hint_used');
      if (!hasAi) return;
      const model = getCanonicalRawModel((l as any).aiModel, (l as any).aiProvider);
      if (!counts[model]) counts[model] = { total: 0, errors: 0, quizzes: 0 };
      counts[model].total += 1;
      if (isErrorLog(l)) counts[model].errors += 1;
    });

    scopedQuizzes.forEach(q => {
      if (!q) return;
      const model = getCanonicalRawModel(q.aiModel, q.aiProvider);
      if (!counts[model]) counts[model] = { total: 0, errors: 0, quizzes: 0 };
      counts[model].quizzes += 1;
    });

    return counts;
  }, [scopedLogs, scopedQuizzes]);

  // Mapa de cores sem repetição: cada modelo recebe uma cor única por ordem de aparecimento
  const modelColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const models = Object.keys(modelMetrics).sort((a, b) =>
      (modelMetrics[b].total + modelMetrics[b].quizzes) -
      (modelMetrics[a].total + modelMetrics[a].quizzes)
    );
    models.forEach((model, index) => {
      map.set(model, PALETTE_VIBRANT[index % PALETTE_VIBRANT.length]);
    });
    return map;
  }, [modelMetrics]);

  const getModelColor = useCallback((modelName: string): string =>
    modelColorMap.get(modelName) ?? '#10b981', [modelColorMap]);

  // Gráfico de Pizza de Uso por Modelo de IA
  const modelPieData = useMemo(() => {
    const rawItems = Object.entries(modelMetrics).map(([name, metrics]) => ({
      name,
      value: Math.max(metrics.quizzes, metrics.total),
      color: getModelColor(name)
    }));
    rawItems.sort((a, b) => b.value - a.value);
    const total = rawItems.reduce((acc, curr) => acc + curr.value, 0);
    return { items: rawItems, total };
  }, [modelMetrics, getModelColor]);

  // Gráfico de Pizza de Erros por Modelo de IA
  const modelErrorPieData = useMemo(() => {
    const rawItems = Object.entries(modelMetrics)
      .map(([name, metrics]) => ({
        name,
        value: metrics.errors,
        color: getModelColor(name)
      }))
      .filter(item => item.value > 0);

    rawItems.sort((a, b) => b.value - a.value);
    const total = rawItems.reduce((acc, curr) => acc + curr.value, 0);
    return { items: rawItems, total };
  }, [modelMetrics, getModelColor]);

  // Gráfico de Pizza por Categoria de Dispositivo Físico (Desktop, Smartphone, Tablet, Smart TV, Outros)
  const deviceCategoryPieData = useMemo(() => {
    const counts: Record<string, number> = {};

    const parseDeviceCategory = (ua?: string): string => {
      if (!ua) return 'Outros';
      const lower = ua.toLowerCase();

      if (lower.includes('googletv') || lower.includes('google tv') || lower.includes('androidtv') || lower.includes('android tv') || lower.includes('tizen') || lower.includes('webos') || lower.includes('smart-tv') || lower.includes('smarttv')) {
        return 'Smart TV';
      }
      if (lower.includes('ipad') || lower.includes('tablet') || (lower.includes('android') && !lower.includes('mobile'))) {
        return 'Tablet';
      }
      if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('ipod') || lower.includes('android') || lower.includes('windows phone')) {
        return 'Smartphone';
      }
      if (lower.includes('windows') || lower.includes('macintosh') || lower.includes('linux') || lower.includes('cros') || lower.includes('x11')) {
        return 'Desktop';
      }

      return 'Outros';
    };

    scopedLogs.forEach(l => {
      if (!l || !l.userAgent) return;
      const cat = parseDeviceCategory(l.userAgent);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    scopedQuizzes.forEach(q => {
      if (!q || !q.userAgent) return;
      const cat = parseDeviceCategory(q.userAgent);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const colors: Record<string, string> = {
      'Desktop': '#3b82f6',
      'Smartphone': '#10b981',
      'Tablet': '#a855f7',
      'Smart TV': '#f59e0b',
      'Outros': '#9ca3af'
    };

    const items = Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((acc, curr) => acc + curr.value, 0);
    return { items, total };
  }, [scopedLogs, scopedQuizzes]);

  // Gráfico de Pizza por Sistema Operacional (Normalizado)
  const osPieData = useMemo(() => {
    const counts: Record<string, number> = {};

    const parseOS = (ua?: string): string => {
      if (!ua) return 'Outros';
      const lower = ua.toLowerCase();

      // TVs & Smart Devices
      if (lower.includes('googletv') || lower.includes('google tv') || lower.includes('androidtv') || lower.includes('android tv')) return 'Google TV';
      if (lower.includes('tizen')) return 'Tizen OS';
      if (lower.includes('webos') || lower.includes('web0s')) return 'webOS (LG)';

      // Mobile OS
      if (lower.includes('windows phone') || lower.includes('windowsphone')) return 'Windows Phone';
      if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ipod')) return 'iOS / iPadOS';
      if (lower.includes('android')) return 'Android';

      // Desktop OS: Windows
      if (lower.includes('windows')) return 'Windows';

      // Desktop OS: Linux Distros
      if (lower.includes('ubuntu')) return 'Ubuntu Linux';
      if (lower.includes('linux mint') || lower.includes('mint')) return 'Linux Mint';
      if (lower.includes('fedora')) return 'Fedora Linux';
      if (lower.includes('linux') || lower.includes('x11')) return 'Linux (Geral)';

      // Mac OS
      if (lower.includes('macintosh') || lower.includes('mac os x') || lower.includes('mac_powerpc')) return 'macOS';

      return 'Outros';
    };

    scopedLogs.forEach(l => {
      if (!l || !l.userAgent) return;
      const os = parseOS(l.userAgent);
      counts[os] = (counts[os] || 0) + 1;
    });

    scopedQuizzes.forEach(q => {
      if (!q || !q.userAgent) return;
      const os = parseOS(q.userAgent);
      counts[os] = (counts[os] || 0) + 1;
    });

    const colors: Record<string, string> = {
      'Windows': '#0078D4',
      'Windows Phone': '#2563EB',
      'iOS / iPadOS': '#38BDF8',
      'Android': '#3DDC84',
      'Ubuntu Linux': '#E95420',
      'Linux Mint': '#87C03D',
      'Fedora Linux': '#51A2DA',
      'Linux (Geral)': '#FCC624',
      'macOS': '#A2AAAD',
      'Google TV': '#4285F4',
      'Tizen OS': '#282C34',
      'webOS (LG)': '#A50034',
      'Outros': '#9CA3AF'
    };

    const items = Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((acc, curr) => acc + curr.value, 0);
    return { items, total };
  }, [scopedLogs, scopedQuizzes]);

  // Gráfico de Pizza por Navegador (Normalizado)
  const browserPieData = useMemo(() => {
    const counts: Record<string, number> = {};

    const parseBrowser = (ua?: string): string => {
      if (!ua) return 'Outros';
      const lower = ua.toLowerCase();

      if (lower.includes('samsungbrowser')) return 'Samsung Internet';
      if (lower.includes('brave')) return 'Brave';
      if (lower.includes('edg/') || lower.includes('edge')) return 'Microsoft Edge';
      if (lower.includes('opr/') || lower.includes('opera')) return 'Opera';
      if (lower.includes('firefox') || lower.includes('fxios')) return 'Mozilla Firefox';
      if (lower.includes('chrome') || lower.includes('crios')) return 'Google Chrome';
      if (lower.includes('safari') && !lower.includes('chrome')) return 'Apple Safari';

      return 'Outros';
    };

    scopedLogs.forEach(l => {
      if (!l || !l.userAgent) return;
      const b = parseBrowser(l.userAgent);
      counts[b] = (counts[b] || 0) + 1;
    });

    scopedQuizzes.forEach(q => {
      if (!q || !q.userAgent) return;
      const b = parseBrowser(q.userAgent);
      counts[b] = (counts[b] || 0) + 1;
    });

    const colors: Record<string, string> = {
      'Google Chrome': '#4285F4',
      'Apple Safari': '#00C7B7',
      'Mozilla Firefox': '#FF7139',
      'Microsoft Edge': '#0078D7',
      'Opera': '#FF1B2D',
      'Brave': '#FB542B',
      'Samsung Internet': '#1428A0',
      'Outros': '#9CA3AF'
    };

    const items = Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((acc, curr) => acc + curr.value, 0);
    return { items, total };
  }, [scopedLogs, scopedQuizzes]);

  // Consumo e Métricas de Tokens por Modelo de IA e Média por Quiz
  const tokenMetrics = useMemo(() => {
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let quizTokenCount = 0;
    const modelTokenMap: Record<string, { prompt: number; completion: number; total: number; quizCount: number }> = {};

    scopedLogs.forEach(l => {
      if (!l) return;
      const p = l.promptTokens || 0;
      const c = l.completionTokens || 0;
      const t = l.totalTokens || (p + c);

      promptTokens += p;
      completionTokens += c;
      totalTokens += t;

      const model = getCanonicalRawModel((l as any).aiModel, (l as any).aiProvider);
      if (!modelTokenMap[model]) {
        modelTokenMap[model] = { prompt: 0, completion: 0, total: 0, quizCount: 0 };
      }

      if (t > 0) {
        modelTokenMap[model].prompt += p;
        modelTokenMap[model].completion += c;
        modelTokenMap[model].total += t;
        modelTokenMap[model].quizCount += 1;
        quizTokenCount += 1;
      }
    });

    const averagePerQuiz = quizTokenCount > 0
      ? Math.round(totalTokens / quizTokenCount)
      : (scopedQuizzes.length > 0 ? Math.round(totalTokens / scopedQuizzes.length) : 0);

    const averagePromptPerQuiz = quizTokenCount > 0
      ? Math.round(promptTokens / quizTokenCount)
      : (scopedQuizzes.length > 0 ? Math.round(promptTokens / scopedQuizzes.length) : 0);

    const averageCompletionPerQuiz = quizTokenCount > 0
      ? Math.round(completionTokens / quizTokenCount)
      : (scopedQuizzes.length > 0 ? Math.round(completionTokens / scopedQuizzes.length) : 0);

    const modelAverages = Object.entries(modelTokenMap)
      .map(([model, data]) => {
        const quizzes = data.quizCount > 0 ? data.quizCount : (modelMetrics[model]?.quizzes || 1);
        return {
          model,
          color: getModelColor(model),
          totalTokens: data.total,
          quizCount: quizzes,
          avgTotal: Math.round(data.total / Math.max(1, quizzes)),
          avgPrompt: Math.round(data.prompt / Math.max(1, quizzes)),
          avgCompletion: Math.round(data.completion / Math.max(1, quizzes))
        };
      })
      .sort((a, b) => b.avgTotal - a.avgTotal);

    return { promptTokens, completionTokens, totalTokens, averagePerQuiz, averagePromptPerQuiz, averageCompletionPerQuiz, modelTokenMap, modelAverages };
  }, [scopedLogs, scopedQuizzes, modelMetrics, getModelColor]);

  // Tempo Médio de Geração de Quiz (Geral, Por Modelo e Por Provedor)
  const durationMetrics = useMemo(() => {
    let totalDurationMs = 0;
    let countWithDuration = 0;
    const modelDurationMap: Record<string, { totalMs: number; count: number }> = {};
    const providerDurationMap: Record<string, { totalMs: number; count: number }> = {};

    scopedLogs.forEach(l => {
      if (!l) return;
      const dur = (l as any).durationMs;
      if (dur && typeof dur === 'number' && dur > 0) {
        totalDurationMs += dur;
        countWithDuration += 1;

        const model = getCanonicalRawModel((l as any).aiModel, (l as any).aiProvider);
        if (!modelDurationMap[model]) modelDurationMap[model] = { totalMs: 0, count: 0 };
        modelDurationMap[model].totalMs += dur;
        modelDurationMap[model].count += 1;

        const provider = getCanonicalProvider((l as any).aiModel, (l as any).aiProvider);
        if (!providerDurationMap[provider]) providerDurationMap[provider] = { totalMs: 0, count: 0 };
        providerDurationMap[provider].totalMs += dur;
        providerDurationMap[provider].count += 1;
      }
    });

    const averageDurationSec = countWithDuration > 0
      ? (totalDurationMs / countWithDuration / 1000).toFixed(1)
      : 'N/A';

    const modelAverages = Object.entries(modelMetrics).map(([model]) => {
      const durData = modelDurationMap[model];
      const avgSec = durData && durData.count > 0
        ? (durData.totalMs / durData.count / 1000).toFixed(1)
        : 'N/A';
      return {
        model,
        color: getModelColor(model),
        avgSec,
        count: durData?.count || 0
      };
    }).sort((a, b) => (a.avgSec === 'N/A' ? 1 : b.avgSec === 'N/A' ? -1 : parseFloat(a.avgSec) - parseFloat(b.avgSec)));

    const providerAverages = Object.entries(providerDurationMap).map(([provider, durData]) => {
      const avgSec = durData.count > 0
        ? (durData.totalMs / durData.count / 1000).toFixed(1)
        : 'N/A';
      return {
        model: provider,
        color: getProviderColor(provider),
        avgSec,
        count: durData.count
      };
    }).sort((a, b) => (a.avgSec === 'N/A' ? 1 : b.avgSec === 'N/A' ? -1 : parseFloat(a.avgSec) - parseFloat(b.avgSec)));

    return { averageDurationSec, modelAverages, providerAverages, countWithDuration };
  }, [scopedLogs, modelMetrics, getModelColor, getCanonicalProvider, getProviderColor]);

  // Comparativo de Sucesso vs Falhas
  const successVsErrorData = useMemo(() => {
    const successCount = totalQuizzes;
    const errorCount = totalErrors;
    const totalRequests = successCount + errorCount;
    const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(1) : '100.0';

    const items = [
      { name: 'Sucesso (Quizzes)', value: successCount, color: '#10b981' },
      { name: 'Falhas (Erros API)', value: errorCount, color: '#ef4444' }
    ];

    return { items, total: totalRequests, successRate };
  }, [totalQuizzes, totalErrors]);

  // Helper para gerar buckets de tempo conforme a seleção timeRange
  const getTimeBuckets = useCallback(() => {
    const labels: string[] = [];
    const now = new Date();

    if (timeRange === '1h') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 10 * 60 * 1000);
        labels.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      }
      return labels;
    }

    if (timeRange === '24h') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        labels.push(`${String(d.getHours()).padStart(2, '0')}:00`);
      }
      return labels;
    }

    let daysCount = 7;
    if (timeRange === '3d') daysCount = 3;
    else if (timeRange === '15d') daysCount = 15;
    else if (timeRange === '30d') daysCount = 30;
    else if (timeRange === '60d') daysCount = 60;
    else if (timeRange === '90d') daysCount = 90;
    else if (timeRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      daysCount = Math.min(180, Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
    }

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    return labels;
  }, [timeRange, customStartDate, customEndDate]);

  // Helper para extrair chave de bucket de tempo de um timestamp com validação estrita do período
  const parseDateToBucket = useCallback((timestampObj?: any, buckets: string[] = []): string | null => {
    let d: Date | null = null;
    if (timestampObj && typeof timestampObj === 'object' && 'seconds' in timestampObj && typeof timestampObj.seconds === 'number') {
      d = new Date(timestampObj.seconds * 1000);
    } else if (timestampObj) {
      d = new Date(timestampObj);
    }
    if (!d || isNaN(d.getTime())) return null;

    const nowMs = Date.now();
    const itemMs = d.getTime();
    const ageMs = nowMs - itemMs;

    if (timeRange === '1h') {
      // Itens criados apenas nos últimos 60 minutos
      if (ageMs < 0 || ageMs > 60 * 60 * 1000) return null;
      const min = d.getMinutes();
      const roundedMin = Math.floor(min / 10) * 10;
      const key = `${String(d.getHours()).padStart(2, '0')}:${String(roundedMin).padStart(2, '0')}`;
      return buckets.includes(key) ? key : null;
    }

    if (timeRange === '24h') {
      // Itens criados apenas nas últimas 24 horas
      if (ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) return null;
      const key = `${String(d.getHours()).padStart(2, '0')}:00`;
      return buckets.includes(key) ? key : null;
    }

    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return buckets.includes(key) ? key : null;
  }, [timeRange]);

  // Dados para os Gráficos de Linha por Tempo (Com suporte aos Filtros Personalizáveis)
  const allTimelines = useMemo(() => {
    const days = getTimeBuckets();
    const quizzesMap: Record<string, number> = {};
    const errorsMap: Record<string, number> = {};
    const usersMap: Record<string, Set<string>> = {};
    const logsMap: Record<string, number> = {};
    const tokensMap: Record<string, number> = {};

    days.forEach(key => {
      quizzesMap[key] = 0;
      errorsMap[key] = 0;
      usersMap[key] = new Set<string>();
      logsMap[key] = 0;
      tokensMap[key] = 0;
    });

    scopedQuizzes.forEach(q => {
      if (!q) return;
      const rawDate = q.createdAt || q.isoDate || q.timestamp;
      const key = parseDateToBucket(rawDate, days);
      if (key && quizzesMap[key] !== undefined) {
        quizzesMap[key] += 1;
        const userId = q.clientId || q.userEmail || q.createdBy || q.userId;
        if (userId) usersMap[key].add(userId);
      }
    });

    scopedLogs.forEach(l => {
      if (!l) return;
      const key = parseDateToBucket(l.timestamp || l.isoDate || (l as any).createdAt, days);
      if (key && logsMap[key] !== undefined) {
        logsMap[key] += 1;
        if (isErrorLog(l)) errorsMap[key] += 1;
        const userId = (l as any).clientId || l.userEmail;
        if (userId) usersMap[key].add(userId);

        const p = l.promptTokens || 0;
        const c = l.completionTokens || 0;
        const t = l.totalTokens || (p + c);
        tokensMap[key] += t;
      }
    });

    return {
      quizzes: days.map(day => ({ label: day, value: quizzesMap[day] })),
      errors: days.map(day => ({ label: day, value: errorsMap[day] })),
      users: days.map(day => ({ label: day, value: usersMap[day].size })),
      logs: days.map(day => ({ label: day, value: logsMap[day] })),
      tokens: days.map(day => ({ label: day, value: tokensMap[day] }))
    };
  }, [scopedQuizzes, scopedLogs, getTimeBuckets, parseDateToBucket, isErrorLog]);

  // Gráfico da Linha do Tempo dos Top 5 Modelos de IA por Tempo (Personalizável)
  const top5ModelsTimeline = useMemo(() => {
    const colors = ['#f59e0b', '#a855f7', '#C8FF00', '#3b82f6', '#ec4899'];

    // 1. Uso geral de quizzes criados por modelo (filtrando apenas modelos com quizzes > 0)
    const overallList = Object.entries(modelMetrics)
      .map(([name, metrics]) => ({ name, total: metrics.quizzes }))
      .filter(m => m.total > 0)
      .sort((a, b) => b.total - a.total);

    if (overallList.length === 0) return { days: [], series: [] };

    const top4Overall = overallList.slice(0, 4);

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const last24hCounts: Record<string, number> = {};

    const parseMs = (timestamp?: any) => {
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp && typeof timestamp.seconds === 'number') {
        return timestamp.seconds * 1000;
      }
      if (timestamp) {
        const parsed = new Date(timestamp).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      return now;
    };

    scopedQuizzes.forEach(q => {
      if (!q) return;
      if (now - parseMs(q.createdAt || q.isoDate || q.timestamp) <= oneDayMs) {
        const model = getCanonicalRawModel(q.aiModel, q.aiProvider);
        last24hCounts[model] = (last24hCounts[model] || 0) + 1;
      }
    });

    const trendingCandidate = Object.entries(last24hCounts)
      .sort((a, b) => b[1] - a[1])
      .find(([name]) => !top4Overall.some(m => m.name === name));

    const selectedModels = [...top4Overall];

    if (trendingCandidate) {
      selectedModels.push({
        name: trendingCandidate[0],
        total: overallList.find(m => m.name === trendingCandidate[0])?.total || 0
      });
    } else if (overallList[4]) {
      selectedModels.push(overallList[4]);
    }

    const days = getTimeBuckets();
    const modelDailyCounts: Record<string, Record<string, number>> = {};
    selectedModels.forEach(m => {
      modelDailyCounts[m.name] = {};
      days.forEach(key => {
        modelDailyCounts[m.name][key] = 0;
      });
    });

    scopedQuizzes.forEach(q => {
      if (!q) return;
      const model = getCanonicalRawModel(q.aiModel, q.aiProvider);
      const key = parseDateToBucket(q.createdAt || q.isoDate || q.timestamp, days);
      if (modelDailyCounts[model] && key && modelDailyCounts[model][key] !== undefined) {
        modelDailyCounts[model][key] += 1;
      }
    });

    const series = selectedModels
      .map((m, idx) => ({
        name: m.name,
        color: colors[idx % colors.length],
        data: days.map(day => modelDailyCounts[m.name][day] || 0)
      }))
      .filter(s => s.data.reduce((acc, curr) => acc + curr, 0) > 0);

    return { days, series };
  }, [modelMetrics, scopedQuizzes, getTimeBuckets, parseDateToBucket, getCanonicalRawModel]);

  // Gráfico da Linha do Tempo de Erros por Modelo de IA (Personalizável)
  const topModelsErrorTimeline = useMemo(() => {
    const colors = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#3b82f6'];

    const modelErrorTotals: Record<string, number> = {};
    scopedLogs.forEach(l => {
      if (!l || !isErrorLog(l)) return;
      const model = getCanonicalRawModel((l as any).aiModel, (l as any).aiProvider);
      modelErrorTotals[model] = (modelErrorTotals[model] || 0) + 1;
    });

    const activeErrorModels = Object.entries(modelErrorTotals)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    if (activeErrorModels.length === 0) return { days: [], series: [] };

    const days = getTimeBuckets();
    const modelDailyErrors: Record<string, Record<string, number>> = {};
    activeErrorModels.forEach(m => {
      modelDailyErrors[m] = {};
      days.forEach(key => {
        modelDailyErrors[m][key] = 0;
      });
    });

    scopedLogs.forEach(l => {
      if (!l || !isErrorLog(l)) return;
      const model = getCanonicalRawModel((l as any).aiModel, (l as any).aiProvider);
      if (!activeErrorModels.includes(model)) return;
      const key = parseDateToBucket(l.timestamp || l.isoDate || (l as any).createdAt, days);
      if (key && modelDailyErrors[model] && modelDailyErrors[model][key] !== undefined) {
        modelDailyErrors[model][key] += 1;
      }
    });

    const series = activeErrorModels
      .map((name, idx) => ({
        name,
        color: colors[idx % colors.length],
        data: days.map(day => modelDailyErrors[name][day] || 0)
      }))
      .filter(s => s.data.reduce((acc, curr) => acc + curr, 0) > 0);

    return { days, series };
  }, [scopedLogs, isErrorLog, getCanonicalRawModel, getTimeBuckets, parseDateToBucket]);

  // Dados para o Gráfico de Pizza / Donut por App
  const appPieData = useMemo(() => {
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#06b6d4'];
    const items = Object.entries(appMetrics)
      .map(([name, metrics], idx) => ({
        name,
        value: metrics.quizzes,
        color: colors[idx % colors.length]
      }))
      .filter(item => item.value > 0);
    const total = items.reduce((acc, curr) => acc + curr.value, 0);
    return { items, total };
  }, [appMetrics]);

  const topThemes = useMemo(() => {
    const counts: Record<string, number> = {};
    const FALLBACK_LABELS: Record<string, string> = {
      'GENERAL': 'Acadêmico',
      'ENTERTAINMENT': 'Entretenimento',
      'ARTS_CULTURE': 'Arte & Cultura',
      'GEOPOLITICS': 'Geopolítica',
      'ANIMALS': 'Mundo Animal',
      'OTHER': 'Outro Assunto',
      'COLORS_SHAPES': 'Cores & Formas',
      'BOOKS': 'Livros da Bíblia',
      'HISTORY_JW': 'A História'
    };

    scopedQuizzes.forEach(q => {
      if (!q) return;
      const rawTheme = q.theme || 'Geral';
      const category = themeLabelMap[rawTheme] || FALLBACK_LABELS[rawTheme] || rawTheme;
      const sub = (q.subTopic || '').trim();
      const key = sub ? `${category} › ${sub}` : category;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [scopedQuizzes, themeLabelMap]);

  return (
    <div className="w-full min-h-screen bg-[#0d0e12] text-gray-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* HEADER FIXO DE ALTA DENSIDADE BI */}
      <header className="border-b border-white/10 bg-[#12131a]/90 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xl">

        <div className="flex items-center gap-3">
          {user && isAuthorized && (
            <div className="relative">
              <select
                value={selectedAppFilter}
                onChange={(e) => setSelectedAppFilter(e.target.value)}
                className="appearance-none bg-[#181922] border border-amber-500/30 hover:border-amber-500/60 text-amber-300 font-medium text-xs rounded-xl pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer shadow-sm transition-all"
                title="Filtrar todos os gráficos e dados por Aplicativo"
              >
                <option value="all">Todos os Apps</option>
                {availableApps.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-400">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO DE ABAS PRINCIPAIS DESKTOP-FIRST */}
        {user && isAuthorized && (
          <div className="flex items-center gap-1 bg-[#1c1d26] p-1 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setMainTab('overview')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${mainTab === 'overview'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setMainTab('ai_metrics')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${mainTab === 'ai_metrics'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              I.A. & Latência
            </button>
            <button
              onClick={() => setMainTab('tables')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${mainTab === 'tables'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              Logs & Quizzes
              {totalErrors > 0 && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full font-mono text-[9px]">
                  {totalErrors}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 bg-[#1c1d26] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Admin" className="w-6 h-6 rounded-full border border-amber-400/50" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-center">A</div>
              )}
              <span className="text-gray-200 font-mono text-xs hidden sm:inline max-w-[160px] truncate">{user.email}</span>
              <button onClick={logoutGoogle} className="text-red-400 hover:text-red-300 ml-1 text-xs font-bold transition-colors">Sair</button>
            </div>
          )}

          {onReturnToQuiz && (
            <button
              onClick={onReturnToQuiz}
              className="text-xs text-gray-300 hover:text-white px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all font-semibold border border-white/10 flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Voltar ao Quiz
            </button>
          )}
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {loadingAuth ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-gray-400 font-mono">Autenticando...</p>
          </div>
        ) : !user ? (
          /* LOGIN CARD EXTREMAMENTE MINIMALISTA */
          <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
            <div className="w-full max-w-sm bg-[#12131a]/80 backdrop-blur-md p-8 sm:p-10 rounded-2xl border border-white/10 text-center space-y-6 animate-fade-in shadow-2xl">
              <h2 className="text-lg font-medium text-white tracking-tight">Área Restrita</h2>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-[11px] text-red-400 text-left">
                  {authError}
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Entrar com Conta do Google
              </button>
            </div>
          </div>
        ) : !isAuthorized ? (
          /* ACESSO NEGADO */
          <div className="max-w-md mx-auto my-16 bg-[#181214] p-8 rounded-3xl border border-red-500/30 text-center space-y-4">
            <h2 className="text-lg font-bold text-red-400">Acesso Restrito</h2>
            <p className="text-xs text-gray-300">
              A conta <strong className="text-white font-mono">{user.email}</strong> não possui privilégios de administrador.
            </p>
            <button onClick={logoutGoogle} className="px-4 py-2 bg-red-900/40 text-red-300 rounded-xl text-xs font-bold hover:bg-red-900/60">
              Encerrar Sessão
            </button>
          </div>
        ) : (
          /* DASHBOARD DE BI COMPLETO DESKTOP-FIRST ORGANIZADO POR ABAS */
          <div className="space-y-6 animate-fade-in">
            {/* ABA 1: VISÃO GERAL */}
            {mainTab === 'overview' && (
              <div className="space-y-6">
                {/* KPIS DA VISÃO GERAL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Quizzes Gerados</span>
                      <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-black text-white font-mono">{totalQuizzes}</span>
                      <span className="text-xs font-bold text-amber-400 uppercase">Total</span>
                    </div>
                  </div>

                  <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Usuários / Dispositivos</span>
                      <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-black text-blue-300 font-mono">{uniqueUsersCount}</span>
                      <span className="text-xs font-bold text-blue-400 uppercase">Únicos</span>
                    </div>
                  </div>

                  <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Quizzes / Usuário</span>
                      <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-black text-emerald-300 font-mono">{quizzesPerUserAverage}</span>
                      <span className="text-xs font-bold text-emerald-400 uppercase">Média</span>
                    </div>
                  </div>

                  <div className="bg-[#14151d] p-6 rounded-3xl border border-red-500/20 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">Erros & Falhas</span>
                      <span className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-black text-red-300 font-mono">{totalErrors}</span>
                      <span className="text-xs font-bold text-red-400 uppercase">Erros</span>
                    </div>
                  </div>
                </div>

                {/* BENTO GRID VISÃO GERAL */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#14151d] p-6 rounded-3xl border border-amber-500/20 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                        <h3 className="text-sm font-bold text-white">Quizzes Criados por Tempo</h3>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={timeRange}
                              onChange={(e) => setTimeRange(e.target.value as any)}
                              className="appearance-none bg-[#1c1d26] border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl pl-3 pr-7 py-1 focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm transition-all"
                              title="Filtrar período temporal dos gráficos"
                            >
                              <option value="1h">Última Hora</option>
                              <option value="24h">Últimas 24h</option>
                              <option value="3d">3 Dias</option>
                              <option value="7d">7 Dias</option>
                              <option value="15d">15 Dias</option>
                              <option value="30d">30 Dias</option>
                              <option value="60d">60 Dias</option>
                              <option value="90d">90 Dias</option>
                              <option value="custom">Personalizado...</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-400">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                            </div>
                          </div>

                          {timeRange === 'custom' && (
                            <div className="flex items-center gap-1.5 bg-[#1c1d26] px-2.5 py-1 rounded-xl border border-amber-500/30 text-xs shadow-inner animate-fade-in">
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-[#12131a] text-amber-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-amber-400 focus:outline-none"
                              />
                              <span className="text-gray-500 font-bold text-[10px]">até</span>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-[#12131a] text-amber-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <TimelineLineChart data={allTimelines.quizzes} color="#f59e0b" />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-emerald-500/20 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                        <h3 className="text-sm font-bold text-white">Comparativo de Quizzes por Modelo de IA</h3>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={timeRange}
                              onChange={(e) => setTimeRange(e.target.value as any)}
                              className="appearance-none bg-[#1c1d26] border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl pl-3 pr-7 py-1 focus:outline-none focus:border-emerald-400 cursor-pointer shadow-sm transition-all"
                              title="Filtrar período temporal dos modelos"
                            >
                              <option value="1h">Última Hora</option>
                              <option value="24h">Últimas 24h</option>
                              <option value="3d">3 Dias</option>
                              <option value="7d">7 Dias</option>
                              <option value="15d">15 Dias</option>
                              <option value="30d">30 Dias</option>
                              <option value="60d">60 Dias</option>
                              <option value="90d">90 Dias</option>
                              <option value="custom">Personalizado...</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-400">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                            </div>
                          </div>

                          {timeRange === 'custom' && (
                            <div className="flex items-center gap-1.5 bg-[#1c1d26] px-2.5 py-1 rounded-xl border border-emerald-500/30 text-xs shadow-inner animate-fade-in">
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-[#12131a] text-emerald-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-emerald-400 focus:outline-none"
                              />
                              <span className="text-gray-500 font-bold text-[10px]">até</span>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-[#12131a] text-emerald-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-emerald-400 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <MultiModelTimelineChart days={top5ModelsTimeline.days} series={top5ModelsTimeline.series} />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-red-500/20 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                        <h3 className="text-sm font-bold text-white">Erros e Falhas por Tempo</h3>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={timeRange}
                              onChange={(e) => setTimeRange(e.target.value as any)}
                              className="appearance-none bg-[#1c1d26] border border-red-500/40 text-red-400 font-bold text-xs rounded-xl pl-3 pr-7 py-1 focus:outline-none focus:border-red-400 cursor-pointer shadow-sm transition-all"
                              title="Filtrar período temporal dos erros"
                            >
                              <option value="1h">Última Hora</option>
                              <option value="24h">Últimas 24h</option>
                              <option value="3d">3 Dias</option>
                              <option value="7d">7 Dias</option>
                              <option value="15d">15 Dias</option>
                              <option value="30d">30 Dias</option>
                              <option value="60d">60 Dias</option>
                              <option value="90d">90 Dias</option>
                              <option value="custom">Personalizado...</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-red-400">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                            </div>
                          </div>

                          {timeRange === 'custom' && (
                            <div className="flex items-center gap-1.5 bg-[#1c1d26] px-2.5 py-1 rounded-xl border border-red-500/30 text-xs shadow-inner animate-fade-in">
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-[#12131a] text-red-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-red-400 focus:outline-none"
                              />
                              <span className="text-gray-500 font-bold text-[10px]">até</span>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-[#12131a] text-red-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-red-400 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <TimelineLineChart data={allTimelines.errors} color="#ef4444" />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-red-500/20 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                        <h3 className="text-sm font-bold text-white">Comparativo de Erros por Modelo de IA</h3>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={timeRange}
                              onChange={(e) => setTimeRange(e.target.value as any)}
                              className="appearance-none bg-[#1c1d26] border border-red-500/40 text-red-400 font-bold text-xs rounded-xl pl-3 pr-7 py-1 focus:outline-none focus:border-red-400 cursor-pointer shadow-sm transition-all"
                              title="Filtrar período temporal dos erros por modelo"
                            >
                              <option value="1h">Última Hora</option>
                              <option value="24h">Últimas 24h</option>
                              <option value="3d">3 Dias</option>
                              <option value="7d">7 Dias</option>
                              <option value="15d">15 Dias</option>
                              <option value="30d">30 Dias</option>
                              <option value="60d">60 Dias</option>
                              <option value="90d">90 Dias</option>
                              <option value="custom">Personalizado...</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-red-400">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                            </div>
                          </div>

                          {timeRange === 'custom' && (
                            <div className="flex items-center gap-1.5 bg-[#1c1d26] px-2.5 py-1 rounded-xl border border-red-500/30 text-xs shadow-inner animate-fade-in">
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-[#12131a] text-red-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-red-400 focus:outline-none"
                              />
                              <span className="text-gray-500 font-bold text-[10px]">até</span>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-[#12131a] text-red-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-red-400 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <MultiModelTimelineChart days={topModelsErrorTimeline.days} series={topModelsErrorTimeline.series} />
                    </div>

                    {/* CARD: USUÁRIOS ÚNICOS POR TEMPO */}
                    <div className="bg-[#14151d] p-6 rounded-3xl border border-blue-500/20 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">Usuários Únicos por Tempo</h3>
                          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">por userAgent</span>
                        </div>
                        <div className="relative">
                          <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="appearance-none bg-[#1c1d26] border border-blue-500/40 text-blue-300 font-bold text-xs rounded-xl pl-3 pr-7 py-1 focus:outline-none focus:border-blue-400 cursor-pointer shadow-sm transition-all"
                          >
                            <option value="1h">Última Hora</option>
                            <option value="24h">Últimas 24h</option>
                            <option value="3d">3 Dias</option>
                            <option value="7d">7 Dias</option>
                            <option value="15d">15 Dias</option>
                            <option value="30d">30 Dias</option>
                            <option value="60d">60 Dias</option>
                            <option value="90d">90 Dias</option>
                            <option value="custom">Personalizado...</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-400">
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                          </div>
                        </div>
                      </div>
                      {timeRange === 'custom' && (
                        <div className="flex items-center gap-1.5 bg-[#1c1d26] px-2.5 py-1 rounded-xl border border-blue-500/30 text-xs shadow-inner animate-fade-in">
                          <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="bg-[#12131a] text-blue-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-blue-400 focus:outline-none" />
                          <span className="text-gray-500 font-bold text-[10px]">até</span>
                          <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="bg-[#12131a] text-blue-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-blue-400 focus:outline-none" />
                        </div>
                      )}
                      <TimelineLineChart data={allTimelines.users} color="#3b82f6" />
                    </div>

                    {/* CARD: LOGS / ACESSOS POR TEMPO */}
                    <div className="bg-[#14151d] p-6 rounded-3xl border border-emerald-500/20 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                        <h3 className="text-sm font-bold text-white">Logs de Acesso por Tempo</h3>
                        <div className="relative">
                          <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="appearance-none bg-[#1c1d26] border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl pl-3 pr-7 py-1 focus:outline-none focus:border-emerald-400 cursor-pointer shadow-sm transition-all"
                          >
                            <option value="1h">Última Hora</option>
                            <option value="24h">Últimas 24h</option>
                            <option value="3d">3 Dias</option>
                            <option value="7d">7 Dias</option>
                            <option value="15d">15 Dias</option>
                            <option value="30d">30 Dias</option>
                            <option value="60d">60 Dias</option>
                            <option value="90d">90 Dias</option>
                            <option value="custom">Personalizado...</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-400">
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                          </div>
                        </div>
                      </div>
                      {timeRange === 'custom' && (
                        <div className="flex items-center gap-1.5 bg-[#1c1d26] px-2.5 py-1 rounded-xl border border-emerald-500/30 text-xs shadow-inner animate-fade-in">
                          <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="bg-[#12131a] text-emerald-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-emerald-400 focus:outline-none" />
                          <span className="text-gray-500 font-bold text-[10px]">até</span>
                          <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="bg-[#12131a] text-emerald-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-emerald-400 focus:outline-none" />
                        </div>
                      )}
                      <TimelineLineChart data={allTimelines.logs} color="#10b981" />
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                      <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Distribuição por Aplicativo</h3>
                      <DonutPieChart items={appPieData.items} total={appPieData.total} />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-red-500/20 shadow-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Erros da IA por Código HTTP</h3>
                        <span className="text-xs font-mono text-red-400 font-bold">{totalErrors} falhas</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1c1d26] p-4 rounded-2xl border border-red-500/20 text-center space-y-1">
                          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">503 Sobrecarga</span>
                          <p className="text-2xl font-black font-mono text-red-400">{errorCodeCounts['503'] || 0}</p>
                        </div>
                        <div className="bg-[#1c1d26] p-4 rounded-2xl border border-purple-500/20 text-center space-y-1">
                          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">402 Saldo API</span>
                          <p className="text-2xl font-black font-mono text-purple-400">{errorCodeCounts['402'] || 0}</p>
                        </div>
                        <div className="bg-[#1c1d26] p-4 rounded-2xl border border-blue-500/20 text-center space-y-1">
                          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">404 Não Encontrado</span>
                          <p className="text-2xl font-black font-mono text-blue-400">{errorCodeCounts['404'] || 0}</p>
                        </div>
                        <div className="bg-[#1c1d26] p-4 rounded-2xl border border-amber-500/20 text-center space-y-1">
                          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">Outras Falhas</span>
                          <p className="text-2xl font-black font-mono text-amber-400">{(errorCodeCounts['429'] || 0) + (errorCodeCounts['403'] || 0) + (errorCodeCounts['Outros'] || 0)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-emerald-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Temas Mais Gerados</h3>
                        <span className="text-[10px] font-mono text-gray-500">{topThemes.length} categorias</span>
                      </div>
                      {topThemes.length === 0 ? (
                        <div className="text-xs text-gray-500 italic py-6 text-center">Nenhum tema registrado ainda.</div>
                      ) : (
                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                          {topThemes.slice(0, 20).map(([themeName, count], idx) => {
                            const parts = themeName.split(' › ');
                            const hasSubtopic = parts.length === 2;
                            return (
                              <div key={themeName} className="flex justify-between items-center bg-[#1c1d26] px-3.5 py-2.5 rounded-xl border border-white/5 text-xs group hover:border-emerald-500/30 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-emerald-500/70 font-bold shrink-0">#{idx + 1}</span>
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="font-semibold text-gray-300 truncate">{parts[0]}</span>
                                    {hasSubtopic && (
                                      <>
                                        <span className="text-gray-600 shrink-0">›</span>
                                        <span className="font-bold text-white truncate">{parts[1]}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className="font-mono text-amber-400 font-bold shrink-0 ml-2">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-emerald-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Categoria de Dispositivos</h3>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{deviceCategoryPieData.total} acessos</span>
                      </div>
                      <DonutPieChart
                        items={deviceCategoryPieData.items}
                        total={deviceCategoryPieData.total}
                        centerValue={deviceCategoryPieData.total}
                        centerLabel="Acessos"
                      />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-blue-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Sistemas Operacionais</h3>
                        <span className="text-xs font-mono text-blue-400 font-bold">{osPieData.total} acessos</span>
                      </div>
                      <DonutPieChart
                        items={osPieData.items}
                        total={osPieData.total}
                        centerValue={osPieData.total}
                        centerLabel="Sistemas"
                      />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-cyan-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Navegadores Utilizados</h3>
                        <span className="text-xs font-mono text-cyan-400 font-bold">{browserPieData.total} acessos</span>
                      </div>
                      <DonutPieChart
                        items={browserPieData.items}
                        total={browserPieData.total}
                        centerValue={browserPieData.total}
                        centerLabel="Browsers"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: I.A. & LATÊNCIA */}
            {mainTab === 'ai_metrics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#14151d] p-6 rounded-3xl border border-purple-500/20 shadow-xl relative overflow-hidden">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">Tokens LLM Consumidos</span>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-black text-purple-200 font-mono">{formatTokenNumber(tokenMetrics.totalTokens)}</span>
                      <span className="text-xs font-bold text-purple-400 uppercase">Total</span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span>In: <strong className="text-purple-300">{formatTokenNumber(tokenMetrics.promptTokens)}</strong></span>
                      <span>Out: <strong className="text-purple-300">{formatTokenNumber(tokenMetrics.completionTokens)}</strong></span>
                    </div>
                  </div>

                  <div className="bg-[#14151d] p-6 rounded-3xl border border-cyan-500/20 shadow-xl relative overflow-hidden">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Média Tokens / Quiz</span>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-black text-cyan-200 font-mono">{formatTokenNumber(tokenMetrics.averagePerQuiz)}</span>
                      <span className="text-xs font-bold text-cyan-400 uppercase">Média</span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span>In: <strong className="text-cyan-300">{formatTokenNumber(tokenMetrics.averagePromptPerQuiz)}</strong></span>
                      <span>Out: <strong className="text-cyan-300">{formatTokenNumber(tokenMetrics.averageCompletionPerQuiz)}</strong></span>
                    </div>
                  </div>

                  <div className="bg-[#14151d] p-6 rounded-3xl border border-amber-500/20 shadow-xl relative overflow-hidden">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">Tempo Médio / Quiz</span>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-black text-amber-200 font-mono">{durationMetrics.averageDurationSec}s</span>
                      <span className="text-xs font-bold text-amber-400 uppercase">Latência</span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span>Provedor:</span>
                      <strong className="text-amber-300 font-bold">Geral</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="bg-[#14151d] p-6 rounded-3xl border border-cyan-500/20 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                        <h3 className="text-sm font-bold text-white">Consumo de Tokens por Tempo</h3>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={timeRange}
                              onChange={(e) => setTimeRange(e.target.value as any)}
                              className="appearance-none bg-[#1c1d26] border border-cyan-500/40 text-cyan-300 font-bold text-xs rounded-xl pl-3 pr-7 py-1 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm transition-all"
                              title="Filtrar período temporal do consumo de tokens"
                            >
                              <option value="1h">Última Hora</option>
                              <option value="24h">Últimas 24h</option>
                              <option value="3d">3 Dias</option>
                              <option value="7d">7 Dias</option>
                              <option value="15d">15 Dias</option>
                              <option value="30d">30 Dias</option>
                              <option value="60d">60 Dias</option>
                              <option value="90d">90 Dias</option>
                              <option value="custom">Personalizado...</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-cyan-400">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                            </div>
                          </div>

                          {timeRange === 'custom' && (
                            <div className="flex items-center gap-1.5 bg-[#1c1d26] px-2.5 py-1 rounded-xl border border-cyan-500/30 text-xs shadow-inner animate-fade-in">
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-[#12131a] text-cyan-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-cyan-400 focus:outline-none"
                              />
                              <span className="text-gray-500 font-bold text-[10px]">até</span>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-[#12131a] text-cyan-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 focus:border-cyan-400 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <TimelineLineChart data={allTimelines.tokens} color="#06b6d4" />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-purple-500/20 shadow-xl space-y-4">
                      <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Modelos de IA Utilizados (Distribuição)</h3>
                      <DonutPieChart items={modelPieData.items} total={modelPieData.total} />
                    </div>
                  </div>

                  <div className="lg:col-span-6 space-y-6">
                    <div className="bg-[#14151d] p-6 rounded-3xl border border-amber-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white truncate">
                          {latencyViewMode === 'provider' ? 'Tempo Médio por Provedor (Latência)' : 'Tempo Médio por Modelo (Latência)'}
                        </h3>
                        <div className="flex items-center bg-[#1c1d26] p-1 rounded-xl border border-white/5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setLatencyViewMode('provider')}
                            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                              latencyViewMode === 'provider'
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : 'text-gray-400 hover:text-white border border-transparent'
                            }`}
                          >
                            Provedores
                          </button>
                          <button
                            type="button"
                            onClick={() => setLatencyViewMode('model')}
                            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                              latencyViewMode === 'model'
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : 'text-gray-400 hover:text-white border border-transparent'
                            }`}
                          >
                            Modelos
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {((latencyViewMode === 'provider' ? durationMetrics.providerAverages : durationMetrics.modelAverages) || []).length === 0 ? (
                          <p className="text-xs text-gray-500 italic text-center py-4">Sem dados de latência registrados.</p>
                        ) : (
                          (latencyViewMode === 'provider' ? durationMetrics.providerAverages : durationMetrics.modelAverages).map((item, idx) => (
                            <div key={idx} className="bg-[#1c1d26] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                                <span className="text-xs font-bold text-gray-100 truncate" title={item.model}>{item.model}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 font-mono">
                                <span className="text-xs font-bold text-amber-300">{item.avgSec}s</span>
                                <span className="text-[10px] text-gray-500">({item.count} qz)</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-emerald-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Taxa de Sucesso (Eficiência)</h3>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{successVsErrorData.successRate}% Sucesso</span>
                      </div>
                      <DonutPieChart
                        items={successVsErrorData.items}
                        total={successVsErrorData.total}
                        centerValue={`${successVsErrorData.successRate}%`}
                        centerLabel="Taxa Sucesso"
                      />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-red-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Erros por Modelo de IA</h3>
                        <span className="text-xs font-mono text-red-400 font-bold">{modelErrorPieData.total} falhas</span>
                      </div>
                      <DonutPieChart
                        items={modelErrorPieData.items}
                        total={modelErrorPieData.total}
                        centerValue={modelErrorPieData.total}
                        centerLabel="Erros"
                      />
                    </div>

                    <div className="bg-[#14151d] p-6 rounded-3xl border border-cyan-500/20 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Média de Tokens por Modelo</h3>
                        <span className="text-xs font-mono text-cyan-400 font-bold">por geração</span>
                      </div>
                      {tokenMetrics.modelAverages.length === 0 ? (
                        <p className="text-xs text-gray-500 italic text-center py-4">Sem dados de tokens por modelo.</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {tokenMetrics.modelAverages.map((item, idx) => (
                            <div key={idx} className="bg-[#1c1d26] p-3 rounded-2xl border border-white/5 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                                  <span className="text-xs font-bold text-gray-100 truncate" title={item.model}>{item.model}</span>
                                </div>
                                <span className="text-xs font-black font-mono text-cyan-300 shrink-0">{item.avgTotal.toLocaleString('pt-BR')} tk</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 pl-4">
                                <span>In: <strong className="text-emerald-400">{item.avgPrompt.toLocaleString('pt-BR')}</strong></span>
                                <span>Out: <strong className="text-amber-400">{item.avgCompletion.toLocaleString('pt-BR')}</strong></span>
                                <span className="ml-auto text-gray-600">({item.quizCount} qz)</span>
                              </div>
                              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                <div className="h-1 rounded-full transition-all duration-500" style={{ backgroundColor: item.color, width: `${Math.round((item.avgTotal / Math.max(...tokenMetrics.modelAverages.map(m => m.avgTotal), 1)) * 100)}%` }}/>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: LOGS & QUIZZES */}
            {mainTab === 'tables' && (
              <div className="bg-[#14151d] p-4 md:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex gap-2 bg-[#1c1d26] p-1.5 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setActiveTab('logs')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'logs' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                      Logs & Erros
                      {totalErrors > 0 && <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full font-mono text-[9px]">{totalErrors}</span>}
                    </button>
                    <button
                      onClick={() => setActiveTab('quizzes')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'quizzes' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                      Quizzes ({quizzes.length})
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedEventFilter}
                      onChange={(e) => setSelectedEventFilter(e.target.value)}
                      className="bg-[#1c1d26] border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="all">Todos os Eventos</option>
                      <option value="error">Apenas Erros (error)</option>
                      <option value="quiz_generated">Apenas Quizzes Gerados</option>
                      <option value="quiz_error">Erros de Quiz</option>
                      <option value="api_error">Erros de API</option>
                    </select>
                    <div className="relative flex-1 sm:w-64">
                      <input
                        type="text"
                        placeholder="Pesquisar termo, código ou mensagem..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1c1d26] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white">✕</button>
                      )}
                    </div>
                    <button
                      onClick={loadData}
                      disabled={loadingData}
                      className="p-2 bg-[#1c1d26] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all"
                      title="Recarregar dados"
                    >
                      ↻
                    </button>
                  </div>
                </div>

                {activeTab === 'logs' && (
                  <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#101117] space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1c1d26] text-gray-400 font-mono text-[10px] uppercase border-b border-white/5">
                          <tr>
                            <th className="py-3 px-4 w-28">Status</th>
                            <th className="py-3 px-4 w-32">App</th>
                            <th className="py-3 px-4 w-44">Modelo IA</th>
                            <th className="py-3 px-4">Detalhes / Mensagem de Erro</th>
                            <th className="py-3 px-4 w-20 text-center">Código</th>
                            <th className="py-3 px-4 w-36 text-right">Data / Hora</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {paginatedLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-gray-500 italic">
                                Nenhum registro de log encontrado para a busca informada.
                              </td>
                            </tr>
                          ) : (
                            paginatedLogs.map((log) => {
                              const modelStr = getCanonicalRawModel((log as any).aiModel, (log as any).aiProvider);
                              const modelColor = getModelColor(modelStr);
                              return (
                                <tr
                                  key={log.id}
                                  onClick={() => setSelectedLogDetail(log)}
                                  className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                                >
                                  <td className="py-3.5 px-4 align-top">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${log.eventType === 'error' ? 'bg-red-950/80 text-red-300 border border-red-800/60' :
                                      log.eventType === 'quiz_generated' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' :
                                        'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                                      }`}>
                                      {log.eventType}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 align-top text-gray-200 font-semibold">{log.appName}</td>
                                  <td className="py-3.5 px-4 align-top font-mono text-[11px]">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold" style={{ color: modelColor, backgroundColor: `${modelColor}15` }}>
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: modelColor }}></span>
                                      <span className="truncate max-w-[140px]" title={modelStr}>{modelStr}</span>
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 align-top min-w-[280px]">
                                    <p className="text-gray-100 font-semibold leading-relaxed break-words text-wrap">{log.title || log.errorMessage || '-'}</p>
                                    {log.errorMessage && log.title && (
                                      <p className="text-gray-400 font-mono text-[11px] mt-1 leading-normal break-words text-wrap">{log.errorMessage}</p>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 align-top font-mono text-center">
                                    <span className={log.eventType === 'quiz_generated' ? 'text-emerald-400 font-bold' : log.eventType === 'error' ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                                      {log.errorCode || (log.eventType === 'quiz_generated' ? '200' : '-')}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 align-top text-right text-gray-400 font-mono text-[11px] whitespace-nowrap">{log.timestamp || 'Recente'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#1c1d26] border-t border-white/5 text-xs text-gray-400">
                      <span>
                        Exibindo <strong className="text-white font-mono">{paginatedLogs.length}</strong> de <strong className="text-white font-mono">{filteredLogs.length}</strong> logs
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                          disabled={logsPage <= 1}
                          className="px-3 py-1.5 bg-[#14151d] hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-[#14151d] border border-white/10 rounded-lg text-gray-200 font-medium transition-all cursor-pointer"
                        >
                          ← Anterior
                        </button>
                        <span className="font-mono text-xs px-2 text-amber-400 font-bold">
                          Página {logsPage} de {totalLogsPages}
                        </span>
                        <button
                          onClick={() => setLogsPage(prev => Math.min(totalLogsPages, prev + 1))}
                          disabled={logsPage >= totalLogsPages}
                          className="px-3 py-1.5 bg-[#14151d] hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-[#14151d] border border-white/10 rounded-lg text-gray-200 font-medium transition-all cursor-pointer"
                        >
                          Próximo →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'quizzes' && (
                  <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#101117] space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1c1d26] text-gray-400 font-mono text-[10px] uppercase border-b border-white/5">
                          <tr>
                            <th className="py-3 px-4 min-w-[240px]">Título do Quiz</th>
                            <th className="py-3 px-4 w-32">App</th>
                            <th className="py-3 px-4 w-44">Modelo IA</th>
                            <th className="py-3 px-4">Tema / Subtópico</th>
                            <th className="py-3 px-4 w-28 text-center">Qtd. Perguntas</th>
                            <th className="py-3 px-4 w-32 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {paginatedQuizzes.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-gray-500 italic">
                                Nenhum quiz encontrado.
                              </td>
                            </tr>
                          ) : (
                            paginatedQuizzes.map((quiz) => {
                              const modelStr = getCanonicalRawModel(quiz.aiModel, quiz.aiProvider);
                              const modelColor = getModelColor(modelStr);
                              return (
                                <tr key={quiz.id} className="hover:bg-white/[0.03] transition-colors">
                                  <td className="py-3.5 px-4 font-bold text-white leading-relaxed break-words text-wrap min-w-[240px]">{quiz.title}</td>
                                  <td className="py-3.5 px-4 text-gray-300 font-semibold">{quiz.appName || 'Geral'}</td>
                                  <td className="py-3.5 px-4 font-mono text-[11px]">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold" style={{ color: modelColor, backgroundColor: `${modelColor}15` }}>
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: modelColor }}></span>
                                      <span className="truncate max-w-[140px]" title={modelStr}>{modelStr}</span>
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-gray-300 font-medium">{quiz.theme} {quiz.subTopic ? `(${quiz.subTopic})` : ''}</td>
                                  <td className="py-3.5 px-4 font-mono text-amber-400 font-bold text-center">{quiz.questions?.length || 0}</td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => setSelectedQuizDetail(quiz)}
                                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                      Ver Questões
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#1c1d26] border-t border-white/5 text-xs text-gray-400">
                      <span>
                        Exibindo <strong className="text-white font-mono">{paginatedQuizzes.length}</strong> de <strong className="text-white font-mono">{filteredQuizzes.length}</strong> quizzes
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQuizzesPage(prev => Math.max(1, prev - 1))}
                          disabled={quizzesPage <= 1}
                          className="px-3 py-1.5 bg-[#14151d] hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-[#14151d] border border-white/10 rounded-lg text-gray-200 font-medium transition-all cursor-pointer"
                        >
                          ← Anterior
                        </button>
                        <span className="font-mono text-xs px-2 text-amber-400 font-bold">
                          Página {quizzesPage} de {totalQuizzesPages}
                        </span>
                        <button
                          onClick={() => setQuizzesPage(prev => Math.min(totalQuizzesPages, prev + 1))}
                          disabled={quizzesPage >= totalQuizzesPages}
                          className="px-3 py-1.5 bg-[#14151d] hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-[#14151d] border border-white/10 rounded-lg text-gray-200 font-medium transition-all cursor-pointer"
                        >
                          Próximo →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DETALHE DO QUIZ SELECIONADO */}
      {selectedQuizDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14151d] border border-white/10 max-w-2xl w-full max-h-[85vh] rounded-3xl p-6 overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedQuizDetail.title}</h3>
                <p className="text-xs text-gray-400">{selectedQuizDetail.appName} • {selectedQuizDetail.theme} • {selectedQuizDetail.questions?.length || 0} questões</p>
              </div>
              <button onClick={() => { setSelectedQuizDetail(null); setEditingQuestionIndex(null); }} className="text-gray-400 hover:text-white text-sm font-bold">✕</button>
            </div>

            <div className="space-y-4">
              {(!selectedQuizDetail.questions || selectedQuizDetail.questions.length === 0) ? (
                <div className="text-center py-8 text-xs text-gray-500 italic">
                  Todas as questões deste quiz foram descartadas.
                </div>
              ) : (
                selectedQuizDetail.questions.map((q: any, idx: number) => {
                  const qKey = q.id || `q_${idx}_${(q.question || '').substring(0, 15)}`;
                  const isReported = reportedQuestionIds[qKey];
                  const isEditing = editingQuestionIndex === idx;

                  if (isEditing) {
                    return (
                      <div key={idx} className="bg-[#1c1d26] p-4 rounded-xl border border-amber-500/50 space-y-3 text-xs shadow-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-amber-400">Editando Questão #{idx + 1}</span>
                          <button onClick={() => setEditingQuestionIndex(null)} className="text-gray-400 hover:text-white text-xs">Cancelar ✕</button>
                        </div>

                        {/* ENUNCIADO DA PERGUNTA */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-gray-400 uppercase">Enunciado da Pergunta</label>
                          <textarea
                            value={editFormData.question}
                            onChange={(e) => setEditFormData({ ...editFormData, question: e.target.value })}
                            className="w-full bg-[#14151d] text-white p-2.5 rounded-lg border border-white/10 focus:border-amber-500 focus:outline-none font-medium"
                            rows={2}
                          />
                        </div>

                        {/* ALTERNATIVAS */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-gray-400 uppercase block">Alternativas (Selecione a correta)</label>
                          {editFormData.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditFormData({ ...editFormData, correctAnswerIndex: optIdx })}
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${editFormData.correctAnswerIndex === optIdx
                                  ? 'bg-emerald-500 text-black shadow-md'
                                  : 'bg-[#14151d] text-gray-400 border border-white/10 hover:text-white'
                                  }`}
                                title="Marcar como alternativa correta"
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...editFormData.options];
                                  newOpts[optIdx] = e.target.value;
                                  setEditFormData({ ...editFormData, options: newOpts });
                                }}
                                className={`flex-1 bg-[#14151d] text-white px-3 py-1.5 rounded-lg border text-xs ${editFormData.correctAnswerIndex === optIdx ? 'border-emerald-500/50 text-emerald-300 font-bold' : 'border-white/10'
                                  }`}
                              />
                            </div>
                          ))}
                        </div>

                        {/* EXPLICAÇÃO */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-gray-400 uppercase">Explicação / Justificativa</label>
                          <input
                            type="text"
                            value={editFormData.explanation}
                            onChange={(e) => setEditFormData({ ...editFormData, explanation: e.target.value })}
                            className="w-full bg-[#14151d] text-gray-200 p-2 rounded-lg border border-white/10 text-xs focus:outline-none"
                          />
                        </div>

                        {/* AÇÕES DE SALVAMENTO */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => setEditingQuestionIndex(null)}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveEditedQuestion(idx)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-md"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={qKey} className={`bg-[#1c1d26] p-4 rounded-xl border transition-all space-y-3 text-xs ${isReported ? 'border-red-500/40 bg-red-950/10' : 'border-white/5'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-amber-300">{idx + 1}. {q.question}</p>
                            {isReported && (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                                Incorreta
                              </span>
                            )}
                          </div>
                        </div>

                        {/* AÇÕES DA QUESTÃO */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleReportQuestion(qKey, q.question)}
                            disabled={isReported}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${isReported
                              ? 'bg-red-500/20 text-red-300 border-red-500/30 opacity-70 cursor-not-allowed'
                              : 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border-red-800/40 cursor-pointer'
                              }`}
                            title="Marcar questão como errada/incorreta"
                          >
                            {isReported ? 'Incorreta' : 'Marcar Errada'}
                          </button>

                          <button
                            onClick={() => handleStartEditing(idx, q)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer"
                            title="Editar enunciado, alternativas ou resposta correta"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleDiscardQuestion(idx)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all bg-gray-800 hover:bg-red-900/80 text-gray-300 hover:text-white border border-white/10 hover:border-red-500/50 cursor-pointer"
                            title="Descartar apenas esta questão do quiz"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>

                      {q.options && (
                        <ul className="space-y-1 text-gray-300 pl-2">
                          {q.options.map((opt: string, optIdx: number) => (
                            <li key={optIdx} className={optIdx === q.correctAnswerIndex ? 'text-emerald-400 font-bold' : ''}>
                              {String.fromCharCode(65 + optIdx)}) {opt} {optIdx === q.correctAnswerIndex && '✓'}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.explanation && <p className="text-[11px] text-gray-400 italic mt-1">Explicação: {q.explanation}</p>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DO LOG SELECIONADO */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14151d] border border-white/10 max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Detalhes do Evento</h3>
              <button onClick={() => setSelectedLogDetail(null)} className="text-gray-400 hover:text-white text-sm font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 font-mono text-[10px] uppercase block">Aplicativo</span>
                <span className="font-bold text-gray-200">{selectedLogDetail.appName}</span>
              </div>
              <div>
                <span className="text-gray-500 font-mono text-[10px] uppercase block">Tipo de Evento</span>
                <span className="font-bold text-amber-400 font-mono">{selectedLogDetail.eventType}</span>
              </div>
              <div>
                <span className="text-gray-500 font-mono text-[10px] uppercase block">Título / Status</span>
                <span className="text-gray-200">{selectedLogDetail.title || '-'}</span>
              </div>
              {selectedLogDetail.errorMessage && (
                <div>
                  <span className="text-gray-500 font-mono text-[10px] uppercase block">Mensagem Detalhada</span>
                  <div className="bg-[#1c1d26] p-3 rounded-xl border border-white/5 font-mono text-red-300 text-[11px] break-words">
                    {selectedLogDetail.errorMessage}
                  </div>
                </div>
              )}
              {selectedLogDetail.solution && (
                <div>
                  <span className="text-gray-500 font-mono text-[10px] uppercase block">Sugestão de Solução</span>
                  <span className="text-emerald-400">{selectedLogDetail.solution}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500 font-mono text-[10px] uppercase block">Timestamp</span>
                <span className="font-mono text-gray-400">{selectedLogDetail.timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  return (
    <DashboardErrorBoundary onReturnToQuiz={props.onReturnToQuiz}>
      <AdminDashboardContent {...props} />
    </DashboardErrorBoundary>
  );
};
