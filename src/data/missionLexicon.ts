export type ConstructId =
  | 'emotional_stability'
  | 'interpersonal_tolerance'
  | 'conscientiousness'
  | 'stress_recovery'
  | 'autonomy';

export interface ConstructMetadata {
  id: ConstructId;
  label: string;
  shortLabel: string;
  domain: 'psychological' | 'behavioral';
  description: string;
}

export const CONSTRUCT_METADATA: Record<ConstructId, ConstructMetadata> = {
  emotional_stability: {
    id: 'emotional_stability',
    label: 'Emotional Stability',
    shortLabel: 'Stability',
    domain: 'psychological',
    description: 'Affective regulation under prolonged confinement, sensory monotony, and communication latency.'
  },
  interpersonal_tolerance: {
    id: 'interpersonal_tolerance',
    label: 'Interpersonal Tolerance',
    shortLabel: 'Tolerance',
    domain: 'behavioral',
    description: 'Cohesion, patience with crewmate idiosyncrasies, and conflict de-escalation in closed habitats.'
  },
  conscientiousness: {
    id: 'conscientiousness',
    label: 'Conscientiousness',
    shortLabel: 'Precision',
    domain: 'behavioral',
    description: 'Procedural fidelity, checklist discipline, and sustained rigor during repetitive orbital maintenance.'
  },
  stress_recovery: {
    id: 'stress_recovery',
    label: 'Stress Recovery',
    shortLabel: 'Recovery',
    domain: 'psychological',
    description: 'Autonomic and cognitive return-to-baseline following acute off-nominal alarms or high-workload EVA.'
  },
  autonomy: {
    id: 'autonomy',
    label: 'Operational Autonomy',
    shortLabel: 'Autonomy',
    domain: 'behavioral',
    description: 'Self-directed problem solving and psychological self-sufficiency during deep-space comms delays.'
  }
};

export interface TriadStatement {
  id: string;
  text: string;
  construct: ConstructId;
  sdWeight: number; // Matched Social Desirability Weight (1.0 - 5.0 scale)
}

export interface IpsativeTriad {
  id: string;
  contextTag: string;
  statements: [TriadStatement, TriadStatement, TriadStatement];
}

export type StroopCategory =
  | 'mission_threat'
  | 'interpersonal_strain'
  | 'circadian_somatic'
  | 'neutral_aerospace';

export interface StroopWordEntry {
  word: string;
  category: StroopCategory;
  syllables: number;
  arousalNorm: number; // 1.0 - 9.0 normative aerospace valence/threat weight
}

/**
 * 245 Unique Mission-Specific, Interpersonal & Neutral Aerospace Words
 * Designed to eliminate Stroop habituation across repeated daily spaceflight sessions.
 */
export const SPACEFLIGHT_STROOP_LEXICON: StroopWordEntry[] = [
  // 1. Mission-Threat Vocabulary (65 words)
  { word: 'DECOMPRESSION', category: 'mission_threat', syllables: 4, arousalNorm: 8.8 },
  { word: 'HYPOXIA', category: 'mission_threat', syllables: 4, arousalNorm: 8.7 },
  { word: 'MICROMETEOROID', category: 'mission_threat', syllables: 5, arousalNorm: 8.5 },
  { word: 'AMMONIA-LEAK', category: 'mission_threat', syllables: 4, arousalNorm: 8.9 },
  { word: 'THRUSTER-FAIL', category: 'mission_threat', syllables: 3, arousalNorm: 8.4 },
  { word: 'DEORBIT-BURN', category: 'mission_threat', syllables: 4, arousalNorm: 7.9 },
  { word: 'ASPHYXIATION', category: 'mission_threat', syllables: 5, arousalNorm: 8.9 },
  { word: 'DEPRESSURIZE', category: 'mission_threat', syllables: 4, arousalNorm: 8.8 },
  { word: 'SOLAR-FLARE', category: 'mission_threat', syllables: 3, arousalNorm: 8.2 },
  { word: 'CONTAMINATION', category: 'mission_threat', syllables: 5, arousalNorm: 8.1 },
  { word: 'OVERPRESSURE', category: 'mission_threat', syllables: 4, arousalNorm: 8.3 },
  { word: 'FIRE-SUPPRESS', category: 'mission_threat', syllables: 3, arousalNorm: 8.6 },
  { word: 'BLACKOUT-ZONE', category: 'mission_threat', syllables: 3, arousalNorm: 7.8 },
  { word: 'GYRO-TUMBLE', category: 'mission_threat', syllables: 3, arousalNorm: 8.4 },
  { word: 'BREACH-ALARM', category: 'mission_threat', syllables: 3, arousalNorm: 8.9 },
  { word: 'HYPERCAPNIA', category: 'mission_threat', syllables: 5, arousalNorm: 8.5 },
  { word: 'TOXIC-PLUME', category: 'mission_threat', syllables: 3, arousalNorm: 8.4 },
  { word: 'COOLANT-RUPTURE', category: 'mission_threat', syllables: 4, arousalNorm: 8.3 },
  { word: 'ABORT-LOCK', category: 'mission_threat', syllables: 3, arousalNorm: 8.5 },
  { word: 'RADIATION-FLUX', category: 'mission_threat', syllables: 5, arousalNorm: 8.2 },
  { word: 'OXYGEN-DEPLETE', category: 'mission_threat', syllables: 5, arousalNorm: 8.9 },
  { word: 'HULL-FRACTURE', category: 'mission_threat', syllables: 3, arousalNorm: 8.8 },
  { word: 'SEAL-FAILURE', category: 'mission_threat', syllables: 3, arousalNorm: 8.6 },
  { word: 'SCRUBBER-FAULT', category: 'mission_threat', syllables: 3, arousalNorm: 8.2 },
  { word: 'POWER-DROPOUT', category: 'mission_threat', syllables: 4, arousalNorm: 8.0 },
  { word: 'THERMAL-RUNAWAY', category: 'mission_threat', syllables: 5, arousalNorm: 8.6 },
  { word: 'TETHER-SNAP', category: 'mission_threat', syllables: 3, arousalNorm: 8.9 },
  { word: 'SUIT-PUNCTURE', category: 'mission_threat', syllables: 3, arousalNorm: 8.9 },
  { word: 'LOSS-OF-SIGNAL', category: 'mission_threat', syllables: 4, arousalNorm: 7.9 },
  { word: 'ORBIT-DECAY', category: 'mission_threat', syllables: 4, arousalNorm: 8.1 },
  { word: 'HYDRAZINE-SPILL', category: 'mission_threat', syllables: 4, arousalNorm: 8.7 },
  { word: 'SHORT-CIRCUIT', category: 'mission_threat', syllables: 3, arousalNorm: 8.0 },
  { word: 'LIFE-SUPPORT', category: 'mission_threat', syllables: 3, arousalNorm: 7.8 },
  { word: 'NITROGEN-EMBOLI', category: 'mission_threat', syllables: 5, arousalNorm: 8.4 },
  { word: 'DEBRIS-STRIKE', category: 'mission_threat', syllables: 3, arousalNorm: 8.8 },
  { word: 'VALVE-JAMMED', category: 'mission_threat', syllables: 2, arousalNorm: 7.7 },
  { word: 'CABIN-SMOKE', category: 'mission_threat', syllables: 3, arousalNorm: 8.7 },
  { word: 'BUS-UNDERVOLT', category: 'mission_threat', syllables: 4, arousalNorm: 7.6 },
  { word: 'BATTERY-VENT', category: 'mission_threat', syllables: 4, arousalNorm: 8.3 },
  { word: 'AIRLOCK-FAULT', category: 'mission_threat', syllables: 3, arousalNorm: 8.5 },
  { word: 'COLLISION-ALERT', category: 'mission_threat', syllables: 5, arousalNorm: 8.8 },
  { word: 'CONJUNCTION-RED', category: 'mission_threat', syllables: 4, arousalNorm: 8.4 },
  { word: 'PRESSURE-DROP', category: 'mission_threat', syllables: 3, arousalNorm: 8.7 },
  { word: 'FAN-STALL', category: 'mission_threat', syllables: 2, arousalNorm: 7.5 },
  { word: 'WATER-TAINTED', category: 'mission_threat', syllables: 4, arousalNorm: 7.9 },
  { word: 'FUEL-EXHAUST', category: 'mission_threat', syllables: 3, arousalNorm: 8.1 },
  { word: 'COMM-SEVERED', category: 'mission_threat', syllables: 3, arousalNorm: 8.2 },
  { word: 'GUIDANCE-DRIFT', category: 'mission_threat', syllables: 3, arousalNorm: 7.8 },
  { word: 'DOSIMETER-HIGH', category: 'mission_threat', syllables: 5, arousalNorm: 8.3 },
  { word: 'VISOR-FOGGING', category: 'mission_threat', syllables: 4, arousalNorm: 8.1 },
  { word: 'PURGE-EMERGENCY', category: 'mission_threat', syllables: 5, arousalNorm: 8.5 },
  { word: 'ARC-FLASH', category: 'mission_threat', syllables: 2, arousalNorm: 8.3 },
  { word: 'PROPELLANT-VOID', category: 'mission_threat', syllables: 4, arousalNorm: 8.0 },
  { word: 'LOCKOUT-TRAP', category: 'mission_threat', syllables: 3, arousalNorm: 8.4 },
  { word: 'COOLING-LOOP-DOWN', category: 'mission_threat', syllables: 4, arousalNorm: 8.2 },
  { word: 'CRITICAL-ALARM', category: 'mission_threat', syllables: 5, arousalNorm: 8.7 },
  { word: 'VACUUM-EXPOSURE', category: 'mission_threat', syllables: 5, arousalNorm: 8.9 },
  { word: 'SOLAR-STORM', category: 'mission_threat', syllables: 3, arousalNorm: 8.1 },
  { word: 'BULKHEAD-CRACK', category: 'mission_threat', syllables: 3, arousalNorm: 8.7 },
  { word: 'GIMBAL-LOCK', category: 'mission_threat', syllables: 3, arousalNorm: 8.0 },
  { word: 'PARACHUTE-FOUL', category: 'mission_threat', syllables: 4, arousalNorm: 8.6 },
  { word: 'HEATSHIELD-TILE', category: 'mission_threat', syllables: 3, arousalNorm: 8.4 },
  { word: 'BAROTRAUMA', category: 'mission_threat', syllables: 4, arousalNorm: 8.3 },
  { word: 'PLASMA-SEEP', category: 'mission_threat', syllables: 3, arousalNorm: 8.5 },
  { word: 'UNCOMMANDED-YAW', category: 'mission_threat', syllables: 5, arousalNorm: 8.4 },

  // 2. Interpersonal Strain & Isolation Vocabulary (65 words)
  { word: 'OSTRACISM', category: 'interpersonal_strain', syllables: 4, arousalNorm: 8.1 },
  { word: 'RESENTMENT', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.9 },
  { word: 'ISOLATION', category: 'interpersonal_strain', syllables: 4, arousalNorm: 8.2 },
  { word: 'ESTRANGEMENT', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.0 },
  { word: 'MICROMANAGE', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.5 },
  { word: 'HOSTILITY', category: 'interpersonal_strain', syllables: 4, arousalNorm: 8.3 },
  { word: 'WITHDRAWAL', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.7 },
  { word: 'CONFINEMENT', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.9 },
  { word: 'ALIENATION', category: 'interpersonal_strain', syllables: 5, arousalNorm: 8.1 },
  { word: 'TERRITORIAL', category: 'interpersonal_strain', syllables: 5, arousalNorm: 7.4 },
  { word: 'ANTAGONISM', category: 'interpersonal_strain', syllables: 4, arousalNorm: 8.2 },
  { word: 'SCAPEGOATING', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.0 },
  { word: 'CONTEMPT', category: 'interpersonal_strain', syllables: 2, arousalNorm: 8.1 },
  { word: 'STONEWALLING', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.8 },
  { word: 'DISTRUST', category: 'interpersonal_strain', syllables: 2, arousalNorm: 8.0 },
  { word: 'SUBGROUPING', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.3 },
  { word: 'MARGINALIZED', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.9 },
  { word: 'PASSIVE-HOSTILE', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.8 },
  { word: 'CREW-FRICTION', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.0 },
  { word: 'BLAME-SHIFT', category: 'interpersonal_strain', syllables: 2, arousalNorm: 7.7 },
  { word: 'DEFENSIVENESS', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.4 },
  { word: 'CLAUSTROPHOBIA', category: 'interpersonal_strain', syllables: 5, arousalNorm: 8.5 },
  { word: 'HOMESICKNESS', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.6 },
  { word: 'DETACHMENT', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.5 },
  { word: 'IRRITABILITY', category: 'interpersonal_strain', syllables: 6, arousalNorm: 7.9 },
  { word: 'CYNICISM', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.3 },
  { word: 'DISREGARD', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.5 },
  { word: 'CONDESCENSION', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.8 },
  { word: 'LONELINESS', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.0 },
  { word: 'BEREAVEMENT', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.4 },
  { word: 'ABANDONMENT', category: 'interpersonal_strain', syllables: 4, arousalNorm: 8.5 },
  { word: 'GRIEVANCE', category: 'interpersonal_strain', syllables: 2, arousalNorm: 7.6 },
  { word: 'INCOMPATIBLE', category: 'interpersonal_strain', syllables: 5, arousalNorm: 7.7 },
  { word: 'EXCLUDED', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.9 },
  { word: 'OVERSTEPPING', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.2 },
  { word: 'DISMISSIVE', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.6 },
  { word: 'POLARIZATION', category: 'interpersonal_strain', syllables: 5, arousalNorm: 7.8 },
  { word: 'FACTIONS', category: 'interpersonal_strain', syllables: 2, arousalNorm: 7.5 },
  { word: 'INTRUSION', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.4 },
  { word: 'PRIVACY-LOSS', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.6 },
  { word: 'UNHEARD', category: 'interpersonal_strain', syllables: 2, arousalNorm: 7.7 },
  { word: 'BETRAYAL', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.4 },
  { word: 'SUSPICION', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.9 },
  { word: 'RIVALRY', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.5 },
  { word: 'INTRANSIGENCE', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.6 },
  { word: 'COLD-SHOULDER', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.7 },
  { word: 'HUMILIATION', category: 'interpersonal_strain', syllables: 5, arousalNorm: 8.3 },
  { word: 'EARTH-OUT-OF-VIEW', category: 'interpersonal_strain', syllables: 4, arousalNorm: 8.1 },
  { word: 'SOCIAL-MONOTONY', category: 'interpersonal_strain', syllables: 5, arousalNorm: 7.4 },
  { word: 'GROUND-CONFLICT', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.8 },
  { word: 'AUTHORITARIAN', category: 'interpersonal_strain', syllables: 5, arousalNorm: 7.6 },
  { word: 'INSUBORDINATE', category: 'interpersonal_strain', syllables: 5, arousalNorm: 8.1 },
  { word: 'RETALIATION', category: 'interpersonal_strain', syllables: 5, arousalNorm: 8.2 },
  { word: 'EMPATHY-FATIGUE', category: 'interpersonal_strain', syllables: 5, arousalNorm: 7.5 },
  { word: 'SILENT-TREATMENT', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.8 },
  { word: 'MORALE-COLLAPSE', category: 'interpersonal_strain', syllables: 4, arousalNorm: 8.3 },
  { word: 'DISCONNECTION', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.7 },
  { word: 'FRUSTRATION', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.8 },
  { word: 'IMPATIENCE', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.3 },
  { word: 'QUARREL', category: 'interpersonal_strain', syllables: 2, arousalNorm: 7.6 },
  { word: 'BELITTLING', category: 'interpersonal_strain', syllables: 3, arousalNorm: 7.9 },
  { word: 'COERCION', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.0 },
  { word: 'REJECTION', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.1 },
  { word: 'AGGRESSION', category: 'interpersonal_strain', syllables: 3, arousalNorm: 8.3 },
  { word: 'DISHARMONY', category: 'interpersonal_strain', syllables: 4, arousalNorm: 7.6 },

  // 3. Circadian, Cognitive & Somatic Depletion Vocabulary (50 words)
  { word: 'INSOMNIA', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.8 },
  { word: 'LETHARGY', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.2 },
  { word: 'VERTIGO', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.9 },
  { word: 'DISORIENTATION', category: 'circadian_somatic', syllables: 6, arousalNorm: 8.1 },
  { word: 'EXHAUSTION', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.9 },
  { word: 'TACHYCARDIA', category: 'circadian_somatic', syllables: 5, arousalNorm: 8.0 },
  { word: 'BRAIN-FOG', category: 'circadian_somatic', syllables: 2, arousalNorm: 7.5 },
  { word: 'MICRO-SLEEP', category: 'circadian_somatic', syllables: 3, arousalNorm: 8.1 },
  { word: 'CIRCADIAN-DRIFT', category: 'circadian_somatic', syllables: 5, arousalNorm: 7.4 },
  { word: 'HYPERVIGILANCE', category: 'circadian_somatic', syllables: 5, arousalNorm: 7.9 },
  { word: 'SOMNOLENCE', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.3 },
  { word: 'REM-SUPPRESSION', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.5 },
  { word: 'HEADACHE-PRESSURE', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.6 },
  { word: 'ATROPHY', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.4 },
  { word: 'NAUSEA', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.7 },
  { word: 'TREMOR', category: 'circadian_somatic', syllables: 2, arousalNorm: 7.6 },
  { word: 'ANHEDONIA', category: 'circadian_somatic', syllables: 5, arousalNorm: 7.8 },
  { word: 'BURNOUT', category: 'circadian_somatic', syllables: 2, arousalNorm: 8.0 },
  { word: 'NUMBNESS', category: 'circadian_somatic', syllables: 2, arousalNorm: 7.3 },
  { word: 'PANIC-SURGE', category: 'circadian_somatic', syllables: 3, arousalNorm: 8.6 },
  { word: 'HEART-PALPITATION', category: 'circadian_somatic', syllables: 5, arousalNorm: 8.1 },
  { word: 'DIZZINESS', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.5 },
  { word: 'APATHY', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.4 },
  { word: 'DREAD', category: 'circadian_somatic', syllables: 1, arousalNorm: 8.3 },
  { word: 'FATIGUE-LAPSE', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.8 },
  { word: 'SENSORY-HUNGER', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.4 },
  { word: 'ASTHENIA', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.5 },
  { word: 'PSYCHOMOTOR-LAG', category: 'circadian_somatic', syllables: 5, arousalNorm: 7.6 },
  { word: 'MEMORY-SLIP', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.7 },
  { word: 'TUNNEL-VISION', category: 'circadian_somatic', syllables: 4, arousalNorm: 8.0 },
  { word: 'SLEEP-DEBT', category: 'circadian_somatic', syllables: 2, arousalNorm: 7.5 },
  { word: 'NIGHTMARE', category: 'circadian_somatic', syllables: 2, arousalNorm: 8.0 },
  { word: 'RESTLESSNESS', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.4 },
  { word: 'MELATONIN-SHIFT', category: 'circadian_somatic', syllables: 5, arousalNorm: 6.9 },
  { word: 'VESTIBULAR-SICK', category: 'circadian_somatic', syllables: 5, arousalNorm: 7.8 },
  { word: 'HYPOTHERMIA', category: 'circadian_somatic', syllables: 5, arousalNorm: 8.2 },
  { word: 'HYPERTHERMIA', category: 'circadian_somatic', syllables: 5, arousalNorm: 8.2 },
  { word: 'DYSPHORIA', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.9 },
  { word: 'OVERLOAD', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.8 },
  { word: 'COGNITIVE-STALL', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.9 },
  { word: 'FIXATION', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.4 },
  { word: 'RUMINATING', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.5 },
  { word: 'AGITATION', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.8 },
  { word: 'MELANCHOLY', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.6 },
  { word: 'TORPOR', category: 'circadian_somatic', syllables: 2, arousalNorm: 7.1 },
  { word: 'DEPERSONALIZED', category: 'circadian_somatic', syllables: 5, arousalNorm: 8.1 },
  { word: 'DESYNCHRONY', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.4 },
  { word: 'WAKE-FRAGMENT', category: 'circadian_somatic', syllables: 3, arousalNorm: 7.5 },
  { word: 'OCULAR-STRAIN', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.2 },
  { word: 'CORTISOL-SPIKE', category: 'circadian_somatic', syllables: 4, arousalNorm: 7.9 },

  // 4. Neutral Aerospace Baseline Vocabulary (65 words)
  { word: 'TELEMETRY', category: 'neutral_aerospace', syllables: 4, arousalNorm: 3.1 },
  { word: 'SPECTROMETER', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.9 },
  { word: 'GYROSCOPE', category: 'neutral_aerospace', syllables: 3, arousalNorm: 3.0 },
  { word: 'TRANSCEIVER', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.8 },
  { word: 'MANIFOLD', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.9 },
  { word: 'SOLAR-ARRAY', category: 'neutral_aerospace', syllables: 4, arousalNorm: 3.0 },
  { word: 'RADIATOR-FIN', category: 'neutral_aerospace', syllables: 5, arousalNorm: 2.8 },
  { word: 'DOCKING-RING', category: 'neutral_aerospace', syllables: 3, arousalNorm: 3.2 },
  { word: 'CUPOLA-PORT', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.7 },
  { word: 'STANCHION', category: 'neutral_aerospace', syllables: 2, arousalNorm: 2.6 },
  { word: 'HANDRAIL', category: 'neutral_aerospace', syllables: 2, arousalNorm: 2.5 },
  { word: 'FOOT-RESTRAINT', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.8 },
  { word: 'PAYLOAD-RACK', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.9 },
  { word: 'GLOVEBOX', category: 'neutral_aerospace', syllables: 2, arousalNorm: 2.7 },
  { word: 'CENTRIFUGE', category: 'neutral_aerospace', syllables: 3, arousalNorm: 3.1 },
  { word: 'CHROMATOGRAPH', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.8 },
  { word: 'OSCILLOSCOPE', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.9 },
  { word: 'INCLINATION', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.7 },
  { word: 'APOGEE-NODE', category: 'neutral_aerospace', syllables: 4, arousalNorm: 3.0 },
  { word: 'PERIGEE-PASS', category: 'neutral_aerospace', syllables: 4, arousalNorm: 3.0 },
  { word: 'EPHEMERIS', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.8 },
  { word: 'ALTIMETER', category: 'neutral_aerospace', syllables: 4, arousalNorm: 3.1 },
  { word: 'STAR-TRACKER', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.9 },
  { word: 'SUN-SENSOR', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.7 },
  { word: 'MAGNETOMETER', category: 'neutral_aerospace', syllables: 5, arousalNorm: 2.8 },
  { word: 'ACCELEROMETER', category: 'neutral_aerospace', syllables: 6, arousalNorm: 3.0 },
  { word: 'THERMOCOUPLE', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.9 },
  { word: 'CONDUIT-TRAY', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.6 },
  { word: 'HARNESS-CLIP', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.7 },
  { word: 'FASTENER-PIN', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.5 },
  { word: 'BEARING-RING', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.6 },
  { word: 'BAFFLE-PLATE', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.6 },
  { word: 'FLANGE-GASKET', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.8 },
  { word: 'WAVEGUIDE', category: 'neutral_aerospace', syllables: 2, arousalNorm: 2.7 },
  { word: 'DOWNLINK-BAND', category: 'neutral_aerospace', syllables: 3, arousalNorm: 3.0 },
  { word: 'UPLINK-PACKET', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.9 },
  { word: 'TRANSPONDER', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.9 },
  { word: 'MULTIPLEXER', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.8 },
  { word: 'ATTENUATOR', category: 'neutral_aerospace', syllables: 5, arousalNorm: 2.7 },
  { word: 'PHASE-ARRAY', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.9 },
  { word: 'PARABOLIC-DISH', category: 'neutral_aerospace', syllables: 5, arousalNorm: 2.8 },
  { word: 'TRUSS-SEGMENT', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.7 },
  { word: 'LONGERON-BEAM', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.6 },
  { word: 'MICROSCOPE', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.6 },
  { word: 'PIPETTE-TRAY', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.5 },
  { word: 'INCUBATOR', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.7 },
  { word: 'HYDROPONICS', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.6 },
  { word: 'CONDENSER-COIL', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.8 },
  { word: 'DEIONIZER', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.7 },
  { word: 'CALORIMETER', category: 'neutral_aerospace', syllables: 5, arousalNorm: 2.8 },
  { word: 'INTERFEROMETER', category: 'neutral_aerospace', syllables: 6, arousalNorm: 2.9 },
  { word: 'BOLOMETER', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.7 },
  { word: 'ACTUATOR-ARM', category: 'neutral_aerospace', syllables: 5, arousalNorm: 2.9 },
  { word: 'END-EFFECTOR', category: 'neutral_aerospace', syllables: 4, arousalNorm: 3.0 },
  { word: 'GRAPPLE-FIXTURE', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.9 },
  { word: 'STOWAGE-LOCKER', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.5 },
  { word: 'CARGO-TRANSFER', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.7 },
  { word: 'LOGBOOK-ENTRY', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.5 },
  { word: 'TIMELINE-BLOCK', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.7 },
  { word: 'CALIBRATION', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.8 },
  { word: 'ISOTOPE-VIAL', category: 'neutral_aerospace', syllables: 4, arousalNorm: 3.0 },
  { word: 'OPTICAL-BENCH', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.6 },
  { word: 'LASER-RANGING', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.9 },
  { word: 'VECTOR-PLOT', category: 'neutral_aerospace', syllables: 3, arousalNorm: 2.7 },
  { word: 'HORIZON-SCAN', category: 'neutral_aerospace', syllables: 4, arousalNorm: 2.8 }
];

/**
 * 30 Multidimensional Forced-Choice Ipsative Triads (90 Unique Statements)
 * Each triad has matched Social Desirability weights (sdWeight delta <= 0.06)
 * so astronauts cannot game the inventory via impression management.
 */
export const IPSATIVE_TRIAD_BANK: IpsativeTriad[] = [
  {
    id: 'TRIAD-01',
    contextTag: 'Off-Nominal Telemetry Response',
    statements: [
      {
        id: 'T01-A',
        text: 'I maintain an even vocal cadence and steady breathing when unexpected caution alarms sound during orbital operations.',
        construct: 'emotional_stability',
        sdWeight: 4.25
      },
      {
        id: 'T01-B',
        text: 'I double-check every valve position and torque specification against the flight manual before signing off a task.',
        construct: 'conscientiousness',
        sdWeight: 4.28
      },
      {
        id: 'T01-C',
        text: 'I actively adapt my communication style to accommodate crewmates who process procedures differently than I do.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.24
      }
    ]
  },
  {
    id: 'TRIAD-02',
    contextTag: 'Deep-Space Comm Latency & Rest Transition',
    statements: [
      {
        id: 'T02-A',
        text: 'Once an intense maintenance shift ends, I can detach mentally and transition into restorative sleep without lingering tension.',
        construct: 'stress_recovery',
        sdWeight: 4.20
      },
      {
        id: 'T02-B',
        text: 'When ground control is unreachable due to communication blackout, I confidently formulate and execute independent troubleshooting plans.',
        construct: 'autonomy',
        sdWeight: 4.23
      },
      {
        id: 'T02-C',
        text: 'I remain patient and supportive when a fatigued crewmate takes longer than scheduled at a shared workstation.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.21
      }
    ]
  },
  {
    id: 'TRIAD-03',
    contextTag: 'Habitat Routine & Shared Quarters',
    statements: [
      {
        id: 'T03-A',
        text: 'I organize my stowage bay and experimental samples with strict adherence to inventory labeling protocols.',
        construct: 'conscientiousness',
        sdWeight: 4.18
      },
      {
        id: 'T03-B',
        text: 'My emotional baseline stays steady even when mission schedules are abruptly rewritten three times in one afternoon.',
        construct: 'emotional_stability',
        sdWeight: 4.22
      },
      {
        id: 'T03-C',
        text: 'I require very little external reassurance to stay motivated during multi-week monotonous transit phases.',
        construct: 'autonomy',
        sdWeight: 4.19
      }
    ]
  },
  {
    id: 'TRIAD-04',
    contextTag: 'Post-EVA Recovery & Debrief',
    statements: [
      {
        id: 'T04-A',
        text: 'After a high-exertion simulation or EVA prep, my heart rate and mental focus normalize rapidly during quiet rest.',
        construct: 'stress_recovery',
        sdWeight: 4.30
      },
      {
        id: 'T04-B',
        text: 'During technical disagreements in debriefs, I prioritize preserving crew cohesion over proving my initial hypothesis right.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.28
      },
      {
        id: 'T04-C',
        text: 'I systematically log every minor sensor fluctuation even when the telemetry remains within nominal green thresholds.',
        construct: 'conscientiousness',
        sdWeight: 4.26
      }
    ]
  },
  {
    id: 'TRIAD-05',
    contextTag: 'Autonomous Fault Isolation',
    statements: [
      {
        id: 'T05-A',
        text: 'I thrive when entrusted to diagnose complex life-support anomalies without step-by-step prompting from flight directors.',
        construct: 'autonomy',
        sdWeight: 4.31
      },
      {
        id: 'T05-B',
        text: 'I rarely experience inner frustration when environmental noise or equipment hum persists throughout the habitat.',
        construct: 'emotional_stability',
        sdWeight: 4.27
      },
      {
        id: 'T05-C',
        text: 'Brief restorative breaks allow me to clear cognitive fatigue and return to peak alertness for afternoon payload operations.',
        construct: 'stress_recovery',
        sdWeight: 4.29
      }
    ]
  },
  {
    id: 'TRIAD-06',
    contextTag: 'Crew Galley & Resource Allocation',
    statements: [
      {
        id: 'T06-A',
        text: 'I willingly adjust my personal habits in compact quarters so crewmates from different cultural backgrounds feel respected.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.22
      },
      {
        id: 'T06-B',
        text: 'I complete every preventative filter inspection ahead of deadline without needing reminders from the onboard scheduler.',
        construct: 'conscientiousness',
        sdWeight: 4.25
      },
      {
        id: 'T06-C',
        text: 'After an interrupted sleep cycle caused by an orbital maneuver, I rebound quickly without carrying irritability into the next day.',
        construct: 'stress_recovery',
        sdWeight: 4.21
      }
    ]
  },
  {
    id: 'TRIAD-07',
    contextTag: 'High-Density Payload Timeline',
    statements: [
      {
        id: 'T07-A',
        text: 'When sensory monotony sets in during long orbital nights, I keep my mood anchored and calm.',
        construct: 'emotional_stability',
        sdWeight: 4.19
      },
      {
        id: 'T07-B',
        text: 'I prefer to structure my own analytical workflow when resolving unscripted payload software faults.',
        construct: 'autonomy',
        sdWeight: 4.17
      },
      {
        id: 'T07-C',
        text: 'I listen attentively without interrupting when a crewmate vents frustration about ground-control schedule compression.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.20
      }
    ]
  },
  {
    id: 'TRIAD-08',
    contextTag: 'Precision Calibration & Vigilance',
    statements: [
      {
        id: 'T08-A',
        text: 'I verify calibration baselines three times before committing spectrometer data to the mission archive.',
        construct: 'conscientiousness',
        sdWeight: 4.24
      },
      {
        id: 'T08-B',
        text: 'I release somatic tension quickly through controlled breathing immediately after a high-stakes docking sequence.',
        construct: 'stress_recovery',
        sdWeight: 4.27
      },
      {
        id: 'T08-C',
        text: 'I stay composed and objective even when multiple subsystem caution lights illuminate simultaneously.',
        construct: 'emotional_stability',
        sdWeight: 4.29
      }
    ]
  },
  {
    id: 'TRIAD-09',
    contextTag: 'Isolated Habitat Decision Making',
    statements: [
      {
        id: 'T09-A',
        text: 'I can work effectively for extended periods in solitary lab modules without feeling socially depleted.',
        construct: 'autonomy',
        sdWeight: 4.15
      },
      {
        id: 'T09-B',
        text: 'I never cut corners on decontamination checklists even at the end of a fourteen-hour duty day.',
        construct: 'conscientiousness',
        sdWeight: 4.18
      },
      {
        id: 'T09-C',
        text: 'I overlook minor interpersonal friction during high-workload weeks to keep the cabin atmosphere harmonious.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.16
      }
    ]
  },
  {
    id: 'TRIAD-10',
    contextTag: 'Circadian Shift Adaptation',
    statements: [
      {
        id: 'T10-A',
        text: 'My autonomic arousal settles back to resting baseline within minutes of resolving an unexpected hardware fault.',
        construct: 'stress_recovery',
        sdWeight: 4.26
      },
      {
        id: 'T10-B',
        text: 'I exercise sound independent judgment when real-time telemetry diverges from pre-flight simulation models.',
        construct: 'autonomy',
        sdWeight: 4.24
      },
      {
        id: 'T10-C',
        text: 'I maintain steady emotional equanimity when personal communication downlinks from Earth are delayed.',
        construct: 'emotional_stability',
        sdWeight: 4.25
      }
    ]
  },
  {
    id: 'TRIAD-11',
    contextTag: 'Shared Laboratory Operations',
    statements: [
      {
        id: 'T11-A',
        text: 'I give crewmates generous benefit of the doubt when shared tools are misplaced during busy experiment changeovers.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.21
      },
      {
        id: 'T11-B',
        text: 'I keep my emotional state unshaken when a delicate microgravity experiment requires tedious repetition.',
        construct: 'emotional_stability',
        sdWeight: 4.23
      },
      {
        id: 'T11-C',
        text: 'I replenish my mental energy efficiently during scheduled off-duty windows regardless of cabin activity.',
        construct: 'stress_recovery',
        sdWeight: 4.20
      }
    ]
  },
  {
    id: 'TRIAD-12',
    contextTag: 'Robotic Arm & Docking Readiness',
    statements: [
      {
        id: 'T12-A',
        text: 'I audit every line of a robotic arm trajectory script before enabling master arm power.',
        construct: 'conscientiousness',
        sdWeight: 4.31
      },
      {
        id: 'T12-B',
        text: 'I rely on my own internal standards of excellence rather than external praise from mission control.',
        construct: 'autonomy',
        sdWeight: 4.28
      },
      {
        id: 'T12-C',
        text: 'I decompress rapidly after intense manual piloting drills so residual adrenaline does not impair my sleep.',
        construct: 'stress_recovery',
        sdWeight: 4.30
      }
    ]
  },
  {
    id: 'TRIAD-13',
    contextTag: 'Long-Duration Crew Dynamics',
    statements: [
      {
        id: 'T13-A',
        text: 'I remain approachable and warm toward crewmates even when my own workload is near capacity.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.24
      },
      {
        id: 'T13-B',
        text: 'I confidently initiate contingency diagnostics when onboard sensors report ambiguous readings during comms silence.',
        construct: 'autonomy',
        sdWeight: 4.26
      },
      {
        id: 'T13-C',
        text: 'I keep my focus calm and unhurried when time-critical medical or environmental drills are triggered.',
        construct: 'emotional_stability',
        sdWeight: 4.25
      }
    ]
  },
  {
    id: 'TRIAD-14',
    contextTag: 'Life-Support Maintenance Discipline',
    statements: [
      {
        id: 'T14-A',
        text: 'I document every replaceable unit serial number and runtime hour with zero omissions.',
        construct: 'conscientiousness',
        sdWeight: 4.19
      },
      {
        id: 'T14-B',
        text: 'I bounce back with fresh clarity after a demanding night-watch shift monitoring solar particle events.',
        construct: 'stress_recovery',
        sdWeight: 4.22
      },
      {
        id: 'T14-C',
        text: 'I mediate differing operational opinions among crewmates with calm neutrality and mutual respect.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.21
      }
    ]
  },
  {
    id: 'TRIAD-15',
    contextTag: 'Deep-Space Transit Autonomy',
    statements: [
      {
        id: 'T15-A',
        text: 'I sustain self-directed research productivity when Earth-based science teams cannot provide live feedback.',
        construct: 'autonomy',
        sdWeight: 4.23
      },
      {
        id: 'T15-B',
        text: 'I adhere strictly to exercise and nutrition countermeasures every single day of the mission.',
        construct: 'conscientiousness',
        sdWeight: 4.25
      },
      {
        id: 'T15-C',
        text: 'I never let temporary setbacks in an experiment spill over into my mood during crew meals.',
        construct: 'emotional_stability',
        sdWeight: 4.24
      }
    ]
  },
  {
    id: 'TRIAD-16',
    contextTag: 'Emergency Drill & Recovery',
    statements: [
      {
        id: 'T16-A',
        text: 'Following a simulated cabin depressurization drill, my physiological stress markers return to baseline swiftly.',
        construct: 'stress_recovery',
        sdWeight: 4.28
      },
      {
        id: 'T16-B',
        text: 'I maintain meticulous tool accountability during complex bulkhead wiring repairs.',
        construct: 'conscientiousness',
        sdWeight: 4.26
      },
      {
        id: 'T16-C',
        text: 'I can make high-consequence operational trade-offs independently when real-time flight support is unavailable.',
        construct: 'autonomy',
        sdWeight: 4.27
      }
    ]
  },
  {
    id: 'TRIAD-17',
    contextTag: 'Closed-Loop Habitat Cohesion',
    statements: [
      {
        id: 'T17-A',
        text: 'I respect each crewmate’s need for quiet personal space without taking their solitude personally.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.20
      },
      {
        id: 'T17-B',
        text: 'I stay emotionally centered when unexpected orbital debris avoidance maneuvers disrupt our rest plan.',
        construct: 'emotional_stability',
        sdWeight: 4.22
      },
      {
        id: 'T17-C',
        text: 'I methodically cross-verify fluid loop pressure readings before initiating any pump configuration change.',
        construct: 'conscientiousness',
        sdWeight: 4.21
      }
    ]
  },
  {
    id: 'TRIAD-18',
    contextTag: 'Sustained Mission Endurance',
    statements: [
      {
        id: 'T18-A',
        text: 'Even after weeks of confined orbital operations, a single rest period restores my cognitive sharpness.',
        construct: 'stress_recovery',
        sdWeight: 4.24
      },
      {
        id: 'T18-B',
        text: 'I generate my own structure and daily purpose when mission timelines have open unscheduled blocks.',
        construct: 'autonomy',
        sdWeight: 4.21
      },
      {
        id: 'T18-C',
        text: 'I respond with empathy and composure when a teammate makes a procedural slip under fatigue.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.23
      }
    ]
  },
  {
    id: 'TRIAD-19',
    contextTag: 'Instrument Anomaly Triage',
    statements: [
      {
        id: 'T19-A',
        text: 'I keep my cognitive appraisal cool and analytical when telemetry shows sudden thermal fluctuations.',
        construct: 'emotional_stability',
        sdWeight: 4.27
      },
      {
        id: 'T19-B',
        text: 'I follow every contamination-control step to the letter even when nobody is observing my workflow.',
        construct: 'conscientiousness',
        sdWeight: 4.29
      },
      {
        id: 'T19-C',
        text: 'I quickly shed mental overload after completing a multi-hour troubleshooting sequence.',
        construct: 'stress_recovery',
        sdWeight: 4.26
      }
    ]
  },
  {
    id: 'TRIAD-20',
    contextTag: 'Cross-Cultural Crew Collaboration',
    statements: [
      {
        id: 'T20-A',
        text: 'I bridge communication gaps patiently when working with international partners on joint payloads.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.25
      },
      {
        id: 'T20-B',
        text: 'I take full autonomous ownership of my station’s readiness without waiting for external directives.',
        construct: 'autonomy',
        sdWeight: 4.23
      },
      {
        id: 'T20-C',
        text: 'I maintain strict logbook accuracy across every shift handover.',
        construct: 'conscientiousness',
        sdWeight: 4.24
      }
    ]
  },
  {
    id: 'TRIAD-21',
    contextTag: 'Night-Cycle Alertness & Calm',
    statements: [
      {
        id: 'T21-A',
        text: 'I remain free from anxious rumination when awakening to verify nighttime environmental telemetry.',
        construct: 'emotional_stability',
        sdWeight: 4.18
      },
      {
        id: 'T21-B',
        text: 'I fall back asleep effortlessly after being woken by an automated system status ping.',
        construct: 'stress_recovery',
        sdWeight: 4.21
      },
      {
        id: 'T21-C',
        text: 'I independently prioritize repair tasks when multiple non-critical maintenance items queue up.',
        construct: 'autonomy',
        sdWeight: 4.19
      }
    ]
  },
  {
    id: 'TRIAD-22',
    contextTag: 'Microgravity Workspace Etiquette',
    statements: [
      {
        id: 'T22-A',
        text: 'I secure every loose cable, fastener, and clip immediately after use so the cabin remains hazard-free.',
        construct: 'conscientiousness',
        sdWeight: 4.22
      },
      {
        id: 'T22-B',
        text: 'I accommodate minor repetitive habits of my crewmates without letting irritation build up.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.20
      },
      {
        id: 'T22-C',
        text: 'I keep my emotional tone steady and reassuring during ambiguous sensor failure scenarios.',
        construct: 'emotional_stability',
        sdWeight: 4.23
      }
    ]
  },
  {
    id: 'TRIAD-23',
    contextTag: 'Autonomic Resilience & Focus',
    statements: [
      {
        id: 'T23-A',
        text: 'My mind clears of operational stress within fifteen minutes of starting my post-shift wind-down routine.',
        construct: 'stress_recovery',
        sdWeight: 4.25
      },
      {
        id: 'T23-B',
        text: 'I solve unexpected hardware interface problems resourcefully using onboard spares and schematics.',
        construct: 'autonomy',
        sdWeight: 4.27
      },
      {
        id: 'T23-C',
        text: 'I foster inclusive decision-making so quieter crewmates have equal voice during mission planning.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.26
      }
    ]
  },
  {
    id: 'TRIAD-24',
    contextTag: 'Procedural Integrity Under Pressure',
    statements: [
      {
        id: 'T24-A',
        text: 'I never skip a verification step in a caution-response tree even when the root cause seems obvious.',
        construct: 'conscientiousness',
        sdWeight: 4.30
      },
      {
        id: 'T24-B',
        text: 'I stay emotionally unruffled when hardware constraints force a late redesign of an experiment.',
        construct: 'emotional_stability',
        sdWeight: 4.28
      },
      {
        id: 'T24-C',
        text: 'I operate with high self-reliance when conducting solo maintenance in isolated utility modules.',
        construct: 'autonomy',
        sdWeight: 4.26
      }
    ]
  },
  {
    id: 'TRIAD-25',
    contextTag: 'Post-Anomaly Team Cohesion',
    statements: [
      {
        id: 'T25-A',
        text: 'After a tense operational period, I actively help restore warmth and camaraderie at the crew table.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.24
      },
      {
        id: 'T25-B',
        text: 'My sleep quality recovers immediately on the night following a demanding orbital maneuver.',
        construct: 'stress_recovery',
        sdWeight: 4.22
      },
      {
        id: 'T25-C',
        text: 'I keep my affective response measured and grounded when unforeseen mission extensions are announced.',
        construct: 'emotional_stability',
        sdWeight: 4.25
      }
    ]
  },
  {
    id: 'TRIAD-26',
    contextTag: 'Inventory & Resource Stewardship',
    statements: [
      {
        id: 'T26-A',
        text: 'I track consumable water, oxygen, and filter reserves with exacting quantitative discipline.',
        construct: 'conscientiousness',
        sdWeight: 4.23
      },
      {
        id: 'T26-B',
        text: 'I recover my baseline calm rapidly after resolving a false-positive fire detection alert.',
        construct: 'stress_recovery',
        sdWeight: 4.25
      },
      {
        id: 'T26-C',
        text: 'I independently synthesize complex telemetry trends before briefing the rest of the crew.',
        construct: 'autonomy',
        sdWeight: 4.22
      }
    ]
  },
  {
    id: 'TRIAD-27',
    contextTag: 'Confined Habitat Adaptability',
    statements: [
      {
        id: 'T27-A',
        text: 'I remain patient and constructive when ground support misunderstands constraints inside the cabin.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.19
      },
      {
        id: 'T27-B',
        text: 'I maintain an unshakeable sense of calm during solar radiation shelter-in-place protocols.',
        construct: 'emotional_stability',
        sdWeight: 4.22
      },
      {
        id: 'T27-C',
        text: 'I sustain high personal initiative during multi-month deep-space cruise phases.',
        construct: 'autonomy',
        sdWeight: 4.20
      }
    ]
  },
  {
    id: 'TRIAD-28',
    contextTag: 'System Handover & Recovery',
    statements: [
      {
        id: 'T28-A',
        text: 'I prepare comprehensive, error-free handover notes so the incoming watch officer has complete clarity.',
        construct: 'conscientiousness',
        sdWeight: 4.26
      },
      {
        id: 'T28-B',
        text: 'I let go of work-related cognitive arousal as soon as my duty watch is formally relieved.',
        construct: 'stress_recovery',
        sdWeight: 4.24
      },
      {
        id: 'T28-C',
        text: 'I treat every crewmate’s operational feedback with openness and zero defensiveness.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.25
      }
    ]
  },
  {
    id: 'TRIAD-29',
    contextTag: 'Solo Watch & Subsystem Integrity',
    statements: [
      {
        id: 'T29-A',
        text: 'I make sound, self-assured technical decisions during solo watch periods without second-guessing myself.',
        construct: 'autonomy',
        sdWeight: 4.24
      },
      {
        id: 'T29-B',
        text: 'I remain emotionally steady when acoustic fans or exercise rigs create continuous background vibration.',
        construct: 'emotional_stability',
        sdWeight: 4.21
      },
      {
        id: 'T29-C',
        text: 'I inspect every O-ring and pressure seal systematically prior to closing an airlock hatch.',
        construct: 'conscientiousness',
        sdWeight: 4.25
      }
    ]
  },
  {
    id: 'TRIAD-30',
    contextTag: 'Mission Synthesis & Equilibrium',
    statements: [
      {
        id: 'T30-A',
        text: 'My physiological and emotional equilibrium restores reliably after high-density docking timelines.',
        construct: 'stress_recovery',
        sdWeight: 4.27
      },
      {
        id: 'T30-B',
        text: 'I actively cultivate a cooperative, low-friction environment across the entire orbital crew.',
        construct: 'interpersonal_tolerance',
        sdWeight: 4.26
      },
      {
        id: 'T30-C',
        text: 'I keep my composure steady and predictable under every phase of orbital flight.',
        construct: 'emotional_stability',
        sdWeight: 4.28
      }
    ]
  }
];
