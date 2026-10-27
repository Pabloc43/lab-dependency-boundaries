const root = process.env.DEPENDENCY_ROOT || 'src';
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
      to: { path: `^${root}/(ui|infrastructure)/` },
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
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
  },
};
