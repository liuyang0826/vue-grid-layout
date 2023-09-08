import { defineComponent } from 'vue'
import './style.css'
import { Draggable } from '@liuyang0826/vue-draggable'
import { VueGridLayout } from '@liuyang0826/vue-grid-layout'
import { ResizableBox } from '@liuyang0826/vue-resizable'

export default defineComponent({
  setup() {
    const layout = [
      { x: 0, y: 0, w: 2, h: 2, i: 0, static: false },
      { x: 2, y: 0, w: 2, h: 4, i: 1, static: true },
      { x: 4, y: 0, w: 2, h: 5, i: 2, static: false },
      { x: 6, y: 0, w: 2, h: 3, i: 3, static: false },
      { x: 8, y: 0, w: 2, h: 3, i: 4, static: false },
      { x: 10, y: 0, w: 2, h: 3, i: 5, static: false },
      { x: 0, y: 5, w: 2, h: 5, i: 6, static: false },
      { x: 2, y: 5, w: 2, h: 5, i: 7, static: false },
      { x: 4, y: 5, w: 2, h: 5, i: 8, static: false },
      { x: 6, y: 3, w: 2, h: 4, i: 9, static: true },
      { x: 8, y: 4, w: 2, h: 4, i: 10, static: false },
      { x: 10, y: 4, w: 2, h: 4, i: 11, static: false },
      { x: 0, y: 10, w: 2, h: 5, i: 12, static: false },
      { x: 2, y: 10, w: 2, h: 5, i: 13, static: false },
      { x: 4, y: 8, w: 2, h: 4, i: 14, static: false },
      { x: 6, y: 8, w: 2, h: 4, i: 15, static: false },
      { x: 8, y: 10, w: 2, h: 5, i: 16, static: false },
      { x: 10, y: 4, w: 2, h: 2, i: 17, static: false },
      { x: 0, y: 9, w: 2, h: 3, i: 18, static: false },
      { x: 2, y: 6, w: 2, h: 2, i: 19, static: false },
    ]

    return () => (
      <>
        {/* <Draggable style={{ color: 'blue' }} bounds={{ left: 0, right: 400 }}>
          <div style={{ width: '100px', height: '100px', background: 'red' }}>1</div>
        </Draggable>
        <ResizableBox width={200} height={200} class="box" minConstraints={[200, 200]}>
          <div>sasa</div>
        </ResizableBox>
        <ResizableBox width={200} height={200} class="box" minConstraints={[200, 200]}>
          <Draggable style="color: blue;" cancel=".react-resizable-handle">
            <div class="xx">sasa</div>
          </Draggable>
        </ResizableBox>
        <Draggable style="color: blue;" cancel=".react-resizable-handle">
          <ResizableBox width={200} height={200} class="box" minConstraints={[200, 200]}>
            <div class="xx">sasa</div>
          </ResizableBox>
        </Draggable> */}
        <VueGridLayout cols={12} rowHeight={30} layout={layout} width={1200} />
      </>
    )
  },
})
