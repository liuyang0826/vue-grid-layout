import { defineComponent } from 'vue'
import { Draggable } from '@liuyang0826/vue-draggable/index'

export default defineComponent({
  setup() {
    return () => (
      <Draggable style={{ color: 'blue' }} axis="x">
        <div style={{ width: '100px', height: '100px', background: 'red' }}>1</div>
      </Draggable>
    )
  },
})
