import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { stubsRoot } from '../stubs/main.js'

export default class MakeWorkflow extends BaseCommand {
  static commandName = 'make:workflow'
  static description = 'Make a new Inngest workflow class'
  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  /**
   * The name of the workflow file
   */
  @args.string({ description: 'Name of the workflow file' })
  declare name: string

  /**
   * Execute command
   */
  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/workflow/main.stub', {
      flags: this.parsed.flags,
      entity: this.app.generators.createEntity(this.name),
    })
  }
}
