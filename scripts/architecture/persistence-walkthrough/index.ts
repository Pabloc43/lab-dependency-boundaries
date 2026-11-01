import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

export interface SourceExcerpt {
  id: string;
  path: string;
  start: number;
  end: number;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  source: string;
}

// This list describes the existing order flow, not a general documentation engine.
export function persistenceWalkthrough(project = process.cwd()): SourceExcerpt[] {
  const files = new Map<string, ts.SourceFile>();

  function file(path: string) {
    let parsed = files.get(path);

    if (!parsed) {
      parsed = ts.createSourceFile(
        path,
        readFileSync(join(project, path), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      files.set(path, parsed);
    }

    return parsed;
  }

  function unique(path: string, label: string, matches: (node: ts.Node) => boolean) {
    const found: ts.Node[] = [];

    function visit(node: ts.Node) {
      if (matches(node)) {
        found.push(node);
      }

      ts.forEachChild(node, visit);
    }

    visit(file(path));

    if (found.length !== 1) {
      throw new Error(
        `Walkthrough ${label}: expected one source match in ${path}, got ${found.length}`,
      );
    }

    return found[0];
  }

  function excerpt(
    id: string,
    path: string,
    matches: (node: ts.Node) => boolean,
    through?: (node: ts.Node) => boolean,
  ): SourceExcerpt {
    const parsed = file(path);
    const first = unique(path, id, matches);
    const last = through ? unique(path, `${id} end`, through) : first;
    const start = first.getStart(parsed);
    const end = last.getEnd();
    if (end <= start) {
      throw new Error(`Walkthrough ${id}: invalid source range`);
    }

    const from = parsed.getLineAndCharacterOfPosition(start);
    const to = parsed.getLineAndCharacterOfPosition(end - 1);

    return {
      id,
      path,
      start,
      end,
      startLine: from.line + 1,
      endLine: to.line + 1,
      startColumn: from.character + 1,
      endColumn: to.character + 1,
      source: parsed.text.slice(start, end),
    };
  }

  const variable = (name: string) => (node: ts.Node) =>
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(
      (declaration) =>
        ts.isIdentifier(declaration.name) && declaration.name.text === name,
    );
  const call = (node: ts.Node, name: string): node is ts.CallExpression =>
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === name;

  function isSuccessfulDispatch(node: ts.Statement): boolean {
    if (!ts.isExpressionStatement(node) || !call(node.expression, 'dispatch')) {
      return false;
    }

    const event = node.expression.arguments[0];
    if (!event || !ts.isObjectLiteralExpression(event)) {
      return false;
    }

    return event.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === 'type' &&
        ts.isStringLiteral(property.initializer) &&
        property.initializer.text === 'succeeded',
    );
  }

  const method = (node: ts.Node, name: string) =>
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === name;
  const composition = 'src/app/composition.ts';
  const demo = 'src/features/orders/ui/OrderDemo/index.tsx';

  return [
    excerpt(
      'bootstrap',
      'src/main.tsx',
      variable('services'),
      (node) => ts.isExpressionStatement(node) && method(node.expression, 'render'),
    ),
    excerpt(
      'app-props',
      'src/app/App/index.tsx',
      (node) =>
        ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'OrderDemo',
    ),
    excerpt('repository', composition, variable('repository')),
    excerpt('factory', composition, variable('submitOrder')),
    excerpt(
      'service',
      composition,
      (node) => ts.isPropertyAssignment(node) && node.name.getText() === 'submitOrder',
    ),
    excerpt('hook', demo, (node) => call(node, 'useOrderDemo')),
    excerpt(
      'form',
      demo,
      (node) => ts.isJsxOpeningElement(node) && node.tagName.getText() === 'form',
    ),
    excerpt(
      'handler',
      demo,
      (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'handleSubmit',
    ),
    excerpt(
      'submit',
      'src/features/orders/ui/OrderDemo/useOrderDemo.ts',
      variable('order'),
      (node) =>
        ts.isIfStatement(node) &&
        ts.isBlock(node.thenStatement) &&
        node.thenStatement.statements.some(isSuccessfulDispatch),
    ),
    excerpt(
      'use-case',
      'src/features/orders/application/create-order.ts',
      (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'createOrder',
    ),
    excerpt(
      'storage',
      'src/features/orders/infrastructure/order-repositories/local-storage/index.ts',
      (node) => ts.isExpressionStatement(node) && method(node.expression, 'setItem'),
    ),
  ];
}
