import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Shuffle, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import {
  CONSTRUCT_METADATA,
  ConstructId,
  IPSATIVE_TRIAD_BANK,
  IpsativeTriad
} from '../data/missionLexicon';
import {
  IpsativeAssessmentResult,
  TriadResponseRecord,
  evaluateIpsativeInventory,
  sampleIpsativeTriads
} from '../utils/psychometrics';

interface ForcedChoiceModuleProps {
  ipsativeResult: IpsativeAssessmentResult | null;
  onCompleteIpsative: (result: IpsativeAssessmentResult) => void;
}

export const ForcedChoiceModule: React.FC<ForcedChoiceModuleProps> = ({
  ipsativeResult,
  onCompleteIpsative
}) => {
  const [triadBlockSize, setTriadBlockSize] = useState<number>(5);
  const [sessionTriads, setSessionTriads] = useState<IpsativeTriad[]>(() =>
    sampleIpsativeTriads(5)
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [mostId, setMostId] = useState<string | null>(null);
  const [leastId, setLeastId] = useState<string | null>(null);
  const [switchCount, setSwitchCount] = useState<number>(0);
  const [responses, setResponses] = useState<TriadResponseRecord[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(0);
  const [usedTriadIds, setUsedTriadIds] = useState<Set<string>>(new Set());

  const triadRenderStartRef = useRef<number>(0);
  const rafTimerRef = useRef<number | null>(null);

  const currentTriad = sessionTriads[currentIndex];

  const syncTriadOnset = () => {
    if (rafTimerRef.current !== null) {
      window.cancelAnimationFrame(rafTimerRef.current);
    }
    window.requestAnimationFrame((paintNow) => {
      triadRenderStartRef.current = paintNow;
      const tick = (now: number) => {
        setLiveElapsedMs(Math.max(0, Math.round(now - triadRenderStartRef.current)));
        rafTimerRef.current = window.requestAnimationFrame(tick);
      };
      rafTimerRef.current = window.requestAnimationFrame(tick);
    });
  };

  useEffect(() => {
    return () => {
      if (rafTimerRef.current !== null) {
        window.cancelAnimationFrame(rafTimerRef.current);
      }
    };
  }, []);

  const handleStartInventory = (triadCount = 6) => {
    const sampled = sampleIpsativeTriads(triadCount, usedTriadIds);
    setSessionTriads(sampled);
    setCurrentIndex(0);
    setMostId(null);
    setLeastId(null);
    setSwitchCount(0);
    setResponses([]);
    setValidationMsg(null);
    setIsActive(true);
    syncTriadOnset();
  };

  const handleSelectMost = (statementId: string) => {
    setValidationMsg(null);
    if (mostId !== null && mostId !== statementId) {
      setSwitchCount((c) => c + 1);
    }
    if (leastId === statementId) {
      setLeastId(null);
      setSwitchCount((c) => c + 1);
    }
    setMostId(statementId);
  };

  const handleSelectLeast = (statementId: string) => {
    setValidationMsg(null);
    if (leastId !== null && leastId !== statementId) {
      setSwitchCount((c) => c + 1);
    }
    if (mostId === statementId) {
      setMostId(null);
      setSwitchCount((c) => c + 1);
    }
    setLeastId(statementId);
  };

  const handleConfirmTriad = () => {
    if (!currentTriad) return;
    if (!mostId || !leastId) {
      setValidationMsg(
        'Ipsative constraint: Select exactly ONE statement as "Most Like Me" and ONE distinct statement as "Least Like Me".'
      );
      return;
    }

    const hesitationDurationMs = Math.max(
      250,
      Math.round(performance.now() - triadRenderStartRef.current)
    );

    const mostStmt = currentTriad.statements.find((s) => s.id === mostId)!;
    const leastStmt = currentTriad.statements.find((s) => s.id === leastId)!;
    const weights = currentTriad.statements.map((s) => s.sdWeight);
    const sdSpread = Math.round((Math.max(...weights) - Math.min(...weights)) * 100) / 100;

    const record: TriadResponseRecord = {
      triadId: currentTriad.id,
      mostLikeMeStatementId: mostStmt.id,
      leastLikeMeStatementId: leastStmt.id,
      mostConstruct: mostStmt.construct,
      leastConstruct: leastStmt.construct,
      hesitationDurationMs,
      selectionSwitchCount: switchCount,
      sdSpread
    };

    const nextResponses = [...responses, record];
    setResponses(nextResponses);

    const nextUsed = new Set(usedTriadIds);
    nextUsed.add(currentTriad.id);
    setUsedTriadIds(nextUsed);

    if (currentIndex + 1 < sessionTriads.length) {
      setCurrentIndex(currentIndex + 1);
      setMostId(null);
      setLeastId(null);
      setSwitchCount(0);
      setValidationMsg(null);
      syncTriadOnset();
    } else {
      if (rafTimerRef.current !== null) {
        window.cancelAnimationFrame(rafTimerRef.current);
      }
      setIsActive(false);
      const evaluated = evaluateIpsativeInventory(nextResponses);
      onCompleteIpsative(evaluated);
    }
  };

  const constructsList = Object.values(CONSTRUCT_METADATA);

  return (
    <section aria-labelledby="ipsative-heading" className="space-y-8">
      <div className="hc-surface bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-800">
              <span>MODULE 02</span>
              <span aria-hidden="true">·</span>
              <span>IPSATIVE EQUALLY-DESIRABLE TRIADS</span>
              <span aria-hidden="true">·</span>
              <span>{IPSATIVE_TRIAD_BANK.length} TRIADS ({IPSATIVE_TRIAD_BANK.length * 3} STATEMENTS)</span>
            </div>
            <h2 id="ipsative-heading" className="text-2xl font-bold text-slate-900 mt-1">
              Multidimensional Forced-Choice Psychometric Inventory
            </h2>
            <p className="text-slate-600 hc-muted text-sm mt-1 max-w-3xl">
              Counters social desirability and impression management by pairing three statements of matched desirability weight (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">SD &Delta; &le; 0.06</code>) masking five latent constructs: Emotional Stability, Interpersonal Tolerance, Conscientiousness, Stress Recovery, and Autonomy. Prolonged hesitation combined with an inconsistent trait profile elevates the <strong>Cognitive Dissimulation Index (CDI)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <span>Triad Block:</span>
              <select
                aria-label="Ipsative Triad Block Size"
                value={triadBlockSize}
                disabled={isActive}
                onChange={(e) => setTriadBlockSize(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-900"
              >
                <option value={3}>3 Triads (9 Statements)</option>
                <option value={5}>5 Triads (15 Statements)</option>
                <option value={10}>10 Triads (30 Statements)</option>
              </select>
            </label>

            {isActive && (
              <button
                type="button"
                onClick={() => handleStartInventory(triadBlockSize)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restart Block</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Forced-Choice Triad Runner OR Summary View */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 hc-surface bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            {isActive && currentTriad ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs font-mono text-slate-600 hc-muted">
                  <span>
                    TRIAD {currentIndex + 1} OF {sessionTriads.length} · {currentTriad.id} ({currentTriad.contextTag})
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-900 font-semibold tabular-nums">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Hesitation Timer: {(liveElapsedMs / 1000).toFixed(1)}s</span>
                    <span aria-hidden="true">·</span>
                    <span>Switches: {switchCount}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 hc-muted">
                  All three statements below carry matched social desirability weights. Choose the <strong>one statement Most Like You</strong> and the <strong>one statement Least Like You</strong> during orbital operations.
                </p>

                <div className="space-y-3">
                  {currentTriad.statements.map((stmt, idx) => {
                    const isMost = mostId === stmt.id;
                    const isLeast = leastId === stmt.id;
                    return (
                      <div
                        key={stmt.id}
                        className={`hc-surface p-4 rounded-xl border transition-colors ${
                          isMost
                            ? 'bg-emerald-50/70 border-emerald-500'
                            : isLeast
                            ? 'bg-cyan-50/70 border-cyan-500'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-medium text-slate-900 leading-relaxed">
                            <span className="font-mono text-xs text-slate-400 mr-2">
                              0{idx + 1}.
                            </span>
                            {stmt.text}
                          </p>
                          <span className="text-xs font-mono text-slate-400 shrink-0">
                            SD {stmt.sdWeight.toFixed(2)}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleSelectMost(stmt.id)}
                            aria-pressed={isMost}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isMost
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
                            }`}
                          >
                            Most Like Me
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectLeast(stmt.id)}
                            aria-pressed={isLeast}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isLeast
                                ? 'bg-cyan-800 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-cyan-50 hover:text-cyan-900'
                            }`}
                          >
                            Least Like Me
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {validationMsg && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                    <span>{validationMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-mono text-slate-500 hc-muted">
                    Construct labels masked during administration
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmTriad}
                    className="hc-primary-btn px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
                  >
                    {currentIndex + 1 < sessionTriads.length
                      ? 'Confirm Triad & Next'
                      : 'Complete Inventory & Compute CDI'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="my-auto py-8 text-center space-y-4">
                <ShieldCheck className="w-10 h-10 text-emerald-700 mx-auto" aria-hidden="true" />
                <h3 className="text-lg font-bold text-slate-900">
                  {ipsativeResult
                    ? 'Forced-Choice Psychometric Profile Computed'
                    : 'Ready for Anti-Manipulation Triad Administration'}
                </h3>
                <p className="text-sm text-slate-600 hc-muted max-w-md mx-auto">
                  Each session draws non-repeating triads from the 30-triad (90-statement) orbital bank. Choice hesitation latency and cross-triad construct consistency are monitored continuously.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleStartInventory(triadBlockSize)}
                    className="hc-primary-btn px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {ipsativeResult ? 'Administer New Non-Repeating Triad Block' : 'Begin Forced-Choice Inventory'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Construct Profile & Cognitive Dissimulation Index (CDI) */}
          <div className="lg:col-span-5 hc-surface bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Ipsative Construct Standing & CDI
                </h3>
                <span className="text-xs font-mono text-slate-500">5 LATENT DIMENSIONS</span>
              </div>

              {/* Cognitive Dissimulation Index Box */}
              <div className="mt-4 bg-white hc-surface border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 hc-muted">
                  <span>COGNITIVE DISSIMULATION INDEX (CDI)</span>
                  <span>IMPRESSION MANAGEMENT MONITOR</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span
                      className="text-3xl font-mono font-bold text-slate-900 tabular-nums"
                      data-testid="cdi-score"
                    >
                      {ipsativeResult ? `${ipsativeResult.cognitiveDissimulationIndex}%` : '—'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 ml-2">
                      {ipsativeResult ? ipsativeResult.dissimulationFlag : 'Awaiting Triads'}
                    </span>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-600 hc-muted">
                    <div>
                      Mean Hesitation: {ipsativeResult ? `${ipsativeResult.meanHesitationMs} ms` : '—'}
                    </div>
                    <div>
                      Inconsistency: {ipsativeResult ? `${ipsativeResult.profileInconsistencyIndex}%` : '—'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 hc-muted mt-2">
                  Prolonged choice hesitation (&gt;8.5s) combined with conflicting construct selections across triads elevates CDI.
                </p>
              </div>

              {/* 5 Construct Bars */}
              <div className="mt-5 space-y-3.5">
                {constructsList.map((c) => {
                  const score = ipsativeResult ? ipsativeResult.constructScores[c.id] : null;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {c.label}
                          <span className="font-normal text-slate-500 hc-muted ml-1.5">
                            · {c.domain === 'psychological' ? 'Psychological' : 'Behavioral'}
                          </span>
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {score !== null ? `${score} / 100` : '—'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            c.domain === 'psychological' ? 'bg-cyan-700' : 'bg-emerald-700'
                          }`}
                          style={{ width: `${score !== null ? score : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {ipsativeResult && (
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>{ipsativeResult.responses.length} Triads Evaluated</span>
                </span>
                <span>Prolonged Hesitations: {ipsativeResult.prolongedHesitationCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* 30-Triad (90-Statement) Ipsative Corpus Inspector */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Matched Social-Desirability Triad Bank ({IPSATIVE_TRIAD_BANK.length} Triads · {IPSATIVE_TRIAD_BANK.length * 3} Statements)
              </h3>
              <p className="text-xs text-slate-600 hc-muted">
                Every triad pairs three distinct orbital behavioral constructs with matched social desirability weights (SD 4.15–4.31).
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              UNUSED IN SESSION: {IPSATIVE_TRIAD_BANK.length - usedTriadIds.size} TRIADS
            </span>
          </div>

          <div className="hc-surface bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {IPSATIVE_TRIAD_BANK.map((triad) => (
              <div key={triad.id} className="bg-white border border-slate-200/80 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px] text-cyan-900 font-semibold">
                  <span>{triad.id} · {triad.contextTag}</span>
                  <span>3 Masked Constructs</span>
                </div>
                {triad.statements.map((s) => (
                  <div key={s.id} className="text-slate-700 flex items-start justify-between gap-2">
                    <span className="truncate">{s.text}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">SD {s.sdWeight.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
