/**
 * Resource Ledger 共享契约。
 *
 * 职责：
 * - 定义 Resource Ledger Snapshot 类型，供 Agent Runtime 与 WorkflowService 之间
 *   显式交换跨 task 的资源状态（已披露的 Skill 与 Skill Reference）。
 *
 * 不负责：运行时 Resource Ledger 的正文（运行时 ledger 在 agent 包内，见 runtime/resource-ledger）。
 *
 * 注意：
 * - Snapshot 只保存资源键与元信息，不保存 Skill 或 Skill Reference 正文。
 * - 正文在每次 workflow task 运行前由 Agent Runtime 依据 enabledSkills 重新 hydrate，
 *   而不是从数据库元数据中读取。
 */

/** Resource Ledger 中已披露 Skill 的快照条目（不含正文）。 */
export interface ResourceLedgerSkillEntry {
  /** 资源键，格式 `skill:<skillId>`，作为 ledger 内唯一标识。 */
  key: string;
  /** Skill 唯一 ID。 */
  skillId: string;
  /** Skill 名称，用于展示与诊断。 */
  name: string;
}

/** Resource Ledger 中已披露 Skill Reference 的快照条目（不含正文）。 */
export interface ResourceLedgerSkillReferenceEntry {
  /** 资源键，格式 `reference:<skillId>:<referenceId>`，作为 ledger 内唯一标识。 */
  key: string;
  /** 所属 Skill 唯一 ID。 */
  skillId: string;
  /** 所属 Skill 名称。 */
  skillName: string;
  /** Reference 在所属 Skill 内的唯一 ID。 */
  referenceId: string;
  /** Reference 标题。 */
  title: string;
}

/**
 * Resource Ledger Snapshot：只存资源键与元信息，正文由 enabledSkills hydrate。
 *
 * 该结构存放在 AgentWorkflow.metadata.resourceLedger，跨 task 共享。
 */
export interface ResourceLedgerSnapshot {
  /** 已披露 Skill 条目，按披露顺序排列。 */
  skills: ResourceLedgerSkillEntry[];
  /** 已披露 Skill Reference 条目，按披露顺序排列。 */
  skillReferences: ResourceLedgerSkillReferenceEntry[];
}
