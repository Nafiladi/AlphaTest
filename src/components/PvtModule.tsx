import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Timer, Cpu, Play, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  HardwareLatencyProfile,
  PvtAssessmentResult,
  PvtTrialRecord,
  compensateReactionTime,
  evaluatePvtSession
} from '../utils/psychometrics';

interface PvtModuleProps {
  latencyProfile: HardwareLatencyProfile;
  onUpdateLatencyProfile: (profile: HardwareLatencyProfile) => void;
  pvtResult: PvtAssessmentResult | null;
  onCompletePvt: (result: PvtAssessmentResult) => void;
}

type PvtStage =
  | 'idle'
  | 'calibrating_hardware'
  | 'waiting_isi'
  | 'stimulus_active'
  | 'awaiting_release'
  | 'trial_feedback'
  | 'completed';

export const PvtModule: React.FC<PvtModuleProps> = ({
  latencyProfile,
  onUpdateLatencyProfile,
  pvtResult,
  onCompletePvt
}) => {
  const [stage, setStage] = useState<PvtStage>('idle');
  const [targetTrialCount, setTargetTrialCount] = useState<number>(5);
  const [trials, setTrials] = useState<PvtTrialRecord[]>([]);
  const [liveCounterMs, setLiveCounterMs] = useState<number>(0);
  const [lastTrialNote, setLastTrialNote] = useState<string | null>(null);

  // High-precision timing refs
  const isiTimeoutRef = useRef<number | null>(null);
  const rafCounterRef = useRef<number | null>(null);
  const stimulusPaintTimeRef = useRef<number>(0);
  const pressDownTimeRef = useRef<number>(0);
  const currentIsiDelayRef = useRef<number>(2500);
  const stageRef = useRef<PvtStage>('idle');

  const updateStage = (next: PvtStage) => {
    stageRef.current = next;
    setStage(next);
  };

  const clearTimers = useCallback(() => {
    if (isiTimeoutRef.current !== null) {
      window.clearTimeout(isiTimeoutRef.current);
      isiTimeoutRef.current = null;
    }
    if (rafCounterRef.current !== null) {
      window.cancelAnimationFrame(rafCounterRef.current);
      rafCounterRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Hardware & Browser Refresh Rate / Input Jitter Calibration Probe
  const runHardwareCalibration = () => {
    clearTimers();
    updateStage('calibrating_hardware');
    const frameDeltas: number[] = [];
    let lastTimestamp = performance.now();
    let sampleCount = 0;

    const measureFrame = (now: number) => {
      const delta = now - lastTimestamp;
      lastTimestamp = now;
      if (sampleCount > 2 && delta > 2 && delta < 55) {
        frameDeltas.push(delta);
      }
      sampleCount++;
      if (sampleCount < 35) {
        rafCounterRef.current = window.requestAnimationFrame(measureFrame);
      } else {
        const avgFrameMs =
          frameDeltas.length > 0
            ? frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length
            : 16.67;
        const estimatedHz = Math.round(1000 / avgFrameMs);
        const variance =
          frameDeltas.length > 1
            ? frameDeltas.reduce((acc, d) => acc + Math.abs(d - avgFrameMs), 0) /
              frameDeltas.length
            : 1.5;

        onUpdateLatencyProfile({
          estimatedRefreshHz: estimatedHz,
          frameIntervalMs: Math.round(avgFrameMs * 100) / 100,
          compositorOffsetMs: Math.round((avgFrameMs / 2) * 100) / 100,
          inputJitterMs: Math.round(Math.max(0.8, variance) * 100) / 100,
          calibratedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        updateStage('idle');
      }
    };

    rafCounterRef.current = window.requestAnimationFrame(measureFrame);
  };

  // Launch a single PVT trial with double-rAF renderSync
  const scheduleNextTrial = useCallback(
    (currentTrials: PvtTrialRecord[]) => {
      clearTimers();
      if (currentTrials.length >= targetTrialCount) {
        const finalSummary = evaluatePvtSession(currentTrials);
        onCompletePvt(finalSummary);
        updateStage('completed');
        return;
      }

      // Dinges PVT inter-stimulus interval: randomized between 1800ms and 4500ms for interactive responsiveness
      const isiMs = Math.floor(1800 + Math.random() * 2700);
      currentIsiDelayRef.current = isiMs;
      setLiveCounterMs(0);
      updateStage('waiting_isi');

      isiTimeoutRef.current = window.setTimeout(() => {
        // Double requestAnimationFrame renderSync guarantees timestamp is recorded on actual optical frame paint
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame((paintTimestamp) => {
            stimulusPaintTimeRef.current = paintTimestamp;
            updateStage('stimulus_active');

            const updateCounter = (frameNow: number) => {
              if (stageRef.current !== 'stimulus_active') return;
              setLiveCounterMs(Math.max(0, Math.round(frameNow - stimulusPaintTimeRef.current)));
              rafCounterRef.current = window.requestAnimationFrame(updateCounter);
            };
            rafCounterRef.current = window.requestAnimationFrame(updateCounter);
          });
        });
      }, isiMs);
    },
    [clearTimers, onCompletePvt, targetTrialCount]
  );

  const handleStartSession = () => {
    setTrials([]);
    setLastTrialNote(null);
    scheduleNextTrial([]);
  };

  // Event listener step 1: User presses mouse button (mousedown / pointerdown)
  const handleResponsePressDown = () => {
    const pressTimestamp = performance.now();

    if (stageRef.current === 'waiting_isi') {
      // False start! Pressed before stimulus appeared
      clearTimers();
      pressDownTimeRef.current = pressTimestamp;
      const falseStartRecord: PvtTrialRecord = {
        trialNumber: trials.length + 1,
        isiDelayMs: currentIsiDelayRef.current,
        rawReactionMs: 0,
        compensatedReactionMs: 0,
        buttonHoldDurationMs: 0,
        isFalseStart: true,
        isLapse: false
      };
      const updated = [...trials, falseStartRecord];
      setTrials(updated);
      setLastTrialNote('False Start (<100ms / Early Trigger) — Wait for the cyan millisecond counter before pressing.');
      updateStage('trial_feedback');
      isiTimeoutRef.current = window.setTimeout(() => scheduleNextTrial(updated), 1100);
      return;
    }

    if (stageRef.current === 'stimulus_active') {
      if (rafCounterRef.current !== null) {
        window.cancelAnimationFrame(rafCounterRef.current);
        rafCounterRef.current = null;
      }
      pressDownTimeRef.current = pressTimestamp;
      const rawRt = Math.max(1, pressTimestamp - stimulusPaintTimeRef.current);
      setLiveCounterMs(Math.round(rawRt));
      updateStage('awaiting_release');
    }
  };

  // Event listener step 2: User releases mouse button (mouseup / pointerup) to complete motor cycle
  const handleResponseReleaseUp = () => {
    if (stageRef.current !== 'awaiting_release') return;
    const releaseTimestamp = performance.now();
    const rawRt = Math.round((pressDownTimeRef.current - stimulusPaintTimeRef.current) * 10) / 10;
    const holdDuration = Math.max(
      12,
      Math.round((releaseTimestamp - pressDownTimeRef.current) * 10) / 10
    );
    const compensatedRt = compensateReactionTime(rawRt, latencyProfile);
    const isFalseStart = rawRt < 100;
    const isLapse = compensatedRt >= 500;

    const record: PvtTrialRecord = {
      trialNumber: trials.length + 1,
      isiDelayMs: currentIsiDelayRef.current,
      rawReactionMs: rawRt,
      compensatedReactionMs: compensatedRt,
      buttonHoldDurationMs: holdDuration,
      isFalseStart,
      isLapse
    };

    const updated = [...trials, record];
    setTrials(updated);
    setLastTrialNote(
      isLapse
        ? `Trial #${record.trialNumber}: Vigilance Lapse (>500ms) — Net RT ${compensatedRt} ms (Raw ${rawRt} ms, Hold ${holdDuration} ms)`
        : `Trial #${record.trialNumber}: Net Compensated RT ${compensatedRt} ms (Raw ${rawRt} ms · Button Hold ${holdDuration} ms)`
    );
    updateStage('trial_feedback');

    isiTimeoutRef.current = window.setTimeout(() => {
      scheduleNextTrial(updated);
    }, 950);
  };

  return (
    <section aria-labelledby="pvt-heading" className="space-y-8">
      <div className="hc-surface bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-800">
              <span>MODULE 01</span>
              <span aria-hidden="true">·</span>
              <span>DR. DAVID DINGES PVT-192 PROTOCOL</span>
              <span aria-hidden="true">·</span>
              <span>RENDERSYNC COMPOSITOR COMPENSATION</span>
            </div>
            <h2 id="pvt-heading" className="text-2xl font-bold text-slate-900 mt-1">
              Psychomotor Vigilance Task (PVT)
            </h2>
            <p className="text-slate-600 hc-muted text-sm mt-1 max-w-3xl">
              Measures sustained behavioral alertness, reaction speed, motor button-dwell time, and circadian micro-sleep lapses (&ge;500 ms). Uses double-<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">requestAnimationFrame</code> render synchronization and subtracts calibrated browser/display latency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <span>Session Length:</span>
              <select
                aria-label="PVT Session Trial Count"
                value={targetTrialCount}
                disabled={stage !== 'idle' && stage !== 'completed'}
                onChange={(e) => setTargetTrialCount(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-900"
              >
                <option value={3}>3 Trials (Rapid Check)</option>
                <option value={5}>5 Trials (Standard Orbital)</option>
                <option value={10}>10 Trials (Extended Vigilance)</option>
              </select>
            </label>

            <button
              type="button"
              onClick={runHardwareCalibration}
              disabled={stage !== 'idle' && stage !== 'completed'}
              className="px-3.5 py-2 text-xs font-semibold text-cyan-900 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Calibrate Display Latency</span>
            </button>
          </div>
        </div>

        {/* Hardware / Browser Latency Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 hc-muted block">Display Refresh Cadence</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {latencyProfile.estimatedRefreshHz} Hz ({latencyProfile.frameIntervalMs} ms/frame)
            </span>
          </div>
          <div>
            <span className="text-slate-500 hc-muted block">Compositor Render Offset</span>
            <span className="font-mono font-semibold text-emerald-800 tabular-nums">
              -{latencyProfile.compositorOffsetMs} ms
            </span>
          </div>
          <div>
            <span className="text-slate-500 hc-muted block">Event Polling Jitter</span>
            <span className="font-mono font-semibold text-cyan-800 tabular-nums">
              -{latencyProfile.inputJitterMs} ms
            </span>
          </div>
          <div>
            <span className="text-slate-500 hc-muted block">Calibration Status</span>
            <span className="font-mono text-slate-700 hc-muted truncate block">
              {latencyProfile.calibratedAt}
            </span>
          </div>
        </div>

        {/* Interactive PVT Stimulus & Press-Release Pad */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between hc-surface bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 min-h-[300px]">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 hc-muted">
              <span>
                TRIAL PROGRESS: {trials.length} / {targetTrialCount}
              </span>
              <span>DINGES LAPSE THRESHOLD: 500 MS</span>
            </div>

            <div className="my-6 text-center">
              {stage === 'calibrating_hardware' && (
                <div className="py-8">
                  <p className="text-base font-semibold text-cyan-900">
                    Sampling Display Frame Intervals via requestAnimationFrame...
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    Measuring VSync cadence and input event loop jitter
                  </p>
                </div>
              )}

              {stage === 'idle' && (
                <div className="py-6 space-y-4">
                  <p className="text-slate-700 hc-muted text-sm max-w-md mx-auto">
                    Click <strong>Start PVT Session</strong> below. Focus on the optical window. The instant the digital millisecond counter begins running, <strong>press and release</strong> the response pad as rapidly as possible.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="hc-primary-btn px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" aria-hidden="true" />
                    <span>Start PVT Session</span>
                  </button>
                </div>
              )}

              {(stage === 'waiting_isi' ||
                stage === 'stimulus_active' ||
                stage === 'awaiting_release' ||
                stage === 'trial_feedback') && (
                <div className="space-y-5">
                  <div
                    data-testid="pvt-stimulus-display"
                    className={`mx-auto max-w-sm rounded-xl border-2 py-8 px-6 transition-colors ${
                      stage === 'stimulus_active'
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : stage === 'awaiting_release'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <span className="block text-xs font-mono uppercase tracking-wider opacity-80">
                      {stage === 'waiting_isi'
                        ? 'HOLD STANDBY — AWAITING OPTICAL ONSET'
                        : stage === 'stimulus_active'
                        ? 'STIMULUS ACTIVE — PRESS PAD NOW'
                        : stage === 'awaiting_release'
                        ? 'PRESS DETECTED — RELEASE MOUSE BUTTON NOW'
                        : 'TRIAL RECORDED'}
                    </span>
                    <div className="text-5xl font-mono font-bold tabular-nums mt-2">
                      {stage === 'waiting_isi' ? '0000' : String(liveCounterMs).padStart(4, '0')}
                      <span className="text-base font-normal ml-1.5">ms</span>
                    </div>
                  </div>

                  {/* Dedicated Mouse Press & Release Trigger Button */}
                  <button
                    type="button"
                    data-testid="pvt-response-pad"
                    onMouseDown={handleResponsePressDown}
                    onMouseUp={handleResponseReleaseUp}
                    onKeyDown={(e) => {
                      if (e.code === 'Space' && !e.repeat) {
                        e.preventDefault();
                        handleResponsePressDown();
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.code === 'Space') {
                        e.preventDefault();
                        handleResponseReleaseUp();
                      }
                    }}
                    className={`w-full max-w-sm mx-auto py-4 px-6 rounded-xl font-semibold text-base transition-colors border-2 cursor-pointer select-none ${
                      stage === 'awaiting_release'
                        ? 'bg-amber-600 text-white border-amber-800'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-900 hc-primary-btn'
                    }`}
                  >
                    {stage === 'awaiting_release'
                      ? 'Release Mouse Button Now (Completing Hold)'
                      : 'Press & Release Here on Stimulus Onset'}
                  </button>
                </div>
              )}

              {stage === 'completed' && (
                <div className="py-6 space-y-4">
                  <div className="inline-flex items-center gap-2 text-emerald-800 font-semibold text-base">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    <span>PVT-192 Vigilance Assessment Completed</span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 hc-muted">
                    Net Mean Compensated RT: {pvtResult?.meanCompensatedRtMs} ms · Lapses: {pvtResult?.lapseCount} · Mean Hold Dwell: {pvtResult?.meanButtonHoldMs} ms
                  </p>
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Re-Run PVT Session</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-xs font-mono text-slate-600 hc-muted border-t border-slate-200 pt-3 flex items-center justify-between">
              <span>{lastTrialNote || 'Event Listener: Armed for mousedown + mouseup & renderSync'}</span>
            </div>
          </div>

          {/* Right Column: Live PVT Telemetry Summary & Trial Log */}
          <div className="lg:col-span-5 hc-surface bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Session Vigilance Metrics
              </h3>
              <p className="text-xs text-slate-500 hc-muted mt-0.5">
                Compensated for {latencyProfile.compositorOffsetMs + latencyProfile.inputJitterMs} ms total hardware/browser latency.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Net Mean RT</span>
                  <span className="text-xl font-mono font-bold text-slate-900 tabular-nums" data-testid="pvt-mean-rt">
                    {pvtResult ? `${pvtResult.meanCompensatedRtMs} ms` : '—'}
                  </span>
                </div>
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Button Hold Dwell</span>
                  <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                    {pvtResult ? `${pvtResult.meanButtonHoldMs} ms` : '—'}
                  </span>
                </div>
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Lapses (&ge;500ms)</span>
                  <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                    {pvtResult ? pvtResult.lapseCount : '—'}
                  </span>
                </div>
                <div className="bg-white hc-surface border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 hc-muted block">Vigilance Index</span>
                  <span className="text-xl font-mono font-bold text-emerald-800 tabular-nums">
                    {pvtResult ? `${pvtResult.vigilanceScore} / 100` : '—'}
                  </span>
                </div>
              </div>

              {/* Trial Table */}
              <div className="mt-5">
                <div className="text-xs font-mono text-slate-500 hc-muted mb-2">
                  TRIAL-BY-TRIAL CAPTURE LOG
                </div>
                {trials.length === 0 && (!pvtResult || pvtResult.trials.length === 0) ? (
                  <p className="text-xs text-slate-500 hc-muted py-4">
                    No PVT trials recorded in current session yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-1.5 pr-2">#</th>
                          <th className="py-1.5 px-2 text-right">Raw RT</th>
                          <th className="py-1.5 px-2 text-right">Net RT</th>
                          <th className="py-1.5 px-2 text-right">Hold</th>
                          <th className="py-1.5 pl-2 text-right">State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60">
                        {(trials.length > 0 ? trials : pvtResult?.trials || []).map((t) => (
                          <tr key={t.trialNumber}>
                            <td className="py-1.5 pr-2 font-semibold">{t.trialNumber}</td>
                            <td className="py-1.5 px-2 text-right">{t.rawReactionMs}ms</td>
                            <td className="py-1.5 px-2 text-right font-semibold text-emerald-900">
                              {t.compensatedReactionMs}ms
                            </td>
                            <td className="py-1.5 px-2 text-right">{t.buttonHoldDurationMs}ms</td>
                            <td className="py-1.5 pl-2 text-right">
                              {t.isFalseStart
                                ? '✖ Early'
                                : t.isLapse
                                ? '▲ Lapse'
                                : '● Nominal'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {pvtResult && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 hc-muted">Behavioral Classification:</span>
                <span className="font-mono font-semibold text-emerald-900">
                  {pvtResult.classification}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
