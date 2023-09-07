import { defineComponent, nextTick, reactive } from 'vue'
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
        Object.assign(state, size)

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

      return (
        <Resizable
          axis={axis}
          draggableOpts={draggableOpts}
          handle={handle}
          handleSize={handleSize}
          height={state.height}
          lockAspectRatio={lockAspectRatio}
          maxConstraints={maxConstraints}
          minConstraints={minConstraints}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
          resizeHandles={resizeHandles}
          transformScale={transformScale}
          width={state.width}
        >
          <div style={{ width: `${state.width}px`, height: `${state.height}px` }}>{slots.default?.()}</div>
        </Resizable>
      )
    }
  },
})
