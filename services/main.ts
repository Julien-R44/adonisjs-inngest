import app from '@adonisjs/core/services/app'
import { Inngest } from 'inngest'

let inngest: Inngest

/**
 * Returns a singleton instance of the Inngest client.
 */
await app.booted(async () => {
  inngest = await app.container.make('inngest')
})

export { inngest as default }
