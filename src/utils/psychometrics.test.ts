import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HARDWARE_LATENCY,
  INITIAL_BLANK_BIOMETRICS,
  NASA_OSDR_LSDA_BASELINES,
  compensateReactionTime,
  evaluateIpsativeInventory,
  evaluatePvtSession,
  evaluateStroopSession,
  getLexiconStats,
  sampleIpsativeTriads,
  sampleStroopSessionWords,
  synthesizeMentalHealthReport
} from './psychometrics';
import { IPSATIVE_TRIAD_BANK } from '../data/missionLexicon';

test('initial biometric state is blank for future Bluetooth wearable integration', () => {
  assert.equal(INITIAL_BLANK_BIOMETRICS.hrvRmssdMs, null);
  assert.equal(INITIAL_BLANK_BIOMETRICS.heartRateBpm, null);
  assert.equal(INITIAL_BLANK_BIOMETRICS.sleepDurationHrs, null);
  assert.equal(INITIAL_BLANK_BIOMETRICS.remDurationHrs, null);
  assert.equal(INITIAL_BLANK_BIOMETRICS.bodyTempCelsius, null);
  assert.equal(INITIAL_BLANK_BIOMETRICS.sourceMode, 'blank');

  const emptySynthesis = synthesizeMentalHealthReport(INITIAL_BLANK_BIOMETRICS, null, null, null);
  assert.equal(emptySynthesis.hasBiometrics, false);
  assert.equal(emptySynthesis.psychologicalScore, null);
  assert.equal(emptySynthesis.behavioralScore, null);
});

test('NASA OSDR and LSDA baselines are explicitly seeded for 3-min PVT-D, 15 Triads, and 15 Stroop', () => {
  assert.equal(NASA_OSDR_LSDA_BASELINES.module1_pvt.requiredDurationSec, 180);
  assert.equal(NASA_OSDR_LSDA_BASELINES.module1_pvt.nominalMeanRtMs, 242.5);
  assert.equal(NASA_OSDR_LSDA_BASELINES.module1_pvt.pvtBLapseThresholdMs, 355.0);
  assert.equal(NASA_OSDR_LSDA_BASELINES.module2_ipsative.requiredTriads, 15);
  assert.equal(NASA_OSDR_LSDA_BASELINES.module3_stroop.requiredTrials, 15);
  assert.equal(NASA_OSDR_LSDA_BASELINES.module3_stroop.neutralBaselineRtMs, 512.0);
});

test('mission lexicon and triad bank contain over 200+ unique spaceflight and interpersonal items without duplicates', () => {
  const stats = getLexiconStats();
  assert.ok(stats.stroopWordCount >= 240);
  assert.ok(stats.triadStatementCount >= 90);
  assert.ok(stats.totalUniqueMissionItems >= 330);

  for (const triad of IPSATIVE_TRIAD_BANK) {
    const constructs = new Set(triad.statements.map((s) => s.construct));
    assert.equal(constructs.size, 3);
    const weights = triad.statements.map((s) => s.sdWeight);
    const spread = Math.max(...weights) - Math.min(...weights);
    assert.ok(spread <= 0.1);
  }

  const sampledWords = sampleStroopSessionWords(5);
  const uniqueSampled = new Set(sampledWords.map((w) => w.word));
  assert.equal(sampledWords.length, 20);
  assert.equal(uniqueSampled.size, 20);

  const sampledTriads = sampleIpsativeTriads(15);
  const uniqueTriads = new Set(sampledTriads.map((t) => t.id));
  assert.equal(sampledTriads.length, 15);
  assert.equal(uniqueTriads.size, 15);
});

test('Dinges PVT hardware latency compensation and NASA LSDA lapse detection work accurately', () => {
  const compensated = compensateReactionTime(260, DEFAULT_HARDWARE_LATENCY);
  assert.equal(compensated, 249.9);

  const pvtResult = evaluatePvtSession([
    {
      trialNumber: 1,
      isiDelayMs: 3200,
      rawReactionMs: 245,
      compensatedReactionMs: 234.9,
      buttonHoldDurationMs: 68.4,
      isFalseStart: false,
      isLapse: false
    },
    {
      trialNumber: 2,
      isiDelayMs: 5100,
      rawReactionMs: 375,
      compensatedReactionMs: 364.9,
      buttonHoldDurationMs: 72.1,
      isFalseStart: false,
      isLapse: false
    },
    {
      trialNumber: 3,
      isiDelayMs: 4400,
      rawReactionMs: 560,
      compensatedReactionMs: 549.9,
      buttonHoldDurationMs: 95.0,
      isFalseStart: false,
      isLapse: true
    }
  ]);

  assert.equal(pvtResult.lapseCount, 1);
  assert.equal(pvtResult.pvtBLapseCount, 2); // Both 364.9ms and 549.9ms >= 355ms NASA PVT-B threshold
  assert.equal(pvtResult.falseStartCount, 0);
});

test('Forced-Choice Ipsative Inventory triggers elevated Cognitive Dissimulation Index on prolonged hesitation + inconsistent profile', () => {
  const authenticResult = evaluateIpsativeInventory([
    {
      triadId: 'TRIAD-01',
      mostLikeMeStatementId: 'T01-A',
      leastLikeMeStatementId: 'T01-C',
      mostConstruct: 'emotional_stability',
      leastConstruct: 'interpersonal_tolerance',
      hesitationDurationMs: 3400,
      selectionSwitchCount: 0,
      sdSpread: 0.01
    },
    {
      triadId: 'TRIAD-03',
      mostLikeMeStatementId: 'T03-B',
      leastLikeMeStatementId: 'T03-C',
      mostConstruct: 'emotional_stability',
      leastConstruct: 'autonomy',
      hesitationDurationMs: 3800,
      selectionSwitchCount: 0,
      sdSpread: 0.03
    }
  ]);

  const dissimulatedResult = evaluateIpsativeInventory([
    {
      triadId: 'TRIAD-01',
      mostLikeMeStatementId: 'T01-A',
      leastLikeMeStatementId: 'T01-B',
      mostConstruct: 'emotional_stability',
      leastConstruct: 'conscientiousness',
      hesitationDurationMs: 12400,
      selectionSwitchCount: 4,
      sdSpread: 0.03
    },
    {
      triadId: 'TRIAD-03',
      mostLikeMeStatementId: 'T03-A',
      leastLikeMeStatementId: 'T03-B',
      mostConstruct: 'conscientiousness',
      leastConstruct: 'emotional_stability',
      hesitationDurationMs: 14100,
      selectionSwitchCount: 5,
      sdSpread: 0.04
    }
  ]);

  assert.ok(
    dissimulatedResult.cognitiveDissimulationIndex > authenticResult.cognitiveDissimulationIndex + 40
  );
  assert.equal(dissimulatedResult.dissimulationFlag, 'High Dissimulation Alert');
});

test('Spaceflight Emotional Stroop calculates mission-threat and interpersonal attentional bias against NASA OSDR baseline', () => {
  const stroopResult = evaluateStroopSession([
    {
      trialNumber: 1,
      word: 'TELEMETRY',
      category: 'neutral_aerospace',
      inkColor: 'CYAN',
      selectedColor: 'CYAN',
      isCorrect: true,
      rawReactionMs: 490,
      compensatedReactionMs: 480,
      keyHoldDurationMs: 65
    },
    {
      trialNumber: 2,
      word: 'DECOMPRESSION',
      category: 'mission_threat',
      inkColor: 'EMERALD',
      selectedColor: 'EMERALD',
      isCorrect: true,
      rawReactionMs: 610,
      compensatedReactionMs: 600,
      keyHoldDurationMs: 82
    },
    {
      trialNumber: 3,
      word: 'OSTRACISM',
      category: 'interpersonal_strain',
      inkColor: 'COBALT',
      selectedColor: 'COBALT',
      isCorrect: true,
      rawReactionMs: 565,
      compensatedReactionMs: 555,
      keyHoldDurationMs: 74
    }
  ]);

  assert.equal(stroopResult.missionThreatInterferenceMs, 120);
  assert.equal(stroopResult.interpersonalInterferenceMs, 75);
  assert.equal(stroopResult.biasClassification, 'Significant Attentional Threat Capture');
});

test('buildHumanCenteredCareReport produces a warm, structured, jargon-free care summary across all 5 sections', async () => {
  const { buildHumanCenteredCareReport } = await import('./psychometrics');
  const careReport = buildHumanCenteredCareReport(INITIAL_BLANK_BIOMETRICS, null, null, null);
  assert.ok(careReport.headline.length > 10);
  assert.ok(careReport.lovingLetter.includes('Thank you'));
  assert.equal(careReport.step2StrengthsAnalysis.traits.length, 5);
  assert.equal(careReport.careRecommendations.length, 3);
  assert.equal(careReport.bodyAndSleepSummary.isConnected, false);
});

