import { VNode, defineComponent, onMounted, reactive } from 'vue'
import { EventHandler } from '@liuyang0826/vue-draggable'
import { GridItem } from './GridItem'
import { PositionParams, calcXY } from './calculateUtils'
import { propTypes } from './propTypes'
import {
  CompactType,
  DroppingPosition,
  GridDragEvent,
  GridResizeEvent,
  Layout,
  LayoutItem,
  bottom,
  cloneLayoutItem,
  compact,
  compactType,
  getLayoutItem,
  moveElement,
  withLayoutItem,
  getAllCollisions,
  DragOverEvent,
} from './utils'

type State = {
  activeDrag: LayoutItem | null
  layout: Layout
  mounted: boolean
  oldDragItem: LayoutItem | null
  oldLayout: Layout | null
  oldResizeItem: LayoutItem | null
  droppingDOMNode: VNode | null
  droppingPosition?: DroppingPosition
  // Mirrored props
  compactType?: CompactType
  propsLayout?: Layout
}
const layoutClassName = 'vue-grid-layout'

export const VueGridLayout = defineComponent({
  props: propTypes,
  setup(props) {
    const state = reactive<State>({
      activeDrag: null,
      layout: props.layout || [],
      mounted: false,
      oldDragItem: null,
      oldLayout: null,
      oldResizeItem: null,
      droppingDOMNode: null,
    })

    onMounted(() => {
      state.mounted = true
    })

    let dragEnterCounter = 0

    const containerHeight = () => {
      if (!props.autoSize) return
      const nbRow = bottom(state.layout)
      const containerPaddingY = props.containerPadding ? props.containerPadding[1] : props.margin[1]

      return `${nbRow * props.rowHeight + (nbRow - 1) * props.margin[1] + containerPaddingY * 2}px`
    }

    const onDragStart: (l: LayoutItem, x: number, y: number, e: GridDragEvent) => void = (
      l,
      x: number,
      y: number,
      { e, node }: GridDragEvent
    ) => {
      const { layout } = state

      state.oldDragItem = { ...l }
      state.oldLayout = layout

      return props.onDragStart?.(layout, l, l, null, e, node)
    }

    const onDrag: (layoutItem: LayoutItem, x: number, y: number, e: GridDragEvent) => void = (
      layoutItem,
      x,
      y,
      { e, node }
    ) => {
      const { oldDragItem } = state
      let { layout } = state
      const { cols, allowOverlap, preventCollision } = props

      // Create placeholder (display only)
      const placeholder = {
        w: layoutItem.w,
        h: layoutItem.h,
        x: layoutItem.x,
        y: layoutItem.y,
        placeholder: true,
        i: -1,
      }

      // Move the element to the dragged location.
      const isUserAction = true

      layout = moveElement(
        layout,
        layoutItem,
        x,
        y,
        isUserAction,
        preventCollision,
        props.compactType,
        cols,
        allowOverlap
      )

      props.onDrag?.(layout, oldDragItem, layoutItem, placeholder, e, node)
      state.layout = allowOverlap ? layout : compact(layout, props.compactType, cols)
      state.activeDrag = placeholder
    }

    const onDragStop: (l: LayoutItem, x: number, y: number, e: GridDragEvent) => void = (l, x, y, { e, node }) => {
      if (!state.activeDrag) return

      const { oldDragItem } = state
      let { layout } = state
      const { cols, preventCollision, allowOverlap } = props

      // Move the element here
      const isUserAction = true
      layout = moveElement(layout, l, x, y, isUserAction, preventCollision, props.compactType, cols, allowOverlap)

      // Set state
      const newLayout = allowOverlap ? layout : compact(layout, props.compactType, cols)

      props.onDragStop?.(newLayout, oldDragItem, l, null, e, node)

      // const { oldLayout } = state

      state.activeDrag = null
      state.layout = newLayout
      state.oldDragItem = null
      state.oldLayout = null

      // onLayoutMaybeChanged(newLayout, oldLayout)
    }

    const onResizeStart: (l: LayoutItem, w: number, h: number, e: GridResizeEvent) => void = (l, w, h, { e, node }) => {
      const { layout } = state

      state.oldResizeItem = cloneLayoutItem(l)
      state.oldLayout = state.layout

      props.onResizeStart?.(layout, l, l, null, e, node)
    }

    const onResize: (layoutItem: LayoutItem, w: number, h: number, e: GridResizeEvent) => void = (
      layoutItem,
      w,
      h,
      { e, node }
    ) => {
      const { layout, oldResizeItem } = state
      const { cols, preventCollision, allowOverlap } = props

      const newLayout = withLayoutItem(layout, layoutItem, (l) => {
        // Something like quad tree should be used
        // to find collisions faster
        let hasCollisions

        if (preventCollision && !allowOverlap) {
          const collisions = getAllCollisions(layout, { ...l, w, h }).filter((layoutItem) => layoutItem.i !== l.i)
          hasCollisions = collisions.length > 0

          // If we're colliding, we need adjust the placeholder.
          if (hasCollisions) {
            // adjust w && h to maximum allowed space
            let leastX = Infinity,
              leastY = Infinity

            collisions.forEach((layoutItem) => {
              if (layoutItem.x > l.x) leastX = Math.min(leastX, layoutItem.x)
              if (layoutItem.y > l.y) leastY = Math.min(leastY, layoutItem.y)
            })

            if (Number.isFinite(leastX)) l.w = leastX - l.x
            if (Number.isFinite(leastY)) l.h = leastY - l.y
          }
        }

        if (!hasCollisions) {
          // Set new width and height.
          l.w = w
          l.h = h
        }

        return l
      })

      // Shouldn't ever happen, but typechecking makes it necessary
      if (!layoutItem) return

      // Create placeholder element (display only)
      const placeholder = {
        w: layoutItem.w,
        h: layoutItem.h,
        x: layoutItem.x,
        y: layoutItem.y,
        static: true,
        i: -1,
      }

      props.onResize?.(newLayout, oldResizeItem, layoutItem, placeholder, e, node)

      // Re-compact the newLayout and set the drag placeholder.
      state.layout = allowOverlap ? newLayout : compact(newLayout, props.compactType, cols)
      state.activeDrag = placeholder
    }

    const onResizeStop: (layoutItem: LayoutItem, w: number, h: number, e: GridResizeEvent) => void = (
      layoutItem,
      w,
      h,
      { e, node }
    ) => {
      const { layout, oldResizeItem } = state
      const { cols, allowOverlap } = props

      // Set state
      const newLayout = allowOverlap ? layout : compact(layout, props.compactType, cols)

      props.onResizeStop?.(newLayout, oldResizeItem, layoutItem, null, e, node)

      const { oldLayout } = state

      state.activeDrag = null
      state.layout = newLayout
      state.oldResizeItem = null
      state.oldLayout = null

      // onLayoutMaybeChanged(newLayout, oldLayout)
    }

    const placeholder = () => {
      const { activeDrag } = state
      if (!activeDrag) return null
      const { width, cols, margin, containerPadding, rowHeight, maxRows, useCSSTransforms, transformScale } = props

      // {...state.activeDrag} is pretty slow, actually
      return (
        <GridItem
          w={activeDrag.w}
          h={activeDrag.h}
          x={activeDrag.x}
          y={activeDrag.y}
          class="vue-grid-placeholder"
          containerWidth={width}
          cols={cols}
          margin={margin}
          containerPadding={containerPadding || margin}
          maxRows={maxRows}
          rowHeight={rowHeight}
          isDraggable={false}
          isResizable={false}
          isBounded={false}
          useCSSTransforms={useCSSTransforms}
          transformScale={transformScale}
        >
          <div />
        </GridItem>
      )
    }

    const processGridItem = (l: LayoutItem, isDroppingItem?: boolean) => {
      // if (!child || !child.key) return
      // const l = getLayoutItem(state.layout, Number(child.key))
      // if (!l) return null

      const {
        width,
        cols,
        margin,
        containerPadding,
        rowHeight,
        maxRows,
        isDraggable,
        isResizable,
        isBounded,
        useCSSTransforms,
        transformScale,
        draggableCancel,
        draggableHandle,
        resizeHandles,
        resizeHandle,
      } = props

      const { mounted, droppingPosition } = state

      // Determine user manipulations possible.
      // If an item is static, it can't be manipulated by default.
      // Any properties defined directly on the grid item will take precedence.
      const draggable = typeof l.isDraggable === 'boolean' ? l.isDraggable : !l.static && isDraggable
      const resizable = typeof l.isResizable === 'boolean' ? l.isResizable : !l.static && isResizable
      const resizeHandlesOptions = l.resizeHandles || resizeHandles

      // isBounded set on child if set on parent, and child is not explicitly false
      const bounded = draggable && isBounded && l.isBounded !== false

      return (
        <GridItem
          containerWidth={width}
          cols={cols}
          margin={margin}
          containerPadding={containerPadding || margin}
          maxRows={maxRows}
          rowHeight={rowHeight}
          cancel={draggableCancel}
          handle={draggableHandle}
          item={l}
          onDragStop={onDragStop}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
          isDraggable={draggable}
          isResizable={resizable}
          isBounded={bounded}
          useCSSTransforms={useCSSTransforms && mounted}
          usePercentages={!mounted}
          transformScale={transformScale}
          w={l.w}
          h={l.h}
          x={l.x}
          y={l.y}
          minH={l.minH}
          minW={l.minW}
          maxH={l.maxH}
          maxW={l.maxW}
          static={l.static}
          droppingPosition={isDroppingItem ? droppingPosition : undefined}
          resizeHandles={resizeHandlesOptions}
          resizeHandle={resizeHandle}
        >
          {{ default: () => <div class="box">1</div> }}
        </GridItem>
      )
    }

    const onDragOver: (e: DragEvent) => void | false = (e) => {
      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()

      // we should ignore events from layout's children in Firefox
      // to avoid unpredictable jumping of a dropping placeholder
      // FIXME remove this hack
      // if (
      //   isFirefox &&
      //   // $FlowIgnore can't figure this out
      //   !e.nativeEvent.target?.classList.contains(layoutClassName)
      // ) {
      //   return false;
      // }

      const {
        droppingItem,
        onDropDragOver,
        margin,
        cols,
        rowHeight,
        maxRows,
        width,
        containerPadding,
        transformScale,
      } = props

      // Allow user to customize the dropping item or short-circuit the drop based on the results
      // of the `onDragOver(e: Event)` callback.
      const onDragOverResult = onDropDragOver?.(e)

      if (onDragOverResult === false) {
        if (state.droppingDOMNode) {
          removeDroppingPlaceholder()
        }

        return false
      }

      const finalDroppingItem = { ...droppingItem, ...onDragOverResult }

      const { layout } = state
      // This is relative to the DOM element that this event fired for.
      const { clientX, clientY } = e

      const droppingPosition = {
        left: clientX / transformScale!,
        top: clientY / transformScale!,
        e,
      }

      if (!state.droppingDOMNode) {
        const positionParams: PositionParams = {
          cols,
          margin: margin as [number, number],
          maxRows,
          rowHeight,
          containerWidth: width!,
          containerPadding: (containerPadding as [number, number]) || (margin as [number, number]),
        }

        const calculatedPosition = calcXY(positionParams, clientX, clientY, finalDroppingItem.w, finalDroppingItem.h)

        state.droppingDOMNode = <div key={finalDroppingItem.i} />
        state.droppingPosition = droppingPosition

        state.layout = [
          ...layout,
          {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true,
          },
        ]
      } else if (state.droppingPosition) {
        const { left, top } = state.droppingPosition
        const shouldUpdatePosition = left !== clientX || top !== clientY

        if (shouldUpdatePosition) {
          state.droppingPosition = droppingPosition
        }
      }
    }

    const removeDroppingPlaceholder = () => {
      const { droppingItem, cols } = props
      const { layout } = state

      const newLayout = compact(
        layout.filter((l) => l.i !== droppingItem.i),
        props.compactType,
        cols,
        props.allowOverlap
      )

      state.layout = newLayout
      state.droppingDOMNode = null
      state.activeDrag = null
      state.droppingPosition = undefined
    }

    const onDragLeave: EventHandler<MouseEvent> = (e) => {
      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()
      dragEnterCounter -= 1

      // onDragLeave can be triggered on each layout's child.
      // But we know that count of dragEnter and dragLeave events
      // will be balanced after leaving the layout's container
      // so we can increase and decrease count of dragEnter and
      // when it'll be equal to 0 we'll remove the placeholder
      if (dragEnterCounter === 0) {
        removeDroppingPlaceholder()
      }
    }

    const onDragEnter: EventHandler<MouseEvent> = (e) => {
      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()
      dragEnterCounter += 1
    }

    const onDrop: EventHandler<MouseEvent> = (e: Event) => {
      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()
      const { droppingItem } = props
      const { layout } = state
      const item = layout.find((l) => l.i === droppingItem.i)

      // reset dragEnter counter on drop
      dragEnterCounter = 0

      removeDroppingPlaceholder()

      props.onDrop?.(layout, item!, e)
    }

    return () => {
      const { isDroppable } = props

      return (
        <div
          class={layoutClassName}
          style={{ height: containerHeight() }}
          onDrop={isDroppable ? onDrop : undefined}
          onDragleave={isDroppable ? onDragLeave : undefined}
          onDragenter={isDroppable ? onDragEnter : undefined}
          onDragover={isDroppable ? onDragOver : undefined}
        >
          {state.layout.map((item) => processGridItem(item))}
          {/* {isDroppable && state.droppingDOMNode && processGridItem(state.droppingDOMNode, true)} */}
          {placeholder()}
        </div>
      )
    }
  },
})
