# TransactionalFee Model Changes

## Migration of Fee Amounts to Tiers

The TransactionalFee model has been updated to move fee amount properties (`fixedAmount`, `percentage`, `minAmount`, `maxAmount`) from being direct properties of the TransactionalFee model to being stored inside elements of the `tiers` array.

### Overview of Changes

1. Updated the `ITier` interface to include all fee amount fields:

   - `min`: The minimum transaction amount at which the tier applies
   - `amount`: The fixed fee amount (equivalent to `fixedAmount`)
   - `percentage`: The percentage fee rate
   - `minAmount`: The minimum fee amount regardless of calculations
   - `maxAmount`: The maximum fee amount regardless of calculations

2. Modified the TransactionalFeeEntity to store tiers as a JSON array with TypeORM

3. Updated the aggregate's business logic to work with tiers:

   - `updateFeeAmount`: Now creates or updates a tier with the fee amount data
   - `getFeeAmount`: Now looks for fee amounts in tiers first, then falls back to legacy fields
   - `validateState`: Now validates tiers if present

4. Updated the repository's methods:

   - `mapToEntity`: Creates a default tier if fee amount fields are provided but no tiers
   - `mergeEntity`: Updates tiers based on fee amount fields
   - `createAggregate`: Ensures tiers are properly loaded into the aggregate

5. Added a helper method to FeeAmount value object:
   - `createFromTier`: Creates a FeeAmount instance from a tier object

### Next Steps

1. Database Migration: A database migration script should be created to move existing fee amount data into the tiers array
2. Client Updates: Update client applications to work with the new tier-based structure
3. Deprecation Plan: Plan for eventual deprecation of the direct fee amount properties
