import { useMemo, useRef, useState } from 'react'
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Plus, Search, Trash2, Save, X, Upload, AlertCircle, CheckCircle, FileSpreadsheet,
} from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import type { BreakdownNode } from '../../types/setup'

export type BreakdownType = 'wbs' | 'cbs' | 'packages'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const WBS_NODES: BreakdownNode[] = [
  { id: 'w1',   code: '1',     description: 'Project Management',              level: 0, sort_order: 10, parent_code: null,  account_count: 18,  cost_budget: 12_400_000 },
  { id: 'w11',  code: '1.1',   description: 'Project Controls & Reporting',    level: 1, sort_order: 10, parent_code: '1',   account_count: 8,   cost_budget: 5_800_000 },
  { id: 'w12',  code: '1.2',   description: 'HSSE Management',                 level: 1, sort_order: 20, parent_code: '1',   account_count: 10,  cost_budget: 6_600_000 },
  { id: 'w2',   code: '2',     description: 'Engineering',                     level: 0, sort_order: 20, parent_code: null,  account_count: 62,  cost_budget: 38_500_000 },
  { id: 'w21',  code: '2.1',   description: 'Process Engineering',             level: 1, sort_order: 10, parent_code: '2',   account_count: 12,  cost_budget: 7_200_000 },
  { id: 'w22',  code: '2.2',   description: 'Civil & Structural Engineering',  level: 1, sort_order: 20, parent_code: '2',   account_count: 14,  cost_budget: 8_900_000 },
  { id: 'w221', code: '2.2.1', description: 'Civil Design',                    level: 2, sort_order: 10, parent_code: '2.2', account_count: 7,   cost_budget: 4_200_000 },
  { id: 'w222', code: '2.2.2', description: 'Structural Design',               level: 2, sort_order: 20, parent_code: '2.2', account_count: 7,   cost_budget: 4_700_000 },
  { id: 'w23',  code: '2.3',   description: 'Mechanical Engineering',          level: 1, sort_order: 30, parent_code: '2',   account_count: 18,  cost_budget: 12_200_000 },
  { id: 'w231', code: '2.3.1', description: 'Static Equipment Design',         level: 2, sort_order: 10, parent_code: '2.3', account_count: 9,   cost_budget: 6_500_000 },
  { id: 'w232', code: '2.3.2', description: 'Rotating Equipment Design',       level: 2, sort_order: 20, parent_code: '2.3', account_count: 9,   cost_budget: 5_700_000 },
  { id: 'w24',  code: '2.4',   description: 'Electrical Engineering',          level: 1, sort_order: 40, parent_code: '2',   account_count: 10,  cost_budget: 6_300_000 },
  { id: 'w25',  code: '2.5',   description: 'Instrumentation & Controls',      level: 1, sort_order: 50, parent_code: '2',   account_count: 8,   cost_budget: 3_900_000 },
  { id: 'w3',   code: '3',     description: 'Procurement',                     level: 0, sort_order: 30, parent_code: null,  account_count: 34,  cost_budget: 95_000_000 },
  { id: 'w31',  code: '3.1',   description: 'Major Equipment Supply',          level: 1, sort_order: 10, parent_code: '3',   account_count: 16,  cost_budget: 68_000_000 },
  { id: 'w32',  code: '3.2',   description: 'Bulk Materials Supply',           level: 1, sort_order: 20, parent_code: '3',   account_count: 18,  cost_budget: 27_000_000 },
  { id: 'w4',   code: '4',     description: 'Construction',                    level: 0, sort_order: 40, parent_code: null,  account_count: 72,  cost_budget: 88_000_000 },
  { id: 'w41',  code: '4.1',   description: 'Site Preparation & Earthworks',   level: 1, sort_order: 10, parent_code: '4',   account_count: 10,  cost_budget: 9_500_000 },
  { id: 'w42',  code: '4.2',   description: 'Civil & Foundation Works',        level: 1, sort_order: 20, parent_code: '4',   account_count: 14,  cost_budget: 16_200_000 },
  { id: 'w43',  code: '4.3',   description: 'Structural Steel Erection',       level: 1, sort_order: 30, parent_code: '4',   account_count: 12,  cost_budget: 18_500_000 },
  { id: 'w44',  code: '4.4',   description: 'Mechanical Equipment Installation', level: 1, sort_order: 40, parent_code: '4', account_count: 20, cost_budget: 28_200_000 },
  { id: 'w45',  code: '4.5',   description: 'Electrical & I&C Installation',   level: 1, sort_order: 50, parent_code: '4',   account_count: 16,  cost_budget: 15_600_000 },
  { id: 'w5',   code: '5',     description: 'Commissioning & Startup',         level: 0, sort_order: 50, parent_code: null,  account_count: 24,  cost_budget: 14_800_000 },
  { id: 'w51',  code: '5.1',   description: 'Pre-Commissioning Activities',    level: 1, sort_order: 10, parent_code: '5',   account_count: 8,   cost_budget: 4_200_000 },
  { id: 'w52',  code: '5.2',   description: 'Commissioning',                   level: 1, sort_order: 20, parent_code: '5',   account_count: 10,  cost_budget: 6_800_000 },
  { id: 'w53',  code: '5.3',   description: 'Performance Testing & Handover',  level: 1, sort_order: 30, parent_code: '5',   account_count: 6,   cost_budget: 3_800_000 },
  { id: 'w6',   code: '6',     description: 'Contingency & Allowances',        level: 0, sort_order: 60, parent_code: null,  account_count: 6,   cost_budget: 25_000_000 },
]

const CBS_NODES: BreakdownNode[] = [
  { id: 'c1',   code: '1',   description: 'Labor Costs',                      level: 0, sort_order: 10, parent_code: null, account_count: 45,  cost_budget: 28_500_000 },
  { id: 'c11',  code: '1.1', description: 'Staff & Management Labor',         level: 1, sort_order: 10, parent_code: '1',  account_count: 12,  cost_budget: 8_200_000 },
  { id: 'c12',  code: '1.2', description: 'Direct Field Labor',               level: 1, sort_order: 20, parent_code: '1',  account_count: 22,  cost_budget: 14_500_000 },
  { id: 'c13',  code: '1.3', description: 'Labor Supervision',                level: 1, sort_order: 30, parent_code: '1',  account_count: 11,  cost_budget: 5_800_000 },
  { id: 'c2',   code: '2',   description: 'Materials & Equipment',            level: 0, sort_order: 20, parent_code: null, account_count: 68,  cost_budget: 125_000_000 },
  { id: 'c21',  code: '2.1', description: 'Bulk Materials',                   level: 1, sort_order: 10, parent_code: '2',  account_count: 28,  cost_budget: 32_000_000 },
  { id: 'c22',  code: '2.2', description: 'Major Equipment',                  level: 1, sort_order: 20, parent_code: '2',  account_count: 24,  cost_budget: 78_000_000 },
  { id: 'c23',  code: '2.3', description: 'Vendor Spares & Consumables',      level: 1, sort_order: 30, parent_code: '2',  account_count: 16,  cost_budget: 15_000_000 },
  { id: 'c3',   code: '3',   description: 'Subcontracts',                     level: 0, sort_order: 30, parent_code: null, account_count: 54,  cost_budget: 72_000_000 },
  { id: 'c31',  code: '3.1', description: 'Civil & Structural Subcontracts',  level: 1, sort_order: 10, parent_code: '3',  account_count: 18,  cost_budget: 24_000_000 },
  { id: 'c32',  code: '3.2', description: 'Mechanical Subcontracts',          level: 1, sort_order: 20, parent_code: '3',  account_count: 20,  cost_budget: 28_000_000 },
  { id: 'c33',  code: '3.3', description: 'Electrical & I&C Subcontracts',    level: 1, sort_order: 30, parent_code: '3',  account_count: 16,  cost_budget: 20_000_000 },
  { id: 'c4',   code: '4',   description: 'Engineering & PM Fees',            level: 0, sort_order: 40, parent_code: null, account_count: 22,  cost_budget: 23_500_000 },
  { id: 'c41',  code: '4.1', description: 'Engineering Services',             level: 1, sort_order: 10, parent_code: '4',  account_count: 8,   cost_budget: 8_800_000 },
  { id: 'c42',  code: '4.2', description: 'Project Management Services',      level: 1, sort_order: 20, parent_code: '4',  account_count: 8,   cost_budget: 9_200_000 },
  { id: 'c43',  code: '4.3', description: 'Procurement Management',           level: 1, sort_order: 30, parent_code: '4',  account_count: 6,   cost_budget: 5_500_000 },
  { id: 'c5',   code: '5',   description: 'Contingency & Reserve',            level: 0, sort_order: 50, parent_code: null, account_count: 5,   cost_budget: 25_000_000 },
  { id: 'c51',  code: '5.1', description: 'Base Contingency',                 level: 1, sort_order: 10, parent_code: '5',  account_count: 3,   cost_budget: 18_000_000 },
  { id: 'c52',  code: '5.2', description: 'Management Reserve',               level: 1, sort_order: 20, parent_code: '5',  account_count: 2,   cost_budget: 7_000_000 },
]

// Packages — top 5 groups are locked (isLocked: handled by code prefix P1–P5 with no dot)
// Packages under each group are user-managed
const PKG_NODES: BreakdownNode[] = [
  { id: 'pk1',   code: 'P1',    description: 'PMT',                               level: 0, sort_order: 10, parent_code: null, account_count: 18,  cost_budget: 12_400_000 },
  { id: 'pk11',  code: 'P1.01', description: 'Project Controls',                  level: 1, sort_order: 10, parent_code: 'P1', account_count: 5,   cost_budget: 3_200_000 },
  { id: 'pk12',  code: 'P1.02', description: 'Cost Engineering',                  level: 1, sort_order: 20, parent_code: 'P1', account_count: 6,   cost_budget: 4_800_000 },
  { id: 'pk13',  code: 'P1.03', description: 'HSSE Management',                   level: 1, sort_order: 30, parent_code: 'P1', account_count: 7,   cost_budget: 4_400_000 },
  { id: 'pk2',   code: 'P2',    description: 'Engineering & Design',              level: 0, sort_order: 20, parent_code: null, account_count: 62,  cost_budget: 38_500_000 },
  { id: 'pk21',  code: 'P2.01', description: 'Process Engineering Package',       level: 1, sort_order: 10, parent_code: 'P2', account_count: 12,  cost_budget: 7_200_000 },
  { id: 'pk22',  code: 'P2.02', description: 'Civil & Structural Package',        level: 1, sort_order: 20, parent_code: 'P2', account_count: 14,  cost_budget: 8_900_000 },
  { id: 'pk23',  code: 'P2.03', description: 'Mechanical Engineering Package',    level: 1, sort_order: 30, parent_code: 'P2', account_count: 18,  cost_budget: 12_200_000 },
  { id: 'pk24',  code: 'P2.04', description: 'Electrical Engineering Package',    level: 1, sort_order: 40, parent_code: 'P2', account_count: 10,  cost_budget: 6_300_000 },
  { id: 'pk25',  code: 'P2.05', description: 'I&C Engineering Package',           level: 1, sort_order: 50, parent_code: 'P2', account_count: 8,   cost_budget: 3_900_000 },
  { id: 'pk3',   code: 'P3',    description: 'Procurement',                       level: 0, sort_order: 30, parent_code: null, account_count: 34,  cost_budget: 95_000_000 },
  { id: 'pk31',  code: 'P3.01', description: 'Major Equipment Package',           level: 1, sort_order: 10, parent_code: 'P3', account_count: 16,  cost_budget: 68_000_000 },
  { id: 'pk32',  code: 'P3.02', description: 'Bulk Materials Package',            level: 1, sort_order: 20, parent_code: 'P3', account_count: 10,  cost_budget: 18_000_000 },
  { id: 'pk33',  code: 'P3.03', description: 'Subcontracts Package',              level: 1, sort_order: 30, parent_code: 'P3', account_count: 8,   cost_budget: 9_000_000 },
  { id: 'pk4',   code: 'P4',    description: 'Construction',                      level: 0, sort_order: 40, parent_code: null, account_count: 84,  cost_budget: 102_800_000 },
  { id: 'pk41',  code: 'P4.01', description: 'Civil & Foundation Package',        level: 1, sort_order: 10, parent_code: 'P4', account_count: 24,  cost_budget: 25_700_000 },
  { id: 'pk42',  code: 'P4.02', description: 'Structural Steel Package',          level: 1, sort_order: 20, parent_code: 'P4', account_count: 12,  cost_budget: 18_500_000 },
  { id: 'pk43',  code: 'P4.03', description: 'Mechanical Installation Package',   level: 1, sort_order: 30, parent_code: 'P4', account_count: 20,  cost_budget: 28_200_000 },
  { id: 'pk44',  code: 'P4.04', description: 'Electrical & I&C Package',          level: 1, sort_order: 40, parent_code: 'P4', account_count: 16,  cost_budget: 15_600_000 },
  { id: 'pk45',  code: 'P4.05', description: 'Commissioning Package',             level: 1, sort_order: 50, parent_code: 'P4', account_count: 12,  cost_budget: 14_800_000 },
  { id: 'pk5',   code: 'P5',    description: 'Allowances & Contingencies',        level: 0, sort_order: 50, parent_code: null, account_count: 6,   cost_budget: 25_000_000 },
  { id: 'pk51',  code: 'P5.01', description: 'Base Contingency',                  level: 1, sort_order: 10, parent_code: 'P5', account_count: 3,   cost_budget: 18_000_000 },
  { id: 'pk52',  code: 'P5.02', description: 'Management Reserve',                level: 1, sort_order: 20, parent_code: 'P5', account_count: 2,   cost_budget: 7_000_000 },
]

// Locked group-level codes for packages (cannot be deleted or re-parented)
const PKG_LOCKED = new Set(['P1', 'P2', 'P3', 'P4', 'P5'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtBudget(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

const MOCK_ACCT_DESCS = [
  'Engineering & Design Services',
  'Labor — Site Personnel',
  'Supervision & Management',
  'Materials — Bulk Supply',
  'Equipment — Purchase Order',
  'Subcontract Services',
  'Quality Assurance & Testing',
  'Temporary Facilities',
]

function getMockAccounts(node: BreakdownNode) {
  const show = Math.min(node.account_count, 5)
  const perAcct = node.cost_budget / node.account_count
  return Array.from({ length: show }, (_, i) => ({
    code: `${node.code}.${String(i + 1).padStart(2, '0')}`,
    description: MOCK_ACCT_DESCS[i % MOCK_ACCT_DESCS.length],
    budget: Math.round(perAcct * (0.75 + i * 0.08)),
  }))
}

function navLabel(type: BreakdownType): string {
  if (type === 'wbs')      return 'Work Breakdown Structure'
  if (type === 'cbs')      return 'Cost Breakdown Structure'
  return 'Packages'
}

function nodeLabel(type: BreakdownType): string {
  if (type === 'wbs')      return 'WBS Node'
  if (type === 'cbs')      return 'CBS Node'
  return 'Package'
}

// ---------------------------------------------------------------------------
// Shared button styles
// ---------------------------------------------------------------------------

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22, height: 22, flexShrink: 0,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
        color: disabled ? 'var(--ink-muted)' : 'var(--ink-2)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

const btnBase: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
  color: 'var(--ink-2)', fontSize: 11, padding: '2px 7px',
  display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
}

// ---------------------------------------------------------------------------
// Add Node modal
// ---------------------------------------------------------------------------

interface AddNodeModalProps {
  nodes: BreakdownNode[]
  structureType: BreakdownType
  onClose: () => void
  onAdd: (node: BreakdownNode) => void
}

function AddNodeModal({ nodes, structureType, onClose, onAdd }: AddNodeModalProps) {
  const [parentCode, setParentCode] = useState<string>('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('10')

  // For packages, only group-level nodes (level 0) can be parents
  const validParents = structureType === 'packages'
    ? nodes.filter(n => n.level === 0)
    : nodes

  // Derive level and suggest next code based on parent selection
  const parentNode = nodes.find(n => n.code === parentCode)
  const level = parentNode ? parentNode.level + 1 : 0

  const suggestedCode = () => {
    if (!parentCode) {
      // Root node: suggest next number
      const roots = nodes.filter(n => n.parent_code === null)
      return structureType === 'packages' ? `P${roots.length + 1}` : String(roots.length + 1)
    }
    const siblings = nodes.filter(n => n.parent_code === parentCode)
    const sep = structureType === 'packages' ? '.' : '.'
    return `${parentCode}${sep}${String(siblings.length + 1).padStart(structureType === 'packages' ? 2 : 1, '0')}`
  }

  const handleAdd = () => {
    if (!code.trim() || !description.trim()) return
    const newNode: BreakdownNode = {
      id: `new-${Date.now()}`,
      code: code.trim(),
      description: description.trim(),
      level,
      sort_order: parseInt(sortOrder) || 10,
      parent_code: parentCode || null,
      account_count: 0,
      cost_budget: 0,
    }
    onAdd(newNode)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 3, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}>
          <span className="text-[12px] font-semibold">Add {nodeLabel(structureType)}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--panel-header-ink)', opacity: 0.6 }}><X size={14} /></button>
        </div>

        <div className="px-5 py-4 grid gap-3" style={{ gridTemplateColumns: '120px 1fr' }}>
          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Parent Node</label>
          <select
            value={parentCode}
            onChange={e => { setParentCode(e.target.value); setCode('') }}
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 6px', fontSize: 11, color: 'var(--ink-1)', cursor: 'pointer' }}
          >
            <option value="">— Root (top level) —</option>
            {validParents.map(n => (
              <option key={n.id} value={n.code}>{n.code} — {n.description}</option>
            ))}
          </select>

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>
            Code
            <span className="ml-1 text-[9px]" style={{ color: 'var(--ink-muted)' }}>(required)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={suggestedCode()}
              className="num text-[11px] px-2 py-1.5 outline-none flex-1"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--ink-1)' }}
            />
            <button
              onClick={() => setCode(suggestedCode())}
              className="text-[10px]"
              style={{ ...btnBase, flexShrink: 0, padding: '2px 8px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              Suggest
            </button>
          </div>

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>
            Description
            <span className="ml-1 text-[9px]" style={{ color: 'var(--ink-muted)' }}>(required)</span>
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter description…"
            className="text-[11px] px-2 py-1.5 outline-none"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--ink-1)' }}
          />

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Level</label>
          <div className="text-[11px] flex items-center" style={{ color: 'var(--ink-muted)' }}>
            {level} — {['Top Level', 'Level 1', 'Level 2', 'Level 3'][level] ?? `Level ${level}`}
          </div>

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Sort Order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="num text-[11px] px-2 py-1.5 outline-none w-24"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--ink-1)' }}
          />
        </div>

        <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ ...btnBase, padding: '4px 12px' }}>Cancel</button>
          <button
            onClick={handleAdd}
            disabled={!code.trim() || !description.trim()}
            style={{
              background: code.trim() && description.trim() ? 'var(--accent)' : 'var(--surface)',
              color: code.trim() && description.trim() ? '#fff' : 'var(--ink-muted)',
              border: `1px solid ${code.trim() && description.trim() ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 2, fontSize: 11, padding: '4px 16px',
              cursor: code.trim() && description.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Plus size={11} />Add Node
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Import from CSV/Excel modal
// ---------------------------------------------------------------------------

interface ImportRow { code: string; description: string; parent_code: string; sort_order: string; status: 'ok' | 'error'; message?: string }

function parseImportCSV(text: string, existingCodes: Set<string>): ImportRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const codeIdx = header.indexOf('code')
  const descIdx = header.indexOf('description')
  const parentIdx = header.indexOf('parent_code')
  const sortIdx = header.indexOf('sort_order')
  if (codeIdx < 0 || descIdx < 0) return []

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const code = cols[codeIdx] ?? ''
    const desc = cols[descIdx] ?? ''
    const rawParent = parentIdx >= 0 ? (cols[parentIdx] ?? '') : ''
    const parent = rawParent || (code.includes('.') ? code.slice(0, code.lastIndexOf('.')) : '')
    const sort = sortIdx >= 0 ? (cols[sortIdx] ?? '10') : '10'
    let status: 'ok' | 'error' = 'ok'
    let message: string | undefined
    if (!code) { status = 'error'; message = 'Missing code' }
    else if (!desc) { status = 'error'; message = 'Missing description' }
    else if (existingCodes.has(code)) { status = 'error'; message = 'Code already exists' }
    return { code, description: desc, parent_code: parent, sort_order: sort, status, message }
  })
}

interface ImportModalProps {
  nodes: BreakdownNode[]
  structureType: BreakdownType
  onClose: () => void
  onImport: (rows: BreakdownNode[]) => void
}

function ImportHierarchyModal({ nodes, structureType, onClose, onImport }: ImportModalProps) {
  const [preview, setPreview] = useState<ImportRow[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const existingCodes = useMemo(() => new Set(nodes.map(n => n.code)), [nodes])

  const EXAMPLE = `code,description,parent_code,sort_order\n2.6,Environmental Engineering,2,60\n2.6.1,Environmental Impact,2.6,10\n2.6.2,Remediation,2.6,20`

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setPreview(parseImportCSV((e.target?.result as string) ?? '', existingCodes))
    reader.readAsText(file)
  }

  const errorCount = preview?.filter(r => r.status === 'error').length ?? 0
  const okCount    = preview?.filter(r => r.status === 'ok').length ?? 0

  const handleImport = () => {
    if (!preview || errorCount > 0) return
    const newNodes: BreakdownNode[] = preview
      .filter(r => r.status === 'ok')
      .map((r, i) => {
        const parentNode = nodes.find(n => n.code === r.parent_code)
        return {
          id: `imported-${Date.now()}-${i}`,
          code: r.code,
          description: r.description,
          level: parentNode ? parentNode.level + 1 : 0,
          sort_order: parseInt(r.sort_order) || 10,
          parent_code: r.parent_code || null,
          account_count: 0,
          cost_budget: 0,
        }
      })
    onImport(newNodes)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 3, width: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}>
          <span className="text-[12px] font-semibold">Import {navLabel(structureType)} from CSV / Excel</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--panel-header-ink)', opacity: 0.6 }}><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Format guide */}
          <div>
            <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>CSV Format</div>
            <pre style={{ background: '#F0F0E8', border: '1px solid var(--border-strong)', borderRadius: 2, padding: '8px 12px', fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--ink-2)', margin: 0, overflowX: 'auto' }}>
              {EXAMPLE}
            </pre>
            <div className="text-[10px] mt-1" style={{ color: 'var(--ink-muted)' }}>
              parent_code is optional — it will be derived from the dotted code if omitted.
            </div>
          </div>

          {/* File picker */}
          <div
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
            style={{ border: '2px dashed var(--border-strong)', borderRadius: 3, background: 'var(--surface-alt)' }}
          >
            <FileSpreadsheet size={18} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
            <span className="text-[11.5px]" style={{ color: 'var(--ink-2)' }}>
              {fileName ?? 'Click to select CSV file…'}
            </span>
            {fileName && (
              <button
                onClick={e => { e.stopPropagation(); setFileName(null); setPreview(null) }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
              >
                <X size={12} />
              </button>
            )}
            <input ref={inputRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {/* Preview */}
          {preview && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--ink-2)' }}>Preview — {preview.length} rows</span>
                {okCount > 0    && <span className="text-[10.5px]" style={{ color: 'var(--ink-positive)' }}><CheckCircle size={10} style={{ display: 'inline', marginRight: 3 }} />{okCount} valid</span>}
                {errorCount > 0 && <span className="text-[10.5px]" style={{ color: 'var(--ink-negative)' }}><AlertCircle size={10} style={{ display: 'inline', marginRight: 3 }} />{errorCount} errors</span>}
              </div>
              <div style={{ border: '1px solid var(--border-strong)', borderRadius: 2, overflow: 'hidden' }}>
                <div className="grid" style={{ gridTemplateColumns: '16px 90px 1fr 90px 52px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                  <div style={{ padding: '3px 4px' }} />
                  <div style={{ padding: '3px 8px', borderLeft: '1px solid var(--border)' }}>Code</div>
                  <div style={{ padding: '3px 8px', borderLeft: '1px solid var(--border)' }}>Description</div>
                  <div style={{ padding: '3px 8px', borderLeft: '1px solid var(--border)' }}>Parent</div>
                  <div style={{ padding: '3px 8px', borderLeft: '1px solid var(--border)' }}>Sort</div>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {preview.map((row, i) => (
                    <div key={i} className="grid items-center" style={{ gridTemplateColumns: '16px 90px 1fr 90px 52px', borderBottom: '1px solid var(--border)', background: row.status === 'error' ? 'rgba(164,50,43,0.06)' : 'transparent' }}>
                      <div style={{ padding: '3px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {row.status === 'ok'    ? <CheckCircle size={9} style={{ color: 'var(--ink-positive)' }} /> : <AlertCircle size={9} style={{ color: 'var(--ink-negative)' }} />}
                      </div>
                      <div className="num truncate" style={{ padding: '3px 8px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', borderLeft: '1px solid var(--border)' }}>{row.code}</div>
                      <div className="truncate" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--ink-1)', borderLeft: '1px solid var(--border)' }}>
                        {row.description}
                        {row.message && <span style={{ fontSize: 9.5, color: 'var(--ink-negative)', marginLeft: 6 }}>· {row.message}</span>}
                      </div>
                      <div className="num truncate" style={{ padding: '3px 8px', fontSize: 10.5, color: 'var(--ink-3)', borderLeft: '1px solid var(--border)' }}>{row.parent_code || '—'}</div>
                      <div className="num" style={{ padding: '3px 8px', fontSize: 10.5, color: 'var(--ink-3)', borderLeft: '1px solid var(--border)' }}>{row.sort_order}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ ...btnBase, padding: '4px 12px' }}>Cancel</button>
          <button
            onClick={handleImport}
            disabled={!preview || errorCount > 0}
            style={{
              background: preview && errorCount === 0 ? 'var(--accent)' : 'var(--surface)',
              color: preview && errorCount === 0 ? '#fff' : 'var(--ink-muted)',
              border: `1px solid ${preview && errorCount === 0 ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 2, fontSize: 11, padding: '4px 16px',
              cursor: preview && errorCount === 0 ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Upload size={11} />Import {okCount > 0 ? `${okCount} Nodes` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left nav panel
// ---------------------------------------------------------------------------

interface NavProps {
  structureType: BreakdownType
  visible: BreakdownNode[]
  selectedCode: string | null
  visibleIdx: number
  totalCount: number
  search: string
  setSearch: (s: string) => void
  expanded: Set<string>
  hasChildren: Set<string>
  onSelect: (code: string) => void
  onToggle: (code: string) => void
  onNavigate: (delta: number) => void
  onAdd: () => void
  onImport: () => void
}

function BreakdownNavPanel({
  structureType, visible, selectedCode, visibleIdx, totalCount,
  search, setSearch, expanded, hasChildren, onSelect, onToggle, onNavigate,
  onAdd, onImport,
}: NavProps) {
  const storageKey = `nav_setup_${structureType}_width`
  const [width, setWidth] = useLocalState<number>(storageKey, 380)

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const onMove = (ev: MouseEvent) => setWidth(Math.max(220, Math.min(700, startW + ev.clientX - startX)))
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{ width, position: 'relative', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      <div
        onMouseDown={startResize}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', zIndex: 10, background: 'transparent', transition: 'background 120ms' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      />

      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0" style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}>
        {navLabel(structureType)} — Navigation
      </div>

      <div className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0 flex-wrap" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
        <span className="num text-[10.5px] mr-1 flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
          {visibleIdx + 1} of {totalCount}
        </span>
        <NavBtn onClick={() => onNavigate(-visibleIdx)} disabled={visibleIdx <= 0}><ChevronsLeft size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(-1)} disabled={visibleIdx <= 0}><ChevronLeft size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(1)} disabled={visibleIdx >= visible.length - 1}><ChevronRight size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(visible.length - 1 - visibleIdx)} disabled={visibleIdx >= visible.length - 1}><ChevronsRight size={11} /></NavBtn>
        <div className="flex-1" />
        <button style={{ ...btnBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', fontWeight: 600 }} onClick={onAdd}>
          <Plus size={10} />Add
        </button>
        <button style={btnBase} title="Delete selected node"><Trash2 size={10} />Delete</button>
        <button style={btnBase} onClick={onImport} title="Import from CSV / Excel">
          <FileSpreadsheet size={10} />Import
        </button>
      </div>

      <div className="px-2 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-2 py-1" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2 }}>
          <Search size={11} style={{ color: 'var(--ink-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…"
            className="bg-transparent border-0 outline-none flex-1 text-[11px]"
            style={{ color: 'var(--ink-1)' }}
          />
        </div>
      </div>

      <div className="grid flex-shrink-0" style={{ gridTemplateColumns: '80px 1fr 52px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        <div style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>Code</div>
        <div style={{ padding: '4px 8px' }}>Description</div>
        <div style={{ padding: '4px 8px', textAlign: 'right', borderLeft: '1px solid var(--border)' }}>Accts</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.map(node => (
          <BreakdownNavRow
            key={node.id}
            node={node}
            isSelected={node.code === selectedCode}
            isExpanded={expanded.has(node.code)}
            hasChildren={hasChildren.has(node.code)}
            isLocked={structureType === 'packages' && PKG_LOCKED.has(node.code)}
            onSelect={() => onSelect(node.code)}
            onToggle={() => onToggle(node.code)}
          />
        ))}
      </div>
    </div>
  )
}

interface RowProps {
  node: BreakdownNode
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  isLocked: boolean
  onSelect: () => void
  onToggle: () => void
}

function BreakdownNavRow({ node, isSelected, isExpanded, hasChildren, isLocked, onSelect, onToggle }: RowProps) {
  return (
    <div
      onClick={onSelect}
      className="grid items-center cursor-pointer"
      style={{
        gridTemplateColumns: '80px 1fr 52px',
        borderBottom: '1px solid var(--border)',
        background: isSelected ? 'var(--accent-soft)' : node.level === 0 ? '#F0F0E8' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
        minHeight: 26,
      }}
    >
      <div
        className="num truncate flex items-center gap-1"
        style={{ padding: '3px 8px', fontSize: 11, color: isSelected ? 'var(--accent)' : 'var(--ink-2)', fontWeight: node.level === 0 ? 700 : 500, borderRight: '1px solid var(--border)' }}
      >
        {node.code}
        {isLocked && <span style={{ fontSize: 8, color: 'var(--ink-muted)', fontWeight: 400 }}>●</span>}
      </div>

      <div className="flex items-center truncate" style={{ padding: '3px 6px 3px 0', paddingLeft: node.level * 14 + 6 }}>
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); onToggle() }}
            style={{ flexShrink: 0, marginRight: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span style={{ flexShrink: 0, width: 14 }} />
        )}
        <span className="truncate" style={{ fontSize: 11, color: isSelected ? 'var(--accent)' : 'var(--ink-1)', fontWeight: node.level === 0 ? 700 : node.level === 1 ? 500 : 400 }}>
          {node.description}
        </span>
      </div>

      <div className="num" style={{ padding: '3px 8px', fontSize: 10.5, textAlign: 'right', color: isSelected ? 'var(--accent)' : 'var(--ink-3)', borderLeft: '1px solid var(--border)' }}>
        {node.account_count}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Node detail form
// ---------------------------------------------------------------------------

interface DetailProps {
  node: BreakdownNode
  parentNode: BreakdownNode | undefined
  structureType: BreakdownType
  isLocked: boolean
  height: number
}

function NodeDetailPanel({ node, parentNode, structureType, isLocked, height }: DetailProps) {
  const [desc, setDesc] = useState(node.description)
  const [sortOrder, setSortOrder] = useState(String(node.sort_order))
  const [dirty, setDirty] = useState(false)
  const levelLabel = ['Top Level', 'Level 1', 'Level 2', 'Level 3'][node.level] ?? `Level ${node.level}`

  return (
    <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ height, background: 'var(--surface)' }}>
      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0 flex items-center justify-between" style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}>
        <span>{nodeLabel(structureType)} — Detail</span>
        <span className="num font-normal text-[10px]" style={{ color: 'var(--panel-header-ink)', opacity: 0.6 }}>
          {node.code}{isLocked && ' · fixed group'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid gap-x-6 gap-y-2.5" style={{ gridTemplateColumns: '140px 1fr 140px 1fr' }}>
          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Code</label>
          <div className="num text-[12px] font-semibold flex items-center" style={{ color: 'var(--accent)', letterSpacing: '0.02em' }}>{node.code}</div>

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Level</label>
          <div className="text-[11px] flex items-center" style={{ color: 'var(--ink-2)' }}>{node.level} — {levelLabel}</div>

          <label className="text-[11px] font-medium flex items-start pt-1" style={{ color: 'var(--ink-3)' }}>Description</label>
          <input
            value={desc}
            onChange={e => { setDesc(e.target.value); setDirty(true) }}
            disabled={isLocked}
            className="text-[11px] px-2 py-1 outline-none"
            style={{ background: isLocked ? 'var(--app-bg)' : 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: isLocked ? 'var(--ink-muted)' : 'var(--ink-1)', gridColumn: 'span 3', cursor: isLocked ? 'not-allowed' : 'text' }}
          />

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Parent Node</label>
          <div className="text-[11px] flex items-center" style={{ color: 'var(--ink-2)' }}>
            {parentNode ? `${parentNode.code} — ${parentNode.description}` : '— (root node)'}
          </div>

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Sort Order</label>
          <input
            value={sortOrder}
            onChange={e => { setSortOrder(e.target.value); setDirty(true) }}
            type="number"
            disabled={isLocked}
            className="num text-[11px] px-2 py-1 outline-none w-20"
            style={{ background: isLocked ? 'var(--app-bg)' : 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: isLocked ? 'var(--ink-muted)' : 'var(--ink-1)', cursor: isLocked ? 'not-allowed' : 'text' }}
          />

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Cost Accounts</label>
          <div className="num text-[11px] flex items-center gap-3" style={{ color: 'var(--ink-2)' }}>
            <span>{node.account_count} accounts</span>
            {node.cost_budget > 0 && <>
              <span style={{ color: 'var(--ink-3)' }}>·</span>
              <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{fmtBudget(node.cost_budget)}</span>
              <span style={{ color: 'var(--ink-muted)', fontSize: 10 }}>original budget</span>
            </>}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {!isLocked && (
            <>
              <button
                disabled={!dirty}
                style={{ ...btnBase, background: dirty ? 'var(--accent)' : 'var(--surface)', color: dirty ? '#fff' : 'var(--ink-muted)', borderColor: dirty ? 'var(--accent)' : 'var(--border)', cursor: dirty ? 'pointer' : 'default', padding: '3px 10px' }}
                onClick={() => setDirty(false)}
              >
                <Save size={11} />Save Changes
              </button>
              {dirty && (
                <button style={{ ...btnBase, padding: '3px 8px' }} onClick={() => { setDesc(node.description); setSortOrder(String(node.sort_order)); setDirty(false) }}>
                  <X size={11} />Cancel
                </button>
              )}
              <div className="flex-1" />
              <button style={{ ...btnBase, color: 'var(--ink-negative)', borderColor: 'var(--ink-negative)', padding: '3px 10px', opacity: 0.8 }}>
                <Trash2 size={11} />Delete Node
              </button>
            </>
          )}
          {isLocked && (
            <span className="text-[10.5px] italic" style={{ color: 'var(--ink-muted)' }}>
              Fixed group — description and sort order are locked.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Linked accounts panel
// ---------------------------------------------------------------------------

function LinkedAccountsPanel({ node }: { node: BreakdownNode }) {
  const accounts = getMockAccounts(node)
  const hasMore = node.account_count > accounts.length

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-3 py-1.5 flex-shrink-0 flex items-center justify-between" style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)', color: 'var(--ink-2)' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 9.5, color: 'var(--ink-3)' }}>Linked Cost Accounts</span>
        <span className="num" style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 400 }}>{node.account_count} total</span>
      </div>

      <div className="grid flex-shrink-0" style={{ gridTemplateColumns: '110px 1fr 110px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        <div style={{ padding: '4px 10px', borderRight: '1px solid var(--border)' }}>Account Code</div>
        <div style={{ padding: '4px 10px' }}>Description</div>
        <div style={{ padding: '4px 10px', textAlign: 'right', borderLeft: '1px solid var(--border)' }}>Orig. Budget</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {accounts.map(acct => (
          <div key={acct.code} className="grid items-center" style={{ gridTemplateColumns: '110px 1fr 110px', borderBottom: '1px solid var(--border)', minHeight: 24 }}>
            <div className="num truncate" style={{ padding: '3px 10px', fontSize: 11, color: 'var(--ink-2)', fontWeight: 500, borderRight: '1px solid var(--border)' }}>{acct.code}</div>
            <div className="truncate" style={{ padding: '3px 10px', fontSize: 11, color: 'var(--ink-1)' }}>{acct.description}</div>
            <div className="num truncate" style={{ padding: '3px 10px', fontSize: 11, color: 'var(--ink-2)', textAlign: 'right', borderLeft: '1px solid var(--border)' }}>{fmtBudget(acct.budget)}</div>
          </div>
        ))}
        {hasMore && (
          <div className="px-3 py-2 text-[10.5px] italic" style={{ color: 'var(--ink-muted)', borderBottom: '1px solid var(--border)' }}>
            + {node.account_count - accounts.length} more accounts — open Cost Control to see all
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface Props {
  projectId: string
  structureType: BreakdownType
}

export function BreakdownTab({ projectId: _projectId, structureType }: Props) {
  const baseNodes = structureType === 'wbs' ? WBS_NODES : structureType === 'cbs' ? CBS_NODES : PKG_NODES

  const [nodes, setNodes] = useState<BreakdownNode[]>(baseNodes)
  const [selectedCode, setSelectedCode] = useState<string | null>(nodes[0]?.code ?? null)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(nodes.filter(n => n.level === 0).map(n => n.code))
  )
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [detailHeight, setDetailHeight] = useLocalState<number>(`cpm:setup:${structureType}:detail-height`, 240)

  const nodesByCode = useMemo(() => new Map(nodes.map(n => [n.code, n])), [nodes])
  const hasChildren = useMemo(() => {
    const set = new Set<string>()
    nodes.forEach(n => { if (n.parent_code) set.add(n.parent_code) })
    return set
  }, [nodes])

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return nodes.filter(node => {
      if (q) return node.code.toLowerCase().includes(q) || node.description.toLowerCase().includes(q)
      if (!node.parent_code) return true
      let p: string | null = node.parent_code
      while (p) {
        if (!expanded.has(p)) return false
        p = nodesByCode.get(p)?.parent_code ?? null
      }
      return true
    })
  }, [nodes, expanded, search, nodesByCode])

  const selectedNode = selectedCode ? nodesByCode.get(selectedCode) ?? null : null
  const parentNode = selectedNode?.parent_code ? nodesByCode.get(selectedNode.parent_code) : undefined
  const visibleIdx = visible.findIndex(n => n.code === selectedCode)
  const isLocked = structureType === 'packages' && selectedNode ? PKG_LOCKED.has(selectedNode.code) : false

  const toggle = (code: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(code) ? next.delete(code) : next.add(code)
    return next
  })

  const navigate = (delta: number) => {
    const next = visible[visibleIdx + delta]
    if (next) setSelectedCode(next.code)
  }

  const handleAddNode = (node: BreakdownNode) => {
    setNodes(prev => [...prev, node])
    setSelectedCode(node.code)
    if (node.parent_code) setExpanded(prev => new Set([...prev, node.parent_code!]))
  }

  const handleImportNodes = (newNodes: BreakdownNode[]) => {
    setNodes(prev => [...prev, ...newNodes])
  }

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = detailHeight
    const onMove = (ev: MouseEvent) => setDetailHeight(Math.max(160, Math.min(500, startH + ev.clientY - startY)))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
      <div className="h-full flex min-h-0">
        <BreakdownNavPanel
          structureType={structureType}
          visible={visible}
          selectedCode={selectedCode}
          visibleIdx={visibleIdx}
          totalCount={nodes.length}
          search={search}
          setSearch={setSearch}
          expanded={expanded}
          hasChildren={hasChildren}
          onSelect={setSelectedCode}
          onToggle={toggle}
          onNavigate={navigate}
          onAdd={() => setShowAdd(true)}
          onImport={() => setShowImport(true)}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {selectedNode ? (
            <>
              <NodeDetailPanel
                key={selectedNode.code}
                node={selectedNode}
                parentNode={parentNode}
                structureType={structureType}
                isLocked={isLocked}
                height={detailHeight}
              />
              <div onMouseDown={handleDragStart} style={{ height: 4, flexShrink: 0, cursor: 'row-resize', background: 'var(--border-strong)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />
              <LinkedAccountsPanel node={selectedNode} />
            </>
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
              Select a node to view details.
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddNodeModal
          nodes={nodes}
          structureType={structureType}
          onClose={() => setShowAdd(false)}
          onAdd={handleAddNode}
        />
      )}
      {showImport && (
        <ImportHierarchyModal
          nodes={nodes}
          structureType={structureType}
          onClose={() => setShowImport(false)}
          onImport={handleImportNodes}
        />
      )}
    </>
  )
}
