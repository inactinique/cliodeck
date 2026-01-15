# Logging System - ClioDesk

## Overview

ClioDesk uses a centralized logging system that automatically filters logs based on environment (development vs production).

## Default Behavior

| Environment | console.log | console.info | console.warn | console.error |
|-------------|-------------|--------------|--------------|---------------|
| **Development** | Shown | Shown | Shown | Shown |
| **Production** | Filtered | Filtered | Shown | Shown |

In production, only `console.warn` and `console.error` are displayed to reduce console noise.

## Enabling Debug Logs in Production

### Method 1: CLIODESK_DEBUG Environment Variable

```bash
# macOS / Linux
CLIODESK_DEBUG=1 /path/to/ClioDesk.app/Contents/MacOS/ClioDesk

# Windows
set CLIODESK_DEBUG=1
"C:\Program Files\ClioDesk\ClioDesk.exe"
```

### Method 2: CLIODESK_LOG_LEVEL Environment Variable

```bash
# Available levels: debug, info, warn, error
CLIODESK_LOG_LEVEL=debug /path/to/ClioDesk
```

### Method 3: Standard DEBUG Variable

```bash
DEBUG=1 /path/to/ClioDesk
```

## DevTools in Production

By default, Electron DevTools are **disabled** in production.

To enable them, use the same environment variables:

```bash
# macOS / Linux
CLIODESK_DEBUG=1 /path/to/ClioDesk.app/Contents/MacOS/ClioDesk

# Windows
set CLIODESK_DEBUG=1
"C:\Program Files\ClioDesk\ClioDesk.exe"
```

This enables both:
- Debug logs (`console.log`, `console.info`)
- Electron DevTools

## Centralized Logger (for Developers)

For new development, use the centralized logger instead of `console.log`:

```typescript
import { logger } from '@shared/logger';

// With explicit context
logger.debug('MyService', 'Debug message', { data });
logger.info('MyService', 'Important information');
logger.warn('MyService', 'Warning');
logger.error('MyService', 'Error', error);

// Or create a contextual logger
const log = logger.createContextLogger('MyService');
log.debug('Debug message');
log.info('Information');
log.warn('Warning');
log.error('Error', error);
```

### Centralized Logger Benefits

- Consistent format with emojis and context: ` [MyService] Message`
- Automatic respect of configured log levels
- Typed methods for TypeScript

## Architecture

```
src/shared/
├── logger.ts          # Centralized logger with levels
└── console-filter.ts  # Automatic console.* filter in production
```

The console filter is automatically imported at application startup:
- Main process: `src/main/index.ts`
- Renderer process: `src/renderer/src/main.tsx`

## Environment Detection

Environment is automatically detected via:

1. `process.env.NODE_ENV === 'production'`
2. `process.env.ELECTRON_IS_PACKAGED === 'true'`

## Restoring Logs (for Testing)

```typescript
import { restoreConsole, rawConsole } from '@shared/console-filter';

// Restore all console.*
restoreConsole();

// Or use rawConsole to bypass filter
rawConsole.log('This message will always be displayed');
```

## Checking Filter Status

```typescript
import { getFilterStatus } from '@shared/console-filter';

const status = getFilterStatus();
console.log(status);
// { isProduction: true, isDebugEnabled: false, isFiltering: true }
```
