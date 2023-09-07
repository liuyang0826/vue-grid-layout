import { PropType, VNodeChild } from 'vue'
import { DraggableCoreProps } from '@liuyang0826/vue-draggable'

export type Axis = 'both' | 'x' | 'y' | 'none'

export type ResizeHandleAxis = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'

export type ResizableState = void

export type ResizableBoxState = {
  width: number
  height: number
  propsWidth: number
  propsHeight: number
}

export type DragCallbackData = {
  node: HTMLElement
  x: number
  y: number
  deltaX: number
  deltaY: number
  lastX: number
  lastY: number
}

export type ResizeCallbackData = {
  node: HTMLElement
  size: { width: number; height: number }
  handle: ResizeHandleAxis
}

export const resizableProps = {
  /*
   * Restricts resizing to a particular axis (default: 'both')
   * 'both' - allows resizing by width or height
   * 'x' - only allows the width to be changed
   * 'y' - only allows the height to be changed
   * 'none' - disables resizing altogether
   * */
  axis: { type: String as PropType<'both' | 'x' | 'y' | 'none'>, default: 'both' },
  /*
   * These will be passed wholesale to react-draggable's DraggableCore
   * */
  draggableOpts: Object as PropType<DraggableCoreProps>,
  /*
   * Initial width
   */
  width: { type: Number as PropType<number>, required: true },
  /*
   * Initial height
   * */
  height: { type: Number as PropType<number>, required: true },
  /*
   * Customize cursor resize handle
   * */
  handle: Function as PropType<(handleAxis: ResizeHandleAxis) => VNodeChild>,
  /*
   * If you change this, be sure to update your css
   * */
  handleSize: { type: Array as PropType<number[]>, default: () => [20, 20] },
  lockAspectRatio: Boolean as PropType<boolean>,
  /*
   * Max X & Y measure
   * */
  maxConstraints: { type: Array as PropType<number[]>, default: () => [Infinity, Infinity] },
  /*
   * Min X & Y measure
   * */
  minConstraints: { type: Array as PropType<number[]>, default: () => [20, 20] },
  /*
   * Called on stop resize event
   * */
  onResizeStop: Function as PropType<(e: MouseEvent, data: ResizeCallbackData) => any>,
  /*
   * Called on start resize event
   * */
  onResizeStart: Function as PropType<(e: MouseEvent, data: ResizeCallbackData) => any>,
  /*
   * Called on resize event
   * */
  onResize: Function as PropType<(e: MouseEvent, data: ResizeCallbackData) => any>,
  /*
   * Defines which resize handles should be rendered (default: 'se')
   * 's' - South handle (bottom-center)
   * 'w' - West handle (left-center)
   * 'e' - East handle (right-center)
   * 'n' - North handle (top-center)
   * 'sw' - Southwest handle (bottom-left)
   * 'nw' - Northwest handle (top-left)
   * 'se' - Southeast handle (bottom-right)
   * 'ne' - Northeast handle (top-center)
   * */
  resizeHandles: {
    type: Array as PropType<('s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne')[]>,
    default: () => ['se'],
  },

  /*
   * If `transform: scale(n)` is set on the parent, this should be set to `n`.
   * */
  transformScale: { type: Number as PropType<number>, default: 1 },
}
