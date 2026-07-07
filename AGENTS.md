<!-- BEGIN:nextjs-agent-rules -->

# Estructura de directorions

La estructura de directorios tiene seguir FDD (Feature Driven Design), para mantener el codigo separado por features

```

src/
└── features/
    └── auth/
        ├── components/     → UI components specific to this feature
        ├── hooks/          → React hooks / client logic
        ├── lib/            → Pure utilities and helpers
        ├── services/       → Business logic or external integrations
        ├── types/          → TypeScript types and interfaces
        └── index.ts        → Public exports for the feature
shared/
├─ components/
└─ utils/            # shared utilities, helpers, and services

```

# ORM

El ORM que usa es prisma

# Librerias de UI

- heroUI
- Tailwind
- GravityIcons - @gravity-ui/icons
