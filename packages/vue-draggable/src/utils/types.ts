export type DraggableEventHandler = (e: MouseEvent, data?: DraggableData) => void | false

export type DraggableData = {
  node: HTMLElement
  x: number
  y: number
  deltaX: number
  deltaY: number
  lastX: number
  lastY: number
}

export type Bounds = {
  left?: number
  top?: number
  right?: number
  bottom?: number
}

export type ControlPosition = { x: number; y: number }

export type PositionOffsetControlPosition = { x: number | string; y: number | string }

export type EventHandler<T> = (e: T) => void | false

// Missing in Flow
export interface SVGElement extends HTMLElement {}

// Missing targetTouches
export interface TouchEvent2 extends TouchEvent {
  changedTouches: TouchList
  targetTouches: TouchList
}

export type MouseTouchEvent = MouseEvent & TouchEvent2
