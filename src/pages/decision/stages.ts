import type { UserRole } from '../../types/domain';
import type { MessageKey } from '../../i18n/messages';

/** Roles that decide at an approval stage of the chain. */
export type DecisionRole = 'ce_cea' | 's_dct' | 'dt' | 'dg';

/** Every non-employer workflow role that acts on a request. */
export type StageRole = DecisionRole | 'agent_dt' | 'cps';

export interface StageConfig {
  role: StageRole;
  eyebrowKey: MessageKey;
  titleKey: MessageKey;
  leadKey: MessageKey;
  /** Label of the positive action, or null when the stage only verifies. */
  approveKey: MessageKey | null;
  /** Whether the stage may reject the request outright. */
  canReject: boolean;
  /** Whether the stage may return the file to the previous actor. */
  canReturn: boolean;
  /** Whether the stage records a remission decision. */
  canRecordRemission: boolean;
  /** Whether a legal or delegation reference is required when approving. */
  needsLegalReference: boolean;
}

export const decisionRoles: DecisionRole[] = ['ce_cea', 's_dct', 'dt', 'dg'];

const STAGES: Record<StageRole, StageConfig> = {
  ce_cea: {
    role: 'ce_cea',
    eyebrowKey: 'decision.eyebrow',
    titleKey: 'decision.title.ce_cea',
    leadKey: 'decision.lead.ce_cea',
    approveKey: 'decision.approve',
    canReject: true,
    canReturn: true,
    canRecordRemission: false,
    needsLegalReference: true,
  },
  s_dct: {
    role: 's_dct',
    eyebrowKey: 'decision.eyebrow',
    titleKey: 'decision.title.s_dct',
    leadKey: 'decision.lead.s_dct',
    approveKey: 'decision.approve',
    canReject: true,
    canReturn: true,
    canRecordRemission: false,
    needsLegalReference: true,
  },
  dt: {
    role: 'dt',
    eyebrowKey: 'decision.eyebrow',
    titleKey: 'decision.title.dt',
    leadKey: 'decision.lead.dt',
    approveKey: 'decision.approve',
    canReject: true,
    canReturn: true,
    canRecordRemission: false,
    needsLegalReference: true,
  },
  dg: {
    role: 'dg',
    eyebrowKey: 'decision.eyebrow',
    titleKey: 'decision.title.dg',
    leadKey: 'decision.lead.dg',
    approveKey: 'decision.approve',
    canReject: true,
    canReturn: true,
    canRecordRemission: true,
    needsLegalReference: true,
  },
  agent_dt: {
    role: 'agent_dt',
    eyebrowKey: 'decision.eyebrow',
    titleKey: 'decision.title.agent_dt',
    leadKey: 'decision.lead.agent_dt',
    approveKey: 'decision.recommend',
    canReject: false,
    canReturn: true,
    canRecordRemission: false,
    needsLegalReference: false,
  },
  cps: {
    role: 'cps',
    eyebrowKey: 'decision.eyebrow',
    titleKey: 'decision.title.cps',
    leadKey: 'decision.lead.cps',
    approveKey: null,
    canReject: false,
    canReturn: false,
    canRecordRemission: false,
    needsLegalReference: false,
  },
};

export function stageFor(role: UserRole): StageConfig | null {
  return role in STAGES ? STAGES[role as StageRole] : null;
}

/** The approve/reject/return form is only used by the four approval roles. */
export function isDecisionStage(role: UserRole): role is DecisionRole {
  return (decisionRoles as UserRole[]).includes(role);
}

/** Sidebar path to the request list view it renders. */
export const stageViews: Record<string, string> = {
  decisions: 'decisions',
  'decision-history': 'decision-history',
  'work-queue': 'work-queue',
  assignments: 'assignments',
  returned: 'returned',
};
