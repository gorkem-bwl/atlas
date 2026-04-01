import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Search, ChevronDown, ChevronRight, Users, GitBranch,
  GripVertical, UserPlus,
} from 'lucide-react';
import { Avatar } from '../../../components/ui/avatar';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { StatusDot } from '../../../components/ui/status-dot';
import { Badge } from '../../../components/ui/badge';
import { useUpdateEmployee } from '../hooks';
import { useToastStore } from '../../../stores/toast-store';

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

function buildTree(
  employees: Employee[],
  departments: Department[],
  filterDeptId: string | null,
  filterStatus: string | null,
): { roots: TreeNode[]; unassigned: Employee[] } {
  const deptMap = new Map(departments.map(d => [d.id, d]));

  // Apply filters
  let filtered = employees.filter(e => e.status !== 'terminated');
  if (filterDeptId) filtered = filtered.filter(e => e.departmentId === filterDeptId);
  if (filterStatus) filtered = filtered.filter(e => e.status === filterStatus);

  const filteredIds = new Set(filtered.map(e => e.id));
  const childrenMap = new Map<string, Employee[]>();

  for (const emp of filtered) {
    if (emp.managerId && filteredIds.has(emp.managerId)) {
      const list = childrenMap.get(emp.managerId) ?? [];
      list.push(emp);
      childrenMap.set(emp.managerId, list);
    }
  }

  function buildNode(emp: Employee): TreeNode {
    const children = (childrenMap.get(emp.id) ?? []).map(buildNode);
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

  const roots = filtered
    .filter(e => !e.managerId || !filteredIds.has(e.managerId))
    .map(buildNode);

  const unassigned = filtered.filter(e => !e.departmentId && !e.managerId);
  return { roots, unassigned };
}

// ─── Layout Algorithm ────────────────────────────────────────────

const NODE_WIDTH = 230;
const NODE_HEIGHT = 90;
const H_GAP = 40;
const V_GAP = 80;

function layoutTree(
  roots: TreeNode[],
  collapsedSet: Set<string>,
  highlightId: string | null,
  dragTargetId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let xOffset = 0;

  function measure(node: TreeNode): number {
    if (collapsedSet.has(node.employee.id) || node.children.length === 0) return NODE_WIDTH;
    const childrenWidth = node.children.reduce((sum, child) => sum + measure(child) + H_GAP, -H_GAP);
    return Math.max(NODE_WIDTH, childrenWidth);
  }

  function layout(node: TreeNode, x: number, y: number, parentId?: string) {
    const id = node.employee.id;
    const isCollapsed = collapsedSet.has(id);
    const isHighlighted = highlightId === id;
    const isDragTarget = dragTargetId === id;

    nodes.push({
      id,
      type: 'orgNode',
      position: { x, y },
      draggable: true,
      data: {
        employee: node.employee,
        department: node.department,
        directReportCount: node.directReportCount,
        totalReportCount: node.totalReportCount,
        isCollapsed,
        hasChildren: node.children.length > 0,
        isHighlighted,
        isDragTarget,
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
  const nodeData = data as {
    employee: Employee;
    department: Department | null;
    directReportCount: number;
    totalReportCount: number;
    isCollapsed: boolean;
    hasChildren: boolean;
    isHighlighted: boolean;
    isDragTarget: boolean;
  };
  const { employee, department, directReportCount, totalReportCount, isCollapsed, hasChildren, isHighlighted, isDragTarget } = nodeData;

  const borderColor = isDragTarget
    ? 'var(--color-success)'
    : isHighlighted
      ? 'var(--color-accent-primary)'
      : department?.color ?? 'var(--color-border-primary)';

  return (
    <div
      style={{
        width: NODE_WIDTH,
        padding: '10px 12px',
        background: isDragTarget ? 'color-mix(in srgb, var(--color-success) 8%, var(--color-bg-primary))' : 'var(--color-bg-primary)',
        border: `2px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'grab',
        boxShadow: isHighlighted ? `0 0 0 3px ${borderColor}33` : isDragTarget ? `0 0 0 3px var(--color-success)33` : 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--color-border-primary)', width: 8, height: 8 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name={employee.name} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {employee.name}
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {employee.jobTitle || employee.role}
          </div>
        </div>
        <GripVertical size={12} style={{ color: 'var(--color-text-tertiary)', opacity: 0.4, flexShrink: 0 }} />
      </div>

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
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: '10px', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', fontVariantNumeric: 'tabular-nums',
          }}>
            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
            <Users size={10} />
            {directReportCount}
            {totalReportCount > directReportCount && ` (${totalReportCount})`}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--color-border-primary)', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { orgNode: OrgNodeComponent };

// ─── Headcount Summary Bar ───────────────────────────────────────

function HeadcountBar({ employees, departments, t }: { employees: Employee[]; departments: Department[]; t: (key: string) => string }) {
  const active = employees.filter(e => e.status !== 'terminated');
  const byDept = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of active) {
      const deptId = emp.departmentId ?? '__none__';
      map.set(deptId, (map.get(deptId) ?? 0) + 1);
    }
    return map;
  }, [active]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)',
      padding: 'var(--spacing-sm) var(--spacing-lg)',
      borderBottom: '1px solid var(--color-border-secondary)',
      flexShrink: 0, flexWrap: 'wrap',
      fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)', color: 'var(--color-text-tertiary)',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
        {active.length} {t('hr.orgChart.employees')}
      </span>
      {departments.map(dept => {
        const count = byDept.get(dept.id) ?? 0;
        if (count === 0) return null;
        return (
          <span key={dept.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <StatusDot color={dept.color} size={6} />
            {dept.name}: {count}
          </span>
        );
      })}
      {(byDept.get('__none__') ?? 0) > 0 && (
        <span>{t('hr.orgChart.unassigned')}: {byDept.get('__none__')}</span>
      )}
    </div>
  );
}

// ─── Inner Chart ─────────────────────────────────────────────────

function OrgChartInner({ employees, departments, onSelectEmployee }: OrgChartProps) {
  const { t } = useTranslation();
  const { fitView, setCenter } = useReactFlow();
  const updateEmployee = useUpdateEmployee();
  const { addToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  const { roots } = useMemo(
    () => buildTree(employees, departments, filterDept || null, filterStatus || null),
    [employees, departments, filterDept, filterStatus],
  );
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutTree(roots, collapsedSet, highlightId, dragTargetId),
    [roots, collapsedSet, highlightId, dragTargetId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [layoutNodes, layoutEdges, setNodes, setEdges, fitView]);

  // Click: toggle collapse + open detail
  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    const nodeData = node.data as { hasChildren: boolean };
    if (nodeData.hasChildren) {
      setCollapsedSet(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
        return next;
      });
    }
    onSelectEmployee?.(node.id);
  }, [onSelectEmployee]);

  // Drag-and-drop: when a node is dropped on another, reassign manager
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const childId = connection.source;
    const newManagerId = connection.target;
    if (childId === newManagerId) return;

    updateEmployee.mutate(
      { id: childId, managerId: newManagerId },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('hr.orgChart.reassigned') });
        },
        onError: () => {
          addToast({ type: 'error', message: t('common.saveFailed') });
        },
      },
    );
  }, [updateEmployee, addToast, t]);

  // Also handle drag-and-drop via node drag end (drop on another node)
  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    // Find which node the dragged node is hovering over
    const draggedId = node.id;
    const dragPos = node.position;

    // Check proximity to other nodes
    for (const other of layoutNodes) {
      if (other.id === draggedId) continue;
      const dx = Math.abs(dragPos.x - other.position.x);
      const dy = Math.abs(dragPos.y - other.position.y);
      if (dx < NODE_WIDTH * 0.7 && dy < NODE_HEIGHT * 0.7) {
        // Dropped on this node — reassign
        updateEmployee.mutate(
          { id: draggedId, managerId: other.id },
          {
            onSuccess: () => addToast({ type: 'success', message: t('hr.orgChart.reassigned') }),
            onError: () => addToast({ type: 'error', message: t('common.saveFailed') }),
          },
        );
        return;
      }
    }
    // Dropped in empty space — remove manager (make root)
    const emp = employees.find(e => e.id === draggedId);
    if (emp?.managerId) {
      updateEmployee.mutate(
        { id: draggedId, managerId: null },
        {
          onSuccess: () => addToast({ type: 'success', message: t('hr.orgChart.madeRoot') }),
        },
      );
    }
  }, [layoutNodes, employees, updateEmployee, addToast, t]);

  // Search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setHighlightId(null); return; }
    const q = query.toLowerCase();
    const match = employees.find(e => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
    if (match) {
      setHighlightId(match.id);
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
      setTimeout(() => {
        const node = layoutNodes.find(n => n.id === match.id);
        if (node) setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1.2, duration: 500 });
      }, 100);
    } else {
      setHighlightId(null);
    }
  }, [employees, layoutNodes, setCenter]);

  if (employees.filter(e => e.status !== 'terminated').length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flex: 1, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)',
        gap: 'var(--spacing-md)', padding: 'var(--spacing-2xl)',
      }}>
        <GitBranch size={48} style={{ opacity: 0.3 }} />
        <div style={{ fontSize: 'var(--font-size-lg)' }}>{t('hr.orgChart.empty')}</div>
        <div style={{ fontSize: 'var(--font-size-sm)' }}>{t('hr.orgChart.emptyDesc')}</div>
      </div>
    );
  }

  const deptOptions = [
    { value: '', label: t('hr.orgChart.allDepartments') },
    ...departments.map(d => ({ value: d.id, label: d.name })),
  ];
  const statusOptions = [
    { value: '', label: t('hr.orgChart.allStatuses') },
    { value: 'active', label: t('hr.status.active') },
    { value: 'probation', label: t('hr.status.probation') },
    { value: 'on_leave', label: t('hr.status.onLeave') },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Headcount summary */}
      <HeadcountBar employees={employees} departments={departments} t={t} />

      {/* Toolbar: search + filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-secondary)',
        flexShrink: 0, flexWrap: 'nowrap',
      }}>
        <Input
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('hr.orgChart.searchPlaceholder')}
          iconLeft={<Search size={14} />}
          size="sm"
          style={{ width: 220, minWidth: 220, flexShrink: 0 }}
        />
        <Select value={filterDept} onChange={setFilterDept} options={deptOptions} size="sm" width={150} />
        <Select value={filterStatus} onChange={setFilterStatus} options={statusOptions} size="sm" width={150} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
          {t('hr.orgChart.dragHint')}
        </span>
      </div>

      {/* Flow canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onConnect={handleConnect}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--color-border-secondary)" />
          <Controls
            showInteractive={false}
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', boxShadow: 'var(--shadow-sm)' }}
          />
          <MiniMap
            nodeColor={(node) => {
              const dept = (node.data as { department: Department | null })?.department;
              return dept?.color ?? 'var(--color-text-tertiary)';
            }}
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-secondary)' }}
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
