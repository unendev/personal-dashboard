export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface WidgetConfig {
  id: string;
  position: Position;
  size: Size;
  isVisible: boolean;
  zIndex: number;
}

export interface LayoutConfig {
  [widgetId: string]: WidgetConfig;
}

export interface DragState {
  isDragging: boolean;
  startPosition: Position;
  currentPosition: Position;
  draggedWidget: string | null;
}

export interface ResizeState {
  isResizing: boolean;
  startSize: Size;
  currentSize: Size;
  resizedWidget: string | null;
}

export interface FreeLayoutProps {
  children: React.ReactNode;
  layoutConfig?: LayoutConfig;
  onLayoutChange?: (config: LayoutConfig) => void;
  isEditing?: boolean;
}

export interface DraggableWidgetProps {
  id: string;
  children: React.ReactNode;
  position?: Position;
  size?: Size;
  onMove?: (id: string, position: Position) => void;
  onResize?: (id: string, size: Size) => void;
  isEditing?: boolean;
  zIndex?: number;
}

export interface AdaptiveGridProps {
  columns?: number;
  gap?: string;
  children: React.ReactNode;
  className?: string;
}