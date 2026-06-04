// Plan — Domain entity
// Pure TypeScript. No framework or ORM dependencies.

import { PlanName } from '../enums';

export class Plan {
  constructor(
    public readonly id: string,
    public readonly name: PlanName,
    public readonly price: number,
    public readonly description: string,
    public readonly createdAt: Date,
  ) {}
}
