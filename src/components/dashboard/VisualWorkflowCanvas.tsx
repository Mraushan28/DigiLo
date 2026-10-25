"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Workflow, WorkflowStep } from "@/types/automation";
import { 
  Sparkles, 
  Database, 
  MessageSquare, 
  Mail, 
  Radio, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  ArrowRight,
  X,
  ShieldCheck,
  AlertCircle,
  Hand,
  Maximize2
} from "lucide-react";

interface VisualWorkflowCanvasProps {
  workflow: Workflow;
  isActiveVersion?: boolean;
  activeVersionTag?: string;
  draftVersionTag?: string;
  onSaveProposedSettings?: (updatedSteps: WorkflowStep[]) => Promise<void>;
  isSaving?: boolean;
}

export default function VisualWorkflowCanvas({
  workflow,
  isActiveVersion = false,
  activeVersionTag = "v1.0.0",
  draftVersionTag = "Draft v1.1.0",
  onSaveProposedSettings,
  isSaving = false,
}: VisualWorkflowCanvasProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanToolActive, setIsPanToolActive] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number }>({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const hasDraggedRef = useRef<boolean>(false);
  const touchDistanceRef = useRef<number | null>(null);

  const [selectedNode, setSelectedNode] = useState<{
    type: "trigger" | "step";
    id: string;
    name: string;
    action?: string;
    config?: Record<string, unknown>;
  } | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Record<string, unknown>>({});
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Zoom limits
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2.2;

  // Clamped Zoom Setter
  const clampZoom = (val: number) => Math.min(Math.max(val, MIN_ZOOM), MAX_ZOOM);

  // Zoom centered on a specific point in the container viewport
  const zoomAtPoint = useCallback((factor: number, clientX?: number, clientY?: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const focalX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const focalY = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    setZoom((prevZoom) => {
      const nextZoom = clampZoom(prevZoom * factor);
      if (nextZoom === prevZoom) return prevZoom;

      // Adjust pan so the focal point on the canvas remains stationary
      setPan((prevPan) => {
        const ratio = nextZoom / prevZoom;
        return {
          x: focalX - (focalX - prevPan.x) * ratio,
          y: focalY - (focalY - prevPan.y) * ratio,
        };
      });

      return nextZoom;
    });
  }, []);

  const handleZoomIn = () => zoomAtPoint(1.2);
  const handleZoomOut = () => zoomAtPoint(1 / 1.2);
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handle100Percent = () => {
    zoomAtPoint(1 / zoom);
  };

  // Fit to screen: centers and scales all nodes within the container bounds
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    const padding = 60;
    const availWidth = Math.max(container.clientWidth - padding * 2, 200);
    const availHeight = Math.max(container.clientHeight - padding * 2, 200);

    const contentWidth = content.scrollWidth || 800;
    const contentHeight = content.scrollHeight || 160;

    const scaleX = availWidth / contentWidth;
    const scaleY = availHeight / contentHeight;
    const fitScale = clampZoom(Math.min(scaleX, scaleY, 1.1));

    setZoom(fitScale);
    setPan({
      x: (container.clientWidth - contentWidth * fitScale) / 2,
      y: (container.clientHeight - contentHeight * fitScale) / 2,
    });
  }, []);

  // Native non-passive Wheel listener for trackpad pinch & mouse wheel zoom toward cursor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // If user holds Ctrl/Cmd or pinches trackpad, zoom toward cursor
      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = 1 - e.deltaY * 0.01;
        zoomAtPoint(zoomFactor, e.clientX, e.clientY);
      } else if (e.altKey || Math.abs(e.deltaX) === 0) {
        // Alt key or standard single-axis wheel: zoom toward mouse pointer
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
        zoomAtPoint(zoomFactor, e.clientX, e.clientY);
      } else {
        // Trackpad 2-finger pan
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAtPoint]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click initiates drag
    if (e.button !== 0) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDraggedRef.current = true;
    }

    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      hasDraggedRef.current = false;
      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    } else if (e.touches.length === 2) {
      // Pinch start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedRef.current = true;
      }

      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / touchDistanceRef.current;
      touchDistanceRef.current = dist;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      zoomAtPoint(factor, midX, midY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  const handleSelectTrigger = () => {
    if (hasDraggedRef.current) return;
    setSelectedNode({
      type: "trigger",
      id: "trigger",
      name: workflow.trigger.source || "Inbound Webhook",
      action: workflow.trigger.type,
      config: workflow.trigger.config || {},
    });
    setEditedConfig(workflow.trigger.config || {});
    setDrawerOpen(true);
    setEditSuccess(null);
  };

  const handleSelectStep = (step: WorkflowStep) => {
    if (hasDraggedRef.current) return;
    setSelectedNode({
      type: "step",
      id: step.id,
      name: step.name || step.action,
      action: step.action,
      config: step.config || {},
    });
    setEditedConfig(step.config || {});
    setDrawerOpen(true);
    setEditSuccess(null);
  };

  const handleSaveNodeSettings = async () => {
    if (!selectedNode || selectedNode.type !== "step" || !onSaveProposedSettings) return;

    const updatedSteps = workflow.steps.map((s) => {
      if (s.id === selectedNode.id) {
        return {
          ...s,
          config: { ...s.config, ...editedConfig },
        };
      }
      return s;
    });

    await onSaveProposedSettings(updatedSteps);
    setEditSuccess("Settings saved as new proposed draft version!");
    setTimeout(() => setEditSuccess(null), 3000);
  };

  const getStepIcon = (action: string) => {
    if (action.includes("ai")) return <Sparkles className="w-4 h-4 text-accent" />;
    if (action.includes("sheet")) return <Database className="w-4 h-4 text-emerald-400" />;
    if (action.includes("slack")) return <MessageSquare className="w-4 h-4 text-cyan-400" />;
    if (action.includes("gmail") || action.includes("mail")) return <Mail className="w-4 h-4 text-amber-400" />;
    return <Layers className="w-4 h-4 text-foreground/80" />;
  };

  const getStepBadgeColor = (action: string) => {
    if (action.includes("ai")) return "bg-accent/10 border-accent/30 text-accent";
    if (action.includes("sheet")) return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    if (action.includes("slack")) return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
    if (action.includes("gmail") || action.includes("mail")) return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    return "bg-foreground/10 border-foreground/20 text-foreground/80";
  };

  return (
    <section 
      id="section-visual-canvas"
      aria-label="Section A: Visual Workflow Canvas"
      className="relative w-full border border-white/12 bg-gradient-to-b from-[#0e131f] to-[#0a0d14] rounded-sm overflow-hidden flex flex-col shadow-2xl"
    >
      {/* Top Header & Version Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-[#121826]/80 backdrop-blur-sm z-20 relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(204,255,0,0.8)] animate-pulse" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              SECTION A: Visual Workflow Canvas
            </h2>
          </div>

          {/* Draft vs Production Separation */}
          <div className="flex items-center gap-2">
            {isActiveVersion ? (
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-sm bg-accent/15 border border-accent text-accent flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Production ({activeVersionTag})
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-sm bg-amber-500/10 border border-amber-500/40 border-dashed text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Proposed Draft ({draftVersionTag})
              </span>
            )}
          </div>
        </div>

        {/* Canvas Controls: Hand Tool, Zoom, Fit-to-screen, Reset */}
        <div className="flex items-center gap-2">
          {/* Hand/Pan Tool Toggle */}
          <button
            type="button"
            id="btn-pan-tool"
            onClick={() => setIsPanToolActive((prev) => !prev)}
            className={`p-1.5 rounded-sm border transition-all flex items-center gap-1 text-xs font-mono ${
              isPanToolActive 
                ? "bg-accent text-background border-accent font-bold shadow-[0_0_12px_rgba(204,255,0,0.3)]" 
                : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title={isPanToolActive ? "Pan Tool Active (Click anywhere to drag)" : "Select Hand / Pan Tool"}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Pan</span>
          </button>

          {/* Zoom Controls Bar */}
          <div className="flex items-center bg-[#151c2b] border border-white/12 rounded-sm p-0.5 shadow-inner">
            <button
              type="button"
              id="btn-zoom-out"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
              title="Zoom Out (or scroll down)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handle100Percent}
              className="text-[10px] font-mono px-2 text-slate-300 hover:text-accent select-none"
              title="Reset to 100% Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              id="btn-zoom-in"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
              title="Zoom In (or scroll up)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

            <button
              type="button"
              id="btn-fit-screen"
              onClick={handleFitToScreen}
              className="p-1.5 text-slate-300 hover:text-accent hover:bg-white/10 rounded-sm transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              id="btn-zoom-reset"
              onClick={handleResetZoom}
              className="p-1.5 text-slate-300 hover:text-accent hover:bg-white/10 rounded-sm transition-colors"
              title="Reset View (Center & 100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 hidden lg:inline ml-2">
            Drag empty space to pan • Scroll to zoom
          </span>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div 
        ref={containerRef}
        id="workflow-canvas-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full h-[440px] sm:h-[480px] overflow-hidden select-none bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:24px_24px] ${
          isPanToolActive || isDragging ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
        style={{
          backgroundColor: "#0a0d14",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Infinite Transformable Layer */}
        <div 
          ref={contentRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="flex items-center gap-6 sm:gap-10 py-6 pointer-events-auto transition-[transform] duration-75 ease-out"
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {/* 1. TRIGGER NODE */}
            <div
              id="node-trigger"
              onClick={handleSelectTrigger}
              className="group cursor-pointer w-64 border-2 border-accent/50 hover:border-accent bg-gradient-to-br from-[#121724] to-[#0c101a] rounded-sm p-4 relative shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_25px_rgba(204,255,0,0.15)] transition-all"
            >
              <div className="absolute -top-2.5 left-4 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest font-bold bg-accent text-background rounded-sm shadow-sm">
                TRIGGER
              </div>

              <div className="flex items-center gap-3 mt-1">
                <div className="w-9 h-9 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(204,255,0,0.2)]">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white truncate">
                    {workflow.trigger.source || "Inbound Webhook"}
                  </h4>
                  <p className="text-[10px] font-mono text-accent truncate">
                    event: {workflow.trigger.event || "lead_submitted"}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>HTTP POST (JSON)</span>
                <span className="text-accent group-hover:underline">Inspect →</span>
              </div>
            </div>

            {/* Flow Arrow to First Action */}
            <div className="flex items-center text-accent/80 shrink-0">
              <div className="w-6 sm:w-10 h-[2px] bg-gradient-to-r from-accent to-accent/40 relative">
                <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-accent animate-ping" />
              </div>
              <ArrowRight className="w-4 h-4 -ml-1 text-accent" />
            </div>

            {/* 2. ACTION NODES PIPELINE */}
            {workflow.steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-6 sm:gap-10 shrink-0">
                <div
                  id={`node-${step.id}`}
                  onClick={() => handleSelectStep(step)}
                  className="group cursor-pointer w-64 border border-white/12 hover:border-accent/80 bg-gradient-to-br from-[#121724] to-[#0c101a] rounded-sm p-4 relative shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(204,255,0,0.12)] transition-all"
                >
                  <div className="absolute -top-2.5 left-4 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest font-bold border rounded-sm ${getStepBadgeColor(step.action)}`}>
                      STEP {idx + 1}: {step.action.split(".")[0].toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-9 h-9 rounded-sm bg-[#161e2e] border border-white/12 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getStepIcon(step.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white truncate">
                        {step.name || step.action}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        {step.action}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[140px] text-slate-300">
                      {step.description || "Processes inbound data"}
                    </span>
                    <span className="text-accent group-hover:underline">Edit →</span>
                  </div>
                </div>

                {/* Arrow to Next Step if not last */}
                {idx < workflow.steps.length - 1 && (
                  <div className="flex items-center text-slate-500 shrink-0">
                    <div className="w-6 sm:w-10 h-[2px] bg-white/20" />
                    <ArrowRight className="w-4 h-4 -ml-1 text-slate-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SIDE DRAWER: Node Inspector & Safe Settings Editor */}
      {drawerOpen && selectedNode && (
        <div 
          id="drawer-node-inspector"
          className="absolute inset-y-0 right-0 w-full max-w-md bg-background border-l border-foreground/20 shadow-2xl z-30 flex flex-col p-6 animate-in slide-in-from-right duration-200"
        >
          <div className="flex items-center justify-between pb-4 border-b border-foreground/10">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Node Configuration Inspector
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-1 text-foreground/50 hover:text-foreground rounded-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-5 space-y-5">
            <div>
              <span className="text-[10px] font-mono uppercase text-foreground/50 tracking-wider">
                Node Identifier
              </span>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                {selectedNode.id} ({selectedNode.action})
              </p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-foreground/50 tracking-wider">
                Display Name
              </span>
              <p className="text-xs font-semibold text-foreground mt-0.5">
                {selectedNode.name}
              </p>
            </div>

            {/* Safe Parameter Editor */}
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Client Settings Editor</span>
              </div>
              <p className="text-[11px] text-foreground/60 leading-relaxed font-normal">
                Safely configure prompts, channels, or destination sheets without direct node mutation.
              </p>

              {selectedNode.action === "ai.analyze" && (
                <div>
                  <label className="text-[11px] font-mono font-semibold text-foreground block mb-1">
                    System Qualification Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={(editedConfig.systemPrompt as string) || (editedConfig.prompt as string) || "Score urgency 1-100 and summarize in 1 concise sentence."}
                    onChange={(e) => setEditedConfig({ ...editedConfig, systemPrompt: e.target.value })}
                    className="w-full text-xs font-mono bg-background border border-foreground/20 p-2.5 rounded-sm focus:outline-none focus:border-accent"
                    placeholder="Enter prompt rules..."
                  />
                </div>
              )}

              {selectedNode.action === "google_sheets.add_row" && (
                <>
                  <div>
                    <label className="text-[11px] font-mono font-semibold text-foreground block mb-1">
                      Spreadsheet Name
                    </label>
                    <input
                      type="text"
                      value={(editedConfig.spreadsheet as string) || "Website Leads"}
                      onChange={(e) => setEditedConfig({ ...editedConfig, spreadsheet: e.target.value })}
                      className="w-full text-xs font-mono bg-background border border-foreground/20 p-2 rounded-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-semibold text-foreground block mb-1">
                      Worksheet Tab Name
                    </label>
                    <input
                      type="text"
                      value={(editedConfig.sheetName as string) || "Leads"}
                      onChange={(e) => setEditedConfig({ ...editedConfig, sheetName: e.target.value })}
                      className="w-full text-xs font-mono bg-background border border-foreground/20 p-2 rounded-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}

              {selectedNode.action === "slack.send_message" && (
                <div>
                  <label className="text-[11px] font-mono font-semibold text-foreground block mb-1">
                    Target Channel
                  </label>
                  <input
                    type="text"
                    value={(editedConfig.channel as string) || "#sales-leads"}
                    onChange={(e) => setEditedConfig({ ...editedConfig, channel: e.target.value })}
                    className="w-full text-xs font-mono bg-background border border-foreground/20 p-2 rounded-sm focus:outline-none focus:border-accent"
                    placeholder="#sales-leads"
                  />
                </div>
              )}

              {selectedNode.action === "gmail.send_email" && (
                <>
                  <div>
                    <label className="text-[11px] font-mono font-semibold text-foreground block mb-1">
                      Recipient Email Address
                    </label>
                    <input
                      type="text"
                      value={(editedConfig.to as string) || "team@company.com"}
                      onChange={(e) => setEditedConfig({ ...editedConfig, to: e.target.value })}
                      className="w-full text-xs font-mono bg-background border border-foreground/20 p-2 rounded-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-semibold text-foreground block mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={(editedConfig.subject as string) || "New Qualified Lead"}
                      onChange={(e) => setEditedConfig({ ...editedConfig, subject: e.target.value })}
                      className="w-full text-xs font-mono bg-background border border-foreground/20 p-2 rounded-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}
            </div>

            {editSuccess && (
              <div className="p-3 bg-accent/15 border border-accent rounded-sm text-accent text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-foreground/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-3.5 py-2 text-xs font-mono text-foreground/60 hover:text-foreground"
            >
              Close
            </button>
            {selectedNode.type === "step" && onSaveProposedSettings && (
              <button
                type="button"
                id="btn-save-node-draft"
                onClick={handleSaveNodeSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-accent text-background font-mono font-bold text-xs uppercase tracking-wider rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save as Proposed Version (v1.1)"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
