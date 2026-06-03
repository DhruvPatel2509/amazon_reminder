# Database Migrations

## Calculate Less Field Migration

This migration automatically calculates the `less` field for all existing reminders and orders using the formula:

```
less = originalAmount - refundAmount
```

### How to Run

From the backend directory, run:

```bash
npm run migrate:less
```

Or directly:

```bash
node migrations/calculateLessField.js
```

### What it does

- Finds all reminders with both `originalAmount` and `refundAmount` set
- Finds all orders with both `originalAmount` and `refundAmount` set
- Calculates `less = originalAmount - refundAmount` for each
- Updates each reminder and order in the database
- Handles edge cases (negative values become 0)

### Automatic Calculation

After this migration, all new reminders and orders will automatically have their `less` field calculated when saved. The models' pre-save hooks ensure:

```javascript
less = originalAmount - refundAmount;
```

This happens automatically for both new and updated reminders and orders.
