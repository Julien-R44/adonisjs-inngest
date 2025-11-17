import ConfigureCommand from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()

  /**
   * Publish provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@julr/adonisjs-inngest/inngest_provider')
    rcFile.addCommand('@julr/adonisjs-inngest/commands')
  })

  /**
   * Publish config
   */
  await codemods.makeUsingStub(stubsRoot, 'config.stub', {})
}
