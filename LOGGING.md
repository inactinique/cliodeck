# Système de Logging - mdFocus

## Vue d'ensemble

mdFocus utilise un système de logging centralisé qui filtre automatiquement les logs selon l'environnement (développement vs production).

## Comportement par défaut

| Environnement | console.log | console.info | console.warn | console.error |
|---------------|-------------|--------------|--------------|---------------|
| **Développement** | ✅ Affiché | ✅ Affiché | ✅ Affiché | ✅ Affiché |
| **Production** | ❌ Filtré | ❌ Filtré | ✅ Affiché | ✅ Affiché |

En production, seuls les `console.warn` et `console.error` sont affichés pour réduire le bruit dans la console.

## Activer les logs de debug en production

### Méthode 1 : Variable d'environnement MDFOCUS_DEBUG

```bash
# macOS / Linux
MDFOCUS_DEBUG=1 /path/to/mdFocus.app/Contents/MacOS/mdFocus

# Windows
set MDFOCUS_DEBUG=1
"C:\Program Files\mdFocus\mdFocus.exe"
```

### Méthode 2 : Variable d'environnement MDFOCUS_LOG_LEVEL

```bash
# Niveaux disponibles : debug, info, warn, error
MDFOCUS_LOG_LEVEL=debug /path/to/mdFocus
```

### Méthode 3 : Variable DEBUG standard

```bash
DEBUG=1 /path/to/mdFocus
```

## DevTools en production

Par défaut, les DevTools d'Electron sont **désactivés** en production.

Pour les activer, utilisez les mêmes variables d'environnement :

```bash
# macOS / Linux
MDFOCUS_DEBUG=1 /path/to/mdFocus.app/Contents/MacOS/mdFocus

# Windows
set MDFOCUS_DEBUG=1
"C:\Program Files\mdFocus\mdFocus.exe"
```

Cela active à la fois :
- Les logs de debug (`console.log`, `console.info`)
- Les DevTools d'Electron

## Logger centralisé (pour les développeurs)

Pour les nouveaux développements, utilisez le logger centralisé au lieu de `console.log` :

```typescript
import { logger } from '@shared/logger';

// Avec contexte explicite
logger.debug('MonService', 'Message de debug', { data });
logger.info('MonService', 'Information importante');
logger.warn('MonService', 'Attention');
logger.error('MonService', 'Erreur', error);

// Ou créer un logger contextuel
const log = logger.createContextLogger('MonService');
log.debug('Message de debug');
log.info('Information');
log.warn('Attention');
log.error('Erreur', error);
```

### Avantages du logger centralisé

- Format cohérent avec emojis et contexte : `🔍 [MonService] Message`
- Respect automatique des niveaux de log configurés
- Méthodes typées pour TypeScript

## Architecture

```
src/shared/
├── logger.ts          # Logger centralisé avec niveaux
└── console-filter.ts  # Filtre automatique des console.* en production
```

Le filtre console est importé automatiquement au démarrage de l'application :
- Main process : `src/main/index.ts`
- Renderer process : `src/renderer/src/main.tsx`

## Détection de l'environnement

L'environnement est détecté automatiquement via :

1. `process.env.NODE_ENV === 'production'`
2. `process.env.ELECTRON_IS_PACKAGED === 'true'`

## Restaurer les logs (pour les tests)

```typescript
import { restoreConsole, rawConsole } from '@shared/console-filter';

// Restaurer tous les console.*
restoreConsole();

// Ou utiliser rawConsole pour bypasser le filtre
rawConsole.log('Ce message sera toujours affiché');
```

## Vérifier l'état du filtre

```typescript
import { getFilterStatus } from '@shared/console-filter';

const status = getFilterStatus();
console.log(status);
// { isProduction: true, isDebugEnabled: false, isFiltering: true }
```
