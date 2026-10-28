gym/
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── app.ts
│   ├── index.ts
│   │
│   ├── config/
│   │   ├── Environment configuration
│   │   ├── Socket.IO configuration
│   │   ├── Rate limiting
│   │   ├── Upload configuration
│   │   └── Logger
│   │
│   ├── controllers/
│   │   └── Request handlers and business logic
│   │
│   ├── routes/
│   │   └── API routes
│   │
│   ├── middlewares/
│   │   ├── Authentication
│   │   ├── Role-based access
│   │   ├── Validation
│   │   └── Error handling
│   │
│   ├── validations/
│   │   └── Zod schemas
│   │
│   ├── utils/
│   │   ├── Queue
│   │   ├── Sanitization
│   │   ├── Membership
│   │   └── API responses
│   │
│   └── lib/
│       └── prisma.ts
│
└── tests/
    └── Vitest tests
