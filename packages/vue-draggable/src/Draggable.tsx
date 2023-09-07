import {
  ComponentInternalInstance,
  ExtractPropTypes,
  PropType,
  defineComponent,
  getCurrentInstance,
  h,
  onBeforeUnmount,
  onMounted,
  reactive,
} from 'vue'
import { DraggableCore, props as draggableCoreProps } from './DraggableCore'
import { createCSSTransform, createSVGTransform } from './utils/domFns'
import { canDragX, canDragY, createDraggableData, findDOMNode, getBoundPosition } from './utils/positionFns'
import { Bounds, ControlPosition, DraggableEventHandler } from './utils/types'

export type DraggableState = {
  dragging: boolean
  dragged: boolean
  x: number
  y: number
  slackX: number
  slackY: number
  isElementSVG: boolean
  prevPropsPosition: ControlPosition | null
}

export const draggableProps = {
  ...draggableCoreProps,
  axis: { type: String as PropType<'both' | 'x' | 'y' | 'none'>, default: 'both' },
  bounds: { type: [Object, String, Boolean] as PropType<Bounds | string | false>, default: false },
  defaultClassName: { type: String as PropType<string>, default: 'vue-draggable' },
  defaultClassNameDragging: { type: String as PropType<string>, default: 'vue-draggable-dragging' },
  defaultClassNameDragged: { type: String as PropType<string>, default: 'vue-draggable-dragged' },
  defaultPosition: { type: Object as PropType<{ x: number; y: number }>, default: () => ({ x: 0, y: 0 }) },
  positionOffset: Object as PropType<{ x: number | string; y: number | string }>,
  position: Object as PropType<{ x: number; y: number }>,
}

export type DraggableProps = ExtractPropTypes<typeof draggableProps>

export const Draggable = defineComponent({
  props: draggableProps,
  setup(props, { slots }) {
    const state = reactive<DraggableState>({
      // Whether or not we are currently dragging.
      dragging: false,

      // Whether or not we have been dragged before.
      dragged: false,

      // Current transform x and y.
      x: props.position ? props.position.x : props.defaultPosition.x,
      y: props.position ? props.position.y : props.defaultPosition.y,

      prevPropsPosition: { ...props.position } as ControlPosition,

      // Used for compensating for out-of-bounds drags
      slackX: 0,
      slackY: 0,

      // Can only determine if SVG after mounting
      isElementSVG: false,
    })

    let inst: ComponentInternalInstance

    onMounted(() => {
      inst = getCurrentInstance()!

      if (typeof window.SVGElement !== 'undefined') {
        if (findDOMNode(inst) instanceof window.SVGElement) state.isElementSVG = true
      }
    })

    onBeforeUnmount(() => {
      state.dragging = false
    })

    const onDragStart: DraggableEventHandler = (e, coreData) => {
      // Short-circuit if user's callback killed it.
      const shouldStart = props.onStart?.(e, createDraggableData(props, state, coreData!))
      // Kills start event on core as well, so move handlers are never bound.
      if (shouldStart === false) return false

      state.dragging = true
      state.dragged = true
    }

    const onDrag: DraggableEventHandler = (e, coreData) => {
      if (!state.dragging) return false

      const uiData = createDraggableData(props, state, coreData!)

      const newState = {
        x: uiData.x,
        y: uiData.y,
      } as DraggableState

      // Keep within bounds.
      if (props.bounds) {
        // Save original x and y.
        const { x, y } = newState

        // Add slack to the values used to calculate bound position. This will ensure that if
        // we start removing slack, the element won't react to it right away until it's been
        // completely removed.
        newState.x += state.slackX
        newState.y += state.slackY

        // Get bound position. This will ceil/floor the x and y within the boundaries.
        const [newStateX, newStateY] = getBoundPosition(props, inst, newState.x, newState.y)
        newState.x = newStateX
        newState.y = newStateY

        // Recalculate slack by noting how much was shaved by the boundPosition handler.
        newState.slackX = state.slackX + (x - newState.x)
        newState.slackY = state.slackY + (y - newState.y)

        // Update the event we fire to reflect what really happened after bounds took effect.
        uiData.x = newState.x
        uiData.y = newState.y
        uiData.deltaX = newState.x - state.x
        uiData.deltaY = newState.y - state.y
      }

      // Short-circuit if user's callback killed it.
      const shouldUpdate = props.onDrag?.(e, uiData)
      if (shouldUpdate === false) return false

      Object.assign(state, newState)
    }

    const onDragStop: DraggableEventHandler = (e, coreData) => {
      if (!state.dragging) return false

      // Short-circuit if user's callback killed it.
      const shouldContinue = props.onStop?.(e, createDraggableData(props, state, coreData!))
      if (shouldContinue === false) return false

      const newState = {
        dragging: false,
        slackX: 0,
        slackY: 0,
      } as DraggableState

      // If this is a controlled component, the result of this operation will be to
      // revert back to the old position. We expect a handler on `onDragStop`, at the least.
      const controlled = Boolean(props.position)

      if (controlled) {
        const { x, y } = props.position!
        newState.x = x
        newState.y = y
      }

      Object.assign(state, newState)
    }

    return () => {
      const {
        axis,
        bounds,
        defaultPosition,
        defaultClassName,
        defaultClassNameDragging,
        defaultClassNameDragged,
        position,
        positionOffset,
        scale,
        ...draggableCoreProps
      } = props

      let style = {}
      let svgTransform = null

      // If this is controlled, we don't want to move it - unless it's dragging.
      const controlled = Boolean(position)
      const draggable = !controlled || state.dragging

      const validPosition = position || defaultPosition

      const transformOpts = {
        // Set left if horizontal drag is enabled
        x: canDragX(props) && draggable ? state.x : validPosition.x,

        // Set top if vertical drag is enabled
        y: canDragY(props) && draggable ? state.y : validPosition.y,
      }

      // If this element was SVG, we use the `transform` attribute.
      if (state.isElementSVG) {
        svgTransform = createSVGTransform(transformOpts, positionOffset)
      } else {
        // Add a CSS transform to move the element around. This allows us to move the element around
        // without worrying about whether or not it is relatively or absolutely positioned.
        // If the item you are dragging already has a transform set, wrap it in a <span> so <Draggable>
        // has a clean slate.
        style = createCSSTransform(transformOpts, positionOffset)
      }

      const className = [
        defaultClassName,
        {
          [defaultClassNameDragging]: state.dragging,
          [defaultClassNameDragged]: state.dragged,
        },
      ]

      return h(
        DraggableCore,
        {
          ...draggableCoreProps,
          onStart: onDragStart,
          onDrag: onDrag,
          onStop: onDragStop,
          class: className,
          style: style,
          transform: svgTransform,
        },
        slots
      )
    }
  },
})
