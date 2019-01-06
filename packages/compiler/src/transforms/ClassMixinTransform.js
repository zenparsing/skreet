export function registerTransform({ define, context, templates, AST }) {
  define(rootPath => rootPath.visit(new class ClassMixinVisitor {

    constructor() {
      this.helperName = context.get('classMixinHelper') || '';
    }

    insertHelper() {
      if (this.helperName) {
        return this.helperName;
      }

      this.helperName = rootPath.uniqueIdentifier('_classMixin', {
        kind: 'const',
        initializer: templates.expression`
          (target, ...sources) => {
            function copy(from, to, skip) {
              for (let key of Reflect.ownKeys(from)) {
                if (key === skip || Reflect.getOwnPropertyDescriptor(to, key)) {
                  continue;
                }
                Reflect.defineProperty(
                  to,
                  key,
                  Reflect.getOwnPropertyDescriptor(from, key)
                );
              }
            }

            for (let source of sources) {
              copy(source, target, 'prototype');
              if (source.prototype) {
                copy(source.prototype, target.prototype, 'constructor');
              }
            }

            return target;
          }
        `,
      });

      context.set('classMixinHelper', this.helperName);

      return this.helperName;
    }

    ClassDeclaration(path) {
      path.visitChildren(this);

      let { node } = path;
      let { mixins } = node;

      if (!mixins) {
        return;
      }

      // Add an identifier for default class exports
      if (!node.identifier) {
        node.identifier = new AST.Identifier(path.uniqueIdentifier('_class'));
      }

      let name = new AST.Identifier(node.identifier.value);
      let helper = this.insertHelper();

      path.insertNodesAfter(new AST.ExpressionStatement(
        new AST.CallExpression(
          new AST.Identifier(helper),
          [name, ...mixins]
        )
      ));
    }

    ClassExpression(path) {
      path.visitChildren(this);

      let { mixins } = path.node;
      if (!mixins) {
        return;
      }

      let helper = this.insertHelper();

      path.replaceNode(new AST.CallExpression(
        new AST.Identifier(helper),
        [path.node, ...mixins]
      ));
    }

  }));
}
