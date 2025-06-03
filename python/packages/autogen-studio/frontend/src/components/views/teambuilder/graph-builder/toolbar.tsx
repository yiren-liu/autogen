import React from "react";
import { Button, Tooltip } from "antd";
import {
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  Layout,
  Grid3X3,
  Map,
} from "lucide-react";

interface GraphBuilderToolbarProps {
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onLayout: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
}

const GraphBuilderToolbar: React.FC<GraphBuilderToolbarProps> = ({
  onToggleFullscreen,
  isFullscreen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onLayout,
  showGrid,
  onToggleGrid,
  showMiniMap,
  onToggleMiniMap,
}) => {
  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2">
      <Tooltip title={`${isFullscreen ? "Exit" : "Enter"} Fullscreen`}>
        <Button
          type="text"
          icon={isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          onClick={onToggleFullscreen}
          className="bg-white/80 backdrop-blur-sm hover:bg-white"
        />
      </Tooltip>

      <div className="bg-white/80 backdrop-blur-sm rounded flex">
        <Tooltip title="Undo">
          <Button
            type="text"
            icon={<Undo2 size={16} />}
            onClick={onUndo}
            disabled={!canUndo}
            className="hover:bg-white disabled:opacity-50"
          />
        </Tooltip>
        <Tooltip title="Redo">
          <Button
            type="text"
            icon={<Redo2 size={16} />}
            onClick={onRedo}
            disabled={!canRedo}
            className="hover:bg-white disabled:opacity-50"
          />
        </Tooltip>
      </div>

      <Tooltip title="Auto Layout">
        <Button
          type="text"
          icon={<Layout size={16} />}
          onClick={onLayout}
          className="bg-white/80 backdrop-blur-sm hover:bg-white"
        />
      </Tooltip>

      <div className="bg-white/80 backdrop-blur-sm rounded flex">
        <Tooltip title={`${showGrid ? "Hide" : "Show"} Grid`}>
          <Button
            type="text"
            icon={<Grid3X3 size={16} />}
            onClick={onToggleGrid}
            className={`hover:bg-white ${
              showGrid ? "bg-primary/10 text-primary" : ""
            }`}
          />
        </Tooltip>
        <Tooltip title={`${showMiniMap ? "Hide" : "Show"} Mini Map`}>
          <Button
            type="text"
            icon={<Map size={16} />}
            onClick={onToggleMiniMap}
            className={`hover:bg-white ${
              showMiniMap ? "bg-primary/10 text-primary" : ""
            }`}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default GraphBuilderToolbar; 