"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/postgres/cjs/src/query.js
var require_query = __commonJS({
  "node_modules/postgres/cjs/src/query.js"(exports2, module2) {
    var originCache = /* @__PURE__ */ new Map();
    var originStackCache = /* @__PURE__ */ new Map();
    var originError = /* @__PURE__ */ Symbol("OriginError");
    var CLOSE = module2.exports.CLOSE = {};
    var Query = module2.exports.Query = class Query extends Promise {
      constructor(strings, args, handler, canceller, options = {}) {
        let resolve, reject;
        super((a, b) => {
          resolve = a;
          reject = b;
        });
        this.tagged = Array.isArray(strings.raw);
        this.strings = strings;
        this.args = args;
        this.handler = handler;
        this.canceller = canceller;
        this.options = options;
        this.state = null;
        this.statement = null;
        this.resolve = (x) => (this.active = false, resolve(x));
        this.reject = (x) => (this.active = false, reject(x));
        this.active = false;
        this.cancelled = null;
        this.executed = false;
        this.signature = "";
        this[originError] = this.handler.debug ? new Error() : this.tagged && cachedError(this.strings);
      }
      get origin() {
        return (this.handler.debug ? this[originError].stack : this.tagged && originStackCache.has(this.strings) ? originStackCache.get(this.strings) : originStackCache.set(this.strings, this[originError].stack).get(this.strings)) || "";
      }
      static get [Symbol.species]() {
        return Promise;
      }
      cancel() {
        return this.canceller && (this.canceller(this), this.canceller = null);
      }
      simple() {
        this.options.simple = true;
        this.options.prepare = false;
        return this;
      }
      async readable() {
        this.simple();
        this.streaming = true;
        return this;
      }
      async writable() {
        this.simple();
        this.streaming = true;
        return this;
      }
      cursor(rows = 1, fn) {
        this.options.simple = false;
        if (typeof rows === "function") {
          fn = rows;
          rows = 1;
        }
        this.cursorRows = rows;
        if (typeof fn === "function")
          return this.cursorFn = fn, this;
        let prev;
        return {
          [Symbol.asyncIterator]: () => ({
            next: () => {
              if (this.executed && !this.active)
                return { done: true };
              prev && prev();
              const promise = new Promise((resolve, reject) => {
                this.cursorFn = (value) => {
                  resolve({ value, done: false });
                  return new Promise((r) => prev = r);
                };
                this.resolve = () => (this.active = false, resolve({ done: true }));
                this.reject = (x) => (this.active = false, reject(x));
              });
              this.execute();
              return promise;
            },
            return() {
              prev && prev(CLOSE);
              return { done: true };
            }
          })
        };
      }
      describe() {
        this.options.simple = false;
        this.onlyDescribe = this.options.prepare = true;
        return this;
      }
      stream() {
        throw new Error(".stream has been renamed to .forEach");
      }
      forEach(fn) {
        this.forEachFn = fn;
        this.handle();
        return this;
      }
      raw() {
        this.isRaw = true;
        return this;
      }
      values() {
        this.isRaw = "values";
        return this;
      }
      async handle() {
        !this.executed && (this.executed = true) && await 1 && this.handler(this);
      }
      execute() {
        this.handle();
        return this;
      }
      then() {
        this.handle();
        return super.then.apply(this, arguments);
      }
      catch() {
        this.handle();
        return super.catch.apply(this, arguments);
      }
      finally() {
        this.handle();
        return super.finally.apply(this, arguments);
      }
    };
    function cachedError(xs) {
      if (originCache.has(xs))
        return originCache.get(xs);
      const x = Error.stackTraceLimit;
      Error.stackTraceLimit = 4;
      originCache.set(xs, new Error());
      Error.stackTraceLimit = x;
      return originCache.get(xs);
    }
  }
});

// node_modules/postgres/cjs/src/errors.js
var require_errors = __commonJS({
  "node_modules/postgres/cjs/src/errors.js"(exports2, module2) {
    var PostgresError = module2.exports.PostgresError = class PostgresError extends Error {
      constructor(x) {
        super(x.message);
        this.name = this.constructor.name;
        Object.assign(this, x);
      }
    };
    var Errors = module2.exports.Errors = {
      connection,
      postgres: postgres2,
      generic,
      notSupported
    };
    function connection(x, options, socket) {
      const { host, port } = socket || options;
      const error = Object.assign(
        new Error("write " + x + " " + (options.path || host + ":" + port)),
        {
          code: x,
          errno: x,
          address: options.path || host
        },
        options.path ? {} : { port }
      );
      Error.captureStackTrace(error, connection);
      return error;
    }
    function postgres2(x) {
      const error = new PostgresError(x);
      Error.captureStackTrace(error, postgres2);
      return error;
    }
    function generic(code, message) {
      const error = Object.assign(new Error(code + ": " + message), { code });
      Error.captureStackTrace(error, generic);
      return error;
    }
    function notSupported(x) {
      const error = Object.assign(
        new Error(x + " (B) is not supported"),
        {
          code: "MESSAGE_NOT_SUPPORTED",
          name: x
        }
      );
      Error.captureStackTrace(error, notSupported);
      return error;
    }
  }
});

// node_modules/postgres/cjs/src/types.js
var require_types = __commonJS({
  "node_modules/postgres/cjs/src/types.js"(exports2, module2) {
    var { Query } = require_query();
    var { Errors } = require_errors();
    var types = module2.exports.types = {
      string: {
        to: 25,
        from: null,
        // defaults to string
        serialize: (x) => "" + x
      },
      number: {
        to: 0,
        from: [21, 23, 26, 700, 701],
        serialize: (x) => "" + x,
        parse: (x) => +x
      },
      json: {
        to: 114,
        from: [114, 3802],
        serialize: (x) => JSON.stringify(x),
        parse: (x) => JSON.parse(x)
      },
      boolean: {
        to: 16,
        from: 16,
        serialize: (x) => x === true ? "t" : "f",
        parse: (x) => x === "t"
      },
      date: {
        to: 1184,
        from: [1082, 1114, 1184],
        serialize: (x) => (x instanceof Date ? x : new Date(x)).toISOString(),
        parse: (x) => new Date(x)
      },
      bytea: {
        to: 17,
        from: 17,
        serialize: (x) => "\\x" + Buffer.from(x).toString("hex"),
        parse: (x) => Buffer.from(x.slice(2), "hex")
      }
    };
    var NotTagged = class {
      then() {
        notTagged();
      }
      catch() {
        notTagged();
      }
      finally() {
        notTagged();
      }
    };
    var Identifier = module2.exports.Identifier = class Identifier extends NotTagged {
      constructor(value) {
        super();
        this.value = escapeIdentifier(value);
      }
    };
    var Parameter = module2.exports.Parameter = class Parameter extends NotTagged {
      constructor(value, type, array) {
        super();
        this.value = value;
        this.type = type;
        this.array = array;
      }
    };
    var Builder = module2.exports.Builder = class Builder extends NotTagged {
      constructor(first, rest) {
        super();
        this.first = first;
        this.rest = rest;
      }
      build(before, parameters, types2, options) {
        const keyword = builders.map(([x, fn]) => ({ fn, i: before.search(x) })).sort((a, b) => a.i - b.i).pop();
        return keyword.i === -1 ? escapeIdentifiers(this.first, options) : keyword.fn(this.first, this.rest, parameters, types2, options);
      }
    };
    module2.exports.handleValue = handleValue;
    function handleValue(x, parameters, types2, options) {
      let value = x instanceof Parameter ? x.value : x;
      if (value === void 0) {
        x instanceof Parameter ? x.value = options.transform.undefined : value = x = options.transform.undefined;
        if (value === void 0)
          throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
      }
      return "$" + types2.push(
        x instanceof Parameter ? (parameters.push(x.value), x.array ? x.array[x.type || inferType(x.value)] || x.type || firstIsString(x.value) : x.type) : (parameters.push(x), inferType(x))
      );
    }
    var defaultHandlers = typeHandlers(types);
    module2.exports.stringify = stringify;
    function stringify(q, string, value, parameters, types2, options) {
      for (let i = 1; i < q.strings.length; i++) {
        string += stringifyValue(string, value, parameters, types2, options) + q.strings[i];
        value = q.args[i];
      }
      return string;
    }
    function stringifyValue(string, value, parameters, types2, o) {
      return value instanceof Builder ? value.build(string, parameters, types2, o) : value instanceof Query ? fragment(value, parameters, types2, o) : value instanceof Identifier ? value.value : value && value[0] instanceof Query ? value.reduce((acc, x) => acc + " " + fragment(x, parameters, types2, o), "") : handleValue(value, parameters, types2, o);
    }
    function fragment(q, parameters, types2, options) {
      q.fragment = true;
      return stringify(q, q.strings[0], q.args[0], parameters, types2, options);
    }
    function valuesBuilder(first, parameters, types2, columns, options) {
      return first.map(
        (row) => "(" + columns.map(
          (column) => stringifyValue("values", row[column], parameters, types2, options)
        ).join(",") + ")"
      ).join(",");
    }
    function values(first, rest, parameters, types2, options) {
      const multi = Array.isArray(first[0]);
      const columns = rest.length ? rest.flat() : Object.keys(multi ? first[0] : first);
      return valuesBuilder(multi ? first : [first], parameters, types2, columns, options);
    }
    function select(first, rest, parameters, types2, options) {
      typeof first === "string" && (first = [first].concat(rest));
      if (Array.isArray(first))
        return escapeIdentifiers(first, options);
      let value;
      const columns = rest.length ? rest.flat() : Object.keys(first);
      return columns.map((x) => {
        value = first[x];
        return (value instanceof Query ? fragment(value, parameters, types2, options) : value instanceof Identifier ? value.value : handleValue(value, parameters, types2, options)) + " as " + escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x);
      }).join(",");
    }
    var builders = Object.entries({
      values,
      in: (...xs) => {
        const x = values(...xs);
        return x === "()" ? "(null)" : x;
      },
      select,
      as: select,
      returning: select,
      "\\(": select,
      update(first, rest, parameters, types2, options) {
        return (rest.length ? rest.flat() : Object.keys(first)).map(
          (x) => escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x) + "=" + stringifyValue("values", first[x], parameters, types2, options)
        );
      },
      insert(first, rest, parameters, types2, options) {
        const columns = rest.length ? rest.flat() : Object.keys(Array.isArray(first) ? first[0] : first);
        return "(" + escapeIdentifiers(columns, options) + ")values" + valuesBuilder(Array.isArray(first) ? first : [first], parameters, types2, columns, options);
      }
    }).map(([x, fn]) => [new RegExp("((?:^|[\\s(])" + x + "(?:$|[\\s(]))(?![\\s\\S]*\\1)", "i"), fn]);
    function notTagged() {
      throw Errors.generic("NOT_TAGGED_CALL", "Query not called as a tagged template literal");
    }
    var serializers = module2.exports.serializers = defaultHandlers.serializers;
    var parsers = module2.exports.parsers = defaultHandlers.parsers;
    var END = module2.exports.END = {};
    function firstIsString(x) {
      if (Array.isArray(x))
        return firstIsString(x[0]);
      return typeof x === "string" ? 1009 : 0;
    }
    var mergeUserTypes = module2.exports.mergeUserTypes = function(types2) {
      const user = typeHandlers(types2 || {});
      return {
        serializers: Object.assign({}, serializers, user.serializers),
        parsers: Object.assign({}, parsers, user.parsers)
      };
    };
    function typeHandlers(types2) {
      return Object.keys(types2).reduce((acc, k) => {
        types2[k].from && [].concat(types2[k].from).forEach((x) => acc.parsers[x] = types2[k].parse);
        if (types2[k].serialize) {
          acc.serializers[types2[k].to] = types2[k].serialize;
          types2[k].from && [].concat(types2[k].from).forEach((x) => acc.serializers[x] = types2[k].serialize);
        }
        return acc;
      }, { parsers: {}, serializers: {} });
    }
    function escapeIdentifiers(xs, { transform: { column } }) {
      return xs.map((x) => escapeIdentifier(column.to ? column.to(x) : x)).join(",");
    }
    var escapeIdentifier = module2.exports.escapeIdentifier = function escape(str) {
      return '"' + str.replace(/"/g, '""').replace(/\./g, '"."') + '"';
    };
    var inferType = module2.exports.inferType = function inferType2(x) {
      return x instanceof Parameter ? x.type : x instanceof Date ? 1184 : x instanceof Uint8Array ? 17 : x === true || x === false ? 16 : typeof x === "bigint" ? 20 : Array.isArray(x) ? inferType2(x[0]) : 0;
    };
    var escapeBackslash = /\\/g;
    var escapeQuote = /"/g;
    function arrayEscape(x) {
      return x.replace(escapeBackslash, "\\\\").replace(escapeQuote, '\\"');
    }
    var arraySerializer = module2.exports.arraySerializer = function arraySerializer2(xs, serializer, options, typarray) {
      if (Array.isArray(xs) === false)
        return xs;
      if (!xs.length)
        return "{}";
      const first = xs[0];
      const delimiter = typarray === 1020 ? ";" : ",";
      if (Array.isArray(first) && !first.type)
        return "{" + xs.map((x) => arraySerializer2(x, serializer, options, typarray)).join(delimiter) + "}";
      return "{" + xs.map((x) => {
        if (x === void 0) {
          x = options.transform.undefined;
          if (x === void 0)
            throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
        }
        return x === null ? "null" : '"' + arrayEscape(serializer ? serializer(x.type ? x.value : x) : "" + x) + '"';
      }).join(delimiter) + "}";
    };
    var arrayParserState = {
      i: 0,
      char: null,
      str: "",
      quoted: false,
      last: 0
    };
    var arrayParser = module2.exports.arrayParser = function arrayParser2(x, parser, typarray) {
      arrayParserState.i = arrayParserState.last = 0;
      return arrayParserLoop(arrayParserState, x, parser, typarray);
    };
    function arrayParserLoop(s, x, parser, typarray) {
      const xs = [];
      const delimiter = typarray === 1020 ? ";" : ",";
      for (; s.i < x.length; s.i++) {
        s.char = x[s.i];
        if (s.quoted) {
          if (s.char === "\\") {
            s.str += x[++s.i];
          } else if (s.char === '"') {
            xs.push(parser ? parser(s.str) : s.str);
            s.str = "";
            s.quoted = x[s.i + 1] === '"';
            s.last = s.i + 2;
          } else {
            s.str += s.char;
          }
        } else if (s.char === '"') {
          s.quoted = true;
        } else if (s.char === "{") {
          s.last = ++s.i;
          xs.push(arrayParserLoop(s, x, parser, typarray));
        } else if (s.char === "}") {
          s.quoted = false;
          s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
          s.last = s.i + 1;
          break;
        } else if (s.char === delimiter && s.p !== "}" && s.p !== '"') {
          xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
          s.last = s.i + 1;
        }
        s.p = s.char;
      }
      s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i + 1)) : x.slice(s.last, s.i + 1));
      return xs;
    }
    var toCamel = module2.exports.toCamel = (x) => {
      let str = x[0];
      for (let i = 1; i < x.length; i++)
        str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
      return str;
    };
    var toPascal = module2.exports.toPascal = (x) => {
      let str = x[0].toUpperCase();
      for (let i = 1; i < x.length; i++)
        str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
      return str;
    };
    var toKebab = module2.exports.toKebab = (x) => x.replace(/_/g, "-");
    var fromCamel = module2.exports.fromCamel = (x) => x.replace(/([A-Z])/g, "_$1").toLowerCase();
    var fromPascal = module2.exports.fromPascal = (x) => (x.slice(0, 1) + x.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase();
    var fromKebab = module2.exports.fromKebab = (x) => x.replace(/-/g, "_");
    function createJsonTransform(fn) {
      return function jsonTransform(x, column) {
        return typeof x === "object" && x !== null && (column.type === 114 || column.type === 3802) ? Array.isArray(x) ? x.map((x2) => jsonTransform(x2, column)) : Object.entries(x).reduce((acc, [k, v]) => Object.assign(acc, { [fn(k)]: jsonTransform(v, column) }), {}) : x;
      };
    }
    toCamel.column = { from: toCamel };
    toCamel.value = { from: createJsonTransform(toCamel) };
    fromCamel.column = { to: fromCamel };
    var camel = module2.exports.camel = { ...toCamel };
    camel.column.to = fromCamel;
    toPascal.column = { from: toPascal };
    toPascal.value = { from: createJsonTransform(toPascal) };
    fromPascal.column = { to: fromPascal };
    var pascal = module2.exports.pascal = { ...toPascal };
    pascal.column.to = fromPascal;
    toKebab.column = { from: toKebab };
    toKebab.value = { from: createJsonTransform(toKebab) };
    fromKebab.column = { to: fromKebab };
    var kebab = module2.exports.kebab = { ...toKebab };
    kebab.column.to = fromKebab;
  }
});

// node_modules/postgres/cjs/src/result.js
var require_result = __commonJS({
  "node_modules/postgres/cjs/src/result.js"(exports2, module2) {
    module2.exports = class Result extends Array {
      constructor() {
        super();
        Object.defineProperties(this, {
          count: { value: null, writable: true },
          state: { value: null, writable: true },
          command: { value: null, writable: true },
          columns: { value: null, writable: true },
          statement: { value: null, writable: true }
        });
      }
      static get [Symbol.species]() {
        return Array;
      }
    };
  }
});

// node_modules/postgres/cjs/src/queue.js
var require_queue = __commonJS({
  "node_modules/postgres/cjs/src/queue.js"(exports2, module2) {
    module2.exports = Queue;
    function Queue(initial = []) {
      let xs = initial.slice();
      let index = 0;
      return {
        get length() {
          return xs.length - index;
        },
        remove: (x) => {
          const index2 = xs.indexOf(x);
          return index2 === -1 ? null : (xs.splice(index2, 1), x);
        },
        push: (x) => (xs.push(x), x),
        shift: () => {
          const out = xs[index++];
          if (index === xs.length) {
            index = 0;
            xs = [];
          } else {
            xs[index - 1] = void 0;
          }
          return out;
        }
      };
    }
  }
});

// node_modules/postgres/cjs/src/bytes.js
var require_bytes = __commonJS({
  "node_modules/postgres/cjs/src/bytes.js"(exports2, module2) {
    var size = 256;
    var buffer = Buffer.allocUnsafe(size);
    var messages = "BCcDdEFfHPpQSX".split("").reduce((acc, x) => {
      const v = x.charCodeAt(0);
      acc[x] = () => {
        buffer[0] = v;
        b.i = 5;
        return b;
      };
      return acc;
    }, {});
    var b = Object.assign(reset, messages, {
      N: String.fromCharCode(0),
      i: 0,
      inc(x) {
        b.i += x;
        return b;
      },
      str(x) {
        const length = Buffer.byteLength(x);
        fit(length);
        b.i += buffer.write(x, b.i, length, "utf8");
        return b;
      },
      i16(x) {
        fit(2);
        buffer.writeUInt16BE(x, b.i);
        b.i += 2;
        return b;
      },
      i32(x, i) {
        if (i || i === 0) {
          buffer.writeUInt32BE(x, i);
          return b;
        }
        fit(4);
        buffer.writeUInt32BE(x, b.i);
        b.i += 4;
        return b;
      },
      z(x) {
        fit(x);
        buffer.fill(0, b.i, b.i + x);
        b.i += x;
        return b;
      },
      raw(x) {
        buffer = Buffer.concat([buffer.subarray(0, b.i), x]);
        b.i = buffer.length;
        return b;
      },
      end(at = 1) {
        buffer.writeUInt32BE(b.i - at, at);
        const out = buffer.subarray(0, b.i);
        b.i = 0;
        buffer = Buffer.allocUnsafe(size);
        return out;
      }
    });
    module2.exports = b;
    function fit(x) {
      if (buffer.length - b.i < x) {
        const prev = buffer, length = prev.length;
        buffer = Buffer.allocUnsafe(length + (length >> 1) + x);
        prev.copy(buffer);
      }
    }
    function reset() {
      b.i = 0;
      return b;
    }
  }
});

// node_modules/postgres/cjs/src/connection.js
var require_connection = __commonJS({
  "node_modules/postgres/cjs/src/connection.js"(exports2, module2) {
    var net = require("net");
    var tls = require("tls");
    var crypto2 = require("crypto");
    var Stream = require("stream");
    var { performance } = require("perf_hooks");
    var { stringify, handleValue, arrayParser, arraySerializer } = require_types();
    var { Errors } = require_errors();
    var Result = require_result();
    var Queue = require_queue();
    var { Query, CLOSE } = require_query();
    var b = require_bytes();
    module2.exports = Connection;
    var uid = 1;
    var Sync = b().S().end();
    var Flush = b().H().end();
    var SSLRequest = b().i32(8).i32(80877103).end(8);
    var ExecuteUnnamed = Buffer.concat([b().E().str(b.N).i32(0).end(), Sync]);
    var DescribeUnnamed = b().D().str("S").str(b.N).end();
    var noop = () => {
    };
    var retryRoutines = /* @__PURE__ */ new Set([
      "FetchPreparedStatement",
      "RevalidateCachedQuery",
      "transformAssignedExpr"
    ]);
    var errorFields = {
      83: "severity_local",
      // S
      86: "severity",
      // V
      67: "code",
      // C
      77: "message",
      // M
      68: "detail",
      // D
      72: "hint",
      // H
      80: "position",
      // P
      112: "internal_position",
      // p
      113: "internal_query",
      // q
      87: "where",
      // W
      115: "schema_name",
      // s
      116: "table_name",
      // t
      99: "column_name",
      // c
      100: "data type_name",
      // d
      110: "constraint_name",
      // n
      70: "file",
      // F
      76: "line",
      // L
      82: "routine"
      // R
    };
    function Connection(options, queues = {}, { onopen = noop, onend = noop, onclose = noop } = {}) {
      const {
        sslnegotiation,
        ssl,
        max,
        user,
        host,
        port,
        database,
        parsers,
        transform,
        onnotice,
        onnotify,
        onparameter,
        max_pipeline,
        keep_alive,
        backoff,
        target_session_attrs
      } = options;
      const sent = Queue(), id = uid++, backend = { pid: null, secret: null }, idleTimer = timer(end, options.idle_timeout), lifeTimer = timer(end, options.max_lifetime), connectTimer = timer(connectTimedOut, options.connect_timeout);
      let socket = null, cancelMessage, errorResponse = null, result = new Result(), incoming = Buffer.alloc(0), needsTypes = options.fetch_types, backendParameters = {}, statements = {}, statementId = Math.random().toString(36).slice(2), statementCount = 1, closedTime = 0, remaining = 0, hostIndex = 0, retries = 0, length = 0, delay = 0, rows = 0, serverSignature = null, nextWriteTimer = null, terminated = false, incomings = null, results = null, initial = null, ending = null, stream = null, chunk = null, ended = null, nonce = null, query = null, final = null;
      const connection = {
        queue: queues.closed,
        idleTimer,
        connect(query2) {
          initial = query2;
          reconnect();
        },
        terminate,
        execute,
        cancel,
        end,
        count: 0,
        id
      };
      queues.closed && queues.closed.push(connection);
      return connection;
      async function createSocket() {
        let x;
        try {
          x = options.socket ? await Promise.resolve(options.socket(options)) : new net.Socket();
        } catch (e) {
          error(e);
          return;
        }
        x.on("error", error);
        x.on("close", closed);
        x.on("drain", drain);
        return x;
      }
      async function cancel({ pid, secret }, resolve, reject) {
        try {
          cancelMessage = b().i32(16).i32(80877102).i32(pid).i32(secret).end(16);
          await connect();
          socket.once("error", reject);
          socket.once("close", resolve);
        } catch (error2) {
          reject(error2);
        }
      }
      function execute(q) {
        if (terminated)
          return queryError(q, Errors.connection("CONNECTION_DESTROYED", options));
        if (stream)
          return queryError(q, Errors.generic("COPY_IN_PROGRESS", "You cannot execute queries during copy"));
        if (q.cancelled)
          return;
        try {
          q.state = backend;
          query ? sent.push(q) : (query = q, query.active = true);
          build(q);
          return write(toBuffer(q)) && !q.describeFirst && !q.cursorFn && sent.length < max_pipeline && (!q.options.onexecute || q.options.onexecute(connection));
        } catch (error2) {
          sent.length === 0 && write(Sync);
          errored(error2);
          return true;
        }
      }
      function toBuffer(q) {
        if (q.parameters.length >= 65534)
          throw Errors.generic("MAX_PARAMETERS_EXCEEDED", "Max number of parameters (65534) exceeded");
        return q.options.simple ? b().Q().str(q.statement.string + b.N).end() : q.describeFirst ? Buffer.concat([describe(q), Flush]) : q.prepare ? q.prepared ? prepared(q) : Buffer.concat([describe(q), prepared(q)]) : unnamed(q);
      }
      function describe(q) {
        return Buffer.concat([
          Parse(q.statement.string, q.parameters, q.statement.types, q.statement.name),
          Describe("S", q.statement.name)
        ]);
      }
      function prepared(q) {
        return Buffer.concat([
          Bind(q.parameters, q.statement.types, q.statement.name, q.cursorName),
          q.cursorFn ? Execute("", q.cursorRows) : ExecuteUnnamed
        ]);
      }
      function unnamed(q) {
        return Buffer.concat([
          Parse(q.statement.string, q.parameters, q.statement.types),
          DescribeUnnamed,
          prepared(q)
        ]);
      }
      function build(q) {
        const parameters = [], types = [];
        const string = stringify(q, q.strings[0], q.args[0], parameters, types, options);
        !q.tagged && q.args.forEach((x) => handleValue(x, parameters, types, options));
        q.prepare = options.prepare && ("prepare" in q.options ? q.options.prepare : true);
        q.string = string;
        q.signature = q.prepare && types + string;
        q.onlyDescribe && delete statements[q.signature];
        q.parameters = q.parameters || parameters;
        q.prepared = q.prepare && q.signature in statements;
        q.describeFirst = q.onlyDescribe || parameters.length && !q.prepared;
        q.statement = q.prepared ? statements[q.signature] : { string, types, name: q.prepare ? statementId + statementCount++ : "" };
        typeof options.debug === "function" && options.debug(id, string, parameters, types);
      }
      function write(x, fn) {
        chunk = chunk ? Buffer.concat([chunk, x]) : Buffer.from(x);
        if (fn || chunk.length >= 1024)
          return nextWrite(fn);
        nextWriteTimer === null && (nextWriteTimer = setImmediate(nextWrite));
        return true;
      }
      function nextWrite(fn) {
        const x = socket.write(chunk, fn);
        nextWriteTimer !== null && clearImmediate(nextWriteTimer);
        chunk = nextWriteTimer = null;
        return x;
      }
      function connectTimedOut() {
        errored(Errors.connection("CONNECT_TIMEOUT", options, socket));
        socket.destroy();
      }
      async function secure() {
        if (sslnegotiation !== "direct") {
          write(SSLRequest);
          const canSSL = await new Promise((r) => socket.once("data", (x) => r(x[0] === 83)));
          if (!canSSL && ssl === "prefer")
            return connected();
        }
        const options2 = {
          socket,
          servername: net.isIP(socket.host) ? void 0 : socket.host
        };
        if (sslnegotiation === "direct")
          options2.ALPNProtocols = ["postgresql"];
        if (ssl === "require" || ssl === "allow" || ssl === "prefer")
          options2.rejectUnauthorized = false;
        else if (typeof ssl === "object")
          Object.assign(options2, ssl);
        socket.removeAllListeners();
        socket = tls.connect(options2);
        socket.on("secureConnect", connected);
        socket.on("error", error);
        socket.on("close", closed);
        socket.on("drain", drain);
      }
      function drain() {
        !query && onopen(connection);
      }
      function data(x) {
        if (incomings) {
          incomings.push(x);
          remaining -= x.length;
          if (remaining > 0)
            return;
        }
        incoming = incomings ? Buffer.concat(incomings, length - remaining) : incoming.length === 0 ? x : Buffer.concat([incoming, x], incoming.length + x.length);
        while (incoming.length > 4) {
          length = incoming.readUInt32BE(1);
          if (length >= incoming.length) {
            remaining = length - incoming.length;
            incomings = [incoming];
            break;
          }
          try {
            handle(incoming.subarray(0, length + 1));
          } catch (e) {
            query && (query.cursorFn || query.describeFirst) && write(Sync);
            errored(e);
          }
          incoming = incoming.subarray(length + 1);
          remaining = 0;
          incomings = null;
        }
      }
      async function connect() {
        terminated = false;
        backendParameters = {};
        socket || (socket = await createSocket());
        if (!socket)
          return;
        connectTimer.start();
        if (options.socket)
          return ssl ? secure() : connected();
        socket.on("connect", ssl ? secure : connected);
        if (options.path)
          return socket.connect(options.path);
        socket.ssl = ssl;
        socket.connect(port[hostIndex], host[hostIndex]);
        socket.host = host[hostIndex];
        socket.port = port[hostIndex];
        hostIndex = (hostIndex + 1) % port.length;
      }
      function reconnect() {
        setTimeout(connect, closedTime ? Math.max(0, closedTime + delay - performance.now()) : 0);
      }
      function connected() {
        try {
          statements = {};
          needsTypes = options.fetch_types;
          statementId = Math.random().toString(36).slice(2);
          statementCount = 1;
          lifeTimer.start();
          socket.on("data", data);
          keep_alive && socket.setKeepAlive && socket.setKeepAlive(true, 1e3 * keep_alive);
          const s = StartupMessage();
          write(s);
        } catch (err) {
          error(err);
        }
      }
      function error(err) {
        if (connection.queue === queues.connecting && options.host[retries + 1])
          return;
        errored(err);
        while (sent.length)
          queryError(sent.shift(), err);
      }
      function errored(err) {
        stream && (stream.destroy(err), stream = null);
        query && queryError(query, err);
        initial && (queryError(initial, err), initial = null);
      }
      function queryError(query2, err) {
        if (query2.reserve)
          return query2.reject(err);
        if (!err || typeof err !== "object")
          err = new Error(err);
        "query" in err || "parameters" in err || Object.defineProperties(err, {
          stack: { value: err.stack + query2.origin.replace(/.*\n/, "\n"), enumerable: options.debug },
          query: { value: query2.string, enumerable: options.debug },
          parameters: { value: query2.parameters, enumerable: options.debug },
          args: { value: query2.args, enumerable: options.debug },
          types: { value: query2.statement && query2.statement.types, enumerable: options.debug }
        });
        query2.reject(err);
      }
      function end() {
        return ending || (!connection.reserved && onend(connection), !connection.reserved && !initial && !query && sent.length === 0 ? (terminate(), new Promise((r) => socket && socket.readyState !== "closed" ? socket.once("close", r) : r())) : ending = new Promise((r) => ended = r));
      }
      function terminate() {
        terminated = true;
        if (stream || query || initial || sent.length)
          error(Errors.connection("CONNECTION_DESTROYED", options));
        clearImmediate(nextWriteTimer);
        if (socket) {
          socket.removeListener("data", data);
          socket.removeListener("connect", connected);
          socket.readyState === "open" && socket.end(b().X().end());
        }
        ended && (ended(), ending = ended = null);
      }
      async function closed(hadError) {
        incoming = Buffer.alloc(0);
        remaining = 0;
        incomings = null;
        clearImmediate(nextWriteTimer);
        socket.removeListener("data", data);
        socket.removeListener("connect", connected);
        idleTimer.cancel();
        lifeTimer.cancel();
        connectTimer.cancel();
        socket.removeAllListeners();
        socket = null;
        if (initial)
          return reconnect();
        !hadError && (query || sent.length) && error(Errors.connection("CONNECTION_CLOSED", options, socket));
        closedTime = performance.now();
        hadError && options.shared.retries++;
        delay = (typeof backoff === "function" ? backoff(options.shared.retries) : backoff) * 1e3;
        onclose(connection, Errors.connection("CONNECTION_CLOSED", options, socket));
      }
      function handle(xs, x = xs[0]) {
        (x === 68 ? DataRow : (
          // D
          x === 100 ? CopyData : (
            // d
            x === 65 ? NotificationResponse : (
              // A
              x === 83 ? ParameterStatus : (
                // S
                x === 90 ? ReadyForQuery : (
                  // Z
                  x === 67 ? CommandComplete : (
                    // C
                    x === 50 ? BindComplete : (
                      // 2
                      x === 49 ? ParseComplete : (
                        // 1
                        x === 116 ? ParameterDescription : (
                          // t
                          x === 84 ? RowDescription : (
                            // T
                            x === 82 ? Authentication : (
                              // R
                              x === 110 ? NoData : (
                                // n
                                x === 75 ? BackendKeyData : (
                                  // K
                                  x === 69 ? ErrorResponse : (
                                    // E
                                    x === 115 ? PortalSuspended : (
                                      // s
                                      x === 51 ? CloseComplete : (
                                        // 3
                                        x === 71 ? CopyInResponse : (
                                          // G
                                          x === 78 ? NoticeResponse : (
                                            // N
                                            x === 72 ? CopyOutResponse : (
                                              // H
                                              x === 99 ? CopyDone : (
                                                // c
                                                x === 73 ? EmptyQueryResponse : (
                                                  // I
                                                  x === 86 ? FunctionCallResponse : (
                                                    // V
                                                    x === 118 ? NegotiateProtocolVersion : (
                                                      // v
                                                      x === 87 ? CopyBothResponse : (
                                                        // W
                                                        /* c8 ignore next */
                                                        UnknownMessage
                                                      )
                                                    )
                                                  )
                                                )
                                              )
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        ))(xs);
      }
      function DataRow(x) {
        let index = 7;
        let length2;
        let column;
        let value;
        const row = query.isRaw ? new Array(query.statement.columns.length) : {};
        for (let i = 0; i < query.statement.columns.length; i++) {
          column = query.statement.columns[i];
          length2 = x.readInt32BE(index);
          index += 4;
          value = length2 === -1 ? null : query.isRaw === true ? x.subarray(index, index += length2) : column.parser === void 0 ? x.toString("utf8", index, index += length2) : column.parser.array === true ? column.parser(x.toString("utf8", index + 1, index += length2)) : column.parser(x.toString("utf8", index, index += length2));
          query.isRaw ? row[i] = query.isRaw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
        }
        query.forEachFn ? query.forEachFn(transform.row.from ? transform.row.from(row) : row, result) : result[rows++] = transform.row.from ? transform.row.from(row) : row;
      }
      function ParameterStatus(x) {
        const [k, v] = x.toString("utf8", 5, x.length - 1).split(b.N);
        backendParameters[k] = v;
        if (options.parameters[k] !== v) {
          options.parameters[k] = v;
          onparameter && onparameter(k, v);
        }
      }
      function ReadyForQuery(x) {
        if (query) {
          if (errorResponse) {
            query.retried ? errored(query.retried) : query.prepared && retryRoutines.has(errorResponse.routine) ? retry(query, errorResponse) : errored(errorResponse);
          } else {
            query.resolve(results || result);
          }
        } else if (errorResponse) {
          errored(errorResponse);
        }
        query = results = errorResponse = null;
        result = new Result();
        connectTimer.cancel();
        if (initial) {
          if (target_session_attrs) {
            if (!backendParameters.in_hot_standby || !backendParameters.default_transaction_read_only)
              return fetchState();
            else if (tryNext(target_session_attrs, backendParameters))
              return terminate();
          }
          if (needsTypes) {
            initial.reserve && (initial = null);
            return fetchArrayTypes();
          }
          initial && !initial.reserve && execute(initial);
          options.shared.retries = retries = 0;
          initial = null;
          return;
        }
        while (sent.length && (query = sent.shift()) && (query.active = true, query.cancelled))
          Connection(options).cancel(query.state, query.cancelled.resolve, query.cancelled.reject);
        if (query)
          return;
        connection.reserved ? !connection.reserved.release && x[5] === 73 ? ending ? terminate() : (connection.reserved = null, onopen(connection)) : connection.reserved() : ending ? terminate() : onopen(connection);
      }
      function CommandComplete(x) {
        rows = 0;
        for (let i = x.length - 1; i > 0; i--) {
          if (x[i] === 32 && x[i + 1] < 58 && result.count === null)
            result.count = +x.toString("utf8", i + 1, x.length - 1);
          if (x[i - 1] >= 65) {
            result.command = x.toString("utf8", 5, i);
            result.state = backend;
            break;
          }
        }
        final && (final(), final = null);
        if (result.command === "BEGIN" && max !== 1 && !connection.reserved)
          return errored(Errors.generic("UNSAFE_TRANSACTION", "Only use sql.begin, sql.reserved or max: 1"));
        if (query.options.simple)
          return BindComplete();
        if (query.cursorFn) {
          result.count && query.cursorFn(result);
          write(Sync);
        }
      }
      function ParseComplete() {
        query.parsing = false;
      }
      function BindComplete() {
        !result.statement && (result.statement = query.statement);
        result.columns = query.statement.columns;
      }
      function ParameterDescription(x) {
        const length2 = x.readUInt16BE(5);
        for (let i = 0; i < length2; ++i)
          !query.statement.types[i] && (query.statement.types[i] = x.readUInt32BE(7 + i * 4));
        query.prepare && (statements[query.signature] = query.statement);
        query.describeFirst && !query.onlyDescribe && (write(prepared(query)), query.describeFirst = false);
      }
      function RowDescription(x) {
        if (result.command) {
          results = results || [result];
          results.push(result = new Result());
          result.count = null;
          query.statement.columns = null;
        }
        const length2 = x.readUInt16BE(5);
        let index = 7;
        let start;
        query.statement.columns = Array(length2);
        for (let i = 0; i < length2; ++i) {
          start = index;
          while (x[index++] !== 0) ;
          const table = x.readUInt32BE(index);
          const number = x.readUInt16BE(index + 4);
          const type = x.readUInt32BE(index + 6);
          query.statement.columns[i] = {
            name: transform.column.from ? transform.column.from(x.toString("utf8", start, index - 1)) : x.toString("utf8", start, index - 1),
            parser: parsers[type],
            table,
            number,
            type
          };
          index += 18;
        }
        result.statement = query.statement;
        if (query.onlyDescribe)
          return query.resolve(query.statement), write(Sync);
      }
      async function Authentication(x, type = x.readUInt32BE(5)) {
        (type === 3 ? AuthenticationCleartextPassword : type === 5 ? AuthenticationMD5Password : type === 10 ? SASL : type === 11 ? SASLContinue : type === 12 ? SASLFinal : type !== 0 ? UnknownAuth : noop)(x, type);
      }
      async function AuthenticationCleartextPassword() {
        const payload = await Pass();
        write(
          b().p().str(payload).z(1).end()
        );
      }
      async function AuthenticationMD5Password(x) {
        const payload = "md5" + await md5(
          Buffer.concat([
            Buffer.from(await md5(await Pass() + user)),
            x.subarray(9)
          ])
        );
        write(
          b().p().str(payload).z(1).end()
        );
      }
      async function SASL() {
        nonce = (await crypto2.randomBytes(18)).toString("base64");
        b().p().str("SCRAM-SHA-256" + b.N);
        const i = b.i;
        write(b.inc(4).str("n,,n=*,r=" + nonce).i32(b.i - i - 4, i).end());
      }
      async function SASLContinue(x) {
        const res = x.toString("utf8", 9).split(",").reduce((acc, x2) => (acc[x2[0]] = x2.slice(2), acc), {});
        const saltedPassword = await crypto2.pbkdf2Sync(
          await Pass(),
          Buffer.from(res.s, "base64"),
          parseInt(res.i),
          32,
          "sha256"
        );
        const clientKey = await hmac(saltedPassword, "Client Key");
        const auth = "n=*,r=" + nonce + ",r=" + res.r + ",s=" + res.s + ",i=" + res.i + ",c=biws,r=" + res.r;
        serverSignature = (await hmac(await hmac(saltedPassword, "Server Key"), auth)).toString("base64");
        const payload = "c=biws,r=" + res.r + ",p=" + xor(
          clientKey,
          Buffer.from(await hmac(await sha256(clientKey), auth))
        ).toString("base64");
        write(
          b().p().str(payload).end()
        );
      }
      function SASLFinal(x) {
        if (x.toString("utf8", 9).split(b.N, 1)[0].slice(2) === serverSignature)
          return;
        errored(Errors.generic("SASL_SIGNATURE_MISMATCH", "The server did not return the correct signature"));
        socket.destroy();
      }
      function Pass() {
        return Promise.resolve(
          typeof options.pass === "function" ? options.pass() : options.pass
        );
      }
      function NoData() {
        result.statement = query.statement;
        result.statement.columns = [];
        if (query.onlyDescribe)
          return query.resolve(query.statement), write(Sync);
      }
      function BackendKeyData(x) {
        backend.pid = x.readUInt32BE(5);
        backend.secret = x.readUInt32BE(9);
      }
      async function fetchArrayTypes() {
        needsTypes = false;
        const types = await new Query([`
      select b.oid, b.typarray
      from pg_catalog.pg_type a
      left join pg_catalog.pg_type b on b.oid = a.typelem
      where a.typcategory = 'A'
      group by b.oid, b.typarray
      order by b.oid
    `], [], execute);
        types.forEach(({ oid, typarray }) => addArrayType(oid, typarray));
      }
      function addArrayType(oid, typarray) {
        if (!!options.parsers[typarray] && !!options.serializers[typarray]) return;
        const parser = options.parsers[oid];
        options.shared.typeArrayMap[oid] = typarray;
        options.parsers[typarray] = (xs) => arrayParser(xs, parser, typarray);
        options.parsers[typarray].array = true;
        options.serializers[typarray] = (xs) => arraySerializer(xs, options.serializers[oid], options, typarray);
      }
      function tryNext(x, xs) {
        return x === "read-write" && xs.default_transaction_read_only === "on" || x === "read-only" && xs.default_transaction_read_only === "off" || x === "primary" && xs.in_hot_standby === "on" || x === "standby" && xs.in_hot_standby === "off" || x === "prefer-standby" && xs.in_hot_standby === "off" && options.host[retries];
      }
      function fetchState() {
        const query2 = new Query([`
      show transaction_read_only;
      select pg_catalog.pg_is_in_recovery()
    `], [], execute, null, { simple: true });
        query2.resolve = ([[a], [b2]]) => {
          backendParameters.default_transaction_read_only = a.transaction_read_only;
          backendParameters.in_hot_standby = b2.pg_is_in_recovery ? "on" : "off";
        };
        query2.execute();
      }
      function ErrorResponse(x) {
        if (query) {
          (query.cursorFn || query.describeFirst) && write(Sync);
          errorResponse = Errors.postgres(parseError(x));
        } else {
          errored(Errors.postgres(parseError(x)));
        }
      }
      function retry(q, error2) {
        delete statements[q.signature];
        q.retried = error2;
        execute(q);
      }
      function NotificationResponse(x) {
        if (!onnotify)
          return;
        let index = 9;
        while (x[index++] !== 0) ;
        onnotify(
          x.toString("utf8", 9, index - 1),
          x.toString("utf8", index, x.length - 1)
        );
      }
      async function PortalSuspended() {
        try {
          const x = await Promise.resolve(query.cursorFn(result));
          rows = 0;
          x === CLOSE ? write(Close(query.portal)) : (result = new Result(), write(Execute("", query.cursorRows)));
        } catch (err) {
          write(Sync);
          query.reject(err);
        }
      }
      function CloseComplete() {
        result.count && query.cursorFn(result);
        query.resolve(result);
      }
      function CopyInResponse() {
        stream = new Stream.Writable({
          autoDestroy: true,
          write(chunk2, encoding, callback) {
            socket.write(b().d().raw(chunk2).end(), callback);
          },
          destroy(error2, callback) {
            callback(error2);
            socket.write(b().f().str(error2 + b.N).end());
            stream = null;
          },
          final(callback) {
            socket.write(b().c().end());
            final = callback;
            stream = null;
          }
        });
        query.resolve(stream);
      }
      function CopyOutResponse() {
        stream = new Stream.Readable({
          read() {
            socket.resume();
          }
        });
        query.resolve(stream);
      }
      function CopyBothResponse() {
        stream = new Stream.Duplex({
          autoDestroy: true,
          read() {
            socket.resume();
          },
          /* c8 ignore next 11 */
          write(chunk2, encoding, callback) {
            socket.write(b().d().raw(chunk2).end(), callback);
          },
          destroy(error2, callback) {
            callback(error2);
            socket.write(b().f().str(error2 + b.N).end());
            stream = null;
          },
          final(callback) {
            socket.write(b().c().end());
            final = callback;
          }
        });
        query.resolve(stream);
      }
      function CopyData(x) {
        stream && (stream.push(x.subarray(5)) || socket.pause());
      }
      function CopyDone() {
        stream && stream.push(null);
        stream = null;
      }
      function NoticeResponse(x) {
        onnotice ? onnotice(parseError(x)) : console.log(parseError(x));
      }
      function EmptyQueryResponse() {
      }
      function FunctionCallResponse() {
        errored(Errors.notSupported("FunctionCallResponse"));
      }
      function NegotiateProtocolVersion() {
        errored(Errors.notSupported("NegotiateProtocolVersion"));
      }
      function UnknownMessage(x) {
        console.error("Postgres.js : Unknown Message:", x[0]);
      }
      function UnknownAuth(x, type) {
        console.error("Postgres.js : Unknown Auth:", type);
      }
      function Bind(parameters, types, statement = "", portal = "") {
        let prev, type;
        b().B().str(portal + b.N).str(statement + b.N).i16(0).i16(parameters.length);
        parameters.forEach((x, i) => {
          if (x === null)
            return b.i32(4294967295);
          type = types[i];
          parameters[i] = x = type in options.serializers ? options.serializers[type](x) : "" + x;
          prev = b.i;
          b.inc(4).str(x).i32(b.i - prev - 4, prev);
        });
        b.i16(0);
        return b.end();
      }
      function Parse(str, parameters, types, name = "") {
        b().P().str(name + b.N).str(str + b.N).i16(parameters.length);
        parameters.forEach((x, i) => b.i32(types[i] || 0));
        return b.end();
      }
      function Describe(x, name = "") {
        return b().D().str(x).str(name + b.N).end();
      }
      function Execute(portal = "", rows2 = 0) {
        return Buffer.concat([
          b().E().str(portal + b.N).i32(rows2).end(),
          Flush
        ]);
      }
      function Close(portal = "") {
        return Buffer.concat([
          b().C().str("P").str(portal + b.N).end(),
          b().S().end()
        ]);
      }
      function StartupMessage() {
        return cancelMessage || b().inc(4).i16(3).z(2).str(
          Object.entries(Object.assign(
            {
              user,
              database,
              client_encoding: "UTF8"
            },
            options.connection
          )).filter(([, v]) => v).map(([k, v]) => k + b.N + v).join(b.N)
        ).z(2).end(0);
      }
    }
    function parseError(x) {
      const error = {};
      let start = 5;
      for (let i = 5; i < x.length - 1; i++) {
        if (x[i] === 0) {
          error[errorFields[x[start]]] = x.toString("utf8", start + 1, i);
          start = i + 1;
        }
      }
      return error;
    }
    function md5(x) {
      return crypto2.createHash("md5").update(x).digest("hex");
    }
    function hmac(key, x) {
      return crypto2.createHmac("sha256", key).update(x).digest();
    }
    function sha256(x) {
      return crypto2.createHash("sha256").update(x).digest();
    }
    function xor(a, b2) {
      const length = Math.max(a.length, b2.length);
      const buffer = Buffer.allocUnsafe(length);
      for (let i = 0; i < length; i++)
        buffer[i] = a[i] ^ b2[i];
      return buffer;
    }
    function timer(fn, seconds) {
      seconds = typeof seconds === "function" ? seconds() : seconds;
      if (!seconds)
        return { cancel: noop, start: noop };
      let timer2;
      return {
        cancel() {
          timer2 && (clearTimeout(timer2), timer2 = null);
        },
        start() {
          timer2 && clearTimeout(timer2);
          timer2 = setTimeout(done, seconds * 1e3, arguments);
        }
      };
      function done(args) {
        fn.apply(null, args);
        timer2 = null;
      }
    }
  }
});

// node_modules/postgres/cjs/src/subscribe.js
var require_subscribe = __commonJS({
  "node_modules/postgres/cjs/src/subscribe.js"(exports2, module2) {
    var noop = () => {
    };
    module2.exports = Subscribe;
    function Subscribe(postgres2, options) {
      const subscribers = /* @__PURE__ */ new Map(), slot = "postgresjs_" + Math.random().toString(36).slice(2), state = {};
      let connection, stream, ended = false;
      const sql = subscribe.sql = postgres2({
        ...options,
        transform: { column: {}, value: {}, row: {} },
        max: 1,
        fetch_types: false,
        idle_timeout: null,
        max_lifetime: null,
        connection: {
          ...options.connection,
          replication: "database"
        },
        onclose: async function() {
          if (ended)
            return;
          stream = null;
          state.pid = state.secret = void 0;
          connected(await init(sql, slot, options.publications));
          subscribers.forEach((event) => event.forEach(({ onsubscribe }) => onsubscribe()));
        },
        no_subscribe: true
      });
      const end = sql.end, close = sql.close;
      sql.end = async () => {
        ended = true;
        stream && await new Promise((r) => (stream.once("close", r), stream.end()));
        return end();
      };
      sql.close = async () => {
        stream && await new Promise((r) => (stream.once("close", r), stream.end()));
        return close();
      };
      return subscribe;
      async function subscribe(event, fn, onsubscribe = noop, onerror = noop) {
        event = parseEvent(event);
        if (!connection)
          connection = init(sql, slot, options.publications);
        const subscriber = { fn, onsubscribe };
        const fns = subscribers.has(event) ? subscribers.get(event).add(subscriber) : subscribers.set(event, /* @__PURE__ */ new Set([subscriber])).get(event);
        const unsubscribe = () => {
          fns.delete(subscriber);
          fns.size === 0 && subscribers.delete(event);
        };
        return connection.then((x) => {
          connected(x);
          onsubscribe();
          stream && stream.on("error", onerror);
          return { unsubscribe, state, sql };
        });
      }
      function connected(x) {
        stream = x.stream;
        state.pid = x.state.pid;
        state.secret = x.state.secret;
      }
      async function init(sql2, slot2, publications) {
        if (!publications)
          throw new Error("Missing publication names");
        const xs = await sql2.unsafe(
          `CREATE_REPLICATION_SLOT ${slot2} TEMPORARY LOGICAL pgoutput NOEXPORT_SNAPSHOT`
        );
        const [x] = xs;
        const stream2 = await sql2.unsafe(
          `START_REPLICATION SLOT ${slot2} LOGICAL ${x.consistent_point} (proto_version '1', publication_names '${publications}')`
        ).writable();
        const state2 = {
          lsn: Buffer.concat(x.consistent_point.split("/").map((x2) => Buffer.from(("00000000" + x2).slice(-8), "hex")))
        };
        stream2.on("data", data);
        stream2.on("error", error);
        stream2.on("close", sql2.close);
        return { stream: stream2, state: xs.state };
        function error(e) {
          console.error("Unexpected error during logical streaming - reconnecting", e);
        }
        function data(x2) {
          if (x2[0] === 119) {
            parse(x2.subarray(25), state2, sql2.options.parsers, handle, options.transform);
          } else if (x2[0] === 107 && x2[17]) {
            state2.lsn = x2.subarray(1, 9);
            pong();
          }
        }
        function handle(a, b) {
          const path2 = b.relation.schema + "." + b.relation.table;
          call("*", a, b);
          call("*:" + path2, a, b);
          b.relation.keys.length && call("*:" + path2 + "=" + b.relation.keys.map((x2) => a[x2.name]), a, b);
          call(b.command, a, b);
          call(b.command + ":" + path2, a, b);
          b.relation.keys.length && call(b.command + ":" + path2 + "=" + b.relation.keys.map((x2) => a[x2.name]), a, b);
        }
        function pong() {
          const x2 = Buffer.alloc(34);
          x2[0] = "r".charCodeAt(0);
          x2.fill(state2.lsn, 1);
          x2.writeBigInt64BE(BigInt(Date.now() - Date.UTC(2e3, 0, 1)) * BigInt(1e3), 25);
          stream2.write(x2);
        }
      }
      function call(x, a, b) {
        subscribers.has(x) && subscribers.get(x).forEach(({ fn }) => fn(a, b, x));
      }
    }
    function Time(x) {
      return new Date(Date.UTC(2e3, 0, 1) + Number(x / BigInt(1e3)));
    }
    function parse(x, state, parsers, handle, transform) {
      const char = (acc, [k, v]) => (acc[k.charCodeAt(0)] = v, acc);
      Object.entries({
        R: (x2) => {
          let i = 1;
          const r = state[x2.readUInt32BE(i)] = {
            schema: x2.toString("utf8", i += 4, i = x2.indexOf(0, i)) || "pg_catalog",
            table: x2.toString("utf8", i + 1, i = x2.indexOf(0, i + 1)),
            columns: Array(x2.readUInt16BE(i += 2)),
            keys: []
          };
          i += 2;
          let columnIndex = 0, column;
          while (i < x2.length) {
            column = r.columns[columnIndex++] = {
              key: x2[i++],
              name: transform.column.from ? transform.column.from(x2.toString("utf8", i, i = x2.indexOf(0, i))) : x2.toString("utf8", i, i = x2.indexOf(0, i)),
              type: x2.readUInt32BE(i += 1),
              parser: parsers[x2.readUInt32BE(i)],
              atttypmod: x2.readUInt32BE(i += 4)
            };
            column.key && r.keys.push(column);
            i += 4;
          }
        },
        Y: () => {
        },
        // Type
        O: () => {
        },
        // Origin
        B: (x2) => {
          state.date = Time(x2.readBigInt64BE(9));
          state.lsn = x2.subarray(1, 9);
        },
        I: (x2) => {
          let i = 1;
          const relation = state[x2.readUInt32BE(i)];
          const { row } = tuples(x2, relation.columns, i += 7, transform);
          handle(row, {
            command: "insert",
            relation
          });
        },
        D: (x2) => {
          let i = 1;
          const relation = state[x2.readUInt32BE(i)];
          i += 4;
          const key = x2[i] === 75;
          handle(
            key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform).row : null,
            {
              command: "delete",
              relation,
              key
            }
          );
        },
        U: (x2) => {
          let i = 1;
          const relation = state[x2.readUInt32BE(i)];
          i += 4;
          const key = x2[i] === 75;
          const xs = key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform) : null;
          xs && (i = xs.i);
          const { row } = tuples(x2, relation.columns, i + 3, transform);
          handle(row, {
            command: "update",
            relation,
            key,
            old: xs && xs.row
          });
        },
        T: () => {
        },
        // Truncate,
        C: () => {
        }
        // Commit
      }).reduce(char, {})[x[0]](x);
    }
    function tuples(x, columns, xi, transform) {
      let type, column, value;
      const row = transform.raw ? new Array(columns.length) : {};
      for (let i = 0; i < columns.length; i++) {
        type = x[xi++];
        column = columns[i];
        value = type === 110 ? null : type === 117 ? void 0 : column.parser === void 0 ? x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)) : column.parser.array === true ? column.parser(x.toString("utf8", xi + 5, xi += 4 + x.readUInt32BE(xi))) : column.parser(x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)));
        transform.raw ? row[i] = transform.raw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
      }
      return { i: xi, row: transform.row.from ? transform.row.from(row) : row };
    }
    function parseEvent(x) {
      const xs = x.match(/^(\*|insert|update|delete)?:?([^.]+?\.?[^=]+)?=?(.+)?/i) || [];
      if (!xs)
        throw new Error("Malformed subscribe pattern: " + x);
      const [, command, path2, key] = xs;
      return (command || "*") + (path2 ? ":" + (path2.indexOf(".") === -1 ? "public." + path2 : path2) : "") + (key ? "=" + key : "");
    }
  }
});

// node_modules/postgres/cjs/src/large.js
var require_large = __commonJS({
  "node_modules/postgres/cjs/src/large.js"(exports2, module2) {
    var Stream = require("stream");
    module2.exports = largeObject;
    function largeObject(sql, oid, mode = 131072 | 262144) {
      return new Promise(async (resolve, reject) => {
        await sql.begin(async (sql2) => {
          let finish;
          !oid && ([{ oid }] = await sql2`select lo_creat(-1) as oid`);
          const [{ fd }] = await sql2`select lo_open(${oid}, ${mode}) as fd`;
          const lo = {
            writable,
            readable,
            close: () => sql2`select lo_close(${fd})`.then(finish),
            tell: () => sql2`select lo_tell64(${fd})`,
            read: (x) => sql2`select loread(${fd}, ${x}) as data`,
            write: (x) => sql2`select lowrite(${fd}, ${x})`,
            truncate: (x) => sql2`select lo_truncate64(${fd}, ${x})`,
            seek: (x, whence = 0) => sql2`select lo_lseek64(${fd}, ${x}, ${whence})`,
            size: () => sql2`
          select
            lo_lseek64(${fd}, location, 0) as position,
            seek.size
          from (
            select
              lo_lseek64($1, 0, 2) as size,
              tell.location
            from (select lo_tell64($1) as location) tell
          ) seek
        `
          };
          resolve(lo);
          return new Promise(async (r) => finish = r);
          async function readable({
            highWaterMark = 2048 * 8,
            start = 0,
            end = Infinity
          } = {}) {
            let max = end - start;
            start && await lo.seek(start);
            return new Stream.Readable({
              highWaterMark,
              async read(size) {
                const l = size > max ? size - max : size;
                max -= size;
                const [{ data }] = await lo.read(l);
                this.push(data);
                if (data.length < size)
                  this.push(null);
              }
            });
          }
          async function writable({
            highWaterMark = 2048 * 8,
            start = 0
          } = {}) {
            start && await lo.seek(start);
            return new Stream.Writable({
              highWaterMark,
              write(chunk, encoding, callback) {
                lo.write(chunk).then(() => callback(), callback);
              }
            });
          }
        }).catch(reject);
      });
    }
  }
});

// node_modules/postgres/cjs/src/index.js
var require_src = __commonJS({
  "node_modules/postgres/cjs/src/index.js"(exports2, module2) {
    var os = require("os");
    var fs2 = require("fs");
    var {
      mergeUserTypes,
      inferType,
      Parameter,
      Identifier,
      Builder,
      toPascal,
      pascal,
      toCamel,
      camel,
      toKebab,
      kebab,
      fromPascal,
      fromCamel,
      fromKebab
    } = require_types();
    var Connection = require_connection();
    var { Query, CLOSE } = require_query();
    var Queue = require_queue();
    var { Errors, PostgresError } = require_errors();
    var Subscribe = require_subscribe();
    var largeObject = require_large();
    Object.assign(Postgres, {
      PostgresError,
      toPascal,
      pascal,
      toCamel,
      camel,
      toKebab,
      kebab,
      fromPascal,
      fromCamel,
      fromKebab,
      BigInt: {
        to: 20,
        from: [20],
        parse: (x) => BigInt(x),
        // eslint-disable-line
        serialize: (x) => x.toString()
      }
    });
    module2.exports = Postgres;
    function Postgres(a, b) {
      const options = parseOptions(a, b), subscribe = options.no_subscribe || Subscribe(Postgres, { ...options });
      let ending = false;
      const queries = Queue(), connecting = Queue(), reserved = Queue(), closed = Queue(), ended = Queue(), open = Queue(), busy = Queue(), full = Queue(), queues = { connecting, reserved, closed, ended, open, busy, full };
      const connections = [...Array(options.max)].map(() => Connection(options, queues, { onopen, onend, onclose }));
      const sql = Sql(handler);
      Object.assign(sql, {
        get parameters() {
          return options.parameters;
        },
        largeObject: largeObject.bind(null, sql),
        subscribe,
        CLOSE,
        END: CLOSE,
        PostgresError,
        options,
        reserve,
        listen,
        begin,
        close,
        end
      });
      return sql;
      function Sql(handler2) {
        handler2.debug = options.debug;
        Object.entries(options.types).reduce((acc, [name, type]) => {
          acc[name] = (x) => new Parameter(x, type.to);
          return acc;
        }, typed);
        Object.assign(sql2, {
          types: typed,
          typed,
          unsafe,
          notify,
          array,
          json,
          file
        });
        return sql2;
        function typed(value, type) {
          return new Parameter(value, type);
        }
        function sql2(strings, ...args) {
          const query = strings && Array.isArray(strings.raw) ? new Query(strings, args, handler2, cancel) : typeof strings === "string" && !args.length ? new Identifier(options.transform.column.to ? options.transform.column.to(strings) : strings) : new Builder(strings, args);
          return query;
        }
        function unsafe(string, args = [], options2 = {}) {
          arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
          const query = new Query([string], args, handler2, cancel, {
            prepare: false,
            ...options2,
            simple: "simple" in options2 ? options2.simple : args.length === 0
          });
          return query;
        }
        function file(path2, args = [], options2 = {}) {
          arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
          const query = new Query([], args, (query2) => {
            fs2.readFile(path2, "utf8", (err, string) => {
              if (err)
                return query2.reject(err);
              query2.strings = [string];
              handler2(query2);
            });
          }, cancel, {
            ...options2,
            simple: "simple" in options2 ? options2.simple : args.length === 0
          });
          return query;
        }
      }
      async function listen(name, fn, onlisten) {
        const listener = { fn, onlisten };
        const sql2 = listen.sql || (listen.sql = Postgres({
          ...options,
          max: 1,
          idle_timeout: null,
          max_lifetime: null,
          fetch_types: false,
          onclose() {
            Object.entries(listen.channels).forEach(([name2, { listeners }]) => {
              delete listen.channels[name2];
              Promise.all(listeners.map((l) => listen(name2, l.fn, l.onlisten).catch(() => {
              })));
            });
          },
          onnotify(c, x) {
            c in listen.channels && listen.channels[c].listeners.forEach((l) => l.fn(x));
          }
        }));
        const channels = listen.channels || (listen.channels = {}), exists = name in channels;
        if (exists) {
          channels[name].listeners.push(listener);
          const result2 = await channels[name].result;
          listener.onlisten && listener.onlisten();
          return { state: result2.state, unlisten };
        }
        channels[name] = { result: sql2`listen ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`, listeners: [listener] };
        const result = await channels[name].result;
        listener.onlisten && listener.onlisten();
        return { state: result.state, unlisten };
        async function unlisten() {
          if (name in channels === false)
            return;
          channels[name].listeners = channels[name].listeners.filter((x) => x !== listener);
          if (channels[name].listeners.length)
            return;
          delete channels[name];
          return sql2`unlisten ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`;
        }
      }
      async function notify(channel, payload) {
        return await sql`select pg_notify(${channel}, ${"" + payload})`;
      }
      async function reserve() {
        const queue = Queue();
        const c = open.length ? open.shift() : await new Promise((resolve, reject) => {
          const query = { reserve: resolve, reject };
          queries.push(query);
          closed.length && connect(closed.shift(), query);
        });
        move(c, reserved);
        c.reserved = () => queue.length ? c.execute(queue.shift()) : move(c, reserved);
        c.reserved.release = true;
        const sql2 = Sql(handler2);
        sql2.release = () => {
          c.reserved = null;
          onopen(c);
        };
        return sql2;
        function handler2(q) {
          c.queue === full ? queue.push(q) : c.execute(q) || move(c, full);
        }
      }
      async function begin(options2, fn) {
        !fn && (fn = options2, options2 = "");
        const queries2 = Queue();
        let savepoints = 0, connection, prepare = null;
        try {
          await sql.unsafe("begin " + options2.replace(/[^a-z ]/ig, ""), [], { onexecute }).execute();
          return await Promise.race([
            scope(connection, fn),
            new Promise((_, reject) => connection.onclose = reject)
          ]);
        } catch (error) {
          throw error;
        }
        async function scope(c, fn2, name) {
          const sql2 = Sql(handler2);
          sql2.savepoint = savepoint;
          sql2.prepare = (x) => prepare = x.replace(/[^a-z0-9$-_. ]/gi);
          let uncaughtError, result;
          name && await sql2`savepoint ${sql2(name)}`;
          try {
            result = await new Promise((resolve, reject) => {
              const x = fn2(sql2);
              Promise.resolve(Array.isArray(x) ? Promise.all(x) : x).then(resolve, reject);
            });
            if (uncaughtError)
              throw uncaughtError;
          } catch (e) {
            await (name ? sql2`rollback to ${sql2(name)}` : sql2`rollback`);
            throw e instanceof PostgresError && e.code === "25P02" && uncaughtError || e;
          }
          if (!name) {
            prepare ? await sql2`prepare transaction '${sql2.unsafe(prepare)}'` : await sql2`commit`;
          }
          return result;
          function savepoint(name2, fn3) {
            if (name2 && Array.isArray(name2.raw))
              return savepoint((sql3) => sql3.apply(sql3, arguments));
            arguments.length === 1 && (fn3 = name2, name2 = null);
            return scope(c, fn3, "s" + savepoints++ + (name2 ? "_" + name2 : ""));
          }
          function handler2(q) {
            q.catch((e) => uncaughtError || (uncaughtError = e));
            c.queue === full ? queries2.push(q) : c.execute(q) || move(c, full);
          }
        }
        function onexecute(c) {
          connection = c;
          move(c, reserved);
          c.reserved = () => queries2.length ? c.execute(queries2.shift()) : move(c, reserved);
        }
      }
      function move(c, queue) {
        c.queue.remove(c);
        queue.push(c);
        c.queue = queue;
        queue === open ? c.idleTimer.start() : c.idleTimer.cancel();
        return c;
      }
      function json(x) {
        return new Parameter(x, 3802);
      }
      function array(x, type) {
        if (!Array.isArray(x))
          return array(Array.from(arguments));
        return new Parameter(x, type || (x.length ? inferType(x) || 25 : 0), options.shared.typeArrayMap);
      }
      function handler(query) {
        if (ending)
          return query.reject(Errors.connection("CONNECTION_ENDED", options, options));
        if (open.length)
          return go(open.shift(), query);
        if (closed.length)
          return connect(closed.shift(), query);
        busy.length ? go(busy.shift(), query) : queries.push(query);
      }
      function go(c, query) {
        return c.execute(query) ? move(c, busy) : move(c, full);
      }
      function cancel(query) {
        return new Promise((resolve, reject) => {
          query.state ? query.active ? Connection(options).cancel(query.state, resolve, reject) : query.cancelled = { resolve, reject } : (queries.remove(query), query.cancelled = true, query.reject(Errors.generic("57014", "canceling statement due to user request")), resolve());
        });
      }
      async function end({ timeout = null } = {}) {
        if (ending)
          return ending;
        await 1;
        let timer;
        return ending = Promise.race([
          new Promise((r) => timeout !== null && (timer = setTimeout(destroy, timeout * 1e3, r))),
          Promise.all(connections.map((c) => c.end()).concat(
            listen.sql ? listen.sql.end({ timeout: 0 }) : [],
            subscribe.sql ? subscribe.sql.end({ timeout: 0 }) : []
          ))
        ]).then(() => clearTimeout(timer));
      }
      async function close() {
        await Promise.all(connections.map((c) => c.end()));
      }
      async function destroy(resolve) {
        await Promise.all(connections.map((c) => c.terminate()));
        while (queries.length)
          queries.shift().reject(Errors.connection("CONNECTION_DESTROYED", options));
        resolve();
      }
      function connect(c, query) {
        move(c, connecting);
        c.connect(query);
        return c;
      }
      function onend(c) {
        move(c, ended);
      }
      function onopen(c) {
        if (queries.length === 0)
          return move(c, open);
        let max = Math.ceil(queries.length / (connecting.length + 1)), ready = true;
        while (ready && queries.length && max-- > 0) {
          const query = queries.shift();
          if (query.reserve)
            return query.reserve(c);
          ready = c.execute(query);
        }
        ready ? move(c, busy) : move(c, full);
      }
      function onclose(c, e) {
        move(c, closed);
        c.reserved = null;
        c.onclose && (c.onclose(e), c.onclose = null);
        options.onclose && options.onclose(c.id);
        queries.length && connect(c, queries.shift());
      }
    }
    function parseOptions(a, b) {
      if (a && a.shared)
        return a;
      const env = process.env, o = (!a || typeof a === "string" ? b : a) || {}, { url, multihost } = parseUrl(a), query = [...url.searchParams].reduce((a2, [b2, c]) => (a2[b2] = c, a2), {}), host = o.hostname || o.host || multihost || url.hostname || env.PGHOST || "localhost", port = o.port || url.port || env.PGPORT || 5432, user = o.user || o.username || url.username || env.PGUSERNAME || env.PGUSER || osUsername();
      o.no_prepare && (o.prepare = false);
      query.sslmode && (query.ssl = query.sslmode, delete query.sslmode);
      "timeout" in o && (console.log("The timeout option is deprecated, use idle_timeout instead"), o.idle_timeout = o.timeout);
      query.sslrootcert === "system" && (query.ssl = "verify-full");
      const ints = ["idle_timeout", "connect_timeout", "max_lifetime", "max_pipeline", "backoff", "keep_alive"];
      const defaults = {
        max: globalThis.Cloudflare ? 3 : 10,
        ssl: false,
        sslnegotiation: null,
        idle_timeout: null,
        connect_timeout: 30,
        max_lifetime,
        max_pipeline: 100,
        backoff,
        keep_alive: 60,
        prepare: true,
        debug: false,
        fetch_types: true,
        publications: "alltables",
        target_session_attrs: null
      };
      return {
        host: Array.isArray(host) ? host : host.split(",").map((x) => x.split(":")[0]),
        port: Array.isArray(port) ? port : host.split(",").map((x) => parseInt(x.split(":")[1] || port)),
        path: o.path || host.indexOf("/") > -1 && host + "/.s.PGSQL." + port,
        database: o.database || o.db || (url.pathname || "").slice(1) || env.PGDATABASE || user,
        user,
        pass: o.pass || o.password || url.password || env.PGPASSWORD || "",
        ...Object.entries(defaults).reduce(
          (acc, [k, d]) => {
            const value = k in o ? o[k] : k in query ? query[k] === "disable" || query[k] === "false" ? false : query[k] : env["PG" + k.toUpperCase()] || d;
            acc[k] = typeof value === "string" && ints.includes(k) ? +value : value;
            return acc;
          },
          {}
        ),
        connection: {
          application_name: env.PGAPPNAME || "postgres.js",
          ...o.connection,
          ...Object.entries(query).reduce((acc, [k, v]) => (k in defaults || (acc[k] = v), acc), {})
        },
        types: o.types || {},
        target_session_attrs: tsa(o, url, env),
        onnotice: o.onnotice,
        onnotify: o.onnotify,
        onclose: o.onclose,
        onparameter: o.onparameter,
        socket: o.socket,
        transform: parseTransform(o.transform || { undefined: void 0 }),
        parameters: {},
        shared: { retries: 0, typeArrayMap: {} },
        ...mergeUserTypes(o.types)
      };
    }
    function tsa(o, url, env) {
      const x = o.target_session_attrs || url.searchParams.get("target_session_attrs") || env.PGTARGETSESSIONATTRS;
      if (!x || ["read-write", "read-only", "primary", "standby", "prefer-standby"].includes(x))
        return x;
      throw new Error("target_session_attrs " + x + " is not supported");
    }
    function backoff(retries) {
      return (0.5 + Math.random() / 2) * Math.min(3 ** retries / 100, 20);
    }
    function max_lifetime() {
      return 60 * (30 + Math.random() * 30);
    }
    function parseTransform(x) {
      return {
        undefined: x.undefined,
        column: {
          from: typeof x.column === "function" ? x.column : x.column && x.column.from,
          to: x.column && x.column.to
        },
        value: {
          from: typeof x.value === "function" ? x.value : x.value && x.value.from,
          to: x.value && x.value.to
        },
        row: {
          from: typeof x.row === "function" ? x.row : x.row && x.row.from,
          to: x.row && x.row.to
        }
      };
    }
    function parseUrl(url) {
      if (!url || typeof url !== "string")
        return { url: { searchParams: /* @__PURE__ */ new Map() } };
      let host = url;
      host = host.slice(host.indexOf("://") + 3).split(/[?/]/)[0];
      host = decodeURIComponent(host.slice(host.indexOf("@") + 1));
      const urlObj = new URL(url.replace(host, host.split(",")[0]));
      return {
        url: {
          username: decodeURIComponent(urlObj.username),
          password: decodeURIComponent(urlObj.password),
          host: urlObj.host,
          hostname: urlObj.hostname,
          port: urlObj.port,
          pathname: urlObj.pathname,
          searchParams: urlObj.searchParams
        },
        multihost: host.indexOf(",") > -1 && host
      };
    }
    function osUsername() {
      try {
        return os.userInfo().username;
      } catch (_) {
        return process.env.USERNAME || process.env.USER || process.env.LOGNAME;
      }
    }
  }
});

// node_modules/drizzle-orm/entity.cjs
var require_entity = __commonJS({
  "node_modules/drizzle-orm/entity.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var entity_exports = {};
    __export(entity_exports, {
      entityKind: () => entityKind,
      hasOwnEntityKind: () => hasOwnEntityKind,
      is: () => is
    });
    module2.exports = __toCommonJS(entity_exports);
    var entityKind = /* @__PURE__ */ Symbol.for("drizzle:entityKind");
    var hasOwnEntityKind = /* @__PURE__ */ Symbol.for("drizzle:hasOwnEntityKind");
    function is(value, type) {
      if (!value || typeof value !== "object") {
        return false;
      }
      if (value instanceof type) {
        return true;
      }
      if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
        throw new Error(
          `Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`
        );
      }
      let cls = Object.getPrototypeOf(value).constructor;
      if (cls) {
        while (cls) {
          if (entityKind in cls && cls[entityKind] === type[entityKind]) {
            return true;
          }
          cls = Object.getPrototypeOf(cls);
        }
      }
      return false;
    }
  }
});

// node_modules/drizzle-orm/logger.cjs
var require_logger = __commonJS({
  "node_modules/drizzle-orm/logger.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var logger_exports = {};
    __export(logger_exports, {
      ConsoleLogWriter: () => ConsoleLogWriter,
      DefaultLogger: () => DefaultLogger,
      NoopLogger: () => NoopLogger
    });
    module2.exports = __toCommonJS(logger_exports);
    var import_entity = require_entity();
    var ConsoleLogWriter = class {
      static [import_entity.entityKind] = "ConsoleLogWriter";
      write(message) {
        console.log(message);
      }
    };
    var DefaultLogger = class {
      static [import_entity.entityKind] = "DefaultLogger";
      writer;
      constructor(config) {
        this.writer = config?.writer ?? new ConsoleLogWriter();
      }
      logQuery(query, params) {
        const stringifiedParams = params.map((p) => {
          try {
            return JSON.stringify(p);
          } catch {
            return String(p);
          }
        });
        const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
        this.writer.write(`Query: ${query}${paramsStr}`);
      }
    };
    var NoopLogger = class {
      static [import_entity.entityKind] = "NoopLogger";
      logQuery() {
      }
    };
  }
});

// node_modules/drizzle-orm/query-promise.cjs
var require_query_promise = __commonJS({
  "node_modules/drizzle-orm/query-promise.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_promise_exports = {};
    __export(query_promise_exports, {
      QueryPromise: () => QueryPromise
    });
    module2.exports = __toCommonJS(query_promise_exports);
    var import_entity = require_entity();
    var QueryPromise = class {
      static [import_entity.entityKind] = "QueryPromise";
      [Symbol.toStringTag] = "QueryPromise";
      catch(onRejected) {
        return this.then(void 0, onRejected);
      }
      finally(onFinally) {
        return this.then(
          (value) => {
            onFinally?.();
            return value;
          },
          (reason) => {
            onFinally?.();
            throw reason;
          }
        );
      }
      then(onFulfilled, onRejected) {
        return this.execute().then(onFulfilled, onRejected);
      }
    };
  }
});

// node_modules/drizzle-orm/column.cjs
var require_column = __commonJS({
  "node_modules/drizzle-orm/column.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var column_exports = {};
    __export(column_exports, {
      Column: () => Column
    });
    module2.exports = __toCommonJS(column_exports);
    var import_entity = require_entity();
    var Column = class {
      constructor(table, config) {
        this.table = table;
        this.config = config;
        this.name = config.name;
        this.keyAsName = config.keyAsName;
        this.notNull = config.notNull;
        this.default = config.default;
        this.defaultFn = config.defaultFn;
        this.onUpdateFn = config.onUpdateFn;
        this.hasDefault = config.hasDefault;
        this.primary = config.primaryKey;
        this.isUnique = config.isUnique;
        this.uniqueName = config.uniqueName;
        this.uniqueType = config.uniqueType;
        this.dataType = config.dataType;
        this.columnType = config.columnType;
        this.generated = config.generated;
        this.generatedIdentity = config.generatedIdentity;
      }
      static [import_entity.entityKind] = "Column";
      name;
      keyAsName;
      primary;
      notNull;
      default;
      defaultFn;
      onUpdateFn;
      hasDefault;
      isUnique;
      uniqueName;
      uniqueType;
      dataType;
      columnType;
      enumValues = void 0;
      generated = void 0;
      generatedIdentity = void 0;
      config;
      mapFromDriverValue(value) {
        return value;
      }
      mapToDriverValue(value) {
        return value;
      }
      // ** @internal */
      shouldDisableInsert() {
        return this.config.generated !== void 0 && this.config.generated.type !== "byDefault";
      }
    };
  }
});

// node_modules/drizzle-orm/column-builder.cjs
var require_column_builder = __commonJS({
  "node_modules/drizzle-orm/column-builder.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var column_builder_exports = {};
    __export(column_builder_exports, {
      ColumnBuilder: () => ColumnBuilder
    });
    module2.exports = __toCommonJS(column_builder_exports);
    var import_entity = require_entity();
    var ColumnBuilder = class {
      static [import_entity.entityKind] = "ColumnBuilder";
      config;
      constructor(name, dataType, columnType) {
        this.config = {
          name,
          keyAsName: name === "",
          notNull: false,
          default: void 0,
          hasDefault: false,
          primaryKey: false,
          isUnique: false,
          uniqueName: void 0,
          uniqueType: void 0,
          dataType,
          columnType,
          generated: void 0
        };
      }
      /**
       * Changes the data type of the column. Commonly used with `json` columns. Also, useful for branded types.
       *
       * @example
       * ```ts
       * const users = pgTable('users', {
       * 	id: integer('id').$type<UserId>().primaryKey(),
       * 	details: json('details').$type<UserDetails>().notNull(),
       * });
       * ```
       */
      $type() {
        return this;
      }
      /**
       * Adds a `not null` clause to the column definition.
       *
       * Affects the `select` model of the table - columns *without* `not null` will be nullable on select.
       */
      notNull() {
        this.config.notNull = true;
        return this;
      }
      /**
       * Adds a `default <value>` clause to the column definition.
       *
       * Affects the `insert` model of the table - columns *with* `default` are optional on insert.
       *
       * If you need to set a dynamic default value, use {@link $defaultFn} instead.
       */
      default(value) {
        this.config.default = value;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Adds a dynamic default value to the column.
       * The function will be called when the row is inserted, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $defaultFn(fn) {
        this.config.defaultFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $defaultFn}.
       */
      $default = this.$defaultFn;
      /**
       * Adds a dynamic update value to the column.
       * The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.
       * If no `default` (or `$defaultFn`) value is provided, the function will be called when the row is inserted as well, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $onUpdateFn(fn) {
        this.config.onUpdateFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $onUpdateFn}.
       */
      $onUpdate = this.$onUpdateFn;
      /**
       * Adds a `primary key` clause to the column definition. This implicitly makes the column `not null`.
       *
       * In SQLite, `integer primary key` implicitly makes the column auto-incrementing.
       */
      primaryKey() {
        this.config.primaryKey = true;
        this.config.notNull = true;
        return this;
      }
      /** @internal Sets the name of the column to the key within the table definition if a name was not given. */
      setName(name) {
        if (this.config.name !== "") return;
        this.config.name = name;
      }
    };
  }
});

// node_modules/drizzle-orm/table.utils.cjs
var require_table_utils = __commonJS({
  "node_modules/drizzle-orm/table.utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var table_utils_exports = {};
    __export(table_utils_exports, {
      TableName: () => TableName
    });
    module2.exports = __toCommonJS(table_utils_exports);
    var TableName = /* @__PURE__ */ Symbol.for("drizzle:Name");
  }
});

// node_modules/drizzle-orm/pg-core/foreign-keys.cjs
var require_foreign_keys = __commonJS({
  "node_modules/drizzle-orm/pg-core/foreign-keys.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var foreign_keys_exports = {};
    __export(foreign_keys_exports, {
      ForeignKey: () => ForeignKey,
      ForeignKeyBuilder: () => ForeignKeyBuilder,
      foreignKey: () => foreignKey
    });
    module2.exports = __toCommonJS(foreign_keys_exports);
    var import_entity = require_entity();
    var import_table_utils = require_table_utils();
    var ForeignKeyBuilder = class {
      static [import_entity.entityKind] = "PgForeignKeyBuilder";
      /** @internal */
      reference;
      /** @internal */
      _onUpdate = "no action";
      /** @internal */
      _onDelete = "no action";
      constructor(config, actions) {
        this.reference = () => {
          const { name, columns, foreignColumns } = config();
          return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
        };
        if (actions) {
          this._onUpdate = actions.onUpdate;
          this._onDelete = actions.onDelete;
        }
      }
      onUpdate(action) {
        this._onUpdate = action === void 0 ? "no action" : action;
        return this;
      }
      onDelete(action) {
        this._onDelete = action === void 0 ? "no action" : action;
        return this;
      }
      /** @internal */
      build(table) {
        return new ForeignKey(table, this);
      }
    };
    var ForeignKey = class {
      constructor(table, builder) {
        this.table = table;
        this.reference = builder.reference;
        this.onUpdate = builder._onUpdate;
        this.onDelete = builder._onDelete;
      }
      static [import_entity.entityKind] = "PgForeignKey";
      reference;
      onUpdate;
      onDelete;
      getName() {
        const { name, columns, foreignColumns } = this.reference();
        const columnNames = columns.map((column) => column.name);
        const foreignColumnNames = foreignColumns.map((column) => column.name);
        const chunks = [
          this.table[import_table_utils.TableName],
          ...columnNames,
          foreignColumns[0].table[import_table_utils.TableName],
          ...foreignColumnNames
        ];
        return name ?? `${chunks.join("_")}_fk`;
      }
    };
    function foreignKey(config) {
      function mappedConfig() {
        const { name, columns, foreignColumns } = config;
        return {
          name,
          columns,
          foreignColumns
        };
      }
      return new ForeignKeyBuilder(mappedConfig);
    }
  }
});

// node_modules/drizzle-orm/tracing-utils.cjs
var require_tracing_utils = __commonJS({
  "node_modules/drizzle-orm/tracing-utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var tracing_utils_exports = {};
    __export(tracing_utils_exports, {
      iife: () => iife
    });
    module2.exports = __toCommonJS(tracing_utils_exports);
    function iife(fn, ...args) {
      return fn(...args);
    }
  }
});

// node_modules/drizzle-orm/pg-core/unique-constraint.cjs
var require_unique_constraint = __commonJS({
  "node_modules/drizzle-orm/pg-core/unique-constraint.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var unique_constraint_exports = {};
    __export(unique_constraint_exports, {
      UniqueConstraint: () => UniqueConstraint,
      UniqueConstraintBuilder: () => UniqueConstraintBuilder,
      UniqueOnConstraintBuilder: () => UniqueOnConstraintBuilder,
      unique: () => unique,
      uniqueKeyName: () => uniqueKeyName
    });
    module2.exports = __toCommonJS(unique_constraint_exports);
    var import_entity = require_entity();
    var import_table_utils = require_table_utils();
    function unique(name) {
      return new UniqueOnConstraintBuilder(name);
    }
    function uniqueKeyName(table, columns) {
      return `${table[import_table_utils.TableName]}_${columns.join("_")}_unique`;
    }
    var UniqueConstraintBuilder = class {
      constructor(columns, name) {
        this.name = name;
        this.columns = columns;
      }
      static [import_entity.entityKind] = "PgUniqueConstraintBuilder";
      /** @internal */
      columns;
      /** @internal */
      nullsNotDistinctConfig = false;
      nullsNotDistinct() {
        this.nullsNotDistinctConfig = true;
        return this;
      }
      /** @internal */
      build(table) {
        return new UniqueConstraint(table, this.columns, this.nullsNotDistinctConfig, this.name);
      }
    };
    var UniqueOnConstraintBuilder = class {
      static [import_entity.entityKind] = "PgUniqueOnConstraintBuilder";
      /** @internal */
      name;
      constructor(name) {
        this.name = name;
      }
      on(...columns) {
        return new UniqueConstraintBuilder(columns, this.name);
      }
    };
    var UniqueConstraint = class {
      constructor(table, columns, nullsNotDistinct, name) {
        this.table = table;
        this.columns = columns;
        this.name = name ?? uniqueKeyName(this.table, this.columns.map((column) => column.name));
        this.nullsNotDistinct = nullsNotDistinct;
      }
      static [import_entity.entityKind] = "PgUniqueConstraint";
      columns;
      name;
      nullsNotDistinct = false;
      getName() {
        return this.name;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/utils/array.cjs
var require_array = __commonJS({
  "node_modules/drizzle-orm/pg-core/utils/array.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var array_exports = {};
    __export(array_exports, {
      makePgArray: () => makePgArray,
      parsePgArray: () => parsePgArray,
      parsePgNestedArray: () => parsePgNestedArray
    });
    module2.exports = __toCommonJS(array_exports);
    function parsePgArrayValue(arrayString, startFrom, inQuotes) {
      for (let i = startFrom; i < arrayString.length; i++) {
        const char = arrayString[i];
        if (char === "\\") {
          i++;
          continue;
        }
        if (char === '"') {
          return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
        }
        if (inQuotes) {
          continue;
        }
        if (char === "," || char === "}") {
          return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
        }
      }
      return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
    }
    function parsePgNestedArray(arrayString, startFrom = 0) {
      const result = [];
      let i = startFrom;
      let lastCharIsComma = false;
      while (i < arrayString.length) {
        const char = arrayString[i];
        if (char === ",") {
          if (lastCharIsComma || i === startFrom) {
            result.push("");
          }
          lastCharIsComma = true;
          i++;
          continue;
        }
        lastCharIsComma = false;
        if (char === "\\") {
          i += 2;
          continue;
        }
        if (char === '"') {
          const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
          result.push(value2);
          i = startFrom2;
          continue;
        }
        if (char === "}") {
          return [result, i + 1];
        }
        if (char === "{") {
          const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
          result.push(value2);
          i = startFrom2;
          continue;
        }
        const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
        result.push(value);
        i = newStartFrom;
      }
      return [result, i];
    }
    function parsePgArray(arrayString) {
      const [result] = parsePgNestedArray(arrayString, 1);
      return result;
    }
    function makePgArray(array) {
      return `{${array.map((item) => {
        if (Array.isArray(item)) {
          return makePgArray(item);
        }
        if (typeof item === "string") {
          return `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
        }
        return `${item}`;
      }).join(",")}}`;
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/common.cjs
var require_common = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var common_exports = {};
    __export(common_exports, {
      ExtraConfigColumn: () => ExtraConfigColumn,
      IndexedColumn: () => IndexedColumn,
      PgArray: () => PgArray,
      PgArrayBuilder: () => PgArrayBuilder,
      PgColumn: () => PgColumn,
      PgColumnBuilder: () => PgColumnBuilder
    });
    module2.exports = __toCommonJS(common_exports);
    var import_column_builder = require_column_builder();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_foreign_keys = require_foreign_keys();
    var import_tracing_utils = require_tracing_utils();
    var import_unique_constraint = require_unique_constraint();
    var import_array = require_array();
    var PgColumnBuilder = class extends import_column_builder.ColumnBuilder {
      foreignKeyConfigs = [];
      static [import_entity.entityKind] = "PgColumnBuilder";
      array(size) {
        return new PgArrayBuilder(this.config.name, this, size);
      }
      references(ref, actions = {}) {
        this.foreignKeyConfigs.push({ ref, actions });
        return this;
      }
      unique(name, config) {
        this.config.isUnique = true;
        this.config.uniqueName = name;
        this.config.uniqueType = config?.nulls;
        return this;
      }
      generatedAlwaysAs(as) {
        this.config.generated = {
          as,
          type: "always",
          mode: "stored"
        };
        return this;
      }
      /** @internal */
      buildForeignKeys(column, table) {
        return this.foreignKeyConfigs.map(({ ref, actions }) => {
          return (0, import_tracing_utils.iife)(
            (ref2, actions2) => {
              const builder = new import_foreign_keys.ForeignKeyBuilder(() => {
                const foreignColumn = ref2();
                return { columns: [column], foreignColumns: [foreignColumn] };
              });
              if (actions2.onUpdate) {
                builder.onUpdate(actions2.onUpdate);
              }
              if (actions2.onDelete) {
                builder.onDelete(actions2.onDelete);
              }
              return builder.build(table);
            },
            ref,
            actions
          );
        });
      }
      /** @internal */
      buildExtraConfigColumn(table) {
        return new ExtraConfigColumn(table, this.config);
      }
    };
    var PgColumn = class extends import_column.Column {
      constructor(table, config) {
        if (!config.uniqueName) {
          config.uniqueName = (0, import_unique_constraint.uniqueKeyName)(table, [config.name]);
        }
        super(table, config);
        this.table = table;
      }
      static [import_entity.entityKind] = "PgColumn";
    };
    var ExtraConfigColumn = class extends PgColumn {
      static [import_entity.entityKind] = "ExtraConfigColumn";
      getSQLType() {
        return this.getSQLType();
      }
      indexConfig = {
        order: this.config.order ?? "asc",
        nulls: this.config.nulls ?? "last",
        opClass: this.config.opClass
      };
      defaultConfig = {
        order: "asc",
        nulls: "last",
        opClass: void 0
      };
      asc() {
        this.indexConfig.order = "asc";
        return this;
      }
      desc() {
        this.indexConfig.order = "desc";
        return this;
      }
      nullsFirst() {
        this.indexConfig.nulls = "first";
        return this;
      }
      nullsLast() {
        this.indexConfig.nulls = "last";
        return this;
      }
      /**
       * ### PostgreSQL documentation quote
       *
       * > An operator class with optional parameters can be specified for each column of an index.
       * The operator class identifies the operators to be used by the index for that column.
       * For example, a B-tree index on four-byte integers would use the int4_ops class;
       * this operator class includes comparison functions for four-byte integers.
       * In practice the default operator class for the column's data type is usually sufficient.
       * The main point of having operator classes is that for some data types, there could be more than one meaningful ordering.
       * For example, we might want to sort a complex-number data type either by absolute value or by real part.
       * We could do this by defining two operator classes for the data type and then selecting the proper class when creating an index.
       * More information about operator classes check:
       *
       * ### Useful links
       * https://www.postgresql.org/docs/current/sql-createindex.html
       *
       * https://www.postgresql.org/docs/current/indexes-opclass.html
       *
       * https://www.postgresql.org/docs/current/xindex.html
       *
       * ### Additional types
       * If you have the `pg_vector` extension installed in your database, you can use the
       * `vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`, `halfvec_l2_ops`, `sparsevec_l2_ops` options, which are predefined types.
       *
       * **You can always specify any string you want in the operator class, in case Drizzle doesn't have it natively in its types**
       *
       * @param opClass
       * @returns
       */
      op(opClass) {
        this.indexConfig.opClass = opClass;
        return this;
      }
    };
    var IndexedColumn = class {
      static [import_entity.entityKind] = "IndexedColumn";
      constructor(name, keyAsName, type, indexConfig) {
        this.name = name;
        this.keyAsName = keyAsName;
        this.type = type;
        this.indexConfig = indexConfig;
      }
      name;
      keyAsName;
      type;
      indexConfig;
    };
    var PgArrayBuilder = class extends PgColumnBuilder {
      static [import_entity.entityKind] = "PgArrayBuilder";
      constructor(name, baseBuilder, size) {
        super(name, "array", "PgArray");
        this.config.baseBuilder = baseBuilder;
        this.config.size = size;
      }
      /** @internal */
      build(table) {
        const baseColumn = this.config.baseBuilder.build(table);
        return new PgArray(
          table,
          this.config,
          baseColumn
        );
      }
    };
    var PgArray = class _PgArray extends PgColumn {
      constructor(table, config, baseColumn, range) {
        super(table, config);
        this.baseColumn = baseColumn;
        this.range = range;
        this.size = config.size;
      }
      size;
      static [import_entity.entityKind] = "PgArray";
      getSQLType() {
        return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          value = (0, import_array.parsePgArray)(value);
        }
        return value.map((v) => this.baseColumn.mapFromDriverValue(v));
      }
      mapToDriverValue(value, isNestedArray = false) {
        const a = value.map(
          (v) => v === null ? null : (0, import_entity.is)(this.baseColumn, _PgArray) ? this.baseColumn.mapToDriverValue(v, true) : this.baseColumn.mapToDriverValue(v)
        );
        if (isNestedArray) return a;
        return (0, import_array.makePgArray)(a);
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/columns/enum.cjs
var require_enum = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/enum.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var enum_exports = {};
    __export(enum_exports, {
      PgEnumColumn: () => PgEnumColumn,
      PgEnumColumnBuilder: () => PgEnumColumnBuilder,
      PgEnumObjectColumn: () => PgEnumObjectColumn,
      PgEnumObjectColumnBuilder: () => PgEnumObjectColumnBuilder,
      isPgEnum: () => isPgEnum,
      pgEnum: () => pgEnum,
      pgEnumObjectWithSchema: () => pgEnumObjectWithSchema,
      pgEnumWithSchema: () => pgEnumWithSchema
    });
    module2.exports = __toCommonJS(enum_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgEnumObjectColumnBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgEnumObjectColumnBuilder";
      constructor(name, enumInstance) {
        super(name, "string", "PgEnumObjectColumn");
        this.config.enum = enumInstance;
      }
      /** @internal */
      build(table) {
        return new PgEnumObjectColumn(
          table,
          this.config
        );
      }
    };
    var PgEnumObjectColumn = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgEnumObjectColumn";
      enum;
      enumValues = this.config.enum.enumValues;
      constructor(table, config) {
        super(table, config);
        this.enum = config.enum;
      }
      getSQLType() {
        return this.enum.enumName;
      }
    };
    var isPgEnumSym = /* @__PURE__ */ Symbol.for("drizzle:isPgEnum");
    function isPgEnum(obj) {
      return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
    }
    var PgEnumColumnBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgEnumColumnBuilder";
      constructor(name, enumInstance) {
        super(name, "string", "PgEnumColumn");
        this.config.enum = enumInstance;
      }
      /** @internal */
      build(table) {
        return new PgEnumColumn(
          table,
          this.config
        );
      }
    };
    var PgEnumColumn = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgEnumColumn";
      enum = this.config.enum;
      enumValues = this.config.enum.enumValues;
      constructor(table, config) {
        super(table, config);
        this.enum = config.enum;
      }
      getSQLType() {
        return this.enum.enumName;
      }
    };
    function pgEnum(enumName, input) {
      return Array.isArray(input) ? pgEnumWithSchema(enumName, [...input], void 0) : pgEnumObjectWithSchema(enumName, input, void 0);
    }
    function pgEnumWithSchema(enumName, values, schema) {
      const enumInstance = Object.assign(
        (name) => new PgEnumColumnBuilder(name ?? "", enumInstance),
        {
          enumName,
          enumValues: values,
          schema,
          [isPgEnumSym]: true
        }
      );
      return enumInstance;
    }
    function pgEnumObjectWithSchema(enumName, values, schema) {
      const enumInstance = Object.assign(
        (name) => new PgEnumObjectColumnBuilder(name ?? "", enumInstance),
        {
          enumName,
          enumValues: Object.values(values),
          schema,
          [isPgEnumSym]: true
        }
      );
      return enumInstance;
    }
  }
});

// node_modules/drizzle-orm/subquery.cjs
var require_subquery = __commonJS({
  "node_modules/drizzle-orm/subquery.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var subquery_exports = {};
    __export(subquery_exports, {
      Subquery: () => Subquery,
      WithSubquery: () => WithSubquery
    });
    module2.exports = __toCommonJS(subquery_exports);
    var import_entity = require_entity();
    var Subquery = class {
      static [import_entity.entityKind] = "Subquery";
      constructor(sql, fields, alias, isWith = false, usedTables = []) {
        this._ = {
          brand: "Subquery",
          sql,
          selectedFields: fields,
          alias,
          isWith,
          usedTables
        };
      }
      // getSQL(): SQL<unknown> {
      // 	return new SQL([this]);
      // }
    };
    var WithSubquery = class extends Subquery {
      static [import_entity.entityKind] = "WithSubquery";
    };
  }
});

// node_modules/drizzle-orm/version.cjs
var require_version = __commonJS({
  "node_modules/drizzle-orm/version.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var version_exports = {};
    __export(version_exports, {
      compatibilityVersion: () => compatibilityVersion,
      npmVersion: () => version
    });
    module2.exports = __toCommonJS(version_exports);
    var version = "0.45.2";
    var compatibilityVersion = 10;
  }
});

// node_modules/drizzle-orm/tracing.cjs
var require_tracing = __commonJS({
  "node_modules/drizzle-orm/tracing.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var tracing_exports = {};
    __export(tracing_exports, {
      tracer: () => tracer
    });
    module2.exports = __toCommonJS(tracing_exports);
    var import_tracing_utils = require_tracing_utils();
    var import_version = require_version();
    var otel;
    var rawTracer;
    var tracer = {
      startActiveSpan(name, fn) {
        if (!otel) {
          return fn();
        }
        if (!rawTracer) {
          rawTracer = otel.trace.getTracer("drizzle-orm", import_version.npmVersion);
        }
        return (0, import_tracing_utils.iife)(
          (otel2, rawTracer2) => rawTracer2.startActiveSpan(
            name,
            (span) => {
              try {
                return fn(span);
              } catch (e) {
                span.setStatus({
                  code: otel2.SpanStatusCode.ERROR,
                  message: e instanceof Error ? e.message : "Unknown error"
                  // eslint-disable-line no-instanceof/no-instanceof
                });
                throw e;
              } finally {
                span.end();
              }
            }
          ),
          otel,
          rawTracer
        );
      }
    };
  }
});

// node_modules/drizzle-orm/view-common.cjs
var require_view_common = __commonJS({
  "node_modules/drizzle-orm/view-common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_common_exports = {};
    __export(view_common_exports, {
      ViewBaseConfig: () => ViewBaseConfig
    });
    module2.exports = __toCommonJS(view_common_exports);
    var ViewBaseConfig = /* @__PURE__ */ Symbol.for("drizzle:ViewBaseConfig");
  }
});

// node_modules/drizzle-orm/table.cjs
var require_table = __commonJS({
  "node_modules/drizzle-orm/table.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var table_exports = {};
    __export(table_exports, {
      BaseName: () => BaseName,
      Columns: () => Columns,
      ExtraConfigBuilder: () => ExtraConfigBuilder,
      ExtraConfigColumns: () => ExtraConfigColumns,
      IsAlias: () => IsAlias,
      OriginalName: () => OriginalName,
      Schema: () => Schema,
      Table: () => Table,
      getTableName: () => getTableName,
      getTableUniqueName: () => getTableUniqueName,
      isTable: () => isTable
    });
    module2.exports = __toCommonJS(table_exports);
    var import_entity = require_entity();
    var import_table_utils = require_table_utils();
    var Schema = /* @__PURE__ */ Symbol.for("drizzle:Schema");
    var Columns = /* @__PURE__ */ Symbol.for("drizzle:Columns");
    var ExtraConfigColumns = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigColumns");
    var OriginalName = /* @__PURE__ */ Symbol.for("drizzle:OriginalName");
    var BaseName = /* @__PURE__ */ Symbol.for("drizzle:BaseName");
    var IsAlias = /* @__PURE__ */ Symbol.for("drizzle:IsAlias");
    var ExtraConfigBuilder = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigBuilder");
    var IsDrizzleTable = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleTable");
    var Table = class {
      static [import_entity.entityKind] = "Table";
      /** @internal */
      static Symbol = {
        Name: import_table_utils.TableName,
        Schema,
        OriginalName,
        Columns,
        ExtraConfigColumns,
        BaseName,
        IsAlias,
        ExtraConfigBuilder
      };
      /**
       * @internal
       * Can be changed if the table is aliased.
       */
      [import_table_utils.TableName];
      /**
       * @internal
       * Used to store the original name of the table, before any aliasing.
       */
      [OriginalName];
      /** @internal */
      [Schema];
      /** @internal */
      [Columns];
      /** @internal */
      [ExtraConfigColumns];
      /**
       *  @internal
       * Used to store the table name before the transformation via the `tableCreator` functions.
       */
      [BaseName];
      /** @internal */
      [IsAlias] = false;
      /** @internal */
      [IsDrizzleTable] = true;
      /** @internal */
      [ExtraConfigBuilder] = void 0;
      constructor(name, schema, baseName) {
        this[import_table_utils.TableName] = this[OriginalName] = name;
        this[Schema] = schema;
        this[BaseName] = baseName;
      }
    };
    function isTable(table) {
      return typeof table === "object" && table !== null && IsDrizzleTable in table;
    }
    function getTableName(table) {
      return table[import_table_utils.TableName];
    }
    function getTableUniqueName(table) {
      return `${table[Schema] ?? "public"}.${table[import_table_utils.TableName]}`;
    }
  }
});

// node_modules/drizzle-orm/sql/sql.cjs
var require_sql = __commonJS({
  "node_modules/drizzle-orm/sql/sql.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name2 in all)
        __defProp(target, name2, { get: all[name2], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sql_exports = {};
    __export(sql_exports, {
      FakePrimitiveParam: () => FakePrimitiveParam,
      Name: () => Name,
      Param: () => Param,
      Placeholder: () => Placeholder,
      SQL: () => SQL,
      StringChunk: () => StringChunk,
      View: () => View,
      fillPlaceholders: () => fillPlaceholders,
      getViewName: () => getViewName,
      isDriverValueEncoder: () => isDriverValueEncoder,
      isSQLWrapper: () => isSQLWrapper,
      isView: () => isView,
      name: () => name,
      noopDecoder: () => noopDecoder,
      noopEncoder: () => noopEncoder,
      noopMapper: () => noopMapper,
      param: () => param,
      placeholder: () => placeholder,
      sql: () => sql
    });
    module2.exports = __toCommonJS(sql_exports);
    var import_entity = require_entity();
    var import_enum = require_enum();
    var import_subquery = require_subquery();
    var import_tracing = require_tracing();
    var import_view_common = require_view_common();
    var import_column = require_column();
    var import_table = require_table();
    var FakePrimitiveParam = class {
      static [import_entity.entityKind] = "FakePrimitiveParam";
    };
    function isSQLWrapper(value) {
      return value !== null && value !== void 0 && typeof value.getSQL === "function";
    }
    function mergeQueries(queries) {
      const result = { sql: "", params: [] };
      for (const query of queries) {
        result.sql += query.sql;
        result.params.push(...query.params);
        if (query.typings?.length) {
          if (!result.typings) {
            result.typings = [];
          }
          result.typings.push(...query.typings);
        }
      }
      return result;
    }
    var StringChunk = class {
      static [import_entity.entityKind] = "StringChunk";
      value;
      constructor(value) {
        this.value = Array.isArray(value) ? value : [value];
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    var SQL = class _SQL {
      constructor(queryChunks) {
        this.queryChunks = queryChunks;
        for (const chunk of queryChunks) {
          if ((0, import_entity.is)(chunk, import_table.Table)) {
            const schemaName = chunk[import_table.Table.Symbol.Schema];
            this.usedTables.push(
              schemaName === void 0 ? chunk[import_table.Table.Symbol.Name] : schemaName + "." + chunk[import_table.Table.Symbol.Name]
            );
          }
        }
      }
      static [import_entity.entityKind] = "SQL";
      /** @internal */
      decoder = noopDecoder;
      shouldInlineParams = false;
      /** @internal */
      usedTables = [];
      append(query) {
        this.queryChunks.push(...query.queryChunks);
        return this;
      }
      toQuery(config) {
        return import_tracing.tracer.startActiveSpan("drizzle.buildSQL", (span) => {
          const query = this.buildQueryFromSourceParams(this.queryChunks, config);
          span?.setAttributes({
            "drizzle.query.text": query.sql,
            "drizzle.query.params": JSON.stringify(query.params)
          });
          return query;
        });
      }
      buildQueryFromSourceParams(chunks, _config) {
        const config = Object.assign({}, _config, {
          inlineParams: _config.inlineParams || this.shouldInlineParams,
          paramStartIndex: _config.paramStartIndex || { value: 0 }
        });
        const {
          casing,
          escapeName,
          escapeParam,
          prepareTyping,
          inlineParams,
          paramStartIndex
        } = config;
        return mergeQueries(chunks.map((chunk) => {
          if ((0, import_entity.is)(chunk, StringChunk)) {
            return { sql: chunk.value.join(""), params: [] };
          }
          if ((0, import_entity.is)(chunk, Name)) {
            return { sql: escapeName(chunk.value), params: [] };
          }
          if (chunk === void 0) {
            return { sql: "", params: [] };
          }
          if (Array.isArray(chunk)) {
            const result = [new StringChunk("(")];
            for (const [i, p] of chunk.entries()) {
              result.push(p);
              if (i < chunk.length - 1) {
                result.push(new StringChunk(", "));
              }
            }
            result.push(new StringChunk(")"));
            return this.buildQueryFromSourceParams(result, config);
          }
          if ((0, import_entity.is)(chunk, _SQL)) {
            return this.buildQueryFromSourceParams(chunk.queryChunks, {
              ...config,
              inlineParams: inlineParams || chunk.shouldInlineParams
            });
          }
          if ((0, import_entity.is)(chunk, import_table.Table)) {
            const schemaName = chunk[import_table.Table.Symbol.Schema];
            const tableName = chunk[import_table.Table.Symbol.Name];
            return {
              sql: schemaName === void 0 || chunk[import_table.IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
              params: []
            };
          }
          if ((0, import_entity.is)(chunk, import_column.Column)) {
            const columnName = casing.getColumnCasing(chunk);
            if (_config.invokeSource === "indexes") {
              return { sql: escapeName(columnName), params: [] };
            }
            const schemaName = chunk.table[import_table.Table.Symbol.Schema];
            return {
              sql: chunk.table[import_table.IsAlias] || schemaName === void 0 ? escapeName(chunk.table[import_table.Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[import_table.Table.Symbol.Name]) + "." + escapeName(columnName),
              params: []
            };
          }
          if ((0, import_entity.is)(chunk, View)) {
            const schemaName = chunk[import_view_common.ViewBaseConfig].schema;
            const viewName = chunk[import_view_common.ViewBaseConfig].name;
            return {
              sql: schemaName === void 0 || chunk[import_view_common.ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
              params: []
            };
          }
          if ((0, import_entity.is)(chunk, Param)) {
            if ((0, import_entity.is)(chunk.value, Placeholder)) {
              return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
            }
            const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
            if ((0, import_entity.is)(mappedValue, _SQL)) {
              return this.buildQueryFromSourceParams([mappedValue], config);
            }
            if (inlineParams) {
              return { sql: this.mapInlineParam(mappedValue, config), params: [] };
            }
            let typings = ["none"];
            if (prepareTyping) {
              typings = [prepareTyping(chunk.encoder)];
            }
            return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
          }
          if ((0, import_entity.is)(chunk, Placeholder)) {
            return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
          }
          if ((0, import_entity.is)(chunk, _SQL.Aliased) && chunk.fieldAlias !== void 0) {
            return { sql: escapeName(chunk.fieldAlias), params: [] };
          }
          if ((0, import_entity.is)(chunk, import_subquery.Subquery)) {
            if (chunk._.isWith) {
              return { sql: escapeName(chunk._.alias), params: [] };
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk._.sql,
              new StringChunk(") "),
              new Name(chunk._.alias)
            ], config);
          }
          if ((0, import_enum.isPgEnum)(chunk)) {
            if (chunk.schema) {
              return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
            }
            return { sql: escapeName(chunk.enumName), params: [] };
          }
          if (isSQLWrapper(chunk)) {
            if (chunk.shouldOmitSQLParens?.()) {
              return this.buildQueryFromSourceParams([chunk.getSQL()], config);
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk.getSQL(),
              new StringChunk(")")
            ], config);
          }
          if (inlineParams) {
            return { sql: this.mapInlineParam(chunk, config), params: [] };
          }
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }));
      }
      mapInlineParam(chunk, { escapeString }) {
        if (chunk === null) {
          return "null";
        }
        if (typeof chunk === "number" || typeof chunk === "boolean") {
          return chunk.toString();
        }
        if (typeof chunk === "string") {
          return escapeString(chunk);
        }
        if (typeof chunk === "object") {
          const mappedValueAsString = chunk.toString();
          if (mappedValueAsString === "[object Object]") {
            return escapeString(JSON.stringify(chunk));
          }
          return escapeString(mappedValueAsString);
        }
        throw new Error("Unexpected param value: " + chunk);
      }
      getSQL() {
        return this;
      }
      as(alias) {
        if (alias === void 0) {
          return this;
        }
        return new _SQL.Aliased(this, alias);
      }
      mapWith(decoder) {
        this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
        return this;
      }
      inlineParams() {
        this.shouldInlineParams = true;
        return this;
      }
      /**
       * This method is used to conditionally include a part of the query.
       *
       * @param condition - Condition to check
       * @returns itself if the condition is `true`, otherwise `undefined`
       */
      if(condition) {
        return condition ? this : void 0;
      }
    };
    var Name = class {
      constructor(value) {
        this.value = value;
      }
      static [import_entity.entityKind] = "Name";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    function name(value) {
      return new Name(value);
    }
    function isDriverValueEncoder(value) {
      return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
    }
    var noopDecoder = {
      mapFromDriverValue: (value) => value
    };
    var noopEncoder = {
      mapToDriverValue: (value) => value
    };
    var noopMapper = {
      ...noopDecoder,
      ...noopEncoder
    };
    var Param = class {
      /**
       * @param value - Parameter value
       * @param encoder - Encoder to convert the value to a driver parameter
       */
      constructor(value, encoder = noopEncoder) {
        this.value = value;
        this.encoder = encoder;
      }
      static [import_entity.entityKind] = "Param";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    function param(value, encoder) {
      return new Param(value, encoder);
    }
    function sql(strings, ...params) {
      const queryChunks = [];
      if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
        queryChunks.push(new StringChunk(strings[0]));
      }
      for (const [paramIndex, param2] of params.entries()) {
        queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
      }
      return new SQL(queryChunks);
    }
    ((sql2) => {
      function empty() {
        return new SQL([]);
      }
      sql2.empty = empty;
      function fromList(list) {
        return new SQL(list);
      }
      sql2.fromList = fromList;
      function raw(str) {
        return new SQL([new StringChunk(str)]);
      }
      sql2.raw = raw;
      function join(chunks, separator) {
        const result = [];
        for (const [i, chunk] of chunks.entries()) {
          if (i > 0 && separator !== void 0) {
            result.push(separator);
          }
          result.push(chunk);
        }
        return new SQL(result);
      }
      sql2.join = join;
      function identifier(value) {
        return new Name(value);
      }
      sql2.identifier = identifier;
      function placeholder2(name2) {
        return new Placeholder(name2);
      }
      sql2.placeholder = placeholder2;
      function param2(value, encoder) {
        return new Param(value, encoder);
      }
      sql2.param = param2;
    })(sql || (sql = {}));
    ((SQL2) => {
      class Aliased {
        constructor(sql2, fieldAlias) {
          this.sql = sql2;
          this.fieldAlias = fieldAlias;
        }
        static [import_entity.entityKind] = "SQL.Aliased";
        /** @internal */
        isSelectionField = false;
        getSQL() {
          return this.sql;
        }
        /** @internal */
        clone() {
          return new Aliased(this.sql, this.fieldAlias);
        }
      }
      SQL2.Aliased = Aliased;
    })(SQL || (SQL = {}));
    var Placeholder = class {
      constructor(name2) {
        this.name = name2;
      }
      static [import_entity.entityKind] = "Placeholder";
      getSQL() {
        return new SQL([this]);
      }
    };
    function placeholder(name2) {
      return new Placeholder(name2);
    }
    function fillPlaceholders(params, values) {
      return params.map((p) => {
        if ((0, import_entity.is)(p, Placeholder)) {
          if (!(p.name in values)) {
            throw new Error(`No value for placeholder "${p.name}" was provided`);
          }
          return values[p.name];
        }
        if ((0, import_entity.is)(p, Param) && (0, import_entity.is)(p.value, Placeholder)) {
          if (!(p.value.name in values)) {
            throw new Error(`No value for placeholder "${p.value.name}" was provided`);
          }
          return p.encoder.mapToDriverValue(values[p.value.name]);
        }
        return p;
      });
    }
    var IsDrizzleView = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleView");
    var View = class {
      static [import_entity.entityKind] = "View";
      /** @internal */
      [import_view_common.ViewBaseConfig];
      /** @internal */
      [IsDrizzleView] = true;
      constructor({ name: name2, schema, selectedFields, query }) {
        this[import_view_common.ViewBaseConfig] = {
          name: name2,
          originalName: name2,
          schema,
          selectedFields,
          query,
          isExisting: !query,
          isAlias: false
        };
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    function isView(view) {
      return typeof view === "object" && view !== null && IsDrizzleView in view;
    }
    function getViewName(view) {
      return view[import_view_common.ViewBaseConfig].name;
    }
    import_column.Column.prototype.getSQL = function() {
      return new SQL([this]);
    };
    import_table.Table.prototype.getSQL = function() {
      return new SQL([this]);
    };
    import_subquery.Subquery.prototype.getSQL = function() {
      return new SQL([this]);
    };
  }
});

// node_modules/drizzle-orm/alias.cjs
var require_alias = __commonJS({
  "node_modules/drizzle-orm/alias.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var alias_exports = {};
    __export(alias_exports, {
      ColumnAliasProxyHandler: () => ColumnAliasProxyHandler,
      RelationTableAliasProxyHandler: () => RelationTableAliasProxyHandler,
      TableAliasProxyHandler: () => TableAliasProxyHandler,
      aliasedRelation: () => aliasedRelation,
      aliasedTable: () => aliasedTable,
      aliasedTableColumn: () => aliasedTableColumn,
      mapColumnsInAliasedSQLToAlias: () => mapColumnsInAliasedSQLToAlias,
      mapColumnsInSQLToAlias: () => mapColumnsInSQLToAlias
    });
    module2.exports = __toCommonJS(alias_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_table = require_table();
    var import_view_common = require_view_common();
    var ColumnAliasProxyHandler = class {
      constructor(table) {
        this.table = table;
      }
      static [import_entity.entityKind] = "ColumnAliasProxyHandler";
      get(columnObj, prop) {
        if (prop === "table") {
          return this.table;
        }
        return columnObj[prop];
      }
    };
    var TableAliasProxyHandler = class {
      constructor(alias, replaceOriginalName) {
        this.alias = alias;
        this.replaceOriginalName = replaceOriginalName;
      }
      static [import_entity.entityKind] = "TableAliasProxyHandler";
      get(target, prop) {
        if (prop === import_table.Table.Symbol.IsAlias) {
          return true;
        }
        if (prop === import_table.Table.Symbol.Name) {
          return this.alias;
        }
        if (this.replaceOriginalName && prop === import_table.Table.Symbol.OriginalName) {
          return this.alias;
        }
        if (prop === import_view_common.ViewBaseConfig) {
          return {
            ...target[import_view_common.ViewBaseConfig],
            name: this.alias,
            isAlias: true
          };
        }
        if (prop === import_table.Table.Symbol.Columns) {
          const columns = target[import_table.Table.Symbol.Columns];
          if (!columns) {
            return columns;
          }
          const proxiedColumns = {};
          Object.keys(columns).map((key) => {
            proxiedColumns[key] = new Proxy(
              columns[key],
              new ColumnAliasProxyHandler(new Proxy(target, this))
            );
          });
          return proxiedColumns;
        }
        const value = target[prop];
        if ((0, import_entity.is)(value, import_column.Column)) {
          return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
        }
        return value;
      }
    };
    var RelationTableAliasProxyHandler = class {
      constructor(alias) {
        this.alias = alias;
      }
      static [import_entity.entityKind] = "RelationTableAliasProxyHandler";
      get(target, prop) {
        if (prop === "sourceTable") {
          return aliasedTable(target.sourceTable, this.alias);
        }
        return target[prop];
      }
    };
    function aliasedTable(table, tableAlias) {
      return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
    }
    function aliasedRelation(relation, tableAlias) {
      return new Proxy(relation, new RelationTableAliasProxyHandler(tableAlias));
    }
    function aliasedTableColumn(column, tableAlias) {
      return new Proxy(
        column,
        new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false)))
      );
    }
    function mapColumnsInAliasedSQLToAlias(query, alias) {
      return new import_sql.SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
    }
    function mapColumnsInSQLToAlias(query, alias) {
      return import_sql.sql.join(query.queryChunks.map((c) => {
        if ((0, import_entity.is)(c, import_column.Column)) {
          return aliasedTableColumn(c, alias);
        }
        if ((0, import_entity.is)(c, import_sql.SQL)) {
          return mapColumnsInSQLToAlias(c, alias);
        }
        if ((0, import_entity.is)(c, import_sql.SQL.Aliased)) {
          return mapColumnsInAliasedSQLToAlias(c, alias);
        }
        return c;
      }));
    }
  }
});

// node_modules/drizzle-orm/selection-proxy.cjs
var require_selection_proxy = __commonJS({
  "node_modules/drizzle-orm/selection-proxy.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var selection_proxy_exports = {};
    __export(selection_proxy_exports, {
      SelectionProxyHandler: () => SelectionProxyHandler
    });
    module2.exports = __toCommonJS(selection_proxy_exports);
    var import_alias = require_alias();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_view_common = require_view_common();
    var SelectionProxyHandler = class _SelectionProxyHandler {
      static [import_entity.entityKind] = "SelectionProxyHandler";
      config;
      constructor(config) {
        this.config = { ...config };
      }
      get(subquery, prop) {
        if (prop === "_") {
          return {
            ...subquery["_"],
            selectedFields: new Proxy(
              subquery._.selectedFields,
              this
            )
          };
        }
        if (prop === import_view_common.ViewBaseConfig) {
          return {
            ...subquery[import_view_common.ViewBaseConfig],
            selectedFields: new Proxy(
              subquery[import_view_common.ViewBaseConfig].selectedFields,
              this
            )
          };
        }
        if (typeof prop === "symbol") {
          return subquery[prop];
        }
        const columns = (0, import_entity.is)(subquery, import_subquery.Subquery) ? subquery._.selectedFields : (0, import_entity.is)(subquery, import_sql.View) ? subquery[import_view_common.ViewBaseConfig].selectedFields : subquery;
        const value = columns[prop];
        if ((0, import_entity.is)(value, import_sql.SQL.Aliased)) {
          if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
            return value.sql;
          }
          const newValue = value.clone();
          newValue.isSelectionField = true;
          return newValue;
        }
        if ((0, import_entity.is)(value, import_sql.SQL)) {
          if (this.config.sqlBehavior === "sql") {
            return value;
          }
          throw new Error(
            `You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`
          );
        }
        if ((0, import_entity.is)(value, import_column.Column)) {
          if (this.config.alias) {
            return new Proxy(
              value,
              new import_alias.ColumnAliasProxyHandler(
                new Proxy(
                  value.table,
                  new import_alias.TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false)
                )
              )
            );
          }
          return value;
        }
        if (typeof value !== "object" || value === null) {
          return value;
        }
        return new Proxy(value, new _SelectionProxyHandler(this.config));
      }
    };
  }
});

// node_modules/drizzle-orm/utils.cjs
var require_utils = __commonJS({
  "node_modules/drizzle-orm/utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      applyMixins: () => applyMixins,
      getColumnNameAndConfig: () => getColumnNameAndConfig,
      getTableColumns: () => getTableColumns,
      getTableLikeName: () => getTableLikeName,
      getViewSelectedFields: () => getViewSelectedFields,
      haveSameKeys: () => haveSameKeys,
      isConfig: () => isConfig,
      mapResultRow: () => mapResultRow,
      mapUpdateSet: () => mapUpdateSet,
      orderSelectedFields: () => orderSelectedFields,
      textDecoder: () => textDecoder
    });
    module2.exports = __toCommonJS(utils_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table = require_table();
    var import_view_common = require_view_common();
    function mapResultRow(columns, row, joinsNotNullableMap) {
      const nullifyMap = {};
      const result = columns.reduce(
        (result2, { path: path2, field }, columnIndex) => {
          let decoder;
          if ((0, import_entity.is)(field, import_column.Column)) {
            decoder = field;
          } else if ((0, import_entity.is)(field, import_sql.SQL)) {
            decoder = field.decoder;
          } else if ((0, import_entity.is)(field, import_subquery.Subquery)) {
            decoder = field._.sql.decoder;
          } else {
            decoder = field.sql.decoder;
          }
          let node = result2;
          for (const [pathChunkIndex, pathChunk] of path2.entries()) {
            if (pathChunkIndex < path2.length - 1) {
              if (!(pathChunk in node)) {
                node[pathChunk] = {};
              }
              node = node[pathChunk];
            } else {
              const rawValue = row[columnIndex];
              const value = node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue);
              if (joinsNotNullableMap && (0, import_entity.is)(field, import_column.Column) && path2.length === 2) {
                const objectName = path2[0];
                if (!(objectName in nullifyMap)) {
                  nullifyMap[objectName] = value === null ? (0, import_table.getTableName)(field.table) : false;
                } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== (0, import_table.getTableName)(field.table)) {
                  nullifyMap[objectName] = false;
                }
              }
            }
          }
          return result2;
        },
        {}
      );
      if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
        for (const [objectName, tableName] of Object.entries(nullifyMap)) {
          if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
            result[objectName] = null;
          }
        }
      }
      return result;
    }
    function orderSelectedFields(fields, pathPrefix) {
      return Object.entries(fields).reduce((result, [name, field]) => {
        if (typeof name !== "string") {
          return result;
        }
        const newPath = pathPrefix ? [...pathPrefix, name] : [name];
        if ((0, import_entity.is)(field, import_column.Column) || (0, import_entity.is)(field, import_sql.SQL) || (0, import_entity.is)(field, import_sql.SQL.Aliased) || (0, import_entity.is)(field, import_subquery.Subquery)) {
          result.push({ path: newPath, field });
        } else if ((0, import_entity.is)(field, import_table.Table)) {
          result.push(...orderSelectedFields(field[import_table.Table.Symbol.Columns], newPath));
        } else {
          result.push(...orderSelectedFields(field, newPath));
        }
        return result;
      }, []);
    }
    function haveSameKeys(left, right) {
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      if (leftKeys.length !== rightKeys.length) {
        return false;
      }
      for (const [index, key] of leftKeys.entries()) {
        if (key !== rightKeys[index]) {
          return false;
        }
      }
      return true;
    }
    function mapUpdateSet(table, values) {
      const entries = Object.entries(values).filter(([, value]) => value !== void 0).map(([key, value]) => {
        if ((0, import_entity.is)(value, import_sql.SQL) || (0, import_entity.is)(value, import_column.Column)) {
          return [key, value];
        } else {
          return [key, new import_sql.Param(value, table[import_table.Table.Symbol.Columns][key])];
        }
      });
      if (entries.length === 0) {
        throw new Error("No values to set");
      }
      return Object.fromEntries(entries);
    }
    function applyMixins(baseClass, extendedClasses) {
      for (const extendedClass of extendedClasses) {
        for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
          if (name === "constructor") continue;
          Object.defineProperty(
            baseClass.prototype,
            name,
            Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null)
          );
        }
      }
    }
    function getTableColumns(table) {
      return table[import_table.Table.Symbol.Columns];
    }
    function getViewSelectedFields(view) {
      return view[import_view_common.ViewBaseConfig].selectedFields;
    }
    function getTableLikeName(table) {
      return (0, import_entity.is)(table, import_subquery.Subquery) ? table._.alias : (0, import_entity.is)(table, import_sql.View) ? table[import_view_common.ViewBaseConfig].name : (0, import_entity.is)(table, import_sql.SQL) ? void 0 : table[import_table.Table.Symbol.IsAlias] ? table[import_table.Table.Symbol.Name] : table[import_table.Table.Symbol.BaseName];
    }
    function getColumnNameAndConfig(a, b) {
      return {
        name: typeof a === "string" && a.length > 0 ? a : "",
        config: typeof a === "object" ? a : b
      };
    }
    function isConfig(data) {
      if (typeof data !== "object" || data === null) return false;
      if (data.constructor.name !== "Object") return false;
      if ("logger" in data) {
        const type = typeof data["logger"];
        if (type !== "boolean" && (type !== "object" || typeof data["logger"]["logQuery"] !== "function") && type !== "undefined") return false;
        return true;
      }
      if ("schema" in data) {
        const type = typeof data["schema"];
        if (type !== "object" && type !== "undefined") return false;
        return true;
      }
      if ("casing" in data) {
        const type = typeof data["casing"];
        if (type !== "string" && type !== "undefined") return false;
        return true;
      }
      if ("mode" in data) {
        if (data["mode"] !== "default" || data["mode"] !== "planetscale" || data["mode"] !== void 0) return false;
        return true;
      }
      if ("connection" in data) {
        const type = typeof data["connection"];
        if (type !== "string" && type !== "object" && type !== "undefined") return false;
        return true;
      }
      if ("client" in data) {
        const type = typeof data["client"];
        if (type !== "object" && type !== "function" && type !== "undefined") return false;
        return true;
      }
      if (Object.keys(data).length === 0) return true;
      return false;
    }
    var textDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder();
  }
});

// node_modules/drizzle-orm/pg-core/columns/int.common.cjs
var require_int_common = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/int.common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var int_common_exports = {};
    __export(int_common_exports, {
      PgIntColumnBaseBuilder: () => PgIntColumnBaseBuilder
    });
    module2.exports = __toCommonJS(int_common_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgIntColumnBaseBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgIntColumnBaseBuilder";
      generatedAlwaysAsIdentity(sequence) {
        if (sequence) {
          const { name, ...options } = sequence;
          this.config.generatedIdentity = {
            type: "always",
            sequenceName: name,
            sequenceOptions: options
          };
        } else {
          this.config.generatedIdentity = {
            type: "always"
          };
        }
        this.config.hasDefault = true;
        this.config.notNull = true;
        return this;
      }
      generatedByDefaultAsIdentity(sequence) {
        if (sequence) {
          const { name, ...options } = sequence;
          this.config.generatedIdentity = {
            type: "byDefault",
            sequenceName: name,
            sequenceOptions: options
          };
        } else {
          this.config.generatedIdentity = {
            type: "byDefault"
          };
        }
        this.config.hasDefault = true;
        this.config.notNull = true;
        return this;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/columns/bigint.cjs
var require_bigint = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/bigint.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var bigint_exports = {};
    __export(bigint_exports, {
      PgBigInt53: () => PgBigInt53,
      PgBigInt53Builder: () => PgBigInt53Builder,
      PgBigInt64: () => PgBigInt64,
      PgBigInt64Builder: () => PgBigInt64Builder,
      bigint: () => bigint
    });
    module2.exports = __toCommonJS(bigint_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var import_int_common = require_int_common();
    var PgBigInt53Builder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgBigInt53Builder";
      constructor(name) {
        super(name, "number", "PgBigInt53");
      }
      /** @internal */
      build(table) {
        return new PgBigInt53(table, this.config);
      }
    };
    var PgBigInt53 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigInt53";
      getSQLType() {
        return "bigint";
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") {
          return value;
        }
        return Number(value);
      }
    };
    var PgBigInt64Builder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgBigInt64Builder";
      constructor(name) {
        super(name, "bigint", "PgBigInt64");
      }
      /** @internal */
      build(table) {
        return new PgBigInt64(
          table,
          this.config
        );
      }
    };
    var PgBigInt64 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigInt64";
      getSQLType() {
        return "bigint";
      }
      // eslint-disable-next-line unicorn/prefer-native-coercion-functions
      mapFromDriverValue(value) {
        return BigInt(value);
      }
    };
    function bigint(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config.mode === "number") {
        return new PgBigInt53Builder(name);
      }
      return new PgBigInt64Builder(name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/bigserial.cjs
var require_bigserial = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/bigserial.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var bigserial_exports = {};
    __export(bigserial_exports, {
      PgBigSerial53: () => PgBigSerial53,
      PgBigSerial53Builder: () => PgBigSerial53Builder,
      PgBigSerial64: () => PgBigSerial64,
      PgBigSerial64Builder: () => PgBigSerial64Builder,
      bigserial: () => bigserial
    });
    module2.exports = __toCommonJS(bigserial_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgBigSerial53Builder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBigSerial53Builder";
      constructor(name) {
        super(name, "number", "PgBigSerial53");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgBigSerial53(
          table,
          this.config
        );
      }
    };
    var PgBigSerial53 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigSerial53";
      getSQLType() {
        return "bigserial";
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") {
          return value;
        }
        return Number(value);
      }
    };
    var PgBigSerial64Builder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBigSerial64Builder";
      constructor(name) {
        super(name, "bigint", "PgBigSerial64");
        this.config.hasDefault = true;
      }
      /** @internal */
      build(table) {
        return new PgBigSerial64(
          table,
          this.config
        );
      }
    };
    var PgBigSerial64 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigSerial64";
      getSQLType() {
        return "bigserial";
      }
      // eslint-disable-next-line unicorn/prefer-native-coercion-functions
      mapFromDriverValue(value) {
        return BigInt(value);
      }
    };
    function bigserial(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config.mode === "number") {
        return new PgBigSerial53Builder(name);
      }
      return new PgBigSerial64Builder(name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/boolean.cjs
var require_boolean = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/boolean.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var boolean_exports = {};
    __export(boolean_exports, {
      PgBoolean: () => PgBoolean,
      PgBooleanBuilder: () => PgBooleanBuilder,
      boolean: () => boolean
    });
    module2.exports = __toCommonJS(boolean_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgBooleanBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBooleanBuilder";
      constructor(name) {
        super(name, "boolean", "PgBoolean");
      }
      /** @internal */
      build(table) {
        return new PgBoolean(table, this.config);
      }
    };
    var PgBoolean = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBoolean";
      getSQLType() {
        return "boolean";
      }
    };
    function boolean(name) {
      return new PgBooleanBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/char.cjs
var require_char = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/char.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var char_exports = {};
    __export(char_exports, {
      PgChar: () => PgChar,
      PgCharBuilder: () => PgCharBuilder,
      char: () => char
    });
    module2.exports = __toCommonJS(char_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgCharBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgCharBuilder";
      constructor(name, config) {
        super(name, "string", "PgChar");
        this.config.length = config.length;
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgChar(
          table,
          this.config
        );
      }
    };
    var PgChar = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgChar";
      length = this.config.length;
      enumValues = this.config.enumValues;
      getSQLType() {
        return this.length === void 0 ? `char` : `char(${this.length})`;
      }
    };
    function char(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgCharBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/cidr.cjs
var require_cidr = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/cidr.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var cidr_exports = {};
    __export(cidr_exports, {
      PgCidr: () => PgCidr,
      PgCidrBuilder: () => PgCidrBuilder,
      cidr: () => cidr
    });
    module2.exports = __toCommonJS(cidr_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgCidrBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgCidrBuilder";
      constructor(name) {
        super(name, "string", "PgCidr");
      }
      /** @internal */
      build(table) {
        return new PgCidr(table, this.config);
      }
    };
    var PgCidr = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgCidr";
      getSQLType() {
        return "cidr";
      }
    };
    function cidr(name) {
      return new PgCidrBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/custom.cjs
var require_custom = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/custom.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var custom_exports = {};
    __export(custom_exports, {
      PgCustomColumn: () => PgCustomColumn,
      PgCustomColumnBuilder: () => PgCustomColumnBuilder,
      customType: () => customType
    });
    module2.exports = __toCommonJS(custom_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgCustomColumnBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgCustomColumnBuilder";
      constructor(name, fieldConfig, customTypeParams) {
        super(name, "custom", "PgCustomColumn");
        this.config.fieldConfig = fieldConfig;
        this.config.customTypeParams = customTypeParams;
      }
      /** @internal */
      build(table) {
        return new PgCustomColumn(
          table,
          this.config
        );
      }
    };
    var PgCustomColumn = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgCustomColumn";
      sqlName;
      mapTo;
      mapFrom;
      constructor(table, config) {
        super(table, config);
        this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
        this.mapTo = config.customTypeParams.toDriver;
        this.mapFrom = config.customTypeParams.fromDriver;
      }
      getSQLType() {
        return this.sqlName;
      }
      mapFromDriverValue(value) {
        return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
      }
      mapToDriverValue(value) {
        return typeof this.mapTo === "function" ? this.mapTo(value) : value;
      }
    };
    function customType(customTypeParams) {
      return (a, b) => {
        const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
        return new PgCustomColumnBuilder(name, config, customTypeParams);
      };
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/date.common.cjs
var require_date_common = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/date.common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var date_common_exports = {};
    __export(date_common_exports, {
      PgDateColumnBaseBuilder: () => PgDateColumnBaseBuilder
    });
    module2.exports = __toCommonJS(date_common_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_common = require_common();
    var PgDateColumnBaseBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgDateColumnBaseBuilder";
      defaultNow() {
        return this.default(import_sql.sql`now()`);
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/columns/date.cjs
var require_date = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/date.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var date_exports = {};
    __export(date_exports, {
      PgDate: () => PgDate,
      PgDateBuilder: () => PgDateBuilder,
      PgDateString: () => PgDateString,
      PgDateStringBuilder: () => PgDateStringBuilder,
      date: () => date
    });
    module2.exports = __toCommonJS(date_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var import_date_common = require_date_common();
    var PgDateBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgDateBuilder";
      constructor(name) {
        super(name, "date", "PgDate");
      }
      /** @internal */
      build(table) {
        return new PgDate(table, this.config);
      }
    };
    var PgDate = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgDate";
      getSQLType() {
        return "date";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return new Date(value);
        return value;
      }
      mapToDriverValue(value) {
        return value.toISOString();
      }
    };
    var PgDateStringBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgDateStringBuilder";
      constructor(name) {
        super(name, "string", "PgDateString");
      }
      /** @internal */
      build(table) {
        return new PgDateString(
          table,
          this.config
        );
      }
    };
    var PgDateString = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgDateString";
      getSQLType() {
        return "date";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return value;
        return value.toISOString().slice(0, -14);
      }
    };
    function date(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config?.mode === "date") {
        return new PgDateBuilder(name);
      }
      return new PgDateStringBuilder(name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/double-precision.cjs
var require_double_precision = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/double-precision.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var double_precision_exports = {};
    __export(double_precision_exports, {
      PgDoublePrecision: () => PgDoublePrecision,
      PgDoublePrecisionBuilder: () => PgDoublePrecisionBuilder,
      doublePrecision: () => doublePrecision
    });
    module2.exports = __toCommonJS(double_precision_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgDoublePrecisionBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgDoublePrecisionBuilder";
      constructor(name) {
        super(name, "number", "PgDoublePrecision");
      }
      /** @internal */
      build(table) {
        return new PgDoublePrecision(
          table,
          this.config
        );
      }
    };
    var PgDoublePrecision = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgDoublePrecision";
      getSQLType() {
        return "double precision";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          return Number.parseFloat(value);
        }
        return value;
      }
    };
    function doublePrecision(name) {
      return new PgDoublePrecisionBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/inet.cjs
var require_inet = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/inet.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var inet_exports = {};
    __export(inet_exports, {
      PgInet: () => PgInet,
      PgInetBuilder: () => PgInetBuilder,
      inet: () => inet
    });
    module2.exports = __toCommonJS(inet_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgInetBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgInetBuilder";
      constructor(name) {
        super(name, "string", "PgInet");
      }
      /** @internal */
      build(table) {
        return new PgInet(table, this.config);
      }
    };
    var PgInet = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgInet";
      getSQLType() {
        return "inet";
      }
    };
    function inet(name) {
      return new PgInetBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/integer.cjs
var require_integer = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/integer.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var integer_exports = {};
    __export(integer_exports, {
      PgInteger: () => PgInteger,
      PgIntegerBuilder: () => PgIntegerBuilder,
      integer: () => integer
    });
    module2.exports = __toCommonJS(integer_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var import_int_common = require_int_common();
    var PgIntegerBuilder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgIntegerBuilder";
      constructor(name) {
        super(name, "number", "PgInteger");
      }
      /** @internal */
      build(table) {
        return new PgInteger(table, this.config);
      }
    };
    var PgInteger = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgInteger";
      getSQLType() {
        return "integer";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          return Number.parseInt(value);
        }
        return value;
      }
    };
    function integer(name) {
      return new PgIntegerBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/interval.cjs
var require_interval = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/interval.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var interval_exports = {};
    __export(interval_exports, {
      PgInterval: () => PgInterval,
      PgIntervalBuilder: () => PgIntervalBuilder,
      interval: () => interval
    });
    module2.exports = __toCommonJS(interval_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgIntervalBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgIntervalBuilder";
      constructor(name, intervalConfig) {
        super(name, "string", "PgInterval");
        this.config.intervalConfig = intervalConfig;
      }
      /** @internal */
      build(table) {
        return new PgInterval(table, this.config);
      }
    };
    var PgInterval = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgInterval";
      fields = this.config.intervalConfig.fields;
      precision = this.config.intervalConfig.precision;
      getSQLType() {
        const fields = this.fields ? ` ${this.fields}` : "";
        const precision = this.precision ? `(${this.precision})` : "";
        return `interval${fields}${precision}`;
      }
    };
    function interval(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgIntervalBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/json.cjs
var require_json = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/json.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var json_exports = {};
    __export(json_exports, {
      PgJson: () => PgJson,
      PgJsonBuilder: () => PgJsonBuilder,
      json: () => json
    });
    module2.exports = __toCommonJS(json_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgJsonBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgJsonBuilder";
      constructor(name) {
        super(name, "json", "PgJson");
      }
      /** @internal */
      build(table) {
        return new PgJson(table, this.config);
      }
    };
    var PgJson = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgJson";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "json";
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    };
    function json(name) {
      return new PgJsonBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/jsonb.cjs
var require_jsonb = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/jsonb.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var jsonb_exports = {};
    __export(jsonb_exports, {
      PgJsonb: () => PgJsonb,
      PgJsonbBuilder: () => PgJsonbBuilder,
      jsonb: () => jsonb
    });
    module2.exports = __toCommonJS(jsonb_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgJsonbBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgJsonbBuilder";
      constructor(name) {
        super(name, "json", "PgJsonb");
      }
      /** @internal */
      build(table) {
        return new PgJsonb(table, this.config);
      }
    };
    var PgJsonb = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgJsonb";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "jsonb";
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    };
    function jsonb(name) {
      return new PgJsonbBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/line.cjs
var require_line = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/line.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var line_exports = {};
    __export(line_exports, {
      PgLineABC: () => PgLineABC,
      PgLineABCBuilder: () => PgLineABCBuilder,
      PgLineBuilder: () => PgLineBuilder,
      PgLineTuple: () => PgLineTuple,
      line: () => line
    });
    module2.exports = __toCommonJS(line_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgLineBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgLineBuilder";
      constructor(name) {
        super(name, "array", "PgLine");
      }
      /** @internal */
      build(table) {
        return new PgLineTuple(
          table,
          this.config
        );
      }
    };
    var PgLineTuple = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgLine";
      getSQLType() {
        return "line";
      }
      mapFromDriverValue(value) {
        const [a, b, c] = value.slice(1, -1).split(",");
        return [Number.parseFloat(a), Number.parseFloat(b), Number.parseFloat(c)];
      }
      mapToDriverValue(value) {
        return `{${value[0]},${value[1]},${value[2]}}`;
      }
    };
    var PgLineABCBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgLineABCBuilder";
      constructor(name) {
        super(name, "json", "PgLineABC");
      }
      /** @internal */
      build(table) {
        return new PgLineABC(
          table,
          this.config
        );
      }
    };
    var PgLineABC = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgLineABC";
      getSQLType() {
        return "line";
      }
      mapFromDriverValue(value) {
        const [a, b, c] = value.slice(1, -1).split(",");
        return { a: Number.parseFloat(a), b: Number.parseFloat(b), c: Number.parseFloat(c) };
      }
      mapToDriverValue(value) {
        return `{${value.a},${value.b},${value.c}}`;
      }
    };
    function line(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (!config?.mode || config.mode === "tuple") {
        return new PgLineBuilder(name);
      }
      return new PgLineABCBuilder(name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/macaddr.cjs
var require_macaddr = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/macaddr.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var macaddr_exports = {};
    __export(macaddr_exports, {
      PgMacaddr: () => PgMacaddr,
      PgMacaddrBuilder: () => PgMacaddrBuilder,
      macaddr: () => macaddr
    });
    module2.exports = __toCommonJS(macaddr_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgMacaddrBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgMacaddrBuilder";
      constructor(name) {
        super(name, "string", "PgMacaddr");
      }
      /** @internal */
      build(table) {
        return new PgMacaddr(table, this.config);
      }
    };
    var PgMacaddr = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgMacaddr";
      getSQLType() {
        return "macaddr";
      }
    };
    function macaddr(name) {
      return new PgMacaddrBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/macaddr8.cjs
var require_macaddr8 = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/macaddr8.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var macaddr8_exports = {};
    __export(macaddr8_exports, {
      PgMacaddr8: () => PgMacaddr8,
      PgMacaddr8Builder: () => PgMacaddr8Builder,
      macaddr8: () => macaddr8
    });
    module2.exports = __toCommonJS(macaddr8_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgMacaddr8Builder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgMacaddr8Builder";
      constructor(name) {
        super(name, "string", "PgMacaddr8");
      }
      /** @internal */
      build(table) {
        return new PgMacaddr8(table, this.config);
      }
    };
    var PgMacaddr8 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgMacaddr8";
      getSQLType() {
        return "macaddr8";
      }
    };
    function macaddr8(name) {
      return new PgMacaddr8Builder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/numeric.cjs
var require_numeric = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/numeric.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var numeric_exports = {};
    __export(numeric_exports, {
      PgNumeric: () => PgNumeric,
      PgNumericBigInt: () => PgNumericBigInt,
      PgNumericBigIntBuilder: () => PgNumericBigIntBuilder,
      PgNumericBuilder: () => PgNumericBuilder,
      PgNumericNumber: () => PgNumericNumber,
      PgNumericNumberBuilder: () => PgNumericNumberBuilder,
      decimal: () => decimal,
      numeric: () => numeric
    });
    module2.exports = __toCommonJS(numeric_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgNumericBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgNumericBuilder";
      constructor(name, precision, scale) {
        super(name, "string", "PgNumeric");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumeric(table, this.config);
      }
    };
    var PgNumeric = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgNumeric";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return value;
        return String(value);
      }
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    var PgNumericNumberBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgNumericNumberBuilder";
      constructor(name, precision, scale) {
        super(name, "number", "PgNumericNumber");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumericNumber(
          table,
          this.config
        );
      }
    };
    var PgNumericNumber = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgNumericNumber";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") return value;
        return Number(value);
      }
      mapToDriverValue = String;
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    var PgNumericBigIntBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgNumericBigIntBuilder";
      constructor(name, precision, scale) {
        super(name, "bigint", "PgNumericBigInt");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumericBigInt(
          table,
          this.config
        );
      }
    };
    var PgNumericBigInt = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgNumericBigInt";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue = BigInt;
      mapToDriverValue = String;
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    function numeric(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      const mode = config?.mode;
      return mode === "number" ? new PgNumericNumberBuilder(name, config?.precision, config?.scale) : mode === "bigint" ? new PgNumericBigIntBuilder(name, config?.precision, config?.scale) : new PgNumericBuilder(name, config?.precision, config?.scale);
    }
    var decimal = numeric;
  }
});

// node_modules/drizzle-orm/pg-core/columns/point.cjs
var require_point = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/point.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var point_exports = {};
    __export(point_exports, {
      PgPointObject: () => PgPointObject,
      PgPointObjectBuilder: () => PgPointObjectBuilder,
      PgPointTuple: () => PgPointTuple,
      PgPointTupleBuilder: () => PgPointTupleBuilder,
      point: () => point
    });
    module2.exports = __toCommonJS(point_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgPointTupleBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgPointTupleBuilder";
      constructor(name) {
        super(name, "array", "PgPointTuple");
      }
      /** @internal */
      build(table) {
        return new PgPointTuple(
          table,
          this.config
        );
      }
    };
    var PgPointTuple = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgPointTuple";
      getSQLType() {
        return "point";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          const [x, y] = value.slice(1, -1).split(",");
          return [Number.parseFloat(x), Number.parseFloat(y)];
        }
        return [value.x, value.y];
      }
      mapToDriverValue(value) {
        return `(${value[0]},${value[1]})`;
      }
    };
    var PgPointObjectBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgPointObjectBuilder";
      constructor(name) {
        super(name, "json", "PgPointObject");
      }
      /** @internal */
      build(table) {
        return new PgPointObject(
          table,
          this.config
        );
      }
    };
    var PgPointObject = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgPointObject";
      getSQLType() {
        return "point";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          const [x, y] = value.slice(1, -1).split(",");
          return { x: Number.parseFloat(x), y: Number.parseFloat(y) };
        }
        return value;
      }
      mapToDriverValue(value) {
        return `(${value.x},${value.y})`;
      }
    };
    function point(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (!config?.mode || config.mode === "tuple") {
        return new PgPointTupleBuilder(name);
      }
      return new PgPointObjectBuilder(name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.cjs
var require_utils2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      parseEWKB: () => parseEWKB
    });
    module2.exports = __toCommonJS(utils_exports);
    function hexToBytes(hex) {
      const bytes = [];
      for (let c = 0; c < hex.length; c += 2) {
        bytes.push(Number.parseInt(hex.slice(c, c + 2), 16));
      }
      return new Uint8Array(bytes);
    }
    function bytesToFloat64(bytes, offset) {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, bytes[offset + i]);
      }
      return view.getFloat64(0, true);
    }
    function parseEWKB(hex) {
      const bytes = hexToBytes(hex);
      let offset = 0;
      const byteOrder = bytes[offset];
      offset += 1;
      const view = new DataView(bytes.buffer);
      const geomType = view.getUint32(offset, byteOrder === 1);
      offset += 4;
      let _srid;
      if (geomType & 536870912) {
        _srid = view.getUint32(offset, byteOrder === 1);
        offset += 4;
      }
      if ((geomType & 65535) === 1) {
        const x = bytesToFloat64(bytes, offset);
        offset += 8;
        const y = bytesToFloat64(bytes, offset);
        offset += 8;
        return [x, y];
      }
      throw new Error("Unsupported geometry type");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.cjs
var require_geometry = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var geometry_exports = {};
    __export(geometry_exports, {
      PgGeometry: () => PgGeometry,
      PgGeometryBuilder: () => PgGeometryBuilder,
      PgGeometryObject: () => PgGeometryObject,
      PgGeometryObjectBuilder: () => PgGeometryObjectBuilder,
      geometry: () => geometry
    });
    module2.exports = __toCommonJS(geometry_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var import_utils2 = require_utils2();
    var PgGeometryBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgGeometryBuilder";
      constructor(name) {
        super(name, "array", "PgGeometry");
      }
      /** @internal */
      build(table) {
        return new PgGeometry(
          table,
          this.config
        );
      }
    };
    var PgGeometry = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgGeometry";
      getSQLType() {
        return "geometry(point)";
      }
      mapFromDriverValue(value) {
        return (0, import_utils2.parseEWKB)(value);
      }
      mapToDriverValue(value) {
        return `point(${value[0]} ${value[1]})`;
      }
    };
    var PgGeometryObjectBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgGeometryObjectBuilder";
      constructor(name) {
        super(name, "json", "PgGeometryObject");
      }
      /** @internal */
      build(table) {
        return new PgGeometryObject(
          table,
          this.config
        );
      }
    };
    var PgGeometryObject = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgGeometryObject";
      getSQLType() {
        return "geometry(point)";
      }
      mapFromDriverValue(value) {
        const parsed = (0, import_utils2.parseEWKB)(value);
        return { x: parsed[0], y: parsed[1] };
      }
      mapToDriverValue(value) {
        return `point(${value.x} ${value.y})`;
      }
    };
    function geometry(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (!config?.mode || config.mode === "tuple") {
        return new PgGeometryBuilder(name);
      }
      return new PgGeometryObjectBuilder(name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/real.cjs
var require_real = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/real.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var real_exports = {};
    __export(real_exports, {
      PgReal: () => PgReal,
      PgRealBuilder: () => PgRealBuilder,
      real: () => real
    });
    module2.exports = __toCommonJS(real_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgRealBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgRealBuilder";
      constructor(name, length) {
        super(name, "number", "PgReal");
        this.config.length = length;
      }
      /** @internal */
      build(table) {
        return new PgReal(table, this.config);
      }
    };
    var PgReal = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgReal";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "real";
      }
      mapFromDriverValue = (value) => {
        if (typeof value === "string") {
          return Number.parseFloat(value);
        }
        return value;
      };
    };
    function real(name) {
      return new PgRealBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/serial.cjs
var require_serial = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/serial.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var serial_exports = {};
    __export(serial_exports, {
      PgSerial: () => PgSerial,
      PgSerialBuilder: () => PgSerialBuilder,
      serial: () => serial
    });
    module2.exports = __toCommonJS(serial_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgSerialBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgSerialBuilder";
      constructor(name) {
        super(name, "number", "PgSerial");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgSerial(table, this.config);
      }
    };
    var PgSerial = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSerial";
      getSQLType() {
        return "serial";
      }
    };
    function serial(name) {
      return new PgSerialBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/smallint.cjs
var require_smallint = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/smallint.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var smallint_exports = {};
    __export(smallint_exports, {
      PgSmallInt: () => PgSmallInt,
      PgSmallIntBuilder: () => PgSmallIntBuilder,
      smallint: () => smallint
    });
    module2.exports = __toCommonJS(smallint_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var import_int_common = require_int_common();
    var PgSmallIntBuilder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgSmallIntBuilder";
      constructor(name) {
        super(name, "number", "PgSmallInt");
      }
      /** @internal */
      build(table) {
        return new PgSmallInt(table, this.config);
      }
    };
    var PgSmallInt = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSmallInt";
      getSQLType() {
        return "smallint";
      }
      mapFromDriverValue = (value) => {
        if (typeof value === "string") {
          return Number(value);
        }
        return value;
      };
    };
    function smallint(name) {
      return new PgSmallIntBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/smallserial.cjs
var require_smallserial = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/smallserial.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var smallserial_exports = {};
    __export(smallserial_exports, {
      PgSmallSerial: () => PgSmallSerial,
      PgSmallSerialBuilder: () => PgSmallSerialBuilder,
      smallserial: () => smallserial
    });
    module2.exports = __toCommonJS(smallserial_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgSmallSerialBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgSmallSerialBuilder";
      constructor(name) {
        super(name, "number", "PgSmallSerial");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgSmallSerial(
          table,
          this.config
        );
      }
    };
    var PgSmallSerial = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSmallSerial";
      getSQLType() {
        return "smallserial";
      }
    };
    function smallserial(name) {
      return new PgSmallSerialBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/text.cjs
var require_text = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/text.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var text_exports = {};
    __export(text_exports, {
      PgText: () => PgText,
      PgTextBuilder: () => PgTextBuilder,
      text: () => text
    });
    module2.exports = __toCommonJS(text_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgTextBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgTextBuilder";
      constructor(name, config) {
        super(name, "string", "PgText");
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgText(table, this.config);
      }
    };
    var PgText = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgText";
      enumValues = this.config.enumValues;
      getSQLType() {
        return "text";
      }
    };
    function text(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgTextBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/time.cjs
var require_time = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/time.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var time_exports = {};
    __export(time_exports, {
      PgTime: () => PgTime,
      PgTimeBuilder: () => PgTimeBuilder,
      time: () => time
    });
    module2.exports = __toCommonJS(time_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var import_date_common = require_date_common();
    var PgTimeBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      constructor(name, withTimezone, precision) {
        super(name, "string", "PgTime");
        this.withTimezone = withTimezone;
        this.precision = precision;
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      static [import_entity.entityKind] = "PgTimeBuilder";
      /** @internal */
      build(table) {
        return new PgTime(table, this.config);
      }
    };
    var PgTime = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgTime";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : `(${this.precision})`;
        return `time${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
    };
    function time(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgTimeBuilder(name, config.withTimezone ?? false, config.precision);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/timestamp.cjs
var require_timestamp = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/timestamp.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var timestamp_exports = {};
    __export(timestamp_exports, {
      PgTimestamp: () => PgTimestamp,
      PgTimestampBuilder: () => PgTimestampBuilder,
      PgTimestampString: () => PgTimestampString,
      PgTimestampStringBuilder: () => PgTimestampStringBuilder,
      timestamp: () => timestamp
    });
    module2.exports = __toCommonJS(timestamp_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var import_date_common = require_date_common();
    var PgTimestampBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgTimestampBuilder";
      constructor(name, withTimezone, precision) {
        super(name, "date", "PgTimestamp");
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      /** @internal */
      build(table) {
        return new PgTimestamp(table, this.config);
      }
    };
    var PgTimestamp = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgTimestamp";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : ` (${this.precision})`;
        return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return new Date(this.withTimezone ? value : value + "+0000");
        return value;
      }
      mapToDriverValue = (value) => {
        return value.toISOString();
      };
    };
    var PgTimestampStringBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgTimestampStringBuilder";
      constructor(name, withTimezone, precision) {
        super(name, "string", "PgTimestampString");
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      /** @internal */
      build(table) {
        return new PgTimestampString(
          table,
          this.config
        );
      }
    };
    var PgTimestampString = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgTimestampString";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : `(${this.precision})`;
        return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return value;
        const shortened = value.toISOString().slice(0, -1).replace("T", " ");
        if (this.withTimezone) {
          const offset = value.getTimezoneOffset();
          const sign = offset <= 0 ? "+" : "-";
          return `${shortened}${sign}${Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0")}`;
        }
        return shortened;
      }
    };
    function timestamp(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config?.mode === "string") {
        return new PgTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
      }
      return new PgTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/uuid.cjs
var require_uuid = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/uuid.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var uuid_exports = {};
    __export(uuid_exports, {
      PgUUID: () => PgUUID,
      PgUUIDBuilder: () => PgUUIDBuilder,
      uuid: () => uuid
    });
    module2.exports = __toCommonJS(uuid_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_common = require_common();
    var PgUUIDBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgUUIDBuilder";
      constructor(name) {
        super(name, "string", "PgUUID");
      }
      /**
       * Adds `default gen_random_uuid()` to the column definition.
       */
      defaultRandom() {
        return this.default(import_sql.sql`gen_random_uuid()`);
      }
      /** @internal */
      build(table) {
        return new PgUUID(table, this.config);
      }
    };
    var PgUUID = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgUUID";
      getSQLType() {
        return "uuid";
      }
    };
    function uuid(name) {
      return new PgUUIDBuilder(name ?? "");
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/varchar.cjs
var require_varchar = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/varchar.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var varchar_exports = {};
    __export(varchar_exports, {
      PgVarchar: () => PgVarchar,
      PgVarcharBuilder: () => PgVarcharBuilder,
      varchar: () => varchar
    });
    module2.exports = __toCommonJS(varchar_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgVarcharBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgVarcharBuilder";
      constructor(name, config) {
        super(name, "string", "PgVarchar");
        this.config.length = config.length;
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgVarchar(
          table,
          this.config
        );
      }
    };
    var PgVarchar = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgVarchar";
      length = this.config.length;
      enumValues = this.config.enumValues;
      getSQLType() {
        return this.length === void 0 ? `varchar` : `varchar(${this.length})`;
      }
    };
    function varchar(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgVarcharBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.cjs
var require_bit = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var bit_exports = {};
    __export(bit_exports, {
      PgBinaryVector: () => PgBinaryVector,
      PgBinaryVectorBuilder: () => PgBinaryVectorBuilder,
      bit: () => bit
    });
    module2.exports = __toCommonJS(bit_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgBinaryVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBinaryVectorBuilder";
      constructor(name, config) {
        super(name, "string", "PgBinaryVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgBinaryVector(
          table,
          this.config
        );
      }
    };
    var PgBinaryVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBinaryVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `bit(${this.dimensions})`;
      }
    };
    function bit(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgBinaryVectorBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.cjs
var require_halfvec = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var halfvec_exports = {};
    __export(halfvec_exports, {
      PgHalfVector: () => PgHalfVector,
      PgHalfVectorBuilder: () => PgHalfVectorBuilder,
      halfvec: () => halfvec
    });
    module2.exports = __toCommonJS(halfvec_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgHalfVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgHalfVectorBuilder";
      constructor(name, config) {
        super(name, "array", "PgHalfVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgHalfVector(
          table,
          this.config
        );
      }
    };
    var PgHalfVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgHalfVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `halfvec(${this.dimensions})`;
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
      }
    };
    function halfvec(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgHalfVectorBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.cjs
var require_sparsevec = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sparsevec_exports = {};
    __export(sparsevec_exports, {
      PgSparseVector: () => PgSparseVector,
      PgSparseVectorBuilder: () => PgSparseVectorBuilder,
      sparsevec: () => sparsevec
    });
    module2.exports = __toCommonJS(sparsevec_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgSparseVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgSparseVectorBuilder";
      constructor(name, config) {
        super(name, "string", "PgSparseVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgSparseVector(
          table,
          this.config
        );
      }
    };
    var PgSparseVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSparseVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `sparsevec(${this.dimensions})`;
      }
    };
    function sparsevec(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgSparseVectorBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.cjs
var require_vector = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var vector_exports = {};
    __export(vector_exports, {
      PgVector: () => PgVector,
      PgVectorBuilder: () => PgVectorBuilder,
      vector: () => vector
    });
    module2.exports = __toCommonJS(vector_exports);
    var import_entity = require_entity();
    var import_utils = require_utils();
    var import_common = require_common();
    var PgVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgVectorBuilder";
      constructor(name, config) {
        super(name, "array", "PgVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgVector(
          table,
          this.config
        );
      }
    };
    var PgVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `vector(${this.dimensions})`;
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
      }
    };
    function vector(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgVectorBuilder(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/all.cjs
var require_all = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/all.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var all_exports = {};
    __export(all_exports, {
      getPgColumnBuilders: () => getPgColumnBuilders
    });
    module2.exports = __toCommonJS(all_exports);
    var import_bigint = require_bigint();
    var import_bigserial = require_bigserial();
    var import_boolean = require_boolean();
    var import_char = require_char();
    var import_cidr = require_cidr();
    var import_custom = require_custom();
    var import_date = require_date();
    var import_double_precision = require_double_precision();
    var import_inet = require_inet();
    var import_integer = require_integer();
    var import_interval = require_interval();
    var import_json = require_json();
    var import_jsonb = require_jsonb();
    var import_line = require_line();
    var import_macaddr = require_macaddr();
    var import_macaddr8 = require_macaddr8();
    var import_numeric = require_numeric();
    var import_point = require_point();
    var import_geometry = require_geometry();
    var import_real = require_real();
    var import_serial = require_serial();
    var import_smallint = require_smallint();
    var import_smallserial = require_smallserial();
    var import_text = require_text();
    var import_time = require_time();
    var import_timestamp = require_timestamp();
    var import_uuid = require_uuid();
    var import_varchar = require_varchar();
    var import_bit = require_bit();
    var import_halfvec = require_halfvec();
    var import_sparsevec = require_sparsevec();
    var import_vector = require_vector();
    function getPgColumnBuilders() {
      return {
        bigint: import_bigint.bigint,
        bigserial: import_bigserial.bigserial,
        boolean: import_boolean.boolean,
        char: import_char.char,
        cidr: import_cidr.cidr,
        customType: import_custom.customType,
        date: import_date.date,
        doublePrecision: import_double_precision.doublePrecision,
        inet: import_inet.inet,
        integer: import_integer.integer,
        interval: import_interval.interval,
        json: import_json.json,
        jsonb: import_jsonb.jsonb,
        line: import_line.line,
        macaddr: import_macaddr.macaddr,
        macaddr8: import_macaddr8.macaddr8,
        numeric: import_numeric.numeric,
        point: import_point.point,
        geometry: import_geometry.geometry,
        real: import_real.real,
        serial: import_serial.serial,
        smallint: import_smallint.smallint,
        smallserial: import_smallserial.smallserial,
        text: import_text.text,
        time: import_time.time,
        timestamp: import_timestamp.timestamp,
        uuid: import_uuid.uuid,
        varchar: import_varchar.varchar,
        bit: import_bit.bit,
        halfvec: import_halfvec.halfvec,
        sparsevec: import_sparsevec.sparsevec,
        vector: import_vector.vector
      };
    }
  }
});

// node_modules/drizzle-orm/pg-core/table.cjs
var require_table2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/table.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var table_exports = {};
    __export(table_exports, {
      EnableRLS: () => EnableRLS,
      InlineForeignKeys: () => InlineForeignKeys,
      PgTable: () => PgTable,
      pgTable: () => pgTable,
      pgTableCreator: () => pgTableCreator,
      pgTableWithSchema: () => pgTableWithSchema
    });
    module2.exports = __toCommonJS(table_exports);
    var import_entity = require_entity();
    var import_table = require_table();
    var import_all = require_all();
    var InlineForeignKeys = /* @__PURE__ */ Symbol.for("drizzle:PgInlineForeignKeys");
    var EnableRLS = /* @__PURE__ */ Symbol.for("drizzle:EnableRLS");
    var PgTable = class extends import_table.Table {
      static [import_entity.entityKind] = "PgTable";
      /** @internal */
      static Symbol = Object.assign({}, import_table.Table.Symbol, {
        InlineForeignKeys,
        EnableRLS
      });
      /**@internal */
      [InlineForeignKeys] = [];
      /** @internal */
      [EnableRLS] = false;
      /** @internal */
      [import_table.Table.Symbol.ExtraConfigBuilder] = void 0;
      /** @internal */
      [import_table.Table.Symbol.ExtraConfigColumns] = {};
    };
    function pgTableWithSchema(name, columns, extraConfig, schema, baseName = name) {
      const rawTable = new PgTable(name, schema, baseName);
      const parsedColumns = typeof columns === "function" ? columns((0, import_all.getPgColumnBuilders)()) : columns;
      const builtColumns = Object.fromEntries(
        Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
          const colBuilder = colBuilderBase;
          colBuilder.setName(name2);
          const column = colBuilder.build(rawTable);
          rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
          return [name2, column];
        })
      );
      const builtColumnsForExtraConfig = Object.fromEntries(
        Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
          const colBuilder = colBuilderBase;
          colBuilder.setName(name2);
          const column = colBuilder.buildExtraConfigColumn(rawTable);
          return [name2, column];
        })
      );
      const table = Object.assign(rawTable, builtColumns);
      table[import_table.Table.Symbol.Columns] = builtColumns;
      table[import_table.Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;
      if (extraConfig) {
        table[PgTable.Symbol.ExtraConfigBuilder] = extraConfig;
      }
      return Object.assign(table, {
        enableRLS: () => {
          table[PgTable.Symbol.EnableRLS] = true;
          return table;
        }
      });
    }
    var pgTable = (name, columns, extraConfig) => {
      return pgTableWithSchema(name, columns, extraConfig, void 0);
    };
    function pgTableCreator(customizeTableName) {
      return (name, columns, extraConfig) => {
        return pgTableWithSchema(customizeTableName(name), columns, extraConfig, void 0, name);
      };
    }
  }
});

// node_modules/drizzle-orm/pg-core/checks.cjs
var require_checks = __commonJS({
  "node_modules/drizzle-orm/pg-core/checks.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var checks_exports = {};
    __export(checks_exports, {
      Check: () => Check,
      CheckBuilder: () => CheckBuilder,
      check: () => check
    });
    module2.exports = __toCommonJS(checks_exports);
    var import_entity = require_entity();
    var CheckBuilder = class {
      constructor(name, value) {
        this.name = name;
        this.value = value;
      }
      static [import_entity.entityKind] = "PgCheckBuilder";
      brand;
      /** @internal */
      build(table) {
        return new Check(table, this);
      }
    };
    var Check = class {
      constructor(table, builder) {
        this.table = table;
        this.name = builder.name;
        this.value = builder.value;
      }
      static [import_entity.entityKind] = "PgCheck";
      name;
      value;
    };
    function check(name, value) {
      return new CheckBuilder(name, value);
    }
  }
});

// node_modules/drizzle-orm/pg-core/columns/index.cjs
var require_columns = __commonJS({
  "node_modules/drizzle-orm/pg-core/columns/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var columns_exports = {};
    module2.exports = __toCommonJS(columns_exports);
    __reExport(columns_exports, require_bigint(), module2.exports);
    __reExport(columns_exports, require_bigserial(), module2.exports);
    __reExport(columns_exports, require_boolean(), module2.exports);
    __reExport(columns_exports, require_char(), module2.exports);
    __reExport(columns_exports, require_cidr(), module2.exports);
    __reExport(columns_exports, require_common(), module2.exports);
    __reExport(columns_exports, require_custom(), module2.exports);
    __reExport(columns_exports, require_date(), module2.exports);
    __reExport(columns_exports, require_double_precision(), module2.exports);
    __reExport(columns_exports, require_enum(), module2.exports);
    __reExport(columns_exports, require_inet(), module2.exports);
    __reExport(columns_exports, require_int_common(), module2.exports);
    __reExport(columns_exports, require_integer(), module2.exports);
    __reExport(columns_exports, require_interval(), module2.exports);
    __reExport(columns_exports, require_json(), module2.exports);
    __reExport(columns_exports, require_jsonb(), module2.exports);
    __reExport(columns_exports, require_line(), module2.exports);
    __reExport(columns_exports, require_macaddr(), module2.exports);
    __reExport(columns_exports, require_macaddr8(), module2.exports);
    __reExport(columns_exports, require_numeric(), module2.exports);
    __reExport(columns_exports, require_point(), module2.exports);
    __reExport(columns_exports, require_geometry(), module2.exports);
    __reExport(columns_exports, require_real(), module2.exports);
    __reExport(columns_exports, require_serial(), module2.exports);
    __reExport(columns_exports, require_smallint(), module2.exports);
    __reExport(columns_exports, require_smallserial(), module2.exports);
    __reExport(columns_exports, require_text(), module2.exports);
    __reExport(columns_exports, require_time(), module2.exports);
    __reExport(columns_exports, require_timestamp(), module2.exports);
    __reExport(columns_exports, require_uuid(), module2.exports);
    __reExport(columns_exports, require_varchar(), module2.exports);
    __reExport(columns_exports, require_bit(), module2.exports);
    __reExport(columns_exports, require_halfvec(), module2.exports);
    __reExport(columns_exports, require_sparsevec(), module2.exports);
    __reExport(columns_exports, require_vector(), module2.exports);
  }
});

// node_modules/drizzle-orm/pg-core/indexes.cjs
var require_indexes = __commonJS({
  "node_modules/drizzle-orm/pg-core/indexes.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var indexes_exports = {};
    __export(indexes_exports, {
      Index: () => Index,
      IndexBuilder: () => IndexBuilder,
      IndexBuilderOn: () => IndexBuilderOn,
      index: () => index,
      uniqueIndex: () => uniqueIndex
    });
    module2.exports = __toCommonJS(indexes_exports);
    var import_sql = require_sql();
    var import_entity = require_entity();
    var import_columns = require_columns();
    var IndexBuilderOn = class {
      constructor(unique, name) {
        this.unique = unique;
        this.name = name;
      }
      static [import_entity.entityKind] = "PgIndexBuilderOn";
      on(...columns) {
        return new IndexBuilder(
          columns.map((it) => {
            if ((0, import_entity.is)(it, import_sql.SQL)) {
              return it;
            }
            it = it;
            const clonedIndexedColumn = new import_columns.IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
            it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
            return clonedIndexedColumn;
          }),
          this.unique,
          false,
          this.name
        );
      }
      onOnly(...columns) {
        return new IndexBuilder(
          columns.map((it) => {
            if ((0, import_entity.is)(it, import_sql.SQL)) {
              return it;
            }
            it = it;
            const clonedIndexedColumn = new import_columns.IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
            it.indexConfig = it.defaultConfig;
            return clonedIndexedColumn;
          }),
          this.unique,
          true,
          this.name
        );
      }
      /**
       * Specify what index method to use. Choices are `btree`, `hash`, `gist`, `spgist`, `gin`, `brin`, or user-installed access methods like `bloom`. The default method is `btree.
       *
       * If you have the `pg_vector` extension installed in your database, you can use the `hnsw` and `ivfflat` options, which are predefined types.
       *
       * **You can always specify any string you want in the method, in case Drizzle doesn't have it natively in its types**
       *
       * @param method The name of the index method to be used
       * @param columns
       * @returns
       */
      using(method, ...columns) {
        return new IndexBuilder(
          columns.map((it) => {
            if ((0, import_entity.is)(it, import_sql.SQL)) {
              return it;
            }
            it = it;
            const clonedIndexedColumn = new import_columns.IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
            it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
            return clonedIndexedColumn;
          }),
          this.unique,
          true,
          this.name,
          method
        );
      }
    };
    var IndexBuilder = class {
      static [import_entity.entityKind] = "PgIndexBuilder";
      /** @internal */
      config;
      constructor(columns, unique, only, name, method = "btree") {
        this.config = {
          name,
          columns,
          unique,
          only,
          method
        };
      }
      concurrently() {
        this.config.concurrently = true;
        return this;
      }
      with(obj) {
        this.config.with = obj;
        return this;
      }
      where(condition) {
        this.config.where = condition;
        return this;
      }
      /** @internal */
      build(table) {
        return new Index(this.config, table);
      }
    };
    var Index = class {
      static [import_entity.entityKind] = "PgIndex";
      config;
      constructor(config, table) {
        this.config = { ...config, table };
      }
    };
    function index(name) {
      return new IndexBuilderOn(false, name);
    }
    function uniqueIndex(name) {
      return new IndexBuilderOn(true, name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/policies.cjs
var require_policies = __commonJS({
  "node_modules/drizzle-orm/pg-core/policies.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var policies_exports = {};
    __export(policies_exports, {
      PgPolicy: () => PgPolicy,
      pgPolicy: () => pgPolicy
    });
    module2.exports = __toCommonJS(policies_exports);
    var import_entity = require_entity();
    var PgPolicy = class {
      constructor(name, config) {
        this.name = name;
        if (config) {
          this.as = config.as;
          this.for = config.for;
          this.to = config.to;
          this.using = config.using;
          this.withCheck = config.withCheck;
        }
      }
      static [import_entity.entityKind] = "PgPolicy";
      as;
      for;
      to;
      using;
      withCheck;
      /** @internal */
      _linkedTable;
      link(table) {
        this._linkedTable = table;
        return this;
      }
    };
    function pgPolicy(name, config) {
      return new PgPolicy(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/primary-keys.cjs
var require_primary_keys = __commonJS({
  "node_modules/drizzle-orm/pg-core/primary-keys.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var primary_keys_exports = {};
    __export(primary_keys_exports, {
      PrimaryKey: () => PrimaryKey,
      PrimaryKeyBuilder: () => PrimaryKeyBuilder,
      primaryKey: () => primaryKey
    });
    module2.exports = __toCommonJS(primary_keys_exports);
    var import_entity = require_entity();
    var import_table = require_table2();
    function primaryKey(...config) {
      if (config[0].columns) {
        return new PrimaryKeyBuilder(config[0].columns, config[0].name);
      }
      return new PrimaryKeyBuilder(config);
    }
    var PrimaryKeyBuilder = class {
      static [import_entity.entityKind] = "PgPrimaryKeyBuilder";
      /** @internal */
      columns;
      /** @internal */
      name;
      constructor(columns, name) {
        this.columns = columns;
        this.name = name;
      }
      /** @internal */
      build(table) {
        return new PrimaryKey(table, this.columns, this.name);
      }
    };
    var PrimaryKey = class {
      constructor(table, columns, name) {
        this.table = table;
        this.columns = columns;
        this.name = name;
      }
      static [import_entity.entityKind] = "PgPrimaryKey";
      columns;
      name;
      getName() {
        return this.name ?? `${this.table[import_table.PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/view-common.cjs
var require_view_common2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/view-common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_common_exports = {};
    __export(view_common_exports, {
      PgViewConfig: () => PgViewConfig
    });
    module2.exports = __toCommonJS(view_common_exports);
    var PgViewConfig = /* @__PURE__ */ Symbol.for("drizzle:PgViewConfig");
  }
});

// node_modules/drizzle-orm/casing.cjs
var require_casing = __commonJS({
  "node_modules/drizzle-orm/casing.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var casing_exports = {};
    __export(casing_exports, {
      CasingCache: () => CasingCache,
      toCamelCase: () => toCamelCase,
      toSnakeCase: () => toSnakeCase
    });
    module2.exports = __toCommonJS(casing_exports);
    var import_entity = require_entity();
    var import_table = require_table();
    function toSnakeCase(input) {
      const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
      return words.map((word) => word.toLowerCase()).join("_");
    }
    function toCamelCase(input) {
      const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
      return words.reduce((acc, word, i) => {
        const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
        return acc + formattedWord;
      }, "");
    }
    function noopCase(input) {
      return input;
    }
    var CasingCache = class {
      static [import_entity.entityKind] = "CasingCache";
      /** @internal */
      cache = {};
      cachedTables = {};
      convert;
      constructor(casing) {
        this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
      }
      getColumnCasing(column) {
        if (!column.keyAsName) return column.name;
        const schema = column.table[import_table.Table.Symbol.Schema] ?? "public";
        const tableName = column.table[import_table.Table.Symbol.OriginalName];
        const key = `${schema}.${tableName}.${column.name}`;
        if (!this.cache[key]) {
          this.cacheTable(column.table);
        }
        return this.cache[key];
      }
      cacheTable(table) {
        const schema = table[import_table.Table.Symbol.Schema] ?? "public";
        const tableName = table[import_table.Table.Symbol.OriginalName];
        const tableKey = `${schema}.${tableName}`;
        if (!this.cachedTables[tableKey]) {
          for (const column of Object.values(table[import_table.Table.Symbol.Columns])) {
            const columnKey = `${tableKey}.${column.name}`;
            this.cache[columnKey] = this.convert(column.name);
          }
          this.cachedTables[tableKey] = true;
        }
      }
      clearCache() {
        this.cache = {};
        this.cachedTables = {};
      }
    };
  }
});

// node_modules/drizzle-orm/errors.cjs
var require_errors2 = __commonJS({
  "node_modules/drizzle-orm/errors.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var errors_exports = {};
    __export(errors_exports, {
      DrizzleError: () => DrizzleError,
      DrizzleQueryError: () => DrizzleQueryError,
      TransactionRollbackError: () => TransactionRollbackError
    });
    module2.exports = __toCommonJS(errors_exports);
    var import_entity = require_entity();
    var DrizzleError = class extends Error {
      static [import_entity.entityKind] = "DrizzleError";
      constructor({ message, cause }) {
        super(message);
        this.name = "DrizzleError";
        this.cause = cause;
      }
    };
    var DrizzleQueryError = class _DrizzleQueryError extends Error {
      constructor(query, params, cause) {
        super(`Failed query: ${query}
params: ${params}`);
        this.query = query;
        this.params = params;
        this.cause = cause;
        Error.captureStackTrace(this, _DrizzleQueryError);
        if (cause) this.cause = cause;
      }
    };
    var TransactionRollbackError = class extends DrizzleError {
      static [import_entity.entityKind] = "TransactionRollbackError";
      constructor() {
        super({ message: "Rollback" });
      }
    };
  }
});

// node_modules/drizzle-orm/sql/expressions/conditions.cjs
var require_conditions = __commonJS({
  "node_modules/drizzle-orm/sql/expressions/conditions.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var conditions_exports = {};
    __export(conditions_exports, {
      and: () => and,
      arrayContained: () => arrayContained,
      arrayContains: () => arrayContains,
      arrayOverlaps: () => arrayOverlaps,
      between: () => between,
      bindIfParam: () => bindIfParam,
      eq: () => eq,
      exists: () => exists,
      gt: () => gt,
      gte: () => gte,
      ilike: () => ilike,
      inArray: () => inArray,
      isNotNull: () => isNotNull,
      isNull: () => isNull,
      like: () => like,
      lt: () => lt,
      lte: () => lte,
      ne: () => ne,
      not: () => not,
      notBetween: () => notBetween,
      notExists: () => notExists,
      notIlike: () => notIlike,
      notInArray: () => notInArray,
      notLike: () => notLike,
      or: () => or
    });
    module2.exports = __toCommonJS(conditions_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_table = require_table();
    var import_sql = require_sql();
    function bindIfParam(value, column) {
      if ((0, import_sql.isDriverValueEncoder)(column) && !(0, import_sql.isSQLWrapper)(value) && !(0, import_entity.is)(value, import_sql.Param) && !(0, import_entity.is)(value, import_sql.Placeholder) && !(0, import_entity.is)(value, import_column.Column) && !(0, import_entity.is)(value, import_table.Table) && !(0, import_entity.is)(value, import_sql.View)) {
        return new import_sql.Param(value, column);
      }
      return value;
    }
    var eq = (left, right) => {
      return import_sql.sql`${left} = ${bindIfParam(right, left)}`;
    };
    var ne = (left, right) => {
      return import_sql.sql`${left} <> ${bindIfParam(right, left)}`;
    };
    function and(...unfilteredConditions) {
      const conditions = unfilteredConditions.filter(
        (c) => c !== void 0
      );
      if (conditions.length === 0) {
        return void 0;
      }
      if (conditions.length === 1) {
        return new import_sql.SQL(conditions);
      }
      return new import_sql.SQL([
        new import_sql.StringChunk("("),
        import_sql.sql.join(conditions, new import_sql.StringChunk(" and ")),
        new import_sql.StringChunk(")")
      ]);
    }
    function or(...unfilteredConditions) {
      const conditions = unfilteredConditions.filter(
        (c) => c !== void 0
      );
      if (conditions.length === 0) {
        return void 0;
      }
      if (conditions.length === 1) {
        return new import_sql.SQL(conditions);
      }
      return new import_sql.SQL([
        new import_sql.StringChunk("("),
        import_sql.sql.join(conditions, new import_sql.StringChunk(" or ")),
        new import_sql.StringChunk(")")
      ]);
    }
    function not(condition) {
      return import_sql.sql`not ${condition}`;
    }
    var gt = (left, right) => {
      return import_sql.sql`${left} > ${bindIfParam(right, left)}`;
    };
    var gte = (left, right) => {
      return import_sql.sql`${left} >= ${bindIfParam(right, left)}`;
    };
    var lt = (left, right) => {
      return import_sql.sql`${left} < ${bindIfParam(right, left)}`;
    };
    var lte = (left, right) => {
      return import_sql.sql`${left} <= ${bindIfParam(right, left)}`;
    };
    function inArray(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return import_sql.sql`false`;
        }
        return import_sql.sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
      }
      return import_sql.sql`${column} in ${bindIfParam(values, column)}`;
    }
    function notInArray(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return import_sql.sql`true`;
        }
        return import_sql.sql`${column} not in ${values.map((v) => bindIfParam(v, column))}`;
      }
      return import_sql.sql`${column} not in ${bindIfParam(values, column)}`;
    }
    function isNull(value) {
      return import_sql.sql`${value} is null`;
    }
    function isNotNull(value) {
      return import_sql.sql`${value} is not null`;
    }
    function exists(subquery) {
      return import_sql.sql`exists ${subquery}`;
    }
    function notExists(subquery) {
      return import_sql.sql`not exists ${subquery}`;
    }
    function between(column, min, max) {
      return import_sql.sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(
        max,
        column
      )}`;
    }
    function notBetween(column, min, max) {
      return import_sql.sql`${column} not between ${bindIfParam(
        min,
        column
      )} and ${bindIfParam(max, column)}`;
    }
    function like(column, value) {
      return import_sql.sql`${column} like ${value}`;
    }
    function notLike(column, value) {
      return import_sql.sql`${column} not like ${value}`;
    }
    function ilike(column, value) {
      return import_sql.sql`${column} ilike ${value}`;
    }
    function notIlike(column, value) {
      return import_sql.sql`${column} not ilike ${value}`;
    }
    function arrayContains(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          throw new Error("arrayContains requires at least one value");
        }
        const array = import_sql.sql`${bindIfParam(values, column)}`;
        return import_sql.sql`${column} @> ${array}`;
      }
      return import_sql.sql`${column} @> ${bindIfParam(values, column)}`;
    }
    function arrayContained(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          throw new Error("arrayContained requires at least one value");
        }
        const array = import_sql.sql`${bindIfParam(values, column)}`;
        return import_sql.sql`${column} <@ ${array}`;
      }
      return import_sql.sql`${column} <@ ${bindIfParam(values, column)}`;
    }
    function arrayOverlaps(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          throw new Error("arrayOverlaps requires at least one value");
        }
        const array = import_sql.sql`${bindIfParam(values, column)}`;
        return import_sql.sql`${column} && ${array}`;
      }
      return import_sql.sql`${column} && ${bindIfParam(values, column)}`;
    }
  }
});

// node_modules/drizzle-orm/sql/expressions/select.cjs
var require_select = __commonJS({
  "node_modules/drizzle-orm/sql/expressions/select.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc2) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var select_exports = {};
    __export(select_exports, {
      asc: () => asc,
      desc: () => desc
    });
    module2.exports = __toCommonJS(select_exports);
    var import_sql = require_sql();
    function asc(column) {
      return import_sql.sql`${column} asc`;
    }
    function desc(column) {
      return import_sql.sql`${column} desc`;
    }
  }
});

// node_modules/drizzle-orm/sql/expressions/index.cjs
var require_expressions = __commonJS({
  "node_modules/drizzle-orm/sql/expressions/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var expressions_exports = {};
    module2.exports = __toCommonJS(expressions_exports);
    __reExport(expressions_exports, require_conditions(), module2.exports);
    __reExport(expressions_exports, require_select(), module2.exports);
  }
});

// node_modules/drizzle-orm/relations.cjs
var require_relations = __commonJS({
  "node_modules/drizzle-orm/relations.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc2) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var relations_exports = {};
    __export(relations_exports, {
      Many: () => Many,
      One: () => One,
      Relation: () => Relation,
      Relations: () => Relations,
      createMany: () => createMany,
      createOne: () => createOne,
      createTableRelationsHelpers: () => createTableRelationsHelpers,
      extractTablesRelationalConfig: () => extractTablesRelationalConfig,
      getOperators: () => getOperators,
      getOrderByOperators: () => getOrderByOperators,
      mapRelationalRow: () => mapRelationalRow,
      normalizeRelation: () => normalizeRelation,
      relations: () => relations
    });
    module2.exports = __toCommonJS(relations_exports);
    var import_table = require_table();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_primary_keys = require_primary_keys();
    var import_expressions = require_expressions();
    var import_sql = require_sql();
    var Relation = class {
      constructor(sourceTable, referencedTable, relationName) {
        this.sourceTable = sourceTable;
        this.referencedTable = referencedTable;
        this.relationName = relationName;
        this.referencedTableName = referencedTable[import_table.Table.Symbol.Name];
      }
      static [import_entity.entityKind] = "Relation";
      referencedTableName;
      fieldName;
    };
    var Relations = class {
      constructor(table, config) {
        this.table = table;
        this.config = config;
      }
      static [import_entity.entityKind] = "Relations";
    };
    var One = class _One extends Relation {
      constructor(sourceTable, referencedTable, config, isNullable) {
        super(sourceTable, referencedTable, config?.relationName);
        this.config = config;
        this.isNullable = isNullable;
      }
      static [import_entity.entityKind] = "One";
      withFieldName(fieldName) {
        const relation = new _One(
          this.sourceTable,
          this.referencedTable,
          this.config,
          this.isNullable
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    var Many = class _Many extends Relation {
      constructor(sourceTable, referencedTable, config) {
        super(sourceTable, referencedTable, config?.relationName);
        this.config = config;
      }
      static [import_entity.entityKind] = "Many";
      withFieldName(fieldName) {
        const relation = new _Many(
          this.sourceTable,
          this.referencedTable,
          this.config
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    function getOperators() {
      return {
        and: import_expressions.and,
        between: import_expressions.between,
        eq: import_expressions.eq,
        exists: import_expressions.exists,
        gt: import_expressions.gt,
        gte: import_expressions.gte,
        ilike: import_expressions.ilike,
        inArray: import_expressions.inArray,
        isNull: import_expressions.isNull,
        isNotNull: import_expressions.isNotNull,
        like: import_expressions.like,
        lt: import_expressions.lt,
        lte: import_expressions.lte,
        ne: import_expressions.ne,
        not: import_expressions.not,
        notBetween: import_expressions.notBetween,
        notExists: import_expressions.notExists,
        notLike: import_expressions.notLike,
        notIlike: import_expressions.notIlike,
        notInArray: import_expressions.notInArray,
        or: import_expressions.or,
        sql: import_sql.sql
      };
    }
    function getOrderByOperators() {
      return {
        sql: import_sql.sql,
        asc: import_expressions.asc,
        desc: import_expressions.desc
      };
    }
    function extractTablesRelationalConfig(schema, configHelpers) {
      if (Object.keys(schema).length === 1 && "default" in schema && !(0, import_entity.is)(schema["default"], import_table.Table)) {
        schema = schema["default"];
      }
      const tableNamesMap = {};
      const relationsBuffer = {};
      const tablesConfig = {};
      for (const [key, value] of Object.entries(schema)) {
        if ((0, import_entity.is)(value, import_table.Table)) {
          const dbName = (0, import_table.getTableUniqueName)(value);
          const bufferedRelations = relationsBuffer[dbName];
          tableNamesMap[dbName] = key;
          tablesConfig[key] = {
            tsName: key,
            dbName: value[import_table.Table.Symbol.Name],
            schema: value[import_table.Table.Symbol.Schema],
            columns: value[import_table.Table.Symbol.Columns],
            relations: bufferedRelations?.relations ?? {},
            primaryKey: bufferedRelations?.primaryKey ?? []
          };
          for (const column of Object.values(
            value[import_table.Table.Symbol.Columns]
          )) {
            if (column.primary) {
              tablesConfig[key].primaryKey.push(column);
            }
          }
          const extraConfig = value[import_table.Table.Symbol.ExtraConfigBuilder]?.(value[import_table.Table.Symbol.ExtraConfigColumns]);
          if (extraConfig) {
            for (const configEntry of Object.values(extraConfig)) {
              if ((0, import_entity.is)(configEntry, import_primary_keys.PrimaryKeyBuilder)) {
                tablesConfig[key].primaryKey.push(...configEntry.columns);
              }
            }
          }
        } else if ((0, import_entity.is)(value, Relations)) {
          const dbName = (0, import_table.getTableUniqueName)(value.table);
          const tableName = tableNamesMap[dbName];
          const relations2 = value.config(
            configHelpers(value.table)
          );
          let primaryKey;
          for (const [relationName, relation] of Object.entries(relations2)) {
            if (tableName) {
              const tableConfig = tablesConfig[tableName];
              tableConfig.relations[relationName] = relation;
              if (primaryKey) {
                tableConfig.primaryKey.push(...primaryKey);
              }
            } else {
              if (!(dbName in relationsBuffer)) {
                relationsBuffer[dbName] = {
                  relations: {},
                  primaryKey
                };
              }
              relationsBuffer[dbName].relations[relationName] = relation;
            }
          }
        }
      }
      return { tables: tablesConfig, tableNamesMap };
    }
    function relations(table, relations2) {
      return new Relations(
        table,
        (helpers) => Object.fromEntries(
          Object.entries(relations2(helpers)).map(([key, value]) => [
            key,
            value.withFieldName(key)
          ])
        )
      );
    }
    function createOne(sourceTable) {
      return function one(table, config) {
        return new One(
          sourceTable,
          table,
          config,
          config?.fields.reduce((res, f) => res && f.notNull, true) ?? false
        );
      };
    }
    function createMany(sourceTable) {
      return function many(referencedTable, config) {
        return new Many(sourceTable, referencedTable, config);
      };
    }
    function normalizeRelation(schema, tableNamesMap, relation) {
      if ((0, import_entity.is)(relation, One) && relation.config) {
        return {
          fields: relation.config.fields,
          references: relation.config.references
        };
      }
      const referencedTableTsName = tableNamesMap[(0, import_table.getTableUniqueName)(relation.referencedTable)];
      if (!referencedTableTsName) {
        throw new Error(
          `Table "${relation.referencedTable[import_table.Table.Symbol.Name]}" not found in schema`
        );
      }
      const referencedTableConfig = schema[referencedTableTsName];
      if (!referencedTableConfig) {
        throw new Error(`Table "${referencedTableTsName}" not found in schema`);
      }
      const sourceTable = relation.sourceTable;
      const sourceTableTsName = tableNamesMap[(0, import_table.getTableUniqueName)(sourceTable)];
      if (!sourceTableTsName) {
        throw new Error(
          `Table "${sourceTable[import_table.Table.Symbol.Name]}" not found in schema`
        );
      }
      const reverseRelations = [];
      for (const referencedTableRelation of Object.values(
        referencedTableConfig.relations
      )) {
        if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
          reverseRelations.push(referencedTableRelation);
        }
      }
      if (reverseRelations.length > 1) {
        throw relation.relationName ? new Error(
          `There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`
        ) : new Error(
          `There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[import_table.Table.Symbol.Name]}". Please specify relation name`
        );
      }
      if (reverseRelations[0] && (0, import_entity.is)(reverseRelations[0], One) && reverseRelations[0].config) {
        return {
          fields: reverseRelations[0].config.references,
          references: reverseRelations[0].config.fields
        };
      }
      throw new Error(
        `There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`
      );
    }
    function createTableRelationsHelpers(sourceTable) {
      return {
        one: createOne(sourceTable),
        many: createMany(sourceTable)
      };
    }
    function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
      const result = {};
      for (const [
        selectionItemIndex,
        selectionItem
      ] of buildQueryResultSelection.entries()) {
        if (selectionItem.isJson) {
          const relation = tableConfig.relations[selectionItem.tsKey];
          const rawSubRows = row[selectionItemIndex];
          const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
          result[selectionItem.tsKey] = (0, import_entity.is)(relation, One) ? subRows && mapRelationalRow(
            tablesConfig,
            tablesConfig[selectionItem.relationTableTsKey],
            subRows,
            selectionItem.selection,
            mapColumnValue
          ) : subRows.map(
            (subRow) => mapRelationalRow(
              tablesConfig,
              tablesConfig[selectionItem.relationTableTsKey],
              subRow,
              selectionItem.selection,
              mapColumnValue
            )
          );
        } else {
          const value = mapColumnValue(row[selectionItemIndex]);
          const field = selectionItem.field;
          let decoder;
          if ((0, import_entity.is)(field, import_column.Column)) {
            decoder = field;
          } else if ((0, import_entity.is)(field, import_sql.SQL)) {
            decoder = field.decoder;
          } else {
            decoder = field.sql.decoder;
          }
          result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value);
        }
      }
      return result;
    }
  }
});

// node_modules/drizzle-orm/sql/functions/aggregate.cjs
var require_aggregate = __commonJS({
  "node_modules/drizzle-orm/sql/functions/aggregate.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var aggregate_exports = {};
    __export(aggregate_exports, {
      avg: () => avg,
      avgDistinct: () => avgDistinct,
      count: () => count,
      countDistinct: () => countDistinct,
      max: () => max,
      min: () => min,
      sum: () => sum,
      sumDistinct: () => sumDistinct
    });
    module2.exports = __toCommonJS(aggregate_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    function count(expression) {
      return import_sql.sql`count(${expression || import_sql.sql.raw("*")})`.mapWith(Number);
    }
    function countDistinct(expression) {
      return import_sql.sql`count(distinct ${expression})`.mapWith(Number);
    }
    function avg(expression) {
      return import_sql.sql`avg(${expression})`.mapWith(String);
    }
    function avgDistinct(expression) {
      return import_sql.sql`avg(distinct ${expression})`.mapWith(String);
    }
    function sum(expression) {
      return import_sql.sql`sum(${expression})`.mapWith(String);
    }
    function sumDistinct(expression) {
      return import_sql.sql`sum(distinct ${expression})`.mapWith(String);
    }
    function max(expression) {
      return import_sql.sql`max(${expression})`.mapWith((0, import_entity.is)(expression, import_column.Column) ? expression : String);
    }
    function min(expression) {
      return import_sql.sql`min(${expression})`.mapWith((0, import_entity.is)(expression, import_column.Column) ? expression : String);
    }
  }
});

// node_modules/drizzle-orm/sql/functions/vector.cjs
var require_vector2 = __commonJS({
  "node_modules/drizzle-orm/sql/functions/vector.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var vector_exports = {};
    __export(vector_exports, {
      cosineDistance: () => cosineDistance,
      hammingDistance: () => hammingDistance,
      innerProduct: () => innerProduct,
      jaccardDistance: () => jaccardDistance,
      l1Distance: () => l1Distance,
      l2Distance: () => l2Distance
    });
    module2.exports = __toCommonJS(vector_exports);
    var import_sql = require_sql();
    function toSql(value) {
      return JSON.stringify(value);
    }
    function l2Distance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <-> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <-> ${value}`;
    }
    function l1Distance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <+> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <+> ${value}`;
    }
    function innerProduct(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <#> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <#> ${value}`;
    }
    function cosineDistance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <=> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <=> ${value}`;
    }
    function hammingDistance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <~> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <~> ${value}`;
    }
    function jaccardDistance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <%> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <%> ${value}`;
    }
  }
});

// node_modules/drizzle-orm/sql/functions/index.cjs
var require_functions = __commonJS({
  "node_modules/drizzle-orm/sql/functions/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var functions_exports = {};
    module2.exports = __toCommonJS(functions_exports);
    __reExport(functions_exports, require_aggregate(), module2.exports);
    __reExport(functions_exports, require_vector2(), module2.exports);
  }
});

// node_modules/drizzle-orm/sql/index.cjs
var require_sql2 = __commonJS({
  "node_modules/drizzle-orm/sql/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sql_exports = {};
    module2.exports = __toCommonJS(sql_exports);
    __reExport(sql_exports, require_expressions(), module2.exports);
    __reExport(sql_exports, require_functions(), module2.exports);
    __reExport(sql_exports, require_sql(), module2.exports);
  }
});

// node_modules/drizzle-orm/pg-core/view-base.cjs
var require_view_base = __commonJS({
  "node_modules/drizzle-orm/pg-core/view-base.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_base_exports = {};
    __export(view_base_exports, {
      PgViewBase: () => PgViewBase
    });
    module2.exports = __toCommonJS(view_base_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var PgViewBase = class extends import_sql.View {
      static [import_entity.entityKind] = "PgViewBase";
    };
  }
});

// node_modules/drizzle-orm/pg-core/dialect.cjs
var require_dialect = __commonJS({
  "node_modules/drizzle-orm/pg-core/dialect.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var dialect_exports = {};
    __export(dialect_exports, {
      PgDialect: () => PgDialect
    });
    module2.exports = __toCommonJS(dialect_exports);
    var import_alias = require_alias();
    var import_casing = require_casing();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_errors = require_errors2();
    var import_columns = require_columns();
    var import_table = require_table2();
    var import_relations = require_relations();
    var import_sql = require_sql2();
    var import_sql2 = require_sql();
    var import_subquery = require_subquery();
    var import_table2 = require_table();
    var import_utils = require_utils();
    var import_view_common = require_view_common();
    var import_view_base = require_view_base();
    var PgDialect = class {
      static [import_entity.entityKind] = "PgDialect";
      /** @internal */
      casing;
      constructor(config) {
        this.casing = new import_casing.CasingCache(config?.casing);
      }
      async migrate(migrations, session, config) {
        const migrationsTable = typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
        const migrationsSchema = typeof config === "string" ? "drizzle" : config.migrationsSchema ?? "drizzle";
        const migrationTableCreate = import_sql2.sql`
			CREATE TABLE IF NOT EXISTS ${import_sql2.sql.identifier(migrationsSchema)}.${import_sql2.sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`;
        await session.execute(import_sql2.sql`CREATE SCHEMA IF NOT EXISTS ${import_sql2.sql.identifier(migrationsSchema)}`);
        await session.execute(migrationTableCreate);
        const dbMigrations = await session.all(
          import_sql2.sql`select id, hash, created_at from ${import_sql2.sql.identifier(migrationsSchema)}.${import_sql2.sql.identifier(migrationsTable)} order by created_at desc limit 1`
        );
        const lastDbMigration = dbMigrations[0];
        await session.transaction(async (tx) => {
          for await (const migration of migrations) {
            if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
              for (const stmt of migration.sql) {
                await tx.execute(import_sql2.sql.raw(stmt));
              }
              await tx.execute(
                import_sql2.sql`insert into ${import_sql2.sql.identifier(migrationsSchema)}.${import_sql2.sql.identifier(migrationsTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
              );
            }
          }
        });
      }
      escapeName(name) {
        return `"${name.replace(/"/g, '""')}"`;
      }
      escapeParam(num) {
        return `$${num + 1}`;
      }
      escapeString(str) {
        return `'${str.replace(/'/g, "''")}'`;
      }
      buildWithCTE(queries) {
        if (!queries?.length) return void 0;
        const withSqlChunks = [import_sql2.sql`with `];
        for (const [i, w] of queries.entries()) {
          withSqlChunks.push(import_sql2.sql`${import_sql2.sql.identifier(w._.alias)} as (${w._.sql})`);
          if (i < queries.length - 1) {
            withSqlChunks.push(import_sql2.sql`, `);
          }
        }
        withSqlChunks.push(import_sql2.sql` `);
        return import_sql2.sql.join(withSqlChunks);
      }
      buildDeleteQuery({ table, where, returning, withList }) {
        const withSql = this.buildWithCTE(withList);
        const returningSql = returning ? import_sql2.sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const whereSql = where ? import_sql2.sql` where ${where}` : void 0;
        return import_sql2.sql`${withSql}delete from ${table}${whereSql}${returningSql}`;
      }
      buildUpdateSet(table, set) {
        const tableColumns = table[import_table2.Table.Symbol.Columns];
        const columnNames = Object.keys(tableColumns).filter(
          (colName) => set[colName] !== void 0 || tableColumns[colName]?.onUpdateFn !== void 0
        );
        const setSize = columnNames.length;
        return import_sql2.sql.join(columnNames.flatMap((colName, i) => {
          const col = tableColumns[colName];
          const onUpdateFnResult = col.onUpdateFn?.();
          const value = set[colName] ?? ((0, import_entity.is)(onUpdateFnResult, import_sql2.SQL) ? onUpdateFnResult : import_sql2.sql.param(onUpdateFnResult, col));
          const res = import_sql2.sql`${import_sql2.sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
          if (i < setSize - 1) {
            return [res, import_sql2.sql.raw(", ")];
          }
          return [res];
        }));
      }
      buildUpdateQuery({ table, set, where, returning, withList, from, joins }) {
        const withSql = this.buildWithCTE(withList);
        const tableName = table[import_table.PgTable.Symbol.Name];
        const tableSchema = table[import_table.PgTable.Symbol.Schema];
        const origTableName = table[import_table.PgTable.Symbol.OriginalName];
        const alias = tableName === origTableName ? void 0 : tableName;
        const tableSql = import_sql2.sql`${tableSchema ? import_sql2.sql`${import_sql2.sql.identifier(tableSchema)}.` : void 0}${import_sql2.sql.identifier(origTableName)}${alias && import_sql2.sql` ${import_sql2.sql.identifier(alias)}`}`;
        const setSql = this.buildUpdateSet(table, set);
        const fromSql = from && import_sql2.sql.join([import_sql2.sql.raw(" from "), this.buildFromTable(from)]);
        const joinsSql = this.buildJoins(joins);
        const returningSql = returning ? import_sql2.sql` returning ${this.buildSelection(returning, { isSingleTable: !from })}` : void 0;
        const whereSql = where ? import_sql2.sql` where ${where}` : void 0;
        return import_sql2.sql`${withSql}update ${tableSql} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}`;
      }
      /**
       * Builds selection SQL with provided fields/expressions
       *
       * Examples:
       *
       * `select <selection> from`
       *
       * `insert ... returning <selection>`
       *
       * If `isSingleTable` is true, then columns won't be prefixed with table name
       */
      buildSelection(fields, { isSingleTable = false } = {}) {
        const columnsLen = fields.length;
        const chunks = fields.flatMap(({ field }, i) => {
          const chunk = [];
          if ((0, import_entity.is)(field, import_sql2.SQL.Aliased) && field.isSelectionField) {
            chunk.push(import_sql2.sql.identifier(field.fieldAlias));
          } else if ((0, import_entity.is)(field, import_sql2.SQL.Aliased) || (0, import_entity.is)(field, import_sql2.SQL)) {
            const query = (0, import_entity.is)(field, import_sql2.SQL.Aliased) ? field.sql : field;
            if (isSingleTable) {
              chunk.push(
                new import_sql2.SQL(
                  query.queryChunks.map((c) => {
                    if ((0, import_entity.is)(c, import_columns.PgColumn)) {
                      return import_sql2.sql.identifier(this.casing.getColumnCasing(c));
                    }
                    return c;
                  })
                )
              );
            } else {
              chunk.push(query);
            }
            if ((0, import_entity.is)(field, import_sql2.SQL.Aliased)) {
              chunk.push(import_sql2.sql` as ${import_sql2.sql.identifier(field.fieldAlias)}`);
            }
          } else if ((0, import_entity.is)(field, import_column.Column)) {
            if (isSingleTable) {
              chunk.push(import_sql2.sql.identifier(this.casing.getColumnCasing(field)));
            } else {
              chunk.push(field);
            }
          } else if ((0, import_entity.is)(field, import_subquery.Subquery)) {
            const entries = Object.entries(field._.selectedFields);
            if (entries.length === 1) {
              const entry = entries[0][1];
              const fieldDecoder = (0, import_entity.is)(entry, import_sql2.SQL) ? entry.decoder : (0, import_entity.is)(entry, import_column.Column) ? { mapFromDriverValue: (v) => entry.mapFromDriverValue(v) } : entry.sql.decoder;
              if (fieldDecoder) {
                field._.sql.decoder = fieldDecoder;
              }
            }
            chunk.push(field);
          }
          if (i < columnsLen - 1) {
            chunk.push(import_sql2.sql`, `);
          }
          return chunk;
        });
        return import_sql2.sql.join(chunks);
      }
      buildJoins(joins) {
        if (!joins || joins.length === 0) {
          return void 0;
        }
        const joinsArray = [];
        for (const [index, joinMeta] of joins.entries()) {
          if (index === 0) {
            joinsArray.push(import_sql2.sql` `);
          }
          const table = joinMeta.table;
          const lateralSql = joinMeta.lateral ? import_sql2.sql` lateral` : void 0;
          const onSql = joinMeta.on ? import_sql2.sql` on ${joinMeta.on}` : void 0;
          if ((0, import_entity.is)(table, import_table.PgTable)) {
            const tableName = table[import_table.PgTable.Symbol.Name];
            const tableSchema = table[import_table.PgTable.Symbol.Schema];
            const origTableName = table[import_table.PgTable.Symbol.OriginalName];
            const alias = tableName === origTableName ? void 0 : joinMeta.alias;
            joinsArray.push(
              import_sql2.sql`${import_sql2.sql.raw(joinMeta.joinType)} join${lateralSql} ${tableSchema ? import_sql2.sql`${import_sql2.sql.identifier(tableSchema)}.` : void 0}${import_sql2.sql.identifier(origTableName)}${alias && import_sql2.sql` ${import_sql2.sql.identifier(alias)}`}${onSql}`
            );
          } else if ((0, import_entity.is)(table, import_sql.View)) {
            const viewName = table[import_view_common.ViewBaseConfig].name;
            const viewSchema = table[import_view_common.ViewBaseConfig].schema;
            const origViewName = table[import_view_common.ViewBaseConfig].originalName;
            const alias = viewName === origViewName ? void 0 : joinMeta.alias;
            joinsArray.push(
              import_sql2.sql`${import_sql2.sql.raw(joinMeta.joinType)} join${lateralSql} ${viewSchema ? import_sql2.sql`${import_sql2.sql.identifier(viewSchema)}.` : void 0}${import_sql2.sql.identifier(origViewName)}${alias && import_sql2.sql` ${import_sql2.sql.identifier(alias)}`}${onSql}`
            );
          } else {
            joinsArray.push(
              import_sql2.sql`${import_sql2.sql.raw(joinMeta.joinType)} join${lateralSql} ${table}${onSql}`
            );
          }
          if (index < joins.length - 1) {
            joinsArray.push(import_sql2.sql` `);
          }
        }
        return import_sql2.sql.join(joinsArray);
      }
      buildFromTable(table) {
        if ((0, import_entity.is)(table, import_table2.Table) && table[import_table2.Table.Symbol.IsAlias]) {
          let fullName = import_sql2.sql`${import_sql2.sql.identifier(table[import_table2.Table.Symbol.OriginalName])}`;
          if (table[import_table2.Table.Symbol.Schema]) {
            fullName = import_sql2.sql`${import_sql2.sql.identifier(table[import_table2.Table.Symbol.Schema])}.${fullName}`;
          }
          return import_sql2.sql`${fullName} ${import_sql2.sql.identifier(table[import_table2.Table.Symbol.Name])}`;
        }
        return table;
      }
      buildSelectQuery({
        withList,
        fields,
        fieldsFlat,
        where,
        having,
        table,
        joins,
        orderBy,
        groupBy,
        limit,
        offset,
        lockingClause,
        distinct,
        setOperators
      }) {
        const fieldsList = fieldsFlat ?? (0, import_utils.orderSelectedFields)(fields);
        for (const f of fieldsList) {
          if ((0, import_entity.is)(f.field, import_column.Column) && (0, import_table2.getTableName)(f.field.table) !== ((0, import_entity.is)(table, import_subquery.Subquery) ? table._.alias : (0, import_entity.is)(table, import_view_base.PgViewBase) ? table[import_view_common.ViewBaseConfig].name : (0, import_entity.is)(table, import_sql2.SQL) ? void 0 : (0, import_table2.getTableName)(table)) && !((table2) => joins?.some(
            ({ alias }) => alias === (table2[import_table2.Table.Symbol.IsAlias] ? (0, import_table2.getTableName)(table2) : table2[import_table2.Table.Symbol.BaseName])
          ))(f.field.table)) {
            const tableName = (0, import_table2.getTableName)(f.field.table);
            throw new Error(
              `Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`
            );
          }
        }
        const isSingleTable = !joins || joins.length === 0;
        const withSql = this.buildWithCTE(withList);
        let distinctSql;
        if (distinct) {
          distinctSql = distinct === true ? import_sql2.sql` distinct` : import_sql2.sql` distinct on (${import_sql2.sql.join(distinct.on, import_sql2.sql`, `)})`;
        }
        const selection = this.buildSelection(fieldsList, { isSingleTable });
        const tableSql = this.buildFromTable(table);
        const joinsSql = this.buildJoins(joins);
        const whereSql = where ? import_sql2.sql` where ${where}` : void 0;
        const havingSql = having ? import_sql2.sql` having ${having}` : void 0;
        let orderBySql;
        if (orderBy && orderBy.length > 0) {
          orderBySql = import_sql2.sql` order by ${import_sql2.sql.join(orderBy, import_sql2.sql`, `)}`;
        }
        let groupBySql;
        if (groupBy && groupBy.length > 0) {
          groupBySql = import_sql2.sql` group by ${import_sql2.sql.join(groupBy, import_sql2.sql`, `)}`;
        }
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? import_sql2.sql` limit ${limit}` : void 0;
        const offsetSql = offset ? import_sql2.sql` offset ${offset}` : void 0;
        const lockingClauseSql = import_sql2.sql.empty();
        if (lockingClause) {
          const clauseSql = import_sql2.sql` for ${import_sql2.sql.raw(lockingClause.strength)}`;
          if (lockingClause.config.of) {
            clauseSql.append(
              import_sql2.sql` of ${import_sql2.sql.join(
                Array.isArray(lockingClause.config.of) ? lockingClause.config.of : [lockingClause.config.of],
                import_sql2.sql`, `
              )}`
            );
          }
          if (lockingClause.config.noWait) {
            clauseSql.append(import_sql2.sql` nowait`);
          } else if (lockingClause.config.skipLocked) {
            clauseSql.append(import_sql2.sql` skip locked`);
          }
          lockingClauseSql.append(clauseSql);
        }
        const finalQuery = import_sql2.sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}${lockingClauseSql}`;
        if (setOperators.length > 0) {
          return this.buildSetOperations(finalQuery, setOperators);
        }
        return finalQuery;
      }
      buildSetOperations(leftSelect, setOperators) {
        const [setOperator, ...rest] = setOperators;
        if (!setOperator) {
          throw new Error("Cannot pass undefined values to any set operator");
        }
        if (rest.length === 0) {
          return this.buildSetOperationQuery({ leftSelect, setOperator });
        }
        return this.buildSetOperations(
          this.buildSetOperationQuery({ leftSelect, setOperator }),
          rest
        );
      }
      buildSetOperationQuery({
        leftSelect,
        setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
      }) {
        const leftChunk = import_sql2.sql`(${leftSelect.getSQL()}) `;
        const rightChunk = import_sql2.sql`(${rightSelect.getSQL()})`;
        let orderBySql;
        if (orderBy && orderBy.length > 0) {
          const orderByValues = [];
          for (const singleOrderBy of orderBy) {
            if ((0, import_entity.is)(singleOrderBy, import_columns.PgColumn)) {
              orderByValues.push(import_sql2.sql.identifier(singleOrderBy.name));
            } else if ((0, import_entity.is)(singleOrderBy, import_sql2.SQL)) {
              for (let i = 0; i < singleOrderBy.queryChunks.length; i++) {
                const chunk = singleOrderBy.queryChunks[i];
                if ((0, import_entity.is)(chunk, import_columns.PgColumn)) {
                  singleOrderBy.queryChunks[i] = import_sql2.sql.identifier(chunk.name);
                }
              }
              orderByValues.push(import_sql2.sql`${singleOrderBy}`);
            } else {
              orderByValues.push(import_sql2.sql`${singleOrderBy}`);
            }
          }
          orderBySql = import_sql2.sql` order by ${import_sql2.sql.join(orderByValues, import_sql2.sql`, `)} `;
        }
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? import_sql2.sql` limit ${limit}` : void 0;
        const operatorChunk = import_sql2.sql.raw(`${type} ${isAll ? "all " : ""}`);
        const offsetSql = offset ? import_sql2.sql` offset ${offset}` : void 0;
        return import_sql2.sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
      }
      buildInsertQuery({ table, values: valuesOrSelect, onConflict, returning, withList, select, overridingSystemValue_ }) {
        const valuesSqlList = [];
        const columns = table[import_table2.Table.Symbol.Columns];
        const colEntries = Object.entries(columns).filter(([_, col]) => !col.shouldDisableInsert());
        const insertOrder = colEntries.map(
          ([, column]) => import_sql2.sql.identifier(this.casing.getColumnCasing(column))
        );
        if (select) {
          const select2 = valuesOrSelect;
          if ((0, import_entity.is)(select2, import_sql2.SQL)) {
            valuesSqlList.push(select2);
          } else {
            valuesSqlList.push(select2.getSQL());
          }
        } else {
          const values = valuesOrSelect;
          valuesSqlList.push(import_sql2.sql.raw("values "));
          for (const [valueIndex, value] of values.entries()) {
            const valueList = [];
            for (const [fieldName, col] of colEntries) {
              const colValue = value[fieldName];
              if (colValue === void 0 || (0, import_entity.is)(colValue, import_sql2.Param) && colValue.value === void 0) {
                if (col.defaultFn !== void 0) {
                  const defaultFnResult = col.defaultFn();
                  const defaultValue = (0, import_entity.is)(defaultFnResult, import_sql2.SQL) ? defaultFnResult : import_sql2.sql.param(defaultFnResult, col);
                  valueList.push(defaultValue);
                } else if (!col.default && col.onUpdateFn !== void 0) {
                  const onUpdateFnResult = col.onUpdateFn();
                  const newValue = (0, import_entity.is)(onUpdateFnResult, import_sql2.SQL) ? onUpdateFnResult : import_sql2.sql.param(onUpdateFnResult, col);
                  valueList.push(newValue);
                } else {
                  valueList.push(import_sql2.sql`default`);
                }
              } else {
                valueList.push(colValue);
              }
            }
            valuesSqlList.push(valueList);
            if (valueIndex < values.length - 1) {
              valuesSqlList.push(import_sql2.sql`, `);
            }
          }
        }
        const withSql = this.buildWithCTE(withList);
        const valuesSql = import_sql2.sql.join(valuesSqlList);
        const returningSql = returning ? import_sql2.sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const onConflictSql = onConflict ? import_sql2.sql` on conflict ${onConflict}` : void 0;
        const overridingSql = overridingSystemValue_ === true ? import_sql2.sql`overriding system value ` : void 0;
        return import_sql2.sql`${withSql}insert into ${table} ${insertOrder} ${overridingSql}${valuesSql}${onConflictSql}${returningSql}`;
      }
      buildRefreshMaterializedViewQuery({ view, concurrently, withNoData }) {
        const concurrentlySql = concurrently ? import_sql2.sql` concurrently` : void 0;
        const withNoDataSql = withNoData ? import_sql2.sql` with no data` : void 0;
        return import_sql2.sql`refresh materialized view${concurrentlySql} ${view}${withNoDataSql}`;
      }
      prepareTyping(encoder) {
        if ((0, import_entity.is)(encoder, import_columns.PgJsonb) || (0, import_entity.is)(encoder, import_columns.PgJson)) {
          return "json";
        } else if ((0, import_entity.is)(encoder, import_columns.PgNumeric)) {
          return "decimal";
        } else if ((0, import_entity.is)(encoder, import_columns.PgTime)) {
          return "time";
        } else if ((0, import_entity.is)(encoder, import_columns.PgTimestamp) || (0, import_entity.is)(encoder, import_columns.PgTimestampString)) {
          return "timestamp";
        } else if ((0, import_entity.is)(encoder, import_columns.PgDate) || (0, import_entity.is)(encoder, import_columns.PgDateString)) {
          return "date";
        } else if ((0, import_entity.is)(encoder, import_columns.PgUUID)) {
          return "uuid";
        } else {
          return "none";
        }
      }
      sqlToQuery(sql2, invokeSource) {
        return sql2.toQuery({
          casing: this.casing,
          escapeName: this.escapeName,
          escapeParam: this.escapeParam,
          escapeString: this.escapeString,
          prepareTyping: this.prepareTyping,
          invokeSource
        });
      }
      // buildRelationalQueryWithPK({
      // 	fullSchema,
      // 	schema,
      // 	tableNamesMap,
      // 	table,
      // 	tableConfig,
      // 	queryConfig: config,
      // 	tableAlias,
      // 	isRoot = false,
      // 	joinOn,
      // }: {
      // 	fullSchema: Record<string, unknown>;
      // 	schema: TablesRelationalConfig;
      // 	tableNamesMap: Record<string, string>;
      // 	table: PgTable;
      // 	tableConfig: TableRelationalConfig;
      // 	queryConfig: true | DBQueryConfig<'many', true>;
      // 	tableAlias: string;
      // 	isRoot?: boolean;
      // 	joinOn?: SQL;
      // }): BuildRelationalQueryResult<PgTable, PgColumn> {
      // 	// For { "<relation>": true }, return a table with selection of all columns
      // 	if (config === true) {
      // 		const selectionEntries = Object.entries(tableConfig.columns);
      // 		const selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = selectionEntries.map((
      // 			[key, value],
      // 		) => ({
      // 			dbKey: value.name,
      // 			tsKey: key,
      // 			field: value as PgColumn,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 		return {
      // 			tableTsKey: tableConfig.tsName,
      // 			sql: table,
      // 			selection,
      // 		};
      // 	}
      // 	// let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
      // 	// let selectionForBuild = selection;
      // 	const aliasedColumns = Object.fromEntries(
      // 		Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)]),
      // 	);
      // 	const aliasedRelations = Object.fromEntries(
      // 		Object.entries(tableConfig.relations).map(([key, value]) => [key, aliasedRelation(value, tableAlias)]),
      // 	);
      // 	const aliasedFields = Object.assign({}, aliasedColumns, aliasedRelations);
      // 	let where, hasUserDefinedWhere;
      // 	if (config.where) {
      // 		const whereSql = typeof config.where === 'function' ? config.where(aliasedFields, operators) : config.where;
      // 		where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
      // 		hasUserDefinedWhere = !!where;
      // 	}
      // 	where = and(joinOn, where);
      // 	// const fieldsSelection: { tsKey: string; value: PgColumn | SQL.Aliased; isExtra?: boolean }[] = [];
      // 	let joins: Join[] = [];
      // 	let selectedColumns: string[] = [];
      // 	// Figure out which columns to select
      // 	if (config.columns) {
      // 		let isIncludeMode = false;
      // 		for (const [field, value] of Object.entries(config.columns)) {
      // 			if (value === undefined) {
      // 				continue;
      // 			}
      // 			if (field in tableConfig.columns) {
      // 				if (!isIncludeMode && value === true) {
      // 					isIncludeMode = true;
      // 				}
      // 				selectedColumns.push(field);
      // 			}
      // 		}
      // 		if (selectedColumns.length > 0) {
      // 			selectedColumns = isIncludeMode
      // 				? selectedColumns.filter((c) => config.columns?.[c] === true)
      // 				: Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
      // 		}
      // 	} else {
      // 		// Select all columns if selection is not specified
      // 		selectedColumns = Object.keys(tableConfig.columns);
      // 	}
      // 	// for (const field of selectedColumns) {
      // 	// 	const column = tableConfig.columns[field]! as PgColumn;
      // 	// 	fieldsSelection.push({ tsKey: field, value: column });
      // 	// }
      // 	let initiallySelectedRelations: {
      // 		tsKey: string;
      // 		queryConfig: true | DBQueryConfig<'many', false>;
      // 		relation: Relation;
      // 	}[] = [];
      // 	// let selectedRelations: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
      // 	// Figure out which relations to select
      // 	if (config.with) {
      // 		initiallySelectedRelations = Object.entries(config.with)
      // 			.filter((entry): entry is [typeof entry[0], NonNullable<typeof entry[1]>] => !!entry[1])
      // 			.map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey]! }));
      // 	}
      // 	const manyRelations = initiallySelectedRelations.filter((r) =>
      // 		is(r.relation, Many)
      // 		&& (schema[tableNamesMap[r.relation.referencedTable[Table.Symbol.Name]]!]?.primaryKey.length ?? 0) > 0
      // 	);
      // 	// If this is the last Many relation (or there are no Many relations), we are on the innermost subquery level
      // 	const isInnermostQuery = manyRelations.length < 2;
      // 	const selectedExtras: {
      // 		tsKey: string;
      // 		value: SQL.Aliased;
      // 	}[] = [];
      // 	// Figure out which extras to select
      // 	if (isInnermostQuery && config.extras) {
      // 		const extras = typeof config.extras === 'function'
      // 			? config.extras(aliasedFields, { sql })
      // 			: config.extras;
      // 		for (const [tsKey, value] of Object.entries(extras)) {
      // 			selectedExtras.push({
      // 				tsKey,
      // 				value: mapColumnsInAliasedSQLToAlias(value, tableAlias),
      // 			});
      // 		}
      // 	}
      // 	// Transform `fieldsSelection` into `selection`
      // 	// `fieldsSelection` shouldn't be used after this point
      // 	// for (const { tsKey, value, isExtra } of fieldsSelection) {
      // 	// 	selection.push({
      // 	// 		dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey]!.name,
      // 	// 		tsKey,
      // 	// 		field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
      // 	// 		relationTableTsKey: undefined,
      // 	// 		isJson: false,
      // 	// 		isExtra,
      // 	// 		selection: [],
      // 	// 	});
      // 	// }
      // 	let orderByOrig = typeof config.orderBy === 'function'
      // 		? config.orderBy(aliasedFields, orderByOperators)
      // 		: config.orderBy ?? [];
      // 	if (!Array.isArray(orderByOrig)) {
      // 		orderByOrig = [orderByOrig];
      // 	}
      // 	const orderBy = orderByOrig.map((orderByValue) => {
      // 		if (is(orderByValue, Column)) {
      // 			return aliasedTableColumn(orderByValue, tableAlias) as PgColumn;
      // 		}
      // 		return mapColumnsInSQLToAlias(orderByValue, tableAlias);
      // 	});
      // 	const limit = isInnermostQuery ? config.limit : undefined;
      // 	const offset = isInnermostQuery ? config.offset : undefined;
      // 	// For non-root queries without additional config except columns, return a table with selection
      // 	if (
      // 		!isRoot
      // 		&& initiallySelectedRelations.length === 0
      // 		&& selectedExtras.length === 0
      // 		&& !where
      // 		&& orderBy.length === 0
      // 		&& limit === undefined
      // 		&& offset === undefined
      // 	) {
      // 		return {
      // 			tableTsKey: tableConfig.tsName,
      // 			sql: table,
      // 			selection: selectedColumns.map((key) => ({
      // 				dbKey: tableConfig.columns[key]!.name,
      // 				tsKey: key,
      // 				field: tableConfig.columns[key] as PgColumn,
      // 				relationTableTsKey: undefined,
      // 				isJson: false,
      // 				selection: [],
      // 			})),
      // 		};
      // 	}
      // 	const selectedRelationsWithoutPK:
      // 	// Process all relations without primary keys, because they need to be joined differently and will all be on the same query level
      // 	for (
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationConfigValue,
      // 			relation,
      // 		} of initiallySelectedRelations
      // 	) {
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTable = schema[relationTableTsName]!;
      // 		if (relationTable.primaryKey.length > 0) {
      // 			continue;
      // 		}
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelation = this.buildRelationalQueryWithoutPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationConfigValue,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 			nestedQueryRelation: relation,
      // 		});
      // 		const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier('data')}`.as(selectedRelationTsKey);
      // 		joins.push({
      // 			on: sql`true`,
      // 			table: new Subquery(builtRelation.sql as SQL, {}, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: true,
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelation.selection,
      // 		});
      // 	}
      // 	const oneRelations = initiallySelectedRelations.filter((r): r is typeof r & { relation: One } =>
      // 		is(r.relation, One)
      // 	);
      // 	// Process all One relations with PKs, because they can all be joined on the same level
      // 	for (
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationConfigValue,
      // 			relation,
      // 		} of oneRelations
      // 	) {
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const relationTable = schema[relationTableTsName]!;
      // 		if (relationTable.primaryKey.length === 0) {
      // 			continue;
      // 		}
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelation = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationConfigValue,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 		});
      // 		const field = sql`case when ${sql.identifier(relationTableAlias)} is null then null else json_build_array(${
      // 			sql.join(
      // 				builtRelation.selection.map(({ field }) =>
      // 					is(field, SQL.Aliased)
      // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
      // 						: is(field, Column)
      // 						? aliasedTableColumn(field, relationTableAlias)
      // 						: field
      // 				),
      // 				sql`, `,
      // 			)
      // 		}) end`.as(selectedRelationTsKey);
      // 		const isLateralJoin = is(builtRelation.sql, SQL);
      // 		joins.push({
      // 			on: isLateralJoin ? sql`true` : joinOn,
      // 			table: is(builtRelation.sql, SQL)
      // 				? new Subquery(builtRelation.sql, {}, relationTableAlias)
      // 				: aliasedTable(builtRelation.sql, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: is(builtRelation.sql, SQL),
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelation.selection,
      // 		});
      // 	}
      // 	let distinct: PgSelectConfig['distinct'];
      // 	let tableFrom: PgTable | Subquery = table;
      // 	// Process first Many relation - each one requires a nested subquery
      // 	const manyRelation = manyRelations[0];
      // 	if (manyRelation) {
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationQueryConfig,
      // 			relation,
      // 		} = manyRelation;
      // 		distinct = {
      // 			on: tableConfig.primaryKey.map((c) => aliasedTableColumn(c as PgColumn, tableAlias)),
      // 		};
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelationJoin = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationQueryConfig,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 		});
      // 		const builtRelationSelectionField = sql`case when ${
      // 			sql.identifier(relationTableAlias)
      // 		} is null then '[]' else json_agg(json_build_array(${
      // 			sql.join(
      // 				builtRelationJoin.selection.map(({ field }) =>
      // 					is(field, SQL.Aliased)
      // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
      // 						: is(field, Column)
      // 						? aliasedTableColumn(field, relationTableAlias)
      // 						: field
      // 				),
      // 				sql`, `,
      // 			)
      // 		})) over (partition by ${sql.join(distinct.on, sql`, `)}) end`.as(selectedRelationTsKey);
      // 		const isLateralJoin = is(builtRelationJoin.sql, SQL);
      // 		joins.push({
      // 			on: isLateralJoin ? sql`true` : joinOn,
      // 			table: isLateralJoin
      // 				? new Subquery(builtRelationJoin.sql as SQL, {}, relationTableAlias)
      // 				: aliasedTable(builtRelationJoin.sql as PgTable, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: isLateralJoin,
      // 		});
      // 		// Build the "from" subquery with the remaining Many relations
      // 		const builtTableFrom = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table,
      // 			tableConfig,
      // 			queryConfig: {
      // 				...config,
      // 				where: undefined,
      // 				orderBy: undefined,
      // 				limit: undefined,
      // 				offset: undefined,
      // 				with: manyRelations.slice(1).reduce<NonNullable<typeof config['with']>>(
      // 					(result, { tsKey, queryConfig: configValue }) => {
      // 						result[tsKey] = configValue;
      // 						return result;
      // 					},
      // 					{},
      // 				),
      // 			},
      // 			tableAlias,
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field: builtRelationSelectionField,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelationJoin.selection,
      // 		});
      // 		// selection = builtTableFrom.selection.map((item) =>
      // 		// 	is(item.field, SQL.Aliased)
      // 		// 		? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
      // 		// 		: item
      // 		// );
      // 		// selectionForBuild = [{
      // 		// 	dbKey: '*',
      // 		// 	tsKey: '*',
      // 		// 	field: sql`${sql.identifier(tableAlias)}.*`,
      // 		// 	selection: [],
      // 		// 	isJson: false,
      // 		// 	relationTableTsKey: undefined,
      // 		// }];
      // 		// const newSelectionItem: (typeof selection)[number] = {
      // 		// 	dbKey: selectedRelationTsKey,
      // 		// 	tsKey: selectedRelationTsKey,
      // 		// 	field,
      // 		// 	relationTableTsKey: relationTableTsName,
      // 		// 	isJson: true,
      // 		// 	selection: builtRelationJoin.selection,
      // 		// };
      // 		// selection.push(newSelectionItem);
      // 		// selectionForBuild.push(newSelectionItem);
      // 		tableFrom = is(builtTableFrom.sql, PgTable)
      // 			? builtTableFrom.sql
      // 			: new Subquery(builtTableFrom.sql, {}, tableAlias);
      // 	}
      // 	if (selectedColumns.length === 0 && selectedRelations.length === 0 && selectedExtras.length === 0) {
      // 		throw new DrizzleError(`No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")`);
      // 	}
      // 	let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'];
      // 	function prepareSelectedColumns() {
      // 		return selectedColumns.map((key) => ({
      // 			dbKey: tableConfig.columns[key]!.name,
      // 			tsKey: key,
      // 			field: tableConfig.columns[key] as PgColumn,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 	}
      // 	function prepareSelectedExtras() {
      // 		return selectedExtras.map((item) => ({
      // 			dbKey: item.value.fieldAlias,
      // 			tsKey: item.tsKey,
      // 			field: item.value,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 	}
      // 	if (isRoot) {
      // 		selection = [
      // 			...prepareSelectedColumns(),
      // 			...prepareSelectedExtras(),
      // 		];
      // 	}
      // 	if (hasUserDefinedWhere || orderBy.length > 0) {
      // 		tableFrom = new Subquery(
      // 			this.buildSelectQuery({
      // 				table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
      // 				fields: {},
      // 				fieldsFlat: selectionForBuild.map(({ field }) => ({
      // 					path: [],
      // 					field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
      // 				})),
      // 				joins,
      // 				distinct,
      // 			}),
      // 			{},
      // 			tableAlias,
      // 		);
      // 		selectionForBuild = selection.map((item) =>
      // 			is(item.field, SQL.Aliased)
      // 				? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
      // 				: item
      // 		);
      // 		joins = [];
      // 		distinct = undefined;
      // 	}
      // 	const result = this.buildSelectQuery({
      // 		table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
      // 		fields: {},
      // 		fieldsFlat: selectionForBuild.map(({ field }) => ({
      // 			path: [],
      // 			field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
      // 		})),
      // 		where,
      // 		limit,
      // 		offset,
      // 		joins,
      // 		orderBy,
      // 		distinct,
      // 	});
      // 	return {
      // 		tableTsKey: tableConfig.tsName,
      // 		sql: result,
      // 		selection,
      // 	};
      // }
      buildRelationalQueryWithoutPK({
        fullSchema,
        schema,
        tableNamesMap,
        table,
        tableConfig,
        queryConfig: config,
        tableAlias,
        nestedQueryRelation,
        joinOn
      }) {
        let selection = [];
        let limit, offset, orderBy = [], where;
        const joins = [];
        if (config === true) {
          const selectionEntries = Object.entries(tableConfig.columns);
          selection = selectionEntries.map(([key, value]) => ({
            dbKey: value.name,
            tsKey: key,
            field: (0, import_alias.aliasedTableColumn)(value, tableAlias),
            relationTableTsKey: void 0,
            isJson: false,
            selection: []
          }));
        } else {
          const aliasedColumns = Object.fromEntries(
            Object.entries(tableConfig.columns).map(([key, value]) => [key, (0, import_alias.aliasedTableColumn)(value, tableAlias)])
          );
          if (config.where) {
            const whereSql = typeof config.where === "function" ? config.where(aliasedColumns, (0, import_relations.getOperators)()) : config.where;
            where = whereSql && (0, import_alias.mapColumnsInSQLToAlias)(whereSql, tableAlias);
          }
          const fieldsSelection = [];
          let selectedColumns = [];
          if (config.columns) {
            let isIncludeMode = false;
            for (const [field, value] of Object.entries(config.columns)) {
              if (value === void 0) {
                continue;
              }
              if (field in tableConfig.columns) {
                if (!isIncludeMode && value === true) {
                  isIncludeMode = true;
                }
                selectedColumns.push(field);
              }
            }
            if (selectedColumns.length > 0) {
              selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
            }
          } else {
            selectedColumns = Object.keys(tableConfig.columns);
          }
          for (const field of selectedColumns) {
            const column = tableConfig.columns[field];
            fieldsSelection.push({ tsKey: field, value: column });
          }
          let selectedRelations = [];
          if (config.with) {
            selectedRelations = Object.entries(config.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey] }));
          }
          let extras;
          if (config.extras) {
            extras = typeof config.extras === "function" ? config.extras(aliasedColumns, { sql: import_sql2.sql }) : config.extras;
            for (const [tsKey, value] of Object.entries(extras)) {
              fieldsSelection.push({
                tsKey,
                value: (0, import_alias.mapColumnsInAliasedSQLToAlias)(value, tableAlias)
              });
            }
          }
          for (const { tsKey, value } of fieldsSelection) {
            selection.push({
              dbKey: (0, import_entity.is)(value, import_sql2.SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
              tsKey,
              field: (0, import_entity.is)(value, import_column.Column) ? (0, import_alias.aliasedTableColumn)(value, tableAlias) : value,
              relationTableTsKey: void 0,
              isJson: false,
              selection: []
            });
          }
          let orderByOrig = typeof config.orderBy === "function" ? config.orderBy(aliasedColumns, (0, import_relations.getOrderByOperators)()) : config.orderBy ?? [];
          if (!Array.isArray(orderByOrig)) {
            orderByOrig = [orderByOrig];
          }
          orderBy = orderByOrig.map((orderByValue) => {
            if ((0, import_entity.is)(orderByValue, import_column.Column)) {
              return (0, import_alias.aliasedTableColumn)(orderByValue, tableAlias);
            }
            return (0, import_alias.mapColumnsInSQLToAlias)(orderByValue, tableAlias);
          });
          limit = config.limit;
          offset = config.offset;
          for (const {
            tsKey: selectedRelationTsKey,
            queryConfig: selectedRelationConfigValue,
            relation
          } of selectedRelations) {
            const normalizedRelation = (0, import_relations.normalizeRelation)(schema, tableNamesMap, relation);
            const relationTableName = (0, import_table2.getTableUniqueName)(relation.referencedTable);
            const relationTableTsName = tableNamesMap[relationTableName];
            const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
            const joinOn2 = (0, import_sql.and)(
              ...normalizedRelation.fields.map(
                (field2, i) => (0, import_sql.eq)(
                  (0, import_alias.aliasedTableColumn)(normalizedRelation.references[i], relationTableAlias),
                  (0, import_alias.aliasedTableColumn)(field2, tableAlias)
                )
              )
            );
            const builtRelation = this.buildRelationalQueryWithoutPK({
              fullSchema,
              schema,
              tableNamesMap,
              table: fullSchema[relationTableTsName],
              tableConfig: schema[relationTableTsName],
              queryConfig: (0, import_entity.is)(relation, import_relations.One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
              tableAlias: relationTableAlias,
              joinOn: joinOn2,
              nestedQueryRelation: relation
            });
            const field = import_sql2.sql`${import_sql2.sql.identifier(relationTableAlias)}.${import_sql2.sql.identifier("data")}`.as(selectedRelationTsKey);
            joins.push({
              on: import_sql2.sql`true`,
              table: new import_subquery.Subquery(builtRelation.sql, {}, relationTableAlias),
              alias: relationTableAlias,
              joinType: "left",
              lateral: true
            });
            selection.push({
              dbKey: selectedRelationTsKey,
              tsKey: selectedRelationTsKey,
              field,
              relationTableTsKey: relationTableTsName,
              isJson: true,
              selection: builtRelation.selection
            });
          }
        }
        if (selection.length === 0) {
          throw new import_errors.DrizzleError({ message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")` });
        }
        let result;
        where = (0, import_sql.and)(joinOn, where);
        if (nestedQueryRelation) {
          let field = import_sql2.sql`json_build_array(${import_sql2.sql.join(
            selection.map(
              ({ field: field2, tsKey, isJson }) => isJson ? import_sql2.sql`${import_sql2.sql.identifier(`${tableAlias}_${tsKey}`)}.${import_sql2.sql.identifier("data")}` : (0, import_entity.is)(field2, import_sql2.SQL.Aliased) ? field2.sql : field2
            ),
            import_sql2.sql`, `
          )})`;
          if ((0, import_entity.is)(nestedQueryRelation, import_relations.Many)) {
            field = import_sql2.sql`coalesce(json_agg(${field}${orderBy.length > 0 ? import_sql2.sql` order by ${import_sql2.sql.join(orderBy, import_sql2.sql`, `)}` : void 0}), '[]'::json)`;
          }
          const nestedSelection = [{
            dbKey: "data",
            tsKey: "data",
            field: field.as("data"),
            isJson: true,
            relationTableTsKey: tableConfig.tsName,
            selection
          }];
          const needsSubquery = limit !== void 0 || offset !== void 0 || orderBy.length > 0;
          if (needsSubquery) {
            result = this.buildSelectQuery({
              table: (0, import_alias.aliasedTable)(table, tableAlias),
              fields: {},
              fieldsFlat: [{
                path: [],
                field: import_sql2.sql.raw("*")
              }],
              where,
              limit,
              offset,
              orderBy,
              setOperators: []
            });
            where = void 0;
            limit = void 0;
            offset = void 0;
            orderBy = [];
          } else {
            result = (0, import_alias.aliasedTable)(table, tableAlias);
          }
          result = this.buildSelectQuery({
            table: (0, import_entity.is)(result, import_table.PgTable) ? result : new import_subquery.Subquery(result, {}, tableAlias),
            fields: {},
            fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
              path: [],
              field: (0, import_entity.is)(field2, import_column.Column) ? (0, import_alias.aliasedTableColumn)(field2, tableAlias) : field2
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        } else {
          result = this.buildSelectQuery({
            table: (0, import_alias.aliasedTable)(table, tableAlias),
            fields: {},
            fieldsFlat: selection.map(({ field }) => ({
              path: [],
              field: (0, import_entity.is)(field, import_column.Column) ? (0, import_alias.aliasedTableColumn)(field, tableAlias) : field
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        }
        return {
          tableTsKey: tableConfig.tsName,
          sql: result,
          selection
        };
      }
    };
  }
});

// node_modules/drizzle-orm/query-builders/query-builder.cjs
var require_query_builder = __commonJS({
  "node_modules/drizzle-orm/query-builders/query-builder.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_builder_exports = {};
    __export(query_builder_exports, {
      TypedQueryBuilder: () => TypedQueryBuilder
    });
    module2.exports = __toCommonJS(query_builder_exports);
    var import_entity = require_entity();
    var TypedQueryBuilder = class {
      static [import_entity.entityKind] = "TypedQueryBuilder";
      /** @internal */
      getSelectedFields() {
        return this._.selectedFields;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/select.cjs
var require_select2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/select.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except2, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except2)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var select_exports = {};
    __export(select_exports, {
      PgSelectBase: () => PgSelectBase,
      PgSelectBuilder: () => PgSelectBuilder,
      PgSelectQueryBuilderBase: () => PgSelectQueryBuilderBase,
      except: () => except,
      exceptAll: () => exceptAll,
      intersect: () => intersect,
      intersectAll: () => intersectAll,
      union: () => union,
      unionAll: () => unionAll
    });
    module2.exports = __toCommonJS(select_exports);
    var import_entity = require_entity();
    var import_view_base = require_view_base();
    var import_query_builder = require_query_builder();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table = require_table();
    var import_tracing = require_tracing();
    var import_utils = require_utils();
    var import_utils2 = require_utils();
    var import_view_common = require_view_common();
    var import_utils3 = require_utils3();
    var PgSelectBuilder = class {
      static [import_entity.entityKind] = "PgSelectBuilder";
      fields;
      session;
      dialect;
      withList = [];
      distinct;
      constructor(config) {
        this.fields = config.fields;
        this.session = config.session;
        this.dialect = config.dialect;
        if (config.withList) {
          this.withList = config.withList;
        }
        this.distinct = config.distinct;
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      /**
       * Specify the table, subquery, or other target that you're
       * building a select query against.
       *
       * {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FROM | Postgres from documentation}
       */
      from(source) {
        const isPartialSelect = !!this.fields;
        const src = source;
        let fields;
        if (this.fields) {
          fields = this.fields;
        } else if ((0, import_entity.is)(src, import_subquery.Subquery)) {
          fields = Object.fromEntries(
            Object.keys(src._.selectedFields).map((key) => [key, src[key]])
          );
        } else if ((0, import_entity.is)(src, import_view_base.PgViewBase)) {
          fields = src[import_view_common.ViewBaseConfig].selectedFields;
        } else if ((0, import_entity.is)(src, import_sql.SQL)) {
          fields = {};
        } else {
          fields = (0, import_utils.getTableColumns)(src);
        }
        return new PgSelectBase({
          table: src,
          fields,
          isPartialSelect,
          session: this.session,
          dialect: this.dialect,
          withList: this.withList,
          distinct: this.distinct
        }).setToken(this.authToken);
      }
    };
    var PgSelectQueryBuilderBase = class extends import_query_builder.TypedQueryBuilder {
      static [import_entity.entityKind] = "PgSelectQueryBuilder";
      _;
      config;
      joinsNotNullableMap;
      tableName;
      isPartialSelect;
      session;
      dialect;
      cacheConfig = void 0;
      usedTables = /* @__PURE__ */ new Set();
      constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
        super();
        this.config = {
          withList,
          table,
          fields: { ...fields },
          distinct,
          setOperators: []
        };
        this.isPartialSelect = isPartialSelect;
        this.session = session;
        this.dialect = dialect;
        this._ = {
          selectedFields: fields,
          config: this.config
        };
        this.tableName = (0, import_utils.getTableLikeName)(table);
        this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
        for (const item of (0, import_utils3.extractUsedTable)(table)) this.usedTables.add(item);
      }
      /** @internal */
      getUsedTables() {
        return [...this.usedTables];
      }
      createJoin(joinType, lateral) {
        return (table, on) => {
          const baseTableName = this.tableName;
          const tableName = (0, import_utils.getTableLikeName)(table);
          for (const item of (0, import_utils3.extractUsedTable)(table)) this.usedTables.add(item);
          if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
            throw new Error(`Alias "${tableName}" is already used in this query`);
          }
          if (!this.isPartialSelect) {
            if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
              this.config.fields = {
                [baseTableName]: this.config.fields
              };
            }
            if (typeof tableName === "string" && !(0, import_entity.is)(table, import_sql.SQL)) {
              const selection = (0, import_entity.is)(table, import_subquery.Subquery) ? table._.selectedFields : (0, import_entity.is)(table, import_sql.View) ? table[import_view_common.ViewBaseConfig].selectedFields : table[import_table.Table.Symbol.Columns];
              this.config.fields[tableName] = selection;
            }
          }
          if (typeof on === "function") {
            on = on(
              new Proxy(
                this.config.fields,
                new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              )
            );
          }
          if (!this.config.joins) {
            this.config.joins = [];
          }
          this.config.joins.push({ on, table, joinType, alias: tableName, lateral });
          if (typeof tableName === "string") {
            switch (joinType) {
              case "left": {
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
              case "right": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "cross":
              case "inner": {
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "full": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
            }
          }
          return this;
        };
      }
      /**
       * Executes a `left join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#left-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet | null; }[] = await db.select()
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number | null; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      leftJoin = this.createJoin("left", false);
      /**
       * Executes a `left join lateral` operation by adding subquery to the current query.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#left-join-lateral}
       *
       * @param table the subquery to join.
       * @param on the `on` clause.
       */
      leftJoinLateral = this.createJoin("left", true);
      /**
       * Executes a `right join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the joined table with the corresponding row from the main table, if a match is found. If no matching row exists, it sets all columns of the main table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#right-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      rightJoin = this.createJoin("right", false);
      /**
       * Executes an `inner join` operation, creating a new table by combining rows from two tables that have matching values.
       *
       * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      innerJoin = this.createJoin("inner", false);
      /**
       * Executes an `inner join lateral` operation, creating a new table by combining rows from two queries that have matching values.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join-lateral}
       *
       * @param table the subquery to join.
       * @param on the `on` clause.
       */
      innerJoinLateral = this.createJoin("inner", true);
      /**
       * Executes a `full join` operation by combining rows from two tables into a new table.
       *
       * Calling this method retrieves all rows from both main and joined tables, merging rows with matching values and filling in `null` for non-matching columns.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#full-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet | null; }[] = await db.select()
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number | null; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      fullJoin = this.createJoin("full", false);
      /**
       * Executes a `cross join` operation by combining rows from two tables into a new table.
       *
       * Calling this method retrieves all rows from both main and joined tables, merging all rows from each table.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join}
       *
       * @param table the table to join.
       *
       * @example
       *
       * ```ts
       * // Select all users, each user with every pet
       * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .crossJoin(pets)
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .crossJoin(pets)
       * ```
       */
      crossJoin = this.createJoin("cross", false);
      /**
       * Executes a `cross join lateral` operation by combining rows from two queries into a new table.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method retrieves all rows from both main and joined queries, merging all rows from each query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join-lateral}
       *
       * @param table the query to join.
       */
      crossJoinLateral = this.createJoin("cross", true);
      createSetOperator(type, isAll) {
        return (rightSelection) => {
          const rightSelect = typeof rightSelection === "function" ? rightSelection(getPgSetOperators()) : rightSelection;
          if (!(0, import_utils.haveSameKeys)(this.getSelectedFields(), rightSelect.getSelectedFields())) {
            throw new Error(
              "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
            );
          }
          this.config.setOperators.push({ type, isAll, rightSelect });
          return this;
        };
      }
      /**
       * Adds `union` set operator to the query.
       *
       * Calling this method will combine the result sets of the `select` statements and remove any duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union}
       *
       * @example
       *
       * ```ts
       * // Select all unique names from customers and users tables
       * await db.select({ name: users.name })
       *   .from(users)
       *   .union(
       *     db.select({ name: customers.name }).from(customers)
       *   );
       * // or
       * import { union } from 'drizzle-orm/pg-core'
       *
       * await union(
       *   db.select({ name: users.name }).from(users),
       *   db.select({ name: customers.name }).from(customers)
       * );
       * ```
       */
      union = this.createSetOperator("union", false);
      /**
       * Adds `union all` set operator to the query.
       *
       * Calling this method will combine the result-set of the `select` statements and keep all duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union-all}
       *
       * @example
       *
       * ```ts
       * // Select all transaction ids from both online and in-store sales
       * await db.select({ transaction: onlineSales.transactionId })
       *   .from(onlineSales)
       *   .unionAll(
       *     db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       *   );
       * // or
       * import { unionAll } from 'drizzle-orm/pg-core'
       *
       * await unionAll(
       *   db.select({ transaction: onlineSales.transactionId }).from(onlineSales),
       *   db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       * );
       * ```
       */
      unionAll = this.createSetOperator("union", true);
      /**
       * Adds `intersect` set operator to the query.
       *
       * Calling this method will retain only the rows that are present in both result sets and eliminate duplicates.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect}
       *
       * @example
       *
       * ```ts
       * // Select course names that are offered in both departments A and B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .intersect(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { intersect } from 'drizzle-orm/pg-core'
       *
       * await intersect(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      intersect = this.createSetOperator("intersect", false);
      /**
       * Adds `intersect all` set operator to the query.
       *
       * Calling this method will retain only the rows that are present in both result sets including all duplicates.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect-all}
       *
       * @example
       *
       * ```ts
       * // Select all products and quantities that are ordered by both regular and VIP customers
       * await db.select({
       *   productId: regularCustomerOrders.productId,
       *   quantityOrdered: regularCustomerOrders.quantityOrdered
       * })
       * .from(regularCustomerOrders)
       * .intersectAll(
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * // or
       * import { intersectAll } from 'drizzle-orm/pg-core'
       *
       * await intersectAll(
       *   db.select({
       *     productId: regularCustomerOrders.productId,
       *     quantityOrdered: regularCustomerOrders.quantityOrdered
       *   })
       *   .from(regularCustomerOrders),
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * ```
       */
      intersectAll = this.createSetOperator("intersect", true);
      /**
       * Adds `except` set operator to the query.
       *
       * Calling this method will retrieve all unique rows from the left query, except for the rows that are present in the result set of the right query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#except}
       *
       * @example
       *
       * ```ts
       * // Select all courses offered in department A but not in department B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .except(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { except } from 'drizzle-orm/pg-core'
       *
       * await except(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      except = this.createSetOperator("except", false);
      /**
       * Adds `except all` set operator to the query.
       *
       * Calling this method will retrieve all rows from the left query, except for the rows that are present in the result set of the right query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#except-all}
       *
       * @example
       *
       * ```ts
       * // Select all products that are ordered by regular customers but not by VIP customers
       * await db.select({
       *   productId: regularCustomerOrders.productId,
       *   quantityOrdered: regularCustomerOrders.quantityOrdered,
       * })
       * .from(regularCustomerOrders)
       * .exceptAll(
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered,
       *   })
       *   .from(vipCustomerOrders)
       * );
       * // or
       * import { exceptAll } from 'drizzle-orm/pg-core'
       *
       * await exceptAll(
       *   db.select({
       *     productId: regularCustomerOrders.productId,
       *     quantityOrdered: regularCustomerOrders.quantityOrdered
       *   })
       *   .from(regularCustomerOrders),
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * ```
       */
      exceptAll = this.createSetOperator("except", true);
      /** @internal */
      addSetOperators(setOperators) {
        this.config.setOperators.push(...setOperators);
        return this;
      }
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#filtering}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be selected.
       *
       * ```ts
       * // Select all cars with green color
       * await db.select().from(cars).where(eq(cars.color, 'green'));
       * // or
       * await db.select().from(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Select all BMW cars with a green color
       * await db.select().from(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Select all cars with the green or blue color
       * await db.select().from(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        if (typeof where === "function") {
          where = where(
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.where = where;
        return this;
      }
      /**
       * Adds a `having` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition. It is typically used with aggregate functions to filter the aggregated data based on a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#aggregations}
       *
       * @param having the `having` clause.
       *
       * @example
       *
       * ```ts
       * // Select all brands with more than one car
       * await db.select({
       * 	brand: cars.brand,
       * 	count: sql<number>`cast(count(${cars.id}) as int)`,
       * })
       *   .from(cars)
       *   .groupBy(cars.brand)
       *   .having(({ count }) => gt(count, 1));
       * ```
       */
      having(having) {
        if (typeof having === "function") {
          having = having(
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.having = having;
        return this;
      }
      groupBy(...columns) {
        if (typeof columns[0] === "function") {
          const groupBy = columns[0](
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
        } else {
          this.config.groupBy = columns;
        }
        return this;
      }
      orderBy(...columns) {
        if (typeof columns[0] === "function") {
          const orderBy = columns[0](
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        } else {
          const orderByArray = columns;
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        }
        return this;
      }
      /**
       * Adds a `limit` clause to the query.
       *
       * Calling this method will set the maximum number of rows that will be returned by this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param limit the `limit` clause.
       *
       * @example
       *
       * ```ts
       * // Get the first 10 people from this query.
       * await db.select().from(people).limit(10);
       * ```
       */
      limit(limit) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).limit = limit;
        } else {
          this.config.limit = limit;
        }
        return this;
      }
      /**
       * Adds an `offset` clause to the query.
       *
       * Calling this method will skip a number of rows when returning results from this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param offset the `offset` clause.
       *
       * @example
       *
       * ```ts
       * // Get the 10th-20th people from this query.
       * await db.select().from(people).offset(10).limit(10);
       * ```
       */
      offset(offset) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).offset = offset;
        } else {
          this.config.offset = offset;
        }
        return this;
      }
      /**
       * Adds a `for` clause to the query.
       *
       * Calling this method will specify a lock strength for this query that controls how strictly it acquires exclusive access to the rows being queried.
       *
       * See docs: {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE}
       *
       * @param strength the lock strength.
       * @param config the lock configuration.
       */
      for(strength, config = {}) {
        this.config.lockingClause = { strength, config };
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildSelectQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      as(alias) {
        const usedTables = [];
        usedTables.push(...(0, import_utils3.extractUsedTable)(this.config.table));
        if (this.config.joins) {
          for (const it of this.config.joins) usedTables.push(...(0, import_utils3.extractUsedTable)(it.table));
        }
        return new Proxy(
          new import_subquery.Subquery(this.getSQL(), this.config.fields, alias, false, [...new Set(usedTables)]),
          new import_selection_proxy.SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      /** @internal */
      getSelectedFields() {
        return new Proxy(
          this.config.fields,
          new import_selection_proxy.SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      $dynamic() {
        return this;
      }
      $withCache(config) {
        this.cacheConfig = config === void 0 ? { config: {}, enable: true, autoInvalidate: true } : config === false ? { enable: false } : { enable: true, autoInvalidate: true, ...config };
        return this;
      }
    };
    var PgSelectBase = class extends PgSelectQueryBuilderBase {
      static [import_entity.entityKind] = "PgSelect";
      /** @internal */
      _prepare(name) {
        const { session, config, dialect, joinsNotNullableMap, authToken, cacheConfig, usedTables } = this;
        if (!session) {
          throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
        }
        const { fields } = config;
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          const fieldsList = (0, import_utils2.orderSelectedFields)(fields);
          const query = session.prepareQuery(dialect.sqlToQuery(this.getSQL()), fieldsList, name, true, void 0, {
            type: "select",
            tables: [...usedTables]
          }, cacheConfig);
          query.joinsNotNullableMap = joinsNotNullableMap;
          return query.setToken(authToken);
        });
      }
      /**
       * Create a prepared statement for this query. This allows
       * the database to remember this query for the given session
       * and call it by name, rather than specifying the full query.
       *
       * {@link https://www.postgresql.org/docs/current/sql-prepare.html | Postgres prepare documentation}
       */
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
    };
    (0, import_utils.applyMixins)(PgSelectBase, [import_query_promise.QueryPromise]);
    function createSetOperator(type, isAll) {
      return (leftSelect, rightSelect, ...restSelects) => {
        const setOperators = [rightSelect, ...restSelects].map((select) => ({
          type,
          isAll,
          rightSelect: select
        }));
        for (const setOperator of setOperators) {
          if (!(0, import_utils.haveSameKeys)(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
            throw new Error(
              "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
            );
          }
        }
        return leftSelect.addSetOperators(setOperators);
      };
    }
    var getPgSetOperators = () => ({
      union,
      unionAll,
      intersect,
      intersectAll,
      except,
      exceptAll
    });
    var union = createSetOperator("union", false);
    var unionAll = createSetOperator("union", true);
    var intersect = createSetOperator("intersect", false);
    var intersectAll = createSetOperator("intersect", true);
    var except = createSetOperator("except", false);
    var exceptAll = createSetOperator("except", true);
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/query-builder.cjs
var require_query_builder2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/query-builder.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_builder_exports = {};
    __export(query_builder_exports, {
      QueryBuilder: () => QueryBuilder
    });
    module2.exports = __toCommonJS(query_builder_exports);
    var import_entity = require_entity();
    var import_dialect = require_dialect();
    var import_selection_proxy = require_selection_proxy();
    var import_subquery = require_subquery();
    var import_select = require_select2();
    var QueryBuilder = class {
      static [import_entity.entityKind] = "PgQueryBuilder";
      dialect;
      dialectConfig;
      constructor(dialect) {
        this.dialect = (0, import_entity.is)(dialect, import_dialect.PgDialect) ? dialect : void 0;
        this.dialectConfig = (0, import_entity.is)(dialect, import_dialect.PgDialect) ? void 0 : dialect;
      }
      $with = (alias, selection) => {
        const queryBuilder = this;
        const as = (qb) => {
          if (typeof qb === "function") {
            qb = qb(queryBuilder);
          }
          return new Proxy(
            new import_subquery.WithSubquery(
              qb.getSQL(),
              selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
              alias,
              true
            ),
            new import_selection_proxy.SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
          );
        };
        return { as };
      };
      with(...queries) {
        const self = this;
        function select(fields) {
          return new import_select.PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            withList: queries
          });
        }
        function selectDistinct(fields) {
          return new import_select.PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            distinct: true
          });
        }
        function selectDistinctOn(on, fields) {
          return new import_select.PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            distinct: { on }
          });
        }
        return { select, selectDistinct, selectDistinctOn };
      }
      select(fields) {
        return new import_select.PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect()
        });
      }
      selectDistinct(fields) {
        return new import_select.PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect(),
          distinct: true
        });
      }
      selectDistinctOn(on, fields) {
        return new import_select.PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect(),
          distinct: { on }
        });
      }
      // Lazy load dialect to avoid circular dependency
      getDialect() {
        if (!this.dialect) {
          this.dialect = new import_dialect.PgDialect(this.dialectConfig);
        }
        return this.dialect;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/view.cjs
var require_view = __commonJS({
  "node_modules/drizzle-orm/pg-core/view.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_exports = {};
    __export(view_exports, {
      DefaultViewBuilderCore: () => DefaultViewBuilderCore,
      ManualMaterializedViewBuilder: () => ManualMaterializedViewBuilder,
      ManualViewBuilder: () => ManualViewBuilder,
      MaterializedViewBuilder: () => MaterializedViewBuilder,
      MaterializedViewBuilderCore: () => MaterializedViewBuilderCore,
      PgMaterializedView: () => PgMaterializedView,
      PgMaterializedViewConfig: () => PgMaterializedViewConfig,
      PgView: () => PgView,
      ViewBuilder: () => ViewBuilder,
      isPgMaterializedView: () => isPgMaterializedView,
      isPgView: () => isPgView,
      pgMaterializedView: () => pgMaterializedView,
      pgMaterializedViewWithSchema: () => pgMaterializedViewWithSchema,
      pgView: () => pgView,
      pgViewWithSchema: () => pgViewWithSchema
    });
    module2.exports = __toCommonJS(view_exports);
    var import_entity = require_entity();
    var import_selection_proxy = require_selection_proxy();
    var import_utils = require_utils();
    var import_query_builder = require_query_builder2();
    var import_table = require_table2();
    var import_view_base = require_view_base();
    var import_view_common = require_view_common2();
    var DefaultViewBuilderCore = class {
      constructor(name, schema) {
        this.name = name;
        this.schema = schema;
      }
      static [import_entity.entityKind] = "PgDefaultViewBuilderCore";
      config = {};
      with(config) {
        this.config.with = config;
        return this;
      }
    };
    var ViewBuilder = class extends DefaultViewBuilderCore {
      static [import_entity.entityKind] = "PgViewBuilder";
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new import_query_builder.QueryBuilder());
        }
        const selectionProxy = new import_selection_proxy.SelectionProxyHandler({
          alias: this.name,
          sqlBehavior: "error",
          sqlAliasedBehavior: "alias",
          replaceOriginalName: true
        });
        const aliasedSelection = new Proxy(qb.getSelectedFields(), selectionProxy);
        return new Proxy(
          new PgView({
            pgConfig: this.config,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: aliasedSelection,
              query: qb.getSQL().inlineParams()
            }
          }),
          selectionProxy
        );
      }
    };
    var ManualViewBuilder = class extends DefaultViewBuilderCore {
      static [import_entity.entityKind] = "PgManualViewBuilder";
      columns;
      constructor(name, columns, schema) {
        super(name, schema);
        this.columns = (0, import_utils.getTableColumns)((0, import_table.pgTable)(name, columns));
      }
      existing() {
        return new Proxy(
          new PgView({
            pgConfig: void 0,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: void 0
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
      as(query) {
        return new Proxy(
          new PgView({
            pgConfig: this.config,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: query.inlineParams()
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
    };
    var MaterializedViewBuilderCore = class {
      constructor(name, schema) {
        this.name = name;
        this.schema = schema;
      }
      static [import_entity.entityKind] = "PgMaterializedViewBuilderCore";
      config = {};
      using(using) {
        this.config.using = using;
        return this;
      }
      with(config) {
        this.config.with = config;
        return this;
      }
      tablespace(tablespace) {
        this.config.tablespace = tablespace;
        return this;
      }
      withNoData() {
        this.config.withNoData = true;
        return this;
      }
    };
    var MaterializedViewBuilder = class extends MaterializedViewBuilderCore {
      static [import_entity.entityKind] = "PgMaterializedViewBuilder";
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new import_query_builder.QueryBuilder());
        }
        const selectionProxy = new import_selection_proxy.SelectionProxyHandler({
          alias: this.name,
          sqlBehavior: "error",
          sqlAliasedBehavior: "alias",
          replaceOriginalName: true
        });
        const aliasedSelection = new Proxy(qb.getSelectedFields(), selectionProxy);
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              with: this.config.with,
              using: this.config.using,
              tablespace: this.config.tablespace,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: aliasedSelection,
              query: qb.getSQL().inlineParams()
            }
          }),
          selectionProxy
        );
      }
    };
    var ManualMaterializedViewBuilder = class extends MaterializedViewBuilderCore {
      static [import_entity.entityKind] = "PgManualMaterializedViewBuilder";
      columns;
      constructor(name, columns, schema) {
        super(name, schema);
        this.columns = (0, import_utils.getTableColumns)((0, import_table.pgTable)(name, columns));
      }
      existing() {
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              tablespace: this.config.tablespace,
              using: this.config.using,
              with: this.config.with,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: void 0
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
      as(query) {
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              tablespace: this.config.tablespace,
              using: this.config.using,
              with: this.config.with,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: query.inlineParams()
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
    };
    var PgView = class extends import_view_base.PgViewBase {
      static [import_entity.entityKind] = "PgView";
      [import_view_common.PgViewConfig];
      constructor({ pgConfig, config }) {
        super(config);
        if (pgConfig) {
          this[import_view_common.PgViewConfig] = {
            with: pgConfig.with
          };
        }
      }
    };
    var PgMaterializedViewConfig = /* @__PURE__ */ Symbol.for("drizzle:PgMaterializedViewConfig");
    var PgMaterializedView = class extends import_view_base.PgViewBase {
      static [import_entity.entityKind] = "PgMaterializedView";
      [PgMaterializedViewConfig];
      constructor({ pgConfig, config }) {
        super(config);
        this[PgMaterializedViewConfig] = {
          with: pgConfig?.with,
          using: pgConfig?.using,
          tablespace: pgConfig?.tablespace,
          withNoData: pgConfig?.withNoData
        };
      }
    };
    function pgViewWithSchema(name, selection, schema) {
      if (selection) {
        return new ManualViewBuilder(name, selection, schema);
      }
      return new ViewBuilder(name, schema);
    }
    function pgMaterializedViewWithSchema(name, selection, schema) {
      if (selection) {
        return new ManualMaterializedViewBuilder(name, selection, schema);
      }
      return new MaterializedViewBuilder(name, schema);
    }
    function pgView(name, columns) {
      return pgViewWithSchema(name, columns, void 0);
    }
    function pgMaterializedView(name, columns) {
      return pgMaterializedViewWithSchema(name, columns, void 0);
    }
    function isPgView(obj) {
      return (0, import_entity.is)(obj, PgView);
    }
    function isPgMaterializedView(obj) {
      return (0, import_entity.is)(obj, PgMaterializedView);
    }
  }
});

// node_modules/drizzle-orm/pg-core/utils.cjs
var require_utils3 = __commonJS({
  "node_modules/drizzle-orm/pg-core/utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      extractUsedTable: () => extractUsedTable,
      getMaterializedViewConfig: () => getMaterializedViewConfig,
      getTableConfig: () => getTableConfig,
      getViewConfig: () => getViewConfig
    });
    module2.exports = __toCommonJS(utils_exports);
    var import_entity = require_entity();
    var import_table = require_table2();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table2 = require_table();
    var import_view_common = require_view_common();
    var import_checks = require_checks();
    var import_foreign_keys = require_foreign_keys();
    var import_indexes = require_indexes();
    var import_policies = require_policies();
    var import_primary_keys = require_primary_keys();
    var import_unique_constraint = require_unique_constraint();
    var import_view_common2 = require_view_common2();
    var import_view = require_view();
    function getTableConfig(table) {
      const columns = Object.values(table[import_table2.Table.Symbol.Columns]);
      const indexes = [];
      const checks = [];
      const primaryKeys = [];
      const foreignKeys = Object.values(table[import_table.PgTable.Symbol.InlineForeignKeys]);
      const uniqueConstraints = [];
      const name = table[import_table2.Table.Symbol.Name];
      const schema = table[import_table2.Table.Symbol.Schema];
      const policies = [];
      const enableRLS = table[import_table.PgTable.Symbol.EnableRLS];
      const extraConfigBuilder = table[import_table.PgTable.Symbol.ExtraConfigBuilder];
      if (extraConfigBuilder !== void 0) {
        const extraConfig = extraConfigBuilder(table[import_table2.Table.Symbol.ExtraConfigColumns]);
        const extraValues = Array.isArray(extraConfig) ? extraConfig.flat(1) : Object.values(extraConfig);
        for (const builder of extraValues) {
          if ((0, import_entity.is)(builder, import_indexes.IndexBuilder)) {
            indexes.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_checks.CheckBuilder)) {
            checks.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_unique_constraint.UniqueConstraintBuilder)) {
            uniqueConstraints.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_primary_keys.PrimaryKeyBuilder)) {
            primaryKeys.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_foreign_keys.ForeignKeyBuilder)) {
            foreignKeys.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_policies.PgPolicy)) {
            policies.push(builder);
          }
        }
      }
      return {
        columns,
        indexes,
        foreignKeys,
        checks,
        primaryKeys,
        uniqueConstraints,
        name,
        schema,
        policies,
        enableRLS
      };
    }
    function extractUsedTable(table) {
      if ((0, import_entity.is)(table, import_table.PgTable)) {
        return [table[import_table2.Schema] ? `${table[import_table2.Schema]}.${table[import_table2.Table.Symbol.BaseName]}` : table[import_table2.Table.Symbol.BaseName]];
      }
      if ((0, import_entity.is)(table, import_subquery.Subquery)) {
        return table._.usedTables ?? [];
      }
      if ((0, import_entity.is)(table, import_sql.SQL)) {
        return table.usedTables ?? [];
      }
      return [];
    }
    function getViewConfig(view) {
      return {
        ...view[import_view_common.ViewBaseConfig],
        ...view[import_view_common2.PgViewConfig]
      };
    }
    function getMaterializedViewConfig(view) {
      return {
        ...view[import_view_common.ViewBaseConfig],
        ...view[import_view.PgMaterializedViewConfig]
      };
    }
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/delete.cjs
var require_delete = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/delete.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var delete_exports = {};
    __export(delete_exports, {
      PgDeleteBase: () => PgDeleteBase
    });
    module2.exports = __toCommonJS(delete_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_table = require_table();
    var import_tracing = require_tracing();
    var import_utils = require_utils();
    var import_utils2 = require_utils3();
    var PgDeleteBase = class extends import_query_promise.QueryPromise {
      constructor(table, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { table, withList };
      }
      static [import_entity.entityKind] = "PgDelete";
      config;
      cacheConfig;
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will delete only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be deleted.
       *
       * ```ts
       * // Delete all cars with green color
       * await db.delete(cars).where(eq(cars.color, 'green'));
       * // or
       * await db.delete(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Delete all BMW cars with a green color
       * await db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Delete all cars with the green or blue color
       * await db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields = this.config.table[import_table.Table.Symbol.Columns]) {
        this.config.returningFields = fields;
        this.config.returning = (0, import_utils.orderSelectedFields)(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildDeleteQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
            type: "delete",
            tables: (0, import_utils2.extractUsedTable)(this.config.table)
          }, this.cacheConfig);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new import_selection_proxy.SelectionProxyHandler({
            alias: (0, import_table.getTableName)(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/insert.cjs
var require_insert = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/insert.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var insert_exports = {};
    __export(insert_exports, {
      PgInsertBase: () => PgInsertBase,
      PgInsertBuilder: () => PgInsertBuilder
    });
    module2.exports = __toCommonJS(insert_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_table = require_table();
    var import_tracing = require_tracing();
    var import_utils = require_utils();
    var import_utils2 = require_utils3();
    var import_query_builder = require_query_builder2();
    var PgInsertBuilder = class {
      constructor(table, session, dialect, withList, overridingSystemValue_) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
        this.overridingSystemValue_ = overridingSystemValue_;
      }
      static [import_entity.entityKind] = "PgInsertBuilder";
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      overridingSystemValue() {
        this.overridingSystemValue_ = true;
        return this;
      }
      values(values) {
        values = Array.isArray(values) ? values : [values];
        if (values.length === 0) {
          throw new Error("values() must be called with at least one value");
        }
        const mappedValues = values.map((entry) => {
          const result = {};
          const cols = this.table[import_table.Table.Symbol.Columns];
          for (const colKey of Object.keys(entry)) {
            const colValue = entry[colKey];
            result[colKey] = (0, import_entity.is)(colValue, import_sql.SQL) ? colValue : new import_sql.Param(colValue, cols[colKey]);
          }
          return result;
        });
        return new PgInsertBase(
          this.table,
          mappedValues,
          this.session,
          this.dialect,
          this.withList,
          false,
          this.overridingSystemValue_
        ).setToken(this.authToken);
      }
      select(selectQuery) {
        const select = typeof selectQuery === "function" ? selectQuery(new import_query_builder.QueryBuilder()) : selectQuery;
        if (!(0, import_entity.is)(select, import_sql.SQL) && !(0, import_utils.haveSameKeys)(this.table[import_table.Columns], select._.selectedFields)) {
          throw new Error(
            "Insert select error: selected fields are not the same or are in a different order compared to the table definition"
          );
        }
        return new PgInsertBase(this.table, select, this.session, this.dialect, this.withList, true);
      }
    };
    var PgInsertBase = class extends import_query_promise.QueryPromise {
      constructor(table, values, session, dialect, withList, select, overridingSystemValue_) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { table, values, withList, select, overridingSystemValue_ };
      }
      static [import_entity.entityKind] = "PgInsert";
      config;
      cacheConfig;
      returning(fields = this.config.table[import_table.Table.Symbol.Columns]) {
        this.config.returningFields = fields;
        this.config.returning = (0, import_utils.orderSelectedFields)(fields);
        return this;
      }
      /**
       * Adds an `on conflict do nothing` clause to the query.
       *
       * Calling this method simply avoids inserting a row as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#on-conflict-do-nothing}
       *
       * @param config The `target` and `where` clauses.
       *
       * @example
       * ```ts
       * // Insert one row and cancel the insert if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing();
       *
       * // Explicitly specify conflict target
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing({ target: cars.id });
       * ```
       */
      onConflictDoNothing(config = {}) {
        if (config.target === void 0) {
          this.config.onConflict = import_sql.sql`do nothing`;
        } else {
          let targetColumn = "";
          targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
          const whereSql = config.where ? import_sql.sql` where ${config.where}` : void 0;
          this.config.onConflict = import_sql.sql`(${import_sql.sql.raw(targetColumn)})${whereSql} do nothing`;
        }
        return this;
      }
      /**
       * Adds an `on conflict do update` clause to the query.
       *
       * Calling this method will update the existing row that conflicts with the row proposed for insertion as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#upserts-and-conflicts}
       *
       * @param config The `target`, `set` and `where` clauses.
       *
       * @example
       * ```ts
       * // Update the row if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'Porsche' }
       *   });
       *
       * // Upsert with 'where' clause
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'newBMW' },
       *     targetWhere: sql`${cars.createdAt} > '2023-01-01'::date`,
       *   });
       * ```
       */
      onConflictDoUpdate(config) {
        if (config.where && (config.targetWhere || config.setWhere)) {
          throw new Error(
            'You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.'
          );
        }
        const whereSql = config.where ? import_sql.sql` where ${config.where}` : void 0;
        const targetWhereSql = config.targetWhere ? import_sql.sql` where ${config.targetWhere}` : void 0;
        const setWhereSql = config.setWhere ? import_sql.sql` where ${config.setWhere}` : void 0;
        const setSql = this.dialect.buildUpdateSet(this.config.table, (0, import_utils.mapUpdateSet)(this.config.table, config.set));
        let targetColumn = "";
        targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
        this.config.onConflict = import_sql.sql`(${import_sql.sql.raw(targetColumn)})${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildInsertQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
            type: "insert",
            tables: (0, import_utils2.extractUsedTable)(this.config.table)
          }, this.cacheConfig);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new import_selection_proxy.SelectionProxyHandler({
            alias: (0, import_table.getTableName)(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.cjs
var require_refresh_materialized_view = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var refresh_materialized_view_exports = {};
    __export(refresh_materialized_view_exports, {
      PgRefreshMaterializedView: () => PgRefreshMaterializedView
    });
    module2.exports = __toCommonJS(refresh_materialized_view_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_tracing = require_tracing();
    var PgRefreshMaterializedView = class extends import_query_promise.QueryPromise {
      constructor(view, session, dialect) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { view };
      }
      static [import_entity.entityKind] = "PgRefreshMaterializedView";
      config;
      concurrently() {
        if (this.config.withNoData !== void 0) {
          throw new Error("Cannot use concurrently and withNoData together");
        }
        this.config.concurrently = true;
        return this;
      }
      withNoData() {
        if (this.config.concurrently !== void 0) {
          throw new Error("Cannot use concurrently and withNoData together");
        }
        this.config.withNoData = true;
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildRefreshMaterializedViewQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), void 0, name, true);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
    };
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/select.types.cjs
var require_select_types = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/select.types.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var select_types_exports = {};
    module2.exports = __toCommonJS(select_types_exports);
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/update.cjs
var require_update = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/update.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var update_exports = {};
    __export(update_exports, {
      PgUpdateBase: () => PgUpdateBase,
      PgUpdateBuilder: () => PgUpdateBuilder
    });
    module2.exports = __toCommonJS(update_exports);
    var import_entity = require_entity();
    var import_table = require_table2();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table2 = require_table();
    var import_utils = require_utils();
    var import_view_common = require_view_common();
    var import_utils2 = require_utils3();
    var PgUpdateBuilder = class {
      constructor(table, session, dialect, withList) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
      }
      static [import_entity.entityKind] = "PgUpdateBuilder";
      authToken;
      setToken(token) {
        this.authToken = token;
        return this;
      }
      set(values) {
        return new PgUpdateBase(
          this.table,
          (0, import_utils.mapUpdateSet)(this.table, values),
          this.session,
          this.dialect,
          this.withList
        ).setToken(this.authToken);
      }
    };
    var PgUpdateBase = class extends import_query_promise.QueryPromise {
      constructor(table, set, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { set, table, withList, joins: [] };
        this.tableName = (0, import_utils.getTableLikeName)(table);
        this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
      }
      static [import_entity.entityKind] = "PgUpdate";
      config;
      tableName;
      joinsNotNullableMap;
      cacheConfig;
      from(source) {
        const src = source;
        const tableName = (0, import_utils.getTableLikeName)(src);
        if (typeof tableName === "string") {
          this.joinsNotNullableMap[tableName] = true;
        }
        this.config.from = src;
        return this;
      }
      getTableLikeFields(table) {
        if ((0, import_entity.is)(table, import_table.PgTable)) {
          return table[import_table2.Table.Symbol.Columns];
        } else if ((0, import_entity.is)(table, import_subquery.Subquery)) {
          return table._.selectedFields;
        }
        return table[import_view_common.ViewBaseConfig].selectedFields;
      }
      createJoin(joinType) {
        return (table, on) => {
          const tableName = (0, import_utils.getTableLikeName)(table);
          if (typeof tableName === "string" && this.config.joins.some((join) => join.alias === tableName)) {
            throw new Error(`Alias "${tableName}" is already used in this query`);
          }
          if (typeof on === "function") {
            const from = this.config.from && !(0, import_entity.is)(this.config.from, import_sql.SQL) ? this.getTableLikeFields(this.config.from) : void 0;
            on = on(
              new Proxy(
                this.config.table[import_table2.Table.Symbol.Columns],
                new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              ),
              from && new Proxy(
                from,
                new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              )
            );
          }
          this.config.joins.push({ on, table, joinType, alias: tableName });
          if (typeof tableName === "string") {
            switch (joinType) {
              case "left": {
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
              case "right": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "inner": {
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "full": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
            }
          }
          return this;
        };
      }
      leftJoin = this.createJoin("left");
      rightJoin = this.createJoin("right");
      innerJoin = this.createJoin("inner");
      fullJoin = this.createJoin("full");
      /**
       * Adds a 'where' clause to the query.
       *
       * Calling this method will update only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param where the 'where' clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be updated.
       *
       * ```ts
       * // Update all cars with green color
       * await db.update(cars).set({ color: 'red' })
       *   .where(eq(cars.color, 'green'));
       * // or
       * await db.update(cars).set({ color: 'red' })
       *   .where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Update all BMW cars with a green color
       * await db.update(cars).set({ color: 'red' })
       *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Update all cars with the green or blue color
       * await db.update(cars).set({ color: 'red' })
       *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields) {
        if (!fields) {
          fields = Object.assign({}, this.config.table[import_table2.Table.Symbol.Columns]);
          if (this.config.from) {
            const tableName = (0, import_utils.getTableLikeName)(this.config.from);
            if (typeof tableName === "string" && this.config.from && !(0, import_entity.is)(this.config.from, import_sql.SQL)) {
              const fromFields = this.getTableLikeFields(this.config.from);
              fields[tableName] = fromFields;
            }
            for (const join of this.config.joins) {
              const tableName2 = (0, import_utils.getTableLikeName)(join.table);
              if (typeof tableName2 === "string" && !(0, import_entity.is)(join.table, import_sql.SQL)) {
                const fromFields = this.getTableLikeFields(join.table);
                fields[tableName2] = fromFields;
              }
            }
          }
        }
        this.config.returningFields = fields;
        this.config.returning = (0, import_utils.orderSelectedFields)(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildUpdateQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        const query = this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
          type: "insert",
          tables: (0, import_utils2.extractUsedTable)(this.config.table)
        }, this.cacheConfig);
        query.joinsNotNullableMap = this.joinsNotNullableMap;
        return query;
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return this._prepare().execute(placeholderValues, this.authToken);
      };
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new import_selection_proxy.SelectionProxyHandler({
            alias: (0, import_table2.getTableName)(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/index.cjs
var require_query_builders = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_builders_exports = {};
    module2.exports = __toCommonJS(query_builders_exports);
    __reExport(query_builders_exports, require_delete(), module2.exports);
    __reExport(query_builders_exports, require_insert(), module2.exports);
    __reExport(query_builders_exports, require_query_builder2(), module2.exports);
    __reExport(query_builders_exports, require_refresh_materialized_view(), module2.exports);
    __reExport(query_builders_exports, require_select2(), module2.exports);
    __reExport(query_builders_exports, require_select_types(), module2.exports);
    __reExport(query_builders_exports, require_update(), module2.exports);
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/count.cjs
var require_count = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/count.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var count_exports = {};
    __export(count_exports, {
      PgCountBuilder: () => PgCountBuilder
    });
    module2.exports = __toCommonJS(count_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var PgCountBuilder = class _PgCountBuilder extends import_sql.SQL {
      constructor(params) {
        super(_PgCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
        this.params = params;
        this.mapWith(Number);
        this.session = params.session;
        this.sql = _PgCountBuilder.buildCount(
          params.source,
          params.filters
        );
      }
      sql;
      token;
      static [import_entity.entityKind] = "PgCountBuilder";
      [Symbol.toStringTag] = "PgCountBuilder";
      session;
      static buildEmbeddedCount(source, filters) {
        return import_sql.sql`(select count(*) from ${source}${import_sql.sql.raw(" where ").if(filters)}${filters})`;
      }
      static buildCount(source, filters) {
        return import_sql.sql`select count(*) as count from ${source}${import_sql.sql.raw(" where ").if(filters)}${filters};`;
      }
      /** @intrnal */
      setToken(token) {
        this.token = token;
        return this;
      }
      then(onfulfilled, onrejected) {
        return Promise.resolve(this.session.count(this.sql, this.token)).then(
          onfulfilled,
          onrejected
        );
      }
      catch(onRejected) {
        return this.then(void 0, onRejected);
      }
      finally(onFinally) {
        return this.then(
          (value) => {
            onFinally?.();
            return value;
          },
          (reason) => {
            onFinally?.();
            throw reason;
          }
        );
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/query.cjs
var require_query2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/query.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_exports = {};
    __export(query_exports, {
      PgRelationalQuery: () => PgRelationalQuery,
      RelationalQueryBuilder: () => RelationalQueryBuilder
    });
    module2.exports = __toCommonJS(query_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_relations = require_relations();
    var import_tracing = require_tracing();
    var RelationalQueryBuilder = class {
      constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
      }
      static [import_entity.entityKind] = "PgRelationalQueryBuilder";
      findMany(config) {
        return new PgRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config ? config : {},
          "many"
        );
      }
      findFirst(config) {
        return new PgRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config ? { ...config, limit: 1 } : { limit: 1 },
          "first"
        );
      }
    };
    var PgRelationalQuery = class extends import_query_promise.QueryPromise {
      constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config, mode) {
        super();
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
        this.config = config;
        this.mode = mode;
      }
      static [import_entity.entityKind] = "PgRelationalQuery";
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          const { query, builtQuery } = this._toSQL();
          return this.session.prepareQuery(
            builtQuery,
            void 0,
            name,
            true,
            (rawRows, mapColumnValue) => {
              const rows = rawRows.map(
                (row) => (0, import_relations.mapRelationalRow)(this.schema, this.tableConfig, row, query.selection, mapColumnValue)
              );
              if (this.mode === "first") {
                return rows[0];
              }
              return rows;
            }
          );
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      _getQuery() {
        return this.dialect.buildRelationalQueryWithoutPK({
          fullSchema: this.fullSchema,
          schema: this.schema,
          tableNamesMap: this.tableNamesMap,
          table: this.table,
          tableConfig: this.tableConfig,
          queryConfig: this.config,
          tableAlias: this.tableConfig.tsName
        });
      }
      /** @internal */
      getSQL() {
        return this._getQuery().sql;
      }
      _toSQL() {
        const query = this._getQuery();
        const builtQuery = this.dialect.sqlToQuery(query.sql);
        return { query, builtQuery };
      }
      toSQL() {
        return this._toSQL().builtQuery;
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute() {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(void 0, this.authToken);
        });
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/query-builders/raw.cjs
var require_raw = __commonJS({
  "node_modules/drizzle-orm/pg-core/query-builders/raw.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var raw_exports = {};
    __export(raw_exports, {
      PgRaw: () => PgRaw
    });
    module2.exports = __toCommonJS(raw_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var PgRaw = class extends import_query_promise.QueryPromise {
      constructor(execute, sql, query, mapBatchResult) {
        super();
        this.execute = execute;
        this.sql = sql;
        this.query = query;
        this.mapBatchResult = mapBatchResult;
      }
      static [import_entity.entityKind] = "PgRaw";
      /** @internal */
      getSQL() {
        return this.sql;
      }
      getQuery() {
        return this.query;
      }
      mapResult(result, isFromBatch) {
        return isFromBatch ? this.mapBatchResult(result) : result;
      }
      _prepare() {
        return this;
      }
      /** @internal */
      isResponseInArrayMode() {
        return false;
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/db.cjs
var require_db = __commonJS({
  "node_modules/drizzle-orm/pg-core/db.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var db_exports = {};
    __export(db_exports, {
      PgDatabase: () => PgDatabase,
      withReplicas: () => withReplicas
    });
    module2.exports = __toCommonJS(db_exports);
    var import_entity = require_entity();
    var import_query_builders = require_query_builders();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_count = require_count();
    var import_query = require_query2();
    var import_raw = require_raw();
    var import_refresh_materialized_view = require_refresh_materialized_view();
    var PgDatabase = class {
      constructor(dialect, session, schema) {
        this.dialect = dialect;
        this.session = session;
        this._ = schema ? {
          schema: schema.schema,
          fullSchema: schema.fullSchema,
          tableNamesMap: schema.tableNamesMap,
          session
        } : {
          schema: void 0,
          fullSchema: {},
          tableNamesMap: {},
          session
        };
        this.query = {};
        if (this._.schema) {
          for (const [tableName, columns] of Object.entries(this._.schema)) {
            this.query[tableName] = new import_query.RelationalQueryBuilder(
              schema.fullSchema,
              this._.schema,
              this._.tableNamesMap,
              schema.fullSchema[tableName],
              columns,
              dialect,
              session
            );
          }
        }
        this.$cache = { invalidate: async (_params) => {
        } };
      }
      static [import_entity.entityKind] = "PgDatabase";
      query;
      /**
       * Creates a subquery that defines a temporary named result set as a CTE.
       *
       * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param alias The alias for the subquery.
       *
       * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
       *
       * @example
       *
       * ```ts
       * // Create a subquery with alias 'sq' and use it in the select query
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * const result = await db.with(sq).select().from(sq);
       * ```
       *
       * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
       *
       * ```ts
       * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
       * const sq = db.$with('sq').as(db.select({
       *   name: sql<string>`upper(${users.name})`.as('name'),
       * })
       * .from(users));
       *
       * const result = await db.with(sq).select({ name: sq.name }).from(sq);
       * ```
       */
      $with = (alias, selection) => {
        const self = this;
        const as = (qb) => {
          if (typeof qb === "function") {
            qb = qb(new import_query_builders.QueryBuilder(self.dialect));
          }
          return new Proxy(
            new import_subquery.WithSubquery(
              qb.getSQL(),
              selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
              alias,
              true
            ),
            new import_selection_proxy.SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
          );
        };
        return { as };
      };
      $count(source, filters) {
        return new import_count.PgCountBuilder({ source, filters, session: this.session });
      }
      $cache;
      /**
       * Incorporates a previously defined CTE (using `$with`) into the main query.
       *
       * This method allows the main query to reference a temporary named result set.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param queries The CTEs to incorporate into the main query.
       *
       * @example
       *
       * ```ts
       * // Define a subquery 'sq' as a CTE using $with
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * // Incorporate the CTE 'sq' into the main query and select from it
       * const result = await db.with(sq).select().from(sq);
       * ```
       */
      with(...queries) {
        const self = this;
        function select(fields) {
          return new import_query_builders.PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries
          });
        }
        function selectDistinct(fields) {
          return new import_query_builders.PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries,
            distinct: true
          });
        }
        function selectDistinctOn(on, fields) {
          return new import_query_builders.PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries,
            distinct: { on }
          });
        }
        function update(table) {
          return new import_query_builders.PgUpdateBuilder(table, self.session, self.dialect, queries);
        }
        function insert(table) {
          return new import_query_builders.PgInsertBuilder(table, self.session, self.dialect, queries);
        }
        function delete_(table) {
          return new import_query_builders.PgDeleteBase(table, self.session, self.dialect, queries);
        }
        return { select, selectDistinct, selectDistinctOn, update, insert, delete: delete_ };
      }
      select(fields) {
        return new import_query_builders.PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect
        });
      }
      selectDistinct(fields) {
        return new import_query_builders.PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect,
          distinct: true
        });
      }
      selectDistinctOn(on, fields) {
        return new import_query_builders.PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect,
          distinct: { on }
        });
      }
      /**
       * Creates an update query.
       *
       * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
       *
       * Use `.set()` method to specify which values to update.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param table The table to update.
       *
       * @example
       *
       * ```ts
       * // Update all rows in the 'cars' table
       * await db.update(cars).set({ color: 'red' });
       *
       * // Update rows with filters and conditions
       * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
       *
       * // Update with returning clause
       * const updatedCar: Car[] = await db.update(cars)
       *   .set({ color: 'red' })
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      update(table) {
        return new import_query_builders.PgUpdateBuilder(table, this.session, this.dialect);
      }
      /**
       * Creates an insert query.
       *
       * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert}
       *
       * @param table The table to insert into.
       *
       * @example
       *
       * ```ts
       * // Insert one row
       * await db.insert(cars).values({ brand: 'BMW' });
       *
       * // Insert multiple rows
       * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
       *
       * // Insert with returning clause
       * const insertedCar: Car[] = await db.insert(cars)
       *   .values({ brand: 'BMW' })
       *   .returning();
       * ```
       */
      insert(table) {
        return new import_query_builders.PgInsertBuilder(table, this.session, this.dialect);
      }
      /**
       * Creates a delete query.
       *
       * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param table The table to delete from.
       *
       * @example
       *
       * ```ts
       * // Delete all rows in the 'cars' table
       * await db.delete(cars);
       *
       * // Delete rows with filters and conditions
       * await db.delete(cars).where(eq(cars.color, 'green'));
       *
       * // Delete with returning clause
       * const deletedCar: Car[] = await db.delete(cars)
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      delete(table) {
        return new import_query_builders.PgDeleteBase(table, this.session, this.dialect);
      }
      refreshMaterializedView(view) {
        return new import_refresh_materialized_view.PgRefreshMaterializedView(view, this.session, this.dialect);
      }
      authToken;
      execute(query) {
        const sequel = typeof query === "string" ? import_sql.sql.raw(query) : query.getSQL();
        const builtQuery = this.dialect.sqlToQuery(sequel);
        const prepared = this.session.prepareQuery(
          builtQuery,
          void 0,
          void 0,
          false
        );
        return new import_raw.PgRaw(
          () => prepared.execute(void 0, this.authToken),
          sequel,
          builtQuery,
          (result) => prepared.mapResult(result, true)
        );
      }
      transaction(transaction, config) {
        return this.session.transaction(transaction, config);
      }
    };
    var withReplicas = (primary, replicas, getReplica = () => replicas[Math.floor(Math.random() * replicas.length)]) => {
      const select = (...args) => getReplica(replicas).select(...args);
      const selectDistinct = (...args) => getReplica(replicas).selectDistinct(...args);
      const selectDistinctOn = (...args) => getReplica(replicas).selectDistinctOn(...args);
      const $count = (...args) => getReplica(replicas).$count(...args);
      const _with = (...args) => getReplica(replicas).with(...args);
      const $with = (arg) => getReplica(replicas).$with(arg);
      const update = (...args) => primary.update(...args);
      const insert = (...args) => primary.insert(...args);
      const $delete = (...args) => primary.delete(...args);
      const execute = (...args) => primary.execute(...args);
      const transaction = (...args) => primary.transaction(...args);
      const refreshMaterializedView = (...args) => primary.refreshMaterializedView(...args);
      return {
        ...primary,
        update,
        insert,
        delete: $delete,
        execute,
        transaction,
        refreshMaterializedView,
        $primary: primary,
        $replicas: replicas,
        select,
        selectDistinct,
        selectDistinctOn,
        $count,
        $with,
        with: _with,
        get query() {
          return getReplica(replicas).query;
        }
      };
    };
  }
});

// node_modules/drizzle-orm/cache/core/cache.cjs
var require_cache = __commonJS({
  "node_modules/drizzle-orm/cache/core/cache.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var cache_exports = {};
    __export(cache_exports, {
      Cache: () => Cache,
      NoopCache: () => NoopCache,
      hashQuery: () => hashQuery
    });
    module2.exports = __toCommonJS(cache_exports);
    var import_entity = require_entity();
    var Cache = class {
      static [import_entity.entityKind] = "Cache";
    };
    var NoopCache = class extends Cache {
      strategy() {
        return "all";
      }
      static [import_entity.entityKind] = "NoopCache";
      async get(_key) {
        return void 0;
      }
      async put(_hashedQuery, _response, _tables, _config) {
      }
      async onMutate(_params) {
      }
    };
    async function hashQuery(sql, params) {
      const dataToHash = `${sql}-${JSON.stringify(params)}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(dataToHash);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = [...new Uint8Array(hashBuffer)];
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      return hashHex;
    }
  }
});

// node_modules/drizzle-orm/cache/core/index.cjs
var require_core = __commonJS({
  "node_modules/drizzle-orm/cache/core/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var core_exports = {};
    module2.exports = __toCommonJS(core_exports);
    __reExport(core_exports, require_cache(), module2.exports);
  }
});

// node_modules/drizzle-orm/pg-core/alias.cjs
var require_alias2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/alias.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var alias_exports = {};
    __export(alias_exports, {
      alias: () => alias
    });
    module2.exports = __toCommonJS(alias_exports);
    var import_alias = require_alias();
    function alias(table, alias2) {
      return new Proxy(table, new import_alias.TableAliasProxyHandler(alias2, false));
    }
  }
});

// node_modules/drizzle-orm/pg-core/roles.cjs
var require_roles = __commonJS({
  "node_modules/drizzle-orm/pg-core/roles.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var roles_exports = {};
    __export(roles_exports, {
      PgRole: () => PgRole,
      pgRole: () => pgRole
    });
    module2.exports = __toCommonJS(roles_exports);
    var import_entity = require_entity();
    var PgRole = class {
      constructor(name, config) {
        this.name = name;
        if (config) {
          this.createDb = config.createDb;
          this.createRole = config.createRole;
          this.inherit = config.inherit;
        }
      }
      static [import_entity.entityKind] = "PgRole";
      /** @internal */
      _existing;
      /** @internal */
      createDb;
      /** @internal */
      createRole;
      /** @internal */
      inherit;
      existing() {
        this._existing = true;
        return this;
      }
    };
    function pgRole(name, config) {
      return new PgRole(name, config);
    }
  }
});

// node_modules/drizzle-orm/pg-core/sequence.cjs
var require_sequence = __commonJS({
  "node_modules/drizzle-orm/pg-core/sequence.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sequence_exports = {};
    __export(sequence_exports, {
      PgSequence: () => PgSequence,
      isPgSequence: () => isPgSequence,
      pgSequence: () => pgSequence,
      pgSequenceWithSchema: () => pgSequenceWithSchema
    });
    module2.exports = __toCommonJS(sequence_exports);
    var import_entity = require_entity();
    var PgSequence = class {
      constructor(seqName, seqOptions, schema) {
        this.seqName = seqName;
        this.seqOptions = seqOptions;
        this.schema = schema;
      }
      static [import_entity.entityKind] = "PgSequence";
    };
    function pgSequence(name, options) {
      return pgSequenceWithSchema(name, options, void 0);
    }
    function pgSequenceWithSchema(name, options, schema) {
      return new PgSequence(name, options, schema);
    }
    function isPgSequence(obj) {
      return (0, import_entity.is)(obj, PgSequence);
    }
  }
});

// node_modules/drizzle-orm/pg-core/schema.cjs
var require_schema = __commonJS({
  "node_modules/drizzle-orm/pg-core/schema.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var schema_exports = {};
    __export(schema_exports, {
      PgSchema: () => PgSchema,
      isPgSchema: () => isPgSchema,
      pgSchema: () => pgSchema
    });
    module2.exports = __toCommonJS(schema_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_enum = require_enum();
    var import_sequence = require_sequence();
    var import_table = require_table2();
    var import_view = require_view();
    var PgSchema = class {
      constructor(schemaName) {
        this.schemaName = schemaName;
      }
      static [import_entity.entityKind] = "PgSchema";
      table = (name, columns, extraConfig) => {
        return (0, import_table.pgTableWithSchema)(name, columns, extraConfig, this.schemaName);
      };
      view = (name, columns) => {
        return (0, import_view.pgViewWithSchema)(name, columns, this.schemaName);
      };
      materializedView = (name, columns) => {
        return (0, import_view.pgMaterializedViewWithSchema)(name, columns, this.schemaName);
      };
      enum(enumName, input) {
        return Array.isArray(input) ? (0, import_enum.pgEnumWithSchema)(
          enumName,
          [...input],
          this.schemaName
        ) : (0, import_enum.pgEnumObjectWithSchema)(enumName, input, this.schemaName);
      }
      sequence = (name, options) => {
        return (0, import_sequence.pgSequenceWithSchema)(name, options, this.schemaName);
      };
      getSQL() {
        return new import_sql.SQL([import_sql.sql.identifier(this.schemaName)]);
      }
      shouldOmitSQLParens() {
        return true;
      }
    };
    function isPgSchema(obj) {
      return (0, import_entity.is)(obj, PgSchema);
    }
    function pgSchema(name) {
      if (name === "public") {
        throw new Error(
          `You can't specify 'public' as schema name. Postgres is using public schema by default. If you want to use 'public' schema, just use pgTable() instead of creating a schema`
        );
      }
      return new PgSchema(name);
    }
  }
});

// node_modules/drizzle-orm/pg-core/session.cjs
var require_session = __commonJS({
  "node_modules/drizzle-orm/pg-core/session.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var session_exports = {};
    __export(session_exports, {
      PgPreparedQuery: () => PgPreparedQuery,
      PgSession: () => PgSession,
      PgTransaction: () => PgTransaction
    });
    module2.exports = __toCommonJS(session_exports);
    var import_cache = require_cache();
    var import_entity = require_entity();
    var import_errors = require_errors2();
    var import_sql = require_sql2();
    var import_tracing = require_tracing();
    var import_db = require_db();
    var PgPreparedQuery = class {
      constructor(query, cache, queryMetadata, cacheConfig) {
        this.query = query;
        this.cache = cache;
        this.queryMetadata = queryMetadata;
        this.cacheConfig = cacheConfig;
        if (cache && cache.strategy() === "all" && cacheConfig === void 0) {
          this.cacheConfig = { enable: true, autoInvalidate: true };
        }
        if (!this.cacheConfig?.enable) {
          this.cacheConfig = void 0;
        }
      }
      authToken;
      getQuery() {
        return this.query;
      }
      mapResult(response, _isFromBatch) {
        return response;
      }
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      static [import_entity.entityKind] = "PgPreparedQuery";
      /** @internal */
      joinsNotNullableMap;
      /** @internal */
      async queryWithCache(queryString, params, query) {
        if (this.cache === void 0 || (0, import_entity.is)(this.cache, import_cache.NoopCache) || this.queryMetadata === void 0) {
          try {
            return await query();
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if (this.cacheConfig && !this.cacheConfig.enable) {
          try {
            return await query();
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if ((this.queryMetadata.type === "insert" || this.queryMetadata.type === "update" || this.queryMetadata.type === "delete") && this.queryMetadata.tables.length > 0) {
          try {
            const [res] = await Promise.all([
              query(),
              this.cache.onMutate({ tables: this.queryMetadata.tables })
            ]);
            return res;
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if (!this.cacheConfig) {
          try {
            return await query();
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if (this.queryMetadata.type === "select") {
          const fromCache = await this.cache.get(
            this.cacheConfig.tag ?? await (0, import_cache.hashQuery)(queryString, params),
            this.queryMetadata.tables,
            this.cacheConfig.tag !== void 0,
            this.cacheConfig.autoInvalidate
          );
          if (fromCache === void 0) {
            let result;
            try {
              result = await query();
            } catch (e) {
              throw new import_errors.DrizzleQueryError(queryString, params, e);
            }
            await this.cache.put(
              this.cacheConfig.tag ?? await (0, import_cache.hashQuery)(queryString, params),
              result,
              // make sure we send tables that were used in a query only if user wants to invalidate it on each write
              this.cacheConfig.autoInvalidate ? this.queryMetadata.tables : [],
              this.cacheConfig.tag !== void 0,
              this.cacheConfig.config
            );
            return result;
          }
          return fromCache;
        }
        try {
          return await query();
        } catch (e) {
          throw new import_errors.DrizzleQueryError(queryString, params, e);
        }
      }
    };
    var PgSession = class {
      constructor(dialect) {
        this.dialect = dialect;
      }
      static [import_entity.entityKind] = "PgSession";
      /** @internal */
      execute(query, token) {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          const prepared = import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
            return this.prepareQuery(
              this.dialect.sqlToQuery(query),
              void 0,
              void 0,
              false
            );
          });
          return prepared.setToken(token).execute(void 0, token);
        });
      }
      all(query) {
        return this.prepareQuery(
          this.dialect.sqlToQuery(query),
          void 0,
          void 0,
          false
        ).all();
      }
      /** @internal */
      async count(sql2, token) {
        const res = await this.execute(sql2, token);
        return Number(
          res[0]["count"]
        );
      }
    };
    var PgTransaction = class extends import_db.PgDatabase {
      constructor(dialect, session, schema, nestedIndex = 0) {
        super(dialect, session, schema);
        this.schema = schema;
        this.nestedIndex = nestedIndex;
      }
      static [import_entity.entityKind] = "PgTransaction";
      rollback() {
        throw new import_errors.TransactionRollbackError();
      }
      /** @internal */
      getTransactionConfigSQL(config) {
        const chunks = [];
        if (config.isolationLevel) {
          chunks.push(`isolation level ${config.isolationLevel}`);
        }
        if (config.accessMode) {
          chunks.push(config.accessMode);
        }
        if (typeof config.deferrable === "boolean") {
          chunks.push(config.deferrable ? "deferrable" : "not deferrable");
        }
        return import_sql.sql.raw(chunks.join(" "));
      }
      setTransaction(config) {
        return this.session.execute(import_sql.sql`set transaction ${this.getTransactionConfigSQL(config)}`);
      }
    };
  }
});

// node_modules/drizzle-orm/pg-core/subquery.cjs
var require_subquery2 = __commonJS({
  "node_modules/drizzle-orm/pg-core/subquery.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var subquery_exports = {};
    module2.exports = __toCommonJS(subquery_exports);
  }
});

// node_modules/drizzle-orm/pg-core/utils/index.cjs
var require_utils4 = __commonJS({
  "node_modules/drizzle-orm/pg-core/utils/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    module2.exports = __toCommonJS(utils_exports);
    __reExport(utils_exports, require_array(), module2.exports);
  }
});

// node_modules/drizzle-orm/pg-core/index.cjs
var require_pg_core = __commonJS({
  "node_modules/drizzle-orm/pg-core/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var pg_core_exports = {};
    module2.exports = __toCommonJS(pg_core_exports);
    __reExport(pg_core_exports, require_alias2(), module2.exports);
    __reExport(pg_core_exports, require_checks(), module2.exports);
    __reExport(pg_core_exports, require_columns(), module2.exports);
    __reExport(pg_core_exports, require_db(), module2.exports);
    __reExport(pg_core_exports, require_dialect(), module2.exports);
    __reExport(pg_core_exports, require_foreign_keys(), module2.exports);
    __reExport(pg_core_exports, require_indexes(), module2.exports);
    __reExport(pg_core_exports, require_policies(), module2.exports);
    __reExport(pg_core_exports, require_primary_keys(), module2.exports);
    __reExport(pg_core_exports, require_query_builders(), module2.exports);
    __reExport(pg_core_exports, require_roles(), module2.exports);
    __reExport(pg_core_exports, require_schema(), module2.exports);
    __reExport(pg_core_exports, require_sequence(), module2.exports);
    __reExport(pg_core_exports, require_session(), module2.exports);
    __reExport(pg_core_exports, require_subquery2(), module2.exports);
    __reExport(pg_core_exports, require_table2(), module2.exports);
    __reExport(pg_core_exports, require_unique_constraint(), module2.exports);
    __reExport(pg_core_exports, require_utils3(), module2.exports);
    __reExport(pg_core_exports, require_utils4(), module2.exports);
    __reExport(pg_core_exports, require_view_common2(), module2.exports);
    __reExport(pg_core_exports, require_view(), module2.exports);
  }
});

// node_modules/drizzle-orm/postgres-js/session.cjs
var require_session2 = __commonJS({
  "node_modules/drizzle-orm/postgres-js/session.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var session_exports = {};
    __export(session_exports, {
      PostgresJsPreparedQuery: () => PostgresJsPreparedQuery,
      PostgresJsSession: () => PostgresJsSession,
      PostgresJsTransaction: () => PostgresJsTransaction
    });
    module2.exports = __toCommonJS(session_exports);
    var import_core = require_core();
    var import_entity = require_entity();
    var import_logger = require_logger();
    var import_pg_core = require_pg_core();
    var import_session = require_session();
    var import_sql = require_sql();
    var import_tracing = require_tracing();
    var import_utils = require_utils();
    var PostgresJsPreparedQuery = class extends import_session.PgPreparedQuery {
      constructor(client, queryString, params, logger, cache, queryMetadata, cacheConfig, fields, _isResponseInArrayMode, customResultMapper) {
        super({ sql: queryString, params }, cache, queryMetadata, cacheConfig);
        this.client = client;
        this.queryString = queryString;
        this.params = params;
        this.logger = logger;
        this.fields = fields;
        this._isResponseInArrayMode = _isResponseInArrayMode;
        this.customResultMapper = customResultMapper;
      }
      static [import_entity.entityKind] = "PostgresJsPreparedQuery";
      async execute(placeholderValues = {}) {
        return import_tracing.tracer.startActiveSpan("drizzle.execute", async (span) => {
          const params = (0, import_sql.fillPlaceholders)(this.params, placeholderValues);
          span?.setAttributes({
            "drizzle.query.text": this.queryString,
            "drizzle.query.params": JSON.stringify(params)
          });
          this.logger.logQuery(this.queryString, params);
          const { fields, queryString: query, client, joinsNotNullableMap, customResultMapper } = this;
          if (!fields && !customResultMapper) {
            return import_tracing.tracer.startActiveSpan("drizzle.driver.execute", () => {
              return this.queryWithCache(query, params, async () => {
                return await client.unsafe(query, params);
              });
            });
          }
          const rows = await import_tracing.tracer.startActiveSpan("drizzle.driver.execute", () => {
            span?.setAttributes({
              "drizzle.query.text": query,
              "drizzle.query.params": JSON.stringify(params)
            });
            return this.queryWithCache(query, params, async () => {
              return await client.unsafe(query, params).values();
            });
          });
          return import_tracing.tracer.startActiveSpan("drizzle.mapResponse", () => {
            return customResultMapper ? customResultMapper(rows) : rows.map((row) => (0, import_utils.mapResultRow)(fields, row, joinsNotNullableMap));
          });
        });
      }
      all(placeholderValues = {}) {
        return import_tracing.tracer.startActiveSpan("drizzle.execute", async (span) => {
          const params = (0, import_sql.fillPlaceholders)(this.params, placeholderValues);
          span?.setAttributes({
            "drizzle.query.text": this.queryString,
            "drizzle.query.params": JSON.stringify(params)
          });
          this.logger.logQuery(this.queryString, params);
          return import_tracing.tracer.startActiveSpan("drizzle.driver.execute", () => {
            span?.setAttributes({
              "drizzle.query.text": this.queryString,
              "drizzle.query.params": JSON.stringify(params)
            });
            return this.queryWithCache(this.queryString, params, async () => {
              return this.client.unsafe(this.queryString, params);
            });
          });
        });
      }
      /** @internal */
      isResponseInArrayMode() {
        return this._isResponseInArrayMode;
      }
    };
    var PostgresJsSession = class _PostgresJsSession extends import_session.PgSession {
      constructor(client, dialect, schema, options = {}) {
        super(dialect);
        this.client = client;
        this.schema = schema;
        this.options = options;
        this.logger = options.logger ?? new import_logger.NoopLogger();
        this.cache = options.cache ?? new import_core.NoopCache();
      }
      static [import_entity.entityKind] = "PostgresJsSession";
      logger;
      cache;
      prepareQuery(query, fields, name, isResponseInArrayMode, customResultMapper, queryMetadata, cacheConfig) {
        return new PostgresJsPreparedQuery(
          this.client,
          query.sql,
          query.params,
          this.logger,
          this.cache,
          queryMetadata,
          cacheConfig,
          fields,
          isResponseInArrayMode,
          customResultMapper
        );
      }
      query(query, params) {
        this.logger.logQuery(query, params);
        return this.client.unsafe(query, params).values();
      }
      queryObjects(query, params) {
        return this.client.unsafe(query, params);
      }
      transaction(transaction, config) {
        return this.client.begin(async (client) => {
          const session = new _PostgresJsSession(
            client,
            this.dialect,
            this.schema,
            this.options
          );
          const tx = new PostgresJsTransaction(this.dialect, session, this.schema);
          if (config) {
            await tx.setTransaction(config);
          }
          return transaction(tx);
        });
      }
    };
    var PostgresJsTransaction = class _PostgresJsTransaction extends import_pg_core.PgTransaction {
      constructor(dialect, session, schema, nestedIndex = 0) {
        super(dialect, session, schema, nestedIndex);
        this.session = session;
      }
      static [import_entity.entityKind] = "PostgresJsTransaction";
      transaction(transaction) {
        return this.session.client.savepoint((client) => {
          const session = new PostgresJsSession(
            client,
            this.dialect,
            this.schema,
            this.session.options
          );
          const tx = new _PostgresJsTransaction(this.dialect, session, this.schema);
          return transaction(tx);
        });
      }
    };
  }
});

// node_modules/drizzle-orm/postgres-js/driver.cjs
var require_driver = __commonJS({
  "node_modules/drizzle-orm/postgres-js/driver.cjs"(exports2, module2) {
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
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
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var driver_exports = {};
    __export(driver_exports, {
      PostgresJsDatabase: () => PostgresJsDatabase,
      drizzle: () => drizzle2
    });
    module2.exports = __toCommonJS(driver_exports);
    var import_postgres = __toESM(require_src(), 1);
    var import_entity = require_entity();
    var import_logger = require_logger();
    var import_db = require_db();
    var import_dialect = require_dialect();
    var import_relations = require_relations();
    var import_utils = require_utils();
    var import_session = require_session2();
    var PostgresJsDatabase = class extends import_db.PgDatabase {
      static [import_entity.entityKind] = "PostgresJsDatabase";
    };
    function construct(client, config = {}) {
      const transparentParser = (val) => val;
      for (const type of ["1184", "1082", "1083", "1114", "1182", "1185", "1115", "1231"]) {
        client.options.parsers[type] = transparentParser;
        client.options.serializers[type] = transparentParser;
      }
      client.options.serializers["114"] = transparentParser;
      client.options.serializers["3802"] = transparentParser;
      const dialect = new import_dialect.PgDialect({ casing: config.casing });
      let logger;
      if (config.logger === true) {
        logger = new import_logger.DefaultLogger();
      } else if (config.logger !== false) {
        logger = config.logger;
      }
      let schema;
      if (config.schema) {
        const tablesConfig = (0, import_relations.extractTablesRelationalConfig)(
          config.schema,
          import_relations.createTableRelationsHelpers
        );
        schema = {
          fullSchema: config.schema,
          schema: tablesConfig.tables,
          tableNamesMap: tablesConfig.tableNamesMap
        };
      }
      const session = new import_session.PostgresJsSession(client, dialect, schema, { logger, cache: config.cache });
      const db = new PostgresJsDatabase(dialect, session, schema);
      db.$client = client;
      db.$cache = config.cache;
      if (db.$cache) {
        db.$cache["invalidate"] = config.cache?.onMutate;
      }
      return db;
    }
    function drizzle2(...params) {
      if (typeof params[0] === "string") {
        const instance = (0, import_postgres.default)(params[0]);
        return construct(instance, params[1]);
      }
      if ((0, import_utils.isConfig)(params[0])) {
        const { connection, client, ...drizzleConfig } = params[0];
        if (client) return construct(client, drizzleConfig);
        if (typeof connection === "object" && connection.url !== void 0) {
          const { url, ...config } = connection;
          const instance2 = (0, import_postgres.default)(url, config);
          return construct(instance2, drizzleConfig);
        }
        const instance = (0, import_postgres.default)(connection);
        return construct(instance, drizzleConfig);
      }
      return construct(params[0], params[1]);
    }
    ((drizzle22) => {
      function mock(config) {
        return construct({
          options: {
            parsers: {},
            serializers: {}
          }
        }, config);
      }
      drizzle22.mock = mock;
    })(drizzle2 || (drizzle2 = {}));
  }
});

// node_modules/drizzle-orm/postgres-js/index.cjs
var require_postgres_js = __commonJS({
  "node_modules/drizzle-orm/postgres-js/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var postgres_js_exports = {};
    module2.exports = __toCommonJS(postgres_js_exports);
    __reExport(postgres_js_exports, require_driver(), module2.exports);
    __reExport(postgres_js_exports, require_session2(), module2.exports);
  }
});

// node_modules/drizzle-orm/migrator.cjs
var require_migrator = __commonJS({
  "node_modules/drizzle-orm/migrator.cjs"(exports2, module2) {
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
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
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var migrator_exports = {};
    __export(migrator_exports, {
      readMigrationFiles: () => readMigrationFiles
    });
    module2.exports = __toCommonJS(migrator_exports);
    var import_node_crypto = __toESM(require("node:crypto"), 1);
    var import_node_fs = __toESM(require("node:fs"), 1);
    function readMigrationFiles(config) {
      const migrationFolderTo = config.migrationsFolder;
      const migrationQueries = [];
      const journalPath = `${migrationFolderTo}/meta/_journal.json`;
      if (!import_node_fs.default.existsSync(journalPath)) {
        throw new Error(`Can't find meta/_journal.json file`);
      }
      const journalAsString = import_node_fs.default.readFileSync(`${migrationFolderTo}/meta/_journal.json`).toString();
      const journal = JSON.parse(journalAsString);
      for (const journalEntry of journal.entries) {
        const migrationPath = `${migrationFolderTo}/${journalEntry.tag}.sql`;
        try {
          const query = import_node_fs.default.readFileSync(`${migrationFolderTo}/${journalEntry.tag}.sql`).toString();
          const result = query.split("--> statement-breakpoint").map((it) => {
            return it;
          });
          migrationQueries.push({
            sql: result,
            bps: journalEntry.breakpoints,
            folderMillis: journalEntry.when,
            hash: import_node_crypto.default.createHash("sha256").update(query).digest("hex")
          });
        } catch {
          throw new Error(`No file ${migrationPath} found in ${migrationFolderTo} folder`);
        }
      }
      return migrationQueries;
    }
  }
});

// node_modules/drizzle-orm/postgres-js/migrator.cjs
var require_migrator2 = __commonJS({
  "node_modules/drizzle-orm/postgres-js/migrator.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var migrator_exports = {};
    __export(migrator_exports, {
      migrate: () => migrate2
    });
    module2.exports = __toCommonJS(migrator_exports);
    var import_migrator = require_migrator();
    async function migrate2(db, config) {
      const migrations = (0, import_migrator.readMigrationFiles)(config);
      await db.dialect.migrate(migrations, db.session, config);
    }
  }
});

// src/lib/db/migrate.js
var { drizzle } = require_postgres_js();
var { migrate } = require_migrator2();
var postgres = require_src();
var path = require("path");
var fs = require("fs");
var runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":****@");
  console.log("Target Database:", maskedUrl);
  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);
  console.log("Running migrations...");
  try {
    const migrationsFolder = path.join(process.cwd(), "drizzle-pg");
    await migrate(db, { migrationsFolder });
    console.log("Migrations completed successfully\n");
    const appliedMigrations = await migrationClient`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY id ASC
    `;
    if (appliedMigrations.length > 0) {
      console.log("\u250C\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
      console.log("\u2502 ID \u2502 Migration Tag                 \u2502 Applied At          \u2502");
      console.log("\u251C\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
      appliedMigrations.forEach((m) => {
        const id = String(m.id).padEnd(2);
        const tag = String(m.hash).padEnd(29);
        const d = new Date(Number(m.created_at));
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
        console.log(`\u2502 ${id} \u2502 ${tag} \u2502 ${date} \u2502`);
      });
      console.log("\u2514\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
};
runMigration();
