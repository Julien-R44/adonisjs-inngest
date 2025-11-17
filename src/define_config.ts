import { InngestConfig } from './types.ts'

export function defineConfig<T extends InngestConfig>(options: T) {
  return {
    optimizeParallelism: true,
    ...options,
  }
}
