import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  Database,
  Heart,
  Sparkles,
  Sun,
  CheckCircle2
} from 'lucide-react';
import {
  BiometricTelemetry,
  DEFAULT_HARDWARE_LATENCY,
  HardwareLatencyProfile,
  INITIAL_BLANK_BIOMETRICS,
  IpsativeAssessmentResult,
  NASA_OSDR_LSDA_BASELINES,
  PvtAssessmentResult,
  PvtTrialRecord,
  StroopAssessmentResult,
  StroopInkColor,
  StroopTrialRecord,
  TriadResponseRecord,
  buildHumanCenteredCareReport,
  compensateReactionTime,
  evaluateIpsativeInventory,
  evaluatePvtSession,
  evaluateStroopSession,
  sampleIpsativeTriads,
  sampleStroopSessionWords
} from './utils/psychometrics';
import {
  IpsativeTriad,
  StroopWordEntry
} from './data/missionLexicon';

type FlowStage = 'landing' | 'pvt' | 'triads' | 'stroop' | 'report';

const PVT_DURATION_SEC = NASA_OSDR_LSDA_BASELINES.module1_pvt.requiredDurationSec; // 180s (3 minutes)
const TRIAD_TOTAL = NASA_OSDR_LSDA_BASELINES.module2_ipsative.requiredTriads; // 15 Triads
const STROOP_TOTAL = NASA_OSDR_LSDA_BASELINES.module3_stroop.requiredTrials; // 15 Stroop words
const PROGRESS_SEGMENTS = 15;

// 4 Unmistakable, High-Contrast Ink Colors that 100% match the 4 Option Pills
const STROOP_INK_PALETTE: {
  id: StroopInkColor;
  letter: string;
  label: string;
  hex: string;
}[] = [
  { id: 'CYAN', letter: 'A', label: 'Cyan', hex: '#38BDF8' },
  { id: 'EMERALD', letter: 'B', label: 'Emerald', hex: '#34D399' },
  { id: 'AMBER', letter: 'C', label: 'Amber', hex: '#FACC15' },
  { id: 'COBALT', letter: 'D', label: 'Coral Red', hex: '#FB7185' }
];

export default function App() {
  const [stage, setStage] = useState<FlowStage>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('report=1')) {
        return 'report';
      }
      if (window.location.search.includes('autostart=1')) {
        return 'pvt';
      }
    }
    return 'landing';
  });

  // Settings menu state
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Biometric state (Initialized Blank for Bluetooth wearable synchronization)
  const [biometrics, setBiometrics] = useState<BiometricTelemetry>(INITIAL_BLANK_BIOMETRICS);
  const [hrvInput, setHrvInput] = useState<string>('');
  const [hrInput, setHrInput] = useState<string>('');
  const [sleepInput, setSleepInput] = useState<string>('');
  const [remInput, setRemInput] = useState<string>('');
  const [tempInput, setTempInput] = useState<string>('');
  const [bioError, setBioError] = useState<string | null>(null);

  // Hardware & Browser Latency Profile
  const [latencyProfile, setLatencyProfile] = useState<HardwareLatencyProfile>(
    DEFAULT_HARDWARE_LATENCY
  );

  // ================= MODULE 1: 3-MINUTE PVT-D (180s) STATE =================
  const [pvtRemainingSec, setPvtRemainingSec] = useState<number>(PVT_DURATION_SEC);
  const [pvtState, setPvtState] = useState<
    'waiting_isi' | 'stimulus_active' | 'awaiting_release' | 'feedback'
  >('waiting_isi');
  const [pvtCounterMs, setPvtCounterMs] = useState<number>(0);
  const [pvtTrials, setPvtTrials] = useState<PvtTrialRecord[]>([]);
  const [pvtFeedback, setPvtFeedback] = useState<string | null>(null);

  // ================= MODULE 2: 15 IPSATIVE TRIADS STATE =================
  const [usedTriadIds, setUsedTriadIds] = useState<Set<string>>(new Set());
  const [triads, setTriads] = useState<IpsativeTriad[]>(() => sampleIpsativeTriads(TRIAD_TOTAL));
  const [triadIndex, setTriadIndex] = useState<number>(0); // 0..14 (15 Triads)
  const [mostId, setMostId] = useState<string | null>(null);
  const [leastId, setLeastId] = useState<string | null>(null);
  const [switchCount, setSwitchCount] = useState<number>(0);
  const [triadResponses, setTriadResponses] = useState<TriadResponseRecord[]>([]);

  // ================= MODULE 3: 15 SPACEFLIGHT STROOP STATE =================
  const [usedStroopWords, setUsedStroopWords] = useState<Set<string>>(new Set());
  const [stroopWords, setStroopWords] = useState<StroopWordEntry[]>(() =>
    sampleStroopSessionWords(4).slice(0, STROOP_TOTAL)
  );
  const [stroopIndex, setStroopIndex] = useState<number>(0); // 0..14 (15 Stroop trials)
  const [stroopInk, setStroopInk] = useState<StroopInkColor>('CYAN');
  const [pressedStroopInk, setPressedStroopInk] = useState<StroopInkColor | null>(null);
  const [stroopTrials, setStroopTrials] = useState<StroopTrialRecord[]>([]);

  // Final Evaluated Results
  const [pvtResult, setPvtResult] = useState<PvtAssessmentResult | null>(null);
  const [ipsativeResult, setIpsativeResult] = useState<IpsativeAssessmentResult | null>(null);
  const [stroopResult, setStroopResult] = useState<StroopAssessmentResult | null>(null);

  // Timing refs
  const isiTimeoutRef = useRef<number | null>(null);
  const triadAdvanceTimeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stimulusPaintTimeRef = useRef<number>(0);
  const pressDownTimeRef = useRef<number>(0);
  const currentIsiMsRef = useRef<number>(2200);
  const pvtStateRef = useRef(pvtState);

  const updatePvtState = (next: typeof pvtState) => {
    pvtStateRef.current = next;
    setPvtState(next);
  };

  // Calibrate display refresh rate & compositor offset on mount
  useEffect(() => {
    const deltas: number[] = [];
    let last = performance.now();
    let frames = 0;

    const measure = (now: number) => {
      const dt = now - last;
      last = now;
      if (frames > 1 && dt > 3 && dt < 50) deltas.push(dt);
      frames++;
      if (frames < 18) {
        window.requestAnimationFrame(measure);
      } else {
        const avg =
          deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 16.67;
        const hz = Math.round(1000 / avg);
        setLatencyProfile({
          estimatedRefreshHz: hz,
          frameIntervalMs: Math.round(avg * 100) / 100,
          compositorOffsetMs: Math.round((avg / 2) * 100) / 100,
          inputJitterMs: 1.6,
          calibratedAt: `${hz}Hz RenderSync`
        });
      }
    };
    window.requestAnimationFrame(measure);
  }, []);

  const clearTimers = useCallback(() => {
    if (isiTimeoutRef.current !== null) {
      window.clearTimeout(isiTimeoutRef.current);
      isiTimeoutRef.current = null;
    }
    if (triadAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(triadAdvanceTimeoutRef.current);
      triadAdvanceTimeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Schedule a single PVT-D stimulus with double-rAF renderSync
  const schedulePvtStimulus = useCallback(() => {
    clearTimers();
    setPvtCounterMs(0);
    updatePvtState('waiting_isi');

    const isi = Math.floor(1600 + Math.random() * 2400);
    currentIsiMsRef.current = isi;

    isiTimeoutRef.current = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame((paintNow) => {
          stimulusPaintTimeRef.current = paintNow;
          updatePvtState('stimulus_active');

          const tick = (now: number) => {
            if (pvtStateRef.current !== 'stimulus_active') return;
            setPvtCounterMs(Math.max(0, Math.round(now - stimulusPaintTimeRef.current)));
            rafRef.current = window.requestAnimationFrame(tick);
          };
          rafRef.current = window.requestAnimationFrame(tick);
        });
      });
    }, isi);
  }, [clearTimers]);

  // 3-Minute (180s) Countdown Timer during Module 1 (PVT-D)
  useEffect(() => {
    if (stage !== 'pvt') return;
    schedulePvtStimulus();

    const interval = window.setInterval(() => {
      setPvtRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          clearTimers();
          setStage('triads');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
      clearTimers();
    };
  }, [stage, schedulePvtStimulus, clearTimers]);

  // Synchronize renderSync onset when Triad or Stroop index changes
  useEffect(() => {
    if (stage === 'triads' || stage === 'stroop') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame((paintNow) => {
          stimulusPaintTimeRef.current = paintNow;
        });
      });
    }
  }, [stage, triadIndex, stroopIndex]);

  // ================= MODULE 1: 3-MIN PVT-D PRESS & RELEASE HANDLERS =================
  const handlePvtMouseDown = useCallback(() => {
    if (stage !== 'pvt') return;
    const now = performance.now();

    if (pvtStateRef.current === 'waiting_isi') {
      clearTimers();
      const falseRecord: PvtTrialRecord = {
        trialNumber: pvtTrials.length + 1,
        isiDelayMs: currentIsiMsRef.current,
        rawReactionMs: 0,
        compensatedReactionMs: 0,
        buttonHoldDurationMs: 0,
        isFalseStart: true,
        isLapse: false
      };
      const nextList = [...pvtTrials, falseRecord];
      setPvtTrials(nextList);
      setPvtResult(evaluatePvtSession(nextList));
      setPvtFeedback('Too Early — Wait for the counter to start');
      updatePvtState('feedback');
      isiTimeoutRef.current = window.setTimeout(() => schedulePvtStimulus(), 750);
      return;
    }

    if (pvtStateRef.current === 'stimulus_active') {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pressDownTimeRef.current = now;
      setPvtCounterMs(Math.max(1, Math.round(now - stimulusPaintTimeRef.current)));
      updatePvtState('awaiting_release');
    }
  }, [clearTimers, pvtTrials, schedulePvtStimulus, stage]);

  const handlePvtMouseUp = useCallback(() => {
    if (stage !== 'pvt' || pvtStateRef.current !== 'awaiting_release') return;
    const releaseNow = performance.now();
    const rawRt = Math.max(
      1,
      Math.round((pressDownTimeRef.current - stimulusPaintTimeRef.current) * 10) / 10
    );
    const holdMs = Math.max(
      12,
      Math.round((releaseNow - pressDownTimeRef.current) * 10) / 10
    );
    const compensatedRt = compensateReactionTime(rawRt, latencyProfile);
    const isFalseStart = rawRt < NASA_OSDR_LSDA_BASELINES.module1_pvt.falseStartThresholdMs;
    const isLapse =
      compensatedRt >= NASA_OSDR_LSDA_BASELINES.module1_pvt.pvtBLapseThresholdMs;

    const record: PvtTrialRecord = {
      trialNumber: pvtTrials.length + 1,
      isiDelayMs: currentIsiMsRef.current,
      rawReactionMs: rawRt,
      compensatedReactionMs: compensatedRt,
      buttonHoldDurationMs: holdMs,
      isFalseStart,
      isLapse
    };

    const nextList = [...pvtTrials, record];
    setPvtTrials(nextList);
    setPvtResult(evaluatePvtSession(nextList));
    setPvtFeedback(`Response #${record.trialNumber}: ${compensatedRt} ms`);
    updatePvtState('feedback');

    isiTimeoutRef.current = window.setTimeout(() => {
      schedulePvtStimulus();
    }, 650);
  }, [latencyProfile, pvtTrials, schedulePvtStimulus, stage]);

  // Keyboard Spacebar support for PVT-D
  useEffect(() => {
    if (stage !== 'pvt') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handlePvtMouseDown();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePvtMouseUp();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [stage, handlePvtMouseDown, handlePvtMouseUp]);

  // ================= MODULE 2: 15 IPSATIVE TRIADS HANDLERS =================
  const currentTriad = triads[triadIndex] || triads[0];

  const commitTriadSelection = useCallback(
    (selectedMostId: string, selectedLeastId: string, nextSwitchCount: number) => {
      if (triadAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(triadAdvanceTimeoutRef.current);
      }

      triadAdvanceTimeoutRef.current = window.setTimeout(() => {
        const hesitationDurationMs = Math.max(
          300,
          Math.round(performance.now() - stimulusPaintTimeRef.current)
        );
        const mostStmt = currentTriad.statements.find((s) => s.id === selectedMostId);
        const leastStmt = currentTriad.statements.find((s) => s.id === selectedLeastId);
        if (!mostStmt || !leastStmt) return;

        const weights = currentTriad.statements.map((s) => s.sdWeight);
        const sdSpread =
          Math.round((Math.max(...weights) - Math.min(...weights)) * 100) / 100;

        const rec: TriadResponseRecord = {
          triadId: currentTriad.id,
          mostLikeMeStatementId: mostStmt.id,
          leastLikeMeStatementId: leastStmt.id,
          mostConstruct: mostStmt.construct,
          leastConstruct: leastStmt.construct,
          hesitationDurationMs,
          selectionSwitchCount: nextSwitchCount,
          sdSpread
        };

        const nextResponses = [...triadResponses, rec];
        setTriadResponses(nextResponses);
        setIpsativeResult(evaluateIpsativeInventory(nextResponses));

        const nextUsed = new Set(usedTriadIds);
        nextUsed.add(currentTriad.id);
        setUsedTriadIds(nextUsed);

        setMostId(null);
        setLeastId(null);
        setSwitchCount(0);

        if (triadIndex + 1 < TRIAD_TOTAL) {
          setTriadIndex((idx) => idx + 1);
        } else {
          setStroopIndex(0);
          setStroopInk(STROOP_INK_PALETTE[0].id);
          setStage('stroop');
        }
      }, 240);
    },
    [currentTriad, triadIndex, triadResponses, usedTriadIds]
  );

  const handlePickMost = (stmtId: string) => {
    let nextSwitches = switchCount;
    let nextLeast = leastId;

    if (mostId && mostId !== stmtId) nextSwitches += 1;
    if (leastId === stmtId) {
      nextLeast = null;
      setLeastId(null);
      nextSwitches += 1;
    }

    setSwitchCount(nextSwitches);
    setMostId(stmtId);

    if (stmtId && nextLeast && stmtId !== nextLeast) {
      commitTriadSelection(stmtId, nextLeast, nextSwitches);
    }
  };

  const handlePickLeast = (stmtId: string) => {
    let nextSwitches = switchCount;
    let nextMost = mostId;

    if (leastId && leastId !== stmtId) nextSwitches += 1;
    if (mostId === stmtId) {
      nextMost = null;
      setMostId(null);
      nextSwitches += 1;
    }

    setSwitchCount(nextSwitches);
    setLeastId(stmtId);

    if (nextMost && stmtId && nextMost !== stmtId) {
      commitTriadSelection(nextMost, stmtId, nextSwitches);
    }
  };

  // ================= MODULE 3: 15 SPACEFLIGHT STROOP HANDLERS =================
  const currentStroopWord = stroopWords[stroopIndex] || stroopWords[0];

  const handleStroopMouseDown = (color: StroopInkColor) => {
    pressDownTimeRef.current = performance.now();
    setPressedStroopInk(color);
  };

  const handleStroopMouseUp = (color: StroopInkColor) => {
    const releaseNow = performance.now();
    const downTime =
      pressDownTimeRef.current > 0 ? pressDownTimeRef.current : releaseNow - 60;
    const rawRt = Math.max(
      95,
      Math.round((downTime - stimulusPaintTimeRef.current) * 10) / 10
    );
    const holdMs = Math.max(14, Math.round((releaseNow - downTime) * 10) / 10);
    const compensatedRt = compensateReactionTime(rawRt, latencyProfile);

    const record: StroopTrialRecord = {
      trialNumber: stroopIndex + 1,
      word: currentStroopWord.word,
      category: currentStroopWord.category,
      inkColor: stroopInk,
      selectedColor: color,
      isCorrect: color === stroopInk,
      rawReactionMs: rawRt,
      compensatedReactionMs: compensatedRt,
      keyHoldDurationMs: holdMs
    };

    const nextList = [...stroopTrials, record];
    setStroopTrials(nextList);
    setStroopResult(evaluateStroopSession(nextList));

    const nextUsed = new Set(usedStroopWords);
    nextUsed.add(currentStroopWord.word);
    setUsedStroopWords(nextUsed);
    pressDownTimeRef.current = 0;

    setTimeout(() => {
      setPressedStroopInk(null);
      if (stroopIndex + 1 < STROOP_TOTAL) {
        const nextIdx = stroopIndex + 1;
        setStroopIndex(nextIdx);
        const nextInk = STROOP_INK_PALETTE[(nextIdx * 3 + 1) % STROOP_INK_PALETTE.length].id;
        setStroopInk(nextInk);
      } else {
        setStage('report');
      }
    }, 180);
  };

  const handleResetAssessment = () => {
    clearTimers();
    setPvtRemainingSec(PVT_DURATION_SEC);
    setPvtTrials([]);
    setTriadResponses([]);
    setStroopTrials([]);
    setPvtResult(null);
    setIpsativeResult(null);
    setStroopResult(null);
    setTriadIndex(0);
    setStroopIndex(0);
    setMostId(null);
    setLeastId(null);
    setSwitchCount(0);
    setTriads(sampleIpsativeTriads(TRIAD_TOTAL, usedTriadIds));
    setStroopWords(sampleStroopSessionWords(4, usedStroopWords).slice(0, STROOP_TOTAL));
    setStroopInk(STROOP_INK_PALETTE[0].id);
    setStage('landing');
  };

  // Biometric Save (accessible inside Settings menu; blank initially for Bluetooth sync)
  const handleSaveBiometrics = (e: React.FormEvent) => {
    e.preventDefault();
    setBioError(null);
    const hrv = parseFloat(hrvInput);
    const hr = parseFloat(hrInput);
    const sleep = parseFloat(sleepInput);
    const rem = parseFloat(remInput);
    const temp = parseFloat(tempInput);

    if (
      Number.isNaN(hrv) ||
      Number.isNaN(hr) ||
      Number.isNaN(sleep) ||
      Number.isNaN(rem) ||
      Number.isNaN(temp)
    ) {
      setBioError('Enter numeric values for all 5 biometric fields.');
      return;
    }
    if (rem > sleep) {
      setBioError('REM duration cannot exceed total sleep.');
      return;
    }

    setBiometrics({
      hrvRmssdMs: Math.round(hrv * 10) / 10,
      heartRateBpm: Math.round(hr),
      sleepDurationHrs: Math.round(sleep * 10) / 10,
      remDurationHrs: Math.round(rem * 10) / 10,
      bodyTempCelsius: Math.round(temp * 100) / 100,
      circadianPhaseOffsetHrs: 0.2,
      sourceMode: 'manual_entry',
      recordedAt: 'Synced'
    });
    setShowMenu(false);
  };

  const careReport = buildHumanCenteredCareReport(
    biometrics,
    pvtResult,
    ipsativeResult,
    stroopResult
  );

  // Compute active segments (out of 15) for the Segmented Capsule Progress Bar
  const activeSegmentCount =
    stage === 'landing'
      ? 0
      : stage === 'pvt'
      ? Math.max(
          1,
          Math.min(
            PROGRESS_SEGMENTS,
            Math.ceil(((PVT_DURATION_SEC - pvtRemainingSec) / PVT_DURATION_SEC) * PROGRESS_SEGMENTS) || 1
          )
        )
      : stage === 'triads'
      ? triadIndex + 1
      : stage === 'stroop'
      ? stroopIndex + 1
      : PROGRESS_SEGMENTS;

  const pvtClockFormatted = `${String(Math.floor(pvtRemainingSec / 60)).padStart(2, '0')}:${String(
    pvtRemainingSec % 60
  ).padStart(2, '0')}`;

  const activeInkObject =
    STROOP_INK_PALETTE.find((o) => o.id === stroopInk) || STROOP_INK_PALETTE[0];

  return (
    <div className="min-h-dvh bg-[#ECECEC] text-slate-900 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 lg:p-10">
      <main className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-[#0D9488] text-white rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 md:p-9 shadow-md border-[1.5px] border-slate-900 flex flex-col justify-between min-h-[calc(100dvh-1.5rem)] sm:min-h-[640px] transition-all">
        {/* Top Header + Progress Section */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display font-bold text-base sm:text-lg md:text-xl tracking-wide text-white">
              {stage === 'landing' && 'AstraMind Assessment'}
              {stage === 'pvt' && '01 · Vigilance Task (3:00)'}
              {stage === 'triads' && '02 · Forced-Choice Triads (15)'}
              {stage === 'stroop' && '03 · Spaceflight Stroop (15)'}
              {stage === 'report' && 'Mental Health Synthesis'}
            </h1>

            <button
              type="button"
              aria-label="Accessibility & Biometric Settings"
              onClick={() => setShowMenu((v) => !v)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/60 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </button>
          </div>

          {/* 3-Module Protocol Pill Strip (Locked Sequential — Cannot Skip Modules) + 15-Segment Capsule Progress Bar */}
          <div className="mt-4 sm:mt-5 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs font-mono">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-full border text-center whitespace-nowrap pointer-events-none select-none cursor-not-allowed ${
                  stage === 'pvt'
                    ? 'bg-emerald-300 text-slate-900 border-slate-900 font-bold opacity-100'
                    : pvtResult !== null
                    ? 'bg-teal-700/80 text-emerald-200 border-emerald-300/60 font-semibold'
                    : 'bg-teal-900/50 text-teal-200/60 border-white/15 opacity-75'
                }`}
              >
                1. PVT-D (3m)
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-full border text-center whitespace-nowrap pointer-events-none select-none cursor-not-allowed ${
                  stage === 'triads'
                    ? 'bg-emerald-300 text-slate-900 border-slate-900 font-bold opacity-100'
                    : ipsativeResult !== null
                    ? 'bg-teal-700/80 text-emerald-200 border-emerald-300/60 font-semibold'
                    : 'bg-teal-900/50 text-teal-200/60 border-white/15 opacity-75'
                }`}
              >
                2. Triads (15)
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-full border text-center whitespace-nowrap pointer-events-none select-none cursor-not-allowed ${
                  stage === 'stroop'
                    ? 'bg-emerald-300 text-slate-900 border-slate-900 font-bold opacity-100'
                    : stroopResult !== null
                    ? 'bg-teal-700/80 text-emerald-200 border-emerald-300/60 font-semibold'
                    : 'bg-teal-900/50 text-teal-200/60 border-white/15 opacity-75'
                }`}
              >
                3. Stroop (15)
              </button>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-teal-50">
              <span data-testid="progress-left-label">
                {stage === 'landing' && '3m Vigilance → 15 Triads → 15 Stroop'}
                {stage === 'pvt' && `Responses Logged: ${pvtTrials.length}`}
                {stage === 'triads' && `Question ${String(triadIndex + 1).padStart(2, '0')}`}
                {stage === 'stroop' && `Word ${String(stroopIndex + 1).padStart(2, '0')}`}
                {stage === 'report' && 'Assessment Complete'}
              </span>
              <span className="font-mono text-teal-100 tabular-nums" data-testid="progress-right-label">
                {stage === 'landing' && 'Ready'}
                {stage === 'pvt' && `${pvtClockFormatted} / 03:00`}
                {stage === 'triads' && `${triadIndex + 1} of ${TRIAD_TOTAL}`}
                {stage === 'stroop' && `${stroopIndex + 1} of ${STROOP_TOTAL}`}
                {stage === 'report' && '15 of 15'}
              </span>
            </div>

            {/* Progress Indicator: Hidden on Home Page, Loading Line in Module 1, 15 Dots in Module 2 & 3 */}
            <div
              data-testid="assessment-progress-bar"
              className={
                stage === 'landing'
                  ? 'hidden'
                  : stage === 'pvt'
                  ? 'grid grid-cols-15 gap-0 w-full h-2.5 sm:h-3 rounded-full overflow-hidden bg-white/25 border border-slate-900'
                  : 'flex items-center justify-between gap-1 py-0.5'
              }
            >
              {Array.from({ length: PROGRESS_SEGMENTS }).map((_, idx) => {
                const filled = idx < activeSegmentCount;
                const isCurrent = idx === activeSegmentCount - 1;

                if (stage === 'pvt') {
                  return (
                    <div
                      key={idx}
                      className={`h-full transition-colors duration-300 ${
                        filled ? 'bg-emerald-300' : 'bg-transparent'
                      }`}
                    />
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 transition-all ${
                      isCurrent && stage !== 'report'
                        ? 'bg-emerald-300 border-[1.5px] border-slate-900 scale-110'
                        : filled
                        ? 'bg-white border border-slate-900'
                        : 'bg-white/25'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Optional Biometric Input Drawer */}
          {showMenu && (
            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-white text-slate-900 border-[1.5px] border-slate-900 text-xs sm:text-sm">
              <form
                onSubmit={handleSaveBiometrics}
                className="space-y-2.5"
                noValidate
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Biometric Telemetry (Optional)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHrvInput('64.2');
                      setHrInput('58');
                      setSleepInput('7.5');
                      setRemInput('1.8');
                      setTempInput('36.72');
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-emerald-200 border border-slate-900 font-bold text-xs cursor-pointer"
                  >
                    Fill Sample
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    aria-label="HRV ms"
                    placeholder="HRV (ms)"
                    value={hrvInput}
                    onChange={(e) => setHrvInput(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                  <input
                    type="number"
                    step="1"
                    aria-label="Heart Rate bpm"
                    placeholder="HR (bpm)"
                    value={hrInput}
                    onChange={(e) => setHrInput(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                  <input
                    type="number"
                    step="0.01"
                    aria-label="Body Temp C"
                    placeholder="Temp (°C)"
                    value={tempInput}
                    onChange={(e) => setTempInput(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                  <input
                    type="number"
                    step="0.1"
                    aria-label="Sleep hrs"
                    placeholder="Sleep (hrs)"
                    value={sleepInput}
                    onChange={(e) => setSleepInput(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                  <input
                    type="number"
                    step="0.1"
                    aria-label="REM hrs"
                    placeholder="REM (hrs)"
                    value={remInput}
                    onChange={(e) => setRemInput(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-300 border border-slate-900 font-bold cursor-pointer"
                  >
                    Save Biometrics
                  </button>
                </div>
                {bioError && <p className="text-rose-700 font-semibold text-xs">{bioError}</p>}
              </form>
            </div>
          )}
        </div>

        {/* ==================== STAGE 0: MINIMALIST LANDING PAGE ==================== */}
        {stage === 'landing' && (
          <div className="my-auto py-5 sm:py-6 space-y-5 sm:space-y-6">
            <div>
              <h2
                data-testid="landing-heading"
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight font-display"
              >
                Unified 3-Stage Spaceflight Assessment
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-teal-50/90 leading-relaxed">
                Complete all three sequential modules to evaluate sustained vigilance, behavioral profile, and attentional bias.
              </p>
            </div>

            {/* Responsive 3-Module Overview Cards (1 column on mobile, 3 columns on tablet/desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-900">
              <div className="p-4 rounded-3xl bg-emerald-300 border-2 border-slate-900 flex md:flex-col items-center md:items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold block">01 · MODULE 1</span>
                  <span className="font-display font-bold text-sm sm:text-base">
                    3-Minute Dinges PVT-D
                  </span>
                </div>
                <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-full border border-slate-900 shrink-0">
                  242.5ms Base
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-white border-2 border-slate-900 flex md:flex-col items-center md:items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-slate-500 font-bold block">
                    02 · MODULE 2
                  </span>
                  <span className="font-display font-bold text-sm sm:text-base">
                    15 Forced-Choice Triads
                  </span>
                </div>
                <span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-900 shrink-0">
                  15 Triads
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-white border-2 border-slate-900 flex md:flex-col items-center md:items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-slate-500 font-bold block">
                    03 · MODULE 3
                  </span>
                  <span className="font-display font-bold text-sm sm:text-base">
                    15 Spaceflight Stroop
                  </span>
                </div>
                <span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-900 shrink-0">
                  512.0ms Base
                </span>
              </div>
            </div>

            {/* Seeded Open NASA OSDR & LSDA Dataset Citations */}
            <div className="p-4 rounded-2xl bg-teal-900/50 border border-white/25 space-y-1.5 text-xs font-mono text-teal-50">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <Database className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>NASA OPEN SCIENCE (OSDR & LSDA) BASELINES</span>
              </div>
              <div>
                • <strong>{NASA_OSDR_LSDA_BASELINES.module1_pvt.datasetId}</strong>: ISS Reaction Self-Test Mean RT 242.5ms (±28.4ms), Lapse ≥355ms.
              </div>
              <div>
                • <strong>{NASA_OSDR_LSDA_BASELINES.module3_stroop.datasetId}</strong>: HERA / Cognition Neutral Baseline 512.0ms, Threat Bias &gt;+35ms.
              </div>
            </div>

            <button
              type="button"
              data-testid="start-assessment-btn"
              onClick={() => setStage('pvt')}
              className="w-full py-4 sm:py-4.5 px-6 rounded-full bg-emerald-300 hover:bg-emerald-200 text-slate-900 border-2 border-slate-900 font-display font-bold text-base sm:text-lg transition-colors cursor-pointer"
            >
              Start 3-Module Assessment →
            </button>
          </div>
        )}

        {/* ==================== STAGE 1: 3-MINUTE PVT-D (180s) ==================== */}
        {stage === 'pvt' && (
          <div className="my-auto py-5 sm:py-6 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-emerald-200 block mb-1">
                  MODULE 1 · PSYCHOMOTOR VIGILANCE TASK
                </span>
                <h2
                  data-testid="pvt-title"
                  className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-snug font-display"
                >
                  {pvtState === 'waiting_isi' && 'Wait for the counter...'}
                  {pvtState === 'stimulus_active' && 'Press & Release NOW!'}
                  {pvtState === 'awaiting_release' && 'Release Button NOW!'}
                  {pvtState === 'feedback' && (pvtFeedback || 'Response Logged')}
                </h2>
              </div>

              <div className="self-start sm:self-center px-4 py-1.5 rounded-full bg-emerald-300 text-slate-900 border-2 border-slate-900 font-mono text-sm font-bold tabular-nums shrink-0">
                {pvtClockFormatted}
              </div>
            </div>

            {/* Optical Millisecond Stimulus Counter Box */}
            <div
              data-testid="pvt-optical-counter"
              className={`rounded-3xl border-2 py-10 sm:py-14 px-6 text-center font-mono text-5xl sm:text-6xl md:text-7xl font-bold tabular-nums transition-colors ${
                pvtState === 'stimulus_active'
                  ? 'bg-emerald-300 text-slate-900 border-slate-900'
                  : pvtState === 'awaiting_release'
                  ? 'bg-cyan-200 text-slate-900 border-slate-900'
                  : 'bg-teal-900/50 text-white border-white/30'
              }`}
            >
              {pvtState === 'waiting_isi' ? '0000' : String(pvtCounterMs).padStart(4, '0')}
              <span className="text-lg sm:text-xl font-normal ml-1.5">ms</span>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs sm:text-sm text-teal-100 text-center">
                Press and release the button below (or Spacebar) as soon as the millisecond counter starts.
              </p>
              <button
                type="button"
                data-testid="pvt-trigger-pill"
                onMouseDown={handlePvtMouseDown}
                onMouseUp={handlePvtMouseUp}
                className={`w-full py-4 sm:py-5 px-6 rounded-full font-display font-bold text-base sm:text-lg border-2 border-slate-900 transition-transform active:scale-95 cursor-pointer select-none ${
                  pvtState === 'awaiting_release'
                    ? 'bg-cyan-300 text-slate-900'
                    : 'bg-emerald-300 hover:bg-emerald-200 text-slate-900'
                }`}
              >
                {pvtState === 'awaiting_release'
                  ? 'Release Mouse Button Now'
                  : 'Press & Release on Stimulus'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== STAGE 2: 15 IPSATIVE FORCED-CHOICE TRIADS ==================== */}
        {stage === 'triads' && (
          <div className="my-auto py-4 sm:py-5 space-y-4">
            <div>
              <span className="text-xs font-mono text-emerald-200 block mb-1">
                MODULE 2 · QUESTION {triadIndex + 1} OF {TRIAD_TOTAL}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-snug font-display">
                Select one statement MOST like you and one LEAST like you:
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentTriad.statements.map((stmt, idx) => {
                const letter = ['A', 'B', 'C'][idx];
                const isMost = mostId === stmt.id;
                const isLeast = leastId === stmt.id;
                return (
                  <div
                    key={stmt.id}
                    className={`p-4 sm:p-5 rounded-3xl border-2 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isMost
                        ? 'bg-emerald-300 text-slate-900 border-slate-900'
                        : isLeast
                        ? 'bg-cyan-200 text-slate-900 border-slate-900'
                        : 'bg-white text-slate-900 border-slate-900'
                    }`}
                  >
                    <p className="text-sm sm:text-base font-medium leading-snug">
                      <strong className="font-mono mr-2">{letter}.</strong>
                      {stmt.text}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        data-testid={`triad-most-${letter.toLowerCase()}`}
                        onClick={() => handlePickMost(stmt.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                          isMost
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 hover:bg-emerald-100 text-slate-900 border-slate-900/30'
                        }`}
                      >
                        Most Like Me
                      </button>
                      <button
                        type="button"
                        data-testid={`triad-least-${letter.toLowerCase()}`}
                        onClick={() => handlePickLeast(stmt.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                          isLeast
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 hover:bg-cyan-100 text-slate-900 border-slate-900/30'
                        }`}
                      >
                        Least Like Me
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== STAGE 3: 15 SPACEFLIGHT EMOTIONAL STROOP ==================== */}
        {stage === 'stroop' && (
          <div className="my-auto py-5 sm:py-6 space-y-5 sm:space-y-6">
            <div>
              <span className="text-xs font-mono text-emerald-200 block mb-1">
                MODULE 3 · WORD {stroopIndex + 1} OF {STROOP_TOTAL}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-snug font-display">
                Select the ink color of the mission word below:
              </h2>
            </div>

            {/* High-Contrast Dark Display Box so all 4 Ink Colors are 100% Unmistakable */}
            <div
              data-testid="stroop-word-box"
              style={{ color: activeInkObject.hex }}
              className="rounded-3xl bg-[#090D16] border-2 border-slate-900 py-9 sm:py-12 px-4 text-center font-mono text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight select-none"
            >
              {currentStroopWord.word}
            </div>

            <div>
              <p className="text-xs sm:text-sm text-teal-100 mb-3">
                Choose the option matching the font color above:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STROOP_INK_PALETTE.map((opt) => {
                  const isPressed = pressedStroopInk === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`stroop-color-${opt.letter.toLowerCase()}`}
                      onMouseDown={() => handleStroopMouseDown(opt.id)}
                      onMouseUp={() => handleStroopMouseUp(opt.id)}
                      className={`py-4 px-5 rounded-full font-display text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none border-2 border-slate-900 ${
                        isPressed
                          ? 'bg-emerald-300 text-slate-900 font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-900 font-bold'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-slate-900 shrink-0"
                        style={{ backgroundColor: opt.hex }}
                      />
                      <span>
                        {opt.letter}. {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== STAGE 4: FULL EMPATHETIC CARE & WELL-BEING REPORT ==================== */}
        {stage === 'report' && (
          <div className="my-auto py-5 sm:py-6 space-y-5 sm:space-y-6">
            {/* 1. Warm Personal Note of Care & Appreciation */}
            <div className="bg-white text-slate-900 border-2 border-slate-900 rounded-3xl p-5 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-300 border border-slate-900 text-xs font-bold">
                  <Heart className="w-3.5 h-3.5 fill-slate-900 text-slate-900" aria-hidden="true" />
                  <span>{careReport.overallStateBadge}</span>
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Personal Care & Well-Being Summary
                </span>
              </div>

              <h2
                data-testid="synthesis-complete-heading"
                className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 font-display leading-snug"
              >
                {careReport.headline}
              </h2>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {careReport.lovingLetter}
              </p>
            </div>

            {/* 2. Two Simplified Well-Being Pillars (Emotional Peace & Daily Energy) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-slate-900">
              <div className="bg-emerald-300 border-2 border-slate-900 rounded-3xl p-5 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                      Psychological Well-Being
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-900 text-xs font-bold">
                      {careReport.psychologicalPillar.badge}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold font-display">
                    {careReport.psychologicalPillar.title}
                  </h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums">
                      {careReport.psychologicalPillar.score}%
                    </span>
                    <span className="text-xs font-semibold">Inner Harmony</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden border border-slate-900">
                    <div
                      className="h-full bg-slate-900 rounded-full"
                      style={{ width: `${careReport.psychologicalPillar.score}%` }}
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-900/90 leading-relaxed pt-1">
                    {careReport.psychologicalPillar.summary}
                  </p>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Behavioral Well-Being
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 border border-slate-900 text-xs font-bold">
                      {careReport.behavioralPillar.badge}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold font-display">
                    {careReport.behavioralPillar.title}
                  </h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums">
                      {careReport.behavioralPillar.score}%
                    </span>
                    <span className="text-xs font-semibold text-slate-600">Daily Vitality</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-900">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{ width: `${careReport.behavioralPillar.score}%` }}
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-1">
                    {careReport.behavioralPillar.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Clear, Human-Centered Breakdown of the 3 Steps */}
            <div className="space-y-3.5 text-slate-900">
              {/* Step 1 Analysis: Focus & Alertness */}
              <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base sm:text-lg">
                    {careReport.step1FocusAnalysis.title}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-emerald-200 border border-slate-900 text-xs font-bold">
                    {careReport.step1FocusAnalysis.statusLabel}
                  </span>
                </div>
                <p className="text-xs font-mono font-semibold text-teal-800">
                  {careReport.step1FocusAnalysis.friendlyMetric}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {careReport.step1FocusAnalysis.narrative}
                </p>
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs sm:text-sm text-teal-950 font-medium">
                  <strong>Gentle Tip:</strong> {careReport.step1FocusAnalysis.supportiveNote}
                </div>
              </div>

              {/* Step 2 Analysis: Personal Strengths & Inner Feelings */}
              <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base sm:text-lg">
                    {careReport.step2StrengthsAnalysis.title}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-cyan-200 border border-slate-900 text-xs font-bold">
                    {careReport.step2StrengthsAnalysis.statusLabel}
                  </span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">
                  {careReport.step2StrengthsAnalysis.narrative}
                </p>

                <div className="space-y-3 pt-1">
                  {careReport.step2StrengthsAnalysis.traits.map((trait) => (
                    <div
                      key={trait.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-slate-900">
                          {trait.friendlyTitle}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-teal-900 font-semibold border border-teal-300">
                            {trait.levelLabel}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {trait.score}/100
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full"
                          style={{ width: `${trait.score}%` }}
                        />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {trait.warmAnalysis}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3 Analysis: Emotional Calm Under Pressure */}
              <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base sm:text-lg">
                    {careReport.step3EmotionalCalmAnalysis.title}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-emerald-200 border border-slate-900 text-xs font-bold">
                    {careReport.step3EmotionalCalmAnalysis.statusLabel}
                  </span>
                </div>
                <p className="text-xs font-mono font-semibold text-teal-800">
                  Color Focus Accuracy: {careReport.step3EmotionalCalmAnalysis.friendlyMetric}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {careReport.step3EmotionalCalmAnalysis.narrative}
                </p>
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs sm:text-sm text-teal-950 font-medium">
                  <strong>Gentle Tip:</strong> {careReport.step3EmotionalCalmAnalysis.supportiveNote}
                </div>
              </div>
            </div>

            {/* 4. Body, Heart & Sleep Harmony */}
            <div className="bg-teal-900/55 border border-white/30 rounded-3xl p-5 space-y-3 text-white">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                <h3 className="font-display font-bold text-base sm:text-lg">
                  {careReport.bodyAndSleepSummary.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-teal-50 leading-relaxed">
                {careReport.bodyAndSleepSummary.summary}
              </p>
              {careReport.bodyAndSleepSummary.items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {careReport.bodyAndSleepSummary.items.map((item) => (
                    <div
                      key={item.label}
                      className="p-3.5 rounded-2xl bg-white text-slate-900 border border-slate-900 space-y-1"
                    >
                      <span className="text-xs font-bold text-teal-800 block">{item.label}</span>
                      <span className="font-mono text-sm font-bold block">{item.value}</span>
                      <p className="text-xs text-slate-600 leading-snug">{item.feeling}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Loving Self-Care Steps for Today */}
            <div className="bg-emerald-300 text-slate-900 border-2 border-slate-900 rounded-3xl p-5 space-y-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-900 shrink-0" aria-hidden="true" />
                <h3 className="font-display font-bold text-base sm:text-lg">
                  Small Acts of Care for Yourself Today
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {careReport.careRecommendations.map((rec) => (
                  <div
                    key={rec.title}
                    className="bg-white border border-slate-900 rounded-2xl p-4 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 font-display font-bold text-sm text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
                      <span>{rec.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAssessment}
              className="w-full py-4 rounded-full bg-white hover:bg-teal-50 text-slate-900 border-2 border-slate-900 font-display font-bold text-sm sm:text-base transition-colors cursor-pointer"
            >
              Return to Landing Page
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
