import { defineComponent, h, reactive, ref, Text, watch, withDirectives } from 'vue'
import { appendEvents, getFirstSlotVNode, patchFirstSlotVNode } from 'shared'
import type { DraggableEventHandler, EventHandler, MouseTouchEvent } from './utils/types'
import type { ExtractPropTypes, PropType } from 'vue'
import { addEvent, getTouchIdentifier, matchesSelectorAndParentsTo, removeEvent } from './utils/domFns'
import { createCoreData, getControlPosition, snapToGrid } from './utils/positionFns'

const eventsFor = {
  touch: {
    start: 'touchstart',
    move: 'touchmove',
    stop: 'touchend',
  },
  mouse: {
    start: 'mousedown',
    move: 'mousemove',
    stop: 'mouseup',
  },
}

// Default to mouse events.
let dragEventFor = eventsFor.mouse

export type DraggableCoreState = {
  dragging: boolean
  lastX: number
  lastY: number
  touchIdentifier?: number | null
}

export type DraggableData = {
  node: HTMLElement
  x: number
  y: number
  deltaX: number
  deltaY: number
  lastX: number
  lastY: number
}

export const props = {
  allowAnyClick: Boolean as PropType<boolean>,
  disabled: Boolean as PropType<boolean>,
  offsetParent: Object as PropType<HTMLElement>,
  grid: Array as PropType<number[]>,
  handle: String as PropType<string>,
  cancel: String as PropType<string>,
  onStart: Function as PropType<DraggableEventHandler>,
  onDrag: Function as PropType<DraggableEventHandler>,
  onStop: Function as PropType<DraggableEventHandler>,
  onMouseDown: Function as PropType<DraggableEventHandler>,
  scale: { type: Number as PropType<number>, default: 1 },
}

export type DraggableCoreProps = ExtractPropTypes<typeof props>

export const DraggableCore = defineComponent({
  props: props,
  setup(props, { slots }) {
    const nodeRef = ref<HTMLElement | null>(null)

    const state = reactive<DraggableCoreState>({
      dragging: false,
      lastX: NaN,
      lastY: NaN,
      touchIdentifier: null,
    })

    watch(nodeRef, (node) => {
      if (!node) return
      addEvent(node, eventsFor.touch.start, onTouchStart, { passive: false })
    })

    const handleDragStart: EventHandler<MouseTouchEvent> = (e) => {
      // Make it possible to attach event handlers on top of this one.
      props.onMouseDown?.(e)

      // Only accept left-clicks.
      if (!props.allowAnyClick && typeof e.button === 'number' && e.button !== 0) return false

      // Get nodes. Be sure to grab relative document (could be iframed)
      const thisNode = nodeRef.value

      if (!thisNode || !thisNode.ownerDocument || !thisNode.ownerDocument.body) {
        throw new Error('<DraggableCore> not mounted on DragStart!')
      }

      const { ownerDocument } = thisNode

      // Short circuit if handle or cancel prop was provided and selector doesn't match.
      if (
        props.disabled ||
        !(e.target instanceof ownerDocument.defaultView!.Node) ||
        (props.handle && !matchesSelectorAndParentsTo(e.target, props.handle, thisNode)) ||
        (props.cancel && matchesSelectorAndParentsTo(e.target, props.cancel, thisNode))
      ) {
        return
      }

      // Prevent scrolling on mobile devices, like ipad/iphone.
      // Important that this is after handle/cancel.
      if (e.type === 'touchstart') e.preventDefault()

      // Set touch identifier in component state if this is a touch event. This allows us to
      // distinguish between individual touches on multitouch screens by identifying which
      // touchpoint was set to this element.
      const touchIdentifier = getTouchIdentifier(e)
      state.touchIdentifier = touchIdentifier

      // Get the current drag point from the event. This is used as the offset.
      const position = getControlPosition(e, touchIdentifier, props, nodeRef.value!)
      if (position === null) return // not possible but satisfies flow
      const { x, y } = position

      // Create an event object with all the data parents need to make a decision here.
      const coreEvent = createCoreData(nodeRef.value!, state, x, y)

      const shouldUpdate = props.onStart?.(e, coreEvent)
      if (shouldUpdate === false) return

      // Initiate dragging. Set the current x and y as offsets
      // so we know how much we've moved during the drag. This allows us
      // to drag elements around even if they have been moved, without issue.
      state.dragging = true
      state.lastX = x
      state.lastY = y

      // Add events to the document directly so we catch when the user's mouse/touch moves outside of
      // this element. We use different events depending on whether or not we have detected that this
      // is a touch-capable device.
      addEvent(ownerDocument, dragEventFor.move, handleDrag)
      addEvent(ownerDocument, dragEventFor.stop, handleDragStop)
    }

    const handleDrag: EventHandler<MouseTouchEvent> = (e) => {
      e.preventDefault()
      // Get the current drag point from the event. This is used as the offset.
      const position = getControlPosition(e, state.touchIdentifier, props, nodeRef.value!)
      if (position === null) return
      let { x, y } = position

      // Snap to grid if prop has been provided
      if (Array.isArray(props.grid)) {
        let deltaX = x - state.lastX,
          deltaY = y - state.lastY

        ;[deltaX, deltaY] = snapToGrid(props.grid as [number, number], deltaX, deltaY)
        if (!deltaX && !deltaY) return // skip useless drag
        ;(x = state.lastX + deltaX), (y = state.lastY + deltaY)
      }

      const coreEvent = createCoreData(nodeRef.value!, state, x, y)

      // Call event handler. If it returns explicit false, trigger end.
      const shouldUpdate = props.onDrag?.(e, coreEvent)

      if (shouldUpdate === false) {
        handleDragStop(new MouseEvent('mouseup') as MouseTouchEvent)
      } else {
        state.lastX = x
        state.lastY = y
      }
    }

    const handleDragStop: EventHandler<MouseTouchEvent> = (e) => {
      if (!state.dragging) return

      const position = getControlPosition(e, state.touchIdentifier, props, nodeRef.value!)
      if (position === null) return
      let { x, y } = position

      // Snap to grid if prop has been provided
      if (Array.isArray(props.grid)) {
        let deltaX = x - state.lastX || 0

        let deltaY = y - state.lastY || 0

        ;[deltaX, deltaY] = snapToGrid(props.grid as [number, number], deltaX, deltaY)
        x = state.lastX + deltaX
        y = state.lastY + deltaY
      }

      const coreEvent = createCoreData(nodeRef.value!, state, x, y)

      // Call event handler
      const shouldContinue = props.onStop?.(e, coreEvent)
      if (shouldContinue === false) return false

      const thisNode = nodeRef.value

      // Reset the el.
      state.dragging = false
      state.lastX = NaN
      state.lastY = NaN

      if (thisNode) {
        // Remove event handlers
        removeEvent(thisNode.ownerDocument, dragEventFor.move, handleDrag)
        removeEvent(thisNode.ownerDocument, dragEventFor.stop, handleDragStop)
      }
    }

    const onMouseDown: EventHandler<MouseTouchEvent> = (e) => {
      dragEventFor = eventsFor.mouse // on touchscreen laptops we could switch back to mouse

      return handleDragStart(e)
    }

    const onMouseUp: EventHandler<MouseTouchEvent> = (e) => {
      dragEventFor = eventsFor.mouse

      return handleDragStop(e)
    }

    // Same as onMouseDown (start drag), but now consider this a touch device.
    const onTouchStart: EventHandler<MouseTouchEvent> = (e) => {
      // We're on a touch device now, so change the event handlers
      dragEventFor = eventsFor.touch

      return handleDragStart(e)
    }

    const onTouchEnd: EventHandler<MouseTouchEvent> = (e) => {
      // We're on a touch device now, so change the event handlers
      dragEventFor = eventsFor.touch

      return handleDragStop(e)
    }

    return () => {
      let defaultNode = getFirstSlotVNode(slots)
      defaultNode = defaultNode?.type === Text ? h('div', defaultNode.props, [defaultNode]) : defaultNode

      patchFirstSlotVNode(defaultNode, (defaultNode) => {
        defaultNode = withDirectives(defaultNode, [
          [
            {
              mounted: (el) => (nodeRef.value = el),
              updated: (el) => (nodeRef.value = el),
              unmounted: () => (nodeRef.value = null),
            },
          ],
        ])

        appendEvents(defaultNode, 'onMousedown', onMouseDown)
        appendEvents(defaultNode, 'onMouseup', onMouseUp)
        appendEvents(defaultNode, 'onTouchend', onTouchEnd)
      })

      return defaultNode
    }
  },
})
