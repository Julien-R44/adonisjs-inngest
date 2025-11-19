import app from '@adonisjs/core/services/app'
import { Inngest } from '../src/inngest.ts'

let inngest: Inngest

/**
 * Returns a singleton instance of the Inngest client.
 */
await app.booted(async () => {
  inngest = await app.container.make('inngest')
})

export { inngest as default }
