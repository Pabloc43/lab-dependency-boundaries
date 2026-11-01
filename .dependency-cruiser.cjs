// The scan covers src; this prefix owns only the order feature's internal layers.
const root = process.env.DEPENDENCY_BOUNDARY_ROOT || 'src/features/orders';
module.exports = {
  forbidden: [
    {
      name: 'no-domain-outward',
      comment:
        'Keep domain rules independent of application, infrastructure and UI dependencies.',
      severity: 'error',
      from: { path: `^${root}/domain/` },
      to: { pathNot: `^${root}/domain/` },
    },
    {
      name: 'no-application-outward',
      comment:
        'Application code may import only application and domain modules. Inject adapters instead of importing their implementations.',
      severity: 'error',
      from: { path: `^${root}/application/` },
      to: { pathNot: `^${root}/(domain|application)/` },
    },
    {
      name: 'no-ui-infrastructure',
      comment:
        'UI code uses application services rather than importing infrastructure adapters directly.',
      severity: 'error',
      from: { path: `^${root}/ui/` },
      to: { path: `^${root}/infrastructure/` },
    },
    {
      name: 'no-circular',
      comment: 'Keep the import graph acyclic, including type-only dependencies.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-unresolved',
      comment:
        'Every import must resolve so missing modules cannot hide architectural dependencies.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    exclude: { path: '[.]test[.](ts|tsx|js|mjs)$' },
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
  },
};
