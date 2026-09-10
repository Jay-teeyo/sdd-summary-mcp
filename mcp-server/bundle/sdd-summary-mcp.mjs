#!/usr/bin/env node
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ajv/dist/compile/codegen/code.js
var require_code = __commonJS({
  "node_modules/ajv/dist/compile/codegen/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
    var _CodeOrName = class {
    };
    exports._CodeOrName = _CodeOrName;
    exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
    var Name = class extends _CodeOrName {
      constructor(s) {
        super();
        if (!exports.IDENTIFIER.test(s))
          throw new Error("CodeGen: name must be a valid identifier");
        this.str = s;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return false;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    exports.Name = Name;
    var _Code = class extends _CodeOrName {
      constructor(code) {
        super();
        this._items = typeof code === "string" ? [code] : code;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1)
          return false;
        const item = this._items[0];
        return item === "" || item === '""';
      }
      get str() {
        var _a;
        return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
      }
      get names() {
        var _a;
        return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c) => {
          if (c instanceof Name)
            names[c.str] = (names[c.str] || 0) + 1;
          return names;
        }, {});
      }
    };
    exports._Code = _Code;
    exports.nil = new _Code("");
    function _(strs, ...args) {
      const code = [strs[0]];
      let i = 0;
      while (i < args.length) {
        addCodeArg(code, args[i]);
        code.push(strs[++i]);
      }
      return new _Code(code);
    }
    exports._ = _;
    var plus = new _Code("+");
    function str2(strs, ...args) {
      const expr = [safeStringify(strs[0])];
      let i = 0;
      while (i < args.length) {
        expr.push(plus);
        addCodeArg(expr, args[i]);
        expr.push(plus, safeStringify(strs[++i]));
      }
      optimize(expr);
      return new _Code(expr);
    }
    exports.str = str2;
    function addCodeArg(code, arg) {
      if (arg instanceof _Code)
        code.push(...arg._items);
      else if (arg instanceof Name)
        code.push(arg);
      else
        code.push(interpolate(arg));
    }
    exports.addCodeArg = addCodeArg;
    function optimize(expr) {
      let i = 1;
      while (i < expr.length - 1) {
        if (expr[i] === plus) {
          const res = mergeExprItems(expr[i - 1], expr[i + 1]);
          if (res !== void 0) {
            expr.splice(i - 1, 3, res);
            continue;
          }
          expr[i++] = "+";
        }
        i++;
      }
    }
    function mergeExprItems(a, b) {
      if (b === '""')
        return a;
      if (a === '""')
        return b;
      if (typeof a == "string") {
        if (b instanceof Name || a[a.length - 1] !== '"')
          return;
        if (typeof b != "string")
          return `${a.slice(0, -1)}${b}"`;
        if (b[0] === '"')
          return a.slice(0, -1) + b.slice(1);
        return;
      }
      if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
        return `"${a}${b.slice(1)}`;
      return;
    }
    function strConcat(c1, c2) {
      return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str2`${c1}${c2}`;
    }
    exports.strConcat = strConcat;
    function interpolate(x) {
      return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
    }
    function stringify(x) {
      return new _Code(safeStringify(x));
    }
    exports.stringify = stringify;
    function safeStringify(x) {
      return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    exports.safeStringify = safeStringify;
    function getProperty(key) {
      return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
    }
    exports.getProperty = getProperty;
    function getEsmExportName(key) {
      if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
        return new _Code(`${key}`);
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
    }
    exports.getEsmExportName = getEsmExportName;
    function regexpCode(rx) {
      return new _Code(rx.toString());
    }
    exports.regexpCode = regexpCode;
  }
});

// node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = __commonJS({
  "node_modules/ajv/dist/compile/codegen/scope.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
    var code_1 = require_code();
    var ValueError = class extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`);
        this.value = name.value;
      }
    };
    var UsedValueState;
    (function(UsedValueState2) {
      UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
      UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
    })(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
    exports.varKinds = {
      const: new code_1.Name("const"),
      let: new code_1.Name("let"),
      var: new code_1.Name("var")
    };
    var Scope = class {
      constructor({ prefixes, parent } = {}) {
        this._names = {};
        this._prefixes = prefixes;
        this._parent = parent;
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
      }
      name(prefix) {
        return new code_1.Name(this._newName(prefix));
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix);
        return `${prefix}${ng.index++}`;
      }
      _nameGroup(prefix) {
        var _a, _b;
        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
        }
        return this._names[prefix] = { prefix, index: 0 };
      }
    };
    exports.Scope = Scope;
    var ValueScopeName = class extends code_1.Name {
      constructor(prefix, nameStr) {
        super(nameStr);
        this.prefix = prefix;
      }
      setValue(value, { property, itemIndex }) {
        this.value = value;
        this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
      }
    };
    exports.ValueScopeName = ValueScopeName;
    var line = (0, code_1._)`\n`;
    var ValueScope = class extends Scope {
      constructor(opts) {
        super(opts);
        this._values = {};
        this._scope = opts.scope;
        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
      }
      get() {
        return this._scope;
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix));
      }
      value(nameOrPrefix, value) {
        var _a;
        if (value.ref === void 0)
          throw new Error("CodeGen: ref must be passed in value");
        const name = this.toName(nameOrPrefix);
        const { prefix } = name;
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
        let vs = this._values[prefix];
        if (vs) {
          const _name = vs.get(valueKey);
          if (_name)
            return _name;
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map();
        }
        vs.set(valueKey, name);
        const s = this._scope[prefix] || (this._scope[prefix] = []);
        const itemIndex = s.length;
        s[itemIndex] = value.ref;
        name.setValue(value, { property: prefix, itemIndex });
        return name;
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix];
        if (!vs)
          return;
        return vs.get(keyOrRef);
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return (0, code_1._)`${scopeName}${name.scopePath}`;
        });
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(values, (name) => {
          if (name.value === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        }, usedValues, getCode);
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code = code_1.nil;
        for (const prefix in values) {
          const vs = values[prefix];
          if (!vs)
            continue;
          const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
          vs.forEach((name) => {
            if (nameSet.has(name))
              return;
            nameSet.set(name, UsedValueState.Started);
            let c = valueCode(name);
            if (c) {
              const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
              code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
            } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
              code = (0, code_1._)`${code}${c}${this.opts._n}`;
            } else {
              throw new ValueError(name);
            }
            nameSet.set(name, UsedValueState.Completed);
          });
        }
        return code;
      }
    };
    exports.ValueScope = ValueScope;
  }
});

// node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = __commonJS({
  "node_modules/ajv/dist/compile/codegen/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
    var code_1 = require_code();
    var scope_1 = require_scope();
    var code_2 = require_code();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return code_2._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return code_2.str;
    } });
    Object.defineProperty(exports, "strConcat", { enumerable: true, get: function() {
      return code_2.strConcat;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return code_2.nil;
    } });
    Object.defineProperty(exports, "getProperty", { enumerable: true, get: function() {
      return code_2.getProperty;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return code_2.stringify;
    } });
    Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function() {
      return code_2.regexpCode;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return code_2.Name;
    } });
    var scope_2 = require_scope();
    Object.defineProperty(exports, "Scope", { enumerable: true, get: function() {
      return scope_2.Scope;
    } });
    Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function() {
      return scope_2.ValueScope;
    } });
    Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function() {
      return scope_2.ValueScopeName;
    } });
    Object.defineProperty(exports, "varKinds", { enumerable: true, get: function() {
      return scope_2.varKinds;
    } });
    exports.operators = {
      GT: new code_1._Code(">"),
      GTE: new code_1._Code(">="),
      LT: new code_1._Code("<"),
      LTE: new code_1._Code("<="),
      EQ: new code_1._Code("==="),
      NEQ: new code_1._Code("!=="),
      NOT: new code_1._Code("!"),
      OR: new code_1._Code("||"),
      AND: new code_1._Code("&&"),
      ADD: new code_1._Code("+")
    };
    var Node = class {
      optimizeNodes() {
        return this;
      }
      optimizeNames(_names, _constants) {
        return this;
      }
    };
    var Def = class extends Node {
      constructor(varKind, name, rhs) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.rhs = rhs;
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
        const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
        return `${varKind} ${this.name}${rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (!names[this.name.str])
          return;
        if (this.rhs)
          this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
      }
    };
    var Assign = class extends Node {
      constructor(lhs, rhs, sideEffects) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
        this.sideEffects = sideEffects;
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
          return;
        this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
        return addExprNames(names, this.rhs);
      }
    };
    var AssignOp = class extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects);
        this.op = op;
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
      }
    };
    var Label = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        return `${this.label}:` + _n;
      }
    };
    var Break = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        const label = this.label ? ` ${this.label}` : "";
        return `break${label};` + _n;
      }
    };
    var Throw = class extends Node {
      constructor(error2) {
        super();
        this.error = error2;
      }
      render({ _n }) {
        return `throw ${this.error};` + _n;
      }
      get names() {
        return this.error.names;
      }
    };
    var AnyCode = class extends Node {
      constructor(code) {
        super();
        this.code = code;
      }
      render({ _n }) {
        return `${this.code};` + _n;
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0;
      }
      optimizeNames(names, constants) {
        this.code = optimizeExpr(this.code, names, constants);
        return this;
      }
      get names() {
        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
      }
    };
    var ParentNode = class extends Node {
      constructor(nodes = []) {
        super();
        this.nodes = nodes;
      }
      render(opts) {
        return this.nodes.reduce((code, n) => code + n.render(opts), "");
      }
      optimizeNodes() {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i].optimizeNodes();
          if (Array.isArray(n))
            nodes.splice(i, 1, ...n);
          else if (n)
            nodes[i] = n;
          else
            nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      optimizeNames(names, constants) {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i];
          if (n.optimizeNames(names, constants))
            continue;
          subtractNames(names, n.names);
          nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      get names() {
        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
      }
    };
    var BlockNode = class extends ParentNode {
      render(opts) {
        return "{" + opts._n + super.render(opts) + "}" + opts._n;
      }
    };
    var Root = class extends ParentNode {
    };
    var Else = class extends BlockNode {
    };
    Else.kind = "else";
    var If = class _If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes);
        this.condition = condition;
      }
      render(opts) {
        let code = `if(${this.condition})` + super.render(opts);
        if (this.else)
          code += "else " + this.else.render(opts);
        return code;
      }
      optimizeNodes() {
        super.optimizeNodes();
        const cond = this.condition;
        if (cond === true)
          return this.nodes;
        let e = this.else;
        if (e) {
          const ns = e.optimizeNodes();
          e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
        }
        if (e) {
          if (cond === false)
            return e instanceof _If ? e : e.nodes;
          if (this.nodes.length)
            return this;
          return new _If(not(cond), e instanceof _If ? [e] : e.nodes);
        }
        if (cond === false || !this.nodes.length)
          return void 0;
        return this;
      }
      optimizeNames(names, constants) {
        var _a;
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        if (!(super.optimizeNames(names, constants) || this.else))
          return;
        this.condition = optimizeExpr(this.condition, names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        addExprNames(names, this.condition);
        if (this.else)
          addNames(names, this.else.names);
        return names;
      }
    };
    If.kind = "if";
    var For = class extends BlockNode {
    };
    For.kind = "for";
    var ForLoop = class extends For {
      constructor(iteration) {
        super();
        this.iteration = iteration;
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iteration = optimizeExpr(this.iteration, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iteration.names);
      }
    };
    var ForRange = class extends For {
      constructor(varKind, name, from, to) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.from = from;
        this.to = to;
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
        const { name, from, to } = this;
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
      }
      get names() {
        const names = addExprNames(super.names, this.from);
        return addExprNames(names, this.to);
      }
    };
    var ForIter = class extends For {
      constructor(loop, varKind, name, iterable) {
        super();
        this.loop = loop;
        this.varKind = varKind;
        this.name = name;
        this.iterable = iterable;
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iterable = optimizeExpr(this.iterable, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iterable.names);
      }
    };
    var Func = class extends BlockNode {
      constructor(name, args, async) {
        super();
        this.name = name;
        this.args = args;
        this.async = async;
      }
      render(opts) {
        const _async = this.async ? "async " : "";
        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
      }
    };
    Func.kind = "func";
    var Return = class extends ParentNode {
      render(opts) {
        return "return " + super.render(opts);
      }
    };
    Return.kind = "return";
    var Try = class extends BlockNode {
      render(opts) {
        let code = "try" + super.render(opts);
        if (this.catch)
          code += this.catch.render(opts);
        if (this.finally)
          code += this.finally.render(opts);
        return code;
      }
      optimizeNodes() {
        var _a, _b;
        super.optimizeNodes();
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
        return this;
      }
      optimizeNames(names, constants) {
        var _a, _b;
        super.optimizeNames(names, constants);
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        if (this.catch)
          addNames(names, this.catch.names);
        if (this.finally)
          addNames(names, this.finally.names);
        return names;
      }
    };
    var Catch = class extends BlockNode {
      constructor(error2) {
        super();
        this.error = error2;
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts);
      }
    };
    Catch.kind = "catch";
    var Finally = class extends BlockNode {
      render(opts) {
        return "finally" + super.render(opts);
      }
    };
    Finally.kind = "finally";
    var CodeGen = class {
      constructor(extScope, opts = {}) {
        this._values = {};
        this._blockStarts = [];
        this._constants = {};
        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
        this._extScope = extScope;
        this._scope = new scope_1.Scope({ parent: extScope });
        this._nodes = [new Root()];
      }
      toString() {
        return this._root.render(this.opts);
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix);
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix);
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value);
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
        vs.add(name);
        return name;
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef);
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(varKind, nameOrPrefix, rhs, constant) {
        const name = this._scope.toName(nameOrPrefix);
        if (rhs !== void 0 && constant)
          this._constants[name.str] = rhs;
        this._leafNode(new Def(varKind, name, rhs));
        return name;
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects));
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
      }
      // appends passed SafeExpr to code or executes Block
      code(c) {
        if (typeof c == "function")
          c();
        else if (c !== code_1.nil)
          this._leafNode(new AnyCode(c));
        return this;
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code = ["{"];
        for (const [key, value] of keyValues) {
          if (code.length > 1)
            code.push(",");
          code.push(key);
          if (key !== value || this.opts.es5) {
            code.push(":");
            (0, code_1.addCodeArg)(code, value);
          }
        }
        code.push("}");
        return new code_1._Code(code);
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition));
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf();
        } else if (thenBody) {
          this.code(thenBody).endIf();
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body');
        }
        return this;
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition));
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else());
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else);
      }
      _for(node, forBody) {
        this._blockNode(node);
        if (forBody)
          this.code(forBody).endFor();
        return this;
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody);
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix);
        if (this.opts.es5) {
          const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
          return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
            this.var(name, (0, code_1._)`${arr}[${i}]`);
            forBody(name);
          });
        }
        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
        }
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For);
      }
      // `label` statement
      label(label) {
        return this._leafNode(new Label(label));
      }
      // `break` statement
      break(label) {
        return this._leafNode(new Break(label));
      }
      // `return` statement
      return(value) {
        const node = new Return();
        this._blockNode(node);
        this.code(value);
        if (node.nodes.length !== 1)
          throw new Error('CodeGen: "return" should have one node');
        return this._endBlockNode(Return);
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode)
          throw new Error('CodeGen: "try" without "catch" and "finally"');
        const node = new Try();
        this._blockNode(node);
        this.code(tryBody);
        if (catchCode) {
          const error2 = this.name("e");
          this._currNode = node.catch = new Catch(error2);
          catchCode(error2);
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally();
          this.code(finallyCode);
        }
        return this._endBlockNode(Catch, Finally);
      }
      // `throw` statement
      throw(error2) {
        return this._leafNode(new Throw(error2));
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length);
        if (body)
          this.code(body).endBlock(nodeCount);
        return this;
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop();
        if (len === void 0)
          throw new Error("CodeGen: not in self-balancing block");
        const toClose = this._nodes.length - len;
        if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
        }
        this._nodes.length = len;
        return this;
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_1.nil, async, funcBody) {
        this._blockNode(new Func(name, args, async));
        if (funcBody)
          this.code(funcBody).endFunc();
        return this;
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func);
      }
      optimize(n = 1) {
        while (n-- > 0) {
          this._root.optimizeNodes();
          this._root.optimizeNames(this._root.names, this._constants);
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node);
        return this;
      }
      _blockNode(node) {
        this._currNode.nodes.push(node);
        this._nodes.push(node);
      }
      _endBlockNode(N1, N2) {
        const n = this._currNode;
        if (n instanceof N1 || N2 && n instanceof N2) {
          this._nodes.pop();
          return this;
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
      }
      _elseNode(node) {
        const n = this._currNode;
        if (!(n instanceof If)) {
          throw new Error('CodeGen: "else" without "if"');
        }
        this._currNode = n.else = node;
        return this;
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        const ns = this._nodes;
        return ns[ns.length - 1];
      }
      set _currNode(node) {
        const ns = this._nodes;
        ns[ns.length - 1] = node;
      }
    };
    exports.CodeGen = CodeGen;
    function addNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) + (from[n] || 0);
      return names;
    }
    function addExprNames(names, from) {
      return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
    }
    function optimizeExpr(expr, names, constants) {
      if (expr instanceof code_1.Name)
        return replaceName(expr);
      if (!canOptimize(expr))
        return expr;
      return new code_1._Code(expr._items.reduce((items, c) => {
        if (c instanceof code_1.Name)
          c = replaceName(c);
        if (c instanceof code_1._Code)
          items.push(...c._items);
        else
          items.push(c);
        return items;
      }, []));
      function replaceName(n) {
        const c = constants[n.str];
        if (c === void 0 || names[n.str] !== 1)
          return n;
        delete names[n.str];
        return c;
      }
      function canOptimize(e) {
        return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
      }
    }
    function subtractNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) - (from[n] || 0);
    }
    function not(x) {
      return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
    }
    exports.not = not;
    var andCode = mappend(exports.operators.AND);
    function and(...args) {
      return args.reduce(andCode);
    }
    exports.and = and;
    var orCode = mappend(exports.operators.OR);
    function or(...args) {
      return args.reduce(orCode);
    }
    exports.or = or;
    function mappend(op) {
      return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
    }
    function par(x) {
      return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
    }
  }
});

// node_modules/ajv/dist/compile/util.js
var require_util = __commonJS({
  "node_modules/ajv/dist/compile/util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.checkStrictMode = exports.getErrorPath = exports.Type = exports.useFunc = exports.setEvaluated = exports.evaluatedPropsToName = exports.mergeEvaluated = exports.eachItem = exports.unescapeJsonPointer = exports.escapeJsonPointer = exports.escapeFragment = exports.unescapeFragment = exports.schemaRefOrVal = exports.schemaHasRulesButRef = exports.schemaHasRules = exports.checkUnknownRules = exports.alwaysValidSchema = exports.toHash = void 0;
    var codegen_1 = require_codegen();
    var code_1 = require_code();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    exports.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    exports.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules = self.RULES.keywords;
      for (const key in schema) {
        if (!rules[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    exports.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules[key])
          return true;
      return false;
    }
    exports.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    exports.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
    }
    exports.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str2) {
      return unescapeJsonPointer(decodeURIComponent(str2));
    }
    exports.unescapeFragment = unescapeFragment;
    function escapeFragment(str2) {
      return encodeURIComponent(escapeJsonPointer(str2));
    }
    exports.escapeFragment = escapeFragment;
    function escapeJsonPointer(str2) {
      if (typeof str2 == "number")
        return `${str2}`;
      return str2.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    exports.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str2) {
      return str2.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    exports.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f) {
      if (Array.isArray(xs)) {
        for (const x of xs)
          f(x);
      } else {
        f(xs);
      }
    }
    exports.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues: mergeValues2, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues2(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    exports.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items) => gen.var("items", items)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    exports.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
    }
    exports.setEvaluated = setEvaluated;
    var snippets = {};
    function useFunc(gen, f) {
      return gen.scopeValue("func", {
        ref: f,
        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
      });
    }
    exports.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (exports.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    exports.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    exports.checkStrictMode = checkStrictMode;
  }
});

// node_modules/ajv/dist/compile/names.js
var require_names = __commonJS({
  "node_modules/ajv/dist/compile/names.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var names = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    exports.default = names;
  }
});

// node_modules/ajv/dist/compile/errors.js
var require_errors = __commonJS({
  "node_modules/ajv/dist/compile/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    exports.keywordError = {
      message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation`
    };
    exports.keyword$DataError = {
      message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)`
    };
    function reportError(cxt, error2 = exports.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error2, errorPaths);
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj);
      } else {
        returnErrors(it, (0, codegen_1._)`[${errObj}]`);
      }
    }
    exports.reportError = reportError;
    function reportExtraError(cxt, error2 = exports.keywordError, errorPaths) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error2, errorPaths);
      addError(gen, errObj);
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_1.default.vErrors);
      }
    }
    exports.reportExtraError = reportExtraError;
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_1.default.errors, errsCount);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
    }
    exports.resetErrorsCount = resetErrorsCount;
    function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
      if (errsCount === void 0)
        throw new Error("ajv implementation error");
      const err = gen.name("err");
      gen.forRange("i", errsCount, names_1.default.errors, (i) => {
        gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
        gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
        gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
        if (it.opts.verbose) {
          gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
          gen.assign((0, codegen_1._)`${err}.data`, data);
        }
      });
    }
    exports.extendErrors = extendErrors;
    function addError(gen, errObj) {
      const err = gen.const("err", errObj);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
      gen.code((0, codegen_1._)`${names_1.default.errors}++`);
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it;
      if (schemaEnv.$async) {
        gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
        gen.return(false);
      }
    }
    var E = {
      keyword: new codegen_1.Name("keyword"),
      schemaPath: new codegen_1.Name("schemaPath"),
      // also used in JTD errors
      params: new codegen_1.Name("params"),
      propertyName: new codegen_1.Name("propertyName"),
      message: new codegen_1.Name("message"),
      schema: new codegen_1.Name("schema"),
      parentSchema: new codegen_1.Name("parentSchema")
    };
    function errorObjectCode(cxt, error2, errorPaths) {
      const { createErrors } = cxt.it;
      if (createErrors === false)
        return (0, codegen_1._)`{}`;
      return errorObject(cxt, error2, errorPaths);
    }
    function errorObject(cxt, error2, errorPaths = {}) {
      const { gen, it } = cxt;
      const keyValues = [
        errorInstancePath(it, errorPaths),
        errorSchemaPath(cxt, errorPaths)
      ];
      extraErrorProps(cxt, error2, keyValues);
      return gen.object(...keyValues);
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
      return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
    }
    function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
      if (schemaPath) {
        schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
      }
      return [E.schemaPath, schPath];
    }
    function extraErrorProps(cxt, { params, message }, keyValues) {
      const { keyword, data, schemaValue, it } = cxt;
      const { opts, propertyName, topSchemaRef, schemaPath } = it;
      keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
      if (opts.messages) {
        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
      }
      if (opts.verbose) {
        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
      }
      if (propertyName)
        keyValues.push([E.propertyName, propertyName]);
    }
  }
});

// node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = __commonJS({
  "node_modules/ajv/dist/compile/validate/boolSchema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.boolOrEmptySchema = exports.topBoolOrEmptySchema = void 0;
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    exports.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    exports.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
  }
});

// node_modules/ajv/dist/compile/rules.js
var require_rules = __commonJS({
  "node_modules/ajv/dist/compile/rules.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRules = exports.isJSONType = void 0;
    var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    var jsonTypes = new Set(_jsonTypes);
    function isJSONType(x) {
      return typeof x == "string" && jsonTypes.has(x);
    }
    exports.isJSONType = isJSONType;
    function getRules() {
      const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    exports.getRules = getRules;
  }
});

// node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = __commonJS({
  "node_modules/ajv/dist/compile/validate/applicability.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.shouldUseRule = exports.shouldUseGroup = exports.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self }, type) {
      const group = self.RULES.types[type];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    exports.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    exports.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    exports.shouldUseRule = shouldUseRule;
  }
});

// node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = __commonJS({
  "node_modules/ajv/dist/compile/validate/dataType.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reportTypeError = exports.checkDataTypes = exports.checkDataType = exports.coerceAndCheckDataType = exports.getJSONTypes = exports.getSchemaTypes = exports.DataType = void 0;
    var rules_1 = require_rules();
    var applicability_1 = require_applicability();
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (exports.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types = getJSONTypes(schema.type);
      const hasNull = types.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types.push("null");
      }
      return types;
    }
    exports.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types.every(rules_1.isJSONType))
        return types;
      throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
    }
    exports.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types, opts.coerceTypes);
      const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports.coerceAndCheckDataType = coerceAndCheckDataType;
    var COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types, coerceTypes) {
      return coerceTypes ? types.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
    }
    function coerceData(it, types, coerceTo) {
      const { gen, data, opts } = it;
      const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t of coerceTo) {
        if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t) {
        switch (t) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    exports.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types = (0, util_1.toHash)(dataTypes);
      if (types.array && types.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types.number)
        delete types.integer;
      for (const t in types)
        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
      return cond;
    }
    exports.checkDataTypes = checkDataTypes;
    var typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    exports.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  }
});

// node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = __commonJS({
  "node_modules/ajv/dist/compile/validate/defaults.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.assignDefaults = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function assignDefaults(it, ty) {
      const { properties, items } = it.schema;
      if (ty === "object" && properties) {
        for (const key in properties) {
          assignDefault(it, key, properties[key].default);
        }
      } else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i) => assignDefault(it, i, sch.default));
      }
    }
    exports.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
  }
});

// node_modules/ajv/dist/vocabularies/code.js
var require_code2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateUnion = exports.validateArray = exports.usePattern = exports.callValidateCode = exports.schemaProperties = exports.allSchemaProperties = exports.noPropertyInData = exports.propertyInData = exports.isOwnProperty = exports.hasPropFunc = exports.reportMissingProp = exports.checkMissingProp = exports.checkReportMissingProp = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var util_2 = require_util();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    exports.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
      return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    exports.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    exports.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    exports.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    exports.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    exports.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    exports.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
    }
    exports.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
    }
    exports.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    exports.callValidateCode = callValidateCode;
    var newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern) {
      const u = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern, u);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
      });
    }
    exports.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema({
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    exports.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: i,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    exports.validateUnion = validateUnion;
  }
});

// node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = __commonJS({
  "node_modules/ajv/dist/compile/validate/keyword.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateKeywordUsage = exports.validSchemaType = exports.funcKeywordCode = exports.macroKeywordCode = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var code_1 = require_code2();
    var errors_1 = require_errors();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    exports.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword, validate);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors);
      }
    }
    exports.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword, result) {
      if (result === void 0)
        throw new Error(`keyword "${keyword}" failed to compile`);
      return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    exports.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
          const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    exports.validateKeywordUsage = validateKeywordUsage;
  }
});

// node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = __commonJS({
  "node_modules/ajv/dist/compile/validate/subschema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendSubschemaMode = exports.extendSubschemaData = exports.getSubschema = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword !== void 0) {
        const sch = it.schema[keyword];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    exports.getSubschema = getSubschema;
    function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema.propertyName = propertyName;
      }
      if (dataTypes)
        subschema.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
      }
    }
    exports.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema.allErrors = allErrors;
      subschema.jtdDiscriminator = jtdDiscriminator;
      subschema.jtdMetadata = jtdMetadata;
    }
    exports.extendSubschemaMode = extendSubschemaMode;
  }
});

// node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/fast-deep-equal/index.js"(exports, module) {
    "use strict";
    module.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = __commonJS({
  "node_modules/json-schema-traverse/index.js"(exports, module) {
    "use strict";
    var traverse = module.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post = cb.post || function() {
      };
      _traverse(opts, pre, post, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i = 0; i < sch.length; i++)
                _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str2) {
      return str2.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }
});

// node_modules/ajv/dist/compile/resolve.js
var require_resolve = __commonJS({
  "node_modules/ajv/dist/compile/resolve.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSchemaRefs = exports.resolveUrl = exports.normalizeId = exports._getFullPath = exports.getFullPath = exports.inlineRef = void 0;
    var util_1 = require_util();
    var equal = require_fast_deep_equal();
    var traverse = require_json_schema_traverse();
    var SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit === true)
        return !hasRef(schema);
      if (!limit)
        return false;
      return countKeys(schema) <= limit;
    }
    exports.inlineRef = inlineRef;
    var REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id = "", normalize) {
      if (normalize !== false)
        id = normalizeId(id);
      const p = resolver.parse(id);
      return _getFullPath(resolver, p);
    }
    exports.getFullPath = getFullPath;
    function _getFullPath(resolver, p) {
      const serialized = resolver.serialize(p);
      return serialized.split("#")[0] + "#";
    }
    exports._getFullPath = _getFullPath;
    var TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id) {
      return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
    }
    exports.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id) {
      id = normalizeId(id);
      return resolver.resolve(baseId, id);
    }
    exports.resolveUrl = resolveUrl;
    var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          const _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref))
            throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref);
          } else if (ref !== normalizeId(fullPath)) {
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else {
              this.refs[ref] = fullPath;
            }
          }
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== void 0 && !equal(sch1, sch2))
          throw ambiguos(ref);
      }
      function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
      }
    }
    exports.getSchemaRefs = getSchemaRefs;
  }
});

// node_modules/ajv/dist/compile/validate/index.js
var require_validate = __commonJS({
  "node_modules/ajv/dist/compile/validate/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getData = exports.KeywordCxt = exports.validateFunctionCode = void 0;
    var boolSchema_1 = require_boolSchema();
    var dataType_1 = require_dataType();
    var applicability_1 = require_applicability();
    var dataType_2 = require_dataType();
    var defaults_1 = require_defaults();
    var keyword_1 = require_keyword();
    var subschema_1 = require_subschema();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var errors_1 = require_errors();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    exports.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
      schemaKeywords(it, types, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items);
    }
    function schemaKeywords(it, types, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self } = it;
      const { RULES } = self;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types.length === 1 && types[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types) {
      if (!types.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types;
        return;
      }
      types.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
          strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules = it.self.RULES.all;
      for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type } = rule.definition;
          if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
            strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t) {
      return ts.includes(t) || t === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t of it.dataTypes) {
        if (includesType(withTypes, t))
          ts.push(t);
        else if (withTypes.includes("integer") && t === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    var KeywordCxt = class {
      constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        ;
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    };
    exports.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    exports.getData = getData;
  }
});

// node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = __commonJS({
  "node_modules/ajv/dist/runtime/validation_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValidationError = class extends Error {
      constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
      }
    };
    exports.default = ValidationError;
  }
});

// node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = __commonJS({
  "node_modules/ajv/dist/compile/ref_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var resolve_1 = require_resolve();
    var MissingRefError = class extends Error {
      constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    };
    exports.default = MissingRefError;
  }
});

// node_modules/ajv/dist/compile/index.js
var require_compile = __commonJS({
  "node_modules/ajv/dist/compile/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveSchema = exports.getCompilingSchema = exports.resolveRef = exports.compileSchema = exports.SchemaEnv = void 0;
    var codegen_1 = require_codegen();
    var validation_error_1 = require_validation_error();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var validate_1 = require_validate();
    var SchemaEnv = class {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    };
    exports.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
          validate.$async = true;
        if (this.opts.code.source === true) {
          validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items } = schemaCxt;
          validate.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items instanceof codegen_1.Name ? void 0 : items,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items instanceof codegen_1.Name
          };
          if (validate.source)
            validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
      } catch (e) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e;
      } finally {
        this._compilations.delete(sch);
      }
    }
    exports.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref) {
      var _a;
      ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
      const schOrFunc = root.refs[ref];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve.call(this, root, ref);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref] = inlineOrCompile.call(this, _sch);
    }
    exports.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    exports.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s2) {
      return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
    }
    function resolve(root, ref) {
      let sch;
      while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
      return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
    }
    function resolveSchema(root, ref) {
      const p = this.opts.uriResolver.parse(ref);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p, root);
      }
      const id = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id] || this.schemas[id];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p, schOrRef);
    }
    exports.resolveSchema = resolveSchema;
    var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
  }
});

// node_modules/ajv/dist/refs/data.json
var require_data = __commonJS({
  "node_modules/ajv/dist/refs/data.json"(exports, module) {
    module.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: {
          type: "string",
          anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
        }
      },
      additionalProperties: false
    };
  }
});

// node_modules/fast-uri/lib/utils.js
var require_utils = __commonJS({
  "node_modules/fast-uri/lib/utils.js"(exports, module) {
    "use strict";
    var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
    var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
    var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
    var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
    var isPathCharacter = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);
    function stringArrayToHexStripped(input) {
      let acc = "";
      let code = 0;
      let i = 0;
      for (i = 0; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (code === 48) {
          continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
        break;
      }
      for (i += 1; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
      }
      return acc;
    }
    var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function consumeIsZone(buffer) {
      buffer.length = 0;
      return true;
    }
    function consumeHextets(buffer, address, output) {
      if (buffer.length) {
        const hex = stringArrayToHexStripped(buffer);
        if (hex !== "") {
          address.push(hex);
        } else {
          output.error = true;
          return false;
        }
        buffer.length = 0;
      }
      return true;
    }
    function getIPV6(input) {
      let tokenCount = 0;
      const output = { error: false, address: "", zone: "" };
      const address = [];
      const buffer = [];
      let endipv6Encountered = false;
      let endIpv6 = false;
      let consume = consumeHextets;
      for (let i = 0; i < input.length; i++) {
        const cursor = input[i];
        if (cursor === "[" || cursor === "]") {
          continue;
        }
        if (cursor === ":") {
          if (endipv6Encountered === true) {
            endIpv6 = true;
          }
          if (!consume(buffer, address, output)) {
            break;
          }
          if (++tokenCount > 7) {
            output.error = true;
            break;
          }
          if (i > 0 && input[i - 1] === ":") {
            endipv6Encountered = true;
          }
          address.push(":");
          continue;
        } else if (cursor === "%") {
          if (!consume(buffer, address, output)) {
            break;
          }
          consume = consumeIsZone;
        } else {
          buffer.push(cursor);
          continue;
        }
      }
      if (buffer.length) {
        if (consume === consumeIsZone) {
          output.zone = buffer.join("");
        } else if (endIpv6) {
          address.push(buffer.join(""));
        } else {
          address.push(stringArrayToHexStripped(buffer));
        }
      }
      output.address = address.join("");
      return output;
    }
    function normalizeIPv6(host) {
      if (findToken(host, ":") < 2) {
        return { host, isIPV6: false };
      }
      const ipv62 = getIPV6(host);
      if (!ipv62.error) {
        let newHost = ipv62.address;
        let escapedHost = ipv62.address;
        if (ipv62.zone) {
          newHost += "%" + ipv62.zone;
          escapedHost += "%25" + ipv62.zone;
        }
        return { host: newHost, isIPV6: true, escapedHost };
      } else {
        return { host, isIPV6: false };
      }
    }
    function findToken(str2, token) {
      let ind = 0;
      for (let i = 0; i < str2.length; i++) {
        if (str2[i] === token) ind++;
      }
      return ind;
    }
    function removeDotSegments(path3) {
      let input = path3;
      const output = [];
      let nextSlash = -1;
      let len = 0;
      while (len = input.length) {
        if (len === 1) {
          if (input === ".") {
            break;
          } else if (input === "/") {
            output.push("/");
            break;
          } else {
            output.push(input);
            break;
          }
        } else if (len === 2) {
          if (input[0] === ".") {
            if (input[1] === ".") {
              break;
            } else if (input[1] === "/") {
              input = input.slice(2);
              continue;
            }
          } else if (input[0] === "/") {
            if (input[1] === "." || input[1] === "/") {
              output.push("/");
              break;
            }
          }
        } else if (len === 3) {
          if (input === "/..") {
            if (output.length !== 0) {
              output.pop();
            }
            output.push("/");
            break;
          }
        }
        if (input[0] === ".") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(3);
              continue;
            }
          } else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(2);
              continue;
            } else if (input[2] === ".") {
              if (input[3] === "/") {
                input = input.slice(3);
                if (output.length !== 0) {
                  output.pop();
                }
                continue;
              }
            }
          }
        }
        if ((nextSlash = input.indexOf("/", 1)) === -1) {
          output.push(input);
          break;
        } else {
          output.push(input.slice(0, nextSlash));
          input = input.slice(nextSlash);
        }
      }
      return output.join("");
    }
    var HOST_DELIMS = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" };
    var HOST_DELIM_RE = /[@/?#:]/g;
    var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
    function reescapeHostDelimiters(host, isIP) {
      const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
      re.lastIndex = 0;
      return host.replace(re, (ch) => HOST_DELIMS[ch]);
    }
    function normalizePercentEncoding(input, decodeUnreserved = false) {
      if (input.indexOf("%") === -1) {
        return input;
      }
      let output = "";
      for (let i = 0; i < input.length; i++) {
        if (input[i] === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decodeUnreserved && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        output += input[i];
      }
      return output;
    }
    function normalizePathEncoding(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        if (input[i] === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decoded !== "." && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        if (isPathCharacter(input[i])) {
          output += input[i];
        } else {
          output += escape(input[i]);
        }
      }
      return output;
    }
    function escapePreservingEscapes(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        if (input[i] === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        output += escape(input[i]);
      }
      return output;
    }
    function recomposeAuthority(component) {
      const uriTokens = [];
      if (component.userinfo !== void 0) {
        uriTokens.push(component.userinfo);
        uriTokens.push("@");
      }
      if (component.host !== void 0) {
        let host = unescape(component.host);
        if (!isIPv4(host)) {
          const ipV6res = normalizeIPv6(host);
          if (ipV6res.isIPV6 === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = reescapeHostDelimiters(host, false);
          }
        }
        uriTokens.push(host);
      }
      if (typeof component.port === "number" || typeof component.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(component.port));
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    module.exports = {
      nonSimpleDomain,
      recomposeAuthority,
      reescapeHostDelimiters,
      normalizePercentEncoding,
      normalizePathEncoding,
      escapePreservingEscapes,
      removeDotSegments,
      isIPv4,
      isUUID,
      normalizeIPv6,
      stringArrayToHexStripped
    };
  }
});

// node_modules/fast-uri/lib/schemes.js
var require_schemes = __commonJS({
  "node_modules/fast-uri/lib/schemes.js"(exports, module) {
    "use strict";
    var { isUUID } = require_utils();
    var URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
    var supportedSchemeNames = (
      /** @type {const} */
      [
        "http",
        "https",
        "ws",
        "wss",
        "urn",
        "urn:uuid"
      ]
    );
    function isValidSchemeName(name) {
      return supportedSchemeNames.indexOf(
        /** @type {*} */
        name
      ) !== -1;
    }
    function wsIsSecure(wsComponent) {
      if (wsComponent.secure === true) {
        return true;
      } else if (wsComponent.secure === false) {
        return false;
      } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
      } else {
        return false;
      }
    }
    function httpParse(component) {
      if (!component.host) {
        component.error = component.error || "HTTP URIs must have a host.";
      }
      return component;
    }
    function httpSerialize(component) {
      const secure = String(component.scheme).toLowerCase() === "https";
      if (component.port === (secure ? 443 : 80) || component.port === "") {
        component.port = void 0;
      }
      if (!component.path) {
        component.path = "/";
      }
      return component;
    }
    function wsParse(wsComponent) {
      wsComponent.secure = wsIsSecure(wsComponent);
      wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
      wsComponent.path = void 0;
      wsComponent.query = void 0;
      return wsComponent;
    }
    function wsSerialize(wsComponent) {
      if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
        wsComponent.port = void 0;
      }
      if (typeof wsComponent.secure === "boolean") {
        wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
        wsComponent.secure = void 0;
      }
      if (wsComponent.resourceName) {
        const [path3, query] = wsComponent.resourceName.split("?");
        wsComponent.path = path3 && path3 !== "/" ? path3 : void 0;
        wsComponent.query = query;
        wsComponent.resourceName = void 0;
      }
      wsComponent.fragment = void 0;
      return wsComponent;
    }
    function urnParse(urnComponent, options) {
      if (!urnComponent.path) {
        urnComponent.error = "URN can not be parsed";
        return urnComponent;
      }
      const matches = urnComponent.path.match(URN_REG);
      if (matches) {
        const scheme = options.scheme || urnComponent.scheme || "urn";
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = void 0;
        if (schemeHandler) {
          urnComponent = schemeHandler.parse(urnComponent, options);
        }
      } else {
        urnComponent.error = urnComponent.error || "URN can not be parsed.";
      }
      return urnComponent;
    }
    function urnSerialize(urnComponent, options) {
      if (urnComponent.nid === void 0) {
        throw new Error("URN without nid cannot be serialized");
      }
      const scheme = options.scheme || urnComponent.scheme || "urn";
      const nid = urnComponent.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = getSchemeHandler(urnScheme);
      if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
      }
      const uriComponent = urnComponent;
      const nss = urnComponent.nss;
      uriComponent.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponent;
    }
    function urnuuidParse(urnComponent, options) {
      const uuidComponent = urnComponent;
      uuidComponent.uuid = uuidComponent.nss;
      uuidComponent.nss = void 0;
      if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || "UUID is not valid.";
      }
      return uuidComponent;
    }
    function urnuuidSerialize(uuidComponent) {
      const urnComponent = uuidComponent;
      urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
      return urnComponent;
    }
    var http2 = (
      /** @type {SchemeHandler} */
      {
        scheme: "http",
        domainHost: true,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var https = (
      /** @type {SchemeHandler} */
      {
        scheme: "https",
        domainHost: http2.domainHost,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var ws = (
      /** @type {SchemeHandler} */
      {
        scheme: "ws",
        domainHost: true,
        parse: wsParse,
        serialize: wsSerialize
      }
    );
    var wss = (
      /** @type {SchemeHandler} */
      {
        scheme: "wss",
        domainHost: ws.domainHost,
        parse: ws.parse,
        serialize: ws.serialize
      }
    );
    var urn = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn",
        parse: urnParse,
        serialize: urnSerialize,
        skipNormalize: true
      }
    );
    var urnuuid = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn:uuid",
        parse: urnuuidParse,
        serialize: urnuuidSerialize,
        skipNormalize: true
      }
    );
    var SCHEMES = (
      /** @type {Record<SchemeName, SchemeHandler>} */
      {
        http: http2,
        https,
        ws,
        wss,
        urn,
        "urn:uuid": urnuuid
      }
    );
    Object.setPrototypeOf(SCHEMES, null);
    function getSchemeHandler(scheme) {
      return scheme && (SCHEMES[
        /** @type {SchemeName} */
        scheme
      ] || SCHEMES[
        /** @type {SchemeName} */
        scheme.toLowerCase()
      ]) || void 0;
    }
    module.exports = {
      wsIsSecure,
      SCHEMES,
      isValidSchemeName,
      getSchemeHandler
    };
  }
});

// node_modules/fast-uri/index.js
var require_fast_uri = __commonJS({
  "node_modules/fast-uri/index.js"(exports, module) {
    "use strict";
    var { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, escapePreservingEscapes, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
    var { SCHEMES, getSchemeHandler } = require_schemes();
    function normalize(uri, options) {
      if (typeof uri === "string") {
        uri = /** @type {T} */
        normalizeString(uri, options);
      } else if (typeof uri === "object") {
        uri = /** @type {T} */
        parse3(serialize(uri, options), options);
      }
      return uri;
    }
    function resolve(baseURI, relativeURI, options) {
      const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
      const { parsed: baseParsed, malformedAuthorityOrPort: baseMalformed } = parseWithStatus(baseURI, schemelessOptions);
      const { parsed: relativeParsed, malformedAuthorityOrPort: relativeMalformed } = parseWithStatus(relativeURI, schemelessOptions);
      if (baseMalformed || relativeMalformed) {
        throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
      }
      const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
      schemelessOptions.skipEscape = true;
      return serialize(resolved, schemelessOptions);
    }
    function resolveComponent(base, relative, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse3(serialize(base, options), options);
        relative = parse3(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative.path[0] === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
                target.path = "/" + relative.path;
              } else if (!base.path) {
                target.path = relative.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function equal(uriA, uriB, options) {
      const normalizedA = normalizeComparableURI(uriA, options);
      const normalizedB = normalizeComparableURI(uriB, options);
      return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA.toLowerCase() === normalizedB.toLowerCase();
    }
    function serialize(cmpts, opts) {
      const component = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
      if (component.path !== void 0) {
        if (!options.skipEscape) {
          component.path = escapePreservingEscapes(component.path);
          if (component.scheme !== void 0) {
            component.path = component.path.split("%3A").join(":");
          }
        } else {
          component.path = normalizePercentEncoding(component.path);
        }
      }
      if (options.reference !== "suffix" && component.scheme) {
        uriTokens.push(component.scheme, ":");
      }
      const authority = recomposeAuthority(component);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (component.path && component.path[0] !== "/") {
          uriTokens.push("/");
        }
      }
      if (component.path !== void 0) {
        let s = component.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = removeDotSegments(s);
        }
        if (authority === void 0 && s[0] === "/" && s[1] === "/") {
          s = "/%2F" + s.slice(2);
        }
        uriTokens.push(s);
      }
      if (component.query !== void 0) {
        uriTokens.push("?", component.query);
      }
      if (component.fragment !== void 0) {
        uriTokens.push("#", component.fragment);
      }
      return uriTokens.join("");
    }
    var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
    var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
    function getParseError(parsed, matches) {
      if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") {
        return 'URI path must start with "/" when authority is present.';
      }
      if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) {
        return "URI port is malformed.";
      }
      return void 0;
    }
    function parseWithStatus(uri, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      let malformedAuthorityOrPort = false;
      let isIP = false;
      if (options.reference === "suffix") {
        if (options.scheme) {
          uri = options.scheme + ":" + uri;
        } else {
          uri = "//" + uri;
        }
      }
      const authorityMatch = uri.match(AUTHORITY_PREFIX);
      if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
        parsed.error = "URI authority must not contain a literal backslash.";
        malformedAuthorityOrPort = true;
      }
      const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
      if (introducerMatch !== null) {
        const region = introducerMatch[1];
        const normalizedRegion = region.replace(/[\t\n\r]/g, "");
        if (normalizedRegion.length >= 2) {
          if (normalizedRegion.slice(0, 2) !== "//") {
            parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
            malformedAuthorityOrPort = true;
          } else if (region.length !== normalizedRegion.length) {
            parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
            malformedAuthorityOrPort = true;
          }
        }
      }
      const matches = uri.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        const parseError = getParseError(parsed, matches);
        if (parseError !== void 0) {
          parsed.error = parsed.error || parseError;
          malformedAuthorityOrPort = true;
        }
        if (parsed.host) {
          const ipv4result = isIPv4(parsed.host);
          if (ipv4result === false) {
            const ipv6result = normalizeIPv6(parsed.host);
            parsed.host = ipv6result.host.toLowerCase();
            isIP = ipv6result.isIPV6;
          } else {
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
          if (parsed.host && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
            try {
              parsed.host = new URL("http://" + parsed.host).hostname;
            } catch (e) {
              parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
            }
          }
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (uri.indexOf("%") !== -1) {
            if (parsed.scheme !== void 0) {
              parsed.scheme = unescape(parsed.scheme);
            }
            if (parsed.host !== void 0) {
              parsed.host = reescapeHostDelimiters(unescape(parsed.host), isIP);
            }
          }
          if (parsed.path) {
            parsed.path = normalizePathEncoding(parsed.path);
          }
          if (parsed.fragment) {
            try {
              parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
            } catch {
              parsed.error = parsed.error || "URI malformed";
            }
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return { parsed, malformedAuthorityOrPort };
    }
    function parse3(uri, opts) {
      return parseWithStatus(uri, opts).parsed;
    }
    function normalizeString(uri, opts) {
      return normalizeStringWithStatus(uri, opts).normalized;
    }
    function normalizeStringWithStatus(uri, opts) {
      const { parsed, malformedAuthorityOrPort } = parseWithStatus(uri, opts);
      return {
        normalized: malformedAuthorityOrPort ? uri : serialize(parsed, opts),
        malformedAuthorityOrPort
      };
    }
    function normalizeComparableURI(uri, opts) {
      if (typeof uri === "string") {
        const { normalized, malformedAuthorityOrPort } = normalizeStringWithStatus(uri, opts);
        return malformedAuthorityOrPort ? void 0 : normalized;
      }
      if (typeof uri === "object") {
        return serialize(uri, opts);
      }
    }
    var fastUri = {
      SCHEMES,
      normalize,
      resolve,
      resolveComponent,
      equal,
      serialize,
      parse: parse3
    };
    module.exports = fastUri;
    module.exports.default = fastUri;
    module.exports.fastUri = fastUri;
  }
});

// node_modules/ajv/dist/runtime/uri.js
var require_uri = __commonJS({
  "node_modules/ajv/dist/runtime/uri.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var uri = require_fast_uri();
    uri.code = 'require("ajv/dist/runtime/uri").default';
    exports.default = uri;
  }
});

// node_modules/ajv/dist/core.js
var require_core = __commonJS({
  "node_modules/ajv/dist/core.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    var ref_error_1 = require_ref_error();
    var rules_1 = require_rules();
    var compile_1 = require_compile();
    var codegen_2 = require_codegen();
    var resolve_1 = require_resolve();
    var dataType_1 = require_dataType();
    var util_1 = require_util();
    var $dataRefSchema = require_data();
    var uri_1 = require_uri();
    var defaultRegExp = (str2, flags) => new RegExp(str2, flags);
    defaultRegExp.code = "new RegExp";
    var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
    var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error"
    ]);
    var removedOptions = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now."
    };
    var deprecatedOptions = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    };
    var MAX_EXPRESSION = 200;
    function requiredOptions(o) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
      const s = o.strict;
      const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
      const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
      const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
      return {
        strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
        strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
        strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
        strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
        strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      };
    }
    var Ajv2 = class {
      constructor(opts = {}) {
        this.schemas = {};
        this.refs = {};
        this.formats = /* @__PURE__ */ Object.create(null);
        this._compilations = /* @__PURE__ */ new Set();
        this._loading = {};
        this._cache = /* @__PURE__ */ new Map();
        opts = this.opts = { ...opts, ...requiredOptions(opts) };
        const { es5, lines } = this.opts.code;
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
        this.logger = getLogger(opts.logger);
        const formatOpt = opts.validateFormats;
        opts.validateFormats = false;
        this.RULES = (0, rules_1.getRules)();
        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
        this._metaOpts = getMetaSchemaOptions.call(this);
        if (opts.formats)
          addInitialFormats.call(this);
        this._addVocabularies();
        this._addDefaultMetaSchema();
        if (opts.keywords)
          addInitialKeywords.call(this, opts.keywords);
        if (typeof opts.meta == "object")
          this.addMetaSchema(opts.meta);
        addInitialSchemas.call(this);
        opts.validateFormats = formatOpt;
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts;
        let _dataRefSchema = $dataRefSchema;
        if (schemaId === "id") {
          _dataRefSchema = { ...$dataRefSchema };
          _dataRefSchema.id = _dataRefSchema.$id;
          delete _dataRefSchema.$id;
        }
        if (meta && $data)
          this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts;
        return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
      }
      validate(schemaKeyRef, data) {
        let v;
        if (typeof schemaKeyRef == "string") {
          v = this.getSchema(schemaKeyRef);
          if (!v)
            throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
        } else {
          v = this.compile(schemaKeyRef);
        }
        const valid = v(data);
        if (!("$async" in v))
          this.errors = v.errors;
        return valid;
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta);
        return sch.validate || this._compileSchemaEnv(sch);
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != "function") {
          throw new Error("options.loadSchema should be a function");
        }
        const { loadSchema } = this.opts;
        return runCompileAsync.call(this, schema, meta);
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema);
          const sch = this._addSchema(_schema, _meta);
          return sch.validate || _compileAsync.call(this, sch);
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true);
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch);
          } catch (e) {
            if (!(e instanceof ref_error_1.default))
              throw e;
            checkLoaded.call(this, e);
            await loadMissingSchema.call(this, e.missingSchema);
            return _compileAsync.call(this, sch);
          }
        }
        function checkLoaded({ missingSchema: ref, missingRef }) {
          if (this.refs[ref]) {
            throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
        }
        async function loadMissingSchema(ref) {
          const _schema = await _loadSchema.call(this, ref);
          if (!this.refs[ref])
            await loadMetaSchema.call(this, _schema.$schema);
          if (!this.refs[ref])
            this.addSchema(_schema, ref, meta);
        }
        async function _loadSchema(ref) {
          const p = this._loading[ref];
          if (p)
            return p;
          try {
            return await (this._loading[ref] = loadSchema(ref));
          } finally {
            delete this._loading[ref];
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema)
            this.addSchema(sch, void 0, _meta, _validateSchema);
          return this;
        }
        let id;
        if (typeof schema === "object") {
          const { schemaId } = this.opts;
          id = schema[schemaId];
          if (id !== void 0 && typeof id != "string") {
            throw new Error(`schema ${schemaId} must be string`);
          }
        }
        key = (0, resolve_1.normalizeId)(key || id);
        this._checkUnique(key);
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
        return this;
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema);
        return this;
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == "boolean")
          return true;
        let $schema;
        $schema = schema.$schema;
        if ($schema !== void 0 && typeof $schema != "string") {
          throw new Error("$schema must be a string");
        }
        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
        if (!$schema) {
          this.logger.warn("meta-schema not available");
          this.errors = null;
          return true;
        }
        const valid = this.validate($schema, schema);
        if (!valid && throwOrLogError) {
          const message = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log")
            this.logger.error(message);
          else
            throw new Error(message);
        }
        return valid;
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch;
        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
          keyRef = sch;
        if (sch === void 0) {
          const { schemaId } = this.opts;
          const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
          sch = compile_1.resolveSchema.call(this, root, keyRef);
          if (!sch)
            return;
          this.refs[keyRef] = sch;
        }
        return sch.validate || this._compileSchemaEnv(sch);
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef);
          this._removeAllSchemas(this.refs, schemaKeyRef);
          return this;
        }
        switch (typeof schemaKeyRef) {
          case "undefined":
            this._removeAllSchemas(this.schemas);
            this._removeAllSchemas(this.refs);
            this._cache.clear();
            return this;
          case "string": {
            const sch = getSchEnv.call(this, schemaKeyRef);
            if (typeof sch == "object")
              this._cache.delete(sch.schema);
            delete this.schemas[schemaKeyRef];
            delete this.refs[schemaKeyRef];
            return this;
          }
          case "object": {
            const cacheKey = schemaKeyRef;
            this._cache.delete(cacheKey);
            let id = schemaKeyRef[this.opts.schemaId];
            if (id) {
              id = (0, resolve_1.normalizeId)(id);
              delete this.schemas[id];
              delete this.refs[id];
            }
            return this;
          }
          default:
            throw new Error("ajv.removeSchema: invalid parameter");
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions) {
        for (const def of definitions)
          this.addKeyword(def);
        return this;
      }
      addKeyword(kwdOrDef, def) {
        let keyword;
        if (typeof kwdOrDef == "string") {
          keyword = kwdOrDef;
          if (typeof def == "object") {
            this.logger.warn("these parameters are deprecated, see docs for addKeyword");
            def.keyword = keyword;
          }
        } else if (typeof kwdOrDef == "object" && def === void 0) {
          def = kwdOrDef;
          keyword = def.keyword;
          if (Array.isArray(keyword) && !keyword.length) {
            throw new Error("addKeywords: keyword must be string or non-empty array");
          }
        } else {
          throw new Error("invalid addKeywords parameters");
        }
        checkKeyword.call(this, keyword, def);
        if (!def) {
          (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
          return this;
        }
        keywordMetaschema.call(this, def);
        const definition = {
          ...def,
          type: (0, dataType_1.getJSONTypes)(def.type),
          schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
        };
        (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
        return this;
      }
      getKeyword(keyword) {
        const rule = this.RULES.all[keyword];
        return typeof rule == "object" ? rule.definition : !!rule;
      }
      // Remove keyword
      removeKeyword(keyword) {
        const { RULES } = this;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        for (const group of RULES.rules) {
          const i = group.rules.findIndex((rule) => rule.keyword === keyword);
          if (i >= 0)
            group.rules.splice(i, 1);
        }
        return this;
      }
      // Add format
      addFormat(name, format) {
        if (typeof format == "string")
          format = new RegExp(format);
        this.formats[name] = format;
        return this;
      }
      errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
        if (!errors || errors.length === 0)
          return "No errors";
        return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
      }
      $dataMetaSchema(metaSchema, keywordsJsonPointers) {
        const rules = this.RULES.all;
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split("/").slice(1);
          let keywords = metaSchema;
          for (const seg of segments)
            keywords = keywords[seg];
          for (const key in rules) {
            const rule = rules[key];
            if (typeof rule != "object")
              continue;
            const { $data } = rule.definition;
            const schema = keywords[key];
            if ($data && schema)
              keywords[key] = schemaOrData(schema);
          }
        }
        return metaSchema;
      }
      _removeAllSchemas(schemas, regex) {
        for (const keyRef in schemas) {
          const sch = schemas[keyRef];
          if (!regex || regex.test(keyRef)) {
            if (typeof sch == "string") {
              delete schemas[keyRef];
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema);
              delete schemas[keyRef];
            }
          }
        }
      }
      _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
        let id;
        const { schemaId } = this.opts;
        if (typeof schema == "object") {
          id = schema[schemaId];
        } else {
          if (this.opts.jtd)
            throw new Error("schema must be object");
          else if (typeof schema != "boolean")
            throw new Error("schema must be object or boolean");
        }
        let sch = this._cache.get(schema);
        if (sch !== void 0)
          return sch;
        baseId = (0, resolve_1.normalizeId)(id || baseId);
        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
        this._cache.set(sch.schema, sch);
        if (addSchema && !baseId.startsWith("#")) {
          if (baseId)
            this._checkUnique(baseId);
          this.refs[baseId] = sch;
        }
        if (validateSchema)
          this.validateSchema(schema, true);
        return sch;
      }
      _checkUnique(id) {
        if (this.schemas[id] || this.refs[id]) {
          throw new Error(`schema with key or id "${id}" already exists`);
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta)
          this._compileMetaSchema(sch);
        else
          compile_1.compileSchema.call(this, sch);
        if (!sch.validate)
          throw new Error("ajv implementation error");
        return sch.validate;
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts;
        this.opts = this._metaOpts;
        try {
          compile_1.compileSchema.call(this, sch);
        } finally {
          this.opts = currentOpts;
        }
      }
    };
    Ajv2.ValidationError = validation_error_1.default;
    Ajv2.MissingRefError = ref_error_1.default;
    exports.default = Ajv2;
    function checkOptions(checkOpts, options, msg, log = "error") {
      for (const key in checkOpts) {
        const opt = key;
        if (opt in options)
          this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_1.normalizeId)(keyRef);
      return this.schemas[keyRef] || this.refs[keyRef];
    }
    function addInitialSchemas() {
      const optsSchemas = this.opts.schemas;
      if (!optsSchemas)
        return;
      if (Array.isArray(optsSchemas))
        this.addSchema(optsSchemas);
      else
        for (const key in optsSchemas)
          this.addSchema(optsSchemas[key], key);
    }
    function addInitialFormats() {
      for (const name in this.opts.formats) {
        const format = this.opts.formats[name];
        if (format)
          this.addFormat(name, format);
      }
    }
    function addInitialKeywords(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (const keyword in defs) {
        const def = defs[keyword];
        if (!def.keyword)
          def.keyword = keyword;
        this.addKeyword(def);
      }
    }
    function getMetaSchemaOptions() {
      const metaOpts = { ...this.opts };
      for (const opt of META_IGNORE_OPTIONS)
        delete metaOpts[opt];
      return metaOpts;
    }
    var noLogs = { log() {
    }, warn() {
    }, error() {
    } };
    function getLogger(logger) {
      if (logger === false)
        return noLogs;
      if (logger === void 0)
        return console;
      if (logger.log && logger.warn && logger.error)
        return logger;
      throw new Error("logger must implement log, warn and error methods");
    }
    var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
    function checkKeyword(keyword, def) {
      const { RULES } = this;
      (0, util_1.eachItem)(keyword, (kwd) => {
        if (RULES.keywords[kwd])
          throw new Error(`Keyword ${kwd} is already defined`);
        if (!KEYWORD_NAME.test(kwd))
          throw new Error(`Keyword ${kwd} has invalid name`);
      });
      if (!def)
        return;
      if (def.$data && !("code" in def || "validate" in def)) {
        throw new Error('$data keyword must have "code" or "validate" function');
      }
    }
    function addRule(keyword, definition, dataType) {
      var _a;
      const post = definition === null || definition === void 0 ? void 0 : definition.post;
      if (dataType && post)
        throw new Error('keyword with "post" flag cannot have "type"');
      const { RULES } = this;
      let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.rules.push(ruleGroup);
      }
      RULES.keywords[keyword] = true;
      if (!definition)
        return;
      const rule = {
        keyword,
        definition: {
          ...definition,
          type: (0, dataType_1.getJSONTypes)(definition.type),
          schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
        }
      };
      if (definition.before)
        addBeforeRule.call(this, ruleGroup, rule, definition.before);
      else
        ruleGroup.rules.push(rule);
      RULES.all[keyword] = rule;
      (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
      if (i >= 0) {
        ruleGroup.rules.splice(i, 0, rule);
      } else {
        ruleGroup.rules.push(rule);
        this.logger.warn(`rule ${before} is not defined`);
      }
    }
    function keywordMetaschema(def) {
      let { metaSchema } = def;
      if (metaSchema === void 0)
        return;
      if (def.$data && this.opts.$data)
        metaSchema = schemaOrData(metaSchema);
      def.validateSchema = this.compile(metaSchema, true);
    }
    var $dataRef = {
      $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
    };
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] };
    }
  }
});

// node_modules/ajv/dist/vocabularies/core/id.js
var require_id = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/id.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/ref.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.callRef = exports.getValidate = void 0;
    var ref_error_1 = require_ref_error();
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var util_1 = require_util();
    var def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v = getValidate(cxt, sch);
          callRef(cxt, v, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    exports.getValidate = getValidate;
    function callRef(cxt, v, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
          addEvaluatedFrom(v);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e) => {
          gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
          }
        }
      }
    }
    exports.callRef = callRef;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/index.js
var require_core2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var id_1 = require_id();
    var ref_1 = require_ref();
    var core = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    exports.default = core;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitNumber.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error2 = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    var def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error: error2,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/multipleOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error2 = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    var def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error: error2,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucs2length(str2) {
      const len = str2.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str2.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str2.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitLength.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var ucs2length_1 = require_ucs2length();
    var error2 = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error: error2,
      code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/pattern.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var util_1 = require_util();
    var codegen_1 = require_codegen();
    var error2 = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    var def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error: error2,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const u = it.opts.unicodeRegExp ? "u" : "";
        if ($data) {
          const { regExp } = it.opts.code;
          const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
          const valid = gen.let("valid");
          gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
          cxt.fail$data((0, codegen_1._)`!${valid}`);
        } else {
          const regExp = (0, code_1.usePattern)(cxt, schema);
          cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error2 = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error: error2,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/required.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error2 = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    var def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error: error2,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error2 = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error: error2,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/ajv/dist/runtime/equal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports.default = equal;
  }
});

// node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/uniqueItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dataType_1 = require_dataType();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error2 = {
      message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
      params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
    };
    var def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error: error2,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j = gen.let("j");
          cxt.setParams({ i, j });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
        }
        function loopN(i, j) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
          });
        }
        function loopN2(i, j) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/const.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error2 = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    var def = {
      keyword: "const",
      $data: true,
      error: error2,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/enum.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error2 = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    var def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error: error2,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i) {
          const sch = schema[i];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var limitNumber_1 = require_limitNumber();
    var multipleOf_1 = require_multipleOf();
    var limitLength_1 = require_limitLength();
    var pattern_1 = require_pattern();
    var limitProperties_1 = require_limitProperties();
    var required_1 = require_required();
    var limitItems_1 = require_limitItems();
    var uniqueItems_1 = require_uniqueItems();
    var const_1 = require_const();
    var enum_1 = require_enum();
    var validation = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    exports.default = validation;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateAdditionalItems = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error2 = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error: error2,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items);
      }
    };
    function validateAdditionalItems(cxt, items) {
      const { gen, schema, data, keyword, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items.length, len, (i) => {
          cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    exports.validateAdditionalItems = validateAdditionalItems;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateTuple = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
          keyword,
          schemaProp: i,
          dataProp: i
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l = schArr.length;
        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    exports.validateTuple = validateTuple;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/prefixItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var items_1 = require_items();
    var def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items2020.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var additionalItems_1 = require_additionalItems();
    var error2 = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error: error2,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/contains.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error2 = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    var def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error: error2,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/dependencies.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    exports.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? "property" : "properties";
        return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    };
    var def = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: exports.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt);
        validatePropertyDeps(cxt, propDeps);
        validateSchemaDeps(cxt, schDeps);
      }
    };
    function splitDependencies({ schema }) {
      const propertyDeps = {};
      const schemaDeps = {};
      for (const key in schema) {
        if (key === "__proto__")
          continue;
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
        deps[key] = schema[key];
      }
      return [propertyDeps, schemaDeps];
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data, it } = cxt;
      if (Object.keys(propertyDeps).length === 0)
        return;
      const missing = gen.let("missing");
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop];
        if (deps.length === 0)
          continue;
        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(", ")
        });
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              (0, code_1.checkReportMissingProp)(cxt, depProp);
            }
          });
        } else {
          gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
    }
    exports.validatePropertyDeps = validatePropertyDeps;
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      for (const prop in schemaDeps) {
        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
          continue;
        gen.if(
          (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
            cxt.mergeValidEvaluated(schCxt, valid);
          },
          () => gen.var(valid, true)
          // TODO var
        );
        cxt.ok(valid);
      }
    }
    exports.validateSchemaDeps = validateSchemaDeps;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/propertyNames.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error2 = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    var def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error: error2,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var util_1 = require_util();
    var error2 = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    var def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error: error2,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors) {
          const subschema = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors === false) {
            Object.assign(subschema, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema, valid);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/properties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var validate_1 = require_validate();
    var code_1 = require_code2();
    var util_1 = require_util();
    var additionalProperties_1 = require_additionalProperties();
    var def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
        if (properties.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/patternProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var util_2 = require_util();
    var def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/not.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/anyOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/oneOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error2 = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    var def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error: error2,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true
              }, schValid);
            }
            if (i > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/allOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/if.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error2 = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    var def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error: error2,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
            else
              cxt.setParams({ ifClause: keyword });
          };
        }
      }
    };
    function hasSchema(it, keyword) {
      const schema = it.schema[keyword];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/thenElse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var additionalItems_1 = require_additionalItems();
    var prefixItems_1 = require_prefixItems();
    var items_1 = require_items();
    var items2020_1 = require_items2020();
    var contains_1 = require_contains();
    var dependencies_1 = require_dependencies();
    var propertyNames_1 = require_propertyNames();
    var additionalProperties_1 = require_additionalProperties();
    var properties_1 = require_properties();
    var patternProperties_1 = require_patternProperties();
    var not_1 = require_not();
    var anyOf_1 = require_anyOf();
    var oneOf_1 = require_oneOf();
    var allOf_1 = require_allOf();
    var if_1 = require_if();
    var thenElse_1 = require_thenElse();
    function getApplicator(draft2020 = false) {
      const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
      else
        applicator.push(additionalItems_1.default, items_1.default);
      applicator.push(contains_1.default);
      return applicator;
    }
    exports.default = getApplicator;
  }
});

// node_modules/ajv/dist/vocabularies/format/format.js
var require_format = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/format.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error2 = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    var def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error: error2,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
            return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/format/index.js
var require_format2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var format_1 = require_format();
    var format = [format_1.default];
    exports.default = format;
  }
});

// node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = __commonJS({
  "node_modules/ajv/dist/vocabularies/metadata.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.contentVocabulary = exports.metadataVocabulary = void 0;
    exports.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    exports.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
  }
});

// node_modules/ajv/dist/vocabularies/draft7.js
var require_draft7 = __commonJS({
  "node_modules/ajv/dist/vocabularies/draft7.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft7Vocabularies = [
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary
    ];
    exports.default = draft7Vocabularies;
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (exports.DiscrError = DiscrError = {}));
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var types_1 = require_types();
    var compile_1 = require_compile();
    var ref_error_1 = require_ref_error();
    var util_1 = require_util();
    var error2 = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    };
    var def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error: error2,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i = 0; i < oneOf.length; i++) {
            let sch = oneOf[i];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required: required2 }) {
            return Array.isArray(required2) && required2.includes(tagName);
          }
          function addMappings(sch, i) {
            if (sch.const) {
              addMapping(sch.const, i);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i;
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/refs/json-schema-draft-07.json
var require_json_schema_draft_07 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-draft-07.json"(exports, module) {
    module.exports = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "http://json-schema.org/draft-07/schema#",
      title: "Core schema meta-schema",
      definitions: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $ref: "#" }
        },
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }]
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      },
      type: ["object", "boolean"],
      properties: {
        $id: {
          type: "string",
          format: "uri-reference"
        },
        $schema: {
          type: "string",
          format: "uri"
        },
        $ref: {
          type: "string",
          format: "uri-reference"
        },
        $comment: {
          type: "string"
        },
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        readOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/definitions/nonNegativeInteger" },
        minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        additionalItems: { $ref: "#" },
        items: {
          anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
          default: true
        },
        maxItems: { $ref: "#/definitions/nonNegativeInteger" },
        minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        contains: { $ref: "#" },
        maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
        minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        required: { $ref: "#/definitions/stringArray" },
        additionalProperties: { $ref: "#" },
        definitions: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        properties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependencies: {
          type: "object",
          additionalProperties: {
            anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
          }
        },
        propertyNames: { $ref: "#" },
        const: true,
        enum: {
          type: "array",
          items: true,
          minItems: 1,
          uniqueItems: true
        },
        type: {
          anyOf: [
            { $ref: "#/definitions/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/definitions/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        format: { type: "string" },
        contentMediaType: { type: "string" },
        contentEncoding: { type: "string" },
        if: { $ref: "#" },
        then: { $ref: "#" },
        else: { $ref: "#" },
        allOf: { $ref: "#/definitions/schemaArray" },
        anyOf: { $ref: "#/definitions/schemaArray" },
        oneOf: { $ref: "#/definitions/schemaArray" },
        not: { $ref: "#" }
      },
      default: true
    };
  }
});

// node_modules/ajv/dist/ajv.js
var require_ajv = __commonJS({
  "node_modules/ajv/dist/ajv.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv = void 0;
    var core_1 = require_core();
    var draft7_1 = require_draft7();
    var discriminator_1 = require_discriminator();
    var draft7MetaSchema = require_json_schema_draft_07();
    var META_SUPPORT_DATA = ["/properties"];
    var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
    var Ajv2 = class extends core_1.default {
      _addVocabularies() {
        super._addVocabularies();
        draft7_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        if (!this.opts.meta)
          return;
        const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
        this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports.Ajv = Ajv2;
    module.exports = exports = Ajv2;
    module.exports.Ajv = Ajv2;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Ajv2;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// node_modules/ajv-formats/dist/formats.js
var require_formats = __commonJS({
  "node_modules/ajv-formats/dist/formats.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
    function fmtDef(validate, compare) {
      return { validate, compare };
    }
    exports.fullFormats = {
      // date: http://tools.ietf.org/html/rfc3339#section-5.6
      date: fmtDef(date3, compareDate),
      // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
      time: fmtDef(getTime(true), compareTime),
      "date-time": fmtDef(getDateTime(true), compareDateTime),
      "iso-time": fmtDef(getTime(), compareIsoTime),
      "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
      // duration: https://tools.ietf.org/html/rfc3339#appendix-A
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri,
      "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      // uri-template: https://tools.ietf.org/html/rfc6570
      "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      // For the source: https://gist.github.com/dperini/729294
      // For test cases: https://mathiasbynens.be/demo/url-regex
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex,
      // uuid: http://tools.ietf.org/html/rfc4122
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      // JSON-pointer: https://tools.ietf.org/html/rfc6901
      // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
      // byte: https://github.com/miguelmota/is-base64
      byte,
      // signed 32 bit integer
      int32: { type: "number", validate: validateInt32 },
      // signed 64 bit integer
      int64: { type: "number", validate: validateInt64 },
      // C-type float
      float: { type: "number", validate: validateNumber },
      // C-type double
      double: { type: "number", validate: validateNumber },
      // hint to the UI to hide input strings
      password: true,
      // unchecked string payload
      binary: true
    };
    exports.fastFormats = {
      ...exports.fullFormats,
      date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
      time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
      "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
      "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
      "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
      // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
      uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
      "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
      // email (sources from jsen validator):
      // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
      email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
    };
    exports.formatNames = Object.keys(exports.fullFormats);
    function isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
    var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function date3(str2) {
      const matches = DATE.exec(str2);
      if (!matches)
        return false;
      const year = +matches[1];
      const month = +matches[2];
      const day = +matches[3];
      return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
    }
    function compareDate(d1, d2) {
      if (!(d1 && d2))
        return void 0;
      if (d1 > d2)
        return 1;
      if (d1 < d2)
        return -1;
      return 0;
    }
    var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function getTime(strictTimeZone) {
      return function time3(str2) {
        const matches = TIME.exec(str2);
        if (!matches)
          return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
          return false;
        if (hr <= 23 && min <= 59 && sec < 60)
          return true;
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
      };
    }
    function compareTime(s1, s2) {
      if (!(s1 && s2))
        return void 0;
      const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
      const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
      if (!(t1 && t2))
        return void 0;
      return t1 - t2;
    }
    function compareIsoTime(t1, t2) {
      if (!(t1 && t2))
        return void 0;
      const a1 = TIME.exec(t1);
      const a2 = TIME.exec(t2);
      if (!(a1 && a2))
        return void 0;
      t1 = a1[1] + a1[2] + a1[3];
      t2 = a2[1] + a2[2] + a2[3];
      if (t1 > t2)
        return 1;
      if (t1 < t2)
        return -1;
      return 0;
    }
    var DATE_TIME_SEPARATOR = /t|\s/i;
    function getDateTime(strictTimeZone) {
      const time3 = getTime(strictTimeZone);
      return function date_time(str2) {
        const dateTime = str2.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date3(dateTime[0]) && time3(dateTime[1]);
      };
    }
    function compareDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const d1 = new Date(dt1).valueOf();
      const d2 = new Date(dt2).valueOf();
      if (!(d1 && d2))
        return void 0;
      return d1 - d2;
    }
    function compareIsoDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
      const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
      const res = compareDate(d1, d2);
      if (res === void 0)
        return void 0;
      return res || compareTime(t1, t2);
    }
    var NOT_URI_FRAGMENT = /\/|:/;
    var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function uri(str2) {
      return NOT_URI_FRAGMENT.test(str2) && URI.test(str2);
    }
    var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function byte(str2) {
      BYTE.lastIndex = 0;
      return BYTE.test(str2);
    }
    var MIN_INT32 = -(2 ** 31);
    var MAX_INT32 = 2 ** 31 - 1;
    function validateInt32(value) {
      return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
    }
    function validateInt64(value) {
      return Number.isInteger(value);
    }
    function validateNumber() {
      return true;
    }
    var Z_ANCHOR = /[^\\]\\Z/;
    function regex(str2) {
      if (Z_ANCHOR.test(str2))
        return false;
      try {
        new RegExp(str2);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

// node_modules/ajv-formats/dist/limit.js
var require_limit = __commonJS({
  "node_modules/ajv-formats/dist/limit.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatLimitDefinition = void 0;
    var ajv_1 = require_ajv();
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error2 = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`should be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    exports.formatLimitDefinition = {
      keyword: Object.keys(KWDs),
      type: "string",
      schemaType: "string",
      $data: true,
      error: error2,
      code(cxt) {
        const { gen, data, schemaCode, keyword, it } = cxt;
        const { opts, self } = it;
        if (!opts.validateFormats)
          return;
        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
        if (fCxt.$data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
          cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
        }
        function validateFormat() {
          const format = fCxt.schema;
          const fmtDef = self.formats[format];
          if (!fmtDef || fmtDef === true)
            return;
          if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
            throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
          }
          const fmt = gen.scopeValue("formats", {
            key: format,
            ref: fmtDef,
            code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : void 0
          });
          cxt.fail$data(compareCode(fmt));
        }
        function compareCode(fmt) {
          return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
        }
      },
      dependencies: ["format"]
    };
    var formatLimitPlugin = (ajv) => {
      ajv.addKeyword(exports.formatLimitDefinition);
      return ajv;
    };
    exports.default = formatLimitPlugin;
  }
});

// node_modules/ajv-formats/dist/index.js
var require_dist = __commonJS({
  "node_modules/ajv-formats/dist/index.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var formats_1 = require_formats();
    var limit_1 = require_limit();
    var codegen_1 = require_codegen();
    var fullName = new codegen_1.Name("fullFormats");
    var fastName = new codegen_1.Name("fastFormats");
    var formatsPlugin = (ajv, opts = { keywords: true }) => {
      if (Array.isArray(opts)) {
        addFormats(ajv, opts, formats_1.fullFormats, fullName);
        return ajv;
      }
      const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
      const list = opts.formats || formats_1.formatNames;
      addFormats(ajv, list, formats, exportName);
      if (opts.keywords)
        (0, limit_1.default)(ajv);
      return ajv;
    };
    formatsPlugin.get = (name, mode = "full") => {
      const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
      const f = formats[name];
      if (!f)
        throw new Error(`Unknown format "${name}"`);
      return f;
    };
    function addFormats(ajv, list, fs3, exportName) {
      var _a;
      var _b;
      (_a = (_b = ajv.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`;
      for (const f of list)
        ajv.addFormat(f, fs3[f]);
    }
    module.exports = exports = formatsPlugin;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = formatsPlugin;
  }
});

// src/config.ts
import fs from "fs";
import path from "path";
function getStorageDir() {
  return process.env.SDDSUM_STORAGE_PATH ?? path.join(process.cwd(), ".sdd-summary");
}
function getLifecycleDir() {
  return process.env.SDDSUM_LIFECYCLE_PATH ?? path.join(process.cwd(), ".summaryconfig-lifecycle");
}
function getConfigPath() {
  return path.join(getStorageDir(), CONFIG_FILE);
}
function loadConfig() {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}
function saveConfig(config2) {
  const dir = getStorageDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config2, null, 2), "utf-8");
}
function getGenesysConfig() {
  const envClientId = process.env.GENESYS_CLIENT_ID;
  const envRegion = process.env.GENESYS_REGION;
  if (envClientId && envRegion) {
    return {
      clientId: envClientId,
      clientSecret: process.env.GENESYS_CLIENT_SECRET,
      region: envRegion
    };
  }
  const config2 = loadConfig();
  return config2.genesys ?? null;
}
function saveGenesysConfig(genesys2) {
  const config2 = loadConfig();
  config2.genesys = genesys2;
  saveConfig(config2);
}
var CONFIG_FILE, SUMMARY_MODEL_NAME;
var init_config = __esm({
  "src/config.ts"() {
    "use strict";
    CONFIG_FILE = "config.json";
    SUMMARY_MODEL_NAME = "Claude Haiku 4.5";
  }
});

// src/genesys/auth.ts
import http from "http";
import crypto from "crypto";
import { exec } from "child_process";
function getBaseUrl(region) {
  return `https://api.${region}`;
}
function getLoginUrl(region) {
  return `https://login.${region}`;
}
async function getClientCredentialsToken(config2) {
  const now = Date.now();
  if (cachedClientToken && cachedClientToken.expiresAt > now + 6e4) {
    return cachedClientToken.access_token;
  }
  if (!config2.clientSecret) {
    throw new Error(
      "client_secret is required for client credentials auth. Use the login tool to authenticate as a user instead."
    );
  }
  const loginUrl = config2.loginUrl ?? getLoginUrl(config2.region);
  const credentials = Buffer.from(`${config2.clientId}:${config2.clientSecret}`).toString("base64");
  const resp = await fetch(`${loginUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OAuth2 client credentials failed (${resp.status}): ${body}`);
  }
  const data = await resp.json();
  cachedClientToken = { ...data, expiresAt: now + data.expires_in * 1e3 };
  return cachedClientToken.access_token;
}
function clearTokenCache() {
  cachedClientToken = null;
}
async function getUserToken(config2) {
  const appConfig = loadConfig();
  const stored = appConfig.userToken;
  if (!stored) return null;
  const now = Date.now();
  if (stored.expiresAt > now + 6e4) {
    return stored.access_token;
  }
  if (stored.refresh_token) {
    try {
      const refreshed = await refreshUserToken(config2, stored.refresh_token);
      return refreshed;
    } catch {
      appConfig.userToken = void 0;
      saveConfig(appConfig);
      return null;
    }
  }
  return null;
}
async function refreshUserToken(config2, refreshToken) {
  const loginUrl = config2.loginUrl ?? getLoginUrl(config2.region);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config2.clientId
  });
  const resp = await fetch(`${loginUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!resp.ok) {
    throw new Error(`Token refresh failed (${resp.status})`);
  }
  const data = await resp.json();
  const now = Date.now();
  const newToken = {
    ...data,
    expiresAt: now + data.expires_in * 1e3,
    // Genesys may or may not return a new refresh token — keep the old one if not
    refresh_token: data.refresh_token ?? refreshToken
  };
  const appConfig = loadConfig();
  appConfig.userToken = newToken;
  saveConfig(appConfig);
  return newToken.access_token;
}
async function getAccessToken(config2) {
  const userToken = await getUserToken(config2);
  if (userToken) return userToken;
  return getClientCredentialsToken(config2);
}
function generatePkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
function openBrowser(url) {
  const cmd = process.platform === "darwin" ? `open "${url}"` : process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error("Could not open browser automatically:", err.message);
  });
}
function preparePkceLogin(config2) {
  if (pendingLogin) {
    try {
      pendingLogin.server.close();
    } catch {
    }
    pendingLogin = null;
  }
  const { verifier, challenge } = generatePkce();
  const loginBase = config2.loginUrl ?? getLoginUrl(config2.region);
  const authUrl = `${loginBase}/oauth/authorize?response_type=code&client_id=${encodeURIComponent(config2.clientId)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${challenge}&code_challenge_method=S256`;
  const state = {
    verifier,
    loginBase,
    clientId: config2.clientId,
    authUrl,
    code: null,
    error: null,
    server: null
  };
  const server2 = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${REDIRECT_PORT}`);
    if (url.pathname !== "/callback") {
      res.writeHead(404);
      res.end();
      return;
    }
    const code = url.searchParams.get("code");
    const error2 = url.searchParams.get("error");
    if (error2) {
      state.error = `OAuth2 error: ${error2} \u2014 ${url.searchParams.get("error_description") ?? ""}`;
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<html><body style="font-family:sans-serif;padding:2em"><h2 style="color:#c62828">Login failed: ${error2}</h2><p>You can close this tab and return to Cursor.</p></body></html>`);
      server2.close();
      return;
    }
    if (!code) {
      state.error = "No authorization code received in callback";
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<html><body style="font-family:sans-serif;padding:2em"><h2>No code received.</h2><p>You can close this tab.</p></body></html>`);
      server2.close();
      return;
    }
    state.code = code;
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      `<html><body style="font-family:sans-serif;padding:2em"><h2 style="color:#2e7d32">&#10003; Logged in to Genesys Cloud</h2><p>You can close this tab and return to Cursor.</p></body></html>`
    );
    server2.close();
  });
  state.server = server2;
  pendingLogin = state;
  server2.listen(REDIRECT_PORT, "127.0.0.1", () => {
    openBrowser(authUrl);
  });
  setTimeout(() => {
    if (pendingLogin === state && !state.code && !state.error) {
      state.error = "Login timed out \u2014 no browser callback received after 3 minutes";
      try {
        server2.close();
      } catch {
      }
    }
  }, 18e4);
  return { authUrl };
}
async function completePkceLogin(config2) {
  if (!pendingLogin) {
    throw new Error("No login in progress. Call login(authorization_url=...) first.");
  }
  const state = pendingLogin;
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 18e4;
    const check2 = () => {
      if (state.code || state.error) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("Timed out waiting for browser callback"));
        return;
      }
      setTimeout(check2, 500);
    };
    check2();
  });
  pendingLogin = null;
  if (state.error) throw new Error(state.error);
  if (!state.code) throw new Error("No authorization code received");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: state.code,
    redirect_uri: REDIRECT_URI,
    code_verifier: state.verifier,
    client_id: state.clientId
  });
  const resp = await fetch(`${state.loginBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }
  const data = await resp.json();
  const now = Date.now();
  const userToken = {
    ...data,
    expiresAt: now + data.expires_in * 1e3
  };
  const appConfig = loadConfig();
  appConfig.userToken = userToken;
  saveConfig(appConfig);
  return { token: userToken.access_token, authUrl: state.authUrl };
}
function clearUserToken() {
  const appConfig = loadConfig();
  appConfig.userToken = void 0;
  saveConfig(appConfig);
}
var TokenExpiredError, cachedClientToken, REDIRECT_PORT, REDIRECT_URI, pendingLogin;
var init_auth = __esm({
  "src/genesys/auth.ts"() {
    "use strict";
    init_config();
    TokenExpiredError = class extends Error {
      constructor() {
        super("Your Genesys session has expired.");
        this.name = "TokenExpiredError";
      }
    };
    cachedClientToken = null;
    REDIRECT_PORT = 8787;
    REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
    pendingLogin = null;
  }
});

// src/genesys/client.ts
var client_exports = {};
__export(client_exports, {
  GenesysApiError: () => GenesysApiError,
  fetchWithRetry: () => fetchWithRetry,
  genesys: () => genesys
});
function retryDelayMs(headers, fallbackSecs = 30) {
  const raw = headers.get("retry-after");
  const secs = raw ? parseInt(raw, 10) : fallbackSecs;
  const base = isNaN(secs) ? fallbackSecs : secs;
  const jitter = Math.random() * base * 0.3;
  return Math.min((base + jitter) * 1e3, 65e3);
}
async function request(method, path3, body) {
  const config2 = getGenesysConfig();
  if (!config2) {
    throw new Error(
      "Genesys credentials not configured. Call login to authenticate, or set GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET, GENESYS_REGION environment variables for machine-to-machine auth."
    );
  }
  const MAX_RETRIES_429 = 4;
  const MAX_RETRIES_5XX = 2;
  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken(config2);
    const url = `${getBaseUrl(config2.region)}${path3}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    const resp = await fetch(url, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (resp.status === 429) {
      if (attempt >= MAX_RETRIES_429) {
        throw new GenesysApiError(429, path3, `Rate limited after ${MAX_RETRIES_429} retries.`);
      }
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] 429 on ${method} ${path3} \u2014 waiting ${(waitMs / 1e3).toFixed(1)}s (retry ${attempt + 1}/${MAX_RETRIES_429})`
      );
      await sleep(waitMs);
      continue;
    }
    if (resp.status >= 500 && resp.headers.has("retry-after")) {
      if (attempt >= MAX_RETRIES_5XX) {
        throw new GenesysApiError(resp.status, path3, `Server error after ${MAX_RETRIES_5XX} retries.`);
      }
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] ${resp.status} on ${method} ${path3} \u2014 waiting ${(waitMs / 1e3).toFixed(1)}s (retry ${attempt + 1}/${MAX_RETRIES_5XX})`
      );
      await sleep(waitMs);
      continue;
    }
    if (resp.status === 401) {
      const appConfig = loadConfig();
      if (appConfig.userToken) {
        appConfig.userToken = void 0;
        saveConfig(appConfig);
      }
      throw new TokenExpiredError();
    }
    if (!resp.ok) {
      const text = await resp.text();
      let message = text;
      try {
        const json2 = JSON.parse(text);
        message = json2.message ?? text;
        const detail = [json2.code, json2.correlationId && `correlationId ${json2.correlationId}`].filter(Boolean).join(", ");
        if (detail) message = `${message} (${detail})`;
      } catch {
      }
      throw new GenesysApiError(resp.status, path3, message);
    }
    if (resp.status === 204) return void 0;
    return resp.json();
  }
}
async function fetchWithRetry(url, init) {
  const MAX_RETRIES_429 = 4;
  const MAX_RETRIES_5XX = 2;
  const method = (init.method ?? "GET").toUpperCase();
  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(url, init);
    if (resp.status === 429) {
      if (attempt >= MAX_RETRIES_429) return resp;
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] 429 on ${method} ${url} \u2014 waiting ${(waitMs / 1e3).toFixed(1)}s (retry ${attempt + 1}/${MAX_RETRIES_429})`
      );
      await sleep(waitMs);
      continue;
    }
    if (resp.status >= 500 && resp.headers.has("retry-after")) {
      if (attempt >= MAX_RETRIES_5XX) return resp;
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] ${resp.status} on ${method} ${url} \u2014 waiting ${(waitMs / 1e3).toFixed(1)}s (retry ${attempt + 1}/${MAX_RETRIES_5XX})`
      );
      await sleep(waitMs);
      continue;
    }
    return resp;
  }
}
var GenesysApiError, sleep, genesys;
var init_client = __esm({
  "src/genesys/client.ts"() {
    "use strict";
    init_config();
    init_auth();
    GenesysApiError = class extends Error {
      constructor(status, path3, message) {
        super(`Genesys API error ${status} on ${path3}: ${message}`);
        this.status = status;
        this.path = path3;
        this.name = "GenesysApiError";
      }
      status;
      path;
    };
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    genesys = {
      get: (path3) => request("GET", path3),
      post: (path3, body) => request("POST", path3, body),
      put: (path3, body) => request("PUT", path3, body),
      patch: (path3, body) => request("PATCH", path3, body),
      delete: (path3) => request("DELETE", path3)
    };
  }
});

// node_modules/zod/v4/core/core.js
var NEVER = Object.freeze({
  status: "aborted"
});
// @__NO_SIDE_EFFECTS__
function $constructor(name, initializer3, params) {
  function init(inst, def) {
    var _a;
    Object.defineProperty(inst, "_zod", {
      value: inst._zod ?? {},
      enumerable: false
    });
    (_a = inst._zod).traits ?? (_a.traits = /* @__PURE__ */ new Set());
    inst._zod.traits.add(name);
    initializer3(inst, def);
    for (const k in _.prototype) {
      if (!(k in inst))
        Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
    }
    inst._zod.constr = _;
    inst._zod.def = def;
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
var globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// node_modules/zod/v4/core/util.js
var util_exports = {};
__export(util_exports, {
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
  Class: () => Class,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  aborted: () => aborted,
  allowsEval: () => allowsEval,
  assert: () => assert,
  assertEqual: () => assertEqual,
  assertIs: () => assertIs,
  assertNever: () => assertNever,
  assertNotEqual: () => assertNotEqual,
  assignProp: () => assignProp,
  cached: () => cached,
  captureStackTrace: () => captureStackTrace,
  cleanEnum: () => cleanEnum,
  cleanRegex: () => cleanRegex,
  clone: () => clone,
  createTransparentProxy: () => createTransparentProxy,
  defineLazy: () => defineLazy,
  esc: () => esc,
  escapeRegex: () => escapeRegex,
  extend: () => extend,
  finalizeIssue: () => finalizeIssue,
  floatSafeRemainder: () => floatSafeRemainder,
  getElementAtPath: () => getElementAtPath,
  getEnumValues: () => getEnumValues,
  getLengthableOrigin: () => getLengthableOrigin,
  getParsedType: () => getParsedType,
  getSizableOrigin: () => getSizableOrigin,
  isObject: () => isObject,
  isPlainObject: () => isPlainObject,
  issue: () => issue,
  joinValues: () => joinValues,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  merge: () => merge,
  normalizeParams: () => normalizeParams,
  nullish: () => nullish,
  numKeys: () => numKeys,
  omit: () => omit,
  optionalKeys: () => optionalKeys,
  partial: () => partial,
  pick: () => pick,
  prefixIssues: () => prefixIssues,
  primitiveTypes: () => primitiveTypes,
  promiseAllObject: () => promiseAllObject,
  propertyKeyTypes: () => propertyKeyTypes,
  randomString: () => randomString,
  required: () => required,
  stringifyPrimitive: () => stringifyPrimitive,
  unwrapMessage: () => unwrapMessage
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {
}
function assertNever(_x) {
  throw new Error();
}
function assert(_) {
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array2, separator = "|") {
  return array2.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function defineLazy(object3, key, getter) {
  const set = false;
  Object.defineProperty(object3, key, {
    get() {
      if (!set) {
        const value = getter();
        object3[key] = value;
        return value;
      }
      throw new Error("cached value already set");
    },
    set(v) {
      Object.defineProperty(object3, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function getElementAtPath(obj, path3) {
  if (!path3)
    return obj;
  return path3.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str2 = "";
  for (let i = 0; i < length; i++) {
    str2 += chars[Math.floor(Math.random() * chars.length)];
  }
  return str2;
}
function esc(str2) {
  return JSON.stringify(str2);
}
var captureStackTrace = Error.captureStackTrace ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = cached(() => {
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
};
var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
var primitiveTypes = /* @__PURE__ */ new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str2) {
  return str2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
var BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const newShape = {};
  const currDef = schema._zod.def;
  for (const key in mask) {
    if (!(key in currDef.shape)) {
      throw new Error(`Unrecognized key: "${key}"`);
    }
    if (!mask[key])
      continue;
    newShape[key] = currDef.shape[key];
  }
  return clone(schema, {
    ...schema._zod.def,
    shape: newShape,
    checks: []
  });
}
function omit(schema, mask) {
  const newShape = { ...schema._zod.def.shape };
  const currDef = schema._zod.def;
  for (const key in mask) {
    if (!(key in currDef.shape)) {
      throw new Error(`Unrecognized key: "${key}"`);
    }
    if (!mask[key])
      continue;
    delete newShape[key];
  }
  return clone(schema, {
    ...schema._zod.def,
    shape: newShape,
    checks: []
  });
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const def = {
    ...schema._zod.def,
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: []
    // delete existing checks
  };
  return clone(schema, def);
}
function merge(a, b) {
  return clone(a, {
    ...a._zod.def,
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    catchall: b._zod.def.catchall,
    checks: []
    // delete existing checks
  });
}
function partial(Class2, schema, mask) {
  const oldShape = schema._zod.def.shape;
  const shape = { ...oldShape };
  if (mask) {
    for (const key in mask) {
      if (!(key in oldShape)) {
        throw new Error(`Unrecognized key: "${key}"`);
      }
      if (!mask[key])
        continue;
      shape[key] = Class2 ? new Class2({
        type: "optional",
        innerType: oldShape[key]
      }) : oldShape[key];
    }
  } else {
    for (const key in oldShape) {
      shape[key] = Class2 ? new Class2({
        type: "optional",
        innerType: oldShape[key]
      }) : oldShape[key];
    }
  }
  return clone(schema, {
    ...schema._zod.def,
    shape,
    checks: []
  });
}
function required(Class2, schema, mask) {
  const oldShape = schema._zod.def.shape;
  const shape = { ...oldShape };
  if (mask) {
    for (const key in mask) {
      if (!(key in shape)) {
        throw new Error(`Unrecognized key: "${key}"`);
      }
      if (!mask[key])
        continue;
      shape[key] = new Class2({
        type: "nonoptional",
        innerType: oldShape[key]
      });
    }
  } else {
    for (const key in oldShape) {
      shape[key] = new Class2({
        type: "nonoptional",
        innerType: oldShape[key]
      });
    }
  }
  return clone(schema, {
    ...schema._zod.def,
    shape,
    // optional: [],
    checks: []
  });
}
function aborted(x, startIndex = 0) {
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true)
      return true;
  }
  return false;
}
function prefixIssues(path3, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path3);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
var Class = class {
  constructor(..._args) {
  }
};

// node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  Object.defineProperty(inst, "message", {
    get() {
      return JSON.stringify(def, jsonStringifyReplacer, 2);
    },
    enumerable: true
    // configurable: false,
  });
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error2.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error2, _mapper) {
  const mapper = _mapper || function(issue2) {
    return issue2.message;
  };
  const fieldErrors = { _errors: [] };
  const processError = (error3) => {
    for (const issue2 of error3.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error2);
  return fieldErrors;
}

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);

// node_modules/zod/v4/core/regexes.js
var cuid = /^[cC][^\s-]{8,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/;
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var hostname = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;
var e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time3 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-]\\d{2}:\\d{2})`);
  const timeRegex = `${time3}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var integer = /^\d+$/;
var number = /^-?\d+(?:\.\d+)?/i;
var boolean = /true|false/i;
var _null = /null/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;

// node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a;
    (_a = inst2._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inst
      });
    }
  };
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a = inst._zod).check ?? (_a.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// node_modules/zod/v4/core/doc.js
var Doc = class {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join("\n"));
  }
};

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 0,
  patch: 0
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    inst._zod.run = (payload, ctx) => {
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  inst["~standard"] = {
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  };
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const orig = payload.value;
      const url = new URL(orig);
      const href = url.href;
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (!orig.endsWith("/") && href.endsWith("/")) {
        payload.value = href.slice(0, -1);
      } else {
        payload.value = href;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date);
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = `ipv4`;
  });
});
var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = `ipv6`;
  });
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const [address, prefix] = payload.value.split("/");
    try {
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.contentEncoding = "base64";
  });
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.contentEncoding = "base64url";
  });
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null;
  inst._zod.values = /* @__PURE__ */ new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handleObjectResult(result, final, key) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(key, result.issues));
  }
  final.value[key] = result.value;
}
function handleOptionalObjectResult(result, final, key, input) {
  if (result.issues.length) {
    if (input[key] === void 0) {
      if (key in input) {
        final.value[key] = void 0;
      } else {
        final.value[key] = result.value;
      }
    } else {
      final.issues.push(...prefixIssues(key, result.issues));
    }
  } else if (result.value === void 0) {
    if (key in input)
      final.value[key] = void 0;
  } else {
    final.value[key] = result.value;
  }
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const _normalized = cached(() => {
    const keys = Object.keys(def.shape);
    for (const k of keys) {
      if (!(def.shape[k] instanceof $ZodType)) {
        throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
      }
    }
    const okeys = optionalKeys(def.shape);
    return {
      shape: def.shape,
      keys,
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(okeys)
    };
  });
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {}`);
    for (const key of normalized.keys) {
      if (normalized.optionalKeys.has(key)) {
        const id = ids[key];
        doc.write(`const ${id} = ${parseStr(key)};`);
        const k = esc(key);
        doc.write(`
        if (${id}.issues.length) {
          if (input[${k}] === undefined) {
            if (${k} in input) {
              newResult[${k}] = undefined;
            }
          } else {
            payload.issues = payload.issues.concat(
              ${id}.issues.map((iss) => ({
                ...iss,
                path: iss.path ? [${k}, ...iss.path] : [${k}],
              }))
            );
          }
        } else if (${id}.value === undefined) {
          if (${k} in input) newResult[${k}] = undefined;
        } else {
          newResult[${k}] = ${id}.value;
        }
        `);
      } else {
        const id = ids[key];
        doc.write(`const ${id} = ${parseStr(key)};`);
        doc.write(`
          if (${id}.issues.length) payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${esc(key)}, ...iss.path] : [${esc(key)}]
          })));`);
        doc.write(`newResult[${esc(key)}] = ${id}.value`);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
    } else {
      payload.value = {};
      const shape = value.shape;
      for (const key of value.keys) {
        const el = shape[key];
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        const isOptional = el._zod.optin === "optional" && el._zod.optout === "optional";
        if (r instanceof Promise) {
          proms.push(r.then((r2) => isOptional ? handleOptionalObjectResult(r2, payload, key, input) : handleObjectResult(r2, payload, key)));
        } else if (isOptional) {
          handleOptionalObjectResult(r, payload, key, input);
        } else {
          handleObjectResult(r, payload, key);
        }
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    const unrecognized = [];
    const keySet = value.keySet;
    const _catchall = catchall._zod;
    const t = _catchall.def.type;
    for (const key of Object.keys(input)) {
      if (keySet.has(key))
        continue;
      if (t === "never") {
        unrecognized.push(key);
        continue;
      }
      const r = _catchall.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handleObjectResult(r2, payload, key)));
      } else {
        handleObjectResult(r, payload, key);
      }
    }
    if (unrecognized.length) {
      payload.issues.push({
        code: "unrecognized_keys",
        keys: unrecognized,
        input,
        inst
      });
    }
    if (!proms.length)
      return payload;
    return Promise.all(proms).then(() => {
      return payload;
    });
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazy(inst._zod, "propValues", () => {
    const propValues = {};
    for (const option of def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (const [k, v] of Object.entries(pv)) {
        if (!propValues[k])
          propValues[k] = /* @__PURE__ */ new Set();
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    return propValues;
  });
  const disc = cached(() => {
    const opts = def.options;
    const map = /* @__PURE__ */ new Map();
    for (const o of opts) {
      const values = o._zod.propValues[def.discriminator];
      if (!values || values.size === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
      for (const v of values) {
        if (map.has(v)) {
          throw new Error(`Duplicate discriminator value "${String(v)}"`);
        }
        map.set(v, o);
      }
    }
    return map;
  });
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const opt = disc.value.get(input?.[def.discriminator]);
    if (opt) {
      return opt._zod.run(payload, ctx);
    }
    if (def.unionFallback) {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  if (left.issues.length) {
    result.issues.push(...left.issues);
  }
  if (right.issues.length) {
    result.issues.push(...right.issues);
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    if (def.keyType._zod.values) {
      const values = def.keyType._zod.values;
      payload.value = {};
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[key] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[key] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!values.has(key)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        if (keyResult.issues.length) {
          payload.issues.push({
            origin: "record",
            code: "invalid_key",
            issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
            input: key,
            path: [key],
            inst
          });
          payload.value[keyResult.value] = keyResult.value;
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  inst._zod.values = new Set(values);
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (inst._zod.values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.values = new Set(def.values);
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? o.toString() : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (inst._zod.values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const _out = def.transform(payload.value, payload);
    if (_ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    return payload;
  };
});
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
    }
    return payload;
  };
});
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  inst._zod.parse = (payload, ctx) => {
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def, ctx));
    }
    return handlePipeResult(left, def, ctx);
  };
});
function handlePipeResult(left, def, ctx) {
  if (aborted(left)) {
    return left;
  }
  return def.out._zod.run({ value: left.value, issues: left.issues }, ctx);
}
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}

// node_modules/zod/v4/locales/en.js
var parsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "number";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Invalid input: expected ${issue2.expected}, received ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en_default() {
  return {
    localeError: error()
  };
}

// node_modules/zod/v4/core/registries.js
var $ZodRegistry = class {
  constructor() {
    this._map = /* @__PURE__ */ new Map();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      if (this._idmap.has(meta.id)) {
        throw new Error(`ID ${meta.id} already exists in the registry`);
      }
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new Map();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      return { ...pm, ...this._map.get(schema) };
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
};
function registry() {
  return new $ZodRegistry();
}
var globalRegistry = /* @__PURE__ */ registry();

// node_modules/zod/v4/core/api.js
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/zod-compat.js
function isZ4Schema(s) {
  const schema = s;
  return !!schema._zod;
}
function safeParse2(schema, data) {
  if (isZ4Schema(schema)) {
    const result2 = safeParse(schema, data);
    return result2;
  }
  const v3Schema = schema;
  const result = v3Schema.safeParse(data);
  return result;
}
function getObjectShape(schema) {
  if (!schema)
    return void 0;
  let rawShape;
  if (isZ4Schema(schema)) {
    const v4Schema = schema;
    rawShape = v4Schema._zod?.def?.shape;
  } else {
    const v3Schema = schema;
    rawShape = v3Schema.shape;
  }
  if (!rawShape)
    return void 0;
  if (typeof rawShape === "function") {
    try {
      return rawShape();
    } catch {
      return void 0;
    }
  }
  return rawShape;
}
function getLiteralValue(schema) {
  if (isZ4Schema(schema)) {
    const v4Schema = schema;
    const def2 = v4Schema._zod?.def;
    if (def2) {
      if (def2.value !== void 0)
        return def2.value;
      if (Array.isArray(def2.values) && def2.values.length > 0) {
        return def2.values[0];
      }
    }
  }
  const v3Schema = schema;
  const def = v3Schema._def;
  if (def) {
    if (def.value !== void 0)
      return def.value;
    if (Array.isArray(def.values) && def.values.length > 0) {
      return def.values[0];
    }
  }
  const directValue = schema.value;
  if (directValue !== void 0)
    return directValue;
  return void 0;
}

// node_modules/zod/v4/classic/iso.js
var iso_exports = {};
__export(iso_exports, {
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  date: () => date2,
  datetime: () => datetime2,
  duration: () => duration2,
  time: () => time2
});
var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date2(params) {
  return _isoDate(ZodISODate, params);
}
var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}

// node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => inst.issues.push(issue2)
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => inst.issues.push(...issues2)
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
var ZodError = $constructor("ZodError", initializer2);
var ZodRealError = $constructor("ZodError", initializer2, {
  Parent: Error
});

// node_modules/zod/v4/classic/parse.js
var parse2 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse3 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);

// node_modules/zod/v4/classic/schemas.js
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  inst.def = def;
  Object.defineProperty(inst, "_def", { value: def });
  inst.check = (...checks) => {
    return inst.clone(
      {
        ...def,
        checks: [
          ...def.checks ?? [],
          ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }
      // { parent: true }
    );
  };
  inst.clone = (def2, params) => clone(inst, def2, params);
  inst.brand = () => inst;
  inst.register = ((reg, meta) => {
    reg.add(inst, meta);
    return inst;
  });
  inst.parse = (data, params) => parse2(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse3(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.refine = (check2, params) => inst.check(refine(check2, params));
  inst.superRefine = (refinement) => inst.check(superRefine(refinement));
  inst.overwrite = (fn) => inst.check(_overwrite(fn));
  inst.optional = () => optional(inst);
  inst.nullable = () => nullable(inst);
  inst.nullish = () => optional(nullable(inst));
  inst.nonoptional = (params) => nonoptional(inst, params);
  inst.array = () => array(inst);
  inst.or = (arg) => union([inst, arg]);
  inst.and = (arg) => intersection(inst, arg);
  inst.transform = (tx) => pipe(inst, transform(tx));
  inst.default = (def2) => _default(inst, def2);
  inst.prefault = (def2) => prefault(inst, def2);
  inst.catch = (params) => _catch(inst, params);
  inst.pipe = (target) => pipe(inst, target);
  inst.readonly = () => readonly(inst);
  inst.describe = (description) => {
    const cl = inst.clone();
    globalRegistry.add(cl, { description });
    return cl;
  };
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  inst.meta = (...args) => {
    if (args.length === 0) {
      return globalRegistry.get(inst);
    }
    const cl = inst.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  };
  inst.isOptional = () => inst.safeParse(void 0).success;
  inst.isNullable = () => inst.safeParse(null).success;
  return inst;
});
var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  inst.regex = (...args) => inst.check(_regex(...args));
  inst.includes = (...args) => inst.check(_includes(...args));
  inst.startsWith = (...args) => inst.check(_startsWith(...args));
  inst.endsWith = (...args) => inst.check(_endsWith(...args));
  inst.min = (...args) => inst.check(_minLength(...args));
  inst.max = (...args) => inst.check(_maxLength(...args));
  inst.length = (...args) => inst.check(_length(...args));
  inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
  inst.lowercase = (params) => inst.check(_lowercase(params));
  inst.uppercase = (params) => inst.check(_uppercase(params));
  inst.trim = () => inst.check(_trim());
  inst.normalize = (...args) => inst.check(_normalize(...args));
  inst.toLowerCase = () => inst.check(_toLowerCase());
  inst.toUpperCase = () => inst.check(_toUpperCase());
});
var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(_email(ZodEmail, params));
  inst.url = (params) => inst.check(_url(ZodURL, params));
  inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(_xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(_e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime2(params));
  inst.date = (params) => inst.check(date2(params));
  inst.time = (params) => inst.check(time2(params));
  inst.duration = (params) => inst.check(duration2(params));
});
function string2(params) {
  return _string(ZodString, params);
}
var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.int = (params) => inst.check(int(params));
  inst.safe = (params) => inst.check(int(params));
  inst.positive = (params) => inst.check(_gt(0, params));
  inst.nonnegative = (params) => inst.check(_gte(0, params));
  inst.negative = (params) => inst.check(_lt(0, params));
  inst.nonpositive = (params) => inst.check(_lte(0, params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  inst.step = (value, params) => inst.check(_multipleOf(value, params));
  inst.finite = () => inst;
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
});
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
});
function _null3(params) {
  return _null2(ZodNull, params);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
  inst.nonempty = (params) => inst.check(_minLength(1, params));
  inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
  inst.length = (len, params) => inst.check(_length(len, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObject.init(inst, def);
  ZodType.init(inst, def);
  util_exports.defineLazy(inst, "shape", () => def.shape);
  inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
  inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
  inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
  inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
  inst.extend = (incoming) => {
    return util_exports.extend(inst, incoming);
  };
  inst.merge = (other) => util_exports.merge(inst, other);
  inst.pick = (mask) => util_exports.pick(inst, mask);
  inst.omit = (mask) => util_exports.omit(inst, mask);
  inst.partial = (...args) => util_exports.partial(ZodOptional, inst, args[0]);
  inst.required = (...args) => util_exports.required(ZodNonOptional, inst, args[0]);
});
function object2(shape, params) {
  const def = {
    type: "object",
    get shape() {
      util_exports.assignProp(this, "shape", { ...shape });
      return this.shape;
    },
    ...util_exports.normalizeParams(params)
  };
  return new ZodObject(def);
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    get shape() {
      util_exports.assignProp(this, "shape", { ...shape });
      return this.shape;
    },
    catchall: unknown(),
    ...util_exports.normalizeParams(params)
  });
}
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...util_exports.normalizeParams(params)
  });
}
var ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...util_exports.normalizeParams(params)
  });
}
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...util_exports.normalizeParams(params)
  });
}
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(util_exports.issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        _issue.continue ?? (_issue.continue = true);
        payload.issues.push(util_exports.issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    payload.value = output;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    }
  });
}
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    }
  });
}
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
});
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
    // ...util.normalizeParams(params),
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  const ch = check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(util_exports.issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(util_exports.issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
function preprocess(fn, schema) {
  return pipe(transform(fn), schema);
}

// node_modules/zod/v4/classic/external.js
config(en_default());

// node_modules/@modelcontextprotocol/sdk/dist/esm/types.js
var LATEST_PROTOCOL_VERSION = "2025-11-25";
var SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var JSONRPC_VERSION = "2.0";
var AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
var ProgressTokenSchema = union([string2(), number2().int()]);
var CursorSchema = string2();
var TaskCreationParamsSchema = looseObject({
  /**
   * Requested duration in milliseconds to retain task from creation.
   */
  ttl: number2().optional(),
  /**
   * Time in milliseconds to wait between task status requests.
   */
  pollInterval: number2().optional()
});
var TaskMetadataSchema = object2({
  ttl: number2().optional()
});
var RelatedTaskMetadataSchema = object2({
  taskId: string2()
});
var RequestMetaSchema = looseObject({
  /**
   * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
   */
  progressToken: ProgressTokenSchema.optional(),
  /**
   * If specified, this request is related to the provided task.
   */
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
var BaseRequestParamsSchema = object2({
  /**
   * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
   */
  _meta: RequestMetaSchema.optional()
});
var TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * If specified, the caller is requesting task-augmented execution for this request.
   * The request will return a CreateTaskResult immediately, and the actual result can be
   * retrieved later via tasks/result.
   *
   * Task augmentation is subject to capability negotiation - receivers MUST declare support
   * for task augmentation of specific request types in their capabilities.
   */
  task: TaskMetadataSchema.optional()
});
var isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
var RequestSchema = object2({
  method: string2(),
  params: BaseRequestParamsSchema.loose().optional()
});
var NotificationsParamsSchema = object2({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var NotificationSchema = object2({
  method: string2(),
  params: NotificationsParamsSchema.loose().optional()
});
var ResultSchema = looseObject({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var RequestIdSchema = union([string2(), number2().int()]);
var JSONRPCRequestSchema = object2({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape
}).strict();
var isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
var JSONRPCNotificationSchema = object2({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape
}).strict();
var isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
var JSONRPCResultResponseSchema = object2({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
  ErrorCode2[ErrorCode2["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
})(ErrorCode || (ErrorCode = {}));
var JSONRPCErrorResponseSchema = object2({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: object2({
    /**
     * The error type that occurred.
     */
    code: number2().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string2(),
    /**
     * Additional information about the error. The value of this customer is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: unknown().optional()
  })
}).strict();
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
var JSONRPCMessageSchema = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema
]);
var JSONRPCResponseSchema = union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the request to cancel.
   *
   * This MUST correspond to the ID of a request previously issued in the same direction.
   */
  requestId: RequestIdSchema.optional(),
  /**
   * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
   */
  reason: string2().optional()
});
var CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema
});
var IconSchema = object2({
  /**
   * URL or data URI for the icon.
   */
  src: string2(),
  /**
   * Optional MIME type for the icon.
   */
  mimeType: string2().optional(),
  /**
   * Optional array of strings that specify sizes at which the icon can be used.
   * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
   *
   * If not provided, the client should assume that the icon can be used at any size.
   */
  sizes: array(string2()).optional(),
  /**
   * Optional specifier for the theme this icon is designed for. `light` indicates
   * the icon is designed to be used with a light background, and `dark` indicates
   * the icon is designed to be used with a dark background.
   *
   * If not provided, the client should assume the icon can be used with any theme.
   */
  theme: _enum(["light", "dark"]).optional()
});
var IconsSchema = object2({
  /**
   * Optional set of sized icons that the client can display in a user interface.
   *
   * Clients that support rendering icons MUST support at least the following MIME types:
   * - `image/png` - PNG images (safe, universal compatibility)
   * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
   *
   * Clients that support rendering icons SHOULD also support:
   * - `image/svg+xml` - SVG images (scalable but requires security precautions)
   * - `image/webp` - WebP images (modern, efficient format)
   */
  icons: array(IconSchema).optional()
});
var BaseMetadataSchema = object2({
  /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
  name: string2(),
  /**
   * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
   * even by those unfamiliar with domain-specific terminology.
   *
   * If not provided, the name should be used for display (except for Tool,
   * where `annotations.title` should be given precedence over using `name`,
   * if present).
   */
  title: string2().optional()
});
var ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string2(),
  /**
   * An optional URL of the website for this implementation.
   */
  websiteUrl: string2().optional(),
  /**
   * An optional human-readable description of what this implementation does.
   *
   * This can be used by clients or servers to provide context about their purpose
   * and capabilities. For example, a server might describe the types of resources
   * or tools it provides, while a client might describe its intended use case.
   */
  description: string2().optional()
});
var FormElicitationCapabilitySchema = intersection(object2({
  applyDefaults: boolean2().optional()
}), record(string2(), unknown()));
var ElicitationCapabilitySchema = preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) {
      return { form: {} };
    }
  }
  return value;
}, intersection(object2({
  form: FormElicitationCapabilitySchema.optional(),
  url: AssertObjectSchema.optional()
}), record(string2(), unknown()).optional()));
var ClientTasksCapabilitySchema = looseObject({
  /**
   * Present if the client supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the client supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for sampling requests.
     */
    sampling: looseObject({
      createMessage: AssertObjectSchema.optional()
    }).optional(),
    /**
     * Task support for elicitation requests.
     */
    elicitation: looseObject({
      create: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ServerTasksCapabilitySchema = looseObject({
  /**
   * Present if the server supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the server supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for tool requests.
     */
    tools: looseObject({
      call: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ClientCapabilitiesSchema = object2({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: record(string2(), AssertObjectSchema).optional(),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: object2({
    /**
     * Present if the client supports context inclusion via includeContext parameter.
     * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
     */
    context: AssertObjectSchema.optional(),
    /**
     * Present if the client supports tool use via tools and toolChoice parameters.
     */
    tools: AssertObjectSchema.optional()
  }).optional(),
  /**
   * Present if the client supports eliciting user input.
   */
  elicitation: ElicitationCapabilitySchema.optional(),
  /**
   * Present if the client supports listing roots.
   */
  roots: object2({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: boolean2().optional()
  }).optional(),
  /**
   * Present if the client supports task creation.
   */
  tasks: ClientTasksCapabilitySchema.optional(),
  /**
   * Extensions that the client supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string2(), AssertObjectSchema).optional()
});
var InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
   */
  protocolVersion: string2(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema
});
var InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema
});
var ServerCapabilitiesSchema = object2({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: record(string2(), AssertObjectSchema).optional(),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: AssertObjectSchema.optional(),
  /**
   * Present if the server supports sending completions to the client.
   */
  completions: AssertObjectSchema.optional(),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: object2({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: boolean2().optional()
  }).optional(),
  /**
   * Present if the server offers any resources to read.
   */
  resources: object2({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: boolean2().optional(),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: boolean2().optional()
  }).optional(),
  /**
   * Present if the server offers any tools to call.
   */
  tools: object2({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: boolean2().optional()
  }).optional(),
  /**
   * Present if the server supports task creation.
   */
  tasks: ServerTasksCapabilitySchema.optional(),
  /**
   * Extensions that the server supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string2(), AssertObjectSchema).optional()
});
var InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: string2(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: string2().optional()
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional()
});
var PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional()
});
var ProgressSchema = object2({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: number2(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: optional(number2()),
  /**
   * An optional message describing the current progress.
   */
  message: optional(string2())
});
var ProgressNotificationParamsSchema = object2({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  /**
   * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
   */
  progressToken: ProgressTokenSchema
});
var ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema
});
var PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * An opaque token representing the current pagination position.
   * If provided, the server should return results starting after this cursor.
   */
  cursor: CursorSchema.optional()
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional()
});
var PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: CursorSchema.optional()
});
var TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
var TaskSchema = object2({
  taskId: string2(),
  status: TaskStatusSchema,
  /**
   * Time in milliseconds to keep task results available after completion.
   * If null, the task has unlimited lifetime until manually cleaned up.
   */
  ttl: union([number2(), _null3()]),
  /**
   * ISO 8601 timestamp when the task was created.
   */
  createdAt: string2(),
  /**
   * ISO 8601 timestamp when the task was last updated.
   */
  lastUpdatedAt: string2(),
  pollInterval: optional(number2()),
  /**
   * Optional diagnostic message for failed tasks or other status information.
   */
  statusMessage: optional(string2())
});
var CreateTaskResultSchema = ResultSchema.extend({
  task: TaskSchema
});
var TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
var TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema
});
var GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({
    taskId: string2()
  })
});
var GetTaskResultSchema = ResultSchema.merge(TaskSchema);
var GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({
    taskId: string2()
  })
});
var GetTaskPayloadResultSchema = ResultSchema.loose();
var ListTasksRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tasks/list")
});
var ListTasksResultSchema = PaginatedResultSchema.extend({
  tasks: array(TaskSchema)
});
var CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({
    taskId: string2()
  })
});
var CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
var ResourceContentsSchema = object2({
  /**
   * The URI of this resource.
   */
  uri: string2(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string2()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: string2()
});
var Base64Schema = string2().refine((val) => {
  try {
    atob(val);
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: Base64Schema
});
var RoleSchema = _enum(["user", "assistant"]);
var AnnotationsSchema = object2({
  /**
   * Intended audience(s) for the resource.
   */
  audience: array(RoleSchema).optional(),
  /**
   * Importance hint for the resource, from 0 (least) to 1 (most).
   */
  priority: number2().min(0).max(1).optional(),
  /**
   * ISO 8601 timestamp for the most recent modification.
   */
  lastModified: iso_exports.datetime({ offset: true }).optional()
});
var ResourceSchema = object2({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * The URI of this resource.
   */
  uri: string2(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string2()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string2()),
  /**
   * The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.
   *
   * This can be used by Hosts to display file sizes and estimate context window usage.
   */
  size: optional(number2()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ResourceTemplateSchema = object2({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: string2(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string2()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: optional(string2()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/list")
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: array(ResourceSchema)
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/templates/list")
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: array(ResourceTemplateSchema)
});
var ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
   *
   * @format uri
   */
  uri: string2()
});
var ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
var ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema
});
var UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   */
  uri: string2()
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema
});
var PromptArgumentSchema = object2({
  /**
   * The name of the argument.
   */
  name: string2(),
  /**
   * A human-readable description of the argument.
   */
  description: optional(string2()),
  /**
   * Whether this argument must be provided.
   */
  required: optional(boolean2())
});
var PromptSchema = object2({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * An optional description of what this prompt provides
   */
  description: optional(string2()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: optional(array(PromptArgumentSchema)),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("prompts/list")
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: array(PromptSchema)
});
var GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The name of the prompt or prompt template.
   */
  name: string2(),
  /**
   * Arguments to use for templating the prompt.
   */
  arguments: record(string2(), string2()).optional()
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema
});
var TextContentSchema = object2({
  type: literal("text"),
  /**
   * The text content of the message.
   */
  text: string2(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var ImageContentSchema = object2({
  type: literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: string2(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var AudioContentSchema = object2({
  type: literal("audio"),
  /**
   * The base64-encoded audio data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the audio. Different providers may support different audio types.
   */
  mimeType: string2(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var ToolUseContentSchema = object2({
  type: literal("tool_use"),
  /**
   * The name of the tool to invoke.
   * Must match a tool name from the request's tools array.
   */
  name: string2(),
  /**
   * Unique identifier for this tool call.
   * Used to correlate with ToolResultContent in subsequent messages.
   */
  id: string2(),
  /**
   * Arguments to pass to the tool.
   * Must conform to the tool's inputSchema.
   */
  input: record(string2(), unknown()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var EmbeddedResourceSchema = object2({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var ResourceLinkSchema = ResourceSchema.extend({
  type: literal("resource_link")
});
var ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
]);
var PromptMessageSchema = object2({
  role: RoleSchema,
  content: ContentBlockSchema
});
var GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: string2().optional(),
  messages: array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ToolAnnotationsSchema = object2({
  /**
   * A human-readable title for the tool.
   */
  title: string2().optional(),
  /**
   * If true, the tool does not modify its environment.
   *
   * Default: false
   */
  readOnlyHint: boolean2().optional(),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: true
   */
  destructiveHint: boolean2().optional(),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: false
   */
  idempotentHint: boolean2().optional(),
  /**
   * If true, this tool may interact with an "open world" of external
   * entities. If false, the tool's domain of interaction is closed.
   * For example, the world of a web search tool is open, whereas that
   * of a memory tool is not.
   *
   * Default: true
   */
  openWorldHint: boolean2().optional()
});
var ToolExecutionSchema = object2({
  /**
   * Indicates the tool's preference for task-augmented execution.
   * - "required": Clients MUST invoke the tool as a task
   * - "optional": Clients MAY invoke the tool as a task or normal request
   * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
   *
   * If not present, defaults to "forbidden".
   */
  taskSupport: _enum(["required", "optional", "forbidden"]).optional()
});
var ToolSchema = object2({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A human-readable description of the tool.
   */
  description: string2().optional(),
  /**
   * A JSON Schema 2020-12 object defining the expected parameters for the tool.
   * Must have type: 'object' at the root level per MCP spec.
   */
  inputSchema: object2({
    type: literal("object"),
    properties: record(string2(), AssertObjectSchema).optional(),
    required: array(string2()).optional()
  }).catchall(unknown()),
  /**
   * An optional JSON Schema 2020-12 object defining the structure of the tool's output
   * returned in the structuredContent field of a CallToolResult.
   * Must have type: 'object' at the root level per MCP spec.
   */
  outputSchema: object2({
    type: literal("object"),
    properties: record(string2(), AssertObjectSchema).optional(),
    required: array(string2()).optional()
  }).catchall(unknown()).optional(),
  /**
   * Optional additional tool information.
   */
  annotations: ToolAnnotationsSchema.optional(),
  /**
   * Execution-related properties for this tool.
   */
  execution: ToolExecutionSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tools/list")
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: array(ToolSchema)
});
var CallToolResultSchema = ResultSchema.extend({
  /**
   * A list of content objects that represent the result of the tool call.
   *
   * If the Tool does not define an outputSchema, this field MUST be present in the result.
   * For backwards compatibility, this field is always present, but it may be empty.
   */
  content: array(ContentBlockSchema).default([]),
  /**
   * An object containing structured tool output.
   *
   * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
   */
  structuredContent: record(string2(), unknown()).optional(),
  /**
   * Whether the tool call ended in an error.
   *
   * If not set, this is assumed to be false (the call was successful).
   *
   * Any errors that originate from the tool SHOULD be reported inside the result
   * object, with `isError` set to true, _not_ as an MCP protocol-level error
   * response. Otherwise, the LLM would not be able to see that an error occurred
   * and self-correct.
   *
   * However, any errors in _finding_ the tool, an error indicating that the
   * server does not support tool calls, or any other exceptional conditions,
   * should be reported as an MCP error response.
   */
  isError: boolean2().optional()
});
var CompatibilityCallToolResultSchema = CallToolResultSchema.or(ResultSchema.extend({
  toolResult: unknown()
}));
var CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The name of the tool to call.
   */
  name: string2(),
  /**
   * Arguments to pass to the tool.
   */
  arguments: record(string2(), unknown()).optional()
});
var CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ListChangedOptionsBaseSchema = object2({
  /**
   * If true, the list will be refreshed automatically when a list changed notification is received.
   * The callback will be called with the updated list.
   *
   * If false, the callback will be called with null items, allowing manual refresh.
   *
   * @default true
   */
  autoRefresh: boolean2().default(true),
  /**
   * Debounce time in milliseconds for list changed notification processing.
   *
   * Multiple notifications received within this timeframe will only trigger one refresh.
   * Set to 0 to disable debouncing.
   *
   * @default 300
   */
  debounceMs: number2().int().nonnegative().default(300)
});
var LoggingLevelSchema = _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
var SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
   */
  level: LoggingLevelSchema
});
var SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema
});
var LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The severity of this log message.
   */
  level: LoggingLevelSchema,
  /**
   * An optional name of the logger issuing this message.
   */
  logger: string2().optional(),
  /**
   * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
   */
  data: unknown()
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema
});
var ModelHintSchema = object2({
  /**
   * A hint for a model name.
   */
  name: string2().optional()
});
var ModelPreferencesSchema = object2({
  /**
   * Optional hints to use for model selection.
   */
  hints: array(ModelHintSchema).optional(),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: number2().min(0).max(1).optional(),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: number2().min(0).max(1).optional(),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: number2().min(0).max(1).optional()
});
var ToolChoiceSchema = object2({
  /**
   * Controls when tools are used:
   * - "auto": Model decides whether to use tools (default)
   * - "required": Model MUST use at least one tool before completing
   * - "none": Model MUST NOT use any tools
   */
  mode: _enum(["auto", "required", "none"]).optional()
});
var ToolResultContentSchema = object2({
  type: literal("tool_result"),
  toolUseId: string2().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: object2({}).loose().optional(),
  isError: boolean2().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var SamplingContentSchema = discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]);
var SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema
]);
var SamplingMessageSchema = object2({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  /**
   * The server's preferences for which model to select. The client MAY modify or omit this request.
   */
  modelPreferences: ModelPreferencesSchema.optional(),
  /**
   * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
   */
  systemPrompt: string2().optional(),
  /**
   * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
   * The client MAY ignore this request.
   *
   * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
   * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
   */
  includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
  temperature: number2().optional(),
  /**
   * The requested maximum number of tokens to sample (to prevent runaway completions).
   *
   * The client MAY choose to sample fewer tokens than the requested maximum.
   */
  maxTokens: number2().int(),
  stopSequences: array(string2()).optional(),
  /**
   * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
   */
  metadata: AssertObjectSchema.optional(),
  /**
   * Tools that the model may use during generation.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   */
  tools: array(ToolSchema).optional(),
  /**
   * Controls how the model uses tools.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   * Default is `{ mode: "auto" }`.
   */
  toolChoice: ToolChoiceSchema.optional()
});
var CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema
});
var CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string2(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string2())),
  role: RoleSchema,
  /**
   * Response content. Single content block (text, image, or audio).
   */
  content: SamplingContentSchema
});
var CreateMessageResultWithToolsSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string2(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   * - "toolUse": The model wants to use one or more tools
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string2())),
  role: RoleSchema,
  /**
   * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
   */
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
var BooleanSchemaSchema = object2({
  type: literal("boolean"),
  title: string2().optional(),
  description: string2().optional(),
  default: boolean2().optional()
});
var StringSchemaSchema = object2({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  minLength: number2().optional(),
  maxLength: number2().optional(),
  format: _enum(["email", "uri", "date", "date-time"]).optional(),
  default: string2().optional()
});
var NumberSchemaSchema = object2({
  type: _enum(["number", "integer"]),
  title: string2().optional(),
  description: string2().optional(),
  minimum: number2().optional(),
  maximum: number2().optional(),
  default: number2().optional()
});
var UntitledSingleSelectEnumSchemaSchema = object2({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  enum: array(string2()),
  default: string2().optional()
});
var TitledSingleSelectEnumSchemaSchema = object2({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  oneOf: array(object2({
    const: string2(),
    title: string2()
  })),
  default: string2().optional()
});
var LegacyTitledEnumSchemaSchema = object2({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  enum: array(string2()),
  enumNames: array(string2()).optional(),
  default: string2().optional()
});
var SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
var UntitledMultiSelectEnumSchemaSchema = object2({
  type: literal("array"),
  title: string2().optional(),
  description: string2().optional(),
  minItems: number2().optional(),
  maxItems: number2().optional(),
  items: object2({
    type: literal("string"),
    enum: array(string2())
  }),
  default: array(string2()).optional()
});
var TitledMultiSelectEnumSchemaSchema = object2({
  type: literal("array"),
  title: string2().optional(),
  description: string2().optional(),
  minItems: number2().optional(),
  maxItems: number2().optional(),
  items: object2({
    anyOf: array(object2({
      const: string2(),
      title: string2()
    }))
  }),
  default: array(string2()).optional()
});
var MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
var EnumSchemaSchema = union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
var PrimitiveSchemaDefinitionSchema = union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
var ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   *
   * Optional for backward compatibility. Clients MUST treat missing mode as "form".
   */
  mode: literal("form").optional(),
  /**
   * The message to present to the user describing what information is being requested.
   */
  message: string2(),
  /**
   * A restricted subset of JSON Schema.
   * Only top-level properties are allowed, without nesting.
   */
  requestedSchema: object2({
    type: literal("object"),
    properties: record(string2(), PrimitiveSchemaDefinitionSchema),
    required: array(string2()).optional()
  })
});
var ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   */
  mode: literal("url"),
  /**
   * The message to present to the user explaining why the interaction is needed.
   */
  message: string2(),
  /**
   * The ID of the elicitation, which must be unique within the context of the server.
   * The client MUST treat this ID as an opaque value.
   */
  elicitationId: string2(),
  /**
   * The URL that the user should navigate to.
   */
  url: string2().url()
});
var ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
var ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema
});
var ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the elicitation that completed.
   */
  elicitationId: string2()
});
var ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema
});
var ElicitResultSchema = ResultSchema.extend({
  /**
   * The user action in response to the elicitation.
   * - "accept": User submitted the form/confirmed the action
   * - "decline": User explicitly decline the action
   * - "cancel": User dismissed without making an explicit choice
   */
  action: _enum(["accept", "decline", "cancel"]),
  /**
   * The submitted form data, only present when action is "accept".
   * Contains values matching the requested schema.
   * Per MCP spec, content is "typically omitted" for decline/cancel actions.
   * We normalize null to undefined for leniency while maintaining type compatibility.
   */
  content: preprocess((val) => val === null ? void 0 : val, record(string2(), union([string2(), number2(), boolean2(), array(string2())])).optional())
});
var ResourceTemplateReferenceSchema = object2({
  type: literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: string2()
});
var PromptReferenceSchema = object2({
  type: literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: string2()
});
var CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  /**
   * The argument's information
   */
  argument: object2({
    /**
     * The name of the argument
     */
    name: string2(),
    /**
     * The value of the argument to use for completion matching.
     */
    value: string2()
  }),
  context: object2({
    /**
     * Previously-resolved variables in a URI template or prompt.
     */
    arguments: record(string2(), string2()).optional()
  }).optional()
});
var CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema
});
var CompleteResultSchema = ResultSchema.extend({
  completion: looseObject({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: array(string2()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: optional(number2().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: optional(boolean2())
  })
});
var RootSchema = object2({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: string2().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: string2().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string2(), unknown()).optional()
});
var ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional()
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: array(RootSchema)
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ClientRequestSchema = union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
var ClientNotificationSchema = union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema
]);
var ClientResultSchema = union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var ServerRequestSchema = union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
var ServerNotificationSchema = union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema
]);
var ServerResultSchema = union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var McpError = class _McpError extends Error {
  constructor(code, message, data) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
    this.name = "McpError";
  }
  /**
   * Factory method to create the appropriate error type based on the error code and data
   */
  static fromError(code, message, data) {
    if (code === ErrorCode.UrlElicitationRequired && data) {
      const errorData = data;
      if (errorData.elicitations) {
        return new UrlElicitationRequiredError(errorData.elicitations, message);
      }
    }
    return new _McpError(code, message, data);
  }
};
var UrlElicitationRequiredError = class extends McpError {
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ErrorCode.UrlElicitationRequired, message, {
      elicitations
    });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
};

// node_modules/@modelcontextprotocol/sdk/dist/esm/experimental/tasks/interfaces.js
function isTerminal(status) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

// node_modules/zod-to-json-schema/dist/esm/parsers/string.js
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/zod-json-schema-compat.js
function getMethodLiteral(schema) {
  const shape = getObjectShape(schema);
  const methodSchema = shape?.method;
  if (!methodSchema) {
    throw new Error("Schema is missing a method literal");
  }
  const value = getLiteralValue(methodSchema);
  if (typeof value !== "string") {
    throw new Error("Schema method literal must be a string");
  }
  return value;
}
function parseWithCompat(schema, data) {
  const result = safeParse2(schema, data);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js
var DEFAULT_REQUEST_TIMEOUT_MSEC = 6e4;
var Protocol = class {
  constructor(_options) {
    this._options = _options;
    this._requestMessageId = 0;
    this._requestHandlers = /* @__PURE__ */ new Map();
    this._requestHandlerAbortControllers = /* @__PURE__ */ new Map();
    this._notificationHandlers = /* @__PURE__ */ new Map();
    this._responseHandlers = /* @__PURE__ */ new Map();
    this._progressHandlers = /* @__PURE__ */ new Map();
    this._timeoutInfo = /* @__PURE__ */ new Map();
    this._pendingDebouncedNotifications = /* @__PURE__ */ new Set();
    this._taskProgressTokens = /* @__PURE__ */ new Map();
    this._requestResolvers = /* @__PURE__ */ new Map();
    this.setNotificationHandler(CancelledNotificationSchema, (notification) => {
      this._oncancel(notification);
    });
    this.setNotificationHandler(ProgressNotificationSchema, (notification) => {
      this._onprogress(notification);
    });
    this.setRequestHandler(
      PingRequestSchema,
      // Automatic pong by default.
      (_request) => ({})
    );
    this._taskStore = _options?.taskStore;
    this._taskMessageQueue = _options?.taskMessageQueue;
    if (this._taskStore) {
      this.setRequestHandler(GetTaskRequestSchema, async (request2, extra) => {
        const task = await this._taskStore.getTask(request2.params.taskId, extra.sessionId);
        if (!task) {
          throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
        }
        return {
          ...task
        };
      });
      this.setRequestHandler(GetTaskPayloadRequestSchema, async (request2, extra) => {
        const handleTaskResult = async () => {
          const taskId = request2.params.taskId;
          if (this._taskMessageQueue) {
            let queuedMessage;
            while (queuedMessage = await this._taskMessageQueue.dequeue(taskId, extra.sessionId)) {
              if (queuedMessage.type === "response" || queuedMessage.type === "error") {
                const message = queuedMessage.message;
                const requestId = message.id;
                const resolver = this._requestResolvers.get(requestId);
                if (resolver) {
                  this._requestResolvers.delete(requestId);
                  if (queuedMessage.type === "response") {
                    resolver(message);
                  } else {
                    const errorMessage = message;
                    const error2 = new McpError(errorMessage.error.code, errorMessage.error.message, errorMessage.error.data);
                    resolver(error2);
                  }
                } else {
                  const messageType = queuedMessage.type === "response" ? "Response" : "Error";
                  this._onerror(new Error(`${messageType} handler missing for request ${requestId}`));
                }
                continue;
              }
              await this._transport?.send(queuedMessage.message, { relatedRequestId: extra.requestId });
            }
          }
          const task = await this._taskStore.getTask(taskId, extra.sessionId);
          if (!task) {
            throw new McpError(ErrorCode.InvalidParams, `Task not found: ${taskId}`);
          }
          if (!isTerminal(task.status)) {
            await this._waitForTaskUpdate(taskId, extra.signal);
            return await handleTaskResult();
          }
          if (isTerminal(task.status)) {
            const result = await this._taskStore.getTaskResult(taskId, extra.sessionId);
            this._clearTaskQueue(taskId);
            return {
              ...result,
              _meta: {
                ...result._meta,
                [RELATED_TASK_META_KEY]: {
                  taskId
                }
              }
            };
          }
          return await handleTaskResult();
        };
        return await handleTaskResult();
      });
      this.setRequestHandler(ListTasksRequestSchema, async (request2, extra) => {
        try {
          const { tasks, nextCursor } = await this._taskStore.listTasks(request2.params?.cursor, extra.sessionId);
          return {
            tasks,
            nextCursor,
            _meta: {}
          };
        } catch (error2) {
          throw new McpError(ErrorCode.InvalidParams, `Failed to list tasks: ${error2 instanceof Error ? error2.message : String(error2)}`);
        }
      });
      this.setRequestHandler(CancelTaskRequestSchema, async (request2, extra) => {
        try {
          const task = await this._taskStore.getTask(request2.params.taskId, extra.sessionId);
          if (!task) {
            throw new McpError(ErrorCode.InvalidParams, `Task not found: ${request2.params.taskId}`);
          }
          if (isTerminal(task.status)) {
            throw new McpError(ErrorCode.InvalidParams, `Cannot cancel task in terminal status: ${task.status}`);
          }
          await this._taskStore.updateTaskStatus(request2.params.taskId, "cancelled", "Client cancelled task execution.", extra.sessionId);
          this._clearTaskQueue(request2.params.taskId);
          const cancelledTask = await this._taskStore.getTask(request2.params.taskId, extra.sessionId);
          if (!cancelledTask) {
            throw new McpError(ErrorCode.InvalidParams, `Task not found after cancellation: ${request2.params.taskId}`);
          }
          return {
            _meta: {},
            ...cancelledTask
          };
        } catch (error2) {
          if (error2 instanceof McpError) {
            throw error2;
          }
          throw new McpError(ErrorCode.InvalidRequest, `Failed to cancel task: ${error2 instanceof Error ? error2.message : String(error2)}`);
        }
      });
    }
  }
  async _oncancel(notification) {
    if (!notification.params.requestId) {
      return;
    }
    const controller = this._requestHandlerAbortControllers.get(notification.params.requestId);
    controller?.abort(notification.params.reason);
  }
  _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
    this._timeoutInfo.set(messageId, {
      timeoutId: setTimeout(onTimeout, timeout),
      startTime: Date.now(),
      timeout,
      maxTotalTimeout,
      resetTimeoutOnProgress,
      onTimeout
    });
  }
  _resetTimeout(messageId) {
    const info = this._timeoutInfo.get(messageId);
    if (!info)
      return false;
    const totalElapsed = Date.now() - info.startTime;
    if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
      this._timeoutInfo.delete(messageId);
      throw McpError.fromError(ErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
        maxTotalTimeout: info.maxTotalTimeout,
        totalElapsed
      });
    }
    clearTimeout(info.timeoutId);
    info.timeoutId = setTimeout(info.onTimeout, info.timeout);
    return true;
  }
  _cleanupTimeout(messageId) {
    const info = this._timeoutInfo.get(messageId);
    if (info) {
      clearTimeout(info.timeoutId);
      this._timeoutInfo.delete(messageId);
    }
  }
  /**
   * Attaches to the given transport, starts it, and starts listening for messages.
   *
   * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
   */
  async connect(transport) {
    if (this._transport) {
      throw new Error("Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.");
    }
    this._transport = transport;
    const _onclose = this.transport?.onclose;
    this._transport.onclose = () => {
      _onclose?.();
      this._onclose();
    };
    const _onerror = this.transport?.onerror;
    this._transport.onerror = (error2) => {
      _onerror?.(error2);
      this._onerror(error2);
    };
    const _onmessage = this._transport?.onmessage;
    this._transport.onmessage = (message, extra) => {
      _onmessage?.(message, extra);
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
        this._onresponse(message);
      } else if (isJSONRPCRequest(message)) {
        this._onrequest(message, extra);
      } else if (isJSONRPCNotification(message)) {
        this._onnotification(message);
      } else {
        this._onerror(new Error(`Unknown message type: ${JSON.stringify(message)}`));
      }
    };
    await this._transport.start();
  }
  _onclose() {
    const responseHandlers = this._responseHandlers;
    this._responseHandlers = /* @__PURE__ */ new Map();
    this._progressHandlers.clear();
    this._taskProgressTokens.clear();
    this._pendingDebouncedNotifications.clear();
    for (const info of this._timeoutInfo.values()) {
      clearTimeout(info.timeoutId);
    }
    this._timeoutInfo.clear();
    for (const controller of this._requestHandlerAbortControllers.values()) {
      controller.abort();
    }
    this._requestHandlerAbortControllers.clear();
    const error2 = McpError.fromError(ErrorCode.ConnectionClosed, "Connection closed");
    this._transport = void 0;
    this.onclose?.();
    for (const handler of responseHandlers.values()) {
      handler(error2);
    }
  }
  _onerror(error2) {
    this.onerror?.(error2);
  }
  _onnotification(notification) {
    const handler = this._notificationHandlers.get(notification.method) ?? this.fallbackNotificationHandler;
    if (handler === void 0) {
      return;
    }
    Promise.resolve().then(() => handler(notification)).catch((error2) => this._onerror(new Error(`Uncaught error in notification handler: ${error2}`)));
  }
  _onrequest(request2, extra) {
    const handler = this._requestHandlers.get(request2.method) ?? this.fallbackRequestHandler;
    const capturedTransport = this._transport;
    const relatedTaskId = request2.params?._meta?.[RELATED_TASK_META_KEY]?.taskId;
    if (handler === void 0) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: request2.id,
        error: {
          code: ErrorCode.MethodNotFound,
          message: "Method not found"
        }
      };
      if (relatedTaskId && this._taskMessageQueue) {
        this._enqueueTaskMessage(relatedTaskId, {
          type: "error",
          message: errorResponse,
          timestamp: Date.now()
        }, capturedTransport?.sessionId).catch((error2) => this._onerror(new Error(`Failed to enqueue error response: ${error2}`)));
      } else {
        capturedTransport?.send(errorResponse).catch((error2) => this._onerror(new Error(`Failed to send an error response: ${error2}`)));
      }
      return;
    }
    const abortController = new AbortController();
    this._requestHandlerAbortControllers.set(request2.id, abortController);
    const taskCreationParams = isTaskAugmentedRequestParams(request2.params) ? request2.params.task : void 0;
    const taskStore = this._taskStore ? this.requestTaskStore(request2, capturedTransport?.sessionId) : void 0;
    const fullExtra = {
      signal: abortController.signal,
      sessionId: capturedTransport?.sessionId,
      _meta: request2.params?._meta,
      sendNotification: async (notification) => {
        if (abortController.signal.aborted)
          return;
        const notificationOptions = { relatedRequestId: request2.id };
        if (relatedTaskId) {
          notificationOptions.relatedTask = { taskId: relatedTaskId };
        }
        await this.notification(notification, notificationOptions);
      },
      sendRequest: async (r, resultSchema, options) => {
        if (abortController.signal.aborted) {
          throw new McpError(ErrorCode.ConnectionClosed, "Request was cancelled");
        }
        const requestOptions = { ...options, relatedRequestId: request2.id };
        if (relatedTaskId && !requestOptions.relatedTask) {
          requestOptions.relatedTask = { taskId: relatedTaskId };
        }
        const effectiveTaskId = requestOptions.relatedTask?.taskId ?? relatedTaskId;
        if (effectiveTaskId && taskStore) {
          await taskStore.updateTaskStatus(effectiveTaskId, "input_required");
        }
        return await this.request(r, resultSchema, requestOptions);
      },
      authInfo: extra?.authInfo,
      requestId: request2.id,
      requestInfo: extra?.requestInfo,
      taskId: relatedTaskId,
      taskStore,
      taskRequestedTtl: taskCreationParams?.ttl,
      closeSSEStream: extra?.closeSSEStream,
      closeStandaloneSSEStream: extra?.closeStandaloneSSEStream
    };
    Promise.resolve().then(() => {
      if (taskCreationParams) {
        this.assertTaskHandlerCapability(request2.method);
      }
    }).then(() => handler(request2, fullExtra)).then(async (result) => {
      if (abortController.signal.aborted) {
        return;
      }
      const response = {
        result,
        jsonrpc: "2.0",
        id: request2.id
      };
      if (relatedTaskId && this._taskMessageQueue) {
        await this._enqueueTaskMessage(relatedTaskId, {
          type: "response",
          message: response,
          timestamp: Date.now()
        }, capturedTransport?.sessionId);
      } else {
        await capturedTransport?.send(response);
      }
    }, async (error2) => {
      if (abortController.signal.aborted) {
        return;
      }
      const errorResponse = {
        jsonrpc: "2.0",
        id: request2.id,
        error: {
          code: Number.isSafeInteger(error2["code"]) ? error2["code"] : ErrorCode.InternalError,
          message: error2.message ?? "Internal error",
          ...error2["data"] !== void 0 && { data: error2["data"] }
        }
      };
      if (relatedTaskId && this._taskMessageQueue) {
        await this._enqueueTaskMessage(relatedTaskId, {
          type: "error",
          message: errorResponse,
          timestamp: Date.now()
        }, capturedTransport?.sessionId);
      } else {
        await capturedTransport?.send(errorResponse);
      }
    }).catch((error2) => this._onerror(new Error(`Failed to send response: ${error2}`))).finally(() => {
      if (this._requestHandlerAbortControllers.get(request2.id) === abortController) {
        this._requestHandlerAbortControllers.delete(request2.id);
      }
    });
  }
  _onprogress(notification) {
    const { progressToken, ...params } = notification.params;
    const messageId = Number(progressToken);
    const handler = this._progressHandlers.get(messageId);
    if (!handler) {
      this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
      return;
    }
    const responseHandler = this._responseHandlers.get(messageId);
    const timeoutInfo = this._timeoutInfo.get(messageId);
    if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) {
      try {
        this._resetTimeout(messageId);
      } catch (error2) {
        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);
        this._cleanupTimeout(messageId);
        responseHandler(error2);
        return;
      }
    }
    handler(params);
  }
  _onresponse(response) {
    const messageId = Number(response.id);
    const resolver = this._requestResolvers.get(messageId);
    if (resolver) {
      this._requestResolvers.delete(messageId);
      if (isJSONRPCResultResponse(response)) {
        resolver(response);
      } else {
        const error2 = new McpError(response.error.code, response.error.message, response.error.data);
        resolver(error2);
      }
      return;
    }
    const handler = this._responseHandlers.get(messageId);
    if (handler === void 0) {
      this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
      return;
    }
    this._responseHandlers.delete(messageId);
    this._cleanupTimeout(messageId);
    let isTaskResponse = false;
    if (isJSONRPCResultResponse(response) && response.result && typeof response.result === "object") {
      const result = response.result;
      if (result.task && typeof result.task === "object") {
        const task = result.task;
        if (typeof task.taskId === "string") {
          isTaskResponse = true;
          this._taskProgressTokens.set(task.taskId, messageId);
        }
      }
    }
    if (!isTaskResponse) {
      this._progressHandlers.delete(messageId);
    }
    if (isJSONRPCResultResponse(response)) {
      handler(response);
    } else {
      const error2 = McpError.fromError(response.error.code, response.error.message, response.error.data);
      handler(error2);
    }
  }
  get transport() {
    return this._transport;
  }
  /**
   * Closes the connection.
   */
  async close() {
    await this._transport?.close();
  }
  /**
   * Sends a request and returns an AsyncGenerator that yields response messages.
   * The generator is guaranteed to end with either a 'result' or 'error' message.
   *
   * @example
   * ```typescript
   * const stream = protocol.requestStream(request, resultSchema, options);
   * for await (const message of stream) {
   *   switch (message.type) {
   *     case 'taskCreated':
   *       console.log('Task created:', message.task.taskId);
   *       break;
   *     case 'taskStatus':
   *       console.log('Task status:', message.task.status);
   *       break;
   *     case 'result':
   *       console.log('Final result:', message.result);
   *       break;
   *     case 'error':
   *       console.error('Error:', message.error);
   *       break;
   *   }
   * }
   * ```
   *
   * @experimental Use `client.experimental.tasks.requestStream()` to access this method.
   */
  async *requestStream(request2, resultSchema, options) {
    const { task } = options ?? {};
    if (!task) {
      try {
        const result = await this.request(request2, resultSchema, options);
        yield { type: "result", result };
      } catch (error2) {
        yield {
          type: "error",
          error: error2 instanceof McpError ? error2 : new McpError(ErrorCode.InternalError, String(error2))
        };
      }
      return;
    }
    let taskId;
    try {
      const createResult = await this.request(request2, CreateTaskResultSchema, options);
      if (createResult.task) {
        taskId = createResult.task.taskId;
        yield { type: "taskCreated", task: createResult.task };
      } else {
        throw new McpError(ErrorCode.InternalError, "Task creation did not return a task");
      }
      while (true) {
        const task2 = await this.getTask({ taskId }, options);
        yield { type: "taskStatus", task: task2 };
        if (isTerminal(task2.status)) {
          if (task2.status === "completed") {
            const result = await this.getTaskResult({ taskId }, resultSchema, options);
            yield { type: "result", result };
          } else if (task2.status === "failed") {
            yield {
              type: "error",
              error: new McpError(ErrorCode.InternalError, `Task ${taskId} failed`)
            };
          } else if (task2.status === "cancelled") {
            yield {
              type: "error",
              error: new McpError(ErrorCode.InternalError, `Task ${taskId} was cancelled`)
            };
          }
          return;
        }
        if (task2.status === "input_required") {
          const result = await this.getTaskResult({ taskId }, resultSchema, options);
          yield { type: "result", result };
          return;
        }
        const pollInterval = task2.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1e3;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        options?.signal?.throwIfAborted();
      }
    } catch (error2) {
      yield {
        type: "error",
        error: error2 instanceof McpError ? error2 : new McpError(ErrorCode.InternalError, String(error2))
      };
    }
  }
  /**
   * Sends a request and waits for a response.
   *
   * Do not use this method to emit notifications! Use notification() instead.
   */
  request(request2, resultSchema, options) {
    const { relatedRequestId, resumptionToken, onresumptiontoken, task, relatedTask } = options ?? {};
    return new Promise((resolve, reject) => {
      const earlyReject = (error2) => {
        reject(error2);
      };
      if (!this._transport) {
        earlyReject(new Error("Not connected"));
        return;
      }
      if (this._options?.enforceStrictCapabilities === true) {
        try {
          this.assertCapabilityForMethod(request2.method);
          if (task) {
            this.assertTaskCapability(request2.method);
          }
        } catch (e) {
          earlyReject(e);
          return;
        }
      }
      options?.signal?.throwIfAborted();
      const messageId = this._requestMessageId++;
      const jsonrpcRequest = {
        ...request2,
        jsonrpc: "2.0",
        id: messageId
      };
      if (options?.onprogress) {
        this._progressHandlers.set(messageId, options.onprogress);
        jsonrpcRequest.params = {
          ...request2.params,
          _meta: {
            ...request2.params?._meta || {},
            progressToken: messageId
          }
        };
      }
      if (task) {
        jsonrpcRequest.params = {
          ...jsonrpcRequest.params,
          task
        };
      }
      if (relatedTask) {
        jsonrpcRequest.params = {
          ...jsonrpcRequest.params,
          _meta: {
            ...jsonrpcRequest.params?._meta || {},
            [RELATED_TASK_META_KEY]: relatedTask
          }
        };
      }
      const cancel = (reason) => {
        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);
        this._cleanupTimeout(messageId);
        this._transport?.send({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: {
            requestId: messageId,
            reason: String(reason)
          }
        }, { relatedRequestId, resumptionToken, onresumptiontoken }).catch((error3) => this._onerror(new Error(`Failed to send cancellation: ${error3}`)));
        const error2 = reason instanceof McpError ? reason : new McpError(ErrorCode.RequestTimeout, String(reason));
        reject(error2);
      };
      this._responseHandlers.set(messageId, (response) => {
        if (options?.signal?.aborted) {
          return;
        }
        if (response instanceof Error) {
          return reject(response);
        }
        try {
          const parseResult = safeParse2(resultSchema, response.result);
          if (!parseResult.success) {
            reject(parseResult.error);
          } else {
            resolve(parseResult.data);
          }
        } catch (error2) {
          reject(error2);
        }
      });
      options?.signal?.addEventListener("abort", () => {
        cancel(options?.signal?.reason);
      });
      const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
      const timeoutHandler = () => cancel(McpError.fromError(ErrorCode.RequestTimeout, "Request timed out", { timeout }));
      this._setupTimeout(messageId, timeout, options?.maxTotalTimeout, timeoutHandler, options?.resetTimeoutOnProgress ?? false);
      const relatedTaskId = relatedTask?.taskId;
      if (relatedTaskId) {
        const responseResolver = (response) => {
          const handler = this._responseHandlers.get(messageId);
          if (handler) {
            handler(response);
          } else {
            this._onerror(new Error(`Response handler missing for side-channeled request ${messageId}`));
          }
        };
        this._requestResolvers.set(messageId, responseResolver);
        this._enqueueTaskMessage(relatedTaskId, {
          type: "request",
          message: jsonrpcRequest,
          timestamp: Date.now()
        }).catch((error2) => {
          this._cleanupTimeout(messageId);
          reject(error2);
        });
      } else {
        this._transport.send(jsonrpcRequest, { relatedRequestId, resumptionToken, onresumptiontoken }).catch((error2) => {
          this._cleanupTimeout(messageId);
          reject(error2);
        });
      }
    });
  }
  /**
   * Gets the current status of a task.
   *
   * @experimental Use `client.experimental.tasks.getTask()` to access this method.
   */
  async getTask(params, options) {
    return this.request({ method: "tasks/get", params }, GetTaskResultSchema, options);
  }
  /**
   * Retrieves the result of a completed task.
   *
   * @experimental Use `client.experimental.tasks.getTaskResult()` to access this method.
   */
  async getTaskResult(params, resultSchema, options) {
    return this.request({ method: "tasks/result", params }, resultSchema, options);
  }
  /**
   * Lists tasks, optionally starting from a pagination cursor.
   *
   * @experimental Use `client.experimental.tasks.listTasks()` to access this method.
   */
  async listTasks(params, options) {
    return this.request({ method: "tasks/list", params }, ListTasksResultSchema, options);
  }
  /**
   * Cancels a specific task.
   *
   * @experimental Use `client.experimental.tasks.cancelTask()` to access this method.
   */
  async cancelTask(params, options) {
    return this.request({ method: "tasks/cancel", params }, CancelTaskResultSchema, options);
  }
  /**
   * Emits a notification, which is a one-way message that does not expect a response.
   */
  async notification(notification, options) {
    if (!this._transport) {
      throw new Error("Not connected");
    }
    this.assertNotificationCapability(notification.method);
    const relatedTaskId = options?.relatedTask?.taskId;
    if (relatedTaskId) {
      const jsonrpcNotification2 = {
        ...notification,
        jsonrpc: "2.0",
        params: {
          ...notification.params,
          _meta: {
            ...notification.params?._meta || {},
            [RELATED_TASK_META_KEY]: options.relatedTask
          }
        }
      };
      await this._enqueueTaskMessage(relatedTaskId, {
        type: "notification",
        message: jsonrpcNotification2,
        timestamp: Date.now()
      });
      return;
    }
    const debouncedMethods = this._options?.debouncedNotificationMethods ?? [];
    const canDebounce = debouncedMethods.includes(notification.method) && !notification.params && !options?.relatedRequestId && !options?.relatedTask;
    if (canDebounce) {
      if (this._pendingDebouncedNotifications.has(notification.method)) {
        return;
      }
      this._pendingDebouncedNotifications.add(notification.method);
      Promise.resolve().then(() => {
        this._pendingDebouncedNotifications.delete(notification.method);
        if (!this._transport) {
          return;
        }
        let jsonrpcNotification2 = {
          ...notification,
          jsonrpc: "2.0"
        };
        if (options?.relatedTask) {
          jsonrpcNotification2 = {
            ...jsonrpcNotification2,
            params: {
              ...jsonrpcNotification2.params,
              _meta: {
                ...jsonrpcNotification2.params?._meta || {},
                [RELATED_TASK_META_KEY]: options.relatedTask
              }
            }
          };
        }
        this._transport?.send(jsonrpcNotification2, options).catch((error2) => this._onerror(error2));
      });
      return;
    }
    let jsonrpcNotification = {
      ...notification,
      jsonrpc: "2.0"
    };
    if (options?.relatedTask) {
      jsonrpcNotification = {
        ...jsonrpcNotification,
        params: {
          ...jsonrpcNotification.params,
          _meta: {
            ...jsonrpcNotification.params?._meta || {},
            [RELATED_TASK_META_KEY]: options.relatedTask
          }
        }
      };
    }
    await this._transport.send(jsonrpcNotification, options);
  }
  /**
   * Registers a handler to invoke when this protocol object receives a request with the given method.
   *
   * Note that this will replace any previous request handler for the same method.
   */
  setRequestHandler(requestSchema, handler) {
    const method = getMethodLiteral(requestSchema);
    this.assertRequestHandlerCapability(method);
    this._requestHandlers.set(method, (request2, extra) => {
      const parsed = parseWithCompat(requestSchema, request2);
      return Promise.resolve(handler(parsed, extra));
    });
  }
  /**
   * Removes the request handler for the given method.
   */
  removeRequestHandler(method) {
    this._requestHandlers.delete(method);
  }
  /**
   * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
   */
  assertCanSetRequestHandler(method) {
    if (this._requestHandlers.has(method)) {
      throw new Error(`A request handler for ${method} already exists, which would be overridden`);
    }
  }
  /**
   * Registers a handler to invoke when this protocol object receives a notification with the given method.
   *
   * Note that this will replace any previous notification handler for the same method.
   */
  setNotificationHandler(notificationSchema, handler) {
    const method = getMethodLiteral(notificationSchema);
    this._notificationHandlers.set(method, (notification) => {
      const parsed = parseWithCompat(notificationSchema, notification);
      return Promise.resolve(handler(parsed));
    });
  }
  /**
   * Removes the notification handler for the given method.
   */
  removeNotificationHandler(method) {
    this._notificationHandlers.delete(method);
  }
  /**
   * Cleans up the progress handler associated with a task.
   * This should be called when a task reaches a terminal status.
   */
  _cleanupTaskProgressHandler(taskId) {
    const progressToken = this._taskProgressTokens.get(taskId);
    if (progressToken !== void 0) {
      this._progressHandlers.delete(progressToken);
      this._taskProgressTokens.delete(taskId);
    }
  }
  /**
   * Enqueues a task-related message for side-channel delivery via tasks/result.
   * @param taskId The task ID to associate the message with
   * @param message The message to enqueue
   * @param sessionId Optional session ID for binding the operation to a specific session
   * @throws Error if taskStore is not configured or if enqueue fails (e.g., queue overflow)
   *
   * Note: If enqueue fails, it's the TaskMessageQueue implementation's responsibility to handle
   * the error appropriately (e.g., by failing the task, logging, etc.). The Protocol layer
   * simply propagates the error.
   */
  async _enqueueTaskMessage(taskId, message, sessionId) {
    if (!this._taskStore || !this._taskMessageQueue) {
      throw new Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
    }
    const maxQueueSize = this._options?.maxTaskQueueSize;
    await this._taskMessageQueue.enqueue(taskId, message, sessionId, maxQueueSize);
  }
  /**
   * Clears the message queue for a task and rejects any pending request resolvers.
   * @param taskId The task ID whose queue should be cleared
   * @param sessionId Optional session ID for binding the operation to a specific session
   */
  async _clearTaskQueue(taskId, sessionId) {
    if (this._taskMessageQueue) {
      const messages = await this._taskMessageQueue.dequeueAll(taskId, sessionId);
      for (const message of messages) {
        if (message.type === "request" && isJSONRPCRequest(message.message)) {
          const requestId = message.message.id;
          const resolver = this._requestResolvers.get(requestId);
          if (resolver) {
            resolver(new McpError(ErrorCode.InternalError, "Task cancelled or completed"));
            this._requestResolvers.delete(requestId);
          } else {
            this._onerror(new Error(`Resolver missing for request ${requestId} during task ${taskId} cleanup`));
          }
        }
      }
    }
  }
  /**
   * Waits for a task update (new messages or status change) with abort signal support.
   * Uses polling to check for updates at the task's configured poll interval.
   * @param taskId The task ID to wait for
   * @param signal Abort signal to cancel the wait
   * @returns Promise that resolves when an update occurs or rejects if aborted
   */
  async _waitForTaskUpdate(taskId, signal) {
    let interval = this._options?.defaultTaskPollInterval ?? 1e3;
    try {
      const task = await this._taskStore?.getTask(taskId);
      if (task?.pollInterval) {
        interval = task.pollInterval;
      }
    } catch {
    }
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
        return;
      }
      const timeoutId = setTimeout(resolve, interval);
      signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
      }, { once: true });
    });
  }
  requestTaskStore(request2, sessionId) {
    const taskStore = this._taskStore;
    if (!taskStore) {
      throw new Error("No task store configured");
    }
    return {
      createTask: async (taskParams) => {
        if (!request2) {
          throw new Error("No request provided");
        }
        return await taskStore.createTask(taskParams, request2.id, {
          method: request2.method,
          params: request2.params
        }, sessionId);
      },
      getTask: async (taskId) => {
        const task = await taskStore.getTask(taskId, sessionId);
        if (!task) {
          throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
        }
        return task;
      },
      storeTaskResult: async (taskId, status, result) => {
        await taskStore.storeTaskResult(taskId, status, result, sessionId);
        const task = await taskStore.getTask(taskId, sessionId);
        if (task) {
          const notification = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: task
          });
          await this.notification(notification);
          if (isTerminal(task.status)) {
            this._cleanupTaskProgressHandler(taskId);
          }
        }
      },
      getTaskResult: (taskId) => {
        return taskStore.getTaskResult(taskId, sessionId);
      },
      updateTaskStatus: async (taskId, status, statusMessage) => {
        const task = await taskStore.getTask(taskId, sessionId);
        if (!task) {
          throw new McpError(ErrorCode.InvalidParams, `Task "${taskId}" not found - it may have been cleaned up`);
        }
        if (isTerminal(task.status)) {
          throw new McpError(ErrorCode.InvalidParams, `Cannot update task "${taskId}" from terminal status "${task.status}" to "${status}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
        }
        await taskStore.updateTaskStatus(taskId, status, statusMessage, sessionId);
        const updatedTask = await taskStore.getTask(taskId, sessionId);
        if (updatedTask) {
          const notification = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: updatedTask
          });
          await this.notification(notification);
          if (isTerminal(updatedTask.status)) {
            this._cleanupTaskProgressHandler(taskId);
          }
        }
      },
      listTasks: (cursor) => {
        return taskStore.listTasks(cursor, sessionId);
      }
    };
  }
};
function isPlainObject2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function mergeCapabilities(base, additional) {
  const result = { ...base };
  for (const key in additional) {
    const k = key;
    const addValue = additional[k];
    if (addValue === void 0)
      continue;
    const baseValue = result[k];
    if (isPlainObject2(baseValue) && isPlainObject2(addValue)) {
      result[k] = { ...baseValue, ...addValue };
    } else {
      result[k] = addValue;
    }
  }
  return result;
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/validation/ajv-provider.js
var import_ajv = __toESM(require_ajv(), 1);
var import_ajv_formats = __toESM(require_dist(), 1);
function createDefaultAjvInstance() {
  const ajv = new import_ajv.default({
    strict: false,
    validateFormats: true,
    validateSchema: false,
    allErrors: true
  });
  const addFormats = import_ajv_formats.default;
  addFormats(ajv);
  return ajv;
}
var AjvJsonSchemaValidator = class {
  /**
   * Create an AJV validator
   *
   * @param ajv - Optional pre-configured AJV instance. If not provided, a default instance will be created.
   *
   * @example
   * ```typescript
   * // Use default configuration (recommended for most cases)
   * import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
   * const validator = new AjvJsonSchemaValidator();
   *
   * // Or provide custom AJV instance for advanced configuration
   * import { Ajv } from 'ajv';
   * import addFormats from 'ajv-formats';
   *
   * const ajv = new Ajv({ validateFormats: true });
   * addFormats(ajv);
   * const validator = new AjvJsonSchemaValidator(ajv);
   * ```
   */
  constructor(ajv) {
    this._ajv = ajv ?? createDefaultAjvInstance();
  }
  /**
   * Create a validator for the given JSON Schema
   *
   * The validator is compiled once and can be reused multiple times.
   * If the schema has an $id, it will be cached by AJV automatically.
   *
   * @param schema - Standard JSON Schema object
   * @returns A validator function that validates input data
   */
  getValidator(schema) {
    const ajvValidator = "$id" in schema && typeof schema.$id === "string" ? this._ajv.getSchema(schema.$id) ?? this._ajv.compile(schema) : this._ajv.compile(schema);
    return (input) => {
      const valid = ajvValidator(input);
      if (valid) {
        return {
          valid: true,
          data: input,
          errorMessage: void 0
        };
      } else {
        return {
          valid: false,
          data: void 0,
          errorMessage: this._ajv.errorsText(ajvValidator.errors)
        };
      }
    };
  }
};

// node_modules/@modelcontextprotocol/sdk/dist/esm/experimental/tasks/server.js
var ExperimentalServerTasks = class {
  constructor(_server) {
    this._server = _server;
  }
  /**
   * Sends a request and returns an AsyncGenerator that yields response messages.
   * The generator is guaranteed to end with either a 'result' or 'error' message.
   *
   * This method provides streaming access to request processing, allowing you to
   * observe intermediate task status updates for task-augmented requests.
   *
   * @param request - The request to send
   * @param resultSchema - Zod schema for validating the result
   * @param options - Optional request options (timeout, signal, task creation params, etc.)
   * @returns AsyncGenerator that yields ResponseMessage objects
   *
   * @experimental
   */
  requestStream(request2, resultSchema, options) {
    return this._server.requestStream(request2, resultSchema, options);
  }
  /**
   * Sends a sampling request and returns an AsyncGenerator that yields response messages.
   * The generator is guaranteed to end with either a 'result' or 'error' message.
   *
   * For task-augmented requests, yields 'taskCreated' and 'taskStatus' messages
   * before the final result.
   *
   * @example
   * ```typescript
   * const stream = server.experimental.tasks.createMessageStream({
   *     messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
   *     maxTokens: 100
   * }, {
   *     onprogress: (progress) => {
   *         // Handle streaming tokens via progress notifications
   *         console.log('Progress:', progress.message);
   *     }
   * });
   *
   * for await (const message of stream) {
   *     switch (message.type) {
   *         case 'taskCreated':
   *             console.log('Task created:', message.task.taskId);
   *             break;
   *         case 'taskStatus':
   *             console.log('Task status:', message.task.status);
   *             break;
   *         case 'result':
   *             console.log('Final result:', message.result);
   *             break;
   *         case 'error':
   *             console.error('Error:', message.error);
   *             break;
   *     }
   * }
   * ```
   *
   * @param params - The sampling request parameters
   * @param options - Optional request options (timeout, signal, task creation params, onprogress, etc.)
   * @returns AsyncGenerator that yields ResponseMessage objects
   *
   * @experimental
   */
  createMessageStream(params, options) {
    const clientCapabilities = this._server.getClientCapabilities();
    if ((params.tools || params.toolChoice) && !clientCapabilities?.sampling?.tools) {
      throw new Error("Client does not support sampling tools capability.");
    }
    if (params.messages.length > 0) {
      const lastMessage = params.messages[params.messages.length - 1];
      const lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
      const hasToolResults = lastContent.some((c) => c.type === "tool_result");
      const previousMessage = params.messages.length > 1 ? params.messages[params.messages.length - 2] : void 0;
      const previousContent = previousMessage ? Array.isArray(previousMessage.content) ? previousMessage.content : [previousMessage.content] : [];
      const hasPreviousToolUse = previousContent.some((c) => c.type === "tool_use");
      if (hasToolResults) {
        if (lastContent.some((c) => c.type !== "tool_result")) {
          throw new Error("The last message must contain only tool_result content if any is present");
        }
        if (!hasPreviousToolUse) {
          throw new Error("tool_result blocks are not matching any tool_use from the previous message");
        }
      }
      if (hasPreviousToolUse) {
        const toolUseIds = new Set(previousContent.filter((c) => c.type === "tool_use").map((c) => c.id));
        const toolResultIds = new Set(lastContent.filter((c) => c.type === "tool_result").map((c) => c.toolUseId));
        if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every((id) => toolResultIds.has(id))) {
          throw new Error("ids of tool_result blocks and tool_use blocks from previous message do not match");
        }
      }
    }
    return this.requestStream({
      method: "sampling/createMessage",
      params
    }, CreateMessageResultSchema, options);
  }
  /**
   * Sends an elicitation request and returns an AsyncGenerator that yields response messages.
   * The generator is guaranteed to end with either a 'result' or 'error' message.
   *
   * For task-augmented requests (especially URL-based elicitation), yields 'taskCreated'
   * and 'taskStatus' messages before the final result.
   *
   * @example
   * ```typescript
   * const stream = server.experimental.tasks.elicitInputStream({
   *     mode: 'url',
   *     message: 'Please authenticate',
   *     elicitationId: 'auth-123',
   *     url: 'https://example.com/auth'
   * }, {
   *     task: { ttl: 300000 } // Task-augmented for long-running auth flow
   * });
   *
   * for await (const message of stream) {
   *     switch (message.type) {
   *         case 'taskCreated':
   *             console.log('Task created:', message.task.taskId);
   *             break;
   *         case 'taskStatus':
   *             console.log('Task status:', message.task.status);
   *             break;
   *         case 'result':
   *             console.log('User action:', message.result.action);
   *             break;
   *         case 'error':
   *             console.error('Error:', message.error);
   *             break;
   *     }
   * }
   * ```
   *
   * @param params - The elicitation request parameters
   * @param options - Optional request options (timeout, signal, task creation params, etc.)
   * @returns AsyncGenerator that yields ResponseMessage objects
   *
   * @experimental
   */
  elicitInputStream(params, options) {
    const clientCapabilities = this._server.getClientCapabilities();
    const mode = params.mode ?? "form";
    switch (mode) {
      case "url": {
        if (!clientCapabilities?.elicitation?.url) {
          throw new Error("Client does not support url elicitation.");
        }
        break;
      }
      case "form": {
        if (!clientCapabilities?.elicitation?.form) {
          throw new Error("Client does not support form elicitation.");
        }
        break;
      }
    }
    const normalizedParams = mode === "form" && params.mode === void 0 ? { ...params, mode: "form" } : params;
    return this.requestStream({
      method: "elicitation/create",
      params: normalizedParams
    }, ElicitResultSchema, options);
  }
  /**
   * Gets the current status of a task.
   *
   * @param taskId - The task identifier
   * @param options - Optional request options
   * @returns The task status
   *
   * @experimental
   */
  async getTask(taskId, options) {
    return this._server.getTask({ taskId }, options);
  }
  /**
   * Retrieves the result of a completed task.
   *
   * @param taskId - The task identifier
   * @param resultSchema - Zod schema for validating the result
   * @param options - Optional request options
   * @returns The task result
   *
   * @experimental
   */
  async getTaskResult(taskId, resultSchema, options) {
    return this._server.getTaskResult({ taskId }, resultSchema, options);
  }
  /**
   * Lists tasks with optional pagination.
   *
   * @param cursor - Optional pagination cursor
   * @param options - Optional request options
   * @returns List of tasks with optional next cursor
   *
   * @experimental
   */
  async listTasks(cursor, options) {
    return this._server.listTasks(cursor ? { cursor } : void 0, options);
  }
  /**
   * Cancels a running task.
   *
   * @param taskId - The task identifier
   * @param options - Optional request options
   *
   * @experimental
   */
  async cancelTask(taskId, options) {
    return this._server.cancelTask({ taskId }, options);
  }
};

// node_modules/@modelcontextprotocol/sdk/dist/esm/experimental/tasks/helpers.js
function assertToolsCallTaskCapability(requests, method, entityName) {
  if (!requests) {
    throw new Error(`${entityName} does not support task creation (required for ${method})`);
  }
  switch (method) {
    case "tools/call":
      if (!requests.tools?.call) {
        throw new Error(`${entityName} does not support task creation for tools/call (required for ${method})`);
      }
      break;
    default:
      break;
  }
}
function assertClientRequestTaskCapability(requests, method, entityName) {
  if (!requests) {
    throw new Error(`${entityName} does not support task creation (required for ${method})`);
  }
  switch (method) {
    case "sampling/createMessage":
      if (!requests.sampling?.createMessage) {
        throw new Error(`${entityName} does not support task creation for sampling/createMessage (required for ${method})`);
      }
      break;
    case "elicitation/create":
      if (!requests.elicitation?.create) {
        throw new Error(`${entityName} does not support task creation for elicitation/create (required for ${method})`);
      }
      break;
    default:
      break;
  }
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.js
var Server = class extends Protocol {
  /**
   * Initializes this server with the given name and version information.
   */
  constructor(_serverInfo, options) {
    super(options);
    this._serverInfo = _serverInfo;
    this._loggingLevels = /* @__PURE__ */ new Map();
    this.LOG_LEVEL_SEVERITY = new Map(LoggingLevelSchema.options.map((level, index) => [level, index]));
    this.isMessageIgnored = (level, sessionId) => {
      const currentLevel = this._loggingLevels.get(sessionId);
      return currentLevel ? this.LOG_LEVEL_SEVERITY.get(level) < this.LOG_LEVEL_SEVERITY.get(currentLevel) : false;
    };
    this._capabilities = options?.capabilities ?? {};
    this._instructions = options?.instructions;
    this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new AjvJsonSchemaValidator();
    this.setRequestHandler(InitializeRequestSchema, (request2) => this._oninitialize(request2));
    this.setNotificationHandler(InitializedNotificationSchema, () => this.oninitialized?.());
    if (this._capabilities.logging) {
      this.setRequestHandler(SetLevelRequestSchema, async (request2, extra) => {
        const transportSessionId = extra.sessionId || extra.requestInfo?.headers["mcp-session-id"] || void 0;
        const { level } = request2.params;
        const parseResult = LoggingLevelSchema.safeParse(level);
        if (parseResult.success) {
          this._loggingLevels.set(transportSessionId, parseResult.data);
        }
        return {};
      });
    }
  }
  /**
   * Access experimental features.
   *
   * WARNING: These APIs are experimental and may change without notice.
   *
   * @experimental
   */
  get experimental() {
    if (!this._experimental) {
      this._experimental = {
        tasks: new ExperimentalServerTasks(this)
      };
    }
    return this._experimental;
  }
  /**
   * Registers new capabilities. This can only be called before connecting to a transport.
   *
   * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
   */
  registerCapabilities(capabilities) {
    if (this.transport) {
      throw new Error("Cannot register capabilities after connecting to transport");
    }
    this._capabilities = mergeCapabilities(this._capabilities, capabilities);
  }
  /**
   * Override request handler registration to enforce server-side validation for tools/call.
   */
  setRequestHandler(requestSchema, handler) {
    const shape = getObjectShape(requestSchema);
    const methodSchema = shape?.method;
    if (!methodSchema) {
      throw new Error("Schema is missing a method literal");
    }
    const methodValue = getLiteralValue(methodSchema);
    if (typeof methodValue !== "string") {
      throw new Error("Schema method literal must be a string");
    }
    const method = methodValue;
    if (method === "tools/call") {
      const wrappedHandler = async (request2, extra) => {
        const validatedRequest = safeParse2(CallToolRequestSchema, request2);
        if (!validatedRequest.success) {
          const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call request: ${errorMessage}`);
        }
        const { params } = validatedRequest.data;
        const result = await Promise.resolve(handler(request2, extra));
        if (params.task) {
          const taskValidationResult = safeParse2(CreateTaskResultSchema, result);
          if (!taskValidationResult.success) {
            const errorMessage = taskValidationResult.error instanceof Error ? taskValidationResult.error.message : String(taskValidationResult.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
          }
          return taskValidationResult.data;
        }
        const validationResult = safeParse2(CallToolResultSchema, result);
        if (!validationResult.success) {
          const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call result: ${errorMessage}`);
        }
        return validationResult.data;
      };
      return super.setRequestHandler(requestSchema, wrappedHandler);
    }
    return super.setRequestHandler(requestSchema, handler);
  }
  assertCapabilityForMethod(method) {
    switch (method) {
      case "sampling/createMessage":
        if (!this._clientCapabilities?.sampling) {
          throw new Error(`Client does not support sampling (required for ${method})`);
        }
        break;
      case "elicitation/create":
        if (!this._clientCapabilities?.elicitation) {
          throw new Error(`Client does not support elicitation (required for ${method})`);
        }
        break;
      case "roots/list":
        if (!this._clientCapabilities?.roots) {
          throw new Error(`Client does not support listing roots (required for ${method})`);
        }
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(method) {
    switch (method) {
      case "notifications/message":
        if (!this._capabilities.logging) {
          throw new Error(`Server does not support logging (required for ${method})`);
        }
        break;
      case "notifications/resources/updated":
      case "notifications/resources/list_changed":
        if (!this._capabilities.resources) {
          throw new Error(`Server does not support notifying about resources (required for ${method})`);
        }
        break;
      case "notifications/tools/list_changed":
        if (!this._capabilities.tools) {
          throw new Error(`Server does not support notifying of tool list changes (required for ${method})`);
        }
        break;
      case "notifications/prompts/list_changed":
        if (!this._capabilities.prompts) {
          throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`);
        }
        break;
      case "notifications/elicitation/complete":
        if (!this._clientCapabilities?.elicitation?.url) {
          throw new Error(`Client does not support URL elicitation (required for ${method})`);
        }
        break;
      case "notifications/cancelled":
        break;
      case "notifications/progress":
        break;
    }
  }
  assertRequestHandlerCapability(method) {
    if (!this._capabilities) {
      return;
    }
    switch (method) {
      case "completion/complete":
        if (!this._capabilities.completions) {
          throw new Error(`Server does not support completions (required for ${method})`);
        }
        break;
      case "logging/setLevel":
        if (!this._capabilities.logging) {
          throw new Error(`Server does not support logging (required for ${method})`);
        }
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._capabilities.prompts) {
          throw new Error(`Server does not support prompts (required for ${method})`);
        }
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
        if (!this._capabilities.resources) {
          throw new Error(`Server does not support resources (required for ${method})`);
        }
        break;
      case "tools/call":
      case "tools/list":
        if (!this._capabilities.tools) {
          throw new Error(`Server does not support tools (required for ${method})`);
        }
        break;
      case "tasks/get":
      case "tasks/list":
      case "tasks/result":
      case "tasks/cancel":
        if (!this._capabilities.tasks) {
          throw new Error(`Server does not support tasks capability (required for ${method})`);
        }
        break;
      case "ping":
      case "initialize":
        break;
    }
  }
  assertTaskCapability(method) {
    assertClientRequestTaskCapability(this._clientCapabilities?.tasks?.requests, method, "Client");
  }
  assertTaskHandlerCapability(method) {
    if (!this._capabilities) {
      return;
    }
    assertToolsCallTaskCapability(this._capabilities.tasks?.requests, method, "Server");
  }
  async _oninitialize(request2) {
    const requestedVersion = request2.params.protocolVersion;
    this._clientCapabilities = request2.params.capabilities;
    this._clientVersion = request2.params.clientInfo;
    const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion) ? requestedVersion : LATEST_PROTOCOL_VERSION;
    return {
      protocolVersion,
      capabilities: this.getCapabilities(),
      serverInfo: this._serverInfo,
      ...this._instructions && { instructions: this._instructions }
    };
  }
  /**
   * After initialization has completed, this will be populated with the client's reported capabilities.
   */
  getClientCapabilities() {
    return this._clientCapabilities;
  }
  /**
   * After initialization has completed, this will be populated with information about the client's name and version.
   */
  getClientVersion() {
    return this._clientVersion;
  }
  getCapabilities() {
    return this._capabilities;
  }
  async ping() {
    return this.request({ method: "ping" }, EmptyResultSchema);
  }
  // Implementation
  async createMessage(params, options) {
    if (params.tools || params.toolChoice) {
      if (!this._clientCapabilities?.sampling?.tools) {
        throw new Error("Client does not support sampling tools capability.");
      }
    }
    if (params.messages.length > 0) {
      const lastMessage = params.messages[params.messages.length - 1];
      const lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
      const hasToolResults = lastContent.some((c) => c.type === "tool_result");
      const previousMessage = params.messages.length > 1 ? params.messages[params.messages.length - 2] : void 0;
      const previousContent = previousMessage ? Array.isArray(previousMessage.content) ? previousMessage.content : [previousMessage.content] : [];
      const hasPreviousToolUse = previousContent.some((c) => c.type === "tool_use");
      if (hasToolResults) {
        if (lastContent.some((c) => c.type !== "tool_result")) {
          throw new Error("The last message must contain only tool_result content if any is present");
        }
        if (!hasPreviousToolUse) {
          throw new Error("tool_result blocks are not matching any tool_use from the previous message");
        }
      }
      if (hasPreviousToolUse) {
        const toolUseIds = new Set(previousContent.filter((c) => c.type === "tool_use").map((c) => c.id));
        const toolResultIds = new Set(lastContent.filter((c) => c.type === "tool_result").map((c) => c.toolUseId));
        if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every((id) => toolResultIds.has(id))) {
          throw new Error("ids of tool_result blocks and tool_use blocks from previous message do not match");
        }
      }
    }
    if (params.tools) {
      return this.request({ method: "sampling/createMessage", params }, CreateMessageResultWithToolsSchema, options);
    }
    return this.request({ method: "sampling/createMessage", params }, CreateMessageResultSchema, options);
  }
  /**
   * Creates an elicitation request for the given parameters.
   * For backwards compatibility, `mode` may be omitted for form requests and will default to `'form'`.
   * @param params The parameters for the elicitation request.
   * @param options Optional request options.
   * @returns The result of the elicitation request.
   */
  async elicitInput(params, options) {
    const mode = params.mode ?? "form";
    switch (mode) {
      case "url": {
        if (!this._clientCapabilities?.elicitation?.url) {
          throw new Error("Client does not support url elicitation.");
        }
        const urlParams = params;
        return this.request({ method: "elicitation/create", params: urlParams }, ElicitResultSchema, options);
      }
      case "form": {
        if (!this._clientCapabilities?.elicitation?.form) {
          throw new Error("Client does not support form elicitation.");
        }
        const formParams = params.mode === "form" ? params : { ...params, mode: "form" };
        const result = await this.request({ method: "elicitation/create", params: formParams }, ElicitResultSchema, options);
        if (result.action === "accept" && result.content && formParams.requestedSchema) {
          try {
            const validator = this._jsonSchemaValidator.getValidator(formParams.requestedSchema);
            const validationResult = validator(result.content);
            if (!validationResult.valid) {
              throw new McpError(ErrorCode.InvalidParams, `Elicitation response content does not match requested schema: ${validationResult.errorMessage}`);
            }
          } catch (error2) {
            if (error2 instanceof McpError) {
              throw error2;
            }
            throw new McpError(ErrorCode.InternalError, `Error validating elicitation response: ${error2 instanceof Error ? error2.message : String(error2)}`);
          }
        }
        return result;
      }
    }
  }
  /**
   * Creates a reusable callback that, when invoked, will send a `notifications/elicitation/complete`
   * notification for the specified elicitation ID.
   *
   * @param elicitationId The ID of the elicitation to mark as complete.
   * @param options Optional notification options. Useful when the completion notification should be related to a prior request.
   * @returns A function that emits the completion notification when awaited.
   */
  createElicitationCompletionNotifier(elicitationId, options) {
    if (!this._clientCapabilities?.elicitation?.url) {
      throw new Error("Client does not support URL elicitation (required for notifications/elicitation/complete)");
    }
    return () => this.notification({
      method: "notifications/elicitation/complete",
      params: {
        elicitationId
      }
    }, options);
  }
  async listRoots(params, options) {
    return this.request({ method: "roots/list", params }, ListRootsResultSchema, options);
  }
  /**
   * Sends a logging message to the client, if connected.
   * Note: You only need to send the parameters object, not the entire JSON RPC message
   * @see LoggingMessageNotification
   * @param params
   * @param sessionId optional for stateless and backward compatibility
   */
  async sendLoggingMessage(params, sessionId) {
    if (this._capabilities.logging) {
      if (!this.isMessageIgnored(params.level, sessionId)) {
        return this.notification({ method: "notifications/message", params });
      }
    }
  }
  async sendResourceUpdated(params) {
    return this.notification({
      method: "notifications/resources/updated",
      params
    });
  }
  async sendResourceListChanged() {
    return this.notification({
      method: "notifications/resources/list_changed"
    });
  }
  async sendToolListChanged() {
    return this.notification({ method: "notifications/tools/list_changed" });
  }
  async sendPromptListChanged() {
    return this.notification({ method: "notifications/prompts/list_changed" });
  }
};

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js
import process2 from "node:process";

// node_modules/@modelcontextprotocol/sdk/dist/esm/shared/stdio.js
var STDIO_DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;
var ReadBuffer = class {
  constructor(options) {
    this._maxBufferSize = options?.maxBufferSize ?? STDIO_DEFAULT_MAX_BUFFER_SIZE;
  }
  append(chunk) {
    const newSize = (this._buffer?.length ?? 0) + chunk.length;
    if (newSize > this._maxBufferSize) {
      this.clear();
      throw new Error(`ReadBuffer exceeded maximum size of ${this._maxBufferSize} bytes`);
    }
    this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
  }
  readMessage() {
    if (!this._buffer) {
      return null;
    }
    const index = this._buffer.indexOf("\n");
    if (index === -1) {
      return null;
    }
    const line = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
    this._buffer = this._buffer.subarray(index + 1);
    return deserializeMessage(line);
  }
  clear() {
    this._buffer = void 0;
  }
};
function deserializeMessage(line) {
  return JSONRPCMessageSchema.parse(JSON.parse(line));
}
function serializeMessage(message) {
  return JSON.stringify(message) + "\n";
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js
var StdioServerTransport = class {
  constructor(_stdin = process2.stdin, _stdout = process2.stdout, options) {
    this._stdin = _stdin;
    this._stdout = _stdout;
    this._started = false;
    this._ondata = (chunk) => {
      try {
        this._readBuffer.append(chunk);
        this.processReadBuffer();
      } catch (error2) {
        this.onerror?.(error2);
        this.close().catch(() => {
        });
      }
    };
    this._onerror = (error2) => {
      this.onerror?.(error2);
    };
    this._readBuffer = new ReadBuffer({ maxBufferSize: options?.maxBufferSize });
  }
  /**
   * Starts listening for messages on stdin.
   */
  async start() {
    if (this._started) {
      throw new Error("StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.");
    }
    this._started = true;
    this._stdin.on("data", this._ondata);
    this._stdin.on("error", this._onerror);
  }
  processReadBuffer() {
    while (true) {
      try {
        const message = this._readBuffer.readMessage();
        if (message === null) {
          break;
        }
        this.onmessage?.(message);
      } catch (error2) {
        this.onerror?.(error2);
      }
    }
  }
  async close() {
    this._stdin.off("data", this._ondata);
    this._stdin.off("error", this._onerror);
    const remainingDataListeners = this._stdin.listenerCount("data");
    if (remainingDataListeners === 0) {
      this._stdin.pause();
    }
    this._readBuffer.clear();
    this.onclose?.();
  }
  send(message) {
    return new Promise((resolve) => {
      const json2 = serializeMessage(message);
      if (this._stdout.write(json2)) {
        resolve();
      } else {
        this._stdout.once("drain", resolve);
      }
    });
  }
};

// src/tools/definitions.ts
var TOOL_DEFINITIONS = [
  // ─── Pipeline guide ─────────────────────────────────────────────────────────
  {
    name: "get_pipeline_guide",
    description: "Returns the complete SDD Summary pipeline reference guide as markdown. Call this at the start of a session to get the full workflow documentation: pipeline step order, authentication, transcript fetching, evaluation modes, version management rules, deployment gate, dashboard rules, rate limiting notes, folder structure, and Genesys API facts. The server also surfaces a concise summary automatically via the MCP handshake \u2014 call this tool when you need the full details for any step.",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  // ─── Auth ───────────────────────────────────────────────────────────────────
  {
    name: "connect",
    description: "Guided setup for connecting to a Genesys Cloud org \u2014 use this when starting fresh or switching environments. Call with no arguments to be prompted for what you need. Call with authorization_url (from Genesys Admin \u2192 Integrations \u2192 OAuth \u2192 your client) to parse credentials, start the browser login, and receive step-by-step instructions. After logging in via the browser, call complete_login() to finish \u2014 it exchanges the token and runs a scope check automatically.",
    inputSchema: {
      type: "object",
      properties: {
        authorization_url: {
          type: "string",
          description: "URL from your Genesys OAuth client page. Two formats accepted:\n  \u2022 https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}\n  \u2022 https://login.{your-region}/oauth/authorize?client_id={client_id}"
        }
      },
      required: []
    }
  },
  {
    name: "configure_credentials",
    description: "ADVANCED ESCAPE HATCH \u2014 do not use for normal sign-in. `login` is the only supported way to authenticate a user; it collects the client ID and region itself, so calling this first is never required and usually sends the user down the wrong path. Use this tool only for machine-to-machine (client credentials) auth, which needs a client_secret, or to override login_url when `login` derives the wrong region host.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "OAuth2 client ID from Genesys Admin" },
        client_secret: {
          type: "string",
          description: "OAuth2 client secret \u2014 only needed for client credentials (machine) auth. Omit when using user login."
        },
        region: {
          type: "string",
          description: 'Genesys Cloud region domain, e.g. "mypurecloud.com.au", "mypurecloud.com", "mypurecloud.ie"'
        },
        login_url: {
          type: "string",
          description: "Override the login base URL (default: https://login.{region}). Provide this if login fails due to a wrong login domain. Copy from Genesys Admin \u2192 Integrations \u2192 OAuth \u2192 your client \u2014 the Authorization URL shown there (use only the base, e.g. 'https://login.{your-region}', without /oauth/authorize)."
        }
      },
      required: ["client_id", "region"]
    }
  },
  {
    name: "login",
    description: "PIPELINE STEP 1 of 4. Start the Genesys Cloud login flow (OAuth2 Authorization Code + PKCE). FIRST LOGIN: provide authorization_url \u2014 the full URL from the 'Authorization URL' field at the bottom of Genesys Admin \u2192 IT and Integrations \u2192 OAuth \u2192 your client. The client_id, region, and login domain are all extracted from it automatically. It is stored for future sessions. SUBSEQUENT LOGINS: call login() with no arguments \u2014 the stored URL is reused automatically. AFTER BROWSER LOGIN: call complete_login() to exchange the code for a token. Two URL formats accepted: the apps.* admin deep-link or the login.* OAuth authorize URL.",
    inputSchema: {
      type: "object",
      properties: {
        authorization_url: {
          type: "string",
          description: "URL from your Genesys OAuth client page. Two formats accepted:\n  \u2022 https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}\n  \u2022 https://login.{your-region}/oauth/authorize?client_id={client_id}\nFind it at Genesys Admin \u2192 Integrations \u2192 OAuth \u2192 your client."
        }
      },
      required: []
    }
  },
  {
    name: "complete_login",
    description: "PIPELINE STEP 1 of 4 (continued). Complete the Genesys Cloud login flow. Call this AFTER login() has opened the browser and the user has seen 'Logged in to Genesys Cloud \u2713'. Exchanges the authorization code for a user token, stores it, and runs the 7-scope verification automatically. NEXT STEP: if 8/8 scopes pass, call build_interaction_filter(copilot_name=...) to set up the working directory.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "logout",
    description: "Clear the stored Genesys user token. The server will fall back to client credentials on the next request.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "smoke_test_auth",
    description: "Verify all 8 required Genesys Cloud OAuth scopes are active: ai-studio, analytics, assistants, conversations, notifications, routing:readonly, speech-and-text-analytics:readonly, users:readonly. Call this after login/complete_login if you see unexpected 403 errors, or after adding scopes to your OAuth client. complete_login() runs this automatically \u2014 only call manually if troubleshooting. See docs/oauth-setup.md for the full OAuth client setup guide.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // ─── Conversations ──────────────────────────────────────────────────────────
  {
    name: "search_conversations",
    description: "Search for Genesys Cloud conversations matching the given filters. Returns conversation IDs and their communication IDs (needed for fetch_transcript). Use this to find suitable test transcripts.",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "Start of date range (ISO 8601, e.g. 2026-08-01T00:00:00Z)" },
        date_to: { type: "string", description: "End of date range (ISO 8601)" },
        queue_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of queue IDs to filter by"
        },
        wrap_up_codes: {
          type: "array",
          items: { type: "string" },
          description: "Optional wrap-up code names or IDs to filter by"
        },
        max_results: {
          type: "number",
          description: "Maximum number of results (default 25, max 100)"
        }
      },
      required: ["date_from", "date_to"]
    }
  },
  // ─── Transcripts (lifecycle-scoped) ─────────────────────────────────────────
  {
    name: "fetch_transcript",
    description: "Fetch a transcript from Genesys and store it under a summary configuration's transcript folder. transcript_type 'static' is for control-group transcripts used consistently across test runs. 'dynamic' is for transcripts that will accumulate generated summaries and edited summaries over time.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this transcript belongs to (e.g. 'Acme_Sandbox')"
        },
        conversation_id: { type: "string", description: "Genesys conversation ID" },
        transcript_type: {
          type: "string",
          enum: ["static", "dynamic"],
          description: "Where to store the transcript: 'static' for control group (default), 'dynamic' for working transcripts"
        },
        communication_id: {
          type: "string",
          description: "Optional communication ID. If omitted, auto-detected from conversation details."
        },
        label: { type: "string", description: "Optional human-readable label for this transcript" }
      },
      required: ["summary_config_name", "conversation_id"]
    }
  },
  {
    name: "store_transcript",
    description: "Save a manually provided transcript under a summary configuration's transcript folder. Use transcript_type 'static' for a permanent control-group transcript or 'dynamic' for one that will be worked on.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this transcript belongs to"
        },
        transcript: {
          type: "string",
          description: "Transcript text in 'Speaker: utterance' format, one turn per line"
        },
        transcript_type: {
          type: "string",
          enum: ["static", "dynamic"],
          description: "Storage bucket: 'static' for control group (default), 'dynamic' for working transcripts"
        },
        label: { type: "string", description: "Human-readable label for this transcript" },
        conversation_id: {
          type: "string",
          description: "Optional Genesys conversation ID for reference"
        }
      },
      required: ["summary_config_name", "transcript"]
    }
  },
  {
    name: "list_transcripts",
    description: "List transcripts stored under a summary configuration. Optionally filter by type (static or dynamic).",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration"
        },
        transcript_type: {
          type: "string",
          enum: ["static", "dynamic"],
          description: "Optional: filter to only 'static' or 'dynamic' transcripts"
        }
      },
      required: ["summary_config_name"]
    }
  },
  // ─── Summary config ─────────────────────────────────────────────────────────
  {
    name: "list_summary_settings",
    description: "List all summary configurations defined in the Genesys org.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_summary_setting",
    description: "Fetch a specific summary configuration by ID, including its current prompt and all settings.",
    inputSchema: {
      type: "object",
      properties: {
        summary_setting_id: { type: "string", description: "The summary setting ID" }
      },
      required: ["summary_setting_id"]
    }
  },
  {
    name: "create_summary_setting",
    description: "Create a new summary configuration in Genesys.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for this summary setting" },
        prompt: { type: "string", description: "The custom prompt text" },
        language: { type: "string", description: 'Language code, e.g. "en-au"', default: "en-au" },
        summary_type: {
          type: "string",
          enum: ["Concise", "Detailed", "Structured"],
          description: "Summary type (default: Concise)"
        },
        format: {
          type: "string",
          enum: ["TextBlock", "BulletPoints"],
          description: "Output format (default: TextBlock)"
        },
        predefined_insights: {
          type: "array",
          items: { type: "string", enum: ["ReasonForContact", "Resolution", "ActionItems"] },
          description: "Which predefined insights to include"
        },
        mask_pii: {
          type: "boolean",
          description: "Whether to mask all PII in the summary (default: false)"
        },
        timeout_duration: {
          type: "number",
          description: "Timeout in seconds (default: 20)"
        }
      },
      required: ["name", "prompt"]
    }
  },
  {
    name: "update_summary_setting",
    description: "\u26A0\uFE0F  LIVE DEPLOYMENT \u2014 pushes a prompt change directly to Genesys. This goes live immediately and affects all real conversations.\n\nNEVER call this tool unless the user has explicitly approved the change for deployment. Do not call proactively, do not infer approval from context \u2014 wait for an explicit instruction.\n\nREQUIRED STEPS BEFORE CALLING:\n  1. Confirm the candidate version has been evaluated (start_eval_run \u2192 finalize_eval_run) and results reviewed.\n  2. Call save_version first to snapshot the currently live prompt \u2014 this creates a rollback point.\n  3. Only then call update_summary_setting with the approved prompt.\n  4. After deploying, call save_version with status='deployed' to record the newly live state.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration. The setting ID is resolved from its interaction filter. Use this OR summary_setting_id."
        },
        summary_setting_id: {
          type: "string",
          description: "The summary setting ID to update, if you already have it."
        },
        prompt: { type: "string", description: "The new prompt text" },
        name: { type: "string", description: "Optional new name" }
      },
      required: ["prompt"]
    }
  },
  // ─── Summary generation ──────────────────────────────────────────────────────
  {
    name: "generate_preview_summary",
    description: "Generate a preview summary using the Genesys preview API. Requires a transcript (by ID or inline text) and a summarySetting definition. No production configuration is changed. Returns the generated summary text. If using a stored transcript_id, also provide summary_config_name so the transcript can be found.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration (required when using transcript_id to locate the stored transcript)"
        },
        transcript_id: {
          type: "string",
          description: "ID of a locally stored transcript (from fetch_transcript or store_transcript)"
        },
        transcript_text: {
          type: "string",
          description: "Inline transcript text (use this OR transcript_id)"
        },
        summary_setting_id: {
          type: "string",
          description: "Use a saved Genesys summary setting as the config (use this OR inline fields)"
        },
        prompt: { type: "string", description: "Custom prompt to test (required if not using summary_setting_id)" },
        language: { type: "string", description: "Language code (default: en-au)" },
        summary_type: { type: "string", description: "Summary type (default: Concise)" },
        format: { type: "string", description: "Output format (default: TextBlock)" },
        predefined_insights: {
          type: "array",
          items: { type: "string" },
          description: "Predefined insights to include"
        }
      }
    }
  },
  {
    name: "get_existing_summaries",
    description: "Retrieve summaries already generated by Genesys for a completed conversation (via Speech & Text Analytics API).",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string", description: "Genesys conversation ID" }
      },
      required: ["conversation_id"]
    }
  },
  // ─── Test cases ──────────────────────────────────────────────────────────────
  {
    name: "generate_test_case",
    description: "Generate an evaluation test case (rubric) for a specific summary configuration, based on example transcripts and their ideal summaries. Returns step-by-step authoring instructions and reference examples. IMPORTANT: the returned instructions require the agent to reason about applicability_condition for every dimension before calling save_test_case. If the agent is uncertain whether a dimension applies 'always' or only conditionally, it MUST stop and ask the user to clarify \u2014 never default to 'always' without being sure. Only call save_test_case once all applicability_conditions are confirmed.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this test case belongs to"
        },
        test_case_name: {
          type: "string",
          description: "Name for this test case (e.g. 'Order Not Resolved', 'Early Resolution')"
        },
        sample_transcript_ids: {
          type: "array",
          items: { type: "string" },
          description: "IDs of stored transcripts to base the test case on"
        },
        sample_summaries: {
          type: "array",
          items: { type: "string" },
          description: "Corresponding ideal summary texts (same order as sample_transcript_ids)"
        },
        focus_areas: {
          type: "array",
          items: { type: "string" },
          description: 'Optional areas to emphasise, e.g. ["accuracy", "brevity", "tone"]'
        }
      },
      required: ["summary_config_name", "test_case_name", "sample_transcript_ids", "sample_summaries"]
    }
  },
  {
    name: "save_test_case",
    description: "Save an evaluation test case (rubric) to a summary configuration's test-cases folder. Each test case is identified by its name and contains evaluation dimensions with pass/fail criteria. REQUIRED: every dimension must have applicability_condition set. Use 'always' for dimensions that apply to every transcript unconditionally. Use a plain-English condition string for dimensions that only apply when a specific condition is true in the transcript or summary (e.g. 'Summary contains bullets.', 'Only applies when a third party participated.'). Never call this tool with applicability_condition still set to 'always' for a dimension you are uncertain about \u2014 ask the user first.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this test case belongs to"
        },
        name: { type: "string", description: "Test case name (used as the filename, e.g. 'Order Not Resolved')" },
        description: { type: "string", description: "What scenario this test case covers" },
        dimensions: {
          type: "array",
          description: "List of evaluation dimensions",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              weight: { type: "number", description: "Importance 1\u20135" },
              applicability_condition: {
                type: "string",
                description: 'When this dimension should be evaluated. Use "always" for dimensions that apply to every transcript. Use a plain-English condition for dimensions that only apply conditionally (e.g. "Only applies when the call involves a third party"). REQUIRED on every dimension \u2014 must always be set, never omitted. Evaluators will check this condition first: if the condition is not met for a transcript, they submit score: null (N/A) which is excluded from pass-rate calculations.'
              },
              pass_criteria: { type: "string" },
              fail_criteria: { type: "string" },
              pass_threshold: { type: "number", description: "Minimum score (0\u20131) to pass this dimension. Default 0.8." },
              requirement_ids: { type: "array", items: { type: "string" }, description: 'Business requirement IDs this dimension validates, e.g. ["BR-Acme_CallSummary-001"]' }
            },
            required: ["name", "description", "weight", "applicability_condition", "pass_criteria", "fail_criteria"]
          }
        }
      },
      required: ["summary_config_name", "name", "dimensions"]
    }
  },
  {
    name: "list_test_cases",
    description: "List all test cases (evaluation rubrics) defined for a summary configuration.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration"
        }
      },
      required: ["summary_config_name"]
    }
  },
  // ─── Test sets ───────────────────────────────────────────────────────────────
  {
    name: "save_test_set",
    description: "Save a test set \u2014 a named collection of test cases and transcripts to run them against. A test set acts as a playlist: it defines which test cases and transcripts are included in an evaluation run.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this test set belongs to"
        },
        name: { type: "string", description: "Test set name (e.g. 'Core Scenarios', 'Edge Cases')" },
        description: { type: "string", description: "Optional description of this test set" },
        test_case_names: {
          type: "array",
          items: { type: "string" },
          description: "Names of test cases (from test-cases/) to include in this set"
        },
        transcript_ids: {
          type: "array",
          items: { type: "string" },
          description: "IDs of transcripts (from static/ or dynamic/) to evaluate against"
        }
      },
      required: ["summary_config_name", "name", "test_case_names", "transcript_ids"]
    }
  },
  {
    name: "list_test_sets",
    description: "List all test sets defined for a summary configuration.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration"
        }
      },
      required: ["summary_config_name"]
    }
  },
  // ─── Evaluate summary ────────────────────────────────────────────────────────
  {
    name: "evaluate_summary",
    description: "Prepare an evaluation request for a single summary against a named test case. Returns the transcript, summary, and test case dimensions formatted for the calling agent to score. After scoring, call save_eval_run to persist results.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration"
        },
        test_case_name: {
          type: "string",
          description: "Name of the test case to evaluate against"
        },
        summary_text: { type: "string", description: "The generated summary to evaluate" },
        transcript_text: {
          type: "string",
          description: "The transcript that produced the summary"
        }
      },
      required: ["summary_config_name", "test_case_name", "summary_text", "transcript_text"]
    }
  },
  // ─── Eval runs ───────────────────────────────────────────────────────────────
  {
    name: "run_test_suite",
    description: "Run a prompt against all transcripts and test cases defined in a test set, using the Genesys preview API. Generates summaries for each transcript, then returns them for the calling agent to evaluate against each test case. After evaluation, call save_eval_run to persist results to the eval-runs folder.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration to test"
        },
        test_set_name: {
          type: "string",
          description: "Name of the test set to run (defines which test cases and transcripts to use)"
        },
        prompt: { type: "string", description: "The prompt to test" },
        summary_setting_id: {
          type: "string",
          description: "Optional: base config on an existing Genesys summary setting (prompt field overrides its prompt)"
        },
        language: { type: "string", description: "Language code (default: en-au)" }
      },
      required: ["summary_config_name", "test_set_name", "prompt"]
    }
  },
  {
    name: "save_eval_run",
    description: "Persist a completed evaluation run with scores to the eval-runs folder. Call this after evaluating the results returned by run_test_suite. Results are stored as individual {test-case-name}.json files inside an incrementing run directory.",
    inputSchema: {
      type: "object",
      properties: {
        run_key: { type: "string", description: "The run_key returned by run_test_suite" },
        results: {
          type: "array",
          description: "Evaluation results \u2014 one entry per (transcript \xD7 test case) combination",
          items: {
            type: "object",
            properties: {
              transcript_id: { type: "string" },
              test_case_name: { type: "string" },
              dimension_scores: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dimension: { type: "string" },
                    passed: { type: "boolean" },
                    score: { type: "number", description: "0.0 to 1.0" },
                    reasoning: { type: "string" }
                  },
                  required: ["dimension", "passed", "score", "reasoning"]
                }
              }
            },
            required: ["transcript_id", "test_case_name", "dimension_scores"]
          }
        },
        suggested_improvements: {
          type: "string",
          description: "Optional: the agent's suggested prompt improvements based on failing dimensions"
        }
      },
      required: ["run_key", "results"]
    }
  },
  // ─── Parallel / stateless eval run (subagent-compatible) ───────────────────
  {
    name: "prepare_prompt_test",
    description: "Pre-generates preview summaries for a prompt_test eval run and caches them to disk in small batches.\n\nBecause the Genesys preview API is called per-transcript, generating all summaries for a large test set in a single start_eval_run call would exceed the MCP client timeout. This tool solves that by generating a configurable number of summaries per call and writing them to a local cache file. Call it repeatedly until complete=true, then call start_eval_run.\n\nUSAGE PATTERN:\n  1. Call prepare_prompt_test(summary_config_name, test_set_name, version_number, batch_size=8) repeatedly\n     until the response shows 'complete: YES'.\n  2. Call start_eval_run(summary_config_name, test_set_name, mode='prompt_test', version_number) \u2014\n     it will read from the cache automatically, skipping re-generation.\n\nRATE LIMIT \u2014 SAFE BATCH SIZE:\nEach preview request creates a Genesys notification channel. Channel creation is burst-sensitive: firing >= 15 concurrent requests reliably triggers 429 on channel creation. Use batch_size=8 (default). Do not exceed 10 without expecting 429 recovery overhead.\n\nThe cache is stored at eval-runs/{testSetName}/.preview-cache-v{N}.json and is safe to interrupt and resume.\nPass clear_cache=true to discard any existing cache and start fresh.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set to prepare previews for" },
        version_number: {
          type: "number",
          description: "Version number from version-history/ to use for preview generation."
        },
        batch_size: {
          type: "number",
          description: "Number of summaries to generate per call (default 8, max 10 recommended). Do not exceed 10 \u2014 the Genesys notification channel creation endpoint is burst-sensitive and reliably returns 429 when >= 15 concurrent preview requests are fired. batch_size=8 provides full parallel throughput within the safe burst threshold."
        },
        language: {
          type: "string",
          description: "Language code for preview generation (default: en-au)."
        },
        clear_cache: {
          type: "boolean",
          description: "If true, discard any existing cache for this version and start fresh."
        }
      },
      required: ["summary_config_name", "test_set_name", "version_number"]
    }
  },
  {
    name: "start_eval_run",
    description: "Prepare a parallel evaluation run against a test set.\n\nTWO MODES:\n  \u2022 mode='existing' (default) \u2014 evaluates existing production summaries already stored on each transcript. No Genesys API calls. Fast and cheap. Use to measure current production quality.\n  \u2022 mode='prompt_test' \u2014 generates new summaries via the Genesys preview API using a candidate prompt and the transcripts already in transcripts/static/. Use to test a prompt change before deploying it.\n\nVERSION TRACEABILITY \u2014 REQUIRED:\nAlways pass version_number when testing a versioned prompt. This records which version file (e.g. summary-configuration-1.json) and its status (candidate/deployed) against the run in _pending.json, and shows a version badge + the full prompt in the dashboard. Do NOT copy-paste the prompt as an inline 'prompt' argument \u2014 use version_number instead. For mode='existing', passing version_number records the deployed prompt for traceability even though no new summaries are generated.\n\nCANDIDATE VERSIONS \u2014 MANDATORY:\nA version with status='candidate' (local draft, not yet deployed to Genesys) MUST use mode='prompt_test'. Never run mode='existing' for a candidate \u2014 existing mode measures summaries the live prompt generated, not the candidate.\n\nAFTER THIS CALL:\nSpawn one subagent per batch using model composer-2.5-fast. Each subagent scores every dimension of every test case for its transcripts and calls submit_eval_scores once per transcript \xD7 test case. After all subagents finish, call finalize_eval_run.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set to evaluate" },
        mode: {
          type: "string",
          enum: ["existing", "prompt_test"],
          description: "'existing': evaluate stored production summaries. 'prompt_test': generate new summaries from a candidate prompt."
        },
        version_number: {
          type: "number",
          description: "Recommended. The version number from version-history/ to test (e.g. 1 for summary-configuration-1.json). Loads the prompt automatically and records the version number and status (candidate/deployed) against the run. For mode='prompt_test': use this instead of the prompt argument whenever testing a versioned candidate. For mode='existing': resolves the prompt that was live at the time \u2014 records it for traceability. Cannot be used together with prompt."
        },
        prompt: {
          type: "string",
          description: "Inline candidate prompt for mode='prompt_test'. Use version_number instead whenever the prompt comes from a version-history file \u2014 that records full traceability. Required when mode='prompt_test' and version_number is not provided."
        },
        batch_size: {
          type: "number",
          description: "Transcripts per batch (default 5, max 20). Each batch is handled by one subagent."
        },
        language: {
          type: "string",
          description: "Language code for preview generation when mode='prompt_test' (default: en-au)."
        }
      },
      required: ["summary_config_name", "test_set_name"]
    }
  },
  {
    name: "submit_eval_scores",
    description: "Save evaluation scores for one transcript \xD7 one test case. Called by each subagent after scoring. Stateless \u2014 only needs run_number, no in-memory state. Pass/fail per dimension is determined automatically by comparing the score against each dimension's passThreshold.\n\nBEFORE SCORING \u2014 check applicabilityCondition on every dimension (included in the test_cases payload from start_eval_run):\n  \u2022 If the condition IS met for this transcript \u2192 score normally (0.0\u20131.0)\n  \u2022 If the condition is NOT met \u2192 submit score: null (N/A)\n\nNull scores are excluded from all aggregation: overallScore, overallPassed, pass rates, and failure analysis. A null score is not a pass and not a fail \u2014 it is simply not counted. Pass rate = passes / evaluated (not passes / total). NEVER auto-pass a dimension by submitting score: 1.0 when the condition is not met \u2014 submit null.\n\nCall once per (transcript_id \xD7 test_case_name) combination.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string" },
        test_set_name: { type: "string" },
        run_number: { type: "number", description: "run_number returned by start_eval_run" },
        transcript_id: { type: "string" },
        test_case_name: { type: "string" },
        transcript_label: { type: "string", description: "Optional human-readable label for the transcript" },
        summary_text: { type: "string", description: "The summary that was evaluated (for record-keeping)" },
        dimension_scores: {
          type: "array",
          description: "One entry per dimension in the test case",
          items: {
            type: "object",
            properties: {
              dimension: { type: "string", description: "Exact dimension name from the test case" },
              score: {
                description: "Decimal 0.0\u20131.0 when the dimension applies: 0=total failure, 0.5=half pass, 1=perfect pass. null when the dimension's applicabilityCondition is not met for this transcript (N/A). Null scores are excluded from pass rates and averages \u2014 never substitute 1.0 for null."
              },
              reasoning: { type: "string", description: "Brief explanation of the score (or why the dimension is N/A)" }
            },
            required: ["dimension", "score", "reasoning"]
          }
        }
      },
      required: ["summary_config_name", "test_set_name", "run_number", "transcript_id", "test_case_name", "dimension_scores"]
    }
  },
  {
    name: "finalize_eval_run",
    description: "Aggregate all submitted scores for a run and write the final output files. Call this after ALL subagents have finished calling submit_eval_scores \u2014 do not call early.\n\nWHAT IT DOES:\nMerges intermediate per-transcript files into one {TestCaseName}.json per test case, deletes intermediates, computes overall and per-test-case pass rates and average scores, updates _pending.json, auto-generates dashboard.html (run-level) and improvements.html (test-set-level).\n\nWHAT IT RETURNS:\nA human-readable breakdown including: version tested (e.g. 'Version 1 (candidate)'), the full prompt under test, per-dimension failure analysis with sample evaluator reasoning, and explicit instructions for the improvement recommendations step.\n\nMANDATORY NEXT STEP \u2014 save_improvement_recommendations:\nAfter finalize_eval_run returns, you MUST read its output carefully and write improvements.md using the failure analysis and prompt provided. Then call save_improvement_recommendations to persist it. Do not skip this step.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string" },
        test_set_name: { type: "string" },
        run_number: { type: "number", description: "run_number returned by start_eval_run" }
      },
      required: ["summary_config_name", "test_set_name", "run_number"]
    }
  },
  {
    name: "list_eval_runs",
    description: "List historical evaluation runs for a summary configuration, showing pass rates and prompts used.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration"
        },
        test_set_name: {
          type: "string",
          description: "Optional: filter to runs for a specific test set"
        }
      },
      required: ["summary_config_name"]
    }
  },
  // ─── Version history ──────────────────────────────────────────────────────────
  {
    name: "save_version",
    description: "Snapshot a summary configuration to version-history/summary-configuration-N.json. Call this immediately BEFORE update_summary_setting to preserve the current live state as a rollback point, and again AFTER deploying with status='deployed' to record the newly live prompt.\n\nPassing summary_setting_id fetches and snapshots what is live in Genesys right now (defaults to status='deployed'). Passing prompt snapshots that text as a local draft instead (defaults to status='candidate').\n\nNOTE \u2014 a candidate that needs a changes[] evidence trail (linking each edit to the eval run that justified it) must still be written to version-history/ directly; this tool does not author that array. The version number increments automatically.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration (used as the folder name)"
        },
        summary_setting_id: {
          type: "string",
          description: "Genesys summary setting ID to fetch and snapshot. Use this OR prompt."
        },
        prompt: {
          type: "string",
          description: "Prompt text to snapshot directly (when summary_setting_id is not provided)"
        },
        language: { type: "string", description: "Language code (used when snapshotting a raw prompt)" },
        status: {
          type: "string",
          enum: ["candidate", "deployed"],
          description: "'deployed' \u2014 was live in Genesys at snapshot time. 'candidate' \u2014 a local draft not yet pushed. Defaults to 'deployed' when summary_setting_id is given, 'candidate' when only prompt is given."
        },
        notes: {
          type: "string",
          description: "Optional notes describing this version (e.g. 'Before adding edge-case handling')"
        }
      },
      required: ["summary_config_name"]
    }
  },
  {
    name: "list_versions",
    description: "List all version snapshots in version-history/ for a summary configuration. Each entry shows: version number, status (candidate = local draft / deployed = was live in Genesys), snapshot date, and notes. Use this to find the version_number to pass to start_eval_run, or to review what has been tested and deployed.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration"
        }
      },
      required: ["summary_config_name"]
    }
  },
  // ─── Post-eval improvement recommendations ───────────────────────────────────
  {
    name: "save_improvement_recommendations",
    description: "Save improvement recommendations as improvements.md inside an eval run directory. Call this IMMEDIATELY after finalize_eval_run \u2014 finalize_eval_run will instruct you exactly what to write. The content should be a markdown document covering: (1) run summary with overall pass rate and model name, (2) test case results table, (3) failing dimension analysis with root causes, (4) specific prompt improvement suggestions tailored to the model (Claude Haiku 4.5), and (5) a proposed improved prompt as a fenced code block. The model generating summaries is Claude Haiku 4.5 \u2014 prompt improvements should account for this model's tendencies: highly instruction-literal, terse by default, omits contextual detail unless explicitly told to include it, responds well to explicit output templates and numbered instruction lists. Written to: eval-runs/{testSetName}/{NNNN}/improvements.md",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set name" },
        run_number: { type: "number", description: "Eval run number (from finalize_eval_run)" },
        content: {
          type: "string",
          description: "Full markdown content for improvements.md. Must include all five sections: run summary, test case results table, failing dimension analysis, prompt improvement suggestions, and proposed improved prompt."
        }
      },
      required: ["summary_config_name", "test_set_name", "run_number", "content"]
    }
  },
  // ─── Reporting ───────────────────────────────────────────────────────────────
  {
    name: "generate_improvements_dashboard",
    description: "Generate a self-contained HTML improvements dashboard for a test set, saved as improvements.html in eval-runs/{testSetName}/. Shows all finalized runs side by side: overall pass rate trend (sparkline), per-test-case pass rates as a colour-coded table (green \u226580%, amber 50\u201379%, red <50%), delta indicators (\u2191\u2193\u2192) between consecutive runs, and links to each run's individual dashboard. Called automatically by finalize_eval_run \u2014 use this tool to regenerate without re-running.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set name" }
      },
      required: ["summary_config_name", "test_set_name"]
    }
  },
  {
    name: "generate_eval_run_dashboard",
    description: "Generate a self-contained HTML dashboard for a finalized eval run. Writes dashboard.html into the eval run directory. The dashboard shows: overall pass rate, per-test-case pass rates and scores (clickable rows), transcript-level results with dimension-by-dimension scoring and reasoning, failure themes derived from the scoring data, and prompt improvement recommendations. Called automatically by finalize_eval_run \u2014 use this tool to regenerate the dashboard without re-running.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set name" },
        run_number: { type: "number", description: "Eval run number" }
      },
      required: ["summary_config_name", "test_set_name", "run_number"]
    }
  },
  {
    name: "generate_dashboard",
    description: "Generate a self-contained HTML dashboard showing eval run history for a summary configuration. Includes per-test-case scores, summaries, prompt diffs, and improvement suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration to generate the dashboard for"
        },
        test_set_name: {
          type: "string",
          description: "Optional: filter to runs for a specific test set"
        },
        title: { type: "string", description: "Dashboard title" }
      },
      required: ["summary_config_name"]
    }
  },
  // ─── Copilot config ──────────────────────────────────────────────────────────
  {
    name: "list_assistants",
    description: "List all Agent Copilot assistants in the Genesys org.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_copilot_config",
    description: "Get the copilot configuration for a specific assistant.",
    inputSchema: {
      type: "object",
      properties: {
        assistant_id: { type: "string", description: "The assistant ID" }
      },
      required: ["assistant_id"]
    }
  },
  {
    name: "update_copilot_config",
    description: "Update the copilot configuration for an assistant (e.g. to link a new summary setting).",
    inputSchema: {
      type: "object",
      properties: {
        assistant_id: { type: "string", description: "The assistant ID" },
        config: { type: "object", description: "The full copilot configuration object" }
      },
      required: ["assistant_id", "config"]
    }
  },
  {
    name: "fetch_existing_summaries_bulk",
    description: "PIPELINE STEP 4 of 4. Enrich saved transcripts with production Genesys summaries. PREREQUISITE: fetch_transcripts_bulk must have been run first. For each transcript, calls GET /api/v2/speechandtextanalytics/conversations/{id}/summaries. Prefers summaryType 'Agent' (the configured prompt output), falling back to 'Conversation', then first available. Before/after tracking: when an agent has edited a summary, stores existingSummary (agent-edited final) and aiGeneratedSummary (original AI output). When no agent edits exist, stores only existingSummary (the AI output). Also strips any legacy rawJson from transcript files. Safe to re-run \u2014 already-enriched transcripts are skipped unless overwrite=true. NEXT STEP: call generate_test_case(summary_config_name=..., conversation_id=...) to create test cases.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "The working directory name (e.g. 'Acme_CallSummary')."
        },
        concurrency: {
          type: "number",
          description: "Number of conversations to fetch in parallel (default 5, max 10)."
        },
        overwrite: {
          type: "boolean",
          description: "If true, re-fetch summaries even for transcripts that already have one (default false)."
        }
      },
      required: ["summary_config_name"]
    }
  },
  {
    name: "fetch_transcripts_bulk",
    description: "PIPELINE STEP 3 of 4. Bulk-fetch transcripts for all relevant conversations in a date range. PREREQUISITE: build_interaction_filter must have been run first (reads queue IDs from interaction-filter.json). Filters to voice, message, callback only \u2014 email, chat, cobrowse, screenshare, video are excluded. Transcript strategy: tries STA/S3 first (works for both voice and messaging when transcription is enabled); falls back to Conversations Messages bulk API for messaging if STA fails. Stores only plainText (Speaker: utterance format, ready for preview API) \u2014 rawJson is NOT stored. Safe to re-run \u2014 already-saved conversations are skipped. NEXT STEP: immediately call fetch_existing_summaries_bulk(summary_config_name=...) to enrich with production summaries.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "The working directory name (e.g. 'Acme_CallSummary'). Must have an interaction-filter.json."
        },
        date_from: {
          type: "string",
          description: "Start of date range (ISO 8601, e.g. '2026-01-01T00:00:00Z')"
        },
        date_to: {
          type: "string",
          description: "End of date range (ISO 8601, e.g. '2026-01-31T23:59:59Z')"
        },
        max_conversations: {
          type: "number",
          description: "Maximum number of conversations to process (default 50, max 200)."
        },
        concurrency: {
          type: "number",
          description: "Number of conversations to fetch in parallel (default 5, max 10)."
        }
      },
      required: ["summary_config_name", "date_from", "date_to"]
    }
  },
  {
    name: "build_interaction_filter",
    description: "PIPELINE STEP 2 of 4. Set up the working directory for a summary configuration. Provide the Agent Copilot name (from Genesys Admin \u2192 Agent Copilot) \u2014 NOT the summary config name. The tool: (1) fetches the copilot's linked summary setting, (2) uses the summary setting's name as the working directory name, (3) calls GET /api/v2/assistants/{assistantId}/queues (the direct association endpoint \u2014 do not use routing queues API for this) to get queues, (4) resolves queue display names, (5) saves interaction-filter.json, (6) creates the FULL workspace in one shot: transcripts/static, transcripts/dynamic, test-cases, test-sets, eval-runs, version-history, requirements/artefacts, requirements/final, (7) snapshots the current summary config as version-history/summary-configuration-0.json (v0 baseline \u2014 only written once). The requirements/ folder is for capturing quality improvement inputs: drop raw artefacts (emails, screenshots, documents showing summary issues) into requirements/artefacts/, then distil them into requirements/final/requirements.md. If the copilot has multiple summary settings (multi-language), it asks which one \u2014 re-call with summary_setting_id. NEXT STEP: call fetch_transcripts_bulk(summary_config_name=..., date_from=..., date_to=...).",
    inputSchema: {
      type: "object",
      properties: {
        copilot_name: {
          type: "string",
          description: "The name of the Agent Copilot in Genesys (e.g. 'Acme_Copilot'). Provide this or copilot_id."
        },
        copilot_id: {
          type: "string",
          description: "The Genesys Agent Copilot ID (from list_assistants). Provide this or copilot_name."
        },
        summary_setting_id: {
          type: "string",
          description: "Only needed when the copilot has multiple summary settings (multi-language). Provide the ID of the one to work with."
        }
      },
      required: []
    }
  }
];

// node_modules/uuid/dist/esm/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// node_modules/uuid/dist/esm/rng.js
import { randomFillSync } from "crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// node_modules/uuid/dist/esm/native.js
import { randomUUID } from "crypto";
var native_default = { randomUUID };

// node_modules/uuid/dist/esm/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// src/tools/handlers.ts
init_config();

// src/pipelineGuide.ts
var SERVER_INSTRUCTIONS = `
SDD Summary MCP Server \u2014 Genesys Cloud AI Studio / Agent Copilot summary configuration testing pipeline.

## Pipeline (always run steps in order)
1. login() \u2192 complete_login()
2. build_interaction_filter(copilot_name="<CopilotName>")
3. fetch_transcripts_bulk(summary_config_name=..., date_from=..., date_to=..., max_conversations=...) \u2014 runs TOGETHER with step 4
4. fetch_existing_summaries_bulk(summary_config_name=...) \u2014 ALWAYS run immediately after step 3

## Evaluation Workflow
Two modes \u2014 use the same three-tool flow for both:
  start_eval_run \u2192 [subagents: submit_eval_scores \xD7 N] \u2192 finalize_eval_run

- mode: "existing"      \u2192 scores production summaries already stored (no API calls)
- mode: "prompt_test"   \u2192 generates new summaries from a candidate prompt via Genesys preview API

Spawn one subagent per batch in parallel using the Task tool with model composer-2.5-fast.
ALWAYS call save_improvement_recommendations after finalize_eval_run \u2014 do not skip this.

## Version Management \u2014 CRITICAL RULES
- save_version() only ever writes to version-history/ locally; it NEVER pushes anything to Genesys.
- NEVER call update_summary_setting (deploy) without prior prompt_test eval evidence showing improvement.
- To test a candidate: start_eval_run(mode="prompt_test", version_number=N, ...)
- To deploy after approval: update_summary_setting \u2192 then save_version with status="deployed" to record it.

## Dashboard Rules
- NEVER write dashboard HTML manually or via file tools.
- finalize_eval_run auto-generates both dashboards (run dashboard + improvements dashboard).
- To force regenerate: call generate_eval_run_dashboard or generate_improvements_dashboard.

## Test Case Authoring \u2014 applicabilityCondition (REQUIRED on every dimension)
Every dimension must have applicabilityCondition set:
- "always"           \u2192 dimension applies to every transcript unconditionally
- Plain-English string \u2192 dimension only applies when the condition is true (e.g. "Summary contains bullets.", "Only applies when a third party participated.")
When a condition is not met for a transcript, evaluators submit score: null (N/A) \u2014 excluded from all pass-rate calculations.
RULE: when authoring and uncertain whether a dimension is "always" or conditional \u2014 ask the user. Never silently default to "always".

## Eval Scoring \u2014 N/A dimensions
submit_eval_scores accepts score: null for any dimension whose applicabilityCondition is not met.
Null scores are excluded from overallScore, overallPassed, pass rates, and failure analysis.
start_eval_run includes applicability_condition on every dimension in the test_cases payload \u2014 check it first before scoring.

## Need Help?
Call get_pipeline_guide() for the complete workflow reference including API facts, schema details, and examples.
`.trim();
var FULL_PIPELINE_GUIDE = `
# SDD Summary Pipeline \u2014 Full Reference Guide

This MCP server manages the full lifecycle of Genesys Cloud AI Studio / Agent Copilot summary configuration testing: from fetching transcripts through iterating on prompts to evaluating and deploying improvements.

---

## Required OAuth Scopes (all 8)
\`ai-studio\`, \`analytics\`, \`assistants\`, \`conversations\`, \`notifications\`,
\`routing:readonly\`, \`speech-and-text-analytics:readonly\`, \`users:readonly\`

Names are exactly as they appear in the Genesys scope picker. Three are
\`:readonly\` because this server only reads from those APIs.

Run \`smoke_test_auth()\` after login to verify.

---

## Step 1 \u2014 Authentication

### First run: ask before explaining

If nothing is stored yet, ask one question and wait \u2014 do not recite setup steps at
a user who already has a client:

> "Do you already have a Genesys Cloud OAuth client set up for this?"

**Yes** \u2192 ask for the Authorization URL (Genesys Admin \u2192 IT and Integrations \u2192
OAuth \u2192 open the client \u2192 bottom of the page), then pass it through verbatim:
\`\`\`
login(authorization_url="<whatever they pasted>")
\`\`\`

**Do not reject or rewrite what they paste.** Both of these are valid:
- \`https://apps.{region}/directory/#/admin/access-management/authorized-apps/{id}\`
  \u2014 what the Genesys UI field usually contains
- \`https://login.{region}/oauth/authorize?client_id={id}\`

The first looks nothing like an authorize URL but is correct. Let \`login()\` decide.

**No** \u2192 walk them through it one step at a time, confirming as you go:

1. Genesys Admin \u2192 Integrations \u2192 OAuth \u2192 Add Client. Grant Type
   **Code Authorization**, Redirect URI \`http://localhost:8787/callback\`
   (exact match required). No client secret needed \u2014 PKCE.
2. Scope tab: add all 8 \u2014 \`ai-studio\`, \`analytics\`, \`assistants\`,
   \`conversations\`, \`notifications\`, \`routing:readonly\`,
   \`speech-and-text-analytics:readonly\`, \`users:readonly\`.
3. Save, reopen, copy the **Authorization URL** from the bottom, then call
   \`login(authorization_url="...")\`.

**All subsequent logins** \u2014 the URL is stored, no argument needed:
\`\`\`
login()
\`\`\`

After the browser confirms login, call:
\`\`\`
complete_login()
\`\`\`

### Auth gotchas
- Tokens last ~30 min. On expiry, any API call auto-reopens the browser \u2014 log in and retry.
- If \`login()\` uses the wrong org (wrong \`client_id\`), an env var (\`GENESYS_CLIENT_ID\`) may be shadowing the stored config. Re-run \`login()\` with no args to use the stored \`lastAuthorizationUrl\`.

---

## Step 2 \u2014 Interaction Filter

\`\`\`
build_interaction_filter(copilot_name="Acme_Copilot")
\`\`\`

- Takes the **Agent Copilot name** (from Genesys Admin \u2192 Agent Copilot), not the summary config name.
- Names the working directory after the **summary config name** (fetched from \`getSummarySetting\`).
- Saves to \`.summaryconfig-lifecycle/{summaryConfigName}/interaction-filter.json\`.
- If the copilot has multiple summary settings (multi-language), re-call with \`summary_setting_id=...\`.

---

## Step 3 \u2014 Bulk Fetch Transcripts

\`\`\`
fetch_transcripts_bulk(
  summary_config_name="Acme_CallSummary",
  date_from="2026-01-01T00:00:00Z",
  date_to="2026-01-31T23:59:59Z",
  max_conversations=100,
  concurrency=5
)
\`\`\`

- Reads queue IDs from \`interaction-filter.json\` automatically \u2014 do **not** pass queue IDs manually.
- Included media types: \`voice\`, \`message\`, \`callback\`. Excluded: \`email\`, \`chat\`, \`cobrowse\`, \`screenshare\`, \`video\`.
- Safe to re-run \u2014 already-saved conversations are skipped.
- **Always run Step 3 and Step 4 together.**

---

## Step 4 \u2014 Enrich with Existing Summaries

\`\`\`
fetch_existing_summaries_bulk(
  summary_config_name="Acme_CallSummary",
  concurrency=5
)
\`\`\`

- Fetches existing summaries from Genesys STA for every stored transcript.
- Summary selection: prefers \`summaryType: "Agent"\` (configured prompt output), falls back to \`"Conversation"\`, then first available.
- Before/after detection: when both \`generated: false\` (agent-edited) and \`generated: true\` (AI output) exist, stores:
  - \`existingSummary\` = agent-edited version (the "after")
  - \`aiGeneratedSummary\` = original AI output (the "before")
- Safe to re-run \u2014 already-enriched transcripts are skipped unless \`overwrite=true\`.

---

## Stored Transcript Schema

After steps 3 + 4, each file in \`transcripts/static/\` looks like:

\`\`\`json
{
  "id": "<conversationId>",
  "conversationId": "<conversationId>",
  "communicationId": "<commId>",
  "plainText": "Agent: ...\\nCustomer: ...",
  "existingSummary": "...",
  "aiGeneratedSummary": "...",
  "createdAt": "..."
}
\`\`\`

---

## Requirements

- Live in \`requirements/final/requirements.md\` using IDs: \`BR-{SummaryConfigName}-{NNN}\`
- Raw artefacts (emails, QA feedback, complaint logs) go in \`requirements/artefacts/\`
- **\`settingType: "Prompt"\` \u2014 the \`prompt\` field is the sole source of instructions.** All other config fields are platform metadata \u2014 ignore them when deriving requirements or authoring test cases.

---

## Test Cases

- One test case per requirement category; file name: \`{Category}-{DescriptiveName}.json\` in \`test-cases/\`
- Each dimension references \`requirementIds: ["BR-..."]\` for traceability
- Scores are decimal **0\u20131** (0 = total failure, 1 = perfect pass)
- \`passThreshold\` sets the minimum score \u2014 use \`1.0\` for binary must/must-not rules, \`0.8\` for coverage and style rules
- \`passCriteria\` must describe the scoring gradient with anchor points
- Every \`BR-\` ID in requirements must be covered by at least one dimension

### applicabilityCondition \u2014 required on every dimension

Every dimension **must** have an \`applicabilityCondition\` field. It controls when the dimension is evaluated:

- **\`"always"\`** \u2014 evaluate unconditionally against every transcript (the default for most dimensions)
- **Any other string** \u2014 a plain-English condition describing when the dimension applies; if the condition is not met for a particular transcript, the evaluator must submit \`score: null\` (N/A)

**N/A scoring rules:**
- Evaluators check \`applicabilityCondition\` first; if the condition is not met they submit \`score: null\`, NOT \`score: 1.0\`
- Null scores are excluded from pass-rate and average-score calculations entirely
- A dimension that is N/A for a transcript does **not** count as a pass or a fail \u2014 it is simply not counted
- This means pass-rate = passes / evaluated (not passes / total), keeping conditional dimension stats honest

**Example \u2014 conditional dimension (third party present):**
\`\`\`json
{
  "name": "Third-party role stated",
  "applicabilityCondition": "Only applies when a third party (non-customer, non-agent) participated in the interaction.",
  "passCriteria": "Score 1.0: third-party relationship clearly stated. Score 0 if third party is present but unacknowledged.",
  "passThreshold": 0.8
}
\`\`\`

**Example \u2014 conditional dimension (structural prerequisite):**
\`\`\`json
{
  "name": "Section spacing correct",
  "applicabilityCondition": "Summary contains at least 2 sections.",
  "passCriteria": "Score 1.0: every pair of adjacent sections is separated by a blank line.",
  "passThreshold": 0.8
}
\`\`\`

### Authoring rule \u2014 when to ask the user

When creating test cases via \`generate_test_case\`:
- If it is **obvious** that a dimension applies universally \u2192 set \`"always"\`
- If a structural or content prerequisite is required \u2192 write the condition explicitly
- If **uncertain** \u2192 **stop and ask the user** before calling \`save_test_case\`. Never silently default to \`"always"\`.

This keeps conditions intentional and prevents silent N/A mis-scoring in future eval runs.

---

## Test Sets

- File: \`test-sets/{SummaryConfigName}-{DescriptiveName}.json\`
- \`testCaseNames\` = list of test case filenames (no \`.json\`); \`transcriptIds\` = IDs from \`transcripts/static/\`
- Standard full suite: all test cases \xD7 all static transcripts, named \`{ConfigName}-Full-Test-Suite\`

---

## Running Evaluations

Two modes \u2014 same flow (with a required pre-step for prompt_test):

\`\`\`
[prepare_prompt_test \xD7 N calls]  \u2192  start_eval_run  \u2192  [subagents: submit_eval_scores \xD7 N]  \u2192  finalize_eval_run
      (prompt_test only)
\`\`\`

### Mode 1 \u2014 Evaluate existing summaries (mode: "existing")
- Reads \`existingSummary\` already stored on each transcript \u2014 no API calls
- Use to measure current production quality

### Mode 2 \u2014 Test a candidate prompt (mode: "prompt_test")
- Provide \`version_number=N\` to load a saved candidate version (preferred) or \`prompt="..."\` for an inline prompt
- Generates new summaries via Genesys preview API
- **MUST use this mode when testing candidate versions \u2014 never deploy without prompt_test evidence**

**IMPORTANT \u2014 use \`prepare_prompt_test\` before \`start_eval_run\` for any test set larger than ~10 transcripts.**
Generating all previews in a single \`start_eval_run\` call exceeds the MCP client timeout.
The safe pattern:
\`\`\`
# 1. Build the preview cache \u2014 repeat until complete: YES
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=1,
  batch_size=8        \u2190 do not exceed 10; see Rate Limiting section
)
# 2. Start the eval \u2014 reads from cache, makes no API calls
start_eval_run(summary_config_name=..., test_set_name=..., mode="prompt_test", version_number=1)
\`\`\`

### Subagent setup
- \`start_eval_run\` returns \`run_number\`, \`total_batches\`, \`batches\`, and \`test_cases\`
- Spawn **one subagent per batch** using model \`composer-2.5-fast\`
- Each subagent calls \`submit_eval_scores(run_number, transcript_id, test_case_name, dimension_scores)\` once per transcript \xD7 test case
- Scores: decimal 0\u20131 (0 = total failure, 0.5 = half pass, 1 = perfect); submit \`score: null\` when a dimension's \`applicabilityCondition\` is not met for the transcript \u2014 null scores are excluded from all aggregation
- After all subagents complete, call \`finalize_eval_run(run_number)\`

### Post-eval
- **ALWAYS call \`save_improvement_recommendations\` after \`finalize_eval_run\`** \u2014 do not skip.
- Read \`finalize_eval_run\`'s full response \u2014 it includes the prompt under test, per-dimension failure analysis, and explicit instructions for what to write.
- Analyse failures by dimension, identify root causes, write \`improvements.md\` using the structure below.
- Call \`save_improvement_recommendations(summary_config_name, test_set_name, run_number, content)\` to persist it.

---

## improvements.md \u2014 Required Structure

Every \`improvements.md\` must include all five sections:

\`\`\`markdown
# Prompt Improvement Recommendations \u2014 Run {NNNN}

**Summary config:** {configName}
**Test set:** {testSetName}
**Model:** Claude Haiku 4.5
**Run date:** {date}
**Mode:** {existing summaries | prompt test}
**Overall pass rate:** {X}%

---

## Test Case Results

| Test Case | Pass Rate | Avg Score | Status |
|---|---|---|---|
| ... | ...% | 0.XX | \u2705 / \u274C |

---

## Failing Dimension Analysis

### {TestCaseName} \u2014 {DimensionName} ({passRate}% pass)

**What it tests:** {from passCriteria}
**Failure pattern:** {synthesized from the evaluator reasoning samples}
**Root cause in prompt:** {what the prompt is missing or stating ambiguously}

[repeat for each failing dimension]

---

## Prompt Improvement Suggestions

### 1. {Descriptive title for change}

**Why:** {link to the failure pattern above}
**Change:** Add / modify / remove the following in the prompt:

> {specific text, as it should appear in the prompt}

**Claude Haiku 4.5 note:** {any model-specific consideration}

[repeat for each suggestion]

---

## Proposed Improved Prompt

\\\`\\\`\\\`
{complete revised prompt text}
\\\`\\\`\\\`
\`\`\`

---

## Claude Haiku 4.5 \u2014 Model Characteristics

The Genesys Cloud AI Studio model is **Claude Haiku 4.5** (constant \`SUMMARY_MODEL_NAME\` in \`config.ts\`).
All prompt improvement work must be tailored to this model's characteristics:

| Characteristic | Implication for prompts |
|---|---|
| **Highly instruction-literal** | If the prompt doesn't say to include something, it won't appear. Add explicit "You MUST include..." clauses for required elements. |
| **Terse by default** | State length and detail requirements explicitly (e.g. "Write 3\u20135 sentences", "Include at least one example"). |
| **Omits contextual detail** | Must be explicitly told to include reasons, context, or elaboration \u2014 it will not infer them. |
| **Responds well to explicit output templates** | Provide a concrete structure with labelled sections rather than describing the structure in prose. |
| **Responds well to numbered instruction lists** | Sequential "You MUST..." clauses are more reliably followed than open-ended guidance. |
| **Avoids inference** | State expected behaviour explicitly \u2014 it will not infer what the agent "should" do from context. |

---

## Version Management

### Creating a candidate version

\`save_version(summary_config_name=..., prompt=...)\` records a local draft (status defaults to \`candidate\`), but it cannot
write the \`changes[]\` evidence trail. Since every candidate should carry that trail, author the file directly instead \u2014
write the JSON to \`version-history/summary-configuration-N.json\`:

\`\`\`json
{
  "version": 1,
  "status": "candidate",
  "setting": {
    "prompt": "<full revised prompt text>"
  },
  "notes": "Candidate version \u2014 NOT yet deployed.",
  "snapshotAt": "<ISO timestamp>",
  "changes": [
    {
      "change": "Description of what changed",
      "affectedDimension": "TestCaseName / DimensionName",
      "runEvidence": "X/Y transcripts failed in run NNNN. Description of failure pattern.",
      "reason": "Why this specific change addresses the failure for Claude Haiku 4.5."
    }
  ]
}
\`\`\`

- \`status: "candidate"\` marks it as a local draft \u2014 it will never be pushed to Genesys automatically
- The \`changes\` array records the evidence trail: which eval run exposed the issue and why the change addresses it
- Version numbering must not skip: if \`summary-configuration-0.json\` exists, the next candidate is \`summary-configuration-1.json\`

### Testing a candidate
\`\`\`
# Step 1 \u2014 build preview cache (repeat until complete: YES, use batch_size=8)
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=2,
  batch_size=8
)
# Step 2 \u2014 start eval run (reads cache, no API calls)
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  mode="prompt_test",
  version_number=2
)
\`\`\`
- Loads the prompt from the version file automatically \u2014 do not re-paste it
- For test sets \u2264 10 transcripts, a single \`prepare_prompt_test\` call is sufficient before \`start_eval_run\`

### Deploying (only after approval)
1. Review eval results \u2014 candidate must show measurable improvement
2. Get explicit user approval before deploying
3. \`save_version(summary_config_name=..., summary_setting_id=...)\` \u2014 snapshots the still-live prompt as the rollback point
4. \`update_summary_setting(summary_config_name=..., prompt=...)\` \u2014 pushes to Genesys (resolves the setting ID from the interaction filter)
5. \`save_version(summary_config_name=..., prompt=..., status="deployed")\` \u2014 records the newly live state

**NEVER call \`update_summary_setting\` without prior prompt_test eval evidence and user approval.**

---

## Dashboard Rules (MANDATORY)

| Dashboard | Tool | Location |
|---|---|---|
| Run dashboard | auto via \`finalize_eval_run\` | \`eval-runs/{testSet}/{NNNN}/dashboard.html\` |
| Improvements dashboard | auto via \`finalize_eval_run\` | \`eval-runs/{testSet}/improvements.html\` |

- **NEVER generate dashboard HTML manually** \u2014 always use \`generate_eval_run_dashboard\` or \`generate_improvements_dashboard\`
- Both are called automatically by \`finalize_eval_run\` \u2014 only call them explicitly to force regeneration

---

## Rate Limiting

All Genesys API calls go through automatic retry with jitter. You do not need to do anything special.

| Response | Action |
|---|---|
| \`429 Too Many Requests\` | Reads \`Retry-After\` header, adds \xB130% random jitter, sleeps, retries \u2014 up to **4 times** |
| \`5xx\` **with** \`Retry-After\` | Same wait + retry \u2014 up to **2 times** |
| \`5xx\` **without** \`Retry-After\` | Throws immediately (Genesys docs say do not auto-retry these) |
| Retries exhausted | Throws \`GenesysApiError\` with a clear message |

Every retry logs to stderr: \`[rate-limit] 429 on GET /api/v2/... \u2014 waiting 12.3s (retry 1/4)\`

### Preview API \u2014 confirmed limits

- **\`token.rate.per.minute\`: 300** across all API calls for the authenticated token
- **Notification channel burst sensitivity:** each preview request creates a short-lived notification channel. Firing \u2265 15 concurrent preview requests reliably triggers \`429 Failed to create notification channel\`, independent of the per-minute token budget.
- **Safe \`batch_size\` for \`prepare_prompt_test\`: 8.** Do not exceed 10. The retry logic will recover from a channel 429, but staying at 8 avoids the overhead entirely.
- Long pauses during bulk operations are normal \u2014 the server is honouring Genesys \`Retry-After\` headers. Do not cancel or restart.
- \`Retry-After\` values from Genesys are in seconds. Typical value is 10\u201330 s; the cap in code is 65 s (including jitter).

---

## Lifecycle Folder Structure

\`\`\`
.summaryconfig-lifecycle/
\u2514\u2500\u2500 {summaryConfigName}/
    \u251C\u2500\u2500 interaction-filter.json
    \u251C\u2500\u2500 requirements/
    \u2502   \u251C\u2500\u2500 artefacts/
    \u2502   \u2514\u2500\u2500 final/
    \u2502       \u2514\u2500\u2500 requirements.md
    \u251C\u2500\u2500 transcripts/
    \u2502   \u2514\u2500\u2500 static/
    \u251C\u2500\u2500 test-cases/
    \u251C\u2500\u2500 test-sets/
    \u251C\u2500\u2500 version-history/
    \u2502   \u2514\u2500\u2500 summary-configuration-{N}.json
    \u2514\u2500\u2500 eval-runs/
        \u2514\u2500\u2500 {test-set-name}/
            \u251C\u2500\u2500 improvements.html
            \u2514\u2500\u2500 {NNNN}/
                \u251C\u2500\u2500 _pending.json
                \u251C\u2500\u2500 {TestCaseName}.json
                \u251C\u2500\u2500 dashboard.html
                \u2514\u2500\u2500 improvements.md
\`\`\`

---

## Key API Facts

| Concern | Correct API |
|---|---|
| List assistants | \`GET /api/v2/assistants?tier=Copilot&pageSize=200\` \u2014 the \`tier\` filter is required; querying unfiltered returned 500 in a large org. 200 is the documented \`pageSize\` max |
| Queues for an assistant | \`GET /api/v2/assistants/{assistantId}/queues\` (cursor pagination with \`after\`/\`nextUri\`) |
| Queue display names | \`GET /api/v2/routing/queues?id=id1&id=id2...\` |
| Voice transcript URL | \`GET /api/v2/speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls\` |
| Messaging messages | \`GET /api/v2/conversations/messages/{id}\` + \`POST .../messages/bulk?useNormalizedMessage=true\` |
| Existing summaries | \`GET /api/v2/speechandtextanalytics/conversations/{id}/summaries\` |
| Summary settings | \`GET /api/v2/conversations/summaries/settings\` |
| Analytics filter operators | Only \`matches\`, \`exists\`, \`notExists\` \u2014 \`notMatches\` is NOT supported |
| Analytics date range limit | 7 days max per query window |
`.trim();

// src/tools/handlers.ts
init_auth();

// src/storage.ts
init_config();
import fs2 from "fs";
import path2 from "path";
function ensureDir(d) {
  if (!fs2.existsSync(d)) fs2.mkdirSync(d, { recursive: true });
  return d;
}
function writeJson(p, data) {
  fs2.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}
function readJson(p) {
  return JSON.parse(fs2.readFileSync(p, "utf-8"));
}
function listJsonFiles(dir) {
  if (!fs2.existsSync(dir)) return [];
  return fs2.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => f.replace(/\.json$/, ""));
}
function legacyDir(subdir) {
  return ensureDir(path2.join(getStorageDir(), subdir));
}
function legacyDashboardsDir() {
  return legacyDir("dashboards");
}
function saveDashboard(id, html) {
  const d = legacyDashboardsDir();
  const p = path2.join(d, `${id}.html`);
  fs2.writeFileSync(p, html, "utf-8");
  return p;
}
function lifecycleConfigDir(configName) {
  return ensureDir(path2.join(getLifecycleDir(), configName));
}
function lcDir(configName, subdir) {
  return ensureDir(path2.join(lifecycleConfigDir(configName), subdir));
}
function staticTranscriptsDir(configName) {
  return lcDir(configName, "transcripts/static");
}
function dynamicTranscriptsDir(configName) {
  return lcDir(configName, "transcripts/dynamic");
}
function testCasesDir(configName) {
  return lcDir(configName, "test-cases");
}
function testSetsDir(configName) {
  return lcDir(configName, "test-sets");
}
function versionHistoryDir(configName) {
  return lcDir(configName, "version-history");
}
function requirementsArtefactsDir(configName) {
  return lcDir(configName, "requirements/artefacts");
}
function requirementsFinalDir(configName) {
  return lcDir(configName, "requirements/final");
}
function ensureAllLifecycleDirs(configName) {
  staticTranscriptsDir(configName);
  dynamicTranscriptsDir(configName);
  testCasesDir(configName);
  testSetsDir(configName);
  evalRunsBaseDir(configName);
  versionHistoryDir(configName);
  requirementsArtefactsDir(configName);
  requirementsFinalDir(configName);
}
function saveInitialVersionSnapshot(configName, setting) {
  const d = versionHistoryDir(configName);
  const v0Path = path2.join(d, "summary-configuration-0.json");
  if (fs2.existsSync(v0Path)) return null;
  const snapshot = {
    version: 0,
    setting,
    notes: "Initial snapshot \u2014 captured automatically when workspace was created.",
    snapshotAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeJson(v0Path, snapshot);
  return snapshot;
}
function evalRunsBaseDir(configName) {
  return lcDir(configName, "eval-runs");
}
function evalRunsTestSetDir(configName, testSetName) {
  return ensureDir(path2.join(evalRunsBaseDir(configName), testSetName));
}
function evalRunDir(configName, testSetName, runNumber) {
  return ensureDir(path2.join(evalRunsTestSetDir(configName, testSetName), String(runNumber).padStart(4, "0")));
}
function previewCachePath(configName, testSetName, versionNumber) {
  return path2.join(evalRunsTestSetDir(configName, testSetName), `.preview-cache-v${versionNumber}.json`);
}
function loadPreviewCache(configName, testSetName, versionNumber) {
  const p = previewCachePath(configName, testSetName, versionNumber);
  return fs2.existsSync(p) ? readJson(p) : {};
}
function savePreviewCache(configName, testSetName, versionNumber, cache) {
  writeJson(previewCachePath(configName, testSetName, versionNumber), cache);
}
function clearPreviewCache(configName, testSetName, versionNumber) {
  const p = previewCachePath(configName, testSetName, versionNumber);
  if (fs2.existsSync(p)) fs2.unlinkSync(p);
}
function saveLifecycleTranscript(configName, transcript) {
  const dir = transcript.transcriptType === "dynamic" ? dynamicTranscriptsDir(configName) : staticTranscriptsDir(configName);
  writeJson(path2.join(dir, `${transcript.id}.json`), transcript);
}
function getLifecycleTranscript(configName, id) {
  for (const dir of [staticTranscriptsDir(configName), dynamicTranscriptsDir(configName)]) {
    const p = path2.join(dir, `${id}.json`);
    if (fs2.existsSync(p)) return readJson(p);
  }
  return null;
}
function listLifecycleTranscripts(configName, type) {
  const dirs = [];
  if (!type || type === "static") dirs.push(() => staticTranscriptsDir(configName));
  if (!type || type === "dynamic") dirs.push(() => dynamicTranscriptsDir(configName));
  const all = [];
  for (const getDir of dirs) {
    const d = getDir();
    listJsonFiles(d).forEach((id) => {
      all.push(readJson(path2.join(d, `${id}.json`)));
    });
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function updateDynamicTranscript(configName, transcript) {
  const p = path2.join(dynamicTranscriptsDir(configName), `${transcript.id}.json`);
  if (!fs2.existsSync(p)) throw new Error(`Dynamic transcript not found: ${transcript.id}`);
  writeJson(p, transcript);
}
function saveTestCase(configName, testCase) {
  writeJson(path2.join(testCasesDir(configName), `${testCase.name}.json`), testCase);
}
function getTestCase(configName, name) {
  const p = path2.join(testCasesDir(configName), `${name}.json`);
  if (!fs2.existsSync(p)) return null;
  return readJson(p);
}
function listTestCases(configName) {
  const d = testCasesDir(configName);
  return listJsonFiles(d).map((name) => readJson(path2.join(d, `${name}.json`))).sort((a, b) => a.name.localeCompare(b.name));
}
function saveTestSet(configName, testSet) {
  writeJson(path2.join(testSetsDir(configName), `${testSet.name}.json`), testSet);
}
function getTestSet(configName, name) {
  const p = path2.join(testSetsDir(configName), `${name}.json`);
  if (!fs2.existsSync(p)) return null;
  return readJson(p);
}
function listTestSets(configName) {
  const d = testSetsDir(configName);
  return listJsonFiles(d).map((name) => readJson(path2.join(d, `${name}.json`))).sort((a, b) => a.name.localeCompare(b.name));
}
function getNextRunNumber(configName, testSetName) {
  const d = evalRunsTestSetDir(configName, testSetName);
  const existing = fs2.readdirSync(d).filter((f) => fs2.statSync(path2.join(d, f)).isDirectory()).map((f) => parseInt(f, 10)).filter((n) => !isNaN(n));
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}
function saveEvalRun(configName, testSetName, runNumber, meta, results) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  writeJson(path2.join(dir, "_meta.json"), meta);
  for (const result of results) {
    writeJson(path2.join(dir, `${result.testCaseName}.json`), result);
  }
}
function getEvalRunResults(configName, testSetName, runNumber) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  if (!fs2.existsSync(dir)) return [];
  return fs2.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).flatMap((f) => {
    const parsed = readJson(path2.join(dir, f));
    return Array.isArray(parsed.results) ? parsed.results : [parsed];
  });
}
function listEvalRuns(configName, testSetName) {
  const baseDir = evalRunsBaseDir(configName);
  if (!fs2.existsSync(baseDir)) return [];
  const testSets = testSetName ? [testSetName] : fs2.readdirSync(baseDir).filter((f) => fs2.statSync(path2.join(baseDir, f)).isDirectory());
  const runs = [];
  for (const ts of testSets) {
    const tsDir = path2.join(baseDir, ts);
    if (!fs2.existsSync(tsDir)) continue;
    const runDirs = fs2.readdirSync(tsDir).filter((f) => fs2.statSync(path2.join(tsDir, f)).isDirectory()).sort();
    for (const rDir of runDirs) {
      const runNumber = parseInt(rDir, 10);
      const metaPath = path2.join(tsDir, rDir, "_meta.json");
      if (fs2.existsSync(metaPath)) {
        const meta = readJson(metaPath);
        runs.push({ ...meta, runNumber });
        continue;
      }
      const pendingPath = path2.join(tsDir, rDir, "_pending.json");
      if (fs2.existsSync(pendingPath)) {
        const pending = readJson(pendingPath);
        if (!pending.finalizedAt) continue;
        const prompt = pending.promptText ?? "";
        runs.push({
          runNumber,
          testSetName: pending.testSetName,
          summaryConfigName: pending.summaryConfigName,
          prompt,
          // This flow stores only the prompt text, not a full setting. Synthesize a
          // minimal one so consumers reading `summarySetting.prompt` still work.
          summarySetting: {
            name: pending.testSetName,
            prompt,
            language: "en-au",
            summaryType: "Concise",
            format: "TextBlock",
            maskPII: { all: false },
            predefinedInsights: [],
            settingType: "Prompt",
            serviceType: "Native",
            timeoutDuration: 20
          },
          transcriptIds: pending.transcriptIds,
          testCaseNames: pending.testCaseNames,
          aggregatePassRate: pending.aggregatePassRate ?? 0,
          createdAt: pending.startedAt
        });
      }
    }
  }
  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function createPendingEvalRun(configName, testSetName, meta) {
  const runNumber = getNextRunNumber(configName, testSetName);
  const full = { ...meta, runNumber };
  const dir = evalRunDir(configName, testSetName, runNumber);
  writeJson(path2.join(dir, "_pending.json"), full);
  return full;
}
function getPendingEvalRun(configName, testSetName, runNumber) {
  const p = path2.join(evalRunDir(configName, testSetName, runNumber), "_pending.json");
  if (!fs2.existsSync(p)) return null;
  return readJson(p);
}
function saveEvalScore(configName, testSetName, runNumber, result) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const filename = `${result.transcriptId}__${result.testCaseName}.json`;
  writeJson(path2.join(dir, filename), result);
}
function getEvalScores(configName, testSetName, runNumber) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  if (!fs2.existsSync(dir)) return [];
  return fs2.readdirSync(dir).filter((f) => f.endsWith(".json") && f.includes("__")).map((f) => readJson(path2.join(dir, f)));
}
function mergeEvalScoresToTestCaseFiles(configName, testSetName, runNumber, testCaseNames) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const all = getEvalScores(configName, testSetName, runNumber);
  const merged = [];
  for (const testCaseName of testCaseNames) {
    const results = all.filter((r) => r.testCaseName === testCaseName);
    if (results.length === 0) continue;
    const passRate = results.filter((r) => r.overallPassed).length / results.length;
    const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const file = {
      testCaseName,
      totalTranscripts: results.length,
      passRate,
      averageScore,
      results
    };
    writeJson(path2.join(dir, `${testCaseName}.json`), file);
    merged.push(file);
  }
  fs2.readdirSync(dir).filter((f) => f.includes("__") && f.endsWith(".json")).forEach((f) => fs2.unlinkSync(path2.join(dir, f)));
  return merged;
}
function finalizePendingEvalRun(configName, testSetName, runNumber, aggregatePassRate, testCasePassRates) {
  const p = path2.join(evalRunDir(configName, testSetName, runNumber), "_pending.json");
  if (!fs2.existsSync(p)) return;
  const meta = readJson(p);
  meta.finalizedAt = (/* @__PURE__ */ new Date()).toISOString();
  meta.aggregatePassRate = aggregatePassRate;
  meta.testCasePassRates = testCasePassRates;
  writeJson(p, meta);
}
function readAllFinalizedRunMetas(configName, testSetName) {
  const tsDir = path2.join(evalRunsBaseDir(configName), testSetName);
  if (!fs2.existsSync(tsDir)) return [];
  return fs2.readdirSync(tsDir).filter((f) => fs2.statSync(path2.join(tsDir, f)).isDirectory()).sort().map((d) => {
    const p = path2.join(tsDir, d, "_pending.json");
    if (!fs2.existsSync(p)) return null;
    const meta = readJson(p);
    return meta.finalizedAt ? meta : null;
  }).filter((m) => m !== null);
}
function saveImprovementsDashboard(configName, testSetName, html) {
  const tsDir = evalRunsTestSetDir(configName, testSetName);
  const filePath = path2.join(tsDir, "improvements.html");
  fs2.writeFileSync(filePath, html, "utf-8");
  return filePath;
}
function saveImprovementRecommendations(configName, testSetName, runNumber, markdown) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const filePath = path2.join(dir, "improvements.md");
  fs2.writeFileSync(filePath, markdown, "utf-8");
  return filePath;
}
function saveEvalRunDashboard(configName, testSetName, runNumber, html) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const filePath = path2.join(dir, "dashboard.html");
  fs2.writeFileSync(filePath, html, "utf-8");
  return filePath;
}
function readFinalizedEvalRun(configName, testSetName, runNumber) {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const metaPath = path2.join(dir, "_pending.json");
  if (!fs2.existsSync(metaPath)) return null;
  const meta = readJson(metaPath);
  if (!meta.finalizedAt) return null;
  const testCaseFiles = meta.testCaseNames.map((name) => {
    const p = path2.join(dir, `${name}.json`);
    return fs2.existsSync(p) ? readJson(p) : null;
  }).filter((f) => f !== null);
  return { meta, testCaseFiles };
}
function getLatestVersionNumber(configName) {
  const d = versionHistoryDir(configName);
  const existing = listJsonFiles(d).map((name) => {
    const match = name.match(/summary-configuration-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }).filter((n) => n > 0);
  return existing.length === 0 ? 0 : Math.max(...existing);
}
function saveVersionSnapshot(configName, setting, notes, status) {
  const version2 = getLatestVersionNumber(configName) + 1;
  const snapshot = {
    version: version2,
    status,
    setting,
    notes,
    snapshotAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const d = versionHistoryDir(configName);
  writeJson(path2.join(d, `summary-configuration-${version2}.json`), snapshot);
  return snapshot;
}
function listVersionSnapshots(configName) {
  const d = versionHistoryDir(configName);
  return listJsonFiles(d).filter((name) => name.startsWith("summary-configuration-")).map((name) => readJson(path2.join(d, `${name}.json`))).sort((a, b) => a.version - b.version);
}
function saveInteractionFilter(configName, filter) {
  const filePath = path2.join(lifecycleConfigDir(configName), "interaction-filter.json");
  fs2.writeFileSync(filePath, JSON.stringify(filter, null, 2));
}
function loadInteractionFilter(configName) {
  const filePath = path2.join(lifecycleConfigDir(configName), "interaction-filter.json");
  if (!fs2.existsSync(filePath)) return null;
  return JSON.parse(fs2.readFileSync(filePath, "utf-8"));
}

// src/genesys/analytics.ts
init_client();
async function searchConversations(params) {
  const filters = [];
  if (params.queueIds?.length) {
    filters.push({
      type: "or",
      predicates: params.queueIds.map((id) => ({
        type: "dimension",
        dimension: "queueId",
        operator: "matches",
        value: id
      }))
    });
  }
  if (params.wrapUpCodes?.length) {
    filters.push({
      type: "or",
      predicates: params.wrapUpCodes.map((code) => ({
        type: "dimension",
        dimension: "wrapUpCode",
        operator: "matches",
        value: code
      }))
    });
  }
  if (params.includeMediaTypes?.length) {
    filters.push({
      type: "or",
      predicates: params.includeMediaTypes.map((t) => ({
        type: "dimension",
        dimension: "mediaType",
        operator: "matches",
        value: t
      }))
    });
  }
  const body = {
    interval: `${params.dateFrom}/${params.dateTo}`,
    order: "desc",
    orderBy: "conversationStart",
    paging: { pageSize: Math.min(params.maxResults ?? 25, 100), pageNumber: 1 },
    segmentFilters: filters.length ? filters : void 0
  };
  const resp = await genesys.post(
    "/api/v2/analytics/conversations/details/query",
    body
  );
  return (resp.conversations ?? []).map((c) => {
    const communications = [];
    for (const p of c.participants ?? []) {
      for (const s of p.sessions ?? []) {
        communications.push({
          communicationId: s.sessionId,
          type: s.mediaType ?? "unknown",
          direction: s.direction
        });
      }
    }
    return {
      conversationId: c.conversationId,
      startTime: c.conversationStart ?? "",
      endTime: c.conversationEnd,
      communications
    };
  });
}

// src/genesys/transcripts.ts
init_client();
async function resolveCustomerCommunicationId(conversationId) {
  const resp = await genesys.get(
    `/api/v2/analytics/conversations/${conversationId}/details`
  );
  for (const participant of resp.participants ?? []) {
    if (participant.purpose === "customer" || participant.purpose === "external") {
      const sessionId = participant.sessions?.[0]?.sessionId;
      if (sessionId) return sessionId;
    }
  }
  for (const participant of resp.participants ?? []) {
    const sessionId = participant.sessions?.[0]?.sessionId;
    if (sessionId) return sessionId;
  }
  throw new Error(
    `Could not find a communication ID for conversation ${conversationId}. Check that the conversation exists and has a transcript.`
  );
}
async function getTranscriptUrl(conversationId, communicationId) {
  const resp = await genesys.get(
    `/api/v2/speechandtextanalytics/conversations/${conversationId}/communications/${communicationId}/transcriptUrls`
  );
  const url = resp.urls?.[0]?.url;
  if (!url) {
    throw new Error(
      `No transcript URL returned for conversation ${conversationId} communication ${communicationId}. The conversation may not have a transcript (no voice recording, or transcription not enabled).`
    );
  }
  return url;
}
async function downloadTranscriptFromS3(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download transcript from S3: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}
function purposeToLabel(purpose) {
  switch ((purpose ?? "").toLowerCase()) {
    case "internal":
    case "agent":
    case "user":
      return "Agent";
    case "external":
    case "customer":
      return "Customer";
    case "bot":
    case "ivr":
    case "acd":
      return "Bot";
    case "api":
    case "system":
      return "Action";
    default:
      return purpose ? purpose.charAt(0).toUpperCase() + purpose.slice(1) : "Unknown";
  }
}
function transformTranscript(raw) {
  const lines = [];
  if (Array.isArray(raw.transcripts) && raw.transcripts.length > 0) {
    for (const transcriptBlock of raw.transcripts) {
      const phrases = transcriptBlock.phrases;
      if (!phrases) continue;
      for (const phrase of phrases) {
        const label = purposeToLabel(phrase.participantPurpose);
        const rawText = phrase.decoratedText ?? phrase.text;
        const text = rawText?.trim();
        if (text) lines.push(`${label}: ${text}`);
      }
    }
    if (lines.length > 0) return lines.join("\n");
  }
  if (Array.isArray(raw.phrases) && raw.phrases.length > 0) {
    for (const phrase of raw.phrases) {
      const label = purposeToLabel(phrase.participantPurpose);
      const rawText = phrase.decoratedText ?? phrase.text;
      const text = rawText?.trim();
      if (text) lines.push(`${label}: ${text}`);
    }
    return lines.join("\n");
  }
  throw new Error(
    "Unrecognised transcript format: expected transcripts[].phrases[] structure from Genesys S3."
  );
}
async function fetchAndTransformTranscript(conversationId, communicationId) {
  const url = await getTranscriptUrl(conversationId, communicationId);
  const rawJson = await downloadTranscriptFromS3(url);
  const plainText = transformTranscript(rawJson);
  return { plainText, rawJson };
}
async function fetchMessagingTranscript(conversationId) {
  const conv = await genesys.get(
    `/api/v2/conversations/messages/${conversationId}`
  );
  const purposeByMessageId = /* @__PURE__ */ new Map();
  const orderedMessages = [];
  for (const participant of conv.participants ?? []) {
    const purpose = participant.purpose ?? "unknown";
    for (const comm of participant.messages ?? []) {
      for (const msg of comm.messages ?? []) {
        if (msg.messageId) {
          purposeByMessageId.set(msg.messageId, purpose);
          orderedMessages.push({
            messageId: msg.messageId,
            messageTime: msg.messageTime,
            purpose
          });
        }
      }
    }
  }
  if (orderedMessages.length === 0) {
    throw new Error(`No messages found in conversation ${conversationId}`);
  }
  const allMessages = [];
  const chunkSize = 100;
  const ids = orderedMessages.map((m) => m.messageId);
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const resp = await genesys.post(
      `/api/v2/conversations/messages/${conversationId}/messages/bulk?useNormalizedMessage=true`,
      chunk
    );
    allMessages.push(...resp.entities ?? []);
  }
  const contentById = /* @__PURE__ */ new Map();
  for (const msg of allMessages) {
    if (msg.id) contentById.set(msg.id, msg);
  }
  const sorted = [...orderedMessages].sort((a, b) => {
    if (!a.messageTime) return 1;
    if (!b.messageTime) return -1;
    return a.messageTime.localeCompare(b.messageTime);
  });
  const lines = [];
  for (const entry of sorted) {
    const full = contentById.get(entry.messageId);
    const text = full?.normalizedMessage?.text ?? full?.textBody ?? "";
    if (!text?.trim()) continue;
    const label = purposeToLabel(entry.purpose);
    lines.push(`${label}: ${text.trim()}`);
  }
  if (lines.length === 0) {
    throw new Error(`No text content found in messaging conversation ${conversationId}`);
  }
  return lines.join("\n");
}
function normaliseManualTranscript(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((l) => l.trim()).filter((l) => l.length > 0).join("\n");
}

// src/genesys/summaries.ts
init_client();
init_config();
init_auth();
function buildSettingBody(setting) {
  return {
    name: setting.name,
    language: setting.language,
    summaryType: setting.summaryType,
    format: setting.format,
    maskPII: setting.maskPII,
    predefinedInsights: setting.predefinedInsights,
    settingType: setting.settingType,
    prompt: setting.prompt,
    serviceType: setting.serviceType,
    timeoutDuration: setting.timeoutDuration
  };
}
async function generatePreviewSummary(transcript, setting, sessionId) {
  const config2 = getGenesysConfig();
  if (!config2) throw new Error("Genesys credentials not configured");
  const userToken = await getUserToken(config2);
  if (!userToken) {
    await genesys.post("/api/v2/conversations/summaries/preview", {
      summarySetting: buildSettingBody(setting),
      summaryPreviewSessionId: sessionId ?? v4_default(),
      transcript
    });
    return null;
  }
  return generatePreviewWithWebSocket(userToken, config2.region, transcript, setting, sessionId);
}
async function generatePreviewWithWebSocket(userToken, region, transcript, setting, sessionId) {
  const base = getBaseUrl(region);
  const sid = sessionId ?? v4_default();
  const h = {
    Authorization: `Bearer ${userToken}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  const meResp = await fetch(`${base}/api/v2/users/me`, { headers: h });
  if (!meResp.ok) throw new Error(`Failed to resolve user ID: ${meResp.status}`);
  const me = await meResp.json();
  const chanResp = await fetch(`${base}/api/v2/notifications/channels`, {
    method: "POST",
    headers: h,
    body: "{}"
  });
  if (!chanResp.ok) throw new Error(`Failed to create notification channel: ${chanResp.status}`);
  const chan = await chanResp.json();
  const topic = `v2.users.${me.id}.conversations.summaries.settings.preview`;
  const subResp = await fetch(
    `${base}/api/v2/notifications/channels/${chan.id}/subscriptions`,
    { method: "POST", headers: h, body: JSON.stringify([{ id: topic }]) }
  );
  if (!subResp.ok) {
    const body = await subResp.text();
    throw new Error(`Failed to subscribe to preview topic: ${subResp.status} \u2014 ${body}`);
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(chan.connectUri);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Preview timed out after ${setting.timeoutDuration + 10}s`));
    }, (setting.timeoutDuration + 10) * 1e3);
    ws.onopen = async () => {
      const post = await fetch(`${base}/api/v2/conversations/summaries/preview`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          summarySetting: buildSettingBody(setting),
          summaryPreviewSessionId: sid,
          transcript
        })
      });
      if (!post.ok) {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`Preview POST failed: ${post.status}`));
      }
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (typeof msg.topicName === "string" && msg.topicName.includes("summaries")) {
        const eventBody = msg.eventBody ?? {};
        const bodySessionId = eventBody.summaryPreviewSessionId ?? eventBody.sessionId ?? eventBody.id;
        if (bodySessionId && bodySessionId !== sid) return;
        clearTimeout(timeout);
        ws.close();
        resolve(eventBody);
      }
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket error while waiting for preview result"));
    };
  });
}
function extractSummaryText(response) {
  const summaryObj = response.summary;
  if (summaryObj && typeof summaryObj === "object" && typeof summaryObj.text === "string") {
    return summaryObj.text;
  }
  if (typeof summaryObj === "string" && summaryObj) return summaryObj;
  if (typeof response.summaryText === "string" && response.summaryText) return response.summaryText;
  if (Array.isArray(response.insights)) {
    return response.insights.map((i) => `${i.type}: ${i.content}`).join("\n\n");
  }
  return JSON.stringify(response, null, 2);
}
async function listSummarySettings() {
  const resp = await genesys.get(
    "/api/v2/conversations/summaries/settings"
  );
  return resp.entities ?? [];
}
async function getSummarySetting(id) {
  return genesys.get(
    `/api/v2/conversations/summaries/settings/${id}`
  );
}
async function createSummarySetting(setting) {
  return genesys.post(
    "/api/v2/conversations/summaries/settings",
    setting
  );
}
async function updateSummarySetting(id, setting) {
  return genesys.put(
    `/api/v2/conversations/summaries/settings/${id}`,
    setting
  );
}
async function getExistingSummaries(conversationId) {
  return genesys.get(`/api/v2/speechandtextanalytics/conversations/${conversationId}/summaries`);
}

// src/genesys/copilot.ts
init_client();
var ASSISTANT_TIER = "Copilot";
var ASSISTANTS_PAGE_SIZE = 200;
async function listAssistants() {
  const all = [];
  let pageNumber = 1;
  while (true) {
    const params = new URLSearchParams({
      pageSize: String(ASSISTANTS_PAGE_SIZE),
      pageNumber: String(pageNumber),
      tier: ASSISTANT_TIER
    });
    const resp = await genesys.get(`/api/v2/assistants?${params}`);
    const entities = resp.entities ?? [];
    all.push(...entities);
    if (entities.length < ASSISTANTS_PAGE_SIZE) break;
    pageNumber++;
  }
  return all;
}
async function getCopilotConfig(assistantId) {
  return genesys.get(`/api/v2/assistants/${assistantId}/copilot`);
}
async function updateCopilotConfig(assistantId, config2) {
  return genesys.put(`/api/v2/assistants/${assistantId}/copilot`, config2);
}
async function getAssistantQueues(assistantId) {
  const allIds = [];
  let after;
  const pageSize = 200;
  while (true) {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (after) params.set("after", after);
    const resp = await genesys.get(
      `/api/v2/assistants/${assistantId}/queues?${params}`
    );
    const entities = resp.entities ?? [];
    for (const e of entities) {
      if (e.id) allIds.push(e.id);
    }
    if (!resp.nextUri || entities.length === 0) break;
    const afterMatch = resp.nextUri.match(/[?&]after=([^&]+)/);
    if (!afterMatch) break;
    after = decodeURIComponent(afterMatch[1]);
  }
  if (allIds.length === 0) return [];
  const named = [];
  const chunkSize = 100;
  for (let i = 0; i < allIds.length; i += chunkSize) {
    const chunk = allIds.slice(i, i + chunkSize);
    const params = new URLSearchParams({ pageSize: String(chunk.length) });
    chunk.forEach((id) => params.append("id", id));
    const resp = await genesys.get(
      `/api/v2/routing/queues?${params}`
    );
    named.push(...resp.entities ?? []);
  }
  const nameMap = new Map(named.map((q) => [q.id, q.name]));
  return allIds.map((id) => ({ id, name: nameMap.get(id) ?? id }));
}

// src/dashboard.ts
function esc2(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function passRateBadge(rate) {
  const pct2 = (rate * 100).toFixed(1);
  const colour = rate >= 0.9 ? "#22c55e" : rate >= 0.6 ? "#f59e0b" : "#ef4444";
  return `<span style="background:${colour};color:#fff;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:600">${pct2}%</span>`;
}
function renderRun(run) {
  const dimensionNames = run.results[0]?.dimensionScores.map((d) => d.dimension) ?? [];
  const rubricsHeader = dimensionNames.map((d) => `<th>${esc2(d)}</th>`).join("");
  const rows = run.results.map((r) => {
    const dimCells = r.dimensionScores.map((d) => {
      const colour = d.passed ? "#22c55e" : "#ef4444";
      const icon = d.passed ? "\u2713" : "\u2717";
      const scoreDisplay = d.score === null ? "N/A" : `${(d.score * 100).toFixed(0)}%`;
      return `<td title="${esc2(d.reasoning)}" style="text-align:center;color:${colour};font-weight:700">${icon} ${scoreDisplay}</td>`;
    }).join("");
    return `
      <tr>
        <td class="transcript-label">${esc2(r.transcriptLabel)}</td>
        <td style="color:${r.overallPassed ? "#22c55e" : "#ef4444"};font-weight:600">${r.overallPassed ? "Pass" : "Fail"}</td>
        <td>${(r.overallScore * 100).toFixed(1)}%</td>
        ${dimCells}
      </tr>
    `;
  }).join("");
  const improvements = run.suggestedImprovements ? `<div class="improvements">
        <h4>Suggested Improvements</h4>
        <p>${esc2(run.suggestedImprovements).replace(/\n/g, "<br>")}</p>
       </div>` : "";
  return `
    <div class="run-card" id="run-${run.id}">
      <div class="run-header">
        <div class="run-title">
          <span class="run-label">${esc2(run.label)}</span>
          ${passRateBadge(run.aggregatePassRate)}
        </div>
        <div class="run-meta">
          <span>${new Date(run.createdAt).toLocaleString("en-AU")}</span>
          <span>${run.transcriptIds.length} transcript${run.transcriptIds.length !== 1 ? "s" : ""}</span>
          <span>Prompt v${run.promptVersion}</span>
        </div>
      </div>

      <details open>
        <summary>Prompt Used</summary>
        <pre class="prompt-text">${esc2(run.summarySetting.prompt)}</pre>
      </details>

      <details open>
        <summary>Results</summary>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transcript</th>
                <th>Overall</th>
                <th>Score</th>
                ${rubricsHeader}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="hint">Hover dimension cells to see reasoning.</p>
      </details>

      ${improvements}
    </div>
  `;
}
async function generateDashboard(runs, title) {
  const runCards = runs.map(renderRun).join("\n");
  const passRates = runs.map((r) => r.aggregatePassRate);
  const avgPassRate = passRates.length > 0 ? passRates.reduce((a, b) => a + b, 0) / passRates.length : 0;
  const bestRun = runs.reduce((best, r) => r.aggregatePassRate > best.aggregatePassRate ? r : best, runs[0]);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc2(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f1117; color: #e2e8f0; font-size: 14px; line-height: 1.5; }
  a { color: #60a5fa; }
  h1, h2, h3, h4 { font-weight: 600; }
  .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
  .header { margin-bottom: 32px; border-bottom: 1px solid #1e293b; padding-bottom: 24px; }
  .header h1 { font-size: 22px; color: #f1f5f9; }
  .header .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: #1e293b; border-radius: 8px; padding: 16px; }
  .stat-card .value { font-size: 28px; font-weight: 700; color: #f1f5f9; }
  .stat-card .label { color: #64748b; font-size: 12px; margin-top: 4px; }
  .run-card { background: #1e293b; border-radius: 8px; margin-bottom: 24px; overflow: hidden; }
  .run-header { padding: 16px 20px; border-bottom: 1px solid #0f172a; }
  .run-title { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .run-label { font-size: 15px; font-weight: 600; color: #f1f5f9; }
  .run-meta { display: flex; gap: 16px; color: #64748b; font-size: 12px; }
  details { border-top: 1px solid #0f172a; }
  summary { padding: 10px 20px; cursor: pointer; font-weight: 500; color: #94a3b8; font-size: 13px; user-select: none; }
  summary:hover { color: #e2e8f0; }
  details[open] summary { color: #e2e8f0; }
  .prompt-text { background: #0f1117; padding: 16px 20px; font-family: "JetBrains Mono", "Fira Code", monospace; font-size: 12px; line-height: 1.7; white-space: pre-wrap; color: #a5f3fc; }
  .table-wrap { overflow-x: auto; padding: 0 20px 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 10px; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 12px; white-space: nowrap; }
  td { padding: 8px 10px; border-bottom: 1px solid #1e293b; vertical-align: middle; }
  .transcript-label { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #cbd5e1; }
  .hint { color: #475569; font-size: 11px; padding: 0 20px 12px; }
  .improvements { padding: 16px 20px; border-top: 1px solid #0f172a; background: #0f172a; }
  .improvements h4 { color: #fbbf24; font-size: 13px; margin-bottom: 8px; }
  .improvements p { color: #cbd5e1; font-size: 13px; line-height: 1.7; }
  .prompt-history { margin-bottom: 32px; }
  .prompt-history h2 { font-size: 16px; color: #f1f5f9; margin-bottom: 12px; }
  @media (max-width: 600px) { .stats { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>${esc2(title)}</h1>
    <div class="subtitle">Generated ${(/* @__PURE__ */ new Date()).toLocaleString("en-AU")} \xB7 ${runs.length} test run${runs.length !== 1 ? "s" : ""}</div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="value">${runs.length}</div>
      <div class="label">Test Runs</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color:${avgPassRate >= 0.9 ? "#22c55e" : avgPassRate >= 0.6 ? "#f59e0b" : "#ef4444"}">${(avgPassRate * 100).toFixed(1)}%</div>
      <div class="label">Average Pass Rate</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color:#22c55e">${(bestRun.aggregatePassRate * 100).toFixed(1)}%</div>
      <div class="label">Best Run Pass Rate</div>
    </div>
  </div>

  <h2 style="font-size:16px;color:#f1f5f9;margin-bottom:16px">Test Runs (newest first)</h2>
  ${runCards}
</div>
</body>
</html>`;
  const dashboardId = `dashboard-${Date.now()}`;
  return saveDashboard(dashboardId, html);
}

// src/dashboardHtml.ts
function deriveFailureThemes(testCaseFiles) {
  const dimMap = /* @__PURE__ */ new Map();
  for (const tc of testCaseFiles) {
    for (const result of tc.results) {
      for (const ds of result.dimensionScores) {
        if (ds.na || ds.score === null) continue;
        const key = `${tc.testCaseName}||${ds.dimension}`;
        if (!dimMap.has(key)) dimMap.set(key, { testCase: tc.testCaseName, scores: [], reasons: [] });
        const entry = dimMap.get(key);
        entry.scores.push(ds.score);
        if (!ds.passed && ds.reasoning) entry.reasons.push(ds.reasoning);
      }
    }
  }
  const themes = [];
  for (const [key, { testCase, scores, reasons }] of dimMap) {
    const dimension = key.split("||")[1];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const failRate = scores.filter((s) => s < 0.8).length / scores.length;
    if (failRate >= 0.3) {
      themes.push({
        dimension,
        testCase,
        failRate,
        avgScore,
        sampleReasons: [...new Set(reasons)].slice(0, 3)
      });
    }
  }
  return themes.sort((a, b) => b.failRate - a.failRate).slice(0, 8);
}
function deriveRecommendations(testCaseFiles, themes) {
  const recs = [];
  const hasTheme = (kw) => themes.some((t) => t.dimension.toLowerCase().includes(kw.toLowerCase()));
  if (hasTheme("resolution")) {
    recs.push({
      priority: "high",
      area: "Resolution section",
      description: 'The Resolution section consistently describes future/pending outcomes rather than concluded ones. Strengthen the prompt instruction: when no definitive outcome was reached, the Resolution section must use the prescribed fallback text (e.g. "Interaction concluded without final action.") followed by a single outstanding-item bullet. Completed actions belong in Actions Completed only.'
    });
  }
  if (hasTheme("actions") || hasTheme("action")) {
    recs.push({
      priority: "high",
      area: "Actions Completed section",
      description: "Future commitments (callbacks, emails to be sent, quotes to be prepared) are being listed as completed actions. The prompt should explicitly state: only include actions that were fully completed during the interaction. Future commitments must not appear here."
    });
  }
  if (hasTheme("order status") || hasTheme("stage")) {
    recs.push({
      priority: "high",
      area: "Status fallback",
      description: 'Several summaries use "Not applicable" instead of the required "Status not confirmed." fallback. Update the prompt to specify the exact required fallback text for out-of-scope interactions.'
    });
  }
  if (hasTheme("key information") || hasTheme("material")) {
    recs.push({
      priority: "medium",
      area: "Key Information Obtained section",
      description: "Summaries are capturing out-of-scope details in Key Information instead of relevant information or the prescribed fallback. Reinforce that Key Information is for order-material facts only, and specify the exact fallback text for out-of-scope calls."
    });
  }
  if (hasTheme("domain") || hasTheme("relevance")) {
    recs.push({
      priority: "medium",
      area: "Out-of-scope call handling",
      description: "Some interactions in the corpus fall outside the summary's intended scope. Define explicit guidance in the prompt for out-of-scope calls: apply the template with all prescribed fallback texts rather than generating a disclaimer or refusing."
    });
  }
  if (hasTheme("terminology") || hasTheme("customer")) {
    recs.push({
      priority: "high",
      area: "Customer terminology",
      description: 'The external participant is occasionally referred to as "customer" or "client" instead of "customer". Reinforce this rule at the top of the prompt and provide explicit examples.'
    });
  }
  if (hasTheme("pii") || hasTheme("personal")) {
    recs.push({
      priority: "high",
      area: "PII in summaries",
      description: "Some summaries include personal details. Add an explicit PII prohibition to the prompt: do not include any personally identifiable information in the summary."
    });
  }
  if (hasTheme("prohibited") || hasTheme("word")) {
    recs.push({
      priority: "medium",
      area: "Prohibited words",
      description: 'Prohibited words appear in some summaries. List them explicitly in the prompt with the instruction to never use them.'
    });
  }
  const worstTc = [...testCaseFiles].sort((a, b) => a.averageScore - b.averageScore)[0];
  if (worstTc && worstTc.averageScore < 0.6 && !recs.some((r) => r.area.toLowerCase().includes(worstTc.testCaseName.toLowerCase()))) {
    recs.push({
      priority: "medium",
      area: worstTc.testCaseName.replace(/-/g, " "),
      description: `This test case has the lowest average score (${worstTc.averageScore.toFixed(2)}) across the run. Review the failing transcript results in detail to identify the root cause and refine the relevant section of the prompt.`
    });
  }
  return recs;
}
function tcFailureSummary(tc) {
  if (tc.passRate >= 0.9) return "";
  const dimFailMap = /* @__PURE__ */ new Map();
  for (const result of tc.results) {
    for (const ds of result.dimensionScores) {
      if (ds.na || ds.score === null) continue;
      if (!dimFailMap.has(ds.dimension)) dimFailMap.set(ds.dimension, { count: 0, total: 0, reasons: [] });
      const e = dimFailMap.get(ds.dimension);
      e.total++;
      if (!ds.passed) {
        e.count++;
        if (ds.reasoning) e.reasons.push(ds.reasoning);
      }
    }
  }
  const lines = [];
  const sorted = [...dimFailMap.entries()].filter(([, v]) => v.count > 0).sort((a, b) => b[1].count / b[1].total - a[1].count / a[1].total);
  for (const [dim, { count, total, reasons }] of sorted.slice(0, 5)) {
    const pct2 = Math.round(count / total * 100);
    const sampleReason = [...new Set(reasons)][0] ?? "";
    lines.push(`<li><strong>${esc3(dim)}</strong> \u2014 failed ${pct2}% of transcripts${sampleReason ? `: <em>${esc3(sampleReason.slice(0, 120))}${sampleReason.length > 120 ? "\u2026" : ""}</em>` : ""}</li>`);
  }
  return lines.join("\n");
}
function esc3(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function pct(n) {
  return `${Math.round(n * 100)}%`;
}
function scoreColor(score) {
  if (score === null) return "#475569";
  if (score >= 0.9) return "#22c55e";
  if (score >= 0.7) return "#f59e0b";
  return "#ef4444";
}
function passBadge(passed, na) {
  if (na) return `<span class="badge na">N/A</span>`;
  return passed ? `<span class="badge pass">PASS</span>` : `<span class="badge fail">FAIL</span>`;
}
function generateEvalRunDashboardHtml(meta, testCaseFiles) {
  const themes = deriveFailureThemes(testCaseFiles);
  const recs = deriveRecommendations(testCaseFiles, themes);
  const overallPct = pct(meta.aggregatePassRate ?? 0);
  const overallColor = scoreColor(meta.aggregatePassRate ?? 0);
  const runDate = meta.finalizedAt ? new Date(meta.finalizedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unknown";
  const summaryRows = testCaseFiles.sort((a, b) => a.passRate - b.passRate).map((tc) => {
    const color = scoreColor(tc.averageScore);
    const barWidth = Math.round(tc.passRate * 100);
    return `
      <tr class="tc-row" onclick="showDetail('${esc3(tc.testCaseName)}')">
        <td class="tc-name">${esc3(tc.testCaseName.replace(/-/g, " "))}</td>
        <td>
          <div class="bar-wrap"><div class="bar" style="width:${barWidth}%;background:${scoreColor(tc.passRate)}"></div></div>
          <span class="bar-label">${pct(tc.passRate)}</span>
        </td>
        <td style="color:${color};font-weight:600">${tc.averageScore.toFixed(2)}</td>
        <td>${passBadge(tc.passRate >= 0.8)}</td>
        <td class="chevron">\u203A</td>
      </tr>`;
  }).join("");
  const themeItems = themes.length === 0 ? "<p>No significant failure themes detected.</p>" : themes.map((t) => `
      <div class="theme-card">
        <div class="theme-header">
          <span class="theme-dim">${esc3(t.dimension)}</span>
          <span class="theme-tc">${esc3(t.testCase.replace(/-/g, " "))}</span>
          <span class="theme-rate" style="color:${scoreColor(1 - t.failRate)}">Fails ${pct(t.failRate)} of transcripts</span>
        </div>
        ${t.sampleReasons.length ? `<ul class="theme-reasons">${t.sampleReasons.map((r) => `<li>${esc3(r.slice(0, 150))}${r.length > 150 ? "\u2026" : ""}</li>`).join("")}</ul>` : ""}
      </div>`).join("");
  const recItems = recs.length === 0 ? "<p>No recommendations \u2014 all test cases passing well.</p>" : recs.map((r, i) => `
      <div class="rec-card ${r.priority}">
        <div class="rec-header">
          <span class="rec-num">${i + 1}</span>
          <span class="rec-priority ${r.priority}">${r.priority.toUpperCase()}</span>
          <strong>${esc3(r.area)}</strong>
        </div>
        <p>${esc3(r.description)}</p>
      </div>`).join("");
  const detailViews = testCaseFiles.map((tc) => {
    const failureSummaryItems = tcFailureSummary(tc);
    const transcriptRows = [...tc.results].sort((a, b) => a.overallScore - b.overallScore).map((r, idx) => {
      const dimRows = r.dimensionScores.map((ds) => `
          <tr class="dim-row ${ds.na ? "dim-na" : ds.passed ? "dim-pass" : "dim-fail"}">
            <td class="dim-name">${esc3(ds.dimension)}</td>
            <td style="color:${scoreColor(ds.score)}">${ds.score === null ? "\u2014" : ds.score.toFixed(2)}</td>
            <td>${passBadge(ds.passed, ds.na)}</td>
            <td class="dim-reason">${esc3(ds.reasoning ?? "")}</td>
          </tr>`).join("");
      return `
        <tr class="tr-row" onclick="toggleDims('dim-${esc3(tc.testCaseName)}-${idx}')">
          <td class="tr-id" title="${esc3(r.transcriptId)}">${esc3(r.transcriptLabel ?? r.transcriptId.slice(0, 8))}</td>
          <td style="color:${scoreColor(r.overallScore)};font-weight:600">${r.overallScore.toFixed(2)}</td>
          <td>${passBadge(r.overallPassed)}</td>
          <td class="chevron small">\u203A</td>
        </tr>
        <tr class="dim-group" id="dim-${esc3(tc.testCaseName)}-${idx}" style="display:none">
          <td colspan="4" class="dim-cell">
            <table class="dim-table">
              <thead><tr><th>Dimension</th><th>Score</th><th>Result</th><th>Reasoning</th></tr></thead>
              <tbody>${dimRows}</tbody>
            </table>
          </td>
        </tr>`;
    }).join("");
    return `
    <div class="detail-view" id="detail-${esc3(tc.testCaseName)}" style="display:none">
      <button class="back-btn" onclick="showMain()">\u2190 Back to overview</button>
      <h2>${esc3(tc.testCaseName.replace(/-/g, " "))}</h2>
      <div class="detail-meta">
        <span>${tc.totalTranscripts} transcripts</span>
        <span>Pass rate: <strong style="color:${scoreColor(tc.passRate)}">${pct(tc.passRate)}</strong></span>
        <span>Avg score: <strong style="color:${scoreColor(tc.averageScore)}">${tc.averageScore.toFixed(2)}</strong></span>
      </div>
      <p class="detail-hint">Click a row to expand dimension-level scores and reasoning.</p>
      <table class="tr-table">
        <thead><tr><th>Transcript</th><th>Score</th><th>Result</th><th></th></tr></thead>
        <tbody>${transcriptRows}</tbody>
      </table>
      ${failureSummaryItems ? `
      <div class="section">
        <h3>Failure Summary</h3>
        <ul class="failure-list">${failureSummaryItems}</ul>
      </div>` : ""}
    </div>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eval Dashboard \u2014 ${esc3(meta.testSetName)} Run ${meta.runNumber}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  a { color: inherit; }

  /* Layout */
  .page { max-width: 960px; margin: 0 auto; padding: 32px 20px 80px; }

  /* Header */
  .run-header { margin-bottom: 32px; }
  .run-header h1 { font-size: 1.6rem; font-weight: 700; color: #f8fafc; margin-bottom: 6px; }
  .run-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.85rem; color: #94a3b8; margin-bottom: 12px; }
  .run-meta span { background: #1e293b; padding: 4px 10px; border-radius: 6px; }
  .version-badge { font-weight: 600 !important; }
  .version-candidate { background: #1a2744 !important; color: #93c5fd !important; border: 1px solid #3b82f6; }
  .version-deployed { background: #052e16 !important; color: #86efac !important; border: 1px solid #22c55e; }
  .version-unknown { background: #1e293b !important; color: #94a3b8 !important; }
  .prompt-block { margin-top: 12px; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
  .prompt-summary { cursor: pointer; padding: 10px 16px; font-size: 0.85rem; font-weight: 500; color: #94a3b8; background: #1e293b; user-select: none; list-style: none; }
  .prompt-summary:hover { color: #cbd5e1; background: #263347; }
  .prompt-text { margin: 0; padding: 16px; background: #0f172a; color: #cbd5e1; font-family: 'Courier New', monospace; font-size: 0.8rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word; border-top: 1px solid #334155; max-height: 400px; overflow-y: auto; }

  /* Overall score */
  .overall-score { display: inline-flex; align-items: center; gap: 12px; background: #1e293b; border-radius: 12px; padding: 16px 24px; margin-bottom: 32px; }
  .overall-score .big { font-size: 2.5rem; font-weight: 800; }
  .overall-score .label { font-size: 0.85rem; color: #94a3b8; }

  /* Section */
  .section { margin-bottom: 40px; }
  .section h2 { font-size: 1.1rem; font-weight: 600; color: #f1f5f9; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #1e293b; }
  .section h3 { font-size: 1rem; font-weight: 600; color: #f1f5f9; margin-bottom: 12px; }

  /* Summary table */
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table th { text-align: left; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; padding: 8px 12px; }
  .summary-table td { padding: 10px 12px; border-bottom: 1px solid #1e293b; vertical-align: middle; }
  .tc-row { cursor: pointer; transition: background .15s; }
  .tc-row:hover { background: #1e293b; }
  .tc-name { font-weight: 500; color: #e2e8f0; font-size: 0.9rem; }
  .chevron { color: #475569; font-size: 1.2rem; text-align: right; }
  .chevron.small { font-size: 1rem; }

  /* Progress bar */
  .bar-wrap { display: inline-block; width: 80px; height: 6px; background: #1e293b; border-radius: 3px; vertical-align: middle; margin-right: 8px; }
  .bar { height: 100%; border-radius: 3px; }
  .bar-label { font-size: 0.82rem; color: #94a3b8; }

  /* Badges */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.73rem; font-weight: 700; letter-spacing: .04em; }
  .badge.pass { background: #14532d; color: #86efac; }
  .badge.fail { background: #450a0a; color: #fca5a5; }
  .badge.na { background: #1e293b; color: #64748b; }

  /* Theme cards */
  .theme-card { background: #1e293b; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
  .theme-header { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 6px; }
  .theme-dim { font-weight: 600; color: #f1f5f9; font-size: 0.92rem; }
  .theme-tc { font-size: 0.78rem; background: #0f172a; padding: 2px 8px; border-radius: 4px; color: #94a3b8; }
  .theme-rate { font-size: 0.82rem; font-weight: 600; margin-left: auto; }
  .theme-reasons { padding-left: 18px; margin-top: 6px; }
  .theme-reasons li { font-size: 0.82rem; color: #94a3b8; margin-bottom: 3px; }

  /* Recommendation cards */
  .rec-card { background: #1e293b; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; border-left: 4px solid #334155; }
  .rec-card.high { border-left-color: #ef4444; }
  .rec-card.medium { border-left-color: #f59e0b; }
  .rec-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .rec-num { width: 22px; height: 22px; border-radius: 50%; background: #334155; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rec-priority { font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
  .rec-priority.high { background: #450a0a; color: #fca5a5; }
  .rec-priority.medium { background: #451a03; color: #fcd34d; }
  .rec-card p { font-size: 0.85rem; color: #cbd5e1; line-height: 1.55; }

  /* Detail view */
  .back-btn { background: #1e293b; border: none; color: #94a3b8; cursor: pointer; padding: 8px 14px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 20px; transition: background .15s; }
  .back-btn:hover { background: #334155; color: #f1f5f9; }
  .detail-view h2 { font-size: 1.4rem; font-weight: 700; color: #f8fafc; margin-bottom: 10px; }
  .detail-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.85rem; color: #94a3b8; margin-bottom: 16px; }
  .detail-hint { font-size: 0.8rem; color: #475569; margin-bottom: 14px; }

  /* Transcript table */
  .tr-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .tr-table th { text-align: left; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; padding: 8px 12px; }
  .tr-table td { padding: 10px 12px; border-bottom: 1px solid #1e293b; vertical-align: middle; }
  .tr-row { cursor: pointer; transition: background .15s; }
  .tr-row:hover { background: #1e293b; }
  .tr-id { font-size: 0.85rem; font-family: monospace; color: #94a3b8; }

  /* Dimension table */
  .dim-cell { padding: 0 !important; background: #0f172a; }
  .dim-table { width: 100%; border-collapse: collapse; }
  .dim-table th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: .05em; color: #475569; padding: 6px 12px; text-align: left; }
  .dim-table td { padding: 8px 12px; border-bottom: 1px solid #1e293b; font-size: 0.82rem; vertical-align: top; }
  .dim-name { font-weight: 500; color: #cbd5e1; }
  .dim-reason { color: #94a3b8; line-height: 1.4; }
  .dim-pass { background: #052e16; }
  .dim-fail { background: #1c0505; }
  .dim-na { background: #0f172a; opacity: 0.6; }

  /* Failure list */
  .failure-list { padding-left: 20px; }
  .failure-list li { font-size: 0.85rem; color: #cbd5e1; margin-bottom: 8px; line-height: 1.5; }
  .failure-list em { color: #94a3b8; }
</style>
</head>
<body>
<div class="page">

<!-- \u2500\u2500 MAIN VIEW \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
<div id="main-view">
  <div class="run-header">
    <h1>Eval Dashboard \u2014 ${esc3(meta.testSetName)}</h1>
    <div class="run-meta">
      <span>Run #${meta.runNumber}</span>
      <span>${esc3(meta.summaryConfigName ?? "")}</span>
      <span>${meta.useExistingSummaries ? "Mode: Existing summaries" : "Mode: Prompt test"}</span>
      ${meta.promptVersionNumber !== void 0 ? `<span class="version-badge version-${esc3(meta.promptVersionStatus ?? "deployed")}">Version ${meta.promptVersionNumber}${meta.promptVersionStatus ? ` \xB7 ${esc3(meta.promptVersionStatus)}` : ""}</span>` : `<span class="version-badge version-unknown">Version: unversioned</span>`}
      <span>${runDate}</span>
      <span>${meta.transcriptIds?.length ?? testCaseFiles[0]?.totalTranscripts ?? "?"} transcripts</span>
    </div>
    ${meta.promptText ? `
    <details class="prompt-block">
      <summary class="prompt-summary">View prompt tested in this run \u25BE</summary>
      <pre class="prompt-text">${esc3(meta.promptText)}</pre>
    </details>` : ""}
  </div>

  <div class="overall-score">
    <div>
      <div class="big" style="color:${overallColor}">${overallPct}</div>
      <div class="label">Overall pass rate</div>
    </div>
  </div>

  <div class="section">
    <h2>Test Case Results</h2>
    <table class="summary-table">
      <thead><tr><th>Test Case</th><th>Pass Rate</th><th>Avg Score</th><th>Result</th><th></th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Failure Themes</h2>
    ${themeItems}
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    ${recItems}
  </div>
</div>

<!-- \u2500\u2500 DETAIL VIEWS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
${detailViews}

</div>
<script>
  const DATA = ${JSON.stringify(testCaseFiles)};

  function showMain() {
    document.getElementById('main-view').style.display = '';
    document.querySelectorAll('.detail-view').forEach(el => el.style.display = 'none');
    window.scrollTo(0, 0);
  }

  function showDetail(name) {
    document.getElementById('main-view').style.display = 'none';
    document.querySelectorAll('.detail-view').forEach(el => el.style.display = 'none');
    const el = document.getElementById('detail-' + name);
    if (el) { el.style.display = ''; window.scrollTo(0, 0); }
  }

  function toggleDims(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? '' : 'none';
    // rotate chevron on the trigger row
    const row = el.previousElementSibling;
    if (row) {
      const ch = row.querySelector('.chevron.small');
      if (ch) ch.textContent = isHidden ? '\u2304' : '\u203A';
    }
  }
</script>
</body>
</html>`;
}
function generateImprovementsDashboardHtml(testSetName, summaryConfigName, metas) {
  if (metas.length === 0) {
    return `<!DOCTYPE html><html><body><p>No finalized runs found.</p></body></html>`;
  }
  const tcNames = [];
  for (const m of [...metas].reverse()) {
    for (const name of m.testCaseNames ?? []) {
      if (!tcNames.includes(name)) tcNames.push(name);
    }
  }
  const runHeaders = metas.map((m) => `<th class="run-col">Run ${String(m.runNumber).padStart(4, "0")}<br><span class="run-date">${new Date(m.finalizedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span><br><span class="run-mode">${m.useExistingSummaries ? "existing" : "prompt"}</span></th>`).join("");
  const overallCells = metas.map((m, i) => {
    const rate = m.aggregatePassRate ?? 0;
    const prev = i > 0 ? metas[i - 1].aggregatePassRate ?? 0 : null;
    const delta = prev !== null ? rate - prev : null;
    const arrow = delta === null ? "" : delta > 0.01 ? `<span class="up"> \u2191${pct(delta)}</span>` : delta < -0.01 ? `<span class="dn"> \u2193${pct(Math.abs(delta))}</span>` : `<span class="eq"> \u2192</span>`;
    return `<td class="rate-cell" style="background:${cellBg(rate)}"><span class="rate-val">${pct(rate)}</span>${arrow}</td>`;
  }).join("");
  const tcRows = tcNames.map((name) => {
    const shortName = name.replace(/-/g, " ").replace(/^[A-Za-z]+-/, "");
    const cells = metas.map((m, i) => {
      const rate = m.testCasePassRates?.[name];
      if (rate === void 0) return `<td class="rate-cell na">\u2014</td>`;
      const prev = i > 0 ? metas[i - 1].testCasePassRates?.[name] : null;
      const delta = prev !== null && prev !== void 0 ? rate - prev : null;
      const arrow = delta === null ? "" : delta > 0.01 ? `<span class="up"> \u2191</span>` : delta < -0.01 ? `<span class="dn"> \u2193</span>` : `<span class="eq"> \u2192</span>`;
      return `<td class="rate-cell" style="background:${cellBg(rate)}">${pct(rate)}${arrow}</td>`;
    }).join("");
    return `<tr><td class="tc-label" title="${esc3(name)}">${esc3(shortName)}</td>${cells}</tr>`;
  }).join("");
  const sparkPoints = metas.map((m) => m.aggregatePassRate ?? 0);
  const sparkMax = Math.max(...sparkPoints, 1);
  const svgW = Math.max(metas.length * 40, 80);
  const svgH = 48;
  const sparkCoords = sparkPoints.map((v, i) => {
    const x = metas.length === 1 ? svgW / 2 : i / (metas.length - 1) * (svgW - 8) + 4;
    const y = svgH - 4 - v / sparkMax * (svgH - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const sparkDots = sparkPoints.map((v, i) => {
    const x = metas.length === 1 ? svgW / 2 : i / (metas.length - 1) * (svgW - 8) + 4;
    const y = svgH - 4 - v / sparkMax * (svgH - 8);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${scoreColor(v)}" />`;
  }).join("");
  const runLinks = metas.map((m) => {
    const folder = String(m.runNumber).padStart(4, "0");
    return `<a class="run-link" href="./${folder}/dashboard.html">Run ${folder} \u2014 ${pct(m.aggregatePassRate ?? 0)} overall</a>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Improvements \u2014 ${esc3(testSetName)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  .page { max-width: 960px; margin: 0 auto; padding: 32px 20px 80px; }

  .page-header { margin-bottom: 28px; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #f8fafc; margin-bottom: 6px; }
  .page-header .sub { font-size: 0.85rem; color: #64748b; }

  .spark-row { display: flex; align-items: center; gap: 20px; background: #1e293b; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; }
  .spark-label { font-size: 0.8rem; color: #64748b; white-space: nowrap; }
  .spark-svg { flex: 1; min-width: 60px; }

  .section { margin-bottom: 36px; }
  .section h2 { font-size: 1rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }

  .imp-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .imp-table th { padding: 8px 10px; text-align: center; color: #64748b; font-size: 0.75rem; font-weight: 600; border-bottom: 1px solid #1e293b; vertical-align: bottom; line-height: 1.3; }
  .imp-table th:first-child { text-align: left; }
  .imp-table td { padding: 7px 10px; border-bottom: 1px solid #1e293b; text-align: center; }
  .tc-label { text-align: left !important; color: #cbd5e1; font-size: 0.82rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .overall-row td { font-weight: 700; font-size: 0.9rem; }
  .overall-row .tc-label { color: #f1f5f9; }
  .rate-cell { font-size: 0.82rem; font-weight: 600; color: #f1f5f9; border-radius: 4px; }
  .rate-cell.na { color: #334155; }
  .rate-val { display: block; }
  .run-col { min-width: 80px; }
  .run-date { font-weight: 400; color: #64748b; display: block; }
  .run-mode { font-weight: 400; font-size: 0.7rem; color: #475569; display: block; text-transform: uppercase; letter-spacing: .04em; }
  .up { color: #4ade80; font-weight: 700; font-size: 0.75rem; }
  .dn { color: #f87171; font-weight: 700; font-size: 0.75rem; }
  .eq { color: #475569; font-size: 0.75rem; }

  .links-section { margin-top: 36px; }
  .links-section h2 { font-size: 1rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
  .run-link { display: block; color: #60a5fa; text-decoration: none; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid #1e293b; }
  .run-link:hover { color: #93c5fd; }

  .legend { display: flex; gap: 16px; font-size: 0.75rem; color: #64748b; margin-bottom: 14px; flex-wrap: wrap; }
  .legend span { display: flex; align-items: center; gap: 6px; }
  .swatch { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
</style>
</head>
<body>
<div class="page">

  <div class="page-header">
    <h1>Improvements \u2014 ${esc3(testSetName)}</h1>
    <div class="sub">${esc3(summaryConfigName)} \xB7 ${metas.length} run${metas.length !== 1 ? "s" : ""}</div>
  </div>

  <div class="spark-row">
    <div class="spark-label">Overall pass rate<br>across runs</div>
    <svg class="spark-svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      <polyline points="${sparkCoords}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round" />
      ${sparkDots}
    </svg>
  </div>

  <div class="legend">
    <span><span class="swatch" style="background:#14532d"></span>\u2265 80% pass</span>
    <span><span class="swatch" style="background:#78350f"></span>50\u201379%</span>
    <span><span class="swatch" style="background:#450a0a"></span>&lt; 50%</span>
    <span class="up">\u2191 improvement</span>
    <span class="dn">\u2193 regression</span>
  </div>

  <div class="section">
    <h2>Pass Rates by Run</h2>
    <table class="imp-table">
      <thead>
        <tr>
          <th>Test Case</th>
          ${runHeaders}
        </tr>
      </thead>
      <tbody>
        <tr class="overall-row">
          <td class="tc-label">Overall</td>
          ${overallCells}
        </tr>
        ${tcRows}
      </tbody>
    </table>
  </div>

  <div class="links-section">
    <h2>Run Dashboards</h2>
    ${runLinks}
  </div>

</div>
</body>
</html>`;
}
function cellBg(rate) {
  if (rate >= 0.8) return "#14532d";
  if (rate >= 0.5) return "#78350f";
  return "#450a0a";
}

// src/tools/handlers.ts
function str(args, key) {
  const v = args[key];
  if (typeof v !== "string") throw new Error(`Missing required string argument: ${key}`);
  return v;
}
function optStr(args, key) {
  const v = args[key];
  return typeof v === "string" ? v : void 0;
}
function strArr(args, key) {
  const v = args[key];
  if (!Array.isArray(v)) throw new Error(`Missing required array argument: ${key}`);
  return v.map((x) => String(x));
}
function ok(content) {
  return { content: [{ type: "text", text: content }] };
}
function json(data) {
  return ok(JSON.stringify(data, null, 2));
}
async function withTokenRefresh(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof TokenExpiredError)) throw err;
    const storedConfig = loadConfig().genesys;
    const authUrl = storedConfig?.lastAuthorizationUrl;
    if (authUrl && storedConfig) {
      try {
        const { authUrl: loginUrl } = preparePkceLogin(storedConfig);
        return ok(
          `\u2500\u2500\u2500 Session Expired \u2500\u2500\u2500

Your Genesys session has expired. Your browser has been opened to log in again.
If it didn't open, use this URL:

  ${loginUrl}

Once you see the "Logged in to Genesys Cloud \u2713" page, tell me and I'll complete the login.
Then retry your original request.`
        );
      } catch {
      }
    }
    return ok(
      `\u2500\u2500\u2500 Session Expired \u2500\u2500\u2500

Your Genesys session has expired. Paste your Authorization URL to log in again:

  login(authorization_url="<your Authorization URL from Genesys Admin>")

Then retry your original request.`
    );
  }
}
async function connect(args) {
  const rawAuthUrl = optStr(args, "authorization_url");
  if (!rawAuthUrl) {
    return ok(
      `\u2500\u2500\u2500 Connect to Genesys Cloud \u2500\u2500\u2500

To get started, I need your OAuth client's Authorization URL.

Where to find it:
  1. Open Genesys Admin \u2192 Integrations \u2192 OAuth
  2. Open the OAuth client you want to use
  3. Copy the URL from the browser address bar \u2014 it looks like:
       https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/abc123-...

Then call:
  connect(authorization_url="<paste the URL here>")`
    );
  }
  let parsed;
  try {
    parsed = new URL(rawAuthUrl);
  } catch {
    return ok(
      `Could not parse that URL: "${rawAuthUrl}"

Expected format (paste from your browser address bar on the OAuth client page):
  https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/abc123-...`
    );
  }
  let extractedClientId = null;
  let extractedRegion;
  if (parsed.host.startsWith("login.")) {
    extractedClientId = parsed.searchParams.get("client_id");
    extractedRegion = parsed.host.replace(/^login\./, "");
  } else if (parsed.host.startsWith("apps.")) {
    const hash = parsed.hash;
    const authorizedAppsMatch = hash.match(/\/authorized-apps\/([a-f0-9-]{36})/i);
    const oauthClientsMatch = hash.match(/\/oauth-clients\/([a-f0-9-]{36})/i);
    extractedClientId = (authorizedAppsMatch ?? oauthClientsMatch)?.[1] ?? null;
    extractedRegion = parsed.host.replace(/^apps\./, "");
  } else {
    return ok(
      `Unrecognised URL format.

Paste the Authorization URL from the field at the bottom of the OAuth client page in Genesys Admin.
It looks like: https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}`
    );
  }
  if (!extractedClientId || extractedClientId.length < 10) {
    return ok(
      `Could not extract a client ID from: "${rawAuthUrl}"

Copy the Authorization URL from the field labelled "Authorization URL" at the bottom of your
OAuth client page in Genesys Admin \u2192 IT and Integrations \u2192 OAuth \u2192 your client.`
    );
  }
  const loginBase = `https://login.${extractedRegion}`;
  const existingFileBased = loadConfig().genesys ?? {};
  const config2 = {
    ...existingFileBased,
    clientId: extractedClientId,
    region: extractedRegion,
    loginUrl: loginBase,
    lastAuthorizationUrl: rawAuthUrl
  };
  saveGenesysConfig(config2);
  let authUrl;
  try {
    ({ authUrl } = preparePkceLogin(config2));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return ok(
      `Credentials saved, but failed to start login flow: ${msg}

  \u2022 Port 8787 in use? Kill it: lsof -ti:8787 | xargs kill -9, then call connect() again`
    );
  }
  return ok(
    `\u2500\u2500\u2500 Genesys Cloud \u2014 Connect \u2500\u2500\u2500

Extracted from URL:
  Client ID: ${extractedClientId.slice(0, 8)}...
  Region:    ${extractedRegion}
  Login URL: ${loginBase}

\u2500\u2500\u2500 Step 1: Log in via browser \u2500\u2500\u2500

Your browser should open automatically.
If it doesn't, open this URL manually:

  ${authUrl}

\u2500\u2500\u2500 Step 2: Confirm \u2500\u2500\u2500

Once you see the green "\u2713 Logged in to Genesys Cloud" page in your browser,
come back here and call:

  complete_login()
`
  );
}
async function configure_credentials(args) {
  const clientId = str(args, "client_id");
  const clientSecret = optStr(args, "client_secret");
  const region = str(args, "region");
  const loginUrl = optStr(args, "login_url");
  clearTokenCache();
  clearUserToken();
  saveGenesysConfig({ clientId, clientSecret, region, loginUrl });
  const loginBase = loginUrl ?? `https://login.${region}`;
  const authHint = clientSecret ? "Client credentials auth ready. You can also call login to authenticate as a user." : "No client_secret provided \u2014 call login to authenticate as a user via browser.";
  return ok(
    `Credentials saved.
  Region:    ${region}
  Client ID: ${clientId.slice(0, 8)}...
  Login URL: ${loginBase}

${authHint}

Call login to start the OAuth2 browser flow, then smoke_test_auth to verify scopes.`
  );
}
async function login(args) {
  const rawAuthUrl = optStr(args, "authorization_url");
  const fileBasedGenesys = loadConfig().genesys;
  const effectiveAuthUrl = rawAuthUrl ?? fileBasedGenesys?.lastAuthorizationUrl ?? null;
  let config2 = effectiveAuthUrl ? null : getGenesysConfig();
  if (effectiveAuthUrl) {
    let parsed;
    try {
      parsed = new URL(effectiveAuthUrl);
    } catch {
      return ok(`Invalid authorization_url \u2014 could not parse as a URL: "${effectiveAuthUrl}"`);
    }
    let extractedClientId = null;
    let extractedRegion;
    if (parsed.host.startsWith("login.")) {
      extractedClientId = parsed.searchParams.get("client_id");
      extractedRegion = parsed.host.replace(/^login\./, "");
    } else if (parsed.host.startsWith("apps.")) {
      const hash = parsed.hash;
      const authorizedAppsMatch = hash.match(/\/authorized-apps\/([a-f0-9-]{36})/i);
      const oauthClientsMatch = hash.match(/\/oauth-clients\/([a-f0-9-]{36})/i);
      extractedClientId = (authorizedAppsMatch ?? oauthClientsMatch)?.[1] ?? null;
      extractedRegion = parsed.host.replace(/^apps\./, "");
    } else {
      return ok(
        `Unrecognised URL format: host "${parsed.host}" is neither apps.* nor login.*

Accepted forms (either is fine):
  https://apps.{region}/directory/#/admin/access-management/authorized-apps/{clientId}
  https://login.{region}/oauth/authorize?client_id={clientId}

Copy the field labelled "Authorization URL" at the bottom of your OAuth client page in
Genesys Admin \u2192 IT and Integrations \u2192 OAuth \u2192 your client.`
      );
    }
    if (!extractedClientId || extractedClientId.length < 10) {
      return ok(
        `Could not extract a client ID from: "${effectiveAuthUrl}"

The URL looked like the right shape but no 36-character client ID was found in it.
Expected a UUID after /authorized-apps/ or /oauth-clients/, or a client_id query parameter.

Copy the Authorization URL from the field labelled "Authorization URL" at the bottom of
your OAuth client page in Genesys Admin \u2192 IT and Integrations \u2192 OAuth \u2192 your client.`
      );
    }
    const loginBase2 = `https://login.${extractedRegion}`;
    const existingFileBased = loadConfig().genesys ?? {};
    const newConfig = {
      ...existingFileBased,
      clientId: extractedClientId,
      region: extractedRegion,
      loginUrl: loginBase2,
      lastAuthorizationUrl: effectiveAuthUrl
    };
    saveGenesysConfig(newConfig);
    config2 = newConfig;
  }
  if (!config2) {
    return ok(
      'No Genesys credentials stored yet \u2014 this is a first run.\n\nDO NOT guess or proceed. Ask the user this question first, and wait:\n\n  "Do you already have a Genesys Cloud OAuth client set up for this?"\n\n\u2500\u2500\u2500 If they say YES \u2500\u2500\u2500\nAsk for the Authorization URL:\n  Genesys Admin \u2192 IT and Integrations \u2192 OAuth \u2192 open the client \u2192\n  scroll to the bottom \u2192 copy the "Authorization URL" field.\n\nPass whatever they paste straight to login(authorization_url="...").\nDO NOT judge, correct, or reject the URL. Two different formats are valid\nand BOTH are accepted \u2014 the client ID and region are parsed from either:\n  \u2022 https://apps.{region}/directory/#/admin/access-management/authorized-apps/{id}\n  \u2022 https://login.{region}/oauth/authorize?client_id={id}\nThe Genesys UI field usually contains the FIRST (apps./directory) form.\nThat is correct and expected. If it does not parse, login() will say so \u2014\nlet the tool decide, do not pre-screen it.\n\n\u2500\u2500\u2500 If they say NO \u2500\u2500\u2500\nWalk them through creating one, one step at a time, confirming as you go.\nDo not paste all of this at once.\n\nStep 1 \u2014 Create the client\n  Genesys Admin \u2192 Integrations \u2192 OAuth \u2192 Add Client\n    App Name:     SDD Summary MCP  (any name works)\n    Grant Types:  Code Authorization   \u2190 must be this one\n    Redirect URI: http://localhost:8787/callback   \u2190 must match exactly\n  No client secret is needed; this uses Authorization Code + PKCE.\n\nStep 2 \u2014 Add all 8 scopes under the Scope tab\n  ai-studio, analytics, assistants, conversations, notifications,\n  routing:readonly, speech-and-text-analytics:readonly, users:readonly\n  The three :readonly variants are what the Genesys scope picker offers \u2014\n  this server only reads from those three APIs.\n  Add every one now. A missing scope fails later in non-obvious ways \u2014\n  e.g. without `conversations`, voice transcripts work and only\n  messaging transcripts fail, with a 403 that looks unrelated.\n\nStep 3 \u2014 Save, then copy the Authorization URL\n  Reopen the client \u2192 scroll to the bottom \u2192 copy "Authorization URL".\n  It is usually the admin deep-link form, which is correct:\n    https://apps.{region}/directory/#/admin/access-management/authorized-apps/{id}\n  The /oauth/authorize?client_id=... form is also accepted.\n\nThen call: login(authorization_url="<pasted URL>") with whatever they pasted.\nDo not reject or rewrite it \u2014 pass it through as-is.\n\nThat URL is all that is needed \u2014 client ID and region are parsed from it.\nDo not set GENESYS_CLIENT_ID as an environment variable; it shadows the\nstored config and causes logins against the wrong org.'
    );
  }
  const loginBase = config2.loginUrl ?? `https://login.${config2.region}`;
  try {
    const { authUrl } = preparePkceLogin(config2);
    return ok(
      `\u2500\u2500\u2500 Genesys Cloud Login \u2500\u2500\u2500

Starting login for:
  Client ID:  ${config2.clientId.slice(0, 8)}...
  Region:     ${config2.region}
  Login base: ${loginBase}

Your browser should open automatically. If it doesn't, open this URL manually:

  ${authUrl}

\u2500\u2500\u2500 Steps \u2500\u2500\u2500
1. Log in with your Genesys Cloud credentials in the browser
2. You will see a "Logged in to Genesys Cloud \u2713" confirmation page
3. Return here and call: complete_login()
`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return ok(
      `Failed to start login: ${message}

  Client ID: ${config2.clientId.slice(0, 8)}...
  Login base: ${loginBase}

  \u2022 Port 8787 in use \u2192 kill it: lsof -ti:8787 | xargs kill -9, then retry`
    );
  }
}
async function complete_login(_args) {
  const fileConfig = loadConfig().genesys;
  const config2 = fileConfig ?? getGenesysConfig();
  if (!config2) {
    return ok("No credentials configured. Call connect(authorization_url=...) first.");
  }
  try {
    const { token } = await completePkceLogin(config2);
    const smokeResult = await smoke_test_auth(_args);
    const smokeText = smokeResult.content[0]?.text ?? "";
    return ok(
      `\u2500\u2500\u2500 Login complete \u2500\u2500\u2500

Logged in successfully. User token stored (expires in ~30 min).
  Client ID: ${config2.clientId.slice(0, 8)}...
  Region:    ${config2.region}
  Token:     ${token.slice(0, 12)}...

\u2500\u2500\u2500 Scope verification \u2500\u2500\u2500

` + smokeText
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return ok(
      `Login failed: ${message}

\u2500\u2500\u2500 Common causes \u2500\u2500\u2500
  \u2022 "OAuth client ID or redirect URI is invalid"
    \u2192 confirm http://localhost:8787/callback is listed under Redirect URIs on your OAuth client
    \u2192 confirm the client_id in the URL matches the OAuth client
  \u2022 No login in progress \u2192 call connect(authorization_url=...) to start again
  \u2022 Timed out (3 min limit) \u2192 call connect(authorization_url=...) to restart`
    );
  }
}
async function logout(_args) {
  clearUserToken();
  return ok("User token cleared. The server will use client credentials on the next request.");
}
async function runScopeCheck(name, scope, requiresUserToken, hasUserToken, testFn) {
  const base = {
    scope,
    description: name,
    requiresUserToken
  };
  if (requiresUserToken && !hasUserToken) {
    return {
      ...base,
      status: "no_user_token",
      detail: "Requires user login \u2014 run the login tool and retry."
    };
  }
  try {
    await testFn();
    return { ...base, status: "ok", detail: "API call succeeded." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isScopeFail = msg.includes("403") || msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("scope");
    const isAuthFail = msg.includes("401") || msg.toLowerCase().includes("unauthorized");
    if (isScopeFail) {
      return {
        ...base,
        status: "missing_scope",
        detail: `Scope '${scope}' appears to be missing from the OAuth client. Add it in Genesys Admin \u2192 Integrations \u2192 OAuth. Error: ${msg}`
      };
    }
    if (isAuthFail) {
      return {
        ...base,
        status: "missing_scope",
        detail: `Authentication failed \u2014 token may be expired. Run login and retry. Error: ${msg}`
      };
    }
    return { ...base, status: "ok", detail: `API responded (non-auth error, scope present): ${msg}` };
  }
}
async function smoke_test_auth(_args) {
  const config2 = getGenesysConfig();
  if (!config2) {
    return ok(
      'No Genesys credentials configured.\nCall login(authorization_url="...") first, then complete_login(), then retry.\nDo not call configure_credentials \u2014 login() parses everything it needs from the\nAuthorization URL on your OAuth client page.'
    );
  }
  const userToken = await getUserToken(config2);
  const hasUserToken = !!userToken;
  const authMode = hasUserToken ? "user token (Authorization Code + PKCE)" : "client credentials only";
  const { genesys: genesys2 } = await Promise.resolve().then(() => (init_client(), client_exports));
  const checks = await Promise.all([
    // 1. users scope — resolve current user (user token only)
    runScopeCheck(
      "Identity: resolve current user",
      "users:readonly",
      true,
      hasUserToken,
      async () => {
        const base = `https://api.${config2.region}`;
        const resp = await fetch(`${base}/api/v2/users/me`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: "application/json"
          }
        });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      }
    ),
    // 2. ai-studio scope — list summary settings (Conversations Summaries API requires ai-studio)
    runScopeCheck(
      "AI Studio: list summary settings",
      "ai-studio",
      false,
      hasUserToken,
      async () => {
        await genesys2.get("/api/v2/conversations/summaries/settings");
      }
    ),
    // 3. analytics scope — run a minimal conversation query
    runScopeCheck(
      "Analytics: query conversations",
      "analytics",
      false,
      hasUserToken,
      async () => {
        await genesys2.post("/api/v2/analytics/conversations/details/query", {
          interval: "2020-01-01T00:00:00Z/2020-01-01T00:01:00Z",
          paging: { pageSize: 1, pageNumber: 1 }
        });
      }
    ),
    // 4. speechandtextanalytics scope — list STA programs
    runScopeCheck(
      "Speech & Text Analytics: read STA programs",
      "speech-and-text-analytics:readonly",
      false,
      hasUserToken,
      async () => {
        await genesys2.get("/api/v2/speechandtextanalytics/programs?pageSize=1");
      }
    ),
    // 5. assistants scope — list assistants
    runScopeCheck(
      "Assistants: list Agent Copilot assistants",
      "assistants",
      false,
      hasUserToken,
      async () => {
        await genesys2.get(`/api/v2/assistants?pageSize=1`);
      }
    ),
    // 6. notifications scope — create a notification channel (user token only; required for preview summaries)
    runScopeCheck(
      "Notifications: create a notification channel",
      "notifications",
      true,
      hasUserToken,
      async () => {
        const base = `https://api.${config2.region}`;
        const resp = await fetch(`${base}/api/v2/notifications/channels`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: "{}"
        });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      }
    ),
    // 7. routing scope — list queues (required for build_interaction_filter)
    runScopeCheck(
      "Routing: list queues",
      "routing:readonly",
      false,
      hasUserToken,
      async () => {
        await genesys2.get("/api/v2/routing/queues?pageSize=1");
      }
    ),
    // 8. conversations scope — read a messaging conversation.
    //    Required by the messaging transcript fallback in fetch_transcripts_bulk
    //    (GET /conversations/messages/{id} + POST .../messages/bulk), which runs
    //    whenever STA transcript retrieval fails on a messaging interaction.
    //    NOTE: this scope is NOT what authorises the summary settings endpoints —
    //    those authorise under ai-studio despite living beneath /conversations/.
    //    A well-formed but non-existent conversation ID gives us clean
    //    discrimination: 403 when the scope is absent, 404 when it is present
    //    (runScopeCheck treats non-auth errors as proof the scope exists).
    runScopeCheck(
      "Conversations: read messaging conversation",
      "conversations",
      false,
      hasUserToken,
      async () => {
        await genesys2.get(
          "/api/v2/conversations/messages/00000000-0000-0000-0000-000000000000"
        );
      }
    )
  ]);
  const passed = checks.filter((c) => c.status === "ok").length;
  const missingScope = checks.filter((c) => c.status === "missing_scope");
  const needsLogin = checks.filter((c) => c.status === "no_user_token");
  const total = checks.length;
  const statusIcon = (s) => {
    switch (s) {
      case "ok":
        return "\u2713";
      case "missing_scope":
        return "\u2717";
      case "no_user_token":
        return "\u26A0";
      case "error":
        return "?";
    }
  };
  const lines = [
    `Auth mode: ${authMode}`,
    `Result: ${passed}/${total} checks passed`,
    "",
    ...checks.map(
      (c) => `${statusIcon(c.status)} [${c.scope}] ${c.description}
  \u2192 ${c.detail}`
    )
  ];
  if (missingScope.length > 0) {
    lines.push(
      "",
      "\u2500\u2500\u2500 Action required \u2500\u2500\u2500",
      "The following scopes are missing from your OAuth client.",
      "Fix: Genesys Admin \u2192 Integrations \u2192 OAuth \u2192 your client \u2192 Scope tab \u2192 add each missing scope.",
      "",
      ...missingScope.map((c) => `  \u2022 ${c.scope}`)
    );
  }
  if (needsLogin.length > 0) {
    lines.push(
      "",
      "\u2500\u2500\u2500 User login required \u2500\u2500\u2500",
      "Some checks require a user token and were skipped. Run the login tool, then retry smoke_test_auth."
    );
  }
  if (missingScope.length === 0 && needsLogin.length === 0) {
    lines.push("", "All checks passed \u2014 credentials and scopes are correctly configured.");
  }
  return ok(lines.join("\n"));
}
async function search_conversations(args) {
  return withTokenRefresh(async () => {
    const results = await searchConversations({
      dateFrom: str(args, "date_from"),
      dateTo: str(args, "date_to"),
      queueIds: Array.isArray(args.queue_ids) ? args.queue_ids.map(String) : void 0,
      wrapUpCodes: Array.isArray(args.wrap_up_codes) ? args.wrap_up_codes.map(String) : void 0,
      maxResults: typeof args.max_results === "number" ? args.max_results : 25
    });
    return json({
      total: results.length,
      conversations: results,
      tip: "Use fetch_transcript with summary_config_name, conversation_id, and transcript_type to cache a transcript for testing."
    });
  });
}
async function fetch_transcript(args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const conversationId = str(args, "conversation_id");
    const transcriptType = optStr(args, "transcript_type") ?? "static";
    const communicationId = optStr(args, "communication_id") ?? await resolveCustomerCommunicationId(conversationId);
    const label = optStr(args, "label") ?? `${conversationId.slice(0, 8)}/${communicationId.slice(0, 8)}`;
    const { plainText, rawJson } = await fetchAndTransformTranscript(conversationId, communicationId);
    const transcript = {
      id: v4_default(),
      label,
      conversationId,
      communicationId,
      plainText,
      rawJson,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      transcriptType
    };
    saveLifecycleTranscript(configName, transcript);
    return json({
      id: transcript.id,
      label,
      transcriptType,
      summaryConfigName: configName,
      conversationId,
      communicationId,
      lineCount: plainText.split("\n").length,
      preview: plainText.slice(0, 300) + (plainText.length > 300 ? "..." : "")
    });
  });
}
async function fetchBestExistingSummary(conversationId) {
  try {
    const resp = await getExistingSummaries(conversationId);
    const entities = resp?.entities ?? [];
    if (entities.length === 0) return void 0;
    const agentEntities = entities.filter((e) => e.summaryType === "Agent" && e.summary);
    if (agentEntities.length > 0) {
      const edited = agentEntities.find((e) => e.generated === false);
      const aiGenerated = agentEntities.find((e) => e.generated === true);
      if (edited?.summary && aiGenerated?.summary) {
        return {
          existingSummary: edited.summary,
          aiGeneratedSummary: aiGenerated.summary
        };
      }
      const best = edited ?? aiGenerated;
      if (best?.summary) return { existingSummary: best.summary };
    }
    const preferred = ["Conversation"];
    for (const type of preferred) {
      const match = entities.find((e) => e.summaryType === type && e.summary);
      if (match?.summary) return { existingSummary: match.summary };
    }
    const first = entities[0]?.summary;
    return first ? { existingSummary: first } : void 0;
  } catch {
    return void 0;
  }
}
async function fetch_transcripts_bulk(args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const dateFrom = str(args, "date_from");
    const dateTo = str(args, "date_to");
    const maxConversations = Math.min(typeof args.max_conversations === "number" ? args.max_conversations : 50, 200);
    const concurrency = Math.min(typeof args.concurrency === "number" ? args.concurrency : 5, 10);
    const filter = loadInteractionFilter(configName);
    if (!filter) {
      return ok(
        `No interaction-filter.json found for "${configName}".

Run build_interaction_filter first to set up the working directory.`
      );
    }
    const conversations = await searchConversations({
      dateFrom,
      dateTo,
      queueIds: filter.queueIds,
      maxResults: maxConversations,
      includeMediaTypes: ["voice", "message", "callback"]
    });
    if (conversations.length === 0) {
      return ok(
        `No conversations found for "${configName}" between ${dateFrom} and ${dateTo}.

The queues may have had no activity in this period.`
      );
    }
    const results = {
      saved: 0,
      skipped: 0,
      noTranscript: 0,
      errors: 0,
      errorDetails: []
    };
    const queue = [...conversations];
    const inFlight = [];
    async function processOne(conv) {
      try {
        const existing = getLifecycleTranscript(configName, conv.conversationId);
        if (existing) {
          results.skipped++;
          return;
        }
        const ALLOWED_TYPES = /* @__PURE__ */ new Set(["voice", "message", "callback"]);
        const types = (conv.communications ?? []).map((c) => c.type ?? "");
        const hasAllowed = types.some((t) => ALLOWED_TYPES.has(t));
        if (!hasAllowed) {
          results.skipped++;
          return;
        }
        let plainText;
        let rawJson;
        let communicationId;
        try {
          communicationId = await resolveCustomerCommunicationId(conv.conversationId);
          const fetched = await fetchAndTransformTranscript(conv.conversationId, communicationId);
          plainText = fetched.plainText;
          rawJson = fetched.rawJson;
        } catch {
        }
        if (!plainText) {
          const isMessaging = (conv.communications ?? []).some((c) => c.type === "message");
          if (isMessaging) {
            try {
              plainText = await fetchMessagingTranscript(conv.conversationId);
              communicationId = void 0;
              rawJson = void 0;
            } catch {
            }
          }
        }
        if (!plainText) {
          results.noTranscript++;
          return;
        }
        const summaryResult = await fetchBestExistingSummary(conv.conversationId);
        const transcript = {
          id: conv.conversationId,
          label: `${conv.startTime ? new Date(conv.startTime).toLocaleDateString("en-AU") : "?"} / ${conv.conversationId.slice(0, 8)}`,
          conversationId: conv.conversationId,
          ...communicationId ? { communicationId } : {},
          plainText,
          // rawJson intentionally omitted — plainText is the only downstream-usable form
          ...summaryResult ? {
            existingSummary: summaryResult.existingSummary,
            ...summaryResult.aiGeneratedSummary ? { aiGeneratedSummary: summaryResult.aiGeneratedSummary } : {}
          } : {},
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          transcriptType: "static"
        };
        saveLifecycleTranscript(configName, transcript);
        results.saved++;
      } catch (err) {
        results.errors++;
        results.errorDetails.push(`${conv.conversationId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    let idx = 0;
    while (idx < queue.length || inFlight.length > 0) {
      while (inFlight.length < concurrency && idx < queue.length) {
        const conv = queue[idx++];
        const p = processOne(conv).then(() => {
          inFlight.splice(inFlight.indexOf(p), 1);
        });
        inFlight.push(p);
      }
      if (inFlight.length > 0) await Promise.race(inFlight);
    }
    const lines = [
      `\u2500\u2500\u2500 Bulk Fetch Complete \u2500\u2500\u2500`,
      ``,
      `Working dir:       ${configName}`,
      `Date range:        ${dateFrom} \u2192 ${dateTo}`,
      `Conversations:     ${conversations.length} found`,
      ``,
      `\u2713 Saved:           ${results.saved} transcripts + summaries`,
      `\u21B7 Skipped:         ${results.skipped} (already saved)`,
      `\u2717 No transcript:   ${results.noTranscript} (not transcribed)`,
      ...results.errors > 0 ? [`\u26A0 Errors:          ${results.errors}`] : []
    ];
    if (results.errorDetails.length > 0) {
      lines.push(``, `Errors:`, ...results.errorDetails.slice(0, 5).map((e) => `  \u2022 ${e}`));
    }
    lines.push(
      ``,
      `Saved to: .summaryconfig-lifecycle/${configName}/transcripts/static/`,
      ``,
      `Next: use list_transcripts(summary_config_name="${configName}") to review, or generate_test_case to build a test case from one of the transcripts.`
    );
    return ok(lines.join("\n"));
  });
}
async function fetch_existing_summaries_bulk(args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const concurrency = Math.min(typeof args.concurrency === "number" ? args.concurrency : 5, 10);
    const overwrite = args.overwrite === true;
    const transcripts = listLifecycleTranscripts(configName);
    if (transcripts.length === 0) {
      return ok(`No transcripts found in "${configName}". Run fetch_transcripts_bulk first.`);
    }
    const toProcess = overwrite ? transcripts : transcripts.filter((t) => !t.existingSummary);
    if (toProcess.length === 0) {
      return ok(
        `All ${transcripts.length} transcripts in "${configName}" already have summaries.
Pass overwrite=true to re-fetch.`
      );
    }
    const results = { enriched: 0, noSummary: 0, errors: 0, skipped: transcripts.length - toProcess.length };
    const queue = [...toProcess];
    const inFlight = [];
    async function processOne(t) {
      if (!t.conversationId) {
        results.noSummary++;
        return;
      }
      try {
        const summaryResult = await fetchBestExistingSummary(t.conversationId);
        if (!summaryResult) {
          results.noSummary++;
          return;
        }
        const updated = {
          ...t,
          rawJson: void 0,
          // strip rawJson — plainText is all that's needed downstream
          existingSummary: summaryResult.existingSummary,
          ...summaryResult.aiGeneratedSummary ? { aiGeneratedSummary: summaryResult.aiGeneratedSummary } : {}
        };
        if (t.transcriptType === "dynamic") {
          updateDynamicTranscript(configName, updated);
        } else {
          saveLifecycleTranscript(configName, updated);
        }
        results.enriched++;
      } catch {
        results.errors++;
      }
    }
    let idx = 0;
    while (idx < queue.length || inFlight.length > 0) {
      while (inFlight.length < concurrency && idx < queue.length) {
        const t = queue[idx++];
        const p = processOne(t).then(() => {
          inFlight.splice(inFlight.indexOf(p), 1);
        });
        inFlight.push(p);
      }
      if (inFlight.length > 0) await Promise.race(inFlight);
    }
    return ok(
      `\u2500\u2500\u2500 Summary Enrichment Complete \u2500\u2500\u2500

Working dir:  ${configName}
Total:        ${transcripts.length} transcripts

\u2713 Enriched:   ${results.enriched} (summaries added)
\u21B7 Skipped:    ${results.skipped} (already had summary)
\u2717 No summary: ${results.noSummary} (conversation has no production summary)
` + (results.errors > 0 ? `\u26A0 Errors:      ${results.errors}
` : ``) + `
Summaries saved to each transcript's existingSummary field.`
    );
  });
}
async function store_transcript(args) {
  const configName = str(args, "summary_config_name");
  const raw = str(args, "transcript");
  const transcriptType = optStr(args, "transcript_type") ?? "static";
  const plainText = normaliseManualTranscript(raw);
  const transcript = {
    id: v4_default(),
    label: optStr(args, "label") ?? "Manual transcript",
    conversationId: optStr(args, "conversation_id"),
    plainText,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    transcriptType
  };
  saveLifecycleTranscript(configName, transcript);
  return json({
    id: transcript.id,
    label: transcript.label,
    transcriptType,
    summaryConfigName: configName,
    lineCount: plainText.split("\n").length
  });
}
async function list_transcripts(args) {
  const configName = str(args, "summary_config_name");
  const transcriptType = optStr(args, "transcript_type");
  const transcripts = listLifecycleTranscripts(configName, transcriptType);
  return json(
    transcripts.map((t) => ({
      id: t.id,
      label: t.label,
      transcriptType: t.transcriptType,
      conversationId: t.conversationId,
      lineCount: t.plainText.split("\n").length,
      generatedSummaryCount: t.generatedSummaries?.length ?? 0,
      hasEditedSummary: !!t.editedSummary,
      createdAt: t.createdAt
    }))
  );
}
async function list_summary_settings(_args) {
  return withTokenRefresh(async () => {
    const settings = await listSummarySettings();
    return json(settings.map((s) => ({ id: s.id, name: s.name, language: s.language, prompt: s.prompt?.slice(0, 100) })));
  });
}
async function get_summary_setting(args) {
  return withTokenRefresh(async () => {
    const setting = await getSummarySetting(str(args, "summary_setting_id"));
    return json(setting);
  });
}
async function create_summary_setting(args) {
  return withTokenRefresh(async () => {
    const setting = {
      name: str(args, "name"),
      prompt: str(args, "prompt"),
      language: optStr(args, "language") ?? "en-au",
      summaryType: optStr(args, "summary_type") ?? "Concise",
      format: optStr(args, "format") ?? "TextBlock",
      maskPII: { all: args.mask_pii === true },
      predefinedInsights: Array.isArray(args.predefined_insights) ? args.predefined_insights : [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: typeof args.timeout_duration === "number" ? args.timeout_duration : 20
    };
    const created = await createSummarySetting(setting);
    return json({ success: true, id: created.id, name: created.name });
  });
}
async function update_summary_setting(args) {
  return withTokenRefresh(async () => {
    let id;
    if (args.summary_setting_id) {
      id = str(args, "summary_setting_id");
    } else if (args.summary_config_name) {
      const configName = str(args, "summary_config_name");
      const filter = loadInteractionFilter(configName);
      if (!filter?.summarySettingId) {
        throw new Error(
          `Cannot resolve a summary setting for config "${configName}" \u2014 no interaction filter found. Run build_interaction_filter first, or pass summary_setting_id explicitly.`
        );
      }
      id = filter.summarySettingId;
    } else {
      throw new Error("Either summary_setting_id or summary_config_name is required");
    }
    const patch = { prompt: str(args, "prompt") };
    if (args.name) patch.name = str(args, "name");
    const updated = await updateSummarySetting(id, patch);
    return json({ success: true, id: updated.id, name: updated.name });
  });
}
async function generate_preview_summary(args) {
  const configName = optStr(args, "summary_config_name");
  let transcript;
  if (args.transcript_id) {
    const tId = str(args, "transcript_id");
    let stored = null;
    if (configName) {
      stored = getLifecycleTranscript(configName, tId);
    }
    if (!stored) throw new Error(`Transcript not found: ${tId}. Provide summary_config_name if the transcript is stored in the lifecycle structure.`);
    transcript = stored.plainText;
  } else if (args.transcript_text) {
    transcript = str(args, "transcript_text");
  } else {
    throw new Error("Either transcript_id or transcript_text is required");
  }
  let setting;
  if (args.summary_setting_id) {
    setting = await getSummarySetting(str(args, "summary_setting_id"));
    if (args.prompt) setting.prompt = str(args, "prompt");
  } else {
    if (!args.prompt) throw new Error("Either summary_setting_id or prompt is required");
    setting = {
      name: "preview-test",
      prompt: str(args, "prompt"),
      language: optStr(args, "language") ?? "en-au",
      summaryType: optStr(args, "summary_type") ?? "Concise",
      format: optStr(args, "format") ?? "TextBlock",
      maskPII: { all: false },
      predefinedInsights: Array.isArray(args.predefined_insights) ? args.predefined_insights : [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 20
    };
  }
  return withTokenRefresh(async () => {
    const response = await generatePreviewSummary(transcript, setting);
    if (response === null) {
      return ok(
        "Preview request sent (204 accepted), but no user token is available to receive the result.\n\nThe preview API delivers results via a user-scoped WebSocket notification. Call the login tool to authenticate as a Genesys Cloud user, then retry."
      );
    }
    const summaryText = extractSummaryText(response);
    if (args.transcript_id && configName) {
      const tId = str(args, "transcript_id");
      const stored = getLifecycleTranscript(configName, tId);
      if (stored && stored.transcriptType === "dynamic") {
        stored.generatedSummaries = stored.generatedSummaries ?? [];
        stored.generatedSummaries.push({
          prompt: setting.prompt,
          summary: summaryText,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        updateDynamicTranscript(configName, stored);
      }
    }
    return json({
      summary: summaryText,
      raw_response: response,
      transcript_lines: transcript.split("\n").length
    });
  });
}
async function get_existing_summaries(args) {
  return withTokenRefresh(async () => {
    const result = await getExistingSummaries(str(args, "conversation_id"));
    return json(result);
  });
}
async function generate_test_case(args) {
  const configName = str(args, "summary_config_name");
  const transcriptIds = strArr(args, "sample_transcript_ids");
  const sampleSummaries = strArr(args, "sample_summaries");
  const testCaseName = str(args, "test_case_name");
  const focusAreas = Array.isArray(args.focus_areas) ? args.focus_areas.map(String) : [];
  if (transcriptIds.length !== sampleSummaries.length) {
    throw new Error("sample_transcript_ids and sample_summaries must have the same length");
  }
  const samples = transcriptIds.map((id, i) => {
    const t = getLifecycleTranscript(configName, id);
    return {
      transcriptId: id,
      transcript: t?.plainText ?? "(transcript not found)",
      idealSummary: sampleSummaries[i]
    };
  });
  return json({
    instruction: [
      "Using the sample transcripts and ideal summaries below, author a test case JSON and call save_test_case to persist it.",
      "",
      "STEP 1 \u2014 IDENTIFY DIMENSIONS (3\u20136)",
      "Each dimension tests one discrete, observable concern in the summary output.",
      "Derive dimensions from what the ideal summaries demonstrate \u2014 not from generic principles.",
      "Each dimension must reference the BR- requirement IDs it validates (from requirements/final/requirements.md).",
      "",
      "STEP 2 \u2014 DETERMINE applicability_condition FOR EVERY DIMENSION (MANDATORY)",
      "For each dimension, ask: 'Is this check meaningful for every transcript, or only when a specific condition is present?'",
      "",
      "Set applicability_condition to:",
      '  - "always"  \u2192  the dimension applies unconditionally to every transcript',
      "  - A plain-English condition string  \u2192  the dimension only applies when the condition is true",
      "",
      "Common condition patterns to consider:",
      "  - 'Summary contains bullets.'  (for bullet-character or bullet-format rules)",
      "  - 'Summary contains at least 2 sections.'  (for section-separator rules)",
      "  - 'Only applies when a third party participated in the interaction.'",
      "  - 'Only applies when a complaint or dissatisfaction was raised.'",
      "  - 'Only applies when order status was explicitly discussed.'",
      "  - 'Only applies when the customer's intent was unclear in the transcript.'",
      "",
      "STEP 3 \u2014 PAUSE AND ASK WHEN UNCERTAIN",
      "If you are unsure whether a dimension is 'always' or conditional:",
      "  DO NOT default to 'always' and proceed.",
      "  Instead, stop, describe the uncertain dimension(s), and ask the user to clarify the condition before calling save_test_case.",
      `  Example: 'I'm not sure whether "Fallback text used" should be always or only applies when intent is unclear \u2014 which do you prefer?'`,
      "",
      "STEP 4 \u2014 WRITE CRITERIA",
      "pass_criteria: describe the scoring gradient from 1.0 (perfect) downward with explicit decimal anchor points.",
      "  Format: 'Score 1.0: [perfect]. Score [X] if [partial condition]. Score 0 if [total failure].'",
      "fail_criteria: describe the complete failure condition (score 0 only).",
      "pass_threshold: 1.0 for binary must/must-not rules; 0.8 for coverage and style rules.",
      "",
      "STEP 5 \u2014 CALL save_test_case",
      "Only call save_test_case once all dimensions have confirmed applicability_conditions.",
      "Never call save_test_case with any dimension still set to 'always' if you are not certain that is correct."
    ].join("\n"),
    test_case_name: testCaseName,
    summary_config_name: configName,
    focus_areas: focusAreas,
    samples,
    applicability_condition_examples: {
      note: "These are real examples showing how applicability_condition is used in practice. Use them as reference when authoring new dimensions.",
      always: [
        { dimension: "Customer terminology", condition: "always", rationale: "Every summary references the external participant \u2014 the terminology rule applies universally." },
        { dimension: "Nothing inferred", condition: "always", rationale: "Inference is prohibited in all summaries, regardless of transcript content." },
        { dimension: "Numbered lists absent", condition: "always", rationale: "Numbered lists are prohibited everywhere \u2014 applies regardless of summary content." }
      ],
      conditional: [
        { dimension: "Section spacing correct", condition: "Summary contains at least 2 sections.", rationale: "A single-section summary has no adjacent sections to separate \u2014 the rule is structurally inapplicable." },
        { dimension: "Bullet character correct", condition: "Summary contains bullets.", rationale: "A summary with no bullets cannot violate the bullet character rule." },
        { dimension: "Third-party role stated", condition: "Only applies when a third party participated in the interaction.", rationale: "If no third party was present, there is nothing to identify \u2014 scoring would be meaningless." },
        { dimension: "Each intent captured separately", condition: "Only applies when the customer expressed more than one distinct intent.", rationale: "A single-intent call cannot be tested for multi-intent capture." },
        { dimension: "Fallback when status absent", condition: "Only applies when the order status was NOT discussed in the transcript.", rationale: "If the stage was discussed, the dimension being tested (fallback text) is not applicable." }
      ]
    }
  });
}
async function save_test_case(args) {
  const configName = str(args, "summary_config_name");
  const name = str(args, "name");
  const rawDimensions = Array.isArray(args.dimensions) ? args.dimensions : [];
  const testCase = {
    name,
    description: optStr(args, "description") ?? "",
    dimensions: rawDimensions.map((d) => {
      const dim = d;
      return {
        name: String(dim.name ?? ""),
        description: String(dim.description ?? ""),
        weight: Number(dim.weight ?? 3),
        applicabilityCondition: String(dim.applicability_condition ?? "always"),
        passCriteria: String(dim.pass_criteria ?? ""),
        failCriteria: String(dim.fail_criteria ?? ""),
        passThreshold: dim.pass_threshold != null ? Number(dim.pass_threshold) : 0.8,
        requirementIds: Array.isArray(dim.requirement_ids) ? dim.requirement_ids.map(String) : void 0
      };
    }),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveTestCase(configName, testCase);
  return json({
    name: testCase.name,
    summaryConfigName: configName,
    dimensions: testCase.dimensions.length
  });
}
async function list_test_cases(args) {
  const configName = str(args, "summary_config_name");
  return json(
    listTestCases(configName).map((tc) => ({
      name: tc.name,
      description: tc.description,
      dimensions: tc.dimensions.map((d) => d.name),
      createdAt: tc.createdAt
    }))
  );
}
async function save_test_set(args) {
  const configName = str(args, "summary_config_name");
  const name = str(args, "name");
  const testSet = {
    name,
    description: optStr(args, "description"),
    testCaseNames: strArr(args, "test_case_names"),
    transcriptIds: strArr(args, "transcript_ids"),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveTestSet(configName, testSet);
  return json({
    name: testSet.name,
    summaryConfigName: configName,
    testCases: testSet.testCaseNames.length,
    transcripts: testSet.transcriptIds.length
  });
}
async function list_test_sets(args) {
  const configName = str(args, "summary_config_name");
  return json(
    listTestSets(configName).map((ts) => ({
      name: ts.name,
      description: ts.description,
      testCaseNames: ts.testCaseNames,
      transcriptCount: ts.transcriptIds.length,
      createdAt: ts.createdAt
    }))
  );
}
async function evaluate_summary(args) {
  const configName = str(args, "summary_config_name");
  const testCaseName = str(args, "test_case_name");
  const testCase = getTestCase(configName, testCaseName);
  if (!testCase) throw new Error(`Test case not found: ${testCaseName} (in config: ${configName})`);
  return json({
    instruction: "Evaluate the summary below against each test case dimension. For each dimension, determine whether it PASSED or FAILED based on the criteria, provide a score (0.0\u20131.0), and give brief reasoning. Then call save_eval_run with the results.",
    test_case: {
      name: testCase.name,
      description: testCase.description,
      dimensions: testCase.dimensions.map((d) => ({
        name: d.name,
        description: d.description,
        weight: d.weight,
        pass_criteria: d.passCriteria,
        fail_criteria: d.failCriteria
      }))
    },
    transcript: str(args, "transcript_text"),
    summary: str(args, "summary_text"),
    score_template: testCase.dimensions.map((d) => ({
      dimension: d.name,
      passed: null,
      score: null,
      reasoning: ""
    }))
  });
}
var pendingEvalRuns = /* @__PURE__ */ new Map();
async function run_test_suite(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const prompt = str(args, "prompt");
  const testSet = getTestSet(configName, testSetName);
  if (!testSet) throw new Error(`Test set not found: ${testSetName} (in config: ${configName})`);
  let setting;
  if (args.summary_setting_id) {
    setting = await getSummarySetting(str(args, "summary_setting_id"));
    setting.prompt = prompt;
  } else {
    setting = {
      name: testSetName,
      prompt,
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 20
    };
  }
  const testCases = testSet.testCaseNames.map((name) => {
    const tc = getTestCase(configName, name);
    if (!tc) throw new Error(`Test case not found: ${name} (in config: ${configName})`);
    return tc;
  });
  const generated = [];
  for (const tId of testSet.transcriptIds) {
    const stored = getLifecycleTranscript(configName, tId);
    if (!stored) throw new Error(`Transcript not found: ${tId} (in config: ${configName})`);
    const response = await generatePreviewSummary(stored.plainText, setting);
    if (response === null) {
      throw new Error(
        "No user token available for preview generation. Call the login tool to authenticate as a Genesys Cloud user first."
      );
    }
    const summaryText = extractSummaryText(response);
    generated.push({
      transcriptId: tId,
      transcriptLabel: stored.label,
      transcript: stored.plainText,
      summary: summaryText
    });
  }
  const runKey = v4_default();
  pendingEvalRuns.set(runKey, {
    configName,
    testSetName,
    prompt,
    setting,
    generated,
    testCaseNames: testSet.testCaseNames,
    transcriptIds: testSet.transcriptIds
  });
  return json({
    run_key: runKey,
    summary_config_name: configName,
    test_set_name: testSetName,
    prompt_used: prompt,
    instruction: "Below are the generated summaries for each transcript. Evaluate each against every test case dimension, then call save_eval_run with your scores to persist the results.",
    test_cases: testCases.map((tc) => ({
      name: tc.name,
      description: tc.description,
      dimensions: tc.dimensions.map((d) => ({
        name: d.name,
        weight: d.weight,
        pass_criteria: d.passCriteria,
        fail_criteria: d.failCriteria
      }))
    })),
    generated_summaries: generated
  });
}
async function save_eval_run(args) {
  const runKey = str(args, "run_key");
  const rawResults = Array.isArray(args.results) ? args.results : [];
  const suggestedImprovements = optStr(args, "suggested_improvements");
  const pending = pendingEvalRuns.get(runKey);
  if (!pending) {
    throw new Error(
      `No pending eval run found with run_key ${runKey}. Make sure to call run_test_suite first.`
    );
  }
  const { configName, testSetName, prompt, setting, generated, testCaseNames, transcriptIds } = pending;
  const evalResults = rawResults.map((r) => {
    const row = r;
    const tId = String(row.transcript_id ?? "");
    const testCaseName = String(row.test_case_name ?? "");
    const stored = getLifecycleTranscript(configName, tId);
    const generatedEntry = generated.find((g) => g.transcriptId === tId);
    const rawScores = Array.isArray(row.dimension_scores) ? row.dimension_scores : [];
    const dimensionScores = rawScores.map((s) => {
      const sc = s;
      const dimName = String(sc.dimension ?? "");
      if (sc.score === null) {
        return { dimension: dimName, score: null, na: true, passed: true, reasoning: String(sc.reasoning ?? "") };
      }
      return {
        dimension: dimName,
        passed: Boolean(sc.passed),
        score: Number(sc.score ?? 0),
        na: false,
        reasoning: String(sc.reasoning ?? "")
      };
    });
    const scoredDims = dimensionScores.filter((d) => !d.na);
    const overallScore = scoredDims.length > 0 ? scoredDims.reduce((sum, d) => sum + d.score, 0) / scoredDims.length : 0;
    const overallPassed = scoredDims.length === 0 || scoredDims.every((d) => d.passed);
    return {
      testCaseName,
      transcriptId: tId,
      transcriptLabel: stored?.label ?? tId,
      summary: generatedEntry?.summary ?? "",
      dimensionScores,
      overallPassed,
      overallScore
    };
  });
  const aggregatePassRate = evalResults.length > 0 ? evalResults.filter((r) => r.overallPassed).length / evalResults.length : 0;
  const runNumber = getNextRunNumber(configName, testSetName);
  const meta = {
    runNumber,
    testSetName,
    summaryConfigName: configName,
    prompt,
    summarySetting: setting,
    transcriptIds,
    testCaseNames,
    aggregatePassRate,
    suggestedImprovements,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveEvalRun(configName, testSetName, runNumber, meta, evalResults);
  pendingEvalRuns.delete(runKey);
  return json({
    success: true,
    summary_config_name: configName,
    test_set_name: testSetName,
    run_number: runNumber,
    aggregate_pass_rate: `${(aggregatePassRate * 100).toFixed(1)}%`,
    transcripts_evaluated: evalResults.length,
    suggested_improvements: suggestedImprovements
  });
}
async function list_eval_runs(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = optStr(args, "test_set_name");
  const runs = listEvalRuns(configName, testSetName);
  return json(
    runs.map((r) => ({
      runNumber: r.runNumber,
      testSetName: r.testSetName,
      prompt: r.prompt.slice(0, 100) + (r.prompt.length > 100 ? "..." : ""),
      testCases: r.testCaseNames,
      transcriptCount: r.transcriptIds.length,
      passRate: `${(r.aggregatePassRate * 100).toFixed(1)}%`,
      createdAt: r.createdAt
    }))
  );
}
async function save_version(args) {
  const configName = str(args, "summary_config_name");
  const notes = optStr(args, "notes");
  const rawStatus = optStr(args, "status");
  if (rawStatus && rawStatus !== "candidate" && rawStatus !== "deployed") {
    throw new Error(`Invalid status: "${rawStatus}". Must be "candidate" or "deployed".`);
  }
  const status = rawStatus ?? (args.summary_setting_id ? "deployed" : "candidate");
  let setting;
  if (args.summary_setting_id) {
    setting = await getSummarySetting(str(args, "summary_setting_id"));
  } else if (args.prompt) {
    setting = {
      name: configName,
      prompt: str(args, "prompt"),
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 20
    };
  } else {
    throw new Error("Either summary_setting_id or prompt is required");
  }
  const snapshot = saveVersionSnapshot(configName, setting, notes, status);
  return json({
    success: true,
    version: snapshot.version,
    status: snapshot.status,
    summaryConfigName: configName,
    snapshotAt: snapshot.snapshotAt,
    notes: snapshot.notes
  });
}
async function list_versions(args) {
  const configName = str(args, "summary_config_name");
  return json(
    listVersionSnapshots(configName).map((v) => ({
      version: v.version,
      // Snapshots predating the status field are treated as deployed.
      status: v.status ?? "deployed",
      snapshotAt: v.snapshotAt,
      notes: v.notes,
      promptPreview: v.setting.prompt.slice(0, 100) + (v.setting.prompt.length > 100 ? "..." : "")
    }))
  );
}
async function generate_dashboard(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = optStr(args, "test_set_name");
  const title = optStr(args, "title") ?? `SDD Summary Dashboard \u2014 ${configName}`;
  const evalRunMetas = listEvalRuns(configName, testSetName);
  if (evalRunMetas.length === 0) {
    throw new Error(
      `No eval runs found for config "${configName}"${testSetName ? ` / test set "${testSetName}"` : ""}. Run a test suite first.`
    );
  }
  const runs = evalRunMetas.map((meta) => {
    const results = getEvalRunResults(configName, meta.testSetName, meta.runNumber);
    const transcriptResults = results.map((r) => ({
      transcriptId: r.transcriptId,
      transcriptLabel: r.transcriptLabel,
      summary: r.summary,
      dimensionScores: r.dimensionScores,
      overallPassed: r.overallPassed,
      overallScore: r.overallScore
    }));
    return {
      id: `${meta.testSetName}-${String(meta.runNumber).padStart(4, "0")}`,
      label: `${meta.testSetName} / Run ${meta.runNumber}`,
      summarySettingId: void 0,
      summarySetting: meta.summarySetting,
      rubricId: meta.testCaseNames.join(","),
      transcriptIds: meta.transcriptIds,
      results: transcriptResults,
      aggregatePassRate: meta.aggregatePassRate,
      promptVersion: meta.runNumber,
      suggestedImprovements: meta.suggestedImprovements,
      createdAt: meta.createdAt
    };
  });
  const outputPath = await generateDashboard(runs, title);
  return json({ success: true, path: outputPath, runs_included: runs.length });
}
async function list_assistants(_args) {
  return withTokenRefresh(async () => {
    const assistants = await listAssistants();
    return json(assistants);
  });
}
async function get_copilot_config(args) {
  return withTokenRefresh(async () => {
    const config2 = await getCopilotConfig(str(args, "assistant_id"));
    return json(config2);
  });
}
async function update_copilot_config(args) {
  return withTokenRefresh(async () => {
    const assistantId = str(args, "assistant_id");
    const config2 = args.config;
    if (!config2 || typeof config2 !== "object") throw new Error("config must be an object");
    const updated = await updateCopilotConfig(assistantId, config2);
    return json({ success: true, result: updated });
  });
}
async function build_interaction_filter(args) {
  return withTokenRefresh(async () => {
    const copilotId = optStr(args, "copilot_id");
    const copilotName = optStr(args, "copilot_name");
    const chosenSummarySettingId = optStr(args, "summary_setting_id");
    if (!copilotId && !copilotName) {
      return ok(
        'What is the name of your Agent Copilot in Genesys?\n\nProvide it as copilot_name (e.g. "Acme_Copilot") or copilot_id.\nNot sure? Call list_assistants to see all Agent Copilots in your org.'
      );
    }
    let resolvedId = copilotId ?? "";
    let resolvedName = copilotName ?? "";
    const all = await listAssistants();
    if (!copilotId && copilotName) {
      const match = all.find(
        (a) => a.name.toLowerCase() === copilotName.toLowerCase()
      );
      if (!match) {
        const names = all.map((a) => `  \u2022 ${a.name}`).join("\n");
        return ok(
          `No Agent Copilot found with name "${copilotName}".

Available Agent Copilots:
${names}`
        );
      }
      resolvedId = match.id;
      resolvedName = match.name;
    } else if (copilotId && !copilotName) {
      resolvedName = all.find((a) => a.id === copilotId)?.name ?? copilotId;
    }
    const copilot = await getCopilotConfig(resolvedId);
    const sgc = copilot.summaryGenerationConfig;
    if (!sgc?.enabled) {
      return ok(
        `"${resolvedName}" does not have summary generation enabled.

Enable it in Genesys Admin \u2192 Agent Copilot \u2192 ${resolvedName} \u2192 Summary, then re-run build_interaction_filter.`
      );
    }
    const allSettings = [];
    if (sgc.summarySettings && Array.isArray(sgc.summarySettings)) {
      for (const s of sgc.summarySettings) {
        if (s.id) allSettings.push({ id: s.id, language: s.language });
      }
    }
    if (sgc.summarySetting?.id) {
      if (!allSettings.some((s) => s.id === sgc.summarySetting.id)) {
        allSettings.push({ id: sgc.summarySetting.id });
      }
    }
    if (allSettings.length === 0) {
      return ok(
        `"${resolvedName}" has summary generation enabled but no summary setting is linked.

Link a summary configuration in Genesys Admin \u2192 Agent Copilot \u2192 ${resolvedName} \u2192 Summary, then re-run build_interaction_filter.`
      );
    }
    let chosenSetting;
    if (allSettings.length > 1 && !chosenSummarySettingId) {
      const options = allSettings.map((s, i) => `  ${i + 1}. ${s.id}${s.language ? ` (${s.language})` : ""}`).join("\n");
      return ok(
        `"${resolvedName}" has ${allSettings.length} summary configurations (likely multi-language).

Which summary setting would you like to work with?

${options}

Re-call build_interaction_filter with summary_setting_id set to your chosen ID.`
      );
    }
    if (chosenSummarySettingId) {
      const found = allSettings.find((s) => s.id === chosenSummarySettingId);
      if (!found) {
        return ok(
          `summary_setting_id "${chosenSummarySettingId}" is not linked to "${resolvedName}".

Linked settings:
${allSettings.map((s) => `  \u2022 ${s.id}${s.language ? ` (${s.language})` : ""}`).join("\n")}`
        );
      }
      chosenSetting = found;
    } else {
      chosenSetting = allSettings[0];
    }
    const settingDetail = await getSummarySetting(chosenSetting.id);
    const configName = (settingDetail.name ?? chosenSetting.id).replace(/[^a-zA-Z0-9_\-]/g, "_");
    const queues = await getAssistantQueues(resolvedId);
    const queueIds = queues.map((q) => q.id);
    const filter = {
      summaryConfigName: configName,
      summarySettingId: chosenSetting.id,
      ...chosenSetting.language ? { summaryLanguage: chosenSetting.language } : {},
      builtAt: (/* @__PURE__ */ new Date()).toISOString(),
      copilots: [
        {
          assistantId: resolvedId,
          assistantName: resolvedName,
          queues: queues.map((q) => ({ id: q.id, name: q.name }))
        }
      ],
      queueIds
    };
    saveInteractionFilter(configName, filter);
    ensureAllLifecycleDirs(configName);
    const v0 = saveInitialVersionSnapshot(configName, settingDetail);
    const v0Line = v0 ? `  \u251C\u2500\u2500 version-history/
  \u2502   \u2514\u2500\u2500 summary-configuration-0.json  \u2190 initial snapshot
` : `  \u251C\u2500\u2500 version-history/  (v0 already exists)
`;
    const queueText = queues.length ? queues.map((q) => `  \u2022 ${q.name} (${q.id})`).join("\n") : "  (none found \u2014 the copilot may not be deployed to any queues yet)";
    const langLine = chosenSetting.language ? `
Language:        ${chosenSetting.language}` : "";
    return ok(
      `\u2500\u2500\u2500 Workspace Created \u2500\u2500\u2500

Agent Copilot:   ${resolvedName}
Summary config:  ${settingDetail.name ?? chosenSetting.id}${langLine}
Summary setting: ${chosenSetting.id}
Working dir:     ${configName}

Queues (${queues.length}):
${queueText}

Directory structure:
  .summaryconfig-lifecycle/${configName}/
  \u251C\u2500\u2500 interaction-filter.json
  \u251C\u2500\u2500 requirements/
  \u2502   \u251C\u2500\u2500 artefacts/   \u2190 drop raw inputs here (emails, docs, screenshots)
  \u2502   \u2514\u2500\u2500 final/       \u2190 distilled requirements go here (e.g. requirements.md)
` + v0Line + `  \u251C\u2500\u2500 transcripts/
  \u2502   \u251C\u2500\u2500 static/
  \u2502   \u2514\u2500\u2500 dynamic/
  \u251C\u2500\u2500 test-cases/
  \u251C\u2500\u2500 test-sets/
  \u2514\u2500\u2500 eval-runs/

` + (queueIds.length ? `Next: call fetch_transcripts_bulk(summary_config_name="${configName}", date_from=..., date_to=...) to fetch transcripts.` : `No queues found. Once the copilot is deployed on queues, re-run build_interaction_filter to update the filter.`)
    );
  });
}
async function prepare_prompt_test(args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const testSetName = str(args, "test_set_name");
    const versionNumber = Number(args.version_number);
    const batchSize = Math.min(Number(args.batch_size ?? 5), 15);
    const clearCache = args.clear_cache === true;
    const snapshots = listVersionSnapshots(configName);
    const snapshot = snapshots.find((s) => s.version === versionNumber);
    if (!snapshot) {
      const available = snapshots.map((s) => s.version).join(", ") || "none";
      throw new Error(`Version ${versionNumber} not found for "${configName}". Available: ${available}`);
    }
    const testSet = getTestSet(configName, testSetName);
    if (!testSet) throw new Error(`Test set not found: ${testSetName}`);
    if (clearCache) clearPreviewCache(configName, testSetName, versionNumber);
    const cache = loadPreviewCache(configName, testSetName, versionNumber);
    const allIds = testSet.transcriptIds.filter((id) => getLifecycleTranscript(configName, id) != null);
    const pending = allIds.filter((id) => !(id in cache));
    if (pending.length === 0) {
      return ok(
        `\u2713 Preview cache complete \u2014 ${allIds.length}/${allIds.length} summaries ready.
Call start_eval_run(summary_config_name="${configName}", test_set_name="${testSetName}", mode="prompt_test", version_number=${versionNumber}) to start the eval run.`
      );
    }
    const setting = {
      name: testSetName,
      prompt: snapshot.setting.prompt,
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 50
    };
    const toProcess = pending.slice(0, batchSize);
    let generated = 0;
    let authFailed = false;
    await Promise.all(
      toProcess.map(async (tId) => {
        const stored = getLifecycleTranscript(configName, tId);
        const response = await generatePreviewSummary(stored.plainText, setting);
        if (response === null) {
          authFailed = true;
          return;
        }
        cache[tId] = extractSummaryText(response);
        generated++;
      })
    );
    savePreviewCache(configName, testSetName, versionNumber, cache);
    if (authFailed) {
      return ok("No user token available for preview generation. Call login first, then retry.");
    }
    const done = Object.keys(cache).length;
    const total = allIds.length;
    const remaining = total - done;
    const complete = remaining === 0;
    const lines = [
      `\u2500\u2500\u2500 Preview Cache Progress \u2500\u2500\u2500`,
      ``,
      `Config:      ${configName}`,
      `Test set:    ${testSetName}`,
      `Version:     ${versionNumber} (${snapshot.status ?? "candidate"})`,
      ``,
      `Generated:   ${generated} this call`,
      `Cached:      ${done}/${total}`,
      `Remaining:   ${remaining}`,
      `Complete:    ${complete ? "YES \u2713" : `NO \u2014 call prepare_prompt_test again (${Math.ceil(remaining / batchSize)} more call(s))`}`
    ];
    if (complete) {
      lines.push(
        ``,
        `All summaries ready. Next step:`,
        `  start_eval_run(summary_config_name="${configName}", test_set_name="${testSetName}", mode="prompt_test", version_number=${versionNumber})`
      );
    }
    return ok(lines.join("\n"));
  });
}
async function start_eval_run(args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const testSetName = str(args, "test_set_name");
    const mode = optStr(args, "mode") ?? "existing";
    const inlinePrompt = optStr(args, "prompt");
    const versionNumber = args.version_number != null ? Number(args.version_number) : void 0;
    const batchSize = Math.min(Number(args.batch_size ?? 5), 20);
    if (inlinePrompt && versionNumber !== void 0) {
      return ok("Provide either version_number or prompt, not both. Use version_number when testing a versioned candidate \u2014 it records full traceability.");
    }
    let prompt = inlinePrompt;
    let promptVersionNumber;
    let promptVersionStatus;
    if (versionNumber !== void 0) {
      const snapshots = listVersionSnapshots(configName);
      const snapshot = snapshots.find((s) => s.version === versionNumber);
      if (!snapshot) {
        const available = snapshots.map((s) => s.version).join(", ") || "none";
        throw new Error(`Version ${versionNumber} not found in version-history for "${configName}". Available: ${available}`);
      }
      prompt = snapshot.setting.prompt;
      promptVersionNumber = snapshot.version;
      promptVersionStatus = snapshot.status ?? "deployed";
    } else {
      const snapshots = listVersionSnapshots(configName);
      if (snapshots.length > 0) {
        const latest = snapshots[snapshots.length - 1];
        if (!prompt) prompt = latest.setting.prompt;
        promptVersionNumber = latest.version;
        promptVersionStatus = latest.status ?? "deployed";
      }
    }
    if (mode === "prompt_test" && !prompt) {
      return ok('mode "prompt_test" requires either a version_number (recommended) or a prompt argument.');
    }
    const testSet = getTestSet(configName, testSetName);
    if (!testSet) throw new Error(`Test set not found: ${testSetName}`);
    const testCases = testSet.testCaseNames.map((name) => {
      const tc = getTestCase(configName, name);
      if (!tc) throw new Error(`Test case not found: ${name}`);
      return tc;
    });
    const transcriptPayloads = [];
    const previewConcurrency = Math.min(Number(args.concurrency ?? 5), 10);
    const previewSetting = {
      name: testSetName,
      prompt,
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 50
    };
    if (mode === "existing") {
      for (const tId of testSet.transcriptIds) {
        const stored = getLifecycleTranscript(configName, tId);
        if (!stored || !stored.existingSummary) continue;
        transcriptPayloads.push({
          transcriptId: tId,
          transcriptLabel: stored.label,
          plainText: stored.plainText,
          summary: stored.existingSummary
        });
      }
    } else {
      const previewCache = promptVersionNumber !== void 0 ? loadPreviewCache(configName, testSetName, promptVersionNumber) : {};
      const queue = testSet.transcriptIds.map((tId) => ({ tId, stored: getLifecycleTranscript(configName, tId) })).filter((x) => x.stored != null);
      const uncached = queue.filter(({ tId }) => !(tId in previewCache));
      if (uncached.length > 0 && promptVersionNumber !== void 0) {
        const total = queue.length;
        const cached2 = total - uncached.length;
        return ok(
          `${cached2}/${total} preview summaries are cached for version ${promptVersionNumber}.
${uncached.length} remain. Call prepare_prompt_test first to build the full cache, then retry start_eval_run.

prepare_prompt_test(summary_config_name="${configName}", test_set_name="${testSetName}", version_number=${promptVersionNumber})`
        );
      }
      const inFlight = [];
      let authFailed = false;
      let idx = 0;
      while ((idx < uncached.length || inFlight.length > 0) && !authFailed) {
        while (inFlight.length < previewConcurrency && idx < uncached.length && !authFailed) {
          const { tId, stored } = uncached[idx++];
          const p = (async () => {
            const response = await generatePreviewSummary(stored.plainText, previewSetting);
            if (response === null) {
              authFailed = true;
              return;
            }
            transcriptPayloads.push({
              transcriptId: tId,
              transcriptLabel: stored.label,
              plainText: stored.plainText,
              summary: extractSummaryText(response)
            });
          })().then(() => {
            inFlight.splice(inFlight.indexOf(p), 1);
          });
          inFlight.push(p);
        }
        if (inFlight.length > 0) await Promise.race(inFlight);
      }
      await Promise.all(inFlight);
      if (authFailed) {
        return ok("No user token available for preview generation. Call login first, then retry.");
      }
      for (const { tId, stored } of queue) {
        if (tId in previewCache && !transcriptPayloads.find((p) => p.transcriptId === tId)) {
          transcriptPayloads.push({
            transcriptId: tId,
            transcriptLabel: stored.label,
            plainText: stored.plainText,
            summary: previewCache[tId]
          });
        }
      }
      if (promptVersionNumber !== void 0) {
        clearPreviewCache(configName, testSetName, promptVersionNumber);
      }
    }
    if (transcriptPayloads.length === 0) {
      return ok(
        mode === "existing" ? `No transcripts in "${testSetName}" have an existingSummary. Run fetch_existing_summaries_bulk first.` : `No transcripts found in "${testSetName}".`
      );
    }
    const pendingMeta = createPendingEvalRun(configName, testSetName, {
      summaryConfigName: configName,
      testSetName,
      useExistingSummaries: mode === "existing",
      transcriptIds: transcriptPayloads.map((t) => t.transcriptId),
      testCaseNames: testSet.testCaseNames,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      promptText: prompt,
      promptVersionNumber,
      promptVersionStatus
    });
    const batches = [];
    for (let i = 0; i < transcriptPayloads.length; i += batchSize) {
      batches.push({
        batchIndex: Math.floor(i / batchSize),
        transcripts: transcriptPayloads.slice(i, i + batchSize)
      });
    }
    const testCaseSummary = testCases.map((tc) => ({
      name: tc.name,
      description: tc.description,
      dimensions: tc.dimensions.map((d) => ({
        name: d.name,
        description: d.description,
        weight: d.weight,
        applicability_condition: d.applicabilityCondition ?? "always",
        pass_criteria: d.passCriteria,
        fail_criteria: d.failCriteria,
        pass_threshold: d.passThreshold ?? 0.8,
        requirement_ids: d.requirementIds ?? []
      }))
    }));
    const versionLabel = promptVersionNumber !== void 0 ? `v${promptVersionNumber}${promptVersionStatus ? ` (${promptVersionStatus})` : ""}` : "unversioned";
    return json({
      run_number: pendingMeta.runNumber,
      summary_config_name: configName,
      test_set_name: testSetName,
      mode,
      prompt_version: versionLabel,
      prompt_version_number: promptVersionNumber ?? null,
      prompt_version_status: promptVersionStatus ?? null,
      prompt_text: prompt ?? null,
      total_transcripts: transcriptPayloads.length,
      total_test_cases: testCases.length,
      total_batches: batches.length,
      batch_size: batchSize,
      test_cases: testCaseSummary,
      batches,
      instruction: 'Spawn one subagent per batch using a fast model (composer-2.5-fast). Each subagent receives its batch of transcripts and the test_cases array above. For each transcript in its batch, the subagent scores every dimension of every test case and calls submit_eval_scores for each (transcript \xD7 test_case) pair. APPLICABILITY CHECK \u2014 for each dimension, check its applicability_condition field first: (1) If applicability_condition is "always": score normally (0.0\u20131.0). (2) If applicability_condition is anything else: first determine whether this condition applies to the transcript. If YES it applies \u2192 score normally. If NO it does not apply \u2192 submit score: null with reasoning explaining why it is not applicable. Null scores are excluded from pass-rate calculations \u2014 only submit null when the condition genuinely does not apply. After all subagents complete, call finalize_eval_run(summary_config_name, test_set_name, run_number) to compute aggregate pass rates and mark the run complete.'
    });
  });
}
async function submit_eval_scores(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);
  const transcriptId = str(args, "transcript_id");
  const testCaseName = str(args, "test_case_name");
  const transcriptLabel = optStr(args, "transcript_label") ?? transcriptId;
  const summaryText = optStr(args, "summary_text") ?? "";
  const rawScores = Array.isArray(args.dimension_scores) ? args.dimension_scores : [];
  const pending = getPendingEvalRun(configName, testSetName, runNumber);
  if (!pending) {
    throw new Error(
      `Eval run ${runNumber} not found for "${testSetName}". Call start_eval_run first to create the run.`
    );
  }
  const testCase = getTestCase(configName, testCaseName);
  if (!testCase) throw new Error(`Test case not found: ${testCaseName}`);
  const thresholdMap = Object.fromEntries(
    testCase.dimensions.map((d) => [d.name, d.passThreshold ?? 0.8])
  );
  const dimensionScores = rawScores.map((s) => {
    const sc = s;
    const dimName = String(sc.dimension ?? "");
    if (sc.score === null || sc.score === void 0 && String(sc.na ?? "") === "true") {
      return {
        dimension: dimName,
        score: null,
        na: true,
        passed: true,
        // N/A is not a failure
        reasoning: String(sc.reasoning ?? "")
      };
    }
    const score = Math.max(0, Math.min(1, Number(sc.score ?? 0)));
    const threshold = thresholdMap[dimName] ?? 0.8;
    return {
      dimension: dimName,
      score,
      na: false,
      passed: score >= threshold,
      reasoning: String(sc.reasoning ?? "")
    };
  });
  const scoredDims = dimensionScores.filter((d) => !d.na);
  const overallScore = scoredDims.length > 0 ? scoredDims.reduce((sum, d) => sum + d.score, 0) / scoredDims.length : 0;
  const overallPassed = scoredDims.length === 0 || scoredDims.every((d) => d.passed);
  saveEvalScore(configName, testSetName, runNumber, {
    testCaseName,
    transcriptId,
    transcriptLabel,
    summary: summaryText,
    dimensionScores,
    overallPassed,
    overallScore
  });
  return json({
    saved: true,
    transcript_id: transcriptId,
    test_case_name: testCaseName,
    overall_score: overallScore.toFixed(3),
    overall_passed: overallPassed,
    dimensions_scored: dimensionScores.length
  });
}
async function finalize_eval_run(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);
  const pending = getPendingEvalRun(configName, testSetName, runNumber);
  if (!pending) {
    throw new Error(`Eval run ${runNumber} not found for "${testSetName}".`);
  }
  const scores = getEvalScores(configName, testSetName, runNumber);
  if (scores.length === 0) {
    return ok(`No scores submitted for run ${runNumber} yet. Ensure all subagents have completed before finalizing.`);
  }
  const merged = mergeEvalScoresToTestCaseFiles(configName, testSetName, runNumber, pending.testCaseNames);
  const overallPassRate = scores.filter((s) => s.overallPassed).length / scores.length;
  const testCasePassRates = {};
  for (const file of merged) {
    testCasePassRates[file.testCaseName] = file.passRate;
  }
  const finalizedMeta = getPendingEvalRun(configName, testSetName, runNumber);
  finalizePendingEvalRun(configName, testSetName, runNumber, overallPassRate, testCasePassRates);
  const finalMeta = getPendingEvalRun(configName, testSetName, runNumber);
  const html = generateEvalRunDashboardHtml(finalMeta, merged);
  const dashboardPath = saveEvalRunDashboard(configName, testSetName, runNumber, html);
  const allMetas = readAllFinalizedRunMetas(configName, testSetName);
  const improvementsHtml = generateImprovementsDashboardHtml(testSetName, configName, allMetas);
  saveImprovementsDashboard(configName, testSetName, improvementsHtml);
  const breakdown = merged.map((f) => `  \u2022 ${f.testCaseName}: avg ${f.averageScore.toFixed(2)} \xB7 ${(f.passRate * 100).toFixed(0)}% pass`).join("\n");
  const dimFailureLines = [];
  for (const file of merged) {
    const dimNames = [...new Set(file.results.flatMap((r) => r.dimensionScores.map((d) => d.dimension)))];
    for (const dimName of dimNames) {
      const dimScores = file.results.map((r) => r.dimensionScores.find((d) => d.dimension === dimName)).filter((d) => d != null && !d.na);
      if (dimScores.length === 0) continue;
      const failing = dimScores.filter((d) => !d.passed);
      if (failing.length === 0) continue;
      const dimPassPct = ((dimScores.length - failing.length) / dimScores.length * 100).toFixed(0);
      const sampleReasonings = failing.slice(0, 3).map((d) => `    \u2022 "${d.reasoning.length > 200 ? d.reasoning.slice(0, 200) + "\u2026" : d.reasoning}"`).join("\n");
      dimFailureLines.push(
        `  [${file.testCaseName}] "${dimName}" \u2014 ${dimPassPct}% pass (${failing.length}/${dimScores.length} evaluated)
  Sample failure reasoning:
${sampleReasonings}`
      );
    }
  }
  const failureAnalysis = dimFailureLines.length > 0 ? dimFailureLines.join("\n\n") : "  (no failing dimensions \u2014 all dimensions passed)";
  const versionLabel = pending.promptVersionNumber !== void 0 ? `Version ${pending.promptVersionNumber}${pending.promptVersionStatus ? ` (${pending.promptVersionStatus})` : ""}` : "unversioned (no version_number was supplied)";
  const promptSection = pending.promptText ? `

PROMPT UNDER TEST [${versionLabel}]:
${"\u2500".repeat(60)}
${pending.promptText}
${"\u2500".repeat(60)}` : `

PROMPT UNDER TEST [${versionLabel}]:
(Prompt text not recorded \u2014 re-run with version_number to capture it.)`;
  return ok(
    `\u2500\u2500\u2500 Eval Run ${runNumber} Finalized \u2500\u2500\u2500

Test set:        ${testSetName}
Config:          ${configName}
Mode:            ${pending.useExistingSummaries ? "existing summaries" : "prompt test"}
Version:         ${versionLabel}
Transcripts:     ${pending.transcriptIds.length}
Results saved:   ${scores.length}
Overall pass:    ${(overallPassRate * 100).toFixed(1)}%

By test case:
${breakdown}

Output: eval-runs/${testSetName}/${String(runNumber).padStart(4, "0")}/
` + merged.map((f) => `  ${f.testCaseName}.json  (${f.totalTranscripts} transcripts)`).join("\n") + `

Dashboard: ${dashboardPath}` + promptSection + `

FAILING DIMENSION ANALYSIS:
${failureAnalysis}

${"\u2550".repeat(60)}
NEXT STEP \u2014 IMPROVEMENT RECOMMENDATIONS
${"\u2550".repeat(60)}
Summaries for this run were generated by: ${SUMMARY_MODEL_NAME}

Using the prompt and failing dimension analysis above, write improvements.md for this run.

improvements.md must follow this structure:
  1. Run Summary \u2014 overall pass rate, test set, date, model, mode
  2. Test Case Results \u2014 table of test case / pass rate / avg score
  3. Failing Dimension Analysis \u2014 for each failing dimension:
       - What the dimension tests (from passCriteria)
       - Pattern in the failures (synthesized from the reasoning samples above)
       - Root cause: what is the prompt missing or doing wrong for ${SUMMARY_MODEL_NAME}?
  4. Prompt Improvement Suggestions \u2014 specific, actionable edits to the prompt:
       - Use concrete phrasing (e.g. "Add the sentence: You MUST always...")
       - Prefer explicit instructions over implicit expectations
       - Note any ${SUMMARY_MODEL_NAME}-specific considerations (e.g. tendency to be terse,
         follow instructions literally, omit context if not told to include it)
  5. Proposed Improved Prompt \u2014 the full revised prompt text as a fenced code block

When your improvements.md is ready, call:
  save_improvement_recommendations(
    summary_config_name="${configName}",
    test_set_name="${testSetName}",
    run_number=${runNumber},
    content="<your improvements.md content>"
  )`
  );
}
async function save_improvement_recommendations(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);
  const content = str(args, "content");
  if (!content.trim()) {
    throw new Error("content must not be empty.");
  }
  const runDir = `eval-runs/${testSetName}/${String(runNumber).padStart(4, "0")}`;
  const pending = getPendingEvalRun(configName, testSetName, runNumber);
  if (!pending) {
    throw new Error(`Eval run ${runNumber} not found for "${testSetName}". Run finalize_eval_run first.`);
  }
  if (!pending.finalizedAt) {
    throw new Error(`Eval run ${runNumber} has not been finalized yet. Call finalize_eval_run first.`);
  }
  const filePath = saveImprovementRecommendations(configName, testSetName, runNumber, content);
  return ok(
    `Improvement recommendations saved to ${filePath}
Run: ${runDir}
Open improvements.md in that folder to review the analysis.`
  );
}
async function generate_eval_run_dashboard(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);
  const result = readFinalizedEvalRun(configName, testSetName, runNumber);
  if (!result) {
    throw new Error(
      `Eval run ${runNumber} for "${testSetName}" not found or not yet finalized. Run finalize_eval_run first.`
    );
  }
  const html = generateEvalRunDashboardHtml(result.meta, result.testCaseFiles);
  const dashboardPath = saveEvalRunDashboard(configName, testSetName, runNumber, html);
  return ok(`Dashboard generated: ${dashboardPath}`);
}
async function generate_improvements_dashboard(args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const allMetas = readAllFinalizedRunMetas(configName, testSetName);
  if (allMetas.length === 0) {
    throw new Error(`No finalized runs found for test set "${testSetName}". Finalize at least one run first.`);
  }
  const html = generateImprovementsDashboardHtml(testSetName, configName, allMetas);
  const filePath = saveImprovementsDashboard(configName, testSetName, html);
  return ok(
    `Improvements dashboard generated: ${filePath}
Covers ${allMetas.length} run${allMetas.length !== 1 ? "s" : ""}: ` + allMetas.map((m) => `Run ${String(m.runNumber).padStart(4, "0")} (${Math.round((m.aggregatePassRate ?? 0) * 100)}%)`).join(" \u2192 ")
  );
}
async function get_pipeline_guide(_args) {
  return { content: [{ type: "text", text: FULL_PIPELINE_GUIDE }] };
}

// src/index.ts
var server = new Server(
  { name: "sdd-summary-mcp", version: "2.0.0" },
  { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS }
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS
}));
var toolHandlers = {
  // Auth
  connect,
  configure_credentials,
  login,
  complete_login,
  logout,
  smoke_test_auth,
  // Conversations
  search_conversations,
  // Transcripts (lifecycle-scoped)
  fetch_transcript,
  fetch_transcripts_bulk,
  fetch_existing_summaries_bulk,
  store_transcript,
  list_transcripts,
  // Summary config
  list_summary_settings,
  get_summary_setting,
  create_summary_setting,
  update_summary_setting,
  // Summary generation
  generate_preview_summary,
  get_existing_summaries,
  // Test cases
  generate_test_case,
  save_test_case,
  list_test_cases,
  // Test sets
  save_test_set,
  list_test_sets,
  // Evaluate
  evaluate_summary,
  // Eval runs (legacy — single-agent, generates new previews)
  run_test_suite,
  save_eval_run,
  list_eval_runs,
  // Eval runs (parallel / stateless — subagent-compatible)
  prepare_prompt_test,
  start_eval_run,
  submit_eval_scores,
  finalize_eval_run,
  // Version history
  save_version,
  list_versions,
  // Post-eval improvement recommendations
  save_improvement_recommendations,
  // Reporting
  generate_improvements_dashboard,
  generate_eval_run_dashboard,
  generate_dashboard,
  // Copilot
  list_assistants,
  get_copilot_config,
  update_copilot_config,
  build_interaction_filter,
  // Pipeline guide
  get_pipeline_guide
};
server.setRequestHandler(CallToolRequestSchema, async (request2) => {
  const { name, arguments: args = {} } = request2.params;
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true
    };
  }
  try {
    return await handler(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true
    };
  }
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SDD Summary MCP server running (stdio)");
}
main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
