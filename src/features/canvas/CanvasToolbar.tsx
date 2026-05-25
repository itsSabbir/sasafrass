import { Icon } from "../../components/Icon";
import type { CanvasDetailMode } from "../../app/appTypes";
import type { FlowNode, Viewport } from "../../types";

interface CanvasToolbarProps {
  zoom: number;
  snapToGrid: boolean;
  canvasDetailMode: CanvasDetailMode;
  selectedNodeId: string | null;
  connectingFrom: string | null;
  copiedNode: FlowNode | null;
  setSnapToGrid: (value: boolean) => void;
  setCanvasDetailMode: (mode: CanvasDetailMode) => void;
  setConnectingFrom: (id: string | null) => void;
  setViewport: (updater: (viewport: Viewport) => Viewport) => void;
  fitView: () => void;
  alignToLanes: () => void;
  deleteSelectedNode: () => void;
  duplicateSelectedNode: () => void;
  copySelectedNode: () => void;
  pasteNode: () => void;
}

const detailModeLabels: Record<CanvasDetailMode, string> = {
  handoff: "DevOps",
  architecture: "Data",
  review: "Review"
};

export function CanvasToolbar(props: CanvasToolbarProps) {
  const {
    zoom, snapToGrid, canvasDetailMode, selectedNodeId, connectingFrom, copiedNode,
    setSnapToGrid, setCanvasDetailMode, setConnectingFrom, setViewport,
    fitView, alignToLanes, deleteSelectedNode, duplicateSelectedNode, copySelectedNode, pasteNode
  } = props;

  return (
    <div className="canvas-toolbar">
      <button className="icon-button" title="Zoom in" onClick={() => setViewport((v) => ({ ...v, zoom: Math.min(1.6, v.zoom + 0.1) }))}>
        <Icon name="zoomIn" />
      </button>
      <button className="icon-button" title="Zoom out" onClick={() => setViewport((v) => ({ ...v, zoom: Math.max(0.35, v.zoom - 0.1) }))}>
        <Icon name="zoomOut" />
      </button>
      <button className="icon-button" title="Fit view" onClick={fitView}><Icon name="fit" /></button>
      <button className={snapToGrid ? "icon-button active" : "icon-button"} title="Snap to grid" onClick={() => setSnapToGrid(!snapToGrid)}>
        <Icon name="grid" />
      </button>
      <button className="text-button" onClick={alignToLanes}>Arrange</button>
      <div className="canvas-mode-tabs" aria-label="Canvas detail mode">
        {(["handoff", "architecture", "review"] as CanvasDetailMode[]).map((mode) => (
          <button key={mode} className={canvasDetailMode === mode ? "active" : ""} onClick={() => setCanvasDetailMode(mode)}>
            {detailModeLabels[mode]}
          </button>
        ))}
      </div>
      <span className="toolbar-divider" />
      <button
        className={connectingFrom ? "text-button active" : "text-button"}
        disabled={!selectedNodeId}
        onClick={() => { if (selectedNodeId) setConnectingFrom(connectingFrom === selectedNodeId ? null : selectedNodeId); }}
      >
        <Icon name="connector" /> {connectingFrom ? "Cancel connect" : "Connect"}
      </button>
      <button className="icon-button" title="Duplicate node" disabled={!selectedNodeId} onClick={duplicateSelectedNode}><Icon name="duplicate" /></button>
      <button className="icon-button" title="Copy node" disabled={!selectedNodeId} onClick={copySelectedNode}><Icon name="copy" /></button>
      <button className="icon-button" title="Paste node" disabled={!copiedNode} onClick={pasteNode}><Icon name="plus" /></button>
      <button className="icon-button danger" title="Delete node" disabled={!selectedNodeId} onClick={deleteSelectedNode}><Icon name="trash" /></button>
      <span className="toolbar-spacer" />
      {connectingFrom && <span className="connect-hint">Choose a target node for the dependency</span>}
      <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
    </div>
  );
}
