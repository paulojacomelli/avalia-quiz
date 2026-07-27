import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  loginWithGoogle, logoutGoogle, subscribeAuthState, 
  fetchTelemetryLogs, fetchSavedQuizzes 
} from '@avalia/services';
import { TelemetryLogEntry } from '@avalia/core';

interface AdminDashboardProps {
  onReturnToQuiz?: () => void;
  themeLabelMap?: Record<string, string>;
}

// --- COMPONENTE DE GRÁFICO DE LINHA E ÁREA SVG POR TEMPO ---
const TimelineLineChart: React.FC<{ data: { label: string; value: number }[]; color?: string }> = ({ data, color = '#f59e0b' }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value), 5);
  const height = 130;
  const width = 450;
  const padding = 20;
  const gradId = `lineAreaGrad_${color.replace('#', '')}`;

  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full h-36">
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
            return (
              <g key={idx} className="group">
                <circle cx={x} cy={y} r="4.5" fill={color} className="transition-all group-hover:r-6 stroke-[#0d0e12] stroke-2 cursor-pointer" />
                <text x={x} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize="10" className="opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold">
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] font-mono text-gray-400 px-2">
        {data.map((d, idx) => (
          <span key={idx}>{d.label}</span>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE DE GRÁFICO DE PIZZA / DONUT SVG ---
const DonutPieChart: React.FC<{ items: { name: string; value: number; color: string }[]; total: number }> = ({ items, total }) => {
  if (total === 0) return <div className="text-xs text-gray-500 italic py-8 text-center">Sem dados suficientes para o gráfico de pizza.</div>;

  let currentAngle = 0;
  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
      <div className="relative w-36 h-36 flex items-center justify-center">
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
          <span className="text-xl font-black font-mono text-white">{total}</span>
          <span className="text-[9px] font-mono text-gray-400 block uppercase">Total</span>
        </div>
      </div>

      <div className="space-y-2.5 text-xs flex-1">
        {items.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-300 font-medium">{item.name}</span>
              </div>
              <span className="font-mono text-gray-100 font-bold">{item.value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onReturnToQuiz }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'quizzes'>('overview');
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>('all');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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

  // Verificação de Autorização
  const isAuthorized = useMemo(() => {
    if (!user || !user.email) return false;
    return AUTHORIZED_ADMINS.length === 0 || AUTHORIZED_ADMINS.includes(user.email.toLowerCase());
  }, [user]);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    if (!user || !isAuthorized) return;
    setLoadingData(true);
    try {
      const [logsData, quizzesData] = await Promise.all([
        fetchTelemetryLogs(300),
        fetchSavedQuizzes(150)
      ]);
      setLogs(logsData);
      setQuizzes(quizzesData);
    } catch (err: any) {
      console.error("Erro ao carregar dados de BI:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
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

// Mapeamento para Normalização dos Nomes de Aplicativos Históricos
const APP_NAME_MAP: Record<string, string> = {
  'JW Quiz': 'Avalia JW Quiz',
  'Avalia JW Quiz': 'Avalia JW Quiz',
  'Avalia Geral Quiz': 'Avalia Quiz',
  'Geral Quiz': 'Avalia Quiz',
  'Avalia Quiz': 'Avalia Quiz',
  'Avalia Kids Quiz': 'Avalia Kids',
  'Avalia Kids': 'Avalia Kids',
};

const normalizeAppName = (rawName?: string): string => {
  if (!rawName) return 'Avalia Quiz';
  return APP_NAME_MAP[rawName] || rawName;
};

// --- LISTA DINÂMICA DE APLICATIVOS (NORMALIZADA) ---
  const availableApps = useMemo(() => {
    const defaultApps = ['Avalia Quiz', 'Avalia JW Quiz', 'Avalia Kids'];
    const appSet = new Set<string>(defaultApps);
    logs.forEach(l => { appSet.add(normalizeAppName(l.appName)); });
    quizzes.forEach(q => { appSet.add(normalizeAppName(q.appName)); });
    return Array.from(appSet);
  }, [logs, quizzes]);

  // --- FILTRAGEM DE ESCOPO POR APP PARA MÉTRICAS E GRÁFICOS ---
  const scopedLogs = useMemo(() => {
    if (selectedAppFilter === 'all') return logs;
    return logs.filter(log => normalizeAppName(log.appName) === selectedAppFilter);
  }, [logs, selectedAppFilter]);

  const scopedQuizzes = useMemo(() => {
    if (selectedAppFilter === 'all') return quizzes;
    return quizzes.filter(quiz => normalizeAppName(quiz.appName) === selectedAppFilter);
  }, [quizzes, selectedAppFilter]);

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
        const eventMatch = selectedEventFilter === 'all' || log.eventType === selectedEventFilter;
        const searchMatch = !searchQuery.trim() || 
          (log.title && log.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (log.errorMessage && log.errorMessage.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (log.errorCode && log.errorCode.toLowerCase().includes(searchQuery.toLowerCase()));
        return eventMatch && searchMatch;
      })
      .sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
  }, [scopedLogs, selectedEventFilter, searchQuery]);

  const filteredQuizzes = useMemo(() => {
    const toMs = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts === 'object' && 'seconds' in ts) return ts.seconds * 1000;
      const d = new Date(ts);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    return scopedQuizzes
      .filter(quiz => {
        const searchMatch = !searchQuery.trim() ||
          (quiz.title && quiz.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (quiz.theme && quiz.theme.toLowerCase().includes(searchQuery.toLowerCase()));
        return searchMatch;
      })
      .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }, [scopedQuizzes, searchQuery]);

  const totalErrors = useMemo(() => scopedLogs.filter(l => l.eventType === 'error').length, [scopedLogs]);
  const totalQuizzes = scopedQuizzes.length;

  // Cálculo de Usuários / Dispositivos Únicos e Média de Quizzes por Usuário
  const uniqueUsersCount = useMemo(() => {
    const userSet = new Set<string>();
    scopedLogs.forEach(l => {
      if (l.userAgent) userSet.add(l.userAgent);
    });
    scopedQuizzes.forEach(q => {
      if (q.createdBy) userSet.add(q.createdBy);
      else if (q.userId) userSet.add(q.userId);
    });
    return Math.max(1, userSet.size);
  }, [scopedLogs, scopedQuizzes]);

  const quizzesPerUserAverage = useMemo(() => {
    if (uniqueUsersCount === 0) return '0.0';
    return (totalQuizzes / uniqueUsersCount).toFixed(1);
  }, [totalQuizzes, uniqueUsersCount]);

  // Contagem por Código de Erro
  const errorCodeCounts = useMemo(() => {
    const counts: Record<string, number> = { '503': 0, '429': 0, '403': 0, '500': 0, 'Outros': 0 };
    scopedLogs.filter(l => l.eventType === 'error').forEach(l => {
      const code = l.errorCode || 'Outros';
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

    logs.forEach(l => {
      const name = normalizeAppName(l.appName);
      if (!counts[name]) counts[name] = { total: 0, errors: 0, quizzes: 0, users: new Set() };
      counts[name].total += 1;
      if (l.eventType === 'error') counts[name].errors += 1;
      if (l.userAgent) counts[name].users.add(l.userAgent);
    });

    quizzes.forEach(q => {
      const name = normalizeAppName(q.appName);
      if (!counts[name]) counts[name] = { total: 0, errors: 0, quizzes: 0, users: new Set() };
      counts[name].quizzes += 1;
      if (q.createdBy) counts[name].users.add(q.createdBy);
    });

    return counts;
  }, [logs, quizzes, availableApps]);

  // Contagem e Estatísticas por Modelo de IA
  const modelMetrics = useMemo(() => {
    const counts: Record<string, { total: number; errors: number; quizzes: number }> = {};
    
    scopedLogs.forEach(l => {
      const model = (l as any).aiModel || (l as any).aiProvider || 'Gemini 2.5 Flash';
      if (!counts[model]) counts[model] = { total: 0, errors: 0, quizzes: 0 };
      counts[model].total += 1;
      if (l.eventType === 'error') counts[model].errors += 1;
    });

    scopedQuizzes.forEach(q => {
      const model = q.aiModel || q.aiProvider || 'Gemini 2.5 Flash';
      if (!counts[model]) counts[model] = { total: 0, errors: 0, quizzes: 0 };
      counts[model].quizzes += 1;
    });

    return counts;
  }, [scopedLogs, scopedQuizzes]);

  const modelPieData = useMemo(() => {
    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
    const items = Object.entries(modelMetrics).map(([name, metrics], idx) => ({
      name,
      value: metrics.quizzes || metrics.total,
      color: colors[idx % colors.length]
    }));
    const total = items.reduce((acc, curr) => acc + curr.value, 0);
    return { items, total };
  }, [modelMetrics]);

  // Dados para o Gráfico de Linha por Tempo (Timeline dos últimos 7 dias por métrica)
  const timelineData = useMemo(() => {
    const days: string[] = [];
    const map: Record<string, number | Set<string>> = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      days.push(key);
      map[key] = chartMetric === 'users' ? new Set<string>() : 0;
    }

    const parseDateKey = (timestamp?: any) => {
      let d: Date | null = null;
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp && typeof timestamp.seconds === 'number') {
        d = new Date(timestamp.seconds * 1000);
      } else if (timestamp) {
        d = new Date(timestamp);
      }
      if (!d || isNaN(d.getTime())) return days[days.length - 1];
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return map[key] !== undefined ? key : days[days.length - 1];
    };

    if (chartMetric === 'quizzes') {
      scopedQuizzes.forEach(q => {
        const key = parseDateKey(q.createdAt);
        (map[key] as number) += 1;
      });
    } else if (chartMetric === 'errors') {
      scopedLogs.filter(l => l.eventType === 'error').forEach(l => {
        const key = parseDateKey(l.timestamp);
        (map[key] as number) += 1;
      });
    } else if (chartMetric === 'users') {
      scopedLogs.forEach(l => {
        if (l.userAgent) {
          const key = parseDateKey(l.timestamp);
          (map[key] as Set<string>).add(l.userAgent);
        }
      });
      scopedQuizzes.forEach(q => {
        const userId = q.createdBy || q.userId;
        if (userId) {
          const key = parseDateKey(q.createdAt);
          (map[key] as Set<string>).add(userId);
        }
      });
    } else if (chartMetric === 'logs') {
      scopedLogs.forEach(l => {
        const key = parseDateKey(l.timestamp);
        (map[key] as number) += 1;
      });
    }

    return days.map(day => ({
      label: day,
      value: chartMetric === 'users' ? (map[day] as Set<string>).size : (map[day] as number)
    }));
  }, [scopedQuizzes, scopedLogs, chartMetric]);

  // Dados para o Gráfico de Pizza / Donut por App
  const appPieData = useMemo(() => {
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#06b6d4'];
    const items = Object.entries(appMetrics).map(([name, metrics], idx) => ({
      name,
      value: metrics.quizzes,
      color: colors[idx % colors.length]
    }));
    const total = items.reduce((acc, curr) => acc + curr.value, 0);
    return { items, total };
  }, [appMetrics]);

  // Temas Mais Populares com Normalização de Rótulos
  const topThemes = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedQuizzes.forEach(q => {
      const rawTheme = q.theme || 'Geral';
      const normalizedTheme = THEME_LABEL_MAP[rawTheme] || rawTheme;
      counts[normalizedTheme] = (counts[normalizedTheme] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [scopedQuizzes]);

  return (
    <div className="min-h-screen bg-[#0d0e12] text-gray-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* HEADER FIXO DE ALTA DENSIDADE BI */}
      <header className="border-b border-white/10 bg-[#12131a]/90 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xl">

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-xs shadow-md">
              BI
            </div>
            <span className="text-base font-bold text-white tracking-tight flex items-center">
              <span>Aval<span style={{ color: 'var(--accent-primary, #F7D33C)' }}>ia</span></span>
              <span className="mx-2 text-gray-600 font-normal">/</span>
              <span className="text-gray-300 font-mono text-xs uppercase tracking-wider">Dashboard BI</span>
            </span>
          </div>

          {user && isAuthorized && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Telemetria Conectada
            </div>
          )}
        </div>

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
            <p className="text-xs text-gray-400 font-mono">Autenticando administrador no Firebase...</p>
          </div>
        ) : !user ? (
          /* LOGIN CARD */
          <div className="flex flex-col items-center justify-center min-h-[65vh]">
            <div className="w-full max-w-md bg-[#14151d] p-8 rounded-3xl border border-white/10 shadow-2xl text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Painel de BI & Telemetria</h2>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Acesso restrito para análise de erros da IA, fluxo de requisições e relatórios de uso.
                </p>
              </div>

              {authError && (
                <div className="bg-red-950/40 border border-red-800/50 p-3 rounded-xl text-xs text-red-300">
                  {authError}
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                className="w-full py-3.5 px-4 bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Entrar com Conta do Google
              </button>
            </div>
          </div>
        ) : !isAuthorized ? (
          /* ACESSO NEGADO */
          <div className="max-w-md mx-auto my-16 bg-[#181214] p-8 rounded-3xl border border-red-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-200">Acesso Não Autorizado</h3>
            <p className="text-xs text-gray-400">
              A conta <strong className="text-white font-mono">{user.email}</strong> não possui privilégios de administrador.
            </p>
            <button onClick={logoutGoogle} className="px-4 py-2 bg-red-900/40 text-red-300 rounded-xl text-xs font-bold hover:bg-red-900/60">
              Encerrar Sessão
            </button>
          </div>
        ) : (
          /* DASHBOARD DE BI COMPLETO */
          <div className="space-y-6 animate-fade-in">
            {/* SCORECARDS KPI REESTRUTURADOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Quizzes Gerados */}
              <div className="bg-[#14151d] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Quizzes Gerados</span>
                  <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-white font-mono">{totalQuizzes}</span>
                  <span className="text-xs text-amber-400 font-bold ml-2">Total</span>
                </div>
                <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (totalQuizzes / 200) * 100)}%` }}></div>
                </div>
              </div>

              {/* Card 2: Usuários e Dispositivos */}
              <div className="bg-[#14151d] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Usuários & Dispositivos</span>
                  <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-blue-300 font-mono">{uniqueUsersCount}</span>
                  <span className="text-xs text-blue-400 font-medium ml-2">Únicos</span>
                </div>
                <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (uniqueUsersCount / 50) * 100)}%` }}></div>
                </div>
              </div>

              {/* Card 3: Média de Quizzes Por Usuário */}
              <div className="bg-[#14151d] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Quizzes / Usuário</span>
                  <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-emerald-300 font-mono">{quizzesPerUserAverage}</span>
                  <span className="text-xs text-gray-400 font-medium ml-2">Média</span>
                </div>
                <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (parseFloat(quizzesPerUserAverage) / 10) * 100)}%` }}></div>
                </div>
              </div>

              {/* Card 4: Erros da API */}
              <div className="bg-[#14151d] p-5 rounded-2xl border border-red-500/20 shadow-lg relative overflow-hidden bg-gradient-to-br from-[#14151d] to-red-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400">Erros da API (503/429)</span>
                  <span className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-red-200 font-mono">{totalErrors}</span>
                  <span className="text-xs text-red-400 font-medium ml-2">Falhas</span>
                </div>
                <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalErrors / Math.max(1, logs.length)) * 100)}%` }}></div>
                </div>
              </div>
            </div>

            {/* SEÇÃO VISUAL DE GRÁFICOS BI (LINHA POR TEMPO INTERATIVO & PIZZA/DONUT POR APP) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GRÁFICO DE LINHA POR TEMPO INTERATIVO */}
              <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: METRIC_COLORS[chartMetric] }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    {chartMetric === 'quizzes' && 'Quizzes Criados por Tempo'}
                    {chartMetric === 'errors' && 'Erros da IA por Tempo'}
                    {chartMetric === 'users' && 'Usuários Únicos por Tempo'}
                    {chartMetric === 'logs' && 'Acessos / Logs por Tempo'}
                    <span className="text-xs text-gray-500 font-normal hidden sm:inline">(Últimos 7 Dias)</span>
                  </h3>

                  {/* SELETOR INTERATIVO DE MÉTRICAS */}
                  <div className="flex items-center gap-1 bg-[#1c1d26] p-1 rounded-xl border border-white/10 text-[11px] font-medium self-start sm:self-auto">
                    <button
                      onClick={() => setChartMetric('quizzes')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${chartMetric === 'quizzes' ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40' : 'text-gray-400 hover:text-white'}`}
                    >
                      Quizzes
                    </button>
                    <button
                      onClick={() => setChartMetric('errors')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${chartMetric === 'errors' ? 'bg-red-500/20 text-red-400 font-bold border border-red-500/40' : 'text-gray-400 hover:text-white'}`}
                    >
                      Erros
                    </button>
                    <button
                      onClick={() => setChartMetric('users')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${chartMetric === 'users' ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/40' : 'text-gray-400 hover:text-white'}`}
                    >
                      Usuários
                    </button>
                    <button
                      onClick={() => setChartMetric('logs')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${chartMetric === 'logs' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40' : 'text-gray-400 hover:text-white'}`}
                    >
                      Acessos
                    </button>
                  </div>
                </div>

                <TimelineLineChart data={timelineData} color={METRIC_COLORS[chartMetric]} />
              </div>

              {/* GRÁFICO DE PIZZA / DONUT POR APP */}
              <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    Distribuição de Quizzes por App (Pizza)
                  </h3>
                  <span className="text-xs font-mono text-gray-400">Share por Aplicativo</span>
                </div>
                <DonutPieChart items={appPieData.items} total={appPieData.total} />
              </div>
            </div>

            {/* SEÇÃO VISUAL SECUNDÁRIA: MODELOS DE IA, ERROS HTTP E TEMAS POPULARES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CARD 1: RELATÓRIO DE USO POR MODELO DE IA */}
              <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Modelos de IA Utilizados
                  </h3>
                  <span className="text-xs font-mono text-purple-400">Share IA</span>
                </div>
                <DonutPieChart items={modelPieData.items} total={modelPieData.total} />
              </div>
              {/* GRÁFICO DE ERROS DA IA POR CÓDIGO */}
              <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Erros da IA por Código HTTP
                  </h3>
                  <span className="text-xs font-mono text-red-400">{totalErrors} erros</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1c1d26] p-4 rounded-2xl border border-red-500/20 text-center space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">503 Sobrecarga</span>
                    <p className="text-2xl font-black font-mono text-red-400">{errorCodeCounts['503'] || 0}</p>
                    <span className="text-[10px] text-gray-500 block">High Demand</span>
                  </div>
                  <div className="bg-[#1c1d26] p-4 rounded-2xl border border-amber-500/20 text-center space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">429 Cota API</span>
                    <p className="text-2xl font-black font-mono text-amber-400">{errorCodeCounts['429'] || 0}</p>
                    <span className="text-[10px] text-gray-500 block">Rate Limit</span>
                  </div>
                  <div className="bg-[#1c1d26] p-4 rounded-2xl border border-blue-500/20 text-center space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">403 Chave Inválida</span>
                    <p className="text-2xl font-black font-mono text-blue-400">{errorCodeCounts['403'] || 0}</p>
                    <span className="text-[10px] text-gray-500 block">Auth Rejeitado</span>
                  </div>
                  <div className="bg-[#1c1d26] p-4 rounded-2xl border border-purple-500/20 text-center space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">500 Servidor</span>
                    <p className="text-2xl font-black font-mono text-purple-400">{errorCodeCounts['500'] || 0}</p>
                    <span className="text-[10px] text-gray-500 block">Internal Error</span>
                  </div>
                </div>
              </div>

              {/* TOP TEMAS MAIS JOGADOS */}
              <div className="bg-[#14151d] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Top 5 Temas Mais Gerados
                </h3>
                {topThemes.length === 0 ? (
                  <div className="text-xs text-gray-500 italic py-6 text-center">Nenhum tema registrado ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {topThemes.map(([themeName, count], idx) => (
                      <div key={themeName} className="flex justify-between items-center bg-[#1c1d26] px-4 py-2.5 rounded-xl border border-white/5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold">#{idx + 1}</span>
                          <span className="font-semibold text-gray-200">{themeName}</span>
                        </div>
                        <span className="font-mono text-amber-400 font-bold">{count} quizzes</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO DE TABELAS EXPLORATÓRIAS BI */}
            <div className="bg-[#14151d] p-4 md:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Abas */}
                <div className="flex gap-2 bg-[#1c1d26] p-1.5 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                    Visão Geral
                  </button>
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

                {/* Filtros e Busca */}
                <div className="flex flex-wrap items-center gap-2">
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

                  <select
                    value={selectedAppFilter}
                    onChange={(e) => setSelectedAppFilter(e.target.value)}
                    className="bg-[#1c1d26] text-xs text-gray-200 border border-white/10 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="all">Todos os Apps</option>
                    {availableApps.map((appName) => (
                      <option key={appName} value={appName}>{appName}</option>
                    ))}
                  </select>

                  <button
                    onClick={loadData}
                    disabled={loadingData}
                    className="p-2 bg-[#1c1d26] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all"
                    title="Recarregar dados"
                  >
                    <svg className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* TABELA DE LOGS */}
              {activeTab === 'logs' && (
                <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#101117]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1c1d26] text-gray-400 font-mono text-[10px] uppercase border-b border-white/5">
                        <tr>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">App</th>
                          <th className="py-3 px-4">Detalhes / Mensagem de Erro</th>
                          <th className="py-3 px-4">Código</th>
                          <th className="py-3 px-4">Data / Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-500 italic">
                              Nenhum registro de log encontrado para a busca informada.
                            </td>
                          </tr>
                        ) : (
                          filteredLogs.map((log) => (
                            <tr 
                              key={log.id} 
                              onClick={() => setSelectedLogDetail(log)}
                              className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  log.eventType === 'error' ? 'bg-red-950/80 text-red-300 border border-red-800/60' :
                                  log.eventType === 'quiz_generated' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' :
                                  'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                                }`}>
                                  {log.eventType}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-200 font-semibold">{log.appName}</td>
                              <td className="py-3 px-4">
                                <p className="text-gray-100 font-medium">{log.title || log.errorMessage || '-'}</p>
                                {log.errorMessage && log.title && (
                                  <p className="text-gray-400 font-mono text-[11px] mt-0.5 truncate max-w-md">{log.errorMessage}</p>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-amber-400">{log.errorCode || '-'}</td>
                              <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">{log.timestamp || 'Recente'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TABELA DE QUIZZES */}
              {activeTab === 'quizzes' && (
                <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#101117]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1c1d26] text-gray-400 font-mono text-[10px] uppercase border-b border-white/5">
                        <tr>
                          <th className="py-3 px-4">Título do Quiz</th>
                          <th className="py-3 px-4">App</th>
                          <th className="py-3 px-4">Tema / Subtópico</th>
                          <th className="py-3 px-4">Qtd. Perguntas</th>
                          <th className="py-3 px-4">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredQuizzes.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-500 italic">
                              Nenhum quiz encontrado.
                            </td>
                          </tr>
                        ) : (
                          filteredQuizzes.map((quiz) => (
                            <tr key={quiz.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-3 px-4 font-bold text-white">{quiz.title}</td>
                              <td className="py-3 px-4 text-gray-300">{quiz.appName || 'Geral'}</td>
                              <td className="py-3 px-4 text-gray-400">{quiz.theme} {quiz.subTopic ? `(${quiz.subTopic})` : ''}</td>
                              <td className="py-3 px-4 font-mono text-amber-400">{quiz.questions?.length || 0}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => setSelectedQuizDetail(quiz)}
                                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-amber-400 rounded-lg text-[11px] font-medium"
                                >
                                  Ver Questões
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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
                <p className="text-xs text-gray-400">{selectedQuizDetail.appName} • {selectedQuizDetail.theme}</p>
              </div>
              <button onClick={() => setSelectedQuizDetail(null)} className="text-gray-400 hover:text-white text-sm font-bold">✕</button>
            </div>

            <div className="space-y-3">
              {selectedQuizDetail.questions?.map((q: any, idx: number) => (
                <div key={idx} className="bg-[#1c1d26] p-4 rounded-xl border border-white/5 space-y-2 text-xs">
                  <p className="font-bold text-amber-300">{idx + 1}. {q.question}</p>
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
              ))}
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
