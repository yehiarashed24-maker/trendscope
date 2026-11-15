import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Library,
  Bookmark,
  Send,
  Trash2,
  ArrowRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataCard } from '../../components/common/DataCard';
import { DemoDataBadge } from '../../components/common/DemoDataBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import { aiScientistService } from '../../services/ai/aiScientistService';
import { FEATURED_INVESTIGATION_TEMPLATES, ENVIRONMENTAL_VARIABLES } from '../../services/nasa/constants';
import { AiScientistMessage, SupportedLanguage } from '../../types/scientific';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export const WorkspacePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;

  const {
    activeConfig,
    setActiveConfig,
    savedInvestigations,
    deleteSavedInvestigation,
    loadSavedInvestigation,
  } = useAppStore();

  const currentTab =
    (searchParams.get('tab') as 'assistant' | 'templates' | 'saved') || 'assistant';

  // Assistant state
  const [messages, setMessages] = useState<AiScientistMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Initialize welcome assistant message on language change or first render
  useEffect(() => {
    let isMounted = true;
    aiScientistService
      .askQuestion(
        'Provide a concise scientific overview of the active Nile Delta subregion metrics and spatial resolution.',
        lang,
        {
          regionId: activeConfig.regionId,
          variableId: activeConfig.variableId,
          lstMode: activeConfig.lstMode,
          timeRange: activeConfig.timeRange,
        }
      )
      .then((initialMsg) => {
        if (isMounted) {
          setMessages([initialMsg]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lang, activeConfig.regionId, activeConfig.variableId, activeConfig.lstMode]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isAsking) return;

    const userMsg: AiScientistMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
      content: textToSend,
      dataStatus: 'VERIFIED',
      language: lang,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsAsking(true);

    try {
      const assistantReply = await aiScientistService.askQuestion(textToSend, lang, {
        regionId: activeConfig.regionId,
        variableId: activeConfig.variableId,
        lstMode: activeConfig.lstMode,
        timeRange: activeConfig.timeRange,
      });
      setMessages((prev) => [...prev, assistantReply]);
    } catch {
      // handled inside service
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('workspace.title')}
        subtitle={t('workspace.subtitle')}
        status="VERIFIED"
        actions={
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium font-sans text-zinc-300 inline-flex items-center gap-2 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Reports Center</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        }
      />

      {/* AI Scientist Sub-Tabs (Assistant, Templates, Saved) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0F17] border border-zinc-800/80 w-fit overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'assistant' })}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors flex items-center gap-2',
            currentTab === 'assistant'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{t('workspace.tabs.assistant')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'templates' })}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors flex items-center gap-2',
            currentTab === 'templates'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          )}
        >
          <Library className="w-3.5 h-3.5" />
          <span>{t('workspace.tabs.templates')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'saved' })}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors flex items-center gap-2',
            currentTab === 'saved'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          )}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>{t('workspace.tabs.saved')}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
            {savedInvestigations.length}
          </span>
        </button>
      </div>

      {/* TAB 1: AI SCIENTIST ASSISTANT */}
      {currentTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chat Window */}
          <div className="lg:col-span-8 space-y-4">
            <DataCard
              title="Evidence-Grounded Scientific Inquirer"
              subtitle="Constrained strictly to verified Nile Delta NASA metrics & citations"
              badge={<DemoDataBadge status="VERIFIED" size="sm" />}
            >
              {/* Message thread */}
              <div className="space-y-4 min-h-[380px] max-h-[460px] overflow-y-auto p-2">
                {messages.map((m) => {
                  const isAssistant = m.role === 'assistant';
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'p-4 rounded-xl border text-xs leading-relaxed',
                        isAssistant
                          ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-200'
                          : 'bg-zinc-800/70 border-zinc-700/80 text-white ms-8'
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-sans mb-2">
                        <span className="flex items-center gap-1.5 font-medium text-zinc-400">
                          {isAssistant ? <Bot className="w-3.5 h-3.5 text-sky-400" /> : null}
                          {isAssistant ? 'TrendScope Scientist' : 'Investigator'}
                        </span>
                        <span className="text-zinc-500 font-mono text-[10px]">
                          {formatDate(m.timestamp, lang, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="font-sans whitespace-pre-line text-zinc-300">
                        {m.content}
                      </div>

                      {/* Referenced backend metrics */}
                      {m.referencedMetrics && m.referencedMetrics.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/70 flex flex-wrap gap-2">
                          {m.referencedMetrics.map((met, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                            >
                              <span className="text-zinc-500">{met.label}: </span>
                              <strong className="text-white">{met.value}</strong>{' '}
                              <span className="text-zinc-400">({met.unit})</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/70 text-[11px] font-mono text-zinc-400 space-y-1">
                          <div className="text-zinc-500">
                            Sources & mission DOI:
                          </div>
                          {m.citations.map((c, i) => (
                            <div key={i} className="text-zinc-400 truncate">
                              [{i + 1}] {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isAsking && (
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs font-sans text-zinc-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    <span>Cross-referencing satellite telemetry and significance models...</span>
                  </div>
                )}
              </div>

              {/* Input box */}
              <div className="pt-3 border-t border-zinc-800/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder={t('workspace.assistant.placeholder')}
                    className="flex-1 h-10 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-sky-500 focus:outline-none text-xs text-white placeholder-zinc-500 font-sans transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isAsking || !inputPrompt.trim()}
                    className="h-10 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs font-sans inline-flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <span>{t('workspace.assistant.send')}</span>
                    <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </form>

                <p className="text-[11px] font-sans text-zinc-500 mt-2">
                  {t('workspace.assistant.disclaimer')}
                </p>
              </div>
            </DataCard>
          </div>

          {/* Right Column: Suggested Queries & Active Study Context */}
          <div className="lg:col-span-4 space-y-4">
            <DataCard
              title={t('workspace.assistant.suggestedQueries')}
              subtitle="Pre-calibrated inquiries grounded on current study region"
            >
              <div className="space-y-2">
                {[
                  t('workspace.assistant.query1'),
                  t('workspace.assistant.query2'),
                  t('workspace.assistant.query3'),
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="w-full p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900 text-start text-xs text-zinc-300 font-sans transition-colors block leading-relaxed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </DataCard>

            <DataCard
              title="Active Grounding Context"
              subtitle="Telemetry bounds fed into synthesizer"
              badge={<span className="text-[11px] font-mono text-zinc-400">Grounded</span>}
            >
              <div className="space-y-2 text-xs font-sans text-zinc-300">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-500">Selected Region</span>
                  <span className="text-white font-medium">
                    {t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-500">Active Variable</span>
                  <span className="text-amber-400 font-medium font-mono">
                    {t(`variables.${activeConfig.variableId}.name` as any)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-500">Mission Dataset</span>
                  <span className="text-zinc-300 font-mono text-[11px]">{activeConfig.datasetId}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Target Language</span>
                  <span className="text-sky-400 uppercase font-mono font-medium text-[11px]">{lang}</span>
                </div>
              </div>
            </DataCard>
          </div>
        </div>
      )}

      {/* TAB 2: INVESTIGATION LIBRARY */}
      {currentTab === 'templates' && (
        <div className="space-y-4">
          <DataCard
            title={t('workspace.templates.title')}
            subtitle={t('workspace.templates.subtitle')}
            badge={<DemoDataBadge status="VERIFIED" size="sm" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEATURED_INVESTIGATION_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-sans text-zinc-400 mb-1.5">
                      <span className="text-sky-400 font-medium">
                        {t(`regions.${tmpl.regionId}` as any) || tmpl.regionId}
                      </span>
                      <span className="font-mono text-[11px]">{t(`variables.${tmpl.variableId}.name` as any)}</span>
                    </div>
                    <h4 className="text-xs font-semibold font-sans text-white mb-2">
                      {tmpl.customTitle || (tmpl.titleKey ? t(tmpl.titleKey as any) : tmpl.id)}
                    </h4>
                    <div className="text-[11px] font-mono text-zinc-500 mb-4">
                      Dataset: {tmpl.datasetId} • Coverage: {tmpl.timeRange.startDate} to{' '}
                      {tmpl.timeRange.endDate}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <DemoDataBadge status="VERIFIED" size="sm" />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConfig(tmpl);
                        navigate('/analysis');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium font-sans inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>{t('workspace.templates.runTemplate')}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </DataCard>
        </div>
      )}

      {/* TAB 3: SAVED RESEARCH WORKSPACE */}
      {currentTab === 'saved' && (
        <div className="space-y-4">
          <DataCard
            title={t('workspace.saved.title')}
            subtitle={t('workspace.saved.subtitle')}
            badge={<span className="text-[11px] font-mono text-zinc-400">Local cache</span>}
          >
            {savedInvestigations.length === 0 ? (
              <EmptyState
                title={t('workspace.saved.noSaved')}
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/explorer')}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium font-sans transition-colors"
                  >
                    Launch Earth Explorer
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {savedInvestigations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-sans text-zinc-400 mb-1">
                        <span className="text-sky-400 font-medium">
                          {t(`regions.${inv.regionId}` as any) || inv.regionId}
                        </span>
                        <span className="text-zinc-500 font-mono text-[10px]">{formatDate(inv.createdAt, lang)}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white font-sans mb-1">
                        {t(`variables.${inv.variableId}.name` as any)} Analysis
                      </h4>
                      <p className="text-[11px] font-mono text-zinc-500 mb-3">
                        {inv.datasetId} • {inv.timeRange.startDate} - {inv.timeRange.endDate}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => deleteSavedInvestigation(inv.id)}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete investigation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          loadSavedInvestigation(inv);
                          navigate('/analysis');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium font-sans transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>Open Analysis</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </div>
      )}
    </div>
  );
};
