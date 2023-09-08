import { defineComponent, reactive, ref, normalizeStyle, onMounted } from 'vue'
import { DraggableCore, type DraggableCoreProps } from '@liuyang0826/vue-draggable'
import { Resizable, type ResizeHandleAxis } from '@liuyang0826/vue-resizable'
import { getFirstSlotVNode, patchFirstSlotVNode } from 'shared'
import type { ExtractPropTypes, PropType, VNodeChild } from 'vue'
import {
  type PositionParams,
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcWH,
  calcXY,
  clamp,
} from './calculateUtils'
import {
  setTransform,
  type DroppingPosition,
  type GridDragEvent,
  type GridResizeEvent,
  type Position,
  setTopLeft,
  perc,
  type ReactDraggableCallbackData,
  LayoutItem,
} from './utils'

type PartialPosition = { top: number; left: number }
type GridItemCallback<Data extends GridDragEvent | GridResizeEvent> = (
  item: LayoutItem,
  w: number,
  h: number,
  data: Data
) => void

const props = {
  item: { type: Object as PropType<LayoutItem>, required: true },
  cols: { type: Number as PropType<number>, required: true },
  containerWidth: { type: Number as PropType<number>, required: true },
  margin: { type: Array as PropType<number[]>, required: true },
  containerPadding: { type: Array as PropType<number[]>, required: true },
  rowHeight: { type: Number as PropType<number>, required: true },
  maxRows: { type: Number as PropType<number>, required: true },
  isDraggable: Boolean as PropType<boolean>,
  isResizable: { type: Boolean as PropType<boolean>, default: false },
  isBounded: Boolean as PropType<boolean>,
  static: Boolean as PropType<boolean>,
  useCSSTransforms: Boolean as PropType<boolean>,
  usePercentages: Boolean as PropType<boolean>,
  transformScale: { type: Number as PropType<number>, default: 1 },
  droppingPosition: Object as PropType<DroppingPosition>,

  // Draggability
  cancel: String as PropType<string>,
  handle: String as PropType<string>,

  x: { type: Number as PropType<number>, required: true },
  y: { type: Number as PropType<number>, required: true },
  w: { type: Number as PropType<number>, required: true },
  h: { type: Number as PropType<number>, required: true },

  minW: { type: Number as PropType<number>, default: 1 },
  maxW: { type: Number as PropType<number>, default: Infinity },
  minH: { type: Number as PropType<number>, default: 1 },
  maxH: { type: Number as PropType<number>, default: Infinity },
  // i: Number as PropType<number>,

  resizeHandles: Array as PropType<ResizeHandleAxis[]>,
  resizeHandle: Function as PropType<(handleAxis: ResizeHandleAxis) => VNodeChild>,

  onDrag: Function as PropType<GridItemCallback<GridDragEvent>>,
  onDragStart: Function as PropType<GridItemCallback<GridDragEvent>>,
  onDragStop: Function as PropType<GridItemCallback<GridDragEvent>>,
  onResize: Function as PropType<GridItemCallback<GridResizeEvent>>,
  onResizeStart: Function as PropType<GridItemCallback<GridResizeEvent>>,
  onResizeStop: Function as PropType<GridItemCallback<GridResizeEvent>>,
} as const

type Props = ExtractPropTypes<typeof props>

type State = {
  resizing: { width: number; height: number } | null
  dragging: { top: number; left: number } | null
}

export const GridItem = defineComponent({
  props: props,
  setup(props, { slots }) {
    const state = reactive<State>({
      resizing: null,
      dragging: null,
    })

    const elementRef = ref<HTMLElement>()

    // When a droppingPosition is present, this means we should fire a move event, as if we had moved
    // this element by `x, y` pixels.
    const moveDroppingItem = (prevProps: Props) => {
      const { droppingPosition } = props
      if (!droppingPosition) return
      const node = elementRef.value
      // Can't find DOM node (are we unmounted?)
      if (!node) return

      const prevDroppingPosition = prevProps.droppingPosition || {
        left: 0,
        top: 0,
      }

      const { dragging } = state

      const shouldDrag =
        (dragging && droppingPosition.left !== prevDroppingPosition.left) ||
        droppingPosition.top !== prevDroppingPosition.top

      if (!dragging) {
        onDragStart(droppingPosition.e, {
          node,
          deltaX: droppingPosition.left,
          deltaY: droppingPosition.top,
        })
      } else if (shouldDrag) {
        const deltaX = droppingPosition.left - dragging.left
        const deltaY = droppingPosition.top - dragging.top

        onDrag(droppingPosition.e, {
          node,
          deltaX,
          deltaY,
        })
      }
    }

    const getPositionParams = (_props: Props = props): PositionParams => {
      return {
        cols: _props.cols,
        containerPadding: _props.containerPadding as [number, number],
        containerWidth: _props.containerWidth,
        margin: _props.margin as [number, number],
        maxRows: _props.maxRows,
        rowHeight: _props.rowHeight,
      }
    }

    const createStyle = (pos: Position): string => {
      const { usePercentages, containerWidth, useCSSTransforms } = props

      let style: Record<string, string>

      // CSS Transforms support (default)
      if (useCSSTransforms) {
        style = setTransform(pos)
      } else {
        // top,left (slow)
        style = setTopLeft(pos)

        // This is used for server rendering.
        if (usePercentages) {
          style.left = perc(pos.left! / containerWidth!)
          style.width = perc(pos.width / containerWidth!)
        }
      }

      return Object.keys(style).reduce((acc, cur) => {
        acc += `${cur}: ${style[cur]};`

        return acc
      }, '')
    }

    const mixinDraggable = (child: VNodeChild, isDraggable: boolean) => {
      return (
        <DraggableCore
          disabled={!isDraggable}
          onStart={onDragStart}
          onDrag={onDrag}
          onStop={onDragStop}
          handle={props.handle}
          cancel={`.vue-resizable-handle${props.cancel ? `,${props.cancel}` : ''}`}
          scale={props.transformScale}
        >
          {{ default: () => [child] }}
        </DraggableCore>
      )
    }

    const mixinResizable = (child: VNodeChild, position: Position, isResizable: boolean) => {
      const { cols, x, minW, minH, maxW, maxH, transformScale, resizeHandles, resizeHandle } = props
      const positionParams = getPositionParams()

      // This is the max possible width - doesn't go to infinity because of the width of the window
      const maxWidth = calcGridItemPosition(positionParams, 0, 0, cols - x, 0).width
      // Calculate min/max constraints using our min & maxes
      const mins = calcGridItemPosition(positionParams, 0, 0, minW, minH)
      const maxes = calcGridItemPosition(positionParams, 0, 0, maxW, maxH)
      const minConstraints = [mins.width, mins.height]
      const maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)]

      return (
        <Resizable
          // These are opts for the resize handle itself
          draggableOpts={
            {
              disabled: !isResizable,
            } as DraggableCoreProps
          }
          class={isResizable ? undefined : 'vue-resizable-hide'}
          width={position.width}
          height={position.height}
          minConstraints={minConstraints}
          maxConstraints={maxConstraints}
          onResizeStop={onResizeStop}
          onResizeStart={onResizeStart}
          onResize={onResize}
          transformScale={transformScale}
          resizeHandles={resizeHandles}
          handle={resizeHandle}
        >
          {{ default: () => [child] }}
        </Resizable>
      )
    }

    const onDragStart: (e: Event, data: ReactDraggableCallbackData | undefined) => void = (
      e,
      { node } = {} as ReactDraggableCallbackData
    ) => {
      const { onDragStart, transformScale } = props
      if (!onDragStart) return

      const newPosition: PartialPosition = { top: 0, left: 0 }

      // TODO: this wont work on nested parents
      const { offsetParent } = node
      if (!offsetParent) return
      const parentRect = offsetParent.getBoundingClientRect()
      const clientRect = node.getBoundingClientRect()
      const cLeft = clientRect.left / transformScale
      const pLeft = parentRect.left / transformScale
      const cTop = clientRect.top / transformScale
      const pTop = parentRect.top / transformScale
      newPosition.left = cLeft - pLeft + offsetParent.scrollLeft
      newPosition.top = cTop - pTop + offsetParent.scrollTop
      console.log(newPosition)

      state.dragging = newPosition

      // Call callback with this data
      const { x, y } = calcXY(getPositionParams(), newPosition.top, newPosition.left, props.w, props.h)

      return onDragStart(props.item, x, y, { e, node, newPosition })
    }

    const onDrag: (e: Event, data: ReactDraggableCallbackData | undefined) => void = (
      e,
      { node, deltaX, deltaY } = {} as ReactDraggableCallbackData
    ) => {
      const { onDrag } = props
      if (!onDrag) return

      if (!state.dragging) {
        throw new Error('onDrag called before onDragStart.')
      }

      let top = state.dragging.top + deltaY
      let left = state.dragging.left + deltaX

      const { isBounded, w, h, containerWidth } = props
      const positionParams = getPositionParams()

      // Boundary calculations; keeps items within the grid
      if (isBounded) {
        const { offsetParent } = node

        if (offsetParent) {
          const { margin, rowHeight } = props
          const bottomBoundary = offsetParent.clientHeight - calcGridItemWHPx(h, rowHeight, margin[1])
          top = clamp(top, 0, bottomBoundary)

          const colWidth = calcGridColWidth(positionParams)
          const rightBoundary = containerWidth - calcGridItemWHPx(w, colWidth, margin[0])
          left = clamp(left, 0, rightBoundary)
        }
      }

      const newPosition: PartialPosition = { top, left }
      state.dragging = newPosition

      // Call callback with this data
      const { x, y } = calcXY(positionParams, top, left, w, h)

      return onDrag(props.item, x, y, { e, node, newPosition })
    }

    const onDragStop: (e: Event, data: ReactDraggableCallbackData | undefined) => void = (
      e,
      { node } = {} as ReactDraggableCallbackData
    ) => {
      const { onDragStop } = props
      if (!onDragStop) return

      if (!state.dragging) {
        throw new Error('onDragEnd called before onDragStart.')
      }

      const { w, h, item } = props
      const { left, top } = state.dragging
      const newPosition: PartialPosition = { top, left }
      state.dragging = null

      const { x, y } = calcXY(getPositionParams(), top, left, w, h)

      return onDragStop(item, x, y, { e, node, newPosition })
    }

    const onResizeStop: (e: Event, data: { node: HTMLElement; size: Position }) => void = (e, callbackData) => {
      onResizeHandler(e, callbackData, 'onResizeStop')
    }

    const onResizeStart: (e: Event, data: { node: HTMLElement; size: Position }) => void = (e, callbackData) => {
      onResizeHandler(e, callbackData, 'onResizeStart')
    }

    const onResize: (e: Event, data: { node: HTMLElement; size: Position }) => void = (e, callbackData) => {
      onResizeHandler(e, callbackData, 'onResize')
    }

    const onResizeHandler = (e: Event, { node, size }: { node: HTMLElement; size: Position }, handlerName: string) => {
      const handler = props[handlerName as keyof Props] as any
      if (!handler) return
      const { cols, x, y, item, maxH, minH } = props
      let { minW, maxW } = props

      // Get new XY
      let { w, h } = calcWH(getPositionParams(), size.width, size.height, x, y)

      // minW should be at least 1 (TODO propTypes validation?)
      minW = Math.max(minW, 1)

      // maxW should be at most (cols - x)
      maxW = Math.min(maxW, cols - x)

      // Min/max capping
      w = clamp(w, minW, maxW)
      h = clamp(h, minH, maxH)

      state.resizing = handlerName === 'onResizeStop' ? null : size

      handler(item, w, h, { e, node, size })
    }

    return () => {
      const { x, y, w, h, isDraggable, isResizable, droppingPosition, useCSSTransforms, static: _static } = props
      const pos = calcGridItemPosition(getPositionParams(), x, y, w, h, state)
      let defaultNode = getFirstSlotVNode(slots)

      if (defaultNode) {
        patchFirstSlotVNode(defaultNode, (node) => {
          const props = node.props || (node.props = {})

          props.class = [
            'vue-grid-item',
            props.class,
            _static && 'static',
            state.resizing && 'resizing',
            isDraggable && 'vue-draggable',
            state.dragging && 'vue-draggable-dragging',
            droppingPosition && 'dropping',
            useCSSTransforms && 'cssTransforms',
          ]
            .filter(Boolean)
            .join(' ')

          props.style = [props.style, createStyle(pos)].filter(Boolean).join('')
        })

        defaultNode = mixinResizable(defaultNode, pos, isResizable)
        defaultNode = mixinDraggable(defaultNode, isResizable)
      }

      return defaultNode
    }
  },
})
