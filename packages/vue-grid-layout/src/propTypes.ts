import type { EventCallback, CompactType, DragOverEvent, Layout, LayoutItem } from './utils'
import type { ResizeHandleAxis } from '@liuyang0826/vue-resizable'
import type { PropType, VNodeChild } from 'vue'

export const propTypes = {
  width: Number as PropType<number>,
  autoSize: { type: Boolean as PropType<boolean>, default: true },
  cols: { type: Number as PropType<number>, default: 12 },
  draggableCancel: String as PropType<string>,
  draggableHandle: String as PropType<string>,
  compactType: { type: String as PropType<CompactType>, default: 'vertical' },
  layout: Array as PropType<Layout>,
  margin: { type: Array as PropType<number[]>, default: () => [10, 10] },
  containerPadding: Array as PropType<number[]>,
  rowHeight: { type: Number as PropType<number>, default: 150 },
  maxRows: { type: Number as PropType<number>, default: Infinity },
  isBounded: Boolean as PropType<boolean>,
  isDraggable: { type: Boolean as PropType<boolean>, default: true },
  isResizable: { type: Boolean as PropType<boolean>, default: true },
  isDroppable: Boolean as PropType<boolean>,
  preventCollision: Boolean as PropType<boolean>,
  useCSSTransforms: { type: Boolean as PropType<boolean>, default: true },
  transformScale: Number as PropType<number>,
  droppingItem: { type: Object as PropType<LayoutItem>, default: () => ({ i: -1, h: 1, w: 1 }) },
  resizeHandles: { type: Array as PropType<ResizeHandleAxis[]>, default: () => ['se'] },
  resizeHandle: Function as PropType<(handleAxis: ResizeHandleAxis) => VNodeChild>,
  allowOverlap: Boolean as PropType<boolean>,

  // Callbacks
  onLayoutChange: Function as PropType<(layout: Layout) => void>,
  onDrag: Function as PropType<EventCallback>,
  onDragStart: Function as PropType<EventCallback>,
  onDragStop: Function as PropType<EventCallback>,
  onResize: Function as PropType<EventCallback>,
  onResizeStart: Function as PropType<EventCallback>,
  onResizeStop: Function as PropType<EventCallback>,
  onDropDragOver: Function as PropType<(e: DragEvent) => { w?: number; h?: number } | false | void>,
  onDrop: Function as PropType<(layout: Layout, item: LayoutItem, e: Event) => void>,
  // innerRef?: Ref<"div">
} as const
