import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Play, RotateCcw, CheckCircle2, Search } from 'lucide-react';
import {
  SPACEFLIGHT_STROOP_LEXICON,
  StroopCategory,
  StroopWordEntry
} from '../data/missionLexicon';
import {
  HardwareLatencyProfile,
  StroopAssessmentResult,
  StroopInkColor,
  StroopTrialRecord,
  compensateReactionTime,
  evaluateStroopSession,
  sampleStroopSessionWords
} from '../utils/psychometrics';

interface EmotionalStroopModuleProps {
  latencyProfile: HardwareLatencyProfile;
  stroopResult: StroopAssessmentResult | null;
  onCompleteStroop: (result: StroopAssessmentResult) => void;
}

const INK_COLOR_CONFIG: Record<
  StroopInkColor,
  { label: string; keyHint: string; textClass: string; buttonClass: string }
> = {
  CYAN: {
    label: 'Cyan',
    keyHint: '1',
    textClass: 'text-cyan-600',
    buttonClass: 'bg-cyan-700 hover:bg-cyan-800 text-white border-cyan-900'
  },
  EMERALD: {
    label: 'Emerald',
    keyHint: '2',
    textClass: 'text-emerald-600',
    buttonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-900'
  },
  AMBER: {
    label: 'Amber',
    keyHint: '3',
    textClass: 'text-amber-600',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-800'
  },
  COBALT: {
    label: 'Cobalt',
    keyHint: '4',
    textClass: 'text-blue-700',
    buttonClass: 'bg-blue-700 hover:bg-blue-800 text-white border-blue-900'
  }
};

const INK_COLORS: StroopInkColor[] = ['CYAN', 'EMERALD', 'AMBER', 'COBALT'];

export const EmotionalStroopModule: React.FC<EmotionalStroopModuleProps> = ({
  latencyProfile,
  stroopResult,
  onCompleteStroop
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [trialsPerCategory, setTrialsPerCategory] = useState<number>(2); // 2 per category = 8 balanced trials
  const [sessionWords, setSessionWords] = useState<StroopWordEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [currentInk, setCurrentInk] = useState<StroopInkColor>('CYAN');
  const [recordedTrials, setRecordedTrials] = useState<StroopTrialRecord[]>([]);
  const [usedWordsHistory, setUsedWordsHistory] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<StroopCategory | 'all'>('all');

  // RenderSync and press/release timing refs
  const wordPaintTimeRef = useRef<number>(0);
  const pressDownTimeRef = useRef<number>(0);
  const activeColorSelectionRef = useRef<StroopInkColor | null>(null);

  const pickRandomInk = (): StroopInkColor =>
    INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)];

  const syncWordOnset = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame((paintNow) => {
        wordPaintTimeRef.current = paintNow;
      });
    });
  }, []);

  const handleStartStroop = () => {
    const words = sampleStroopSessionWords(trialsPerCategory, usedWordsHistory);
    setSessionWords(words);
    setCurrentIdx(0);
    setRecordedTrials([]);
    setCurrentInk(pickRandomInk());
    setIsRunning(true);
    syncWordOnset();
  };

  const handleColorPressDown = (color: StroopInkColor) => {
    if (!isRunning) return;
    pressDownTimeRef.current = performance.now();
    activeColorSelectionRef.current = color;
  };

  const handleColorReleaseUp = useCallback(
    (color: StroopInkColor) => {
      if (!isRunning || currentIdx >= sessionWords.length) return;
      const releaseNow = performance.now();
      const downTime =
        activeColorSelectionRef.current === color && pressDownTimeRef.current > 0
          ? pressDownTimeRef.current
          : releaseNow - 65;

      const rawRt = Math.max(
        90,
        Math.round((downTime - wordPaintTimeRef.current) * 10) / 10
      );
      const holdMs = Math.max(15, Math.round((releaseNow - downTime) * 10) / 10);
      const compensatedRt = compensateReactionTime(rawRt, latencyProfile);

      const currentWordObj = sessionWords[currentIdx];
      const record: StroopTrialRecord = {
        trialNumber: currentIdx + 1,
        word: currentWordObj.word,
        category: currentWordObj.category,
        inkColor: currentInk,
        selectedColor: color,
        isCorrect: color === currentInk,
        rawReactionMs: rawRt,
        compensatedReactionMs: compensatedRt,
        keyHoldDurationMs: holdMs
      };

      const nextTrials = [...recordedTrials, record];
      setRecordedTrials(nextTrials);

      const nextHistory = new Set(usedWordsHistory);
      nextHistory.add(currentWordObj.word);
      setUsedWordsHistory(nextHistory);

      activeColorSelectionRef.current = null;
      pressDownTimeRef.current = 0;

      if (currentIdx + 1 < sessionWords.length) {
        setCurrentIdx(currentIdx + 1);
        setCurrentInk(pickRandomInk());
        syncWordOnset();
      } else {
        setIsRunning(false);
        const summary = evaluateStroopSession(nextTrials);
        onCompleteStroop(summary);
      }
    },
    [
      currentIdx,
      currentInk,
      isRunning,
      latencyProfile,
      onCompleteStroop,
      recordedTrials,
      sessionWords,
      syncWordOnset,
      usedWordsHistory
    ]
  );

  // Keyboard support (Keys 1, 2, 3, 4) with keydown + keyup latency tracking
  useEffect(() => {
    if (!isRunning) return;
    const keyMap: Record<string, StroopInkColor> = {
      Digit1: 'CYAN',
      Digit2: 'EMERALD',
      Digit3: 'AMBER',
      Digit4: 'COBALT'
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mapped = keyMap[e.code];
      if (mapped && !e.repeat) {
        handleColorPressDown(mapped);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = keyMap[e.code];
      if (mapped) {
        handleColorReleaseUp(mapped);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isRunning, handleColorReleaseUp]);

  const filteredLexicon = SPACEFLIGHT_STROOP_LEXICON.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesQuery =
      searchFilter.trim() === '' ||
      item.word.toLowerCase().includes(searchFilter.trim().toLowerCase());
    return matchesCat && matchesQuery;
  });

  const activeWord = sessionWords[currentIdx];

  return (
    <section aria-labelledby="stroop-heading" className="space-y-8">
      <div className="hc-surface bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-800">
              <span>MODULE 03</span>
              <span aria-hidden="true">·</span>
              <span>SPACEFLIGHT EMOTIONAL STROOP PARADIGM</span>
              <span aria-hidden="true">·</span>
              <span>{SPACEFLIGHT_STROOP_LEXICON.length} UNIQUE MISSION & INTERPERSONAL WORDS</span>
            </div>
            <h2 id="stroop-heading" className="text-2xl font-bold text-slate-900 mt-1">
              Spaceflight Emotional Stroop Task (Threat Attentional Bias)
            </h2>
            <p className="text-slate-600 hc-muted text-sm mt-1 max-w-3xl">
              Measures involuntary attentional fixation on mission-threat, interpersonal-conflict, and circadian-depletion vocabulary compared against neutral aerospace baseline terms. Uses <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">renderSync</code> onset timing and hardware latency compensation, drawing without replacement from {SPACEFLIGHT_STROOP_LEXICON.length} unique terms to prevent Stroop habituation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <span>Block Size:</span>
              <select
                aria-label="Stroop Session Trial Count"
                value={trialsPerCategory}
                disabled={isRunning}
                onChange={(e) => setTrialsPerCategory(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-900"
              >
                <option value={2}>8 Words (2 per Category)</option>
                <option value={4}>16 Words (4 per Category)</option>
                <option value={8}>32 Words (8 per Category)</option>
              </select>
            </label>

            {isRunning && (
              <button
                type="button"
                onClick={handleStartStroop}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restart Block</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Interactive Stroop Arena & Interference Telemetry */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 hc-surface bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 flex flex-col justify-between min-h-[300px]">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 hc-muted">
              <span>
                {isRunning
                  ? `TRIAL ${currentIdx + 1} OF ${sessionWords.length}`
                  : `NON-REPEATING LEXICON POOL: ${SPACEFLIGHT_STROOP_LEXICON.length - usedWordsHistory.size} UNUSED`}
              </span>
              <span>
                LATENCY COMPENSATION: -{latencyProfile.compositorOffsetMs + latencyProfile.inputJitterMs} MS
              </span>
            </div>

            {isRunning && activeWord ? (
              <div className="my-6 text-center space-y-6">
                <div className="bg-white hc-surface border-2 border-slate-200 rounded-xl py-10 px-6">
                  <span className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">
                    IDENTIFY INK CHROMATICITY — IGNORE SEMANTIC MEANING
                  </span>
                  <div
                    data-testid="stroop-stimulus-word"
                    className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight select-none ${INK_COLOR_CONFIG[currentInk].textClass}`}
                  >
                    {activeWord.word}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {INK_COLORS.map((colorKey) => {
                    const cfg = INK_COLOR_CONFIG[colorKey];
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        data-testid={`stroop-btn-${colorKey.toLowerCase()}`}
                        onMouseDown={() => handleColorPressDown(colorKey)}
                        onMouseUp={() => handleColorReleaseUp(colorKey)}
                        className={`py-3.5 px-4 rounded-xl font-semibold text-sm border transition-colors cursor-pointer select-none ${cfg.buttonClass}`}
                      >
                        <span>{cfg.label}</span>
                        <span className="font-mono text-xs opacity-80 ml-1.5">[{cfg.keyHint}]</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="my-auto py-8 text-center space-y-4">
                <Eye className="w-10 h-10 text-cyan-700 mx-auto" aria-hidden="true" />
                <h3 className="text-lg font-bold text-slate-900">
                  {stroopResult
                    ? 'Spaceflight Emotional Stroop Session Complete'
                    : 'Attentional Threat Bias & Interference Probe'}
                </h3>
                <p className="text-sm text-slate-600 hc-muted max-w-md mx-auto">
                  Select the <strong>ink color</strong> (Cyan, Emerald, Amber, or Cobalt) as quickly as possible while ignoring the spaceflight or interpersonal word meaning.
                </p>
                <button
                  type="button"
                  onClick={handleStartStroop}
                  className="hc-primary-btn px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  {stroopResult ? (
                    <>
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>Run Next Non-Repeating Block</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" aria-hidden="true" />
                      <span>Start Spaceflight Stroop</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="text-xs font-mono text-slate-500 hc-muted border-t border-slate-200 pt-3 flex items-center justify-between">
              <span>Input Mode: Mouse Press/Release or Keys [1–4]</span>
              <span>Habituation Guard: Active</span>
            </div>
          </div>

          {/* Right Column: Stroop Interference Breakdown */}
          <div className="lg:col-span-5 hc-surface bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Attentional Interference Delta (vs. Neutral Baseline)
              </h3>
              <p className="text-xs text-slate-500 hc-muted mt-0.5">
                Positive delta (+ms) indicates emotional threat fixation slowing executive color naming.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Neutral Baseline RT</span>
                  <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                    {stroopResult ? `${stroopResult.meanNeutralRtMs} ms` : '—'}
                  </span>
                </div>
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Color Accuracy</span>
                  <span className="text-xl font-mono font-bold text-emerald-800 tabular-nums">
                    {stroopResult ? `${stroopResult.accuracyPct}%` : '—'}
                  </span>
                </div>
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Mission-Threat Bias</span>
                  <span
                    className="text-xl font-mono font-bold text-slate-900 tabular-nums"
                    data-testid="stroop-threat-bias"
                  >
                    {stroopResult
                      ? `${stroopResult.missionThreatInterferenceMs >= 0 ? '+' : ''}${stroopResult.missionThreatInterferenceMs} ms`
                      : '—'}
                  </span>
                </div>
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Interpersonal Bias</span>
                  <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                    {stroopResult
                      ? `${stroopResult.interpersonalInterferenceMs >= 0 ? '+' : ''}${stroopResult.interpersonalInterferenceMs} ms`
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="mt-4 bg-white hc-surface border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 hc-muted">Mission-Threat Mean RT:</span>
                  <span className="font-semibold text-slate-900">
                    {stroopResult ? `${stroopResult.meanMissionThreatRtMs} ms` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 hc-muted">Interpersonal Strain Mean RT:</span>
                  <span className="font-semibold text-slate-900">
                    {stroopResult ? `${stroopResult.meanInterpersonalRtMs} ms` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 hc-muted">Circadian/Somatic Mean RT:</span>
                  <span className="font-semibold text-slate-900">
                    {stroopResult ? `${stroopResult.meanCircadianSomaticRtMs} ms` : '—'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-600 hc-muted">Executive Filtering Score:</span>
                  <span className="font-bold text-emerald-800">
                    {stroopResult ? `${stroopResult.attentionalBiasScore} / 100` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {stroopResult && (
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>{stroopResult.biasClassification}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 245+ Mission & Interpersonal Vocabulary Corpus Inspector */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Anti-Habituation Spaceflight & Interpersonal Lexicon ({SPACEFLIGHT_STROOP_LEXICON.length} Words)
              </h3>
              <p className="text-xs text-slate-600 hc-muted">
                Browse or filter the complete 245-word stimulus corpus engineered to prevent repeated trigger-word habituation across long-duration missions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search mission lexicon"
                  placeholder="Search 245 words..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              <select
                aria-label="Filter lexicon category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as StroopCategory | 'all')}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              >
                <option value="all">All Categories (245)</option>
                <option value="mission_threat">Mission Threat (65)</option>
                <option value="interpersonal_strain">Interpersonal Strain (65)</option>
                <option value="circadian_somatic">Circadian & Somatic (50)</option>
                <option value="neutral_aerospace">Neutral Aerospace (65)</option>
              </select>
            </div>
          </div>

          <div className="hc-surface bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs font-mono">
              {filteredLexicon.map((entry) => (
                <div
                  key={entry.word}
                  className="px-2.5 py-1.5 bg-white border border-slate-200/80 rounded flex items-center justify-between gap-1"
                >
                  <span className="truncate font-medium text-slate-800">{entry.word}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{entry.arousalNorm.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
