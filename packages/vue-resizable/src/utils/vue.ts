import { Fragment, Slots, VNode, VNodeChild, createTextVNode } from 'vue'

function flatten(vNodes: VNodeChild[], filterCommentNode?: boolean, result: VNode[] = []) {
  vNodes.forEach((vNode) => {
    if (vNode === null) return

    if (typeof vNode !== 'object') {
      if (typeof vNode === 'string' || typeof vNode === 'number') {
        result.push(createTextVNode(String(vNode)))
      }

      return
    }

    if (Array.isArray(vNode)) {
      flatten(vNode, filterCommentNode, result)

      return
    }

    if (vNode.type === Fragment) {
      if (vNode.children === null) return

      if (Array.isArray(vNode.children)) {
        flatten(vNode.children, filterCommentNode, result)
      }
      // rawSlot
    } else if (vNode.type !== Comment) {
      result.push(vNode)
    }
  })

  return result
}

export function getFirstSlotVNode(slots: Slots, slotName = 'default', props?: unknown) {
  const slot = slots[slotName]

  if (!slot) {
    console.warn('getFirstSlotVNode', `slot[${slotName}] is empty`)

    return null
  }

  const slotContent = flatten(slot(props))

  // vue will normalize the slot, so slot must be an array
  if (slotContent.length === 1) {
    return slotContent[0]
  } else {
    console.warn('getFirstSlotVNode', `slot[${slotName}] should have exactly one child`)

    return null
  }
}

export function appendEvents(vNode: VNode, eventName: string, handler: (...args: any[]) => any) {
  if (!vNode.props) vNode.props = {}
  else {
    vNode.props = Object.assign({}, vNode.props)
  }

  const originalHandler = vNode.props[eventName]

  if (!originalHandler) vNode.props[eventName] = handler
  else {
    vNode.props[eventName] = (...args: any[]) => {
      originalHandler(...args)
      handler(...args)
    }
  }
}
