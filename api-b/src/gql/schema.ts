import { gql } from 'apollo-server-express'

export const schema = gql`
  type Query {
    getInstalledComponents: [GrasshopperComponent]!
  }

  type Subscription {
    onSolution(solutionId: String): SolutionManifest
  }

  type SolutionManifest {
    solutionId: String!
  }

  type GrasshopperComponent {
    guid: String!
    name: String!
    nickname: String!
    description: String!
    icon: String
    libraryName: String!
    category: String!
    subcategory: String!
    isObsolete: Boolean!
    isVariable: Boolean!
    inputs: [GrasshopperParameter]!
    outputs: [GrasshopperParameter]!
  }

  type GrasshopperParameter {
    name: String!
    nickname: String!
    description: String!
    type: String!
    isOptional: Boolean!
  }
`
