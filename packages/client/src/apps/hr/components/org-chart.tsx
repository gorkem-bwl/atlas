import { useState, useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, ChevronDown, ChevronRight, Users, GitBranch } from 'lucide-react';
import { Avatar } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { StatusDot } from '../../../components/ui/status-dot';

// ─── Types ───────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  departmentId: string | null;
  managerId: string | null;
  status: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
  headEmployeeId: string | null;
}

interface OrgChartProps {
  employees: Employee[];
  departments: Department[];
  onSelectEmployee?: (id: string) => void;
}

// ─── Tree Building ───────────────────────────────────────────────

interface TreeNode {
  employee: Employee;
  department: Department | null;
  children: TreeNode[];
  directReportCount: number;
  totalReportCount: number;
}

function buildTree(employees: Employee[], departments: Department[]): { roots: TreeNode[]; unassigned: Employee[] } {
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const childrenMap = new Map<string, Employee[]>();
  const hasManager = new Set<string>();

  for (const emp of employees) {
    if (emp.managerId) {
      hasManager.add(emp.id);
      const list = childrenMap.get(emp.managerId) ?? [];
      list.push(emp);
      childrenMap.set(emp.managerId, list);
    }
  }

  function buildNode(emp: Employee): TreeNode {
    const children = (childrenMap.get(emp.id) ?? [])
      .filter(c => c.status !== 'terminated')
      .map(buildNode);
    const directReportCount = children.length;
    const totalReportCount = children.reduce((sum, c) => sum + 1 + c.totalReportCount, 0);
    return {
      employee: emp,
      department: emp.departmentId ? deptMap.get(emp.departmentId) ?? null : null,
      children,
      directReportCount,
      totalReportCount,
    };
  }

  // Roots: employees with no manager (or manager not in the employee list)
  const employeeIds = new Set(employees.map(e => e.id));
  const roots = employees
    .filter(e => (!e.managerId || !employeeIds.has(e.managerId)) && e.status !== 'terminated')
    .map(buildNode);

  // Unassigned: employees with no department and no manager
  const unassigned = employees.filter(e => !e.departmentId && !e.managerId && e.status !== 'terminated');

  return { roots, unassigned };
}

// ─── Layout Algorithm ────────────────────────────────────────────

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const H_GAP = 40;
const V_GAP = 80;

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

function layoutTree(
  roots: TreeNode[],
  collapsedSet: Set<string>,
  highlightId: string | null,
): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let xOffset = 0;

  function measure(node: TreeNode): number {
    if (collapsedSet.has(node.employee.id) || node.children.length === 0) {
      return NODE_WIDTH;
    }
    const childrenWidth = node.children.reduce((sum, child) => sum + measure(child) + H_GAP, -H_GAP);
    return Math.max(NODE_WIDTH, childrenWidth);
  }

  function layout(node: TreeNode, x: number, y: number, parentId?: string) {
    const id = node.employee.id;
    const isCollapsed = collapsedSet.has(id);
    const isHighlighted = highlightId === id;

    nodes.push({
      id,
      type: 'orgNode',
      position: { x, y },
      data: {
        employee: node.employee,
        department: node.department,
        directReportCount: node.directReportCount,
        totalReportCount: node.totalReportCount,
        isCollapsed,
        hasChildren: node.children.length > 0,
        isHighlighted,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        style: { stroke: 'var(--color-border-primary)', strokeWidth: 1.5 },
      });
    }

    if (!isCollapsed && node.children.length > 0) {
      const totalWidth = node.children.reduce((sum, child) => sum + measure(child) + H_GAP, -H_GAP);
      let childX = x + (NODE_WIDTH - totalWidth) / 2;
      const childY = y + NODE_HEIGHT + V_GAP;

      for (const child of node.children) {
        const childWidth = measure(child);
        layout(child, childX + (childWidth - NODE_WIDTH) / 2, childY, id);
        childX += childWidth + H_GAP;
      }
    }
  }

  for (const root of roots) {
    const width = measure(root);
    layout(root, xOffset + (width - NODE_WIDTH) / 2, 0);
    xOffset += width + H_GAP * 2;
  }

  return { nodes, edges };
}

// ─── Custom Node Component ───────────────────────────────────────

function OrgNodeComponent({ data }: NodeProps) {
  const { employee, department, directReportCount, totalReportCount, isCollapsed, hasChildren, isHighlighted } = data as {
    employee: Employee;
    department: Department | null;
    directReportCount: number;
    totalReportCount: number;
    isCollapsed: boolean;
    hasChildren: boolean;
    isHighlighted: boolean;
  };

  const borderColor = isHighlighted
    ? 'var(--color-accent-primary)'
    : department?.color ?? 'var(--color-border-primary)';

  return (
    <div
      style={{
        width: NODE_WIDTH,
        padding: '10px 12px',
        background: 'var(--color-bg-primary)',
        border: `2px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        boxShadow: isHighlighted ? `0 0 0 3px ${borderColor}33` : 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name={employee.name} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {employee.name}
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {employee.jobTitle || employee.role}
          </div>
        </div>
      </div>

      {/* Bottom row: department + report count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        {department ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
            <StatusDot color={department.color} size={6} />
            {department.name}
          </span>
        ) : (
          <span />
        )}
        {hasChildren && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: '10px',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
            <Users size={10} />
            {directReportCount}
            {totalReportCount > directReportCount && ` (${totalReportCount})`}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

const nodeTypes = { orgNode: OrgNodeComponent };

// ─── Inner Chart (needs ReactFlowProvider ancestor) ──────────────

function OrgChartInner({ employees, departments, onSelectEmployee }: OrgChartProps) {
  const { t } = useTranslation();
  const { fitView, setCenter } = useReactFlow();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const { roots } = useMemo(() => buildTree(employees, departments), [employees, departments]);
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutTree(roots, collapsedSet, highlightId),
    [roots, collapsedSet, highlightId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout when collapsed state or data changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [layoutNodes, layoutEdges, setNodes, setEdges, fitView]);

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    const empId = node.id;
    const nodeData = node.data as { hasChildren: boolean; isCollapsed: boolean };

    // Toggle collapse on click
    if (nodeData.hasChildren) {
      setCollapsedSet(prev => {
        const next = new Set(prev);
        if (next.has(empId)) next.delete(empId); else next.add(empId);
        return next;
      });
    }

    // Open detail panel
    onSelectEmployee?.(empId);
  }, [onSelectEmployee]);

  // Search: highlight and zoom to matched person
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setHighlightId(null);
      return;
    }

    const q = query.toLowerCase();
    const match = employees.find(
      e => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
    );

    if (match) {
      setHighlightId(match.id);

      // Expand all ancestors so the match is visible
      const ancestorIds = new Set<string>();
      let current = match;
      while (current.managerId) {
        ancestorIds.add(current.managerId);
        current = employees.find(e => e.id === current.managerId)!;
        if (!current) break;
      }
      setCollapsedSet(prev => {
        const next = new Set(prev);
        for (const id of ancestorIds) next.delete(id);
        return next;
      });

      // Zoom to the node after layout updates
      setTimeout(() => {
        const node = layoutNodes.find(n => n.id === match.id);
        if (node) {
          setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1.2, duration: 500 });
        }
      }, 100);
    } else {
      setHighlightId(null);
    }
  }, [employees, layoutNodes, setCenter]);

  if (roots.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flex: 1, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)',
        gap: 'var(--spacing-md)', padding: 'var(--spacing-2xl)',
      }}>
        <GitBranch size={48} style={{ opacity: 0.3 }} />
        <div style={{ fontSize: 'var(--font-size-lg)' }}>{t('hr.orgChart.empty')}</div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
          {t('hr.orgChart.emptyDesc')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search bar */}
      <div style={{
        padding: 'var(--spacing-sm) var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-secondary)',
        flexShrink: 0,
      }}>
        <Input
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('hr.orgChart.searchPlaceholder')}
          iconLeft={<Search size={14} />}
          size="sm"
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Flow canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--color-border-secondary)" />
          <Controls
            showInteractive={false}
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              const dept = (node.data as { department: Department | null })?.department;
              return dept?.color ?? 'var(--color-text-tertiary)';
            }}
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-primary)',
              background: 'var(--color-bg-secondary)',
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// ─── Exported Wrapper ────────────────────────────────────────────

export function OrgChartView({ employees, departments, onSelectEmployee }: OrgChartProps) {
  return (
    <ReactFlowProvider>
      <OrgChartInner employees={employees} departments={departments} onSelectEmployee={onSelectEmployee} />
    </ReactFlowProvider>
  );
}
