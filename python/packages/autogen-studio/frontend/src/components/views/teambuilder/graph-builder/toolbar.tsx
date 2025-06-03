import React from "react";
import { 
  ActionButton, 
  TooltipTrigger, 
  Tooltip, 
  Flex, 
  View
} from "@adobe/react-spectrum";
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
    <View 
      position="absolute" 
      top="size-100" 
      right="size-100" 
      zIndex={10}
    >
      <Flex direction="row" gap="size-100">
        <TooltipTrigger>
          <ActionButton 
            onPress={onToggleFullscreen}
            UNSAFE_className="bg-white/80 backdrop-blur-sm hover:bg-white"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </ActionButton>
          <Tooltip>{`${isFullscreen ? "Exit" : "Enter"} Fullscreen`}</Tooltip>
        </TooltipTrigger>

        <View 
          backgroundColor="gray-50" 
          borderRadius="medium"
          UNSAFE_className="bg-white/80 backdrop-blur-sm"
        >
          <Flex direction="row">
            <TooltipTrigger>
              <ActionButton
                onPress={onUndo}
                isDisabled={!canUndo}
                UNSAFE_className="hover:bg-white disabled:opacity-50"
              >
                <Undo2 size={16} />
              </ActionButton>
              <Tooltip>Undo</Tooltip>
            </TooltipTrigger>
            
            <TooltipTrigger>
              <ActionButton
                onPress={onRedo}
                isDisabled={!canRedo}
                UNSAFE_className="hover:bg-white disabled:opacity-50"
              >
                <Redo2 size={16} />
              </ActionButton>
              <Tooltip>Redo</Tooltip>
            </TooltipTrigger>
          </Flex>
        </View>

        <TooltipTrigger>
          <ActionButton
            onPress={onLayout}
            UNSAFE_className="bg-white/80 backdrop-blur-sm hover:bg-white"
          >
            <Layout size={16} />
          </ActionButton>
          <Tooltip>Auto Layout</Tooltip>
        </TooltipTrigger>

        <View 
          backgroundColor="gray-50" 
          borderRadius="medium"
          UNSAFE_className="bg-white/80 backdrop-blur-sm"
        >
          <Flex direction="row">
            <TooltipTrigger>
              <ActionButton
                onPress={onToggleGrid}
                UNSAFE_className={`hover:bg-white ${
                  showGrid ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Grid3X3 size={16} />
              </ActionButton>
              <Tooltip>{`${showGrid ? "Hide" : "Show"} Grid`}</Tooltip>
            </TooltipTrigger>
            
            <TooltipTrigger>
              <ActionButton
                onPress={onToggleMiniMap}
                UNSAFE_className={`hover:bg-white ${
                  showMiniMap ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Map size={16} />
              </ActionButton>
              <Tooltip>{`${showMiniMap ? "Hide" : "Show"} Mini Map`}</Tooltip>
            </TooltipTrigger>
          </Flex>
        </View>
      </Flex>
    </View>
  );
};

export default GraphBuilderToolbar; 