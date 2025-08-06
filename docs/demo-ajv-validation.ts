/**
 * Demo script to showcase AJV validation for template payload schemas
 * Run with: npx ts-node demo-ajv-validation.ts
 */

import { AjvSchemaValidationService } from './src/core-template-manager/shared/infrastructure/validation/ajv-schema-validation.service';

const validationService = new AjvSchemaValidationService();

console.log('🚀 AJV Template Payload Schema Validation Demo\n');

// Example 1: Valid schema
console.log('✅ Example 1: Valid email template schema');
const validEmailSchema = {
  type: 'object',
  properties: {
    customerName: {
      type: 'string',
      description: 'Customer full name',
    },
    email: {
      type: 'string',
      format: 'email',
      description: 'Customer email address',
    },
    orderNumber: {
      type: 'string',
      pattern: '^ORD-[0-9]{6}$',
      description: 'Order number in format ORD-123456',
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          quantity: { type: 'integer', minimum: 1 },
        },
        required: ['name', 'price', 'quantity'],
      },
    },
  },
  required: ['customerName', 'email', 'orderNumber'],
};

const result1 =
  validationService.validateTemplatePayloadSchema(validEmailSchema);
console.log('Result:', result1.isValid ? '✅ Valid' : '❌ Invalid');
if (!result1.isValid) {
  console.log('Errors:', result1.errors);
}
console.log();

// Example 2: Invalid schema (missing type)
console.log('❌ Example 2: Invalid schema - missing root type');
const invalidSchema1 = {
  properties: {
    name: { type: 'string' },
  },
};

const result2 = validationService.validateTemplatePayloadSchema(invalidSchema1);
console.log('Result:', result2.isValid ? '✅ Valid' : '❌ Invalid');
if (!result2.isValid) {
  console.log('Errors:', result2.errors);
}
console.log();

// Example 3: Invalid schema (non-object root type)
console.log('❌ Example 3: Invalid schema - non-object root type');
const invalidSchema2 = {
  type: 'string',
};

const result3 = validationService.validateTemplatePayloadSchema(invalidSchema2);
console.log('Result:', result3.isValid ? '✅ Valid' : '❌ Invalid');
if (!result3.isValid) {
  console.log('Errors:', result3.errors);
}
console.log();

// Example 4: Valid data validation
console.log('✅ Example 4: Validate data against schema');
const sampleData = {
  customerName: 'John Doe',
  email: 'john.doe@example.com',
  orderNumber: 'ORD-123456',
  items: [
    {
      name: 'Widget A',
      price: 29.99,
      quantity: 2,
    },
  ],
};

const result4 = validationService.validateData(validEmailSchema, sampleData);
console.log('Result:', result4.isValid ? '✅ Valid' : '❌ Invalid');
if (!result4.isValid) {
  console.log('Errors:', result4.errors);
}
console.log();

// Example 5: Invalid data validation
console.log('❌ Example 5: Invalid data - missing required field');
const invalidData = {
  customerName: 'Jane Doe',
  // missing email and orderNumber
  items: [],
};

const result5 = validationService.validateData(validEmailSchema, invalidData);
console.log('Result:', result5.isValid ? '✅ Valid' : '❌ Invalid');
if (!result5.isValid) {
  console.log('Errors:', result5.errors);
}

console.log(
  '\n🎯 AJV validation is now integrated into the CreateTemplateUseCase!',
);
console.log(
  'Templates with invalid payload schemas will be rejected during creation.',
);
