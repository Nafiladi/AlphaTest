import React, { useState } from 'react';
import { Activity, Bluetooth, Moon, Thermometer, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { BiometricTelemetry, INITIAL_BLANK_BIOMETRICS } from '../utils/psychometrics';

interface BiometricTelemetryPanelProps {
  biometrics: BiometricTelemetry;
  onUpdateBiometrics: (next: BiometricTelemetry) => void;
}

export const BiometricTelemetryPanel: React.FC<BiometricTelemetryPanelProps> = ({
  biometrics,
  onUpdateBiometrics
}) => {
  const [hrvInput, setHrvInput] = useState<string>(
    biometrics.hrvRmssdMs !== null ? String(biometrics.hrvRmssdMs) : ''
  );
  const [hrInput, setHrInput] = useState<string>(
    biometrics.heartRateBpm !== null ? String(biometrics.heartRateBpm) : ''
  );
  const [sleepInput, setSleepInput] = useState<string>(
    biometrics.sleepDurationHrs !== null ? String(biometrics.sleepDurationHrs) : ''
  );
  const [remInput, setRemInput] = useState<string>(
    biometrics.remDurationHrs !== null ? String(biometrics.remDurationHrs) : ''
  );
  const [tempInput, setTempInput] = useState<string>(
    biometrics.bodyTempCelsius !== null ? String(biometrics.bodyTempCelsius) : ''
  );
  const [phaseInput, setPhaseInput] = useState<string>(
    biometrics.circadianPhaseOffsetHrs !== null ? String(biometrics.circadianPhaseOffsetHrs) : ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const syncLocalInputs = (next: BiometricTelemetry) => {
    setHrvInput(next.hrvRmssdMs !== null ? String(next.hrvRmssdMs) : '');
    setHrInput(next.heartRateBpm !== null ? String(next.heartRateBpm) : '');
    setSleepInput(next.sleepDurationHrs !== null ? String(next.sleepDurationHrs) : '');
    setRemInput(next.remDurationHrs !== null ? String(next.remDurationHrs) : '');
    setTempInput(next.bodyTempCelsius !== null ? String(next.bodyTempCelsius) : '');
    setPhaseInput(next.circadianPhaseOffsetHrs !== null ? String(next.circadianPhaseOffsetHrs) : '');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setStatusNotice(null);

    const hrv = parseFloat(hrvInput);
    const hr = parseFloat(hrInput);
    const sleep = parseFloat(sleepInput);
    const rem = parseFloat(remInput);
    const temp = parseFloat(tempInput);
    const phase = phaseInput.trim() === '' ? 0 : parseFloat(phaseInput);

    if (
      Number.isNaN(hrv) ||
      Number.isNaN(hr) ||
      Number.isNaN(sleep) ||
      Number.isNaN(rem) ||
      Number.isNaN(temp)
    ) {
      setValidationError(
        'Please enter numeric values for HRV, Heart Rate, Sleep Duration, REM Duration, and Core Body Temperature before committing telemetry.'
      );
      return;
    }

    if (hrv < 8 || hrv > 180) {
      setValidationError('Heart Rate Variability (RMSSD) must be between 8 ms and 180 ms.');
      return;
    }
    if (hr < 35 || hr > 195) {
      setValidationError('Resting Heart Rate must be between 35 bpm and 195 bpm.');
      return;
    }
    if (sleep < 0.5 || sleep > 16) {
      setValidationError('Sleep Duration must be between 0.5 hours and 16.0 hours.');
      return;
    }
    if (rem < 0 || rem > sleep) {
      setValidationError('REM Sleep Duration must be between 0 hours and Total Sleep Duration.');
      return;
    }
    if (temp < 34.5 || temp > 40.5) {
      setValidationError('Core Body Temperature must be between 34.5 °C and 40.5 °C.');
      return;
    }

    const updated: BiometricTelemetry = {
      hrvRmssdMs: Math.round(hrv * 10) / 10,
      heartRateBpm: Math.round(hr),
      sleepDurationHrs: Math.round(sleep * 10) / 10,
      remDurationHrs: Math.round(rem * 10) / 10,
      bodyTempCelsius: Math.round(temp * 100) / 100,
      circadianPhaseOffsetHrs: Math.round(phase * 10) / 10,
      sourceMode: 'manual_entry',
      recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    onUpdateBiometrics(updated);
    setStatusNotice('Biometric baseline committed and synchronized with Psychological & Behavioral Mental Health synthesis.');
  };

  const applyPreset = (presetType: 'nominal' | 'stressed' | 'blank') => {
    setValidationError(null);
    if (presetType === 'blank') {
      syncLocalInputs(INITIAL_BLANK_BIOMETRICS);
      onUpdateBiometrics(INITIAL_BLANK_BIOMETRICS);
      setStatusNotice('Biometric channels reset to initial blank state awaiting Bluetooth GATT wearable synchronization.');
      return;
    }

    const preset: BiometricTelemetry =
      presetType === 'nominal'
        ? {
            hrvRmssdMs: 64.2,
            heartRateBpm: 58,
            sleepDurationHrs: 7.6,
            remDurationHrs: 1.8,
            bodyTempCelsius: 36.72,
            circadianPhaseOffsetHrs: 0.3,
            sourceMode: 'bluetooth_simulated',
            recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        : {
            hrvRmssdMs: 31.5,
            heartRateBpm: 86,
            sleepDurationHrs: 5.1,
            remDurationHrs: 0.8,
            bodyTempCelsius: 37.28,
            circadianPhaseOffsetHrs: 2.4,
            sourceMode: 'bluetooth_simulated',
            recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };

    syncLocalInputs(preset);
    onUpdateBiometrics(preset);
    setStatusNotice(
      presetType === 'nominal'
        ? 'Loaded Nominal Orbital Calibration packet into biometric feedback channels.'
        : 'Loaded Circadian-Drifted High-Stress EVA packet to demonstrate autonomic & REM concordance alerts.'
    );
  };

  return (
    <section aria-labelledby="biometric-heading" className="space-y-8">
      <div className="hc-surface bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-800">
              <span>BIOMETRIC TELEMETRY INTERFACE</span>
              <span aria-hidden="true">·</span>
              <span>BLE GATT RESERVATION: STANDBY</span>
            </div>
            <h2 id="biometric-heading" className="text-2xl font-bold text-slate-900 mt-1">
              Physiological Feedback & Circadian Biometrics
            </h2>
            <p className="text-slate-600 hc-muted text-sm mt-1 max-w-3xl">
              All biometric channels initialize blank by design so external Bluetooth Low Energy (BLE) astro-wearables and core-temperature ingestible sensors can bind cleanly without mock data contamination. Enter manual flight-surgeon calibration readings below or load a reference telemetry packet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => applyPreset('nominal')}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Simulate Nominal BLE Packet
            </button>
            <button
              type="button"
              onClick={() => applyPreset('stressed')}
              className="px-3.5 py-2 text-xs font-semibold text-cyan-900 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Simulate Circadian Strain Packet
            </button>
            <button
              type="button"
              onClick={() => applyPreset('blank')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset to Blank</span>
            </button>
          </div>
        </div>

        {/* Live Current Biometric Readout Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-slate-200">
          <div className="hc-surface bg-[#F8FAFC] border border-slate-200/80 rounded-lg p-5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 hc-muted">
              <span>01. AUTONOMIC STRESS & ANXIETY</span>
              <Activity className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-500 hc-muted block">HRV (RMSSD)</span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums" data-testid="readout-hrv">
                  {biometrics.hrvRmssdMs !== null ? `${biometrics.hrvRmssdMs.toFixed(1)}` : '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1">ms</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 hc-muted block">Heart Rate</span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums" data-testid="readout-hr">
                  {biometrics.heartRateBpm !== null ? `${biometrics.heartRateBpm}` : '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1">bpm</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 hc-muted mt-3">
              Tracks vagal withdrawal and sympathetic arousal linked to acute operational anxiety.
            </p>
          </div>

          <div className="hc-surface bg-[#F8FAFC] border border-slate-200/80 rounded-lg p-5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 hc-muted">
              <span>02. COGNITIVE & EMOTIONAL SLEEP</span>
              <Moon className="w-4 h-4 text-cyan-700" aria-hidden="true" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-500 hc-muted block">Sleep Duration</span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums" data-testid="readout-sleep">
                  {biometrics.sleepDurationHrs !== null ? `${biometrics.sleepDurationHrs.toFixed(1)}` : '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1">hrs</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 hc-muted block">REM Duration</span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums" data-testid="readout-rem">
                  {biometrics.remDurationHrs !== null ? `${biometrics.remDurationHrs.toFixed(1)}` : '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1">hrs</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 hc-muted mt-3">
              Detects REM architecture fragmentation driving affective volatility and memory lapses.
            </p>
          </div>

          <div className="hc-surface bg-[#F8FAFC] border border-slate-200/80 rounded-lg p-5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 hc-muted">
              <span>03. CIRCADIAN THERMOREGULATION</span>
              <Thermometer className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-500 hc-muted block">Core Body Temp</span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums" data-testid="readout-temp">
                  {biometrics.bodyTempCelsius !== null ? `${biometrics.bodyTempCelsius.toFixed(2)}` : '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1">°C</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 hc-muted block">Phase Drift</span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {biometrics.circadianPhaseOffsetHrs !== null
                    ? `${biometrics.circadianPhaseOffsetHrs >= 0 ? '+' : ''}${biometrics.circadianPhaseOffsetHrs.toFixed(1)}`
                    : '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1">h</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 hc-muted mt-3">
              Monitors 90-minute orbital sunrise/sunset free-running circadian desynchrony.
            </p>
          </div>
        </div>

        {/* Manual Calibration Entry Form */}
        <form onSubmit={handleManualSubmit} className="pt-6 space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label htmlFor="input-hrv" className="block text-sm font-semibold text-slate-800">
                Heart Rate Variability (RMSSD ms)
              </label>
              <span className="block text-xs text-slate-500 hc-muted mb-1.5">
                Orbital nominal range: 45.0 – 85.0 ms
              </span>
              <input
                id="input-hrv"
                type="number"
                step="0.1"
                placeholder="Blank (e.g. 62.5)"
                value={hrvInput}
                onChange={(e) => setHrvInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <label htmlFor="input-hr" className="block text-sm font-semibold text-slate-800">
                Resting Heart Rate (bpm)
              </label>
              <span className="block text-xs text-slate-500 hc-muted mb-1.5">
                Orbital nominal range: 52 – 74 bpm
              </span>
              <input
                id="input-hr"
                type="number"
                step="1"
                placeholder="Blank (e.g. 60)"
                value={hrInput}
                onChange={(e) => setHrInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <label htmlFor="input-sleep" className="block text-sm font-semibold text-slate-800">
                Total Sleep Duration (hours)
              </label>
              <span className="block text-xs text-slate-500 hc-muted mb-1.5">
                Orbital target: 7.0 – 8.5 hrs / 24h cycle
              </span>
              <input
                id="input-sleep"
                type="number"
                step="0.1"
                placeholder="Blank (e.g. 7.4)"
                value={sleepInput}
                onChange={(e) => setSleepInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <label htmlFor="input-rem" className="block text-sm font-semibold text-slate-800">
                REM Sleep Duration (hours)
              </label>
              <span className="block text-xs text-slate-500 hc-muted mb-1.5">
                Orbital target: 1.4 – 2.2 hrs (20–25% of sleep)
              </span>
              <input
                id="input-rem"
                type="number"
                step="0.1"
                placeholder="Blank (e.g. 1.7)"
                value={remInput}
                onChange={(e) => setRemInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <label htmlFor="input-temp" className="block text-sm font-semibold text-slate-800">
                Core Body Temperature (°C)
              </label>
              <span className="block text-xs text-slate-500 hc-muted mb-1.5">
                Circadian mesor: 36.50 – 37.05 °C
              </span>
              <input
                id="input-temp"
                type="number"
                step="0.01"
                placeholder="Blank (e.g. 36.75)"
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <label htmlFor="input-phase" className="block text-sm font-semibold text-slate-800">
                Circadian Phase Drift Offset (hours)
              </label>
              <span className="block text-xs text-slate-500 hc-muted mb-1.5">
                Melatonin acrophase shift (0.0 = entrained)
              </span>
              <input
                id="input-phase"
                type="number"
                step="0.1"
                placeholder="Optional (e.g. 0.4)"
                value={phaseInput}
                onChange={(e) => setPhaseInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}

          {statusNotice && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{statusNotice}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 hc-muted">
              <Bluetooth className="w-4 h-4 text-cyan-700 shrink-0" aria-hidden="true" />
              <span>
                WebBluetooth GATT UUIDs (`0x180D` Heart Rate, `0x1809` Health Thermometer) reserved for Phase-2 hardware pairing.
              </span>
            </div>

            <button
              type="submit"
              className="hc-primary-btn px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Commit Biometric Telemetry
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
