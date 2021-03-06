import { AST } from './Parser.js';

export class Path {

  constructor(node, parent = null, location = null) {
    this.@node = node;
    this.@location = location;
    this.@parent = parent;
    this.@scopeInfo = parent ? parent.@scopeInfo : null;
    this.@annotations = parent ? parent.@annotations : null;
    this.@changeList = [];
  }

  get node() {
    return this.@node;
  }

  get parent() {
    return this.@parent;
  }

  get parentNode() {
    return this.@parent ? this.@parent.@node : null;
  }

  getAnnotations() {
    return this.@annotations && this.@annotations.get(this.@node) || [];
  }

  forEachChild(fn) {
    if (!this.@node) {
      return;
    }

    let paths = [];

    AST.forEachChild(this.@node, (child, key, index) => {
      let path = new Path(child, this, { key, index });
      paths.push(path);
      fn(path);
    });

    for (let path of paths) {
      path.applyChanges();
    }
  }

  applyChanges() {
    let list = this.@changeList;
    this.@changeList = [];

    for (let record of list) {
      if (!this.@node) {
        break;
      }
      record.apply();
    }
  }

  removeNode() {
    this.@changeList.push(new ChangeRecord(this, 'replaceNode', [null]));
  }

  replaceNode(newNode) {
    this.@changeList.push(new ChangeRecord(this, 'replaceNode', [newNode]));
  }

  insertNodesBefore(...nodes) {
    this.@changeList.push(new ChangeRecord(this, 'insertNodesBefore', nodes));
  }

  insertNodesAfter(...nodes) {
    this.@changeList.push(new ChangeRecord(this, 'insertNodesAfter', nodes));
  }

  visitChildren(visitor) {
    this.forEachChild(childPath => childPath.visit(visitor));
  }

  visit(visitor) {
    // TODO: applyChanges will not be run if called from top-level. Is this a problem?
    if (!this.@node) {
      return;
    }

    let method = visitor[this.@node.type];
    if (typeof method === 'function') {
      method.call(visitor, this);
    }

    if (!method) {
      this.visitChildren(visitor);
    }

    let { after } = visitor;
    if (typeof after === 'function') {
      after.call(visitor, this);
    }
  }

  uniqueIdentifier(baseName, options = {}) {
    let scopeInfo = this.@scopeInfo;
    let ident = null;

    for (let i = 0; true; ++i) {
      let value = baseName;
      if (i > 0) {
        value += '_' + i;
      }
      if (!scopeInfo.names.has(value)) {
        ident = value;
        break;
      }
    }

    scopeInfo.names.add(ident);

    if (options.kind) {
      // Declaration insertions are inserted in reverse order
      this.@changeList.unshift(
        new ChangeRecord(this, 'insertDeclaration', [ident, options])
      );
    }

    return ident;
  }

  static fromParseResult(result) {
    let path = new Path(result.ast);
    path.@scopeInfo = getScopeInfo(result.scopeTree);
    path.@annotations = result.annotations;
    return path;
  }

  @getLocation(fn) {
    if (!this.@parent) {
      throw new Error('Node does not have a parent');
    }

    let { key, index } = this.@location;
    let node = this.@node;
    let parent = this.@parent.@node;

    let valid = typeof index === 'number' ?
      parent[key][index] === node :
      parent[key] === node;

    if (!valid) {
      let stop = {};
      try {
        AST.forEachChild(parent, (child, k, i) => {
          if (child === node) {
            valid = true;
            this.@location = { key: (key = k), index: (index = i) };
            throw stop;
          }
        });
      } catch (e) {
        if (e !== stop) {
          throw e;
        }
      }
    }

    if (!valid) {
      throw new Error('Unable to determine node location');
    }

    fn(parent, key, index);
  }

}

class ChangeRecord {

  constructor(path, name, args) {
    this.path = path;
    this.name = name;
    this.args = args;
  }

  apply() {
    switch (this.name) {
      case 'replaceNode': return this.replaceNode(this.args[0]);
      case 'insertNodesAfter': return this.insertNodesAfter(this.args);
      case 'insertNodesBefore': return this.insertNodesBefore(this.args);
      case 'insertDeclaration': return this.insertDeclaration(...this.args);
      default: throw new Error('Invalid change record type');
    }
  }

  replaceNode(newNode) {
    if (this.path.@parent) {
      this.path.@getLocation((parent, key, index) => {
        if (typeof index !== 'number') {
          parent[key] = newNode;
        } else if (newNode) {
          parent[key].splice(index, 1, newNode);
        } else {
          parent[key].splice(index, 1);
        }
      });
    }

    this.path.@node = newNode;
  }

  insertNodesAfter(nodes) {
    this.path.@getLocation((parent, key, index) => {
      if (typeof index !== 'number') {
        throw new Error('Node is not contained within a node list');
      }
      parent[key].splice(index + 1, 0, ...nodes);
    });
  }

  insertNodesBefore(nodes) {
    this.path.@getLocation((parent, key, index) => {
      if (typeof index !== 'number') {
        throw new Error('Node is not contained within a node list');
      }
      parent[key].splice(index, 0, ...nodes);
    });
  }

  insertDeclaration(ident, options) {
    let { statements } = getBlock(this.path).node;
    let declaration = new AST.VariableDeclaration(options.kind, [
      new AST.VariableDeclarator(
        new AST.Identifier(ident),
        options.initializer || null
      )
    ]);
    statements.unshift(declaration);
  }

}

function getScopeInfo(scopeTree) {
  let names = new Set();

  function visit(scope) {
    scope.names.forEach((value, key) => names.add(key));
    scope.free.forEach(ident => names.add(ident.value));
    scope.children.forEach(visit);
  }

  visit(scopeTree);

  return { names };
}

function getBlock(path) {
  while (path) {
    switch (path.node.type) {
      case 'Script':
      case 'Module':
      case 'Block':
      case 'FunctionBody':
        return path;
    }
    path = path.parent;
  }
  return null;
}
