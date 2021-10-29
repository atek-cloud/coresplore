/*! For license information please see json-ptr.js.LICENSE.txt */
const mod = (() => {
  "use strict";
  var e = {
          607: (e, t, r) => {
              Object.defineProperty(t, "__esModule", { value: !0 });
              const n = r(655);
              n.__exportStar(r(699), t), n.__exportStar(r(882), t), n.__exportStar(r(762), t);
          },
          762: (e, t, r) => {
              Object.defineProperty(t, "__esModule", { value: !0 }), (t.JsonReference = t.JsonPointer = void 0);
              const n = r(882);
              function o(e) {
                  return "object" == typeof e && null !== e;
              }
              function i(e) {
                  return o(e) && !h.isReference(e);
              }
              function a(e, t, r) {
                  const a = new Map(),
                      c = [{ obj: e, path: [] }];
                  for (; c.length; ) {
                      const { obj: e, path: s } = c.shift();
                      if ((t(r(s), e), i(e)))
                          if ((a.set(e, new f(n.encodeUriFragmentIdentifier(s))), Array.isArray(e))) {
                              let t = -1;
                              const r = e.length;
                              for (; ++t < r; ) {
                                  const r = e[t];
                                  o(r) && a.has(r) ? c.push({ obj: new h(a.get(r)), path: s.concat([t + ""]) }) : c.push({ obj: r, path: s.concat([t + ""]) });
                              }
                          } else {
                              const t = Object.keys(e),
                                  r = t.length;
                              let n = -1;
                              for (; ++n < r; ) {
                                  const r = e[t[n]];
                                  o(r) && a.has(r) ? c.push({ obj: new h(a.get(r)), path: s.concat(t[n]) }) : c.push({ obj: r, path: s.concat(t[n]) });
                              }
                          }
                  }
              }
              const c = Symbol("pointer"),
                  s = Symbol("fragmentId"),
                  u = Symbol("getter");
              class f {
                  constructor(e) {
                      this.path = n.decodePtrInit(e);
                  }
                  static create(e) {
                      return new f(e);
                  }
                  static has(e, t) {
                      return ("string" == typeof t || Array.isArray(t)) && (t = new f(t)), t.has(e);
                  }
                  static get(e, t) {
                      return ("string" == typeof t || Array.isArray(t)) && (t = new f(t)), t.get(e);
                  }
                  static set(e, t, r, n = !1) {
                      return ("string" == typeof t || Array.isArray(t)) && (t = new f(t)), t.set(e, r, n);
                  }
                  static unset(e, t) {
                      return ("string" == typeof t || Array.isArray(t)) && (t = new f(t)), t.unset(e);
                  }
                  static decode(e) {
                      return n.pickDecoder(e)(e);
                  }
                  static visit(e, t, r = !1) {
                      a(e, t, r ? n.encodeUriFragmentIdentifier : n.encodePointer);
                  }
                  static listPointers(e) {
                      const t = [];
                      return (
                          a(
                              e,
                              (e, r) => {
                                  t.push({ pointer: e, value: r });
                              },
                              n.encodePointer
                          ),
                          t
                      );
                  }
                  static listFragmentIds(e) {
                      const t = [];
                      return (
                          a(
                              e,
                              (e, r) => {
                                  t.push({ fragmentId: e, value: r });
                              },
                              n.encodeUriFragmentIdentifier
                          ),
                          t
                      );
                  }
                  static flatten(e, t = !1) {
                      const r = {};
                      return (
                          a(
                              e,
                              (e, t) => {
                                  r[e] = t;
                              },
                              t ? n.encodeUriFragmentIdentifier : n.encodePointer
                          ),
                          r
                      );
                  }
                  static map(e, t = !1) {
                      const r = new Map();
                      return a(e, r.set.bind(r), t ? n.encodeUriFragmentIdentifier : n.encodePointer), r;
                  }
                  get(e) {
                      return this[u] || (this[u] = n.compilePointerDereference(this.path)), this[u](e);
                  }
                  set(e, t, r = !1) {
                      return n.setValueAtPath(e, t, this.path, r);
                  }
                  unset(e) {
                      return n.unsetValueAtPath(e, this.path);
                  }
                  has(e) {
                      return void 0 !== this.get(e);
                  }
                  parent(e) {
                      const t = this.path;
                      if (1 != t.length) return new f(t.slice(0, t.length - 1)).get(e);
                  }
                  relative(e) {
                      const t = this.path,
                          r = n.decodeRelativePointer(e),
                          o = parseInt(r[0]);
                      if (o > t.length) throw new Error("Relative location does not exist.");
                      const i = t.slice(0, t.length - o).concat(r.slice(1));
                      if ("#" == r[0][r[0].length - 1]) {
                          const e = i[i.length - 1];
                          throw new Error(`We won't compile a pointer that will always return '${e}'. Use JsonPointer.rel(target, ptr) instead.`);
                      }
                      return new f(i);
                  }
                  rel(e, t) {
                      const r = this.path,
                          o = n.decodeRelativePointer(t),
                          i = parseInt(o[0]);
                      if (i > r.length) return;
                      const a = r.slice(0, r.length - i).concat(o.slice(1)),
                          c = new f(a);
                      if ("#" == o[0][o[0].length - 1]) {
                          const t = a[a.length - 1],
                              r = c.parent(e);
                          return Array.isArray(r) ? parseInt(t, 10) : t;
                      }
                      return c.get(e);
                  }
                  concat(e) {
                      return new f(this.path.concat(e instanceof f ? e.path : n.decodePtrInit(e)));
                  }
                  get pointer() {
                      return void 0 === this[c] && (this[c] = n.encodePointer(this.path)), this[c];
                  }
                  get uriFragmentIdentifier() {
                      return this[s] || (this[s] = n.encodeUriFragmentIdentifier(this.path)), this[s];
                  }
                  toString() {
                      return this.pointer;
                  }
              }
              t.JsonPointer = f;
              const l = Symbol("pointer");
              class h {
                  constructor(e) {
                      (this[l] = e instanceof f ? e : new f(e)), (this.$ref = this[l].uriFragmentIdentifier);
                  }
                  static isReference(e) {
                      if (!e) return !1;
                      const t = e;
                      return "string" == typeof t.$ref && "function" == typeof t.resolve;
                  }
                  resolve(e) {
                      return this[l].get(e);
                  }
                  pointer() {
                      return this[l];
                  }
                  toString() {
                      return this.$ref;
                  }
              }
              t.JsonReference = h;
          },
          699: (e, t) => {
              Object.defineProperty(t, "__esModule", { value: !0 });
          },
          882: (e, t) => {
              function r(e, t, r) {
                  let n = "",
                      o = e,
                      i = 0,
                      a = -1;
                  for (; (a = o.indexOf(t)) > -1; ) (n += e.substring(i, i + a) + r), (o = o.substring(a + t.length, o.length)), (i += a + t.length);
                  return o.length > 0 && (n += e.substring(e.length - o.length, e.length)), n;
              }
              function n(e) {
                  let t = -1;
                  const n = e.length,
                      o = new Array(n);
                  for (; ++t < n; ) "string" == typeof e[t] ? (o[t] = r(r(decodeURIComponent(e[t]), "~1", "/"), "~0", "~")) : (o[t] = e[t]);
                  return o;
              }
              function o(e) {
                  let t = -1;
                  const n = e.length,
                      o = new Array(n);
                  for (; ++t < n; ) "string" == typeof e[t] ? (o[t] = encodeURIComponent(r(r(e[t], "~", "~0"), "/", "~1"))) : (o[t] = e[t]);
                  return o;
              }
              function i(e) {
                  let t = -1;
                  const n = e.length,
                      o = new Array(n);
                  for (; ++t < n; ) "string" == typeof e[t] ? (o[t] = r(r(e[t], "~1", "/"), "~0", "~")) : (o[t] = e[t]);
                  return o;
              }
              function a(e) {
                  let t = -1;
                  const n = e.length,
                      o = new Array(n);
                  for (; ++t < n; ) "string" == typeof e[t] ? (o[t] = r(r(e[t], "~", "~0"), "/", "~1")) : (o[t] = e[t]);
                  return o;
              }
              function c(e) {
                  if ("string" != typeof e) throw new TypeError("Invalid type: JSON Pointers are represented as strings.");
                  if (0 === e.length) return [];
                  if ("/" !== e[0]) throw new ReferenceError("Invalid JSON Pointer syntax. Non-empty pointer must begin with a solidus `/`.");
                  return i(e.substring(1).split("/"));
              }
              function s(e) {
                  if ("string" != typeof e) throw new TypeError("Invalid type: JSON Pointers are represented as strings.");
                  if (0 === e.length || "#" !== e[0]) throw new ReferenceError("Invalid JSON Pointer syntax; URI fragment identifiers must begin with a hash.");
                  if (1 === e.length) return [];
                  if ("/" !== e[1]) throw new ReferenceError("Invalid JSON Pointer syntax.");
                  return n(e.substring(2).split("/"));
              }
              Object.defineProperty(t, "__esModule", { value: !0 }),
                  (t.decodePtrInit = t.pickDecoder = t.looksLikeFragment = t.unsetValueAtPath = t.setValueAtPath = t.compilePointerDereference = t.toArrayIndexReference = t.decodeRelativePointer = t.encodeUriFragmentIdentifier = t.decodeUriFragmentIdentifier = t.encodePointer = t.decodePointer = t.encodePointerSegments = t.decodePointerSegments = t.encodeFragmentSegments = t.decodeFragmentSegments = t.replace = void 0),
                  (t.replace = r),
                  (t.decodeFragmentSegments = n),
                  (t.encodeFragmentSegments = o),
                  (t.decodePointerSegments = i),
                  (t.encodePointerSegments = a),
                  (t.decodePointer = c),
                  (t.encodePointer = function (e) {
                      if (!e || (e && !Array.isArray(e))) throw new TypeError("Invalid type: path must be an array of segments.");
                      return 0 === e.length ? "" : "/".concat(a(e).join("/"));
                  }),
                  (t.decodeUriFragmentIdentifier = s),
                  (t.encodeUriFragmentIdentifier = function (e) {
                      if (!e || (e && !Array.isArray(e))) throw new TypeError("Invalid type: path must be an array of segments.");
                      return 0 === e.length ? "#" : "#/".concat(o(e).join("/"));
                  });
              const u = "Invalid Relative JSON Pointer syntax. Relative pointer must begin with a non-negative integer, followed by either the number sign (#), or a JSON Pointer.";
              function f(e, t) {
                  if ("number" == typeof t) return t;
                  const r = t.length;
                  if (!r) return -1;
                  let n = 0;
                  if (1 === r && "-" === t[0]) return Array.isArray(e) ? e.length : 0;
                  for (; ++n < r; ) if (t[n] < "0" || t[n] > "9") return -1;
                  return parseInt(t, 10);
              }
              function l(e) {
                  return (null == e ? void 0 : e.length) > 0 && "#" === e[0];
              }
              function h(e) {
                  return l(e) ? s : c;
              }
              (t.decodeRelativePointer = function (e) {
                  if ("string" != typeof e) throw new TypeError("Invalid type: Relative JSON Pointers are represented as strings.");
                  if (0 === e.length) throw new ReferenceError(u);
                  const t = e.split("/");
                  let r = t[0];
                  if ("#" == r[r.length - 1]) {
                      if (t.length > 1) throw new ReferenceError(u);
                      r = r.substr(0, r.length - 1);
                  }
                  let n = -1;
                  const o = r.length;
                  for (; ++n < o; ) if (r[n] < "0" || r[n] > "9") throw new ReferenceError(u);
                  const a = i(t.slice(1));
                  return a.unshift(t[0]), a;
              }),
                  (t.toArrayIndexReference = f),
                  (t.compilePointerDereference = function (e) {
                      let t = "if (typeof(it) !== 'undefined'";
                      return 0 === e.length
                          ? (e) => e
                          : ((t = e.reduce((t, n, o) => t + "\n\t&& it !== null && typeof((it = it['" + r(r(e[o] + "", "\\", "\\\\"), "'", "\\'") + "'])) !== 'undefined'", "if (typeof(it) !== 'undefined'")),
                            (t += ") {\n\treturn it;\n }"),
                            new Function("it", t));
                  }),
                  (t.setValueAtPath = function (e, t, r, n = !1) {
                      if (0 === r.length) throw new Error("Cannot set the root object; assign it directly.");
                      if (void 0 === e) throw new TypeError("Cannot set values on undefined");
                      let o = e;
                      const i = r.length,
                          a = r.length - 1;
                      let c,
                          s,
                          u,
                          l = -1;
                      for (; ++l < i; ) {
                          if (((c = r[l]), "__proto__" === c || "constructor" === c || "prototype" === c)) throw new Error("Attempted prototype pollution disallowed.");
                          if (Array.isArray(o)) {
                              if ("-" === c && l === a) return void o.push(t);
                              if (((u = f(o, c)), o.length > u)) {
                                  if (l === a) {
                                      (s = o[u]), (o[u] = t);
                                      break;
                                  }
                                  o = o[u];
                              } else if (l === a && u === o.length) {
                                  if (n) return void o.push(t);
                              } else n && (o = o[u] = l === a ? t : {});
                          } else {
                              if (void 0 === o[c]) {
                                  if (n) {
                                      if (l === a) return void (o[c] = t);
                                      if (-1 !== f(o[c], r[l + 1])) {
                                          o = o[c] = [];
                                          continue;
                                      }
                                      o = o[c] = {};
                                      continue;
                                  }
                                  return;
                              }
                              if (l === a) {
                                  (s = o[c]), (o[c] = t);
                                  break;
                              }
                              o = o[c];
                          }
                      }
                      return s;
                  }),
                  (t.unsetValueAtPath = function (e, t) {
                      if (0 === t.length) throw new Error("Cannot unset the root object; assign it directly.");
                      if (void 0 === e) throw new TypeError("Cannot unset values on undefined");
                      let r = e;
                      const n = t.length,
                          o = t.length - 1;
                      let i,
                          a,
                          c,
                          s = -1;
                      for (; ++s < n; )
                          if (((i = t[s]), Array.isArray(r))) {
                              if (((c = f(r, i)), c >= r.length)) return;
                              if (s === o) {
                                  (a = r[c]), delete r[c];
                                  break;
                              }
                              r = r[c];
                          } else {
                              if (void 0 === r[i]) return;
                              if (s === o) {
                                  (a = r[i]), delete r[i];
                                  break;
                              }
                              r = r[i];
                          }
                      return a;
                  }),
                  (t.looksLikeFragment = l),
                  (t.pickDecoder = h),
                  (t.decodePtrInit = function (e) {
                      return Array.isArray(e) ? e.slice(0) : h(e)(e);
                  });
          },
          655: (e, t, r) => {
              r.r(t),
                  r.d(t, {
                      __extends: () => o,
                      __assign: () => i,
                      __rest: () => a,
                      __decorate: () => c,
                      __param: () => s,
                      __metadata: () => u,
                      __awaiter: () => f,
                      __generator: () => l,
                      __createBinding: () => h,
                      __exportStar: () => p,
                      __values: () => d,
                      __read: () => y,
                      __spread: () => g,
                      __spreadArrays: () => w,
                      __spreadArray: () => v,
                      __await: () => b,
                      __asyncGenerator: () => m,
                      __asyncDelegator: () => _,
                      __asyncValues: () => P,
                      __makeTemplateObject: () => O,
                      __importStar: () => j,
                      __importDefault: () => I,
                      __classPrivateFieldGet: () => A,
                      __classPrivateFieldSet: () => x,
                  });
              var n = function (e, t) {
                  return (n =
                      Object.setPrototypeOf ||
                      ({ __proto__: [] } instanceof Array &&
                          function (e, t) {
                              e.__proto__ = t;
                          }) ||
                      function (e, t) {
                          for (var r in t) Object.prototype.hasOwnProperty.call(t, r) && (e[r] = t[r]);
                      })(e, t);
              };
              function o(e, t) {
                  if ("function" != typeof t && null !== t) throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
                  function r() {
                      this.constructor = e;
                  }
                  n(e, t), (e.prototype = null === t ? Object.create(t) : ((r.prototype = t.prototype), new r()));
              }
              var i = function () {
                  return (i =
                      Object.assign ||
                      function (e) {
                          for (var t, r = 1, n = arguments.length; r < n; r++) for (var o in (t = arguments[r])) Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
                          return e;
                      }).apply(this, arguments);
              };
              function a(e, t) {
                  var r = {};
                  for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n]);
                  if (null != e && "function" == typeof Object.getOwnPropertySymbols) {
                      var o = 0;
                      for (n = Object.getOwnPropertySymbols(e); o < n.length; o++) t.indexOf(n[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, n[o]) && (r[n[o]] = e[n[o]]);
                  }
                  return r;
              }
              function c(e, t, r, n) {
                  var o,
                      i = arguments.length,
                      a = i < 3 ? t : null === n ? (n = Object.getOwnPropertyDescriptor(t, r)) : n;
                  if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) a = Reflect.decorate(e, t, r, n);
                  else for (var c = e.length - 1; c >= 0; c--) (o = e[c]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, r, a) : o(t, r)) || a);
                  return i > 3 && a && Object.defineProperty(t, r, a), a;
              }
              function s(e, t) {
                  return function (r, n) {
                      t(r, n, e);
                  };
              }
              function u(e, t) {
                  if ("object" == typeof Reflect && "function" == typeof Reflect.metadata) return Reflect.metadata(e, t);
              }
              function f(e, t, r, n) {
                  return new (r || (r = Promise))(function (o, i) {
                      function a(e) {
                          try {
                              s(n.next(e));
                          } catch (e) {
                              i(e);
                          }
                      }
                      function c(e) {
                          try {
                              s(n.throw(e));
                          } catch (e) {
                              i(e);
                          }
                      }
                      function s(e) {
                          var t;
                          e.done
                              ? o(e.value)
                              : ((t = e.value),
                                t instanceof r
                                    ? t
                                    : new r(function (e) {
                                          e(t);
                                      })).then(a, c);
                      }
                      s((n = n.apply(e, t || [])).next());
                  });
              }
              function l(e, t) {
                  var r,
                      n,
                      o,
                      i,
                      a = {
                          label: 0,
                          sent: function () {
                              if (1 & o[0]) throw o[1];
                              return o[1];
                          },
                          trys: [],
                          ops: [],
                      };
                  return (
                      (i = { next: c(0), throw: c(1), return: c(2) }),
                      "function" == typeof Symbol &&
                          (i[Symbol.iterator] = function () {
                              return this;
                          }),
                      i
                  );
                  function c(i) {
                      return function (c) {
                          return (function (i) {
                              if (r) throw new TypeError("Generator is already executing.");
                              for (; a; )
                                  try {
                                      if (((r = 1), n && (o = 2 & i[0] ? n.return : i[0] ? n.throw || ((o = n.return) && o.call(n), 0) : n.next) && !(o = o.call(n, i[1])).done)) return o;
                                      switch (((n = 0), o && (i = [2 & i[0], o.value]), i[0])) {
                                          case 0:
                                          case 1:
                                              o = i;
                                              break;
                                          case 4:
                                              return a.label++, { value: i[1], done: !1 };
                                          case 5:
                                              a.label++, (n = i[1]), (i = [0]);
                                              continue;
                                          case 7:
                                              (i = a.ops.pop()), a.trys.pop();
                                              continue;
                                          default:
                                              if (!((o = (o = a.trys).length > 0 && o[o.length - 1]) || (6 !== i[0] && 2 !== i[0]))) {
                                                  a = 0;
                                                  continue;
                                              }
                                              if (3 === i[0] && (!o || (i[1] > o[0] && i[1] < o[3]))) {
                                                  a.label = i[1];
                                                  break;
                                              }
                                              if (6 === i[0] && a.label < o[1]) {
                                                  (a.label = o[1]), (o = i);
                                                  break;
                                              }
                                              if (o && a.label < o[2]) {
                                                  (a.label = o[2]), a.ops.push(i);
                                                  break;
                                              }
                                              o[2] && a.ops.pop(), a.trys.pop();
                                              continue;
                                      }
                                      i = t.call(e, a);
                                  } catch (e) {
                                      (i = [6, e]), (n = 0);
                                  } finally {
                                      r = o = 0;
                                  }
                              if (5 & i[0]) throw i[1];
                              return { value: i[0] ? i[1] : void 0, done: !0 };
                          })([i, c]);
                      };
                  }
              }
              var h = Object.create
                  ? function (e, t, r, n) {
                        void 0 === n && (n = r),
                            Object.defineProperty(e, n, {
                                enumerable: !0,
                                get: function () {
                                    return t[r];
                                },
                            });
                    }
                  : function (e, t, r, n) {
                        void 0 === n && (n = r), (e[n] = t[r]);
                    };
              function p(e, t) {
                  for (var r in e) "default" === r || Object.prototype.hasOwnProperty.call(t, r) || h(t, e, r);
              }
              function d(e) {
                  var t = "function" == typeof Symbol && Symbol.iterator,
                      r = t && e[t],
                      n = 0;
                  if (r) return r.call(e);
                  if (e && "number" == typeof e.length)
                      return {
                          next: function () {
                              return e && n >= e.length && (e = void 0), { value: e && e[n++], done: !e };
                          },
                      };
                  throw new TypeError(t ? "Object is not iterable." : "Symbol.iterator is not defined.");
              }
              function y(e, t) {
                  var r = "function" == typeof Symbol && e[Symbol.iterator];
                  if (!r) return e;
                  var n,
                      o,
                      i = r.call(e),
                      a = [];
                  try {
                      for (; (void 0 === t || t-- > 0) && !(n = i.next()).done; ) a.push(n.value);
                  } catch (e) {
                      o = { error: e };
                  } finally {
                      try {
                          n && !n.done && (r = i.return) && r.call(i);
                      } finally {
                          if (o) throw o.error;
                      }
                  }
                  return a;
              }
              function g() {
                  for (var e = [], t = 0; t < arguments.length; t++) e = e.concat(y(arguments[t]));
                  return e;
              }
              function w() {
                  for (var e = 0, t = 0, r = arguments.length; t < r; t++) e += arguments[t].length;
                  var n = Array(e),
                      o = 0;
                  for (t = 0; t < r; t++) for (var i = arguments[t], a = 0, c = i.length; a < c; a++, o++) n[o] = i[a];
                  return n;
              }
              function v(e, t) {
                  for (var r = 0, n = t.length, o = e.length; r < n; r++, o++) e[o] = t[r];
                  return e;
              }
              function b(e) {
                  return this instanceof b ? ((this.v = e), this) : new b(e);
              }
              function m(e, t, r) {
                  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
                  var n,
                      o = r.apply(e, t || []),
                      i = [];
                  return (
                      (n = {}),
                      a("next"),
                      a("throw"),
                      a("return"),
                      (n[Symbol.asyncIterator] = function () {
                          return this;
                      }),
                      n
                  );
                  function a(e) {
                      o[e] &&
                          (n[e] = function (t) {
                              return new Promise(function (r, n) {
                                  i.push([e, t, r, n]) > 1 || c(e, t);
                              });
                          });
                  }
                  function c(e, t) {
                      try {
                          (r = o[e](t)).value instanceof b ? Promise.resolve(r.value.v).then(s, u) : f(i[0][2], r);
                      } catch (e) {
                          f(i[0][3], e);
                      }
                      var r;
                  }
                  function s(e) {
                      c("next", e);
                  }
                  function u(e) {
                      c("throw", e);
                  }
                  function f(e, t) {
                      e(t), i.shift(), i.length && c(i[0][0], i[0][1]);
                  }
              }
              function _(e) {
                  var t, r;
                  return (
                      (t = {}),
                      n("next"),
                      n("throw", function (e) {
                          throw e;
                      }),
                      n("return"),
                      (t[Symbol.iterator] = function () {
                          return this;
                      }),
                      t
                  );
                  function n(n, o) {
                      t[n] = e[n]
                          ? function (t) {
                                return (r = !r) ? { value: b(e[n](t)), done: "return" === n } : o ? o(t) : t;
                            }
                          : o;
                  }
              }
              function P(e) {
                  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
                  var t,
                      r = e[Symbol.asyncIterator];
                  return r
                      ? r.call(e)
                      : ((e = d(e)),
                        (t = {}),
                        n("next"),
                        n("throw"),
                        n("return"),
                        (t[Symbol.asyncIterator] = function () {
                            return this;
                        }),
                        t);
                  function n(r) {
                      t[r] =
                          e[r] &&
                          function (t) {
                              return new Promise(function (n, o) {
                                  !(function (e, t, r, n) {
                                      Promise.resolve(n).then(function (t) {
                                          e({ value: t, done: r });
                                      }, t);
                                  })(n, o, (t = e[r](t)).done, t.value);
                              });
                          };
                  }
              }
              function O(e, t) {
                  return Object.defineProperty ? Object.defineProperty(e, "raw", { value: t }) : (e.raw = t), e;
              }
              var S = Object.create
                  ? function (e, t) {
                        Object.defineProperty(e, "default", { enumerable: !0, value: t });
                    }
                  : function (e, t) {
                        e.default = t;
                    };
              function j(e) {
                  if (e && e.__esModule) return e;
                  var t = {};
                  if (null != e) for (var r in e) "default" !== r && Object.prototype.hasOwnProperty.call(e, r) && h(t, e, r);
                  return S(t, e), t;
              }
              function I(e) {
                  return e && e.__esModule ? e : { default: e };
              }
              function A(e, t, r, n) {
                  if ("a" === r && !n) throw new TypeError("Private accessor was defined without a getter");
                  if ("function" == typeof t ? e !== t || !n : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
                  return "m" === r ? n : "a" === r ? n.call(e) : n ? n.value : t.get(e);
              }
              function x(e, t, r, n, o) {
                  if ("m" === n) throw new TypeError("Private method is not writable");
                  if ("a" === n && !o) throw new TypeError("Private accessor was defined without a setter");
                  if ("function" == typeof t ? e !== t || !o : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
                  return "a" === n ? o.call(e, r) : o ? (o.value = r) : t.set(e, r), r;
              }
          },
      },
      t = {};
  function r(n) {
      var o = t[n];
      if (void 0 !== o) return o.exports;
      var i = (t[n] = { exports: {} });
      return e[n](i, i.exports, r), i.exports;
  }
  return (r.d = (e, t) => {
      for (var n in t) r.o(t, n) && !r.o(e, n) && Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
  }),
      (r.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
      (r.r = (e) => {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 });
      }),
      r(607);
})();
export const JsonPointer = mod.JsonPointer