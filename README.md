# AdonisJS Inngest

Small wrapper package to integrate [Inngest](https://www.inngest.com) with AdonisJS applications. Build reliable, type-safe background workflows using Inngest's powerful step functions.

## Installation

Install the package from npm registry as follows:

```bash
npm i @julr/adonisjs-inngest inngest
```

Next, configure the package by running the following command:

```bash
node ace configure @julr/adonisjs-inngest
```

## Local Development

To develop with Inngest, you need to run the Inngest Dev Server alongside your AdonisJS application:

```bash
npx inngest-cli@latest dev
```

This starts the Inngest dashboard at `http://localhost:8288` where you can view and debug your workflows.

## Configuration

The configuration is stored inside the `config/inngest.ts` file. You can define event schemas for type safety and register your workflows:

```ts
import vine from '@vinejs/vine'
import type { Inngest } from 'inngest'
import { EventSchemas } from 'inngest'
import app from '@adonisjs/core/services/app'
import { defineConfig, defineVineValidator } from '@julr/adonisjs-inngest'

const config = defineConfig({
  id: app.appName,
  isDev: app.inDev,
  schemas: new EventSchemas().fromSchema({
    'user/user.created': defineVineValidator({
      id: vine.string().uuid(),
      email: vine.string().email(),
    }),
    'order/payment.completed': defineVineValidator({
      orderId: vine.string(),
      amount: vine.number(),
    }),
  }),
  workflows: [
    () => import('#app/workflows/welcome_user_workflow'),
    () => import('#app/workflows/process_payment_workflow'),
  ],
})

export default config

declare module '@julr/adonisjs-inngest/types' {
  interface InngestTypings {
    client: Inngest<typeof config>
  }
}
```

### Configuration options

- **id**: Unique identifier for your Inngest app (usually your app name)
- **isDev**: Development mode flag, automatically set based on your AdonisJS environment
- **schemas**: Event schemas for type safety using VineJS validators ( or any standard schemas compatible library)
- **workflows**: Array of workflow imports to register

## Creating workflows

You can create a new workflow using the Ace command:

```bash
node ace make:workflow WelcomeUser
```

This will create a new workflow class in `app/workflows/welcome_user_workflow.ts`:

```ts
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import type { Inngest } from '@julr/adonisjs-inngest/types'
import { defineOptions, defineTrigger } from '@julr/adonisjs-inngest'

@inject()
export default class WelcomeUserWorkflow implements Inngest.Workflow {
  options = defineOptions({
    id: 'welcome-user',
    concurrency: 5,
  })

  trigger = defineTrigger({
    event: 'user/user.created',
  })

  async handler({ event, step }: Inngest.Context<WelcomeUserWorkflow>) {
    // Send welcome email immediately
    await step.run('send-welcome-email', async () => {
      await mail.send((message) => {
        message
          .to(event.data.email)
          .subject('Welcome!')
          .htmlView('emails/welcome', { user: event.data })
      })
    })

    // Wait 3 days before sending follow-up
    await step.sleep('wait-3-days', '3d')

    // Send follow-up email
    await step.run('send-followup-email', async () => {
      await mail.send((message) => {
        message
          .to(event.data.email)
          .subject('How are you doing?')
          .htmlView('emails/followup', { user: event.data })
      })
    })

    return { emailsSent: 2 }
  }

  onFailure({ event, error }: Inngest.Context<WelcomeUserWorkflow>) {
    logger.error('Welcome workflow failed for user:', event.data.id, error)
  }
}
```

## Workflow structure

### Class-based approach

Workflows are defined as classes implementing the `Inngest.Workflow` interface. This allows you to use AdonisJS's dependency injection system with the `@inject()` decorator.

### Required properties

- **options**: Configuration object with workflow ID and other Inngest options
- **trigger**: Event trigger configuration (event name or cron schedule)
- **handler**: Main workflow function that receives the Inngest context

### Optional properties

- **onFailure**: Called when the workflow fails, useful for error handling and cleanup

### `step.invoke`

This package extends Inngest's `step.invoke` to work seamlessly with workflow classes:

```ts
export default class ProcessOrderWorkflow implements Inngest.Workflow {
  async handler({ step }: Inngest.Context<ProcessOrderWorkflow>) {
    // Invoke another workflow using the class (type-safe)
    await step.invoke('send-confirmation', {
      workflow: SendEmailWorkflow, // Pass the workflow class
      data: { // Automatically typed based on SendEmailWorkflow's trigger
        orderId: event.data.id, 
        email: event.data.email 
      }
    })
  }
}
```

The `data` object is automatically typed based on the target workflow's trigger event schema, providing full type safety across workflow boundaries.

See the [official documentation](https://www.inngest.com/docs/reference/functions/step-invoke) for more details on `step.invoke`.

## Triggering workflows

### From your application

You can trigger workflows by sending events using the Inngest service:

```ts
import inngest from '@julr/adonisjs-inngest/services/main'

export default class UsersController {
  async store({ request }: HttpContext) {
    const user = await User.create(request.body())

    await inngest.send({
      name: 'user/user.created',
      data: { id: user.id, email: user.email, },
    })

    return user
  }
}
```

### Scheduled workflows

You can also create cron-based workflows:

```ts
export default class DailyReportWorkflow implements Inngest.Workflow {
  options = defineOptions({
    id: 'daily-report',
  })

  trigger = defineTrigger({
    cron: '0 9 * * *', // Every day at 9 AM
  })

  async handler({ step }: Inngest.Context<DailyReportWorkflow>) {
    // Generate and send daily report
  }
}
```

## Inngest Connect

The package uses Inngest's [connect](https://www.inngest.com/docs/setup/connect) method for both development and production environments. Connect allows your app to create an outbound persistent connection to Inngest, enabling horizontal scaling across multiple workers.

**Key benefits of connect:**
- **Lowest latency** - Persistent connections enable the lowest latency between your app and Inngest
- **Elastic horizontal scaling** - Easily add more capacity by running additional workers
- **Ideal for container runtimes** - Deploy on Kubernetes or ECS without the need of a load balancer for inbound traffic
- **Simpler long running steps** - Step execution is not bound by platform HTTP timeouts

When you start your AdonisJS application, the Inngest connection will automatically be established and your workflows will be ready to receive events.

## Type Safety

The package provides full type safety for your events when you define schemas in your configuration. The event data will be automatically typed based on your VineJS schemas:

```ts
// event.data is automatically typed as { id: string, email: string }
async handler({ event }: Inngest.Context<WelcomeUserWorkflow>) {
  console.log(event.data.id) // ✅ TypeScript knows this is a string
  console.log(event.data.invalidProp) // ❌ TypeScript error
}
```

## Learn more

This package provides AdonisJS-specific features on top of Inngest. For comprehensive documentation about Inngest's capabilities, step functions, retry logic, and advanced features, visit the [official Inngest documentation](https://www.inngest.com/docs).

## License

[MIT](LICENSE.md)
