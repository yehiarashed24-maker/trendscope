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
  Loader2,
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
            className="h-9 px-3.5 rounded-lg bg-[#11141c] hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-xs font-normal font-sans text-[#eef0f5] inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
            <span>Reports Center</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-[#7a8296]" strokeWidth={1.5} />
          </button>
        }
      />

      {/* AI Scientist Sub-Tabs (Assistant, Templates, Saved) */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#11141c] border border-[#eef0f5]/[0.08] w-fit overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'assistant' })}
          className={cn(
            'h-8 px-3.5 rounded-lg text-xs font-sans transition-colors duration-150 flex items-center gap-2 cursor-pointer',
            currentTab === 'assistant'
              ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border border-[#eef0f5]/[0.1]'
              : 'text-[#7a8296] hover:text-[#eef0f5] border border-transparent'
          )}
        >
          <Bot className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{t('workspace.tabs.assistant')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'templates' })}
          className={cn(
            'h-8 px-3.5 rounded-lg text-xs font-sans transition-colors duration-150 flex items-center gap-2 cursor-pointer',
            currentTab === 'templates'
              ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border border-[#eef0f5]/[0.1]'
              : 'text-[#7a8296] hover:text-[#eef0f5] border border-transparent'
          )}
        >
          <Library className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{t('workspace.tabs.templates')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'saved' })}
          className={cn(
            'h-8 px-3.5 rounded-lg text-xs font-sans transition-colors duration-150 flex items-center gap-2 cursor-pointer',
            currentTab === 'saved'
              ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border border-[#eef0f5]/[0.1]'
              : 'text-[#7a8296] hover:text-[#eef0f5] border border-transparent'
          )}
        >
          <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{t('workspace.tabs.saved')}</span>
          <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#07080d] border border-[#eef0f5]/[0.08] text-[#a3a9b8]">
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
              <div className="space-y-4 min-h-[380px] max-h-[460px] overflow-y-auto p-1">
                {messages.map((m) => {
                  const isAssistant = m.role === 'assistant';
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'p-4 rounded-xl border text-[13px] leading-[1.6]',
                        isAssistant
                          ? 'bg-[#07080d] border-[#eef0f5]/[0.07] text-[#eef0f5]'
                          : 'bg-[#1a1e28] border-[#eef0f5]/[0.1] text-[#eef0f5] ms-8'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-sans mb-2">
                        <span className="flex items-center gap-1.5 font-medium text-[#a3a9b8]">
                          {isAssistant ? <Bot className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} /> : null}
                          {isAssistant ? 'TrendScope Scientist' : 'Investigator'}
                        </span>
                        <span className="text-[#7a8296] font-mono tabular-nums text-[11px]">
                          {formatDate(m.timestamp, lang, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="font-sans whitespace-pre-line text-[#eef0f5]/90">
                        {m.content}
                      </div>

                      {/* Referenced backend metrics */}
                      {m.referencedMetrics && m.referencedMetrics.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#eef0f5]/[0.06] flex flex-wrap gap-2">
                          {m.referencedMetrics.map((met, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#11141c] border border-[#eef0f5]/[0.08] text-[#a3a9b8]"
                            >
                              <span className="text-[#7a8296]">{met.label}: </span>
                              <strong className="text-[#eef0f5] font-medium">{met.value}</strong>{' '}
                              <span className="text-[#7a8296]">({met.unit})</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#eef0f5]/[0.06] text-[11px] font-mono text-[#a3a9b8] space-y-1">
                          <div className="text-[#7a8296]">
                            Sources & mission DOI:
                          </div>
                          {m.citations.map((c, i) => (
                            <div key={i} className="text-[#a3a9b8] truncate">
                              [{i + 1}] {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isAsking && (
                  <div className="p-3.5 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] text-xs font-sans text-[#a3a9b8] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-[#38bdf8] animate-spin" strokeWidth={1.5} />
                    <span>Cross-referencing satellite telemetry and significance models...</span>
                  </div>
                )}
              </div>

              {/* Input box */}
              <div className="pt-3 border-t border-[#eef0f5]/[0.07]">
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
                    className="flex-1 h-10 px-3.5 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] focus:border-[#38bdf8]/50 focus:outline-none text-xs text-[#eef0f5] placeholder-[#7a8296] font-sans transition-colors duration-150"
                  />
                  <button
                    type="submit"
                    disabled={isAsking || !inputPrompt.trim()}
                    className="h-10 px-4 rounded-lg bg-[#eef0f5] hover:bg-white disabled:opacity-50 text-[#0b0d14] font-medium text-xs font-sans inline-flex items-center gap-1.5 transition-colors duration-150 shrink-0 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  >
                    <span>{t('workspace.assistant.send')}</span>
                    <Send className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={1.5} />
                  </button>
                </form>

                <p className="text-[11px] font-sans text-[#7a8296] mt-2">
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
                    className="w-full p-3 rounded-xl border border-[#eef0f5]/[0.07] bg-[#07080d] hover:border-[#eef0f5]/[0.14] hover:bg-[#1a1e28]/60 text-start text-xs text-[#a3a9b8] hover:text-[#eef0f5] font-sans transition-colors duration-150 block leading-relaxed cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </DataCard>

            <DataCard
              title="Active Grounding Context"
              subtitle="Telemetry bounds fed into synthesizer"
              badge={<span className="text-xs font-mono text-[#7a8296]">Grounded</span>}
            >
              <div className="space-y-2.5 text-xs font-sans text-[#a3a9b8]">
                <div className="flex justify-between py-1.5 border-b border-[#eef0f5]/[0.06]">
                  <span className="text-[#7a8296]">Selected Region</span>
                  <span className="text-[#eef0f5] font-medium">
                    {t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#eef0f5]/[0.06]">
                  <span className="text-[#7a8296]">Active Variable</span>
                  <span className="text-[#eef0f5] font-medium font-mono">
                    {t(`variables.${activeConfig.variableId}.name` as any)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#eef0f5]/[0.06]">
                  <span className="text-[#7a8296]">Mission Dataset</span>
                  <span className="text-[#a3a9b8] font-mono tabular-nums text-[11px]">{activeConfig.datasetId}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#7a8296]">Target Language</span>
                  <span className="text-[#38bdf8] font-mono font-medium text-[11px]">{lang.toUpperCase()}</span>
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
                  className="p-5 rounded-xl border border-[#eef0f5]/[0.07] bg-[#07080d] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-sans text-[#a3a9b8] mb-1.5">
                      <span className="text-[#38bdf8] font-medium">
                        {t(`regions.${tmpl.regionId}` as any) || tmpl.regionId}
                      </span>
                      <span className="font-mono text-[11px] text-[#7a8296]">{t(`variables.${tmpl.variableId}.name` as any)}</span>
                    </div>
                    <h4 className="text-[14px] font-medium font-sans text-[#eef0f5] mb-2">
                      {tmpl.customTitle || (tmpl.titleKey ? t(tmpl.titleKey as any) : tmpl.id)}
                    </h4>
                    <div className="text-[11px] font-mono tabular-nums text-[#7a8296] mb-4">
                      Dataset: {tmpl.datasetId} · Coverage: {tmpl.timeRange.startDate} to{' '}
                      {tmpl.timeRange.endDate}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#eef0f5]/[0.06] flex items-center justify-between">
                    <DemoDataBadge status="VERIFIED" size="sm" />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConfig(tmpl);
                        navigate('/analysis');
                      }}
                      className="h-8 px-3.5 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs font-medium font-sans inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                    >
                      <span>{t('workspace.templates.runTemplate')}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={1.5} />
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
            badge={<span className="text-xs font-mono text-[#7a8296]">Local cache</span>}
          >
            {savedInvestigations.length === 0 ? (
              <EmptyState
                title={t('workspace.saved.noSaved')}
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/explorer')}
                    className="h-9 px-4 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs font-medium font-sans transition-colors duration-150 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  >
                    Launch Earth Explorer
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedInvestigations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-5 rounded-xl border border-[#eef0f5]/[0.07] bg-[#07080d] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-sans text-[#a3a9b8] mb-1">
                        <span className="text-[#38bdf8] font-medium">
                          {t(`regions.${inv.regionId}` as any) || inv.regionId}
                        </span>
                        <span className="text-[#7a8296] font-mono tabular-nums text-[11px]">{formatDate(inv.createdAt, lang)}</span>
                      </div>
                      <h4 className="text-[14px] font-medium text-[#eef0f5] font-sans mb-1">
                        {t(`variables.${inv.variableId}.name` as any)} Analysis
                      </h4>
                      <p className="text-[11px] font-mono tabular-nums text-[#7a8296] mb-3">
                        {inv.datasetId} · {inv.timeRange.startDate} – {inv.timeRange.endDate}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#eef0f5]/[0.06] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => deleteSavedInvestigation(inv.id)}
                        className="p-1.5 rounded-md text-[#7a8296] hover:text-[#e5484d] hover:bg-[#e5484d]/10 transition-colors duration-150 cursor-pointer"
                        title="Delete investigation"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          loadSavedInvestigation(inv);
                          navigate('/analysis');
                        }}
                        className="h-8 px-3 rounded-lg bg-[#11141c] hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-[#eef0f5] text-xs font-normal font-sans transition-colors duration-150 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Open Analysis</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-[#7a8296]" strokeWidth={1.5} />
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
