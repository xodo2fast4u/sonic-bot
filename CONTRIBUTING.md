# Contributing to Sonic Bot

## Coding Standards

This document outlines the coding standards and best practices for the Sonic Bot
project.

## Table of Contents

- [Code Style](#code-style)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Documentation](#documentation)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Security](#security)
- [Performance](#performance)

## Code Style

### General Principles

1. **Readability First**: Code should be easy to read and understand
2. **Consistency**: Follow established patterns throughout the codebase
3. **Simplicity**: Favor simple solutions over complex ones
4. **Maintainability**: Write code that's easy to modify and extend

### Formatting

We use automated tools to enforce consistent formatting:

- **ESLint**: Enforces code quality and style rules
- **Prettier**: Handles code formatting automatically
- **Husky**: Git hooks to ensure code quality before commits

#### Key Rules

- Use 2 spaces for indentation (no tabs)
- Maximum line length: 120 characters
- Use single quotes for strings
- No semicolons at end of statements
- Use trailing commas in multi-line objects/arrays
- One variable declaration per line

```javascript
// Good
const userName = 'Sonic'
const isActive = true
const config = {
  prefix: '!',
  timeout: 5000,
}

// Bad
const userName = 'Sonic'
var isActive = true
const config = { prefix: '!', timeout: 5000 }
```

### Functions

```javascript
// Good - Arrow functions for callbacks
const getUser = async userId => {
  return await userRepository.findById(userId)
}

// Good - Function declarations for main functions
function startBot() {
  console.log('🦔 Starting Sonic Bot...')
}

// Bad - Function expressions
const getUser = async function (userId) {
  return await userRepository.findById(userId)
}
```

## File Organization

### Directory Structure

```
src/
├── core/           # Core infrastructure (DI, events, errors)
├── config/         # Configuration management
├── database/       # Database layer and migrations
├── commands/       # Command handlers by category
├── utils/          # Utility functions
├── cache/          # Caching layer
└── types/          # TypeScript definitions
```

### File Naming

- Use kebab-case for file names: `user-repository.js`
- Use descriptive names that indicate purpose
- Keep files focused on a single responsibility

### Module Structure

```javascript
// Good module structure
import { container } from '../core/container.js'
import { Logger } from '../utils/logger.js'

/**
 * Brief description of what this module does
 */
export class UserService {
  constructor() {
    this.logger = container.resolve('logger')
  }

  /**
   * Method description
   * @param {string} userId - User identifier
   * @returns {Promise<User>} User object
   */
  async getUser(userId) {
    // Implementation
  }
}
```

## Naming Conventions

### Variables and Functions

- **camelCase** for variables and functions
- Use descriptive names that indicate purpose
- Avoid abbreviations unless widely understood

```javascript
// Good
const userBalance = 1000
const isActiveSession = true
const calculateTotalAmount = () => {}

// Bad
const ub = 1000
const actSess = true
const calc = () => {}
```

### Classes

- **PascalCase** for class names
- Use descriptive names that represent the concept

```javascript
// Good
class UserRepository {}
class CommandRegistry {}
class CacheManager {}

// Bad
class userRepo {}
class cmdReg {}
class cache {}
```

### Constants

- **UPPER_SNAKE_CASE** for constants
- Group related constants in objects

```javascript
// Good
const COOLDOWN_DURATIONS = {
  GLOBAL: 5000,
  WORK: 3600000,
  DAILY: 86400000,
}

const MAX_MESSAGE_LENGTH = 4096

// Bad
const cooldown = 5000
const maxLen = 4096
```

### Private Members

- Use underscore prefix for private members: `_privateMethod`
- Use # for truly private fields (when supported)

```javascript
class UserService {
  constructor() {
    this._cache = new Map()
  }

  _validateUser(user) {
    // Private validation logic
  }
}
```

## Documentation

### JSDoc Guidelines

All public functions, classes, and modules should have JSDoc comments:

```javascript
/**
 * Calculate user's total wealth including bank and cash
 * @param {string} userId - User identifier
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.includeBank=true] - Include bank balance
 * @returns {Promise<number>} Total wealth amount
 * @throws {ValidationError} When user ID is invalid
 * @example
 * const wealth = await userService.getTotalWealth('12345');
 * console.log(wealth); // 1500
 */
async getTotalWealth(userId, options = {}) {
  // Implementation
}
```

### Comments

- Use comments to explain **why**, not **what**
- Keep comments concise and up-to-date
- Use TODO/FIXME sparingly and create issues instead

```javascript
// Good - Explains complex business logic
// Calculate compound interest based on daily rate (APR/365)
const dailyRate = apr / 365

// Bad - Obvious explanation
// Increment counter by 1
counter++
```

## Testing

### Test Structure

```javascript
// Good test structure
describe('UserService', () => {
  beforeEach(() => {
    // Setup before each test
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      const user = await userService.getUser('123')
      expect(user.id).toBe('123')
    })

    it('should return null when not found', async () => {
      const user = await userService.getUser('999')
      expect(user).toBeNull()
    })
  })
})
```

### Test Naming

- Use descriptive test names that explain behavior
- Follow "should [expected behavior]" pattern
- Group related tests in describe blocks

### Coverage Requirements

- Aim for >80% code coverage
- Critical paths should have >95% coverage
- All public APIs must be tested

## Git Workflow

### Branch Naming

- `feature/description` for new features
- `bugfix/description` for bug fixes
- `hotfix/description` for urgent fixes
- `refactor/description` for code improvements

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat(economy): add daily reward system

fix(auth): resolve token expiration issue

docs(readme): update installation instructions

refactor(database): implement connection pooling
```

## Security

### Input Validation

- Always validate user input
- Use whitelist approach for allowed values
- Sanitize data before database operations

```javascript
// Good - Validate input
if (!userId || typeof userId !== 'string') {
  throw new ValidationError('userId', userId, 'must be non-empty string')
}

// Bad - No validation
const user = await getUser(userId)
```

### Error Handling

- Never expose sensitive information in error messages
- Use specific error types
- Log errors with context but not sensitive data

```javascript
// Good
try {
  await processPayment(userId, amount);
} catch (error) {
  logger.error('Payment processing failed', {
    userId: userId,
    amount: amount,
    error: error.message,
    correlationId
  });
  throw new PaymentError('Payment processing failed');
}

// Bad - Exposes sensitive data
catch (error) {
  throw new Error(`Failed for ${userId} with card ${creditCard}`);
}
```

### Authentication & Authorization

- Always check permissions before actions
- Use principle of least privilege
- Log all permission changes

## Performance

### Database Operations

- Use transactions for related operations
- Implement proper indexing
- Use connection pooling
- Cache frequently accessed data

```javascript
// Good - Use transaction and caching
const result = await db.transaction(async () => {
  await updateUserBalance(userId, -amount)
  await updateUserBalance(recipientId, amount)
  await logTransaction(userId, recipientId, amount)
})

await cache.invalidate(`user:${userId}`)

// Bad - No transaction or caching
await updateUserBalance(userId, -amount)
await updateUserBalance(recipientId, amount)
await logTransaction(userId, recipientId, amount)
```

### Async Operations

- Use async/await consistently
- Handle promise rejections properly
- Implement timeouts for external calls

```javascript
// Good
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      signal: AbortSignal.timeout(5000),
    })
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new TimeoutError('User data fetch timeout')
    }
    throw error
  }
}

// Bad - No error handling or timeout
async function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`)
  return await response.json()
}
```

## Code Review Guidelines

### What to Look For

1. **Functionality**: Does the code work as intended?
2. **Performance**: Are there performance bottlenecks?
3. **Security**: Are there security vulnerabilities?
4. **Maintainability**: Is the code easy to understand and modify?
5. **Testing**: Are there adequate tests?
6. **Documentation**: Is the code properly documented?

### Review Process

1. Create pull request with clear description
2. Request review from at least one team member
3. Address all feedback before merge
4. Ensure all tests pass
5. Update documentation if needed

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run tests: `npm test`
7. Run linting: `npm run lint`
8. Commit changes: `git commit -m "feat: add new feature"`
9. Push to your fork: `git push origin feature/your-feature`
10. Create pull request

## Tools and Configuration

### Required Tools

- **Node.js**: Latest LTS version
- **npm**: Latest version
- **Git**: Latest version

### Development Tools

- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Jest**: Testing framework
- **TypeScript**: Type checking (optional but recommended)

### IDE Configuration

Recommended extensions for VS Code:

- ESLint extension
- Prettier extension
- TypeScript extension
- GitLens
- Thunder Client (for API testing)

## Questions?

If you have questions about these guidelines or need clarification on any
aspect, please:

1. Check existing code for similar patterns
2. Ask in team discussions
3. Create an issue for clarification

Remember: These guidelines are meant to improve code quality and
maintainability. Use your judgment and suggest improvements to these standards
as needed.
