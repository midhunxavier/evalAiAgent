import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a.model({
      content: a.string(),
      isDone: a.boolean()
    })
    .authorization(allow => [allow.publicApiKey()]),
  
  AgentEvaluation: a.model({
      modelName: a.string().required(),
      userQuery: a.string().required(),
      actions: a.string().array().required(),
      isCorrect: a.boolean().required(),
      userFeedback: a.string(),
      explanation: a.string(),
      timestamp: a.datetime().required(),
    })
    .authorization(allow => [allow.publicApiKey()])
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});