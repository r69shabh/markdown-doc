export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  const object = value as object
  if (seen.has(object)) {
    return value
  }

  seen.add(object)
  for (const key of Reflect.ownKeys(object)) {
    const child = Reflect.get(object, key)
    if (child !== null && typeof child === 'object') {
      deepFreeze(child, seen)
    }
  }

  return Object.freeze(value)
}
