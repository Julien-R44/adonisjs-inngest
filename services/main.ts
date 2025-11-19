import app from '@adonisjs/core/services/app'
import { InngestClient } from '../src/types.ts'

let inngest: InngestClient

/**
 * Returns a singleton instance of the Inngest client.
 */
await app.booted(async () => {
  inngest = await app.container.make('inngest')
})

export { inngest as default }
