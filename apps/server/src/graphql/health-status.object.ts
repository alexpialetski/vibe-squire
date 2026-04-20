import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HealthStatus {
  @Field()
  ok!: boolean;

  @Field()
  version!: string;

  @Field(() => GraphQLISODateTime)
  timestamp!: Date;
}
