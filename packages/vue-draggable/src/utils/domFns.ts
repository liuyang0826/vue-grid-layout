import type { ControlPosition, PositionOffsetControlPosition, MouseTouchEvent } from './types'
import { isFunction, int, findInArray } from './shims'

let matchesSelectorFunc = '' as keyof Node

export function matchesSelector(el: Node, selector: string): boolean {
  if (!matchesSelectorFunc) {
    matchesSelectorFunc = findInArray(
      ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'],
      function (method) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return isFunction(el[method])
      }
    )
  }

  // Might not be found entirely (not an Element?) - in that case, bail
  // $FlowIgnore: Doesn't think elements are indexable
  if (!isFunction(el[matchesSelectorFunc])) return false

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return el[matchesSelectorFunc](selector)
}

// Works up the tree to the draggable itself attempting to match selector.
export function matchesSelectorAndParentsTo(el: Node, selector: string, baseNode: Node): boolean {
  let node = el

  do {
    if (matchesSelector(node, selector)) return true
    if (node === baseNode) return false
    node = node.parentNode as Node
  } while (node)

  return false
}

export function addEvent(el: Node | null, event: string, handler: (...args: any[]) => any, inputOptions?: any): void {
  if (!el) return
  const options = { capture: true, ...inputOptions }
  el.addEventListener(event, handler, options)
}

export function removeEvent(
  el: Node | null,
  event: string,
  handler: (...args: any[]) => any,
  inputOptions?: any
): void {
  if (!el) return
  const options = { capture: true, ...inputOptions }
  el.removeEventListener(event, handler, options)
}

export function outerHeight(node: HTMLElement): number {
  // This is deliberately excluding margin for our calculations, since we are using
  // offsetTop which is including margin. See getBoundPosition
  let height = node.clientHeight
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node)
  height += int(computedStyle.borderTopWidth)
  height += int(computedStyle.borderBottomWidth)

  return height
}

export function outerWidth(node: HTMLElement): number {
  // This is deliberately excluding margin for our calculations, since we are using
  // offsetLeft which is including margin. See getBoundPosition
  let width = node.clientWidth
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node)
  width += int(computedStyle.borderLeftWidth)
  width += int(computedStyle.borderRightWidth)

  return width
}

export function innerHeight(node: HTMLElement): number {
  let height = node.clientHeight
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node)
  height -= int(computedStyle.paddingTop)
  height -= int(computedStyle.paddingBottom)

  return height
}

export function innerWidth(node: HTMLElement): number {
  let width = node.clientWidth
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node)
  width -= int(computedStyle.paddingLeft)
  width -= int(computedStyle.paddingRight)

  return width
}

interface EventWithOffset {
  clientX: number
  clientY: number
}

// Get from offsetParent
export function offsetXYFromParent(evt: EventWithOffset, offsetParent: HTMLElement, scale: number): ControlPosition {
  const isBody = offsetParent === offsetParent.ownerDocument.body
  const offsetParentRect = isBody ? { left: 0, top: 0 } : offsetParent.getBoundingClientRect()

  const x = (evt.clientX + offsetParent.scrollLeft - offsetParentRect.left) / scale
  const y = (evt.clientY + offsetParent.scrollTop - offsetParentRect.top) / scale

  return { x, y }
}

export function createCSSTransform(
  controlPos: ControlPosition,
  positionOffset: PositionOffsetControlPosition | undefined
) {
  const translation = getTranslation(controlPos, positionOffset, 'px')

  return { transform: translation }
}

export function createSVGTransform(
  controlPos: ControlPosition,
  positionOffset: PositionOffsetControlPosition | undefined
): string {
  const translation = getTranslation(controlPos, positionOffset, '')

  return translation
}

export function getTranslation(
  { x, y }: ControlPosition,
  positionOffset: PositionOffsetControlPosition | undefined,
  unitSuffix: string
): string {
  let translation = `translate(${x}${unitSuffix},${y}${unitSuffix})`

  if (positionOffset) {
    const defaultX = `${typeof positionOffset.x === 'string' ? positionOffset.x : positionOffset.x + unitSuffix}`
    const defaultY = `${typeof positionOffset.y === 'string' ? positionOffset.y : positionOffset.y + unitSuffix}`
    translation = `translate(${defaultX}, ${defaultY})${translation}`
  }

  return translation
}

export function getTouch(e: MouseTouchEvent, identifier: number): { clientX: number; clientY: number } | undefined {
  return (
    (e.targetTouches && findInArray(e.targetTouches, (t) => identifier === t.identifier)) ||
    (e.changedTouches && findInArray(e.changedTouches, (t) => identifier === t.identifier))
  )
}

export function getTouchIdentifier(e: MouseTouchEvent): number | undefined {
  if (e.targetTouches && e.targetTouches[0]) return e.targetTouches[0].identifier
  if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].identifier
}
