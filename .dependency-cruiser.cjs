// The scan covers src; this prefix owns only the order feature's internal layers.
const root = process.env.DEPENDENCY_BOUNDARY_ROOT || 'src/features/orders';
module.exports = {
  forbidden: [
    {
      name: 'no-domain-outward',
      severity: 'error',
      from: { path: `^${root}/domain/` },
      to: { pathNot: `^${root}/domain/` },
    },
    {
      name: 'no-application-outward',
      severity: 'error',
      from: { path: `^${root}/application/` },
      to: { pathNot: `^${root}/(domain|application)/` },
    },
    {
      name: 'no-ui-infrastructure',
      severity: 'error',
      from: { path: `^${root}/ui/` },
      to: { path: `^${root}/infrastructure/` },
    },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-unresolved', severity: 'error', from: {}, to: { couldNotResolve: true } },
  ],
  options: {
    tsPreCompilationDeps: true,
    exclude: { path: '[.]test[.](ts|tsx|js|mjs)$' },
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
  },
};
