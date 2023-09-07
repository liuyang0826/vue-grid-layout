import { ComponentInternalInstance, Ref } from 'vue'
import { DraggableProps, DraggableState } from '../Draggable'
import type { ControlPosition, DraggableData, MouseTouchEvent } from './types'
import type { DraggableCoreProps, DraggableCoreState } from '../DraggableCore'
import { getTouch, innerWidth, innerHeight, offsetXYFromParent, outerWidth, outerHeight } from './domFns'
import { isNum, int } from './shims'

export function getBoundPosition(
  props: DraggableProps,
  inst: ComponentInternalInstance,
  x: number,
  y: number
): [number, number] {
  // If no bounds, short-circuit and move on
  if (!props.bounds) return [x, y]

  // Clone new bounds
  let { bounds } = props
  bounds = typeof bounds === 'string' ? bounds : { ...bounds }
  const node = findDOMNode(inst)

  if (typeof bounds === 'string') {
    const { ownerDocument } = node
    const ownerWindow = ownerDocument.defaultView
    let boundNode

    if (bounds === 'parent') {
      boundNode = node.parentNode
    } else {
      boundNode = ownerDocument.querySelector(bounds)
    }

    if (!(boundNode instanceof ownerWindow!.HTMLElement)) {
      throw new Error(`Bounds selector "${bounds}" could not find an element.`)
    }

    const boundNodeEl: HTMLElement = boundNode // for Flow, can't seem to refine correctly
    const nodeStyle = ownerWindow!.getComputedStyle(node)
    const boundNodeStyle = ownerWindow!.getComputedStyle(boundNodeEl)

    // Compute bounds. This is a pain with padding and offsets but this gets it exactly right.
    bounds = {
      left: -node.offsetLeft + int(boundNodeStyle.paddingLeft) + int(nodeStyle.marginLeft),
      top: -node.offsetTop + int(boundNodeStyle.paddingTop) + int(nodeStyle.marginTop),
      right:
        innerWidth(boundNodeEl) -
        outerWidth(node) -
        node.offsetLeft +
        int(boundNodeStyle.paddingRight) -
        int(nodeStyle.marginRight),
      bottom:
        innerHeight(boundNodeEl) -
        outerHeight(node) -
        node.offsetTop +
        int(boundNodeStyle.paddingBottom) -
        int(nodeStyle.marginBottom),
    }
  }

  // Keep x and y below right and bottom limits...
  if (isNum(bounds.right)) x = Math.min(x, bounds.right)
  if (isNum(bounds.bottom)) y = Math.min(y, bounds.bottom)

  // But above left and top limits.
  if (isNum(bounds.left)) x = Math.max(x, bounds.left)
  if (isNum(bounds.top)) y = Math.max(y, bounds.top)

  return [x, y]
}

export function snapToGrid(grid: [number, number], pendingX: number, pendingY: number): [number, number] {
  const x = Math.round(pendingX / grid[0]) * grid[0]
  const y = Math.round(pendingY / grid[1]) * grid[1]

  return [x, y]
}

export function canDragX(props: DraggableProps): boolean {
  return props.axis === 'both' || props.axis === 'x'
}

export function canDragY(props: DraggableProps): boolean {
  return props.axis === 'both' || props.axis === 'y'
}

// Get {x, y} positions from event.
export function getControlPosition(
  e: MouseTouchEvent,
  touchIdentifier: number | null | undefined,
  inst: ComponentInternalInstance
): ControlPosition | null {
  const touchObj = typeof touchIdentifier === 'number' ? getTouch(e, touchIdentifier) : null
  if (typeof touchIdentifier === 'number' && !touchObj) return null // not the right touch
  const node = findDOMNode(inst)
  const props = inst.props as DraggableCoreProps
  // User can provide an offsetParent if desired.
  const offsetParent = props.offsetParent || node.offsetParent || node.ownerDocument.body

  return offsetXYFromParent(touchObj || e, offsetParent as HTMLElement, props.scale)
}

// Create an data object exposed by <DraggableCore>'s events
export function createCoreData(
  inst: ComponentInternalInstance,
  state: DraggableCoreState,
  x: number,
  y: number
): DraggableData {
  const isStart = !isNum(state.lastX)
  const node = findDOMNode(inst)

  if (isStart) {
    // If this is our first move, use the x and y as last coords.
    return {
      node,
      deltaX: 0,
      deltaY: 0,
      lastX: x,
      lastY: y,
      x,
      y,
    }
  } else {
    // Otherwise calculate proper values.
    return {
      node,
      deltaX: x - state.lastX,
      deltaY: y - state.lastY,
      lastX: state.lastX,
      lastY: state.lastY,
      x,
      y,
    }
  }
}

// Create an data exposed by <Draggable>'s events
export function createDraggableData(
  props: DraggableProps,
  state: DraggableState,
  coreData: DraggableData
): DraggableData {
  const scale = props.scale

  return {
    node: coreData.node,
    x: state.x + coreData.deltaX / scale,
    y: state.y + coreData.deltaY / scale,
    deltaX: coreData.deltaX / scale,
    deltaY: coreData.deltaY / scale,
    lastX: state.x,
    lastY: state.y,
  }
}

export function findDOMNode(inst: ComponentInternalInstance): HTMLElement {
  const node = (inst.props.nodeRef as Ref<HTMLElement>)?.value ?? inst.vnode.el

  if (!node) {
    throw new Error('<DraggableCore>: Unmounted during event!')
  }

  // $FlowIgnore we can't assert on HTMLElement due to tests... FIXME
  return node
}
