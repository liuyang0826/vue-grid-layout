import { defineComponent } from 'vue'
import { DraggableCore } from '@liuyang0826/vue-draggable'
import type { DragCallbackData, ResizeHandleAxis } from './propTypes'
import type { VNode } from 'vue'
import { resizableProps } from './propTypes'
import { getFirstSlotVNode } from './utils/vue'

export const Resizable = defineComponent({
  props: resizableProps,
  setup(props, { slots }) {
    let lastHandleRect: DOMRect | null = null
    let slack: [number, number] | null = null

    const resetData = () => {
      lastHandleRect = slack = null
    }

    const runConstraints = (width: number, height: number): [number, number] => {
      const { minConstraints, maxConstraints, lockAspectRatio } = props
      // short circuit
      if (!minConstraints && !maxConstraints && !lockAspectRatio) return [width, height]

      // If constraining to min and max, we need to also fit width and height to aspect ratio.
      if (lockAspectRatio) {
        const ratio = props.width! / props.height!
        const deltaW = width - props.width!
        const deltaH = height - props.height!

        // Find which coordinate was greater and should push the other toward it.
        // E.g.:
        // ratio = 1, deltaW = 10, deltaH = 5, deltaH should become 10.
        // ratio = 2, deltaW = 10, deltaH = 6, deltaW should become 12.
        if (Math.abs(deltaW) > Math.abs(deltaH * ratio)) {
          height = width / ratio
        } else {
          width = height * ratio
        }
      }

      const [oldW, oldH] = [width, height]

      // Add slack to the values used to calculate bound position. This will ensure that if
      // we start removing slack, the element won't react to it right away until it's been
      // completely removed.
      const [slackW, slackH] = slack || [0, 0]
      width += slackW
      height += slackH

      if (minConstraints) {
        width = Math.max(minConstraints[0], width)
        height = Math.max(minConstraints[1], height)
      }

      if (maxConstraints) {
        width = Math.min(maxConstraints[0], width)
        height = Math.min(maxConstraints[1], height)
      }

      // If the width or height changed, we must have introduced some slack. Record it for the next iteration.
      slack = [slackW + (oldW - width), slackH + (oldH - height)]

      return [width, height]
    }

    const resizeHandler = (handlerName: 'onResize' | 'onResizeStart' | 'onResizeStop', axis: ResizeHandleAxis) => {
      return (e: MouseEvent, { node, deltaX, deltaY } = {} as DragCallbackData) => {
        // Reset data in case it was left over somehow (should not be possible)
        if (handlerName === 'onResizeStart') resetData()

        // Axis restrictions
        const canDragX = (props.axis === 'both' || props.axis === 'x') && axis !== 'n' && axis !== 's'
        const canDragY = (props.axis === 'both' || props.axis === 'y') && axis !== 'e' && axis !== 'w'
        // No dragging possible.
        if (!canDragX && !canDragY) return

        // Decompose axis for later use
        const axisV = axis[0]
        const axisH = axis[axis.length - 1] // intentionally not axis[1], so that this catches axis === 'w' for example

        // Track the element being dragged to account for changes in position.
        // If a handle's position is changed between callbacks, we need to factor this in to the next callback.
        // Failure to do so will cause the element to "skip" when resized upwards or leftwards.
        const handleRect = node.getBoundingClientRect()

        if (lastHandleRect !== null) {
          // If the handle has repositioned on either axis since last render,
          // we need to increase our callback values by this much.
          // Only checking 'n', 'w' since resizing by 's', 'w' won't affect the overall position on page,
          if (axisH === 'w') {
            const deltaLeftSinceLast = handleRect.left - lastHandleRect.left
            deltaX += deltaLeftSinceLast
          }

          if (axisV === 'n') {
            const deltaTopSinceLast = handleRect.top - lastHandleRect.top
            deltaY += deltaTopSinceLast
          }
        }

        // Storage of last rect so we know how much it has really moved.
        lastHandleRect = handleRect

        // Reverse delta if using top or left drag handles.
        if (axisH === 'w') deltaX = -deltaX
        if (axisV === 'n') deltaY = -deltaY

        // Update w/h by the deltas. Also factor in transformScale.
        let width = props.width! + (canDragX ? deltaX / props.transformScale : 0)

        let height = props.height! + (canDragY ? deltaY / props.transformScale : 0)

        // Run user-provided constraints.
        ;[width, height] = runConstraints(width, height)

        const dimensionsChanged = width !== props.width || height !== props.height

        // Call user-supplied callback if present.
        const cb = typeof props[handlerName] === 'function' ? props[handlerName] : null
        // Don't call 'onResize' if dimensions haven't changed.
        const shouldSkipCb = handlerName === 'onResize' && !dimensionsChanged

        if (cb && !shouldSkipCb) {
          cb(e, { node, size: { width, height }, handle: axis })
        }

        // Reset internal data
        if (handlerName === 'onResizeStop') resetData()
      }
    }

    const renderResizeHandle = (handleAxis: ResizeHandleAxis) => {
      const { handle } = props

      // No handle provided, make the default
      if (!handle) {
        return <span class={`react-resizable-handle react-resizable-handle-${handleAxis}`} />
      }

      return handle(handleAxis)
    }

    return () => {
      const { resizeHandles, draggableOpts } = props
      const defaultNode = getFirstSlotVNode(slots)

      if (defaultNode) {
        const props = defaultNode.props || (defaultNode.props = {})
        props.class = ['react-resizable', props.class].filter(Boolean).join(' ')

        defaultNode.children = [
          defaultNode.children as VNode[],
          resizeHandles.map((handleAxis) => (
            <DraggableCore
              {...draggableOpts}
              key={`resizableHandle-${handleAxis}`}
              onStop={resizeHandler('onResizeStop', handleAxis)}
              onStart={resizeHandler('onResizeStart', handleAxis)}
              onDrag={resizeHandler('onResize', handleAxis)}
            >
              {renderResizeHandle(handleAxis)}
            </DraggableCore>
          )),
        ]
      }

      return defaultNode
    }
  },
})
