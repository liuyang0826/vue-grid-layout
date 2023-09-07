import { defineComponent } from 'vue'
import './style.css'
import { Draggable } from '@liuyang0826/vue-draggable'
import { ResizableBox } from '@liuyang0826/vue-resizable'

export default defineComponent({
  setup() {
    return () => (
      <>
        <Draggable style={{ color: 'blue' }} bounds={{ left: 0, right: 400 }}>
          <div style={{ width: '100px', height: '100px', background: 'red' }}>1</div>
        </Draggable>
        <ResizableBox width={200} height={200} class="box" minConstraints={[200, 200]}>
          <div>sasa</div>
        </ResizableBox>
        <Draggable style={{ color: 'blue' }} cancel=".react-resizable-handle">
          <ResizableBox width={200} height={200} class="box" minConstraints={[200, 200]}>
            <div>sasa</div>
          </ResizableBox>
        </Draggable>
      </>
    )
  },
})
