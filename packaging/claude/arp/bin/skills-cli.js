#!/usr/bin/env node
import { createRequire } from "node:module";
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS((exports) => {
  var ALIAS = Symbol.for("yaml.alias");
  var DOC = Symbol.for("yaml.document");
  var MAP = Symbol.for("yaml.map");
  var PAIR = Symbol.for("yaml.pair");
  var SCALAR = Symbol.for("yaml.scalar");
  var SEQ = Symbol.for("yaml.seq");
  var NODE_TYPE = Symbol.for("yaml.node.type");
  var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
  var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
  var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
  var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
  var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
  var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  exports.ALIAS = ALIAS;
  exports.DOC = DOC;
  exports.MAP = MAP;
  exports.NODE_TYPE = NODE_TYPE;
  exports.PAIR = PAIR;
  exports.SCALAR = SCALAR;
  exports.SEQ = SEQ;
  exports.hasAnchor = hasAnchor;
  exports.isAlias = isAlias;
  exports.isCollection = isCollection;
  exports.isDocument = isDocument;
  exports.isMap = isMap;
  exports.isNode = isNode;
  exports.isPair = isPair;
  exports.isScalar = isScalar;
  exports.isSeq = isSeq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/visit.js
var require_visit = __commonJS((exports) => {
  var identity = require_identity();
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove node");
  function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path2) {
    const ctrl = callVisitor(key, node, visitor, path2);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path2, ctrl);
      return visit_(key, ctrl, visitor, path2);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path2 = Object.freeze(path2.concat(node));
        for (let i2 = 0;i2 < node.items.length; ++i2) {
          const ci = visit_(i2, node.items[i2], visitor, path2);
          if (typeof ci === "number")
            i2 = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i2, 1);
            i2 -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path2 = Object.freeze(path2.concat(node));
        const ck = visit_("key", node.key, visitor, path2);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path2);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path2) {
    const ctrl = await callVisitor(key, node, visitor, path2);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path2, ctrl);
      return visitAsync_(key, ctrl, visitor, path2);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path2 = Object.freeze(path2.concat(node));
        for (let i2 = 0;i2 < node.items.length; ++i2) {
          const ci = await visitAsync_(i2, node.items[i2], visitor, path2);
          if (typeof ci === "number")
            i2 = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i2, 1);
            i2 -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path2 = Object.freeze(path2.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path2);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path2);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
      return Object.assign({
        Alias: visitor.Node,
        Map: visitor.Node,
        Scalar: visitor.Node,
        Seq: visitor.Node
      }, visitor.Value && {
        Map: visitor.Value,
        Scalar: visitor.Value,
        Seq: visitor.Value
      }, visitor.Collection && {
        Map: visitor.Collection,
        Seq: visitor.Collection
      }, visitor);
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path2) {
    if (typeof visitor === "function")
      return visitor(key, node, path2);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path2);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path2);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path2);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path2);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path2);
    return;
  }
  function replaceNode(key, path2, node) {
    const parent = path2[path2.length - 1];
    if (identity.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity.isPair(parent)) {
      if (key === "key")
        parent.key = node;
      else
        parent.value = node;
    } else if (identity.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity.isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  exports.visit = visit;
  exports.visitAsync = visitAsync;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  };
  var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);

  class Directives {
    constructor(yaml, tags) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
      const copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = true;
          break;
        case "1.2":
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: "1.2"
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    add(line, onError2) {
      if (this.atNextDocument) {
        this.yaml = { explicit: Directives.defaultYaml.explicit, version: "1.1" };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2) {
            onError2(0, "%TAG directive should contain exactly two parts");
            if (parts.length < 2)
              return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case "%YAML": {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError2(0, "%YAML directive should contain exactly one part");
            return false;
          }
          const [version] = parts;
          if (version === "1.1" || version === "1.2") {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError2(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError2(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    tagName(source, onError2) {
      if (source === "!")
        return "!";
      if (source[0] !== "!") {
        onError2(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === "<") {
        const verbatim = source.slice(2, -1);
        if (verbatim === "!" || verbatim === "!!") {
          onError2(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== ">")
          onError2("Verbatim tags must end with a >");
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix)
        onError2(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError2(String(error));
          return null;
        }
      }
      if (handle === "!")
        return source;
      onError2(`Could not resolve tag: ${source}`);
      return null;
    }
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
        const tags = {};
        visit.visit(doc.contents, (_key, node) => {
          if (identity.isNode(node) && node.tag)
            tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === "!!" && prefix === "tag:yaml.org,2002:")
          continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join(`
`);
    }
  }
  Directives.defaultYaml = { explicit: false, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  exports.Directives = Directives;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors = new Set;
    visit.visit(root, {
      Value(_key, node) {
        if (node.anchor)
          anchors.add(node.anchor);
      }
    });
    return anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i2 = 1;; ++i2) {
      const name = `${prefix}${i2}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map;
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error("Failed to resolve repeated object (this should not happen)");
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects
    };
  }
  exports.anchorIsValid = anchorIsValid;
  exports.anchorNames = anchorNames;
  exports.createNodeAnchors = createNodeAnchors;
  exports.findNewAnchor = findNewAnchor;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS((exports) => {
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i2 = 0, len = val.length;i2 < len; ++i2) {
          const v0 = val[i2];
          const v1 = applyReviver(reviver, val, String(i2), v0);
          if (v1 === undefined)
            delete val[i2];
          else if (v1 !== v0)
            val[i2] = v1;
        }
      } else if (val instanceof Map) {
        for (const k2 of Array.from(val.keys())) {
          const v0 = val.get(k2);
          const v1 = applyReviver(reviver, val, k2, v0);
          if (v1 === undefined)
            val.delete(k2);
          else if (v1 !== v0)
            val.set(k2, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver(reviver, val, v0, v0);
          if (v1 === undefined)
            val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k2, v0] of Object.entries(val)) {
          const v1 = applyReviver(reviver, val, k2, v0);
          if (v1 === undefined)
            delete val[k2];
          else if (v1 !== v0)
            val[k2] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  exports.applyReviver = applyReviver;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS((exports) => {
  var identity = require_identity();
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i2) => toJS(v, String(i2), ctx));
    if (value && typeof value.toJSON === "function") {
      if (!ctx || !identity.hasAnchor(value))
        return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: undefined };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res2) => {
        data.res = res2;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate)
        ctx.onCreate(res);
      return res;
    }
    if (typeof value === "bigint" && !ctx?.keep)
      return Number(value);
    return value;
  }
  exports.toJS = toJS;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS((exports) => {
  var applyReviver = require_applyReviver();
  var identity = require_identity();
  var toJS = require_toJS();

  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    clone() {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity.isDocument(doc))
        throw new TypeError("A document argument is required");
      const ctx = {
        anchors: new Map,
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this, "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
  }
  exports.NodeBase = NodeBase;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS((exports) => {
  var anchors = require_anchors();
  var visit = require_visit();
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();

  class Alias extends Node.NodeBase {
    constructor(source) {
      super(identity.ALIAS);
      this.source = source;
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    resolve(doc, ctx) {
      if (ctx?.maxAliasCount === 0)
        throw new ReferenceError("Alias resolution is disabled");
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit.visit(doc, {
          Node: (_key, node) => {
            if (identity.isAlias(node) || identity.hasAnchor(node))
              nodes.push(node);
          }
        });
        if (ctx)
          ctx.aliasResolveCache = nodes;
      }
      let found = undefined;
      for (const node of nodes) {
        if (node === this)
          break;
        if (node.anchor === this.source)
          found = node;
      }
      if (found && ctx) {
        const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
        let data = anchors2.get(found);
        if (!data) {
          toJS.toJS(found, null, ctx);
          data = anchors2.get(found);
        }
        if (data?.res === undefined) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc2, found, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      const source = this.resolve(ctx.doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      return ctx.anchors.get(source).res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  }
  function getAliasCount(doc, node, anchors2) {
    if (identity.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors2 && source && anchors2.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c4 = getAliasCount(doc, item, anchors2);
        if (c4 > count)
          count = c4;
      }
      return count;
    } else if (identity.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors2);
      const vc = getAliasCount(doc, node.value, anchors2);
      return Math.max(kc, vc);
    }
    return 1;
  }
  exports.Alias = Alias;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();
  var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";

  class Scalar extends Node.NodeBase {
    constructor(value) {
      super(identity.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  }
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  exports.Scalar = Scalar;
  exports.isScalarValue = isScalarValue;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      const match = tags.filter((t2) => t2.tag === tagName);
      const tagObj = match.find((t2) => !t2.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t2) => t2.identify?.(value) && !t2.format);
  }
  function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
      value = value.contents;
    if (identity.isNode(value))
      return value;
    if (identity.isPair(value)) {
      const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
      map.items.push(value);
      return map;
    }
    if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
      value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === "object") {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith("!!"))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === "function") {
        value = value.toJSON();
      }
      if (!value || typeof value !== "object") {
        const node2 = new Scalar.Scalar(value);
        if (ref)
          ref.node = node2;
        return node2;
      }
      tagObj = value instanceof Map ? schema[identity.MAP] : (Symbol.iterator in Object(value)) ? schema[identity.SEQ] : schema[identity.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
    if (tagName)
      node.tag = tagName;
    else if (!tagObj.default)
      node.tag = tagObj.tag;
    if (ref)
      ref.node = node;
    return node;
  }
  exports.createNode = createNode;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS((exports) => {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path2, value) {
    let v = value;
    for (let i2 = path2.length - 1;i2 >= 0; --i2) {
      const k2 = path2[i2];
      if (typeof k2 === "number" && Number.isInteger(k2) && k2 >= 0) {
        const a2 = [];
        a2[k2] = v;
        v = a2;
      } else {
        v = new Map([[k2, v]]);
      }
    }
    return createNode.createNode(v, undefined, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema,
      sourceObjects: new Map
    });
  }
  var isEmptyPath = (path2) => path2 == null || typeof path2 === "object" && !!path2[Symbol.iterator]().next().done;

  class Collection extends Node.NodeBase {
    constructor(type, schema) {
      super(type);
      Object.defineProperty(this, "schema", {
        value: schema,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    clone(schema) {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema)
        copy.schema = schema;
      copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    addIn(path2, value) {
      if (isEmptyPath(path2))
        this.add(value);
      else {
        const [key, ...rest] = path2;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path2) {
      const [key, ...rest] = path2;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path2, keepScalar) {
      const [key, ...rest] = path2;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity.isScalar(node) ? node.value : node;
      else
        return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity.isPair(node))
          return false;
        const n2 = node.value;
        return n2 == null || allowScalar && identity.isScalar(n2) && n2.value == null && !n2.commentBefore && !n2.comment && !n2.tag;
      });
    }
    hasIn(path2) {
      const [key, ...rest] = path2;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path2, value) {
      const [key, ...rest] = path2;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.setIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  }
  exports.Collection = Collection;
  exports.collectionFromPath = collectionFromPath;
  exports.isEmptyPath = isEmptyPath;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS((exports) => {
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
      return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  exports.indentComment = indentComment;
  exports.lineComment = lineComment;
  exports.stringifyComment = stringifyComment;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS((exports) => {
  var FOLD_FLOW = "flow";
  var FOLD_BLOCK = "block";
  var FOLD_QUOTED = "quoted";
  function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text;
    if (lineWidth < minContentWidth)
      minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
      return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === "number") {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else
        end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i2 = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i2 = consumeMoreIndentedLines(text, i2, indent.length);
      if (i2 !== -1)
        end = i2 + endStep;
    }
    for (let ch;ch = text[i2 += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        escStart = i2;
        switch (text[i2 + 1]) {
          case "x":
            i2 += 3;
            break;
          case "u":
            i2 += 5;
            break;
          case "U":
            i2 += 9;
            break;
          default:
            i2 += 1;
        }
        escEnd = i2;
      }
      if (ch === `
`) {
        if (mode === FOLD_BLOCK)
          i2 = consumeMoreIndentedLines(text, i2, indent.length);
        end = i2 + indent.length + endStep;
        split = undefined;
      } else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "\t") {
          const next = text[i2 + 1];
          if (next && next !== " " && next !== `
` && next !== "\t")
            split = i2;
        }
        if (i2 >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = undefined;
          } else if (mode === FOLD_QUOTED) {
            while (prev === " " || prev === "\t") {
              prev = ch;
              ch = text[i2 += 1];
              overflow = true;
            }
            const j2 = i2 > escEnd + 1 ? i2 - 2 : escStart - 1;
            if (escapedFolds[j2])
              return text;
            folds.push(j2);
            escapedFolds[j2] = true;
            end = j2 + endStep;
            split = undefined;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow)
      onOverflow();
    if (folds.length === 0)
      return text;
    if (onFold)
      onFold();
    let res = text.slice(0, folds[0]);
    for (let i3 = 0;i3 < folds.length; ++i3) {
      const fold = folds[i3];
      const end2 = folds[i3 + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end2)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end2)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i2, indent) {
    let end = i2;
    let start = i2 + 1;
    let ch = text[start];
    while (ch === " " || ch === "\t") {
      if (i2 < start + indent) {
        ch = text[++i2];
      } else {
        do {
          ch = text[++i2];
        } while (ch && ch !== `
`);
        end = i2;
        start = i2 + 1;
        ch = text[start];
      }
    }
    return end;
  }
  exports.FOLD_BLOCK = FOLD_BLOCK;
  exports.FOLD_FLOW = FOLD_FLOW;
  exports.FOLD_QUOTED = FOLD_QUOTED;
  exports.foldFlowLines = foldFlowLines;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var foldFlowLines = require_foldFlowLines();
  var getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  });
  var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
      return false;
    for (let i2 = 0, start = 0;i2 < strLen; ++i2) {
      if (str[i2] === `
`) {
        if (i2 - start > limit)
          return true;
        start = i2 + 1;
        if (strLen - start <= limit)
          return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    let str = "";
    let start = 0;
    for (let i2 = 0, ch = json[i2];ch; ch = json[++i2]) {
      if (ch === " " && json[i2 + 1] === "\\" && json[i2 + 2] === "n") {
        str += json.slice(start, i2) + "\\ ";
        i2 += 1;
        start = i2;
        ch = "\\";
      }
      if (ch === "\\")
        switch (json[i2 + 1]) {
          case "u":
            {
              str += json.slice(start, i2);
              const code = json.substr(i2 + 2, 4);
              switch (code) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  if (code.substr(0, 2) === "00")
                    str += "\\x" + code.substr(2);
                  else
                    str += json.substr(i2, 6);
              }
              i2 += 5;
              start = i2 + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i2 + 2] === '"' || json.length < minMultiLineLength) {
              i2 += 1;
            } else {
              str += json.slice(start, i2) + `

`;
              while (json[i2 + 2] === "\\" && json[i2 + 3] === "n" && json[i2 + 4] !== '"') {
                str += `
`;
                i2 += 2;
              }
              str += indent;
              if (json[i2 + 2] === " ")
                str += "\\";
              i2 += 1;
              start = i2 + 1;
            }
            break;
          default:
            i2 += 1;
        }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
      qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle)
        qs = singleQuotedString;
      else if (hasSingle && !hasDouble)
        qs = doubleQuotedString;
      else
        qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
    const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp;
    let endStart;
    for (endStart = value.length;endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== `
` && ch !== "\t" && ch !== " ")
        break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf(`
`);
    if (endNlPos === -1) {
      chomp = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp = "";
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === `
`)
        end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0;startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === " ")
        startWithSpace = true;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? "2" : "1";
    let header = (startWithSpace ? indentSize : "") + chomp;
    if (comment) {
      header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
      if (onComment)
        onComment();
    }
    if (!literal) {
      const foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value)) {
      return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes(`
`)) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === "") {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
      const { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar.Scalar.BLOCK_FOLDED:
        case Scalar.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t2 = implicitKey && defaultKeyType || defaultStringType;
      res = _stringify(t2);
      if (res === null)
        throw new Error(`Unsupported default string type ${t2}`);
    }
    return res;
  }
  exports.stringifyString = stringifyString;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS((exports) => {
  var anchors = require_anchors();
  var identity = require_identity();
  var stringifyComment = require_stringifyComment();
  var stringifyString = require_stringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign({
      blockQuote: true,
      commentString: stringifyComment.stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: false,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: true,
      indentSeq: true,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: false,
      singleQuote: null,
      trailingComma: false,
      trueStr: "true",
      verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = false;
        break;
      case "flow":
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: new Set,
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      const match = tags.filter((t2) => t2.tag === item.tag);
      if (match.length > 0)
        return match.find((t2) => t2.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t2) => t2.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t2) => t2.test);
        if (testMatch.length > 0)
          match = testMatch;
      }
      tagObj = match.find((t2) => t2.format === item.format) ?? match.find((t2) => !t2.format);
    } else {
      obj = item;
      tagObj = tags.find((t2) => t2.nodeClass && obj instanceof t2.nodeClass);
    }
    if (!tagObj) {
      const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
      return "";
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
      props.push(doc.directives.tagString(tag));
    return props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(`Cannot stringify circular structure without alias nodes`);
      } else {
        if (ctx.resolvedAliases)
          ctx.resolvedAliases.add(item);
        else
          ctx.resolvedAliases = new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = undefined;
    const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o2) => tagObj = o2 });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    if (!props)
      return str;
    return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
  }
  exports.createStringifyContext = createStringifyContext;
  exports.stringify = stringify;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = identity.isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error("With simple keys, key nodes cannot have comments");
      }
      if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
        const msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment)
          onComment();
        return str === "" ? "?" : explicitKey ? `? ${str}` : str;
      }
    } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    if (keyCommentDone)
      keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === "object")
        value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
    let ws = " ";
    if (keyComment || vsb || vcb) {
      ws = vsb ? `
` : "";
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === "" && !ctx.inFlow) {
        if (ws === `
` && valueComment)
          ws = `

`;
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf(`
`);
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
            sp0 = valueStr.indexOf(" ", sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0)
            hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === "" || valueStr[0] === `
`) {
      ws = "";
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment)
        onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  exports.stringifyPair = stringifyPair;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/log.js
var require_log = __commonJS((exports) => {
  var node_process = __require("process");
  function debug(logLevel, ...messages) {
    if (logLevel === "debug")
      console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === "debug" || logLevel === "warn") {
      if (typeof node_process.emitWarning === "function")
        node_process.emitWarning(warning);
      else
        console.warn(warning);
    }
  }
  exports.debug = debug;
  exports.warn = warn;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var MERGE_KEY = "<<";
  var merge = {
    identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  };
  var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (identity.isSeq(source))
      for (const it of source.items)
        mergeValue(ctx, map, it);
    else if (Array.isArray(source))
      for (const it of source)
        mergeValue(ctx, map, it);
    else
      mergeValue(ctx, map, source);
  }
  function mergeValue(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (!identity.isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value2] of srcMap) {
      if (map instanceof Map) {
        if (!map.has(key))
          map.set(key, value2);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value: value2,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    return map;
  }
  function resolveAliasValue(ctx, value) {
    return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
  }
  exports.addMergeToJSMap = addMergeToJSMap;
  exports.isMergeKey = isMergeKey;
  exports.merge = merge;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS((exports) => {
  var log2 = require_log();
  var merge = require_merge();
  var stringify = require_stringify();
  var identity = require_identity();
  var toJS = require_toJS();
  function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map, value);
    else if (merge.isMergeKey(ctx, key))
      merge.addMergeToJSMap(ctx, map, value);
    else {
      const jsKey = toJS.toJS(key, "", ctx);
      if (map instanceof Map) {
        map.set(jsKey, toJS.toJS(value, jsKey, ctx));
      } else if (map instanceof Set) {
        map.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS.toJS(value, stringKey, ctx);
        if (stringKey in map)
          Object.defineProperty(map, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true
          });
        else
          map[stringKey] = jsValue;
      }
    }
    return map;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey !== "object")
      return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
      const strCtx = stringify.createStringifyContext(ctx.doc, {});
      strCtx.anchors = new Set;
      for (const node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40)
          jsonStr = jsonStr.substring(0, 36) + '..."';
        log2.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  exports.addPairToJSMap = addPairToJSMap;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyPair = require_stringifyPair();
  var addPairToJSMap = require_addPairToJSMap();
  var identity = require_identity();
  function createPair(key, value, ctx) {
    const k2 = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k2, v);
  }

  class Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
      this.key = key;
      this.value = value;
    }
    clone(schema) {
      let { key, value } = this;
      if (identity.isNode(key))
        key = key.clone(schema);
      if (identity.isNode(value))
        value = value.clone(schema);
      return new Pair(key, value);
    }
    toJSON(_2, ctx) {
      const pair = ctx?.mapAsMap ? new Map : {};
      return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }
  exports.Pair = Pair;
  exports.createPair = createPair;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify2(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i2 = 0;i2 < items.length; ++i2) {
      const item = items[i2];
      let comment2 = null;
      if (identity.isNode(item)) {
        if (!chompKeep && item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment)
          comment2 = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
      if (comment2)
        str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
      if (chompKeep && comment2)
        chompKeep = false;
      lines.push(blockItemPrefix + str2);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i2 = 1;i2 < lines.length; ++i2) {
        const line = lines[i2];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    if (comment) {
      str += `
` + stringifyComment.indentComment(commentString(comment), indent);
      if (onComment)
        onComment();
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i2 = 0;i2 < items.length; ++i2) {
      const item = items[i2];
      let comment = null;
      if (identity.isNode(item)) {
        if (item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment)
            reqNewline = true;
        }
        const iv = identity.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment)
            comment = iv.comment;
          if (iv.commentBefore)
            reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment)
        reqNewline = true;
      let str = stringify.stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`));
      if (i2 < items.length - 1) {
        str += ",";
      } else if (ctx.options.trailingComma) {
        if (ctx.options.lineWidth > 0) {
          reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
        }
        if (reqNewline) {
          str += ",";
        }
      }
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line ? `
${indentStep}${indent}${line}` : `
`;
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
      comment = comment.replace(/^\n+/, "");
    if (comment) {
      const ic = stringifyComment.indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }
  exports.stringifyCollection = stringifyCollection;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS((exports) => {
  var stringifyCollection = require_stringifyCollection();
  var addPairToJSMap = require_addPairToJSMap();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  function findPair(items, key) {
    const k2 = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity.isPair(it)) {
        if (it.key === key || it.key === k2)
          return it;
        if (identity.isScalar(it.key) && it.key.value === k2)
          return it;
      }
    }
    return;
  }

  class YAMLMap extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema) {
      super(identity.MAP, schema);
      this.items = [];
    }
    static from(schema, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map = new this(schema);
      const add = (key, value) => {
        if (typeof replacer === "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        if (value !== undefined || keepUndefined)
          map.items.push(Pair.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          add(key, value);
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          add(key, obj[key]);
      }
      if (typeof schema.sortMapEntries === "function") {
        map.items.sort(schema.sortMapEntries);
      }
      return map;
    }
    add(pair, overwrite) {
      let _pair;
      if (identity.isPair(pair))
        _pair = pair;
      else if (!pair || typeof pair !== "object" || !("key" in pair)) {
        _pair = new Pair.Pair(pair, pair?.value);
      } else
        _pair = new Pair.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
          prev.value.value = _pair.value;
        else
          prev.value = _pair.value;
      } else if (sortEntries) {
        const i2 = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i2 === -1)
          this.items.push(_pair);
        else
          this.items.splice(i2, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it)
        return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair.Pair(key, value), true);
    }
    toJSON(_2, ctx, Type) {
      const map = Type ? new Type : ctx?.mapAsMap ? new Map : {};
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const item of this.items)
        addPairToJSMap.addPairToJSMap(ctx, map, item);
      return map;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity.isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  }
  exports.YAMLMap = YAMLMap;
  exports.findPair = findPair;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLMap = require_YAMLMap();
  var map = {
    collection: "map",
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map2, onError2) {
      if (!identity.isMap(map2))
        onError2("Expected a mapping for this tag");
      return map2;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
  };
  exports.map = map;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyCollection = require_stringifyCollection();
  var Collection = require_Collection();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var toJS = require_toJS();

  class YAMLSeq extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema) {
      super(identity.SEQ, schema);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return;
      const it = this.items[idx];
      return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === "number" && idx < this.items.length;
    }
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity.isScalar(prev) && Scalar.isScalarValue(value))
        prev.value = value;
      else
        this.items[idx] = value;
    }
    toJSON(_2, ctx) {
      const seq = [];
      if (ctx?.onCreate)
        ctx.onCreate(seq);
      let i2 = 0;
      for (const item of this.items)
        seq.push(toJS.toJS(item, String(i2++), ctx));
      return seq;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      });
    }
    static from(schema, obj, ctx) {
      const { replacer } = ctx;
      const seq = new this(schema);
      if (obj && Symbol.iterator in Object(obj)) {
        let i2 = 0;
        for (let it of obj) {
          if (typeof replacer === "function") {
            const key = obj instanceof Set ? it : String(i2++);
            it = replacer.call(obj, key, it);
          }
          seq.items.push(createNode.createNode(it, undefined, ctx));
        }
      }
      return seq;
    }
  }
  function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === "string")
      idx = Number(idx);
    return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }
  exports.YAMLSeq = YAMLSeq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLSeq = require_YAMLSeq();
  var seq = {
    collection: "seq",
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq2, onError2) {
      if (!identity.isSeq(seq2))
        onError2("Expected a sequence for this tag");
      return seq2;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
  };
  exports.seq = seq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS((exports) => {
  var stringifyString = require_stringifyString();
  var string = {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
  };
  exports.string = string;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };
  exports.nullTag = nullTag;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var boolTag = {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };
  exports.boolTag = boolTag;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS((exports) => {
  function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === "bigint")
      return String(value);
    const num = typeof value === "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n2 = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n2) && !n2.includes("e")) {
      let i2 = n2.indexOf(".");
      if (i2 < 0) {
        i2 = n2.length;
        n2 += ".";
      }
      let d = minFractionDigits - (n2.length - i2 - 1);
      while (d-- > 0)
        n2 += "0";
    }
    return n2;
  }
  exports.stringifyNumber = stringifyNumber;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str));
      const dot = str.indexOf(".");
      if (dot !== -1 && str[str.length - 1] === "0")
        node.minFractionDigits = str.length - dot - 1;
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
      return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
  ];
  exports.schema = schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var map = require_map();
  var seq = require_seq();
  function intIdentify(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value);
  var jsonScalars = [
    {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ];
  var jsonError = {
    default: true,
    tag: "",
    test: /^/,
    resolve(str, onError2) {
      onError2(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    }
  };
  var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
  exports.schema = schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS((exports) => {
  var node_buffer = __require("buffer");
  var Scalar = require_Scalar();
  var stringifyString = require_stringifyString();
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    default: false,
    tag: "tag:yaml.org,2002:binary",
    resolve(src, onError2) {
      if (typeof node_buffer.Buffer === "function") {
        return node_buffer.Buffer.from(src, "base64");
      } else if (typeof atob === "function") {
        const str = atob(src.replace(/[\n\r]/g, ""));
        const buffer = new Uint8Array(str.length);
        for (let i2 = 0;i2 < str.length; ++i2)
          buffer[i2] = str.charCodeAt(i2);
        return buffer;
      } else {
        onError2("This environment does not support reading binary tags; either Buffer or atob is required");
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === "function") {
        str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
      } else if (typeof btoa === "function") {
        let s = "";
        for (let i2 = 0;i2 < buf.length; ++i2)
          s += String.fromCharCode(buf[i2]);
        str = btoa(s);
      } else {
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      }
      type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
        const n2 = Math.ceil(str.length / lineWidth);
        const lines = new Array(n2);
        for (let i2 = 0, o2 = 0;i2 < n2; ++i2, o2 += lineWidth) {
          lines[i2] = str.substr(o2, lineWidth);
        }
        str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };
  exports.binary = binary;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  var YAMLSeq = require_YAMLSeq();
  function resolvePairs(seq, onError2) {
    if (identity.isSeq(seq)) {
      for (let i2 = 0;i2 < seq.items.length; ++i2) {
        let item = seq.items[i2];
        if (identity.isPair(item))
          continue;
        else if (identity.isMap(item)) {
          if (item.items.length > 1)
            onError2("Each pair must have its own sequence indicator");
          const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
          }
          item = pair;
        }
        seq.items[i2] = identity.isPair(item) ? item : new Pair.Pair(item);
      }
    } else
      onError2("Expected a sequence for this tag");
    return seq;
  }
  function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs2 = new YAMLSeq.YAMLSeq(schema);
    pairs2.tag = "tag:yaml.org,2002:pairs";
    let i2 = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === "function")
          it = replacer.call(iterable, String(i2++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
          }
        } else {
          key = it;
        }
        pairs2.items.push(Pair.createPair(key, value, ctx));
      }
    return pairs2;
  }
  var pairs = {
    collection: "seq",
    default: false,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };
  exports.createPairs = createPairs;
  exports.pairs = pairs;
  exports.resolvePairs = resolvePairs;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS((exports) => {
  var identity = require_identity();
  var toJS = require_toJS();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var pairs = require_pairs();

  class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    toJSON(_2, ctx) {
      if (!ctx)
        return super.toJSON(_2);
      const map = new Map;
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const pair of this.items) {
        let key, value;
        if (identity.isPair(pair)) {
          key = toJS.toJS(pair.key, "", ctx);
          value = toJS.toJS(pair.value, key, ctx);
        } else {
          key = toJS.toJS(pair, "", ctx);
        }
        if (map.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map.set(key, value);
      }
      return map;
    }
    static from(schema, iterable, ctx) {
      const pairs$1 = pairs.createPairs(schema, iterable, ctx);
      const omap2 = new this;
      omap2.items = pairs$1.items;
      return omap2;
    }
  }
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq, onError2) {
      const pairs$1 = pairs.resolvePairs(seq, onError2);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError2(`Ordered maps must not include duplicate keys: ${key.value}`);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap, pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
  };
  exports.YAMLOMap = YAMLOMap;
  exports.omap = omap;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
      return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
  };
  var falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
  };
  exports.falseTag = falseTag;
  exports.trueTag = trueTag;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
      const dot = str.indexOf(".");
      if (dot !== -1) {
        const f = str.substring(dot + 1).replace(/_/g, "");
        if (f[f.length - 1] === "0")
          node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === "-" || sign === "+")
      offset += 1;
    str = str.substring(offset).replace(/_/g, "");
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n3 = BigInt(str);
      return sign === "-" ? BigInt(-1) * n3 : n3;
    }
    const n2 = parseInt(str, radix);
    return sign === "-" ? -1 * n2 : n2;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, "0b")
  };
  var intOct = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, "0")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intBin = intBin;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();

  class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
      super(schema);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity.isPair(key))
        pair = key;
      else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
        pair = new Pair.Pair(key.key, null);
      else
        pair = new Pair.Pair(key, null);
      const prev = YAMLMap.findPair(this.items, pair.key);
      if (!prev)
        this.items.push(pair);
    }
    get(key, keepPair) {
      const pair = YAMLMap.findPair(this.items, key);
      return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value !== "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      const prev = YAMLMap.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair.Pair(key));
      }
    }
    toJSON(_2, ctx) {
      return super.toJSON(_2, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
      else
        throw new Error("Set items must all have null values");
    }
    static from(schema, iterable, ctx) {
      const { replacer } = ctx;
      const set2 = new this(schema);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === "function")
            value = replacer.call(iterable, value, value);
          set2.items.push(Pair.createPair(value, null, ctx));
        }
      return set2;
    }
  }
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError2) {
      if (identity.isMap(map)) {
        if (map.hasAllNullValues(true))
          return Object.assign(new YAMLSet, map);
        else
          onError2("Set items must all have null values");
      } else
        onError2("Expected a mapping for this tag");
      return map;
    }
  };
  exports.YAMLSet = YAMLSet;
  exports.set = set;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
    const num = (n2) => asBigInt ? BigInt(n2) : Number(n2);
    const res = parts.replace(/_/g, "").split(":").reduce((res2, p2) => res2 * num(60) + num(p2), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n2) => n2;
    if (typeof value === "bigint")
      num = (n2) => BigInt(n2);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber.stringifyNumber(node);
    let sign = "";
    if (value < 0) {
      sign = "-";
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return sign + parts.map((n2) => String(n2).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value === "bigint" || Number.isInteger(value),
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  };
  var floatTime = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
  };
  var timestamp = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})" + "(?:" + "(?:t|T|[ \\t]+)" + "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)" + "(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?" + ")?$"),
    resolve(str) {
      const match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
      let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
      const tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30)
          d *= 60;
        date -= 60000 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };
  exports.floatTime = floatTime;
  exports.intTime = intTime;
  exports.timestamp = timestamp;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var binary = require_binary();
  var bool = require_bool2();
  var float = require_float2();
  var int = require_int2();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var set = require_set();
  var timestamp = require_timestamp();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
  ];
  exports.schema = schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = require_schema();
  var schema$1 = require_schema2();
  var binary = require_binary();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var schema$2 = require_schema3();
  var set = require_set();
  var timestamp = require_timestamp();
  var schemas = new Map([
    ["core", schema.schema],
    ["failsafe", [map.map, seq.seq, string.string]],
    ["json", schema$1.schema],
    ["yaml11", schema$2.schema],
    ["yaml-1.1", schema$2.schema]
  ]);
  var tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
  };
  var coreKnownTags = {
    "tag:yaml.org,2002:binary": binary.binary,
    "tag:yaml.org,2002:merge": merge.merge,
    "tag:yaml.org,2002:omap": omap.omap,
    "tag:yaml.org,2002:pairs": pairs.pairs,
    "tag:yaml.org,2002:set": set.set,
    "tag:yaml.org,2002:timestamp": timestamp.timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
      if (Array.isArray(customTags))
        tags = [];
      else {
        const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags)
        tags = tags.concat(tag);
    } else if (typeof customTags === "function") {
      tags = customTags(tags.slice());
    }
    if (addMergeTag)
      tags = tags.concat(merge.merge);
    return tags.reduce((tags2, tag) => {
      const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags2.includes(tagObj))
        tags2.push(tagObj);
      return tags2;
    }, []);
  }
  exports.coreKnownTags = coreKnownTags;
  exports.getTags = getTags;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS((exports) => {
  var identity = require_identity();
  var map = require_map();
  var seq = require_seq();
  var string = require_string();
  var tags = require_tags();
  var sortMapEntriesByKey = (a2, b2) => a2.key < b2.key ? -1 : a2.key > b2.key ? 1 : 0;

  class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
      this.name = typeof schema === "string" && schema || "core";
      this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
      this.tags = tags.getTags(customTags, this.name, merge);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity.MAP, { value: map.map });
      Object.defineProperty(this, identity.SCALAR, { value: string.string });
      Object.defineProperty(this, identity.SEQ, { value: seq.seq });
      this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
    }
    clone() {
      const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }
  exports.Schema = Schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart)
        hasDirectives = true;
    }
    if (hasDirectives)
      lines.push("---");
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1)
        lines.unshift("");
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment.indentComment(cs, ""));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives)
          lines.push("");
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment.indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? undefined : () => chompKeep = true;
      let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      if (contentComment)
        body += stringifyComment.lineComment(body, "", commentString(contentComment));
      if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
        lines[lines.length - 1] = `--- ${body}`;
      } else
        lines.push(body);
    } else {
      lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes(`
`)) {
          lines.push("...");
          lines.push(stringifyComment.indentComment(cs, ""));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push("...");
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep)
        dc = dc.replace(/^\n+/, "");
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
          lines.push("");
        lines.push(stringifyComment.indentComment(commentString(dc), ""));
      }
    }
    return lines.join(`
`) + `
`;
  }
  exports.stringifyDocument = stringifyDocument;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS((exports) => {
  var Alias = require_Alias();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var toJS = require_toJS();
  var Schema = require_Schema();
  var stringifyDocument = require_stringifyDocument();
  var anchors = require_anchors();
  var applyReviver = require_applyReviver();
  var createNode = require_createNode();
  var directives = require_directives();

  class Document {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const opt = Object.assign({
        intAsBigInt: false,
        keepSourceTokens: false,
        logLevel: "warn",
        prettyErrors: true,
        strict: true,
        stringKeys: false,
        uniqueKeys: true,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else
        this.directives = new directives.Directives({ version });
      this.setSchema(version, options);
      this.contents = value === undefined ? null : this.createNode(value, _replacer, options);
    }
    clone() {
      const copy = Object.create(Document.prototype, {
        [identity.NODE_TYPE]: { value: identity.DOC }
      });
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives)
        copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    add(value) {
      if (assertCollection(this.contents))
        this.contents.add(value);
    }
    addIn(path2, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path2, value);
    }
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors.anchorNames(this);
        node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
      }
      return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = undefined;
      if (typeof replacer === "function") {
        value = replacer.call({ "": value }, "", value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0)
          replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      };
      const node = createNode.createNode(value, tag, ctx);
      if (flow && identity.isCollection(node))
        node.flow = true;
      setAnchors();
      return node;
    }
    createPair(key, value, options = {}) {
      const k2 = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair.Pair(k2, v);
    }
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    deleteIn(path2) {
      if (Collection.isEmptyPath(path2)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path2) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path2, keepScalar) {
      if (Collection.isEmptyPath(path2))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path2, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path2) {
      if (Collection.isEmptyPath(path2))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path2) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path2, value) {
      if (Collection.isEmptyPath(path2)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path2), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path2, value);
      }
    }
    setSchema(version, options = {}) {
      if (typeof version === "number")
        version = String(version);
      let opt;
      switch (version) {
        case "1.1":
          if (this.directives)
            this.directives.yaml.version = "1.1";
          else
            this.directives = new directives.Directives({ version: "1.1" });
          opt = { resolveKnownTags: false, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          if (this.directives)
            this.directives.yaml.version = version;
          else
            this.directives = new directives.Directives({ version });
          opt = { resolveKnownTags: true, schema: "core" };
          break;
        case null:
          if (this.directives)
            delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema.Schema(Object.assign(opt, options));
      else
        throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      const ctx = {
        anchors: new Map,
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument.stringifyDocument(this, options);
    }
  }
  function assertCollection(contents) {
    if (identity.isCollection(contents))
      return true;
    throw new Error("Expected a YAML collection as document contents");
  }
  exports.Document = Document;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/errors.js
var require_errors = __commonJS((exports) => {
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }

  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLParseError", pos, code, message);
    }
  }

  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLWarning", pos, code, message);
    }
  }
  var prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
      return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "…" + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
      lineStr = lineStr.substring(0, 79) + "…";
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80)
        prev = prev.substring(0, 79) + `…
`;
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = " ".repeat(ci) + "^".repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  exports.YAMLError = YAMLError;
  exports.YAMLParseError = YAMLParseError;
  exports.YAMLWarning = YAMLWarning;
  exports.prettifyError = prettifyError;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS((exports) => {
  function resolveProps(tokens, { flow, indicator, next, offset, onError: onError2, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = "";
    let commentSep = "";
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
          onError2(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
        reqSpace = false;
      }
      if (tab) {
        if (atNewline && token.type !== "comment" && token.type !== "newline") {
          onError2(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        }
        tab = null;
      }
      switch (token.type) {
        case "space":
          if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("\t")) {
            tab = token;
          }
          hasSpace = true;
          break;
        case "comment": {
          if (!hasSpace)
            onError2(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = token.source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += commentSep + cb;
          commentSep = "";
          atNewline = false;
          break;
        }
        case "newline":
          if (atNewline) {
            if (comment)
              comment += token.source;
            else if (!found || indicator !== "seq-item-ind")
              spaceBefore = true;
          } else
            commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag)
            newlineAfterProp = token;
          hasSpace = true;
          break;
        case "anchor":
          if (anchor)
            onError2(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (token.source.endsWith(":"))
            onError2(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case "tag": {
          if (tag)
            onError2(token, "MULTIPLE_TAGS", "A node can have at most one tag");
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError2(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
          if (found)
            onError2(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
          found = token;
          atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
          hasSpace = false;
          break;
        case "comma":
          if (flow) {
            if (comma)
              onError2(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        default:
          onError2(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last2 = tokens[tokens.length - 1];
    const end = last2 ? last2.offset + last2.source.length : offset;
    if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
      onError2(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
    }
    if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
      onError2(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }
  exports.resolveProps = resolveProps;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS((exports) => {
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return true;
        if (key.end) {
          for (const st of key.end)
            if (st.type === "newline")
              return true;
        }
        return false;
      case "flow-collection":
        for (const it of key.items) {
          for (const st of it.start)
            if (st.type === "newline")
              return true;
          if (it.sep) {
            for (const st of it.sep)
              if (st.type === "newline")
                return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return true;
        }
        return false;
      default:
        return true;
    }
  }
  exports.containsNewline = containsNewline;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS((exports) => {
  var utilContainsNewline = require_util_contains_newline();
  function flowIndentCheck(indent, fc, onError2) {
    if (fc?.type === "flow-collection") {
      const end = fc.end[0];
      if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
        const msg = "Flow end indicator should be more indented than parent";
        onError2(end, "BAD_INDENT", msg, true);
      }
    }
  }
  exports.flowIndentCheck = flowIndentCheck;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS((exports) => {
  var identity = require_identity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
      return false;
    const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a2, b2) => a2 === b2 || identity.isScalar(a2) && identity.isScalar(b2) && a2.value === b2.value;
    return items.some((pair) => isEqual(pair.key, search));
  }
  exports.mapIncludes = mapIncludes;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS((exports) => {
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  var utilMapIncludes = require_util_map_includes();
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError2, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps.resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError: onError2,
        parentIndent: bm.indent,
        startOnNewline: true
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === "block-seq")
            onError2(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
          else if ("indent" in key && key.indent !== bm.indent)
            onError2(offset, "BAD_INDENT", startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map.comment)
              map.comment += `
` + keyProps.comment;
            else
              map.comment = keyProps.comment;
          }
          continue;
        }
        if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
          onError2(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError2(offset, "BAD_INDENT", startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key ? composeNode(ctx, key, keyProps, onError2) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError2);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError2);
      ctx.atKey = false;
      if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
        onError2(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      const valueProps = resolveProps.resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError: onError2,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === "block-map" && !valueProps.hasNewline)
            onError2(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
            onError2(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError2) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError2);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError2);
        offset = valueNode.range[2];
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        if (implicitKey)
          onError2(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
        if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError2(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
  }
  exports.resolveBlockMap = resolveBlockMap;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS((exports) => {
  var YAMLSeq = require_YAMLSeq();
  var resolveProps = require_resolve_props();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError2, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps.resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError: onError2,
        parentIndent: bs.indent,
        startOnNewline: true
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === "block-seq")
            onError2(props.end, "BAD_INDENT", "All sequence items must start at the same column");
          else
            onError2(offset, "MISSING_CHAR", "Sequence item without - indicator");
        } else {
          commentEnd = props.end;
          if (props.comment)
            seq.comment = props.comment;
          continue;
        }
      }
      const node = value ? composeNode(ctx, value, props, onError2) : composeEmptyNode(ctx, props.end, start, null, props, onError2);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError2);
      offset = node.range[2];
      seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
  }
  exports.resolveBlockSeq = resolveBlockSeq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS((exports) => {
  function resolveEnd(end, offset, reqSpace, onError2) {
    let comment = "";
    if (end) {
      let hasSpace = false;
      let sep = "";
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = true;
            break;
          case "comment": {
            if (reqSpace && !hasSpace)
              onError2(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += sep + cb;
            sep = "";
            break;
          }
          case "newline":
            if (comment)
              sep += source;
            hasSpace = true;
            break;
          default:
            onError2(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  exports.resolveEnd = resolveEnd;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilMapIncludes = require_util_map_includes();
  var blockMsg = "Block collections are not allowed within flow collections";
  var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError2, tag) {
    const isMap = fc.start.source === "{";
    const fcName = isMap ? "flow map" : "flow sequence";
    const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i2 = 0;i2 < fc.items.length; ++i2) {
      const collItem = fc.items[i2];
      const { start, key, sep, value } = collItem;
      const props = resolveProps.resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError: onError2,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i2 === 0 && props.comma)
            onError2(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
          else if (i2 < fc.items.length - 1)
            onError2(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
          if (props.comment) {
            if (coll.comment)
              coll.comment += `
` + props.comment;
            else
              coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
          onError2(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
      }
      if (i2 === 0) {
        if (props.comma)
          onError2(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError2(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
        if (props.comment) {
          let prevItemComment = "";
          loop:
            for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity.isPair(prev))
              prev = prev.value ?? prev.key;
            if (prev.comment)
              prev.comment += `
` + prevItemComment;
            else
              prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value ? composeNode(ctx, value, props, onError2) : composeEmptyNode(ctx, props.end, sep, null, props, onError2);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value))
          onError2(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key ? composeNode(ctx, key, props, onError2) : composeEmptyNode(ctx, keyStart, start, null, props, onError2);
        if (isBlock(key))
          onError2(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError: onError2,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError2(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError2(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else if (value) {
          if ("source" in value && value.source?.[0] === ":")
            onError2(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
          else
            onError2(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError2) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError2) : null;
        if (valueNode) {
          if (isBlock(value))
            onError2(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        if (isMap) {
          const map = coll;
          if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError2(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
          map.items.push(pair);
        } else {
          const map = new YAMLMap.YAMLMap(ctx.schema);
          map.flow = true;
          map.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? "}" : "]";
    const [ce, ...ee2] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError2(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
      if (ce && ce.source.length !== 1)
        ee2.unshift(ce);
    }
    if (ee2.length > 0) {
      const end = resolveEnd.resolveEnd(ee2, cePos, ctx.options.strict, onError2);
      if (end.comment) {
        if (coll.comment)
          coll.comment += `
` + end.comment;
        else
          coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  exports.resolveFlowCollection = resolveFlowCollection;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveBlockMap = require_resolve_block_map();
  var resolveBlockSeq = require_resolve_block_seq();
  var resolveFlowCollection = require_resolve_flow_collection();
  function resolveCollection(CN, ctx, token, onError2, tagName, tag) {
    const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError2, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError2, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError2, tag);
    const Coll = coll.constructor;
    if (tagName === "!" || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName)
      coll.tag = tagName;
    return coll;
  }
  function composeCollection(CN, ctx, token, props, onError2) {
    const tagToken = props.tag;
    const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError2(tagToken, "TAG_RESOLVE_FAILED", msg));
    if (token.type === "block-seq") {
      const { anchor, newlineAfterProp: nl } = props;
      const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      if (lastProp && (!nl || nl.offset < lastProp.offset)) {
        const message = "Missing newline after block sequence props";
        onError2(lastProp, "MISSING_CHAR", message);
      }
    }
    const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
      return resolveCollection(CN, ctx, token, onError2, tagName);
    }
    let tag = ctx.schema.tags.find((t2) => t2.tag === tagName && t2.collection === expType);
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError2(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
        } else {
          onError2(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
        }
        return resolveCollection(CN, ctx, token, onError2, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError2, tagName, tag);
    const res = tag.resolve?.(coll, (msg) => onError2(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
    const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
      node.format = tag.format;
    return node;
  }
  exports.composeCollection = composeCollection;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function resolveBlockScalar(ctx, scalar, onError2) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError2);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i2 = lines.length - 1;i2 >= 0; --i2) {
      const content = lines[i2][1];
      if (content === "" || content === "\r")
        chompStart = i2;
      else
        break;
    }
    if (chompStart === 0) {
      const value2 = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "";
      let end2 = start + header.length;
      if (scalar.source)
        end2 += scalar.source.length;
      return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i2 = 0;i2 < chompStart; ++i2) {
      const [indent, content] = lines[i2];
      if (content === "" || content === "\r") {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
          onError2(offset + indent.length, "MISSING_CHAR", message);
        }
        if (header.indent === 0)
          trimIndent = indent.length;
        contentStart = i2;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = "Block scalar values in collections must be indented";
          onError2(offset, "BAD_INDENT", message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i2 = lines.length - 1;i2 >= chompStart; --i2) {
      if (lines[i2][0].length > trimIndent)
        chompStart = i2 + 1;
    }
    let value = "";
    let sep = "";
    let prevMoreIndented = false;
    for (let i2 = 0;i2 < contentStart; ++i2)
      value += lines[i2][0].slice(trimIndent) + `
`;
    for (let i2 = contentStart;i2 < chompStart; ++i2) {
      let [indent, content] = lines[i2];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === "\r";
      if (crlf)
        content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent ? "explicit indentation indicator" : "first line";
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError2(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
        indent = "";
      }
      if (type === Scalar.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
      } else if (indent.length > trimIndent || content[0] === "\t") {
        if (sep === " ")
          sep = `
`;
        else if (!prevMoreIndented && sep === `
`)
          sep = `

`;
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
        prevMoreIndented = true;
      } else if (content === "") {
        if (sep === `
`)
          value += `
`;
        else
          sep = `
`;
      } else {
        value += sep + content;
        sep = " ";
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i2 = chompStart;i2 < lines.length; ++i2)
          value += `
` + lines[i2][0].slice(trimIndent);
        if (value[value.length - 1] !== `
`)
          value += `
`;
        break;
      default:
        value += `
`;
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError2) {
    if (props[0].type !== "block-scalar-header") {
      onError2(props[0], "IMPOSSIBLE", "Block scalar header not found");
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = "";
    let error = -1;
    for (let i2 = 1;i2 < source.length; ++i2) {
      const ch = source[i2];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        const n2 = Number(ch);
        if (!indent && n2)
          indent = n2;
        else if (error === -1)
          error = offset + i2;
      }
    }
    if (error !== -1)
      onError2(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = "";
    let length = source.length;
    for (let i2 = 1;i2 < props.length; ++i2) {
      const token = props[i2];
      switch (token.type) {
        case "space":
          hasSpace = true;
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          if (strict && !hasSpace) {
            const message = "Comments must be separated from other tokens by white space characters";
            onError2(token, "MISSING_CHAR", message);
          }
          length += token.source.length;
          comment = token.source.substring(1);
          break;
        case "error":
          onError2(token, "UNEXPECTED_TOKEN", token.message);
          length += token.source.length;
          break;
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError2(token, "UNEXPECTED_TOKEN", message);
          const ts = token.source;
          if (ts && typeof ts === "string")
            length += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first2 = split[0];
    const m2 = first2.match(/^( *)/);
    const line0 = m2?.[1] ? [m2[1], first2.slice(m2[1].length)] : ["", first2];
    const lines = [line0];
    for (let i2 = 1;i2 < split.length; i2 += 2)
      lines.push([split[i2], split[i2 + 1]]);
    return lines;
  }
  exports.resolveBlockScalar = resolveBlockScalar;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var resolveEnd = require_resolve_end();
  function resolveFlowScalar(scalar, strict, onError2) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError2(offset + rel, code, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      default:
        onError2(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
        return {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError2);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError2) {
    let badChar = "";
    switch (source[0]) {
      case "\t":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError2(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
    return unfoldLines(source);
  }
  function singleQuotedValue(source, onError2) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError2(source.length, "MISSING_CHAR", "Missing closing 'quote");
    return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function unfoldLines(source) {
    const line = /(.*?)\r?\n/sy;
    let match = line.exec(source);
    if (!match)
      return source;
    let trimEnd, trimBoth;
    try {
      trimEnd = new RegExp("(?<![ \t])[ \t]+$");
      trimBoth = new RegExp("^[ \t]+|(?<![ \t])[ \t]+$", "g");
    } catch {
      trimEnd = /[ \t]+$/;
      trimBoth = /^[ \t]+|[ \t]+$/g;
    }
    let res = match[1].replace(trimEnd, "");
    let sep = " ";
    let pos = line.lastIndex;
    while (match = line.exec(source)) {
      const lm = match[1].replace(trimBoth, "");
      if (lm === "") {
        if (sep === `
`)
          res += sep;
        else
          sep = `
`;
      } else {
        res += sep + lm;
        sep = " ";
      }
      pos = line.lastIndex;
    }
    const last2 = /[ \t]*(.*)/sy;
    last2.lastIndex = pos;
    match = last2.exec(source);
    return res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError2) {
    let res = "";
    for (let i2 = 1;i2 < source.length - 1; ++i2) {
      const ch = source[i2];
      if (ch === "\r" && source[i2 + 1] === `
`)
        continue;
      if (ch === `
`) {
        const { fold, offset } = foldNewline(source, i2);
        res += fold;
        i2 = offset;
      } else if (ch === "\\") {
        let next = source[++i2];
        const cc = escapeCodes[next];
        if (cc)
          res += cc;
        else if (next === `
`) {
          next = source[i2 + 1];
          while (next === " " || next === "\t")
            next = source[++i2 + 1];
        } else if (next === "\r" && source[i2 + 1] === `
`) {
          next = source[++i2 + 1];
          while (next === " " || next === "\t")
            next = source[++i2 + 1];
        } else if (next === "x" || next === "u" || next === "U") {
          const length = next === "x" ? 2 : next === "u" ? 4 : 8;
          res += parseCharCode(source, i2 + 1, length, onError2);
          i2 += length;
        } else {
          const raw = source.substr(i2 - 1, 2);
          onError2(i2 - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === " " || ch === "\t") {
        const wsStart = i2;
        let next = source[i2 + 1];
        while (next === " " || next === "\t")
          next = source[++i2 + 1];
        if (next !== `
` && !(next === "\r" && source[i2 + 2] === `
`))
          res += i2 > wsStart ? source.slice(wsStart, i2 + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError2(source.length, "MISSING_CHAR", 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = "";
    let ch = source[offset + 1];
    while (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (ch === "\r" && source[offset + 2] !== `
`)
        break;
      if (ch === `
`)
        fold += `
`;
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold)
      fold = " ";
    return { fold, offset };
  }
  var escapeCodes = {
    "0": "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "",
    _: " ",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t"
  };
  function parseCharCode(source, offset, length, onError2) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    try {
      return String.fromCodePoint(code);
    } catch {
      const raw = source.substr(offset - 2, length + 2);
      onError2(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
      return raw;
    }
  }
  exports.resolveFlowScalar = resolveFlowScalar;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  function composeScalar(ctx, token, tagToken, onError2) {
    const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError2) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError2);
    const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError2(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError2);
    else if (token.type === "scalar")
      tag = findScalarTagByTest(ctx, value, token, onError2);
    else
      tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(value, (msg) => onError2(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError2(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
      scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
      scalar.type = type;
    if (tagName)
      scalar.tag = tagName;
    if (tag.format)
      scalar.format = tag.format;
    if (comment)
      scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema, value, tagName, tagToken, onError2) {
    if (tagName === "!")
      return schema[identity.SCALAR];
    const matchWithTest = [];
    for (const tag of schema.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
      }
    }
    for (const tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
      schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
      return kt;
    }
    onError2(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
    return schema[identity.SCALAR];
  }
  function findScalarTagByTest({ atKey, directives, schema }, value, token, onError2) {
    const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
      const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives.tagString(tag.tag);
        const cs = directives.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError2(token, "TAG_RESOLVE_FAILED", msg, true);
      }
    }
    return tag;
  }
  exports.composeScalar = composeScalar;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS((exports) => {
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i2 = pos - 1;i2 >= 0; --i2) {
        let st = before[i2];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        st = before[++i2];
        while (st?.type === "space") {
          offset += st.source.length;
          st = before[++i2];
        }
        break;
      }
    }
    return offset;
  }
  exports.emptyScalarPosition = emptyScalarPosition;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var composeCollection = require_compose_collection();
  var composeScalar = require_compose_scalar();
  var resolveEnd = require_resolve_end();
  var utilEmptyScalarPosition = require_util_empty_scalar_position();
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError2) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError2);
        if (anchor || tag)
          onError2(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar.composeScalar(ctx, token, tag, onError2);
        if (anchor)
          node.anchor = anchor.source.substring(1);
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection.composeCollection(CN, ctx, token, props, onError2);
          if (anchor)
            node.anchor = anchor.source.substring(1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onError2(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError2(token, "UNEXPECTED_TOKEN", message);
        isSrcToken = false;
      }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError2));
    if (anchor && node.anchor === "")
      onError2(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
      const msg = "With stringKeys, all keys must be strings";
      onError2(tag ?? token, "NON_STRING_KEY", msg);
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      if (token.type === "scalar" && token.source === "")
        node.comment = comment;
      else
        node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken)
      node.srcToken = token;
    return node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError2) {
    const token = {
      type: "scalar",
      offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError2);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === "")
        onError2(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError2) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === "")
      onError2(offset, "BAD_ALIAS", "Alias cannot be an empty string");
    if (alias.source.endsWith(":"))
      onError2(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError2);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
      alias.comment = re.comment;
    return alias;
  }
  exports.composeEmptyNode = composeEmptyNode;
  exports.composeNode = composeNode;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS((exports) => {
  var Document = require_Document();
  var composeNode = require_compose_node();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  function composeDoc(options, directives, { offset, start, value, end }, onError2) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError: onError2,
      parentIndent: 0,
      startOnNewline: true
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
        onError2(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
    }
    doc.contents = value ? composeNode.composeNode(ctx, value, props, onError2) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError2);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError2);
    if (re.comment)
      doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  exports.composeDoc = composeDoc;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS((exports) => {
  var node_process = __require("process");
  var directives = require_directives();
  var Document = require_Document();
  var errors = require_errors();
  var identity = require_identity();
  var composeDoc = require_compose_doc();
  var resolveEnd = require_resolve_end();
  function getErrorPos(src) {
    if (typeof src === "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "";
    let atComment = false;
    let afterEmptyLine = false;
    for (let i2 = 0;i2 < prelude.length; ++i2) {
      const source = prelude[i2];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " ");
          atComment = true;
          afterEmptyLine = false;
          break;
        case "%":
          if (prelude[i2 + 1]?.[0] !== "#")
            i2 += 1;
          atComment = false;
          break;
        default:
          if (!atComment)
            afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }

  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors.YAMLWarning(pos, code, message));
        else
          this.errors.push(new errors.YAMLParseError(pos, code, message));
      };
      this.directives = new directives.Directives({ version: options.version || "1.2" });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          if (identity.isPair(it))
            it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        for (let i2 = 0;i2 < this.errors.length; ++i2)
          doc.errors.push(this.errors[i2]);
        for (let i2 = 0;i2 < this.warnings.length; ++i2)
          doc.warnings.push(this.warnings[i2]);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    *next(token) {
      if (node_process.env.LOG_STREAM)
        console.dir(token, { depth: null });
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, "BAD_DIRECTIVE", message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case "document": {
          const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
          this.decorate(doc, false);
          if (this.doc)
            yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
          const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          if (this.atDirectives || !this.doc)
            this.errors.push(error);
          else
            this.doc.errors.push(error);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            const msg = "Unexpected doc-end without preceding document";
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign({ _directives: this.directives }, this.options);
        const doc = new Document.Document(undefined, opts);
        if (this.atDirectives)
          this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  exports.Composer = Composer;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS((exports) => {
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  var errors = require_errors();
  var stringifyString = require_stringifyString();
  function resolveAsScalar(token, strict = true, onError2) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
        if (onError2)
          onError2(offset, code, message);
        else
          throw new errors.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
        case "block-scalar":
          return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey,
      indent: indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
      { type: "newline", offset: -1, indent, source: `
` }
    ];
    switch (source[0]) {
      case "|":
      case ">": {
        const he = source.indexOf(`
`);
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + `
`;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: "newline", offset: -1, indent, source: `
` });
        return { type: "block-scalar", offset, indent, props, source: body };
      }
      case '"':
        return { type: "double-quoted-scalar", offset, indent, source, end };
      case "'":
        return { type: "single-quoted-scalar", offset, indent, source, end };
      default:
        return { type: "scalar", offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = "indent" in token ? token.indent : null;
    if (afterKey && typeof indent === "number")
      indent += 2;
    if (!type)
      switch (token.type) {
        case "single-quoted-scalar":
          type = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          type = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          const header = token.props[0];
          if (header.type !== "block-scalar-header")
            throw new Error("Invalid block scalar header");
          type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          type = "PLAIN";
      }
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey: implicitKey || indent === null,
      indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
      case "|":
      case ">":
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, "double-quoted-scalar");
        break;
      case "'":
        setFlowScalarValue(token, source, "single-quoted-scalar");
        break;
      default:
        setFlowScalarValue(token, source, "scalar");
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf(`
`);
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + `
`;
    if (token.type === "block-scalar") {
      const header = token.props[0];
      if (header.type !== "block-scalar-header")
        throw new Error("Invalid block scalar header");
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = "indent" in token ? token.indent : -1;
      const props = [
        { type: "block-scalar-header", offset, indent, source: head }
      ];
      if (!addEndtoBlockProps(props, "end" in token ? token.end : undefined))
        props.push({ type: "newline", offset: -1, indent, source: `
` });
      for (const key of Object.keys(token))
        if (key !== "type" && key !== "offset")
          delete token[key];
      Object.assign(token, { type: "block-scalar", indent, props, source: body });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case "space":
          case "comment":
            props.push(st);
            break;
          case "newline":
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        token.type = type;
        token.source = source;
        break;
      case "block-scalar": {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === "block-scalar-header")
          oa -= token.props[0].source.length;
        for (const tok of end)
          tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case "block-map":
      case "block-seq": {
        const offset = token.offset + source.length;
        const nl = { type: "newline", offset, indent: token.indent, source: `
` };
        delete token.items;
        Object.assign(token, { type, source, end: [nl] });
        break;
      }
      default: {
        const indent = "indent" in token ? token.indent : -1;
        const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  exports.createScalarToken = createScalarToken;
  exports.resolveAsScalar = resolveAsScalar;
  exports.setScalarValue = setScalarValue;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS((exports) => {
  var stringify = (cst) => ("type" in cst) ? stringifyToken(cst) : stringifyItem(cst);
  function stringifyToken(token) {
    switch (token.type) {
      case "block-scalar": {
        let res = "";
        for (const tok of token.props)
          res += stringifyToken(tok);
        return res + token.source;
      }
      case "block-map":
      case "block-seq": {
        let res = "";
        for (const item of token.items)
          res += stringifyItem(item);
        return res;
      }
      case "flow-collection": {
        let res = token.start.source;
        for (const item of token.items)
          res += stringifyItem(item);
        for (const st of token.end)
          res += st.source;
        return res;
      }
      case "document": {
        let res = stringifyItem(token);
        if (token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ("end" in token && token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = "";
    for (const st of start)
      res += st.source;
    if (key)
      res += stringifyToken(key);
    if (sep)
      for (const st of sep)
        res += st.source;
    if (value)
      res += stringifyToken(value);
    return res;
  }
  exports.stringify = stringify;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS((exports) => {
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove item");
  function visit(cst, visitor) {
    if ("type" in cst && cst.type === "document")
      cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  visit.itemAtPath = (cst, path2) => {
    let item = cst;
    for (const [field, index] of path2) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path2) => {
    const parent = visit.itemAtPath(cst, path2.slice(0, -1));
    const field = path2[path2.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path2, item, visitor) {
    let ctrl = visitor(item, path2);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i2 = 0;i2 < token.items.length; ++i2) {
          const ci = _visit(Object.freeze(path2.concat([[field, i2]])), token.items[i2], visitor);
          if (typeof ci === "number")
            i2 = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i2, 1);
            i2 -= 1;
          }
        }
        if (typeof ctrl === "function" && field === "key")
          ctrl = ctrl(item, path2);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path2) : ctrl;
  }
  exports.visit = visit;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS((exports) => {
  var cstScalar = require_cst_scalar();
  var cstStringify = require_cst_stringify();
  var cstVisit = require_cst_visit();
  var BOM = "\uFEFF";
  var DOCUMENT = "\x02";
  var FLOW_END = "\x18";
  var SCALAR = "\x1F";
  var isCollection = (token) => !!token && ("items" in token);
  var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return "<BOM>";
      case DOCUMENT:
        return "<DOC>";
      case FLOW_END:
        return "<FLOW_END>";
      case SCALAR:
        return "<SCALAR>";
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  exports.createScalarToken = cstScalar.createScalarToken;
  exports.resolveAsScalar = cstScalar.resolveAsScalar;
  exports.setScalarValue = cstScalar.setScalarValue;
  exports.stringify = cstStringify.stringify;
  exports.visit = cstVisit.visit;
  exports.BOM = BOM;
  exports.DOCUMENT = DOCUMENT;
  exports.FLOW_END = FLOW_END;
  exports.SCALAR = SCALAR;
  exports.isCollection = isCollection;
  exports.isScalar = isScalar;
  exports.prettyToken = prettyToken;
  exports.tokenType = tokenType;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS((exports) => {
  var cst = require_cst();
  function isEmpty(ch) {
    switch (ch) {
      case undefined:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef");
  var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
  var flowIndicatorChars = new Set(",[]{}");
  var invalidAnchorChars = new Set(` ,[]{}
\r	`);
  var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);

  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = "";
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i2 = this.pos;
      let ch = this.buffer[i2];
      while (ch === " " || ch === "\t")
        ch = this.buffer[++i2];
      if (!ch || ch === "#" || ch === `
`)
        return true;
      if (ch === "\r")
        return this.buffer[i2 + 1] === `
`;
      return false;
    }
    charAt(n2) {
      return this.buffer[this.pos + n2];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === " ")
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          const next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== "number" || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf(`
`, this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === "\r")
        end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n2) {
      return this.pos + n2 <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n2) {
      return this.buffer.substr(this.pos, n2);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === cst.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === "%") {
        let dirEnd = line.length;
        let cs = line.indexOf("#");
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === " " || ch === "\t") {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf("#", cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === " " || ch === "\t")
            dirEnd -= 1;
          else
            break;
        }
        const n2 = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n2);
        this.pushNewline();
        return "stream";
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return "stream";
      }
      yield cst.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        const s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === "---" ? "doc" : "stream";
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        const n2 = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n2;
        return "block-start";
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n2 = yield* this.pushIndicators();
      switch (line[n2]) {
        case "#":
          yield* this.pushCount(line.length - n2);
        case undefined:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          return "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          n2 += yield* this.parseBlockScalarHeader();
          n2 += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n2);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp;
      let indent = -1;
      do {
        nl = yield* this.pushNewline();
        if (nl > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl + sp > 0);
      const line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
        const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n2 = 0;
      while (line[n2] === ",") {
        n2 += yield* this.pushCount(1);
        n2 += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n2 += yield* this.pushIndicators();
      switch (line[n2]) {
        case undefined:
          return "flow";
        case "#":
          yield* this.pushCount(line.length - n2);
          return "flow";
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? "flow" : "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "flow";
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ":": {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",") {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return "flow";
          }
        }
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n2 = 0;
          while (this.buffer[end - 1 - n2] === "\\")
            n2 += 1;
          if (n2 % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        while (nl !== -1) {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        if (nl !== -1) {
          end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i2 = this.pos;
      while (true) {
        const ch = this.buffer[++i2];
        if (ch === "+")
          this.blockScalarKeep = true;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1;
      let indent = 0;
      let ch;
      loop:
        for (let i3 = this.pos;ch = this.buffer[i3]; ++i3) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case `
`:
              nl = i3;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i3 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === `
`)
                break;
            }
            default:
              break loop;
          }
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1)
          this.indentNext = indent;
        else {
          this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i2 = nl + 1;
      ch = this.buffer[i2];
      while (ch === " ")
        ch = this.buffer[++i2];
      if (ch === "\t") {
        while (ch === "\t" || ch === " " || ch === "\r" || ch === `
`)
          ch = this.buffer[++i2];
        nl = i2 - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i3 = nl - 1;
          let ch2 = this.buffer[i3];
          if (ch2 === "\r")
            ch2 = this.buffer[--i3];
          const lastChar = i3;
          while (ch2 === " ")
            ch2 = this.buffer[--i3];
          if (ch2 === `
` && i3 >= this.pos && i3 + 1 + indent > lastChar)
            nl = i3;
          else
            break;
        } while (true);
      }
      yield cst.SCALAR;
      yield* this.pushToIndex(nl + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i2 = this.pos - 1;
      let ch;
      while (ch = this.buffer[++i2]) {
        if (ch === ":") {
          const next = this.buffer[i2 + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i2;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i2 + 1];
          if (ch === "\r") {
            if (next === `
`) {
              i2 += 1;
              ch = `
`;
              next = this.buffer[i2 + 1];
            } else
              end = i2;
          }
          if (next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            const cs = this.continueScalar(i2 + 1);
            if (cs === -1)
              break;
            i2 = Math.max(i2, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i2;
        }
      }
      if (!ch && !this.atEnd)
        return this.setNext("plain-scalar");
      yield cst.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? "flow" : "doc";
    }
    *pushCount(n2) {
      if (n2 > 0) {
        yield this.buffer.substr(this.pos, n2);
        this.pos += n2;
        return n2;
      }
      return 0;
    }
    *pushToIndex(i2, allowEmpty) {
      const s = this.buffer.slice(this.pos, i2);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty)
        yield "";
      return 0;
    }
    *pushIndicators() {
      let n2 = 0;
      loop:
        while (true) {
          switch (this.charAt(0)) {
            case "!":
              n2 += yield* this.pushTag();
              n2 += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n2 += yield* this.pushUntil(isNotAnchorChar);
              n2 += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            case "?":
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n2 += yield* this.pushCount(1);
                n2 += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
      return n2;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i2 = this.pos + 2;
        let ch = this.buffer[i2];
        while (!isEmpty(ch) && ch !== ">")
          ch = this.buffer[++i2];
        return yield* this.pushToIndex(ch === ">" ? i2 + 1 : i2, false);
      } else {
        let i2 = this.pos + 1;
        let ch = this.buffer[i2];
        while (ch) {
          if (tagChars.has(ch))
            ch = this.buffer[++i2];
          else if (ch === "%" && hexDigits.has(this.buffer[i2 + 1]) && hexDigits.has(this.buffer[i2 + 2])) {
            ch = this.buffer[i2 += 3];
          } else
            break;
        }
        return yield* this.pushToIndex(i2, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === `
`)
        return yield* this.pushCount(1);
      else if (ch === "\r" && this.charAt(1) === `
`)
        return yield* this.pushCount(2);
      else
        return 0;
    }
    *pushSpaces(allowTabs) {
      let i2 = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i2];
      } while (ch === " " || allowTabs && ch === "\t");
      const n2 = i2 - this.pos;
      if (n2 > 0) {
        yield this.buffer.substr(this.pos, n2);
        this.pos = i2;
      }
      return n2;
    }
    *pushUntil(test) {
      let i2 = this.pos;
      let ch = this.buffer[i2];
      while (!test(ch))
        ch = this.buffer[++i2];
      return yield* this.pushToIndex(i2, false);
    }
  }
  exports.Lexer = Lexer;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS((exports) => {
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = low + high >> 1;
          if (this.lineStarts[mid] < offset)
            low = mid + 1;
          else
            high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  exports.LineCounter = LineCounter;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS((exports) => {
  var node_process = __require("process");
  var cst = require_cst();
  var lexer = require_lexer();
  function includesToken(list, type) {
    for (let i2 = 0;i2 < list.length; ++i2)
      if (list[i2].type === type)
        return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i2 = 0;i2 < list.length; ++i2) {
      switch (list[i2].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i2;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i2 = prev.length;
    loop:
      while (--i2 >= 0) {
        switch (prev[i2].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
    while (prev[++i2]?.type === "space") {}
    return prev.splice(i2, prev.length);
  }
  function arrayPushArray(target, source) {
    if (source.length < 1e5)
      Array.prototype.push.apply(target, source);
    else
      for (let i2 = 0;i2 < source.length; ++i2)
        target.push(source[i2]);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start") {
      for (const it of fc.items) {
        if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
          if (it.key)
            it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end)
              arrayPushArray(it.value.end, it.sep);
            else
              it.value.end = it.sep;
          } else
            arrayPushArray(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }

  class Parser {
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = "";
      this.type = "";
      this.lexer = new lexer.Lexer;
      this.onNewLine = onNewLine;
    }
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0)
        this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete)
        yield* this.end();
    }
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log("|", cst.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source });
        this.offset += source.length;
      } else if (type === "scalar") {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = "scalar";
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case "newline":
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine)
              this.onNewLine(this.offset + source.length);
            break;
          case "space":
            if (this.atNewLine && source[0] === " ")
              this.indent += source.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine)
              this.indent += source.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    *end() {
      while (this.stack.length > 0)
        yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        while (this.stack.length > 0)
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n2) {
      return this.stack[this.stack.length - n2];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = "Tried to pop an empty stack";
        yield { type: "error", offset: this.offset, source: "", message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === "block-scalar") {
          token.indent = "indent" in top ? top.indent : 0;
        } else if (token.type === "flow-collection" && top.type === "document") {
          token.indent = 0;
        }
        if (token.type === "flow-collection")
          fixFlowSeqItems(token);
        switch (top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            const it = top.items[top.items.length - 1];
            if (it.value)
              top.items.push({ start: [], value: token });
            else
              it.value = token;
            break;
          }
          case "flow-collection": {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep)
              it.value = token;
            else
              Object.assign(it, { key: token, sep: [] });
            return;
          }
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          const last2 = token.items[token.items.length - 1];
          if (last2 && !last2.sep && !last2.value && last2.start.length > 0 && findNonEmptyIndex(last2.start) === -1 && (token.indent === 0 || last2.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
            if (top.type === "document")
              top.end = last2.start;
            else
              top.items.push({ start: last2.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          const doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          if (this.type === "doc-start")
            doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else
            doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv)
        this.stack.push(bv);
      else {
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source
        };
      }
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else
          sep = [this.sourceToken];
        const map = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            while (nl !== 0) {
              this.onNewLine(this.offset + nl);
              nl = this.source.indexOf(`
`, nl) + 1;
            }
          }
          yield* this.pop();
          break;
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map) {
      const it = map.items[map.items.length - 1];
      switch (this.type) {
        case "newline":
          this.onKeyLine = false;
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last2 = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last2?.type === "comment")
              end?.push(this.sourceToken);
            else
              map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "space":
        case "comment":
          if (it.value) {
            map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map.indent)) {
              const prev = map.items[map.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                map.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map.indent;
        const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl = [];
          for (let i2 = 0;i2 < it.sep.length; ++i2) {
            const st = it.sep[i2];
            switch (st.type) {
              case "newline":
                nl.push(i2);
                break;
              case "space":
                break;
              case "comment":
                if (st.indent > map.indent)
                  nl.length = 0;
                break;
              default:
                nl.length = 0;
            }
          }
          if (nl.length >= 2)
            start = it.sep.splice(nl[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "explicit-key-ind":
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }]
              });
            }
            this.onKeyLine = true;
            return;
          case "map-value-ind":
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, "newline")) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start2 = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                  });
                }
              } else if (it.value) {
                map.items.push({ start: [], key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }]
                });
              } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                const start2 = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key, sep }]
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }]
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs);
            } else {
              Object.assign(it, { key: fs, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else if (atMapIndent) {
                map.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq) {
      const it = seq.items[seq.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last2 = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last2?.type === "comment")
              end?.push(this.sourceToken);
            else
              seq.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq.indent)) {
              const prev = seq.items[seq.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                seq.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq.indent)
            break;
          if (it.value || includesToken(it.start, "seq-item-ind"))
            seq.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq.indent) {
        const bv = this.startBlockValue(seq);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!it || it.sep)
              fc.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!it || it.value)
              fc.items.push({ start: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs, sep: [] });
            else if (it.sep)
              this.stack.push(fs);
            else
              Object.assign(it, { key: fs, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv)
          this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
          yield* this.pop();
          yield* this.step();
        } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf(`
`, nl) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== "comment")
        return false;
      if (this.indent <= indent)
        return false;
      return start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      if (this.type !== "doc-mode") {
        if (docEnd.end)
          docEnd.end.push(this.sourceToken);
        else
          docEnd.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop();
          yield* this.step();
          break;
        case "newline":
          this.onKeyLine = false;
        case "space":
        case "comment":
        default:
          if (token.end)
            token.end.push(this.sourceToken);
          else
            token.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
      }
    }
  }
  exports.Parser = Parser;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS((exports) => {
  var composer = require_composer();
  var Document = require_Document();
  var errors = require_errors();
  var log2 = require_log();
  var identity = require_identity();
  var lineCounter = require_line_counter();
  var parser4 = require_parser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter || null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser4.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter2)
      for (const doc of docs) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
    if (docs.length > 0)
      return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser4.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
      if (!doc)
        doc = _doc;
      else if (doc.options.logLevel !== "silent") {
        doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
        break;
      }
    }
    if (prettyErrors && lineCounter2) {
      doc.errors.forEach(errors.prettifyError(source, lineCounter2));
      doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
    }
    return doc;
  }
  function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === "function") {
      _reviver = reviver;
    } else if (options === undefined && reviver && typeof reviver === "object") {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
      return null;
    doc.warnings.forEach((warning) => log2.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== "silent")
        throw doc.errors[0];
      else
        doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
    }
    if (typeof options === "string")
      options = options.length;
    if (typeof options === "number") {
      const indent = Math.round(options);
      options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined)
        return;
    }
    if (identity.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
  }
  exports.parse = parse;
  exports.parseAllDocuments = parseAllDocuments;
  exports.parseDocument = parseDocument;
  exports.stringify = stringify;
});

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/rolldown-runtime.mjs
import { createRequire as createRequire2 } from "node:module";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function")
    for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key;i < n; i++) {
      key = keys[i];
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: ((k) => from[k]).bind(null, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
  value: mod,
  enumerable: true
}) : target, mod));
var __require2 = /* @__PURE__ */ (() => createRequire2(import.meta.url))();

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/@clack/core.mjs
import { stdin, stdout } from "node:process";
import * as l from "node:readline";
import l__default from "node:readline";
import { ReadStream } from "node:tty";
var getCodePointsLength = (() => {
  const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  return (input) => {
    let surrogatePairsNr = 0;
    SURROGATE_PAIR_RE.lastIndex = 0;
    while (SURROGATE_PAIR_RE.test(input))
      surrogatePairsNr += 1;
    return input.length - surrogatePairsNr;
  };
})();
var isFullWidth = (x) => {
  return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
};
var isWideNotCJKTNotEmoji = (x) => {
  return x === 8987 || x === 9001 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12771 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 19903 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
};
var ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
var CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
var CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/uy;
var TAB_RE = /\t{1,1000}/y;
var EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0061}-\u{E007A}]{2}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,3}\u{E007F}|(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})(?:\u200D(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F\u20E3?))*/uy;
var LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
var MODIFIER_RE = /\p{M}+/gu;
var NO_TRUNCATION$1 = {
  limit: Infinity,
  ellipsis: ""
};
var getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
  const LIMIT = truncationOptions.limit ?? Infinity;
  const ELLIPSIS = truncationOptions.ellipsis ?? "";
  const ELLIPSIS_WIDTH = truncationOptions?.ellipsisWidth ?? (ELLIPSIS ? getStringTruncatedWidth(ELLIPSIS, NO_TRUNCATION$1, widthOptions).width : 0);
  const ANSI_WIDTH = 0;
  const CONTROL_WIDTH = widthOptions.controlWidth ?? 0;
  const TAB_WIDTH = widthOptions.tabWidth ?? 8;
  const EMOJI_WIDTH = widthOptions.emojiWidth ?? 2;
  const FULL_WIDTH_WIDTH = 2;
  const REGULAR_WIDTH = widthOptions.regularWidth ?? 1;
  const WIDE_WIDTH = widthOptions.wideWidth ?? FULL_WIDTH_WIDTH;
  const PARSE_BLOCKS = [
    [LATIN_RE, REGULAR_WIDTH],
    [ANSI_RE, ANSI_WIDTH],
    [CONTROL_RE, CONTROL_WIDTH],
    [TAB_RE, TAB_WIDTH],
    [EMOJI_RE, EMOJI_WIDTH],
    [CJKT_WIDE_RE, WIDE_WIDTH]
  ];
  let indexPrev = 0;
  let index = 0;
  let length = input.length;
  let lengthExtra = 0;
  let truncationEnabled = false;
  let truncationIndex = length;
  let truncationLimit = Math.max(0, LIMIT - ELLIPSIS_WIDTH);
  let unmatchedStart = 0;
  let unmatchedEnd = 0;
  let width = 0;
  let widthExtra = 0;
  outer:
    while (true) {
      if (unmatchedEnd > unmatchedStart || index >= length && index > indexPrev) {
        const unmatched = input.slice(unmatchedStart, unmatchedEnd) || input.slice(indexPrev, index);
        lengthExtra = 0;
        for (const char of unmatched.replaceAll(MODIFIER_RE, "")) {
          const codePoint = char.codePointAt(0) || 0;
          if (isFullWidth(codePoint))
            widthExtra = FULL_WIDTH_WIDTH;
          else if (isWideNotCJKTNotEmoji(codePoint))
            widthExtra = WIDE_WIDTH;
          else
            widthExtra = REGULAR_WIDTH;
          if (width + widthExtra > truncationLimit)
            truncationIndex = Math.min(truncationIndex, Math.max(unmatchedStart, indexPrev) + lengthExtra);
          if (width + widthExtra > LIMIT) {
            truncationEnabled = true;
            break outer;
          }
          lengthExtra += char.length;
          width += widthExtra;
        }
        unmatchedStart = unmatchedEnd = 0;
      }
      if (index >= length)
        break outer;
      for (let i = 0, l2 = PARSE_BLOCKS.length;i < l2; i++) {
        const [BLOCK_RE, BLOCK_WIDTH] = PARSE_BLOCKS[i];
        BLOCK_RE.lastIndex = index;
        if (BLOCK_RE.test(input)) {
          lengthExtra = BLOCK_RE === CJKT_WIDE_RE ? getCodePointsLength(input.slice(index, BLOCK_RE.lastIndex)) : BLOCK_RE === EMOJI_RE ? 1 : BLOCK_RE.lastIndex - index;
          widthExtra = lengthExtra * BLOCK_WIDTH;
          if (width + widthExtra > truncationLimit)
            truncationIndex = Math.min(truncationIndex, index + Math.floor((truncationLimit - width) / BLOCK_WIDTH));
          if (width + widthExtra > LIMIT) {
            truncationEnabled = true;
            break outer;
          }
          width += widthExtra;
          unmatchedStart = indexPrev;
          unmatchedEnd = index;
          index = indexPrev = BLOCK_RE.lastIndex;
          continue outer;
        }
      }
      index += 1;
    }
  return {
    width: truncationEnabled ? truncationLimit : width,
    index: truncationEnabled ? truncationIndex : length,
    truncated: truncationEnabled,
    ellipsed: truncationEnabled && LIMIT >= ELLIPSIS_WIDTH
  };
};
var NO_TRUNCATION = {
  limit: Infinity,
  ellipsis: "",
  ellipsisWidth: 0
};
var fastStringWidth = (input, options = {}) => {
  return getStringTruncatedWidth(input, NO_TRUNCATION, options).width;
};
var ESC = "\x1B";
var CSI = "";
var END_CODE = 39;
var ANSI_ESCAPE_BELL = "\x07";
var ANSI_CSI = "[";
var ANSI_OSC = "]";
var ANSI_SGR_TERMINATOR = "m";
var ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
var GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
var getClosingCode = (openingCode) => {
  if (openingCode >= 30 && openingCode <= 37)
    return 39;
  if (openingCode >= 90 && openingCode <= 97)
    return 39;
  if (openingCode >= 40 && openingCode <= 47)
    return 49;
  if (openingCode >= 100 && openingCode <= 107)
    return 49;
  if (openingCode === 1 || openingCode === 2)
    return 22;
  if (openingCode === 3)
    return 23;
  if (openingCode === 4)
    return 24;
  if (openingCode === 7)
    return 27;
  if (openingCode === 8)
    return 28;
  if (openingCode === 9)
    return 29;
  if (openingCode === 0)
    return 0;
};
var wrapAnsiCode = (code) => `${ESC}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
var wrapAnsiHyperlink = (url) => `${ESC}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
var wrapWord = (rows, word, columns) => {
  const characters = word[Symbol.iterator]();
  let isInsideEscape = false;
  let isInsideLinkEscape = false;
  let lastRow = rows.at(-1);
  let visible = lastRow === undefined ? 0 : fastStringWidth(lastRow);
  let currentCharacter = characters.next();
  let nextCharacter = characters.next();
  let rawCharacterIndex = 0;
  while (!currentCharacter.done) {
    const character = currentCharacter.value;
    const characterLength = fastStringWidth(character);
    if (visible + characterLength <= columns)
      rows[rows.length - 1] += character;
    else {
      rows.push(character);
      visible = 0;
    }
    if (character === ESC || character === CSI) {
      isInsideEscape = true;
      isInsideLinkEscape = word.startsWith(ANSI_ESCAPE_LINK, rawCharacterIndex + 1);
    }
    if (isInsideEscape) {
      if (isInsideLinkEscape) {
        if (character === ANSI_ESCAPE_BELL) {
          isInsideEscape = false;
          isInsideLinkEscape = false;
        }
      } else if (character === ANSI_SGR_TERMINATOR)
        isInsideEscape = false;
    } else {
      visible += characterLength;
      if (visible === columns && !nextCharacter.done) {
        rows.push("");
        visible = 0;
      }
    }
    currentCharacter = nextCharacter;
    nextCharacter = characters.next();
    rawCharacterIndex += character.length;
  }
  lastRow = rows.at(-1);
  if (!visible && lastRow !== undefined && lastRow.length && rows.length > 1)
    rows[rows.length - 2] += rows.pop();
};
var stringVisibleTrimSpacesRight = (string) => {
  const words = string.split(" ");
  let last = words.length;
  while (last) {
    if (fastStringWidth(words[last - 1]))
      break;
    last--;
  }
  if (last === words.length)
    return string;
  return words.slice(0, last).join(" ") + words.slice(last).join("");
};
var exec = (string, columns, options = {}) => {
  if (options.trim !== false && string.trim() === "")
    return "";
  let returnValue = "";
  let escapeCode;
  let escapeUrl;
  const words = string.split(" ");
  let rows = [""];
  let rowLength = 0;
  for (let index = 0;index < words.length; index++) {
    const word = words[index];
    if (options.trim !== false) {
      const row = rows.at(-1) ?? "";
      const trimmed = row.trimStart();
      if (row.length !== trimmed.length) {
        rows[rows.length - 1] = trimmed;
        rowLength = fastStringWidth(trimmed);
      }
    }
    if (index !== 0) {
      if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
        rows.push("");
        rowLength = 0;
      }
      if (rowLength || options.trim === false) {
        rows[rows.length - 1] += " ";
        rowLength++;
      }
    }
    const wordLength = fastStringWidth(word);
    if (options.hard && wordLength > columns) {
      const remainingColumns = columns - rowLength;
      const breaksStartingThisLine = 1 + Math.floor((wordLength - remainingColumns - 1) / columns);
      if (Math.floor((wordLength - 1) / columns) < breaksStartingThisLine)
        rows.push("");
      wrapWord(rows, word, columns);
      rowLength = fastStringWidth(rows.at(-1) ?? "");
      continue;
    }
    if (rowLength + wordLength > columns && rowLength && wordLength) {
      if (options.wordWrap === false && rowLength < columns) {
        wrapWord(rows, word, columns);
        rowLength = fastStringWidth(rows.at(-1) ?? "");
        continue;
      }
      rows.push("");
      rowLength = 0;
    }
    if (rowLength + wordLength > columns && options.wordWrap === false) {
      wrapWord(rows, word, columns);
      rowLength = fastStringWidth(rows.at(-1) ?? "");
      continue;
    }
    rows[rows.length - 1] += word;
    rowLength += wordLength;
  }
  if (options.trim !== false)
    rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
  const preString = rows.join(`
`);
  let inSurrogate = false;
  for (let i = 0;i < preString.length; i++) {
    const character = preString[i];
    returnValue += character;
    if (!inSurrogate) {
      inSurrogate = character >= "\uD800" && character <= "\uDBFF";
      if (inSurrogate)
        continue;
    } else
      inSurrogate = false;
    if (character === ESC || character === CSI) {
      GROUP_REGEX.lastIndex = i + 1;
      const groups = GROUP_REGEX.exec(preString)?.groups;
      if (groups?.code !== undefined) {
        const code = Number.parseFloat(groups.code);
        escapeCode = code === END_CODE ? undefined : code;
      } else if (groups?.uri !== undefined)
        escapeUrl = groups.uri.length === 0 ? undefined : groups.uri;
    }
    if (preString[i + 1] === `
`) {
      if (escapeUrl)
        returnValue += wrapAnsiHyperlink("");
      const closingCode = escapeCode ? getClosingCode(escapeCode) : undefined;
      if (escapeCode && closingCode)
        returnValue += wrapAnsiCode(closingCode);
    } else if (character === `
`) {
      if (escapeCode && getClosingCode(escapeCode))
        returnValue += wrapAnsiCode(escapeCode);
      if (escapeUrl)
        returnValue += wrapAnsiHyperlink(escapeUrl);
    }
  }
  return returnValue;
};
var CRLF_OR_LF = /\r?\n/;
function wrapAnsi(string, columns, options) {
  return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join(`
`);
}
var require_src = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const ESC2 = "\x1B";
  const CSI2 = `${ESC2}[`;
  const beep = "\x07";
  const cursor = {
    to(x, y) {
      if (!y)
        return `${CSI2}${x + 1}G`;
      return `${CSI2}${y + 1};${x + 1}H`;
    },
    move(x, y) {
      let ret = "";
      if (x < 0)
        ret += `${CSI2}${-x}D`;
      else if (x > 0)
        ret += `${CSI2}${x}C`;
      if (y < 0)
        ret += `${CSI2}${-y}A`;
      else if (y > 0)
        ret += `${CSI2}${y}B`;
      return ret;
    },
    up: (count = 1) => `${CSI2}${count}A`,
    down: (count = 1) => `${CSI2}${count}B`,
    forward: (count = 1) => `${CSI2}${count}C`,
    backward: (count = 1) => `${CSI2}${count}D`,
    nextLine: (count = 1) => `${CSI2}E`.repeat(count),
    prevLine: (count = 1) => `${CSI2}F`.repeat(count),
    left: `${CSI2}G`,
    hide: `${CSI2}?25l`,
    show: `${CSI2}?25h`,
    save: `${ESC2}7`,
    restore: `${ESC2}8`
  };
  module.exports = {
    cursor,
    scroll: {
      up: (count = 1) => `${CSI2}S`.repeat(count),
      down: (count = 1) => `${CSI2}T`.repeat(count)
    },
    erase: {
      screen: `${CSI2}2J`,
      up: (count = 1) => `${CSI2}1J`.repeat(count),
      down: (count = 1) => `${CSI2}J`.repeat(count),
      line: `${CSI2}2K`,
      lineEnd: `${CSI2}K`,
      lineStart: `${CSI2}1K`,
      lines(count) {
        let clear = "";
        for (let i = 0;i < count; i++)
          clear += this.line + (i < count - 1 ? cursor.up() : "");
        if (count)
          clear += cursor.left;
        return clear;
      }
    },
    beep
  };
});
var import_src = require_src();
function findCursor(s, o, l2) {
  if (!l2.some((r) => !r.disabled))
    return s;
  const t = s + o, n = Math.max(l2.length - 1, 0), e = t < 0 ? n : t > n ? 0 : t;
  return l2[e]?.disabled ? findCursor(e, o < 0 ? -1 : 1, l2) : e;
}
var settings = {
  actions: /* @__PURE__ */ new Set([
    "up",
    "down",
    "left",
    "right",
    "space",
    "enter",
    "cancel"
  ]),
  aliases: /* @__PURE__ */ new Map([
    ["k", "up"],
    ["j", "down"],
    ["h", "left"],
    ["l", "right"],
    ["\x03", "cancel"],
    ["escape", "cancel"]
  ]),
  messages: {
    cancel: "Canceled",
    error: "Something went wrong"
  },
  withGuide: true,
  date: {
    monthNames: [...[
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ]],
    messages: {
      required: "Please enter a valid date",
      invalidMonth: "There are only 12 months in a year",
      invalidDay: (n, e) => `There are only ${n} days in ${e}`,
      afterMin: (n) => `Date must be on or after ${n.toISOString().slice(0, 10)}`,
      beforeMax: (n) => `Date must be on or before ${n.toISOString().slice(0, 10)}`
    }
  }
};
function isActionKey(n, e) {
  if (typeof n == "string")
    return settings.aliases.get(n) === e;
  for (const s of n)
    if (s !== undefined && isActionKey(s, e))
      return true;
  return false;
}
function diffLines(i, s) {
  if (i === s)
    return;
  const e = i.split(`
`), t = s.split(`
`), r = Math.max(e.length, t.length), f = [];
  for (let n = 0;n < r; n++)
    e[n] !== t[n] && f.push(n);
  return {
    lines: f,
    numLinesBefore: e.length,
    numLinesAfter: t.length,
    numLines: r
  };
}
var R = globalThis.process.platform.startsWith("win");
var CANCEL_SYMBOL = Symbol("clack:cancel");
function isCancel(e) {
  return e === CANCEL_SYMBOL;
}
function setRawMode(e, r) {
  const o = e;
  o.isTTY && o.setRawMode(r);
}
function block({ input: e = stdin, output: r = stdout, overwrite: o = true, hideCursor: t = true } = {}) {
  const s = l.createInterface({
    input: e,
    output: r,
    prompt: "",
    tabSize: 1
  });
  l.emitKeypressEvents(e, s), e instanceof ReadStream && e.isTTY && e.setRawMode(true);
  const n = (f, { name: a, sequence: p }) => {
    if (isActionKey([
      String(f),
      a,
      p
    ], "cancel")) {
      t && r.write(import_src.cursor.show), process.exit(0);
      return;
    }
    if (!o)
      return;
    const i = a === "return" ? 0 : -1, m = a === "return" ? -1 : 0;
    l.moveCursor(r, i, m, () => {
      l.clearLine(r, 1, () => {
        e.once("keypress", n);
      });
    });
  };
  return t && r.write(import_src.cursor.hide), e.once("keypress", n), () => {
    e.off("keypress", n), t && r.write(import_src.cursor.show), e instanceof ReadStream && e.isTTY && !R && e.setRawMode(false), s.terminal = false, s.close();
  };
}
var getColumns = (e) => ("columns" in e) && typeof e.columns == "number" ? e.columns : 80;
var getRows = (e) => ("rows" in e) && typeof e.rows == "number" ? e.rows : 20;
function wrapTextWithPrefix(e, r, o, t = o, s = o, n) {
  return wrapAnsi(r, getColumns(e ?? stdout) - o.length, {
    hard: true,
    trim: false
  }).split(`
`).map((c, i, m) => {
    const d = n ? n(c, i) : c;
    return i === 0 ? `${t}${d}` : i === m.length - 1 ? `${s}${d}` : `${o}${d}`;
  }).join(`
`);
}
function runValidation(e, n) {
  if ("~standard" in e) {
    const a = e["~standard"].validate(n);
    if (a instanceof Promise)
      throw new TypeError("Schema validation must be synchronous. Update `validate()` and remove any asynchronous logic.");
    return a.issues?.at(0)?.message;
  }
  return e(n);
}
var V = class {
  input;
  output;
  _abortSignal;
  rl;
  opts;
  _render;
  _track = false;
  _prevFrame = "";
  _subscribers = /* @__PURE__ */ new Map;
  _cursor = 0;
  state = "initial";
  error = "";
  value;
  userInput = "";
  constructor(t, e = true) {
    const { input: i = stdin, output: n = stdout, render: s, signal: r, ...o } = t;
    this.opts = o, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = s.bind(this), this._track = e, this._abortSignal = r, this.input = i, this.output = n;
  }
  unsubscribe() {
    this._subscribers.clear();
  }
  setSubscriber(t, e) {
    const i = this._subscribers.get(t) ?? [];
    i.push(e), this._subscribers.set(t, i);
  }
  on(t, e) {
    this.setSubscriber(t, { cb: e });
  }
  once(t, e) {
    this.setSubscriber(t, {
      cb: e,
      once: true
    });
  }
  emit(t, ...e) {
    const i = this._subscribers.get(t) ?? [], n = [];
    for (const s of i)
      s.cb(...e), s.once && n.push(() => i.splice(i.indexOf(s), 1));
    for (const s of n)
      s();
  }
  prompt() {
    return new Promise((t) => {
      if (this._abortSignal) {
        if (this._abortSignal.aborted)
          return this.state = "cancel", this.close(), t(CANCEL_SYMBOL);
        this._abortSignal.addEventListener("abort", () => {
          this.state = "cancel", this.close();
        }, { once: true });
      }
      this.rl = l__default.createInterface({
        input: this.input,
        tabSize: 2,
        prompt: "",
        escapeCodeTimeout: 50,
        terminal: true
      }), this.rl.prompt(), this.opts.initialUserInput !== undefined && this._setUserInput(this.opts.initialUserInput, true), this.input.on("keypress", this.onKeypress), setRawMode(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
        this.output.write(import_src.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t(this.value);
      }), this.once("cancel", () => {
        this.output.write(import_src.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t(CANCEL_SYMBOL);
      });
    });
  }
  _isActionKey(t, e) {
    return t === "\t";
  }
  _shouldSubmit(t, e) {
    return true;
  }
  _setValue(t) {
    this.value = t, this.emit("value", this.value);
  }
  _setUserInput(t, e) {
    this.userInput = t ?? "", this.emit("userInput", this.userInput), e && this._track && this.rl && (this.rl.write(this.userInput), this._cursor = this.rl.cursor);
  }
  _clearUserInput() {
    this.rl?.write(null, {
      ctrl: true,
      name: "u"
    }), this._setUserInput("");
  }
  onKeypress(t, e) {
    if (this._track && e.name !== "return" && (e.name && this._isActionKey(t, e) && this.rl?.write(null, {
      ctrl: true,
      name: "h"
    }), this._cursor = this.rl?.cursor ?? 0, this._setUserInput(this.rl?.line)), this.state === "error" && (this.state = "active"), e?.name && (!this._track && settings.aliases.has(e.name) && this.emit("cursor", settings.aliases.get(e.name)), settings.actions.has(e.name) && this.emit("cursor", e.name)), t && (t.toLowerCase() === "y" || t.toLowerCase() === "n") && this.emit("confirm", t.toLowerCase() === "y"), this.emit("key", t, e), e?.name === "return" && this._shouldSubmit(t, e)) {
      if (this.opts.validate) {
        const i = runValidation(this.opts.validate, this.value);
        i && (this.error = i instanceof Error ? i.message : i, this.state = "error", this.rl?.write(this.userInput));
      }
      this.state !== "error" && (this.state = "submit");
    }
    isActionKey([
      t,
      e?.name,
      e?.sequence
    ], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
  }
  close() {
    this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), setRawMode(this.input, false), this.rl?.close(), this.rl = undefined, this.emit(`${this.state}`, this.value), this.unsubscribe();
  }
  restoreCursor() {
    const t = wrapAnsi(this._prevFrame, process.stdout.columns, {
      hard: true,
      trim: false
    }).split(`
`).length - 1;
    this.output.write(import_src.cursor.move(-999, t * -1));
  }
  render() {
    const t = wrapAnsi(this._render(this) ?? "", process.stdout.columns, {
      hard: true,
      trim: false
    });
    if (t !== this._prevFrame) {
      if (this.state === "initial")
        this.output.write(import_src.cursor.hide);
      else {
        const e = diffLines(this._prevFrame, t), i = getRows(this.output);
        if (this.restoreCursor(), e) {
          const n = Math.max(0, e.numLinesAfter - i), s = Math.max(0, e.numLinesBefore - i);
          let r = e.lines.find((o) => o >= n);
          if (r === undefined) {
            this._prevFrame = t;
            return;
          }
          if (e.lines.length === 1) {
            this.output.write(import_src.cursor.move(0, r - s)), this.output.write(import_src.erase.lines(1));
            const o = t.split(`
`);
            this.output.write(o[r]), this._prevFrame = t, this.output.write(import_src.cursor.move(0, o.length - r - 1));
            return;
          } else if (e.lines.length > 1) {
            if (n < s)
              r = n;
            else {
              const h = r - s;
              h > 0 && this.output.write(import_src.cursor.move(0, h));
            }
            this.output.write(import_src.erase.down());
            const f = t.split(`
`).slice(r);
            this.output.write(f.join(`
`)), this._prevFrame = t;
            return;
          }
        }
        this.output.write(import_src.erase.down());
      }
      this.output.write(t), this.state === "initial" && (this.state = "active"), this._prevFrame = t;
    }
  }
};
var r = class extends V {
  get cursor() {
    return this.value ? 0 : 1;
  }
  get _value() {
    return this.cursor === 0;
  }
  constructor(t) {
    super(t, false), this.value = !!t.initialValue, this.on("userInput", () => {
      this.value = this._value;
    }), this.on("confirm", (i) => {
      this.output.write(import_src.cursor.move(0, -1)), this.value = i, this.state = "submit", this.close();
    }), this.on("cursor", () => {
      this.value = !this.value;
    });
  }
};
var a = class extends V {
  options;
  cursor = 0;
  get _value() {
    return this.options[this.cursor]?.value;
  }
  get _enabledOptions() {
    return this.options.filter((e) => e.disabled !== true);
  }
  toggleAll() {
    const e = this._enabledOptions, i = this.value !== undefined && this.value.length === e.length;
    this.value = i ? [] : e.map((t) => t.value);
  }
  toggleInvert() {
    const e = this.value;
    if (!e)
      return;
    const i = this._enabledOptions.filter((t) => !e.includes(t.value));
    this.value = i.map((t) => t.value);
  }
  toggleValue() {
    this.value === undefined && (this.value = []);
    const e = this.value.includes(this._value);
    this.value = e ? this.value.filter((i) => i !== this._value) : [...this.value, this._value];
  }
  constructor(e) {
    super(e, false), this.options = e.options, this.value = [...e.initialValues ?? []];
    const i = Math.max(this.options.findIndex(({ value: t }) => t === e.cursorAt), 0);
    this.cursor = this.options[i]?.disabled ? findCursor(i, 1, this.options) : i, this.on("key", (t, l2) => {
      l2.name === "a" && this.toggleAll(), l2.name === "i" && this.toggleInvert();
    }), this.on("cursor", (t) => {
      switch (t) {
        case "left":
        case "up":
          this.cursor = findCursor(this.cursor, -1, this.options);
          break;
        case "down":
        case "right":
          this.cursor = findCursor(this.cursor, 1, this.options);
          break;
        case "space":
          this.toggleValue();
          break;
      }
    });
  }
};
var n$1 = class n extends V {
  options;
  cursor = 0;
  get _selectedValue() {
    return this.options[this.cursor];
  }
  changeValue() {
    const e = this._selectedValue;
    this.value = e === undefined ? undefined : e.value;
  }
  constructor(e) {
    super(e, false), this.options = e.options;
    const o = this.options.findIndex(({ value: s }) => s === e.initialValue), t = o === -1 ? 0 : o;
    this.cursor = this.options[t]?.disabled ? findCursor(t, 1, this.options) : t, this.changeValue(), this.on("cursor", (s) => {
      switch (s) {
        case "left":
        case "up":
          this.cursor = findCursor(this.cursor, -1, this.options);
          break;
        case "down":
        case "right":
          this.cursor = findCursor(this.cursor, 1, this.options);
          break;
      }
      this.changeValue();
    });
  }
};

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/@clack/prompts.mjs
import { styleText } from "node:util";
import process$1 from "node:process";
var import_src2 = require_src();
function isUnicodeSupported() {
  if (process$1.platform !== "win32")
    return process$1.env.TERM !== "linux";
  return Boolean(process$1.env.CI) || Boolean(process$1.env.WT_SESSION) || Boolean(process$1.env.TERMINUS_SUBLIME) || process$1.env.ConEmuTask === "{cmd::Cmder}" || process$1.env.TERM_PROGRAM === "Terminus-Sublime" || process$1.env.TERM_PROGRAM === "vscode" || process$1.env.TERM === "xterm-256color" || process$1.env.TERM === "alacritty" || process$1.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var unicode = isUnicodeSupported();
var isCI = () => process.env.CI === "true";
var unicodeOr = (o, e) => unicode ? o : e;
var S_STEP_ACTIVE = unicodeOr("◆", "*");
var S_STEP_CANCEL = unicodeOr("■", "x");
var S_STEP_ERROR = unicodeOr("▲", "x");
var S_STEP_SUBMIT = unicodeOr("◇", "o");
var S_BAR_START = unicodeOr("┌", "T");
var S_BAR = unicodeOr("│", "|");
var S_BAR_END = unicodeOr("└", "—");
var S_RADIO_ACTIVE = unicodeOr("●", ">");
var S_RADIO_INACTIVE = unicodeOr("○", " ");
var S_CHECKBOX_ACTIVE = unicodeOr("◻", "[•]");
var S_CHECKBOX_SELECTED = unicodeOr("◼", "[+]");
var S_CHECKBOX_INACTIVE = unicodeOr("◻", "[ ]");
var S_BAR_H = unicodeOr("─", "-");
var S_CORNER_TOP_RIGHT = unicodeOr("╮", "+");
var S_CONNECT_LEFT = unicodeOr("├", "+");
var S_CORNER_BOTTOM_RIGHT = unicodeOr("╯", "+");
var S_CORNER_BOTTOM_LEFT = unicodeOr("╰", "+");
var S_INFO = unicodeOr("●", "•");
var S_SUCCESS = unicodeOr("◆", "*");
var S_WARN = unicodeOr("▲", "!");
var S_ERROR = unicodeOr("■", "x");
var symbol = (o) => {
  switch (o) {
    case "initial":
    case "active":
      return styleText("cyan", S_STEP_ACTIVE);
    case "cancel":
      return styleText("red", S_STEP_CANCEL);
    case "error":
      return styleText("yellow", S_STEP_ERROR);
    case "submit":
      return styleText("green", S_STEP_SUBMIT);
  }
};
var symbolBar = (o) => {
  switch (o) {
    case "initial":
    case "active":
      return styleText("cyan", S_BAR);
    case "cancel":
      return styleText("red", S_BAR);
    case "error":
      return styleText("yellow", S_BAR);
    case "submit":
      return styleText("green", S_BAR);
  }
};
function formatInstructionFooter(o, e) {
  const r2 = [`${e ? `${styleText("cyan", S_BAR)}  ` : ""}${o.join(" • ")}`];
  return e && r2.push(styleText("cyan", S_BAR_END)), r2;
}
var I = (l2, e, w, p, b, C = false) => {
  let r2 = e, O = 0;
  if (C)
    for (let i = p - 1;i >= w; i--) {
      const m = l2[i];
      if (m && (r2 -= m.length), O++, r2 <= b)
        break;
    }
  else
    for (let i = w;i < p; i++) {
      const m = l2[i];
      if (m && (r2 -= m.length), O++, r2 <= b)
        break;
    }
  return {
    lineCount: r2,
    removals: O
  };
};
var limitOptions = ({ cursor: l2, options: e, style: w, output: p = process.stdout, maxItems: b = Number.POSITIVE_INFINITY, columnPadding: C = 0, rowPadding: r2 = 4 }) => {
  const i = getColumns(p) - C, m = getRows(p), M = styleText("dim", "..."), v = Math.max(m - r2, 0), a2 = Math.max(Math.min(b, v), 5);
  let f = 0;
  l2 >= a2 - 3 && (f = Math.max(Math.min(l2 - a2 + 3, e.length - a2), 0));
  let d = a2 < e.length && f > 0, c = a2 < e.length && f + a2 < e.length;
  const W = Math.min(f + a2, e.length), s = [];
  let g = 0;
  d && g++, c && g++;
  const T = f + (d ? 1 : 0), y = W - (c ? 1 : 0);
  for (let t = T;t < y; t++) {
    const n2 = e[t], h = wrapAnsi(n2 ? w(n2, t === l2) : "", i, {
      hard: true,
      trim: false
    }).split(`
`);
    s.push(h), g += h.length;
  }
  if (g > v) {
    let t = 0, n2 = 0, o = g;
    const h = l2 - T;
    let u = v;
    const L = () => I(s, o, 0, h, u), E = () => I(s, o, h + 1, s.length, u, true);
    d ? ({ lineCount: o, removals: t } = L(), o > u && (c || (u -= 1), { lineCount: o, removals: n2 } = E())) : (c || (u -= 1), { lineCount: o, removals: n2 } = E(), o > u && (u -= 1, { lineCount: o, removals: t } = L())), t > 0 && (d = true, s.splice(0, t)), n2 > 0 && (c = true, s.splice(s.length - n2, n2));
  }
  const x = [];
  d && x.push(M);
  for (const t of s)
    for (const n2 of t)
      x.push(n2);
  return c && x.push(M), x;
};
var confirm = (i) => {
  const a2 = i.active ?? "Yes", s = i.inactive ?? "No";
  return new r({
    active: a2,
    inactive: s,
    signal: i.signal,
    input: i.input,
    output: i.output,
    initialValue: i.initialValue ?? true,
    render() {
      const e = i.withGuide ?? settings.withGuide, u = `${symbol(this.state)}  `, l2 = e ? `${styleText("gray", S_BAR)}  ` : "", f = wrapTextWithPrefix(i.output, i.message, l2, u), o = `${e ? `${styleText("gray", S_BAR)}
` : ""}${f}
`, c = this.value ? a2 : s;
      switch (this.state) {
        case "submit":
          return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${styleText("dim", c)}`;
        case "cancel":
          return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${styleText(["strikethrough", "dim"], c)}${e ? `
${styleText("gray", S_BAR)}` : ""}`;
        default: {
          const r2 = e ? `${styleText("cyan", S_BAR)}  ` : "", g = e ? styleText("cyan", S_BAR_END) : "";
          return `${o}${r2}${this.value ? `${styleText("green", S_RADIO_ACTIVE)} ${a2}` : `${styleText("dim", S_RADIO_INACTIVE)} ${styleText("dim", a2)}`}${i.vertical ? e ? `
${styleText("cyan", S_BAR)}  ` : `
` : ` ${styleText("dim", "/")} `}${this.value ? `${styleText("dim", S_RADIO_INACTIVE)} ${styleText("dim", s)}` : `${styleText("green", S_RADIO_ACTIVE)} ${s}`}
${g}
`;
        }
      }
    }
  }).prompt();
};
var MULTISELECT_INSTRUCTIONS = [
  `${styleText("dim", "↑/↓")} to navigate`,
  `${styleText("dim", "Space:")} select`,
  `${styleText("dim", "Enter:")} confirm`
];
var m = (i, u) => i.split(`
`).map((d) => u(d)).join(`
`);
var multiselect = (i) => {
  const u = (t, a2) => {
    const r2 = t.label ?? String(t.value);
    return a2 === "disabled" ? `${styleText("gray", S_CHECKBOX_INACTIVE)} ${m(r2, (o) => styleText(["strikethrough", "gray"], o))}${t.hint ? ` ${styleText("dim", `(${t.hint ?? "disabled"})`)}` : ""}` : a2 === "active" ? `${styleText("cyan", S_CHECKBOX_ACTIVE)} ${r2}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a2 === "selected" ? `${styleText("green", S_CHECKBOX_SELECTED)} ${m(r2, (o) => styleText("dim", o))}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a2 === "cancelled" ? `${m(r2, (o) => styleText(["strikethrough", "dim"], o))}` : a2 === "active-selected" ? `${styleText("green", S_CHECKBOX_SELECTED)} ${r2}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a2 === "submitted" ? `${m(r2, (o) => styleText("dim", o))}` : `${styleText("dim", S_CHECKBOX_INACTIVE)} ${m(r2, (o) => styleText("dim", o))}`;
  }, d = i.required ?? true, v = i.showInstructions ?? true;
  return new a({
    options: i.options,
    signal: i.signal,
    input: i.input,
    output: i.output,
    initialValues: i.initialValues,
    required: d,
    cursorAt: i.cursorAt,
    validate(t) {
      if (d && (t === undefined || t.length === 0))
        return `Please select at least one option.
${styleText("reset", styleText("dim", `Press ${styleText([
          "gray",
          "bgWhite",
          "inverse"
        ], " space ")} to select, ${styleText("gray", styleText("bgWhite", styleText("inverse", " enter ")))} to submit`))}`;
    },
    render() {
      const t = i.withGuide ?? settings.withGuide, a2 = wrapTextWithPrefix(i.output, i.message, t ? `${symbolBar(this.state)}  ` : "", `${symbol(this.state)}  `), r2 = `${t ? `${styleText("gray", S_BAR)}
` : ""}${a2}
`, o = this.value ?? [], p = (n2, l2) => {
        if (n2.disabled)
          return u(n2, "disabled");
        const s = o.includes(n2.value);
        return l2 && s ? u(n2, "active-selected") : s ? u(n2, "selected") : u(n2, l2 ? "active" : "inactive");
      };
      switch (this.state) {
        case "submit": {
          const n2 = this.options.filter(({ value: s }) => o.includes(s)).map((s) => u(s, "submitted")).join(styleText("dim", ", ")) || styleText("dim", "none");
          return `${r2}${wrapTextWithPrefix(i.output, n2, t ? `${styleText("gray", S_BAR)}  ` : "")}`;
        }
        case "cancel": {
          const n2 = this.options.filter(({ value: s }) => o.includes(s)).map((s) => u(s, "cancelled")).join(styleText("dim", ", "));
          if (n2.trim() === "")
            return `${r2}${styleText("gray", S_BAR)}`;
          return `${r2}${wrapTextWithPrefix(i.output, n2, t ? `${styleText("gray", S_BAR)}  ` : "")}${t ? `
${styleText("gray", S_BAR)}` : ""}`;
        }
        case "error": {
          const n2 = t ? `${styleText("yellow", S_BAR)}  ` : "", l2 = this.error.split(`
`).map(($, C) => C === 0 ? `${t ? `${styleText("yellow", S_BAR_END)}  ` : ""}${styleText("yellow", $)}` : `   ${$}`).join(`
`), s = r2.split(`
`).length, h = l2.split(`
`).length + 1;
          return `${r2}${n2}${limitOptions({
            output: i.output,
            options: this.options,
            cursor: this.cursor,
            maxItems: i.maxItems,
            columnPadding: n2.length,
            rowPadding: s + h,
            style: p
          }).join(`
${n2}`)}
${l2}
`;
        }
        default: {
          const n2 = t ? `${styleText("cyan", S_BAR)}  ` : "", l2 = r2.split(`
`).length, s = v ? formatInstructionFooter(MULTISELECT_INSTRUCTIONS, t) : t ? [styleText("cyan", S_BAR_END)] : [], h = s.join(`
`), $ = s.length + 1;
          return `${r2}${n2}${limitOptions({
            output: i.output,
            options: this.options,
            cursor: this.cursor,
            maxItems: i.maxItems,
            columnPadding: n2.length,
            rowPadding: l2 + $,
            style: p
          }).join(`
${n2}`)}
${h}
`;
        }
      }
    }
  }).prompt();
};
var log = {
  message: (s = [], { symbol: e = styleText("gray", S_BAR), secondarySymbol: r2 = styleText("gray", S_BAR), output: m2 = process.stdout, spacing: l2 = 1, withGuide: c } = {}) => {
    const t = [], o = c ?? settings.withGuide, f = o ? r2 : "", O = o ? `${e}  ` : "", u = o ? `${r2}  ` : "";
    for (let i = 0;i < l2; i++)
      t.push(f);
    const g = Array.isArray(s) ? s : s.split(`
`);
    if (g.length > 0) {
      const [i, ...y] = g;
      i.length > 0 ? t.push(`${O}${i}`) : t.push(o ? e : "");
      for (const p of y)
        p.length > 0 ? t.push(`${u}${p}`) : t.push(o ? r2 : "");
    }
    m2.write(`${t.join(`
`)}
`);
  },
  info: (s, e) => {
    log.message(s, {
      ...e,
      symbol: styleText("blue", S_INFO)
    });
  },
  success: (s, e) => {
    log.message(s, {
      ...e,
      symbol: styleText("green", S_SUCCESS)
    });
  },
  step: (s, e) => {
    log.message(s, {
      ...e,
      symbol: styleText("green", S_STEP_SUBMIT)
    });
  },
  warn: (s, e) => {
    log.message(s, {
      ...e,
      symbol: styleText("yellow", S_WARN)
    });
  },
  warning: (s, e) => {
    log.warn(s, e);
  },
  error: (s, e) => {
    log.message(s, {
      ...e,
      symbol: styleText("red", S_ERROR)
    });
  }
};
var cancel = (o = "", t) => {
  const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR_END)}  ` : "";
  i.write(`${e}${styleText("red", o)}

`);
};
var intro = (o = "", t) => {
  const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR_START)}  ` : "";
  i.write(`${e}${o}
`);
};
var outro = (o = "", t) => {
  const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR)}
${styleText("gray", S_BAR_END)}  ` : "";
  i.write(`${e}${o}

`);
};
var W$1 = (o) => o;
var C = (o, e, s) => {
  const a2 = {
    hard: true,
    trim: false
  }, i = wrapAnsi(o, e, a2).split(`
`), c = i.reduce((n2, t) => Math.max(fastStringWidth(t), n2), 0);
  return wrapAnsi(o, e - (i.map(s).reduce((n2, t) => Math.max(fastStringWidth(t), n2), 0) - c), a2);
};
var note = (o = "", e = "", s) => {
  const a2 = s?.output ?? process$1.stdout, i = s?.withGuide ?? settings.withGuide, c = s?.format ?? W$1, g = [
    "",
    ...C(o, getColumns(a2) - 6, c).split(`
`).map(c),
    ""
  ], n2 = fastStringWidth(e), t = Math.max(g.reduce((m2, F) => {
    const O = fastStringWidth(F);
    return O > m2 ? O : m2;
  }, 0), n2) + 2, h = g.map((m2) => `${styleText("gray", S_BAR)}  ${m2}${" ".repeat(t - fastStringWidth(m2))}${styleText("gray", S_BAR)}`).join(`
`), T = i ? `${styleText("gray", S_BAR)}
` : "", l$1 = i ? S_CONNECT_LEFT : S_CORNER_BOTTOM_LEFT;
  a2.write(`${T}${styleText("green", S_STEP_SUBMIT)}  ${styleText("reset", e)} ${styleText("gray", S_BAR_H.repeat(Math.max(t - n2 - 1, 1)) + S_CORNER_TOP_RIGHT)}
${h}
${styleText("gray", l$1 + S_BAR_H.repeat(t + 2) + S_CORNER_BOTTOM_RIGHT)}
`);
};
var W = (l2) => styleText("magenta", l2);
var spinner = ({ indicator: l2 = "dots", onCancel: h, output: n2 = process.stdout, cancelMessage: G, errorMessage: O, frames: E = unicode ? [
  "◒",
  "◐",
  "◓",
  "◑"
] : [
  "•",
  "o",
  "O",
  "0"
], delay: F = unicode ? 80 : 120, signal: m2, ...I2 } = {}) => {
  const u = isCI();
  let M, T, d = false, S = false, s = "", p, w = performance.now();
  const x = getColumns(n2), k = I2?.styleFrame ?? W, g = (e) => {
    const r2 = e > 1 ? O ?? settings.messages.error : G ?? settings.messages.cancel;
    S = e === 1, d && (a2(r2, e), S && typeof h == "function" && h());
  }, f = () => g(2), i = () => g(1), A = () => {
    process.on("uncaughtExceptionMonitor", f), process.on("unhandledRejection", f), process.on("SIGINT", i), process.on("SIGTERM", i), process.on("exit", g), m2 && m2.addEventListener("abort", i);
  }, H = () => {
    process.removeListener("uncaughtExceptionMonitor", f), process.removeListener("unhandledRejection", f), process.removeListener("SIGINT", i), process.removeListener("SIGTERM", i), process.removeListener("exit", g), m2 && m2.removeEventListener("abort", i);
  }, y = () => {
    if (p === undefined)
      return;
    u && n2.write(`
`);
    const r2 = wrapAnsi(p, x, {
      hard: true,
      trim: false
    }).split(`
`);
    r2.length > 1 && n2.write(import_src2.cursor.up(r2.length - 1)), n2.write(import_src2.cursor.to(0)), n2.write(import_src2.erase.down());
  }, C2 = (e) => e.replace(/\.+$/, ""), _ = (e) => {
    const r2 = (performance.now() - e) / 1000, t = Math.floor(r2 / 60), o = Math.floor(r2 % 60);
    return t > 0 ? `[${t}m ${o}s]` : `[${o}s]`;
  }, N = I2.withGuide ?? settings.withGuide, P = (e = "") => {
    d = true, M = block({ output: n2 }), s = C2(e), w = performance.now(), N && n2.write(`${styleText("gray", S_BAR)}
`);
    let r2 = 0, t = 0;
    A(), T = setInterval(() => {
      if (u && s === p)
        return;
      y(), p = s;
      const o = k(E[r2]);
      let v;
      if (u)
        v = `${o}  ${s}...`;
      else if (l2 === "timer")
        v = `${o}  ${s} ${_(w)}`;
      else {
        const B = ".".repeat(Math.floor(t)).slice(0, 3);
        v = `${o}  ${s}${B}`;
      }
      const j = wrapAnsi(v, x, {
        hard: true,
        trim: false
      });
      n2.write(j), r2 = r2 + 1 < E.length ? r2 + 1 : 0, t = t < 4 ? t + 0.125 : 0;
    }, F);
  }, a2 = (e = "", r2 = 0, t = false) => {
    if (!d)
      return;
    d = false, clearInterval(T), y();
    const o = r2 === 0 ? styleText("green", S_STEP_SUBMIT) : r2 === 1 ? styleText("red", S_STEP_CANCEL) : styleText("red", S_STEP_ERROR);
    s = e ?? s, t || (l2 === "timer" ? n2.write(`${o}  ${s} ${_(w)}
`) : n2.write(`${o}  ${s}
`)), H(), M();
  };
  return {
    start: P,
    stop: (e = "") => a2(e, 0),
    message: (e = "") => {
      s = C2(e ?? s);
    },
    cancel: (e = "") => a2(e, 1),
    error: (e = "") => a2(e, 2),
    clear: () => a2("", 0, true),
    get isCancelled() {
      return S;
    }
  };
};
var SELECT_INSTRUCTIONS = [`${styleText("dim", "↑/↓")} to navigate`, `${styleText("dim", "Enter:")} confirm`];
var c = (t, o) => t.includes(`
`) ? t.split(`
`).map((d) => o(d)).join(`
`) : o(t);
var select = (t) => {
  const o = (n2, m2) => {
    if (n2 === undefined)
      return "";
    const s = n2.label ?? String(n2.value);
    switch (m2) {
      case "disabled":
        return `${styleText("gray", S_RADIO_INACTIVE)} ${c(s, (i) => styleText("gray", i))}${n2.hint ? ` ${styleText("dim", `(${n2.hint ?? "disabled"})`)}` : ""}`;
      case "selected":
        return `${c(s, (i) => styleText("dim", i))}`;
      case "active":
        return `${styleText("green", S_RADIO_ACTIVE)} ${s}${n2.hint ? ` ${styleText("dim", `(${n2.hint})`)}` : ""}`;
      case "cancelled":
        return `${c(s, (i) => styleText(["strikethrough", "dim"], i))}`;
      default:
        return `${styleText("dim", S_RADIO_INACTIVE)} ${c(s, (i) => styleText("dim", i))}`;
    }
  }, d = t.showInstructions ?? true;
  return new n$1({
    options: t.options,
    signal: t.signal,
    input: t.input,
    output: t.output,
    initialValue: t.initialValue,
    render() {
      const n2 = t.withGuide ?? settings.withGuide, m2 = `${symbol(this.state)}  `, s = `${symbolBar(this.state)}  `, i = wrapTextWithPrefix(t.output, t.message, s, m2), u = `${n2 ? `${styleText("gray", S_BAR)}
` : ""}${i}
`;
      switch (this.state) {
        case "submit": {
          const r2 = n2 ? `${styleText("gray", S_BAR)}  ` : "";
          return `${u}${wrapTextWithPrefix(t.output, o(this.options[this.cursor], "selected"), r2)}`;
        }
        case "cancel": {
          const r2 = n2 ? `${styleText("gray", S_BAR)}  ` : "";
          return `${u}${wrapTextWithPrefix(t.output, o(this.options[this.cursor], "cancelled"), r2)}${n2 ? `
${styleText("gray", S_BAR)}` : ""}`;
        }
        default: {
          const r2 = n2 ? `${styleText("cyan", S_BAR)}  ` : "", a2 = u.split(`
`).length, p = d ? formatInstructionFooter(SELECT_INSTRUCTIONS, n2) : n2 ? [styleText("cyan", S_BAR_END)] : [], b = p.join(`
`), f = p.length + 1;
          return `${u}${r2}${limitOptions({
            output: t.output,
            cursor: this.cursor,
            options: this.options,
            maxItems: t.maxItems,
            columnPadding: r2.length,
            rowPadding: a2 + f,
            style: (g, x) => o(g, g.disabled ? "disabled" : x ? "active" : "inactive")
          }).join(`
${r2}`)}
${b}
`;
        }
      }
    }
  }).prompt();
};
`${styleText("gray", S_BAR)}`;

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/picocolors.mjs
var require_picocolors = /* @__PURE__ */ __commonJSMin((exports, module) => {
  let p = process || {};
  let argv = p.argv || [];
  let env = p.env || {};
  let isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
  let formatter = (open, close, replace = open) => (input) => {
    let string = "" + input, index = string.indexOf(close, open.length);
    return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
  };
  let replaceClose = (string, close, replace, index) => {
    let result = "", cursor = 0;
    do {
      result += string.substring(cursor, index) + replace;
      cursor = index + close.length;
      index = string.indexOf(close, cursor);
    } while (~index);
    return result + string.substring(cursor);
  };
  let createColors = (enabled = isColorSupported) => {
    let f = enabled ? formatter : () => String;
    return {
      isColorSupported: enabled,
      reset: f("\x1B[0m", "\x1B[0m"),
      bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: f("\x1B[3m", "\x1B[23m"),
      underline: f("\x1B[4m", "\x1B[24m"),
      inverse: f("\x1B[7m", "\x1B[27m"),
      hidden: f("\x1B[8m", "\x1B[28m"),
      strikethrough: f("\x1B[9m", "\x1B[29m"),
      black: f("\x1B[30m", "\x1B[39m"),
      red: f("\x1B[31m", "\x1B[39m"),
      green: f("\x1B[32m", "\x1B[39m"),
      yellow: f("\x1B[33m", "\x1B[39m"),
      blue: f("\x1B[34m", "\x1B[39m"),
      magenta: f("\x1B[35m", "\x1B[39m"),
      cyan: f("\x1B[36m", "\x1B[39m"),
      white: f("\x1B[37m", "\x1B[39m"),
      gray: f("\x1B[90m", "\x1B[39m"),
      bgBlack: f("\x1B[40m", "\x1B[49m"),
      bgRed: f("\x1B[41m", "\x1B[49m"),
      bgGreen: f("\x1B[42m", "\x1B[49m"),
      bgYellow: f("\x1B[43m", "\x1B[49m"),
      bgBlue: f("\x1B[44m", "\x1B[49m"),
      bgMagenta: f("\x1B[45m", "\x1B[49m"),
      bgCyan: f("\x1B[46m", "\x1B[49m"),
      bgWhite: f("\x1B[47m", "\x1B[49m"),
      blackBright: f("\x1B[90m", "\x1B[39m"),
      redBright: f("\x1B[91m", "\x1B[39m"),
      greenBright: f("\x1B[92m", "\x1B[39m"),
      yellowBright: f("\x1B[93m", "\x1B[39m"),
      blueBright: f("\x1B[94m", "\x1B[39m"),
      magentaBright: f("\x1B[95m", "\x1B[39m"),
      cyanBright: f("\x1B[96m", "\x1B[39m"),
      whiteBright: f("\x1B[97m", "\x1B[39m"),
      bgBlackBright: f("\x1B[100m", "\x1B[49m"),
      bgRedBright: f("\x1B[101m", "\x1B[49m"),
      bgGreenBright: f("\x1B[102m", "\x1B[49m"),
      bgYellowBright: f("\x1B[103m", "\x1B[49m"),
      bgBlueBright: f("\x1B[104m", "\x1B[49m"),
      bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
      bgCyanBright: f("\x1B[106m", "\x1B[49m"),
      bgWhiteBright: f("\x1B[107m", "\x1B[49m")
    };
  };
  module.exports = createColors();
  module.exports.createColors = createColors;
});

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/@kwsites/file-exists.mjs
var require_ms = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var s = 1000;
  var m2 = s * 60;
  var h = m2 * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  module.exports = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0)
      return parse(val);
    else if (type === "number" && isFinite(val))
      return options.long ? fmtLong(val) : fmtShort(val);
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100)
      return;
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
    if (!match)
      return;
    var n2 = parseFloat(match[1]);
    switch ((match[2] || "ms").toLowerCase()) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n2 * y;
      case "weeks":
      case "week":
      case "w":
        return n2 * w;
      case "days":
      case "day":
      case "d":
        return n2 * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n2 * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n2 * m2;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n2 * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n2;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d)
      return Math.round(ms / d) + "d";
    if (msAbs >= h)
      return Math.round(ms / h) + "h";
    if (msAbs >= m2)
      return Math.round(ms / m2) + "m";
    if (msAbs >= s)
      return Math.round(ms / s) + "s";
    return ms + "ms";
  }
  function fmtLong(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d)
      return plural(ms, msAbs, d, "day");
    if (msAbs >= h)
      return plural(ms, msAbs, h, "hour");
    if (msAbs >= m2)
      return plural(ms, msAbs, m2, "minute");
    if (msAbs >= s)
      return plural(ms, msAbs, s, "second");
    return ms + " ms";
  }
  function plural(ms, msAbs, n2, name) {
    var isPlural = msAbs >= n2 * 1.5;
    return Math.round(ms / n2) + " " + name + (isPlural ? "s" : "");
  }
});
var require_common = /* @__PURE__ */ __commonJSMin((exports, module) => {
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0;i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled)
          return;
        const self = debug;
        const curr = Number(/* @__PURE__ */ new Date);
        self.diff = curr - (prevTime || curr);
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string")
          args.unshift("%O");
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%")
            return "%";
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        (self.log || createDebug.log).apply(self, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null)
            return enableOverride;
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function")
        createDebug.init(debug);
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split)
        if (ns[0] === "-")
          createDebug.skips.push(ns.slice(1));
        else
          createDebug.names.push(ns);
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length)
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*"))
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else
          return false;
      while (templateIndex < template.length && template[templateIndex] === "*")
        templateIndex++;
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => "-" + namespace)].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips)
        if (matchesTemplate(name, skip))
          return false;
      for (const ns of createDebug.names)
        if (matchesTemplate(name, ns))
          return true;
      return false;
    }
    function coerce(val) {
      if (val instanceof Error)
        return val.stack || val.message;
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  module.exports = setup;
});
var require_browser = /* @__PURE__ */ __commonJSMin((exports, module) => {
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = localstorage();
  exports.destroy = (() => {
    let warned = false;
    return () => {
      if (!warned) {
        warned = true;
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
    };
  })();
  exports.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function useColors() {
    if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
      return true;
    if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
      return false;
    let m2;
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m2 = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m2[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  function formatArgs(args) {
    args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
    if (!this.useColors)
      return;
    const c2 = "color: " + this.color;
    args.splice(1, 0, c2, "color: inherit");
    let index = 0;
    let lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, (match) => {
      if (match === "%%")
        return;
      index++;
      if (match === "%c")
        lastC = index;
    });
    args.splice(lastC, 0, c2);
  }
  exports.log = console.debug || console.log || (() => {});
  function save(namespaces) {
    try {
      if (namespaces)
        exports.storage.setItem("debug", namespaces);
      else
        exports.storage.removeItem("debug");
    } catch (error) {}
  }
  function load() {
    let r2;
    try {
      r2 = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
    } catch (error) {}
    if (!r2 && typeof process !== "undefined" && "env" in process)
      r2 = process.env.DEBUG;
    return r2;
  }
  function localstorage() {
    try {
      return localStorage;
    } catch (error) {}
  }
  module.exports = require_common()(exports);
  const { formatters } = module.exports;
  formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});
var require_node = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const tty = __require2("tty");
  const util = __require2("util");
  exports.init = init;
  exports.log = log2;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  exports.colors = [
    6,
    2,
    3,
    4,
    5,
    1
  ];
  try {
    const supportsColor = __require2("supports-color");
    if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2)
      exports.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ];
  } catch (error) {}
  exports.inspectOpts = Object.keys(process.env).filter((key) => {
    return /^debug_/i.test(key);
  }).reduce((obj, key) => {
    const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
      return k.toUpperCase();
    });
    let val = process.env[key];
    if (/^(yes|on|true|enabled)$/i.test(val))
      val = true;
    else if (/^(no|off|false|disabled)$/i.test(val))
      val = false;
    else if (val === "null")
      val = null;
    else
      val = Number(val);
    obj[prop] = val;
    return obj;
  }, {});
  function useColors() {
    return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
  }
  function formatArgs(args) {
    const { namespace: name, useColors: useColors2 } = this;
    if (useColors2) {
      const c2 = this.color;
      const colorCode = "\x1B[3" + (c2 < 8 ? c2 : "8;5;" + c2);
      const prefix = `  ${colorCode};1m${name} \x1B[0m`;
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
      args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
    } else
      args[0] = getDate() + name + " " + args[0];
  }
  function getDate() {
    if (exports.inspectOpts.hideDate)
      return "";
    return (/* @__PURE__ */ new Date()).toISOString() + " ";
  }
  function log2(...args) {
    return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + `
`);
  }
  function save(namespaces) {
    if (namespaces)
      process.env.DEBUG = namespaces;
    else
      delete process.env.DEBUG;
  }
  function load() {
    return process.env.DEBUG;
  }
  function init(debug) {
    debug.inspectOpts = {};
    const keys = Object.keys(exports.inspectOpts);
    for (let i = 0;i < keys.length; i++)
      debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
  }
  module.exports = require_common()(exports);
  const { formatters } = module.exports;
  formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map((str) => str.trim()).join(" ");
  };
  formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});
var require_src$1 = /* @__PURE__ */ __commonJSMin((exports, module) => {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs)
    module.exports = require_browser();
  else
    module.exports = require_node();
});
var require_src2 = /* @__PURE__ */ __commonJSMin((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  const fs_1 = __require2("fs");
  const log2 = __importDefault(require_src$1()).default("@kwsites/file-exists");
  function check(path, isFile, isDirectory) {
    log2(`checking %s`, path);
    try {
      const stat = fs_1.statSync(path);
      if (stat.isFile() && isFile) {
        log2(`[OK] path represents a file`);
        return true;
      }
      if (stat.isDirectory() && isDirectory) {
        log2(`[OK] path represents a directory`);
        return true;
      }
      log2(`[FAIL] path represents something other than a file or directory`);
      return false;
    } catch (e) {
      if (e.code === "ENOENT") {
        log2(`[FAIL] path is not accessible: %o`, e);
        return false;
      }
      log2(`[FATAL] %o`, e);
      throw e;
    }
  }
  function exists(path, type = exports.READABLE) {
    return check(path, (type & exports.FILE) > 0, (type & exports.FOLDER) > 0);
  }
  exports.exists = exists;
  exports.FILE = 1;
  exports.FOLDER = 2;
  exports.READABLE = exports.FILE + exports.FOLDER;
});
var require_dist = /* @__PURE__ */ __commonJSMin((exports) => {
  function __export(m2) {
    for (var p in m2)
      if (!exports.hasOwnProperty(p))
        exports[p] = m2[p];
  }
  Object.defineProperty(exports, "__esModule", { value: true });
  __export(require_src2());
});

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/@simple-git/args-pathspec.mjs
var t = /* @__PURE__ */ new WeakMap;
function c2(...n2) {
  const e = new String(n2);
  return t.set(e, n2), e;
}
function r2(n2) {
  return n2 instanceof String && t.has(n2);
}
function o(n2) {
  return t.get(n2) ?? [];
}

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/@kwsites/promise-deferred.mjs
var require_dist2 = /* @__PURE__ */ __commonJSMin((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.createDeferred = exports.deferred = undefined;
  function deferred() {
    let done;
    let fail;
    let status = "pending";
    return {
      promise: new Promise((_done, _fail) => {
        done = _done;
        fail = _fail;
      }),
      done(result) {
        if (status === "pending") {
          status = "resolved";
          done(result);
        }
      },
      fail(error) {
        if (status === "pending") {
          status = "rejected";
          fail(error);
        }
      },
      get fulfilled() {
        return status !== "pending";
      },
      get status() {
        return status;
      }
    };
  }
  exports.deferred = deferred;
  exports.createDeferred = deferred;
});

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/@simple-git/argv-parser.mjs
function* U(e, t2) {
  const n2 = t2 === "global";
  for (const o2 of e)
    o2.isGlobal === n2 && (yield o2);
}
var k = /* @__PURE__ */ new Set([
  "--add",
  "--edit",
  "--remove-section",
  "--rename-section",
  "--replace-all",
  "--unset",
  "--unset-all",
  "-e"
]);
var S = /* @__PURE__ */ new Set([
  "--get",
  "--get-all",
  "--get-color",
  "--get-colorbool",
  "--get-regexp",
  "--get-urlmatch",
  "--list",
  "-l"
]);
var P = /* @__PURE__ */ new Set([
  "edit",
  "remove-section",
  "rename-section",
  "set",
  "unset"
]);
var E = /* @__PURE__ */ new Set([
  "get",
  "get-color",
  "get-colorbool",
  "list"
]);
function F(e, t2) {
  for (const { name: o2 } of U(e, "task")) {
    if (k.has(o2))
      return p(true, t2);
    if (S.has(o2))
      return p(false, t2);
  }
  const n2 = t2.at(0)?.toLowerCase();
  return n2 === undefined ? null : P.has(n2) ? p(true, t2.slice(1)) : E.has(n2) ? p(false, t2.slice(1)) : t2.length === 1 ? p(false, t2) : p(true, t2);
}
function p(e = false, t2 = []) {
  const n2 = t2.at(0)?.toLowerCase();
  return n2 === undefined ? null : {
    isWrite: e,
    isRead: !e,
    key: n2,
    value: t2.at(1)
  };
}
function A(e, t2) {
  return t2.isWrite && t2.value !== undefined ? {
    key: t2.key,
    value: t2.value,
    scope: e
  } : {
    key: t2.key,
    scope: e
  };
}
function M(e) {
  const t2 = e?.indexOf("=") || -1;
  return !e || t2 < 0 ? null : {
    key: e.slice(0, t2).trim().toLowerCase(),
    value: e.slice(t2 + 1)
  };
}
function N(e) {
  for (const { name: t2 } of U(e, "task"))
    switch (t2) {
      case "--global":
        return "global";
      case "--system":
        return "system";
      case "--worktree":
        return "worktree";
      case "--local":
        return "local";
      case "--file":
      case "-f":
        return "file";
    }
  return "local";
}
function G({ name: e }) {
  if (e === "-c" || e === "--config")
    return "inline";
  if (e === "--config-env")
    return "env";
}
function* O(e) {
  for (const t2 of e) {
    const n2 = G(t2), o2 = n2 && M(t2.value);
    o2 && (yield {
      ...o2,
      scope: n2
    });
  }
}
function L(e, t2, n2) {
  const o2 = {
    read: [],
    write: [...O(t2)]
  };
  return e === "config" && $(o2, N(t2), F(t2, n2)), o2;
}
function $(e, t2, n2) {
  if (n2 === null)
    return;
  const o2 = A(t2, n2);
  n2.isWrite ? e.write.push(o2) : e.read.push(o2);
}
var x = { short: /* @__PURE__ */ new Map([["c", true]]) };
var D = {
  short: new Map([
    ["C", true],
    ["P", false],
    ["h", false],
    ["p", false],
    ["v", false],
    ...x.short.entries()
  ]),
  long: /* @__PURE__ */ new Set([
    "attr-source",
    "config-env",
    "exec-path",
    "git-dir",
    "list-cmds",
    "namespace",
    "super-prefix",
    "work-tree"
  ])
};
var R2 = {
  clone: {
    short: /* @__PURE__ */ new Map([
      ["b", true],
      ["j", true],
      ["l", false],
      ["n", false],
      ["o", true],
      ["q", false],
      ["s", false],
      ["u", true]
    ]),
    long: /* @__PURE__ */ new Set([
      "branch",
      "config",
      "jobs",
      "origin",
      "upload-pack",
      "u",
      "template"
    ])
  },
  commit: {
    short: /* @__PURE__ */ new Map([
      ["C", true],
      ["F", true],
      ["c", true],
      ["m", true],
      ["t", true]
    ]),
    long: /* @__PURE__ */ new Set([
      "file",
      "message",
      "reedit-message",
      "reuse-message",
      "template"
    ])
  },
  config: {
    short: /* @__PURE__ */ new Map([
      ["e", false],
      ["f", true],
      ["l", false]
    ]),
    long: /* @__PURE__ */ new Set([
      "blob",
      "comment",
      "default",
      "file",
      "type",
      "value"
    ])
  },
  fetch: {
    short: /* @__PURE__ */ new Map,
    long: /* @__PURE__ */ new Set(["upload-pack"])
  },
  init: {
    short: /* @__PURE__ */ new Map,
    long: /* @__PURE__ */ new Set(["template"])
  },
  pull: {
    short: /* @__PURE__ */ new Map,
    long: /* @__PURE__ */ new Set(["upload-pack"])
  },
  push: {
    short: /* @__PURE__ */ new Map,
    long: /* @__PURE__ */ new Set(["exec", "receive-pack"])
  }
};
var T = {
  short: /* @__PURE__ */ new Map,
  long: /* @__PURE__ */ new Set
};
function I2(e) {
  const t2 = R2[e ?? ""] ?? T;
  return {
    short: new Map([...x.short.entries(), ...t2.short.entries()]),
    long: t2.long
  };
}
function b(e, t2 = D) {
  if (e.startsWith("--")) {
    const n2 = e.indexOf("=");
    if (n2 > 2)
      return [{
        name: e.slice(0, n2),
        value: e.slice(n2 + 1),
        needsNext: false
      }];
    const o2 = e.slice(2);
    return [{
      name: e,
      needsNext: t2.long.has(o2)
    }];
  }
  if (e.length === 2) {
    const n2 = e.charAt(1);
    return [{
      name: e,
      needsNext: t2.short.get(n2) === true
    }];
  }
  return W2(e, t2.short);
}
function W2(e, t2) {
  const n2 = e.slice(1).split(""), o2 = [];
  for (let s = 0;s < n2.length; s++) {
    const r3 = n2[s], l2 = t2.get(r3);
    if (l2 === undefined)
      return [{
        name: e,
        needsNext: false
      }];
    if (l2) {
      const a2 = n2.slice(s + 1).join("");
      if (a2 && ![...a2].every((w) => t2.has(w)))
        return o2.push({
          name: `-${r3}`,
          value: a2,
          needsNext: false
        }), o2;
    }
    o2.push({
      name: `-${r3}`,
      needsNext: l2
    });
  }
  return o2;
}
function j(e, t2 = []) {
  let n2 = 0;
  for (;n2 < e.length; ) {
    const o2 = String(e[n2]);
    if (!o2.startsWith("-") || o2.length < 2)
      break;
    const s = b(o2);
    let r3 = n2 + 1;
    for (const l2 of s) {
      const a2 = {
        name: l2.name,
        value: l2.value,
        absorbedNext: false,
        isGlobal: true
      };
      l2.needsNext && a2.value === undefined && r3 < e.length && (a2.value = String(e[r3]), a2.absorbedNext = true, r3++), t2.push(a2);
    }
    n2 = r3;
  }
  return {
    flags: t2,
    taskIndex: n2
  };
}
function B(e, t2, n2 = []) {
  const o$1 = I2(t2), s = [], r$1 = [];
  let l2 = 0;
  for (;l2 < e.length; ) {
    const a2 = e[l2];
    if (r2(a2)) {
      r$1.push(...o(a2)), l2++;
      continue;
    }
    const f = String(a2);
    if (f === "--") {
      for (let g = l2 + 1;g < e.length; g++) {
        const u = e[g];
        r2(u) ? r$1.push(...o(u)) : r$1.push(String(u));
      }
      break;
    }
    if (!f.startsWith("-") || f.length < 2) {
      s.push(f), l2++;
      continue;
    }
    const w = b(f, o$1);
    let d = l2 + 1;
    for (const g of w) {
      const u = {
        name: g.name,
        value: g.value,
        absorbedNext: false,
        isGlobal: false
      };
      g.needsNext && u.value === undefined && d < e.length && !r2(e[d]) && (u.value = String(e[d]), u.absorbedNext = true, d++), n2.push(u);
    }
    l2 = d;
  }
  return {
    flags: n2,
    positionals: s,
    pathspecs: r$1
  };
}
function* V2({ write: e }) {
  for (const t2 of e)
    for (const n2 of q) {
      const o2 = n2(t2.key);
      o2 && (yield o2);
    }
}
function c3(e, t2, n2 = String(e)) {
  const o2 = typeof e == "string" ? new RegExp(`\\s*${e.toLowerCase()}`) : e;
  return function(r3) {
    if (o2.test(r3))
      return {
        category: t2,
        message: `Configuring ${n2} is not permitted without enabling ${t2}`
      };
  };
}
function i(e, t2) {
  return c3(new RegExp(`\\s*${e.toLowerCase().replace(/\./g, "(..+)?.")}`), t2, e);
}
var q = [
  c3("alias", "allowUnsafeAlias"),
  c3("core.askPass", "allowUnsafeAskPass"),
  c3("core.editor", "allowUnsafeEditor"),
  c3("core.fsmonitor", "allowUnsafeFsMonitor"),
  c3("core.gitProxy", "allowUnsafeGitProxy"),
  c3("core.hooksPath", "allowUnsafeHooksPath"),
  c3("core.pager", "allowUnsafePager"),
  c3("core.sshCommand", "allowUnsafeSshCommand"),
  i("credential.helper", "allowUnsafeCredentialHelper"),
  i("diff.command", "allowUnsafeDiffExternal"),
  c3("diff.external", "allowUnsafeDiffExternal"),
  i("diff.textconv", "allowUnsafeDiffTextConv"),
  i("filter.clean", "allowUnsafeFilter"),
  i("filter.smudge", "allowUnsafeFilter"),
  i("gpg.program", "allowUnsafeGpgProgram"),
  c3("init.templateDir", "allowUnsafeTemplateDir"),
  i("merge.driver", "allowUnsafeMergeDriver"),
  i("mergetool.path", "allowUnsafeMergeDriver"),
  i("mergetool.cmd", "allowUnsafeMergeDriver"),
  i("protocol.allow", "allowUnsafeProtocolOverride"),
  i("remote.receivepack", "allowUnsafePack"),
  i("remote.uploadpack", "allowUnsafePack"),
  c3("sequence.editor", "allowUnsafeEditor")
];
function* K(e, t2) {
  for (const n2 of t2)
    for (const o2 of H) {
      const s = o2(e, n2.name);
      s && (yield s);
    }
}
function h(e, t2, n2, o2 = String(t2)) {
  const s = typeof t2 == "string" ? new RegExp(`\\s*${t2.toLowerCase()}`) : t2, r3 = `Use of ${e ? `${e} with option ` : ""}${o2} is not permitted without enabling ${n2}`;
  return function(a2, f) {
    if ((!e || a2 === e) && s.test(f))
      return {
        category: n2,
        message: r3
      };
  };
}
var H = [
  h(null, /--(upload|receive)-pack/, "allowUnsafePack", "--upload-pack or --receive-pack"),
  h("clone", /^-\w*u/, "allowUnsafePack"),
  h("clone", "--u", "allowUnsafePack"),
  h("push", "--exec", "allowUnsafePack"),
  h(null, "--template", "allowUnsafeTemplateDir")
];
function C2(e, t2, n2) {
  return [...K(e, t2), ...V2(n2)];
}
function Y(...e) {
  const { flags: t2, taskIndex: n2 } = j(e), o2 = n2 < e.length ? String(e[n2]).toLowerCase() : null, { positionals: r3, pathspecs: l2 } = B(o2 !== null ? e.slice(n2 + 1) : [], o2, t2), a2 = L(o2, t2, r3);
  return {
    task: o2,
    flags: t2.map(J),
    paths: l2,
    config: a2,
    vulnerabilities: z(C2(o2, t2, a2))
  };
}
function z(e) {
  return Object.defineProperty(e, "vulnerabilities", { value: e });
}
function J({ value: e, name: t2 }) {
  return e !== undefined ? {
    name: t2,
    value: e
  } : { name: t2 };
}
var y = {
  editor: "allowUnsafeEditor",
  git_askpass: "allowUnsafeAskPass",
  git_config_global: "allowUnsafeConfigPaths",
  git_config_system: "allowUnsafeConfigPaths",
  git_config_count: "allowUnsafeConfigEnvCount",
  git_config: "allowUnsafeConfigPaths",
  git_editor: "allowUnsafeEditor",
  git_exec_path: "allowUnsafeConfigPaths",
  git_external_diff: "allowUnsafeDiffExternal",
  git_pager: "allowUnsafePager",
  git_proxy_command: "allowUnsafeGitProxy",
  git_template_dir: "allowUnsafeTemplateDir",
  git_sequence_editor: "allowUnsafeEditor",
  git_ssh: "allowUnsafeSshCommand",
  git_ssh_command: "allowUnsafeSshCommand",
  pager: "allowUnsafePager",
  prefix: "allowUnsafeConfigPaths",
  ssh_askpass: "allowUnsafeAskPass"
};
function* Q(e) {
  const t2 = parseInt(e.git_config_count ?? "0", 10);
  for (let n2 = 0;n2 < t2; n2++) {
    const o2 = e[`git_config_key_${n2}`], s = e[`git_config_value_${n2}`];
    o2 !== undefined && (yield {
      key: o2.toLowerCase().trim(),
      value: s,
      scope: "env"
    });
  }
}
function* X(e) {
  for (const t2 of Object.keys(e))
    if (_(t2)) {
      const n2 = y[t2];
      yield {
        category: n2,
        message: `Use of "${t2.toUpperCase()}" is not permitted without enabling ${n2}`
      };
    }
}
function _(e) {
  return Object.hasOwn(y, e);
}
function Z(e) {
  const t2 = {};
  for (const [n2, o2] of Object.entries(e)) {
    const s = n2.toLowerCase().trim();
    (_(s) || s.startsWith("git")) && (t2[s] = String(o2));
  }
  return t2;
}
function ee(e) {
  const t2 = Z(e), n2 = {
    read: [],
    write: [...Q(t2)]
  };
  return {
    config: n2,
    vulnerabilities: [...X(t2), ...C2(null, [], n2)]
  };
}
function ne(e, t2) {
  return [...Y(...e).vulnerabilities, ...ee(t2).vulnerabilities];
}

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/simple-git.mjs
import { normalize } from "node:path";
import { spawn } from "child_process";
import { EventEmitter } from "node:events";
var import_dist = require_dist();
var import_src3 = /* @__PURE__ */ __toESM(require_src$1(), 1);
var import_dist$1 = require_dist2();
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
};
var __commonJS2 = (cb, mod) => function __require3() {
  return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp2(target, name, {
      get: all[name],
      enumerable: true
    });
};
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames2(from))
      if (!__hasOwnProp2.call(to, key) && key !== except)
        __defProp2(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable
        });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
var GitError;
var init_git_error = __esm({ "src/lib/errors/git-error.ts"() {
  GitError = class extends Error {
    constructor(task, message) {
      super(message);
      this.task = task;
      Object.setPrototypeOf(this, new.target.prototype);
    }
  };
} });
var GitResponseError;
var init_git_response_error = __esm({ "src/lib/errors/git-response-error.ts"() {
  init_git_error();
  GitResponseError = class extends GitError {
    constructor(git, message) {
      super(undefined, message || String(git));
      this.git = git;
    }
  };
} });
var TaskConfigurationError;
var init_task_configuration_error = __esm({ "src/lib/errors/task-configuration-error.ts"() {
  init_git_error();
  TaskConfigurationError = class extends GitError {
    constructor(message) {
      super(undefined, message);
    }
  };
} });
function asFunction(source) {
  if (typeof source !== "function")
    return NOOP;
  return source;
}
function isUserFunction(source) {
  return typeof source === "function" && source !== NOOP;
}
function splitOn(input, char) {
  const index = input.indexOf(char);
  if (index <= 0)
    return [input, ""];
  return [input.substr(0, index), input.substr(index + 1)];
}
function first(input, offset = 0) {
  return isArrayLike(input) && input.length > offset ? input[offset] : undefined;
}
function last(input, offset = 0) {
  if (isArrayLike(input) && input.length > offset)
    return input[input.length - 1 - offset];
}
function isArrayLike(input) {
  return filterHasLength(input);
}
function toLinesWithContent(input = "", trimmed2 = true, separator = `
`) {
  return input.split(separator).reduce((output, line) => {
    const lineContent = trimmed2 ? line.trim() : line;
    if (lineContent)
      output.push(lineContent);
    return output;
  }, []);
}
function forEachLineWithContent(input, callback) {
  return toLinesWithContent(input, true).map((line) => callback(line));
}
function folderExists(path) {
  return (0, import_dist.exists)(path, import_dist.FOLDER);
}
function append(target, item) {
  if (Array.isArray(target)) {
    if (!target.includes(item))
      target.push(item);
  } else
    target.add(item);
  return item;
}
function including(target, item) {
  if (Array.isArray(target) && !target.includes(item))
    target.push(item);
  return target;
}
function remove(target, item) {
  if (Array.isArray(target)) {
    const index = target.indexOf(item);
    if (index >= 0)
      target.splice(index, 1);
  } else
    target.delete(item);
  return item;
}
function asArray(source) {
  return Array.isArray(source) ? source : [source];
}
function asCamelCase(str) {
  return str.replace(/[\s-]+(.)/g, (_all, chr) => {
    return chr.toUpperCase();
  });
}
function asStringArray(source) {
  return asArray(source).map((item) => {
    return item instanceof String ? item : String(item);
  });
}
function asNumber(source, onNaN = 0) {
  if (source == null)
    return onNaN;
  const num = parseInt(source, 10);
  return Number.isNaN(num) ? onNaN : num;
}
function prefixedArray(input, prefix) {
  const output = [];
  for (let i2 = 0, max = input.length;i2 < max; i2++)
    output.push(prefix, input[i2]);
  return output;
}
function bufferToString(input) {
  return (Array.isArray(input) ? Buffer.concat(input) : input).toString("utf-8");
}
function pick(source, properties) {
  const out = {};
  properties.forEach((key) => {
    if (source[key] !== undefined)
      out[key] = source[key];
  });
  return out;
}
function delay(duration = 0) {
  return new Promise((done) => setTimeout(done, duration));
}
function orVoid(input) {
  if (input === false)
    return;
  return input;
}
var NULL;
var NOOP;
var objectToString;
var init_util = __esm({ "src/lib/utils/util.ts"() {
  init_argument_filters();
  NULL = "\x00";
  NOOP = () => {};
  objectToString = Object.prototype.toString.call.bind(Object.prototype.toString);
} });
function filterType(input, filter, def) {
  if (filter(input))
    return input;
  return arguments.length > 2 ? def : undefined;
}
function filterPrimitives(input, omit) {
  const type = r2(input) ? "string" : typeof input;
  return /number|string|boolean/.test(type) && (!omit || !omit.includes(type));
}
function filterPlainObject(input) {
  return !!input && objectToString(input) === "[object Object]";
}
function filterFunction(input) {
  return typeof input === "function";
}
var filterArray;
var filterNumber;
var filterString;
var filterStringOrStringArray;
var filterHasLength;
var init_argument_filters = __esm({ "src/lib/utils/argument-filters.ts"() {
  init_util();
  filterArray = (input) => {
    return Array.isArray(input);
  };
  filterNumber = (input) => {
    return typeof input === "number";
  };
  filterString = (input) => {
    return typeof input === "string" || r2(input);
  };
  filterStringOrStringArray = (input) => {
    return filterString(input) || Array.isArray(input) && input.every(filterString);
  };
  filterHasLength = (input) => {
    if (input == null || "number|boolean|function".includes(typeof input))
      return false;
    return typeof input.length === "number";
  };
} });
var ExitCodes;
var init_exit_codes = __esm({ "src/lib/utils/exit-codes.ts"() {
  ExitCodes = /* @__PURE__ */ ((ExitCodes2) => {
    ExitCodes2[ExitCodes2["SUCCESS"] = 0] = "SUCCESS";
    ExitCodes2[ExitCodes2["ERROR"] = 1] = "ERROR";
    ExitCodes2[ExitCodes2["NOT_FOUND"] = -2] = "NOT_FOUND";
    ExitCodes2[ExitCodes2["UNCLEAN"] = 128] = "UNCLEAN";
    return ExitCodes2;
  })(ExitCodes || {});
} });
var GitOutputStreams;
var init_git_output_streams = __esm({ "src/lib/utils/git-output-streams.ts"() {
  GitOutputStreams = class _GitOutputStreams {
    constructor(stdOut, stdErr) {
      this.stdOut = stdOut;
      this.stdErr = stdErr;
    }
    asStrings() {
      return new _GitOutputStreams(this.stdOut.toString("utf8"), this.stdErr.toString("utf8"));
    }
  };
} });
function useMatchesDefault() {
  throw new Error(`LineParser:useMatches not implemented`);
}
var LineParser;
var RemoteLineParser;
var init_line_parser = __esm({ "src/lib/utils/line-parser.ts"() {
  LineParser = class {
    constructor(regExp, useMatches) {
      this.matches = [];
      this.useMatches = useMatchesDefault;
      this.parse = (line, target) => {
        this.resetMatches();
        if (!this._regExp.every((reg, index) => this.addMatch(reg, index, line(index))))
          return false;
        return this.useMatches(target, this.prepareMatches()) !== false;
      };
      this._regExp = Array.isArray(regExp) ? regExp : [regExp];
      if (useMatches)
        this.useMatches = useMatches;
    }
    resetMatches() {
      this.matches.length = 0;
    }
    prepareMatches() {
      return this.matches;
    }
    addMatch(reg, index, line) {
      const matched = line && reg.exec(line);
      if (matched)
        this.pushMatch(index, matched);
      return !!matched;
    }
    pushMatch(_index, matched) {
      this.matches.push(...matched.slice(1));
    }
  };
  RemoteLineParser = class extends LineParser {
    addMatch(reg, index, line) {
      return /^remote:\s/.test(String(line)) && super.addMatch(reg, index, line);
    }
    pushMatch(index, matched) {
      if (index > 0 || matched.length > 1)
        super.pushMatch(index, matched);
    }
  };
} });
function createInstanceConfig(...options) {
  const baseDir = process.cwd();
  const config = Object.assign({
    baseDir,
    ...defaultOptions
  }, ...options.filter((o2) => typeof o2 === "object" && o2));
  config.baseDir = config.baseDir || baseDir;
  config.trimmed = config.trimmed === true;
  return config;
}
var defaultOptions;
var init_simple_git_options = __esm({ "src/lib/utils/simple-git-options.ts"() {
  defaultOptions = {
    binary: "git",
    maxConcurrentProcesses: 5,
    config: [],
    trimmed: false
  };
} });
function appendTaskOptions(options, commands = []) {
  if (!filterPlainObject(options))
    return commands;
  return Object.keys(options).reduce((commands2, key) => {
    const value = options[key];
    if (r2(value))
      commands2.push(value);
    else if (filterPrimitives(value, ["boolean"]))
      commands2.push(key + "=" + value);
    else if (Array.isArray(value)) {
      for (const v of value)
        if (!filterPrimitives(v, ["string", "number"]))
          commands2.push(key + "=" + v);
    } else
      commands2.push(key);
    return commands2;
  }, commands);
}
function getTrailingOptions(args, initialPrimitive = 0, objectOnly = false) {
  const command = [];
  for (let i2 = 0, max = initialPrimitive < 0 ? args.length : initialPrimitive;i2 < max; i2++)
    if ("string|number".includes(typeof args[i2]))
      command.push(String(args[i2]));
  appendTaskOptions(trailingOptionsArgument(args), command);
  if (!objectOnly)
    command.push(...trailingArrayArgument(args));
  return command;
}
function trailingArrayArgument(args) {
  return asStringArray(filterType(last(args, typeof last(args) === "function" ? 1 : 0), filterArray, []));
}
function trailingOptionsArgument(args) {
  return filterType(last(args, filterFunction(last(args)) ? 1 : 0), filterPlainObject);
}
function trailingFunctionArgument(args, includeNoop = true) {
  const callback = asFunction(last(args));
  return includeNoop || isUserFunction(callback) ? callback : undefined;
}
var init_task_options = __esm({ "src/lib/utils/task-options.ts"() {
  init_argument_filters();
  init_util();
} });
function callTaskParser(parser4, streams) {
  return parser4(streams.stdOut, streams.stdErr);
}
function parseStringResponse(result, parsers12, texts, trim = true) {
  asArray(texts).forEach((text) => {
    for (let lines = toLinesWithContent(text, trim), i2 = 0, max = lines.length;i2 < max; i2++) {
      const line = (offset = 0) => {
        if (i2 + offset >= max)
          return;
        return lines[i2 + offset];
      };
      parsers12.some(({ parse }) => parse(line, result));
    }
  });
  return result;
}
var init_task_parser = __esm({ "src/lib/utils/task-parser.ts"() {
  init_util();
} });
var utils_exports = {};
__export(utils_exports, {
  ExitCodes: () => ExitCodes,
  GitOutputStreams: () => GitOutputStreams,
  LineParser: () => LineParser,
  NOOP: () => NOOP,
  NULL: () => NULL,
  RemoteLineParser: () => RemoteLineParser,
  append: () => append,
  appendTaskOptions: () => appendTaskOptions,
  asArray: () => asArray,
  asCamelCase: () => asCamelCase,
  asFunction: () => asFunction,
  asNumber: () => asNumber,
  asStringArray: () => asStringArray,
  bufferToString: () => bufferToString,
  callTaskParser: () => callTaskParser,
  createInstanceConfig: () => createInstanceConfig,
  delay: () => delay,
  filterArray: () => filterArray,
  filterFunction: () => filterFunction,
  filterHasLength: () => filterHasLength,
  filterNumber: () => filterNumber,
  filterPlainObject: () => filterPlainObject,
  filterPrimitives: () => filterPrimitives,
  filterString: () => filterString,
  filterStringOrStringArray: () => filterStringOrStringArray,
  filterType: () => filterType,
  first: () => first,
  folderExists: () => folderExists,
  forEachLineWithContent: () => forEachLineWithContent,
  getTrailingOptions: () => getTrailingOptions,
  including: () => including,
  isUserFunction: () => isUserFunction,
  last: () => last,
  objectToString: () => objectToString,
  orVoid: () => orVoid,
  parseStringResponse: () => parseStringResponse,
  pick: () => pick,
  prefixedArray: () => prefixedArray,
  remove: () => remove,
  splitOn: () => splitOn,
  toLinesWithContent: () => toLinesWithContent,
  trailingFunctionArgument: () => trailingFunctionArgument,
  trailingOptionsArgument: () => trailingOptionsArgument
});
var init_utils = __esm({ "src/lib/utils/index.ts"() {
  init_argument_filters();
  init_exit_codes();
  init_git_output_streams();
  init_line_parser();
  init_simple_git_options();
  init_task_options();
  init_task_parser();
  init_util();
} });
var check_is_repo_exports = {};
__export(check_is_repo_exports, {
  CheckRepoActions: () => CheckRepoActions,
  checkIsBareRepoTask: () => checkIsBareRepoTask,
  checkIsRepoRootTask: () => checkIsRepoRootTask,
  checkIsRepoTask: () => checkIsRepoTask
});
function checkIsRepoTask(action) {
  switch (action) {
    case "bare":
      return checkIsBareRepoTask();
    case "root":
      return checkIsRepoRootTask();
  }
  return {
    commands: ["rev-parse", "--is-inside-work-tree"],
    format: "utf-8",
    onError,
    parser
  };
}
function checkIsRepoRootTask() {
  return {
    commands: ["rev-parse", "--git-dir"],
    format: "utf-8",
    onError,
    parser(path) {
      return /^\.(git)?$/.test(path.trim());
    }
  };
}
function checkIsBareRepoTask() {
  return {
    commands: ["rev-parse", "--is-bare-repository"],
    format: "utf-8",
    onError,
    parser
  };
}
function isNotRepoMessage(error) {
  return /(Not a git repository|Kein Git-Repository)/i.test(String(error));
}
var CheckRepoActions;
var onError;
var parser;
var init_check_is_repo = __esm({ "src/lib/tasks/check-is-repo.ts"() {
  init_utils();
  CheckRepoActions = /* @__PURE__ */ ((CheckRepoActions2) => {
    CheckRepoActions2["BARE"] = "bare";
    CheckRepoActions2["IN_TREE"] = "tree";
    CheckRepoActions2["IS_REPO_ROOT"] = "root";
    return CheckRepoActions2;
  })(CheckRepoActions || {});
  onError = ({ exitCode }, error, done, fail) => {
    if (exitCode === 128 && isNotRepoMessage(error))
      return done(Buffer.from("false"));
    fail(error);
  };
  parser = (text) => {
    return text.trim() === "true";
  };
} });
function cleanSummaryParser(dryRun, text) {
  const summary = new CleanResponse(dryRun);
  const regexp = dryRun ? dryRunRemovalRegexp : removalRegexp;
  toLinesWithContent(text).forEach((line) => {
    const removed = line.replace(regexp, "");
    summary.paths.push(removed);
    (isFolderRegexp.test(removed) ? summary.folders : summary.files).push(removed);
  });
  return summary;
}
var CleanResponse;
var removalRegexp;
var dryRunRemovalRegexp;
var isFolderRegexp;
var init_CleanSummary = __esm({ "src/lib/responses/CleanSummary.ts"() {
  init_utils();
  CleanResponse = class {
    constructor(dryRun) {
      this.dryRun = dryRun;
      this.paths = [];
      this.files = [];
      this.folders = [];
    }
  };
  removalRegexp = /^[a-z]+\s*/i;
  dryRunRemovalRegexp = /^[a-z]+\s+[a-z]+\s*/i;
  isFolderRegexp = /\/$/;
} });
var task_exports = {};
__export(task_exports, {
  EMPTY_COMMANDS: () => EMPTY_COMMANDS,
  adhocExecTask: () => adhocExecTask,
  configurationErrorTask: () => configurationErrorTask,
  isBufferTask: () => isBufferTask,
  isEmptyTask: () => isEmptyTask,
  straightThroughBufferTask: () => straightThroughBufferTask,
  straightThroughStringTask: () => straightThroughStringTask
});
function adhocExecTask(parser4) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser: parser4
  };
}
function configurationErrorTask(error) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser() {
      throw typeof error === "string" ? new TaskConfigurationError(error) : error;
    }
  };
}
function straightThroughStringTask(commands, trimmed2 = false) {
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return trimmed2 ? String(text).trim() : text;
    }
  };
}
function straightThroughBufferTask(commands) {
  return {
    commands,
    format: "buffer",
    parser(buffer) {
      return buffer;
    }
  };
}
function isBufferTask(task) {
  return task.format === "buffer";
}
function isEmptyTask(task) {
  return task.format === "empty" || !task.commands.length;
}
var EMPTY_COMMANDS;
var init_task = __esm({ "src/lib/tasks/task.ts"() {
  init_task_configuration_error();
  EMPTY_COMMANDS = [];
} });
var clean_exports = {};
__export(clean_exports, {
  CONFIG_ERROR_INTERACTIVE_MODE: () => CONFIG_ERROR_INTERACTIVE_MODE,
  CONFIG_ERROR_MODE_REQUIRED: () => CONFIG_ERROR_MODE_REQUIRED,
  CONFIG_ERROR_UNKNOWN_OPTION: () => CONFIG_ERROR_UNKNOWN_OPTION,
  CleanOptions: () => CleanOptions,
  cleanTask: () => cleanTask,
  cleanWithOptionsTask: () => cleanWithOptionsTask,
  isCleanOptionsArray: () => isCleanOptionsArray
});
function cleanWithOptionsTask(mode, customArgs) {
  const { cleanMode, options, valid } = getCleanOptions(mode);
  if (!cleanMode)
    return configurationErrorTask(CONFIG_ERROR_MODE_REQUIRED);
  if (!valid.options)
    return configurationErrorTask(CONFIG_ERROR_UNKNOWN_OPTION + JSON.stringify(mode));
  options.push(...customArgs);
  if (options.some(isInteractiveMode))
    return configurationErrorTask(CONFIG_ERROR_INTERACTIVE_MODE);
  return cleanTask(cleanMode, options);
}
function cleanTask(mode, customArgs) {
  return {
    commands: [
      "clean",
      `-${mode}`,
      ...customArgs
    ],
    format: "utf-8",
    parser(text) {
      return cleanSummaryParser(mode === "n", text);
    }
  };
}
function isCleanOptionsArray(input) {
  return Array.isArray(input) && input.every((test) => CleanOptionValues.has(test));
}
function getCleanOptions(input) {
  let cleanMode;
  let options = [];
  let valid = {
    cleanMode: false,
    options: true
  };
  input.replace(/[^a-z]i/g, "").split("").forEach((char) => {
    if (isCleanMode(char)) {
      cleanMode = char;
      valid.cleanMode = true;
    } else
      valid.options = valid.options && isKnownOption(options[options.length] = `-${char}`);
  });
  return {
    cleanMode,
    options,
    valid
  };
}
function isCleanMode(cleanMode) {
  return cleanMode === "f" || cleanMode === "n";
}
function isKnownOption(option) {
  return /^-[a-z]$/i.test(option) && CleanOptionValues.has(option.charAt(1));
}
function isInteractiveMode(option) {
  if (/^-[^\-]/.test(option))
    return option.indexOf("i") > 0;
  return option === "--interactive";
}
var CONFIG_ERROR_INTERACTIVE_MODE;
var CONFIG_ERROR_MODE_REQUIRED;
var CONFIG_ERROR_UNKNOWN_OPTION;
var CleanOptions;
var CleanOptionValues;
var init_clean = __esm({ "src/lib/tasks/clean.ts"() {
  init_CleanSummary();
  init_utils();
  init_task();
  CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
  CONFIG_ERROR_MODE_REQUIRED = 'Git clean mode parameter ("n" or "f") is required';
  CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
  CleanOptions = /* @__PURE__ */ ((CleanOptions2) => {
    CleanOptions2["DRY_RUN"] = "n";
    CleanOptions2["FORCE"] = "f";
    CleanOptions2["IGNORED_INCLUDED"] = "x";
    CleanOptions2["IGNORED_ONLY"] = "X";
    CleanOptions2["EXCLUDING"] = "e";
    CleanOptions2["QUIET"] = "q";
    CleanOptions2["RECURSIVE"] = "d";
    return CleanOptions2;
  })(CleanOptions || {});
  CleanOptionValues = /* @__PURE__ */ new Set(["i", ...asStringArray(Object.values(CleanOptions))]);
} });
function configListParser(text) {
  const config = new ConfigList;
  for (const item of configParser(text))
    config.addValue(item.file, String(item.key), item.value);
  return config;
}
function configGetParser(text, key) {
  let value = null;
  const values = [];
  const scopes = /* @__PURE__ */ new Map;
  for (const item of configParser(text, key)) {
    if (item.key !== key)
      continue;
    values.push(value = item.value);
    if (!scopes.has(item.file))
      scopes.set(item.file, []);
    scopes.get(item.file).push(value);
  }
  return {
    key,
    paths: Array.from(scopes.keys()),
    scopes,
    value,
    values
  };
}
function configFilePath(filePath) {
  return filePath.replace(/^(file):/, "");
}
function* configParser(text, requestedKey = null) {
  const lines = text.split("\x00");
  for (let i2 = 0, max = lines.length - 1;i2 < max; ) {
    const file = configFilePath(lines[i2++]);
    let value = lines[i2++];
    let key = requestedKey;
    if (value.includes(`
`)) {
      const line = splitOn(value, `
`);
      key = line[0];
      value = line[1];
    }
    yield {
      file,
      key,
      value
    };
  }
}
var ConfigList;
var init_ConfigList = __esm({ "src/lib/responses/ConfigList.ts"() {
  init_utils();
  ConfigList = class {
    constructor() {
      this.files = [];
      this.values = /* @__PURE__ */ Object.create(null);
    }
    get all() {
      if (!this._all)
        this._all = this.files.reduce((all, file) => {
          return Object.assign(all, this.values[file]);
        }, {});
      return this._all;
    }
    addFile(file) {
      if (!(file in this.values)) {
        const latest = last(this.files);
        this.values[file] = latest ? Object.create(this.values[latest]) : {};
        this.files.push(file);
      }
      return this.values[file];
    }
    addValue(file, key, value) {
      const values = this.addFile(file);
      if (!Object.hasOwn(values, key))
        values[key] = value;
      else if (Array.isArray(values[key]))
        values[key].push(value);
      else
        values[key] = [values[key], value];
      this._all = undefined;
    }
  };
} });
function asConfigScope(scope, fallback) {
  if (typeof scope === "string" && Object.hasOwn(GitConfigScope, scope))
    return scope;
  return fallback;
}
function addConfigTask(key, value, append2, scope) {
  const commands = ["config", `--${scope}`];
  if (append2)
    commands.push("--add");
  commands.push(key, value);
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return text;
    }
  };
}
function getConfigTask(key, scope) {
  const commands = [
    "config",
    "--null",
    "--show-origin",
    "--get-all",
    key
  ];
  if (scope)
    commands.splice(1, 0, `--${scope}`);
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return configGetParser(text, key);
    }
  };
}
function listConfigTask(scope) {
  const commands = [
    "config",
    "--list",
    "--show-origin",
    "--null"
  ];
  if (scope)
    commands.push(`--${scope}`);
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return configListParser(text);
    }
  };
}
function config_default() {
  return {
    addConfig(key, value, ...rest) {
      return this._runTask(addConfigTask(key, value, rest[0] === true, asConfigScope(rest[1], "local")), trailingFunctionArgument(arguments));
    },
    getConfig(key, scope) {
      return this._runTask(getConfigTask(key, asConfigScope(scope, undefined)), trailingFunctionArgument(arguments));
    },
    listConfig(...rest) {
      return this._runTask(listConfigTask(asConfigScope(rest[0], undefined)), trailingFunctionArgument(arguments));
    }
  };
}
var GitConfigScope;
var init_config = __esm({ "src/lib/tasks/config.ts"() {
  init_ConfigList();
  init_utils();
  GitConfigScope = /* @__PURE__ */ ((GitConfigScope2) => {
    GitConfigScope2["system"] = "system";
    GitConfigScope2["global"] = "global";
    GitConfigScope2["local"] = "local";
    GitConfigScope2["worktree"] = "worktree";
    return GitConfigScope2;
  })(GitConfigScope || {});
} });
function isDiffNameStatus(input) {
  return diffNameStatus.has(input);
}
var DiffNameStatus;
var diffNameStatus;
var init_diff_name_status = __esm({ "src/lib/tasks/diff-name-status.ts"() {
  DiffNameStatus = /* @__PURE__ */ ((DiffNameStatus2) => {
    DiffNameStatus2["ADDED"] = "A";
    DiffNameStatus2["COPIED"] = "C";
    DiffNameStatus2["DELETED"] = "D";
    DiffNameStatus2["MODIFIED"] = "M";
    DiffNameStatus2["RENAMED"] = "R";
    DiffNameStatus2["CHANGED"] = "T";
    DiffNameStatus2["UNMERGED"] = "U";
    DiffNameStatus2["UNKNOWN"] = "X";
    DiffNameStatus2["BROKEN"] = "B";
    return DiffNameStatus2;
  })(DiffNameStatus || {});
  diffNameStatus = new Set(Object.values(DiffNameStatus));
} });
function grepQueryBuilder(...params) {
  return new GrepQuery().param(...params);
}
function parseGrep(grep) {
  const paths = /* @__PURE__ */ new Set;
  const results = {};
  forEachLineWithContent(grep, (input) => {
    const [path, line, preview] = input.split(NULL);
    paths.add(path);
    (results[path] = results[path] || []).push({
      line: asNumber(line),
      path,
      preview
    });
  });
  return {
    paths,
    results
  };
}
function grep_default() {
  return { grep(searchTerm) {
    const then = trailingFunctionArgument(arguments);
    const options = getTrailingOptions(arguments);
    for (const option of disallowedOptions)
      if (options.includes(option))
        return this._runTask(configurationErrorTask(`git.grep: use of "${option}" is not supported.`), then);
    if (typeof searchTerm === "string")
      searchTerm = grepQueryBuilder().param(searchTerm);
    const commands = [
      "grep",
      "--null",
      "-n",
      "--full-name",
      ...options,
      ...searchTerm
    ];
    return this._runTask({
      commands,
      format: "utf-8",
      parser(stdOut) {
        return parseGrep(stdOut);
      }
    }, then);
  } };
}
var disallowedOptions;
var Query;
var _a;
var GrepQuery;
var init_grep = __esm({ "src/lib/tasks/grep.ts"() {
  init_utils();
  init_task();
  disallowedOptions = ["-h"];
  Query = Symbol("grepQuery");
  GrepQuery = class {
    constructor() {
      this[_a] = [];
    }
    *[(_a = Query, Symbol.iterator)]() {
      for (const query of this[Query])
        yield query;
    }
    and(...and) {
      and.length && this[Query].push("--and", "(", ...prefixedArray(and, "-e"), ")");
      return this;
    }
    param(...param) {
      this[Query].push(...prefixedArray(param, "-e"));
      return this;
    }
  };
} });
var reset_exports = {};
__export(reset_exports, {
  ResetMode: () => ResetMode,
  getResetMode: () => getResetMode,
  resetTask: () => resetTask
});
function resetTask(mode, customArgs) {
  const commands = ["reset"];
  if (isValidResetMode(mode))
    commands.push(`--${mode}`);
  commands.push(...customArgs);
  return straightThroughStringTask(commands);
}
function getResetMode(mode) {
  if (isValidResetMode(mode))
    return mode;
  switch (typeof mode) {
    case "string":
    case "undefined":
      return "soft";
  }
}
function isValidResetMode(mode) {
  return typeof mode === "string" && validResetModes.includes(mode);
}
var ResetMode;
var validResetModes;
var init_reset = __esm({ "src/lib/tasks/reset.ts"() {
  init_utils();
  init_task();
  ResetMode = /* @__PURE__ */ ((ResetMode2) => {
    ResetMode2["MIXED"] = "mixed";
    ResetMode2["SOFT"] = "soft";
    ResetMode2["HARD"] = "hard";
    ResetMode2["MERGE"] = "merge";
    ResetMode2["KEEP"] = "keep";
    return ResetMode2;
  })(ResetMode || {});
  validResetModes = asStringArray(Object.values(ResetMode));
} });
function createLog() {
  return (0, import_src3.default)("simple-git");
}
function prefixedLogger(to, prefix, forward) {
  if (!prefix || !String(prefix).replace(/\s*/, ""))
    return !forward ? to : (message, ...args) => {
      to(message, ...args);
      forward(message, ...args);
    };
  return (message, ...args) => {
    to(`%s ${message}`, prefix, ...args);
    if (forward)
      forward(message, ...args);
  };
}
function childLoggerName(name, childDebugger, { namespace: parentNamespace }) {
  if (typeof name === "string")
    return name;
  const childNamespace = childDebugger && childDebugger.namespace || "";
  if (childNamespace.startsWith(parentNamespace))
    return childNamespace.substr(parentNamespace.length + 1);
  return childNamespace || parentNamespace;
}
function createLogger(label, verbose, initialStep, infoDebugger = createLog()) {
  const labelPrefix = label && `[${label}]` || "";
  const spawned = [];
  const debugDebugger = typeof verbose === "string" ? infoDebugger.extend(verbose) : verbose;
  const key = childLoggerName(filterType(verbose, filterString), debugDebugger, infoDebugger);
  return step(initialStep);
  function sibling(name, initial) {
    return append(spawned, createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger));
  }
  function step(phase) {
    const stepPrefix = phase && `[${phase}]` || "";
    const debug2 = debugDebugger && prefixedLogger(debugDebugger, stepPrefix) || NOOP;
    const info = prefixedLogger(infoDebugger, `${labelPrefix} ${stepPrefix}`, debug2);
    return Object.assign(debugDebugger ? debug2 : info, {
      label,
      sibling,
      info,
      step
    });
  }
}
var init_git_logger = __esm({ "src/lib/git-logger.ts"() {
  init_utils();
  import_src3.default.formatters.L = (value) => String(filterHasLength(value) ? value.length : "-");
  import_src3.default.formatters.B = (value) => {
    if (Buffer.isBuffer(value))
      return value.toString("utf8");
    return objectToString(value);
  };
} });
var TasksPendingQueue;
var init_tasks_pending_queue = __esm({ "src/lib/runners/tasks-pending-queue.ts"() {
  init_git_error();
  init_git_logger();
  TasksPendingQueue = class _TasksPendingQueue {
    constructor(logLabel = "GitExecutor") {
      this.logLabel = logLabel;
      this._queue = /* @__PURE__ */ new Map;
    }
    withProgress(task) {
      return this._queue.get(task);
    }
    createProgress(task) {
      const name = _TasksPendingQueue.getName(task.commands[0]);
      return {
        task,
        logger: createLogger(this.logLabel, name),
        name
      };
    }
    push(task) {
      const progress = this.createProgress(task);
      progress.logger("Adding task to the queue, commands = %o", task.commands);
      this._queue.set(task, progress);
      return progress;
    }
    fatal(err) {
      for (const [task, { logger }] of Array.from(this._queue.entries())) {
        if (task === err.task) {
          logger.info(`Failed %o`, err);
          logger(`Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`);
        } else
          logger.info(`A fatal exception occurred in a previous task, the queue has been purged: %o`, err.message);
        this.complete(task);
      }
      if (this._queue.size !== 0)
        throw new Error(`Queue size should be zero after fatal: ${this._queue.size}`);
    }
    complete(task) {
      if (this.withProgress(task))
        this._queue.delete(task);
    }
    attempt(task) {
      const progress = this.withProgress(task);
      if (!progress)
        throw new GitError(undefined, "TasksPendingQueue: attempt called for an unknown task");
      progress.logger("Starting task");
      return progress;
    }
    static getName(name = "empty") {
      return `task:${name}:${++_TasksPendingQueue.counter}`;
    }
    static {
      this.counter = 0;
    }
  };
} });
function pluginContext(task, commands) {
  return {
    method: first(task.commands) || "",
    commands
  };
}
function onErrorReceived(target, logger) {
  return (err) => {
    logger(`[ERROR] child process exception %o`, err);
    target.push(Buffer.from(String(err.stack), "ascii"));
  };
}
function onDataReceived(target, name, logger, output) {
  return (buffer) => {
    logger(`%s received %L bytes`, name, buffer);
    output(`%B`, buffer);
    target.push(buffer);
  };
}
var GitExecutorChain;
var init_git_executor_chain = __esm({ "src/lib/runners/git-executor-chain.ts"() {
  init_git_error();
  init_task();
  init_utils();
  init_tasks_pending_queue();
  GitExecutorChain = class {
    constructor(_executor, _scheduler, _plugins) {
      this._executor = _executor;
      this._scheduler = _scheduler;
      this._plugins = _plugins;
      this._chain = Promise.resolve();
      this._queue = new TasksPendingQueue;
    }
    get cwd() {
      return this._cwd || this._executor.cwd;
    }
    set cwd(cwd) {
      this._cwd = cwd;
    }
    get env() {
      return this._executor.env;
    }
    get outputHandler() {
      return this._executor.outputHandler;
    }
    chain() {
      return this;
    }
    push(task) {
      this._queue.push(task);
      return this._chain = this._chain.then(() => this.attemptTask(task));
    }
    async attemptTask(task) {
      const onScheduleComplete = await this._scheduler.next();
      const onQueueComplete = () => this._queue.complete(task);
      try {
        const { logger } = this._queue.attempt(task);
        return await (isEmptyTask(task) ? this.attemptEmptyTask(task, logger) : this.attemptRemoteTask(task, logger));
      } catch (e) {
        throw this.onFatalException(task, e);
      } finally {
        onQueueComplete();
        onScheduleComplete();
      }
    }
    onFatalException(task, e) {
      const gitError = e instanceof GitError ? Object.assign(e, { task }) : new GitError(task, e && String(e));
      this._chain = Promise.resolve();
      this._queue.fatal(gitError);
      return gitError;
    }
    async attemptRemoteTask(task, logger) {
      const binary = this._plugins.exec("spawn.binary", "", pluginContext(task, task.commands));
      const args = this._plugins.exec("spawn.args", [...task.commands], {
        ...pluginContext(task, task.commands),
        env: { ...this.env }
      });
      const raw = await this.gitResponse(task, binary, args, this.outputHandler, logger.step("SPAWN"));
      const outputStreams = await this.handleTaskData(task, args, raw, logger.step("HANDLE"));
      logger(`passing response to task's parser as a %s`, task.format);
      if (isBufferTask(task))
        return callTaskParser(task.parser, outputStreams);
      return callTaskParser(task.parser, outputStreams.asStrings());
    }
    async attemptEmptyTask(task, logger) {
      logger(`empty task bypassing child process to call to task's parser`);
      return task.parser(this);
    }
    handleTaskData(task, args, result, logger) {
      const { exitCode, rejection, stdOut, stdErr } = result;
      return new Promise((done, fail) => {
        logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);
        const { error } = this._plugins.exec("task.error", { error: rejection }, {
          ...pluginContext(task, args),
          ...result
        });
        if (error && task.onError) {
          logger.info(`exitCode=%s handling with custom error handler`);
          return task.onError(result, error, (newStdOut) => {
            logger.info(`custom error handler treated as success`);
            logger(`custom error returned a %s`, objectToString(newStdOut));
            done(new GitOutputStreams(Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut, Buffer.concat(stdErr)));
          }, fail);
        }
        if (error) {
          logger.info(`handling as error: exitCode=%s stdErr=%s rejection=%o`, exitCode, stdErr.length, rejection);
          return fail(error);
        }
        logger.info(`retrieving task output complete`);
        done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
      });
    }
    async gitResponse(task, command, args, outputHandler, logger) {
      const outputLogger = logger.sibling("output");
      const spawnOptions = this._plugins.exec("spawn.options", {
        cwd: this.cwd,
        env: this.env,
        windowsHide: true
      }, pluginContext(task, task.commands));
      return new Promise((done) => {
        const stdOut = [];
        const stdErr = [];
        logger.info(`%s %o`, command, args);
        logger("%O", spawnOptions);
        let rejection = this._beforeSpawn(task, args);
        if (rejection)
          return done({
            stdOut,
            stdErr,
            exitCode: 9901,
            rejection
          });
        this._plugins.exec("spawn.before", undefined, {
          ...pluginContext(task, args),
          kill(reason) {
            rejection = reason || rejection;
          }
        });
        const spawned = spawn(command, args, spawnOptions);
        spawned.stdout.on("data", onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut")));
        spawned.stderr.on("data", onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr")));
        spawned.on("error", onErrorReceived(stdErr, logger));
        if (outputHandler) {
          logger(`Passing child process stdOut/stdErr to custom outputHandler`);
          outputHandler(command, spawned.stdout, spawned.stderr, [...args]);
        }
        this._plugins.exec("spawn.after", undefined, {
          ...pluginContext(task, args),
          spawned,
          close(exitCode, reason) {
            done({
              stdOut,
              stdErr,
              exitCode,
              rejection: rejection || reason
            });
          },
          kill(reason) {
            if (spawned.killed)
              return;
            rejection = reason;
            spawned.kill("SIGINT");
          }
        });
      });
    }
    _beforeSpawn(task, args) {
      let rejection;
      this._plugins.exec("spawn.before", undefined, {
        ...pluginContext(task, args),
        kill(reason) {
          rejection = reason || rejection;
        }
      });
      return rejection;
    }
  };
} });
var git_executor_exports = {};
__export(git_executor_exports, { GitExecutor: () => GitExecutor });
var GitExecutor;
var init_git_executor = __esm({ "src/lib/runners/git-executor.ts"() {
  init_git_executor_chain();
  GitExecutor = class {
    constructor(cwd, _scheduler, _plugins) {
      this.cwd = cwd;
      this._scheduler = _scheduler;
      this._plugins = _plugins;
      this._chain = new GitExecutorChain(this, this._scheduler, this._plugins);
    }
    chain() {
      return new GitExecutorChain(this, this._scheduler, this._plugins);
    }
    push(task) {
      return this._chain.push(task);
    }
  };
} });
function taskCallback(task, response, callback = NOOP) {
  const onSuccess = (data) => {
    callback(null, data);
  };
  const onError2 = (err) => {
    if (err?.task === task)
      callback(err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err, undefined);
  };
  response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
  let log2 = (name) => {
    console.warn(`simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`);
    log2 = NOOP;
  };
  return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));
  function descriptorReducer(all, name) {
    if (name in err)
      return all;
    all[name] = {
      enumerable: false,
      configurable: false,
      get() {
        log2(name);
        return err.git[name];
      }
    };
    return all;
  }
}
var init_task_callback = __esm({ "src/lib/task-callback.ts"() {
  init_git_response_error();
  init_utils();
} });
function changeWorkingDirectoryTask(directory, root) {
  return adhocExecTask((instance) => {
    if (!folderExists(directory))
      throw new Error(`Git.cwd: cannot change to non-directory "${directory}"`);
    return (root || instance).cwd = directory;
  });
}
var init_change_working_directory = __esm({ "src/lib/tasks/change-working-directory.ts"() {
  init_utils();
  init_task();
} });
function checkoutTask(args) {
  const commands = ["checkout", ...args];
  if (commands[1] === "-b" && commands.includes("-B"))
    commands[1] = remove(commands, "-B");
  return straightThroughStringTask(commands);
}
function checkout_default() {
  return {
    checkout() {
      return this._runTask(checkoutTask(getTrailingOptions(arguments, 1)), trailingFunctionArgument(arguments));
    },
    checkoutBranch(branchName, startPoint) {
      return this._runTask(checkoutTask([
        "-b",
        branchName,
        startPoint,
        ...getTrailingOptions(arguments)
      ]), trailingFunctionArgument(arguments));
    },
    checkoutLocalBranch(branchName) {
      return this._runTask(checkoutTask([
        "-b",
        branchName,
        ...getTrailingOptions(arguments)
      ]), trailingFunctionArgument(arguments));
    }
  };
}
var init_checkout = __esm({ "src/lib/tasks/checkout.ts"() {
  init_utils();
  init_task();
} });
function countObjectsResponse() {
  return {
    count: 0,
    garbage: 0,
    inPack: 0,
    packs: 0,
    prunePackable: 0,
    size: 0,
    sizeGarbage: 0,
    sizePack: 0
  };
}
function count_objects_default() {
  return { countObjects() {
    return this._runTask({
      commands: ["count-objects", "--verbose"],
      format: "utf-8",
      parser(stdOut) {
        return parseStringResponse(countObjectsResponse(), [parser2], stdOut);
      }
    });
  } };
}
var parser2;
var init_count_objects = __esm({ "src/lib/tasks/count-objects.ts"() {
  init_utils();
  parser2 = new LineParser(/([a-z-]+): (\d+)$/, (result, [key, value]) => {
    const property = asCamelCase(key);
    if (Object.hasOwn(result, property))
      result[property] = asNumber(value);
  });
} });
function parseCommitResult(stdOut) {
  return parseStringResponse({
    author: null,
    branch: "",
    commit: "",
    root: false,
    summary: {
      changes: 0,
      insertions: 0,
      deletions: 0
    }
  }, parsers, stdOut);
}
var parsers;
var init_parse_commit = __esm({ "src/lib/parsers/parse-commit.ts"() {
  init_utils();
  parsers = [
    new LineParser(/^\[([^\s]+)( \([^)]+\))? ([^\]]+)/, (result, [branch, root, commit]) => {
      result.branch = branch;
      result.commit = commit;
      result.root = !!root;
    }),
    new LineParser(/\s*Author:\s(.+)/i, (result, [author]) => {
      const parts = author.split("<");
      const email = parts.pop();
      if (!email || !email.includes("@"))
        return;
      result.author = {
        email: email.substr(0, email.length - 1),
        name: parts.join("<").trim()
      };
    }),
    new LineParser(/(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g, (result, [changes, insertions, deletions]) => {
      result.summary.changes = parseInt(changes, 10) || 0;
      result.summary.insertions = parseInt(insertions, 10) || 0;
      result.summary.deletions = parseInt(deletions, 10) || 0;
    }),
    new LineParser(/^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/, (result, [changes, lines, direction]) => {
      result.summary.changes = parseInt(changes, 10) || 0;
      const count = parseInt(lines, 10) || 0;
      if (direction === "-")
        result.summary.deletions = count;
      else if (direction === "+")
        result.summary.insertions = count;
    })
  ];
} });
function commitTask(message, files, customArgs) {
  return {
    commands: [
      "-c",
      "core.abbrev=40",
      "commit",
      ...prefixedArray(message, "-m"),
      ...files,
      ...customArgs
    ],
    format: "utf-8",
    parser: parseCommitResult
  };
}
function commit_default() {
  return { commit(message, ...rest) {
    const next = trailingFunctionArgument(arguments);
    const task = rejectDeprecatedSignatures(message) || commitTask(asArray(message), asArray(filterType(rest[0], filterStringOrStringArray, [])), [...asStringArray(filterType(rest[1], filterArray, [])), ...getTrailingOptions(arguments, 0, true)]);
    return this._runTask(task, next);
  } };
  function rejectDeprecatedSignatures(message) {
    return !filterStringOrStringArray(message) && configurationErrorTask(`git.commit: requires the commit message to be supplied as a string/string[]`);
  }
}
var init_commit = __esm({ "src/lib/tasks/commit.ts"() {
  init_parse_commit();
  init_utils();
  init_task();
} });
function first_commit_default() {
  return { firstCommit() {
    return this._runTask(straightThroughStringTask([
      "rev-list",
      "--max-parents=0",
      "HEAD"
    ], true), trailingFunctionArgument(arguments));
  } };
}
var init_first_commit = __esm({ "src/lib/tasks/first-commit.ts"() {
  init_utils();
  init_task();
} });
function hashObjectTask(filePath, write) {
  const commands = ["hash-object", filePath];
  if (write)
    commands.push("-w");
  return straightThroughStringTask(commands, true);
}
var init_hash_object = __esm({ "src/lib/tasks/hash-object.ts"() {
  init_task();
} });
function parseInit(bare, path, text) {
  const response = String(text).trim();
  let result;
  if (result = initResponseRegex.exec(response))
    return new InitSummary(bare, path, false, result[1]);
  if (result = reInitResponseRegex.exec(response))
    return new InitSummary(bare, path, true, result[1]);
  let gitDir = "";
  const tokens = response.split(" ");
  while (tokens.length)
    if (tokens.shift() === "in") {
      gitDir = tokens.join(" ");
      break;
    }
  return new InitSummary(bare, path, /^re/i.test(response), gitDir);
}
var InitSummary;
var initResponseRegex;
var reInitResponseRegex;
var init_InitSummary = __esm({ "src/lib/responses/InitSummary.ts"() {
  InitSummary = class {
    constructor(bare, path, existing, gitDir) {
      this.bare = bare;
      this.path = path;
      this.existing = existing;
      this.gitDir = gitDir;
    }
  };
  initResponseRegex = /^Init.+ repository in (.+)$/;
  reInitResponseRegex = /^Rein.+ in (.+)$/;
} });
function hasBareCommand(command) {
  return command.includes(bareCommand);
}
function initTask(bare = false, path, customArgs) {
  const commands = ["init", ...customArgs];
  if (bare && !hasBareCommand(commands))
    commands.splice(1, 0, bareCommand);
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return parseInit(commands.includes("--bare"), path, text);
    }
  };
}
var bareCommand;
var init_init = __esm({ "src/lib/tasks/init.ts"() {
  init_InitSummary();
  bareCommand = "--bare";
} });
function logFormatFromCommand(customArgs) {
  for (let i2 = 0;i2 < customArgs.length; i2++) {
    const format = logFormatRegex.exec(customArgs[i2]);
    if (format)
      return `--${format[1]}`;
  }
  return "";
}
function isLogFormat(customArg) {
  return logFormatRegex.test(customArg);
}
var logFormatRegex;
var init_log_format = __esm({ "src/lib/args/log-format.ts"() {
  logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
} });
var DiffSummary;
var init_DiffSummary = __esm({ "src/lib/responses/DiffSummary.ts"() {
  DiffSummary = class {
    constructor() {
      this.changed = 0;
      this.deletions = 0;
      this.insertions = 0;
      this.files = [];
    }
  };
} });
function getDiffParser(format = "") {
  const parser4 = diffSummaryParsers[format];
  return (stdOut) => parseStringResponse(new DiffSummary, parser4, stdOut, false);
}
var statParser;
var numStatParser;
var nameOnlyParser;
var nameStatusParser;
var diffSummaryParsers;
var init_parse_diff_summary = __esm({ "src/lib/parsers/parse-diff-summary.ts"() {
  init_log_format();
  init_DiffSummary();
  init_diff_name_status();
  init_utils();
  statParser = [
    new LineParser(/^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/, (result, [file, changes, alterations = ""]) => {
      result.files.push({
        file: file.trim(),
        changes: asNumber(changes),
        insertions: alterations.replace(/[^+]/g, "").length,
        deletions: alterations.replace(/[^-]/g, "").length,
        binary: false
      });
    }),
    new LineParser(/^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/, (result, [file, before, after]) => {
      result.files.push({
        file: file.trim(),
        before: asNumber(before),
        after: asNumber(after),
        binary: true
      });
    }),
    new LineParser(/(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/, (result, [changed, summary]) => {
      const inserted = /(\d+) i/.exec(summary);
      const deleted = /(\d+) d/.exec(summary);
      result.changed = asNumber(changed);
      result.insertions = asNumber(inserted?.[1]);
      result.deletions = asNumber(deleted?.[1]);
    })
  ];
  numStatParser = [new LineParser(/(\d+)\t(\d+)\t(.+)$/, (result, [changesInsert, changesDelete, file]) => {
    const insertions = asNumber(changesInsert);
    const deletions = asNumber(changesDelete);
    result.changed++;
    result.insertions += insertions;
    result.deletions += deletions;
    result.files.push({
      file,
      changes: insertions + deletions,
      insertions,
      deletions,
      binary: false
    });
  }), new LineParser(/-\t-\t(.+)$/, (result, [file]) => {
    result.changed++;
    result.files.push({
      file,
      after: 0,
      before: 0,
      binary: true
    });
  })];
  nameOnlyParser = [new LineParser(/(.+)$/, (result, [file]) => {
    result.changed++;
    result.files.push({
      file,
      changes: 0,
      insertions: 0,
      deletions: 0,
      binary: false
    });
  })];
  nameStatusParser = [new LineParser(/([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/, (result, [status, similarity, from, _to, to]) => {
    result.changed++;
    result.files.push({
      file: to ?? from,
      changes: 0,
      insertions: 0,
      deletions: 0,
      binary: false,
      status: orVoid(isDiffNameStatus(status) && status),
      from: orVoid(!!to && from !== to && from),
      similarity: asNumber(similarity)
    });
  })];
  diffSummaryParsers = {
    [""]: statParser,
    ["--stat"]: statParser,
    ["--numstat"]: numStatParser,
    ["--name-status"]: nameStatusParser,
    ["--name-only"]: nameOnlyParser
  };
} });
function lineBuilder(tokens, fields) {
  return fields.reduce((line, field, index) => {
    line[field] = tokens[index] || "";
    return line;
  }, /* @__PURE__ */ Object.create({ diff: null }));
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
  const parseDiffResult = getDiffParser(logFormat);
  return function(stdOut) {
    const all = toLinesWithContent(stdOut.trim(), false, START_BOUNDARY).map(function(item) {
      const lineDetail = item.split(COMMIT_BOUNDARY);
      const listLogLine = lineBuilder(lineDetail[0].split(splitter), fields);
      if (lineDetail.length > 1 && !!lineDetail[1].trim())
        listLogLine.diff = parseDiffResult(lineDetail[1]);
      return listLogLine;
    });
    return {
      all,
      latest: all.length && all[0] || null,
      total: all.length
    };
  };
}
var START_BOUNDARY;
var COMMIT_BOUNDARY;
var SPLITTER;
var defaultFieldNames;
var init_parse_list_log_summary = __esm({ "src/lib/parsers/parse-list-log-summary.ts"() {
  init_utils();
  init_parse_diff_summary();
  init_log_format();
  START_BOUNDARY = "òòòòòò ";
  COMMIT_BOUNDARY = " òò";
  SPLITTER = " ò ";
  defaultFieldNames = [
    "hash",
    "date",
    "message",
    "refs",
    "author_name",
    "author_email"
  ];
} });
var diff_exports = {};
__export(diff_exports, {
  diffSummaryTask: () => diffSummaryTask,
  validateLogFormatConfig: () => validateLogFormatConfig
});
function diffSummaryTask(customArgs) {
  let logFormat = logFormatFromCommand(customArgs);
  const commands = ["diff"];
  if (logFormat === "") {
    logFormat = "--stat";
    commands.push("--stat=4096");
  }
  commands.push(...customArgs);
  return validateLogFormatConfig(commands) || {
    commands,
    format: "utf-8",
    parser: getDiffParser(logFormat)
  };
}
function validateLogFormatConfig(customArgs) {
  const flags = customArgs.filter(isLogFormat);
  if (flags.length > 1)
    return configurationErrorTask(`Summary flags are mutually exclusive - pick one of ${flags.join(",")}`);
  if (flags.length && customArgs.includes("-z"))
    return configurationErrorTask(`Summary flag ${flags} parsing is not compatible with null termination option '-z'`);
}
var init_diff = __esm({ "src/lib/tasks/diff.ts"() {
  init_log_format();
  init_parse_diff_summary();
  init_task();
} });
function prettyFormat(format, splitter) {
  const fields = [];
  const formatStr = [];
  Object.keys(format).forEach((field) => {
    fields.push(field);
    formatStr.push(String(format[field]));
  });
  return [fields, formatStr.join(splitter)];
}
function userOptions(input) {
  return Object.keys(input).reduce((out, key) => {
    if (!(key in excludeOptions))
      out[key] = input[key];
    return out;
  }, {});
}
function parseLogOptions(opt = {}, customArgs = []) {
  const splitter = filterType(opt.splitter, filterString, SPLITTER);
  const [fields, formatStr] = prettyFormat(filterPlainObject(opt.format) ? opt.format : {
    hash: "%H",
    date: opt.strictDate === false ? "%ai" : "%aI",
    message: "%s",
    refs: "%D",
    body: opt.multiLine ? "%B" : "%b",
    author_name: opt.mailMap !== false ? "%aN" : "%an",
    author_email: opt.mailMap !== false ? "%aE" : "%ae"
  }, splitter);
  const suffix = [];
  const command = [`--pretty=format:${START_BOUNDARY}${formatStr}${COMMIT_BOUNDARY}`, ...customArgs];
  const maxCount = opt.n || opt["max-count"] || opt.maxCount;
  if (maxCount)
    command.push(`--max-count=${maxCount}`);
  if (opt.from || opt.to) {
    const rangeOperator = opt.symmetric !== false ? "..." : "..";
    suffix.push(`${opt.from || ""}${rangeOperator}${opt.to || ""}`);
  }
  if (filterString(opt.file))
    command.push("--follow", c2(opt.file));
  appendTaskOptions(userOptions(opt), command);
  return {
    fields,
    splitter,
    commands: [...command, ...suffix]
  };
}
function logTask(splitter, fields, customArgs) {
  const parser4 = createListLogSummaryParser(splitter, fields, logFormatFromCommand(customArgs));
  return {
    commands: ["log", ...customArgs],
    format: "utf-8",
    parser: parser4
  };
}
function log_default() {
  return { log(...rest) {
    const next = trailingFunctionArgument(arguments);
    const options = parseLogOptions(trailingOptionsArgument(arguments), asStringArray(filterType(arguments[0], filterArray, [])));
    const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
    return this._runTask(task, next);
  } };
  function createLogTask(options) {
    return logTask(options.splitter, options.fields, options.commands);
  }
  function rejectDeprecatedSignatures(from, to) {
    return filterString(from) && filterString(to) && configurationErrorTask(`git.log(string, string) should be replaced with git.log({ from: string, to: string })`);
  }
}
var excludeOptions;
var init_log = __esm({ "src/lib/tasks/log.ts"() {
  init_log_format();
  init_parse_list_log_summary();
  init_utils();
  init_task();
  init_diff();
  excludeOptions = /* @__PURE__ */ ((excludeOptions2) => {
    excludeOptions2[excludeOptions2["--pretty"] = 0] = "--pretty";
    excludeOptions2[excludeOptions2["max-count"] = 1] = "max-count";
    excludeOptions2[excludeOptions2["maxCount"] = 2] = "maxCount";
    excludeOptions2[excludeOptions2["n"] = 3] = "n";
    excludeOptions2[excludeOptions2["file"] = 4] = "file";
    excludeOptions2[excludeOptions2["format"] = 5] = "format";
    excludeOptions2[excludeOptions2["from"] = 6] = "from";
    excludeOptions2[excludeOptions2["to"] = 7] = "to";
    excludeOptions2[excludeOptions2["splitter"] = 8] = "splitter";
    excludeOptions2[excludeOptions2["symmetric"] = 9] = "symmetric";
    excludeOptions2[excludeOptions2["mailMap"] = 10] = "mailMap";
    excludeOptions2[excludeOptions2["multiLine"] = 11] = "multiLine";
    excludeOptions2[excludeOptions2["strictDate"] = 12] = "strictDate";
    return excludeOptions2;
  })(excludeOptions || {});
} });
var MergeSummaryConflict;
var MergeSummaryDetail;
var init_MergeSummary = __esm({ "src/lib/responses/MergeSummary.ts"() {
  MergeSummaryConflict = class {
    constructor(reason, file = null, meta) {
      this.reason = reason;
      this.file = file;
      this.meta = meta;
    }
    toString() {
      return `${this.file}:${this.reason}`;
    }
  };
  MergeSummaryDetail = class {
    constructor() {
      this.conflicts = [];
      this.merges = [];
      this.result = "success";
    }
    get failed() {
      return this.conflicts.length > 0;
    }
    get reason() {
      return this.result;
    }
    toString() {
      if (this.conflicts.length)
        return `CONFLICTS: ${this.conflicts.join(", ")}`;
      return "OK";
    }
  };
} });
var PullSummary;
var PullFailedSummary;
var init_PullSummary = __esm({ "src/lib/responses/PullSummary.ts"() {
  PullSummary = class {
    constructor() {
      this.remoteMessages = { all: [] };
      this.created = [];
      this.deleted = [];
      this.files = [];
      this.deletions = {};
      this.insertions = {};
      this.summary = {
        changes: 0,
        deletions: 0,
        insertions: 0
      };
    }
  };
  PullFailedSummary = class {
    constructor() {
      this.remote = "";
      this.hash = {
        local: "",
        remote: ""
      };
      this.branch = {
        local: "",
        remote: ""
      };
      this.message = "";
    }
    toString() {
      return this.message;
    }
  };
} });
function objectEnumerationResult(remoteMessages) {
  return remoteMessages.objects = remoteMessages.objects || {
    compressing: 0,
    counting: 0,
    enumerating: 0,
    packReused: 0,
    reused: {
      count: 0,
      delta: 0
    },
    total: {
      count: 0,
      delta: 0
    }
  };
}
function asObjectCount(source) {
  const count = /^\s*(\d+)/.exec(source);
  const delta = /delta (\d+)/i.exec(source);
  return {
    count: asNumber(count && count[1] || "0"),
    delta: asNumber(delta && delta[1] || "0")
  };
}
var remoteMessagesObjectParsers;
var init_parse_remote_objects = __esm({ "src/lib/parsers/parse-remote-objects.ts"() {
  init_utils();
  remoteMessagesObjectParsers = [
    new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i, (result, [action, count]) => {
      const key = action.toLowerCase();
      const enumeration = objectEnumerationResult(result.remoteMessages);
      Object.assign(enumeration, { [key]: asNumber(count) });
    }),
    new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i, (result, [action, count]) => {
      const key = action.toLowerCase();
      const enumeration = objectEnumerationResult(result.remoteMessages);
      Object.assign(enumeration, { [key]: asNumber(count) });
    }),
    new RemoteLineParser(/total ([^,]+), reused ([^,]+), pack-reused (\d+)/i, (result, [total, reused, packReused]) => {
      const objects = objectEnumerationResult(result.remoteMessages);
      objects.total = asObjectCount(total);
      objects.reused = asObjectCount(reused);
      objects.packReused = asNumber(packReused);
    })
  ];
} });
function parseRemoteMessages(_stdOut, stdErr) {
  return parseStringResponse({ remoteMessages: new RemoteMessageSummary }, parsers2, stdErr);
}
var parsers2;
var RemoteMessageSummary;
var init_parse_remote_messages = __esm({ "src/lib/parsers/parse-remote-messages.ts"() {
  init_utils();
  init_parse_remote_objects();
  parsers2 = [
    new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
      result.remoteMessages.all.push(text.trim());
      return false;
    }),
    ...remoteMessagesObjectParsers,
    new RemoteLineParser([/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/], (result, [pullRequestUrl]) => {
      result.remoteMessages.pullRequestUrl = pullRequestUrl;
    }),
    new RemoteLineParser([/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/], (result, [count, summary, url]) => {
      result.remoteMessages.vulnerabilities = {
        count: asNumber(count),
        summary,
        url
      };
    })
  ];
  RemoteMessageSummary = class {
    constructor() {
      this.all = [];
    }
  };
} });
function parsePullErrorResult(stdOut, stdErr) {
  const pullError = parseStringResponse(new PullFailedSummary, errorParsers, [stdOut, stdErr]);
  return pullError.message && pullError;
}
var FILE_UPDATE_REGEX;
var SUMMARY_REGEX;
var ACTION_REGEX;
var parsers3;
var errorParsers;
var parsePullDetail;
var parsePullResult;
var init_parse_pull = __esm({ "src/lib/parsers/parse-pull.ts"() {
  init_PullSummary();
  init_utils();
  init_parse_remote_messages();
  FILE_UPDATE_REGEX = /^\s*(.+?)\s+\|\s+\d+\s*(\+*)(-*)/;
  SUMMARY_REGEX = /(\d+)\D+((\d+)\D+\(\+\))?(\D+(\d+)\D+\(-\))?/;
  ACTION_REGEX = /^(create|delete) mode \d+ (.+)/;
  parsers3 = [
    new LineParser(FILE_UPDATE_REGEX, (result, [file, insertions, deletions]) => {
      result.files.push(file);
      if (insertions)
        result.insertions[file] = insertions.length;
      if (deletions)
        result.deletions[file] = deletions.length;
    }),
    new LineParser(SUMMARY_REGEX, (result, [changes, , insertions, , deletions]) => {
      if (insertions !== undefined || deletions !== undefined) {
        result.summary.changes = +changes || 0;
        result.summary.insertions = +insertions || 0;
        result.summary.deletions = +deletions || 0;
        return true;
      }
      return false;
    }),
    new LineParser(ACTION_REGEX, (result, [action, file]) => {
      append(result.files, file);
      append(action === "create" ? result.created : result.deleted, file);
    })
  ];
  errorParsers = [
    new LineParser(/^from\s(.+)$/i, (result, [remote]) => void (result.remote = remote)),
    new LineParser(/^fatal:\s(.+)$/, (result, [message]) => void (result.message = message)),
    new LineParser(/([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/, (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
      result.branch.local = branchLocal;
      result.hash.local = hashLocal;
      result.branch.remote = branchRemote;
      result.hash.remote = hashRemote;
    })
  ];
  parsePullDetail = (stdOut, stdErr) => {
    return parseStringResponse(new PullSummary, parsers3, [stdOut, stdErr]);
  };
  parsePullResult = (stdOut, stdErr) => {
    return Object.assign(new PullSummary, parsePullDetail(stdOut, stdErr), parseRemoteMessages(stdOut, stdErr));
  };
} });
var parsers4;
var parseMergeResult;
var parseMergeDetail;
var init_parse_merge = __esm({ "src/lib/parsers/parse-merge.ts"() {
  init_MergeSummary();
  init_utils();
  init_parse_pull();
  parsers4 = [
    new LineParser(/^Auto-merging\s+(.+)$/, (summary, [autoMerge]) => {
      summary.merges.push(autoMerge);
    }),
    new LineParser(/^CONFLICT\s+\((.+)\): Merge conflict in (.+)$/, (summary, [reason, file]) => {
      summary.conflicts.push(new MergeSummaryConflict(reason, file));
    }),
    new LineParser(/^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/, (summary, [reason, file, deleteRef]) => {
      summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
    }),
    new LineParser(/^CONFLICT\s+\((.+)\):/, (summary, [reason]) => {
      summary.conflicts.push(new MergeSummaryConflict(reason, null));
    }),
    new LineParser(/^Automatic merge failed;\s+(.+)$/, (summary, [result]) => {
      summary.result = result;
    })
  ];
  parseMergeResult = (stdOut, stdErr) => {
    return Object.assign(parseMergeDetail(stdOut, stdErr), parsePullResult(stdOut, stdErr));
  };
  parseMergeDetail = (stdOut) => {
    return parseStringResponse(new MergeSummaryDetail, parsers4, stdOut);
  };
} });
function mergeTask(customArgs) {
  if (!customArgs.length)
    return configurationErrorTask("Git.merge requires at least one option");
  return {
    commands: ["merge", ...customArgs],
    format: "utf-8",
    parser(stdOut, stdErr) {
      const merge = parseMergeResult(stdOut, stdErr);
      if (merge.failed)
        throw new GitResponseError(merge);
      return merge;
    }
  };
}
var init_merge = __esm({ "src/lib/tasks/merge.ts"() {
  init_git_response_error();
  init_parse_merge();
  init_task();
} });
function pushResultPushedItem(local, remote, status) {
  const deleted = status.includes("deleted");
  const tag = status.includes("tag") || /^refs\/tags/.test(local);
  const alreadyUpdated = !status.includes("new");
  return {
    deleted,
    tag,
    branch: !tag,
    new: !alreadyUpdated,
    alreadyUpdated,
    local,
    remote
  };
}
var parsers5;
var parsePushResult;
var parsePushDetail;
var init_parse_push = __esm({ "src/lib/parsers/parse-push.ts"() {
  init_utils();
  init_parse_remote_messages();
  parsers5 = [
    new LineParser(/^Pushing to (.+)$/, (result, [repo]) => {
      result.repo = repo;
    }),
    new LineParser(/^updating local tracking ref '(.+)'/, (result, [local]) => {
      result.ref = {
        ...result.ref || {},
        local
      };
    }),
    new LineParser(/^[=*-]\s+([^:]+):(\S+)\s+\[(.+)]$/, (result, [local, remote, type]) => {
      result.pushed.push(pushResultPushedItem(local, remote, type));
    }),
    new LineParser(/^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/, (result, [local, remote, remoteName]) => {
      result.branch = {
        ...result.branch || {},
        local,
        remote,
        remoteName
      };
    }),
    new LineParser(/^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/, (result, [local, remote, from, to]) => {
      result.update = {
        head: {
          local,
          remote
        },
        hash: {
          from,
          to
        }
      };
    })
  ];
  parsePushResult = (stdOut, stdErr) => {
    const pushDetail = parsePushDetail(stdOut, stdErr);
    const responseDetail = parseRemoteMessages(stdOut, stdErr);
    return {
      ...pushDetail,
      ...responseDetail
    };
  };
  parsePushDetail = (stdOut, stdErr) => {
    return parseStringResponse({ pushed: [] }, parsers5, [stdOut, stdErr]);
  };
} });
var push_exports = {};
__export(push_exports, {
  pushTagsTask: () => pushTagsTask,
  pushTask: () => pushTask
});
function pushTagsTask(ref = {}, customArgs) {
  append(customArgs, "--tags");
  return pushTask(ref, customArgs);
}
function pushTask(ref = {}, customArgs) {
  const commands = ["push", ...customArgs];
  if (ref.branch)
    commands.splice(1, 0, ref.branch);
  if (ref.remote)
    commands.splice(1, 0, ref.remote);
  remove(commands, "-v");
  append(commands, "--verbose");
  append(commands, "--porcelain");
  return {
    commands,
    format: "utf-8",
    parser: parsePushResult
  };
}
var init_push = __esm({ "src/lib/tasks/push.ts"() {
  init_parse_push();
  init_utils();
} });
function show_default() {
  return {
    showBuffer() {
      const commands = ["show", ...getTrailingOptions(arguments, 1)];
      if (!commands.includes("--binary"))
        commands.splice(1, 0, "--binary");
      return this._runTask(straightThroughBufferTask(commands), trailingFunctionArgument(arguments));
    },
    show() {
      const commands = ["show", ...getTrailingOptions(arguments, 1)];
      return this._runTask(straightThroughStringTask(commands), trailingFunctionArgument(arguments));
    }
  };
}
var init_show = __esm({ "src/lib/tasks/show.ts"() {
  init_utils();
  init_task();
} });
var fromPathRegex;
var FileStatusSummary;
var init_FileStatusSummary = __esm({ "src/lib/responses/FileStatusSummary.ts"() {
  fromPathRegex = /^(.+)\0(.+)$/;
  FileStatusSummary = class {
    constructor(path, index, working_dir) {
      this.path = path;
      this.index = index;
      this.working_dir = working_dir;
      if (index === "R" || working_dir === "R") {
        const detail = fromPathRegex.exec(path) || [
          null,
          path,
          path
        ];
        this.from = detail[2] || "";
        this.path = detail[1] || "";
      }
    }
  };
} });
function renamedFile(line) {
  const [to, from] = line.split(NULL);
  return {
    from: from || to,
    to
  };
}
function parser3(indexX, indexY, handler) {
  return [`${indexX}${indexY}`, handler];
}
function conflicts(indexX, ...indexY) {
  return indexY.map((y2) => parser3(indexX, y2, (result, file) => result.conflicted.push(file)));
}
function splitLine(result, lineStr) {
  const trimmed2 = lineStr.trim();
  switch (" ") {
    case trimmed2.charAt(2):
      return data(trimmed2.charAt(0), trimmed2.charAt(1), trimmed2.slice(3));
    case trimmed2.charAt(1):
      return data(" ", trimmed2.charAt(0), trimmed2.slice(2));
    default:
      return;
  }
  function data(index, workingDir, path) {
    const raw = `${index}${workingDir}`;
    const handler = parsers6.get(raw);
    if (handler)
      handler(result, path);
    if (raw !== "##" && raw !== "!!")
      result.files.push(new FileStatusSummary(path, index, workingDir));
  }
}
var StatusSummary;
var parsers6;
var parseStatusSummary;
var init_StatusSummary = __esm({ "src/lib/responses/StatusSummary.ts"() {
  init_utils();
  init_FileStatusSummary();
  StatusSummary = class {
    constructor() {
      this.not_added = [];
      this.conflicted = [];
      this.created = [];
      this.deleted = [];
      this.ignored = undefined;
      this.modified = [];
      this.renamed = [];
      this.files = [];
      this.staged = [];
      this.ahead = 0;
      this.behind = 0;
      this.current = null;
      this.tracking = null;
      this.detached = false;
      this.isClean = () => {
        return !this.files.length;
      };
    }
  };
  parsers6 = new Map([
    parser3(" ", "A", (result, file) => result.created.push(file)),
    parser3(" ", "D", (result, file) => result.deleted.push(file)),
    parser3(" ", "M", (result, file) => result.modified.push(file)),
    parser3("A", " ", (result, file) => {
      result.created.push(file);
      result.staged.push(file);
    }),
    parser3("A", "M", (result, file) => {
      result.created.push(file);
      result.staged.push(file);
      result.modified.push(file);
    }),
    parser3("D", " ", (result, file) => {
      result.deleted.push(file);
      result.staged.push(file);
    }),
    parser3("M", " ", (result, file) => {
      result.modified.push(file);
      result.staged.push(file);
    }),
    parser3("M", "M", (result, file) => {
      result.modified.push(file);
      result.staged.push(file);
    }),
    parser3("R", " ", (result, file) => {
      result.renamed.push(renamedFile(file));
    }),
    parser3("R", "M", (result, file) => {
      const renamed = renamedFile(file);
      result.renamed.push(renamed);
      result.modified.push(renamed.to);
    }),
    parser3("!", "!", (_result, _file) => {
      (_result.ignored = _result.ignored || []).push(_file);
    }),
    parser3("?", "?", (result, file) => result.not_added.push(file)),
    ...conflicts("A", "A", "U"),
    ...conflicts("D", "D", "U"),
    ...conflicts("U", "A", "D", "U"),
    ["##", (result, line) => {
      const aheadReg = /ahead (\d+)/;
      const behindReg = /behind (\d+)/;
      const currentReg = /^(.+?(?=(?:\.{3}|\s|$)))/;
      const trackingReg = /\.{3}(\S*)/;
      const onEmptyBranchReg = /\son\s(\S+?)(?=\.{3}|$)/;
      let regexResult = aheadReg.exec(line);
      result.ahead = regexResult && +regexResult[1] || 0;
      regexResult = behindReg.exec(line);
      result.behind = regexResult && +regexResult[1] || 0;
      regexResult = currentReg.exec(line);
      result.current = filterType(regexResult?.[1], filterString, null);
      regexResult = trackingReg.exec(line);
      result.tracking = filterType(regexResult?.[1], filterString, null);
      regexResult = onEmptyBranchReg.exec(line);
      if (regexResult)
        result.current = filterType(regexResult?.[1], filterString, result.current);
      result.detached = /\(no branch\)/.test(line);
    }]
  ]);
  parseStatusSummary = function(text) {
    const lines = text.split(NULL);
    const status = new StatusSummary;
    for (let i2 = 0, l2 = lines.length;i2 < l2; ) {
      let line = lines[i2++].trim();
      if (!line)
        continue;
      if (line.charAt(0) === "R")
        line += NULL + (lines[i2++] || "");
      splitLine(status, line);
    }
    return status;
  };
} });
function statusTask(customArgs) {
  return {
    format: "utf-8",
    commands: [
      "status",
      "--porcelain",
      "-b",
      "-u",
      "--null",
      ...customArgs.filter((arg) => !ignoredOptions.includes(arg))
    ],
    parser(text) {
      return parseStatusSummary(text);
    }
  };
}
var ignoredOptions;
var init_status = __esm({ "src/lib/tasks/status.ts"() {
  init_StatusSummary();
  ignoredOptions = ["--null", "-z"];
} });
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
  return Object.defineProperty({
    major,
    minor,
    patch,
    agent,
    installed
  }, "toString", {
    value() {
      return `${this.major}.${this.minor}.${this.patch}`;
    },
    configurable: false,
    enumerable: false
  });
}
function notInstalledResponse() {
  return versionResponse(0, 0, 0, "", false);
}
function version_default() {
  return { version() {
    return this._runTask({
      commands: ["--version"],
      format: "utf-8",
      parser: versionParser,
      onError(result, error, done, fail) {
        if (result.exitCode === -2)
          return done(Buffer.from(NOT_INSTALLED));
        fail(error);
      }
    });
  } };
}
function versionParser(stdOut) {
  if (stdOut === NOT_INSTALLED)
    return notInstalledResponse();
  return parseStringResponse(versionResponse(0, 0, 0, stdOut), parsers7, stdOut);
}
var NOT_INSTALLED;
var parsers7;
var init_version = __esm({ "src/lib/tasks/version.ts"() {
  init_utils();
  NOT_INSTALLED = "installed=false";
  parsers7 = [new LineParser(/version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/, (result, [major, minor, patch, agent = ""]) => {
    Object.assign(result, versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent));
  }), new LineParser(/version (\d+)\.(\d+)\.(\D+)(.+)?$/, (result, [major, minor, patch, agent = ""]) => {
    Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
  })];
} });
function createCloneTask(api, task, repoPath, ...args) {
  if (!filterString(repoPath))
    return configurationErrorTask(`git.${api}() requires a string 'repoPath'`);
  return task(repoPath, filterType(args[0], filterString), getTrailingOptions(arguments));
}
function clone_default() {
  return {
    clone(repo, ...rest) {
      return this._runTask(createCloneTask("clone", cloneTask, filterType(repo, filterString), ...rest), trailingFunctionArgument(arguments));
    },
    mirror(repo, ...rest) {
      return this._runTask(createCloneTask("mirror", cloneMirrorTask, filterType(repo, filterString), ...rest), trailingFunctionArgument(arguments));
    }
  };
}
var cloneTask;
var cloneMirrorTask;
var init_clone = __esm({ "src/lib/tasks/clone.ts"() {
  init_task();
  init_utils();
  cloneTask = (repo, directory, customArgs) => {
    const commands = ["clone", ...customArgs];
    filterString(repo) && commands.push(c2(repo));
    filterString(directory) && commands.push(c2(directory));
    return straightThroughStringTask(commands);
  };
  cloneMirrorTask = (repo, directory, customArgs) => {
    append(customArgs, "--mirror");
    return cloneTask(repo, directory, customArgs);
  };
} });
var simple_git_api_exports = {};
__export(simple_git_api_exports, { SimpleGitApi: () => SimpleGitApi });
var SimpleGitApi;
var init_simple_git_api = __esm({ "src/lib/simple-git-api.ts"() {
  init_task_callback();
  init_change_working_directory();
  init_checkout();
  init_count_objects();
  init_commit();
  init_config();
  init_first_commit();
  init_grep();
  init_hash_object();
  init_init();
  init_log();
  init_merge();
  init_push();
  init_show();
  init_status();
  init_task();
  init_version();
  init_utils();
  init_clone();
  SimpleGitApi = class {
    constructor(_executor) {
      this._executor = _executor;
    }
    _runTask(task, then) {
      const chain = this._executor.chain();
      const promise = chain.push(task);
      if (then)
        taskCallback(task, promise, then);
      return Object.create(this, {
        then: { value: promise.then.bind(promise) },
        catch: { value: promise.catch.bind(promise) },
        _executor: { value: chain }
      });
    }
    add(files) {
      return this._runTask(straightThroughStringTask(["add", ...asArray(files)]), trailingFunctionArgument(arguments));
    }
    cwd(directory) {
      const next = trailingFunctionArgument(arguments);
      if (typeof directory === "string")
        return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
      if (typeof directory?.path === "string")
        return this._runTask(changeWorkingDirectoryTask(directory.path, directory.root && this._executor || undefined), next);
      return this._runTask(configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"), next);
    }
    hashObject(path, write) {
      return this._runTask(hashObjectTask(path, write === true), trailingFunctionArgument(arguments));
    }
    init(bare) {
      return this._runTask(initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
    }
    merge() {
      return this._runTask(mergeTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
    }
    mergeFromTo(remote, branch) {
      if (!(filterString(remote) && filterString(branch)))
        return this._runTask(configurationErrorTask(`Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`));
      return this._runTask(mergeTask([
        remote,
        branch,
        ...getTrailingOptions(arguments)
      ]), trailingFunctionArgument(arguments, false));
    }
    outputHandler(handler) {
      this._executor.outputHandler = handler;
      return this;
    }
    push() {
      const task = pushTask({
        remote: filterType(arguments[0], filterString),
        branch: filterType(arguments[1], filterString)
      }, getTrailingOptions(arguments));
      return this._runTask(task, trailingFunctionArgument(arguments));
    }
    stash() {
      return this._runTask(straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
    }
    status() {
      return this._runTask(statusTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
    }
  };
  Object.assign(SimpleGitApi.prototype, checkout_default(), clone_default(), commit_default(), config_default(), count_objects_default(), first_commit_default(), grep_default(), log_default(), show_default(), version_default());
} });
var scheduler_exports = {};
__export(scheduler_exports, { Scheduler: () => Scheduler });
var createScheduledTask;
var Scheduler;
var init_scheduler = __esm({ "src/lib/runners/scheduler.ts"() {
  init_utils();
  init_git_logger();
  createScheduledTask = /* @__PURE__ */ (() => {
    let id = 0;
    return () => {
      id++;
      const { promise, done } = (0, import_dist$1.createDeferred)();
      return {
        promise,
        done,
        id
      };
    };
  })();
  Scheduler = class {
    constructor(concurrency = 2) {
      this.concurrency = concurrency;
      this.logger = createLogger("", "scheduler");
      this.pending = [];
      this.running = [];
      this.logger(`Constructed, concurrency=%s`, concurrency);
    }
    schedule() {
      if (!this.pending.length || this.running.length >= this.concurrency) {
        this.logger(`Schedule attempt ignored, pending=%s running=%s concurrency=%s`, this.pending.length, this.running.length, this.concurrency);
        return;
      }
      const task = append(this.running, this.pending.shift());
      this.logger(`Attempting id=%s`, task.id);
      task.done(() => {
        this.logger(`Completing id=`, task.id);
        remove(this.running, task);
        this.schedule();
      });
    }
    next() {
      const { promise, id } = append(this.pending, createScheduledTask());
      this.logger(`Scheduling id=%s`, id);
      this.schedule();
      return promise;
    }
  };
} });
var apply_patch_exports = {};
__export(apply_patch_exports, { applyPatchTask: () => applyPatchTask });
function applyPatchTask(patches, customArgs) {
  return straightThroughStringTask([
    "apply",
    ...customArgs,
    ...patches
  ]);
}
var init_apply_patch = __esm({ "src/lib/tasks/apply-patch.ts"() {
  init_task();
} });
function branchDeletionSuccess(branch, hash) {
  return {
    branch,
    hash,
    success: true
  };
}
function branchDeletionFailure(branch) {
  return {
    branch,
    hash: null,
    success: false
  };
}
var BranchDeletionBatch;
var init_BranchDeleteSummary = __esm({ "src/lib/responses/BranchDeleteSummary.ts"() {
  BranchDeletionBatch = class {
    constructor() {
      this.all = [];
      this.branches = {};
      this.errors = [];
    }
    get success() {
      return !this.errors.length;
    }
  };
} });
function hasBranchDeletionError(data, processExitCode) {
  return processExitCode === 1 && deleteErrorRegex.test(data);
}
var deleteSuccessRegex;
var deleteErrorRegex;
var parsers8;
var parseBranchDeletions;
var init_parse_branch_delete = __esm({ "src/lib/parsers/parse-branch-delete.ts"() {
  init_BranchDeleteSummary();
  init_utils();
  deleteSuccessRegex = /(\S+)\s+\(\S+\s([^)]+)\)/;
  deleteErrorRegex = /^error[^']+'([^']+)'/m;
  parsers8 = [new LineParser(deleteSuccessRegex, (result, [branch, hash]) => {
    const deletion = branchDeletionSuccess(branch, hash);
    result.all.push(deletion);
    result.branches[branch] = deletion;
  }), new LineParser(deleteErrorRegex, (result, [branch]) => {
    const deletion = branchDeletionFailure(branch);
    result.errors.push(deletion);
    result.all.push(deletion);
    result.branches[branch] = deletion;
  })];
  parseBranchDeletions = (stdOut, stdErr) => {
    return parseStringResponse(new BranchDeletionBatch, parsers8, [stdOut, stdErr]);
  };
} });
var BranchSummaryResult;
var init_BranchSummary = __esm({ "src/lib/responses/BranchSummary.ts"() {
  BranchSummaryResult = class {
    constructor() {
      this.all = [];
      this.branches = {};
      this.current = "";
      this.detached = false;
    }
    push(status, detached, name, commit, label) {
      if (status === "*") {
        this.detached = detached;
        this.current = name;
      }
      this.all.push(name);
      this.branches[name] = {
        current: status === "*",
        linkedWorkTree: status === "+",
        name,
        commit,
        label
      };
    }
  };
} });
function branchStatus(input) {
  return input ? input.charAt(0) : "";
}
function parseBranchSummary(stdOut, currentOnly = false) {
  return parseStringResponse(new BranchSummaryResult, currentOnly ? [currentBranchParser] : parsers9, stdOut);
}
var parsers9;
var currentBranchParser;
var init_parse_branch = __esm({ "src/lib/parsers/parse-branch.ts"() {
  init_BranchSummary();
  init_utils();
  parsers9 = [new LineParser(/^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/, (result, [current, name, commit, label]) => {
    result.push(branchStatus(current), true, name, commit, label);
  }), new LineParser(/^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s, (result, [current, name, commit, label]) => {
    result.push(branchStatus(current), false, name, commit, label);
  })];
  currentBranchParser = new LineParser(/^(\S+)$/s, (result, [name]) => {
    result.push("*", false, name, "", "");
  });
} });
var branch_exports = {};
__export(branch_exports, {
  branchLocalTask: () => branchLocalTask,
  branchTask: () => branchTask,
  containsDeleteBranchCommand: () => containsDeleteBranchCommand,
  deleteBranchTask: () => deleteBranchTask,
  deleteBranchesTask: () => deleteBranchesTask
});
function containsDeleteBranchCommand(commands) {
  const deleteCommands = [
    "-d",
    "-D",
    "--delete"
  ];
  return commands.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
  const isDelete = containsDeleteBranchCommand(customArgs);
  const isCurrentOnly = customArgs.includes("--show-current");
  const commands = ["branch", ...customArgs];
  if (commands.length === 1)
    commands.push("-a");
  if (!commands.includes("-v"))
    commands.splice(1, 0, "-v");
  return {
    format: "utf-8",
    commands,
    parser(stdOut, stdErr) {
      if (isDelete)
        return parseBranchDeletions(stdOut, stdErr).all[0];
      return parseBranchSummary(stdOut, isCurrentOnly);
    }
  };
}
function branchLocalTask() {
  return {
    format: "utf-8",
    commands: ["branch", "-v"],
    parser(stdOut) {
      return parseBranchSummary(stdOut);
    }
  };
}
function deleteBranchesTask(branches, forceDelete = false) {
  return {
    format: "utf-8",
    commands: [
      "branch",
      "-v",
      forceDelete ? "-D" : "-d",
      ...branches
    ],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr);
    },
    onError({ exitCode, stdOut }, error, done, fail) {
      if (!hasBranchDeletionError(String(error), exitCode))
        return fail(error);
      done(stdOut);
    }
  };
}
function deleteBranchTask(branch, forceDelete = false) {
  const task = {
    format: "utf-8",
    commands: [
      "branch",
      "-v",
      forceDelete ? "-D" : "-d",
      branch
    ],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr).branches[branch];
    },
    onError({ exitCode, stdErr, stdOut }, error, _2, fail) {
      if (!hasBranchDeletionError(String(error), exitCode))
        return fail(error);
      throw new GitResponseError(task.parser(bufferToString(stdOut), bufferToString(stdErr)), String(error));
    }
  };
  return task;
}
var init_branch = __esm({ "src/lib/tasks/branch.ts"() {
  init_git_response_error();
  init_parse_branch_delete();
  init_parse_branch();
  init_utils();
} });
function toPath(input) {
  const path = input.trim().replace(/^["']|["']$/g, "");
  return path && normalize(path);
}
var parseCheckIgnore;
var init_CheckIgnore = __esm({ "src/lib/responses/CheckIgnore.ts"() {
  parseCheckIgnore = (text) => {
    return text.split(/\n/g).map(toPath).filter(Boolean);
  };
} });
var check_ignore_exports = {};
__export(check_ignore_exports, { checkIgnoreTask: () => checkIgnoreTask });
function checkIgnoreTask(paths) {
  return {
    commands: ["check-ignore", ...paths],
    format: "utf-8",
    parser: parseCheckIgnore
  };
}
var init_check_ignore = __esm({ "src/lib/tasks/check-ignore.ts"() {
  init_CheckIgnore();
} });
function parseFetchResult(stdOut, stdErr) {
  return parseStringResponse({
    raw: stdOut,
    remote: null,
    branches: [],
    tags: [],
    updated: [],
    deleted: []
  }, parsers10, [stdOut, stdErr]);
}
var parsers10;
var init_parse_fetch = __esm({ "src/lib/parsers/parse-fetch.ts"() {
  init_utils();
  parsers10 = [
    new LineParser(/From (.+)$/, (result, [remote]) => {
      result.remote = remote;
    }),
    new LineParser(/\* \[new branch]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
      result.branches.push({
        name,
        tracking
      });
    }),
    new LineParser(/\* \[new tag]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
      result.tags.push({
        name,
        tracking
      });
    }),
    new LineParser(/- \[deleted]\s+\S+\s*-> (.+)$/, (result, [tracking]) => {
      result.deleted.push({ tracking });
    }),
    new LineParser(/\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/, (result, [from, to, name, tracking]) => {
      result.updated.push({
        name,
        tracking,
        to,
        from
      });
    })
  ];
} });
var fetch_exports = {};
__export(fetch_exports, { fetchTask: () => fetchTask });
function disallowedCommand(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function fetchTask(remote, branch, customArgs) {
  const commands = ["fetch", ...customArgs];
  if (remote && branch)
    commands.push(remote, branch);
  if (commands.find(disallowedCommand))
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  return {
    commands,
    format: "utf-8",
    parser: parseFetchResult
  };
}
var init_fetch = __esm({ "src/lib/tasks/fetch.ts"() {
  init_parse_fetch();
  init_task();
} });
function parseMoveResult(stdOut) {
  return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
var parsers11;
var init_parse_move = __esm({ "src/lib/parsers/parse-move.ts"() {
  init_utils();
  parsers11 = [new LineParser(/^Renaming (.+) to (.+)$/, (result, [from, to]) => {
    result.moves.push({
      from,
      to
    });
  })];
} });
var move_exports = {};
__export(move_exports, { moveTask: () => moveTask });
function moveTask(from, to) {
  return {
    commands: [
      "mv",
      "-v",
      ...asArray(from),
      to
    ],
    format: "utf-8",
    parser: parseMoveResult
  };
}
var init_move = __esm({ "src/lib/tasks/move.ts"() {
  init_parse_move();
  init_utils();
} });
var pull_exports = {};
__export(pull_exports, { pullTask: () => pullTask });
function pullTask(remote, branch, customArgs) {
  const commands = ["pull", ...customArgs];
  if (remote && branch)
    commands.splice(1, 0, remote, branch);
  return {
    commands,
    format: "utf-8",
    parser(stdOut, stdErr) {
      return parsePullResult(stdOut, stdErr);
    },
    onError(result, _error, _done, fail) {
      const pullError = parsePullErrorResult(bufferToString(result.stdOut), bufferToString(result.stdErr));
      if (pullError)
        return fail(new GitResponseError(pullError));
      fail(_error);
    }
  };
}
var init_pull = __esm({ "src/lib/tasks/pull.ts"() {
  init_git_response_error();
  init_parse_pull();
  init_utils();
} });
function parseGetRemotes(text) {
  const remotes = {};
  forEach(text, ([name]) => remotes[name] = { name });
  return Object.values(remotes);
}
function parseGetRemotesVerbose(text) {
  const remotes = {};
  forEach(text, ([name, url, purpose]) => {
    if (!Object.hasOwn(remotes, name))
      remotes[name] = {
        name,
        refs: {
          fetch: "",
          push: ""
        }
      };
    if (purpose && url)
      remotes[name].refs[purpose.replace(/[^a-z]/g, "")] = url;
  });
  return Object.values(remotes);
}
function forEach(text, handler) {
  forEachLineWithContent(text, (line) => handler(line.split(/\s+/)));
}
var init_GetRemoteSummary = __esm({ "src/lib/responses/GetRemoteSummary.ts"() {
  init_utils();
} });
var remote_exports = {};
__export(remote_exports, {
  addRemoteTask: () => addRemoteTask,
  getRemotesTask: () => getRemotesTask,
  listRemotesTask: () => listRemotesTask,
  remoteTask: () => remoteTask,
  removeRemoteTask: () => removeRemoteTask
});
function addRemoteTask(remoteName, remoteRepo, customArgs) {
  return straightThroughStringTask([
    "remote",
    "add",
    ...customArgs,
    remoteName,
    remoteRepo
  ]);
}
function getRemotesTask(verbose) {
  const commands = ["remote"];
  if (verbose)
    commands.push("-v");
  return {
    commands,
    format: "utf-8",
    parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
  };
}
function listRemotesTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "ls-remote")
    commands.unshift("ls-remote");
  return straightThroughStringTask(commands);
}
function remoteTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "remote")
    commands.unshift("remote");
  return straightThroughStringTask(commands);
}
function removeRemoteTask(remoteName) {
  return straightThroughStringTask([
    "remote",
    "remove",
    remoteName
  ]);
}
var init_remote = __esm({ "src/lib/tasks/remote.ts"() {
  init_GetRemoteSummary();
  init_task();
} });
var stash_list_exports = {};
__export(stash_list_exports, { stashListTask: () => stashListTask });
function stashListTask(opt = {}, customArgs) {
  const options = parseLogOptions(opt);
  const commands = [
    "stash",
    "list",
    ...options.commands,
    ...customArgs
  ];
  const parser4 = createListLogSummaryParser(options.splitter, options.fields, logFormatFromCommand(commands));
  return validateLogFormatConfig(commands) || {
    commands,
    format: "utf-8",
    parser: parser4
  };
}
var init_stash_list = __esm({ "src/lib/tasks/stash-list.ts"() {
  init_log_format();
  init_parse_list_log_summary();
  init_diff();
  init_log();
} });
var sub_module_exports = {};
__export(sub_module_exports, {
  addSubModuleTask: () => addSubModuleTask,
  initSubModuleTask: () => initSubModuleTask,
  subModuleTask: () => subModuleTask,
  updateSubModuleTask: () => updateSubModuleTask
});
function addSubModuleTask(repo, path) {
  return subModuleTask([
    "add",
    repo,
    path
  ]);
}
function initSubModuleTask(customArgs) {
  return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "submodule")
    commands.unshift("submodule");
  return straightThroughStringTask(commands);
}
function updateSubModuleTask(customArgs) {
  return subModuleTask(["update", ...customArgs]);
}
var init_sub_module = __esm({ "src/lib/tasks/sub-module.ts"() {
  init_task();
} });
function singleSorted(a2, b2) {
  const aIsNum = Number.isNaN(a2);
  if (aIsNum !== Number.isNaN(b2))
    return aIsNum ? 1 : -1;
  return aIsNum ? sorted(a2, b2) : 0;
}
function sorted(a2, b2) {
  return a2 === b2 ? 0 : a2 > b2 ? 1 : -1;
}
function trimmed(input) {
  return input.trim();
}
function toNumber(input) {
  if (typeof input === "string")
    return parseInt(input.replace(/^\D+/g, ""), 10) || 0;
  return 0;
}
var TagList;
var parseTagList;
var init_TagList = __esm({ "src/lib/responses/TagList.ts"() {
  TagList = class {
    constructor(all, latest) {
      this.all = all;
      this.latest = latest;
    }
  };
  parseTagList = function(data, customSort = false) {
    const tags = data.split(`
`).map(trimmed).filter(Boolean);
    if (!customSort)
      tags.sort(function(tagA, tagB) {
        const partsA = tagA.split(".");
        const partsB = tagB.split(".");
        if (partsA.length === 1 || partsB.length === 1)
          return singleSorted(toNumber(partsA[0]), toNumber(partsB[0]));
        for (let i2 = 0, l2 = Math.max(partsA.length, partsB.length);i2 < l2; i2++) {
          const diff = sorted(toNumber(partsA[i2]), toNumber(partsB[i2]));
          if (diff)
            return diff;
        }
        return 0;
      });
    const latest = customSort ? tags[0] : [...tags].reverse().find((tag) => tag.indexOf(".") >= 0);
    return new TagList(tags, latest);
  };
} });
var tag_exports = {};
__export(tag_exports, {
  addAnnotatedTagTask: () => addAnnotatedTagTask,
  addTagTask: () => addTagTask,
  tagListTask: () => tagListTask
});
function tagListTask(customArgs = []) {
  const hasCustomSort = customArgs.some((option) => /^--sort=/.test(option));
  return {
    format: "utf-8",
    commands: [
      "tag",
      "-l",
      ...customArgs
    ],
    parser(text) {
      return parseTagList(text, hasCustomSort);
    }
  };
}
function addTagTask(name) {
  return {
    format: "utf-8",
    commands: ["tag", name],
    parser() {
      return { name };
    }
  };
}
function addAnnotatedTagTask(name, tagMessage) {
  return {
    format: "utf-8",
    commands: [
      "tag",
      "-a",
      "-m",
      tagMessage,
      name
    ],
    parser() {
      return { name };
    }
  };
}
var init_tag = __esm({ "src/lib/tasks/tag.ts"() {
  init_TagList();
} });
var require_git = __commonJS2({ "src/git.js"(exports, module) {
  var { GitExecutor: GitExecutor2 } = (init_git_executor(), __toCommonJS(git_executor_exports));
  var { SimpleGitApi: SimpleGitApi2 } = (init_simple_git_api(), __toCommonJS(simple_git_api_exports));
  var { Scheduler: Scheduler2 } = (init_scheduler(), __toCommonJS(scheduler_exports));
  var { adhocExecTask: adhocExecTask2, configurationErrorTask: configurationErrorTask2 } = (init_task(), __toCommonJS(task_exports));
  var { asArray: asArray2, filterArray: filterArray2, filterPrimitives: filterPrimitives2, filterString: filterString2, filterStringOrStringArray: filterStringOrStringArray2, filterType: filterType2, getTrailingOptions: getTrailingOptions2, trailingFunctionArgument: trailingFunctionArgument2, trailingOptionsArgument: trailingOptionsArgument2 } = (init_utils(), __toCommonJS(utils_exports));
  var { applyPatchTask: applyPatchTask2 } = (init_apply_patch(), __toCommonJS(apply_patch_exports));
  var { branchTask: branchTask2, branchLocalTask: branchLocalTask2, deleteBranchesTask: deleteBranchesTask2, deleteBranchTask: deleteBranchTask2 } = (init_branch(), __toCommonJS(branch_exports));
  var { checkIgnoreTask: checkIgnoreTask2 } = (init_check_ignore(), __toCommonJS(check_ignore_exports));
  var { checkIsRepoTask: checkIsRepoTask2 } = (init_check_is_repo(), __toCommonJS(check_is_repo_exports));
  var { cleanWithOptionsTask: cleanWithOptionsTask2, isCleanOptionsArray: isCleanOptionsArray2 } = (init_clean(), __toCommonJS(clean_exports));
  var { diffSummaryTask: diffSummaryTask2 } = (init_diff(), __toCommonJS(diff_exports));
  var { fetchTask: fetchTask2 } = (init_fetch(), __toCommonJS(fetch_exports));
  var { moveTask: moveTask2 } = (init_move(), __toCommonJS(move_exports));
  var { pullTask: pullTask2 } = (init_pull(), __toCommonJS(pull_exports));
  var { pushTagsTask: pushTagsTask2 } = (init_push(), __toCommonJS(push_exports));
  var { addRemoteTask: addRemoteTask2, getRemotesTask: getRemotesTask2, listRemotesTask: listRemotesTask2, remoteTask: remoteTask2, removeRemoteTask: removeRemoteTask2 } = (init_remote(), __toCommonJS(remote_exports));
  var { getResetMode: getResetMode2, resetTask: resetTask2 } = (init_reset(), __toCommonJS(reset_exports));
  var { stashListTask: stashListTask2 } = (init_stash_list(), __toCommonJS(stash_list_exports));
  var { addSubModuleTask: addSubModuleTask2, initSubModuleTask: initSubModuleTask2, subModuleTask: subModuleTask2, updateSubModuleTask: updateSubModuleTask2 } = (init_sub_module(), __toCommonJS(sub_module_exports));
  var { addAnnotatedTagTask: addAnnotatedTagTask2, addTagTask: addTagTask2, tagListTask: tagListTask2 } = (init_tag(), __toCommonJS(tag_exports));
  var { straightThroughBufferTask: straightThroughBufferTask2, straightThroughStringTask: straightThroughStringTask2 } = (init_task(), __toCommonJS(task_exports));
  function Git2(options, plugins) {
    this._plugins = plugins;
    this._executor = new GitExecutor2(options.baseDir, new Scheduler2(options.maxConcurrentProcesses), plugins);
    this._trimmed = options.trimmed;
  }
  (Git2.prototype = Object.create(SimpleGitApi2.prototype)).constructor = Git2;
  Git2.prototype.customBinary = function(command) {
    this._plugins.reconfigure("binary", command);
    return this;
  };
  Git2.prototype.env = function(name, value) {
    if (arguments.length === 1 && typeof name === "object")
      this._executor.env = name;
    else
      (this._executor.env = this._executor.env || {})[name] = value;
    return this;
  };
  Git2.prototype.stashList = function(options) {
    return this._runTask(stashListTask2(trailingOptionsArgument2(arguments) || {}, filterArray2(options) && options || []), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.mv = function(from, to) {
    return this._runTask(moveTask2(from, to), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.checkoutLatestTag = function(then) {
    var git = this;
    return this.pull(function() {
      git.tags(function(err, tags) {
        git.checkout(tags.latest, then);
      });
    });
  };
  Git2.prototype.pull = function(remote, branch, options, then) {
    return this._runTask(pullTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.fetch = function(remote, branch) {
    return this._runTask(fetchTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.silent = function(silence) {
    return this._runTask(adhocExecTask2(() => console.warn("simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this method will be removed.")));
  };
  Git2.prototype.tags = function(options, then) {
    return this._runTask(tagListTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.rebase = function() {
    return this._runTask(straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.reset = function(mode) {
    return this._runTask(resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.revert = function(commit) {
    const next = trailingFunctionArgument2(arguments);
    if (typeof commit !== "string")
      return this._runTask(configurationErrorTask2("Commit must be a string"), next);
    return this._runTask(straightThroughStringTask2([
      "revert",
      ...getTrailingOptions2(arguments, 0, true),
      commit
    ]), next);
  };
  Git2.prototype.addTag = function(name) {
    const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
    return this._runTask(task, trailingFunctionArgument2(arguments));
  };
  Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
    return this._runTask(addAnnotatedTagTask2(tagName, tagMessage), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
    return this._runTask(deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
    return this._runTask(deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.branch = function(options, then) {
    return this._runTask(branchTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.branchLocal = function(then) {
    return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.raw = function(commands) {
    const createRestCommands = !Array.isArray(commands);
    const command = [].slice.call(createRestCommands ? arguments : commands, 0);
    for (let i2 = 0;i2 < command.length && createRestCommands; i2++)
      if (!filterPrimitives2(command[i2])) {
        command.splice(i2, command.length - i2);
        break;
      }
    command.push(...getTrailingOptions2(arguments, 0, true));
    var next = trailingFunctionArgument2(arguments);
    if (!command.length)
      return this._runTask(configurationErrorTask2("Raw: must supply one or more command to execute"), next);
    return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
  };
  Git2.prototype.submoduleAdd = function(repo, path, then) {
    return this._runTask(addSubModuleTask2(repo, path), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.submoduleUpdate = function(args, then) {
    return this._runTask(updateSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.submoduleInit = function(args, then) {
    return this._runTask(initSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.subModule = function(options, then) {
    return this._runTask(subModuleTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.listRemote = function() {
    return this._runTask(listRemotesTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
    return this._runTask(addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.removeRemote = function(remoteName, then) {
    return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.getRemotes = function(verbose, then) {
    return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.remote = function(options, then) {
    return this._runTask(remoteTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.tag = function(options, then) {
    const command = getTrailingOptions2(arguments);
    if (command[0] !== "tag")
      command.unshift("tag");
    return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.updateServerInfo = function(then) {
    return this._runTask(straightThroughStringTask2(["update-server-info"]), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.pushTags = function(remote, then) {
    const task = pushTagsTask2({ remote: filterType2(remote, filterString2) }, getTrailingOptions2(arguments));
    return this._runTask(task, trailingFunctionArgument2(arguments));
  };
  Git2.prototype.rm = function(files) {
    return this._runTask(straightThroughStringTask2([
      "rm",
      "-f",
      ...asArray2(files)
    ]), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.rmKeepLocal = function(files) {
    return this._runTask(straightThroughStringTask2([
      "rm",
      "--cached",
      ...asArray2(files)
    ]), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.catFile = function(options, then) {
    return this._catFile("utf-8", arguments);
  };
  Git2.prototype.binaryCatFile = function() {
    return this._catFile("buffer", arguments);
  };
  Git2.prototype._catFile = function(format, args) {
    var handler = trailingFunctionArgument2(args);
    var command = ["cat-file"];
    var options = args[0];
    if (typeof options === "string")
      return this._runTask(configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"), handler);
    if (Array.isArray(options))
      command.push.apply(command, options);
    const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
    return this._runTask(task, handler);
  };
  Git2.prototype.diff = function(options, then) {
    const task = filterString2(options) ? configurationErrorTask2("git.diff: supplying options as a single string is no longer supported, switch to an array of strings") : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
    return this._runTask(task, trailingFunctionArgument2(arguments));
  };
  Git2.prototype.diffSummary = function() {
    return this._runTask(diffSummaryTask2(getTrailingOptions2(arguments, 1)), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.applyPatch = function(patches) {
    const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(`git.applyPatch requires one or more string patches as the first argument`) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
    return this._runTask(task, trailingFunctionArgument2(arguments));
  };
  Git2.prototype.revparse = function() {
    const commands = ["rev-parse", ...getTrailingOptions2(arguments, true)];
    return this._runTask(straightThroughStringTask2(commands, true), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.clean = function(mode, options, then) {
    const usingCleanOptionsArray = isCleanOptionsArray2(mode);
    const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
    const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
    return this._runTask(cleanWithOptionsTask2(cleanMode, customArgs), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.exec = function(then) {
    return this._runTask({
      commands: [],
      format: "utf-8",
      parser() {
        if (typeof then === "function")
          then();
      }
    });
  };
  Git2.prototype.clearQueue = function() {
    return this._runTask(adhocExecTask2(() => console.warn("simple-git deprecation notice: clearQueue() is deprecated and will be removed, switch to using the abortPlugin instead.")));
  };
  Git2.prototype.checkIgnore = function(pathnames, then) {
    return this._runTask(checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))), trailingFunctionArgument2(arguments));
  };
  Git2.prototype.checkIsRepo = function(checkType, then) {
    return this._runTask(checkIsRepoTask2(filterType2(checkType, filterString2)), trailingFunctionArgument2(arguments));
  };
  module.exports = Git2;
} });
init_git_error();
var GitConstructError = class extends GitError {
  constructor(config, message) {
    super(undefined, message);
    this.config = config;
  }
};
init_git_error();
init_git_error();
var GitPluginError = class extends GitError {
  constructor(task, plugin, message) {
    super(task, message);
    this.task = task;
    this.plugin = plugin;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
init_git_response_error();
init_task_configuration_error();
init_check_is_repo();
init_clean();
init_config();
init_diff_name_status();
init_grep();
init_reset();
function abortPlugin(signal) {
  if (!signal)
    return;
  return [{
    type: "spawn.before",
    action(_data, context) {
      if (signal.aborted)
        context.kill(new GitPluginError(undefined, "abort", "Abort already signaled"));
    }
  }, {
    type: "spawn.after",
    action(_data, context) {
      function kill() {
        context.kill(new GitPluginError(undefined, "abort", "Abort signal received"));
      }
      signal.addEventListener("abort", kill);
      context.spawned.on("close", () => signal.removeEventListener("abort", kill));
    }
  }];
}
function blockUnsafeOperationsPlugin(options = {}) {
  return {
    type: "spawn.args",
    action(args, { env }) {
      for (const vulnerability of ne(args, env))
        if (options[vulnerability.category] !== true)
          throw new GitPluginError(undefined, "unsafe", vulnerability.message);
      return args;
    }
  };
}
init_utils();
function commandConfigPrefixingPlugin(configuration) {
  const prefix = prefixedArray(configuration, "-c");
  return {
    type: "spawn.args",
    action(data) {
      return [...prefix, ...data];
    }
  };
}
init_utils();
var never = (0, import_dist$1.deferred)().promise;
function completionDetectionPlugin({ onClose = true, onExit = 50 } = {}) {
  function createEvents() {
    let exitCode = -1;
    const events = {
      close: (0, import_dist$1.deferred)(),
      closeTimeout: (0, import_dist$1.deferred)(),
      exit: (0, import_dist$1.deferred)(),
      exitTimeout: (0, import_dist$1.deferred)()
    };
    const result = Promise.race([onClose === false ? never : events.closeTimeout.promise, onExit === false ? never : events.exitTimeout.promise]);
    configureTimeout(onClose, events.close, events.closeTimeout);
    configureTimeout(onExit, events.exit, events.exitTimeout);
    return {
      close(code) {
        exitCode = code;
        events.close.done();
      },
      exit(code) {
        exitCode = code;
        events.exit.done();
      },
      get exitCode() {
        return exitCode;
      },
      result
    };
  }
  function configureTimeout(flag, event, timeout) {
    if (flag === false)
      return;
    (flag === true ? event.promise : event.promise.then(() => delay(flag))).then(timeout.done);
  }
  return {
    type: "spawn.after",
    async action(_data, { spawned, close }) {
      const events = createEvents();
      let deferClose = true;
      let quickClose = () => void (deferClose = false);
      spawned.stdout?.on("data", quickClose);
      spawned.stderr?.on("data", quickClose);
      spawned.on("error", quickClose);
      spawned.on("close", (code) => events.close(code));
      spawned.on("exit", (code) => events.exit(code));
      try {
        await events.result;
        if (deferClose)
          await delay(50);
        close(events.exitCode);
      } catch (err) {
        close(events.exitCode, err);
      }
    }
  };
}
init_utils();
var WRONG_NUMBER_ERR = `Invalid value supplied for custom binary, requires a single string or an array containing either one or two strings`;
var WRONG_CHARS_ERR = `Invalid value supplied for custom binary, restricted characters must be removed or supply the unsafe.allowUnsafeCustomBinary option`;
function isBadArgument(arg) {
  return !arg || !/^([a-z]:)?([a-z0-9/.\\_~-]+)$/i.test(arg);
}
function toBinaryConfig(input, allowUnsafe) {
  if (input.length < 1 || input.length > 2)
    throw new GitPluginError(undefined, "binary", WRONG_NUMBER_ERR);
  if (input.some(isBadArgument))
    if (allowUnsafe)
      console.warn(WRONG_CHARS_ERR);
    else
      throw new GitPluginError(undefined, "binary", WRONG_CHARS_ERR);
  const [binary, prefix] = input;
  return {
    binary,
    prefix
  };
}
function customBinaryPlugin(plugins, input = ["git"], allowUnsafe = false) {
  let config = toBinaryConfig(asArray(input), allowUnsafe);
  plugins.on("binary", (input2) => {
    config = toBinaryConfig(asArray(input2), allowUnsafe);
  });
  plugins.append("spawn.binary", () => {
    return config.binary;
  });
  plugins.append("spawn.args", (data) => {
    return config.prefix ? [config.prefix, ...data] : data;
  });
}
init_git_error();
function isTaskError(result) {
  return !!(result.exitCode && result.stdErr.length);
}
function getErrorMessage(result) {
  return Buffer.concat([...result.stdOut, ...result.stdErr]);
}
function errorDetectionHandler(overwrite = false, isError = isTaskError, errorMessage = getErrorMessage) {
  return (error, result) => {
    if (!overwrite && error || !isError(result))
      return error;
    return errorMessage(result);
  };
}
function errorDetectionPlugin(config) {
  return {
    type: "task.error",
    action(data, context) {
      const error = config(data.error, {
        stdErr: context.stdErr,
        stdOut: context.stdOut,
        exitCode: context.exitCode
      });
      if (Buffer.isBuffer(error))
        return { error: new GitError(undefined, error.toString("utf-8")) };
      return { error };
    }
  };
}
init_utils();
var PluginStore = class {
  constructor() {
    this.plugins = /* @__PURE__ */ new Set;
    this.events = new EventEmitter;
  }
  on(type, listener) {
    this.events.on(type, listener);
  }
  reconfigure(type, data) {
    this.events.emit(type, data);
  }
  append(type, action) {
    const plugin = append(this.plugins, {
      type,
      action
    });
    return () => this.plugins.delete(plugin);
  }
  add(plugin) {
    const plugins = [];
    asArray(plugin).forEach((plugin2) => plugin2 && this.plugins.add(append(plugins, plugin2)));
    return () => {
      plugins.forEach((plugin2) => this.plugins.delete(plugin2));
    };
  }
  exec(type, data, context) {
    let output = data;
    const contextual = Object.freeze(Object.create(context));
    for (const plugin of this.plugins)
      if (plugin.type === type)
        output = plugin.action(output, contextual);
    return output;
  }
};
init_utils();
function progressMonitorPlugin(progress) {
  const progressCommand = "--progress";
  const progressMethods = [
    "checkout",
    "clone",
    "fetch",
    "pull",
    "push"
  ];
  return [{
    type: "spawn.args",
    action(args, context) {
      if (!progressMethods.includes(context.method))
        return args;
      return including(args, progressCommand);
    }
  }, {
    type: "spawn.after",
    action(_data, context) {
      if (!context.commands.includes(progressCommand))
        return;
      context.spawned.stderr?.on("data", (chunk) => {
        const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
        if (!message)
          return;
        progress({
          method: context.method,
          stage: progressEventStage(message[1]),
          progress: asNumber(message[2]),
          processed: asNumber(message[3]),
          total: asNumber(message[4])
        });
      });
    }
  }];
}
function progressEventStage(input) {
  return String(input.toLowerCase().split(" ", 1)) || "unknown";
}
init_utils();
function spawnOptionsPlugin(spawnOptions) {
  const options = pick(spawnOptions, ["uid", "gid"]);
  return {
    type: "spawn.options",
    action(data) {
      return {
        ...options,
        ...data
      };
    }
  };
}
function timeoutPlugin({ block: block2, stdErr = true, stdOut = true }) {
  if (block2 > 0)
    return {
      type: "spawn.after",
      action(_data, context) {
        let timeout;
        function wait() {
          timeout && clearTimeout(timeout);
          timeout = setTimeout(kill, block2);
        }
        function stop() {
          context.spawned.stdout?.off("data", wait);
          context.spawned.stderr?.off("data", wait);
          context.spawned.off("exit", stop);
          context.spawned.off("close", stop);
          timeout && clearTimeout(timeout);
        }
        function kill() {
          stop();
          context.kill(new GitPluginError(undefined, "timeout", `block timeout reached`));
        }
        stdOut && context.spawned.stdout?.on("data", wait);
        stdErr && context.spawned.stderr?.on("data", wait);
        context.spawned.on("exit", stop);
        context.spawned.on("close", stop);
        wait();
      }
    };
}
function suffixPathsPlugin() {
  return {
    type: "spawn.args",
    action(data) {
      const prefix = [];
      let suffix;
      function append2(args) {
        (suffix = suffix || []).push(...args);
      }
      for (let i2 = 0;i2 < data.length; i2++) {
        const param = data[i2];
        if (r2(param)) {
          append2(o(param));
          continue;
        }
        if (param === "--") {
          append2(data.slice(i2 + 1).flatMap((item) => r2(item) && o(item) || item));
          break;
        }
        prefix.push(param);
      }
      return !suffix ? prefix : [
        ...prefix,
        "--",
        ...suffix.map(String)
      ];
    }
  };
}
init_utils();
var Git = require_git();
function gitInstanceFactory(baseDir, options) {
  const plugins = new PluginStore;
  const config = createInstanceConfig(baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {}, options);
  if (!folderExists(config.baseDir))
    throw new GitConstructError(config, `Cannot use simple-git on a directory that does not exist`);
  if (Array.isArray(config.config))
    plugins.add(commandConfigPrefixingPlugin(config.config));
  plugins.add(blockUnsafeOperationsPlugin(config.unsafe));
  plugins.add(completionDetectionPlugin(config.completion));
  config.abort && plugins.add(abortPlugin(config.abort));
  config.progress && plugins.add(progressMonitorPlugin(config.progress));
  config.timeout && plugins.add(timeoutPlugin(config.timeout));
  config.spawnOptions && plugins.add(spawnOptionsPlugin(config.spawnOptions));
  plugins.add(suffixPathsPlugin());
  plugins.add(errorDetectionPlugin(errorDetectionHandler(true)));
  config.errors && plugins.add(errorDetectionPlugin(config.errors));
  customBinaryPlugin(plugins, config.binary, config.unsafe?.allowUnsafeCustomBinary);
  return new Git(config, plugins);
}
init_git_response_error();
var esm_default = gitInstanceFactory;

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/xdg-basedir.mjs
import path from "path";
import os from "os";
var homeDirectory = os.homedir();
var { env } = process;
var xdgData = env.XDG_DATA_HOME || (homeDirectory ? path.join(homeDirectory, ".local", "share") : undefined);
var xdgConfig = env.XDG_CONFIG_HOME || (homeDirectory ? path.join(homeDirectory, ".config") : undefined);
env.XDG_STATE_HOME || homeDirectory && path.join(homeDirectory, ".local", "state");
env.XDG_CACHE_HOME || homeDirectory && path.join(homeDirectory, ".cache");
env.XDG_RUNTIME_DIR;
var xdgDataDirectories = (env.XDG_DATA_DIRS || "/usr/local/share/:/usr/share/").split(":");
if (xdgData)
  xdgDataDirectories.unshift(xdgData);
var xdgConfigDirectories = (env.XDG_CONFIG_DIRS || "/etc/xdg").split(":");
if (xdgConfig)
  xdgConfigDirectories.unshift(xdgConfig);

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/_chunks/libs/@vercel/detect-agent.mjs
var require_dist3 = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var __defProp3 = Object.defineProperty;
  var __getOwnPropDesc3 = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames3 = Object.getOwnPropertyNames;
  var __hasOwnProp3 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp3(target, name, {
        get: all[name],
        enumerable: true
      });
  };
  var __copyProps3 = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames3(from))
        if (!__hasOwnProp3.call(to, key) && key !== except)
          __defProp3(to, key, {
            get: () => from[key],
            enumerable: !(desc = __getOwnPropDesc3(from, key)) || desc.enumerable
          });
    }
    return to;
  };
  var __toCommonJS2 = (mod) => __copyProps3(__defProp3({}, "__esModule", { value: true }), mod);
  var src_exports = {};
  __export2(src_exports, {
    KNOWN_AGENTS: () => KNOWN_AGENTS,
    determineAgent: () => determineAgent
  });
  module.exports = __toCommonJS2(src_exports);
  var import_promises = __require2("node:fs/promises");
  var import_node_fs = __require2("node:fs");
  const DEVIN_LOCAL_PATH = "/opt/.devin";
  const CURSOR = "cursor";
  const CURSOR_CLI = "cursor-cli";
  const CLAUDE = "claude";
  const COWORK = "cowork";
  const DEVIN = "devin";
  const REPLIT = "replit";
  const GEMINI = "gemini";
  const CODEX = "codex";
  const ANTIGRAVITY = "antigravity";
  const AUGMENT_CLI = "augment-cli";
  const OPENCODE = "opencode";
  const GITHUB_COPILOT = "github-copilot";
  const GITHUB_COPILOT_CLI = "github-copilot-cli";
  const V0 = "v0";
  const KNOWN_AGENTS = {
    CURSOR,
    CURSOR_CLI,
    CLAUDE,
    COWORK,
    DEVIN,
    REPLIT,
    GEMINI,
    CODEX,
    ANTIGRAVITY,
    AUGMENT_CLI,
    OPENCODE,
    GITHUB_COPILOT,
    V0
  };
  async function determineAgent() {
    if (process.env.AI_AGENT) {
      const name = process.env.AI_AGENT.trim();
      if (name) {
        if (name === GITHUB_COPILOT || name === GITHUB_COPILOT_CLI)
          return {
            isAgent: true,
            agent: { name: GITHUB_COPILOT }
          };
        if (name === V0)
          return {
            isAgent: true,
            agent: { name: V0 }
          };
        return {
          isAgent: true,
          agent: { name }
        };
      }
    }
    if (process.env.CURSOR_TRACE_ID)
      return {
        isAgent: true,
        agent: { name: CURSOR }
      };
    if (process.env.CURSOR_AGENT || process.env.CURSOR_EXTENSION_HOST_ROLE === "agent-exec")
      return {
        isAgent: true,
        agent: { name: CURSOR_CLI }
      };
    if (process.env.GEMINI_CLI)
      return {
        isAgent: true,
        agent: { name: GEMINI }
      };
    if (process.env.CODEX_SANDBOX || process.env.CODEX_CI || process.env.CODEX_THREAD_ID)
      return {
        isAgent: true,
        agent: { name: CODEX }
      };
    if (process.env.ANTIGRAVITY_AGENT)
      return {
        isAgent: true,
        agent: { name: ANTIGRAVITY }
      };
    if (process.env.AUGMENT_AGENT)
      return {
        isAgent: true,
        agent: { name: AUGMENT_CLI }
      };
    if (process.env.OPENCODE_CLIENT)
      return {
        isAgent: true,
        agent: { name: OPENCODE }
      };
    if (process.env.CLAUDECODE || process.env.CLAUDE_CODE) {
      if (process.env.CLAUDE_CODE_IS_COWORK)
        return {
          isAgent: true,
          agent: { name: COWORK }
        };
      return {
        isAgent: true,
        agent: { name: CLAUDE }
      };
    }
    if (process.env.REPL_ID)
      return {
        isAgent: true,
        agent: { name: REPLIT }
      };
    if (process.env.COPILOT_MODEL || process.env.COPILOT_ALLOW_ALL || process.env.COPILOT_GITHUB_TOKEN)
      return {
        isAgent: true,
        agent: { name: GITHUB_COPILOT }
      };
    try {
      await (0, import_promises.access)(DEVIN_LOCAL_PATH, import_node_fs.constants.F_OK);
      return {
        isAgent: true,
        agent: { name: DEVIN }
      };
    } catch (_error) {}
    return {
      isAgent: false,
      agent: undefined
    };
  }
});

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/cli.mjs
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "fs";
import { basename, dirname, extname, isAbsolute, join, normalize as normalize2, posix, relative, resolve, sep } from "path";
import { fileURLToPath } from "url";

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/index.js
var composer = require_composer();
var Document = require_Document();
var Schema = require_Schema();
var errors = require_errors();
var Alias = require_Alias();
var identity = require_identity();
var Pair = require_Pair();
var Scalar = require_Scalar();
var YAMLMap = require_YAMLMap();
var YAMLSeq = require_YAMLSeq();
var cst = require_cst();
var lexer = require_lexer();
var lineCounter = require_line_counter();
var parser4 = require_parser();
var publicApi = require_public_api();
var visit = require_visit();
var $Composer = composer.Composer;
var $Document = Document.Document;
var $Schema = Schema.Schema;
var $YAMLError = errors.YAMLError;
var $YAMLParseError = errors.YAMLParseError;
var $YAMLWarning = errors.YAMLWarning;
var $Alias = Alias.Alias;
var $isAlias = identity.isAlias;
var $isCollection = identity.isCollection;
var $isDocument = identity.isDocument;
var $isMap = identity.isMap;
var $isNode = identity.isNode;
var $isPair = identity.isPair;
var $isScalar = identity.isScalar;
var $isSeq = identity.isSeq;
var $Pair = Pair.Pair;
var $Scalar = Scalar.Scalar;
var $YAMLMap = YAMLMap.YAMLMap;
var $YAMLSeq = YAMLSeq.YAMLSeq;
var $Lexer = lexer.Lexer;
var $LineCounter = lineCounter.LineCounter;
var $Parser = parser4.Parser;
var $parse = publicApi.parse;
var $parseAllDocuments = publicApi.parseAllDocuments;
var $parseDocument = publicApi.parseDocument;
var $stringify = publicApi.stringify;
var $visit = visit.visit;
var $visitAsync = visit.visitAsync;

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/cli.mjs
import { stripVTControlCharacters } from "node:util";
import { createWriteStream } from "node:fs";
import { dirname as dirname$1, join as join$1, normalize as normalize$1, relative as relative$1, resolve as resolve$1, sep as sep$1 } from "node:path";
import { homedir, platform, tmpdir } from "os";
import * as readline from "readline";
import { Writable } from "stream";
import { promisify } from "util";
import { execFile, spawn as spawn2 } from "child_process";
import { access, chmod, cp, glob, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, stat, symlink, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { cp as cp$1, mkdir as mkdir$1, mkdtemp as mkdtemp$1, readFile as readFile$1, rm as rm$1, stat as stat$1, writeFile as writeFile$1 } from "node:fs/promises";
import { createHash as createHash$1 } from "node:crypto";
import { crc32, gunzipSync, inflateRawSync } from "node:zlib";
import { tmpdir as tmpdir$1 } from "node:os";
import { pipeline } from "node:stream/promises";

// ../../node_modules/.bun/tar@7.5.23/node_modules/tar/dist/esm/index.min.js
import Qr from "events";
import I3 from "fs";
import { EventEmitter as Di } from "node:events";
import Cs from "node:stream";
import { StringDecoder as Hr } from "node:string_decoder";
import cr from "node:path";
import Kt from "node:fs";
import { dirname as Fn, parse as kn } from "path";
import { EventEmitter as Dn } from "events";
import zi from "assert";
import { Buffer as Ot } from "buffer";
import * as Ps from "zlib";
import en from "zlib";
import { posix as Zt } from "node:path";
import { basename as _n } from "node:path";
import mi from "fs";
import X2 from "fs";
import js from "path";
import { win32 as Pn } from "node:path";
import ar from "path";
import Br from "node:fs";
import co from "node:assert";
import { randomBytes as Mr } from "node:crypto";
import u from "node:fs";
import R3 from "node:path";
import pr from "fs";
import wi from "node:fs";
import we from "node:path";
import k2 from "node:fs";
import ro from "node:fs/promises";
import Si from "node:path";
import { join as xr } from "node:path";
import v from "node:fs";
import Pr from "node:path";
var zr = Object.defineProperty;
var Ur = (s, t2) => {
  for (var e in t2)
    zr(s, e, { get: t2[e], enumerable: true });
};
var Ds = typeof process == "object" && process ? process : { stdout: null, stderr: null };
var Wr = (s) => !!s && typeof s == "object" && (s instanceof A2 || s instanceof Cs || Gr(s) || Zr(s));
var Gr = (s) => !!s && typeof s == "object" && s instanceof Di && typeof s.pipe == "function" && s.pipe !== Cs.Writable.prototype.pipe;
var Zr = (s) => !!s && typeof s == "object" && s instanceof Di && typeof s.write == "function" && typeof s.end == "function";
var Q2 = Symbol("EOF");
var J2 = Symbol("maybeEmitEnd");
var nt = Symbol("emittedEnd");
var De = Symbol("emittingEnd");
var qt = Symbol("emittedError");
var Ne = Symbol("closed");
var Ns = Symbol("read");
var Ae = Symbol("flush");
var As = Symbol("flushChunk");
var z2 = Symbol("encoding");
var Mt = Symbol("decoder");
var g = Symbol("flowing");
var Qt = Symbol("paused");
var Bt = Symbol("resume");
var b2 = Symbol("buffer");
var N2 = Symbol("pipes");
var _2 = Symbol("bufferLength");
var bi = Symbol("bufferPush");
var Ie = Symbol("bufferShift");
var L2 = Symbol("objectMode");
var S2 = Symbol("destroyed");
var _i = Symbol("error");
var Oi = Symbol("emitData");
var Is = Symbol("emitEnd");
var Ti = Symbol("emitEnd2");
var Z2 = Symbol("async");
var xi = Symbol("abort");
var Ce = Symbol("aborted");
var Jt = Symbol("signal");
var Rt = Symbol("dataListeners");
var C3 = Symbol("discarded");
var jt = (s) => Promise.resolve().then(s);
var Yr = (s) => s();
var Kr = (s) => s === "end" || s === "finish" || s === "prefinish";
var Vr = (s) => s instanceof ArrayBuffer || !!s && typeof s == "object" && s.constructor && s.constructor.name === "ArrayBuffer" && s.byteLength >= 0;
var $r = (s) => !Buffer.isBuffer(s) && ArrayBuffer.isView(s);
var Fe = class {
  src;
  dest;
  opts;
  ondrain;
  constructor(t2, e, i2) {
    this.src = t2, this.dest = e, this.opts = i2, this.ondrain = () => t2[Bt](), this.dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  proxyErrors(t2) {}
  end() {
    this.unpipe(), this.opts.end && this.dest.end();
  }
};
var Li = class extends Fe {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors), super.unpipe();
  }
  constructor(t2, e, i2) {
    super(t2, e, i2), this.proxyErrors = (r3) => this.dest.emit("error", r3), t2.on("error", this.proxyErrors);
  }
};
var Xr = (s) => !!s.objectMode;
var qr = (s) => !s.objectMode && !!s.encoding && s.encoding !== "buffer";
var A2 = class extends Di {
  [g] = false;
  [Qt] = false;
  [N2] = [];
  [b2] = [];
  [L2];
  [z2];
  [Z2];
  [Mt];
  [Q2] = false;
  [nt] = false;
  [De] = false;
  [Ne] = false;
  [qt] = null;
  [_2] = 0;
  [S2] = false;
  [Jt];
  [Ce] = false;
  [Rt] = 0;
  [C3] = false;
  writable = true;
  readable = true;
  constructor(...t2) {
    let e = t2[0] || {};
    if (super(), e.objectMode && typeof e.encoding == "string")
      throw new TypeError("Encoding and objectMode may not be used together");
    Xr(e) ? (this[L2] = true, this[z2] = null) : qr(e) ? (this[z2] = e.encoding, this[L2] = false) : (this[L2] = false, this[z2] = null), this[Z2] = !!e.async, this[Mt] = this[z2] ? new Hr(this[z2]) : null, e && e.debugExposeBuffer === true && Object.defineProperty(this, "buffer", { get: () => this[b2] }), e && e.debugExposePipes === true && Object.defineProperty(this, "pipes", { get: () => this[N2] });
    let { signal: i2 } = e;
    i2 && (this[Jt] = i2, i2.aborted ? this[xi]() : i2.addEventListener("abort", () => this[xi]()));
  }
  get bufferLength() {
    return this[_2];
  }
  get encoding() {
    return this[z2];
  }
  set encoding(t2) {
    throw new Error("Encoding must be set at instantiation time");
  }
  setEncoding(t2) {
    throw new Error("Encoding must be set at instantiation time");
  }
  get objectMode() {
    return this[L2];
  }
  set objectMode(t2) {
    throw new Error("objectMode must be set at instantiation time");
  }
  get async() {
    return this[Z2];
  }
  set async(t2) {
    this[Z2] = this[Z2] || !!t2;
  }
  [xi]() {
    this[Ce] = true, this.emit("abort", this[Jt]?.reason), this.destroy(this[Jt]?.reason);
  }
  get aborted() {
    return this[Ce];
  }
  set aborted(t2) {}
  write(t2, e, i2) {
    if (this[Ce])
      return false;
    if (this[Q2])
      throw new Error("write after end");
    if (this[S2])
      return this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" })), true;
    typeof e == "function" && (i2 = e, e = "utf8"), e || (e = "utf8");
    let r3 = this[Z2] ? jt : Yr;
    if (!this[L2] && !Buffer.isBuffer(t2)) {
      if ($r(t2))
        t2 = Buffer.from(t2.buffer, t2.byteOffset, t2.byteLength);
      else if (Vr(t2))
        t2 = Buffer.from(t2);
      else if (typeof t2 != "string")
        throw new Error("Non-contiguous data written to non-objectMode stream");
    }
    return this[L2] ? (this[g] && this[_2] !== 0 && this[Ae](true), this[g] ? this.emit("data", t2) : this[bi](t2), this[_2] !== 0 && this.emit("readable"), i2 && r3(i2), this[g]) : t2.length ? (typeof t2 == "string" && !(e === this[z2] && !this[Mt]?.lastNeed) && (t2 = Buffer.from(t2, e)), Buffer.isBuffer(t2) && this[z2] && (t2 = this[Mt].write(t2)), this[g] && this[_2] !== 0 && this[Ae](true), this[g] ? this.emit("data", t2) : this[bi](t2), this[_2] !== 0 && this.emit("readable"), i2 && r3(i2), this[g]) : (this[_2] !== 0 && this.emit("readable"), i2 && r3(i2), this[g]);
  }
  read(t2) {
    if (this[S2])
      return null;
    if (this[C3] = false, this[_2] === 0 || t2 === 0 || t2 && t2 > this[_2])
      return this[J2](), null;
    this[L2] && (t2 = null), this[b2].length > 1 && !this[L2] && (this[b2] = [this[z2] ? this[b2].join("") : Buffer.concat(this[b2], this[_2])]);
    let e = this[Ns](t2 || null, this[b2][0]);
    return this[J2](), e;
  }
  [Ns](t2, e) {
    if (this[L2])
      this[Ie]();
    else {
      let i2 = e;
      t2 === i2.length || t2 === null ? this[Ie]() : typeof i2 == "string" ? (this[b2][0] = i2.slice(t2), e = i2.slice(0, t2), this[_2] -= t2) : (this[b2][0] = i2.subarray(t2), e = i2.subarray(0, t2), this[_2] -= t2);
    }
    return this.emit("data", e), !this[b2].length && !this[Q2] && this.emit("drain"), e;
  }
  end(t2, e, i2) {
    return typeof t2 == "function" && (i2 = t2, t2 = undefined), typeof e == "function" && (i2 = e, e = "utf8"), t2 !== undefined && this.write(t2, e), i2 && this.once("end", i2), this[Q2] = true, this.writable = false, (this[g] || !this[Qt]) && this[J2](), this;
  }
  [Bt]() {
    this[S2] || (!this[Rt] && !this[N2].length && (this[C3] = true), this[Qt] = false, this[g] = true, this.emit("resume"), this[b2].length ? this[Ae]() : this[Q2] ? this[J2]() : this.emit("drain"));
  }
  resume() {
    return this[Bt]();
  }
  pause() {
    this[g] = false, this[Qt] = true, this[C3] = false;
  }
  get destroyed() {
    return this[S2];
  }
  get flowing() {
    return this[g];
  }
  get paused() {
    return this[Qt];
  }
  [bi](t2) {
    this[L2] ? this[_2] += 1 : this[_2] += t2.length, this[b2].push(t2);
  }
  [Ie]() {
    return this[L2] ? this[_2] -= 1 : this[_2] -= this[b2][0].length, this[b2].shift();
  }
  [Ae](t2 = false) {
    do
      ;
    while (this[As](this[Ie]()) && this[b2].length);
    !t2 && !this[b2].length && !this[Q2] && this.emit("drain");
  }
  [As](t2) {
    return this.emit("data", t2), this[g];
  }
  pipe(t2, e) {
    if (this[S2])
      return t2;
    this[C3] = false;
    let i2 = this[nt];
    return e = e || {}, t2 === Ds.stdout || t2 === Ds.stderr ? e.end = false : e.end = e.end !== false, e.proxyErrors = !!e.proxyErrors, i2 ? e.end && t2.end() : (this[N2].push(e.proxyErrors ? new Li(this, t2, e) : new Fe(this, t2, e)), this[Z2] ? jt(() => this[Bt]()) : this[Bt]()), t2;
  }
  unpipe(t2) {
    let e = this[N2].find((i2) => i2.dest === t2);
    e && (this[N2].length === 1 ? (this[g] && this[Rt] === 0 && (this[g] = false), this[N2] = []) : this[N2].splice(this[N2].indexOf(e), 1), e.unpipe());
  }
  addListener(t2, e) {
    return this.on(t2, e);
  }
  on(t2, e) {
    let i2 = super.on(t2, e);
    if (t2 === "data")
      this[C3] = false, this[Rt]++, !this[N2].length && !this[g] && this[Bt]();
    else if (t2 === "readable" && this[_2] !== 0)
      super.emit("readable");
    else if (Kr(t2) && this[nt])
      super.emit(t2), this.removeAllListeners(t2);
    else if (t2 === "error" && this[qt]) {
      let r3 = e;
      this[Z2] ? jt(() => r3.call(this, this[qt])) : r3.call(this, this[qt]);
    }
    return i2;
  }
  removeListener(t2, e) {
    return this.off(t2, e);
  }
  off(t2, e) {
    let i2 = super.off(t2, e);
    return t2 === "data" && (this[Rt] = this.listeners("data").length, this[Rt] === 0 && !this[C3] && !this[N2].length && (this[g] = false)), i2;
  }
  removeAllListeners(t2) {
    let e = super.removeAllListeners(t2);
    return (t2 === "data" || t2 === undefined) && (this[Rt] = 0, !this[C3] && !this[N2].length && (this[g] = false)), e;
  }
  get emittedEnd() {
    return this[nt];
  }
  [J2]() {
    !this[De] && !this[nt] && !this[S2] && this[b2].length === 0 && this[Q2] && (this[De] = true, this.emit("end"), this.emit("prefinish"), this.emit("finish"), this[Ne] && this.emit("close"), this[De] = false);
  }
  emit(t2, ...e) {
    let i2 = e[0];
    if (t2 !== "error" && t2 !== "close" && t2 !== S2 && this[S2])
      return false;
    if (t2 === "data")
      return !this[L2] && !i2 ? false : this[Z2] ? (jt(() => this[Oi](i2)), true) : this[Oi](i2);
    if (t2 === "end")
      return this[Is]();
    if (t2 === "close") {
      if (this[Ne] = true, !this[nt] && !this[S2])
        return false;
      let n2 = super.emit("close");
      return this.removeAllListeners("close"), n2;
    } else if (t2 === "error") {
      this[qt] = i2, super.emit(_i, i2);
      let n2 = !this[Jt] || this.listeners("error").length ? super.emit("error", i2) : false;
      return this[J2](), n2;
    } else if (t2 === "resume") {
      let n2 = super.emit("resume");
      return this[J2](), n2;
    } else if (t2 === "finish" || t2 === "prefinish") {
      let n2 = super.emit(t2);
      return this.removeAllListeners(t2), n2;
    }
    let r3 = super.emit(t2, ...e);
    return this[J2](), r3;
  }
  [Oi](t2) {
    for (let i2 of this[N2])
      i2.dest.write(t2) === false && this.pause();
    let e = this[C3] ? false : super.emit("data", t2);
    return this[J2](), e;
  }
  [Is]() {
    return this[nt] ? false : (this[nt] = true, this.readable = false, this[Z2] ? (jt(() => this[Ti]()), true) : this[Ti]());
  }
  [Ti]() {
    if (this[Mt]) {
      let e = this[Mt].end();
      if (e) {
        for (let i2 of this[N2])
          i2.dest.write(e);
        this[C3] || super.emit("data", e);
      }
    }
    for (let e of this[N2])
      e.end();
    let t2 = super.emit("end");
    return this.removeAllListeners("end"), t2;
  }
  async collect() {
    let t2 = Object.assign([], { dataLength: 0 });
    this[L2] || (t2.dataLength = 0);
    let e = this.promise();
    return this.on("data", (i2) => {
      t2.push(i2), this[L2] || (t2.dataLength += i2.length);
    }), await e, t2;
  }
  async concat() {
    if (this[L2])
      throw new Error("cannot concat in objectMode");
    let t2 = await this.collect();
    return this[z2] ? t2.join("") : Buffer.concat(t2, t2.dataLength);
  }
  async promise() {
    return new Promise((t2, e) => {
      this.on(S2, () => e(new Error("stream destroyed"))), this.on("error", (i2) => e(i2)), this.on("end", () => t2());
    });
  }
  [Symbol.asyncIterator]() {
    this[C3] = false;
    let t2 = false, e = async () => (this.pause(), t2 = true, { value: undefined, done: true });
    return { next: () => {
      if (t2)
        return e();
      let r3 = this.read();
      if (r3 !== null)
        return Promise.resolve({ done: false, value: r3 });
      if (this[Q2])
        return e();
      let n2, o2, h2 = (d) => {
        this.off("data", a2), this.off("end", l2), this.off(S2, c4), e(), o2(d);
      }, a2 = (d) => {
        this.off("error", h2), this.off("end", l2), this.off(S2, c4), this.pause(), n2({ value: d, done: !!this[Q2] });
      }, l2 = () => {
        this.off("error", h2), this.off("data", a2), this.off(S2, c4), e(), n2({ done: true, value: undefined });
      }, c4 = () => h2(new Error("stream destroyed"));
      return new Promise((d, y2) => {
        o2 = y2, n2 = d, this.once(S2, c4), this.once("error", h2), this.once("end", l2), this.once("data", a2);
      });
    }, throw: e, return: e, [Symbol.asyncIterator]() {
      return this;
    }, [Symbol.asyncDispose]: async () => {} };
  }
  [Symbol.iterator]() {
    this[C3] = false;
    let t2 = false, e = () => (this.pause(), this.off(_i, e), this.off(S2, e), this.off("end", e), t2 = true, { done: true, value: undefined }), i2 = () => {
      if (t2)
        return e();
      let r3 = this.read();
      return r3 === null ? e() : { done: false, value: r3 };
    };
    return this.once("end", e), this.once(_i, e), this.once(S2, e), { next: i2, throw: e, return: e, [Symbol.iterator]() {
      return this;
    }, [Symbol.dispose]: () => {} };
  }
  destroy(t2) {
    if (this[S2])
      return t2 ? this.emit("error", t2) : this.emit(S2), this;
    this[S2] = true, this[C3] = true, this[b2].length = 0, this[_2] = 0;
    let e = this;
    return typeof e.close == "function" && !this[Ne] && e.close(), t2 ? this.emit("error", t2) : this.emit(S2), this;
  }
  static get isStream() {
    return Wr;
  }
};
var Jr = I3.writev;
var ht = Symbol("_autoClose");
var H2 = Symbol("_close");
var te = Symbol("_ended");
var m2 = Symbol("_fd");
var Ni = Symbol("_finished");
var tt = Symbol("_flags");
var Ai = Symbol("_flush");
var ki = Symbol("_handleChunk");
var vi = Symbol("_makeBuf");
var ie = Symbol("_mode");
var ke = Symbol("_needDrain");
var Ut = Symbol("_onerror");
var Ht = Symbol("_onopen");
var Ii = Symbol("_onread");
var Pt = Symbol("_onwrite");
var at = Symbol("_open");
var U2 = Symbol("_path");
var ot = Symbol("_pos");
var Y2 = Symbol("_queue");
var zt = Symbol("_read");
var Ci = Symbol("_readSize");
var j2 = Symbol("_reading");
var ee2 = Symbol("_remain");
var Fi = Symbol("_size");
var ve = Symbol("_write");
var gt = Symbol("_writing");
var Me = Symbol("_defaultFlag");
var bt = Symbol("_errored");
var _t = class extends A2 {
  [bt] = false;
  [m2];
  [U2];
  [Ci];
  [j2] = false;
  [Fi];
  [ee2];
  [ht];
  constructor(t2, e) {
    if (e = e || {}, super(e), this.readable = true, this.writable = false, typeof t2 != "string")
      throw new TypeError("path must be a string");
    this[bt] = false, this[m2] = typeof e.fd == "number" ? e.fd : undefined, this[U2] = t2, this[Ci] = e.readSize || 16 * 1024 * 1024, this[j2] = false, this[Fi] = typeof e.size == "number" ? e.size : 1 / 0, this[ee2] = this[Fi], this[ht] = typeof e.autoClose == "boolean" ? e.autoClose : true, typeof this[m2] == "number" ? this[zt]() : this[at]();
  }
  get fd() {
    return this[m2];
  }
  get path() {
    return this[U2];
  }
  write() {
    throw new TypeError("this is a readable stream");
  }
  end() {
    throw new TypeError("this is a readable stream");
  }
  [at]() {
    I3.open(this[U2], "r", (t2, e) => this[Ht](t2, e));
  }
  [Ht](t2, e) {
    t2 ? this[Ut](t2) : (this[m2] = e, this.emit("open", e), this[zt]());
  }
  [vi]() {
    return Buffer.allocUnsafe(Math.min(this[Ci], this[ee2]));
  }
  [zt]() {
    if (!this[j2]) {
      this[j2] = true;
      let t2 = this[vi]();
      if (t2.length === 0)
        return process.nextTick(() => this[Ii](null, 0, t2));
      I3.read(this[m2], t2, 0, t2.length, null, (e, i2, r3) => this[Ii](e, i2, r3));
    }
  }
  [Ii](t2, e, i2) {
    this[j2] = false, t2 ? this[Ut](t2) : this[ki](e, i2) && this[zt]();
  }
  [H2]() {
    if (this[ht] && typeof this[m2] == "number") {
      let t2 = this[m2];
      this[m2] = undefined, I3.close(t2, (e) => e ? this.emit("error", e) : this.emit("close"));
    }
  }
  [Ut](t2) {
    this[j2] = true, this[H2](), this.emit("error", t2);
  }
  [ki](t2, e) {
    let i2 = false;
    return this[ee2] -= t2, t2 > 0 && (i2 = super.write(t2 < e.length ? e.subarray(0, t2) : e)), (t2 === 0 || this[ee2] <= 0) && (i2 = false, this[H2](), super.end()), i2;
  }
  emit(t2, ...e) {
    switch (t2) {
      case "prefinish":
      case "finish":
        return false;
      case "drain":
        return typeof this[m2] == "number" && this[zt](), false;
      case "error":
        return this[bt] ? false : (this[bt] = true, super.emit(t2, ...e));
      default:
        return super.emit(t2, ...e);
    }
  }
};
var Be = class extends _t {
  [at]() {
    let t2 = true;
    try {
      this[Ht](null, I3.openSync(this[U2], "r")), t2 = false;
    } finally {
      t2 && this[H2]();
    }
  }
  [zt]() {
    let t2 = true;
    try {
      if (!this[j2]) {
        this[j2] = true;
        do {
          let e = this[vi](), i2 = e.length === 0 ? 0 : I3.readSync(this[m2], e, 0, e.length, null);
          if (!this[ki](i2, e))
            break;
        } while (true);
        this[j2] = false;
      }
      t2 = false;
    } finally {
      t2 && this[H2]();
    }
  }
  [H2]() {
    if (this[ht] && typeof this[m2] == "number") {
      let t2 = this[m2];
      this[m2] = undefined, I3.closeSync(t2), this.emit("close");
    }
  }
};
var et = class extends Qr {
  readable = false;
  writable = true;
  [bt] = false;
  [gt] = false;
  [te] = false;
  [Y2] = [];
  [ke] = false;
  [U2];
  [ie];
  [ht];
  [m2];
  [Me];
  [tt];
  [Ni] = false;
  [ot];
  constructor(t2, e) {
    e = e || {}, super(e), this[U2] = t2, this[m2] = typeof e.fd == "number" ? e.fd : undefined, this[ie] = e.mode === undefined ? 438 : e.mode, this[ot] = typeof e.start == "number" ? e.start : undefined, this[ht] = typeof e.autoClose == "boolean" ? e.autoClose : true;
    let i2 = this[ot] !== undefined ? "r+" : "w";
    this[Me] = e.flags === undefined, this[tt] = e.flags === undefined ? i2 : e.flags, this[m2] === undefined && this[at]();
  }
  emit(t2, ...e) {
    if (t2 === "error") {
      if (this[bt])
        return false;
      this[bt] = true;
    }
    return super.emit(t2, ...e);
  }
  get fd() {
    return this[m2];
  }
  get path() {
    return this[U2];
  }
  [Ut](t2) {
    this[H2](), this[gt] = true, this.emit("error", t2);
  }
  [at]() {
    I3.open(this[U2], this[tt], this[ie], (t2, e) => this[Ht](t2, e));
  }
  [Ht](t2, e) {
    this[Me] && this[tt] === "r+" && t2 && t2.code === "ENOENT" ? (this[tt] = "w", this[at]()) : t2 ? this[Ut](t2) : (this[m2] = e, this.emit("open", e), this[gt] || this[Ai]());
  }
  end(t2, e) {
    return t2 && this.write(t2, e), this[te] = true, !this[gt] && !this[Y2].length && typeof this[m2] == "number" && this[Pt](null, 0), this;
  }
  write(t2, e) {
    return typeof t2 == "string" && (t2 = Buffer.from(t2, e)), this[te] ? (this.emit("error", new Error("write() after end()")), false) : this[m2] === undefined || this[gt] || this[Y2].length ? (this[Y2].push(t2), this[ke] = true, false) : (this[gt] = true, this[ve](t2), true);
  }
  [ve](t2) {
    I3.write(this[m2], t2, 0, t2.length, this[ot], (e, i2) => this[Pt](e, i2));
  }
  [Pt](t2, e) {
    t2 ? this[Ut](t2) : (this[ot] !== undefined && typeof e == "number" && (this[ot] += e), this[Y2].length ? this[Ai]() : (this[gt] = false, this[te] && !this[Ni] ? (this[Ni] = true, this[H2](), this.emit("finish")) : this[ke] && (this[ke] = false, this.emit("drain"))));
  }
  [Ai]() {
    if (this[Y2].length === 0)
      this[te] && this[Pt](null, 0);
    else if (this[Y2].length === 1)
      this[ve](this[Y2].pop());
    else {
      let t2 = this[Y2];
      this[Y2] = [], Jr(this[m2], t2, this[ot], (e, i2) => this[Pt](e, i2));
    }
  }
  [H2]() {
    if (this[ht] && typeof this[m2] == "number") {
      let t2 = this[m2];
      this[m2] = undefined, I3.close(t2, (e) => e ? this.emit("error", e) : this.emit("close"));
    }
  }
};
var Wt = class extends et {
  [at]() {
    let t2;
    if (this[Me] && this[tt] === "r+")
      try {
        t2 = I3.openSync(this[U2], this[tt], this[ie]);
      } catch (e) {
        if (e?.code === "ENOENT")
          return this[tt] = "w", this[at]();
        throw e;
      }
    else
      t2 = I3.openSync(this[U2], this[tt], this[ie]);
    this[Ht](null, t2);
  }
  [H2]() {
    if (this[ht] && typeof this[m2] == "number") {
      let t2 = this[m2];
      this[m2] = undefined, I3.closeSync(t2), this.emit("close");
    }
  }
  [ve](t2) {
    let e = true;
    try {
      this[Pt](null, I3.writeSync(this[m2], t2, 0, t2.length, this[ot])), e = false;
    } finally {
      if (e)
        try {
          this[H2]();
        } catch {}
    }
  }
};
var jr = new Map([["C", "cwd"], ["f", "file"], ["z", "gzip"], ["P", "preservePaths"], ["U", "unlink"], ["strip-components", "strip"], ["stripComponents", "strip"], ["keep-newer", "newer"], ["keepNewer", "newer"], ["keep-newer-files", "newer"], ["keepNewerFiles", "newer"], ["k", "keep"], ["keep-existing", "keep"], ["keepExisting", "keep"], ["m", "noMtime"], ["no-mtime", "noMtime"], ["p", "preserveOwner"], ["L", "follow"], ["h", "follow"], ["onentry", "onReadEntry"]]);
var Fs = (s) => !!s.sync && !!s.file;
var ks = (s) => !s.sync && !!s.file;
var vs = (s) => !!s.sync && !s.file;
var Ms = (s) => !s.sync && !s.file;
var Bs = (s) => !!s.file;
var tn = (s) => {
  let t2 = jr.get(s);
  return t2 || s;
};
var se = (s = {}) => {
  if (!s)
    return {};
  let t2 = {};
  for (let [e, i2] of Object.entries(s)) {
    let r3 = tn(e);
    t2[r3] = i2;
  }
  return t2.chmod === undefined && t2.noChmod === false && (t2.chmod = true), delete t2.noChmod, t2;
};
var K2 = (s, t2, e, i2, r3) => Object.assign((n2 = [], o2, h2) => {
  Array.isArray(n2) && (o2 = n2, n2 = {}), typeof o2 == "function" && (h2 = o2, o2 = undefined), o2 = o2 ? Array.from(o2) : [];
  let a2 = se(n2);
  if (r3?.(a2, o2), Fs(a2)) {
    if (typeof h2 == "function")
      throw new TypeError("callback not supported for sync tar functions");
    return s(a2, o2);
  } else if (ks(a2)) {
    let l2 = t2(a2, o2);
    return h2 ? l2.then(() => h2(), h2) : l2;
  } else if (vs(a2)) {
    if (typeof h2 == "function")
      throw new TypeError("callback not supported for sync tar functions");
    return e(a2, o2);
  } else if (Ms(a2)) {
    if (typeof h2 == "function")
      throw new TypeError("callback only supported with file option");
    return i2(a2, o2);
  }
  throw new Error("impossible options??");
}, { syncFile: s, asyncFile: t2, syncNoFile: e, asyncNoFile: i2, validate: r3 });
var sn = en.constants || { ZLIB_VERNUM: 4736 };
var M2 = Object.freeze(Object.assign(Object.create(null), { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_MEM_ERROR: -4, Z_BUF_ERROR: -5, Z_VERSION_ERROR: -6, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, DEFLATE: 1, INFLATE: 2, GZIP: 3, GUNZIP: 4, DEFLATERAW: 5, INFLATERAW: 6, UNZIP: 7, BROTLI_DECODE: 8, BROTLI_ENCODE: 9, Z_MIN_WINDOWBITS: 8, Z_MAX_WINDOWBITS: 15, Z_DEFAULT_WINDOWBITS: 15, Z_MIN_CHUNK: 64, Z_MAX_CHUNK: 1 / 0, Z_DEFAULT_CHUNK: 16384, Z_MIN_MEMLEVEL: 1, Z_MAX_MEMLEVEL: 9, Z_DEFAULT_MEMLEVEL: 8, Z_MIN_LEVEL: -1, Z_MAX_LEVEL: 9, Z_DEFAULT_LEVEL: -1, BROTLI_OPERATION_PROCESS: 0, BROTLI_OPERATION_FLUSH: 1, BROTLI_OPERATION_FINISH: 2, BROTLI_OPERATION_EMIT_METADATA: 3, BROTLI_MODE_GENERIC: 0, BROTLI_MODE_TEXT: 1, BROTLI_MODE_FONT: 2, BROTLI_DEFAULT_MODE: 0, BROTLI_MIN_QUALITY: 0, BROTLI_MAX_QUALITY: 11, BROTLI_DEFAULT_QUALITY: 11, BROTLI_MIN_WINDOW_BITS: 10, BROTLI_MAX_WINDOW_BITS: 24, BROTLI_LARGE_MAX_WINDOW_BITS: 30, BROTLI_DEFAULT_WINDOW: 22, BROTLI_MIN_INPUT_BLOCK_BITS: 16, BROTLI_MAX_INPUT_BLOCK_BITS: 24, BROTLI_PARAM_MODE: 0, BROTLI_PARAM_QUALITY: 1, BROTLI_PARAM_LGWIN: 2, BROTLI_PARAM_LGBLOCK: 3, BROTLI_PARAM_DISABLE_LITERAL_CONTEXT_MODELING: 4, BROTLI_PARAM_SIZE_HINT: 5, BROTLI_PARAM_LARGE_WINDOW: 6, BROTLI_PARAM_NPOSTFIX: 7, BROTLI_PARAM_NDIRECT: 8, BROTLI_DECODER_RESULT_ERROR: 0, BROTLI_DECODER_RESULT_SUCCESS: 1, BROTLI_DECODER_RESULT_NEEDS_MORE_INPUT: 2, BROTLI_DECODER_RESULT_NEEDS_MORE_OUTPUT: 3, BROTLI_DECODER_PARAM_DISABLE_RING_BUFFER_REALLOCATION: 0, BROTLI_DECODER_PARAM_LARGE_WINDOW: 1, BROTLI_DECODER_NO_ERROR: 0, BROTLI_DECODER_SUCCESS: 1, BROTLI_DECODER_NEEDS_MORE_INPUT: 2, BROTLI_DECODER_NEEDS_MORE_OUTPUT: 3, BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_NIBBLE: -1, BROTLI_DECODER_ERROR_FORMAT_RESERVED: -2, BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_META_NIBBLE: -3, BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_ALPHABET: -4, BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_SAME: -5, BROTLI_DECODER_ERROR_FORMAT_CL_SPACE: -6, BROTLI_DECODER_ERROR_FORMAT_HUFFMAN_SPACE: -7, BROTLI_DECODER_ERROR_FORMAT_CONTEXT_MAP_REPEAT: -8, BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_1: -9, BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_2: -10, BROTLI_DECODER_ERROR_FORMAT_TRANSFORM: -11, BROTLI_DECODER_ERROR_FORMAT_DICTIONARY: -12, BROTLI_DECODER_ERROR_FORMAT_WINDOW_BITS: -13, BROTLI_DECODER_ERROR_FORMAT_PADDING_1: -14, BROTLI_DECODER_ERROR_FORMAT_PADDING_2: -15, BROTLI_DECODER_ERROR_FORMAT_DISTANCE: -16, BROTLI_DECODER_ERROR_DICTIONARY_NOT_SET: -19, BROTLI_DECODER_ERROR_INVALID_ARGUMENTS: -20, BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MODES: -21, BROTLI_DECODER_ERROR_ALLOC_TREE_GROUPS: -22, BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MAP: -25, BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_1: -26, BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_2: -27, BROTLI_DECODER_ERROR_ALLOC_BLOCK_TYPE_TREES: -30, BROTLI_DECODER_ERROR_UNREACHABLE: -31 }, sn));
var rn = Ot.concat;
var zs = Object.getOwnPropertyDescriptor(Ot, "concat");
var nn = (s) => s;
var Bi = zs?.writable === true || zs?.set !== undefined ? (s) => {
  Ot.concat = s ? nn : rn;
} : (s) => {};
var Tt = Symbol("_superWrite");
var Gt = class extends Error {
  code;
  errno;
  constructor(t2, e) {
    super("zlib: " + t2.message, { cause: t2 }), this.code = t2.code, this.errno = t2.errno, this.code || (this.code = "ZLIB_ERROR"), this.message = "zlib: " + t2.message, Error.captureStackTrace(this, e ?? this.constructor);
  }
  get name() {
    return "ZlibError";
  }
};
var Pi = Symbol("flushFlag");
var re = class extends A2 {
  #t = false;
  #i = false;
  #s;
  #n;
  #r;
  #e;
  #o;
  get sawError() {
    return this.#t;
  }
  get handle() {
    return this.#e;
  }
  get flushFlag() {
    return this.#s;
  }
  constructor(t2, e) {
    if (!t2 || typeof t2 != "object")
      throw new TypeError("invalid options for ZlibBase constructor");
    if (super(t2), this.#s = t2.flush ?? 0, this.#n = t2.finishFlush ?? 0, this.#r = t2.fullFlushFlag ?? 0, typeof Ps[e] != "function")
      throw new TypeError("Compression method not supported: " + e);
    try {
      this.#e = new Ps[e](t2);
    } catch (i2) {
      throw new Gt(i2, this.constructor);
    }
    this.#o = (i2) => {
      this.#t || (this.#t = true, this.close(), this.emit("error", i2));
    }, this.#e?.on("error", (i2) => this.#o(new Gt(i2))), this.once("end", () => this.close);
  }
  close() {
    this.#e && (this.#e.close(), this.#e = undefined, this.emit("close"));
  }
  reset() {
    if (!this.#t)
      return zi(this.#e, "zlib binding closed"), this.#e.reset?.();
  }
  flush(t2) {
    this.ended || (typeof t2 != "number" && (t2 = this.#r), this.write(Object.assign(Ot.alloc(0), { [Pi]: t2 })));
  }
  end(t2, e, i2) {
    return typeof t2 == "function" && (i2 = t2, e = undefined, t2 = undefined), typeof e == "function" && (i2 = e, e = undefined), t2 && (e ? this.write(t2, e) : this.write(t2)), this.flush(this.#n), this.#i = true, super.end(i2);
  }
  get ended() {
    return this.#i;
  }
  [Tt](t2) {
    return super.write(t2);
  }
  write(t2, e, i2) {
    if (typeof e == "function" && (i2 = e, e = "utf8"), typeof t2 == "string" && (t2 = Ot.from(t2, e)), this.#t)
      return;
    zi(this.#e, "zlib binding closed");
    let r3 = this.#e._handle, n2 = r3.close;
    r3.close = () => {};
    let o2 = this.#e.close;
    this.#e.close = () => {}, Bi(true);
    let h2;
    try {
      let l2 = typeof t2[Pi] == "number" ? t2[Pi] : this.#s;
      h2 = this.#e._processChunk(t2, l2), Bi(false);
    } catch (l2) {
      Bi(false), this.#o(new Gt(l2, this.write));
    } finally {
      this.#e && (this.#e._handle = r3, r3.close = n2, this.#e.close = o2, this.#e.removeAllListeners("error"));
    }
    this.#e && this.#e.on("error", (l2) => this.#o(new Gt(l2, this.write)));
    let a2;
    if (h2)
      if (Array.isArray(h2) && h2.length > 0) {
        let l2 = h2[0];
        a2 = this[Tt](Ot.from(l2));
        for (let c4 = 1;c4 < h2.length; c4++)
          a2 = this[Tt](h2[c4]);
      } else
        a2 = this[Tt](Ot.from(h2));
    return i2 && i2(), a2;
  }
};
var Pe = class extends re {
  #t;
  #i;
  constructor(t2, e) {
    t2 = t2 || {}, t2.flush = t2.flush || M2.Z_NO_FLUSH, t2.finishFlush = t2.finishFlush || M2.Z_FINISH, t2.fullFlushFlag = M2.Z_FULL_FLUSH, super(t2, e), this.#t = t2.level, this.#i = t2.strategy;
  }
  params(t2, e) {
    if (!this.sawError) {
      if (!this.handle)
        throw new Error("cannot switch params when binding is closed");
      if (!this.handle.params)
        throw new Error("not supported in this implementation");
      if (this.#t !== t2 || this.#i !== e) {
        this.flush(M2.Z_SYNC_FLUSH), zi(this.handle, "zlib binding closed");
        let i2 = this.handle.flush;
        this.handle.flush = (r3, n2) => {
          typeof r3 == "function" && (n2 = r3, r3 = this.flushFlag), this.flush(r3), n2?.();
        };
        try {
          this.handle.params(t2, e);
        } finally {
          this.handle.flush = i2;
        }
        this.handle && (this.#t = t2, this.#i = e);
      }
    }
  }
};
var ze = class extends Pe {
  #t;
  constructor(t2) {
    super(t2, "Gzip"), this.#t = t2 && !!t2.portable;
  }
  [Tt](t2) {
    return this.#t ? (this.#t = false, t2[9] = 255, super[Tt](t2)) : super[Tt](t2);
  }
};
var Ue = class extends Pe {
  constructor(t2) {
    super(t2, "Unzip");
  }
};
var He = class extends re {
  constructor(t2, e) {
    t2 = t2 || {}, t2.flush = t2.flush || M2.BROTLI_OPERATION_PROCESS, t2.finishFlush = t2.finishFlush || M2.BROTLI_OPERATION_FINISH, t2.fullFlushFlag = M2.BROTLI_OPERATION_FLUSH, super(t2, e);
  }
};
var We = class extends He {
  constructor(t2) {
    super(t2, "BrotliCompress");
  }
};
var Ge = class extends He {
  constructor(t2) {
    super(t2, "BrotliDecompress");
  }
};
var Ze = class extends re {
  constructor(t2, e) {
    t2 = t2 || {}, t2.flush = t2.flush || M2.ZSTD_e_continue, t2.finishFlush = t2.finishFlush || M2.ZSTD_e_end, t2.fullFlushFlag = M2.ZSTD_e_flush, super(t2, e);
  }
};
var Ye = class extends Ze {
  constructor(t2) {
    super(t2, "ZstdCompress");
  }
};
var Ke = class extends Ze {
  constructor(t2) {
    super(t2, "ZstdDecompress");
  }
};
var Us = (s, t2) => {
  if (Number.isSafeInteger(s))
    s < 0 ? an(s, t2) : hn(s, t2);
  else
    throw Error("cannot encode number outside of javascript safe integer range");
  return t2;
};
var hn = (s, t2) => {
  t2[0] = 128;
  for (var e = t2.length;e > 1; e--)
    t2[e - 1] = s & 255, s = Math.floor(s / 256);
};
var an = (s, t2) => {
  t2[0] = 255;
  var e = false;
  s = s * -1;
  for (var i2 = t2.length;i2 > 1; i2--) {
    var r3 = s & 255;
    s = Math.floor(s / 256), e ? t2[i2 - 1] = Ws(r3) : r3 === 0 ? t2[i2 - 1] = 0 : (e = true, t2[i2 - 1] = Gs(r3));
  }
};
var Hs = (s) => {
  let t2 = s[0], e = t2 === 128 ? cn(s.subarray(1, s.length)) : t2 === 255 ? ln(s) : null;
  if (e === null)
    throw Error("invalid base256 encoding");
  if (!Number.isSafeInteger(e))
    throw Error("parsed number outside of javascript safe integer range");
  return e;
};
var ln = (s) => {
  for (var t2 = s.length, e = 0, i2 = false, r3 = t2 - 1;r3 > -1; r3--) {
    var n2 = Number(s[r3]), o2;
    i2 ? o2 = Ws(n2) : n2 === 0 ? o2 = n2 : (i2 = true, o2 = Gs(n2)), o2 !== 0 && (e -= o2 * Math.pow(256, t2 - r3 - 1));
  }
  return e;
};
var cn = (s) => {
  for (var t2 = s.length, e = 0, i2 = t2 - 1;i2 > -1; i2--) {
    var r3 = Number(s[i2]);
    r3 !== 0 && (e += r3 * Math.pow(256, t2 - i2 - 1));
  }
  return e;
};
var Ws = (s) => (255 ^ s) & 255;
var Gs = (s) => (255 ^ s) + 1 & 255;
var Hi = {};
Ur(Hi, { code: () => Ve, isCode: () => ne2, isName: () => dn, name: () => oe, normalFsTypes: () => Ui });
var ne2 = (s) => oe.has(s);
var dn = (s) => Ve.has(s);
var Ui = new Set(["0", "", "1", "2", "3", "4", "5", "6", "7", "D"]);
var oe = new Map([["0", "File"], ["", "OldFile"], ["1", "Link"], ["2", "SymbolicLink"], ["3", "CharacterDevice"], ["4", "BlockDevice"], ["5", "Directory"], ["6", "FIFO"], ["7", "ContiguousFile"], ["g", "GlobalExtendedHeader"], ["x", "ExtendedHeader"], ["A", "SolarisACL"], ["D", "GNUDumpDir"], ["I", "Inode"], ["K", "NextFileHasLongLinkpath"], ["L", "NextFileHasLongPath"], ["M", "ContinuationFile"], ["N", "OldGnuLongPath"], ["S", "SparseFile"], ["V", "TapeVolumeHeader"], ["X", "OldExtendedHeader"]]);
var Ve = new Map(Array.from(oe).map((s) => [s[1], s[0]]));
var un = (s) => s === undefined || s < 0 ? undefined : s;
var F2 = class {
  cksumValid = false;
  needPax = false;
  nullBlock = false;
  block;
  path;
  mode;
  uid;
  gid;
  size;
  cksum;
  #t = "Unsupported";
  linkpath;
  uname;
  gname;
  devmaj = 0;
  devmin = 0;
  atime;
  ctime;
  mtime;
  charset;
  comment;
  constructor(t2, e = 0, i2, r3) {
    Buffer.isBuffer(t2) ? this.decode(t2, e || 0, i2, r3) : t2 && this.#i(t2);
  }
  decode(t2, e, i2, r3) {
    if (e || (e = 0), !t2 || !(t2.length >= e + 512))
      throw new Error("need 512 bytes for header");
    let n2 = xt(t2, e + 156, 1), o2 = Ui.has(n2), h2 = o2 ? i2 : undefined, a2 = o2 ? r3 : undefined;
    if (this.path = h2?.path ?? xt(t2, e, 100), this.mode = h2?.mode ?? a2?.mode ?? lt(t2, e + 100, 8), this.uid = h2?.uid ?? a2?.uid ?? lt(t2, e + 108, 8), this.gid = h2?.gid ?? a2?.gid ?? lt(t2, e + 116, 8), this.size = un(h2?.size ?? a2?.size ?? lt(t2, e + 124, 12)), this.mtime = h2?.mtime ?? a2?.mtime ?? Wi(t2, e + 136, 12), this.cksum = lt(t2, e + 148, 12), a2 && this.#i(a2, true), h2 && this.#i(h2), ne2(n2) && (this.#t = n2 || "0"), this.#t === "0" && this.path.slice(-1) === "/" && (this.#t = "5"), this.#t === "5" && (this.size = 0), this.linkpath = xt(t2, e + 157, 100), t2.subarray(e + 257, e + 265).toString() === "ustar\x0000")
      if (this.uname = h2?.uname ?? a2?.uname ?? xt(t2, e + 265, 32), this.gname = h2?.gname ?? a2?.gname ?? xt(t2, e + 297, 32), this.devmaj = h2?.devmaj ?? a2?.devmaj ?? lt(t2, e + 329, 8) ?? 0, this.devmin = h2?.devmin ?? a2?.devmin ?? lt(t2, e + 337, 8) ?? 0, t2[e + 475] !== 0) {
        let c4 = xt(t2, e + 345, 155);
        this.path = c4 + "/" + this.path;
      } else {
        let c4 = xt(t2, e + 345, 130);
        c4 && (this.path = c4 + "/" + this.path), this.atime = i2?.atime ?? r3?.atime ?? Wi(t2, e + 476, 12), this.ctime = i2?.ctime ?? r3?.ctime ?? Wi(t2, e + 488, 12);
      }
    let l2 = 256;
    for (let c4 = e;c4 < e + 148; c4++)
      l2 += t2[c4];
    for (let c4 = e + 156;c4 < e + 512; c4++)
      l2 += t2[c4];
    this.cksumValid = l2 === this.cksum, this.cksum === undefined && l2 === 256 && (this.nullBlock = true);
  }
  #i(t2, e = false) {
    Object.assign(this, Object.fromEntries(Object.entries(t2).filter(([i2, r3]) => !(r3 == null || i2 === "size" && Number(r3) < 0 || i2 === "path" && e || i2 === "linkpath" && e || i2 === "global"))));
  }
  encode(t2, e = 0) {
    if (t2 || (t2 = this.block = Buffer.alloc(512)), this.#t === "Unsupported" && (this.#t = "0"), !(t2.length >= e + 512))
      throw new Error("need 512 bytes for header");
    let i2 = this.ctime || this.atime ? 130 : 155, r3 = mn(this.path || "", i2), n2 = r3[0], o2 = r3[1];
    this.needPax = !!r3[2], this.needPax = Lt(t2, e, 100, n2) || this.needPax, this.needPax = ct(t2, e + 100, 8, this.mode) || this.needPax, this.needPax = ct(t2, e + 108, 8, this.uid) || this.needPax, this.needPax = ct(t2, e + 116, 8, this.gid) || this.needPax, this.needPax = ct(t2, e + 124, 12, this.size) || this.needPax, this.needPax = Gi(t2, e + 136, 12, this.mtime) || this.needPax, t2[e + 156] = Number(this.#t.codePointAt(0)), this.needPax = Lt(t2, e + 157, 100, this.linkpath) || this.needPax, t2.write("ustar\x0000", e + 257, 8), this.needPax = Lt(t2, e + 265, 32, this.uname) || this.needPax, this.needPax = Lt(t2, e + 297, 32, this.gname) || this.needPax, this.needPax = ct(t2, e + 329, 8, this.devmaj) || this.needPax, this.needPax = ct(t2, e + 337, 8, this.devmin) || this.needPax, this.needPax = Lt(t2, e + 345, i2, o2) || this.needPax, t2[e + 475] !== 0 ? this.needPax = Lt(t2, e + 345, 155, o2) || this.needPax : (this.needPax = Lt(t2, e + 345, 130, o2) || this.needPax, this.needPax = Gi(t2, e + 476, 12, this.atime) || this.needPax, this.needPax = Gi(t2, e + 488, 12, this.ctime) || this.needPax);
    let h2 = 256;
    for (let a2 = e;a2 < e + 148; a2++)
      h2 += t2[a2];
    for (let a2 = e + 156;a2 < e + 512; a2++)
      h2 += t2[a2];
    return this.cksum = h2, ct(t2, e + 148, 8, this.cksum), this.cksumValid = true, this.needPax;
  }
  get type() {
    return this.#t === "Unsupported" ? this.#t : oe.get(this.#t);
  }
  get typeKey() {
    return this.#t;
  }
  set type(t2) {
    let e = String(Ve.get(t2));
    if (ne2(e) || e === "Unsupported")
      this.#t = e;
    else if (ne2(t2))
      this.#t = t2;
    else
      throw new TypeError("invalid entry type: " + t2);
  }
};
var mn = (s, t2) => {
  let i2 = s, r3 = "", n2, o2 = Zt.parse(s).root || ".";
  if (Buffer.byteLength(i2) < 100)
    n2 = [i2, r3, false];
  else {
    r3 = Zt.dirname(i2), i2 = Zt.basename(i2);
    do
      Buffer.byteLength(i2) <= 100 && Buffer.byteLength(r3) <= t2 ? n2 = [i2, r3, false] : Buffer.byteLength(i2) > 100 && Buffer.byteLength(r3) <= t2 ? n2 = [i2.slice(0, 99), r3, true] : (i2 = Zt.join(Zt.basename(r3), i2), r3 = Zt.dirname(r3));
    while (r3 !== o2 && n2 === undefined);
    n2 || (n2 = [s.slice(0, 99), "", true]);
  }
  return n2;
};
var xt = (s, t2, e) => s.subarray(t2, t2 + e).toString("utf8").replace(/\0.*/, "");
var Wi = (s, t2, e) => pn(lt(s, t2, e));
var pn = (s) => s === undefined ? undefined : new Date(s * 1000);
var lt = (s, t2, e) => Number(s[t2]) & 128 ? Hs(s.subarray(t2, t2 + e)) : wn(s, t2, e);
var En = (s) => isNaN(s) ? undefined : s;
var wn = (s, t2, e) => En(parseInt(s.subarray(t2, t2 + e).toString("utf8").replace(/\0.*$/, "").trim(), 8));
var Sn = { 12: 8589934591, 8: 2097151 };
var ct = (s, t2, e, i2) => i2 === undefined ? false : i2 > Sn[e] || i2 < 0 ? (Us(i2, s.subarray(t2, t2 + e)), true) : (yn(s, t2, e, i2), false);
var yn = (s, t2, e, i2) => s.write(Rn(i2, e), t2, e, "ascii");
var Rn = (s, t2) => gn(Math.floor(s).toString(8), t2);
var gn = (s, t2) => (s.length === t2 - 1 ? s : new Array(t2 - s.length - 1).join("0") + s + " ") + "\x00";
var Gi = (s, t2, e, i2) => i2 === undefined ? false : ct(s, t2, e, i2.getTime() / 1000);
var bn = new Array(156).join("\x00");
var Lt = (s, t2, e, i2) => i2 === undefined ? false : (s.write(i2 + bn, t2, e, "utf8"), i2.length !== Buffer.byteLength(i2) || i2.length > e);
var ft = class s {
  atime;
  mtime;
  ctime;
  charset;
  comment;
  gid;
  uid;
  gname;
  uname;
  linkpath;
  dev;
  ino;
  nlink;
  path;
  size;
  mode;
  global;
  constructor(t2, e = false) {
    this.atime = t2.atime, this.charset = t2.charset, this.comment = t2.comment, this.ctime = t2.ctime, this.dev = t2.dev, this.gid = t2.gid, this.global = e, this.gname = t2.gname, this.ino = t2.ino, this.linkpath = t2.linkpath, this.mtime = t2.mtime, this.nlink = t2.nlink, this.path = t2.path, this.size = t2.size, this.uid = t2.uid, this.uname = t2.uname;
  }
  encode() {
    let t2 = this.encodeBody();
    if (t2 === "")
      return Buffer.allocUnsafe(0);
    let e = Buffer.byteLength(t2), i2 = 512 * Math.ceil(1 + e / 512), r3 = Buffer.allocUnsafe(i2);
    for (let n2 = 0;n2 < 512; n2++)
      r3[n2] = 0;
    new F2({ path: ("PaxHeader/" + _n(this.path ?? "")).slice(0, 99), mode: this.mode || 420, uid: this.uid, gid: this.gid, size: e, mtime: this.mtime, type: this.global ? "GlobalExtendedHeader" : "ExtendedHeader", linkpath: "", uname: this.uname || "", gname: this.gname || "", devmaj: 0, devmin: 0, atime: this.atime, ctime: this.ctime }).encode(r3), r3.write(t2, 512, e, "utf8");
    for (let n2 = e + 512;n2 < r3.length; n2++)
      r3[n2] = 0;
    return r3;
  }
  encodeBody() {
    return this.encodeField("path") + this.encodeField("ctime") + this.encodeField("atime") + this.encodeField("dev") + this.encodeField("ino") + this.encodeField("nlink") + this.encodeField("charset") + this.encodeField("comment") + this.encodeField("gid") + this.encodeField("gname") + this.encodeField("linkpath") + this.encodeField("mtime") + this.encodeField("size") + this.encodeField("uid") + this.encodeField("uname");
  }
  encodeField(t2) {
    if (this[t2] === undefined)
      return "";
    let e = this[t2], i2 = e instanceof Date ? e.getTime() / 1000 : e, r3 = " " + (t2 === "dev" || t2 === "ino" || t2 === "nlink" ? "SCHILY." : "") + t2 + "=" + i2 + `
`, n2 = Buffer.byteLength(r3), o2 = Math.floor(Math.log(n2) / Math.log(10)) + 1;
    return n2 + o2 >= Math.pow(10, o2) && (o2 += 1), o2 + n2 + r3;
  }
  static parse(t2, e, i2 = false) {
    return new s(On(Tn(t2), e), i2);
  }
};
var On = (s2, t2) => t2 ? Object.assign({}, t2, s2) : s2;
var Tn = (s2) => s2.replace(/\n$/, "").split(`
`).reduce(xn, Object.create(null));
var xn = (s2, t2) => {
  let e = parseInt(t2, 10);
  if (e !== Buffer.byteLength(t2) + 1)
    return s2;
  t2 = t2.slice((e + " ").length);
  let i2 = t2.split("="), r3 = i2.shift();
  if (!r3)
    return s2;
  let n2 = r3.replace(/^SCHILY\.(dev|ino|nlink)/, "$1"), o2 = i2.join("=").replace(/\0.*/, "");
  switch (n2) {
    case "path":
    case "linkpath":
    case "type":
    case "charset":
    case "comment":
    case "gname":
    case "uname":
      s2[n2] = o2;
      break;
    case "ctime":
    case "atime":
    case "mtime":
      s2[n2] = new Date(Number(o2) * 1000);
      break;
    case "size":
      let h2 = +o2;
      h2 >= 0 && (s2[n2] = h2);
      break;
    case "gid":
    case "uid":
    case "dev":
    case "ino":
    case "nlink":
    case "mode":
      s2[n2] = +o2;
      break;
  }
  return s2;
};
var Ln = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform;
var f = Ln !== "win32" ? (s2) => String(s2) : (s2) => String(s2).replaceAll(/\\/g, "/");
var $e = class extends A2 {
  extended;
  globalExtended;
  header;
  startBlockSize;
  blockRemain;
  remain;
  type;
  meta = false;
  ignore = false;
  path;
  mode;
  uid;
  gid;
  uname;
  gname;
  size = 0;
  mtime;
  atime;
  ctime;
  linkpath;
  dev;
  ino;
  nlink;
  invalid = false;
  absolute;
  unsupported = false;
  constructor(t2, e, i2) {
    switch (super({}), this.pause(), this.extended = e, this.globalExtended = i2, this.header = t2, this.remain = t2.size ?? 0, this.startBlockSize = 512 * Math.ceil(this.remain / 512), this.blockRemain = this.startBlockSize, this.type = t2.type, this.type) {
      case "File":
      case "OldFile":
      case "Link":
      case "SymbolicLink":
      case "CharacterDevice":
      case "BlockDevice":
      case "Directory":
      case "FIFO":
      case "ContiguousFile":
      case "GNUDumpDir":
        break;
      case "NextFileHasLongLinkpath":
      case "NextFileHasLongPath":
      case "OldGnuLongPath":
      case "GlobalExtendedHeader":
      case "ExtendedHeader":
      case "OldExtendedHeader":
        this.meta = true;
        break;
      default:
        this.ignore = true;
    }
    if (!t2.path)
      throw new Error("no path provided for tar.ReadEntry");
    this.path = f(t2.path), this.mode = t2.mode, this.mode && (this.mode = this.mode & 4095), this.uid = t2.uid, this.gid = t2.gid, this.uname = t2.uname, this.gname = t2.gname, this.size = this.remain, this.mtime = t2.mtime, this.atime = t2.atime, this.ctime = t2.ctime, this.linkpath = t2.linkpath ? f(t2.linkpath) : undefined, this.uname = t2.uname, this.gname = t2.gname, e && this.#t(e), i2 && this.#t(i2, true);
  }
  write(t2) {
    let e = t2.length;
    if (e > this.blockRemain)
      throw new Error("writing more to entry than is appropriate");
    let i2 = this.remain, r3 = this.blockRemain;
    return this.remain = Math.max(0, i2 - e), this.blockRemain = Math.max(0, r3 - e), this.ignore ? true : i2 >= e ? super.write(t2) : super.write(t2.subarray(0, i2));
  }
  #t(t2, e = false) {
    t2.path && (t2.path = f(t2.path)), t2.linkpath && (t2.linkpath = f(t2.linkpath)), Object.assign(this, Object.fromEntries(Object.entries(t2).filter(([i2, r3]) => !(r3 == null || i2 === "path" && e))));
  }
};
var Dt = (s2, t2, e, i2 = {}) => {
  s2.file && (i2.file = s2.file), s2.cwd && (i2.cwd = s2.cwd), i2.code = e instanceof Error && e.code || t2, i2.tarCode = t2, !s2.strict && i2.recoverable !== false ? (e instanceof Error && (i2 = Object.assign(e, i2), e = e.message), s2.emit("warn", t2, e, i2)) : e instanceof Error ? s2.emit("error", Object.assign(e, i2)) : s2.emit("error", Object.assign(new Error(`${t2}: ${e}`), i2));
};
var Nn = 1024 * 1024;
var Xi = Buffer.from([31, 139]);
var qi = Buffer.from([40, 181, 47, 253]);
var An = Math.max(Xi.length, qi.length);
var B2 = Symbol("state");
var Nt = Symbol("writeEntry");
var it = Symbol("readEntry");
var Zi = Symbol("nextEntry");
var Zs = Symbol("processEntry");
var V3 = Symbol("extendedHeader");
var he = Symbol("globalExtendedHeader");
var dt = Symbol("meta");
var Ys = Symbol("emitMeta");
var p2 = Symbol("buffer");
var st = Symbol("queue");
var ut = Symbol("ended");
var Yi = Symbol("emittedEnd");
var At = Symbol("emit");
var w = Symbol("unzip");
var Xe = Symbol("consumeChunk");
var qe = Symbol("consumeChunkSub");
var Ki = Symbol("consumeBody");
var Ks = Symbol("consumeMeta");
var Vs = Symbol("consumeHeader");
var ae = Symbol("consuming");
var Vi = Symbol("bufferConcat");
var Qe = Symbol("maybeEnd");
var Yt = Symbol("writing");
var $2 = Symbol("aborted");
var Je = Symbol("onDone");
var It = Symbol("sawValidEntry");
var je = Symbol("sawNullBlock");
var ti = Symbol("sawEOF");
var $s = Symbol("closeStream");
var In = 1000;
var le = Symbol("compressedBytesRead");
var $i = Symbol("decompressedBytesRead");
var Xs = Symbol("checkDecompressionRatio");
var Cn = () => true;
var rt = class extends Dn {
  file;
  strict;
  maxMetaEntrySize;
  filter;
  brotli;
  zstd;
  maxDecompressionRatio;
  writable = true;
  readable = false;
  [st] = [];
  [p2];
  [it];
  [Nt];
  [B2] = "begin";
  [dt] = "";
  [V3];
  [he];
  [ut] = false;
  [w];
  [$2] = false;
  [It];
  [je] = false;
  [ti] = false;
  [Yt] = false;
  [ae] = false;
  [Yi] = false;
  [le] = 0;
  [$i] = 0;
  constructor(t2 = {}) {
    super(), this.file = t2.file || "", this.on(Je, () => {
      (this[B2] === "begin" || this[It] === false) && this.warn("TAR_BAD_ARCHIVE", "Unrecognized archive format");
    }), t2.ondone ? this.on(Je, t2.ondone) : this.on(Je, () => {
      this.emit("prefinish"), this.emit("finish"), this.emit("end");
    }), this.strict = !!t2.strict, this.maxDecompressionRatio = typeof t2.maxDecompressionRatio == "number" ? t2.maxDecompressionRatio : In, this.maxMetaEntrySize = t2.maxMetaEntrySize || Nn, this.filter = typeof t2.filter == "function" ? t2.filter : Cn;
    let e = t2.file && (t2.file.endsWith(".tar.br") || t2.file.endsWith(".tbr"));
    this.brotli = !(t2.gzip || t2.zstd) && t2.brotli !== undefined ? t2.brotli : e ? undefined : false;
    let i2 = t2.file && (t2.file.endsWith(".tar.zst") || t2.file.endsWith(".tzst"));
    this.zstd = !(t2.gzip || t2.brotli) && t2.zstd !== undefined ? t2.zstd : i2 ? true : undefined, this.on("end", () => this[$s]()), typeof t2.onwarn == "function" && this.on("warn", t2.onwarn), typeof t2.onReadEntry == "function" && this.on("entry", t2.onReadEntry);
  }
  warn(t2, e, i2 = {}) {
    Dt(this, t2, e, i2);
  }
  [Vs](t2, e) {
    this[It] === undefined && (this[It] = false);
    let i2;
    try {
      i2 = new F2(t2, e, this[V3], this[he]);
    } catch (r3) {
      return this.warn("TAR_ENTRY_INVALID", r3);
    }
    if (i2.nullBlock)
      this[je] ? (this[ti] = true, this[B2] === "begin" && (this[B2] = "header"), this[At]("eof")) : (this[je] = true, this[At]("nullBlock"));
    else if (this[je] = false, !i2.cksumValid)
      this.warn("TAR_ENTRY_INVALID", "checksum failure", { header: i2 });
    else if (!i2.path)
      this.warn("TAR_ENTRY_INVALID", "path is required", { header: i2 });
    else {
      let r3 = i2.type;
      if (/^(Symbolic)?Link$/.test(r3) && !i2.linkpath)
        this.warn("TAR_ENTRY_INVALID", "linkpath required", { header: i2 });
      else if (!/^(Symbolic)?Link$/.test(r3) && !/^(Global)?ExtendedHeader$/.test(r3) && i2.linkpath)
        this.warn("TAR_ENTRY_INVALID", "linkpath forbidden", { header: i2 });
      else {
        let n2 = this[Nt] = new $e(i2, this[V3], this[he]);
        if (!this[It])
          if (n2.remain) {
            let o2 = () => {
              n2.invalid || (this[It] = true);
            };
            n2.on("end", o2);
          } else
            this[It] = true;
        n2.meta ? n2.size > this.maxMetaEntrySize ? (n2.ignore = true, this[At]("ignoredEntry", n2), this[B2] = "ignore", n2.resume()) : n2.size > 0 && (this[dt] = "", n2.on("data", (o2) => this[dt] += o2), this[B2] = "meta") : (this[V3] = undefined, n2.ignore = n2.ignore || !this.filter(n2.path, n2), n2.ignore ? (this[At]("ignoredEntry", n2), this[B2] = n2.remain ? "ignore" : "header", n2.resume()) : (n2.remain ? this[B2] = "body" : (this[B2] = "header", n2.end()), this[it] ? this[st].push(n2) : (this[st].push(n2), this[Zi]())));
      }
    }
  }
  [$s]() {
    queueMicrotask(() => this.emit("close"));
  }
  [Zs](t2) {
    let e = true;
    if (!t2)
      this[it] = undefined, e = false;
    else if (Array.isArray(t2)) {
      let [i2, ...r3] = t2;
      this.emit(i2, ...r3);
    } else
      this[it] = t2, this.emit("entry", t2), t2.emittedEnd || (t2.on("end", () => this[Zi]()), e = false);
    return e;
  }
  [Zi]() {
    do
      ;
    while (this[Zs](this[st].shift()));
    if (this[st].length === 0) {
      let t2 = this[it];
      !t2 || t2.flowing || t2.size === t2.remain ? this[Yt] || this.emit("drain") : t2.once("drain", () => this.emit("drain"));
    }
  }
  [Ki](t2, e) {
    let i2 = this[Nt];
    if (!i2)
      throw new Error("attempt to consume body without entry??");
    let r3 = i2.blockRemain ?? 0, n2 = r3 >= t2.length && e === 0 ? t2 : t2.subarray(e, e + r3);
    return i2.write(n2), i2.blockRemain || (this[B2] = "header", this[Nt] = undefined, i2.end()), n2.length;
  }
  [Ks](t2, e) {
    let i2 = this[Nt], r3 = this[Ki](t2, e);
    return !this[Nt] && i2 && this[Ys](i2), r3;
  }
  [At](t2, e, i2) {
    this[st].length === 0 && !this[it] ? this.emit(t2, e, i2) : this[st].push([t2, e, i2]);
  }
  [Ys](t2) {
    switch (this[At]("meta", this[dt]), t2.type) {
      case "ExtendedHeader":
      case "OldExtendedHeader":
        this[V3] = ft.parse(this[dt], this[V3], false);
        break;
      case "GlobalExtendedHeader":
        this[he] = ft.parse(this[dt], this[he], true);
        break;
      case "NextFileHasLongPath":
      case "OldGnuLongPath": {
        let e = this[V3] ?? Object.create(null);
        this[V3] = e, e.path = this[dt].replace(/\0.*/, "");
        break;
      }
      case "NextFileHasLongLinkpath": {
        let e = this[V3] || Object.create(null);
        this[V3] = e, e.linkpath = this[dt].replace(/\0.*/, "");
        break;
      }
      default:
        throw new Error("unknown meta: " + t2.type);
    }
  }
  abort(t2) {
    if (!this[$2]) {
      if (this[w]) {
        let e = this[w];
        e.write = () => true, e.end = () => e, e.emit = () => false, e.destroy?.();
      }
      this[$2] = true, this.emit("abort", t2), this.warn("TAR_ABORT", t2, { recoverable: false });
    }
  }
  [Xs](t2) {
    this[$i] += t2.length;
    let e = this[$i] / this[le];
    return e > this.maxDecompressionRatio ? (this.abort(new Error(`max decompression ratio exceeded: ${e.toFixed(2)} > ${this.maxDecompressionRatio}`)), false) : true;
  }
  write(t2, e, i2) {
    if (typeof e == "function" && (i2 = e, e = undefined), typeof t2 == "string" && (t2 = Buffer.from(t2, typeof e == "string" ? e : "utf8")), this[$2])
      return i2?.(), false;
    if ((this[w] === undefined || this.brotli === undefined && this[w] === false) && t2) {
      if (this[p2] && (t2 = Buffer.concat([this[p2], t2]), this[p2] = undefined), t2.length < An)
        return this[p2] = t2, i2?.(), true;
      for (let a2 = 0;this[w] === undefined && a2 < Xi.length; a2++)
        t2[a2] !== Xi[a2] && (this[w] = false);
      let o2 = false;
      if (this[w] === false && this.zstd !== false) {
        o2 = true;
        for (let a2 = 0;a2 < qi.length; a2++)
          if (t2[a2] !== qi[a2]) {
            o2 = false;
            break;
          }
      }
      let h2 = this.brotli === undefined && !o2;
      if (this[w] === false && h2)
        if (t2.length < 512)
          if (this[ut])
            this.brotli = true;
          else
            return this[p2] = t2, i2?.(), true;
        else
          try {
            new F2(t2.subarray(0, 512)), this.brotli = false;
          } catch {
            this.brotli = true;
          }
      if (this[w] === undefined || this[w] === false && (this.brotli || o2)) {
        let a2 = this[ut];
        this[ut] = false, this[w] = this[w] === undefined ? new Ue({}) : o2 ? new Ke({}) : new Ge({}), this[w].on("data", (c4) => {
          this[Xs](c4) && this[Xe](c4);
        }), this[w].on("error", (c4) => {
          this[$2] || this.abort(c4);
        }), this[w].on("end", () => {
          this[ut] = true, this[Xe]();
        }), this[Yt] = true, this[le] += t2.length;
        let l2 = !!this[w][a2 ? "end" : "write"](t2);
        return this[Yt] = false, i2?.(), l2;
      }
    }
    this[Yt] = true, this[w] ? (this[le] += t2.length, this[w].write(t2)) : this[Xe](t2), this[Yt] = false;
    let n2 = this[st].length > 0 ? false : this[it] ? this[it].flowing : true;
    return !n2 && this[st].length === 0 && this[it]?.once("drain", () => this.emit("drain")), i2?.(), n2;
  }
  [Vi](t2) {
    t2 && !this[$2] && (this[p2] = this[p2] ? Buffer.concat([this[p2], t2]) : t2);
  }
  [Qe]() {
    if (this[ut] && !this[Yi] && !this[$2] && !this[ae]) {
      this[Yi] = true;
      let t2 = this[Nt];
      if (t2?.blockRemain) {
        let e = this[p2] ? this[p2].length : 0;
        this.warn("TAR_BAD_ARCHIVE", `Truncated input (needed ${t2.blockRemain} more bytes, only ${e} available)`, { entry: t2 }), this[p2] && t2.write(this[p2]), t2.end();
      }
      this[At](Je);
    }
  }
  [Xe](t2) {
    if (this[ae] && t2)
      this[Vi](t2);
    else if (!t2 && !this[p2])
      this[Qe]();
    else if (t2) {
      if (this[ae] = true, this[p2]) {
        this[Vi](t2);
        let e = this[p2];
        this[p2] = undefined, this[qe](e);
      } else
        this[qe](t2);
      for (;this[p2] && this[p2]?.length >= 512 && !this[$2] && !this[ti]; ) {
        let e = this[p2];
        this[p2] = undefined, this[qe](e);
      }
      this[ae] = false;
    }
    (!this[p2] || this[ut]) && this[Qe]();
  }
  [qe](t2) {
    let e = 0, i2 = t2.length;
    for (;e + 512 <= i2 && !this[$2] && !this[ti]; )
      switch (this[B2]) {
        case "begin":
        case "header":
          this[Vs](t2, e), e += 512;
          break;
        case "ignore":
        case "body":
          e += this[Ki](t2, e);
          break;
        case "meta":
          e += this[Ks](t2, e);
          break;
        default:
          throw new Error("invalid state: " + this[B2]);
      }
    e < i2 && (this[p2] = this[p2] ? Buffer.concat([t2.subarray(e), this[p2]]) : t2.subarray(e));
  }
  end(t2, e, i2) {
    return typeof t2 == "function" && (i2 = t2, e = undefined, t2 = undefined), typeof e == "function" && (i2 = e, e = undefined), typeof t2 == "string" && (t2 = Buffer.from(t2, e)), i2 && this.once("finish", i2), this[$2] || (this[w] ? (t2 && (this[le] += t2.length, this[w].write(t2)), this[w].end()) : (this[ut] = true, (this.brotli === undefined || this.zstd === undefined) && (t2 = t2 || Buffer.alloc(0)), t2 && this.write(t2), this[Qe]())), this;
  }
};
var mt = (s2) => {
  let t2 = s2.length - 1, e = -1;
  for (;t2 > -1 && s2.charAt(t2) === "/"; )
    e = t2, t2--;
  return e === -1 ? s2 : s2.slice(0, e);
};
var vn = (s2) => {
  let t2 = s2.onReadEntry;
  s2.onReadEntry = t2 ? (e) => {
    t2(e), e.resume();
  } : (e) => e.resume();
};
var Qi = (s2, t2) => {
  let e = new Map(t2.map((o2) => [mt(o2), true])), i2 = s2.filter, r3 = 100, n2 = (o2, h2 = "", a2 = 0) => {
    if (a2 >= r3)
      return e.set(o2, false), false;
    let l2 = h2 || kn(o2).root || ".", c4;
    if (o2 === l2)
      c4 = false;
    else {
      let d = e.get(o2);
      c4 = d !== undefined ? d : n2(Fn(o2), l2, a2 + 1);
    }
    return e.set(o2, c4), c4;
  };
  s2.filter = i2 ? (o2, h2) => i2(o2, h2) && n2(mt(o2)) : (o2) => n2(mt(o2));
};
var Mn = (s2) => {
  let t2 = new rt(s2), e = s2.file, i2;
  try {
    i2 = Kt.openSync(e, "r");
    let r3 = Kt.fstatSync(i2), n2 = s2.maxReadSize || 16 * 1024 * 1024;
    if (r3.size < n2) {
      let o2 = Buffer.allocUnsafe(r3.size), h2 = Kt.readSync(i2, o2, 0, r3.size, 0);
      t2.end(h2 === o2.byteLength ? o2 : o2.subarray(0, h2));
    } else {
      let o2 = 0, h2 = Buffer.allocUnsafe(n2);
      for (;o2 < r3.size; ) {
        let a2 = Kt.readSync(i2, h2, 0, n2, o2);
        if (a2 === 0)
          break;
        o2 += a2, t2.write(h2.subarray(0, a2));
      }
      t2.end();
    }
  } finally {
    if (typeof i2 == "number")
      try {
        Kt.closeSync(i2);
      } catch {}
  }
};
var Bn = (s2, t2) => {
  let e = new rt(s2), i2 = s2.maxReadSize || 16 * 1024 * 1024, r3 = s2.file;
  return new Promise((o2, h2) => {
    e.on("error", h2), e.on("end", o2), Kt.stat(r3, (a2, l2) => {
      if (a2)
        h2(a2);
      else {
        let c4 = new _t(r3, { readSize: i2, size: l2.size });
        c4.on("error", h2), c4.pipe(e);
      }
    });
  });
};
var Ct = K2(Mn, Bn, (s2) => new rt(s2), (s2) => new rt(s2), (s2, t2) => {
  t2?.length && Qi(s2, t2), s2.noResume || vn(s2);
});
var Ji = (s2, t2, e) => (s2 &= 4095, e && (s2 = (s2 | 384) & -19), t2 && (s2 & 256 && (s2 |= 64), s2 & 32 && (s2 |= 8), s2 & 4 && (s2 |= 1)), s2);
var { isAbsolute: zn, parse: qs } = Pn;
var ce = (s2) => {
  let t2 = "", e = qs(s2);
  for (;zn(s2) || e.root; ) {
    let i2 = s2.charAt(0) === "/" && s2.slice(0, 4) !== "//?/" ? "/" : e.root;
    s2 = s2.slice(i2.length), t2 += i2, e = qs(s2);
  }
  return [t2, s2];
};
var ei = ["|", "<", ">", "?", ":"];
var ji = ei.map((s2) => String.fromCodePoint(61440 + Number(s2.codePointAt(0))));
var Un = new Map(ei.map((s2, t2) => [s2, ji[t2]]));
var Hn = new Map(ji.map((s2, t2) => [s2, ei[t2]]));
var ts = (s2) => ei.reduce((t2, e) => t2.split(e).join(Un.get(e)), s2);
var Qs = (s2) => ji.reduce((t2, e) => t2.split(e).join(Hn.get(e)), s2);
var rr = (s2, t2) => t2 ? (s2 = f(s2).replace(/^\.(\/|$)/, ""), mt(t2) + "/" + s2) : f(s2);
var Wn = 16 * 1024 * 1024;
var tr = Symbol("process");
var er = Symbol("file");
var ir = Symbol("directory");
var is = Symbol("symlink");
var sr = Symbol("hardlink");
var fe = Symbol("header");
var ii = Symbol("read");
var ss = Symbol("lstat");
var si = Symbol("onlstat");
var rs = Symbol("onread");
var ns = Symbol("onreadlink");
var os2 = Symbol("openfile");
var hs = Symbol("onopenfile");
var pt = Symbol("close");
var ri = Symbol("mode");
var as = Symbol("awaitDrain");
var es = Symbol("ondrain");
var q2 = Symbol("prefix");
var de = class extends A2 {
  path;
  portable;
  myuid = process.getuid && process.getuid() || 0;
  myuser = process.env.USER || "";
  maxReadSize;
  linkCache;
  statCache;
  preservePaths;
  cwd;
  strict;
  mtime;
  noPax;
  noMtime;
  prefix;
  fd;
  blockLen = 0;
  blockRemain = 0;
  buf;
  pos = 0;
  remain = 0;
  length = 0;
  offset = 0;
  win32;
  absolute;
  header;
  type;
  linkpath;
  stat;
  onWriteEntry;
  #t = false;
  constructor(t2, e = {}) {
    let i2 = se(e);
    super(), this.path = f(t2), this.portable = !!i2.portable, this.maxReadSize = i2.maxReadSize || Wn, this.linkCache = i2.linkCache || new Map, this.statCache = i2.statCache || new Map, this.preservePaths = !!i2.preservePaths, this.cwd = f(i2.cwd || process.cwd()), this.strict = !!i2.strict, this.noPax = !!i2.noPax, this.noMtime = !!i2.noMtime, this.mtime = i2.mtime, this.prefix = i2.prefix ? f(i2.prefix) : undefined, this.onWriteEntry = i2.onWriteEntry, typeof i2.onwarn == "function" && this.on("warn", i2.onwarn);
    let r3 = false;
    if (!this.preservePaths) {
      let [o2, h2] = ce(this.path);
      o2 && typeof h2 == "string" && (this.path = h2, r3 = o2);
    }
    this.win32 = !!i2.win32 || process.platform === "win32", this.win32 && (this.path = Qs(this.path.replaceAll(/\\/g, "/")), t2 = t2.replaceAll(/\\/g, "/")), this.absolute = f(i2.absolute || js.resolve(this.cwd, t2)), this.path === "" && (this.path = "./"), r3 && this.warn("TAR_ENTRY_INFO", `stripping ${r3} from absolute path`, { entry: this, path: r3 + this.path });
    let n2 = this.statCache.get(this.absolute);
    n2 ? this[si](n2) : this[ss]();
  }
  warn(t2, e, i2 = {}) {
    return Dt(this, t2, e, i2);
  }
  emit(t2, ...e) {
    return t2 === "error" && (this.#t = true), super.emit(t2, ...e);
  }
  [ss]() {
    X2.lstat(this.absolute, (t2, e) => {
      if (t2)
        return this.emit("error", t2);
      this[si](e);
    });
  }
  [si](t2) {
    this.statCache.set(this.absolute, t2), this.stat = t2, t2.isFile() || (t2.size = 0), this.type = Gn(t2), this.emit("stat", t2), this[tr]();
  }
  [tr]() {
    switch (this.type) {
      case "File":
        return this[er]();
      case "Directory":
        return this[ir]();
      case "SymbolicLink":
        return this[is]();
      default:
        return this.end();
    }
  }
  [ri](t2) {
    return Ji(t2, this.type === "Directory", this.portable);
  }
  [q2](t2) {
    return rr(t2, this.prefix);
  }
  [fe]() {
    if (!this.stat)
      throw new Error("cannot write header before stat");
    this.type === "Directory" && this.portable && (this.noMtime = true), this.onWriteEntry?.(this), this.header = new F2({ path: this[q2](this.path), linkpath: this.type === "Link" && this.linkpath !== undefined ? this[q2](this.linkpath) : this.linkpath, mode: this[ri](this.stat.mode), uid: this.portable ? undefined : this.stat.uid, gid: this.portable ? undefined : this.stat.gid, size: this.stat.size, mtime: this.noMtime ? undefined : this.mtime || this.stat.mtime, type: this.type === "Unsupported" ? undefined : this.type, uname: this.portable ? undefined : this.stat.uid === this.myuid ? this.myuser : "", atime: this.portable ? undefined : this.stat.atime, ctime: this.portable ? undefined : this.stat.ctime }), this.header.encode() && !this.noPax && super.write(new ft({ atime: this.portable ? undefined : this.header.atime, ctime: this.portable ? undefined : this.header.ctime, gid: this.portable ? undefined : this.header.gid, mtime: this.noMtime ? undefined : this.mtime || this.header.mtime, path: this[q2](this.path), linkpath: this.type === "Link" && this.linkpath !== undefined ? this[q2](this.linkpath) : this.linkpath, size: this.header.size, uid: this.portable ? undefined : this.header.uid, uname: this.portable ? undefined : this.header.uname, dev: this.portable ? undefined : this.stat.dev, ino: this.portable ? undefined : this.stat.ino, nlink: this.portable ? undefined : this.stat.nlink }).encode());
    let t2 = this.header?.block;
    if (!t2)
      throw new Error("failed to encode header");
    super.write(t2);
  }
  [ir]() {
    if (!this.stat)
      throw new Error("cannot create directory entry without stat");
    this.path.slice(-1) !== "/" && (this.path += "/"), this.stat.size = 0, this[fe](), this.end();
  }
  [is]() {
    X2.readlink(this.absolute, (t2, e) => {
      if (t2)
        return this.emit("error", t2);
      this[ns](e);
    });
  }
  [ns](t2) {
    this.linkpath = f(t2), this[fe](), this.end();
  }
  [sr](t2) {
    if (!this.stat)
      throw new Error("cannot create link entry without stat");
    this.type = "Link", this.linkpath = f(js.relative(this.cwd, t2)), this.stat.size = 0, this[fe](), this.end();
  }
  [er]() {
    if (!this.stat)
      throw new Error("cannot create file entry without stat");
    if (this.stat.nlink > 1) {
      let t2 = `${this.stat.dev}:${this.stat.ino}`, e = this.linkCache.get(t2);
      if (e?.indexOf(this.cwd) === 0)
        return this[sr](e);
      this.linkCache.set(t2, this.absolute);
    }
    if (this[fe](), this.stat.size === 0)
      return this.end();
    this[os2]();
  }
  [os2]() {
    X2.open(this.absolute, "r", (t2, e) => {
      if (t2)
        return this.emit("error", t2);
      this[hs](e);
    });
  }
  [hs](t2) {
    if (this.fd = t2, this.#t)
      return this[pt]();
    if (!this.stat)
      throw new Error("should stat before calling onopenfile");
    this.blockLen = 512 * Math.ceil(this.stat.size / 512), this.blockRemain = this.blockLen;
    let e = Math.min(this.blockLen, this.maxReadSize);
    this.buf = Buffer.allocUnsafe(e), this.offset = 0, this.pos = 0, this.remain = this.stat.size, this.length = this.buf.length, this[ii]();
  }
  [ii]() {
    let { fd: t2, buf: e, offset: i2, length: r3, pos: n2 } = this;
    if (t2 === undefined || e === undefined)
      throw new Error("cannot read file without first opening");
    X2.read(t2, e, i2, r3, n2, (o2, h2) => {
      if (o2)
        return this[pt](() => this.emit("error", o2));
      this[rs](h2);
    });
  }
  [pt](t2 = () => {}) {
    this.fd !== undefined && X2.close(this.fd, t2);
  }
  [rs](t2) {
    if (t2 <= 0 && this.remain > 0) {
      let r3 = Object.assign(new Error("encountered unexpected EOF"), { path: this.absolute, syscall: "read", code: "EOF" });
      return this[pt](() => this.emit("error", r3));
    }
    if (t2 > this.remain) {
      let r3 = Object.assign(new Error("did not encounter expected EOF"), { path: this.absolute, syscall: "read", code: "EOF" });
      return this[pt](() => this.emit("error", r3));
    }
    if (!this.buf)
      throw new Error("should have created buffer prior to reading");
    if (t2 === this.remain)
      for (let r3 = t2;r3 < this.length && t2 < this.blockRemain; r3++)
        this.buf[r3 + this.offset] = 0, t2++, this.remain++;
    let e = this.offset === 0 && t2 === this.buf.length ? this.buf : this.buf.subarray(this.offset, this.offset + t2);
    this.write(e) ? this[es]() : this[as](() => this[es]());
  }
  [as](t2) {
    this.once("drain", t2);
  }
  write(t2, e, i2) {
    if (typeof e == "function" && (i2 = e, e = undefined), typeof t2 == "string" && (t2 = Buffer.from(t2, typeof e == "string" ? e : "utf8")), this.blockRemain < t2.length) {
      let r3 = Object.assign(new Error("writing more data than expected"), { path: this.absolute });
      return this.emit("error", r3);
    }
    return this.remain -= t2.length, this.blockRemain -= t2.length, this.pos += t2.length, this.offset += t2.length, super.write(t2, null, i2);
  }
  [es]() {
    if (!this.remain)
      return this.blockRemain && super.write(Buffer.alloc(this.blockRemain)), this[pt]((t2) => t2 ? this.emit("error", t2) : this.end());
    if (!this.buf)
      throw new Error("buffer lost somehow in ONDRAIN");
    this.offset >= this.length && (this.buf = Buffer.allocUnsafe(Math.min(this.blockRemain, this.buf.length)), this.offset = 0), this.length = this.buf.length - this.offset, this[ii]();
  }
};
var ni = class extends de {
  sync = true;
  [ss]() {
    this[si](X2.lstatSync(this.absolute));
  }
  [is]() {
    this[ns](X2.readlinkSync(this.absolute));
  }
  [os2]() {
    this[hs](X2.openSync(this.absolute, "r"));
  }
  [ii]() {
    let t2 = true;
    try {
      let { fd: e, buf: i2, offset: r3, length: n2, pos: o2 } = this;
      if (e === undefined || i2 === undefined)
        throw new Error("fd and buf must be set in READ method");
      let h2 = X2.readSync(e, i2, r3, n2, o2);
      this[rs](h2), t2 = false;
    } finally {
      if (t2)
        try {
          this[pt](() => {});
        } catch {}
    }
  }
  [as](t2) {
    t2();
  }
  [pt](t2 = () => {}) {
    this.fd !== undefined && X2.closeSync(this.fd), t2();
  }
};
var oi = class extends A2 {
  blockLen = 0;
  blockRemain = 0;
  buf = 0;
  pos = 0;
  remain = 0;
  length = 0;
  preservePaths;
  portable;
  strict;
  noPax;
  noMtime;
  readEntry;
  type;
  prefix;
  path;
  mode;
  uid;
  gid;
  uname;
  gname;
  header;
  mtime;
  atime;
  ctime;
  linkpath;
  size;
  onWriteEntry;
  warn(t2, e, i2 = {}) {
    return Dt(this, t2, e, i2);
  }
  constructor(t2, e = {}) {
    let i2 = se(e);
    super(), this.preservePaths = !!i2.preservePaths, this.portable = !!i2.portable, this.strict = !!i2.strict, this.noPax = !!i2.noPax, this.noMtime = !!i2.noMtime, this.onWriteEntry = i2.onWriteEntry, this.readEntry = t2;
    let { type: r3 } = t2;
    if (r3 === "Unsupported")
      throw new Error("writing entry that should be ignored");
    this.type = r3, this.type === "Directory" && this.portable && (this.noMtime = true), this.prefix = i2.prefix, this.path = f(t2.path), this.mode = t2.mode !== undefined ? this[ri](t2.mode) : undefined, this.uid = this.portable ? undefined : t2.uid, this.gid = this.portable ? undefined : t2.gid, this.uname = this.portable ? undefined : t2.uname, this.gname = this.portable ? undefined : t2.gname, this.size = t2.size, this.mtime = this.noMtime ? undefined : i2.mtime || t2.mtime, this.atime = this.portable ? undefined : t2.atime, this.ctime = this.portable ? undefined : t2.ctime, this.linkpath = t2.linkpath !== undefined ? f(t2.linkpath) : undefined, typeof i2.onwarn == "function" && this.on("warn", i2.onwarn);
    let n2 = false;
    if (!this.preservePaths) {
      let [h2, a2] = ce(this.path);
      h2 && typeof a2 == "string" && (this.path = a2, n2 = h2);
    }
    this.remain = t2.size, this.blockRemain = t2.startBlockSize, this.onWriteEntry?.(this), this.header = new F2({ path: this[q2](this.path), linkpath: this.type === "Link" && this.linkpath !== undefined ? this[q2](this.linkpath) : this.linkpath, mode: this.mode, uid: this.portable ? undefined : this.uid, gid: this.portable ? undefined : this.gid, size: this.size, mtime: this.noMtime ? undefined : this.mtime, type: this.type, uname: this.portable ? undefined : this.uname, atime: this.portable ? undefined : this.atime, ctime: this.portable ? undefined : this.ctime }), n2 && this.warn("TAR_ENTRY_INFO", `stripping ${n2} from absolute path`, { entry: this, path: n2 + this.path }), this.header.encode() && !this.noPax && super.write(new ft({ atime: this.portable ? undefined : this.atime, ctime: this.portable ? undefined : this.ctime, gid: this.portable ? undefined : this.gid, mtime: this.noMtime ? undefined : this.mtime, path: this[q2](this.path), linkpath: this.type === "Link" && this.linkpath !== undefined ? this[q2](this.linkpath) : this.linkpath, size: this.size, uid: this.portable ? undefined : this.uid, uname: this.portable ? undefined : this.uname, dev: this.portable ? undefined : this.readEntry.dev, ino: this.portable ? undefined : this.readEntry.ino, nlink: this.portable ? undefined : this.readEntry.nlink }).encode());
    let o2 = this.header?.block;
    if (!o2)
      throw new Error("failed to encode header");
    super.write(o2), t2.pipe(this);
  }
  [q2](t2) {
    return rr(t2, this.prefix);
  }
  [ri](t2) {
    return Ji(t2, this.type === "Directory", this.portable);
  }
  write(t2, e, i2) {
    typeof e == "function" && (i2 = e, e = undefined), typeof t2 == "string" && (t2 = Buffer.from(t2, typeof e == "string" ? e : "utf8"));
    let r3 = t2.length;
    if (r3 > this.blockRemain)
      throw new Error("writing more to entry than is appropriate");
    return this.blockRemain -= r3, super.write(t2, i2);
  }
  end(t2, e, i2) {
    return this.blockRemain && super.write(Buffer.alloc(this.blockRemain)), typeof t2 == "function" && (i2 = t2, e = undefined, t2 = undefined), typeof e == "function" && (i2 = e, e = undefined), typeof t2 == "string" && (t2 = Buffer.from(t2, e ?? "utf8")), i2 && this.once("finish", i2), t2 ? super.end(t2, i2) : super.end(i2), this;
  }
};
var Gn = (s2) => s2.isFile() ? "File" : s2.isDirectory() ? "Directory" : s2.isSymbolicLink() ? "SymbolicLink" : "Unsupported";
var hi = class s2 {
  tail;
  head;
  length = 0;
  static create(t2 = []) {
    return new s2(t2);
  }
  constructor(t2 = []) {
    for (let e of t2)
      this.push(e);
  }
  *[Symbol.iterator]() {
    for (let t2 = this.head;t2; t2 = t2.next)
      yield t2.value;
  }
  removeNode(t2) {
    if (t2.list !== this)
      throw new Error("removing node which does not belong to this list");
    let { next: e, prev: i2 } = t2;
    return e && (e.prev = i2), i2 && (i2.next = e), t2 === this.head && (this.head = e), t2 === this.tail && (this.tail = i2), this.length--, t2.next = undefined, t2.prev = undefined, t2.list = undefined, e;
  }
  unshiftNode(t2) {
    if (t2 === this.head)
      return;
    t2.list && t2.list.removeNode(t2);
    let e = this.head;
    t2.list = this, t2.next = e, e && (e.prev = t2), this.head = t2, this.tail || (this.tail = t2), this.length++;
  }
  pushNode(t2) {
    if (t2 === this.tail)
      return;
    t2.list && t2.list.removeNode(t2);
    let e = this.tail;
    t2.list = this, t2.prev = e, e && (e.next = t2), this.tail = t2, this.head || (this.head = t2), this.length++;
  }
  push(...t2) {
    for (let e = 0, i2 = t2.length;e < i2; e++)
      Yn(this, t2[e]);
    return this.length;
  }
  unshift(...t2) {
    for (var e = 0, i2 = t2.length;e < i2; e++)
      Kn(this, t2[e]);
    return this.length;
  }
  pop() {
    if (!this.tail)
      return;
    let t2 = this.tail.value, e = this.tail;
    return this.tail = this.tail.prev, this.tail ? this.tail.next = undefined : this.head = undefined, e.list = undefined, this.length--, t2;
  }
  shift() {
    if (!this.head)
      return;
    let t2 = this.head.value, e = this.head;
    return this.head = this.head.next, this.head ? this.head.prev = undefined : this.tail = undefined, e.list = undefined, this.length--, t2;
  }
  forEach(t2, e) {
    e = e || this;
    for (let i2 = this.head, r3 = 0;i2; r3++)
      t2.call(e, i2.value, r3, this), i2 = i2.next;
  }
  forEachReverse(t2, e) {
    e = e || this;
    for (let i2 = this.tail, r3 = this.length - 1;i2; r3--)
      t2.call(e, i2.value, r3, this), i2 = i2.prev;
  }
  get(t2) {
    let e = 0, i2 = this.head;
    for (;i2 && e < t2; e++)
      i2 = i2.next;
    if (e === t2 && i2)
      return i2.value;
  }
  getReverse(t2) {
    let e = 0, i2 = this.tail;
    for (;i2 && e < t2; e++)
      i2 = i2.prev;
    if (e === t2 && i2)
      return i2.value;
  }
  map(t2, e) {
    e = e || this;
    let i2 = new s2;
    for (let r3 = this.head;r3; )
      i2.push(t2.call(e, r3.value, this)), r3 = r3.next;
    return i2;
  }
  mapReverse(t2, e) {
    e = e || this;
    var i2 = new s2;
    for (let r3 = this.tail;r3; )
      i2.push(t2.call(e, r3.value, this)), r3 = r3.prev;
    return i2;
  }
  reduce(t2, e) {
    let i2, r3 = this.head;
    if (arguments.length > 1)
      i2 = e;
    else if (this.head)
      r3 = this.head.next, i2 = this.head.value;
    else
      throw new TypeError("Reduce of empty list with no initial value");
    for (var n2 = 0;r3; n2++)
      i2 = t2(i2, r3.value, n2), r3 = r3.next;
    return i2;
  }
  reduceReverse(t2, e) {
    let i2, r3 = this.tail;
    if (arguments.length > 1)
      i2 = e;
    else if (this.tail)
      r3 = this.tail.prev, i2 = this.tail.value;
    else
      throw new TypeError("Reduce of empty list with no initial value");
    for (let n2 = this.length - 1;r3; n2--)
      i2 = t2(i2, r3.value, n2), r3 = r3.prev;
    return i2;
  }
  toArray() {
    let t2 = new Array(this.length);
    for (let e = 0, i2 = this.head;i2; e++)
      t2[e] = i2.value, i2 = i2.next;
    return t2;
  }
  toArrayReverse() {
    let t2 = new Array(this.length);
    for (let e = 0, i2 = this.tail;i2; e++)
      t2[e] = i2.value, i2 = i2.prev;
    return t2;
  }
  slice(t2 = 0, e = this.length) {
    e < 0 && (e += this.length), t2 < 0 && (t2 += this.length);
    let i2 = new s2;
    if (e < t2 || e < 0)
      return i2;
    t2 < 0 && (t2 = 0), e > this.length && (e = this.length);
    let r3 = this.head, n2 = 0;
    for (n2 = 0;r3 && n2 < t2; n2++)
      r3 = r3.next;
    for (;r3 && n2 < e; n2++, r3 = r3.next)
      i2.push(r3.value);
    return i2;
  }
  sliceReverse(t2 = 0, e = this.length) {
    e < 0 && (e += this.length), t2 < 0 && (t2 += this.length);
    let i2 = new s2;
    if (e < t2 || e < 0)
      return i2;
    t2 < 0 && (t2 = 0), e > this.length && (e = this.length);
    let r3 = this.length, n2 = this.tail;
    for (;n2 && r3 > e; r3--)
      n2 = n2.prev;
    for (;n2 && r3 > t2; r3--, n2 = n2.prev)
      i2.push(n2.value);
    return i2;
  }
  splice(t2, e = 0, ...i2) {
    t2 > this.length && (t2 = this.length - 1), t2 < 0 && (t2 = this.length + t2);
    let r3 = this.head;
    for (let o2 = 0;r3 && o2 < t2; o2++)
      r3 = r3.next;
    let n2 = [];
    for (let o2 = 0;r3 && o2 < e; o2++)
      n2.push(r3.value), r3 = this.removeNode(r3);
    r3 ? r3 !== this.tail && (r3 = r3.prev) : r3 = this.tail;
    for (let o2 of i2)
      r3 = Zn(this, r3, o2);
    return n2;
  }
  reverse() {
    let t2 = this.head, e = this.tail;
    for (let i2 = t2;i2; i2 = i2.prev) {
      let r3 = i2.prev;
      i2.prev = i2.next, i2.next = r3;
    }
    return this.head = e, this.tail = t2, this;
  }
};
function Zn(s3, t2, e) {
  let i2 = t2, r3 = t2 ? t2.next : s3.head, n2 = new ue(e, i2, r3, s3);
  return n2.next === undefined && (s3.tail = n2), n2.prev === undefined && (s3.head = n2), s3.length++, n2;
}
function Yn(s3, t2) {
  s3.tail = new ue(t2, s3.tail, undefined, s3), s3.head || (s3.head = s3.tail), s3.length++;
}
function Kn(s3, t2) {
  s3.head = new ue(t2, undefined, s3.head, s3), s3.tail || (s3.tail = s3.head), s3.length++;
}
var ue = class {
  list;
  next;
  prev;
  value;
  constructor(t2, e, i2, r3) {
    this.list = r3, this.value = t2, e ? (e.next = this, this.prev = e) : this.prev = undefined, i2 ? (i2.prev = this, this.next = i2) : this.next = undefined;
  }
};
var pi = class {
  path;
  absolute;
  entry;
  stat;
  readdir;
  pending = false;
  pendingLink = false;
  ignore = false;
  piped = false;
  constructor(t2, e) {
    this.path = t2 || "./", this.absolute = e;
  }
};
var nr = Buffer.alloc(1024);
var li = Symbol("onStat");
var me = Symbol("ended");
var W3 = Symbol("queue");
var pe = Symbol("pendingLinks");
var Et = Symbol("current");
var Ft = Symbol("process");
var Ee = Symbol("processing");
var ai = Symbol("processJob");
var G2 = Symbol("jobs");
var ls = Symbol("jobDone");
var ci = Symbol("addFSEntry");
var or = Symbol("addTarEntry");
var ds = Symbol("stat");
var us = Symbol("readdir");
var fi = Symbol("onreaddir");
var di = Symbol("pipe");
var hr = Symbol("entry");
var cs = Symbol("entryOpt");
var ui = Symbol("writeEntryClass");
var lr = Symbol("write");
var fs = Symbol("ondrain");
var wt = class extends A2 {
  sync = false;
  opt;
  cwd;
  maxReadSize;
  preservePaths;
  strict;
  noPax;
  prefix;
  linkCache;
  statCache;
  file;
  portable;
  zip;
  readdirCache;
  noDirRecurse;
  follow;
  noMtime;
  mtime;
  filter;
  jobs;
  [ui];
  onWriteEntry;
  [W3];
  [pe] = new Map;
  [G2] = 0;
  [Ee] = false;
  [me] = false;
  constructor(t2 = {}) {
    if (super(), this.opt = t2, this.file = t2.file || "", this.cwd = t2.cwd || process.cwd(), this.maxReadSize = t2.maxReadSize, this.preservePaths = !!t2.preservePaths, this.strict = !!t2.strict, this.noPax = !!t2.noPax, this.prefix = f(t2.prefix || ""), this.linkCache = t2.linkCache || new Map, this.statCache = t2.statCache || new Map, this.readdirCache = t2.readdirCache || new Map, this.onWriteEntry = t2.onWriteEntry, this[ui] = de, typeof t2.onwarn == "function" && this.on("warn", t2.onwarn), this.portable = !!t2.portable, t2.gzip || t2.brotli || t2.zstd) {
      if ((t2.gzip ? 1 : 0) + (t2.brotli ? 1 : 0) + (t2.zstd ? 1 : 0) > 1)
        throw new TypeError("gzip, brotli, zstd are mutually exclusive");
      if (t2.gzip && (typeof t2.gzip != "object" && (t2.gzip = {}), this.portable && (t2.gzip.portable = true), this.zip = new ze(t2.gzip)), t2.brotli && (typeof t2.brotli != "object" && (t2.brotli = {}), this.zip = new We(t2.brotli)), t2.zstd && (typeof t2.zstd != "object" && (t2.zstd = {}), this.zip = new Ye(t2.zstd)), !this.zip)
        throw new Error("impossible");
      let e = this.zip;
      e.on("data", (i2) => super.write(i2)), e.on("end", () => super.end()), e.on("drain", () => this[fs]()), this.on("resume", () => e.resume());
    } else
      this.on("drain", this[fs]);
    this.noDirRecurse = !!t2.noDirRecurse, this.follow = !!t2.follow, this.noMtime = !!t2.noMtime, t2.mtime && (this.mtime = t2.mtime), this.filter = typeof t2.filter == "function" ? t2.filter : () => true, this[W3] = new hi, this[G2] = 0, this.jobs = Number(t2.jobs) || 4, this[Ee] = false, this[me] = false;
  }
  [lr](t2) {
    return super.write(t2);
  }
  add(t2) {
    return this.write(t2), this;
  }
  end(t2, e, i2) {
    return typeof t2 == "function" && (i2 = t2, t2 = undefined), typeof e == "function" && (i2 = e, e = undefined), t2 && this.add(t2), this[me] = true, this[Ft](), i2 && i2(), this;
  }
  write(t2) {
    if (this[me])
      throw new Error("write after end");
    return typeof t2 == "string" ? this[ci](t2) : this[or](t2), this.flowing;
  }
  [or](t2) {
    let e = f(ar.resolve(this.cwd, t2.path));
    if (!this.filter(t2.path, t2))
      t2.resume();
    else {
      let i2 = new pi(t2.path, e);
      i2.entry = new oi(t2, this[cs](i2)), i2.entry.on("end", () => this[ls](i2)), this[G2] += 1, this[W3].push(i2);
    }
    this[Ft]();
  }
  [ci](t2) {
    let e = f(ar.resolve(this.cwd, t2));
    this[W3].push(new pi(t2, e)), this[Ft]();
  }
  [ds](t2) {
    t2.pending = true, this[G2] += 1;
    let e = this.follow ? "stat" : "lstat";
    mi[e](t2.absolute, (i2, r3) => {
      t2.pending = false, this[G2] -= 1, i2 ? this.emit("error", i2) : this[li](t2, r3);
    });
  }
  [li](t2, e) {
    if (this.statCache.set(t2.absolute, e), t2.stat = e, !this.filter(t2.path, e))
      t2.ignore = true;
    else if (e.isFile() && e.nlink > 1 && !this.linkCache.get(`${e.dev}:${e.ino}`) && !this.sync)
      if (t2 === this[Et])
        this[ai](t2);
      else {
        let i2 = `${e.dev}:${e.ino}`, r3 = this[pe].get(i2);
        r3 ? r3.push(t2) : this[pe].set(i2, [t2]), t2.pendingLink = true, t2.pending = true;
      }
    this[Ft]();
  }
  [us](t2) {
    t2.pending = true, this[G2] += 1, mi.readdir(t2.absolute, (e, i2) => {
      if (t2.pending = false, this[G2] -= 1, e)
        return this.emit("error", e);
      this[fi](t2, i2);
    });
  }
  [fi](t2, e) {
    this.readdirCache.set(t2.absolute, e), t2.readdir = e, this[Ft]();
  }
  [Ft]() {
    if (!this[Ee]) {
      this[Ee] = true;
      for (let t2 = this[W3].head;t2 && this[G2] < this.jobs; t2 = t2.next)
        if (this[ai](t2.value), t2.value.ignore) {
          let e = t2.next;
          this[W3].removeNode(t2), t2.next = e;
        }
      this[Ee] = false, this[me] && this[W3].length === 0 && this[G2] === 0 && (this.zip ? this.zip.end(nr) : (super.write(nr), super.end()));
    }
  }
  get [Et]() {
    return this[W3] && this[W3].head && this[W3].head.value;
  }
  [ls](t2) {
    this[W3].shift(), this[G2] -= 1;
    let { stat: e } = t2;
    if (e && e.isFile() && e.nlink > 1) {
      let i2 = `${e.dev}:${e.ino}`, r3 = this[pe].get(i2);
      if (r3) {
        this[pe].delete(i2);
        for (let n2 of r3)
          n2.pending = false, this[ai](n2);
      }
    }
    this[Ft]();
  }
  [ai](t2) {
    if (t2.pending && t2.pendingLink && t2 === this[Et] && (t2.pending = false, t2.pendingLink = false), !t2.pending) {
      if (t2.entry) {
        t2 === this[Et] && !t2.piped && this[di](t2);
        return;
      }
      if (!t2.stat) {
        let e = this.statCache.get(t2.absolute);
        e ? this[li](t2, e) : this[ds](t2);
      }
      if (t2.stat && !t2.ignore) {
        if (!this.noDirRecurse && t2.stat.isDirectory() && !t2.readdir) {
          let e = this.readdirCache.get(t2.absolute);
          if (e ? this[fi](t2, e) : this[us](t2), !t2.readdir)
            return;
        }
        if (t2.entry = this[hr](t2), !t2.entry) {
          t2.ignore = true;
          return;
        }
        t2 === this[Et] && !t2.piped && this[di](t2);
      }
    }
  }
  [cs](t2) {
    return { onwarn: (e, i2, r3) => this.warn(e, i2, r3), noPax: this.noPax, cwd: this.cwd, absolute: t2.absolute, preservePaths: this.preservePaths, maxReadSize: this.maxReadSize, strict: this.strict, portable: this.portable, linkCache: this.linkCache, statCache: this.statCache, noMtime: this.noMtime, mtime: this.mtime, prefix: this.prefix, onWriteEntry: this.onWriteEntry };
  }
  [hr](t2) {
    this[G2] += 1;
    try {
      return new this[ui](t2.path, this[cs](t2)).on("end", () => this[ls](t2)).on("error", (i2) => this.emit("error", i2));
    } catch (e) {
      this.emit("error", e);
    }
  }
  [fs]() {
    this[Et] && this[Et].entry && this[Et].entry.resume();
  }
  [di](t2) {
    t2.piped = true, t2.readdir && t2.readdir.forEach((r3) => {
      let n2 = t2.path, o2 = n2 === "./" ? "" : n2.replace(/\/*$/, "/");
      this[ci](o2 + r3);
    });
    let e = t2.entry, i2 = this.zip;
    if (!e)
      throw new Error("cannot pipe without source");
    i2 ? e.on("data", (r3) => {
      i2.write(r3) || e.pause();
    }) : e.on("data", (r3) => {
      super.write(r3) || e.pause();
    });
  }
  pause() {
    return this.zip && this.zip.pause(), super.pause();
  }
  warn(t2, e, i2 = {}) {
    Dt(this, t2, e, i2);
  }
};
var kt = class extends wt {
  sync = true;
  constructor(t2) {
    super(t2), this[ui] = ni;
  }
  pause() {}
  resume() {}
  [ds](t2) {
    let e = this.follow ? "statSync" : "lstatSync";
    this[li](t2, mi[e](t2.absolute));
  }
  [us](t2) {
    this[fi](t2, mi.readdirSync(t2.absolute));
  }
  [di](t2) {
    let e = t2.entry, i2 = this.zip;
    if (t2.readdir && t2.readdir.forEach((r3) => {
      let n2 = t2.path, o2 = n2 === "./" ? "" : n2.replace(/\/*$/, "/");
      this[ci](o2 + r3);
    }), !e)
      throw new Error("Cannot pipe without source");
    i2 ? e.on("data", (r3) => {
      i2.write(r3);
    }) : e.on("data", (r3) => {
      super[lr](r3);
    });
  }
};
var Vn = (s3, t2) => {
  let e = new kt(s3), i2 = new Wt(s3.file, { mode: s3.mode || 438 });
  e.pipe(i2), fr(e, t2);
};
var $n = (s3, t2) => {
  let e = new wt(s3), i2 = new et(s3.file, { mode: s3.mode || 438 });
  e.pipe(i2);
  let r3 = new Promise((n2, o2) => {
    i2.on("error", o2), i2.on("close", n2), e.on("error", o2);
  });
  return dr(e, t2).catch((n2) => e.emit("error", n2)), r3;
};
var fr = (s3, t2) => {
  t2.forEach((e) => {
    e.charAt(0) === "@" ? Ct({ file: cr.resolve(s3.cwd, e.slice(1)), sync: true, noResume: true, onReadEntry: (i2) => s3.add(i2) }) : s3.add(e);
  }), s3.end();
};
var dr = async (s3, t2) => {
  for (let e of t2)
    e.charAt(0) === "@" ? await Ct({ file: cr.resolve(String(s3.cwd), e.slice(1)), noResume: true, onReadEntry: (i2) => {
      s3.add(i2);
    } }) : s3.add(e);
  s3.end();
};
var Xn = (s3, t2) => {
  let e = new kt(s3);
  return fr(e, t2), e;
};
var qn = (s3, t2) => {
  let e = new wt(s3);
  return dr(e, t2).catch((i2) => e.emit("error", i2)), e;
};
var Qn = K2(Vn, $n, Xn, qn, (s3, t2) => {
  if (!t2?.length)
    throw new TypeError("no paths specified to add to archive");
});
var Jn = process.env.__FAKE_PLATFORM__ || process.platform;
var Er = Jn === "win32";
var { O_CREAT: wr, O_NOFOLLOW: ur, O_TRUNC: Sr, O_WRONLY: yr } = pr.constants;
var Rr = Number(process.env.__FAKE_FS_O_FILENAME__) || pr.constants.UV_FS_O_FILEMAP || 0;
var jn = Er && !!Rr;
var to = 512 * 1024;
var eo = Rr | Sr | wr | yr;
var mr = !Er && typeof ur == "number" ? ur | Sr | wr | yr : null;
var ms = mr !== null ? () => mr : jn ? (s3) => s3 < to ? eo : "w" : () => "w";
var ps = (s3, t2, e) => {
  try {
    return wi.lchownSync(s3, t2, e);
  } catch (i2) {
    if (i2?.code !== "ENOENT")
      throw i2;
  }
};
var Ei = (s3, t2, e, i2) => {
  wi.lchown(s3, t2, e, (r3) => {
    i2(r3 && r3?.code !== "ENOENT" ? r3 : null);
  });
};
var io = (s3, t2, e, i2, r3) => {
  if (t2.isDirectory())
    Es(we.resolve(s3, t2.name), e, i2, (n2) => {
      if (n2)
        return r3(n2);
      let o2 = we.resolve(s3, t2.name);
      Ei(o2, e, i2, r3);
    });
  else {
    let n2 = we.resolve(s3, t2.name);
    Ei(n2, e, i2, r3);
  }
};
var Es = (s3, t2, e, i2) => {
  wi.readdir(s3, { withFileTypes: true }, (r3, n2) => {
    if (r3) {
      if (r3.code === "ENOENT")
        return i2();
      if (r3.code !== "ENOTDIR" && r3.code !== "ENOTSUP")
        return i2(r3);
    }
    if (r3 || !n2.length)
      return Ei(s3, t2, e, i2);
    let o2 = n2.length, h2 = null, a2 = (l2) => {
      if (!h2) {
        if (l2)
          return i2(h2 = l2);
        if (--o2 === 0)
          return Ei(s3, t2, e, i2);
      }
    };
    for (let l2 of n2)
      io(s3, l2, t2, e, a2);
  });
};
var so = (s3, t2, e, i2) => {
  t2.isDirectory() && ws(we.resolve(s3, t2.name), e, i2), ps(we.resolve(s3, t2.name), e, i2);
};
var ws = (s3, t2, e) => {
  let i2;
  try {
    i2 = wi.readdirSync(s3, { withFileTypes: true });
  } catch (r3) {
    let n2 = r3;
    if (n2?.code === "ENOENT")
      return;
    if (n2?.code === "ENOTDIR" || n2?.code === "ENOTSUP")
      return ps(s3, t2, e);
    throw n2;
  }
  for (let r3 of i2)
    so(s3, r3, t2, e);
  return ps(s3, t2, e);
};
var Se = class extends Error {
  path;
  code;
  syscall = "chdir";
  constructor(t2, e) {
    super(`${e}: Cannot cd into '${t2}'`), this.path = t2, this.code = e;
  }
  get name() {
    return "CwdError";
  }
};
var St = class extends Error {
  path;
  symlink;
  syscall = "symlink";
  code = "TAR_SYMLINK_ERROR";
  constructor(t2, e) {
    super("TAR_SYMLINK_ERROR: Cannot extract through symbolic link"), this.symlink = t2, this.path = e;
  }
  get name() {
    return "SymlinkError";
  }
};
var no = (s3, t2) => {
  k2.stat(s3, (e, i2) => {
    (e || !i2.isDirectory()) && (e = new Se(s3, e?.code || "ENOTDIR")), t2(e);
  });
};
var gr = (s3, t2, e) => {
  s3 = f(s3);
  let i2 = t2.umask ?? 18, r3 = t2.mode | 448, n2 = (r3 & i2) !== 0, o2 = t2.uid, h2 = t2.gid, a2 = typeof o2 == "number" && typeof h2 == "number" && (o2 !== t2.processUid || h2 !== t2.processGid), l2 = t2.preserve, c4 = t2.unlink, d = f(t2.cwd), y2 = (E2, x2) => {
    E2 ? e(E2) : x2 && a2 ? Es(x2, o2, h2, (Le) => y2(Le)) : n2 ? k2.chmod(s3, r3, e) : e();
  };
  if (s3 === d)
    return no(s3, y2);
  if (l2)
    return ro.mkdir(s3, { mode: r3, recursive: true }).then((E2) => y2(null, E2 ?? undefined), y2);
  let D2 = f(Si.relative(d, s3)).split("/");
  Ss(d, D2, r3, c4, d, undefined, y2);
};
var Ss = (s3, t2, e, i2, r3, n2, o2) => {
  if (t2.length === 0)
    return o2(null, n2);
  let h2 = t2.shift(), a2 = f(Si.resolve(s3 + "/" + h2));
  k2.mkdir(a2, e, br(a2, t2, e, i2, r3, n2, o2));
};
var br = (s3, t2, e, i2, r3, n2, o2) => (h2) => {
  h2 ? k2.lstat(s3, (a2, l2) => {
    if (a2)
      a2.path = a2.path && f(a2.path), o2(a2);
    else if (l2.isDirectory())
      Ss(s3, t2, e, i2, r3, n2, o2);
    else if (i2)
      k2.unlink(s3, (c4) => {
        if (c4)
          return o2(c4);
        k2.mkdir(s3, e, br(s3, t2, e, i2, r3, n2, o2));
      });
    else {
      if (l2.isSymbolicLink())
        return o2(new St(s3, s3 + "/" + t2.join("/")));
      o2(h2);
    }
  }) : (n2 = n2 || s3, Ss(s3, t2, e, i2, r3, n2, o2));
};
var oo = (s3) => {
  let t2 = false, e;
  try {
    t2 = k2.statSync(s3).isDirectory();
  } catch (i2) {
    e = i2?.code;
  } finally {
    if (!t2)
      throw new Se(s3, e ?? "ENOTDIR");
  }
};
var _r = (s3, t2) => {
  s3 = f(s3);
  let e = t2.umask ?? 18, i2 = t2.mode | 448, r3 = (i2 & e) !== 0, n2 = t2.uid, o2 = t2.gid, h2 = typeof n2 == "number" && typeof o2 == "number" && (n2 !== t2.processUid || o2 !== t2.processGid), a2 = t2.preserve, l2 = t2.unlink, c4 = f(t2.cwd), d = (E2) => {
    E2 && h2 && ws(E2, n2, o2), r3 && k2.chmodSync(s3, i2);
  };
  if (s3 === c4)
    return oo(c4), d();
  if (a2)
    return d(k2.mkdirSync(s3, { mode: i2, recursive: true }) ?? undefined);
  let T2 = f(Si.relative(c4, s3)).split("/"), D2;
  for (let E2 = T2.shift(), x2 = c4;E2 && (x2 += "/" + E2); E2 = T2.shift()) {
    x2 = f(Si.resolve(x2));
    try {
      k2.mkdirSync(x2, i2), D2 = D2 || x2;
    } catch {
      let Le = k2.lstatSync(x2);
      if (Le.isDirectory())
        continue;
      if (l2) {
        k2.unlinkSync(x2), k2.mkdirSync(x2, i2), D2 = D2 || x2;
        continue;
      } else if (Le.isSymbolicLink())
        return new St(x2, x2 + "/" + T2.join("/"));
    }
  }
  return d(D2);
};
var ys = Object.create(null);
var Or = 1e4;
var Vt = new Set;
var Tr = (s3) => {
  Vt.has(s3) ? Vt.delete(s3) : ys[s3] = s3.normalize("NFD").toLocaleLowerCase("en").toLocaleUpperCase("en"), Vt.add(s3);
  let t2 = ys[s3], e = Vt.size - Or;
  if (e > Or / 10) {
    for (let i2 of Vt)
      if (Vt.delete(i2), delete ys[i2], --e <= 0)
        break;
  }
  return t2;
};
var ho = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform;
var ao = ho === "win32";
var lo = (s3) => s3.split("/").slice(0, -1).reduce((e, i2) => {
  let r3 = e.at(-1);
  return r3 !== undefined && (i2 = xr(r3, i2)), e.push(i2 || "/"), e;
}, []);
var yi = class {
  #t = new Map;
  #i = new Map;
  #s = new Set;
  reserve(t2, e) {
    t2 = ao ? ["win32 parallelization disabled"] : t2.map((r3) => mt(xr(Tr(r3))));
    let i2 = new Set(t2.map((r3) => lo(r3)).reduce((r3, n2) => r3.concat(n2)));
    this.#i.set(e, { dirs: i2, paths: t2 });
    for (let r3 of t2) {
      let n2 = this.#t.get(r3);
      n2 ? n2.push(e) : this.#t.set(r3, [e]);
    }
    for (let r3 of i2) {
      let n2 = this.#t.get(r3);
      if (!n2)
        this.#t.set(r3, [new Set([e])]);
      else {
        let o2 = n2.at(-1);
        o2 instanceof Set ? o2.add(e) : n2.push(new Set([e]));
      }
    }
    return this.#r(e);
  }
  #n(t2) {
    let e = this.#i.get(t2);
    if (!e)
      throw new Error("function does not have any path reservations");
    return { paths: e.paths.map((i2) => this.#t.get(i2)), dirs: [...e.dirs].map((i2) => this.#t.get(i2)) };
  }
  check(t2) {
    let { paths: e, dirs: i2 } = this.#n(t2);
    return e.every((r3) => r3 && r3[0] === t2) && i2.every((r3) => r3 && r3[0] instanceof Set && r3[0].has(t2));
  }
  #r(t2) {
    return this.#s.has(t2) || !this.check(t2) ? false : (this.#s.add(t2), t2(() => this.#e(t2)), true);
  }
  #e(t2) {
    if (!this.#s.has(t2))
      return false;
    let e = this.#i.get(t2);
    if (!e)
      throw new Error("invalid reservation");
    let { paths: i2, dirs: r3 } = e, n2 = new Set;
    for (let o2 of i2) {
      let h2 = this.#t.get(o2);
      if (!h2 || h2?.[0] !== t2)
        continue;
      let a2 = h2[1];
      if (!a2) {
        this.#t.delete(o2);
        continue;
      }
      if (h2.shift(), typeof a2 == "function")
        n2.add(a2);
      else
        for (let l2 of a2)
          n2.add(l2);
    }
    for (let o2 of r3) {
      let h2 = this.#t.get(o2), a2 = h2?.[0];
      if (!(!h2 || !(a2 instanceof Set)))
        if (a2.size === 1 && h2.length === 1) {
          this.#t.delete(o2);
          continue;
        } else if (a2.size === 1) {
          h2.shift();
          let l2 = h2[0];
          typeof l2 == "function" && n2.add(l2);
        } else
          a2.delete(t2);
    }
    return this.#s.delete(t2), n2.forEach((o2) => this.#r(o2)), true;
  }
};
var Lr = () => process.umask();
var Dr = Symbol("onEntry");
var _s = Symbol("checkFs");
var Nr = Symbol("checkFs2");
var Os = Symbol("isReusable");
var P2 = Symbol("makeFs");
var Ts = Symbol("file");
var xs = Symbol("directory");
var gi = Symbol("link");
var Ar = Symbol("symlink");
var Ir = Symbol("hardlink");
var Re = Symbol("ensureNoSymlink");
var Cr = Symbol("unsupported");
var Fr = Symbol("checkPath");
var Rs = Symbol("stripAbsolutePath");
var yt = Symbol("mkdir");
var O2 = Symbol("onError");
var Ri = Symbol("pending");
var kr = Symbol("pend");
var $t = Symbol("unpend");
var gs = Symbol("ended");
var bs = Symbol("maybeClose");
var Ls = Symbol("skip");
var ge = Symbol("doChown");
var be = Symbol("uid");
var _e = Symbol("gid");
var Oe = Symbol("checkedCwd");
var fo = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform;
var Te = fo === "win32";
var uo = 1024;
var mo = (s3, t2) => {
  if (!Te)
    return u.unlink(s3, t2);
  let e = s3 + ".DELETE." + Mr(16).toString("hex");
  u.rename(s3, e, (i2) => {
    if (i2)
      return t2(i2);
    u.unlink(e, t2);
  });
};
var po = (s3) => {
  if (!Te)
    return u.unlinkSync(s3);
  let t2 = s3 + ".DELETE." + Mr(16).toString("hex");
  u.renameSync(s3, t2), u.unlinkSync(t2);
};
var vr = (s3, t2, e) => s3 !== undefined && s3 === s3 >>> 0 ? s3 : t2 !== undefined && t2 === t2 >>> 0 ? t2 : e;
var Xt = class extends rt {
  [gs] = false;
  [Oe] = false;
  [Ri] = 0;
  reservations = new yi;
  transform;
  writable = true;
  readable = false;
  uid;
  gid;
  setOwner;
  preserveOwner;
  processGid;
  processUid;
  maxDepth;
  forceChown;
  win32;
  newer;
  keep;
  noMtime;
  preservePaths;
  unlink;
  cwd;
  strip;
  processUmask;
  umask;
  dmode;
  fmode;
  chmod;
  constructor(t2 = {}) {
    if (t2.ondone = () => {
      this[gs] = true, this[bs]();
    }, super(t2), this.transform = t2.transform, this.chmod = !!t2.chmod, typeof t2.uid == "number" || typeof t2.gid == "number") {
      if (typeof t2.uid != "number" || typeof t2.gid != "number")
        throw new TypeError("cannot set owner without number uid and gid");
      if (t2.preserveOwner)
        throw new TypeError("cannot preserve owner in archive and also set owner explicitly");
      this.uid = t2.uid, this.gid = t2.gid, this.setOwner = true;
    } else
      this.uid = undefined, this.gid = undefined, this.setOwner = false;
    this.preserveOwner = t2.preserveOwner === undefined && typeof t2.uid != "number" ? process.getuid?.() === 0 : !!t2.preserveOwner, this.processUid = (this.preserveOwner || this.setOwner) && process.getuid ? process.getuid() : undefined, this.processGid = (this.preserveOwner || this.setOwner) && process.getgid ? process.getgid() : undefined, this.maxDepth = typeof t2.maxDepth == "number" ? t2.maxDepth : uo, this.forceChown = t2.forceChown === true, this.win32 = !!t2.win32 || Te, this.newer = !!t2.newer, this.keep = !!t2.keep, this.noMtime = !!t2.noMtime, this.preservePaths = !!t2.preservePaths, this.unlink = !!t2.unlink, this.cwd = f(R3.resolve(t2.cwd || process.cwd())), this.strip = Number(t2.strip) || 0, this.processUmask = this.chmod ? typeof t2.processUmask == "number" ? t2.processUmask : Lr() : 0, this.umask = typeof t2.umask == "number" ? t2.umask : this.processUmask, this.dmode = t2.dmode || 511 & ~this.umask, this.fmode = t2.fmode || 438 & ~this.umask, this.on("entry", (e) => this[Dr](e));
  }
  warn(t2, e, i2 = {}) {
    return (t2 === "TAR_BAD_ARCHIVE" || t2 === "TAR_ABORT") && (i2.recoverable = false), super.warn(t2, e, i2);
  }
  [bs]() {
    this[gs] && this[Ri] === 0 && (this.emit("prefinish"), this.emit("finish"), this.emit("end"));
  }
  [Rs](t2, e) {
    let i2 = t2[e], { type: r3 } = t2;
    if (!i2 || this.preservePaths)
      return true;
    let [n2, o2] = ce(i2), h2 = o2.replaceAll(/\\/g, "/").split("/");
    if (h2.includes("..") || Te && /^[a-z]:\.\.$/i.test(h2[0] ?? "")) {
      if (e === "path" || r3 === "Link")
        return this.warn("TAR_ENTRY_ERROR", `${e} contains '..'`, { entry: t2, [e]: i2 }), false;
      let a2 = R3.posix.dirname(t2.path), l2 = R3.posix.normalize(R3.posix.join(a2, h2.join("/")));
      if (l2.startsWith("../") || l2 === "..")
        return this.warn("TAR_ENTRY_ERROR", `${e} escapes extraction directory`, { entry: t2, [e]: i2 }), false;
    }
    return n2 && (t2[e] = String(o2), this.warn("TAR_ENTRY_INFO", `stripping ${n2} from absolute ${e}`, { entry: t2, [e]: i2 })), true;
  }
  [Fr](t2) {
    let e = f(t2.path), i2 = e.split("/");
    if (this.strip) {
      if (i2.length < this.strip)
        return false;
      if (t2.type === "Link") {
        let r3 = f(String(t2.linkpath)).split("/");
        if (r3.length >= this.strip)
          t2.linkpath = r3.slice(this.strip).join("/");
        else
          return false;
      }
      i2.splice(0, this.strip), t2.path = i2.join("/");
    }
    if (isFinite(this.maxDepth) && i2.length > this.maxDepth)
      return this.warn("TAR_ENTRY_ERROR", "path excessively deep", { entry: t2, path: e, depth: i2.length, maxDepth: this.maxDepth }), false;
    if (!this[Rs](t2, "path") || !this[Rs](t2, "linkpath"))
      return false;
    if (t2.absolute = R3.isAbsolute(t2.path) ? f(R3.resolve(t2.path)) : f(R3.resolve(this.cwd, t2.path)), !this.preservePaths && typeof t2.absolute == "string" && t2.absolute.indexOf(this.cwd + "/") !== 0 && t2.absolute !== this.cwd)
      return this.warn("TAR_ENTRY_ERROR", "path escaped extraction target", { entry: t2, path: f(t2.path), resolvedPath: t2.absolute, cwd: this.cwd }), false;
    if (t2.absolute === this.cwd && t2.type !== "Directory" && t2.type !== "GNUDumpDir")
      return false;
    if (this.win32) {
      let { root: r3 } = R3.win32.parse(String(t2.absolute));
      t2.absolute = r3 + ts(String(t2.absolute).slice(r3.length));
      let { root: n2 } = R3.win32.parse(t2.path);
      t2.path = n2 + ts(t2.path.slice(n2.length));
    }
    return true;
  }
  [Dr](t2) {
    if (!this[Fr](t2))
      return t2.resume();
    switch (co.equal(typeof t2.absolute, "string"), t2.type) {
      case "Directory":
      case "GNUDumpDir":
        t2.mode && (t2.mode = t2.mode | 448);
      case "File":
      case "OldFile":
      case "ContiguousFile":
      case "Link":
      case "SymbolicLink":
        return this[_s](t2);
      default:
        return this[Cr](t2);
    }
  }
  [O2](t2, e) {
    t2.name === "CwdError" ? this.emit("error", t2) : (this.warn("TAR_ENTRY_ERROR", t2, { entry: e }), this[$t](), e.resume());
  }
  [yt](t2, e, i2) {
    gr(f(t2), { uid: this.uid, gid: this.gid, processUid: this.processUid, processGid: this.processGid, umask: this.processUmask, preserve: this.preservePaths, unlink: this.unlink, cwd: this.cwd, mode: e }, i2);
  }
  [ge](t2) {
    return this.forceChown || this.preserveOwner && (typeof t2.uid == "number" && t2.uid !== this.processUid || typeof t2.gid == "number" && t2.gid !== this.processGid) || typeof this.uid == "number" && this.uid !== this.processUid || typeof this.gid == "number" && this.gid !== this.processGid;
  }
  [be](t2) {
    return vr(this.uid, t2.uid, this.processUid);
  }
  [_e](t2) {
    return vr(this.gid, t2.gid, this.processGid);
  }
  [Ts](t2, e) {
    let i2 = typeof t2.mode == "number" ? t2.mode & 4095 : this.fmode, r3 = new et(String(t2.absolute), { flags: ms(t2.size), mode: i2, autoClose: false });
    r3.on("error", (a2) => {
      r3.fd && u.close(r3.fd, () => {}), r3.write = () => true, this[O2](a2, t2), e();
    });
    let n2 = 1, o2 = (a2) => {
      if (a2) {
        r3.fd && u.close(r3.fd, () => {}), this[O2](a2, t2), e();
        return;
      }
      --n2 === 0 && r3.fd !== undefined && u.close(r3.fd, (l2) => {
        l2 ? this[O2](l2, t2) : this[$t](), e();
      });
    };
    r3.on("finish", () => {
      let a2 = String(t2.absolute), l2 = r3.fd;
      if (typeof l2 == "number" && t2.mtime && !this.noMtime) {
        n2++;
        let c4 = t2.atime || new Date, d = t2.mtime;
        u.futimes(l2, c4, d, (y2) => y2 ? u.utimes(a2, c4, d, (T2) => o2(T2 && y2)) : o2());
      }
      if (typeof l2 == "number" && this[ge](t2)) {
        n2++;
        let c4 = this[be](t2), d = this[_e](t2);
        typeof c4 == "number" && typeof d == "number" && u.fchown(l2, c4, d, (y2) => y2 ? u.chown(a2, c4, d, (T2) => o2(T2 && y2)) : o2());
      }
      o2();
    });
    let h2 = this.transform && this.transform(t2) || t2;
    h2 !== t2 && (h2.on("error", (a2) => {
      this[O2](a2, t2), e();
    }), t2.pipe(h2)), h2.pipe(r3);
  }
  [xs](t2, e) {
    let i2 = typeof t2.mode == "number" ? t2.mode & 4095 : this.dmode;
    this[yt](String(t2.absolute), i2, (r3) => {
      if (r3) {
        this[O2](r3, t2), e();
        return;
      }
      let n2 = 1, o2 = () => {
        --n2 === 0 && (e(), this[$t](), t2.resume());
      };
      t2.mtime && !this.noMtime && (n2++, u.utimes(String(t2.absolute), t2.atime || new Date, t2.mtime, o2)), this[ge](t2) && (n2++, u.chown(String(t2.absolute), Number(this[be](t2)), Number(this[_e](t2)), o2)), o2();
    });
  }
  [Cr](t2) {
    t2.unsupported = true, this.warn("TAR_ENTRY_UNSUPPORTED", `unsupported entry type: ${t2.type}`, { entry: t2 }), t2.resume();
  }
  [Ar](t2, e) {
    let i2 = f(R3.relative(this.cwd, R3.resolve(R3.dirname(String(t2.absolute)), String(t2.linkpath)))).split("/");
    this[Re](t2, this.cwd, i2, () => this[gi](t2, String(t2.linkpath), "symlink", e), (r3) => {
      this[O2](r3, t2), e();
    });
  }
  [Ir](t2, e) {
    let i2 = f(R3.resolve(this.cwd, String(t2.linkpath))), r3 = f(String(t2.linkpath)).split("/");
    this[Re](t2, this.cwd, r3, () => this[gi](t2, i2, "link", e), (n2) => {
      this[O2](n2, t2), e();
    });
  }
  [Re](t2, e, i2, r3, n2) {
    let o2 = i2.shift();
    if (this.preservePaths || o2 === undefined)
      return r3();
    let h2 = R3.resolve(e, o2);
    u.lstat(h2, (a2, l2) => {
      if (a2)
        return r3();
      if (l2?.isSymbolicLink())
        return n2(new St(h2, R3.resolve(h2, i2.join("/"))));
      this[Re](t2, h2, i2, r3, n2);
    });
  }
  [kr]() {
    this[Ri]++;
  }
  [$t]() {
    this[Ri]--, this[bs]();
  }
  [Ls](t2) {
    this[$t](), t2.resume();
  }
  [Os](t2, e) {
    return t2.type === "File" && !this.unlink && e.isFile() && e.nlink <= 1 && !Te;
  }
  [_s](t2) {
    this[kr]();
    let e = [t2.path];
    t2.linkpath && e.push(t2.linkpath), this.reservations.reserve(e, (i2) => this[Nr](t2, i2));
  }
  [Nr](t2, e) {
    let i2 = (h2) => {
      e(h2);
    }, r3 = () => {
      this[yt](this.cwd, this.dmode, (h2) => {
        if (h2) {
          this[O2](h2, t2), i2();
          return;
        }
        this[Oe] = true, n2();
      });
    }, n2 = () => {
      if (t2.absolute !== this.cwd) {
        let h2 = f(R3.dirname(String(t2.absolute)));
        if (h2 !== this.cwd)
          return this[yt](h2, this.dmode, (a2) => {
            if (a2) {
              this[O2](a2, t2), i2();
              return;
            }
            o2();
          });
      }
      o2();
    }, o2 = () => {
      u.lstat(String(t2.absolute), (h2, a2) => {
        if (a2 && (this.keep || this.newer && a2.mtime > (t2.mtime ?? a2.mtime))) {
          this[Ls](t2), i2();
          return;
        }
        if (h2 || this[Os](t2, a2))
          return this[P2](null, t2, i2);
        if (a2.isDirectory()) {
          if (t2.type === "Directory") {
            let l2 = this.chmod && t2.mode && (a2.mode & 4095) !== t2.mode, c4 = (d) => this[P2](d ?? null, t2, i2);
            return l2 ? u.chmod(String(t2.absolute), Number(t2.mode), c4) : c4();
          }
          if (t2.absolute !== this.cwd)
            return u.rmdir(String(t2.absolute), (l2) => this[P2](l2 ?? null, t2, i2));
        }
        if (t2.absolute === this.cwd)
          return this[P2](null, t2, i2);
        mo(String(t2.absolute), (l2) => this[P2](l2 ?? null, t2, i2));
      });
    };
    this[Oe] ? n2() : r3();
  }
  [P2](t2, e, i2) {
    if (t2) {
      this[O2](t2, e), i2();
      return;
    }
    switch (e.type) {
      case "File":
      case "OldFile":
      case "ContiguousFile":
        return this[Ts](e, i2);
      case "Link":
        return this[Ir](e, i2);
      case "SymbolicLink":
        return this[Ar](e, i2);
      case "Directory":
      case "GNUDumpDir":
        return this[xs](e, i2);
    }
  }
  [gi](t2, e, i2, r3) {
    u[i2](e, String(t2.absolute), (n2) => {
      n2 ? this[O2](n2, t2) : (this[$t](), t2.resume()), r3();
    });
  }
};
var ye = (s3) => {
  try {
    return [null, s3()];
  } catch (t2) {
    return [t2, null];
  }
};
var xe = class extends Xt {
  sync = true;
  [P2](t2, e) {
    return super[P2](t2, e, () => {});
  }
  [_s](t2) {
    if (!this[Oe]) {
      let n2 = this[yt](this.cwd, this.dmode);
      if (n2)
        return this[O2](n2, t2);
      this[Oe] = true;
    }
    if (t2.absolute !== this.cwd) {
      let n2 = f(R3.dirname(String(t2.absolute)));
      if (n2 !== this.cwd) {
        let o2 = this[yt](n2, this.dmode);
        if (o2)
          return this[O2](o2, t2);
      }
    }
    let [e, i2] = ye(() => u.lstatSync(String(t2.absolute)));
    if (i2 && (this.keep || this.newer && i2.mtime > (t2.mtime ?? i2.mtime)))
      return this[Ls](t2);
    if (e || this[Os](t2, i2))
      return this[P2](null, t2);
    if (i2.isDirectory()) {
      if (t2.type === "Directory") {
        let o2 = this.chmod && t2.mode && (i2.mode & 4095) !== t2.mode, [h2] = o2 ? ye(() => {
          u.chmodSync(String(t2.absolute), Number(t2.mode));
        }) : [];
        return this[P2](h2, t2);
      }
      let [n2] = ye(() => u.rmdirSync(String(t2.absolute)));
      this[P2](n2, t2);
    }
    let [r3] = t2.absolute === this.cwd ? [] : ye(() => po(String(t2.absolute)));
    this[P2](r3, t2);
  }
  [Ts](t2, e) {
    let i2 = typeof t2.mode == "number" ? t2.mode & 4095 : this.fmode, r3 = (h2) => {
      let a2;
      try {
        u.closeSync(n2);
      } catch (l2) {
        a2 = l2;
      }
      (h2 || a2) && this[O2](h2 || a2, t2), e();
    }, n2;
    try {
      n2 = u.openSync(String(t2.absolute), ms(t2.size), i2);
    } catch (h2) {
      return r3(h2);
    }
    let o2 = this.transform && this.transform(t2) || t2;
    o2 !== t2 && (o2.on("error", (h2) => this[O2](h2, t2)), t2.pipe(o2)), o2.on("data", (h2) => {
      try {
        u.writeSync(n2, h2, 0, h2.length);
      } catch (a2) {
        r3(a2);
      }
    }), o2.on("end", () => {
      let h2 = null;
      if (t2.mtime && !this.noMtime) {
        let a2 = t2.atime || new Date, l2 = t2.mtime;
        try {
          u.futimesSync(n2, a2, l2);
        } catch (c4) {
          try {
            u.utimesSync(String(t2.absolute), a2, l2);
          } catch {
            h2 = c4;
          }
        }
      }
      if (this[ge](t2)) {
        let a2 = this[be](t2), l2 = this[_e](t2);
        try {
          u.fchownSync(n2, Number(a2), Number(l2));
        } catch (c4) {
          try {
            u.chownSync(String(t2.absolute), Number(a2), Number(l2));
          } catch {
            h2 = h2 || c4;
          }
        }
      }
      r3(h2);
    });
  }
  [xs](t2, e) {
    let i2 = typeof t2.mode == "number" ? t2.mode & 4095 : this.dmode, r3 = this[yt](String(t2.absolute), i2);
    if (r3) {
      this[O2](r3, t2), e();
      return;
    }
    if (t2.mtime && !this.noMtime)
      try {
        u.utimesSync(String(t2.absolute), t2.atime || new Date, t2.mtime);
      } catch {}
    if (this[ge](t2))
      try {
        u.chownSync(String(t2.absolute), Number(this[be](t2)), Number(this[_e](t2)));
      } catch {}
    e(), t2.resume();
  }
  [yt](t2, e) {
    try {
      return _r(f(t2), { uid: this.uid, gid: this.gid, processUid: this.processUid, processGid: this.processGid, umask: this.processUmask, preserve: this.preservePaths, unlink: this.unlink, cwd: this.cwd, mode: e });
    } catch (i2) {
      return i2;
    }
  }
  [Re](t2, e, i2, r3, n2) {
    if (this.preservePaths || i2.length === 0)
      return r3();
    let o2 = e;
    for (let h2 of i2) {
      o2 = R3.resolve(o2, h2);
      let [a2, l2] = ye(() => u.lstatSync(o2));
      if (a2)
        return r3();
      if (l2.isSymbolicLink())
        return n2(new St(o2, R3.resolve(e, i2.join("/"))));
    }
    r3();
  }
  [gi](t2, e, i2, r3) {
    let n2 = `${i2}Sync`;
    try {
      u[n2](e, String(t2.absolute)), r3(), t2.resume();
    } catch (o2) {
      return this[O2](o2, t2);
    }
  }
};
var Eo = (s3) => {
  let t2 = new xe(s3), e = s3.file, i2 = Br.statSync(e), r3 = s3.maxReadSize || 16 * 1024 * 1024;
  new Be(e, { readSize: r3, size: i2.size }).pipe(t2);
};
var wo = (s3, t2) => {
  let e = new Xt(s3), i2 = s3.maxReadSize || 16 * 1024 * 1024, r3 = s3.file;
  return new Promise((o2, h2) => {
    e.on("error", h2), e.on("close", o2), Br.stat(r3, (a2, l2) => {
      if (a2)
        h2(a2);
      else {
        let c4 = new _t(r3, { readSize: i2, size: l2.size });
        c4.on("error", h2), c4.pipe(e);
      }
    });
  });
};
var So = K2(Eo, wo, (s3) => new xe(s3), (s3) => new Xt(s3), (s3, t2) => {
  t2?.length && Qi(s3, t2);
});
var yo = (s3, t2) => {
  let e = new kt(s3), i2 = true, r3, n2;
  try {
    try {
      r3 = v.openSync(s3.file, "r+");
    } catch (a2) {
      if (a2?.code === "ENOENT")
        r3 = v.openSync(s3.file, "w+");
      else
        throw a2;
    }
    let o2 = v.fstatSync(r3), h2 = Buffer.alloc(512);
    t:
      for (n2 = 0;n2 < o2.size; n2 += 512) {
        for (let c4 = 0, d = 0;c4 < 512; c4 += d) {
          if (d = v.readSync(r3, h2, c4, h2.length - c4, n2 + c4), n2 === 0 && h2[0] === 31 && h2[1] === 139)
            throw new Error("cannot append to compressed archives");
          if (!d)
            break t;
        }
        let a2 = new F2(h2);
        if (!a2.cksumValid)
          break;
        let l2 = 512 * Math.ceil((a2.size || 0) / 512);
        if (n2 + l2 + 512 > o2.size)
          break;
        n2 += l2, s3.mtimeCache && a2.mtime && s3.mtimeCache.set(String(a2.path), a2.mtime);
      }
    i2 = false, Ro(s3, e, n2, r3, t2);
  } finally {
    if (i2)
      try {
        v.closeSync(r3);
      } catch {}
  }
};
var Ro = (s3, t2, e, i2, r3) => {
  let n2 = new Wt(s3.file, { fd: i2, start: e });
  t2.pipe(n2), bo(t2, r3);
};
var go = (s3, t2) => {
  t2 = Array.from(t2);
  let e = new wt(s3), i2 = (n2, o2, h2) => {
    let a2 = (T2, D2) => {
      T2 ? v.close(n2, (E2) => h2(T2)) : h2(null, D2);
    }, l2 = 0;
    if (o2 === 0)
      return a2(null, 0);
    let c4 = 0, d = Buffer.alloc(512), y2 = (T2, D2) => {
      if (T2 || D2 === undefined)
        return a2(T2);
      if (c4 += D2, c4 < 512 && D2)
        return v.read(n2, d, c4, d.length - c4, l2 + c4, y2);
      if (l2 === 0 && d[0] === 31 && d[1] === 139)
        return a2(new Error("cannot append to compressed archives"));
      if (c4 < 512)
        return a2(null, l2);
      let E2 = new F2(d);
      if (!E2.cksumValid)
        return a2(null, l2);
      let x2 = 512 * Math.ceil((E2.size ?? 0) / 512);
      if (l2 + x2 + 512 > o2 || (l2 += x2 + 512, l2 >= o2))
        return a2(null, l2);
      s3.mtimeCache && E2.mtime && s3.mtimeCache.set(String(E2.path), E2.mtime), c4 = 0, v.read(n2, d, 0, 512, l2, y2);
    };
    v.read(n2, d, 0, 512, l2, y2);
  };
  return new Promise((n2, o2) => {
    e.on("error", o2);
    let h2 = "r+", a2 = (l2, c4) => {
      if (l2 && l2.code === "ENOENT" && h2 === "r+")
        return h2 = "w+", v.open(s3.file, h2, a2);
      if (l2 || !c4)
        return o2(l2);
      v.fstat(c4, (d, y2) => {
        if (d)
          return v.close(c4, () => o2(d));
        i2(c4, y2.size, (T2, D2) => {
          if (T2)
            return o2(T2);
          let E2 = new et(s3.file, { fd: c4, start: D2 });
          e.pipe(E2), E2.on("error", o2), E2.on("close", n2), _o(e, t2);
        });
      });
    };
    v.open(s3.file, h2, a2);
  });
};
var bo = (s3, t2) => {
  t2.forEach((e) => {
    e.charAt(0) === "@" ? Ct({ file: Pr.resolve(s3.cwd, e.slice(1)), sync: true, noResume: true, onReadEntry: (i2) => s3.add(i2) }) : s3.add(e);
  }), s3.end();
};
var _o = async (s3, t2) => {
  for (let e of t2)
    e.charAt(0) === "@" ? await Ct({ file: Pr.resolve(String(s3.cwd), e.slice(1)), noResume: true, onReadEntry: (i2) => s3.add(i2) }) : s3.add(e);
  s3.end();
};
var vt = K2(yo, go, () => {
  throw new TypeError("file is required");
}, () => {
  throw new TypeError("file is required");
}, (s3, t2) => {
  if (!Bs(s3))
    throw new TypeError("file is required");
  if (s3.gzip || s3.brotli || s3.zstd || s3.file.endsWith(".br") || s3.file.endsWith(".tbr"))
    throw new TypeError("cannot append to compressed archives");
  if (!t2?.length)
    throw new TypeError("no paths specified to add/replace");
});
var Oo = K2(vt.syncFile, vt.asyncFile, vt.syncNoFile, vt.asyncNoFile, (s3, t2 = []) => {
  vt.validate?.(s3, t2), To(s3);
});
var To = (s3) => {
  let t2 = s3.filter;
  s3.mtimeCache || (s3.mtimeCache = new Map), s3.filter = t2 ? (e, i2) => t2(e, i2) && !((s3.mtimeCache?.get(e) ?? i2.mtime ?? 0) > (i2.mtime ?? 0)) : (e, i2) => !((s3.mtimeCache?.get(e) ?? i2.mtime ?? 0) > (i2.mtime ?? 0));
};

// ../../node_modules/.bun/skills@1.7.6/node_modules/skills/dist/cli.mjs
import { execFile as execFile$1, spawn as spawn$1 } from "node:child_process";
var import_picocolors2 = /* @__PURE__ */ __toESM(require_picocolors(), 1);
var DEFAULT_GITHUB_HOST = "github.com";
function getGitHubHost() {
  const configuredHost = process.env.GH_HOST?.trim();
  if (!configuredHost)
    return DEFAULT_GITHUB_HOST;
  try {
    const parsed = new URL(`https://${configuredHost}`);
    if (parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash)
      return DEFAULT_GITHUB_HOST;
    return parsed.hostname;
  } catch {
    return DEFAULT_GITHUB_HOST;
  }
}
function isGitHubHost(host) {
  const normalizedHost = host.toLowerCase();
  return normalizedHost === DEFAULT_GITHUB_HOST || normalizedHost === getGitHubHost().toLowerCase();
}
function getOwnerRepo(parsed) {
  if (parsed.type === "local" || parsed.type === "download")
    return null;
  const sshMatch = parsed.url.match(/^git@[^:]+:(.+)$/);
  if (sshMatch) {
    let path2 = sshMatch[1];
    path2 = path2.replace(/\.git$/, "");
    if (path2.includes("/"))
      return path2;
    return null;
  }
  if (parsed.url.startsWith("ssh://"))
    try {
      let path2 = new URL(parsed.url).pathname.slice(1);
      path2 = path2.replace(/\.git$/, "");
      if (path2.includes("/"))
        return path2;
      return null;
    } catch {
      return null;
    }
  if (!parsed.url.startsWith("http://") && !parsed.url.startsWith("https://"))
    return null;
  try {
    let path2 = new URL(parsed.url).pathname.slice(1);
    path2 = path2.replace(/\.git$/, "");
    if (path2.includes("/"))
      return path2;
  } catch {}
  return null;
}
function parseOwnerRepo(ownerRepo) {
  const match = ownerRepo.match(/^([^/]+)\/([^/]+)$/);
  if (match)
    return {
      owner: match[1],
      repo: match[2]
    };
  return null;
}
async function isRepoPrivate(owner, repo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok)
      return null;
    return (await res.json()).private === true;
  } catch {
    return null;
  }
}
function sanitizeSubpath(subpath) {
  const segments = subpath.replace(/\\/g, "/").split("/");
  for (const segment of segments)
    if (segment === "..")
      throw new Error(`Unsafe subpath: "${subpath}" contains path traversal segments. Subpaths must not contain ".." components.`);
  return subpath;
}
function azureReposVersionToRef(version) {
  if (!version)
    return;
  return /^(?:GB|GT)(.+)$/i.exec(version)?.[1] || undefined;
}
function parseAzureReposSource(input, fragmentRef, fragmentSkillFilter) {
  if (!input.startsWith("http://") && !input.startsWith("https://"))
    return null;
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  const gitIndex = segments.indexOf("_git");
  if (gitIndex < 0 || gitIndex === segments.length - 1)
    return null;
  const repo = segments[gitIndex + 1].replace(/\.git$/, "");
  if (!repo)
    return null;
  const clonePath = "/" + [
    ...segments.slice(0, gitIndex),
    "_git",
    repo
  ].map((segment) => {
    try {
      return encodeURIComponent(decodeURIComponent(segment));
    } catch {
      return encodeURIComponent(segment);
    }
  }).join("/");
  const cloneUrl = `${parsed.protocol}//${parsed.host}${clonePath}`;
  const ref = azureReposVersionToRef(parsed.searchParams.get("version")) || fragmentRef;
  const pathParam = parsed.searchParams.get("path");
  const subpath = pathParam ? sanitizeSubpath(pathParam.replace(/^\/+/, "")) : undefined;
  return {
    type: "git",
    url: cloneUrl,
    ...ref ? { ref } : {},
    ...subpath ? { subpath } : {},
    ...fragmentSkillFilter ? { skillFilter: fragmentSkillFilter } : {}
  };
}
function isLocalPath(input) {
  return isAbsolute(input) || input.startsWith("./") || input.startsWith("../") || input === "." || input === ".." || /^[a-zA-Z]:[/\\]/.test(input);
}
var SOURCE_ALIASES = {
  "coinbase/agentWallet": "coinbase/agentic-wallet-skills",
  "vercel-labs/vercel-skills": "vercel-labs/agent-skills"
};
function decodeFragmentValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function looksLikeGitSource(input) {
  if (input.startsWith("github:") || input.startsWith("gitlab:") || input.startsWith("git@"))
    return true;
  if (/^ssh:\/\/.+\.git(?:$|[/?])/i.test(input))
    return true;
  if (input.startsWith("http://") || input.startsWith("https://"))
    try {
      const parsed = new URL(input);
      const pathname = parsed.pathname;
      if (isGitHubHost(parsed.host))
        return /^\/[^/]+\/[^/]+(?:\.git)?(?:\/tree\/[^/]+(?:\/.*)?)?\/?$/.test(pathname);
      if (parsed.hostname === "gitlab.com")
        return /^\/.+?\/[^/]+(?:\.git)?(?:\/-\/tree\/[^/]+(?:\/.*)?)?\/?$/.test(pathname);
      const azureSegments = pathname.split("/").filter(Boolean);
      const azureGitIndex = azureSegments.indexOf("_git");
      if (azureGitIndex >= 0 && azureGitIndex < azureSegments.length - 1)
        return true;
    } catch {}
  if (/^https?:\/\/.+\.git(?:$|[/?])/i.test(input))
    return true;
  return !input.includes(":") && !input.startsWith(".") && !input.startsWith("/") && /^([^/]+)\/([^/]+)(?:\/(.+)|@(.+))?$/.test(input);
}
function parseFragmentRef(input) {
  const hashIndex = input.indexOf("#");
  if (hashIndex < 0)
    return { inputWithoutFragment: input };
  const inputWithoutFragment = input.slice(0, hashIndex);
  const fragment = input.slice(hashIndex + 1);
  if (!fragment || !looksLikeGitSource(inputWithoutFragment))
    return { inputWithoutFragment: input };
  const atIndex = fragment.indexOf("@");
  if (atIndex === -1)
    return {
      inputWithoutFragment,
      ref: decodeFragmentValue(fragment)
    };
  const ref = fragment.slice(0, atIndex);
  const skillFilter = fragment.slice(atIndex + 1);
  return {
    inputWithoutFragment,
    ref: ref ? decodeFragmentValue(ref) : undefined,
    skillFilter: skillFilter ? decodeFragmentValue(skillFilter) : undefined
  };
}
function appendFragmentRef(input, ref, skillFilter) {
  if (!ref && !skillFilter)
    return input;
  return `${input}#${ref ? encodeURIComponent(ref) : ""}${skillFilter ? `@${encodeURIComponent(skillFilter)}` : ""}`;
}
function isHostedArtifactUrl(input) {
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();
    if (host === "raw.githubusercontent.com" || host === "codeload.github.com" || host === "objects.githubusercontent.com")
      return true;
    if (host === "github.com")
      return /^\/[^/]+\/[^/]+\/(?:archive\/|raw\/|releases\/(?:download\/|latest\/download\/))/.test(parsed.pathname);
    if (host === "gitlab.com")
      return /\/-\/(?:archive|raw)\//.test(parsed.pathname);
    return false;
  } catch {
    return false;
  }
}
function parseSource(input, options = {}) {
  if (isLocalPath(input)) {
    const resolvedPath = resolve(input);
    return {
      type: "local",
      url: resolvedPath,
      localPath: resolvedPath
    };
  }
  const { inputWithoutFragment, ref: fragmentRef, skillFilter: fragmentSkillFilter } = parseFragmentRef(input);
  input = inputWithoutFragment;
  const alias = SOURCE_ALIASES[input];
  if (alias)
    input = alias;
  const githubPrefixMatch = input.match(/^github:(.+)$/);
  if (githubPrefixMatch)
    return parseSource(appendFragmentRef(githubPrefixMatch[1], fragmentRef, fragmentSkillFilter));
  const gitlabPrefixMatch = input.match(/^gitlab:(.+)$/);
  if (gitlabPrefixMatch)
    return parseSource(appendFragmentRef(`https://gitlab.com/${gitlabPrefixMatch[1]}`, fragmentRef, fragmentSkillFilter));
  if (isHostedArtifactUrl(input))
    return {
      type: "download",
      url: input
    };
  if (getGitHubHost() !== "github.com" && /^https?:\/\//.test(input))
    try {
      const parsedUrl = new URL(input);
      if (isGitHubHost(parsedUrl.host) && parsedUrl.host !== "github.com") {
        const [owner, rawRepo, marker, ref, ...subpathSegments] = parsedUrl.pathname.split("/").filter(Boolean);
        if (owner && rawRepo) {
          const repo = rawRepo.replace(/\.git$/, "");
          const isTreeUrl = marker === "tree" && ref;
          return {
            type: "git",
            url: `${parsedUrl.protocol}//${parsedUrl.host}/${owner}/${repo}.git`,
            ...isTreeUrl ? { ref } : fragmentRef ? { ref: fragmentRef } : {},
            ...isTreeUrl && subpathSegments.length > 0 ? { subpath: sanitizeSubpath(subpathSegments.join("/")) } : {}
          };
        }
      }
    } catch {}
  const githubTreeWithPathMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/);
  if (githubTreeWithPathMatch) {
    const [, owner, repo, ref, subpath] = githubTreeWithPathMatch;
    return {
      type: "github",
      url: `https://github.com/${owner}/${repo}.git`,
      ref: ref || fragmentRef,
      subpath: subpath ? sanitizeSubpath(subpath) : subpath
    };
  }
  const githubTreeMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/);
  if (githubTreeMatch) {
    const [, owner, repo, ref] = githubTreeMatch;
    return {
      type: "github",
      url: `https://github.com/${owner}/${repo}.git`,
      ref: ref || fragmentRef
    };
  }
  const githubRepoMatch = input.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (githubRepoMatch) {
    const [, owner, repo] = githubRepoMatch;
    return {
      type: "github",
      url: `https://github.com/${owner}/${repo.replace(/\.git$/, "")}.git`,
      ...fragmentRef ? { ref: fragmentRef } : {}
    };
  }
  const gitlabTreeWithPathMatch = input.match(/^(https?):\/\/([^/]+)\/(.+?)\/-\/tree\/([^/]+)\/(.+)/);
  if (gitlabTreeWithPathMatch) {
    const [, protocol, hostname, repoPath, ref, subpath] = gitlabTreeWithPathMatch;
    if (hostname !== "github.com" && repoPath)
      return {
        type: "gitlab",
        url: `${protocol}://${hostname}/${repoPath.replace(/\.git$/, "")}.git`,
        ref: ref || fragmentRef,
        subpath: subpath ? sanitizeSubpath(subpath) : subpath
      };
  }
  const gitlabTreeMatch = input.match(/^(https?):\/\/([^/]+)\/(.+?)\/-\/tree\/([^/]+)$/);
  if (gitlabTreeMatch) {
    const [, protocol, hostname, repoPath, ref] = gitlabTreeMatch;
    if (hostname !== "github.com" && repoPath)
      return {
        type: "gitlab",
        url: `${protocol}://${hostname}/${repoPath.replace(/\.git$/, "")}.git`,
        ref: ref || fragmentRef
      };
  }
  const gitlabRepoMatch = input.match(/gitlab\.com\/(.+?)(?:\.git)?\/?$/);
  if (gitlabRepoMatch) {
    const repoPath = gitlabRepoMatch[1];
    if (repoPath.includes("/"))
      return {
        type: "gitlab",
        url: `https://gitlab.com/${repoPath}.git`,
        ...fragmentRef ? { ref: fragmentRef } : {}
      };
  }
  const azureRepos = parseAzureReposSource(input, fragmentRef, fragmentSkillFilter);
  if (azureRepos)
    return azureRepos;
  const githubHost = options.githubHost ?? getGitHubHost();
  const shorthandSourceType = githubHost === "github.com" ? "github" : "git";
  const atSkillMatch = input.match(/^([^/]+)\/([^/@]+)@(.+)$/);
  if (atSkillMatch && !input.includes(":") && !input.startsWith(".") && !input.startsWith("/")) {
    const [, owner, repo, skillFilter] = atSkillMatch;
    return {
      type: shorthandSourceType,
      url: `https://${githubHost}/${owner}/${repo}.git`,
      ...fragmentRef ? { ref: fragmentRef } : {},
      skillFilter: fragmentSkillFilter || skillFilter
    };
  }
  const shorthandMatch = input.match(/^([^/]+)\/([^/]+)(?:\/(.+?))?\/?$/);
  if (shorthandMatch && !input.includes(":") && !input.startsWith(".") && !input.startsWith("/")) {
    const [, owner, repo, subpath] = shorthandMatch;
    return {
      type: shorthandSourceType,
      url: `https://${githubHost}/${owner}/${repo}.git`,
      ...fragmentRef ? { ref: fragmentRef } : {},
      subpath: subpath ? sanitizeSubpath(subpath) : subpath,
      ...fragmentSkillFilter ? { skillFilter: fragmentSkillFilter } : {}
    };
  }
  if (isWellKnownUrl(input))
    return {
      type: "well-known",
      url: input
    };
  return {
    type: "git",
    url: input,
    ...fragmentRef ? { ref: fragmentRef } : {}
  };
}
function isWellKnownUrl(input) {
  if (!input.startsWith("http://") && !input.startsWith("https://"))
    return false;
  try {
    const parsed = new URL(input);
    if ([
      "github.com",
      "gitlab.com",
      "raw.githubusercontent.com"
    ].includes(parsed.hostname))
      return false;
    if (input.endsWith(".git"))
      return false;
    return true;
  } catch {
    return false;
  }
}
var CSI_RE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;
var OSC_RE = /\x1b\][\s\S]*?(?:\x07|\x1b\\)/g;
var DCS_PM_APC_RE = /\x1b[P^_][\s\S]*?(?:\x1b\\)/g;
var SIMPLE_ESC_RE = /\x1b[\x20-\x7e]/g;
var C1_RE = /[\x80-\x9f]/g;
var CONTROL_RE2 = /[\x00-\x06\x07\x08\x0b\x0c\x0d-\x1a\x1c-\x1f\x7f]/g;
function stripTerminalEscapes(str) {
  return str.replace(OSC_RE, "").replace(DCS_PM_APC_RE, "").replace(CSI_RE, "").replace(SIMPLE_ESC_RE, "").replace(C1_RE, "").replace(CONTROL_RE2, "");
}
function sanitizeMetadata(str) {
  return stripTerminalEscapes(str).replace(/[\r\n]+/g, " ").trim();
}
var silentOutput = new Writable({ write(_chunk, _encoding, callback) {
  callback();
} });
var S_STEP_ACTIVE2 = import_picocolors2.default.green("◆");
var S_STEP_CANCEL2 = import_picocolors2.default.red("■");
var S_STEP_SUBMIT2 = import_picocolors2.default.green("◇");
var S_RADIO_ACTIVE2 = import_picocolors2.default.green("●");
var S_RADIO_INACTIVE2 = import_picocolors2.default.dim("○");
import_picocolors2.default.green("✓");
var S_BULLET = import_picocolors2.default.green("•");
var S_BAR2 = import_picocolors2.default.dim("│");
var S_BAR_H2 = import_picocolors2.default.dim("─");
var cancelSymbol = Symbol("cancel");
function approxStringWidth(plain) {
  let width = 0;
  for (const ch of plain) {
    const code = ch.codePointAt(0);
    if (code === 0)
      continue;
    width += code >= 4352 && code <= 4447 || code >= 8986 && code <= 8987 || code >= 9001 && code <= 9002 || code >= 9193 && code <= 9196 || code === 9200 || code === 9203 || code >= 9725 && code <= 9726 || code >= 9748 && code <= 9749 || code >= 9800 && code <= 9811 || code >= 9855 && code <= 9855 || code >= 9875 && code <= 9875 || code >= 9889 && code <= 9889 || code >= 9898 && code <= 9899 || code >= 9917 && code <= 9918 || code >= 9924 && code <= 9925 || code >= 9934 && code <= 9934 || code >= 9940 && code <= 9940 || code >= 9962 && code <= 9962 || code >= 9970 && code <= 9971 || code >= 9973 && code <= 9973 || code >= 9978 && code <= 9978 || code >= 9981 && code <= 9981 || code >= 9989 && code <= 9989 || code >= 9994 && code <= 9995 || code >= 10024 && code <= 10024 || code >= 10060 && code <= 10060 || code >= 10062 && code <= 10062 || code >= 10067 && code <= 10069 || code >= 10071 && code <= 10071 || code >= 10133 && code <= 10135 || code >= 10160 && code <= 10160 || code >= 10175 && code <= 10175 || code >= 11035 && code <= 11036 || code >= 11088 && code <= 11088 || code >= 11093 && code <= 11093 || code >= 11904 && code <= 42191 && code !== 12351 || code >= 43360 && code <= 43388 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65040 && code <= 65049 || code >= 65072 && code <= 65135 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510 || code >= 126976 && code <= 129535 ? 2 : 1;
  }
  return width;
}
function visualRowsForLine(line, columns) {
  const plain = stripVTControlCharacters(line);
  const cols = Math.max(1, columns);
  const w2 = approxStringWidth(plain);
  return Math.max(1, Math.ceil(w2 / cols));
}
function countVisualRowsForLines(lines, columns) {
  const cols = columns !== undefined && columns > 0 ? columns : process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
  return lines.reduce((sum, line) => sum + visualRowsForLine(line, cols), 0);
}
function truncateToWidth(text, width) {
  let truncated = "";
  for (const char of text) {
    if (approxStringWidth(truncated + char) > width)
      break;
    truncated += char;
  }
  return truncated;
}
function formatDetailLines(detail, width, maxLines) {
  const safeWidth = Math.max(1, width);
  const normalized = detail?.replace(/\s+/g, " ").trim() ?? "";
  const lines = [];
  let remaining = normalized;
  while (remaining && lines.length < maxLines) {
    if (approxStringWidth(remaining) <= safeWidth) {
      lines.push(remaining);
      remaining = "";
      break;
    }
    const candidate = truncateToWidth(remaining, safeWidth);
    const breakAt = candidate.lastIndexOf(" ");
    if (breakAt > 0) {
      lines.push(candidate.slice(0, breakAt).trimEnd());
      remaining = remaining.slice(breakAt).trimStart();
    } else {
      lines.push(candidate);
      remaining = remaining.slice(candidate.length).trimStart();
    }
  }
  if (remaining && lines.length > 0) {
    const last2 = lines.length - 1;
    lines[last2] = `${truncateToWidth(lines[last2], Math.max(0, safeWidth - 1)).trimEnd()}…`;
  }
  while (lines.length < maxLines)
    lines.push("");
  return lines;
}
function buildSearchEntries(items, selectGroups, collapsedGroups = /* @__PURE__ */ new Set) {
  if (!selectGroups)
    return items.map((item) => ({
      type: "item",
      item
    }));
  const entries = [];
  let index = 0;
  while (index < items.length) {
    const item = items[index];
    if (!item.group) {
      entries.push({
        type: "item",
        item
      });
      index += 1;
      continue;
    }
    const groupItems = [];
    while (index < items.length && items[index].group === item.group) {
      groupItems.push(items[index]);
      index += 1;
    }
    const collapsed = collapsedGroups.has(item.group);
    entries.push({
      type: "group",
      group: item.group,
      items: groupItems,
      collapsed
    });
    if (!collapsed)
      entries.push(...groupItems.map((groupItem) => ({
        type: "item",
        item: groupItem
      })));
  }
  return entries;
}
function toggleSearchEntry(selected, entry) {
  if (entry?.type === "group") {
    const allSelected = entry.items.every((item) => selected.has(item.value));
    for (const item of entry.items)
      if (allSelected)
        selected.delete(item.value);
      else
        selected.add(item.value);
  } else if (entry?.type === "item")
    if (selected.has(entry.item.value))
      selected.delete(entry.item.value);
    else
      selected.add(entry.item.value);
}
function getSelectAllState(selected, items) {
  const selectedCount = items.filter((item) => selected.has(item.value)).length;
  if (selectedCount === 0)
    return "none";
  if (selectedCount === items.length)
    return "all";
  return "partial";
}
function toggleAllItems(selected, items) {
  const shouldClear = getSelectAllState(selected, items) === "all";
  for (const item of items)
    if (shouldClear)
      selected.delete(item.value);
    else
      selected.add(item.value);
}
async function searchMultiselect(options) {
  const { message, items, maxVisible = 8, initialSelected = [], required = false, lockedSection, searchable = true, showDetail = false, detailLines = 2, showSelectedSummary = true, selectGroups = false, selectAll = false } = options;
  return new Promise((resolve2) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: silentOutput,
      terminal: false
    });
    if (process.stdin.isTTY)
      process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin, rl);
    let query = "";
    let cursor = 0;
    const selected = new Set(initialSelected);
    const collapsedGroups = /* @__PURE__ */ new Set;
    let lastRenderHeight = 0;
    const lockedValues = lockedSection ? lockedSection.items.map((i2) => i2.value) : [];
    const filter = (item, q3) => {
      if (!q3)
        return true;
      const lowerQ = q3.toLowerCase();
      return item.label.toLowerCase().includes(lowerQ) || String(item.value).toLowerCase().includes(lowerQ);
    };
    const getFiltered = () => {
      return items.filter((item) => filter(item, query));
    };
    const render = (state = "active") => {
      const lines = [];
      const filtered = getFiltered();
      const entries = buildSearchEntries(filtered, selectGroups, collapsedGroups);
      const hasSelectAll = selectAll && items.length > 0;
      const entryCursor = cursor - (hasSelectAll ? 1 : 0);
      const icon = state === "active" ? S_STEP_ACTIVE2 : state === "cancel" ? S_STEP_CANCEL2 : S_STEP_SUBMIT2;
      lines.push(`${icon}  ${import_picocolors2.default.bold(message)}`);
      if (state === "active") {
        if (lockedSection && lockedSection.items.length > 0) {
          lines.push(`${S_BAR2}`);
          const lockedTitle = `${import_picocolors2.default.bold(lockedSection.title)} ${import_picocolors2.default.dim("── always included")}`;
          lines.push(`${S_BAR2}  ${S_BAR_H2}${S_BAR_H2} ${lockedTitle} ${S_BAR_H2.repeat(12)}`);
          for (const item of lockedSection.items)
            lines.push(`${S_BAR2}    ${S_BULLET} ${import_picocolors2.default.bold(item.label)}`);
          if (lockedSection.hiddenCount && lockedSection.hiddenCount > 0)
            lines.push(`${S_BAR2}    ${import_picocolors2.default.dim(`…and ${lockedSection.hiddenCount} more`)}`);
          lines.push(`${S_BAR2}`);
          lines.push(`${S_BAR2}  ${S_BAR_H2}${S_BAR_H2} ${import_picocolors2.default.bold("Additional agents")} ${S_BAR_H2.repeat(29)}`);
        }
        if (searchable) {
          const searchLine = `${S_BAR2}  ${import_picocolors2.default.dim("Search:")} ${query}${import_picocolors2.default.inverse(" ")}`;
          lines.push(searchLine);
          lines.push(`${S_BAR2}  ${import_picocolors2.default.dim("↑↓ move, space select, enter confirm")}`);
          lines.push(`${S_BAR2}`);
        }
        if (hasSelectAll) {
          const selectedCount = items.filter((item) => selected.has(item.value)).length;
          const selectAllState = getSelectAllState(selected, items);
          const radio = selectAllState === "all" ? S_RADIO_ACTIVE2 : selectAllState === "partial" ? import_picocolors2.default.yellow("◐") : S_RADIO_INACTIVE2;
          const isCursor = cursor === 0;
          const prefix = isCursor ? import_picocolors2.default.cyan("❯") : " ";
          const label = isCursor ? import_picocolors2.default.underline(import_picocolors2.default.bold("Select All")) : import_picocolors2.default.bold("Select All");
          lines.push(`${S_BAR2} ${prefix} ${radio} ${label} ${import_picocolors2.default.dim(`(${selectedCount}/${items.length})`)}`);
          lines.push(`${S_BAR2}   ${S_BAR_H2.repeat(36)}`);
        }
        const columns = process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
        const buildFooterLines = (includeDetail2, includeSelectedSummary2) => {
          const footerLines = [];
          if (includeDetail2) {
            const entry = entries[entryCursor];
            const detail = hasSelectAll && cursor === 0 ? `Select or clear all ${items.length} skills.` : entry?.type === "group" ? `Select all ${entry.items.length} skills in ${entry.group}.` : entry?.item.detail;
            const detailWidth = Math.max(1, columns - 5);
            footerLines.push(`${S_BAR2}`);
            footerLines.push(`${S_BAR2}  ${import_picocolors2.default.dim("Description")}`);
            for (const line of formatDetailLines(detail, detailWidth, detailLines))
              footerLines.push(`${S_BAR2}  ${import_picocolors2.default.dim(line)}`);
          }
          if (includeSelectedSummary2) {
            footerLines.push(`${S_BAR2}`);
            const allSelectedLabels = [...lockedSection ? lockedSection.items.map((i2) => i2.label) : [], ...items.filter((item) => selected.has(item.value)).map((item) => item.label)];
            if (allSelectedLabels.length === 0)
              footerLines.push(`${S_BAR2}  ${import_picocolors2.default.dim("Selected: (none)")}`);
            else {
              const summary = allSelectedLabels.length <= 3 ? allSelectedLabels.join(", ") : `${allSelectedLabels.slice(0, 3).join(", ")} +${allSelectedLabels.length - 3} more`;
              footerLines.push(`${S_BAR2}  ${import_picocolors2.default.green("Selected:")} ${summary}`);
            }
          }
          if (!searchable) {
            footerLines.push(`${S_BAR2}`);
            footerLines.push(`${S_BAR2}  ${import_picocolors2.default.dim("↑↓ move, ←→ collapse/expand, space select, enter confirm")}`);
          }
          footerLines.push(`${import_picocolors2.default.dim("└")}`);
          return footerLines;
        };
        const buildItemLines = (visibleLimit) => {
          if (filtered.length === 0)
            return [`${S_BAR2}  ${import_picocolors2.default.dim("No matches found")}`];
          const itemLines = [];
          const visibleStart = Math.max(0, Math.min(entryCursor - Math.floor(visibleLimit / 2), entries.length - visibleLimit));
          const visibleEnd = Math.min(entries.length, visibleStart + visibleLimit);
          const visibleEntries = entries.slice(visibleStart, visibleEnd);
          for (let i2 = 0;i2 < visibleEntries.length; i2++) {
            const entry = visibleEntries[i2];
            const isCursor = visibleStart + i2 === entryCursor;
            if (entry.type === "group") {
              const selectedCount = entry.items.filter((item2) => selected.has(item2.value)).length;
              const radio2 = selectedCount === entry.items.length ? S_RADIO_ACTIVE2 : selectedCount > 0 ? import_picocolors2.default.yellow("◐") : S_RADIO_INACTIVE2;
              const label2 = isCursor ? import_picocolors2.default.underline(import_picocolors2.default.bold(entry.group)) : import_picocolors2.default.bold(entry.group);
              const prefix2 = isCursor ? import_picocolors2.default.cyan("❯") : " ";
              const disclosure = import_picocolors2.default.dim(entry.collapsed ? "▸" : "▾");
              itemLines.push(`${S_BAR2} ${prefix2} ${disclosure} ${radio2} ${label2}`);
              continue;
            }
            const item = entry.item;
            const radio = selected.has(item.value) ? S_RADIO_ACTIVE2 : S_RADIO_INACTIVE2;
            const label = isCursor ? import_picocolors2.default.underline(item.label) : item.label;
            const hint = item.hint ? import_picocolors2.default.dim(` (${item.hint})`) : "";
            const prefix = isCursor ? import_picocolors2.default.cyan("❯") : " ";
            const groupItems = selectGroups && item.group ? filtered.filter((i3) => i3.group === item.group) : [];
            const isLastInGroup = groupItems.at(-1) === item;
            const tree = groupItems.length > 0 ? `${import_picocolors2.default.dim(isLastInGroup ? "└─" : "├─")} ` : "";
            itemLines.push(`${S_BAR2} ${prefix} ${tree}${radio} ${label}${hint}`);
          }
          const hiddenBefore = visibleStart;
          const hiddenAfter = entries.length - visibleEnd;
          if (hiddenBefore > 0 || hiddenAfter > 0) {
            const parts = [];
            if (hiddenBefore > 0)
              parts.push(`↑ ${hiddenBefore} more`);
            if (hiddenAfter > 0)
              parts.push(`↓ ${hiddenAfter} more`);
            itemLines.push(`${S_BAR2}  ${import_picocolors2.default.dim(parts.join("  "))}`);
          }
          return itemLines;
        };
        const terminalRows = process.stdout.rows && process.stdout.rows > 0 ? process.stdout.rows : undefined;
        const maxFrameRows = terminalRows ? Math.max(1, terminalRows - 1) : undefined;
        const fitFrame = (includeDetail2, includeSelectedSummary2) => {
          const footerLines = buildFooterLines(includeDetail2, includeSelectedSummary2);
          let visibleLimit = Math.max(1, maxVisible);
          let itemLines = buildItemLines(visibleLimit);
          let frameRows = countVisualRowsForLines([
            ...lines,
            ...itemLines,
            ...footerLines
          ], columns);
          while (maxFrameRows && frameRows > maxFrameRows && visibleLimit > 1) {
            visibleLimit -= 1;
            itemLines = buildItemLines(visibleLimit);
            frameRows = countVisualRowsForLines([
              ...lines,
              ...itemLines,
              ...footerLines
            ], columns);
          }
          return {
            itemLines,
            footerLines,
            frameRows
          };
        };
        let includeDetail = showDetail;
        let includeSelectedSummary = showSelectedSummary;
        let fitted = fitFrame(includeDetail, includeSelectedSummary);
        if (maxFrameRows && fitted.frameRows > maxFrameRows && includeDetail) {
          includeDetail = false;
          fitted = fitFrame(includeDetail, includeSelectedSummary);
        }
        if (maxFrameRows && fitted.frameRows > maxFrameRows && includeSelectedSummary) {
          includeSelectedSummary = false;
          fitted = fitFrame(includeDetail, includeSelectedSummary);
        }
        lines.push(...fitted.itemLines, ...fitted.footerLines);
      } else if (state === "submit") {
        const allSelectedLabels = [...lockedSection ? lockedSection.items.map((i2) => i2.label) : [], ...items.filter((item) => selected.has(item.value)).map((item) => item.label)];
        lines.push(`${S_BAR2}  ${import_picocolors2.default.dim(allSelectedLabels.join(", "))}`);
      } else if (state === "cancel")
        lines.push(`${S_BAR2}  ${import_picocolors2.default.strikethrough(import_picocolors2.default.dim("Cancelled"))}`);
      const clearPreviousFrame = lastRenderHeight > 0 ? `\x1B[${lastRenderHeight}A\x1B[J` : "";
      process.stdout.write(clearPreviousFrame + lines.join(`
`) + `
`);
      lastRenderHeight = countVisualRowsForLines(lines, process.stdout.columns);
    };
    const cleanup = () => {
      rl.removeListener("close", closeHandler);
      process.stdin.removeListener("keypress", keypressHandler);
      if (process.stdin.isTTY)
        process.stdin.setRawMode(false);
      rl.close();
    };
    let settled = false;
    const submit = () => {
      if (settled)
        return;
      if (required && selected.size === 0 && lockedValues.length === 0)
        return;
      settled = true;
      render("submit");
      cleanup();
      resolve2([...lockedValues, ...Array.from(selected)]);
    };
    const cancel2 = () => {
      if (settled)
        return;
      settled = true;
      render("cancel");
      cleanup();
      resolve2(cancelSymbol);
    };
    const closeHandler = () => {
      cancel2();
    };
    const keypressHandler = (_str, key) => {
      if (!key)
        return;
      const entries = buildSearchEntries(getFiltered(), selectGroups, collapsedGroups);
      const hasSelectAll = selectAll && items.length > 0;
      const cursorOffset = hasSelectAll ? 1 : 0;
      const entry = entries[cursor - cursorOffset];
      if (key.name === "return") {
        submit();
        return;
      }
      if (key.name === "escape" || key.ctrl && key.name === "c") {
        cancel2();
        return;
      }
      if (key.name === "up") {
        cursor = Math.max(0, cursor - 1);
        render();
        return;
      }
      if (key.name === "down") {
        cursor = Math.min(entries.length + cursorOffset - 1, cursor + 1);
        render();
        return;
      }
      if (selectGroups && key.name === "right") {
        if (entry?.type === "group" && entry.collapsed) {
          collapsedGroups.delete(entry.group);
          render();
        }
        return;
      }
      if (selectGroups && key.name === "left") {
        const group = entry?.type === "group" ? entry.group : entry?.item.group;
        if (group) {
          collapsedGroups.add(group);
          cursor = buildSearchEntries(getFiltered(), selectGroups, collapsedGroups).findIndex((collapsedEntry) => collapsedEntry.type === "group" && collapsedEntry.group === group) + cursorOffset;
          render();
        }
        return;
      }
      if (key.name === "space") {
        if (hasSelectAll && cursor === 0)
          toggleAllItems(selected, items);
        else
          toggleSearchEntry(selected, entry);
        render();
        return;
      }
      if (key.name === "backspace") {
        query = query.slice(0, -1);
        cursor = 0;
        render();
        return;
      }
      if (searchable && key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
        query += key.sequence;
        cursor = 0;
        render();
        return;
      }
    };
    process.stdin.on("keypress", keypressHandler);
    rl.on("close", closeHandler);
    if (process.stdin.readableEnded || process.stdin.destroyed) {
      cancel2();
      return;
    }
    render();
  });
}
var DEFAULT_CLONE_TIMEOUT_MS = 300000;
var ALLOWED_GIT_PROTOCOLS = "https:http:ssh:git:file";
var CLONE_TIMEOUT_MS = (() => {
  const raw = process.env.SKILLS_CLONE_TIMEOUT_MS;
  if (!raw)
    return DEFAULT_CLONE_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLONE_TIMEOUT_MS;
})();
var execFileAsync = promisify(execFile);
function isCommitSha(ref) {
  return /^[0-9a-f]{40}$/i.test(ref);
}
function isMissingRefError(message) {
  return /Remote branch .* not found in upstream origin/i.test(message) || /couldn't find remote ref/i.test(message) || /upload-pack: not our ref/i.test(message);
}
async function cloneAtSha(url, sha, tempDir, extraEnv) {
  const git = createGitClient(extraEnv);
  await git.cwd(tempDir);
  await git.init();
  await git.addRemote("origin", url);
  await git.fetch([
    "--depth",
    "1",
    "origin",
    sha
  ]);
  await git.checkout("FETCH_HEAD");
}
var GitCloneError = class extends Error {
  url;
  isTimeout;
  isAuthError;
  constructor(message, url, isTimeout = false, isAuthError = false) {
    super(message);
    this.name = "GitCloneError";
    this.url = url;
    this.isTimeout = isTimeout;
    this.isAuthError = isAuthError;
  }
};
function parseGitHubRepoUrl(url) {
  const sshMatch = url.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch && isGitHubHost(sshMatch[1])) {
    const host = sshMatch[1];
    const owner = sshMatch[2];
    const repo = sshMatch[3];
    return {
      owner,
      repo,
      slug: `${owner}/${repo}`,
      sshUrl: `git@${host}:${owner}/${repo}.git`
    };
  }
  try {
    const parsed = new URL(url);
    if (!isGitHubHost(parsed.host))
      return null;
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (!match)
      return null;
    const owner = match[1];
    const repo = match[2];
    return {
      owner,
      repo,
      slug: `${owner}/${repo}`,
      sshUrl: `git@${parsed.host}:${owner}/${repo}.git`
    };
  } catch {
    return null;
  }
}
function isGitHubHttpsCloneUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isGitHubHost(parsed.host);
  } catch {
    return false;
  }
}
function isGitHubSsoAuthError(message) {
  const lower = message.toLowerCase();
  return lower.includes("saml sso") || lower.includes("enforced sso") || lower.includes("enabled or enforced saml") || lower.includes("re-authorize the oauth application");
}
function isAuthFailure(message) {
  return message.includes("Authentication failed") || message.includes("could not read Username") || message.includes("Permission denied") || message.includes("Repository not found") || message.includes("requested URL returned error: 403") || isGitHubSsoAuthError(message);
}
function createGitClient(extraEnv) {
  const git = esm_default({
    timeout: { block: CLONE_TIMEOUT_MS },
    config: [
      "filter.lfs.required=false",
      "filter.lfs.smudge=",
      "filter.lfs.clean=",
      "filter.lfs.process="
    ],
    unsafe: {
      allowUnsafeAlias: true,
      allowUnsafeAskPass: true,
      allowUnsafeConfigEnvCount: true,
      allowUnsafeConfigPaths: true,
      allowUnsafeCredentialHelper: true,
      allowUnsafeDiffExternal: true,
      allowUnsafeDiffTextConv: true,
      allowUnsafeEditor: true,
      allowUnsafeFilter: true,
      allowUnsafeFsMonitor: true,
      allowUnsafeGpgProgram: true,
      allowUnsafeGitProxy: true,
      allowUnsafeHooksPath: true,
      allowUnsafeMergeDriver: true,
      allowUnsafePack: true,
      allowUnsafePager: true,
      allowUnsafeProtocolOverride: true,
      allowUnsafeSshCommand: true,
      allowUnsafeTemplateDir: true
    }
  });
  git.env({
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_ALLOW_PROTOCOL: ALLOWED_GIT_PROTOCOLS,
    GIT_LFS_SKIP_SMUDGE: "1",
    LC_ALL: "C",
    ...extraEnv
  });
  return git;
}
async function resetTempDir(dir) {
  await rm(dir, {
    recursive: true,
    force: true
  }).catch(() => {});
  await mkdir(dir, { recursive: true });
}
async function tryGhClone(repo, tempDir, ref) {
  let cloneTarget = repo.slug;
  const host = repo.sshUrl.match(/^git@([^:]+):/)?.[1] || "github.com";
  try {
    const { stdout: stdout2, stderr } = await execFileAsync("gh", [
      "auth",
      "status",
      "-h",
      host
    ], {
      timeout: 5000,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0"
      }
    });
    const statusOutput = `${stdout2}${stderr}`;
    if (/Git operations protocol:\s+ssh/i.test(statusOutput))
      cloneTarget = repo.sshUrl;
  } catch {
    return false;
  }
  await execFileAsync("gh", [
    "repo",
    "clone",
    cloneTarget,
    tempDir,
    "--",
    ...ref ? [
      "--depth=1",
      "--branch",
      ref
    ] : ["--depth=1"]
  ], {
    timeout: CLONE_TIMEOUT_MS,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_ALLOW_PROTOCOL: ALLOWED_GIT_PROTOCOLS
    }
  });
  return true;
}
function buildGitHubAuthError(url, repo, message) {
  const host = repo?.sshUrl.match(/^git@([^:]+):/)?.[1] || "github.com";
  if (repo && isGitHubSsoAuthError(message))
    return `GitHub blocked HTTPS access to ${url} because the organization enforces SAML SSO.
  skills tried your existing git credentials and available fallbacks, but none succeeded.
  - Re-authorize your GitHub credentials/app for that org's SSO policy
  - Or rerun with SSH: npx skills add ${repo.sshUrl}
  - Verify access with: gh auth status -h ${host} or ssh -T git@${host}`;
  if (repo)
    return `Authentication failed for ${url}.
  - For private repos, ensure you have access
  - Retry with SSH: npx skills add ${repo.sshUrl}
  - Check access with: gh auth status -h ${host} or ssh -T git@${host}`;
  return `Authentication failed for ${url}.
  - For private repos, ensure you have access
  - For SSH: Check your keys with 'ssh -T git@github.com'
  - For HTTPS: Run 'gh auth login' or configure git credentials`;
}
async function cloneRepo(url, ref) {
  if (/^ext::/i.test(url))
    throw new GitCloneError("Unsupported Git transport: ext", url);
  const tempDir = await mkdtemp(join(tmpdir(), "skills-"));
  const cloneOptions = ref ? [
    "--depth",
    "1",
    "--branch",
    ref
  ] : ["--depth", "1"];
  const refCanBeSha = !!ref && isCommitSha(ref);
  const repo = parseGitHubRepoUrl(url);
  try {
    await createGitClient().clone(url, tempDir, cloneOptions);
    return tempDir;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (refCanBeSha && isMissingRefError(errorMessage))
      try {
        await resetTempDir(tempDir);
        await cloneAtSha(url, ref, tempDir);
        return tempDir;
      } catch {}
    const isTimeout = errorMessage.includes("block timeout") || errorMessage.includes("timed out");
    const isAuthError = isAuthFailure(errorMessage);
    if (isTimeout) {
      await rm(tempDir, {
        recursive: true,
        force: true
      }).catch(() => {});
      throw new GitCloneError(`Clone timed out after ${Math.round(CLONE_TIMEOUT_MS / 1000)}s. Common causes:
  - Large repository: raise the timeout with SKILLS_CLONE_TIMEOUT_MS=600000 (10m)
  - Slow network: retry, or clone manually and pass the local path to 'skills add'
  - Private repo without credentials: ensure auth is configured
      - For SSH: ssh-add -l (to check loaded keys)
      - For HTTPS: gh auth status (if using GitHub CLI)`, url, true, false);
    }
    if (isAuthError && repo && isGitHubHttpsCloneUrl(url)) {
      try {
        await resetTempDir(tempDir);
        if (await tryGhClone(repo, tempDir, ref))
          return tempDir;
      } catch {}
      try {
        await resetTempDir(tempDir);
        const sshEnv = { GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes" };
        try {
          await createGitClient(sshEnv).clone(repo.sshUrl, tempDir, cloneOptions);
        } catch (sshError) {
          const sshMessage = sshError instanceof Error ? sshError.message : String(sshError);
          if (refCanBeSha && isMissingRefError(sshMessage)) {
            await resetTempDir(tempDir);
            await cloneAtSha(repo.sshUrl, ref, tempDir, sshEnv);
          } else
            throw sshError;
        }
        return tempDir;
      } catch {}
    }
    await rm(tempDir, {
      recursive: true,
      force: true
    }).catch(() => {});
    if (isAuthError)
      throw new GitCloneError(buildGitHubAuthError(url, repo, errorMessage), url, false, true);
    throw new GitCloneError(`Failed to clone ${url}: ${errorMessage}`, url, false, false);
  }
}
async function getGitTreeHash(repoDir, skillPath) {
  const segments = skillPath.replace(/\\/g, "/").split("/");
  segments.pop();
  const folderPath = segments.join("/");
  const revision = folderPath ? `HEAD:${folderPath}` : "HEAD^{tree}";
  try {
    const hash = (await new Promise((resolve2, reject) => {
      execFile("git", [
        "-C",
        repoDir,
        "rev-parse",
        "--verify",
        "--end-of-options",
        revision
      ], {
        encoding: "utf8",
        timeout: CLONE_TIMEOUT_MS,
        env: {
          ...process.env,
          GIT_OPTIONAL_LOCKS: "0",
          GIT_TERMINAL_PROMPT: "0"
        }
      }, (error, output) => {
        if (error)
          reject(error);
        else
          resolve2(output);
      });
    })).trim();
    return /^[0-9a-f]{40}$/i.test(hash) ? hash.toLowerCase() : null;
  } catch {
    return null;
  }
}
async function cleanupTempDir(dir) {
  const normalizedDir = normalize2(resolve(dir));
  const normalizedTmpDir = normalize2(resolve(tmpdir()));
  if (!normalizedDir.startsWith(normalizedTmpDir + sep) && normalizedDir !== normalizedTmpDir)
    throw new Error("Attempted to clean up directory outside of temp directory");
  await rm(dir, {
    recursive: true,
    force: true
  });
}
function parseFrontmatter(raw) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match)
    return {
      data: {},
      content: raw
    };
  return {
    data: $parse(match[1]) ?? {},
    content: match[2] ?? ""
  };
}
function isContainedIn(targetPath, basePath) {
  const normalizedBase = normalize2(resolve(basePath));
  const normalizedTarget = normalize2(resolve(targetPath));
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
function isValidRelativePath(path2) {
  return path2.startsWith("./");
}
async function getPluginSkillPaths(basePath) {
  const searchDirs = [];
  const addPluginSkillPaths = (pluginBase, skills) => {
    if (!isContainedIn(pluginBase, basePath))
      return;
    if (skills && skills.length > 0)
      for (const skillPath of skills) {
        if (!isValidRelativePath(skillPath))
          continue;
        const skillDir = dirname(join(pluginBase, skillPath));
        if (isContainedIn(skillDir, basePath))
          searchDirs.push(skillDir);
      }
    searchDirs.push(join(pluginBase, "skills"));
  };
  try {
    const content = await readFile(join(basePath, ".claude-plugin/marketplace.json"), "utf-8");
    const manifest = JSON.parse(content);
    const pluginRoot = manifest.metadata?.pluginRoot;
    if (pluginRoot === undefined || isValidRelativePath(pluginRoot))
      for (const plugin of manifest.plugins ?? []) {
        if (typeof plugin.source !== "string" && plugin.source !== undefined)
          continue;
        if (plugin.source !== undefined && !isValidRelativePath(plugin.source))
          continue;
        addPluginSkillPaths(join(basePath, pluginRoot ?? "", plugin.source ?? ""), plugin.skills);
      }
  } catch {}
  try {
    const content = await readFile(join(basePath, ".claude-plugin/plugin.json"), "utf-8");
    addPluginSkillPaths(basePath, JSON.parse(content).skills);
  } catch {}
  return searchDirs;
}
async function getPluginGroupings(basePath) {
  const groupings = /* @__PURE__ */ new Map;
  try {
    const content = await readFile(join(basePath, ".claude-plugin/marketplace.json"), "utf-8");
    const manifest = JSON.parse(content);
    const pluginRoot = manifest.metadata?.pluginRoot;
    if (pluginRoot === undefined || isValidRelativePath(pluginRoot))
      for (const plugin of manifest.plugins ?? []) {
        if (!plugin.name)
          continue;
        if (typeof plugin.source !== "string" && plugin.source !== undefined)
          continue;
        if (plugin.source !== undefined && !isValidRelativePath(plugin.source))
          continue;
        const pluginBase = join(basePath, pluginRoot ?? "", plugin.source ?? "");
        if (!isContainedIn(pluginBase, basePath))
          continue;
        if (plugin.skills && plugin.skills.length > 0)
          for (const skillPath of plugin.skills) {
            if (!isValidRelativePath(skillPath))
              continue;
            const skillDir = join(pluginBase, skillPath);
            if (isContainedIn(skillDir, basePath))
              groupings.set(resolve(skillDir), plugin.name);
          }
      }
  } catch {}
  try {
    const content = await readFile(join(basePath, ".claude-plugin/plugin.json"), "utf-8");
    const manifest = JSON.parse(content);
    if (manifest.name && manifest.skills && manifest.skills.length > 0)
      for (const skillPath of manifest.skills) {
        if (!isValidRelativePath(skillPath))
          continue;
        const skillDir = join(basePath, skillPath);
        if (isContainedIn(skillDir, basePath))
          groupings.set(resolve(skillDir), manifest.name);
      }
  } catch {}
  return groupings;
}
var SKILLS_SH_CONFIG_FILE = "skills.sh.json";
function parseSkillsShPaths(content) {
  let config;
  try {
    config = JSON.parse(content);
  } catch {
    return [];
  }
  if (typeof config !== "object" || config === null || Array.isArray(config))
    return [];
  const paths = config.paths;
  if (!Array.isArray(paths))
    return [];
  const result = [];
  for (const entry of paths) {
    if (typeof entry !== "string" || !entry.startsWith("./"))
      continue;
    if (entry.includes("\\"))
      continue;
    const normalized = posix.normalize(entry).replace(/\/+$/, "");
    if (normalized === "." || normalized === "" || normalized === "..")
      continue;
    if (normalized.startsWith("../") || posix.isAbsolute(normalized))
      continue;
    if (!result.includes(normalized))
      result.push(normalized);
  }
  return result;
}
async function getSkillsShSearchDirs(basePath) {
  let content;
  try {
    content = await readFile(join(basePath, SKILLS_SH_CONFIG_FILE), "utf-8");
  } catch {
    return [];
  }
  return parseSkillsShPaths(content).map((path2) => join(basePath, path2));
}
var LOCAL_LOCK_FILE = "skills-lock.json";
var CURRENT_VERSION$1 = 1;
function getLocalLockPath(cwd) {
  return join(cwd || process.cwd(), LOCAL_LOCK_FILE);
}
var InvalidLocalLockError = class extends Error {
  constructor(lockPath, reason) {
    super(`Invalid ${lockPath}: ${reason}. Fix or delete the file, then retry.`);
    this.name = "InvalidLocalLockError";
  }
};
async function readLocalLock(cwd) {
  const lockDir = cwd || process.cwd();
  const lockPath = getLocalLockPath(lockDir);
  let content;
  try {
    content = await readFile(lockPath, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return createEmptyLocalLock();
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new InvalidLocalLockError(lockPath, error instanceof Error ? error.message : "not valid JSON");
  }
  if (!isLocalLockShape(parsed))
    throw new InvalidLocalLockError(lockPath, 'expected an object with "version" and "skills"');
  if (parsed.version !== CURRENT_VERSION$1)
    throw new InvalidLocalLockError(lockPath, `unsupported lock version ${parsed.version} (expected ${CURRENT_VERSION$1})`);
  for (const entry of Object.values(parsed.skills))
    if (entry.sourceType === "local" && !isAbsolute(entry.source))
      entry.source = resolve(lockDir, entry.source);
  return parsed;
}
function isLocalLockShape(value) {
  return typeof value === "object" && value !== null && "version" in value && typeof value.version === "number" && "skills" in value && typeof value.skills === "object" && value.skills !== null;
}
async function writeLocalLock(lock, cwd) {
  const lockDir = cwd || process.cwd();
  const lockPath = getLocalLockPath(lockDir);
  const sortedSkills = Object.fromEntries(Object.keys(lock.skills).sort().map((key) => {
    const entry = lock.skills[key];
    return [key, entry.sourceType === "local" ? {
      ...entry,
      source: getPortableLocalSource(entry.source, lockDir)
    } : entry];
  }));
  const sorted2 = {
    version: lock.version,
    skills: sortedSkills
  };
  await writeFile(lockPath, JSON.stringify(sorted2, null, 2) + `
`, "utf-8");
}
function getPortableLocalSource(source, lockDir) {
  const absoluteSource = isAbsolute(source) ? source : resolve(lockDir, source);
  const relativeSource = relative(lockDir, absoluteSource);
  if (isAbsolute(relativeSource))
    return absoluteSource.split(sep).join("/");
  const portableSource = relativeSource.split(sep).join("/");
  if (!portableSource)
    return ".";
  if (portableSource === ".." || portableSource.startsWith("../"))
    return portableSource;
  return `./${portableSource}`;
}
async function computeSkillFolderHash(skillDir) {
  const files = [];
  await collectFiles(skillDir, skillDir, files);
  files.sort((a2, b3) => a2.relativePath.localeCompare(b3.relativePath));
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update(file.content);
  }
  return hash.digest("hex");
}
async function collectFiles(baseDir, currentDir, results) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules")
        return;
      await collectFiles(baseDir, fullPath, results);
    } else if (entry.isFile()) {
      const content = await readFile(fullPath);
      const relativePath = relative(baseDir, fullPath).split("\\").join("/");
      results.push({
        relativePath,
        content
      });
    }
  }));
}
async function addSkillToLocalLock(skillName, entry, cwd) {
  const lock = await readLocalLock(cwd);
  lock.skills = {
    ...lock.skills,
    [skillName]: entry
  };
  await writeLocalLock(lock, cwd);
}
function lockChangeReason(lock, skillName, entry) {
  const locked = lock.skills[skillName];
  if (!locked)
    return `${skillName} is not in skills-lock.json`;
  if (locked.computedHash !== entry.computedHash)
    return `${skillName} has changed since skills-lock.json was written`;
  if (locked.version !== entry.version)
    return `${skillName} comes from version ${entry.version ?? "unknown"}, skills-lock.json has ${locked.version ?? "unknown"}`;
  return null;
}
function frozenLockfileError(changes) {
  return [
    "Cannot install with --frozen-lockfile because skills-lock.json is not up to date:",
    ...changes.map((change) => `  ${change}`),
    "Run again with --no-frozen-lockfile to update it."
  ].join(`
`);
}
async function removeSkillFromLocalLock(skillName, cwd) {
  const lock = await readLocalLock(cwd);
  if (!Object.hasOwn(lock.skills, skillName))
    return false;
  delete lock.skills[skillName];
  await writeLocalLock(lock, cwd);
  return true;
}
function createEmptyLocalLock() {
  return {
    version: CURRENT_VERSION$1,
    skills: {}
  };
}
var AGENTS_DIR$1 = ".agents";
var SKILLS_SUBDIR = "skills";
var SKIP_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__"
];
var AGENT_PROJECT_SKILL_DIRS = [
  ".agents/skills",
  ".claude/skills",
  ".cline/skills",
  ".codebuddy/skills",
  ".codex/skills",
  ".commandcode/skills",
  ".continue/skills",
  ".factory/skills",
  ".github/skills",
  ".goose/skills",
  ".grok/skills",
  ".iflow/skills",
  ".junie/skills",
  ".kilo/skills",
  ".kilocode/skills",
  ".kimchi/skills",
  ".kiro/skills",
  ".minimax/skills",
  ".mux/skills",
  ".neovate/skills",
  ".opencode/skills",
  ".openhands/skills",
  ".pi/skills",
  ".posit/assistant/skills",
  ".qoder/skills",
  ".roo/skills",
  ".trae/skills",
  ".windsurf/skills",
  ".zcode/skills",
  ".zencoder/skills"
];
function normalizeSkillName$1(name) {
  return name.toLowerCase().replace(/[\s_]+/g, "-");
}
function normalizeRelativePath(path2) {
  return path2.split(sep).join("/").replace(/\/+/g, "/");
}
function isRecord$1(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function shouldInstallInternalSkills() {
  const envValue = process.env.INSTALL_INTERNAL_SKILLS;
  return envValue === "1" || envValue === "true";
}
async function hasSkillMd(dir) {
  try {
    return (await stat(join(dir, "SKILL.md"))).isFile();
  } catch {
    return false;
  }
}
function warnSkippedSkill(skillMdPath, reason) {
  console.warn(`⚠ Skipped ${sanitizeMetadata(skillMdPath)} — ${stripTerminalEscapes(reason)}`);
}
async function parseSkillMd(skillMdPath, options) {
  let content;
  try {
    content = await readFile(skillMdPath, "utf-8");
  } catch (err) {
    warnSkippedSkill(skillMdPath, `failed to read file: ${err.message}`);
    return null;
  }
  let data;
  try {
    ({ data } = parseFrontmatter(content));
  } catch (err) {
    warnSkippedSkill(skillMdPath, `YAML parse error: ${err.message}`);
    return null;
  }
  if (!data.name || !data.description) {
    const missing = [];
    if (!data.name)
      missing.push("name");
    if (!data.description)
      missing.push("description");
    warnSkippedSkill(skillMdPath, `missing required frontmatter field(s): ${missing.join(", ")}`);
    return null;
  }
  if (typeof data.name !== "string" || typeof data.description !== "string") {
    warnSkippedSkill(skillMdPath, `frontmatter "name" and "description" must be strings (got ${typeof data.name} and ${typeof data.description})`);
    return null;
  }
  const name = sanitizeMetadata(data.name);
  const description = sanitizeMetadata(data.description);
  if (!name || !description) {
    const empty = [];
    if (!name)
      empty.push("name");
    if (!description)
      empty.push("description");
    warnSkippedSkill(skillMdPath, `empty required frontmatter field(s): ${empty.join(", ")}`);
    return null;
  }
  const metadata = isRecord$1(data.metadata) ? data.metadata : undefined;
  if (metadata?.internal === true && !shouldInstallInternalSkills() && !options?.includeInternal)
    return null;
  return {
    name,
    description,
    path: dirname(skillMdPath),
    rawContent: content,
    metadata
  };
}
async function findSkillDirs(dir, depth = 0, maxDepth = 5) {
  if (depth > maxDepth)
    return [];
  try {
    const [hasSkill, entries] = await Promise.all([hasSkillMd(dir), readdir(dir, { withFileTypes: true }).catch(() => [])]);
    const currentDir = hasSkill ? [dir] : [];
    const subDirResults = await Promise.all(entries.filter((entry) => entry.isDirectory() && !SKIP_DIRS.includes(entry.name)).map((entry) => findSkillDirs(join(dir, entry.name), depth + 1, maxDepth)));
    return [...currentDir, ...subDirResults.flat()];
  } catch {
    return [];
  }
}
function isSubpathSafe(basePath, subpath) {
  const normalizedBase = normalize2(resolve(basePath));
  const normalizedTarget = normalize2(resolve(join(basePath, subpath)));
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
async function sourceLockedSkillNames(basePath) {
  try {
    return Object.keys((await readLocalLock(basePath)).skills);
  } catch (error) {
    if (error instanceof InvalidLocalLockError)
      return [];
    throw error;
  }
}
async function discoverSkills(basePath, subpath, options) {
  const skills = [];
  const seenNames = /* @__PURE__ */ new Set;
  const parsedSkillPaths = /* @__PURE__ */ new Set;
  const lockedSkillNames = new Set((await sourceLockedSkillNames(basePath)).map(normalizeSkillName$1));
  if (subpath && !isSubpathSafe(basePath, subpath))
    throw new Error(`Invalid subpath: "${subpath}" resolves outside the repository directory. Subpath must not contain ".." segments that escape the base path.`);
  const searchPath = subpath ? join(basePath, subpath) : basePath;
  const pluginGroupings = await getPluginGroupings(searchPath);
  const enhanceSkill = (skill) => {
    const resolvedPath = resolve(skill.path);
    if (pluginGroupings.has(resolvedPath))
      skill.pluginName = pluginGroupings.get(resolvedPath);
    return skill;
  };
  const isInstalledProjectSkill = (skill) => {
    if (lockedSkillNames.size === 0)
      return false;
    const relativeDir = normalizeRelativePath(relative(basePath, skill.path));
    if (!AGENT_PROJECT_SKILL_DIRS.some((dir) => relativeDir === dir || relativeDir.startsWith(`${dir}/`)))
      return false;
    const skillName = normalizeSkillName$1(skill.name);
    const directoryName = normalizeSkillName$1(basename(skill.path));
    return lockedSkillNames.has(skillName) || lockedSkillNames.has(directoryName);
  };
  const parseSkillAt = async (skillDir) => {
    const skillMdPath = resolve(skillDir, "SKILL.md");
    if (parsedSkillPaths.has(skillMdPath))
      return null;
    parsedSkillPaths.add(skillMdPath);
    return parseSkillMd(skillMdPath, options);
  };
  if (await hasSkillMd(searchPath)) {
    let skill = await parseSkillAt(searchPath);
    if (skill) {
      if (!isInstalledProjectSkill(skill)) {
        skill = enhanceSkill(skill);
        skills.push(skill);
        seenNames.add(skill.name);
        if (!options?.fullDepth)
          return skills;
      }
    }
  }
  const prioritySearchDirs = [
    searchPath,
    join(searchPath, "skills"),
    join(searchPath, "skills/.curated"),
    join(searchPath, "skills/.experimental"),
    join(searchPath, "skills/.system"),
    ...AGENT_PROJECT_SKILL_DIRS.map((dir) => join(searchPath, dir))
  ];
  prioritySearchDirs.push(...await getSkillsShSearchDirs(searchPath));
  const deepContainerDirs = new Set(prioritySearchDirs.slice(1));
  prioritySearchDirs.push(...await getPluginSkillPaths(searchPath));
  const tryAddSkillAt = async (skillDir) => {
    if (!await hasSkillMd(skillDir))
      return false;
    let skill = await parseSkillAt(skillDir);
    if (!skill || !options?.includeDuplicateNames && seenNames.has(skill.name))
      return true;
    if (isInstalledProjectSkill(skill))
      return true;
    skill = enhanceSkill(skill);
    skills.push(skill);
    seenNames.add(skill.name);
    return true;
  };
  const walkSkillDirs = async (dir, maxDepth, depth = 1) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory())
          continue;
        const childDir = join(dir, entry.name);
        if (await tryAddSkillAt(childDir) || depth >= maxDepth || SKIP_DIRS.includes(entry.name))
          continue;
        await walkSkillDirs(childDir, maxDepth, depth + 1);
      }
    } catch {}
  };
  for (const dir of prioritySearchDirs)
    await walkSkillDirs(dir, deepContainerDirs.has(dir) ? 3 : 1);
  if (skills.length === 0 || options?.fullDepth) {
    const allSkillDirs = await findSkillDirs(searchPath);
    for (const skillDir of allSkillDirs) {
      let skill = await parseSkillAt(skillDir);
      if (skill && (options?.includeDuplicateNames || !seenNames.has(skill.name)) && !isInstalledProjectSkill(skill)) {
        skill = enhanceSkill(skill);
        skills.push(skill);
        seenNames.add(skill.name);
      }
    }
  }
  return skills;
}
function getSkillDisplayName(skill) {
  return skill.name || basename(skill.path);
}
function filterSkills(skills, inputNames) {
  const selected = /* @__PURE__ */ new Set;
  for (const input of inputNames) {
    const exact = skills.filter((skill) => getSkillDisplayName(skill).toLowerCase() === input.toLowerCase());
    const matches = exact.length ? exact : skills.filter((skill) => normalizeSkillName$1(getSkillDisplayName(skill)) === normalizeSkillName$1(input));
    for (const skill of matches)
      selected.add(skill);
  }
  return skills.filter((skill) => selected.has(skill));
}
var home = homedir();
var configHome = xdgConfig ?? join(home, ".config");
var codexHome = process.env.CODEX_HOME?.trim() || join(home, ".codex");
var claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, ".claude");
var vibeHome = process.env.VIBE_HOME?.trim() || join(home, ".vibe");
var hermesHome = process.env.HERMES_HOME?.trim() || join(home, ".hermes");
var autohandHome = process.env.AUTOHAND_HOME?.trim() || join(home, ".autohand");
var grokHome = process.env.GROK_HOME?.trim() || join(home, ".grok");
var sarvamHome = process.env.SARVAM_HOME?.trim() || join(home, ".sarvam");
var reasonixHome = process.env.REASONIX_HOME?.trim() || (platform() === "win32" ? join(process.env.APPDATA?.trim() || join(home, "AppData", "Roaming"), "reasonix") : join(home, ".reasonix"));
var zedAppDataHome = process.env.APPDATA?.trim();
var zedFlatpakConfigHome = process.env.FLATPAK_XDG_CONFIG_HOME?.trim();
function packageJsonHasDependency(packageJsonPath, dependencyName) {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return !!(packageJson.dependencies?.[dependencyName] || packageJson.devDependencies?.[dependencyName]);
  } catch {
    return false;
  }
}
function getOpenClawGlobalSkillsDir(homeDir = home, pathExists = existsSync) {
  if (pathExists(join(homeDir, ".openclaw")))
    return join(homeDir, ".openclaw/skills");
  if (pathExists(join(homeDir, ".clawdbot")))
    return join(homeDir, ".clawdbot/skills");
  if (pathExists(join(homeDir, ".moltbot")))
    return join(homeDir, ".moltbot/skills");
  return join(homeDir, ".openclaw/skills");
}
function isZCodeInstalled(homeDir = home, pathExists = existsSync) {
  return pathExists(join(homeDir, ".zcode")) || pathExists("/Applications/ZCode.app");
}
function isKimchiInstalled(homeDir = home, pathExists = existsSync) {
  return pathExists(join(homeDir, ".config", "kimchi"));
}
function isMiniMaxCodeInstalled(homeDir = home, pathExists = existsSync) {
  return pathExists(join(homeDir, ".minimax")) || pathExists("/Applications/MiniMax Code.app");
}
function isPositAssistantInstalled(homeDir = home, pathExists = existsSync) {
  return pathExists(join(homeDir, ".posit/assistant")) || pathExists(join(homeDir, ".positai"));
}
var agents = {
  "aider-desk": {
    name: "aider-desk",
    displayName: "AiderDesk",
    skillsDir: ".aider-desk/skills",
    globalSkillsDir: join(home, ".aider-desk/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".aider-desk"));
    }
  },
  amp: {
    name: "amp",
    displayName: "Amp",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(configHome, "agents/skills"),
    detectInstalled: async () => {
      return existsSync(join(configHome, "amp"));
    }
  },
  antigravity: {
    name: "antigravity",
    displayName: "Antigravity",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".gemini/antigravity/skills"),
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(join(home, ".gemini/antigravity"));
    }
  },
  "antigravity-cli": {
    name: "antigravity-cli",
    displayName: "Antigravity CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".gemini/antigravity-cli/skills"),
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(join(home, ".gemini/antigravity-cli"));
    }
  },
  astrbot: {
    name: "astrbot",
    displayName: "AstrBot",
    skillsDir: "data/skills",
    globalSkillsDir: join(home, ".astrbot/data/skills"),
    detectInstalled: async () => {
      return existsSync(join(process.cwd(), "data/skills")) || existsSync(join(home, ".astrbot"));
    }
  },
  "autohand-code": {
    name: "autohand-code",
    displayName: "Autohand Code CLI",
    skillsDir: ".autohand/skills",
    globalSkillsDir: join(autohandHome, "skills"),
    detectInstalled: async () => {
      return existsSync(autohandHome);
    }
  },
  augment: {
    name: "augment",
    displayName: "Augment",
    skillsDir: ".augment/skills",
    globalSkillsDir: join(home, ".augment/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".augment"));
    }
  },
  bob: {
    name: "bob",
    displayName: "IBM Bob",
    skillsDir: ".bob/skills",
    globalSkillsDir: join(home, ".bob/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".bob"));
    }
  },
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: join(claudeHome, "skills"),
    createProjectSkillsDirByDefault: true,
    detectInstalled: async () => {
      return existsSync(claudeHome);
    }
  },
  openclaw: {
    name: "openclaw",
    displayName: "OpenClaw",
    skillsDir: "skills",
    globalSkillsDir: getOpenClawGlobalSkillsDir(),
    detectInstalled: async () => {
      return existsSync(join(home, ".openclaw")) || existsSync(join(home, ".clawdbot")) || existsSync(join(home, ".moltbot"));
    }
  },
  cline: {
    name: "cline",
    displayName: "Cline",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents", "skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".cline"));
    }
  },
  "codearts-agent": {
    name: "codearts-agent",
    displayName: "CodeArts Agent",
    skillsDir: ".codeartsdoer/skills",
    globalSkillsDir: join(home, ".codeartsdoer/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".codeartsdoer"));
    }
  },
  codebuddy: {
    name: "codebuddy",
    displayName: "CodeBuddy",
    skillsDir: ".codebuddy/skills",
    globalSkillsDir: join(home, ".codebuddy/skills"),
    detectInstalled: async () => {
      return existsSync(join(process.cwd(), ".codebuddy")) || existsSync(join(home, ".codebuddy"));
    }
  },
  codemaker: {
    name: "codemaker",
    displayName: "Codemaker",
    skillsDir: ".codemaker/skills",
    globalSkillsDir: join(home, ".codemaker/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".codemaker"));
    }
  },
  codestudio: {
    name: "codestudio",
    displayName: "Code Studio",
    skillsDir: ".codestudio/skills",
    globalSkillsDir: join(home, ".codestudio/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".codestudio"));
    }
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents", "skills"),
    detectInstalled: async () => {
      return existsSync(codexHome) || existsSync("/etc/codex");
    }
  },
  "command-code": {
    name: "command-code",
    displayName: "Command Code",
    skillsDir: ".commandcode/skills",
    globalSkillsDir: join(home, ".commandcode/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".commandcode"));
    }
  },
  continue: {
    name: "continue",
    displayName: "Continue",
    skillsDir: ".continue/skills",
    globalSkillsDir: join(home, ".continue/skills"),
    detectInstalled: async () => {
      return existsSync(join(process.cwd(), ".continue")) || existsSync(join(home, ".continue"));
    }
  },
  cortex: {
    name: "cortex",
    displayName: "Cortex Code",
    skillsDir: ".cortex/skills",
    globalSkillsDir: join(home, ".snowflake/cortex/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".snowflake/cortex"));
    }
  },
  crush: {
    name: "crush",
    displayName: "Crush",
    skillsDir: ".crush/skills",
    globalSkillsDir: join(home, ".config/crush/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".config/crush"));
    }
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".cursor/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".cursor"));
    }
  },
  deepagents: {
    name: "deepagents",
    displayName: "Deep Agents",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".deepagents/agent/skills"),
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(join(home, ".deepagents"));
    }
  },
  devin: {
    name: "devin",
    displayName: "Devin for Terminal",
    skillsDir: ".devin/skills",
    globalSkillsDir: join(configHome, "devin/skills"),
    detectInstalled: async () => {
      return existsSync(join(configHome, "devin"));
    }
  },
  dexto: {
    name: "dexto",
    displayName: "Dexto",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(join(home, ".dexto"));
    }
  },
  droid: {
    name: "droid",
    displayName: "Droid",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".factory/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".factory"));
    }
  },
  eve: {
    name: "eve",
    displayName: "Eve",
    skillsDir: "agent/skills",
    globalSkillsDir: undefined,
    detectInstalled: async () => {
      const cwd = process.cwd();
      return existsSync(join(cwd, "agent")) && packageJsonHasDependency(join(cwd, "package.json"), "eve");
    }
  },
  firebender: {
    name: "firebender",
    displayName: "Firebender",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".firebender/skills"),
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(join(home, ".firebender"));
    }
  },
  forgecode: {
    name: "forgecode",
    displayName: "ForgeCode",
    skillsDir: ".forge/skills",
    globalSkillsDir: join(home, ".forge/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".forge"));
    }
  },
  fx: {
    name: "fx",
    displayName: "fx",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".fx"));
    }
  },
  "gemini-cli": {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".gemini/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".gemini"));
    }
  },
  "github-copilot": {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".copilot/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".copilot"));
    }
  },
  goose: {
    name: "goose",
    displayName: "Goose",
    skillsDir: ".goose/skills",
    globalSkillsDir: join(configHome, "goose/skills"),
    detectInstalled: async () => {
      return existsSync(join(configHome, "goose"));
    }
  },
  grok: {
    name: "grok",
    displayName: "Grok Build",
    skillsDir: ".grok/skills",
    globalSkillsDir: join(grokHome, "skills"),
    detectInstalled: async () => {
      return existsSync(grokHome);
    }
  },
  "hermes-agent": {
    name: "hermes-agent",
    displayName: "Hermes Agent",
    skillsDir: ".hermes/skills",
    globalSkillsDir: join(hermesHome, "skills"),
    detectInstalled: async () => {
      return existsSync(hermesHome);
    }
  },
  "inference-sh": {
    name: "inference-sh",
    displayName: "inference.sh",
    skillsDir: ".inferencesh/skills",
    globalSkillsDir: join(home, ".inferencesh/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".inferencesh"));
    }
  },
  jazz: {
    name: "jazz",
    displayName: "Jazz",
    skillsDir: ".jazz/skills",
    globalSkillsDir: join(home, ".jazz/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".jazz")) || existsSync(join(process.cwd(), ".jazz"));
    }
  },
  junie: {
    name: "junie",
    displayName: "Junie",
    skillsDir: ".junie/skills",
    globalSkillsDir: join(home, ".junie/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".junie"));
    }
  },
  "iflow-cli": {
    name: "iflow-cli",
    displayName: "iFlow CLI",
    skillsDir: ".iflow/skills",
    globalSkillsDir: join(home, ".iflow/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".iflow"));
    }
  },
  kilo: {
    name: "kilo",
    displayName: "Kilo Code",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".kilo/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".kilo")) || existsSync(join(home, ".kilocode"));
    }
  },
  kimchi: {
    name: "kimchi",
    displayName: "Kimchi",
    skillsDir: ".kimchi/skills",
    globalSkillsDir: join(home, ".config", "kimchi", "harness", "skills"),
    detectInstalled: async () => {
      return isKimchiInstalled();
    }
  },
  "kimi-code-cli": {
    name: "kimi-code-cli",
    displayName: "Kimi Code CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".kimi-code")) || existsSync(join(home, ".kimi"));
    }
  },
  "kiro-cli": {
    name: "kiro-cli",
    displayName: "Kiro CLI",
    skillsDir: ".kiro/skills",
    globalSkillsDir: join(home, ".kiro/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".kiro"));
    }
  },
  kode: {
    name: "kode",
    displayName: "Kode",
    skillsDir: ".kode/skills",
    globalSkillsDir: join(home, ".kode/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".kode"));
    }
  },
  lingma: {
    name: "lingma",
    displayName: "Lingma",
    skillsDir: ".lingma/skills",
    globalSkillsDir: join(home, ".lingma/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".lingma"));
    }
  },
  loaf: {
    name: "loaf",
    displayName: "Loaf",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(join(home, ".loaf"));
    }
  },
  mcpjam: {
    name: "mcpjam",
    displayName: "MCPJam",
    skillsDir: ".mcpjam/skills",
    globalSkillsDir: join(home, ".mcpjam/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".mcpjam"));
    }
  },
  "minimax-code": {
    name: "minimax-code",
    displayName: "MiniMax Code",
    skillsDir: ".minimax/skills",
    globalSkillsDir: join(home, ".minimax/skills"),
    detectInstalled: async () => {
      return isMiniMaxCodeInstalled();
    }
  },
  "mistral-vibe": {
    name: "mistral-vibe",
    displayName: "Mistral Vibe",
    skillsDir: ".vibe/skills",
    globalSkillsDir: join(vibeHome, "skills"),
    detectInstalled: async () => {
      return existsSync(vibeHome);
    }
  },
  moxby: {
    name: "moxby",
    displayName: "Moxby",
    skillsDir: ".moxby/skills",
    globalSkillsDir: join(home, ".moxby/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".moxby"));
    }
  },
  mux: {
    name: "mux",
    displayName: "Mux",
    skillsDir: ".mux/skills",
    globalSkillsDir: join(home, ".mux/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".mux"));
    }
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(configHome, "opencode/skills"),
    detectInstalled: async () => {
      return existsSync(join(configHome, "opencode"));
    }
  },
  openhands: {
    name: "openhands",
    displayName: "OpenHands",
    skillsDir: ".openhands/skills",
    globalSkillsDir: join(home, ".openhands/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".openhands"));
    }
  },
  ona: {
    name: "ona",
    displayName: "Ona",
    skillsDir: ".ona/skills",
    globalSkillsDir: join(home, ".ona/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".ona"));
    }
  },
  pi: {
    name: "pi",
    displayName: "Pi",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".pi/agent"));
    }
  },
  "posit-assistant": {
    name: "posit-assistant",
    displayName: "Posit Assistant",
    skillsDir: ".posit/assistant/skills",
    globalSkillsDir: join(home, ".posit/assistant/skills"),
    detectInstalled: async () => {
      return isPositAssistantInstalled();
    }
  },
  qoder: {
    name: "qoder",
    displayName: "Qoder",
    skillsDir: ".qoder/skills",
    globalSkillsDir: join(home, ".qoder/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".qoder"));
    }
  },
  "qoder-cn": {
    name: "qoder-cn",
    displayName: "Qoder CN",
    skillsDir: ".qoder/skills",
    globalSkillsDir: join(home, ".qoder-cn/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".qoder-cn"));
    }
  },
  "qwen-code": {
    name: "qwen-code",
    displayName: "Qwen Code",
    skillsDir: ".qwen/skills",
    globalSkillsDir: join(home, ".qwen/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".qwen"));
    }
  },
  replit: {
    name: "replit",
    displayName: "Replit",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(configHome, "agents/skills"),
    showInUniversalList: false,
    detectInstalled: async () => {
      return existsSync(join(process.cwd(), ".replit"));
    }
  },
  reasonix: {
    name: "reasonix",
    displayName: "Reasonix",
    skillsDir: ".reasonix/skills",
    globalSkillsDir: join(reasonixHome, "skills"),
    detectInstalled: async () => {
      return existsSync(reasonixHome);
    }
  },
  rovodev: {
    name: "rovodev",
    displayName: "Rovo Dev",
    skillsDir: ".rovodev/skills",
    globalSkillsDir: join(home, ".rovodev/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".rovodev"));
    }
  },
  roo: {
    name: "roo",
    displayName: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: join(home, ".roo/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".roo"));
    }
  },
  "sarvam-code": {
    name: "sarvam-code",
    displayName: "Sarvam Code",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(sarvamHome);
    }
  },
  "tabnine-cli": {
    name: "tabnine-cli",
    displayName: "Tabnine CLI",
    skillsDir: ".tabnine/agent/skills",
    globalSkillsDir: join(home, ".tabnine/agent/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".tabnine"));
    }
  },
  terramind: {
    name: "terramind",
    displayName: "Terramind",
    skillsDir: ".terramind/skills",
    globalSkillsDir: join(home, ".terramind/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".terramind"));
    }
  },
  tinycloud: {
    name: "tinycloud",
    displayName: "Tinycloud",
    skillsDir: ".tinycloud/skills",
    globalSkillsDir: join(home, ".tinycloud/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".tinycloud"));
    }
  },
  trae: {
    name: "trae",
    displayName: "Trae",
    skillsDir: ".trae/skills",
    globalSkillsDir: join(home, ".trae/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".trae"));
    }
  },
  "trae-cn": {
    name: "trae-cn",
    displayName: "Trae CN",
    skillsDir: ".trae/skills",
    globalSkillsDir: join(home, ".trae-cn/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".trae-cn"));
    }
  },
  warp: {
    name: "warp",
    displayName: "Warp",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".warp"));
    }
  },
  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: join(home, ".codeium/windsurf/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".codeium/windsurf"));
    }
  },
  zed: {
    name: "zed",
    displayName: "Zed",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: async () => {
      return existsSync(join(configHome, "zed")) || !!zedAppDataHome && existsSync(join(zedAppDataHome, "Zed")) || !!zedFlatpakConfigHome && existsSync(join(zedFlatpakConfigHome, "zed"));
    }
  },
  zcode: {
    name: "zcode",
    displayName: "ZCode",
    skillsDir: ".zcode/skills",
    globalSkillsDir: join(home, ".zcode/skills"),
    detectInstalled: async () => {
      return isZCodeInstalled();
    }
  },
  zencoder: {
    name: "zencoder",
    displayName: "Zencoder",
    skillsDir: ".zencoder/skills",
    globalSkillsDir: join(home, ".zencoder/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".zencoder"));
    }
  },
  zenflow: {
    name: "zenflow",
    displayName: "Zenflow",
    skillsDir: ".zencoder/skills",
    globalSkillsDir: join(home, ".zencoder/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".zencoder"));
    }
  },
  neovate: {
    name: "neovate",
    displayName: "Neovate",
    skillsDir: ".neovate/skills",
    globalSkillsDir: join(home, ".neovate/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".neovate"));
    }
  },
  pochi: {
    name: "pochi",
    displayName: "Pochi",
    skillsDir: ".pochi/skills",
    globalSkillsDir: join(home, ".pochi/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".pochi"));
    }
  },
  promptscript: {
    name: "promptscript",
    displayName: "PromptScript",
    skillsDir: ".agents/skills",
    globalSkillsDir: undefined,
    showInUniversalPrompt: false,
    detectInstalled: async () => {
      return existsSync(join(process.cwd(), ".promptscript")) || existsSync(join(process.cwd(), "promptscript.yaml"));
    }
  },
  adal: {
    name: "adal",
    displayName: "AdaL",
    skillsDir: ".adal/skills",
    globalSkillsDir: join(home, ".adal/skills"),
    detectInstalled: async () => {
      return existsSync(join(home, ".adal"));
    }
  },
  universal: {
    name: "universal",
    displayName: "Universal",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(configHome, "agents/skills"),
    showInUniversalList: false,
    detectInstalled: async () => false
  }
};
async function detectInstalledAgents() {
  return (await Promise.all(Object.entries(agents).map(async ([type, config]) => ({
    type,
    installed: await config.detectInstalled()
  })))).filter((r3) => r3.installed).map((r3) => r3.type);
}
var EVE_SUBAGENTS_DIR = join("agent", "subagents");
function getEveSubagents(cwd = process.cwd()) {
  const dir = join(cwd, EVE_SUBAGENTS_DIR);
  if (!existsSync(dir))
    return [];
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}
function getUniversalAgents() {
  return Object.entries(agents).filter(([_3, config]) => config.skillsDir === ".agents/skills" && config.showInUniversalList !== false).map(([type]) => type);
}
function getVisibleUniversalAgents() {
  return Object.entries(agents).filter(([_3, config]) => config.skillsDir === ".agents/skills" && config.showInUniversalList !== false && config.showInUniversalPrompt !== false).map(([type]) => type);
}
function getNonUniversalAgents() {
  return Object.entries(agents).filter(([_3, config]) => config.skillsDir !== ".agents/skills").map(([type]) => type);
}
function isUniversalAgent(type) {
  return agents[type].skillsDir === ".agents/skills";
}
function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9._]+/g, "-").replace(/^[.\-]+|[.\-]+$/g, "").substring(0, 255) || "unnamed-skill";
}
function isPathSafe$2(basePath, targetPath) {
  const normalizedBase = normalize2(resolve(basePath));
  const normalizedTarget = normalize2(resolve(targetPath));
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
function pathsOverlap(pathA, pathB) {
  return isPathSafe$2(pathA, pathB) || isPathSafe$2(pathB, pathA);
}
function shouldSkipProjectAgentSymlink(agentType, isGlobal, cwd, createMissingAgentRoot) {
  if (isGlobal || isUniversalAgent(agentType) || createMissingAgentRoot || agents[agentType].createProjectSkillsDirByDefault)
    return false;
  const agentRoot = agents[agentType].skillsDir.split("/")[0];
  return !existsSync(join(cwd, agentRoot));
}
async function isDirEntryOrSymlinkToDir(entry, entryPath) {
  if (entry.isDirectory())
    return true;
  if (!entry.isSymbolicLink())
    return false;
  try {
    return (await stat(entryPath)).isDirectory();
  } catch {
    return false;
  }
}
function getCanonicalSkillsDir(global, cwd) {
  return join(global ? homedir() : cwd || process.cwd(), AGENTS_DIR$1, SKILLS_SUBDIR);
}
function getEveSubagentSkillsDir(subagent, cwd) {
  return join(cwd || process.cwd(), EVE_SUBAGENTS_DIR, sanitizeName(subagent), "skills");
}
function getAgentBaseDir(agentType, global, cwd, eveSubagent) {
  if (isUniversalAgent(agentType))
    return getCanonicalSkillsDir(global, cwd);
  if (agentType === "eve" && eveSubagent)
    return getEveSubagentSkillsDir(eveSubagent, cwd);
  const agent = agents[agentType];
  const baseDir = global ? homedir() : cwd || process.cwd();
  if (global) {
    if (agent.globalSkillsDir === undefined)
      return join(baseDir, agent.skillsDir);
    return agent.globalSkillsDir;
  }
  return join(baseDir, agent.skillsDir);
}
function resolveSymlinkTarget(linkPath, linkTarget) {
  return resolve(dirname(linkPath), linkTarget);
}
async function cleanAndCreateDirectory(path2) {
  try {
    await rm(path2, {
      recursive: true,
      force: true
    });
  } catch {}
  await mkdir(path2, { recursive: true });
}
async function resolveParentSymlinks(path2) {
  const resolved = resolve(path2);
  const dir = dirname(resolved);
  const base = basename(resolved);
  try {
    return join(await realpath(dir), base);
  } catch {
    return resolved;
  }
}
async function createSymlink(target, linkPath) {
  try {
    const resolvedTarget = resolve(target);
    const resolvedLinkPath = resolve(linkPath);
    const [realTarget, realLinkPath] = await Promise.all([realpath(resolvedTarget).catch(() => resolvedTarget), realpath(resolvedLinkPath).catch(() => resolvedLinkPath)]);
    if (realTarget === realLinkPath)
      return true;
    if (await resolveParentSymlinks(target) === await resolveParentSymlinks(linkPath))
      return true;
    try {
      if ((await lstat(linkPath)).isSymbolicLink()) {
        if (resolveSymlinkTarget(linkPath, await readlink(linkPath)) === resolvedTarget)
          return true;
        await rm(linkPath);
      } else
        await rm(linkPath, { recursive: true });
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ELOOP")
        try {
          await rm(linkPath, { force: true });
        } catch {}
    }
    const linkDir = dirname(linkPath);
    await mkdir(linkDir, { recursive: true });
    const relativePath = relative(await resolveParentSymlinks(linkDir), target);
    const symlinkType = platform() === "win32" ? "junction" : undefined;
    await symlink(symlinkType === "junction" ? resolvedTarget : relativePath, linkPath, symlinkType);
    return true;
  } catch {
    return false;
  }
}
async function installSkillForAgent(skill, agentType, options = {}) {
  const agent = agents[agentType];
  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const eveSubagent = options.eveSubagent;
  if (isGlobal && agent.globalSkillsDir === undefined)
    return {
      success: false,
      path: "",
      mode: options.mode ?? "symlink",
      error: `${agent.displayName} does not support global skill installation`
    };
  const skillName = sanitizeName(skill.name || basename(skill.path));
  const installMode = options.mode ?? "symlink";
  const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
  const canonicalDir = join(canonicalBase, skillName);
  const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
  const agentDir = join(agentBase, skillName);
  if (!isPathSafe$2(canonicalBase, canonicalDir))
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected"
    };
  if (!isPathSafe$2(agentBase, agentDir))
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected"
    };
  try {
    if (pathsOverlap(skill.path, agentDir))
      return {
        success: true,
        path: agentDir,
        mode: installMode,
        skipped: true
      };
    if (installMode === "copy") {
      await cleanAndCreateDirectory(agentDir);
      await copyDirectory(skill.path, agentDir, agentType);
      return {
        success: true,
        path: agentDir,
        mode: "copy"
      };
    }
    const sourceIsCanonical = resolve(skill.path) === resolve(canonicalDir);
    if (!sourceIsCanonical && pathsOverlap(skill.path, canonicalDir))
      return {
        success: true,
        path: canonicalDir,
        canonicalPath: canonicalDir,
        mode: installMode,
        skipped: true
      };
    if (!sourceIsCanonical)
      if (installMode === "link") {
        if (!await createSymlink(skill.path, canonicalDir)) {
          await cleanAndCreateDirectory(canonicalDir);
          await copyDirectory(skill.path, canonicalDir, agentType);
        }
      } else {
        await cleanAndCreateDirectory(canonicalDir);
        await copyDirectory(skill.path, canonicalDir, agentType);
      }
    if (isGlobal && isUniversalAgent(agentType))
      return {
        success: true,
        path: canonicalDir,
        canonicalPath: canonicalDir,
        mode: installMode
      };
    if (shouldSkipProjectAgentSymlink(agentType, isGlobal, cwd, options.createMissingAgentRoot ?? false))
      return {
        success: true,
        path: canonicalDir,
        canonicalPath: canonicalDir,
        mode: installMode,
        skipped: true,
        skipReason: "missing-agent-project-directory"
      };
    if (!await createSymlink(canonicalDir, agentDir)) {
      await cleanAndCreateDirectory(agentDir);
      await copyDirectory(skill.path, agentDir, agentType);
      return {
        success: true,
        path: agentDir,
        canonicalPath: canonicalDir,
        mode: installMode,
        symlinkFailed: true
      };
    }
    return {
      success: true,
      path: agentDir,
      canonicalPath: canonicalDir,
      mode: installMode
    };
  } catch (error) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
var EXCLUDE_FILES = /* @__PURE__ */ new Set(["metadata.json"]);
var EXCLUDE_DIRS = /* @__PURE__ */ new Set([
  ".git",
  "__pycache__",
  "__pypackages__"
]);
var isExcluded = (name, isDirectory = false) => {
  if (EXCLUDE_FILES.has(name))
    return true;
  if (isDirectory && EXCLUDE_DIRS.has(name))
    return true;
  return false;
};
function stripIgnoredEveFrontmatter(raw) {
  const { data, content } = parseFrontmatter(raw);
  const eveData = {};
  if (typeof data.name === "string")
    eveData.name = data.name;
  if (typeof data.description === "string")
    eveData.description = data.description;
  if (typeof data.license === "string")
    eveData.license = data.license;
  if (data.compatibility !== undefined)
    eveData.compatibility = data.compatibility;
  if (typeof data.version === "string" || typeof data.version === "number")
    eveData.version = data.version;
  if (data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata))
    eveData.metadata = data.metadata;
  if (Object.keys(eveData).length === 0)
    return content.replace(/^\r?\n/u, "");
  return `---
${$stringify(eveData).trimEnd()}
---
${content.replace(/^\r?\n/u, "")}`;
}
function isWithinRoot(root, target) {
  return target === root || target.startsWith(root + sep);
}
async function copyDirectory(src, dest, agentType, ctx) {
  const realSrc = await realpath(src);
  const root = ctx?.root ?? realSrc;
  if (ctx?.ancestors.has(realSrc)) {
    console.warn(`Skipping symlink that creates a directory cycle: ${src}`);
    return;
  }
  const ancestors = new Set(ctx?.ancestors);
  ancestors.add(realSrc);
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  await Promise.all(entries.filter((entry) => !isExcluded(entry.name, entry.isDirectory())).map(async (entry) => {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    let isDirectory = entry.isDirectory();
    if (entry.isSymbolicLink()) {
      let realTarget;
      try {
        realTarget = await realpath(srcPath);
      } catch {
        console.warn(`Skipping broken symlink: ${srcPath}`);
        return;
      }
      if (!isWithinRoot(root, realTarget)) {
        console.warn(`Skipping symlink that points outside the skill directory: ${srcPath}`);
        return;
      }
      isDirectory = (await stat(realTarget)).isDirectory();
      if (isDirectory && isExcluded(entry.name, true))
        return;
    }
    if (isDirectory) {
      await copyDirectory(srcPath, destPath, agentType, {
        root,
        ancestors
      });
      return;
    }
    if (agentType === "eve" && entry.name.toLowerCase() === "skill.md") {
      await writeFile(destPath, stripIgnoredEveFrontmatter(await readFile(srcPath, "utf-8")));
      return;
    }
    await cp(srcPath, destPath, { dereference: true });
    await chmod(destPath, (await stat(srcPath)).mode & 511);
  }));
}
function isEvePackagedSkill(files) {
  return files.some((file) => basename(file.path).toLowerCase() === "skill.md");
}
function toEveFlatSkillFileName(installName) {
  return `${sanitizeName(installName)}.md`;
}
function getEveFlatSkillMarkdown(files) {
  const skillFile = files.find((file) => basename(file.path).toLowerCase() === "skill.md");
  if (skillFile)
    return stripIgnoredEveFrontmatter(skillFile.contents);
  const markdownFile = files.find((file) => extname(file.path).toLowerCase() === ".md");
  return markdownFile ? stripIgnoredEveFrontmatter(markdownFile.contents) : "";
}
async function isSkillInstalled(skillName, agentType, options = {}) {
  const agent = agents[agentType];
  const sanitized = sanitizeName(skillName);
  if (options.global && agent.globalSkillsDir === undefined)
    return false;
  const targetBase = options.global ? agent.globalSkillsDir : agentType === "eve" && options.eveSubagent ? getEveSubagentSkillsDir(options.eveSubagent, options.cwd) : join(options.cwd || process.cwd(), agent.skillsDir);
  const skillDir = join(targetBase, sanitized);
  if (!isPathSafe$2(targetBase, skillDir))
    return false;
  try {
    await access(skillDir);
    return true;
  } catch {
    return false;
  }
}
function getInstallPath(skillName, agentType, options = {}) {
  agents[agentType];
  options.cwd || process.cwd();
  const sanitized = sanitizeName(skillName);
  const targetBase = getAgentBaseDir(agentType, options.global ?? false, options.cwd, options.eveSubagent);
  const installPath = join(targetBase, sanitized);
  if (!isPathSafe$2(targetBase, installPath))
    throw new Error("Invalid skill name: potential path traversal detected");
  return installPath;
}
function getCanonicalPath(skillName, options = {}) {
  const sanitized = sanitizeName(skillName);
  const canonicalBase = options.agent === "eve" ? getAgentBaseDir("eve", options.global ?? false, options.cwd, options.eveSubagent) : getCanonicalSkillsDir(options.global ?? false, options.cwd);
  const canonicalPath = join(canonicalBase, sanitized);
  if (!isPathSafe$2(canonicalBase, canonicalPath))
    throw new Error("Invalid skill name: potential path traversal detected");
  return canonicalPath;
}
async function installWellKnownSkillForAgent(skill, agentType, options = {}) {
  const agent = agents[agentType];
  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const installMode = options.mode ?? "symlink";
  const eveSubagent = options.eveSubagent;
  if (isGlobal && agent.globalSkillsDir === undefined)
    return {
      success: false,
      path: "",
      mode: installMode,
      error: `${agent.displayName} does not support global skill installation`
    };
  const skillName = sanitizeName(skill.installName);
  const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
  const canonicalDir = join(canonicalBase, skillName);
  const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
  const agentDir = join(agentBase, skillName);
  if (!isPathSafe$2(canonicalBase, canonicalDir))
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected"
    };
  if (!isPathSafe$2(agentBase, agentDir))
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected"
    };
  async function writeSkillFiles(targetDir) {
    for (const [filePath, content] of skill.files) {
      const fullPath = join(targetDir, filePath);
      if (!isPathSafe$2(targetDir, fullPath))
        continue;
      const parentDir = dirname(fullPath);
      if (parentDir !== targetDir)
        await mkdir(parentDir, { recursive: true });
      await writeFile(fullPath, agentType === "eve" && basename(filePath).toLowerCase() === "skill.md" && typeof content === "string" ? stripIgnoredEveFrontmatter(content) : content);
    }
  }
  try {
    if (installMode === "copy") {
      await cleanAndCreateDirectory(agentDir);
      await writeSkillFiles(agentDir);
      return {
        success: true,
        path: agentDir,
        mode: "copy"
      };
    }
    await cleanAndCreateDirectory(canonicalDir);
    await writeSkillFiles(canonicalDir);
    if (isGlobal && isUniversalAgent(agentType))
      return {
        success: true,
        path: canonicalDir,
        canonicalPath: canonicalDir,
        mode: "symlink"
      };
    if (!await createSymlink(canonicalDir, agentDir)) {
      await cleanAndCreateDirectory(agentDir);
      await writeSkillFiles(agentDir);
      return {
        success: true,
        path: agentDir,
        canonicalPath: canonicalDir,
        mode: "symlink",
        symlinkFailed: true
      };
    }
    return {
      success: true,
      path: agentDir,
      canonicalPath: canonicalDir,
      mode: "symlink"
    };
  } catch (error) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function installBlobSkillForAgent(skill, agentType, options = {}) {
  const agent = agents[agentType];
  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const installMode = options.mode ?? "symlink";
  const eveSubagent = options.eveSubagent;
  if (isGlobal && agent.globalSkillsDir === undefined)
    return {
      success: false,
      path: "",
      mode: installMode,
      error: `${agent.displayName} does not support global skill installation`
    };
  const skillName = sanitizeName(skill.installName);
  const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
  if (agentType === "eve" && !isEvePackagedSkill(skill.files)) {
    const flatSkillPath = join(agentBase, toEveFlatSkillFileName(skill.installName));
    if (!isPathSafe$2(agentBase, flatSkillPath))
      return {
        success: false,
        path: flatSkillPath,
        mode: installMode,
        error: "Invalid skill name: potential path traversal detected"
      };
    try {
      await mkdir(agentBase, { recursive: true });
      await rm(flatSkillPath, {
        recursive: true,
        force: true
      });
      await writeFile(flatSkillPath, getEveFlatSkillMarkdown(skill.files), "utf-8");
      return {
        success: true,
        path: flatSkillPath,
        mode: "copy"
      };
    } catch (error) {
      return {
        success: false,
        path: flatSkillPath,
        mode: installMode,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
  const canonicalDir = join(canonicalBase, skillName);
  const agentDir = join(agentBase, skillName);
  if (!isPathSafe$2(canonicalBase, canonicalDir))
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected"
    };
  if (!isPathSafe$2(agentBase, agentDir))
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected"
    };
  async function writeSkillFiles(targetDir) {
    for (const file of skill.files) {
      const fullPath = join(targetDir, file.path);
      if (!isPathSafe$2(targetDir, fullPath))
        continue;
      const parentDir = dirname(fullPath);
      if (parentDir !== targetDir)
        await mkdir(parentDir, { recursive: true });
      await writeFile(fullPath, agentType === "eve" && basename(file.path).toLowerCase() === "skill.md" ? stripIgnoredEveFrontmatter(file.contents) : file.contents, "utf-8");
    }
  }
  try {
    if (installMode === "copy") {
      await cleanAndCreateDirectory(agentDir);
      await writeSkillFiles(agentDir);
      return {
        success: true,
        path: agentDir,
        mode: "copy"
      };
    }
    await cleanAndCreateDirectory(canonicalDir);
    await writeSkillFiles(canonicalDir);
    if (isGlobal && isUniversalAgent(agentType))
      return {
        success: true,
        path: canonicalDir,
        canonicalPath: canonicalDir,
        mode: "symlink"
      };
    if (shouldSkipProjectAgentSymlink(agentType, isGlobal, cwd, options.createMissingAgentRoot ?? false))
      return {
        success: true,
        path: canonicalDir,
        canonicalPath: canonicalDir,
        mode: "symlink",
        skipped: true,
        skipReason: "missing-agent-project-directory"
      };
    if (!await createSymlink(canonicalDir, agentDir)) {
      await cleanAndCreateDirectory(agentDir);
      await writeSkillFiles(agentDir);
      return {
        success: true,
        path: agentDir,
        canonicalPath: canonicalDir,
        mode: "symlink",
        symlinkFailed: true
      };
    }
    return {
      success: true,
      path: agentDir,
      canonicalPath: canonicalDir,
      mode: "symlink"
    };
  } catch (error) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function listInstalledSkills(options = {}) {
  const cwd = options.cwd || process.cwd();
  const skillsMap = /* @__PURE__ */ new Map;
  const scopes = [];
  const detectedAgents = await detectInstalledAgents();
  const agentFilter = options.agentFilter;
  const agentsToCheck = agentFilter ? detectedAgents.filter((a2) => agentFilter.includes(a2)) : detectedAgents;
  const scopeTypes = [];
  if (options.global === undefined)
    scopeTypes.push({ global: false }, { global: true });
  else
    scopeTypes.push({ global: options.global });
  for (const { global: isGlobal } of scopeTypes) {
    scopes.push({
      global: isGlobal,
      path: getCanonicalSkillsDir(isGlobal, cwd)
    });
    for (const agentType of agentsToCheck) {
      const agent = agents[agentType];
      if (isGlobal && agent.globalSkillsDir === undefined)
        continue;
      const agentDir = isGlobal ? agent.globalSkillsDir : join(cwd, agent.skillsDir);
      if (!scopes.some((s3) => s3.path === agentDir && s3.global === isGlobal))
        scopes.push({
          global: isGlobal,
          path: agentDir,
          agentType
        });
      if (agentType === "eve" && !isGlobal)
        for (const subagent of getEveSubagents(cwd)) {
          const subagentDir = getEveSubagentSkillsDir(subagent, cwd);
          if (!scopes.some((s3) => s3.path === subagentDir && s3.global === isGlobal))
            scopes.push({
              global: isGlobal,
              path: subagentDir,
              agentType
            });
        }
    }
    const allAgentTypes = Object.keys(agents);
    for (const agentType of allAgentTypes) {
      if (agentFilter && !agentFilter.includes(agentType))
        continue;
      if (agentsToCheck.includes(agentType))
        continue;
      const agent = agents[agentType];
      if (isGlobal && agent.globalSkillsDir === undefined)
        continue;
      const agentDir = isGlobal ? agent.globalSkillsDir : join(cwd, agent.skillsDir);
      if (scopes.some((s3) => s3.path === agentDir && s3.global === isGlobal))
        continue;
      if (existsSync(agentDir))
        scopes.push({
          global: isGlobal,
          path: agentDir,
          agentType
        });
    }
  }
  for (const scope of scopes)
    try {
      const entries = await readdir(scope.path, { withFileTypes: true });
      for (const entry of entries) {
        const skillDir = join(scope.path, entry.name);
        if (!await isDirEntryOrSymlinkToDir(entry, skillDir))
          continue;
        const skillMdPath = join(skillDir, "SKILL.md");
        try {
          await stat(skillMdPath);
        } catch {
          continue;
        }
        const skill = await parseSkillMd(skillMdPath);
        if (!skill)
          continue;
        const scopeKey = scope.global ? "global" : "project";
        const skillKey = `${scopeKey}:${skill.name}`;
        if (scope.agentType) {
          if (skillsMap.has(skillKey)) {
            const existing = skillsMap.get(skillKey);
            if (!existing.agents.includes(scope.agentType))
              existing.agents.push(scope.agentType);
          } else
            skillsMap.set(skillKey, {
              name: skill.name,
              description: skill.description,
              path: skillDir,
              canonicalPath: skillDir,
              scope: scopeKey,
              agents: [scope.agentType]
            });
          continue;
        }
        const sanitizedSkillName = sanitizeName(skill.name);
        const installedAgents = [];
        for (const agentType of agentsToCheck) {
          const agent = agents[agentType];
          if (scope.global && agent.globalSkillsDir === undefined)
            continue;
          const agentBase = getAgentBaseDir(agentType, scope.global, cwd);
          let found = false;
          const possibleNames = Array.from(/* @__PURE__ */ new Set([
            entry.name,
            sanitizedSkillName,
            skill.name.toLowerCase().replace(/\s+/g, "-").replace(/[\/\\:\0]/g, "")
          ]));
          for (const possibleName of possibleNames) {
            const agentSkillDir = join(agentBase, possibleName);
            if (!isPathSafe$2(agentBase, agentSkillDir))
              continue;
            try {
              await access(agentSkillDir);
              found = true;
              break;
            } catch {}
          }
          if (!found)
            try {
              const agentEntries = await readdir(agentBase, { withFileTypes: true });
              for (const agentEntry of agentEntries) {
                const candidateDir = join(agentBase, agentEntry.name);
                if (!await isDirEntryOrSymlinkToDir(agentEntry, candidateDir))
                  continue;
                if (!isPathSafe$2(agentBase, candidateDir))
                  continue;
                try {
                  const candidateSkillMd = join(candidateDir, "SKILL.md");
                  await stat(candidateSkillMd);
                  const candidateSkill = await parseSkillMd(candidateSkillMd);
                  if (candidateSkill && candidateSkill.name === skill.name) {
                    found = true;
                    break;
                  }
                } catch {}
              }
            } catch {}
          if (found)
            installedAgents.push(agentType);
        }
        if (skillsMap.has(skillKey)) {
          const existing = skillsMap.get(skillKey);
          for (const agent of installedAgents)
            if (!existing.agents.includes(agent))
              existing.agents.push(agent);
        } else
          skillsMap.set(skillKey, {
            name: skill.name,
            description: skill.description,
            path: skillDir,
            canonicalPath: skillDir,
            scope: scopeKey,
            agents: installedAgents
          });
      }
    } catch {}
  return Array.from(skillsMap.values());
}
function isCI2() {
  return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI || process.env.CIRCLECI || process.env.TRAVIS || process.env.BUILDKITE || process.env.JENKINS_URL || process.env.TEAMCITY_VERSION);
}
var TELEMETRY_URL = "https://www.skills.sh/tele/t";
var AUDIT_URL = "https://www.skills.sh/tele/audit";
var cliVersion = null;
var detectedAgentName = null;
function setDetectedAgent(agentName) {
  detectedAgentName = agentName;
}
function isEnabled() {
  return !process.env.DISABLE_TELEMETRY && !process.env.DO_NOT_TRACK;
}
function setVersion(version) {
  cliVersion = version;
}
async function fetchAuditData(source, skillSlugs, timeoutMs = 3000) {
  if (!isEnabled())
    return null;
  if (skillSlugs.length === 0)
    return null;
  try {
    const params = new URLSearchParams({
      source,
      skills: skillSlugs.join(",")
    });
    const controller = new AbortController;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${AUDIT_URL}?${params.toString()}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok)
      return null;
    return await response.json();
  } catch {
    return null;
  }
}
var pendingTelemetry = [];
function track(data) {
  if (!isEnabled())
    return;
  try {
    const params = new URLSearchParams;
    if (cliVersion)
      params.set("v", cliVersion);
    if (isCI2())
      params.set("ci", "1");
    if (detectedAgentName)
      params.set("agent", detectedAgentName);
    for (const [key, value] of Object.entries(data))
      if (value !== undefined && value !== null)
        params.set(key, String(value));
    const p3 = fetch(`${TELEMETRY_URL}?${params.toString()}`).catch(() => {}).then(() => {});
    pendingTelemetry.push(p3);
  } catch {}
}
async function flushTelemetry(timeoutMs = 5000) {
  if (pendingTelemetry.length === 0)
    return;
  const timeout = new Promise((resolve2) => setTimeout(resolve2, timeoutMs));
  await Promise.race([Promise.all(pendingTelemetry), timeout]);
}
var import_dist2 = require_dist3();
var cachedResult = null;
function hasStrongCursorAgentSignal() {
  return Boolean(process.env.CURSOR_AGENT?.trim()) || process.env.CURSOR_EXTENSION_HOST_ROLE === "agent-exec";
}
function refineAgentResult(result) {
  if (!result.isAgent || !result.agent)
    return result;
  if (result.agent.name === "cursor" || result.agent.name === "cursor-cli") {
    if (!hasStrongCursorAgentSignal())
      return {
        isAgent: false,
        agent: undefined
      };
    if (result.agent.name === "cursor")
      return {
        isAgent: true,
        agent: { name: "cursor-cli" }
      };
  }
  return result;
}
var agentNameToType = {
  cursor: "cursor",
  "cursor-cli": "cursor",
  claude: "claude-code",
  cowork: "claude-code",
  devin: "universal",
  replit: "replit",
  gemini: "gemini-cli",
  codex: "codex",
  antigravity: "antigravity",
  "augment-cli": "augment",
  opencode: "opencode",
  "github-copilot": "github-copilot"
};
async function detectAgent() {
  if (cachedResult)
    return cachedResult;
  cachedResult = refineAgentResult(await (0, import_dist2.determineAgent)());
  if (cachedResult.isAgent)
    setDetectedAgent(cachedResult.agent.name);
  return cachedResult;
}
async function isRunningInAgent() {
  return (await detectAgent()).isAgent;
}
function getAgentType(agentName) {
  return agentNameToType[agentName] ?? null;
}
var ProviderRegistryImpl = class {
  providers = [];
  register(provider) {
    if (this.providers.some((p3) => p3.id === provider.id))
      throw new Error(`Provider with id "${provider.id}" already registered`);
    this.providers.push(provider);
  }
  findProvider(url) {
    for (const provider of this.providers)
      if (provider.match(url).matches)
        return provider;
    return null;
  }
  getProviders() {
    return [...this.providers];
  }
};
new ProviderRegistryImpl;
var ZIP_LOCAL_FILE_HEADER = 67324752;
var ZIP_CENTRAL_DIRECTORY_HEADER = 33639248;
var ZIP_END_OF_CENTRAL_DIRECTORY = 101010256;
var ZIP64_END_OF_CENTRAL_DIRECTORY = 101075792;
var ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR = 117853008;
var ZIP_END_MIN_SIZE = 22;
var ZIP_MAX_COMMENT_SIZE = 65535;
var CP437_HIGH_BYTES = [
  "ÇüéâäàåçêëèïîìÄÅ",
  "ÉæÆôöòûùÿÖÜ¢£¥₧ƒ",
  "áíóúñÑªº¿⌐¬½¼¡«»",
  "░▒▓│┤╡╢╖╕╣║╗╝╜╛┐",
  "└┴┬├─┼╞╟╚╔╩╦╠═╬╧",
  "╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀",
  "αßΓπΣσµτΦΘΩδ∞φε∩",
  "≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ "
].join("");
var ArchiveValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ArchiveValidationError";
  }
};
function ensureRange(buffer, offset, length, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length)
    throw new Error(`Invalid zip archive: ${label} is out of bounds`);
}
function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - ZIP_MAX_COMMENT_SIZE - ZIP_END_MIN_SIZE);
  for (let offset = buffer.length - ZIP_END_MIN_SIZE;offset >= minOffset; offset--) {
    if (buffer.readUInt32LE(offset) !== ZIP_END_OF_CENTRAL_DIRECTORY)
      continue;
    const commentLength = buffer.readUInt16LE(offset + 20);
    if (offset + ZIP_END_MIN_SIZE + commentLength === buffer.length)
      return offset;
  }
  return -1;
}
function readUInt64AsNumber(buffer, offset, label) {
  ensureRange(buffer, offset, 8, label);
  const value = buffer.readBigUInt64LE(offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error(`Invalid zip archive: ${label} exceeds the safe integer range`);
  return Number(value);
}
function readCentralDirectory(buffer, endOffset) {
  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  const size = buffer.readUInt32LE(endOffset + 12);
  const offset = buffer.readUInt32LE(endOffset + 16);
  if (!(entriesOnDisk === 65535 || totalEntries === 65535 || size === 4294967295 || offset === 4294967295)) {
    if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries)
      throw new Error("Multi-disk zip archives are not supported");
    return {
      entries: totalEntries,
      offset,
      size,
      trailerOffset: endOffset
    };
  }
  if (diskNumber !== 0 || centralDirectoryDisk !== 0)
    throw new Error("Multi-disk zip archives are not supported");
  const locatorOffset = endOffset - 20;
  ensureRange(buffer, locatorOffset, 20, "zip64 locator");
  if (buffer.readUInt32LE(locatorOffset) !== ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR)
    throw new Error("Invalid zip64 locator");
  if (buffer.readUInt32LE(locatorOffset + 4) !== 0 || buffer.readUInt32LE(locatorOffset + 16) !== 1)
    throw new Error("Multi-disk zip archives are not supported");
  const zip64EndOffset = readUInt64AsNumber(buffer, locatorOffset + 8, "zip64 end offset");
  ensureRange(buffer, zip64EndOffset, 56, "zip64 end of central directory");
  if (buffer.readUInt32LE(zip64EndOffset) !== ZIP64_END_OF_CENTRAL_DIRECTORY)
    throw new Error("Invalid zip64 end of central directory");
  const recordSize = readUInt64AsNumber(buffer, zip64EndOffset + 4, "zip64 end size");
  if (recordSize < 44)
    throw new Error("Invalid zip64 end of central directory");
  ensureRange(buffer, zip64EndOffset, recordSize + 12, "zip64 end of central directory");
  if (zip64EndOffset + recordSize + 12 !== locatorOffset)
    throw new Error("Invalid zip64 end of central directory");
  if (buffer.readUInt32LE(zip64EndOffset + 16) !== 0 || buffer.readUInt32LE(zip64EndOffset + 20) !== 0)
    throw new Error("Multi-disk zip archives are not supported");
  const zip64EntriesOnDisk = readUInt64AsNumber(buffer, zip64EndOffset + 24, "zip64 entries on disk");
  const zip64TotalEntries = readUInt64AsNumber(buffer, zip64EndOffset + 32, "zip64 total entries");
  if (zip64EntriesOnDisk !== zip64TotalEntries)
    throw new Error("Multi-disk zip archives are not supported");
  return {
    entries: zip64TotalEntries,
    size: readUInt64AsNumber(buffer, zip64EndOffset + 40, "zip64 central directory size"),
    offset: readUInt64AsNumber(buffer, zip64EndOffset + 48, "zip64 central directory offset"),
    trailerOffset: zip64EndOffset
  };
}
function normalizeArchivePath(rawPath) {
  if (!rawPath || rawPath.includes("\x00"))
    return null;
  const path2 = rawPath.replace(/\\/g, "/");
  if (path2.startsWith("/") || /^[A-Za-z]:/.test(path2))
    return null;
  const parts = path2.split("/");
  if (parts.some((part) => part === ".."))
    return null;
  const normalized = parts.filter((part) => part && part !== ".").join("/");
  if (!normalized && !path2.endsWith("/"))
    return null;
  return path2.endsWith("/") && normalized ? `${normalized}/` : normalized;
}
function findExtraField(buffer, extraOffset, extraLength, targetId) {
  const extraEnd = extraOffset + extraLength;
  let offset = extraOffset;
  while (offset < extraEnd) {
    if (offset + 4 > extraEnd)
      throw new Error("Invalid zip extra field");
    const id = buffer.readUInt16LE(offset);
    const size = buffer.readUInt16LE(offset + 2);
    const dataOffset = offset + 4;
    ensureRange(buffer, dataOffset, size, "zip extra field");
    if (dataOffset + size > extraEnd)
      throw new Error("Invalid zip extra field");
    if (id === targetId)
      return buffer.subarray(dataOffset, dataOffset + size);
    offset = dataOffset + size;
  }
  return null;
}
function decodeFileName(bytes, isUtf8, unicodePathExtra) {
  if (isUtf8)
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (unicodePathExtra && unicodePathExtra.length >= 5 && unicodePathExtra[0] === 1 && unicodePathExtra.readUInt32LE(1) === crc32(bytes))
    return new TextDecoder("utf-8", { fatal: true }).decode(unicodePathExtra.subarray(5));
  let result = "";
  for (const byte of bytes)
    result += byte < 128 ? String.fromCharCode(byte) : CP437_HIGH_BYTES[byte - 128];
  return result;
}
function readZip64EntryValues(buffer, extraOffset, extraLength, values) {
  if (!(values.uncompressedSize === 4294967295 || values.compressedSize === 4294967295 || values.localHeaderOffset === 4294967295 || values.diskStart === 65535)) {
    if (values.diskStart !== 0)
      throw new Error("Multi-disk zip archives are not supported");
    return values;
  }
  const zip64Extra = findExtraField(buffer, extraOffset, extraLength, 1);
  if (!zip64Extra)
    throw new Error("Invalid zip64 extra field");
  let valueOffset = 0;
  const readNextUInt64 = (label) => {
    if (valueOffset + 8 > zip64Extra.length)
      throw new Error(`Invalid zip64 extra field: missing ${label}`);
    const value = readUInt64AsNumber(zip64Extra, valueOffset, `zip64 ${label}`);
    valueOffset += 8;
    return value;
  };
  const resolved = { ...values };
  if (resolved.uncompressedSize === 4294967295)
    resolved.uncompressedSize = readNextUInt64("uncompressed size");
  if (resolved.compressedSize === 4294967295)
    resolved.compressedSize = readNextUInt64("compressed size");
  if (resolved.localHeaderOffset === 4294967295)
    resolved.localHeaderOffset = readNextUInt64("local header offset");
  if (resolved.diskStart === 65535) {
    if (valueOffset + 4 > zip64Extra.length)
      throw new Error("Invalid zip64 extra field: missing disk start");
    resolved.diskStart = zip64Extra.readUInt32LE(valueOffset);
  }
  if (resolved.diskStart !== 0)
    throw new Error("Multi-disk zip archives are not supported");
  return resolved;
}
function readZipArchive(bytes, limits) {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0)
    throw new Error("Invalid zip archive");
  const centralDirectory = readCentralDirectory(buffer, endOffset);
  const totalEntries = centralDirectory.entries;
  if (totalEntries > limits.maxEntries)
    throw new ArchiveValidationError(`Archive contains too many files (${totalEntries}). Maximum is ${limits.maxEntries}.`);
  ensureRange(buffer, centralDirectory.offset, centralDirectory.size, "central directory");
  if (centralDirectory.offset + centralDirectory.size > centralDirectory.trailerOffset)
    throw new Error("Invalid zip archive: central directory overlaps archive trailer");
  const files = /* @__PURE__ */ new Map;
  let extractedBytes = 0;
  let offset = centralDirectory.offset;
  for (let index = 0;index < totalEntries; index++) {
    ensureRange(buffer, offset, 46, "central directory entry");
    if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_HEADER)
      throw new Error("Invalid zip central directory entry");
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const expectedChecksum = buffer.readUInt32LE(offset + 16);
    let compressedSize = buffer.readUInt32LE(offset + 20);
    let uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    let diskStart = buffer.readUInt16LE(offset + 34);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    let localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const variableSize = fileNameLength + extraLength + commentLength;
    ensureRange(buffer, offset + 46, variableSize, "central directory entry data");
    const nameStart = offset + 46;
    const extraOffset = nameStart + fileNameLength;
    ({ compressedSize, diskStart, localHeaderOffset, uncompressedSize } = readZip64EntryValues(buffer, extraOffset, extraLength, {
      compressedSize,
      diskStart,
      localHeaderOffset,
      uncompressedSize
    }));
    const centralFileName = buffer.subarray(nameStart, nameStart + fileNameLength);
    const rawFileName = decodeFileName(centralFileName, Boolean(flags & 2048), findExtraField(buffer, extraOffset, extraLength, 28789));
    const fileName = normalizeArchivePath(rawFileName);
    if (fileName === null)
      throw new ArchiveValidationError(`Archive contains unsafe path: ${rawFileName}`);
    if (flags & 1)
      throw new ArchiveValidationError("Encrypted zip entries are not supported");
    const fileType = externalAttributes >>> 16 & 61440;
    if (fileType !== 0 && fileType !== 32768 && fileType !== 16384)
      throw new ArchiveValidationError("Archive links are not supported");
    const isDirectory = rawFileName.replace(/\\/g, "/").endsWith("/") || fileType === 16384;
    offset += 46 + variableSize;
    extractedBytes += uncompressedSize;
    if (extractedBytes > limits.maxExtractedBytes)
      throw new ArchiveValidationError(`Archive extracts to more than ${limits.maxExtractedBytes} bytes.`);
    if (isDirectory)
      continue;
    ensureRange(buffer, localHeaderOffset, 30, "local file header");
    if (buffer.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER)
      throw new Error("Invalid zip local file header");
    const localFlags = buffer.readUInt16LE(localHeaderOffset + 6);
    const localMethod = buffer.readUInt16LE(localHeaderOffset + 8);
    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const localNameOffset = localHeaderOffset + 30;
    ensureRange(buffer, localNameOffset, localFileNameLength + localExtraLength, "local file header data");
    const localFileName = buffer.subarray(localNameOffset, localNameOffset + localFileNameLength);
    if (localFlags !== flags || localMethod !== method || !localFileName.equals(centralFileName))
      throw new Error("Zip local header does not match central directory");
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    ensureRange(buffer, dataOffset, compressedSize, "file data");
    if (dataOffset + compressedSize > centralDirectory.offset)
      throw new Error("Invalid zip archive: file data overlaps central directory");
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let contents;
    if (method === 0)
      contents = compressed;
    else if (method === 8)
      contents = inflateRawSync(compressed, { maxOutputLength: uncompressedSize + 1 });
    else
      throw new Error(`Unsupported zip compression method: ${method}`);
    if (contents.byteLength !== uncompressedSize)
      throw new Error("Zip entry size mismatch");
    if (crc32(contents) !== expectedChecksum)
      throw new Error("Zip entry checksum mismatch");
    files.set(fileName, new Uint8Array(contents));
  }
  if (offset !== centralDirectory.offset + centralDirectory.size)
    throw new Error("Invalid zip central directory size");
  return files;
}
var DISCOVERY_SCHEMA_V2 = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
var MAX_ARCHIVE_UNPACKED_BYTES = 50 * 1024 * 1024;
var MAX_ARCHIVE_FILES = 1000;
var DISCOVERY_TIMEOUT_MS = 1e4;
var WellKnownScopeNotFoundError = class extends Error {
  scopePath;
  rootUrl;
  constructor(scopePath, rootUrl) {
    super(`No skills found for the scoped path '${scopePath}' on ${rootUrl}. Not falling back to the root skills index because that would install every skill the host publishes. Check the URL, or run 'skills add ${rootUrl}' to install from the root index.`);
    this.name = "WellKnownScopeNotFoundError";
    this.scopePath = scopePath;
    this.rootUrl = rootUrl;
  }
};
var WellKnownProvider = class {
  id = "well-known";
  displayName = "Well-Known Skills";
  WELL_KNOWN_PATHS = [".well-known/agent-skills", ".well-known/skills"];
  INDEX_FILE = "index.json";
  match(url) {
    if (!url.startsWith("http://") && !url.startsWith("https://"))
      return { matches: false };
    try {
      const parsed = new URL(url);
      if ([
        "github.com",
        "gitlab.com",
        "huggingface.co"
      ].includes(parsed.hostname))
        return { matches: false };
      return {
        matches: true,
        sourceIdentifier: `wellknown/${parsed.hostname}`
      };
    } catch {
      return { matches: false };
    }
  }
  async fetchIndex(baseUrl, options) {
    return (await this.fetchIndexCandidates(baseUrl, options))[0] ?? null;
  }
  async fetchIndexCandidates(baseUrl, options) {
    try {
      const parsed = new URL(baseUrl);
      const basePath = parsed.pathname.replace(/\/$/, "");
      const signal = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS);
      const urlsToTry = [];
      for (const wellKnownPath of this.WELL_KNOWN_PATHS) {
        urlsToTry.push({
          indexUrl: `${parsed.protocol}//${parsed.host}${basePath}/${wellKnownPath}/${this.INDEX_FILE}`,
          baseUrl: `${parsed.protocol}//${parsed.host}${basePath}`,
          wellKnownPath
        });
        if (basePath && basePath !== "")
          urlsToTry.push({
            indexUrl: `${parsed.protocol}//${parsed.host}/${wellKnownPath}/${this.INDEX_FILE}`,
            baseUrl: `${parsed.protocol}//${parsed.host}`,
            wellKnownPath
          });
      }
      const candidates = [];
      for (const { indexUrl, baseUrl: resolvedBase, wellKnownPath } of urlsToTry)
        try {
          const response = await fetch(indexUrl, {
            signal,
            ...options?.updateCheck ? { headers: { "X-Skills-Update-Check": "1" } } : {}
          });
          if (!response.ok)
            continue;
          const rawIndex = await response.json();
          const normalized = this.normalizeIndex(rawIndex, indexUrl, wellKnownPath);
          if (!normalized)
            continue;
          candidates.push({
            index: normalized.index,
            entries: normalized.entries,
            resolvedBaseUrl: resolvedBase,
            resolvedWellKnownPath: wellKnownPath,
            indexUrl
          });
        } catch {
          continue;
        }
      return candidates;
    } catch {
      return [];
    }
  }
  normalizeIndex(rawIndex, indexUrl, resolvedWellKnownPath) {
    if (!rawIndex || typeof rawIndex !== "object")
      return null;
    const record = rawIndex;
    if (!Array.isArray(record.skills))
      return null;
    const schema = record.$schema;
    if (schema === DISCOVERY_SCHEMA_V2) {
      const entries2 = [];
      const v2Entries = [];
      for (const entry of record.skills) {
        if (!this.isValidSkillEntryV2(entry))
          continue;
        const artifactUrl = new URL(entry.url, indexUrl).toString();
        entries2.push({
          version: "0.2.0",
          name: entry.name,
          description: entry.description,
          type: entry.type,
          artifactUrl,
          digest: entry.digest,
          indexEntry: entry
        });
        v2Entries.push(entry);
      }
      if (entries2.length === 0)
        return null;
      return {
        index: {
          $schema: DISCOVERY_SCHEMA_V2,
          skills: v2Entries
        },
        entries: entries2
      };
    }
    if (schema !== undefined)
      return null;
    const v1Entries = [];
    const entries = [];
    for (const entry of record.skills) {
      if (!this.isValidSkillEntryV1(entry))
        return null;
      v1Entries.push(entry);
      entries.push({
        version: "0.1.0",
        name: entry.name,
        description: entry.description,
        files: entry.files,
        baseUrl: this.getLegacySkillBaseUrl(indexUrl, resolvedWellKnownPath),
        wellKnownPath: resolvedWellKnownPath,
        indexEntry: entry
      });
    }
    return {
      index: { skills: v1Entries },
      entries
    };
  }
  getLegacySkillBaseUrl(indexUrl, wellKnownPath) {
    const parsed = new URL(indexUrl);
    const marker = `/${wellKnownPath}/${this.INDEX_FILE}`;
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.slice(0, -marker.length)}`;
  }
  isValidSkillName(name) {
    if (typeof name !== "string")
      return false;
    if (name.length < 1 || name.length > 64)
      return false;
    if (!/^[a-z0-9-]+$/.test(name))
      return false;
    if (name.startsWith("-") || name.endsWith("-"))
      return false;
    if (name.includes("--"))
      return false;
    return true;
  }
  isSafeLegacyFilePath(filePath) {
    if (typeof filePath !== "string" || filePath.length === 0)
      return false;
    if (filePath.startsWith("/") || filePath.startsWith("\\") || filePath.includes(".."))
      return false;
    if (filePath.includes("\x00"))
      return false;
    return true;
  }
  isValidSkillEntryV1(entry) {
    if (!entry || typeof entry !== "object")
      return false;
    const e = entry;
    if (!this.isValidSkillName(e.name))
      return false;
    if (typeof e.description !== "string" || !e.description)
      return false;
    if (!Array.isArray(e.files) || e.files.length === 0)
      return false;
    for (const file of e.files)
      if (!this.isSafeLegacyFilePath(file))
        return false;
    return e.files.some((f2) => typeof f2 === "string" && f2.toLowerCase() === "skill.md");
  }
  isValidSkillEntryV2(entry) {
    if (!entry || typeof entry !== "object")
      return false;
    const e = entry;
    if (!this.isValidSkillName(e.name))
      return false;
    if (typeof e.description !== "string" || !e.description || e.description.length > 1024)
      return false;
    if (e.type !== "skill-md" && e.type !== "archive")
      return false;
    if (typeof e.url !== "string" || !e.url)
      return false;
    if (typeof e.digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(e.digest))
      return false;
    try {
      new URL(e.url, "https://example.com/.well-known/agent-skills/index.json");
    } catch {
      return false;
    }
    return true;
  }
  async fetchSkill(url) {
    try {
      const parsed = new URL(url);
      const candidates = await this.fetchIndexCandidates(url);
      for (const result of candidates) {
        const { entries } = result;
        let skillName = null;
        const pathMatch = parsed.pathname.match(/\/.well-known\/(?:agent-skills|skills)\/([^/]+)\/?$/);
        if (pathMatch && pathMatch[1] && pathMatch[1] !== "index.json")
          skillName = pathMatch[1];
        else if (entries.length === 1)
          skillName = entries[0].name;
        if (!skillName)
          continue;
        const skillEntry = entries.find((s3) => s3.name === skillName);
        if (!skillEntry)
          continue;
        const skill = await this.fetchSkillByEntry(skillEntry);
        if (skill)
          return skill;
      }
      return null;
    } catch {
      return null;
    }
  }
  async fetchSkillByEntry(baseUrlOrEntry, legacyEntry, legacyWellKnownPath) {
    if (typeof baseUrlOrEntry === "string") {
      if (!legacyEntry)
        return null;
      return this.fetchLegacySkillByEntry({
        version: "0.1.0",
        name: legacyEntry.name,
        description: legacyEntry.description,
        files: legacyEntry.files,
        baseUrl: baseUrlOrEntry,
        wellKnownPath: legacyWellKnownPath ?? this.WELL_KNOWN_PATHS[0],
        indexEntry: legacyEntry
      });
    }
    if (baseUrlOrEntry.version === "0.1.0")
      return this.fetchLegacySkillByEntry(baseUrlOrEntry);
    return this.fetchArtifactSkillByEntry(baseUrlOrEntry);
  }
  async fetchLegacySkillByEntry(entry) {
    try {
      const skillBaseUrl = `${entry.baseUrl.replace(/\/$/, "")}/${entry.wellKnownPath}/${entry.name}`;
      const skillMdUrl = `${skillBaseUrl}/SKILL.md`;
      const response = await fetch(skillMdUrl);
      if (!response.ok)
        return null;
      const content = await response.text();
      const { data } = parseFrontmatter(content);
      if (typeof data.name !== "string" || typeof data.description !== "string")
        return null;
      const files = /* @__PURE__ */ new Map;
      files.set("SKILL.md", content);
      const filePromises = entry.files.filter((f2) => f2.toLowerCase() !== "skill.md").map(async (filePath) => {
        try {
          const fileUrl = `${skillBaseUrl}/${filePath}`;
          const fileResponse = await fetch(fileUrl);
          if (fileResponse.ok) {
            const fileContent = await fileResponse.arrayBuffer();
            return {
              path: filePath,
              content: new Uint8Array(fileContent)
            };
          }
        } catch {}
        return null;
      });
      const fileResults = await Promise.all(filePromises);
      for (const result of fileResults)
        if (result)
          files.set(result.path, result.content);
      return this.createSkill({
        name: data.name,
        description: data.description,
        content,
        installName: entry.name,
        sourceUrl: skillMdUrl,
        metadata: data.metadata,
        files,
        indexEntry: entry.indexEntry
      });
    } catch {
      return null;
    }
  }
  async fetchArtifactSkillByEntry(entry) {
    try {
      const response = await fetch(entry.artifactUrl);
      if (!response.ok)
        return null;
      const contentType = response.headers.get("content-type") ?? "";
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (this.computeDigest(bytes) !== entry.digest)
        return null;
      if (entry.type === "skill-md") {
        const content2 = new TextDecoder().decode(bytes);
        const { data: data2 } = parseFrontmatter(content2);
        if (typeof data2.name !== "string" || typeof data2.description !== "string")
          return null;
        const files2 = /* @__PURE__ */ new Map;
        files2.set("SKILL.md", content2);
        return this.createSkill({
          name: data2.name,
          description: data2.description,
          content: content2,
          installName: entry.name,
          sourceUrl: entry.artifactUrl,
          metadata: data2.metadata,
          files: files2,
          indexEntry: entry.indexEntry
        });
      }
      const files = this.extractArchive(bytes, entry.artifactUrl, contentType);
      const skillMdBytes = files.get("SKILL.md");
      if (!skillMdBytes)
        return null;
      const content = typeof skillMdBytes === "string" ? skillMdBytes : new TextDecoder().decode(skillMdBytes);
      files.set("SKILL.md", content);
      const { data } = parseFrontmatter(content);
      if (typeof data.name !== "string" || typeof data.description !== "string")
        return null;
      return this.createSkill({
        name: data.name,
        description: data.description,
        content,
        installName: entry.name,
        sourceUrl: entry.artifactUrl,
        metadata: data.metadata,
        files,
        indexEntry: entry.indexEntry
      });
    } catch {
      return null;
    }
  }
  createSkill(input) {
    return {
      name: sanitizeMetadata(input.name),
      description: sanitizeMetadata(input.description),
      content: input.content,
      installName: input.installName,
      sourceUrl: input.sourceUrl,
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : undefined,
      files: input.files,
      indexEntry: input.indexEntry
    };
  }
  getScope(url) {
    try {
      const parsed = new URL(url);
      const scopePath = parsed.pathname.replace(/\/$/, "");
      if (!scopePath)
        return null;
      return {
        scopePath,
        rootBaseUrl: `${parsed.protocol}//${parsed.host}`
      };
    } catch {
      return null;
    }
  }
  async fetchAllSkills(url, options = {}) {
    try {
      const candidates = await this.fetchIndexCandidates(url);
      const scope = this.getScope(url);
      const scopedCandidates = scope ? candidates.filter((c4) => c4.resolvedBaseUrl !== scope.rootBaseUrl) : candidates;
      const includeInternal = options.includeInternal || shouldInstallInternalSkills();
      for (const result of scopedCandidates) {
        const skillPromises = result.entries.map((entry) => this.fetchSkillByEntry(entry));
        const skills = (await Promise.all(skillPromises)).filter((s3) => s3 !== null).filter((skill) => includeInternal || skill.metadata?.internal !== true);
        if (skills.length > 0)
          return skills;
      }
      if (scope && scopedCandidates.length < candidates.length)
        throw new WellKnownScopeNotFoundError(scope.scopePath, scope.rootBaseUrl);
      return [];
    } catch (error) {
      if (error instanceof WellKnownScopeNotFoundError)
        throw error;
      return [];
    }
  }
  computeDigest(bytes) {
    return `sha256:${createHash$1("sha256").update(bytes).digest("hex")}`;
  }
  extractArchive(bytes, artifactUrl, contentType) {
    if (this.isZipArchive(bytes, artifactUrl, contentType))
      return new Map(readZipArchive(bytes, {
        maxExtractedBytes: MAX_ARCHIVE_UNPACKED_BYTES,
        maxEntries: MAX_ARCHIVE_FILES
      }));
    if (this.isTarGzArchive(bytes, artifactUrl, contentType))
      return this.extractTarGz(bytes);
    throw new Error("Unsupported archive format");
  }
  isZipArchive(bytes, artifactUrl, contentType) {
    return contentType.includes("application/zip") || artifactUrl.toLowerCase().endsWith(".zip") || bytes[0] === 80 && bytes[1] === 75;
  }
  isTarGzArchive(bytes, artifactUrl, contentType) {
    const lower = artifactUrl.toLowerCase();
    return contentType.includes("application/gzip") || contentType.includes("application/x-gzip") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz") || bytes[0] === 31 && bytes[1] === 139;
  }
  normalizeArchivePath(rawPath) {
    if (!rawPath || rawPath.includes("\x00"))
      return null;
    if (rawPath.startsWith("/") || rawPath.startsWith("\\"))
      return null;
    if (/^[A-Za-z]:/.test(rawPath))
      return null;
    if (rawPath.includes("\\"))
      return null;
    const parts = rawPath.split("/").filter(Boolean);
    if (parts.length === 0)
      return null;
    if (parts.some((part) => part === "." || part === ".."))
      return null;
    return parts.join("/");
  }
  addArchiveFile(files, path2, content, runningTotal) {
    const normalizedPath = this.normalizeArchivePath(path2);
    if (!normalizedPath)
      throw new Error(`Unsafe archive path: ${path2}`);
    runningTotal.bytes += content.byteLength;
    if (runningTotal.bytes > MAX_ARCHIVE_UNPACKED_BYTES)
      throw new Error("Archive exceeds maximum unpacked size");
    if (files.size >= MAX_ARCHIVE_FILES)
      throw new Error("Archive contains too many files");
    files.set(normalizedPath, content);
  }
  extractTarGz(bytes) {
    const tar = gunzipSync(Buffer.from(bytes));
    const files = /* @__PURE__ */ new Map;
    const runningTotal = { bytes: 0 };
    let offset = 0;
    while (offset + 512 <= tar.length) {
      const header = tar.subarray(offset, offset + 512);
      if (header.every((byte) => byte === 0))
        break;
      const name = this.readTarString(header, 0, 100);
      const sizeText = this.readTarString(header, 124, 12).trim();
      const typeFlag = header[156];
      const prefix = this.readTarString(header, 345, 155);
      const path2 = prefix ? `${prefix}/${name}` : name;
      const size = Number.parseInt(sizeText || "0", 8);
      if (!Number.isFinite(size) || size < 0)
        throw new Error("Invalid tar entry size");
      offset += 512;
      if (typeFlag === 50 || typeFlag === 49)
        throw new Error("Archive links are not supported");
      if (typeFlag === 0 || typeFlag === 48) {
        const content = tar.subarray(offset, offset + size);
        this.addArchiveFile(files, path2, new Uint8Array(content), runningTotal);
      }
      offset += Math.ceil(size / 512) * 512;
    }
    if (!files.has("SKILL.md"))
      throw new Error("Archive missing root SKILL.md");
    return files;
  }
  readTarString(buffer, offset, length) {
    const slice = buffer.subarray(offset, offset + length);
    const nul = slice.indexOf(0);
    return new TextDecoder().decode(nul >= 0 ? slice.subarray(0, nul) : slice);
  }
  toRawUrl(url) {
    try {
      const parsed = new URL(url);
      if (url.toLowerCase().endsWith("/skill.md"))
        return url;
      const primaryPath = this.WELL_KNOWN_PATHS[0];
      const pathMatch = parsed.pathname.match(/\/.well-known\/(?:agent-skills|skills)\/([^/]+)\/?$/);
      if (pathMatch && pathMatch[1]) {
        const basePath2 = parsed.pathname.replace(/\/.well-known\/(?:agent-skills|skills)\/.*$/, "");
        return `${parsed.protocol}//${parsed.host}${basePath2}/${primaryPath}/${pathMatch[1]}/SKILL.md`;
      }
      const basePath = parsed.pathname.replace(/\/$/, "");
      return `${parsed.protocol}//${parsed.host}${basePath}/${primaryPath}/${this.INDEX_FILE}`;
    } catch {
      return url;
    }
  }
  getSourceIdentifier(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  }
  async hasSkillsIndex(url) {
    return await this.fetchIndex(url) !== null;
  }
};
function computeWellKnownSkillDigest(skill) {
  if ("digest" in skill.indexEntry && skill.indexEntry.digest)
    return skill.indexEntry.digest;
  const hash = createHash$1("sha256");
  for (const path2 of Array.from(skill.files.keys()).sort()) {
    hash.update(path2);
    hash.update("\x00");
    hash.update(skill.files.get(path2));
    hash.update("\x00");
  }
  return `sha256:${hash.digest("hex")}`;
}
var wellKnownProvider = new WellKnownProvider;
var DEFAULT_DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;
var DEFAULT_EXTRACT_MAX_BYTES = 25 * 1024 * 1024;
var DEFAULT_EXTRACT_MAX_FILES = 1000;
var FETCH_TIMEOUT_MS = 30000;
function positiveIntegerOr(value, fallback) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}
function getPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw)
    return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function getDownloadLimits(options) {
  return {
    downloadMaxBytes: getPositiveIntegerEnv("SKILLS_DOWNLOAD_MAX_BYTES", positiveIntegerOr(options.downloadMaxBytes, DEFAULT_DOWNLOAD_MAX_BYTES)),
    extractMaxBytes: getPositiveIntegerEnv("SKILLS_EXTRACT_MAX_BYTES", positiveIntegerOr(options.extractMaxBytes, DEFAULT_EXTRACT_MAX_BYTES)),
    extractMaxFiles: getPositiveIntegerEnv("SKILLS_EXTRACT_MAX_FILES", positiveIntegerOr(options.extractMaxFiles, DEFAULT_EXTRACT_MAX_FILES))
  };
}
function isPathSafe$1(basePath, targetPath) {
  const normalizedBase = normalize$1(resolve$1(basePath));
  const normalizedTarget = normalize$1(resolve$1(targetPath));
  return normalizedTarget.startsWith(normalizedBase + sep$1) || normalizedTarget === normalizedBase;
}
function validateArchivePath(path2) {
  const normalized = path2.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.endsWith("/"))
    return normalized;
  if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized))
    return null;
  if (normalized.split("/").includes(".."))
    return null;
  return normalized;
}
function incrementEntry(state, size, limits) {
  state.entries += 1;
  if (state.entries > limits.extractMaxFiles)
    throw new ArchiveValidationError(`Archive contains too many files (${state.entries}). Maximum is ${limits.extractMaxFiles}. Set SKILLS_EXTRACT_MAX_FILES to override.`);
  state.bytes += size;
  if (state.bytes > limits.extractMaxBytes)
    throw new ArchiveValidationError(`Archive extracts to more than ${limits.extractMaxBytes} bytes. Set SKILLS_EXTRACT_MAX_BYTES to override.`);
}
async function downloadToFile(url, targetFile, limits) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow"
  });
  if (!response.ok)
    throw new Error(`Download failed with HTTP ${response.status}`);
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsed) && parsed > limits.downloadMaxBytes)
      throw new Error(`Download is larger than ${limits.downloadMaxBytes} bytes. Set SKILLS_DOWNLOAD_MAX_BYTES to override.`);
  }
  if (!response.body)
    throw new Error("Download response has no body");
  let downloaded = 0;
  const limitStream = new TransformStream({ transform(chunk, controller) {
    downloaded += chunk.byteLength;
    if (downloaded > limits.downloadMaxBytes)
      throw new Error(`Download is larger than ${limits.downloadMaxBytes} bytes. Set SKILLS_DOWNLOAD_MAX_BYTES to override.`);
    controller.enqueue(chunk);
  } });
  await pipeline(response.body.pipeThrough(limitStream), createWriteStream(targetFile));
}
async function isValidSkillMarkdown(filePath) {
  try {
    const { data } = parseFrontmatter(await readFile$1(filePath, "utf-8"));
    return typeof data.name === "string" && typeof data.description === "string";
  } catch {
    return false;
  }
}
async function extractZip(filePath, extractDir, limits) {
  const files = readZipArchive(await readFile$1(filePath), {
    maxExtractedBytes: limits.extractMaxBytes,
    maxEntries: limits.extractMaxFiles
  });
  for (const [path2, contents] of files) {
    const targetPath = join$1(extractDir, path2);
    if (!isPathSafe$1(extractDir, targetPath))
      throw new ArchiveValidationError(`Archive contains unsafe path: ${path2}`);
    await mkdir$1(dirname$1(targetPath), { recursive: true });
    await writeFile$1(targetPath, contents);
  }
}
function getTarEntryType(entry) {
  if (entry instanceof $e)
    return entry.type;
  if (entry.isFile())
    return "File";
  if (entry.isDirectory())
    return "Directory";
  return "";
}
function isTarEntryFile(entry) {
  const type = getTarEntryType(entry);
  return type === "File" || type === "OldFile" || type === "ContiguousFile";
}
async function extractTar(filePath, extractDir, limits) {
  const state = {
    bytes: 0,
    entries: 0
  };
  let validationError;
  await So({
    strict: true,
    filter(entryPath, entry) {
      if (validationError)
        return false;
      try {
        const safePath = validateArchivePath(entryPath);
        if (safePath === null)
          throw new ArchiveValidationError(`Archive contains unsafe path: ${entryPath}`);
        if (!isPathSafe$1(extractDir, join$1(extractDir, safePath)))
          throw new ArchiveValidationError(`Archive contains unsafe path: ${entryPath}`);
        incrementEntry(state, entry.size, limits);
        if (isTarEntryFile(entry))
          return true;
        return getTarEntryType(entry) === "Directory";
      } catch (error) {
        if (error instanceof ArchiveValidationError) {
          validationError = error;
          return false;
        }
        throw error;
      }
    },
    cwd: extractDir,
    preservePaths: false,
    noChmod: true,
    file: filePath
  });
  if (validationError)
    throw validationError;
}
async function tryExtractArchive(filePath, extractDir, limits) {
  const header = await readFile$1(filePath).then((buffer) => buffer.subarray(0, 512));
  const isZip = header[0] === 80 && header[1] === 75;
  const isGzip = header[0] === 31 && header[1] === 139;
  try {
    if (isZip) {
      await extractZip(filePath, extractDir, limits);
      return true;
    }
    if (isGzip) {
      await extractTar(filePath, extractDir, limits);
      return true;
    }
    await extractTar(filePath, extractDir, limits);
    return true;
  } catch (error) {
    await rm$1(extractDir, {
      recursive: true,
      force: true
    }).catch(() => {});
    await mkdir$1(extractDir, { recursive: true });
    if (error instanceof ArchiveValidationError)
      throw error;
    return false;
  }
}
async function getSingleTopLevelDirectory(dir) {
  const { readdir: readdir2 } = await import("node:fs/promises");
  const visibleEntries = (await readdir2(dir, { withFileTypes: true })).filter((entry) => entry.name !== "__MACOSX");
  if (visibleEntries.length !== 1 || !visibleEntries[0].isDirectory())
    return null;
  return join$1(dir, visibleEntries[0].name);
}
async function downloadSource(url, options = {}) {
  const limits = getDownloadLimits(options);
  const tempDir = await mkdtemp$1(join$1(tmpdir$1(), "skills-download-"));
  const downloadedFile = join$1(tempDir, "source.download");
  const extractDir = join$1(tempDir, "extract");
  try {
    await downloadToFile(url, downloadedFile, limits);
    if ((await stat$1(downloadedFile)).size === 0)
      throw new Error("Downloaded URL is empty");
    if (await isValidSkillMarkdown(downloadedFile)) {
      const skillDir = join$1(tempDir, "skill");
      await mkdir$1(skillDir, { recursive: true });
      await writeFile$1(join$1(skillDir, "SKILL.md"), await readFile$1(downloadedFile));
      return {
        rootDir: skillDir,
        tempDir,
        kind: "skill-md"
      };
    }
    await mkdir$1(extractDir, { recursive: true });
    if (await tryExtractArchive(downloadedFile, extractDir, limits))
      return {
        rootDir: await getSingleTopLevelDirectory(extractDir) ?? extractDir,
        tempDir,
        kind: "archive"
      };
    throw new Error("Downloaded URL is not a valid SKILL.md file or supported archive");
  } catch (error) {
    await rm$1(tempDir, {
      recursive: true,
      force: true
    }).catch(() => {});
    throw error;
  }
}
var DEFAULT_FETCH_CONCURRENCY = 4;
function fetchConcurrency() {
  const parsed = Number.parseInt(process.env.SKILLS_CLONE_CONCURRENCY ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_FETCH_CONCURRENCY;
}
async function mapConcurrent(items, fn, limit = fetchConcurrency()) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
var AGENTS_DIR = ".agents";
var LOCK_FILE = ".skill-lock.json";
var CURRENT_VERSION = 3;
function getSkillLockPath() {
  const xdgStateHome = process.env.XDG_STATE_HOME;
  if (xdgStateHome)
    return join(xdgStateHome, "skills", LOCK_FILE);
  return join(homedir(), AGENTS_DIR, LOCK_FILE);
}
async function readSkillLock() {
  const lockPath = getSkillLockPath();
  try {
    const content = await readFile(lockPath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed.version !== "number" || !parsed.skills)
      return createEmptyLockFile();
    if (parsed.version < CURRENT_VERSION)
      return createEmptyLockFile();
    return parsed;
  } catch (error) {
    return createEmptyLockFile();
  }
}
async function writeSkillLock(lock) {
  const lockPath = getSkillLockPath();
  await mkdir(dirname(lockPath), { recursive: true });
  await writeFile(lockPath, JSON.stringify(lock, null, 2), "utf-8");
}
function getGitHubToken() {
  if (process.env.GITHUB_TOKEN)
    return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN)
    return process.env.GH_TOKEN;
  return null;
}
async function addSkillToLock(skillName, entry) {
  const lock = await readSkillLock();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existingEntry = lock.skills[skillName];
  lock.skills[skillName] = {
    ...entry,
    installedAt: existingEntry?.installedAt ?? now,
    updatedAt: now
  };
  await writeSkillLock(lock);
}
async function removeSkillFromLock(skillName) {
  const lock = await readSkillLock();
  if (!(skillName in lock.skills))
    return false;
  delete lock.skills[skillName];
  await writeSkillLock(lock);
  return true;
}
async function getSkillFromLock(skillName) {
  return (await readSkillLock()).skills[skillName] ?? null;
}
async function getAllLockedSkills() {
  return (await readSkillLock()).skills;
}
function createEmptyLockFile() {
  return {
    version: CURRENT_VERSION,
    skills: {},
    dismissed: {}
  };
}
async function isPromptDismissed(promptKey) {
  return (await readSkillLock()).dismissed?.[promptKey] === true;
}
async function dismissPrompt(promptKey) {
  const lock = await readSkillLock();
  if (!lock.dismissed)
    lock.dismissed = {};
  lock.dismissed[promptKey] = true;
  await writeSkillLock(lock);
}
async function getLastSelectedAgents() {
  return (await readSkillLock()).lastSelectedAgents;
}
async function saveSelectedAgents(agents2) {
  const lock = await readSkillLock();
  lock.lastSelectedAgents = agents2;
  await writeSkillLock(lock);
}
var DOWNLOAD_BASE_URL = process.env.SKILLS_DOWNLOAD_URL || "https://skills.sh";
var BLOB_ALLOWED_REPOS = { "zapier/connectors": { downloadUrl: (slug) => `https://connectors-skills.zapier.com/download/${encodeURIComponent(slug)}/snapshot.json` } };
var FETCH_TIMEOUT = 1e4;
var GH_API_MAX_BUFFER = 16777216;
function toSkillSlug(name) {
  return name.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
var _rateLimitedThisSession = false;
async function fetchTreeBranch(ownerRepo, branch, token) {
  try {
    const githubHost = getGitHubHost();
    const url = `${githubHost === "github.com" ? "https://api.github.com" : `https://${githubHost}/api/v3`}/repos/${ownerRepo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "skills-cli"
    };
    if (token)
      headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT)
    });
    if (response.ok) {
      const data = await response.json();
      return {
        tree: {
          sha: data.sha,
          branch,
          tree: data.tree
        },
        rateLimited: false,
        authRetryable: false
      };
    }
    return {
      tree: null,
      rateLimited: response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0",
      authRetryable: response.status === 401 || response.status === 404
    };
  } catch {
    return {
      tree: null,
      rateLimited: false,
      authRetryable: false
    };
  }
}
async function fetchTreeWithToken(ownerRepo, branches, getToken) {
  const token = getToken();
  if (!token)
    return null;
  for (const branch of branches) {
    const result = await fetchTreeBranch(ownerRepo, branch, token);
    if (result.tree)
      return result.tree;
  }
  return null;
}
async function fetchTreeWithGitHubCli(ownerRepo, branches) {
  for (const branch of branches)
    try {
      const endpoint = `repos/${ownerRepo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
      const stdout2 = await new Promise((resolve2, reject) => {
        execFile$1("gh", [
          "api",
          endpoint,
          "--method",
          "GET",
          "--hostname",
          getGitHubHost()
        ], {
          encoding: "utf8",
          timeout: FETCH_TIMEOUT,
          maxBuffer: GH_API_MAX_BUFFER,
          windowsHide: true,
          env: {
            ...process.env,
            GH_PROMPT_DISABLED: "1"
          }
        }, (error, output) => {
          if (error)
            reject(error);
          else
            resolve2(output);
        });
      });
      const data = JSON.parse(stdout2);
      if (typeof data.sha !== "string" || !Array.isArray(data.tree))
        continue;
      return {
        sha: data.sha,
        branch,
        tree: data.tree
      };
    } catch {}
  return null;
}
async function fetchTreeWithAvailableAuth(ownerRepo, branches, getToken) {
  if (getToken) {
    const tree = await fetchTreeWithToken(ownerRepo, branches, getToken);
    if (tree)
      return tree;
  }
  return fetchTreeWithGitHubCli(ownerRepo, branches);
}
async function fetchRepoTree(ownerRepo, ref, getToken) {
  const branches = ref ? [ref] : [
    "HEAD",
    "main",
    "master"
  ];
  if (_rateLimitedThisSession)
    return fetchTreeWithAvailableAuth(ownerRepo, branches, getToken);
  let rateLimited = false;
  let authRetryable = false;
  for (const branch of branches) {
    const result = await fetchTreeBranch(ownerRepo, branch, null);
    if (result.tree)
      return result.tree;
    if (result.rateLimited) {
      rateLimited = true;
      break;
    }
    if (result.authRetryable) {
      authRetryable = true;
      break;
    }
  }
  if (!(rateLimited || authRetryable))
    return null;
  if (rateLimited)
    _rateLimitedThisSession = true;
  return fetchTreeWithAvailableAuth(ownerRepo, branches, getToken);
}
function getSkillFolderHashFromTree(tree, skillPath) {
  let folderPath = skillPath.replace(/\\/g, "/");
  if (folderPath.toLowerCase().endsWith("/skill.md"))
    folderPath = folderPath.slice(0, -9);
  else if (folderPath.toLowerCase().endsWith("skill.md"))
    folderPath = folderPath.slice(0, -8);
  if (folderPath.endsWith("/"))
    folderPath = folderPath.slice(0, -1);
  if (!folderPath)
    return tree.sha;
  return tree.tree.find((e) => e.type === "tree" && e.path === folderPath)?.sha ?? null;
}
var PRIORITY_PREFIXES = [
  "",
  "skills/",
  "skills/.curated/",
  "skills/.experimental/",
  "skills/.system/",
  ".agents/skills/",
  ".claude/skills/",
  ".cline/skills/",
  ".codebuddy/skills/",
  ".codex/skills/",
  ".commandcode/skills/",
  ".continue/skills/",
  ".factory/skills/",
  ".github/skills/",
  ".goose/skills/",
  ".grok/skills/",
  ".iflow/skills/",
  ".junie/skills/",
  ".kilo/skills/",
  ".kilocode/skills/",
  ".kimchi/skills/",
  ".kiro/skills/",
  ".minimax/skills/",
  ".mux/skills/",
  ".neovate/skills/",
  ".opencode/skills/",
  ".openhands/skills/",
  ".pi/skills/",
  ".posit/assistant/skills/",
  ".qoder/skills/",
  ".roo/skills/",
  ".trae/skills/",
  ".windsurf/skills/",
  ".zcode/skills/",
  ".zencoder/skills/"
];
function findSkillMdPaths(tree, subpath, extraContainers = []) {
  const allSkillMds = tree.tree.filter((e) => e.type === "blob" && e.path.split("/").at(-1).toLowerCase() === "skill.md").map((e) => e.path);
  const prefix = subpath ? subpath.endsWith("/") ? subpath : subpath + "/" : "";
  const filtered = prefix ? allSkillMds.filter((p3) => p3.startsWith(prefix) || p3 === prefix + "SKILL.md") : allSkillMds;
  if (filtered.length === 0)
    return [];
  const priorityResults = [];
  const seen = /* @__PURE__ */ new Set;
  const SKIP_DIRS2 = /* @__PURE__ */ new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "__pycache__"
  ]);
  const lowerSkillMdSet = new Set(filtered.map((p3) => p3.toLowerCase()));
  const extraPrefixes = extraContainers.reduce((prefixes, dir) => {
    const prefix2 = `${dir}/`;
    if (!PRIORITY_PREFIXES.includes(prefix2))
      prefixes.add(prefix2);
    return prefixes;
  }, /* @__PURE__ */ new Set);
  const priorityPrefixes = [...PRIORITY_PREFIXES, ...extraPrefixes];
  for (const priorityPrefix of priorityPrefixes) {
    const fullPrefix = prefix + priorityPrefix;
    const isContainer = priorityPrefix !== "";
    const isExtraContainer = extraPrefixes.has(priorityPrefix);
    for (const skillMd of filtered) {
      if (!skillMd.startsWith(fullPrefix))
        continue;
      const rest = skillMd.slice(fullPrefix.length);
      if (rest.toLowerCase() === "skill.md") {
        if (isExtraContainer)
          continue;
        if (!seen.has(skillMd)) {
          priorityResults.push(skillMd);
          seen.add(skillMd);
        }
        continue;
      }
      const parts = rest.split("/");
      if (parts.length === 2 && parts[1].toLowerCase() === "skill.md") {
        if (!seen.has(skillMd)) {
          priorityResults.push(skillMd);
          seen.add(skillMd);
        }
        continue;
      }
      const skillDirs = parts.slice(0, -1);
      const hasAncestorSkill = skillDirs.slice(0, -1).some((_3, index) => {
        const ancestorPath = skillDirs.slice(0, index + 1).join("/");
        return lowerSkillMdSet.has(`${fullPrefix}${ancestorPath}/SKILL.md`.toLowerCase());
      });
      if (isContainer && parts.length >= 3 && parts.length <= 4 && parts.at(-1).toLowerCase() === "skill.md" && skillDirs.every((part) => !SKIP_DIRS2.has(part)) && !hasAncestorSkill) {
        if (!seen.has(skillMd)) {
          priorityResults.push(skillMd);
          seen.add(skillMd);
        }
      }
    }
  }
  if (priorityResults.length > 0)
    return priorityResults;
  return filtered.filter((p3) => {
    return p3.split("/").length <= 6;
  });
}
async function fetchRawContent(ownerRepo, branch, filePath) {
  try {
    const url = `https://raw.githubusercontent.com/${ownerRepo}/${branch}/${filePath}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (!response.ok)
      return null;
    return await response.text();
  } catch {
    return null;
  }
}
async function fetchSkillsShPaths(ownerRepo, tree, subpath) {
  const configPath = (subpath ? subpath.replace(/\/+$/, "") + "/" : "") + SKILLS_SH_CONFIG_FILE;
  if (!tree.tree.some((e) => e.type === "blob" && e.path === configPath))
    return [];
  const content = await fetchRawContent(ownerRepo, tree.branch, configPath);
  return content ? parseSkillsShPaths(content) : [];
}
async function fetchSkillDownload(source, slug) {
  try {
    const [owner, repo] = source.split("/");
    const defaultUrl = `${DOWNLOAD_BASE_URL}/api/download/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`;
    const url = BLOB_ALLOWED_REPOS[source.toLowerCase()]?.downloadUrl(slug) ?? defaultUrl;
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (!response.ok)
      return null;
    return await response.json();
  } catch {
    return null;
  }
}
function computeSnapshotHash(files) {
  const hash = createHash$1("sha256");
  for (const file of [...files].sort((a2, b3) => a2.path.localeCompare(b3.path))) {
    hash.update(file.path);
    hash.update(file.contents);
  }
  return hash.digest("hex");
}
function getSkillFolderPath(skillMdPath) {
  const pathLower = skillMdPath.toLowerCase();
  if (pathLower.endsWith("/skill.md"))
    return skillMdPath.slice(0, -9);
  if (pathLower === "skill.md")
    return "";
  return skillMdPath.slice(0, -9);
}
var SNAPSHOT_EXCLUDED_FILES = /* @__PURE__ */ new Set(["metadata.json"]);
var SNAPSHOT_EXCLUDED_DIRS = /* @__PURE__ */ new Set([
  ".git",
  "__pycache__",
  "__pypackages__"
]);
function isInstallableSnapshotPath(path2) {
  const parts = path2.split("/");
  const fileName = parts.at(-1);
  if (!fileName || SNAPSHOT_EXCLUDED_FILES.has(fileName))
    return false;
  return parts.slice(0, -1).every((part) => !SNAPSHOT_EXCLUDED_DIRS.has(part));
}
function hasCompleteNestedSnapshot(tree, skillMdPath, files) {
  const folderPath = getSkillFolderPath(skillMdPath);
  if (!folderPath)
    return true;
  const folderPrefix = `${folderPath}/`;
  const snapshotPaths = new Set(files.map((file) => file.path));
  return tree.tree.every((entry) => {
    if (entry.type !== "blob" || !entry.path.startsWith(folderPrefix))
      return true;
    const relativePath = entry.path.slice(folderPrefix.length);
    return !isInstallableSnapshotPath(relativePath) || snapshotPaths.has(relativePath);
  });
}
async function tryBlobInstall(ownerRepo, options = {}) {
  if (options.ref !== undefined)
    return null;
  const tree = await fetchRepoTree(ownerRepo, options.ref, options.getToken);
  if (!tree)
    return null;
  const extraContainers = await fetchSkillsShPaths(ownerRepo, tree, options.subpath);
  let skillMdPaths = findSkillMdPaths(tree, options.subpath, extraContainers);
  if (skillMdPaths.length === 0)
    return null;
  if (options.skillFilter) {
    const filterSlug = toSkillSlug(options.skillFilter);
    const filtered = skillMdPaths.filter((p3) => {
      const parts = p3.split("/");
      if (parts.length < 2)
        return false;
      const folderName = parts[parts.length - 2];
      return toSkillSlug(folderName) === filterSlug;
    });
    if (filtered.length > 0)
      skillMdPaths = filtered;
  }
  const mdFetches = await Promise.all(skillMdPaths.map(async (mdPath) => {
    return {
      mdPath,
      content: await fetchRawContent(ownerRepo, tree.branch, mdPath)
    };
  }));
  const parsedSkills = [];
  for (const { mdPath, content } of mdFetches) {
    if (!content)
      continue;
    const { data } = parseFrontmatter(content);
    if (!data.name || !data.description)
      continue;
    if (typeof data.name !== "string" || typeof data.description !== "string")
      continue;
    if (data.metadata?.internal === true && !options.includeInternal)
      continue;
    const safeName = sanitizeMetadata(data.name);
    const safeDescription = sanitizeMetadata(data.description);
    parsedSkills.push({
      mdPath,
      name: safeName,
      description: safeDescription,
      content,
      slug: toSkillSlug(safeName),
      metadata: data.metadata
    });
  }
  if (parsedSkills.length === 0)
    return null;
  let filteredSkills = parsedSkills;
  if (options.skillFilter) {
    const filterSlug = toSkillSlug(options.skillFilter);
    const nameFiltered = parsedSkills.filter((s3) => s3.slug === filterSlug);
    if (nameFiltered.length > 0)
      filteredSkills = nameFiltered;
    if (filteredSkills.length === 0)
      return null;
  }
  const source = ownerRepo.toLowerCase();
  const downloads = await Promise.all(filteredSkills.map(async (skill) => {
    return {
      skill,
      download: await fetchSkillDownload(source, skill.slug)
    };
  }));
  if (!downloads.every((d) => d.download !== null))
    return null;
  if (!downloads.every(({ skill, download }) => hasCompleteNestedSnapshot(tree, skill.mdPath, download.files)))
    return null;
  return {
    skills: downloads.map(({ skill, download }) => {
      const files = getSkillFolderPath(skill.mdPath) ? download.files : download.files.filter((file) => file.path.toLowerCase() === "skill.md");
      return {
        name: skill.name,
        description: skill.description,
        path: "",
        rawContent: skill.content,
        metadata: skill.metadata,
        files,
        snapshotHash: computeSnapshotHash(files),
        repoPath: skill.mdPath
      };
    }),
    tree
  };
}
var BINARY_EXTENSIONS = /* @__PURE__ */ new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".wasm",
  ".parquet",
  ".arrow",
  ".pickle",
  ".pkl",
  ".npy",
  ".npz",
  ".model",
  ".onnx",
  ".pt",
  ".pth",
  ".h5",
  ".hdf5",
  ".safetensors"
]);
var EXCLUDED_SEGMENTS = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "__pycache__",
  ".venv",
  "venv"
]);
function extname$1(path2) {
  const base = path2.toLowerCase().split("/").pop() ?? "";
  const index = base.lastIndexOf(".");
  return index === -1 ? "" : base.slice(index);
}
async function collect(root, dir, out) {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const info = await lstat(full);
    if (info.isDirectory()) {
      if (!EXCLUDED_SEGMENTS.has(entry))
        await collect(root, full, out);
    } else if (info.isFile()) {
      const path2 = relative(root, full).split("\\").join("/");
      if (BINARY_EXTENSIONS.has(extname$1(path2)))
        continue;
      out.push({
        path: path2,
        contents: (await readFile(full)).toString("utf8")
      });
    }
  }
}
async function collectSkillsShFiles(dir) {
  const files = [];
  await collect(dir, dir, files);
  return files;
}
function computeSkillsShTreeHash(files) {
  const sorted2 = [...files].sort((a2, b3) => a2.path < b3.path ? -1 : a2.path > b3.path ? 1 : 0);
  const hash = createHash("sha256");
  hash.update(`skills-sh-tree-v2
${sorted2.length}
`);
  for (const file of sorted2) {
    const path2 = Buffer.from(file.path, "utf8");
    const contents = Buffer.from(file.contents, "utf8");
    hash.update(`${path2.length}
`);
    hash.update(path2);
    hash.update(`${contents.length}
`);
    hash.update(contents);
  }
  return hash.digest("hex");
}
var version$1 = "1.7.6";
var NOTION_API_VERSION = "2026-03-11";
var NTN_TIMEOUT_MS = 30000;
var NTN_MAX_BUFFER_BYTES = 10485760;
var NOTION_DOWNLOAD_MAX_BYTES = 52428800;
var NOTION_EXTRACT_MAX_BYTES = 104857600;
var NOTION_EXTRACT_MAX_FILES = 5000;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertString(value, field) {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Notion Agent Plugins response is missing ${field}`);
  return value;
}
function optionalMetadata(value, field) {
  if (value === undefined || value === null)
    return "";
  if (typeof value !== "string")
    throw new Error(`Notion Agent Plugins response has an invalid ${field}`);
  return sanitizeMetadata(value);
}
function parsePack(value) {
  if (!isRecord(value))
    throw new Error("Notion Agent Plugins response contains an invalid pack");
  if (typeof value.name !== "string")
    throw new Error("Notion Agent Plugins response is missing pack.name");
  const name = sanitizeMetadata(value.name);
  if (!name)
    return null;
  return {
    id: assertString(value.id, "pack.id"),
    name,
    description: optionalMetadata(value.description, "pack.description"),
    version_id: assertString(value.version_id, "pack.version_id")
  };
}
function parsePackList(value) {
  if (!isRecord(value) || !Array.isArray(value.results))
    throw new Error("Notion Agent Plugins list response is invalid");
  if (typeof value.has_more !== "boolean")
    throw new Error("Notion Agent Plugins list response is missing has_more");
  const nextCursor = value.next_cursor;
  if (nextCursor !== null && typeof nextCursor !== "string")
    throw new Error("Notion Agent Plugins list response has an invalid next_cursor");
  return {
    results: value.results.map(parsePack).filter((pack) => pack !== null),
    next_cursor: nextCursor,
    has_more: value.has_more
  };
}
function parseDirectory(value, label) {
  if (!isRecord(value))
    throw new Error(`Notion ${label} directory response is invalid`);
  return {
    id: assertString(value.id, `${label} directory id`),
    version_id: assertString(value.version_id, `${label} directory version_id`),
    url: assertString(value.url, `${label} directory url`)
  };
}
function downloadNotionDirectory(url) {
  return downloadSource(url, {
    downloadMaxBytes: NOTION_DOWNLOAD_MAX_BYTES,
    extractMaxBytes: NOTION_EXTRACT_MAX_BYTES,
    extractMaxFiles: NOTION_EXTRACT_MAX_FILES
  });
}
function debugNtn(args) {
  if (process.env.SKILLS_DEBUG === "1")
    console.error(`[notion] ntn ${args.join(" ")}`);
}
async function runNtnApi(args) {
  debugNtn(args);
  return new Promise((resolve2, reject) => {
    const child = spawn$1("ntn", args, {
      env: process.env,
      stdio: [
        "ignore",
        "pipe",
        "pipe"
      ]
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (callback) => {
      if (settled)
        return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const fail = (message) => finish(() => reject(new Error(message)));
    const append2 = (chunks, chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > NTN_MAX_BUFFER_BYTES) {
        child.kill("SIGTERM");
        fail("ntn api output exceeded 10 MiB");
        return;
      }
      chunks.push(chunk);
    };
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      fail(`ntn api timed out after ${NTN_TIMEOUT_MS / 1000} seconds`);
    }, NTN_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => append2(stdoutChunks, chunk));
    child.stderr.on("data", (chunk) => append2(stderrChunks, chunk));
    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        fail("Notion CLI (ntn) is required. Install it from:\nhttps://developers.notion.com/cli/get-started/overview\nThen run `ntn login`.");
        return;
      }
      fail(`Unable to start ntn: ${stripTerminalEscapes(error.message)}`);
    });
    child.on("close", (code) => {
      const stdout2 = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = stripTerminalEscapes(Buffer.concat(stderrChunks).toString("utf8")).trim();
      if (code === 0) {
        finish(() => resolve2(stdout2));
        return;
      }
      fail(`ntn api failed${stderr ? `: ${stderr}` : ` with exit code ${code ?? "unknown"}`}`);
    });
  });
}
async function fetchNotionJson(args, label, runNtn = runNtnApi) {
  const output = await runNtn([
    "api",
    ...args,
    "--notion-version",
    NOTION_API_VERSION
  ]);
  try {
    return JSON.parse(output);
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`ntn returned invalid JSON for ${label}`);
    throw error;
  }
}
async function fetchNotionPacks(options = {}) {
  const runNtn = options.runNtn ?? runNtnApi;
  const packs = [];
  const seenCursors = /* @__PURE__ */ new Set;
  let cursor = null;
  do {
    const args = ["/v1/ai/plugins", "page_size==100"];
    if (cursor)
      args.push(`start_cursor==${cursor}`);
    const page = parsePackList(await fetchNotionJson(args, "the Notion packs list", runNtn));
    packs.push(...page.results);
    if (!page.has_more)
      break;
    if (!page.next_cursor || seenCursors.has(page.next_cursor))
      throw new Error("Notion Agent Plugins pagination returned an invalid cursor");
    cursor = page.next_cursor;
    seenCursors.add(cursor);
  } while (cursor);
  return packs;
}
async function fetchNotionPackDirectory(pack, options = {}) {
  const directory = parseDirectory(await fetchNotionJson([`/v1/ai/plugins/${encodeURIComponent(pack.id)}`], `Notion pack ${JSON.stringify(pack.name)}`, options.runNtn), "pack");
  if (directory.id !== pack.id || directory.version_id !== pack.version_id)
    throw new Error(`Notion pack ${JSON.stringify(pack.name)} changed while preparing installation`);
  return directory;
}
async function fetchNotionWorkspaceName(options = {}) {
  const runNtn = options.runNtn ?? runNtnApi;
  try {
    const value = JSON.parse(await runNtn([
      "api",
      "/v1/users/me",
      "--notion-version",
      NOTION_API_VERSION
    ]));
    if (!isRecord(value) || !isRecord(value.bot))
      return null;
    const name = value.bot.workspace_name;
    return typeof name === "string" && name.length > 0 ? sanitizeMetadata(name) : null;
  } catch {
    return null;
  }
}
function inWorkspace(workspace) {
  return workspace ? ` in workspace ${import_picocolors2.default.cyan(workspace)}` : "";
}
function isNotionSource(source) {
  return source.toLowerCase() === "notion";
}
var NOTION_HOSTNAME = /(^|\.)notion\.(so|com)$/;
var NOTION_PAGE_ID = /(?:^|-)([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
function formatPageId(rawId) {
  const hex = rawId.replace(/-/g, "");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function parseNotionSkillUrl(source) {
  let url;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    return null;
  if (!NOTION_HOSTNAME.test(url.hostname.toLowerCase()))
    return null;
  const lastSegment = url.pathname.split("/").filter(Boolean).pop();
  if (!lastSegment)
    return null;
  let decoded;
  try {
    decoded = decodeURIComponent(lastSegment);
  } catch {
    decoded = lastSegment;
  }
  const match = decoded.toLowerCase().match(NOTION_PAGE_ID);
  return match ? formatPageId(match[1]) : null;
}
async function fetchNotionSkillDirectory(pageId, options = {}) {
  return parseDirectory(await fetchNotionJson([`/v1/ai/skills/${encodeURIComponent(pageId)}`], `Notion skill ${pageId}`, options.runNtn), "skill");
}
async function prepareNotionSkillSource(pageId, options = {}) {
  const download = options.download ?? downloadNotionDirectory;
  const spinner$5 = spinner();
  spinner$5.start("Fetching Notion skill with ntn…");
  try {
    const [directory, workspace] = await Promise.all([fetchNotionSkillDirectory(pageId, { runNtn: options.runNtn }), fetchNotionWorkspaceName({ runNtn: options.runNtn })]);
    const downloaded = await download(directory.url);
    spinner$5.stop(`Downloaded skill from Notion${inWorkspace(workspace)}`);
    return {
      rootDir: downloaded.rootDir,
      tempDir: downloaded.tempDir
    };
  } catch (error) {
    spinner$5.stop(import_picocolors2.default.red("Failed to prepare Notion skill"));
    throw error;
  }
}
function normalizeSelector(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function filterPacks(packs, selectors) {
  if (selectors.includes("*"))
    return packs;
  const normalized = new Set(selectors.map(normalizeSelector));
  return packs.filter((pack) => normalized.has(normalizeSelector(pack.name)) || normalized.has(pack.id.toLowerCase()));
}
function sortedPacks(packs) {
  return [...packs].sort((a2, b3) => a2.name.localeCompare(b3.name));
}
function printAvailablePacks(packs) {
  console.log();
  log.step(import_picocolors2.default.bold("Available Notion packs"));
  for (const pack of sortedPacks(packs)) {
    log.message(import_picocolors2.default.cyan(pack.name));
    if (pack.description)
      log.message(`  ${import_picocolors2.default.dim(pack.description)}`);
  }
}
async function prepareNotionPackSource(options = {}) {
  const spinner$6 = spinner();
  spinner$6.start("Fetching Notion packs with ntn…");
  let packs;
  let workspace = null;
  try {
    [packs, workspace] = await Promise.all([fetchNotionPacks({ runNtn: options.runNtn }), fetchNotionWorkspaceName({ runNtn: options.runNtn })]);
  } catch (error) {
    spinner$6.stop(import_picocolors2.default.red("Failed to load Notion packs"));
    throw error;
  }
  spinner$6.stop(`Found ${import_picocolors2.default.green(packs.length)} Notion pack${packs.length === 1 ? "" : "s"}${inWorkspace(workspace)}`);
  if (packs.length === 0)
    throw new Error("Notion returned no packs for the authenticated workspace");
  if (options.list) {
    printAvailablePacks(packs);
    outro(import_picocolors2.default.dim("Select a pack by running the command without --list."));
    return null;
  }
  let selectedPacks;
  if (options.skill && options.skill.length > 0) {
    selectedPacks = filterPacks(packs, options.skill);
    if (selectedPacks.length === 0)
      throw new Error(`No matching Notion packs found for: ${options.skill.join(", ")}`);
  } else if (options.yes || !process.stdin.isTTY)
    selectedPacks = packs;
  else {
    const selected = await searchMultiselect({
      message: `Select Notion packs to install ${import_picocolors2.default.dim("(space to toggle)")}`,
      items: sortedPacks(packs).map((pack) => ({
        value: pack,
        label: pack.name,
        detail: pack.description || "Notion plugin pack"
      })),
      required: true,
      maxVisible: 20,
      searchable: false,
      showDetail: true,
      showSelectedSummary: false
    });
    if (typeof selected === "symbol") {
      cancel("Selection cancelled");
      return null;
    }
    selectedPacks = selected;
  }
  note(selectedPacks.map((pack) => import_picocolors2.default.cyan(pack.name)).join(`
`), `Selected ${selectedPacks.length} Notion pack${selectedPacks.length === 1 ? "" : "s"}`);
  const stagingDir = await mkdtemp$1(join$1(tmpdir$1(), "skills-notion-"));
  const packsDir = join$1(stagingDir, "packs");
  const manifestPlugins = [];
  const download = options.download ?? downloadNotionDirectory;
  const discover = options.discover ?? discoverSkills;
  let skillCount = 0;
  spinner$6.start("Preparing selected Notion packs…");
  try {
    await mkdir$1(packsDir, { recursive: true });
    for (const [index, pack] of selectedPacks.entries()) {
      let downloaded = null;
      try {
        downloaded = await download((await fetchNotionPackDirectory(pack, { runNtn: options.runNtn })).url);
        const skills = await discover(downloaded.rootDir, undefined, {
          includeInternal: true,
          fullDepth: true
        });
        if (skills.length === 0)
          throw new Error("pack contains no valid skills");
        const directoryName = `pack-${index + 1}-${sanitizeName(pack.name).slice(0, 100)}`;
        const targetDir = join$1(packsDir, directoryName);
        await cp$1(downloaded.rootDir, targetDir, {
          recursive: true,
          force: false,
          errorOnExist: true
        });
        manifestPlugins.push({
          name: pack.name,
          source: `./${directoryName}`,
          skills: skills.map((skill) => {
            const skillPath = relative$1(downloaded.rootDir, skill.path).split(sep$1).join("/");
            return skillPath ? `./${skillPath}` : "./.";
          })
        });
        skillCount += skills.length;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to prepare Notion pack ${JSON.stringify(pack.name)}: ${detail}`);
      } finally {
        if (downloaded)
          await cleanupTempDir(downloaded.tempDir).catch(() => {});
      }
    }
    const manifestDir = join$1(stagingDir, ".claude-plugin");
    await mkdir$1(manifestDir, { recursive: true });
    await writeFile$1(join$1(manifestDir, "marketplace.json"), `${JSON.stringify({
      metadata: { pluginRoot: "./packs" },
      plugins: manifestPlugins
    }, null, 2)}
`, "utf8");
    spinner$6.stop(`Prepared ${import_picocolors2.default.green(selectedPacks.length)} Notion pack${selectedPacks.length === 1 ? "" : "s"} with ${import_picocolors2.default.green(skillCount)} skill${skillCount === 1 ? "" : "s"}`);
    return {
      rootDir: stagingDir,
      tempDir: stagingDir,
      packCount: selectedPacks.length,
      skillCount
    };
  } catch (error) {
    spinner$6.stop(import_picocolors2.default.red("Failed to prepare Notion packs"));
    await cleanupTempDir(stagingDir).catch(() => {});
    throw error;
  }
}
var isCancelled$1 = (value) => typeof value === "symbol";
var EVE_AGENT_LABEL = "eve agent";
async function isSourcePrivate(source) {
  const ownerRepo = parseOwnerRepo(source);
  if (!ownerRepo)
    return false;
  return isRepoPrivate(ownerRepo.owner, ownerRepo.repo);
}
function getLockSource(parsedUrl, normalizedSource) {
  if (parsedUrl.startsWith("git@") || parsedUrl.startsWith("ssh://"))
    return parsedUrl;
  if (parsedUrl.startsWith("http://") || parsedUrl.startsWith("https://"))
    try {
      if (new URL(parsedUrl).hostname !== "github.com")
        return parsedUrl;
    } catch {
      return normalizedSource;
    }
  return normalizedSource;
}
function getProjectLockSourceUrl(sourceType, sourceUrl) {
  return sourceType === "git" || sourceType === "gitlab" ? sourceUrl : undefined;
}
function initTelemetry(version) {
  setVersion(version);
}
function riskLabel(risk) {
  switch (risk) {
    case "critical":
      return import_picocolors2.default.red(import_picocolors2.default.bold("Critical Risk"));
    case "high":
      return import_picocolors2.default.red("High Risk");
    case "medium":
      return import_picocolors2.default.yellow("Med Risk");
    case "low":
      return import_picocolors2.default.green("Low Risk");
    case "safe":
      return import_picocolors2.default.green("Safe");
    default:
      return import_picocolors2.default.dim("--");
  }
}
function socketLabel(audit) {
  if (!audit)
    return import_picocolors2.default.dim("--");
  const count = audit.alerts ?? 0;
  return count > 0 ? import_picocolors2.default.red(`${count} alert${count !== 1 ? "s" : ""}`) : import_picocolors2.default.green("0 alerts");
}
function padEnd(str, width) {
  const visible = stripTerminalEscapes(str);
  const pad = Math.max(0, width - visible.length);
  return str + " ".repeat(pad);
}
function buildSecurityLines(auditData, skills, source) {
  if (!auditData)
    return [];
  if (!skills.some((s3) => {
    const data = auditData[s3.slug];
    return data && Object.keys(data).length > 0;
  }))
    return [];
  const nameWidth = Math.min(Math.max(...skills.map((s3) => s3.displayName.length)), 36);
  const lines = [];
  const header = padEnd("", nameWidth + 2) + padEnd(import_picocolors2.default.dim("Gen"), 18) + padEnd(import_picocolors2.default.dim("Socket"), 18) + import_picocolors2.default.dim("Snyk");
  lines.push(header);
  for (const skill of skills) {
    const data = auditData[skill.slug];
    const name = skill.displayName.length > nameWidth ? skill.displayName.slice(0, nameWidth - 1) + "…" : skill.displayName;
    const ath = data?.ath ? riskLabel(data.ath.risk) : import_picocolors2.default.dim("--");
    const socket = data?.socket ? socketLabel(data.socket) : import_picocolors2.default.dim("--");
    const snyk = data?.snyk ? riskLabel(data.snyk.risk) : import_picocolors2.default.dim("--");
    lines.push(padEnd(import_picocolors2.default.cyan(name), nameWidth + 2) + padEnd(ath, 18) + padEnd(socket, 18) + snyk);
  }
  lines.push("");
  lines.push(`${import_picocolors2.default.dim("Details:")} ${import_picocolors2.default.dim(`https://skills.sh/${source}`)}`);
  return lines;
}
function shortenPath$2(fullPath, cwd) {
  const home2 = homedir();
  if (fullPath === home2 || fullPath.startsWith(home2 + sep))
    return "~" + fullPath.slice(home2.length);
  if (fullPath === cwd || fullPath.startsWith(cwd + sep))
    return "." + fullPath.slice(cwd.length);
  return fullPath;
}
function formatList$1(items, maxShow = 5) {
  if (items.length <= maxShow)
    return items.join(", ");
  const shown = items.slice(0, maxShow);
  const remaining = items.length - maxShow;
  return `${shown.join(", ")} +${remaining} more`;
}
function formatSkillPromptSubject(skills) {
  const namedSubject = formatList$1(skills.map((skill) => import_picocolors2.default.cyan(getSkillDisplayName(skill))), 3);
  return stripTerminalEscapes(namedSubject).length <= 80 ? namedSubject : `${skills.length} selected skills`;
}
function formatEveInstallPromptMessage(skills) {
  return `Detected an eve project. Install ${formatSkillPromptSubject(skills)} for your ${EVE_AGENT_LABEL} to use?`;
}
function splitAgentsByType(agentTypes) {
  const universal = [];
  const symlinked = [];
  for (const a2 of agentTypes)
    if (isUniversalAgent(a2))
      universal.push(agents[a2].displayName);
    else
      symlinked.push(agents[a2].displayName);
  return {
    universal,
    symlinked
  };
}
function buildAgentSummaryLines(targetAgents, installMode) {
  const lines = [];
  const { universal, symlinked } = splitAgentsByType(targetAgents);
  if (installMode === "symlink") {
    if (universal.length > 0)
      lines.push(`  ${import_picocolors2.default.green("universal:")} ${formatList$1(universal)}`);
    if (symlinked.length > 0)
      lines.push(`  ${import_picocolors2.default.dim("symlink →")} ${formatList$1(symlinked)}`);
  } else {
    const allNames = targetAgents.map((a2) => agents[a2].displayName);
    lines.push(`  ${import_picocolors2.default.dim("copy →")} ${formatList$1(allNames)}`);
  }
  return lines;
}
function targetDisplayName(target) {
  const base = agents[target.agent].displayName;
  return target.subagent ? `${base} (${target.subagent})` : base;
}
function targetKey(target) {
  return target.subagent ? `${target.agent}:${target.subagent}` : target.agent;
}
function buildInstallTargets(targetAgents, eveSubagentTargets) {
  const targets = [];
  for (const agent of targetAgents)
    if (agent === "eve")
      for (const subagent of eveSubagentTargets)
        targets.push({
          agent,
          subagent
        });
    else
      targets.push({ agent });
  return targets;
}
function buildTargetSummaryLines(targets, installMode) {
  const lines = [];
  const rootAgents = targets.filter((t2) => !t2.subagent).map((t2) => t2.agent);
  const subagentNames = targets.filter((t2) => t2.subagent).map(targetDisplayName);
  const { universal, symlinked } = splitAgentsByType(rootAgents);
  if (installMode === "symlink") {
    if (universal.length > 0)
      lines.push(`  ${import_picocolors2.default.green("universal:")} ${formatList$1(universal)}`);
    if (symlinked.length > 0)
      lines.push(`  ${import_picocolors2.default.dim("symlink →")} ${formatList$1(symlinked)}`);
    if (subagentNames.length > 0)
      lines.push(`  ${import_picocolors2.default.dim("copy →")} ${formatList$1(subagentNames)}`);
  } else {
    const allNames = targets.map(targetDisplayName);
    lines.push(`  ${import_picocolors2.default.dim("copy →")} ${formatList$1(allNames)}`);
  }
  return lines;
}
function ensureUniversalAgents(targetAgents) {
  const universalAgents = getUniversalAgents();
  const result = [...targetAgents];
  for (const ua of universalAgents)
    if (!result.includes(ua))
      result.push(ua);
  return result;
}
async function nonInteractiveTargetAgents() {
  const detected = await detectAgent();
  const hostAgent = detected.isAgent ? getAgentType(detected.agent.name) : null;
  if (hostAgent)
    return ensureUniversalAgents([hostAgent]);
  const installed = await detectInstalledAgents();
  if (installed.includes("eve"))
    return ["eve"];
  if (installed.length === 0)
    return Object.keys(agents);
  return ensureUniversalAgents(installed);
}
function defaultInstallMode(targets) {
  const allEve = targets.every((t2) => t2.agent === "eve");
  return new Set(targets.map((t2) => t2.subagent ? `eve:subagent:${t2.subagent}` : agents[t2.agent].skillsDir)).size <= 1 || allEve ? "copy" : "symlink";
}
function buildResultLines(results, targetAgents) {
  const lines = [];
  const { universal, symlinked: symlinkAgents } = splitAgentsByType(targetAgents);
  const successfulSymlinks = results.filter((r3) => !r3.symlinkFailed && !r3.skipped && !universal.includes(r3.agent)).map((r3) => r3.agent);
  const failedSymlinks = results.filter((r3) => r3.symlinkFailed && !r3.skipped).map((r3) => r3.agent);
  const skippedSymlinks = results.filter((r3) => r3.skipped && r3.skipReason === "missing-agent-project-directory" && symlinkAgents.includes(r3.agent)).map((r3) => r3.agent);
  if (universal.length > 0)
    lines.push(`  ${import_picocolors2.default.green("universal:")} ${formatList$1(universal)}`);
  if (successfulSymlinks.length > 0)
    lines.push(`  ${import_picocolors2.default.dim("symlinked:")} ${formatList$1(successfulSymlinks)}`);
  if (failedSymlinks.length > 0)
    lines.push(`  ${import_picocolors2.default.yellow("copied:")} ${formatList$1(failedSymlinks)}`);
  if (skippedSymlinks.length > 0)
    lines.push(`  ${import_picocolors2.default.yellow("skipped:")} ${formatList$1(skippedSymlinks)} ${import_picocolors2.default.dim("(project directory not found)")}`);
  return lines;
}
function exitInstallationCancelled() {
  cancel("Installation cancelled");
  if (!process.stdin.isTTY) {
    console.error("Interactive prompt required but stdin is not a TTY. Nothing was installed. Use --agent <name> (or --agent '*') and -y to run non-interactively.");
    process.exit(1);
  }
  process.exit(0);
}
async function promptForAgents(message, choices) {
  let lastSelected;
  try {
    lastSelected = await getLastSelectedAgents();
  } catch {}
  const validAgents = choices.map((c4) => c4.value);
  const defaultValues = [
    "claude-code",
    "opencode",
    "codex",
    "grok"
  ].filter((a2) => validAgents.includes(a2));
  let initialValues = [];
  if (lastSelected && lastSelected.length > 0)
    initialValues = lastSelected.filter((a2) => validAgents.includes(a2));
  if (initialValues.length === 0)
    initialValues = defaultValues;
  const selected = await searchMultiselect({
    message,
    items: choices,
    initialSelected: initialValues,
    required: true
  });
  if (!isCancelled$1(selected))
    try {
      await saveSelectedAgents(selected);
    } catch {}
  return selected;
}
function skipAgentsWithoutGlobalDir(targetAgents, options) {
  if (!options.global || options.explicit)
    return targetAgents;
  const skipped = targetAgents.filter((a2) => agents[a2].globalSkillsDir === undefined);
  if (skipped.length === 0 || skipped.length === targetAgents.length)
    return targetAgents;
  log.info(`Skipping ${skipped.map((a2) => agents[a2].displayName).join(", ")}: no global skills directory`);
  return targetAgents.filter((a2) => agents[a2].globalSkillsDir !== undefined);
}
async function selectAgentsInteractive(options) {
  const supportsGlobalFilter = (a2) => !options.global || agents[a2].globalSkillsDir;
  const universalAgents = getUniversalAgents().filter(supportsGlobalFilter);
  const visibleUniversalAgents = getVisibleUniversalAgents().filter(supportsGlobalFilter);
  const otherAgents = getNonUniversalAgents().filter((agent) => agent !== "eve" && supportsGlobalFilter(agent));
  const universalSection = {
    title: "Universal (.agents/skills)",
    items: visibleUniversalAgents.map((a2) => ({
      value: a2,
      label: agents[a2].displayName
    })),
    hiddenCount: universalAgents.length - visibleUniversalAgents.length
  };
  const otherChoices = otherAgents.map((a2) => ({
    value: a2,
    label: agents[a2].displayName,
    hint: options.global ? agents[a2].globalSkillsDir : agents[a2].skillsDir
  }));
  let lastSelected;
  try {
    lastSelected = await getLastSelectedAgents();
  } catch {}
  const selected = await searchMultiselect({
    message: "Which agents do you want to install to?",
    items: otherChoices,
    initialSelected: lastSelected ? lastSelected.filter((a2) => otherAgents.includes(a2) && !universalAgents.includes(a2)) : [],
    lockedSection: universalSection
  });
  if (!isCancelled$1(selected))
    try {
      await saveSelectedAgents(selected);
    } catch {}
  return selected;
}
setVersion(version$1);
function buildJsonSecurity(auditData, skillName, source) {
  const data = auditData?.[skillName];
  if (!data || Object.keys(data).length === 0)
    return null;
  const socketAlerts = data.socket?.alerts ?? 0;
  return {
    ...data.ath && { gen: data.ath.risk },
    ...data.socket && { socket: `${socketAlerts} alert${socketAlerts !== 1 ? "s" : ""}` },
    ...data.snyk && { snyk: data.snyk.risk },
    ...source && { details: `https://skills.sh/${source}` }
  };
}
function isSkillsShPackUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") === "skills.sh" && /^\/p\/[^/]+/.test(parsed.pathname);
  } catch {
    return false;
  }
}
function getPackSkillPointer(skill) {
  const source = skill.indexEntry.source;
  if (!source || typeof source !== "object")
    return null;
  const { repo, skill: skillId, treeHash } = source;
  if (typeof repo !== "string" || typeof skillId !== "string")
    return null;
  if (typeof treeHash !== "string" || !/^[0-9a-f]{64}$/.test(treeHash))
    return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+$/.test(repo) || repo.includes(".."))
    return null;
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skillId) || skillId.includes(".."))
    return null;
  return {
    repo,
    skill: skillId,
    treeHash
  };
}
function normalizePointerSkillName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
async function fetchedSkillTreeHash(skill) {
  return computeSkillsShTreeHash("snapshotHash" in skill ? skill.files : await collectSkillsShFiles(skill.path));
}
async function installPackPointerSkills(skills, options) {
  const byRepo = /* @__PURE__ */ new Map;
  for (const skill of skills) {
    const pointer = getPackSkillPointer(skill);
    if (!pointer)
      continue;
    const key = pointer.repo.toLowerCase();
    const group = byRepo.get(key) ?? {
      entries: [],
      ids: [],
      pins: /* @__PURE__ */ new Map
    };
    group.entries.push(skill);
    group.ids.push(pointer.skill);
    group.pins.set(normalizePointerSkillName(pointer.skill), pointer.treeHash);
    byRepo.set(key, group);
  }
  const done = /* @__PURE__ */ new Set;
  if (byRepo.size === 0)
    return done;
  const repos = [...byRepo.keys()];
  const fetched = await fetchSources(repos.map((repo) => ({
    parsed: parseSource(repo),
    skills: byRepo.get(repo).ids
  })));
  const resultLines = [];
  for (const [index, source] of fetched.entries()) {
    const repo = repos[index];
    const group = byRepo.get(repo);
    try {
      const outcome = await installFetched(source, {
        skills: group.ids,
        placement: {
          global: options.global,
          targets: options.targetAgents.map((agent) => ({ agent })),
          mode: options.mode
        },
        select: async (candidates) => {
          const matching = [];
          for (const candidate of candidates) {
            const pin = group.pins.get(normalizePointerSkillName(candidate.name));
            const hash = await fetchedSkillTreeHash(candidate).catch(() => null);
            if (pin && hash === pin)
              matching.push(candidate);
            else
              log.message(import_picocolors2.default.dim(`  ${getSkillDisplayName(candidate)} changed in ${repo} since this pack pinned it; using the pack's copy`));
          }
          return matching;
        }
      });
      if (outcome.installed.length === 0)
        continue;
      const installedIds = new Set(outcome.installed.map(({ skill }) => normalizePointerSkillName(skill.name)));
      group.entries.forEach((entry, i2) => {
        if (installedIds.has(normalizePointerSkillName(group.ids[i2])))
          done.add(entry);
      });
      for (const { skill } of outcome.installed)
        resultLines.push(`${import_picocolors2.default.green("✓")} ${getSkillDisplayName(skill)} ${import_picocolors2.default.dim(`from ${repo}`)}`);
      const resolved = source.resolved;
      const installedSkills = outcome.installed.map(({ skill }) => skill);
      const skillFiles = getSkillRepoPaths(resolved, installedSkills);
      if (await isSourcePrivate(repo).catch(() => null) === false)
        track({
          event: "install",
          source: repo,
          skills: installedSkills.map((skill) => skill.name).join(","),
          agents: options.targetAgents.join(","),
          ...options.global && { global: "1" },
          skillFiles: JSON.stringify(skillFiles),
          metadata: options.metadata
        });
      try {
        if (options.global) {
          const tree = resolved.blobResult?.tree ?? await fetchRepoTree(repo, source.parsed.ref, getGitHubToken);
          for (const skill of installedSkills) {
            const skillPath = skillFiles[skill.name];
            await addSkillToLock(skill.name, {
              source: getLockSource(source.parsed.url, repo) || repo,
              sourceType: source.parsed.type,
              sourceUrl: source.parsed.url,
              ref: source.parsed.ref,
              skillPath,
              skillFolderHash: tree && skillPath && getSkillFolderHashFromTree(tree, skillPath) || "",
              pluginName: skill.pluginName
            });
          }
        } else
          await recordProjectLock(source, outcome.installed);
      } catch {}
    } finally {
      await releaseSource(source);
    }
  }
  if (resultLines.length > 0) {
    console.log();
    note(resultLines.join(`
`), import_picocolors2.default.green("Installed from source"));
  }
  return done;
}
function logAutoSelectedSkills(entries) {
  const only = entries.length === 1 ? entries[0] : null;
  if (!only) {
    log.info(`Installing all ${entries.length} skills`);
    return;
  }
  log.info(`Skill: ${import_picocolors2.default.cyan(only.label)}`);
  if (only.description)
    log.message(import_picocolors2.default.dim(only.description));
}
async function handleWellKnownSkills(source, url, options, spinner2) {
  spinner2.start("Discovering skills from well-known endpoint...");
  let skills = [];
  try {
    skills = await wellKnownProvider.fetchAllSkills(url, { includeInternal: Boolean(options.skill && options.skill.length > 0 && !options.skill.includes("*")) });
  } catch (error) {
    if (error instanceof WellKnownScopeNotFoundError) {
      spinner2.stop(import_picocolors2.default.red("No matching skills"));
      log.error(error.message);
      process.exit(1);
    }
  }
  if (skills.length === 0) {
    spinner2.stop(import_picocolors2.default.dim("No well-known skills found; trying direct download..."));
    return false;
  }
  spinner2.stop(`Found ${import_picocolors2.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
  for (const skill of skills) {
    log.info(`Skill: ${import_picocolors2.default.cyan(skill.installName)}`);
    log.message(import_picocolors2.default.dim(skill.description));
    if (skill.files.size > 1)
      log.message(import_picocolors2.default.dim(`  Files: ${Array.from(skill.files.keys()).join(", ")}`));
  }
  if (options.list) {
    console.log();
    log.step(import_picocolors2.default.bold("Available Skills"));
    for (const skill of skills) {
      log.message(`  ${import_picocolors2.default.cyan(skill.installName)}`);
      log.message(`    ${import_picocolors2.default.dim(skill.description)}`);
      if (skill.files.size > 1)
        log.message(`    ${import_picocolors2.default.dim(`Files: ${skill.files.size}`)}`);
    }
    console.log();
    outro("Run without --list to install");
    process.exit(0);
  }
  let selectedSkills;
  const logWellKnown = (chosen) => logAutoSelectedSkills(chosen.map((s3) => ({
    label: s3.installName,
    description: s3.description
  })));
  if (options.skill?.includes("*")) {
    selectedSkills = skills;
    logWellKnown(selectedSkills);
  } else if (options.skill && options.skill.length > 0) {
    selectedSkills = skills.filter((s3) => options.skill.some((name) => s3.installName.toLowerCase() === name.toLowerCase() || s3.name.toLowerCase() === name.toLowerCase()));
    if (selectedSkills.length === 0) {
      log.error(`No matching skills found for: ${options.skill.join(", ")}`);
      log.info("Available skills:");
      for (const s3 of skills)
        log.message(`  - ${s3.installName}`);
      process.exit(1);
    }
  } else if (skills.length === 1 || options.yes) {
    selectedSkills = skills;
    logWellKnown(selectedSkills);
  } else {
    const selected = await searchMultiselect({
      message: "Select skills to install",
      items: skills.map((s3) => ({
        value: s3,
        label: s3.installName,
        hint: s3.description.length > 60 ? s3.description.slice(0, 57) + "…" : s3.description
      })),
      initialSelected: isSkillsShPackUrl(url) ? skills : undefined,
      required: true,
      maxVisible: 20,
      selectAll: true
    });
    if (isCancelled$1(selected))
      exitInstallationCancelled();
    selectedSkills = selected;
  }
  let targetAgents;
  const validAgents = Object.keys(agents);
  if (options.agent?.includes("*")) {
    targetAgents = validAgents;
    log.info(`Installing to all ${targetAgents.length} agents`);
  } else if (options.agent && options.agent.length > 0)
    targetAgents = options.agent;
  else {
    spinner2.start("Loading agents…");
    const installedAgents = await detectInstalledAgents();
    const totalAgents = Object.keys(agents).length;
    spinner2.stop(`${totalAgents} agents`);
    if (installedAgents.length === 0)
      if (options.yes) {
        targetAgents = validAgents;
        log.info("Installing to all agents");
      } else {
        log.info("Select agents to install skills to");
        const selected = await promptForAgents("Which agents do you want to install to?", Object.entries(agents).map(([key, config]) => ({
          value: key,
          label: config.displayName
        })));
        if (isCancelled$1(selected))
          exitInstallationCancelled();
        targetAgents = selected;
      }
    else if (installedAgents.length === 1 || options.yes) {
      targetAgents = ensureUniversalAgents(installedAgents);
      if (installedAgents.length === 1) {
        const firstAgent = installedAgents[0];
        log.info(`Installing to: ${import_picocolors2.default.cyan(agents[firstAgent].displayName)}`);
      } else
        log.info(`Installing to: ${installedAgents.map((a2) => import_picocolors2.default.cyan(agents[a2].displayName)).join(", ")}`);
    } else {
      const selected = await selectAgentsInteractive({ global: options.global });
      if (isCancelled$1(selected))
        exitInstallationCancelled();
      targetAgents = selected;
    }
  }
  let installGlobally = options.global ?? false;
  const supportsGlobal = targetAgents.some((a2) => agents[a2].globalSkillsDir !== undefined);
  if (options.global === undefined && !options.yes && supportsGlobal) {
    const scope = await select({
      message: "Installation scope",
      options: [{
        value: false,
        label: "Project",
        hint: "Install in current directory (committed with your project)"
      }, {
        value: true,
        label: "Global",
        hint: "Install in home directory (available across all projects)"
      }]
    });
    if (isCancel(scope))
      exitInstallationCancelled();
    installGlobally = scope;
  }
  targetAgents = skipAgentsWithoutGlobalDir(targetAgents, {
    global: installGlobally,
    explicit: options.agent !== undefined
  });
  if (!installGlobally)
    await readLocalLock();
  let installMode = options.copy ? "copy" : "symlink";
  const uniqueDirs = new Set(targetAgents.map((a2) => agents[a2].skillsDir));
  if (!options.copy && !options.yes && uniqueDirs.size > 1) {
    const modeChoice = await select({
      message: "Installation method",
      options: [{
        value: "symlink",
        label: "Symlink (Recommended)",
        hint: "Single source of truth, easy updates"
      }, {
        value: "copy",
        label: "Copy to all agents",
        hint: "Independent copies for each agent"
      }]
    });
    if (isCancel(modeChoice))
      exitInstallationCancelled();
    installMode = modeChoice;
  } else if (uniqueDirs.size <= 1)
    installMode = "copy";
  const cwd = process.cwd();
  const summaryLines = [];
  targetAgents.map((a2) => agents[a2].displayName);
  const overwriteChecks = await Promise.all(selectedSkills.flatMap((skill) => targetAgents.map(async (agent) => ({
    skillName: skill.installName,
    agent,
    installed: await isSkillInstalled(skill.installName, agent, { global: installGlobally })
  }))));
  const overwriteStatus = /* @__PURE__ */ new Map;
  for (const { skillName, agent, installed } of overwriteChecks) {
    if (!overwriteStatus.has(skillName))
      overwriteStatus.set(skillName, /* @__PURE__ */ new Map);
    overwriteStatus.get(skillName).set(agent, installed);
  }
  for (const skill of selectedSkills) {
    if (summaryLines.length > 0)
      summaryLines.push("");
    const shortCanonical = shortenPath$2(getCanonicalPath(skill.installName, { global: installGlobally }), cwd);
    summaryLines.push(`${import_picocolors2.default.cyan(shortCanonical)}`);
    summaryLines.push(...buildAgentSummaryLines(targetAgents, installMode));
    const pointer = isSkillsShPackUrl(url) ? getPackSkillPointer(skill) : null;
    if (pointer)
      summaryLines.push(`  ${import_picocolors2.default.dim("source:")} ${pointer.repo}`);
    if (skill.files.size > 1)
      summaryLines.push(`  ${import_picocolors2.default.dim("files:")} ${skill.files.size}`);
    const skillOverwrites = overwriteStatus.get(skill.installName);
    const overwriteAgents = targetAgents.filter((a2) => skillOverwrites?.get(a2)).map((a2) => agents[a2].displayName);
    if (overwriteAgents.length > 0)
      summaryLines.push(`  ${import_picocolors2.default.yellow("overwrites:")} ${formatList$1(overwriteAgents)}`);
  }
  console.log();
  note(summaryLines.join(`
`), "Installation Summary");
  if (!options.yes) {
    const confirmed = await confirm({ message: "Proceed with installation?" });
    if (isCancel(confirmed) || !confirmed)
      exitInstallationCancelled();
  }
  if (isSkillsShPackUrl(url)) {
    const fromSource = await installPackPointerSkills(selectedSkills, {
      targetAgents,
      global: installGlobally,
      mode: installMode,
      metadata: options.metadata
    });
    selectedSkills = selectedSkills.filter((skill) => !fromSource.has(skill));
    if (selectedSkills.length === 0) {
      console.log();
      outro(import_picocolors2.default.green("Done!") + import_picocolors2.default.dim("  Review skills before use; they run with full agent permissions."));
      await promptForFindSkills(options, targetAgents);
      return true;
    }
  }
  const sourceIdentifier = wellKnownProvider.getSourceIdentifier(url);
  const wellKnownPrivacyPromise = isSourcePrivate(sourceIdentifier).catch(() => null);
  spinner2.start("Installing skills…");
  const results = [];
  for (const skill of selectedSkills)
    for (const agent of targetAgents) {
      const result = await installWellKnownSkillForAgent(skill, agent, {
        global: installGlobally,
        mode: installMode
      });
      results.push({
        skill: skill.installName,
        agent: agents[agent].displayName,
        ...result
      });
    }
  spinner2.stop("Installation complete");
  console.log();
  const successful = results.filter((r3) => r3.success);
  const failed = results.filter((r3) => !r3.success);
  const successfulSkillNames = new Set(successful.map((r3) => r3.skill));
  const skillFiles = {};
  for (const skill of selectedSkills)
    skillFiles[skill.installName] = skill.sourceUrl;
  if (await wellKnownPrivacyPromise !== true)
    track({
      event: "install",
      source: sourceIdentifier,
      skills: selectedSkills.map((s3) => s3.installName).join(","),
      agents: targetAgents.join(","),
      ...installGlobally && { global: "1" },
      skillFiles: JSON.stringify(skillFiles),
      installUrl: url,
      metadata: options.metadata,
      sourceType: "well-known"
    });
  if (successful.length > 0 && installGlobally) {
    for (const skill of selectedSkills)
      if (successfulSkillNames.has(skill.installName))
        try {
          await addSkillToLock(skill.installName, globalWellKnownLockEntry(url, skill));
        } catch {}
  }
  if (successful.length > 0 && !installGlobally) {
    for (const skill of selectedSkills)
      if (successfulSkillNames.has(skill.installName))
        try {
          const matchingResult = successful.find((r3) => r3.skill === skill.installName);
          const installDir = matchingResult?.canonicalPath || matchingResult?.path;
          if (installDir) {
            const computedHash = await computeSkillFolderHash(installDir);
            await addSkillToLocalLock(skill.installName, {
              source: sourceIdentifier,
              sourceUrl: url,
              sourceType: "well-known",
              computedHash,
              wellKnownDigest: computeWellKnownSkillDigest(skill)
            }, cwd);
          }
        } catch {}
  }
  if (successful.length > 0) {
    const bySkill = /* @__PURE__ */ new Map;
    for (const r3 of successful) {
      const skillResults = bySkill.get(r3.skill) || [];
      skillResults.push(r3);
      bySkill.set(r3.skill, skillResults);
    }
    const skillCount = bySkill.size;
    const symlinkFailures = successful.filter((r3) => r3.mode === "symlink" && r3.symlinkFailed);
    const copiedAgents = symlinkFailures.map((r3) => r3.agent);
    const resultLines = [];
    for (const [skillName, skillResults] of bySkill) {
      const firstResult = skillResults[0];
      if (firstResult.mode === "copy") {
        resultLines.push(`${import_picocolors2.default.green("✓")} ${skillName} ${import_picocolors2.default.dim("(copied)")}`);
        const shortPathsSet = /* @__PURE__ */ new Set;
        for (const r3 of skillResults) {
          const shortPath = shortenPath$2(r3.path, cwd);
          if (!shortPathsSet.has(shortPath)) {
            shortPathsSet.add(shortPath);
            resultLines.push(`  ${import_picocolors2.default.dim("→")} ${shortPath}`);
          }
        }
      } else {
        if (firstResult.canonicalPath) {
          const shortPath = shortenPath$2(firstResult.canonicalPath, cwd);
          resultLines.push(`${import_picocolors2.default.green("✓")} ${shortPath}`);
        } else
          resultLines.push(`${import_picocolors2.default.green("✓")} ${skillName}`);
        resultLines.push(...buildResultLines(skillResults, targetAgents));
      }
    }
    const title = import_picocolors2.default.green(`Installed ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
    note(resultLines.join(`
`), title);
    if (symlinkFailures.length > 0) {
      log.warn(import_picocolors2.default.yellow(`Symlinks failed for: ${formatList$1(copiedAgents)}`));
      log.message(import_picocolors2.default.dim("  Files were copied instead. On Windows, enable Developer Mode for symlink support."));
    }
  }
  if (failed.length > 0) {
    console.log();
    log.error(import_picocolors2.default.red(`Failed to install ${failed.length}`));
    for (const r3 of failed)
      log.message(`  ${import_picocolors2.default.red("✗")} ${r3.skill} → ${r3.agent}: ${import_picocolors2.default.dim(r3.error)}`);
  }
  console.log();
  outro(import_picocolors2.default.green("Done!") + import_picocolors2.default.dim("  Review skills before use; they run with full agent permissions."));
  await promptForFindSkills(options, targetAgents);
  return true;
}
var silentSpinner = {
  start: () => {},
  stop: () => {},
  message: () => {}
};
async function resolveSkills(parsed, options, spinner2) {
  const { includeInternal } = options;
  let skills;
  let blobResult = null;
  let tempDir = null;
  const missingRequestedSkill = (found) => !!options.requestedSkills?.some((name) => name !== "*" && filterSkills(found, [name]).length === 0);
  const discover = async (rootDir) => {
    const found = await discoverSkills(rootDir, parsed.subpath, options);
    if (!options.fullDepth && missingRequestedSkill(found))
      return discoverSkills(rootDir, parsed.subpath, {
        ...options,
        fullDepth: true
      });
    return found;
  };
  try {
    if (parsed.type === "local") {
      spinner2.start("Discovering skills…");
      skills = await discover(parsed.localPath);
    } else if (parsed.type === "well-known" || parsed.type === "download") {
      spinner2.start("Downloading source...");
      const downloaded = await downloadSource(parsed.url);
      tempDir = downloaded.tempDir;
      spinner2.stop(`Downloaded ${downloaded.kind === "skill-md" ? "SKILL.md file" : "archive"}`);
      spinner2.start("Discovering skills...");
      skills = await discover(downloaded.rootDir);
    } else if (parsed.type === "github" && !options.fullDepth) {
      let attemptedBlobInstall = false;
      const BLOB_ALLOWED_OWNERS = [
        "vercel",
        "vercel-labs",
        "heygen-com",
        "remotion-dev"
      ];
      const ownerRepo = getOwnerRepo(parsed);
      const owner = ownerRepo?.split("/")[0]?.toLowerCase();
      const isSelfHostedRepo = !!ownerRepo && Object.hasOwn(BLOB_ALLOWED_REPOS, ownerRepo.toLowerCase());
      if (ownerRepo && owner && (isSelfHostedRepo || BLOB_ALLOWED_OWNERS.includes(owner))) {
        attemptedBlobInstall = true;
        spinner2.start("Fetching skills…");
        blobResult = await tryBlobInstall(ownerRepo, {
          subpath: parsed.subpath,
          skillFilter: parsed.skillFilter,
          ref: parsed.ref,
          getToken: getGitHubToken,
          includeInternal
        });
      }
      if (blobResult && missingRequestedSkill(blobResult.skills))
        blobResult = null;
      if (blobResult) {
        skills = blobResult.skills;
        spinner2.stop(`Found ${import_picocolors2.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
      } else {
        if (attemptedBlobInstall)
          spinner2.message("Cloning repository…");
        else
          spinner2.start("Cloning repository…");
        tempDir = await cloneRepo(parsed.url, parsed.ref);
        spinner2.stop("Repository cloned");
        spinner2.start("Discovering skills…");
        skills = await discover(tempDir);
      }
    } else {
      spinner2.start("Cloning repository…");
      tempDir = await cloneRepo(parsed.url, parsed.ref);
      spinner2.stop("Repository cloned");
      spinner2.start("Discovering skills…");
      skills = await discover(tempDir);
    }
  } catch (error) {
    await cleanup(tempDir);
    throw error;
  }
  return {
    skills,
    tempDir,
    blobResult
  };
}
function isWellKnownSourceSkill(skill) {
  return "wellKnown" in skill;
}
async function resolveWellKnownSkills(url, includeInternal) {
  const skills = await wellKnownProvider.fetchAllSkills(url, { includeInternal });
  if (skills.length === 0)
    return null;
  return {
    skills: skills.map((wellKnown) => ({
      name: wellKnown.installName,
      description: wellKnown.description,
      path: "",
      rawContent: wellKnown.content,
      wellKnown
    })),
    tempDir: null,
    blobResult: null
  };
}
async function installToTargets(resolved, skills, placement) {
  const results = [];
  for (const skill of skills)
    for (const target of placement.targets) {
      const { agent, subagent } = target;
      const installOptions = {
        global: placement.global,
        mode: placement.mode,
        eveSubagent: subagent,
        createMissingAgentRoot: placement.createMissingAgentRoot?.(agent) ?? false
      };
      let result;
      if (isWellKnownSourceSkill(skill))
        result = await installWellKnownSkillForAgent(skill.wellKnown, agent, installOptions);
      else if (resolved.blobResult && "files" in skill) {
        const blobSkill = skill;
        result = await installBlobSkillForAgent({
          installName: blobSkill.name,
          files: blobSkill.files
        }, agent, installOptions);
      } else
        result = await installSkillForAgent(skill, agent, installOptions);
      results.push({
        skill: getSkillDisplayName(skill),
        agent: targetDisplayName(target),
        pluginName: skill.pluginName,
        ...result
      });
    }
  return results;
}
function getSkillRepoPaths(resolved, skills) {
  const { tempDir, blobResult } = resolved;
  const skillFiles = {};
  for (const skill of skills)
    if (blobResult && "repoPath" in skill)
      skillFiles[skill.name] = skill.repoPath;
    else if (tempDir && skill.path === tempDir)
      skillFiles[skill.name] = "SKILL.md";
    else if (tempDir && skill.path.startsWith(tempDir + sep))
      skillFiles[skill.name] = skill.path.slice(tempDir.length + 1).split(sep).join("/") + "/SKILL.md";
  return skillFiles;
}
function getProjectLockSource(parsed) {
  return getLockSource(parsed.url, getOwnerRepo(parsed)) || parsed.url;
}
function projectLockEntry(parsed, skillPath, computedHash) {
  const sourceUrl = getProjectLockSourceUrl(parsed.type, parsed.url);
  return {
    source: getProjectLockSource(parsed),
    ...sourceUrl && { sourceUrl },
    ref: parsed.ref,
    sourceType: parsed.type,
    ...skillPath && { skillPath },
    computedHash
  };
}
function globalWellKnownLockEntry(baseUrl, skill) {
  return {
    source: wellKnownProvider.getSourceIdentifier(baseUrl),
    sourceType: "well-known",
    sourceUrl: skill.sourceUrl,
    skillFolderHash: "",
    sourceBaseUrl: baseUrl,
    wellKnownDigest: computeWellKnownSkillDigest(skill)
  };
}
function wellKnownLockEntry(url, skill, computedHash) {
  return {
    source: wellKnownProvider.getSourceIdentifier(url),
    sourceUrl: url,
    sourceType: "well-known",
    computedHash,
    wellKnownDigest: computeWellKnownSkillDigest(skill)
  };
}
async function fetchSource({ parsed, skills, fullDepth }) {
  const includeInternal = skills.length > 0;
  try {
    return {
      parsed,
      resolved: parsed.type === "well-known" && await resolveWellKnownSkills(parsed.url, includeInternal) || await resolveSkills(parsed, {
        includeInternal,
        fullDepth,
        requestedSkills: skills
      }, silentSpinner)
    };
  } catch (error) {
    return {
      parsed,
      resolved: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function fetchSources(requests) {
  if (requests.length === 0)
    return [];
  const label = `source${requests.length === 1 ? "" : "s"}`;
  const spinner$4 = spinner();
  let done = 0;
  spinner$4.start(`Downloading ${requests.length} ${label}…`);
  const fetched = await mapConcurrent(requests, async (request) => {
    const result = await fetchSource(request);
    spinner$4.message(`Downloaded ${++done} of ${requests.length} ${label}…`);
    return result;
  });
  spinner$4.stop(`Downloaded ${requests.length} ${label}`);
  return fetched;
}
function releaseSource({ resolved }) {
  return cleanup(resolved?.tempDir ?? null);
}
async function installFetched({ resolved, error }, options) {
  if (!resolved)
    return {
      installed: [],
      failed: [],
      error
    };
  try {
    let selected = options.skills.length > 0 ? filterSkills(resolved.skills, options.skills) : resolved.skills;
    if (selected.length === 0)
      return {
        installed: [],
        failed: [],
        error: "No matching skills found"
      };
    if (options.select)
      selected = await options.select(selected);
    const results = await installToTargets(resolved, selected, options.placement);
    const installed = [];
    for (const skill of selected) {
      const target = results.find((r3) => r3.success && r3.skill === getSkillDisplayName(skill));
      if (!target)
        continue;
      installed.push({
        skill,
        hash: await installedSkillHash(skill, target)
      });
    }
    return {
      installed,
      failed: results.filter((r3) => !r3.success).map((r3) => `${r3.skill} → ${r3.agent}: ${r3.error}`)
    };
  } catch (error2) {
    return {
      installed: [],
      failed: [],
      error: error2 instanceof Error ? error2.message : String(error2)
    };
  }
}
function projectPlacement(agents2) {
  return {
    global: false,
    targets: agents2.map((agent) => ({ agent })),
    mode: "symlink",
    createMissingAgentRoot: () => true
  };
}
async function installFromSource(fetched, options) {
  const { frozenLock } = options;
  const outcome = await installFetched(fetched, {
    skills: options.skills,
    placement: projectPlacement(options.agents),
    select: async (skills) => {
      const selected = options.select ? await options.select(skills) : skills;
      if (!frozenLock)
        return selected;
      const changes = [];
      for (const skill of selected) {
        if (isWellKnownSourceSkill(skill))
          continue;
        const hash = await sourceSkillHash(skill);
        const reason = lockChangeReason(frozenLock, skill.name, { computedHash: hash });
        if (reason)
          changes.push(reason);
      }
      if (changes.length > 0)
        throw new Error(frozenLockfileError(changes));
      return selected;
    }
  });
  const result = {
    installed: outcome.installed.map(({ skill }) => getSkillDisplayName(skill)),
    failed: outcome.failed,
    ...outcome.error && { error: outcome.error }
  };
  try {
    if (frozenLock) {
      const changes = outcome.installed.flatMap(({ skill, hash }) => lockChangeReason(frozenLock, skill.name, { computedHash: hash }) ?? []);
      if (changes.length > 0)
        result.error = frozenLockfileError(changes);
    } else
      await recordProjectLock(fetched, outcome.installed, options.via);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await releaseSource(fetched);
  }
  return result;
}
async function recordProjectLock({ parsed, resolved }, installed, via) {
  if (!resolved)
    return;
  const repoPaths = getSkillRepoPaths(resolved, installed.map(({ skill }) => skill));
  for (const { skill, hash } of installed) {
    const entry = isWellKnownSourceSkill(skill) ? wellKnownLockEntry(parsed.url, skill.wellKnown, hash) : projectLockEntry(parsed, repoPaths[skill.name], hash);
    await addSkillToLocalLock(skill.name, {
      ...entry,
      ...via && { via }
    });
  }
}
async function recordGlobalWellKnownLock(baseUrl, installed) {
  for (const { skill } of installed) {
    if (!isWellKnownSourceSkill(skill))
      continue;
    await addSkillToLock(skill.name, globalWellKnownLockEntry(baseUrl, skill.wellKnown));
  }
}
function sourceSkillHash(skill) {
  return "snapshotHash" in skill ? Promise.resolve(skill.snapshotHash) : computeSkillFolderHash(skill.path);
}
function installedSkillHash(skill, target) {
  return isWellKnownSourceSkill(skill) ? computeSkillFolderHash(target.canonicalPath || target.path) : sourceSkillHash(skill);
}
async function runAdd(args, options = {}) {
  const source = args[0];
  let installTipShown = false;
  const jsonMode = options.json === true;
  const jsonResults = [];
  const originalStdoutWrite = process.stdout.write;
  let stdoutSuppressed = false;
  if (jsonMode) {
    process.stdout.write = process.stderr.write.bind(process.stderr);
    stdoutSuppressed = true;
  }
  const restoreStdout = () => {
    if (stdoutSuppressed) {
      process.stdout.write = originalStdoutWrite;
      stdoutSuppressed = false;
    }
  };
  let jsonEmitted = false;
  const emitJson = () => {
    if (!jsonMode || jsonEmitted)
      return;
    jsonEmitted = true;
    restoreStdout();
    console.log(JSON.stringify(jsonResults, null, 2));
  };
  const emitJsonAndExit = (code, errorMessage) => {
    if (jsonMode) {
      if (errorMessage !== undefined)
        console.error(errorMessage);
      if (code !== 0 && jsonResults.length === 0)
        jsonResults.push({
          status: "failed",
          error: errorMessage ?? "Installation failed"
        });
      emitJson();
    }
    process.exit(code);
  };
  const emitJsonOnExit = () => emitJson();
  if (jsonMode)
    process.once("exit", emitJsonOnExit);
  const showInstallTip = () => {
    if (installTipShown)
      return;
    log.message(import_picocolors2.default.dim("Tip: use the --yes (-y) and --global (-g) flags to install without prompts."));
    installTipShown = true;
  };
  if (!source) {
    console.log();
    console.log(import_picocolors2.default.bgRed(import_picocolors2.default.white(import_picocolors2.default.bold(" ERROR "))) + " " + import_picocolors2.default.red("Missing required argument: source"));
    console.log();
    console.log(import_picocolors2.default.dim("  Usage:"));
    console.log(`    ${import_picocolors2.default.cyan("npx skills add")} ${import_picocolors2.default.yellow("<source>")} ${import_picocolors2.default.dim("[options]")}`);
    console.log();
    console.log(import_picocolors2.default.dim("  Example:"));
    console.log(`    ${import_picocolors2.default.cyan("npx skills add")} ${import_picocolors2.default.yellow("vercel-labs/agent-skills")}`);
    console.log();
    emitJsonAndExit(1, "Missing required argument: source");
  }
  const explicitlySelectedAgents = new Set(options.agent?.includes("*") ? [] : options.agent ?? []);
  if (options.all) {
    options.skill = ["*"];
    options.agent = ["*"];
    options.yes = true;
  }
  const agentResult = await detectAgent();
  if (agentResult.isAgent) {
    options.yes = true;
    if (!options.agent || options.agent.length === 0) {
      const mappedAgent = getAgentType(agentResult.agent.name);
      if (mappedAgent)
        options.agent = ensureUniversalAgents([mappedAgent]);
    }
  }
  if (jsonMode && !options.yes)
    emitJsonAndExit(1, "The --json flag requires --yes (or --all) to run non-interactively.");
  if (jsonMode && options.list)
    emitJsonAndExit(1, "The --json flag cannot be combined with --list.");
  console.log();
  if (!agentResult.isAgent)
    intro(import_picocolors2.default.bgCyan(import_picocolors2.default.black(" skills ")));
  if (agentResult.isAgent)
    log.info(import_picocolors2.default.bgCyan(import_picocolors2.default.black(import_picocolors2.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — installing non-interactively");
  else if (!process.stdin.isTTY)
    showInstallTip();
  if (options.agent && !options.agent.includes("*")) {
    const validAgents = Object.keys(agents);
    const invalidAgents = options.agent.filter((a2) => !validAgents.includes(a2));
    if (invalidAgents.length > 0) {
      log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
      log.info(`Valid agents: ${validAgents.join(", ")}`);
      emitJsonAndExit(1, `Invalid agents: ${invalidAgents.join(", ")}`);
    }
  }
  let tempDir = null;
  try {
    let effectiveSource = source;
    let notionSourceLabel = null;
    const notionSkillPageId = parseNotionSkillUrl(source);
    if (isNotionSource(source) || notionSkillPageId) {
      const prepared = notionSkillPageId ? await prepareNotionSkillSource(notionSkillPageId) : await prepareNotionPackSource(options);
      if (!prepared)
        return;
      effectiveSource = prepared.rootDir;
      tempDir = prepared.tempDir;
      notionSourceLabel = "packCount" in prepared ? `${prepared.packCount} selected Notion pack${prepared.packCount === 1 ? "" : "s"}` : "Notion page";
      options.skill = ["*"];
    }
    const spinner$3 = jsonMode ? silentSpinner : spinner();
    spinner$3.start("Parsing source…");
    const parsed = parseSource(effectiveSource);
    let directDownload = parsed.type === "download" || notionSourceLabel !== null;
    spinner$3.stop(notionSourceLabel !== null ? `Source: ${notionSourceLabel}` : `Source: ${parsed.type === "local" ? parsed.localPath : parsed.url}${parsed.ref ? ` @ ${import_picocolors2.default.yellow(parsed.ref)}` : ""}${parsed.subpath ? ` (${parsed.subpath})` : ""}${parsed.skillFilter ? ` ${import_picocolors2.default.dim("@")}${import_picocolors2.default.cyan(parsed.skillFilter)}` : ""}`);
    const ownerRepoRaw = parsed.type === "well-known" || parsed.type === "download" ? null : getOwnerRepo(parsed);
    const repoPrivacyPromise = (() => {
      if (parsed.type !== "github")
        return Promise.resolve(null);
      if (!ownerRepoRaw)
        return Promise.resolve(null);
      const ownerRepo = parseOwnerRepo(ownerRepoRaw);
      if (!ownerRepo)
        return Promise.resolve(null);
      return isRepoPrivate(ownerRepo.owner, ownerRepo.repo).catch(() => null);
    })();
    if (parsed.type === "well-known") {
      if (jsonMode)
        emitJsonAndExit(1, "--json is not yet supported for well-known skill sources.");
      if (await handleWellKnownSkills(source, parsed.url, options, spinner$3))
        return;
      directDownload = true;
    }
    if (parsed.skillFilter) {
      options.skill = options.skill || [];
      if (!options.skill.includes(parsed.skillFilter))
        options.skill.push(parsed.skillFilter);
    }
    const includeInternal = !!(options.skill && options.skill.length > 0 && !options.skill.includes("*"));
    if (parsed.type === "local") {
      spinner$3.start("Validating local path…");
      if (!existsSync(parsed.localPath)) {
        spinner$3.stop(import_picocolors2.default.red("Path not found"));
        outro(import_picocolors2.default.red(`Local path does not exist: ${parsed.localPath}`));
        emitJsonAndExit(1, `Local path does not exist: ${parsed.localPath}`);
      }
      spinner$3.stop("Local path validated");
    }
    const resolved = await resolveSkills(parsed, {
      includeInternal,
      fullDepth: options.fullDepth,
      requestedSkills: options.skill
    }, spinner$3);
    const { skills, blobResult } = resolved;
    tempDir = resolved.tempDir ?? tempDir;
    if (skills.length === 0) {
      spinner$3.stop(import_picocolors2.default.red("No skills found"));
      outro(import_picocolors2.default.red("No valid skills found. Skills require a SKILL.md with name and description."));
      await cleanup(tempDir);
      emitJsonAndExit(1, "No valid skills found. Skills require a SKILL.md with name and description.");
    }
    if (!blobResult)
      spinner$3.stop(`Found ${import_picocolors2.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
    if (options.list) {
      console.log();
      log.step(import_picocolors2.default.bold("Available Skills"));
      const groupedSkills = {};
      const ungroupedSkills = [];
      for (const skill of skills)
        if (skill.pluginName) {
          const group = skill.pluginName;
          if (!groupedSkills[group])
            groupedSkills[group] = [];
          groupedSkills[group].push(skill);
        } else
          ungroupedSkills.push(skill);
      const sortedGroups2 = Object.keys(groupedSkills).sort();
      for (const group of sortedGroups2) {
        const title = group.split("-").map((w2) => w2.charAt(0).toUpperCase() + w2.slice(1)).join(" ");
        console.log(import_picocolors2.default.bold(title));
        for (const skill of groupedSkills[group]) {
          log.message(`  ${import_picocolors2.default.cyan(getSkillDisplayName(skill))}`);
          log.message(`    ${import_picocolors2.default.dim(skill.description)}`);
        }
        console.log();
      }
      if (ungroupedSkills.length > 0) {
        if (sortedGroups2.length > 0)
          console.log(import_picocolors2.default.bold("General"));
        for (const skill of ungroupedSkills) {
          log.message(`  ${import_picocolors2.default.cyan(getSkillDisplayName(skill))}`);
          log.message(`    ${import_picocolors2.default.dim(skill.description)}`);
        }
      }
      console.log();
      outro("Use --skill <name> to install specific skills");
      await cleanup(tempDir);
      emitJsonAndExit(0);
    }
    let selectedSkills;
    const logChosen = (chosen) => logAutoSelectedSkills(chosen.map((s3) => ({
      label: getSkillDisplayName(s3),
      description: s3.description
    })));
    if (options.skill?.includes("*")) {
      selectedSkills = skills;
      logChosen(selectedSkills);
    } else if (options.skill && options.skill.length > 0) {
      selectedSkills = filterSkills(skills, options.skill);
      if (jsonMode) {
        for (const requested of options.skill)
          if (filterSkills(skills, [requested]).length === 0)
            jsonResults.push({
              name: requested,
              status: "skipped",
              reason: "No matching skill found in source"
            });
      }
      if (selectedSkills.length === 0) {
        log.error(`No matching skills found for: ${options.skill.join(", ")}`);
        log.info("Available skills:");
        for (const s3 of skills)
          log.message(`  - ${getSkillDisplayName(s3)}`);
        await cleanup(tempDir);
        emitJsonAndExit(1, `No matching skills found for: ${options.skill.join(", ")}`);
      }
      log.info(`Selected ${selectedSkills.length} skill${selectedSkills.length !== 1 ? "s" : ""}: ${selectedSkills.map((s3) => import_picocolors2.default.cyan(getSkillDisplayName(s3))).join(", ")}`);
    } else if (skills.length === 1 || options.yes) {
      selectedSkills = skills;
      logChosen(selectedSkills);
    } else {
      const sortedSkills = [...skills].sort((a2, b3) => {
        if (a2.pluginName && !b3.pluginName)
          return -1;
        if (!a2.pluginName && b3.pluginName)
          return 1;
        if (a2.pluginName && b3.pluginName && a2.pluginName !== b3.pluginName)
          return a2.pluginName.localeCompare(b3.pluginName);
        return getSkillDisplayName(a2).localeCompare(getSkillDisplayName(b3));
      });
      const hasGroups = sortedSkills.some((s3) => s3.pluginName);
      const kebabToTitle = (s3) => s3.split("-").map((w2) => w2.charAt(0).toUpperCase() + w2.slice(1)).join(" ");
      const skillChoices = sortedSkills.map((s3) => ({
        value: s3,
        label: getSkillDisplayName(s3),
        group: hasGroups ? s3.pluginName ? kebabToTitle(s3.pluginName) : "Other" : undefined,
        detail: s3.description
      }));
      const selected = await searchMultiselect({
        message: hasGroups ? `Select skills to install ${import_picocolors2.default.dim("(space to toggle)")}` : "Select skills to install",
        items: skillChoices,
        required: true,
        maxVisible: 20,
        searchable: !hasGroups,
        showDetail: true,
        showSelectedSummary: false,
        selectGroups: hasGroups,
        selectAll: true
      });
      if (isCancelled$1(selected)) {
        await cleanup(tempDir);
        exitInstallationCancelled();
      }
      selectedSkills = selected;
    }
    const ownerRepoForAudit = getOwnerRepo(parsed);
    const auditPromise = ownerRepoForAudit ? repoPrivacyPromise.then((isPrivate) => isPrivate === false ? fetchAuditData(ownerRepoForAudit, selectedSkills.map((s3) => getSkillDisplayName(s3))) : null) : Promise.resolve(null);
    let targetAgents;
    const validAgents = Object.keys(agents);
    if (options.agent?.includes("*")) {
      targetAgents = validAgents;
      log.info(`Installing to all ${targetAgents.length} agents`);
    } else if (options.agent && options.agent.length > 0)
      targetAgents = options.agent;
    else {
      spinner$3.start("Loading agents…");
      const installedAgents = await detectInstalledAgents();
      const totalAgents = Object.keys(agents).length;
      spinner$3.stop(`${totalAgents} agents`);
      if (installedAgents.includes("eve") && (options.yes || !agentResult.isAgent)) {
        const useEve = options.yes ? true : await confirm({
          message: formatEveInstallPromptMessage(selectedSkills),
          initialValue: true
        });
        if (isCancel(useEve)) {
          await cleanup(tempDir);
          exitInstallationCancelled();
        }
        if (useEve) {
          targetAgents = ["eve"];
          if (!options.yes)
            explicitlySelectedAgents.add("eve");
          log.info(`Installing to: ${import_picocolors2.default.cyan(EVE_AGENT_LABEL)}`);
        } else {
          const selected = await selectAgentsInteractive({ global: options.global });
          if (isCancelled$1(selected)) {
            await cleanup(tempDir);
            exitInstallationCancelled();
          }
          targetAgents = selected;
          for (const agent of targetAgents)
            explicitlySelectedAgents.add(agent);
        }
      } else if (installedAgents.length === 0)
        if (options.yes) {
          targetAgents = validAgents;
          log.info("Installing to all agents");
        } else {
          log.info("Select agents to install skills to");
          const selected = await promptForAgents("Which agents do you want to install to?", Object.entries(agents).filter(([key]) => key !== "eve").map(([key, config]) => ({
            value: key,
            label: config.displayName
          })));
          if (isCancelled$1(selected)) {
            await cleanup(tempDir);
            exitInstallationCancelled();
          }
          targetAgents = selected;
          for (const agent of targetAgents)
            explicitlySelectedAgents.add(agent);
        }
      else if (installedAgents.length === 1 || options.yes) {
        targetAgents = ensureUniversalAgents(installedAgents);
        if (installedAgents.length === 1) {
          const firstAgent = installedAgents[0];
          log.info(`Installing to: ${import_picocolors2.default.cyan(agents[firstAgent].displayName)}`);
        } else
          log.info(`Installing to: ${installedAgents.map((a2) => import_picocolors2.default.cyan(agents[a2].displayName)).join(", ")}`);
      } else {
        const selected = await selectAgentsInteractive({ global: options.global });
        if (isCancelled$1(selected)) {
          await cleanup(tempDir);
          exitInstallationCancelled();
        }
        targetAgents = selected;
        for (const agent of targetAgents)
          explicitlySelectedAgents.add(agent);
      }
    }
    if (options.subagent && options.subagent.length > 0) {
      explicitlySelectedAgents.add("eve");
      if (!targetAgents.includes("eve"))
        targetAgents = [...targetAgents, "eve"];
    }
    let eveSubagentTargets = [undefined];
    if (targetAgents.includes("eve")) {
      const availableSubagents = getEveSubagents(process.cwd());
      if (options.subagent && options.subagent.length > 0)
        eveSubagentTargets = options.subagent.map((s3) => s3 === "root" || s3 === "." ? undefined : s3);
      else if (availableSubagents.length > 0 && !options.yes) {
        const selectedSubagents = await multiselect({
          message: "Where should Eve skills be installed?",
          options: [{
            value: "",
            label: "Root agent",
            hint: "agent/skills"
          }, ...availableSubagents.map((name) => ({
            value: name,
            label: name,
            hint: `agent/subagents/${name}/skills`
          }))],
          initialValues: [""],
          required: true
        });
        if (isCancel(selectedSubagents)) {
          await cleanup(tempDir);
          exitInstallationCancelled();
        }
        eveSubagentTargets = selectedSubagents.map((s3) => s3 === "" ? undefined : s3);
      }
    }
    let installGlobally = options.global ?? false;
    const supportsGlobal = targetAgents.some((a2) => agents[a2].globalSkillsDir !== undefined);
    if (options.global === undefined && !options.yes && supportsGlobal) {
      const scope = await select({
        message: "Installation scope",
        options: [{
          value: false,
          label: "Project",
          hint: "Install in current directory (committed with your project)"
        }, {
          value: true,
          label: "Global",
          hint: "Install in home directory (available across all projects)"
        }]
      });
      if (isCancel(scope)) {
        await cleanup(tempDir);
        exitInstallationCancelled();
      }
      installGlobally = scope;
    }
    targetAgents = skipAgentsWithoutGlobalDir(targetAgents, {
      global: installGlobally,
      explicit: options.agent !== undefined
    });
    const installTargets = buildInstallTargets(targetAgents, eveSubagentTargets);
    if (!installGlobally)
      await readLocalLock();
    let installMode = options.copy ? "copy" : defaultInstallMode(installTargets);
    if (!options.copy && !options.yes && installMode === "symlink") {
      const modeChoice = await select({
        message: "Installation method",
        options: [{
          value: "symlink",
          label: "Symlink (Recommended)",
          hint: "Single source of truth, easy updates"
        }, {
          value: "copy",
          label: "Copy to all agents",
          hint: "Independent copies for each agent"
        }]
      });
      if (isCancel(modeChoice)) {
        await cleanup(tempDir);
        exitInstallationCancelled();
      }
      installMode = modeChoice;
    }
    const lockedInstallMode = installMode === "copy" && (options.copy || defaultInstallMode(installTargets) === "symlink") ? { installMode: "copy" } : {};
    const cwd = process.cwd();
    const summaryLines = [];
    const overwriteChecks = await Promise.all(selectedSkills.flatMap((skill) => installTargets.map(async (target) => ({
      skillName: skill.name,
      target,
      installed: await isSkillInstalled(skill.name, target.agent, {
        global: installGlobally,
        eveSubagent: target.subagent
      })
    }))));
    const overwriteStatus = /* @__PURE__ */ new Map;
    for (const { skillName, target, installed } of overwriteChecks) {
      if (!overwriteStatus.has(skillName))
        overwriteStatus.set(skillName, /* @__PURE__ */ new Map);
      overwriteStatus.get(skillName).set(targetKey(target), installed);
    }
    const groupedSummary = {};
    const ungroupedSummary = [];
    for (const skill of selectedSkills)
      if (skill.pluginName) {
        const group = skill.pluginName;
        if (!groupedSummary[group])
          groupedSummary[group] = [];
        groupedSummary[group].push(skill);
      } else
        ungroupedSummary.push(skill);
    const printSkillSummary = (skills2) => {
      for (const skill of skills2) {
        if (summaryLines.length > 0)
          summaryLines.push("");
        const shortCanonical = shortenPath$2(installTargets.length === 1 ? getCanonicalPath(skill.name, {
          global: installGlobally,
          agent: installTargets[0].agent,
          eveSubagent: installTargets[0].subagent
        }) : getCanonicalPath(skill.name, { global: installGlobally }), cwd);
        summaryLines.push(`${import_picocolors2.default.cyan(shortCanonical)}`);
        summaryLines.push(...buildTargetSummaryLines(installTargets, installMode));
        const skillOverwrites = overwriteStatus.get(skill.name);
        const overwriteAgents = installTargets.filter((t2) => skillOverwrites?.get(targetKey(t2))).map(targetDisplayName);
        if (overwriteAgents.length > 0)
          summaryLines.push(`  ${import_picocolors2.default.yellow("overwrites:")} ${formatList$1(overwriteAgents)}`);
      }
    };
    const sortedGroups = Object.keys(groupedSummary).sort();
    for (const group of sortedGroups) {
      const title = group.split("-").map((w2) => w2.charAt(0).toUpperCase() + w2.slice(1)).join(" ");
      summaryLines.push("");
      summaryLines.push(import_picocolors2.default.bold(title));
      printSkillSummary(groupedSummary[group]);
    }
    if (ungroupedSummary.length > 0) {
      if (sortedGroups.length > 0) {
        summaryLines.push("");
        summaryLines.push(import_picocolors2.default.bold("General"));
      }
      printSkillSummary(ungroupedSummary);
    }
    console.log();
    note(summaryLines.join(`
`), "Installation Summary");
    let auditDataForJson = null;
    try {
      const auditData = await auditPromise;
      auditDataForJson = auditData;
      if (auditData && ownerRepoForAudit) {
        const securityLines = buildSecurityLines(auditData, selectedSkills.map((s3) => ({
          slug: getSkillDisplayName(s3),
          displayName: getSkillDisplayName(s3)
        })), ownerRepoForAudit);
        if (securityLines.length > 0)
          note(securityLines.join(`
`), "Security Risk Assessments");
      }
    } catch {}
    if (!options.yes) {
      const confirmed = await confirm({ message: "Proceed with installation?" });
      if (isCancel(confirmed) || !confirmed) {
        await cleanup(tempDir);
        exitInstallationCancelled();
      }
    }
    spinner$3.start("Installing skills…");
    const results = await installToTargets(resolved, selectedSkills, {
      global: installGlobally,
      targets: installTargets,
      mode: installMode,
      createMissingAgentRoot: (agent) => explicitlySelectedAgents.has(agent)
    });
    spinner$3.stop("Installation complete");
    console.log();
    const successful = results.filter((r3) => r3.success);
    const failed = results.filter((r3) => !r3.success);
    const successfulSkillNames = new Set(successful.map((r3) => r3.skill));
    const skillFiles = getSkillRepoPaths(resolved, selectedSkills);
    const normalizedSource = directDownload ? null : getOwnerRepo(parsed);
    const lockSource = directDownload ? null : getLockSource(parsed.url, normalizedSource);
    if (normalizedSource)
      if (parseOwnerRepo(normalizedSource)) {
        if (await repoPrivacyPromise === false)
          track({
            event: "install",
            source: normalizedSource,
            skills: selectedSkills.map((s3) => s3.name).join(","),
            agents: targetAgents.join(","),
            ...installGlobally && { global: "1" },
            skillFiles: JSON.stringify(skillFiles),
            metadata: options.metadata
          });
      } else
        track({
          event: "install",
          source: normalizedSource,
          skills: selectedSkills.map((s3) => s3.name).join(","),
          agents: targetAgents.join(","),
          ...installGlobally && { global: "1" },
          skillFiles: JSON.stringify(skillFiles),
          metadata: options.metadata
        });
    const installedSkillHashes = /* @__PURE__ */ new Map;
    if (successful.length > 0 && (jsonMode || !installGlobally))
      for (const skill of selectedSkills) {
        const skillDisplayName = getSkillDisplayName(skill);
        if (!successfulSkillNames.has(skillDisplayName))
          continue;
        try {
          installedSkillHashes.set(skillDisplayName, await sourceSkillHash(skill));
        } catch {}
      }
    if (successful.length > 0 && installGlobally && (normalizedSource || parsed.type === "local" && !directDownload)) {
      let cachedTree;
      if (parsed.type === "github" && !blobResult && normalizedSource)
        cachedTree = await fetchRepoTree(normalizedSource, parsed.ref, getGitHubToken);
      for (const skill of selectedSkills) {
        const skillDisplayName = getSkillDisplayName(skill);
        if (successfulSkillNames.has(skillDisplayName))
          try {
            let skillFolderHash = "";
            const skillPathValue = skillFiles[skill.name];
            if (blobResult && skillPathValue) {
              const hash = getSkillFolderHashFromTree(blobResult.tree, skillPathValue);
              if (hash)
                skillFolderHash = hash;
            } else if (parsed.type === "github" && skillPathValue && cachedTree) {
              const hash = getSkillFolderHashFromTree(cachedTree, skillPathValue);
              if (hash)
                skillFolderHash = hash;
            } else if (skillPathValue && tempDir) {
              const hash = await computeSkillFolderHash(join(tempDir, dirname(skillPathValue)));
              if (hash)
                skillFolderHash = hash;
            } else if (parsed.type === "local") {
              const hash = await computeSkillFolderHash(skill.path);
              if (hash)
                skillFolderHash = hash;
            }
            await addSkillToLock(skill.name, {
              source: lockSource || normalizedSource || parsed.url,
              sourceType: parsed.type,
              sourceUrl: parsed.url,
              ref: parsed.ref,
              skillPath: skillPathValue,
              skillFolderHash,
              pluginName: skill.pluginName,
              ...lockedInstallMode
            });
          } catch {}
      }
    }
    if (successful.length > 0 && !installGlobally && !directDownload) {
      const eveSubagents = targetAgents.includes("eve") ? eveSubagentTargets.map((s3) => s3 ?? "") : undefined;
      const recordSubagents = eveSubagents && (eveSubagents.length > 1 || eveSubagents.some((s3) => s3 !== ""));
      for (const skill of selectedSkills) {
        const skillDisplayName = getSkillDisplayName(skill);
        if (successfulSkillNames.has(skillDisplayName))
          try {
            const computedHash = installedSkillHashes.get(skillDisplayName);
            if (computedHash === undefined)
              continue;
            const skillPathValue = skillFiles[skill.name];
            await addSkillToLocalLock(skill.name, {
              ...projectLockEntry(parsed, skillPathValue, computedHash),
              ...recordSubagents && { subagents: eveSubagents },
              ...lockedInstallMode
            }, cwd);
          } catch {}
      }
    }
    if (jsonMode) {
      const jsonSource = normalizedSource ?? (parsed.type === "local" ? parsed.localPath : parsed.url);
      for (const skill of selectedSkills) {
        const name = getSkillDisplayName(skill);
        const skillResults = results.filter((r3) => r3.skill === name);
        const failures = skillResults.filter((r3) => !r3.success);
        if (failures.length > 0) {
          jsonResults.push({
            name,
            status: "failed",
            error: failures[0].error ?? "Installation failed"
          });
          continue;
        }
        jsonResults.push({
          name,
          status: "installed",
          source: jsonSource,
          ref: parsed.ref ?? null,
          hash: installedSkillHashes.get(name) ?? null,
          path: skillResults[0]?.canonicalPath ?? skillResults[0]?.path,
          scope: installGlobally ? "global" : "project",
          agents: skillResults.filter((r3) => !r3.skipped).map((r3) => r3.agent),
          mode: skillResults[0]?.mode ?? installMode,
          security: buildJsonSecurity(auditDataForJson, name, ownerRepoForAudit)
        });
      }
      emitJson();
      if (failed.length > 0 || jsonResults.some((result) => result.status === "skipped"))
        process.exitCode = 1;
      return;
    }
    if (successful.length > 0) {
      const bySkill = /* @__PURE__ */ new Map;
      const groupedResults = {};
      const ungroupedResults = [];
      for (const r3 of successful) {
        const skillResults = bySkill.get(r3.skill) || [];
        skillResults.push(r3);
        bySkill.set(r3.skill, skillResults);
        if (skillResults.length === 1)
          if (r3.pluginName) {
            const group = r3.pluginName;
            if (!groupedResults[group])
              groupedResults[group] = [];
            groupedResults[group].push(r3);
          } else
            ungroupedResults.push(r3);
      }
      const skillCount = bySkill.size;
      const symlinkFailures = successful.filter((r3) => r3.mode === "symlink" && r3.symlinkFailed);
      const copiedAgents = symlinkFailures.map((r3) => r3.agent);
      const resultLines = [];
      const printSkillResults = (entries) => {
        for (const entry of entries) {
          const skillResults = bySkill.get(entry.skill) || [];
          const firstResult = skillResults[0];
          if (firstResult.mode === "copy") {
            resultLines.push(`${import_picocolors2.default.green("✓")} ${entry.skill} ${import_picocolors2.default.dim("(copied)")}`);
            const shortPathsSet = /* @__PURE__ */ new Set;
            for (const r3 of skillResults) {
              const shortPath = shortenPath$2(r3.path, cwd);
              if (!shortPathsSet.has(shortPath)) {
                shortPathsSet.add(shortPath);
                resultLines.push(`  ${import_picocolors2.default.dim("→")} ${shortPath}`);
              }
            }
          } else {
            if (firstResult.canonicalPath) {
              const shortPath = shortenPath$2(firstResult.canonicalPath, cwd);
              resultLines.push(`${import_picocolors2.default.green("✓")} ${shortPath}`);
            } else
              resultLines.push(`${import_picocolors2.default.green("✓")} ${entry.skill}`);
            resultLines.push(...buildResultLines(skillResults, targetAgents));
          }
        }
      };
      const sortedResultGroups = Object.keys(groupedResults).sort();
      for (const group of sortedResultGroups) {
        const title2 = group.split("-").map((w2) => w2.charAt(0).toUpperCase() + w2.slice(1)).join(" ");
        resultLines.push("");
        resultLines.push(import_picocolors2.default.bold(title2));
        printSkillResults(groupedResults[group]);
      }
      if (ungroupedResults.length > 0) {
        if (sortedResultGroups.length > 0) {
          resultLines.push("");
          resultLines.push(import_picocolors2.default.bold("General"));
        }
        printSkillResults(ungroupedResults);
      }
      const title = import_picocolors2.default.green(`Installed ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
      note(resultLines.join(`
`), title);
      if (symlinkFailures.length > 0) {
        log.warn(import_picocolors2.default.yellow(`Symlinks failed for: ${formatList$1(copiedAgents)}`));
        log.message(import_picocolors2.default.dim("  Files were copied instead. On Windows, enable Developer Mode for symlink support."));
      }
    }
    if (failed.length > 0) {
      console.log();
      log.error(import_picocolors2.default.red(`Failed to install ${failed.length}`));
      for (const r3 of failed)
        log.message(`  ${import_picocolors2.default.red("✗")} ${r3.skill} → ${r3.agent}: ${import_picocolors2.default.dim(r3.error)}`);
    }
    console.log();
    outro(import_picocolors2.default.green("Done!") + import_picocolors2.default.dim("  Review skills before use; they run with full agent permissions."));
    await promptForFindSkills(options, targetAgents);
  } catch (error) {
    if (error instanceof GitCloneError) {
      log.error(import_picocolors2.default.red("Failed to clone repository"));
      for (const line of error.message.split(`
`))
        log.message(import_picocolors2.default.dim(line));
    } else
      log.error(error instanceof Error ? error.message : "Unknown error occurred");
    showInstallTip();
    outro(import_picocolors2.default.red("Installation failed"));
    emitJsonAndExit(1, error instanceof GitCloneError ? `Failed to clone repository
${error.message}` : error instanceof Error ? error.message : "Unknown error occurred");
  } finally {
    if (jsonMode)
      process.removeListener("exit", emitJsonOnExit);
    restoreStdout();
    await cleanup(tempDir);
  }
}
async function cleanup(tempDir) {
  if (tempDir)
    try {
      await cleanupTempDir(tempDir);
    } catch {}
}
async function promptForFindSkills(options, targetAgents) {
  if (!process.stdin.isTTY)
    return;
  if (options?.yes)
    return;
  try {
    if (await isPromptDismissed("findSkillsPrompt"))
      return;
    if (await isSkillInstalled("find-skills", "claude-code", { global: true })) {
      await dismissPrompt("findSkillsPrompt");
      return;
    }
    console.log();
    log.message(import_picocolors2.default.dim("One-time prompt - you won't be asked again if you dismiss."));
    const install = await confirm({ message: `Install the ${import_picocolors2.default.cyan("find-skills")} skill? It helps your agent discover and suggest skills.` });
    if (isCancel(install)) {
      await dismissPrompt("findSkillsPrompt");
      return;
    }
    if (install) {
      await dismissPrompt("findSkillsPrompt");
      const findSkillsAgents = targetAgents?.filter((a2) => a2 !== "replit");
      if (!findSkillsAgents || findSkillsAgents.length === 0)
        return;
      console.log();
      log.step("Installing find-skills skill…");
      try {
        await runAdd(["vercel-labs/skills"], {
          skill: ["find-skills"],
          global: true,
          yes: true,
          agent: findSkillsAgents
        });
      } catch {
        log.warn("Failed to install find-skills. You can try again with:");
        log.message(import_picocolors2.default.dim("  npx skills add vercel-labs/skills@find-skills -g -y --all"));
      }
    } else {
      await dismissPrompt("findSkillsPrompt");
      log.message(import_picocolors2.default.dim("You can install it later with: npx skills add vercel-labs/skills@find-skills"));
    }
  } catch {}
}
function parseAddOptions(args) {
  const options = {};
  const source = [];
  const errors2 = [];
  for (let i2 = 0;i2 < args.length; i2++) {
    const arg = args[i2];
    if (arg === "-g" || arg === "--global")
      options.global = true;
    else if (arg === "-y" || arg === "--yes")
      options.yes = true;
    else if (arg === "-l" || arg === "--list")
      options.list = true;
    else if (arg === "--all")
      options.all = true;
    else if (arg === "-a" || arg === "--agent") {
      options.agent = options.agent || [];
      i2++;
      let nextArg = args[i2];
      while (i2 < args.length && nextArg && !nextArg.startsWith("-")) {
        options.agent.push(nextArg);
        i2++;
        nextArg = args[i2];
      }
      i2--;
    } else if (arg === "-s" || arg === "--skill") {
      options.skill = options.skill || [];
      i2++;
      let nextArg = args[i2];
      while (i2 < args.length && nextArg && !nextArg.startsWith("-")) {
        options.skill.push(nextArg);
        i2++;
        nextArg = args[i2];
      }
      i2--;
    } else if (arg === "--metadata") {
      const metadata = args[++i2];
      if (metadata === undefined)
        errors2.push("--metadata requires a JSON value");
      else
        try {
          JSON.parse(metadata);
          options.metadata = metadata;
        } catch {
          errors2.push("--metadata must be valid JSON");
        }
    } else if (arg === "--full-depth")
      options.fullDepth = true;
    else if (arg === "--json")
      options.json = true;
    else if (arg === "--copy")
      options.copy = true;
    else if (arg === "--subagent") {
      options.subagent = options.subagent || [];
      i2++;
      let nextArg = args[i2];
      while (i2 < args.length && nextArg && !nextArg.startsWith("-")) {
        options.subagent.push(nextArg);
        i2++;
        nextArg = args[i2];
      }
      i2--;
    } else if (arg && !arg.startsWith("-"))
      source.push(arg);
  }
  return {
    source,
    options,
    errors: errors2
  };
}
var RESET$3 = "\x1B[0m";
var BOLD$3 = "\x1B[1m";
var DIM$3 = "\x1B[38;5;102m";
var TEXT$2 = "\x1B[38;5;145m";
var CYAN$1 = "\x1B[36m";
var SEARCH_API_BASE = process.env.SKILLS_API_URL || "https://skills.sh";
function formatInstalls(count) {
  if (!count || count <= 0)
    return "";
  if (count >= 1e6)
    return `${(count / 1e6).toFixed(1).replace(/\.0$/, "")}M installs`;
  if (count >= 1000)
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K installs`;
  return `${count} install${count === 1 ? "" : "s"}`;
}
var GITHUB_OWNER_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
function parseFindOptions(args) {
  const queryParts = [];
  const options = {};
  const errors2 = [];
  for (let i2 = 0;i2 < args.length; i2++) {
    const arg = args[i2];
    if (!arg)
      continue;
    let ownerValue;
    if (arg === "--owner") {
      const value = args[i2 + 1];
      if (!value || value.startsWith("-")) {
        errors2.push("--owner requires a GitHub owner");
        continue;
      }
      ownerValue = value;
      i2++;
    } else if (arg.startsWith("--owner=")) {
      ownerValue = arg.slice(8);
      if (!ownerValue) {
        errors2.push("--owner requires a GitHub owner");
        continue;
      }
    } else {
      queryParts.push(arg);
      continue;
    }
    const owner = ownerValue.trim().toLowerCase();
    if (!GITHUB_OWNER_PATTERN.test(owner)) {
      errors2.push("--owner must be a valid GitHub owner");
      continue;
    }
    options.owner = owner;
  }
  return {
    query: queryParts.join(" "),
    options,
    errors: errors2
  };
}
async function searchSkillsAPI(query, owner) {
  try {
    const params = new URLSearchParams({ q: query });
    if (owner)
      params.set("owner", owner);
    const url = `${SEARCH_API_BASE}/api/search?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok)
      return [];
    return (await res.json()).skills.map((skill) => ({
      name: sanitizeMetadata(skill.name),
      slug: sanitizeMetadata(skill.id),
      source: sanitizeMetadata(skill.source || ""),
      installs: skill.installs
    }));
  } catch {
    return [];
  }
}
var HIDE_CURSOR = "\x1B[?25l";
var SHOW_CURSOR = "\x1B[?25h";
var CLEAR_DOWN = "\x1B[J";
var MOVE_UP = (n2) => `\x1B[${n2}A`;
var MOVE_TO_COL = (n2) => `\x1B[${n2}G`;
async function runSearchPrompt(initialQuery = "", owner) {
  let results = [];
  let selectedIndex = 0;
  let query = initialQuery;
  let loading = false;
  let debounceTimer = null;
  let lastRenderedLines = 0;
  if (process.stdin.isTTY)
    process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);
  process.stdin.resume();
  process.stdout.write(HIDE_CURSOR);
  function render() {
    if (lastRenderedLines > 0)
      process.stdout.write(MOVE_UP(lastRenderedLines) + MOVE_TO_COL(1));
    process.stdout.write(CLEAR_DOWN);
    const lines = [];
    const cursor = `${BOLD$3}_${RESET$3}`;
    lines.push(`${TEXT$2}Search skills:${RESET$3} ${query}${cursor}`);
    lines.push("");
    if (!query || query.length < 2)
      lines.push(`${DIM$3}Start typing to search (min 2 chars)${RESET$3}`);
    else if (results.length === 0 && loading)
      lines.push(`${DIM$3}Searching…${RESET$3}`);
    else if (results.length === 0)
      lines.push(`${DIM$3}No skills found${RESET$3}`);
    else {
      const visible = results.slice(0, 8);
      for (let i2 = 0;i2 < visible.length; i2++) {
        const skill = visible[i2];
        const isSelected = i2 === selectedIndex;
        const arrow = isSelected ? `${BOLD$3}>${RESET$3}` : " ";
        const name = isSelected ? `${BOLD$3}${skill.name}${RESET$3}` : `${TEXT$2}${skill.name}${RESET$3}`;
        const source = skill.source ? ` ${DIM$3}${skill.source}${RESET$3}` : "";
        const installs = formatInstalls(skill.installs);
        const installsBadge = installs ? ` ${CYAN$1}${installs}${RESET$3}` : "";
        const loadingIndicator = loading && i2 === 0 ? ` ${DIM$3}…${RESET$3}` : "";
        lines.push(`  ${arrow} ${name}${source}${installsBadge}${loadingIndicator}`);
      }
    }
    lines.push("");
    lines.push(`${DIM$3}up/down navigate | enter select | esc cancel${RESET$3}`);
    for (const line of lines)
      process.stdout.write(line + `
`);
    lastRenderedLines = lines.length;
  }
  function triggerSearch(q3) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    loading = false;
    if (!q3 || q3.length < 2) {
      results = [];
      selectedIndex = 0;
      render();
      return;
    }
    loading = true;
    render();
    const debounceMs = Math.max(150, 350 - q3.length * 50);
    debounceTimer = setTimeout(async () => {
      try {
        results = await searchSkillsAPI(q3, owner);
        selectedIndex = 0;
      } catch {
        results = [];
      } finally {
        loading = false;
        debounceTimer = null;
        render();
      }
    }, debounceMs);
  }
  if (initialQuery)
    triggerSearch(initialQuery);
  render();
  return new Promise((resolve2) => {
    function cleanup2() {
      process.stdin.removeListener("keypress", handleKeypress);
      if (process.stdin.isTTY)
        process.stdin.setRawMode(false);
      process.stdout.write(SHOW_CURSOR);
      process.stdin.pause();
    }
    function handleKeypress(_ch, key) {
      if (!key)
        return;
      if (key.name === "escape" || key.ctrl && key.name === "c") {
        cleanup2();
        resolve2(null);
        return;
      }
      if (key.name === "return") {
        cleanup2();
        resolve2(results[selectedIndex] || null);
        return;
      }
      if (key.name === "up") {
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
        return;
      }
      if (key.name === "down") {
        selectedIndex = Math.min(Math.max(0, results.length - 1), selectedIndex + 1);
        render();
        return;
      }
      if (key.name === "backspace") {
        if (query.length > 0) {
          query = query.slice(0, -1);
          triggerSearch(query);
        }
        return;
      }
      if (key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
        const char = key.sequence;
        if (char >= " " && char <= "~") {
          query += char;
          triggerSearch(query);
        }
      }
    }
    process.stdin.on("keypress", handleKeypress);
  });
}
function getOwnerRepoFromString(pkg) {
  const atIndex = pkg.lastIndexOf("@");
  const match = (atIndex > 0 ? pkg.slice(0, atIndex) : pkg).match(/^([^/]+)\/([^/]+)$/);
  if (match)
    return {
      owner: match[1],
      repo: match[2]
    };
  return null;
}
async function isRepoPublic(owner, repo) {
  return await isRepoPrivate(owner, repo) === false;
}
async function runFind(args) {
  const { query, options: findOptions, errors: errors2 } = parseFindOptions(args);
  const owner = findOptions.owner;
  const isNonInteractive = !process.stdin.isTTY;
  const agentTip = `${DIM$3}Tip: if running in a coding agent, follow these steps:${RESET$3}
${DIM$3}  1) npx skills find [query] [--owner <owner>]${RESET$3}
${DIM$3}  2) npx skills add <owner/repo@skill>${RESET$3}`;
  if (errors2.length > 0) {
    for (const error of errors2)
      console.error(error);
    console.error("Usage: npx skills find <query> [--owner <owner>]");
    return;
  }
  if (query) {
    const results = await searchSkillsAPI(query, owner);
    track({
      event: "find",
      query,
      resultCount: String(results.length)
    });
    if (results.length === 0) {
      const ownerSuffix = owner ? ` from owner "${owner}"` : "";
      console.log(`${DIM$3}No skills found for "${query}"${ownerSuffix}${RESET$3}`);
      return;
    }
    console.log(`${DIM$3}Install with${RESET$3} npx skills add <owner/repo@skill>`);
    console.log();
    for (const skill of results) {
      const pkg2 = skill.source || skill.slug;
      const installs = formatInstalls(skill.installs);
      console.log(`${TEXT$2}${pkg2}@${skill.name}${RESET$3}${installs ? ` ${CYAN$1}${installs}${RESET$3}` : ""}`);
      console.log(`${DIM$3}└ https://skills.sh/${skill.slug}${RESET$3}`);
      console.log();
    }
    return;
  }
  if (isNonInteractive || await isRunningInAgent()) {
    console.log(agentTip);
    console.log();
    console.log(`${DIM$3}Usage: npx skills find <query> [--owner <owner>]${RESET$3}`);
    return;
  }
  const selected = await runSearchPrompt("", owner);
  track({
    event: "find",
    query: "",
    resultCount: selected ? "1" : "0",
    interactive: "1"
  });
  if (!selected) {
    console.log(`${DIM$3}Search cancelled${RESET$3}`);
    console.log();
    return;
  }
  const pkg = selected.source || selected.slug;
  const skillName = selected.name;
  console.log();
  console.log(`${TEXT$2}Installing ${BOLD$3}${skillName}${RESET$3} from ${DIM$3}${pkg}${RESET$3}…`);
  console.log();
  const { source, options: addOptions } = parseAddOptions([
    pkg,
    "--skill",
    skillName
  ]);
  await runAdd(source, addOptions);
  console.log();
  const info = getOwnerRepoFromString(pkg);
  if (info && await isRepoPublic(info.owner, info.repo))
    console.log(`${DIM$3}View the skill at${RESET$3} ${TEXT$2}https://skills.sh/${selected.slug}${RESET$3}`);
  else
    console.log(`${DIM$3}Discover more skills at${RESET$3} ${TEXT$2}https://skills.sh${RESET$3}`);
  console.log();
}
var NPM_PREFIX = "npm:";
var REMOTE_SOURCE_TYPES = /* @__PURE__ */ new Set([
  "github",
  "gitlab",
  "git"
]);
function isSkillsFieldEntry(value) {
  if (typeof value === "string")
    return true;
  if (!value || typeof value !== "object" || !("source" in value))
    return false;
  if (typeof value.source !== "string")
    return false;
  const skills = "skills" in value ? value.skills : undefined;
  const ref = "ref" in value ? value.ref : undefined;
  return (skills === undefined || Array.isArray(skills) && skills.every((s3) => typeof s3 === "string")) && (ref === undefined || typeof ref === "string");
}
function parseSkillsField(entries, declarer) {
  const parsed = {
    npm: [],
    remote: [],
    errors: []
  };
  for (const raw of entries) {
    if (!isSkillsFieldEntry(raw)) {
      parsed.errors.push(`${declarer}: invalid "skills" entry ${JSON.stringify(raw)}`);
      continue;
    }
    const { source, skills = [], ref } = typeof raw === "string" ? { source: raw } : raw;
    if (!source.startsWith(NPM_PREFIX)) {
      const remote = parseSource(source);
      if (!REMOTE_SOURCE_TYPES.has(remote.type))
        parsed.errors.push(`${declarer}: "${source}" is not a git source`);
      else if (ref !== undefined && remote.ref !== undefined)
        parsed.errors.push(`${declarer}: "${source}" already has a ref; remove "ref"`);
      else
        parsed.remote.push({
          parsed: {
            ...remote,
            ref: ref ?? remote.ref
          },
          skills: remote.skillFilter ? [...skills, remote.skillFilter] : skills
        });
    } else if (ref !== undefined)
      parsed.errors.push(`${declarer}: "ref" cannot be used with "${source}"`);
    else
      parsed.npm.push({
        package: source.slice(4),
        skills
      });
  }
  return parsed;
}
var isCancelled = (value) => typeof value === "symbol";
function matchesSkill(skill, patterns) {
  return patterns.some((pattern) => {
    const hash = pattern.indexOf("#");
    const packagePattern = hash === -1 ? pattern : pattern.slice(0, hash);
    const skillPattern = hash === -1 ? "**" : pattern.slice(hash + 1);
    return posix.matchesGlob(skill.packageName, packagePattern) && posix.matchesGlob(sanitizeName(skill.name), skillPattern);
  });
}
function allowedByFilters(skill, { include, exclude }) {
  return (!include?.length || matchesSkill(skill, include)) && !(exclude?.length && matchesSkill(skill, exclude));
}
function shortenPath$1(fullPath, cwd) {
  const home2 = homedir();
  if (fullPath === home2 || fullPath.startsWith(home2 + sep))
    return "~" + fullPath.slice(home2.length);
  if (fullPath === cwd || fullPath.startsWith(cwd + sep))
    return "." + fullPath.slice(cwd.length);
  return fullPath;
}
async function readPackageJson(dir) {
  try {
    return JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
  } catch {
    return null;
  }
}
async function discoverPackageSkills(pkgDir, packageName, depth) {
  const pkg = await readPackageJson(pkgDir);
  if (!pkg)
    return [];
  const rootSkill = await hasSkillMd(pkgDir) ? await parseSkillMd(join(pkgDir, "SKILL.md")) : null;
  if (rootSkill)
    return [{
      ...rootSkill,
      packageName,
      packageVersion: pkg.version,
      skillPath: "SKILL.md",
      depth
    }];
  const skills = [];
  for (const dir of ["skills", "dist/skills"])
    for (const name of await readdir(join(pkgDir, dir)).catch(() => [])) {
      const skillDir = join(pkgDir, dir, name);
      if (!await hasSkillMd(skillDir))
        continue;
      const skill = await parseSkillMd(join(skillDir, "SKILL.md"));
      if (skill)
        skills.push({
          ...skill,
          packageName,
          packageVersion: pkg.version,
          skillPath: `${dir}/${name}/SKILL.md`,
          depth
        });
    }
  return skills;
}
function findInstalledPackage(from, name) {
  for (let dir = from;; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json")))
      return candidate;
    if (dirname(dir) === dir)
      return;
  }
}
function remoteAllowsSkill(request, name, options) {
  return request.declarers.some((packageName) => allowedByFilters({
    name,
    packageName
  }, options));
}
function filterRemoteRequests(requests, options) {
  return requests.flatMap((request) => {
    const declarers = request.declarers.filter((name) => (!options.include?.length || options.include.some((p3) => posix.matchesGlob(name, p3.split("#")[0]))) && !options.exclude?.some((p3) => !p3.includes("#") && posix.matchesGlob(name, p3)));
    if (declarers.length === 0)
      return [];
    const filtered = {
      ...request,
      via: declarers[0],
      declarers
    };
    if (request.skills.length === 0)
      return [filtered];
    const skills = request.skills.filter((name) => remoteAllowsSkill(filtered, name, options));
    return skills.length > 0 ? [{
      ...filtered,
      skills
    }] : [];
  });
}
function requestsLockedSkill(request, name, entry) {
  return isFromRequest(entry, request) && (request.skills.length === 0 || request.skills.some((selected) => sanitizeName(selected) === sanitizeName(name) || selected === posix.basename(posix.dirname(entry.skillPath ?? ""))));
}
var DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies"
];
async function findWorkspacePackages(cwd, pkg) {
  const patterns = [...Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages ?? []];
  try {
    const pnpm = $parse(await readFile(join(cwd, "pnpm-workspace.yaml"), "utf-8"));
    if (pnpm && typeof pnpm === "object" && "packages" in pnpm && Array.isArray(pnpm.packages))
      patterns.push(...pnpm.packages.filter((p3) => typeof p3 === "string"));
  } catch {}
  const negated = patterns.filter((p3) => p3.startsWith("!")).map((p3) => p3.slice(1));
  const included = patterns.filter((p3) => !p3.startsWith("!"));
  const dirs = /* @__PURE__ */ new Set;
  for await (const file of glob(included.map((p3) => posix.join(p3, "package.json")), {
    cwd,
    exclude: (path2) => basename(path2) === "node_modules"
  })) {
    const dir = dirname(file).split(sep).join("/");
    if (dir !== "." && !negated.some((n2) => posix.matchesGlob(dir, n2)))
      dirs.add(join(cwd, dir));
  }
  return [...dirs].sort();
}
async function discoverNodeModuleSkills(cwd, recursive) {
  const warnings = [];
  const errors2 = [];
  const remote = /* @__PURE__ */ new Map;
  const pkg = await readPackageJson(cwd);
  if (!pkg)
    return {
      skills: [],
      remote: [],
      warnings,
      errors: errors2
    };
  const skills = [];
  const seen = /* @__PURE__ */ new Set;
  const add = async (found) => {
    for (const skill of found) {
      const key = await realpath(skill.path).catch(() => skill.path);
      if (seen.has(key))
        continue;
      seen.add(key);
      skills.push(skill);
    }
  };
  const projects = [{
    name: ".",
    dir: cwd,
    pkg,
    depth: 0
  }];
  for (const dir of recursive ? await findWorkspacePackages(cwd, pkg) : []) {
    const workspacePkg = await readPackageJson(dir);
    const name = workspacePkg?.name ?? relative(cwd, dir).split(sep).join("/");
    if (workspacePkg)
      projects.push({
        name,
        dir,
        pkg: workspacePkg,
        depth: 1
      });
  }
  const declarers = [];
  for (const project of projects) {
    const installed = [...new Set(DEPENDENCY_FIELDS.flatMap((field) => Object.keys(project.pkg[field] ?? {})))].flatMap((name) => {
      const dir = findInstalledPackage(project.dir, name);
      return dir ? [{
        name,
        dir
      }] : [];
    });
    await add((await Promise.all(installed.map(({ name, dir }) => discoverPackageSkills(dir, name, project.depth)))).flat());
    declarers.push({
      name: project.name,
      dir: project.dir,
      depth: project.depth
    }, ...installed.map(({ name, dir }) => ({
      name,
      dir,
      depth: project.depth + 1
    })));
  }
  const visited = /* @__PURE__ */ new Set;
  for (const declarer of declarers) {
    const dir = await realpath(declarer.dir).catch(() => null);
    if (!dir || visited.has(dir))
      continue;
    visited.add(dir);
    const problems = declarer.name === "." ? errors2 : warnings;
    const field = (await readPackageJson(dir))?.skills;
    if (field === undefined)
      continue;
    if (!Array.isArray(field)) {
      if (problems === errors2)
        errors2.push('package.json: "skills" must be an array');
      continue;
    }
    const parsed = parseSkillsField(field, declarer.name);
    problems.push(...parsed.errors);
    for (const request of parsed.remote) {
      const { url, ref, subpath } = request.parsed;
      const key = JSON.stringify([
        url,
        ref,
        subpath,
        request.skills
      ]);
      const existing = remote.get(key);
      if (existing) {
        if (!existing.declarers.includes(declarer.name))
          existing.declarers.push(declarer.name);
      } else
        remote.set(key, {
          ...request,
          via: declarer.name,
          declarers: [declarer.name]
        });
    }
    for (const request of parsed.npm) {
      const target = findInstalledPackage(dir, request.package);
      if (!target) {
        problems.push(`${declarer.name}: cannot resolve "npm:${request.package}"; is it a dependency?`);
        continue;
      }
      await add((await discoverPackageSkills(target, request.package, declarer.depth)).filter((skill) => request.skills.length === 0 || request.skills.includes(basename(skill.path)) || request.skills.includes(sanitizeName(skill.name))).map((skill) => ({
        ...skill,
        via: declarer.name
      })));
      declarers.push({
        name: request.package,
        dir: target,
        depth: declarer.depth + 1
      });
    }
  }
  return {
    skills,
    remote: [...remote.values()],
    warnings,
    errors: errors2
  };
}
function isUnderNodeModules(path2) {
  return path2.split(sep).includes("node_modules");
}
function installedBySync(entry) {
  return entry?.sourceType === "node_modules" || entry?.via !== undefined;
}
async function foreignDestination(dest, canonicalDir, lockEntry, cwd) {
  let stats;
  try {
    stats = await lstat(dest);
  } catch {
    return null;
  }
  if (stats.isSymbolicLink()) {
    const target = resolve(dirname(dest), await readlink(dest));
    if (isUnderNodeModules(target) || target === canonicalDir)
      return null;
    return `${shortenPath$1(dest, cwd)} is a symlink to ${shortenPath$1(target, cwd)}`;
  }
  if (installedBySync(lockEntry))
    return null;
  return `${shortenPath$1(dest, cwd)} already exists and was not installed by sync`;
}
async function linksIntoNodeModules(path2) {
  try {
    if (!(await lstat(path2)).isSymbolicLink())
      return false;
    return isUnderNodeModules(resolve(dirname(path2), await readlink(path2)));
  } catch {
    return false;
  }
}
async function pruneStaleSkills(cwd, keep, keepRemote, lock, dryRun) {
  const canonicalBase = getCanonicalSkillsDir(false, cwd);
  const lockKeys = /* @__PURE__ */ new Map;
  const explicit = /* @__PURE__ */ new Set;
  for (const [key, entry] of Object.entries(lock.skills)) {
    const remote = entry.sourceType !== "node_modules";
    if (installedBySync(entry) && !(remote && keepRemote(entry, key)))
      lockKeys.set(sanitizeName(key), key);
    else
      explicit.add(sanitizeName(key));
  }
  const candidates = new Set(lockKeys.keys());
  for (const name of await readdir(canonicalBase).catch(() => []))
    if (await linksIntoNodeModules(join(canonicalBase, name)))
      candidates.add(name);
  const stale = [...candidates].filter((name) => !keep.has(name) && !explicit.has(name)).sort();
  if (dryRun || stale.length === 0)
    return stale;
  const allAgents = Object.keys(agents);
  for (const name of stale) {
    const canonicalDir = join(canonicalBase, name);
    const key = lockKeys.get(name);
    const lockEntry = key ? lock.skills[key] : undefined;
    const destinations = /* @__PURE__ */ new Set([canonicalDir, ...allAgents.map((agent) => getInstallPath(name, agent, { cwd }))]);
    for (const dest of destinations)
      if (!await foreignDestination(dest, canonicalDir, lockEntry, cwd))
        await rm(dest, {
          recursive: true,
          force: true
        });
    if (key)
      delete lock.skills[key];
  }
  await writeLocalLock(lock, cwd);
  return stale;
}
async function blockedReason(name, targetAgents, lockEntry, cwd) {
  if (lockEntry && !installedBySync(lockEntry))
    return `installed with \`skills add\` from ${lockEntry.source}`;
  const canonicalDir = getCanonicalPath(name, { cwd });
  const destinations = /* @__PURE__ */ new Set([canonicalDir, ...targetAgents.map((agent) => getInstallPath(name, agent, { cwd }))]);
  for (const dest of destinations) {
    const reason = await foreignDestination(dest, canonicalDir, lockEntry, cwd);
    if (reason)
      return reason;
  }
  return null;
}
async function resolveConflicts(skills, targetAgents, lockSkills, cwd) {
  const lockBySanitizedName = new Map(Object.entries(lockSkills).map(([name, entry]) => [sanitizeName(name), entry]));
  const byName = Map.groupBy(skills, (skill) => sanitizeName(skill.name));
  const install = [];
  const skipped = [];
  for (const [name, all] of byName) {
    const depth = Math.min(...all.map((c4) => c4.depth));
    const candidates = all.filter((c4) => c4.depth === depth);
    for (const skill2 of all.filter((c4) => c4.depth !== depth))
      skipped.push({
        skill: skill2,
        reason: `${candidates[0].packageName} is closer to the project`
      });
    if (candidates.length > 1) {
      const packages = candidates.map((c4) => c4.packageName).join(", ");
      for (const skill2 of candidates)
        skipped.push({
          skill: skill2,
          reason: `shipped by ${packages}; drop this one with --exclude ${skill2.packageName}#${name}`
        });
      continue;
    }
    const skill = candidates[0];
    const reason = await blockedReason(name, targetAgents, lockBySanitizedName.get(name), cwd);
    if (reason)
      skipped.push({
        skill,
        reason
      });
    else
      install.push(skill);
  }
  return {
    install,
    skipped
  };
}
async function promptForAgentChoice(choices, fallback) {
  const universalAgents = getUniversalAgents();
  const visibleUniversalAgents = getVisibleUniversalAgents();
  const last2 = await getLastSelectedAgents().catch(() => {
    return;
  });
  const remembered = choices.filter((a2) => last2?.includes(a2));
  const selected = await searchMultiselect({
    message: "Which agents do you want to install to?",
    items: choices.map((a2) => ({
      value: a2,
      label: agents[a2].displayName,
      hint: agents[a2].skillsDir
    })),
    initialSelected: remembered.length > 0 ? remembered : fallback,
    lockedSection: {
      title: "Universal (.agents/skills)",
      items: visibleUniversalAgents.map((a2) => ({
        value: a2,
        label: agents[a2].displayName
      })),
      hiddenCount: universalAgents.length - visibleUniversalAgents.length
    }
  });
  if (!isCancelled(selected))
    await saveSelectedAgents(selected).catch(() => {});
  return selected;
}
function failOnLockChanges(changes) {
  if (changes.length === 0)
    return false;
  log.error(frozenLockfileError(changes));
  process.exitCode = 1;
  return true;
}
function isFromRequest(entry, request) {
  return entry.via !== undefined && entry.source === getProjectLockSource(request.parsed) && entry.ref === request.parsed.ref;
}
function isRemoteInstalled(request, lock, cwd) {
  const installed = Object.entries(lock.skills).filter(([name, entry]) => isFromRequest(entry, request) && existsSync(getCanonicalPath(name, { cwd }))).map(([name]) => sanitizeName(name));
  return request.skills.length === 0 ? installed.length > 0 : request.skills.every((name) => installed.includes(sanitizeName(name)));
}
async function runSync(args, options = {}) {
  const cwd = process.cwd();
  const agentResult = await detectAgent();
  if (agentResult.isAgent) {
    options.yes = true;
    if (!options.agent || options.agent.length === 0) {
      const mappedAgent = getAgentType(agentResult.agent.name);
      if (mappedAgent) {
        const agentList = [mappedAgent];
        for (const ua of getUniversalAgents())
          if (!agentList.includes(ua))
            agentList.push(ua);
        options.agent = agentList;
      }
    }
  }
  console.log();
  if (!agentResult.isAgent)
    intro(import_picocolors2.default.bgCyan(import_picocolors2.default.black(" skills experimental_sync ")));
  if (agentResult.isAgent)
    log.info(import_picocolors2.default.bgCyan(import_picocolors2.default.black(import_picocolors2.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — installing non-interactively");
  const spinner$2 = spinner();
  spinner$2.start("Scanning node_modules for skills…");
  const discovery = await discoverNodeModuleSkills(cwd, options.recursive ?? false);
  if (discovery.errors.length > 0) {
    spinner$2.stop(import_picocolors2.default.red("Invalid skills field"));
    for (const error of discovery.errors)
      log.error(error);
    outro(import_picocolors2.default.red('Fix the "skills" field in package.json and run sync again.'));
    process.exitCode = 1;
    return;
  }
  const discoveredSkills = discovery.skills.filter((skill) => allowedByFilters(skill, options));
  const remote = filterRemoteRequests(discovery.remote, options);
  spinner$2.stop(discoveredSkills.length === 0 ? import_picocolors2.default.yellow("No skills found") : `Found ${import_picocolors2.default.green(String(discoveredSkills.length))} skill${discoveredSkills.length > 1 ? "s" : ""} in node_modules`);
  for (const warning of discovery.warnings)
    log.warn(warning);
  const localLock = await readLocalLock(cwd);
  const frozen = options.frozenLockfile ?? isCI2();
  if (options.cleanup !== false) {
    const keep = new Set(discoveredSkills.map((skill) => sanitizeName(skill.name)));
    const keepRemote = (entry, name) => options.remote === false || remote.some((r3) => requestsLockedSkill(r3, name, entry) && remoteAllowsSkill(r3, name, options));
    const stale = await pruneStaleSkills(cwd, keep, keepRemote, localLock, frozen || (options.dryRun ?? false));
    if (frozen) {
      if (failOnLockChanges(stale.map((name) => `${name} is no longer provided by a dependency`)))
        return;
    } else
      for (const name of stale)
        log.info(`${options.dryRun ? "Would remove" : "Removed"} ${import_picocolors2.default.cyan(name)} ${import_picocolors2.default.dim("(no longer provided by a dependency)")}`);
  }
  const remoteRequests = (options.remote === false ? [] : remote).filter((request) => !isRemoteInstalled(request, localLock, cwd));
  const cachedRemoteSkills = [];
  if (options.remote !== false) {
    const shippedNames = new Set(discoveredSkills.map((skill) => sanitizeName(skill.name)));
    for (const [name, entry] of Object.entries(localLock.skills)) {
      if (shippedNames.has(sanitizeName(name)))
        continue;
      if (!remote.some((request) => !remoteRequests.includes(request) && requestsLockedSkill(request, name, entry) && remoteAllowsSkill(request, name, options)))
        continue;
      const skill = await parseSkillMd(join(getCanonicalPath(name, { cwd }), "SKILL.md"));
      if (skill)
        cachedRemoteSkills.push({
          skill,
          source: entry.source
        });
    }
  }
  if (discoveredSkills.length === 0 && remoteRequests.length === 0 && cachedRemoteSkills.length === 0) {
    outro(import_picocolors2.default.dim("Nothing to sync."));
    return;
  }
  for (const skill of discoveredSkills) {
    log.info(`${import_picocolors2.default.cyan(skill.name)} ${import_picocolors2.default.dim(`from ${skill.packageName}`)}`);
    if (skill.description)
      log.message(import_picocolors2.default.dim(`  ${skill.description}`));
  }
  let targetAgents;
  const validAgents = Object.keys(agents);
  const universalAgents = getUniversalAgents();
  if (options.agent?.includes("*")) {
    targetAgents = validAgents;
    log.info(`Installing to all ${targetAgents.length} agents`);
  } else if (options.agent && options.agent.length > 0) {
    const invalidAgents = options.agent.filter((a2) => !validAgents.includes(a2));
    if (invalidAgents.length > 0) {
      log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
      log.info(`Valid agents: ${validAgents.join(", ")}`);
      process.exit(1);
    }
    targetAgents = options.agent;
  } else {
    spinner$2.start("Loading agents…");
    const installedAgents = await detectInstalledAgents();
    const totalAgents = Object.keys(agents).length;
    spinner$2.stop(`${totalAgents} agents`);
    if (installedAgents.length === 0 && options.yes) {
      targetAgents = universalAgents;
      log.info("Installing to universal agents");
    } else if (installedAgents.length === 1 || options.yes) {
      targetAgents = [...installedAgents];
      for (const ua of universalAgents)
        if (!targetAgents.includes(ua))
          targetAgents.push(ua);
    } else {
      const selected = await promptForAgentChoice(getNonUniversalAgents().filter((a2) => installedAgents.length === 0 || installedAgents.includes(a2)), installedAgents.filter((a2) => !universalAgents.includes(a2)));
      if (isCancelled(selected)) {
        cancel("Sync cancelled");
        process.exit(0);
      }
      targetAgents = selected;
    }
  }
  const { install: toInstall, skipped } = await resolveConflicts(discoveredSkills, targetAgents, localLock.skills, cwd);
  for (const { skill, reason } of skipped)
    log.warn(`Skipped ${import_picocolors2.default.cyan(skill.name)} ${import_picocolors2.default.dim(`from ${skill.packageName}`)}: ${reason}`);
  const cachedToInstall = [];
  for (const cached of cachedRemoteSkills) {
    const { skill } = cached;
    const missing = targetAgents.filter((agent) => !existsSync(getInstallPath(skill.name, agent, { cwd })));
    if (missing.length === 0)
      continue;
    const reason = await blockedReason(skill.name, missing, localLock.skills[skill.name], cwd);
    if (reason)
      log.warn(`Skipped ${import_picocolors2.default.cyan(skill.name)}: ${reason}`);
    else
      cachedToInstall.push({
        ...cached,
        agents: missing
      });
  }
  if (frozen) {
    const changes = [];
    for (const skill of toInstall) {
      const reason = lockChangeReason(localLock, skill.name, {
        computedHash: await computeSkillFolderHash(skill.path),
        version: skill.packageVersion
      });
      if (reason)
        changes.push(reason);
    }
    if (failOnLockChanges(changes))
      return;
  }
  if (toInstall.length === 0 && remoteRequests.length === 0 && cachedToInstall.length === 0) {
    console.log();
    outro(import_picocolors2.default.yellow("Nothing to sync."));
    return;
  }
  const mode = options.copy ? "copy" : "link";
  const summaryLines = [];
  for (const skill of toInstall) {
    const canonicalPath = getCanonicalPath(skill.name, { cwd });
    summaryLines.push(`${import_picocolors2.default.cyan(skill.name)} ${import_picocolors2.default.dim(`← ${skill.packageName}`)}`);
    summaryLines.push(`  ${import_picocolors2.default.dim(`${shortenPath$1(canonicalPath, cwd)} ${mode === "link" ? "→" : "copied from"} ${shortenPath$1(skill.path, cwd)}`)}`);
  }
  for (const request of remoteRequests)
    summaryLines.push(`${import_picocolors2.default.cyan(getProjectLockSource(request.parsed))} ${import_picocolors2.default.dim(`← ${request.via} (remote)`)}`);
  for (const { skill, source, agents: missing } of cachedToInstall)
    summaryLines.push(`${import_picocolors2.default.cyan(skill.name)} ${import_picocolors2.default.dim(`← ${source} (cached), link to ${missing.join(", ")}`)}`);
  console.log();
  note(summaryLines.join(`
`), "Sync Summary");
  if (options.dryRun) {
    outro(import_picocolors2.default.dim("Dry run — nothing changed."));
    return;
  }
  if (!options.yes) {
    const confirmed = await confirm({ message: "Proceed with sync?" });
    if (isCancel(confirmed) || !confirmed) {
      cancel("Sync cancelled");
      process.exit(0);
    }
  }
  spinner$2.start("Syncing skills…");
  const results = [];
  for (const { skill, source, agents: missing } of cachedToInstall)
    for (const agent of missing) {
      const result = await installSkillForAgent(skill, agent, {
        cwd,
        mode: "symlink",
        createMissingAgentRoot: true
      });
      results.push({
        skill: skill.name,
        packageName: source,
        agent: agents[agent].displayName,
        success: result.success,
        path: result.path,
        canonicalPath: result.canonicalPath,
        error: result.error
      });
    }
  for (const skill of toInstall)
    for (const agent of targetAgents) {
      const result = await installSkillForAgent(skill, agent, {
        global: false,
        cwd,
        mode: agent === "eve" ? "copy" : mode
      });
      results.push({
        skill: skill.name,
        packageName: skill.packageName,
        agent: agents[agent].displayName,
        success: result.success,
        path: result.path,
        canonicalPath: result.canonicalPath,
        error: result.error
      });
    }
  spinner$2.stop("Sync complete");
  const successful = results.filter((r3) => r3.success);
  const failed = results.filter((r3) => !r3.success);
  const successfulSkillNames = new Set(successful.map((r3) => r3.skill));
  for (const skill of toInstall)
    if (!frozen && successfulSkillNames.has(skill.name))
      try {
        const computedHash = await computeSkillFolderHash(skill.path);
        await addSkillToLocalLock(skill.name, {
          source: skill.packageName,
          sourceType: "node_modules",
          skillPath: skill.skillPath,
          ...skill.packageVersion && { version: skill.packageVersion },
          ...skill.via && { via: skill.via },
          computedHash
        }, cwd);
      } catch {}
  const claimed = new Set(discoveredSkills.map((skill) => sanitizeName(skill.name)));
  const lockEntryFor = (name) => Object.entries(localLock.skills).find(([key]) => sanitizeName(key) === name)?.[1];
  const fetched = await fetchSources(remoteRequests);
  for (const [index, request] of remoteRequests.entries()) {
    const label = getProjectLockSource(request.parsed);
    const result = await installFromSource(fetched[index], {
      skills: request.skills,
      agents: targetAgents,
      via: request.via,
      ...frozen && { frozenLock: localLock },
      select: async (skills) => {
        const selected = [];
        for (const skill of skills) {
          const name = sanitizeName(skill.name);
          if (!remoteAllowsSkill(request, name, options))
            continue;
          const reason = claimed.has(name) ? "another source in this sync provides it" : await blockedReason(name, targetAgents, lockEntryFor(name), cwd);
          if (reason) {
            log.warn(`Skipped ${import_picocolors2.default.cyan(name)} from ${label}: ${reason}`);
            continue;
          }
          claimed.add(name);
          selected.push(skill);
        }
        return selected;
      }
    });
    if (result.error) {
      log.error(`Failed to install from ${import_picocolors2.default.cyan(label)}: ${result.error}`);
      process.exitCode = 1;
      continue;
    }
    if (result.installed.length > 0)
      log.success(`Installed ${result.installed.map((name) => import_picocolors2.default.cyan(name)).join(", ")} from ${label}`);
    for (const failure of result.failed)
      log.error(failure);
    if (result.failed.length > 0)
      process.exitCode = 1;
  }
  console.log();
  if (successful.length > 0) {
    const bySkill = /* @__PURE__ */ new Map;
    for (const r3 of successful) {
      const skillResults = bySkill.get(r3.skill) || [];
      skillResults.push(r3);
      bySkill.set(r3.skill, skillResults);
    }
    const resultLines = [];
    for (const [skillName, skillResults] of bySkill) {
      const firstResult = skillResults[0];
      const pkg = firstResult.packageName;
      if (firstResult.canonicalPath) {
        const shortPath = shortenPath$1(firstResult.canonicalPath, cwd);
        resultLines.push(`${import_picocolors2.default.green("✓")} ${skillName} ${import_picocolors2.default.dim(`← ${pkg}`)}`);
        resultLines.push(`  ${import_picocolors2.default.dim(shortPath)}`);
      } else
        resultLines.push(`${import_picocolors2.default.green("✓")} ${skillName} ${import_picocolors2.default.dim(`← ${pkg}`)}`);
    }
    const skillCount = bySkill.size;
    const title = import_picocolors2.default.green(`Synced ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
    note(resultLines.join(`
`), title);
  }
  if (failed.length > 0) {
    process.exitCode = 1;
    console.log();
    log.error(import_picocolors2.default.red(`Failed to install ${failed.length}`));
    for (const r3 of failed)
      log.message(`  ${import_picocolors2.default.red("✗")} ${r3.skill} → ${r3.agent}: ${import_picocolors2.default.dim(r3.error)}`);
  }
  track({
    event: "experimental_sync",
    skillCount: String(toInstall.length + cachedToInstall.length),
    successCount: String(successfulSkillNames.size),
    agents: targetAgents.join(",")
  });
  console.log();
  outro(import_picocolors2.default.green("Done!") + import_picocolors2.default.dim("  Review skills before use; they run with full agent permissions."));
}
function parseSyncOptions(args) {
  const options = {};
  let i2 = 0;
  const takeValues = () => {
    const values = [];
    while (args[i2 + 1] !== undefined && !args[i2 + 1].startsWith("-"))
      values.push(args[++i2]);
    return values;
  };
  for (;i2 < args.length; i2++) {
    const arg = args[i2];
    if (arg === "-y" || arg === "--yes")
      options.yes = true;
    else if (arg === "--copy")
      options.copy = true;
    else if (arg === "--dry-run")
      options.dryRun = true;
    else if (arg === "--no-cleanup")
      options.cleanup = false;
    else if (arg === "--no-remote")
      options.remote = false;
    else if (arg === "--frozen-lockfile")
      options.frozenLockfile = true;
    else if (arg === "--no-frozen-lockfile")
      options.frozenLockfile = false;
    else if (arg === "-r" || arg === "--recursive")
      options.recursive = true;
    else if (arg === "-a" || arg === "--agent")
      options.agent = [...options.agent ?? [], ...takeValues()];
    else if (arg === "--include")
      options.include = [...options.include ?? [], ...takeValues()];
    else if (arg === "--exclude")
      options.exclude = [...options.exclude ?? [], ...takeValues()];
  }
  return { options };
}
function formatSourceInput(sourceUrl, ref) {
  if (!ref)
    return sourceUrl;
  return `${sourceUrl}#${ref}`;
}
function deriveSkillFolder(skillPath) {
  let folder = skillPath;
  if (folder.endsWith("/SKILL.md"))
    folder = folder.slice(0, -9);
  else if (folder.endsWith("SKILL.md"))
    folder = folder.slice(0, -8);
  if (folder.endsWith("/"))
    folder = folder.slice(0, -1);
  return folder;
}
function supportsAppendedSubpath(source) {
  if (source.startsWith("git@") || source.startsWith("ssh://"))
    return false;
  if (source.endsWith(".git"))
    return false;
  if (source.startsWith("http://") || source.startsWith("https://"))
    try {
      const host = new URL(source).hostname;
      return host === "github.com" || host === "gitlab.com";
    } catch {
      return false;
    }
  return true;
}
function isBareShorthand(source) {
  return !source.includes(":") && !source.startsWith(".") && !source.startsWith("/");
}
function getLocalSource(entry) {
  if (entry.sourceUrl)
    return entry.sourceUrl;
  if ((entry.sourceType === "git" || entry.sourceType === "gitlab") && isBareShorthand(entry.source))
    return null;
  return entry.source;
}
function buildLocalCloneSource(entry) {
  const source = getLocalSource(entry);
  if (!source)
    return null;
  if (entry.sourceType === "github" && isBareShorthand(source))
    return `https://github.com/${source.replace(/\.git$/, "")}.git`;
  return source;
}
function shouldUseFullDepthForUpdate(entry) {
  if (!entry.skillPath)
    return false;
  const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.source;
  return source !== null && !supportsAppendedSubpath(source);
}
function appendFolderAndRef(source, skillPath, ref) {
  if (!supportsAppendedSubpath(source))
    return formatSourceInput(source, ref);
  const folder = deriveSkillFolder(skillPath);
  const withFolder = folder ? `${source}/${folder}` : source;
  return ref ? `${withFolder}#${ref}` : withFolder;
}
function buildUpdateInstallSource(entry) {
  if (!entry.skillPath) {
    const source2 = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.sourceUrl || entry.source;
    if (!source2)
      return null;
    return formatSourceInput(source2, entry.ref);
  }
  const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.source;
  if (!source)
    return null;
  return appendFolderAndRef(source, entry.skillPath, entry.ref);
}
function buildLocalUpdateSource(entry) {
  const source = getLocalSource(entry);
  if (!source)
    return null;
  if (!entry.skillPath)
    return formatSourceInput(source, entry.ref);
  return appendFolderAndRef(source, entry.skillPath, entry.ref);
}
async function runInstallFromLock(args) {
  const cwd = process.cwd();
  const { options: syncOptions } = parseSyncOptions(args);
  const frozen = syncOptions.frozenLockfile ?? isCI2();
  const force = args.includes("--force");
  const lock = await readLocalLock(cwd);
  const skillEntries = Object.entries(lock.skills);
  if (skillEntries.length === 0) {
    if (frozen) {
      log.error("Cannot install with --frozen-lockfile because skills-lock.json is absent or has no skills");
      process.exitCode = 1;
      return;
    }
    log.warn("No project skills found in skills-lock.json");
    log.info(`Add project-level skills with ${import_picocolors2.default.cyan("npx skills add <package>")} (without ${import_picocolors2.default.cyan("-g")})`);
    return;
  }
  const universalAgentNames = getUniversalAgents();
  const nodeModuleSkills = [];
  const alreadyInstalled = [];
  const bySource = /* @__PURE__ */ new Map;
  for (const [skillName, entry] of skillEntries) {
    if (entry.sourceType === "node_modules") {
      nodeModuleSkills.push(skillName);
      continue;
    }
    if (!force && existsSync(join(getCanonicalPath(skillName, { cwd }), "SKILL.md"))) {
      alreadyInstalled.push(skillName);
      continue;
    }
    const installSource = buildLocalUpdateSource(entry);
    if (!installSource) {
      log.error(`Cannot restore ${import_picocolors2.default.cyan(skillName)}: skills-lock.json is missing sourceUrl for this generic Git source`);
      continue;
    }
    bySource.set(installSource, [...bySource.get(installSource) ?? [], skillName]);
  }
  if (alreadyInstalled.length > 0)
    log.info(`${import_picocolors2.default.cyan(String(alreadyInstalled.length))} skill${alreadyInstalled.length !== 1 ? "s" : ""} already installed ${import_picocolors2.default.dim("(use --force to reinstall)")}`);
  const remoteCount = skillEntries.length - nodeModuleSkills.length - alreadyInstalled.length;
  if (remoteCount > 0)
    log.info(`${syncOptions.dryRun ? "Would restore" : "Restoring"} ${import_picocolors2.default.cyan(String(remoteCount))} skill${remoteCount !== 1 ? "s" : ""} from skills-lock.json into ${import_picocolors2.default.dim(".agents/skills/")}`);
  if (syncOptions.dryRun) {
    for (const [source, skills] of bySource)
      log.message(`${skills.map((name) => import_picocolors2.default.cyan(name)).join(", ")} ${import_picocolors2.default.dim(`from ${source}`)}`);
    bySource.clear();
  }
  const requests = [...bySource].map(([source, skills]) => ({
    source,
    parsed: parseSource(source),
    skills
  }));
  const fetched = await fetchSources(requests);
  for (const [index, { source, skills }] of requests.entries()) {
    const result = await installFromSource(fetched[index], {
      skills,
      agents: universalAgentNames,
      ...frozen && { frozenLock: lock }
    });
    if (result.error) {
      log.error(`Failed to install from ${import_picocolors2.default.cyan(source)}: ${result.error}`);
      process.exitCode = 1;
      continue;
    }
    log.success(`Restored ${result.installed.map((name) => import_picocolors2.default.cyan(name)).join(", ")}`);
    for (const failure of result.failed)
      log.error(failure);
    if (result.failed.length > 0)
      process.exitCode = 1;
  }
  if (nodeModuleSkills.length > 0) {
    log.info(`${import_picocolors2.default.cyan(String(nodeModuleSkills.length))} skill${nodeModuleSkills.length !== 1 ? "s" : ""} from node_modules`);
    try {
      await runSync(args, {
        ...syncOptions,
        frozenLockfile: frozen,
        yes: true,
        agent: universalAgentNames
      });
    } catch (error) {
      log.error(`Failed to sync node_modules skills: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
var RESET$2 = "\x1B[0m";
var BOLD$2 = "\x1B[1m";
var DIM$2 = "\x1B[38;5;102m";
var CYAN = "\x1B[36m";
var YELLOW = "\x1B[33m";
function shortenPath(fullPath, cwd) {
  const home2 = homedir();
  if (fullPath.startsWith(home2))
    return fullPath.replace(home2, "~");
  if (fullPath.startsWith(cwd))
    return "." + fullPath.slice(cwd.length);
  return fullPath;
}
function formatList(items, maxShow = 5) {
  if (items.length <= maxShow)
    return items.join(", ");
  const shown = items.slice(0, maxShow);
  const remaining = items.length - maxShow;
  return `${shown.join(", ")} +${remaining} more`;
}
function parseListOptions(args) {
  const options = {};
  for (let i2 = 0;i2 < args.length; i2++) {
    const arg = args[i2];
    if (arg === "-g" || arg === "--global")
      options.global = true;
    else if (arg === "--json")
      options.json = true;
    else if (arg === "-a" || arg === "--agent") {
      options.agent = options.agent || [];
      while (i2 + 1 < args.length && !args[i2 + 1].startsWith("-"))
        options.agent.push(args[++i2]);
    }
  }
  return options;
}
async function readProjectLockOrWarn(cwd) {
  try {
    return (await readLocalLock(cwd)).skills;
  } catch (error) {
    if (!(error instanceof InvalidLocalLockError))
      throw error;
    console.error(`${YELLOW}Warning: ${error.message}${RESET$2}`);
    return {};
  }
}
async function runList(args) {
  const options = parseListOptions(args);
  const scope = options.global === true ? true : false;
  let agentFilter;
  if (options.agent && options.agent.length > 0) {
    const validAgents = Object.keys(agents);
    const invalidAgents = options.agent.filter((a2) => !validAgents.includes(a2));
    if (invalidAgents.length > 0) {
      console.log(`${YELLOW}Invalid agents: ${invalidAgents.join(", ")}${RESET$2}`);
      console.log(`${DIM$2}Valid agents: ${validAgents.join(", ")}${RESET$2}`);
      process.exit(1);
    }
    agentFilter = options.agent;
  }
  const installedSkills = await listInstalledSkills({
    global: scope,
    agentFilter
  });
  const cwd = process.cwd();
  const lockedSkills = scope ? await getAllLockedSkills() : await readProjectLockOrWarn(cwd);
  const lockEntriesBySanitizedName = new Map(Object.entries(lockedSkills).map(([name, entry]) => [sanitizeName(name), entry]));
  const getLockEntry = (skillName) => lockedSkills[skillName] ?? lockEntriesBySanitizedName.get(sanitizeName(skillName));
  const installedNames = new Set(installedSkills.map((skill) => sanitizeName(skill.name)));
  const missingSkills = agentFilter ? [] : Object.entries(lockedSkills).filter(([name]) => !installedNames.has(sanitizeName(name)));
  if (options.json) {
    const jsonOutput = installedSkills.map((skill) => {
      const lockEntry = getLockEntry(skill.name);
      return {
        name: skill.name,
        path: skill.canonicalPath,
        scope: skill.scope,
        agents: skill.agents.map((a2) => agents[a2].displayName),
        source: lockEntry?.source ?? null,
        sourceUrl: lockEntry?.sourceUrl ?? null,
        sourceType: lockEntry?.sourceType ?? null,
        status: lockEntry ? "tracked" : "untracked"
      };
    });
    const missingOutput = missingSkills.map(([name, lockEntry]) => ({
      name,
      path: null,
      scope: scope ? "global" : "project",
      agents: [],
      source: lockEntry.source,
      sourceUrl: lockEntry.sourceUrl ?? null,
      sourceType: lockEntry.sourceType,
      status: "missing"
    }));
    console.log(JSON.stringify([...jsonOutput, ...missingOutput], null, 2));
    return;
  }
  const scopeLabel = scope ? "Global" : "Project";
  if (installedSkills.length === 0 && missingSkills.length === 0) {
    if (options.json) {
      console.log("[]");
      return;
    }
    console.log(`${DIM$2}No ${scopeLabel.toLowerCase()} skills found.${RESET$2}`);
    if (scope)
      console.log(`${DIM$2}Try listing project skills without -g${RESET$2}`);
    else
      console.log(`${DIM$2}Try listing global skills with -g${RESET$2}`);
    return;
  }
  function printSkill(skill, indent = false, maxNameLength = 0, maxPathLength = 0) {
    const prefix = indent ? "  " : "";
    const shortPath = shortenPath(skill.canonicalPath, cwd);
    const agentNames = skill.agents.map((a2) => agents[a2].displayName);
    const agentInfo = skill.agents.length > 0 ? formatList(agentNames) : `${YELLOW}not linked${RESET$2}`;
    const paddedName = sanitizeMetadata(skill.name).padEnd(maxNameLength);
    const paddedPath = shortPath.padEnd(maxPathLength);
    const source = getLockEntry(skill.name)?.source ?? null;
    const sourceLabel = source ? sanitizeMetadata(source) : `${YELLOW}untracked${RESET$2}`;
    console.log(`${prefix}${CYAN}${paddedName}${RESET$2} ${DIM$2}${paddedPath}${RESET$2}`);
    console.log(`${prefix}  ${DIM$2}Agents:${RESET$2} ${agentInfo}  ${DIM$2}Source:${RESET$2} ${sourceLabel}`);
  }
  console.log(`${BOLD$2}${scopeLabel} Skills${RESET$2}`);
  console.log();
  const groupedSkills = {};
  const ungroupedSkills = [];
  for (const skill of installedSkills) {
    const lockEntry = getLockEntry(skill.name);
    if (lockEntry?.pluginName) {
      const group = lockEntry.pluginName;
      if (!groupedSkills[group])
        groupedSkills[group] = [];
      groupedSkills[group].push(skill);
    } else
      ungroupedSkills.push(skill);
  }
  if (Object.keys(groupedSkills).length > 0) {
    const sortedGroups = Object.keys(groupedSkills).sort();
    for (const group of sortedGroups) {
      const title = group.split("-").map((w2) => w2.charAt(0).toUpperCase() + w2.slice(1)).join(" ");
      console.log(`${BOLD$2}${title}${RESET$2}`);
      const skills = groupedSkills[group];
      if (skills) {
        let maxNameLength = 0;
        let maxPathLength = 0;
        for (const skill of skills) {
          const nameLength = sanitizeMetadata(skill.name).length;
          const pathLength = shortenPath(skill.canonicalPath, cwd).length;
          if (nameLength > maxNameLength)
            maxNameLength = nameLength;
          if (pathLength > maxPathLength)
            maxPathLength = pathLength;
        }
        for (const skill of skills)
          printSkill(skill, true, maxNameLength, maxPathLength);
      }
      console.log();
    }
    if (ungroupedSkills.length > 0) {
      console.log(`${BOLD$2}General${RESET$2}`);
      let maxNameLength = 0;
      let maxPathLength = 0;
      for (const skill of ungroupedSkills) {
        const nameLength = sanitizeMetadata(skill.name).length;
        const pathLength = shortenPath(skill.canonicalPath, cwd).length;
        if (nameLength > maxNameLength)
          maxNameLength = nameLength;
        if (pathLength > maxPathLength)
          maxPathLength = pathLength;
      }
      for (const skill of ungroupedSkills)
        printSkill(skill, true, maxNameLength, maxPathLength);
      console.log();
    }
  } else {
    let maxNameLength = 0;
    let maxPathLength = 0;
    for (const skill of installedSkills) {
      const nameLength = sanitizeMetadata(skill.name).length;
      const pathLength = shortenPath(skill.canonicalPath, cwd).length;
      if (nameLength > maxNameLength)
        maxNameLength = nameLength;
      if (pathLength > maxPathLength)
        maxPathLength = pathLength;
    }
    for (const skill of installedSkills)
      printSkill(skill, false, maxNameLength, maxPathLength);
    console.log();
  }
  if (missingSkills.length > 0) {
    console.log(`${BOLD$2}Missing${RESET$2} ${DIM$2}(in the lock file, not on disk)${RESET$2}`);
    for (const [name, entry] of missingSkills)
      console.log(`  ${CYAN}${sanitizeMetadata(name)}${RESET$2}  ${DIM$2}Source:${RESET$2} ${sanitizeMetadata(entry.source)}`);
    console.log();
  }
}
function resolveSkillsToRemove(requested, folderNames, lockKeys = [], sourceByKey = {}) {
  const identityBySanitized = /* @__PURE__ */ new Map;
  for (const folder of folderNames)
    identityBySanitized.set(sanitizeName(folder), folder);
  for (const key of lockKeys)
    identityBySanitized.set(sanitizeName(key), key);
  const matched = /* @__PURE__ */ new Set;
  for (const name of requested) {
    const hit = identityBySanitized.get(sanitizeName(name));
    if (hit) {
      matched.add(hit);
      continue;
    }
    for (const key of lockKeys)
      if (sourceByKey[key] === name)
        matched.add(key);
  }
  return Array.from(matched);
}
function isSameDir(a2, b3) {
  try {
    return realpathSync(a2) === realpathSync(b3);
  } catch {
    return false;
  }
}
async function removeCommand(skillNames, options) {
  const agentResult = await detectAgent();
  if (agentResult.isAgent) {
    options.yes = true;
    log.info(import_picocolors2.default.bgCyan(import_picocolors2.default.black(import_picocolors2.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — removing non-interactively");
  }
  if (skillNames.includes("*")) {
    options.all = true;
    skillNames = skillNames.filter((name) => name !== "*");
  }
  const namedSkills = skillNames.filter((name) => name !== "*");
  if (options.all && namedSkills.length > 0) {
    log.error("Cannot combine --all with specific skill names.");
    log.info("Use `skills remove --all` to remove every skill, or omit --all to remove only the named skills.");
    log.info(`Example: skills remove ${namedSkills[0]} -y`);
    process.exit(1);
  }
  const isGlobal = options.global ?? false;
  const cwd = process.cwd();
  const spinner$1 = spinner();
  spinner$1.start("Scanning for installed skills…");
  const skillNamesSet = /* @__PURE__ */ new Set;
  const scanDir = async (dir) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith("."))
          continue;
        if (!await hasSkillMd(join(dir, entry.name)))
          continue;
        skillNamesSet.add(entry.name);
      }
    } catch (err) {
      if (err instanceof Error && err.code !== "ENOENT")
        log.warn(`Could not scan directory ${dir}: ${err.message}`);
    }
  };
  if (isGlobal) {
    await scanDir(getCanonicalSkillsDir(true, cwd));
    for (const agent of Object.values(agents))
      if (agent.globalSkillsDir !== undefined)
        await scanDir(agent.globalSkillsDir);
  } else {
    await scanDir(getCanonicalSkillsDir(false, cwd));
    for (const agent of Object.values(agents))
      await scanDir(join(cwd, agent.skillsDir));
    for (const subagent of getEveSubagents(cwd))
      await scanDir(getEveSubagentSkillsDir(subagent, cwd));
  }
  const installedSkills = Array.from(skillNamesSet).sort();
  spinner$1.stop(`Found ${installedSkills.length} unique installed skill(s)`);
  const lockEntries = isGlobal ? (await readSkillLock()).skills : (await readLocalLock(cwd)).skills;
  const lockSkillsKeys = Object.keys(lockEntries);
  const sourceByKey = Object.fromEntries(lockSkillsKeys.map((key) => [key, lockEntries[key]?.source]));
  const requestedSkills = options.all ? [...installedSkills, ...lockSkillsKeys] : skillNames;
  const resolvedRequestedSkills = options.all || skillNames.length > 0 ? resolveSkillsToRemove(requestedSkills, installedSkills, lockSkillsKeys, sourceByKey) : [];
  if (installedSkills.length === 0 && resolvedRequestedSkills.length === 0) {
    outro(import_picocolors2.default.yellow("No skills found to remove."));
    return;
  }
  if (options.agent && options.agent.length > 0) {
    const validAgents = Object.keys(agents);
    const invalidAgents = options.agent.filter((a2) => !validAgents.includes(a2));
    if (invalidAgents.length > 0) {
      log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
      log.info(`Valid agents: ${validAgents.join(", ")}`);
      process.exit(1);
    }
  }
  let selectedSkills = [];
  if (options.all)
    selectedSkills = resolvedRequestedSkills;
  else if (skillNames.length > 0) {
    selectedSkills = resolvedRequestedSkills;
    if (selectedSkills.length === 0) {
      log.error(`No matching skills found for: ${skillNames.join(", ")}`);
      return;
    }
  } else {
    const choices = installedSkills.map((s3) => ({
      value: s3,
      label: s3
    }));
    const selected = await multiselect({
      message: `Select skills to remove ${import_picocolors2.default.dim("(space to toggle)")}`,
      options: choices,
      required: true
    });
    if (isCancel(selected)) {
      cancel("Removal cancelled");
      process.exit(0);
    }
    selectedSkills = resolveSkillsToRemove(selected, installedSkills, lockSkillsKeys);
  }
  if (!isGlobal && isSameDir(getCanonicalSkillsDir(false, cwd), getCanonicalSkillsDir(true))) {
    const globalNames = new Set(Object.keys((await readSkillLock()).skills).map(sanitizeName));
    const globallyTracked = selectedSkills.filter((s3) => !lockEntries[s3] && globalNames.has(sanitizeName(s3)));
    if (globallyTracked.length > 0) {
      log.error(`Tracked in the global lock: ${globallyTracked.join(", ")}`);
      log.info(`Remove globally with: skills remove ${globallyTracked.join(" ")} -g`);
      process.exit(1);
    }
  }
  let targetAgents;
  if (options.agent && options.agent.length > 0)
    targetAgents = options.agent;
  else {
    targetAgents = Object.keys(agents);
    spinner$1.stop(`Targeting ${targetAgents.length} potential agent(s)`);
  }
  if (!options.yes) {
    console.log();
    log.info("Skills to remove:");
    for (const skill of selectedSkills)
      log.message(`  ${import_picocolors2.default.red("•")} ${skill}`);
    console.log();
    const confirmed = await confirm({ message: `Are you sure you want to uninstall ${selectedSkills.length} skill(s)?` });
    if (isCancel(confirmed) || !confirmed) {
      cancel("Removal cancelled");
      process.exit(0);
    }
  }
  spinner$1.start("Removing skills…");
  const results = [];
  for (const skillName of selectedSkills)
    try {
      const canonicalPath = getCanonicalPath(skillName, {
        global: isGlobal,
        cwd
      });
      for (const agentKey of targetAgents) {
        const agent = agents[agentKey];
        const skillPath = getInstallPath(skillName, agentKey, {
          global: isGlobal,
          cwd
        });
        const pathsToCleanup = /* @__PURE__ */ new Set([skillPath]);
        const sanitizedName = sanitizeName(skillName);
        if (isGlobal && agent.globalSkillsDir)
          pathsToCleanup.add(join(agent.globalSkillsDir, sanitizedName));
        else {
          pathsToCleanup.add(join(cwd, agent.skillsDir, sanitizedName));
          if (agentKey === "eve")
            for (const subagent of getEveSubagents(cwd))
              pathsToCleanup.add(join(getEveSubagentSkillsDir(subagent, cwd), sanitizedName));
        }
        for (const pathToCleanup of pathsToCleanup) {
          if (pathToCleanup === canonicalPath)
            continue;
          try {
            if (await lstat(pathToCleanup).catch(() => null))
              await rm(pathToCleanup, {
                recursive: true,
                force: true
              });
          } catch (err) {
            log.warn(`Could not remove skill from ${agent.displayName}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
      const remainingAgents = (await detectInstalledAgents()).filter((a2) => !targetAgents.includes(a2));
      let isStillUsed = false;
      for (const agentKey of remainingAgents)
        if (await lstat(getInstallPath(skillName, agentKey, {
          global: isGlobal,
          cwd
        })).catch(() => null)) {
          isStillUsed = true;
          break;
        }
      if (!isStillUsed)
        await rm(canonicalPath, {
          recursive: true,
          force: true
        });
      let effectiveSource = "local";
      let effectiveSourceType = "local";
      if (isGlobal) {
        const lockEntry = await getSkillFromLock(skillName);
        effectiveSource = lockEntry?.source || "local";
        effectiveSourceType = lockEntry?.sourceType || "local";
        if (!isStillUsed)
          await removeSkillFromLock(skillName);
      } else {
        const lockEntry = (await readLocalLock(cwd)).skills[skillName];
        effectiveSource = lockEntry?.source || "local";
        effectiveSourceType = lockEntry?.sourceType || "local";
        if (!isStillUsed)
          await removeSkillFromLocalLock(skillName, cwd);
      }
      results.push({
        skill: skillName,
        success: true,
        source: effectiveSource,
        sourceType: effectiveSourceType
      });
    } catch (err) {
      results.push({
        skill: skillName,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  spinner$1.stop("Removal process complete");
  const successful = results.filter((r3) => r3.success);
  const failed = results.filter((r3) => !r3.success);
  if (successful.length > 0) {
    const bySource = /* @__PURE__ */ new Map;
    for (const r3 of successful) {
      const source = r3.sourceType === "local" ? "local" : r3.source || "local";
      const existing = bySource.get(source) || { skills: [] };
      existing.skills.push(r3.skill);
      existing.sourceType = r3.sourceType;
      bySource.set(source, existing);
    }
    for (const [source, data] of bySource)
      track({
        event: "remove",
        source,
        skills: data.skills.join(","),
        agents: targetAgents.join(","),
        ...isGlobal && { global: "1" },
        sourceType: data.sourceType
      });
  }
  if (successful.length > 0)
    log.success(import_picocolors2.default.green(`Successfully removed ${successful.length} skill(s)`));
  if (failed.length > 0) {
    log.error(import_picocolors2.default.red(`Failed to remove ${failed.length} skill(s)`));
    for (const r3 of failed)
      log.message(`  ${import_picocolors2.default.red("✗")} ${r3.skill}: ${r3.error}`);
  }
  console.log();
  outro(import_picocolors2.default.green("Done!"));
}
function parseRemoveOptions(args) {
  const options = {};
  const skills = [];
  for (let i2 = 0;i2 < args.length; i2++) {
    const arg = args[i2];
    if (arg === "-g" || arg === "--global")
      options.global = true;
    else if (arg === "-y" || arg === "--yes")
      options.yes = true;
    else if (arg === "--all") {
      options.all = true;
      options.yes = true;
    } else if (arg === "-s" || arg === "--skill") {
      i2++;
      let nextArg = args[i2];
      while (i2 < args.length && nextArg && !nextArg.startsWith("-")) {
        skills.push(nextArg);
        i2++;
        nextArg = args[i2];
      }
      i2--;
    } else if (arg === "-a" || arg === "--agent") {
      options.agent = options.agent || [];
      i2++;
      let nextArg = args[i2];
      while (i2 < args.length && nextArg && !nextArg.startsWith("-")) {
        options.agent.push(nextArg);
        i2++;
        nextArg = args[i2];
      }
      i2--;
    } else if (arg && !arg.startsWith("-"))
      skills.push(arg);
  }
  return {
    skills,
    options
  };
}
function normalizeSkillName(name) {
  return name.toLowerCase().replace(/[\s_]+/g, "-");
}
function normalizeSkillPath(path2) {
  return path2.replace(/\\/g, "/").replace(/\/+/g, "/");
}
function resolveSkillLocations(lockedSkillNames, lockSkills, discovered, options = {}) {
  const discoveredPaths = new Set(discovered.map((skill) => normalizeSkillPath(skill.skillPath)));
  const pathsByName = /* @__PURE__ */ new Map;
  for (const skill of discovered) {
    const key = normalizeSkillName(skill.name);
    const paths = pathsByName.get(key) ?? /* @__PURE__ */ new Set;
    paths.add(normalizeSkillPath(skill.skillPath));
    pathsByName.set(key, paths);
  }
  const deletedSkills = [];
  const ambiguousSkills = [];
  const resolvedPaths = /* @__PURE__ */ new Map;
  for (const name of lockedSkillNames) {
    const lockedPath = lockSkills[name]?.skillPath;
    if (!lockedPath)
      continue;
    const normalizedLockedPath = normalizeSkillPath(lockedPath);
    const candidates = [...pathsByName.get(normalizeSkillName(name)) ?? []];
    const lockedPathStillExists = discoveredPaths.has(normalizedLockedPath);
    if (lockedPathStillExists && options.exactPathDisambiguates) {
      resolvedPaths.set(name, normalizedLockedPath);
      continue;
    }
    if (candidates.length > 1) {
      ambiguousSkills.push(name);
      continue;
    }
    if (lockedPathStillExists) {
      resolvedPaths.set(name, normalizedLockedPath);
      continue;
    }
    if (candidates.length === 1)
      resolvedPaths.set(name, candidates[0]);
    else
      deletedSkills.push(name);
  }
  return {
    deletedSkills,
    ambiguousSkills,
    resolvedPaths
  };
}
var RESET$1 = "\x1B[0m";
var BOLD$1 = "\x1B[1m";
var DIM$1 = "\x1B[38;5;102m";
var TEXT$1 = "\x1B[38;5;145m";
function printFetching(sourceCount) {
  if (sourceCount === 0)
    return;
  console.log(`${DIM$1}Fetching ${sourceCount} source${sourceCount === 1 ? "" : "s"}…${RESET$1}`);
}
function withGlobalSkillsDir(targetAgents) {
  const supported = targetAgents.filter((a2) => agents[a2].globalSkillsDir !== undefined);
  return supported.length > 0 ? supported : targetAgents;
}
function placementResolver(global) {
  let agentsPromise;
  return async (subagents, installMode) => {
    agentsPromise ??= nonInteractiveTargetAgents();
    let targetAgents = await agentsPromise;
    const hasSubagents = !!subagents?.length;
    if (hasSubagents && !targetAgents.includes("eve"))
      targetAgents = [...targetAgents, "eve"];
    if (global)
      targetAgents = withGlobalSkillsDir(targetAgents);
    const targets = buildInstallTargets(targetAgents, hasSubagents ? subagents.map((s3) => s3 === "" ? undefined : s3) : [undefined]);
    return {
      global,
      targets,
      mode: installMode ?? defaultInstallMode(targets),
      createMissingAgentRoot: (agent) => hasSubagents && agent === "eve"
    };
  };
}
function reportInstall(name, outcome) {
  const safeName = sanitizeMetadata(name);
  for (const failure of outcome.failed)
    console.log(`  ${DIM$1}✗ ${failure}${RESET$1}`);
  if (outcome.ok && !outcome.error) {
    console.log(`  ${TEXT$1}✓${RESET$1} Updated ${safeName}`);
    return true;
  }
  console.log(`  ${DIM$1}✗ Failed to update ${safeName}${outcome.error ? `: ${outcome.error}` : ""}${RESET$1}`);
  return false;
}
async function installedSkillNames(global) {
  return new Set((await listInstalledSkills({ global })).map((skill) => skill.name));
}
function targetOutcome(results) {
  return {
    ok: results.some((r3) => r3.success),
    failed: results.filter((r3) => !r3.success).map((r3) => `${r3.agent}: ${r3.error}`)
  };
}
function parseUpdateSource(installUrl, sourceType) {
  return parseSource(installUrl, sourceType === "github" ? { githubHost: "github.com" } : {});
}
function parseUpdateOptions(args) {
  const options = {};
  const positional = [];
  for (const arg of args)
    if (arg === "-g" || arg === "--global")
      options.global = true;
    else if (arg === "-p" || arg === "--project")
      options.project = true;
    else if (arg === "-y" || arg === "--yes")
      options.yes = true;
    else if (!arg.startsWith("-"))
      positional.push(arg);
  if (positional.length > 0)
    options.skills = positional;
  return options;
}
function hasProjectSkills(cwd) {
  const dir = cwd || process.cwd();
  if (existsSync(join(dir, "skills-lock.json")))
    return true;
  const skillsDir = join(dir, ".agents", "skills");
  try {
    const entries = readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries)
      if (entry.isDirectory()) {
        if (existsSync(join(skillsDir, entry.name, "SKILL.md")))
          return true;
      }
  } catch {}
  return false;
}
async function resolveUpdateScope(options) {
  if (options.skills && options.skills.length > 0) {
    if (options.global)
      return "global";
    if (options.project)
      return "project";
    return "both";
  }
  if (options.global && options.project)
    return "both";
  if (options.global)
    return "global";
  if (options.project)
    return "project";
  if (options.yes || !process.stdin.isTTY)
    return hasProjectSkills() ? "project" : "global";
  const scope = await select({
    message: "Update scope",
    options: [
      {
        value: "project",
        label: "Project",
        hint: "Update skills in current directory"
      },
      {
        value: "global",
        label: "Global",
        hint: "Update skills in home directory"
      },
      {
        value: "both",
        label: "Both",
        hint: "Update all skills"
      }
    ]
  });
  if (isCancel(scope)) {
    cancel("Cancelled");
    process.exit(0);
  }
  return scope;
}
function matchesSkillFilter(name, filter) {
  if (!filter || filter.length === 0)
    return true;
  const lower = name.toLowerCase();
  return filter.some((f2) => f2.toLowerCase() === lower);
}
function getSkipReason(entry) {
  if (entry.sourceType === "local")
    return "Local path";
  if (entry.sourceType === "git")
    return "Git URL";
  if (entry.sourceType === "well-known")
    return "Well-known skill";
  if (!entry.skillFolderHash)
    return "Private or deleted repo";
  if (!entry.skillPath)
    return "No skill path recorded";
  return "No version tracking";
}
function getInstallSource(skill) {
  let url = skill.sourceUrl;
  if (skill.sourceType === "well-known") {
    const idx = url.indexOf("/.well-known/");
    if (idx !== -1)
      url = url.slice(0, idx);
  }
  return formatSourceInput(url, skill.ref);
}
function printSkippedSkills(skipped) {
  if (skipped.length === 0)
    return;
  console.log();
  console.log(`${DIM$1}${skipped.length} skill(s) cannot be checked automatically:${RESET$1}`);
  const grouped = /* @__PURE__ */ new Map;
  for (const skill of skipped) {
    const source = getInstallSource(skill);
    const existing = grouped.get(source) || [];
    existing.push(skill);
    grouped.set(source, existing);
  }
  for (const [source, skills] of grouped) {
    if (skills.length === 1) {
      const skill = skills[0];
      console.log(`  ${TEXT$1}•${RESET$1} ${sanitizeMetadata(skill.name)} ${DIM$1}(${skill.reason})${RESET$1}`);
    } else {
      const reason = skills[0].reason;
      const names = skills.map((s3) => sanitizeMetadata(s3.name)).join(", ");
      console.log(`  ${TEXT$1}•${RESET$1} ${names} ${DIM$1}(${reason})${RESET$1}`);
    }
    console.log(`    ${DIM$1}To update: ${TEXT$1}npx skills add ${source} -g -y${RESET$1}`);
  }
}
async function getProjectSkillsForUpdate(skillFilter) {
  const localLock = await readLocalLock();
  const skills = [];
  for (const [name, entry] of Object.entries(localLock.skills)) {
    if (!matchesSkillFilter(name, skillFilter))
      continue;
    if (entry.sourceType === "node_modules" || entry.sourceType === "local")
      continue;
    skills.push({
      name,
      source: entry.sourceUrl || entry.source,
      entry
    });
  }
  return skills;
}
async function promptDeletions(source, deletedSkills, isGlobal, options) {
  if (deletedSkills.length === 0)
    return;
  console.log();
  console.log(`${DIM$1}Warning:${RESET$1} The following skills from ${DIM$1}${source}${RESET$1} appear to have been deleted upstream:`);
  for (const s3 of deletedSkills)
    console.log(`  ${DIM$1}•${RESET$1} ${s3}`);
  if (options.yes || !process.stdin.isTTY) {
    console.log(`${DIM$1}Skipping deletion in non-interactive mode.${RESET$1}`);
    return;
  }
  const confirmed = await confirm({ message: `Would you like to remove the local copies of these deleted skills?` });
  if (confirmed && !isCancel(confirmed))
    for (const s3 of deletedSkills) {
      console.log(`${DIM$1}Removing${RESET$1} ${s3}…`);
      await removeCommand([s3], {
        yes: true,
        global: isGlobal
      });
    }
}
async function checkAndPromptForDeletions(source, allLockedForSource, lockSkills, isGlobal, options, discovered, locationOptions = {}) {
  const resolution = resolveSkillLocations(allLockedForSource, lockSkills, discovered, locationOptions);
  if (resolution.ambiguousSkills.length > 0) {
    console.log();
    console.log(`${DIM$1}Warning:${RESET$1} Multiple current paths match these skills from ${DIM$1}${source}${RESET$1}; skipping them rather than deleting or migrating the wrong skill:`);
    for (const name of resolution.ambiguousSkills)
      console.log(`  ${DIM$1}•${RESET$1} ${sanitizeMetadata(name)}`);
  }
  await promptDeletions(source, resolution.deletedSkills, isGlobal, options);
  return resolution;
}
async function checkWellKnownForUpdates(baseUrl, items) {
  let indexResult;
  try {
    indexResult = await wellKnownProvider.fetchIndex(baseUrl, { updateCheck: true });
  } catch {
    return { status: "error" };
  }
  if (!indexResult)
    return { status: "error" };
  const byName = new Map(indexResult.entries.map((entry) => [entry.name, entry]));
  const removedSkills = items.filter((item) => !byName.has(item.name)).map((item) => item.name);
  const localNames = new Set(items.map((item) => item.name));
  const newSkills = indexResult.entries.map((entry) => entry.name).filter((name) => !localNames.has(name));
  const changedSkills = [];
  const needsContentCheck = [];
  for (const item of items) {
    const entry = byName.get(item.name);
    if (!entry)
      continue;
    if (entry.version === "0.2.0") {
      if (!item.digest || entry.digest !== item.digest)
        changedSkills.push(item.name);
    } else
      needsContentCheck.push(item);
  }
  if (needsContentCheck.length > 0) {
    const tracked = new Set(needsContentCheck.map((item) => item.name));
    const skills = (await Promise.all(indexResult.entries.filter((entry) => tracked.has(entry.name)).map((entry) => wellKnownProvider.fetchSkillByEntry(entry).catch(() => null)))).filter((skill) => skill !== null);
    if (skills.length === 0)
      return { status: "error" };
    const digests = new Map(skills.map((skill) => [skill.installName, computeWellKnownSkillDigest(skill)]));
    for (const item of needsContentCheck) {
      const digest = digests.get(item.name);
      if (!digest || !item.digest || digest !== item.digest)
        changedSkills.push(item.name);
    }
  }
  if (changedSkills.length === 0 && removedSkills.length === 0)
    return {
      status: "current",
      newSkills
    };
  return {
    status: "changed",
    changedSkills,
    removedSkills,
    newSkills
  };
}
function printNewSkills(baseUrl, newSkills, isGlobal) {
  if (newSkills.length === 0)
    return;
  const names = newSkills.map(sanitizeMetadata);
  console.log(`  ${DIM$1}${newSkills.length} new skill(s) available from this source:${RESET$1} ${names.join(", ")}`);
  console.log(`    ${DIM$1}To install: ${TEXT$1}npx skills add ${baseUrl} --skill ${names.join(" ")}${isGlobal ? " -g" : ""}${RESET$1}`);
}
async function processWellKnownUpdates(groups, isGlobal, options) {
  let successCount = 0;
  let failCount = 0;
  let changed = false;
  const entries = [...groups];
  printFetching(entries.length);
  const results = await mapConcurrent(entries, ([baseUrl, items]) => checkWellKnownForUpdates(baseUrl, items));
  const pending = [];
  for (const [index, [baseUrl, items]] of entries.entries()) {
    process.stdout.write(`\r${DIM$1}Checking skills from source: ${baseUrl}${RESET$1}\x1B[K
`);
    const result = results[index];
    if (result.status === "error") {
      console.log(`  ${DIM$1}✗ Failed to check skills from ${baseUrl}${RESET$1}`);
      continue;
    }
    if (result.status === "current") {
      printNewSkills(baseUrl, result.newSkills, isGlobal);
      continue;
    }
    changed = true;
    await promptDeletions(baseUrl, result.removedSkills, isGlobal, options);
    printNewSkills(baseUrl, result.newSkills, isGlobal);
    if (result.changedSkills.length > 0)
      if (options.reportOutdated)
        for (const name of result.changedSkills)
          options.reportOutdated(name);
      else
        pending.push({
          baseUrl,
          items,
          changedSkills: result.changedSkills
        });
  }
  const fetched = await fetchSources(pending.map(({ baseUrl, changedSkills }) => ({
    parsed: parseSource(baseUrl),
    skills: changedSkills
  })));
  const placementFor = placementResolver(isGlobal);
  for (const [index, { baseUrl, items, changedSkills }] of pending.entries()) {
    const source = fetched[index];
    const itemByName = new Map(items.map((item) => [item.name, item]));
    for (const name of changedSkills) {
      console.log(`${TEXT$1}Updating ${sanitizeMetadata(name)}…${RESET$1}`);
      const outcome = await installFetched(source, {
        skills: [name],
        placement: await placementFor(isGlobal ? undefined : itemByName.get(name)?.subagents)
      });
      if (isGlobal)
        await recordGlobalWellKnownLock(baseUrl, outcome.installed);
      else
        await recordProjectLock(source, outcome.installed);
      if (reportInstall(name, {
        ok: outcome.installed.length > 0,
        ...outcome
      }))
        successCount++;
      else
        failCount++;
    }
    await releaseSource(source);
  }
  return {
    successCount,
    failCount,
    changed
  };
}
async function fetchGlobalSource(entry, lockedSkillPaths) {
  let note2;
  try {
    if (entry.sourceType === "github") {
      const tree = await fetchRepoTree(entry.source, entry.ref, getGitHubToken);
      if (tree) {
        const treePaths = new Set(tree.tree.filter((e) => e.type === "blob").map((e) => e.path));
        if (lockedSkillPaths.every((path2) => !path2 || treePaths.has(path2)))
          return { tree };
        note2 = "Skill paths changed; resolving via Git clone";
      } else
        note2 = "GitHub API unavailable; checking via Git clone";
    }
    return {
      tempDir: await cloneRepo(entry.sourceUrl || entry.source, entry.ref),
      note: note2
    };
  } catch {
    return { error: true };
  }
}
async function updateGlobalSkills(options = {}) {
  const lock = await readSkillLock();
  const skillNames = Object.keys(lock.skills);
  let successCount = 0;
  let failCount = 0;
  if (skillNames.length === 0) {
    if (!options.skills) {
      console.log(`${DIM$1}No global skills tracked in lock file.${RESET$1}`);
      console.log(`${DIM$1}Install skills with${RESET$1} ${TEXT$1}npx skills add <package> -g${RESET$1}`);
    }
    return {
      successCount,
      failCount,
      checkedCount: 0
    };
  }
  const updates = [];
  const skipped = [];
  const checkable = [];
  const wellKnownGroups = /* @__PURE__ */ new Map;
  for (const skillName of skillNames) {
    if (!matchesSkillFilter(skillName, options.skills))
      continue;
    const entry = lock.skills[skillName];
    if (!entry)
      continue;
    if (entry.sourceType === "well-known" && entry.sourceBaseUrl && entry.wellKnownDigest) {
      const group = wellKnownGroups.get(entry.sourceBaseUrl) || [];
      group.push({
        name: skillName,
        digest: entry.wellKnownDigest
      });
      wellKnownGroups.set(entry.sourceBaseUrl, group);
      continue;
    }
    if (!entry.skillFolderHash || !entry.skillPath) {
      skipped.push({
        name: skillName,
        reason: getSkipReason(entry),
        sourceUrl: entry.sourceUrl,
        sourceType: entry.sourceType,
        ref: entry.ref
      });
      continue;
    }
    checkable.push({
      name: skillName,
      entry
    });
  }
  const wellKnownCount = Array.from(wellKnownGroups.values()).reduce((sum, items) => sum + items.length, 0);
  const { successCount: wkSuccessCount, failCount: wkFailCount, changed: wkChanged } = await processWellKnownUpdates(wellKnownGroups, true, options);
  successCount += wkSuccessCount;
  failCount += wkFailCount;
  const bySource = /* @__PURE__ */ new Map;
  for (const item of checkable) {
    const key = `${item.entry.source}
${item.entry.ref ?? ""}`;
    const existing = bySource.get(key) || [];
    existing.push(item);
    bySource.set(key, existing);
  }
  const lockedNamesFor = (first2) => Object.entries(lock.skills).filter(([_3, entry]) => entry.source === first2.source && entry.ref === first2.ref).map(([name, _3]) => name);
  const onDisk = await installedSkillNames(true);
  const groups = [...bySource.values()];
  printFetching(groups.length);
  const checkouts = await mapConcurrent(groups, (itemsForSource) => {
    const firstEntry = itemsForSource[0].entry;
    return fetchGlobalSource(firstEntry, lockedNamesFor(firstEntry).map((name) => lock.skills[name]?.skillPath));
  });
  for (const [index, itemsForSource] of groups.entries()) {
    const firstEntry = itemsForSource[0].entry;
    const source = firstEntry.source;
    const isGitHubSource = firstEntry.sourceType === "github";
    const checkout = checkouts[index];
    process.stdout.write(`\r${DIM$1}Checking skills from source: ${source}${RESET$1}\x1B[K
`);
    if ("error" in checkout) {
      console.log(`  ${DIM$1}✗ Failed to check skills from ${source}${RESET$1}`);
      continue;
    }
    if ("tree" in checkout) {
      for (const { name: skillName, entry } of itemsForSource) {
        const latestHash = getSkillFolderHashFromTree(checkout.tree, entry.skillPath);
        if (latestHash && (latestHash !== entry.skillFolderHash || !onDisk.has(skillName)))
          updates.push({
            name: skillName,
            entry,
            skillFolderHash: latestHash
          });
      }
      continue;
    }
    const { tempDir, note: note2 } = checkout;
    if (note2)
      console.log(`  ${DIM$1}${note2}${RESET$1}`);
    try {
      const discoveredLocations = (await discoverSkills(tempDir, undefined, {
        fullDepth: true,
        includeDuplicateNames: true
      })).map((skill) => ({
        name: skill.name,
        skillPath: join(relative(tempDir, skill.path), "SKILL.md").split(sep).join("/")
      }));
      const resolution = await checkAndPromptForDeletions(source, lockedNamesFor(firstEntry), lock.skills, true, options, discoveredLocations, { exactPathDisambiguates: !shouldUseFullDepthForUpdate(firstEntry) });
      const deletedSkillSet = new Set(resolution.deletedSkills);
      for (const { name: skillName, entry } of itemsForSource) {
        if (deletedSkillSet.has(skillName))
          continue;
        const skillPath = resolution.resolvedPaths.get(skillName);
        if (!skillPath)
          continue;
        const latestHash = isGitHubSource && /^[0-9a-f]{40}$/i.test(entry.skillFolderHash) ? await getGitTreeHash(tempDir, skillPath) : await computeSkillFolderHash(join(tempDir, dirname(skillPath)));
        if (skillPath !== entry.skillPath || latestHash && (latestHash !== entry.skillFolderHash || !onDisk.has(skillName)))
          updates.push({
            name: skillName,
            entry: {
              ...entry,
              skillPath
            },
            skillFolderHash: latestHash ?? ""
          });
      }
    } catch (error) {
      console.log(`  ${DIM$1}✗ Failed to check skills from ${source}${RESET$1}`);
    } finally {
      await cleanupTempDir(tempDir);
    }
  }
  if (checkable.length > 0)
    process.stdout.write("\r\x1B[K");
  const checkedCount = checkable.length + skipped.length + wellKnownCount;
  if (checkable.length === 0 && skipped.length === 0 && wellKnownCount === 0) {
    if (!options.skills)
      console.log(`${DIM$1}No global skills to check.${RESET$1}`);
    return {
      successCount,
      failCount,
      checkedCount: 0
    };
  }
  if (checkable.length === 0 && skipped.length === 0) {
    if (!wkChanged)
      console.log(`${TEXT$1}✓ All global skills are up to date${RESET$1}`);
    return {
      successCount,
      failCount,
      checkedCount
    };
  }
  if (checkable.length === 0 && skipped.length > 0) {
    printSkippedSkills(skipped);
    return {
      successCount,
      failCount,
      checkedCount
    };
  }
  if (updates.length === 0) {
    if (!wkChanged)
      console.log(`${TEXT$1}✓ All global skills are up to date${RESET$1}`);
    return {
      successCount,
      failCount,
      checkedCount
    };
  }
  if (options.reportOutdated) {
    for (const { name } of updates)
      options.reportOutdated(name);
    printSkippedSkills(skipped);
    return {
      successCount,
      failCount,
      checkedCount
    };
  }
  console.log(`${TEXT$1}Found ${updates.length} global update(s)${RESET$1}`);
  console.log();
  const installable = updates.flatMap((update) => {
    const installUrl = buildUpdateInstallSource(update.entry);
    if (installUrl)
      return [{
        ...update,
        installUrl
      }];
    failCount++;
    console.log(`  ${DIM$1}✗ Cannot update ${sanitizeMetadata(update.name)}: lock file is missing sourceUrl for this generic Git source${RESET$1}`);
    return [];
  });
  const fetched = await fetchSources(installable.map(({ entry, name, installUrl }) => ({
    parsed: parseUpdateSource(installUrl, entry.sourceType),
    skills: [name],
    fullDepth: shouldUseFullDepthForUpdate(entry)
  })));
  const placementFor = placementResolver(true);
  for (const [index, { name, entry, skillFolderHash }] of installable.entries()) {
    console.log(`${TEXT$1}Updating ${sanitizeMetadata(name)}…${RESET$1}`);
    const source = fetched[index];
    const outcome = await installFetched(source, {
      skills: [name],
      placement: await placementFor(undefined, entry.installMode)
    });
    await releaseSource(source);
    if (outcome.installed.length > 0)
      await addSkillToLock(name, {
        ...entry,
        skillFolderHash
      });
    if (reportInstall(name, {
      ok: outcome.installed.length > 0,
      ...outcome
    }))
      successCount++;
    else
      failCount++;
  }
  printSkippedSkills(skipped);
  return {
    successCount,
    failCount,
    checkedCount
  };
}
async function updateProjectSkills(options = {}) {
  const projectSkills = await getProjectSkillsForUpdate(options.skills);
  let successCount = 0;
  let failCount = 0;
  if (projectSkills.length === 0) {
    if (!options.skills) {
      console.log(`${DIM$1}No project skills to update.${RESET$1}`);
      console.log(`${DIM$1}Install project skills with${RESET$1} ${TEXT$1}npx skills add <package>${RESET$1}`);
    }
    return {
      successCount,
      failCount,
      foundCount: 0
    };
  }
  const wellKnownGroups = /* @__PURE__ */ new Map;
  const nonWellKnown = [];
  for (const skill of projectSkills) {
    const { entry } = skill;
    if (entry.sourceType === "well-known" && entry.sourceUrl && entry.wellKnownDigest) {
      const group = wellKnownGroups.get(entry.sourceUrl) || [];
      group.push({
        name: skill.name,
        digest: entry.wellKnownDigest,
        subagents: entry.subagents
      });
      wellKnownGroups.set(entry.sourceUrl, group);
    } else
      nonWellKnown.push(skill);
  }
  const wellKnownCount = Array.from(wellKnownGroups.values()).reduce((sum, items) => sum + items.length, 0);
  const updatable = nonWellKnown.filter((s3) => s3.entry.skillPath);
  const legacy = nonWellKnown.filter((s3) => !s3.entry.skillPath);
  if (updatable.length === 0 && wellKnownCount === 0) {
    console.log(`${DIM$1}No project skills can be updated in place.${RESET$1}`);
    printLegacyProjectSkills(legacy);
    return {
      successCount,
      failCount,
      foundCount: projectSkills.length
    };
  }
  const cwd = process.cwd();
  const targetAgentNames = [];
  let hasUniversal = false;
  for (const [type, config] of Object.entries(agents))
    if (isUniversalAgent(type)) {
      if (!hasUniversal && existsSync(join(cwd, ".agents")))
        hasUniversal = true;
    } else {
      const agentRoot = config.skillsDir.split("/")[0];
      if (existsSync(join(cwd, agentRoot)))
        targetAgentNames.push(config.displayName);
    }
  const targetParts = [];
  if (hasUniversal)
    targetParts.push("Universal");
  targetParts.push(...targetAgentNames);
  if (targetParts.length > 0)
    console.log(`${TEXT$1}Updating for: ${targetParts.join(", ")}${RESET$1}`);
  console.log(`${TEXT$1}Checking ${updatable.length + wellKnownCount} skill(s)…${RESET$1}`);
  console.log();
  const { successCount: wkSuccessCount, failCount: wkFailCount } = await processWellKnownUpdates(wellKnownGroups, false, options);
  successCount += wkSuccessCount;
  failCount += wkFailCount;
  const bySource = /* @__PURE__ */ new Map;
  for (const skill of updatable) {
    const key = `${skill.entry.sourceUrl || skill.entry.source}
${skill.entry.ref ?? ""}`;
    const existing = bySource.get(key) || [];
    existing.push(skill);
    bySource.set(key, existing);
  }
  const localLock = await readLocalLock();
  const onDisk = await installedSkillNames(false);
  const placementFor = placementResolver(false);
  let upToDateCount = 0;
  const groups = [...bySource.values()].map((skillsForSource) => ({
    skillsForSource,
    cloneSource: buildLocalCloneSource(skillsForSource[0].entry)
  }));
  printFetching(groups.filter((group) => group.cloneSource !== null).length);
  const clones = await mapConcurrent(groups, ({ skillsForSource, cloneSource }) => cloneSource === null ? Promise.resolve(null) : cloneRepo(cloneSource, skillsForSource[0].entry.ref).catch(() => null));
  for (const [index, { skillsForSource, cloneSource }] of groups.entries()) {
    const firstEntry = skillsForSource[0].entry;
    const source = firstEntry.sourceUrl || firstEntry.source;
    const ref = firstEntry.ref;
    const allLockedForSource = Object.entries(localLock.skills).filter(([_3, entry]) => (entry.sourceUrl || entry.source) === source && entry.ref === ref).map(([name, _3]) => name);
    const tempDir = clones[index];
    if (cloneSource === null) {
      failCount += skillsForSource.length;
      console.log(`${DIM$1}✗ Cannot update ${source}: skills-lock.json is missing sourceUrl for this generic Git source${RESET$1}`);
      continue;
    }
    if (tempDir === null) {
      failCount += skillsForSource.length;
      console.log(`${DIM$1}✗ Failed to check for deleted skills from ${source}${RESET$1}`);
      continue;
    }
    let checked = false;
    try {
      const discovered = await discoverSkills(tempDir, undefined, {
        fullDepth: true,
        includeDuplicateNames: true
      });
      const discoveredLocations = discovered.map((skill) => ({
        name: skill.name,
        skillPath: join(relative(tempDir, skill.path), "SKILL.md").split(sep).join("/")
      }));
      const resolution = await checkAndPromptForDeletions(source, allLockedForSource, localLock.skills, false, options, discoveredLocations, { exactPathDisambiguates: !shouldUseFullDepthForUpdate(firstEntry) });
      checked = true;
      const deleted = new Set(resolution.deletedSkills);
      const skillAt = new Map(discovered.map((s3, i2) => [discoveredLocations[i2].skillPath, s3]));
      const resolved = {
        skills: discovered,
        tempDir,
        blobResult: null
      };
      for (const skill of skillsForSource) {
        if (deleted.has(skill.name))
          continue;
        const skillPath = resolution.resolvedPaths.get(skill.name);
        const current = skillPath && skillAt.get(skillPath);
        if (!skillPath || !current)
          continue;
        const computedHash = await computeSkillFolderHash(current.path).catch(() => null);
        if (skillPath === skill.entry.skillPath && computedHash === skill.entry.computedHash && onDisk.has(skill.name)) {
          upToDateCount++;
          continue;
        }
        if (options.reportOutdated) {
          options.reportOutdated(skill.name);
          continue;
        }
        console.log(`${TEXT$1}Updating ${sanitizeMetadata(skill.name)}…${RESET$1}`);
        const outcome = targetOutcome(await installToTargets(resolved, [current], await placementFor(skill.entry.subagents, skill.entry.installMode)));
        if (outcome.ok && computedHash)
          await addSkillToLocalLock(skill.name, {
            ...skill.entry,
            skillPath,
            computedHash
          });
        if (reportInstall(skill.name, outcome))
          successCount++;
        else
          failCount++;
      }
    } catch {
      console.log(`${DIM$1}✗ Failed to check for deleted skills from ${source}${RESET$1}`);
      if (!checked)
        failCount += skillsForSource.length;
    } finally {
      await cleanupTempDir(tempDir);
    }
  }
  if (upToDateCount > 0)
    if (upToDateCount === updatable.length && wkSuccessCount === 0 && wkFailCount === 0)
      console.log(`${TEXT$1}✓ All project skills are up to date${RESET$1}`);
    else
      console.log(`${DIM$1}${upToDateCount} project skill(s) already up to date${RESET$1}`);
  printLegacyProjectSkills(legacy);
  return {
    successCount,
    failCount,
    foundCount: projectSkills.length
  };
}
function printLegacyProjectSkills(legacy) {
  if (legacy.length === 0)
    return;
  console.log();
  console.log(`${DIM$1}${legacy.length} project skill(s) cannot be updated automatically (installed before skillPath tracking):${RESET$1}`);
  for (const skill of legacy) {
    const reinstall = buildLocalUpdateSource(skill.entry);
    console.log(`  ${TEXT$1}•${RESET$1} ${sanitizeMetadata(skill.name)}`);
    if (reinstall)
      console.log(`    ${DIM$1}To refresh: ${TEXT$1}npx skills add ${reinstall} -y${RESET$1}`);
    else
      console.log(`    ${DIM$1}To refresh: reinstall using the original full Git URL; this lock entry only has an ambiguous shorthand.${RESET$1}`);
  }
}
async function runUpdate(args = [], mode = "update") {
  const options = parseUpdateOptions(args);
  let outdatedCount = 0;
  if (mode === "check") {
    options.yes = true;
    options.reportOutdated = (name) => {
      outdatedCount++;
      console.log(`${TEXT$1}↑ ${sanitizeMetadata(name)} has an update${RESET$1}`);
    };
  }
  const scope = await resolveUpdateScope(options);
  if (options.skills && mode === "update")
    console.log(`${TEXT$1}Updating ${options.skills.join(", ")}…${RESET$1}`);
  else
    console.log(`${TEXT$1}Checking for skill updates…${RESET$1}`);
  console.log();
  let totalSuccess = 0;
  let totalFail = 0;
  let totalFound = 0;
  if (scope === "global" || scope === "both") {
    if (scope === "both" && !options.skills)
      console.log(`${BOLD$1}Global Skills${RESET$1}`);
    const { successCount, failCount, checkedCount } = await updateGlobalSkills(options);
    totalSuccess += successCount;
    totalFail += failCount;
    totalFound += checkedCount;
    if (scope === "both" && !options.skills)
      console.log();
  }
  if (scope === "project" || scope === "both") {
    if (scope === "both" && !options.skills)
      console.log(`${BOLD$1}Project Skills${RESET$1}`);
    const { successCount, failCount, foundCount } = await updateProjectSkills(options);
    totalSuccess += successCount;
    totalFail += failCount;
    totalFound += foundCount;
  }
  if (options.skills && totalFound === 0)
    console.log(`${DIM$1}No installed skills found matching: ${options.skills.join(", ")}${RESET$1}`);
  console.log();
  if (totalSuccess > 0)
    console.log(`${TEXT$1}✓ Updated ${totalSuccess} skill(s)${RESET$1}`);
  if (totalFail > 0) {
    console.log(`${DIM$1}Failed to update ${totalFail} skill(s)${RESET$1}`);
    process.exitCode = 1;
  }
  if (outdatedCount > 0) {
    console.log(`${TEXT$1}${outdatedCount} skill(s) can be updated; run ${BOLD$1}npx skills update${RESET$1}${TEXT$1} to install${RESET$1}`);
    process.exitCode = 1;
  }
  track({
    event: "update",
    scope,
    skillCount: String(totalSuccess + totalFail),
    successCount: String(totalSuccess),
    failCount: String(totalFail)
  });
  console.log();
}
var BLOB_ALLOWED_OWNERS = [
  "vercel",
  "vercel-labs",
  "heygen-com",
  "remotion-dev"
];
var USE_AGENT_CONFIGS = {
  "claude-code": {
    command: "claude",
    args: []
  },
  codex: {
    command: "codex",
    args: []
  },
  "sarvam-code": {
    command: "sarvam-code",
    args: []
  }
};
var SUPPORTED_USE_AGENTS = Object.keys(USE_AGENT_CONFIGS);
function parseUseOptions(args) {
  const source = [];
  const options = {};
  const errors2 = [];
  for (let i2 = 0;i2 < args.length; i2++) {
    const arg = args[i2];
    if (!arg)
      continue;
    if (arg === "--help" || arg === "-h")
      options.help = true;
    else if (arg === "--full-depth")
      options.fullDepth = true;
    else if (arg === "--skill" || arg === "-s") {
      const value = args[i2 + 1];
      if (!value || value.startsWith("-"))
        errors2.push(`${arg} requires a skill name`);
      else if (options.skill) {
        errors2.push("Only one --skill value can be provided");
        i2++;
      } else {
        options.skill = value;
        i2++;
      }
    } else if (arg === "--agent" || arg === "-a") {
      options.agent = options.agent || [];
      i2++;
      let nextArg = args[i2];
      const startCount = options.agent.length;
      while (i2 < args.length && nextArg && !nextArg.startsWith("-")) {
        options.agent.push(nextArg);
        i2++;
        nextArg = args[i2];
      }
      if (options.agent.length === startCount)
        errors2.push(`${arg} requires an agent name`);
      i2--;
    } else if (arg.startsWith("-"))
      errors2.push(`Unknown option: ${arg}`);
    else
      source.push(arg);
  }
  errors2.push(...validateUseAgentOption(options.agent));
  return {
    source,
    options,
    errors: errors2
  };
}
function buildUsePrompt(input) {
  const sections = [
    "You are being given a Skill to execute for the user's next request.",
    "Use the following SKILL.md as your instructions:",
    `<SKILL.md>
${input.skillMd}
</SKILL.md>`
  ];
  if (input.hasSupportingFiles && input.supportDir)
    sections.push(`Supporting files for this skill were downloaded to:
${input.supportDir}

When the SKILL.md references relative paths, read them from that directory.`);
  return sections.join(`

`) + `
`;
}
async function materializeUseSkill(skill) {
  const tempRoot = await mkdtemp(join(tmpdir(), "skills-use-"));
  const skillDir = join(tempRoot, sanitizeName(skill.directoryName || skill.name));
  if (!isPathSafe(tempRoot, skillDir))
    throw new Error("Invalid skill name: potential path traversal detected");
  await mkdir(skillDir, { recursive: true });
  if (skill.kind === "blob")
    await writeSnapshotFiles(skillDir, skill.files);
  else if (skill.kind === "well-known")
    await writeMapFiles(skillDir, skill.files);
  else
    await copyDirectory(skill.path, skillDir);
  return {
    tempRoot,
    skillDir,
    skillMd: skill.rawContent ?? await readFile(join(skillDir, "SKILL.md"), "utf-8"),
    hasSupportingFiles: await containsSupportingFiles(skillDir, skillDir)
  };
}
async function runUse(sourceArgs, options = {}, parseErrors = []) {
  let cloneTempDir = null;
  try {
    if (options.help) {
      console.log(getUseHelp());
      return;
    }
    if (parseErrors.length > 0)
      fail(parseErrors.join(`
`));
    if (sourceArgs.length === 0)
      fail(`Missing required argument: source

${getUseHelp()}`);
    if (sourceArgs.length > 1)
      fail(`Expected one source, received ${sourceArgs.length}: ${sourceArgs.join(", ")}`);
    const useAgent = options.agent?.[0];
    if (useAgent && !USE_AGENT_CONFIGS[useAgent])
      fail(formatUnsupportedAgentError(useAgent));
    const source = sourceArgs[0];
    const parsed = parseSource(source);
    const selector = resolveSelector(parsed.skillFilter, options.skill);
    const includeInternal = selector !== undefined;
    let selectedSkill;
    if (parsed.type === "well-known") {
      const skills = await wellKnownProvider.fetchAllSkills(parsed.url, { includeInternal }).catch((error) => {
        if (error instanceof WellKnownScopeNotFoundError)
          fail(error.message);
        return [];
      });
      if (skills.length > 0)
        selectedSkill = selectWellKnownSkill(skills, selector, source);
      else {
        const downloaded = await downloadSource(parsed.url);
        cloneTempDir = downloaded.tempDir;
        const selected = selectSkill(await discoverSkills(downloaded.rootDir, undefined, {
          includeInternal,
          fullDepth: options.fullDepth
        }), selector, source);
        selectedSkill = {
          kind: "disk",
          name: selected.name,
          directoryName: selected.name,
          rawContent: selected.rawContent,
          path: selected.path
        };
      }
    } else {
      let skills;
      let blobResult = null;
      if (parsed.type === "download") {
        const downloaded = await downloadSource(parsed.url);
        cloneTempDir = downloaded.tempDir;
        skills = await discoverSkills(downloaded.rootDir, undefined, {
          includeInternal,
          fullDepth: options.fullDepth
        });
      } else if (parsed.type === "local") {
        if (!existsSync(parsed.localPath))
          fail(`Local path does not exist: ${parsed.localPath}`);
        skills = await discoverSkills(parsed.localPath, parsed.subpath, {
          includeInternal,
          fullDepth: options.fullDepth
        });
      } else if (parsed.type === "github" && !options.fullDepth) {
        const ownerRepo = getOwnerRepo(parsed);
        const owner = ownerRepo?.split("/")[0]?.toLowerCase();
        if (ownerRepo && owner && BLOB_ALLOWED_OWNERS.includes(owner))
          blobResult = await tryBlobInstall(ownerRepo, {
            subpath: parsed.subpath,
            skillFilter: selector,
            ref: parsed.ref,
            getToken: getGitHubToken,
            includeInternal
          });
        if (blobResult)
          skills = blobResult.skills;
        else {
          cloneTempDir = await cloneRepo(parsed.url, parsed.ref);
          skills = await discoverSkills(cloneTempDir, parsed.subpath, {
            includeInternal,
            fullDepth: options.fullDepth
          });
        }
      } else {
        cloneTempDir = await cloneRepo(parsed.url, parsed.ref);
        skills = await discoverSkills(cloneTempDir, parsed.subpath, {
          includeInternal,
          fullDepth: options.fullDepth
        });
      }
      const selected = selectSkill(skills, selector, source);
      if (blobResult && isBlobSkill(selected))
        selectedSkill = {
          kind: "blob",
          name: selected.name,
          directoryName: selected.name,
          rawContent: selected.rawContent ?? getSkillMdFromSnapshot(selected.files),
          files: selected.files
        };
      else
        selectedSkill = {
          kind: "disk",
          name: selected.name,
          directoryName: selected.name,
          rawContent: selected.rawContent,
          path: selected.path
        };
    }
    const materialized = await materializeUseSkill(selectedSkill);
    await cleanupClone(cloneTempDir);
    cloneTempDir = null;
    const prompt = buildUsePrompt({
      skillMd: materialized.skillMd,
      supportDir: materialized.skillDir,
      hasSupportingFiles: materialized.hasSupportingFiles
    });
    if (useAgent) {
      const exitCode = await launchAgentInteractively(useAgent, prompt);
      if (exitCode !== 0)
        process.exit(exitCode);
      return;
    }
    process.stdout.write(prompt);
  } catch (error) {
    await cleanupClone(cloneTempDir);
    if (error instanceof GitCloneError)
      fail(error.message);
    if (error instanceof UseCommandError)
      fail(error.message);
    fail(error instanceof Error ? error.message : "Unknown error");
  }
}
async function launchAgentInteractively(agent, prompt, spawnImpl = spawnAgent) {
  const config = USE_AGENT_CONFIGS[agent];
  if (!config)
    throw new UseCommandError(formatUnsupportedAgentError(agent));
  return new Promise((resolve2, reject) => {
    const child = spawnImpl(config.command, [...config.args, prompt], { stdio: "inherit" });
    let settled = false;
    child.on("error", (error) => {
      if (settled)
        return;
      settled = true;
      if (error.code === "ENOENT") {
        reject(new UseCommandError(`Could not launch ${agents[agent].displayName}: command not found: ${config.command}`));
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (settled)
        return;
      settled = true;
      resolve2(code ?? 1);
    });
  });
}
function spawnAgent(command, args) {
  return spawn2(command, args, { stdio: "inherit" });
}
function getUseHelp() {
  return `Usage: skills use <source>[@<skill>] [options]

Generate a prompt for using one skill without installing it.

Options:
  -s, --skill <skill>   Select the skill to use
  -a, --agent <agent>   Start one supported agent interactively (${SUPPORTED_USE_AGENTS.join(", ")})
  --full-depth          Search nested directories like skills add --full-depth
  -h, --help            Show this help message

Examples:
  skills use vercel-labs/agent-skills@web-design-guidelines | claude
  skills use vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code
  skills use vercel-labs/agent-skills@web-design-guidelines --agent codex`;
}
function resolveSelector(sourceSelector, optionSelector) {
  if (sourceSelector && optionSelector) {
    if (sourceSelector.toLowerCase() !== optionSelector.toLowerCase())
      throw new UseCommandError(`Conflicting skill selectors: source selects "${sourceSelector}" but --skill selects "${optionSelector}". Provide one selector.`);
    return optionSelector;
  }
  return optionSelector ?? sourceSelector;
}
function selectSkill(skills, selector, source) {
  if (skills.length === 0)
    throw new UseCommandError("No valid skills found. Skills require a SKILL.md with name and description.");
  if (!selector) {
    if (skills.length === 1)
      return skills[0];
    throw new UseCommandError(formatMultipleSkillsError(source, skills.map(getSkillDisplayName)));
  }
  const selected = filterSkills(skills, [selector]);
  if (selected.length === 0)
    throw new UseCommandError(formatNoMatchError(selector, skills.map(getSkillDisplayName)));
  if (selected.length > 1)
    throw new UseCommandError(`Skill selector "${selector}" matched multiple skills.`);
  return selected[0];
}
function selectWellKnownSkill(skills, selector, source) {
  if (skills.length === 0)
    throw new UseCommandError("No skills found at this URL. Make sure the server has a /.well-known/agent-skills/index.json or /.well-known/skills/index.json file.");
  let selected;
  if (!selector) {
    if (skills.length !== 1)
      throw new UseCommandError(formatMultipleSkillsError(source, skills.map((s3) => s3.installName)));
    selected = skills;
  } else {
    selected = skills.filter((skill2) => skill2.installName.toLowerCase() === selector.toLowerCase() || skill2.name.toLowerCase() === selector.toLowerCase());
    if (selected.length === 0)
      throw new UseCommandError(formatNoMatchError(selector, skills.map((s3) => s3.installName)));
    if (selected.length > 1)
      throw new UseCommandError(`Skill selector "${selector}" matched multiple skills.`);
  }
  const skill = selected[0];
  return {
    kind: "well-known",
    name: skill.name,
    directoryName: skill.installName,
    rawContent: skill.content,
    files: skill.files
  };
}
function formatMultipleSkillsError(source, names) {
  return [
    "This source contains multiple skills. Specify exactly one skill:",
    ...names.map((name) => `  - ${name}`),
    "",
    `Examples:
  skills use ${source}@${names[0] ?? "<skill>"}
  skills use ${source} --skill ${names[0] ?? "<skill>"}`
  ].join(`
`);
}
function formatNoMatchError(selector, names) {
  return [
    `No matching skill found for: ${selector}`,
    "Available skills:",
    ...names.map((name) => `  - ${name}`)
  ].join(`
`);
}
function validateUseAgentOption(agentValues) {
  if (!agentValues || agentValues.length === 0)
    return [];
  const errors2 = [];
  const validAgents = Object.keys(agents);
  const invalidAgents = agentValues.filter((agent) => agent !== "*" && !validAgents.includes(agent));
  if (agentValues.includes("*"))
    errors2.push("skills use --agent does not support '*'; specify exactly one agent.");
  if (agentValues.length > 1)
    errors2.push("skills use --agent accepts exactly one agent.");
  if (invalidAgents.length > 0)
    errors2.push(`Invalid agents: ${invalidAgents.join(", ")}
Valid agents: ${validAgents.join(", ")}`);
  return errors2;
}
function formatUnsupportedAgentError(agent) {
  return [`Running ${agents[agent].displayName} is not supported yet.`, `Supported agents for skills use --agent: ${SUPPORTED_USE_AGENTS.join(", ")}`].join(`
`);
}
async function writeSnapshotFiles(targetDir, files) {
  for (const file of files)
    await writeSafeFile(targetDir, file.path, file.contents);
}
async function writeMapFiles(targetDir, files) {
  for (const [path2, contents] of files)
    await writeSafeFile(targetDir, path2, contents);
}
async function writeSafeFile(targetDir, filePath, contents) {
  const fullPath = join(targetDir, filePath);
  if (!isPathSafe(targetDir, fullPath))
    return;
  await mkdir(dirname(fullPath), { recursive: true });
  if (typeof contents === "string")
    await writeFile(fullPath, contents, "utf-8");
  else
    await writeFile(fullPath, contents);
}
async function containsSupportingFiles(rootDir, currentDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(currentDir, entry.name);
    const relPath = relative(rootDir, entryPath).split(sep).join("/");
    if (entry.isDirectory()) {
      if (await containsSupportingFiles(rootDir, entryPath))
        return true;
    } else if (relPath.toLowerCase() !== "skill.md")
      return true;
  }
  return false;
}
function isBlobSkill(skill) {
  return Array.isArray(skill.files);
}
function getSkillMdFromSnapshot(files) {
  return files.find((file) => file.path.toLowerCase() === "skill.md")?.contents ?? "";
}
function isPathSafe(basePath, targetPath) {
  const normalizedBase = normalize2(resolve(basePath));
  const normalizedTarget = normalize2(resolve(targetPath));
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
async function cleanupClone(tempDir) {
  if (tempDir)
    await cleanupTempDir(tempDir).catch(() => {});
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
var UseCommandError = class extends Error {
};
var __dirname2 = dirname(fileURLToPath(import.meta.url));
function getVersion() {
  try {
    const pkgPath = join(__dirname2, "..", "package.json");
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version;
  } catch {
    return "0.0.0";
  }
}
var VERSION = getVersion();
initTelemetry(VERSION);
var RESET = "\x1B[0m";
var BOLD = "\x1B[1m";
var DIM = "\x1B[38;5;102m";
var TEXT = "\x1B[38;5;145m";
var LOGO_LINES = [
  "███████╗██╗  ██╗██╗██╗     ██╗     ███████╗",
  "██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝",
  "███████╗█████╔╝ ██║██║     ██║     ███████╗",
  "╚════██║██╔═██╗ ██║██║     ██║     ╚════██║",
  "███████║██║  ██╗██║███████╗███████╗███████║",
  "╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝"
];
var GRAYS = [
  "\x1B[38;5;250m",
  "\x1B[38;5;248m",
  "\x1B[38;5;245m",
  "\x1B[38;5;243m",
  "\x1B[38;5;240m",
  "\x1B[38;5;238m"
];
function showLogo() {
  console.log();
  LOGO_LINES.forEach((line, i2) => {
    console.log(`${GRAYS[i2]}${line}${RESET}`);
  });
}
function showBanner() {
  showLogo();
  console.log();
  console.log(`${DIM}The open agent skills ecosystem${RESET}`);
  console.log();
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills add ${DIM}<package>${RESET}        ${DIM}Add a new skill${RESET}`);
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills use ${DIM}<package>@<skill>${RESET} ${DIM}Use a skill without installing${RESET}`);
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills remove${RESET}               ${DIM}Remove installed skills${RESET}`);
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills list${RESET}                 ${DIM}List installed skills${RESET}`);
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills find ${DIM}[query]${RESET}         ${DIM}Search for skills${RESET}`);
  console.log();
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills update${RESET}               ${DIM}Update installed skills${RESET}`);
  console.log();
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills experimental_install${RESET} ${DIM}Restore from skills-lock.json${RESET}`);
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills init ${DIM}[name]${RESET}          ${DIM}Create a new skill${RESET}`);
  console.log(`  ${DIM}$${RESET} ${TEXT}npx skills experimental_sync${RESET}    ${DIM}Sync skills from node_modules${RESET}`);
  console.log();
  console.log(`${DIM}try:${RESET} npx skills add vercel-labs/agent-skills`);
  console.log();
  console.log(`Discover more skills at ${TEXT}https://skills.sh/${RESET}`);
  console.log();
}
function showHelp() {
  const examples = [
    ["skills add vercel-labs/agent-skills"],
    ["skills use vercel-labs/agent-skills@vercel-optimize | claude"],
    ["skills use vercel-labs/agent-skills --skill vercel-optimize --agent claude-code"],
    ["skills add vercel-labs/agent-skills -g"],
    ["skills add vercel-labs/agent-skills --agent claude-code cursor"],
    ["skills add vercel-labs/agent-skills --skill pr-review commit"],
    ["skills add vercel-labs/agent-skills --json -y", "JSON output"],
    ["skills remove", "interactive remove"],
    ["skills remove web-design", "remove by name"],
    ["skills rm --global frontend-design"],
    ["skills list", "list project skills"],
    ["skills ls -g", "list global skills"],
    ["skills ls -a claude-code", "filter by agent"],
    ["skills ls --json", "JSON output"],
    ["skills find", "interactive search"],
    ["skills find typescript", "search by keyword"],
    ["skills find react --owner vercel", "search within an owner"],
    ["skills update"],
    ["skills update my-skill", "update a single skill"],
    ["skills update -g", "update global skills only"],
    ["skills experimental_install", "restore from skills-lock.json"],
    ["skills init my-skill"],
    ["skills experimental_sync", "sync from node_modules (experimental)"],
    ["skills experimental_sync -y", "sync without prompts"]
  ];
  const exampleWidth = Math.max(...examples.filter(([, description]) => description).map(([command]) => command.length));
  const formattedExamples = examples.map(([command, description]) => {
    const comment = description ? `${" ".repeat(exampleWidth - command.length + 2)}${DIM}# ${description}${RESET}` : "";
    return `  ${DIM}$${RESET} ${command}${comment}`;
  }).join(`
`);
  console.log(`
${BOLD}Usage:${RESET} skills <command> [options]

${BOLD}Manage Skills:${RESET}
  add <package>        Add a skill package (alias: a)
                       e.g. vercel-labs/agent-skills
                            notion
                            https://notion.so/<skill-page>
                            https://github.com/vercel-labs/agent-skills
  use <package>@<skill>
                       Generate a prompt for using one skill without installing it
  remove [skills]      Remove installed skills
  list, ls             List installed skills
  find [query]         Search for skills interactively

${BOLD}Find Options:${RESET}
  --owner <owner>        Search only repositories from a GitHub owner

${BOLD}Updates:${RESET}
  update [skills...]   Update skills to latest versions (alias: upgrade)

${BOLD}Update Options:${RESET}
  -g, --global           Update global skills only
  -p, --project          Update project skills only
  -y, --yes              Skip scope prompt (auto-detect: project if in a project, else global)

${BOLD}Project:${RESET}
  experimental_install Restore skills from skills-lock.json
  init [name]          Initialize a skill (creates <name>/SKILL.md or ./SKILL.md)
  experimental_sync    Sync skills from node_modules into agent directories (alias: sync)

${BOLD}Experimental Install Options:${RESET}
  --dry-run              Show what would be restored without installing anything
  --frozen-lockfile      Fail instead of changing skills-lock.json (default in CI)
  --no-frozen-lockfile   Allow skills-lock.json to change in CI
  --force                Reinstall skills that are already installed

${BOLD}Add Options:${RESET}
  -g, --global           Install skill globally (user-level) instead of project-level
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -s, --skill <skills>   Specify skill names to install (use '*' for all skills)
  -l, --list             List available skills in the repository without installing
  -y, --yes              Skip confirmation prompts
  --copy                 Copy files instead of symlinking to agent directories
  --metadata <json>      Attach valid JSON to the install telemetry event
  --subagent <names>     Install to Eve subagents (use 'root' for the root agent)
  --all                  Shorthand for --skill '*' --agent '*' -y
  --full-depth           Search all subdirectories even when a root SKILL.md exists
  --json                 Output results as JSON (machine-readable, no ANSI codes)

${BOLD}Use Options:${RESET}
  -s, --skill <skill>    Specify the skill to use
  -a, --agent <agent>    Start one supported agent interactively
  --full-depth           Search all subdirectories even when a root SKILL.md exists

${BOLD}Remove Options:${RESET}
  -g, --global           Remove from global scope
  -a, --agent <agents>   Remove from specific agents (omit to clean all agent links)
  -s, --skill <skills>   Specify skills to remove (use '*' for all skills)
  -y, --yes              Skip confirmation prompts
  --all                  Remove every installed skill (-y implied). Do not combine with named skills.
  
${BOLD}Experimental Sync Options:${RESET}
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -y, --yes              Skip confirmation prompts
  --copy                 Copy skills instead of linking them to node_modules
  --dry-run              Show what would change without changing anything
  --no-cleanup           Keep skills whose package no longer ships them
  --no-remote            Skip git sources listed in package.json skills fields
  --frozen-lockfile      Fail instead of changing skills-lock.json (default in CI)
  --no-frozen-lockfile   Allow skills-lock.json to change in CI
  -r, --recursive        Also sync the dependencies of each workspace package
  --include <patterns>   Only sync matching packages (<pkg>) or skills (<pkg>#<skill>)
  --exclude <patterns>   Skip matching packages (<pkg>) or skills (<pkg>#<skill>)

${BOLD}List Options:${RESET}
  -g, --global           List global skills (default: project)
  -a, --agent <agents>   Filter by specific agents
  --json                 Output as JSON (machine-readable, no ANSI codes)

${BOLD}Options:${RESET}
  --help, -h        Show this help message
  --version, -v     Show version number

${BOLD}Examples:${RESET}
${formattedExamples}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}
function showRemoveHelp() {
  console.log(`
${BOLD}Usage:${RESET} skills remove [skills...] [options]

${BOLD}Description:${RESET}
  Remove installed skills from agents. If no skill names are provided,
  an interactive selection menu will be shown.

${BOLD}Arguments:${RESET}
  skills            Optional skill names to remove (space-separated)

${BOLD}Options:${RESET}
  -g, --global       Remove from global scope (~/) instead of project scope
  -a, --agent        Remove from specific agents (omit to clean all agent links)
  -s, --skill        Specify skills to remove (use '*' for all skills)
  -y, --yes          Skip confirmation prompts
  --all              Remove every installed skill (-y implied). Do not combine with named skills.

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills remove                           ${DIM}# interactive selection${RESET}
  ${DIM}$${RESET} skills remove my-skill                   ${DIM}# remove specific skill${RESET}
  ${DIM}$${RESET} skills remove skill1 skill2 -y           ${DIM}# remove multiple skills${RESET}
  ${DIM}$${RESET} skills remove --global my-skill          ${DIM}# remove from global scope${RESET}
  ${DIM}$${RESET} skills rm --agent claude-code my-skill   ${DIM}# remove from specific agent${RESET}
  ${DIM}$${RESET} skills remove --all                      ${DIM}# remove all skills${RESET}
  ${DIM}$${RESET} skills remove --skill '*' -a cursor      ${DIM}# remove all skills from cursor${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}
function runInit(args) {
  const cwd = process.cwd();
  const skillName = args[0] || basename(cwd);
  const hasName = args[0] !== undefined;
  const skillDir = hasName ? join(cwd, skillName) : cwd;
  const skillFile = join(skillDir, "SKILL.md");
  const displayPath = hasName ? `${skillName}/SKILL.md` : "SKILL.md";
  if (existsSync(skillFile)) {
    console.log(`${TEXT}Skill already exists at ${DIM}${displayPath}${RESET}`);
    return;
  }
  if (hasName)
    mkdirSync(skillDir, { recursive: true });
  writeFileSync(skillFile, `---
name: ${$stringify(skillName).trimEnd()}
description: A brief description of what this skill does
---

# ${skillName}

Instructions for the agent to follow when this skill is activated.

## When to use

Describe when this skill should be used.

## Instructions

1. First step
2. Second step
3. Additional steps as needed
`);
  console.log(`${TEXT}Initialized skill: ${DIM}${skillName}${RESET}`);
  console.log();
  console.log(`${DIM}Created:${RESET}`);
  console.log(`  ${displayPath}`);
  console.log();
  console.log(`${DIM}Next steps:${RESET}`);
  console.log(`  1. Edit ${TEXT}${displayPath}${RESET} to define your skill instructions`);
  console.log(`  2. Update the ${TEXT}name${RESET} and ${TEXT}description${RESET} in the frontmatter`);
  console.log();
  console.log(`${DIM}Publishing:${RESET}`);
  console.log(`  ${DIM}GitHub:${RESET}  Push to a repo, then ${TEXT}npx skills add <owner>/<repo>${RESET}`);
  console.log(`  ${DIM}URL:${RESET}     Host the file, then ${TEXT}npx skills add https://example.com/${displayPath}${RESET}`);
  console.log();
  console.log(`Browse existing skills for inspiration at ${TEXT}https://skills.sh/${RESET}`);
  console.log();
}
async function main() {
  const args = process.argv.slice(2);
  const inAgent = await isRunningInAgent();
  if (args.length === 0) {
    if (!inAgent)
      showBanner();
    return;
  }
  const command = args[0];
  const restArgs = args.slice(1);
  if (command !== "--help" && command !== "-h" && command !== "--version" && command !== "-v" && (restArgs.includes("--help") || restArgs.includes("-h"))) {
    if (command === "remove" || command === "rm" || command === "r")
      showRemoveHelp();
    else
      showHelp();
    return;
  }
  switch (command) {
    case "find":
    case "search":
    case "f":
    case "s":
      if (!inAgent)
        showLogo();
      console.log();
      await runFind(restArgs);
      break;
    case "init":
      if (!inAgent)
        showLogo();
      console.log();
      runInit(restArgs);
      break;
    case "experimental_install":
      if (!inAgent)
        showLogo();
      await runInstallFromLock(restArgs);
      break;
    case "i":
    case "install":
    case "a":
    case "add": {
      const { source: addSource, options: addOpts, errors: errors2 } = parseAddOptions(restArgs);
      if (!inAgent && !addOpts.json)
        showLogo();
      if (errors2.length > 0) {
        for (const error of errors2)
          console.error(`Error: ${error}`);
        if (addOpts.json)
          console.log("[]");
        process.exitCode = 1;
        break;
      }
      await runAdd(addSource, addOpts);
      break;
    }
    case "use": {
      const { source: useSource, options: useOptions, errors: useErrors } = parseUseOptions(restArgs);
      await runUse(useSource, useOptions, useErrors);
      break;
    }
    case "remove":
    case "rm":
    case "r": {
      const { skills, options: removeOptions } = parseRemoveOptions(restArgs);
      await removeCommand(skills, removeOptions);
      break;
    }
    case "sync":
    case "experimental_sync": {
      if (!inAgent)
        showLogo();
      const { options: syncOptions } = parseSyncOptions(restArgs);
      await runSync(restArgs, syncOptions);
      break;
    }
    case "list":
    case "ls":
      await runList(restArgs);
      break;
    case "check":
      await runUpdate(restArgs, "check");
      break;
    case "update":
    case "upgrade":
      await runUpdate(restArgs);
      break;
    case "--help":
    case "-h":
      showHelp();
      break;
    case "--version":
    case "-v":
      console.log(VERSION);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Run ${BOLD}skills --help${RESET} for usage.`);
      process.exitCode = 1;
  }
}
main().catch((error) => {
  if (!(error instanceof InvalidLocalLockError))
    throw error;
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}).finally(() => flushTelemetry().then(() => process.exit(process.exitCode ?? 0)));
