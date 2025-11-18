// oxlint-disable no-unused-vars
import { test } from '@japa/runner'
import { Inngest } from '../src/types.ts'
import { Inngest as InngestLib } from 'inngest'
import { defineConfig } from '../src/define_config.ts'
import { EventSchemas } from 'inngest'
import vine from '@vinejs/vine'
import { defineOptions, defineTrigger, defineVineValidator } from '../src/index.ts'

const config = defineConfig({
  id: 'my-app',
  schemas: new EventSchemas().fromSchema({
    'user/user.created': defineVineValidator({
      id: vine.string().uuid(),
      name: vine.string(),
    }),
  }),
  workflows: [],
})

declare module '../src/types.ts' {
  export interface InngestTypings {
    client: InngestLib<typeof config>
  }
}

test.group('typings', () => {
  test('should error if using invalid event name', () => {
    class X implements Inngest.Workflow {
      options = defineOptions({
        id: 'user-created-workflow',
      })

      trigger = defineTrigger({
        // @ts-expect-error invalid event name
        event: 'user/user.createdd',
      })

      handler(_: Inngest.Context<any>) {}
    }

    X.toString()
  })

  test('should infer correct event data shape', () => {
    class UserCreatedWorkflow implements Inngest.Workflow {
      options = defineOptions({
        id: 'user-created-workflow',
      })

      trigger = defineTrigger({
        event: 'user/user.created',
      })

      handler(ctx: Inngest.Context<UserCreatedWorkflow>): void {
        ctx.event.data.id.endsWith('') // should be valid
        ctx.event.data.name.toLowerCase() // should be valid

        // @ts-expect-error incorrect type
        const wrongType: number = ctx.event.data.id
      }
    }

    UserCreatedWorkflow.toString()
  })

  test('should infer correct types with step.invoke', () => {
    class UserCreatedWorkflow implements Inngest.Workflow {
      options = defineOptions({
        id: 'user-created-workflow',
      })

      trigger = defineTrigger({
        event: 'user/user.created',
      })

      handler(ctx: Inngest.Context<UserCreatedWorkflow>) {
        // @ts-ignore
        const userId: string = ctx.event.data.id

        return { result: 42 }
      }
    }

    class MyWorkflow implements Inngest.Workflow {
      trigger = defineTrigger({
        event: 'user/user.created',
      })

      options = defineOptions({
        id: 'my-workflow',
      })

      async handler(ctx: Inngest.Context<any>): Promise<void> {
        const result = await ctx.step.invoke('another-workflow', {
          workflow: UserCreatedWorkflow,
          data: { id: 'some-uuid', name: 'Julian' },
        })

        result.result.toFixed() // should be valid
      }
    }

    new MyWorkflow()
  })
})
