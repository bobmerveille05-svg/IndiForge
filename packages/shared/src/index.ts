/**
 * Core domain types for IndiForge
 * Shared across frontend, backend, and core packages
 */

// ============= User & Auth =============

export interface User {
  id: string;
  email: string;
  displayName: string;
  authProvider: 'email' | 'google';
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
  lastLoginAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  provider: 'stripe' | 'paddle';
  planCode: 'starter' | 'pro' | 'team';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  quotaJson: string; // JSON string of quota limits
}

// ============= Project & Indicator =============

export type ProjectVisibility = 'private' | 'unlisted' | 'public';
export type ProjectStatus = 'draft' | 'published';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IndicatorCategory = 
  | 'trend' 
  | 'momentum' 
  | 'volatility' 
  | 'breakout' 
  | 'mean_reversion'
  | 'volume'
  | 'custom';

export type DisplayType = 'overlay' | 'separate_pane';

export type TargetPlatform = 'pinescript_v5' | 'mql5' | 'mql4' | 'ninjatrader_8';

export interface IndicatorDefinition {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: IndicatorCategory;
  displayType: DisplayType;
  selectedPlatforms: TargetPlatform[];
  currentDraftGraphJson: string; // JSON string of VisualGraph
  latestSemanticHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndicatorVersion {
  id: string;
  indicatorDefinitionId: string;
  versionNumber: number;
  visualGraphJson: string;
  canonicalIrJson: string;
  validationReportJson: string;
  generatorVersion: string;
  createdBy: string;
  changeNote: string;
  createdAt: Date;
}

// ============= Export =============

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportJob {
  id: string;
  versionId: string;
  targetPlatform: TargetPlatform;
  targetVersion: string;
  status: ExportStatus;
  warningsJson: string;
  artifactKey: string;
  checksum: string;
  requestedAt: Date;
  completedAt: Date | null;
}

// ============= Templates =============

export type TemplateScope = 'personal' | 'official' | 'community';

export interface Template {
  id: string;
  createdBy: string;
  sourceVersionId: string | null;
  scope: TemplateScope;
  title: string;
  description: string;
  tags: string[];
  isFeatured: boolean;
  createdAt: Date;
}

// ============= Sharing =============

export type ShareMode = 'view' | 'clone' | 'edit';

export interface SharedAsset {
  id: string;
  assetType: 'project' | 'template';
  assetId: string;
  ownerId: string;
  shareMode: ShareMode;
  shareToken: string;
  allowClone: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

// ============= Audit =============

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson: string;
  ipHash: string;
  createdAt: Date;
}

// ============= Visual Graph Types =============

export type NodeCategory = 
  | 'data' 
  | 'inputs' 
  | 'indicators' 
  | 'math' 
  | 'logic' 
  | 'conditions' 
  | 'outputs' 
  | 'alerts';

export type ValueType = 'series<float>' | 'scalar<float>' | 'bool' | 'color' | 'style';

export interface VisualNode {
  id: string;
  category: NodeCategory;
  type: string;
  label: string;
  position: { x: number; y: number };
  params: Record<string, unknown>;
  outputType: ValueType;
  platformSupport: Record<TargetPlatform, 'supported' | 'approximated' | 'unsupported'>;
}

export interface VisualConnection {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
}

export interface VisualGraph {
  id: string;
  name: string;
  nodes: VisualNode[];
  connections: VisualConnection[];
  swimlanes: string[];
  viewport: { x: number; y: number; zoom: number };
}

// ============= Canonical IR Types =============

export type IrNodeType =
  | 'data'
  | 'input'
  | 'indicator'
  | 'math'
  | 'comparison'
  | 'logic'
  | 'condition'
  | 'output'
  | 'alert';

export interface IrNode {
  id: string;
  type: IrNodeType;
  operation: string;
  inputs: IrValue[];
  params: Record<string, unknown>;
  outputType: ValueType;
}

export type IrValue = 
  | { type: 'node'; nodeId: string }
  | { type: 'constant'; value: number | boolean | string };

export interface IrGraph {
  version: string;
  meta: {
    name: string;
    description: string;
    displayType: DisplayType;
    platforms: TargetPlatform[];
  };
  inputs: IrInput[];
  nodes: IrNode[];
  outputs: IrOutput[];
  alerts: IrAlert[];
  constraints: IrConstraints;
}

export interface IrInput {
  name: string;
  type: ValueType;
  default: number | boolean | string;
  min?: number;
  max?: number;
  exposed: boolean;
}

export interface IrOutput {
  name: string;
  plotType: 'line' | 'histogram' | 'shape' | 'hline' | 'band';
  style: Record<string, unknown>;
}

export interface IrAlert {
  condition: IrValue;
  message: string;
  enabled: boolean;
}

export interface IrConstraints {
  lookbackRequired: number;
  warmupBars: number;
  unsupportedPlatforms: TargetPlatform[];
  approximations: Record<string, string>;
}

// ============= Validation =============

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  nodeId?: string;
  details?: Record<string, unknown>;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  compatibilityMatrix: Record<TargetPlatform, 'compatible' | 'warnings' | 'incompatible'>;
}

// ============= Code Generation =============

export interface GeneratedCode {
  platform: TargetPlatform;
  version: string;
  code: string;
  warnings: string[];
  manifest: CodeManifest;
}

export interface CodeManifest {
  generatorVersion: string;
  semanticHash: string;
  generatedAt: string;
  inputs: IrInput[];
  outputs: IrOutput[];
  dependencies: string[];
}