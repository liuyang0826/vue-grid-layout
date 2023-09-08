import { defineComponent, nextTick, reactive } from 'vue'
import { getFirstSlotVNode, patchFirstSlotVNode } from 'shared'
import { Resizable } from './Resizable'
import { ResizeCallbackData, resizableProps } from './propTypes'

export const ResizableBox = defineComponent({
  props: resizableProps,
  setup(props, { slots }) {
    const state = reactive({
      width: props.width,
      height: props.height,
      propsWidth: props.width,
      propsHeight: props.height,
    })

    const onResize = (e: MouseEvent, data: ResizeCallbackData) => {
      const { size } = data
      Object.assign(state, size)

      if (props.onResize) {
        nextTick(() => {
          props.onResize?.(e, data)
        })
      }
    }

    return () => {
      const {
        handle,
        handleSize,
        onResizeStart,
        onResizeStop,
        draggableOpts,
        minConstraints,
        maxConstraints,
        lockAspectRatio,
        axis,
        resizeHandles,
        transformScale,
      } = props

      const defaultNode = getFirstSlotVNode(slots)

      patchFirstSlotVNode(defaultNode, (node) => {
        const props = node.props || (node.props = {})
        props.style = [{ width: `${state.width}px`, height: `${state.height}px` }].concat(props.style)
        props.class = [props.class, 'box'].filter(Boolean).join(' ')
      })

      return (
        <Resizable
          axis={axis}
          draggableOpts={draggableOpts}
          handle={handle}
          handleSize={handleSize}
          width={state.width}
          height={state.height}
          lockAspectRatio={lockAspectRatio}
          maxConstraints={maxConstraints}
          minConstraints={minConstraints}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
          resizeHandles={resizeHandles}
          transformScale={transformScale}
        >
          {{ default: () => defaultNode }}
        </Resizable>
      )
    }
  },
})
