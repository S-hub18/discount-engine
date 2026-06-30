import { type CartItem, type DiscountRule } from '../engine/applyCartOffer'

export type AppEvent =
  | { type: 'RuleAdded'; rule: DiscountRule }
  | { type: 'CartReplaced'; items: CartItem[] }
  | { type: 'RowRejected'; row: unknown; reason: string }
  | { type: 'RuleRejected'; reason: string }

type AppEventType = AppEvent['type']
type EventListener<T extends AppEventType> = (event: Extract<AppEvent, { type: T }>) => void

class EventBus {
  private listeners: Map<AppEventType, Set<EventListener<any>>> = new Map()

  on<T extends AppEventType>(eventType: T, cb: EventListener<T>) {
    const currentListeners = this.listeners.get(eventType) || new Set<EventListener<T>>()
    currentListeners.add(cb)
    this.listeners.set(eventType, currentListeners as Set<EventListener<any>>)
    return () => this.off(eventType, cb)
  }

  off<T extends AppEventType>(eventType: T, cb: EventListener<T>) {
    const currentListeners = this.listeners.get(eventType)
    if (currentListeners) {
      currentListeners.delete(cb as EventListener<any>)
    }
  }

  emit(event: AppEvent) {
    const currentListeners = this.listeners.get(event.type)
    if (currentListeners) {
      for (const cb of Array.from(currentListeners)) {
        cb(event as any)
      }
    }
  }
}

const bus = new EventBus()
export default bus
