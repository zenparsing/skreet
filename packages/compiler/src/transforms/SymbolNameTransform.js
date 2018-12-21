export function register({ define, templates, AST }) {
  define(rootPath => rootPath.visit(new class SymbolNameVisitor {

    constructor() {
      this.names = new Map();
    }

    replaceRef(path, name) {
      path.replaceNode(new AST.ComputedPropertyName(
        new AST.Identifier(name)
      ));
    }

    replacePrimary(path, name) {
      path.replaceNode(new AST.MemberExpression(
        new AST.ThisExpression(),
        new AST.ComputedPropertyName(
          new AST.Identifier(name)
        )
      ));
    }

    getIdentifierName(value) {
      if (this.names.has(value)) {
        return this.names.get(value);
      }

      let name = rootPath.uniqueIdentifier('$' + value.slice(1), {
        kind: 'const',
        initializer: new AST.CallExpression(
          new AST.Identifier('Symbol'),
          [new AST.StringLiteral(value)]
        ),
      });

      this.names.set(value, name);
      return name;
    }

    SymbolName(path) {
      let name = this.getIdentifierName(path.node.value);
      switch (path.parent.node.type) {
        case 'PropertyDefinition':
        case 'MethodDefinition':
        case 'ClassField':
          this.replaceRef(path, name);
          break;
        case 'MemberExpression':
          if (path.parent.node.object === path.node) {
            this.replacePrimary(path, name);
          } else {
            this.replaceRef(path, name);
          }
          break;
        default:
          this.replacePrimary(path, name);
          break;
      }
    }

  }));
}
