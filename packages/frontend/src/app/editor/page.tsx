'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  FolderOpen, 
  Save, 
  Download, 
  Play, 
  Settings,
  Layers,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// Node categories for the palette
const NODE_CATEGORIES = [
  {
    label: 'Data',
    nodes: [
      { type: 'data', label: 'OHLCV Close', operation: 'ohlcv.close' },
      { type: 'data', label: 'OHLCV Open', operation: 'ohlcv.open' },
      { type: 'data', label: 'OHLCV High', operation: 'ohlcv.high' },
      { type: 'data', label: 'OHLCV Low', operation: 'ohlcv.low' },
      { type: 'data', label: 'OHLCV Volume', operation: 'ohlcv.volume' },
    ],
  },
  {
    label: 'Indicators',
    nodes: [
      { type: 'indicator', label: 'SMA', operation: 'sma' },
      { type: 'indicator', label: 'EMA', operation: 'ema' },
      { type: 'indicator', label: 'RSI', operation: 'rsi' },
      { type: 'indicator', label: 'MACD', operation: 'macd' },
      { type: 'indicator', label: 'Bollinger Bands', operation: 'bollinger' },
      { type: 'indicator', label: 'ATR', operation: 'atr' },
    ],
  },
  {
    label: 'Math',
    nodes: [
      { type: 'math', label: 'Add', operation: 'add' },
      { type: 'math', label: 'Subtract', operation: 'sub' },
      { type: 'math', label: 'Multiply', operation: 'mult' },
      { type: 'math', label: 'Divide', operation: 'div' },
      { type: 'math', label: 'Min', operation: 'min' },
      { type: 'math', label: 'Max', operation: 'max' },
    ],
  },
  {
    label: 'Logic',
    nodes: [
      { type: 'comparison', label: 'Greater Than', operation: 'gt' },
      { type: 'comparison', label: 'Less Than', operation: 'lt' },
      { type: 'logic', label: 'AND', operation: 'and' },
      { type: 'logic', label: 'OR', operation: 'or' },
      { type: 'logic', label: 'Crossover', operation: 'crossover' },
    ],
  },
  {
    label: 'Outputs',
    nodes: [
      { type: 'output', label: 'Plot Line', operation: 'plot' },
      { type: 'output', label: 'Histogram', operation: 'histogram' },
      { type: 'output', label: 'Horizontal Line', operation: 'hline' },
    ],
  },
];

// Initial nodes for the editor
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    position: { x: 250, y: 50 },
    data: { label: 'OHLCV Close', operation: 'ohlcv.close', category: 'data' },
  },
  {
    id: '2',
    type: 'input',
    position: { x: 250, y: 150 },
    data: { label: 'EMA', operation: 'ema', category: 'indicators', params: { period: 9 } },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
];

// Simple button component
function Button({ 
  children, 
  variant = 'default', 
  size = 'sm', 
  className = '',
  onClick,
  ...props 
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
  className?: string;
  onClick?: () => void;
  [key: string]: unknown;
}) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-10 px-4 py-2',
  };
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export default function EditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['pinescript_v5', 'mql5']);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'warning' | 'error'>('idle');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      const nodeData = JSON.parse(data);
      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'default',
        position: { 
          x: event.clientX - 300, 
          y: event.clientY - 100 
        },
        data: { 
          label: nodeData.label, 
          operation: nodeData.operation,
          category: nodeData.type 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const runValidation = () => {
    const hasOutput = nodes.some(n => n.data.category === 'output');
    if (!hasOutput) {
      setValidationStatus('error');
    } else if (nodes.length < 3) {
      setValidationStatus('warning');
    } else {
      setValidationStatus('valid');
    }
  };

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/">
              <Layers className="h-4 w-4" />
            </a>
          </Button>
          <span className="font-semibold">IndiForge</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">Untitled Indicator</span>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          {/* Platform selector */}
          <div className="flex items-center gap-1 mr-4">
            <span className="text-xs text-muted-foreground mr-2">Export:</span>
            {['pinescript_v5', 'mql5'].map(platform => (
              <Button
                key={platform}
                variant={selectedPlatforms.includes(platform) ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSelectedPlatforms(prev => 
                    prev.includes(platform) 
                      ? prev.filter(p => p !== platform)
                      : [...prev, platform]
                  );
                }}
              >
                {platform === 'pinescript_v5' ? 'Pine' : 'MQL5'}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={runValidation}>
            {getStatusIcon()}
            <span className="ml-1">Validate</span>
          </Button>
          
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-1" />
            Preview
          </Button>
          
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          
          <Button variant="default" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Node Palette */}
        <aside className="w-64 border-r border-border bg-background overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Node Palette</h3>
            {NODE_CATEGORIES.map((category) => (
              <div key={category.label} className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {category.label}
                </h4>
                <div className="space-y-1">
                  {category.nodes.map((node) => (
                    <div
                      key={node.operation}
                      draggable
                      className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-grab bg-muted"
                      onDragStart={(event) => {
                        event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      {node.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            
            <Panel position="top-right" className="flex gap-2">
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-1" />
                Load
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Panel>
          </ReactFlow>
        </main>

        {/* Right Panel - Properties */}
        <aside className="w-72 border-l border-border bg-background overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Properties</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Indicator Name</label>
                <input 
                  type="text" 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="My Indicator"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Describe your indicator..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Display Type</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="overlay">Overlay on Chart</option>
                  <option value="separate_pane">Separate Pane</option>
                </select>
              </div>
              
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-2">Validation</h4>
                {validationStatus === 'idle' && (
                  <p className="text-sm text-muted-foreground">Click Validate to check your graph</p>
                )}
                {validationStatus === 'error' && (
                  <div className="flex items-start gap-2 text-sm text-red-500">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span>Graph has no output nodes</span>
                  </div>
                )}
                {validationStatus === 'warning' && (
                  <div className="flex items-start gap-2 text-sm text-yellow-500">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span>Graph may be too simple</span>
                  </div>
                )}
                {validationStatus === 'valid' && (
                  <div className="flex items-start gap-2 text-sm text-green-500">
                    <CheckCircle className="h-4 w-4 mt-0.5" />
                    <span>Graph is valid</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}