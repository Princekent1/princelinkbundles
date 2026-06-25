export const omit = <T extends object, K extends keyof T>(
    fields: K[],
    obj: T
): Omit<T, K> => {
    const res = {} as Omit<T, K>
    for (const key of Object.keys(obj) as (keyof T)[]) {
        if (!fields.includes(key as K)) {
            (res as T)[key] = obj[key]
        }
    }
    return res
}
